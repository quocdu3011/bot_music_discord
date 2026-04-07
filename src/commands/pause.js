const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, getActiveSubscription, replyOrEdit } = require('./utils');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Tam dung bai dang phat'),
  async execute(interaction) {
    const subscription = getActiveSubscription(interaction);

    if (!subscription) {
      await replyOrEdit(interaction, {
        embeds: [createEmbed('Bot chua tham gia voice channel nao trong server nay.', 0xed4245)]
      });
      return;
    }

    const paused = await subscription.pause();

    await replyOrEdit(interaction, {
      embeds: [createEmbed(paused ? 'Da tam dung phat nhac.' : 'Khong the tam dung luc nay.', paused ? 0x2f3136 : 0xed4245)]
    });
  }
};
