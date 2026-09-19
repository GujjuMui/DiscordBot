const Art = require("../database/Art");
const updateArtMessage = require("../utils/updateArtMessage");
const logger = require("../utils/logger");
const { MessageFlags } = require("discord.js");

const MODAL_ACTIONS = new Map([
    ["edit_art_tags_modal", {
        inputId: "new_tags",
        field: "tags",
        logField: "Tags",
        format: tags => tags.join(", "),
    }],
    ["edit_art_category_modal", {
        inputId: "new_category",
        field: "category",
        logField: "Category",
        format: value => value,
    }],
    ["edit_art_name_modal", {
        inputId: "new_name",
        field: "artName",
        logField: "Name",
        format: value => value,
    }],
]);

module.exports = async interaction => {
    if (!interaction.isModalSubmit()) return false;

    const action = MODAL_ACTIONS.get(interaction.customId);
    if (!action) return false;

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

    const embed = interaction.message?.embeds?.[0];
    const artIdField = embed?.fields?.find(field =>
        field.name.includes("Art ID")
    );

    const artId = artIdField?.value;
    if (!artId) {
        await interaction.editReply({
            content: "❌ Artwork ID not found.",
        });
        return true;
    }

    let value = interaction.fields.getTextInputValue(action.inputId);

    if (action.field === "tags") {
        value = value
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean);
    }

    await Art.findOneAndUpdate(
        { artId },
        { [action.field]: value }
    );

    await updateArtMessage(artId, interaction.client);

    await logger({
        guild: interaction.guild,
        client: interaction.client,
        type: "ART_EDIT",
        user: interaction.user,
        id: artId,
        field: action.logField,
        ...(action.field === "artName" ? { title: value } : {}),
        newValue: action.format(value),
    });

    const response = action.field === "artName"
        ? `✅ Artwork name updated to **${value}**`
        : action.field === "category"
            ? `✅ Category updated to **${value}**`
            : "✅ Tags updated successfully.";

    await interaction.editReply({
        content: response,
    });

    return true;
};
