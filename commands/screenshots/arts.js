const {
    SlashCommandBuilder
} = require("discord.js");

const Art = require("../../database/Art");

const gallery = require("../../services/galleryV2");
const settings = require("../../config/settings");

const {
    createArtCategoryMenu,
} = require("../../utils/embedBuilder");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("arts")
        .setDescription("Browse all SFA artwork"),

    async execute(interaction) {

        await interaction.deferReply();

        const arts = await Art.find().sort({ createdAt: -1 });

        if (arts.length === 0) {

            return interaction.editReply({
                content: settings.emojis.cross + " No artwork found."
            });

        }

        const categories = [...new Set(

    arts
        .map(art => art.category)
        .filter(Boolean)

)].sort();



    const embed = {
        color: 0x8e44ad,
        title: "🎨 Browse SFA Artwork",
        description:
            "Select a category from the dropdown below."
    };

    await interaction.editReply({

    embeds: [embed],

    components: [
        createArtCategoryMenu(categories)
    ]

});    

    }

};