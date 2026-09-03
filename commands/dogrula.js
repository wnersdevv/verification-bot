const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const panels = require('../components/panels');
const { getSettings } = require('../services/guildSettingsService');
const verificationService = require('../services/verificationService');

module.exports = {
  data: new SlashCommandBuilder().setName('doğrula').setDescription('E-posta adresini doğrula'),

  async execute(interaction) {
    const settings = getSettings(interaction.guild.id);
    if (!settings.enabled) {
      await interaction.reply({ content: '🔴 Doğrulama sistemi şu anda kapalı.', flags: MessageFlags.Ephemeral });
      return;
    }

    const existing = verificationService.getStatus(interaction.guild.id, interaction.user.id);
    if (existing?.verified) {
      await interaction.reply(panels.ephemeralReply(panels.statusPanel(existing)));
      return;
    }

    await interaction.reply(panels.ephemeralReply(panels.startPanel()));
  },
};
