// Universal, multi-server verification suite — the shared service
// behind /verification setup, /verification config, the Verify
// button and the member-join onboarding embed.
//
// Nothing in here names a server, a channel ID or a role ID. Every
// guild-specific value is resolved from interaction.guild at runtime
// or read from that guild's BotSettings verification block (see
// repositories/VerificationRepository.js).
//
// Channel layout (created under the WELCOME category, in this order):
//   📜│server-rules, 📝│verification, 📖│server-guide,
//   💬│server-support, 👋│onboarding
// @everyone can view the whole category but can only send messages
// in server-support (with @everyone/@here and thread creation
// disabled). The other four channels inherit the read-only category
// overwrites. Channel creations are spaced 2s apart (inside the
// 1.5–2.5s window) so a setup run never trips Discord rate-limits
// or anti-nuke / anti-raid bots.
const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { SetupPermissionError, MANAGE_CHANNELS_MESSAGE } = require("./guildSetup");
const { updateSetting } = require("../config/configLoader");
const VerificationRepository = require("../repositories/VerificationRepository");

const WELCOME_CATEGORY_NAME = "WELCOME";

// 1.5–2.5s between channel/category creation API calls.
const SETUP_STEP_DELAY_MS = 2000;

const DEFAULT_ACCENT_COLOR = 0x5865F2;
const ONBOARDING_COLOR = 0xED4245;
const DISCORD_GUIDELINES_URL = "https://discord.com/guidelines";

// key = VerificationRepository field holding the channel ID.
const CHANNEL_DEFS = Object.freeze([
    { key: "rulesChannelId", name: "📜│server-rules" },
    { key: "verificationChannelId", name: "📝│verification" },
    { key: "guideChannelId", name: "📖│server-guide" },
    { key: "supportChannelId", name: "💬│server-support" },
    { key: "onboardingChannelId", name: "👋│onboarding" }
]);

const EVERYONE_READ_ONLY = Object.freeze({
    allow: [PermissionFlagsBits.ViewChannel],
    deny: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.MentionEveryone
    ]
});

const SUPPORT_OVERWRITES = Object.freeze({
    allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
    ],
    deny: [
        PermissionFlagsBits.MentionEveryone,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads
    ]
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// "#RRGGBB", "RRGGBB" or "0xRRGGBB" -> integer colour, or the
// fallback when the value is missing / malformed.
function parseAccentColor(value, fallback = DEFAULT_ACCENT_COLOR) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return fallback;
    const match = value.trim().match(/^(?:#|0x)?([0-9a-fA-F]{6})$/);
    return match ? parseInt(match[1], 16) : fallback;
}

function footerText(guild, config = {}) {
    const custom = typeof config.customFooter === "string" ? config.customFooter.trim() : "";
    return custom || guild.name || "Hornet";
}

function guildIcon(guild) {
    try {
        return guild.iconURL({ dynamic: true }) || null;
    } catch {
        return null;
    }
}

// ---- embeds ----------------------------------------------------------

// Universal Server Rules — standard Discord Community Guidelines
// wording, no server-specific rules. The footer brands it with the
// guild's own name (or its custom footer).
function buildRulesEmbed(guild, config = {}) {
    const embed = new EmbedBuilder()
        .setColor(parseAccentColor(config.accentColor))
        .setTitle("📜 Server Rules")
        .setDescription(
            "Please read and follow these rules. Breaking them may result in a warning, mute, kick or ban.\n\n" +
            "• **Be respectful** — Respect all users, regardless of your liking towards them. Treat others the way you want to be treated.\n\n" +
            "• **No inappropriate language** — Keep profanity to a minimum. Any derogatory language towards any user is prohibited.\n\n" +
            "• **No spamming** — Don't send a lot of small messages right after each other. Do not disrupt chat by spamming.\n\n" +
            "• **No pornographic / adult / NSFW material** — This is a community server and not meant to share this kind of material.\n\n" +
            "• **No advertisements** — We do not tolerate any kind of advertisements, whether for other communities or streams. You can post your own content in the media channel if it is relevant and provides actual value (Video / Art).\n\n" +
            "• **No offensive names and profile pictures** — You will be asked to change your name or picture if the staff deems them inappropriate.\n\n" +
            "• **No server raiding** — Raiding, or mentions of raiding, are not allowed.\n\n" +
            "• **No direct or indirect threats** — Threats to other users of DDoS, death, DoX, abuse, and other malicious threats are absolutely prohibited and disallowed.\n\n" +
            "• **Follow the Discord Community Guidelines** — You can find them here: " + DISCORD_GUIDELINES_URL + "\n\n" +
            "• **Voice chat etiquette** — Do not join voice chat channels without permission of the people already in there. If you see that they have a free spot it is alright to join and ask whether they have an open spot, but leave if your presence is not wanted by whoever was there first."
        )
        .setFooter({ text: footerText(guild, config) })
        .setTimestamp();
    const icon = guildIcon(guild);
    if (icon) embed.setThumbnail(icon);
    return embed;
}

// Universal verification panel — branded with the guild's name and
// icon. The Verify button (customId "verify", handled by
// events/verificationButtonHandler.js) grants the guild's configured
// verified role.
function buildVerificationEmbed(guild, config = {}) {
    const embed = new EmbedBuilder()
        .setColor(parseAccentColor(config.accentColor))
        .setTitle(`✅ Verify — ${guild.name}`)
        .setDescription(
            `Welcome to **${guild.name}**!\n\n` +
            "Before starting verification, please make sure you meet the following requirements:\n\n" +
            "📱  Your Discord account is phone verified.\n\n" +
            "📜  Your Discord account is at least **30 days old**.\n\n" +
            "⏳  You have been in this server for **more than 5 minutes**.\n\n" +
            "Click the **Verify** button below to gain access to the server."
        )
        .setFooter({ text: footerText(guild, config) })
        .setTimestamp();
    const icon = guildIcon(guild);
    if (icon) embed.setThumbnail(icon);
    return embed;
}

function buildVerifyRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("verify")
            .setLabel("Verify")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
    );
}

// Onboarding welcome embed, exactly as specified: dynamic guild
// name, dynamic <#channel> mentions from the guild's saved config,
// footer "{guild.name} • Welcome" with a timestamp.
function buildOnboardingEmbed(member, config = {}) {
    const guild = member.guild;
    const mention = (id, fallback) => (id ? `<#${id}>` : fallback);
    return new EmbedBuilder()
        .setColor(parseAccentColor(config.accentColor, ONBOARDING_COLOR))
        .setTitle(`👋 Welcome to ${guild.name}`)
        .setDescription(
            `Welcome to the server, <@${member.id}>!\n\n` +
            "**📋 ONBOARDING**\n\n" +
            "**1️⃣ Read the Rules**\n" +
            `Please read the server rules in ${mention(config.rulesChannelId, "#server-rules")}.\n\n` +
            "**2️⃣ Verify Yourself**\n" +
            `After reading the rules, head to ${mention(config.verificationChannelId, "#verification")}.\n\n` +
            "**3️⃣ Learn More**\n" +
            `Our detailed server guide is available in ${mention(config.guideChannelId, "#server-guide")}.\n\n` +
            "**❓ NEED HELP?**\n" +
            `Having trouble with verification? Ask for support in ${mention(config.supportChannelId, "#server-support")}.\n\n` +
            `Enjoy your stay and welcome to **${guild.name}**! ❤️`
        )
        .setFooter({ text: `${guild.name} • Welcome` })
        .setTimestamp();
}

// ---- setup -----------------------------------------------------------

function findCategory(guild) {
    return guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === WELCOME_CATEGORY_NAME
    ) || null;
}

async function fetchChannelById(guild, id) {
    if (!id) return null;
    return guild.channels.cache.get(id)
        || await guild.channels.fetch(id).catch(() => null);
}

async function setEveryoneOverwrites(channel, { allow, deny }) {
    if (typeof channel.permissionOverwrites?.edit !== "function") return;
    const everyone = channel.guild?.roles?.everyone;
    if (!everyone) return;
    // Build one overwrite object: allowed perms -> true, denied -> false.
    const overwrite = {};
    for (const flag of allow) overwrite[flagName(flag)] = true;
    for (const flag of deny) overwrite[flagName(flag)] = false;
    await channel.permissionOverwrites.edit(everyone, overwrite).catch(() => {});
}

// PermissionFlagsBits values are bigints; the overwrite object
// needs their names ("ViewChannel", "SendMessages", ...).
const FLAG_NAMES = new Map([
    [PermissionFlagsBits.ViewChannel, "ViewChannel"],
    [PermissionFlagsBits.SendMessages, "SendMessages"],
    [PermissionFlagsBits.ReadMessageHistory, "ReadMessageHistory"],
    [PermissionFlagsBits.AddReactions, "AddReactions"],
    [PermissionFlagsBits.MentionEveryone, "MentionEveryone"],
    [PermissionFlagsBits.CreatePublicThreads, "CreatePublicThreads"],
    [PermissionFlagsBits.CreatePrivateThreads, "CreatePrivateThreads"]
]);

function flagName(flag) {
    return FLAG_NAMES.get(flag) || String(flag);
}

// Create (or reuse) the WELCOME category and its 5 channels, in
// order, with SETUP_STEP_DELAY_MS between creation API calls.
// Existing channels (by saved ID, then by exact name) are reused
// and have their permissions fixed instead of being recreated.
// Returns { category, channels, created, reused, config } where
// channels maps each CHANNEL_DEFS key to its channel object and
// config is the saved per-guild verification block.
async function setupVerificationChannels(guild, { config = null, store = VerificationRepository, delayMs = SETUP_STEP_DELAY_MS } = {}) {
    const me = guild.members?.me || null;
    if (!me?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
        throw new SetupPermissionError(MANAGE_CHANNELS_MESSAGE);
    }

    const saved = config || await store.getVerificationConfig(guild.id).catch(() => null) || {};
    const everyone = guild.roles?.everyone;
    if (!everyone) throw new SetupPermissionError(MANAGE_CHANNELS_MESSAGE);

    let creations = 0;
    const created = [];
    const reused = [];

    // -- category --
    let category = findCategory(guild);
    if (category) {
        reused.push(`📁 ${WELCOME_CATEGORY_NAME}`);
        await setEveryoneOverwrites(category, EVERYONE_READ_ONLY).catch(() => {});
    } else {
        if (creations > 0) await sleep(delayMs);
        category = await guild.channels.create({
            name: WELCOME_CATEGORY_NAME,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [{
                id: everyone.id,
                allow: [...EVERYONE_READ_ONLY.allow],
                deny: [...EVERYONE_READ_ONLY.deny]
            }]
        });
        creations += 1;
        created.push(`📁 ${WELCOME_CATEGORY_NAME}`);
    }

    // -- channels, in spec order --
    const channels = {};
    const ids = { welcomeCategoryId: category.id };
    for (const def of CHANNEL_DEFS) {
        const isSupport = def.key === "supportChannelId";
        let channel = await fetchChannelById(guild, saved[def.key]);
        if (!channel) {
            channel = guild.channels.cache.find(c => c.name === def.name) || null;
        }
        if (channel) {
            reused.push(`#${def.name}`);
            // Re-parent a found channel into WELCOME (best effort)
            // and fix its permissions to the spec.
            if (channel.parentId !== category.id && typeof channel.setParent === "function") {
                await channel.setParent(category.id).catch(() => {});
            }
            if (isSupport) {
                await setEveryoneOverwrites(channel, SUPPORT_OVERWRITES).catch(() => {});
            } else if (typeof channel.lockPermissions === "function") {
                await channel.lockPermissions().catch(() => {});
            }
        } else {
            if (creations > 0) await sleep(delayMs);
            channel = await guild.channels.create({
                name: def.name,
                type: ChannelType.GuildText,
                parent: category.id,
                ...(isSupport ? {
                    permissionOverwrites: [{
                        id: everyone.id,
                        allow: [...SUPPORT_OVERWRITES.allow],
                        deny: [...SUPPORT_OVERWRITES.deny]
                    }]
                } : {})
            });
            creations += 1;
            created.push(`#${def.name}`);
        }
        channels[def.key] = channel;
        ids[def.key] = channel.id;
    }

    // Persist the auto-detected IDs per guildId (DAO layer).
    const savedConfig = await store.saveVerificationConfig(guild.id, ids).catch(() => null);

    // Bridge into the legacy channels map so the shared resolver
    // (services/guildSetup.js) finds these channels by stored ID
    // too. Best effort — a failure here never fails setup.
    const bridge = {
        onboarding: ids.onboardingChannelId,
        serverRules: ids.rulesChannelId,
        main_welcome: ids.guideChannelId,
        serverSupport: ids.supportChannelId
    };
    for (const [key, id] of Object.entries(bridge)) {
        await updateSetting(guild.id, "channels", key, id).catch(() => {});
    }
    await updateSetting(guild.id, "extras", "verificationChannelId", ids.verificationChannelId).catch(() => {});

    return { category, channels, created, reused, config: savedConfig || { ...saved, ...ids } };
}

// Post the rules embed + verification panel, skipping a post when
// the bot already sent the same panel recently (so re-running
// /verification setup does not spam duplicate panels).
async function alreadyPosted(channel, titlePrefix) {
    try {
        if (typeof channel.messages?.fetch !== "function") return false;
        const messages = await channel.messages.fetch({ limit: 10 });
        for (const message of messages.values()) {
            if (message.author?.id !== message.client?.user?.id) continue;
            const hasTitle = (message.embeds || []).some(e => {
                const title = typeof e.title === "string" ? e.title : e.data?.title;
                return typeof title === "string" && title.startsWith(titlePrefix);
            });
            if (hasTitle) return true;
        }
    } catch {
        // Cannot read history — post anyway.
    }
    return false;
}

async function postVerificationMessages(guild, channels, config = {}) {
    const posted = { rulesPosted: false, verificationPosted: false };
    if (channels.rulesChannelId && !(await alreadyPosted(channels.rulesChannelId, "📜 Server Rules"))) {
        await channels.rulesChannelId.send({ embeds: [buildRulesEmbed(guild, config)] });
        posted.rulesPosted = true;
    }
    if (channels.verificationChannelId && !(await alreadyPosted(channels.verificationChannelId, "✅ Verify"))) {
        await channels.verificationChannelId.send({
            embeds: [buildVerificationEmbed(guild, config)],
            components: [buildVerifyRow()]
        });
        posted.verificationPosted = true;
    }
    return posted;
}

module.exports = {
    WELCOME_CATEGORY_NAME,
    SETUP_STEP_DELAY_MS,
    CHANNEL_DEFS,
    EVERYONE_READ_ONLY,
    SUPPORT_OVERWRITES,
    DISCORD_GUIDELINES_URL,
    parseAccentColor,
    footerText,
    buildRulesEmbed,
    buildVerificationEmbed,
    buildVerifyRow,
    buildOnboardingEmbed,
    setupVerificationChannels,
    postVerificationMessages
};
