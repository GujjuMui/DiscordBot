// In-memory TTL cache of enabled AutoReply documents, so
// messageCreate no longer fires a findOne per mention plus one for
// the author on every single message. The /autoreply command
// invalidates it after add/remove.
const AutoReplyRepository = require("../repositories/AutoReplyRepository");
const { CACHE_TTL_MS } = require("../config/constants");

let cached = null; // Map<targetId, doc> | null
let fetchedAt = 0;

async function getAutoReplies() {
    const now = Date.now();
    if (cached && now - fetchedAt < CACHE_TTL_MS) return cached;
    const docs = await AutoReplyRepository.findEnabled();
    cached = new Map(docs.map(doc => [doc.targetId, doc]));
    fetchedAt = now;
    return cached;
}

function invalidateAutoReplyCache() {
    cached = null;
    fetchedAt = 0;
}

module.exports = { getAutoReplies, invalidateAutoReplyCache };
