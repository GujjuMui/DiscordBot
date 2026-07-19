const Card = require("./database/Card");
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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Collection to store commands
client.commands = new Collection();

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
    console.log("👨‍💻 Developer   : Vaibhav Choudhary");
    console.log("🟢 Status       : Online");
    console.log("========================================");

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

   if (interaction.isButton()) {

    try {

        if (await require("./events/editCardButtonHandler")(interaction))
            return;

        if (await require("./events/editArtButtonHandler")(interaction))
            return;

        if (await require("./events/deleteArtButtonHandler")(interaction))
            return;

        if (await require("./events/verificationButtonHandler")(interaction))
            return;

        if (await require("./events/galleryButtonHandler")(interaction))
            return;

        if (await require("./events/buttonHandler")(interaction))
            return;

    } catch (err) {

        console.error("========== BUTTON ERROR ==========");
        console.error(err);
        console.error("==================================");

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({
                content: "❌ Something went wrong.",
                flags: MessageFlags.Ephemeral
            }).catch(() => {});

        }

        return;

    }

}

 if (interaction.isStringSelectMenu()) {

    if (await require("./events/helpMenuHandler")(interaction))
        return;

    if (await require("./events/linkSelectHandler")(interaction))
        return;

    if (await require("./events/gallerySelectHandler")(interaction))
        return;

    return require("./events/selectMenuHandler")(interaction);

}

    if (interaction.isModalSubmit()) {

    if (await require("./events/editCardModalHandler")(interaction)) return;

    if (await require("./events/verificationModalHandler")(interaction))
    return;

    if (await require("./events/editArtModalHandler")(interaction)) return;

}


    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

const checkPermission = require("./utils/checkPermission");
const checkAdminPermission = require("./utils/checkAdminPermission");

const trustedCommands = require("./config/protectedCommands");
const adminCommands = require("./config/adminCommands");

if (

    trustedCommands.includes(interaction.commandName) &&

    !(await checkPermission(interaction))

) return;

if (

    adminCommands.includes(interaction.commandName) &&

    !(await checkAdminPermission(interaction))

) return;

    try {

        await command.execute(interaction);

    } catch (error) {

        console.error("========== REAL ERROR ==========");
        console.error(error.stack || error);
        console.error("===============================");

        try {

           if (interaction.deferred) {

    await interaction.editReply({
        content: "❌ Something went wrong."
    });

} else if (!interaction.replied) {

    await interaction.reply({
        content: "❌ Something went wrong.",
        flags: MessageFlags.Ephemeral
    });

}

        } catch (e) {

            console.error("Failed to send error message:");
            console.error(e);

        }

    }

} );

(async () => {

    await connectMongo();

    await client.login(config.token);

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

})();