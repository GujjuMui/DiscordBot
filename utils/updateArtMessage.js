const ArtRepository = require("../repositories/ArtRepository");
const settings = require("../config/settings");

const { createArtEmbed } = require("./embedBuilder");

// Re-syncs an artwork's showcase message after an edit. Returns true
// when the message was updated, false when it could not be — see
// utils/updateCardMessage.js for the contract.
module.exports = async (artId, client, guild = null) => {

    const art = await ArtRepository.findByCode(artId);

    if (!art) return false;

    const resolvedGuild = guild || client?.guilds?.cache?.first();
    if (!resolvedGuild) {
        console.warn("[updateArtMessage] No guild available to update art showcase message.");
        return false;
    }

    const channel = resolvedGuild.channels.cache.find(
        c => c.name === settings.channels.arts
    );

    if (!channel) return false;

    // A deleted showcase message must not throw.
    const message = await channel.messages.fetch(art.discordMessageId).catch(() => null);

    if (!message) {
        console.warn(`[updateArtMessage] Showcase message ${art.discordMessageId} for ${artId} could not be fetched (deleted?).`);
        return false;
    }

    const { embed, files } = createArtEmbed(
        art,
        0,
        1
    );

    try {
        await message.edit({
            embeds: [embed],
            files
        });
    } catch (err) {
        console.error(`[updateArtMessage] Failed to edit showcase message for ${artId}:`, err.message);
        return false;
    }

    return true;

};
