const {
    SlashCommandBuilder
} = require("discord.js");

const Card = require("../../database/Card");

const gallery = require("../../services/galleryV2");

const {
    createCardEmbed,
    createCardGalleryButtons,
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
                content: "❌ No cards found."
            });

        }

        const categories = [
    ...new Set(
        cards.map(card => card.category || "General")
    )
];

await interaction.editReply({

    content: "📂 Select a card category.",

    components: [
        createCardCategoryMenu(categories)
    ]

});

    }

};