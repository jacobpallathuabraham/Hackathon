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
  // a voice that reports word boundaries like Chrome/Edge/Safari do (70 ms a word)
  const VOICES = [['Microsoft Ava Online (Natural) - English (United States)', 'en-US'], ['Microsoft Andrew Online (Natural) - English (United States)', 'en-US'], ['Daniel', 'en-GB']].map(([name, lang]) => ({ name, lang, localService: false, voiceURI: name }));
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  window.__said = [];
  const synth = { speaking: false, getVoices: () => VOICES, pause() {}, resume() {}, addEventListener() {}, cancel() { synth.gen = (synth.gen || 0) + 1; },
    speak(u) { const g = synth.gen; window.__said.push({ text: u.text, voice: u.voice && u.voice.name, rate: u.rate, pitch: u.pitch }); setTimeout(() => { if (g !== synth.gen) return; u.onstart && u.onstart({}); let ci = 0; u.text.split(' ').forEach((w, k) => { const at = ci; setTimeout(() => { if (g === synth.gen) u.onboundary && u.onboundary({ name: 'word', charIndex: at }); }, k * 70); ci += w.length + 1; }); setTimeout(() => { if (g === synth.gen) u.onend && u.onend({}); }, u.text.split(' ').length * 70 + 40); }, 5); } };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  // like Safari: results stay interim, and listening ends only when stop() is called
  window.__recStarts = 0;
  class Rec {
    start() { window.__recStarts++; if (window.__recDead) return; setTimeout(() => this.onstart && this.onstart(), 10); setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'what is 6*7' }], { isFinal: false })] }), 60); }
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
  assert.equal(await page.locator('.cwel__grid button').count(), 8, 'eight quick actions (incl. visuals and audio lessons)');
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

  /* ---------- voice mode: first-time setup, avatar, voice, lip-sync, transcript ---------- */
  await page.click('#cmpVoice'); await page.waitForSelector('.nstudio.is-in');
  assert.equal(await page.locator('.nstudio [data-av]').count(), 22, '14 3D digital humans + 2 photo portraits + 6 illustrated');
  await page.click('.nstudio [data-av="karim"]'); await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => ERLY.companion._ui.store.prefs().vs.avatar), 'karim');
  assert.equal(await page.evaluate(() => ERLY.companion._ui.store.prefs().voices.en), 'Microsoft Andrew Online (Natural) - English (United States)', 'a male companion gets a male voice');
  await page.click('.nstudio [data-step="1"]');
  await page.waitForSelector('.nstudio .nstudio__vc');
  const cards = await page.locator('.nstudio .nstudio__vmain').count();
  assert.equal(cards, 3, 'one profile per real voice on the device (3 mocked voices): ' + cards);
  assert.match(await page.textContent('.nstudio__vlib'), /Uses: Daniel/, 'each card says which device voice it uses');
  assert.match(await page.textContent('.nstudio__missing summary'), /aren’t on this device/, 'unavailable voices are listed separately');
  await page.click('.nstudio [data-vcat="f"]'); await page.waitForTimeout(150);
  assert.equal(await page.locator('.nstudio .nstudio__vmain').count(), 1, 'female filter');
  await page.click('.nstudio [data-vcat="all"]'); await page.waitForTimeout(150);
  await page.fill('#nsSearch', 'brit'); await page.dispatchEvent('#nsSearch', 'input'); await page.waitForTimeout(150);
  assert.equal(await page.locator('.nstudio .nstudio__vmain').count(), 1, 'search');
  await page.fill('#nsSearch', ''); await page.dispatchEvent('#nsSearch', 'input'); await page.waitForTimeout(150);
  // preview without choosing: the sample really uses that voice
  await page.click('.nstudio .nstudio__vc:has-text("Amber") [data-play]'); await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__said[window.__said.length - 1].voice), 'Microsoft Ava Online (Natural) - English (United States)', 'preview plays the real voice');
  assert.match(await page.evaluate(() => ERLY.companion._ui.store.prefs().voices.en), /Andrew/, 'preview does not change the choice');
  await page.click('.nstudio .nstudio__vc:has-text("Harbor") .nstudio__vmain'); await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => ERLY.companion._ui.store.prefs().voices.en), 'Daniel', 'choosing a profile switches the voice');
  assert.equal(await page.evaluate(() => window.__said[window.__said.length - 1].voice), 'Daniel');
  await page.click('.nstudio .nstudio__vc:has-text("Harbor") [data-fav]'); await page.waitForTimeout(150);
  await page.click('.nstudio [data-vcat="fav"]'); await page.waitForTimeout(150);
  assert.equal(await page.locator('.nstudio .nstudio__vmain').count(), 1, 'favourites');
  await page.fill('.nstudio [data-range="rate"]', '1.2'); await page.dispatchEvent('.nstudio [data-range="rate"]', 'input');
  await page.click('.nstudio [data-step="1"]'); await page.waitForTimeout(200);
  await page.click('.nstudio [data-preset="expert"]'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => ERLY.companion._ui.store.prefs().vs.style), 'concise', 'personality preset');
  await page.click('.nstudio [data-step="1"]'); await page.waitForTimeout(400);
  assert.equal(await page.isVisible('.nstudio'), false, 'setup closes');
  const stageAv = await page.getAttribute('.ncall .avt', 'data-avatar');
  assert.ok(['karim', 'karim2d', 'omar'].includes(stageAv), 'chosen avatar on stage (or its 2D fallback without WebGL 2): ' + stageAv);
  if (await page.isVisible('#ncConsent [data-c="yes"]')) await page.click('#ncConsent [data-c="yes"]');
  // the mouth moves while Noor speaks, and rests when she stops
  let maxOpen = 0, shapes = new Set();
  for (let k = 0; k < 30; k++) { const m = await page.evaluate(() => { const a = ERLY.companion.call.avatar(); return a ? a.shape() : { o: 0, w: 0 }; }); maxOpen = Math.max(maxOpen, m.o); shapes.add(m.o.toFixed(1) + m.w.toFixed(1)); await page.waitForTimeout(40); }
  assert.ok(maxOpen > 0.3, 'lips open while speaking: ' + maxOpen);
  assert.ok(shapes.size > 4, 'different mouth shapes: ' + shapes.size);
  const rates = await page.evaluate(() => window.__said.slice(-4).map(x => x.rate)); assert.ok(rates.some(r => r > 1.04), 'speed setting applied: ' + rates);
  assert.match(await page.evaluate(() => ERLY.companion.tools.memoryPrompt()), /short and to the point[\s\S]*Focus mode/, 'style and mode reach the AI prompt');
  await page.waitForFunction(() => /listening|hearing/.test(document.querySelector('.ncall').dataset.s), null, { timeout: 15000 });
  assert.ok((await page.evaluate(() => ERLY.companion.call.avatar().shape().o)) < 0.05, 'mouth at rest while listening');
  assert.equal(await page.isVisible('#ncLive.is-on'), true, 'mic-on light while listening');
  // emotional delivery: a celebration sounds brighter than a plain sentence, and the face follows
  await page.evaluate(() => { window.__said.length = 0; ERLY.emit('noor:said', { text: 'Congratulations, you did it! The answer is in chapter two.', speak: true }); });
  await page.waitForFunction(() => window.__said.some(x => /chapter two/.test(x.text)), null, { timeout: 8000 });
  const tones = await page.evaluate(() => [window.__said.find(x => /Congratulations/.test(x.text)), window.__said.find(x => /chapter two/.test(x.text))]);
  assert.ok(tones[0].pitch > tones[1].pitch + 0.03 && tones[0].rate > tones[1].rate, 'celebration is brighter: ' + JSON.stringify(tones));
  await page.click('#ncOrb'); await page.waitForTimeout(150);
  // language switch without restarting the conversation
  await page.click('#ncLang'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => I18N.lang), 'ar');
  assert.equal(await page.isVisible('.ncall'), true, 'still in the conversation');
  await page.click('#ncLang'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => I18N.lang), 'en');
  // typing inside voice mode + transcript
  await page.click('#ncType'); await page.fill('#ncInput', 'what is 9*9'); await page.press('#ncInput', 'Enter');
  await page.waitForFunction(() => /81/.test(document.querySelector('#cmpLog').textContent), null, { timeout: 8000 });
  await page.click('#ncLogBtn'); await page.waitForTimeout(400);
  assert.match(await page.textContent('#ncLogList'), /You[\s\S]*what is 9\*9[\s\S]*(Karim|Omar)/, 'transcript with speakers');
  await page.click('[data-lg="close"]');
  // interrupting: tap while Noor speaks stops her at once
  await page.evaluate(() => ERLY.emit('noor:said', { text: 'This is a very long answer that keeps going and going so that we can interrupt it in the middle of a sentence.', speak: true }));
  await page.waitForTimeout(250);
  assert.equal(await page.getAttribute('.ncall', 'data-s'), 'speaking', 'speaking: ' + JSON.stringify(await page.evaluate(() => [document.querySelector('.ncall').dataset.s, ERLY.companion.call.state()])));
  await page.click('#ncOrb'); await page.waitForTimeout(150);
  assert.match(await page.getAttribute('.ncall', 'data-s'), /listening|hearing/, 'interrupt → listening');
  // pause: nothing listens
  await page.click('#ncPause'); await page.waitForTimeout(150);
  assert.equal(await page.getAttribute('.ncall', 'data-s'), 'paused');
  assert.equal(await page.isVisible('#ncLive.is-on'), false, 'mic light off when paused');
  await page.click('#ncPause'); await page.waitForTimeout(150);
  await page.click('#ncEnd'); await page.waitForTimeout(500);

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
  if (await ipad.isVisible('[data-setup="skip"]')) await ipad.click('[data-setup="skip"]');
  if (await ipad.isVisible('#ncConsent [data-c="yes"]')) await ipad.click('#ncConsent [data-c="yes"]');
  await ipad.waitForTimeout(1800);
  // the "Allow" tap lets Safari start the microphone straight after the greeting — no extra tap
  await ipad.waitForFunction(() => /listening|hearing/.test(document.querySelector('.ncall').dataset.s), null, { timeout: 10000 }); // hands-free after the Allow tap
  await ipad.waitForFunction(() => /what is 6\*7/.test(document.querySelector('#ncYou').textContent), null, { timeout: 5000 }).catch(() => {});
  assert.match(await ipad.textContent('#ncYou'), /what is 6\*7/, 'live transcript');
  await ipad.click('#ncOrb'); await ipad.waitForTimeout(1500);
  assert.match(await ipad.textContent('#cmpLog'), /= 42/, 'tap sends what was heard');
  // if Safari refuses to start the mic without a tap, Noor falls back to tap-to-talk
  await ipad.evaluate(() => { window.__recDead = true; });
  await ipad.waitForFunction(() => document.querySelector('.ncall').dataset.s === 'idle', null, { timeout: 12000 });
  assert.match(await ipad.textContent('#ncState'), /Tap to talk/);
  await ipad.evaluate(() => { window.__recDead = false; });
  await ipad.click('#ncOrb'); await ipad.waitForTimeout(300);
  assert.match(await ipad.getAttribute('.ncall', 'data-s'), /listening|hearing/, 'tap starts listening');

  await browser.close();
  assert.deepEqual(errors, [], 'no page errors');
  console.log('noor tools e2e: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
