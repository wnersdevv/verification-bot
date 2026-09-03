const { Events, MessageFlags } = require('discord.js');
const flow = require('../core/verificationFlow');
const adminFlow = require('../core/adminFlow');
const { logError } = require('../logger/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) return handleCommand(interaction);
      if (interaction.isButton()) return handleButton(interaction);
      if (interaction.isModalSubmit()) return handleModal(interaction);
      if (interaction.isStringSelectMenu()) return handleStringSelect(interaction);
      if (interaction.isRoleSelectMenu()) return handleRoleSelect(interaction);
    } catch (err) {
      logError('interaction_unhandled', err);
      await safeErrorReply(interaction);
    }
  },
};

async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    logError(`command_${interaction.commandName}`, err);
    await safeErrorReply(interaction);
  }
}

async function handleButton(interaction) {
  const [ns, action] = interaction.customId.split(':');

  if (ns === 'verify') {
    const handlers = {
      enter_email: flow.handleEnterEmailButton,
      enter_code: flow.handleEnterCodeButton,
      resend: flow.handleResendButton,
      cancel: flow.handleCancelButton,
      change_email: flow.handleChangeEmailButton,
    };
    const handler = handlers[action];
    if (handler) await handler(interaction);
    return;
  }

  if (ns === 'admin') {
    const handlers = {
      test_smtp: adminFlow.handleTestSmtp,
      test_database: adminFlow.handleTestDatabase,
    };
    const handler = handlers[action];
    if (handler) await handler(interaction);
  }
}

async function handleModal(interaction) {
  const [ns, action] = interaction.customId.split(':');

  if (ns === 'modal') {
    if (action === 'email') return flow.handleEmailModalSubmit(interaction);
    if (action === 'code') return flow.handleCodeModalSubmit(interaction);
    if (action === 'admin_expiry') return adminFlow.handleNumberModalSubmit(interaction, 'code_expiry_minutes');
    if (action === 'admin_attempts') return adminFlow.handleNumberModalSubmit(interaction, 'max_attempts');
    if (action === 'admin_cooldown') return adminFlow.handleNumberModalSubmit(interaction, 'resend_cooldown_seconds');
  }
}

async function handleStringSelect(interaction) {
  const [ns, action] = interaction.customId.split(':');
  if (ns === 'admin' && action === 'menu') await adminFlow.handleMenuSelect(interaction);
}

async function handleRoleSelect(interaction) {
  const [ns, action] = interaction.customId.split(':');
  if (ns === 'admin' && action === 'role_select') await adminFlow.handleRoleSelect(interaction);
}

async function safeErrorReply(interaction) {
  const payload = { content: '🚨 Beklenmedik bir hata oluştu. Lütfen tekrar dene.', flags: MessageFlags.Ephemeral };
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch {
    // Interaction may already be invalid (expired/unknown) — nothing more we can do.
  }
}
