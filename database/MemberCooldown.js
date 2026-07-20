const { Schema, model } = require("mongoose");

const memberCooldownSchema = new Schema({

    userId: {
        type: String,
        required: true,
        unique: true
    },

    uses: {
        type: Number,
        default: 0
    },

    cooldownUntil: {
        type: Date,
        default: null
    }

}, {

    timestamps: true

});

module.exports = model("MemberCooldown", memberCooldownSchema);