const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const panels = require('../components/panels');

module.exports = {
  data: new SlashCommandBuilder().setName('yardım').setDescription('Kullanılabilir komutları göster'),

  async execute(interaction) {
    const container = new ContainerBuilder()
      .setAccentColor(panels.ACCENT.neutral)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 📖 Komutlar\n\n` +
            `**Üye Komutları**\n` +
            `\`/doğrula\` — E-posta doğrulamasını başlat\n` +
            `\`/doğrulama durum\` — Doğrulama durumunu göster\n` +
            `\`/doğrulama iptal\` — Aktif süreci iptal et\n` +
            `\`/status\` — Bot durumu\n\n` +
            `**Yönetici Komutları**\n` +
            `\`/panel\` — Yönetici paneli\n` +
            `\`/ayarlar\` — Hızlı ayar değişiklikleri\n` +
            `\`/istatistik\` — Doğrulama istatistikleri\n` +
            `\`/test\` — Sistem testleri`
        )
      );

    await interaction.reply(panels.ephemeralReply(panels.baseReply(container)));
  },
};
