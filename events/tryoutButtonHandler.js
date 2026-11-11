const {
    MessageFlags,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const logger = require("../utils/logger");
const { resolveRole, SetupPermissionError } = require("../services/guildSetup");

module.exports = async interaction => {

    if (!interaction.isButton()) return false;

    if (
        !interaction.customId.startsWith("tryout_pass_") &&
        !interaction.customId.startsWith("tryout_fail_") &&
        !interaction.customId.startsWith("tryout_remove_")
    ) {
        return false;
    }

    // Tester / pending / clan roles are resolved (stored ID, then
    // canonical name, then created) instead of erroring when they
    // are not configured yet.
    let R;
    try {
        const resolve = async key =>
            (await resolveRole(interaction.guild, key)).role.id;
        R = {
            tryoutTesterAS: await resolve("tryoutTesterAS"),
            tryoutTesterEU: await resolve("tryoutTesterEU"),
            pendingTryoutAS: await resolve("pendingTryoutAS"),
            pendingTryoutEU: await resolve("pendingTryoutEU"),
            clanMemberAS: await resolve("clanMemberAS"),
            clanMemberEU: await resolve("clanMemberEU")
        };
    } catch (err) {
        if (err instanceof SetupPermissionError) {
            await interaction.reply({
                content: err.message,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
        throw err;
    }

    // interaction.member is null in DMs / for uncached members.
    const memberRoles = interaction.member?.roles?.cache;
    const allowed = Boolean(
        memberRoles?.has(R.tryoutTesterAS) ||
        memberRoles?.has(R.tryoutTesterEU)
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

const hasPendingAS = member.roles.cache.has(R.pendingTryoutAS);
const hasPendingEU = member.roles.cache.has(R.pendingTryoutEU);

if (!hasPendingAS && !hasPendingEU) {

    await interaction.reply({

        content: "❌" + " This user is no longer in the tryout process.",

        flags: MessageFlags.Ephemeral

    });

    return true;

}

const pendingRole = hasPendingAS
    ? R.pendingTryoutAS
    : R.pendingTryoutEU;

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
        pendingRole === R.pendingTryoutAS
            ? R.clanMemberAS
            : R.clanMemberEU;

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
                value: pendingRole === R.pendingTryoutAS ? "AS" : "EU",
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
            value: pendingRole === R.pendingTryoutAS ? "AS" : "EU",
            inline: true
        }

    ]

});

    return true;

}}

module.exports.customIdPrefixes = ["tryout_pass_", "tryout_fail_", "tryout_remove_"];
