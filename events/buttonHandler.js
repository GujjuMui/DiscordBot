const Art = require("../database/Art");
const Card = require("../database/Card");

const gallery = require("../services/galleryService");

const {
    createCardEmbed,
    createArtEmbed,
    createGalleryButtons
} = require("../utils/embedBuilder");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;

    const id = interaction.customId;

    if (
        id !== "gallery_next" &&
        id !== "gallery_prev" &&
        id !== "gallery_favorite"
    ) return;

    await interaction.deferUpdate();

    const state = gallery.get(interaction.user.id);

    if (!state) return false;

    if (id === "gallery_next") {

        gallery.next(interaction.user.id);

    }

    if (id === "gallery_prev") {

        gallery.previous(interaction.user.id);

    }

    const current = gallery.get(interaction.user.id);
    
    console.log("Gallery Type:", current.type);

    const item = current.items[current.index];

    if (id === "gallery_favorite") {

    if (current.type === "cards") {

        await Card.findByIdAndUpdate(
            item._id,
            { $inc: { favorites: 1 } }
        );

    } else {

        await Art.findByIdAndUpdate(
            item._id,
            { $inc: { favorites: 1 } }
        );

    }

    item.favorites++;

}

    const embed = current.type === "cards"
    ? createCardEmbed(
        item,
        current.index,
        current.items.length
    )
    : createArtEmbed(
        item,
        current.index,
        current.items.length
    );

await interaction.editReply({

    embeds: [embed],

    components: [
        createGalleryButtons()
    ]

});

};