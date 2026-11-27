/* ERLY Learning Studio — the astronaut's ANIMATION SYSTEM (pure: no three.js, no DOM). v44.

   Used by ls-cosmos-astro.js in the browser (LS.astroAnim) and by tests/unit/cosmos.test.js in Node.

   Why it exists: the earlier astronaut was animated by independent sine waves on every joint plus random gestures, so
   limbs moved without purpose, gestures were not reproducible and nothing linked the body to what it was doing. Here the
   body is driven by ONE set of physical inputs (how fast it travels, whether it is accelerating, braking, banking,
   turning, near a world) and every visible movement follows from them:

   1. POSES — anatomically limited joint targets for each STATE:
        neutral (zero-g neutral body posture) · hover · observe · cruise (forward flight) · accelerate · brake
      plus additive layers  bankLeft · bankRight · turn  (a subtle lean, twist and counter-balance of the limbs),
      and arm overrides  point (the lead arm aims at a world, index finger extended) · wave (opening scene only).
      Adjust / transition / return-to-neutral are not separate poses: they are the continuous blends between these.
   2. WEIGHTS — computed from the inputs, smoothed in time, normalised (they always sum to 1 for the base states).
   3. JOINT SPRINGS — every joint angle follows its blended target through a critically damped spring (rotational
      inertia, no overshoot, no snapping), integrated in sub-steps of at most 1/60 s so the result does not depend on the
      frame rate. Targets are absolute, so nothing accumulates: reversing the scroll returns every joint to the same pose.
   4. GESTURES — deterministic functions of the universe's own clock and the journey position (no Math.random): the same
      moment always produces the same gesture.
   5. THRUSTERS — main propulsion, braking jets and attitude-control (RCS) jets are driven by the same inputs: forward
      acceleration fires the main jets, deceleration the forward braking jets, yaw/pitch/lateral corrections the matching
      RCS quads; drifting at rest fires nothing.

   Rig conventions (model space: +y up, +z forward/face, +x the astronaut's LEFT). Euler order XYZ (three.js default).
   A limb hanging down (−y) swings FORWARD for negative x. Elbows bend forward for negative x, knees backward for
   positive x, ankles point the toes for positive x. Right-side y and z are mirrored from the left. */
(function (root) {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), smooth = t => t * t * (3 - 2 * t);
  const SIDES = ['L', 'R'];
  const JOINTS = ['pelvis', 'chest', 'neck', 'head', 'uArmL', 'fArmL', 'handL', 'uArmR', 'fArmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
  /* anatomical limits [min, max] per axis, left side (right is mirrored on y and z) */
  const LIM = { pelvis: [[-0.6, 0.6], [-0.5, 0.5], [-0.35, 0.35]], chest: [[-0.45, 0.5], [-0.6, 0.6], [-0.35, 0.35]], neck: [[-0.6, 0.55], [-0.9, 0.9], [-0.35, 0.35]], head: [[-0.5, 0.5], [-0.6, 0.6], [-0.3, 0.3]],
    uArm: [[-3.0, 0.9], [-0.9, 0.9], [-0.25, 2.6]], fArm: [[-2.4, 0.0], [-0.8, 0.8], [-0.2, 0.2]], hand: [[-0.9, 0.9], [-0.6, 0.6], [-0.5, 0.6]],
    thigh: [[-1.6, 0.6], [-0.5, 0.5], [-0.1, 0.6]], shin: [[0.0, 2.2], [-0.15, 0.15], [-0.1, 0.1]], foot: [[-0.5, 0.8], [-0.3, 0.3], [-0.25, 0.25]] };
  const base = n => n.replace(/[LR]$/, ''), sideOf = n => (/[LR]$/.test(n) ? n.slice(-1) : null);

  /* a pose: left-side values; R overrides where the right differs (asymmetric poses) */
  const P = (o) => o;
  const POSES = {
    // zero-g neutral body posture (as measured on orbit): arms float up and forward, elbows and knees softly bent
    neutral: P({ pelvis: [0.06, 0, 0], chest: [0.1, 0, 0], neck: [0.06, 0, 0], head: [-0.04, 0, 0], uArm: [-0.42, 0.18, 0.34], fArm: [-1.0, 0.22, 0], hand: [-0.15, 0.1, 0.1], thigh: [-0.55, 0, 0.12], shin: [1.0, 0, 0], foot: [0.3, 0, 0], fingers: 0.55, thumb: 0.4 }),
    // hovering on station: a little more upright and composed than the neutral posture
    hover: P({ pelvis: [0.02, 0, 0], chest: [0.04, 0, 0], neck: [0.02, 0, 0], head: [0, 0, 0], uArm: [-0.16, 0.12, 0.24], fArm: [-0.62, 0.18, 0], hand: [-0.1, 0.08, 0.08], thigh: [-0.24, 0, 0.07], shin: [0.48, 0, 0], foot: [0.25, 0, 0], fingers: 0.5, thumb: 0.35 }),
    // observing a world: like hover, the head and chest turned towards it (direction added from inputs)
    observe: P({ pelvis: [0.03, 0, 0], chest: [0.02, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], uArm: [-0.12, 0.12, 0.22], fArm: [-0.7, 0.18, 0], hand: [-0.08, 0.08, 0.08], thigh: [-0.3, 0, 0.06], shin: [0.55, 0, 0], foot: [0.28, 0, 0], fingers: 0.5, thumb: 0.35 }),
    // forward flight: the body leans into the flight (root pitch, set by ls-cosmos-astro.js), the right arm reaches ahead,
    // the left arm lies along the body, legs extended and together, head raised to look where it is going
    cruise: P({ pelvis: [0.02, 0, 0], chest: [-0.06, 0, 0], neck: [-0.42, 0, 0], head: [-0.28, 0, 0], uArm: [0.22, 0.05, 0.12], fArm: [-0.32, 0, 0], hand: [0.12, 0, 0.05], thigh: [0.06, 0, 0.04], shin: [0.28, 0, 0], foot: [0.62, 0, 0], fingers: 0.35, thumb: 0.3,
      R: { uArm: [-2.55, -0.05, -0.12], fArm: [-0.18, 0, 0], hand: [0.1, 0, 0], fingers: 0.2 } }),
    // accelerating: streamlined — both arms closer to the body and the legs straighter
    accel: P({ pelvis: [0.0, 0, 0], chest: [-0.1, 0, 0], neck: [-0.48, 0, 0], head: [-0.3, 0, 0], uArm: [0.3, 0.02, 0.07], fArm: [-0.18, 0, 0], hand: [0.15, 0, 0], thigh: [0.1, 0, 0.02], shin: [0.15, 0, 0], foot: [0.7, 0, 0], fingers: 0.3, thumb: 0.25,
      R: { uArm: [-2.75, -0.02, -0.06], fArm: [-0.08, 0, 0], hand: [0.05, 0, 0], fingers: 0.15 } }),
    // braking: sitting back against the deceleration — arms forward and out, knees drawn up
    brake: P({ pelvis: [0.22, 0, 0], chest: [0.12, 0, 0], neck: [0.05, 0, 0], head: [0.06, 0, 0], uArm: [-1.2, 0.2, 0.6], fArm: [-0.62, 0.15, 0], hand: [-0.35, 0, 0.2], thigh: [-1.05, 0, 0.16], shin: [1.35, 0, 0], foot: [0.15, 0, 0], fingers: 0.15, thumb: 0.15 })
  };
  /* additive layers (scaled by their weight in [0,1]) */
  const LAYERS = {
    // banking left (+1) — the body rolls with the root; the inner arm drops, the outer arm lifts, legs trail outward
    bank: { chest: [0, 0, 0.12], head: [0, 0, -0.1], uArmL: [0.18, 0, -0.15], uArmR: [-0.12, 0, -0.18], thighL: [0, 0, -0.06], thighR: [0, 0, 0.08] },
    // turning (+1 = to the astronaut's left): chest and head twist into the turn; the pelvis counter-rotates a little
    turn: { pelvis: [0, -0.08, 0], chest: [0, 0.22, 0], neck: [0, 0.18, 0], head: [0, 0.14, 0], uArmL: [0.1, 0, 0], uArmR: [-0.1, 0, 0] }
  };
  const BASES = ['neutral', 'hover', 'observe', 'cruise', 'accel', 'brake'];

  /* deterministic gesture windows: a smooth bump in [0,1] while (t mod period) is inside [a, b] */
  const gwin = (t, period, a, b, edge = 0.6) => { const x = ((t % period) + period) % period; return smooth(clamp((x - a) / edge, 0, 1)) * smooth(clamp((b - x) / edge, 0, 1)); };
  /* shoulder angles that aim a hanging arm along direction d = [x, y, z] in chest space (x left, y up, z forward) */
  const aimArm = d => { const L = Math.hypot(d[0], d[1], d[2]) || 1, x = d[0] / L, y = d[1] / L, z = d[2] / L, b = Math.asin(clamp(x, -1, 1)), cb = Math.max(1e-4, Math.cos(b)); return [Math.atan2(-z / cb, -y / cb), 0, b]; };

  /* the joint value of pose `name` for joint j (left values mirrored for the right side) */
  function poseVal(name, j) { const p = POSES[name], s = sideOf(j), b = base(j); let v = (s === 'R' && p.R && p.R[b]) || p[b]; if (!v) return [0, 0, 0]; if (s === 'R' && !(p.R && p.R[b])) v = [v[0], -v[1], -v[2]]; return v; }
  function poseFingers(name, s) { const p = POSES[name]; const f = (s === 'R' && p.R && p.R.fingers != null) ? p.R.fingers : p.fingers; return { curl: f, thumb: p.thumb }; }
  const limit = (j, v) => { const L = LIM[base(j)], s = sideOf(j) === 'R' ? -1 : 1; return [clamp(v[0], L[0][0], L[0][1]), s > 0 ? clamp(v[1], L[1][0], L[1][1]) : -clamp(-v[1], L[1][0], L[1][1]), s > 0 ? clamp(v[2], L[2][0], L[2][1]) : -clamp(-v[2], L[2][0], L[2][1])]; };

  /* base-state weights from the physical inputs (all inputs in [0,1] except lat/yaw in [−1,1]) */
  function weightsFrom(I) {
    const travel = clamp(I.travel || 0, 0, 1), acc = clamp(I.accel || 0, 0, 1), dec = clamp(I.decel || 0, 0, 1), near = clamp(I.near || 0, 0, 1);
    const fly = travel * (1 - dec), rest = 1 - travel;
    const w = { cruise: fly * (1 - acc), accel: fly * acc, brake: dec * Math.max(travel, 0.35), observe: rest * near * (1 - dec), hover: rest * (1 - near) * 0.65 * (1 - dec), neutral: rest * (1 - near) * 0.35 * (1 - dec) + 1e-6 };
    const sum = BASES.reduce((a, k) => a + w[k], 0); BASES.forEach(k => { w[k] /= sum; }); return w;
  }

  /* the targets for one instant: blended base pose + layers + gesture overrides + look direction + idle life */
  function targets(W, I, t) {
    const out = {}, lat = clamp(I.lat || 0, -1, 1), yaw = clamp(I.yaw || 0, -1, 1), calm = I.still ? 0 : 1, idle = (W.neutral + W.hover + W.observe) * calm;
    const nz = (a1, a2, a3, ph) => Math.sin(t * a1 + ph) * 0.55 + Math.sin(t * a2 + ph * 1.7) * 0.3 + Math.sin(t * a3 + ph * 2.3) * 0.15; // smooth, aperiodic idle life (deterministic in t)
    JOINTS.forEach(j => { const v = [0, 0, 0]; BASES.forEach(k => { const p = poseVal(k, j), w = W[k]; v[0] += p[0] * w; v[1] += p[1] * w; v[2] += p[2] * w; }); out[j] = v; });
    // layers: banking and turning
    Object.entries(LAYERS.bank).forEach(([j, d]) => { const s = lat; out[j][0] += d[0] * Math.abs(s); out[j][1] += d[1] * s; out[j][2] += d[2] * s; });
    Object.entries(LAYERS.turn).forEach(([j, d]) => { out[j][0] += d[0] * Math.abs(yaw); out[j][1] += d[1] * yaw; out[j][2] += d[2] * yaw; });
    // looking at the world (observe/hover): neck and head share the turn, the chest follows a little
    const ly = clamp(I.lookYaw || 0, -1.2, 1.2), lp = clamp(I.lookPitch || 0, -0.7, 0.7), lk = W.observe + W.hover * 0.6 + W.neutral * 0.4;
    out.chest[1] += ly * 0.2 * lk; out.neck[1] += ly * 0.42 * lk; out.head[1] += ly * 0.3 * lk; out.neck[0] -= lp * 0.45 * lk; out.head[0] -= lp * 0.3 * lk;
    // idle life: slow drift of the whole body and limbs, breathing in the chest, never while flying
    const D = idle; out.pelvis[0] += nz(0.21, 0.37, 0.83, 0.4) * 0.05 * D; out.pelvis[1] += nz(0.17, 0.33, 0.71, 1.3) * 0.06 * D; out.chest[0] += nz(0.23, 0.45, 0.97, 3.1) * 0.04 * D + Math.sin(t * 1.25) * 0.015 * calm;
    out.neck[1] += nz(0.11, 0.23, 0.53, 4.2) * 0.12 * D; out.head[0] += nz(0.13, 0.29, 0.61, 2.6) * 0.05 * D;
    SIDES.forEach((s, i) => { const ph = i * 2.3; out['uArm' + s][0] += nz(0.29, 0.53, 1.07, ph) * 0.1 * D; out['uArm' + s][2] += (s === 'L' ? 1 : -1) * nz(0.23, 0.47, 0.91, ph + 1) * 0.06 * D; out['fArm' + s][0] += nz(0.31, 0.61, 1.3, ph + 2) * 0.12 * D;
      out['thigh' + s][0] += nz(0.25, 0.49, 0.97, ph + 0.7) * 0.08 * D; out['shin' + s][0] += nz(0.27, 0.53, 1.1, ph + 1.5) * 0.1 * D; });
    // flight: a slow, small flutter of the legs (stabilising, not walking) — amplitude follows speed
    const fl = (W.cruise + W.accel) * calm; SIDES.forEach((s, i) => { const k = Math.sin(t * 2.2 + i * Math.PI); out['thigh' + s][0] += k * 0.06 * fl; out['shin' + s][0] += Math.max(0, -k) * 0.08 * fl; });
    // gestures (deterministic): point at the world when lingering beside it; wave once in a while on the opening scene
    const restK = (1 - clamp(I.travel || 0, 0, 1)) * calm, gp = I.near > 0.7 ? gwin(t, 12, 1.5, 6.0) * restK * smooth(clamp((I.near - 0.7) / 0.3, 0, 1)) : 0, gw = I.opening ? gwin(t, 10, 2.0, 5.6) * restK : 0;
    const fingers = { L: blendFingers(W, 'L'), R: blendFingers(W, 'R') };
    if (gp > 0.001) { const a = aimArm(I.pointDir || [-0.35, 0.05, 1]); const e = [a[0], a[1], a[2]]; mix(out.uArmR, e, gp); mix(out.fArmR, [-0.12, 0, 0], gp); mix(out.handR, [0.05, 0, 0], gp); fingers.R.index = 1 - gp; fingers.R.curl = fingers.R.curl * (1 - gp) + 0.92 * gp; fingers.R.thumb = fingers.R.thumb * (1 - gp) + 0.7 * gp; out.head[1] += -0.15 * gp; }
    if (gw > 0.001) { const osc = Math.sin(t * 5.2) * 0.32; mix(out.uArmR, [-0.35, 0, -1.55], gw); mix(out.fArmR, [-1.35, 0, 0], gw); mix(out.handR, [0.1, osc, -0.15], gw); fingers.R.curl = fingers.R.curl * (1 - gw) + 0.05 * gw; fingers.R.index = Math.min(fingers.R.index, 1 - gw * 0.95); fingers.R.thumb *= 1 - 0.6 * gw; out.head[1] += -0.25 * gw; }
    JOINTS.forEach(j => { out[j] = limit(j, out[j]); });
    return { joints: out, fingers, gesture: { point: gp, wave: gw } };
  }
  function blendFingers(W, s) { let c = 0, th = 0; BASES.forEach(k => { const f = poseFingers(k, s); c += f.curl * W[k]; th += f.thumb * W[k]; }); return { curl: c, thumb: th, index: c }; }
  const mix = (v, to, k) => { v[0] += (to[0] - v[0]) * k; v[1] += (to[1] - v[1]) * k; v[2] += (to[2] - v[2]) * k; };

  /* thruster commands from the same inputs (each in [0,1]) */
  function thrust(I) {
    const travel = clamp(I.travel || 0, 0, 1), acc = clamp(I.accel || 0, 0, 1), dec = clamp(I.decel || 0, 0, 1), yaw = clamp(I.yaw || 0, -1, 1), lat = clamp(I.lat || 0, -1, 1), pitch = clamp(I.pitch || 0, -1, 1), still = I.still ? 0 : 1;
    const dz = (x, d) => (Math.abs(x) < d ? 0 : (Math.abs(x) - d) / (1 - d) * Math.sign(x)); // a dead zone: no puffs for tiny corrections
    const Y = dz(yaw, 0.12), L = dz(lat, 0.15), Pp = dz(pitch, 0.15);
    return { main: clamp(acc * 1.05 + travel * 0.22 * (1 - dec), 0, 1) * still, brake: clamp(dec * 1.25, 0, 1) * still,
      rcs: { yawL: clamp(Y, 0, 1) * still, yawR: clamp(-Y, 0, 1) * still, latL: clamp(L, 0, 1) * still, latR: clamp(-L, 0, 1) * still, up: clamp(Pp, 0, 1) * still, down: clamp(-Pp, 0, 1) * still } };
  }

  /* the stateful animator: smoothed weights and joint springs. step(input, dt) → { joints, fingers, weights, thrust } */
  function create() {
    const S = { W: weightsFrom({}), J: {}, V: {}, F: { L: { curl: 0.5, thumb: 0.4, index: 0.5 }, R: { curl: 0.5, thumb: 0.4, index: 0.5 } }, T: thrust({}), init: false };
    const OMEGA = { pelvis: 4.2, chest: 4.6, neck: 5.5, head: 6, uArm: 6.2, fArm: 7, hand: 8, thigh: 4.8, shin: 5.4, foot: 6.5 };
    function step(I, dt) {
      dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.25); I = I || {};
      const Wt = weightsFrom(I); const n = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / n;
      for (let s = 0; s < n; s++) { const kW = 1 - Math.exp(-3.2 * h); BASES.forEach(k => { S.W[k] += (Wt[k] - S.W[k]) * kW; }); }
      const sum = BASES.reduce((a, k) => a + S.W[k], 0); BASES.forEach(k => { S.W[k] /= sum || 1; });
      const tg = targets(S.W, I, I.t || 0);
      JOINTS.forEach(j => { const g = tg.joints[j]; if (!S.init || !S.J[j]) { S.J[j] = g.slice(); S.V[j] = [0, 0, 0]; return; } const w = OMEGA[base(j)], x = S.J[j], v = S.V[j];
        for (let s = 0; s < n; s++) for (let a = 0; a < 3; a++) { const acc = (g[a] - x[a]) * w * w - 2 * w * v[a]; v[a] += acc * h; x[a] += v[a] * h; } });
      SIDES.forEach(sd => { const g = tg.fingers[sd], f = S.F[sd], k = S.init ? 1 - Math.exp(-6 * dt) : 1; f.curl += (g.curl - f.curl) * k; f.thumb += (g.thumb - f.thumb) * k; f.index += (g.index - f.index) * k; });
      const Tt = thrust(I), kt = S.init ? 1 - Math.exp(-9 * dt) : 1; S.T.main += (Tt.main - S.T.main) * kt; S.T.brake += (Tt.brake - S.T.brake) * kt; S.T.rcs = S.T.rcs || {}; Object.keys(Tt.rcs).forEach(k => { const c = S.T.rcs[k] || 0; S.T.rcs[k] = c + (Tt.rcs[k] - c) * (S.init ? 1 - Math.exp(-14 * dt) : 1); });
      S.init = true; return { joints: S.J, fingers: S.F, weights: S.W, thrust: S.T, gesture: tg.gesture };
    }
    return { step, state: S, reset() { S.init = false; } };
  }

  const API = { JOINTS, POSES, LAYERS, LIM, BASES, weightsFrom, targets, thrust, aimArm, create, window: gwin };
  if (typeof window !== 'undefined' && window.LS) window.LS.astroAnim = API; else if (typeof window !== 'undefined') { window.LS = window.LS || {}; window.LS.astroAnim = API; }
  if (typeof module === 'object' && module && module.exports && typeof window === 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
