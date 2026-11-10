const CardRepository = require("../repositories/CardRepository");
const ArtRepository = require("../repositories/ArtRepository");
const CounterRepository = require("../repositories/CounterRepository");

// Primary ID source: an atomic Counter document, advanced with a
// single findOneAndUpdate $inc. This fixes two bugs in the old
// regex scan: (1) a lexicographic sort put SFA-9 ahead of SFA-10,
// so IDs could repeat after SFA-9; (2) two concurrent saves could
// read the same "last" ID and collide. If the counter errors, fall
// back to the old scan (numeric sort, not lexicographic).
async function nextSequence(name) {
    return CounterRepository.nextSequence(name);
}

// `repository` is the Card/Art repository for the fallback scan.
async function generateNextId(repository, field, prefix, counterName) {
    try {
        const nextNumber = await nextSequence(counterName);
        return prefix + "-" + String(nextNumber).padStart(6, "0");
    } catch (err) {
        console.error(`[idGenerator] Counter failed for ${counterName}, falling back to scan:`, err.message);
    }

    // Fallback: scan all matching IDs and take the numeric maximum.
    const ids = await repository.findIdsByPrefix(prefix);
    let max = 0;
    for (const id of ids) {
        const match = String(id).match(/-(\d+)$/);
        if (match) max = Math.max(max, Number.parseInt(match[1], 10));
    }
    return prefix + "-" + String(max + 1).padStart(6, "0");
}

async function generateCardId() {
    return generateNextId(CardRepository, "cardId", "SFA", "card");
}

async function generateArtId() {
    return generateNextId(ArtRepository, "artId", "ART", "art");
}

module.exports = {
    generateCardId,
    generateArtId
};
