const mongoose = require("mongoose");

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
    }
}, { timestamps: true });

module.exports = mongoose.model("BotSettings", botSettingsSchema);
