const mongoose = require("mongoose");

const linkSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    url: {
        type: String,
        required: true
    },

    category: {
        type: String,
        default: "General"
    },

    addedBy: {
        type: String,
        required: true
    },

    addedById: {
        type: String,
        required: true
    },

    favorites: {
    type: Number,
    default: 0
    },

    discordMessageId: {
    type: String,
    default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Link", linkSchema);