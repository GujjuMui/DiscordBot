const settings = require("../config/settings");
const logger = require("../utils/logger");

const colorRoles = Object.values(settings.roles.color);
const factionRoles = Object.values(settings.roles.faction);
const pingRoles = Object.values(settings.roles.ping);

module.exports = async interaction => {

    const validIds = [
        "selfroles_color",
        "selfroles_faction",
        "selfroles_ping",
        "selfroles_remove_ping"
    ];

    if (!validIds.includes(interaction.customId))
        return false;

    const member = interaction.member;

    if (!member)
        return true;

    await interaction.deferReply({

    ephemeral: true

});

    let replyMessage = null;

    // =====================================
    // COLOR ROLES
    // =====================================

    if (interaction.customId === "selfroles_color") {

    const selectedRole = interaction.values[0];

    // Remove all current color roles
    const rolesToRemove = colorRoles.filter(roleId =>
        member.roles.cache.has(roleId)
    );

    if (rolesToRemove.length) {

        await member.roles.remove(rolesToRemove);

    }

    // Add the selected color role
    if (!member.roles.cache.has(selectedRole)) {

        await member.roles.add(selectedRole);

        await logger({
    guild: interaction.guild,
    type: "SELFROLE_COLOR",
    user: interaction.user,
    fields: [
        {
            name: "Role",
            value: `<@&${selectedRole}>`
        }
    ]
});

    }

    await interaction.followUp({

    content: `✅ Your color role has been updated to <@&${selectedRole}>.`,

    ephemeral: true

});

return true;

}

// =====================================
// FACTION ROLES
// =====================================

if (interaction.customId === "selfroles_faction") {

    const selectedRole = interaction.values[0];

    // Remove all current faction roles
    const rolesToRemove = factionRoles.filter(roleId =>
        member.roles.cache.has(roleId)
    );

    if (rolesToRemove.length) {

        await member.roles.remove(rolesToRemove);

    }

    // Add selected faction role
    if (!member.roles.cache.has(selectedRole)) {

    await member.roles.add(selectedRole);

    await logger({
    guild: interaction.guild,
    type: "SELFROLE_FACTION",
    user: interaction.user,
    fields: [
        {
            name: "Faction",
            value: `<@&${selectedRole}>`
        }
    ]
});

        

    }

    await interaction.followUp({

    content: `✅ Your faction has been updated to <@&${selectedRole}>.`,

    ephemeral: true

});

return true;

}

// =====================================
// PING ROLES
// =====================================

if (interaction.customId === "selfroles_ping") {

    const selectedRoles = interaction.values;

    // Remove ping roles that were unselected
    for (const roleId of pingRoles) {

        if (
            member.roles.cache.has(roleId) &&
            !selectedRoles.includes(roleId)
        ) {

            await member.roles.remove(roleId);

        }

    }

    // Add newly selected ping roles
for (const roleId of selectedRoles) {

    if (!member.roles.cache.has(roleId)) {

        await member.roles.add(roleId);

    }

}

await logger({
    guild: interaction.guild,
    type: "SELFROLE_PING",
    user: interaction.user,
    fields: [
        {
            name: "Selected Roles",
            value: selectedRoles.length
                ? selectedRoles.map(id => `<@&${id}>`).join("\n")
                : "None"
        }
    ]
});

    await interaction.followUp({

    content: "✅ Your notification roles have been updated.",

    ephemeral: true

});

return true;

}

// =====================================
// REMOVE ALL PING ROLES
// =====================================

if (interaction.customId === "selfroles_remove_ping") {

    const rolesToRemove = pingRoles.filter(roleId =>
        member.roles.cache.has(roleId)
    );

    if (rolesToRemove.length) {

        await member.roles.remove(rolesToRemove);

        await logger({
    guild: interaction.guild,
    type: "SELFROLE_PING_REMOVE",
    user: interaction.user
});

    }

    await interaction.followUp({

    content: "🗑️ All ping roles have been removed.",

    ephemeral: true

});

return true;

}

    return false;

};