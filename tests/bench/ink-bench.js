// Handwriting surface cost per pointer move: the v12–v19 InkPad (repaints every stroke on every move) vs the v20
// layered engine (draws only the stroke in progress on the live layer). Both get the same page: N finished strokes
// of 40 points each, then one new stroke of 120 moves. The rAF callback of the v20 engine is run inside the timed
// region so both numbers include all drawing work for a move.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/bench/ink-bench.js
'use strict';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await p.addInitScript(() => sessionStorage.setItem('acubins-role', 'student'));
  await p.goto('http://localhost:8765/handwriting.html'); await p.addScriptTag({ url: 'assets/js/ink-pad.js' }); await p.waitForTimeout(800);
  const rows = await p.evaluate(async () => {
    const out = [];
    const mk = () => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:640px;z-index:-1'; document.body.appendChild(d); return d; };
    const synth = (el, type, x, y) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'pen', pressure: .5, clientX: r.left + x, clientY: r.top + y, button: 0 })); };
    for (const N of [0, 100, 300, 600]) {
      // old engine
      const h1 = mk(), old = new ERLY.InkPad(h1, {});
      for (let s = 0; s < N; s++) old.strokes.push({ tool: 'pen', ink: 'auto', size: 4, pts: Array.from({ length: 40 }, (_, i) => [(s % 20) * .05 + i * .001, Math.floor(s / 20) * .02 + Math.sin(i) * .005, -1, i]) });
      old.render();
      synth(old.cv, 'pointerdown', 50, 50); let t = performance.now();
      for (let i = 0; i < 120; i++) synth(old.cv, 'pointermove', 50 + i * 4, 50 + Math.sin(i / 5) * 20);
      const oldMs = (performance.now() - t) / 120; synth(old.cv, 'pointerup', 530, 50); h1.remove();
      // new engine
      const h2 = mk(); const pad = ERLY.handCanvas.create(h2, {}); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const vp = h2.querySelector('.hsc__vp');
      for (let s = 0; s < N; s++) { synth(vp, 'pointerdown', (s % 20) * 48, Math.floor(s / 20) * 20 + 10); for (let i = 0; i < 40; i++) synth(vp, 'pointermove', (s % 20) * 48 + i, Math.floor(s / 20) * 20 + 10 + Math.sin(i) * 5); synth(vp, 'pointerup', 0, 0); }
      const raf = window.requestAnimationFrame; let pending = null; window.requestAnimationFrame = f => { pending = f; return 1; };
      synth(vp, 'pointerdown', 50, 50); t = performance.now();
      for (let i = 0; i < 120; i++) { synth(vp, 'pointermove', 50 + i * 4, 50 + Math.sin(i / 5) * 20); if (pending) { const f = pending; pending = null; f(performance.now()); } }
      const newMs = (performance.now() - t) / 120; window.requestAnimationFrame = raf; synth(vp, 'pointerup', 530, 50);
      out.push({ strokes: N, strokesStored: pad.strokes.length, oldMs: +oldMs.toFixed(3), newMs: +newMs.toFixed(3) }); pad.destroy(); h2.remove();
    }
    return out;
  });
  console.log('finished strokes on the page | v19 InkPad ms/move | v20 engine ms/move');
  for (const r of rows) console.log(`${String(r.strokes).padStart(5)} (${r.strokesStored} stored) | ${String(r.oldMs).padStart(8)} | ${String(r.newMs).padStart(8)}`);
  await b.close();
})();
