const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const spamManager = require("../../services/spamManager");
const owner = require("../../config/owner");
const { SPAM_MAX_PINGS, SPAM_DELAY_MS, SPAM_PROGRESS_EVERY } = require("../../config/constants");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {

    data: new SlashCommandBuilder()

        .setName("spam")

        .setDescription("Spam ping a single user (Owner Only)")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to ping")
                .setRequired(true)
        )

        .addIntegerOption(option =>
            option
                .setName("count")
                .setDescription(`Number of pings (Max ${SPAM_MAX_PINGS})`)
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(SPAM_MAX_PINGS)
        )

        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Optional message")
                .setRequired(false)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Owner Only
        if (
            interaction.user.id !==
            owner.ownerId
        ) {

            return interaction.editReply({

                content:
                    "❌ Only the bot owner can use this command."

            });

        }

        if (spamManager.isRunning(interaction.guildId)) {

            return interaction.editReply({

                content:
                    "❌ A spam session is already running."

            });

        }

        const user =
            interaction.options.getUser("user");

        if (user.bot) {

            return interaction.editReply({

                content:
                    "❌ You cannot spam another bot."

            });

        }

        const count =
            interaction.options.getInteger("count");

        const message =
            interaction.options.getString("message") || "";

        const channel =
            interaction.channel;

        await interaction.editReply({

            content:
                `✅ Spam started.\n\n` +
                `👤 Target: ${user.tag}\n` +
                `🔢 Count: ${count}\n` +
                `💬 Message: ${message || "None"}`

        });

        spamManager.start(
            user.id,
            channel.id,
            interaction.guildId
        );

        // Stops cleanly on: manual /stopspam, the target replying
        // (messageCreate), a 403 / deleted channel (10003), or three
        // consecutive 429s. Discord's retry_after is honoured instead
        // of hammering through a rate limit.
        let sent = 0;
        let stoppedReason = null;
        let consecutive429 = 0;

        for (let i = 0; i < count; i++) {
            if (!spamManager.isRunning(interaction.guildId)) {
                stoppedReason = "stopped";
                break;
            }

            try {
                await channel.send(`${user} ${message}`);
                sent++;
                consecutive429 = 0;
            } catch (err) {
                if (err?.code === 403 || err?.code === 10003) {
                    stoppedReason = "forbidden";
                    break;
                }
                if (err?.status === 429 || err?.code === 429) {
                    consecutive429++;
                    const retryAfterMs = err?.retry_after
                        ? Math.ceil(err.retry_after * 1000)
                        : SPAM_DELAY_MS;
                    if (consecutive429 >= 3) {
                        stoppedReason = "rate-limited";
                        break;
                    }
                    await sleep(Math.min(retryAfterMs, 30000));
                    continue;
                }
                console.error(`❌ Failed to send spam message ${i + 1}/${count}:`, err.message);
            }

            if ((i + 1) % SPAM_PROGRESS_EVERY === 0) {
                await interaction.editReply({
                    content:
                        `⏳ Spam in progress: **${i + 1}/${count}** sent to ${user.tag}.`
                }).catch(() => {});
            }

            await sleep(SPAM_DELAY_MS);
        }

        spamManager.stop(interaction.guildId);

        const finalMessage = stoppedReason === "stopped"
            ? `🛑 Spam stopped after **${sent}/${count}** pings.`
            : stoppedReason === "forbidden"
                ? `❌ Spam stopped after **${sent}/${count}** pings — I lost permission to send in that channel.`
                : stoppedReason === "rate-limited"
                    ? `❌ Spam stopped after **${sent}/${count}** pings — Discord rate-limited the channel.`
                    : `✅ Spam finished. **${sent}/${count}** pings sent to ${user.tag}.`;

        await interaction.editReply({ content: finalMessage }).catch(() => {});

    }

};
