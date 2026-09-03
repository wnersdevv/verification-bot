const { PermissionFlagsBits } = require('discord.js');

function isAdmin(member) {
  return Boolean(member?.permissions?.has(PermissionFlagsBits.ManageGuild));
}

/** Replies with an error and returns false if the member isn't an admin. */
async function requireAdmin(interaction) {
  if (isAdmin(interaction.member)) return true;
  await interaction.reply({ content: '❌ Bu işlem için yetkin yok.', ephemeral: true });
  return false;
}

module.exports = { isAdmin, requireAdmin };
