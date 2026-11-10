const BotSettingsRepository = require("../repositories/BotSettingsRepository");
const staticSettings = require("./settings");
const { CACHE_TTL_MS } = require("./constants");

// Per-guild settings cache (60s TTL). BotSettings is read on every
// verification / join, so without this every one of those events
// costs a Mongo round-trip.
const settingsCache = new Map(); // guildId -> { settings, fetchedAt }

function invalidate(guildId) {
    if (guildId) settingsCache.delete(guildId);
    else settingsCache.clear();
}

// BotSettings stores channels/roles/banners/extras as Mongoose Maps.
// Spreading a Map ({...map}) silently drops every entry, so convert
// first. .lean() may already return a plain object, so handle both.
function asObject(value) {
    if (!value) return {};
    if (value instanceof Map) return Object.fromEntries(value);
    return value;
}

// Fallback to static settings.js if MongoDB record is not found or fails
async function getSettings(guildId) {
    try {
        if (!guildId) return staticSettings;
        const cached = settingsCache.get(guildId);
        if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
            return cached.settings;
        }
        const record = await BotSettingsRepository.findOne({ guildId });
        if (!record) {
            settingsCache.set(guildId, { settings: staticSettings, fetchedAt: Date.now() });
            return staticSettings;
        }

        const channels = asObject(record.channels);
        const roles = asObject(record.roles);
        const banners = asObject(record.banners);
        const extras = asObject(record.extras);

        // Merge record over static defaults
        const merged = {
            channels: { ...staticSettings.channels, ...channels },
            roles: { ...staticSettings.roles, ...roles },
            selfRoles: {
                channel: channels.selfRolesChannel || staticSettings.selfRoles.channel,
                banners: { ...staticSettings.selfRoles.banners, ...banners }
            },
            clan: {
                embedImage: extras.clanEmbedImage || staticSettings.clan.embedImage
            },
            // Passthrough: nothing the static file defines may be dropped.
            idPrefix: { ...staticSettings.idPrefix, ...(asObject(record.idPrefix)) },
            brand: extras.brand || staticSettings.clan?.brand || ""
        };
        settingsCache.set(guildId, { settings: merged, fetchedAt: Date.now() });
        return merged;
    } catch (err) {
        console.error("[getSettings] Error fetching dynamic settings, falling back to static:", err);
        return staticSettings;
    }
}

async function updateSetting(guildId, category, key, value) {
    try {
        const updateField = `${category}.${key}`;
        await BotSettingsRepository.findOneAndUpdate(
            { guildId },
            { $set: { [updateField]: value } },
            { upsert: true, new: true }
        );
        invalidate(guildId);
        return true;
    } catch (err) {
        console.error("[updateSetting] Failed to update setting:", err);
        return false;
    }
}

module.exports = {
    getSettings,
    updateSetting,
    invalidate,
    staticSettings
};
