// Configuration & Feature Flags System modeled after production Python patterns
require("dotenv").config();

function parseBool(val, defaultVal = true) {
    if (val === undefined || val === null || val === "") return defaultVal;
    return String(val).toLowerCase() === "true" || String(val) === "1";
}

const config = {
    // Core credentials — env only, no fallbacks. The bot owner ID in
    // particular has NO hardcoded fallback: if BOT_OWNER_ID is unset,
    // owner-only commands simply have no owner (fail closed) and a
    // clear error is logged at startup (see below).
    token: process.env.TOKEN || "",
    clientId: process.env.CLIENT_ID || "",
    botOwnerId: process.env.BOT_OWNER_ID || process.env.OWNER_ID || "",

    // Guild restrictions
    allowedGuildIds: (process.env.ALLOWED_GUILD_IDS || "")
        .split(",")
        .map(id => id.trim())
        .filter(Boolean),

    // Feature Flags — all six, default true. deploy-commands.js,
    // sync.js and the command loader read these exact keys.
    features: {
        tickets: parseBool(process.env.ENABLE_TICKETS, true),
        tryouts: parseBool(process.env.ENABLE_TRYOUTS, true),
        verification: parseBool(process.env.ENABLE_VERIFICATION, true),
        moderation: parseBool(process.env.ENABLE_MODERATION, true),
        channelManager: parseBool(process.env.ENABLE_CHANNEL_MANAGER, true),
        broadcast: parseBool(process.env.ENABLE_BROADCAST, true)
    },

    // Database
    mongoUri: process.env.MONGO_URI || "",

    // Cloudinary
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
        apiKey: process.env.CLOUDINARY_API_KEY || "",
        apiSecret: process.env.CLOUDINARY_API_SECRET || "",
        // Folder prefix for uploaded images, e.g. "hornet/cards".
        folderPrefix: process.env.CLOUDINARY_FOLDER_PREFIX || "hornet"
    }
};

// Fail closed, loudly, when the owner is not configured — but do not
// throw here: throwing at require time would break the test harness
// and any script that only needs the feature flags.
if (!config.botOwnerId) {
    console.error("❌ BOT_OWNER_ID is not set — owner-only commands will have no owner. Set BOT_OWNER_ID in .env");
}

// Log feature flag status on startup
console.log("========================================");
console.log("          FEATURE FLAGS STATUS          ");
console.log("========================================");
console.log(`- Allowed Guilds      : ${config.allowedGuildIds.length > 0 ? config.allowedGuildIds.join(", ") : "All Guilds (Unrestricted)"}`);
console.log("========================================");

module.exports = config;
