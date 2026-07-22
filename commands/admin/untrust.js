const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const Trusted = require("../../database/Trusted");

const owner = require("../../config/owner");

const logger = require("../../utils/logger");

const settings = require("../../config/settings");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("untrust")

        .setDescription("Remove trusted access")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Trusted user")
                .setRequired(false)
        )

        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Trusted role")
                .setRequired(false)
        ),

    async execute(interaction) {

        if (interaction.user.id !== owner.ownerId) {

            return interaction.reply({

                content: settings.emojis.cross + " Only the bot owner can use this command.",

                flags: MessageFlags.Ephemeral

            });

        }

        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");

        if (!user && !role) {

            return interaction.reply({

                content: settings.emojis.cross + " Select either a user or a role.",

                flags: MessageFlags.Ephemeral

            });

        }

        if (user && role) {

            return interaction.reply({

                content: settings.emojis.cross + " Choose only one: user OR role.",

                flags: MessageFlags.Ephemeral

            });

        }

        const targetId = user ? user.id : role.id;
        const type = user ? "user" : "role";

        const result = await Trusted.deleteOne({

            targetId,
            type

        });

        if (result.deletedCount === 0) {

            return interaction.reply({

                content: settings.emojis.cross + " Not found in trusted list.",

                flags: MessageFlags.Ephemeral

            });

        }

        await interaction.reply({

            content: `${settings.emojis.check} ${user ? user.tag : role.name} removed from trusted list.`,

            flags: MessageFlags.Ephemeral

        });

        await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "TRUST_REMOVE",

    user: interaction.user,

    title: user ? user.tag : role.name

});

    }

};