const { MessageFlags } = require("discord.js");

const settings = require("../config/settings");

const logger = require("../utils/logger");

const createTryoutPost = require("../utils/createTryoutPost");

module.exports = async interaction => {

    if (!interaction.isModalSubmit()) return false;

    if (!interaction.customId.startsWith("tryout_apply_"))
        return false;

    const region = interaction.customId.split("_")[2];

    const pendingRoleId =
        region === "AS"
            ? settings.roles.pendingTryoutAS
            : settings.roles.pendingTryoutEU;

    const testerRoleId =
        region === "AS"
            ? settings.roles.tryoutTesterAS
            : settings.roles.tryoutTesterEU;

    const pendingRole =
        interaction.guild.roles.cache.get(pendingRoleId);

    if (!pendingRole) {

        await interaction.reply({

            content: "❌ Pending role not found.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const ign = interaction.fields.getTextInputValue("ign");

const gameId = interaction.fields.getTextInputValue("gameid");

// Validate Game ID
if (!/^\d+$/.test(gameId)) {

    await interaction.reply({

        content: "❌ In-Game ID must contain only numbers.",

        flags: MessageFlags.Ephemeral

    });

    return true;

}

await interaction.member.roles.add(pendingRole);

    await createTryoutPost(

        interaction.guild,

        interaction.member,

        region,

        testerRoleId,

        ign,

        gameId

    );

    await logger({

        guild: interaction.guild,

        type: "CLAN_JOIN",

        user: interaction.user,

        fields: [

            {
                name: "🌍 Region",
                value: region,
                inline: true
            },

            {
                name: "🎮 In-Game Name",
                value: ign,
                inline: true
            },

            {
                name: "🆔 In-Game ID",
                value: gameId,
                inline: true
            },

            {
                name: "🎭 Role Given",
                value: pendingRole.name,
                inline: true
            }

        ]

    });

    await interaction.reply({

        content: "✅ Your tryout application has been submitted successfully!",

        flags: MessageFlags.Ephemeral

    });

    return true;

};