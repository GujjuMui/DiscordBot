const { Schema, model } = require("mongoose");

// Atomic sequence counter used by utils/idGenerator.js.
// One document per sequence name (e.g. "card", "art"); the sequence is
// advanced with a single findOneAndUpdate $inc, so two concurrent
// /savecard calls can never receive the same number.
const counterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

module.exports = model("Counter", counterSchema);
