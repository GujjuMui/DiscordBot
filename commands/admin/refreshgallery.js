const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const Card = require("../../database/Card");
const Art = require("../../database/Art");

const settings = require("../../config/settings");

const {
    createCardEmbed,
    createArtEmbed,
    createGalleryButtons,
    createCardGalleryButtons
} = require("../../utils/embedBuilder");

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
        let failed = 0;

        async function refreshCards() {

            const channel =
                interaction.guild.channels.cache.find(
                    c => c.name === settings.channels.cards
                );

            if (!channel)
                throw new Error("Cards channel not found.");

            const cards =
                await Card.find().sort({
                    createdAt: 1
                });

            for (let i = 0; i < cards.length; i++) {

                const card = cards[i];

                if (!card.discordMessageId)
                    continue;

                try {

                    const message =
                        await channel.messages.fetch(
                            card.discordMessageId
                        );

                    const {
                        embed,
                        files
                    } = createCardEmbed(
                        card,
                        i,
                        cards.length
                    );

await message.edit({

    content: null,

    embeds: [embed],

    attachments: [],

    files,

    components: []

});

                    cardsUpdated++;

                } catch (err) {

                    console.log(
                        `Failed to refresh card ${card.cardId}:`,
                        err.message
                    );

                    failed++;

                }

            }

        }

                async function refreshArts() {

            const channel =
                interaction.guild.channels.cache.find(
                    c => c.name === settings.channels.arts
                );

            if (!channel)
                throw new Error("Artwork channel not found.");

            const arts =
                await Art.find().sort({
                    createdAt: 1
                });

            for (let i = 0; i < arts.length; i++) {

                const art = arts[i];

                if (!art.discordMessageId)
                    continue;

                try {

                    const message =
                        await channel.messages.fetch(
                            art.discordMessageId
                        );

                    const {
                        embed,
                        files
                    } = createArtEmbed(
                        art,
                        i,
                        arts.length
                    );

await message.edit({

    content: null,

    embeds: [embed],

    attachments: [],

    files,

    components: []

}); 

                    artsUpdated++;

                } catch (err) {

                    console.log(
                        `Failed to refresh art ${art.artId}:`,
                        err.message
                    );

                    failed++;

                }

            }

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
`${settings.emojis.success} Gallery refresh completed.

🎴 Cards Updated: **${cardsUpdated}**
🎨 Artwork Updated: **${artsUpdated}**
❌ Failed: **${failed}**`

            });

        } catch (err) {

            console.error(err);

            await interaction.editReply({

                content:
`${settings.emojis.cross} Gallery refresh failed.\n\n${err.message}`

            });

        }

    }

};