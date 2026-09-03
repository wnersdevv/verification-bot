const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { maskEmail } = require('../utils/masking');

const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const errorStream = fs.createWriteStream(path.join(LOG_DIR, 'error.log'), { flags: 'a' });

const insertLog = db.prepare(`
  INSERT INTO verification_logs (guild_id, discord_user_id, event_type, detail)
  VALUES (?, ?, ?, ?)
`);

/**
 * Records a verification-flow event. Never pass raw codes here.
 * If `detail` contains an email, mask it before calling.
 */
function logEvent(guildId, discordUserId, eventType, detail = null) {
  try {
    insertLog.run(guildId, discordUserId, eventType, detail);
  } catch (err) {
    logError('log_write_failed', err);
  }
}

function logVerificationEvent(guildId, discordUserId, eventType, email, extra = '') {
  const masked = email ? maskEmail(email) : '';
  const detail = [masked, extra].filter(Boolean).join(' ');
  logEvent(guildId, discordUserId, eventType, detail);
}

/** Full error + stack trace goes to the local file only, never to Discord. */
function logError(context, err) {
  const line = `[${new Date().toISOString()}] ${context}: ${err?.stack || err}\n`;
  errorStream.write(line);
  console.error(context, err);
}

function getRecentLogs(guildId, limit = 20) {
  return db
    .prepare(
      `SELECT event_type, detail, created_at FROM verification_logs
       WHERE guild_id = ? ORDER BY id DESC LIMIT ?`
    )
    .all(guildId, limit);
}

module.exports = { logEvent, logVerificationEvent, logError, getRecentLogs };
