'use strict';
// Handwriting Check v2 — the pure pipeline: photo-quality checks, preparation for recognition,
// and the comparison that turns recognised text into an honest verdict. Recognition itself
// (Tesseract) is measured separately in tests/eval/handwriting-eval.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const HW = require('../../assets/js/handwriting.js');

function rng(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }
function page(W = 1000, H = 700, bg = 236) { return { gray: new Uint8Array(W * H).fill(bg), width: W, height: H }; }
function stroke(img, x0, y0, x1, y1, ink = 28, t = 2) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    for (let dy = -t; dy <= t; dy++) for (let dx = -t; dx <= t; dx++) {
      const xx = Math.round(x + dx), yy = Math.round(y + dy);
      if (xx >= 0 && yy >= 0 && xx < img.width && yy < img.height) img.gray[yy * img.width + xx] = ink;
    }
  }
}
// three lines of letter-like marks (separate strokes, ~30 px tall), like a photographed page
function writing(opts = {}) {
  const img = page(opts.W, opts.H, opts.bg), r = rng(opts.seed || 3), h = opts.h || 30, x0 = opts.x0 == null ? 90 : opts.x0;
  for (let line = 0; line < 3; line++) {
    let x = x0; const base = 200 + line * 150;
    while (x < img.width - 120 + (opts.overrun || 0)) {
      const word = 3 + Math.floor(r() * 4);
      for (let k = 0; k < word; k++) { const hh = h * (0.8 + r() * 0.4); stroke(img, x, base, x + 8, base - hh, opts.ink); stroke(img, x + 8, base - hh, x + 14, base, opts.ink); x += 22; }
      x += 26;
    }
  }
  return img;
}
const failing = q => q.checks.filter(c => !c.ok).map(c => c.id);
function blur(img, r) { const { width: W, height: H } = img, out = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) { s += img.gray[yy * W + xx]; n++; } } out[y * W + x] = s / n; } return { gray: out, width: W, height: H }; }
function transpose(img) { const { width: W, height: H } = img, out = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[x * H + (H - 1 - y)] = img.gray[y * W + x]; return { gray: out, width: H, height: W }; }

test('Otsu separates ink from paper', () => {
  const o = HW.otsu(writing().gray);
  assert.ok(o.thr >= 28 && o.thr < 236, 'threshold between ink and paper: ' + o.thr);
  assert.ok(o.sep > 0.6, 'strong separation: ' + o.sep);
  assert.ok(o.inkShare > 0 && o.inkShare < 0.2);
});

test('a clear photo of three written lines passes every essential check', () => {
  const q = HW.quality(writing());
  assert.equal(q.ok, true, 'failing: ' + failing(q));
  assert.ok(q.stats.comps >= 12);
});

test('a blank page is rejected: not enough writing', () => {
  const q = HW.quality(page());
  assert.equal(q.ok, false); assert.ok(failing(q).includes('amount'));
});

test('a very dark photo is rejected for lighting', () => {
  const img = writing(); for (let i = 0; i < img.gray.length; i++) img.gray[i] = img.gray[i] * 0.2;
  const q = HW.quality(img);
  assert.equal(q.ok, false); assert.ok(failing(q).includes('light'), failing(q).join());
});

test('a blurred photo is rejected as blurry', () => {
  const q = HW.quality(blur(writing(), 5));
  assert.equal(q.ok, false); assert.ok(failing(q).includes('sharp') || failing(q).includes('contrast'), failing(q).join());
});

test('faint writing that does not stand out is rejected for contrast', () => {
  const q = HW.quality(writing({ ink: 205 }));
  assert.equal(q.ok, false, failing(q).join());
});

test('writing cut off by the edge of the photo is rejected as cropped', () => {
  const q = HW.quality(writing({ x0: -40, overrun: 200 }));
  assert.equal(q.ok, false); assert.ok(failing(q).includes('cropped'), failing(q).join());
});

test('a sideways page is detected', () => {
  const q = HW.quality(transpose(writing()));
  assert.equal(q.ok, false); assert.ok(failing(q).includes('rotation'), failing(q).join());
});

test('tiny writing in a big photo is flagged as too small', () => {
  const q = HW.quality(writing({ h: 3 }));
  assert.ok(failing(q).includes('size') || failing(q).includes('amount'), failing(q).join());
  assert.equal(q.ok, false);
});

test('every failed check carries a supportive retake message in both languages', () => {
  for (const img of [page(), blur(writing(), 5), transpose(writing())]) for (const c of HW.quality(img).checks.filter(x => !x.ok)) {
    assert.ok(Array.isArray(c.msg) && c.msg[0].length > 20 && c.msg[1].length > 10, c.id);
  }
});

test('preparation straightens a tilted page and trims to the writing', () => {
  const img = writing(), q = HW.quality(img), p = HW.prepare(img, q.stats.skew);
  assert.ok(p.width < img.width && p.height < img.height, 'trimmed');
  assert.ok(p.gray.every(v => v === 0 || v === 255), 'binarised');
});

test('error rates: identical text is perfect, differences are counted per character and per word', () => {
  assert.deepEqual(HW.errorRates('The cat sat.', 'the cat sat', 'en'), { cer: 0, wer: 0, words: 3, matched: 3 });
  const r = HW.errorRates('the cat sat', 'the bat sat', 'en');
  assert.ok(Math.abs(r.cer - 1 / 11) < 1e-9); assert.ok(Math.abs(r.wer - 1 / 3) < 1e-9); assert.equal(r.matched, 2);
  assert.equal(HW.errorRates('hello world', '', 'en').cer, 1);
});

test('Arabic comparison ignores diacritics and hamza forms on alif', () => {
  assert.equal(HW.errorRates('أحمدُ يقرأُ الكتابَ', 'احمد يقرا الكتاب', 'ar').wer, 0);
  assert.equal(HW.errorRates('أحمد يقرأ', 'احمد يكتب', 'ar').wer, 0.5);
  assert.equal(HW.errorRates('إلى المدرسة', 'الى المدرسة', 'ar').cer, 0);
});

test('outcome: clear, partial or inconclusive — never a judgement', () => {
  assert.equal(HW.outcome({ cer: 0.05 }, 80), 'clear');
  assert.equal(HW.outcome({ cer: 0.05 }, 30), 'partial');
  assert.equal(HW.outcome({ cer: 0.3 }, 90), 'partial');
  assert.equal(HW.outcome({ cer: 0.7 }, 90), 'inconclusive');
});

test('word map marks which expected words were recognised', () => {
  assert.deepEqual(HW.wordMap('Ships carry goods', 'ships cary goods', 'en').map(x => x.found), [true, false, true]);
});

test('prompts: three sentences per set, in English and Arabic', () => {
  for (const lang of ['en', 'ar']) { assert.ok(HW.PROMPTS[lang].length >= 2); HW.PROMPTS[lang].forEach(s => assert.equal(s.length, 3)); }
  assert.ok(HW.PROMPTS.ar.flat().every(l => /[؀-ۿ]/.test(l)));
  HW.PROMPTS.mix.forEach(set => { assert.equal(set.length, 3); assert.ok(set.some(l => /[\u0600-\u06FF]/.test(l)) && set.some(l => /[A-Za-z]/.test(l)), 'mixed sets have both scripts'); });
});

test('no diagnostic language, no handwriting judgement, no network in the pipeline or its interface', () => {
  const root = path.join(__dirname, '..', '..', 'assets', 'js');
  const src = fs.readFileSync(path.join(root, 'handwriting.js'), 'utf8'), ui = fs.readFileSync(path.join(root, 'hand-ui.js'), 'utf8');
  const shown = JSON.stringify(HW.MSG) + JSON.stringify(HW.PROMPTS);
  assert.doesNotMatch(shown, /dyslex|dysgraph|disorder|diagnos|disabilit|messy|poor handwriting|bad handwriting/i);
  for (const s of [src, ui]) { assert.doesNotMatch(s, /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|getUserMedia/); }
  assert.doesNotMatch(ui, /localStorage\.setItem|sessionStorage\.setItem|indexedDB/, 'nothing about the writing is stored');
  // the only mentions of conditions in the interface are statements of what it cannot do
  (ui.match(/[^.]*\b(dyslexia|dysgraphia)\b[^.]*/gi) || []).forEach(m => assert.match(m, /Detect|cannot|اكتشاف/i, m));
});

/* ---------- v17: adaptive threshold, upscaling, line segmentation, word flags ---------- */
// a shadow across the page: paper goes from bright (240) on the left to dark (95) on the right
function shadowed() {
  const img = writing({ bg: 240 }), { width: W, height: H } = img;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, f = 1 - 0.6 * (x / W); img.gray[i] = img.gray[i] > 100 ? Math.round(240 * f) : Math.round(28 * f); }
  return img;
}
test('Sauvola keeps the writing under a shadow, where one global threshold loses paper to ink', () => {
  const img = shadowed(), { width: W, height: H } = img;
  const o = HW.otsu(img.gray);
  const truth = writing({ bg: 240 }).gray; // where the ink really is
  const err = bin => { let wrong = 0; for (let i = 0; i < truth.length; i++) if ((bin[i] === 0) !== (truth[i] < 128)) wrong++; return wrong / truth.length; };
  const global = img.gray.map(v => (v <= o.thr ? 0 : 255)), local = HW.sauvola(img.gray, W, H);
  assert.ok(err(local) < 0.02, 'adaptive error ' + err(local));
  assert.ok(err(local) < err(global) / 3, `adaptive (${err(local).toFixed(3)}) much better than global (${err(global).toFixed(3)})`);
  assert.ok(HW.unevenLight(img.gray, W, H) > 0.25, 'the shadow is detected as uneven light');
  assert.ok(HW.unevenLight(writing().gray, W, H) < 0.1, 'an evenly lit page is not');
});
test('prepare upscales small writing to ~40 px letters and uses the adaptive threshold when asked', () => {
  const small = writing({ h: 14 });
  const q = HW.quality(small);
  const p = HW.prepare(small, 0, { letterHeight: q.stats.letterHeight, source: true, uneven: false });
  assert.ok(p.scale > 1.8 && p.scale <= 3, 'scaled up: ' + p.scale);
  const sh = shadowed(), p2 = HW.prepare(sh, 0, { source: true, uneven: true });
  assert.equal(p2.adaptive, true);
});
test('line segmentation finds the three written lines', () => {
  const img = writing(), p = HW.prepare(img, 0);
  const L = HW.lines(p);
  assert.equal(L.length, 3, JSON.stringify(L));
  L.forEach((b, i) => { if (i) assert.ok(b.y0 > L[i - 1].y1 - 5, 'lines in order and separate'); });
});
test('word flags come only from the recogniser’s own confidences', () => {
  const f = HW.flagWords([{ text: 'library', confidence: 91.2 }, { text: 'opns', confidence: 61 }, { text: '~', confidence: 12 }, { text: ' ', confidence: 90 }]);
  assert.deepEqual(f.map(x => x.flag), ['ok', 'uncertain', 'unreadable']);
  assert.deepEqual(f.map(x => x.conf), [91, 61, 12]);
  assert.deepEqual(HW.flagWords(undefined), [], 'no confidences, no flags (nothing is invented)');
});
test('a readable page under a shadow passes the quality gate (lighting is evened out first)', () => {
  const img = shadowed(), q = HW.quality(img);
  assert.ok(q.stats.uneven > 0.25, 'uneven light recorded');
  assert.deepEqual(failing(q).filter(id => ['contrast', 'sharp', 'light'].includes(id)), [], 'not rejected for contrast, focus or light: ' + failing(q));
  // ...while a genuinely faint page is still rejected
  assert.ok(failing(HW.quality(writing({ ink: 205 }))).includes('contrast'));
});
