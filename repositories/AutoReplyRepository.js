// AutoReply repository — see CardRepository.js for the layer's conventions
// (.lean() reads, duplicate-key 11000 handled gracefully, null-safe inputs).
const AutoReply = require("../database/AutoReply");

function isDuplicateKey(err) {
    return err && (err.code === 11000 || err.code === 11001);
}

module.exports = {
    async findOne(filter) {
        if (!filter) return null;
        return AutoReply.findOne(filter).lean();
    },

    async create(data) {
        try {
            const doc = await AutoReply.create(data);
            return doc.toObject ? doc.toObject() : doc;
        } catch (err) {
            if (isDuplicateKey(err)) {
                const error = new Error(
                    `An auto reply for ${data?.targetId} already exists.`
                );
                error.code = 11000;
                error.cause = err;
                throw error;
            }
            throw err;
        }
    },

    async findOneAndDelete(filter) {
        if (!filter) return null;
        return AutoReply.findOneAndDelete(filter).lean();
    },

    // All enabled replies — the in-memory cache in autoReplyCache.
    async findEnabled() {
        return AutoReply.find({ enabled: true }).lean();
    },

    // All replies, oldest first, capped — used by /autoreply list.
    async listAll({ limit = 100 } = {}) {
        return AutoReply.find().sort({ createdAt: 1 }).lean().limit(limit);
    }
};
