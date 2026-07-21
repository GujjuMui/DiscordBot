const { EmbedBuilder } = require("discord.js");

const footer = {
    text: "HORNET • Shadow Fight Arena Management"
};

function home() {

    return new EmbedBuilder()

        .setColor("#f1c40f")

        .setTitle("📖 HORNET Help")

        .setDescription(
            "Welcome to **HORNET**.\n\n" +
            "Select a category from the dropdown below."
        )

        .addFields({
            name: "Available Categories",
            value:
                "<a:Discord:1528303361781137501> Public\n" +
                "<a:sprinkle_gbn:1528808995807035482> Trusted\n" +
                "<a:shields:1528808564200570880> Moderator\n" +
                "<a:dream_crowns:1528808039870628091> Owner\n" +
                "<a:info:1528638936082157589> About"
        })

        .setFooter(footer)

        .setTimestamp();

}

function publicCommands() {

    return new EmbedBuilder()

        .setColor("#2ecc71")

        .setTitle("<a:Discord:1528303361781137501> Public Commands")

        .setDescription(

            "`/about` • Learn about HORNET\n\n" +

            "`/help` • Open the help menu"

        )

        .setFooter(footer);

}

function trustedCommands() {

    return new EmbedBuilder()

        .setColor("#3498db")

        .setTitle("<a:sprinkle_gbn:1528808995807035482> Trusted Commands")

        .setDescription(

            "**Cards**\n" +

            "`/cards`\n" +
            "`/savecard`\n" +
            "`/editcard`\n\n" +

            "**Artwork**\n" +

            "`/arts`\n" +
            "`/saveart`\n" +
            "`/editart`\n\n" +

            "**Links**\n" +

            "`/links`\n" +
            "`/addlink`"

        )

        .setFooter(footer);

}

function moderatorCommands() {

    return new EmbedBuilder()

        .setColor("#e67e22")

        .setTitle("<a:shields:1528808564200570880> Moderator Commands")

        .setDescription(

            "**Member Management**\n\n" +

            "`/member add`\n" +
            "Add a user to FATE AS or FATE EU.\n\n" +

            "`/member remove`\n" +
            "Remove a user from a clan.\n\n" +

            "`/member transfer`\n" +
            "Transfer a member between AS and EU.\n\n" +

            "**Gallery Management**\n\n" +

            "`/deletecard`\n\n" +

            "`/deleteart`\n\n" +

            "**Links**\n\n" +

            "`/deletelink`"

        )

        .setFooter(footer);

}
function ownerCommands() {

    return new EmbedBuilder()

        .setColor("#e74c3c")

        .setTitle("<a:dream_crowns:1528808039870628091> Owner Commands")

        .setDescription(

            "**Server Management**\n\n" +

            "`/setup`\n" +
            "`/clan setup`\n\n" +

            "**Trusted Users**\n\n" +

            "`/trust`\n" +
            "`/untrust`\n" +
            "`/trustedlist`\n\n" +

            "**Verification**\n\n" +

            "`/verification`\n\n" +

            "**Auto Replies**\n\n" +

            "`/autoreply add`\n" +
            "`/autoreply remove`\n" +
            "`/autoreply list`\n\n" +

            "**Utilities**\n\n" +

            "`/say`\n" +
            "`/spam`\n" +
            "`/stopspam`\n" +
            "`/selfroles` - Create or refresh the self-role panel"

        )

        .setFooter(footer);

}

function about() {

    return new EmbedBuilder()

        .setColor("#9b59b6")

        .setTitle("<a:info:1528638936082157589> About HORNET")

        .setDescription(

            "**HORNET** is a Shadow Fight Arena management bot.\n\n" +

            "Features include:\n\n" +

            "• Card Gallery\n" +
            "• Artwork Gallery\n" +
            "• Link Library\n" +
            "• Tournament Tools\n" +
            "• Staff Utilities" 

        )

        .setFooter(footer);

}

module.exports = {

    home,

    publicCommands,

    trustedCommands,

    moderatorCommands,

    ownerCommands,

    about

};