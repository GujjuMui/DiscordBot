const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType
} = require("discord.js");
const config = require("../../config/config");

function handleApiError(error, interaction) {
    console.error("========== MODERATION ERROR ==========");
    console.error(error);
    console.error("======================================");

    const code = error.code;
    let message = "❌ An error occurred while executing this moderation command.";

    if (code === 50013) {
        message = "❌ Missing Permissions: I do not have sufficient permissions or role hierarchy to perform this action.";
    } else if (code === 10007) {
        message = "❌ Target member not found in this guild.";
    }

    try {
        if (interaction.deferred || interaction.replied) {
            interaction.editReply({ content: message, components: [] }).catch(() => {});
        } else {
            interaction.reply({ content: message, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    } catch {}
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mod")
        .setDescription("Moderation suite commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .addSubcommand(sub =>
            sub
                .setName("ban")
                .setDescription("Ban a member from the server")
                .addUserOption(opt => opt.setName("target").setDescription("Member to ban").setRequired(true))
                .addStringOption(opt => opt.setName("reason").setDescription("Reason for ban").setRequired(false))
                .addIntegerOption(opt => opt.setName("days").setDescription("Days of message history to delete (0-7)").setMinValue(0).setMaxValue(7).setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName("kick")
                .setDescription("Kick a member from the server")
                .addUserOption(opt => opt.setName("target").setDescription("Member to kick").setRequired(true))
                .addStringOption(opt => opt.setName("reason").setDescription("Reason for kick").setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName("timeout")
                .setDescription("Timeout a member")
                .addUserOption(opt => opt.setName("target").setDescription("Member to timeout").setRequired(true))
                .addIntegerOption(opt => opt.setName("duration").setDescription("Duration in minutes (1 to 40320)").setMinValue(1).setMaxValue(40320).setRequired(true))
                .addStringOption(opt => opt.setName("reason").setDescription("Reason for timeout").setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName("untimeout")
                .setDescription("Remove timeout from a member")
                .addUserOption(opt => opt.setName("target").setDescription("Member to untimeout").setRequired(true))
                .addStringOption(opt => opt.setName("reason").setDescription("Reason").setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName("purge")
                .setDescription("Bulk delete messages")
                .addIntegerOption(opt => opt.setName("count").setDescription("Number of messages to delete (1-100)").setMinValue(1).setMaxValue(100).setRequired(true))
                .addUserOption(opt => opt.setName("target").setDescription("Optional: only delete messages from this user").setRequired(false))
        ),

    async execute(interaction) {
        if (!config.features.moderation) {
            return interaction.reply({
                content: "❌ Moderation module is currently disabled by bot configuration.",
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === "ban") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const targetUser = interaction.options.getUser("target");
                const reason = interaction.options.getString("reason") || "No reason provided";
                const days = interaction.options.getInteger("days") || 0;

                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (member) {
                    if (!member.bannable) {
                        return interaction.editReply({ content: "❌ I cannot ban this user due to role hierarchy constraints." });
                    }
                    if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                        return interaction.editReply({ content: "❌ You cannot ban someone with an equal or higher role than yours." });
                    }
                }

                await interaction.guild.members.ban(targetUser.id, { deleteMessageSeconds: days * 86400, reason });

                const embed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle("🔨 Member Banned")
                    .addFields(
                        { name: "User", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                        { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
                        { name: "Reason", value: reason, inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === "kick") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const targetUser = interaction.options.getUser("target");
                const reason = interaction.options.getString("reason") || "No reason provided";

                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (!member) {
                    return interaction.editReply({ content: "❌ Member not found in this guild." });
                }
                if (!member.kickable) {
                    return interaction.editReply({ content: "❌ I cannot kick this user due to role hierarchy constraints." });
                }
                if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                    return interaction.editReply({ content: "❌ You cannot kick someone with an equal or higher role than yours." });
                }

                await member.kick(reason);

                const embed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle("👢 Member Kicked")
                    .addFields(
                        { name: "User", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                        { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
                        { name: "Reason", value: reason, inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === "timeout") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const targetUser = interaction.options.getUser("target");
                const durationMinutes = interaction.options.getInteger("duration");
                const reason = interaction.options.getString("reason") || "No reason provided";

                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (!member) {
                    return interaction.editReply({ content: "❌ Member not found in this guild." } );
                }
                if (!member.moderatable) {
                    return interaction.editReply({ content: "❌ I cannot timeout this user due to role hierarchy constraints." });
                }

                const durationMs = durationMinutes * 60 * 1000;
                await member.timeout(durationMs, reason);

                const embed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle("⏱️ Member Timed Out")
                    .addFields(
                        { name: "User", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                        { name: "Duration", value: `${durationMinutes} minutes`, inline: true },
                        { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
                        { name: "Reason", value: reason, inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === "untimeout") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const targetUser = interaction.options.getUser("target");
                const reason = interaction.options.getString("reason") || "No reason provided";

                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (!member) {
                    return interaction.editReply({ content: "❌ Member not found in this guild." });
                }

                await member.timeout(null, reason);

                const embed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle("🔊 Timeout Removed")
                    .addFields(
                        { name: "User", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                        { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
                        { name: "Reason", value: reason, inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === "purge") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const count = interaction.options.getInteger("count");
                const targetUser = interaction.options.getUser("target");

                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                let filtered = Array.from(messages.values());

                if (targetUser) {
                    filtered = filtered.filter(m => m.author.id === targetUser.id);
                }

                filtered = filtered.slice(0, count);

                if (filtered.length === 0) {
                    return interaction.editReply({ content: "❌ No matching messages found to delete (messages older than 14 days cannot be bulk deleted)." });
                }

                const deleted = await interaction.channel.bulkDelete(filtered, true);

                const embed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle("🧹 Messages Purged")
                    .setDescription(`Successfully deleted **${deleted.size}** messages${targetUser ? ` from ${targetUser.tag}` : ""}.`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            handleApiError(error, interaction);
        }
    }
};
