const galleries = new Map();

function open(messageId, data) {

    galleries.set(messageId, {
        ...data,
        index: 0
    });

}

function get(messageId) {

    return galleries.get(messageId);

}

function setIndex(messageId, index) {

    const gallery = galleries.get(messageId);

    if (!gallery) return;

    gallery.index = index;

}

function next(messageId) {

    const gallery = galleries.get(messageId);

    if (!gallery) return;

    gallery.index =
        (gallery.index + 1) % gallery.items.length;

    return gallery;

}

function previous(messageId) {

    const gallery = galleries.get(messageId);

    if (!gallery) return;

    gallery.index--;

    if (gallery.index < 0)
        gallery.index = gallery.items.length - 1;

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
    close

};