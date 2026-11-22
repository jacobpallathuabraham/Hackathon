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
  await ctx.addInitScript(() => { try { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); localStorage.setItem('erly-cosmos', 'gl'); /* measure the 3D universe even on this software renderer */ } catch (e) { /* */ } });
  const rows = [];
  // the cinematic universe (#/home): measured at three points of the journey, with every world built
  { const p = await ctx.newPage(); await p.goto(BASE + 'learn.html#/home'); await p.waitForFunction(() => window.LS && LS.__cosmos && LS.__cosmos.stats().astronaut, null, { timeout: 90000 }); await p.evaluate(() => LS.__cosmos.buildAll());
    for (const [label, k] of [['opening (scene 0)', 0], ['Geography world (scene 7)', 7], ['overview, all worlds (scene 14)', 14]]) {
      await p.evaluate(k => { const t = document.querySelector('.cz-track'), r = t.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + k / 14 * (r.height - innerHeight) + 1, behavior: 'instant' }); LS.__cosmos.jump(k); }, k); await p.waitForTimeout(2500);
      await p.evaluate(() => LS.__cosmos.resetStats()); await p.waitForTimeout(5000);
      const s = await p.evaluate(() => Object.assign(LS.__cosmos.stats(), { heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }));
      rows.push({ name: 'Cinematic universe — ' + label, route: 'home', fps: +s.fps.toFixed(1), cpuMedianMs: +s.cpuMedian.toFixed(2), cpuP95Ms: +s.cpuP95.toFixed(2), dpr: s.dpr, tier: s.tier, drawCalls: s.draws, triangles: s.tris, heapMB: s.heapMB }); console.log(JSON.stringify(rows[rows.length - 1])); }
    await p.close(); }
  for (const [name, route, get] of [['Solar System Explorer', 'space', 'LS.__space && LS.__space.fps()'], ['Rotation Lab', 'exp/rotation-lab', 'LS.exp.live._fps()'], ['Counting Studio', 'exp/counting-studio', 'LS.exp.live._fps()'], ['Probability Lab', 'exp/probability-lab', 'LS.exp.live._fps()']]) {
    const p = await ctx.newPage(); await p.goto(BASE + 'learn.html#/' + route); await p.waitForTimeout(7000);
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
