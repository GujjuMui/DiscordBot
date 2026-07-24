const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Card = require("../../database/Card");
const settings = require("../../config/settings");

const {
    createCardCategoryMenu
} = require("../../utils/embedBuilder");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("cards")
        .setDescription("Browse all SFA cards"),

    async execute(interaction) {

        await interaction.deferReply();

        const cards = await Card.find().sort({ createdAt: -1 });

        if (cards.length === 0) {
            return interaction.editReply({
                content: `${settings.emojis.cross} No cards found.`
            });
        }

        const categories = [
            ...new Set(
                cards.map(card => card.category || "General")
            )
        ];

        await interaction.editReply({

            embeds: [
                new EmbedBuilder()
                    .setColor(0x00b894)
                    .setTitle(`${settings.emojis.allover.cards} Browse SFA Cards`)
                    .setDescription("Select a category from the dropdown below.")
            ],

            components: [
                createCardCategoryMenu(categories)
            ]

        });

    }

};