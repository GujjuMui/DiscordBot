const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const Link = require("../../database/Link");
const settings = require("../../config/settings");
const logger = require("../../utils/logger");

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

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const title = interaction.options.getString("title");

        const deleted = await Link.findOneAndDelete({
            title
        });

        if (!deleted) {

            return interaction.editReply(
                "❌ Link not found."
            );

        }

        // Delete showcase message
        if (deleted.discordMessageId) {

            const contentChannel =
                interaction.guild.channels.cache.find(
                    c => c.name === settings.channels.links
                );

            if (contentChannel) {

                try {

                    const message =
                        await contentChannel.messages.fetch(
                            deleted.discordMessageId
                        );

                    if (message) {
                        await message.delete();
                    }

                } catch (err) {
                    console.log(
                        "Couldn't delete link showcase message."
                    );
                }

            }

        }

        await logger({

            guild: interaction.guild,
            client: interaction.client,

            type: "LINK_DELETE",

            user: interaction.user,

            title: deleted.title

        });

        await interaction.editReply(
            `✅ Deleted **${title}**`
        );

    }

};