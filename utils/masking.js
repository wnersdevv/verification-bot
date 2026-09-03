/**
 * Masks an email address for display, e.g. "enes@gmail.com" -> "en***@gmail.com"
 */
function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';

  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  const masked = `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}`;
  return `${masked}@${domain}`;
}

module.exports = { maskEmail };
