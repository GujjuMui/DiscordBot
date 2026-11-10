const gallery = require("../services/galleryV2");
const galleryService = require("../services/galleryService");

const CardRepository = require("../repositories/CardRepository");
const ArtRepository = require("../repositories/ArtRepository");

const {
    createArtEmbed,
    createCardEmbed,
    createLinkEmbed,
    createGalleryButtons
} = require("../utils/embedBuilder");

// The expired-gallery message. This was referenced as a bare
// `EXPIRED` identifier before and would have thrown a ReferenceError
// the first time a gallery had expired — same wording as the
// category-menu handler already used.
const EXPIRED = "This gallery has expired — run /cards or /arts again.";

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

    // The gallery state is gone (bot restarted, or the entry expired):
    // answer ephemerally instead of returning silently — the user
    // otherwise gets "This interaction failed" with no explanation.
    if (!current) {
        await interaction.reply({
            content: `❌ ${EXPIRED}`,
            flags: require("discord.js").MessageFlags.Ephemeral
        }).catch(() => {});
        return true;
    }

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

    if (!g) {
        await interaction.editReply({
            content: `❌ ${EXPIRED}`
        }).catch(() => {});
        return true;
    }

    // ==========================================
    // BACK TO CATEGORY MENU
    // ==========================================

    if (id === "gallery_back") {

        // Close the gallery entry — user is returning to the category menu.
        gallery.close(messageId);

        // The category menu (categories, menu state, embed) is owned
        // by the gallery service now — no more re-querying the full
        // collection here.
        return galleryService.openCategoryMenu(interaction, g.type);

    }

    // ==========================================
    // CURRENT ITEM
    // ==========================================

    const item = g.items[g.index];

    if (!item) {
        await interaction.editReply({
            content: `❌ ${EXPIRED}`
        }).catch(() => {});
        return true;
    }

    // ==========================================
    // FAVORITE
    // ==========================================

    if (id === "gallery_favorite") {

        if (g.type === "cards") {

            await CardRepository.incrementFavorites(item._id);

        } else if (g.type === "arts") {

            await ArtRepository.incrementFavorites(item._id);

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

module.exports.customIdPrefixes = ["gallery_next", "gallery_prev", "gallery_favorite", "gallery_back"];
