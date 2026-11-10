'use strict';

// Repository tests — no live MongoDB. The Mongoose models are loaded
// (registering them needs no connection) and their static methods are
// stubbed per test, so the repository layer is exercised exactly as
// the commands call it: create -> update, findByCode, delete.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const Card = require(path.join(root, 'database', 'Card'));
const Art = require(path.join(root, 'database', 'Art'));
const Link = require(path.join(root, 'database', 'Link'));
const CardRepository = require(path.join(root, 'repositories', 'CardRepository'));
const ArtRepository = require(path.join(root, 'repositories', 'ArtRepository'));
const LinkRepository = require(path.join(root, 'repositories', 'LinkRepository'));

function stubModel(Model, methods) {
    const originals = {};
    for (const [name, fn] of Object.entries(methods)) {
        originals[name] = Model[name];
        Model[name] = fn;
    }
    return () => {
        for (const [name, fn] of Object.entries(originals)) Model[name] = fn;
    };
}

const lean = value => ({ lean: async () => value });

test('CardRepository.create returns a plain object and update patches by code', async () => {
    const restore = stubModel(Card, {
        create: async data => ({ toObject: () => ({ ...data }) }),
        findOneAndUpdate: () => lean({ cardId: 'SFA-000001', discordMessageId: 'm1', messageUrl: 'https://x/m1' })
    });
    try {
        const card = await CardRepository.create({ cardId: 'SFA-000001', cardName: 'Test' });
        assert.equal(card.cardId, 'SFA-000001');
        assert.equal(typeof card, 'object');
        const updated = await CardRepository.update('sfa-000001', { discordMessageId: 'm1', messageUrl: 'https://x/m1' });
        assert.equal(updated.discordMessageId, 'm1');
    } finally {
        restore();
    }
});

test('CardRepository.findByCode returns null for a missing card', async () => {
    const restore = stubModel(Card, { findOne: () => lean(null) });
    try {
        assert.equal(await CardRepository.findByCode('SFA-999999'), null);
        assert.equal(await CardRepository.findByCode(''), null);
    } finally {
        restore();
    }
});

test('CardRepository.create surfaces duplicate keys as error 11000', async () => {
    const duplicate = new Error('E11000 duplicate key error');
    duplicate.code = 11000;
    const restore = stubModel(Card, { create: async () => { throw duplicate; } });
    try {
        await assert.rejects(
            () => CardRepository.create({ cardId: 'SFA-000001' }),
            err => err.code === 11000 && /already exists/.test(err.message)
        );
    } finally {
        restore();
    }
});

test('ArtRepository.findByCode and delete round-trip by code', async () => {
    const restore = stubModel(Art, {
        findOne: () => lean({ artId: 'ART-000001', artName: 'Test Art' }),
        findOneAndDelete: () => lean({ artId: 'ART-000001', artName: 'Test Art' })
    });
    try {
        const art = await ArtRepository.findByCode('art-000001');
        assert.equal(art.artId, 'ART-000001');
        const deleted = await ArtRepository.delete('ART-000001');
        assert.equal(deleted.artName, 'Test Art');
    } finally {
        restore();
    }
});

test('LinkRepository.create/update/delete are keyed by title, not uppercased', async () => {
    const seen = {};
    const restore = stubModel(Link, {
        create: async data => { seen.created = data; return { toObject: () => ({ ...data }) }; },
        findOneAndUpdate: (filter) => { seen.updatedFilter = filter; return lean({ title: 'My Link', discordMessageId: 'm2' }); },
        findOneAndDelete: (filter) => { seen.deletedFilter = filter; return lean({ title: 'My Link', discordMessageId: 'm2' }); }
    });
    try {
        const link = await LinkRepository.create({ title: 'My Link', url: 'https://example.com', category: 'General' });
        assert.equal(link.title, 'My Link');
        await LinkRepository.update('My Link', { discordMessageId: 'm2' });
        assert.deepEqual(seen.updatedFilter, { title: 'My Link' });
        const deleted = await LinkRepository.delete('My Link');
        assert.deepEqual(seen.deletedFilter, { title: 'My Link' });
        assert.equal(deleted.discordMessageId, 'm2');
    } finally {
        restore();
    }
});

// Architecture v1.3 — new repositories (mocked models, no live Mongo).
const Trusted = require(path.join(root, 'database', 'Trusted'));
const AutoReply = require(path.join(root, 'database', 'AutoReply'));
const MemberCooldown = require(path.join(root, 'database', 'MemberCooldown'));
const BotSettings = require(path.join(root, 'database', 'BotSettings'));
const SelfRoleMessage = require(path.join(root, 'database', 'SelfRoleMessage'));
const Counter = require(path.join(root, 'database', 'Counter'));
const TrustedRepository = require(path.join(root, 'repositories', 'TrustedRepository'));
const AutoReplyRepository = require(path.join(root, 'repositories', 'AutoReplyRepository'));
const MemberCooldownRepository = require(path.join(root, 'repositories', 'MemberCooldownRepository'));
const BotSettingsRepository = require(path.join(root, 'repositories', 'BotSettingsRepository'));
const SelfRoleMessageRepository = require(path.join(root, 'repositories', 'SelfRoleMessageRepository'));
const CounterRepository = require(path.join(root, 'repositories', 'CounterRepository'));
const repositoriesIndex = require(path.join(root, 'repositories'));

test('TrustedRepository find/create/deleteOne/listAll round-trip', async () => {
    const restore = stubModel(Trusted, {
        findOne: () => lean({ targetId: 'u1', type: 'user' }),
        create: async data => ({ toObject: () => ({ ...data }) }),
        deleteOne: async () => ({ deletedCount: 1 }),
        find: () => ({ lean: () => ({ limit: async () => [{ targetId: 'u1', type: 'user' }] }) })
    });
    try {
        assert.equal((await TrustedRepository.findOne({ targetId: 'u1', type: 'user' })).type, 'user');
        assert.equal(await TrustedRepository.findOne(null), null);
        assert.equal((await TrustedRepository.create({ targetId: 'u1', type: 'user' })).targetId, 'u1');
        assert.equal((await TrustedRepository.deleteOne({ targetId: 'u1' })).deletedCount, 1);
        assert.equal((await TrustedRepository.listAll()).length, 1);
    } finally {
        restore();
    }
});

test('TrustedRepository.create surfaces duplicate keys as error 11000', async () => {
    const duplicate = new Error('E11000 duplicate key error');
    duplicate.code = 11000;
    const restore = stubModel(Trusted, { create: async () => { throw duplicate; } });
    try {
        await assert.rejects(
            () => TrustedRepository.create({ targetId: 'u1', type: 'user' }),
            err => err.code === 11000 && /already exists/.test(err.message)
        );
    } finally {
        restore();
    }
});

test('AutoReplyRepository findEnabled/listAll/findOneAndDelete', async () => {
    const restore = stubModel(AutoReply, {
        findOne: () => lean({ targetId: 'u1', reply: 'hi' }),
        find: () => lean([{ targetId: 'u1', enabled: true }]),
        findOneAndDelete: () => lean({ targetId: 'u1' })
    });
    try {
        // findEnabled and listAll both go through find(); the stub
        // returns the same lean list for both — enough to prove the
        // repository calls the model and returns lean objects.
        assert.equal((await AutoReplyRepository.findOne({ targetId: 'u1' })).reply, 'hi');
        assert.equal((await AutoReplyRepository.findEnabled()).length, 1);
        assert.equal((await AutoReplyRepository.findOneAndDelete({ targetId: 'u1' })).targetId, 'u1');
    } finally {
        restore();
    }
});

test('MemberCooldownRepository findOneAndUpdate returns a plain object', async () => {
    const restore = stubModel(MemberCooldown, {
        findOneAndUpdate: async () => ({ toObject: () => ({ userId: 'u1', uses: 2, cooldownUntil: null }) }),
        updateOne: async () => ({ acknowledged: true })
    });
    try {
        const data = await MemberCooldownRepository.findOneAndUpdate(
            { userId: 'u1' }, { $inc: { uses: 1 } }, { upsert: true, new: true }
        );
        assert.equal(data.uses, 2);
        assert.equal(await MemberCooldownRepository.findOneAndUpdate(null, {}), null);
    } finally {
        restore();
    }
});

test('BotSettingsRepository and SelfRoleMessageRepository return lean docs', async () => {
    const restoreSettings = stubModel(BotSettings, {
        findOne: () => lean({ guildId: 'g1', channels: {} }),
        findOneAndUpdate: () => lean({ guildId: 'g1' })
    });
    const restoreSelfRole = stubModel(SelfRoleMessage, {
        findOne: () => lean({ guildId: 'g1', channelId: 'c1', messageId: 'm1' }),
        findOneAndUpdate: () => lean({ guildId: 'g1' })
    });
    try {
        assert.equal((await BotSettingsRepository.findOne({ guildId: 'g1' })).guildId, 'g1');
        assert.equal((await SelfRoleMessageRepository.findOne({ guildId: 'g1' })).messageId, 'm1');
        assert.equal(await BotSettingsRepository.findOne(null), null);
    } finally {
        restoreSettings();
        restoreSelfRole();
    }
});

test('CounterRepository.nextSequence returns the new sequence value', async () => {
    const restore = stubModel(Counter, {
        findOneAndUpdate: async () => ({ seq: 42 })
    });
    try {
        assert.equal(await CounterRepository.nextSequence('card'), 42);
        await assert.rejects(() => CounterRepository.nextSequence(''), /required/);
    } finally {
        restore();
    }
});

test('Card/Art repositories expose distinctCategories, listAll and incrementFavorites', async () => {
    const restoreCard = stubModel(Card, {
        distinct: async () => ['General', 'Tournament'],
        find: () => ({ sort: () => ({ lean: async () => [{ cardId: 'SFA-000001' }] }) }),
        findByIdAndUpdate: () => lean({ cardId: 'SFA-000001', favorites: 1 })
    });
    const restoreArt = stubModel(Art, {
        distinct: async () => ['Official'],
        find: () => ({ sort: () => ({ lean: async () => [{ artId: 'ART-000001' }] }) }),
        findByIdAndUpdate: () => lean({ artId: 'ART-000001', favorites: 1 })
    });
    try {
        assert.deepEqual(await CardRepository.distinctCategories(), ['General', 'Tournament']);
        assert.equal((await CardRepository.listAll()).length, 1);
        assert.equal((await CardRepository.incrementFavorites('id1')).favorites, 1);
        assert.deepEqual(await ArtRepository.distinctCategories(), ['Official']);
        assert.equal((await ArtRepository.listAll()).length, 1);
        assert.equal((await ArtRepository.incrementFavorites('id2')).favorites, 1);
    } finally {
        restoreCard();
        restoreArt();
    }
});

test('repositories/index.js exposes every repository under one object', () => {
    for (const key of ['card', 'art', 'link', 'trusted', 'autoReply', 'memberCooldown', 'botSettings', 'selfRole', 'counter']) {
        assert.ok(repositoriesIndex[key], `repositories index must expose ${key}`);
    }
    assert.equal(repositoriesIndex.card, CardRepository);
    assert.equal(repositoriesIndex.counter, CounterRepository);
});
