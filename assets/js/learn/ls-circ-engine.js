/* ERLY Learning Studio — CIRCULAR MOTION physics engine (pure functions, no DOM; loads in the browser as LS.circ and in
   Node as a CommonJS module so the unit tests can check it against independent analytical results).

   Conventions used by every experiment
     • SI units throughout; g = 9.81 m s⁻², G = 6.674 × 10⁻¹¹ N m² kg⁻².
     • Angles are stored in radians; *Deg helpers take degrees.
     • "Centripetal force" is never a separate force: it is the NET inward component of the real forces. Every function
       that reports forces returns the real forces and, separately, the net inward resultant m v²/r they must add up to.
     • Time-dependent models advance with a FIXED time step (default h = 1/240 s of simulated time) through E.clock, so the
       result never depends on the display frame rate; analytic models (uniform motion, steady states) are evaluated exactly.
     • Loss of contact, slack strings, slipping and leaving a surface are detected from the sign of the constraint force or
       from the friction limit; after that the object is integrated as a free (projectile / sliding) body.
*/
(function (root) {
  'use strict';
  const g = 9.81, G = 6.674e-11, ME = 5.972e24, RE = 6.371e6, PI = Math.PI, TAU = 2 * PI, D2R = PI / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sq = x => x * x, hyp = Math.hypot;
  const E = { g, G, ME, RE, D2R };

  /* ---------- numerics ---------- */
  // one classical Runge–Kutta step for y' = f(y) (autonomous); y is an array
  function rk4(f, y, h) { const n = y.length, a = f(y), t = new Array(n);
    for (let i = 0; i < n; i++) t[i] = y[i] + 0.5 * h * a[i]; const b = f(t);
    for (let i = 0; i < n; i++) t[i] = y[i] + 0.5 * h * b[i]; const c = f(t);
    for (let i = 0; i < n; i++) t[i] = y[i] + h * c[i]; const d = f(t);
    const o = new Array(n); for (let i = 0; i < n; i++) o[i] = y[i] + h / 6 * (a[i] + 2 * b[i] + 2 * c[i] + d[i]); return o; }
  E.rk4 = rk4;
  // fixed-step clock: feed it wall-clock dt × speed; it calls step(h) a whole number of times and keeps the remainder
  E.clock = (h = 1 / 240) => { let acc = 0; return { h, run(dt, step, max = 4000) { acc += Math.max(0, dt); let n = 0; while (acc >= h - 1e-12 && n < max) { if (step(h) === false) { acc = 0; break; } acc -= h; n++; } if (n >= max) acc = 0; return n; }, reset() { acc = 0; } }; };
  // bisection on [a, b] for a continuous f with a sign change
  function root(f, a, b, it = 100) { let fa = f(a); for (let i = 0; i < it; i++) { const m = 0.5 * (a + b), fm = f(m); if ((fm <= 0) === (fa <= 0)) { a = m; fa = fm; } else b = m; } return 0.5 * (a + b); }
  E.root = root;

  /* ---------- 1. uniform circular motion ---------- */
  // choose the independent variable: by = 'v' (m/s), 'w' (rad/s), 'T' (s) or 'f' (Hz)
  E.ucm = (r, m, by, val) => { const w = by === 'v' ? val / r : by === 'T' ? TAU / val : by === 'f' ? TAU * val : val, v = w * r;
    return { r, m, w, v, f: w / TAU, T: TAU / w, ac: w * w * r, F: m * w * w * r }; };
  // position and velocity at time t (θ = ωt, anticlockwise seen from above; x–z plane, y up in the 3D scene)
  E.ucmAt = (r, w, t) => { const th = w * t; return { th, x: r * Math.cos(th), z: -r * Math.sin(th), vx: -r * w * Math.sin(th), vz: -r * w * Math.cos(th) }; };

  /* ---------- 2. banked road ----------
     Car of mass m at speed v on a circle of radius r banked at θ. Taking "f positive = down the slope":
       N sinθ + f cosθ = m v²/r   (horizontal, towards the centre)
       N cosθ − f sinθ = m g      (vertical)
     ⇒ N = m(g cosθ + (v²/r) sinθ),  f = m((v²/r) cosθ − g sinθ).  f > 0: faster than ideal, friction acts DOWN the
     slope (the car tends to slide up and out); f < 0: slower than ideal, friction acts UP the slope. */
  E.bank = (v, r, deg, mu, m = 1000) => { const th = deg * D2R, a = v * v / r, N = m * (g * Math.cos(th) + a * Math.sin(th)), f = m * (a * Math.cos(th) - g * Math.sin(th));
    const vIdeal = Math.sqrt(r * g * Math.tan(th)), dn = Math.cos(th) - mu * Math.sin(th), vMax = dn > 1e-12 ? Math.sqrt(r * g * (Math.sin(th) + mu * Math.cos(th)) / dn) : Infinity;
    const lo = Math.sin(th) - mu * Math.cos(th), vMin = lo > 0 ? Math.sqrt(r * g * lo / (Math.cos(th) + mu * Math.sin(th))) : 0;
    const need = N > 0 ? Math.abs(f) / N : Infinity, ok = need <= mu + 1e-12, tol = 1e-9 * m * g;
    return { th, a, N, f, fdir: Math.abs(f) < tol ? 'none' : f > 0 ? 'down' : 'up', need, ok, vIdeal, vMin, vMax, thIdealDeg: Math.atan(a / g) / D2R, Fc: m * a,
      slide: ok ? 'none' : f > 0 ? 'up' : 'down' }; };

  /* ---------- 3. conical pendulum ---------- string length L, half-angle θ from the vertical
       T cosθ = mg, T sinθ = m ω² (L sinθ) ⇒ ω² = g/(L cosθ); r = L sinθ; T = mg/cosθ; period = 2π√(L cosθ/g).
     Given ω instead: cosθ = g/(ω²L), which needs ω ≥ √(g/L); below that the bob just hangs (θ = 0). */
  E.conical = (L, deg, m = 1) => { const th = deg * D2R, c = Math.cos(th), w = Math.sqrt(g / (L * c)); return { th, r: L * Math.sin(th), w, v: w * L * Math.sin(th), T: m * g / c, period: TAU / w, h: L * c, Fc: m * g * Math.tan(th), ok: true }; };
  E.conicalW = (L, w, m = 1) => { const w0 = Math.sqrt(g / L); if (w <= w0) return { th: 0, r: 0, w, v: 0, T: m * g, period: TAU / w, h: L, Fc: 0, ok: false, w0 }; const th = Math.acos(g / (w * w * L)); return Object.assign(E.conical(L, th / D2R, m), { w0 }); };

  /* ---------- 4. cyclist on a level curve ---------- lean θ measured FROM THE VERTICAL.
     Friction f = m v²/r (towards the centre) supplies the centripetal force; N = mg. For no toppling torque about the
     centre of mass the resultant road force (N + f) must pass through it: tanθ = f/N = v²/(rg). Needs μ ≥ v²/(rg). */
  E.cyclist = (v, r, m = 80, mu = 0.8) => { const th = Math.atan(v * v / (r * g)), f = m * v * v / r; return { th, deg: th / D2R, N: m * g, f, muNeed: v * v / (r * g), grips: v * v / (r * g) <= mu + 1e-12, vMax: Math.sqrt(mu * g * r), R: hyp(m * g, f) }; };
  E.cyclistV = (deg, r) => Math.sqrt(r * g * Math.tan(deg * D2R));

  /* ---------- 5. block in a rotating hemispherical bowl ---------- bowl radius R spinning at ω about its vertical axis;
     the block sits at polar angle θ measured from the bottom, r = R sinθ. Ground frame, steady state, smooth bowl:
       N sinθ = m ω² R sinθ,  N cosθ = mg  ⇒ cosθ = g/(ω²R) (needs ω²R > g; otherwise the block stays at the bottom).
     With friction a band of angles is possible. Dynamics (block assumed carried round azimuthally by the bowl):
       R θ'' = −g sinθ + ω²R sinθ cosθ + f_t/m ,  N/m = g cosθ + ω²R sin²θ + Rθ'²  (f_t limited by μN). */
  E.bowlEq = (R, w) => (w * w * R > g ? Math.acos(g / (w * w * R)) : 0);
  E.bowlForces = (R, w, th, m = 1) => { const N = m * (g * Math.cos(th) + w * w * R * sq(Math.sin(th))), ft = m * (g * Math.sin(th) - w * w * R * Math.sin(th) * Math.cos(th));
    return { N, f: ft, need: N > 0 ? Math.abs(ft) / N : Infinity, r: R * Math.sin(th), Fc: m * w * w * R * Math.sin(th), cf: m * w * w * R * Math.sin(th) }; }; // f > 0: friction must act UP the bowl wall (towards larger θ)
  // band of angles (degrees) where static friction μ can hold the block at ω
  E.bowlBand = (R, w, mu, n = 1800) => { let lo = null, hi = null; for (let i = 0; i <= n; i++) { const th = i / n * (PI / 2 - 1e-6), b = E.bowlForces(R, w, th); if (b.need <= mu + 1e-12) { if (lo === null) lo = th; hi = th; } } return lo === null ? null : [lo / D2R, hi / D2R]; };
  E.bowlInit = (R, w, th) => ({ th, thd: 0, stuck: true, out: false });
  E.bowlStep = (s, P, h) => { if (s.out) return; const { R, mu } = P, w = P.w, acc = th => -g / R * Math.sin(th) + w * w * Math.sin(th) * Math.cos(th), Nm = (th, thd) => g * Math.cos(th) + w * w * R * sq(Math.sin(th)) + R * thd * thd;
    if (s.stuck) { if (Math.abs(R * acc(s.th)) <= mu * Nm(s.th, 0) + 1e-12) { s.thd = 0; return; } s.stuck = false; }
    const dir0 = Math.abs(s.thd) > 1e-9 ? Math.sign(s.thd) : Math.sign(acc(s.th));
    const y = rk4(([th, thd]) => [thd, acc(th) - mu * Math.max(0, Nm(th, thd)) / R * dir0], [s.th, s.thd], h);
    if (mu > 0 && Math.abs(s.thd) > 1e-9 && Math.sign(y[1]) !== Math.sign(s.thd)) { s.th = y[0]; s.thd = 0; s.stuck = Math.abs(R * acc(s.th)) <= mu * Nm(s.th, 0); return; }
    s.th = y[0]; s.thd = y[1]; if (s.th < 0) { s.th = -s.th; s.thd = -s.thd; } // the bottom is a symmetry point: pass through it
    if (s.th >= PI / 2) { s.th = PI / 2; s.out = true; } };

  /* ---------- 6. block sliding off a sphere ---------- sphere radius R resting on the floor (centre at height R); the block
     starts at angle θ₀ from the top with speed v₀. Smooth: v² = v₀² + 2gR(cosθ₀ − cosθ), N = m(g cosθ − v²/R);
     it separates when N = 0: cosθ = (v₀²/(gR) + 2cosθ₀)/3 — from rest at the very top, cosθ = 2/3 (θ ≈ 48.19°).
     Then it is a projectile. With friction μ the motion is integrated: R θ'' = g sinθ − μ N/m. */
  E.sphereSep = (R, v0 = 0, th0 = 0) => { const c = (v0 * v0 / (g * R) + 2 * Math.cos(th0)) / 3; return c >= Math.cos(th0) ? th0 : Math.acos(clamp(c, -1, 1)); };
  E.sphereInit = (R, v0, th0) => ({ ph: 'on', th: th0, thd: v0 / R, x: 0, y: 0, vx: 0, vy: 0, t: 0, N: 0, stuck: false, sepTh: null, land: null });
  E.sphereStep = (s, P, h) => { const { R, mu } = P; s.t += h;
    if (s.ph === 'on') { const Nm = (th, thd) => g * Math.cos(th) - R * thd * thd;
      if (s.stuck) { s.N = Nm(s.th, 0); return; }
      if (mu > 0 && s.thd <= 1e-9 && Math.tan(s.th) <= mu) { s.thd = 0; s.stuck = true; s.N = Nm(s.th, 0); return; } // static friction holds it
      const y = rk4(([th, thd]) => [thd, (g * Math.sin(th) - mu * Math.max(0, Nm(th, thd))) / R], [s.th, s.thd], h);
      if (mu > 0 && y[1] < 0) { s.th = y[0]; s.thd = 0; s.stuck = Math.tan(s.th) <= mu; s.N = Nm(s.th, 0); return; }
      const N1 = Nm(y[0], y[1]);
      if (N1 <= 0) { // contact lost during this step: locate N = 0 by bisection on the sub-step, then leave tangentially
        let a = 0, b = h; for (let i = 0; i < 40; i++) { const m = 0.5 * (a + b), z = rk4(([th, thd]) => [thd, (g * Math.sin(th) - mu * Math.max(0, Nm(th, thd))) / R], [s.th, s.thd], m); if (Nm(z[0], z[1]) > 0) a = m; else b = m; }
        const z = rk4(([th, thd]) => [thd, (g * Math.sin(th) - mu * Math.max(0, Nm(th, thd))) / R], [s.th, s.thd], b), v = z[1] * R;
        s.th = z[0]; s.sepTh = z[0]; s.ph = 'air'; s.N = 0; s.x = R * Math.sin(z[0]); s.y = R + R * Math.cos(z[0]); s.vx = v * Math.cos(z[0]); s.vy = -v * Math.sin(z[0]); return; }
      s.th = y[0]; s.thd = y[1]; s.N = N1; return; }
    if (s.ph === 'air') { const y0 = s.y, v0 = s.vy; s.x += s.vx * h; s.y += s.vy * h - 0.5 * g * h * h; s.vy -= g * h;
      if (s.y <= 0) { const tau = (v0 + Math.sqrt(v0 * v0 + 2 * g * y0)) / g; s.x += s.vx * (tau - h); s.vy = v0 - g * tau; s.y = 0; s.ph = 'landed'; s.land = s.x; } } }; // exact touchdown inside the step
  // exact landing distance from the sphere's axis for the smooth case (projectile from the separation point)
  E.sphereLand = (R, v0 = 0, th0 = 0) => { const th = E.sphereSep(R, v0, th0), v = Math.sqrt(v0 * v0 + 2 * g * R * (Math.cos(th0) - Math.cos(th))), x0 = R * Math.sin(th), y0 = R + R * Math.cos(th), vx = v * Math.cos(th), vy = -v * Math.sin(th);
    const t = (vy + Math.sqrt(vy * vy + 2 * g * y0)) / g; return { th, v, x: x0 + vx * t, t }; };

  /* ---------- 7 & 13. vertical circle (string, rigid rod, inside of a track) ---------- φ measured from the BOTTOM.
     Position (R sinφ, −R cosφ) about the centre. On the circle: φ'' = −(g/R) sinφ / (1 + k)  (k = I/mr² for a rolling ball,
     0 for a sliding/point mass); constraint force towards the centre T/m = Rφ'² + g cosφ.
     A string or a track can only PULL / PUSH towards the centre (T ≥ 0): when T would become negative the body leaves the
     circle and flies freely; it is caught again when it reaches the circle (string taut / hits the track) and the radial
     part of its velocity is removed (an inelastic jerk). A rod can push and pull, so it never leaves. */
  // smallest speed at the bottom that carries the body over the top: string/track need v_top² ≥ gR, a rod only v_top > 0
  E.vcMin = (R, kind, k = 0) => Math.sqrt((kind === 'rod' ? 0 : g * R) + 4 * g * R / (1 + k));
  E.vcLoseCos = (R, v0) => (2 * g * R - v0 * v0) / (3 * g * R); // string: cosφ at which T = 0 (valid for 2gR < v0² < 5gR)
  E.vcInit = (R, v0) => ({ ph: 'on', phi: 0, phid: v0 / R, x: 0, y: -R, vx: v0, vy: 0, T: 0, t: 0, lost: null, laps: 0, catches: 0 });
  E.vcTension = (s, R) => R * s.phid * s.phid + g * Math.cos(s.phi);
  E.vcStep = (s, P, h) => { const { R, kind } = P, k = P.k || 0; s.t += h;
    if (s.ph === 'on') { const y = rk4(([p, pd]) => [pd, -(g / R) * Math.sin(p) / (1 + k)], [s.phi, s.phid], h), T = R * y[1] * y[1] + g * Math.cos(y[0]);
      if (kind !== 'rod' && T < 0) { // lost tension / contact: fly freely from where T crossed zero
        let a = 0, b = h; for (let i = 0; i < 40; i++) { const m = 0.5 * (a + b), z = rk4(([p, pd]) => [pd, -(g / R) * Math.sin(p) / (1 + k)], [s.phi, s.phid], m); if (R * z[1] * z[1] + g * Math.cos(z[0]) > 0) a = m; else b = m; }
        const z = rk4(([p, pd]) => [pd, -(g / R) * Math.sin(p) / (1 + k)], [s.phi, s.phid], b); s.phi = z[0]; s.phid = z[1]; s.ph = 'free'; s.T = 0; s.lost = s.lost == null ? z[0] : s.lost;
        s.x = R * Math.sin(z[0]); s.y = -R * Math.cos(z[0]); s.vx = R * z[1] * Math.cos(z[0]); s.vy = R * z[1] * Math.sin(z[0]); return; }
      const before = Math.floor((s.phi + PI) / TAU); s.phi = y[0]; s.phid = y[1]; s.T = T; if (Math.floor((s.phi + PI) / TAU) !== before) s.laps++;
      s.x = R * Math.sin(s.phi); s.y = -R * Math.cos(s.phi); s.vx = R * s.phid * Math.cos(s.phi); s.vy = R * s.phid * Math.sin(s.phi); return; }
    // free flight inside the circle
    s.x += s.vx * h; s.y += s.vy * h - 0.5 * g * h * h; s.vy -= g * h; const r = hyp(s.x, s.y);
    if (r >= R) { const ux = s.x / r, uy = s.y / r, vr = s.vx * ux + s.vy * uy; s.x = ux * R; s.y = uy * R; if (vr > 0) { s.vx -= vr * ux; s.vy -= vr * uy; }
      const phi = Math.atan2(s.x, -s.y), vt = s.vx * Math.cos(phi) + s.vy * Math.sin(phi); // unwrap φ continuously
      s.phi = phi + TAU * Math.round((s.phi - phi) / TAU); s.phid = vt / R; s.ph = 'on'; s.catches++; s.T = Math.max(0, E.vcTension(s, R)); } };
  E.vcEnergy = (s, R, k = 0) => { const v2 = s.ph === 'on' ? sq(R * s.phid) : s.vx * s.vx + s.vy * s.vy; return 0.5 * v2 * (s.ph === 'on' ? 1 + k : 1) + g * (s.y + R); }; // per unit mass, zero at the bottom

  /* ---------- 8 & 14. objects on a rotating turntable ---------- table angle Θ(t) = ω₀t + ½αt² (ω capped at ωmax).
     A coin at radius r sticks while the friction it needs, m·√((ω²r)² + (αr)²), is ≤ μs·mg. When it slips, kinetic
     friction μk·mg acts against its velocity RELATIVE to the table surface under it; past the rim it falls. */
  E.tableSlipW = (r, mu) => Math.sqrt(mu * g / r);
  E.tableInit = (coins, w0) => ({ t: 0, Th: 0, w: w0, coins: coins.map(c => ({ r: c.r, a0: c.a || 0, m: c.m || 0.1, mus: c.mus, muk: c.muk == null ? c.mus : c.muk, stuck: true, x: c.r * Math.cos(c.a || 0), z: -c.r * Math.sin(c.a || 0), vx: 0, vz: 0, y: 0, vy: 0, ph: 'table', slipT: null, slipW: null, rel: 0 })) });
  E.tableStep = (s, P, h) => { const { Rt, H } = P, al = s.w >= P.wmax ? 0 : P.al || 0; s.t += h; s.Th += s.w * h + 0.5 * al * h * h; s.w = Math.min(P.wmax == null ? Infinity : P.wmax, s.w + al * h); const w = s.w;
    s.coins.forEach(c => {
      if (c.ph === 'table' && c.stuck) { const need = Math.sqrt(sq(w * w * c.r) + sq(al * c.r)); if (need <= c.mus * g + 1e-12) { const a = c.a0 + s.Th; c.x = c.r * Math.cos(a); c.z = -c.r * Math.sin(a); c.vx = -w * c.r * Math.sin(a); c.vz = -w * c.r * Math.cos(a); return; }
        c.stuck = false; c.slipT = s.t; c.slipW = w; }
      if (c.ph === 'table') { // sliding on the table: table surface velocity at (x, z) is ω ŷ × r = (−ω z ... ) with our anticlockwise-from-above convention
        const sx = w * c.z * 1, sz = -w * c.x * 1, rx = c.vx - sx, rz = c.vz - sz, rv = hyp(rx, rz); c.rel = rv;
        if (rv > 1e-6) { const k = Math.min(c.muk * g * h, rv) / rv; c.vx -= rx * k; c.vz -= rz * k; }
        c.x += c.vx * h; c.z += c.vz * h; c.r = hyp(c.x, c.z); if (c.r > Rt) { c.ph = 'air'; c.vy = 0; } return; }
      if (c.ph === 'air') { c.y += c.vy * h - 0.5 * g * h * h; c.vy -= g * h; c.x += c.vx * h; c.z += c.vz * h; if (c.y <= -H) { c.y = -H; c.ph = 'floor'; } }
      if (c.ph === 'floor') { const v = hyp(c.vx, c.vz); if (v > 1e-4) { const k = Math.max(0, v - 0.5 * g * h) / v; c.vx *= k; c.vz *= k; c.x += c.vx * h; c.z += c.vz * h; } }
    }); };

  /* ---------- 9. puck on a string on a frictionless table ---------- tension alone provides the centripetal force:
     T = m v²/r (the table's normal force balances gravity — no angle, unlike the conical pendulum).
     Through a hole to a hanging mass M at rest: T = Mg ⇒ v = √(Mgr/m). If T exceeds the breaking strength the string
     breaks and the puck continues in a straight line along the tangent. */
  E.puck = (m, r, v) => ({ T: m * v * v / r, w: v / r, period: TAU * r / v });
  E.puckHole = (m, M, r) => ({ T: M * g, v: Math.sqrt(M * g * r / m), w: Math.sqrt(M * g / (m * r)), period: TAU * Math.sqrt(m * r / (M * g)) });

  /* ---------- 10. car on a flat (unbanked) curve ---------- only static friction can supply m v²/r: needs μ ≥ v²/(rg),
     v_max = √(μ g r). Above it the tyres give at most μmg sideways; at constant speed the car then follows a wider
     circle ρ = v²/(μg) and drifts across the road. */
  E.flat = (v, r, mu, m = 1200) => { const need = v * v / (r * g); return { Fc: m * v * v / r, fmax: mu * m * g, need, grips: need <= mu + 1e-12, vMax: Math.sqrt(mu * g * r), rho: need <= mu ? r : v * v / (mu * g) }; };
  E.flatInit = (r) => ({ x: r, z: 0, hd: -PI / 2, t: 0, slid: false, off: false, d: r, marks: 0 }); // starts at (r, 0) heading −z (anticlockwise from above)
  E.flatStep = (s, P, h) => { if (s.off) { s.x += P.v * Math.cos(s.hd) * h; s.z += P.v * Math.sin(s.hd) * h; s.t += h; return; } const { v, r, mu, w } = P; s.t += h;
    const need = v * v / r, alat = Math.min(need, mu * g); s.slid = need > mu * g + 1e-9; // lateral acceleration towards the inside of the turn
    s.hd -= (alat / v) * h; // turning left (anticlockwise seen from above, our +y up; heading measured from +x towards +z)
    s.x += v * Math.cos(s.hd) * h; s.z += v * Math.sin(s.hd) * h; s.d = hyp(s.x, s.z); if (s.d > r + w / 2) s.off = true; if (s.slid) s.marks += h; };

  /* ---------- 11. satellite in a circular orbit ---------- v = √(GM/r), T = 2π√(r³/GM) ⇒ T² ∝ r³. A speed factor k ≠ 1
     gives an ellipse (k < 1 falls inwards, √2 ≤ k escapes); integrated with velocity Verlet in simulated seconds. */
  E.orbit = (M, r) => ({ v: Math.sqrt(G * M / r), T: TAU * Math.sqrt(r * r * r / (G * M)), a: G * M / (r * r), w: Math.sqrt(G * M / (r * r * r)) });
  E.orbitInit = (M, r, k = 1) => { const o = E.orbit(M, r); return { x: r, y: 0, vx: 0, vy: o.v * k, t: 0, crashed: false, escaped: false, rmin: r, rmax: r }; };
  E.orbitStep = (s, P, h) => { if (s.crashed || s.escaped) return; const { M, Rp } = P, acc = (x, y) => { const r3 = Math.pow(x * x + y * y, 1.5); return [-G * M * x / r3, -G * M * y / r3]; };
    const [ax, ay] = acc(s.x, s.y); s.x += s.vx * h + 0.5 * ax * h * h; s.y += s.vy * h + 0.5 * ay * h * h; const [bx, by] = acc(s.x, s.y); s.vx += 0.5 * (ax + bx) * h; s.vy += 0.5 * (ay + by) * h; s.t += h;
    const r = hyp(s.x, s.y); s.rmin = Math.min(s.rmin, r); s.rmax = Math.max(s.rmax, r); if (r <= Rp) s.crashed = true; if (r > 60 * P.r0) s.escaped = true; };

  /* ---------- 12. chair-o-plane ---------- a chair on a chain of length L hangs from the end of an arm at distance d from
     the axis; the ride turns at ω. Equilibrium chain angle θ from the vertical: tanθ = ω²(d + L sinθ)/g (radius
     r = d + L sinθ). d = 0 reduces to the conical pendulum. The rider's mass cancels; tension T = mg/cosθ. */
  E.chair = (d, L, w, m = 70) => { const fn = th => Math.tan(th) - w * w * (d + L * Math.sin(th)) / g; let th = 0;
    if (d > 0) th = root(fn, 0, PI / 2 - 1e-9); else if (w * w * L > g) th = Math.acos(g / (w * w * L));
    const r = d + L * Math.sin(th); return { th, deg: th / D2R, r, v: w * r, T: m * g / Math.cos(th), Fc: m * w * w * r, period: TAU / w }; };

  /* ---------- 13. loop-the-loop ---------- released from height h above the bottom of a loop of radius R, smooth;
     k = 0 for a sliding cart, 2/5 for a rolling solid ball: v_bottom² = 2gh/(1 + k). Stays on the track all the way
     round iff v_top² ≥ gR: h ≥ 2.5R (sliding), h ≥ 2.7R (rolling ball). */
  E.loopMinH = (R, k = 0) => R * (2 + 0.5 * (1 + k));
  E.loopV0 = (h, k = 0) => Math.sqrt(2 * g * h / (1 + k));

  /* ---------- the challenge lab: every question's answer is computed by the same engine ---------- */
  E.answers = {
    bankIdeal: p => E.bank(1, p.r, p.deg, 0).vIdeal,
    conicalPeriod: p => E.conical(p.L, p.deg).period,
    sphereSep: () => Math.acos(2 / 3) / D2R,
    loopMin: p => E.loopMinH(p.R, 0),
    coinSlip: p => E.tableSlipW(p.r, p.mu),
    flatMax: p => E.flat(1, p.r, p.mu).vMax,
    orbitPeriod: p => E.orbit(ME, p.r).T / 60,
    stringTop: p => Math.sqrt(5 * g * p.R)
  };
  // a seeded generator so a challenge can be repeated exactly
  E.rng = seed => { let a = seed >>> 0 || 1; return () => { a ^= a << 13; a >>>= 0; a ^= a >> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; };

  if (typeof window !== 'undefined') { window.LS = window.LS || {}; window.LS.circ = E; } // the browser (a page may define a global `module`)
  if (typeof module === 'object' && module && module.exports && typeof window === 'undefined') module.exports = E; // Node, for the unit tests
})(typeof window !== 'undefined' ? window : globalThis);
