// v17 Handwriting Check: paper styles and several pages on screen, adaptive preparation for uneven light,
// the recogniser's own word confidences, an editable / copyable / comparable result, and a Discard that
// really clears everything (including the recognition worker). Synthetic font-rendered pages, real local Tesseract.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/handwriting-v17.e2e.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const FONT = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'fonts', 'Patrick_Hand.ttf')).toString('base64');
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + (e.message || e).split('\n')[0].slice(0, 240) + ' @' + ((e.stack || '').match(/e2e.js:(\d+)/) || [])[1]]); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE.replace(/\/$/, '') });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light'); });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const reqs = []; p.on('request', r => reqs.push({ url: r.url(), method: r.method(), body: r.postData() }));
  await p.goto(BASE + 'handwriting.html'); await p.waitForSelector('#hwPad canvas');
  const strokes = () => p.evaluate(() => ERLY.handwriting.pad().strokes.length);
  const scribble = async (dx) => { const r = await p.locator('#hwPad').boundingBox(); await p.mouse.move(r.x + 80 + dx, r.y + 80); await p.mouse.down(); await p.mouse.move(r.x + 220 + dx, r.y + 120, { steps: 12 }); await p.mouse.up(); };

  await check('paper styles: ruled, blank and grid', async () => {
    assert.equal(await p.getAttribute('#hwPad', 'data-paper'), 'ruled');
    await p.click('button[data-paper="grid"]'); assert.equal(await p.getAttribute('#hwPad', 'data-paper'), 'grid');
    const bg = await p.evaluate(() => getComputedStyle(document.getElementById('hwPad')).backgroundImage);
    assert.match(bg, /repeating-linear-gradient.*repeating-linear-gradient/, 'grid lines both ways');
    await p.click('button[data-paper="blank"]'); assert.equal(await p.getAttribute('#hwPad', 'data-paper'), 'blank');
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('hwPad')).backgroundImage), 'none');
    await p.click('button[data-paper="ruled"]');
  });
  await check('several pages: each keeps its own writing', async () => {
    await scribble(0); await scribble(40); assert.equal(await strokes(), 2);
    await p.click('[data-a="addpage"]'); assert.equal(await strokes(), 0, 'a new, empty page');
    await scribble(0); assert.equal(await strokes(), 1);
    assert.deepEqual(await p.evaluate(() => ERLY.handwriting.pages()), [2, 1]);
    await p.click('#hwPages [data-page="0"]'); assert.equal(await strokes(), 2, 'page 1 is intact');
    await p.click('#hwPages [data-page="1"]'); assert.equal(await strokes(), 1, 'page 2 is intact');
    // undo works per page, and a theme change doesn't lose anything
    await p.click('[data-a="undo"]'); assert.equal(await strokes(), 0);
    await p.click('#themeToggle'); await p.waitForTimeout(300); await p.click('#hwPages [data-page="0"]'); assert.equal(await strokes(), 2);
    await p.click('#themeToggle'); await p.waitForTimeout(300);
  });

  // a photographed page with a shadow across it (bright on the left, dim on the right)
  const photo = () => p.evaluate(async FONT => {
    if (!document.fonts.check('40px PH')) { const f = new FontFace('PH', `url(data:font/ttf;base64,${FONT})`); await f.load(); document.fonts.add(f); }
    const lines = ERLY_HAND.PROMPTS.en[0], c = document.createElement('canvas'); c.width = 1400; c.height = 1000; const g = c.getContext('2d');
    g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, 1400, 1000); g.fillStyle = '#1d2433'; g.font = '58px PH';
    lines.forEach((l, i) => g.fillText(l, 120, 300 + i * 140));
    const sh = g.createLinearGradient(0, 0, 1400, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.32)'); g.fillStyle = sh; g.fillRect(0, 0, 1400, 1000);
    return c.toDataURL('image/jpeg', 0.92).split(',')[1];
  }, FONT);
  await check('a shadowed photo is prepared with the adaptive threshold and read on this device', async () => {
    await p.click('.hw2 [data-method="paper"]'); await p.click('.hw2 [data-a="tophoto"]');
    await p.setInputFiles('.hw2 input[data-file]:not([capture])', { name: 'page.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(await photo(), 'base64') });
    await p.waitForSelector('#hwPrev'); await p.click('.hw2 [data-a="check"]'); await p.waitForSelector('.hw2-checks');
    assert.equal(await p.locator('.hw2 [data-a="read"]').count(), 1, 'checks: ' + (await p.textContent('.hw2-checks')).replace(/\s+/g, ' ').slice(0, 300));
    const before = reqs.length;
    await p.click('.hw2 [data-a="read"]'); await p.waitForSelector('.hw2-result', { timeout: 120000 });
    const r = (await p.textContent('.hw2-result')).replace(/\s+/g, ' ');
    assert.ok(/adaptive threshold for uneven light/.test(r), 'uneven=' + (await p.evaluate(() => ERLY.handwriting.state().q.stats.uneven)) + ' ' + r.slice(r.indexOf('Prepared'), r.indexOf('Prepared') + 160)); assert.match(r, /3 lines found/);
    const sent = reqs.slice(before).filter(q => q.method !== 'GET' || /^data:|blob:/.test(q.url) === false && !q.url.startsWith(BASE));
    assert.equal(sent.length, 0, 'no request left the site: ' + sent.map(q => q.url).join(', '));
    assert.ok(await p.locator('.hw2-words .is-found').count() >= 10, 'words recognised');
  });
  await check('word flags are the recogniser’s own confidences', async () => {
    const flags = await p.evaluate(() => ERLY.handwriting.state().ocr.words);
    assert.ok(flags.length >= 10, 'per-word confidences from Tesseract');
    assert.ok(flags.every(w => ['ok', 'uncertain', 'unreadable'].includes(w.flag) && w.conf >= 0 && w.conf <= 100));
    assert.equal(await p.locator('.hw2-flags span').count(), flags.length);
    assert.match(await p.textContent('.hw2-flagbox'), /describe the software, not your writing/);
  });
  await check('the result can be corrected, compared and copied', async () => {
    await p.click('[data-a="compare"]'); await p.waitForSelector('.hw2-cmp');
    assert.equal(await p.locator('.hw2-cmp tbody tr').count(), 3, 'one row per sentence');
    const ERLY_LINES = await p.evaluate(() => ERLY_HAND.PROMPTS.en[0].join('\n')); await p.fill('#hwEdit', ERLY_LINES);
    await p.waitForTimeout(150);
    assert.equal(await p.locator('.hw2-cmp del').count(), 0, 'after correcting, every expected word is found');
    assert.equal(await p.locator('.hw2-cmp ins').count(), 0);
    await p.click('[data-a="copy"]'); await p.waitForTimeout(200);
    assert.equal(await p.evaluate(() => navigator.clipboard.readText()), ERLY_LINES);
  });
  await check('read again with the other preparation', async () => {
    await p.click('[data-a="retryprep"]'); await p.waitForSelector('.hw2-result', { timeout: 120000 });
    assert.match(await p.textContent('.hw2-result'), /one threshold for the whole page/);
  });
  await check('Discard clears the photo, pages, result, edits and the recognition worker', async () => {
    assert.equal(await p.evaluate(() => ERLY.handwriting._worker()), true);
    await p.click('.hw2 [data-a="discard"]'); await p.waitForTimeout(300);
    const s = await p.evaluate(() => { const s = ERLY.handwriting.state(); return { img: !!(s.canvas || s.canvases), ocr: !!s.ocr, edit: s.edit, pages: ERLY.handwriting.pages(), worker: ERLY.handwriting._worker() }; });
    assert.deepEqual(s, { img: false, ocr: false, edit: null, pages: [0], worker: false });
    assert.equal(await p.evaluate(() => Object.keys(localStorage).filter(k => /hand|ink/i.test(k)).length + Object.keys(sessionStorage).filter(k => /hand/i.test(k)).length), 0, 'nothing stored');
  });

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  const fail = results.filter(r => r[1] !== 'PASS').length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail || errors.length ? 1 : 0);
})();
