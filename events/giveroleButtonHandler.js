const {
    MessageFlags
} = require("discord.js");

const owner = require("../config/owner");
const dangerousPermissions = require("../config/dangerousPermissions");
const { chunkedEach, retryWithBackoff } = require("../utils/discord");

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

    if (interaction.user.id !== owner.ownerId) {

        await interaction.reply({

            content:
                "❌ Only the bot owner can use these buttons.",

            flags: MessageFlags.Ephemeral

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

    // =========================
    // ROLE EXISTENCE CHECK
    // =========================

    if (!sourceRole || !targetRole) {

        await interaction.update({

            content:
                "❌ One of the roles no longer exists.",

            components: []

        });

        return true;

    }

    // =========================
    // DANGEROUS PERMISSION CHECK
    // =========================

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
    // FETCH MEMBERS (not cache-only)
    // =========================
    // The cache only holds members the bot has seen since startup;
    // a fetch guarantees everyone with the source role is included.
    let members;
    try {
        const fetched = await interaction.guild.members.fetch();
        members = fetched.filter(member => member.roles.cache.has(sourceRole.id));
    } catch (err) {
        await interaction.editReply({
            content: "❌ I couldn't fetch the server members. Please try again.",
            components: []
        });
        return true;
    }

    let assigned = 0;
    let alreadyHad = 0;
    let failed = 0;

    // =========================
    // ASSIGN ROLE (chunks of 10, with backoff on rate limits)
    // =========================

    const targets = Array.from(members.values());
    const { failures } = await chunkedEach(targets, 10, async member => {
        if (member.roles.cache.has(targetRole.id)) {
            alreadyHad++;
            return;
        }
        // retryWithBackoff honours Discord's retry_after on 429s.
        await retryWithBackoff(() => member.roles.add(targetRole, "HORNET /giverole command"));
        assigned++;
    });

    for (const { item, error } of failures) {
        failed++;
        console.error(`Failed to give role to ${item.user?.tag ?? item.id}:`, error?.message ?? error);
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

module.exports.customIdPrefixes = ["giverole_confirm:", "giverole_cancel"];
