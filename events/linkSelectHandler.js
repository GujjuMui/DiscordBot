const Link = require("../database/Link");
const gallery = require("../services/galleryV2");
const settings = require("../config/settings");

const {
    createLinkEmbed,
    createGalleryButtons
} = require("../utils/embedBuilder");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return false;

    if (interaction.customId !== "link_category") return false;

    await interaction.deferUpdate();

    const category = interaction.values[0];

    const links = await Link.find({
        category
    }).sort({ createdAt: -1 });

    if (!links.length) {

        await interaction.editReply({
            content: settings.emojis.cross + " No links found."
        });

        return true;

    }

    gallery.open(interaction.user.id, {

        type: "links",

        items: links,

        categories: true

    });

    const { embed, components } =
        createLinkEmbed(
            links[0],
            0,
            links.length
        );

    await interaction.editReply({

        embeds: [embed],

        components: [
            createGalleryButtons()
        ]

    });

    return true;

};