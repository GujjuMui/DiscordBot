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
        if (id === './config/config') return { token: 'test-token' };
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
            assert.deepEqual(bot.calls.slice(0), handlers.slice(0, index + 1));
            assert.deepEqual(input.responses, []);
        });
    }
    test(`${kind} visits all handlers when none handles the interaction`, async () => {
        const bot = await loadBot();
        await bot.listeners.get('interaction')(interaction(kind));
        assert.deepEqual(bot.calls.slice(0), handlers);
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
        assert.deepEqual(bot.calls.slice(0), ['mongo', 'login', ...scenario.expected]);
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
        const expected = state.deferred || state.replied ? [] : [{ method: 'reply', content: '❌ Something went wrong.', flags: 64 }];
        assert.deepEqual(plain(input.responses), expected);
    });
}

for (const [event, handler] of [['member', 'memberJoinHandler'], ['message', 'messageCreate']]) {
    test(`${event} delegates and contains handler failures`, async () => {
        const bot = await loadBot({ handlerError: handler });
        await bot.listeners.get(event)({});
        assert.deepEqual(bot.calls.slice(0), ['mongo', 'login', handler]);
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
                assert.deepEqual(bot.calls.slice(0), routes[kind].slice(0, index + 1));
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
