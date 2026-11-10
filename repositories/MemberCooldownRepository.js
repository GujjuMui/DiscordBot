// MemberCooldown repository — thin wrapper over the model so the
// cooldown service never imports the model directly. The service's
// atomic $inc upsert lives here as findOneAndUpdate; updateOne is
// used for the expired-cooldown reset and the denied-attempt rollback.
const MemberCooldown = require("../database/MemberCooldown");

module.exports = {
    async updateOne(filter, update) {
        if (!filter) return null;
        return MemberCooldown.updateOne(filter, update);
    },

    async findOneAndUpdate(filter, update, options = {}) {
        if (!filter) return null;
        const doc = await MemberCooldown.findOneAndUpdate(filter, update, options);
        return doc && doc.toObject ? doc.toObject() : doc;
    }
};
