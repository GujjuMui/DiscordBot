const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const Art = require("../../database/Art");

const { generateArtId } = require("../../utils/idGenerator");

const settings = require("../../config/settings");

const saveImage = require("../../utils/saveImage");

const logger = require("../../utils/logger");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("saveart")
        .setDescription("Upload SFA Artwork")

        .addAttachmentOption(option =>
            option
                .setName("image")
                .setDescription("Artwork image")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Artwork name")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("category")
                .setDescription("Example: Lynx, Marcus, Tournament, Official")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("tags")
                .setDescription("Separate tags with commas")
                .setRequired(false)
        ),

    async execute(interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const image = interaction.options.getAttachment("image");
        const name = interaction.options.getString("name");
        const category =
            interaction.options.getString("category");
        const tagString =
            interaction.options.getString("tags") || "";

        const tags = tagString
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean);

        const artId = await generateArtId();

        const imageFile = await saveImage(
            image,
            "arts",
            artId
        );

        const art = new Art({

            artId,
            artName: name,
            category,
            tags,

            imageFile,

            uploader: interaction.user.username,
            uploaderId: interaction.user.id

        });

        await art.save();

        const channel = interaction.guild.channels.cache.find(
            c => c.name === settings.channels.arts
        );

        if (!channel) {

            return interaction.editReply(
                "❌ #sfa-arts channel not found."
            );

        }

        const embed = new EmbedBuilder()

            .setColor("#8e44ad")

            .setTitle(`🎨 ${art.artName}`)

            .setDescription(`**Category:** ${art.category}`)

            .addFields(

                {
                    name: "🆔 Art ID",
                    value: art.artId,
                    inline: true
                },

                {
                    name: "🏷️ Tags",
                    value: tags.length
                        ? tags.join(", ")
                        : "None",
                    inline: true
                },

                {
                    name: "👤 Uploaded By",
                    value: interaction.user.toString()
                }

            )

            .setImage(image.url)

            .setTimestamp();

        const message = await channel.send({
            embeds: [embed]
        });

        art.discordMessageId = message.id;
        art.messageUrl = message.url;

        await art.save();

        await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "ART_CREATE",

    user: interaction.user,

    id: art.artId,

    title: art.artName

});

        await interaction.editReply(
            `✅ Artwork saved!\n\nArt ID: **${art.artId}**`
        );

    }

};