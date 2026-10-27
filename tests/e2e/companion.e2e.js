// Optional end-to-end check of the AI Reading Companion in a real browser.
//   python3 -m http.server 8765 &        (from the repo root)
//   NODE_PATH=$(npm root -g) node tests/e2e/companion.e2e.js
// Needs Playwright with Chromium. Speech APIs are mocked so it runs headless.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const URL = process.env.ERLY_URL || 'http://localhost:8765/student.html';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    // no warm-up so the invitation can appear within the test
    localStorage.setItem('erly-companion-v1', JSON.stringify({ thresholds: { invite: { warmupMs: 0 } } }));
    const synth = { speaking: false, getVoices: () => [], cancel() {}, pause() {}, resume() {}, speak(u) { setTimeout(() => { u.onstart && u.onstart({}); setTimeout(() => u.onend && u.onend({}), 20); }, 5); }, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    class DeniedMic { start() { setTimeout(() => { this.onerror({ error: 'not-allowed' }); this.onend(); }, 30); } stop() {} abort() {} }
    window.SpeechRecognition = window.webkitSpeechRecognition = DeniedMic;
  });
  await page.goto(URL);
  await page.evaluate(() => ERLY.openStudio(null, { doc: 'mech210' }));
  await page.waitForTimeout(1200);

  // 1. nothing is collected before consent
  await page.evaluate(() => { const d = document.querySelector('#stDoc'); d.scrollTop = 600; });
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => ERLY.companion.state().session), null, 'no session without consent');

  // 2. consent, then repeated returns to one paragraph -> one gentle invitation
  await page.click('.cmp-launch'); await page.waitForTimeout(1200);
  await page.click('.ccard [data-c="yes"]'); await page.waitForTimeout(800);
  await page.click('#cmpClose');
  const go = k => page.evaluate(k => { const d = document.querySelector('#stDoc'), r = document.querySelector(`.sp[data-p="${k}"]`).getBoundingClientRect(), dr = d.getBoundingClientRect(); d.scrollTop += (r.top + r.height / 2) - (dr.top + d.clientHeight * 0.45); }, k).then(() => page.waitForTimeout(450));
  const keys = await page.evaluate(() => Array.from(document.querySelectorAll('.sp')).map(x => x.dataset.p));
  for (const k of keys.slice(0, 5)) await go(k);
  for (let i = 0; i < 3; i++) { await go(keys[1]); await page.waitForTimeout(1700); await go(keys[4]); }
  await page.waitForTimeout(2500);
  assert.equal(await page.isVisible('.cmp-invite'), true, 'invitation shown');

  // 3. adaptive conversation with a support tool
  await page.click('.cmp-invite [data-i="talk"]'); await page.waitForTimeout(1500);
  await page.fill('#cmpText', 'I kept losing my place'); await page.press('#cmpText', 'Enter'); await page.waitForTimeout(1500);
  await page.click('.cchips [data-id="tool:focus"]'); await page.waitForTimeout(2000);
  assert.equal(await page.evaluate(() => document.querySelector('#studio').classList.contains('is-focus')), true, 'line focus applied in the reader');
  await page.click('.cchips [data-id="helped"]'); await page.waitForTimeout(1500);

  // 4. microphone denial falls back to typing
  await page.click('#cmpMic'); await page.waitForTimeout(300);
  await page.click('.ccard [data-m="yes"]'); await page.waitForTimeout(500);
  assert.match(await page.textContent('#cmpLog'), /Microphone access is blocked/);

  // 5. editable summary without diagnostic wording
  await page.click('#cmpTab-summary'); await page.click('[data-s="make"]'); await page.waitForTimeout(300);
  const summary = await page.evaluate(() => Array.from(document.querySelectorAll('.csum textarea')).map(t => t.value).join('\n'));
  assert.match(summary, /not a diagnosis/);
  assert.doesNotMatch(summary.replace(/not a diagnosis/g, ''), /dyslexi|adhd|disorder|\d+\s?%/i);

  // 6. delete everything
  page.on('dialog', d => d.accept());
  await page.click('#cmpTab-signals'); await page.click('[data-a="delAll"]'); await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => localStorage.getItem('erly-companion-v1')), null);

  assert.deepEqual(errors, [], 'no console errors');
  console.log('companion e2e: all checks passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
