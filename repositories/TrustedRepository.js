// Trusted repository — see CardRepository.js for the layer's conventions
// (.lean() reads, duplicate-key 11000 handled gracefully, null-safe inputs).
const Trusted = require("../database/Trusted");

function isDuplicateKey(err) {
    return err && (err.code === 11000 || err.code === 11001);
}

module.exports = {
    async findOne(filter) {
        if (!filter) return null;
        return Trusted.findOne(filter).lean();
    },

    async create(data) {
        try {
            const doc = await Trusted.create(data);
            return doc.toObject ? doc.toObject() : doc;
        } catch (err) {
            if (isDuplicateKey(err)) {
                const error = new Error(
                    `Trusted entry for ${data?.targetId} already exists.`
                );
                error.code = 11000;
                error.cause = err;
                throw error;
            }
            throw err;
        }
    },

    // Returns the raw Mongo result ({ deletedCount }) — callers check
    // deletedCount === 0 to report "not found".
    async deleteOne(filter) {
        if (!filter) return { deletedCount: 0 };
        return Trusted.deleteOne(filter);
    },

    // All trusted entries, lean, capped — used by /trustedlist.
    async listAll({ limit = 100 } = {}) {
        return Trusted.find().lean().limit(limit);
    },

    // All entries with only the fields the permission check needs.
    async listIdentifiers() {
        return Trusted.find().select("targetId type").lean();
    }
};
