const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const spamManager = require("../../services/spamManager");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("stopspam")

        .setDescription("Stops the current spam")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        if (interaction.user.id !== "1466871611893219455") {

            return interaction.reply({

                content: "❌ Owner only.",

                flags: MessageFlags.Ephemeral

            });

        }

        spamManager.stop();

        await interaction.reply({

            content: "🛑 Spam stopped.",

            flags: MessageFlags.Ephemeral

        });

    }

};