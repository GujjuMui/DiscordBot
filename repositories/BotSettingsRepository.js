// BotSettings repository — used by config/configLoader.js for the
// per-guild DB overrides. Returns lean plain objects (or null).
const BotSettings = require("../database/BotSettings");

module.exports = {
    async findOne(filter) {
        if (!filter) return null;
        return BotSettings.findOne(filter).lean();
    },

    async findOneAndUpdate(filter, update, options = {}) {
        if (!filter) return null;
        const doc = await BotSettings.findOneAndUpdate(filter, update, options);
        return doc && doc.toObject ? doc.toObject() : doc;
    }
};
