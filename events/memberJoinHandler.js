// Member-join onboarding — guildMemberAdd.
//
// Fetches this guild's saved verification configuration from the
// database (repositories/VerificationRepository.js). If the guild
// is unconfigured (no /verification setup yet), exits gracefully —
// it never creates channels on a join. Otherwise it posts the
// dynamic onboarding welcome embed (services/verificationSetup.js)
// into the saved onboarding channel, with every <#channel> mention
// and the {guild.name} placeholders resolved from the config.
const { buildOnboardingEmbed } = require("../services/verificationSetup");
const VerificationRepository = require("../repositories/VerificationRepository");

module.exports = async member => {

    const config = await VerificationRepository
        .getVerificationConfig(member.guild.id)
        .catch(() => null);

    if (!config || !config.onboardingChannelId) {
        // Unconfigured guild — nothing to welcome into yet.
        return;
    }

    const onboardingChannel = member.guild.channels.cache.get(config.onboardingChannelId)
        || await member.guild.channels.fetch(config.onboardingChannelId).catch(() => null);

    if (!onboardingChannel) {
        console.warn(
            "[memberJoinHandler] Saved onboarding channel is unavailable; skipping welcome message."
        );
        return;
    }

    const embed = buildOnboardingEmbed(member, config);

    try {
        await onboardingChannel.send({ embeds: [embed] });
    } catch (err) {
        // A missing-permission / deleted-channel send must not make
        // the member-join handler throw (the join itself is already
        // done).
        console.error("[memberJoinHandler] Failed to send onboarding message:", err.message);
    }

};
