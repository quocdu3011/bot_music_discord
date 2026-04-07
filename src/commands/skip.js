const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, getActiveSubscription, replyOrEdit } = require('./utils');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Bo qua bai dang phat'),
  async execute(interaction) {
    const subscription = getActiveSubscription(interaction);

    if (!subscription) {
      await replyOrEdit(interaction, {
        embeds: [createEmbed('Bot chua tham gia voice channel nao trong server nay.', 0xed4245)]
      });
      return;
    }

    const skipped = await subscription.skip();

    await replyOrEdit(interaction, {
      embeds: [createEmbed(skipped ? 'Da bo qua bai hien tai.' : 'Khong co bai nao de bo qua.')]
    });
  }
};
