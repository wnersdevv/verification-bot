const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const panels = require('../components/panels');
const { getSettings } = require('../services/guildSettingsService');

module.exports = {
  data: new SlashCommandBuilder().setName('status').setDescription('Botun ve doğrulama sisteminin durumunu göster'),

  async execute(interaction) {
    const settings = getSettings(interaction.guild.id);
    const uptimeSec = Math.floor(interaction.client.uptime / 1000);
    const uptime = `${Math.floor(uptimeSec / 3600)}s ${Math.floor((uptimeSec % 3600) / 60)}d`;

    const container = new ContainerBuilder()
      .setAccentColor(panels.ACCENT.neutral)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 🤖 Bot Durumu\n` +
            `Ping: **${interaction.client.ws.ping}ms**\n` +
            `Çalışma süresi: **${uptime}**\n` +
            `Doğrulama sistemi: **${settings.enabled ? '🟢 Açık' : '🔴 Kapalı'}**`
        )
      );

    await interaction.reply(panels.ephemeralReply(panels.baseReply(container)));
  },
};
