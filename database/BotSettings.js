const mongoose = require("mongoose");

// Per-guild verification suite (universal /verification setup +
// config). Every value is a Discord snowflake / display string
// resolved at runtime from interaction.guild — nothing here is a
// hardcoded server, channel or role. A guild with no verification
// block (or an empty onboardingChannelId) is unconfigured: the
// member-join handler exits gracefully and the Verify button tells
// the member to ask an admin to run /verification setup.
const verificationSchema = new mongoose.Schema({
    verifiedRoleId: { type: String, default: "" },
    welcomeCategoryId: { type: String, default: "" },
    rulesChannelId: { type: String, default: "" },
    verificationChannelId: { type: String, default: "" },
    guideChannelId: { type: String, default: "" },
    supportChannelId: { type: String, default: "" },
    onboardingChannelId: { type: String, default: "" },
    customFooter: { type: String, default: "" },
    accentColor: { type: String, default: "" }
}, { _id: false, default: {} });

const botSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channels: {
        type: Map,
        of: String,
        default: {}
    },
    roles: {
        type: Map,
        of: String,
        default: {}
    },
    banners: {
        type: Map,
        of: String,
        default: {}
    },
    extras: {
        type: Map,
        of: String,
        default: {}
    },
    verification: {
        type: verificationSchema,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model("BotSettings", botSettingsSchema);
