const {
    SlashCommandBuilder,
    REST,
    Routes,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../config/config");

function isOwner(userId) {
    const ownerId = config.botOwnerId;
    return ownerId && userId === ownerId;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sync")
        .setDescription("Sync all global slash commands instantly with Discord (Bot Owner Only)")
        .setContexts(
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        )
        .setIntegrationTypes(
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        ),

    async execute(interaction) {
        if (!isOwner(interaction.user.id)) {
            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const commandMap = new Map();
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
                        const cmdName = command.data.name;

                        // Check feature flags
                        if (!config.features.moderation && ["mod", "bulkban"].includes(cmdName)) continue;
                        if (!config.features.channelManager && ["channelmanager"].includes(cmdName)) continue;
                        if (!config.features.broadcast && ["broadcast"].includes(cmdName)) continue;

                        if (!commandMap.has(cmdName)) {
                            commandMap.set(cmdName, command.data.toJSON());
                        }
                    }
                }
            }

            const commands = Array.from(commandMap.values());
            const rest = new REST({ version: "10" }).setToken(config.token);

            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands }
            );

            await interaction.editReply({
                content: `✅ Successfully synced **${commands.length}** global slash command(s) with Discord.`
            });
        } catch (error) {
            console.error("Failed to sync commands:", error);
            await interaction.editReply({
                content: `❌ Failed to sync commands: ${error.message}`
            });
        }
    }
};
