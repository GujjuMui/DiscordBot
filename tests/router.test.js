'use strict';

// Router tests — the real core/router.js with fake handlers, no Discord.
// The VM tests in tests/index.test.js cover the wiring (handler order
// in index.js); these cover prefix dispatch itself.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createRouter, matchesPrefix } = require(path.join(__dirname, '..', 'core', 'router'));

function fakeHandler(name, { prefixes = [], returns = false, throws = null } = {}) {
    const calls = [];
    const fn = async (interaction, ctx) => {
        calls.push({ name, customId: interaction?.customId, ctx });
        if (throws) throw throws;
        return returns;
    };
    fn.calls = calls;
    if (prefixes.length) fn.customIdPrefixes = prefixes;
    return fn;
}

function makeRouter(defs) {
    const handlers = {};
    for (const [name, opts] of Object.entries(defs)) handlers[name] = fakeHandler(name, opts);
    const files = { button: Object.keys(defs) };
    const router = createRouter(files, name => handlers[name]);
    return { router, handlers };
}

test('matchesPrefix handles exact ids and trailing _ / : prefixes', () => {
    assert.equal(matchesPrefix('verify', 'verify'), true);
    assert.equal(matchesPrefix('tryout_pass_123', 'tryout_pass_'), true);
    assert.equal(matchesPrefix('giverole_confirm:abc', 'giverole_confirm:'), true);
    assert.equal(matchesPrefix('tryout_pass_123', 'tryout_fail_'), false);
    assert.equal(matchesPrefix('verify', 'verify_now'), false);
    assert.equal(matchesPrefix(undefined, 'verify'), false);
    assert.equal(matchesPrefix('verify', undefined), false);
});

test('dispatch hits the prefix-matched handler and skips the rest', async () => {
    const { router, handlers } = makeRouter({
        first: { prefixes: ['foo_'], returns: false },
        second: { prefixes: ['bar_'], returns: true },
        third: { prefixes: [], returns: true }
    });
    const ctx = { marker: 1 };
    assert.equal(await router.dispatch('button', { customId: 'bar_123' }, ctx), true);
    assert.equal(handlers.first.calls.length, 0);
    assert.equal(handlers.second.calls.length, 1);
    assert.equal(handlers.second.calls[0].ctx, ctx);
    assert.equal(handlers.third.calls.length, 0);
});

test('dispatch falls back to trial order for an unregistered id', async () => {
    const { router, handlers } = makeRouter({
        first: { prefixes: ['foo_'], returns: false },
        second: { prefixes: ['bar_'], returns: false },
        third: { prefixes: [], returns: true }
    });
    assert.equal(await router.dispatch('button', { customId: 'zzz' }), true);
    assert.equal(handlers.first.calls.length, 1);
    assert.equal(handlers.second.calls.length, 1);
    assert.equal(handlers.third.calls.length, 1);
});

test('a prefix handler returning false falls through to the next handler', async () => {
    const { router, handlers } = makeRouter({
        first: { prefixes: ['foo_'], returns: false },
        second: { prefixes: ['foo_'], returns: true },
        third: { prefixes: [], returns: true }
    });
    assert.equal(await router.dispatch('button', { customId: 'foo_9' }), true);
    assert.equal(handlers.first.calls.length, 1);
    assert.equal(handlers.second.calls.length, 1);
    assert.equal(handlers.third.calls.length, 0);
});

test('dispatch returns false when no handler handles the interaction', async () => {
    const { router } = makeRouter({
        first: { prefixes: ['foo_'], returns: false },
        second: { prefixes: [], returns: false }
    });
    assert.equal(await router.dispatch('button', { customId: 'foo_1' }), false);
    assert.equal(await router.dispatch('button', {}), false);
    assert.equal(await router.dispatch('unknown-kind', { customId: 'foo_1' }), false);
});

test('runHandlers keeps sequential semantics: order, stop at first true', async () => {
    const { router, handlers } = makeRouter({
        first: { returns: false },
        second: { returns: true },
        third: { returns: true }
    });
    assert.equal(await router.runHandlers(['first', 'second', 'third'], { customId: 'x' }), true);
    assert.equal(handlers.first.calls.length, 1);
    assert.equal(handlers.second.calls.length, 1);
    assert.equal(handlers.third.calls.length, 0);
    assert.equal(await router.runHandlers(['first', 'third'], { customId: 'x' }), true);
});

test('dispatch propagates handler errors to the caller (index.js catches them)', async () => {
    const { router } = makeRouter({
        first: { prefixes: ['foo_'], throws: new Error('handler failed') }
    });
    await assert.rejects(
        () => router.dispatch('button', { customId: 'foo_1' }),
        /handler failed/
    );
});

test('every shipped component handler exports customIdPrefixes', () => {
    const fs = require('node:fs');
    const root = path.resolve(__dirname, '..');
    const files = [
        'giveroleButtonHandler', 'editCardButtonHandler', 'editArtButtonHandler',
        'deleteArtButtonHandler', 'verificationButtonHandler', 'clanButtonHandler',
        'tryoutButtonHandler', 'categoryMenuButtonHandler', 'galleryButtonHandler',
        'selfRoleHandler', 'helpMenuHandler', 'linkSelectHandler',
        'gallerySelectHandler', 'selectMenuHandler', 'editCardModalHandler',
        'verificationModalHandler', 'editArtModalHandler', 'tryoutModalHandler'
    ];
    for (const name of files) {
        const source = fs.readFileSync(path.join(root, 'events', `${name}.js`), 'utf8');
        assert.ok(source.includes('customIdPrefixes'), `${name} must export customIdPrefixes`);
        const handler = require(path.join(root, 'events', name));
        assert.ok(Array.isArray(handler.customIdPrefixes), `${name}.customIdPrefixes must be an array`);
        assert.ok(handler.customIdPrefixes.length > 0, `${name}.customIdPrefixes must not be empty`);
    }
});
