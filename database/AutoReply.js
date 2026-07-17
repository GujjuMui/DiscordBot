const mongoose = require("mongoose");

const autoReplySchema = new mongoose.Schema({

    targetId: {
        type: String,
        required: true,
        unique: true
    },

    reply: {
        type: String,
        required: true
    },

    cooldown: {
        type: Number,
        default: 3600000 // 1 hour
    },

    enabled: {
        type: Boolean,
        default: true
    },

    createdBy: {
        type: String,
        required: true
    },

    createdById: {
        type: String,
        required: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("AutoReply", autoReplySchema);