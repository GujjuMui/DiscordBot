const {
    ModalBuilder,
    TextInputBuilder,
    MessageFlags,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const settings = require("../config/settings");
const { VERIFY_MIN_ACCOUNT_AGE_MS, VERIFY_MIN_JOIN_AGE_MS } = require("../config/constants");

async function safeReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) return;
        await interaction.reply(options);
    } catch (err) {
        if (err.code === 10062) return; // interaction expired, ignore
        throw err;
    }
}

async function safeShowModal(interaction, modal) {
    try {
        if (interaction.replied || interaction.deferred) return;
        await interaction.showModal(modal);
    } catch (err) {
        if (err.code === 10062) return;
        throw err;
    }
}

module.exports = async interaction => {

    if (!interaction.isButton()) return false;

    if (interaction.customId !== "verify") return false;

    const memberRole = interaction.guild.roles.cache.get(settings.roles.member);

    if (!memberRole) {
        await safeReply(interaction, {
            content: "❌ Member role not found.",
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    if (interaction.member.roles.cache.has(memberRole.id)) {
        await safeReply(interaction, {
            content: "✅ You are already verified.",
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    const accountAge = Date.now() - interaction.user.createdTimestamp;
    const THIRTY_DAYS = VERIFY_MIN_ACCOUNT_AGE_MS;

    if (accountAge < THIRTY_DAYS) {
        await safeReply(interaction, {
            content: "❌ Your Discord account must be at least **30 days old** before you can verify.",
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    const joinedAge = Date.now() - interaction.member.joinedTimestamp;
    const FIVE_MINUTES = VERIFY_MIN_JOIN_AGE_MS;

    if (joinedAge < FIVE_MINUTES) {
        await safeReply(interaction, {
            content: "⏱️ Please wait until you've been in the server for **5 minutes** before verifying.",
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

    await safeShowModal(interaction, modal);

    return true;
};

module.exports.customIdPrefixes = ["verify"];
