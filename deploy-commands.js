const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const commands = [];

// Read all command folders
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);

    // Skip if it's not a folder
    if (!fs.statSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ("data" in command && "execute" in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`⚠️ ${file} is missing "data" or "execute".`);
        }
    }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Registering ${commands.length} slash command(s)...`);

       const guilds = [

    process.env.TEST_GUILD_ID,

    process.env.MAIN_GUILD_ID

];

for (const guildId of guilds) {

    console.log(`📦 Registering commands for ${guildId}...`);

    await rest.put(

        Routes.applicationGuildCommands(

            process.env.CLIENT_ID,

            guildId

        ),

        {

            body: commands

        }

    );

    console.log(`✅ Registered in ${guildId}`);

}

console.log("🎉 All guild commands registered.");
    } catch (error) {
        console.error(error);
    }
})();