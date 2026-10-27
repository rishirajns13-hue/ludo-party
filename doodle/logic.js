// Pure Doodle Duel logic. Works in the browser (window.DoodleLogic) and in node (require).
(function (root) {
  'use strict';

  // Little words that don't decide whether a guess is right.
  const FILLER = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'with', 'and', 'at', 'to', 'is', 'for', 'my']);
  const normalize = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const keyWords = (s) => normalize(s).split(' ').filter((w) => w && !FILLER.has(w)).map(singular);
  function singular(w) {
    if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 3 && w.endsWith('es') && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }

  // 'correct' | 'close' | 'wrong' | 'empty'
  function judge(guess, answer) {
    const g = keyWords(guess), w = keyWords(answer);
    if (!g.length) return 'empty';
    const gs = g.join(''), ws = w.join('');
    if (gs === ws) return 'correct';
    const hits = w.filter((word) => g.includes(word)).length;
    if (hits === w.length && g.length <= w.length + 2) return 'correct';
    const allow = ws.length >= 8 ? 2 : ws.length >= 4 ? 1 : 0;
    if (allow && lev(gs, ws) <= allow) return 'close';
    if (w.length > 1 && hits * 2 >= w.length) return 'close';
    return 'wrong';
  }

  // "ice cream" with letters 0 and 4 shown → "i__ c____"
  const isLetter = (ch) => /[a-z0-9]/i.test(ch);
  function mask(word, shown) {
    return [...word].map((ch, i) => (isLetter(ch) && !shown.includes(i) ? '_' : ch)).join('');
  }
  // Which letters to reveal as hints, in a fixed shuffled order (same for everyone).
  function hintOrder(word) {
    const idx = [...word].map((ch, i) => (isLetter(ch) ? i : -1)).filter((i) => i >= 0);
    let seed = [...word].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    for (let i = idx.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const j = seed % (i + 1);
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  }

  const guessPoints = (leftMs, totalMs, first) => 50 + Math.round((100 * Math.max(0, leftMs)) / totalMs) + (first ? 20 : 0);
  const drawerPoints = (correct, everyone) => correct * 40 + (everyone && correct ? 20 : 0);

  function pickChoices(words, used, n = 3, rng = Math.random) {
    let pool = words.filter((w) => !used.includes(w));
    if (!pool.length) pool = words.slice();
    pool = pool.slice();
    const out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  }

  // stats[k] = { fastest, fastestWord, wrong, drawPoints, stumped: [words], clutch }
  function awards(stats, names) {
    const ks = Object.keys(stats), out = [];
    const best = (score, ok = () => true) => {
      const list = ks.filter((k) => ok(stats[k]));
      return list.length ? list.reduce((a, b) => (score(stats[b]) > score(stats[a]) ? b : a)) : null;
    };
    const mind = best((s) => -s.fastest, (s) => s.fastest > 0);
    if (mind) out.push({ icon: '🧠', title: 'Mind Reader', who: names[mind], why: `Got "${stats[mind].fastestWord}" in ${(stats[mind].fastest / 1000).toFixed(1)}s` });
    const pic = best((s) => s.drawPoints, (s) => s.drawPoints > 0);
    if (pic) out.push({ icon: '🎨', title: 'Picasso', who: names[pic], why: `Earned ${stats[pic].drawPoints} points with art alone` });
    const wild = best((s) => s.wrong, (s) => s.wrong >= 3);
    if (wild) out.push({ icon: '🤡', title: 'Wild Guesser', who: names[wild], why: `${stats[wild].wrong} wrong guesses. Never gave up.` });
    const modern = best((s) => s.stumped.length, (s) => s.stumped.length > 0);
    if (modern) out.push({ icon: '🪦', title: 'Modern Artist', who: names[modern], why: `Nobody understood "${stats[modern].stumped[0]}"` });
    const clutch = best((s) => s.clutch, (s) => s.clutch > 0);
    if (clutch) out.push({ icon: '⏱️', title: 'Clutch Master', who: names[clutch], why: 'Guessed it with seconds to spare' });
    return out;
  }

  const api = { normalize, judge, mask, hintOrder, guessPoints, drawerPoints, pickChoices, awards };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DoodleLogic = api;
})(this);
