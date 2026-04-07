const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, getActiveSubscription, replyOrEdit } = require('./utils');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Tiep tuc bai dang tam dung'),
  async execute(interaction) {
    const subscription = getActiveSubscription(interaction);

    if (!subscription) {
      await replyOrEdit(interaction, {
        embeds: [createEmbed('Bot chua tham gia voice channel nao trong server nay.', 0xed4245)]
      });
      return;
    }

    const resumed = await subscription.resume();

    await replyOrEdit(interaction, {
      embeds: [
        createEmbed(
          resumed ? 'Da tiep tuc phat nhac.' : 'Khong co bai dang tam dung.',
          resumed ? 0x2f3136 : 0xed4245
        )
      ]
    });
  }
};
