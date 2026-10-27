'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const HW = require('../../assets/js/handwriting.js');

/* tiny rasteriser for synthetic handwriting pages */
function page(W = 900, H = 640) { const gray = new Uint8Array(W * H).fill(236); return { gray, width: W, height: H }; }
function stroke(img, x0, y0, x1, y1, t = 3) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    for (let dy = -t; dy <= t; dy++) for (let dx = -t; dx <= t; dx++) {
      if (dx * dx + dy * dy > t * t) continue;
      const xx = Math.round(x + dx), yy = Math.round(y + dy);
      if (xx >= 0 && yy >= 0 && xx < img.width && yy < img.height) img.gray[yy * img.width + xx] = 28;
    }
  }
}
function rect(img, x0, y0, w, h) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) img.gray[y * img.width + x] = 28; }
function rng(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }
// write lines of "letters" (slanted strokes); `p` decides how irregular it is
function writePage(p, seed = 7) {
  const img = page(), r = rng(seed), h0 = 26;
  for (let line = 0; line < 5; line++) {
    let x = 60 + (r() - .5) * 2 * p.margin;
    const base = 90 + line * 105, tilt = (r() - .5) * 2 * p.tilt * Math.PI / 180;
    for (let word = 0; word < 6; word++) {
      const letters = 3 + Math.floor(r() * 4);
      for (let k = 0; k < letters; k++) {
        const h = h0 * (1 + (r() - .5) * 2 * p.size);
        const yb = base + Math.tan(tilt) * (x - 60) + (r() - .5) * 2 * p.base;
        const ang = (p.slant0 + (r() - .5) * 2 * p.slant) * Math.PI / 180;
        const dx = h / Math.tan(ang);
        stroke(img, x, yb, x + dx, yb - h);
        x += Math.abs(dx) + 8 + h0 * (p.gap + (r() - .5) * 2 * p.gapJ);
      }
      x += h0 * (0.9 + (r() - .5) * 2 * p.wordJ);
      if (x > 820) break;
    }
  }
  for (let i = 0; i < (p.cross || 0); i++) rect(img, 120 + i * 210, 160 + (i % 2) * 210, 46, 24);
  return img;
}
const NEAT = { margin: 2, tilt: 0.4, size: 0.04, base: 1, slant0: 72, slant: 2, gap: 0.25, gapJ: 0.03, wordJ: 0.05 };
const MESSY = { margin: 45, tilt: 7, size: 0.45, base: 9, slant0: 78, slant: 24, gap: 0.3, gapJ: 0.35, wordJ: 0.6, cross: 3 };

test('Otsu finds a threshold between ink and paper', () => {
  const img = writePage(NEAT); const t = HW.otsu(img.gray);
  assert.ok(t >= 28 && t < 236, String(t));
});
test('neat handwriting shows few features', () => {
  const r = HW.analyse(writePage(NEAT));
  assert.equal(r.ok, true, JSON.stringify(r.quality));
  assert.equal(r.level, 'few', JSON.stringify(r.metrics.map(m => [m.id, m.value, m.band])));
  assert.equal(r.quality.lines, 5);
});
test('irregular handwriting shows several features, with crossings-out found', () => {
  const r = HW.analyse(writePage(MESSY));
  assert.equal(r.ok, true);
  assert.equal(r.level, 'several', JSON.stringify(r.metrics.map(m => [m.id, m.value, m.band])));
  assert.ok(r.metrics.find(m => m.id === 'crossouts').value >= 3);
  assert.ok(r.ann.flagged.length > 0);
});
test('a blank or too-short photo is rejected with a reason, not judged', () => {
  const blank = HW.analyse(page());
  assert.equal(blank.ok, false); assert.deepEqual(blank.quality.issues, ['empty']); assert.equal(blank.level, 'unclear');
  const img = page(); stroke(img, 100, 100, 110, 70); stroke(img, 130, 100, 140, 70); stroke(img, 160, 100, 170, 70); stroke(img, 190, 100, 200, 70);
  assert.equal(HW.analyse(img).ok, false);
});
test('ruled lines on lined paper are ignored', () => {
  const img = writePage(NEAT);
  for (let y = 100; y < 640; y += 105) rect(img, 0, y, 900, 2);
  const r = HW.analyse(img);
  assert.equal(r.ok, true); assert.equal(r.level, 'few');
});
test('spelling bands and the summary never claim a diagnosis', () => {
  assert.equal(HW.spellingBand(0, 15), 'typical');
  assert.equal(HW.spellingBand(3, 15), 'mixed');
  assert.equal(HW.spellingBand(6, 15), 'notable');
  const s = HW.summary({ ok: true, level: 'several' }, { missed: 6, total: 15 });
  assert.equal(s.evidence, 'stronger');
  assert.match(s.note[0], /can’t identify/);
  [s.head[0], s.spl[0], s.note[0]].forEach(t => { assert.doesNotMatch(t, /\d+\s?%|you have (dyslexia|dysgraphia)|diagnos(is|ed) (of|with)/i); });
  assert.equal(HW.summary({ ok: true, level: 'few' }, { missed: 0, total: 15 }).evidence, 'little');
});
test('dictation sentences exist in both languages with tricky words in the text', () => {
  ['en', 'ar'].forEach(l => HW.DICTATION[l].forEach(d => d.tricky.forEach(w => assert.ok(d.text.includes(w), w))));
});
test('uneven lighting is evened out before measuring', () => {
  const img = HW.sample('neat');
  // a strong shadow across the right half
  for (let y = 0; y < img.height; y++) for (let x = 450; x < img.width; x++) { const i = y * img.width + x; img.gray[i] = Math.round(img.gray[i] * 0.55); }
  const r = HW.analyse(img, { normalize: true });
  assert.equal(r.ok, true); assert.equal(r.level, 'few');
});
test('built-in samples behave like their names', () => {
  assert.equal(HW.analyse(HW.sample('neat'), { normalize: true }).level, 'few');
  assert.equal(HW.analyse(HW.sample('irregular'), { normalize: true }).level, 'several');
});
