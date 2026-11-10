const { createCardEmbed } = require("./embedBuilder")

const CardRepository = require("../repositories/CardRepository");

const settings = require("../config/settings");

// Re-syncs a card's showcase message after an edit. Returns true
// when the message was updated, false when it could not be (card
// missing, guild/channel/message gone, or the edit failed) — the
// caller reports "saved, but the showcase message could not be
// updated" instead of reporting failure after the DB commit.
// guild may be passed in (preferred); otherwise the bot's first
// cached guild is used as a last resort, with a warning.
module.exports = async (cardId, client, guild = null) => {

    const card = await CardRepository.findByCode(cardId);

    if (!card) return false;

    const resolvedGuild = guild || client?.guilds?.cache?.first();
    if (!resolvedGuild) {
        console.warn("[updateCardMessage] No guild available to update card showcase message.");
        return false;
    }

    const channel = resolvedGuild.channels.cache.find(
        c => c.name === settings.channels.cards
    );

    if (!channel) return false;

    // A deleted showcase message must not throw.
    const message = await channel.messages.fetch(card.discordMessageId).catch(() => null);

    if (!message) {
        console.warn(`[updateCardMessage] Showcase message ${card.discordMessageId} for ${cardId} could not be fetched (deleted?).`);
        return false;
    }

    const { embed, files } = createCardEmbed(
        card,
        0,
        1
    );

    try {
        await message.edit({
            embeds: [embed],
            files
        });
    } catch (err) {
        console.error(`[updateCardMessage] Failed to edit showcase message for ${cardId}:`, err.message);
        return false;
    }

    return true;

};
