'use strict';
/* Ludo social layer: the all-time score, chat, bubbles, emote wheel, stickers and
   hold-to-talk voice notes. Talks to game.js through
   sendSocial(), game, myColors, nameOf(), avatarOf(), sfx, toast(), floatEmoji(). */

document.addEventListener('profilechange', renderHome);

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
function closeChat() { if (!$('#chat').classList.contains('docked')) $('#chat').hidden = true; }
// On a laptop the chat stays docked beside the board during a game.
const wideScreen = matchMedia('(min-width: 1000px)');
function dockChat() {
  const docked = wideScreen.matches && document.body.classList.contains('in-game');
  const chat = $('#chat'), was = chat.classList.contains('docked');
  chat.classList.toggle('docked', docked);
  if (docked) openChat(); else if (was) chat.hidden = true;
}
wideScreen.addEventListener('change', dockChat);

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
