const {
    EmbedBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const settings = require("../config/settings");
const logger = require("../utils/logger");

module.exports = async interaction => {

    if (!interaction.isModalSubmit()) return false;

    if (interaction.customId !== "verification_modal") return false;

    const memberRole = interaction.guild.roles.cache.get(settings.roles.member);

    if (!memberRole) {

        await interaction.reply({

            content: settings.emojis.cross + " Member role not found.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    if (interaction.member.roles.cache.has(memberRole.id)) {

        await interaction.reply({

            content: settings.emojis.check + " You are already verified.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const name = interaction.fields.getTextInputValue("name");

    const source = interaction.fields.getTextInputValue("source");

    const interest = interaction.fields.getTextInputValue("interest");

    await interaction.member.roles.add(memberRole);

    const welcomeChannel = interaction.guild.channels.cache.get(settings.channels.welcome);

if (welcomeChannel) {

    const embed = new EmbedBuilder()

        .setColor("#ED4245")

        .setDescription(
`${settings.emojis.welcome} Welcome to **F A T E - SF**, ${interaction.user}!\nEnjoy your stay.`
        );

    const buttons = new ActionRowBuilder().addComponents(

        new ButtonBuilder()

            .setLabel("Server Map")

            .setEmoji(settings.emojis.map)

            .setStyle(ButtonStyle.Link)

            .setURL(`https://discord.com/channels/${interaction.guild.id}/${settings.channels.serverMap}`),

        new ButtonBuilder()

            .setLabel("Join Fate Clan")

            .setEmoji(settings.emojis.clan)

            .setStyle(ButtonStyle.Link)

            .setURL(`https://discord.com/channels/${interaction.guild.id}/${settings.channels.joinClan}`)

    );

    await welcomeChannel.send({

        embeds: [embed],

        components: [buttons]

    });

}

        const embed = new EmbedBuilder()

    .setColor("#2B2D31")

    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))

    .setDescription(
`${settings.emojis.welcome} Welcome to **F A T E - SF**, ${interaction.user}, enjoy your stay! ❤️`
    );
    await interaction.reply({

    embeds: [embed],

    flags: MessageFlags.Ephemeral

});

    const accountAgeDays = Math.floor(
    (Date.now() - interaction.user.createdTimestamp) /
    (1000 * 60 * 60 * 24)
    );

    const accountCreated = `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:F>`;

    await logger({

    guild: interaction.guild,

    user: interaction.user,

    type: "VERIFY",

    fields: [

        {

            name: "👤 User",

            value: `${interaction.user}`,

            inline: true

        },

        {

            name: "🆔 User ID",

            value: interaction.user.id,

            inline: true

        },

        {

            name: "📅 Discord Account Created",

            value: accountCreated,

            inline: true

        },

        {

            name: "⏳ Discord Account Age",

            value: `${accountAgeDays} days`,

            inline: true

        },

        {

            name: "👋 Joined Server",

            value: `<t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:F>`,

            inline: false

        },

        {

            name: "👤 Preferred Name",

            value: name,

            inline: true

        },

        {

            name: "🌍 Found Server",

            value: source,

            inline: true

        },

        {

            name: "🎮 Interested In",

            value: interest,

            inline: false

        }

    ]

});
    return true;

};