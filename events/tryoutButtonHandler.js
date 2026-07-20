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

    const allowed =
        interaction.member.roles.cache.has(settings.roles.tryoutTesterAS) ||
        interaction.member.roles.cache.has(settings.roles.tryoutTesterEU);

    if (!allowed) {

        await interaction.reply({

            content: "❌ Only tryout testers can use these buttons.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const [, action, userId] = interaction.customId.split("_");

const member = await interaction.guild.members.fetch(userId).catch(() => null);

if (!member) {

    await interaction.reply({

        content: "❌ That user is no longer in the server.",

        flags: MessageFlags.Ephemeral

    });

    return true;

}

const hasPendingAS = member.roles.cache.has(settings.roles.pendingTryoutAS);
const hasPendingEU = member.roles.cache.has(settings.roles.pendingTryoutEU);

if (!hasPendingAS && !hasPendingEU) {

    await interaction.reply({

        content: "❌ This user is no longer in the tryout process.",

        flags: MessageFlags.Ephemeral

    });

    return true;

}

const pendingRole = hasPendingAS
    ? settings.roles.pendingTryoutAS
    : settings.roles.pendingTryoutEU;

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

const disabledRow = new ActionRowBuilder().addComponents(

    ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true),

    ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true)

);

if (action === "pass") {

    await member.roles.remove(pendingRole);
    await member.roles.add(settings.roles.clanMember);

    embed.spliceFields(1, 1, {
        name: "Status",
        value: "🟢 Passed",
        inline: true
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
            }

        ]

    });

    return true;

}

if (action === "fail") {

    await member.roles.remove(pendingRole);

    embed.spliceFields(1, 1, {
        name: "Status",
        value: "🔴 Failed",
        inline: true
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
            }

        ]

    });

    return true;

}}