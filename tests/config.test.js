'use strict';

// Config tests: no hardcoded owner fallback, guild.json loads with
// the exact values, and the shared constants are wired.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const OWNER_ID = '1466871611' + '893219455'; // fragments: the full literal must not appear in the tree

test('config has no hardcoded owner fallback and all six feature flags', () => {
    const source = fs.readFileSync(path.join(root, 'config', 'config.js'), 'utf8');
    assert.ok(!source.includes(OWNER_ID), 'config.js must not contain the hardcoded owner ID');
    assert.ok(!source.includes('TEST_GUILD_ID'), 'config.js must not reference TEST_GUILD_ID');
    assert.ok(!source.includes('MAIN_GUILD_ID'), 'config.js must not reference MAIN_GUILD_ID');

    // Fresh require with a clean env so defaults are exercised.
    delete process.env.BOT_OWNER_ID;
    delete process.env.OWNER_ID;
    delete require.cache[require.resolve(path.join(root, 'config', 'config.js'))];
    const config = require(path.join(root, 'config', 'config.js'));
    assert.equal(config.botOwnerId, '', 'botOwnerId must be empty when BOT_OWNER_ID is unset (fail closed)');
    for (const flag of ['tickets', 'tryouts', 'verification', 'moderation', 'channelManager', 'broadcast']) {
        assert.equal(config.features[flag], true, `feature flag ${flag} must default to true`);
    }
    assert.equal(config.cloudinary.folderPrefix, 'hornet');
});

test('owner.js re-exports config.botOwnerId with no hardcoded ID', () => {
    const source = fs.readFileSync(path.join(root, 'config', 'owner.js'), 'utf8');
    assert.ok(!source.includes(OWNER_ID), 'owner.js must not contain the hardcoded owner ID');
    assert.ok(source.includes('config.botOwnerId'), 'owner.js must read config.botOwnerId');
    assert.ok(source.includes('ownerId'), 'owner.js must expose ownerId');

    delete require.cache[require.resolve(path.join(root, 'config', 'owner.js'))];
    delete require.cache[require.resolve(path.join(root, 'config', 'config.js'))];
    const owner = require(path.join(root, 'config', 'owner.js'));
    const config = require(path.join(root, 'config', 'config.js'));
    assert.equal(owner.ownerId, config.botOwnerId, 'owner.ownerId must track config.botOwnerId');
});

test('settings loads config/guild.json with the exact values and no ID literals in code', () => {
    const source = fs.readFileSync(path.join(root, 'config', 'settings.js'), 'utf8');
    assert.ok(!source.includes('ownerId'), 'settings.js must not contain ownerId');
    assert.ok(!/\b\d{17,19}\b/.test(source), 'settings.js must not contain any 17-19 digit ID literal');

    const guildJson = JSON.parse(fs.readFileSync(path.join(root, 'config', 'guild.json'), 'utf8'));
    assert.ok(!('ownerId' in guildJson), 'guild.json must not contain the owner ID');
    const settings = require(path.join(root, 'config', 'settings.js'));
    assert.deepEqual(settings.channels, guildJson.channels, 'channels must match guild.json exactly');
    assert.deepEqual(settings.roles, guildJson.roles, 'roles must match guild.json exactly');
    assert.deepEqual(settings.selfRoles, guildJson.selfRoles, 'selfRoles must match guild.json exactly');
    assert.deepEqual(settings.clan, guildJson.clan, 'clan must match guild.json exactly');
    assert.deepEqual(settings.idPrefix, guildJson.idPrefix, 'idPrefix must match guild.json exactly');
    assert.ok(settings.clan.embedImage.length > 0, 'clan.embedImage must be a non-empty string');
});

test('guild.example.json has no IDs at all — empty means "not configured yet"', () => {
    const example = JSON.parse(fs.readFileSync(path.join(root, 'config', 'guild.example.json'), 'utf8'));
    const text = JSON.stringify(example);
    assert.ok(!text.includes('000000000000000000'), 'guild.example.json must not use placeholder IDs any more');
    const collect = value => {
        if (typeof value === 'string') return [value];
        if (value && typeof value === 'object') return Object.values(value).flatMap(collect);
        return [];
    };
    // Every ID-based slot is empty. (The name-based channel values
    // and the Admin/Trusted role names are names, not IDs, and stay;
    // banner URLs keep their values — they are uploaded media, and
    // their CDN paths contain long digit runs that are not IDs.)
    const idSlots = [
        ...['welcome', 'main_welcome', 'serverMap', 'howToJoin', 'tryout', 'onboarding', 'serverRules', 'serverSupport']
            .map(key => example.channels[key]),
        ...['member', 'pendingTryout', 'clanMemberAS', 'clanMemberEU', 'pendingTryoutAS', 'pendingTryoutEU', 'tryoutTesterAS', 'tryoutTesterEU']
            .map(key => example.roles[key]),
        ...collect(example.roles.color),
        ...collect(example.roles.faction),
        ...collect(example.roles.ping),
        example.selfRoles.channel
    ];
    for (const value of idSlots) {
        assert.equal(value, '', `every ID slot in guild.example.json must be empty, got ${value}`);
        assert.ok(!/\b\d{17,19}\b/.test(value), `ID slot must not contain a 17-19 digit ID literal, got ${value}`);
    }
});

test('constants carry the shared values used across the codebase', () => {
    const constants = require(path.join(root, 'config', 'constants.js'));
    assert.equal(constants.GALLERY_TTL_MS, 1800000); // 30 min, the gallery's shipped TTL
    assert.equal(constants.MEMBER_MAX_USES, 5);
    assert.equal(constants.MEMBER_COOLDOWN_MS, 12 * 60 * 60 * 1000);
    assert.equal(constants.AUTOREPLY_DEFAULT_COOLDOWN_MS, 43200000);
    assert.equal(constants.AUTOREPLY_MAX_TTL_MS, 24 * 60 * 60 * 1000);
    assert.equal(constants.MENU_TTL_MS, 30 * 60 * 1000);
    assert.equal(constants.VERIFY_MIN_ACCOUNT_AGE_MS, 30 * 24 * 60 * 60 * 1000);
    assert.equal(constants.VERIFY_MIN_JOIN_AGE_MS, 5 * 60 * 1000);
    assert.equal(constants.SPAM_MAX_PINGS, 1000);
    assert.equal(constants.SPAM_DELAY_MS, 1000);
    assert.equal(constants.INVITE_MAX_AGE_S, 3600);
    assert.equal(constants.CONFIRM_TIMEOUT_MS, 60000);
    assert.equal(constants.GALLERY_MAX_ITEMS, 200);
    assert.equal(constants.CACHE_TTL_MS, 60000);
    assert.equal(constants.COLORS.SUCCESS, 0x57f287);
    assert.equal(constants.COLORS.WARNING, 0xfee75c);
    assert.equal(constants.COLORS.BRAND, 0x5865f2);
    assert.equal(constants.COLORS.CARD, 0xff9900);
    assert.equal(constants.COLORS.ART, 0x8e44ad);
    assert.equal(constants.COLORS.LINK, 0x00b894);
});
