const crypto = require('crypto');

/** Generates a cryptographically secure 6-digit code, e.g. "739214". */
function generateCode() {
  // randomInt is rejection-sampled internally, so the distribution stays uniform.
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

function hashCode(code, guildId, userId) {
  // Salting with guild/user id prevents rainbow-table reuse across sessions
  // without needing a separately stored per-row salt.
  return crypto
    .createHash('sha256')
    .update(`${code}:${guildId}:${userId}`)
    .digest('hex');
}

function verifyCode(code, guildId, userId, storedHash) {
  const candidate = hashCode(code, guildId, userId);
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { generateCode, hashCode, verifyCode };
