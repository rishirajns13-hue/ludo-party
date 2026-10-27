# 💥 Bonk Club

Tiny games for big goofballs. A private little game collection for a few friends. It's a static site (GitHub Pages), and players connect through encrypted messages relayed by a public MQTT broker. Built for laptops first, and it works on phones too.

## Getting in
Open the site and log in with your secret name and password. Ask the person who set it up for these. You stay logged in on that device. Pick a game from the home screen, or paste a friend's room code into **Got a code from a friend?** and you'll land in the right game.

## 🖍️ Doodle Duel (the quick one)
One player secretly draws a word, everyone else races to guess it.
1. **New game** makes a room. Share the code (it starts with D). 2–4 players.
2. The host picks turns each, time to draw and the word packs: *Easy peasy*, *Silly stuff*, *Desi*, or your own **Inside jokes**.
3. The drawer picks one of three words. Everyone else types guesses. **Wrong guesses pop up on the canvas for everyone to see.**
4. Faster guesses score more. The drawer scores for every person who gets it. Letters appear as hints halfway through.
5. After each drawing, stamp it: MASTERPIECE, WHAT IS THIS, MY EYES, 10/10.
6. At the end: a podium, silly awards (Mind Reader, Picasso, Wild Guesser, Modern Artist, Clutch Master) and a gallery of every drawing with the best wrong guess. Save the ones worth framing.

**Chaos twists** (on by default) make some rounds harder: 🙈 the drawer is blindfolded, 🪞 the pen is mirrored, 👻 ink disappears, 🫨 wobbly hand, 📏 straight lines only.

Drawing tools: 10 colours, 3 brush sizes, fill bucket, eraser, undo and clear. On a laptop: Ctrl/Cmd+Z undoes, 1–3 change the brush, E is the eraser, F is fill.

## 🎲 Ludo (the long one)
1. **New game**, share the code, and fill empty seats with bots if you like. 2–4 players; with 4 you can play **Teams (2 v 2)**.
2. Tap the dice to roll, then tap a glowing piece. On a laptop: **Space** rolls, **1–4** moves a piece, **Enter** jumps to the chat.
3. Chat (docked beside the board on a laptop), emoji reactions, stickers and hold-to-talk voice notes.

Rules: you need a 6 to bring a piece out; a 6 gives another roll, but three 6s in a row skips your turn. Landing on an opponent sends them back to base (💥 BONK!) and gives you another roll. ★ squares are safe, and teammates never bonk each other. You need the exact number to get home. First to get all 4 pieces home wins; in teams, both partners must finish.

## If someone leaves
In both games the host's browser runs the game and everyone else keeps a copy. If the host leaves, the next player in seat order takes over automatically and the others reconnect to them. In Ludo a bot plays for anyone who drops out, and the home screen offers **Back to your game**. In Doodle Duel, the round that was being drawn is skipped and the next one starts.

## Your look
Tap your avatar to pick an avatar and a colour palette (Sunset, Lagoon or Lemonade). It applies to every game.

## How logins work
`shared/core.js` stores only `sha256(sha256(name:password))`. When a friend joins, their browser sends the inner hash, which can't be worked out from the code. The host checks it and drops anyone who can't prove they know a password.

## Project layout
- `index.html`, `hub.js`, `hub.css`: the Bonk Club front door (login and game picker)
- `shared/`: design system (`base.css`), login, icons and profile (`core.js`), networking (`net.js`)
- `doodle.html`, `doodle/`: Doodle Duel (`logic.js` is the pure, tested part; `words.js` has the word packs)
- `ludo.html`, `ludo/`: Ludo (`rules.js` is the pure, tested part)
- `concepts/`: design mockups the interface was chosen from

## Running locally
Serve the folder with any static server, for example `npx serve .`, and open it in two tabs. Run the tests with `node --test`.
