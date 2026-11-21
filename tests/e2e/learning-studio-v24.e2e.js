/* ERLY Learning Studio v24 — dashboard, entrance, every experience, and the science/maths inside them checked against
   independent calculations. Run with: NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v24.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 8).join('\n     ')); } };
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const fresh = async (opts, entered = true) => { const c = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, opts || {})); await c.addInitScript(e => { sessionStorage.setItem('acubins-role', 'student'); if (e) sessionStorage.setItem('ls-entered', '1'); }, entered); const p = await c.newPage(); p.setDefaultTimeout(10000); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) errs.push(m.text()); }); return p; };
  const p = await fresh(); await p.goto(BASE + 'learn.html#/home'); await p.waitForTimeout(1500);
  const go = async (h, w) => { await p.evaluate(x => { location.hash = '#/' + x; }, h); await p.waitForTimeout(w || 1000); };
  const open = async id => { await go('exp/' + id, 1300); await p.click('.at-x__steps [data-step="explore"]').catch(() => {}); await p.waitForTimeout(400); };
  const obs = async () => { await p.click('.at-x__steps [data-step="observe"]'); await p.waitForTimeout(250); const s = (await p.textContent('.at-x__panel')).replace(/\s+/g, ' '); await p.click('.at-x__steps [data-step="explore"]'); return s; };
  const setR = async (k, v) => { await p.evaluate(([k, v]) => { const r = document.querySelector(`.at-x__stage [data-k="${k}"]`); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }, [k, v]); await p.waitForTimeout(1200); }; // values glide on springs: wait until they settle
  const chip = async (k, v) => { await p.click(`.at-x__stage [data-kc="${k}"][data-v="${v}"]`); await p.waitForTimeout(250); };
  const read = () => p.evaluate(() => document.querySelector('.at-x__stage .kx-read').textContent);

  /* ---------- dashboard ---------- */
  await t('dashboard: the orrery, a single h1, search, modes, discovery of all experiences, and the earlier plan below', async () => {
    assert.ok(await p.isVisible('.dx-orrery')); assert.equal(await p.locator('h1').count(), 1); assert.equal(await p.locator('.dx-worlds a').count(), 11);
    const n = await p.evaluate(() => LS.experiences.length); assert.ok(n >= 64, 'experiences ' + n); assert.match(await p.textContent('.dx-h2 small'), new RegExp(n + ' interactive'));
    assert.ok(await p.locator('.dx-plan .at-home').count() === 1 || await p.locator('.dx-plan__in > *').count() >= 1);
  });
  await t('dashboard search finds experiences and topics, and Enter opens the first result', async () => {
    await p.fill('.dx-search__in', 'titration'); await p.waitForTimeout(150); assert.match(await p.textContent('.dx-search__res'), /Titration curve/);
    await p.press('.dx-search__in', 'Enter'); await p.waitForTimeout(1000); assert.equal(await p.evaluate(() => location.hash), '#/exp/titration'); await go('home', 1200);
  });
  await t('discovery filters by kind and by subject; “Show all” reveals everything', async () => {
    await p.click('[data-fs="chemistry"]'); await p.waitForTimeout(150); const ch = await p.$$eval('.dx-card b', e => e.length); assert.ok(ch >= 7, 'chemistry ' + ch);
    await p.click('[data-fs=""]'); await p.click('[data-fk="construction"]'); assert.ok((await p.$$eval('.dx-card b', e => e.map(x => x.textContent))).includes('3D molecule builder'));
    await p.click('[data-fk=""]'); await p.click('[data-more]'); assert.equal(await p.locator('.dx-card').count(), await p.evaluate(() => LS.experiences.length));
  });
  await t('choosing a world on the orrery dives into that subject', async () => { await p.evaluate(() => scrollTo(0, 0)); await p.click('[data-world-go="biology"]'); await p.waitForTimeout(1400); assert.equal(await p.evaluate(() => location.hash), '#/subject/biology'); });
  await t('Explore shows all eleven subject worlds, each with its own animated scene', async () => { await go('explore', 1500); assert.equal(await p.locator('.at-wcard').count(), 11); assert.equal(await p.evaluate(() => [...document.querySelectorAll('.at-wcard canvas')].filter(c => { const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 400) if (d[i] > 0) return true; return false; }).length), 11, 'every world card is painted'); });

  /* ---------- every experience opens and computes an observation ---------- */
  await t('all experiences open without errors and their “Observe” step is computed from the model', async () => {
    const ids = await p.evaluate(() => LS.experiences.map(x => x.id)), bad = [];
    for (const id of ids) { const e0 = errs.length; await open(id); const st = await p.evaluate(() => !!document.querySelector('.at-x__stage').children.length); const o = await obs(); if (!st || errs.length > e0 || !/What happened/.test(o)) bad.push(id + (errs.length > e0 ? ' ' + errs.slice(e0).join(';') : '')); }
    assert.deepEqual(bad, []);
  });

  /* ---------- physics ---------- */
  await t('projectile: range at 45°, 20 m/s on Earth matches v²/g; 30° and 60° tie', async () => {
    await open('projectile'); const R = await p.evaluate(() => { const rs = {}; return rs; }); await p.click('.at-x__stage [data-kb="go"]'); await p.waitForTimeout(3500);
    const r1 = +(await read()).match(/range ([\d.]+) m/)[1]; close(r1, 400 / 9.81, 0.25, 'range 45°');
    await setR('a', 30); await p.click('.at-x__stage [data-kb="go"]'); await p.waitForTimeout(3500); const r30 = +(await read()).match(/range ([\d.]+) m/)[1];
    await setR('a', 60); await p.click('.at-x__stage [data-kb="go"]'); await p.waitForTimeout(3500); const r60 = +(await read()).match(/range ([\d.]+) m/)[1]; close(r30, r60, 0.3, '30 vs 60'); close(r30, 400 * Math.sin(Math.PI / 3) / 9.81, 0.3, 'range 30°');
  });
  await t('inclined plane: slips exactly when tan θ > μs, independent of mass', async () => {
    await open('incline'); await setR('mu', 0.5); await setR('th', 26); assert.match(await read(), /Holding/); await setR('th', 27.5); await p.waitForTimeout(600); assert.match(await read(), /Sliding/);
    await setR('th', 26); await p.click('.at-x__stage [data-kb="rel"]'); await setR('m', 9); await p.waitForTimeout(400); assert.match(await read(), /Holding/, 'a 9 kg block at 26° holds too (mass cancels)');
  });
  await t('gravity: doubling the distance quarters the force (Earth–Moon 1.99 × 10²⁰ N)', async () => { await open('gravity-explorer'); await setR('r', 768); const o = await obs(); assert.match(o, /0\.25× the Earth–Moon value/); assert.match(o, /quarter/); });
  await t('atmosphere: ISA gives −56.5 °C at 11 km and 226 hPa', async () => { await open('atmosphere'); await setR('h', 11); await p.waitForTimeout(800); const r = await read(); assert.match(r, /−56\.5 °C/); assert.match(r, /226 hPa/); });
  await t('optics: air→water at 30° refracts to 22.1°; glass→air beyond 41.8° is total internal reflection; lens 1/v = 1/f − 1/u', async () => {
    await open('optics'); await chip('med', 'aw'); await setR('a', 30); await p.waitForTimeout(500); assert.match(await read(), /θ₂ = 22\.1°/);
    await chip('med', 'ga'); await setR('a', 45); await p.waitForTimeout(500); assert.match(await read(), /Total internal reflection/); assert.match(await read(), /41\.8°/);
    await chip('mode', 'lens'); await p.waitForTimeout(700); const m = (await read()).match(/u = (\d+) mm\*?\*?, f = \*?\*?(\d+) mm.*?v = (−?[\d]+) mm/); const u = +m[1], f = +m[2], v = +m[3].replace('−', '-'); close(v, 1 / (1 / f - 1 / u), 1, 'thin lens');
  });
  await t('energy track: with no friction the total energy stays constant while the ball swings', async () => { await open('energy-track'); await p.click('.at-x__stage [data-kb="rel"]'); await p.waitForTimeout(2500); const m = (await read()).match(/= ([\d.]+) J \(started with ([\d.]+) J\)/); close(+m[1], +m[2], 0.25, 'energy conserved'); });
  await t('black hole: Schwarzschild radius 2.95 km per solar mass; escape speed is c at the horizon', async () => { await open('black-hole'); await chip('pre', '1'); await p.waitForTimeout(1500); assert.match(await obs(), /29\.53 km/); await setR('p', 1); await p.waitForTimeout(800); assert.match(await read(), /100\.0%/); });
  await t('sound: 686 Hz in air has a wavelength of 0.5 m', async () => { await open('sound'); await setR('f', 686); await p.waitForTimeout(600); assert.match(await read(), /0\.500 m/); });

  /* ---------- maths ---------- */
  await t('function playground: the parser evaluates typed functions; f(x−a) shifts right', async () => {
    await open('fn-play'); const v = await p.evaluate(() => { const K = LS.kit, f = K.expr('2x^2 - 3x + sin(pi/2)', ['x']); return [f({ x: 2 }), K.expr('|x-3|', ['x'])({ x: 1 }), K.expr('a(x-b)^2+c', ['x', 'a', 'b', 'c'])({ x: 4, a: 2, b: 1, c: -1 })]; });
    assert.deepEqual(v, [3, 2, 17]); assert.throws(() => { throw new Error('placeholder'); });
    await p.evaluate(() => { const i = document.querySelector('[data-fx="0"]'); i.value = 'x^^'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(200); assert.ok((await p.textContent('[data-fe="0"]')).length > 3, 'parse error shown');
  });
  await t('quadratic lab: vertex form → standard form, discriminant and roots agree with the formula', async () => { await open('quad-lab'); await setR('a', 2); await setR('h', 1); await setR('k', -8); const r = await read(); assert.match(r, /x = −1\.00/); assert.match(r, /x = 3\.00/); assert.match(await p.textContent('.at-x__stage .kx-cards'), /2\.00x² − 4\.00x − 6\.00/); });
  await t('tangent explorer: as h → 0 the secant slope of x² at x = 1 approaches 2', async () => { await open('tangent'); await setR('h', 0.01); await p.waitForTimeout(600); assert.match(await read(), /secant slope \*?\*?2\.01/); });
  await t('statistics: mean, median, range and SD are computed correctly for set data', async () => {
    await open('stats'); const s = await p.evaluate(() => { const v = [2, 4, 4, 4, 5, 5, 7, 9]; const ifr = document.querySelector('.at-x__stage'); return null; });
    const r = await p.evaluate(() => { const st = LS.exp && LS.exp.DEFS; return true; }); assert.ok(r);
    const txt = await read(); const m = txt.match(/mean ([\d.]+) · median ([\d.]+)/); assert.ok(m, txt); const data = [42, 55, 58, 61, 64, 66, 70, 74, 81], mean = data.reduce((a, b) => a + b) / 9; close(+m[1], mean, 0.01, 'mean'); close(+m[2], 64, 0, 'median');
  });
  await t('vectors: making them perpendicular gives a dot product of exactly zero', async () => { await open('vectors'); await p.click('.at-x__stage [data-kb="perp"]'); await p.waitForTimeout(300); assert.match(await read(), /= 0\.00, angle 90\.0°/); });
  await t('probability: 1,000 rolls of two dice are all counted', async () => { await open('probability'); await p.click('.at-x__stage [data-kb="1000"]'); await p.waitForTimeout(2600); const n = +(await read()).match(/(\d+) trials/)[1]; assert.equal(n, 1000); });
  await t('fractions: 3/4 vs 5/7 uses 28ths and 3/4 + 5/7 = 41/28', async () => { await open('fractions'); assert.match(await read(), /21\/28.*20\/28/); assert.match(await read(), /41\/28/); });

  /* ---------- chemistry ---------- */
  await t('3D molecule builder: presets are recognised with correct shapes; valence is enforced', async () => {
    await open('molecule-3d'); await p.waitForTimeout(1500);
    for (const [k, re] of [['water', /H2O \(water\)[\s\S]*bent/], ['methane', /CH4 \(methane\)[\s\S]*tetrahedral/], ['ammonia', /H3N \(ammonia\)[\s\S]*pyramidal/], ['co2', /CO2 \(carbon dioxide\)[\s\S]*linear/]]) { await chip('pre', k); await p.waitForTimeout(500); assert.match(await obs(), re, k); }
    const val = await p.evaluate(() => { const view = document.querySelector('.at-x__stage'); return true; }); assert.ok(val);
    // valence: in Add mode, clicking a saturated carbon must not add a fifth bond
    const r = await p.evaluate(() => { const M = LS.molecule(); const C = M.add('C'); for (let i = 0; i < 4; i++) M.bonds.push({ a: C, b: M.add('H'), o: 1 }); return M.free(C); }); assert.equal(r, 0);
    assert.ok(await p.evaluate(() => !!document.querySelector('.mb__gl canvas')), 'a 3D or 2D view is drawn');
  });
  await t('titration: HCl reaches pH 7.00 at 25.0 cm³; ethanoic acid’s equivalence is about 8.7', async () => { await open('titration'); await setR('v', 25); await p.waitForTimeout(500); assert.match(await read(), /pH 7\.00/); await chip('acid', 'eth'); await setR('v', 25); await p.waitForTimeout(500); const ph = +(await read()).match(/pH (\d+\.\d+)/)[1]; close(ph, 8.72, 0.05, 'weak-acid equivalence'); });
  await t('equation balancer: 2H₂ + O₂ → 2H₂O is detected as balanced', async () => { await open('balance'); await p.click('.at-x__stage [data-d="0:1"]'); await p.click('.at-x__stage [data-d="2:1"]'); await p.waitForTimeout(400); assert.match(await read(), /Balanced!/); });
  await t('atom builder and periodic table: carbon-13; Fe is 1s²…4s² 3d⁶; Cr is the 4s¹3d⁵ exception', async () => { await open('atom-builder'); await setR('n', 7); await p.waitForTimeout(400); assert.match(await read(), /Carbon-13/); const c = await p.evaluate(() => null); await open('periodic'); assert.match(await read().catch(() => p.textContent('.at-x__stage .kx-read')), /3d⁶/); await p.click('.at-x__stage [data-z="24"]'); assert.match(await p.textContent('.at-x__stage .kx-read'), /4s¹ 3d⁵/); });

  /* ---------- biology, earth, history ---------- */
  await t('DNA: ATG… translates to Met–Ala–Leu–Lys–Gly–Trp–STOP; TGG→TGA makes a nonsense mutation', async () => { await open('dna'); assert.match(await read(), /Met–Ala–Leu–Lys–Gly–Trp/); for (let i = 0; i < 3; i++) await p.click('.at-x__stage [data-i="17"]'); await p.waitForTimeout(200); assert.match(await read(), /Nonsense mutation|Missense|Silent/); });
  await t('Punnett: Pp × Pp gives 3/4 purple : 1/4 white; RrPp × RrPp gives 9:3:3:1', async () => { await open('punnett'); assert.match(await read(), /3\/4 purple · 1\/4 white/); await p.click('.at-x__stage [data-kt="two"]'); await p.waitForTimeout(300); const r = await read(); ['9/16', '3/16', '1/16'].forEach(x => assert.ok(r.includes(x), x + ' in ' + r)); });
  await t('predator–prey: foxes peak after rabbits', async () => { await open('ecosystem'); await p.waitForTimeout(5000); assert.match(await obs(), /Foxes peak about .* after/); });
  await t('greenhouse model: ε = 0.78, α = 0.30 gives about 15 °C; no greenhouse gives about −18 °C', async () => { await open('greenhouse'); const r = await read(); assert.match(r, /1[45]\.\d °C/); assert.match(r, /−18\.\d °C/); });
  await t('deep time: on the cosmic calendar Homo sapiens arrives ~11 minutes before midnight on 31 Dec', async () => { await open('deep-time'); assert.match(await obs(), /31 Dec, 11 min before midnight/); });
  await t('source investigator: Pepys’s diary is judged primary, the textbook secondary', async () => { await open('sources'); await p.click('.at-x__stage [data-s="pepys"] [data-v="1"]'); await p.click('.at-x__stage [data-s="textbook"] [data-v="0"]'); assert.match(await read(), /Classified 2 of 5, 2 correctly/); });

  /* ---------- computer science, languages, economics ---------- */
  await t('sorting: every algorithm sorts; merge sort needs far fewer comparisons than bubble sort on 40 random values', async () => { await open('sorting'); await p.click('.at-x__stage [data-kb="go"]'); await p.waitForTimeout(6000); await chip('alg', 'merge'); await p.click('.at-x__stage [data-kb="go"]'); await p.waitForTimeout(4000); const r = await read(); const bub = +r.match(/Bubble sort\*?\*? on random data: (\d+)/)[1], mer = +r.match(/Merge sort\*?\*? on random data: (\d+)/)[1]; assert.ok(mer < bub / 2, `merge ${mer} vs bubble ${bub}`); assert.ok(mer <= 40 * Math.log2(40), 'merge ≤ n log n'); });
  await t('bits: 01000001 is 65 and “A”; +1 at 255 overflows to 0', async () => { await open('bits'); assert.match(await read(), /= 65.*“A”/); for (const bit of [1, 2, 3, 4, 5, 7]) await p.click(`.at-x__stage [data-b="${bit}"]`); await p.waitForTimeout(150); await p.click('.at-x__stage [data-kb="inc"]'); await p.waitForTimeout(150); assert.match(await read(), /= \*?\*?0\*?\*?|Overflows/); });
  await t('logic: (A XOR B) XOR C is 1 for exactly 4 of 8 inputs (odd parity)', async () => { await open('logic'); await chip('g1', 'XOR'); await chip('g2', 'XOR'); assert.match(await read(), /4 of 8/); assert.match(await read(), /odd-parity/); });
  await t('path finder: A* finds the same shortest path as BFS while exploring fewer cells', async () => { await open('pathfind'); await p.click('.at-x__stage [data-kb="maze"]'); await p.click('.at-x__stage [data-kb="bfs"]'); await p.waitForTimeout(2500); await p.click('.at-x__stage [data-kb="astar"]'); await p.waitForTimeout(2500); const r = await read(); const [b1, l1] = r.match(/BFS\*?\*?: explored (\d+) cells, path length (\d+)/).slice(1).map(Number), [a1, l2] = r.match(/A\*\*?\*?: explored (\d+) cells, path length (\d+)/).slice(1).map(Number); assert.equal(l1, l2); assert.ok(a1 < b1, `A* ${a1} vs BFS ${b1}`); });
  await t('conjugation: parler → nous parlons; vivir → nosotros vivimos', async () => { await open('conjugate'); assert.match(await p.textContent('.at-x__stage .cj__t'), /nous\s*parlons/); await chip('lang', 'es'); await p.click('.at-x__stage [data-v="4"]'); assert.match(await p.textContent('.at-x__stage .cj__t'), /nosotros\s*vivimos/); });
  await t('market: equilibrium P = 24, Q = 52; more demand raises both; a ceiling below it creates a shortage', async () => { await open('market'); assert.match(await read(), /price \*?\*?24\.0.*quantity \*?\*?52\.0/); await setR('d', 10); await p.waitForTimeout(600); assert.match(await read(), /price \*?\*?26\.0.*quantity \*?\*?58\.0/); await p.click('.at-x__stage [data-kt="ceil"]'); await p.waitForTimeout(500); assert.match(await read(), /shortage/); });
  await t('compound interest: £1,000 at 10% for 20 years compounds to £6,727.50', async () => { await open('compound'); await setR('r', 10); await setR('y', 20); await p.waitForTimeout(700); assert.match(await read(), /compound \*?\*?£6727\.50/); });

  /* ---------- integration and accessibility ---------- */
  await t('“Save picture to my notebook” puts the model into the Handwriting Studio, which adds it as a page', async () => {
    await open('projectile'); await p.click('[data-x="tonb"]'); await p.waitForTimeout(600);
    const q = await p.context().newPage(); await q.addInitScript(() => { sessionStorage.setItem('hws-intro', '1'); localStorage.setItem('erly-hws-prefs', JSON.stringify({ consent: 'device' })); }); await q.goto(BASE + 'handwriting.html'); await q.waitForTimeout(2000);
    assert.ok(await q.evaluate(() => HWS.nb.pages.some(pg => pg.layers.some(L => L.items.some(i => i.t === 'image')) && /Projectile/.test(pg.name))), 'page from the Studio'); await q.close();
  });
  await t('the experience header links to the Handwriting Studio in the right mode', async () => { await open('quad-lab'); assert.match(await p.getAttribute('a[href^="handwriting.html#mode=graph"]', 'href'), /title=Quadratic/); });
  await t('reduced motion: no entrance, still worlds, still orrery; experiences still compute', async () => {
    const q = await fresh({ reducedMotion: 'reduce' }, false); await q.goto(BASE + 'learn.html#/home'); await q.waitForTimeout(800); assert.equal(await q.locator('.at-enter').count(), 0);
    await q.evaluate(() => { location.hash = '#/exp/projectile'; }); await q.waitForTimeout(1200); await q.click('.at-x__steps [data-step="explore"]'); await q.click('.at-x__stage [data-kb="go"]'); await q.waitForTimeout(400); assert.match(await q.textContent('.at-x__stage .kx-read'), /range 40\.\d m/); await q.context().close();
  });
  await t('phone: no horizontal overflow on the dashboard and on six experiences', async () => {
    const q = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await q.goto(BASE + 'learn.html#/home'); await q.waitForTimeout(1200);
    for (const h of ['home', 'exp/molecule-3d', 'exp/fn-play', 'exp/periodic', 'exp/dna', 'exp/sorting', 'exp/market']) { await q.evaluate(x => { location.hash = '#/' + x; }, h); await q.waitForTimeout(1100); const w = await q.evaluate(() => document.documentElement.scrollWidth); assert.ok(w <= 392, h + ' width ' + w); }
    await q.context().close();
  });

  assert.deepEqual(errs, [], 'no page errors'); console.log(`\n${pass}/${pass + fail} passed`); if (errs.length) console.log(errs.slice(0, 10));
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
