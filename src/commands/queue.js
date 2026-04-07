const { SlashCommandBuilder, escapeMarkdown } = require('discord.js');
const { createEmbed, getActiveSubscription, replyOrEdit } = require('./utils');

function formatTrackLine(track, index) {
  return `${index}. ${escapeMarkdown(track.title)} (${track.durationRaw}) - ${track.requestedBy}`;
}

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Xem hang doi hien tai'),
  async execute(interaction) {
    const subscription = getActiveSubscription(interaction);

    if (!subscription) {
      await replyOrEdit(interaction, {
        embeds: [createEmbed('Hang doi hien dang trong.', 0xed4245)]
      });
      return;
    }

    const snapshot = subscription.getQueueSnapshot();

    if (!snapshot.currentTrack && snapshot.upcoming.length === 0) {
      await replyOrEdit(interaction, {
        embeds: [createEmbed('Hang doi hien dang trong.', 0xed4245)]
      });
      return;
    }

    const lines = [];

    if (snapshot.currentTrack) {
      lines.push(
        `Dang phat: ${escapeMarkdown(snapshot.currentTrack.title)} (${snapshot.currentTrack.durationRaw}) - ${snapshot.currentTrack.requestedBy}`
      );
    }

    if (snapshot.upcoming.length > 0) {
      lines.push('');
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

    await replyOrEdit(interaction, {
      embeds: [createEmbed(lines.join('\n'))]
    });
  }
};
