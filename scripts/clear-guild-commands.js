// One-off cleanup: remove leftover guild-scoped slash commands from one server.
//
// Why: commands are registered GLOBALLY by "npm run deploy". If a server
// still has old guild-scoped copies of the same commands (from an earlier
// deploy), Discord shows every command TWICE in that server. "npm run
// deploy" only clears guild copies for servers listed in ALLOWED_GUILD_IDS,
// so a server that isn't listed keeps its duplicates.
//
// Usage (from the bot folder, with .env in place):
//   node scripts/clear-guild-commands.js <SERVER_ID>
//
// Get the server ID in Discord: turn on Developer Mode
// (Settings -> Advanced -> Developer Mode), then right-click the server
// name -> Copy Server ID.
//
// After this, run "npm run deploy" so the global commands are registered
// once. Note: global commands can take up to an hour to refresh in
// Discord, so the duplicates may linger in the menu until then.

const { REST, Routes } = require("discord.js");
require("dotenv").config();

const guildId = process.argv[2];

if (!guildId || !/^\d+$/.test(guildId)) {
    console.error("Usage: node scripts/clear-guild-commands.js <SERVER_ID>");
    process.exit(1);
}

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
    console.error("TOKEN and CLIENT_ID must be set in .env");
    process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
            { body: [] }
        );
        console.log(`Cleared guild-scoped commands for server ${guildId}. Now run: npm run deploy`);
    } catch (err) {
        console.error("Failed to clear guild commands:", err.message);
        process.exit(1);
    }
})();
