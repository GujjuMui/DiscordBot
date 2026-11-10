// Prune stale in-memory gallery / menu / auto-reply state on an
// interval so long uptimes cannot grow these Maps without bound.
// Unref'd so it never keeps the process alive on its own. The typeof
// guard keeps the VM test harness (no setInterval global) loading
// callers of this module. Returns the timer, or null when timers are
// unavailable.
function startSweeper(intervalMs = 5 * 60 * 1000) {
    if (typeof setInterval !== "function") return null;
    const timer = setInterval(() => {
        try {
            require("./galleryV2").prune();
            require("./categoryMenuService").prune();
            require("./autoReplyCooldown").pruneExpired();
        } catch (err) {
            console.error("[sweeper] Failed to prune state:", err.message);
        }
    }, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return timer;
}

module.exports = { startSweeper };
