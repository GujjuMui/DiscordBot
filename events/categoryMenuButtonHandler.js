const categoryMenu = require("../services/categoryMenuService");

const {
    createCategoryMenu
} = require("../utils/embedBuilder");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return false;

    const id = interaction.customId;

    if (
        id !== "cards_category_next" &&
        id !== "cards_category_prev" &&
        id !== "arts_category_next" &&
        id !== "arts_category_prev"
    ) return false;

    const menu = categoryMenu.get(interaction.message.id);

    if (!menu) {
        await interaction.reply({
            content: "❌ This gallery has expired — run /cards or /arts again.",
            flags: require("discord.js").MessageFlags.Ephemeral
        }).catch(() => {});
        return true;
    }

    await interaction.deferUpdate();

    if (id.endsWith("_next")) {

        categoryMenu.next(interaction.message.id);

    } else {

        categoryMenu.previous(interaction.message.id);

    }

    const updated = categoryMenu.get(interaction.message.id);

    if (!updated) {
        await interaction.editReply({
            content: "❌ This gallery has expired — run /cards or /arts again."
        }).catch(() => {});
        return true;
    }

    await interaction.editReply({

        components: createCategoryMenu(

            updated.type,

            updated.categories,

            updated.page

        )

    });

    return true;

};

module.exports.customIdPrefixes = ["cards_category_next", "cards_category_prev", "arts_category_next", "arts_category_prev"];
