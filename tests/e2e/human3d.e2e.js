// End-to-end check of the 3D digital humans (three.js + Rocketbox models).
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/human3d.e2e.js
// Uses software WebGL (SwiftShader), so frame rates here are NOT representative of real devices.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const PEOPLE = 'karim m,layla f,hart m,grace f,kwame m,kenji m,drsami m,dramira f,zara f,omar m,mei f,noura f,faisal m,sofia f'.split(',').map(x => x.split(' '));

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver|Failed to load resource/.test(m.text())) errors.push(m.text()); }); };

  /* ---------- every person loads with a full face rig ---------- */
  for (const [id, g] of (process.env.QUICK ? PEOPLE.slice(0, 3) : PEOPLE)) {
    const p = await browser.newPage({ viewport: { width: 480, height: 360 } }); watch(p);
    await p.goto(`${BASE}tests/fixtures/human3d.html?m=${id}&g=${g}&env=minimal`);
    await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
    assert.equal(await p.evaluate(() => window.err || null), null, id + ' loads');
    const w = await p.evaluate(() => Object.keys(window.ctrl.weights()));
    assert.ok(w.filter(n => n.startsWith('viseme_')).length >= 12, id + ' has viseme blendshapes');
    for (const n of ['jawOpen', 'eyeBlinkLeft', 'mouthSmileLeft', 'browInnerUp']) assert.ok(w.includes(n), id + ' has ' + n);
    await p.close();
  }

  /* ---------- body language, lips, eyes ---------- */
  const p = await browser.newPage({ viewport: { width: 900, height: 600 } }); watch(p);
  await p.goto(`${BASE}tests/fixtures/human3d.html?m=karim&g=m&env=classroom`);
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  const r = await p.evaluate(async () => {
    const c = window.ctrl, out = {}, wait = ms => new Promise(res => setTimeout(res, ms));
    c.greet(); await wait(200); out.greet = c.clip();
    c.setState('listening'); await wait(5500); out.listen = c.clip(); // the wave finishes first, then the listening pose
    c.setState('thinking'); await wait(300); out.think = c.clip();
    // speaking with an enthusiastic tone → expressive talking gestures
    c.emote('enthusiastic'); c.setState('speaking');
    const text = 'Congratulations, that is a really brilliant result for your whole team!';
    const words = text.split(' '); let ci = 0; const bounds = [];
    c.say('start', text, 1, null, 'enthusiastic');
    const lat = [];
    for (const wd of words) {
      const at = ci; ci += wd.length + 1;
      const t0 = performance.now(); c.say('boundary', at);
      // how long until the lips visibly move for this word?
      let opened = null;
      for (let k = 0; k < 20 && opened == null; k++) { await wait(16); const w = c.weights(); const v = Math.max(...Object.entries(w).filter(([n]) => n.startsWith('viseme_')).map(([, x]) => x)); if (v > 0.25) opened = performance.now() - t0; }
      if (opened != null) lat.push(opened);
      await wait(200);
    }
    out.talk = c.clip(); out.lat = lat;
    out.smile = c.weights().mouthSmileLeft;
    c.say('end'); c.setState('idle'); await wait(700);
    out.rest = Math.max(...Object.entries(c.weights()).filter(([n]) => n.startsWith('viseme_') || n === 'jawOpen').map(([, x]) => x));
    // calm tone → relaxed gestures
    c.emote('reassuring'); c.say('start', 'Take your time, it is completely normal.', 1, null, 'reassuring'); await wait(400); out.calm = c.clip(); c.say('end'); c.setState('idle');
    // blinking happens on its own
    let blinked = false; for (let k = 0; k < 120 && !blinked; k++) { await wait(50); blinked = c.weights().eyeBlinkLeft > 0.7; } out.blink = blinked;
    // every environment renders
    for (const e of ['classroom', 'lecture', 'study', 'lab', 'clinic', 'library', 'studio', 'minimal']) { c.setEnv(e); await wait(100); if (c.env() !== e) out.envFail = e; }
    out.history = c.history().join(' ');
    return out;
  });
  assert.equal(r.greet, 'wave_01', 'greets with a wave');
  assert.equal(r.listen, 'listen_neutral_01', 'attentive listening pose');
  assert.equal(r.think, 'thoughtful_01', 'thoughtful while thinking');
  assert.match(r.talk, /talk_excited|presentation/, 'enthusiastic → expressive talking gestures: ' + r.talk);
  assert.match(r.calm, /talk_relaxed/, 'reassuring → relaxed gestures: ' + r.calm);
  assert.ok(r.smile > 0.2, 'smiles while enthusiastic: ' + r.smile);
  assert.ok(r.lat.length >= 10, 'lips move on (nearly) every word: ' + r.lat.length + '/12');
  const med = r.lat.slice().sort((a, b) => a - b)[Math.floor(r.lat.length / 2)];
  assert.ok(med < 200, 'lip-sync latency (median) under 200 ms even on software WebGL: ' + med.toFixed(0));
  assert.ok(r.rest < 0.06, 'mouth returns to rest: ' + r.rest);
  assert.equal(r.blink, true, 'blinks');
  assert.equal(r.envFail, undefined, 'all environments');
  console.log('measured lip-sync latency, median', med.toFixed(0), 'ms, max', Math.max(...r.lat).toFixed(0), 'ms over', r.lat.length, 'words (software WebGL)');
  await p.close();

  /* ---------- the full app: immersive layout + environment switch ---------- */
  const app = await browser.newPage({ viewport: { width: 1280, height: 800 } }); watch(app);
  await app.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    localStorage.setItem('erly-companion-v1', JSON.stringify({ consent: { mic: true }, prefs: { vs: { setup: true, avatar: 'layla', env: 'library', handsFree: false } } }));
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const synth = { getVoices: () => [], cancel() {}, pause() {}, resume() {}, addEventListener() {}, speak(u) { setTimeout(() => { u.onstart && u.onstart({}); setTimeout(() => u.onend && u.onend({}), 300); }, 5); } };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start() {} stop() {} abort() {} };
  });
  await app.goto(BASE + 'student.html'); await app.waitForTimeout(600);
  await app.evaluate(() => ERLY.emit('noor:call'));
  await app.waitForSelector('.ncall .avt--3d.is-ready', { timeout: 120000 });
  assert.equal(await app.evaluate(() => document.querySelector('.ncall').classList.contains('is-3d')), true, 'immersive 3D layout');
  assert.equal(await app.getAttribute('.ncall .h3d', 'data-env'), 'library', 'chosen environment');
  const stage = await app.locator('.ncall .h3d__av').boundingBox();
  assert.ok(stage.width >= 1280 * 0.95 && stage.height >= 800 * 0.95, 'the person fills the screen');
  await app.click('#ncSet'); await app.click('.nstudio [data-tab="look"]');
  await app.click('.nstudio [data-opt="env:lab"]'); await app.waitForTimeout(300);
  assert.equal(await app.getAttribute('.ncall .h3d', 'data-env'), 'lab', 'environment switches live');
  await app.click('.nstudio [data-st="close"]'); await app.waitForTimeout(300);
  await app.click('#ncEnd');

  await browser.close();
  assert.deepEqual(errors, [], 'no page errors');
  console.log('3D humans e2e: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
