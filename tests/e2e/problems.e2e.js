// v17 acceptance tests A–J: a real question typed into Noor becomes THAT situation as a computed model, and every
// number is checked here against an independent calculation. Plus scene-spec validation and the coverage page.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/problems.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + (e.message || e).split('\n')[0].slice(0, 240) + ' @' + ((e.stack || '').match(/e2e.js:(\d+)/) || [])[1]]); } };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const g = 9.81, K = 8.9875517923e9;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light'); });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); await p.click('.cmp-launch'); await p.waitForTimeout(700);
  const ask = async q => { const n = await p.locator('.cmsg--ai').count(); await p.fill('#cmpText', q); await p.press('#cmpText', 'Enter'); await p.waitForFunction(n => document.querySelectorAll('.cmsg--ai').length > n && !document.querySelector('.cmsg.is-writing') && !document.querySelector('.cmsg--typing'), n, { timeout: 15000 }); await p.waitForTimeout(400); return p.evaluate(() => [...document.querySelectorAll('.cmsg--ai')].pop().innerText); };
  const eng = () => p.evaluate(() => (ERLY_LAB.current() ? ERLY_LAB.current().engine.id : null));
  const st = () => p.evaluate(() => ERLY_LAB.state());
  const run = s => p.evaluate(s => { const a = ERLY_LAB.current().inst.api; a.st.running = false; a.run(s); }, s);
  const set = (k, v) => p.evaluate(([k, v]) => ERLY_LAB.current().inst.api.set(k, v), [k, v]);
  assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'local', 'no AI provider is used');

  await check('A1 rotational: block + massive pulley + string + friction', async () => {
    const r = await ask('A 2 kg block on a rough horizontal table (coefficient of friction 0.2) is connected by a light string over a pulley of mass 1 kg and radius 10 cm to a hanging 3 kg mass. Find the acceleration and the tensions.');
    assert.equal(await eng(), 'rigid'); assert.match(r, /a = 4\.637/);
    const m1 = 2, m2 = 3, M = 1, R = 0.1, mu = 0.2, I = 0.5 * M * R * R, a = (m2 - mu * m1) * g / (m1 + m2 + I / R / R), T1 = m1 * (a + mu * g), T2 = m2 * (g - a);
    let s = await st(); near(s.res.a, a, 1e-9, 'a'); near(s.res.T1, T1, 1e-9, 'T1'); near(s.res.T2, T2, 1e-9, 'T2');
    near((s.res.T2 - s.res.T1) * R, I * s.res.alpha, 1e-9, 'torque = Iα');
    await p.evaluate(() => ERLY_LAB.current().inst.api.init()); await run(0.6); s = await st(); near(s.v, a * s.t, 1e-6, 'simulated v = at'); near(s.x, 0.5 * a * s.t * s.t, 1e-3, 'simulated x');
    const E = m2 * g * s.x - (0.5 * (m1 + m2) * s.v * s.v + 0.5 * I * s.w * s.w + mu * m1 * g * s.x); near(E, 0, 1e-3, 'energy balance');
    await ask('make the pulley massless'); s = await st(); near(s.res.T1, s.res.T2, 1e-9, 'massless pulley: equal tensions');
  });
  await check('A2 rotational: rolling vs slipping transition on an incline', async () => {
    const r = await ask('A solid sphere is released on a 40° incline with coefficient of static friction 0.1. Does it roll or slip?');
    assert.equal(await eng(), 'rigid'); assert.match(r, /slips/);
    const need = Math.tan(40 * Math.PI / 180) * 0.4 / 1.4; let s = await st(); near(s.res.fNeed, need, 1e-9, 'friction needed'); assert.equal(s.res.rolling, false);
    await run(0.4); s = await st(); assert.ok(s.v > s.w * 0.25 + 1e-6, 'slipping: v > ωr');
    await set('muS', 0.3); s = await st(); assert.equal(s.res.rolling, true); near(s.res.a, g * Math.sin(40 * Math.PI / 180) / 1.4, 1e-9, 'rolling a = g sinθ/(1+k)');
    await run(0.4); s = await st(); near(s.v, s.w * 0.25, 1e-6, 'rolling: v = ωr');
  });
  await check('B multi-charge electrostatics: forces match Coulomb, Newton III, drag updates', async () => {
    const r = await ask('Three charges: +2 µC at (0,0), −3 µC at (4,0) and +1 µC at (2,3) in cm. Find the net force on each charge.');
    assert.equal(await eng(), 'charges'); assert.match(r, /F1 = /);
    const Q = [[2e-6, 0, 0], [-3e-6, 0.04, 0], [1e-6, 0.02, 0.03]];
    const F = Q.map((a, i) => Q.reduce((s, c, j) => { if (i === j) return s; const dx = a[1] - c[1], dy = a[2] - c[2], r2 = dx * dx + dy * dy, f = K * a[0] * c[0] / r2, rr = Math.sqrt(r2); return [s[0] + f * dx / rr, s[1] + f * dy / rr]; }, [0, 0]));
    let s = await st(); s.F.forEach((f, i) => { near(f[0], F[i][0], 1e-9 * Math.abs(F[i][0]) + 1e-12, 'Fx' + (i + 1)); near(f[1], F[i][1], 1e-9 * Math.abs(F[i][1]) + 1e-12, 'Fy' + (i + 1)); });
    near(s.F.reduce((a, f) => a + f[0], 0), 0, 1e-9, 'ΣFx'); near(s.F.reduce((a, f) => a + f[1], 0), 0, 1e-9, 'ΣFy');
    const before = s.F[0][0];
    await p.evaluate(() => { const i = ERLY_LAB.current().inst.api; i.S.charges[1].x = 0.06; i.init(); i.redraw(); });
    s = await st(); assert.ok(Math.abs(s.F[0][0] - before) > 1, 'moving a charge changes the forces');
  });
  await check('C bounded region between curves', async () => {
    const r = await ask('Find the area of the region bounded by y = x^2 and y = x + 2');
    assert.equal(await eng(), 'area'); assert.match(r, /4\.5/);
    const s = await st(); near(s.area, 4.5, 1e-9, 'area = ∫(x+2−x²) from −1 to 2 = 9/2'); near(s.xs[0], -1, 1e-9, 'left intersection'); near(s.xs[s.xs.length - 1], 2, 1e-9, 'right intersection');
    await ask('Find the area bounded by y = sin(x) and y = 0 from x = 0 to 3.14159265358979'); const s2 = await st(); near(s2.area, 2, 1e-8, '∫ sin from 0 to π = 2');
  });
  await check('D organic mechanism: SN1 stepper with curved arrows; unknown mechanisms are not drawn', async () => {
    const r = await ask('Show the mechanism of SN1 hydrolysis of tert-butyl bromide with curved arrows');
    assert.equal(await eng(), 'mechanism'); assert.match(r, /4 stages/);
    let s = await st(); assert.equal(s.step, 0); assert.equal(s.arrows, 1);
    await p.click('.lab__side [data-key="next"]'); s = await st(); assert.equal(s.step, 1); assert.match(s.title, /Carbocation/);
    await ask('next'); s = await st(); assert.equal(s.step, 2); assert.match(s.title, /oxonium/i);
    await p.evaluate(() => ERLY_LAB.close());
    await ask('Show the mechanism of nitration of benzene'); assert.notEqual(await eng(), 'mechanism', 'a different mechanism is not passed off as this one');
  });
  await check('E circuit topology: bridge network solved by nodal analysis; KCL; topology counts', async () => {
    const r = await ask('R1 = 10 Ω between A and B, R2 = 20 Ω between A and C, R3 = 30 Ω between B and D, R4 = 40 Ω between C and D, R5 = 50 Ω between B and C, 12 V battery between A and D. Analyse the circuit.');
    assert.equal(await eng(), 'netlist'); assert.match(r, /bridge/);
    const s = await st(); assert.equal(s.nodes, 4); assert.equal(s.branches, 6); assert.equal(s.loops, 3); assert.equal(s.bridge, true);
    // independent: unknown VB, VC with VA = 12, VD = 0 — KCL at B and C
    const gB = 1 / 10 + 1 / 30 + 1 / 50, gC = 1 / 20 + 1 / 40 + 1 / 50, a11 = gB, a12 = -1 / 50, a22 = gC, b1 = 12 / 10, b2 = 12 / 20, det = a11 * a22 - a12 * a12, VB = (b1 * a22 - a12 * b2) / det, VC = (a11 * b2 - a12 * b1) / det;
    near(s.V[s.order.indexOf('B')], VB, 1e-9, 'V_B'); near(s.V[s.order.indexOf('C')], VC, 1e-9, 'V_C');
    await ask('R1 = 4 Ω between A and B, R2 = 6 Ω between B and C, R3 = 12 Ω between B and C, 12 V battery between A and C'); const s2 = await st();
    assert.deepEqual(s2.parallel, [['R2', 'R3']]); near(Math.abs(s2.I[3]), 12 / (4 + 4), 1e-9, 'source current with 6∥12 = 4 Ω');
  });
  await check('F gear train: compound ratio, direction and torque', async () => {
    const r = await ask('A compound gear train: gear A with 20 teeth at 120 rpm drives gear B with 40 teeth; gear C with 15 teeth on the same shaft as B drives gear D with 45 teeth. Input torque 10 N·m.');
    assert.equal(await eng(), 'gears'); assert.match(r, /6:1/);
    const s = await st(); assert.deepEqual(s.w, [120, -60, -60, 20]); near(s.ratio, (40 / 20) * (45 / 15), 1e-12, 'ratio'); near(s.torqueOut, 10 * 6 * 0.98 * 0.98, 1e-9, 'torque with 98 % per mesh');
    await ask('A 20 teeth gear at 100 rpm drives a 30 teeth idler which drives a 50 teeth gear'); const s2 = await st(); near(s2.w[2], 100 * 20 / 50, 1e-12, 'idler does not change the ratio'); assert.ok(s2.w[2] > 0, 'two meshes: same direction');
  });
  await check('G distillation: Antoine + Raoult bubble points, stages vs Fenske', async () => {
    const r = await ask('Distillation of a benzene toluene mixture: feed 50% benzene, distillate 95%, bottoms 5%. How many stages at total reflux?');
    assert.equal(await eng(), 'distil'); const s = await st();
    near(s.TA, 80.1, 0.2, 'benzene normal boiling point'); near(s.TB, 110.6, 0.2, 'toluene normal boiling point'); near(s.Tb, 92.1, 0.6, 'equimolar bubble point (textbook ≈ 92 °C)');
    assert.ok(s.stages >= Math.floor(s.fenske) && s.stages <= Math.ceil(s.fenske) + 1, `stages ${s.stages} vs Fenske ${s.fenske}`);
    assert.match(r, /theoretical stages/);
    await ask('distillation of ethanol and water 40%'); assert.match(await p.evaluate(() => [...document.querySelectorAll('.cmsg--ai')].pop().innerText), /non-ideal|azeotrope/);
  });
  await check('H FM: modulation index, Carson bandwidth, Bessel spectrum', async () => {
    const r = await ask('FM: carrier 100 MHz, message 15 kHz, frequency deviation 75 kHz. Find the modulation index and Carson bandwidth.');
    assert.equal(await eng(), 'fm'); assert.match(r, /β = 5/); assert.match(r, /180 kHz/);
    let s = await st(); near(s.power, 1, 1e-6, 'ΣJn² = 1'); near(s.J0, -0.1775967713, 1e-8, 'J0(5)');
    await set('df', 2.404825557695773 * 15e3); s = await st(); near(s.J0, 0, 1e-8, 'carrier vanishes at the first Bessel zero');
  });
  await check('I cardiac cycle: physiological outputs and the right responses', async () => {
    await ask('Simulate the cardiac cycle and show the pressure-volume loop with stroke volume and ejection fraction');
    assert.equal(await eng(), 'heart'); await run(8); const s = await st();
    assert.ok(s.last.EF > 0.45 && s.last.EF < 0.65, 'EF ' + s.last.EF); assert.ok(s.last.CO > 4 && s.last.CO < 6.5, 'CO ' + s.last.CO); assert.ok(s.last.Ps > 110 && s.last.Ps < 145 && s.last.Pd > 65 && s.last.Pd < 95, `BP ${s.last.Ps}/${s.last.Pd}`);
    near(s.last.SV, s.last.EDV - s.last.ESV, 1e-9, 'SV = EDV − ESV');
    await set('Emax', 4); await run(8); const s2 = await st(); assert.ok(s2.last.SV > s.last.SV + 5, 'more contractility → larger stroke volume');
  });
  await check('J break-even model', async () => {
    const r = await ask('Break-even: fixed costs of $50,000, selling price $25 per unit, variable cost $15 per unit, expects to sell 8000 units.');
    assert.equal(await eng(), 'breakeven'); assert.match(r, /5,?000 units/);
    let s = await st(); near(s.be, 50000 / 10, 1e-9, 'BEP'); near(s.profit, 10 * 8000 - 50000, 1e-9, 'profit'); near(s.mos, 3000 / 8000, 1e-12, 'margin of safety');
    await ask('change the price to 30'); s = await st(); near(s.be, 50000 / 15, 1e-9, 'new BEP after a price change');
  });
  await check('scene specs: valid data opens; code, unknown engines, extra keys and out-of-range values are refused', async () => {
    const v = await p.evaluate(async () => { const S = ERLY_LAB.sceneSpec; return [
      (await S.open({ engine: 'breakeven', params: { F: 1000, p: 10, v: 5 } })).ok,
      S.validate({ engine: 'nope', params: {} }).ok,
      S.validate({ engine: 'fm', params: { fm: 'alert(1)' } }).ok,
      S.validate({ engine: 'fm', params: { fm: 1e3 }, onload: 'x' }).ok,
      S.validate({ engine: 'rigid', params: { mu: 7 } }).ok,
      S.validate({ engine: 'area', params: { f: 'x^2; fetch("//evil")' } }).ok,
      S.validate({ engine: 'mechanism', params: { mech: 'sn3' } }).ok,
      ERLY_LAB.state().be]; });
    assert.deepEqual(v, [true, false, false, false, false, false, false, 200]);
  });
  await check('dark theme and phone layout', async () => {
    await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; ERLY_LAB.current().inst.redraw(); });
    const px = await p.evaluate(() => { const c = document.querySelector('.lab__canvas canvas'); const d = c.getContext('2d').getImageData(4, 4, 1, 1).data; return d[0] + d[1] + d[2]; }); assert.ok(px < 120, 'dark canvas');
    const ph = await b.newContext({ ...devices['iPhone 13'] }); await ph.addInitScript(() => sessionStorage.setItem('acubins-role', 'student')); const q = await ph.newPage(); q.on('pageerror', e => errors.push('phone: ' + e.message));
    await q.goto(BASE + 'student.html'); await q.waitForTimeout(900); await q.evaluate(() => ERLY_LAB.sceneSpec.open({ engine: 'gears', params: { teeth: [20, 40, 15, 45], compound: true } })); await q.waitForTimeout(500);
    const ov = await q.evaluate(() => [document.documentElement.scrollWidth <= innerWidth + 1, document.querySelector('.lab__canvas').getBoundingClientRect().height]); assert.ok(ov[0], 'no sideways overflow'); assert.ok(ov[1] > 250, 'stage tall enough: ' + ov[1]);
    await ph.close();
  });
  await check('coverage page: measured live; A–J concepts are interactive; counts add up', async () => {
    const q = await ctx.newPage(); q.on('pageerror', e => errors.push('coverage: ' + e.message));
    await q.goto(BASE + 'coverage.html'); await q.waitForFunction(() => window.ERLY_COVERAGE, null, { timeout: 40000 });
    const c = await q.evaluate(() => ({ n: ERLY_CURRICULUM.list.length, counts: ERLY_COVERAGE.counts, aj: ['Connected bodies over a massive pulley', 'Several point charges', 'Area between curves', 'SN1 mechanism', 'Wheatstone bridge (nodal analysis)', 'Compound gear train', 'Raoult’s law and distillation', 'Frequency modulation', 'Cardiac cycle and P–V loop', 'Break-even analysis'].map(k => ERLY_COVERAGE.rows.find(r => r.concept === k).m.status), rows: document.querySelectorAll('#covAll tbody tr').length }));
    assert.equal(Object.values(c.counts).reduce((a, b2) => a + b2, 0), c.n); assert.equal(c.rows, c.n); assert.deepEqual([...new Set(c.aj)], ['interactive']);
    assert.ok(c.counts.explain > 0, 'concepts with no visual are reported as such');
    await q.selectOption('#covS', 'explain'); assert.equal(await q.locator('#covAll tbody tr').count(), c.counts.explain);
    await q.close();
  });

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  const fail = results.filter(r => r[1] !== 'PASS').length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail || errors.length ? 1 : 0);
})();
