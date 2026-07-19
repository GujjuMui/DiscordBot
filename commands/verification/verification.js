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

        .setName("verification")
        .setDescription("Verification system")

        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription("Create the verification panel")
        ),

    async execute(interaction) {

        const embed = new EmbedBuilder()

            .setColor("#5865F2")

            .setDescription(`
                    # <a:a_setting:1528308900208709682> Server Verification

                    Welcome to **F A T E - SF**!

                    Before starting verification, please make sure you meet the following requirements:

                    <a:anxiety2:1528307358705385472>  Your Discord account is phone verified.

                    <a:Rules:1528079131844018297>  Your Discord account is at least **30 days old**.

                    <a:Load:1528310853433299025>  You have been in this server for **more than 5 minutes**.

                    Click the **Verify** button below and answer a few short questions to gain access to the server.`);

        const row = new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId("verify")

                    .setLabel("Verify")

                    .setEmoji("<a:emote:1528308473920487524>")

                    .setStyle(ButtonStyle.Success)

            );

        const verificationChannel = interaction.guild.channels.cache.find(
    channel => channel.name === settings.channels.verification
);

if (!verificationChannel) {

    return interaction.reply({

        content: "❌ Verification channel not found.",

        flags: MessageFlags.Ephemeral

    });

}

await verificationChannel.send({

    embeds: [embed],

    components: [row]

});

        await interaction.reply({

            content: "✅ Verification panel created.",

            flags: MessageFlags.Ephemeral

        });

    }

};