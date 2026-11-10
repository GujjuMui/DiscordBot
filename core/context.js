// Bot context — the single place a bot's dependencies are assembled.
// index.js creates one context and the router passes it as the SECOND
// argument to handlers (handler(interaction, ctx)); existing handlers
// ignore the extra argument, so nothing breaks. New code should take
// its dependencies from ctx instead of requiring config / settings /
// repositories / caches ad-hoc in every file — that is what makes
// handlers testable without the real DB or Discord.
//
// The object is frozen: handlers may read from it, never rewire it.
const config = require("../config/config");
const settings = require("../config/settings");
const repositories = require("../repositories");
const discord = require("../utils/discord");
const logger = require("../utils/logger");

function createContext(client) {
    return Object.freeze({
        client,
        config,
        settings,
        repositories,
        caches: Object.freeze({
            gallery: require("../services/galleryV2"),
            categoryMenu: require("../services/categoryMenuService"),
            autoReply: require("../services/autoReplyCache"),
            categories: require("../services/categoryCache")
        }),
        discord,
        logger
    });
}

module.exports = { createContext };
