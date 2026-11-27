'use strict';
// Circular Motion chapter: the physics engine (assets/js/learn/ls-circ-engine.js) against independent analytical results.
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/learn/ls-circ-engine.js');
const g = 9.81, D = Math.PI / 180;
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m || ''}: ${a} vs ${b} (±${tol})`);
const run = (s, P, step, T, h = 1 / 240) => { const c = E.clock(h); c.run(T, hh => step(s, P, hh), 1e7); return s; };

test('uniform circular motion: v, ω, f, T, a and F are consistent whichever variable is chosen', () => {
  const a = E.ucm(2, 3, 'v', 4); near(a.w, 2, 1e-12); near(a.T, Math.PI, 1e-12); near(a.ac, 8, 1e-12); near(a.F, 24, 1e-12); near(a.f, 1 / Math.PI, 1e-12);
  const b = E.ucm(2, 3, 'T', Math.PI); near(b.v, 4, 1e-12); const c = E.ucm(2, 3, 'f', 1 / Math.PI); near(c.v, 4, 1e-12); const d = E.ucm(2, 3, 'w', 2); near(d.F, 24, 1e-12);
  const p = E.ucmAt(2, 2, Math.PI / 4); near(Math.hypot(p.x, p.z), 2, 1e-12); near(p.x * p.vx + p.z * p.vz, 0, 1e-12, 'velocity ⟂ radius'); near(Math.hypot(p.vx, p.vz), 4, 1e-12);
});
test('banked road: ideal speed has no friction; above it friction acts down the slope, below it up the slope; limits', () => {
  const r = 100, deg = 20, vi = Math.sqrt(r * g * Math.tan(deg * D));
  const i = E.bank(vi, r, deg, 0.3); near(i.f, 0, 1e-6, 'no friction at ideal speed'); assert.equal(i.fdir, 'none'); near(i.vIdeal, vi, 1e-12);
  assert.equal(E.bank(vi + 5, r, deg, 0.3).fdir, 'down'); assert.equal(E.bank(vi - 5, r, deg, 0.3).fdir, 'up');
  // the resultant of N, f and mg is exactly m v²/r horizontal
  const v = 30, m = 1000, b = E.bank(v, r, deg, 0.5, m), th = deg * D; near(b.N * Math.sin(th) + b.f * Math.cos(th), m * v * v / r, 1e-6); near(b.N * Math.cos(th) - b.f * Math.sin(th), m * g, 1e-6);
  const vmax = Math.sqrt(r * g * (Math.sin(th) + 0.3 * Math.cos(th)) / (Math.cos(th) - 0.3 * Math.sin(th))); near(i.vMax, vmax, 1e-9); near(E.bank(vmax, r, deg, 0.3).need, 0.3, 1e-9, 'exactly at the limit');
  assert.equal(E.bank(vmax * 1.01, r, deg, 0.3).ok, false); assert.equal(E.bank(vmax * 1.01, r, deg, 0.3).slide, 'up');
  const s = E.bank(1, r, 40, 0.1); assert.ok(s.vMin > 0); assert.equal(E.bank(s.vMin * 0.9, r, 40, 0.1).slide, 'down');
  near(E.bank(10, 50, 0, 0.5).f, 1000 * 100 / 50, 1e-9, 'flat road: friction is all of mv²/r');
});
test('conical pendulum: ω² = g/(L cos θ), T = mg/cos θ; ω below √(g/L) hangs straight; the two modes agree', () => {
  const c = E.conical(1.5, 30, 2); near(c.w, Math.sqrt(g / (1.5 * Math.cos(30 * D))), 1e-12); near(c.T, 2 * g / Math.cos(30 * D), 1e-12); near(c.r, 0.75, 1e-12);
  near(c.T * Math.sin(c.th), 2 * c.w * c.w * c.r, 1e-9, 'T sinθ = m ω² r'); near(c.T * Math.cos(c.th), 2 * g, 1e-9);
  const w = E.conicalW(1.5, c.w, 2); near(w.th / D, 30, 1e-9); assert.equal(E.conicalW(1.5, 0.9 * Math.sqrt(g / 1.5)).ok, false);
});
test('cyclist: tan θ = v²/(rg) from the vertical; friction = mv²/r; grip limit', () => {
  const c = E.cyclist(8, 20, 80, 0.8); near(Math.tan(c.th), 64 / (20 * g), 1e-12); near(c.f, 80 * 64 / 20, 1e-12); near(c.f / c.N, Math.tan(c.th), 1e-12, 'road force passes through the centre of mass');
  assert.equal(c.grips, true); assert.equal(E.cyclist(14, 20, 80, 0.8).grips, false); near(E.cyclistV(c.deg, 20), 8, 1e-9);
});
test('bowl: smooth equilibrium cos θ = g/(ω²R); below √(g/R) at the bottom; forces balance; friction band contains it', () => {
  const R = 0.5, w = 8, th = E.bowlEq(R, w); near(Math.cos(th), g / (w * w * R), 1e-12); assert.equal(E.bowlEq(R, Math.sqrt(g / R) * 0.95), 0);
  const f = E.bowlForces(R, w, th); near(f.f, 0, 1e-9, 'no friction needed'); near(f.N * Math.sin(th), f.Fc, 1e-9, 'N sinθ = mω²r'); near(f.N * Math.cos(th), g, 1e-9);
  const band = E.bowlBand(R, w, 0.2); assert.ok(band[0] < th / D && th / D < band[1]);
  // smooth bowl started off-equilibrium oscillates about it (energy in the rotating frame conserved); with friction it settles in the band
  const s = E.bowlInit(R, w, th - 0.2); const P = { R, w, mu: 0 }; let lo = 9, hi = -9; const c = E.clock(1 / 480); for (let i = 0; i < 4800; i++) { c.run(1 / 480, h => E.bowlStep(s, P, h)); lo = Math.min(lo, s.th); hi = Math.max(hi, s.th); } near(lo, th - 0.2, 2e-3); near(hi, th + 0.2, 0.06); assert.ok(lo < th && hi > th);
  const s2 = E.bowlInit(R, w, 0.15); run(s2, { R, w, mu: 0.3 }, E.bowlStep, 20); const b2 = E.bowlBand(R, w, 0.3); assert.ok(s2.stuck && s2.th / D >= b2[0] - 0.2 && s2.th / D <= b2[1] + 0.2, 'stops inside the static band: ' + s2.th / D + ' ' + b2);
});
test('sphere: separation at cos θ = 2/3 from (near) rest at the top; N is never negative; projectile landing matches', () => {
  near(E.sphereSep(1, 0, 0), Math.acos(2 / 3), 1e-12); near(Math.acos(2 / 3) / D, 48.19, 0.01);
  const R = 1.2, th0 = 0.5 * D, s = E.sphereInit(R, 0, th0); const P = { R, mu: 0 }; let minN = 9; const c = E.clock(1 / 240);
  while (s.ph === 'on' && s.t < 20) { c.run(1 / 240, h => E.sphereStep(s, P, h)); if (s.ph === 'on') minN = Math.min(minN, s.N); }
  assert.equal(s.ph, 'air'); near(s.sepTh, E.sphereSep(R, 0, th0), 2e-4, 'numerical separation angle'); assert.ok(minN >= 0);
  near(Math.cos(s.sepTh), 2 / 3 * Math.cos(th0), 2e-4); while (s.ph === 'air') c.run(1 / 240, h => E.sphereStep(s, P, h)); near(s.land, E.sphereLand(R, 0, th0).x, 2e-3, 'landing point');
  const fast = E.sphereSep(1, Math.sqrt(g * 1.05)); assert.equal(fast, 0, 'v₀² > gR leaves at once');
  const fr = E.sphereInit(1, 0, 2 * D); run(fr, { R: 1, mu: 0.3 }, E.sphereStep, 10); assert.ok(fr.ph === 'air' ? fr.sepTh > Math.acos(2 / 3) : fr.stuck, 'friction delays or prevents separation');
  const st = E.sphereInit(1, 0, 10 * D); run(st, { R: 1, mu: 0.3 }, E.sphereStep, 2); assert.equal(st.stuck, true, 'tan 10° < 0.3: static friction holds it');
});
test('vertical circle: T = m(v²/R + g cos φ); minimum speeds; slack string at cos φ = (2gR − v₀²)/3gR; energy conserved', () => {
  const R = 1; near(E.vcMin(R, 'string'), Math.sqrt(5 * g * R), 1e-12); near(E.vcMin(R, 'rod'), 2 * Math.sqrt(g * R), 1e-12); near(E.vcMin(R, 'track', 0.4), Math.sqrt(g * R + 4 * g * R / 1.4), 1e-12);
  const v0 = Math.sqrt(3.5 * g * R), s = E.vcInit(R, v0); const P = { R, kind: 'string' }, E0 = E.vcEnergy(s, R); let maxdE = 0; const c = E.clock(1 / 960);
  while (s.ph === 'on' && s.t < 5) { c.run(1 / 960, h => E.vcStep(s, P, h)); if (s.ph === 'on') { maxdE = Math.max(maxdE, Math.abs(E.vcEnergy(s, R) - E0)); assert.ok(s.T >= -1e-9, 'no negative tension'); } }
  assert.equal(s.ph, 'free'); near(Math.cos(s.lost), E.vcLoseCos(R, v0), 1e-4, 'slack angle'); assert.ok(maxdE < 1e-6, 'energy drift ' + maxdE);
  const q = E.vcInit(R, E.vcMin(R, 'string') * 1.02); run(q, P, E.vcStep, 3, 1 / 960); assert.equal(q.lost, null, 'just above the minimum: never slack'); assert.ok(q.laps >= 1);
  const rod = E.vcInit(R, Math.sqrt(3.5 * g * R)); let minT = 9; const c2 = E.clock(1 / 960); for (let i = 0; i < 2000; i++) { c2.run(1 / 960, h => E.vcStep(rod, { R, kind: 'rod' }, h)); minT = Math.min(minT, rod.T); } assert.equal(rod.ph, 'on'); assert.ok(minT < 0, 'a rod pushes (negative tension = compression)');
  const top = E.vcInit(R, Math.sqrt(5 * g * R) * 1.1); run(top, P, E.vcStep, 0.35, 1 / 960); // tension at the top from v_top
  const sw = E.vcInit(R, Math.sqrt(1.5 * g * R)); run(sw, P, E.vcStep, 4, 1 / 960); assert.equal(sw.lost, null, 'below the horizontal it just swings');
});
test('turntable: a coin slips at ω = √(μg/r) (independent of mass); spin-up includes the tangential term; it leaves the rim', () => {
  near(E.tableSlipW(0.2, 0.4), Math.sqrt(0.4 * g / 0.2), 1e-12);
  const al = 0.2, s = E.tableInit([{ r: 0.2, mus: 0.4, muk: 0.3 }, { r: 0.1, mus: 0.4, muk: 0.3, m: 5 }], 0); const P = { Rt: 0.4, H: 0.8, al, wmax: 20 };
  const c = E.clock(1 / 480); while (s.coins[0].stuck && s.t < 60) c.run(1 / 480, h => E.tableStep(s, P, h));
  const r = 0.2, wexp = Math.pow(Math.pow(0.4 * g / r, 2) - al * al, 0.25); near(s.coins[0].slipW, wexp, 2e-3, 'slip ω with α'); assert.ok(s.coins[1].stuck, 'the inner coin still grips (mass does not matter)');
  while (s.coins[0].ph !== 'floor' && s.t < 80) c.run(1 / 480, h => E.tableStep(s, P, h)); assert.equal(s.coins[0].ph, 'floor', 'the outer coin slid off and fell');
  const two = E.tableInit([{ r: 0.3, mus: 0.5, m: 0.01 }, { r: 0.3, mus: 0.5, m: 2 }], 0); run(two, { Rt: 0.4, H: 0.8, al: 0.3, wmax: 20 }, E.tableStep, 30); near(two.coins[0].slipT, two.coins[1].slipT, 1e-9, 'equal radius and μ ⇒ same slip time');
});
test('puck on a string, flat road, orbit, chair-o-plane and loop-the-loop', () => {
  near(E.puck(0.5, 0.8, 4).T, 0.5 * 16 / 0.8, 1e-12); const h = E.puckHole(0.4, 0.2, 0.5); near(h.v, Math.sqrt(0.2 * g * 0.5 / 0.4), 1e-12); near(0.4 * h.v * h.v / 0.5, 0.2 * g, 1e-9);
  const f = E.flat(20, 50, 0.7); near(f.vMax, Math.sqrt(0.7 * g * 50), 1e-12); assert.equal(f.grips, false); near(f.rho, 400 / (0.7 * g), 1e-9);
  const s = E.flatInit(50); run(s, { v: 15, r: 50, mu: 0.7, w: 8 }, E.flatStep, 10, 1 / 480); near(s.d, 50, 0.05, 'below the limit it stays on its circle'); assert.equal(s.slid, false);
  const s2 = E.flatInit(50); run(s2, { v: 25, r: 50, mu: 0.7, w: 8 }, E.flatStep, 10, 1 / 480); assert.equal(s2.off, true, 'above the limit it drifts off the outside of the road');
  const o = E.orbit(E.ME, 42164e3); near(o.T / 3600, 23.93, 0.01, 'geostationary period'); const leo = E.orbit(E.ME, E.RE + 400e3); near(leo.v, 7669, 5, 'ISS speed');
  near(E.orbit(E.ME, 2e7).T ** 2 / E.orbit(E.ME, 1e7).T ** 2, 8, 1e-9, 'T² ∝ r³');
  const os = E.orbitInit(E.ME, 1e7, 1), op = { M: E.ME, Rp: E.RE, r0: 1e7 }, T0 = E.orbit(E.ME, 1e7).T; run(os, op, E.orbitStep, T0, T0 / 4000); near(Math.hypot(os.x, os.y), 1e7, 1e3, 'circular stays circular'); near(os.x, 1e7, 2e4, 'back to the start after one period');
  const oe = E.orbitInit(E.ME, 1e7, 1.2); run(oe, op, E.orbitStep, 3 * T0, T0 / 4000); assert.ok(oe.rmax > 1.5e7 && Math.abs(oe.rmin - 1e7) < 1e4, 'faster: an ellipse');
  const ch = E.chair(2, 3, 1.2); near(Math.tan(ch.th), 1.44 * (2 + 3 * Math.sin(ch.th)) / g, 1e-9); const cp = E.chair(0, 1.5, 4); near(cp.th, E.conicalW(1.5, 4).th, 1e-9, 'd = 0 is the conical pendulum');
  near(E.loopMinH(1, 0), 2.5, 1e-12); near(E.loopMinH(1, 0.4), 2.7, 1e-12);
  for (const [k, hh, stays] of [[0, 2.52, true], [0, 2.4, false], [0.4, 2.72, true], [0.4, 2.6, false]]) { const v0 = E.loopV0(hh, k), q = E.vcInit(1, v0); run(q, { R: 1, kind: 'track', k }, E.vcStep, 2.5, 1 / 960); assert.equal(q.lost == null, stays, `k=${k} h=${hh}`); }
});
test('fixed-step clock: the result does not depend on how wall-clock time is sliced', () => {
  const a = E.vcInit(1, 6), b = E.vcInit(1, 6), P = { R: 1, kind: 'string' }, ca = E.clock(1 / 240), cb = E.clock(1 / 240);
  for (let i = 0; i < 120; i++) ca.run(1 / 60, h => E.vcStep(a, P, h)); for (let i = 0; i < 37; i++) cb.run(2 / 37 * 1.0000001, h => E.vcStep(b, P, h));
  near(a.phi, b.phi, 1e-9); near(a.phid, b.phid, 1e-9);
});
