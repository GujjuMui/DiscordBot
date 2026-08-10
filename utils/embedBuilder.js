const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");
const settings = require("../config/settings");

const path = require("path");

function getImageData(folder, imageFile) {

    if (
        imageFile &&
        (imageFile.startsWith("http://") ||
         imageFile.startsWith("https://"))
    ) {

        return {
            image: imageFile,
            files: []
        };

    }

    return {

        image: `attachment://${imageFile}`,

        files: [

            {

                attachment: path.join(
                    process.cwd(),
                    "uploads",
                    folder,
                    imageFile
                ),

                name: imageFile

            }

        ]

    };

}

    function createCardEmbed(card, index, total) {

        const tags = Array.isArray(card.tags)
            ? card.tags
            : (card.tags ? [card.tags] : []);

        const embed = new EmbedBuilder()

            .setColor("#ff9900")

            .setTitle(`${"🎴"} ${card.cardName}`)

            .setDescription(`**Character:** ${card.character}`)

            .addFields(

                {
                    name: `${"🪪"} Card ID`,
                    value: card.cardId || "Unknown",
                    inline: true
                },

                {
        name: `${"❤️"} Favorites`,
        value: String(card.favorites ?? 0),
        inline: true
    },
                {
                    name: `${"🏷️"} Tags`,
                    value: tags.length ? tags.join(", ") : "None"
                }

            )

            const imageData = getImageData("cards", card.imageFile);

            embed.setImage(imageData.image)   

            .setFooter({
                text: `Card ${index + 1} of ${total}`
            })

            .setTimestamp();

            return {

                embed,

                files: imageData.files

            };

    }

    function createArtEmbed(art, index, total) {

        const tags = Array.isArray(art.tags)
            ? art.tags
            : (art.tags ? [art.tags] : []);

        const embed = new EmbedBuilder()

            .setColor("#8e44ad")

            .setTitle(`${"🎨"} ${art.artName}`)

            .setDescription(`**Category:** ${art.category}`)

            .addFields(

                {
                    name: `${"🪪"} Art ID`,
                    value: art.artId || "Unknown",
                    inline: true
                },

                {
                    name: `${"❤️"} Favorites`,
                    value: String(art.favorites ?? 0),
                    inline: true
                },

                {
                    name: `${"📄"} Category`,
                    value: art.category || "General",
                    inline: true
                },

                {
                    name: `${"🏷️"} Tags`,
                    value: tags.length ? tags.join(", ") : "None"
                }

            )

        const imageData = getImageData("arts", art.imageFile);

        embed.setImage(imageData.image)

        .setFooter({
            text: `Art ${index + 1} of ${total}`
        })

        .setTimestamp();

        return {

            embed,

            files: imageData.files

        };

}

function createLinkEmbed(link, index, total) {

    let url = link.url;

    if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
    ) {
        url = `https://${url}`;
    }

    const embed = new EmbedBuilder()

        .setColor("#00b894")

        .setTitle(`${"🔗"} ${link.title}`)

        .setDescription(
    `[${"🌐"} Open Link](${url})`
)

        .addFields(

            {
                name: `${"📄"} Category`,
                value: link.category,
                inline: true
            },

            {
                name: `${"❤️"} Favorites`,
                value: String(link.favorites ?? 0),
                inline: true
            },

            {
                name: `${"👤"} Added By`,
                value: `<@${link.addedById}>`
            }

        )

        .setFooter({
            text: `Link ${index + 1} of ${total}`
        })

        .setTimestamp();

    return {

        embed,

        files: []

    };

}

function createGalleryButtons() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("gallery_back")
            .setEmoji("🏠")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("gallery_prev")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("gallery_favorite")
            .setEmoji("❤️")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("gallery_next")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)

    );
}

    function createCardGalleryButtons() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("gallery_prev")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("gallery_favorite")
            .setEmoji("❤️")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("gallery_next")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)

    );

}

function createCategoryMenu(type, categories, page = 0) {

    const PAGE_SIZE = 25;

    const totalPages = Math.ceil(categories.length / PAGE_SIZE);

    const start = page * PAGE_SIZE;

    const pageCategories = categories.slice(
        start,
        start + PAGE_SIZE
    );

    const menu = new StringSelectMenuBuilder()

        .setCustomId(`${type}_category`)

        .setPlaceholder(
            `Choose a ${type.slice(0, -1)} category (Page ${page + 1}/${totalPages})`
        );

    for (const category of pageCategories) {

        menu.addOptions(

            new StringSelectMenuOptionBuilder()

                .setLabel(category)

                .setValue(category)

        );

    }

    const row1 = new ActionRowBuilder()

        .addComponents(menu);

    if (totalPages === 1)

        return [row1];

    const row2 = new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()

                .setCustomId(`${type}_category_prev`)

                .setLabel("◀ Previous")

                .setStyle(ButtonStyle.Secondary)

                .setDisabled(page === 0),

            new ButtonBuilder()

                .setCustomId(`${type}_category_next`)

                .setLabel("Next ▶")

                .setStyle(ButtonStyle.Secondary)

                .setDisabled(page >= totalPages - 1)

        );

    return [

        row1,

        row2

    ];

}

function createLinkCategoryMenu(categories) {

    const menu = new StringSelectMenuBuilder()

        .setCustomId("link_category")

        .setPlaceholder("Choose a link category");

    for (const category of categories) {

        menu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(category)
                .setValue(category)
        );

    }

    return new ActionRowBuilder().addComponents(menu);

}

function createEditArtButtons() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("edit_art_name")
            .setLabel("Name")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("edit_art_category")
            .setLabel("Category")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("edit_art_tags")
            .setLabel("Tags")
            .setStyle(ButtonStyle.Primary)

    );

}

    function createEditCardButtons() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("edit_card_name")
            .setLabel("Name")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("edit_card_character")
            .setLabel("Character")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("edit_card_category")
            .setLabel("Category")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("edit_card_tags")
            .setLabel("Tags")
            .setStyle(ButtonStyle.Primary)
        );

}

function createDeleteButtons() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("delete_confirm")
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("delete_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)

    );

}

module.exports = {
    createCardEmbed,
    createArtEmbed,
    createGalleryButtons,
    createCategoryMenu,
    createLinkEmbed,
    createLinkCategoryMenu,
    createEditArtButtons,
    createDeleteButtons,
    createCardGalleryButtons,
    createEditCardButtons
                };