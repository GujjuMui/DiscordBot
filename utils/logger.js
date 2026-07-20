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

    newValue,

    fields

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
    heading = `${settings.emojis.success} CARD CREATED`;
    break;

case "CARD_EDIT":
    color = "#f1c40f";
    heading = `${settings.emojis.warning} CARD EDITED`;
    break;

case "CARD_DELETE":
    color = "#e74c3c";
    heading = `${settings.emojis.delete} CARD DELETED`;
    break;

case "ART_CREATE":
    color = "#2ecc71";
    heading = `${settings.emojis.success} ART CREATED`;
    break;

case "ART_EDIT":
    color = "#f1c40f";
    heading = `${settings.emojis.warning} ART EDITED`;
    break;

case "ART_DELETE":
    color = "#e74c3c";
    heading = `${settings.emojis.delete} ART DELETED`;
    break;

case "LINK_CREATE":
    color = "#2ecc71";
    heading = `${settings.emojis.success} LINK CREATED`;
    break;

case "LINK_DELETE":
    color = "#e74c3c";
    heading = `${settings.emojis.delete} LINK DELETED`;
    break;

case "TRUST_ADD":
    color = "#3498db";
    heading = `${settings.emojis.info} TRUST ADDED`;
    break;

case "TRUST_REMOVE":
    color = "#e67e22";
    heading = `${settings.emojis.warning} TRUST REMOVED`;
    break;

case "SETUP":
    color = "#9b59b6";
    heading = `${settings.emojis.system} SETUP EXECUTED`;
    break;

case "VERIFY":
    color = "#2ecc71";
    heading = `${settings.emojis.success} USER VERIFIED`;
    break;

case "CLAN_JOIN":
    color = "#2ecc71";
    heading = `${settings.emojis.success} CLAN JOIN`;
    break;

case "TRYOUT_PASS":
    color = "#57F287";
    heading =   `${settings.emojis.success} TRYOUT PASS`;
    break;

case "TRYOUT_FAIL":
    color = "#ED4245";
    heading = `${settings.emojis.delete} TRYOUT FAIL` ;
    break;

case "MEMBER_ADD":
    color = "#57F287";
    heading = `${settings.emojis.success} MEMBER ADDED`;
    break;

case "MEMBER_REMOVE":
    color = "#ED4245";
    heading = `${settings.emojis.delete} MEMBER REMOVED`;
    break;

case "MEMBER_TRANSFER":
    color = "#FEE75C";
    heading = `${settings.emojis.info} MEMBER TRANSFERRED`;
    break;

}

    if (!heading) {
    heading = type;
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

    if (fields && fields.length) {

    embed.addFields(fields);

    }

    embed.addFields({

        name: "👤 Performed By",

        value: `<@${user.id}>`

    });

    await channel.send({

        embeds: [embed]

    });

};