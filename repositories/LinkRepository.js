// Link repository — see CardRepository.js for the layer's conventions
// (.lean() reads, duplicate-key 11000 handled gracefully).
// Links are keyed by title (not a generated code), so update/delete
// take the title exactly as stored — callers must not uppercase it.
const Link = require("../database/Link");

function isDuplicateKey(err) {
    return err && (err.code === 11000 || err.code === 11001);
}

module.exports = {
    async create(data) {
        try {
            const link = await Link.create(data);
            return link.toObject ? link.toObject() : link;
        } catch (err) {
            if (isDuplicateKey(err)) {
                const error = new Error(`A link titled "${data.title}" already exists.`);
                error.code = 11000;
                error.cause = err;
                throw error;
            }
            throw err;
        }
    },

    async findByTitle(title) {
        if (!title) return null;
        return Link.findOne({ title }).lean();
    },

    async findById(id) {
        if (!id) return null;
        return Link.findById(id).lean();
    },

    async update(title, patch) {
        if (!title) return null;
        return Link.findOneAndUpdate(
            { title },
            { $set: patch },
            { new: true }
        ).lean();
    },

    async delete(title) {
        if (!title) return null;
        return Link.findOneAndDelete({ title }).lean();
    },

    async listByCategory(category, { limit = 200 } = {}) {
        return Link.find({ category })
            .sort({ createdAt: -1 })
            .select("title url category addedBy addedById discordMessageId favorites createdAt")
            .limit(limit)
            .lean();
    },

    // Distinct categories — used by the shared category cache and the
    // gallery service instead of an unbounded find() mapped in memory.
    async distinctCategories() {
        return Link.distinct("category");
    }
};
