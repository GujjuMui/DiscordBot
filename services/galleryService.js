const galleries = new Map();

function open(userId, type, items) {

    galleries.set(userId, {
        type,
        items,
        index: 0
    });

}

function get(userId) {
    return galleries.get(userId);
}

function next(userId) {

    const gallery = galleries.get(userId);

    if (!gallery) return null;

    gallery.index++;

    if (gallery.index >= gallery.items.length) {
        gallery.index = 0;
    }

    return gallery;
}

function previous(userId) {

    const gallery = galleries.get(userId);

    if (!gallery) return null;

    gallery.index--;

    if (gallery.index < 0) {
        gallery.index = gallery.items.length - 1;
    }

    return gallery;
}

function close(userId) {
    galleries.delete(userId);
}

module.exports = {
    open,
    get,
    next,
    previous,
    close
};