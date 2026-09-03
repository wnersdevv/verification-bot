const db = require('../database/db');
const { getConfig } = require('../config/config');

const getStmt = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
const insertStmt = db.prepare(`
  INSERT INTO guild_settings (guild_id, enabled, verified_role_id, code_expiry_minutes, max_attempts, resend_cooldown_seconds)
  VALUES (@guild_id, @enabled, @verified_role_id, @code_expiry_minutes, @max_attempts, @resend_cooldown_seconds)
`);
const updateStmt = db.prepare(`
  UPDATE guild_settings SET
    enabled = @enabled,
    verified_role_id = @verified_role_id,
    code_expiry_minutes = @code_expiry_minutes,
    max_attempts = @max_attempts,
    resend_cooldown_seconds = @resend_cooldown_seconds
  WHERE guild_id = @guild_id
`);

function getSettings(guildId) {
  const row = getStmt.get(guildId);
  if (row) return row;

  const cfg = getConfig().verification;
  const defaults = {
    guild_id: guildId,
    enabled: 1,
    verified_role_id: cfg.verifiedRole,
    code_expiry_minutes: cfg.codeExpiryMinutes,
    max_attempts: cfg.maxAttempts,
    resend_cooldown_seconds: cfg.resendCooldownSeconds,
  };
  insertStmt.run(defaults);
  return defaults;
}

function updateSettings(guildId, patch) {
  const current = getSettings(guildId);
  const next = { ...current, ...patch, guild_id: guildId };
  updateStmt.run(next);
  return next;
}

module.exports = { getSettings, updateSettings };
