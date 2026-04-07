const {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel
} = require('@discordjs/voice');
const { escapeMarkdown } = require('discord.js');
const play = require('play-dl');

class MusicSubscription {
  constructor({
    guildId,
    voiceChannel,
    textChannel,
    disconnectTimeoutMs,
    connection,
    onDestroy
  }) {
    this.guildId = guildId;
    this.voiceChannelId = voiceChannel.id;
    this.textChannel = textChannel;
    this.disconnectTimeoutMs = disconnectTimeoutMs;
    this.connection = connection;
    this.onDestroy = onDestroy;
    this.queue = [];
    this.currentTrack = null;
    this.destroyed = false;
    this.leaveTimer = null;

    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });

    this.connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.currentTrack = null;
      void this.playNext();
    });

    this.player.on('error', (error) => {
      console.error(`[music:${this.guildId}] playback error`, error);
      void this.safeSend('Không thể phát bài hiện tại, bot sẽ chuyển sang bài tiếp theo.');
      this.currentTrack = null;

      if (this.player.state.status !== AudioPlayerStatus.Idle) {
        this.player.stop(true);
      }
    });

    this.connection.on('error', (error) => {
      console.error(`[music:${this.guildId}] voice connection error`, error);
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000)
        ]);
      } catch {
        this.destroy();
      }
    });
  }

  static async create(options) {
    const connection = joinVoiceChannel({
      channelId: options.voiceChannel.id,
      guildId: options.guildId,
      adapterCreator: options.voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    return new MusicSubscription({
      ...options,
      connection
    });
  }

  setTextChannel(textChannel) {
    this.textChannel = textChannel;
  }

  isInChannel(channelId) {
    return this.voiceChannelId === channelId;
  }

  enqueue(tracks) {
    const startedNow =
      !this.currentTrack &&
      this.queue.length === 0 &&
      this.player.state.status === AudioPlayerStatus.Idle;

    this.cancelLeaveTimer();
    this.queue.push(...tracks);

    if (startedNow) {
      void this.playNext();
    }

    return {
      startedNow
    };
  }

  getQueueSnapshot() {
    return {
      currentTrack: this.currentTrack,
      upcoming: [...this.queue]
    };
  }

  skip() {
    this.cancelLeaveTimer();

    if (this.currentTrack) {
      this.player.stop(true);
      return true;
    }

    if (this.queue.length > 0) {
      void this.playNext();
      return true;
    }

    return false;
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  stopAndClearQueue() {
    this.queue = [];
    this.currentTrack = null;
    this.player.stop(true);
    this.scheduleLeave();
  }

  async playNext() {
    if (this.destroyed) {
      return;
    }

    this.cancelLeaveTimer();

    if (this.queue.length === 0) {
      this.scheduleLeave();
      return;
    }

    const track = this.queue.shift();
    this.currentTrack = track;

    try {
      const info = await play.video_info(track.url);
      const source = await play.stream_from_info(info);
      const resource = createAudioResource(source.stream, {
        inputType: source.type,
        metadata: track
      });

      this.player.play(resource);
      await this.safeSend(
        `Dang phat: **${escapeMarkdown(track.title)}** (${track.durationRaw})\nNguoi yeu cau: ${track.requestedBy}`
      );
    } catch (error) {
      console.error(`[music:${this.guildId}] unable to start track`, error);
      await this.safeSend(
        `Khong the phat bai **${escapeMarkdown(track.title)}**. Bot se thu bai tiep theo.`
      );
      this.currentTrack = null;
      await this.playNext();
    }
  }

  scheduleLeave() {
    this.cancelLeaveTimer();

    this.leaveTimer = setTimeout(() => {
      void this.safeSend('Hang doi da trong. Bot se roi khoi voice channel.');
      this.destroy();
    }, this.disconnectTimeoutMs);
  }

  cancelLeaveTimer() {
    if (!this.leaveTimer) {
      return;
    }

    clearTimeout(this.leaveTimer);
    this.leaveTimer = null;
  }

  async safeSend(content) {
    if (!this.textChannel || !this.textChannel.isTextBased()) {
      return;
    }

    try {
      await this.textChannel.send(content);
    } catch (error) {
      console.error(`[music:${this.guildId}] unable to send text message`, error);
    }
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.cancelLeaveTimer();
    this.queue = [];
    this.currentTrack = null;
    this.player.stop(true);
    this.connection.destroy();

    if (this.onDestroy) {
      this.onDestroy(this.guildId);
    }
  }
}

module.exports = {
  MusicSubscription
};
