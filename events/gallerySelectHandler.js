const Art = require("../database/Art");
const Card = require("../database/Card");
const settings = require("../config/settings");
const gallery = require("../services/galleryV2");

const {
    createArtEmbed,
    createCardEmbed,
    createGalleryButtons
} = require("../utils/embedBuilder");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return false;

    if (
        interaction.customId !== "art_category" &&
        interaction.customId !== "card_category"
    ) return false;

    // =========================
    // ART CATEGORY
    // =========================

    if (interaction.customId === "art_category") {

        await interaction.deferUpdate();

        const category = interaction.values[0];

        const arts = await Art.find({
            category
        }).sort({ createdAt: -1 });

        if (!arts.length) {

            await interaction.editReply({
                content: settings.emojis.cross + " No artwork found."
            });

            return true;
        }

        gallery.open(interaction.user.id, {
            type: "arts",
            items: arts,
            categories: true
        });

        const { embed, files } = createArtEmbed(
            arts[0],
            0,
            arts.length
        );

        await interaction.editReply({

            embeds: [embed],

            files,

            components: [
                createGalleryButtons()
            ]

        });

        return true;

    }

    // =========================
    // CARD CATEGORY
    // =========================

    if (interaction.customId === "card_category") {

        await interaction.deferUpdate();

        const category = interaction.values[0];

        const cards = await Card.find({
            category
        }).sort({ createdAt: -1 });

        if (!cards.length) {

            await interaction.editReply({
                content: settings.emojis.cross + " No cards found."
            });

            return true;
        }

        gallery.open(interaction.user.id, {
            type: "cards",
            items: cards,
            categories: true
        });

        const { embed, files } = createCardEmbed(
            cards[0],
            0,
            cards.length
        );

        await interaction.editReply({

            embeds: [embed],

            files,

            components: [
                createGalleryButtons()
            ]

        });

        return true;

    }

};