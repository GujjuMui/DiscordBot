# 🛡️ Hornet Discord Clan Bot

A modular, production-grade Discord.js v14 bot built for competitive gaming clans, communities, and server management. Hornet Bot features robust role-based access control (RBAC), secure owner management, gallery showcases, link directories, verification workflows, tryout pipelines, and cloud-backed media storage.

---

## 🌟 Key Features & Modules

### 1. ⚙️ Configuration & Authorization System
- **Environment-Driven Configuration**: Fully configurable via `.env` variables modeled after production Node.js patterns.
- **Allowed Guilds Whitelisting**: `ALLOWED_GUILD_IDS` restricts bot execution to authorized servers globally. Unauthorized servers attempting interaction are automatically blocked with an ephemeral message.
- **Role-Based Access Control (RBAC)**: Secure owner management and trusted/admin role hierarchies for protected commands.

### 2. 🗄️ Database & Cloud Storage
- **MongoDB / Mongoose**: Persistent storage for bot settings, SFA cards, artwork showcases, link directories, and verification states with optimized single-field indexes.
- **Cloudinary Integration**: Secure cloud image hosting and migration utilities for clan logos, badges, and media assets.

### 3. 🖼️ Gallery & Showcase Management
- Interactive pagination systems for SFA cards and artwork with category filtering, tag search, and Discord message synchronization.

---

## 📂 Project Directory Structure

```text
Discord Clan Bot/
├── commands/               # Modular slash command categories
│   ├── admin/              # Administrative & bot-owner commands (sync, claimadmin, trust, etc.)
│   ├── cards/              # SFA Card management & editing
│   ├── clan/               # Clan info & join panels
│   ├── links/              # Community link directory
│   ├── screenshots/        # Art showcases & image management
│   ├── setup/              # Interactive bot setup wizards
│   ├── utility/            # General utilities (help, about, say)
│   └── verification/       # Verification system
│   
├── config/                 # Configuration loaders & frozen constants
│   ├── config.js           # Core environment variable parser
│   ├── constants.js        # Immutable operational constants
│   ├── owner.js            # Centralized bot owner definition
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
├── events/                 # Discord event handlers (ready, interactionCreate, etc.)
├── utils/                  # Core helpers (embedBuilder, logger, saveImage, idGenerator)
├── tests/                  # Automated test suite (Node.js test runner)
├── .env                    # Environment credentials & whitelists
├── deploy-commands.js      # Global slash command registration script
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
Create your `.env` file in the root directory with your credentials:
```env
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
BOT_OWNER_ID=your_discord_user_id_here
ALLOWED_GUILD_IDS=guild_id_1,guild_id_2

# Database & Storage
MONGO_URI=mongodb://your_mongo_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

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
npm test
```

---

## 📄 License

This project is proprietary and built for Hornet Clan management.
