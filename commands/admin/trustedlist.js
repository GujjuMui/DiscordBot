const {
    SlashCommandBuilder,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const Trusted = require("../../database/Trusted");
const owner = require("../../config/owner");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("trustedlist")

        .setDescription("View all trusted users and roles"),

    async execute(interaction) {

        if (interaction.user.id !== owner.ownerId) {

            return interaction.reply({

                content: "❌ Only the bot owner can use this command.",

                flags: MessageFlags.Ephemeral

            });

        }

        const trusted = await Trusted.find();

        const users = trusted.filter(t => t.type === "user");
        const roles = trusted.filter(t => t.type === "role");

        const embed = new EmbedBuilder()

            .setColor("#2ecc71")

            .setTitle("🛡️ Trusted Access")

            .addFields(

                {
                    name: `👤 Trusted Users (${users.length})`,
                    value: users.length
                        ? users.map(u => `<@${u.targetId}>`).join("\n")
                        : "None"
                },

                {
                    name: `🎭 Trusted Roles (${roles.length})`,
                    value: roles.length
                        ? roles.map(r => `<@&${r.targetId}>`).join("\n")
                        : "None"
                }

            )

            .setTimestamp();

        await interaction.reply({

            embeds: [embed],

            flags: MessageFlags.Ephemeral

        });

    }

};