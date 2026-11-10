// Centralised bot-owner definition.
// The owner ID lives ONLY in the BOT_OWNER_ID environment variable
// (read by config/config.js). There is no hardcoded fallback here or
// anywhere else — if it is unset, ownerId is "" and owner-only
// checks fail closed. Every owner check in the codebase goes through
// `owner.ownerId` from this module.
const config = require("./config");

module.exports = {
    get ownerId() {
        return config.botOwnerId || "";
    }
};
