const cooldowns = new Map();

module.exports = {

    canReply(userId, cooldown) {

        const lastReply = cooldowns.get(userId);

        if (!lastReply)
            return true;

        return (Date.now() - lastReply) >= cooldown;

    },

    update(userId) {

        cooldowns.set(userId, Date.now());

    },

    clear(userId) {

        cooldowns.delete(userId);

    }

};