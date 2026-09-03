const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

function emailModal() {
  const input = new TextInputBuilder()
    .setCustomId('email_input')
    .setLabel('E-posta adresin')
    .setPlaceholder('ornek@gmail.com')
    .setStyle(TextInputStyle.Short)
    .setMinLength(5)
    .setMaxLength(254)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId('modal:email')
    .setTitle('E-Posta Doğrulama')
    .addComponents(new ActionRowBuilder().addComponents(input));
}

function codeModal() {
  const input = new TextInputBuilder()
    .setCustomId('code_input')
    .setLabel('Doğrulama kodu')
    .setPlaceholder('123456')
    .setStyle(TextInputStyle.Short)
    .setMinLength(6)
    .setMaxLength(6)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId('modal:code')
    .setTitle('Kodu Gir')
    .addComponents(new ActionRowBuilder().addComponents(input));
}

module.exports = { emailModal, codeModal };
