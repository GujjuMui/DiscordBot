const {
    MessageFlags,
    PermissionsBitField
} = require("discord.js");

const dangerousPermissions = [
    PermissionsBitField.Flags.Administrator,
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageWebhooks,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.ModerateMembers,
    PermissionsBitField.Flags.MentionEveryone
];

module.exports = async (interaction) => {

    if (!interaction.isButton()) return false;

    const id = interaction.customId;

    if (
        !id.startsWith("giverole_confirm:") &&
        id !== "giverole_cancel"
    ) {
        return false;
    }

    // =========================
    // OWNER ONLY
    // =========================

    if (interaction.user.id !== "1466871611893219455") {

        await interaction.reply({

            content:
                "❌ Only the bot owner can use these buttons.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const hasDangerousPermission =
    dangerousPermissions.some(permission =>
        targetRole.permissions.has(permission)
    );

if (hasDangerousPermission) {

    await interaction.update({

        content:
            "❌ **Assignment blocked.**\n\n" +
            `The role ${targetRole} contains dangerous permissions, ` +
            "so HORNET will not assign it.",

        components: []

    });

    return true;

}

    // =========================
    // CANCEL
    // =========================

    if (id === "giverole_cancel") {

        await interaction.update({

            content:
                "❌ **Role assignment cancelled.**",

            components: []

        });

        return true;

    }

    // =========================
    // CONFIRM
    // =========================

    const [, sourceRoleId, targetRoleId] =
        id.split(":");

    const sourceRole =
        interaction.guild.roles.cache.get(
            sourceRoleId
        );

    const targetRole =
        interaction.guild.roles.cache.get(
            targetRoleId
        );

    if (!sourceRole || !targetRole) {

        await interaction.update({

            content:
                "❌ One of the roles no longer exists.",

            components: []

        });

        return true;

    }

    // =========================
    // ROLE HIERARCHY
    // =========================

    const botMember =
        interaction.guild.members.me;

    if (!botMember) {

        await interaction.update({

            content:
                "❌ I couldn't find my server member information.",

            components: []

        });

        return true;

    }

    if (
        targetRole.position >=
        botMember.roles.highest.position
    ) {

        await interaction.update({

            content:
                "❌ I cannot assign the target role because it is equal to or higher than my highest role.",

            components: []

        });

        return true;

    }

    // =========================
    // ACKNOWLEDGE BUTTON
    // =========================

    await interaction.update({

        content:
            "⏳ **Assigning role...**\n\n" +
            `Source: ${sourceRole}\n` +
            `Target: ${targetRole}`,

        components: []

    });

    // =========================
    // USE CACHED MEMBERS
    // =========================

    const members =
        interaction.guild.members.cache.filter(
            member =>
                member.roles.cache.has(
                    sourceRole.id
                )
        );

    let assigned = 0;
    let alreadyHad = 0;
    let failed = 0;

    // =========================
    // ASSIGN ROLE
    // =========================

    for (const member of members.values()) {

        if (
            member.roles.cache.has(
                targetRole.id
            )
        ) {

            alreadyHad++;

            continue;

        }

        try {

            await member.roles.add(

                targetRole,

                "HORNET /giverole command"

            );

            assigned++;

        } catch (error) {

            failed++;

            console.error(
                `Failed to give role to ${member.user.tag}:`,
                error
            );

        }

    }

    // =========================
    // RESULT
    // =========================

    await interaction.editReply({

        content:
            `✅ **Role Assignment Complete**\n\n` +

            `**Source Role:** ${sourceRole}\n` +

            `**Target Role:** ${targetRole}\n\n` +

            `👥 **Members with source role:** ${members.size}\n` +

            `✅ **Assigned:** ${assigned}\n` +

            `ℹ️ **Already had role:** ${alreadyHad}\n` +

            `❌ **Failed:** ${failed}`,

        components: []

    });

    return true;

};