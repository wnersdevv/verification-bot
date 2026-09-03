const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const panels = require('../components/panels');
const { getSettings } = require('../services/guildSettingsService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Yönetici paneli')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const settings = getSettings(interaction.guild.id);
    await interaction.reply(panels.ephemeralReply(panels.adminOverviewPanel(settings)));
  },
};
