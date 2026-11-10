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

trustedSchema.index({ type: 1, targetId: 1 });

module.exports = mongoose.model("Trusted", trustedSchema);