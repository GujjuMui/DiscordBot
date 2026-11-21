// Welcome message posted when verification completes.
//
// Shared by the direct-grant Verify button flow
// (events/verificationButtonHandler.js) and the legacy modal flow
// (events/verificationModalHandler.js), so a verified member gets
// exactly one welcome in the guild's welcome channel.
//
// The channel is resolved (stored ID, then canonical name, then
// created under HORNET) — never hardcoded. The Server Map button
// links the resolved server-map channel; the second button links
// the how-to-join channel when one exists, labelled generically
// ("How to Join") — no server-specific clan text. A failure to
// resolve or send returns false and never throws, so a welcome
// failure can never undo a successful verification.
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { resolveChannel } = require("./guildSetup");

const HORNET_RED = 0xED4245;

function isId(value) {
    return /^\d+$/.test(String(value || ""));
}

async function postVerificationWelcome(guild, member) {
    if (!guild || !member) return false;

    let welcomeChannel = null;
    try {
        ({ channel: welcomeChannel } = await resolveChannel(guild, "welcome"));
    } catch (err) {
        console.error("[welcomeMessage] Failed to resolve welcome channel:", err.message);
        return false;
    }
    if (!welcomeChannel) return false;

    const serverMapId = await (async () => {
        try {
            const { channel } = await resolveChannel(guild, "serverMap");
            return channel.id;
        } catch {
            return "";
        }
    })();
    const howToJoinId = await (async () => {
        try {
            const resolved = await resolveChannel(guild, "howToJoin", { create: false });
            return resolved?.channel?.id || "";
        } catch {
            return "";
        }
    })();

    const embed = new EmbedBuilder()
        .setColor(HORNET_RED)
        .setDescription(
            `🐝 Welcome to **${guild.name}**, ${member}! Enjoy your stay.`
        );

    const buttons = [];
    if (isId(serverMapId)) {
        buttons.push(
            new ButtonBuilder()
                .setLabel("Server Map")
                .setEmoji("🗺️")
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${guild.id}/${serverMapId}`)
        );
    }
    if (isId(howToJoinId)) {
        buttons.push(
            new ButtonBuilder()
                .setLabel("How to Join")
                .setEmoji("🤝")
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${guild.id}/${howToJoinId}`)
        );
    }

    const components = buttons.length
        ? [new ActionRowBuilder().addComponents(...buttons)]
        : [];

    try {
        await welcomeChannel.send({ embeds: [embed], components });
        return true;
    } catch (err) {
        console.error("[welcomeMessage] Failed to send welcome message:", err.message);
        return false;
    }
}

module.exports = { postVerificationWelcome, HORNET_RED };
