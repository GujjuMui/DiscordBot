const { ActivityType } = require('discord.js');

const karanAujlaSongs = [
    { title: "Winning Speech", album: "Making Memories" },
    { title: "Softly", album: "Making Memories" },
    { title: "52 Bars", album: "Four Me" },
    { title: "IDK HOW", album: "Making Memories" },
    { title: "Admiring You", album: "Making Memories" }
];

let songIndex = 0;

module.exports = (client) => {
    function updatePresence() {
        if (!client.user) return;

        const song = karanAujlaSongs[songIndex];

        client.user.setPresence({
            activities: [
                {
                    name: `${song.title} - Karan Aujla`,
                    type: ActivityType.Listening,
                    state: `Album: ${song.album}`
                }
            ],
            status: 'online'
        });

        songIndex = (songIndex + 1) % karanAujlaSongs.length;
    }

    // Set initial presence when ready
    client.once('ready', () => {
        updatePresence();
        // Rotate every 10 minutes
        setInterval(updatePresence, 10 * 60 * 1000);
    });
};
