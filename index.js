const {
    Client,
    GatewayIntentBits,
    Collection,
    Events,
    MessageFlags
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const config = require("./config/config");
const connectMongo = require("./database/mongo");
const checkPermission = require("./utils/checkPermission");
const checkAdminPermission = require("./utils/checkAdminPermission");
const trustedCommands = require("./config/protectedCommands");
const adminCommands = require("./config/adminCommands");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const handlerFiles = {
    button: [
        "giveroleButtonHandler",
        "editCardButtonHandler",
        "editArtButtonHandler",
        "deleteArtButtonHandler",
        "verificationButtonHandler",
        "clanButtonHandler",
        "tryoutButtonHandler",
        "categoryMenuButtonHandler",
        "galleryButtonHandler",
        "selfRoleHandler"
    ],
    select: [
        "helpMenuHandler",
        "linkSelectHandler",
        "gallerySelectHandler",
        "selfRoleHandler",
        "selectMenuHandler"
    ],
    modal: [
        "editCardModalHandler",
        "verificationModalHandler",
        "editArtModalHandler",
        "tryoutModalHandler"
    ]
};

const handlerCache = new Map();

function getHandler(name) {
    if (!handlerCache.has(name)) {
        handlerCache.set(name, require(`./events/${name}`));
    }
    return handlerCache.get(name);
}

async function runHandlers(names, interaction) {
    for (const name of names) {
        if (await getHandler(name)(interaction)) return true;
    }
    return false;
}

function logError(label, error) {
    console.error("========== " + label + " ==========");
    console.error(error?.stack || error);
    console.error("=".repeat(label.length + 20));
}

async function replyWithError(interaction, respondToDeferred = true) {
    try {
        if (interaction.deferred) {
            if (!respondToDeferred) return;
            await interaction.editReply({ content: "❌ Something went wrong." });
        } else if (!interaction.replied) {
            await interaction.reply({
                content: "❌ Something went wrong.",
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error("Failed to send error message:");
        console.error(error);
    }
}

// Collection to store commands


// Load commands from all folders
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {

    const commandsPath = path.join(foldersPath, folder);

    if (!fs.statSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {

        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

client.once(Events.ClientReady, () => {

    console.clear();

    console.log("========================================");
    console.log("          HORNET BOT v1.2.0");
    console.log("========================================");
    console.log(`🤖 Logged in as : ${client.user.tag}`);
    console.log("📦 MongoDB      : Connected");
    console.log(`⚡ Commands      : ${client.commands.size}`);
    console.log("👨‍💻 Developer   : Gujju Mui");
    console.log("🟢 Status       : Online");
    console.log("========================================");

});

client.on(Events.GuildMemberAdd, async member => {

    try {

        await require("./events/memberJoinHandler")(member);

    } catch (err) {

        console.error(
            "========== MEMBER JOIN ERROR =========="
        );

        console.error(err);

        console.error(
            "======================================="
        );

    }

});

client.on(Events.MessageCreate, async message => {

    try {

        await require("./events/messageCreate")(message);

    } catch (err) {

        console.error("========== MESSAGE ERROR ==========");
        console.error(err);
        console.error("===================================");

    }

});

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isButton()) {
            try {
                await runHandlers(handlerFiles.button, interaction);
            } catch (error) {
                logError("BUTTON ERROR", error);
                await replyWithError(interaction, false);
            }
            return;
        }

        if (interaction.isStringSelectMenu()) {
            await runHandlers(handlerFiles.select, interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            await runHandlers(handlerFiles.modal, interaction);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        if (
            trustedCommands.includes(interaction.commandName) &&
            !(await checkPermission(interaction))
        ) return;

        if (
            adminCommands.includes(interaction.commandName) &&
            !(await checkAdminPermission(interaction))
        ) return;

        await command.execute(interaction);
    } catch (error) {
        logError("INTERACTION ERROR", error);
        await replyWithError(interaction);
    }
});


// Register diagnostics before starting asynchronous database/login work.
process.on("unhandledRejection", (reason) => {

    console.error("========== UNHANDLED REJECTION ==========");
    console.error(reason);
    console.error("=========================================");

});

process.on("uncaughtException", (err) => {

    console.error("========== UNCAUGHT EXCEPTION ==========");
    console.error(err);
    console.error("========================================");

});

(async () => {

    await connectMongo();

    await client.login(config.token);

})().catch((error) => {
    console.error("========== STARTUP ERROR ==========");
    console.error(error);
    console.error("===================================");
    // A failed login must not leave an idle process with an open MongoDB socket.
    process.exit(1);
});
