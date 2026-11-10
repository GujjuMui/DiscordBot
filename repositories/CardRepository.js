// Repositories — thin data-access layer over the Mongoose models.
// Callers get plain objects (.lean()) on reads so no Mongoose document
// leaks into gallery state or embeds, and duplicate-key errors (11000)
// are surfaced as a clear, catchable error instead of a raw Mongo error.
const Card = require("../database/Card");

function isDuplicateKey(err) {
    return err && (err.code === 11000 || err.code === 11001);
}

function duplicateError(err, code) {
    const error = new Error(`A card with ID ${code} already exists.`);
    error.code = 11000;
    error.cause = err;
    return error;
}

module.exports = {
    async create(data) {
        try {
            const card = await Card.create(data);
            return card.toObject ? card.toObject() : card;
        } catch (err) {
            if (isDuplicateKey(err)) throw duplicateError(err, data.cardId);
            throw err;
        }
    },

    async findByCode(cardId) {
        if (!cardId) return null;
        return Card.findOne({ cardId: String(cardId).toUpperCase() }).lean();
    },

    async findById(id) {
        if (!id) return null;
        return Card.findById(id).lean();
    },

    async update(cardId, patch) {
        if (!cardId) return null;
        return Card.findOneAndUpdate(
            { cardId: String(cardId).toUpperCase() },
            { $set: patch },
            { new: true }
        ).lean();
    },

    async delete(cardId) {
        if (!cardId) return null;
        return Card.findOneAndDelete({ cardId: String(cardId).toUpperCase() }).lean();
    },

    async listByCategory(category, { limit = 200 } = {}) {
        return Card.find({ category })
            .sort({ createdAt: -1 })
            .select("cardId cardName character category tags imageFile uploaderId discordMessageId messageUrl favorites createdAt")
            .limit(limit)
            .lean();
    },

    // Distinct categories — used by the shared category cache and the
    // gallery service instead of an unbounded find() mapped in memory.
    async distinctCategories() {
        return Card.distinct("category");
    },

    // All cards, oldest first — used by /refreshgallery, which already
    // collects them into an array before refreshing 3 at a time.
    async listAll() {
        return Card.find().sort({ createdAt: 1 }).lean();
    },

    // Atomic favourite increment for the gallery favourite button.
    async incrementFavorites(id) {
        if (!id) return null;
        return Card.findByIdAndUpdate(id, { $inc: { favorites: 1 } }).lean();
    },

    // Bulk write (used by migrateCloudinary.js for the image-URL updates).
    async bulkWrite(operations) {
        if (!operations?.length) return null;
        return Card.bulkWrite(operations);
    },

    // All card IDs matching a prefix — the idGenerator fallback scan
    // (only used when the atomic Counter errors).
    async findIdsByPrefix(prefix) {
        if (!prefix) return [];
        const docs = await Card.find({ cardId: new RegExp("^" + prefix + "-\\d+$", "i") })
            .select({ cardId: 1 })
            .lean();
        return docs.map(doc => doc.cardId);
    }
};
