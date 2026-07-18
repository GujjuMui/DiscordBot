const { EmbedBuilder } = require("discord.js");
const settings = require("../config/settings");

module.exports = async ({

    guild,
    client,

    type,

    user,

    id,

    title,

    field,

    oldValue,

    newValue

}) => {

    const channel = guild.channels.cache.find(
        c => c.name === settings.channels.logs
    );

    if (!channel) return;

    let color = "#3498db";
    let heading = "";

    switch (type) {

        case "CARD_CREATE":
            color = "#2ecc71";
            heading = "🟢 CARD CREATED";
            break;

        case "CARD_EDIT":
            color = "#f1c40f";
            heading = "🟡 CARD EDITED";
            break;

        case "CARD_DELETE":
            color = "#e74c3c";
            heading = "🔴 CARD DELETED";
            break;

        case "ART_CREATE":
            color = "#2ecc71";
            heading = "🟢 ART CREATED";
            break;

        case "ART_EDIT":
            color = "#f1c40f";
            heading = "🟡 ART EDITED";
            break;

        case "ART_DELETE":
            color = "#e74c3c";
            heading = "🔴 ART DELETED";
            break;

        case "LINK_CREATE":
            color = "#2ecc71";
            heading = "🟢 LINK CREATED";
            break;

        case "LINK_DELETE":
            color = "#e74c3c";
            heading = "🔴 LINK DELETED";
            break;

        case "TRUST_ADD":
            color = "#3498db";
            heading = "🔵 TRUST ADDED";
            break;

        case "TRUST_REMOVE":
            color = "#e67e22";
            heading = "🟠 TRUST REMOVED";
            break;

        case "SETUP":
            color = "#9b59b6";
            heading = "🟣 SETUP EXECUTED";
            break;

    }

    const embed = new EmbedBuilder()

        .setColor(color)

        .setTitle(heading)

        .setTimestamp()

        .setFooter({

            text: "HORNET Logs"

        });

    if (id) {

        embed.addFields({

            name: "🆔 ID",

            value: id,

            inline: true

        });

    }

    if (title) {

        embed.addFields({

            name: "📄 Name",

            value: title,

            inline: true

        });

    }

    if (field) {

        embed.addFields({

            name: "✏️ Field",

            value: field,

            inline: true

        });

    }

    if (oldValue !== undefined) {

        embed.addFields({

            name: "⬅️ Old",

            value: String(oldValue),

            inline: true

        });

    }

    if (newValue !== undefined) {

        embed.addFields({

            name: "➡️ New",

            value: String(newValue),

            inline: true

        });

    }

    embed.addFields({

        name: "👤 Performed By",

        value: `<@${user.id}>`

    });

    await channel.send({

        embeds: [embed]

    });

};