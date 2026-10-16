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
    return config.botOwnerId && userId === config.botOwnerId;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("checkperms")
        .setDescription("Check bot and user permissions in the current server")
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .addUserOption(opt => opt.setName("target").setDescription("Optional user to check permissions for").setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const targetUser = interaction.options.getUser("target") || interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) {
                return interaction.editReply({ content: "❌ Member not found in this guild." });
            }

            const me = await interaction.guild.members.fetch(interaction.client.user.id).catch(() => null);

            const isUserOwner = isOwner(targetUser.id);
            const isUserAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
            const isUserMod = member.permissions.has(PermissionFlagsBits.ModerateMembers) || isUserAdmin;

            const botHasAdmin = me ? me.permissions.has(PermissionFlagsBits.Administrator) : false;
            const botHasManageChannels = me ? me.permissions.has(PermissionFlagsBits.ManageChannels) : false;
            const botHasBan = me ? me.permissions.has(PermissionFlagsBits.BanMembers) : false;

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`🛡️ Permission Checker — ${targetUser.tag}`)
                .addFields(
                    { name: "User Status", value: `• Bot Owner: \`${isUserOwner ? "YES" : "NO"}\`\n• Administrator: \`${isUserAdmin ? "YES" : "NO"}\`\n• Moderator: \`${isUserMod ? "YES" : "NO"}\``, inline: false },
                    { name: "Bot Permissions in Server", value: `• Administrator: \`${botHasAdmin ? "✅ YES" : "❌ NO"}\`\n• Manage Channels: \`${botHasManageChannels ? "✅ YES" : "❌ NO"}\`\n• Ban Members: \`${botHasBan ? "✅ YES" : "❌ NO"}\``, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Checkperms error:", error);
            await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
        }
    }
};
