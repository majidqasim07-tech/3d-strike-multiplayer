# 3D Strike Multiplayer

A browser-based 3D first-person multiplayer starter for desktop, mobile and tablets.

## Included
- Public quick-match room
- Private rooms using a shareable room code
- Up to 10 players per room
- Basic player movement and live state sync
- Server-side hit checks, health, kills and respawns
- Desktop keyboard/mouse and mobile touch controls
- Three.js 3D arena prototype

## Run locally
1. Install Node.js 18 or newer.
2. Extract this ZIP.
3. Open a terminal in this folder.
4. Run `npm install`
5. Run `npm start`
6. Open `http://localhost:3000`

To test multiplayer locally, open the address in two browser tabs or on two devices connected to the same network (use your computer's LAN IP on the second device).

## Put it online
Deploy this Node.js project to a host that supports long-lived WebSocket connections (for example, a Node-capable VPS or app host). Set the start command to `npm start`, expose the assigned port, and use the HTTPS URL. Share that URL with friends.

## Important prototype limitations
This is a playable multiplayer foundation, not a finished commercial FPS. It uses simple 3D character models and an arena. It does not yet include accounts, matchmaking queues, anti-cheat, lag compensation, voice chat, weapon inventory, detailed realistic character animations, or production-grade authoritative physics. Public internet play requires hosting the server online. For a production release, add authentication, rate limits, server-side movement simulation, validation, monitoring, and load testing.