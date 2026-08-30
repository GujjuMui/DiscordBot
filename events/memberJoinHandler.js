const { EmbedBuilder } = require("discord.js");

const settings = require("../config/settings");

module.exports = async member => {

    const onboardingChannel =
    await member.guild.channels.fetch(
        settings.channels.onboarding
    ).catch(() => null);

    if (!onboardingChannel) {

        console.error(
            "Onboarding channel not found:",
            settings.channels.onboarding
        );

        return;

    }

    const rulesChannel =
    await member.guild.channels.fetch(
        settings.channels.serverRules
    ).catch(() => null);

    const verificationChannel =
        member.guild.channels.cache.find(
            channel =>
                channel.name === settings.channels.verification
        );

    const welcomeChannel =
    await member.guild.channels.fetch(
        settings.channels.main_welcome
    ).catch(() => null);

    const supportChannel =
    await member.guild.channels.fetch(
        settings.channels.serverSupport
    ).catch(() => null);

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

    await onboardingChannel.send({

        embeds: [embed]

    });

};