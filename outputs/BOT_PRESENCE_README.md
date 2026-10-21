# Displaying Karan Aujla Presence via your Discord Bot

If you want your **Discord Bot** (`HORNET`) itself to display the listening status directly from its bot profile (rather than running a local user RPC client), Discord bots support standard bot status activities using `client.user.setPresence()`.

---

## Technical Limitations to Keep in Mind
- **What bots CAN do:** Set `ActivityType.Listening` showing the track name and artist in the bot's profile status text (e.g. `🎵 Listening to Softly - Karan Aujla`).
- **What bots CANNOT do:** Render interactive buttons ("Listen to this song"), custom uploaded album art image keys from the Developer Portal, or countdown scrubber progress bars (`start`/`end` timestamps). Those features are strictly reserved for User Rich Presence IPC connections.

---

## Implementation in your Bot (`index.js`)

Your bot already includes this module under `utils/presence.js`. Here is how it is structured and hooked into your main `index.js`:

### 1. The Presence Helper (`utils/presence.js`)
```javascript
const { ActivityType } = require('discord.js');

const karanAujlaSongs = [
    { title: "Winning Speech", album: "Making Memories" },
    { title: "Softly", album: "Making Memories" },
    { title: "52 Bars", album: "Four Me" }
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

    client.once('ready', () => {
        updatePresence();
        // Rotate every 10 minutes
        setInterval(updatePresence, 10 * 60 * 1000);
    });
};
```

### 2. Initialization in `index.js`
In your main `index.js`, pass the Discord client when the bot successfully boots:
```javascript
const presence = require('./utils/presence');

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    presence(client);
});
```

---

## View Deliverable
[View bot presence code](computer://C:\Users\vaibhav\Desktop\vibe coding projects\Discord Clan Bot\outputs\presence_bot.js)
