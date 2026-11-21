// Verification repository — the DAO for the universal
// /verification suite. One BotSettings document per guild, keyed by
// guildId; the verification block holds the auto-detected WELCOME
// category + channel IDs, the configured verified role, and the
// optional branding overrides. Returns lean plain objects (or null).
const BotSettings = require("../database/BotSettings");

const VERIFICATION_FIELDS = Object.freeze([
    "verifiedRoleId",
    "welcomeCategoryId",
    "rulesChannelId",
    "verificationChannelId",
    "guideChannelId",
    "supportChannelId",
    "onboardingChannelId",
    "customFooter",
    "accentColor"
]);

function emptyConfig(guildId) {
    const config = { guildId: guildId || "" };
    for (const field of VERIFICATION_FIELDS) config[field] = "";
    return config;
}

// Normalise whatever Mongo returned (lean object, or a document
// with a nested verification subdocument) into a flat config with
// every field present. Returns null when the guild has no
// BotSettings document at all.
function normalise(record) {
    if (!record) return null;
    const stored = record.verification || {};
    const config = emptyConfig(record.guildId);
    for (const field of VERIFICATION_FIELDS) {
        const value = stored[field];
        if (typeof value === "string" && value.length > 0) config[field] = value;
    }
    return config;
}

// True when /verification setup has run (or /verification config
// has pointed at an onboarding channel) for this guild.
function isConfigured(config) {
    return Boolean(config && config.onboardingChannelId);
}

module.exports = {
    VERIFICATION_FIELDS,
    emptyConfig,
    isConfigured,

    async getVerificationConfig(guildId) {
        if (!guildId) return null;
        const record = await BotSettings.findOne({ guildId }).lean();
        return normalise(record);
    },

    // Upsert only the fields present in `patch` (unknown keys are
    // dropped so a stray option can never write an arbitrary field).
    // Returns the saved config, or null when nothing was saved.
    async saveVerificationConfig(guildId, patch = {}) {
        if (!guildId) return null;
        const set = {};
        for (const field of VERIFICATION_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(patch, field)) {
                set[`verification.${field}`] = String(patch[field] ?? "");
            }
        }
        if (Object.keys(set).length === 0) {
            return this.getVerificationConfig(guildId);
        }
        const doc = await BotSettings.findOneAndUpdate(
            { guildId },
            { $set: set },
            { upsert: true, new: true }
        ).lean();
        return normalise(doc);
    },

    async updateVerificationConfig(guildId, patch = {}) {
        return this.saveVerificationConfig(guildId, patch);
    }
};
