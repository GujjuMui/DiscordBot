const TrustedRepository = require("../repositories/TrustedRepository");
const owner = require("../config/owner");
const { MessageFlags } = require("discord.js");
const { CACHE_TTL_MS } = require("../config/constants");

// In-memory cache of trusted users/roles (60s TTL) so every
// protected command does not hit Mongo twice. Invalidated on
// /trust and /untrust via invalidateTrustedCache().
let trustedCache = null; // { userIds: Set, roleIds: Set, fetchedAt }
function invalidateTrustedCache() {
    trustedCache = null;
}

async function getTrusted() {
    const now = Date.now();
    if (trustedCache && now - trustedCache.fetchedAt < CACHE_TTL_MS) return trustedCache;
    const docs = await TrustedRepository.listIdentifiers();
    trustedCache = {
        userIds: new Set(docs.filter(d => d.type === "user").map(d => d.targetId)),
        roleIds: new Set(docs.filter(d => d.type === "role").map(d => d.targetId)),
        fetchedAt: now
    };
    return trustedCache;
}

module.exports = async (interaction) => {
    // Null-safe: interaction.member is null in DMs, and user may be
    // missing on a partial interaction. Deny (with an ephemeral
    // reply) instead of throwing.
    if (!interaction?.user || !interaction?.member || !interaction?.guild) {
        try {
            if (interaction?.deferred || interaction?.replied) {
                await interaction.editReply({ content: "❌ You don't have permission to use this command." });
            } else if (interaction?.reply) {
                await interaction.reply({ content: "❌ You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
            }
        } catch {}
        return false;
    }

    // Bot owner always has access
    if (interaction.user.id === owner.ownerId)
        return true;

    const trusted = await getTrusted();

    // Direct trusted user
    if (trusted.userIds.has(interaction.user.id))
        return true;

    // Trusted role (single cached lookup, not a second query)
    const memberRoles = interaction.member.roles?.cache?.map(role => role.id) ?? [];
    if (memberRoles.some(roleId => trusted.roleIds.has(roleId)))
        return true;

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
            content: "❌" + " You don't have permission to use this command."
        });
    } else {
        await interaction.reply({
            content: "❌" + " You don't have permission to use this command.",
            flags: MessageFlags.Ephemeral
        });
    }

    return false;
};

module.exports.invalidateTrustedCache = invalidateTrustedCache;
