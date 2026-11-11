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
const { bannerUrl } = require("../services/guildSetup");

// Builds the self-role panel (Components V2 container).
//
// `resolved` is supplied by /selfroles: { groups: { color } (role
// ID map), custom: { factions, pings } (stored per-guild lists —
// each entry { roleId, name, description, emoji }),
// banners: { main, color, faction, ping } (URLs) }. It defaults to
// the static settings so existing callers keep working.
//
// Colour roles are the canonical 10 colours — unchanged. Faction
// and ping options come ONLY from the guild's custom lists
// (services/selfRoleCustom.js); there is no hardcoded faction /
// ping table in this file any more. An entry whose role no longer
// exists in the guild is skipped.
//
// Banner images are Discord CDN URLs the user uploaded — they cannot
// be created. A missing/empty banner simply skips that section's
// gallery; the panel still posts. A section with no roles at all is
// skipped instead of posting an empty select menu (discord.js would
// reject it).

function buildSelfRolePanel(guild, resolved = {}) {

    const groups = resolved.groups || {
        color: settings.roles.color || {}
    };
    const custom = resolved.custom || { factions: [], pings: [] };
    const banners = resolved.banners || settings.selfRoles.banners || {};

    const factionOptions = (custom.factions || [])

        .map(entry => ({ entry, role: guild.roles.cache.get(entry.roleId) }))

        .filter(({ role }) => Boolean(role))

        .map(({ entry, role }) => ({

            label: role.name,

            value: role.id,

            emoji: entry.emoji || "⚔️",

            description: entry.description || `Join the ${role.name} faction`,

        }));

    const colorEmojis = {

        red: "🔴",
        black: "⚫",
        cyan: "🔹",
        pink: "🩷",
        orange: "🟠",
        brown: "🟤",
        blue: "🔵",
        green: "🟢",
        violet: "🟣",
        yellow: "🟡"

    };

    const colorOptions = Object.entries(groups.color || {})

        .map(([key, roleId]) => ({ key, role: guild.roles.cache.get(roleId) }))

        .filter(({ role }) => Boolean(role))

        .map(({ key, role }) => ({

            label: role.name,

            value: role.id,

            emoji: colorEmojis[key] ?? "🎨",

            description: `Choose the ${role.name} color role`,

        }));

    const pingOptions = (custom.pings || [])

        .map(entry => ({ entry, role: guild.roles.cache.get(entry.roleId) }))

        .filter(({ role }) => Boolean(role))

        .map(({ entry, role }) => ({

            label: role.name,

            value: role.id,

            emoji: entry.emoji || "🔔",

            description: entry.description || "Receive notifications",

        }));

    const container = new ContainerBuilder()

        .setAccentColor(0x5865F2);

    // =========================
    // MAIN
    // =========================

    const mainBanner = bannerUrl(banners, "main");
    if (mainBanner) {
        container.addMediaGalleryComponents(

            gallery => gallery.addItems(

                new MediaGalleryItemBuilder()

                    .setURL(mainBanner)

            )

        );
    }

    container.addTextDisplayComponents(

        text => text.setContent(
`# ${"🎭"} HORNET SELF ROLES

Welcome to the self-role panel!

Personalize your profile by selecting:
• A Color Role
• A Faction Role
• Any Ping Roles you wish to receive

-# Your selections can be changed at any time.`
        )

    );

    // =========================
    // COLOR
    // =========================

    if (colorOptions.length) {
        const colorBanner = bannerUrl(banners, "color");
        if (colorBanner) {
            container.addMediaGalleryComponents(

                gallery => gallery.addItems(

                    new MediaGalleryItemBuilder()

                        .setURL(colorBanner)

                )

            );
        }

        container.addTextDisplayComponents(

            text => text.setContent(
`### ${"🎨"} Color Roles

Choose **one** color role. Selecting another color will automatically remove the previous one.`
            )

        );

        container.addActionRowComponents(

            new ActionRowBuilder()

                .addComponents(

                    new StringSelectMenuBuilder()

                        .setCustomId("selfroles_color")

                        .setPlaceholder("Select your color...")

                        .addOptions(colorOptions)

                )

        );
    }

    // =========================
    // FACTION
    // =========================

    if (factionOptions.length) {
        const factionBanner = bannerUrl(banners, "faction");
        if (factionBanner) {
            container.addMediaGalleryComponents(

                gallery => gallery.addItems(

                    new MediaGalleryItemBuilder()

                        .setURL(factionBanner)

                )

            );
        }

        container.addTextDisplayComponents(

            text => text.setContent(
`### ${"⚔️"} Faction Roles

Choose **one** faction role. Selecting another faction will automatically remove the previous one.`
            )

        );

        container.addActionRowComponents(

            new ActionRowBuilder()

                .addComponents(

                    new StringSelectMenuBuilder()

                        .setCustomId("selfroles_faction")

                        .setPlaceholder("Select your faction...")

                        .addOptions(factionOptions)

                )

        );
    }

    // =========================
    // PING
    // =========================

    if (pingOptions.length) {
        const pingBanner = bannerUrl(banners, "ping");
        if (pingBanner) {
            container.addMediaGalleryComponents(

                gallery => gallery.addItems(

                    new MediaGalleryItemBuilder()

                        .setURL(pingBanner)

                )

            );
        }

        container.addTextDisplayComponents(

            text => text.setContent(
`### ${"🔔"} Ping Roles

Select the notifications you would like to receive.

You can choose multiple roles.`
            )

        );

        container.addActionRowComponents(

            new ActionRowBuilder()

                .addComponents(

                    new StringSelectMenuBuilder()

                        .setCustomId("selfroles_ping")

                        .setPlaceholder("Select your ping roles...")

                        .setMinValues(0)

                        .setMaxValues(pingOptions.length)

                        .addOptions(pingOptions)

                )

        );

        container.addActionRowComponents(

            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId("selfroles_remove_ping")

                        .setLabel("Remove All Ping Roles")

                        .setStyle(ButtonStyle.Danger)

                )

        );
    }

    return {
        components: [container]
    };

}

module.exports = buildSelfRolePanel;
