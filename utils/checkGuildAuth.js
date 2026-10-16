const { MessageFlags } = require("discord.js");
const config = require("../config/config");

module.exports = async (interaction) => {
    // 1. Check ALLOWED_GUILD_IDS restriction
    if (interaction.guildId && config.allowedGuildIds.length > 0) {
        if (!config.allowedGuildIds.includes(interaction.guildId)) {
            const msg = "❌ This server is not authorized to use this bot.";
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: msg, components: [] }).catch(() => {});
            } else {
                await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            return false;
        }
    }
    return true;
};
