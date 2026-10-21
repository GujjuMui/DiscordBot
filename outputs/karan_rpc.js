const RPC = require('discord-rpc');
const clientId = 'YOUR_DISCORD_CLIENT_ID';

const client = new RPC.Client({ transport: 'ipc' });

const karanAujlaPlaylist = [
    {
        title: "Winning Speech",
        album: "Making Memories",
        start: Date.now(),
        end: Date.now() + 215 * 1000, // 3m 35s
        largeImageKey: "making_memories",
        largeImageText: "Making Memories (2023)",
        smallImageKey: "music_note",
        smallImageText: "Playing on Repeat",
        trackUrl: "https://open.spotify.com/track/3XU5XzuSK1hv7M6Vb5BfV0"
    },
    {
        title: "Softly",
        album: "Making Memories",
        start: Date.now(),
        end: Date.now() + 158 * 1000, // 2m 38s
        largeImageKey: "making_memories",
        largeImageText: "Making Memories (2023)",
        smallImageKey: "music_note",
        smallImageText: "Playing on Repeat",
        trackUrl: "https://open.spotify.com/track/1A2K1K1K1K1K1K1K1K1K1K"
    },
    {
        title: "52 Bars",
        album: "Four Me",
        start: Date.now(),
        end: Date.now() + 185 * 1000, // 3m 05s
        largeImageKey: "four_me",
        largeImageText: "Four Me (2022)",
        smallImageKey: "music_note",
        smallImageText: "Playing on Repeat",
        trackUrl: "https://open.spotify.com/track/2B2K2K2K2K2K2K2K2K2K2K"
    }
];

let currentIndex = 0;

async function setActivity() {
    if (!client) return;

    const track = karanAujlaPlaylist[currentIndex];
    // Recalculate timestamps for a live ticking progress bar
    const now = Date.now();
    const duration = track.end - track.start;
    track.start = now;
    track.end = now + duration;

    try {
        await client.setActivity({
            details: track.title,
            state: `by Karan Aujla • ${track.album}`,
            startTimestamp: track.start,
            endTimestamp: track.end,
            largeImageKey: track.largeImageKey,
            largeImageText: track.largeImageText,
            smallImageKey: track.smallImageKey,
            smallImageText: track.smallImageText,
            buttons: [
                { label: "Listen on Spotify", url: track.trackUrl }
            ]
        });
        console.log(`[RPC] Updated presence to: ${track.title} - Karan Aujla`);
    } catch (err) {
        console.error("Failed to set activity:", err);
    }

    currentIndex = (currentIndex + 1) % karanAujlaPlaylist.length;
}

client.on('ready', () => {
    console.log('Karan Aujla Rich Presence client is logged in and active!');
    setActivity();
    // Rotate track every 3.5 minutes
    setInterval(setActivity, 210 * 1000);
});

client.login({ clientId }).catch(console.error);
