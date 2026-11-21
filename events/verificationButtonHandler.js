// Verify button — persistent customId "verify", posted by
// /verification setup (services/verificationSetup.js).
//
// On click: look up this guild's verifiedRoleId from the database
// (repositories/VerificationRepository.js); fall back to the
// guild's Member role when no role was configured. Grant the role
// directly and confirm ephemerally. Age gates from the panel
// (30-day account, 5 minutes in the server) still apply, and
// missing bot permissions / role-hierarchy problems are reported
// ephemerally instead of throwing.
const {
    MessageFlags,
    PermissionsBitField
} = require("discord.js");

const { VERIFY_MIN_ACCOUNT_AGE_MS, VERIFY_MIN_JOIN_AGE_MS } = require("../config/constants");
const { resolveRole, SetupPermissionError } = require("../services/guildSetup");
const VerificationRepository = require("../repositories/VerificationRepository");
const { postVerificationWelcome } = require("../services/welcomeMessage");
const logger = require("../utils/logger");

async function safeDefer(interaction) {
    try {
        if (interaction.replied || interaction.deferred) return false;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        return true;
    } catch (err) {
        if (err.code === 10062) return false;
        throw err;
    }
}

async function safeEditReply(interaction, options) {
    try {
        await interaction.editReply(options);
    } catch (err) {
        if (err.code === 10062) return;
        throw err;
    }
}

module.exports = async interaction => {

    if (!interaction.isButton()) return false;

    if (interaction.customId !== "verify") return false;

    if (!(await safeDefer(interaction))) return true;

    const guild = interaction.guild;

    // The verified role: configured verifiedRoleId first, then the
    // guild's Member role (looked up, never created here — a
    // missing role is a config problem, not a reason to create
    // roles on a button click).
    let memberRole = null;
    const config = await VerificationRepository
        .getVerificationConfig(guild.id)
        .catch(() => null);
    if (config?.verifiedRoleId) {
        memberRole = guild.roles.cache.get(config.verifiedRoleId)
            || await guild.roles.fetch(config.verifiedRoleId).catch(() => null);
    }
    if (!memberRole) {
        try {
            // resolveRole returns null (not { role: null }) when
            // create:false and nothing resolves.
            const resolved = await resolveRole(guild, "member", { create: false });
            memberRole = resolved?.role || null;
        } catch (err) {
            if (err instanceof SetupPermissionError) {
                await safeEditReply(interaction, {
                    content: "❌ I need the **Manage Roles** permission to verify you."
                });
                return true;
            }
            throw err;
        }
    }

    if (!memberRole) {
        await safeEditReply(interaction, {
            content: "❌ No verified role is set up yet. Please ask an admin to run `/verification config` and choose a verified role."
        });
        return true;
    }

    if (interaction.member.roles.cache.has(memberRole.id)) {
        await safeEditReply(interaction, {
            content: "✅ You are already verified."
        });
        return true;
    }

    const accountAge = Date.now() - interaction.user.createdTimestamp;
    if (accountAge < VERIFY_MIN_ACCOUNT_AGE_MS) {
        await safeEditReply(interaction, {
            content: "❌ Your Discord account must be at least **30 days old** before you can verify."
        });
        return true;
    }

    const joinedAge = Date.now() - interaction.member.joinedTimestamp;
    if (joinedAge < VERIFY_MIN_JOIN_AGE_MS) {
        await safeEditReply(interaction, {
            content: "⏱️ Please wait until you've been in the server for **5 minutes** before verifying."
        });
        return true;
    }

    // Pre-checks BEFORE roles.add: the bot must be able to manage
    // this role (Manage Roles + hierarchy), otherwise the add would
    // throw a 50013 after the user had already waited.
    const botMember = guild.members.me;
    if (!botMember?.permissions?.has(PermissionsBitField.Flags.ManageRoles)) {
        await safeEditReply(interaction, {
            content: "❌ I need the **Manage Roles** permission to verify you."
        });
        return true;
    }
    if (memberRole.position >= botMember.roles.highest.position) {
        await safeEditReply(interaction, {
            content: "❌ I cannot assign the verified role because it is equal to or higher than my highest role. Please move my role above it."
        });
        return true;
    }

    try {
        await interaction.member.roles.add(memberRole);
    } catch (err) {
        console.error("[verificationButtonHandler] Failed to add verified role:", err.message);
        await safeEditReply(interaction, {
            content: "❌ I couldn't assign the verified role. Please check my permissions and role position, then try again."
        });
        return true;
    }

    await safeEditReply(interaction, {
        content: `✅ You're verified in **${guild.name}**! Enjoy your stay! ❤️`
    });

    // Welcome message — posted when verification completes
    // (shared with the legacy modal flow). Best-effort: a
    // failure here never undoes the verification.
    try {
        await postVerificationWelcome(guild, interaction.member);
    } catch (err) {
        console.error("[verificationButtonHandler] Failed to send welcome message:", err.message);
    }

    // Best-effort log — a logging failure must never undo a
    // successful verification.
    try {
        const accountAgeDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));
        await logger({
            guild,
            user: interaction.user,
            type: "VERIFY",
            fields: [
                { name: "👤 User", value: `${interaction.user}`, inline: true },
                { name: "🪪 User ID", value: interaction.user.id, inline: true },
                { name: "📅 Discord Account Created", value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:F>`, inline: true },
                { name: "⏱️ Discord Account Age", value: `${accountAgeDays} days`, inline: true },
                { name: "Joined Server", value: `<t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:F>`, inline: false },
                { name: "Verified Role", value: `${memberRole}`, inline: true }
            ]
        });
    } catch {}

    return true;
};

module.exports.customIdPrefixes = ["verify"];
