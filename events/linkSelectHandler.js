const galleryService = require("../services/galleryService");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return false;

    if (interaction.customId !== "link_category") return false;

    await interaction.deferUpdate();

    const category = interaction.values[0];

    await galleryService.openCategoryGallery(interaction, "links", category);

    return true;

};

module.exports.customIdPrefixes = ["link_category"];
