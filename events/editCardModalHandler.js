const CardRepository = require("../repositories/CardRepository");
const updateCardMessage = require("../utils/updateCardMessage");
const logger = require("../utils/logger");
const { MessageFlags } = require("discord.js");

// Same table-driven shape as editArtModalHandler. The image modal
// (edit_card_image_modal, opened by the "Edit Image" button) was
// previously unhandled — submitting it did nothing. It now stores
// the new image URL, like the /editcard command treats remote URLs.
const MODAL_ACTIONS = new Map([
    ["edit_card_tags_modal", {
        inputId: "new_tags",
        field: "tags",
        logField: "Tags",
        format: tags => tags.join(", "),
        response: () => "✅ Tags updated successfully."
    }],
    ["edit_card_category_modal", {
        inputId: "new_category",
        field: "category",
        logField: "Category",
        format: value => value,
        response: value => `✅ Category updated to **${value}**`
    }],
    ["edit_card_character_modal", {
        inputId: "new_character",
        field: "character",
        logField: "Character",
        format: value => value,
        response: value => `✅ Character updated to **${value}**`
    }],
    ["edit_card_name_modal", {
        inputId: "new_name",
        field: "cardName",
        logField: "Name",
        format: value => value,
        response: value => `✅ Card name updated to **${value}**`
    }],
    ["edit_card_image_modal", {
        inputId: "new_image",
        field: "imageFile",
        logField: "Image",
        format: value => value,
        response: () => "✅ Image updated successfully."
    }]
]);

module.exports = async (interaction) => {

    if (!interaction.isModalSubmit()) return false;

    const action = MODAL_ACTIONS.get(interaction.customId);
    if (!action) return false;

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    try {
        // Optional-chaining throughout: the original message (and its
        // embed) may be gone by the time the modal is submitted.
        const embed = interaction.message?.embeds?.[0];
        const cardIdField = embed?.fields?.find(
            field => field?.name?.includes("Card ID")
        );

        const cardId = cardIdField?.value;
        if (!cardId) {
            await interaction.editReply({
                content: "❌ Card ID not found."
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

        if (action.field === "imageFile") {
            if (!value.startsWith("http://") && !value.startsWith("https://")) {
                await interaction.editReply({
                    content: "❌ Please provide a valid image URL starting with `http://` or `https://`."
                });
                return true;
            }
        }

        const updated = await CardRepository.update(cardId, {
            [action.field]: value
        });

        if (!updated) {
            await interaction.editReply({
                content: "❌ Card not found."
            });
            return true;
        }

        // A deleted showcase message must not make the caller report
        // failure after the DB commit — report it as a partial success.
        const showcaseUpdated = await updateCardMessage(cardId, interaction.client, interaction.guild);

        await logger({
            guild: interaction.guild,
            client: interaction.client,
            type: "CARD_EDIT",
            user: interaction.user,
            id: cardId,
            ...(action.field === "cardName" ? { title: value } : {}),
            field: action.logField,
            newValue: action.format(value)
        });

        await interaction.editReply({
            content: showcaseUpdated
                ? action.response(value)
                : `${action.response(value)}\n\n⚠️ Saved, but the showcase message could not be updated.`
        });

        return true;
    } catch (err) {
        console.error("========== EDIT CARD MODAL ERROR ==========");
        console.error(err);
        console.error("==========================================");
        try {
            await interaction.editReply({
                content: "❌ Something went wrong while updating the card."
            });
        } catch {}
        return true;
    }

};

module.exports.customIdPrefixes = ["edit_card_tags_modal", "edit_card_category_modal", "edit_card_character_modal", "edit_card_name_modal", "edit_card_image_modal"];
