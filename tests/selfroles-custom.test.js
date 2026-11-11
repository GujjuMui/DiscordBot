'use strict';

// Custom faction / ping lists (services/selfRoleCustom.js) and the
// /selfroles faction-add / ping-add / banner-set subcommands.
//
// Faction and ping roles are per-guild custom — no hardcoded list.
// Colour roles are the canonical 10 and must be unchanged.
//
// The BotSettings repository is stubbed in require.cache BEFORE the
// resolver (and configLoader behind it) is loaded, so no MongoDB is
// touched — the stub is a plain in-memory store. Fake role IDs are
// short strings like "role1": test fixtures, not Discord IDs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

process.env.BOT_OWNER_ID = 'owner-1';

// ---- in-memory BotSettings stub ------------------------------------
const store = new Map(); // guildId -> { guildId, channels, roles, banners, extras }

function getDoc(guildId) {
    if (!store.has(guildId)) {
        store.set(guildId, { guildId, channels: {}, roles: {}, banners: {}, extras: {} });
    }
    return store.get(guildId);
}

function applySet(doc, update) {
    for (const [dotted, value] of Object.entries(update.$set || {})) {
        const parts = dotted.split('.');
        let obj = doc;
        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]] = obj[parts[i]] || {};
        }
        obj[parts[parts.length - 1]] = value;
    }
}

const repoStub = {
    async findOne(filter) {
        const doc = store.get(filter?.guildId);
        return doc ? JSON.parse(JSON.stringify(doc)) : null;
    },
    async findOneAndUpdate(filter, update) {
        const doc = getDoc(filter.guildId);
        applySet(doc, update);
        return JSON.parse(JSON.stringify(doc));
    }
};

const repoPath = require.resolve(path.join(root, 'repositories', 'BotSettingsRepository.js'));
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repoStub };

const { ChannelType } = require('discord.js');
const settings = require(path.join(root, 'config', 'settings.js'));
const guildSetup = require(path.join(root, 'services', 'guildSetup.js'));
const selfRoleCustom = require(path.join(root, 'services', 'selfRoleCustom.js'));
const buildSelfRolePanel = require(path.join(root, 'utils', 'selfRoleComponents.js'));

// ---- fake guild ------------------------------------------------------
function makeGuild(id) {
    const channels = new Map();
    const roles = new Map();
    let n = 0;
    const cache = {
        find(fn) { for (const c of channels.values()) if (fn(c)) return c; return undefined; },
        get(channelId) { return channels.get(channelId); }
    };
    const roleCache = {
        find(fn) { for (const r of roles.values()) if (fn(r)) return r; return undefined; },
        get(roleId) { return roles.get(roleId); },
        has(roleId) { return roles.has(roleId); }
    };
    return {
        id,
        channels: {
            cache,
            async create(opts) {
                const ch = {
                    id: `ch${++n}`,
                    name: opts.name,
                    type: opts.type,
                    parentId: opts.parent || null,
                    isTextBased: () => true,
                    toString() { return `<#${this.id}>`; },
                    send: async () => ({ id: 'msg1' }),
                    messages: { fetch: async () => { throw new Error('no message'); } },
                    async setParent(parentId) { this.parentId = parentId; }
                };
                channels.set(ch.id, ch);
                return ch;
            },
            async fetch(channelId) { return channels.get(channelId) || null; }
        },
        roles: {
            cache: roleCache,
            async create(opts) {
                const role = { id: `role${++n}`, name: opts.name, color: opts.color || 0 };
                roles.set(role.id, role);
                return role;
            }
        },
        members: {
            me: {
                permissions: { has: () => true },
                roles: { highest: { position: 100 } }
            }
        },
        _channels: channels,
        _roles: roles
    };
}

function panelJson(guild, groups, custom, banners = {}) {
    const payload = buildSelfRolePanel(guild, { groups, custom, banners });
    return JSON.stringify(payload.components[0].toJSON());
}

function selfrolesCommand() {
    for (const key of Object.keys(require.cache)) {
        if (key.includes('config/config') || key.includes('config/owner')) delete require.cache[key];
    }
    return require(path.join(root, 'commands', 'admin', 'selfroles.js'));
}

function mockInteraction(guild, subcommand, options = {}) {
    const replies = [];
    return {
        replies,
        user: { id: 'owner-1' },
        guild,
        options: {
            getSubcommand: () => subcommand,
            getRole: name => options.roles?.[name] || null,
            getString: name => options.strings?.[name] ?? null,
            getAttachment: name => options.attachments?.[name] || null,
            getChannel: () => null
        },
        deferReply: async () => {},
        editReply: async msg => { replies.push(msg); },
        reply: async () => {}
    };
}

test('panel builds faction/ping options from the stored custom lists only', async () => {
    const guild = makeGuild('guild-a');
    const legion = await guild.roles.create({ name: 'Legion' });
    const giveaway = await guild.roles.create({ name: 'Giveaway ping' });
    await selfRoleCustom.addCustomEntry(guild, 'factions', {
        roleId: legion.id, name: 'Legion', description: 'Join the Legion faction', emoji: '⚔️'
    });
    await selfRoleCustom.addCustomEntry(guild, 'pings', {
        roleId: giveaway.id, name: 'Giveaway ping', description: 'Get notified about giveaways', emoji: '🎁'
    });
    // A stale entry whose role no longer exists must be skipped.
    await selfRoleCustom.addCustomEntry(guild, 'factions', {
        roleId: 'role-gone', name: 'Ghost', description: 'No longer here', emoji: '👻'
    });

    const groups = await guildSetup.ensureSelfRoleGroups(guild);
    const groupIds = {
        color: Object.fromEntries(Object.entries(groups.color).map(([k, r]) => [k, r.id]))
    };
    const custom = await selfRoleCustom.getCustomLists(guild);
    const json = panelJson(guild, groupIds, custom);

    assert.ok(json.includes('selfroles_faction'), 'faction select must be present');
    assert.ok(json.includes('selfroles_ping'), 'ping select must be present');
    assert.ok(json.includes('Legion'), 'stored faction role must appear');
    assert.ok(json.includes('Giveaway ping'), 'stored ping role must appear');
    assert.ok(!json.includes('Ghost'), 'entries whose role is gone must be skipped');
    assert.ok(!json.includes('Dynasty'), 'roles NOT in the custom list must not appear');
    assert.ok(!json.includes('SFA Videos Ping'), 'legacy ping roles must not appear unless added');
});

test('faction-add / faction-remove / faction-list round-trip through the command', async () => {
    const guild = makeGuild('guild-b');
    const legion = await guild.roles.create({ name: 'Legion' });
    const selfroles = selfrolesCommand();

    const add = mockInteraction(guild, 'faction-add', {
        roles: { role: legion },
        strings: { description: 'Join the Legion faction', emoji: '⚔️' }
    });
    await selfroles.execute(add);
    assert.ok(add.replies.some(r => /Added/.test(r.content)), `expected add confirmation, got ${JSON.stringify(add.replies)}`);

    const list = mockInteraction(guild, 'faction-list');
    await selfroles.execute(list);
    assert.ok(list.replies.some(r => /Legion/.test(r.content)), 'faction-list must show the added role');

    const panelLists = await selfRoleCustom.getCustomLists(guild);
    assert.ok(panelLists.factions.some(e => e.roleId === legion.id), 'added role must be in the stored list');

    const remove = mockInteraction(guild, 'faction-remove', { roles: { role: legion } });
    await selfroles.execute(remove);
    assert.ok(remove.replies.some(r => /Removed/.test(r.content)), 'expected remove confirmation');

    const after = await selfRoleCustom.getCustomLists(guild);
    assert.ok(!after.factions.some(e => e.roleId === legion.id), 'removed role must be gone from the stored list');

    const listAgain = mockInteraction(guild, 'faction-list');
    await selfroles.execute(listAgain);
    assert.ok(listAgain.replies.some(r => /No faction roles/.test(r.content)), 'empty list must say so');
});

test('ping-add works the same way, and re-adding a role updates it', async () => {
    const guild = makeGuild('guild-c');
    const giveaway = await guild.roles.create({ name: 'Giveaway ping' });
    const selfroles = selfrolesCommand();

    const add = mockInteraction(guild, 'ping-add', {
        roles: { role: giveaway },
        strings: { description: 'Get notified about giveaways', emoji: '🎁' }
    });
    await selfroles.execute(add);
    assert.ok(add.replies.some(r => /Added/.test(r.content)));

    const update = mockInteraction(guild, 'ping-add', {
        roles: { role: giveaway },
        strings: { description: 'Giveaway alerts!', emoji: '✨' }
    });
    await selfroles.execute(update);
    const { pings } = await selfRoleCustom.getCustomLists(guild);
    assert.equal(pings.length, 1, 're-adding must update, not duplicate');
    assert.equal(pings[0].description, 'Giveaway alerts!');
    assert.equal(pings[0].emoji, '✨');
});

test('seed populates once from stored legacy roles and does not overwrite after the owner edits', async () => {
    const guild = makeGuild('guild-d');
    // Roles the guild already has configured (legacy roles.* shape),
    // pre-seeded in the BotSettings record.
    const doc = getDoc('guild-d');
    doc.extras.roleGroups = JSON.stringify({
        faction: { legion: 'role-legion', dynasty: 'role-dynasty' },
        ping: { giveaway: 'role-give', videos: 'role-vid' }
    });
    guild._roles.set('role-legion', { id: 'role-legion', name: 'Legion' });
    guild._roles.set('role-dynasty', { id: 'role-dynasty', name: 'Dynasty' });
    guild._roles.set('role-give', { id: 'role-give', name: 'Giveaway ping' });
    guild._roles.set('role-vid', { id: 'role-vid', name: 'SFA Videos Ping' });

    const first = await selfRoleCustom.getCustomLists(guild);
    assert.deepEqual(first.factions.map(e => e.name), ['Legion', 'Dynasty']);
    assert.deepEqual(first.pings.map(e => e.name), ['Giveaway ping', 'SFA Videos Ping']);
    assert.equal(first.factions[0].emoji, '⚔️', 'seeded faction emoji comes from the legacy table');
    assert.equal(first.pings[0].description, 'Get notified about giveaways');

    // The owner removes Legion afterwards. The next read must NOT
    // re-seed it back.
    await selfRoleCustom.removeCustomEntry(guild, 'factions', 'role-legion');
    const second = await selfRoleCustom.getCustomLists(guild);
    assert.deepEqual(second.factions.map(e => e.name), ['Dynasty']);
    assert.deepEqual(second.pings.map(e => e.name), ['Giveaway ping', 'SFA Videos Ping']);
});

test('seed on a fresh guild stays empty — colours only until the owner adds roles', async () => {
    const guild = makeGuild('guild-e');
    const lists = await selfRoleCustom.getCustomLists(guild);
    // The static guild.json still lists legacy role IDs, but none of
    // those roles exist in this fresh guild, so the seed finds nothing.
    assert.deepEqual(lists.factions, []);
    assert.deepEqual(lists.pings, []);
});

test('colour roles are unchanged: 10 colours, same names and colours', async () => {
    const guild = makeGuild('guild-f');
    const groups = await guildSetup.ensureSelfRoleGroups(guild);
    assert.equal(Object.keys(groups.color).length, 10);
    for (const [sub, def] of Object.entries(guildSetup.ROLE_GROUPS.color)) {
        assert.equal(groups.color[sub].name, def.name, `colour ${sub} name must match the canonical table`);
        assert.equal(groups.color[sub].color, def.color, `colour ${sub} colour must match the canonical table`);
    }
    const ids = await guildSetup.getSelfRoleGroupIds(guild);
    assert.equal(Object.keys(ids.color).length, 10);
});

test('banner-set stores the attachment URL and the panel uses it', async () => {
    const guild = makeGuild('guild-g');
    const selfroles = selfrolesCommand();
    const url = 'https://cdn.discordapp.com/attachments/1/2/faction-banner.png';
    const original = settings.selfRoles.banners.faction;

    const set = mockInteraction(guild, 'banner-set', {
        strings: { section: 'faction' },
        attachments: { image: { url, contentType: 'image/png' } }
    });
    await selfroles.execute(set);
    try {
        assert.ok(set.replies.some(r => /Faction banner set/.test(r.content)), `expected banner confirmation, got ${JSON.stringify(set.replies)}`);
        assert.equal(settings.selfRoles.banners.faction, url, 'in-memory banner must be updated in the same process');

        const banners = await guildSetup.getSelfRoleBanners(guild);
        assert.equal(banners.faction, url, 'BotSettings banner must win over the static URL');

        // The faction banner only renders when the faction section
        // has roles, so give the panel one faction entry first.
        const legion = await guild.roles.create({ name: 'Legion' });
        await selfRoleCustom.addCustomEntry(guild, 'factions', {
            roleId: legion.id, name: 'Legion', description: 'Join the Legion faction', emoji: '⚔️'
        });
        const custom = await selfRoleCustom.getCustomLists(guild);
        const json = panelJson(guild, { color: {} }, custom, banners);
        assert.ok(json.includes(url), 'panel must use the newly set banner URL');
    } finally {
        settings.selfRoles.banners.faction = original;
    }
});

test('banner-set rejects a file that is not an image', async () => {
    const guild = makeGuild('guild-h');
    const selfroles = selfrolesCommand();
    const set = mockInteraction(guild, 'banner-set', {
        strings: { section: 'ping' },
        attachments: { image: { url: 'https://example.com/file.txt', contentType: 'text/plain' } }
    });
    await selfroles.execute(set);
    assert.ok(set.replies.some(r => /isn't an image/.test(r.content)), `expected image error, got ${JSON.stringify(set.replies)}`);
});
