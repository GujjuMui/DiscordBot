const { EmbedBuilder } = require("discord.js");
const settings = require("../config/settings");

const LOG_TYPES = {
    CARD_CREATE: ["#2ecc71", "✅ CARD CREATED"],
    CARD_EDIT: ["#f1c40f", "⚠️ CARD EDITED"],
    CARD_DELETE: ["#e74c3c", "🗑️ CARD DELETED"],
    ART_CREATE: ["#2ecc71", "✅ ART CREATED"],
    ART_EDIT: ["#f1c40f", "⚠️ ART EDITED"],
    ART_DELETE: ["#e74c3c", "🗑️ ART DELETED"],
    LINK_CREATE: ["#2ecc71", "✅ LINK CREATED"],
    LINK_DELETE: ["#e74c3c", "🗑️ LINK DELETED"],
    TRUST_ADD: ["#3498db", "ℹ️ TRUST ADDED"],
    TRUST_REMOVE: ["#e67e22", "⚠️ TRUST REMOVED"],
    SETUP: ["#9b59b6", "⚙️ SETUP EXECUTED"],
    VERIFY: ["#2ecc71", "✅ USER VERIFIED"],
    CLAN_JOIN: ["#2ecc71", "✅ CLAN JOIN"],
    TRYOUT_PASS: ["#57F287", "✅ TRYOUT PASS"],
    TRYOUT_FAIL: ["#ED4245", "🗑️ TRYOUT FAIL"],
    MEMBER_ADD: ["#57F287", "✅ MEMBER ADDED"],
    MEMBER_REMOVE: ["#ED4245", "🗑️ MEMBER REMOVED"],
    MEMBER_TRANSFER: ["#FEE75C", "ℹ️ MEMBER TRANSFERRED"],
    SELFROLE_COLOR: ["#5865F2", "🎨 COLOR ROLE UPDATED"],
    SELFROLE_FACTION: ["#F1C40F", "⚔️ FACTION UPDATED"],
    SELFROLE_PING: ["#3498DB", "🔔 PING ROLES UPDATED"],
    SELFROLE_PING_REMOVE: ["#E74C3C", "🗑️ PING ROLES CLEARED"]
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

    const channel = guild.channels.cache.find(
        item => item.name === settings.channels.logs
    );

    if (!channel) return;

    const [color, heading] = LOG_TYPES[type] || [
        "#3498db",
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

    await channel.send({ embeds: [embed] });
};
