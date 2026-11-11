const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType
} = require("discord.js");

const owner = require("../../config/owner");
const settings = require("../../config/settings");

const SelfRoleMessageRepository = require("../../repositories/SelfRoleMessageRepository");

const {
    resolveSelfRolesChannel,
    rememberPickedChannel,
    ensureSelfRoleGroups,
    getSelfRoleGroupIds,
    getSelfRoleBanners,
    SetupPermissionError
} = require("../../services/guildSetup");

const {
    getCustomLists,
    getCustomList,
    addCustomEntry,
    removeCustomEntry,
    isHttpUrl
} = require("../../services/selfRoleCustom");

const { updateSetting } = require("../../config/configLoader");

const buildSelfRolePanel =
    require("../../utils/selfRoleComponents");

const BANNER_SECTIONS = {
    main: "Main",
    color: "Colour",
    faction: "Faction",
    ping: "Ping"
};

function listLines(entries, emptyText) {
    if (!entries.length) return emptyText;
    return entries
        .map(entry => `${entry.emoji || "•"} ${entry.name || entry.roleId}${entry.description ? ` — ${entry.description}` : ""} — image: ${entry.imageUrl || "none"}`)
        .join("\n");
}

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

        )

        // Faction roles are per-guild custom — the owner picks the
        // roles with these subcommands instead of the bot shipping
        // a fixed list. Re-adding a role updates its description,
        // emoji and image (an image given with the re-add replaces
        // the old one; re-adding without one keeps it).
        .addSubcommand(subcommand =>

            subcommand

                .setName("faction-add")

                .setDescription(
                    "Add a faction role to the self role panel"
                )

                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The faction role to add")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("description")
                        .setDescription("Description shown under the role (default: Join the <name> faction)")
                )

                .addStringOption(option =>
                    option
                        .setName("emoji")
                        .setDescription("Emoji shown next to the role (default: ⚔️)")
                )

                .addStringOption(option =>
                    option
                        .setName("image")
                        .setDescription("Image link shown in the faction section gallery (paste a full https:// link)")
                )

        )

        .addSubcommand(subcommand =>

            subcommand

                .setName("faction-remove")

                .setDescription(
                    "Remove a faction role from the self role panel"
                )

                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The faction role to remove")
                        .setRequired(true)
                )

        )

        .addSubcommand(subcommand =>

            subcommand

                .setName("faction-list")

                .setDescription(
                    "List the faction roles on the self role panel"
                )

        )

        .addSubcommand(subcommand =>

            subcommand

                .setName("ping-add")

                .setDescription(
                    "Add a ping role to the self role panel"
                )

                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The ping role to add")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("description")
                        .setDescription("Description shown under the role (default: Receive notifications)")
                )

                .addStringOption(option =>
                    option
                        .setName("emoji")
                        .setDescription("Emoji shown next to the role (default: 🔔)")
                )

                .addStringOption(option =>
                    option
                        .setName("image")
                        .setDescription("Image link shown in the ping section gallery (paste a full https:// link)")
                )

        )

        .addSubcommand(subcommand =>

            subcommand

                .setName("ping-remove")

                .setDescription(
                    "Remove a ping role from the self role panel"
                )

                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The ping role to remove")
                        .setRequired(true)
                )

        )

        .addSubcommand(subcommand =>

            subcommand

                .setName("ping-list")

                .setDescription(
                    "List the ping roles on the self role panel"
                )

        )

        // Banner art is an image the owner supplies — either by
        // uploading it (the attachment URL is saved) or by pasting
        // a link to it. No banner URL is ever written into code or
        // config by hand.
        .addSubcommand(subcommand =>

            subcommand

                .setName("banner-set")

                .setDescription(
                    "Set a banner image for one section of the self role panel"
                )

                .addStringOption(option =>
                    option
                        .setName("section")
                        .setDescription("Which section the banner belongs to")
                        .setRequired(true)
                        .addChoices(
                            { name: "Main", value: "main" },
                            { name: "Colour", value: "color" },
                            { name: "Faction", value: "faction" },
                            { name: "Ping", value: "ping" }
                        )
                )

                .addAttachmentOption(option =>
                    option
                        .setName("image")
                        .setDescription("Upload the banner image (used instead of the link if both are given)")
                )

                .addStringOption(option =>
                    option
                        .setName("link")
                        .setDescription("Or paste a link to the banner image (a full https:// link)")
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
        // FACTION / PING LISTS
        // =========================
        // Custom per-guild lists, stored in BotSettings. Adding the
        // same role again updates its description and emoji.

        if (subcommand === "faction-add" || subcommand === "ping-add") {
            const isFaction = subcommand === "faction-add";
            const role = interaction.options.getRole("role");
            const description = interaction.options.getString("description");
            const emoji = interaction.options.getString("emoji");
            const image = interaction.options.getString("image");
            if (image && !isHttpUrl(image)) {
                return interaction.editReply({
                    content: "❌ That image link isn't a valid image URL — paste a full link starting with http:// or https://."
                });
            }
            // Re-adding a role without an image keeps the image it
            // already had — only a new image replaces it.
            let imageUrl = image || "";
            if (!image) {
                const existing = (await getCustomList(
                    interaction.guild,
                    isFaction ? "factions" : "pings"
                )).find(e => e.roleId === role.id);
                imageUrl = existing?.imageUrl || "";
            }
            await addCustomEntry(
                interaction.guild,
                isFaction ? "factions" : "pings",
                {
                    roleId: role.id,
                    name: role.name,
                    description: description
                        || (isFaction
                            ? `Join the ${role.name} faction`
                            : "Receive notifications"),
                    emoji: emoji || (isFaction ? "⚔️" : "🔔"),
                    imageUrl
                }
            );
            return interaction.editReply({
                content: `✅ Added ${role} to the ${isFaction ? "faction" : "ping"} roles. Run /selfroles refresh to show it on the panel.`
            });
        }

        if (subcommand === "faction-remove" || subcommand === "ping-remove") {
            const isFaction = subcommand === "faction-remove";
            const role = interaction.options.getRole("role");
            const removed = await removeCustomEntry(
                interaction.guild,
                isFaction ? "factions" : "pings",
                role.id
            );
            return interaction.editReply({
                content: removed
                    ? `✅ Removed ${role} from the ${isFaction ? "faction" : "ping"} roles. Run /selfroles refresh to update the panel.`
                    : `❌ ${role} isn't in the ${isFaction ? "faction" : "ping"} roles.`
            });
        }

        if (subcommand === "faction-list" || subcommand === "ping-list") {
            const isFaction = subcommand === "faction-list";
            const { factions, pings } = await getCustomLists(interaction.guild);
            const entries = isFaction ? factions : pings;
            return interaction.editReply({
                content: isFaction
                    ? `**Faction roles**\n${listLines(entries, "No faction roles set yet — use /selfroles faction-add to add one.")}`
                    : `**Ping roles**\n${listLines(entries, "No ping roles set yet — use /selfroles ping-add to add one.")}`
            });
        }

        // =========================
        // BANNER
        // =========================

        if (subcommand === "banner-set") {
            const section = interaction.options.getString("section");
            const image = interaction.options.getAttachment("image");
            const link = interaction.options.getString("link");
            // Exactly one source must be given. When both are given
            // the uploaded image wins and the reply says so.
            let url;
            let fromLink = false;
            let ignoredLink = false;
            if (image) {
                if (!image.contentType?.startsWith("image/")) {
                    return interaction.editReply({
                        content: "❌ That file isn't an image — attach a PNG, JPG or GIF."
                    });
                }
                url = image.url;
                if (link) ignoredLink = true;
            } else if (link) {
                if (!isHttpUrl(link)) {
                    return interaction.editReply({
                        content: "❌ That link isn't a valid image URL — paste a full link starting with http:// or https://."
                    });
                }
                url = link;
                fromLink = true;
            } else {
                return interaction.editReply({
                    content: "❌ Give either an image attachment or a link."
                });
            }
            await updateSetting(interaction.guild.id, "banners", section, url);
            settings.selfRoles.banners[section] = url;
            return interaction.editReply({
                content: `✅ ${BANNER_SECTIONS[section]} banner set${fromLink ? " from the link" : ""}${ignoredLink ? " — used the attached image, the link was ignored" : ""}. Run /selfroles refresh to show it on the panel.`
            });
        }

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

            // Make sure every colour role exists first — created
            // under their canonical names when a fresh server has
            // none yet. Faction / ping roles are per-guild custom
            // lists and are never created here (see getCustomLists
            // below — a guild that already had them configured gets
            // them seeded once from its existing setup).
            let groups;
            let custom;
            try {
                groups = await ensureSelfRoleGroups(interaction.guild);
                custom = await getCustomLists(interaction.guild);
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
                )
            };

            if (
                !Object.values(groupIds.color).length
                && !custom.factions.length
                && !custom.pings.length
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
                    { groups: groupIds, custom, banners }
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
        const custom = await getCustomLists(interaction.guild);
        const banners = await getSelfRoleBanners(interaction.guild);

        const payload =
            buildSelfRolePanel(
                interaction.guild,
                { groups: { color: groupIds.color }, custom, banners }
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
