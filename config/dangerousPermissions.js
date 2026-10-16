const { PermissionsBitField } = require("discord.js");

/**
 * Discord permission flags considered dangerous for role assignment.
 * Used by the giverole command and its button handler to warn before
 * granting roles that carry these permissions.
 */
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

module.exports = dangerousPermissions;
