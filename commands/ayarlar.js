const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const panels = require('../components/panels');
const { getSettings, updateSettings } = require('../services/guildSettingsService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ayarlar')
    .setDescription('Doğrulama ayarlarını hızlıca değiştir')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sc) =>
      sc
        .setName('rol')
        .setDescription('Doğrulanmış rolü ayarla')
        .addRoleOption((o) => o.setName('rol').setDescription('Doğrulanmış üyelere verilecek rol').setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName('sure')
        .setDescription('Kod geçerlilik süresini ayarla (dakika)')
        .addIntegerOption((o) => o.setName('dakika').setDescription('Dakika').setMinValue(1).setMaxValue(60).setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName('deneme')
        .setDescription('Maksimum yanlış deneme sayısını ayarla')
        .addIntegerOption((o) => o.setName('limit').setDescription('Deneme limiti').setMinValue(1).setMaxValue(20).setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName('cooldown')
        .setDescription('Tekrar gönderme bekleme süresini ayarla (saniye)')
        .addIntegerOption((o) => o.setName('saniye').setDescription('Saniye').setMinValue(10).setMaxValue(600).setRequired(true))
    )
    .addSubcommand((sc) => sc.setName('ac').setDescription('Doğrulama sistemini aç'))
    .addSubcommand((sc) => sc.setName('kapat').setDescription('Doğrulama sistemini kapat')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    let settings;

    switch (sub) {
      case 'rol':
        settings = updateSettings(guildId, { verified_role_id: interaction.options.getRole('rol').id });
        break;
      case 'sure':
        settings = updateSettings(guildId, { code_expiry_minutes: interaction.options.getInteger('dakika') });
        break;
      case 'deneme':
        settings = updateSettings(guildId, { max_attempts: interaction.options.getInteger('limit') });
        break;
      case 'cooldown':
        settings = updateSettings(guildId, { resend_cooldown_seconds: interaction.options.getInteger('saniye') });
        break;
      case 'ac':
        settings = updateSettings(guildId, { enabled: 1 });
        break;
      case 'kapat':
        settings = updateSettings(guildId, { enabled: 0 });
        break;
    }

    await interaction.reply(panels.ephemeralReply(panels.adminOverviewPanel(settings)));
  },
};
