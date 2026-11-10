const {
    SlashCommandBuilder
} = require("discord.js");

const ArtRepository = require("../../repositories/ArtRepository");
const { getCategories } = require("../../services/categoryCache");
const settings = require("../../config/settings");

const {
    createCategoryMenu
} = require("../../utils/embedBuilder");

const categoryMenu = require("../../services/categoryMenuService");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("arts")
        .setDescription("Browse all SFA artwork"),

    async execute(interaction) {

        await interaction.deferReply();

        const categories = await getCategories(ArtRepository, "Art");

        if (categories.length === 0) {

            return interaction.editReply({
                content: "❌" + " No artwork found."
            });

        }

        const embed = {
            color: 0x8e44ad,
            title: `${"🎨"} Browse SFA Artwork`,
            description: "Select a category from the dropdown below."
        };

        await interaction.editReply({

    embeds: [embed],

    components: createCategoryMenu(
        "arts",
        categories,
        0
    )

});

const reply = await interaction.fetchReply();

categoryMenu.open(reply.id, {

    type: "arts",

    categories

});

    }

};