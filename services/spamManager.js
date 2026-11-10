// Spam sessions, one per guild. The old module kept a single global
// session, so a /spam in one server could stop (or be stopped by)
// a session in another server. The API is unchanged for single-guild
// use: start/stop/isRunning/isTargetReply all accept an optional
// guildId and fall back to "any guild" when it is omitted.
const sessions = new Map(); // guildId -> { targetUserId, channelId }

function key(guildId) {
    return guildId || "__default__";
}

module.exports = {

    start(userId, targetChannelId, guildId) {
        sessions.set(key(guildId), {
            targetUserId: userId,
            channelId: targetChannelId
        });
    },

    stop(guildId) {
        if (guildId) {
            sessions.delete(key(guildId));
        } else {
            sessions.clear();
        }
    },

    isRunning(guildId) {
        if (guildId) return sessions.has(key(guildId));
        return sessions.size > 0;
    },

    isTargetReply(message) {
        if (!message.guild) return false;
        if (message.author.bot) return false;

        const session = sessions.get(key(message.guild.id)) || sessions.get("__default__");
        if (!session) return false;

        return (
            message.author.id === session.targetUserId &&
            message.channel.id === session.channelId
        );
    }

};
