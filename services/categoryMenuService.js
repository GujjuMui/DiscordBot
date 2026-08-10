const menus = new Map();

module.exports = {

    open(messageId, data) {

        menus.set(messageId, {

            page: 0,

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