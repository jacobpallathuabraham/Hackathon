// Learning Studio performance probe: opens the 3D/animated pages in Chromium and records, for each, the measured frame rate,
// the mean CPU time spent issuing a frame's render calls, the JS heap, and whether background loops stop when idle.
// Headless Chromium renders WebGL in SOFTWARE (SwiftShader), so frame rates here are far below a GPU-equipped device; the
// CPU-side render time per frame is the comparable number. Writes docs/bench/studio-perf.json.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tools/perf-studio.js
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); } catch (e) { /* */ } });
  const rows = [];
  for (const [name, route, get] of [['Home (universe + solar system)', 'home', 'LS.__homeSpace && LS.__homeSpace.fps()'], ['Solar System Explorer', 'space', 'LS.__space && LS.__space.fps()'], ['Rotation Lab', 'exp/rotation-lab', 'LS.exp.live._fps()'], ['Counting Studio', 'exp/counting-studio', 'LS.exp.live._fps()'], ['Probability Lab', 'exp/probability-lab', 'LS.exp.live._fps()']]) {
    const p = await ctx.newPage(); await p.goto(BASE + 'learn.html#/' + route); await p.waitForTimeout(7000);
    if (route === 'home') { await p.evaluate(() => { const h = document.querySelector('.uv-space__host'); h && h.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(6000); }
    if (route === 'exp/rotation-lab') await p.evaluate(() => LS.exp.live._set({ spin: true }));
    await p.waitForTimeout(4000);
    const r = await p.evaluate(async () => { const S = [...(LS.__scenes || [])].filter(x => x.alive && x.visible)[0]; const b = S ? await S.bench(4000) : null;
      return { scenes: (LS.__scenes || new Set()).size, bench: b, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }; });
    // idle check: a lab with nothing moving should stop requesting frames. The subject's ambient background (ls-worlds, 30 fps,
    // switchable off in Accessibility → Motion, off under reduced motion) is a deliberate animation, so it is measured separately.
    let idle = null, idleNoAmbient = null;
    const countRaf = () => p.evaluate(async () => { let n = 0; const orig = window.requestAnimationFrame; window.requestAnimationFrame = f => { n++; return orig(f); }; await new Promise(z => setTimeout(z, 1500)); window.requestAnimationFrame = orig; return n; });
    if (route.startsWith('exp/') && route !== 'exp/rotation-lab') { idle = await countRaf(); await p.evaluate(() => LS.worlds && LS.worlds.setMode('off')); await p.waitForTimeout(300); idleNoAmbient = await countRaf(); }
    rows.push(Object.assign({ name, route, rafCallsIn1_5sWhenIdle: idle, rafCallsIn1_5sWhenIdleAmbientOff: idleNoAmbient }, r)); console.log(name, JSON.stringify(r), idle == null ? '' : 'rAF while idle: ' + idle + ' (ambient off: ' + idleNoAmbient + ')'); await p.close();
  }
  await b.close();
  fs.mkdirSync(path.join(__dirname, '../docs/bench'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../docs/bench/studio-perf.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), note: 'Headless Chromium, software WebGL (SwiftShader). fps is not representative of GPU devices; bench = 4 s of forced continuous rendering of the visible 3D scene; meanMs/medianMs/p95Ms are CPU time per frame (renderer.render) under software GL.', rows }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
