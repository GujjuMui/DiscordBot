const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const CardRepository = require("../../repositories/CardRepository");

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

    const card = await CardRepository.findByCode(cardId);

    if (!card) {

        return interaction.editReply({
            content: "❌" + " Card not found."
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

await CardRepository.delete(cardId);

await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "CARD_DELETE",

    user: interaction.user,

    id: card.cardId,

    title: card.cardName

});

return interaction.editReply({
    content: `${"✅"} Card **${card.cardId}** deleted successfully.`
});

}

};