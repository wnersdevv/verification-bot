const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Giriş yapıldı: ${client.user.tag}`);
    client.user.setActivity('/doğrula', { type: ActivityType.Watching });
  },
};
