# Hornet — Architecture

## Layer diagram

```
index.js                      entry point only: client, commands, context,
                              router, sweeper, listeners, startup
  ├─ core/router.js           component dispatch (prefix-first, trial fallback)
  ├─ core/context.js          one frozen dependency object, passed to handlers
  ├─ utils/loadCommands.js    command scan (shared with deploy/sync)
  ├─ utils/discord.js         safeReply, logError, replyWithError, retries
  └─ services/stateSweeper.js 5-minute prune of in-memory state
        │
        ▼
events/ + commands/           handlers: parse the interaction, call a
                              service/repository, answer. No Mongoose
                              models, no direct Discord API loops.
        │
        ▼
services/                     domain logic + in-memory state:
  galleryService.js           category -> gallery flow (query, embed,
                              open state, category menu)
  galleryV2.js                gallery state (per message id, 30-min TTL)
  categoryMenuService.js      category-menu state (30-min TTL)
  categoryCache.js            distinct('category') cache (5-min TTL)
  autoReplyCache.js           enabled auto-replies (60-s TTL)
  memberCooldown.js           atomic cooldown accounting
  autoReplyCooldown.js        per-user reply cooldowns
  spamManager.js              per-guild spam sessions
        │
        ▼
repositories/                 the ONLY place Mongoose models are imported.
  Card/Art/Link/Trusted/      Lean reads, duplicate-key 11000 surfaced
  AutoReply/MemberCooldown/    clearly, null-safe inputs. index.js re-exports
  BotSettings/SelfRoleMessage/ all nine under one object for core/context.
  Counter (+ index.js)
        │
        ▼
database/                     Mongoose schemas + indexes, mongo.js
                              (connection, pool options)
        │
        ▼
config/                       config.js (env only), settings.js (loads
                              config/guild.json), configLoader.js
                              (per-guild BotSettings overrides, 60-s TTL),
                              constants.js (shared colours / TTLs / limits)
```

## Where each kind of logic belongs

- **index.js** — wiring only. If you are adding logic here, it
  belongs in a service, a util, or a handler instead.
- **events/** — one file per interaction family. A handler answers
  one kind of interaction, returns `true` when it handled it and
  `false` (or nothing) otherwise, and never imports a model.
  Component handlers export `customIdPrefixes` (exact ids or
  prefixes, e.g. `"tryout_pass_"`, `"giverole_confirm:"`) so the
  router can dispatch to them directly.
- **commands/** — slash commands. Same rules as events: parse
  options, call a service/repository, answer. Owner/trusted/admin
  gating happens in `index.js` via `protectedCommands` /
  `adminCommands` plus `checkPermission` / `checkAdminPermission`.
- **services/** — domain logic and in-memory state. A service may
  call repositories and other services, never a model, never
  Discord directly except to answer the interaction it was given.
- **repositories/** — data access only. One file per model, thin
  wrappers, `.lean()` on reads, 11000 surfaced as a clear error.
  No Discord, no embeds, no business rules.
- **core/router.js** — dispatch only. It never contains handler
  logic; it routes by `customIdPrefixes`, then falls back to
  sequential trial so unregistered ids still work.
- **core/context.js** — dependency assembly. `createContext(client)`
  returns a frozen `{ client, config, settings, repositories,
  caches, discord, logger }`. The router passes it as the second
  argument to handlers: `handler(interaction, ctx)`. Existing
  handlers ignore the extra argument; new code should read its
  dependencies from `ctx` instead of requiring them ad-hoc, which
  is what makes a handler unit-testable (pass a fake `ctx`).
- **utils/** — stateless helpers (`discord.js` safety helpers,
  `embedBuilder.js`, `logger.js`, `idGenerator.js`, `saveImage.js`).

## How to add things

- **New slash command:** add `commands/<group>/<name>.js` with
  `data` (a `SlashCommandBuilder`) and `execute(interaction)`.
  Add its name to `config/protectedCommands.js` or
  `config/adminCommands.js` if it needs gating. Run
  `npm run deploy` (or `/sync`) to register it. It is picked up
  automatically by `loadCommands`.
- **New component handler:** add `events/<name>.js` exporting an
  async function `(interaction, ctx)` that returns `true`/`false`,
  plus `module.exports.customIdPrefixes = [...]`. Add the file
  name to the matching kind list in `index.js` (button / select /
  modal) — the router tries prefix matches first, then the list
  in order, so an unregistered id still falls through safely.
- **New repository:** add `database/<Model>.js` (schema + indexes),
  `repositories/<Model>Repository.js` (lean reads, null-safe
  inputs, 11000 handling), export it from
  `repositories/index.js`, add tests in
  `tests/repositories.test.js` using the stubbed-model pattern
  (no live Mongo). Callers must use the repository, never the
  model — `grep -rn "require.*database/"` outside `repositories/`
  and `database/` must show only `index.js` requiring the Mongo
  connection module.
- **New service:** put domain logic in `services/<name>.js`,
  keep state in a module-level `Map` with a TTL + a `prune` /
  `pruneExpired` function, and register the prune in
  `services/stateSweeper.js`.

## Test constraints (do not break these)

- `tests/index.test.js` loads `index.js` in a VM whose
  `mockRequire` only allows a fixed list of ids (see the
  `mockRequire` function in that file). If `index.js` gains a
  new top-level require, add a stub for it in the mock that
  mirrors the real module's contract for the paths the VM
  exercises; the real module is covered by its own tests.
  The VM interaction objects carry no `customId`, so prefix
  dispatch never matches there — the router stub keeps the old
  sequential trial order, and real prefix dispatch is covered
  by `tests/router.test.js`.
- `tests/mongo.test.js` loads `database/mongo.js` in a VM where
  `require()` only allows `mongoose` and the URI comes from
  `process.env.MONGO_URI` — that file must not require anything
  else, and must never log the URI.
- Source-string regression tests in `tests/index.test.js`
  assert structural facts (e.g. handlers key gallery state by
  message id, `index.js` uses `protectedCommands`). If a refactor
  moves the asserted code, update the assertion to the new
  location — do not delete it.
- Run before shipping: `npm run check` (syntax, all files),
  `npm test` (full suite), and the boot smoke test
  `TOKEN=x CLIENT_ID=x BOT_OWNER_ID=test
  MONGO_URI=mongodb://127.0.0.1:27017/hornet-test timeout 10
  node index.js` — it must get past command loading to the
  MongoDB connection failure and exit 1.
