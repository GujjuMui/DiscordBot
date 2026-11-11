'use strict';

// Resolver tests (services/guildSetup.js): stored ID -> canonical name
// -> create under HORNET, with persistence round-tripping through
// BotSettings (including the extras.roleGroups JSON blob for the
// nested colour / faction / ping role maps).
//
// The BotSettings repository is stubbed in require.cache BEFORE the
// resolver (and configLoader behind it) is loaded, so no MongoDB is
// touched — the stub is a plain in-memory store. The fake guild's
// channel/role IDs are short strings like "ch1" / "role3": they are
// test fixtures, not Discord IDs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

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

// Load order matters: stub the repository, then load configLoader and
// the resolver fresh so they pick the stub up.
const repoPath = require.resolve(path.join(root, 'repositories', 'BotSettingsRepository.js'));
for (const key of Object.keys(require.cache)) {
    if (key.includes('configLoader') || key.includes('guildSetup') || key.includes('config/settings')) {
        delete require.cache[key];
    }
}
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repoStub };

const settings = require(path.join(root, 'config', 'settings.js'));
const guildSetup = require(path.join(root, 'services', 'guildSetup.js'));
const { ChannelType } = require('discord.js');

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
        get(roleId) { return roles.get(roleId); }
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

test('resolveChannel creates the HORNET category and channel once, then reuses it', async () => {
    const guild = makeGuild('guild-a');
    const first = await guildSetup.resolveChannel(guild, 'onboarding');
    assert.equal(first.created, true);
    assert.equal(first.channel.name, '👋┃onboarding');
    assert.equal(first.channel.type, ChannelType.GuildText);

    const category = guild._channels.get(first.channel.parentId);
    assert.ok(category, 'channel must be under a category');
    assert.equal(category.type, ChannelType.GuildCategory);
    assert.equal(category.name, 'HORNET');

    assert.equal(guild._channels.size, 2, 'exactly one category + one channel');

    const second = await guildSetup.resolveChannel(guild, 'onboarding');
    assert.equal(second.created, false);
    assert.equal(second.channel.id, first.channel.id);
    assert.equal(guild._channels.size, 2, 'second resolve must not create again');
});

test('resolveChannel reuses a BotSettings-stored ID without creating', async () => {
    const guild = makeGuild('guild-b');
    const existing = await guild.channels.create({
        name: '🏅┃tryouts', type: ChannelType.GuildText, parent: null
    });
    // Pre-seed the DB record only (static settings has no tryout ID
    // for this guild) and neutralise the static value for the test.
    const doc = getDoc('guild-b');
    doc.channels.tryout = existing.id;
    const savedStatic = settings.channels.tryout;
    settings.channels.tryout = '';
    try {
        const resolved = await guildSetup.resolveChannel(guild, 'tryout');
        assert.equal(resolved.created, false);
        assert.equal(resolved.channel.id, existing.id);
    } finally {
        settings.channels.tryout = savedStatic;
    }
});

test('resolveGroupedRole persists through the extras blob and reuses it after the in-memory value is dropped', async () => {
    const guild = makeGuild('guild-c');
    const first = await guildSetup.resolveGroupedRole(guild, 'color', 'red');
    assert.equal(first.created, true);
    assert.equal(first.role.name, 'Red');
    assert.equal(first.role.color, 0xED4245);

    // Simulate a restart: drop the in-memory static value. The
    // resolver must find the role again via BotSettings extras
    // (roleGroups JSON) without creating a second role.
    const before = guild._roles.size;
    delete settings.roles.color.red;
    const second = await guildSetup.resolveGroupedRole(guild, 'color', 'red');
    assert.equal(second.created, false);
    assert.equal(second.role.id, first.role.id);
    assert.equal(guild._roles.size, before, 'no second role must be created');

    // The blob itself must hold the mapping.
    const doc = store.get('guild-c');
    const blob = JSON.parse(doc.extras.roleGroups);
    assert.equal(blob.color.red, first.role.id);
});

test('ensureSelfRoleGroups creates every colour/faction/ping role with the canonical names', async () => {
    const guild = makeGuild('guild-d');
    const groups = await guildSetup.ensureSelfRoleGroups(guild);
    assert.equal(Object.keys(groups.color).length, 10);
    assert.equal(Object.keys(groups.faction).length, 3);
    assert.equal(Object.keys(groups.ping).length, 7);
    assert.equal(groups.color.red.name, 'Red');
    assert.equal(groups.faction.legion.name, '🎀 •  Legion');
    assert.equal(groups.ping.giveaway.name, '📌  •  Giveaway ping');

    const second = await guildSetup.ensureSelfRoleGroups(guild);
    assert.equal(
        second.color.red.id, groups.color.red.id,
        'second pass must reuse the stored roles'
    );
});

test('resolveRole throws a clear message when the bot cannot manage roles', async () => {
    const guild = makeGuild('guild-e');
    guild.members.me.permissions.has = () => false;
    await assert.rejects(
        guildSetup.resolveRole(guild, 'member'),
        err => err.code === 'MISSING_PERMISSION'
            && /Manage Roles/.test(err.message)
    );
});

test('/selfroles setup posts the panel to the auto-created channel from a bare guild', async () => {
    const guild = makeGuild('guild-g');
    // Text channels created by the resolver need .send for the panel.
    const realCreate = guild.channels.create.bind(guild.channels);
    guild.channels.create = async opts => {
        const ch = await realCreate(opts);
        ch.send = async () => ({ id: 'msg1' });
        ch.messages = { fetch: async () => { throw new Error('no message'); } };
        return ch;
    };

    const messageRepoPath = require.resolve(path.join(root, 'repositories', 'SelfRoleMessageRepository.js'));
    require.cache[messageRepoPath] = {
        id: messageRepoPath, filename: messageRepoPath, loaded: true,
        exports: {
            async findOne() { return null; },
            async findOneAndUpdate() { return {}; }
        }
    };
    process.env.BOT_OWNER_ID = 'owner-1';
    for (const key of Object.keys(require.cache)) {
        if (key.includes('config/config') || key.includes('config/owner')) delete require.cache[key];
    }
    const selfroles = require(path.join(root, 'commands', 'admin', 'selfroles.js'));

    const replies = [];
    const interaction = {
        user: { id: 'owner-1' },
        guild,
        options: {
            getSubcommand: () => 'setup',
            getChannel: () => null
        },
        deferReply: async () => {},
        editReply: async msg => { replies.push(msg); },
        reply: async () => {}
    };
    await selfroles.execute(interaction);

    const channel = guild._channels.get(
        [...guild._channels.values()].find(c => c.name === '🎭┃self-roles')?.id
    );
    assert.ok(channel, 'self-roles channel must have been auto-created');
    assert.ok(
        replies.some(r => r.content === '✅ Self role panel created.'),
        `expected panel-created reply, got ${JSON.stringify(replies)}`
    );
});

test('self-role panel builds from a bare guild with no banners', async () => {
    const guild = makeGuild('guild-f');
    const groups = await guildSetup.ensureSelfRoleGroups(guild);
    const groupIds = {
        color: Object.fromEntries(Object.entries(groups.color).map(([k, r]) => [k, r.id])),
        faction: Object.fromEntries(Object.entries(groups.faction).map(([k, r]) => [k, r.id])),
        ping: Object.fromEntries(Object.entries(groups.ping).map(([k, r]) => [k, r.id]))
    };
    const buildSelfRolePanel = require(path.join(root, 'utils', 'selfRoleComponents.js'));
    const payload = buildSelfRolePanel(guild, { groups: groupIds, banners: {} });
    assert.ok(payload.components.length, 'panel must have components');
    const json = JSON.stringify(payload.components[0].toJSON());
    assert.ok(!json.includes('"url":""'), 'no empty banner URL may be posted');
    assert.ok(json.includes('selfroles_color'), 'colour select must be present');
    assert.ok(json.includes('selfroles_faction'), 'faction select must be present');
    assert.ok(json.includes('selfroles_ping'), 'ping select must be present');
});
