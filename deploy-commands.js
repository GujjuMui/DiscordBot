const { REST, Routes } = require("discord.js");
const path = require("path");
require("dotenv").config();
const config = require("./config/config");
const { loadCommands } = require("./utils/loadCommands");

// Shared command scan (duplicate guard + feature-flag filtering).
const commandMap = loadCommands(path.join(__dirname, "commands"), config);
const commands = Array.from(commandMap.values()).map(command => command.data.toJSON());

const rest = new REST({ version: "10" }).setToken(config.token);

(async () => {
    try {
        // Step 1: Clear guild-specific commands from all allowed guilds to remove duplicates
        for (const guildId of config.allowedGuildIds) {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(config.clientId, guildId),
                    { body: [] }
                );
                console.log(`🧹 Cleared guild commands for ${guildId}`);
            } catch (err) {
                console.warn(`⚠️ Could not clear guild ${guildId}: ${err.message}`);
            }
        }

        // Step 2: Register all commands globally
        console.log(`Registering ${commands.length} unique slash command(s) globally...`);

        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );

        console.log("🎉 All global slash commands registered successfully.");
    } catch (error) {
        console.error("❌ Failed to register commands:", error);
    }
})();
