/* ERLY — Handwriting Studio analysis (v22). Pure functions: measurements of PRESENTATION that can actually be
   measured, from stroke data (writing on screen) or from a photo (ink components).

   Measured (each with how it is measured and what it does NOT tell you):
     word spacing    — gaps between words, and how much they vary
     baseline        — slope of each line, and how far words sit above/below that line
     size            — how much the height of words varies
     slant           — lean of the downstrokes (strokes only: a photo has no stroke direction)
     line spacing    — distance between lines, and how much it varies
   Not measured, ever: legibility as a judgement, neatness as a grade, spelling, intelligence, personality, or any
   condition. Recognition errors by the software are never reported as writing errors: the content check runs only on
   text the student has seen and confirmed.
   Results come with `enough: false` when there is too little writing to say anything. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.ERLY = root.ERLY || {}; root.ERLY.handAnalysis = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const med = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const sd = a => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)) : 0; };
  const cv = a => { const m = mean(a); return m ? sd(a) / m : 0; };
  const pct = (a, q) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
  const r1 = v => Math.round(v * 10) / 10;

  // boxes: [{x0,y0,x1,y1, pts?}] in any units → lines → words
  function layout(boxes) {
    boxes = boxes.filter(b => b.x1 > b.x0 || b.y1 > b.y0);
    if (!boxes.length) return { lines: [], xh: 0 };
    const hs = boxes.map(b => b.y1 - b.y0), xh = Math.max(4, pct(hs, 0.6));
    const sorted = boxes.slice().sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1)), lines = [];
    for (const b of sorted) {
      const cy = (b.y0 + b.y1) / 2, L = lines[lines.length - 1];
      if (L && cy - L.cy <= Math.max(xh * 1.15, 12)) { L.items.push(b); L.cy = mean(L.items.map(i => (i.y0 + i.y1) / 2)); }
      else lines.push({ items: [b], cy });
    }
    for (const L of lines) {
      const it = L.items.slice().sort((a, b) => a.x0 - b.x0), blobs = [];
      for (const b of it) { const B = blobs[blobs.length - 1]; if (B && b.x0 <= B.x1 + xh * 0.12) { B.x1 = Math.max(B.x1, b.x1); B.y0 = Math.min(B.y0, b.y0); B.y1 = Math.max(B.y1, b.y1); B.items.push(b); } else blobs.push({ x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, items: [b] }); }
      const gaps = []; for (let i = 1; i < blobs.length; i++) gaps.push(blobs[i].x0 - blobs[i - 1].x1);
      const T = Math.max(xh * 0.45, med(gaps) * 1.8);
      const words = []; blobs.forEach((B, i) => { if (!i || gaps[i - 1] > T) words.push({ x0: B.x0, x1: B.x1, y0: B.y0, y1: B.y1, items: B.items.slice() }); else { const W = words[words.length - 1]; W.x1 = Math.max(W.x1, B.x1); W.y0 = Math.min(W.y0, B.y0); W.y1 = Math.max(W.y1, B.y1); W.items.push(...B.items); } });
      words.forEach(w => { w.bottom = med(w.items.map(i => i.y1)); w.h = med(w.items.map(i => i.y1 - i.y0)); });
      L.words = words; L.gaps = []; for (let i = 1; i < words.length; i++) L.gaps.push(words[i].x0 - words[i - 1].x1);
      L.x0 = Math.min(...words.map(w => w.x0)); L.x1 = Math.max(...words.map(w => w.x1));
    }
    return { lines, xh };
  }

  // least-squares line through word bottoms: slope (degrees) and spread around it
  function baseline(L) {
    const P = L.words.map(w => [(w.x0 + w.x1) / 2, w.bottom]); if (P.length < 2) return null;
    const mx = mean(P.map(p => p[0])), my = mean(P.map(p => p[1])), sxx = P.reduce((a, p) => a + (p[0] - mx) ** 2, 0), sxy = P.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
    const m = sxx ? sxy / sxx : 0, res = P.map(p => p[1] - (my + m * (p[0] - mx)));
    return { deg: -Math.atan(m) * 180 / Math.PI, wobble: sd(res) };
  }

  // lean of near-vertical stroke segments, signed: positive = leaning right
  function slants(strokes, xh) {
    const out = [];
    for (const s of strokes) { const p = s.pts; let j = 0;
      for (let i = 1; i < p.length; i++) { const dx = p[i][0] - p[j][0], dy = p[i][1] - p[j][1], len = Math.hypot(dx, dy); if (len < xh * 0.35) continue; const ang = Math.atan2(dx, Math.abs(dy)) * 180 / Math.PI * (dy > 0 ? 1 : -1); if (Math.abs(dy) > Math.abs(dx) * 1.2) out.push(dy > 0 ? -ang : ang); j = i; } }
    return out;
  }

  function measure(lay, extra) {
    extra = extra || {}; const { lines, xh } = lay, words = [].concat(...lines.map(L => L.words)), gaps = [].concat(...lines.map(L => L.gaps));
    const M = [];
    const add = (id, label, enough, value, display, what, notWhat, note) => M.push({ id, label, enough, value, display, what, notWhat, note: note || '' });
    // spacing
    add('spacing', ['Space between words', 'المسافة بين الكلمات'], gaps.length >= 3, { mean: r1(mean(gaps) / xh), cv: r1(cv(gaps) * 100), min: r1(Math.min(...gaps, Infinity) / xh), max: r1(Math.max(...gaps, -Infinity) / xh) },
      gaps.length >= 3 ? `about ${r1(mean(gaps) / xh)} letter-heights on average; varies by ${Math.round(cv(gaps) * 100)}%` : '',
      'The gaps between groups of ink that look like separate words, compared with the height of the letters.', 'Whether the spacing is “right”: style guides differ. A word joined to its neighbour can be counted as one word.');
    // baseline
    const bl = lines.map(baseline).filter(Boolean);
    add('baseline', ['Baseline', 'خط القاعدة'], bl.length >= 1 && words.length >= 3, { slope: r1(mean(bl.map(b => b.deg))), maxSlope: r1(Math.max(...bl.map(b => Math.abs(b.deg)), 0)), wobble: r1(mean(bl.map(b => b.wobble)) / xh * 100) },
      bl.length ? `lines slope ${r1(mean(bl.map(b => b.deg)))}° on average (0° = level); words sit within ${Math.round(mean(bl.map(b => b.wobble)) / xh * 100)}% of a letter-height of their line` : '',
      'A straight line fitted through the bottoms of the words on each line: its slope, and how far words sit above or below it.', 'Descenders (g, p, y) are mostly ignored by using the middle of each word’s strokes; a photo taken at an angle adds slope that is not in the writing.');
    // size
    const wh = words.map(w => w.h);
    add('size', ['Letter size consistency', 'ثبات حجم الحروف'], words.length >= 4, { cv: r1(cv(wh) * 100), xh: r1(xh) },
      words.length >= 4 ? `word heights vary by ${Math.round(cv(wh) * 100)}%` : '',
      'How much the typical stroke height changes from word to word.', 'Capital letters and tall letters (b, d, h, l) make some words taller on purpose.');
    // slant
    if (extra.strokes) { const sl = slants(extra.strokes, xh);
      add('slant', ['Slant', 'الميل'], sl.length >= 6, { median: r1(med(sl)), spread: r1(pct(sl, 0.75) - pct(sl, 0.25)) },
        sl.length >= 6 ? `downstrokes lean ${Math.abs(r1(med(sl)))}° ${med(sl) >= 0 ? 'right' : 'left'} on average; the middle half vary within ${r1(pct(sl, 0.75) - pct(sl, 0.25))}°` : '',
        'The angle of the downward strokes, measured from the order in which you wrote them.', 'Any consistent slant — upright, left or right — is fine; only variation is reported.'); }
    // line spacing
    if (lines.length >= 3) { const ys = lines.map(L => med(L.words.map(w => w.bottom))), d = []; for (let i = 1; i < ys.length; i++) d.push(ys[i] - ys[i - 1]);
      add('lines', ['Line spacing', 'المسافة بين الأسطر'], true, { mean: r1(mean(d) / xh), cv: r1(cv(d) * 100) }, `about ${r1(mean(d) / xh)} letter-heights apart; varies by ${Math.round(cv(d) * 100)}%`, 'The distance from one line’s baseline to the next.', 'Ruled paper sets this for you.'); }
    return { metrics: M, lines: lines.length, words: words.length, xh: r1(xh), enough: words.length >= 3 };
  }

  function fromStrokes(strokes) {
    const boxes = strokes.map(s => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; s.pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return { x0, y0, x1: Math.max(x1, x0 + 1), y1: Math.max(y1, y0 + 1) }; });
    const lay = layout(boxes), r = measure(lay, { strokes });
    const ts = strokes.map(s => s.pts.length ? [s.pts[0][3], s.pts[s.pts.length - 1][3]] : null).filter(Boolean);
    r.time = ts.length ? Math.max(0, Math.max(...ts.map(t => t[1])) - Math.min(...ts.map(t => t[0]))) : 0;
    r.strokes = strokes.length; r.source = 'strokes';
    return r;
  }
  // gray: Uint8 luminance, W×H; components function from handwriting.js (ERLY_HAND.components) and a threshold
  function fromImage(gray, W, H, H_) {
    const o = H_.otsu(gray), ink = new Uint8Array(W * H); for (let i = 0; i < gray.length; i++) ink[i] = gray[i] <= o.thr ? 1 : 0;
    const comps = H_.components(ink, W, H, 4).filter(c => c.area < W * H * 0.05 && (c.x1 - c.x0) < W * 0.6);
    const r = measure(layout(comps.map(c => ({ x0: c.x0, y0: c.y0, x1: c.x1 + 1, y1: c.y1 + 1 }))));
    r.source = 'image'; return r;
  }

  // suggestions only where a measurement clearly supports them; each names its evidence
  function suggestions(res) {
    const S = [], g = id => res.metrics.find(m => m.id === id && m.enough);
    const sp = g('spacing'); if (sp && (sp.value.cv > 55 || sp.value.min < 0.25)) S.push({ id: 'spacing', drill: 'spacing', text: ['Word gaps vary a lot', 'المسافات بين الكلمات متفاوتة'], why: `Measured: gaps from ${sp.value.min} to ${sp.value.max} letter-heights (variation ${sp.value.cv}%).`, try: ['Try the spacing drill: leave about the width of an “o” between words.', 'جرّب تمرين المسافات: اترك عرض حرف بين الكلمات.'] });
    const bl = g('baseline'); if (bl && (Math.abs(bl.value.slope) > 3 || bl.value.wobble > 25)) S.push({ id: 'baseline', drill: 'alignment', text: [Math.abs(bl.value.slope) > 3 ? `Lines slope ${bl.value.slope > 0 ? 'upwards' : 'downwards'}` : 'Words bob above and below the line', 'الأسطر مائلة أو متموجة'], why: `Measured: average slope ${bl.value.slope}°, words within ${bl.value.wobble}% of a letter-height of the line.`, try: ['Turn on the handwriting guides or lined paper, and try the alignment drill.', 'شغّل خطوط الإرشاد وجرّب تمرين المحاذاة.'] });
    const sz = g('size'); if (sz && sz.value.cv > 35) S.push({ id: 'size', drill: 'letters', text: ['Letter size changes from word to word', 'حجم الحروف يتغير'], why: `Measured: word heights vary by ${sz.value.cv}%.`, try: ['Use the three-line guide: keep small letters between the middle lines.', 'استخدم الدليل ثلاثي الأسطر.'] });
    const sl = g('slant'); if (sl && sl.value.spread > 22) S.push({ id: 'slant', drill: 'letters', text: ['Slant varies', 'الميل متفاوت'], why: `Measured: the middle half of downstrokes vary within ${sl.value.spread}°.`, try: ['Pick one lean (upright is fine) and practise letter groups like “l h k”.', 'اختر ميلاً واحداً وتدرّب.'] });
    return S;
  }

  // content check on CONFIRMED text (after the student has seen and corrected what the software read)
  function content(reference, confirmed, H_, lang) {
    if (!reference) return null;
    const r = H_.errorRates(reference, confirmed, lang), map = H_.wordMap(reference, confirmed, lang);
    const refW = H_.norm(reference, lang).split(' ').filter(Boolean), gotW = H_.norm(confirmed, lang).split(' ').filter(Boolean);
    const extra = gotW.filter(w => !refW.includes(w));
    return { match: Math.round((1 - r.cer) * 100), wer: Math.round(r.wer * 100), missing: map.filter(x => !x.found).map(x => x.w), extra, words: refW.length };
  }

  // compare two comparable attempts (same type and prompt): only metrics present in both with enough data
  function compare(a, b) {
    if (!a || !b) return [];
    const out = []; (a.metrics || []).forEach(m => { const n = (b.metrics || []).find(x => x.id === m.id); if (!n || !m.enough || !n.enough) return; const k = m.id === 'slant' ? 'spread' : m.id === 'baseline' ? 'wobble' : 'cv'; if (m.value[k] == null || n.value[k] == null) return; out.push({ id: m.id, label: m.label, before: n.value[k], after: m.value[k], key: k, change: r1(m.value[k] - n.value[k]) }); });
    return out;
  }

  return { layout, measure, fromStrokes, fromImage, suggestions, content, compare, _stats: { med, mean, sd, cv } };
});
