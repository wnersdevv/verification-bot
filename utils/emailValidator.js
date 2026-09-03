const dns = require('dns').promises;

const MAX_LENGTH = 254;
// Reasonably strict but not paranoid RFC 5322-ish pattern.
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const mxCache = new Map(); // domain -> { ok, expiresAt }
const MX_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Structural validation only — no network calls. Returns { valid, reason }.
 */
function validateFormat(email) {
  if (!email || typeof email !== 'string') return fail('empty');
  const trimmed = email.trim();

  if (trimmed.length === 0) return fail('empty');
  if (trimmed.length > MAX_LENGTH) return fail('too_long');
  if ((trimmed.match(/@/g) || []).length !== 1) return fail('invalid_at_count');

  const [local, domain] = trimmed.split('@');
  if (!local || !domain) return fail('invalid_format');
  if (!domain.includes('.')) return fail('invalid_domain');
  if (/\s/.test(trimmed)) return fail('invalid_characters');
  if (!EMAIL_REGEX.test(trimmed)) return fail('invalid_format');

  return { valid: true, email: trimmed.toLowerCase() };

  function fail(reason) {
    return { valid: false, reason };
  }
}

/**
 * Best-effort MX/A record check. A missing DNS record does not necessarily mean
 * the address is fake, so callers should treat a false result as "unverifiable",
 * not "rejected" — the real proof of ownership is the emailed code.
 */
async function domainHasMailServer(domain) {
  const cached = mxCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) return cached.ok;

  let ok = false;
  try {
    const mx = await dns.resolveMx(domain);
    ok = Array.isArray(mx) && mx.length > 0;
  } catch {
    try {
      // Some domains accept mail without an explicit MX record (fallback to A/AAAA).
      const a = await dns.resolve(domain);
      ok = Array.isArray(a) && a.length > 0;
    } catch {
      ok = false;
    }
  }

  mxCache.set(domain, { ok, expiresAt: Date.now() + MX_CACHE_TTL_MS });
  return ok;
}

module.exports = { validateFormat, domainHasMailServer };
