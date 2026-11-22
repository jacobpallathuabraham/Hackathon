// Learning Studio v27: universal Back navigation (every experience, lab models, lessons, deep links, browser history,
// restored scroll/filters/focus) and the v27 experiences (Function forge, Maths missions, Probability lab, Water cycle,
// Reaction lab), with their numbers checked against independent calculations.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v27.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); });
  const p = await ctx.newPage(); p.setDefaultTimeout(15000);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) errs.push(m.text()); });
  const state = () => p.evaluate(() => ({ h: location.hash, y: Math.round(scrollY), bar: document.getElementById('lsBackbar').hidden ? null : document.getElementById('lsBackbar').innerText.replace(/\s+/g, ' '), focus: document.activeElement && document.activeElement.getAttribute('href') }));

  await t('every experience shows a Back control with its subject in the breadcrumb, and Back returns to where it was opened from', async () => {
    await p.goto(BASE + 'learn.html#/discover'); await p.waitForTimeout(1200);
    const xs = await p.evaluate(() => LS.experiences.map(x => [x.id, x.title, (LS.subjectsList.find(s => s.id === x.subject) || {}).name]));
    const bad = [];
    for (const [id, title, subj] of xs) {
      await p.evaluate(id => { location.hash = '#/exp/' + id; }, id); await p.waitForTimeout(250);
      const s = await state(); if (!s.bar || !s.bar.includes(title) || !s.bar.includes(subj)) bad.push(id + ' bar: ' + s.bar);
      const accName = await p.getAttribute('[data-ls-back]', 'aria-label'); if (!/^Back to /.test(accName || '')) bad.push(id + ' name: ' + accName);
      await p.click('[data-ls-back]'); await p.waitForTimeout(300); const s2 = await state(); if (s2.h !== '#/discover') bad.push(id + ' back → ' + s2.h);
    }
    assert.deepEqual(bad, []); console.log('     (' + xs.length + ' experiences)');
  });

  await t('Back restores the scroll position, the filters and the keyboard focus of the page it returns to', async () => {
    await p.goto(BASE + 'learn.html#/finder'); await p.waitForTimeout(1500);
    await p.click('.dx-filter [data-fk="construction"]'); await p.click('.dx-filter [data-fs="maths"]'); await p.waitForTimeout(200);
    const card = p.locator('.dx-grid a[href^="#/exp/"], a.dx-card, .dx-card a').first(); await card.scrollIntoViewIfNeeded(); const y0 = await p.evaluate(() => Math.round(scrollY)); const href = await card.getAttribute('href');
    await card.click(); await p.waitForTimeout(1200); await p.click('[data-ls-back]'); await p.waitForTimeout(1400);
    const s = await state(); near(s.y, y0, 4, 'scroll'); assert.equal(s.focus, href, 'focus returns to the card used');
    assert.equal(await p.evaluate(() => [...document.querySelectorAll('.dx-filter [aria-pressed="true"][data-fk], .dx-filter [aria-pressed="true"][data-fs]')].map(b => b.dataset.fk ?? b.dataset.fs).join(',')), 'construction,maths');
  });

  await t('lab models, lessons and topic pages have Back with a breadcrumb; nested navigation unwinds step by step', async () => {
    await p.goto(BASE + 'learn.html#/lab'); await p.waitForTimeout(3000);
    await p.evaluate(() => { location.hash = '#/lab/projectile'; }); await p.waitForTimeout(1500); let s = await state(); assert.match(s.bar, /Visual Lab .*Projectile/);
    await p.evaluate(() => { location.hash = '#/topic/phys-newton'; }); await p.waitForTimeout(900); s = await state(); assert.match(s.bar, /Physics .*Newton/);
    await p.evaluate(() => { location.hash = '#/lesson/phys-newton'; }); await p.waitForTimeout(900); s = await state(); assert.match(s.bar, /Lessons/);
    await p.evaluate(() => { location.hash = '#/exp/newton-lab'; }); await p.waitForTimeout(900);
    for (const want of ['#/lesson/phys-newton', '#/topic/phys-newton', '#/lab/projectile', '#/lab']) { await p.click('[data-ls-back]'); await p.waitForTimeout(700); assert.equal((await state()).h, want); }
  });

  await t('browser Back/Forward and refresh work with the Studio’s history; Home has no Back bar', async () => {
    await p.goto(BASE + 'learn.html#/explore'); await p.waitForTimeout(900); await p.evaluate(() => { location.hash = '#/subject/chemistry'; }); await p.waitForTimeout(700); await p.evaluate(() => { location.hash = '#/exp/reaction-lab'; }); await p.waitForTimeout(1200);
    await p.goBack(); await p.waitForTimeout(700); assert.equal((await state()).h, '#/subject/chemistry'); await p.goForward(); await p.waitForTimeout(900); assert.equal((await state()).h, '#/exp/reaction-lab');
    await p.reload(); await p.waitForTimeout(1500); assert.match((await state()).bar, /Chemistry .*Reaction lab/); await p.click('[data-ls-back]'); await p.waitForTimeout(800); assert.equal((await state()).h, '#/subject/chemistry', 'after a refresh Back still goes to the previous page');
    await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(800); assert.equal((await state()).bar, null);
  });

  await t('a deep link opens with Back to the logical parent, which replaces the entry (no Back loop); rapid clicks move one step', async () => {
    const q = await ctx.newPage(); await q.goto(BASE + 'learn.html#/exp/water-cycle'); await q.waitForTimeout(1500);
    const len0 = await q.evaluate(() => history.length); await q.click('[data-ls-back]'); await q.waitForTimeout(800); assert.equal(await q.evaluate(() => location.hash), '#/world/geography'); assert.equal(await q.evaluate(() => history.length), len0, 'the parent replaced the entry: no new history, so Back cannot loop');
    await q.click('[data-ls-back]'); await q.waitForTimeout(800); assert.equal(await q.evaluate(() => location.hash), '#/explore');
    await q.evaluate(() => { location.hash = '#/exp/prob-lab'; }); await q.waitForTimeout(800); await q.evaluate(() => { const b = document.querySelector('[data-ls-back]'); b.click(); b.click(); b.click(); }); await q.waitForTimeout(900); assert.equal(await q.evaluate(() => location.hash), '#/explore');
    await q.close();
  });

  await t('keyboard: Back is reachable and works with Enter; phone width keeps it visible and compact', async () => {
    await p.goto(BASE + 'learn.html#/discover'); await p.waitForTimeout(900); await p.evaluate(() => { location.hash = '#/exp/sorting'; }); await p.waitForTimeout(900);
    await p.focus('[data-ls-back]'); await p.keyboard.press('Enter'); await p.waitForTimeout(800); assert.equal((await state()).h, '#/discover');
    const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await m.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); });
    const q = await m.newPage(); await q.goto(BASE + 'learn.html#/exp/function-forge'); await q.waitForTimeout(1500); const bb = await q.locator('[data-ls-back]').boundingBox(); assert.ok(bb && bb.width >= 36 && bb.height >= 36, 'touch-sized'); assert.ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll');
    await m.close();
  });

  const api = id => p.evaluate(id => { const h = document.createElement('div'); h.style.cssText = 'position:fixed;left:-9999px;width:900px'; document.body.appendChild(h); window.__api = LS.exp.DEFS[id].build(h, LS.exp.ctx()); return true; }, id);
  await t('Function forge: roots, turning points, intersections and gaps are found correctly', async () => {
    await p.goto(BASE + 'learn.html#/exp/function-forge'); await p.waitForSelector('.ff__stage canvas'); await api('function-forge');
    const r = await p.evaluate(() => ({ a: __api._analyse('x^2-4'), b: __api._analyse('x^3-3x'), c: __api._analyse('1/(x-2)'), d: __api._analyse('sin(x)', -1, 7) }));
    assert.deepEqual(r.a.roots, [-2, 2]); assert.deepEqual(r.a.turns, [[0, -4, 'min']]);
    near(r.b.roots[0], -Math.sqrt(3), 1e-5, 'root'); assert.deepEqual(r.b.turns, [[-1, 2, 'max'], [1, -2, 'min']]);
    assert.equal(r.c.roots.length, 0); near(r.c.gaps[0], 2, 0.01, 'gap at x = 2');
    near(r.d.roots[1], Math.PI, 1e-6, 'π'); near(r.d.roots[2], 2 * Math.PI, 1e-6, '2π');
    await p.fill('#lsView #ffIn1', 'x+4'); await p.waitForTimeout(150); assert.match(await p.innerText('#lsView .ff__feat'), /meet at: \(−0\.56\d*, 3\.43\d*\), \(3\.56\d*, 7\.56\d*\)/, 'intersections of (x − 1)² + 1 and x + 4: x = (3 ± √17)/2');
  });
  await t('Maths missions accept any equivalent correct answer and reject wrong ones', async () => {
    await api('math-missions');
    const r = await p.evaluate(() => [['0', '2x-3'], ['0', '2x+3'], ['1', 'x^2-4x+1'], ['2', 'x^2-2x-3'], ['2', 'x^2-2x-4'], ['3', '-(x-2)^2'], ['3', '(x-2)^2'], ['4', '3x-1'], ['4', '3x+1'], ['5', '4n-1'], ['5', '4n+1']].map(([i, s]) => __api._try(+i, s)));
    assert.deepEqual(r, [true, false, true, true, false, true, false, true, false, true, false]);
  });
  await t('Probability lab: relative frequencies approach theory (20 000 crypto-random trials)', async () => {
    await api('prob-lab'); const r = await p.evaluate(() => { const a = __api._run('two', 20000), c = __api._run('coin', 20000); return { p7: a.counts[5] / a.N, th7: a.th[5], heads: c.counts[0] / c.N, sum: a.counts.reduce((x, y) => x + y, 0) }; });
    near(r.th7, 1 / 6, 1e-12, 'theory'); near(r.p7, 1 / 6, 0.02, 'P(7)'); near(r.heads, 0.5, 0.02, 'heads'); assert.equal(r.sum, 20000);
  });
  await t('Water cycle: water is conserved; warming melts snow and speeds evaporation; paving raises runoff; no wind, little rain inland', async () => {
    await api('water-cycle'); const r = await p.evaluate(() => { const a = __api._sim({ T: 15, perm: 0.6, wind: 1, veg: 0.6 }, 60), w = __api._sim({ T: 30 }, 60), pv = __api._sim({ T: 15, perm: 0.05 }, 60), cm = __api._sim({ perm: 0.6, wind: 0 }, 60); return { a, w, pv, cm }; });
    near(r.a.total, r.a.total0, 1e-6, 'conserved'); near(r.cm.total, r.a.total0, 1e-6, 'still conserved');
    assert.ok(r.a.st.snow > 10 && r.w.st.snow < 1, 'snow melts when warm'); assert.ok(r.w.F.evap > 2 * r.a.F.evap, 'evaporation ×2+ for +15 °C');
    assert.ok(r.pv.F.run > r.a.F.run && r.pv.F.inf < r.a.F.inf / 5, 'paving: more runoff, less infiltration'); assert.ok(r.cm.F.rainL < r.a.F.rainL / 5, 'no wind: little rain inland');
  });
  await t('Reaction lab: balance detection, lowest terms, and running only balanced reactions', async () => {
    await api('reaction-lab'); const r = await p.evaluate(() => [[0, [2, 1, 2]], [0, [1, 1, 1]], [1, [1, 2, 1, 2]], [6, [1, 5, 3, 4]], [6, [1, 5, 3, 3]], [7, [4, 3, 2]], [9, [1, 6, 6, 6]], [2, [1, 3, 2]], [4, [1, 2, 1, 1]], [8, [1, 1, 1, 1]], [3, [2, 2, 1]]].map(([i, k]) => __api._set(i, k)));
    assert.deepEqual(r, [true, false, true, true, false, true, true, true, true, true, true]);
    await p.goto(BASE + 'learn.html#/exp/reaction-lab'); await p.waitForSelector('#lsView .rl__sel'); await p.click('#lsView [data-rl="run"]'); assert.match(await p.innerText('#lsView .rl__fb'), /Balance it first/);
    for (const i of [0, 2]) await p.click(`#lsView [data-k="${i}"][data-d="1"]`); await p.click('#lsView [data-rl="run"]'); await p.waitForTimeout(1800); assert.match(await p.innerText('#lsView .rl__fb'), /Balanced\. Synthesis/);
    for (const i of [0, 0, 1, 2, 2]) await p.click(`#lsView [data-k="${i}"][data-d="1"]`); assert.match(await p.innerText('#lsView .rl__fb'), /not in lowest terms/);
  });
  await t('Photosynthesis lab: inverse-square light, limiting factors, temperature optimum, and counts recorded in the journal', async () => {
    await p.goto(BASE + 'learn.html#/exp/photo-lab'); await p.waitForSelector('#lsView .ph__stage canvas'); await api('photo-lab');
    const r = await p.evaluate(() => ({ far: __api._model(40, 1, 25), near: __api._model(10, 1, 25), nearCO2: __api._model(10, 2, 25), half: __api._model(20, 1, 25), opt: __api._model(10, 2, 27), hot: __api._model(10, 2, 45), cool: __api._model(10, 2, 17) }));
    assert.equal(r.far.lim, 'light'); assert.equal(r.near.lim, 'CO₂'); assert.ok(r.nearCO2.rate > r.near.rate, 'more CO₂ raises a CO₂-limited rate');
    near(r.half.L / r.far.L, 4, 1e-9, 'halving the distance gives 4× the light'); near(r.opt.f, 1, 1e-9, 'optimum'); assert.equal(r.hot.rate, 0, 'denatured at 45 °C'); near(r.cool.f, 0.5, 1e-9, '×2 per 10 °C below the optimum');
    await p.click('#lsView [data-kb="count"]'); await p.waitForTimeout(2200); assert.match(await p.innerText('#lsView .ph__log'), /30 cm/);
  });
  await t('v27 canvases are painted after opening (no blank models)', async () => {
    for (const [id, sel] of [['function-forge', '.ff__stage canvas'], ['math-missions', '.mm__stage canvas'], ['prob-lab', '.pl__h canvas'], ['water-cycle', '.wc__stage canvas'], ['reaction-lab', '.rl__stage canvas'], ['photo-lab', '.ph__stage canvas']]) {
      await p.goto(BASE + 'learn.html#/exp/' + id); await p.waitForSelector('#lsView ' + sel); await p.waitForTimeout(900);
      const painted = await p.evaluate(sel => { const c = document.querySelector('#lsView ' + sel), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 64) if (d[i]) n++; return n / (d.length / 64); }, sel);
      assert.ok(painted > 0.5, id + ' painted ' + painted.toFixed(2));
    }
  });
  await t('no page errors', async () => { assert.deepEqual(errs, []); });
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
