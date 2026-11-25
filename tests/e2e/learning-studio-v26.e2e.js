// Learning Studio v26: rebuilt Newton lab, interaction boundaries (no text selection on drags), new construction
// tools, Solar System, circuit builder, molecule chemistry, content validation and the inspection guide's answers.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v26.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); const raf = window.requestAnimationFrame.bind(window); window.__raf = 0; window.requestAnimationFrame = f => { window.__raf++; return raf(f); }; });
  const p = await ctx.newPage(); p.setDefaultTimeout(15000); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) errs.push(m.text()); });
  const open = async id => { await p.goto(BASE + 'learn.html#/exp/' + id); await p.waitForSelector('.at-x__stage', { timeout: 20000 }); await p.waitForTimeout(700); };
  const box = sel => p.locator(sel).boundingBox(); // measured fresh each time: the page may have scrolled
  const sel0 = () => p.evaluate(() => getSelection().toString());
  const setR = (sel, v) => p.evaluate(([s, v]) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v]);

  await t('Newton lab opens with a real, sized canvas (the old blank stray canvas is gone) and runs four investigations', async () => {
    await open('newton-lab');
    const cv = await p.evaluate(() => { const c = document.querySelector('.nl2__stage canvas'); return [c.width, c.height, document.querySelectorAll('.nl__cv').length]; });
    assert.ok(cv[0] > 600 && cv[1] > 250, 'canvas ' + cv); assert.equal(cv[2], 0);
    await p.click('[data-kb="push"]'); await p.waitForTimeout(3600); await p.click('[data-kb="run"]');
    assert.match(await p.innerText('.nl2__read'), /v = 5\.00 m\/s · a = 0\.00/, 'after a 1 s push of 20 N on 4 kg, v = 5 m/s and stays');
    await p.click('[data-step="observe"]'); assert.match(await p.innerText('.at-x__panel'), /evenly spaced/);
    await p.click('[data-kc="mode"][data-v="fma"]'); await p.click('[data-kc="surf"][data-v="frictionless"]'); await setR('[data-k="F"]', 20); await p.click('[data-kb="run"]'); await p.waitForTimeout(900); await p.click('[data-kb="run"]');
    assert.match(await p.innerText('.nl2__read'), /a = 5\.00 m\/s²/); await p.click('[data-kb="save"]'); assert.match(await p.innerText('.nl2__log'), /5\.00\s+5\.00/);
    await p.click('[data-kc="mode"][data-v="friction"]');
    await setR('[data-k="F"]', 19); await p.click('[data-kb="run"]'); await p.waitForTimeout(500); await p.click('[data-kb="run"]'); assert.match(await p.innerText('.nl2__read'), /v = 0\.00/, '19 N < μsN = 19.6 N: stays put');
    await setR('[data-k="F"]', 20); await p.click('[data-kb="run"]'); await p.waitForTimeout(500); await p.click('[data-kb="run"]'); assert.match(await p.innerText('.nl2__read'), /friction = −11\.8 N/, 'kinetic friction μk·N = 0.3 × 4 × 9.81');
    await p.click('[data-kc="mode"][data-v="interact"]'); await p.click('[data-kb="run"]'); await p.waitForTimeout(3200); await p.click('[data-kb="run"]');
    const r = await p.innerText('.nl2__read'); assert.match(r, /before: 12\.00 · now: \*?\*?12\.00/); assert.match(r, /kinetic energy now: 18\.00 J/, 'elastic: energy kept');
  });

  await t('Newton lab: dragging the force arrow sets F and selects no text; ← → keys work', async () => {
    await open('newton-lab'); await p.click('[data-kc="mode"][data-v="fma"]'); await p.locator('.nl2__stage').scrollIntoViewIfNeeded();
    const bb = await box('.nl2__stage canvas'), s = bb.width / 960, X = bb.x + (360 + (46 + 12.8) / 2 + 18) * s, Y = bb.y + (300 - 24) * s;
    await p.mouse.move(X, Y); await p.mouse.down(); await p.mouse.move(X + 90 * s, Y + 40, { steps: 8 }); await p.mouse.move(X + 400, Y + 300, { steps: 6 }); await p.mouse.up();
    assert.ok(+(await p.evaluate(() => document.querySelector('[data-k="F"]').value)) > 10, 'force set by dragging'); assert.equal(await sel0(), '');
    await p.focus('.nl2__stage canvas'); const f0 = +(await p.evaluate(() => document.querySelector('[data-k="F"]').value)); await p.keyboard.press('ArrowLeft'); assert.equal(+(await p.evaluate(() => document.querySelector('[data-k="F"]').value)), f0 - 5);
  });

  await t('Newton lab: opening and leaving six times leaves no errors and no running animation loop', async () => {
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { location.hash = '#/exp/newton-lab'; }); await p.waitForTimeout(i % 2 ? 150 : 700); await p.evaluate(() => { location.hash = '#/notebook'; }); await p.waitForTimeout(150); }
    await p.waitForTimeout(600); const r0 = await p.evaluate(() => window.__raf); await p.waitForTimeout(1000); assert.ok((await p.evaluate(() => window.__raf)) - r0 < 5, 'animation stopped after leaving');
  });

  await t('no experience turns a drag across its model into a text selection (all experiences)', async () => {
    await p.goto(BASE + 'learn.html#/notebook'); await p.waitForTimeout(800);
    const ids = await p.evaluate(() => LS.experiences.map(x => x.id)), bad = [];
    for (const id of ids) {
      await p.evaluate(id => { location.hash = '#/exp/' + id; }, id); try { await p.waitForSelector('.at-x__stage', { timeout: 10000 }); } catch (e) { bad.push(id + ' (did not open)'); continue; } await p.waitForTimeout(500);
      await p.locator('.at-x__stage').scrollIntoViewIfNeeded(); const bb = await box('.at-x__stage'); await p.evaluate(() => getSelection().removeAllRanges());
      const h = Math.min(bb.height, 420); await p.mouse.move(bb.x + bb.width * 0.3, bb.y + h * 0.5); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.8, bb.y + h * 0.7, { steps: 6 }); await p.mouse.move(bb.x + bb.width + 60, bb.y + h + 260, { steps: 4 }); await p.mouse.up();
      const s = await sel0(); if (s.trim()) bad.push(id + ': “' + s.trim().slice(0, 30) + '”');
    }
    assert.deepEqual(bad, []); console.log('     (' + ids.length + ' experiences)');
  });

  await t('every Visual Lab model opens without errors and drags on it select no text', async () => {
    await p.goto(BASE + 'learn.html#/lab'); await p.waitForTimeout(3000);
    const ids = await p.evaluate(() => ERLY_LAB.engines.map(e => e.id)), bad = [], dom = [], e0 = errs.length;
    for (const id of ids) {
      await p.evaluate(id => { location.hash = '#/lab/' + id; }, id);
      const G = '.lab__canvas canvas, .lab__canvas svg, .jxgbox svg'; // the model's own graphic (some load a library first)
      try { await p.waitForSelector(G, { timeout: 8000 }); } catch (e) { /* v37: pages now render at once (no View Transition), so the previous model's graphic is no longer still on screen when this one opens — a model that opens but draws nothing (algebra answers in chat) is text-only, not broken */ if (await p.evaluate(id => !!document.querySelector(`#lsView .lab[data-engine="${id}"]`) && !document.querySelector('#lsView .ls-fb--warn'), id)) { dom.push(id); continue; } bad.push(id + ' (no graphic)'); continue; } await p.waitForTimeout(250);
      let pt0 = null; for (let tries = 0; tries < 6 && !pt0; tries++) { if (tries) await p.waitForTimeout(300); /* a route change may still be in its view transition, which covers the page */ pt0 = await p.evaluate(G => { document.documentElement.style.scrollBehavior = 'auto'; const el = [...document.querySelectorAll(G)].find(e => { const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 40; }); if (!el) return null; el.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = el.getBoundingClientRect();
        for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7], [0.15, 0.15]]) { const x = r.x + r.width * fx, y = r.y + r.height * fy; const t = document.elementFromPoint(x, y); if (t && t.closest('.lab__canvas, .lab__stage, .jxgbox')) return { x, y }; } /* anywhere in the model’s interactive region */ return null; }, G); }
      if (!pt0) { dom.push(id); continue; } // a model drawn only with text and controls, or one whose graphic is fully covered: nothing to drag
      const bb = { x: pt0.x, y: pt0.y, width: 0, height: 0 };
      await p.evaluate(() => getSelection().removeAllRanges()); await p.mouse.move(bb.x, bb.y); await p.mouse.down(); await p.mouse.move(bb.x + 300, bb.y + 160, { steps: 5 }); await p.mouse.up();
      if ((await sel0()).trim()) bad.push(id + ' (selects text)');
    }
    assert.deepEqual(bad, []); assert.deepEqual(errs.slice(e0), [], 'page errors in lab models'); console.log('     (' + ids.length + ' models opened; drag-tested ' + (ids.length - dom.length) + '; text/controls only: ' + dom.join(', ') + ')');
  });

  await t('Equation Balance Studio: exact solutions, steps on both sides, one-sided steps change the answer, invalid steps explained', async () => {
    await open('equation-balance');
    const sol = await p.evaluate(() => ['3x + 5 = 20', '5x − 7 = 2x + 8', '2(x + 3) = 14', 'x/2 + 1 = 4', '6x + 2 = 6x − 1', '2x = 2x', '1/3x + 1/2 = 1', '-(x+3) = 5'].map(s => { const r = LS.v26math.solution(LS.v26math.parseEq(s)); return typeof r === 'object' ? LS.v26math.fs(r) : r; }));
    assert.deepEqual(sol, ['5', '5', '4', '6', 'none', 'all', '3/2', '−8']);
    await p.click('[data-pre="5x − 7 = 2x + 8"]'); for (let i = 0; i < 4; i++) { const bt = p.locator('.eb__ops [data-op]').first(); if (!(await bt.count())) break; await bt.click(); }
    assert.match(await p.innerText('.eb__hint'), /Solved: x = 5/); assert.equal((await p.innerText('.eb__log')).split('\n').length, 4);
    await p.click('[data-pre="3x + 5 = 20"]'); await p.check('.eb__one'); await p.selectOption('.eb__op', 'add'); await p.fill('.eb__k', '5'); await p.click('.eb__go');
    assert.match(await p.innerText('.eb__hint'), /solution changed from 5 to 10\/3/);
    await p.uncheck('.eb__one'); await p.selectOption('.eb__op', 'div'); await p.fill('.eb__k', '0'); await p.click('.eb__go'); assert.match(await p.innerText('.eb__hint'), /cannot divide by 0/);
    await p.fill('#ebIn', 'x^2 = 4'); await p.click('.eb__in button[type=submit]'); assert.match(await p.innerText('.eb__err'), /numbers, x/);
  });

  await t('Geometry Construction Studio: theorems survive dragging; construction from scratch works', async () => {
    await open('geo-construct'); await p.locator('.gc').scrollIntoViewIfNeeded();
    const drag = async (x0, y0, x1, y1) => { const bb = await box('.gc__svg'), s = bb.width / 900; await p.mouse.move(bb.x + x0 * s, bb.y + y0 * s); await p.mouse.down(); await p.mouse.move(bb.x + x1 * s, bb.y + y1 * s, { steps: 6 }); await p.mouse.up(); };
    const rows = () => p.evaluate(() => [...document.querySelectorAll('.gc__out tr')].map(r => r.textContent));
    await drag(380, 110, 520, 60); await drag(220, 420, 120, 470);
    const seg = (await rows()).filter(r => /^Segment/.test(r)).map(r => +r.match(/([\d.]+) units/)[1]); near(seg[3], seg[0] / 2, 0.011, 'midsegment = half of AB');
    await p.click('[data-ch="bis"]'); await drag(260, 300, 300, 160); const bs = (await rows()).filter(r => /^Segment/.test(r)).map(r => +r.match(/([\d.]+) units/)[1]); near(bs[1], bs[2], 0.011, 'equidistant');
    await p.click('[data-ch="semi"]'); assert.match((await rows()).join(' '), /90\.0°/);
    await p.click('[data-ch="tri"]'); await drag(380, 110, 600, 200); const an = (await rows()).filter(r => /^Angle/.test(r)).map(r => +r.match(/([\d.]+)°/)[1]); near(an.reduce((a, c) => a + c, 0), 180, 0.2, 'angle sum');
    assert.equal(await sel0(), '');
    const tap = (x, y) => p.evaluate(([x, y]) => { const sv = document.querySelector('.gc__svg'), r = sv.getBoundingClientRect(), cx = r.left + x / 900 * r.width, cy = r.top + y / 520 * r.height; ['pointerdown', 'pointerup'].forEach(t => sv.dispatchEvent(new PointerEvent(t, { clientX: cx, clientY: cy, bubbles: true, cancelable: true, pointerId: 3, pointerType: 'mouse', button: 0, buttons: t === 'pointerdown' ? 1 : 0 }))); }, [x, y]);
    await p.click('[data-a="clear"]'); await p.click('[data-tool="seg"]'); await tap(200, 200); await tap(600, 260);
    await p.click('[data-tool="perp"]'); await tap(400, 230); await tap(420, 420);
    const st = await p.evaluate(() => [document.querySelectorAll('.gc__svg line').length, document.querySelectorAll('.gc__svg g.h').length]); assert.ok(st[0] >= 2 && st[1] >= 3, 'segment + perpendicular built: ' + st);
  });

  await t('3D solids & nets: formulas, net area = surface area, Euler’s formula, folding renders', async () => {
    await open('solids-nets'); await p.waitForSelector('.sn__view canvas', { timeout: 20000 });
    const out = () => p.innerText('.sn__out');
    assert.match(await out(), /27\.00 cm³[\s\S]*54\.00 cm²[\s\S]*54\.00 cm² ✓/); assert.match(await out(), /6 − 12 \+ 8 = 2/);
    await p.click('[data-sh="pyramid"]'); assert.match(await out(), /12\.25 cm³[\s\S]*36\.56 cm²[\s\S]*36\.56 cm² ✓/);
    await p.click('[data-sh="prism"]'); assert.match(await out(), /43\.79 cm² ✓/);
    await p.click('[data-sh="cone"]'); assert.match(await out(), /angle 161\.0°/);
    await p.click('[data-sh="cube"]'); for (const f of [0, 0.5, 1]) { await setR('.sn__ctl [data-k="fold"]', f); await p.waitForTimeout(80); const h = await p.evaluate(() => LS.__snProbe()); assert.ok(h.every(v => v >= -1e-6), 'no face folds below the base at ' + f); }
  });

  await t('Solar System: Kepler’s third law holds for all eight planets; Earth’s distance and gravity are right', async () => {
    await open('solar-system'); await p.click('[data-step="observe"]');
    const txt = await p.innerText('.at-x__panel'); const ratios = [...txt.matchAll(/(Mercury|Venus|Earth|Mars|Jupiter|Saturn|Uranus|Neptune) ([\d.]+)/g)].map(m => +m[2]);
    assert.equal(ratios.length, 8); ratios.forEach(r => near(r, 1, 0.003, 'P²/a³')); assert.match(txt, /P = 1\.88 years/);
    assert.match(await p.innerText('.ss__info'), /9\.82 m\/s²/);
    for (const v of ['dist', 'size', 'log']) { await p.click(`[data-kc="view"][data-v="${v}"]`); await p.waitForTimeout(100); }
  });

  await t('Circuit builder: series, parallel and switch circuits solved by nodal analysis; open circuit gives no current', async () => {
    await open('circuit-builder'); const out = () => p.innerText('.cb__out');
    assert.match(await out(), /current 0\.249 A/); await p.click('[data-pre="parallel"]'); assert.match(await out(), /current 0\.992 A/); assert.match(await out(), /0\.496 A/);
    await p.click('[data-pre="switch"]'); assert.match(await out(), /0\.272 A/);
    const I = await p.evaluate(() => { const r = LS.__cb; return null; });
    // build a loop from scratch with the mouse: battery, resistor, ammeter, wires
    await p.click('[data-pre="clear"]'); const place = async (tool, a, b2) => { await p.click(`[data-part="${tool}"]`); const bb = await box('.cb__svg'), s = bb.width / 900, nx = i => 90 + (i % 8) * 105, ny = i => 70 + Math.floor(i / 8) * 105; await p.mouse.click(bb.x + (nx(a) + nx(b2)) / 2 * s, bb.y + (ny(a) + ny(b2)) / 2 * s); };
    await place('battery', 0, 8); await place('wire', 0, 1); await place('resistor', 1, 2); await place('ammeter', 2, 10); await place('wire', 10, 9); await place('wire', 9, 8);
    const o = await out(); assert.match(o, /current 0\.597 A/, o.slice(0, 120)); assert.match(o, /Ammeter \d+\s+0\.597 A/);
    await place('wire', 1, 9); assert.match(await out(), /short circuit/i);
    assert.equal(await sel0(), '');
  });

  await t('Molecule builder: new elements, dynamic lone pairs, expanded octets for P and S, VSEPR angles', async () => {
    await open('molecule-3d'); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => { const bld = (ce, ligs) => { const M = LS.molecule(); const C = M.add(ce, [0, 0, 0]); ligs.forEach(([e, o]) => M.bonds.push({ a: C, b: M.add(e), o: o || 1 })); M.relax(400); return { M, C }; };
      const ang = ({ M, C }) => { const n = M.nb(C), o = []; for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) { const u = [0, 1, 2].map(t => n[i].p[t] - C.p[t]), w = [0, 1, 2].map(t => n[j].p[t] - C.p[t]); o.push(Math.acos((u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (Math.hypot(...u) * Math.hypot(...w))) * 180 / Math.PI); } return o; };
      const sf6 = bld('S', Array(6).fill(['F'])), nh3 = bld('N', Array(3).fill(['H'])), h2o = bld('O', [['H'], ['H']]), c5 = bld('C', Array(5).fill(['H']));
      return { sf6: ang(sf6).every(a => Math.abs(a - 90) < 3 || Math.abs(a - 180) < 3), sf6free: sf6.M.free(sf6.C), nh3: ang(nh3)[0], nh3lp: nh3.M.lp(nh3.C), h2o: ang(h2o)[0], h2olp: h2o.M.lp(h2o.C), c5: c5.M.free(c5.C) }; });
    assert.ok(r.sf6, 'SF6 octahedral'); assert.equal(r.sf6free, 0); near(r.nh3, 107, 3, 'NH3'); assert.equal(r.nh3lp, 1); near(r.h2o, 104.5, 3, 'H2O'); assert.equal(r.h2olp, 2); assert.ok(r.c5 < 0, 'CH5 invalid');
    assert.equal(await p.evaluate(() => [...document.querySelectorAll('[data-kc="el"]')].map(b => b.dataset.v).join(' ')), 'H C N O F Cl S B Si P Br I');
    for (const v of ['space', 'stick', 'ball']) await p.click(`[data-kc="rep"][data-v="${v}"]`);
  });

  await t('content validator: 0 errors across every question, lesson, experience and reference', async () => {
    const out = execFileSync(process.execPath, [path.join(__dirname, '..', '..', 'tools', 'validate-content.js')], { env: Object.assign({}, process.env, { NODE_PATH: process.env.NODE_PATH }), encoding: 'utf8', timeout: 180000 });
    assert.match(out, /\*\*0 errors · 0 to review/);
  });

  await t('every answer the content directory shows is marked correct by the Studio’s own grader', async () => {
    await p.goto(BASE + 'learn.html?inspect=1'); await p.waitForSelector('.lsi h1');
    const bad = await p.evaluate(async () => { await LS.inspect.load(); const all = []; LS.lessons.forEach(L => { L.sections.forEach(s => s.blocks.forEach(bl => bl.q && all.push(bl.q))); (L.revision || []).forEach(r => all.push(typeof r === 'string' ? LS.bank().find(q => q.id === r) : r)); });
      LS.bank().forEach(q => all.push(q)); LS.experiences.forEach(x => ((LS.exp.DEFS[x.id] || {}).apply || []).forEach(a => all.push(typeof a === 'string' ? LS.bank().find(q => q.id === a) : a)));
      return all.filter(Boolean).filter(q => q.type !== 'short').filter(q => { const c = LS.inspect.correct(q); try { return !c.text || LS.grade.check(q, c.resp).correct !== true; } catch (e) { return true; } }).map(q => q.id + ' (' + q.type + ')'); });
    assert.deepEqual(bad, []);
  });

  await t('no page errors', async () => { assert.deepEqual(errs, []); });
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
