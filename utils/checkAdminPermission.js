const owner = require("../config/owner");
const settings = require("../config/settings");

module.exports = async (interaction) => {

    // Bot owner
    if (interaction.user.id === owner.ownerId)
        return true;

    // Discord Administrator permission
    if (interaction.member.permissions.has("Administrator"))
        return true;

    if (interaction.deferred || interaction.replied) {

        await interaction.editReply({
            content: settings.emojis.cross + " You must be an Administrator to use this command."
        });

    } else {

        await interaction.reply({
            content: settings.emojis.cross + " You must be an Administrator to use this command.",
            flags: MessageFlags.Ephemeral
        });

    }

    return false;

};