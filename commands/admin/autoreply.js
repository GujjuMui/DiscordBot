const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const AutoReply = require("../../database/AutoReply");
const settings = require("../../config/settings");

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
                    .setDescription("Bot reply")
                    .setRequired(true)
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

    console.log("AUTOREPLY EXECUTE:", interaction.commandName, interaction.options.getSubcommand());

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    console.log("AUTOREPLY DEFERRED");

    // Owner Only
    if (interaction.user.id !== "1466871611893219455") {

        return interaction.editReply({
            content: settings.emojis.cross + " Only the bot owner can use this command."
        });

    }

    const subcommand = interaction.options.getSubcommand();

    // =========================
    // ADD
    // =========================
    if (subcommand === "add") {

        const user = interaction.options.getUser("user");

        if (user.bot) {

            return interaction.editReply({
                content: settings.emojis.cross + " You cannot add an auto reply for a bot."
            });

        }

        const reply = interaction.options.getString("reply");

        const existing = await AutoReply.findOne({
            targetId: user.id
        });

        if (existing) {

            return interaction.editReply({
                content: settings.emojis.cross + " That user already has an auto reply."
            });

        }

        const autoReply = new AutoReply({

            targetId: user.id,

            reply,

            createdBy: interaction.user.username,

            createdById: interaction.user.id

        });

        await autoReply.save();

        const embed = new EmbedBuilder()

            .setColor("#2ecc71")

            .setTitle(settings.emojis.check + " Auto Reply Added")

            .addFields(

                {
                    name: "User",
                    value: user.toString(),
                    inline: true
                },

                {
                    name: "Cooldown",
                    value: "1 Hour",
                    inline: true
                },

                {
                    name: "Reply",
                    value: reply
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

        const user = interaction.options.getUser("user");

        const deleted = await AutoReply.findOneAndDelete({

            targetId: user.id

        });

        if (!deleted) {

            return interaction.editReply({

                content: settings.emojis.cross + " That user doesn't have an auto reply."

            });

        }

        return interaction.editReply({

            embeds: [

                new EmbedBuilder()

                    .setColor("#e74c3c")

                    .setTitle(`${settings.emojis.allover.trash} Auto Reply Removed`)

                    .addFields({

                        name: "User",

                        value: user.toString()

                    })

                    .setTimestamp()

            ]

        });

    }

    // =========================
    // LIST
    // =========================
    if (subcommand === "list") {

        const autoReplies = await AutoReply.find().sort({
            createdAt: 1
        });

        if (!autoReplies.length) {

            return interaction.editReply({

                content: settings.emojis.cross + " No automatic replies have been configured."

            });

        }

        const embed = new EmbedBuilder()

            .setColor("#3498db")

            .setTitle("🤖 Auto Replies")

            .setFooter({

                text: `${autoReplies.length} configured`

            })

            .setTimestamp();

        for (const autoReply of autoReplies) {

            embed.addFields({

                name: `<@${autoReply.targetId}>`,

                value:
`💬 ${autoReply.reply}

⏱️ Cooldown: ${Math.floor(autoReply.cooldown / 60000)} minutes`

            });

        }

        return interaction.editReply({

            embeds: [embed]

            });

        }
    }
}