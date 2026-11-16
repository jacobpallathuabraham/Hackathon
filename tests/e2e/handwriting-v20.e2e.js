// Handwriting Studio v20 — the rebuilt writing surface and flow, in a real browser.
// The writing is drawn with the mouse from a rendered handwriting-style font (tests/fixtures/fonts, OFL), sampled into
// short strokes, then read by Tesseract running in the page (the optional TrOCR model is not downloaded here).
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/handwriting-v20.e2e.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const FONT = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'fonts', 'Patrick_Hand.ttf')).toString('base64');
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + String(e.message || e).split('\n')[0].slice(0, 260)]); } };

async function writeText(p, text) {
  const box = await p.locator('.hsc__vp').boundingBox();
  const segs = await p.evaluate(async ({ text, font }) => {
    const f = new FontFace('PH', `url(data:font/ttf;base64,${font})`); await f.load(); document.fonts.add(f);
    const c = document.createElement('canvas'); c.width = 1100; c.height = 130; const x = c.getContext('2d'); x.font = '92px PH'; x.fillText(text, 6, 100);
    const d = x.getImageData(0, 0, 1100, 130).data, out = [];
    for (let col = 0; col < 1100; col += 3) { let s = null; for (let y = 0; y < 130; y += 2) { const on = d[(y * 1100 + col) * 4 + 3] > 110; if (on && !s) s = [col, y]; if (!on && s) { out.push([s[0], s[1], col, y]); s = null; } } }
    return out;
  }, { text, font: FONT });
  const k = box.width / 1150;
  for (const [x0, y0, x1, y1] of segs) { await p.mouse.move(box.x + 24 + x0 * k, box.y + 30 + y0 * k); await p.mouse.down(); await p.mouse.move(box.x + 24 + x1 * k, box.y + 30 + y1 * k, { steps: 2 }); await p.mouse.up(); }
  return segs.length;
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light'); window.__media = 0; if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.__media++; return Promise.reject(new Error('blocked')); }; });
  const p = await ctx.newPage(); const errs = [], posts = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('request', r => { if (r.method() !== 'GET') posts.push(r.method() + ' ' + r.url()); });
  await p.goto(BASE + 'handwriting.html'); await p.waitForTimeout(1200);

  await check('intro explains the flow and says it is not a test or a diagnosis', async () => {
    const t = await p.textContent('#hwStudio');
    assert.match(t, /This is not a test/); assert.match(t, /cannot detect dyslexia, dysgraphia/);
    assert.equal(await p.locator('.hs-steps li').count(), 4);
  });
  await check('privacy text matches the implementation (memory only, optional model download, preferences only)', async () => {
    const t = await p.textContent('.hs-privacy');
    assert.match(t, /never uploaded and never saved/); assert.match(t, /Hugging Face/); assert.match(t, /display choices/);
  });
  await p.click('[data-a="start"]'); await p.waitForTimeout(500);
  let n = 0;
  await check('writing surface: two canvas layers sized for the device pixel ratio', async () => {
    const info = await p.evaluate(() => { const [b, l] = document.querySelectorAll('.hsc__sheet canvas'); return { bw: b.width, lw: l.width, css: b.getBoundingClientRect().width }; });
    assert.equal(info.bw, info.lw); assert.ok(info.bw >= Math.round(info.css) - 2, JSON.stringify(info));
  });
  await check('drawing creates strokes; Review is enabled only when there is ink', async () => {
    assert.ok(await p.isDisabled('[data-a="toreview"]'));
    n = await writeText(p, 'Bring a pen and some paper.');
    const s = await p.evaluate(() => ERLY.handwriting.pad().strokes.length);
    assert.equal(s, n); assert.ok(!(await p.isDisabled('[data-a="toreview"]')));
  });
  await check('undo, redo and clear (clear is undoable)', async () => {
    await p.click('[data-a="undo"]'); assert.equal(await p.evaluate(() => ERLY.handwriting.pad().strokes.length), n - 1);
    await p.click('[data-a="redo"]'); assert.equal(await p.evaluate(() => ERLY.handwriting.pad().strokes.length), n);
    await p.click('[data-a="clear"]'); assert.equal(await p.evaluate(() => ERLY.handwriting.pad().strokes.length), 0);
    await p.keyboard.press('Control+z'); assert.equal(await p.evaluate(() => ERLY.handwriting.pad().strokes.length), n);
  });
  await check('eraser removes ink and is undoable', async () => {
    await p.click('[data-tool="eraser"]'); const box = await p.locator('.hsc__vp').boundingBox();
    await p.mouse.move(box.x + 30, box.y + 40); await p.mouse.down(); await p.mouse.move(box.x + 140, box.y + 110, { steps: 8 }); await p.mouse.up();
    const last = await p.evaluate(() => { const s = ERLY.handwriting.pad().strokes; return s[s.length - 1].tool; }); assert.equal(last, 'eraser');
    await p.click('[data-a="undo"]'); await p.click('[data-tool="pen"]');
  });
  await check('paper styles, guide, pen size and colour change the page (and are the only things remembered)', async () => {
    for (const k of ['plain', 'grid', 'dotted', 'ruled']) { await p.click(`[data-paper="${k}"]`); assert.equal(await p.getAttribute('.hsc__sheet', 'data-paper'), k); }
    await p.check('[data-guide]'); assert.ok(await p.evaluate(() => document.querySelector('.hsc__sheet').classList.contains('has-guide')));
    await p.click('[data-size="6.5"]'); await p.click('[data-color="#1f3c88"]');
    const prefs = await p.evaluate(() => JSON.parse(localStorage.getItem('erly-hand-prefs')));
    assert.deepEqual(Object.keys(prefs).sort(), ['color', 'guide', 'paper', 'size']);
    const keys = await p.evaluate(() => Object.keys(localStorage).filter(k => /hand|ink|write/i.test(k))); assert.deepEqual(keys, ['erly-hand-prefs']);
  });
  await check('zoom in, out and reset', async () => {
    await p.click('[data-a="zin"]'); await p.waitForTimeout(250); assert.equal(await p.textContent('.hs-zoom__v'), '125%');
    await p.keyboard.press('Escape'); await p.click('[data-a="zout"]'); await p.waitForTimeout(250); assert.equal(await p.textContent('.hs-zoom__v'), '100%');
  });
  await check('review shows the exact black-on-white image the reader will see', async () => {
    await p.click('[data-a="toreview"]'); await p.waitForSelector('#hsRevH');
    const src = await p.getAttribute('.hs-review img', 'src'); assert.match(src, /^data:image\/png/);
    assert.match(await p.textContent('.hs-card'), /paper lines are left out/);
  });
  await check('recognition runs in the page and reports confidence per word', async () => {
    await p.click('[data-a="recognise"]'); await p.waitForSelector('#hsResH, .hs-err', { timeout: 120000 });
    const r = await p.evaluate(() => { const s = ERLY.handwriting.state(); return s.ocr && { engine: s.ocr.engine, conf: s.ocr.conf, text: s.ocr.text, words: s.ocr.words.length }; });
    assert.ok(r, 'no result'); assert.equal(r.engine, 'tess'); assert.ok(r.words > 0, JSON.stringify(r));
    assert.ok(await p.locator('.hs-w small').count() > 0);
    console.log('   read:', JSON.stringify(r.text.trim()), 'conf', Math.round(r.conf));
  });
  await check('correcting the text updates the comparison', async () => {
    await p.fill('#hsEdit', ''); const none = await p.textContent('.hs-cmp__n');
    await p.fill('#hsEdit', 'Bring a pen and some paper.'); await p.click('.hs-cmp summary');
    assert.match(none, /^0\/18/); assert.match(await p.textContent('.hs-cmp__n'), /^[5-9]\/18 words found/);
  });
  await check('discard wipes strokes, image copies and text, and says what was removed', async () => {
    await p.click('[data-a="discard"]'); await p.waitForSelector('#hsDoneH');
    const s = await p.evaluate(() => { const s = ERLY.handwriting.state(); return { pad: !!ERLY.handwriting.pad(), ocr: s.ocr, edit: s.edit, review: s.review, photo: s.photo, canv: document.querySelectorAll('canvas').length }; });
    assert.deepEqual(s, { pad: false, ocr: null, edit: '', review: null, photo: null, canv: 0 });
    assert.match(await p.textContent('.hs-wiped'), /pen strokes/);
  });
  await check('no camera or microphone use, no uploads (no non-GET requests)', async () => {
    assert.equal(await p.evaluate(() => window.__media), 0); assert.deepEqual(posts, []);
  });
  await check('photo alternative: a paper photo goes to review with rotate', async () => {
    await p.click('[data-a="start"]');
    const png = await p.evaluate(async font => { const f = new FontFace('PH', `url(data:font/ttf;base64,${font})`); await f.load(); document.fonts.add(f); const c = document.createElement('canvas'); c.width = 900; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#f4f1ea'; x.fillRect(0, 0, 900, 300); x.fillStyle = '#222'; x.font = '64px PH'; x.fillText('We meet near the main gate.', 30, 160); return c.toDataURL('image/png').split(',')[1]; }, FONT);
    await p.setInputFiles('.hs-actions [data-photo]', { name: 'page.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await p.waitForSelector('#hsRevH'); await p.click('[data-a="rotate"]'); await p.waitForSelector('#hsRevH');
    assert.equal(await p.evaluate(() => ERLY.handwriting.state().rot), 90);
    await p.click('[data-a="discard"]');
  });
  await check('phone: portrait page, tools reachable, no horizontal scroll', async () => {
    const mc = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); await mc.addInitScript(() => sessionStorage.setItem('acubins-role', 'student')); const m = await mc.newPage(); await m.goto(BASE + 'handwriting.html'); await m.waitForTimeout(800); await m.click('[data-a="start"]'); await m.waitForTimeout(400);
    const r = await m.evaluate(() => { const v = document.querySelector('.hsc__vp').getBoundingClientRect(); return { w: v.width, h: v.height, sx: document.documentElement.scrollWidth }; });
    assert.ok(r.h > r.w, JSON.stringify(r)); assert.ok(r.sx <= 390, JSON.stringify(r)); await mc.close();
  });
  await check('no page errors', async () => { assert.deepEqual(errs.filter(e => !/favicon|404/.test(e)), []); });

  await b.close();
  for (const [n2, r] of results) console.log((r === 'PASS' ? 'PASS ' : 'FAIL ') + n2 + (r === 'PASS' ? '' : ' — ' + r));
  const f = results.filter(r => r[1] !== 'PASS').length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
})();
