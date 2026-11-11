const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { COLORS } = require("../config/constants");
const { resolveChannel } = require("../services/guildSetup");

module.exports = async (
    guild,
    member,
    region,
    testerRoleId,
    ign,
    gameId
) => {

    // The tryouts channel is resolved (stored ID, then canonical
    // name, then created under HORNET). A failure to resolve it
    // (e.g. no Manage Channels) keeps the old silent no-op: the
    // application itself already succeeded.
    let channel;
    try {
        ({ channel } = await resolveChannel(guild, "tryout"));
    } catch {
        return;
    }
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor(COLORS.BRAND)
        .setTitle("🏅 FATE Clan Tryouts")
        .setDescription(
`Submit a ranked gameplay video here
or play with one of our tryout testers.

Good luck!`
        )
        .addFields(
            {
                name: "Applicant",
                value: `${member}`,
                inline: true
            },
            {
                name: "Region",
                value: region,
                inline: true
            },
            {
                name: "In-Game Name",
                value: ign,
                inline: true
            },
            {
                name: "In-Game ID",
                value: gameId,
                inline: true
            },
            {
                name: "Status",
                value: "🟠 Pending",
                inline: false
            }
        );

    const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId(`tryout_pass_${member.id}`)
            .setLabel("Pass")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`tryout_fail_${member.id}`)
            .setLabel("Fail")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger)

    );

    await channel.send({

        content: `${member} <@&${testerRoleId}>`,

        embeds: [embed],

        components: [row]

    });

};