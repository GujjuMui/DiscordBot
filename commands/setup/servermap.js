const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const { COLORS } = require("../../config/constants");
const { getSettings, updateSetting } = require("../../config/configLoader");
const {
    CHANNEL_NAMES,
    SetupPermissionError,
    rememberPickedChannel,
    resolveChannel
} = require("../../services/guildSetup");

// /servermap — build (and keep) a server map by scanning the live
// server. Running it again EDITS the same message in place, so the
// map stays current as the server grows; it never posts a duplicate.
// The map is built from guild.channels.cache — no channel ID stored
// anywhere decides what is listed. A channel that does not exist
// (e.g. the optional how-to-join channel) simply is not listed.

const FIELD_VALUE_LIMIT = 1024;
const EMBED_TOTAL_LIMIT = 5900;
const MAX_FIELDS = 25;

function cacheSize(cache) {
    if (!cache) return 0;
    if (typeof cache.size === "number") return cache.size;
    return [...(cache.values?.() ?? [])].length;
}

function cacheValues(cache) {
    if (!cache) return [];
    if (typeof cache.values === "function") return [...cache.values()];
    if (typeof cache[Symbol.iterator] === "function") return [...cache];
    return [];
}

// Join as many mention lines as fit in one embed field; the rest
// are counted, not dropped silently.
function truncateList(lines) {
    const kept = [];
    let len = 0;
    for (const line of lines) {
        const add = (kept.length ? 1 : 0) + line.length;
        if (kept.length && len + add > 1000) break;
        kept.push(line);
        len += add;
    }
    const remaining = lines.length - kept.length;
    if (remaining > 0) kept.push(`… and ${remaining} more`);
    return kept.join("\n");
}

function buildServerMapEmbed(guild) {
    const channels = cacheValues(guild.channels.cache)
        .filter(c => c.type !== ChannelType.GuildCategory);

    const categories = cacheValues(guild.channels.cache)
        .filter(c => c.type === ChannelType.GuildCategory)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const byParent = new Map();
    for (const channel of channels) {
        const parentId = channel.parentId || null;
        if (!byParent.has(parentId)) byParent.set(parentId, []);
        byParent.get(parentId).push(channel);
    }
    for (const list of byParent.values()) {
        list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    const memberCount = guild.memberCount
        ?? cacheSize(guild.members?.cache);
    const roleCount = cacheSize(guild.roles?.cache);

    // The how-to-join channel is optional: it is only pointed at
    // when it actually exists on this server.
    const howToJoin = guild.channels.cache.find
        ? guild.channels.cache.find(c => c.name === CHANNEL_NAMES.howToJoin)
        : channels.find(c => c.name === CHANNEL_NAMES.howToJoin);

    let description =
        `👥 **${memberCount}** members • ` +
        `#️⃣ **${channels.length}** channels • ` +
        `🎭 **${roleCount}** roles`;
    if (howToJoin) {
        description += `\n\n🤝 Join the clan: ${howToJoin}`;
    }

    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`🗺️ Server Map — ${guild.name}`)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: "Hornet • Server Map" });

    // One field per category, then the uncategorised channels.
    // Stops before the 6000-character embed limit and says so.
    const groups = [
        ...categories.map(category => ({
            name: category.name,
            channels: byParent.get(category.id) || []
        })),
        ...(byParent.has(null)
            ? [{ name: "📂 No Category", channels: byParent.get(null) }]
            : [])
    ].filter(group => group.channels.length > 0);

    const fields = [];
    let total = embed.data.title.length + description.length;
    let hiddenGroups = 0;
    for (const group of groups) {
        if (fields.length >= MAX_FIELDS - 1) { hiddenGroups++; continue; }
        const value = truncateList(
            group.channels.map(channel => `${channel}`)
        );
        if (total + group.name.length + value.length > EMBED_TOTAL_LIMIT) {
            hiddenGroups++;
            continue;
        }
        fields.push({ name: group.name, value, inline: false });
        total += group.name.length + value.length;
    }
    if (hiddenGroups > 0) {
        fields.push({
            name: "…",
            value: `… and ${hiddenGroups} more categor${hiddenGroups === 1 ? "y" : "ies"} not shown — run /servermap again after the server grows.`,
            inline: false
        });
    }
    if (fields.length) embed.addFields(fields);

    return embed;
}

module.exports = {

    data: new SlashCommandBuilder()

        .setName("servermap")

        .setDescription("Create or update the server map channel")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel to post the server map in (uses the saved server-map channel if not given)")
                .addChannelTypes(ChannelType.GuildText)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const guild = interaction.guild;
        if (!guild) {
            return interaction.editReply({
                content: "❌ This command only works in a server."
            });
        }

        // A picked channel wins; otherwise the saved server-map
        // channel (stored ID, then canonical name, then created
        // under the CLAN category).
        let target = interaction.options.getChannel("channel");
        try {
            if (target) {
                await rememberPickedChannel(guild, "serverMap", target);
            } else {
                ({ channel: target } = await resolveChannel(guild, "serverMap"));
            }
        } catch (err) {
            if (err instanceof SetupPermissionError) {
                return interaction.editReply({ content: err.message });
            }
            throw err;
        }

        const embed = buildServerMapEmbed(guild);

        // The previous map message, remembered in BotSettings extras
        // (see the v1.6 resolver: extras round-trip through
        // getSettings, no new model needed). Re-running edits it in
        // place; a deleted message (or a moved channel) posts fresh.
        const saved = await getSettings(guild.id).catch(() => null);
        const prevChannelId = saved?.extras?.serverMapChannelId || "";
        const prevMessageId = saved?.extras?.serverMapMessageId || "";

        let message = null;
        let updated = false;
        if (prevChannelId && prevMessageId) {
            try {
                const prevChannel = prevChannelId === target.id
                    ? target
                    : await guild.channels.fetch(prevChannelId).catch(() => null);
                if (prevChannel) {
                    const old = await prevChannel.messages
                        .fetch(prevMessageId).catch(() => null);
                    if (old) {
                        if (prevChannelId === target.id) {
                            await old.edit({ embeds: [embed] });
                            message = old;
                            updated = true;
                        } else {
                            // The map moved to another channel: drop
                            // the old copy so it does not go stale.
                            await old.delete().catch(() => {});
                        }
                    }
                }
            } catch {
                // Fall through to posting a fresh map below.
                message = null;
            }
        }

        if (!message) {
            message = await target.send({ embeds: [embed] });
        }

        // Remember where the map lives. A failed save (e.g. Mongo
        // down) is not fatal — the next run just posts a new map.
        await updateSetting(guild.id, "extras", "serverMapChannelId", target.id);
        await updateSetting(guild.id, "extras", "serverMapMessageId", message.id);

        await interaction.editReply({
            content: updated
                ? `✅ Server map updated in ${target}.`
                : `✅ Server map posted in ${target}.`
        });

    }

};

// Exported for tests: the embed is a pure function of the live guild.
module.exports.buildServerMapEmbed = buildServerMapEmbed;
