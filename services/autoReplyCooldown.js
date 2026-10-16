const cooldowns = new Map();

// Prune entries older than the longest possible cooldown (24 hours) to
// prevent the Map from growing indefinitely over long bot uptimes.
const MAX_TTL_MS = 24 * 60 * 60 * 1000;

function pruneExpired() {
    const now = Date.now();
    for (const [userId, lastReply] of cooldowns) {
        if (now - lastReply >= MAX_TTL_MS) {
            cooldowns.delete(userId);
        }
    }
}

module.exports = {

    canReply(userId, cooldown) {

        pruneExpired();

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