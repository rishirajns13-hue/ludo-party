# 🎲 Ludo Party

A small, fun 2-player online Ludo game. It's a static site (GitHub Pages) and the two players connect peer-to-peer with [PeerJS](https://peerjs.com/).

## How to play
1. Open the site and log in with your secret name and password. Ask the person who set it up for these.
2. **Create a room** and send your friend the 6-letter code (or the invite link).
3. Your friend logs in, enters the code and taps **Join**.
4. Tap the dice to roll, then tap a glowing token to move it.

There's also **Play vs Computer** for practice.

## Rules
- You need a 6 to bring a token out. Rolling a 6 gives you another roll, but three 6s in a row skips your turn.
- Landing on an opponent sends their token back to base (💥 BONK!) and gives you an extra roll. Tokens on ★ squares are safe.
- You need the exact number to get home. Getting a token home gives you an extra roll.
- The first player to get all 4 tokens home wins.

## How logins work
`game.js` stores only `sha256(sha256(name:password))`. When a friend joins, their browser sends the inner hash, which can't be worked out from the code. The host then checks it and drops anyone who can't prove they know a password. Rooms take at most 2 players.

## Running locally
Serve the folder with any static server, for example `npx serve .`, and open it in two tabs.
