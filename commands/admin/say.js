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
        .setName("say")
        .setDescription("Send a message as the bot in this channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .addStringOption(opt => opt.setName("message").setDescription("Message content").setRequired(true))
        .addAttachmentOption(opt => opt.setName("attachment").setDescription("Optional attachment").setRequired(false)),

    async execute(interaction) {
        if (!isOwner(interaction.user.id) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ You must be an Administrator or Bot Owner to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const message = interaction.options.getString("message");
            const attachment = interaction.options.getAttachment("attachment");

            const files = attachment ? [attachment.url] : [];
            await interaction.channel.send({ content: message, files });
            await interaction.editReply({ content: "✅ Message sent successfully." });
        } catch (error) {
            await interaction.editReply({ content: `❌ Failed to send message: ${error.message}` });
        }
    }
};

function isOwner(userId) {
    return config.botOwnerId && userId === config.botOwnerId;
}
