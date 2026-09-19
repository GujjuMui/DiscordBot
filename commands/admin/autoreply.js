const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const AutoReply = require("../../database/AutoReply");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("autoreply")

        .setDescription("Manage automatic replies (Owner Only)")

        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add an automatic reply")

                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Target user")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("reply")
                        .setDescription("Reply when the configured user sends a message")
                        .setRequired(false)
                )

                .addStringOption(option =>
                    option
                        .setName("mentionreply")
                        .setDescription("Reply when someone mentions the configured user")
                        .setRequired(false)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove an automatic reply")

                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Target user")
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("View all automatic replies")
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Owner Only
        if (
            interaction.user.id !==
            "1466871611893219455"
        ) {

            return interaction.editReply({
                content:
                    "❌ Only the bot owner can use this command."
            });

        }

        const subcommand =
            interaction.options.getSubcommand();

        // =========================
        // ADD
        // =========================

        if (subcommand === "add") {

            const user =
                interaction.options.getUser("user");

            if (user.bot) {

                return interaction.editReply({
                    content:
                        "❌ You cannot add an auto reply for a bot."
                });

            }

            const reply =
                interaction.options.getString("reply") || "";

            const mentionReply =
                interaction.options.getString("mentionreply") || "";

            if (!reply && !mentionReply) {

                return interaction.editReply({

                    content:
                        "❌ You must provide at least a Normal Message Reply or a Mention Reply."

                });

            }

            const existing =
                await AutoReply.findOne({
                    targetId: user.id
                });

            if (existing) {

                return interaction.editReply({
                    content:
                        "❌ That user already has an auto reply."
                });

            }

            const autoReply = new AutoReply({

                targetId: user.id,

                reply,

                mentionReply,

                createdBy: interaction.user.username,

                createdById: interaction.user.id

            });

            await autoReply.save();

            const embed =
                new EmbedBuilder()

                    .setColor("#2ecc71")

                    .setTitle(
                        "✅ Auto Reply Added"
                    )

                    .addFields(

                        {
                            name: "User",
                            value: user.toString(),
                            inline: true
                        },

                        {
                            name: "Cooldown",
                            value: "12 Hours",
                            inline: true
                        },

                        {
                            name: "Normal Message Reply",
                            value: reply
                        },

                        {
                            name: "Mention Reply",
                            value: mentionReply || "Not configured"
                        }

                    )

                    .setTimestamp();

            return interaction.editReply({

                embeds: [embed]

            });

        }

        // =========================
        // REMOVE
        // =========================

        if (subcommand === "remove") {

            const user =
                interaction.options.getUser("user");

            const deleted =
                await AutoReply.findOneAndDelete({

                    targetId:
                        user.id

                });

            if (!deleted) {

                return interaction.editReply({

                    content:
                        "❌ That user doesn't have an auto reply."

                });

            }

            return interaction.editReply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#e74c3c")

                        .setTitle(
                            "🗑️ Auto Reply Removed"
                        )

                        .addFields({

                            name: "User",

                            value:
                                user.toString()

                        })

                        .setTimestamp()

                ]

            });

        }

        // =========================
        // LIST
        // =========================

        if (subcommand === "list") {

            const autoReplies =
                await AutoReply.find().sort({
                    createdAt: 1
                });

            if (!autoReplies.length) {

                return interaction.editReply({

                    content:
                        "❌ No automatic replies have been configured."

                });

            }

            const embed =
                new EmbedBuilder()

                    .setColor("#3498db")

                    .setTitle(
                        "🤖 Auto Replies"
                    )

                    .setFooter({

                        text:
                            `${autoReplies.length} configured`

                    })

                    .setTimestamp();

            for (const autoReply of autoReplies) {

                embed.addFields({

                name: `<@${autoReply.targetId}>`,

                value:
                    `💬 **Normal Message Reply:**\n` +
                    `${autoReply.reply || "Not configured"}\n\n` +

                    `📢 **Mention Reply:**\n` +
                    `${autoReply.mentionReply || "Not configured"}\n\n` +

                    `⏱️ **Cooldown:** 12 Hours`

                });

            }

            return interaction.editReply({

                embeds: [embed]

            });

        }

    }

};