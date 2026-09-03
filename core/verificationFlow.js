const panels = require('../components/panels');
const modals = require('../modals/modals');
const verificationService = require('../services/verificationService');
const { getSettings } = require('../services/guildSettingsService');
const roleService = require('../services/roleService');
const { logError } = require('../logger/logger');

const ERROR_MESSAGES = {
  format_empty: 'E-posta adresi boş olamaz.',
  format_too_long: 'E-posta adresi çok uzun.',
  format_invalid_at_count: 'E-posta adresinde geçerli bir "@" kullanımı yok.',
  format_invalid_format: 'E-posta adresi geçerli bir formatta değil.',
  format_invalid_domain: 'E-posta adresinin domaini geçersiz.',
  format_invalid_characters: 'E-posta adresinde geçersiz karakter var.',
  guild_rate_limited: 'Sunucuda çok fazla doğrulama isteği var, biraz sonra tekrar dene.',
  user_rate_limited: 'Çok fazla deneme yaptın, biraz sonra tekrar dene.',
  email_rate_limited: 'Bu e-posta adresine kısa sürede çok fazla kod gönderildi.',
  smtp_error: 'E-posta gönderilemedi. Lütfen biraz sonra tekrar dene.',
  no_session: 'Aktif bir doğrulama süreci bulunamadı. `/doğrula` ile yeniden başlayabilirsin.',
  resend_cooldown: null, // message carries the countdown already
  expired: 'Doğrulama kodunun süresi doldu.',
  max_attempts: 'Deneme limitine ulaştın. `/doğrula` ile yeniden başlayabilirsin.',
};

function friendlyError(err) {
  return ERROR_MESSAGES[err.code] || err.message || 'Bilinmeyen bir hata oluştu.';
}

async function handleEnterEmailButton(interaction) {
  await interaction.showModal(modals.emailModal());
}

async function handleEmailModalSubmit(interaction) {
  const email = interaction.fields.getTextInputValue('email_input');
  await interaction.deferUpdate();

  try {
    const result = await verificationService.startVerification(interaction.guild, interaction.member, email);
    await interaction.editReply(panels.codeSentPanel(result.email));
  } catch (err) {
    if (err instanceof verificationService.VerificationError) {
      await interaction.editReply(panels.errorPanel(friendlyError(err)));
    } else {
      logError('email_modal_submit', err);
      await interaction.editReply(panels.errorPanel('Beklenmedik bir hata oluştu.'));
    }
  }
}

async function handleEnterCodeButton(interaction) {
  await interaction.showModal(modals.codeModal());
}

async function handleCodeModalSubmit(interaction) {
  const code = interaction.fields.getTextInputValue('code_input').trim();
  await interaction.deferUpdate();

  try {
    const result = verificationService.submitCode(interaction.guild, interaction.member, code);
    const settings = getSettings(interaction.guild.id);
    const roleResult = await roleService.grantVerifiedRole(interaction.guild, interaction.member, settings.verified_role_id);
    const verification = verificationService.getStatus(interaction.guild.id, interaction.member.id);
    await interaction.editReply(panels.successPanel(result.email, verification?.verified_at, roleResult));
  } catch (err) {
    if (err instanceof verificationService.VerificationError) {
      if (err.code === 'wrong_code') {
        await interaction.editReply(panels.wrongCodePanel(err.attemptsLeft));
      } else if (err.code === 'expired') {
        await interaction.editReply(panels.expiredPanel());
      } else {
        await interaction.editReply(panels.errorPanel(friendlyError(err)));
      }
    } else {
      logError('code_modal_submit', err);
      await interaction.editReply(panels.errorPanel('Beklenmedik bir hata oluştu.'));
    }
  }
}

async function handleResendButton(interaction) {
  await interaction.deferUpdate();
  try {
    const result = await verificationService.resendCode(interaction.guild, interaction.member);
    await interaction.editReply(panels.codeSentPanel(result.email));
  } catch (err) {
    if (err instanceof verificationService.VerificationError) {
      const msg = err.code === 'resend_cooldown' ? err.message : friendlyError(err);
      await interaction.editReply(panels.errorPanel(msg));
    } else {
      logError('resend_button', err);
      await interaction.editReply(panels.errorPanel('Beklenmedik bir hata oluştu.'));
    }
  }
}

async function handleCancelButton(interaction) {
  verificationService.cancelVerification(interaction.guild.id, interaction.member.id);
  await interaction.update(panels.startPanel());
}

async function handleChangeEmailButton(interaction) {
  verificationService.beginEmailChange(interaction.guild.id, interaction.member.id);
  await interaction.showModal(modals.emailModal());
}

module.exports = {
  handleEnterEmailButton,
  handleEmailModalSubmit,
  handleEnterCodeButton,
  handleCodeModalSubmit,
  handleResendButton,
  handleCancelButton,
  handleChangeEmailButton,
  friendlyError,
};
