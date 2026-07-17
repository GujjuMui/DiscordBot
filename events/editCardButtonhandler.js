const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return false;

    if (
    interaction.customId !== "edit_card_name" &&
    interaction.customId !== "edit_card_character" &&
    interaction.customId !== "edit_card_tags" &&
    interaction.customId !== "edit_card_image"
) return false;

    if (interaction.customId === "edit_card_character") {

    const modal = new ModalBuilder()
        .setCustomId("edit_card_character_modal")
        .setTitle("Edit Character");

    const input = new TextInputBuilder()
        .setCustomId("new_character")
        .setLabel("New Character")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);

    return true;

}

    if (interaction.customId === "edit_card_tags") {

    const modal = new ModalBuilder()
        .setCustomId("edit_card_tags_modal")
        .setTitle("Edit Card Tags");

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

    if (interaction.customId === "edit_card_image") {

    const modal = new ModalBuilder()
        .setCustomId("edit_card_image_modal")
        .setTitle("Edit Card Image");

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
        .setCustomId("edit_card_name_modal")
        .setTitle("Edit Card Name");

    const input = new TextInputBuilder()
        .setCustomId("new_name")
        .setLabel("New Card Name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);

    return true;

};