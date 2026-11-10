const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const CardRepository = require("../../repositories/CardRepository");
const ArtRepository = require("../../repositories/ArtRepository");

const settings = require("../../config/settings");
const { chunkedEach } = require("../../utils/discord");

const {
    createCardEmbed,
    createArtEmbed
} = require("../../utils/embedBuilder");

// A message is unchanged when the embed Discord already shows
// matches the embed we would write (title, description, fields,
// image). Skipping those edits saves most of the API calls on a
// refresh where nothing actually changed.
function embedMatches(message, embed) {
    const existing = message.embeds?.[0]?.toJSON?.() ?? message.embeds?.[0];
    const fresh = embed.toJSON();
    if (!existing) return false;
    const pick = data => JSON.stringify({
        color: data.color,
        title: data.title,
        description: data.description,
        fields: data.fields,
        image: data.image,
        footer: data.footer
    });
    return pick(existing) === pick(fresh);
}

function isRateLimit(err) {
    return err?.status === 429 || err?.code === 429 || err?.httpStatus === 429;
}

module.exports = {

    data: new SlashCommandBuilder()

        .setName("refreshgallery")

        .setDescription("Refresh all gallery messages.")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addStringOption(option =>
            option

                .setName("type")

                .setDescription("Gallery to refresh")

                .setRequired(true)

                .addChoices(

                    {
                        name: "Cards",
                        value: "cards"
                    },

                    {
                        name: "Artwork",
                        value: "arts"
                    },

                    {
                        name: "All",
                        value: "all"
                    }

                )
        ),

    async execute(interaction) {

        await interaction.deferReply();

        const type =
            interaction.options.getString("type");

        let cardsUpdated = 0;
        let artsUpdated = 0;
        let skipped = 0;
        let failed = 0;
        let rateLimited = 0;

        // Streams documents via a cursor (no unbounded find() held in
        // memory) and refreshes them 3 at a time.
        async function refreshAll(repository, channelName, createEmbed, idField, onUpdated) {
            const channel =
                interaction.guild.channels.cache.find(
                    c => c.name === channelName
                );

            if (!channel)
                throw new Error(
                    `${channelName} channel not found.`
                );

            // listAll() is oldest-first, lean — the refresh already
            // collects the documents before working through them.
            const docs = await repository.listAll();

            const total = docs.length;
            const { failures } = await chunkedEach(docs, 3, async (doc, index) => {
                if (!doc.discordMessageId) return;
                const message = await channel.messages.fetch(doc.discordMessageId).catch(() => null);
                if (!message) {
                    console.error(`Failed to refresh ${idField} ${doc[idField]}: message not found.`);
                    failed++;
                    return;
                }
                const { embed, files } = createEmbed(doc, index, total);
                if (embedMatches(message, embed)) {
                    skipped++;
                    return;
                }
                await message.edit({
                    content: null,
                    embeds: [embed],
                    attachments: [],
                    files,
                    components: []
                });
                onUpdated();
            });

            for (const { item, error } of failures) {
                if (isRateLimit(error)) rateLimited++;
                else failed++;
                console.error(
                    `Failed to refresh ${idField} ${item[idField]}:`,
                    error?.message ?? error
                );
            }
        }

        async function refreshCards() {
            await refreshAll(CardRepository, settings.channels.cards, createCardEmbed, "cardId", () => { cardsUpdated++; });
        }

        async function refreshArts() {
            await refreshAll(ArtRepository, settings.channels.arts, createArtEmbed, "artId", () => { artsUpdated++; });
        }

        try {

            if (type === "cards") {

                await refreshCards();

            } else if (type === "arts") {

                await refreshArts();

            } else {

                await refreshCards();

                await refreshArts();

            }

            await interaction.editReply({

                content:
                    `✅ Gallery refresh completed.\n\n` +
                    `🎴 Cards Updated: **${cardsUpdated}**\n` +
                    `🎨 Artwork Updated: **${artsUpdated}**\n` +
                    `⏭️ Skipped (unchanged): **${skipped}**\n` +
                    `⏳ Rate-limited: **${rateLimited}**\n` +
                    `❌ Failed: **${failed}**`

            });

        } catch (err) {

            console.error("Gallery refresh failed:", err);

            await interaction.editReply({

                content:
                    "❌ Gallery refresh failed. Check the console logs for details."

            });

        }

    }

};
