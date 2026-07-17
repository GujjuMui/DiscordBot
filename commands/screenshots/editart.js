const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const Art = require("../../database/Art");

const path = require("path");

const { createEditArtButtons } = require("../../utils/embedBuilder");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("editart")
        .setDescription("Edit an artwork")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        .addStringOption(option =>
            option
                .setName("id")
                .setDescription("Art ID")
                .setRequired(true)
        ),

    async execute(interaction) {

    await interaction.deferReply({
    flags: MessageFlags.Ephemeral
});

    const id = interaction.options.getString("id");

    const art = await Art.findOne({
        artId: id.toUpperCase()
    });

    if (!art) {

      return interaction.editReply({
    content: "❌ Art not found."
});

    }

    const embed = new EmbedBuilder()

    .setColor("#8e44ad")

    .setTitle("🛠️ Edit Artwork")

    .addFields(

        {
            name: "🆔 Art ID",
            value: art.artId,
            inline: true
        },

        {
            name: "📝 Name",
            value: art.artName,
            inline: true
        },

        {
            name: "📂 Category",
            value: art.category,
            inline: true
        },

        {
            name: "🏷️ Tags",
            value: art.tags.length
                ? art.tags.join(", ")
                : "None"
        }

    )

    .setImage(`attachment://${art.imageFile}`)

await interaction.editReply({

    embeds: [embed],

    files: [
        {
            attachment: path.join(
                process.cwd(),
                "uploads",
                "arts",
                art.imageFile
            ),
            name: art.imageFile
        }
    ],

    components: [
        createEditArtButtons()
    ],

});


}
};