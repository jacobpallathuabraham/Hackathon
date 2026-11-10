// Handwriting Check v2 — the whole flow in a real browser with the real local recognition (Tesseract, WebAssembly).
// The test images are sentences rendered in a handwriting-style font (tests/fixtures/fonts, OFL): synthetic, not real handwriting.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/handwriting.e2e.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;
const FONT = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'fonts', 'Patrick_Hand.ttf')).toString('base64');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light');
    localStorage.setItem('erly-hand-v1', '{"old":"feature levels"}');
    window.__media = 0; if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.__media++; return Promise.reject(new Error('no')); };
  });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const reqs = []; p.on('request', r => reqs.push({ url: r.url(), method: r.method(), body: r.postData() }));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1000);
  assert.equal(await p.evaluate(() => localStorage.getItem('erly-hand-v1')), null, 'the old stored handwriting "levels" are deleted');

  // render a page of writing in the browser: the prompt sentences in a handwriting-style font
  const makePhoto = (opts) => p.evaluate(async ({ FONT, opts }) => {
    if (!document.fonts.check('40px PH')) { const f = new FontFace('PH', `url(data:font/ttf;base64,${FONT})`); await f.load(); document.fonts.add(f); }
    const lines = ERLY_HAND.PROMPTS.en[0], c = document.createElement('canvas'); c.width = 1400; c.height = 1000; const g = c.getContext('2d');
    g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#1d2433'; g.font = '58px PH';
    const out = document.createElement('canvas'); out.width = 1400; out.height = 1000; const o = out.getContext('2d');
    lines.forEach((l, i) => g.fillText(l, 120, 300 + i * 140));
    o.fillStyle = '#f7f3ea'; o.fillRect(0, 0, 1400, 1000); if (opts.blur) o.filter = 'blur(6px)'; o.drawImage(c, 0, 0);
    return out.toDataURL('image/jpeg', 0.92).split(',')[1];
  }, { FONT, opts });
  const upload = async b64 => { await p.setInputFiles('.hw2 input[data-file]:not([capture])', { name: 'page.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') }); await p.waitForSelector('#hwPrev'); };

  // 1 · open from the dashboard: signature transition, what it does / doesn't do, privacy
  await p.click('#games [data-hand-open]'); await p.waitForSelector('.hw2.is-on');
  assert.match(await p.getAttribute('.hw2-sig', 'aria-label'), /Your handwriting, your pace\./);
  const intro = await p.textContent('.hw2-intro');
  assert.match(intro, /What it cannot do/); assert.match(intro, /Detect dyslexia, dysgraphia/); assert.match(intro, /never uploaded or saved/);
  if (SHOT) { await p.waitForTimeout(2600); await p.screenshot({ path: SHOT + '/hand-intro.png' }); }
  assert.equal(await p.evaluate(() => window.__media), 0, 'no camera on opening');
  await p.click('.hw2-link[data-a="start"]'); // skip the animation
  await p.waitForSelector('.hw2-lines'); assert.equal(await p.locator('.hw2-lines li').count(), 3);
  if (SHOT) await p.screenshot({ path: SHOT + '/hand-notebook.png' });
  await p.click('.hw2 [data-a="tophoto"]');
  assert.equal(await p.getAttribute('.hw2 input[capture]', 'capture'), 'environment', 'camera only through the explicit “Take a photo” control');
  assert.equal(await p.evaluate(() => window.__media), 0, 'still no camera on the photo step');

  // 2 · a blurry photo is explained and refused — nothing is "analysed"
  await upload(await makePhoto({ blur: true }));
  await p.click('.hw2 [data-a="check"]'); await p.waitForSelector('.hw2-checks');
  assert.match(await p.textContent('.hw2-checks h3'), /isn’t clear enough/);
  assert.match(await p.textContent('.hw2-checks'), /blurry|stand out/);
  assert.equal(await p.locator('.hw2 [data-a="read"]').count(), 0, 'no reading of an unclear photo');
  if (SHOT) await p.screenshot({ path: SHOT + '/hand-rejected.png' });
  await p.click('.hw2 [data-a="retake"]');

  // 3 · a clear photo: rotate twice (back to upright), checks pass, recognised on this device
  await upload(await makePhoto({}));
  await p.click('.hw2 [data-a="rotr"]'); await p.click('.hw2 [data-a="rotl"]');
  await p.click('.hw2 [data-a="check"]'); await p.waitForSelector('.hw2-checks');
  assert.match(await p.textContent('.hw2-checks h3'), /good enough to read/);
  const before = reqs.length;
  await p.click('.hw2 [data-a="read"]');
  await p.waitForSelector('.hw2-result', { timeout: 120000 });
  const res = await p.textContent('.hw2-result');
  assert.match(res, /Most of your writing was recognised|Some words were difficult/, 'an honest verdict');
  assert.ok(await p.locator('.hw2-words .is-found').count() >= 10, 'recognised words are shown');
  assert.doesNotMatch(res, /dyslex|dysgraph|disorder|risk|probab|score of|messy|poor/i, 'no clinical or judgemental language');
  assert.match(res, /has not been validated/, 'the accuracy limit is stated');
  const during = reqs.slice(before);
  assert.ok(during.every(r => r.url.startsWith(BASE)), 'recognition loads only from this site: ' + during.map(r => r.url).filter(u => !u.startsWith(BASE)).join(' '));
  assert.ok(reqs.every(r => r.method === 'GET' || !/image|base64|jpeg/i.test(r.body || '')), 'no image is ever sent');
  if (SHOT) await p.screenshot({ path: SHOT + '/hand-result.png' });

  // 4 · nothing stored; discard wipes the photo and the result
  assert.doesNotMatch(await p.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage)), /hand|Tesseract|data:image/i);
  await p.click('.hw2 [data-a="discard"]'); await p.waitForTimeout(400);
  assert.equal(await p.evaluate(() => { const s = ERLY.handwriting.state(); return !!(s.canvas || s.ocr); }), false, 'photo and result discarded');
  assert.equal(await p.isVisible('.hw2'), false);

  // 5 · Arabic prompts, RTL notebook; mobile layout
  await p.setViewportSize({ width: 390, height: 844 });
  await p.click('#games [data-hand-open]'); await p.click('[data-lang="ar"]'); await p.click('.hw2-link[data-a="start"], .hw2-btn[data-a="start"]');
  await p.waitForSelector('.hw2-book[dir="rtl"]'); assert.match(await p.textContent('.hw2-lines'), /[؀-ۿ]/);
  assert.ok(await p.evaluate(() => document.querySelector('.hw2__panel').scrollWidth <= document.querySelector('.hw2__panel').clientWidth + 1), 'no sideways scroll on a phone');
  if (SHOT) await p.screenshot({ path: SHOT + '/hand-mobile-ar.png' });
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => window.__media), 0, 'getUserMedia never called');
  assert.deepEqual(errors, []);
  console.log('handwriting e2e: all checks passed');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
