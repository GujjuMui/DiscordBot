// Repository index — the single place data access is assembled.
// core/context.js exposes this as ctx.repositories; handlers and
// commands should require the individual repository they need
// (e.g. require("../repositories/CardRepository")) rather than a
// Mongoose model. No file outside repositories/ and database/ may
// require a database/* model.
module.exports = {
    card: require("./CardRepository"),
    art: require("./ArtRepository"),
    link: require("./LinkRepository"),
    trusted: require("./TrustedRepository"),
    autoReply: require("./AutoReplyRepository"),
    memberCooldown: require("./MemberCooldownRepository"),
    botSettings: require("./BotSettingsRepository"),
    selfRole: require("./SelfRoleMessageRepository"),
    counter: require("./CounterRepository")
};
