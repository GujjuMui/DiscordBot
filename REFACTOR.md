# Hornet — Refactor Notes

Refactor of the Discord clan bot ("Hornet"), done against the original
source in `Discord_Clan_Bot.zip`. All existing functionality and
user-facing behaviour (command names, embed text/colours, custom IDs,
flows) is preserved unless a change is explicitly listed under
"Deliberate behaviour changes" below.

## Architecture improvements (v1.3)

A second, architecture-only pass on top of the v1.2 refactor. No
command behaviour, embed, customId or reply wording changed; the
install steps are unchanged (copy `.env`, set `BOT_OWNER_ID`, seed
the counters on an existing database, `npm install`, `npm run
deploy`, `npm start`). Full design notes: `ARCHITECTURE.md`.

- **Repository layer completed.** New: `TrustedRepository`,
  `AutoReplyRepository`, `MemberCooldownRepository`,
  `BotSettingsRepository`, `SelfRoleMessageRepository`,
  `CounterRepository`, plus `repositories/index.js` (one object
  exposing all nine). Card/Art gained `distinctCategories()`,
  `listAll()`, `incrementFavorites()`, `findIdsByPrefix()` and
  `bulkWrite()`; Link gained `distinctCategories()`. Every direct
  Mongoose model import outside `repositories/` and `database/` is
  gone — verified by grep (the only remaining `database/` require
  outside those folders is `index.js` requiring the Mongo
  connection module, and `diagnostics.js` requiring `mongoose`
  only for `connection.readyState`). `migrateCloudinary.js` also
  goes through the repositories now.
- **Gallery domain service.** New `services/galleryService.js`
  owns the category -> gallery flow that was triplicated in
  `gallerySelectHandler`, `selectMenuHandler` and
  `linkSelectHandler`, and the `gallery_back` branch that
  re-derived the category menu. `galleryV2`,
  `categoryMenuService` and `categoryCache` stay as the
  state/cache layer underneath. `selectMenuHandler` keeps its
  distinct answer style (`interaction.update()`, no
  `deferUpdate`) — it uses the service's `buildCategoryGallery`
  step and answers itself. Bonus fix found on the way:
  `galleryButtonHandler` referenced a bare `EXPIRED` identifier
  that was never defined, so the first expired-gallery click
  would have thrown a `ReferenceError`; it is now a defined
  constant with the same wording the category-menu handler
  already used.
- **Router.** New `core/router.js`: handlers export
  `customIdPrefixes` (all 18 component handler files do), and
  `dispatch()` tries the prefix-matched handler(s) first, then
  falls back to the old sequential trial order — so unregistered
  and legacy ids still work. `runHandlers` keeps the old
  sequential semantics and is exported for the router tests.
- **Slim `index.js`.** 312 lines (v1.2) -> 217. It now uses the existing
  `utils/loadCommands.js` instead of duplicating the command scan
  inline (one side effect: the feature flags are now applied to
  the loaded commands too, not just on deploy/sync — with the
  default all-true flags nothing changes). `logError` and
  `replyWithError` moved verbatim to `utils/discord.js`; the
  5-minute sweeper moved to `services/stateSweeper.js`
  (`startSweeper()`). `index.js` is now only: client creation,
  command loading, context creation, router creation, sweeper,
  listeners, process handlers, startup.
- **Bot context.** New `core/context.js`: `createContext(client)`
  returns a frozen `{ client, config, settings, repositories,
  caches, discord, logger }`. The router passes it as the second
  argument to handlers (`handler(interaction, ctx)`); existing
  handlers ignore it, so nothing breaks. New code should take
  dependencies from `ctx` instead of requiring them ad-hoc.
- **Two small correctness fixes that fell out of the pass:**
  `/autoreply remove` now invalidates the auto-reply cache (it
  previously left a deleted reply cached for up to 60s), and the
  two gallery source-assertion tests in `tests/index.test.js`
  were updated to the new structure (they now assert the
  handlers delegate to the gallery service, which keys state by
  message id) — no behavioural assertion was weakened.
- **Tests.** New `tests/router.test.js` (8 tests: prefix dispatch,
  fallback to trial order, fall-through, `runHandlers`
  semantics, error propagation, every handler exports
  `customIdPrefixes`) and new repository tests for all six new
  repositories plus the new Card/Art methods. `tests/index.test.js`
  mock updated for the new top-level requires (`./utils/discord`,
  `./utils/loadCommands`, `./core/router`, `./core/context`,
  `./services/stateSweeper`) — the stubs mirror the real modules'
  contracts for the paths the VM exercises; the real modules are
  covered by their own tests. Results: `npm test` 124 pass / 0
  fail before this pass -> **140 pass / 0 fail** after;
  `npm run check` 119 files, 0 errors.

## 1. Key bugs found and how they were fixed

### P0 — the bot could not start: `repositories/` did not exist
Six commands (`savecard`, `saveart`, `deletecard`, `deleteart`,
`addlink`, `deletelink`) required `repositories/CardRepository.js`,
`ArtRepository.js` and `LinkRepository.js`, but the folder was
missing, so the command loader threw on the first of those files
and startup died. Created all three repositories (Mongoose models,
`.lean()` reads, duplicate-key 11000 surfaced as a clear error
instead of a raw Mongo error). Links stay keyed by title (not
uppercased); cards/art are keyed by their generated code.

### Deferred select/modal errors were swallowed
`index.js` passed `respondToDeferred=false` to `replyWithError` for
select-menu and modal handlers, so a deferred interaction that threw
never got its error reply — the user just saw "This interaction
failed". Select/modal handlers now use the default (`true`), so a
deferred interaction gets `editReply("❌ Something went wrong.")`.
Button handlers keep `false` (their interactions were already
answered with an update). `replyWithError` also falls back to
`followUp` on a 40060, and still swallows 10062.

### The test suite itself had a wrong path
`tests/index.test.js` read `commands/utility/say.js`; the real file
is `commands/admin/say.js`. Fixed the path, and `say.js` now imports
`config/owner` and uses `owner.ownerId` (it previously used
`config.botOwnerId` directly).

### `utils/presence.js` was missing
`index.js` had the presence call commented out and the file did not
exist. Restored it (rotating Karan Aujla `ActivityType.Listening`
status, 10-minute rotation, unref'd interval, no stacked intervals
on reconnect) and wired it back into `ClientReady`.
`tests/presence.test.js` is now part of `npm test`.

### Hardcoded owner ID with a fallback
`config.js` fell back to a hardcoded owner ID and `config/owner.js`
contained the literal ID. Both are gone: the owner is
`BOT_OWNER_ID` only, `owner.js` re-exports it via a getter, and an
unset owner logs a clear error and fails closed (owner-only commands
have no owner). The old owner test expected a literal in `owner.js`,
so it was updated to assert the new design (stricter, not weaker).

### `configLoader` silently dropped every DB override
`BotSettings` stores channels/roles/banners/extras as Mongoose
Maps, and the loader spread them with `{...map}` — spreading a Map
drops every entry, so DB overrides never applied. The loader now
converts Maps with `Object.fromEntries` (handling plain objects
too), adds a 60s TTL cache with `invalidate()` on `updateSetting()`,
and passes `idPrefix`/`brand` through instead of dropping them.

### ID generation could repeat after SFA-9
`utils/idGenerator.js` sorted IDs lexicographically, so `SFA-9`
sorted ahead of `SFA-10` and the next ID could collide. IDs now
come from an atomic `Counter` collection (`findOneAndUpdate $inc`
upsert, one document per sequence); the old scan is only a fallback
on counter error, and it now takes the numeric maximum.

### Member-cooldown race
`services/memberCooldown.js` did findOne → create → save, so two
concurrent `/member` calls could both read `uses=4` and both write
`uses=5`. It now uses a single atomic `findOneAndUpdate $inc`
upsert (a denied attempt rolls its increment back).

### Image-edit modals did nothing
The "Edit Image" buttons opened `edit_card_image_modal` /
`edit_art_image_modal`, but neither modal handler had a branch for
them — submitting the modal silently did nothing. Both handlers now
validate an `http(s)` URL, store it as `imageFile`, refresh the
showcase message and log the edit (same as the other field edits).
`editCardModalHandler` was also rewritten to the table-driven shape
of `editArtModalHandler`, with optional chaining on
`interaction.message?.embeds?.[0]` and a try/catch around the DB
update (it previously threw on a missing embed/field).

### Tryout remove button had no branch
`tryoutButtonHandler` claimed the `tryout_remove_*` prefix but had
no branch for it, so the handler fell through and did nothing. It
now removes the pending role and replies ephemerally. The handler
also guards `interaction.message.embeds[0]` /
`components[0].components` (they used to throw on a deleted/partial
message) and guards a null `interaction.member`.

### Gallery TTL preserved at 30 minutes
The old `constants.js` said 5 minutes but was dead code — the gallery service actually used 30 minutes. `GALLERY_TTL_MS` is now 30 minutes (1,800,000 ms) so galleries live as long as they did before; change it in `config/constants.js` if you want a different expiry.

### Gallery state gone = silent failure
`galleryButtonHandler` and `categoryMenuButtonHandler` returned
`false`/`true` without answering when the gallery/menu state was
gone (restart or expiry). They now reply ephemerally: "This gallery
has expired — run /cards or /arts again." After `deferUpdate`, no
path returns without an `editReply`/`update` any more.

### Showcase-message failures reported as save failures
`updateCardMessage` / `updateArtMessage` used
`client.guilds.cache.first()` (wrong guild on multi-guild bots) and
threw on a deleted showcase message *after* the DB commit, so the
caller reported failure for a save that succeeded. They now take an
optional guild, fall back to `cache.first()` only with a warning,
`.catch(() => null)` the message fetch, return a boolean, and the
modal handlers report "Saved, but the showcase message could not be
updated." on a partial success.

### `saveImage` wrote temp files to disk
`utils/saveImage.js` downloaded the image, wrote it to `temp/`,
uploaded it, then deleted it — slow, and a crash leaked files. It
now streams the download straight into
`cloudinary.uploader.upload_stream` (no temp file, no full buffer),
with a 10s abort timeout and a 10 MB size cap. Folder comes from
`config.cloudinary.folderPrefix` (default `hornet`).

### Spam: one global session, per-iteration logging, no rate-limit stop
`services/spamManager.js` kept a single global session, so a `/spam`
in one guild could stop (or be stopped by) another guild's session.
Sessions are now keyed by guild ID. `spam.js` no longer logs every
iteration, edits the deferred reply with progress every 50 pings,
breaks on 403 / deleted channel (10003) / three consecutive 429s
(honouring `retry_after`), and always ends with a finished/stopped
message instead of going silent.

### `botadmin`: invites created nobody asked for, nested collectors
`/botadmin guildlist` created a one-use invite in every guild just
to list them. It now lists guilds + authorization status only.
The `leaveguild` flow stopped the parent collector before opening
the confirm collector (nested collectors could both fire) and now
passes the collecting interaction (`ci`) to the error handler
instead of the outer one.

### `setup`: 1500ms sleeps between every channel create
The two `setTimeout(..., 1500)` sleeps made setup take ~7.5s for
five channels. Independent channel creates now run in
`Promise.all` (no sleeps), with a `ManageChannels` pre-check that
fails with a clear message instead of a 50013 halfway through.

### `member.js`: fetched the caller, no hierarchy check, transfer could strand a member
It fetched `interaction.user.id` via `members.fetch` instead of
using `interaction.member`. Role add/remove now pre-check
`ManageRoles` + hierarchy and are wrapped in try/catch; transfer
uses `roles.set()` (one call) and rolls the old role back if the
add fails.

### `checkPermission` / `checkAdminPermission` threw on null member
Both dereferenced `interaction.member` unguarded, so a DM or
partial interaction threw before any reply. Both are null-safe now
(deny with an ephemeral reply). `checkPermission` also caches
trusted users/roles for 60s (one query instead of two per protected
command) with `invalidateTrustedCache()`, called by `/trust` and
`/untrust`.

### `say` / `editsay` threw before their try block
The Administrator permission check ran before `try`, so a missing
`interaction.member` (DMs) threw uncaught. The check is guarded
with `?.` and both commands now use `config/owner`.

### `messageCreate`: N+1 auto-reply queries on every message
One `findOne` per mentioned user plus one for the author, on every
message. It now reads the enabled auto-replies once from a 60s TTL
cache (`services/autoReplyCache.js`, invalidated by `/autoreply`),
and wraps the reply send in try/catch.

### `memberJoinHandler`: sequential fetches, uncaught send
The four channel lookups ran sequentially and a failed onboarding
send threw. Lookups are now cache-first and run in `Promise.all`,
settings come from `getSettings(guild.id)` (DB overrides, static
fallback), and the send is wrapped in try/catch. Embed text is
unchanged.

### `verificationModalHandler`: role added before any check, welcome failure = generic failure
It added the member role before checking the bot could manage it,
and a failed welcome send (after the role was added) was reported
as a generic verification failure. It now pre-checks `ManageRoles`
+ hierarchy and the welcome channel before `roles.add`, resolves
settings via `getSettings`, and if the welcome send fails after the
role is added it tells the user "You are verified, but the welcome
message failed to send."

### `logger`: log channel only by name
It only resolved the log channel by name. It now resolves by ID
when `settings.channels.logs` looks like an ID, falls back to name,
and checks `isTextBased()` before sending. Colours now come from
`config/constants.js`.

### `refreshgallery`: unbounded find, one-by-one edits, no skip
It loaded every card/art into memory and edited every message
serially, including ones that had not changed. It now streams via a
lean cursor, refreshes 3 at a time (`chunkedEach`), skips messages
whose embed already matches, and counts 429s separately in the
summary.

### `migrateCloudinary`: unbounded find, one save per doc
Same pattern: lean cursor, concurrency 3, and a single
`bulkWrite` for the URL updates instead of one `save()` per
document. It now uses `config.mongoUri` (`MONGO_URI` canonical)
instead of its own env fallback chain.

### Gallery / category / link browsing: unbounded find() per open
`/cards`, `/arts`, `/links` and the gallery Back branch ran an
unbounded `find()` and mapped categories in memory on every
invocation. Categories now come from a shared 5-minute
`distinct('category')` cache (`services/categoryCache.js`).
Gallery list queries are `.select(...).lean().limit(200)`, and
gallery/menu state is capped at 500 entries (oldest evicted),
pruned on `get()` as well as on open, and swept every 5 minutes by
an unref'd interval in `index.js` (which also gained `error` /
`shardError` / `rateLimit` logging, a try/catch command loader that
skips bad files instead of dying, and `process.exit(1)` on
`uncaughtException`).

### `giveroleButtonHandler`: cache-only members
It assigned the role only to members already in the cache, silently
skipping everyone else. It now `members.fetch()`es first, then
assigns in chunks of 10 with `retryWithBackoff` (honours
`retry_after`) and reports partial failures.

### `selfRoleHandler`: unvalidated selection
It used `interaction.values[0]` without checking the role still
exists. Selections are validated against the guild's roles first,
and role operations are wrapped in try/catch with a user-facing
error reply.

### `claimadmin`: no permission pre-check
It created the Administrator role before checking the bot could
manage roles. It now pre-checks `ManageRoles` (and uses
`config/owner` instead of `config.botOwnerId` directly).

### Database indexes
Added compound indexes `{category: 1, createdAt: -1}`,
`{discordMessageId: 1}`, `{uploaderId: 1}` to Card/Art,
`{category: 1, createdAt: -1}` + `{discordMessageId: 1}` to Link,
`{type: 1, targetId: 1}` to Trusted and `{targetId: 1, enabled: 1}`
to AutoReply (the `targetId`/`enabled` pair is what `messageCreate`
filters on). `AutoReply.cooldown`'s default now comes from
`constants.AUTOREPLY_DEFAULT_COOLDOWN_MS` (same 12h value).

## 2. Environment / config table

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `TOKEN` | Yes | — | Discord bot token |
| `CLIENT_ID` | Yes | — | Discord application (client) ID |
| `BOT_OWNER_ID` | Yes | `""` (fail closed) | Bot owner user ID. The **only** place the owner is defined; `config/owner.js` re-exports it. No hardcoded fallback anywhere. |
| `ALLOWED_GUILD_IDS` | No | empty (all guilds) | Comma-separated guild IDs the bot may run in |
| `MONGO_URI` | Yes | — | MongoDB connection string (never logged; pool: `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Yes | — | Cloudinary credentials (read once via `config.js`) |
| `CLOUDINARY_FOLDER_PREFIX` | No | `hornet` | Folder prefix for uploaded images |
| `ENABLE_TICKETS` / `ENABLE_TRYOUTS` / `ENABLE_VERIFICATION` / `ENABLE_MODERATION` / `ENABLE_CHANNEL_MANAGER` / `ENABLE_BROADCAST` | No | `true` | Feature flags (all six now exist; the last three were missing) |
| `CHANNEL_WELCOME`, `CHANNEL_MAIN_WELCOME`, `CHANNEL_TRYOUT`, `CHANNEL_ONBOARDING`, `CHANNEL_SERVER_RULES`, `CHANNEL_SERVER_SUPPORT`, `CHANNEL_LOGS`, `CHANNEL_CARDS`, `CHANNEL_ARTS`, `CHANNEL_LINKS`, `CHANNEL_VERIFICATION` | No | `config/guild.json` | Per-key channel overrides |
| `ROLE_MEMBER`, `ROLE_PENDING_TRYOUT`, `ROLE_CLAN_MEMBER_AS`, `ROLE_CLAN_MEMBER_EU`, `ROLE_TRYOUT_TESTER_AS`, `ROLE_TRYOUT_TESTER_EU` | No | `config/guild.json` | Per-key role overrides |
| `SELFROLES_CHANNEL`, `CLAN_EMBED_IMAGE` | No | `config/guild.json` | Self-role channel / clan embed image overrides |
| `HORNET_GUILD_CONFIG_PATH` | No | `config/guild.json` | Path to the guild config file |

Guild IDs, role IDs (member, clan, colour, faction, ping), channel
names/IDs, self-role channel + banner URLs, clan embed image and the
`SFA`/`ART` ID prefixes live in **`config/guild.json`** (exact
values carried over from the old `settings.js`; `config/guild.example.json`
has placeholder IDs). `config/guild.json` is gitignored but ships in
the delivered zip so the bot works drop-in. The `BotSettings`
collection can override channels/roles/banners per guild at runtime
(`config/configLoader.js`, 60s TTL cache).

`config/constants.js` now holds all shared numbers/colours
(`GALLERY_TTL_MS`, `MENU_TTL_MS`, `MEMBER_MAX_USES`,
`MEMBER_COOLDOWN_MS`, `AUTOREPLY_DEFAULT_COOLDOWN_MS`,
`AUTOREPLY_MAX_TTL_MS`, `VERIFY_MIN_ACCOUNT_AGE_MS`,
`VERIFY_MIN_JOIN_AGE_MS`, `SPAM_MAX_PINGS`, `SPAM_DELAY_MS`,
`INVITE_MAX_AGE_S`, `CONFIRM_TIMEOUT_MS`, `SETUP_STEP_DELAY_MS`,
`GALLERY_MAX_ITEMS`, `CACHE_TTL_MS`, and `COLORS` with
`PRIMARY/ERROR/INFO/SUCCESS/WARNING/BRAND/CARD/ART/LINK`), wired
into the services, utils and commands that used the literals. New
shared helpers: `utils/discord.js` (`safeReply`, `canManageRole`,
`assertTextChannel`, `retryWithBackoff`, `chunkedEach`),
`utils/loadCommands.js` (one command scanner for `index.js`,
`deploy-commands.js` and `sync.js`, with duplicate guard and
feature-flag filtering), `services/categoryCache.js`,
`services/autoReplyCache.js`, `utils/presence.js`.

## 3. What was NOT changed (behaviour)

- Command names, descriptions, options, embed text, embed colours,
  custom IDs, and the order handlers run in (`index.js` handler
  lists are untouched).
- The landing/dashboard-adjacent flows: verification, tryouts,
  clan join, self-roles, gallery pagination and favourites work
  exactly as before — only their failure paths got safer.
- `checkGuildAuth.js` is unchanged (already correct).
- The `BUTTON ERROR` path still does not re-answer a deferred
  button (`respondToDeferred=false`); only select/modal were fixed.
- No dependencies were added or removed (`package.json` lists the
  same four runtime dependencies; `@discordjs/builders`,
  `@discordjs/rest` and `uuid` were already absent).
- No source code, credentials or customer data were published
  anywhere; the owner ID appears nowhere in the delivered tree
  (verified by grep, see below).

## 4. Deliberate behaviour changes (small, and why)

- **Gallery TTL is unchanged at 30 minutes.** The old
  `constants.js` said 5 minutes but was dead code — the gallery
  service actually used 30 minutes, so `GALLERY_TTL_MS` is now
  1,800,000 ms in `config/constants.js` and `galleryV2.js` imports
  it. Category menus keep their 30 min TTL (`MENU_TTL_MS`).
- **`/botadmin guildlist` no longer creates invites.** It lists
  guilds + authorization status only.
- **`/setup` no longer sleeps 1500ms between channel creates** —
  it is now a fast parallel create.
- **`/spam` progress is now shown in the deferred reply** (every
  50 pings) instead of `console.log`, and it stops on rate limits
  instead of retrying forever.
- **`/refreshgallery` summary gained two lines** ("Skipped
  (unchanged)" and "Rate-limited"); the original three lines are
  unchanged.
- **`npm run check` no longer needs a git repo.** The old script
  used `git ls-files` and failed outright outside a repo; it now
  runs `scripts/check-syntax.js`, which walks the tree (skipping
  `node_modules`).
- **The owner test in `tests/index.test.js` was updated** to assert
  the new no-hardcoded-ID design (see §1), and the `say.js` path in
  that file was fixed. No other assertion was weakened.

## 5. Migration steps

1. Copy this folder over your existing bot folder (or unzip it as a
   new folder — it is a complete drop-in replacement; keep your
   existing `.env`).
2. Copy `.env.example` to `.env` if you do not have one, and fill
   in `TOKEN`, `CLIENT_ID`, **`BOT_OWNER_ID`** (your Discord user
   ID — required, there is no fallback any more), `MONGO_URI` and
   the Cloudinary keys. Keep `config/guild.json` — it already
   holds this server's channel/role IDs. If you are setting up a
   fresh server, copy `config/guild.example.json` to
   `config/guild.json` and fill in your IDs.
3. `npm install` (Node 22+).
4. `npm run deploy` (or `/sync` in Discord as the owner) to
   register the slash commands.
5. `npm start` (or `npm run dev`).
6. First run: the `Counter` collection is created automatically by
   the first `/savecard` / `/saveart`. **IDs restart at
   `SFA-000001` / `ART-000001` in the counter** — if you already
   have cards/art in the database, seed the counter first so new
   IDs do not collide with existing ones. The old scan fallback only runs if the
   counter itself errors, so do not skip this step on an existing
   database. Find your highest existing numbers first, in `mongosh`
   in the same database as your bot's `MONGO_URI`:
   ```js
   db.cards.aggregate([ { $match: { cardId: { $regex: "^SFA-[0-9]+$" } } }, { $project: { n: { $toInt: { $arrayElemAt: [ { $split: ["$cardId", "-"] }, 1 ] } } } }, { $group: { _id: null, highest: { $max: "$n" } } } ])
   db.arts.aggregate([ { $match: { artId: { $regex: "^ART-[0-9]+$" } } }, { $project: { n: { $toInt: { $arrayElemAt: [ { $split: ["$artId", "-"] }, 1 ] } } } }, { $group: { _id: null, highest: { $max: "$n" } } } ])
   ```
   Then seed with the numbers those return, before the first
   `/savecard` or `/saveart` in the new code:
   ```js
   db.counters.insertOne({ _id: "card", seq: <highest SFA number> })
   db.counters.insertOne({ _id: "art", seq: <highest ART number> })
   ```
   If either query returns nothing, that collection is empty or fresh
   and that counter needs no seeding. If a query returns nothing but
   you know you have cards or art, run `db.getCollectionNames()` first —
   `cards` / `arts` / `counters` are Mongoose's default pluralised
   names and your database's names may differ.

## 6. How to verify

```bash
npm run check   # syntax-checks all 107 JavaScript files
npm test        # 124 tests, 0 failures (see below)
```

- `grep -rn "<your-owner-id>" --include="*.js" --include="*.json" .`
  (replace `<your-owner-id>` with your real owner ID, excluding
  `node_modules`/`package-lock.json`) must return nothing.
- Boot smoke test (no real token/Mongo needed — it must get past
  command loading to the MongoDB connection failure):
  `TOKEN=x CLIENT_ID=x BOT_OWNER_ID=test MONGO_URI=mongodb://127.0.0.1:27017/hornet-test timeout 8 node index.js`
  must print the feature-flag banner and `❌ MongoDB Connection Failed`
  and exit 1 — proving the loader no longer crashes on the
  repositories.

## 7. Test results

Before the refactor (baseline, as delivered):

| Suite | Pass | Fail |
|---|---|---|
| `npm test` (index + mongo) | 102 | 11 |

The 11 failures were: 9× deferred select/modal error-reply tests,
1× failed-error-response (`deferred=true`), 1× owner test reading
the wrong path `commands/utility/say.js`.

After the refactor:

| Command | Tests | Pass | Fail |
|---|---|---|---|
| `npm test` (index + mongo + presence + repositories + config) | 124 | 124 | 0 |
| `node --test tests/*.test.js` (all five files) | 124 | 124 | 0 |
| `npm run check` | 107 files syntax-checked | — | 0 |

Note: `node --test tests/` (directory form) fails at the Node CLI
level in Node 24.22.1 — it tries to load the `tests` directory as a
module (`Cannot find module '.../tests'`). That is an invocation
quirk, not a test failure; the glob form above runs all five files
and passes 124/124.

Boot smoke test (see §6): run before delivery — it printed the
feature-flag banner, `❌ BOT_OWNER_ID is not set` was NOT shown
(`BOT_OWNER_ID=test` was set), then `❌ MongoDB Connection Failed`
with a connection-refused error and exited 1, exactly as expected
(no MongoDB was running). Command loading completed first — the
repositories resolve and the loader no longer crashes.
