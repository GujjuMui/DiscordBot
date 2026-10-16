const {
    SlashCommandBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const owner = require("../../config/owner");
const dangerousPermissions = require("../../config/dangerousPermissions");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("giverole")

        .setDescription(
            "Give a role to everyone who has another role."
        )

        .addRoleOption(option =>
            option
                .setName("source")
                .setDescription(
                    "The role members must already have."
                )
                .setRequired(true)
        )

        .addRoleOption(option =>
            option
                .setName("target")
                .setDescription(
                    "The role to give them."
                )
                .setRequired(true)
        ),

    async execute(interaction) {

        // =========================
        // OWNER ONLY
        // =========================

        if (
            interaction.user.id !==
            owner.ownerId
        ) {

            return interaction.reply({

                content:
                    "❌ Only the bot owner can use this command.",

                flags: MessageFlags.Ephemeral

            });

        }

        // =========================
        // GUILD CHECK
        // =========================

        if (!interaction.guild) {

            return interaction.reply({

                content:
                    "❌ This command can only be used in a server.",

                flags: MessageFlags.Ephemeral

            });

        }

        const sourceRole =
            interaction.options.getRole("source");

        const targetRole =
            interaction.options.getRole("target");

        // =========================
        // ROLE VALIDATION
        // =========================

        if (sourceRole.id === targetRole.id) {

            return interaction.reply({

                content:
                    "❌ Source and target roles cannot be the same.",

                flags: MessageFlags.Ephemeral

            });

        }

        const hasDangerousPermission =
    dangerousPermissions.some(permission =>
        targetRole.permissions.has(permission)
    );

if (hasDangerousPermission) {

    return interaction.reply({

        content:
            "❌ I cannot assign this role because it contains dangerous permissions.",

        flags: MessageFlags.Ephemeral

    });

}

        if (
            targetRole.position >=
            interaction.guild.members.me.roles.highest.position
        ) {

            return interaction.reply({

                content:
                    "❌ I cannot assign the target role because it is equal to or higher than my highest role.",

                flags: MessageFlags.Ephemeral

            });

        }

        // =========================
        // FETCH MEMBERS
        // =========================

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        await interaction.guild.members.fetch();

        const members =
            interaction.guild.members.cache.filter(
                member =>
                    member.roles.cache.has(sourceRole.id)
            );

        if (!members.size) {

            return interaction.editReply({

                content:
                    `❌ No members currently have ${sourceRole}.`

            });

        }

        // =========================
        // CONFIRMATION
        // =========================

        const row = new ActionRowBuilder().addComponents(

            new ButtonBuilder()

                .setCustomId(
                    `giverole_confirm:${sourceRole.id}:${targetRole.id}`
                )

                .setLabel("Confirm")

                .setEmoji("✅")

                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()

                .setCustomId(
                    "giverole_cancel"
                )

                .setLabel("Cancel")

                .setEmoji("❌")

                .setStyle(ButtonStyle.Danger)

        );

        return interaction.editReply({

            content:
                `⚠️ **Confirm Role Assignment**\n\n` +

                `This will give ${targetRole} to **${members.size} members** ` +
                `who currently have ${sourceRole}.\n\n` +

                `**Source:** ${sourceRole}\n` +

                `**Target:** ${targetRole}\n\n` +

                `Are you sure?`,

            components: [row]

        });

    }

};