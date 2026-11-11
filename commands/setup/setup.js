const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const { COLORS } = require("../../config/constants");
const {
    CATEGORY_NAMES,
    CHANNEL_NAMES,
    ROLE_DEFS,
    ROLE_GROUPS,
    MANAGE_CHANNELS_MESSAGE,
    MANAGE_ROLES_MESSAGE,
    ensureCategory,
    cleanupLegacyCategory,
    applyVisibility,
    resolveChannel,
    resolveRole,
    resolveGroupedRole
} = require("../../services/guildSetup");

// One representative channel key per category group, so /setup can
// make sure every category exists before building inside it.
const CATEGORY_KEYS = {
    gallery: "cards",
    verification: "verification",
    clan: "tryout",
    bot: "logs"
};

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
        // Categories
        // -----------------------------
        // One category per thing the bot manages — gallery, verification,
        // clan and bot — instead of a single HORNET category. Each is
        // created if it does not exist yet.

        for (const [group, name] of Object.entries(CATEGORY_NAMES)) {
            const key = CATEGORY_KEYS[group];
            const found = guild.channels.cache.find(
                c => c.type === ChannelType.GuildCategory && c.name === name
            );
            if (found) {
                existing.push(`📁 ${name}`);
                continue;
            }
            try {
                await ensureCategory(guild, key);
                created.push(`📁 ${name}`);
            } catch (err) {
                failed.push(`📁 ${name} — ${err.message}`);
            }
        }

        // -----------------------------
        // Channels
        // -----------------------------
        // Every channel the bot needs, resolved through the shared
        // resolver: a stored ID or a channel with the canonical name
        // is reused (and remembered), otherwise it is created under
        // its group category. Existing channels are re-parented into
        // their group category when they sit elsewhere (e.g. left
        // over from the old single HORNET category).
        //
        // The how-to-join channel is NOT built here — it is optional.
        // It is only used when it already exists (see /clan setup);
        // /setup never creates it.

        for (const key of Object.keys(CHANNEL_NAMES).filter(k => k !== "howToJoin")) {
            const name = CHANNEL_NAMES[key];
            try {
                const { channel, created: wasCreated } =
                    await resolveChannel(guild, key);
                if (wasCreated) {
                    created.push(`#${name}`);
                } else {
                    const category = await ensureCategory(guild, key);
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

        // The old single HORNET category, left over from before v1.8:
        // delete it only if it ended up empty after the moves above.
        // A category that still holds any channel is left alone.
        const legacyRemoved = await cleanupLegacyCategory(guild).catch(() => false);
        if (legacyRemoved) {
            created.push("🗑️ Old HORNET category removed (was empty)");
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
        // Visibility
        // -----------------------------
        // Unverified members (@everyone, no roles) see only the
        // VERIFICATION category; the Member role opens the other
        // managed categories, and the bot's own role is always
        // allowed. Runs on every /setup, including re-runs, so
        // existing categories get the overwrites too.
        try {
            await applyVisibility(guild);
        } catch (err) {
            failed.push(`visibility — ${err.message}`);
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
