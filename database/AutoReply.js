const mongoose = require("mongoose");

const autoReplySchema = new mongoose.Schema({

    targetId: {
        type: String,
        required: true,
        unique: true
    },

    // Reply when the configured user sends a message
    reply: {
        type: String,
        default: ""
    },

    // Reply when someone mentions the configured user
    mentionReply: {
        type: String,
        default: ""
    },

    cooldown: {
        type: Number,
        default: 21600000
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