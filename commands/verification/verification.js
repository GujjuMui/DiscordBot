const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} = require("discord.js");

const {
    resolveChannel,
    rememberPickedChannel,
    SetupPermissionError
} = require("../../services/guildSetup");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("verification")
        .setDescription("Verification system")

        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription("Create the verification panel")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel to post the verification panel in (created automatically if not given)")
                        .addChannelTypes(ChannelType.GuildText)
                )
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

        // Picked channel wins; otherwise the channel is resolved
        // (stored ID, then canonical name, then created under the
        // HORNET category — the v1.5 auto-create, now shared).
        let verificationChannel = interaction.options.getChannel("channel");
        if (verificationChannel) {
            await rememberPickedChannel(
                interaction.guild, "verification", verificationChannel
            );
        } else {
            try {
                ({ channel: verificationChannel } = await resolveChannel(
                    interaction.guild, "verification"
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
        }

// The original bot's verification flow also needs the onboarding
// channel: on member join, the welcome embed is posted there.
// Resolved the same way as the verification channel — stored ID,
// then canonical name, then created under HORNET. No hardcoded ID.
let onboardingChannel;
try {
    ({ channel: onboardingChannel } = await resolveChannel(
        interaction.guild, "onboarding"
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

await verificationChannel.send({

    embeds: [embed],

    components: [row]

});

        await interaction.reply({

            content: `✅ Verification panel created in ${verificationChannel}. Onboarding channel ${onboardingChannel} is ready.`,

            flags: MessageFlags.Ephemeral

        });

    }

};