const Card = require("../database/Card");

const updateCardMessage = require("../utils/updateCardMessage");

const logger = require("../utils/logger");

const { MessageFlags } = require("discord.js");

module.exports = async (interaction) => {

    if (!interaction.isModalSubmit()) return false;

    if (
    interaction.customId !== "edit_card_name_modal" &&
    interaction.customId !== "edit_card_character_modal" &&
    interaction.customId !== "edit_card_category_modal" &&
    interaction.customId !== "edit_card_tags_modal"
) return false;;

    await interaction.deferReply({
    flags: MessageFlags.Ephemeral
});

    if (interaction.customId === "edit_card_tags_modal") {

    const newTags = interaction.fields
        .getTextInputValue("new_tags")
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);

    const embed = interaction.message.embeds[0];

    const cardIdField = embed.fields.find(
        field => field.name.includes("Card ID")
    );

    const cardId = cardIdField.value;

    await Card.findOneAndUpdate(
        { cardId },
        { tags: newTags }
    );

    await updateCardMessage(
    cardId,
    interaction.client
);

   await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "CARD_EDIT",

    user: interaction.user,

    id: cardId,

    field: "Tags",

    newValue: newTags.join(", ")

});

    await interaction.editReply({
        content: "✅ Tags updated successfully.",
        flags: MessageFlags.Ephemeral
    });

    return true;

}

    if (interaction.customId === "edit_card_category_modal") {

    const newCategory =
        interaction.fields.getTextInputValue("new_category");

    const embed = interaction.message.embeds[0];

    const cardIdField = embed.fields.find(
        field => field.name.includes("Card ID")
    );

    const cardId = cardIdField.value;

    await Card.findOneAndUpdate(
        { cardId },
        { category: newCategory }
    );

    await updateCardMessage(
        cardId,
        interaction.client
    );

    await logger({

        guild: interaction.guild,

        client: interaction.client,

        type: "CARD_EDIT",

        user: interaction.user,

        id: cardId,

        field: "Category",

        newValue: newCategory

    });

    await interaction.editReply({
        content: `✅ Category updated to **${newCategory}**`,
        flags: MessageFlags.Ephemeral
    });

    return true;

}

    if (interaction.customId === "edit_card_character_modal") {

    const newCharacter =
        interaction.fields.getTextInputValue("new_character");

    const embed = interaction.message.embeds[0];

    const cardIdField = embed.fields.find(
        field => field.name.includes("Card ID")
    );

    const cardId = cardIdField.value;

    await Card.findOneAndUpdate(
        { cardId },
        { character: newCharacter }
    );

    await updateCardMessage(
    cardId,
    interaction.client
);

    await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "CARD_EDIT",

    user: interaction.user,

    id: cardId,

    field: "Character",

    newValue: newCharacter

});

    await interaction.editReply({
        content: `✅ Character updated to **${newCharacter}**`,
        flags: MessageFlags.Ephemeral
    });

    return true;

}

    const newName = interaction.fields.getTextInputValue("new_name");

    const embed = interaction.message.embeds[0];

    const cardIdField = embed.fields.find(
        field => field.name.includes("Card ID")
    );

    const cardId = cardIdField.value;

    await Card.findOneAndUpdate(
        { cardId },
        { cardName: newName }
    );

    await updateCardMessage(
    cardId,
    interaction.client
);

    await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "CARD_EDIT",

    user: interaction.user,

    id: cardId,

    title: newName,

    field: "Name",

    newValue: newName

});

    await interaction.editReply({
        content: `✅ Card name updated to **${newName}**`,
        flags: MessageFlags.Ephemeral
    });

    return true;

};