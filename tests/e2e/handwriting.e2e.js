// Optional end-to-end check of the handwriting check: consent, dictation,
// a built-in sample, scan, spelling self-check, result and save.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/handwriting.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student'); localStorage.removeItem('erly-hand-v1');
    const synth = { speaking: false, getVoices: () => [], cancel() {}, pause() {}, resume() {}, speak(u) { setTimeout(() => { u.onstart && u.onstart({}); setTimeout(() => u.onend && u.onend({}), 50); }, 5); }, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
  });
  await page.goto(BASE + 'student.html');
  await page.evaluate(() => document.querySelector('[data-hand-open]').click());
  await page.waitForSelector('#hw.is-on');
  assert.ok(await page.isDisabled('#hwStart'), 'needs consent first');
  await page.check('#hwOk'); await page.click('#hwStart');
  for (let i = 0; i < 3; i++) { await page.click('.hw-play'); await page.waitForTimeout(120); await page.click('[data-next]'); }
  await page.waitForSelector('.hw-drop');
  await page.click('[data-sample="irregular"]');
  await page.waitForSelector('.hw-sents', { timeout: 8000 });
  await page.click('.hw-w >> nth=0'); await page.click('.hw-w >> nth=3'); await page.click('.hw-w >> nth=6'); await page.click('.hw-w >> nth=9'); await page.click('.hw-w >> nth=12');
  assert.match(await page.textContent('#hwMissN'), /^5/);
  await page.click('[data-go="result"]');
  await page.waitForSelector('.hw-res'); await page.waitForTimeout(1500);
  const t = await page.textContent('.hw-res');
  assert.match(t, /Several features/); assert.match(t, /can’t identify/);
  assert.doesNotMatch(t, /\d+\s?%/);
  if (SHOT) await page.locator('.hw__panel').screenshot({ path: SHOT + '/hw-result.png' });
  await page.click('[data-save]');
  await page.waitForFunction(() => /Handwriting alone/.test(document.querySelector('#cmpLog').textContent), null, { timeout: 8000 });
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('erly-hand-v1')));
  assert.equal(rec.level, 'several'); assert.equal(rec.spelling, 'notable'); assert.ok(!('gray' in rec));
  assert.match(await page.textContent('#cmpLog'), /Handwriting alone can’t identify/);
  // a blank photo is refused with advice
  await page.evaluate(() => ERLY.emit('hand:open'));
  await page.check('#hwOk'); await page.click('#hwSkip');
  const blank = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 400, 300); return c.toDataURL('image/png'); });
  const buf = Buffer.from(blank.split(',')[1], 'base64');
  await page.setInputFiles('#hwFile', { name: 'blank.png', mimeType: 'image/png', buffer: buf });
  await page.waitForSelector('.hw-err', { timeout: 8000 });
  assert.match(await page.textContent('.hw-err'), /couldn’t find any writing/);
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('handwriting e2e ok');
})().catch(e => { console.error(e); process.exit(1); });
