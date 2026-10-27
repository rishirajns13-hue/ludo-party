'use strict';
/* Social layer: icons, your look (avatar + colours), the all-time score, chat, bubbles,
   emote wheel, stickers and hold-to-talk voice notes. Talks to game.js through
   sendSocial(), game, myColors, nameOf(), avatarOf(), sfx, toast(), floatEmoji(). */

/* ================= icons (one stroke family, 24px grid) ================= */
const DOT = (x, y) => `<circle cx="${x}" cy="${y}" r="1.5" fill="currentColor" stroke="none"/>`;
const ICONS = {
  dice: `<rect x="4" y="4" width="16" height="16" rx="4"/>${DOT(9, 9)}${DOT(15, 15)}${DOT(12, 12)}`,
  chat: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-5 4v-4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  smile: `<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8"/>${DOT(9, 10)}${DOT(15, 10)}`,
  send: '<path d="M5 12l14-7-5 15-2.5-6z"/><path d="M11.5 14L19 5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  share: '<path d="M12 4v11M7.5 8.5L12 4l4.5 4.5"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  volume: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5a2.5 2.5 0 0 1-2.5 4M12 13v4M8.5 20h7M10 17h4"/>',
  crown: '<path d="M4 18L3 8l5 4 4-6 4 6 5-4-1 10z" fill="currentColor"/>',
  bot: `<rect x="5" y="8" width="14" height="11" rx="3.5"/><path d="M12 4.5V8M3 13v2M21 13v2"/>${DOT(9.5, 13)}${DOT(14.5, 13)}`,
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
};
const ic = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]:not([data-iconed])').forEach((el) => {
    el.insertAdjacentHTML('afterbegin', ic(el.dataset.icon));
    el.dataset.iconed = '';
  });
}
function setIcon(el, name) { const svg = el.querySelector('svg.ic'); if (svg) svg.innerHTML = ICONS[name]; }

/* ================= your look: avatar + colours ================= */
const AVATARS = ['😎', '🥰', '🤓', '🤠', '😺', '🐼', '🦊', '👻', '🐸', '🦄', '🐯', '🐙'];
const PALETTES = [['sunset', 'Sunset'], ['lagoon', 'Lagoon'], ['lemonade', 'Lemonade']];
const THEME_COLOR = { sunset: '#8f6bff', lagoon: '#2ad0c1', lemonade: '#ffb03b' };
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
};
const DEFAULT_AVATAR = { 'panchara kunju': '😎', ammu: '🥰' };
function myAvatar() {
  const name = me ? me.name.toLowerCase() : '';
  const a = store.get('ludo-avatar:' + name, null);
  return AVATARS.includes(a) ? a : DEFAULT_AVATAR[name] || '😎';
}
function applyPalette(p = store.get('ludo-palette', 'sunset')) {
  if (!PALETTES.some(([k]) => k === p)) p = 'sunset';
  document.body.className = document.body.className.replace(/\bpal-\S+/g, '').trim() + ` pal-${p}`;
  document.querySelector('meta[name="theme-color"]').content = THEME_COLOR[p];
  return p;
}
function renderMeSheet() {
  const mine = myAvatar(), pal = store.get('ludo-palette', 'sunset');
  $('#avatars').innerHTML = AVATARS.map((a) => `<button type="button" aria-pressed="${a === mine}" aria-label="Avatar ${a}">${a}</button>`).join('');
  $('#palettes').innerHTML = PALETTES.map(([k, label]) => `<button type="button" class="pal-${k}" data-pal="${k}" aria-pressed="${k === pal}"><span></span>${label}</button>`).join('');
}
$('#avatars').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || !me) return;
  store.set('ludo-avatar:' + me.name.toLowerCase(), b.textContent);
  renderMeSheet(); renderHome(); sfx.pop();
});
$('#palettes').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  store.set('ludo-palette', applyPalette(b.dataset.pal));
  renderMeSheet(); sfx.pop();
});

/* ================= all-time score, kept on this device ================= */
const recordKey = () => 'ludo-record:' + me.name.toLowerCase();
function recordResult(s) {
  if (mode === 'cpu' || !s.winners || !me) return;
  const done = store.get('ludo-recorded', []);
  if (done.includes(s.gid)) return;
  store.set('ludo-recorded', done.concat(s.gid).slice(-50));
  const mine = myColors[0], iWon = s.winners.includes(mine), rec = store.get(recordKey(), {});
  const myTeam = R.teamOf(s, mine);
  for (const c of s.players) {
    if (myTeam.includes(c) || (s.bots || []).includes(c)) continue;
    const theyWon = s.winners.includes(c);
    if (iWon === theyWon) continue; // neither beat the other
    const name = s.names[c], r = rec[name] || { w: 0, l: 0, streak: 0 };
    if (iWon) { r.w++; r.streak = r.streak > 0 ? r.streak + 1 : 1; } else { r.l++; r.streak = r.streak < 0 ? r.streak - 1 : -1; }
    r.avatar = (s.avatars || {})[c] || r.avatar; r.at = Date.now();
    rec[name] = r;
  }
  store.set(recordKey(), rec);
}
function mainRival() {
  const rec = store.get(recordKey(), {});
  let best = null;
  for (const [name, r] of Object.entries(rec)) {
    const n = r.w + r.l;
    if (!best || n > best.n || (n === best.n && r.at > best.r.at)) best = { name, r, n };
  }
  return best;
}
function rivalLine(name) {
  const r = store.get(recordKey(), {})[name];
  return r ? `You <b>${r.w} – ${r.l}</b> ${escapeHtml(name)}, all time` : '';
}
function renderHome() {
  if (!me) return;
  const av = myAvatar(), first = me.name.split(' ').pop();
  $('#me-avatar').textContent = av;
  const best = mainRival();
  if (!best) {
    $('#hello').textContent = `Hey ${first}! Ready to roll?`;
    $('#rival').className = 'card rival empty';
    $('#rival').innerHTML = '<b>No games yet</b><p>Play a friend and your all-time score shows up here.</p>';
    return;
  }
  const { name, r } = best, them = name.split(' ').pop();
  $('#hello').textContent = r.w < r.l ? `Hey ${first}! Ready for revenge?` : r.w > r.l ? `Hey ${first}! Defend that lead.` : `Hey ${first}! Tie-breaker time?`;
  const streak = r.streak >= 2 ? `You won the last ${r.streak}` : r.streak <= -2 ? `${escapeHtml(them)} won the last ${-r.streak}`
    : r.streak === 1 ? 'You won the last game' : `${escapeHtml(them)} won the last game`;
  $('#rival').className = 'card rival';
  $('#rival').innerHTML = `<div class="row">
      <div class="rface" style="--c:var(--red)">${r.w > r.l ? `<span class="crown">${ic('crown')}</span>` : ''}<span class="av">${av}</span><span>You</span></div>
      <div class="score" aria-label="${r.w} to ${r.l}"><span>${r.w}</span><i>–</i><span>${r.l}</span></div>
      <div class="rface" style="--c:var(--yellow)">${r.l > r.w ? `<span class="crown">${ic('crown')}</span>` : ''}<span class="av">${r.avatar || '🙂'}</span><span>${escapeHtml(them)}</span></div>
    </div><p>${streak}</p>`;
}

/* ================= chat, stickers, reactions, voice ================= */
const EMOTES = ['😂', '🔥', '😭', '👏', '😈', '🫡', '😱', '🥳'];
const STICKERS = {
  bonk: ['Get bonked!', '#ff5a5f'], all: ['Is that all?', '#ffc233'], lucky: ['Lucky roll 🍀', '#2bc48a'],
  noob: ["Beginner's luck", '#4d9de0'], gg: ['GG 🤝', '#ffffff'], revenge: ['Revenge is coming', '#c9a7ff'],
};
const QUICK_EMOJI = ['😂', '🔥', '😭', '😈', '🫡', '💀'];
let unread = 0;
const lastSent = {}; // per message type, so a sticker isn't blocked by a chat message
const COOLDOWN = { chat: 0, react: 500, sticker: 2500, voice: 0 };
const chatOpen = () => !$('#chat').hidden;

function setUnread(n) {
  unread = n;
  $('#unread').hidden = !n;
  $('#unread').textContent = n > 9 ? '9+' : n;
}
function addMsg(html, cls, color) {
  const box = $('#msgs');
  box.querySelector('.empty')?.remove();
  box.insertAdjacentHTML('beforeend', `<div class="m ${cls}" style="--c:${COLORS[color] || 'var(--red)'}">${html}</div>`);
  while (box.children.length > 80) box.firstElementChild.remove();
  box.scrollTop = box.scrollHeight;
  return box.lastElementChild;
}
function chatSys(text) { addMsg(escapeHtml(text), 'sys'); }
function resetSocial() {
  $('#msgs').innerHTML = '<p class="empty">Say hi. Messages, stickers and voice notes show up here.</p>';
  setUnread(0);
  closeChat();
}
function openChat() { $('#chat').hidden = false; setUnread(0); $('#msgs').scrollTop = 1e6; }
function closeChat() { $('#chat').hidden = true; }

// Where a player's chip is on screen, so their bubble and reactions come out of it.
function chipFor(color) { return document.querySelector(`.chip[data-c="${color}"]`); }
function showBubble(color, text) {
  if (chatOpen()) return;
  const chip = chipFor(color);
  if (!chip) return;
  const r = chip.getBoundingClientRect(), up = r.top > innerHeight / 2;
  const b = document.createElement('div');
  b.className = `bubble ${up ? 'up' : 'down'}`;
  b.textContent = text;
  b.style.left = Math.min(Math.max(r.left + r.width / 2, 130), innerWidth - 130) + 'px';
  b.style.top = (up ? r.top - 8 : r.bottom + 8) + 'px';
  $('#fx').appendChild(b);
  setTimeout(() => b.remove(), 3300);
}
function slamSticker(id) {
  const [text, bg] = STICKERS[id];
  const s = document.createElement('div');
  s.className = 'slam';
  s.innerHTML = `<span class="sticker-art" style="--sbg:${bg}">${escapeHtml(text)}</span>`;
  $('#fx').appendChild(s);
  setTimeout(() => s.remove(), 2000);
  retrigger($('#board-wrap'), 'shake');
}

// Validate and show a social message. `mine` is true for messages this device sent.
function receiveSocial(m, mine = false) {
  if (!m || !game || !game.players.includes(m.from)) return false;
  const who = mine ? '' : `<small>${escapeHtml(nameOf(m.from))}</small>`, cls = mine ? 'me' : 'them';
  if (m.t === 'chat' && typeof m.text === 'string' && m.text.trim() && m.text.length <= 300) {
    addMsg(who + escapeHtml(m.text), cls, m.from);
    if (!mine) showBubble(m.from, m.text);
  } else if (m.t === 'react' && EMOTES.includes(m.e)) {
    floatEmoji(m.e, m.from);
    return true; // reactions don't go in the chat or count as unread
  } else if (m.t === 'sticker' && STICKERS[m.id]) {
    const [text, bg] = STICKERS[m.id];
    addMsg(`${who}<span class="sticker-art" style="--sbg:${bg}">${escapeHtml(text)}</span>`, `${cls} sticker`, m.from);
    slamSticker(m.id);
  } else if (m.t === 'voice' && typeof m.data === 'string' && m.data.length <= 400000 && /^audio\/[\w.+-]+(;.*)?$/.test(m.mime || '') && m.dur > 0 && m.dur <= 30) {
    const el = addMsg(`${who}<button type="button" aria-label="Play voice note">${ic('play')}</button><span class="bars">${Array.from({ length: 18 }, () => `<i style="height:${25 + Math.random() * 75}%"></i>`).join('')}</span><time>0:${String(Math.round(m.dur)).padStart(2, '0')}</time>`, `${cls} voice`, m.from);
    el._audio = { data: m.data, mime: m.mime, dur: m.dur };
    if (!mine) {
      showBubble(m.from, '🎙️ Voice note');
      playVoice(el).catch(() => toast(`🎙️ ${nameOf(m.from)} sent a voice note. Open the chat to play it.`, 3200));
    }
  } else return false;
  if (!mine) { sfx.pop(); if (!chatOpen()) setUnread(unread + 1); }
  return true;
}
function emit(m) {
  if (!game) return;
  const now = Date.now();
  if (now - (lastSent[m.t] || 0) < COOLDOWN[m.t]) return;
  lastSent[m.t] = now;
  m.from = myColors[0];
  if (receiveSocial(m, true)) { sfx.pop(); sendSocial(m); }
}

/* voice notes */
let playing = null;
async function playVoice(el) {
  if (playing) { playing.audio.pause(); playing.done(); }
  const { data, mime, dur } = el._audio;
  const bytes = Uint8Array.from(atob(data), (ch) => ch.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const audio = new Audio(url), btn = el.querySelector('button'), bars = [...el.querySelectorAll('.bars i')];
  const tick = setInterval(() => {
    const k = Math.floor((audio.currentTime / (audio.duration || dur)) * bars.length);
    bars.forEach((b, i) => b.classList.toggle('lit', i <= k));
  }, 80);
  const done = () => { clearInterval(tick); bars.forEach((b) => b.classList.remove('lit')); setIcon(btn, 'play'); URL.revokeObjectURL(url); if (playing && playing.audio === audio) playing = null; };
  playing = { audio, done };
  audio.onended = done;
  setIcon(btn, 'pause');
  try { await audio.play(); } catch (e) { done(); throw e; }
}
$('#msgs').addEventListener('click', (e) => {
  const b = e.target.closest('.m.voice button'); if (!b) return;
  const el = b.closest('.m');
  if (playing && playing.audio && el.querySelector('svg.ic').innerHTML === ICONS.pause) { playing.audio.pause(); playing.done(); return; }
  playVoice(el).catch(() => toast('Could not play that voice note 😕'));
});

const recorder = { stream: null, rec: null, chunks: [], t0: 0, timer: null, wanted: false };
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
}
async function startTalk(btn) {
  if (!game || recorder.rec) return;
  const mime = pickMime();
  if (mime === null || !navigator.mediaDevices) return toast('Voice notes need a newer browser 😕');
  recorder.wanted = true;
  try {
    recorder.stream = recorder.stream || await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) { recorder.wanted = false; return toast('Allow the microphone to send voice notes 🎙️', 3000); }
  if (!recorder.wanted) return; // released before permission came back
  recorder.chunks = [];
  recorder.rec = new MediaRecorder(recorder.stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24000 });
  recorder.rec.ondataavailable = (e) => e.data.size && recorder.chunks.push(e.data);
  recorder.rec.onstop = finishTalk;
  recorder.rec.start();
  recorder.t0 = performance.now();
  recorder.btn = btn;
  btn.classList.add('live'); $('#rec').classList.add('on');
  recorder.timer = setTimeout(() => stopTalk(), 20000);
  sfx.pop();
}
function stopTalk() {
  recorder.wanted = false;
  clearTimeout(recorder.timer);
  if (recorder.rec && recorder.rec.state === 'recording') recorder.rec.stop();
}
function finishTalk() {
  const rec = recorder.rec, dur = (performance.now() - recorder.t0) / 1000;
  recorder.rec = null;
  recorder.btn?.classList.remove('live'); $('#rec').classList.remove('on');
  // Release the mic so the phone's "recording" indicator goes away between notes.
  recorder.stream?.getTracks().forEach((t) => t.stop()); recorder.stream = null;
  if (dur < 0.6) return toast('Hold the mic button while you talk 🎙️');
  const blob = new Blob(recorder.chunks, { type: rec.mimeType || 'audio/webm' });
  const reader = new FileReader();
  reader.onload = () => emit({ t: 'voice', data: String(reader.result).split(',')[1], mime: blob.type, dur: Math.min(30, Math.round(dur * 10) / 10) });
  reader.readAsDataURL(blob);
}
function wireMic(btn) {
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); capture(btn, e); startTalk(btn); });
  btn.addEventListener('pointerup', stopTalk);
  btn.addEventListener('pointercancel', stopTalk);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startTalk(btn); } });
  btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stopTalk(); });
}
wireMic($('#btn-mic'));
wireMic($('#btn-mic2'));

// Pointer capture can fail (e.g. the pointer is already gone); the gesture still works without it.
function capture(el, e) { try { el.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ } }

/* emote wheel: tap to open then tap an emoji, or press, slide and let go */
const wheel = $('#wheel');
wheel.innerHTML = EMOTES.map((e, i) => {
  const a = (i / EMOTES.length) * Math.PI * 2 - Math.PI / 2, at = `translate(${Math.cos(a) * 78}px, ${Math.sin(a) * 78}px)`;
  return `<button type="button" role="menuitem" aria-label="Send ${e}" data-e="${e}" style="--at:${at};transform:var(--at)">${e}</button>`;
}).join('') + '<em>Tap or slide<br>to react</em>';
function openWheel(anchor) {
  const r = anchor.getBoundingClientRect();
  wheel.style.left = Math.min(Math.max(r.left + r.width / 2, 128), innerWidth - 128) + 'px';
  wheel.style.top = Math.max(r.top - 90, 130) + 'px';
  wheel.classList.add('open');
}
const closeWheel = () => { wheel.classList.remove('open'); wheel.querySelectorAll('.hot').forEach((b) => b.classList.remove('hot')); };
{
  const btn = $('#btn-emote');
  let sliding = false, hot = null, downAt = 0;
  btn.addEventListener('pointerdown', (e) => {
    downAt = Date.now(); sliding = false;
    if (!wheel.classList.contains('open')) { openWheel(btn); sliding = true; capture(btn, e); }
  });
  btn.addEventListener('pointermove', (e) => {
    if (!sliding) return;
    const el = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.dataset && n.dataset.e);
    wheel.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b === el)); hot = el;
  });
  btn.addEventListener('pointerup', () => {
    if (!sliding) { closeWheel(); return; }
    sliding = false;
    if (hot) { emit({ t: 'react', e: hot.dataset.e }); closeWheel(); }
    else if (Date.now() - downAt > 400) closeWheel(); // held without choosing
    hot = null;
  });
  wheel.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { emit({ t: 'react', e: b.dataset.e }); closeWheel(); } });
  document.addEventListener('pointerdown', (e) => { if (wheel.classList.contains('open') && !wheel.contains(e.target) && !btn.contains(e.target)) closeWheel(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeWheel(); closeChat(); $('#me-sheet').hidden = true; } });
}

/* chat sheet */
$('#quick').innerHTML = Object.entries(STICKERS).map(([id, [text, bg]]) => `<button type="button" class="stk" data-sticker="${id}" style="--sbg:${bg}">${escapeHtml(text)}</button>`).join('')
  + QUICK_EMOJI.map((e) => `<button type="button" class="emo" data-text="${e}">${e}</button>`).join('');
$('#quick').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.sticker) emit({ t: 'sticker', id: b.dataset.sticker }); else emit({ t: 'chat', text: b.dataset.text });
});
$('#chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#chat-input'), text = input.value.trim().slice(0, 300);
  if (!text) return;
  emit({ t: 'chat', text });
  input.value = '';
});
$('#btn-chat').onclick = () => { openChat(); };
$('#btn-chat-close').onclick = closeChat;
$('#btn-me').onclick = () => { renderMeSheet(); $('#me-sheet').hidden = false; };
$('#btn-me-close').onclick = () => { $('#me-sheet').hidden = true; };
