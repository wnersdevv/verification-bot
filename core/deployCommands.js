const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('../config/config');

async function deploy() {
  const config = getConfig();
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commands = [];

  for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(commandsPath, file));
    commands.push(command.data.toJSON());
  }

  const rest = new REST().setToken(config.token);

  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  const data = await rest.put(route, { body: commands });
  console.log(`✅ ${data.length} komut yüklendi (${config.guildId ? 'guild' : 'global'}).`);
}

if (require.main === module) {
  deploy().catch((err) => {
    console.error('❌ Komutlar yüklenemedi:', err);
    process.exit(1);
  });
}

module.exports = { deploy };
