'use strict';
// v18 handwriting tools: the pure image functions behind the photo editor, line segmentation, the loop guard,
// and the tracing metric used by practice mode.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../assets/js/hand-rec.js');
const P = require('../../assets/js/hand-practice.js');

const page = (W, H, rows) => { const g = new Uint8Array(W * H).fill(240); rows.forEach(([y0, y1]) => { for (let y = y0; y <= y1; y++) for (let x = 20; x < W - 20; x += 3) g[y * W + x] = 20; }); return g; };

test('brightness and contrast move pixel values in the right direction and stay in range', () => {
  const g = Uint8Array.from([0, 64, 128, 192, 255]);
  const b = R.adjust(g, { brightness: 40 }); assert.ok(b[1] > 64 && b[4] === 255);
  const c = R.adjust(g, { contrast: 60 }); assert.ok(c[1] < 64 && c[3] > 192 && c[2] === 128);
  const lc = R.adjust(g, { contrast: -50 }); assert.ok(lc[0] > 0 && lc[4] < 255);
});
test('median filter removes isolated specks but keeps a solid stroke', () => {
  const W = 20, H = 20, g = new Uint8Array(W * H).fill(255); g[5 * W + 5] = 0; for (let y = 2; y < 18; y++) for (let x = 12; x < 15; x++) g[y * W + x] = 0;
  const m = R.median3(g, W, H); assert.equal(m[5 * W + 5], 255, 'speck removed'); assert.equal(m[10 * W + 13], 0, 'stroke kept');
});
test('flattening uneven light makes the paper uniform again', () => {
  const W = 120, H = 60, g = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = 120 + x; // a shadow across the page
  const f = R.flattenLight(g, W, H); const left = f[30 * W + 10], right = f[30 * W + 110]; assert.ok(Math.abs(left - right) < 30, `${left} vs ${right}`);
});
test('auto levels stretches a washed-out image', () => { const g = new Uint8Array(1000).map((_, i) => 150 + (i % 50)); const a = R.autoLevels(g); assert.ok(Math.max(...a) >= 250 && Math.min(...a) <= 5); });
test('line segmentation finds each written line and ignores thin specks', () => {
  const W = 300, H = 200, g = page(W, H, [[20, 40], [80, 100], [140, 160]]); g[60 * W + 100] = 0; g[61 * W + 100] = 0; // a speck between lines
  const b = R.lineBands(g, W, H); assert.equal(b.length, 3); b.forEach((x, i) => assert.ok(x.y0 <= [20, 80, 140][i] && x.y1 >= [40, 100, 160][i]));
});
test('ink span trims a line to its writing', () => { const W = 100, g = new Uint8Array(W * 10).fill(255); g[5 * W + 30] = 0; g[5 * W + 70] = 0; assert.deepEqual(R.inkSpan(g, W, 0, 9), { x0: 30, x1: 70 }); assert.equal(R.inkSpan(new Uint8Array(W * 10).fill(255), W, 0, 9), null); });
test('a looping model output is recognised as such', () => {
  assert.equal(R.repetitive('After the first time of the end of the time of the time of the time of the'), true);
  assert.equal(R.repetitive('will be with Sir Roy Welensky the Premier of the Order'), false);
});
test('word confidence is the least certain token of the word', () => {
  const w = R.wordsFromTokens([{ t: 'The', p: 0.99 }, { t: ' qu', p: 0.9 }, { t: 'ick', p: 0.4 }, { t: ' fox', p: 0.8 }]);
  assert.deepEqual(w, [{ text: 'The', conf: 99 }, { text: 'quick', conf: 40 }, { text: 'fox', conf: 80 }]);
});
test('tracing metric: a perfect trace covers the guide; a scribble elsewhere does not', () => {
  const W = 60, H = 40, guide = new Uint8Array(W * H); for (let x = 10; x < 50; x++) guide[20 * W + x] = 1;
  const same = P.coverage(guide, guide, W, H, 2); assert.equal(same.covered, 1); assert.equal(same.outside, 0);
  const off = new Uint8Array(W * H); for (let x = 10; x < 50; x++) off[5 * W + x] = 1;
  const o = P.coverage(guide, off, W, H, 2); assert.equal(o.covered, 0); assert.equal(o.outside, 1);
  const half = new Uint8Array(W * H); for (let x = 10; x < 30; x++) half[21 * W + x] = 1;
  const h = P.coverage(guide, half, W, H, 2); assert.ok(h.covered > 0.45 && h.covered < 0.6 && h.outside === 0);
});
