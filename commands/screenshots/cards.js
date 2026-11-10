const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const CardRepository = require("../../repositories/CardRepository");
const { getCategories } = require("../../services/categoryCache");
const settings = require("../../config/settings");

const {
    createCategoryMenu
} = require("../../utils/embedBuilder");

const categoryMenu = require("../../services/categoryMenuService");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("cards")
        .setDescription("Browse all SFA cards"),

    async execute(interaction) {

        await interaction.deferReply();

        // Categories come from a shared 5-minute distinct() cache
        // instead of an unbounded find() mapped in memory.
        const categories = await getCategories(CardRepository, "Card");

        if (categories.length === 0) {

            return interaction.editReply({
                content: `${"❌"} No cards found.`
            });

        }

        const embed = new EmbedBuilder()
            .setColor(0x00b894)
            .setTitle(`${"🎴"} Browse SFA Cards`)
            .setDescription("Select a category from the dropdown below.");

        await interaction.editReply({

    embeds: [embed],

    components: createCategoryMenu(
        "cards",
        categories,
        0
    )

});

const reply = await interaction.fetchReply();

categoryMenu.open(reply.id, {

    type: "cards",

    categories

});

    }

};