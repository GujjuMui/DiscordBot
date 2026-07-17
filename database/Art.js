const mongoose = require("mongoose");

const artSchema = new mongoose.Schema({

    artId: {
        type: String,
        unique: true
    },

    artName: {
        type: String,
        required: true
    },

    category: {
        type: String,
        required: true
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

    messageUrl: {
        type: String,
        default: ""
    },

    favorites: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Art", artSchema);