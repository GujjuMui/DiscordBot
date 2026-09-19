'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'database', 'mongo.js'), 'utf8');

function loadMongo(failure) {
    const calls = [];
    const logs = [];
    const errors = [];
    const exits = [];
    const uri = 'mongodb://test-user:test-password@localhost/test-only';
    const moduleMock = { exports: {} };
    vm.runInNewContext(source, {
        module: moduleMock,
        require(id) {
            if (id === '../config/settings') return {};
            if (id === 'mongoose') return { connect: async value => {
                calls.push(value);
                if (failure) throw failure;
            } };
            throw new Error(`Unexpected dependency: ${id}`);
        },
        process: { env: { MONGO_URI: uri }, exit: code => exits.push(code) },
        console: { log: (...args) => logs.push(args), error: (...args) => errors.push(args) }
    }, { filename: 'database/mongo.js' });
    return { connect: moduleMock.exports, calls, logs, errors, exits, uri };
}

test('exports the existing async connection function and uses MONGO_URI unchanged', async () => {
    const db = loadMongo();
    assert.equal(typeof db.connect, 'function');
    assert.equal(await db.connect(), undefined);
    assert.deepEqual(db.calls, [db.uri]);
    assert.ok(db.logs.some(args => args[0] === '✅ Connected to MongoDB'));
    assert.deepEqual(db.errors, []);
    assert.deepEqual(db.exits, []);
});

test('connection failure retains the failure message and exit status', async () => {
    const failure = new Error('test connection failure');
    const db = loadMongo(failure);
    await db.connect();
    assert.deepEqual(db.calls, [db.uri]);
    assert.ok(db.errors.some(args => args[0] === '❌ MongoDB Connection Failed'));
    assert.ok(db.errors.some(args => args[0] === failure));
    assert.deepEqual(db.exits, [1]);
    assert.ok(!db.logs.some(args => args[0] === '✅ Connected to MongoDB'));
});

for (const failure of [undefined, new Error('connection refused')]) {
    test(`does not print the connection URI on ${failure ? 'failure' : 'success'}`, async () => {
        const db = loadMongo(failure);
        await db.connect();
        const output = [...db.logs, ...db.errors].flat().map(String).join('\n');
        assert.ok(!output.includes(db.uri));
        assert.ok(!output.includes('test-password'));
    });
}
