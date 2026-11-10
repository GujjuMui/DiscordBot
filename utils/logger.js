const { EmbedBuilder } = require("discord.js");
const settings = require("../config/settings");
const { COLORS } = require("../config/constants");

const LOG_TYPES = {
    CARD_CREATE: [COLORS.PRIMARY, "✅ CARD CREATED"],
    CARD_EDIT: ["#f1c40f", "⚠️ CARD EDITED"],
    CARD_DELETE: [COLORS.ERROR, "🗑️ CARD DELETED"],
    ART_CREATE: [COLORS.PRIMARY, "✅ ART CREATED"],
    ART_EDIT: ["#f1c40f", "⚠️ ART EDITED"],
    ART_DELETE: [COLORS.ERROR, "🗑️ ART DELETED"],
    LINK_CREATE: [COLORS.PRIMARY, "✅ LINK CREATED"],
    LINK_DELETE: [COLORS.ERROR, "🗑️ LINK DELETED"],
    TRUST_ADD: [COLORS.INFO, "ℹ️ TRUST ADDED"],
    TRUST_REMOVE: ["#e67e22", "⚠️ TRUST REMOVED"],
    SETUP: ["#9b59b6", "⚙️ SETUP EXECUTED"],
    VERIFY: [COLORS.PRIMARY, "✅ USER VERIFIED"],
    CLAN_JOIN: [COLORS.PRIMARY, "✅ CLAN JOIN"],
    TRYOUT_PASS: [COLORS.SUCCESS, "✅ TRYOUT PASS"],
    TRYOUT_FAIL: ["#ED4245", "🗑️ TRYOUT FAIL"],
    MEMBER_ADD: [COLORS.SUCCESS, "✅ MEMBER ADDED"],
    MEMBER_REMOVE: ["#ED4245", "🗑️ MEMBER REMOVED"],
    MEMBER_TRANSFER: [COLORS.WARNING, "ℹ️ MEMBER TRANSFERRED"],
    SELFROLE_COLOR: [COLORS.BRAND, "🎨 COLOR ROLE UPDATED"],
    SELFROLE_FACTION: ["#F1C40F", "⚔️ FACTION UPDATED"],
    SELFROLE_PING: [COLORS.INFO, "🔔 PING ROLES UPDATED"],
    SELFROLE_PING_REMOVE: [COLORS.ERROR, "🗑️ PING ROLES CLEARED"]
};

module.exports = async ({
    guild,
    type,
    user,
    id,
    title,
    field,
    oldValue,
    newValue,
    fields
}) => {
    if (!guild || !user) return;

    // settings.channels.logs may be a channel ID (numeric) or a
    // channel name — resolve by ID first, then by name, and only use
    // the channel if it is actually a text channel we can send in.
    const logsTarget = settings.channels.logs;
    const channel = /^\d+$/.test(String(logsTarget || ""))
        ? (guild.channels.cache.get(logsTarget) || await guild.channels.fetch(logsTarget).catch(() => null))
        : guild.channels.cache.find(item => item.name === logsTarget);

    if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased()) return;

    const [color, heading] = LOG_TYPES[type] || [
        COLORS.INFO,
        type || "HORNET LOG"
    ];

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(heading)
        .setTimestamp()
        .setFooter({ text: "HORNET Logs" });

    if (id) {
        embed.addFields({
            name: "🪪 ID",
            value: String(id),
            inline: true
        });
    }

    if (title) {
        embed.addFields({
            name: "Name",
            value: String(title),
            inline: true
        });
    }

    if (field) {
        embed.addFields({
            name: "✏️ Field",
            value: String(field),
            inline: true
        });
    }

    if (oldValue !== undefined) {
        embed.addFields({
            name: "◀️ Old",
            value: String(oldValue),
            inline: true
        });
    }

    if (newValue !== undefined) {
        embed.addFields({
            name: "▶️ New",
            value: String(newValue),
            inline: true
        });
    }

    if (Array.isArray(fields) && fields.length) {
        embed.addFields(fields);
    }

    embed.addFields({
        name: "👤 Performed By",
        value: `<@${user.id}>`
    });

    try {
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error("[logger] Failed to send log message:", err.message);
    }
};
