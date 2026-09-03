const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const { getSettings, updateSettings } = require('../services/guildSettingsService');
const verificationService = require('../services/verificationService');
const emailService = require('../services/emailService');
const { getRecentLogs, logError } = require('../logger/logger');
const panels = require('../components/panels');

function ephemeral(container) {
  return panels.ephemeralReply(panels.baseReply(container));
}

async function handleMenuSelect(interaction) {
  const choice = interaction.values[0];
  const guildId = interaction.guild.id;

  switch (choice) {
    case 'toggle': {
      const settings = getSettings(guildId);
      const next = updateSettings(guildId, { enabled: settings.enabled ? 0 : 1 });
      await interaction.update(panels.adminOverviewPanel(next));
      return;
    }
    case 'role': {
      const container = new ContainerBuilder()
        .setAccentColor(panels.ACCENT.neutral)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### 🎭 Doğrulanmış Rol\nRol seç:'))
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder().setCustomId('admin:role_select').setPlaceholder('Bir rol seç')
          )
        );
      await interaction.update(ephemeral(container));
      return;
    }
    case 'expiry':
      await interaction.showModal(numberModal('admin_expiry', 'Kod Süresi (dakika)', String(getSettings(guildId).code_expiry_minutes)));
      return;
    case 'attempts':
      await interaction.showModal(numberModal('admin_attempts', 'Deneme Limiti', String(getSettings(guildId).max_attempts)));
      return;
    case 'cooldown':
      await interaction.showModal(numberModal('admin_cooldown', 'Resend Cooldown (saniye)', String(getSettings(guildId).resend_cooldown_seconds)));
      return;
    case 'stats': {
      const stats = verificationService.getStats(guildId);
      await interaction.update(panels.analyticsPanel(stats));
      return;
    }
    case 'logs': {
      const logs = getRecentLogs(guildId, 15);
      const lines = logs.length
        ? logs.map((l) => `\`${l.created_at}\` **${l.event_type}** ${l.detail || ''}`).join('\n')
        : '_henüz log yok_';
      const container = new ContainerBuilder()
        .setAccentColor(panels.ACCENT.neutral)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📋 Son Loglar\n${lines}`));
      await interaction.update(ephemeral(container));
      return;
    }
    case 'test': {
      const container = new ContainerBuilder()
        .setAccentColor(panels.ACCENT.neutral)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### 🧪 Test\nBir test seç:'))
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin:test_smtp').setLabel('SMTP Test').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('admin:test_database').setLabel('Database Test').setStyle(ButtonStyle.Secondary)
          )
        );
      await interaction.update(ephemeral(container));
      return;
    }
  }
}

function numberModal(customId, label, defaultValue) {
  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(label)
    .setStyle(TextInputStyle.Short)
    .setValue(defaultValue)
    .setRequired(true);
  return new ModalBuilder().setCustomId(`modal:${customId}`).setTitle(label).addComponents(new ActionRowBuilder().addComponents(input));
}

async function handleRoleSelect(interaction) {
  const roleId = interaction.values[0];
  const settings = updateSettings(interaction.guild.id, { verified_role_id: roleId });
  await interaction.update(panels.adminOverviewPanel(settings));
}

async function handleNumberModalSubmit(interaction, field) {
  const raw = interaction.fields.getTextInputValue('value').trim();
  const value = parseInt(raw, 10);

  if (Number.isNaN(value) || value <= 0) {
    await interaction.reply({ content: '⚠️ Geçerli bir pozitif sayı gir.', flags: MessageFlags.Ephemeral });
    return;
  }

  const settings = updateSettings(interaction.guild.id, { [field]: value });
  await interaction.reply(panels.ephemeralReply(panels.adminOverviewPanel(settings)));
}

async function handleTestSmtp(interaction) {
  await interaction.deferUpdate();
  const result = await emailService.testConnection();
  const container = new ContainerBuilder()
    .setAccentColor(result.ok ? panels.ACCENT.success : panels.ACCENT.error)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        result.ok ? '### ✅ SMTP Bağlantısı Başarılı' : `### ❌ SMTP Bağlantı Hatası\nDetay local error log dosyasında.`
      )
    );
  await interaction.editReply(ephemeral(container));
}

async function handleTestDatabase(interaction) {
  await interaction.deferUpdate();
  let ok = true;
  try {
    verificationService.getStats(interaction.guild.id);
  } catch (err) {
    ok = false;
    logError('db_test_failed', err);
  }
  const container = new ContainerBuilder()
    .setAccentColor(ok ? panels.ACCENT.success : panels.ACCENT.error)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(ok ? '### ✅ Database Bağlantısı Başarılı' : '### ❌ Database Hatası'));
  await interaction.editReply(ephemeral(container));
}

module.exports = {
  handleMenuSelect,
  handleRoleSelect,
  handleNumberModalSubmit,
  handleTestSmtp,
  handleTestDatabase,
};
