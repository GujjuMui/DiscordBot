'use strict';

// Per-role images and banner links (v1.10):
//  - /selfroles faction-add / ping-add take an optional `image` link,
//    stored per entry as imageUrl and shown in the section's
//    MediaGallery (select-menu options cannot carry images).
//  - /selfroles banner-set takes an image attachment OR a `link`.
//  - Nothing is hardcoded: images and links come only from what the
//    owner pasted, stored per guild in BotSettings.
//
// Same stub setup as tests/selfroles-custom.test.js — the
// BotSettings repository is stubbed in require.cache BEFORE the
// resolver (and configLoader behind it) is loaded, so no MongoDB is
// touched. Fake role IDs are short strings like "role1": test
// fixtures, not Discord IDs. Banner/link URLs below are fixtures
// (example.com / cdn.discordapp.com paths that do not exist).
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

function panelContainer(guild, groups, custom, banners = {}) {
    const payload = buildSelfRolePanel(guild, { groups, custom, banners });
    return payload.components[0].toJSON();
}

// Components V2: MediaGallery is type 12.
function galleries(containerJson) {
    return (containerJson.components || []).filter(c => c.type === 12);
}

function galleryUrls(containerJson) {
    return galleries(containerJson).flatMap(g =>
        (g.items || []).map(item => item.media?.url).filter(Boolean)
    );
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

const IMG1 = 'https://example.com/images/legion.png';
const IMG2 = 'https://example.com/images/legion-v2.png';
const PING_IMG = 'https://example.com/images/giveaway.png';
const BANNER = 'https://example.com/images/faction-banner.png';

test('faction-add with an image link stores it and the panel gallery shows it', async () => {
    const guild = makeGuild('guild-img-a');
    const legion = await guild.roles.create({ name: 'Legion' });
    const selfroles = selfrolesCommand();

    const add = mockInteraction(guild, 'faction-add', {
        roles: { role: legion },
        strings: { description: 'Join the Legion faction', emoji: '⚔️', image: IMG1 }
    });
    await selfroles.execute(add);
    assert.ok(add.replies.some(r => /Added/.test(r.content)), `expected add confirmation, got ${JSON.stringify(add.replies)}`);

    let { factions } = await selfRoleCustom.getCustomLists(guild);
    assert.equal(factions.length, 1);
    assert.equal(factions[0].imageUrl, IMG1, 'image link must be stored on the entry');

    // The faction-list reply shows the stored image URL.
    const list = mockInteraction(guild, 'faction-list');
    await selfroles.execute(list);
    assert.ok(list.replies.some(r => r.content.includes(IMG1)), 'faction-list must show the image URL');

    // Panel gallery contains the entry image (no banner set).
    const container = panelContainer(guild, { color: {} }, { factions, pings: [] });
    assert.deepEqual(galleryUrls(container), [IMG1], 'gallery must hold the entry image');

    // Re-adding the same role with a new image updates it, not duplicates.
    const reAdd = mockInteraction(guild, 'faction-add', {
        roles: { role: legion },
        strings: { description: 'Join the Legion faction', emoji: '⚔️', image: IMG2 }
    });
    await selfroles.execute(reAdd);
    ({ factions } = await selfRoleCustom.getCustomLists(guild));
    assert.equal(factions.length, 1, 're-adding must update, not duplicate');
    assert.equal(factions[0].imageUrl, IMG2, 'new image must replace the old one');
    const container2 = panelContainer(guild, { color: {} }, { factions, pings: [] });
    assert.deepEqual(galleryUrls(container2), [IMG2]);

    // Re-adding without an image keeps the one already stored.
    const reAddNoImage = mockInteraction(guild, 'faction-add', {
        roles: { role: legion },
        strings: { description: 'Join the Legion faction', emoji: '⚔️' }
    });
    await selfroles.execute(reAddNoImage);
    ({ factions } = await selfRoleCustom.getCustomLists(guild));
    assert.equal(factions[0].imageUrl, IMG2, 're-adding without an image must keep the stored one');
});

test('ping-add with an image link stores it and the ping gallery shows it', async () => {
    const guild = makeGuild('guild-img-b');
    const giveaway = await guild.roles.create({ name: 'Giveaway ping' });
    const selfroles = selfrolesCommand();

    const add = mockInteraction(guild, 'ping-add', {
        roles: { role: giveaway },
        strings: { description: 'Get notified about giveaways', emoji: '🎁', image: PING_IMG }
    });
    await selfroles.execute(add);
    assert.ok(add.replies.some(r => /Added/.test(r.content)));

    const { pings } = await selfRoleCustom.getCustomLists(guild);
    assert.equal(pings[0].imageUrl, PING_IMG);

    const list = mockInteraction(guild, 'ping-list');
    await selfroles.execute(list);
    assert.ok(list.replies.some(r => r.content.includes(PING_IMG)), 'ping-list must show the image URL');

    const container = panelContainer(guild, { color: {} }, { factions: [], pings });
    assert.deepEqual(galleryUrls(container), [PING_IMG]);
});

test('banner-set via link stores the link and the panel shows it (banner first)', async () => {
    const guild = makeGuild('guild-img-c');
    const selfroles = selfrolesCommand();
    const original = settings.selfRoles.banners.faction;

    const set = mockInteraction(guild, 'banner-set', {
        strings: { section: 'faction', link: BANNER }
    });
    await selfroles.execute(set);
    try {
        assert.ok(set.replies.some(r => /Faction banner set/.test(r.content) && /from the link/.test(r.content)),
            `expected link banner confirmation, got ${JSON.stringify(set.replies)}`);
        assert.equal(settings.selfRoles.banners.faction, BANNER, 'in-memory banner must be updated in the same process');

        const banners = await guildSetup.getSelfRoleBanners(guild);
        assert.equal(banners.faction, BANNER, 'BotSettings banner must win over the static URL');

        // Banner comes first in the faction gallery, then the entry
        // image. The main section's own banner (from the static
        // config) may also be in the container, so check the last
        // two gallery URLs — the faction gallery is the last one.
        const legion = await guild.roles.create({ name: 'Legion' });
        await selfRoleCustom.addCustomEntry(guild, 'factions', {
            roleId: legion.id, name: 'Legion', description: 'Join the Legion faction', emoji: '⚔️', imageUrl: IMG1
        });
        const custom = await selfRoleCustom.getCustomLists(guild);
        const container = panelContainer(guild, { color: {} }, custom, banners);
        assert.deepEqual(galleryUrls(container).slice(-2), [BANNER, IMG1], 'faction gallery must be banner first, then entry images in list order');
    } finally {
        settings.selfRoles.banners.faction = original;
    }
});

test('banner-set with neither attachment nor link is rejected', async () => {
    const guild = makeGuild('guild-img-d');
    const selfroles = selfrolesCommand();
    const set = mockInteraction(guild, 'banner-set', {
        strings: { section: 'ping' }
    });
    await selfroles.execute(set);
    assert.ok(set.replies.some(r => /either an image attachment or a link/.test(r.content)),
        `expected missing-source error, got ${JSON.stringify(set.replies)}`);
});

test('banner-set with both attachment and link prefers the attachment and says so', async () => {
    const guild = makeGuild('guild-img-e');
    const selfroles = selfrolesCommand();
    const attached = 'https://cdn.discordapp.com/attachments/1/2/uploaded.png';
    const original = settings.selfRoles.banners.ping;

    const set = mockInteraction(guild, 'banner-set', {
        strings: { section: 'ping', link: BANNER },
        attachments: { image: { url: attached, contentType: 'image/png' } }
    });
    await selfroles.execute(set);
    try {
        assert.ok(set.replies.some(r => /Ping banner set/.test(r.content) && /the link was ignored/.test(r.content)),
            `expected attachment-wins reply, got ${JSON.stringify(set.replies)}`);
        assert.equal(settings.selfRoles.banners.ping, attached, 'the attachment URL must be the one stored');
    } finally {
        settings.selfRoles.banners.ping = original;
    }
});

test('a non-http image URL is rejected for add and for banner-set', async () => {
    const guild = makeGuild('guild-img-f');
    const legion = await guild.roles.create({ name: 'Legion' });
    const selfroles = selfrolesCommand();

    const badAdd = mockInteraction(guild, 'faction-add', {
        roles: { role: legion },
        strings: { description: 'Join the Legion faction', emoji: '⚔️', image: 'ftp://example.com/legion.png' }
    });
    await selfroles.execute(badAdd);
    assert.ok(badAdd.replies.some(r => /isn't a valid image URL/.test(r.content)),
        `expected URL error for faction-add, got ${JSON.stringify(badAdd.replies)}`);
    const { factions } = await selfRoleCustom.getCustomLists(guild);
    assert.deepEqual(factions, [], 'a rejected add must not store anything');

    const badBanner = mockInteraction(guild, 'banner-set', {
        strings: { section: 'faction', link: 'not-a-url' }
    });
    await selfroles.execute(badBanner);
    assert.ok(badBanner.replies.some(r => /isn't a valid image URL/.test(r.content)),
        `expected URL error for banner-set, got ${JSON.stringify(badBanner.replies)}`);
});

test('seed entries carry no image', async () => {
    const guild = makeGuild('guild-img-g');
    const doc = getDoc('guild-img-g');
    doc.extras.roleGroups = JSON.stringify({
        faction: { legion: 'role-legion', dynasty: 'role-dynasty' },
        ping: { giveaway: 'role-give', videos: 'role-vid' }
    });
    guild._roles.set('role-legion', { id: 'role-legion', name: 'Legion' });
    guild._roles.set('role-dynasty', { id: 'role-dynasty', name: 'Dynasty' });
    guild._roles.set('role-give', { id: 'role-give', name: 'Giveaway ping' });
    guild._roles.set('role-vid', { id: 'role-vid', name: 'SFA Videos Ping' });

    const { factions, pings } = await selfRoleCustom.getCustomLists(guild);
    assert.deepEqual(factions.map(e => e.name), ['Legion', 'Dynasty']);
    assert.deepEqual(pings.map(e => e.name), ['Giveaway ping', 'SFA Videos Ping']);
    for (const entry of [...factions, ...pings]) {
        assert.equal(entry.imageUrl, '', `seeded entry ${entry.name} must carry no image`);
    }
});

test('panel with no banner and no entry images shows no gallery (unchanged behaviour)', async () => {
    const guild = makeGuild('guild-img-h');
    const legion = await guild.roles.create({ name: 'Legion' });
    await selfRoleCustom.addCustomEntry(guild, 'factions', {
        roleId: legion.id, name: 'Legion', description: 'Join the Legion faction', emoji: '⚔️'
    });
    const custom = await selfRoleCustom.getCustomLists(guild);
    assert.equal(custom.factions[0].imageUrl, '', 'an entry added without an image stores an empty imageUrl');

    const container = panelContainer(guild, { color: {} }, custom, {});
    assert.equal(galleries(container).length, 0, 'no banner and no entry images must mean no gallery');
    assert.ok(JSON.stringify(container).includes('selfroles_faction'), 'the faction select itself must still be there');
});

test('a gallery with no images also stays hidden when the role list is empty', async () => {
    const guild = makeGuild('guild-img-i');
    const container = panelContainer(guild, { color: {} }, { factions: [], pings: [] }, {});
    assert.equal(galleries(container).length, 0, 'no sections, no galleries');
});

test('colour roles are unchanged: 10 colours, same names and colours', async () => {
    const guild = makeGuild('guild-img-j');
    const groups = await guildSetup.ensureSelfRoleGroups(guild);
    assert.equal(Object.keys(groups.color).length, 10);
    for (const [sub, def] of Object.entries(guildSetup.ROLE_GROUPS.color)) {
        assert.equal(groups.color[sub].name, def.name, `colour ${sub} name must match the canonical table`);
        assert.equal(groups.color[sub].color, def.color, `colour ${sub} colour must match the canonical table`);
    }
});
