'use strict';

// /servermap + /clan how-to-join-optional tests.
//
// Same BotSettings stub as tests/resolver.test.js (in-memory store,
// no MongoDB): the map message IDs are remembered in BotSettings
// extras, so a re-run edits the same message instead of posting
// a duplicate.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const store = new Map();

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
for (const key of Object.keys(require.cache)) {
    if (key.includes('configLoader') || key.includes('guildSetup') || key.includes('config/settings')) {
        delete require.cache[key];
    }
}
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repoStub };

const { ChannelType } = require('discord.js');

// ---- fake guild (richer than resolver.test.js: positions, values(), send/edit) ----
function makeGuild(id) {
    const channels = new Map();
    const roles = new Map();
    let n = 0;
    const cache = {
        find(fn) { for (const c of channels.values()) if (fn(c)) return c; return undefined; },
        get(channelId) { return channels.get(channelId); },
        values() { return channels.values(); },
        get size() { return channels.size; }
    };
    const roleCache = {
        find(fn) { for (const r of roles.values()) if (fn(r)) return r; return undefined; },
        get(roleId) { return roles.get(roleId); },
        values() { return roles.values(); },
        get size() { return roles.size; }
    };
    return {
        id,
        name: 'FATE Test Server',
        memberCount: 42,
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
                    },
                    _messages: new Map(),
                    async send({ embeds }) {
                        const m = {
                            id: `msg${++n}`,
                            embeds,
                            async edit({ embeds: next }) { this.embeds = next; },
                            async delete() { ch._messages.delete(this.id); }
                        };
                        ch._messages.set(m.id, m);
                        return m;
                    },
                    messages: {
                        fetch: async (messageId) => {
                            const m = ch._messages.get(messageId);
                            if (!m) throw new Error('Unknown Message');
                            return m;
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
            everyone: { id: 'everyone' },
            async create(opts) {
                const role = { id: `role${++n}`, name: opts.name, color: opts.color || 0 };
                roles.set(role.id, role);
                return role;
            }
        },
        members: {
            me: {
                permissions: { has: () => true },
                roles: {
                    highest: { position: 100 },
                    botRole: { id: 'botrole', name: 'Hornet' }
                }
            }
        },
        _channels: channels,
        _roles: roles
    };
}

function servermapInteraction(guild, replies) {
    return {
        guild,
        options: { getChannel: () => null },
        deferReply: async () => {},
        editReply: async msg => { replies.push(msg); }
    };
}

test('/servermap on a bare guild creates the map channel, posts the scanned map, and a re-run edits the same message', async () => {
    const guild = makeGuild('map-guild');
    // A couple of categories with channels, as a real server has.
    const galleryCat = await guild.channels.create({ name: '🎴 FATE GALLERY', type: ChannelType.GuildCategory });
    const cardsCh = await guild.channels.create({ name: '🎴┃sfa-cards', type: ChannelType.GuildText, parent: galleryCat.id });
    const verifyCat = await guild.channels.create({ name: '✅ VERIFICATION', type: ChannelType.GuildCategory });
    const verifyCh = await guild.channels.create({ name: '📝┃verification', type: ChannelType.GuildText, parent: verifyCat.id });
    await guild.channels.create({ name: 'general-chat', type: ChannelType.GuildText, parent: null });

    const servermap = require(path.join(root, 'commands', 'setup', 'servermap.js'));
    const replies = [];
    await servermap.execute(servermapInteraction(guild, replies));

    const mapChannel = [...guild._channels.values()].find(c => c.name === '🗺️┃server-map');
    assert.ok(mapChannel, 'server-map channel must have been created');
    const clanCat = [...guild._channels.values()].find(c => c.name === '⚔️ CLAN');
    assert.equal(mapChannel.parentId, clanCat.id, 'server-map must live in the CLAN category');
    assert.equal(mapChannel._messages.size, 1, 'exactly one map message must be posted');
    const firstMessage = [...mapChannel._messages.values()][0];
    const firstJson = firstMessage.embeds[0].toJSON();
    assert.ok(firstJson.title.includes('FATE Test Server'), 'title must name the server');
    assert.ok(firstJson.description.includes('42'), 'description must show the member count');
    // Channels are listed as mentions (<#id>), which render as
    // #name in Discord — so the assertions check the mentions.
    const firstText = JSON.stringify(firstJson);
    assert.ok(firstText.includes(`<#${cardsCh.id}>`), 'map must list the scanned cards channel');
    assert.ok(firstText.includes(`<#${verifyCh.id}>`), 'map must list the verification channel');
    assert.ok(firstJson.fields.some(f => f.name === '📂 No Category'), 'uncategorised channels must have their own field');
    assert.ok(!firstJson.description.includes('Join the clan'), 'how-to-join must NOT be pointed at when the channel does not exist');
    assert.ok(replies.some(r => /posted in/.test(r.content)), `expected a posted reply, got ${JSON.stringify(replies)}`);

    // The server grows: a new channel appears, and /servermap runs again.
    const artsCh = await guild.channels.create({ name: '🎨┃sfa-arts', type: ChannelType.GuildText, parent: galleryCat.id });
    const replies2 = [];
    await servermap.execute(servermapInteraction(guild, replies2));

    assert.equal(mapChannel._messages.size, 1, 'a re-run must edit, never post a second map');
    const secondJson = firstMessage.embeds[0].toJSON();
    assert.ok(JSON.stringify(secondJson).includes(`<#${artsCh.id}>`), 'the edited map must list the newly added channel');
    assert.ok(replies2.some(r => /updated in/.test(r.content)), `expected an updated reply, got ${JSON.stringify(replies2)}`);
});

test('/servermap lists how-to-join only when that channel exists', async () => {
    const guild = makeGuild('map-guild-2');
    const htj = await guild.channels.create({ name: '🤝┃how-to-join', type: ChannelType.GuildText, parent: null });
    const servermap = require(path.join(root, 'commands', 'setup', 'servermap.js'));
    const replies = [];
    await servermap.execute(servermapInteraction(guild, replies));
    const mapChannel = [...guild._channels.values()].find(c => c.name === '🗺️┃server-map');
    const json = [...mapChannel._messages.values()][0].embeds[0].toJSON();
    assert.ok(json.description.includes(`<#${htj.id}>`), 'map must point at how-to-join when it exists');
    assert.ok(JSON.stringify(json).includes(`<#${htj.id}>`), 'map must list how-to-join when it exists');
});

test('/clan setup with no how-to-join posts the panel in the current channel and creates no how-to-join channel', async () => {
    const guild = makeGuild('clan-guild');
    const currentChannel = {
        id: 'ch-current',
        name: 'general',
        type: ChannelType.GuildText,
        send: async msg => { currentChannel.sent = msg; return { id: 'msg1' }; },
        sent: null
    };

    const clan = require(path.join(root, 'commands', 'clan', 'clan.js'));
    const replies = [];
    const interaction = {
        guild,
        channel: currentChannel,
        options: { getChannel: () => null },
        reply: async msg => { replies.push(msg); }
    };
    await clan.execute(interaction);

    assert.ok(currentChannel.sent, 'the panel must be posted in the current channel');
    assert.ok(currentChannel.sent.embeds, 'the panel embed must be posted');
    assert.ok(![...guild._channels.values()].some(c => c.name === '🤝┃how-to-join'),
        'no how-to-join channel may be created');
    assert.ok(replies.some(r => /Clan join panel created/.test(r.content)),
        `expected the panel-created reply, got ${JSON.stringify(replies)}`);
});
