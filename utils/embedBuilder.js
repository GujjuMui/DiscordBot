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

function createCardEmbed(card, index, total) {

    const tags = Array.isArray(card.tags)
        ? card.tags
        : (card.tags ? [card.tags] : []);

    const embed = new EmbedBuilder()

        .setColor("#ff9900")

        .setTitle(`${settings.emojis.allover.cards} ${card.cardName}`)

        .setDescription(`**Character:** ${card.character}`)

        .addFields(

            {
                name: `${settings.emojis.allover.id} Card ID`,
                value: card.cardId || "Unknown",
                inline: true
            },

            {
    name: `${settings.emojis.allover.heart} Favorites`,
    value: String(card.favorites ?? 0),
    inline: true
},
            {
                name: `${settings.emojis.allover.tags} Tags`,
                value: tags.length ? tags.join(", ") : "None"
            }

        )

        .setImage(`attachment://${card.imageFile}`)

        .setFooter({
            text: `Card ${index + 1} of ${total}`
        })

        .setTimestamp();

        

    return {

        embed,

        files: [

            {
                attachment: path.join(
                    process.cwd(),
                    "uploads",
                    "cards",
                    card.imageFile
                ),
                name: card.imageFile
            }

        ]

    };

}

function createArtEmbed(art, index, total) {

    const tags = Array.isArray(art.tags)
        ? art.tags
        : (art.tags ? [art.tags] : []);

    const embed = new EmbedBuilder()

        .setColor("#8e44ad")

        .setTitle(`${settings.emojis.color} ${art.artName}`)

        .setDescription(`**Category:** ${art.category}`)

        .addFields(

            {
                name: `${settings.emojis.allover.id} Art ID`,
                value: art.artId || "Unknown",
                inline: true
            },

            {
                name: `${settings.emojis.allover.heart} Favorites`,
                value: String(art.favorites ?? 0),
                inline: true
            },

             {
                name: `${settings.emojis.allover.file} Category`,
                value: art.category || "General",
                inline: true
            },

            {
                name: `${settings.emojis.allover.tags} Tags`,
                value: tags.length ? tags.join(", ") : "None"
            }

        )

        .setImage(`attachment://${art.imageFile}`)

        .setFooter({
            text: `Art ${index + 1} of ${total}`
        })

        .setTimestamp();

       return {

        embed,

        files: [

            {

                attachment: path.join(
                    process.cwd(),
                    "uploads",
                    "arts",
                    art.imageFile
                ),

                name: art.imageFile

            }

        ]

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

        .setTitle(`${settings.emojis.allover.link} ${link.title}`)

        .setDescription(
    `[${settings.emojis.allover.web} Open Link](${url})`
)

        .addFields(

            {
                name: `${settings.emojis.allover.file} Category`,
                value: link.category,
                inline: true
            },

            {
                name: `${settings.emojis.allover.heart} Favorites`,
                value: String(link.favorites ?? 0),
                inline: true
            },

            {
                name: `${settings.emojis.allover.person} Added By`,
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
            .setEmoji(settings.emojis.allover.homebutton)
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("gallery_prev")
            .setEmoji(settings.emojis.allover.leftarrow)
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("gallery_favorite")
            .setEmoji(settings.emojis.allover.heart)
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("gallery_next")
            .setEmoji(settings.emojis.allover.rightarrow)
            .setStyle(ButtonStyle.Secondary)

    );
}

    function createCardGalleryButtons() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("gallery_prev")
            .setEmoji(settings.emojis.allover.leftarrow)
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("gallery_favorite")
            .setEmoji(settings.emojis.allover.heart)
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("gallery_next")
            .setEmoji(settings.emojis.allover.rightarrow)
            .setStyle(ButtonStyle.Secondary)

    );

}

function createArtCategoryMenu(categories) {

    const menu = new StringSelectMenuBuilder()

        .setCustomId("art_category")

        .setPlaceholder("Choose an art category");

    for (const category of categories) {

        menu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(category)
                .setValue(category)
        );

    }

    return new ActionRowBuilder().addComponents(menu);

}

function createCardCategoryMenu(categories) {

    const menu = new StringSelectMenuBuilder()

        .setCustomId("card_category")

        .setPlaceholder("Choose a card category");

    for (const category of categories) {

        menu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(category)
                .setValue(category)
        );

    }

    return new ActionRowBuilder().addComponents(menu);

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
    createArtCategoryMenu,
    createLinkEmbed,
    createLinkCategoryMenu,
    createEditArtButtons,
    createDeleteButtons,
    createCardCategoryMenu,
    createCardGalleryButtons,
    createEditCardButtons
                };