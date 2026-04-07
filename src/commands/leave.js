const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, getActiveSubscription, replyOrEdit } = require('./utils');

module.exports = {
  data: new SlashCommandBuilder().setName('leave').setDescription('Cho bot roi khoi voice channel'),
  async execute(interaction) {
    const subscription = getActiveSubscription(interaction);

    if (!subscription) {
      await replyOrEdit(interaction, {
        embeds: [createEmbed('Bot chua tham gia voice channel nao trong server nay.', 0xed4245)]
      });
      return;
    }

    await subscription.destroy();

    await replyOrEdit(interaction, {
      embeds: [createEmbed('Bot da roi voice channel.')]
    });
  }
};
