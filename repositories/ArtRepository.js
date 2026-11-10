// Art repository — see CardRepository.js for the layer's conventions
// (.lean() reads, duplicate-key 11000 handled gracefully).
const Art = require("../database/Art");

function isDuplicateKey(err) {
    return err && (err.code === 11000 || err.code === 11001);
}

module.exports = {
    async create(data) {
        try {
            const art = await Art.create(data);
            return art.toObject ? art.toObject() : art;
        } catch (err) {
            if (isDuplicateKey(err)) {
                const error = new Error(`An artwork with ID ${data.artId} already exists.`);
                error.code = 11000;
                error.cause = err;
                throw error;
            }
            throw err;
        }
    },

    async findByCode(artId) {
        if (!artId) return null;
        return Art.findOne({ artId: String(artId).toUpperCase() }).lean();
    },

    async findById(id) {
        if (!id) return null;
        return Art.findById(id).lean();
    },

    async update(artId, patch) {
        if (!artId) return null;
        return Art.findOneAndUpdate(
            { artId: String(artId).toUpperCase() },
            { $set: patch },
            { new: true }
        ).lean();
    },

    async delete(artId) {
        if (!artId) return null;
        return Art.findOneAndDelete({ artId: String(artId).toUpperCase() }).lean();
    },

    async listByCategory(category, { limit = 200 } = {}) {
        return Art.find({ category })
            .sort({ createdAt: -1 })
            .select("artId artName category tags imageFile uploaderId discordMessageId messageUrl favorites createdAt")
            .limit(limit)
            .lean();
    },

    // Distinct categories — used by the shared category cache and the
    // gallery service instead of an unbounded find() mapped in memory.
    async distinctCategories() {
        return Art.distinct("category");
    },

    // All artwork, oldest first — used by /refreshgallery.
    async listAll() {
        return Art.find().sort({ createdAt: 1 }).lean();
    },

    // Atomic favourite increment for the gallery favourite button.
    async incrementFavorites(id) {
        if (!id) return null;
        return Art.findByIdAndUpdate(id, { $inc: { favorites: 1 } }).lean();
    },

    // Bulk write (used by migrateCloudinary.js for the image-URL updates).
    async bulkWrite(operations) {
        if (!operations?.length) return null;
        return Art.bulkWrite(operations);
    },

    // All art IDs matching a prefix — the idGenerator fallback scan
    // (only used when the atomic Counter errors).
    async findIdsByPrefix(prefix) {
        if (!prefix) return [];
        const docs = await Art.find({ artId: new RegExp("^" + prefix + "-\\d+$", "i") })
            .select({ artId: 1 })
            .lean();
        return docs.map(doc => doc.artId);
    }
};
