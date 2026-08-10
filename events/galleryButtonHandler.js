const gallery = require("../services/galleryV2");

const Art = require("../database/Art");
const Card = require("../database/Card");
const Link = require("../database/Link");

const settings = require("../config/settings");

const {
    createArtEmbed,
    createCardEmbed,
    createLinkEmbed,
    createGalleryButtons,
    createCategoryMenu,
    createLinkCategoryMenu
} = require("../utils/embedBuilder");

const categoryMenu = require("../services/categoryMenuService");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return false;

    const id = interaction.customId;

    // Only handle gallery buttons here
    if (
        id !== "gallery_next" &&
        id !== "gallery_prev" &&
        id !== "gallery_favorite" &&
        id !== "gallery_back"
    ) {
        return false;
    }

    const messageId = interaction.message.id;

    const current = gallery.get(messageId);

    if (!current) return false;

    await interaction.deferUpdate();

    // ==========================================
    // NEXT
    // ==========================================

    if (id === "gallery_next") {

        gallery.next(messageId);

    }

    // ==========================================
    // PREVIOUS
    // ==========================================

    if (id === "gallery_prev") {

        gallery.previous(messageId);

    }

    // Get updated gallery state
    const g = gallery.get(messageId);

    if (!g) return true;

    // ==========================================
    // BACK TO CATEGORY MENU
    // ==========================================

    if (id === "gallery_back") {

        // --------------------------------------
        // ARTS
        // --------------------------------------

        if (g.type === "arts") {

            const arts = await Art
                .find()
                .sort({ createdAt: -1 });

            const categories = [
                ...new Set(
                    arts
                        .map(art => art.category)
                        .filter(Boolean)
                )
            ].sort();

            categoryMenu.open(messageId, {

                type: "arts",

                categories

            });

            await interaction.editReply({

                embeds: [{
                    color: 0x8e44ad,
                    title:
                        `${"🎨"} Browse SFA Artwork`,
                    description:
                        "Select a category from the dropdown below."
                }],

                components: createCategoryMenu(
                    "arts",
                    categories,
                    0
                ),

                files: []

            });

            return true;

        }

        // --------------------------------------
        // CARDS
        // --------------------------------------

        if (g.type === "cards") {

            const cards = await Card
                .find()
                .sort({ createdAt: -1 });

            const categories = [
                ...new Set(
                    cards
                        .map(card => card.category || "General")
                        .filter(Boolean)
                )
            ].sort();

            categoryMenu.open(messageId, {

                type: "cards",

                categories

            });

            await interaction.editReply({

                embeds: [{
                    color: 0xff9900,
                    title:
                        `${"🎴"} Browse SFA Cards`,
                    description:
                        "Select a category from the dropdown below."
                }],

                components: createCategoryMenu(
                    "cards",
                    categories,
                    0
                ),

                files: []

            });

            return true;

        }

        // --------------------------------------
        // LINKS
        // --------------------------------------

        if (g.type === "links") {

            const links = await Link
                .find()
                .sort({ createdAt: -1 });

            const categories = [
                ...new Set(
                    links
                        .map(link => link.category)
                        .filter(Boolean)
                )
            ].sort();

            console.log("Categories:", categories);
            console.log("Category count:", categories.length);

            await interaction.editReply({

                embeds: [{
                    color: 0x00b894,
                    title:
                        `${"📚"} Browse Links`,
                    description:
                        "Select a category from the dropdown below."
                }],

                components: [
                    createLinkCategoryMenu(categories)
                ],

                files: []

            });

            return true;

        }

        return true;

    }

    // ==========================================
    // CURRENT ITEM
    // ==========================================

    const item = g.items[g.index];

    if (!item) return true;

    // ==========================================
    // FAVORITE
    // ==========================================

    if (id === "gallery_favorite") {

        if (g.type === "cards") {

            await Card.findByIdAndUpdate(

                item._id,

                {
                    $inc: {
                        favorites: 1
                    }
                }

            );

        } else if (g.type === "arts") {

            await Art.findByIdAndUpdate(

                item._id,

                {
                    $inc: {
                        favorites: 1
                    }
                }

            );

        }

        item.favorites++;

    }

    // ==========================================
    // CARDS GALLERY
    // ==========================================

    if (g.type === "cards") {

        const {
            embed,
            files
        } = createCardEmbed(

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

        return true;

    }

    // ==========================================
    // ARTS GALLERY
    // ==========================================

    if (g.type === "arts") {

        const {
            embed,
            files
        } = createArtEmbed(

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

        return true;

    }

    // ==========================================
    // LINKS GALLERY
    // ==========================================

    if (g.type === "links") {

        const {
            embed,
            files
        } = createLinkEmbed(

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

        return true;

    }

    return true;

};