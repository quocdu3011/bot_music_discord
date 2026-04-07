const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { MusicSubscription } = require('./subscription');

class PlayerManager {
  constructor({ disconnectTimeoutMs, lavalink }) {
    this.disconnectTimeoutMs = disconnectTimeoutMs;
    this.lavalink = lavalink;
    this.subscriptions = new Map();
  }

  get(guildId) {
    return this.subscriptions.get(guildId) ?? null;
  }

  async ensure(interaction) {
    const node = this.lavalink.getIdealNode();

    if (!node) {
      throw new Error(
        'Chua ket noi duoc Lavalink. Hay khoi dong Lavalink truoc, roi thu lai lenh nay.'
      );
    }

    const voiceChannel = interaction.member?.voice?.channel;

    if (!voiceChannel) {
      throw new Error('Ban can vao voice channel truoc khi dung lenh nay.');
    }

    const me = interaction.guild.members.me ?? (await interaction.guild.members.fetchMe());
    const permissions = voiceChannel.permissionsFor(me);

    if (
      !permissions?.has(PermissionFlagsBits.ViewChannel) ||
      !permissions?.has(PermissionFlagsBits.Connect) ||
      !permissions?.has(PermissionFlagsBits.Speak)
    ) {
      throw new Error('Bot can quyen `View Channel`, `Connect` va `Speak` trong voice channel.');
    }

    if (
      voiceChannel.userLimit > 0 &&
      voiceChannel.members.size >= voiceChannel.userLimit &&
      !permissions.has(PermissionFlagsBits.MoveMembers)
    ) {
      throw new Error(
        'Voice channel hien dang day. Hay tang user limit hoac cap them quyen `Move Members` cho bot.'
      );
    }

    const current = this.get(interaction.guildId);

    if (current) {
      if (!current.isInChannel(voiceChannel.id)) {
        if (current.isBusy()) {
          throw new Error('Bot dang hoat dong o mot voice channel khac trong server nay.');
        }

        await current.destroy();
      } else {
        current.setTextChannel(interaction.channel);
        return current;
      }
    }

    const subscription = await MusicSubscription.create({
      lavalink: this.lavalink,
      guildId: interaction.guildId,
      shardId: interaction.guild.shardId ?? 0,
      voiceChannel,
      textChannel: interaction.channel,
      disconnectTimeoutMs: this.disconnectTimeoutMs,
      onDestroy: (guildId) => {
        this.subscriptions.delete(guildId);
      }
    });

    this.subscriptions.set(interaction.guildId, subscription);

    if (voiceChannel.type === ChannelType.GuildStageVoice) {
      setTimeout(async () => {
        if (!me.voice.suppress) {
          return;
        }

        try {
          await me.voice.setSuppressed(false);
        } catch {
          await me.voice.setRequestToSpeak(true).catch(() => {});
        }
      }, 2_000);
    }

    return subscription;
  }

  destroyAll() {
    for (const subscription of this.subscriptions.values()) {
      void subscription.destroy();
    }

    this.subscriptions.clear();
  }
}

module.exports = {
  PlayerManager
};
