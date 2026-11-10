// SelfRoleMessage repository — used by /selfroles setup/refresh.
// Returns lean plain objects (or null).
const SelfRoleMessage = require("../database/SelfRoleMessage");

module.exports = {
    async findOne(filter) {
        if (!filter) return null;
        return SelfRoleMessage.findOne(filter).lean();
    },

    async findOneAndUpdate(filter, update, options = {}) {
        if (!filter) return null;
        const doc = await SelfRoleMessage.findOneAndUpdate(filter, update, options);
        return doc && doc.toObject ? doc.toObject() : doc;
    }
};
