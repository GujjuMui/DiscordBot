const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const { COLORS } = require("../../config/constants");
const {
    CATEGORY_NAME,
    CHANNEL_NAMES,
    ROLE_DEFS,
    ROLE_GROUPS,
    MANAGE_CHANNELS_MESSAGE,
    MANAGE_ROLES_MESSAGE,
    ensureCategory,
    resolveChannel,
    resolveRole,
    resolveGroupedRole
} = require("../../services/guildSetup");

const logger = require("../../utils/logger");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("setup")

        .setDescription("Setup HORNET channels")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        await interaction.deferReply({
           flags: MessageFlags.Ephemeral
        });

        const guild = interaction.guild;

        // Pre-check: creating channels/categories needs ManageChannels.
        // Fail with a clear message instead of a Discord 50013 halfway
        // through creating the channel set.
        const botMember = guild.members.me;
        if (!botMember?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.editReply({
                content: MANAGE_CHANNELS_MESSAGE
            });
        }

        const created = [];
        const existing = [];
        const failed = [];

        // -----------------------------
        // Category
        // -----------------------------

        let category = guild.channels.cache.find(

            c =>
                c.type === ChannelType.GuildCategory &&
                c.name === CATEGORY_NAME

        );

        if (!category) {

            category = await ensureCategory(guild);

            created.push("📁 HORNET Category");

        } else {

            existing.push("📁 HORNET Category");

        }

        // -----------------------------
        // Channels
        // -----------------------------
        // Every channel the bot needs, resolved through the shared
        // resolver: a stored ID or a channel with the canonical name
        // is reused (and remembered), otherwise it is created under
        // the HORNET category. Existing channels found outside the
        // category are re-parented under it, as before.

        for (const key of Object.keys(CHANNEL_NAMES)) {
            const name = CHANNEL_NAMES[key];
            try {
                const { channel, created: wasCreated } =
                    await resolveChannel(guild, key);
                if (wasCreated) {
                    created.push(`#${name}`);
                } else {
                    if (channel.parentId !== category.id
                        && typeof channel.setParent === "function") {
                        await channel.setParent(category.id).catch(() => {});
                    }
                    existing.push(`#${name}`);
                }
            } catch (err) {
                failed.push(`#${name} — ${err.message}`);
            }
        }

        // -----------------------------
        // Roles
        // -----------------------------
        // Same treatment as the channels: a stored ID or a role with
        // the canonical name is reused, otherwise it is created.
        // Nothing here is configured by hand any more.

        const canManageRoles =
            botMember?.permissions?.has(PermissionFlagsBits.ManageRoles);

        if (!canManageRoles) {
            failed.push(`roles — ${MANAGE_ROLES_MESSAGE}`);
        } else {
            const roleJobs = Object.keys(ROLE_DEFS).map(key => ({
                label: ROLE_DEFS[key].name,
                run: () => resolveRole(guild, key)
            }));
            for (const group of Object.keys(ROLE_GROUPS)) {
                for (const sub of Object.keys(ROLE_GROUPS[group])) {
                    roleJobs.push({
                        label: ROLE_GROUPS[group][sub].name,
                        run: () => resolveGroupedRole(guild, group, sub)
                    });
                }
            }
            for (const { label, run } of roleJobs) {
                try {
                    const { created: wasCreated } = await run();
                    if (wasCreated) created.push(`@${label}`);
                    else existing.push(`@${label}`);
                } catch (err) {
                    failed.push(`@${label} — ${err.message}`);
                }
            }
        }

        // -----------------------------
        // Result
        // -----------------------------

        const embed = new EmbedBuilder()

            .setColor(COLORS.PRIMARY)

            .setTitle("✅" + " HORNET Setup Complete")

            .addFields(

                {

                    name: "🆕 Created",

                    value: created.length

                        ? created.join("\n")

                        : "Nothing"

                },

                {

                    name: "✔️ Already Existed",

                    value: existing.length

                        ? existing.join("\n")

                        : "None"

                }

            );

        if (failed.length) {
            embed.addFields({
                name: "⚠️ Not Created",
                value: failed.join("\n")
            });
        }

        embed

            .setFooter({

                text: "HORNET Setup"

            })

            .setTimestamp();

    await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "SETUP",

    user: interaction.user

});

        await interaction.editReply({

            embeds: [embed]

        });

    }

};
