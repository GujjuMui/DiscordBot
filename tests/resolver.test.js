'use strict';

// Resolver tests (services/guildSetup.js): stored ID -> canonical name
// -> create under its group category, with persistence round-tripping through
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
                    position: 0,
                    isTextBased: () => true,
                    toString() { return `<#${this.id}>`; },
                    async setParent(parentId) { this.parentId = parentId; },
                    async delete() { channels.delete(this.id); },
                    permissionOverwrites: {
                        edits: [],
                        async edit(target, perms) {
                            this.edits.push({ target: target?.id ?? target, perms: { ...perms } });
                        }
                    }
                };
                channels.set(ch.id, ch);
                return ch;
            },
            async fetch(channelId) { return channels.get(channelId) || null; }
        },
        roles: {
            cache: roleCache,
            everyone: { id: "everyone" },
            async create(opts) {
                const role = { id: `role${++n}`, name: opts.name, color: opts.color || 0 };
                role.setNameCalls = 0;
                role.setName = async name => { role.setNameCalls++; role.name = name; return role; };
                roles.set(role.id, role);
                return role;
            }
        },
        members: {
            me: {
                permissions: { has: () => true },
                roles: {
                    highest: { position: 100 },
                    botRole: { id: "botrole", name: "Hornet" }
                }
            }
        },
        _channels: channels,
        _roles: roles
    };
}

test('resolveChannel creates the group category and channel once, then reuses it', async () => {
    const guild = makeGuild('guild-a');
    const first = await guildSetup.resolveChannel(guild, 'onboarding');
    assert.equal(first.created, true);
    assert.equal(first.channel.name, '👋┃onboarding');
    assert.equal(first.channel.type, ChannelType.GuildText);

    const category = guild._channels.get(first.channel.parentId);
    assert.ok(category, 'channel must be under a category');
    assert.equal(category.type, ChannelType.GuildCategory);
    assert.equal(category.name, '✅ VERIFICATION');

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
    assert.equal(first.role.name, '🔴 Red');
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

test('ensureSelfRoleGroups creates only the 10 canonical colour roles (factions/pings are per-guild custom)', async () => {
    const guild = makeGuild('guild-d');
    const groups = await guildSetup.ensureSelfRoleGroups(guild);
    assert.equal(Object.keys(groups.color).length, 10);
    // Faction / ping roles are NOT created here any more — the owner
    // adds them per server with /selfroles faction-add / ping-add.
    assert.deepEqual(groups.faction, {});
    assert.deepEqual(groups.ping, {});
    assert.equal(groups.color.red.name, '🔴 Red',
        'created roles use the plain default font with the emoji prefix');

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
    // Faction / ping options come from the guild's custom lists now,
    // not from any canonical table — build them from roles that
    // exist in this guild.
    const factionRole = await guild.roles.create({ name: 'Legion' });
    const pingRole = await guild.roles.create({ name: 'Giveaway ping' });
    const custom = {
        factions: [{ roleId: factionRole.id, name: 'Legion', description: 'Join the Legion faction', emoji: '⚔️' }],
        pings: [{ roleId: pingRole.id, name: 'Giveaway ping', description: 'Get notified about giveaways', emoji: '🎁' }]
    };
    const groupIds = {
        color: Object.fromEntries(Object.entries(groups.color).map(([k, r]) => [k, r.id]))
    };
    const buildSelfRolePanel = require(path.join(root, 'utils', 'selfRoleComponents.js'));
    const payload = buildSelfRolePanel(guild, { groups: groupIds, custom, banners: {} });
    assert.ok(payload.components.length, 'panel must have components');
    const json = JSON.stringify(payload.components[0].toJSON());
    assert.ok(!json.includes('"url":""'), 'no empty banner URL may be posted');
    assert.ok(json.includes('selfroles_color'), 'colour select must be present');
    assert.ok(json.includes('selfroles_faction'), 'faction select must be present');
    assert.ok(json.includes('selfroles_ping'), 'ping select must be present');
});

test('/verification setup creates the onboarding channel too, from a bare guild', async () => {
    const guild = makeGuild('guild-h');
    // Text channels created by the resolver need .send for the panel.
    const realCreate = guild.channels.create.bind(guild.channels);
    const sent = [];
    guild.channels.create = async opts => {
        const ch = await realCreate(opts);
        ch.send = async msg => { sent.push(msg); return { id: 'msg1' }; };
        return ch;
    };

    const verification = require(path.join(root, 'commands', 'verification', 'verification.js'));
    const replies = [];
    const interaction = {
        guild,
        options: { getChannel: () => null },
        reply: async msg => { replies.push(msg); }
    };
    await verification.execute(interaction);

    const byName = name => [...guild._channels.values()].find(c => c.name === name);
    const category = byName('✅ VERIFICATION');
    const verificationChannel = byName('📝┃verification');
    const onboardingChannel = byName('👋┃onboarding');
    assert.ok(category, 'VERIFICATION category must have been auto-created');
    assert.ok(verificationChannel, 'verification channel must have been auto-created');
    assert.ok(onboardingChannel, 'onboarding channel must have been auto-created by verification setup');
    assert.equal(onboardingChannel.parentId, category.id, 'onboarding must be under VERIFICATION');
    assert.equal(sent.length, 1, 'the panel must be sent once to the verification channel');
    assert.ok(
        replies.some(r => /Onboarding channel/.test(r.content)),
        `reply must mention the onboarding channel, got ${JSON.stringify(replies)}`
    );
});

test('destyleRoleName maps the old styled names back to plain', async () => {
    const { destyleRoleName } = guildSetup;
    assert.equal(destyleRoleName('👤 𝓜𝓮𝓶𝓫𝓮𝓻'), '👤 Member');
    assert.equal(destyleRoleName('🔴 𝓡𝓮𝓭'), '🔴 Red');
    assert.equal(destyleRoleName('🟠 𝒪𝓻𝓪𝓷𝓰𝓮'), '🟠 Orange');
    assert.equal(destyleRoleName('🟢 𝒢𝓻𝓮𝓮𝓷'), '🟢 Green');
    assert.equal(destyleRoleName('⚔️ 𝓒𝓵𝓪𝓷 𝓜𝓮𝓶𝓫𝓮𝓻 ℰ𝓤'), '⚔️ Clan Member EU');
    assert.equal(destyleRoleName('👤 Member'), '👤 Member', 'plain names pass through');
    assert.equal(destyleRoleName('123 🔴 • (AS)'), '123 🔴 • (AS)');
});

test('new roles are created with plain names and the emoji prefix', async () => {
    const guild = makeGuild('guild-m');
    const { role } = await guildSetup.resolveRole(guild, 'member');
    assert.equal(role.name, '👤 Member');
    const red = await guildSetup.resolveGroupedRole(guild, 'color', 'red');
    assert.equal(red.role.name, '🔴 Red');
    assert.equal(red.role.color, 0xED4245);
});

test('a role that already exists with the styled name is found and renamed to plain, not duplicated', async () => {
    const guild = makeGuild('guild-n');
    const styled = await guild.roles.create({ name: '👤 𝓜𝓮𝓶𝓫𝓮𝓻' });
    const before = guild._roles.size;
    // Neutralise the static value so the resolver takes the
    // name-lookup path (there is no stored ID for this guild).
    const savedStatic = settings.roles.member;
    settings.roles.member = '';
    try {
        const { role, created } = await guildSetup.resolveRole(guild, 'member');
        assert.equal(created, false, 'the styled role must be reused, not duplicated');
        assert.equal(role.id, styled.id);
        assert.equal(role.name, '👤 Member', 'the styled name must be renamed to plain');
        assert.equal(styled.setNameCalls, 1, 'the rename must have happened once');
        assert.equal(guild._roles.size, before, 'no second role must be created');
    } finally {
        settings.roles.member = savedStatic;
    }
});

test('a styled role found by stored ID is renamed to plain on resolve', async () => {
    const guild = makeGuild('guild-o');
    const styled = await guild.roles.create({ name: '🔴 𝓡𝓮𝓭' });
    // Pre-seed the BotSettings roleGroups blob only, and
    // neutralise the static value for the test.
    const doc = getDoc('guild-o');
    doc.extras.roleGroups = JSON.stringify({ color: { red: styled.id }, faction: {}, ping: {} });
    const savedStatic = settings.roles.color?.red;
    delete settings.roles.color.red;
    try {
        const { role, created } = await guildSetup.resolveGroupedRole(guild, 'color', 'red');
        assert.equal(created, false, 'the stored-ID role must be reused');
        assert.equal(role.id, styled.id);
        assert.equal(role.name, '🔴 Red', 'the styled name must be renamed to plain');
        assert.equal(styled.setNameCalls, 1);
    } finally {
        if (savedStatic !== undefined) settings.roles.color.red = savedStatic;
    }
});

test('a role that already exists with the plain name is left alone', async () => {
    const guild = makeGuild('guild-p');
    const plain = await guild.roles.create({ name: '👤 Member' });
    const savedStatic = settings.roles.member;
    settings.roles.member = '';
    try {
        const { role, created } = await guildSetup.resolveRole(guild, 'member');
        assert.equal(created, false);
        assert.equal(role.id, plain.id);
        assert.equal(role.name, '👤 Member');
        assert.equal(plain.setNameCalls, 0, 'a plain-named role must not be renamed');
    } finally {
        settings.roles.member = savedStatic;
    }
});

test('unrelated roles are never renamed when the resolver runs', async () => {
    const guild = makeGuild('guild-q');
    const unrelated = await guild.roles.create({ name: '𝓜𝓸𝓭𝓮𝓻𝓪𝓽𝓸𝓻' });
    const other = await guild.roles.create({ name: 'Random Role' });
    const savedStatic = settings.roles.member;
    settings.roles.member = '';
    try {
        await guildSetup.resolveRole(guild, 'member');
        assert.equal(unrelated.name, '𝓜𝓸𝓭𝓮𝓻𝓪𝓽𝓸𝓻', 'an unrelated styled role must keep its name');
        assert.equal(unrelated.setNameCalls, 0);
        assert.equal(other.name, 'Random Role');
        assert.equal(other.setNameCalls, 0);
    } finally {
        settings.roles.member = savedStatic;
    }
});

test('resolveChannel moves a canonical-name channel out of the old HORNET category into its group category', async () => {
    const guild = makeGuild('guild-j');
    const hornet = await guild.channels.create({ name: 'HORNET', type: ChannelType.GuildCategory });
    const cards = await guild.channels.create({ name: '🎴┃sfa-cards', type: ChannelType.GuildText, parent: hornet.id });
    const { channel, created } = await guildSetup.resolveChannel(guild, 'cards');
    assert.equal(created, false);
    assert.equal(channel.id, cards.id);
    const gallery = [...guild._channels.values()].find(c => c.name === '🎴 FATE GALLERY');
    assert.ok(gallery, 'gallery category must have been created');
    assert.equal(channel.parentId, gallery.id, 'cards must have moved into the gallery category');
});

test('applyVisibility hides the gallery from @everyone, keeps verification open, opens the gallery to the Member role', async () => {
    const guild = makeGuild('guild-i');
    await guildSetup.resolveChannel(guild, 'cards');
    await guildSetup.resolveChannel(guild, 'verification');
    const memberRole = (await guildSetup.resolveRole(guild, 'member')).role;
    await guildSetup.applyVisibility(guild);
    const editsFor = name => {
        const cat = [...guild._channels.values()].find(c => c.name === name);
        assert.ok(cat, `${name} must exist`);
        return new Map(cat.permissionOverwrites.edits.map(e => [e.target, e.perms.ViewChannel]));
    };
    const gallery = editsFor('🎴 FATE GALLERY');
    assert.equal(gallery.get('everyone'), false, '@everyone must NOT see the gallery');
    assert.equal(gallery.get(memberRole.id), true, 'Member role must see the gallery');
    assert.equal(gallery.get('botrole'), true, 'the bot role must see the gallery');
    const verification = editsFor('✅ VERIFICATION');
    assert.equal(verification.get('everyone'), true, '@everyone must see verification');
    assert.equal(verification.get(memberRole.id), true, 'Member role must see verification');
});

test('/setup on a bare guild puts channels in separate categories, migrates the old HORNET category, and never creates how-to-join', async () => {
    const guild = makeGuild('guild-k');
    // Pre-existing server state: an old HORNET category holding the
    // verification channel, as before v1.8.
    const hornet = await guild.channels.create({ name: 'HORNET', type: ChannelType.GuildCategory });
    const realCreate = guild.channels.create.bind(guild.channels);
    guild.channels.create = async opts => {
        const ch = await realCreate(opts);
        ch.send = async () => ({ id: 'msg1' });
        ch.messages = { fetch: async () => { throw new Error('no message'); } };
        return ch;
    };
    await guild.channels.create({ name: '📝┃verification', type: ChannelType.GuildText, parent: hornet.id });

    const setup = require(path.join(root, 'commands', 'setup', 'setup.js'));
    const replies = [];
    const interaction = {
        guild,
        client: {},
        user: { id: 'owner-1' },
        deferReply: async () => {},
        editReply: async msg => { replies.push(msg); }
    };
    await setup.execute(interaction);

    const byName = name => [...guild._channels.values()].find(c => c.name === name);
    const cards = byName('🎴┃sfa-cards');
    const galleryCat = byName('🎴 FATE GALLERY');
    const verificationCat = byName('✅ VERIFICATION');
    assert.ok(galleryCat, 'gallery category must exist');
    assert.ok(verificationCat, 'verification category must exist');
    assert.equal(cards.parentId, galleryCat.id, 'cards must be in the gallery category');
    assert.equal(byName('📝┃verification').parentId, verificationCat.id, 'verification must have moved into the verification category');
    assert.equal(byName('👋┃onboarding').parentId, verificationCat.id, 'onboarding must be in the verification category');
    assert.ok(!byName('🤝┃how-to-join'), 'how-to-join must NOT be created by /setup');
    assert.ok(!byName('HORNET'), 'the old HORNET category must have been deleted once empty');
    const embed = replies[0]?.embeds?.[0];
    assert.ok(embed && /HORNET Setup Complete/.test(embed.data.title), 'setup must report completion');
});
