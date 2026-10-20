const { ActivityType } = require("discord.js");

const karanAujlaSongs = [
    "Softly",
    "Winning Speech",
    "Admiring You",
    "IDK HOW",
    "Try Me",
    "Jatt Mehkma",
    "On Top",
    "Chhoriyan",
    "Don't Look",
    "5 Taara",
    "Mexico",
    "For You"
];

function setRandomPresence(client) {
    const randomSong = karanAujlaSongs[Math.floor(Math.random() * karanAujlaSongs.length)];
    client.user.setPresence({
        activities: [{
            name: randomSong,
            type: ActivityType.Listening
        }],
        status: "online"
    });
}

module.exports = (client) => {
    // Set initial presence
    setRandomPresence(client);

    // Rotate song every 10 minutes
    setInterval(() => {
        setRandomPresence(client);
    }, 10 * 60 * 1000);
};
