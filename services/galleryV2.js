const galleries = new Map();

// Prune gallery entries older than the TTL. Discord interactions expire
// after 15 minutes, so any entry older than 30 minutes is guaranteed stale.
const { GALLERY_TTL_MS } = require("../config/constants");

function pruneExpired() {
    const cutoff = Date.now() - GALLERY_TTL_MS;
    for (const [id, gallery] of galleries) {
        if (gallery.openedAt < cutoff) {
            galleries.delete(id);
        }
    }
}

function open(messageId, data) {
    pruneExpired();
    // Cap the gallery table: evict the oldest entry when full so a
    // long uptime cannot grow this Map without bound.
    if (galleries.size >= 500) {
        const oldest = galleries.keys().next().value;
        if (oldest !== undefined) galleries.delete(oldest);
    }
    galleries.set(messageId, {
        ...data,
        index: 0,
        openedAt: Date.now()
    });
}

function get(messageId) {
    pruneExpired();
    return galleries.get(messageId);
}

function setIndex(messageId, index) {
    const gallery = galleries.get(messageId);
    if (!gallery) return;

    gallery.index = index;
}

function next(messageId) {
    const gallery = galleries.get(messageId);
    if (!gallery || !gallery.items?.length) return;

    gallery.index = (gallery.index + 1) % gallery.items.length;
    return gallery;
}

function previous(messageId) {
    const gallery = galleries.get(messageId);
    if (!gallery || !gallery.items?.length) return;

    gallery.index =
        (gallery.index - 1 + gallery.items.length) % gallery.items.length;

    return gallery;
}

function close(messageId) {
    galleries.delete(messageId);
}

module.exports = {
    open,
    get,
    setIndex,
    next,
    previous,
    close,
    pruneExpired,
    // Alias used by the index.js 5-minute sweeper.
    prune: pruneExpired,
};
