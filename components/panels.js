const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { maskEmail } = require('../utils/masking');

const ACCENT = {
  neutral: 0x5865f2,
  success: 0x2ecc71,
  error: 0xed4245,
  warning: 0xf1c40f,
};

function baseReply(container) {
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/** Wraps a panel result (from any builder above) as an ephemeral reply. */
function ephemeralReply(panelResult) {
  return { ...panelResult, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

/** Initial /doğrula panel — prompts the user to start the flow. */
function startPanel() {
  const container = new ContainerBuilder()
    .setAccentColor(ACCENT.neutral)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('### 📧 E-Posta Doğrulama')
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Discord hesabını doğrulamak için e-posta adresini aşağıdaki butondan gir.\n\n🔒 E-posta adresin gizli tutulur.'
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify:enter_email').setLabel('E-Posta Adresi Gir').setEmoji('📨').setStyle(ButtonStyle.Primary)
      )
    );

  return baseReply(container);
}

/** Shown right after the code email is sent. */
function codeSentPanel(email) {
  const container = new ContainerBuilder()
    .setAccentColor(ACCENT.neutral)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### 📬 Kod Gönderildi'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `📧 Adres: **${maskEmail(email)}**\n\nKodunu e-postana gönderdik.`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify:enter_code').setLabel('Kodu Gir').setEmoji('🔢').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('verify:resend').setLabel('Tekrar Gönder').setEmoji('📨').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('verify:cancel').setLabel('İptal').setEmoji('❌').setStyle(ButtonStyle.Danger)
      )
    );

  return baseReply(container);
}

function wrongCodePanel(attemptsLeft) {
  const container = new ContainerBuilder()
    .setAccentColor(ACCENT.error)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### ❌ Kod Yanlış'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Kalan deneme: **${attemptsLeft}**`))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify:enter_code').setLabel('Tekrar Dene').setEmoji('🔢').setStyle(ButtonStyle.Primary)
      )
    );

  return baseReply(container);
}

function successPanel(email, verifiedAt, roleResult) {
  const roleLine =
    roleResult?.granted === true
      ? '\n\n🎭 Doğrulanmış rolün verildi.'
      : roleResult?.granted === false
      ? '\n\n⚠️ Rol otomatik verilemedi, bir yetkiliye ulaşabilirsin.'
      : '';

  const container = new ContainerBuilder()
    .setAccentColor(ACCENT.success)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### ✅ Doğrulandı'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `E-posta adresin başarıyla doğrulandı.\n\n📧 ${maskEmail(email)}\n🕐 Doğrulanma: ${formatDate(verifiedAt)}\n\n🎉 Artık doğrulanmış üye olarak kabul ediliyorsun.${roleLine}`
      )
    );

  return baseReply(container);
}

function expiredPanel() {
  const container = new ContainerBuilder()
    .setAccentColor(ACCENT.warning)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### ⌛ Kodun Süresi Doldu'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Yeni bir kod isteyebilirsin.'))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify:enter_email').setLabel('Yeniden Başlat').setEmoji('🔄').setStyle(ButtonStyle.Primary)
      )
    );

  return baseReply(container);
}

function errorPanel(message) {
  const container = new ContainerBuilder()
    .setAccentColor(ACCENT.error)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🚨 Hata\n${message}`));

  return baseReply(container);
}

function statusPanel(verification) {
  if (!verification || !verification.verified) {
    const container = new ContainerBuilder()
      .setAccentColor(ACCENT.warning)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### 📋 Doğrulama Durumu\nHenüz doğrulanmış bir e-posta adresin yok. `/doğrula` ile başlayabilirsin.')
      );
    return baseReply(container);
  }

  const container = new ContainerBuilder()
    .setAccentColor(ACCENT.success)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 📋 Doğrulama Durumu\n` +
          `📧 E-posta: **${maskEmail(verification.email)}**\n` +
          `🌐 Sağlayıcı: **${verification.provider}**\n` +
          `✅ Durum: **Doğrulandı**\n` +
          `🕐 Tarih: **${formatDate(verification.verified_at)}**`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify:change_email').setLabel('E-postamı Değiştir').setEmoji('📧').setStyle(ButtonStyle.Secondary)
      )
    );

  return baseReply(container);
}

/** /panel admin overview with a select menu for each management area. */
function adminOverviewPanel(settings) {
  const container = new ContainerBuilder()
    .setAccentColor(ACCENT.neutral)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### 👑 Yönetici Paneli — 📧 E-posta Doğrulama'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Durum: **${settings.enabled ? '🟢 Açık' : '🔴 Kapalı'}**\n` +
          `Doğrulanmış Rol: ${settings.verified_role_id ? `<@&${settings.verified_role_id}>` : '_ayarlanmadı_'}\n` +
          `Kod Süresi: **${settings.code_expiry_minutes} dakika**\n` +
          `Deneme Limiti: **${settings.max_attempts}**\n` +
          `Resend Cooldown: **${settings.resend_cooldown_seconds} saniye**`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('admin:menu')
          .setPlaceholder('Bir bölüm seç')
          .addOptions(
            { label: settings.enabled ? 'Sistemi Kapat' : 'Sistemi Aç', value: 'toggle', emoji: settings.enabled ? '🔴' : '🟢' },
            { label: 'Doğrulanmış Rol', value: 'role', emoji: '🎭' },
            { label: 'Kod Süresi', value: 'expiry', emoji: '⏱️' },
            { label: 'Deneme Limiti', value: 'attempts', emoji: '🔢' },
            { label: 'Resend Cooldown', value: 'cooldown', emoji: '🔄' },
            { label: 'İstatistik', value: 'stats', emoji: '📊' },
            { label: 'Loglar', value: 'logs', emoji: '📋' },
            { label: 'Test', value: 'test', emoji: '🧪' }
          )
      )
    );

  return baseReply(container);
}

function analyticsPanel(stats) {
  const providerLines = stats.topProviders.length
    ? stats.topProviders.map((p, i) => `${['En çok kullanılan', 'İkinci', 'Üçüncü'][i] || `${i + 1}.`}: **${p.provider}** (${p.c})`).join('\n')
    : '_henüz veri yok_';

  const container = new ContainerBuilder()
    .setAccentColor(ACCENT.neutral)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 📊 Verification Analytics\n\n` +
          `Bugün: **${stats.todaySuccess + stats.todayFailed}** doğrulama\n` +
          `Başarılı: **${stats.todaySuccess}**\n` +
          `Başarısız: **${stats.todayFailed}**\n` +
          `Toplam: **${stats.totalVerified}**\n\n${providerLines}`
      )
    );

  return baseReply(container);
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' });
}

module.exports = {
  startPanel,
  codeSentPanel,
  wrongCodePanel,
  successPanel,
  expiredPanel,
  errorPanel,
  statusPanel,
  adminOverviewPanel,
  analyticsPanel,
  baseReply,
  ephemeralReply,
  ACCENT,
};
