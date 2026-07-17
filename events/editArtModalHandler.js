const Art = require("../database/Art");

const updateArtMessage = require("../utils/updateArtMessage");

const logger = require("../utils/logger");

module.exports = async (interaction) => {

    if (!interaction.isModalSubmit()) return false;

    if (
    interaction.customId !== "edit_art_name_modal" &&
    interaction.customId !== "edit_art_category_modal" &&
    interaction.customId !== "edit_art_tags_modal"
) return false;

    await interaction.deferReply({
    flags: MessageFlags.Ephemeral
});


    if (interaction.customId === "edit_art_tags_modal") {

    const newTags = interaction.fields
        .getTextInputValue("new_tags")
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);

    const embed = interaction.message.embeds[0];

    const artIdField = embed.fields.find(
        field => field.name.includes("Art ID")
    );

    const artId = artIdField.value;

    await Art.findOneAndUpdate(
        { artId },
        { tags: newTags }
    );

    await updateArtMessage(
    artId,
    interaction.client
);

   await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "ART_EDIT",

    user: interaction.user,

    id: artId,

    field: "Tags",

    newValue: newTags.join(", ")

});

    await interaction.editReply({
        content: "✅ Tags updated successfully.",
        flags: MessageFlags.Ephemeral
    });

    return true;

}

    if (interaction.customId === "edit_art_category_modal") {

    const newCategory =
        interaction.fields.getTextInputValue("new_category");

    const embed = interaction.message.embeds[0];

    const artIdField = embed.fields.find(
        field => field.name.includes("Art ID")
    );

    const artId = artIdField.value;

    await Art.findOneAndUpdate(
        { artId },
        { category: newCategory }
    );

    await updateArtMessage(
    artId,
    interaction.client
);

    await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "ART_EDIT",

    user: interaction.user,

    id: artId,

    field: "Category",

    newValue: newCategory

});

    await interaction.editReply({
        content: `✅ Category updated to **${newCategory}**`,
        flags: MessageFlags.Ephemeral
    });

    return true;

        }

    const newName = interaction.fields.getTextInputValue("new_name");

    // Get the Art ID from the embed
    const embed = interaction.message.embeds[0];

    const artIdField = embed.fields.find(
        field => field.name.includes("Art ID")
    );

    const artId = artIdField.value;

    await Art.findOneAndUpdate(
        { artId },
        { artName: newName }
    );

    await updateArtMessage(
    artId,
    interaction.client
);

    await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "ART_EDIT",

    user: interaction.user,

    id: artId,

    title: newName,

    field: "Name",

    newValue: newName

});

    await interaction.editReply({
        content: `✅ Artwork name updated to **${newName}**`,
        flags: MessageFlags.Ephemeral
    });

    return true;

};