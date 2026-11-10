const menus = new Map();

// Prune category menu entries older than the TTL to prevent indefinite growth.
const { MENU_TTL_MS } = require("../config/constants");

function pruneExpired() {
    const cutoff = Date.now() - MENU_TTL_MS;
    for (const [id, menu] of menus) {
        if (menu.openedAt < cutoff) {
            menus.delete(id);
        }
    }
}

module.exports = {

    open(messageId, data) {

        pruneExpired();

        // Cap the menu table: evict the oldest entry when full.
        if (menus.size >= 500) {
            const oldest = menus.keys().next().value;
            if (oldest !== undefined) menus.delete(oldest);
        }

        menus.set(messageId, {

            page: 0,

            openedAt: Date.now(),

            ...data

        });

    },

    get(messageId) {

        pruneExpired();

        return menus.get(messageId);

    },

    next(messageId) {

        const menu = menus.get(messageId);

        if (!menu) return;

        const maxPage =
            Math.ceil(menu.categories.length / 25) - 1;

        if (menu.page < maxPage)

            menu.page++;

    },

    previous(messageId) {

        const menu = menus.get(messageId);

        if (!menu) return;

        if (menu.page > 0)

            menu.page--;

    },

    remove(messageId) {

        menus.delete(messageId);

    },

    pruneExpired,

    // Alias used by the index.js 5-minute sweeper.
    prune: pruneExpired

};