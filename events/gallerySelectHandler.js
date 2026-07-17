const Art = require("../database/Art");
const gallery = require("../services/galleryV2");

const {
    createArtEmbed,
    createGalleryButtons
} = require("../utils/embedBuilder");

module.exports = async (interaction) => {

    if (!interaction.isStringSelectMenu()) return false;

    if (interaction.customId !== "art_category") return false;

    await interaction.deferUpdate();

    const category = interaction.values[0];

    const arts = await Art.find({
        category
    }).sort({ createdAt: -1 });

    if (!arts.length) {

        await interaction.editReply({
    content: "❌ No artwork found."
});

        return true;
    }

    gallery.open(interaction.user.id, {
        type: "arts",
        items: arts,
        categories: true
    });

    const { embed, files } = createArtEmbed(
    arts[0],
    0,
    arts.length
);

await interaction.editReply({

    embeds: [embed],

    files,

    components: [
        createGalleryButtons()
    ]

});

    return true;

};