const { createDeleteButtons } = require("../../utils/embedBuilder");

const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const Art = require("../../database/Art");

const logger = require("../../utils/logger");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("deleteart")
        .setDescription("Delete an artwork")

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

        const id = interaction.options
            .getString("id")
            .toUpperCase();

        const art = await Art.findOne({
            artId: id
        });

        if (!art) {

            return interaction.reply({
                content: "❌ Artwork not found.",
                flags: MessageFlags.Ephemeral
            });

        }

        await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "ART_DELETE",

    user: interaction.user,

    id: art.artId,

    title: art.artName

});

        await interaction.reply({

           content:
`⚠️ Delete **${art.artName}**?\n\nArt ID: ${art.artId}\n\nPress Confirm or Cancel.`,

            components: [
    createDeleteButtons()
    ],

            flags: MessageFlags.Ephemeral

        });

    }

};