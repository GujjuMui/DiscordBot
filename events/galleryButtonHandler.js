const gallery = require("../services/galleryV2");

const Art = require("../database/Art");
const Link = require("../database/Link");

const {
    createArtEmbed,
    createLinkEmbed,
    createGalleryButtons
} = require("../utils/embedBuilder");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return false;

    const id = interaction.customId;

    if (
        id !== "gallery_next" &&
        id !== "gallery_prev" &&
        id !== "gallery_favorite" &&
        id !== "gallery_back"
    ) return false;

    const current = gallery.get(interaction.user.id);

    if (!current) return false;

    await interaction.deferUpdate();

    if (id === "gallery_next") {
        gallery.next(interaction.user.id);
    }

    if (id === "gallery_prev") {
        gallery.previous(interaction.user.id);
    }

    const g = gallery.get(interaction.user.id);
    const item = g.items[g.index];

   if (id === "gallery_back") {

    if (g.type === "arts") {

        const arts = await Art.find().sort({ createdAt: -1 });

        const categories = [...new Set(
            arts
                .map(a => a.category)
                .filter(Boolean)
        )].sort();

        const {
            createArtCategoryMenu
        } = require("../utils/embedBuilder");

        await interaction.editReply({

            embeds: [{
                color: 0x8e44ad,
                title: "🎨 Browse SFA Artwork",
                description: "Select a category from the dropdown below."
            }],

            components: [
                createArtCategoryMenu(categories)
            ],

            files: []

        });

        return true;

    }

    if (g.type === "links") {

        const links = await Link.find().sort({ createdAt: -1 });

        const categories = [...new Set(
            links
                .map(link => link.category)
                .filter(Boolean)
        )].sort();

        const {
            createLinkCategoryMenu
        } = require("../utils/embedBuilder");

        console.log("Categories:", categories);
        console.log("Category count:", categories.length);

        await interaction.editReply({

            embeds: [{
                color: 0x00b894,
                title: "📚 Browse Links",
                description: "Select a category from the dropdown below."
            }],

            components: [
                createLinkCategoryMenu(categories)
            ],

            files: []

        });

        return true;

    }

}


    if (id === "gallery_favorite") {

    if (g.type === "cards") {

        const Card = require("../database/Card");

        await Card.findByIdAndUpdate(
            item._id,
            { $inc: { favorites: 1 } }
        );

    } else {

        const Art = require("../database/Art");

        await Art.findByIdAndUpdate(
            item._id,
            { $inc: { favorites: 1 } }
        );

    }

    item.favorites++;

}

    
    if (g.type === "cards") {

    const { embed, files } =
        require("../utils/embedBuilder").createCardEmbed(
            item,
            g.index,
            g.items.length
        );

    await interaction.editReply({

        embeds: [embed],

        files,

        components: [
            require("../utils/embedBuilder").createCardGalleryButtons()
        ]

    });

} else if (g.type === "links") {

    const { embed, files } =
        require("../utils/embedBuilder").createLinkEmbed(
            item,
            g.index,
            g.items.length
        );

    await interaction.editReply({

        embeds: [embed],

        files,

        components: [
            createGalleryButtons()
        ]

    });

} else if (g.type === "arts") {

    const { embed, files } =
        require("../utils/embedBuilder").createArtEmbed(
            item,
            g.index,
            g.items.length
        );

    await interaction.editReply({

        embeds: [embed],

        files,

        components: [
            createGalleryButtons()
        ]

    });

}

return true;

};