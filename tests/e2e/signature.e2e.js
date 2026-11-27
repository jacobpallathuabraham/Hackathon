// Signature interactions (v42): scroll-to-unfold/transform sections on real chapter pages, the living timeline, the
// chapter path rail, the Δv construction and Knowledge Map path drawing. Checks forward, backward and flung scrolling,
// manual control, reduced motion, phone width, resizing, leaving the page (3D cleanup) and page errors.
//   python3 -m http.server 8765 &   then   node tests/e2e/signature.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
const SCENES = [['b-cells', 'cell', 7], ['c-bonding', 'molecule', 5], ['m-geometry', 'solid', 5], ['g-tectonics', 'earth', 6]];

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  const mk = async (o = {}) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1360, height: 900 } }, o)); await ctx.addInitScript(() => { try { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); } catch (e) { /* about:blank */ } }); return ctx; };
  const ctx = await mk(); let p = null;
  const fresh = async (c = ctx) => { if (p) await p.close().catch(() => {}); p = await c.newPage(); p.setDefaultTimeout(40000); p.on('pageerror', e => errs.push(p.url() + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR|Failed to load resource/.test(m.text())) errs.push(p.url() + ' ' + m.text()); }); };
  const go = async (r, sel, c) => { await fresh(c); await p.goto(BASE + 'learn.html#/' + r); await p.waitForSelector('#lsView ' + sel, { timeout: 40000 }); await p.waitForTimeout(800); };
  const sec = k => `#lsView [data-sg-kind="${k}"]`;
  const scrollTo = (k, f) => p.evaluate(([s, f0]) => { const el = document.querySelector(s), r = el.getBoundingClientRect(), top = r.top + scrollY; scrollTo(0, top + r.height * f0 - innerHeight * 0.55); }, [sec(k), f]);
  const prog = k => p.evaluate(s => { const el = document.querySelector(s); return el._sg && el._sg._sc() ? { p: el._sg._sc().get(), n: el._sg._sc().n, manual: el._sg._sc().manual() } : null; }, sec(k));
  const waitSet = async (k, cond, ms = 15000) => { const t0 = Date.now(); let r; while (Date.now() - t0 < ms) { r = await prog(k); if (r && cond(r)) return r; await p.waitForTimeout(150); } return r; };

  for (const [ch, kind, n] of SCENES) {
    await t(`${ch}: the ${kind} scene follows scrolling forwards, backwards and after a fling, and ends exactly`, async () => {
      await go('chapter/' + ch, `[data-sg-kind="${kind}"]`);
      await scrollTo(kind, 0.02); const r0 = await waitSet(kind, r => r.p !== null); assert.ok(r0, 'mounted'); assert.equal(r0.n, n); assert.equal(r0.manual, false, 'scroll-driven on desktop');
      await scrollTo(kind, 0.5); const mid = await waitSet(kind, r => Math.abs(r.p - (n - 1) / 2) < 0.6); assert.ok(Math.abs(mid.p - (n - 1) / 2) < 0.6, 'middle ' + mid.p);
      await scrollTo(kind, 0.995); const end = await waitSet(kind, r => r.p === n - 1); assert.equal(end.p, n - 1, 'reaches the last stage exactly');
      await scrollTo(kind, 0.0); const back = await waitSet(kind, r => r.p === 0); assert.equal(back.p, 0, 'reverses to the start exactly');
      for (const f of [0.9, 0.1, 0.8, 0.02, 0.995]) await scrollTo(kind, f); const fl = await waitSet(kind, r => r.p === n - 1); assert.equal(fl.p, n - 1, 'a fast fling settles on the right stage');
      const act = await p.evaluate(s => [...document.querySelectorAll(s + ' .sg-step.is-active')].map(x => +x.dataset.i), sec(kind)); assert.deepEqual(act, [n - 1]);
    });
    await t(`${ch}: manual controls — next/previous, scrub, play, reset; scrolling no longer moves a detached model`, async () => {
      await p.click(sec(kind) + ' [data-sg="reset"]'); let r = await waitSet(kind, x => x.p === 0); assert.equal(r.p, 0); assert.equal(r.manual, true);
      await p.click(sec(kind) + ' [data-sg="next"]'); r = await waitSet(kind, x => x.p === 1); assert.equal(r.p, 1); await p.click(sec(kind) + ' [data-sg="prev"]'); r = await waitSet(kind, x => x.p === 0); assert.equal(r.p, 0);
      await p.fill(sec(kind) + ' [data-sg="range"]', '2'); r = await waitSet(kind, x => x.p === 2); assert.equal(r.p, 2);
      await scrollTo(kind, 0.95); await p.waitForTimeout(600); r = await prog(kind); assert.equal(r.p, 2, 'detached: scrolling does not move it');
      await p.check(sec(kind) + ' [data-sg="follow"]'); r = await waitSet(kind, x => x.p > 3); assert.ok(r.p > 3, 'reattached follows scroll again');
      await p.click(sec(kind) + ' [data-sg="reset"]'); await p.click(sec(kind) + ' [data-sg="play"]'); r = await waitSet(kind, x => x.p > 0.5, 8000); assert.ok(r.p > 0.5, 'play advances'); await p.click(sec(kind) + ' [data-sg="play"]');
    });
  }
  await t('cell: selecting a structure shows its verified description from the shared content', async () => {
    await go('chapter/b-cells', '[data-sg-kind="cell"]'); await scrollTo('cell', 0.999); await waitSet('cell', r => r.p === 6);
    const txt = await p.evaluate(s => { const el = document.querySelector(s), M = el._sg._M(), S = el._sg._S(); const nuc = M.pickables().find(m => m.userData.part === 'nucleus'); M.pick(nuc); S.render(); return el.querySelector('.sg-note').textContent; }, sec('cell'));
    assert.match(txt, /Nucleus/); assert.match(txt, /DNA/);
  });
  await t('molecule: measured bond lengths and angles; switching molecules keeps the stage', async () => {
    await go('chapter/c-bonding', '[data-sg-kind="molecule"]');
    const d = await p.evaluate(() => { const ang = (a, b) => Math.acos(a.reduce((s, x, i) => s + x * b[i], 0) / Math.hypot(...a) / Math.hypot(...b)) * 180 / Math.PI; return ['ch4', 'nh3', 'h2o'].map(k => { const m = LS.sig ? LS.sig.molData(k) : null; return m && { L: Math.hypot(...m.bonds[0]), a: ang(m.bonds[0], m.bonds[1]) }; }); });
    if (!d[0]) { await scrollTo('molecule', 0.1); await waitSet('molecule', r => r.p !== null); }
    const e = await p.evaluate(() => { const ang = (a, b) => Math.acos(a.reduce((s, x, i) => s + x * b[i], 0) / Math.hypot(...a) / Math.hypot(...b)) * 180 / Math.PI; return ['ch4', 'nh3', 'h2o'].map(k => { const m = LS.sig.molData(k); return { L: Math.hypot(...m.bonds[0]), a: ang(m.bonds[0], m.bonds[1]) }; }); });
    near(e[0].L, 1.087, 1e-9, 'C–H'); near(e[0].a, 109.47, 0.01, 'tetrahedral'); near(e[1].L, 1.012, 1e-9, 'N–H'); near(e[1].a, 106.7, 1e-6, 'H–N–H'); near(e[2].L, 0.958, 1e-9, 'O–H'); near(e[2].a, 104.5, 1e-6, 'H–O–H');
    await scrollTo('molecule', 0.8); const before = await waitSet('molecule', r => r.p > 2.5); await p.click(sec('molecule') + ' [data-mol="h2o"]'); await p.waitForTimeout(300); const after = await prog('molecule'); assert.ok(after.p >= before.p - 0.05, 'stage kept: ' + after.p + ' / ' + before.p);
  });
  await t('solid → net: hinge folding is exact; 7 glued edge pairs for the cube and 4 for the pyramid; flat net lies in one plane', async () => {
    await go('chapter/m-geometry', '[data-sg-kind="solid"]'); await scrollTo('solid', 0.999); await waitSet('solid', r => r.p === 4);
    const c = await p.evaluate(s => { const el = document.querySelector(s), S = el._sg._S(), root = S.scene.children.find(o => o.type === 'Group'); root.updateMatrixWorld(true); const ys = []; root.traverse(o => { if (o.isMesh && o.geometry.type === 'ShapeGeometry') { const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const v = new S.THREE.Vector3().fromBufferAttribute(a, i); o.localToWorld(v); ys.push(v.y); } } }); return { pairs: el._sg._pairs, spread: Math.max(...ys) - Math.min(...ys) }; }, sec('solid'));
    assert.equal(c.pairs, 7); assert.ok(c.spread < 1e-6, 'flat: ' + c.spread);
    await p.click(sec('solid') + ' [data-solid="pyr"]'); await p.waitForTimeout(300); assert.equal(await p.evaluate(s => document.querySelector(s)._sg._pairs, sec('solid')), 4);
    await scrollTo('solid', 0.0); await waitSet('solid', r => r.p === 0);
    const f = await p.evaluate(s => { const el = document.querySelector(s), S = el._sg._S(), root = S.scene.children.find(o => o.type === 'Group'); root.updateMatrixWorld(true); const pts = []; root.traverse(o => { if (o.isMesh && o.geometry.type === 'ShapeGeometry') { const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const v = new S.THREE.Vector3().fromBufferAttribute(a, i); o.localToWorld(v); pts.push(v); } } }); const apex = pts.reduce((m, v) => (v.y > m.y ? v : m)); const base = pts.filter(v => Math.abs(v.y - Math.min(...pts.map(q => q.y))) < 1e-6); return { h: apex.y - Math.min(...pts.map(q => q.y)), n: base.length }; }, sec('solid'));
    near(f.h, Math.SQRT1_2, 1e-6, 'folded pyramid height a/√2 (equilateral faces)');
  });
  await t('Δv construction: drawn by scroll; at the last stage Δv points within 6° of the centre', async () => {
    await go('chapter/p-circular', '[data-sg-kind="dv"]'); await scrollTo('dv', 0.999); await p.waitForTimeout(2500);
    const a = await p.evaluate(s => { const q = x => document.querySelector(s + ' ' + x), g = (el, k) => +el.getAttribute(k); const dv = q('.dv-dv'), A = q('.dv-oA'), O = [230, 215]; const dx = g(dv, 'x2') - g(dv, 'x1'), dy = g(dv, 'y2') - g(dv, 'y1'), ox = O[0] - g(A, 'cx'), oy = O[1] - g(A, 'cy'); return Math.acos((dx * ox + dy * oy) / Math.hypot(dx, dy) / Math.hypot(ox, oy)) * 180 / Math.PI; }, sec('dv'));
    assert.ok(a < 6.1, 'angle ' + a); const sub = await p.evaluate(s => document.querySelector(s + ' .sg-steps').innerHTML.includes('&lt;sub'), sec('dv')); assert.equal(sub, false, 'no escaped tags');
  });
  await t('living timeline: the line draws forward and back with scroll; events come in order; every event is in the page text', async () => {
    await go('chapter/h-sources', '.lt'); const n = await p.evaluate(() => document.querySelectorAll('#lsView .lt-ev').length); assert.equal(n, 10);
    const at = async f => { await p.evaluate(f0 => { const el = document.querySelector('#lsView .lt-wrap'), r = el.getBoundingClientRect(); scrollTo(0, r.top + scrollY + r.height * f0 - innerHeight * 0.6); }, f); await p.waitForTimeout(500); return p.evaluate(() => ({ on: [...document.querySelectorAll('#lsView .lt-ev')].map(e => e.classList.contains('is-on')), off: +getComputedStyle(document.querySelector('#lsView .lt-line')).strokeDashoffset.replace('px', '') })); };
    const a = await at(0.3), b0 = await at(0.9), c = await at(0.1);
    assert.ok(b0.on.filter(Boolean).length > a.on.filter(Boolean).length, 'more events further down'); assert.ok(c.on.filter(Boolean).length < a.on.filter(Boolean).length, 'fewer when scrolling back'); assert.ok(b0.off < a.off && c.off > a.off, 'line length follows');
    const order = a.on.indexOf(false); assert.ok(a.on.slice(0, order).every(Boolean) && a.on.slice(order).every(x => !x), 'contiguous: nothing skips ahead');
    const text = await p.innerText('#lsView .lt'); ['Galen', 'Ibn al-Nafis', '1628', 'William Harvey', '1661', 'Malpighi', '1967'].forEach(w => assert.ok(text.includes(w), w));
    await p.click('#lsView [data-lt="all"]'); await p.waitForTimeout(300); assert.ok((await p.evaluate(() => [...document.querySelectorAll('#lsView .lt-ev')].every(e => e.classList.contains('is-on')))), 'show all');
  });
  await t('lazy loading: a chapter without a 3D signature section never downloads the 3D scenes', async () => {
    await go('chapter/p-newton', '.cr'); await p.waitForTimeout(800); assert.equal(await p.evaluate(() => !!LS.sig || !!document.querySelector('script[src*="ls-signature"]')), false);
  });
  await t('chapter path rail: on every chapter page, matches the steps and real progress', async () => {
    await go('chapter/p-newton', '.cr'); await p.click('#lsView .uv-steps [data-step="activate"]').catch(() => {}); await go('chapter/p-newton', '.cr');
    const r = await p.evaluate(() => ({ dots: document.querySelectorAll('#lsView .cr-dot').length, steps: document.querySelectorAll('#lsView .uv-steps > li').length, done: document.querySelectorAll('#lsView .cr-dot.is-done').length, sdone: document.querySelectorAll('#lsView .uv-steps > li.is-done').length }));
    assert.equal(r.dots, r.steps); assert.equal(r.done, r.sdone);
  });
  await t('Knowledge Map: selecting a chapter draws its prerequisite path, earliest first, and leaves no dash styles behind', async () => {
    await go('map', '.km-n'); await p.click('#lsView .km-n[data-ch="p-circular"]'); await p.waitForTimeout(120);
    const mid = await p.evaluate(() => [...document.querySelectorAll('#lsView .km-e.is-hot')].map(e => e.style.strokeDasharray).filter(Boolean).length); assert.ok(mid > 0, 'drawing in progress');
    await p.waitForTimeout(1500); const after = await p.evaluate(() => [...document.querySelectorAll('#lsView .km-e')].filter(e => e.style.strokeDasharray).length); assert.equal(after, 0, 'styles cleaned');
  });
  await t('reduced motion: no scroll-driving, everything readable, stages by buttons; phone width: no pinned stage, no horizontal scroll', async () => {
    const rctx = await mk({ reducedMotion: 'reduce' }); await go('chapter/m-geometry', '[data-sg-kind="solid"]', rctx); await scrollTo('solid', 0.1); const r = await waitSet('solid', x => x !== null); assert.equal(r.manual, true);
    await p.click(sec('solid') + ' [data-sg="play"]'); const r2 = await waitSet('solid', x => x.p === 1); assert.equal(r2.p, 1, 'play steps one stage');
    await go('chapter/h-sources', '.lt', rctx); assert.ok(await p.evaluate(() => [...document.querySelectorAll('#lsView .lt-ev')].every(e => e.classList.contains('is-on'))), 'timeline fully shown');
    const m = await mk({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await go('chapter/b-cells', '[data-sg-kind="cell"]', m); await scrollTo('cell', 0.02); const r3 = await waitSet('cell', x => x !== null); assert.equal(r3.manual, true);
    const pos = await p.evaluate(s => getComputedStyle(document.querySelector(s + ' .sg-stage')).position, sec('cell')); assert.equal(pos, 'relative'); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal scroll');
    await p.tap(sec('cell') + ' [data-sg="next"]'); const r4 = await waitSet('cell', x => x.p === 1); assert.equal(r4.p, 1, 'touch control');
    await rctx.close(); await m.close();
  });
  await t('resize, refresh and leaving the page: the scene keeps its stage on resize and every WebGL scene is released on leave', async () => {
    await go('chapter/c-bonding', '[data-sg-kind="molecule"]'); await scrollTo('molecule', 0.5); await waitSet('molecule', r => r.p > 1); await p.setViewportSize({ width: 1000, height: 800 }); await p.waitForTimeout(800); await scrollTo('molecule', 0.5); const r = await waitSet('molecule', x => Math.abs(x.p - 2) < 0.7); assert.ok(Math.abs(r.p - 2) < 0.7);
    await p.reload(); await p.waitForSelector(sec('molecule')); await scrollTo('molecule', 0.5); const r2 = await waitSet('molecule', x => x.p > 1); assert.ok(r2.p > 1, 'after refresh');
    const n0 = await p.evaluate(() => LS.__scenes.size); assert.ok(n0 >= 1); await p.evaluate(() => { location.hash = '#/chapter/p-newton'; }); await p.waitForTimeout(1200); assert.equal(await p.evaluate(() => LS.__scenes.size), 0, 'released');
  });
  await t('in-app navigation between chapters keeps the new page alive (cleanup runs before, not after, the next render)', async () => {
    await go('chapter/p-newton', '.cr'); await p.evaluate(() => { location.hash = '#/chapter/g-tectonics'; }); await p.waitForSelector(sec('earth'));
    await p.evaluate(s => { const el = document.querySelector(s), r = el.getBoundingClientRect(); scrollTo(0, r.top + scrollY + r.height * 0.995 - innerHeight * 0.55); }, sec('earth'));
    const r = await waitSet('earth', x => x.p === 5, 20000); assert.ok(r && r.p === 5, 'mounted and scroll-driven after navigation: ' + JSON.stringify(r));
  });
  await t('no page errors', async () => { assert.deepEqual(errs, []); });
  await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
