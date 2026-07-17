const {
    SlashCommandBuilder
} = require("discord.js");

const Card = require("../../database/Card");

const gallery = require("../../services/galleryV2");

const {
    createCardEmbed,
    createCardGalleryButtons
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

        gallery.open(interaction.user.id, {
            type: "cards",
            items: cards
        });

        const { embed, files } = createCardEmbed(
    cards[0],
    0,
    cards.length
);

await interaction.editReply({

    embeds: [embed],

    files,

    components: [
        createCardGalleryButtons()
    ]

});

    }

};