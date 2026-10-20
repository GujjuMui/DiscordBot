# 🛡️ Hornet Discord Clan Bot

A modular, production-grade Discord.js v14 bot built for competitive gaming clans, communities, and server management. Hornet Bot features robust role-based access control (RBAC), feature flags, secure owner management, bulk moderation tools, channel management, and cloud-backed media storage.

---

## 🌟 Key Features & Modules

### 1. ⚙️ Configuration & Feature Flag System
- **Environment-Driven Configuration**: Fully configurable via `.env` variables modeled after production Python and Node.js patterns.
- **Granular Feature Flags**: Dynamically enable or disable major modules on the fly:
  - `ENABLE_MODERATION`: Controls moderation commands and auto-moderation.
  - `ENABLE_CHANNEL_MANAGER`: Controls bulk channel creation, deletion, and setup tools.
  - `ENABLE_BROADCAST`: Controls announcement and broadcast systems.
  - `ENABLE_TICKETS`: Controls support ticket workflows.
  - `ENABLE_TRYOUTS`: Controls clan tryout and recruitment pipelines.
  - `ENABLE_VERIFICATION`: Controls user verification flows.
- **Guild Whitelisting**: Restricts bot execution to authorized guilds (`ALLOWED_GUILD_IDS`) to prevent unauthorized usage.

### 2. 🔨 Moderation Suite
- **Bulk Ban (`/bulkban`)**: Instantly ban multiple rule-breakers or inactive members by providing a comma-separated list of User IDs. Includes automatic audit logging and reason tracking.
- **Claim Admin (`/claimadmin`)**: Secure recovery command restricted to the designated Bot Owner (`BOT_OWNER_ID`) that instantly provisions a high-privilege role with Administrator, Ban Members, and Kick Members permissions, assigning it directly to the owner.
- **Diagnostics & Permission Checkers**: Inspect server permissions, bot operational health, and guild security configurations.

### 3. 📁 Channel Manager
- **Bulk Channel Operations**: Efficiently create, organize, or bulk delete channels.
- **Community Server Safety**: Built-in safeguards that prevent accidental deletion of critical Discord community channels (System channels, Rules channels, Public Updates channels) with error protection code `50074`.

### 4. 📢 Broadcast & Announcement System
- Send formatted embeds and broadcast announcements across designated channels with ease.

### 5. 🗄️ Database & Cloud Storage
- **MongoDB / Mongoose**: Persistent storage for bot settings, user cooldowns, ticket logs, and verification states.
- **Cloudinary Integration**: Secure cloud image hosting and migration utilities for clan logos, badges, and media assets.

---

## 📂 Project Directory Structure

```text
Discord Clan Bot/
├── commands/               # Modular slash command categories
│   ├── admin/              # Administrative & bot-owner commands (bulkban, claimadmin, sync, etc.)
│   └── ...
├── config/                 # Configuration loaders & feature flag systems
│   ├── config.js           # Core environment variable parser & feature flag logger
│   └── ...
├── database/               # Mongoose schemas & database connection managers (mongo.js)
├── events/                 # Discord event handlers (ready, interactionCreate, etc.)
├── tests/                  # Automated test suite (Jest)
├── .env                    # Environment credentials & feature flags
├── deploy-commands.js      # Global & guild-level slash command registration script
├── index.js                # Main application entry point
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
Create or update your `.env` file in the root directory with your credentials:
```env
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
BOT_OWNER_ID=your_discord_user_id_here
TEST_GUILD_ID=your_test_guild_id_here
MAIN_GUILD_ID=your_main_guild_id_here
ALLOWED_GUILD_IDS=guild_id_1,guild_id_2

# Feature Flags
ENABLE_MODERATION=true
ENABLE_CHANNEL_MANAGER=true
ENABLE_BROADCAST=true

# Database & Storage
MONGO_URI=mongodb://your_mongo_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Register Slash Commands
```bash
node deploy-commands.js
```

### 4. Start the Bot
- **Development Mode**:
  ```bash
  node index.js
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

---

## 🧪 Testing

Run the automated test suite to verify application logic and mocks:
```bash
npm test
```

---

## 📄 License

This project is proprietary and built for Hornet Clan management.
