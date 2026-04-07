const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, getActiveSubscription, replyOrEdit } = require('./utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Dung phat nhac va xoa toan bo hang doi'),
  async execute(interaction) {
    const subscription = getActiveSubscription(interaction);

    if (!subscription) {
      await replyOrEdit(interaction, {
        embeds: [createEmbed('Bot chua tham gia voice channel nao trong server nay.', 0xed4245)]
      });
      return;
    }

    await subscription.stopAndClearQueue();

    await replyOrEdit(interaction, {
      embeds: [createEmbed('Da dung phat va xoa hang doi.')]
    });
  }
};
