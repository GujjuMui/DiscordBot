const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    InteractionContextType,
    ApplicationIntegrationType
} = require("discord.js");
const config = require("../../config/config");

function isOwner(userId) {
    const ownerId = config.botOwnerId;
    return ownerId && userId === ownerId;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("broadcast")
        .setDescription("Broadcast an announcement embed to up to 10 channels simultaneously")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .addStringOption(opt => opt.setName("message").setDescription("Announcement message content").setRequired(true))
        .addChannelOption(opt => opt.setName("channel1").setDescription("Target channel 1").setRequired(true))
        .addChannelOption(opt => opt.setName("channel2").setDescription("Target channel 2").setRequired(false))
        .addChannelOption(opt => opt.setName("channel3").setDescription("Target channel 3").setRequired(false))
        .addChannelOption(opt => opt.setName("channel4").setDescription("Target channel 4").setRequired(false))
        .addChannelOption(opt => opt.setName("channel5").setDescription("Target channel 5").setRequired(false))
        .addStringOption(opt => opt.setName("image_url").setDescription("Optional image or GIF URL").setRequired(false))
        .addRoleOption(opt => opt.setName("ping_role").setDescription("Optional role to ping").setRequired(false)),

    async execute(interaction) {
        if (!config.features.broadcast) {
            return interaction.reply({
                content: "❌ Broadcast module is currently disabled by bot configuration.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (!isOwner(interaction.user.id) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ You must be an Administrator or Bot Owner to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const messageText = interaction.options.getString("message");
            const imageUrl = interaction.options.getString("image_url");
            const pingRole = interaction.options.getRole("ping_role");

            const channels = [];
            for (let i = 1; i <= 5; i++) {
                const ch = interaction.options.getChannel(`channel${i}`);
                if (ch && ch.isTextBased()) {
                    channels.push(ch);
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("📢 Announcement")
                .setDescription(messageText)
                .setFooter({ text: `Broadcasted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if (imageUrl) {
                embed.setImage(imageUrl);
            }

            let successCount = 0;
            let failCount = 0;

            const pingContent = pingRole ? `<@&${pingRole.id}>` : null;

            for (const ch of channels) {
                try {
                    await ch.send({
                        content: pingContent,
                        embeds: [embed]
                    });
                    successCount++;
                } catch (err) {
                    failCount++;
                }
            }

            await interaction.editReply({
                content: `✅ Broadcast complete!\n- Successfully sent to **${successCount}** channel(s).\n${failCount > 0 ? `- Failed in ${failCount} channel(s) due to missing permissions.` : ""}`
            });
        } catch (error) {
            console.error("Broadcast error:", error);
            await interaction.editReply({ content: `❌ Failed to broadcast: ${error.message}` });
        }
    }
};
