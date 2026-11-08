// The v8 digital human (MPFB/CC0 model + TalkingHead animation) through the Avatar Lab diagnostics page:
// rig, lip-sync timing at three speeds, mouth closes after speech and on interruption, expressions,
// gestures, eye blinks/saccades, environments, and phone layout.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/avatar-lab.e2e.js
// Software WebGL (SwiftShader) here — frame rates are NOT representative of real GPUs.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const OUT = process.env.SHOTS || '/tmp';

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver|Failed to load resource/.test(m.text())) errors.push(m.text()); }); };
  // timing tests run in a small window: software WebGL is CPU-bound, so fewer pixels = more frames (closer to a real GPU)
  const p = await browser.newPage({ viewport: { width: 760, height: 560 } }); watch(p);
  const t0 = Date.now();
  await p.goto(BASE + 'avatar-lab.html');
  await p.waitForFunction(() => window.labReady, null, { timeout: 120000 });
  const loadS = (Date.now() - t0) / 1000;
  const rig = await p.evaluate(() => { const w = ctrl.weights(); return { vis: Object.keys(w).filter(n => n.startsWith('viseme_')).length, arkit: ['jawOpen', 'eyeBlinkLeft', 'eyeBlinkRight', 'mouthSmileLeft', 'browInnerUp', 'eyeLookOutLeft', 'mouthFunnel', 'mouthPucker', 'cheekSquintLeft'].every(n => n in w), engine: ctrl.engine, load: ctrl.loadMs }; });
  assert.equal(rig.engine, 'digital-human');
  assert.ok(rig.vis >= 14, 'the 14 speaking Oculus visemes are present — “sil” is the rest pose (' + rig.vis + ')');
  assert.ok(rig.arkit, 'ARKit face shapes present');

  // lip-sync at three speaking rates, four phonetic cases
  const rows = await p.evaluate(() => window.runLipTest());
  rows.forEach(r => {
    assert.equal(r.scheduled, r.words, `${r.name} @${r.rate}: visemes scheduled for every word (${r.scheduled}/${r.words})`);
    assert.ok(r.peak >= 0 && r.peak <= 40, `${r.name} @${r.rate}: first viseme peaks ${r.peak} ms after the word event`);
    assert.ok(r.closed, `${r.name} @${r.rate}: mouth closed after speech`);
  });
  const ratio = rows.reduce((a, r) => a + r.clockMs, 0) / rows.reduce((a, r) => a + r.realMs, 0);
  assert.ok(Math.abs(ratio - 1) < 0.03, `animation clock runs in real time over ${rows.length} sentences (×${ratio.toFixed(3)}) — lips cannot drift from the audio`);
  // informative only: what a ~4 fps software renderer actually shows (real GPUs render 30–60+ fps)
  const lat = rows.flatMap(r => (r.med != null ? [r.med] : [])).sort((a, b) => a - b);
  const med = lat.length ? lat[Math.floor(lat.length / 2)] : null;
  const seen = rows.reduce((a, r) => a + r.moved, 0), words = rows.reduce((a, r) => a + r.words, 0);

  // bilabials close the lips (PP), and the mouth stays shut while listening
  // (sampled once per rendered frame — software WebGL renders few frames, so peaks can be missed; the schedule is checked too)
  const pp = await p.evaluate(async () => {
    const h = ctrl.head; ctrl.say('start', 'Bob bought a big map.', 1); ctrl.say('boundary', 0);
    const sched = h.animQueue.filter(x => x.template && x.template.name === 'viseme' && x.vs.viseme_PP).map(x => x.vs.viseme_PP[1]);
    ctrl.say('end');
    let maxPP = 0; const sp = window.speakSim('Bob bought a big map.', 0.7); let on = true; const f = () => { maxPP = Math.max(maxPP, h.mtAvatar.viseme_PP.value || 0); if (on) requestAnimationFrame(f); }; requestAnimationFrame(f); await sp; on = false;
    return { sched, maxPP };
  });
  assert.ok(pp.sched.length >= 2 && pp.sched.every(v => v >= 0.9), '“Bob” schedules two closed-lip PP visemes at full strength');
  assert.ok(pp.maxPP > 0.3, 'P/B/M visibly close the lips (' + pp.maxPP.toFixed(2) + ')');

  // interruption: the mouth returns to rest immediately
  const intr = await p.evaluate(async () => { window.speakSim('This is a long explanation that the student will interrupt halfway through the sentence.', 1); await new Promise(r => setTimeout(r, 700)); document.getElementById('stop').click(); await new Promise(r => setTimeout(r, 400)); const w = ctrl.weights(); return { q: ctrl.pendingVisemes(), open: Math.max(...Object.entries(w).filter(([n]) => n.startsWith('viseme_') && n !== 'viseme_sil').map(([, v]) => v), w.jawOpen || 0) }; });
  assert.equal(intr.q, 0, 'interrupt clears the queued visemes');
  assert.ok(intr.open < 0.12, 'mouth at rest within 400 ms of an interruption (' + intr.open.toFixed(2) + ')');

  // expressions follow the assistant's tone (subtle values, not exaggerated)
  // (targets are checked exactly; the eased value is checked to be on its way — software WebGL renders few frames)
  const ex = await p.evaluate(async () => { const r = {}; const M = ctrl.head.mtAvatar; for (const t of ['curious', 'serious', 'reassuring', 'surprised']) { ctrl.emote(t); ctrl.setState('speaking'); await new Promise(res => setTimeout(res, 2500)); const f = n => M[n].fixed || 0; r[t] = { up: f('browOuterUpLeft'), down: f('browDownLeft'), inner: f('browInnerUp'), wide: f('eyeWideLeft'), moved: ['browOuterUpLeft', 'browDownLeft', 'browInnerUp', 'eyeWideLeft'].map(n => f(n) ? +M[n].value.toFixed(3) : null) }; } ctrl.setState('idle'); await new Promise(res => setTimeout(res, 300)); r.released = ['browOuterUpLeft', 'browDownLeft', 'browInnerUp', 'eyeWideLeft'].every(n => M[n].fixed === null); return r; });
  assert.ok(ex.curious.up > 0.15, 'curious raises the brows');
  assert.ok(ex.serious.down > 0.08 && ex.serious.up === 0, 'serious lowers the brows');
  assert.ok(ex.reassuring.inner > 0.12, 'reassuring lifts the inner brows');
  assert.ok(ex.surprised.wide > 0.1 && ex.surprised.up > 0.3, 'surprised widens the eyes');
  assert.ok(['curious', 'serious', 'reassuring', 'surprised'].every(k => ex[k].moved.some(v => v > 0.005)), 'the face eases towards each expression (TalkingHead clamps its smoothing step to 2 frames, so easing is slow at software-render frame rates)');
  assert.ok(['curious', 'serious', 'reassuring', 'surprised'].every(k => Math.max(ex[k].up, ex[k].down, ex[k].inner, ex[k].wide) <= 0.6), 'expressions stay subtle');
  assert.ok(ex.released, 'back to natural idle motion when the turn ends');

  // gestures chosen from meaning
  const g = await p.evaluate(async () => { const out = []; for (const s of ['Hello, welcome to ERLY!', 'First, notice the key idea.', 'On the other hand, compared with steel…', 'It depends on the material.', 'Exactly right — well done!']) { await new Promise(r => setTimeout(r, 3700)); ctrl.say('start', s, 1); ctrl.say('end'); } await new Promise(r => setTimeout(r, 300)); return ctrl.history(); });
  assert.deepEqual(g.slice(-5), ['handup', 'index', 'side', 'shrug', 'thumbup'], 'greeting → raised hand, counting → index, comparison → side, uncertainty → shrug, praise → thumbs-up');

  // blinking and eye movement happen on their own
  const eyes = await p.evaluate(async () => { let blink = 0, look = 0; for (let k = 0; k < 160; k++) { await new Promise(r => setTimeout(r, 40)); const w = ctrl.weights(); blink = Math.max(blink, w.eyeBlinkLeft || 0); look = Math.max(look, w.eyeLookOutLeft || 0, w.eyeLookInLeft || 0, w.eyeLookUpLeft || 0, w.eyeLookDownLeft || 0); } return { blink, look }; });
  assert.ok(eyes.blink > 0.6, 'blinks'); assert.ok(eyes.look > 0.02, 'eyes move (saccades / gaze)');

  // every environment
  for (const e of ['portrait', 'campus', 'classroom', 'lecture', 'library', 'studio', 'minimal']) { await p.evaluate(e => ctrl.setEnv(e), e); assert.equal(await p.evaluate(() => ctrl.env()), e); }
  await p.evaluate(() => ctrl.setEnv('portrait'));
  const fps = await p.evaluate(() => ctrl.fps());
  await p.evaluate(() => { ctrl.emote('enthusiastic'); window.speakSim('First, notice that the gradient points uphill.', 1); });
  await p.waitForTimeout(700);
  const big = await browser.newPage({ viewport: { width: 1400, height: 900 } }); watch(big);
  await big.goto(BASE + 'avatar-lab.html'); await big.waitForFunction(() => window.labReady, null, { timeout: 120000 });
  await big.evaluate(() => { ctrl.emote('enthusiastic'); window.speakSim('First, notice that the gradient points uphill.', 1); }); await big.waitForTimeout(900);
  await big.screenshot({ path: OUT + '/lab-desktop.png' });

  // visual engine from the lab
  await p.click('#vgo'); await p.waitForTimeout(1500);
  assert.equal(await p.locator('#vhost .vz').count(), 1, 'visual engine renders from the lab');
  await p.evaluate(() => document.querySelector('#vhost .vz [data-v="close"]').click());

  // phone layout: the person stays in frame
  await p.close(); await big.close(); // one software-rendered page at a time
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); watch(m);
  await m.goto(BASE + 'avatar-lab.html'); await m.waitForFunction(() => window.labReady, null, { timeout: 120000 }); await m.waitForTimeout(1500);
  await m.screenshot({ path: OUT + '/lab-phone.png', timeout: 120000 });

  assert.deepEqual(errors, [], 'no page errors');
  console.log(JSON.stringify({ pageLoadS: loadS, modelLoadMs: Math.round(rig.load), schedPeakMs: rows.map(r => Math.round(r.peak)), clockRatio: +ratio.toFixed(3), swFramesSeenMoving: `${seen}/${words}`, swFrameLatencyMedianMs: med && Math.round(med), swiftshaderFps: +fps.toFixed(1) }));
  console.log('digital human (avatar lab) e2e: all checks passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
