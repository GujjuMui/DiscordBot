const {
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    TextDisplayBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const settings = require("../config/settings");

function buildSelfRolePanel(guild) {

         const factionEmojis = {

    Legion: "🛡️",
    Dynasty: "🐉",
    Herald: "⚔️"

};

    const factionOptions = Object.values(settings.roles.faction)

    .map(roleId => guild.roles.cache.get(roleId))

    .filter(Boolean)

    .map(role => ({

    label: role.name,

    value: role.id,

    emoji: factionEmojis[role.name] ?? "⚔️",

    description: `Join the ${role.name} faction`,

}));

        const colorEmojis = {

    Red: "🔴",
    Black: "⚫",
    Cyan: "🔹",
    Pink: "🩷",
    Orange: "🟠",
    Brown: "🟤",
    Blue: "🔵",
    Green: "🟢",
    Violet: "🟣",
    Yellow: "🟡"

};

const colorOptions = Object.values(settings.roles.color)

    .map(roleId => guild.roles.cache.get(roleId))

    .filter(Boolean)

    .map(role => ({

    label: role.name,

    value: role.id,

    emoji: colorEmojis[role.name] ?? "🎨",

    description: `Choose the ${role.name} color role`,

}));

    const pingOptions = Object.entries(settings.roles.ping)

    .map(([key, roleId]) => {

        const role = guild.roles.cache.get(roleId);

        if (!role) return null;

        const descriptions = {

            giveaway: "Get notified about giveaways",
            announcement: "Important server announcements",
            clanUpdate: "Clan news and updates",
            serverUpdate: "Server update notifications",
            friendlyAS: "Asian friendly match pings",
            friendlyEU: "European friendly match pings"

        };

        const emojis = {

            giveaway: "🎉",
            announcement: "📢",
            clanUpdate: "⚔️",
            serverUpdate: "📰",
            friendlyAS: "🌏",
            friendlyEU: "🌍"

        };

        return {

    label: role.name,

    value: role.id,

    emoji: emojis[key] ?? "🔔",

    description: descriptions[key] ?? "Receive notifications",

};
    })

    .filter(Boolean);

        const container = new ContainerBuilder()

        .setAccentColor(0x5865F2)

        // =========================
        // MAIN
        // =========================

        .addMediaGalleryComponents(

            gallery => gallery.addItems(

                new MediaGalleryItemBuilder()

                    .setURL(settings.selfRoles.banners.main)

            )

        )

        .addTextDisplayComponents(

            text => text.setContent(
`# 🎭 HORNET SELF ROLES

Welcome!

Customize your profile below.

• One Color
• One Faction
• Multiple Ping Roles`
            )

        )

        // =========================
        // COLOR
        // =========================

        .addMediaGalleryComponents(

            gallery => gallery.addItems(

                new MediaGalleryItemBuilder()

                    .setURL(settings.selfRoles.banners.color)

            )

        )

        .addTextDisplayComponents(

            text => text.setContent(
`### 🎨 Color Roles

Choose **one** color role. Selecting another color will automatically remove the previous one.`
            )

        )

        .addActionRowComponents(

            new ActionRowBuilder()

                .addComponents(

                    new StringSelectMenuBuilder()

                        .setCustomId("selfroles_color")

                        .setPlaceholder("Select your color...")

                        .addOptions(colorOptions)

                )

        )
     
        // =========================
        // FACTION
        // =========================

        .addMediaGalleryComponents(

            gallery => gallery.addItems(

                new MediaGalleryItemBuilder()

                    .setURL(settings.selfRoles.banners.faction)

            )

        )

        .addTextDisplayComponents(

            text => text.setContent(
`### ⚔️ Faction Roles

Choose **one** faction role. Selecting another faction will automatically remove the previous one.`
            )

        )

        .addActionRowComponents(

            new ActionRowBuilder()

                .addComponents(

                    new StringSelectMenuBuilder()

                        .setCustomId("selfroles_faction")

                        .setPlaceholder("Select your faction...")

                        .addOptions(factionOptions)

                )

        )   
    
                // =========================
        // PING
        // =========================

        .addMediaGalleryComponents(

            gallery => gallery.addItems(

                new MediaGalleryItemBuilder()

                    .setURL(settings.selfRoles.banners.ping)

            )

        )

        .addTextDisplayComponents(

            text => text.setContent(
`### 📢 Ping Roles

Select the notifications you would like to receive.

You can choose multiple roles.`
            )

        )

        .addActionRowComponents(

            new ActionRowBuilder()

                .addComponents(

                    new StringSelectMenuBuilder()

                        .setCustomId("selfroles_ping")

                        .setPlaceholder("Select your ping roles...")

                        .setMinValues(0)

                        .setMaxValues(pingOptions.length)

                        .addOptions(pingOptions)

                )

        )

        .addActionRowComponents(

            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId("selfroles_remove_ping")

                        .setLabel("Remove All Ping Roles")

                        .setStyle(ButtonStyle.Danger)

                )

        )

        ;

    return {
        components: [container]
    };

}

module.exports = buildSelfRolePanel;