const ArtRepository = require("../repositories/ArtRepository");
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
    // The image modal (edit_art_image_modal, opened by the "Edit Image"
    // button) was previously unhandled — submitting it did nothing.
    ["edit_art_image_modal", {
        inputId: "new_image",
        field: "imageFile",
        logField: "Image",
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

    if (action.field === "imageFile") {
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            await interaction.editReply({
                content: "❌ Please provide a valid image URL starting with `http://` or `https://`.",
            });
            return true;
        }
    }

    if (action.field === "tags") {
        value = value
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean);
    }

    let showcaseUpdated = true;
    try {
        await ArtRepository.update(artId, {
            [action.field]: value
        });

        showcaseUpdated = await updateArtMessage(artId, interaction.client, interaction.guild);
    } catch (err) {
        console.error("[editArtModalHandler] Failed to update artwork:", err);
        await interaction.editReply({
            content: "❌ Something went wrong while updating the artwork.",
        });
        return true;
    }

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
            : action.field === "imageFile"
                ? "✅ Image updated successfully."
                : "✅ Tags updated successfully.";

    await interaction.editReply({
        content: showcaseUpdated
            ? response
            : `${response}\n\n⚠️ Saved, but the showcase message could not be updated.`,
    });

    return true;
};

module.exports.customIdPrefixes = ["edit_art_tags_modal", "edit_art_category_modal", "edit_art_name_modal", "edit_art_image_modal"];
