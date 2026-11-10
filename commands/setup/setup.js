const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const settings = require("../../config/settings");
const { COLORS } = require("../../config/constants");

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

        // Pre-check: creating channels/categories needs ManageChannels.
        // Fail with a clear message instead of a Discord 50013 halfway
        // through creating the channel set.
        const botMember = guild.members.me;
        if (!botMember?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.editReply({
                content: "❌ I need the **Manage Channels** permission to set up HORNET channels."
            });
        }

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

            created.push("📁 HORNET Category");

        } else {

            existing.push("📁 HORNET Category");

        }

        // -----------------------------
        // Channels
        // -----------------------------
        // Independent creates run in parallel (Promise.all) instead of
        // one at a time with a 1500ms sleep between them. Existing
        // channels are re-parented under the category in parallel too.

        const channels = [

            settings.channels.cards,

            settings.channels.arts,

            settings.channels.links,

            settings.channels.tournaments,

            settings.channels.logs

        ];

        const results = await Promise.all(channels.map(async name => {
            const channel = guild.channels.cache.find(c => c.name === name);

            if (!channel) {
                await guild.channels.create({
                    name,
                    type: ChannelType.GuildText,
                    parent: category.id
                });
                return { name, created: true };
            }

            if (channel.parentId !== category.id) {
                await channel.setParent(category.id).catch(() => {});
            }
            return { name, created: false };
        }));

        for (const { name, created: wasCreated } of results) {
            if (wasCreated) created.push(`#${name}`);
            else existing.push(`#${name}`);
        }

        // -----------------------------
        // Result
        // -----------------------------

        const embed = new EmbedBuilder()

            .setColor(COLORS.PRIMARY)

            .setTitle("✅" + " HORNET Setup Complete")

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
