const db = require('../database/db');
const emailService = require('./emailService');
const { getSettings } = require('./guildSettingsService');
const { generateCode, hashCode, verifyCode: verifyCodeHash } = require('../utils/codeGenerator');
const { validateFormat, domainHasMailServer } = require('../utils/emailValidator');
const { detectProvider } = require('../utils/providerDetector');
const rateLimit = require('./rateLimitService');
const { logVerificationEvent, logError } = require('../logger/logger');

const insertSession = db.prepare(`
  INSERT INTO verification_sessions
    (guild_id, discord_user_id, email, provider, code_hash, attempts, max_attempts, expires_at, last_sent_at, resend_count)
  VALUES (@guild_id, @discord_user_id, @email, @provider, @code_hash, 0, @max_attempts, @expires_at, datetime('now'), 0)
`);
const getActiveSession = db.prepare(`
  SELECT * FROM verification_sessions
  WHERE guild_id = ? AND discord_user_id = ? AND invalidated = 0
  ORDER BY id DESC LIMIT 1
`);
const invalidateSessionsStmt = db.prepare(`
  UPDATE verification_sessions SET invalidated = 1
  WHERE guild_id = ? AND discord_user_id = ? AND invalidated = 0
`);
const updateSessionCode = db.prepare(`
  UPDATE verification_sessions SET code_hash = ?, expires_at = ?, last_sent_at = datetime('now'), resend_count = resend_count + 1
  WHERE id = ?
`);
const bumpAttempts = db.prepare(`UPDATE verification_sessions SET attempts = attempts + 1 WHERE id = ?`);
const invalidateById = db.prepare(`UPDATE verification_sessions SET invalidated = 1 WHERE id = ?`);

const upsertVerification = db.prepare(`
  INSERT INTO verifications (guild_id, discord_user_id, email, provider, verified, verified_at, updated_at)
  VALUES (@guild_id, @discord_user_id, @email, @provider, 1, datetime('now'), datetime('now'))
  ON CONFLICT(guild_id, discord_user_id) DO UPDATE SET
    email = excluded.email, provider = excluded.provider, verified = 1,
    verified_at = excluded.verified_at, updated_at = excluded.updated_at
`);
const getVerification = db.prepare(`SELECT * FROM verifications WHERE guild_id = ? AND discord_user_id = ?`);
const clearVerification = db.prepare(`DELETE FROM verifications WHERE guild_id = ? AND discord_user_id = ?`);

class VerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Validates the email and, if it passes, creates a session and emails the code.
 * Throws VerificationError with a `code` the caller can map to a user-facing message.
 */
async function startVerification(guild, member, email) {
  const guildId = guild.id;
  const userId = member.id;

  if (!rateLimit.canGuildStart(guildId)) throw new VerificationError('guild_rate_limited', 'Sunucuda çok fazla doğrulama isteği var.');
  if (!rateLimit.canStartVerification(guildId, userId)) throw new VerificationError('user_rate_limited', 'Çok fazla deneme yaptın, biraz sonra tekrar dene.');

  const format = validateFormat(email);
  if (!format.valid) throw new VerificationError(`format_${format.reason}`, 'E-posta adresi geçersiz.');
  const cleanEmail = format.email;

  if (!rateLimit.canSendToEmail(cleanEmail)) throw new VerificationError('email_rate_limited', 'Bu e-posta adresine çok fazla kod gönderildi.');

  // Best-effort — an unresolvable domain doesn't hard-block, since some valid
  // domains block MX probing. It's logged for visibility, not enforced.
  const domain = cleanEmail.split('@')[1];
  const hasMx = await domainHasMailServer(domain).catch(() => false);

  const settings = getSettings(guildId);
  const provider = detectProvider(cleanEmail);
  const code = generateCode();
  const codeHash = hashCode(code, guildId, userId);
  const expiresAt = new Date(Date.now() + settings.code_expiry_minutes * 60000).toISOString();

  invalidateSessionsStmt.run(guildId, userId);
  insertSession.run({
    guild_id: guildId,
    discord_user_id: userId,
    email: cleanEmail,
    provider,
    code_hash: codeHash,
    max_attempts: settings.max_attempts,
    expires_at: expiresAt,
  });

  try {
    await emailService.sendVerificationCode({
      to: cleanEmail,
      code,
      minutes: settings.code_expiry_minutes,
      guildName: guild.name,
    });
  } catch (err) {
    logError('smtp_send_failed', err);
    throw new VerificationError('smtp_error', 'E-posta gönderilemedi.');
  }

  logVerificationEvent(guildId, userId, 'verification_started', cleanEmail, hasMx ? '' : 'mx_unresolved');
  logVerificationEvent(guildId, userId, 'verification_mail_sent', cleanEmail);

  return { email: cleanEmail, provider, expiresAt };
}

async function resendCode(guild, member) {
  const guildId = guild.id;
  const userId = member.id;
  const settings = getSettings(guildId);

  const session = getActiveSession.get(guildId, userId);
  if (!session) throw new VerificationError('no_session', 'Aktif bir doğrulama süreci bulunamadı.');

  const remaining = rateLimit.resendCooldownRemaining(guildId, userId, settings.resend_cooldown_seconds);
  if (remaining > 0) throw new VerificationError('resend_cooldown', `Tekrar kod gönderebilmek için ${remaining} saniye beklemelisin.`);

  const code = generateCode();
  const codeHash = hashCode(code, guildId, userId);
  const expiresAt = new Date(Date.now() + settings.code_expiry_minutes * 60000).toISOString();

  try {
    await emailService.sendVerificationCode({
      to: session.email,
      code,
      minutes: settings.code_expiry_minutes,
      guildName: guild.name,
    });
  } catch (err) {
    logError('smtp_send_failed', err);
    throw new VerificationError('smtp_error', 'E-posta gönderilemedi.');
  }

  updateSessionCode.run(codeHash, expiresAt, session.id);
  logVerificationEvent(guildId, userId, 'resend', session.email);

  return { email: session.email, expiresAt };
}

function submitCode(guild, member, inputCode) {
  const guildId = guild.id;
  const userId = member.id;

  if (!rateLimit.canAttemptCode(guildId, userId)) throw new VerificationError('user_rate_limited', 'Çok fazla deneme yaptın, biraz sonra tekrar dene.');

  const session = getActiveSession.get(guildId, userId);
  if (!session) throw new VerificationError('no_session', 'Aktif bir doğrulama süreci bulunamadı.');

  if (new Date(session.expires_at).getTime() < Date.now()) {
    invalidateById.run(session.id);
    logVerificationEvent(guildId, userId, 'expired_code', session.email);
    throw new VerificationError('expired', 'Doğrulama kodunun süresi doldu.');
  }

  const isValid = verifyCodeHash(inputCode, guildId, userId, session.code_hash);

  if (!isValid) {
    bumpAttempts.run(session.id);
    const attemptsLeft = session.max_attempts - (session.attempts + 1);
    logVerificationEvent(guildId, userId, 'wrong_code', session.email, `attempts_left=${attemptsLeft}`);

    if (attemptsLeft <= 0) {
      invalidateById.run(session.id);
      throw new VerificationError('max_attempts', 'Deneme limitine ulaştın. Kod geçersiz kılındı.');
    }
    const err = new VerificationError('wrong_code', 'Kod yanlış.');
    err.attemptsLeft = attemptsLeft;
    throw err;
  }

  invalidateById.run(session.id);
  upsertVerification.run({
    guild_id: guildId,
    discord_user_id: userId,
    email: session.email,
    provider: session.provider,
  });
  logVerificationEvent(guildId, userId, 'successful_verification', session.email);

  return { email: session.email, provider: session.provider };
}

function cancelVerification(guildId, userId) {
  invalidateSessionsStmt.run(guildId, userId);
  logVerificationEvent(guildId, userId, 'verification_cancelled', null);
}

function getStatus(guildId, userId) {
  return getVerification.get(guildId, userId) || null;
}

function beginEmailChange(guildId, userId) {
  clearVerification.run(guildId, userId);
  invalidateSessionsStmt.run(guildId, userId);
  logVerificationEvent(guildId, userId, 'email_changed', null);
}

function getStats(guildId) {
  const today = db
    .prepare(
      `SELECT
         SUM(CASE WHEN event_type = 'successful_verification' THEN 1 ELSE 0 END) AS success,
         SUM(CASE WHEN event_type = 'wrong_code' THEN 1 ELSE 0 END) AS failed
       FROM verification_logs
       WHERE guild_id = ? AND date(created_at) = date('now')`
    )
    .get(guildId);

  const totalVerified = db
    .prepare(`SELECT COUNT(*) AS c FROM verifications WHERE guild_id = ? AND verified = 1`)
    .get(guildId).c;

  const byProvider = db
    .prepare(
      `SELECT provider, COUNT(*) AS c FROM verifications
       WHERE guild_id = ? AND verified = 1
       GROUP BY provider ORDER BY c DESC LIMIT 3`
    )
    .all(guildId);

  return {
    todaySuccess: today.success || 0,
    todayFailed: today.failed || 0,
    totalVerified,
    topProviders: byProvider,
  };
}

module.exports = {
  VerificationError,
  startVerification,
  resendCode,
  submitCode,
  cancelVerification,
  getStatus,
  beginEmailChange,
  getStats,
};
