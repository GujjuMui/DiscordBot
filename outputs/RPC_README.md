# Karan Aujla Rich Presence (RPC) Guide

Bot accounts on Discord cannot render native Spotify scrubber bars or Rich Presence music player cards because Discord restricts Rich Presence activity widgets (`activity.type = 0` / Playing) with buttons, start/end timestamps, and album artworks to **User Applications** connected via local IPC (Rich Presence API). Standard Discord bot tokens are bound to Gateway bot sessions, which only support basic presence statuses like `ActivityType.Listening`.

To get a native music player card with progress bars, album artwork, and interactive buttons, you must run a **Local Rich Presence Client** authenticated under a Discord Application Client ID.

---

## 1. Setup Instructions

1. **Create a Discord Application:**
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
   - Click **New Application**, name it `Karan Aujla Music Player` (or similar), and accept the terms.
   - Copy your **Client ID** from the General Information tab.

2. **Upload Rich Presence Assets:**
   - In your application dashboard, go to **Rich Presence -> Art Assets**.
   - Upload your album cover images (e.g., name the image key `making_memories` for the *Making Memories* album, and `four_me` for *Four Me*).
   - Upload a small badge or music note icon (e.g., name the key `music_note`).

3. **Install Dependencies:**
   - Open your project folder in your terminal and install `discord-rpc`:
     ```bash
     npm install discord-rpc
     ```

4. **Configure and Run:**
   - Open `karan_rpc.js` and replace `'YOUR_DISCORD_CLIENT_ID'` with your actual Developer Portal Client ID.
   - Run the script:
     ```bash
     node karan_rpc.js
     ```

---

## View Deliverable
[View your RPC script](computer://C:\Users\vaibhav\Desktop\vibe coding projects\Discord Clan Bot\outputs\karan_rpc.js)
