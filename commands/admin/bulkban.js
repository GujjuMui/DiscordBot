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
        .setName("bulkban")
        .setDescription("Bulk ban multiple members at once (Bot Owner / Admin)")
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .addStringOption(opt =>
            opt
                .setName("user_ids")
                .setDescription("Comma-separated list of User IDs to ban")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt
                .setName("reason")
                .setDescription("Reason for bulk ban")
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!isOwner(interaction.user.id) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ You must be an Administrator or Bot Owner to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const rawInput = interaction.options.getString("user_ids");
            const reason = interaction.options.getString("reason") || "Bulk ban executed by admin/owner";

            const userIds = rawInput
                .split(/[\s,]+/)
                .map(id => id.replace(/[<@!>]/g, "").trim())
                .filter(id => /^\d{17,20}$/.test(id));

            if (userIds.length === 0) {
                return interaction.editReply({ content: "❌ No valid User IDs provided. Please provide comma-separated user IDs." });
            }

            let successCount = 0;
            let failCount = 0;
            const bannedTags = [];

            for (const userId of userIds) {
                try {
                    if (userId === interaction.client.user.id || userId === interaction.user.id) {
                        failCount++;
                        continue;
                    }

                    await interaction.guild.members.ban(userId, { reason });
                    successCount++;
                    bannedTags.push(`\`${userId}\``);
                } catch (err) {
                    failCount++;
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("🔨 Bulk Ban Executed")
                .addFields(
                    { name: "Successful Bans", value: `${successCount} member(s)`, inline: true },
                    { name: "Failed / Skipped", value: `${failCount} member(s)`, inline: true },
                    { name: "Reason", value: reason, inline: false },
                    { name: "Banned IDs", value: bannedTags.slice(0, 20).join(", ") || "None", inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Bulkban error:", error);
            await interaction.editReply({ content: `❌ An error occurred during bulk ban: ${error.message}` });
        }
    }
};
