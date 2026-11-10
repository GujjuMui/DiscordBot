const { EmbedBuilder } = require("discord.js");

const settings = require("../config/settings");
const { getSettings } = require("../config/configLoader");

function getConfiguredChannelId(value) {
    return /^\d+$/.test(String(value || "")) ? String(value) : null;
}

// Cache-first: a channel the bot already knows about is never fetched.
async function fetchChannel(guild, configuredId) {
    const channelId = getConfiguredChannelId(configuredId);

    if (!channelId) return null;

    return guild.channels.cache.get(channelId)
        ?? await guild.channels.fetch(channelId).catch(() => null);
}

module.exports = async member => {

    // DB-overridable settings for this guild, static fallback on error.
    const guildSettings = await getSettings(member.guild?.id).catch(() => settings);
    const channels = guildSettings?.channels || settings.channels;

    // The four channel lookups are independent — run them in parallel.
    const [onboardingChannel, rulesChannel, welcomeChannel, supportChannel] = await Promise.all([
        fetchChannel(member.guild, channels.onboarding),
        fetchChannel(member.guild, channels.serverRules),
        fetchChannel(member.guild, channels.main_welcome),
        fetchChannel(member.guild, channels.serverSupport)
    ]);

    if (!onboardingChannel) {

        console.warn(
            "Onboarding channel is unavailable; skipping welcome message."
        );

        return;

    }

    const verificationChannel =
        member.guild.channels.cache.find(
            channel =>
                channel.name === channels.verification
        );

    const rulesMention =
        rulesChannel
            ? rulesChannel.toString()
            : "📃┃server-rules";

    const verificationMention =
        verificationChannel
            ? verificationChannel.toString()
            : "📝┃verification";

    const welcomeMention =
        welcomeChannel
            ? welcomeChannel.toString()
            : "🎀┃welcome";

    const supportMention =
        supportChannel
            ? supportChannel.toString()
            : "💬┃server-support";

    const embed = new EmbedBuilder()

        .setColor("#ED4245")

        .setTitle("👋 Welcome to F A T E - SF")

        .setDescription(
            `Welcome to the server, ${member}!\n\n` +

            `**📋 ONBOARDING**\n\n` +

            `**1️⃣ Read the Rules**\n` +
            `Please read the server rules in ${rulesMention}.\n\n` +

            `**2️⃣ Verify Yourself**\n` +
            `After reading the rules, head to ${verificationMention}.\n\n` +

            `**3️⃣ Learn More**\n` +
            `Our detailed server guide is available in ${welcomeMention}.\n\n` +

            `**❓ NEED HELP?**\n` +
            `Having trouble with verification? Ask for support in ${supportMention}.\n\n` +

            `Enjoy your stay and welcome to **F A T E - SF**! ❤️`
        )

        .setFooter({
            text: "F A T E - SF • Welcome"
        })

        .setTimestamp();

    try {
        await onboardingChannel.send({
            embeds: [embed]
        });
    } catch (err) {
        // A missing-permission / deleted-channel send must not make
        // the member-join handler throw (index.js would only log it,
        // but the join itself is already done).
        console.error("[memberJoinHandler] Failed to send onboarding message:", err.message);
    }

};
