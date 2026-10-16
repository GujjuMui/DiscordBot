const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType
} = require("discord.js");

// Helper to check bot owner
function isOwner(userId) {
    const ownerId = process.env.BOT_OWNER_ID;
    return ownerId && userId === ownerId;
}

// Error handler helper
function handleApiError(error, interaction) {
    console.error("========== OWNER COMMAND ERROR ==========");
    console.error(error);
    console.error("=========================================");

    const code = error.code;
    let message = "❌ An error occurred while executing this command.";

    if (code === 50007) {
        message = "❌ Cannot send messages to this user (DMs closed).";
    } else if (code === 403) {
        message = "❌ Forbidden: Missing permissions to perform this action.";
    } else if (code === 404) {
        message = "❌ Not Found: The requested resource could not be found.";
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
        .setName("botadmin")
        .setDescription("Bot owner management commands")
        // Enable command in Guilds, Bot DMs, and Private Channels
        .setContexts(
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        )
        // Enable user install and guild install
        .setIntegrationTypes(
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        )
        .addSubcommand(sub =>
            sub
                .setName("guildlist")
                .setDescription("List all guilds the bot is in with authorization status and invites")
        )
        .addSubcommand(sub =>
            sub
                .setName("leaveguild")
                .setDescription("Leave a guild")
                .addStringOption(opt =>
                    opt
                        .setName("guild_id")
                        .setDescription("ID of the guild to leave directly")
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        // Owner check
        if (!isOwner(interaction.user.id)) {
            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "guildlist") {
            try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const guilds = interaction.client.guilds.cache;
                const allowedIds = (process.env.ALLOWED_GUILD_IDS || "").split(",").map(id => id.trim()).filter(Boolean);

                let reportLines = [];
                for (const [guildId, guild] of guilds) {
                    const isAuth = allowedIds.includes(guildId);
                    const statusIcon = isAuth ? "✅" : "⚠️";

                    let inviteLink = "N/A";
                    try {
                        const channels = await guild.channels.fetch();
                        const textChannel = channels.find(c => c && c.isTextBased() && c.permissionsFor(guild.members.me)?.has("CreateInstantInvite"));

                        if (textChannel) {
                            const invite = await textChannel.createInvite({
                                maxAge: 3600, // 1 hour
                                maxUses: 1,
                                reason: "Owner guildlist request"
                            });
                            inviteLink = invite.url;
                        }
                    } catch (err) {
                        // Ignore invite generation errors if lacking permissions
                    }

                    reportLines.push(`**${guild.name}** (${guildId})\n- Members: ${guild.memberCount}\n- Status: ${statusIcon}\n- Invite: ${inviteLink}\n`);
                }

                // Chunk into < 1900 chars
                let currentChunk = "📋 **Bot Guild List**\n\n";
                const chunks = [];

                for (const line of reportLines) {
                    if ((currentChunk + line).length > 1900) {
                        chunks.push(currentChunk);
                        currentChunk = line;
                    } else {
                        currentChunk += line;
                    }
                }
                if (currentChunk) {
                    chunks.push(currentChunk);
                }

                // Send DMs to author
                const dmChannel = await interaction.user.createDM();
                for (const chunk of chunks) {
                    await dmChannel.send({ content: chunk });
                }

                await interaction.editReply({ content: "✅ Guild list sent to your DMs." });
            } catch (error) {
                handleApiError(error, interaction);
            }
        } else if (subcommand === "leaveguild") {
            try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const targetGuildId = interaction.options.getString("guild_id");

                if (targetGuildId) {
                    const guild = interaction.client.guilds.cache.get(targetGuildId);
                    if (!guild) {
                        return interaction.editReply({ content: `❌ Bot is not in guild ID: ${targetGuildId}` });
                    }
                    const name = guild.name;
                    await guild.leave();
                    return interaction.editReply({ content: `✅ Successfully left guild **${name}** (${targetGuildId}).` });
                }

                // No guild_id provided: show SelectMenu dropdown of all guilds (max 25)
                const guilds = Array.from(interaction.client.guilds.cache.values()).slice(0, 25);
                if (guilds.length === 0) {
                    return interaction.editReply({ content: "❌ Bot is not in any guilds." });
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId("leaveguild_select")
                    .setPlaceholder("Select a guild to leave")
                    .addOptions(
                        guilds.map(g => ({
                            label: g.name.substring(0, 100),
                            description: `ID: ${g.id} | Members: ${g.memberCount}`,
                            value: g.id
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const response = await interaction.editReply({
                    content: "Please select the guild you wish to leave:",
                    components: [row]
                });

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id && i.customId === "leaveguild_select",
                    time: 60000
                });

                collector.on("collect", async i => {
                    try {
                        await i.deferUpdate();
                        const selectedGuildId = i.values[0];
                        const guild = interaction.client.guilds.cache.get(selectedGuildId);

                        if (!guild) {
                            return i.editReply({ content: `❌ Guild not found.`, components: [] });
                        }

                        const confirmButton = new ButtonBuilder()
                            .setCustomId("leaveguild_confirm")
                            .setLabel("Yes, leave")
                            .setStyle(ButtonStyle.Danger);

                        const cancelButtongit  = new ButtonBuilder()
                            .setCustomId("leaveguild_cancel")
                            .setLabel("Cancel")
                            .setStyle(ButtonStyle.Secondary);

                        const btnRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                        const confirmMsg = await i.editReply({
                            content: `⚠️ Are you sure you want to leave **${guild.name}** (ID: \`${guild.id}\`, Members: \`${guild.memberCount}\`)?`,
                            components: [btnRow]
                        });

                        const confirmCollector = confirmMsg.createMessageComponentCollector({
                            filter: ci => ci.user.id === interaction.user.id,
                            time: 60000
                        });

                        confirmCollector.on("collect", async ci => {
                            try {
                                await ci.deferUpdate();
                                if (ci.customId === "leaveguild_confirm") {
                                    const gName = guild.name;
                                    await guild.leave();
                                    await ci.editReply({
                                        content: `✅ Successfully left guild **${gName}** (\`${selectedGuildId}\`).`,
                                        components: []
                                    });
                                } else {
                                    await ci.editReply({
                                        content: `❌ Action cancelled.`,
                                        components: []
                                    });
                                }
                            } catch (err) {
                                handleApiError(err, interaction);
                            }
                        });

                        confirmCollector.on("end", async collected => {
                            if (collected.size === 0) {
                                try {
                                    await i.editReply({ components: [] }).catch(() => {});
                                } catch {}
                            }
                        });
                    } catch (err) {
                        handleApiError(err, interaction);
                    }
                });

                collector.on("end", async collected => {
                    if (collected.size === 0) {
                        try {
                            await interaction.editReply({ components: [] }).catch(() => {});
                        } catch {}
                    }
                });
            } catch (error) {
                handleApiError(error, interaction);
            }
        }
    }
};
