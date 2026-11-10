// Static guild settings — channel/role IDs, self-role panel and clan
// branding for this server.
//
// The actual values live in config/guild.json (NOT in this file and
// NOT in .env), so they can be edited without touching code. Copy
// config/guild.example.json to config/guild.json for a fresh server.
// A few keys can also be overridden per-environment via CHANNEL_* /
// ROLE_* variables (see ENV_OVERRIDES below). The BotSettings
// collection in MongoDB can override these per guild at runtime via
// config/configLoader.js — see getSettings().
//
// This module exports the same shape as before so all consumers work
// unchanged: { channels, idPrefix, roles, selfRoles, clan }.
const fs = require("fs");
const path = require("path");

function loadGuildFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
        return null;
    }
}

const guildConfigPath =
    process.env.HORNET_GUILD_CONFIG_PATH ||
    path.join(__dirname, "guild.json");

let guild = loadGuildFile(guildConfigPath);
if (!guild) {
    // Fall back to the example file so the bot still starts (with
    // placeholder IDs) instead of crashing on a missing guild.json.
    guild = loadGuildFile(path.join(__dirname, "guild.example.json"));
}
if (!guild) {
    console.error("[settings] config/guild.json not found — using empty guild settings. Copy config/guild.example.json to config/guild.json.");
    guild = {};
}

// Minimal shape defaults (channel *names*, never IDs) so a missing
// guild.json cannot crash a consumer that reads a key.
const settings = {
    channels: {
        cards: "🎴┃sfa-cards",
        arts: "🎨┃sfa-arts",
        links: "📺┃content",
        verification: "📝┃verification",
        tournaments: "tournaments",
        logs: "🐝┃hornet-logs",
        welcome: "",
        main_welcome: "",
        serverMap: "",
        howToJoin: "",
        tryout: "",
        onboarding: "",
        serverRules: "",
        serverSupport: "",
        ...(guild.channels || {})
    },
    idPrefix: {
        card: "SFA",
        art: "ART",
        ...(guild.idPrefix || {})
    },
    roles: {
        admin: "Admin",
        trusted: "Trusted",
        member: "",
        pendingTryout: "",
        clanMemberAS: "",
        clanMemberEU: "",
        pendingTryoutAS: "",
        pendingTryoutEU: "",
        tryoutTesterAS: "",
        tryoutTesterEU: "",
        color: {},
        faction: {},
        ping: {},
        ...(guild.roles || {})
    },
    selfRoles: {
        channel: "",
        banners: {},
        ...(guild.selfRoles || {})
    },
    clan: {
        embedImage: "",
        ...(guild.clan || {})
    }
};

// Per-key environment overrides. Only the main channel/role keys are
// mapped — everything else is edited in guild.json.
const ENV_OVERRIDES = {
    CHANNEL_WELCOME: ["channels", "welcome"],
    CHANNEL_MAIN_WELCOME: ["channels", "main_welcome"],
    CHANNEL_TRYOUT: ["channels", "tryout"],
    CHANNEL_ONBOARDING: ["channels", "onboarding"],
    CHANNEL_SERVER_RULES: ["channels", "serverRules"],
    CHANNEL_SERVER_SUPPORT: ["channels", "serverSupport"],
    CHANNEL_LOGS: ["channels", "logs"],
    CHANNEL_CARDS: ["channels", "cards"],
    CHANNEL_ARTS: ["channels", "arts"],
    CHANNEL_LINKS: ["channels", "links"],
    CHANNEL_VERIFICATION: ["channels", "verification"],
    ROLE_MEMBER: ["roles", "member"],
    ROLE_PENDING_TRYOUT: ["roles", "pendingTryout"],
    ROLE_CLAN_MEMBER_AS: ["roles", "clanMemberAS"],
    ROLE_CLAN_MEMBER_EU: ["roles", "clanMemberEU"],
    ROLE_TRYOUT_TESTER_AS: ["roles", "tryoutTesterAS"],
    ROLE_TRYOUT_TESTER_EU: ["roles", "tryoutTesterEU"],
    SELFROLES_CHANNEL: ["selfRoles", "channel"],
    CLAN_EMBED_IMAGE: ["clan", "embedImage"]
};

for (const [envName, [section, key]] of Object.entries(ENV_OVERRIDES)) {
    if (process.env[envName]) settings[section][key] = process.env[envName];
}

module.exports = settings;
