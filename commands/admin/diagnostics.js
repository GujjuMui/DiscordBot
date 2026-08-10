const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const settings = require("../../config/settings");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("diagnostics")

        .setDescription(
            "Check HORNET systems and command health"
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const results = [];

        // ==========================================
        // 1. DISCORD
        // ==========================================

        try {

            if (interaction.client.user) {

                results.push({
                    name: "Discord Connection",
                    status: "🟢",
                    value: "Connected"
                });

            } else {

                results.push({
                    name: "Discord Connection",
                    status: "🔴",
                    value: "Bot user unavailable"
                });

            }

        } catch (error) {

            results.push({
                name: "Discord Connection",
                status: "🔴",
                value: error.message
            });

        }

        // ==========================================
        // 2. MONGODB
        // ==========================================

        try {

            const mongoose = require("mongoose");

            if (mongoose.connection.readyState === 1) {

                results.push({
                    name: "MongoDB",
                    status: "🟢",
                    value: "Connected"
                });

            } else {

                results.push({
                    name: "MongoDB",
                    status: "🔴",
                    value:
                        `Not connected (state ${mongoose.connection.readyState})`
                });

            }

        } catch (error) {

            results.push({
                name: "MongoDB",
                status: "🔴",
                value: error.message
            });

        }

        // ==========================================
        // 3. COMMAND LOADING
        // ==========================================

        try {

            const commandCount =
                interaction.client.commands.size;

            results.push({
                name: "Commands",
                status: "🟢",
                value: `${commandCount} commands loaded`
            });

        } catch (error) {

            results.push({
                name: "Commands",
                status: "🔴",
                value: error.message
            });

        }

        // ==========================================
        // 4. COMMAND STRUCTURE
        // ==========================================

        try {

            let valid = 0;
            let invalid = [];

            for (
                const [
                    name,
                    command
                ] of interaction.client.commands
            ) {

                if (
                    command &&
                    command.data &&
                    typeof command.execute === "function"
                ) {

                    valid++;

                } else {

                    invalid.push(name);

                }

            }

            if (invalid.length === 0) {

                results.push({
                    name: "Command Structure",
                    status: "🟢",
                    value: `${valid}/${valid} valid`
                });

            } else {

                results.push({
                    name: "Command Structure",
                    status: "🔴",
                    value:
                        `${valid} valid, invalid: ${invalid.join(", ")}`
                });

            }

        } catch (error) {

            results.push({
                name: "Command Structure",
                status: "🔴",
                value: error.message
            });

        }

        // ==========================================
        // 5. REQUIRED EVENT HANDLERS
        // ==========================================

        try {

            const eventFiles = [

                "messageCreate.js",

                "editCardButtonHandler.js",
                "editArtButtonHandler.js",
                "deleteArtButtonHandler.js",
                "verificationButtonHandler.js",
                "clanButtonHandler.js",
                "tryoutButtonHandler.js",
                "categoryMenuButtonHandler.js",
                "galleryButtonHandler.js",
                "selfRoleHandler.js",

                "helpMenuHandler.js",
                "linkSelectHandler.js",
                "gallerySelectHandler.js",
                "selectMenuHandler.js",

                "editCardModalHandler.js",
                "verificationModalHandler.js",
                "editArtModalHandler.js",
                "tryoutModalHandler.js"

            ];

            const missing = [];

            for (const file of eventFiles) {

                const filePath =
                    path.join(
                        __dirname,
                        "../../events",
                        file
                    );

                if (!fs.existsSync(filePath)) {

                    missing.push(file);

                }

            }

            if (missing.length === 0) {

                results.push({
                    name: "Event Handlers",
                    status: "🟢",
                    value: `${eventFiles.length}/${eventFiles.length} found`
                });

            } else {

                results.push({
                    name: "Event Handlers",
                    status: "🔴",
                    value:
                        `Missing: ${missing.join(", ")}`
                });

            }

        } catch (error) {

            results.push({
                name: "Event Handlers",
                status: "🔴",
                value: error.message
            });

        }

        // ==========================================
        // 6. CONFIGURATION
        // ==========================================

        try {

            const requiredSettings = [

    ["TOKEN", process.env.TOKEN],

    ["CLIENT_ID", process.env.CLIENT_ID],

    ["TEST_GUILD_ID", process.env.TEST_GUILD_ID],

    ["MAIN_GUILD_ID", process.env.MAIN_GUILD_ID],

    ["MONGO_URI", process.env.MONGO_URI],

    [
        "CLOUDINARY_CLOUD_NAME",
        process.env.CLOUDINARY_CLOUD_NAME
    ],

    [
        "CLOUDINARY_API_KEY",
        process.env.CLOUDINARY_API_KEY
    ],

    [
        "CLOUDINARY_API_SECRET",
        process.env.CLOUDINARY_API_SECRET
    ]

];

            const missing = requiredSettings

                .filter(
                    ([name, value]) => !value
                )

                .map(
                    ([name]) => name
                );

            if (missing.length === 0) {

                results.push({
                    name: "Environment Configuration",
                    status: "🟢",
                    value: "All required variables present"
                });

            } else {

                results.push({
                    name: "Environment Configuration",
                    status: "🔴",
                    value:
                        `Missing: ${missing.join(", ")}`
                });

            }

        } catch (error) {

            results.push({
                name: "Environment Configuration",
                status: "🔴",
                value: error.message
            });

        }

        // ==========================================
        // 7. DATABASE MODELS
        // ==========================================

        try {

            const models = [

                "Card",
                "Art",
                "Link",
                "AutoReply"

            ];

            const loaded = [];

            for (const model of models) {

                try {

                    require(
                        `../../database/${model}`
                    );

                    loaded.push(model);

                } catch {}

            }

            if (loaded.length === models.length) {

                results.push({
                    name: "Database Models",
                    status: "🟢",
                    value:
                        `${loaded.length}/${models.length} loaded`
                });

            } else {

                const missing =
                    models.filter(
                        model => !loaded.includes(model)
                    );

                results.push({
                    name: "Database Models",
                    status: "🔴",
                    value:
                        `Failed: ${missing.join(", ")}`
                });

            }

        } catch (error) {

            results.push({
                name: "Database Models",
                status: "🔴",
                value: error.message
            });

        }

        // ==========================================
        // 8. SERVICES
        // ==========================================

        try {

            const services = [

                "galleryV2",
                "categoryMenuService"

            ];

            const loaded = [];

            for (const service of services) {

                try {

                    require(
                        `../../services/${service}`
                    );

                    loaded.push(service);

                } catch {}

            }

            if (loaded.length === services.length) {

                results.push({
                    name: "Services",
                    status: "🟢",
                    value:
                        `${loaded.length}/${services.length} loaded`
                });

            } else {

                const missing =
                    services.filter(
                        service =>
                            !loaded.includes(service)
                    );

                results.push({
                    name: "Services",
                    status: "🔴",
                    value:
                        `Failed: ${missing.join(", ")}`
                });

            }

        } catch (error) {

            results.push({
                name: "Services",
                status: "🔴",
                value: error.message
            });

        }

        // ==========================================
        // SUMMARY
        // ==========================================

        const failed =
            results.filter(
                result => result.status === "🔴"
            ).length;

        const passed =
            results.length - failed;

        const embed = new EmbedBuilder()

            .setColor(
                failed === 0
                    ? 0x2ecc71
                    : 0xe74c3c
            )

            .setTitle(
                `${"🐝" || "🐝"} HORNET Diagnostics`
            )

            .setDescription(
                failed === 0

                    ? "All automated system checks passed."

                    : "Some system checks failed."
            )

            .addFields(

                results.map(result => ({

                    name:
                        `${result.status} ${result.name}`,

                    value:
                        result.value,

                    inline: false

                }))

            )

            .addFields({

                name: "Summary",

                value:
                    `🟢 Passed: **${passed}**\n` +
                    `🔴 Failed: **${failed}**`

            })

            .setTimestamp();

        await interaction.editReply({

            embeds: [embed]

        });

    }

};