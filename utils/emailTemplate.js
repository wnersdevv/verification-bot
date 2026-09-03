function verificationEmailHtml({ code, minutes, guildName }) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>E-posta Doğrulama</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0b0f;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0b0f;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:linear-gradient(180deg,#15151d,#0f0f14);border:1px solid #26262f;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:36px 32px 8px 32px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#5865F2,#8b5cf6);line-height:48px;color:#fff;font-size:22px;font-weight:700;">✦</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">E-posta Doğrulama</h1>
              <p style="margin:8px 0 0 0;color:#9a9aab;font-size:14px;line-height:1.5;">
                ${guildName ? `${escapeHtml(guildName)} sunucusundaki` : 'Discord'} hesabını doğrulamak için aşağıdaki kodu kullan.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;text-align:center;">
              <div style="background-color:#1c1c26;border:1px solid #33333f;border-radius:12px;padding:20px 16px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#ffffff;font-family:'Courier New',monospace;">${code}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px 32px;text-align:center;">
              <p style="margin:0;color:#9a9aab;font-size:13px;line-height:1.6;">
                Kodun <strong style="color:#c9c9d6;">${minutes} dakika</strong> geçerlidir.<br>
                Bu kodu kimseyle paylaşma — Discord veya bu botun ekibi senden asla şifreni istemez.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;text-align:center;border-top:1px solid #22222c;">
              <p style="margin:16px 0 0 0;color:#5a5a6b;font-size:11px;">
                Bu kodu sen istemediysen bu e-postayı yok sayabilirsin.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function verificationEmailText({ code, minutes }) {
  return `E-posta Doğrulama\n\nKodun: ${code}\nBu kod ${minutes} dakika geçerlidir.\nBu kodu kimseyle paylaşma.`;
}

module.exports = { verificationEmailHtml, verificationEmailText };
