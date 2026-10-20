const { createDeleteButtons } = require("../../utils/embedBuilder");

const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const ArtRepository = require("../../repositories/ArtRepository");
const settings = require("../../config/settings");
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

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const id = interaction.options
            .getString("id")
            .toUpperCase();

        const art = await ArtRepository.findByCode(id);

        if (!art) {

            return interaction.editReply({
                content: "❌ Artwork not found."
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

        await interaction.editReply({

           content:
`${"⚠️"} Delete **${art.artName}**?\n\nArt ID: ${art.artId}\n\nPress Confirm or Cancel.`,

            components: [
    createDeleteButtons()
    ]

        });

    }

};