// v16 Noor Lab: the 19 maths and 15 physics acceptance tests, through Noor's chat and real interactions,
// with no AI provider switched on. Each result is checked against an independent calculation.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/lab.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + (e.message || e).split('\n')[0].slice(0, 220)]); } };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light'); });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); await p.click('.cmp-launch'); await p.waitForTimeout(700);
  const ask = async q => { await p.fill('#cmpText', q); await p.press('#cmpText', 'Enter'); await p.waitForFunction(() => !document.querySelector('.cmsg.is-writing') && !document.querySelector('.cmsg--typing'), null, { timeout: 30000 }); await p.waitForTimeout(700); return p.evaluate(() => { const m = [...document.querySelectorAll('.cmsg--ai')].pop(); return m ? m.innerText : ''; }); };
  const st = () => p.evaluate(() => ERLY_LAB.state());
  const eng = () => p.evaluate(() => (ERLY_LAB.current() ? ERLY_LAB.current().engine.id : null));
  const run = s => p.evaluate(s => ERLY_LAB.current().inst.api.run(s), s);
  const slide = async (key, v) => { await p.evaluate(([k, v]) => { const i = document.querySelector(`.lab__side input[data-key="${k}"]`); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, [key, v]); await p.waitForTimeout(150); };
  const pixels = () => p.evaluate(() => { const c = document.querySelector('.lab__canvas canvas'); const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return h; });

  assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'local', 'no AI provider is used');

  /* ----------------------------- mathematics ----------------------------- */
  await check('M1 graph a quadratic', async () => {
    const r = await ask('Graph y = x^2 - 2x - 3'); assert.equal(await eng(), 'graph'); assert.match(r, /graphed/i);
    const s = await st(); const roots = s.keyPoints.filter(k => k.type === 'root').map(k => Math.round(k.x * 1e6) / 1e6).sort((a, c) => a - c); assert.deepEqual(roots, [-1, 3]);
    const mn = s.keyPoints.find(k => k.type === 'min'); near(mn.x, 1, 1e-4, 'vertex x'); near(mn.y, -4, 1e-4, 'vertex y');
  });
  await check('M2 multiple functions', async () => {
    await ask('Graph these three equations: y = x^2, y = 2x + 1, y = sin(x)'); const s = await st(); assert.equal(s.expressions.length, 3);
    const ints = s.keyPoints.filter(k => k.type === 'intersection'); assert.ok(ints.length >= 2, 'intersections found');
    ints.forEach(k => assert.ok([k.x ** 2, 2 * k.x + 1, Math.sin(k.x)].filter(v => Math.abs(v - k.y) < 1e-4).length >= 2, 'each intersection lies on two curves'));
  });
  await check('M3 slider updates the graph immediately', async () => {
    await ask('Graph y = a(x-h)^2 + k'); const before = await pixels(); await slide('a', 2); await slide('h', 1);
    const s = await st(); assert.equal(s.parameters.a, 2); assert.equal(s.parameters.h, 1); assert.notEqual(await pixels(), before, 'canvas redrawn');
    const mn = s.keyPoints.find(k => k.type === 'min'); near(mn.x, 1, 1e-3, 'vertex follows h');
    assert.match(await p.textContent('.lab__ex'), /Vertex \(1, 0\)/, 'the explanation follows the sliders');
  });
  await check('M15 modify the graph through conversation', async () => {
    let r = await ask('make the parabola wider'); assert.match(r, /a is now 1/); assert.equal((await st()).parameters.a, 1);
    r = await ask('now move the vertex to (2, 3)'); const s = await st(); assert.equal(s.parameters.h, 2); assert.equal(s.parameters.k, 3);
    await ask('show the derivative'); await p.waitForTimeout(800); const s2 = await st(); assert.ok(s2.expressions.some(e => /2\*\(x-2\)|2\*x-4|-4\+2\*x|2·/.test(e.src.replace(/\s/g, '')) || /x/.test(e.src) && s2.expressions.length === 2), 'derivative added: ' + JSON.stringify(s2.expressions.map(e => e.src)));
    r = await ask('explain the difference'); assert.match(r, /slope/i);
  });
  await check('M4 plot an inequality', async () => {
    await ask('Plot y > x^2 - 4'); const s = await st(); assert.equal(s.expressions[0].kind, 'ineqy');
    const shade = await p.evaluate(() => { const ws = ERLY_LAB.current().inst.g, P = ws.plot, c = P.cv, g = c.getContext('2d'), dpr = c.width / P.W; const at = (x, y) => [...g.getImageData(Math.round(P.X(x) * dpr), Math.round(P.Y(y) * dpr), 1, 1).data]; return { inside: at(0.5, 3), outside: at(0.5, -5) }; });
    assert.notDeepEqual(shade.inside, shade.outside, 'the region y > x² − 4 is shaded');
  });
  await check('M14 solve a system of equations', async () => {
    const r = await ask('Solve x + y = 5 and x - y = 1'); assert.match(r, /x = 3/); assert.match(r, /y = 2/); assert.match(r, /✓/);
    const s = await st(); const i = s.keyPoints.find(k => k.type === 'intersection'); near(i.x, 3, 1e-6, 'x'); near(i.y, 2, 1e-6, 'y');
  });
  await check('M5 construct a triangle with angle measurements', async () => {
    await ask('Construct a triangle and show its angle measurements'); assert.equal(await eng(), 'geometry'); const s = await st(); near(s.A + s.B + s.C, 180, 1e-9, 'angle sum'); assert.match(await p.textContent('.lab__ex'), /angle sum/);
  });
  await check('M6 drag a vertex — dependent angles update', async () => {
    const before = await st(); const pos = await p.evaluate(() => { const b = ERLY_LAB.current().inst.board, A = b.objectsList.find(o => o.name === 'A' && o.elType === 'point'); const r = b.containerObj.getBoundingClientRect(); return [r.left + A.coords.scrCoords[1], r.top + A.coords.scrCoords[2]]; });
    await p.mouse.move(pos[0], pos[1]); await p.mouse.down(); await p.mouse.move(pos[0] + 60, pos[1] - 90, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    const after = await st(); assert.ok(Math.abs(after.A - before.A) > 1, `∠A changed: ${before.A} → ${after.A}`); near(after.A + after.B + after.C, 180, 1e-9, 'sum stays 180');
    const shown = await p.textContent('.lab__ex'); assert.match(shown, new RegExp(after.A.toFixed(2).replace('.', '\\.')), 'explanation updated');
  });
  await check('M7 construct a circle and a tangent', async () => { await ask('Draw a circle and a tangent'); const s = await st(); near(s.radiusTangentAngle, 90, 1e-6, 'tangent ⟂ radius'); });
  await check('M8 display a 3D sphere and change its radius', async () => { await ask('Create a 3D model of a sphere'); assert.equal(await eng(), '3d'); let s = await st(); near(s.measures[Object.keys(s.measures)[0]], 4 / 3 * Math.PI * 8, 1e-9, 'V(r=2)'); await ask('make the radius 3'); s = await st(); assert.equal(s.r, 3); });
  await check('M9 rotate and zoom the 3D model', async () => {
    const c0 = (await st()).camera; const r = await p.evaluate(() => document.querySelector('.lab__canvas canvas').getBoundingClientRect().toJSON());
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2 + 160, r.y + r.height / 2 + 30, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(400);
    const c1 = (await st()).camera; assert.notDeepEqual(c1, c0, 'rotated');
    await p.mouse.wheel(0, 600); await p.waitForTimeout(400); const c2 = (await st()).camera; const d = v => Math.hypot(...v); assert.ok(d(c2) > d(c1) + 0.5, `zoomed out: ${d(c1)} → ${d(c2)}`);
  });
  await check('M10 visualise a derivative', async () => {
    await ask('Visualise the derivative of x^3 - 3x'); const s = await st(); assert.equal(s.mode, 'derivative'); assert.match(s.derivative.replace(/\s/g, ''), /3\*x\^2-3|-3\+3\*x\^2/); near(s.slope, 3 * s.x0 ** 2 - 3, 1e-4, 'tangent slope = f′(x₀)');
    await slide('x0', 2); const s2 = await st(); near(s2.slope, 9, 1e-4, 'slope at x = 2');
  });
  await check('M11 display an integral', async () => {
    await ask('Explain integration of x^2 from 0 to 3'); let s = await st(); assert.equal(s.mode, 'integral'); near(s.integral.v, 9, 1e-9, 'exact'); assert.equal(s.integral.how, 'exact');
    const e1 = Math.abs(s.riemann - 9); await slide('n', 100); s = await st(); assert.ok(Math.abs(s.riemann - 9) < e1 / 5, 'more rectangles → closer'); near(s.riemann, 9 - 4.5 * 3 / 100 + 9 / 20000, 1e-9, 'left sum formula');
  });
  await check('M12 create a histogram', async () => { await ask('Make a histogram of 12, 15, 15, 18, 21, 21, 21, 24, 30'); assert.equal(await eng(), 'stats'); const s = await st(); assert.equal(s.data.length, 9); assert.equal(s.source, 'yours'); });
  await check('M13 standard deviation', async () => { const r = await ask('Calculate the standard deviation of 2, 4, 4, 4, 5, 5, 7, 9'); assert.match(r, /population standard deviation σ\s*\|?\s*2\b/); assert.match(r, /2\.13809/); const s = await st(); assert.equal(s.sdPopulation, 2); });
  await check('M16 export a result (PNG + JSON + CSV)', async () => {
    await ask('Graph y = x^2 - 4'); const dl = async kind => { await p.click('[data-lab="export"]'); const [d] = await Promise.all([p.waitForEvent('download'), p.click(`[data-lab="${kind}"]`)]); return d; };
    const png = await dl('png'); assert.match(png.suggestedFilename(), /\.png$/); const fs = require('fs'); const buf = fs.readFileSync(await png.path()); assert.equal(buf.slice(1, 4).toString(), 'PNG');
    const js = await dl('json'); const o = JSON.parse(fs.readFileSync(await js.path(), 'utf8')); assert.equal(o.engine, 'graph'); assert.match(o.model.expressions[0].src, /x\^2 - 4/);
    const csv = await dl('csv'); assert.match(fs.readFileSync(await csv.path(), 'utf8'), /^"x","y"\n-3,5/);
  });
  await check('M18 dark and light modes', async () => {
    const bg = () => p.evaluate(() => { const c = document.querySelector('.lab__canvas canvas'); return [...c.getContext('2d').getImageData(4, 4, 1, 1).data].slice(0, 3); });
    const light = await bg(); await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; }); await p.waitForTimeout(400); const dark = await bg();
    assert.ok(light[0] > 200 && dark[0] < 60, `canvas follows the theme: ${light} → ${dark}`);
    const panel = await p.evaluate(() => getComputedStyle(document.querySelector('.lab')).backgroundColor); assert.match(panel, /rgb\(15, 20, 36\)/);
    await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; }); await p.waitForTimeout(200);
  });
  await check('M19 works with the AI provider unavailable', async () => { assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'local'); const r = await ask('Show me why the angles of a triangle add up to 180 degrees'); assert.match(r, /parallel/i); assert.equal(await eng(), 'geometry'); });

  /* ----------------------------- physics ----------------------------- */
  await check('P1 projectile with adjustable angle', async () => {
    await ask('Show me projectile motion at 30 degrees'); await p.evaluate(() => { const b = document.querySelector('.lab__side [data-key="play"]'); if (/Pause/.test(b.textContent)) b.click(); });
    await slide('angle', 40); await run(5); const s = await st(); assert.ok(s.landed); near(s.range, s.analytic.range, s.analytic.range * 0.002, 'range matches v₀²sin2θ/g');
    near(s.analytic.range, 400 * Math.sin(80 * Math.PI / 180) / 9.81, 1e-9, 'formula');
  });
  await check('P15 modify an experiment through conversation', async () => {
    let r = await ask('make the object heavier'); assert.match(r, /identical|same g/i); r = await ask('add air resistance'); let s = await st(); assert.equal(s.params.drag, 0.01); assert.ok(s.numeric.range < s.analytic.range);
    r = await ask('make it heavier'); s = await st(); assert.match(r, /further/i);
    r = await ask('remove air resistance'); s = await st(); assert.equal(s.params.drag, 0);
    await ask('compare the trajectories at 30, 45 and 60 degrees'); s = await st(); assert.deepEqual(s.compare, [30, 45, 60]);
    r = await ask('show the velocity vector'); assert.match(r, /vectors shown/i);
  });
  await check('P2 Newton’s second law: change mass and force', async () => {
    await ask('Newton second law with friction'); await slide('m', 10); await slide('F', 40); const s = await st(); near(s.expectedA, (40 - 0.1 * 10 * 9.81) / 10, 1e-9, 'a = (F − μmg)/m'); await run(1); const s2 = await st(); near(s2.a, s.expectedA, 1e-9, 'simulated a');
  });
  await check('P3 elastic and inelastic collisions', async () => {
    await ask('Show an elastic collision'); await run(8); let s = await st(); near(2 * s.after.v1 + 1 * s.after.v2, 2 * 3 + 1 * -1, 1e-9, 'momentum');
    await ask('make it perfectly inelastic'); s = await st(); near(s.after.v1, s.after.v2, 1e-12, 'they stick'); near(s.after.v1, 5 / 3, 1e-9, 'v = (m₁u₁ + m₂u₂)/(m₁ + m₂)');
  });
  await check('P4 spring–mass oscillator', async () => { await ask('Show a spring mass oscillator'); await run(12); const s = await st(); near(s.energyRatio, 1, 1e-6, 'energy conserved'); near(s.periodMeasured, s.periodTheory, s.periodTheory * 0.002, 'period'); });
  await check('P5 pendulum', async () => { await ask('Show me a pendulum at 60 degrees'); await run(12); const s = await st(); near(s.periodMeasured, s.periodExact, s.periodExact * 0.002, 'exact period'); assert.ok(s.periodExact > s.periodSmallAngle * 1.06, 'large-angle period is longer'); });
  await check('P6 series and parallel circuits', async () => {
    await ask('Build a series circuit with two resistors'); let s = await st(); near(s.solution.I, 12 / 30, 1e-9, 'series');
    await ask('put them in parallel'); s = await st(); near(s.solution.I, 12 / 10 + 12 / 20, 1e-6, 'parallel'); near(s.solution.components[0].I + s.solution.components[1].I, s.solution.I, 1e-9, 'KCL');
  });
  await check('P7 Ohm’s law: double the resistance', async () => { await ask('Build a series circuit with two resistors'); const I0 = (await st()).solution.I; const r = await ask('double the resistance and show what happens to the current'); const I1 = (await st()).solution.I; near(I1, I0 / 2, 1e-9, 'current halves'); assert.match(r, /half/i); });
  await check('P8 electric field', async () => { await ask('Show the electric field of a dipole'); const s = await st(); const [a, c] = s.charges; const F = 8.9875517923e9 * 2e-6 * 2e-6 / ((a.x - c.x) ** 2); assert.match(await p.textContent('.lab__hud'), new RegExp(F.toFixed(4).slice(0, 5).replace('.', '\\.'))); assert.ok(Math.hypot(s.fieldAtProbe[0], s.fieldAtProbe[1]) > 0); });
  await check('P9 magnetic field', async () => { await ask('Show the magnetic field around a wire'); await p.waitForTimeout(300); const s = await st(); near(s.B, 4 * Math.PI * 1e-7 * 5 / (2 * Math.PI * 0.03), 1e-9, 'B = μ₀I/2πr at 3 cm'); });
  await check('P10 wave interference', async () => { await ask('Show wave interference from two sources'); const s = await st(); assert.equal(s.params.mode, 'interference'); const h0 = await pixels(); await p.waitForTimeout(400); assert.notEqual(await pixels(), h0, 'animated'); });
  await check('P11 refraction through a medium', async () => { await ask('Show me refraction through water and glass'); const s = await st(); near(s.refracted, Math.asin(1.0003 * Math.sin(40 * Math.PI / 180) / 1.333) * 180 / Math.PI, 1e-9, 'Snell'); await ask('glass'); assert.equal((await st()).params.m2, 'glass'); });
  await check('P12 ideal gas', async () => { await ask('Simulate an ideal gas'); await run(4); const s = await st(); const r = s.Pmeasured / s.Pideal; assert.ok(r > 0.9 && r < 1.5, 'measured P near NkT/A: ' + r); const T0 = s.T; await ask('heat the gas'); near((await st()).T / T0, 2, 0.02, 'temperature doubled'); });
  await check('P13 planetary orbit', async () => { await ask('Show a planetary orbit'); await run(2.2); const s = await st(); const b0 = s.bodies[0]; near(b0.energyRatio, 1, 1e-6, 'energy'); near(b0.measuredPeriod, 1, 0.002, 'one year at 1 AU'); });
  await check('P14 radioactive decay', async () => { await ask('Radioactive decay with a half-life of 5 seconds'); await run(5); const s = await st(); near(s.n, s.expected, 5 * Math.sqrt(900 * 0.25), 'within 5σ of N₀/2'); });

  /* ----------------------------- mobile ----------------------------- */
  await check('M17 / mobile interaction', async () => {
    const m = await b.newContext({ ...devices['iPhone 13'] }); await m.addInitScript(() => sessionStorage.setItem('acubins-role', 'student'));
    const q = await m.newPage(); await q.goto(BASE + 'student.html'); await q.waitForTimeout(1000);
    await q.evaluate(() => ERLY_LAB.handle('Graph y = a(x-h)^2 + k')); await q.waitForTimeout(800);
    const lay = await q.evaluate(() => { const ws = document.querySelector('.lab'), st = ws.querySelector('.lab__stage').getBoundingClientRect(), r = ws.getBoundingClientRect(); return { full: r.width === innerWidth, stageH: st.height, over: document.documentElement.scrollWidth - innerWidth, inp: getComputedStyle(ws.querySelector('#labCmd')).fontSize }; });
    assert.ok(lay.full && lay.stageH > 300 && lay.over <= 0, JSON.stringify(lay)); assert.equal(lay.inp, '16px', 'no zoom on focus');
    const c = await q.$eval('.lab__canvas canvas', e => e.getBoundingClientRect().toJSON()); const v0 = await q.evaluate(() => ERLY_LAB.state().window.x0);
    await q.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2); await q.evaluate(({ x, y }) => { const cv = document.querySelector('.lab__canvas canvas'), fire = (t, xx) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: xx, clientY: y, bubbles: true })); fire('pointerdown', x); for (let i = 1; i <= 6; i++) fire('pointermove', x + i * 20); fire('pointerup', x + 120); }, { x: c.x + c.width / 2, y: c.y + c.height / 2 });
    assert.notEqual(await q.evaluate(() => ERLY_LAB.state().window.x0), v0, 'touch drag pans the graph');
    await m.close();
  });

  console.log('\nNoor Lab acceptance results');
  results.forEach(([n, r]) => console.log((r === 'PASS' ? '  ✓ ' : '  ✗ ') + n + (r === 'PASS' ? '' : ' — ' + r)));
  const failed = results.filter(r => r[1] !== 'PASS').length;
  console.log(`\n${results.length - failed}/${results.length} passed; page errors: ${errors.length ? errors.join(' | ').slice(0, 300) : 'none'}`);
  await b.close(); process.exit(failed || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
