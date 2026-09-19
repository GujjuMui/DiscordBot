const Card = require("../database/Card");
const Art = require("../database/Art");

async function generateNextId(Model, field, prefix) {
    const lastDocument = await Model.findOne({
        [field]: new RegExp("^" + prefix + "-\\d+$", "i")
    })
        .sort({ [field]: -1 })
        .select({ [field]: 1 })
        .lean();

    let nextNumber = 1;

    if (lastDocument?.[field]) {
        const match = String(lastDocument[field]).match(/-(\d+)$/);
        if (match) {
            nextNumber = Number.parseInt(match[1], 10) + 1;
        }
    }

    return prefix + "-" + String(nextNumber).padStart(6, "0");
}

async function generateCardId() {
    return generateNextId(Card, "cardId", "SFA");
}

async function generateArtId() {
    return generateNextId(Art, "artId", "ART");
}

module.exports = {
    generateCardId,
    generateArtId
};
