const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const Card = require("../../database/Card");

const settings = require("../../config/settings");

const logger = require("../../utils/logger");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("deletecard")

        .setDescription("Delete an SFA Card")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        .addStringOption(option =>
            option
                .setName("id")
                .setDescription("Card ID")
                .setRequired(true)
        ),

    async execute(interaction) {

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    const cardId = interaction.options
        .getString("id")
        .toUpperCase();

    const card = await Card.findOne({
        cardId
    });

    if (!card) {

        return interaction.editReply({
            content: "❌ Card not found."
        });

    }

    const guild = interaction.guild;

const channel = guild.channels.cache.find(
    c => c.name === settings.channels.cards
);

if (channel && card.discordMessageId) {

    try {

        const message = await channel.messages.fetch(
            card.discordMessageId
        );

        await message.delete();

    } catch (err) {

        console.log(
            "Card message already deleted or not found."
        );

    }

}

    try {

    const imagePath = path.join(
        process.cwd(),
        "uploads",
        "cards",
        card.imageFile
    );

    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
    }

} catch (err) {

    console.log("Couldn't delete local image.");

}

    const imagePath = path.join(
    process.cwd(),
    "uploads",
    "cards",
    card.imageFile
);

if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
}

await Card.deleteOne({
    cardId
});

await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "CARD_DELETE",

    user: interaction.user,

    id: card.cardId,

    title: card.cardName

});

return interaction.editReply({
    content: `✅ Card **${card.cardId}** deleted successfully.`
});

}

};