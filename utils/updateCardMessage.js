const { createCardEmbed } = require("./embedBuilder")

const Card = require("../database/Card");

const settings = require("../config/settings");

module.exports = async (cardId, client) => {

    const card = await Card.findOne({ cardId });

    if (!card) return;

    const guild = client.guilds.cache.first();

    if (!guild) return;

    const channel = guild.channels.cache.find(
        c => c.name === settings.channels.cards
    );

    if (!channel) return;

    const message = await channel.messages.fetch(
        card.discordMessageId
    );

    if (!message) return;

    const { embed, files } = createCardEmbed(
    card,
    0,
    1
);

await message.edit({

    embeds: [embed],

    files

});

};