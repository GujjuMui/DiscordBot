// Counter repository — the atomic sequence source for utils/idGenerator.js.
// nextSequence advances one named sequence with a single findOneAndUpdate
// $inc (upsert), so two concurrent /savecard calls can never receive the
// same number. Returns the new sequence value.
const Counter = require("../database/Counter");

module.exports = {
    async nextSequence(name) {
        if (!name) throw new Error("Counter name is required.");
        const doc = await Counter.findOneAndUpdate(
            { _id: name },
            { $inc: { seq: 1 } },
            { upsert: true, new: true }
        );
        return doc.seq;
    }
};
