// Component router — replaces the O(n) sequential trial that used to
// live inline in index.js.
//
// Each handler file MAY export `customIdPrefixes`: exact customIds or
// prefixes (a trailing ":" or "_" entry is a prefix, e.g.
// "tryout_pass_" / "giverole_confirm:"). dispatch() first tries the
// handler(s) registered for the interaction's customId, in the
// original trial order, then falls back to trying every handler for
// the kind in order — so handlers with no prefixes, and legacy ids
// nobody registered, still work exactly as before. A handler that
// returns a truthy value has handled the interaction; anything else
// (false / undefined) falls through to the next handler.
//
// createRouter(handlerFiles, loadHandler) — loadHandler defaults to
// require()ing ./events/<name>; tests pass a fake loader instead, so
// the router is unit-testable without Discord.
const path = require("path");

function defaultLoader(name) {
    return require(path.join(__dirname, "..", "events", name));
}

function matchesPrefix(customId, prefix) {
    if (typeof customId !== "string" || typeof prefix !== "string") return false;
    return customId === prefix || customId.startsWith(prefix);
}

function createRouter(handlerFiles, loadHandler = defaultLoader) {
    const cache = new Map();

    function getHandler(name) {
        if (!cache.has(name)) cache.set(name, loadHandler(name));
        return cache.get(name);
    }

    // The old sequential semantics, kept verbatim: try each handler in
    // order until one returns truthy.
    async function runHandlers(names, interaction, ctx) {
        for (const name of names) {
            if (await getHandler(name)(interaction, ctx)) return true;
        }
        return false;
    }

    async function dispatch(kind, interaction, ctx) {
        const names = handlerFiles[kind] || [];
        const customId = interaction?.customId;
        const tried = new Set();

        if (typeof customId === "string") {
            for (const name of names) {
                const handler = getHandler(name);
                const prefixes = handler?.customIdPrefixes || [];
                if (prefixes.some(prefix => matchesPrefix(customId, prefix))) {
                    tried.add(name);
                    if (await handler(interaction, ctx)) return true;
                }
            }
        }

        for (const name of names) {
            if (tried.has(name)) continue;
            if (await getHandler(name)(interaction, ctx)) return true;
        }
        return false;
    }

    return { dispatch, runHandlers };
}

module.exports = { createRouter, matchesPrefix };
