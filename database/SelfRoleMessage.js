const { Schema, model } = require("mongoose");

const selfRoleSchema = new Schema({

    guildId: {
        type: String,
        required: true,
        unique: true
    },

    channelId: String,

    messageId: String

});

module.exports = model("SelfRoleMessage", selfRoleSchema);