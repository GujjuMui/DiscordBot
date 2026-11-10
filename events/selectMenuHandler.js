const { MessageFlags } = require("discord.js");
const gallery = require("../services/galleryV2");
const galleryService = require("../services/galleryService");

const {
    createGalleryButtons
} = require("../utils/embedBuilder");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return false;

    if (interaction.customId !== "art_category") return false;

    const category = interaction.values[0];

    // Unlike gallerySelectHandler this one answers with
    // interaction.update(), not deferUpdate + editReply, so it uses
    // the service's build step (query + embed) and answers itself.
    const built = await galleryService.buildCategoryGallery("arts", category);

    if (!built) {

        await interaction.reply({
            content: "❌" + " No artwork found in this category.",
            flags: MessageFlags.Ephemeral
        });

        return true;

    }

    gallery.open(interaction.message.id, {
        type: "arts",
        items: built.items,
        categories: true
    });

    await interaction.update({

        embeds: [built.embed],

        files: built.files,

        components: [
            createGalleryButtons()
        ]

    });

    return true;

};

module.exports.customIdPrefixes = ["art_category"];
