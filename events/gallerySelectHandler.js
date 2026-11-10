const galleryService = require("../services/galleryService");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return false;

    if (
    interaction.customId !== "arts_category" &&
    interaction.customId !== "cards_category"
) return false;

    // =========================
    // ART CATEGORY
    // =========================

    if (interaction.customId === "arts_category") {

        await interaction.deferUpdate();

        const category = interaction.values[0];

        await galleryService.openCategoryGallery(interaction, "arts", category);

        return true;

    }

    // =========================
    // CARD CATEGORY
    // =========================

    if (interaction.customId === "cards_category") {

        await interaction.deferUpdate();

        const category = interaction.values[0];

        await galleryService.openCategoryGallery(interaction, "cards", category);

        return true;

    }

};

module.exports.customIdPrefixes = ["arts_category", "cards_category"];
