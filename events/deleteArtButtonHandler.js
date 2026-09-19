const Art = require("../database/Art");
const { MessageFlags } = require("discord.js");
const settings = require("../config/settings");

module.exports = async interaction => {
    if (!interaction.isButton()) return false;

    const { customId } = interaction;
    if (customId !== "delete_confirm" && customId !== "delete_cancel") {
        return false;
    }

    if (customId === "delete_cancel") {
        await interaction.update({
            content: "❌ Deletion cancelled.",
            embeds: [],
            components: [],
        });
        return true;
    }

    const match = interaction.message.content.match(/ART-?\d+/);
    if (!match) {
        await interaction.reply({
            content: "❌ Couldn't find Art ID.",
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    const artId = match[0];
    const art = await Art.findOne({ artId });

    if (!art) {
        await interaction.reply({
            content: "❌ Artwork not found.",
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    const channel = interaction.guild.channels.cache.find(
        channel => channel.name === settings.channels.arts
    );

    if (channel && art.discordMessageId) {
        try {
            const message = await channel.messages.fetch(art.discordMessageId);
            await message.delete();
        } catch {
            console.log("Couldn't delete artwork message.");
        }
    }

    await Art.deleteOne({ artId });

    await interaction.update({
        content: `✅ ${art.artName} deleted successfully.`,
        embeds: [],
        components: [],
    });

    return true;
};
