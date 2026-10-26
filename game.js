'use strict';
const R = window.LudoRules;
const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ================= accounts =================
   Only sha256(proof) is stored, where proof = sha256(lower(name) + ':' + password).
   A joining friend must send the proof itself, which can't be derived from this file. */
const ACCOUNTS = {
  'panjara kunju': { name: 'Panjara Kunju', hash: '8efc12f3e0136b0273c8a696fc0bded3c3ea73770334b251b77c2e7cdce92f3a' },
  ammu: { name: 'Ammu', hash: 'eeb63f1ee20923f64678e8aaba9d54eb1bb6fffa6dad7ded0345dd1dea393890' },
};
const PEER_PREFIX = 'ludo-party-rr7-';
const EMOJIS = ['😂', '🔥', '😭', '👏', '😈', '🫡'];
const COLORS = { red: '#ff5a5f', green: '#2bc48a', yellow: '#ffc233', blue: '#4d9de0' };
const INK = '#2b2140';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const makeProof = (user, pass) => sha256(user.trim().toLowerCase() + ':' + pass);
async function checkProof(user, proof) {
  const acc = typeof user === 'string' && ACCOUNTS[user.trim().toLowerCase()];
  return acc && typeof proof === 'string' && acc.hash === (await sha256(proof)) ? acc.name : null;
}

/* ================= board geometry (cell units, 15x15) ================= */
const TRACK = [];
function seg(c0, r0, c1, r1) {
  const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
  for (let c = c0, r = r0; ; c += dc, r += dr) { TRACK.push([c, r]); if (c === c1 && r === r1) break; }
}
seg(1, 6, 5, 6); seg(6, 5, 6, 0); seg(7, 0, 7, 0); seg(8, 0, 8, 5); seg(9, 6, 14, 6); seg(14, 7, 14, 7);
seg(14, 8, 9, 8); seg(8, 9, 8, 14); seg(7, 14, 7, 14); seg(6, 14, 6, 9); seg(5, 8, 0, 8); seg(0, 7, 0, 7); seg(0, 6, 0, 6);

const HOME_COL = {
  red: [1, 2, 3, 4, 5].map((c) => [c, 7]),
  green: [1, 2, 3, 4, 5].map((r) => [7, r]),
  yellow: [13, 12, 11, 10, 9].map((c) => [c, 7]),
  blue: [13, 12, 11, 10, 9].map((r) => [7, r]),
};
const BASE = { red: [0, 0], green: [9, 0], yellow: [9, 9], blue: [0, 9] };
const FINISH = { red: [6.6, 7.5], green: [7.5, 6.6], yellow: [8.4, 7.5], blue: [7.5, 8.4] };

function pointFor(color, pos, i) {
  if (pos === -1) { const [bx, by] = BASE[color]; return [bx + 2 + (i % 2) * 2, by + 2 + Math.floor(i / 2) * 2]; }
  if (pos <= R.LAST_TRACK) { const [c, r] = TRACK[R.absIndex(color, pos)]; return [c + 0.5, r + 0.5]; }
  if (pos < R.HOME) { const [c, r] = HOME_COL[color][pos - 51]; return [c + 0.5, r + 0.5]; }
  return FINISH[color];
}

function buildBoard() {
  let s = '';
  const rect = (x, y, w, h, fill, extra = '') =>
    (s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`);
  const cell = (c, r, fill) => rect(c, r, 1, 1, fill, `stroke="${INK}" stroke-width="0.05"`);
  const star = (c, r, fill) =>
    (s += `<text x="${c + 0.5}" y="${r + 0.78}" font-size="0.8" text-anchor="middle" fill="${fill}">★</text>`);

  for (const [color, [bx, by]] of Object.entries(BASE)) {
    rect(bx, by, 6, 6, COLORS[color], `stroke="${INK}" stroke-width="0.08"`);
    rect(bx + 0.9, by + 0.9, 4.2, 4.2, '#fff', `rx="0.7" stroke="${INK}" stroke-width="0.08"`);
    for (let i = 0; i < 4; i++) {
      const [x, y] = pointFor(color, -1, i);
      s += `<circle cx="${x}" cy="${y}" r="0.62" fill="${COLORS[color]}" fill-opacity="0.3" stroke="${INK}" stroke-width="0.06"/>`;
    }
  }
  TRACK.forEach(([c, r]) => cell(c, r, '#fff'));
  for (const color of Object.keys(COLORS)) {
    HOME_COL[color].forEach(([c, r]) => cell(c, r, COLORS[color]));
    const [c, r] = TRACK[R.START[color]];
    cell(c, r, COLORS[color]);
    star(c, r, '#ffffffcc');
    const [sc, sr] = TRACK[(R.START[color] + 8) % 52];
    star(sc, sr, '#c9c2d8');
  }
  const tri = (pts, color) => (s += `<polygon points="${pts}" fill="${COLORS[color]}" stroke="${INK}" stroke-width="0.06"/>`);
  tri('6,6 6,9 7.5,7.5', 'red'); tri('6,6 9,6 7.5,7.5', 'green');
  tri('9,6 9,9 7.5,7.5', 'yellow'); tri('6,9 9,9 7.5,7.5', 'blue');
  $('#board-svg').innerHTML = s;
}

/* ================= dice ================= */
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACE_ROT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
let diceSpins = 0;
function buildDice() {
  $('#dice-cube').innerHTML = [1, 2, 3, 4, 5, 6].map((n) =>
    `<div class="face f${n}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<i class="${PIPS[n].includes(k) ? 'on' : ''}"></i>`).join('')}</div>`
  ).join('');
}
function showDice(value, spin) {
  if (spin) diceSpins += 2;
  const [ax, ay] = FACE_ROT[value];
  $('#dice-cube').style.transform = `rotateX(${ax + diceSpins * 360}deg) rotateY(${ay + diceSpins * 360 + (spin ? 360 : 0)}deg)`;
}

/* ================= sounds (WebAudio, no files) ================= */
const sfx = (() => {
  let ctx = null, muted = false;
  function tone(freq, dur, type = 'sine', vol = 0.15, when = 0, slideTo) {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* audio not available */ }
  }
  return {
    roll() { for (let k = 0; k < 7; k++) tone(180 + Math.random() * 320, 0.05, 'square', 0.05, k * 0.09); },
    hop() { tone(520, 0.08, 'triangle', 0.12, 0, 800); },
    six() { tone(880, 0.12, 'triangle', 0.1); tone(1320, 0.18, 'triangle', 0.1, 0.1); },
    capture() { tone(700, 0.4, 'sawtooth', 0.1, 0, 80); tone(120, 0.25, 'square', 0.1, 0.05, 50); },
    home() { [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.16, 'triangle', 0.12, k * 0.09)); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, k) => tone(f, 0.25, 'square', 0.07, k * 0.14)); },
    pop() { tone(600, 0.07, 'sine', 0.12, 0, 1100); },
    sad() { tone(400, 0.3, 'triangle', 0.1, 0, 200); },
    toggle() { muted = !muted; return muted; },
  };
})();

/* ================= effects ================= */
function confetti(x, y, n = 30, spread = 220) {
  const fx = $('#fx'), palette = Object.values(COLORS).concat('#fff', '#8f6bff');
  for (let k = 0; k < n; k++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.background = palette[k % palette.length];
    p.style.setProperty('--dx', (Math.random() - 0.5) * spread * 2 + 'px');
    p.style.setProperty('--dy', (Math.random() * 1.2 - 0.7) * spread + 'px');
    p.style.setProperty('--rot', Math.random() * 720 + 'deg');
    p.style.animationDuration = 0.9 + Math.random() * 0.8 + 's';
    fx.appendChild(p);
    setTimeout(() => p.remove(), 1800);
  }
}
function bigConfetti() {
  for (let k = 0; k < 5; k++) setTimeout(() => confetti(Math.random() * innerWidth, innerHeight * 0.3, 50, 320), k * 250);
}
let toastTimer;
function toast(msg, ms = 1900) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function centerOf(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

/* ================= app state ================= */
let me = null;            // { name, proof }
let mode = null;          // 'host' | 'guest' | 'cpu'
let myColors = [];
let peer = null, conn = null, roomCode = null;
let game = null;          // last fully-rendered state
let display = null;       // token positions currently drawn (lags game during animations)
let busy = false;
let queue = Promise.resolve();
let aiTimer = null;
const AI = 'yellow';

const isMine = (color) => myColors.includes(color);
const nameOf = (color) => (game && game.names[color]) || color;

function show(screen) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + screen));
}

/* ================= host controller (source of truth) ================= */
const host = {
  state: null,
  start(players, names) { this.state = R.newGame(players, names); this.push(); },
  handle(color, msg) {
    const s = this.state;
    if (!s || !msg) return;
    if (msg.t === 'restart') {
      if (color === s.players[0] && s.phase === 'over') this.start(s.players, s.names);
      return;
    }
    if (s.phase === 'over' || R.current(s) !== color) return;
    let next;
    try {
      if (msg.t === 'roll' && s.phase === 'roll') next = R.rollAuto(s, randomDie());
      else if (msg.t === 'move' && s.phase === 'move' && Number.isInteger(msg.i)) next = R.move(s, msg.i);
      else return;
    } catch (e) { return; }
    next.v = s.v + 1;
    this.state = next;
    this.push();
  },
  push(sync = false) {
    onState(this.state, sync);
    if (conn && conn.open) conn.send({ t: 'state', s: this.state, sync });
  },
};
function randomDie() {
  const a = new Uint8Array(1);
  do crypto.getRandomValues(a); while (a[0] >= 252);
  return (a[0] % 6) + 1;
}
function act(msg) {
  if (mode === 'guest') { if (conn && conn.open) conn.send({ t: 'act', a: msg.t, i: msg.i }); }
  else host.handle(myColors[0], msg);
}

/* ================= rendering ================= */
function buildTokens(players) {
  $('#tokens').innerHTML = players.map((c) =>
    [0, 1, 2, 3].map((i) =>
      `<button class="token" data-c="${c}" data-i="${i}" style="--c:${COLORS[c]}" aria-label="${c} token ${i + 1}"><div class="tb"></div></button>`
    ).join('')
  ).join('');
}
const tokenEl = (c, i) => $(`.token[data-c="${c}"][data-i="${i}"]`);

function renderTokens() {
  const groups = {};
  for (const c of game.players) display[c].forEach((p, i) => {
    const pt = pointFor(c, p, i), key = pt.join(',');
    (groups[key] = groups[key] || []).push({ c, i, pt });
  });
  for (const list of Object.values(groups)) {
    const n = list.length;
    list.forEach(({ c, i, pt }, k) => {
      let [x, y] = pt;
      if (n > 1) {
        const ang = (k / n) * Math.PI * 2 - Math.PI / 4;
        x += Math.cos(ang) * 0.2; y += Math.sin(ang) * 0.2;
      }
      const el = tokenEl(c, i);
      el.style.left = (x / 15) * 100 + '%';
      el.style.top = (y / 15) * 100 + '%';
      el.style.setProperty('--s', n > 1 ? 0.7 : 1);
      el.style.zIndex = Math.round(y * 2) + k;
    });
  }
}

function renderPlayers() {
  const chips = game.players.map((c) => {
    const home = game.tokens[c].filter((p) => p === R.HOME).length;
    const active = game.phase !== 'over' && R.current(game) === c;
    const tag = mode === 'cpu' && c === AI ? ' 🤖' : isMine(c) ? ' (you)' : '';
    return `<div class="chip ${active ? 'active' : ''}" data-c="${c}" style="--c:${COLORS[c]}">
      <span class="dot"></span><span class="nm">${escapeHtml(nameOf(c) + tag)}</span><span class="hm">🏠 ${home}/4</span></div>`;
  });
  $('#players').innerHTML = chips.join('<span class="vs">vs</span>');
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`); }

function canRoll() {
  return !busy && game && game.phase === 'roll' && isMine(R.current(game));
}
function movable() {
  if (busy || !game || game.phase !== 'move') return [];
  const c = R.current(game);
  if (!isMine(c)) return [];
  return R.legalMoves(game).map((i) => [c, i]);
}

function renderControls() {
  const dice = $('#dice');
  dice.disabled = !canRoll();
  dice.classList.toggle('ready', canRoll());
  document.querySelectorAll('.token.can').forEach((el) => el.classList.remove('can'));
  movable().forEach(([c, i]) => tokenEl(c, i).classList.add('can'));
  if (game) $('#dice-cube').style.setProperty('--dc', COLORS[R.current(game)]);

  let text = '';
  if (!game) text = '';
  else if (game.phase === 'over') text = `${nameOf(game.winner)} wins! 🏆`;
  else {
    const c = R.current(game);
    if (isMine(c) && game.phase === 'roll') text = 'Your turn! Tap the dice 🎲';
    else if (isMine(c) && game.phase === 'move') text = 'Pick a token to move ✨';
    else text = `${nameOf(c)} is ${game.phase === 'roll' ? 'rolling' : 'thinking'}… 🤔`;
  }
  if (!busy) $('#status').textContent = text;
}

function renderAll() {
  renderTokens();
  renderPlayers();
  renderControls();
  const win = $('#win');
  if (game.phase === 'over') {
    const iWon = isMine(game.winner);
    $('#win-title').textContent = iWon ? 'You win! 🎉' : `${nameOf(game.winner)} wins!`;
    $('#win-sub').textContent = iWon ? 'Absolute legend. Bonk-master supreme.' : 'So close! Rematch? 😤';
    $('#btn-again').hidden = mode === 'guest';
    if (mode === 'guest') $('#win-sub').textContent += ' (waiting for host to restart)';
    win.hidden = false;
  } else win.hidden = true;
}

/* ================= state application + animation ================= */
function onState(s, sync) { queue = queue.then(() => applyState(s, sync)).catch((e) => console.error(e)); }

async function applyState(s, sync) {
  const fresh = !game || game.gid !== s.gid;
  if (!fresh && s.v <= game.v) return;
  if (fresh || sync) {
    game = s;
    display = JSON.parse(JSON.stringify(s.tokens));
    buildTokens(s.players);
    if (s.dice) showDice(s.dice, false);
    renderAll();
    maybeAI();
    return;
  }
  busy = true;
  renderControls();
  for (const ev of s.events) {
    if (ev.type === 'roll') await animateRoll(ev);
    else if (ev.type === 'move') await animateMove(ev);
  }
  const wasOver = game.phase === 'over';
  game = s;
  display = JSON.parse(JSON.stringify(s.tokens));
  busy = false;
  renderAll();
  if (s.phase === 'over' && !wasOver) { sfx.win(); bigConfetti(); }
  maybeAI();
}

async function animateRoll(ev) {
  $('#dice-cube').style.setProperty('--dc', COLORS[ev.color]);
  sfx.roll();
  showDice(ev.value, true);
  $('#status').textContent = `${isMine(ev.color) ? 'You' : nameOf(ev.color)} rolled…`;
  await sleep(850);
  $('#status').textContent = `${ev.value}!`;
  if (ev.value === 6) sfx.six();
  if (ev.note === 'three6') { toast('Three 6s in a row! Turn skipped 😵'); sfx.sad(); await sleep(900); }
  else if (ev.note === 'nomove') { toast(ev.value === 6 ? 'No moves, but roll again! 🎲' : 'No moves… 😅', 1300); await sleep(900); }
  else await sleep(250);
}

async function animateMove(ev) {
  const steps = ev.from === -1 ? [0] : Array.from({ length: ev.to - ev.from }, (_, k) => ev.from + 1 + k);
  const el = tokenEl(ev.color, ev.token);
  el.style.zIndex = 60;
  for (const p of steps) {
    display[ev.color][ev.token] = p;
    renderTokens();
    el.style.zIndex = 60;
    retrigger(el, 'hop');
    sfx.hop();
    await sleep(175);
  }
  if (ev.captured.length) {
    await sleep(60);
    retrigger($('#board-wrap'), 'shake');
    sfx.capture();
    confetti(...centerOf(el), 40, 160);
    for (const c of ev.captured) {
      display[c.color][c.token] = -1;
      tokenEl(c.color, c.token).classList.add('flying');
    }
    renderTokens();
    const bonker = isMine(ev.color) ? 'You' : nameOf(ev.color);
    toast(`💥 BONK! ${bonker} sent a token home!`);
    if (mode === 'cpu') floatEmoji(ev.color === AI ? '😈' : '😭', AI);
    await sleep(700);
    ev.captured.forEach((c) => tokenEl(c.color, c.token).classList.remove('flying'));
  }
  if (ev.home) { sfx.home(); confetti(...centerOf(el), 30, 140); toast('🏠 Token home! Bonus roll!'); await sleep(350); }
  else if (ev.bonus && !ev.captured.length) toast('Rolled a 6 — roll again! 🎉', 1300);
}

/* ================= computer opponent ================= */
function maybeAI() {
  clearTimeout(aiTimer);
  if (mode !== 'cpu' || !game || game.phase === 'over' || R.current(game) !== AI) return;
  aiTimer = setTimeout(() => {
    if (busy || !game || R.current(game) !== AI) return;
    if (game.phase === 'roll') host.handle(AI, { t: 'roll' });
    else if (game.phase === 'move') host.handle(AI, { t: 'move', i: aiPick(game) });
  }, game.phase === 'roll' ? 700 : 550);
}
function aiPick(s) {
  const color = R.current(s);
  let best = null, bestScore = -Infinity;
  for (const i of R.legalMoves(s)) {
    const next = R.move(s, i), ev = next.events[0];
    let score = ev.to / 10 + ev.captured.length * 100 + (ev.home ? 60 : 0) + (ev.from === -1 ? 45 : 0);
    if (ev.to <= R.LAST_TRACK) {
      const a = R.absIndex(color, ev.to);
      if (R.SAFE.has(a)) score += 25;
      else if (threatened(s, color, a)) score -= 35;
    }
    if (ev.from >= 0 && ev.from <= R.LAST_TRACK && threatened(s, color, R.absIndex(color, ev.from))) score += 20;
    score += Math.random() * 3;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}
function threatened(s, color, a) {
  return s.players.some((c) => c !== color && s.tokens[c].some((p) => {
    if (p < 0 || p > R.LAST_TRACK) return false;
    const d = (a - R.absIndex(c, p) + 52) % 52;
    return d >= 1 && d <= 6;
  }));
}

/* ================= reactions ================= */
function floatEmoji(e, color) {
  const chip = $(`.chip[data-c="${color}"]`) || $('#players');
  const [x, y] = centerOf(chip);
  const el = document.createElement('div');
  el.className = 'float-emoji';
  el.textContent = e;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.setProperty('--dx', (Math.random() - 0.5) * 80 + 'px');
  $('#fx').appendChild(el);
  setTimeout(() => el.remove(), 1900);
}
let lastReact = 0;
function sendReaction(e) {
  if (Date.now() - lastReact < 600 || !game) return;
  lastReact = Date.now();
  sfx.pop();
  floatEmoji(e, myColors[0]);
  if (conn && conn.open) conn.send({ t: 'react', e });
}

/* ================= networking (PeerJS) ================= */
function genCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return [...a].map((b) => chars[b % chars.length]).join('');
}
function lobbyView(view) {
  $('#lobby-menu').hidden = view !== 'menu';
  $('#lobby-wait').hidden = view !== 'wait';
  $('#lobby-joining').hidden = view !== 'joining';
}
function lobbyError(msg) { $('#lobby-error').textContent = msg; }
function teardown() {
  clearTimeout(aiTimer);
  if (conn) { try { conn.close(); } catch (e) {} }
  if (peer) { try { peer.destroy(); } catch (e) {} }
  conn = peer = null; mode = null; game = null; host.state = null; roomCode = null;
  queue = Promise.resolve(); busy = false;
  $('#win').hidden = true;
}
function startGameScreen() {
  show('game');
  $('#reactions').hidden = mode === 'cpu';
}

function createRoom() {
  if (typeof Peer === 'undefined') return lobbyError('Could not load the online library. Check your internet 🙏');
  lobbyError('');
  mode = 'host'; myColors = ['red'];
  roomCode = genCode();
  peer = new Peer(PEER_PREFIX + roomCode);
  lobbyView('joining');
  peer.on('open', () => {
    $('#room-code').textContent = roomCode;
    lobbyView('wait');
  });
  peer.on('error', (e) => {
    if (e.type === 'unavailable-id') { const p = peer; peer = null; p.destroy(); return createRoom(); }
    if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') {
      if (!game) { teardown(); lobbyView('menu'); lobbyError('Could not reach the matchmaking server. Try again!'); }
    }
  });
  peer.on('disconnected', () => { if (peer && !peer.destroyed) peer.reconnect(); });
  peer.on('connection', handleGuest);
}

function handleGuest(c) {
  let state = 'new';
  const timer = setTimeout(() => { if (state !== 'ok') c.close(); }, 8000);
  c.on('data', async (d) => {
    if (state === 'checking' || state === 'dead') return;
    if (state === 'new') {
      state = 'checking';
      const name = d && d.t === 'hello' ? await checkProof(d.user, d.proof) : null;
      const reject = (why) => { state = 'dead'; c.send({ t: 'reject', why }); setTimeout(() => c.close(), 400); };
      if (!name) return reject('Bad login 🚫');
      if (conn && conn.open) return reject('Room is full 🙅');
      state = 'ok';
      clearTimeout(timer);
      conn = c;
      if (!host.state) {
        startGameScreen();
        host.start(['red', 'yellow'], { red: me.name, yellow: name });
        toast(`${name} joined! Let's gooo 🎉`);
      } else {
        host.state.names.yellow = name;
        host.push(true);
        toast(`${name} is back! 👋`);
      }
      return;
    }
    if (c !== conn || !d) return;
    if (d.t === 'act' && (d.a === 'roll' || d.a === 'move')) host.handle('yellow', { t: d.a, i: d.i });
    else if (d.t === 'react' && EMOJIS.includes(d.e)) { sfx.pop(); floatEmoji(d.e, 'yellow'); }
  });
  c.on('close', () => {
    if (c === conn) { conn = null; if (game) toast('Friend disconnected — they can rejoin with the same code', 3500); }
  });
}

function joinRoom(code) {
  code = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return lobbyError('Room codes are 6 letters/numbers 🙂');
  if (typeof Peer === 'undefined') return lobbyError('Could not load the online library. Check your internet 🙏');
  lobbyError('');
  mode = 'guest'; myColors = ['yellow']; roomCode = code;
  lobbyView('joining');
  peer = new Peer();
  const giveUp = setTimeout(() => {
    if (!game) { teardown(); lobbyView('menu'); lobbyError('No answer from that room 🤔 Check the code?'); }
  }, 15000);
  peer.on('open', () => {
    conn = peer.connect(PEER_PREFIX + code, { reliable: true });
    conn.on('open', () => conn.send({ t: 'hello', user: me.name, proof: me.proof }));
    conn.on('data', (d) => {
      if (!d) return;
      if (d.t === 'state') {
        clearTimeout(giveUp);
        if (!document.querySelector('#screen-game.active')) startGameScreen();
        onState(d.s, d.sync);
      } else if (d.t === 'react' && EMOJIS.includes(d.e)) { sfx.pop(); floatEmoji(d.e, 'red'); }
      else if (d.t === 'reject') { clearTimeout(giveUp); teardown(); show('lobby'); lobbyView('menu'); lobbyError(d.why); }
    });
    conn.on('close', () => {
      if (mode === 'guest' && game) {
        toast('Lost connection to host 😢', 4000);
        const code = roomCode;
        teardown(); show('lobby'); lobbyView('menu');
        $('#join-code').value = code;
        lobbyError('Connection dropped. Tap Join to hop back in!');
      }
    });
  });
  peer.on('error', (e) => {
    clearTimeout(giveUp);
    teardown(); show('lobby'); lobbyView('menu');
    lobbyError(e.type === 'peer-unavailable' ? 'No room with that code 🤔' : 'Connection trouble (' + e.type + '). Try again!');
  });
}

function startCpu() {
  teardown();
  mode = 'cpu'; myColors = ['red'];
  startGameScreen();
  host.start(['red', AI], { red: me.name, [AI]: 'Robo-Bonk' });
}

/* ================= wiring ================= */
let fails = 0, lockedUntil = 0;
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error');
  if (Date.now() < lockedUntil) { err.textContent = 'Too many tries. Chill for a bit 🧊'; return; }
  const user = $('#login-user').value, pass = $('#login-pass').value;
  const proof = await makeProof(user, pass);
  const name = await checkProof(user, proof);
  if (!name) {
    fails++;
    if (fails >= 5) { lockedUntil = Date.now() + 30000; fails = 0; }
    err.textContent = 'Nope! Wrong name or password 🙈';
    retrigger($('#login-form'), 'shake');
    sfx.sad();
    return;
  }
  me = { name, proof };
  try { sessionStorage.setItem('ludo-me', JSON.stringify(me)); } catch (e2) {}
  sfx.home();
  enterLobby();
});

function enterLobby() {
  $('#hello-name').textContent = me.name;
  lobbyView('menu');
  lobbyError('');
  show('lobby');
  const room = new URLSearchParams(location.search).get('room');
  if (room) {
    history.replaceState(null, '', location.pathname);
    $('#join-code').value = room.toUpperCase();
    joinRoom(room);
  }
}

$('#btn-create').onclick = () => { sfx.pop(); createRoom(); };
$('#btn-join').onclick = () => { sfx.pop(); joinRoom($('#join-code').value); };
$('#join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinRoom(e.target.value); });
$('#btn-cpu').onclick = () => { sfx.pop(); startCpu(); };
$('#btn-cancel').onclick = $('#btn-cancel-join').onclick = () => { teardown(); lobbyView('menu'); };
$('#btn-copy').onclick = async () => {
  const link = `${location.origin}${location.pathname}?room=${roomCode}`;
  try { await navigator.clipboard.writeText(link); toast('Invite link copied! Send it to your friend 💌'); }
  catch (e) { prompt('Copy this link:', link); }
};
$('#btn-logout').onclick = () => {
  teardown();
  me = null;
  try { sessionStorage.removeItem('ludo-me'); } catch (e) {}
  $('#login-pass').value = '';
  show('login');
};
const leave = () => {
  if (mode !== 'cpu' && game && game.phase !== 'over' && !confirm('Leave the game? Your friend will be left hanging 😢')) return;
  teardown(); show('lobby'); lobbyView('menu'); lobbyError('');
};
$('#btn-leave').onclick = leave;
$('#btn-win-leave').onclick = () => { teardown(); show('lobby'); lobbyView('menu'); };
$('#btn-again').onclick = () => { if (game) host.handle(game.players[0], { t: 'restart' }); };
$('#btn-mute').onclick = (e) => { e.currentTarget.textContent = sfx.toggle() ? '🔇' : '🔊'; };
$('#dice').onclick = () => { if (canRoll()) { $('#dice').disabled = true; act({ t: 'roll' }); } };
$('#tokens').addEventListener('click', (e) => {
  const el = e.target.closest('.token.can');
  if (!el) return;
  const c = el.dataset.c, i = +el.dataset.i;
  if (!movable().some(([mc, mi]) => mc === c && mi === i)) return;
  document.querySelectorAll('.token.can').forEach((t) => t.classList.remove('can'));
  act({ t: 'move', i });
});
$('#reactions').innerHTML = EMOJIS.map((e) => `<button type="button" aria-label="Send ${e}">${e}</button>`).join('');
$('#reactions').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) sendReaction(b.textContent); });

buildBoard();
buildDice();
showDice(6, false);
try {
  const saved = JSON.parse(sessionStorage.getItem('ludo-me') || 'null');
  if (saved) checkProof(saved.name, saved.proof).then((name) => { if (name) { me = { name, proof: saved.proof }; enterLobby(); } });
} catch (e) {}
