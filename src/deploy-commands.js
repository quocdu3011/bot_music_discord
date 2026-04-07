require('dotenv').config();

const { REST, Routes } = require('discord.js');
const commands = require('./commands');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token) {
  throw new Error('Thieu bien moi truong DISCORD_TOKEN.');
}

if (!clientId) {
  throw new Error('Thieu bien moi truong DISCORD_CLIENT_ID.');
}

const body = commands.map((command) => command.data.toJSON());
const rest = new REST({ version: '10' }).setToken(token);

async function main() {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body
    });
    console.log(`Da dang ky ${body.length} slash command cho guild ${guildId}.`);
    return;
  }

  await rest.put(Routes.applicationCommands(clientId), {
    body
  });
  console.log(`Da dang ky ${body.length} global slash command(s).`);
}

main().catch((error) => {
  console.error('Khong the dang ky slash commands.', error);
  process.exit(1);
});
