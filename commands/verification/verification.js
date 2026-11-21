// /verification — universal, multi-server verification suite.
//
//   /verification setup   — create the WELCOME category + its 5
//                           channels (rules, verification, guide,
//                           support, onboarding), post the Server
//                           Rules embed and the verification panel,
//                           and persist every auto-detected ID per
//                           guildId. Admin only.
//   /verification config  — override the auto-detected settings
//                           without touching code: verified role,
//                           any of the 5 channels, custom footer,
//                           accent colour. Admin only.
//
// Nothing here names a server, a channel ID or a role ID — every
// value comes from interaction.guild or the guild's saved config.
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags,
    ChannelType
} = require("discord.js");

const { SetupPermissionError } = require("../../services/guildSetup");
const {
    setupVerificationChannels,
    postVerificationMessages,
    parseAccentColor
} = require("../../services/verificationSetup");
const VerificationRepository = require("../../repositories/VerificationRepository");

const HEX_COLOR = /^#?[0-9a-fA-F]{6}$/;

function channelSummary(config) {
    const line = (label, id) => `${label}: ${id ? `<#${id}>` : "not set"}`;
    return [
        line("📜 Rules", config.rulesChannelId),
        line("📝 Verification", config.verificationChannelId),
        line("📖 Guide", config.guideChannelId),
        line("💬 Support", config.supportChannelId),
        line("👋 Onboarding", config.onboardingChannelId),
        `Category: ${config.welcomeCategoryId ? `<#${config.welcomeCategoryId}>` : "not set"}`,
        `Verified role: ${config.verifiedRoleId ? `<@&${config.verifiedRoleId}>` : "not set (falls back to the Member role)"}`,
        `Footer: ${config.customFooter || "(server name)"}`,
        `Accent colour: ${config.accentColor || "(default)"}`
    ].join("\n");
}

module.exports = {

    data: new SlashCommandBuilder()

        .setName("verification")
        .setDescription("Universal verification system for this server")

        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription("Create the WELCOME category, its 5 channels, rules and verification panel")
        )

        .addSubcommand(sub =>
            sub
                .setName("config")
                .setDescription("View or override this server's verification settings")
                .addRoleOption(option =>
                    option
                        .setName("verified_role")
                        .setDescription("Role granted when a member clicks Verify")
                )
                .addChannelOption(option =>
                    option
                        .setName("onboarding_channel")
                        .setDescription("Override the auto-detected onboarding channel")
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addChannelOption(option =>
                    option
                        .setName("rules_channel")
                        .setDescription("Override the auto-detected rules channel")
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addChannelOption(option =>
                    option
                        .setName("verification_channel")
                        .setDescription("Override the auto-detected verification channel")
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addChannelOption(option =>
                    option
                        .setName("guide_channel")
                        .setDescription("Override the auto-detected server guide channel")
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addChannelOption(option =>
                    option
                        .setName("support_channel")
                        .setDescription("Override the auto-detected support channel")
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addStringOption(option =>
                    option
                        .setName("custom_footer")
                        .setDescription("Footer text for the rules / verification embeds (default: server name)")
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName("accent_color")
                        .setDescription("Embed accent colour as a hex code, e.g. #5865F2")
                        .setMaxLength(7)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;

        if (subcommand === "setup") {
            return runSetup(interaction, guild);
        }
        if (subcommand === "config") {
            return runConfig(interaction, guild);
        }
        return interaction.editReply({ content: "❌ Unknown subcommand." });
    }

};

async function runSetup(interaction, guild) {
        const existing = await VerificationRepository
            .getVerificationConfig(guild.id)
            .catch(() => null);

        let result;
        try {
            result = await setupVerificationChannels(guild, { config: existing });
        } catch (err) {
            if (err instanceof SetupPermissionError) {
                return interaction.editReply({ content: err.message });
            }
            throw err;
        }

        const config = result.config || {};
        let posted;
        try {
            posted = await postVerificationMessages(guild, result.channels, config);
        } catch (err) {
            // Channels exist and IDs are saved — a failed panel post
            // must not report the whole setup as failed.
            console.error("[verification setup] Failed to post panels:", err.message);
            posted = { rulesPosted: false, verificationPosted: false };
        }

        const embed = new EmbedBuilder()
            .setColor(parseAccentColor(config.accentColor))
            .setTitle(`✅ Verification setup complete — ${guild.name}`)
            .setDescription(
                "The WELCOME category and its channels are ready. " +
                "New members will be welcomed in the onboarding channel, " +
                "and clicking **Verify** grants the configured verified role.\n\n" +
                channelSummary(config)
            )
            .addFields(
                {
                    name: "🆕 Created",
                    value: result.created.length ? result.created.join("\n") : "Nothing",
                    inline: true
                },
                {
                    name: "✔️ Already existed",
                    value: result.reused.length ? result.reused.join("\n") : "None",
                    inline: true
                },
                {
                    name: "📌 Panels",
                    value:
                        `Rules: ${posted.rulesPosted ? "posted" : "already present"}\n` +
                        `Verification: ${posted.verificationPosted ? "posted" : "already present"}`,
                    inline: true
                }
            )
            .setFooter({ text: config.customFooter || guild.name || "Hornet" })
            .setTimestamp();

        if (!config.verifiedRoleId) {
            embed.addFields({
                name: "⚠️ Next step",
                value: "No verified role is set yet — run `/verification config` with `verified_role` to choose which role Verify grants (otherwise the Member role is used)."
            });
        }

        await interaction.editReply({ embeds: [embed] });
}

async function runConfig(interaction, guild) {
        const patch = {};
        const role = interaction.options.getRole("verified_role");
        if (role) patch.verifiedRoleId = role.id;

        const channelOptions = [
            ["onboarding_channel", "onboardingChannelId"],
            ["rules_channel", "rulesChannelId"],
            ["verification_channel", "verificationChannelId"],
            ["guide_channel", "guideChannelId"],
            ["support_channel", "supportChannelId"]
        ];
        for (const [optionName, field] of channelOptions) {
            const channel = interaction.options.getChannel(optionName);
            if (channel) patch[field] = channel.id;
        }

        const customFooter = interaction.options.getString("custom_footer");
        if (customFooter !== null) patch.customFooter = customFooter;

        const accentColor = interaction.options.getString("accent_color");
        if (accentColor !== null) {
            if (!HEX_COLOR.test(accentColor.trim())) {
                return interaction.editReply({
                    content: "❌ `accent_color` must be a hex colour like `#5865F2`."
                });
            }
            patch.accentColor = accentColor.trim().startsWith("#")
                ? accentColor.trim()
                : `#${accentColor.trim()}`;
        }

        let config;
        if (Object.keys(patch).length > 0) {
            config = await VerificationRepository.saveVerificationConfig(guild.id, patch);
            // If the guild has never run setup, there may be no
            // category / channels yet — config still saves, and
            // setup will pick it up (verified role / overrides).
            if (!config) {
                return interaction.editReply({
                    content: "❌ Could not save the verification settings. Please try again."
                });
            }
        } else {
            config = await VerificationRepository
                .getVerificationConfig(guild.id)
                .catch(() => null) || VerificationRepository.emptyConfig(guild.id);
        }

        const embed = new EmbedBuilder()
            .setColor(parseAccentColor(config.accentColor))
            .setTitle(`⚙️ Verification settings — ${guild.name}`)
            .setDescription(channelSummary(config))
            .setFooter({ text: config.customFooter || guild.name || "Hornet" })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
}

