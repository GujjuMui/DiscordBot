const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const spamManager = require("../../services/spamManager");
const owner = require("../../config/owner");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("stopspam")

        .setDescription("Stops the current spam")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        if (
            interaction.user.id !==
            owner.ownerId
        ) {

            return interaction.reply({

                content:
                    "❌ Owner only.",

                flags:
                    MessageFlags.Ephemeral

            });

        }

        spamManager.stop();

        await interaction.reply({

            content:
                "🛑 Spam stopped.",

            flags:
                MessageFlags.Ephemeral

        });

    }

};