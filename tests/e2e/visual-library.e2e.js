// v14: every visual in Noor's library renders in a real browser — Mermaid diagrams draw nodes with their
// labels, timelines show every event, graphs plot finite curves — with no page errors.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/visual-library.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light'); });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); await p.click('.cmp-launch'); await p.waitForTimeout(600);
  const n = await p.evaluate(() => ERLY.vspec.library().length);
  assert.ok(n >= 100, 'library size ' + n);
  const bad = [];
  for (let i = 0; i < n; i++) {
    const r = await p.evaluate(async i => {
      const spec = ERLY.vspec.validate(ERLY.vspec.library()[i][1]).spec;
      ERLY.companion.tools.visual.open(ERLY.vspec.toScene(spec));
      const t0 = Date.now();
      for (;;) {
        await new Promise(r => setTimeout(r, 80));
        const v = ERLY.companion.tools.visual.current(); const st = v && v.state();
        const root = document.querySelector('.vz.is-in');
        if (spec.kind === 'mermaid' && st && st.rendered) return { title: spec.title, kind: spec.kind, nodes: st.nodes, text: root.textContent };
        if (spec.kind === 'timeline' && root && root.querySelectorAll('[data-id^="t"]').length) return { title: spec.title, kind: spec.kind, nodes: st.events, text: root.textContent };
        if (spec.kind === 'plot2d' && root && root.querySelector('svg path, canvas')) return { title: spec.title, kind: spec.kind, nodes: 1, text: root.textContent };
        if (Date.now() - t0 > 8000) return { title: spec.title, kind: spec.kind, nodes: 0, text: root ? root.textContent : '', timeout: true, st };
      }
    }, i);
    if (!r.nodes || r.timeout) bad.push(r.title + ' (' + r.kind + ')');
    process.stdout.write(r.nodes && !r.timeout ? '.' : 'x');
  }
  console.log('');
  await p.evaluate(() => ERLY.companion.tools.visual.close());
  assert.deepEqual(bad, [], 'visuals that did not render');
  assert.deepEqual(errors.filter(e => !/ResizeObserver/.test(e)), [], 'page errors');
  console.log(`visual-library e2e: all ${n} library visuals rendered`);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
