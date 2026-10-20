'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
const routes = {
    button: ['giveroleButtonHandler', 'editCardButtonHandler', 'editArtButtonHandler', 'deleteArtButtonHandler', 'verificationButtonHandler', 'clanButtonHandler', 'tryoutButtonHandler', 'categoryMenuButtonHandler', 'galleryButtonHandler', 'selfRoleHandler'],
    select: ['helpMenuHandler', 'linkSelectHandler', 'gallerySelectHandler', 'selfRoleHandler', 'selectMenuHandler'],
    modal: ['editCardModalHandler', 'verificationModalHandler', 'editArtModalHandler', 'tryoutModalHandler']
};

async function loadBot(options = {}) {
    const listeners = new Map();
    const calls = [];
    const errors = [];
    const exits = [];
    const processListeners = new Map();
    let diagnosticsReadyAtConnect = false;
    const processMock = {
        on: (event, handler) => processListeners.set(event, handler),
        exit: code => exits.push(code)
    };
    const command = { data: { name: 'sample' }, execute: async interaction => {
        calls.push('execute');
        assert.equal(interaction.commandName, 'sample');
        if (options.commandError) throw new Error('command failed');
    } };
    let client;
    class Client {
        constructor(config) { this.config = config; client = this; }
        once(event, handler) { listeners.set(event, handler); }
        on(event, handler) { listeners.set(event, handler); }
        async login(token) {
            assert.equal(token, 'test-token');
            calls.push('login');
            if (options.loginError) throw new Error('login failed');
        }
    }
    function mockRequire(id) {
        if (id === 'discord.js') return {
            Client, Collection: Map,
            GatewayIntentBits: { Guilds: 1, GuildMembers: 2, GuildMessages: 4, MessageContent: 8 },
            Events: { ClientReady: 'ready', GuildMemberAdd: 'member', MessageCreate: 'message', InteractionCreate: 'interaction' },
            MessageFlags: { Ephemeral: 64 }
        };
        if (id === 'fs') return {
            readdirSync: directory => directory === path.join(root, 'commands') ? ['utility', 'ignore.txt'] : ['sample.js', 'invalid.js', 'ignore.txt'],
            statSync: entry => ({ isDirectory: () => !entry.endsWith('.txt') })
        };
        if (id === 'path') return path;
        if (id === './config/config') return { token: 'test-token', features: { channelManager: true, broadcast: true } };
        if (id === './database/Card') return {};
        if (id === './config/settings') return {};
        if (id === './database/mongo') return async () => {
            diagnosticsReadyAtConnect = processListeners.has('unhandledRejection') && processListeners.has('uncaughtException');
            calls.push('mongo');
            if (options.mongoError) throw new Error('mongo failed');
        };
        if (id === './config/protectedCommands') return options.trusted ? ['sample'] : [];
        if (id === './config/adminCommands') return options.admin ? ['sample'] : [];
        if (id === './utils/checkPermission' || id === './utils/checkAdminPermission') return async () => {
            const name = id.endsWith('/checkPermission') ? 'trusted' : 'admin';
            calls.push(name);
            if (options.permissionError === name) throw new Error('permission failed');
            return options.denied !== name;
        };
        if (id === './utils/checkGuildAuth') return async () => true;
        if (id.startsWith('./events/')) return async interaction => {
            const name = id.slice('./events/'.length);
            calls.push(name);
            if (options.handlerError === name) throw new Error('handler failed');
            assert.ok(interaction);
            return options.handled === name;
        };
        if (id === path.join(root, 'commands', 'utility', 'sample.js')) return command;
        if (id === path.join(root, 'commands', 'utility', 'invalid.js')) return {};
        throw new Error(`Unexpected dependency: ${id}`);
    }
    vm.runInNewContext(source, {
        require: mockRequire, __dirname: root, process: processMock,
        console: { log() {}, clear() {}, error: (...args) => errors.push(args) }
    }, { filename: 'index.js' });
    await new Promise(resolve => setImmediate(resolve));
    return { listeners, calls, errors, client, exits, processListeners, diagnosticsReadyAtConnect };
}

async function invokeEvent(bot, eventName, input) {
    return bot.listeners.get(eventName)(input);
}


function interaction(kind, state = {}) {
    const responses = [];
    return {
        commandName: 'sample', replied: false, deferred: false, ...state, responses,
        isButton: () => kind === 'button',
        isStringSelectMenu: () => kind === 'select',
        isModalSubmit: () => kind === 'modal',
        isChatInputCommand: () => kind === 'command',
        async reply(payload) { responses.push({ method: 'reply', ...payload }); },
        async editReply(payload) { responses.push({ method: 'editReply', ...payload }); }
    };
}

const plain = value => JSON.parse(JSON.stringify(value));

test('startup connects MongoDB before Discord and keeps existing intents', async () => {
    const bot = await loadBot();
    assert.deepEqual(bot.calls, ['mongo', 'login']);
    assert.deepEqual(plain(bot.client.config.intents), [1, 2, 4, 8]);
    assert.equal(bot.client.commands.size, 1);
    assert.ok(bot.client.commands.has('sample'));
});

for (const [kind, handlers] of Object.entries(routes)) {
    for (const [index, handled] of handlers.entries()) {
        test(`${kind} keeps handler order and stops at ${handled}`, async () => {
            const bot = await loadBot({ handled });
            const input = interaction(kind);
            await bot.listeners.get('interaction')(input);
            assert.deepEqual(bot.calls.slice(2), handlers.slice(0, index + 1));
            assert.deepEqual(input.responses, []);
        });
    }
    test(`${kind} visits all handlers when none handles the interaction`, async () => {
        const bot = await loadBot();
        await bot.listeners.get('interaction')(interaction(kind));
        assert.deepEqual(bot.calls.slice(2), handlers);
    });
}

for (const scenario of [
    { name: 'public', options: {}, expected: ['execute'] },
    { name: 'trusted allowed', options: { trusted: true }, expected: ['trusted', 'execute'] },
    { name: 'trusted denied', options: { trusted: true, denied: 'trusted' }, expected: ['trusted'] },
    { name: 'admin allowed', options: { admin: true }, expected: ['admin', 'execute'] },
    { name: 'admin denied', options: { admin: true, denied: 'admin' }, expected: ['admin'] },
    { name: 'both allowed', options: { trusted: true, admin: true }, expected: ['trusted', 'admin', 'execute'] },
    { name: 'both with trusted denied', options: { trusted: true, admin: true, denied: 'trusted' }, expected: ['trusted'] }
]) {
    test(`command permission gating: ${scenario.name}`, async () => {
        const bot = await loadBot(scenario.options);
        await bot.listeners.get('interaction')(interaction('command'));
        assert.deepEqual(bot.calls.slice(2), scenario.expected);
    });
}

test('unknown commands and unsupported interactions are ignored', async () => {
    const bot = await loadBot();
    await bot.listeners.get('interaction')(interaction('command', { commandName: 'missing' }));
    await bot.listeners.get('interaction')(interaction('unknown'));
    assert.deepEqual(bot.calls, ['mongo', 'login']);
});

for (const state of [{}, { deferred: true }, { replied: true }]) {
    test(`existing command error response is preserved: ${JSON.stringify(state)}`, async () => {
        const bot = await loadBot({ commandError: true });
        const input = interaction('command', state);
        await bot.listeners.get('interaction')(input);
        const expected = state.deferred
            ? [{ method: 'editReply', content: '❌ Something went wrong.' }]
            : state.replied ? [] : [{ method: 'reply', content: '❌ Something went wrong.', flags: 64 }];
        assert.deepEqual(plain(input.responses), expected);
        assert.ok(bot.errors.length > 0);
    });
    test(`existing button error response is preserved: ${JSON.stringify(state)}`, async () => {
        const bot = await loadBot({ handlerError: 'giveroleButtonHandler' });
        const input = interaction('button', state);
        await bot.listeners.get('interaction')(input);
        const expected = state.replied || state.deferred
            ? []
            : [{ method: 'reply', content: '❌ Something went wrong.', flags: 64 }];
        assert.deepEqual(plain(input.responses), expected);
    });
}

for (const [event, handler] of [['member', 'memberJoinHandler'], ['message', 'messageCreate']]) {
    test(`${event} delegates and contains handler failures`, async () => {
        const bot = await loadBot({ handlerError: handler });
        await bot.listeners.get(event)({});
        assert.deepEqual(bot.calls.slice(2), [handler]);
        assert.ok(bot.errors.length > 0);
    });
}

// New failure-path regressions. These intentionally extend error handling only.
for (const kind of ['select', 'modal']) {
    for (const [index, handler] of routes[kind].entries()) {
        for (const state of [{}, { deferred: true }, { replied: true }]) {
            test(`${kind} contains ${handler} rejection: ${JSON.stringify(state)}`, async () => {
                const bot = await loadBot({ handlerError: handler });
                const input = interaction(kind, state);
                await bot.listeners.get('interaction')(input);
                assert.deepEqual(bot.calls.slice(2), routes[kind].slice(0, index + 1));
                const expected = state.deferred
                    ? [{ method: 'editReply', content: '❌ Something went wrong.' }]
                    : state.replied ? [] : [{ method: 'reply', content: '❌ Something went wrong.', flags: 64 }];
                assert.deepEqual(plain(input.responses), expected);
                assert.ok(bot.errors.length > 0);
            });
        }
    }
}

for (const permission of ['trusted', 'admin']) {
    test(`${permission} lookup rejection is contained and never executes the command`, async () => {
        const bot = await loadBot({ [permission]: true, permissionError: permission });
        const input = interaction('command');
        await bot.listeners.get('interaction')(input);
        assert.deepEqual(bot.calls.slice(2), [permission]);
        assert.deepEqual(plain(input.responses), [{ method: 'reply', content: '❌ Something went wrong.', flags: 64 }]);
    });
}

for (const deferred of [false, true]) {
    test(`failed error responses remain contained (deferred=${deferred})`, async () => {
        const bot = await loadBot({ handlerError: 'selectMenuHandler' });
        const input = interaction('select', { deferred });
        input.reply = input.editReply = async () => { throw new Error('response unavailable'); };
        await bot.listeners.get('interaction')(input);
        assert.ok(bot.errors.some(args => args[0] === 'Failed to send error message:'));
    });
}

test('process diagnostics are registered before asynchronous startup', async () => {
    const bot = await loadBot();
    assert.equal(bot.diagnosticsReadyAtConnect, true);
    assert.deepEqual(bot.exits, []);
});

for (const failure of ['mongoError', 'loginError']) {
    test(`${failure} is logged and terminates with status 1`, async () => {
        const bot = await loadBot({ [failure]: true });
        assert.deepEqual(bot.exits, [1]);
        assert.deepEqual(bot.calls, failure === 'mongoError' ? ['mongo'] : ['mongo', 'login']);
        assert.ok(bot.errors.some(args => args[0] === '========== STARTUP ERROR =========='));
    });
}


// Phase 2 regression coverage.
test('owner-only handlers use centralized owner configuration', async () => {
    const ownerConfig = fs.readFileSync(
        path.join(root, 'config', 'owner.js'),
        'utf8'
    );

    const ownerIdMatch = ownerConfig.match(/ownerId:\s*"([^"]+)"/);
    assert.ok(ownerIdMatch);

    for (const eventFile of [
        path.join(root, 'events', 'giveroleButtonHandler.js'),
        path.join(root, 'commands', 'admin', 'autoreply.js')
    ]) {
        const source = fs.readFileSync(eventFile, 'utf8');
        assert.ok(source.includes('owner.ownerId'));
        assert.ok(!source.includes(ownerIdMatch[1]));
    }
});

test('card and art edit commands support remote image URLs without local upload files', async () => {
    const fixtures = [
        {
            file: path.join(root, 'commands', 'cards', 'editcard.js'),
            model: 'card.imageFile'
        },
        {
            file: path.join(root, 'commands', 'screenshots', 'editart.js'),
            model: 'art.imageFile'
        }
    ];

    for (const fixture of fixtures) {
        const source = fs.readFileSync(fixture.file, 'utf8');
        assert.ok(source.includes('startsWith("https://")'));
        assert.ok(source.includes('attachment://'));
    }
});

test('gallery and link handlers contain no diagnostic console logging', async () => {
    const files = [
        path.join(root, 'events', 'galleryButtonHandler.js'),
        path.join(root, 'events', 'gallerySelectHandler.js'),
        path.join(root, 'commands', 'links', 'addlink.js')
    ];

    for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        assert.ok(!source.includes('console.log("Categories:"'));
        assert.ok(!source.includes('console.log("Looking for:"'));
    }
});


// Phase 3 gallery runtime regression coverage.
test('art category handler uses galleryV2 and keys state by message id', async () => {
    const source = fs.readFileSync(
        path.join(root, 'events', 'selectMenuHandler.js'),
        'utf8'
    );

    assert.ok(source.includes('../services/galleryV2'));
    assert.ok(source.includes('gallery.open(interaction.message.id'));
    assert.ok(!source.includes('../services/galleryService'));
    assert.ok(!source.includes('gallery.open(\n        interaction.user.id'));
});

test('link category handler keys gallery state by message id', async () => {
    const source = fs.readFileSync(
        path.join(root, 'events', 'linkSelectHandler.js'),
        'utf8'
    );

    assert.ok(source.includes('gallery.open(interaction.message.id'));
    assert.ok(!source.includes('gallery.open(interaction.user.id'));
});


// Phase 4 runtime safety coverage.
test('onboarding handler ignores invalid configured channel ids without fetching', async () => {
    const source = fs.readFileSync(
        path.join(root, 'events', 'memberJoinHandler.js'),
        'utf8'
    );

    assert.ok(source.includes('getConfiguredChannelId'));
    assert.ok(source.includes('return null'));
    assert.ok(source.includes('Onboarding channel is unavailable; skipping welcome message.'));
    assert.ok(!source.includes('Onboarding channel not found:'));
});

test('Discord interaction responses use flags instead of deprecated ephemeral option', async () => {
    const files = [
        path.join(root, 'commands', 'admin', 'autoreply.js'),
        path.join(root, 'events', 'giveroleButtonHandler.js')
    ];

    for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        assert.ok(source.includes('MessageFlags.Ephemeral'));
        assert.ok(!source.includes('ephemeral: true'));
        assert.ok(!source.includes('ephemeral: false'));
    }
});


// Phase 1 systematization regression coverage.
test('selfRoleHandler uses MessageFlags.Ephemeral not deprecated ephemeral option', () => {
    const source = fs.readFileSync(
        path.join(root, 'events', 'selfRoleHandler.js'),
        'utf8'
    );
    assert.ok(source.includes('MessageFlags.Ephemeral'), 'selfRoleHandler must use MessageFlags.Ephemeral');
    assert.ok(!source.includes('ephemeral: true'), 'selfRoleHandler must not use deprecated ephemeral: true');
});

test('cloudinary utility does not fire a network ping on module load', () => {
    const source = fs.readFileSync(
        path.join(root, 'utils', 'cloudinary.js'),
        'utf8'
    );
    assert.ok(!source.includes('api.ping()'), 'cloudinary.js must not call api.ping() at module scope');
    assert.ok(!source.includes('CLOUDINARY TEST'), 'cloudinary.js must not contain debug ping log messages');
});

test('index.js uses protectedCommands variable name not trustedCommands', () => {
    const source = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
    assert.ok(source.includes('protectedCommands'), 'index.js must declare protectedCommands');
    assert.ok(!source.includes('trustedCommands'), 'index.js must not use old trustedCommands alias');
});

test('dead config and utils permission files have been removed', () => {
    const deadFiles = [
        path.join(root, 'config', 'trustedCommands.js'),
        path.join(root, 'config', 'permissions.js'),
        path.join(root, 'utils', 'permissions.js')
    ];
    for (const file of deadFiles) {
        assert.ok(!fs.existsSync(file), `Dead file must not exist: ${file}`);
    }
});


// Phase 2 systematization regression coverage.
test('owner-dependent commands import config/owner not settings.ownerId', () => {
    const files = [
        path.join(root, 'commands', 'admin', 'selfroles.js'),
        path.join(root, 'commands', 'utility', 'say.js'),
        path.join(root, 'commands', 'admin', 'member.js'),
        path.join(root, 'commands', 'admin', 'spam.js'),
        path.join(root, 'commands', 'admin', 'stopspam.js'),
        path.join(root, 'commands', 'admin', 'giverole.js')
    ];
    for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        assert.ok(source.includes('config/owner'), `${path.basename(file)} must import config/owner`);
        assert.ok(source.includes('owner.ownerId'), `${path.basename(file)} must use owner.ownerId`);
        assert.ok(!source.includes('settings.ownerId'), `${path.basename(file)} must not use settings.ownerId`);
        assert.ok(!source.includes('"1466871611893219455"'), `${path.basename(file)} must not hardcode the owner ID`);
    }
});

test('config/settings.js does not duplicate ownerId', () => {
    const source = fs.readFileSync(path.join(root, 'config', 'settings.js'), 'utf8');
    assert.ok(!source.includes('ownerId'), 'settings.js must not contain ownerId — use config/owner.js instead');
});

test('package.json does not list unused dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const deps = Object.keys(pkg.dependencies || {});
    assert.ok(!deps.includes('@discordjs/builders'), 'package.json must not list unused @discordjs/builders');
    assert.ok(!deps.includes('@discordjs/rest'), 'package.json must not list unused @discordjs/rest');
    assert.ok(!deps.includes('uuid'), 'package.json must not list unused uuid');
});


// Batch 1 deep-cleanup regression coverage (P0 + P1).

test('editArtButtonHandler does not intercept card button custom IDs', () => {
    const source = fs.readFileSync(
        path.join(root, 'events', 'editArtButtonHandler.js'),
        'utf8'
    );
    assert.ok(!source.includes('edit_card_name'), 'editArtButtonHandler must not handle edit_card_name');
    assert.ok(!source.includes('edit_card_character'), 'editArtButtonHandler must not handle edit_card_character');
    assert.ok(!source.includes('edit_card_tags'), 'editArtButtonHandler must not handle edit_card_tags');
    assert.ok(!source.includes('edit_card_image'), 'editArtButtonHandler must not handle edit_card_image');
});

test('logger.js wraps channel.send in try/catch to prevent propagation', () => {
    const source = fs.readFileSync(
        path.join(root, 'utils', 'logger.js'),
        'utf8'
    );
    assert.ok(source.includes('try {'), 'logger must wrap channel.send in try/catch');
    assert.ok(source.includes('catch (err)'), 'logger must catch errors from channel.send');
    assert.ok(source.includes('[logger]'), 'logger must log failures with [logger] prefix');
});

test('deleteart.js defers reply before DB query', () => {
    const source = fs.readFileSync(
        path.join(root, 'commands', 'screenshots', 'deleteart.js'),
        'utf8'
    );
    const deferPos = source.indexOf('deferReply');
    const findPos = source.indexOf('ArtRepository.findByCode');
    assert.ok(deferPos > -1, 'deleteart must call deferReply');
    assert.ok(findPos > -1, 'deleteart must call ArtRepository.findByCode');
    assert.ok(deferPos < findPos, 'deferReply must come before ArtRepository.findByCode');
});

test('diagnostics does not check non-existent TEST_GUILD_ID or MAIN_GUILD_ID', () => {
    const source = fs.readFileSync(
        path.join(root, 'commands', 'admin', 'diagnostics.js'),
        'utf8'
    );
    assert.ok(!source.includes('TEST_GUILD_ID'), 'diagnostics must not check for TEST_GUILD_ID');
    assert.ok(!source.includes('MAIN_GUILD_ID'), 'diagnostics must not check for MAIN_GUILD_ID');
});

test('deletecard.js does not contain dead local file deletion code', () => {
    const source = fs.readFileSync(
        path.join(root, 'commands', 'screenshots', 'deletecard.js'),
        'utf8'
    );
    assert.ok(!source.includes('fs.existsSync'), 'deletecard must not use fs.existsSync (dead code)');
    assert.ok(!source.includes('fs.unlinkSync'), 'deletecard must not use fs.unlinkSync (dead code)');
    assert.ok(!source.includes('require("fs")'), 'deletecard must not import fs (no longer needed)');
});

test('refreshgallery.js does not leak err.message to Discord users', () => {
    const source = fs.readFileSync(
        path.join(root, 'commands', 'admin', 'refreshgallery.js'),
        'utf8'
    );
    // err.message must not appear inside an editReply/reply content template literal
    assert.ok(!source.includes('`❌ Gallery refresh failed.\\n\\n${err.message}`'), 'refreshgallery must not send err.message to users via editReply');
    assert.ok(source.includes('Check the console logs'), 'refreshgallery should direct admin to console logs');
    // Also upgrade the per-item console.log to console.error — both must use console.error
    assert.ok(!source.includes("console.log(\n                        `Failed to refresh"), 'refreshgallery per-item errors should use console.error not console.log');
});


// Batch 2 deep-cleanup regression coverage (P0-1, P2-x).

test('clan.js uses settings.clan.embedImage not a hardcoded CDN URL', () => {
    const source = fs.readFileSync(
        path.join(root, 'commands', 'clan', 'clan.js'),
        'utf8'
    );
    assert.ok(source.includes('settings.clan.embedImage'), 'clan.js must use settings.clan.embedImage');
    assert.ok(!source.includes('?ex='), 'clan.js must not contain a CDN URL with expiry parameters');
    assert.ok(!source.includes('&hm='), 'clan.js must not contain a CDN URL with hash parameters');
});

test('settings.js defines clan.embedImage for the clan join panel', () => {
    const settings = require(path.join(root, 'config', 'settings.js'));
    assert.ok(settings.clan, 'settings must have a clan section');
    assert.ok(typeof settings.clan.embedImage === 'string' && settings.clan.embedImage.length > 0,
        'settings.clan.embedImage must be a non-empty string');
});

test('about.js reads version from package.json not a hardcoded string', () => {
    const source = fs.readFileSync(
        path.join(root, 'commands', 'utility', 'about.js'),
        'utf8'
    );
    assert.ok(source.includes('package.json'), 'about.js must import version from package.json');
    assert.ok(!source.includes('"1.2.0"'), 'about.js must not hardcode version string');
    assert.ok(!source.includes('"1.0.0"'), 'about.js must not hardcode version string');
});

test('config/version.js has been removed (replaced by package.json version)', () => {
    assert.ok(!fs.existsSync(path.join(root, 'config', 'version.js')),
        'config/version.js must not exist — version is read from package.json');
});

test('config/characters.js has been removed (was unused)', () => {
    assert.ok(!fs.existsSync(path.join(root, 'config', 'characters.js')),
        'config/characters.js must not exist — it was never used');
});

test('database/mongo.js does not import unused settings module', () => {
    const source = fs.readFileSync(path.join(root, 'database', 'mongo.js'), 'utf8');
    assert.ok(!source.includes("require('../config/settings')") && !source.includes('require("../config/settings")'),
        'mongo.js must not import settings (it was unused)');
});

test('addlink.js has logger imported at top level not inline', () => {
    const source = fs.readFileSync(path.join(root, 'commands', 'links', 'addlink.js'), 'utf8');
    const topRequirePos = source.indexOf("require('../../utils/logger')") !== -1
        ? source.indexOf("require('../../utils/logger')")
        : source.indexOf('require("../../utils/logger")');
    const executePos = source.indexOf('async execute');
    assert.ok(topRequirePos > -1, 'addlink.js must require logger');
    assert.ok(topRequirePos < executePos, 'logger require must be at top level before execute()');
});

test('addlink.js validates URL before saving', () => {
    const source = fs.readFileSync(path.join(root, 'commands', 'links', 'addlink.js'), 'utf8');
    assert.ok(source.includes('new URL('), 'addlink.js must validate URL with new URL()');
    assert.ok(source.includes('Invalid URL'), 'addlink.js must return an invalid URL error message');
});

test('dangerousPermissions is extracted to config/dangerousPermissions.js', () => {
    assert.ok(fs.existsSync(path.join(root, 'config', 'dangerousPermissions.js')),
        'config/dangerousPermissions.js must exist');
    const giverole = fs.readFileSync(path.join(root, 'commands', 'admin', 'giverole.js'), 'utf8');
    const handler = fs.readFileSync(path.join(root, 'events', 'giveroleButtonHandler.js'), 'utf8');
    assert.ok(giverole.includes('config/dangerousPermissions'), 'giverole.js must import from config/dangerousPermissions');
    assert.ok(handler.includes('config/dangerousPermissions'), 'giveroleButtonHandler.js must import from config/dangerousPermissions');
    assert.ok(!giverole.includes('PermissionsBitField.Flags.Administrator'), 'giverole.js must not define the array inline');
    assert.ok(!handler.includes('PermissionsBitField.Flags.Administrator'), 'giveroleButtonHandler.js must not define the array inline');
});


// Batch 3 deep-cleanup regression coverage (P1-1, P3-1, P3-2).

test('Card schema has a category index', () => {
    const source = fs.readFileSync(path.join(root, 'database', 'Card.js'), 'utf8');
    assert.ok(source.includes("cardSchema.index({ category: 1 })"), 'Card must index category field');
});

test('Art schema has a category index', () => {
    const source = fs.readFileSync(path.join(root, 'database', 'Art.js'), 'utf8');
    assert.ok(source.includes("artSchema.index({ category: 1 })"), 'Art must index category field');
});

test('Link schema has title and category indexes', () => {
    const source = fs.readFileSync(path.join(root, 'database', 'Link.js'), 'utf8');
    assert.ok(source.includes("linkSchema.index({ title: 1 })"), 'Link must index title field');
    assert.ok(source.includes("linkSchema.index({ category: 1 })"), 'Link must index category field');
});

test('autoReplyCooldown prunes expired entries on canReply', () => {
    const source = fs.readFileSync(path.join(root, 'services', 'autoReplyCooldown.js'), 'utf8');
    assert.ok(source.includes('pruneExpired'), 'autoReplyCooldown must have a pruneExpired function');
    assert.ok(source.includes('MAX_TTL_MS'), 'autoReplyCooldown must define a max TTL');
});

test('galleryV2 prunes stale entries and tracks openedAt timestamp', () => {
    const source = fs.readFileSync(path.join(root, 'services', 'galleryV2.js'), 'utf8');
    assert.ok(source.includes('pruneExpired'), 'galleryV2 must have a pruneExpired function');
    assert.ok(source.includes('openedAt'), 'galleryV2 must record openedAt on each entry');
    assert.ok(source.includes('GALLERY_TTL_MS'), 'galleryV2 must define a TTL constant');
});

test('categoryMenuService prunes stale entries and tracks openedAt timestamp', () => {
    const source = fs.readFileSync(path.join(root, 'services', 'categoryMenuService.js'), 'utf8');
    assert.ok(source.includes('pruneExpired'), 'categoryMenuService must have a pruneExpired function');
    assert.ok(source.includes('openedAt'), 'categoryMenuService must record openedAt on each entry');
    assert.ok(source.includes('MENU_TTL_MS'), 'categoryMenuService must define a TTL constant');
});

test('galleryButtonHandler calls gallery.close() on gallery_back', () => {
    const source = fs.readFileSync(path.join(root, 'events', 'galleryButtonHandler.js'), 'utf8');
    assert.ok(source.includes('gallery.close(messageId)'), 'galleryButtonHandler must call gallery.close() when navigating back');
});
