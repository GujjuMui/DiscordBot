// Legacy FATE defaults — ONE-TIME SEED ONLY.
//
// The faction / ping roles below were the FATE server's own lists:
// Legion / Dynasty / Heralds and the giveaway / SFA videos /
// announcement / clan update / server update / friendly AS-EU ping
// roles. They are specific to that one server and are NOT the
// bot's defaults for any other server.
//
// These tables exist ONLY so a server that already had factions /
// pings configured (in config/guild.json or BotSettings) gets its
// lists carried over once, the first time the custom lists are read
// (see services/selfRoleCustom.js). They are never read by the
// panel builder or the select handler at runtime — those read the
// per-guild lists stored in BotSettings extras instead.
//
// A fresh server seeds to empty lists and the owner builds its own
// factions / pings with /selfroles faction-add and ping-add.
// Descriptions and emojis below are the seed values; the owner can
// change them per entry with faction-add / ping-add (re-adding the
// same role updates it).

const FACTION_SEED = [
    { sub: "legion", emoji: "⚔️" },
    { sub: "dynasty", emoji: "🏯" },
    { sub: "herald", emoji: "🛡️" }
];

const PING_SEED = [
    { sub: "giveaway", description: "Get notified about giveaways", emoji: "🎁" },
    { sub: "videos", description: "Get notified about new SFA videos", emoji: "📸" },
    { sub: "announcement", description: "Important server announcements", emoji: "📢" },
    { sub: "clanUpdate", description: "Clan news and updates", emoji: "⚔️" },
    { sub: "serverUpdate", description: "Server update notifications", emoji: "📰" },
    { sub: "friendlyAS", description: "Asian friendly match pings", emoji: "🤝" },
    { sub: "friendlyEU", description: "European friendly match pings", emoji: "🤝" }
];

module.exports = { FACTION_SEED, PING_SEED };
