const AutoReply = require("../database/AutoReply");
const cooldown = require("../services/autoReplyCooldown");
const spamManager = require("../services/spamManager");

module.exports = async (message) => {

    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    // =========================
    // SPAM AUTO-STOP
    // =========================

    if (spamManager.isTargetReply(message)) {

        console.log(
            `🛑 Spam stopped because ${message.author.tag} replied in the spam channel.`
        );

        spamManager.stop();

        return;

    }

    // =========================
    // AUTO REPLY
    // =========================

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