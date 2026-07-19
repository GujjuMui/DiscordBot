const {
    ModalBuilder,
    TextInputBuilder,
    MessageFlags,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const settings = require("../config/settings");

module.exports = async interaction => {

    if (!interaction.isButton()) return false;

    if (interaction.customId !== "verify") return false;

    const memberRole = interaction.guild.roles.cache.get(settings.roles.member);

    if (!memberRole) {

        await interaction.reply({
            content: "❌ Member role not found.",
            flags: MessageFlags.Ephemeral
        });

        return true;

    }

    if (interaction.member.roles.cache.has(memberRole.id)) {

        await interaction.reply({
            content: "✅ You are already verified.",
            flags: MessageFlags.Ephemeral
        });

        return true;

    }

    const accountAge = Date.now() - interaction.user.createdTimestamp;

    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    if (accountAge < THIRTY_DAYS) {

        await interaction.reply({

            content:
                "❌ Your Discord account must be at least **30 days old** before you can verify.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const joinedAge = Date.now() - interaction.member.joinedTimestamp;

    const FIVE_MINUTES = 5 * 60 * 1000;

    if (joinedAge < FIVE_MINUTES) {

        await interaction.reply({

            content:
                "⏳ Please wait until you've been in the server for **5 minutes** before verifying.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const modal = new ModalBuilder()

        .setCustomId("verification_modal")

        .setTitle("Server Verification");

    const name = new TextInputBuilder()

        .setCustomId("name")

        .setLabel("What should we call you?")

        .setStyle(TextInputStyle.Short)

        .setRequired(true);

    const source = new TextInputBuilder()

        .setCustomId("source")

        .setLabel("How did you find our server?")

        .setStyle(TextInputStyle.Short)

        .setRequired(true);

    const interest = new TextInputBuilder()

        .setCustomId("interest")

        .setLabel("What are you interested in here?")

        .setStyle(TextInputStyle.Paragraph)

        .setRequired(true);

    modal.addComponents(

        new ActionRowBuilder().addComponents(name),

        new ActionRowBuilder().addComponents(source),

        new ActionRowBuilder().addComponents(interest)

    );

    console.log("Showing verification modal...");
    console.log("Replied:", interaction.replied);
    console.log("Deferred:", interaction.deferred);

    await interaction.showModal(modal);

    return true;

};