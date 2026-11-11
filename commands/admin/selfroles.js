const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType
} = require("discord.js");

const owner = require("../../config/owner");

const SelfRoleMessageRepository = require("../../repositories/SelfRoleMessageRepository");

const {
    resolveSelfRolesChannel,
    rememberPickedChannel,
    ensureSelfRoleGroups,
    getSelfRoleGroupIds,
    getSelfRoleBanners,
    SetupPermissionError
} = require("../../services/guildSetup");

const buildSelfRolePanel =
    require("../../utils/selfRoleComponents");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("selfroles")

        .setDescription("Manage the self role panel")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addSubcommand(subcommand =>

            subcommand

                .setName("setup")

                .setDescription(
                    "Create the self role panel"
                )

                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel to post the self role panel in (created automatically if not given)")
                        .addChannelTypes(ChannelType.GuildText)
                )

        )

        .addSubcommand(subcommand =>

            subcommand

                .setName("refresh")

                .setDescription(
                    "Refresh the existing self role panel"
                )

        ),

    async execute(interaction) {

        if (
            interaction.user.id !==
            owner.ownerId
        ) {

            return interaction.reply({

                content:
                    "❌ Only the bot owner can use this command.",

                flags:
                    MessageFlags.Ephemeral

            });

        }

        await interaction.deferReply({

            flags:
                MessageFlags.Ephemeral

        });

        const subcommand =
            interaction.options.getSubcommand();

        // =========================
        // SETUP
        // =========================

        if (subcommand === "setup") {

            // Picked channel wins; otherwise the channel is resolved
            // (stored ID, then canonical name, then created under the
            // HORNET category — the same auto-create /verification
            // got in v1.5).
            let channel;
            const pickedChannel =
                interaction.options.getChannel("channel");
            try {
                if (pickedChannel) {
                    channel = pickedChannel;
                    await rememberPickedChannel(
                        interaction.guild, "selfRoles", pickedChannel
                    );
                } else {
                    ({ channel } = await resolveSelfRolesChannel(
                        interaction.guild
                    ));
                }
            } catch (err) {
                if (err instanceof SetupPermissionError) {
                    return interaction.editReply({
                        content: err.message
                    });
                }
                throw err;
            }

            // Make sure every colour / faction / ping role exists
            // first — created under their canonical names when a
            // fresh server has none yet — so the panel is never
            // posted with empty select menus.
            let groups;
            try {
                groups = await ensureSelfRoleGroups(interaction.guild);
            } catch (err) {
                if (err instanceof SetupPermissionError) {
                    return interaction.editReply({
                        content: err.message
                    });
                }
                throw err;
            }

            const groupIds = {
                color: Object.fromEntries(
                    Object.entries(groups.color).map(([k, r]) => [k, r.id])
                ),
                faction: Object.fromEntries(
                    Object.entries(groups.faction).map(([k, r]) => [k, r.id])
                ),
                ping: Object.fromEntries(
                    Object.entries(groups.ping).map(([k, r]) => [k, r.id])
                )
            };

            if (
                !Object.values(groupIds.color).length
                && !Object.values(groupIds.faction).length
                && !Object.values(groupIds.ping).length
            ) {
                return interaction.editReply({
                    content:
                        "❌ No self roles are configured yet — run /setup first."
                });
            }

            const banners =
                await getSelfRoleBanners(interaction.guild);

            const payload =
                buildSelfRolePanel(
                    interaction.guild,
                    { groups: groupIds, banners }
                );

            const message =
                await channel.send({

                    ...payload,

                    flags:
                        MessageFlags.IsComponentsV2

                });

            await SelfRoleMessageRepository.findOneAndUpdate(

                {
                    guildId:
                        interaction.guild.id
                },

                {
                    guildId:
                        interaction.guild.id,

                    channelId:
                        channel.id,

                    messageId:
                        message.id
                },

                {
                    upsert: true
                }

            );

            return interaction.editReply({

                content:
                    "✅ Self role panel created."

            });

        }

        // =========================
        // REFRESH
        // =========================

        const saved =
            await SelfRoleMessageRepository.findOne({

                guildId:
                    interaction.guild.id

            });

        if (!saved) {

            return interaction.editReply({

                content:
                    "❌ No self role panel has been created."

            });

        }

        // The saved channel first; the resolved self-roles channel
        // if the saved one is gone.
        let channel =
            await interaction.guild.channels.fetch(saved.channelId)
                .catch(() => null);
        if (!channel) {
            try {
                ({ channel } = await resolveSelfRolesChannel(
                    interaction.guild
                ));
            } catch (err) {
                if (err instanceof SetupPermissionError) {
                    return interaction.editReply({
                        content: err.message
                    });
                }
                throw err;
            }
        }

        const groupIds = await getSelfRoleGroupIds(interaction.guild);
        const banners = await getSelfRoleBanners(interaction.guild);

        const payload =
            buildSelfRolePanel(
                interaction.guild,
                { groups: groupIds, banners }
            );

        try {

            const message =
                await channel.messages.fetch(
                    saved.messageId
                );

            await message.edit({

                ...payload,

                flags:
                    MessageFlags.IsComponentsV2

            });

            return interaction.editReply({

                content:
                    "✅ Self role panel refreshed."

            });

        } catch (error) {

            console.error(
                "Refresh failed:",
                error
            );

            return interaction.editReply({

                content:
                    "❌ Couldn't find the saved self role panel."

            });

        }

    }

};
