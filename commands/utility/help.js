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
                    "<a:Discord:1528303361781137501> Public\n" +
                    "<a:sprinkle_gbn:1528808995807035482> Trusted\n" +
                    "<a:shields:1528808564200570880> Moderator\n" +
                    "<a:dream_crowns:1528808039870628091> Owner\n" +
                    "<a:info:1528638936082157589> About"
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
                    emoji: "<a:Discord:1528303361781137501>"
                },

                {
                    label: "Trusted Commands",
                    value: "trusted",
                    emoji: "<a:sprinkle_gbn:1528808995807035482>"
                },

                {
                    label: "Moderator Commands",
                    value: "moderator",
                    emoji: "<a:shields:1528808564200570880>"
                },

                {
                    label: "Owner Commands",
                    value: "owner",
                    emoji: "<a:dream_crowns:1528808039870628091>"
                },

                {
                    label: "About HORNET",
                    value: "about",
                    emoji: "<a:info:1528638936082157589>"
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