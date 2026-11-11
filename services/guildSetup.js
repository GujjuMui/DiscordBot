// One shared resolver for every channel / role the bot needs.
//
// Problem this solves: channel and role IDs used to be copied by hand
// into config/guild.json (or CHANNEL_*/ROLE_* env vars) before the bot
// could work at all. Now nothing needs to be configured up front:
//
//   stored ID (guild.json, or BotSettings in Mongo) -> use it
//   else a channel/role with the canonical name -> use it, remember it
//   else create it under the HORNET category and remember it
//
// "Remember it" means: persist the resolved ID with
// configLoader.updateSetting() (BotSettings in Mongo, so it survives a
// restart) AND write it into the in-memory static settings object in
// the same process, so consumers that read config/settings directly
// see it immediately.
//
// Banners / embed images are Discord CDN URLs — they cannot be
// created, so a missing one is skipped gracefully (see bannerUrl()).
// Never invent an image URL.

const { ChannelType, PermissionFlagsBits } = require("discord.js");

const settings = require("../config/settings");
const { getSettings, updateSetting } = require("../config/configLoader");

const CATEGORY_NAME = "HORNET";

// Canonical channel names. The six name-based channels keep the
// names they always had; the ID-based ones get the names the welcome
// text already mentioned (server-rules, welcome, server-support).
const CHANNEL_NAMES = Object.freeze({
    cards: "🎴┃sfa-cards",
    arts: "🎨┃sfa-arts",
    links: "📺┃content",
    verification: "📝┃verification",
    tournaments: "tournaments",
    logs: "🐝┃hornet-logs",
    welcome: "🎀┃welcome",
    main_welcome: "📖┃server-guide",
    serverMap: "🗺️┃server-map",
    howToJoin: "🤝┃how-to-join",
    tryout: "🏅┃tryouts",
    onboarding: "👋┃onboarding",
    serverRules: "📃┃server-rules",
    serverSupport: "💬┃server-support"
});

const SELFROLES_CHANNEL_NAME = "🎭┃self-roles";

// The six channels below are looked up BY NAME everywhere
// (savecard, refreshgallery, logger, ...), so their settings value
// must stay a name — never an ID. Every other channel key holds an
// ID (or ""), and the resolver persists the ID there.
const NAME_CHANNEL_KEYS = new Set([
    "cards", "arts", "links", "verification", "tournaments", "logs"
]);

// Canonical role names. Flat roles use plain names; colour role names
// are the plain colour names; faction / ping roles keep the exact
// names the self-role panel already expects (see
// utils/selfRoleComponents.js emoji maps) so those maps stay untouched.
const ROLE_DEFS = Object.freeze({
    member: { name: "Member" },
    pendingTryout: { name: "Pending Tryout" },
    clanMemberAS: { name: "Clan Member AS" },
    clanMemberEU: { name: "Clan Member EU" },
    pendingTryoutAS: { name: "Pending Tryout AS" },
    pendingTryoutEU: { name: "Pending Tryout EU" },
    tryoutTesterAS: { name: "Tryout Tester AS" },
    tryoutTesterEU: { name: "Tryout Tester EU" }
});

const ROLE_GROUPS = Object.freeze({
    color: Object.freeze({
        red: { name: "Red", color: 0xED4245 },
        black: { name: "Black", color: 0x2B2D31 },
        cyan: { name: "Cyan", color: 0x00FFFF },
        pink: { name: "Pink", color: 0xFF69B4 },
        orange: { name: "Orange", color: 0xFFA500 },
        brown: { name: "Brown", color: 0x8B4513 },
        blue: { name: "Blue", color: 0x3498DB },
        green: { name: "Green", color: 0x2ECC71 },
        violet: { name: "Violet", color: 0x8A2BE2 },
        yellow: { name: "Yellow", color: 0xFEE75C }
    }),
    faction: Object.freeze({
        legion: { name: "🎀 •  Legion" },
        dynasty: { name: "🎀  •  Dynasty" },
        herald: { name: "🎀  •  Heralds" }
    }),
    ping: Object.freeze({
        giveaway: { name: "📌  •  Giveaway ping" },
        videos: { name: "📌  •  SFA Videos Ping" },
        announcement: { name: "📌  •  Announcement Ping" },
        clanUpdate: { name: "📌  •  Clan Update Ping" },
        serverUpdate: { name: "📌  •  Server Update Ping" },
        friendlyAS: { name: "Friendly ping" },
        friendlyEU: { name: "Friendly Ping (Europe)" }
    })
});

const MANAGE_CHANNELS_MESSAGE =
    "❌ I need the **Manage Channels** permission to set up HORNET channels.";
const MANAGE_ROLES_MESSAGE =
    "❌ I need the **Manage Roles** permission to create roles.";

function isId(value) {
    return /^\d+$/.test(String(value || ""));
}

// Thrown when the bot cannot create what it needs. `message` is
// already the user-facing string — callers reply with it, they do not
// invent a new one. Event handlers (member join) catch it and skip
// quietly instead: a missing channel must never break a join.
class SetupPermissionError extends Error {
    constructor(message) {
        super(message);
        this.code = "MISSING_PERMISSION";
    }
}

function botMember(guild) {
    return guild?.members?.me || null;
}

function requirePermission(guild, flag, message) {
    const me = botMember(guild);
    if (!me?.permissions?.has(flag)) {
        throw new SetupPermissionError(message);
    }
}

// ---- stored values (static guild.json first, BotSettings second) ----

async function mergedSettings(guild) {
    if (!guild?.id) return null;
    return getSettings(guild.id).catch(() => null);
}

async function storedChannelValue(guild, key) {
    const fromStatic = settings.channels?.[key];
    if (fromStatic) return fromStatic;
    const merged = await mergedSettings(guild);
    if (merged?.channels?.[key]) return merged.channels[key];
    // A channel picked with a slash-command channel option (e.g. a
    // verification channel whose name is not the canonical one) is
    // remembered in extras, so the name-based settings value is never
    // overwritten with an ID (see NAME_CHANNEL_KEYS above).
    return merged?.extras?.[`${key}ChannelId`] || "";
}

async function storedRoleValue(guild, key) {
    const fromStatic = settings.roles?.[key];
    if (fromStatic) return fromStatic;
    const merged = await mergedSettings(guild);
    return merged?.roles?.[key] || "";
}

async function storedGroupedRoleValue(guild, group, sub) {
    const fromStatic = settings.roles?.[group]?.[sub];
    if (fromStatic) return fromStatic;
    const merged = await mergedSettings(guild);
    return merged?.roles?.[group]?.[sub] || "";
}

async function storedSelfRolesChannel(guild) {
    const fromStatic = settings.selfRoles?.channel;
    if (fromStatic) return fromStatic;
    const merged = await mergedSettings(guild);
    return merged?.selfRoles?.channel || "";
}

// ---- persistence (BotSettings + in-memory static settings) ----

async function persistChannel(guild, key, channel) {
    const id = channel.id;
    if (NAME_CHANNEL_KEYS.has(key)) {
        // Name-based key: the name IS the identifier, so nothing to
        // persist when the channel already has the canonical name.
        // A picked channel with a different name is remembered by ID
        // in extras instead (its settings value stays a name).
        if (channel.name !== CHANNEL_NAMES[key]) {
            await updateSetting(guild.id, "extras", `${key}ChannelId`, id);
        }
        return;
    }
    settings.channels[key] = id;
    await updateSetting(guild.id, "channels", key, id);
}

async function persistRole(guild, key, id) {
    settings.roles[key] = id;
    await updateSetting(guild.id, "roles", key, id);
}

async function persistGroupedRole(guild, group, sub, id) {
    if (!settings.roles[group]) settings.roles[group] = {};
    settings.roles[group][sub] = id;
    // Nested maps cannot round-trip through BotSettings.roles (a flat
    // Map of String), so the three groups travel as one JSON blob in
    // extras.roleGroups — getSettings() unflattens it back.
    const merged = await mergedSettings(guild);
    const groups = {
        color: { ...(merged?.roles?.color || settings.roles.color || {}) },
        faction: { ...(merged?.roles?.faction || settings.roles.faction || {}) },
        ping: { ...(merged?.roles?.ping || settings.roles.ping || {}) }
    };
    groups[group][sub] = id;
    await updateSetting(guild.id, "extras", "roleGroups", JSON.stringify(groups));
}

async function persistSelfRolesChannel(guild, id) {
    settings.selfRoles.channel = id;
    await updateSetting(guild.id, "channels", "selfRolesChannel", id);
}

// ---- creation helpers ----

async function ensureCategory(guild) {
    requirePermission(guild, PermissionFlagsBits.ManageChannels, MANAGE_CHANNELS_MESSAGE);
    let category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAME
    );
    if (!category) {
        category = await guild.channels.create({
            name: CATEGORY_NAME,
            type: ChannelType.GuildCategory
        });
    }
    return category;
}

async function findChannelByStoredValue(guild, stored) {
    if (!stored) return null;
    if (isId(stored)) {
        return guild.channels.cache.get(stored)
            || await guild.channels.fetch(stored).catch(() => null);
    }
    return guild.channels.cache.find(c => c.name === stored) || null;
}

function findRoleByStoredValue(guild, stored) {
    if (!stored) return null;
    if (isId(stored)) return guild.roles.cache.get(stored) || null;
    return guild.roles.cache.find(r => r.name === stored) || null;
}

// ---- public resolver ----

// Returns { channel, created } or null when { create: false } and
// nothing resolves. Throws SetupPermissionError when creation needs
// Manage Channels and the bot does not have it.
async function resolveChannel(guild, key, { create = true } = {}) {
    const canonical = CHANNEL_NAMES[key];
    if (!canonical) throw new Error(`Unknown channel key: ${key}`);

    const stored = await storedChannelValue(guild, key);
    let channel = await findChannelByStoredValue(guild, stored);
    if (channel) return { channel, created: false };

    channel = guild.channels.cache.find(c => c.name === canonical) || null;
    if (channel) {
        await persistChannel(guild, key, channel);
        return { channel, created: false };
    }

    if (!create) return null;

    const category = await ensureCategory(guild);
    channel = await guild.channels.create({
        name: canonical,
        type: ChannelType.GuildText,
        parent: category.id
    });
    await persistChannel(guild, key, channel);
    return { channel, created: true };
}

// Self-roles channel: stored under selfRoles.channel (static) /
// channels.selfRolesChannel (BotSettings). Same resolve order as
// resolveChannel, canonical name "🎭┃self-roles".
async function resolveSelfRolesChannel(guild, { create = true } = {}) {
    const stored = await storedSelfRolesChannel(guild);
    let channel = await findChannelByStoredValue(guild, stored);
    if (channel) return { channel, created: false };

    channel = guild.channels.cache.find(c => c.name === SELFROLES_CHANNEL_NAME) || null;
    if (channel) {
        await persistSelfRolesChannel(guild, channel.id);
        return { channel, created: false };
    }

    if (!create) return null;

    const category = await ensureCategory(guild);
    channel = await guild.channels.create({
        name: SELFROLES_CHANNEL_NAME,
        type: ChannelType.GuildText,
        parent: category.id
    });
    await persistSelfRolesChannel(guild, channel.id);
    return { channel, created: true };
}

// Returns { role, created } or null when { create: false }.
// Throws SetupPermissionError when creation needs Manage Roles.
async function resolveRole(guild, key, { create = true } = {}) {
    const def = ROLE_DEFS[key];
    if (!def) throw new Error(`Unknown role key: ${key}`);

    const stored = await storedRoleValue(guild, key);
    let role = findRoleByStoredValue(guild, stored);
    if (role) return { role, created: false };

    role = guild.roles.cache.find(r => r.name === def.name) || null;
    if (role) {
        await persistRole(guild, key, role.id);
        return { role, created: false };
    }

    if (!create) return null;

    requirePermission(guild, PermissionFlagsBits.ManageRoles, MANAGE_ROLES_MESSAGE);
    role = await guild.roles.create({ name: def.name });
    await persistRole(guild, key, role.id);
    return { role, created: true };
}

async function resolveGroupedRole(guild, group, sub, { create = true } = {}) {
    const def = ROLE_GROUPS[group]?.[sub];
    if (!def) throw new Error(`Unknown role group key: ${group}.${sub}`);

    const stored = await storedGroupedRoleValue(guild, group, sub);
    let role = findRoleByStoredValue(guild, stored);
    if (role) return { role, created: false };

    role = guild.roles.cache.find(r => r.name === def.name) || null;
    if (role) {
        await persistGroupedRole(guild, group, sub, role.id);
        return { role, created: false };
    }

    if (!create) return null;

    requirePermission(guild, PermissionFlagsBits.ManageRoles, MANAGE_ROLES_MESSAGE);
    role = await guild.roles.create(
        def.color ? { name: def.name, color: def.color } : { name: def.name }
    );
    await persistGroupedRole(guild, group, sub, role.id);
    return { role, created: true };
}

// Resolve every self-role group role (creating any that are missing).
// Returns { color: { sub: role }, faction: {...}, ping: {...} }.
async function ensureSelfRoleGroups(guild) {
    const out = { color: {}, faction: {}, ping: {} };
    for (const group of Object.keys(ROLE_GROUPS)) {
        for (const sub of Object.keys(ROLE_GROUPS[group])) {
            const { role } = await resolveGroupedRole(guild, group, sub);
            out[group][sub] = role;
        }
    }
    return out;
}

// Merged self-role group IDs without creating anything: static
// guild.json first, BotSettings fills the gaps. Used by the select
// handler, which must match the roles the panel was built from.
async function getSelfRoleGroupIds(guild) {
    const merged = await mergedSettings(guild);
    const pick = group => {
        const out = {};
        for (const sub of Object.keys(ROLE_GROUPS[group])) {
            out[sub] = settings.roles?.[group]?.[sub]
                || merged?.roles?.[group]?.[sub]
                || "";
        }
        return out;
    };
    return { color: pick("color"), faction: pick("faction"), ping: pick("ping") };
}

// Merged self-role banner URLs (static first, BotSettings second).
async function getSelfRoleBanners(guild) {
    const merged = await mergedSettings(guild);
    const banners = { ...(settings.selfRoles?.banners || {}) };
    for (const [key, value] of Object.entries(merged?.selfRoles?.banners || {})) {
        if (!banners[key]) banners[key] = value;
    }
    return banners;
}

// A banner / embed image is a URL the user uploaded — it cannot be
// created. Return the URL, or null so the caller skips that image.
function bannerUrl(banners, key) {
    const url = banners?.[key];
    return typeof url === "string" && url.length > 0 ? url : null;
}

// Remember a channel the owner picked with a slash-command channel
// option: the panel is posted there, and the choice is persisted so
// the next run resolves the same channel (extras for name-based keys,
// the normal channels slot for ID-based keys).
async function rememberPickedChannel(guild, key, channel) {
    // The self-roles channel lives under selfRoles.channel (static)
    // / channels.selfRolesChannel (BotSettings), not channels[key].
    if (key === "selfRoles") {
        await persistSelfRolesChannel(guild, channel.id);
        return;
    }
    if (NAME_CHANNEL_KEYS.has(key)) {
        await updateSetting(guild.id, "extras", `${key}ChannelId`, channel.id);
        return;
    }
    await persistChannel(guild, key, channel);
}

module.exports = {
    CATEGORY_NAME,
    CHANNEL_NAMES,
    NAME_CHANNEL_KEYS,
    SELFROLES_CHANNEL_NAME,
    ROLE_DEFS,
    ROLE_GROUPS,
    MANAGE_CHANNELS_MESSAGE,
    MANAGE_ROLES_MESSAGE,
    SetupPermissionError,
    ensureCategory,
    resolveChannel,
    resolveSelfRolesChannel,
    resolveRole,
    resolveGroupedRole,
    ensureSelfRoleGroups,
    getSelfRoleGroupIds,
    getSelfRoleBanners,
    bannerUrl,
    rememberPickedChannel
};
