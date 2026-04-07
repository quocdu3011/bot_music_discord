const { SlashCommandBuilder } = require('discord.js');
const { MAX_PLAYLIST_SIZE, autocompleteQuery, resolveTracks } = require('../music/resolver');
const { createEmbed, replyOrEdit } = require('./utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Tim va phat nhac tu YouTube')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Ten bai hat hoac link YouTube')
        .setAutocomplete(true)
        .setRequired(true)
    ),
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const choices = await autocompleteQuery(focused);
    await interaction.respond(choices);
  },
  async execute(interaction) {
    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    let subscription;

    try {
      subscription = await interaction.client.playerManager.ensure(interaction);
    } catch (error) {
      await replyOrEdit(interaction, {
        embeds: [createEmbed(error.message, 0xed4245)]
      });
      return;
    }

    try {
      const resolved = await resolveTracks(
        subscription.player.node,
        query,
        `<@${interaction.user.id}>`
      );
      const { startedNow } = subscription.enqueue(resolved.tracks);

      if (resolved.kind === 'playlist') {
        await replyOrEdit(interaction, {
          embeds: [
            createEmbed(
              [
                `Da them **${resolved.title}** vao hang doi.`,
                `So bai da them: **${resolved.tracks.length}**.`,
                resolved.truncated
                  ? `Bot chi them ${MAX_PLAYLIST_SIZE} bai dau tien cua playlist de tranh hang doi qua dai.`
                  : null,
                startedNow ? 'Bot dang bat dau phat bai dau tien.' : null
              ]
                .filter(Boolean)
                .join('\n')
            )
          ]
        });
        return;
      }

      const track = resolved.tracks[0];
      const embed = createEmbed(
        startedNow
          ? `Dang chuan bi phat **${track.title}** (${track.durationRaw}).`
          : `Da them vao hang doi: **${track.title}** (${track.durationRaw}).`
      );

      if (track.thumbnail) {
        embed.setThumbnail(track.thumbnail);
      }

      await replyOrEdit(interaction, {
        embeds: [embed]
      });
    } catch (error) {
      const snapshot = subscription.getQueueSnapshot();

      if (!snapshot.currentTrack && snapshot.upcoming.length === 0) {
        subscription.destroy();
      }

      await replyOrEdit(interaction, {
        embeds: [createEmbed(error.message ?? 'Khong the them bai hat vao hang doi.', 0xed4245)]
      });
    }
  }
};
