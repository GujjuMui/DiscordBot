// Hornet — entry point. Kept deliberately slim: it wires the client,
// loads the commands, creates the bot context, and delegates.
//   - command scanning lives in utils/loadCommands.js
//   - component dispatch lives in core/router.js
//   - error replies / logging live in utils/discord.js
//   - the 5-minute state sweeper lives in services/stateSweeper.js
//   - shared dependencies live in core/context.js
// Nothing else belongs here.
const {
    Client,
    GatewayIntentBits,
    Collection,
    Events
} = require("discord.js");

const path = require("path");
const config = require("./config/config");
const connectMongo = require("./database/mongo");
const checkPermission = require("./utils/checkPermission");
const checkAdminPermission = require("./utils/checkAdminPermission");
const checkGuildAuth = require("./utils/checkGuildAuth");
const protectedCommands = require("./config/protectedCommands");
const adminCommands = require("./config/adminCommands");
const { loadCommands } = require("./utils/loadCommands");
const { logError, replyWithError } = require("./utils/discord");
const { createRouter } = require("./core/router");
const { createContext } = require("./core/context");
const { startSweeper } = require("./services/stateSweeper");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
for (const [name, command] of loadCommands(path.join(__dirname, "commands"), config)) {
    client.commands.set(name, command);
}

// One shared context for the whole process; the router passes it to
// handlers as their second argument.
const ctx = createContext(client);

const router = createRouter({
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
});

// Prune stale in-memory gallery / menu / auto-reply state every
// 5 minutes so long uptimes cannot grow these Maps without bound.
startSweeper();

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

    // Set initial presence (rotating Karan Aujla Listening status).
    // Lazy require so the module is only loaded once the client is up.
    require("./utils/presence")(client);
});

// Discord client-level errors: log them instead of letting an
// unhandled 'error' event crash the process.
client.on("error", error => {
    console.error("========== DISCORD CLIENT ERROR ==========");
    console.error(error);
    console.error("=========================================");
});

client.on("shardError", error => {
    console.error("========== DISCORD SHARD ERROR ==========");
    console.error(error);
    console.error("========================================");
});

client.on("rateLimit", info => {
    console.warn(`[rateLimit] ${info.method} ${info.route} — retry after ${info.timeToReset}ms (global: ${info.global})`);
});

client.on(Events.GuildMemberAdd, async member => {
    try {
        await require("./events/memberJoinHandler")(member);
    } catch (err) {
        console.error("========== MEMBER JOIN ERROR ==========");
        console.error(err);
        console.error("=======================================");
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
        // Guild authorization check
        if (!(await checkGuildAuth(interaction))) return;

        if (interaction.isButton()) {
            try {
                await router.dispatch("button", interaction, ctx);
            } catch (error) {
                if (error.code === 10062) return; // expired interaction, ignore
                logError("BUTTON ERROR", error);
                await replyWithError(interaction, false);
            }
            return;
        }

        if (interaction.isStringSelectMenu()) {
            try {
                await router.dispatch("select", interaction, ctx);
            } catch (error) {
                logError("SELECT MENU ERROR", error);
                await replyWithError(interaction);
            }
            return;
        }

        if (interaction.isModalSubmit()) {
            try {
                await router.dispatch("modal", interaction, ctx);
            } catch (error) {
                logError("MODAL ERROR", error);
                await replyWithError(interaction);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        if (
            protectedCommands.includes(interaction.commandName) &&
            !(await checkPermission(interaction))
        ) return;

        if (
            adminCommands.includes(interaction.commandName) &&
            !(await checkAdminPermission(interaction))
        ) return;

        await command.execute(interaction);
    } catch (error) {
        if (error.code === 10062) return; // expired interaction, ignore
        logError("INTERACTION ERROR", error);
        await replyWithError(interaction);
    }
});

process.on("unhandledRejection", (reason) => {
    console.error("========== UNHANDLED REJECTION ==========");
    console.error(reason);
    console.error("=========================================");
});

process.on("uncaughtException", (err) => {
    console.error("========== UNCAUGHT EXCEPTION ==========");
    console.error(err);
    console.error("========================================");
    // An uncaught exception leaves the process in an unknown state;
    // exit so the process manager can restart cleanly.
    process.exit(1);
});

(async () => {
    await connectMongo();
    await client.login(config.token);
})().catch((error) => {
    console.error("========== STARTUP ERROR ==========");
    console.error(error);
    console.error("===================================");
    process.exit(1);
});
