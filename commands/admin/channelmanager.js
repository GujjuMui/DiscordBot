const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    ChannelType,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType
} = require("discord.js");
const config = require("../../config/config");

function isOwner(userId) {
    const ownerId = config.botOwnerId;
    return ownerId && userId === ownerId;
}

function handleApiError(error, interaction) {
    console.error("========== CHANNEL MANAGER ERROR ==========");
    console.error(error);
    console.error("===========================================");

    const code = error.code;
    let message = "❌ An error occurred while executing channel manager.";

    if (code === 50013) {
        message = "❌ Missing Permissions: I do not have permission to manage channels in that server.";
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
        .setName("channelmanager")
        .setDescription("Bot owner cross-guild channel management suite (with bulk add & delete)")
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
        if (!config.features.channelManager) {
            return interaction.reply({
                content: "❌ Channel Manager module is currently disabled by bot configuration.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (!isOwner(interaction.user.id)) {
            return interaction.reply({
                content: "❌ You don't have permission to use this command (Bot Owner Only).",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const guilds = Array.from(interaction.client.guilds.cache.values());
            const manageableGuilds = [];

            for (const g of guilds) {
                const me = await g.members.fetch(interaction.client.user.id).catch(() => null);
                if (me && me.permissions.has("ManageChannels")) {
                    manageableGuilds.push(g);
                }
            }

            if (manageableGuilds.length === 0) {
                return interaction.editReply({ content: "❌ No manageable guilds found where the bot has 'Manage Channels' permission." });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("cm_guild_select")
                .setPlaceholder("Select a server to manage channels")
                .addOptions(
                    manageableGuilds.slice(0, 25).map(g => ({
                        label: g.name.substring(0, 100),
                        description: `ID: ${g.id} | Members: ${g.memberCount}`,
                        value: g.id
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await interaction.editReply({
                content: "📂 **Cross-Guild Channel Manager**\nSelect a target server below:",
                components: [row]
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id && i.customId === "cm_guild_select",
                time: 60000
            });

            collector.on("collect", async i => {
                try {
                    await i.deferUpdate();
                    const guildId = i.values[0];
                    const guild = interaction.client.guilds.cache.get(guildId);

                    if (!guild) {
                        return i.editReply({ content: "❌ Guild not found.", components: [] });
                    }

                    const channels = await guild.channels.fetch();
                    const textChannels = channels.filter(c => c && c.type === ChannelType.GuildText);

                    const actionSelect = new StringSelectMenuBuilder()
                        .setCustomId(`cm_action_${guildId}`)
                        .setPlaceholder("Choose channel management action")
                        .addOptions([
                            { label: "List Channels", description: "View text channels in this server", value: "list" },
                            { label: "Create Single Channel", description: "Create a new text channel", value: "create" },
                            { label: "Bulk Add Channels", description: "Create multiple channels at once (comma-separated)", value: "bulk_create" },
                            { label: "Delete Single Channel", description: "Delete an existing text channel", value: "delete" },
                            { label: "Bulk Delete Channels", description: "Delete multiple text channels at once", value: "bulk_delete" }
                        ]);

                    const actRow = new ActionRowBuilder().addComponents(actionSelect);

                    const actMsg = await i.editReply({
                        content: `Selected Server: **${guild.name}**\nWhat would you like to do?`,
                        components: [actRow]
                    });

                    const actCollector = actMsg.createMessageComponentCollector({
                        filter: ci => ci.user.id === interaction.user.id && ci.customId.startsWith("cm_action_"),
                        time: 60000
                    });

                    actCollector.on("collect", async ci => {
                        try {
                            const action = ci.values[0];
                            if (action === "list") {
                                await ci.deferUpdate();
                                const listStr = textChannels.map(c => `- **${c.name}** (\`${c.id}\`)`).slice(0, 30).join("\n") || "No text channels found.";
                                await ci.editReply({
                                    content: `📋 **Channels in ${guild.name}** (showing up to 30):\n${listStr}`,
                                    components: []
                                });
                            } else if (action === "create") {
                                const modal = new ModalBuilder()
                                    .setCustomId(`cm_create_modal_${guildId}`)
                                    .setTitle(`Create Channel in ${guild.name.substring(0, 20)}`);

                                const nameInput = new TextInputBuilder()
                                    .setCustomId("channel_name")
                                    .setLabel("Channel Name")
                                    .setPlaceholder("e.g. announcements")
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true);

                                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                                await ci.showModal(modal);

                                const submitted = await ci.awaitModalSubmit({
                                    filter: ms => ms.user.id === interaction.user.id && ms.customId === `cm_create_modal_${guildId}`,
                                    time: 60000
                                }).catch(() => null);

                                if (submitted) {
                                    await submitted.deferUpdate();
                                    const channelName = submitted.fields.getTextInputValue("channel_name");
                                    const newChannel = await guild.channels.create({
                                        name: channelName,
                                        type: ChannelType.GuildText,
                                        reason: `Requested by bot owner ${interaction.user.tag}`
                                    });

                                    await submitted.editReply({
                                        content: `✅ Successfully created channel **#${newChannel.name}** (\`${newChannel.id}\`) in **${guild.name}**.`,
                                        components: []
                                    });
                                }
                            } else if (action === "bulk_create") {
                                const modal = new ModalBuilder()
                                    .setCustomId(`cm_bulk_create_modal_${guildId}`)
                                    .setTitle(`Bulk Add Channels`);

                                const namesInput = new TextInputBuilder()
                                    .setCustomId("channel_names")
                                    .setLabel("Channel Names (Comma Separated)")
                                    .setPlaceholder("general, chat, bots, announcements")
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setRequired(true);

                                modal.addComponents(new ActionRowBuilder().addComponents(namesInput));
                                await ci.showModal(modal);

                                const submitted = await ci.awaitModalSubmit({
                                    filter: ms => ms.user.id === interaction.user.id && ms.customId === `cm_bulk_create_modal_${guildId}`,
                                    time: 60000
                                }).catch(() => null);

                                if (submitted) {
                                    await submitted.deferUpdate();
                                    const rawInput = submitted.fields.getTextInputValue("channel_names");
                                    const names = rawInput.split(",").map(n => n.trim()).filter(Boolean);

                                    if (names.length === 0) {
                                        return submitted.editReply({ content: "❌ No valid channel names provided.", components: [] });
                                    }

                                    let createdCount = 0;
                                    const createdNames = [];

                                    for (const name of names.slice(0, 10)) {
                                        try {
                                            const ch = await guild.channels.create({
                                                name,
                                                type: ChannelType.GuildText,
                                                reason: `Bulk created by bot owner ${interaction.user.tag}`
                                            });
                                            createdCount++;
                                            createdNames.push(`#${ch.name}`);
                                        } catch {}
                                    }

                                    await submitted.editReply({
                                        content: `✅ Successfully bulk created **${createdCount}** channel(s): ${createdNames.join(", ")} in **${guild.name}**.`,
                                        components: []
                                    });
                                }
                            } else if (action === "delete") {
                                await ci.deferUpdate();
                                const arrChannels = Array.from(textChannels.values()).slice(0, 25);
                                if (arrChannels.length === 0) {
                                    return ci.editReply({ content: "❌ No text channels available to delete.", components: [] });
                                }

                                const delSelect = new StringSelectMenuBuilder()
                                    .setCustomId(`cm_delete_select_${guildId}`)
                                    .setPlaceholder("Select channel to delete")
                                    .addOptions(
                                        arrChannels.map(c => ({
                                            label: `#${c.name}`.substring(0, 100),
                                            description: `ID: ${c.id}`,
                                            value: c.id
                                        }))
                                    );

                                const delRow = new ActionRowBuilder().addComponents(delSelect);
                                const delMsg = await ci.editReply({
                                    content: `Select a channel in **${guild.name}** to delete:`,
                                    components: [delRow]
                                });

                                const delCollector = delMsg.createMessageComponentCollector({
                                    filter: di => di.user.id === interaction.user.id && di.customId === `cm_delete_select_${guildId}`,
                                    time: 60000
                                });

                                delCollector.on("collect", async di => {
                                    try {
                                        await di.deferUpdate();
                                        const chId = di.values[0];
                                        const targetCh = guild.channels.cache.get(chId);
                                        if (!targetCh) {
                                            return di.editReply({ content: "❌ Channel not found.", components: [] });
                                        }
                                        const chName = targetCh.name;
                                        await targetCh.delete(`Requested by bot owner ${interaction.user.tag}`);
                                        await di.editReply({
                                            content: `✅ Successfully deleted channel **#${chName}** (\`${chId}\`) from **${guild.name}**.`,
                                            components: []
                                        });
                                    } catch (err) {
                                        handleApiError(err, interaction);
                                    }
                                });
                            } else if (action === "bulk_delete") {
                                await ci.deferUpdate();
                                const arrChannels = Array.from(textChannels.values()).slice(0, 25);
                                if (arrChannels.length === 0) {
                                    return ci.editReply({ content: "❌ No text channels available to delete.", components: [] });
                                }

                                const bulkDelSelect = new StringSelectMenuBuilder()
                                    .setCustomId(`cm_bulk_delete_select_${guildId}`)
                                    .setPlaceholder("Select channels to bulk delete (up to 25)")
                                    .setMinValues(1)
                                    .setMaxValues(Math.min(arrChannels.length, 25))
                                    .addOptions(
                                        arrChannels.map(c => ({
                                            label: `#${c.name}`.substring(0, 100),
                                            description: `ID: ${c.id}`,
                                            value: c.id
                                        }))
                                    );

                                const bRow = new ActionRowBuilder().addComponents(bulkDelSelect);
                                const bMsg = await ci.editReply({
                                    content: `Select one or more channels in **${guild.name}** to bulk delete:`,
                                    components: [bRow]
                                });

                                const bCollector = bMsg.createMessageComponentCollector({
                                    filter: bi => bi.user.id === interaction.user.id && bi.customId === `cm_bulk_delete_select_${guildId}`,
                                    time: 60000
                                });

                                bCollector.on("collect", async bi => {
                                    try {
                                        await bi.deferUpdate();
                                        const selectedIds = bi.values;
                                        let deletedCount = 0;
                                        const deletedNames = [];

                                        for (const id of selectedIds) {
                                            const targetCh = guild.channels.cache.get(id);
                                            if (targetCh) {
                                                const name = targetCh.name;
                                                await targetCh.delete(`Bulk deleted by bot owner ${interaction.user.tag}`);
                                                deletedCount++;
                                                deletedNames.push(`#${name}`);
                                            }
                                        }

                                        await bi.editReply({
                                            content: `✅ Successfully bulk deleted **${deletedCount}** channel(s): ${deletedNames.join(", ")} from **${guild.name}**.`,
                                            components: []
                                        });
                                    } catch (err) {
                                        handleApiError(err, interaction);
                                    }
                                });
                            }
                        } catch (err) {
                            handleApiError(err, interaction);
                        }
                    });
                } catch (err) {
                    handleApiError(err, interaction);
                }
            });
        } catch (error) {
            handleApiError(error, interaction);
        }
    }
};
