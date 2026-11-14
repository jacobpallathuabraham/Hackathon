// Noor Lab (v16): the maths and physics engines checked against independent calculations.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '../..');
function load() {
  const win = { matchMedia: () => ({ matches: false }), addEventListener() {}, devicePixelRatio: 1 };
  win.window = win;
  // the vendored libraries run exactly as in the browser (as globals), before the page objects exist
  const ctx = vm.createContext(Object.assign(win, { console, setTimeout, clearTimeout, performance }));
  for (const f of ['assets/vendor/mathjs/math.min.js', 'assets/vendor/nerdamer/nerdamer.min.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  Object.assign(ctx, { document: { documentElement: { lang: 'en', dataset: {}, classList: { contains: () => false } }, currentScript: null, addEventListener() {}, querySelector: () => null }, ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver: class { observe() {} } });
  for (const f of ['lab-core.js', 'lab-math.js', 'lab-geo3d.js', 'lab-physics.js']) vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/lab', f), 'utf8'), ctx, { filename: f });
  ctx.ERLY_LAB.__ctx = ctx;
  return ctx.ERLY_LAB;
}
const L = load();
const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} vs ${b}`);

test('numerics: roots, extrema, Simpson, RK4, t-distribution', () => {
  const N = L.num;
  same(N.roots(x => x * x - 4, -5, 5).map(r => +r.toFixed(9)), [-2, 2]);
  assert.equal(N.roots(x => 1 / x, -1, 1).length, 0, 'a pole is not a root');
  const ex = N.extrema(x => x ** 3 - 3 * x, -3, 3); assert.equal(ex.length, 2); close(ex.find(e => e.kind === 'max').x, -1, 1e-6); close(ex.find(e => e.kind === 'min').x, 1, 1e-6);
  close(N.simpson(Math.sin, 0, Math.PI), 2, 1e-9);
  let y = [1]; for (let i = 0; i < 100; i++) y = N.rk4((t, v) => [v[0]], i / 100, y, 0.01); close(y[0], Math.E, 1e-9, 'RK4 e^t');
  close(N.tInv(0.975, 10), 2.228, 2e-3, 't* (df 10)'); close(N.tCdf(2.228, 10), 0.975, 1e-3);
  close(N.normCdf(1.96, 0, 1), 0.975, 1e-3);
});

test('expression reading: implicit multiplication, parameters, piecewise', async () => {
  assert.equal(L.prep('a(x-h)^2 + k'), 'a*(x-h)^2 + k');
  assert.equal(L.prep('2x + sinx'), '2x + sin(x)');
  assert.match(L.prep('ax^2+bx+c'), /a\*x\^2\+b\*x\+c/);
  const c = await L.classify('y = a(x-h)^2 + k'); assert.equal(c.kind, 'fx'); same([...c.params].sort(), ['a', 'h', 'k']);
  assert.equal((await L.classify('x^2 + y^2 = 9')).kind, 'implicit');
  assert.equal((await L.classify('y < 2x + 1')).kind, 'ineqy');
  assert.equal((await L.classify('(cos(t), sin(t))')).kind, 'param');
  assert.equal((await L.classify('r = 2cos(3θ)')).kind, 'polar');
  const pw = await L.classify('y = {x < 0: -x, x^2}'); const m = await L.mathReady(); const sc = x => vm.runInContext(`({ x: ${x} })`, L.__ctx); assert.equal(pw.f.code.evaluate(sc(-3)), 3); assert.equal(pw.f.code.evaluate(sc(2)), 4);
  same(L.extractExprs('Graph these three equations: y = x^2, y = 2x + 1 and y = sin(x)'), ['y = x^2', 'y = 2x + 1', 'y = sin(x)']);
  same(L.extractExprs('graph y = a(x-h)^2 + k'), ['y = a(x-h)^2 + k']);
});

test('algebra answers are computed and checked, never invented', async () => {
  const q = await L.algebra('solve x^2 - 5x + 6 = 0'); assert.match(q.text, /x = 2/); assert.match(q.text, /x = 3/); assert.match(q.text, /Discriminant/); assert.match(q.text, /✓/); assert.doesNotMatch(q.text, /✗/);
  const sys = await L.algebra('solve x + y = 5 and x - y = 1'); assert.match(sys.text, /x = 3/); assert.match(sys.text, /y = 2/); assert.equal(sys.open.id, 'graph');
  assert.match((await L.algebra('factor x^2 - 5x + 6')).text, /\(-2\+x\)|\(x-2\)/);
  assert.match((await L.algebra('expand (x+1)^3')).text, /3\*x\^2|3·x\^2/);
  const d = await L.algebra('differentiate sin(x)*x^2'); assert.match(d.text, /✓/);
  const i = await L.algebra('integrate x^2 from 0 to 3'); assert.match(i.text, /= \*\*9\*\*/);
  const det = await L.algebra('determinant of [[1,2],[3,4]]'); assert.match(det.text, /−2|-2/);
  const inv = await L.algebra('inverse of [[1,2],[3,4]]'); assert.match(inv.text, /✓/);
  const ev = await L.algebra('eigenvalues of [[2,0],[0,3]]'); assert.match(ev.text, /\*\*2\*\*/); assert.match(ev.text, /\*\*3\*\*/);
  const cx = await L.algebra('what is sqrt(-4)'); assert.match(cx.text, /2i/);
  const comp = await L.algebra('solve x^2 + 1 = 0'); assert.match(comp.text, /Complex/);
});

test('statistics match known values', () => {
  const S = L.stats, a = [2, 4, 4, 4, 5, 5, 7, 9];
  assert.equal(S.mean(a), 5); assert.equal(S.median(a), 4.5); same(S.modes(a), [4]);
  assert.equal(S.sd(a, false), 2); close(S.sd(a, true), 2.13809, 1e-5);
  same(S.quartiles([1, 2, 3, 4, 5, 6, 7, 8]), [2.5, 4.5, 6.5]);
  close(S.corr([1, 2, 3], [2, 4, 6]), 1, 1e-12);
});

test('circuits: series, parallel, a Wheatstone bridge and an LED, with Kirchhoff', () => {
  const P = L.phys;
  const s = P.circuit(12, 0, [[{ type: 'R', value: 10 }], [{ type: 'R', value: 20 }]]); close(s.I, 0.4, 1e-9, 'series'); close(Math.abs(s.comps[0].V), 4, 1e-6); close(Math.abs(s.comps[1].V), 8, 1e-6);
  const p = P.circuit(12, 0, [[{ type: 'R', value: 10 }, { type: 'R', value: 20 }]]); close(p.I, 12 / 10 + 12 / 20, 1e-6, 'parallel'); close(p.comps[0].I + p.comps[1].I, p.I, 1e-9, 'KCL');
  const ri = P.circuit(12, 2, [[{ type: 'R', value: 10 }]]); close(ri.I, 1, 1e-9, 'internal resistance');
  // Wheatstone bridge through the raw solver: nodes 1 (top), 2, 3 (middle), 0 (bottom); R1 1→2 100, R2 1→3 200, R3 2→0 300, R4 3→0 400, R5 2→3 500
  const els = [{ type: 'V', a: 1, b: 0, V: 10 }, { type: 'R', a: 1, b: 2, R: 100 }, { type: 'R', a: 1, b: 3, R: 200 }, { type: 'R', a: 2, b: 0, R: 300 }, { type: 'R', a: 3, b: 0, R: 400 }, { type: 'R', a: 2, b: 3, R: 500 }];
  const r = P.solveDC(4, els);
  // hand calculation (nodal): V2 = 7.5862, V3 = 6.8966 (approx)
  const V2 = r.V[2], V3 = r.V[3];
  close((10 - V2) / 100, V2 / 300 + (V2 - V3) / 500, 1e-12, 'KCL at node 2'); close((10 - V3) / 200 + (V2 - V3) / 500, V3 / 400, 1e-12, 'KCL at node 3');
  const led = P.circuit(9, 0, [[{ type: 'R', value: 220 }], [{ type: 'LED', value: 2 }]]); close(led.I, (9 - 2) / 225, 1e-6, 'LED on'); assert.equal(led.comps[1].on, true);
  const ledOff = P.circuit(1.5, 0, [[{ type: 'R', value: 220 }], [{ type: 'LED', value: 2 }]]); close(ledOff.I, 0, 1e-6, 'LED off below its forward voltage');
  const open = P.circuit(12, 0, [[{ type: 'R', value: 10 }], [{ type: 'switch', value: 1, closed: false }]]); close(open.I, 0, 1e-6, 'open switch');
});

test('mechanics: projectile, collisions, Newton, pendulum period', () => {
  const P = L.phys;
  const a = P.projectileAnalytic(20, 45, 9.81, 0); close(a.range, 400 / 9.81, 1e-9);
  const n = P.projectileNumeric(20, 45, 9.81, 0, 0, 1, 1e-3); close(n.range, a.range, 1e-3, 'RK4 = analytic');
  const d = P.projectileNumeric(20, 45, 9.81, 0, 0.01, 1, 1e-3); assert.ok(d.range < a.range, 'drag shortens the range');
  const heavy = P.projectileNumeric(20, 45, 9.81, 0, 0.01, 4, 1e-3); assert.ok(heavy.range > d.range, 'with drag a heavier ball goes further');
  close(P.projectileAnalytic(20, 30, 9.81, 0).range, P.projectileAnalytic(20, 60, 9.81, 0).range, 1e-9, '30° and 60°');
  const el = P.collide(2, 1, 3, -1, 1); close(2 * el.v1 + el.v2, 2 * 3 - 1, 1e-12, 'momentum'); close(0.5 * 2 * el.v1 ** 2 + 0.5 * el.v2 ** 2, 0.5 * 2 * 9 + 0.5, 1e-12, 'elastic KE');
  const st = P.collide(2, 1, 3, -1, 0); close(st.v1, st.v2, 1e-12, 'stick together'); close(st.v1, 5 / 3, 1e-12);
  close(P.newtonAcc(20, 5, 0.1), (20 - 0.1 * 5 * 9.81) / 5, 1e-12); assert.equal(P.newtonAcc(3, 5, 0.1), 0, 'static friction holds');
  close(P.pendulumPeriod(1, 9.81, 0.01), 2 * Math.PI * Math.sqrt(1 / 9.81), 1e-6, 'small angle');
  close(P.pendulumPeriod(1, 9.81, 90) / (2 * Math.PI * Math.sqrt(1 / 9.81)), 1.18034, 1e-4, 'exact period at 90°');
});

test('optics: Snell and the thin-lens equation', () => {
  const P = L.phys;
  close(P.snell(1, 1.5, 30), Math.asin(0.5 / 1.5) * 180 / Math.PI, 1e-12);
  assert.equal(P.snell(1.5, 1, 60), null, 'total internal reflection');
  const r = P.thinLens(10, 30); close(r.v, 15, 1e-12); close(r.m, -0.5, 1e-12);
  const v = P.thinLens(10, 5); assert.ok(v.v < 0 && v.m > 1, 'inside F: virtual and magnified');
});

test('routing: plain language reaches the right engine; ordinary chat does not', () => {
  const R = t => (L.route(t) || {}).id || null;
  const cases = { 'Graph y = a(x-h)^2 + k': 'graph', 'Graph these three equations: y = x^2, y = 2x + 1, y = sin x': 'graph', 'Plot y > x^2 - 4': 'graph', 'Show me why the angles of a triangle add up to 180 degrees': 'geometry', 'Construct a triangle and display its angle measurements': 'geometry', 'Show the intersection of these two circles': 'geometry', 'Draw a circle and a tangent': 'geometry', 'Compare linear and exponential growth': 'graph', 'Explain why this quadratic has two roots: y = x^2 - 5x + 6': 'graph', 'Create a 3D model of a cone': '3d', 'Show the relationship between sine and cosine': 'graph', 'Let me experiment with probability using dice': 'stats', 'Visualise the derivative of x^3 - 3x': 'calculus', 'Explain integration': 'calculus', 'Make a histogram of 3, 5, 5, 6, 8': 'stats', 'Show me projectile motion at 30 degrees': 'projectile', 'Build a series circuit with two resistors': 'circuit', 'Show the magnetic field around this wire': 'bfield', 'Show me refraction through water and glass': 'optics', 'Simulate an ideal gas': 'gas', 'Show planetary orbits': 'orbit', 'Radioactive decay with a half-life of 5 seconds': 'decay', 'Elastic and inelastic collisions': 'collision', 'Spring mass oscillator': 'spring', 'Show me a pendulum': 'pendulum', 'Newton second law with friction': 'newton', 'Show wave interference': 'waves', 'Show the electric field of a dipole': 'efield' };
  for (const [q, id] of Object.entries(cases)) assert.equal(R(q), id, q);
  for (const q of ['hi', 'how are you?', 'I feel a wave of anxiety about exams', 'our team is going through a digital transformation', 'what do you mean?', 'what is the current situation?', 'tell me about photosynthesis', 'there is friction in my group project']) assert.equal(R(q), null, q);
});
