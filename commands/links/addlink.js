const {
    SlashCommandBuilder,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const Link = require("../../database/Link");
const settings = require("../../config/settings");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("addlink")
        .setDescription("Save a useful SFA link")

        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("Link title")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("url")
                .setDescription("Website URL")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("category")
                .setDescription("Category")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const title = interaction.options.getString("title");
        const url = interaction.options.getString("url");
        const category = interaction.options.getString("category");

        const link = new Link({

            title,
            url,
            category,

            addedBy: interaction.user.username,
            addedById: interaction.user.id

        });

        await link.save();

        const logger = require("../../utils/logger");

        await logger({

        guild: interaction.guild,
        client: interaction.client,

        type: "LINK_CREATE",

        user: interaction.user,

        title: title

});

        console.log("Looking for:", settings.channels.links);
        console.log(
            interaction.guild.channels.cache.map(c => `${c.type} | ${c.name}`)
        );

        const contentChannel = interaction.guild.channels.cache.find(
            c => c.name === settings.channels.links
        );

        if (contentChannel) {

            const contentEmbed = new EmbedBuilder()

                .setColor("#00b894")
                .setTitle(`🔗 ${title}`)

                .addFields(

                    {
                        name: "📂 Category",
                        value: category,
                        inline: true
                    },

                    {
                        name: "❤️ Favorites",
                        value: "0",
                        inline: true
                    },

                    {
                        name: "👤 Added By",
                        value: interaction.user.toString(),
                        inline: true
                    },

                    {
                        name: "🌐 Link",
                        value: url
                    }

                )

                .setTimestamp();

            const message = await contentChannel.send({
                embeds: [contentEmbed]
            });

            link.discordMessageId = message.id;
            await link.save();

        }

        const embed = new EmbedBuilder()

            .setColor("#00b894")
            .setTitle("🔗 Link Saved")

            .addFields(

                {
                    name: "Title",
                    value: title
                },

                {
                    name: "Category",
                    value: category,
                    inline: true
                },

                {
                    name: "Added By",
                    value: interaction.user.toString(),
                    inline: true
                },

                {
                    name: "URL",
                    value: url
                }

            )

            .setTimestamp();

        await interaction.editReply({
            embeds: [embed]
        });

    }

};