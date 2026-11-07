// End-to-end check of Noor's tools: welcome screen, calculator, study coach,
// adaptive memory (with consent), navigation, and iPad-style tap-to-talk.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/noor-tools.e2e.js
// Speech APIs are mocked (no microphone in CI); the AI brain is left off so the
// built-in tools are what answer.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';

const MOCKS = () => {
  sessionStorage.setItem('acubins-role', 'student');
  const synth = { speaking: false, getVoices: () => [], cancel() {}, pause() {}, resume() {}, speak(u) { setTimeout(() => { u.onstart && u.onstart({}); setTimeout(() => u.onend && u.onend({}), 15); }, 5); }, addEventListener() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  // like Safari: results stay interim, and listening ends only when stop() is called
  window.__recStarts = 0;
  class Rec {
    start() { window.__recStarts++; setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'what is 6*7' }], { isFinal: false })] }), 60); }
    stop() { setTimeout(() => this.onend && this.onend(), 20); }
    abort() { this.onend && this.onend(); }
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = Rec;
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('no mic in test'));
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); };

  /* ---------- desktop: welcome + tools ---------- */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  await page.addInitScript(MOCKS);
  await page.goto(BASE + 'student.html'); await page.waitForTimeout(600);
  await page.click('.cmp-launch'); await page.waitForTimeout(1300);
  assert.equal(await page.isVisible('.cwel'), true, 'welcome screen');
  assert.equal(await page.locator('.cwel__grid button').count(), 6, 'six quick actions');
  const box = await page.locator('.cmp').boundingBox();
  assert.ok(box.width >= 560, 'bigger panel: ' + box.width);

  // calculator tool
  await page.fill('#cmpText', 'what is 15% of 240'); await page.press('#cmpText', 'Enter'); await page.waitForTimeout(900);
  assert.match(await page.textContent('#cmpLog'), /= 36/);
  assert.match(await page.textContent('#cmpLog'), /Calculator/, 'tool trace shown');

  // study coach: assignment -> interactive checklist
  await page.fill('#cmpText', 'break down my lab report on enzymes into steps'); await page.press('#cmpText', 'Enter');
  await page.waitForSelector('.ccoach', { timeout: 8000 });
  const steps = await page.locator('.ccoach__list li').count();
  assert.ok(steps >= 3, 'coach steps: ' + steps);
  await page.click('.ccoach__list li:first-child button'); await page.waitForTimeout(300);
  assert.equal(await page.locator('.ccoach__list li.is-done').count(), 1, 'step ticks off');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('erly-coach-v1') || 'null'));
  assert.ok(saved, 'plan saved so the student can resume');

  // memory asks first, and only then remembers
  await page.fill('#cmpText', 'can you explain photosynthesis in simple words'); await page.press('#cmpText', 'Enter');
  await page.waitForSelector('.cmem-ask', { timeout: 8000 });
  assert.notEqual(await page.evaluate(() => ERLY.companion.tools.memory().level), 'simple', 'nothing stored before consent');
  await page.click('.cmem-ask [data-mem="yes"]'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => ERLY.companion.tools.memory().level), 'simple', 'remembers after consent');
  assert.match(await page.evaluate(() => ERLY.companion.tools.memoryPrompt()), /simpl/i, 'memory reaches the AI prompt');

  // resume where I stopped
  await page.fill('#cmpText', 'resume where I stopped'); await page.press('#cmpText', 'Enter'); await page.waitForTimeout(1200);
  assert.match(await page.textContent('#cmpLog'), /lab report|enzymes|step/i, 'resume finds the coach plan');

  // navigation tool
  await page.fill('#cmpText', 'take me to the daily quest'); await page.press('#cmpText', 'Enter');
  await page.waitForURL(/checkins\.html/, { timeout: 8000 });
  await page.close();

  /* ---------- iPad: tap to talk ---------- */
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', viewport: { width: 1024, height: 1366 }, hasTouch: true });
  const ipad = await ctx.newPage(); watch(ipad);
  await ipad.addInitScript(MOCKS);
  await ipad.goto(BASE + 'student.html'); await ipad.waitForTimeout(600);
  await ipad.click('.cmp-launch'); await ipad.waitForTimeout(1200);
  await ipad.click('.cwel__grid [data-q="voice"]'); await ipad.waitForTimeout(400);
  if (await ipad.isVisible('#ncConsent [data-c="yes"]')) await ipad.click('#ncConsent [data-c="yes"]');
  await ipad.waitForTimeout(1500);
  assert.equal(await ipad.getAttribute('.ncall', 'data-s'), 'idle', 'waits for a tap instead of auto-listening');
  assert.equal(await ipad.evaluate(() => window.__recStarts), 0, 'microphone not started without a tap');
  assert.match(await ipad.textContent('#ncState'), /Tap Noor to talk/);
  await ipad.click('#ncOrb'); await ipad.waitForTimeout(300);
  assert.equal(await ipad.getAttribute('.ncall', 'data-s'), 'listening');
  assert.match(await ipad.textContent('#ncYou'), /what is 6\*7/, 'live transcript');
  await ipad.click('#ncOrb'); await ipad.waitForTimeout(1500);
  assert.match(await ipad.textContent('#cmpLog'), /= 42/, 'second tap sends what was heard');

  await browser.close();
  assert.deepEqual(errors, [], 'no page errors');
  console.log('noor tools e2e: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
