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
    // MENTION AUTO REPLY
    // =========================

    const mentionedUsers = message.mentions.users;

    if (mentionedUsers.size > 0) {

        for (const [userId] of mentionedUsers) {

            // Don't trigger if the mentioned user is the person
            // who sent the message
            if (userId === message.author.id) continue;

            const mentionedAutoReply =
                await AutoReply.findOne({

                    targetId: userId,

                    enabled: true

                });

            if (!mentionedAutoReply) continue;

            // No mention reply configured
            if (!mentionedAutoReply.mentionReply) continue;

            const cooldownKey =
                `mention:${userId}`;

            if (!cooldown.canReply(
                cooldownKey,
                mentionedAutoReply.cooldown
            )) {

                continue;

            }

            await message.reply(
                mentionedAutoReply.mentionReply
            );

            cooldown.update(cooldownKey);

            // Only one automatic mention reply per message
            break;

        }

    }

    // =========================
    // NORMAL MESSAGE AUTO REPLY
    // =========================

    const autoReply = await AutoReply.findOne({

        targetId: message.author.id,

        enabled: true

    });

    if (!autoReply) return;

// No normal-message reply configured
if (!autoReply.reply) return;

if (!cooldown.canReply(
    `normal:${message.author.id}`,
    autoReply.cooldown
)) {

    return;

}

await message.reply(autoReply.reply);

cooldown.update(
    `normal:${message.author.id}`
);

};