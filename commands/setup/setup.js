const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const settings = require("../../config/settings");

const logger = require("../../utils/logger");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("setup")

        .setDescription("Setup HORNET channels")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        await interaction.deferReply({
           flags: MessageFlags.Ephemeral
        });

        const guild = interaction.guild;

        // -----------------------------
        // Category
        // -----------------------------

        let category = guild.channels.cache.find(

            c =>
                c.type === ChannelType.GuildCategory &&
                c.name === "HORNET"

        );

        const created = [];
        const existing = [];

        if (!category) {

            category = await guild.channels.create({

                name: "HORNET",

                type: ChannelType.GuildCategory

            });

            await new Promise(resolve =>
    setTimeout(resolve, 1500)
);

            created.push("📁 HORNET Category");

        } else {

            existing.push("📁 HORNET Category");

        }

        // -----------------------------
        // Channels
        // -----------------------------

        const channels = [

            settings.channels.cards,

            settings.channels.arts,

            settings.channels.links,

            settings.channels.tournaments,

            settings.channels.logs

        ];

        for (const name of channels) {

            let channel = guild.channels.cache.find(

                c => c.name === name

            );

            if (!channel) {

                await guild.channels.create({

                    name,

                    type: ChannelType.GuildText,

                    parent: category.id

                });

                await new Promise(resolve =>
    setTimeout(resolve, 1500)
);

                created.push(`#${name}`);

            }

            else {

                if (
                    channel.parentId !== category.id
                ) {

                    await channel.setParent(category.id);

                }

                existing.push(`#${name}`);

            }

        }

        // -----------------------------
        // Result
        // -----------------------------

        const embed = new EmbedBuilder()

            .setColor("#2ecc71")

            .setTitle(settings.emojis.check + " HORNET Setup Complete")

            .addFields(

                {

                    name: "🆕 Created",

                    value: created.length

                        ? created.join("\n")

                        : "Nothing"

                },

                {

                    name: "✔️ Already Existed",

                    value: existing.length

                        ? existing.join("\n")

                        : "None"

                }

            )

            .setFooter({

                text: "HORNET Setup"

            })

            .setTimestamp();

    await logger({

    guild: interaction.guild,

    client: interaction.client,

    type: "SETUP",

    user: interaction.user

});

        await interaction.editReply({

            embeds: [embed]

        });

    }

};