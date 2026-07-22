const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const memberCooldown = require("../../services/memberCooldown");
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

module.exports = {

    data: new SlashCommandBuilder()

        .setName("member")

        .setDescription("Manage clan members")

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

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const hasPermission =
            member.roles.cache.has(settings.roles.tryoutTesterAS) ||
            member.roles.cache.has(settings.roles.tryoutTesterEU);

        if (!hasPermission) {

            return interaction.editReply({
                content: settings.emojis.cross + " You don't have permission to use this command."
            });

        }

        // Bot owner bypass
        if (interaction.user.id !== "1466871611893219455") {

        const cooldown = await memberCooldown(interaction.user.id);

        if (!cooldown.allowed) {

            return interaction.editReply({

                content: cooldown.message

            });

        }

    }

        const subcommand = interaction.options.getSubcommand();

        const target = interaction.options.getMember("user");

        const region =
            interaction.options.getString("region");

        if (!target) {

            return interaction.editReply({
                content: settings.emojis.cross + " Member not found."
            });

        }

        if (target.user.bot) {

            return interaction.editReply({
                content: settings.emojis.cross + " Bots cannot be clan members."
            });

        }

        const regionData = regions[region];

        // ======================================
        // ADD
        // ======================================

        if (subcommand === "add") {

            if (
                target.roles.cache.has(regions.AS.clanRole) ||
                target.roles.cache.has(regions.EU.clanRole)
            ) {

                return interaction.editReply({
                    content: settings.emojis.cross + " This user is already a clan member."
                });

            }

            await target.roles.remove([
                regions.AS.pendingRole,
                regions.EU.pendingRole
            ]).catch(() => {});

            await target.roles.add(regionData.clanRole);

            const embed = new EmbedBuilder()

                .setColor("#2ecc71")

                .setTitle(settings.emojis.check + " Member Added")

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
                        value: interaction.user.toString()
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
                        value: `${target.user.tag} (${target.id})`
                    },

                    {
                        name: "Region",
                        value: regionData.name
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

            if (!target.roles.cache.has(regionData.clanRole)) {

                return interaction.editReply({
                    content: `${settings.emojis.cross} User is not in ${regionData.name}.`
                });

            }

            await target.roles.remove(regionData.clanRole);

            const embed = new EmbedBuilder()

                .setColor("#e74c3c")

                .setTitle("🗑️ Member Removed")

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
                        name: "Removed By",
                        value: interaction.user.toString()
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
                        value: `${target.user.tag} (${target.id})`
                    },

                    {
                        name: "Region",
                        value: regionData.name
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
                target.roles.cache.has(regions.AS.clanRole);

            const inEU =
                target.roles.cache.has(regions.EU.clanRole);

            if (!inAS && !inEU) {

                return interaction.editReply({

                    content:
                        settings.emojis.cross + " This user isn't a clan member."

                });

            }

            if (inAS && inEU) {

                return interaction.editReply({

                    content:
                        settings.emojis.cross + " This user has both clan roles. Resolve it manually."

                });

            }

            const currentRegion =
                inAS ? "AS" : "EU";

            if (currentRegion === region) {

                return interaction.editReply({

                    content:
                        settings.emojis.cross + " User is already in that region."

                });

            }

            const oldRegion =
                regions[currentRegion];

            await target.roles.remove(
                oldRegion.clanRole
            );

            await target.roles.add(
                regionData.clanRole
            );

            const embed = new EmbedBuilder()

                .setColor("#3498db")

                .setTitle("🔄 Member Transferred")

                .addFields(

                    {
                        name: "Member",
                        value: target.toString(),
                        inline: true
                    },

                    {
                        name: "From",
                        value: oldRegion.name,
                        inline: true
                    },

                    {
                        name: "To",
                        value: regionData.name,
                        inline: true
                    },

                    {
                        name: "Transferred By",
                        value: interaction.user.toString()
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
                        value: `${target.user.tag} (${target.id})`
                    },

                    {
                        name: "From",
                        value: oldRegion.name
                    },

                    {
                        name: "To",
                        value: regionData.name
                    }

                ]

            });

            return interaction.editReply({

                embeds: [embed]

            });

        }

    }

};