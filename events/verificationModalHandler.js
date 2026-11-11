const {
    EmbedBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const settings = require("../config/settings");
const { getSettings } = require("../config/configLoader");
const { PermissionsBitField } = require("discord.js");
const logger = require("../utils/logger");
const {
    resolveChannel,
    resolveRole,
    SetupPermissionError
} = require("../services/guildSetup");

function isId(value) {
    return /^\d+$/.test(String(value || ""));
}

module.exports = async (interaction) => {

    if (!interaction.isModalSubmit()) return false;

    if (interaction.customId !== "verification_modal") return false;

    try {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // DB-overridable settings for this guild, static fallback.
        const guildSettings = await getSettings(interaction.guild?.id).catch(() => settings);
        const channels = guildSettings?.channels || settings.channels;

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

        // Welcome channel, resolved (stored ID, then canonical
        // name, then created under HORNET). A failure to resolve it
        // skips the welcome message — the user is already verified.
        let welcomeChannel = null;
        try {
            ({ channel: welcomeChannel } = await resolveChannel(
                interaction.guild, "welcome"
            ));
        } catch (err) {
            console.error("[verificationModalHandler] Failed to resolve welcome channel:", err.message);
        }

        // Link channels for the welcome buttons, resolved the
        // same way; the stored ID is the fallback when resolution
        // fails, so the buttons keep working as before.
        const serverMapId = await (async () => {
            try {
                const { channel } = await resolveChannel(
                    interaction.guild, "serverMap"
                );
                return channel.id;
            } catch {
                return isId(channels.serverMap) ? channels.serverMap : "";
            }
        })();
        // How-to-join is optional: it is only linked when it
        // already exists (stored ID, then canonical name) and is
        // never created here. An empty ID means the Join button
        // below is left out rather than linking nowhere.
        const howToJoinId = await (async () => {
            try {
                const resolved = await resolveChannel(
                    interaction.guild, "howToJoin", { create: false }
                );
                return resolved?.channel?.id || "";
            } catch {
                return isId(channels.howToJoin) ? channels.howToJoin : "";
            }
        })();

        let welcomeFailed = false;
        if (welcomeChannel) {

            const welcomeEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(
                    `${"🐝"} Welcome to **F A T E - SF**, ${interaction.user}!\nEnjoy your stay.`
                );

            const welcomeButtons = [

                new ButtonBuilder()
                    .setLabel("Server Map")
                    .setEmoji("🗺️")
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                        `https://discord.com/channels/${interaction.guild.id}/${serverMapId}`
                    )

            ];

            // Only link the clan when a how-to-join channel exists.
            if (howToJoinId) {
                welcomeButtons.push(
                    new ButtonBuilder()
                        .setLabel("Join Fate Clan")
                        .setEmoji("🤝")
                        .setStyle(ButtonStyle.Link)
                        .setURL(
                            `https://discord.com/channels/${interaction.guild.id}/${howToJoinId}`
                        )
                );
            }

            const buttons = new ActionRowBuilder().addComponents(
                ...welcomeButtons
            );

            try {
                await welcomeChannel.send({

                    embeds: [welcomeEmbed],

                    components: [buttons]

                });
            } catch (err) {
                // The role was already added — the user IS verified.
                // Log it and tell them so, instead of reporting a
                // generic verification failure.
                welcomeFailed = true;
                console.error("[verificationModalHandler] Failed to send welcome message:", err.message);
            }

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
                `${"🐝"} Welcome to **F A T E - SF**, ${interaction.user}, enjoy your stay! ${"❤️"}`
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
