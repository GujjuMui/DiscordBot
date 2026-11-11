# Hornet — Refactor Notes

## Custom factions & pings (v1.9)

Faction and ping roles are no longer hardcoded. Legion / Dynasty /
Heralds and the 7 ping roles (giveaway, SFA videos, announcement,
clan update, server update, friendly AS, friendly EU) were the FATE
server's own lists — they cannot be the same for every server. Each
server now keeps its own lists, and the owner builds them with
commands. Colour roles are unchanged (the canonical 10 colours, same
names and colours as before).

### Storage

BotSettings `extras` JSON blobs (services/selfRoleCustom.js):
- `extras.selfRoleFactions`: [{ roleId, name, description, emoji }]
- `extras.selfRolePings`:    [{ roleId, name, description, emoji }]

Reads go through `configLoader.getSettings()` and writes through
`configLoader.updateSetting()` (cache invalidated, so a change is
visible to the next read in the same process). No Discord ID literal
is written anywhere in code — IDs live only in the per-guild DB
record and in the guild's own config. `settings.roles.faction` /
`settings.roles.ping` keep their shape in `config/settings.js` and
`config/guild.json` is byte-identical — they are only the seed input
for servers that already had factions / pings configured.

### New /selfroles subcommands (all owner-only)

- `/selfroles faction-add role:<role> [description] [emoji]` — add a
  faction role to the panel. Re-adding the same role updates its
  description and emoji.
- `/selfroles faction-remove role:<role>` — remove it from the panel
  (the Discord role itself is not deleted).
- `/selfroles faction-list` — list the guild's faction roles.
- `/selfroles ping-add / ping-remove / ping-list` — the same, for
  ping roles.
- `/selfroles banner-set section:<main|color|faction|ping> image:<attachment>`
  — save an uploaded image as that section's banner. The attachment
  must be an image (contentType starting with `image/`). The URL is
  stored in BotSettings `banners` and in memory, and BotSettings
  banners now win over the static URL in guild.json, so a banner set
  this way survives a restart. Run `/selfroles refresh` after
  changing the lists or a banner to update the posted panel.

Setup and refresh keep working: setup makes sure the colour roles
exist, then builds the panel from the colour roles + the stored
custom lists; a section with no roles is skipped, so a fresh server
starts with colours only. The panel builder
(utils/selfRoleComponents.js) and the select handler
(events/selfRoleHandler.js) read faction / ping options ONLY from
the stored custom lists — entries whose role no longer exists are
skipped. Select customIds (`selfroles_color` / `selfroles_faction` /
`selfroles_ping`) and the grant/remove behaviour are unchanged.

### One-time seed

When a guild has no stored lists yet, they are built once from the
roles it already has configured (settings.roles.faction / ping,
resolved to live Discord roles for their names), with descriptions
and emojis from the legacy tables in services/selfRoleDefaults.js
(labelled "legacy FATE defaults — used ONLY for the one-time
seed"). The seed runs only when a list is absent and never
overwrites a list the owner has set — removing an entry afterwards
stays removed. A fresh server with no configured roles seeds to
empty lists. The legacy name strings (Legion, Dynasty, Heralds,
"SFA Videos Ping", "Friendly Ping (Europe)" etc.) now appear only
in that seed module, in docs, and in tests that assert the seed.


## Server map, optional how-to-join, separate categories, styled roles, unverified visibility (v1.8)

v1.7 kept intact: the onboarding code in
`commands/verification/verification.js` (resolve onboarding + reply
naming both channels) is unchanged in this version.

### 1. New `/servermap` command (31 commands now)

`commands/setup/servermap.js`, admin-only, with an optional `channel`
option. It builds an embed by SCANNING the live server — server name,
member / channel / role counts, then one field per category listing
that category's channels as mentions in position order, plus a
"No Category" field for uncategorised channels. Embed limits are
respected (25 fields, 1024 chars per field with "…and N more",
6000 total) so a big server never throws. The how-to-join channel is
mentioned only when it exists on the server.

It is idempotent: the map's channel + message IDs are remembered in
BotSettings `extras` (`serverMapChannelId` / `serverMapMessageId`,
via `configLoader.updateSetting` — no new model), so a re-run EDITS
the same message; a deleted message (or a moved channel) posts fresh
and the old copy is deleted when possible. Reply says where the map
was posted or updated. `npm run deploy` is required after installing
— the command registers through the shared loader automatically.

### 2. How-to-join is optional now

- `/setup` no longer creates it (skipped in the channel loop).
- `/clan setup` has a new optional `channel` option (picked channel
  wins and is remembered). With no channel given it resolves
  how-to-join with `create: false` and, when it does not exist,
  posts the clan join panel in the channel the command was run in
  instead of creating a channel. Panel embed, buttons and the
  "Clan join panel created." reply are unchanged.
- `events/verificationModalHandler.js` resolves how-to-join with
  `create: false` too; when it does not exist the "Join Fate Clan"
  button is left out of the welcome message rather than linking
  nowhere. The channel key and canonical name stay in
  `services/guildSetup.js` — it is still resolvable when present,
  just never auto-created. To opt in, create the channel by hand
  (name `🤝┃how-to-join`) or pick it in `/clan setup`.

### 3. Separate categories (no more single HORNET category)

| Category | Channels |
| --- | --- |
| 🎴 FATE GALLERY | 🎴┃sfa-cards, 🎨┃sfa-arts, 📺┃content |
| ✅ VERIFICATION | 📝┃verification, 👋┃onboarding, 📃┃server-rules, 📖┃server-guide, 🎀┃welcome, 💬┃server-support |
| ⚔️ CLAN | 🏅┃tryouts, tournaments, 🗺️┃server-map, 🤝┃how-to-join (only if it exists) |
| 🤖 HORNET | 🐝┃hornet-logs, 🎭┃self-roles |

`services/guildSetup.js` has a per-channel category map
(`CHANNEL_CATEGORIES`) and `ensureCategory(guild, key)`; every
caller creates the category for that channel's group. The resolver
re-parents a channel found by canonical name into its group category
(channels found by a stored ID the owner picked are never moved).
`/setup` re-parents every managed channel and, at the end, deletes
the old `HORNET` category ONLY if it ends up empty — a category
that still holds any channel is left alone.

### A. Styled role names

Every role the bot creates fresh now has an emoji prefix plus its
name in Mathematical Bold Script (one font, `utils/fancyFont.js`
`toScript`). Roles that already exist keep their current names —
the stored ID is tried first, so styling applies only to freshly
created roles. The self-role panel emoji maps are keyed by the
stable sub-key (red/legion/giveaway…) instead of the role name, so
the emojis resolve for plain and styled names alike.

Exact names created (plain → created):

- Member → 👤 𝓜𝓮𝓶𝓫𝓮𝓻, Pending Tryout → ⏳ 𝓟𝓮𝓷𝓭𝓲𝓷𝓰 𝓣𝓻𝔂𝓸𝓾𝓽
- Clan Member AS → ⚔️ 𝓒𝓵𝓪𝓷 𝓜𝓮𝓶𝓫𝓮𝓻 𝓐𝓢, Clan Member EU → ⚔️ 𝓒𝓵𝓪𝓷 𝓜𝓮𝓶𝓫𝓮𝓻 ℰ𝓤
- Pending Tryout AS/EU → ⏳ 𝓟𝓮𝓷𝓭𝓲𝓷𝓰 𝓣𝓻𝔂𝓸𝓾𝓽 𝓐𝓢 / ℰ𝓤
- Tryout Tester AS/EU → 🧪 𝓣𝓻𝔂𝓸𝓾𝓽 𝓣𝓮𝓼𝓽𝓮𝓻 𝓐𝓢 / ℰ𝓤
- Colours: 🔴 𝓡𝓮𝓭, ⚫ 𝓑𝓵𝓪𝓬𝓴, 🔹 𝓒𝔂𝓪𝓷, 🩷 𝓟𝓲𝓷𝓴, 🟠 𝒪𝓻𝓪𝓷𝓰𝓮, 🟤 𝓑𝓻𝓸𝔀𝓷, 🔵 𝓑𝓵𝓾𝓮, 🟢 𝒢𝓻𝓮𝓮𝓷, 🟣 𝓥𝓲𝓸𝓵𝓮𝓽, 🟡 𝓨𝓮𝓵𝓵𝓸𝔀
- Factions: 🎀 •  𝓛𝓮𝓰𝓲𝓸𝓷, 🎀  •  𝓓𝔂𝓷𝓪𝓼𝓽𝔂, 🎀  •  𝓗𝓮𝓻𝓪𝓵𝓭𝓼
- Pings: 📌  •  𝒢𝓲𝓿𝓮𝓪𝔀𝓪𝔂 𝓹𝓲𝓷𝓰, 📌  •  𝓢𝓕𝓐 𝓥𝓲𝓭𝓮𝓸𝓼 𝓟𝓲𝓷𝓰, 📌  •  𝓐𝓷𝓷𝓸𝓾𝓷𝓬𝓮𝓶𝓮𝓷𝓽 𝓟𝓲𝓷𝓰, 📌  •  𝓒𝓵𝓪𝓷 𝓤𝓹𝓭𝓪𝓽𝓮 𝓟𝓲𝓷𝓰, 📌  •  𝓢𝓮𝓻𝓿𝓮𝓻 𝓤𝓹𝓭𝓪𝓽𝓮 𝓟𝓲𝓷𝓰, 𝓕𝓻𝓲𝓮𝓷𝓭𝓵𝔂 𝓹𝓲𝓷𝓰, 𝓕𝓻𝓲𝓮𝓷𝓭𝓵𝔂 𝓟𝓲𝓷𝓰 (ℰ𝓾𝓻𝓸𝓹𝓮)

Trade-off, stated plainly: Discord search matches plain text, so
a styled name does not match a search for the plain name (searching
"Member" will not find "𝓜𝓮𝓶𝓫𝓮𝓻").

### B. Unverified visibility

Members with no roles see ONLY the ✅ VERIFICATION category.
`services/guildSetup.js` `applyVisibility(guild)` sets, on every
managed category:

- ✅ VERIFICATION: @everyone ALLOW ViewChannel.
- 🎴 FATE GALLERY, ⚔️ CLAN, 🤖 HORNET: @everyone DENY
  ViewChannel, Member role ALLOW, the bot's own role ALLOW.

`VISIBLE_TO_UNVERIFIED` is a parameterised set of channel keys
(verification, onboarding, serverRules, main_welcome, welcome,
serverSupport — exactly the verification category). The "broadcast"
channel the user meant is the onboarding / welcome channel, which
is already in this set — no separate announcements channel was
created. To make another channel visible to unverified members,
add its key to the set and resolve it under the verification
category.

`applyVisibility` runs when a managed category is created (via
`ensureCategory`) and on every `/setup` run, so existing
categories get the overwrites too. Categories the bot does not
manage are never touched.

Verification unlocks the server: `events/verificationModalHandler.js`
already grants the Member role on success (confirmed, unchanged)
— that is what opens the hidden categories. Consequence, checked
not assumed: the tryout code grants no channel access of its own
(no permission overwrites anywhere in the tryout flow) and a tryout
pass grants the Clan Member role but NOT the Member role, so a
member who does tryouts without verifying first sees only the
verification category until they verify; likewise a pending-tryout
member without the Member role cannot see the tryout channel. The
intended order is verification first (the onboarding welcome tells
new members to verify before joining the clan), so this is the
designed behaviour, not a regression.

Install: complete set, keep your `.env`, `npm install`,
`npm run deploy` (registers `/servermap`), `npm start`, then
re-run `/setup` once to move channels into the new categories,
apply the visibility overwrites, and (only if the old HORNET
category ends up empty) remove it. The bot needs Manage Channels
and Manage Roles in the server for this.


## Onboarding channel in verification setup (v1.7)

User report (2026-11-11): the original bot's verification flow had an
onboarding channel, and `/verification setup` should set it up too.

- `commands/verification/verification.js`: after resolving the
  verification channel, it now also resolves the onboarding channel
  (`👋┃onboarding`) through the same resolver — stored ID first, then
  a channel with that name, then created under the HORNET category
  (category created if missing). No hardcoded ID. The success reply
  now names both channels: "Verification panel created in
  #📝┃verification. Onboarding channel #👋┃onboarding is ready."
  This is the channel the original bot posted its welcome embed in on
  member join (see `events/memberJoinHandler.js`, which already
  resolved it the same way) — now it is ready at setup time instead
  of only being created on the first member join. The panel embed,
  Verify button and picked-channel option are unchanged.
- `tests/resolver.test.js`: new test proving `/verification setup` on
  a bare guild creates the HORNET category, the verification channel
  and the onboarding channel under it, sends the panel once, and
  mentions the onboarding channel in its reply.

No logic of any other command changed. Install as usual: complete
set, keep your `.env`, `npm install`, `npm run deploy`, `npm start`,
then `/verification setup`.


## No hardcoding (v1.6): every channel and role is resolved or created

User requirement (2026-11-11): running a command must automatically
create what it needs, or ask for a channel — nobody should have to
put channel/role IDs into `config/guild.json` or `.env` first. This
covers `/selfroles` (same treatment `/verification` got in v1.5) and
every other place an ID was required.

### How it works — `services/guildSetup.js`

One shared resolver, used by every command and handler:

  stored ID (config/guild.json, then BotSettings in Mongo)
    -> use that channel/role
  else a channel/role with the canonical name
    -> use it, and remember its ID
  else create it under the HORNET category (category created too)
    -> remember its ID

"Remember it" = `configLoader.updateSetting()` (BotSettings in
MongoDB, so it survives a restart) AND the in-memory static
`config/settings` object in the same process, so consumers that read
settings directly see it immediately. A fresh server needs NO
`guild.json` / `.env` ID entries at all — `guild.json` may be an
empty `{}` or absent. An existing server keeps working unchanged:
its stored IDs are always tried first; name fallback and creation
only run when no stored ID resolves. `config/guild.json` itself was
not edited.

Nested role maps cannot round-trip through `BotSettings.roles`
(a flat Map of String), so colour / faction / ping IDs are stored
as one JSON blob in `BotSettings.extras.roleGroups`;
`configLoader.getSettings()` unflattens it back into
`roles.color` / `roles.faction` / `roles.ping`. Proven by test: a
grouped role resolved, the in-memory value dropped (simulating a
restart), and the second resolve reuses the stored ID without
creating again.

Channels looked up BY NAME everywhere (cards, arts, links,
verification, tournaments, logs) keep a name in settings — never
an ID. A channel picked with a slash-command channel option whose
name differs from the canonical one is remembered by ID in
`BotSettings.extras.<key>ChannelId` instead.

Banner / embed images are Discord CDN URLs the user uploaded — they
cannot be created. A missing one is skipped: the self-role panel
posts without that gallery, and the clan panel posts without its
image. No image URL was invented.

### Canonical names (created by /setup, or on demand)

Channels (all text, under HORNET):
`🎴┃sfa-cards`, `🎨┃sfa-arts`, `📺┃content`,
`📝┃verification`, `tournaments`, `🐝┃hornet-logs`,
`🎀┃welcome`, `📖┃server-guide`, `🗺️┃server-map`,
`🤝┃how-to-join`, `🏅┃tryouts`, `👋┃onboarding`,
`📃┃server-rules`, `💬┃server-support`, `🎭┃self-roles`

Roles: `Member`, `Pending Tryout`, `Clan Member AS`,
`Clan Member EU`, `Pending Tryout AS`, `Pending Tryout EU`,
`Tryout Tester AS`, `Tryout Tester EU`;
colours `Red`, `Black`, `Cyan`, `Pink`, `Orange`, `Brown`,
`Blue`, `Green`, `Violet`, `Yellow` (with matching colours);
factions `🎀 •  Legion`, `🎀  •  Dynasty`, `🎀  •  Heralds`;
pings `📌  •  Giveaway ping`, `📌  •  SFA Videos Ping`,
`📌  •  Announcement Ping`, `📌  •  Clan Update Ping`,
`📌  •  Server Update Ping`, `Friendly ping`,
`Friendly Ping (Europe)`. Faction/ping names are exactly the names
the self-role panel emoji maps already expected, so those maps
were not changed. Created roles are non-hoisted, non-mentionable.

### Commands

- `/setup` is the one-time "build everything" command: it now
  creates all 14 channels and all 28 roles above, reporting
  created / already-existed in the same result embed (plus a
  `⚠️ Not Created` field only when something fails). It has a
  Manage Roles pre-check alongside the existing Manage Channels
  one. Existing channels found outside the category are still
  re-parented under HORNET.
- `/selfroles setup` accepts an optional `channel` option (the
  native Discord channel picker): a picked channel wins and is
  remembered; otherwise `🎭┃self-roles` is auto-created under
  HORNET. It creates every colour/faction/ping role first, so the
  panel is never posted with empty select menus. `/selfroles
  refresh` resolves the saved panel channel first, else the
  resolved self-roles channel. Panel content, owner-only check
  and replies are unchanged.
- `/verification setup` accepts the same optional `channel`
  option; otherwise the v1.5 auto-create still applies. Panel
  embed, button and replies unchanged.
- `/clan setup` resolves its how-to-join channel the same way
  (its embed image is skipped when unset). Member join,
  verification, tryout and member-management handlers resolve
  their roles/channels through the same resolver; a failure to
  resolve on the join path only skips the welcome message — it
  never breaks the join.

### Removed hardcoding

- `config/guild.example.json`: every `000000000000000000`
  placeholder is now `""` (empty = not configured yet).
- `config/settings.js`: the `ENV_OVERRIDES` block (`CHANNEL_*` /
  `ROLE_*` / `SELFROLES_CHANNEL` / `CLAN_EMBED_IMAGE`) is gone,
  and those entries are gone from `.env.example`. `.env` keeps
  only `TOKEN`, `CLIENT_ID`, `BOT_OWNER_ID`, `MONGO_URI`,
  `CLOUDINARY_*` and the feature flags (plus the optional
  `ALLOWED_GUILD_IDS` allowlist, which is empty by default).
- No other command's embed text, buttons, replies or logic
  changed. Tests: 140 (v1.5 baseline) -> 147, including 7 new
  resolver tests; syntax check 119 files; boot smoke reaches the
  expected MongoDB failure.



## Verification auto-create (v1.5): /setup and /verification create what is missing

Bug reported by the user (2026-11-11): `/verification setup` replied
"Verification channel not found", because `/setup` created the HORNET
category and the cards / arts / links / tournaments / logs channels but
never created the verification channel.

- `commands/setup/setup.js`: `settings.channels.verification`
  (`📝┃verification`) added to the channel list, so `/setup` now creates
  it under the HORNET category like the other channels.
- `commands/verification/verification.js`: instead of erroring when the
  verification channel is missing, it now creates the HORNET category
  if there is none, then creates the `📝┃verification` text channel
  under it, and posts the verification panel there — the same pattern
  `/setup` uses. Added a Manage Channels pre-check (same as `/setup`),
  so a missing permission fails with a clear message instead of
  halfway through. The panel embed, Verify button and replies are
  unchanged.
- `scripts/clear-guild-commands.js` (new utility, not a command):
  one-off cleanup for duplicate slash commands — clears leftover
  guild-scoped copies from one server: `node scripts/clear-guild-commands.js <SERVER_ID>`,
  then `npm run deploy`. Added after v1.4 was packaged, now included
  in this zip.

No logic of any other command changed; kept commands are 30 (v1.4
removals still apply). Install: copy the complete set, keep your
existing `.env`, delete nothing extra this time, `npm install`,
`npm run deploy`, `npm start`. Run `/setup` once on a server that
never had it, or just run `/verification setup` — either one creates
what is missing.


## Trim (v1.4): /botadmin, /checkperms and /claimadmin removed

User decision (2026-11-11): keep everything else from v1.3, remove only
these three commands. Deleted files, nothing else changed:

- `commands/admin/botadmin.js` — owner guild-list / leave-guild commands.
  No other file referenced it.
- `commands/admin/checkperms.js` — bot/user permission checker.
  No other file referenced it.
- `commands/admin/claimadmin.js` — created a role with Administrator
  permission and gave it to the owner. No other file referenced it.

Kept commands: 30 of 33 (all gallery, verification, tryout, auto-reply,
diagnostics, editsay, giverole, member, say, spam, stopspam, sync,
selfroles, trust trio, help, about, setup). No config, router, test or
behaviour change to any kept command. Install steps are unchanged:
copy your existing `.env`, set `BOT_OWNER_ID`, seed counters on an
existing DB before the first `/savecard` or `/saveart` (see §5),
`npm install`, `npm run deploy`, `npm start`. Note: with /botadmin
gone, leaving a guild is done from Discord itself (Server Settings /
right-click the server), not from the bot.


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
