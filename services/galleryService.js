// Gallery domain service — owns the whole category -> gallery flow that
// used to be triplicated across gallerySelectHandler, selectMenuHandler
// and linkSelectHandler (each with its own find({category}) +
// gallery.open() + embed build), plus the galleryButtonHandler Back
// branch that re-derived the category menu. The state/cache layer
// underneath (galleryV2, categoryMenuService, categoryCache) is kept
// as-is; this module orchestrates it, it does not duplicate it.
//
// Reply mechanics stay with the callers because they differ per
// handler: gallerySelect/linkSelect deferUpdate then editReply,
// selectMenuHandler (art_category) answers with interaction.update().
// So this service exposes:
//   - getCategories(type) / listCategoryItems(type, category)
//   - buildCategoryGallery(type, category) — items + embed payload, or
//     null when the category is empty (caller decides how to answer)
//   - openCategoryGallery(interaction, type, category) — the common
//     deferUpdate-then-editReply path (gallerySelect + linkSelect)
//   - openCategoryMenu(interaction, type) — the gallery_back path
// Types are "cards", "arts" and "links" throughout.
const gallery = require("./galleryV2");
const categoryMenu = require("./categoryMenuService");
const { getCategories: getCachedCategories } = require("./categoryCache");
const CardRepository = require("../repositories/CardRepository");
const ArtRepository = require("../repositories/ArtRepository");
const LinkRepository = require("../repositories/LinkRepository");
const {
    createArtEmbed,
    createCardEmbed,
    createLinkEmbed,
    createGalleryButtons,
    createCategoryMenu,
    createLinkCategoryMenu
} = require("../utils/embedBuilder");
const { COLORS } = require("../config/constants");

const TYPES = {
    cards: {
        repository: CardRepository,
        modelName: "Card",
        emptyMessage: "❌ No cards found.",
        title: "🎴 Browse SFA Cards",
        color: COLORS.CARD,
        createEmbed: createCardEmbed
    },
    arts: {
        repository: ArtRepository,
        modelName: "Art",
        emptyMessage: "❌ No artwork found.",
        title: "🎨 Browse SFA Artwork",
        color: COLORS.ART,
        createEmbed: createArtEmbed
    },
    links: {
        repository: LinkRepository,
        modelName: "Link",
        emptyMessage: "❌ No links found.",
        title: "📚 Browse Links",
        color: COLORS.LINK,
        createEmbed: createLinkEmbed
    }
};

function configFor(type) {
    const config = TYPES[type];
    if (!config) throw new Error(`Unknown gallery type: ${type}`);
    return config;
}

async function getCategories(type) {
    const config = configFor(type);
    return getCachedCategories(config.repository, config.modelName);
}

// Lean items for one category, capped at 200 (the repository's
// listByCategory already selects only the fields the embeds need).
async function listCategoryItems(type, category) {
    return configFor(type).repository.listByCategory(category, { limit: 200 });
}

// Items + render payload for a category, or null when it is empty.
// Does NOT open gallery state — the caller decides how to answer
// (editReply vs update) and opens the gallery itself if it wants to.
async function buildCategoryGallery(type, category) {
    const config = configFor(type);
    const items = await listCategoryItems(type, category);
    if (!items.length) return null;
    const { embed, files } = config.createEmbed(items[0], 0, items.length);
    return {
        items,
        embed,
        files,
        components: [createGalleryButtons()]
    };
}

// Common path for gallerySelectHandler + linkSelectHandler: the caller
// has already done deferUpdate(). Opens the gallery, answers with the
// first item, or reports the empty category.
async function openCategoryGallery(interaction, type, category) {
    const config = configFor(type);
    const built = await buildCategoryGallery(type, category);
    if (!built) {
        await interaction.editReply({ content: config.emptyMessage });
        return true;
    }
    gallery.open(interaction.message.id, {
        type,
        items: built.items,
        categories: true
    });
    await interaction.editReply({
        embeds: [built.embed],
        files: built.files,
        components: built.components
    });
    return true;
}

// gallery_back path. The caller has already closed the gallery entry
// and deferred the update. Cards/arts reopen the category menu state;
// links never did (their menu is stateless), so they only re-render it.
async function openCategoryMenu(interaction, type) {
    const config = TYPES[type];
    if (!config) return true;
    const categories = await getCategories(type);
    const messageId = interaction.message.id;

    if (type === "links") {
        await interaction.editReply({
            embeds: [{
                color: config.color,
                title: config.title,
                description: "Select a category from the dropdown below."
            }],
            components: [createLinkCategoryMenu(categories)],
            files: []
        });
        return true;
    }

    categoryMenu.open(messageId, { type, categories });
    await interaction.editReply({
        embeds: [{
            color: config.color,
            title: config.title,
            description: "Select a category from the dropdown below."
        }],
        components: createCategoryMenu(type, categories, 0),
        files: []
    });
    return true;
}

module.exports = {
    getCategories,
    listCategoryItems,
    buildCategoryGallery,
    openCategoryGallery,
    openCategoryMenu
};
