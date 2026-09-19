const AutoReply = require("../database/AutoReply");
const cooldown = require("../services/autoReplyCooldown");
const spamManager = require("../services/spamManager");

async function sendAutoReply(message, text, key, cooldownMs) {
    if (!text || !cooldown.canReply(key, cooldownMs)) {
        return false;
    }

    await message.reply(text);
    cooldown.update(key);
    return true;
}

module.exports = async message => {
    if (message.author.bot || !message.guild) return;

    if (spamManager.isTargetReply(message)) {
        console.log(
            `🛑 Spam stopped because ${message.author.tag} replied in the spam channel.`
        );
        spamManager.stop();
        return;
    }

    for (const [userId] of message.mentions.users) {
        if (userId === message.author.id) continue;

        const autoReply = await AutoReply.findOne({
            targetId: userId,
            enabled: true
        });

        if (!autoReply?.mentionReply) continue;

        const sent = await sendAutoReply(
            message,
            autoReply.mentionReply,
            `mention:${userId}`,
            autoReply.cooldown
        );

        if (sent) break;
    }

    const autoReply = await AutoReply.findOne({
        targetId: message.author.id,
        enabled: true
    });

    if (!autoReply?.reply) return;

    await sendAutoReply(
        message,
        autoReply.reply,
        `normal:${message.author.id}`,
        autoReply.cooldown
    );
};
