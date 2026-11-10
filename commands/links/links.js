const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const LinkRepository = require("../../repositories/LinkRepository");
const { getCategories } = require("../../services/categoryCache");
const settings = require("../../config/settings");
const { createLinkCategoryMenu } = require("../../utils/embedBuilder");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("links")
        .setDescription("View all saved links"),

    async execute(interaction) {

    await interaction.deferReply();

    const categories = await getCategories(LinkRepository, "Link");

    if (!categories.length) {

        return interaction.editReply({
            content: "❌" + " No links have been added yet."
        });

    }

    await interaction.editReply({

        embeds: [

            new EmbedBuilder()

                .setColor("#00b894")

                .setTitle(`${"📚"} Browse Links`)

                .setDescription(
                    "Select a category from the dropdown below."
                )

        ],

        components: [

            createLinkCategoryMenu(categories)

        ]

    });

    }

};