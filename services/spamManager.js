let running = false;

let targetUserId = null;
let channelId = null;

module.exports = {

    start(userId, targetChannelId) {

        running = true;

        targetUserId = userId;
        channelId = targetChannelId;

    },

    stop() {

        running = false;

        targetUserId = null;
        channelId = null;

    },

    isRunning() {

        return running;

    },

    isTargetReply(message) {

        if (!running) return false;

        if (!message.guild) return false;

        if (message.author.bot) return false;

        return (
            message.author.id === targetUserId &&
            message.channel.id === channelId
        );

    }

};