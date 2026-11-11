// Static guild settings — channel/role IDs, self-role panel and clan
// branding for this server.
//
// The actual values live in config/guild.json (NOT in this file and
// NOT in .env), so they can be edited without touching code. A fresh
// server does NOT need guild.json at all: services/guildSetup.js
// resolves every channel/role — stored ID first, then the canonical
// name, then it creates it under the HORNET category and remembers
// the ID in MongoDB (BotSettings) — so /setup, /verification setup
// and /selfroles setup all work from a bare server. The BotSettings
// collection can override these per guild at runtime via
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

module.exports = settings;
