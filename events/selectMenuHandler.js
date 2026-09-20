const Art = require("../database/Art");
const { MessageFlags } = require("discord.js");
const gallery = require("../services/galleryV2");

const {
    createArtEmbed,
    createGalleryButtons
} = require("../utils/embedBuilder");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return false;

    if (interaction.customId !== "art_category") return false;

    const category = interaction.values[0];

    const arts = await Art.find({
        category
    }).sort({ createdAt: -1 });

    if (!arts.length) {

        await interaction.reply({
            content: "❌" + " No artwork found in this category.",
            flags: MessageFlags.Ephemeral
        });

        return true;

    }

    gallery.open(interaction.message.id, {
        type: "arts",
        items: arts,
        categories: true
    });

    const { embed, files } = createArtEmbed(
        arts[0],
        0,
        arts.length
    );

    await interaction.update({

        embeds: [embed],

        files,

        components: [
            createGalleryButtons()
        ]

    });

    return true;

};