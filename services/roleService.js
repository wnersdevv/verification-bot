const { logError } = require('../logger/logger');

/**
 * Attempts to grant the verified role. Never throws — verification success is
 * independent of role assignment succeeding.
 * Returns { granted: boolean, reason?: string }
 */
async function grantVerifiedRole(guild, member, roleId) {
  if (!roleId) return { granted: false, reason: 'no_role_configured' };

  const role = guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));
  if (!role) return { granted: false, reason: 'role_not_found' };

  const me = guild.members.me;
  if (!me?.permissions.has('ManageRoles') || me.roles.highest.position <= role.position) {
    return { granted: false, reason: 'missing_permissions' };
  }

  try {
    await member.roles.add(role, 'E-posta doğrulaması başarılı');
    return { granted: true };
  } catch (err) {
    logError('role_assignment_failed', err);
    return { granted: false, reason: 'assignment_error' };
  }
}

module.exports = { grantVerifiedRole };
