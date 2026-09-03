const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const panels = require('../components/panels');
const emailService = require('../services/emailService');
const { generateCode, hashCode, verifyCode } = require('../utils/codeGenerator');
const { getSettings } = require('../services/guildSettingsService');
const db = require('../database/db');
const { logError } = require('../logger/logger');

function resultPanel(title, ok, body) {
  const container = new ContainerBuilder()
    .setAccentColor(ok ? panels.ACCENT.success : panels.ACCENT.error)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}\n${body}`));
  return panels.ephemeralReply(panels.baseReply(container));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Sistem testleri (yönetici)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sc) =>
      sc
        .setName('mail')
        .setDescription('Belirtilen adrese test e-postası gönder')
        .addStringOption((o) => o.setName('adres').setDescription('Test e-posta adresi').setRequired(true))
    )
    .addSubcommand((sc) => sc.setName('kod').setDescription('Kod üretme ve doğrulama mantığını test et'))
    .addSubcommand((sc) => sc.setName('rol').setDescription('Botun rol atama izinlerini test et'))
    .addSubcommand((sc) => sc.setName('smtp').setDescription('SMTP bağlantısını test et'))
    .addSubcommand((sc) => sc.setName('database').setDescription('Veritabanı bağlantısını test et')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'mail') {
      await interaction.deferReply({ flags: 64 });
      const to = interaction.options.getString('adres');
      try {
        await emailService.sendVerificationCode({ to, code: '000000', minutes: 5, guildName: `${interaction.guild.name} (TEST)` });
        await interaction.editReply(resultPanel('✅ Test Maili Gönderildi', true, `Adres: ${to}`));
      } catch (err) {
        logError('test_mail_failed', err);
        await interaction.editReply(resultPanel('❌ Test Maili Gönderilemedi', false, 'Detay local error log dosyasında.'));
      }
      return;
    }

    if (sub === 'kod') {
      const code = generateCode();
      const hash = hashCode(code, interaction.guild.id, interaction.user.id);
      const ok = verifyCode(code, interaction.guild.id, interaction.user.id, hash);
      const wrongOk = verifyCode('000000', interaction.guild.id, interaction.user.id, hash);
      await interaction.reply(
        resultPanel(
          '🧪 Kod Testi',
          ok && !wrongOk,
          `Kod üretimi: ✅\nHash doğrulama (doğru kod): ${ok ? '✅' : '❌'}\nHash doğrulama (yanlış kod reddi): ${!wrongOk ? '✅' : '❌'}`
        )
      );
      return;
    }

    if (sub === 'rol') {
      const settings = getSettings(interaction.guild.id);
      if (!settings.verified_role_id) {
        await interaction.reply(resultPanel('⚠️ Rol Ayarlanmadı', false, '`/ayarlar rol` ile bir rol ayarla.'));
        return;
      }
      const role = interaction.guild.roles.cache.get(settings.verified_role_id);
      if (!role) {
        await interaction.reply(resultPanel('❌ Rol Bulunamadı', false, 'Ayarlanan rol sunucuda mevcut değil.'));
        return;
      }
      const me = interaction.guild.members.me;
      const canAssign = me.permissions.has('ManageRoles') && me.roles.highest.position > role.position;
      await interaction.reply(
        resultPanel(canAssign ? '✅ Rol Ataması Mümkün' : '❌ Rol Ataması Mümkün Değil', canAssign, `Rol: <@&${role.id}>`)
      );
      return;
    }

    if (sub === 'smtp') {
      await interaction.deferReply({ flags: 64 });
      const result = await emailService.testConnection();
      await interaction.editReply(
        resultPanel(result.ok ? '✅ SMTP Bağlantısı Başarılı' : '❌ SMTP Bağlantı Hatası', result.ok, result.ok ? 'Gmail SMTP erişilebilir.' : 'Detay local error log dosyasında.')
      );
      return;
    }

    if (sub === 'database') {
      try {
        db.prepare('SELECT 1').get();
        await interaction.reply(resultPanel('✅ Database Bağlantısı Başarılı', true, 'SQLite erişilebilir.'));
      } catch (err) {
        logError('test_database_failed', err);
        await interaction.reply(resultPanel('❌ Database Hatası', false, 'Detay local error log dosyasında.'));
      }
    }
  },
};
