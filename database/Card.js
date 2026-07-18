const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema({
    cardId: {
        type: String,
        unique: true
    },

    cardName: {
        type: String,
        required: true
    },

    character: {
        type: String,
        required: true
    },

    category: {
        type: String,
        default: "General"
    },

    tags: {
        type: [String],
        default: []
    },

    imageFile: {
        type: String,
        required: true
    },

    uploader: {
        type: String,
        required: true
    },

    uploaderId: {
        type: String,
        required: true
    },

    discordMessageId: {
        type: String,
        default: null
    },

    favorites: {
        type: Number,
        default: 0
    },

    messageUrl: {
        type: String,
        default: ""
    },

}, {
    timestamps: true
});

module.exports = mongoose.model("Card", cardSchema);