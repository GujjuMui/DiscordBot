const Art = require("../database/Art");

const gallery = require("../services/galleryService");

const {
    createArtEmbed,
    createGalleryButtons
} = require("../utils/embedBuilder");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId !== "art_category") return;

    const category = interaction.values[0];

    const arts = await Art.find({
        category: category
    }).sort({ createdAt: -1 });

    if (!arts.length) {

        return interaction.reply({
            content: "❌ No artwork found in this category.",
            flags: MessageFlags.Ephemeral
        });

    }

    gallery.open(
        interaction.user.id,
        "arts",
        arts
    );

    await interaction.update({

        embeds: [
            createArtEmbed(
                arts[0],
                0,
                arts.length
            )
        ],

        components: [
            createGalleryButtons()
        ]

    });

};