'use strict';
// The universe's astronaut animation system (assets/js/learn/ls-cosmos-anim.js): states, blending, joint limits,
// determinism, frame-rate independence, reversal without drift, thruster logic and arm aiming.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../../assets/js/learn/ls-cosmos-anim.js');
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m || ''}: ${a} vs ${b} (±${tol})`);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const randomInput = t => ({ t, travel: rnd(), accel: rnd() < 0.5 ? rnd() : 0, decel: rnd() < 0.5 ? rnd() : 0, lat: rnd() * 2 - 1, yaw: rnd() * 2 - 1, pitch: rnd() * 2 - 1, near: rnd(), opening: rnd() < 0.3, lookYaw: rnd() * 2 - 1, lookPitch: rnd() - 0.5, pointDir: [rnd() - 0.5, rnd() - 0.5, rnd()] });
const run = (anim, inputs, dt) => { let r; inputs.forEach(I => { r = anim.step(I, dt); }); return r; };

test('base-state weights are non-negative and always sum to 1; each state dominates in its own situation', () => {
  for (let i = 0; i < 500; i++) { const w = A.weightsFrom(randomInput(i)); const s = A.BASES.reduce((a, k) => a + w[k], 0); near(s, 1, 1e-9, 'sum'); A.BASES.forEach(k => assert.ok(w[k] >= 0 && Number.isFinite(w[k]))); }
  const top = I => { const w = A.weightsFrom(I); return A.BASES.reduce((a, k) => (w[k] > w[a] ? k : a), A.BASES[0]); };
  assert.equal(top({ travel: 1 }), 'cruise'); assert.equal(top({ travel: 1, accel: 1 }), 'accel'); assert.equal(top({ travel: 0.6, decel: 1 }), 'brake');
  assert.equal(top({ travel: 0, near: 1 }), 'observe'); assert.equal(top({ travel: 0, near: 0 }), 'hover');
});
test('the states are genuinely different poses (not one animation under several names)', () => {
  const t = (I) => A.targets(A.weightsFrom(I), I, 0).joints, d = (a, b, j) => Math.hypot(a[j][0] - b[j][0], a[j][1] - b[j][1], a[j][2] - b[j][2]);
  const hover = t({ travel: 0 }), cruise = t({ travel: 1 }), brake = t({ travel: 0.6, decel: 1 }), accel = t({ travel: 1, accel: 1 });
  assert.ok(d(hover, cruise, 'uArmR') > 1.5, 'the lead arm reaches ahead in flight'); assert.ok(d(hover, brake, 'thighL') > 0.6, 'knees come up to brake'); assert.ok(d(cruise, accel, 'shinL') > 0.1, 'legs straighten to accelerate');
  const bl = A.targets(A.weightsFrom({ travel: 1 }), { travel: 1, lat: 1 }, 0).joints, br = A.targets(A.weightsFrom({ travel: 1 }), { travel: 1, lat: -1 }, 0).joints; assert.ok(bl.chest[2] > 0 && br.chest[2] < 0, 'banking left and right mirror');
});
test('every joint stays inside its anatomical limits and nothing is ever NaN', () => {
  const an = A.create(); for (let i = 0; i < 2000; i++) { const r = an.step(randomInput(i / 60), 1 / 60 + rnd() * 0.05);
    Object.entries(r.joints).forEach(([j, v]) => { const L = A.LIM[j.replace(/[LR]$/, '')], s = /R$/.test(j) ? -1 : 1; v.forEach((x, a) => { assert.ok(Number.isFinite(x), j); const y = a === 0 ? x : x * s; assert.ok(y >= L[a][0] - 0.25 && y <= L[a][1] + 0.25, `${j}[${a}] = ${x}`); }); });
    ['L', 'R'].forEach(sd => Object.values(r.fingers[sd]).forEach(x => assert.ok(Number.isFinite(x) && x >= -1e-9 && x <= 1 + 1e-9))); }
});
test('deterministic: the same inputs give the same pose, gestures included (no randomness)', () => {
  const seq = Array.from({ length: 600 }, (_, i) => ({ t: i / 60, travel: i < 200 ? 0 : i < 400 ? 1 : 0, near: i > 450 ? 1 : 0, opening: i < 150 }));
  const a = run(A.create(), seq, 1 / 60), b = run(A.create(), seq, 1 / 60); assert.deepEqual(JSON.stringify(a.joints), JSON.stringify(b.joints)); assert.deepEqual(a.gesture, b.gesture);
  const g1 = A.targets(A.weightsFrom({ near: 1 }), { near: 1, t: 3.3 }, 3.3).gesture, g2 = A.targets(A.weightsFrom({ near: 1 }), { near: 1, t: 3.3 }, 3.3).gesture; assert.deepEqual(g1, g2); assert.ok(g1.point > 0.9, 'points at the world while lingering');
  assert.equal(A.targets(A.weightsFrom({ travel: 1, near: 1 }), { travel: 1, near: 1, t: 3.3 }, 3.3).gesture.point, 0, 'never gestures while flying');
});
test('frame-rate independent: 30 fps and 144 fps reach the same pose', () => {
  const mk = dt => Array.from({ length: Math.round(3 / dt) }, (_, i) => ({ t: i * dt, travel: 1, accel: 0.5 }));
  const a = run(A.create(), mk(1 / 30), 1 / 30), b = run(A.create(), mk(1 / 144), 1 / 144);
  Object.keys(a.joints).forEach(j => a.joints[j].forEach((x, k) => near(x, b.joints[j][k], 0.02, j)));
  A.BASES.forEach(k => near(a.weights[k], b.weights[k], 0.01, k));
});
test('reversing returns to the same pose with no drift (absolute targets, no accumulation)', () => {
  const fresh = run(A.create(), Array.from({ length: 600 }, (_, i) => ({ t: 50, travel: 0 })), 1 / 60);
  const an = A.create(); const seq = []; for (let k = 0; k < 6; k++) { for (let i = 0; i < 90; i++) seq.push({ t: 50, travel: 1, accel: 1 }); for (let i = 0; i < 60; i++) seq.push({ t: 50, travel: 0.6, decel: 1 }); }
  for (let i = 0; i < 600; i++) seq.push({ t: 50, travel: 0 }); const back = run(an, seq, 1 / 60);
  Object.keys(fresh.joints).forEach(j => fresh.joints[j].forEach((x, k) => near(back.joints[j][k], x, 1e-3, j)));
});
test('thrusters follow the motion: nothing at rest, main jets to accelerate, braking jets to decelerate, attitude jets to turn', () => {
  const T = A.thrust; const idle = T({ travel: 0 }); assert.equal(idle.main, 0); assert.equal(idle.brake, 0); Object.values(idle.rcs).forEach(x => assert.equal(x, 0));
  const acc = T({ travel: 1, accel: 1 }); assert.ok(acc.main > 0.9 && acc.brake === 0); const dec = T({ travel: 0.6, decel: 1 }); assert.ok(dec.brake > 0.9 && dec.main < 0.1);
  const yl = T({ yaw: 0.8 }), yr = T({ yaw: -0.8 }); assert.ok(yl.rcs.yawL > 0 && yl.rcs.yawR === 0); assert.ok(yr.rcs.yawR > 0 && yr.rcs.yawL === 0);
  const tiny = T({ yaw: 0.05, lat: 0.05, pitch: 0.05 }); Object.values(tiny.rcs).forEach(x => assert.equal(x, 0, 'dead zone: no puffs for tiny corrections'));
  const still = T({ travel: 1, accel: 1, yaw: 1, still: true }); assert.equal(still.main, 0); assert.equal(still.rcs.yawL, 0);
});
test('arm aiming: the shoulder angles point a hanging arm exactly along the requested direction', () => {
  const rot = ([a, b, c], v) => { // three.js Euler XYZ: R = Rx·Ry·Rz
    const [x, y, z] = v, cz = Math.cos(c), sz = Math.sin(c), cy = Math.cos(b), sy = Math.sin(b), cx = Math.cos(a), sx = Math.sin(a);
    const x1 = x * cz - y * sz, y1 = x * sz + y * cz, z1 = z; const x2 = x1 * cy + z1 * sy, y2 = y1, z2 = -x1 * sy + z1 * cy; return [x2, y2 * cx - z2 * sx, y2 * sx + z2 * cx]; };
  for (let i = 0; i < 200; i++) { const d = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.2], L = Math.hypot(...d), u = d.map(x => x / L); const v = rot(A.aimArm(d), [0, -1, 0]); u.forEach((x, k) => near(v[k], x, 1e-9, 'axis ' + k)); }
});
