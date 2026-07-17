const Art = require("../database/Art");
const settings = require("../config/settings");

const { createArtEmbed } = require("./embedBuilder");

module.exports = async (artId, client) => {

    const art = await Art.findOne({ artId });

    if (!art) return;

    const guild = client.guilds.cache.first();

    if (!guild) return;

    const channel = guild.channels.cache.find(
        c => c.name === settings.channels.arts
    );

    if (!channel) return;

    const message = await channel.messages.fetch(
        art.discordMessageId
    );

    if (!message) return;

    const { embed, files } = createArtEmbed(
    art,
    0,
    1
);

    await message.edit({

    embeds: [embed],

    files

});
};