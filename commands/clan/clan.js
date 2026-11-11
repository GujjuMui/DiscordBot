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
const { getSettings } = require("../../config/configLoader");
const {
    resolveChannel,
    SetupPermissionError
} = require("../../services/guildSetup");

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

        // Clan branding (embed image) is a Discord CDN URL the user
        // uploaded — it cannot be created. A missing one simply
        // skips the image; the panel still posts.
        const guildSettings = await getSettings(interaction.guild?.id).catch(() => settings);
        const clanImage = guildSettings?.clan?.embedImage || settings.clan.embedImage;

        const embed = new EmbedBuilder()

            .setColor("#ED4245")

            .setDescription(`
# 🏆 FATE CLAN

ℹ️ How to join Fate clan?
To join Fate Clan you need reach some requirements which are mentioned in Clan Rules & Requirements channel.
Accept the clan rules.

💬 Important - Once you complete reading the requirements and clan rules, you need to click the "Join" button below. When you click the Join you gain access to the tryouts chat.

ℹ️ What are clan tryouts?
Basically clan tryouts are the process where we check the player is capable of joining the clan or not, you can play with our tryout tester to complete the tryouts.
`);

        if (clanImage) {
            embed.setImage(clanImage);
        }

       const row = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
        .setCustomId("clan_join_as")
        .setLabel("Join AS")
        .setEmoji("🤝")
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("clan_join_eu")
        .setLabel("Join EU")
        .setEmoji("🤝")
        .setStyle(ButtonStyle.Secondary)

);

        // The how-to-join channel is resolved (stored ID, then
        // canonical name, then created under the HORNET category)
        // instead of erroring when it is not configured yet.
        let clanChannel;
        try {
            ({ channel: clanChannel } = await resolveChannel(
                interaction.guild, "howToJoin"
            ));
        } catch (err) {
            if (err instanceof SetupPermissionError) {
                return interaction.reply({
                    content: err.message,
                    flags: MessageFlags.Ephemeral
                });
            }
            throw err;
        }

        await clanChannel.send({

            embeds: [embed],

            components: [row]

        });

        await interaction.reply({

            content: "✅" + " Clan join panel created.",

            flags: MessageFlags.Ephemeral

        });

    }

};
