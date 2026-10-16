const BotSettings = require("../database/BotSettings");
const staticSettings = require("./settings");

// Fallback to static settings.js if MongoDB record is not found or fails
async function getSettings(guildId) {
    try {
        if (!guildId) return staticSettings;
        const record = await BotSettings.findOne({ guildId }).lean();
        if (!record) return staticSettings;

        // Merge record over static defaults
        return {
            channels: { ...staticSettings.channels, ...(record.channels || {}) },
            roles: { ...staticSettings.roles, ...(record.roles || {}) },
            selfRoles: {
                channel: record.channels?.get?.("selfRolesChannel") || staticSettings.selfRoles.channel,
                banners: { ...staticSettings.selfRoles.banners, ...(record.banners || {}) }
            },
            clan: {
                embedImage: record.extras?.get?.("clanEmbedImage") || staticSettings.clan.embedImage
            }
        };
    } catch (err) {
        console.error("[getSettings] Error fetching dynamic settings, falling back to static:", err);
        return staticSettings;
    }
}

async function updateSetting(guildId, category, key, value) {
    try {
        const updateField = `${category}.${key}`;
        await BotSettings.findOneAndUpdate(
            { guildId },
            { $set: { [updateField]: value } },
            { upsert: true, new: true }
        );
        return true;
    } catch (err) {
        console.error("[updateSetting] Failed to update setting:", err);
        return false;
    }
}

module.exports = {
    getSettings,
    updateSetting,
    staticSettings
};
