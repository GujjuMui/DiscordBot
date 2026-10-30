const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const config = require("./config/config");

const commandMap = new Map();

// Read all command folders with duplicate prevention & feature flags
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.statSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ("data" in command && "execute" in command) {
            const cmdName = command.data.name;

            if (!config.features.channelManager && cmdName === "channelmanager") continue;
            if (!config.features.broadcast && cmdName === "broadcast") continue;

            if (commandMap.has(cmdName)) {
                console.log(`⚠️ Duplicate command name "${cmdName}" found in ${file}. Skipping.`);
                continue;
            }

            commandMap.set(cmdName, command.data.toJSON());
        } else {
            console.log(`⚠️ ${file} is missing "data" or "execute".`);
        }
    }
}

const commands = Array.from(commandMap.values());
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        // Step 1: Clear guild-specific commands from all allowed guilds to remove duplicates
        const allowedGuilds = (process.env.ALLOWED_GUILD_IDS || "")
            .split(",")
            .map(id => id.trim())
            .filter(Boolean);

        for (const guildId of allowedGuilds) {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
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
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log("🎉 All global slash commands registered successfully.");
    } catch (error) {
        console.error("❌ Failed to register commands:", error);
    }
})();
