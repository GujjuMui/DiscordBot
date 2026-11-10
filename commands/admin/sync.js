const {
    SlashCommandBuilder,
    REST,
    Routes,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType
} = require("discord.js");
const path = require("path");
const config = require("../../config/config");
const { loadCommands } = require("../../utils/loadCommands");

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
            }).catch(() => {});
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const commandMap = loadCommands(path.join(__dirname, "../../commands"), config);

            const commands = Array.from(commandMap.values()).map(command => command.data.toJSON());
            const rest = new REST({ version: "10" }).setToken(config.token);

            // Clear guild-specific commands first to remove duplicates
            const guildId = interaction.guildId;
            if (guildId) {
                try {
                    await rest.put(
                        Routes.applicationGuildCommands(config.clientId, guildId),
                        { body: [] }
                    );
                } catch (_) {}
            }

            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands }
            );

            await interaction.editReply({
                content: `✅ Successfully synced **${commands.length}** global slash command(s) with Discord.`
            });
        } catch (error) {
            console.error("Failed to sync commands:", error);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({
                        content: `❌ Failed to sync commands: ${error.message}`
                    });
                } else {
                    await interaction.reply({
                        content: `❌ Failed to sync commands: ${error.message}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (err) {
                console.error("Failed to send error reply:", err);
            }
        }
    }
};
