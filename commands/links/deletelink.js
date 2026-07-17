const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const Link = require("../../database/Link");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("deletelink")
        .setDescription("Delete a saved link")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("Title of the link")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const title = interaction.options.getString("title");

        const deleted = await Link.findOneAndDelete({
            title
        });

        if (!deleted) {

            return interaction.editReply("❌ Link not found.");

        }

        await interaction.editReply(
            `✅ Deleted **${title}**`
        );

    }

};