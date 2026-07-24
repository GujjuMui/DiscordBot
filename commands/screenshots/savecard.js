const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const { createCardEmbed } = require("../../utils/embedBuilder");

const Card = require("../../database/Card");

const { generateCardId } = require("../../utils/idGenerator");

const settings = require("../../config/settings");

const saveImage = require("../../utils/saveImage");

const logger = require("../../utils/logger");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("savecard")
        .setDescription("Upload an SFA Card")

        .addAttachmentOption(option =>
            option
                .setName("image")
                .setDescription("Card image")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Card name")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("character")
                .setDescription("Character")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("category")
                .setDescription("Card category")
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
        const character = interaction.options.getString("character");
        const tagString = interaction.options.getString("tags") || "";

        const tags = tagString
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean);

        const cardId = await generateCardId();

        const imageFile = await saveImage(
            image,
            "cards",
            cardId
        );

        const channel = interaction.guild.channels.cache.find(
            c => c.name === settings.channels.cards
        );

        if (!channel) {

            return interaction.editReply({
                content: settings.emojis.cross + " Channel #sfa-cards not found."
                });
        }

        const card = new Card({

                cardId,
                cardName: name,
                character,
                category: interaction.options.getString("category"),
                tags,
                imageFile,
                
                uploader: interaction.user.username,
                uploaderId: interaction.user.id

                });

            await card.save();

const { embed, files } = createCardEmbed(card, 0, 1);

const message = await channel.send({

    embeds: [embed],

    files

});

        card.discordMessageId = message.id;

        card.messageUrl = message.url;

        await card.save();

        await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "CARD_CREATE",

    user: interaction.user,

    id: card.cardId,

    title: card.cardName

});

       await interaction.editReply({
        content: `${settings.emojis.check} Card saved successfully!\n\nCard ID: **${card.cardId}**`
        });

    }

};