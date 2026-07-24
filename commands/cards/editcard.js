console.log("EDITCARD EXECUTED");

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const Card = require("../../database/Card");
const settings = require("../../config/settings");

const {
    createEditCardButtons
} = require("../../utils/embedBuilder");

const path = require("path");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("editcard")
        .setDescription("Edit a card")

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

        const id = interaction.options
            .getString("id")
            .toUpperCase();

        const card = await Card.findOne({
            cardId: id
        });

        if (!card) {

            return interaction.editReply({
    content: settings.emojis.cross + " Card not found."
});

        }

        const embed = new EmbedBuilder()

            .setColor("#ff9900")

            .setTitle("🛠️ Edit Card")

            .addFields(

                {
                    name: `${settings.emojis.allover.id} Card ID`,
                    value: card.cardId,
                    inline: true
                },

                {
                    name: `${settings.emojis.allover.cards} Name`,
                    value: card.cardName,
                    inline: true
                },

                {
                    name: `${settings.emojis.allover.person} Character`,
                    value: card.character,
                    inline: true
                },

                {
                    name: `${settings.emojis.allover.tags} Tags`,
                    value: card.tags.length
                        ? card.tags.join(", ")
                        : "None"
                }

            )

            .setImage(`attachment://${card.imageFile}`);

       await interaction.editReply({

    embeds: [embed],

    files: [
        {
            attachment: path.join(
                process.cwd(),
                "uploads",
                "cards",
                card.imageFile
            ),
            name: card.imageFile
        }
    ],

    components: [
        createEditCardButtons()
    ],

});

    }

};