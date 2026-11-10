const { REST, Routes } = require("discord.js");
require("dotenv").config();

const config = require("./config/config");

const rest = new REST({ version: "10" }).setToken(config.token);

(async () => {

    try {

        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: [] }
        );

        console.log("✅" + " Global commands removed.");

    } catch (err) {

        console.error(err);

    }

})();
