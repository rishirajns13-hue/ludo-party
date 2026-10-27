# 🎲 Ludo Party

A small, fun online Ludo game for 2 to 4 friends. It's a static site (GitHub Pages), and players connect through encrypted messages relayed by a public MQTT broker.

## How to play
1. Open the site and log in with your secret name and password. Ask the person who set it up for these. You stay logged in on that device.
2. Tap **New game** and share the 6-letter code (or the invite link) with up to 3 friends.
3. Friends log in, enter the code and tap **Join**. Empty seats can be filled with bots.
4. With 4 players you can switch on **Teams (2 v 2)**: seats 1 and 3 play against seats 2 and 4.
5. The host taps **Start game**. Tap the dice to roll, then tap a glowing piece to move it.

There's also **Practice against a bot**.

## During a game
- The board turns so your pieces always start in the bottom-left corner.
- **Chat:** tap *Message…* to open the chat. Messages also pop up next to the sender's name.
- **Reactions:** tap the smiley button and pick an emoji, or hold it, slide and let go.
- **Stickers:** the big stickers in the chat slam onto everyone's screen.
- **Voice notes:** hold the mic button while you talk and let go to send. It plays on the other phones. The browser asks for microphone access the first time.
- If someone drops out, a bot plays for them until they come back. If you close the app mid-game, the home screen shows **Back to your game**.
- If the host leaves, the next player in seat order takes over hosting automatically and the game carries on. Nobody has to keep the app open for the others.

## Rules
- You need a 6 to bring a piece out. Rolling a 6 gives you another roll, but three 6s in a row skips your turn.
- Landing on an opponent sends their piece back to base (💥 BONK!) and gives you an extra roll. Pieces on ★ squares are safe. Teammates never bonk each other.
- You need the exact number to get home. Getting a piece home gives you an extra roll.
- The first player to get all 4 pieces home wins. In teams, a team wins when both partners are home; a player who finishes first is skipped until their partner catches up.

## Your look
Tap your avatar on the home screen to pick an avatar and a colour palette (Sunset, Lagoon or Lemonade). The all-time score against your friends is kept on each device.

## How logins work
`game.js` stores only `sha256(sha256(name:password))`. When a friend joins, their browser sends the inner hash, which can't be worked out from the code. The host checks it and drops anyone who can't prove they know a password.

The host's browser runs the game; everyone else keeps a copy of the latest state. When the host's connection closes, the remaining players agree on the next host (first in seat order) and reconnect to it on a fresh channel, so an old host coming back can't clash with the new one. Rooms take at most 4 players.

## Running locally
Serve the folder with any static server, for example `npx serve .`, and open it in two tabs. Run the rules tests with `node --test`.

`concepts/` holds the design mockups the current interface was chosen from.
