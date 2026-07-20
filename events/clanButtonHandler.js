const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags
} = require("discord.js");

const settings = require("../config/settings");

module.exports = async interaction => {

    if (!interaction.isButton()) return false;

    if (
        interaction.customId !== "clan_join_as" &&
        interaction.customId !== "clan_join_eu"
    ) {
        return false;
    }

    const isAS = interaction.customId === "clan_join_as";

    const pendingRoleId = isAS
        ? settings.roles.pendingTryoutAS
        : settings.roles.pendingTryoutEU;

    const memberRole = interaction.guild.roles.cache.get(settings.roles.member);

    const pendingTryoutRole = interaction.guild.roles.cache.get(pendingRoleId);

    if (!memberRole || !pendingTryoutRole) {

        await interaction.reply({

            content: "❌ Required roles were not found.",

            flags: MessageFlags.Ephemeral

        });

        return true;

    }

    const hasPendingAS = interaction.member.roles.cache.has(
        settings.roles.pendingTryoutAS
    );

    const hasPendingEU = interaction.member.roles.cache.has(
        settings.roles.pendingTryoutEU
    );

    if (hasPendingAS || hasPendingEU) {

        await interaction.reply({

            content: "❌ You are already enrolled in the tryout process.",

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