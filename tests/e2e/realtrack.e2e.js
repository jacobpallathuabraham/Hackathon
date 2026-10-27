// Optional end-to-end check of Real tracking: real calendar days, the timed
// daily check-in, no fast-forward, and automatic end after day 28.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/realtrack.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date(2026, 9, 5, 20, 0) });
  await page.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); });
  await page.goto(BASE + 'student.html');
  await page.evaluate(() => localStorage.removeItem('erly-track-v2'));
  await page.reload();
  const box = '#trackBox';
  await page.locator(box).scrollIntoViewIfNeeded();
  await page.click(`${box} [data-mode="real"]`);
  assert.ok(await page.isVisible('.real-rules'));
  assert.equal(await page.locator('#pattern').count(), 0, 'no synthetic pattern in real mode');
  await page.check('#agree'); await page.click('#startTrack');
  await page.waitForSelector('.live--real');
  assert.equal(await page.locator('[data-act="next"], [data-act="ff"]').count(), 0, 'no simulate / fast-forward');
  assert.match(await page.textContent('.live--real'), /Day 1 \/ 28/);

  // the check-in
  await page.click('[data-ck="begin"]');
  await page.locator('[data-ck-range]').fill('7.5'); await page.click('[data-ck="next"]');
  for (const v of ['4', '2', '4', '2']) { await page.click(`[data-ck="ans"][data-v="${v}"]`); await page.clock.runFor(400); }
  await page.click('[data-ck="ans"][data-v="120"]'); await page.clock.runFor(400);
  await page.click('[data-ck="ans"][data-v="reading"]'); await page.clock.runFor(400);
  await page.click('[data-ck="ans"][data-v="none"]'); await page.clock.runFor(400);
  if (SHOT) await page.locator('#rck').screenshot({ path: SHOT + '/rt-review.png' });
  await page.click('[data-ck="lock"]');
  await page.waitForSelector('.rck--done');
  assert.match(await page.textContent('.rck--done'), /locked in/);
  // Reading Studio activity is bucketed into today
  await page.evaluate(() => { ERLY.track('V01', 3); ERLY.track('V05', 1.4, 'set'); });
  let st = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('erly-track-v2')); return s.rdays[Object.keys(s.rdays)[0]]; });
  assert.equal(st.vals.V01, 3); assert.equal(st.ck.readHard, 4);
  if (SHOT) await page.locator('.live--real').screenshot({ path: SHOT + '/rt-day1.png' });

  // the next real day opens at midnight, with a fresh check-in
  await page.clock.fastForward('04:01:00');
  await page.waitForTimeout(300);
  assert.match(await page.textContent('.live--real'), /Day 2 \/ 28/);
  assert.ok(await page.isVisible('[data-ck="begin"]'));
  // day 1 cell shows the check-in time
  assert.match(await page.textContent('.rcal__d >> nth=0'), /20:0/);

  // skip to after day 28: missed days excluded, raw data deleted, insufficient baseline
  await page.clock.setSystemTime(new Date(2026, 10, 3, 9, 0));
  await page.reload(); await page.waitForSelector('.live--real');
  const t = await page.textContent('.live--real');
  assert.match(t, /Ended automatically/);
  assert.match(t, /Not enough clean days/);
  st = await page.evaluate(() => JSON.parse(localStorage.getItem('erly-track-v2')));
  assert.equal(st.status, 'ended'); assert.deepEqual(st.rdays, {});
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('realtrack e2e ok');
})().catch(e => { console.error(e); process.exit(1); });
