const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Link = require("../../database/Link");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("links")
        .setDescription("View all saved links"),

    async execute(interaction) {

    await interaction.deferReply();

    const links = await Link.find().sort({ createdAt: -1 });

    if (!links.length) {

        return interaction.editReply({
            content: "❌ No links have been added yet."
        });

    }

    const categories = [

        ...new Set(

            links

                .map(link => link.category)

                .filter(Boolean)

        )

    ].sort();

    const { createLinkCategoryMenu } =
        require("../../utils/embedBuilder");

    await interaction.editReply({

        embeds: [

            new EmbedBuilder()

                .setColor("#00b894")

                .setTitle("📚 Browse Links")

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