require('dotenv').config();

const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const commands = require('./commands');
const { createLavalink } = require('./music/lavalink');
const { PlayerManager } = require('./music/player-manager');

const token = process.env.DISCORD_TOKEN;
const disconnectTimeoutMs = Number(process.env.DISCONNECT_TIMEOUT_MS ?? 180_000);

if (!token) {
  throw new Error('Thieu bien moi truong DISCORD_TOKEN.');
}

if (!Number.isFinite(disconnectTimeoutMs) || disconnectTimeoutMs < 15_000) {
  throw new Error('DISCONNECT_TIMEOUT_MS phai la so hop le va >= 15000.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

client.lavalink = createLavalink(client);
client.commands = new Collection();
client.playerManager = new PlayerManager({
  disconnectTimeoutMs,
  lavalink: client.lavalink
});

for (const command of commands) {
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot da dang nhap voi ten ${readyClient.user.tag}`);
  console.log(`Da nap ${client.commands.size} slash command(s).`);
  console.log(
    `Lavalink node: ${process.env.LAVALINK_HOST ?? '127.0.0.1'}:${process.env.LAVALINK_PORT ?? '2333'}`
  );
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);

    if (!command?.autocomplete) {
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`[command:${interaction.commandName}] autocomplete error`, error);
    }

    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);

  if (!command?.execute) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[command:${interaction.commandName}] execution error`, error);

    const payload = {
      content: 'Da xay ra loi trong khi xu ly lenh.',
      ephemeral: true
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
      return;
    }

    await interaction.reply(payload).catch(() => {});
  }
});

function shutdown() {
  client.playerManager.destroyAll();
  client.destroy();
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
});

client.login(token);
