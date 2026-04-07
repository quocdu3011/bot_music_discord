const { EmbedBuilder } = require('discord.js');

function createEmbed(description, color = 0x2f3136) {
  return new EmbedBuilder().setColor(color).setDescription(description);
}

async function replyOrEdit(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }

  return interaction.reply(payload);
}

function getActiveSubscription(interaction) {
  return interaction.client.playerManager.get(interaction.guildId);
}

module.exports = {
  createEmbed,
  getActiveSubscription,
  replyOrEdit
};
