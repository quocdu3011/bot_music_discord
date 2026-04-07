const { escapeMarkdown } = require('discord.js');

class MusicSubscription {
  constructor({
    lavalink,
    guildId,
    voiceChannel,
    textChannel,
    disconnectTimeoutMs,
    player,
    onDestroy
  }) {
    this.lavalink = lavalink;
    this.guildId = guildId;
    this.voiceChannelId = voiceChannel.id;
    this.textChannel = textChannel;
    this.disconnectTimeoutMs = disconnectTimeoutMs;
    this.player = player;
    this.onDestroy = onDestroy;
    this.queue = [];
    this.currentTrack = null;
    this.destroyed = false;
    this.leaveTimer = null;
    this.player.on('start', () => {
      void this.announceCurrentTrack();
    });
    this.player.on('end', (event) => {
      if (this.destroyed || event.reason === 'replaced') {
        return;
      }

      this.currentTrack = null;
      void this.playNext();
    });
    this.player.on('exception', (event) => {
      console.error(`[music:${this.guildId}] lavalink track exception`, event);
      void this.handleTrackFailure('Khong the phat bai hien tai, bot se thu bai tiep theo.');
    });
    this.player.on('stuck', (event) => {
      console.error(`[music:${this.guildId}] lavalink track stuck`, event);
      void this.handleTrackFailure('Bai hien tai bi tre qua lau, bot se thu bai tiep theo.');
    });
    this.player.on('closed', (event) => {
      console.warn(`[music:${this.guildId}] voice websocket dong: ${event.code} ${event.reason}`);
      if (!this.destroyed) {
        void this.destroy();
      }
    });
  }

  static async create(options) {
    const player = await options.lavalink.joinVoiceChannel({
      channelId: options.voiceChannel.id,
      guildId: options.guildId,
      shardId: options.shardId,
      deaf: true
    });

    return new MusicSubscription({
      ...options,
      player
    });
  }

  setTextChannel(textChannel) {
    this.textChannel = textChannel;
  }

  isInChannel(channelId) {
    return this.voiceChannelId === channelId;
  }

  isBusy() {
    return Boolean(this.currentTrack) || this.queue.length > 0;
  }

  enqueue(tracks) {
    const startedNow = !this.currentTrack && this.queue.length === 0;

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

  async skip() {
    this.cancelLeaveTimer();

    if (this.currentTrack) {
      await this.player.stopTrack();
      return true;
    }

    if (this.queue.length > 0) {
      void this.playNext();
      return true;
    }

    return false;
  }

  async pause() {
    if (!this.currentTrack || this.player.paused) {
      return false;
    }

    await this.player.setPaused(true);
    return true;
  }

  async resume() {
    if (!this.currentTrack || !this.player.paused) {
      return false;
    }

    await this.player.setPaused(false);
    return true;
  }

  async stopAndClearQueue() {
    this.queue = [];
    const hadTrack = Boolean(this.currentTrack);
    this.currentTrack = null;

    if (hadTrack) {
      await this.player.stopTrack().catch(() => {});
    }

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
      if (!track?.encoded || typeof track.encoded !== 'string') {
        throw new Error('Track khong co du lieu Lavalink hop le.');
      }

      await this.player.playTrack({
        track: {
          encoded: track.encoded
        }
      });
    } catch (error) {
      console.error(`[music:${this.guildId}] unable to start track`, error);
      await this.handleTrackFailure(
        `Khong the phat bai **${escapeMarkdown(track.title)}**. Bot se thu bai tiep theo.`
      );
    }
  }

  async announceCurrentTrack() {
    if (!this.currentTrack) {
      return;
    }

    await this.safeSend(
      `Dang phat: **${escapeMarkdown(this.currentTrack.title)}** (${this.currentTrack.durationRaw})\nNguoi yeu cau: ${this.currentTrack.requestedBy}`
    );
  }

  async handleTrackFailure(message) {
    if (this.destroyed) {
      return;
    }

    await this.safeSend(message);
    this.currentTrack = null;
    await this.playNext();
  }

  scheduleLeave() {
    this.cancelLeaveTimer();

    this.leaveTimer = setTimeout(() => {
      void this.safeSend('Hang doi da trong. Bot se roi khoi voice channel.');
      void this.destroy();
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

  async destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.cancelLeaveTimer();
    this.queue = [];
    this.currentTrack = null;

    if (this.onDestroy) {
      this.onDestroy(this.guildId);
    }

    await this.lavalink.leaveVoiceChannel(this.guildId).catch((error) => {
      console.error(`[music:${this.guildId}] unable to leave voice channel`, error);
    });
  }
}

module.exports = {
  MusicSubscription
};
