const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType
} = require("discord.js");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("editsay")
        .setDescription("Edit a previously sent message by the bot")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .addStringOption(opt => opt.setName("message_id").setDescription("ID of the bot message to edit").setRequired(true))
        .addStringOption(opt => opt.setName("new_content").setDescription("New message content").setRequired(true)),

    async execute(interaction) {
        if (!config.botOwnerId || interaction.user.id !== config.botOwnerId) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: "❌ You must be an Administrator or Bot Owner to use this command.",
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const messageId = interaction.options.getString("message_id");
            const newContent = interaction.options.getString("new_content");

            const targetMsg = await interaction.channel.messages.fetch(messageId).catch(() => null);
            if (!targetMsg) {
                return interaction.editReply({ content: "❌ Message not found in this channel." });
            }

            if (targetMsg.author.id !== interaction.client.user.id) {
                return interaction.editReply({ content: "❌ I can only edit messages sent by myself." });
            }

            await targetMsg.edit(newContent);
            await interaction.editReply({ content: "✅ Message edited successfully." });
        } catch (error) {
            await interaction.editReply({ content: `❌ Failed to edit message: ${error.message}` });
        }
    }
};
