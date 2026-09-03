const PROVIDER_DOMAINS = {
  Gmail: ['gmail.com', 'googlemail.com'],
  Microsoft: ['hotmail.com', 'outlook.com', 'live.com', 'msn.com'],
  Yahoo: ['yahoo.com', 'yahoo.com.tr'],
  iCloud: ['icloud.com'],
  Proton: ['proton.me', 'protonmail.com'],
};

/**
 * Domain -> provider name lookup. Statistics/UX only — this never attempts
 * to authenticate against the detected provider.
 */
function detectProvider(email) {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  for (const [provider, domains] of Object.entries(PROVIDER_DOMAINS)) {
    if (domains.includes(domain)) return provider;
  }
  return 'Generic';
}

module.exports = { detectProvider };
