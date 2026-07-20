const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const settings = require("../config/settings");

module.exports = async (
    guild,
    member,
    region,
    testerRoleId,
    ign,
    gameId
) => {

    const channel = guild.channels.cache.get(settings.channels.tryout);

    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("<a:Medal:1528675928438476840> FATE Clan Tryouts")
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
                value: "<a:WA_orange_dot:1528677818324619385> Pending",
                inline: false
            }
        );

    const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId(`tryout_pass_${member.id}`)
            .setLabel("Pass")
            .setEmoji("<:Correct:1528079418424033331>")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`tryout_fail_${member.id}`)
            .setLabel("Fail")
            .setEmoji("<:Cross99:1528675926555234447>")
            .setStyle(ButtonStyle.Danger)

    );

    await channel.send({

        content: `${member} <@&${testerRoleId}>`,

        embeds: [embed],

        components: [row]

    });

};