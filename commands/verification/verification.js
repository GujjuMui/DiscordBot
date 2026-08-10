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
                    # ⚙️ Server Verification

                    Welcome to **F A T E - SF**!

                    Before starting verification, please make sure you meet the following requirements:

                    📱  Your Discord account is phone verified.

                    📜  Your Discord account is at least **30 days old**.

                    ⏳  You have been in this server for **more than 5 minutes**.

                    Click the **Verify** button below and answer a few short questions to gain access to the server.`);

        const row = new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId("verify")

                    .setLabel("Verify")

                    .setEmoji("✅")

                    .setStyle(ButtonStyle.Success)

            );

        const verificationChannel = interaction.guild.channels.cache.find(
    channel => channel.name === settings.channels.verification
);

if (!verificationChannel) {

    return interaction.reply({

        content: "❌" + " Verification channel not found.",

        flags: MessageFlags.Ephemeral

    });

}

await verificationChannel.send({

    embeds: [embed],

    components: [row]

});

        await interaction.reply({

            content: "✅" + " Verification panel created.",

            flags: MessageFlags.Ephemeral

        });

    }

};