const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Card = require("../../database/Card");
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

        const cards = await Card.find().sort({ createdAt: -1 });

        if (cards.length === 0) {

            return interaction.editReply({
                content: `${"❌"} No cards found.`
            });

        }

        const categories = [
            ...new Set(
                cards
                    .map(card => card.category || "General")
                    .filter(Boolean)
            )
        ].sort();

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