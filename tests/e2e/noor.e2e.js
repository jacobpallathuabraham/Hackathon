// Optional end-to-end check of Noor's knowledge chat, interview, voice call,
// video check-in, proactive notice and the Daily Quest page.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/noor.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    const synth = { speaking: false, getVoices: () => [], cancel() {}, pause() {}, resume() {}, speak(u) { setTimeout(() => { u.onstart && u.onstart({}); setTimeout(() => u.onend && u.onend({}), 20); }, 5); }, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
    window.__heard = ['I always have to re-read things'];
    class Rec { start() { const t = window.__heard.shift(); setTimeout(() => { if (t) this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal: true })] }); this.onend(); }, 100); } stop() {} abort() { this.onend && this.onend(); } }
    window.SpeechRecognition = window.webkitSpeechRecognition = Rec;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('no mic in test'));
  });
  await page.goto(BASE + 'student.html');
  await page.click('.cmp-launch'); await page.waitForTimeout(1400);
  await page.click('.ccard [data-c="yes"]'); await page.waitForTimeout(900);

  // knowledge
  await page.fill('#cmpText', 'what are the signs of ADHD?'); await page.press('#cmpText', 'Enter'); await page.waitForTimeout(1300);
  assert.match(await page.textContent('#cmpLog'), /Common signs of ADHD/);

  // interview to a result
  await page.fill('#cmpText', 'could I have dyslexia?'); await page.press('#cmpText', 'Enter'); await page.waitForTimeout(1300);
  await page.click('.cchips button[data-id="interview:reading"]'); await page.waitForTimeout(1300);
  for (let i = 0; i < 16; i++) {
    const id = await page.evaluate(() => { const bs = Array.from(document.querySelectorAll('.cchips button[data-id^="o:"]')); if (!bs.length) return null; const f = bs.find(b => ['o:3', 'o:yes', 'o:both'].includes(b.dataset.id)) || bs[0]; return f.dataset.id; });
    if (!id) break;
    await page.click(`.cchips button[data-id="${id}"]`); await page.waitForTimeout(800);
  }
  await page.waitForTimeout(600);
  const res = await page.textContent('.civ-res');
  assert.match(res, /clear pattern/); assert.match(res, /doesn’t mean you have it/); assert.match(res, /not a diagnosis/);
  assert.doesNotMatch(res, /probab|likelihood|chance of|\d+\s?% (chance|likely)/i);

  // profile tab shows the interview
  await page.click('#cmpTab-profile'); await page.waitForTimeout(400);
  assert.match(await page.textContent('#cmpP-profile'), /We talked it through/);
  await page.click('#cmpTab-chat');

  // two-way voice: Noor speaks, listens, answers what was heard
  await page.click('#cmpCall'); await page.waitForTimeout(600);
  if (await page.$('#ncConsent [data-c="yes"]')) await page.click('#ncConsent [data-c="yes"]');
  await page.waitForTimeout(4000);
  assert.match(await page.textContent('#cmpLog'), /I always have to re-read things/);
  assert.match(await page.textContent('#ncNoor'), /frustrating|Lots of things/);
  await page.click('#ncEnd');

  // a video part replayed three times -> gentle check-in
  await page.evaluate(() => ERLY.videos.open('Xb05CaG7TsQ')); await page.waitForTimeout(500);
  await page.evaluate(() => { const t = Date.now(); [[80, 62], [85, 61], [90, 64]].forEach(([f, to], i) => ERLY.videos._simulate({ type: 'seek', from: f, to, t: t + i * 1000 })); });
  await page.waitForTimeout(400);
  assert.match(await page.textContent('.cmp-invite'), /trouble understanding/);

  // Daily Quest page
  await page.goto(BASE + 'checkins.html'); await page.waitForTimeout(1500);
  assert.equal(await page.locator('.q-node').count(), 5);
  assert.equal(await page.locator('.q-card').count(), 2);
  assert.deepEqual(errors, []);
  console.log('noor e2e: all checks passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
