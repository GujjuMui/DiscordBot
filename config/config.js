// Configuration & Feature Flags System modeled after production Python patterns
require("dotenv").config();

function parseBool(val, defaultVal = false) {
    if (val === undefined || val === null || val === "") return defaultVal;
    return String(val).toLowerCase() === "true" || String(val) === "1";
}

const config = {
    // Core credentials
    token: process.env.TOKEN || "",
    clientId: process.env.CLIENT_ID || "",
    botOwnerId: process.env.BOT_OWNER_ID || process.env.OWNER_ID || "",

    // Guild restrictions
    allowedGuildIds: (process.env.ALLOWED_GUILD_IDS || "")
        .split(",")
        .map(id => id.trim())
        .filter(Boolean),

    // Feature Flags (Opt-in / Opt-out modules)
    features: {
        moderation: parseBool(process.env.ENABLE_MODERATION, false),
        channelManager: parseBool(process.env.ENABLE_CHANNEL_MANAGER, false),
        broadcast: parseBool(process.env.ENABLE_BROADCAST, true),
        tickets: parseBool(process.env.ENABLE_TICKETS, true),
        tryouts: parseBool(process.env.ENABLE_TRYOUTS, true),
        verification: parseBool(process.env.ENABLE_VERIFICATION, true)
    },

    // Database
    mongoUri: process.env.MONGO_URI || "",

    // Cloudinary
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
        apiKey: process.env.CLOUDINARY_API_KEY || "",
        apiSecret: process.env.CLOUDINARY_API_SECRET || ""
    }
};

// Log feature flag status on startup
console.log("========================================");
console.log("          FEATURE FLAGS STATUS          ");
console.log("========================================");
console.log(`- Moderation Suite    : ${config.features.moderation ? "✅ ENABLED" : "❌ DISABLED"}`);
console.log(`- Channel Manager     : ${config.features.channelManager ? "✅ ENABLED" : "❌ DISABLED"}`);
console.log(`- Broadcast System    : ${config.features.broadcast ? "✅ ENABLED" : "❌ DISABLED"}`);
console.log(`- Allowed Guilds      : ${config.allowedGuildIds.length > 0 ? config.allowedGuildIds.join(", ") : "All Guilds (Unrestricted)"}`);
console.log("========================================");

module.exports = config;
