const nodemailer = require('nodemailer');
const { getConfig } = require('../config/config');
const { verificationEmailHtml, verificationEmailText } = require('../utils/emailTemplate');
const { logError } = require('../logger/logger');

class EmailService {
  constructor() {
    this._transporter = null;
  }

  _getTransporter() {
    if (this._transporter) return this._transporter;

    const { gmail } = getConfig();
    this._transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmail.adres,
        pass: gmail.sifre, // Gmail App Password, never the account password.
      },
    });

    return this._transporter;
  }

  async sendVerificationCode({ to, code, minutes, guildName }) {
    const { gmail } = getConfig();
    const transporter = this._getTransporter();

    await transporter.sendMail({
      from: `"${guildName || 'Doğrulama'}" <${gmail.adres}>`,
      to,
      subject: `Discord hesabını doğrula • Verification Code`,
      text: verificationEmailText({ code, minutes }),
      html: verificationEmailHtml({ code, minutes, guildName }),
    });
  }

  /** Used by /test smtp — verifies the transporter can authenticate, sends nothing. */
  async testConnection() {
    try {
      await this._getTransporter().verify();
      return { ok: true };
    } catch (err) {
      logError('smtp_test_failed', err);
      return { ok: false, message: err.message };
    }
  }

  /** Forces a fresh transporter next call — used after /ayarlar changes gmail creds. */
  reset() {
    this._transporter = null;
  }
}

module.exports = new EmailService();
