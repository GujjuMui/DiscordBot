const {
    SlashCommandBuilder,
    REST,
    Routes,
    MessageFlags
} = require("discord.js");
const fs = require("fs");
const path = require("path");

function isOwner(userId) {
    const ownerId = process.env.BOT_OWNER_ID;
    return ownerId && userId === ownerId;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sync")
        .setDescription("Sync slash commands globally (Bot Owner Only)"),

    async execute(interaction) {
        if (!isOwner(interaction.user.id)) {
            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const commands = [];
            const foldersPath = path.join(__dirname, "../../commands");
            const commandFolders = fs.readdirSync(foldersPath);

            for (const folder of commandFolders) {
                const commandsPath = path.join(foldersPath, folder);
                if (!fs.statSync(commandsPath).isDirectory()) continue;

                const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
                for (const file of commandFiles) {
                    const filePath = path.join(commandsPath, file);
                    const command = require(filePath);
                    if ("data" in command && "execute" in command) {
                        commands.push(command.data.toJSON());
                    }
                }
            }

            const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );

            await interaction.editReply({
                content: `✅ Successfully synced ${commands.length} global slash command(s) with Discord.`
            });
        } catch (error) {
            console.error("Failed to sync commands:", error);
            await interaction.editReply({
                content: `❌ Failed to sync commands: ${error.message}`
            });
        }
    }
};
