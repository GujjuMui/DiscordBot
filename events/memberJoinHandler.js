const { EmbedBuilder } = require("discord.js");

const { resolveChannel } = require("../services/guildSetup");

// Resolve one onboarding channel. A failure (e.g. the bot cannot
// create channels) resolves to null instead of throwing — a missing
// channel must never break a member join.
async function resolve(guild, key) {
    try {
        const { channel } = await resolveChannel(guild, key);
        return channel;
    } catch {
        return null;
    }
}

module.exports = async member => {

    // The four channel lookups are independent — run them in parallel.
    // Each one is resolved (stored ID, then canonical name, then
    // created under HORNET), so a fresh server builds its onboarding
    // channels on the first join instead of skipping the welcome.
    const [onboardingChannel, rulesChannel, welcomeChannel, supportChannel] = await Promise.all([
        resolve(member.guild, "onboarding"),
        resolve(member.guild, "serverRules"),
        resolve(member.guild, "main_welcome"),
        resolve(member.guild, "serverSupport")
    ]);

    if (!onboardingChannel) {

        console.warn(
            "Onboarding channel is unavailable; skipping welcome message."
        );

        return;

    }

    // Resolved like the others (stored ID, then canonical name,
    // then created under HORNET); null when it cannot be resolved.
    const verificationChannel =
        await resolve(member.guild, "verification");

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
