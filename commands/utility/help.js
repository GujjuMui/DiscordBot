const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("View HORNET's command guide"),

    async execute(interaction) {

        const embed = new EmbedBuilder()

            .setColor("#f1c40f")

            .setTitle("<a:Rules:1528079131844018297>  HORNET Help")

            .setDescription(
                "Welcome to **HORNET**.\n\n" +
                "Select a category below to view available commands."
            )

            .addFields({
                name: "Categories",
                value:
                    "🌍 Public\n" +
                    "⭐ Trusted\n" +
                    "🛡️ Moderator\n" +
                    "👑 Owner\n" +
                    "ℹ️ About"
            })

            .setFooter({
                text: "HORNET • Shadow Fight Arena Management"
            })

            .setTimestamp();

        const menu = new StringSelectMenuBuilder()

            .setCustomId("help_menu")

            .setPlaceholder("Select a category...")

            .addOptions(

                {
                    label: "Public Commands",
                    value: "public",
                    emoji: "🌍"
                },

                {
                    label: "Trusted Commands",
                    value: "trusted",
                    emoji: "⭐"
                },

                {
                    label: "Moderator Commands",
                    value: "moderator",
                    emoji: "🛡️"
                },

                {
                    label: "Owner Commands",
                    value: "owner",
                    emoji: "👑"
                },

                {
                    label: "About HORNET",
                    value: "about",
                    emoji: "ℹ️"
                }

            );

        const row = new ActionRowBuilder()
            .addComponents(menu);

        await interaction.reply({

            embeds: [embed],

            components: [row]

        });

    }

};