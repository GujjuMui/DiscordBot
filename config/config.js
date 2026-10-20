// Configuration & Feature Flags System modeled after production Python patterns
require("dotenv").config();

function parseBool(val, defaultVal = true) {
    if (val === undefined || val === null || val === "") return defaultVal;
    return String(val).toLowerCase() === "true" || String(val) === "1";
}

const config = {
    // Core credentials
    token: process.env.TOKEN || "",
    clientId: process.env.CLIENT_ID || "",
    botOwnerId: process.env.BOT_OWNER_ID || process.env.OWNER_ID || "1466871611893219455",

    // Guild restrictions
    allowedGuildIds: (process.env.ALLOWED_GUILD_IDS || "")
        .split(",")
        .map(id => id.trim())
        .filter(Boolean),

    // Feature Flags
    features: {
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
console.log(`- Allowed Guilds      : ${config.allowedGuildIds.length > 0 ? config.allowedGuildIds.join(", ") : "All Guilds (Unrestricted)"}`);
console.log("========================================");

module.exports = config;
