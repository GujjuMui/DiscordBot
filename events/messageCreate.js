const AutoReply = require("../database/AutoReply");
const cooldown = require("../services/autoReplyCooldown");

module.exports = async (message) => {

    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    const autoReply = await AutoReply.findOne({

        targetId: message.author.id,

        enabled: true

    });

    if (!autoReply) return;

    if (!cooldown.canReply(
        message.author.id,
        autoReply.cooldown
    )) {
        return;
    }

    await message.reply(autoReply.reply);

    cooldown.update(message.author.id);

};