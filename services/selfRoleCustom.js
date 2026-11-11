// Per-guild custom faction / ping lists for the self-role panel.
//
// Faction and ping roles are specific to each server — they are NOT
// hardcoded anywhere. Each guild keeps its own lists in BotSettings
// extras as JSON blobs:
//   extras.selfRoleFactions: [{ roleId, name, description, emoji }]
//   extras.selfRolePings:    [{ roleId, name, description, emoji }]
//
// The panel builder and the select handler read ONLY these lists
// for faction / ping options. Colour roles are unchanged — they
// still come from the canonical ROLE_GROUPS.color table.
//
// Reads go through configLoader.getSettings() (BotSettings merged
// over the static file), and writes go through
// configLoader.updateSetting(), which invalidates the settings
// cache — so a change is visible to the next read in the same
// process without touching the in-memory static settings object
// (custom lists live only in BotSettings, never in static settings).
//
// One-time seed: a guild that has NO stored lists yet gets them
// built once from the roles it already has configured (static
// guild.json / BotSettings roles.faction / roles.ping, resolved to
// live Discord roles for their names), with descriptions and emojis
// from the legacy FATE tables in services/selfRoleDefaults.js.
// The seed only runs when a list is absent — a list the owner has
// set (even an empty one) is never overwritten. A fresh server with
// no configured roles seeds to empty lists and the panel shows
// colours only until the owner adds factions / pings.

const { getSettings, updateSetting } = require("../config/configLoader");
const settings = require("../config/settings");
const { FACTION_SEED, PING_SEED } = require("./selfRoleDefaults");

const FACTION_KEY = "selfRoleFactions";
const PING_KEY = "selfRolePings";

function parseList(raw) {
    // null = never set (seed has not run); [] = set, deliberately empty.
    if (raw === undefined || raw === null) return null;
    try {
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return null;
        return list.filter(entry => entry && typeof entry.roleId === "string");
    } catch {
        return null;
    }
}

function cleanEntry(entry) {
    return {
        roleId: String(entry.roleId),
        name: typeof entry.name === "string" ? entry.name : "",
        description: typeof entry.description === "string" ? entry.description : "",
        emoji: typeof entry.emoji === "string" ? entry.emoji : ""
    };
}

async function storedLists(guild) {
    const merged = await getSettings(guild?.id).catch(() => null);
    const extras = merged?.extras || {};
    return {
        factions: parseList(extras[FACTION_KEY]),
        pings: parseList(extras[PING_KEY])
    };
}

// Build one side of the seed from the roles the guild already has
// configured. Entries whose role no longer exists in the guild are
// skipped — the seed never invents a role.
function buildSeedSide(guild, merged, group, table, defaultDescription) {
    const out = [];
    for (const { sub, description, emoji } of table) {
        const roleId = merged?.roles?.[group]?.[sub]
            || settings.roles?.[group]?.[sub]
            || "";
        if (!roleId) continue;
        const role = guild.roles?.cache?.get(roleId);
        if (!role) continue;
        out.push({
            roleId,
            name: role.name,
            description: description || defaultDescription(role.name),
            emoji: emoji || ""
        });
    }
    return out;
}

async function seedCustomLists(guild) {
    const stored = await storedLists(guild);
    const merged = await getSettings(guild?.id).catch(() => null);
    const factions = stored.factions !== null
        ? stored.factions
        : buildSeedSide(guild, merged, "faction", FACTION_SEED, name => `Join the ${name} faction`);
    const pings = stored.pings !== null
        ? stored.pings
        : buildSeedSide(guild, merged, "ping", PING_SEED, () => "Receive notifications");
    if (stored.factions === null) {
        await updateSetting(guild.id, "extras", FACTION_KEY, JSON.stringify(factions));
    }
    if (stored.pings === null) {
        await updateSetting(guild.id, "extras", PING_KEY, JSON.stringify(pings));
    }
    return { factions, pings };
}

async function getCustomLists(guild) {
    const stored = await storedLists(guild);
    if (stored.factions !== null && stored.pings !== null) return stored;
    return seedCustomLists(guild);
}

async function getCustomList(guild, group) {
    const { factions, pings } = await getCustomLists(guild);
    return group === "factions" ? factions : pings;
}

async function saveCustomList(guild, group, list) {
    const key = group === "factions" ? FACTION_KEY : PING_KEY;
    const cleaned = list.map(cleanEntry);
    await updateSetting(guild.id, "extras", key, JSON.stringify(cleaned));
    return cleaned;
}

// Add (or update, when the role is already listed) one entry.
async function addCustomEntry(guild, group, entry) {
    const list = await getCustomList(guild, group);
    const cleaned = cleanEntry(entry);
    const existing = list.findIndex(e => e.roleId === cleaned.roleId);
    if (existing >= 0) list[existing] = cleaned;
    else list.push(cleaned);
    return saveCustomList(guild, group, list);
}

// Remove one entry by role ID. Returns true when something was removed.
async function removeCustomEntry(guild, group, roleId) {
    const list = await getCustomList(guild, group);
    const next = list.filter(e => e.roleId !== String(roleId));
    if (next.length === list.length) return false;
    await saveCustomList(guild, group, next);
    return true;
}

module.exports = {
    FACTION_KEY,
    PING_KEY,
    getCustomLists,
    getCustomList,
    saveCustomList,
    addCustomEntry,
    removeCustomEntry,
    seedCustomLists
};
