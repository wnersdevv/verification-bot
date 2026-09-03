const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.cwd(), 'ayarlar.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `ayarlar.json bulunamadı. "ayarlar.example.json" dosyasını "ayarlar.json" olarak kopyalayıp bilgilerini gir.`
    );
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`ayarlar.json geçerli bir JSON değil: ${err.message}`);
  }

  const required = ['token', 'clientId'];
  for (const key of required) {
    if (!parsed[key]) throw new Error(`ayarlar.json içinde "${key}" eksik.`);
  }
  if (!parsed.gmail || !parsed.gmail.adres || !parsed.gmail.sifre) {
    throw new Error('ayarlar.json içinde "gmail.adres" ve "gmail.sifre" gerekli.');
  }

  return {
    token: parsed.token,
    clientId: parsed.clientId,
    guildId: parsed.guildId || null,
    gmail: {
      adres: parsed.gmail.adres,
      sifre: parsed.gmail.sifre,
    },
    verification: {
      verifiedRole: parsed.verification?.verifiedRole || null,
      codeExpiryMinutes: parsed.verification?.codeExpiryMinutes ?? 5,
      maxAttempts: parsed.verification?.maxAttempts ?? 5,
      resendCooldownSeconds: parsed.verification?.resendCooldownSeconds ?? 60,
    },
  };
}

// Cache so we don't re-read the file on every access, but allow reload for /ayarlar changes.
let cached = null;

function getConfig() {
  if (!cached) cached = loadConfig();
  return cached;
}

function reloadConfig() {
  cached = loadConfig();
  return cached;
}

module.exports = { getConfig, reloadConfig, CONFIG_PATH };
