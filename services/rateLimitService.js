const db = require('../database/db');

// In-memory sliding-window throttle for cheap, frequent actions (button clicks,
// modal opens). Persistent counters (resend cooldown, per-email limits) live in
// SQLite via verification_sessions so they survive a restart.
const buckets = new Map(); // key -> [timestamps]

function hit(key, limit, windowMs) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  buckets.set(key, arr);
  return arr.length <= limit;
}

/** Max 5 verification starts per user per 10 minutes. */
function canStartVerification(guildId, userId) {
  return hit(`start:${guildId}:${userId}`, 5, 10 * 60 * 1000);
}

/** Max 8 code-entry attempts across sessions per user per 10 minutes (extra layer on top of per-session attempts). */
function canAttemptCode(guildId, userId) {
  return hit(`attempt:${guildId}:${userId}`, 8, 10 * 60 * 1000);
}

/** Per-email send limit: max 5 codes to the same address per hour, across all users. */
function canSendToEmail(email) {
  return hit(`email:${email.toLowerCase()}`, 5, 60 * 60 * 1000);
}

/** Guild-wide flood control: max 100 verification starts per guild per 10 minutes. */
function canGuildStart(guildId) {
  return hit(`guildstart:${guildId}`, 100, 10 * 60 * 1000);
}

const activeSessionStmt = db.prepare(`
  SELECT * FROM verification_sessions
  WHERE guild_id = ? AND discord_user_id = ? AND invalidated = 0
  ORDER BY id DESC LIMIT 1
`);

/** Returns seconds remaining before a resend is allowed, or 0 if allowed now. */
function resendCooldownRemaining(guildId, userId, cooldownSeconds) {
  const session = activeSessionStmt.get(guildId, userId);
  if (!session) return 0;

  const lastSent = new Date(session.last_sent_at + 'Z').getTime();
  const elapsedSec = (Date.now() - lastSent) / 1000;
  const remaining = Math.ceil(cooldownSeconds - elapsedSec);
  return remaining > 0 ? remaining : 0;
}

module.exports = {
  canStartVerification,
  canAttemptCode,
  canSendToEmail,
  canGuildStart,
  resendCooldownRemaining,
};
