const settings = require("../config/settings");
const logger = require("../utils/logger");

const ROLE_GROUPS = {
    selfroles_color: {
        roles: Object.values(settings.roles.color),
        logType: "SELFROLE_COLOR",
        fieldName: "Role",
        label: "color role"
    },
    selfroles_faction: {
        roles: Object.values(settings.roles.faction),
        logType: "SELFROLE_FACTION",
        fieldName: "Faction",
        label: "faction"
    }
};

const pingRoles = Object.values(settings.roles.ping);

async function updateExclusiveRoles(interaction, config) {
    const selectedRole = interaction.values[0];
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

async function updatePingRoles(interaction) {
    const member = interaction.member;
    const selectedRoles = interaction.values;

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
    const config = ROLE_GROUPS[interaction.customId];
    const isPing = interaction.customId === "selfroles_ping";
    const isPingRemove = interaction.customId === "selfroles_remove_ping";

    if (!config && !isPing && !isPingRemove) return false;
    if (!interaction.member) return true;

    await interaction.deferReply({ ephemeral: true });

    if (config) {
        await updateExclusiveRoles(interaction, config);
        await interaction.editReply({
            content: `✅ Your ${config.label} has been updated to <@&${interaction.values[0]}>.`
        });
        return true;
    }

    if (isPing) {
        await updatePingRoles(interaction);
        await interaction.editReply({
            content: "✅ Your notification roles have been updated."
        });
        return true;
    }

    const rolesToRemove = pingRoles.filter(roleId =>
        interaction.member.roles.cache.has(roleId)
    );

    if (rolesToRemove.length) {
        await interaction.member.roles.remove(rolesToRemove);
        await logger({
            guild: interaction.guild,
            type: "SELFROLE_PING_REMOVE",
            user: interaction.user
        });
    }

    await interaction.editReply({
        content: "🗑️ All ping roles have been removed."
    });

    return true;
};
