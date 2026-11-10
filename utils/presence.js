const { ActivityType } = require("discord.js");

// Songs the bot cycles through as its Listening presence.
// Kept as a plain list so the presence can be refreshed without a
// redeploy of the status logic itself.
const karanAujlaSongs = [
    "Tauba Tauba",
    "Softly",
    "Winning Speech",
    "Admirin' You",
    "Try Me",
    "Courtside",
    "Antidote",
    "Wavy",
    "Players",
    "For A Reason",
    "Bachke Bachke",
    "God Damn"
];

let currentIndex = 0;
let interval = null;

function setPresence(client) {
    const song = karanAujlaSongs[currentIndex % karanAujlaSongs.length];
    currentIndex += 1;
    try {
        client.user.setActivity(song, { type: ActivityType.Listening });
    } catch (err) {
        console.error("[presence] Failed to set activity:", err.message);
    }
}

// Set the initial presence immediately, then rotate to the next
// Karan Aujla song every 10 minutes. The interval is unref'd so it
// never keeps the process alive on its own, and calling this twice
// (e.g. on a reconnect) does not stack intervals.
module.exports = function startPresence(client) {
    if (!client?.user) return;
    setPresence(client);
    if (interval) clearInterval(interval);
    interval = setInterval(() => setPresence(client), 10 * 60 * 1000);
    if (typeof interval.unref === "function") interval.unref();
};

module.exports.karanAujlaSongs = karanAujlaSongs;
