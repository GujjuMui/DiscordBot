const Trusted = require("../database/Trusted");
const owner = require("../config/owner");
const settings = require("../config/settings");
const { MessageFlags } = require("discord.js");

module.exports = async (interaction) => {

    // Bot owner always has access
    if (interaction.user.id === owner.ownerId)
        return true;

    // Direct trusted user
    const trustedUser = await Trusted.findOne({
        targetId: interaction.user.id,
        type: "user"
    });

    if (trustedUser)
        return true;

    // Trusted role
    const memberRoles = interaction.member.roles.cache.map(
        role => role.id
    );

    const trustedRole = await Trusted.findOne({
        targetId: {
            $in: memberRoles
        },
        type: "role"
    });

    if (trustedRole)
        return true;

    if (interaction.deferred || interaction.replied) {

        await interaction.editReply({
            content: settings.emojis.cross + " You don't have permission to use this command."
        });

    } else {

        await interaction.reply({
            content: settings.emojis.cross + " You don't have permission to use this command.",
            flags: MessageFlags.Ephemeral
        });

    }

    return false;

};