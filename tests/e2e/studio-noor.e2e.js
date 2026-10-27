// End-to-end check of the Reading Studio library and tools, and Noor's
// ChatGPT-style chat, AI brain plumbing, nudges and voice mode.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/studio-noor.e2e.js
// The AI model itself is mocked (no GPU in CI); everything around it is real.
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); // offline thumbnails are fine
  await page.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    window.__spoken = [];
    const synth = { speaking: false, getVoices: () => [], cancel() {}, pause() {}, resume() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart && u.onstart({}); setTimeout(() => u.onend && u.onend({}), 15); }, 5); }, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.__heard = [];
    class Rec { start() { const t = window.__heard.shift(); setTimeout(() => { if (t) this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal: true })] }); this.onend(); }, 80); } stop() {} abort() { this.onend && this.onend(); } }
    window.SpeechRecognition = window.webkitSpeechRecognition = Rec;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('no mic in test'));
  });
  await page.goto(BASE + 'student.html');
  await page.waitForTimeout(600);

  /* ---------- the library ---------- */
  await page.click('.studio-cta [data-studio].btn');
  await page.waitForSelector('.slib.is-in');
  await page.waitForTimeout(900);
  assert.ok(await page.locator('.sbook[data-open]').count() >= 6, 'six course readings');
  await page.fill('#stLibQ', 'psychology'); await page.waitForTimeout(200);
  assert.equal(await page.locator('.sbook[data-open]').count(), 1, 'library search filters');
  await page.fill('#stLibQ', '');
  await page.click('.slib__chips [data-f="computing"]');
  assert.equal(await page.locator('.sbook[data-open]').count(), 1, 'field filter');
  await page.click('.slib__chips [data-f="all"]'); await page.waitForTimeout(400);
  await page.click('.sbook[data-open="psyc101"]'); await page.waitForTimeout(1200);
  assert.equal(await page.isHidden('#stLib'), true);
  assert.match(await page.textContent('#stTitle'), /PSYC101/);

  /* ---------- highlight + note ---------- */
  const select = (a, b) => page.evaluate(([a, b]) => { const ws = document.querySelectorAll('#stDoc .w'); const r = document.createRange(); r.setStartBefore(ws[a]); r.setEndAfter(ws[b]); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }, [a, b]);
  await select(20, 26); await page.waitForTimeout(500);
  assert.equal(await page.isVisible('#stSel'), true, 'selection toolbar');
  await page.click('#stSel [data-sa="note"]'); await page.waitForTimeout(300);
  await page.fill('#hlPop textarea', 'Ask about this in the tutorial');
  await page.click('#hlPop [data-save]'); await page.waitForTimeout(300);
  assert.equal(await page.locator('#stDoc .w.hl').count(), 7, 'seven words highlighted');
  await page.click('[data-side="notes"]');
  assert.match(await page.textContent('#stSideBody'), /Ask about this in the tutorial/);
  // highlight survives switching readings and coming back
  await page.click('#stLibBtn'); await page.waitForTimeout(600);
  await page.click('.sbook[data-open="mech210"]'); await page.waitForTimeout(900);
  assert.equal(await page.locator('#stDoc .w.hl').count(), 0);
  await page.click('#stLibBtn'); await page.waitForTimeout(600);
  await page.click('.sbook[data-open="psyc101"]'); await page.waitForTimeout(900);
  assert.equal(await page.locator('#stDoc .w.hl').count(), 7, 'notes are per reading');

  /* ---------- search, bookmark, study tools ---------- */
  await page.keyboard.press('Control+f');
  await page.fill('#stFindQ', 'working memory'); await page.waitForTimeout(400);
  assert.match(await page.textContent('#stFindN'), /^1\/\d+$/);
  await page.click('#stFindX');
  await page.click('#stMarkT');
  assert.equal(await page.getAttribute('#stMarkT', 'aria-pressed'), 'true');
  await page.click('#stStudyT'); await page.waitForTimeout(500);
  assert.match(await page.textContent('#stStudyBody'), /Working memory is a small workspace/);
  await page.click('[data-st="cards"]'); await page.click('.sflip'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.querySelector('.sflip').classList.contains('is-flipped')), true);
  await page.click('[data-deck="know"]');
  assert.match(await page.textContent('.sdeck__bar'), /^2 \/ 11/);
  await page.click('[data-st="quiz"]');
  const right = await page.evaluate(() => { const qs = ERLY.reader.doc.pages.flatMap(p => p.paras.map(x => x.check)); return qs[0].a; });
  await page.click(`[data-qo="${right}"]`); await page.waitForTimeout(200);
  assert.match(await page.textContent('#stQfb'), /Correct/);
  await page.click('#stDrawX');

  /* ---------- your own PDF ---------- */
  await page.click('#stLibBtn'); await page.waitForTimeout(600);
  await page.setInputFiles('#stFile', path.join(__dirname, '..', 'fixtures', 'coral-reefs.pdf'));
  await page.waitForFunction(() => /coral-reefs/.test(document.querySelector('#stTitle').textContent), null, { timeout: 15000 });
  assert.equal(await page.locator('.spage').count(), 2);
  assert.equal(await page.textContent('.spage__h'), 'Climate and Coral Reefs');
  assert.match(await page.textContent('#stDoc'), /This process is called coral bleaching/);
  await page.click('#stStudyT'); await page.click('[data-st="sum"]'); await page.waitForTimeout(300);
  assert.match(await page.textContent('#stStudyBody'), /Auto summary/);
  await page.click('#stDrawX');
  await page.click('#stMoreT'); await page.click('[data-more="orig"]');
  await page.waitForSelector('.spdf__pg.is-drawn', { timeout: 15000 });
  await page.click('#stMoreT'); await page.click('[data-more="orig"]');

  /* ---------- Noor: composer, built-in skills ---------- */
  await page.click('.cmp-launch'); await page.waitForTimeout(1300);
  assert.equal(await page.isVisible('.cbcard'), true, 'offers to turn on the AI brain');
  await page.click('.ccard [data-c="yes"]'); await page.waitForTimeout(600);
  assert.equal(await page.isVisible('#cmpVoice'), true, 'voice-mode button when the box is empty');
  await page.fill('#cmpText', 'what is (12+3)*4');
  assert.equal(await page.isVisible('#cmpSend'), true, 'send button while typing');
  await page.press('#cmpText', 'Enter'); await page.waitForTimeout(900);
  assert.match(await page.textContent('#cmpLog'), /\(12\+3\)×4 = 60/);
  await page.fill('#cmpText', 'make me a 5 day exam study plan'); await page.press('#cmpText', 'Enter'); await page.waitForTimeout(1200);
  assert.equal(await page.locator('#cmpLog .md-table tbody tr').count(), 5, 'a 5-day plan table');

  /* ---------- Noor: the AI brain (model mocked) ---------- */
  await page.click('#cmpMode'); await page.waitForTimeout(800);
  assert.match(await page.textContent('#cmpBrain'), /On-device AI/);
  assert.match(await page.textContent('#cmpBrain'), /no WebGPU|Noor Plus/);
  await page.click('#cmpBrain [data-b="close"]');
  await page.evaluate(() => {
    const ai = ERLY.companion.ai;
    window.__msgs = null;
    ai.ready = () => true;
    ai.label = () => ({ en: 'On-device AI · Test', ar: 'Test' });
    ai.generate = async (msgs, o) => {
      window.__msgs = msgs;
      const last = msgs[msgs.length - 1].content;
      const text = /bad/.test(last) ? 'Honestly, you probably have ADHD.' : '## Working memory\n- It holds about **four** chunks.\n- Chunking frees up space.\n\n```js\nconst x = 4;\n```';
      let acc = '';
      for (const w of text.split(/(\s+)/)) { acc += w; o.onToken && o.onToken(acc); await new Promise(r => setTimeout(r, 4)); if (/you probably have/i.test(acc)) throw new Error('unsafe'); }
      return acc;
    };
  });
  // ask about a selected passage from the reader
  await page.click('#cmpClose'); await page.waitForTimeout(300);
  await page.click('#stLibBtn'); await page.waitForTimeout(500); await page.click('.sbook[data-open="psyc101"]'); await page.waitForTimeout(800);
  await select(2, 9); await page.waitForTimeout(500);
  await page.click('#stSel [data-sa="ask"]'); await page.waitForTimeout(1500);
  assert.match(await page.textContent('#cmpAttach'), /PSYC101/);
  assert.match(await page.evaluate(() => window.__msgs[0].content), /PSYC101_Memory_Chapter6\.pdf[\s\S]*selected this passage/);
  assert.equal(await page.locator('#cmpLog .cmsg--md h5, #cmpLog .cmsg--md h4, #cmpLog .cmsg--md h3').count() >= 1, true, 'markdown heading');
  assert.equal(await page.locator('#cmpLog .md-code').count(), 1, 'code block');
  assert.equal(await page.locator('#cmpLog .cmsg__acts').count() >= 1, true, 'reply actions');
  // a reply that tells the student they have a condition is never shown
  await page.fill('#cmpText', 'say something bad'); await page.press('#cmpText', 'Enter'); await page.waitForTimeout(1500);
  const log = await page.textContent('#cmpLog');
  assert.doesNotMatch(log, /you probably have ADHD/);
  assert.match(log, /only a qualified assessment can do that/);

  /* ---------- nudges while reading ---------- */
  await page.click('#cmpClose'); await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await page.click('#stZoomIn'); await page.waitForTimeout(150); await page.click('#stZoomOut'); await page.waitForTimeout(150); }
  await page.waitForSelector('.cmp-invite--nudge.is-in', { timeout: 6000 });
  assert.match(await page.textContent('.cmp-invite'), /Zooming in and out a lot\?/);
  const before = await page.evaluate(() => ERLY.reader.format().size);
  await page.click('.cmp-invite [data-nu="bigger"]'); await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => ERLY.reader.format().size) > before, 'text made bigger');

  /* ---------- voice mode: sentences are spoken as they are written ---------- */
  await page.evaluate(() => { window.__spoken.length = 0; window.__heard.push('I keep losing focus in lectures'); });
  await page.click('.cmp-launch'); await page.waitForTimeout(600);
  await page.click('#cmpVoice'); await page.waitForTimeout(400);
  if (await page.$('#ncConsent [data-c="yes"]')) await page.click('#ncConsent [data-c="yes"]');
  await page.waitForTimeout(3500);
  assert.equal(await page.locator('.ncall .nblob').count(), 1);
  assert.equal(await page.getAttribute('.ncall__seg [data-m="care"]', 'aria-pressed'), 'true', 'check-in style by default');
  assert.match(await page.evaluate(() => window.__msgs[0].content), /caring specialist/);
  assert.ok((await page.evaluate(() => window.__spoken.join(' '))).includes('four'), 'AI reply spoken');
  await page.click('#ncEnd');

  assert.deepEqual(errors, [], 'no console errors');
  console.log('studio + noor e2e: all checks passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
