const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const Card = require("../../database/Card");
const {
    createEditCardButtons
} = require("../../utils/embedBuilder");

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
    content: "❌" + " Card not found."
});

        }

        const embed = new EmbedBuilder()

            .setColor("#ff9900")

            .setTitle("🛠️ Edit Card")

            .addFields(

                {
                    name: `${"🪪"} Card ID`,
                    value: card.cardId,
                    inline: true
                },

                {
                    name: `${"🎴"} Name`,
                    value: card.cardName,
                    inline: true
                },

                {
                    name: `${"👤"} Character`,
                    value: card.character,
                    inline: true
                },

                {
                    name: `${"🏷️"} Tags`,
                    value: card.tags.length
                        ? card.tags.join(", ")
                        : "None"
                }

            )

            .setImage(
                card.imageFile?.startsWith("http://") ||
                card.imageFile?.startsWith("https://")
                    ? card.imageFile
                    : `attachment://${card.imageFile}`
            );

        const files = card.imageFile?.startsWith("http://") ||
            card.imageFile?.startsWith("https://")
            ? []
            : [{
                attachment: require("path").join(
                    process.cwd(),
                    "uploads",
                    "cards",
                    card.imageFile
                ),
                name: card.imageFile
            }];

        await interaction.editReply({
            embeds: [embed],
            files,
            components: [createEditCardButtons()]
        });

    }

};