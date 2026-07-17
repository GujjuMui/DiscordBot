const helpEmbeds = require("../utils/helpEmbeds");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return false;

    if (interaction.customId !== "help_menu") return false;

    let embed;

    switch (interaction.values[0]) {

        case "public":
            embed = helpEmbeds.publicCommands();
            break;

        case "trusted":
            embed = helpEmbeds.trustedCommands();
            break;

        case "moderator":
            embed = helpEmbeds.moderatorCommands();
            break;

        case "owner":
            embed = helpEmbeds.ownerCommands();
            break;

        case "about":
            embed = helpEmbeds.about();
            break;

        default:
            embed = helpEmbeds.home();

    }

    await interaction.update({

        embeds: [embed],

        components: interaction.message.components

    });

    return true;

};