const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const panels = require('../components/panels');
const verificationService = require('../services/verificationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('doğrulama')
    .setDescription('Doğrulama durumunu yönet')
    .addSubcommand((sc) => sc.setName('durum').setDescription('Doğrulama durumunu göster'))
    .addSubcommand((sc) => sc.setName('iptal').setDescription('Aktif doğrulama sürecini iptal et')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (sub === 'durum') {
      const status = verificationService.getStatus(guildId, userId);
      await interaction.reply(panels.ephemeralReply(panels.statusPanel(status)));
      return;
    }

    if (sub === 'iptal') {
      verificationService.cancelVerification(guildId, userId);
      await interaction.reply({ content: '❌ Aktif doğrulama süreci iptal edildi.', flags: MessageFlags.Ephemeral });
    }
  },
};
