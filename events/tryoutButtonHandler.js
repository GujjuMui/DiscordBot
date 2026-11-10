const {
    MessageFlags,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const settings = require("../config/settings");
const logger = require("../utils/logger");

module.exports = async interaction => {

    if (!interaction.isButton()) return false;

    if (
        !interaction.customId.startsWith("tryout_pass_") &&
        !interaction.customId.startsWith("tryout_fail_") &&
        !interaction.customId.startsWith("tryout_remove_")
    ) {
        return false;
    }

    // interaction.member is null in DMs / for uncached members.
    const memberRoles = interaction.member?.roles?.cache;
    const allowed = Boolean(
        memberRoles?.has(settings.roles.tryoutTesterAS) ||
        memberRoles?.has(settings.roles.tryoutTesterEU)
    );

    if (!allowed) {

        await interaction.reply({

            content: "❌" + " Only tryout testers can use these buttons.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const [, action, userId] = interaction.customId.split("_");

const member = await interaction.guild.members.fetch(userId).catch(() => null);

if (!member) {

    await interaction.reply({

        content: "❌" + " That user is no longer in the server.",

        flags: MessageFlags.Ephemeral

    });

    return true;

}

const hasPendingAS = member.roles.cache.has(settings.roles.pendingTryoutAS);
const hasPendingEU = member.roles.cache.has(settings.roles.pendingTryoutEU);

if (!hasPendingAS && !hasPendingEU) {

    await interaction.reply({

        content: "❌" + " This user is no longer in the tryout process.",

        flags: MessageFlags.Ephemeral

    });

    return true;

}

const pendingRole = hasPendingAS
    ? settings.roles.pendingTryoutAS
    : settings.roles.pendingTryoutEU;

// The remove branch was missing entirely: the customId prefix
// tryout_remove_ was claimed above, but no branch handled it, so
// the handler fell through and did nothing. Remove the pending
// role and confirm ephemerally, like the pass/fail branches.
if (action === "remove") {
    await member.roles.remove(pendingRole);

    await interaction.reply({
        content: `✅ ${member} has been removed from the tryout process.`,
        flags: MessageFlags.Ephemeral
    });

    return true;
}

    // Guard the original message: its embed/components may be gone
    // (message deleted, or a partial message).
    const sourceEmbed = interaction.message?.embeds?.[0];
    const sourceButtons = interaction.message?.components?.[0]?.components ?? [];

    if (!sourceEmbed) {
        await interaction.reply({
            content: "❌ The tryout post could not be found.",
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    const embed = EmbedBuilder.from(sourceEmbed);

const disabledRow = new ActionRowBuilder().addComponents(
    ...sourceButtons.map(button => ButtonBuilder.from(button).setDisabled(true))
);

if (action === "pass") {

    await member.roles.remove(pendingRole);

    const clanMemberRoleId =
        pendingRole === settings.roles.pendingTryoutAS
            ? settings.roles.clanMemberAS
            : settings.roles.clanMemberEU;

    await member.roles.add(clanMemberRoleId);

    embed.spliceFields(4, 1, {
        name: "Status",
        value: "🟢 Passed",
        inline: false
    });

    embed.addFields({
        name: "Handled By",
        value: `${interaction.member}`,
        inline: true
    });

    await interaction.update({

        embeds: [embed],

        components: [disabledRow]

    });

    await logger({

        guild: interaction.guild,

        type: "TRYOUT_PASS",

        user: interaction.user,

        fields: [

            {
                name: "Applicant",
                value: `${member.user.tag}`,
                inline: true
            },

            {
                name: "Region",
                value: pendingRole === settings.roles.pendingTryoutAS ? "AS" : "EU",
                inline: true
            }

        ]

    });

    return true;

}

if (action === "fail") {

    await member.roles.remove(pendingRole);

    embed.spliceFields(4, 1, {
        name: "Status",
        value: "🔴 Failed",
        inline: false
    });

    embed.addFields({
        name: "Handled By",
        value: `${interaction.member}`,
        inline: true
    });

    await interaction.update({

        embeds: [embed],

        components: [disabledRow]

    });

    await logger({

    guild: interaction.guild,

    type: "TRYOUT_FAIL",

    user: interaction.user,

    fields: [

        {
            name: "Applicant",
            value: `${member.user.tag}`,
            inline: true
        },

        {
            name: "Region",
            value: pendingRole === settings.roles.pendingTryoutAS ? "AS" : "EU",
            inline: true
        }

    ]

});

    return true;

}}

module.exports.customIdPrefixes = ["tryout_pass_", "tryout_fail_", "tryout_remove_"];
