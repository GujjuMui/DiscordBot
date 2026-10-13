const menus = new Map();

// Prune category menu entries older than 30 minutes to prevent indefinite growth.
const MENU_TTL_MS = 30 * 60 * 1000;

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

        menus.set(messageId, {

            page: 0,

            openedAt: Date.now(),

            ...data

        });

    },

    get(messageId) {

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

    }

};