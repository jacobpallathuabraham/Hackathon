/* ERLY — lip-sync for Noor's avatars.

   The browser's speech voices don't expose their audio or phonemes to the
   page, so the mouth is driven from the TEXT being spoken:
     1. each word is turned into a sequence of visemes (mouth shapes) with
        letter-to-sound rules for English and Arabic;
     2. the voice's own word-boundary events (Chrome, Edge, Safari) say when
        each word actually starts, so every word is re-anchored to the real
        audio — no drift, whatever the speed, voice or pauses;
     3. the time a word takes is estimated, and that estimate is calibrated
        continuously from the gaps between real boundary events;
     4. voices that send no boundary events are timed from the speech rate,
        with pauses at punctuation (less exact, but the mouth still closes
        at commas and full stops and at the true end of each phrase).
   Mouth shapes blend smoothly into each other and return to rest when the
   voice stops or is interrupted. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_LIPSYNC = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // o = open, w = width, r = rounding, t = teeth showing, g = tongue, f = lip under teeth
  const VIS = {
    X: { o: 0, w: 0.5, r: 0, t: 0, g: 0, f: 0 },        // rest
    A: { o: 0.85, w: 0.62, r: 0, t: 0.5, g: 0.3, f: 0 }, // f-a-ther, c-u-p
    E: { o: 0.5, w: 0.86, r: 0, t: 0.8, g: 0.2, f: 0 },  // b-e-d
    I: { o: 0.26, w: 1, r: 0, t: 1, g: 0, f: 0 },        // s-ee
    O: { o: 0.62, w: 0.3, r: 0.75, t: 0, g: 0.2, f: 0 }, // g-o
    U: { o: 0.22, w: 0.12, r: 1, t: 0, g: 0, f: 0 },     // y-ou, w
    M: { o: 0, w: 0.44, r: 0, t: 0, g: 0, f: 0 },        // m, b, p (lips pressed)
    F: { o: 0.1, w: 0.62, r: 0, t: 1, g: 0, f: 1 },      // f, v
    L: { o: 0.34, w: 0.6, r: 0, t: 0.7, g: 1, f: 0 },    // l, t, d, n, th
    S: { o: 0.12, w: 0.76, r: 0, t: 1, g: 0, f: 0 },     // s, z
    H: { o: 0.2, w: 0.42, r: 0.55, t: 0.9, g: 0, f: 0 }, // sh, ch, j
    K: { o: 0.42, w: 0.55, r: 0, t: 0.4, g: 0.3, f: 0 }, // k, g, h
    R: { o: 0.28, w: 0.38, r: 0.5, t: 0.3, g: 0.2, f: 0 } // r
  };
  // how long each shape is held, in ms at normal speed
  const DUR = { A: 105, E: 95, I: 90, O: 110, U: 95, M: 70, F: 75, L: 60, S: 80, H: 85, K: 60, R: 70, X: 60 };

  const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const EN_MULTI = [['you', ['I', 'U']], ['ough', ['O']], ['augh', ['O']], ['igh', ['A', 'I']], ['gh', []], ['tch', ['H']], ['th', ['L']], ['sh', ['H']], ['ch', ['H']], ['ph', ['F']], ['wh', ['U']], ['ck', ['K']], ['ng', ['K']], ['qu', ['K', 'U']], ['oo', ['U']], ['ou', ['A', 'U']], ['ow', ['O']], ['ee', ['I']], ['ea', ['I']], ['ai', ['E', 'I']], ['ay', ['E', 'I']], ['oa', ['O']], ['oi', ['O', 'I']], ['oy', ['O', 'I']], ['er', ['R']], ['ur', ['R']], ['ir', ['R']], ['au', ['O']], ['aw', ['O']], ['ew', ['U']], ['ue', ['U']]];
  const EN_ONE = { a: 'A', e: 'E', i: 'I', o: 'O', u: 'U', y: 'I', b: 'M', m: 'M', p: 'M', f: 'F', v: 'F', t: 'L', d: 'L', n: 'L', l: 'L', s: 'S', z: 'S', x: 'S', j: 'H', k: 'K', g: 'K', q: 'K', h: 'K', r: 'R', w: 'U' };
  const AR = { 'ا': 'A', 'آ': 'A', 'أ': 'A', 'إ': 'I', 'ى': 'A', 'ي': 'I', 'و': 'U', 'ؤ': 'U', 'ئ': 'I', 'ب': 'M', 'م': 'M', 'ف': 'F', 'ت': 'L', 'ث': 'L', 'د': 'L', 'ذ': 'L', 'ط': 'L', 'ظ': 'L', 'ن': 'L', 'ل': 'L', 'س': 'S', 'ص': 'S', 'ز': 'S', 'ش': 'H', 'ج': 'H', 'ك': 'K', 'ق': 'K', 'غ': 'K', 'خ': 'K', 'ح': 'K', 'ه': 'K', 'ع': 'A', 'ء': 'K', 'ة': 'A', 'ر': 'R', 'ض': 'L' };
  const VOWEL = /[AEIOU]/;

  // word → visemes
  function visemes(word) {
    let w = String(word || '').toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
    if (!w) return [];
    w = w.replace(/\d/g, d => DIGITS[+d] + ' ').replace(/'/g, '').replace(/\s+/g, '');
    const out = [];
    if (/[؀-ۿ]/.test(w)) {
      // Arabic script rarely writes short vowels: insert an "a" between consonants
      for (const ch of w) {
        const v = AR[ch]; if (!v) continue;
        if (out.length && !VOWEL.test(v) && !VOWEL.test(out[out.length - 1])) out.push('A');
        out.push(v);
      }
    } else {
      if (w.length > 3 && /[^aeiou]e$/.test(w)) w = w.slice(0, -1); // silent final e
      let i = 0;
      while (i < w.length) {
        const m = EN_MULTI.find(([k]) => w.startsWith(k, i));
        if (m) { out.push(...m[1]); i += m[0].length; continue; }
        const c = w[i];
        if (c === 'c') out.push(/[eiy]/.test(w[i + 1] || '') ? 'S' : 'K');
        else if (EN_ONE[c]) out.push(EN_ONE[c]);
        i++;
      }
    }
    return out.filter((v, k) => v !== out[k - 1]); // no repeats: the mouth just holds
  }

  const wordDur = vis => vis.reduce((n, v) => n + (DUR[v] || 70), 0);
  const PAUSE = t => /[.!?؟]["')\]]*$/.test(t) ? 320 : /[,;:،]["')\]]*$/.test(t) ? 170 : 0;

  // One spoken phrase. now() is injectable for tests.
  function Track(opts) {
    opts = opts || {};
    const now = opts.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    let words = [], rate = 1, t0 = 0, active = false, anchored = false, scale = 1, cur = -1, curStart = 0, lastB = null;

    function plan(text) {
      const re = /\S+/g; let m; const list = [];
      while ((m = re.exec(text))) { const vis = visemes(m[0]); list.push({ i: m.index, end: m.index + m[0].length, text: m[0], vis, dur: wordDur(vis), pause: PAUSE(m[0]) }); }
      return list;
    }
    const api = {
      // the voice started speaking this text
      start(text, r) {
        words = plan(String(text || '')); rate = r || 1; t0 = now(); active = true; anchored = false; cur = words.length ? 0 : -1; curStart = t0; lastB = null;
      },
      // the voice reached the word at this character index (real audio timing)
      boundary(charIndex) {
        if (!active) return;
        const t = now();
        const k = words.findIndex(w => charIndex >= w.i && charIndex < w.end + 1);
        if (k < 0) return;
        // calibrate: how long did the previous words really take, versus our estimate?
        if (lastB && k > lastB.k) {
          let est = 0; for (let j = lastB.k; j < k; j++) est += (words[j].dur + words[j].pause) / rate;
          const real = t - lastB.t;
          if (est > 0 && real > 30 && real < 4000) scale = Math.min(1.8, Math.max(0.55, scale * 0.7 + (real / est) * 0.3));
        }
        anchored = true; cur = k; curStart = t; lastB = { k, t };
      },
      stop() { active = false; cur = -1; },
      get active() { return active; },
      get anchored() { return anchored; },
      get scale() { return scale; },
      // the current mouth shape: { key, next, mix } — mix blends key → next
      frame() {
        if (!active || cur < 0 || !words.length) return { key: 'X', next: 'X', mix: 0 };
        let t = now();
        // without boundary events, walk through the words on the estimated clock
        let k = cur, start = curStart;
        const len = j => (words[j].dur * scale) / rate;
        const gap = j => (words[j].pause * scale) / rate;
        while (k < words.length && t - start > len(k) + gap(k)) {
          if (anchored && k === cur && t - start < (len(k) + gap(k)) * 1.8) break; // anchored words wait for the next real boundary (unless it never comes)
          start += len(k) + gap(k); k++;
        }
        if (k >= words.length) return { key: 'X', next: 'X', mix: 0 };
        const w = words[k], el = t - start, L = len(k);
        if (el >= L || !w.vis.length) return { key: 'X', next: 'X', mix: 0 }; // between words / at a comma
        let acc = 0;
        for (let j = 0; j < w.vis.length; j++) {
          const d = (DUR[w.vis[j]] || 70) * scale / rate;
          if (el < acc + d) {
            const p = (el - acc) / d;
            const nx = w.vis[j + 1] || 'X';
            return { key: w.vis[j], next: nx, mix: p > 0.6 ? (p - 0.6) / 0.4 : 0 };
          }
          acc += d;
        }
        return { key: 'X', next: 'X', mix: 0 };
      },
      _words: () => words
    };
    return api;
  }

  // blend two shapes
  function mixShape(a, b, m) {
    const A = VIS[a] || VIS.X, B = VIS[b] || VIS.X, o = {};
    for (const k in A) o[k] = A[k] + (B[k] - A[k]) * m;
    return o;
  }
  return { VIS, DUR, visemes, Track, mixShape, wordDur };
});
