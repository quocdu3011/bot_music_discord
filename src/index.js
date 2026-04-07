require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  escapeMarkdown
} = require('discord.js');
const { MusicSubscription } = require('./music/subscription');
const { MAX_PLAYLIST_SIZE, resolveTracks } = require('./music/resolver');

const token = process.env.DISCORD_TOKEN;
const prefix = process.env.COMMAND_PREFIX ?? '!';
const disconnectTimeoutMs = Number(process.env.DISCONNECT_TIMEOUT_MS ?? 180_000);

if (!token) {
  throw new Error('Thieu bien moi truong DISCORD_TOKEN.');
}

if (!Number.isFinite(disconnectTimeoutMs) || disconnectTimeoutMs < 15_000) {
  throw new Error('DISCONNECT_TIMEOUT_MS phai la so hop le va >= 15000.');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const subscriptions = new Map();

function formatTrackLine(track, index) {
  return `${index}. ${escapeMarkdown(track.title)} (${track.durationRaw}) - ${track.requestedBy}`;
}

async function sendHelp(message) {
  await message.channel.send(
    [
      'Lenh ho tro:',
      `\`${prefix}play <ten bai hat | link YouTube>\``,
      `\`${prefix}skip\``,
      `\`${prefix}stop\``,
      `\`${prefix}leave\``,
      `\`${prefix}queue\``,
      `\`${prefix}pause\``,
      `\`${prefix}resume\``
    ].join('\n')
  );
}

function getSubscription(guildId) {
  return subscriptions.get(guildId) ?? null;
}

async function ensureSubscription(message) {
  const voiceChannel = message.member?.voice?.channel;

  if (!voiceChannel) {
    await message.channel.send('Ban can vao voice channel truoc khi dung lenh nay.');
    return null;
  }

  const permissions = voiceChannel.permissionsFor(message.guild.members.me);

  if (
    !permissions?.has(PermissionFlagsBits.ViewChannel) ||
    !permissions?.has(PermissionFlagsBits.Connect) ||
    !permissions?.has(PermissionFlagsBits.Speak)
  ) {
    await message.channel.send(
      'Bot can quyen `View Channel`, `Connect` va `Speak` trong voice channel.'
    );
    return null;
  }

  if (
    voiceChannel.userLimit > 0 &&
    voiceChannel.members.size >= voiceChannel.userLimit &&
    !permissions.has(PermissionFlagsBits.MoveMembers)
  ) {
    await message.channel.send(
      'Voice channel hien dang day. Hay tang user limit hoac cap them quyen `Move Members` cho bot.'
    );
    return null;
  }

  const current = getSubscription(message.guild.id);

  if (current) {
    if (!current.isInChannel(voiceChannel.id)) {
      await message.channel.send('Bot dang hoat dong o mot voice channel khac trong server nay.');
      return null;
    }

    current.setTextChannel(message.channel);
    return current;
  }

  try {
    const subscription = await MusicSubscription.create({
      guildId: message.guild.id,
      voiceChannel,
      textChannel: message.channel,
      disconnectTimeoutMs,
      onDestroy: (guildId) => {
        subscriptions.delete(guildId);
      }
    });

    subscriptions.set(message.guild.id, subscription);
    return subscription;
  } catch (error) {
    console.error(`[music:${message.guild.id}] unable to join voice channel`, error);
    await message.channel.send(
      error.message ?? 'Khong the tham gia voice channel. Kiem tra quyen cua bot roi thu lai.'
    );
    return null;
  }
}

async function handlePlayCommand(message, query) {
  if (!query) {
    await message.channel.send(`Cach dung: \`${prefix}play <ten bai hat | link YouTube>\``);
    return;
  }

  const subscription = await ensureSubscription(message);

  if (!subscription) {
    return;
  }

  try {
    const resolved = await resolveTracks(query, `<@${message.author.id}>`);
    const enqueueResult = subscription.enqueue(resolved.tracks);

    if (resolved.kind === 'playlist') {
      await message.channel.send(
        [
          `Da them **${escapeMarkdown(resolved.title)}** vao hang doi.`,
          `So bai da them: ${resolved.tracks.length}.`,
          resolved.truncated
            ? `Bot chi them ${MAX_PLAYLIST_SIZE} bai dau tien cua playlist de tranh hang doi qua dai.`
            : null,
          enqueueResult.startedNow ? 'Bot dang bat dau tai bai dau tien.' : null
        ]
          .filter(Boolean)
          .join(' ')
      );
      return;
    }

    const track = resolved.tracks[0];

    if (enqueueResult.startedNow) {
      await message.channel.send(
        `Dang chuan bi phat **${escapeMarkdown(track.title)}** (${track.durationRaw}).`
      );
      return;
    }

    await message.channel.send(
      `Da them vao hang doi: **${escapeMarkdown(track.title)}** (${track.durationRaw}).`
    );
  } catch (error) {
    await message.channel.send(error.message ?? 'Khong the them bai hat vao hang doi.');
  }
}

async function handleQueueCommand(message) {
  const subscription = getSubscription(message.guild.id);

  if (!subscription) {
    await message.channel.send('Hang doi hien dang trong.');
    return;
  }

  const snapshot = subscription.getQueueSnapshot();

  if (!snapshot.currentTrack && snapshot.upcoming.length === 0) {
    await message.channel.send('Hang doi hien dang trong.');
    return;
  }

  const lines = [];

  if (snapshot.currentTrack) {
    lines.push(
      `Dang phat: ${escapeMarkdown(snapshot.currentTrack.title)} (${snapshot.currentTrack.durationRaw}) - ${snapshot.currentTrack.requestedBy}`
    );
  }

  if (snapshot.upcoming.length > 0) {
    lines.push('Cho tiep:');
    lines.push(
      snapshot.upcoming
        .slice(0, 10)
        .map((track, index) => formatTrackLine(track, index + 1))
        .join('\n')
    );

    if (snapshot.upcoming.length > 10) {
      lines.push(`... va ${snapshot.upcoming.length - 10} bai nua.`);
    }
  }

  await message.channel.send(lines.join('\n'));
}

async function handleSimplePlaybackCommand(message, command) {
  const subscription = getSubscription(message.guild.id);

  if (!subscription) {
    await message.channel.send('Bot chua tham gia voice channel nao trong server nay.');
    return;
  }

  if (command === 'skip') {
    const skipped = subscription.skip();
    await message.channel.send(skipped ? 'Da bo qua bai hien tai.' : 'Khong co bai nao de bo qua.');
    return;
  }

  if (command === 'stop') {
    subscription.stopAndClearQueue();
    await message.channel.send('Da dung phat va xoa hang doi.');
    return;
  }

  if (command === 'leave') {
    subscription.destroy();
    await message.channel.send('Bot da roi voice channel.');
    return;
  }

  if (command === 'pause') {
    const paused = subscription.pause();
    await message.channel.send(paused ? 'Da tam dung phat nhac.' : 'Khong the tam dung luc nay.');
    return;
  }

  if (command === 'resume') {
    const resumed = subscription.resume();
    await message.channel.send(resumed ? 'Da tiep tuc phat nhac.' : 'Khong co bai dang tam dung.');
  }
}

client.once('clientReady', () => {
  console.log(`Bot da dang nhap voi ten ${client.user.tag}`);
  console.log(`Tien to lenh: ${prefix}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.content.startsWith(prefix)) {
    return;
  }

  const body = message.content.slice(prefix.length).trim();

  if (!body) {
    return;
  }

  const [rawCommand, ...rest] = body.split(/\s+/);
  const command = rawCommand.toLowerCase();
  const query = rest.join(' ').trim();

  try {
    if (command === 'play') {
      await handlePlayCommand(message, query);
      return;
    }

    if (command === 'queue') {
      await handleQueueCommand(message);
      return;
    }

    if (['skip', 'stop', 'leave', 'pause', 'resume'].includes(command)) {
      await handleSimplePlaybackCommand(message, command);
      return;
    }

    if (['help', 'commands'].includes(command)) {
      await sendHelp(message);
    }
  } catch (error) {
    console.error(`[music:${message.guild.id}] unexpected command error`, error);
    await message.channel.send('Da xay ra loi trong khi xu ly lenh.');
  }
});

process.on('SIGINT', () => {
  for (const subscription of subscriptions.values()) {
    subscription.destroy();
  }

  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  for (const subscription of subscriptions.values()) {
    subscription.destroy();
  }

  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
});

client.login(token);
