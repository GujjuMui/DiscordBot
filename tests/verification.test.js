'use strict';

// Universal /verification suite tests (services/verificationSetup.js,
// commands/verification/verification.js, events/memberJoinHandler.js,
// events/verificationButtonHandler.js).
//
// No MongoDB is touched: BotSettingsRepository and
// VerificationRepository are stubbed in require.cache BEFORE the
// modules under test are loaded (same pattern as
// tests/resolver.test.js). The fake guild's channel/role IDs are
// short strings like "ch1" — test fixtures, not Discord IDs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { ChannelType, PermissionFlagsBits } = require('discord.js');

// ---- in-memory stores -------------------------------------------------
const botSettingsStore = new Map(); // guildId -> doc

function getDoc(guildId) {
    if (!botSettingsStore.has(guildId)) {
        botSettingsStore.set(guildId, { guildId, channels: {}, roles: {}, banners: {}, extras: {} });
    }
    return botSettingsStore.get(guildId);
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

const botSettingsStub = {
    async findOne(filter) {
        const doc = botSettingsStore.get(filter?.guildId);
        return doc ? JSON.parse(JSON.stringify(doc)) : null;
    },
    async findOneAndUpdate(filter, update) {
        const doc = getDoc(filter.guildId);
        applySet(doc, update);
        return JSON.parse(JSON.stringify(doc));
    }
};

const verificationStore = new Map(); // guildId -> verification config
const verificationStub = {
    emptyConfig(guildId) {
        const config = { guildId: guildId || '' };
        for (const f of ['verifiedRoleId', 'welcomeCategoryId', 'rulesChannelId', 'verificationChannelId', 'guideChannelId', 'supportChannelId', 'onboardingChannelId', 'customFooter', 'accentColor']) config[f] = '';
        return config;
    },
    isConfigured(config) { return Boolean(config && config.onboardingChannelId); },
    async getVerificationConfig(guildId) {
        const stored = verificationStore.get(guildId);
        return stored ? JSON.parse(JSON.stringify(stored)) : null;
    },
    async saveVerificationConfig(guildId, patch = {}) {
        const current = verificationStore.get(guildId) || this.emptyConfig(guildId);
        const next = { ...current, ...patch };
        verificationStore.set(guildId, next);
        return JSON.parse(JSON.stringify(next));
    }
};

// Stub both repositories before loading anything that requires them.
for (const key of Object.keys(require.cache)) {
    if (key.includes('configLoader') || key.includes('guildSetup') || key.includes('config/settings')
        || key.includes('verificationSetup') || key.includes('VerificationRepository')
        || key.includes('memberJoinHandler') || key.includes('verificationButtonHandler')
        || key.includes('commands/verification')) {
        delete require.cache[key];
    }
}
const botSettingsRepoPath = require.resolve(path.join(root, 'repositories', 'BotSettingsRepository.js'));
require.cache[botSettingsRepoPath] = { id: botSettingsRepoPath, filename: botSettingsRepoPath, loaded: true, exports: botSettingsStub };
const verificationRepoPath = require.resolve(path.join(root, 'repositories', 'VerificationRepository.js'));
require.cache[verificationRepoPath] = { id: verificationRepoPath, filename: verificationRepoPath, loaded: true, exports: verificationStub };

const service = require(path.join(root, 'services', 'verificationSetup.js'));
const command = require(path.join(root, 'commands', 'verification', 'verification.js'));
const memberJoinHandler = require(path.join(root, 'events', 'memberJoinHandler.js'));
const verifyButtonHandler = require(path.join(root, 'events', 'verificationButtonHandler.js'));

// ---- fake guild --------------------------------------------------------
function makeGuild(id, name = 'Test Server') {
    const channels = new Map();
    const roles = new Map();
    let n = 0;
    const cache = {
        find(fn) { for (const c of channels.values()) if (fn(c)) return c; return undefined; },
        get(channelId) { return channels.get(channelId); },
        values() { return channels.values(); }
    };
    const roleCache = {
        find(fn) { for (const r of roles.values()) if (fn(r)) return r; return undefined; },
        get(roleId) { return roles.get(roleId); }
    };
    const guild = {
        id,
        name,
        iconURL: () => null,
        channels: {
            cache,
            async fetch(channelId) { return channels.get(channelId) || null; },
            async create(opts) {
                n += 1;
                const channel = {
                    id: `ch${n}`,
                    name: opts.name,
                    type: opts.type,
                    parentId: opts.parent || null,
                    guild,
                    permissionOverwrites: {
                        edits: [],
                        async edit(role, overwrite) {
                            this.edits.push({ roleId: role.id, overwrite });
                        }
                    },
                    overwritesOnCreate: opts.permissionOverwrites || [],
                    sent: [],
                    async send(payload) { this.sent.push(payload); return payload; },
                    async setParent(parentId) { this.parentId = parentId; },
                    async lockPermissions() { this.locked = true; },
                    messages: {
                        fetch: async () => {
                            const map = new Map();
                            channel.sent.forEach((payload, i) => {
                                map.set(`m${i}`, {
                                    author: { id: 'bot-user' },
                                    client: { user: { id: 'bot-user' } },
                                    embeds: payload.embeds || []
                                });
                            });
                            return map;
                        }
                    }
                };
                channels.set(channel.id, channel);
                return channel;
            }
        },
        roles: {
            cache: roleCache,
            everyone: { id: 'everyone' },
            async fetch(roleId) { return roles.get(roleId) || null; }
        },
        members: {
            me: {
                permissions: { has: () => true },
                roles: { highest: { position: 10 } }
            }
        },
        _channels: channels,
        _roles: roles
    };
    return guild;
}

const FULL_CONFIG = {
    verifiedRoleId: 'role1',
    welcomeCategoryId: 'ch1',
    rulesChannelId: 'ch2',
    verificationChannelId: 'ch3',
    guideChannelId: 'ch4',
    supportChannelId: 'ch5',
    onboardingChannelId: 'ch6',
    customFooter: '',
    accentColor: ''
};

// ---- embeds ------------------------------------------------------------
test('rules embed covers all ten standard rules and the guidelines link', () => {
    const guild = makeGuild('g1');
    const embed = service.buildRulesEmbed(guild, {}).toJSON();
    assert.equal(embed.title, '📜 Server Rules');
    for (const phrase of ['Be respectful', 'inappropriate language', 'spamming', 'NSFW', 'advertisements', 'offensive names', 'raiding', 'threats', 'Community Guidelines', 'Voice chat']) {
        assert.ok(embed.description.includes(phrase), `rules embed must mention: ${phrase}`);
    }
    assert.ok(embed.description.includes('https://discord.com/guidelines'));
    assert.equal(embed.footer.text, 'Test Server');
});

test('verification embed is branded with the guild name and icon', () => {
    const guild = makeGuild('g1', 'My Cool Server');
    guild.iconURL = () => 'https://example.com/icon.png';
    const embed = service.buildVerificationEmbed(guild, {}).toJSON();
    assert.ok(embed.title.includes('My Cool Server'));
    assert.ok(embed.description.includes('**My Cool Server**'));
    assert.equal(embed.thumbnail.url, 'https://example.com/icon.png');
    const row = service.buildVerifyRow().toJSON();
    assert.equal(row.components[0].custom_id, 'verify');
    assert.equal(row.components[0].label, 'Verify');
});

test('onboarding embed resolves dynamic guild name and channel mentions', () => {
    const guild = makeGuild('g1', 'My Cool Server');
    const member = { id: 'user9', guild };
    const embed = service.buildOnboardingEmbed(member, FULL_CONFIG).toJSON();
    assert.equal(embed.title, '👋 Welcome to My Cool Server');
    assert.ok(embed.description.includes('Welcome to the server, <@user9>!'));
    assert.ok(embed.description.includes('<#ch2>'), 'rules mention');
    assert.ok(embed.description.includes('<#ch3>'), 'verification mention');
    assert.ok(embed.description.includes('<#ch4>'), 'guide mention');
    assert.ok(embed.description.includes('<#ch5>'), 'support mention');
    assert.ok(embed.description.includes('welcome to **My Cool Server**!'));
    assert.equal(embed.footer.text, 'My Cool Server • Welcome');
    assert.ok(embed.timestamp);
});

test('parseAccentColor accepts hex and falls back on bad input', () => {
    assert.equal(service.parseAccentColor('#5865F2'), 0x5865F2);
    assert.equal(service.parseAccentColor('5865F2'), 0x5865F2);
    assert.equal(service.parseAccentColor('not-a-colour'), 0x5865F2);
    assert.equal(service.parseAccentColor(''), 0x5865F2);
    assert.equal(service.parseAccentColor('#ED4245', 0x111111), 0xED4245);
});

test('setup delay sits inside the 1.5–2.5s anti-raid window', () => {
    assert.ok(service.SETUP_STEP_DELAY_MS >= 1500 && service.SETUP_STEP_DELAY_MS <= 2500);
    assert.equal(service.WELCOME_CATEGORY_NAME, 'WELCOME');
    assert.deepEqual(
        service.CHANNEL_DEFS.map(d => d.name),
        ['📜│server-rules', '📝│verification', '📖│server-guide', '💬│server-support', '👋│onboarding']
    );
});

// ---- setup -------------------------------------------------------------
test('/verification setup creates WELCOME + 5 channels with spec permissions and persists IDs', async () => {
    const guild = makeGuild('g-setup');
    const result = await service.setupVerificationChannels(guild, { delayMs: 0, store: verificationStub });
    assert.equal(guild._channels.size, 6);
    const category = [...guild._channels.values()].find(c => c.type === ChannelType.GuildCategory);
    assert.equal(category.name, 'WELCOME');
    assert.deepEqual(category.overwritesOnCreate, [{
        id: 'everyone',
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.MentionEveryone]
    }]);
    const names = [...guild._channels.values()].filter(c => c.type === ChannelType.GuildText).map(c => c.name);
    assert.deepEqual(names, ['📜│server-rules', '📝│verification', '📖│server-guide', '💬│server-support', '👋│onboarding']);
    for (const channel of guild._channels.values()) {
        if (channel.type === ChannelType.GuildText) assert.equal(channel.parentId, category.id);
    }
    const support = [...guild._channels.values()].find(c => c.name === '💬│server-support');
    assert.deepEqual(support.overwritesOnCreate, [{
        id: 'everyone',
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        deny: [PermissionFlagsBits.MentionEveryone, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads]
    }]);
    const rules = [...guild._channels.values()].find(c => c.name === '📜│server-rules');
    assert.deepEqual(rules.overwritesOnCreate, [], 'read-only channels inherit the category overwrites');
    assert.equal(result.created.length, 6);
    assert.equal(result.reused.length, 0);
    const saved = verificationStore.get('g-setup');
    assert.equal(saved.welcomeCategoryId, category.id);
    assert.equal(saved.rulesChannelId, rules.id);
    assert.equal(saved.onboardingChannelId, [...guild._channels.values()].find(c => c.name === '👋│onboarding').id);
});

test('/verification setup re-run reuses everything and posts no duplicate panels', async () => {
    const guild = makeGuild('g-rerun');
    await service.setupVerificationChannels(guild, { delayMs: 0, store: verificationStub });
    const second = await service.setupVerificationChannels(guild, { delayMs: 0, store: verificationStub });
    assert.equal(guild._channels.size, 6, 're-run must not duplicate channels');
    assert.equal(second.created.length, 0);
    assert.equal(second.reused.length, 6);
    const posted = await service.postVerificationMessages(guild, second.channels, second.config || {});
    assert.equal(posted.rulesPosted, true);
    assert.equal(posted.verificationPosted, true);
    const postedAgain = await service.postVerificationMessages(guild, second.channels, second.config || {});
    assert.equal(postedAgain.rulesPosted, false, 'rules panel already present');
    assert.equal(postedAgain.verificationPosted, false, 'verification panel already present');
});

// ---- command shape -----------------------------------------------------
test('/verification exposes setup + config with every override option', () => {
    const json = command.data.toJSON();
    assert.equal(json.name, 'verification');
    assert.equal(json.default_member_permissions, String(PermissionFlagsBits.Administrator));
    const subs = Object.fromEntries(json.options.map(o => [o.name, o]));
    assert.ok(subs.setup);
    assert.ok(subs.config);
    const configOptions = subs.config.options.map(o => o.name);
    for (const name of ['verified_role', 'onboarding_channel', 'rules_channel', 'verification_channel', 'guide_channel', 'support_channel', 'custom_footer', 'accent_color']) {
        assert.ok(configOptions.includes(name), `config must offer ${name}`);
    }
});

// ---- member join -------------------------------------------------------
test('member join exits gracefully when the guild is unconfigured', async () => {
    const guild = makeGuild('g-unconfigured');
    let sendCalled = false;
    guild.channels.fetch = async () => { sendCalled = true; return null; };
    await memberJoinHandler({ id: 'user1', guild });
    assert.equal(sendCalled, false, 'unconfigured guild must not fetch/create channels on join');
});

test('member join posts the onboarding embed into the saved channel', async () => {
    verificationStore.set('g-joined', { ...FULL_CONFIG, guildId: 'g-joined' });
    const guild = makeGuild('g-joined', 'Joined Server');
    // Seed the saved onboarding channel into the fake guild.
    const onboarding = await guild.channels.create({ name: '👋│onboarding', type: ChannelType.GuildText, parent: 'ch1' });
    verificationStore.get('g-joined').onboardingChannelId = onboarding.id;
    await memberJoinHandler({ id: 'user7', guild });
    assert.equal(onboarding.sent.length, 1);
    const embed = onboarding.sent[0].embeds[0].toJSON();
    assert.equal(embed.title, '👋 Welcome to Joined Server');
    assert.ok(embed.description.includes('<@user7>'));
});

// ---- verify button -----------------------------------------------------
function makeButtonInteraction(guild, role) {
    const replies = [];
    return {
        interaction: {
            isButton: () => true,
            customId: 'verify',
            guild,
            user: { id: 'user5', createdTimestamp: Date.now() - 100 * 24 * 60 * 60 * 1000 },
            member: {
                joinedTimestamp: Date.now() - 60 * 60 * 1000,
                roles: {
                    cache: { has: () => false },
                    add: async r => replies.push(['role-added', r.id])
                }
            },
            replied: false,
            deferred: false,
            async deferReply() { this.deferred = true; },
            async editReply(options) { replies.push(['editReply', options]); }
        },
        replies
    };
}

test('Verify button grants the configured role and confirms ephemerally', async () => {
    const guild = makeGuild('g-verify', 'Verify Server');
    const role = { id: 'role1', name: '👤 Member', position: 1 };
    guild._roles.set('role1', role);
    verificationStore.set('g-verify', { ...verificationStub.emptyConfig('g-verify'), verifiedRoleId: 'role1' });
    const { interaction, replies } = makeButtonInteraction(guild, role);
    const handled = await verifyButtonHandler(interaction);
    assert.equal(handled, true);
    assert.deepEqual(replies[0], ['role-added', 'role1']);
    assert.ok(replies[1][1].content.includes("You're verified in **Verify Server**"));
});

test('Verify button without a configured role tells the member to ask an admin', async () => {
    const guild = makeGuild('g-verify-none');
    verificationStore.delete('g-verify-none');
    const { interaction, replies } = makeButtonInteraction(guild, null);
    const handled = await verifyButtonHandler(interaction);
    assert.equal(handled, true);
    assert.equal(replies.filter(r => r[0] === 'role-added').length, 0);
    assert.ok(replies[0][1].content.includes('No verified role is set up yet'));
});

// ---- no hardcoded server names in the verification flow ---------------
test('verification flow has no hardcoded server name', () => {
    const files = [
        'commands/verification/verification.js',
        'events/verificationButtonHandler.js',
        'events/verificationModalHandler.js',
        'events/memberJoinHandler.js',
        'services/verificationSetup.js'
    ];
    for (const file of files) {
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        assert.ok(!text.includes('F A T E - SF'), `${file} must not hardcode the server name`);
        assert.ok(!text.includes('FATE - SF'), `${file} must not hardcode the server name`);
    }
});
