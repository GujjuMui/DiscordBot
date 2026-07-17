const mongoose = require("mongoose");

const trustedSchema = new mongoose.Schema({

    targetId: {
        type: String,
        required: true,
        unique: true
    },

    type: {
        type: String,
        enum: ["user", "role"],
        required: true
    }

});

module.exports = mongoose.model("Trusted", trustedSchema);