const Card = require("../database/Card");
const Art = require("../database/Art");

async function generateCardId() {

    const lastCard = await Card.findOne()
        .sort({ cardId: -1 });

    let nextNumber = 1;

    if (lastCard) {

        nextNumber =
            parseInt(lastCard.cardId.split("-")[1], 10) + 1;

    }

    return `SFA-${String(nextNumber).padStart(6, "0")}`;

}

async function generateArtId() {

    const lastArt = await Art.findOne()
        .sort({ artId: -1 });

    let nextNumber = 1;

    if (lastArt) {

        nextNumber =
            parseInt(lastArt.artId.split("-")[1], 10) + 1;

    }

    return `ART-${String(nextNumber).padStart(6, "0")}`;

}

module.exports = {

    generateCardId,
    generateArtId

};