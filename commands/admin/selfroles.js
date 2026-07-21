const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const settings = require("../../config/settings");

const SelfRoleMessage = require("../../database/SelfRoleMessage");

const buildSelfRolePanel = require("../../utils/selfRoleComponents");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("selfroles")

        .setDescription("Manage the self role panel")

        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(subcommand =>

            subcommand

                .setName("setup")

                .setDescription("Create the self role panel")

        )

        .addSubcommand(subcommand =>

            subcommand

                .setName("refresh")

                .setDescription("Refresh the existing self role panel")

        ),

    async execute(interaction) {

        if (interaction.user.id !== settings.ownerId) {

            return interaction.reply({

                content: "❌ Only the bot owner can use this command.",

                flags: MessageFlags.Ephemeral

            });

        }

        await interaction.deferReply({

            flags: MessageFlags.Ephemeral

        });

        const subcommand = interaction.options.getSubcommand();

        const channel = interaction.guild.channels.cache.get(

            settings.selfRoles.channel

        );

        if (!channel) {

            return interaction.editReply({

                content: "❌ Self role channel not found."

            });

        }

        const payload = buildSelfRolePanel(
    interaction.guild,
    interaction.member
);

        // =========================
        // SETUP
        // =========================

        if (subcommand === "setup") {

            const message = await channel.send({

    ...payload,

    flags: MessageFlags.IsComponentsV2

});

            await SelfRoleMessage.findOneAndUpdate(

                {

                    guildId: interaction.guild.id

                },

                {

                    guildId: interaction.guild.id,

                    channelId: channel.id,

                    messageId: message.id

                },

                {

                    upsert: true

                }

            );

            return interaction.editReply({

                content: "✅ Self role panel created."

            });

        }

        // =========================
        // REFRESH
        // =========================

        const saved = await SelfRoleMessage.findOne({

            guildId: interaction.guild.id

        });

        if (!saved) {

            return interaction.editReply({

                content: "❌ No self role panel has been created."

            });

        }

        try {

            const message = await channel.messages.fetch(saved.messageId);

            await message.edit({

    ...payload,

    flags: MessageFlags.IsComponentsV2

});

            return interaction.editReply({

                content: "✅ Self role panel refreshed."

            });

        } catch {

            return interaction.editReply({

                content: "❌ Couldn't find the saved self role panel."

            });

        }

    }

};