const cooldown = require("../services/autoReplyCooldown");
const spamManager = require("../services/spamManager");
const { getAutoReplies } = require("../services/autoReplyCache");

async function sendAutoReply(message, text, key, cooldownMs) {
    if (!text || !cooldown.canReply(key, cooldownMs)) {
        return false;
    }

    try {
        await message.reply({ content: text, allowedMentions: { parse: [] } });
    } catch (err) {
        // A deleted message / missing permission must not kill the
        // handler — the reply simply did not go out.
        console.error("[messageCreate] Failed to send auto-reply:", err.message);
        return false;
    }
    cooldown.update(key);
    return true;
}

module.exports = async message => {
    if (message.author.bot || !message.guild) return;

    if (spamManager.isTargetReply(message)) {
        console.log(
            `🛑 Spam stopped because ${message.author.tag} replied in the spam channel.`
        );
        spamManager.stop(message.guild.id);
        return;
    }

    // ONE cached query for all enabled auto-replies (60s TTL), instead
    // of a findOne per mention plus one for the author on every message.
    let replies;
    try {
        replies = await getAutoReplies();
    } catch (err) {
        console.error("[messageCreate] Failed to load auto-replies:", err.message);
        return;
    }

    for (const [userId] of message.mentions.users) {
        if (userId === message.author.id) continue;

        const autoReply = replies.get(userId);
        if (!autoReply?.mentionReply) continue;

        const sent = await sendAutoReply(
            message,
            autoReply.mentionReply,
            `mention:${userId}`,
            autoReply.cooldown
        );

        if (sent) break;
    }

    const autoReply = replies.get(message.author.id);
    if (!autoReply?.reply) return;

    await sendAutoReply(
        message,
        autoReply.reply,
        `normal:${message.author.id}`,
        autoReply.cooldown
    );
};
