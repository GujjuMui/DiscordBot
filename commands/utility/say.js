const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const settings = require("../../config/settings");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("say")
        .setDescription("Send a message as HORNET")

        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Message to send")
                .setRequired(true)
        )

        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel to send to")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName("mode")
                .setDescription("Message type")
                .addChoices(
                    { name: "Normal", value: "normal" },
                    { name: "Embed", value: "embed" }
                )
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("Embed title")
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName("color")
                .setDescription("Embed color (#2ecc71)")
                .setRequired(false)
        ),

    async execute(interaction) {

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    if (interaction.user.id !== settings.ownerId) {

            return interaction.editReply({
                content: settings.emojis.cross + " Only the bot owner can use this command."
            });

        }

        const message = interaction.options.getString("message");
        const channel =
            interaction.options.getChannel("channel") ||
            interaction.channel;

        const mode =
            interaction.options.getString("mode") || "normal";

        if (mode === "normal") {

            await channel.send(message);

        } else {

            const embed = new EmbedBuilder()
                .setDescription(message);

            const title = interaction.options.getString("title");

            if (title)
                embed.setTitle(title);

            const color = interaction.options.getString("color");

            if (color)
                embed.setColor(color);
            else
                embed.setColor("#5865F2");

            await channel.send({
                embeds: [embed]
            });

        }

        await interaction.editReply({

            content: `${settings.emojis.check} Message sent to ${channel}.`

        });
    }

};