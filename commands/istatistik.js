const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const panels = require('../components/panels');
const verificationService = require('../services/verificationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('istatistik')
    .setDescription('Doğrulama istatistiklerini göster')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const stats = verificationService.getStats(interaction.guild.id);
    await interaction.reply(panels.ephemeralReply(panels.analyticsPanel(stats)));
  },
};
