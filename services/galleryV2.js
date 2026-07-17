const galleries = new Map();

function open(userId, data) {

    galleries.set(userId, {
        ...data,
        index: 0
    });

}

function get(userId) {

    return galleries.get(userId);

}

function setIndex(userId, index) {

    const gallery = galleries.get(userId);

    if (!gallery) return;

    gallery.index = index;

}

function next(userId) {

    const gallery = galleries.get(userId);

    if (!gallery) return;

    gallery.index =
        (gallery.index + 1) % gallery.items.length;

    return gallery;

}

function previous(userId) {

    const gallery = galleries.get(userId);

    if (!gallery) return;

    gallery.index--;

    if (gallery.index < 0)
        gallery.index = gallery.items.length - 1;

    return gallery;

}

function close(userId) {

    galleries.delete(userId);

}

module.exports = {

    open,
    get,
    setIndex,
    next,
    previous,
    close

};