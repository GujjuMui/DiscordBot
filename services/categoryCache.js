// Shared 5-minute TTL cache for distinct('category') results.
// /cards, /arts and /links used to run an unbounded find() and map
// categories in memory on every invocation; now they share one
// distinct() call per model per 5 minutes. galleryButtonHandler's
// Back branch reuses the same cache.
const { CACHE_TTL_MS } = require("../config/constants");

const cache = new Map(); // modelName -> { categories, fetchedAt }

// `source` is a repository (preferred — it exposes distinctCategories())
// or, for backwards compatibility, a raw Mongoose model.
async function getCategories(source, modelName) {
    const now = Date.now();
    const cached = cache.get(modelName);
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.categories;
    const categories = (typeof source.distinctCategories === "function"
        ? await source.distinctCategories()
        : await source.distinct("category")).filter(Boolean).sort();
    cache.set(modelName, { categories, fetchedAt: now });
    return categories;
}

function invalidateCategories(modelName) {
    if (modelName) cache.delete(modelName);
    else cache.clear();
}

module.exports = { getCategories, invalidateCategories };
