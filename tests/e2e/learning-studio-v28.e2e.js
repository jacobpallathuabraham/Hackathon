// Learning Studio v28: the Differentiation and Integration explorers (numbers checked against independent calculations,
// real drags on the canvases, the h → 0 animation, challenges), the rebuilt Water cycle (conservation, camera, process
// highlighting, labels, particles, frame cost) and the cursor-depth layer (active for a mouse, off for touch and reduced motion).
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v28.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
// independent Riemann sums
const riem = (f, a, b, n, m) => { const dx = (b - a) / n; let s = 0; for (let i = 0; i < n; i++) { const x0 = a + i * dx, x1 = x0 + dx; s += m === 'L' ? f(x0) : m === 'R' ? f(x1) : m === 'M' ? f((x0 + x1) / 2) : (f(x0) + f(x1)) / 2; } return s * dx; };

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); } catch (e) { /* about:blank */ } });
  const p = await ctx.newPage(); p.setDefaultTimeout(15000);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) errs.push(m.text()); });
  const api = id => p.evaluate(id => { const h = document.createElement('div'); h.style.cssText = 'position:fixed;left:-9999px;width:900px'; document.body.appendChild(h); window.__api = LS.exp.DEFS[id].build(h, LS.exp.ctx()); return true; }, id);
  const open = async id => { await p.goto('about:blank'); await p.goto(BASE + 'learn.html#/exp/' + id); await p.waitForSelector('#lsView .kx-cv'); await p.waitForTimeout(900); };
  const box = async sel => { const el = p.locator(sel).first(); await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(250); return el.boundingBox(); };

  await t('both explorers are registered with Back breadcrumbs and open from the maths world', async () => {
    await open('derivative-lab'); assert.match(await p.innerText('#lsBackbar'), /Differentiation explorer/);
    await open('integral-lab'); assert.match(await p.innerText('#lsBackbar'), /Integration explorer/);
    const ids = await p.evaluate(() => LS.experiences.filter(x => x.subject === 'maths').map(x => x.id)); assert.ok(ids.includes('derivative-lab') && ids.includes('integral-lab'));
  });

  await t('Differentiation: secant slopes, exact and numerical derivatives and stationary points match independent calculation', async () => {
    await open('derivative-lab'); await api('derivative-lab');
    const r = await p.evaluate(() => ({ h1: __api._set({ fn: 'sq', a: 1, h: 1 }), h01: __api._set({ a: 1, h: 0.01 }), hn: __api._set({ a: 1, h: -0.1 }), cub: __api._set({ fn: 'cub', a: 0.5, h: 0.2 }), sin: __api._set({ fn: 'sin', a: 1, h: 0.001 }), cus: __api._set({ src: 'x^3/3 - x', a: 2, h: 0.5 }), rec: __api._set({ fn: 'rec', a: 2, h: 1 }) }));
    near(r.h1.m, 3, 1e-12, 'x², a=1, h=1: ((2)²−1)/1'); near(r.h1.d, 2, 0, 'f′(1)=2'); near(r.h01.m, 2.01, 1e-9, '2a + h'); near(r.hn.m, 1.9, 1e-9, 'negative h');
    near(r.cub.m, ((0.7 ** 3 - 2.1) - (0.125 - 1.5)) / 0.2, 1e-12, 'cubic secant'); near(r.cub.d, 3 * 0.25 - 3, 1e-12, 'cubic derivative'); assert.deepEqual(r.cub.sps.map(x => +x.toFixed(6)), [-1, 1], 'stationary points of x³−3x');
    near(r.sin.d, Math.cos(1), 1e-12, 'sin′ = cos'); near(r.sin.m, (Math.sin(1.001) - Math.sin(1)) / 0.001, 1e-12, 'sin secant');
    near(r.cus.d, 3, 1e-6, 'typed function, central difference: (x³/3 − x)′ at 2 = 4 − 1'); near(r.cus.m, ((2.5 ** 3 / 3 - 2.5) - (8 / 3 - 2)) / 0.5, 1e-9, 'typed secant');
    near(r.rec.m, (1 / 3 - 1 / 2) / 1, 1e-12, '1/x secant'); near(r.rec.d, -0.25, 1e-12, '1/x derivative');
  });

  await t('Differentiation: dragging P and Q on the canvas moves the point and the gap; first principles and the table follow', async () => {
    await open('derivative-lab');
    const bb = await box('#lsView .dl__f .kx-cv'); const X = x => bb.x + (46 + (x + 3) / 6 * 836) / 900 * bb.width, Y = y => bb.y + (14 + 340 - (y + 1.5) / 11 * 340) / 900 * bb.width;
    await p.mouse.move(X(1), Y(1)); await p.mouse.down(); await p.mouse.move(X(1.4), Y(1.96), { steps: 6 }); await p.mouse.move(X(1.5), Y(2.25), { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(200);
    const a = await p.evaluate(() => +document.querySelector('#lsView [data-k="a"]').value); near(a, 1.5, 0.03, 'P dragged to x ≈ 1.5');
    await p.mouse.move(X(a + 1), Y((a + 1) ** 2)); await p.mouse.down(); await p.mouse.move(X(a + 0.6), Y((a + 0.6) ** 2), { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
    const h = await p.evaluate(() => +document.querySelector('#lsView [data-k="h"]').value); near(h, 0.6, 0.04, 'Q dragged so h ≈ 0.6');
    const fp = await p.innerText('#lsView .dl__fp'); assert.match(fp, /2a \+ h/); assert.match(fp, new RegExp((2 * a + h).toFixed(2).replace('.', '\\.')));
    const sel = await p.evaluate(() => getSelection().toString()); assert.equal(sel, '', 'dragging selects no text');
  });

  await t('Differentiation: “Let h → 0” animates h down to 0.001 and fills the h → 0 table; challenges are checked from live numbers', async () => {
    await open('derivative-lab'); await p.click('#lsView [data-kb="h0"]'); await p.waitForTimeout(400);
    const mid = await p.evaluate(() => +document.querySelector('#lsView [data-k="h"]').value); assert.ok(mid < 1 && mid > 0.001, 'h is shrinking: ' + mid);
    await p.waitForFunction(() => !LS.exp.live.running(), null, { timeout: 15000 }); assert.equal(await p.evaluate(() => +document.querySelector('#lsView [data-k="h"]').value), 0.001);
    const rows = await p.$$eval('#lsView .dl__tab tr', r => r.length); assert.equal(rows, 6, 'header + five rows (h = 1 … 0.001)');
    assert.match(await p.innerText('#lsView .dl__read'), /2\.001/, 'secant slope at h = 0.001 on x² at a = 1');
    await api('derivative-lab'); const c = await p.evaluate(() => [__api._set({ ch: 'three', a: 1.5, h: 0.5 }).done.three, __api._set({ ch: 'three', a: 1.2 }).done.three, __api._set({ ch: 'flat', a: -1 }).done.flat, __api._set({ ch: 'match', fn: 'sq', a: 0.3, h: 0.004 }).done.match]);
    assert.deepEqual(c, [true, true, true, true]);
    const notYet = await p.evaluate(() => { const h = document.createElement('div'); document.body.appendChild(h); const A = LS.exp.DEFS['derivative-lab'].build(h, LS.exp.ctx()); return A._set({ ch: 'three', a: 1.2, h: 0.5 }).done.three; }); assert.equal(notYet, undefined, 'a = 1.2 does not pass the gradient-3 challenge');
  });

  await t('Integration: exact integrals, signed areas and Riemann sums match independent calculation', async () => {
    await open('integral-lab'); await api('integral-lab');
    const r = await p.evaluate(() => ({ sq: __api._set({ fn: 'sq', a: 0, b: 3, n: 6, m: 'L' }), sqM: __api._set({ n: 4, m: 'M' }), sqT: __api._set({ n: 5, m: 'T' }), sqR: __api._set({ n: 7, m: 'R' }), sin: __api._set({ fn: 'sin', a: 0, b: Math.PI, n: 10, m: 'M' }), sin2: __api._set({ a: 0, b: 2 * Math.PI }), cub: __api._set({ fn: 'cub', a: -2, b: 2 }), lin: __api._set({ fn: 'lin', a: 0, b: 4 }), cus: __api._set({ src: 'x*(4-x)/2', a: 0, b: 2, n: 8, m: 'L' }) }));
    near(r.sq.I, 9, 1e-12, '∫₀³x²'); near(r.sq.S, 6.875, 1e-12, 'left n=6'); near(r.sqM.S, riem(x => x * x, 0, 3, 4, 'M'), 1e-12, 'midpoint n=4'); near(r.sqT.S, riem(x => x * x, 0, 3, 5, 'T'), 1e-12, 'trapezium n=5'); near(r.sqR.S, riem(x => x * x, 0, 3, 7, 'R'), 1e-12, 'right n=7');
    near(r.sin.I, 2, 1e-12, '∫₀^π sin'); near(r.sin.S, riem(Math.sin, 0, Math.PI, 10, 'M'), 1e-12, 'sin midpoint'); near(r.sin2.I, 0, 1e-12, 'signed area over a full period'); near(r.sin2.abs, 4, 1e-6, 'total area 4');
    near(r.cub.I, 0, 1e-12, 'odd function'); near(r.cub.abs, 8, 1e-6, '|x³−4x| on [−2,2]'); near(r.lin.I, 0, 1e-12, '∫₀⁴(2−x)');
    near(r.cus.I, 4 - 8 / 6, 1e-9, 'typed function by Simpson'); near(r.cus.S, riem(x => x * (4 - x) / 2, 0, 2, 8, 'L'), 1e-12, 'typed left sum');
    near(r.sq.Ab, 9, 1e-12, 'A(b) = ∫ₐᵇ');
  });

  await t('Integration: refining doubles n with left-sum errors halving (ratio → 2) and midpoint errors quartering (→ 4); FTC slope = f(b)', async () => {
    await open('integral-lab'); await p.click('#lsView [data-kb="refine"]');
    await p.waitForFunction(() => document.querySelectorAll('#lsView .il__tab tr').length >= 9, null, { timeout: 12000 });
    const rows = await p.$$eval('#lsView .il__tab tr', r => r.slice(1).map(x => [...x.cells].map(c => c.innerText))); assert.equal(rows.at(-1)[0], '128');
    near(+rows.at(-1)[3], 2, 0.05, 'left-sum error ratio for x² approaches 2');
    near(+rows.at(-1)[1], riem(x => x * x, 0, 3, 128, 'L'), 1e-4, 'n = 128 sum');
    await api('integral-lab'); const m = await p.evaluate(() => { __api._set({ fn: 'sq', a: 0, b: 3 }); const I = 9; return [16, 32, 64].map(n => __api._sum(n, 'M') - I); }); near(m[0] / m[1], 4, 1e-6, 'midpoint ratio'); near(m[1] / m[2], 4, 1e-6, 'midpoint ratio');
    const ftc = await p.innerText('#lsView .il__ftc'); const [sl, fb] = [...ftc.matchAll(/(-?\d+\.\d{4})/g)].map(x => +x[1]); near(sl, fb, 2e-4, 'measured slope of A at b equals f(b)'); near(fb, 9, 1e-9, 'f(3) = 9');
  });

  await t('Integration: dragging the b bound on the canvas changes the area; challenges are checked', async () => {
    await open('integral-lab');
    const bb = await box('#lsView .il__f .kx-cv'); const toPx = ([x, y]) => [bb.x + x / 900 * bb.width, bb.y + y / 900 * bb.width];
    const [hx, handleY] = toPx(await p.evaluate(() => document.querySelector('#lsView .il__f .kx-cv').__handle('b'))); const X = x => bb.x + (46 + (x + 1) / 5 * 836) / 900 * bb.width;
    near(hx, X(3), 1, 'b handle at x = 3');
    assert.ok(handleY, 'found the b handle');
    await p.mouse.move(X(3), handleY); await p.mouse.down(); await p.mouse.move(X(2.5), handleY, { steps: 6 }); await p.mouse.move(X(2), handleY, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(250);
    const txt = await p.innerText('#lsView .il__read'); assert.match(txt, /2\.66667/, '∫₀² x² = 8/3 after dragging b to 2');
    await api('integral-lab'); const c = await p.evaluate(() => [__api._set({ ch: 'nine', a: 0, b: 3 }).done.nine, __api._set({ ch: 'zero', a: 0, b: 2 * Math.PI }).done.zero, __api._set({ ch: 'err', n: 136, m: 'L' }).done.err, __api._set({ ch: 'peak', a: 0, b: 2 }).done.peak]);
    assert.deepEqual(c, [true, true, true, true]);
    const errN = await p.evaluate(() => { __api._set({ fn: 'sq', a: 0, b: 3, m: 'L' }); let n = 1; while (Math.abs(__api._sum(n, 'L') - 9) >= 0.1 && n < 1000) n++; return n; }); assert.equal(errN, (() => { let n = 1; while (Math.abs(riem(x => x * x, 0, 3, n, 'L') - 9) >= 0.1) n++; return n; })(), 'fewest rectangles agrees');
  });

  await t('Water cycle (rebuilt): the conserved model is unchanged; highlighting flies the camera; labels, zoom, pan and selection work', async () => {
    await open('water-cycle'); await api('water-cycle');
    const r = await p.evaluate(() => { const a = __api._sim({ T: 15, perm: 0.6, wind: 1, veg: 0.6 }, 60), w = __api._sim({ T: 30 }, 60), pv = __api._sim({ T: 15, perm: 0.05 }, 60); return { a, w, pv }; });
    near(r.a.total, r.a.total0, 1e-9, 'conserved'); near(r.w.total, r.w.total0, 1e-9, 'conserved warm'); assert.ok(r.w.F.evap > r.a.F.evap, 'warmer → more evaporation'); assert.ok(r.pv.F.run > r.pv.F.inf, 'paved: runoff > infiltration');
    // the real page
    await p.click('#lsView [data-kc="hl"][data-v="gw"]'); await p.waitForTimeout(1500);
    let v = await p.evaluate(() => document.querySelector('#lsView .wc__info').innerText); assert.match(v, /Groundwater flow/);
    const cam = await p.evaluate(() => LS.exp.__live && LS.exp.__live._view ? LS.exp.__live._view() : null);
    const shot1 = await p.locator('#lsView .wc__stage .kx-cv').screenshot();
    await p.click('#lsView [data-kc="hl"][data-v="all"]'); await p.click('#lsView [data-kc="view"][data-v="all"]'); await p.waitForTimeout(1500);
    const shot2 = await p.locator('#lsView .wc__stage .kx-cv').screenshot(); assert.notDeepEqual(shot1, shot2, 'highlighting changes the view');
    void cam;
    // zoom in with the button, then drag to pan; a plain click selects a zone
    await p.click('#lsView [data-kb="zin"]'); await p.click('#lsView [data-kb="zin"]'); await p.waitForTimeout(1200);
    const bb = await box('#lsView .wc__stage .kx-cv'); const before = await p.locator('#lsView .wc__stage .kx-cv').screenshot();
    await p.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height * 0.45, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    const after = await p.locator('#lsView .wc__stage .kx-cv').screenshot(); assert.notDeepEqual(before, after, 'drag pans the zoomed camera');
    await p.click('#lsView [data-kc="view"][data-v="all"]'); await p.waitForTimeout(1400);
    const bb2 = await box('#lsView .wc__stage .kx-cv'); await p.mouse.click(bb2.x + bb2.width * 0.12, bb2.y + bb2.height * 0.9); await p.waitForTimeout(200); assert.match(await p.innerText('#lsView .wc__info'), /The ocean/);
    // labels toggle off: still renders, no errors
    await p.click('#lsView [data-kt="labels"]'); await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => getSelection().toString()), '');
  });

  await t('Water cycle: particles of every process, a river that widens with flow, and a frame cost well inside a 60 FPS budget', async () => {
    await open('water-cycle'); await box('#lsView .wc__stage .kx-cv'); await p.evaluate(() => { window.__api = LS.exp.live; });
    await p.evaluate(() => __api._perfReset()); await p.waitForTimeout(2500);
    const v = await p.evaluate(() => __api._view());
    ['vap', 'tr', 'rain', 'inf', 'gw'].forEach(k => assert.ok(v.kinds.includes(k), 'particles of ' + k + ' (' + v.kinds + ')'));
    assert.ok(v.frames > 60, 'frames drawn in 2.5 s: ' + v.frames); assert.ok(v.msPerFrame < 8, 'draw cost per frame ' + v.msPerFrame.toFixed(2) + ' ms');
    console.log(`     (headless: ${(v.frames / 2.5).toFixed(0)} frames/s, ${v.msPerFrame.toFixed(2)} ms to draw a frame, ${v.parts} particles)`);
    const w = await p.evaluate(() => { const lo = __api._sim({ T: 15, perm: 1 }, 40); const a = __api._view().river; __api._sim({ perm: 0 }, 40); const b = __api._view().river; return [a, b]; }); assert.ok(w[1] > w[0], 'paved ground → wider river ' + w);
  });

  await t('Cursor depth: a mouse sets --cx/--cy and tilts only the hovered card; touch and reduced motion turn it off', async () => {
    await p.goto(BASE + 'learn.html#/home'); await p.waitForTimeout(1500);
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('ls-depth')), true);
    const card = p.locator('#lsView .dx-card').first(); await card.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(300); const cb = await card.boundingBox();
    await p.mouse.move(cb.x + cb.width * 0.8, cb.y + cb.height * 0.3, { steps: 3 }); await p.waitForTimeout(120);
    const s = await p.evaluate(() => ({ cx: getComputedStyle(document.documentElement).getPropertyValue('--cx'), n: document.querySelectorAll('.ls-tilt').length, tx: +document.querySelector('.ls-tilt')?.style.getPropertyValue('--tx') }));
    assert.ok(s.cx !== '', 'root --cx set'); assert.equal(s.n, 1, 'exactly one tilted card'); near(s.tx, 0.6, 0.15, 'tilt follows the pointer inside the card');
    await p.mouse.move(5, 5); await p.waitForTimeout(150); assert.equal(await p.evaluate(() => document.querySelectorAll('.ls-tilt').length), 0, 'leaving the card resets it');
    for (const opts of [{ hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } }, { reducedMotion: 'reduce' }]) {
      const c2 = await b.newContext(opts); await c2.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); });
      const q = await c2.newPage(); await q.goto(BASE + 'learn.html#/home'); await q.waitForTimeout(1200);
      assert.equal(await q.evaluate(() => document.documentElement.classList.contains('ls-depth')), false, JSON.stringify(opts)); await c2.close();
    }
  });

  await t('Accuracy audit: the two slider activities grade the slider value (c = 4, c = 3) — not the computed target (Δ = 0, y = 5)', async () => {
    await p.goto(BASE + 'learn.html#/home'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const seen = new Set(); const find = (o, id) => { if (!o || typeof o !== 'object' || seen.has(o)) return null; seen.add(o); if (o.id === id && o.type === 'slider') return o; for (const v of Object.values(o)) { const f = find(v, id); if (f) return f; } return null; };
      const q1 = (seen.clear(), find(LS.lessons, 'q-slider')), q2 = (seen.clear(), find(LS.lessons, 'lf-c2')); if (!q1 || !q2) return { missing: [!!q1, !!q2] };
      return { a1: LS.inspect.correct(q1).text, a2: LS.inspect.correct(q2).text, g: [LS.grade.check(q1, 4).correct, LS.grade.check(q1, 0).correct, LS.grade.check(q2, 3).correct, LS.grade.check(q2, 5).correct] }; });
    assert.ok(!r.missing, 'both activities found: ' + JSON.stringify(r.missing));
    assert.deepEqual(r.g, [true, false, true, false], 'grader: c = 4 right, 0 wrong; c = 3 right, 5 wrong'); assert.match(r.a1, /c = 4/); assert.match(r.a2, /c = 3/);
  });
  await t('v28 canvases are painted after opening (no blank models)', async () => {
    for (const [id, sel] of [['derivative-lab', '.dl__f canvas'], ['derivative-lab', '.dl__d canvas'], ['integral-lab', '.il__f canvas'], ['integral-lab', '.il__A canvas'], ['water-cycle', '.wc__stage canvas']]) {
      await p.goto(BASE + 'learn.html#/exp/' + id); await p.waitForSelector('#lsView ' + sel); await p.waitForTimeout(900);
      const painted = await p.evaluate(sel => { const c = document.querySelector('#lsView ' + sel), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 64) if (d[i]) n++; return n / (d.length / 64); }, sel);
      assert.ok(painted > (id === 'water-cycle' ? 0.95 : 0.02), id + ' ' + sel + ' painted ' + painted.toFixed(2)); // graphs are drawn on a transparent canvas: curves, axes, grid
    }
  });
  await t('no page errors', async () => { assert.deepEqual(errs, []); });
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
