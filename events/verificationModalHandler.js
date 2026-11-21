const {
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const { PermissionsBitField } = require("discord.js");
const logger = require("../utils/logger");
const {
    resolveRole,
    SetupPermissionError
} = require("../services/guildSetup");
const { postVerificationWelcome } = require("../services/welcomeMessage");

module.exports = async (interaction) => {

    if (!interaction.isModalSubmit()) return false;

    if (interaction.customId !== "verification_modal") return false;

    try {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // The member role is resolved (stored ID, then canonical
        // name, then created) instead of erroring when it is not
        // configured yet.
        let memberRole;
        try {
            ({ role: memberRole } = await resolveRole(
                interaction.guild, "member"
            ));
        } catch (err) {
            if (err instanceof SetupPermissionError) {
                await interaction.editReply({
                    content: "❌ I need the **Manage Roles** permission to verify you."
                });
                return true;
            }
            throw err;
        }

        if (!memberRole) {

            await interaction.editReply({
                content: "❌" + " Member role not found."
            });

            return true;

        }

        // Pre-checks BEFORE roles.add: the bot must be able to manage
        // this role (ManageRoles + hierarchy), otherwise the add would
        // throw a 50013 after the user had already been told nothing.
        const botMember = interaction.guild.members.me;
        if (!botMember?.permissions?.has(PermissionsBitField.Flags.ManageRoles)) {
            await interaction.editReply({
                content: "❌ I need the **Manage Roles** permission to verify you."
            });
            return true;
        }
        if (memberRole.position >= botMember.roles.highest.position) {
            await interaction.editReply({
                content: "❌ I cannot assign the member role because it is equal to or higher than my highest role."
            });
            return true;
        }

        if (interaction.member.roles.cache.has(memberRole.id)) {

            await interaction.editReply({
                content: "✅" + " You are already verified."
            });

            return true;

        }

        const name = interaction.fields.getTextInputValue("name");
        const source = interaction.fields.getTextInputValue("source");
        const interest = interaction.fields.getTextInputValue("interest");

        // Give role
        await interaction.member.roles.add(memberRole);

        // Welcome message — posted when verification completes
        // (shared with the direct-grant button flow). A failure
        // to post it never undoes the verification.
        let welcomeFailed = false;
        try {
            const posted = await postVerificationWelcome(
                interaction.guild, interaction.member
            );
            if (!posted) welcomeFailed = true;
        } catch (err) {
            // The role was already added — the user IS verified.
            // Log it and tell them so, instead of reporting a
            // generic verification failure.
            welcomeFailed = true;
            console.error("[verificationModalHandler] Failed to send welcome message:", err.message);
        }

        // Reply to user
        const replyEmbed = new EmbedBuilder()

            .setColor("#2B2D31")

            .setThumbnail(
                interaction.guild.iconURL({
                    dynamic: true
                })
            )

            .setDescription(
                `${"🐝"} Welcome to **${interaction.guild.name}**, ${interaction.user}, enjoy your stay! ${"❤️"}`
            );

        await interaction.editReply({
            ...(welcomeFailed
                ? { content: "✅ You are verified, but the welcome message failed to send." }
                : {}),
            embeds: [replyEmbed]

        });

        // Logging
        const accountAgeDays = Math.floor(

            (Date.now() - interaction.user.createdTimestamp) /

            (1000 * 60 * 60 * 24)

        );

        const accountCreated =
            `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:F>`;

        await logger({

            guild: interaction.guild,

            user: interaction.user,

            type: "VERIFY",

            fields: [

                {
                    name: `${"👤"} User`,
                    value: `${interaction.user}`,
                    inline: true
                },

                {
                    name: `${"🪪"} User ID`,
                    value: interaction.user.id,
                    inline: true
                },

                {
                    name: `${"📅"} Discord Account Created`,
                    value: accountCreated,
                    inline: true
                },

                {
                    name: `${"⏱️"} Discord Account Age`,
                    value: `${accountAgeDays} days`,
                    inline: true
                },

                {
                    name: "Joined Server",
                    value: `<t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:F>`,
                    inline: false
                },

                {
                    name: "Preferred Name",
                    value: name,
                    inline: true
                },

                {
                    name: "Found Server",
                    value: source,
                    inline: true
                },

                {
                    name: "Interested In",
                    value: interest,
                    inline: false
                }

            ]

        });

        return true;

    } catch (err) {

        console.error("========== VERIFICATION ERROR ==========");
        console.error(err);
        console.error("========================================");

        try {

            if (interaction.deferred) {

                await interaction.editReply({

                    content:
                        "❌" +
                        " Something went wrong during verification."

                });

            } else if (!interaction.replied) {

                await interaction.reply({

                    content:
                        "❌" +
                        " Something went wrong during verification.",

                    flags: MessageFlags.Ephemeral

                });

            }

        } catch {}

        return true;

    }

};

module.exports.customIdPrefixes = ["verification_modal"];
