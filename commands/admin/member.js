const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const memberCooldown = require("../../services/memberCooldown");
const owner = require("../../config/owner");
const settings = require("../../config/settings");
const logger = require("../../utils/logger");

const regions = {

    AS: {
        clanRole: settings.roles.clanMemberAS,
        pendingRole: settings.roles.pendingTryoutAS,
        name: "FATE AS"
    },

    EU: {
        clanRole: settings.roles.clanMemberEU,
        pendingRole: settings.roles.pendingTryoutEU,
        name: "FATE EU"
    }

};

// True only if the bot can manage the role (ManageRoles + hierarchy).
// Checked before any role add/remove so failures are a clear message
// instead of a Discord 50013 after a partial change.
function botCanManage(interaction, roleId) {
    const botMember = interaction.guild?.members?.me;
    const role = interaction.guild?.roles?.cache?.get(roleId);
    if (!botMember || !role) return false;
    if (!botMember.permissions?.has("ManageRoles")) return false;
    return role.position < botMember.roles.highest.position;
}

module.exports = {

    data: new SlashCommandBuilder()

        .setName("member")

        .setDescription("Manage clan members")

        // ======================================
        // ADD
        // ======================================

        .addSubcommand(subcommand =>
            subcommand

                .setName("add")

                .setDescription("Add a clan member")

                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("region")
                        .setDescription("Clan region")
                        .setRequired(true)

                        .addChoices(
                            {
                                name: "AS",
                                value: "AS"
                            },
                            {
                                name: "EU",
                                value: "EU"
                            }
                        )
                )
        )

        // ======================================
        // REMOVE
        // ======================================

        .addSubcommand(subcommand =>
            subcommand

                .setName("remove")

                .setDescription("Remove a clan member")

                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("region")
                        .setDescription("Region")
                        .setRequired(true)

                        .addChoices(
                            {
                                name: "AS",
                                value: "AS"
                            },
                            {
                                name: "EU",
                                value: "EU"
                            }
                        )
                )
        )

        // ======================================
        // TRANSFER
        // ======================================

        .addSubcommand(subcommand =>
            subcommand

                .setName("transfer")

                .setDescription("Transfer a member")

                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("region")
                        .setDescription("Destination Region")
                        .setRequired(true)

                        .addChoices(
                            {
                                name: "AS",
                                value: "AS"
                            },
                            {
                                name: "EU",
                                value: "EU"
                            }
                        )
                )
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // interaction.member is the caller — no fetch needed (and the
        // fetch could fail for a member the bot has not cached).
        const member = interaction.member;
        if (!member) {
            return interaction.editReply({
                content: "❌ Could not find your member profile in this server."
            });
        }

        const hasPermission =
            member.roles.cache.has(
                settings.roles.tryoutTesterAS
            ) ||
            member.roles.cache.has(
                settings.roles.tryoutTesterEU
            );

        if (!hasPermission) {

            return interaction.editReply({

                content:
                    "❌ You don't have permission to use this command."

            });

        }

        // Bot owner bypass
        if (
            interaction.user.id !==
            owner.ownerId
        ) {

            const cooldown =
                await memberCooldown(
                    interaction.user.id
                );

            if (!cooldown.allowed) {

                return interaction.editReply({

                    content:
                        cooldown.message

                });

            }

        }

        const subcommand =
            interaction.options.getSubcommand();

        const target =
            interaction.options.getMember("user");

        const region =
            interaction.options.getString("region");

        if (!target) {

            return interaction.editReply({

                content:
                    "❌ Member not found."

            });

        }

        if (target.user.bot) {

            return interaction.editReply({

                content:
                    "❌ Bots cannot be clan members."

            });

        }

        const regionData =
            regions[region];

        // ======================================
        // ADD
        // ======================================

        if (subcommand === "add") {

            if (
                target.roles.cache.has(
                    regions.AS.clanRole
                ) ||
                target.roles.cache.has(
                    regions.EU.clanRole
                )
            ) {

                return interaction.editReply({

                    content:
                        "❌ This user is already a clan member."

                });

            }

            if (!botCanManage(interaction, regionData.clanRole)) {
                return interaction.editReply({
                    content: "❌ I cannot assign that clan role — check my permissions and role position."
                });
            }

            try {
                await target.roles.remove([

                    regions.AS.pendingRole,
                    regions.EU.pendingRole

                ]).catch(() => {});

                await target.roles.add(
                    regionData.clanRole
                );
            } catch (err) {
                console.error("[member add] Failed to assign clan role:", err.message);
                return interaction.editReply({
                    content: "❌ I couldn't assign the clan role. Check my permissions and role position."
                });
            }

            const embed =
                new EmbedBuilder()

                    .setColor("#2ecc71")

                    .setTitle(
                        "✅ Member Added"
                    )

                    .addFields(

                        {
                            name: "Member",
                            value: target.toString(),
                            inline: true
                        },

                        {
                            name: "Region",
                            value: regionData.name,
                            inline: true
                        },

                        {
                            name: "Added By",
                            value:
                                interaction.user.toString()
                        }

                    )

                    .setTimestamp();

            await logger({

                guild: interaction.guild,

                type: "MEMBER_ADD",

                user: interaction.user,

                fields: [

                    {
                        name: "Member",
                        value:
                            `${target.user.tag} (${target.id})`
                    },

                    {
                        name: "Region",
                        value:
                            regionData.name
                    }

                ]

            });

            return interaction.editReply({

                embeds: [embed]

            });

        }

        // ======================================
        // REMOVE
        // ======================================

        if (subcommand === "remove") {

            if (
                !target.roles.cache.has(
                    regionData.clanRole
                )
            ) {

                return interaction.editReply({

                    content:
                        `❌ User is not in ${regionData.name}.`

                });

            }

            if (!botCanManage(interaction, regionData.clanRole)) {
                return interaction.editReply({
                    content: "❌ I cannot remove that clan role — check my permissions and role position."
                });
            }

            try {
                await target.roles.remove(
                    regionData.clanRole
                );
            } catch (err) {
                console.error("[member remove] Failed to remove clan role:", err.message);
                return interaction.editReply({
                    content: "❌ I couldn't remove the clan role. Check my permissions and role position."
                });
            }

            const embed =
                new EmbedBuilder()

                    .setColor("#e74c3c")

                    .setTitle(
                        "🗑️ Member Removed"
                    )

                    .addFields(

                        {
                            name: "Member",
                            value: target.toString(),
                            inline: true
                        },

                        {
                            name: "Region",
                            value:
                                regionData.name,
                            inline: true
                        },

                        {
                            name: "Removed By",
                            value:
                                interaction.user.toString()
                        }

                    )

                    .setTimestamp();

            await logger({

                guild: interaction.guild,

                type: "MEMBER_REMOVE",

                user: interaction.user,

                fields: [

                    {
                        name: "Member",
                        value:
                            `${target.user.tag} (${target.id})`
                    },

                    {
                        name: "Region",
                        value:
                            regionData.name
                    }

                ]

            });

            return interaction.editReply({

                embeds: [embed]

            });

        }

        // ======================================
        // TRANSFER
        // ======================================

        if (subcommand === "transfer") {

            const inAS =
                target.roles.cache.has(
                    regions.AS.clanRole
                );

            const inEU =
                target.roles.cache.has(
                    regions.EU.clanRole
                );

            if (!inAS && !inEU) {

                return interaction.editReply({

                    content:
                        "❌ This user isn't a clan member."

                });

            }

            if (inAS && inEU) {

                return interaction.editReply({

                    content:
                        "❌ This user has both clan roles. Resolve it manually."

                });

            }

            const currentRegion =
                inAS ? "AS" : "EU";

            if (currentRegion === region) {

                return interaction.editReply({

                    content:
                        "❌ User is already in that region."

                });

            }

            const oldRegion =
                regions[currentRegion];

            if (!botCanManage(interaction, regionData.clanRole) || !botCanManage(interaction, oldRegion.clanRole)) {
                return interaction.editReply({
                    content: "❌ I cannot transfer that member — check my permissions and role position."
                });
            }

            // roles.set() swaps both roles in one call where possible;
            // if the add fails after the remove, roll the old role back.
            try {
                const newRoles = target.roles.cache
                    .filter(role => role.id !== oldRegion.clanRole)
                    .map(role => role.id);
                newRoles.push(regionData.clanRole);
                await target.roles.set(newRoles);
            } catch (err) {
                console.error("[member transfer] roles.set failed, attempting rollback:", err.message);
                try {
                    await target.roles.add(oldRegion.clanRole);
                } catch (rollbackErr) {
                    console.error("[member transfer] Rollback failed:", rollbackErr.message);
                }
                return interaction.editReply({
                    content: "❌ I couldn't transfer that member. Check my permissions and role position."
                });
            }

            const embed =
                new EmbedBuilder()

                    .setColor("#3498db")

                    .setTitle(
                        "🔄 Member Transferred"
                    )

                    .addFields(

                        {
                            name: "Member",
                            value: target.toString(),
                            inline: true
                        },

                        {
                            name: "From",
                            value:
                                oldRegion.name,
                            inline: true
                        },

                        {
                            name: "To",
                            value:
                                regionData.name,
                            inline: true
                        },

                        {
                            name: "Transferred By",
                            value:
                                interaction.user.toString()
                        }

                    )

                    .setTimestamp();

            await logger({

                guild: interaction.guild,

                type: "MEMBER_TRANSFER",

                user: interaction.user,

                fields: [

                    {
                        name: "Member",
                        value:
                            `${target.user.tag} (${target.id})`
                    },

                    {
                        name: "From",
                        value:
                            oldRegion.name
                    },

                    {
                        name: "To",
                        value:
                            regionData.name
                    }

                ]

            });

            return interaction.editReply({

                embeds: [embed]

            });

        }

    }

};