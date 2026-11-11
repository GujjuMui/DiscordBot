const { MessageFlags } = require("discord.js");

const logger = require("../utils/logger");
const { resolveRole, SetupPermissionError } = require("../services/guildSetup");

const createTryoutPost = require("../utils/createTryoutPost");

module.exports = async interaction => {

    if (!interaction.isModalSubmit()) return false;

    if (!interaction.customId.startsWith("tryout_apply_"))
        return false;

    const region = interaction.customId.split("_")[2];

    await interaction.deferReply({
    flags: MessageFlags.Ephemeral
});

    // Pending / tester roles are resolved (stored ID, then canonical
    // name, then created) instead of erroring when not configured yet.
    let pendingRole;
    let testerRoleId;
    try {
        ({ role: pendingRole } = await resolveRole(
            interaction.guild,
            region === "AS" ? "pendingTryoutAS" : "pendingTryoutEU"
        ));
        ({ role: { id: testerRoleId } } = await resolveRole(
            interaction.guild,
            region === "AS" ? "tryoutTesterAS" : "tryoutTesterEU"
        ));
    } catch (err) {
        if (err instanceof SetupPermissionError) {
            await interaction.editReply({
                content: err.message,
            });
            return true;
        }
        throw err;
    }

    if (!pendingRole) {

        await interaction.editReply({

            content: "❌" + " Pending role not found.",

        });

        return true;

    }

    const ign = interaction.fields.getTextInputValue("ign");

const gameId = interaction.fields.getTextInputValue("gameid");

// Validate Game ID
if (!/^\d+$/.test(gameId)) {

    await interaction.editReply({

        content: "❌" + " In-Game ID must contain only numbers.",
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
                name: "Region",
                value: region,
                inline: true
            },

            {
                name: "In-Game Name",
                value: ign,
                inline: true
            },

            {
                name: `${"🪪"} In-Game ID`,
                value: gameId,
                inline: true
            },

            {
                name: `${"🎭"} Role Given`,
                value: pendingRole.name,
                inline: true
            }

        ]

    });

    await interaction.editReply({

        content: "✅" + " Your tryout application has been submitted successfully!",

    });

    return true;

};

module.exports.customIdPrefixes = ["tryout_apply_"];
