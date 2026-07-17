const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const Trusted = require("../../database/Trusted");

const owner = require("../../config/owner");

const logger = require("../../utils/logger");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("trust")

        .setDescription("Trust a user or role")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to trust")
                .setRequired(false)
        )

        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Role to trust")
                .setRequired(false)
        ),

    async execute(interaction) {

        if (interaction.user.id !== owner.ownerId) {

            return interaction.reply({

                content: "❌ Only the bot owner can use this command.",

                flags: MessageFlags.Ephemeral

            });

        }

        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");

        if (!user && !role) {

            return interaction.reply({

                content: "❌ Select either a user or a role.",

                flags: MessageFlags.Ephemeral

            });

        }

        if (user && role) {

            return interaction.reply({

                content: "❌ Choose only one: user OR role.",

                flags: MessageFlags.Ephemeral

            });

        }

        const targetId = user ? user.id : role.id;
        const type = user ? "user" : "role";

        const exists = await Trusted.findOne({
            targetId,
            type
        });

        if (exists) {

            return interaction.reply({

                content: "⚠️ Already trusted.",

                flags: MessageFlags.Ephemeral

            });

        }

        await Trusted.create({

            targetId,
            type

        });

        await interaction.reply({

            content: `✅ ${user ? user.tag : role.name} is now trusted.`,

            flags: MessageFlags.Ephemeral

        });
        
        await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "TRUST_ADD",

    user: interaction.user,

    title: user ? user.tag : role.name

});
    }

};