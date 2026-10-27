'use strict';
/* Ludo Party concepts gallery. Static mockups only: nothing here talks to the real game. */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INK = '#2b2140';
const SIX = ['#ff5a5f', '#ff9f43', '#ffc233', '#2bc48a', '#4d9de0', '#a77bff'];

/* ================= sounds (WebAudio, no files) ================= */
const sfx = (() => {
  let ctx = null, muted = false;
  const ac = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());
  function tone(freq, dur, type = 'sine', vol = 0.15, when = 0, slideTo) {
    if (muted) return;
    try {
      const c = ac(), t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch { /* audio unavailable */ }
  }
  function noise(dur, vol = 0.15, when = 0, freq = 1800) {
    if (muted) return;
    try {
      const c = ac(), t = c.currentTime + when, len = Math.ceil(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
      src.connect(f).connect(g).connect(c.destination); src.start(t);
    } catch { /* audio unavailable */ }
  }
  const mar = (f, when = 0, vol = 0.18) => { tone(f, 0.45, 'sine', vol, when); tone(f * 4, 0.09, 'sine', vol / 4, when); };
  const PACKS = {
    arcade: {
      roll() { for (let i = 0; i < 7; i++) tone(220 + rand(500), 0.05, 'square', 0.05, i * 0.07); },
      hop() { tone(660, 0.07, 'square', 0.06); },
      bonk() { tone(420, 0.3, 'square', 0.1, 0, 70); noise(0.15, 0.2, 0, 600); },
      home() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.07, i * 0.08)); },
      win() { [523, 523, 784, 784, 880, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.07, i * 0.12)); },
      pop() { tone(880, 0.06, 'square', 0.05, 0, 1320); },
    },
    soft: {
      roll() { for (let i = 0; i < 5; i++) mar(392 + rand(300), i * 0.08, 0.1); },
      hop() { mar(523, 0, 0.14); },
      bonk() { mar(196); mar(147, 0.1); },
      home() { [523, 659, 784, 1047].forEach((f, i) => mar(f, i * 0.1, 0.13)); },
      win() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => mar(f, i * 0.14, 0.13)); },
      pop() { mar(1047, 0, 0.1); },
    },
    cartoon: {
      roll() { for (let i = 0; i < 6; i++) noise(0.04, 0.35, i * 0.06, 2500 + rand(1500)); },
      hop() { tone(300, 0.14, 'sine', 0.18, 0, 760); },
      bonk() { tone(160, 0.35, 'triangle', 0.25, 0, 50); noise(0.2, 0.3, 0, 400); tone(1200, 0.4, 'sine', 0.05, 0.1, 1800); },
      home() { tone(600, 0.35, 'sine', 0.14, 0, 1800); tone(1800, 0.2, 'sine', 0.08, 0.35, 1400); },
      win() { [392, 392, 440, 392, 523, 494].forEach((f, i) => tone(f, 0.2, 'sawtooth', 0.06, i * 0.2)); },
      pop() { tone(500, 0.08, 'sine', 0.16, 0, 1300); },
    },
  };
  let pack = 'arcade';
  return {
    play: (name, p = pack) => PACKS[p][name](),
    setPack: (p) => (pack = p),
    toggle: () => (muted = !muted),
  };
})();

/* ================= classic 15x15 geometry (copied from game.js) ================= */
const TRACK = [];
function seg(c0, r0, c1, r1) {
  const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
  for (let c = c0, r = r0; ; c += dc, r += dr) { TRACK.push([c, r]); if (c === c1 && r === r1) break; }
}
seg(1, 6, 5, 6); seg(6, 5, 6, 0); seg(7, 0, 7, 0); seg(8, 0, 8, 5); seg(9, 6, 14, 6); seg(14, 7, 14, 7);
seg(14, 8, 9, 8); seg(8, 9, 8, 14); seg(7, 14, 7, 14); seg(6, 14, 6, 9); seg(5, 8, 0, 8); seg(0, 7, 0, 7); seg(0, 6, 0, 6);
const START = { red: 0, green: 13, yellow: 26, blue: 39 };
const HOME_COL = {
  red: [1, 2, 3, 4, 5].map((c) => [c, 7]),
  green: [1, 2, 3, 4, 5].map((r) => [7, r]),
  yellow: [13, 12, 11, 10, 9].map((c) => [c, 7]),
  blue: [13, 12, 11, 10, 9].map((r) => [7, r]),
};
const BASE = { red: [0, 0], green: [9, 0], yellow: [9, 9], blue: [0, 9] };
function classicPoint(color, pos, i = 0) {
  if (pos === -1) { const [bx, by] = BASE[color]; return [bx + 2 + (i % 2) * 2, by + 2 + Math.floor(i / 2) * 2]; }
  if (pos <= 50) { const [c, r] = TRACK[(START[color] + pos) % 52]; return [c + 0.5, r + 0.5]; }
  const [c, r] = HOME_COL[color][pos - 51]; return [c + 0.5, r + 0.5];
}

/* Board kits return { svg, n (viewBox span, used for token size), toPct([x,y]), sample: [[color, x, y], ...] } */
function classicKit(p, mode = 'flat', extras = '') {
  const C = p.c, neon = mode === 'neon', sketch = mode === 'sketch', garden = mode === 'garden';
  const ink = p.ink, sw = neon ? 0.05 : 0.06;
  let s = '';
  const rect = (x, y, w, h, fill, stroke, w2, rx = 0, extra = '') =>
    (s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${w2}" ${extra}/>`);
  const cell = (c, r, fill, stroke = ink) => garden
    ? rect(c + 0.07, r + 0.07, 0.86, 0.86, fill, stroke, 0.05, 0.3)
    : rect(c, r, 1, 1, fill, stroke, sw, neon ? 0.12 : 0);
  const star = (c, r, fill) => (s += `<text x="${c + 0.5}" y="${r + 0.78}" font-size="0.8" text-anchor="middle" fill="${fill}">★</text>`);

  for (const [color, [bx, by]] of Object.entries(BASE)) {
    const c = C[color];
    if (neon) {
      rect(bx + 0.2, by + 0.2, 5.6, 5.6, `${c}18`, c, 0.08, 0.6, 'filter="url(#glow-neon)"');
    } else if (garden) {
      rect(bx + 0.15, by + 0.15, 5.7, 5.7, c, ink, 0.08, 1.4);
      rect(bx + 0.9, by + 0.9, 4.2, 4.2, p.track, ink, 0.06, 2.1);
    } else {
      rect(bx, by, 6, 6, sketch ? `${c}cc` : c, ink, 0.08);
      rect(bx + 0.9, by + 0.9, 4.2, 4.2, p.inner || '#fff', ink, 0.08, 0.7);
    }
    for (let i = 0; i < 4; i++) {
      const [x, y] = classicPoint(color, -1, i);
      s += neon
        ? `<circle cx="${x}" cy="${y}" r="0.6" fill="none" stroke="${c}" stroke-width="0.06" filter="url(#glow-neon)"/>`
        : `<circle cx="${x}" cy="${y}" r="0.62" fill="${c}" fill-opacity="0.3" stroke="${ink}" stroke-width="0.06"/>`;
    }
  }
  TRACK.forEach(([c, r]) => cell(c, r, p.track, neon ? '#9b8cff88' : ink));
  for (const color of Object.keys(C)) {
    const c = C[color];
    HOME_COL[color].forEach(([x, y]) => cell(x, y, neon ? `${c}55` : c, neon ? c : ink));
    const [sc, sr] = TRACK[START[color]];
    cell(sc, sr, neon ? `${c}88` : c, neon ? c : ink);
    star(sc, sr, '#ffffffcc');
    const [fc, fr] = TRACK[(START[color] + 8) % 52];
    star(fc, fr, neon ? '#9b8cff' : p.safe || '#c9c2d8');
  }
  const tri = (pts, color) => (s += `<polygon points="${pts}" fill="${neon ? C[color] + '55' : C[color]}" stroke="${neon ? C[color] : ink}" stroke-width="0.06"/>`);
  tri('6,6 6,9 7.5,7.5', 'red'); tri('6,6 9,6 7.5,7.5', 'green');
  tri('9,6 9,9 7.5,7.5', 'yellow'); tri('6,9 9,9 7.5,7.5', 'blue');
  if (garden) s += '<text x="7.5" y="7.95" font-size="1.3" text-anchor="middle">🌻</text>';

  const defs = neon
    ? '<defs><filter id="glow-neon" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
    : sketch
      ? '<defs><filter id="rough-sketch"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale=".2"/></filter></defs>'
      : '';
  const body = neon ? `<g filter="url(#glow-neon)">${s}</g>` : sketch ? `<g filter="url(#rough-sketch)">${s}</g>` : s;
  const pt = (color, pos, i) => classicPoint(color, pos, i);
  return {
    svg: `<svg viewBox="0 0 15 15" aria-hidden="true">${defs}${body}${extras}</svg>`,
    n: 15,
    toPct: ([x, y]) => [x / 15 * 100, y / 15 * 100],
    sample: [
      ['red', ...pt('red', -1, 0)], ['red', ...pt('red', -1, 3)], ['red', ...pt('red', 6)], ['red', ...pt('red', 53)],
      ['yellow', ...pt('yellow', -1, 2)], ['yellow', ...pt('yellow', 4)], ['yellow', ...pt('yellow', 14)], ['yellow', ...pt('yellow', 30)],
    ],
  };
}

/* Chaupar / Pachisi cloth cross: four 3x8 arms around a 3x3 centre, 19x19 */
function pachisiKit(p) {
  let s = '';
  const C = p.c, ink = p.ink;
  // corners: brass base plates with kolam dots
  const corners = { yellow: [0, 0], green: [11, 0], red: [0, 11], blue: [11, 11] };
  for (const [color, [x, y]] of Object.entries(corners)) {
    const cx = x + 4, cy = y + 4;
    s += `<circle cx="${cx}" cy="${cy}" r="3.4" fill="#5a1610" stroke="#c99a2e" stroke-width=".18"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="2.8" fill="none" stroke="${C[color]}" stroke-width=".35"/>`;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      s += `<ellipse cx="${cx + Math.cos(a) * 1.7}" cy="${cy + Math.sin(a) * 1.7}" rx=".55" ry=".22" transform="rotate(${k * 45} ${cx + Math.cos(a) * 1.7} ${cy + Math.sin(a) * 1.7})" fill="#f6d77a" opacity=".85"/>`;
    }
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i * i + j * j <= 5) s += `<circle cx="${cx + i * 0.55}" cy="${cy + j * 0.55}" r=".07" fill="#fff3d6"/>`;
  }
  const arms = [
    { color: 'yellow', cells: (r, c) => [8 + c, r] }, // top: row 0 is outermost
    { color: 'green', cells: (r, c) => [18 - r, 8 + c] }, // right
    { color: 'blue', cells: (r, c) => [10 - c, 18 - r] }, // bottom
    { color: 'red', cells: (r, c) => [r, 10 - c] }, // left
  ];
  const castle = new Set(['3,0', '3,2', '0,1']);
  for (const arm of arms) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 3; c++) {
      const [x, y] = arm.cells(r, c);
      const lane = c === 1 && r > 0;
      const fill = lane ? C[arm.color] : (r + c) % 2 ? p.track : p.track2;
      s += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" stroke="${ink}" stroke-width=".05"/>`;
      if (castle.has(`${r},${c}`)) s += `<path d="M${x + 0.18} ${y + 0.18}L${x + 0.82} ${y + 0.82}M${x + 0.82} ${y + 0.18}L${x + 0.18} ${y + 0.82}" stroke="${ink}" stroke-width=".09"/>`;
      if (lane && r % 2) s += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r=".14" fill="#f6d77a"/>`;
    }
  }
  // centre mandala
  s += '<rect x="8" y="8" width="3" height="3" fill="#7a160f" stroke="#c99a2e" stroke-width=".12"/>';
  for (let k = 0; k < 12; k++) s += `<ellipse cx="9.5" cy="8.75" rx=".22" ry=".7" transform="rotate(${k * 30} 9.5 9.5)" fill="${k % 2 ? '#f6d77a' : '#e8a317'}"/>`;
  s += '<circle cx="9.5" cy="9.5" r=".45" fill="#c8102e" stroke="#f6d77a" stroke-width=".1"/>';
  return {
    svg: `<svg viewBox="0 0 19 19" aria-hidden="true"><rect width="19" height="19" fill="#8c1c13"/>${s}</svg>`,
    n: 19,
    toPct: ([x, y]) => [x / 19 * 100, y / 19 * 100],
    sample: [
      ['red', 3.5, 15], ['red', 4.5, 15.8], ['red', 3.5, 9.5], ['red', 9.5, 14.5],
      ['yellow', 3.5, 4], ['yellow', 9.5, 2.5], ['yellow', 16.5, 8.5], ['yellow', 10.5, 15.5],
    ],
  };
}

/* n-player star board: an n-gon centre with one 3x6 arm per side. n = 3 triangle, 6 hex-star */
function radialKit(n, colors = SIX) {
  const a = 1.5 / Math.tan(Math.PI / n), L = 6, rot = (deg, [x, y]) => {
    const t = deg * Math.PI / 180; return [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)];
  };
  const d = Math.max(a + 2.8, (2.5 + 1.5) / Math.sin(Math.PI / n)), rb = 2.1;
  const E = Math.max(a + L, d + rb) + 0.4;
  let s = '';
  const R = 1.5 / Math.sin(Math.PI / n);
  const vert = (k) => rot(k * 360 / n + 180 / n, [0, -R]);
  for (let k = 0; k < n; k++) {
    const [x1, y1] = vert(k - 1), [x2, y2] = vert(k);
    s += `<polygon points="0,0 ${x1},${y1} ${x2},${y2}" fill="${colors[k]}" stroke="${INK}" stroke-width=".06"/>`;
  }
  for (let k = 0; k < n; k++) {
    let g = '';
    for (let r = 0; r < L; r++) for (let c = 0; c < 3; c++) {
      const lane = c === 1 && r > 0, entry = c === 2 && r === 1;
      g += `<rect x="${-1.5 + c}" y="${-(a + L) + r}" width="1" height="1" fill="${lane || entry ? colors[k] : '#fff'}" stroke="${INK}" stroke-width=".05"/>`;
      if (entry) g += `<text x="${c - 1}" y="${-(a + L) + r + 0.78}" font-size=".8" text-anchor="middle" fill="#fffc">★</text>`;
      if (c === 0 && r === 3) g += `<text x="${c - 1}" y="${-(a + L) + r + 0.78}" font-size=".8" text-anchor="middle" fill="#c9c2d8">★</text>`;
    }
    s += `<g transform="rotate(${k * 360 / n})">${g}</g>`;
    const [bx, by] = rot(k * 360 / n + 180 / n, [0, -d]);
    const col = colors[k];
    s += `<circle cx="${bx}" cy="${by}" r="${rb}" fill="${col}" stroke="${INK}" stroke-width=".08"/><circle cx="${bx}" cy="${by}" r="${rb - 0.55}" fill="#fff" stroke="${INK}" stroke-width=".06"/>`;
    for (let i = 0; i < 4; i++) {
      const [ox, oy] = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]][i];
      s += `<circle cx="${bx + ox}" cy="${by + oy}" r=".42" fill="${col}" fill-opacity=".35" stroke="${INK}" stroke-width=".05"/>`;
    }
  }
  const cellPt = (k, r, c) => rot(k * 360 / n, [-1 + c, -(a + L) + r + 0.5]);
  const basePt = (k, i) => {
    const [bx, by] = rot(k * 360 / n + 180 / n, [0, -d]);
    const [ox, oy] = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]][i]; return [bx + ox, by + oy];
  };
  const sample = [];
  for (let k = 0; k < n; k++) {
    sample.push([colors[k], ...basePt(k, 0)], [colors[k], ...basePt(k, 3)]);
    sample.push([colors[k], ...cellPt((k + 1) % n, 2 + (k % 3), k % 2 ? 0 : 2)]);
  }
  return {
    svg: `<svg viewBox="${-E} ${-E} ${2 * E} ${2 * E}" aria-hidden="true">${s}</svg>`,
    n: 2 * E,
    toPct: ([x, y]) => [(x + E) / (2 * E) * 100, (y + E) / (2 * E) * 100],
    sample,
  };
}

/* round racetrack: 52 cells on a ring, 4 spokes to the centre */
function ringKit() {
  const COL = ['#ff5a5f', '#2bc48a', '#ffc233', '#4d9de0'];
  const R1 = 6.4, R2 = 8.2, N = 52;
  const P = (r, deg) => { const t = (deg - 90) * Math.PI / 180; return [r * Math.cos(t), r * Math.sin(t)]; };
  let s = '';
  for (let i = 0; i < N; i++) {
    const a0 = i * 360 / N, a1 = (i + 1) * 360 / N;
    const [x0, y0] = P(R2, a0), [x1, y1] = P(R2, a1), [x2, y2] = P(R1, a1), [x3, y3] = P(R1, a0);
    const q = i % 13, fill = q === 0 ? COL[i / 13] : '#fff';
    s += `<path d="M${x0} ${y0}A${R2} ${R2} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R1} ${R1} 0 0 0 ${x3} ${y3}Z" fill="${fill}" stroke="${INK}" stroke-width=".05"/>`;
    if (q === 8) { const [tx, ty] = P((R1 + R2) / 2, (a0 + a1) / 2); s += `<text x="${tx}" y="${ty + 0.3}" font-size=".8" text-anchor="middle" fill="#c9c2d8">★</text>`; }
  }
  for (let k = 0; k < 4; k++) {
    const ang = k * 90 - 360 / N * 1.5;
    for (let j = 0; j < 5; j++) {
      const [cx, cy] = P(R1 - 0.6 - j * 1.02, ang);
      s += `<rect x="${cx - 0.45}" y="${cy - 0.45}" width=".9" height=".9" rx=".2" transform="rotate(${ang} ${cx} ${cy})" fill="${COL[k]}" stroke="${INK}" stroke-width=".05"/>`;
    }
  }
  s += `<circle r="1.2" fill="url(#pin)" stroke="${INK}" stroke-width=".08"/>`;
  const corners = [[-8.5, -8.5], [8.5, -8.5], [8.5, 8.5], [-8.5, 8.5]];
  corners.forEach(([x, y], k) => {
    s += `<circle cx="${x}" cy="${y}" r="1.35" fill="${COL[k]}" stroke="${INK}" stroke-width=".08"/><circle cx="${x}" cy="${y}" r=".8" fill="#fff" stroke="${INK}" stroke-width=".05"/>`;
  });
  const defs = `<defs><radialGradient id="pin"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffc233"/></radialGradient></defs>`;
  const at = (i) => P((R1 + R2) / 2, (i + 0.5) * 360 / N);
  return {
    svg: `<svg viewBox="-10 -10 20 20" aria-hidden="true">${defs}${s}</svg>`,
    n: 20,
    toPct: ([x, y]) => [(x + 10) * 5, (y + 10) * 5],
    sample: [['red', ...at(3)], ['red', ...at(17)], ['green', ...at(20)], ['yellow', ...at(31)], ['yellow', ...at(44)], ['blue', ...at(48)], ['red', -8.5, -8.5], ['yellow', 8.5, 8.5]],
  };
}

const PAL = {
  candy: { c: { red: '#ff5a5f', green: '#2bc48a', yellow: '#ffc233', blue: '#4d9de0' }, ink: INK, track: '#fff' },
  neon: { c: { red: '#ff3d81', green: '#39ff9f', yellow: '#ffe14d', blue: '#3dd6ff' }, ink: '#9b8cff', track: '#0d0a1f' },
  heritage: { c: { red: '#c8102e', green: '#1f7a4d', yellow: '#e8a317', blue: '#1d4e89' }, ink: '#3b1d0e', track: '#f6e7c8', track2: '#ecd6a8' },
  sketch: { c: { red: '#ff6b6b', green: '#51cf66', yellow: '#fcc419', blue: '#4dabf7' }, ink: '#33334d', track: '#fffdf6', inner: '#fffdf6' },
  wood: { c: { red: '#b8322a', green: '#3f7d3a', yellow: '#d9a42b', blue: '#2f5f8f' }, ink: '#4a2c17', track: '#f3dfb8', inner: '#f6e6c6', safe: '#b08a5a' },
  garden: { c: { red: '#ff8fa3', green: '#7bd389', yellow: '#ffd166', blue: '#8ecae6' }, ink: '#5b4636', track: '#fffdf5' },
};

/* ================= tokens & dice ================= */
const CRITTER = { red: '🦊', green: '🐸', yellow: '🐥', blue: '🐳' };
const AVATAR = { red: '😎', green: '🤓', yellow: '🥰', blue: '🤠' };
const SKINS = {
  face: { name: 'Faces', inner: () => '<i class="e l"></i><i class="e r"></i><i class="m"></i><i class="x sweat">💧</i><i class="x stars">💫</i><i class="x hat">🥳</i>' },
  pawn: { name: '3D pawns', inner: () => '' },
  critter: { name: 'Critters', inner: (c) => `<span>${CRITTER[c] || pick(Object.values(CRITTER))}</span>` },
  gem: { name: 'Gems', inner: () => '' },
  photo: { name: 'Avatars', inner: (c) => `<span>${AVATAR[c] || '🙂'}</span>` },
  ring: { name: 'Neon rings', inner: () => '' },
  brass: { name: 'Brass', inner: () => '' },
  doodle: { name: 'Doodles', inner: () => '' },
};
function tokenHTML(skin, colorKey, hex, x, y, k = 0, extra = '') {
  return `<div class="tk sk-${skin}" ${extra} style="--c:${hex};--k:${k};left:${x}%;top:${y}%">${SKINS[skin].inner(colorKey)}</div>`;
}
function tokensFor(kit, skin, pal) {
  return kit.sample.map(([color, x, y], k) => {
    const [px, py] = kit.toPct([x, y]);
    const hex = pal && pal.c[color] ? pal.c[color] : color;
    return tokenHTML(skin, color, hex, px, py, k);
  }).join('');
}

const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACE_ROT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
const EMOJI_FACES = { 1: '🐣', 2: '👯', 3: '🍀', 4: '🍕', 5: '🖐️', 6: '🚀' };
const DICE_SKINS = { classic: 'Classic', gold: 'Gold', neon: 'Neon', wood: 'Wood', marble: 'Marble', party: 'Party', emoji: 'Emoji', sketch: 'Sketch' };
function cubeHTML(skin = 'classic', size = 56) {
  const faces = [1, 2, 3, 4, 5, 6].map((n) => skin === 'emoji'
    ? `<div class="face f${n} emo">${EMOJI_FACES[n]}</div>`
    : `<div class="face f${n}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<i class="${PIPS[n].includes(k) ? 'on' : ''}"></i>`).join('')}</div>`).join('');
  return `<div class="cube ds-${skin}" style="--sz:${size}px;transform:rotateX(-20deg) rotateY(-25deg)" data-rx="0" data-ry="0">${faces}</div>`;
}
// Same forward-only rotation as the fixed showDice in game.js.
function rollCube(cube, value = 1 + rand(6)) {
  const mod = (a) => ((a % 360) + 360) % 360;
  const [tx, ty] = FACE_ROT[value];
  const rx = +cube.dataset.rx, ry = +cube.dataset.ry;
  const nx = rx + mod(tx - rx) + 720, ny = ry + mod(ty - ry) + 720;
  cube.dataset.rx = nx; cube.dataset.ry = ny;
  cube.style.transform = `rotateX(${nx}deg) rotateY(${ny}deg)`;
  sfx.play('roll');
  return value;
}
function cowrieHTML(count = 6, mini = false) {
  return `<div class="cowries${mini ? ' mini' : ''}">${Array.from({ length: count }, (_, i) => `<i class="cowrie${i % 2 ? '' : ' up'}" style="--i:${i}"></i>`).join('')}</div>`;
}
async function rollCowries(box) {
  const shells = $$('.cowrie', box);
  box.classList.remove('toss'); void box.offsetWidth;
  shells.forEach((s) => s.style.setProperty('--r', `${720 + rand(4) * 90}deg`));
  box.classList.add('toss');
  sfx.play('roll', 'cartoon');
  let up = 0;
  await sleep(380);
  shells.forEach((s) => { const u = Math.random() < 0.5; s.classList.toggle('up', u); up += u; });
  await sleep(500);
  return up === 0 ? 6 : up;
}

/* ================= confetti & helpers ================= */
function confetti(x, y, n = 70, colors = SIX) {
  const fx = $('#fx');
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.cssText = `left:${x}px;top:${y}px;background:${pick(colors)};--dx:${(Math.random() - 0.5) * 520}px;--dy:${(Math.random() - 0.2) * 420}px;--rot:${rand(720)}deg`;
    fx.append(c); setTimeout(() => c.remove(), 1500);
  }
}
const centerOf = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
function floatEmoji(stage, emoji, x = '50%', y = '60%') {
  const e = document.createElement('div');
  e.className = 'float-emoji'; e.textContent = emoji; e.style.left = x; e.style.top = y;
  stage.append(e); setTimeout(() => e.remove(), 1700);
}

/* ================= option cards & picks ================= */
const picks = new Set((() => { try { return JSON.parse(localStorage.getItem('ludo-picks') || '[]'); } catch { return []; } })());
function card(code, title, demo, desc, extraCls = '') {
  return `<article class="opt ${extraCls}" data-code="${code}">
    <header><span class="code">${code}</span><h3>${title}</h3><button class="heart" type="button" aria-pressed="false" aria-label="Pick ${code}">♥</button></header>
    ${demo}${desc ? `<div class="desc">${desc}</div>` : ''}</article>`;
}
function syncPicks() {
  try { localStorage.setItem('ludo-picks', JSON.stringify([...picks])); } catch { /* storage blocked */ }
  $$('.opt').forEach((o) => {
    const on = picks.has(o.dataset.code);
    o.classList.toggle('picked', on);
    $('.heart', o).setAttribute('aria-pressed', on);
  });
  const order = 'TBPDMCLXSF';
  const list = [...picks].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]) || parseInt(a.slice(1)) - parseInt(b.slice(1)));
  $('#tray').classList.toggle('show', list.length > 0);
  $('#tray-codes').innerHTML = list.map((c) => `<span>${c}</span>`).join('');
  $('#tray-count').textContent = `${list.length} pick${list.length === 1 ? '' : 's'}`;
  return list;
}
document.addEventListener('click', (e) => {
  const h = e.target.closest('.heart');
  if (!h) return;
  const code = h.closest('.opt').dataset.code;
  if (picks.has(code)) picks.delete(code); else { picks.add(code); sfx.play('pop'); }
  syncPicks();
});
$('#tray-copy').onclick = async () => {
  const text = 'My Ludo picks: ' + syncPicks().join(' + ');
  const btn = $('#tray-copy');
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied!'; }
  catch { const ta = $('#tray-text'); ta.value = text; ta.select(); document.execCommand?.('copy'); btn.textContent = 'Selected, press Ctrl+C'; }
  setTimeout(() => (btn.textContent = 'Copy my picks'), 1800);
};
$('#tray-clear').onclick = () => { picks.clear(); syncPicks(); };
$('#mute').onclick = (e) => { e.currentTarget.textContent = sfx.toggle() ? '🔇' : '🔊'; };

/* ================= T · themes ================= */
const THEMES = {
  T1: { name: 'Candy Pop+', cls: 'th-candy', pal: 'candy', mode: 'flat', skin: 'face', dice: 'classic',
    desc: 'Today\'s look, turned up. <b>Squishy buttons, glossy faces on every piece, drifting confetti</b> behind the board. Feels like the current game, only juicier.' },
  T2: { name: 'Neon Arcade', cls: 'th-neon', pal: 'neon', mode: 'neon', skin: 'ring', dice: 'neon',
    desc: 'Late-night arcade cabinet. <b>Glowing outlines, scanlines, a synthwave grid</b> and light-trail pieces. Great in a dark room.' },
  T3: { name: 'Kerala Heritage', cls: 'th-heritage', pal: 'heritage', mode: 'pachisi', skin: 'brass', dice: 'cowrie',
    desc: 'Built on <b>Chaupar/Pachisi</b>, the cloth-cross game Ludo came from. Brass pieces, kolam dots on the base plates, a mandala centre, and <b>cowrie shells instead of dice</b>.' },
  T4: { name: 'Sketchbook', cls: 'th-sketch', pal: 'sketch', mode: 'sketch', skin: 'doodle', dice: 'sketch',
    desc: 'Everything drawn in pen on <b>lined notebook paper</b>: wobbly lines, hatched pieces, sticky-note names, handwriting font. Cosy and silly.' },
  T5: { name: 'Wooden Tabletop', cls: 'th-wood', pal: 'wood', mode: 'flat', skin: 'pawn', dice: 'wood',
    desc: 'A real board on a wooden table, <b>tilted in 3D with standing pawns</b> and a dice tray. Closest to playing Ludo at home.' },
  T6: { name: 'Cozy Critters', cls: 'th-garden', pal: 'garden', mode: 'garden', skin: 'critter', dice: 'party',
    desc: 'A garden path under a blue sky. <b>The pieces are animals</b> (fox, frog, chick, whale), with soft pastels, round tiles and a sunflower at home.' },
};
function kitFor(mode, pal) {
  if (mode === 'pachisi') return pachisiKit(pal);
  return classicKit(pal, mode);
}
function mockHTML(code, over = {}) {
  const t = THEMES[code], pal = PAL[t.pal];
  const skin = over.skin || t.skin, dice = over.dice || t.dice;
  const kit = kitFor(t.mode, pal);
  const diceEl = dice === 'cowrie' ? cowrieHTML(4, true) : cubeHTML(dice, 50);
  return `<div class="phone ${t.cls}"><div class="ph-screen ${over.bg || ''} ${over.dance || ''}">
    <div class="ph-top">
      <div class="pchip on" style="--c:${pal.c.red}"><span class="av">😎</span><span class="nm">Kunju</span><span class="hm">🏠1</span></div>
      <div class="pchip" style="--c:${pal.c.yellow}"><span class="av">🥰</span><span class="nm">Ammu</span><span class="hm">🏠0</span></div>
    </div>
    <div class="ph-boardwrap"><div class="ph-board">${kit.svg}<div class="ph-tokens" style="--n:${kit.n}">${tokensFor(kit, skin, pal)}</div></div></div>
    <div class="ph-ctrl"><button class="ph-dice" type="button" aria-label="Roll">${diceEl}</button><div class="ph-status">Your turn! Tap the dice</div></div>
    <div class="ph-bar"><span class="ph-chatpill">💬 Say something…</span><span class="ph-emo">😂</span><span class="ph-emo">🔥</span><span class="ph-emo">😈</span></div>
  </div></div>`;
}
function wireMockDice(root) {
  $$('.ph-dice', root).forEach((btn) => btn.onclick = async () => {
    const status = $('.ph-status', btn.parentElement);
    const cube = $('.cube', btn);
    let v;
    if (cube) { v = rollCube(cube); await sleep(900); } else v = await rollCowries($('.cowries', btn));
    status.textContent = v === 6 ? '6! Roll again 🎉' : `You rolled ${v}`;
    if (v === 6) sfx.play('home');
  });
}
$('#grid-T').innerHTML = Object.entries(THEMES).map(([code, t]) => card(code, t.name, mockHTML(code), `<p class="desc">${t.desc}</p>`)).join('');
wireMockDice($('#grid-T'));

/* ================= B · boards ================= */
{
  const portals = (() => {
    const at = (i) => TRACK[i].map((v) => v + 0.5);
    const swirl = ([x, y]) => `<circle cx="${x}" cy="${y}" r=".42" fill="#a77bff" stroke="${INK}" stroke-width=".06"/><circle cx="${x}" cy="${y}" r=".22" fill="none" stroke="#fff" stroke-width=".07" stroke-dasharray=".2 .12"/>`;
    const boost = ([x, y]) => `<text x="${x}" y="${y + 0.32}" font-size=".8" text-anchor="middle">⚡</text>`;
    const box = ([x, y]) => `<rect x="${x - 0.38}" y="${y - 0.38}" width=".76" height=".76" rx=".15" fill="#ffc233" stroke="${INK}" stroke-width=".06"/><text x="${x}" y="${y + 0.25}" font-size=".6" font-weight="700" text-anchor="middle" fill="${INK}">?</text>`;
    const link = (a, b) => `<path d="M${a[0]} ${a[1]}Q7.5 7.5 ${b[0]} ${b[1]}" fill="none" stroke="#a77bff" stroke-width=".12" stroke-dasharray=".3 .2" opacity=".85"/>`;
    const p1 = at(4), p2 = at(30), p3 = at(17), p4 = at(43);
    return link(p1, p2) + link(p3, p4) + [p1, p2, p3, p4].map(swirl).join('') + [at(10), at(23), at(36), at(49)].map(boost).join('') + [at(15), at(41)].map(box).join('');
  })();
  const flat = (kit, skin = 'face', pal = PAL.candy, cls = '') =>
    `<div class="stage ${cls}" style="padding:10px"><div class="ph-boardwrap" style="width:100%"><div class="ph-board">${kit.svg}<div class="ph-tokens" style="--n:${kit.n}">${tokensFor(kit, skin, pal)}</div></div></div></div>`;
  const boards = [
    ['B1', 'Classic cross, refined', flat(classicKit(PAL.candy)), 'The familiar 15×15 board, cleaned up: <b>thicker safe-star cells, softer base pads and a 4-colour home</b>. Works for 2–4 players.'],
    ['B2', 'Tilted 3D table', `<div class="stage" style="padding:10px"><div class="ph-boardwrap" style="width:100%;--persp:520px;--tilt:rotateX(32deg) scale(.92)"><div class="ph-board tilted" style="--board-sh:0 16px 18px #0008">${classicKit(PAL.candy).svg}<div class="ph-tokens" style="--n:15">${tokensFor(classicKit(PAL.candy), 'pawn', PAL.candy)}</div></div></div></div>`,
      'Same board, seen from your seat. <b>Pawns stand up and cast shadows</b>. A camera tilt could swing towards whoever\'s turn it is.'],
    ['B3', '6-player hex star', flat(radialKit(6), 'face', null), '<b>Up to 6 players.</b> Each player has an arm off a hexagon centre and a base between arms. Same rules, more chaos.'],
    ['B4', 'Round racetrack', flat(ringKit(), 'face', PAL.candy), 'One big loop of 52 tiles with spokes running into the centre. <b>It\'s easy to see who\'s ahead</b>, like a race.'],
    ['B5', 'Portals & power-ups', flat(classicKit(PAL.candy, 'flat', portals)), '<b>Twist mode:</b> 🌀 portals warp you across the board, ⚡ tiles push you 3 more, and ❓ boxes give a random power (shield, double roll, swap).'],
    ['B6', '3-player triangle', flat(radialKit(3, ['#ff5a5f', '#2bc48a', '#4d9de0']), 'face', null), 'A board sized for <b>exactly 3</b>, so no seat sits empty. The lobby picks the right board for the number of players.'],
  ];
  $('#grid-B').innerHTML = boards.map(([c, t, d, desc]) => card(c, t, d, `<p class="desc">${desc}</p>`)).join('');
}

/* ================= P · pieces ================= */
{
  const cols = [['red', '#ff5a5f'], ['green', '#2bc48a'], ['yellow', '#ffc233'], ['blue', '#4d9de0']];
  const strip = (skin, bg = 'var(--felt)', extra = '') => `<div class="stage" style="background:${bg};min-height:130px">
    <div style="position:relative;width:100%;height:90px;--n:5">${cols.map(([k, h], i) => tokenHTML(skin, k, h, 14 + i * 24, 55, i, extra)).join('')}</div></div>`;
  const moods = `<div class="row" data-moods>${['idle', 'happy', 'worried', 'dizzy', 'party'].map((m) => `<button class="chipbtn${m === 'idle' ? ' on' : ''}" type="button" data-mood="${m}">${{ idle: 'Idle', happy: 'Happy', worried: 'Threatened', dizzy: 'Bonked', party: 'Home!' }[m]}</button>`).join('')}</div>`;
  const pieces = [
    ['P1', 'Faces with feelings', strip('face', 'var(--felt)', 'data-mood="idle"') + moods, 'Pieces <b>react to the game</b>. They sweat when an enemy is close behind, see stars when bonked, and party when they get home. Tap the moods.'],
    ['P2', '3D pawns', strip('pawn', '#e9cf9f'), 'Classic board-game pawns with real <b>shading and shadows</b>. They look best on the tilted board (B2) or Wooden Tabletop (T5).'],
    ['P3', 'Critters', strip('critter', '#cfeec0'), 'Each colour is an animal. Later, <b>each player could pick their own critter</b>, so a duck can chase a cat.'],
    ['P4', 'Gems', strip('gem', '#1d1638'), 'Faceted crystals that <b>sparkle when they move</b>. They feel valuable, so losing one to a bonk really stings.'],
    ['P5', 'Your avatar', strip('photo'), '<b>Your own face or emoji</b> on every piece, so you always know whose is whose. A photo upload could come later.'],
    ['P6', 'Neon rings', strip('ring', '#0d0a1f'), 'Glowing hoops for the Neon theme that <b>leave light trails</b> when they move.'],
  ];
  $('#grid-P').innerHTML = pieces.map(([c, t, d, desc]) => card(c, t, d, `<p class="desc">${desc}</p>`)).join('');
  $('[data-moods]').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('[data-moods] button').forEach((x) => x.classList.toggle('on', x === b));
    $$('.opt[data-code="P1"] .tk').forEach((t) => (t.dataset.mood = b.dataset.mood));
    sfx.play(b.dataset.mood === 'dizzy' ? 'bonk' : b.dataset.mood === 'party' ? 'home' : 'pop');
  });
}

/* ================= D · dice ================= */
{
  const skinRow = `<div class="row" data-dskins>${['classic', 'gold', 'neon', 'wood', 'marble'].map((s, i) => `<button class="chipbtn${i ? '' : ' on'}" type="button" data-skin="${s}">${DICE_SKINS[s]}</button>`).join('')}</div>`;
  const reel = `<div class="slot"><div class="reel"><div class="strip">${Array.from({ length: 30 }, (_, i) => `<b>${(i % 6) + 1}</b>`).join('')}</div></div><button class="lever" type="button" aria-label="Pull"></button></div>`;
  const wheel = `<div class="spinner"><div class="pin"></div><div class="wheel">${[1, 2, 3, 4, 5, 6].map((n, i) => {
    const a = (i * 60 + 30 - 90) * Math.PI / 180; return `<span style="transform:translate(-50%,-50%) translate(${Math.cos(a) * 50}px,${Math.sin(a) * 50}px)">${n}</span>`;
  }).join('')}<div class="hub"></div></div></div>`;
  const flip = '<div class="flip"><div class="inner"><div class="side front">?</div><div class="side back">6</div></div></div>';
  const dice = [
    ['D1', '3D cube, fixed', `<div class="stage tap" data-d="cube" style="perspective:500px">${cubeHTML('classic', 84)}</div>${skinRow}`, 'The dice from today, <b>with the vanishing bug fixed</b> and skins you can unlock or pick.'],
    ['D2', 'Cowrie shells', `<div class="stage tap" data-d="cowrie">${cowrieHTML(6)}</div>`, 'Toss 6 cowries and <b>count the ones that land mouth-up</b> (none up = 6). The traditional way. Odds differ from a dice: 3s are common and 6s are rare, so it could be its own "heritage rules" mode.'],
    ['D3', 'Spinner wheel', `<div class="stage tap" data-d="wheel">${wheel}</div>`, 'A game-show wheel that <b>ticks as it slows down</b>. Big suspense on a 5 or a 6.'],
    ['D4', 'Slot machine', `<div class="stage tap" data-d="slot">${reel}</div>`, '<b>Pull the lever</b> and the reel spins. Rolling three 6s in a row could light up a jackpot.'],
    ['D5', 'Flip card', `<div class="stage tap" data-d="flip">${flip}</div>`, 'Numbers shuffle fast, then <b>a big card flips</b> to reveal your roll. Clean and easy to read on a small phone.'],
    ['D6', 'Party dice', `<div class="stage tap" data-d="party" style="perspective:500px;gap:18px;grid-auto-flow:column">${cubeHTML('party', 70)}${cubeHTML('emoji', 70)}</div>`, 'A <b>different colour on every face</b> with star pips, or emoji faces. The emoji version goes well with the Critters theme.'],
  ];
  $('#grid-D').innerHTML = dice.map(([c, t, d, desc]) => card(c, t, d + '<p class="result" aria-live="polite">Tap to roll</p>', `<p class="desc">${desc}</p>`)).join('');

  let wheelRot = 0;
  const say = (stage, txt) => ($('.result', stage.closest('.opt')).textContent = txt);
  $$('#grid-D .stage.tap').forEach((stage) => stage.addEventListener('click', async () => {
    if (stage.dataset.busy) return; stage.dataset.busy = 1;
    const kind = stage.dataset.d;
    say(stage, 'Rolling…');
    let v = 1 + rand(6);
    if (kind === 'cube' || kind === 'party') { $$('.cube', stage).forEach((c) => rollCube(c, v)); await sleep(950); }
    else if (kind === 'cowrie') v = await rollCowries($('.cowries', stage));
    else if (kind === 'wheel') {
      const w = $('.wheel', stage);
      const target = (360 - ((v - 1) * 60 + 30)) % 360;
      wheelRot += 1440 + ((target - (wheelRot % 360)) + 360) % 360;
      w.style.transform = `rotate(${wheelRot}deg)`;
      for (let i = 0; i < 16; i++) setTimeout(() => sfx.play('pop', 'arcade'), 2000 * (1 - Math.pow(1 - i / 16, 2)));
      await sleep(2250);
    } else if (kind === 'slot') {
      const strip = $('.strip', stage), h = $('.reel', stage).clientHeight;
      strip.style.transition = 'none'; strip.style.transform = 'translateY(0)'; void strip.offsetWidth;
      strip.style.transition = 'transform 1.6s cubic-bezier(.2,.9,.25,1.04)';
      strip.style.transform = `translateY(${-(24 + v - 1) * h}px)`;
      sfx.play('roll'); await sleep(1650);
    } else if (kind === 'flip') {
      const inner = $('.inner', stage), front = $('.front', stage), back = $('.back', stage);
      inner.style.transform = 'rotateY(0)';
      for (let i = 0; i < 9; i++) { front.textContent = 1 + rand(6); sfx.play('hop', 'arcade'); await sleep(70); }
      back.textContent = v; inner.style.transform = 'rotateY(180deg)'; await sleep(600);
    }
    say(stage, v === 6 ? '🎉 6! Roll again' : `You rolled ${v}`);
    if (v === 6) { sfx.play('home'); confetti(...centerOf(stage), 30); }
    delete stage.dataset.busy;
  }));
  $('[data-dskins]').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('[data-dskins] button').forEach((x) => x.classList.toggle('on', x === b));
    const cube = $('.opt[data-code="D1"] .cube');
    cube.className = `cube ds-${b.dataset.skin}`;
  });
}

/* ================= M · motion lab ================= */
{
  const strip = (cells = '', tokens = '<div class="mt sk-face" style="--c:#ff5a5f;left:6.25%"><i class="e l"></i><i class="e r"></i></div>') =>
    `<div class="stage mstage" style="min-height:150px;align-items:end"><div class="mstrip"><div class="cells">${Array.from({ length: 8 }, (_, i) => `<i class="${cells[i] || ''}"></i>`).join('')}</div>${tokens}<div class="mlabel"></div></div></div>`;
  const two = '<div class="mt sk-face" style="--c:#ff5a5f;left:6.25%"><i class="e l"></i><i class="e r"></i></div><div class="mt p2 sk-face" style="--c:#4d9de0;left:56.25%"><i class="e l"></i><i class="e r"></i></div>';
  const four = SIX.filter((_, i) => i !== 1 && i !== 5).map((c, i) => `<div class="mt sk-face" style="--c:${c};left:${18.75 + i * 21}%"><i class="e l"></i><i class="e r"></i></div>`).join('');
  const motions = [
    ['M1', 'Hop, hop, hop', strip(), 'Each step is <b>a little squash-and-stretch hop</b> with a tick sound, so you can count the moves.'],
    ['M2', 'Slide with a trail', strip(), 'One smooth glide that leaves <b>a fading colour trail</b>. Faster and calmer than hops.'],
    ['M3', 'Rocket on a 6', strip(), 'A 6 <b>launches the piece in an arc 🚀</b>, which lands with a dust puff.'],
    ['M4', 'Bonk!', strip(['', '', '', '', '', '', '', ''], two), 'Landing on someone <b>knocks them flying back to base</b>, with stars, a screen shake and a big BONK.'],
    ['M5', 'Home run', strip(['', '', '', '', '', '', '', 'home']), 'Reaching home <b>bursts into fireworks</b> in your colour, plus a chime.'],
    ['M6', 'Near miss slow-mo', strip(['', '', '', '', '', '', '', ''], two), 'When a chaser stops <b>one tile short</b>, time slows down, the screen darkens at the edges and everyone gasps.'],
    ['M7', 'Victory dance', strip(['', '', '', '', '', '', '', ''], four), 'The winner\'s pieces <b>dance, confetti rains down and a trophy drops in</b>. Each player could pick their own dance.'],
  ];
  $('#grid-M').innerHTML = motions.map(([c, t, d, desc]) => card(c, t, d + `<button class="chipbtn play" type="button">▶ Play</button>`, `<p class="desc">${desc}</p>`)).join('');

  const X = (i) => `${(i + 0.5) / 8 * 100}%`;
  const label = async (stage, text, ms = 900) => {
    const l = $('.mlabel', stage); l.textContent = text;
    await l.animate([{ opacity: 0, transform: 'scale(.3) rotate(-10deg)' }, { opacity: 1, transform: 'scale(1.15) rotate(-4deg)', offset: 0.2 }, { opacity: 1, transform: 'scale(1) rotate(-4deg)', offset: 0.8 }, { opacity: 0, transform: 'scale(1) translateY(-10px)' }], { duration: ms }).finished;
  };
  const burst = (stage, x, y, colors, n = 24) => {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'); p.className = 'particle'; p.style.background = pick(colors);
      p.style.left = x; p.style.bottom = y; $('.mstrip', stage).append(p);
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 60;
      p.animate([{ transform: 'translate(-50%,0) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), ${Math.sin(a) * d - 20}px) scale(.3)`, opacity: 0 }], { duration: 700 + rand(300), easing: 'cubic-bezier(.2,.7,.4,1)' }).finished.then(() => p.remove());
    }
  };
  const hop = (t, from, to, dur = 170) => t.animate([
    { left: X(from), transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-55%) scale(1.12,.92)', offset: 0.5 }, { left: X(to), transform: 'translateY(0) scale(1)' },
  ], { duration: dur, easing: 'ease-out', fill: 'forwards' }).finished;
  const reset = (stage) => { $$('.mt', stage).forEach((t) => { t.getAnimations().forEach((a) => a.cancel()); }); stage.classList.remove('vignette'); };

  const RUN = {
    async M1(stage) { const t = $('.mt', stage); for (let i = 0; i < 6; i++) { sfx.play('hop'); await hop(t, i, i + 1); } },
    async M2(stage) {
      const t = $('.mt', stage), strip = $('.mstrip', stage);
      const anim = t.animate([{ left: X(0) }, { left: X(6) }], { duration: 700, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
      sfx.play('hop', 'cartoon');
      const iv = setInterval(() => {
        const g = document.createElement('i'); g.className = 'ghost'; g.style.setProperty('--c', '#ff5a5f');
        g.style.left = getComputedStyle(t).left; g.style.bottom = t.style.bottom || getComputedStyle(t).bottom; strip.append(g);
        g.animate([{ opacity: 0.55, transform: 'scale(.9)' }, { opacity: 0, transform: 'scale(.4)' }], { duration: 450 }).finished.then(() => g.remove());
      }, 30);
      await anim.finished; clearInterval(iv);
    },
    async M3(stage) {
      const t = $('.mt', stage);
      t.insertAdjacentHTML('beforeend', '<span class="flame" style="position:absolute;bottom:-60%;font-size:70cqw;rotate:180deg">🔥</span>');
      sfx.play('hop', 'cartoon');
      await t.animate([
        { left: X(0), transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-260%) rotate(-20deg)', offset: 0.45 },
        { transform: 'translateY(-200%) rotate(15deg)', offset: 0.7 }, { left: X(6), transform: 'translateY(0) rotate(0)' },
      ], { duration: 900, easing: 'ease-in-out', fill: 'forwards' }).finished;
      $('.flame', t)?.remove();
      burst(stage, X(6), '20px', ['#c9b8a0', '#e8dccb', '#fff'], 14); sfx.play('bonk', 'soft');
    },
    async M4(stage) {
      const [a, b] = $$('.mt', stage);
      for (let i = 0; i < 4; i++) { sfx.play('hop'); await hop(a, i, i + 1); }
      sfx.play('bonk'); stage.classList.add('shake'); setTimeout(() => stage.classList.remove('shake'), 450);
      b.insertAdjacentHTML('beforeend', '<span class="x stars" style="position:absolute;top:-60%;font-size:50cqw">💫</span>');
      label(stage, 'BONK! 💥');
      await b.animate([
        { left: X(4), transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-300%) rotate(-360deg)', offset: 0.5 }, { left: X(0), transform: 'translateY(0) rotate(-720deg)' },
      ], { duration: 900, easing: 'ease-in-out', fill: 'forwards' }).finished;
      await sleep(500); $('.stars', b)?.remove();
    },
    async M5(stage) {
      const t = $('.mt', stage);
      for (let i = 2; i < 7; i++) { sfx.play('hop'); await hop(t, i, i + 1, 150); }
      sfx.play('home');
      burst(stage, X(7), '40px', ['#ff5a5f', '#ffc233', '#fff'], 36);
      setTimeout(() => burst(stage, X(7), '60px', ['#ff5a5f', '#ff9f43', '#fff'], 24), 250);
      label(stage, 'HOME! 🏠', 1100);
      await t.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.5) rotate(20deg)' }, { transform: 'scale(1)' }], { duration: 500 }).finished;
    },
    async M6(stage) {
      const [a, b] = $$('.mt', stage);
      b.animate([{ left: X(4) }], { duration: 1, fill: 'forwards' }); // victim sits on tile 5
      for (let i = 0; i < 2; i++) { sfx.play('hop'); await hop(a, i, i + 1); }
      stage.classList.add('vignette');
      b.dataset.mood = 'worried'; b.classList.add('sk-face'); b.innerHTML += '<i class="x sweat">💧</i>';
      sfx.play('hop', 'soft'); await hop(a, 2, 3, 1100);
      label(stage, 'SO CLOSE! 😰', 1300); sfx.play('pop', 'soft');
      await sleep(1300); stage.classList.remove('vignette'); b.dataset.mood = ''; $('.sweat', b)?.remove();
    },
    async M7(stage) {
      const ts = $$('.mt', stage);
      sfx.play('win'); confetti(...centerOf(stage), 90);
      label(stage, '🏆 KUNJU WINS!', 1800);
      await Promise.all(ts.map((t, i) => t.animate([
        { transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-70%) rotate(-15deg)' }, { transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-70%) rotate(15deg)' }, { transform: 'translateY(0) rotate(0)' },
      ], { duration: 700, iterations: 2, delay: i * 90 }).finished));
    },
  };
  $$('#grid-M .opt').forEach((opt) => {
    const stage = $('.stage', opt), code = opt.dataset.code, btn = $('.play', opt);
    const go = async () => {
      if (stage.dataset.busy) return; stage.dataset.busy = 1; reset(stage);
      try { await RUN[code](stage); } finally { await sleep(700); reset(stage); delete stage.dataset.busy; }
    };
    btn.onclick = go; stage.onclick = go;
  });
}

/* ================= C · talk & communicate ================= */
{
  const mini = classicKit(PAL.candy);
  const miniBoard = (inner = '') => `<div class="miniboard">${mini.svg}${inner}</div>`;
  const talk = [
    ['C1', 'Live chat', `<div class="stage" style="padding:10px"><div class="chat">
        <div class="msgs" aria-live="polite">
          <div class="msg them"><small>Ammu</small>don't you dare 😤</div>
          <div class="msg me">too late 😈</div>
          <div class="msg them"><small>Ammu</small>I'm keeping a list of every bonk</div>
        </div>
        <div class="quick">${['GG 🤝', 'nooo 😭', 'lucky 🍀', 'watch this 😏', 'revenge soon'].map((q) => `<button type="button">${q}</button>`).join('')}</div>
        <form><input id="chat-input" placeholder="Type a message…" autocomplete="off" aria-label="Message"><button type="submit">Send</button></form>
      </div></div>`, 'A real chat that <b>slides up from the bottom</b>, with "typing…" dots, quick replies and unread badges. <b>Try typing:</b> Ammu answers.'],
    ['C2', 'Bubbles on the board', `<div class="stage" style="gap:10px">${miniBoard()}<div class="row" data-say>${['Mine! 😈', 'Please no 🥺', 'Ha!', 'Run!!'].map((q) => `<button class="chipbtn" type="button">${q}</button>`).join('')}</div></div>`,
      'Chat messages also <b>pop up as comic bubbles</b> right above that player\'s piece, so you don\'t miss them mid-move.'],
    ['C3', 'Emote wheel', '<div class="stage"><div class="wheelwrap"><div class="emote-wheel"></div><button class="emote-btn" type="button" aria-label="Emotes">😀</button></div></div>',
      '<b>Press and hold</b>, slide to an emoji and let go. Or tap to open it, then tap an emoji. It\'s quicker than a row of buttons and holds 8+ reactions.'],
    ['C4', 'Board pings', `<div class="stage" style="gap:10px">${miniBoard()}<div class="row" data-pings>${['👀 Watch out!', '👉 Go here', '😱 Run!', '🎯 Target'].map((q, i) => `<button class="chipbtn${i ? '' : ' on'}" type="button">${q}</button>`).join('')}</div></div>`,
      '<b>Tap any tile</b> to drop a pulsing marker your friend sees. Pick a label first. It\'s a way to point at the board without typing.'],
    ['C5', 'Doodle on the board', `<div class="stage" style="gap:10px">${miniBoard('<canvas></canvas>')}<div class="row" data-ink>${['#ff5a5f', '#2bc48a', '#4d9de0', '#2b2140'].map((c, i) => `<button class="chipbtn${i ? '' : ' on'}" type="button" data-c="${c}"><span class="swatch" style="background:${c}"></span>${['Red', 'Green', 'Blue', 'Ink'][i]}</button>`).join('')}</div></div>`,
      '<b>Draw arrows and circles</b> straight onto the board ("I\'m coming for THIS one"). Strokes fade after a few seconds. Try it.'],
    ['C6', 'Walkie-talkie', '<div class="stage"><div class="walkie"><div class="wave">' + Array.from({ length: 14 }, (_, i) => `<i style="--i:${i};--h:${8 + rand(26)}px"></i>`).join('') + '</div><button class="ptt" type="button" aria-label="Hold to talk">🎙️</button><p class="hint">Hold to talk. Let go to send.</p><div class="vnotes"></div></div></div>',
      '<b>Push-to-talk voice</b> for when typing is too slow. Hold, speak, let go, and it plays on the other phone. It could also be an always-on voice call. (This demo shows the screen only and doesn\'t use your mic.)'],
    ['C7', 'Taunt stickers', '<div class="stage" style="min-height:220px;align-content:end"><div class="taunts">' +
      [['Get bonked!', '#ff5a5f'], ['Is that all?', '#ffc233'], ['Lucky roll 🍀', '#2bc48a'], ['Beginner\'s luck', '#4d9de0'], ['GG 🤝', '#fff'], ['Revenge is coming', '#a77bff']]
        .map(([t, c]) => `<button class="taunt" type="button" style="--bgc:${c}">${t}</button>`).join('') + '</div></div>',
      'Big cartoon stickers that <b>slam onto both screens</b> with a sound. It\'s pure trash talk. A cooldown stops anyone spamming.'],
    ['C8', 'Mood faces & hype meter', `<div class="stage" style="gap:12px"><div class="mood"><div class="bigface" style="--c:#ff5a5f">😎</div><div class="row" data-moodface>${['😎', '😤', '😭', '🥳', '🤔'].map((m) => `<button class="chipbtn" type="button">${m}</button>`).join('')}</div></div><div class="hype"><i></i></div><button class="chipbtn" type="button" data-hype>🔥 Hype it up</button></div>`,
      'Your avatar shows <b>a live mood</b> the other player can see. Both players tapping 🔥 fills a shared <b>hype meter</b>, and at 100% the board goes wild for one turn.'],
    ['C9', 'Truce & deals', '<div class="stage"><div class="truce"><div class="who">🥰 → 😎</div><b>Ammu offers a truce</b><span>No bonking each other for 2 turns 🤝</span><div class="row"><button class="chipbtn yes" type="button">Accept</button><button class="chipbtn no" type="button">No way</button></div></div></div>',
      'For 3–6 player games: <b>offer deals</b> such as truces, "team up on Red" or "I won\'t bonk you if…". They aren\'t enforced, so betrayal is part of the fun.'],
  ];
  $('#grid-C').innerHTML = talk.map(([c, t, d, desc]) => card(c, t, d, `<p class="desc">${desc}</p>`)).join('');

  // C1 chat
  {
    const box = $('.opt[data-code="C1"] .msgs'), form = $('.opt[data-code="C1"] form'), input = $('#chat-input');
    const REPLIES = ['haha no 😂', 'just you wait…', 'okay that was rude 😤', '🫡', 'why are you like this', 'my yellow is COMING for you', 'lol', 'one more game after this?'];
    const add = (text, who) => { box.insertAdjacentHTML('beforeend', `<div class="msg ${who}">${who === 'them' ? '<small>Ammu</small>' : ''}${text.replace(/[<&]/g, (ch) => ch === '<' ? '&lt;' : '&amp;')}</div>`); box.scrollTop = box.scrollHeight; };
    const send = async (text) => {
      if (!text.trim()) return;
      add(text, 'me'); sfx.play('pop');
      await sleep(400);
      box.insertAdjacentHTML('beforeend', '<div class="typing"><i></i><i></i><i></i></div>'); box.scrollTop = box.scrollHeight;
      await sleep(900 + rand(700));
      $('.typing', box)?.remove(); add(pick(REPLIES), 'them'); sfx.play('pop', 'soft');
    };
    form.onsubmit = (e) => { e.preventDefault(); send(input.value); input.value = ''; };
    $$('.opt[data-code="C1"] .quick button').forEach((b) => (b.onclick = () => send(b.textContent)));
  }
  // C2 bubbles above Ammu's piece
  {
    const opt = $('.opt[data-code="C2"]'), board = $('.miniboard', opt);
    const [x, y] = mini.toPct(classicPoint('yellow', 4));
    board.insertAdjacentHTML('beforeend', `<div class="ph-tokens" style="--n:15">${tokenHTML('face', 'yellow', '#ffc233', x, y)}${tokenHTML('face', 'red', '#ff5a5f', ...mini.toPct(classicPoint('red', 6)))}</div>`);
    $('[data-say]', opt).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const bub = document.createElement('div'); bub.className = 'bubble'; bub.textContent = b.textContent;
      const who = Math.random() < 0.5;
      const [bx, by] = who ? [x, y] : mini.toPct(classicPoint('red', 6));
      bub.style.left = `${bx}%`; bub.style.top = `${by - 5}%`; board.append(bub); sfx.play('pop');
      setTimeout(() => bub.remove(), 2700);
    });
  }
  // C3 emote wheel
  {
    const wrap = $('.opt[data-code="C3"] .wheelwrap'), wheel = $('.emote-wheel', wrap), btn = $('.emote-btn', wrap), stage = wrap.parentElement;
    const EM = ['😂', '🔥', '😭', '👏', '😈', '🫡', '😱', '🥳'];
    wheel.innerHTML = EM.map((e, i) => {
      const a = (i / EM.length) * Math.PI * 2 - Math.PI / 2; return `<span style="transform:translate(${Math.cos(a) * 80}px,${Math.sin(a) * 80}px)" data-e="${e}">${e}</span>`;
    }).join('');
    let holdT = null, held = false, hot = null;
    const open = () => wheel.classList.add('open');
    const close = () => { wheel.classList.remove('open'); $$('span', wheel).forEach((s) => s.classList.remove('hot')); };
    const fire = (e) => { floatEmoji(stage, e, `${30 + rand(40)}%`, '60%'); sfx.play('pop'); };
    btn.addEventListener('pointerdown', (e) => { held = false; holdT = setTimeout(() => { held = true; open(); }, 220); btn.setPointerCapture(e.pointerId); });
    btn.addEventListener('pointermove', (e) => {
      if (!held) return;
      const el = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.dataset && n.dataset.e);
      $$('span', wheel).forEach((s) => s.classList.toggle('hot', s === el)); hot = el;
    });
    btn.addEventListener('pointerup', () => {
      clearTimeout(holdT);
      if (held) { if (hot) fire(hot.dataset.e); close(); hot = null; }
      else wheel.classList.toggle('open');
    });
    wheel.addEventListener('click', (e) => { const s = e.target.closest('span'); if (s) { fire(s.dataset.e); close(); } });
  }
  // C4 pings
  {
    const opt = $('.opt[data-code="C4"]'), board = $('.miniboard', opt);
    let lbl = '👀 Watch out!';
    $('[data-pings]', opt).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; lbl = b.textContent;
      $$('[data-pings] button', opt).forEach((x) => x.classList.toggle('on', x === b));
    });
    board.addEventListener('click', (e) => {
      const r = board.getBoundingClientRect();
      const cx = Math.floor((e.clientX - r.left) / r.width * 15), cy = Math.floor((e.clientY - r.top) / r.height * 15);
      const p = document.createElement('div'); p.className = 'ping'; p.style.setProperty('--c', '#ff5a5f');
      p.style.left = `${(cx + 0.5) / 15 * 100}%`; p.style.top = `${(cy + 0.5) / 15 * 100}%`;
      p.innerHTML = `<i></i><b>${lbl}</b>`; board.append(p); sfx.play('pop', 'cartoon');
      setTimeout(() => p.remove(), 3500);
    });
  }
  // C5 doodle
  {
    const opt = $('.opt[data-code="C5"]'), cv = $('canvas', opt), ctx = cv.getContext('2d');
    let color = '#ff5a5f', strokes = [], cur = null;
    const size = () => { const r = cv.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; };
    const draw = () => {
      if (!cv.width) size();
      ctx.clearRect(0, 0, cv.width, cv.height);
      const now = performance.now();
      strokes = strokes.filter((s) => !s.done || now - s.done < 3200);
      for (const s of strokes) {
        const age = s.done ? (now - s.done) / 3200 : 0;
        ctx.globalAlpha = Math.max(0, 1 - age * age);
        ctx.strokeStyle = s.color; ctx.lineWidth = 5 * devicePixelRatio; ctx.lineCap = ctx.lineJoin = 'round';
        ctx.beginPath(); s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * cv.width, y * cv.height) : ctx.moveTo(x * cv.width, y * cv.height))); ctx.stroke();
      }
      if (strokes.length) requestAnimationFrame(draw);
    };
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    cv.addEventListener('pointerdown', (e) => { size(); cv.setPointerCapture(e.pointerId); cur = { color, pts: [pt(e)] }; strokes.push(cur); requestAnimationFrame(draw); });
    cv.addEventListener('pointermove', (e) => { if (cur) cur.pts.push(pt(e)); });
    const end = () => { if (cur) { cur.done = performance.now(); cur = null; } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    $('[data-ink]', opt).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; color = b.dataset.c;
      $$('[data-ink] button', opt).forEach((x) => x.classList.toggle('on', x === b));
    });
  }
  // C6 walkie-talkie (UI only, no microphone)
  {
    const opt = $('.opt[data-code="C6"]'), ptt = $('.ptt', opt), wave = $('.wave', opt), notes = $('.vnotes', opt);
    let t0 = 0;
    const startTalk = (e) => { e.preventDefault(); t0 = performance.now(); ptt.classList.add('live'); wave.classList.add('live'); sfx.play('pop', 'soft'); };
    const stopTalk = () => {
      if (!t0) return;
      const secs = Math.max(1, Math.round((performance.now() - t0) / 1000)); t0 = 0;
      ptt.classList.remove('live'); wave.classList.remove('live');
      const bars = Array.from({ length: 22 }, () => `<i style="height:${20 + rand(80)}%"></i>`).join('');
      notes.insertAdjacentHTML('afterbegin', `<div class="vnote"><button type="button" aria-label="Play">▶</button><div class="bars">${bars}</div><small>0:0${Math.min(9, secs)}</small></div>`);
      notes.querySelectorAll('.vnote')[3]?.remove();
      sfx.play('pop');
    };
    ptt.addEventListener('pointerdown', startTalk);
    ptt.addEventListener('pointerup', stopTalk); ptt.addEventListener('pointerleave', stopTalk);
    notes.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const bars = $$('.bars i', b.parentElement);
      for (const bar of bars) { bar.classList.add('lit'); await sleep(60); }
      await sleep(300); bars.forEach((x) => x.classList.remove('lit'));
    });
  }
  // C7 taunts
  {
    const opt = $('.opt[data-code="C7"]'), stage = $('.stage', opt);
    $$('.taunt', opt).forEach((b) => (b.onclick = () => {
      $$('.sticker', stage).forEach((s) => s.remove());
      const s = document.createElement('div'); s.className = 'sticker'; s.textContent = b.textContent;
      s.style.setProperty('--bgc', b.style.getPropertyValue('--bgc')); s.style.setProperty('--r', `${-12 + rand(24)}deg`);
      stage.append(s); sfx.play('bonk', 'cartoon');
      stage.classList.add('shake'); setTimeout(() => stage.classList.remove('shake'), 450);
      setTimeout(() => s.remove(), 1900);
    }));
  }
  // C8 mood & hype
  {
    const opt = $('.opt[data-code="C8"]'), face = $('.bigface', opt), meter = $('.hype i', opt), stage = $('.stage', opt);
    $('[data-moodface]', opt).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      face.textContent = b.textContent; face.classList.remove('pop'); void face.offsetWidth; face.classList.add('pop'); sfx.play('pop');
    });
    let hype = 0;
    $('[data-hype]', opt).onclick = () => {
      hype = Math.min(100, hype + 17); meter.style.width = `${hype}%`; sfx.play('hop');
      floatEmoji(stage, '🔥', `${20 + rand(60)}%`, '70%');
      if (hype >= 100) {
        sfx.play('win'); confetti(...centerOf(stage), 80); stage.classList.add('hyped');
        setTimeout(() => { stage.classList.remove('hyped'); hype = 0; meter.style.width = '0'; }, 3000);
      }
    };
  }
  // C9 truce
  {
    const opt = $('.opt[data-code="C9"]'), box = $('.truce', opt);
    $('.yes', opt).onclick = () => { box.classList.add('sealed'); box.innerHTML = '<div class="who">🤝</div><b>Truce sealed for 2 turns</b><span>…for now 😏</span>'; sfx.play('home', 'soft'); };
    $('.no', opt).onclick = () => { box.innerHTML = '<div class="who">💔</div><b>Truce rejected</b><span>Ammu is now plotting revenge</span>'; sfx.play('bonk', 'cartoon'); };
  }
}

/* ================= L · lobby & profile ================= */
{
  const seatColors = ['#ff5a5f', '#2bc48a', '#ffc233', '#4d9de0', '#a77bff', '#ff9f43'];
  const people = [['Kunju', '😎', true], ['Ammu', '🥰', true], ['Bot Bonky', '🤖', true], ['', '', false], ['', '', false], ['', '', false]];
  const lobby = `<div class="stage" style="gap:12px;place-items:stretch">
    <div class="row" style="justify-content:space-between"><span>Room <span class="roomcode">PARTY7</span></span><button class="chipbtn" type="button">📋 Invite link</button></div>
    <div class="row" data-count>${[2, 3, 4, 5, 6].map((n) => `<button class="chipbtn${n === 3 ? ' on' : ''}" type="button">${n}</button>`).join('')}<span class="hint">players</span></div>
    <div class="row" style="gap:12px;align-items:start"><div class="lobby-board"></div><div class="seats"></div></div>
    <button class="chipbtn on" type="button" style="justify-self:center;font-size:17px;padding:10px 22px">🎲 Start game</button></div>`;
  const profile = `<div class="stage"><div class="profile">
    <div class="top"><div class="ava">😎</div><div><h4>Panchara Kunju</h4><span class="title">💥 Bonk Master</span></div></div>
    <div class="xp" title="Level 7"><i></i></div>
    <div class="stats"><div><b>42</b><small>Games</small></div><div><b>23</b><small>Wins</small></div><div><b>117</b><small>Bonks</small></div><div><b>88</b><small>Sixes</small></div></div>
    <div class="badges"><span>🔥 5-win streak</span><span>🎯 Triple bonk</span><span>🐢 Comeback kid</span></div></div></div>`;
  const party = `<div class="stage" style="gap:8px;place-items:stretch"><p class="hint" style="text-align:center">Waiting for Ammu to join… pop bubbles while you wait</p><div class="bubbles"></div><p class="result" data-score>Score: 0</p></div>`;
  $('#grid-L').innerHTML = [
    card('L1', 'Seat lobby, 2–6 players', lobby, '<p class="desc"><b>Pick the number of seats</b> and the board changes to fit (classic for 2 or 4, triangle for 3, star for 5 or 6). Tap a seat\'s colour to change it, tap Ready, and fill empty seats with bots.</p>', 'wide-card'),
    card('L2', 'Player profile', profile, '<p class="desc">Each login gets <b>a profile with a title, stats and badges</b> earned in games. It also shows up in the lobby and on the win screen.</p>'),
    card('L3', 'Party room while waiting', party, '<p class="desc">Instead of a blank "waiting…" screen, there\'s a <b>tiny warm-up game</b> plus chat. Here it\'s popping bubbles, and the best score could start first.</p>'),
  ].join('');
  const opt = $('.opt[data-code="L1"]');
  opt.style.gridColumn = 'span 2';
  const fit = () => { opt.style.gridColumn = matchMedia('(max-width: 820px)').matches ? '' : 'span 2'; };
  fit(); addEventListener('resize', fit);
  let count = 3;
  const render = () => {
    $('.seats', opt).innerHTML = Array.from({ length: count }, (_, i) => {
      const [nm, av, ready] = people[i];
      return nm
        ? `<div class="seat" style="--c:${seatColors[i]}"><span class="sw" data-i="${i}" title="Change colour">${av}</span><b>${nm}</b><button type="button" class="rd${ready ? ' ok' : ''}" data-i="${i}">${ready ? 'Ready ✓' : 'Not ready'}</button></div>`
        : `<div class="seat empty"><span class="sw">＋</span><b>Empty seat</b><button type="button" class="rd" data-bot="${i}">Add bot 🤖</button></div>`;
    }).join('');
    const board = count === 2 || count === 4 ? classicKit(PAL.candy).svg : radialKit(count === 3 ? 3 : count, seatColors).svg;
    $('.lobby-board', opt).innerHTML = board;
  };
  render();
  $('[data-count]', opt).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    count = +b.textContent; $$('[data-count] button', opt).forEach((x) => x.classList.toggle('on', x === b)); render(); sfx.play('pop');
  });
  $('.seats', opt).addEventListener('click', (e) => {
    const sw = e.target.closest('.sw[data-i]'), rd = e.target.closest('.rd[data-i]'), bot = e.target.closest('[data-bot]');
    if (sw) {
      const i = +sw.dataset.i, palette = [...SIX, '#ff6fb5', '#1fc8c8'];
      let c = palette.indexOf(seatColors[i]);
      do c = (c + 1) % palette.length; while (seatColors.slice(0, count).includes(palette[c]));
      seatColors[i] = palette[c]; render();
    }
    if (rd) { people[+rd.dataset.i][2] = !people[+rd.dataset.i][2]; render(); }
    if (bot) { people[+bot.dataset.bot] = [pick(['Bot Bonky', 'Robo Rani', 'Chip', 'Dice-o-tron']), '🤖', true]; render(); }
    sfx.play('pop');
  });
  // L3 bubbles
  const field = $('.opt[data-code="L3"] .bubbles'), score = $('.opt[data-code="L3"] [data-score]');
  let pts = 0;
  const spawn = () => {
    if (!document.body.contains(field) || document.hidden || REDUCED) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bub'; b.textContent = pick(['🎲', '⭐', '💥', '🍀', '❤️']);
    b.style.left = `${5 + rand(80)}%`; b.style.animationDuration = `${3 + Math.random() * 3}s`;
    b.onclick = () => { b.classList.add('popped'); pts++; score.textContent = `Score: ${pts}`; sfx.play('pop', 'cartoon'); setTimeout(() => b.remove(), 250); };
    b.addEventListener('animationend', (e) => { if (e.animationName === 'rise') b.remove(); });
    field.append(b);
  };
  setInterval(spawn, 700);
}

/* ================= X · customize locker ================= */
{
  const state = { theme: 'T1', skin: '', dice: '', bg: '', pack: 'arcade' };
  const chips = (key, items) => `<div class="row" data-x="${key}">${items.map(([v, label], i) => `<button class="chipbtn${i ? '' : ' on'}" type="button" data-v="${v}">${label}</button>`).join('')}</div>`;
  $('#locker').innerHTML = `
    <div class="ctl">
      <div><h4>Theme</h4>${chips('theme', Object.entries(THEMES).map(([k, t]) => [k, `${k} ${t.name}`]))}</div>
      <div><h4>Pieces</h4>${chips('skin', [['', 'Theme default'], ...['face', 'pawn', 'critter', 'gem', 'photo', 'ring', 'brass', 'doodle'].map((s) => [s, SKINS[s].name])])}</div>
      <div><h4>Dice</h4>${chips('dice', [['', 'Theme default'], ...Object.entries(DICE_SKINS), ['cowrie', 'Cowries']])}</div>
      <div><h4>Background</h4>${chips('bg', [['', 'Theme default'], ['bg-sunset', '🌅 Sunset'], ['bg-ocean', '🌊 Ocean'], ['bg-stars', '✨ Night sky'], ['bg-backwaters', '🛶 Backwaters'], ['bg-mint', '🍃 Mint']])}</div>
      <div><h4>Victory dance</h4>${chips('dance', [['dance-bounce', '🦘 Bounce'], ['dance-spin', '🌀 Spin'], ['dance-wave', '🌊 Wave'], ['dance-party', '🥳 Party']])}<p class="hint" style="margin-top:6px">Tap one to preview it.</p></div>
      <div><h4>Sound pack</h4>${chips('pack', [['arcade', '👾 Arcade'], ['soft', '🎵 Soft marimba'], ['cartoon', '🤪 Cartoon']])}</div>
    </div>
    <div class="preview"><div id="x-mock"></div><p class="hint">This preview updates as you pick.</p></div>`;
  const render = (dance = '') => {
    $('#x-mock').innerHTML = mockHTML(state.theme, { skin: state.skin, dice: state.dice, bg: state.bg, dance });
    wireMockDice($('#x-mock'));
  };
  render();
  $('#locker').addEventListener('click', (e) => {
    const b = e.target.closest('[data-x] button'); if (!b) return;
    const key = b.parentElement.dataset.x, v = b.dataset.v;
    $$('button', b.parentElement).forEach((x) => x.classList.toggle('on', x === b));
    if (key === 'dance') { render(v); sfx.play('win'); setTimeout(() => render(), 2600); return; }
    if (key === 'pack') { state.pack = v; sfx.setPack(v); sfx.play('home'); return; }
    state[key] = v; render(); sfx.play('pop');
  });
}

/* ================= S · sounds ================= */
{
  const packs = [
    ['S1', 'Arcade', 'arcade', 'Chiptune bleeps like an old handheld console. <b>Punchy and loud.</b>'],
    ['S2', 'Soft marimba', 'soft', 'Wooden, gentle notes. <b>Nice for late-night games</b> that won\'t wake anyone.'],
    ['S3', 'Cartoon', 'cartoon', 'Boings, slide whistles and kazoos. <b>The silliest choice</b>, and it fits bonks really well.'],
  ];
  const SOUNDS = [['roll', '🎲', 'Roll'], ['hop', '👣', 'Hop'], ['bonk', '💥', 'Bonk'], ['home', '🏠', 'Home'], ['win', '🏆', 'Win'], ['pop', '💬', 'Chat']];
  $('#grid-S').innerHTML = packs.map(([c, t, p, desc]) => card(c, t,
    `<div class="sb" data-pack="${p}">${SOUNDS.map(([k, e, l]) => `<button type="button" data-s="${k}"><span>${e}</span>${l}</button>`).join('')}</div>`, `<p class="desc">${desc}</p>`)).join('');
  $('#grid-S').addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    sfx.play(b.dataset.s, b.parentElement.dataset.pack);
    b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 150);
  });
}

/* ================= F · more ideas (text only) ================= */
{
  const ideas = [
    ['F1', '🎡', 'Daily lucky spin', 'One free spin a day wins a dice skin, a piece skin or a title. It gives you a small reason to open the game.'],
    ['F2', '🃏', 'Power-up cards', 'Earn a card every few turns: Shield, Double move, Swap places, Freeze an opponent. Optional "chaos mode".'],
    ['F3', '📼', 'Instant replay', 'The best bonk of the game replays in slow-mo on the win screen, and you can share it as a GIF.'],
    ['F4', '👀', 'Spectators', 'Friends can watch a game live and throw emoji, without playing. Good for 2-player games with an audience.'],
    ['F5', '🎯', 'Revenge marker', 'Whoever bonked you gets a 🎯 over their piece until you get them back. Bonking them back pays a bonus.'],
    ['F6', '🏅', 'Season titles', 'Monthly leaderboard between your group of friends, with silly titles: "Six Machine", "Bonk Queen", "Forever Second".'],
    ['F7', '⏱️', 'Speed mode', '10 seconds per turn, auto-move when time runs out. Whole games in 5 minutes.'],
    ['F8', '🤝', 'Team Ludo (2v2)', 'Partners sit opposite and can share sixes and protect each other\'s pieces.'],
  ];
  $('#grid-F').innerHTML = ideas.map(([c, e, t, d]) => card(c, t, `<div class="big" aria-hidden="true">${e}</div>`, `<p class="desc">${d}</p>`)).join('');
}

/* ================= nav highlight & init ================= */
{
  const links = $$('.tabs a');
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${en.target.id}`));
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('.sec').forEach((s) => io.observe(s));
  syncPicks();
}
