# 🛡️ Hornet Discord Clan Bot

A modular, production-grade Discord.js v14 bot built for competitive gaming clans, communities, and server management. Hornet Bot features robust role-based access control (RBAC), secure owner management, gallery showcases, link directories, verification workflows, tryout pipelines, and cloud-backed media storage.

---

## 🌟 Key Features & Modules

### 1. ⚙️ Configuration & Authorization System
- **Environment-Driven Configuration**: Fully configurable via `.env` variables modeled after production Node.js patterns.
- **Allowed Guilds Whitelisting**: `ALLOWED_GUILD_IDS` restricts bot execution to authorized servers globally. Unauthorized servers attempting interaction are automatically blocked with an ephemeral message.
- **Role-Based Access Control (RBAC)**: Secure owner management and trusted/admin role hierarchies for protected commands.

### 2. 🗄️ Database & Cloud Storage
- **MongoDB / Mongoose**: Persistent storage for bot settings, SFA cards, artwork showcases, link directories, and verification states with compound indexes (`{category, createdAt}`, `discordMessageId`, `uploaderId`) and a pooled connection (`maxPoolSize: 10`).
- **Cloudinary Integration**: Secure cloud image hosting and migration utilities for clan logos, badges, and media assets. Uploads stream straight to Cloudinary (no temp files) with a 10s timeout and 10 MB cap.
- **Repositories layer**: All database access for cards, art and links goes through `repositories/` (`CardRepository`, `ArtRepository`, `LinkRepository`) — `.lean()` reads, duplicate-key (11000) errors surfaced cleanly. See `REFACTOR.md` for the full list of bugs fixed in this refactor.

### 3. 🖼️ Gallery & Showcase Management
- Interactive pagination systems for SFA cards and artwork with category filtering, tag search, and Discord message synchronization.

---

## 📂 Project Directory Structure

```text
Discord Clan Bot/
├── commands/               # Modular slash command categories
│   ├── admin/              # Administrative & bot-owner commands (sync, trust, etc.)
│   ├── cards/              # SFA Card management & editing
│   ├── clan/               # Clan info & join panels
│   ├── links/              # Community link directory
│   ├── screenshots/        # Art showcases & image management
│   ├── setup/              # Interactive bot setup wizards
│   ├── utility/            # General utilities (help, about, say)
│   └── verification/       # Verification system
│   
├── config/                 # Configuration loaders & frozen constants
│   ├── config.js           # Core environment variable parser (env only, no hardcoded fallbacks)
│   ├── constants.js        # Immutable operational constants (colours, TTLs, limits)
│   ├── owner.js            # Centralized bot owner definition (re-exports BOT_OWNER_ID)
│   ├── guild.json          # This server's channel/role IDs + branding (gitignored, ships in the zip)
│   ├── guild.example.json  # Placeholder-ID template for a fresh server
│   ├── configLoader.js     # DB-overridable per-guild settings (BotSettings, 60s TTL cache)
│   └── dangerousPermissions.js # Privileged permission flags
│   
├── database/               # Mongoose schemas & singleton connection pool
│   ├── mongo.js            # Asynchronous singleton connection manager
│   ├── Art.js              # Artwork schema & indexes
│   ├── Card.js             # Card schema & indexes
│   └── Link.js             # Link schema & indexes
│   
├── repositories/           # Data Access Objects (DAOs) for database operations
│   ├── ArtRepository.js    # Artwork database queries & mutations
│   ├── CardRepository.js   # Card database queries & mutations
│   └── LinkRepository.js   # Link database queries & mutations
│   
├── services/               # In-memory caching, TTL handlers & pagination state
│   ├── categoryCache.js    # Shared 5-min distinct('category') cache
│   └── autoReplyCache.js   # 60s cache of enabled auto-replies
├── events/                 # Discord event handlers (ready, interactionCreate, etc.)
├── utils/                  # Core helpers (embedBuilder, logger, saveImage, idGenerator, discord.js safety helpers)
├── tests/                  # Automated test suite (Node.js test runner)
├── .env                    # Environment credentials & whitelists (never committed)
├── .env.example            # Every variable the bot reads, with defaults
├── deploy-commands.js      # Global slash command registration script
├── index.js                # Main application entry point
├── REFACTOR.md             # What was refactored, what was fixed, what was not changed
└── package.json            # Project dependencies & scripts
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: Version 22.x or higher
- **MongoDB**: Active MongoDB connection string
- **Discord Bot Token**: Configured with required Privileged Intents (`GUILD_MEMBERS`, `GUILD_MESSAGES`, `MESSAGE_CONTENT`)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd "Discord Clan Bot"
npm install
```

### 2. Configure Environment Variables
Create your `.env` file in the root directory with your credentials (see `.env.example` for the full list):

```env
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
BOT_OWNER_ID=your_discord_user_id_here   # required — no hardcoded fallback; unset = owner commands have no owner
ALLOWED_GUILD_IDS=guild_id_1,guild_id_2

# Database & Storage
MONGO_URI=mongodb://your_mongo_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER_PREFIX=hornet
```

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `TOKEN` | Yes | — | Discord bot token |
| `CLIENT_ID` | Yes | — | Discord application (client) ID |
| `BOT_OWNER_ID` | Yes | `""` (fail closed) | Bot owner user ID — the only place the owner is defined; `config/owner.js` re-exports it |
| `ALLOWED_GUILD_IDS` | No | empty (all guilds) | Comma-separated guild IDs the bot may run in |
| `MONGO_URI` | Yes | — | MongoDB connection string (never logged) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Yes | — | Cloudinary credentials |
| `CLOUDINARY_FOLDER_PREFIX` | No | `hornet` | Folder prefix for uploaded images |
| `ENABLE_TICKETS` / `ENABLE_TRYOUTS` / `ENABLE_VERIFICATION` / `ENABLE_MODERATION` / `ENABLE_CHANNEL_MANAGER` / `ENABLE_BROADCAST` | No | `true` | Feature flags; `false` disables the matching commands |
| _(removed in v1.6)_ | — | — | Channel/role IDs are no longer configured anywhere — the bot creates what it needs (see `services/guildSetup.js`) |

### Guild configuration — none required (v1.6)
No channel or role IDs need to be configured anywhere — not in `config/guild.json`, not in `.env`. Run `/setup` once and the bot builds the four categories (gallery, verification, clan, bot), all 14 channels — the how-to-join channel is optional and is not created — and all 28 roles itself, and remembers their IDs in MongoDB (BotSettings). `/verification setup` and `/selfroles setup` do the same for their own panel, and both accept an optional channel instead. A server that already has IDs in `config/guild.json` keeps using them — stored IDs are always tried first. Banner URLs and the clan embed image are the only values that still live in `config/guild.json` (they are uploaded media the bot cannot create); the file shipped in this zip already contains this server's values, and for a fresh server they can simply be left empty — panels post without them. `config/guild.json` is gitignored.

### Rotating the owner
Set `BOT_OWNER_ID` in `.env` to the new owner's Discord user ID and restart the bot. Nothing else references the owner ID — every owner check reads `owner.ownerId` from `config/owner.js`, which re-exports `config.botOwnerId`.

### Per-guild overrides (BotSettings)
The `BotSettings` collection in MongoDB can override channels, roles, self-role banners and clan branding per guild at runtime (read via `config/configLoader.js`, cached for 60s, invalidated by `updateSetting()`). Static `config/guild.json` values are the fallback when no record exists.

### 3. Register Slash Commands
```bash
npm run deploy
```

### 4. Start the Bot
- **Development Mode**:
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

---

## 🧪 Testing

Run the automated test suite to verify application logic and repository mocks:
```bash
npm test          # 124 tests: index (VM harness), mongo, presence, repositories, config
npm run check     # syntax-checks all 107 JavaScript files (no git repo needed)
```

See `REFACTOR.md` for the migration steps and how to verify the refactor.

---

## 📄 License

This project is proprietary and built for Hornet Clan management.
