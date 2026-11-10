// One shared command scanner for index.js, deploy-commands.js and
// commands/admin/sync.js. Scans commands/<folder>/*.js, keeps only
// modules with `data` + `execute`, drops duplicates (first wins),
// and applies the feature flags from config.js:
//   channelmanager -> features.channelManager
//   broadcast      -> features.broadcast
//   mod / bulkban  -> features.moderation
// A single bad file is logged and skipped — it must never kill startup
// or a deploy. Returns a Map keyed by command name.
const fs = require("fs");
const path = require("path");

function isFeatureEnabled(config, cmdName) {
    const features = config?.features || {};
    if (cmdName === "channelmanager" && features.channelManager === false) return false;
    if (cmdName === "broadcast" && features.broadcast === false) return false;
    if ((cmdName === "mod" || cmdName === "bulkban") && features.moderation === false) return false;
    return true;
}

function loadCommands(commandsRoot, config) {
    const commandMap = new Map();
    let folders;
    try {
        folders = fs.readdirSync(commandsRoot);
    } catch (err) {
        console.error(`[loadCommands] Cannot read commands folder ${commandsRoot}:`, err.message);
        return commandMap;
    }

    for (const folder of folders) {
        const commandsPath = path.join(commandsRoot, folder);
        let stat;
        try {
            stat = fs.statSync(commandsPath);
        } catch {
            continue;
        }
        if (!stat.isDirectory()) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            let command;
            try {
                command = require(filePath);
            } catch (err) {
                console.error(`[loadCommands] Skipping ${filePath}: failed to load:`, err.message);
                continue;
            }
            if (!command || !("data" in command) || !("execute" in command)) {
                console.log(`⚠️ ${file} is missing "data" or "execute".`);
                continue;
            }
            const cmdName = command.data.name;
            if (!isFeatureEnabled(config, cmdName)) continue;
            if (commandMap.has(cmdName)) {
                console.log(`⚠️ Duplicate command name "${cmdName}" found in ${file}. Skipping.`);
                continue;
            }
            commandMap.set(cmdName, command);
        }
    }
    return commandMap;
}

module.exports = { loadCommands, isFeatureEnabled };
