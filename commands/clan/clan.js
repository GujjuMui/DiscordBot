const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const settings = require("../../config/settings");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("clan")

        .setDescription("Clan join system")

        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription("Create the clan join panel")
        ),

    async execute(interaction) {

        const embed = new EmbedBuilder()

            .setColor("#ED4245")

            .setDescription(`
# <a:achievements:1528636144495890593> FATE CLAN

<a:info:1528638936082157589> How to join Fate clan?
To join Fate Clan you need reach some requirements which are mentioned in Clan Rules & Requirements channel.
Accept the clan rules.

<a:chat:1528637737501069325> Important - Once you complete reading the requirements and clan rules, you need to click the "Join" button below. When you click the Join you gain access to the tryouts chat.

<a:info:1528638936082157589> What are clan tryouts?
Basically clan tryouts are the process where we check the player is capable of joining the clan or not, you can play with our tryout tester to complete the tryouts.
`)

            .setImage("https://cdn.discordapp.com/attachments/1506280626607886346/1528640829327933501/image.png?ex=6a5f0936&is=6a5db7b6&hm=63cf842bc2d799c6bbc180d21b351f4afe8ac141fbf0b1de7eba395668f26fde&");

       const row = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
        .setCustomId("clan_join_as")
        .setLabel("Join AS")
        .setEmoji("<:hollow98:1528650507932139540>")
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("clan_join_eu")
        .setLabel("Join EU")
        .setEmoji("<:hollow98:1528650507932139540>")
        .setStyle(ButtonStyle.Secondary)

);

        const clanChannel = interaction.guild.channels.cache.get(
        settings.channels.howToJoin
        );

        if (!clanChannel) {

            return interaction.reply({

                content: settings.emojis.cross + " How-to-Join channel not found.",

                flags: MessageFlags.Ephemeral

            });

        }

        await clanChannel.send({

            embeds: [embed],

            components: [row]

        });

        await interaction.reply({

            content: settings.emojis.check + " Clan join panel created.",

            flags: MessageFlags.Ephemeral

        });

    }

};