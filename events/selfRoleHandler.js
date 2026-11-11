const { MessageFlags } = require("discord.js");
const logger = require("../utils/logger");
const { getSelfRoleGroupIds } = require("../services/guildSetup");

// Role groups are resolved per interaction (stored IDs first,
// BotSettings fills the gaps) — never read once at module load,
// or a restart would serve stale IDs after roles are recreated.
function roleGroupsFromIds(ids) {
    return {
        selfroles_color: {
            roles: Object.values(ids.color || {}).filter(Boolean),
            logType: "SELFROLE_COLOR",
            fieldName: "Role",
            label: "color role"
        },
        selfroles_faction: {
            roles: Object.values(ids.faction || {}).filter(Boolean),
            logType: "SELFROLE_FACTION",
            fieldName: "Faction",
            label: "faction"
        }
    };
}

async function updateExclusiveRoles(interaction, config) {
    const selectedRole = interaction.values?.[0];
    if (!selectedRole) throw new Error("No role selected.");
    // The role must still exist in this guild.
    if (!interaction.guild?.roles?.cache?.has(selectedRole)) {
        throw new Error("That role no longer exists.");
    }
    const member = interaction.member;

    const rolesToRemove = config.roles.filter(roleId =>
        roleId !== selectedRole && member.roles.cache.has(roleId)
    );

    if (rolesToRemove.length) {
        await member.roles.remove(rolesToRemove);
    }

    if (member.roles.cache.has(selectedRole)) return;

    await member.roles.add(selectedRole);

    await logger({
        guild: interaction.guild,
        type: config.logType,
        user: interaction.user,
        fields: [{
            name: config.fieldName,
            value: `<@&${selectedRole}>`
        }]
    });
}

async function updatePingRoles(interaction, pingRoles) {
    const member = interaction.member;
    const selectedRoles = interaction.values ?? [];
    for (const roleId of selectedRoles) {
        if (!interaction.guild?.roles?.cache?.has(roleId)) {
            throw new Error("One of the selected roles no longer exists.");
        }
    }

    const rolesToRemove = pingRoles.filter(roleId =>
        member.roles.cache.has(roleId) && !selectedRoles.includes(roleId)
    );

    const rolesToAdd = selectedRoles.filter(
        roleId => !member.roles.cache.has(roleId)
    );

    if (rolesToRemove.length) await member.roles.remove(rolesToRemove);
    if (rolesToAdd.length) await member.roles.add(rolesToAdd);

    await logger({
        guild: interaction.guild,
        type: "SELFROLE_PING",
        user: interaction.user,
        fields: [{
            name: "Selected Roles",
            value: selectedRoles.length
                ? selectedRoles.map(id => `<@&${id}>`).join("\n")
                : "None"
        }]
    });
}

module.exports = async interaction => {
    const isPing = interaction.customId === "selfroles_ping";
    const isPingRemove = interaction.customId === "selfroles_remove_ping";

    if (
        interaction.customId !== "selfroles_color" &&
        interaction.customId !== "selfroles_faction" &&
        !isPing && !isPingRemove
    ) return false;
    if (!interaction.member) return true;

    const groupIds = await getSelfRoleGroupIds(interaction.guild);
    const ROLE_GROUPS = roleGroupsFromIds(groupIds);
    const pingRoles = Object.values(groupIds.ping || {}).filter(Boolean);
    const config = ROLE_GROUPS[interaction.customId];

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        if (config) {
            await updateExclusiveRoles(interaction, config);
            await interaction.editReply({
                content: `✅ Your ${config.label} has been updated to <@&${interaction.values[0]}>.`
            });
            return true;
        }

        if (isPing) {
            await updatePingRoles(interaction, pingRoles);
            await interaction.editReply({
                content: "✅ Your notification roles have been updated."
            });
            return true;
        }
    } catch (err) {
        console.error("[selfRoleHandler] Failed to update self-roles:", err.message);
        await interaction.editReply({
            content: "❌ Something went wrong while updating your roles. Please try again."
        }).catch(() => {});
        return true;
    }

    const rolesToRemove = pingRoles.filter(roleId =>
        interaction.member.roles.cache.has(roleId)
    );

    try {
        if (rolesToRemove.length) {
            await interaction.member.roles.remove(rolesToRemove);
            await logger({
                guild: interaction.guild,
                type: "SELFROLE_PING_REMOVE",
                user: interaction.user
            });
        }
    } catch (err) {
        console.error("[selfRoleHandler] Failed to remove ping roles:", err.message);
        await interaction.editReply({
            content: "❌ Something went wrong while removing your ping roles. Please try again."
        }).catch(() => {});
        return true;
    }

    await interaction.editReply({
        content: "🗑️ All ping roles have been removed."
    });

    return true;
};

module.exports.customIdPrefixes = ["selfroles_color", "selfroles_faction", "selfroles_ping", "selfroles_remove_ping"];
