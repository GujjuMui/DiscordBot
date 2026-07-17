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
                "🌍 Public\n" +
                "⭐ Trusted\n" +
                "🛡️ Moderator\n" +
                "👑 Owner\n" +
                "ℹ️ About"
        })

        .setFooter(footer)

        .setTimestamp();

}

function publicCommands() {

    return new EmbedBuilder()

        .setColor("#2ecc71")

        .setTitle("🌍 Public Commands")

        .setDescription(

            "`/about` • Learn about HORNET\n\n" +

            "`/help` • Open the help menu\n\n" +

            "`/joke` • Crack a random joke"

        )

        .setFooter(footer);

}

function trustedCommands() {

    return new EmbedBuilder()

        .setColor("#3498db")

        .setTitle("⭐ Trusted Commands")

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

        .setTitle("🛡️ Moderator Commands")

        .setDescription(

            "`/deletecard`\n\n" +

            "`/deleteart`\n\n" +

            "`/removelink`"

        )

        .setFooter(footer);

}

function ownerCommands() {

    return new EmbedBuilder()

        .setColor("#e74c3c")

        .setTitle("👑 Owner Commands")

        .setDescription(

            "**Server Management**\n\n" +

            "`/setup`\n" +
            "`/trust`\n\n" +

            "**Auto Replies**\n\n" +

            "`/autoreply add`\n" +
            "`/autoreply remove`\n" +
            "`/autoreply list`\n\n" +

            "**Utilities**\n\n" +

            "`/spam`\n" +
            "`/stopspam`"

        )

        .setFooter(footer);

}

function about() {

    return new EmbedBuilder()

        .setColor("#9b59b6")

        .setTitle("ℹ️ About HORNET")

        .setDescription(

            "**HORNET** is a Shadow Fight Arena management bot.\n\n" +

            "Features include:\n\n" +

            "• Card Gallery\n" +
            "• Artwork Gallery\n" +
            "• Link Library\n" +
            "• Tournament Tools\n" +
            "• Staff Utilities\n\n" +

            "Built with ❤️ for the SFA community."

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