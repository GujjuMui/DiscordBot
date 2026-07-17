const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("about")

        .setDescription("About HORNET"),

    async execute(interaction) {

        const embed = new EmbedBuilder()

            .setColor("#f39c12")

            .setTitle("🤖 HORNET")

            .setDescription(
                "A Discord bot for managing Shadow Fight Arena content."
            )

            .addFields(

                {
                    name: "👨‍💻 Developer",
                    value: "gujju_mui",
                    inline: true
                },

                {
                    name: "📦 Version",
                    value: "1.2.0",
                    inline: true
                },

                {
                    name: "⚙ Framework",
                    value: "discord.js v14",
                    inline: true
                },

                {
                    name: "🗄 Database",
                    value: "MongoDB",
                    inline: true
                },

                {
                    name: "✨ Features",
                    value:
                        "• SFA Cards\n" +
                        "• SFA Artwork\n" +
                        "• Trust System\n" +
                        "• Logging\n" +
                        "• Setup Command\n" +
                        "• Tournament System (Coming Soon)"
                }

            )

            .setFooter({

                text: "HORNET"

            })

            .setTimestamp();

        await interaction.reply({

            embeds: [embed]

        });

    }

};