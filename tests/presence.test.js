'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('presence utility sets listening activity to a Karan Aujla song', () => {
    const source = fs.readFileSync(path.join(root, 'utils', 'presence.js'), 'utf8');
    assert.ok(source.includes('ActivityType.Listening'), 'presence must use ActivityType.Listening');
    assert.ok(source.includes('karanAujlaSongs'), 'presence must include Karan Aujla songs');
});
