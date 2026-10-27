// Optional end-to-end check of the Growth Plan: intake consult, plan, a
// daily session (with real exercises and skips), practice, weekly review.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/growth.e2e.js
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
    sessionStorage.setItem('acubins-role', 'student');
    if (!sessionStorage.getItem('g-init')) { localStorage.removeItem('erly-growth-v1'); sessionStorage.setItem('g-init', '1'); }
    localStorage.setItem('erly-hand-v1', JSON.stringify({ level: 'several', spelling: 'notable' }));
    const synth = { speaking: false, getVoices: () => [], cancel() {}, speak() {}, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
  });
  await page.goto(BASE + 'support.html?fast=1');
  // intake
  await page.click('[data-next]');
  const sug = await page.locator('.gx-area.is-on').evaluateAll(els => els.map(e => e.dataset.area));
  assert.deepEqual(sug.sort(), ['reading', 'writing'], 'pre-selected from evidence');
  await page.click('[data-area="writing"]'); await page.click('[data-area="attention"]');
  await page.click('[data-next]');
  await page.click('[data-goal="reading:1"]'); await page.click('[data-next]');
  await page.click('[data-min="10"]'); await page.click('[data-next]');
  await page.click('[data-when="eve"]'); await page.click('[data-next]');
  await page.click('[data-tried="tts"]'); await page.click('[data-next]');
  assert.match(await page.textContent('.gx'), /syllables/);
  if (SHOT) await page.screenshot({ path: SHOT + '/g-plan.png' });
  await page.click('[data-startplan]');
  await page.waitForSelector('.gd-today');
  if (SHOT) await page.screenshot({ path: SHOT + '/g-dash.png', fullPage: false });

  // today's session: play the calm warm-up and skip the rest
  await page.click('[data-session]');
  await page.waitForSelector('.gp.is-on');
  for (let k = 0; k < 4; k++) {
    await page.waitForTimeout(250);
    if (await page.locator('.gp-end').count()) break;
    if (await page.locator('.gg-box').count()) { await page.click('.gp [data-go]'); await page.waitForTimeout(600); continue; }
    if (await page.locator('.gg-thought').count()) { for (let q = 0; q < 3; q++) { await page.click('.gg-opts button >> nth=0'); await page.waitForTimeout(1500); } continue; }
    await page.click('[data-skipgame]');
  }
  await page.waitForSelector('.gp-end', { timeout: 8000 });
  if (SHOT) await page.screenshot({ path: SHOT + '/g-end.png' });
  await page.click('.gp-end [data-close]');
  await page.waitForSelector('.gd-today.is-done');
  let st = await page.evaluate(() => JSON.parse(localStorage.getItem('erly-growth-v1')));
  assert.equal(st.sessions.length, 1); assert.ok(st.xp > 0);
  assert.equal(await page.locator('[data-session]').count(), 0, 'one plan session a day');

  // practice in the library: dots, answered for real
  await page.click('[data-play="dots"]');
  await page.waitForSelector('.gg-dotbox');
  for (let k = 0; k < 6; k++) { await page.waitForSelector('.gg-opts:not([hidden]) button'); const n = await page.locator('.gg-dotbox i').count(); await page.click(`.gg-opts button[data-n="${n}"]`); await page.waitForTimeout(1100); }
  await page.waitForSelector('.gp-end');
  assert.match(await page.textContent('.gp-end'), /great/);
  await page.click('.gp-end [data-close]');

  // jump to the end of week 1 and take the weekly review
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('erly-growth-v1')); for (let i = 1; i <= 5; i++) s.sessions.push({ date: '2000-01-0' + i, week: 1, games: [] }); localStorage.setItem('erly-growth-v1', JSON.stringify(s)); });
  await page.reload();
  await page.click('[data-consult="1"]');
  for (const v of ['2', 'syllables', 'hard', '2']) { await page.click(`.gc [data-v="${v}"]`); await page.waitForTimeout(400); }
  await page.waitForSelector('.gc-note');
  const note = await page.textContent('.gc-note');
  assert.match(note, /a little easier/); assert.match(note, /counsellor/);
  await page.click('.gc-note [data-done]');
  st = await page.evaluate(() => JSON.parse(localStorage.getItem('erly-growth-v1')));
  assert.equal(st.consults.length, 1);
  assert.match(await page.textContent('.gd-notes'), /Week 1/);
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('growth e2e ok');
})().catch(e => { console.error(e); process.exit(1); });
