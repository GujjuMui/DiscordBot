const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags
} = require("discord.js");

const { resolveRole, SetupPermissionError } = require("../services/guildSetup");

module.exports = async interaction => {

    if (!interaction.isButton()) return false;

    if (
        interaction.customId !== "clan_join_as" &&
        interaction.customId !== "clan_join_eu"
    ) {
        return false;
    }

    const isAS = interaction.customId === "clan_join_as";

    // Member / pending / clan roles are resolved (stored ID, then
    // canonical name, then created) instead of erroring when they
    // are not configured yet.
    let memberRole;
    let pendingTryoutRole;
    let pendingTryoutAS;
    let pendingTryoutEU;
    let clanMemberAS;
    let clanMemberEU;
    try {
        ({ role: memberRole } = await resolveRole(interaction.guild, "member"));
        ({ role: pendingTryoutRole } = await resolveRole(
            interaction.guild,
            isAS ? "pendingTryoutAS" : "pendingTryoutEU"
        ));
        ({ role: { id: pendingTryoutAS } } = await resolveRole(interaction.guild, "pendingTryoutAS"));
        ({ role: { id: pendingTryoutEU } } = await resolveRole(interaction.guild, "pendingTryoutEU"));
        ({ role: { id: clanMemberAS } } = await resolveRole(interaction.guild, "clanMemberAS"));
        ({ role: { id: clanMemberEU } } = await resolveRole(interaction.guild, "clanMemberEU"));
    } catch (err) {
        if (err instanceof SetupPermissionError) {
            await interaction.reply({
                content: err.message,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
        throw err;
    }

    if (!memberRole || !pendingTryoutRole) {

        await interaction.reply({

            content: "❌" + " Required roles were not found.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const hasPendingAS = interaction.member.roles.cache.has(
        pendingTryoutAS
    );

    const hasPendingEU = interaction.member.roles.cache.has(
        pendingTryoutEU
    );

    if (hasPendingAS || hasPendingEU) {

        await interaction.reply({

            content: "❌" + " You are already enrolled in the tryout process.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const isClanMember =
    interaction.member.roles.cache.has(clanMemberAS) ||
    interaction.member.roles.cache.has(clanMemberEU);

    if (isClanMember) {

    await interaction.reply({

        content: "❌" + " You are already a member of the clan.",

        flags: MessageFlags.Ephemeral

    });

    return true;

}

    const modal = new ModalBuilder()
        .setCustomId(`tryout_apply_${isAS ? "AS" : "EU"}`)
        .setTitle("Clan Tryout");

    const ign = new TextInputBuilder()
        .setCustomId("ign")
        .setLabel("In-Game Name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30);

    const gameId = new TextInputBuilder()
        .setCustomId("gameid")
        .setLabel("In-Game ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30);

    modal.addComponents(
        new ActionRowBuilder().addComponents(ign),
        new ActionRowBuilder().addComponents(gameId)
    );

    await interaction.showModal(modal);

    return true;

};

module.exports.customIdPrefixes = ["clan_join_as", "clan_join_eu"];
