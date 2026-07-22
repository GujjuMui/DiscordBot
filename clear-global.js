const { REST, Routes } = require("discord.js");
require("dotenv").config();

const settings = require("./config/settings");

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {

    try {

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );

        console.log(settings.emojis.check + " Global commands removed.");

    } catch (err) {

        console.error(err);

    }

})();