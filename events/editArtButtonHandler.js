const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return false;

    if (
    ![
        "edit_art_name",
        "edit_art_category",
        "edit_art_tags",
        "edit_art_image",
        "edit_card_name",
        "edit_card_character",
        "edit_card_tags",
        "edit_card_image"
    ].includes(interaction.customId)
) return false;

    if (interaction.customId === "edit_art_category") {

    const modal = new ModalBuilder()
        .setCustomId("edit_art_category_modal")
        .setTitle("Edit Artwork Category");

    const input = new TextInputBuilder()
        .setCustomId("new_category")
        .setLabel("New Category")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);

    return true;

}
    
    if (interaction.customId === "edit_art_tags") {

    const modal = new ModalBuilder()
        .setCustomId("edit_art_tags_modal")
        .setTitle("Edit Artwork Tags");

    const input = new TextInputBuilder()
        .setCustomId("new_tags")
        .setLabel("Tags (comma separated)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);

    return true;

}

    if (interaction.customId === "edit_art_image") {

    const modal = new ModalBuilder()
        .setCustomId("edit_art_image_modal")
        .setTitle("Edit Artwork Image");

    const input = new TextInputBuilder()
        .setCustomId("new_image")
        .setLabel("New Image URL")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);

    return true;

}

    const modal = new ModalBuilder()
        .setCustomId("edit_art_name_modal")
        .setTitle("Edit Artwork Name");

    const input = new TextInputBuilder()
        .setCustomId("new_name")
        .setLabel("New Artwork Name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);

    return true;

};