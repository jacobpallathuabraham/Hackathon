/* ERLY — Noor Lab: physics and STEM simulations (v16).
   One harness (play / pause / step / speed / reset, parameter sliders, live graphs, readouts) runs separate
   models, each with its own equations, units, assumptions and validation:
     MechanicsEngine     projectile (RK4, optional quadratic drag; analytic check), Newton's 2nd law with friction,
                         1D collisions (coefficient of restitution), spring–mass (energy check), pendulum
                         (nonlinear; exact period from the complete elliptic integral)
     CircuitEngine       DC nodal analysis (modified nodal analysis) for any series/parallel network, LEDs,
                         switches, an RC charging transient; Kirchhoff checks shown
     Field engines       electric field and potential of point charges (Coulomb), magnetic field of long wires
     WaveEngine          two-source interference, superposition, standing waves, Doppler
     OpticsEngine        refraction (Snell, critical angle, TIR), thin lens / concave mirror ray diagrams
     ThermodynamicsEngine  2D hard-disc gas: measured pressure vs PV = NkT, speed distribution vs Maxwell–Boltzmann
     AstronomyEngine     Kepler orbits (velocity Verlet; energy, angular momentum and period checks), planets to scale
     ModernPhysicsEngine radioactive decay as a random process vs N₀·2^(−t/T½)
   Every model says what it simplifies. Values are SIMULATED, not measured. */
(function () {
  'use strict';
  const L = window.ERLY_LAB; if (!L) return;
  const { T, esc, num: N, ui } = L;
  const P = L.phys = {};

  /* ======================= shared simulation harness ======================= */
  function harness(ctx, def) {
    const S = Object.assign({}, def.defaults, ctx.params.set || {});
    const st = { t: 0, running: def.autoplay !== false && !L.still(), speed: 1, hist: [], series: def.series ? def.series[0][0] : null, frame: 0 };
    ctx.stage.classList.add('lab-split'); if (!def.graph) ctx.stage.classList.add('lab-split--one');
    const sceneEl = ui.el('div', 'lab-scene'), graphEl = ui.el('div', 'lab-graph'); ctx.stage.append(sceneEl); if (def.graph) ctx.stage.append(graphEl);
    let drag = null;
    const view = def.view(S);
    const Pl = new L.Plot(sceneEl, { view, equal: def.equal !== false, grid: def.grid !== false, labels: def.labels || { x: 'x (m)', y: 'y (m)' }, pan: def.pan !== false,
      onDown: def.onDown ? (x, y) => { const r = def.onDown(S, st, x, y, api); if (r) { drag = r; return true; } return false; } : null,
      onDrag: (x, y) => { if (drag && def.onDrag) { def.onDrag(S, st, x, y, drag, api); redraw(); } }, onUp: () => { drag = null; } });
    const Gp = def.graph ? new L.Plot(graphEl, { equal: false, pan: false, zoom: false, labels: { x: 't (s)', y: '' } }) : null;
    Pl.draw = (g, p) => def.draw(g, p, S, st, api);
    if (Gp) Gp.draw = (g, p) => (def.graphDraw ? (g.fillStyle = L.colors().bg, g.fillRect(0, 0, p.W, p.H), def.graphDraw(g, p, S, st, api)) : drawGraph(g, p));
    function init() { st.t = 0; st.hist = []; st.frame = 0; def.init(S, st, api); record(true); }
    function record(force) { if (!def.sample) return; if (force || st.frame % (def.every || 3) === 0) { st.hist.push([st.t].concat(def.sample(S, st))); if (st.hist.length > 4000) st.hist.splice(0, st.hist.length - 4000); } }
    function drawGraph(g, p) {
      const H = st.hist; if (!H.length || !def.series) return; const c = L.colors();
      const sel = def.series.find(s => s[0] === st.series) || def.series[0]; const idx = sel[2]; const cols = Array.isArray(idx) ? idx : [idx];
      const t1 = Math.max(def.tWindow || 5, st.t); let lo = Infinity, hi = -Infinity; H.forEach(r => cols.forEach(i => { if (isFinite(r[i])) { lo = Math.min(lo, r[i]); hi = Math.max(hi, r[i]); } }));
      if (sel[3]) { const ex = sel[3]; for (let k = 0; k <= 60; k++) { const v = ex(S, t1 * k / 60); if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } } }
      if (!isFinite(lo)) { lo = -1; hi = 1; } if (hi - lo < 1e-9) { hi += 1; lo -= 1; } const pad = (hi - lo) * 0.12;
      p.view = { x0: 0, x1: t1 * 1.02, y0: lo - pad, y1: hi + pad }; p.labels = { x: 't (s)', y: sel[1] };
      p.g.fillStyle = c.bg; p.g.fillRect(0, 0, p.W, p.H); p.grid();
      cols.forEach((i, k) => p.path(H.map(r => [r[0], r[i]]), c.pal[k % 8], { w: 2.2 }));
      if (sel[3]) p.fn(tt => (tt <= t1 ? sel[3](S, tt) : NaN), c.muted, { w: 1.4, dash: [5, 5] });
      if (sel[4]) { p.g.font = '600 11px ui-sans-serif, system-ui'; p.g.textAlign = 'right'; const items = sel[4].map((l, k) => [l, c.pal[k % 8]]).concat(sel[3] ? [[T('dashed: theory', 'المتقطع: نظري'), c.muted]] : []); let x = p.W - 12; items.slice().reverse().forEach(([l, col]) => { p.g.fillStyle = col; p.g.fillText(l, x, 28); x -= p.g.measureText(l).width + 16; }); p.g.textAlign = 'left'; }
    }
    let raf = 0, last = performance.now(), dead = false, acc = 0;
    function loop(now) {
      if (dead) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (st.running && !st.done) { acc += dt * st.speed; const h = def.h || 1 / 240; let n = 0; while (acc >= h && n < 2000) { def.step(S, st, h, api); st.t += h; st.frame++; record(); acc -= h; n++; if (st.done) break; } }
      if (st.running || st.dirty) { redraw(); st.dirty = false; }
      raf = requestAnimationFrame(loop);
    }
    let hudT = 0;
    function redraw() { Pl.render(); Gp && Gp.render(); const now = performance.now(); if (now - hudT > 120) { hudT = now; L.hud(def.readout ? ui.readout(def.readout(S, st, api)) : ''); if (!st.running) L.explainNow(); } }
    const side = ctx.side;
    const api = {
      sliders: {},
      S, st, plot: Pl, graph: Gp, init, redraw, toggle,
      set(k, v) { S[k] = v; if (api.sliders[k]) api.sliders[k].set(v); const q = (def.params || []).find(x => x.key === k); if (q && q.onSet) q.onSet(S, st, api); if (!q || !q.live) { init(); st.done = false; } st.dirty = true; redraw(); },
      get: k => S[k],
      params: () => (def.params || []).map(q => ({ key: q.key, label: q.label, unit: q.unit, step: q.step, alias: q.alias })),
      fit() { Pl.view = def.view(S); Pl.home = Object.assign({}, Pl.view); Pl.fit(); Pl.render(); },
      run(seconds) { // advance the model by a fixed amount of simulated time (used by tests and by "run for 3 s")
        const h = def.h || 1 / 240, n = Math.round(seconds / h); for (let i = 0; i < n && !st.done; i++) { def.step(S, st, h, api); st.t += h; st.frame++; record(); } redraw(); },
      rebuild() { side.innerHTML = ''; ctx.stage.innerHTML = ''; ctx.stage.classList.remove('lab-split', 'lab-split--one'); dead = true; cancelAnimationFrame(raf); Pl.destroy(); Gp && Gp.destroy(); L.open(ctx.id, Object.assign({}, ctx.params, { set: Object.assign({}, S) })); }
    };
    // controls
    const run = ui.group(T('Run', 'التشغيل')); if (def.static) run.hidden = true;
    const bt = ui.buttons([[st.running ? '❚❚ ' + T('Pause', 'إيقاف') : '▶ ' + T('Play', 'تشغيل'), () => toggle(), { key: 'play', primary: true }], ['⏭ ' + T('Step', 'خطوة'), () => stepOnce(), { key: 'step' }], ['↺ ' + T('Restart', 'إعادة'), () => { init(); st.done = false; redraw(); L.explainNow(); }, { key: 'restart' }]]);
    run.appendChild(bt);
    run.appendChild(ui.select({ key: 'speed', label: T('Speed', 'السرعة'), value: 1, options: [[0.1, '0.1×'], [0.25, '0.25×'], [0.5, '0.5×'], [1, '1×'], [2, '2×'], [4, '4×'], [10, '10×']], on: v => { st.speed = +v; } }));
    if (def.series) run.appendChild(ui.select({ key: 'series', label: T('Graph', 'الرسم'), value: st.series, options: def.series.map(s => [s[0], s[1]]), on: v => { st.series = v; Gp.render(); } }));
    side.appendChild(run);
    const pg = ui.group(T('Parameters', 'المعاملات'));
    const sliders = api.sliders;
    (def.params || []).filter(q => !q.when || q.when(S)).forEach(q => { const s = ui.slider({ key: q.key, label: q.label + (q.unit ? ` (${q.unit})` : ''), min: q.min, max: q.max, step: q.step, value: S[q.key], on: v => { S[q.key] = v; if (q.live) { st.dirty = true; } else { init(); st.done = false; } if (q.onSet) q.onSet(S, st, api); st.dirty = true; redraw(); L.explainNow(); } }); sliders[q.key] = s; pg.appendChild(s); });
    (def.toggles || []).forEach(q => pg.appendChild(ui.toggle({ key: q.key, label: q.label, value: S[q.key], on: v => { S[q.key] = v; if (!q.live) init(); st.dirty = true; redraw(); L.explainNow(); } })));
    (def.selects || []).filter(q => !q.when || q.when(S)).forEach(q => pg.appendChild(ui.select({ key: q.key, label: q.label, value: S[q.key], options: q.options, on: v => { S[q.key] = isFinite(+v) && q.num !== false ? +v : v; if (q.onSet) q.onSet(S, st, api); init(); st.done = false; st.dirty = true; redraw(); L.explainNow(); if (q.rebuild) api.rebuild(); } })));
    if (def.extraControls) def.extraControls(pg, S, st, api);
    side.appendChild(pg);
    if (def.note) side.appendChild(ui.el('p', 'lab-sub lab-assume', '⚠︎ ' + def.note));
    function toggle() { st.running = !st.running; if (st.done && st.running) { init(); st.done = false; } const b = side.querySelector('[data-key="play"]'); b.textContent = st.running ? '❚❚ ' + T('Pause', 'إيقاف') : '▶ ' + T('Play', 'تشغيل'); last = performance.now(); if (!st.running) L.explainNow(); }
    function stepOnce() { st.running = false; const b = side.querySelector('[data-key="play"]'); b.textContent = '▶ ' + T('Play', 'تشغيل'); const h = def.h || 1 / 240, n = Math.round((1 / 30) / h); for (let i = 0; i < n && !st.done; i++) { def.step(S, st, h, api); st.t += h; st.frame++; record(); } redraw(); L.explainNow(); }
    init(); raf = requestAnimationFrame(loop); setTimeout(redraw, 30);
    return {
      api,
      intro: () => def.intro(S, st, api),
      explain: () => (def.explain ? def.explain(S, st, api) : '') + (def.assume ? `<details class="lab-more"><summary>${T('Assumptions and limits of this model', 'افتراضات النموذج وحدوده')}</summary><p>${def.assume}</p></details>` : ''),
      command: t => { let r = def.command ? def.command(t, S, st, api) : null; if (r && !r.keep) { init(); st.done = false; st.dirty = true; redraw(); if (!st.running && def.autoplay !== false && !L.still()) toggle(); } return r; },
      state: () => Object.assign({ t: +st.t.toFixed(4), running: st.running }, def.state ? def.state(S, st, api) : { params: Object.assign({}, S) }),
      table: () => (def.sample && st.hist.length ? [['t'].concat(def.columns || [])].concat(st.hist.map(r => r.map(v => (typeof v === 'number' ? +v.toPrecision(8) : v)))) : null),
      canvas: () => Pl.cv, summary: () => def.intro(S, st, api),
      params: api.params, get: api.get, set: api.set,
      reset: () => L.open(ctx.id, ctx.params), redraw: () => redraw(),
      destroy: () => { dead = true; cancelAnimationFrame(raf); Pl.destroy(); Gp && Gp.destroy(); ctx.stage.classList.remove('lab-split', 'lab-split--one'); }
    };
  }
  L.harness = (ctx, def) => harness(ctx, def); // v17: shared with lab-problems.js (problem-to-scene engines)
  function reg(id, kind, title, match, def) { L.register({ id, family: 'physics', kind, title, match, async mount(ctx) { ctx.id = id; const d = typeof def === 'function' ? await def(ctx) : def; const h = harness(ctx, d); return h; } }); }
  const KIND = { mech: T('Physics · Mechanics', 'فيزياء · الميكانيكا'), elec: T('Physics · Electricity & magnetism', 'فيزياء · الكهرباء والمغناطيسية'), wave: T('Physics · Waves & optics', 'فيزياء · الموجات والبصريات'), heat: T('Physics · Thermodynamics', 'فيزياء · الديناميكا الحرارية'), space: T('Physics · Astronomy', 'فيزياء · الفلك'), modern: T('Physics · Modern physics', 'فيزياء · الفيزياء الحديثة') };
  const num1 = (t, re, d) => { const m = t.match(re); return m ? +m[1] : d; };
  const words = s => new RegExp('\\b(' + s + ')', 'i');

  /* ======================= projectile ======================= */
  P.projectileAnalytic = (v0, deg, g, h0) => { const a = deg * Math.PI / 180, vx = v0 * Math.cos(a), vy = v0 * Math.sin(a), tf = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g; return { range: vx * tf, time: tf, height: h0 + vy * vy / (2 * g) }; };
  P.projectileNumeric = (v0, deg, g, h0, c, m, h) => { h = h || 1e-3; const a = deg * Math.PI / 180; let s = [0, h0, v0 * Math.cos(a), v0 * Math.sin(a)], t = 0, ymax = h0; const f = (tt, y) => { const v = Math.hypot(y[2], y[3]); return [y[2], y[3], -(c / m) * v * y[2], -g - (c / m) * v * y[3]]; }; while (t < 1e4) { const n = N.rk4(f, t, s, h); if (n[1] < 0) { const k = s[1] / (s[1] - n[1]); return { range: s[0] + k * (n[0] - s[0]), time: t + k * h, height: ymax }; } s = n; t += h; ymax = Math.max(ymax, s[1]); } return null; };
  reg('projectile', KIND.mech, T('Projectile motion', 'حركة المقذوفات'),
    t => (/\b(projectile|trajectory|launch(ed)? at|thrown at|cannon|kicked at|fired at|parabolic motion)\b/i.test(t) ? { score: 0.93, params: { set: { angle: num1(t, /(\d+(?:\.\d+)?)\s*(?:degrees|deg|°)/i, 45), v0: num1(t, /(\d+(?:\.\d+)?)\s*m\/s/i, 20), k: /air resistance|drag/i.test(t) && !/no air|without air|remove air/i.test(t) ? 0.01 : 0 }, compare: (t.match(/compare[^.]*?((?:\d+\s*(?:,|and|°|degrees)\s*)+)/i) || [])[1] } } : null),
    ctx => {
      const cmp = ctx.params.compare ? (ctx.params.compare.match(/\d+/g) || []).map(Number).filter(a => a > 0 && a < 90) : [];
      return {
        defaults: { v0: 20, angle: 45, g: 9.81, h0: 0, m: 1, k: 0, vec: true, compare: cmp },
        params: [{ key: 'v0', label: T('launch speed v₀', 'سرعة الإطلاق'), unit: 'm/s', min: 1, max: 60, step: 0.5, alias: ['speed', 'velocity', 'v0'] }, { key: 'angle', label: T('angle θ', 'الزاوية θ'), unit: '°', min: 0, max: 90, step: 1, alias: ['angle', 'theta'] }, { key: 'h0', label: T('launch height', 'ارتفاع الإطلاق'), unit: 'm', min: 0, max: 50, step: 0.5, alias: ['height'] }, { key: 'g', label: T('gravity g', 'الجاذبية g'), unit: 'm/s²', min: 0.5, max: 25, step: 0.01, alias: ['gravity'] }, { key: 'm', label: T('mass m', 'الكتلة m'), unit: 'kg', min: 0.05, max: 20, step: 0.05, alias: ['mass'] }, { key: 'k', label: T('drag coefficient c', 'معامل السحب c'), unit: 'kg/m', min: 0, max: 0.2, step: 0.001, alias: ['drag', 'air resistance'] }],
        toggles: [{ key: 'vec', label: T('Velocity vectors (vₓ, v_y)', 'متجهات السرعة'), live: true }],
        series: [['y', T('height y (m)', 'الارتفاع y'), 2, (S, t) => (S.k || t > P.projectileAnalytic(S.v0, S.angle, S.g, S.h0).time ? NaN : S.h0 + S.v0 * Math.sin(S.angle * Math.PI / 180) * t - 0.5 * S.g * t * t), ['y']], ['x', T('horizontal x (m)', 'الأفقي x'), 1, (S, t) => (S.k || t > P.projectileAnalytic(S.v0, S.angle, S.g, S.h0).time ? NaN : S.v0 * Math.cos(S.angle * Math.PI / 180) * t), ['x']], ['v', T('velocity components (m/s)', 'مركبات السرعة'), [3, 4], null, ['vₓ', 'v_y']], ['a', T('acceleration (m/s²)', 'التسارع'), [5, 6], null, ['aₓ', 'a_y']]],
        columns: ['x', 'y', 'vx', 'vy', 'ax', 'ay'], graph: true, h: 1 / 600, every: 6,
        view: S => { const r = S.k ? P.projectileNumeric(S.v0, S.angle, S.g, S.h0, S.k, S.m) : P.projectileAnalytic(S.v0, Math.max(S.angle, 45), S.g, S.h0), w = Math.max(10, P.projectileAnalytic(S.v0, 45, S.g, S.h0).range * 1.1, r ? r.range * 1.1 : 0), H = Math.max(6, P.projectileAnalytic(S.v0, 90, S.g, S.h0).height * 1.15); return { x0: -w * 0.05, x1: w, y0: -H * 0.08, y1: H }; },
        init(S, st) { const a = S.angle * Math.PI / 180; st.s = [0, S.h0, S.v0 * Math.cos(a), S.v0 * Math.sin(a)]; st.path = [[0, S.h0]]; st.done = false; st.ymax = S.h0; st.acc = [0, -S.g]; },
        step(S, st, h) { const f = (tt, y) => { const v = Math.hypot(y[2], y[3]); return [y[2], y[3], -(S.k / S.m) * v * y[2], -S.g - (S.k / S.m) * v * y[3]]; }; const n = N.rk4(f, st.t, st.s, h); const d = f(0, n); st.acc = [d[2], d[3]]; if (n[1] < 0 && st.t > 0) { const k = st.s[1] / (st.s[1] - n[1]); st.s = st.s.map((v, i) => v + k * (n[i] - v)); st.done = true; st.landT = st.t + k * h; } else st.s = n; st.ymax = Math.max(st.ymax, st.s[1]); if (st.frame % 4 === 0 || st.done) st.path.push([st.s[0], st.s[1]]); },
        sample: (S, st) => [st.s[0], st.s[1], st.s[2], st.s[3], st.acc[0], st.acc[1]],
        draw(g, p, S, st) {
          const c = L.colors(); p.path([[p.view.x0, 0], [p.view.x1, 0]], c.dark ? '#4ade80' : '#15803d', { w: 3 });
          (S.compare || []).forEach((ang, i) => { const pts = []; const a = ang * Math.PI / 180; const r = P.projectileAnalytic(S.v0, ang, S.g, S.h0); for (let k = 0; k <= 120; k++) { const t = r.time * k / 120; pts.push([S.v0 * Math.cos(a) * t, S.h0 + S.v0 * Math.sin(a) * t - 0.5 * S.g * t * t]); } p.path(pts, c.pal[(i + 2) % 8], { w: 1.8, dash: [7, 5] }); p.text(r.range, 0, `${ang}°: ${N.fmt(r.range, 1)} m`, c.pal[(i + 2) % 8], { dy: -8 - i * 14, align: 'center' }); });
          if (!S.k) { const r = P.projectileAnalytic(S.v0, S.angle, S.g, S.h0), a = S.angle * Math.PI / 180, pts = []; for (let k = 0; k <= 100; k++) { const t = r.time * k / 100; pts.push([S.v0 * Math.cos(a) * t, S.h0 + S.v0 * Math.sin(a) * t - 0.5 * S.g * t * t]); } p.path(pts, c.muted, { w: 1, dash: [3, 5] }); }
          p.path(st.path.concat([[st.s[0], st.s[1]]]), c.pal[0], { w: 2.8 });
          p.dot(st.s[0], st.s[1], c.pal[1], null, { r: 7 + Math.min(6, Math.log2(1 + S.m)), ring: true });
          if (S.vec && !st.done) { const sc = (p.view.x1 - p.view.x0) / 60; p.arrow(st.s[0], st.s[1], st.s[0] + st.s[2] * sc, st.s[1], c.pal[2], 'vₓ'); p.arrow(st.s[0], st.s[1], st.s[0], st.s[1] + st.s[3] * sc, c.pal[4], 'v_y'); p.arrow(st.s[0], st.s[1], st.s[0] + st.s[2] * sc, st.s[1] + st.s[3] * sc, c.ink, 'v', { w: 1.6 }); }
          if (S.h0 > 0) p.path([[0, 0], [0, S.h0]], c.muted, { w: 6 });
        },
        readout(S, st) { const r = S.k ? null : P.projectileAnalytic(S.v0, S.angle, S.g, S.h0); return [['t', N.fmt(st.done ? st.landT : st.t, 3) + ' s'], ['x', N.fmt(st.s[0], 3) + ' m'], ['y', N.fmt(st.s[1], 3) + ' m'], ['|v|', N.fmt(Math.hypot(st.s[2], st.s[3]), 3) + ' m/s'], [T('max height', 'أقصى ارتفاع'), N.fmt(st.ymax, 3) + ' m'], [T('range', 'المدى'), st.done ? `<b>${N.fmt(st.s[0], 3)} m</b>` + (r ? ` <small>(${T('theory', 'نظري')} ${N.fmt(r.range, 3)})</small>` : '') : '…']]; },
        intro(S) { const r = S.k ? P.projectileNumeric(S.v0, S.angle, S.g, S.h0, S.k, S.m) : P.projectileAnalytic(S.v0, S.angle, S.g, S.h0); return T(`Projectile launched at ${S.v0} m/s and ${S.angle}° (g = ${S.g} m/s²${S.k ? ', with air resistance' : ', no air resistance'}): it lands after ${N.fmt(r.time, 3)} s at ${N.fmt(r.range, 3)} m, reaching ${N.fmt(r.height, 3)} m.${S.compare && S.compare.length ? ' Dashed: the same speed at ' + S.compare.join('°, ') + '°.' : ''} Change the angle, speed, gravity or drag and watch the path and the graphs update.`, 'محاكاة المقذوف.'); },
        explain(S, st) { const r = P.projectileAnalytic(S.v0, S.angle, S.g, S.h0), rn = P.projectileNumeric(S.v0, S.angle, S.g, S.h0, S.k, S.m); return `<p class="lab-eq">x = v₀cosθ·t &nbsp; y = h₀ + v₀sinθ·t − ½gt²</p><p>${T('Without air resistance the horizontal velocity never changes and the vertical velocity falls by g every second, so the path is a parabola. Mass makes no difference — unless there is drag.', 'بدون مقاومة الهواء المسار قطع مكافئ والكتلة لا تؤثر.')}</p>${ui.readout([[T('range (theory)', 'المدى نظرياً'), N.fmt(r.range, 4) + ' m'], [T('range (simulation, RK4)', 'المدى بالمحاكاة'), N.fmt(rn.range, 4) + ' m'], [T('flight time', 'زمن الطيران'), N.fmt(rn.time, 4) + ' s'], [T('max height', 'أقصى ارتفاع'), N.fmt(rn.height, 4) + ' m']])}${S.k ? `<p>${T('With drag (F = −c|v|v) the path is no longer a parabola: it is shorter and steeper on the way down, and a heavier ball (same size) goes further because drag decelerates it less (a = F/m).', 'مع السحب يقصر المدى.')}</p>` : `<p class="lab-sub">${T('Check: the simulated and theoretical ranges agree to within the RK4 step error.', 'التحقق: يتطابق المدى.')}</p>`}${S.h0 === 0 && !S.k ? `<p>${T('From ground level the range is v₀² sin 2θ / g, so it is largest at 45° and complementary angles (30° and 60°) give the same range.', 'أكبر مدى عند 45°.')}</p>` : ''}`; },
        assume: T('A point mass, uniform gravity, flat ground, no wind or spin. Drag is modelled as F = −c|v|v (quadratic), with c a single constant — real drag depends on shape, speed and air density.', 'جسيم نقطي، جاذبية منتظمة.'),
        command(t, S) {
          let m;
          if (/\b(heavier|more mass|increase (the )?mass)\b/i.test(t)) { S.m *= 2; return { note: S.k ? T(`Mass doubled to ${N.fmt(S.m)} kg: with drag, the heavier ball goes further.`, 'ضوعفت الكتلة.') : T(`Mass doubled to ${N.fmt(S.m)} kg — with no air resistance the path is identical: every mass falls with the same g.`, 'ضوعفت الكتلة؛ المسار نفسه بدون مقاومة.') }; }
          if (/\b(lighter|less mass)\b/i.test(t)) { S.m /= 2; return { note: T(`Mass halved to ${N.fmt(S.m)} kg.`, 'نصفت الكتلة.') }; }
          if (/\b(remove|no|without|turn off) (the )?(air resistance|drag)\b/i.test(t)) { S.k = 0; return { note: T('Air resistance removed: a perfect parabola.', 'أزيلت مقاومة الهواء.') }; }
          if (/\b(add|with|turn on) (some )?(air resistance|drag)\b/i.test(t)) { S.k = 0.01; return { note: T('Air resistance on (c = 0.01 kg/m).', 'مقاومة الهواء مفعلة.') }; }
          if ((m = t.match(/compare\D*((?:\d+\D*){2,})/i))) { S.compare = (m[1].match(/\d+/g) || []).map(Number).filter(a => a > 0 && a < 90); return { note: T(`Comparing ${S.compare.join('°, ')}°.`, 'مقارنة الزوايا.') }; }
          if ((m = t.match(/(?:angle|at)\s*(?:to|=|of)?\s*(\d+(?:\.\d+)?)\s*(?:°|degrees|deg)?/i)) && +m[1] <= 90) { S.angle = +m[1]; return { note: T(`Angle ${S.angle}°.`, 'الزاوية.') }; }
          if (/\b(moon)\b/i.test(t)) { S.g = 1.62; return { note: T('On the Moon: g = 1.62 m/s².', 'على القمر.') }; }
          if (/\b(mars)\b/i.test(t)) { S.g = 3.71; return { note: T('On Mars: g = 3.71 m/s².', 'على المريخ.') }; }
          if (/\b(earth)\b/i.test(t)) { S.g = 9.81; return { note: 'g = 9.81 m/s².' }; }
          if (/\b(faster|harder)\b/i.test(t)) { S.v0 *= 1.5; return { note: `v₀ = ${N.fmt(S.v0)} m/s.` }; }
          if (/\b(show|hide) (the )?(velocity )?vectors?\b/i.test(t)) { S.vec = /show/i.test(t); return { note: S.vec ? T('Velocity vectors shown: vₓ stays the same, v_y shrinks then grows downward.', 'أُظهرت المتجهات.') : T('Vectors hidden.', 'أُخفيت المتجهات.'), keep: true }; }
          return null;
        },
        state: (S, st) => ({ params: { v0: S.v0, angle: S.angle, g: S.g, h0: S.h0, m: S.m, drag: S.k }, landed: st.done, range: st.done ? st.s[0] : null, analytic: P.projectileAnalytic(S.v0, S.angle, S.g, S.h0), numeric: P.projectileNumeric(S.v0, S.angle, S.g, S.h0, S.k, S.m), compare: S.compare })
      };
    });

  /* ======================= Newton's second law ======================= */
  reg('newton', KIND.mech, T('Newton’s second law: F = ma', 'قانون نيوتن الثاني'),
    t => (/\b(newton'?s? (second|2nd|first|third|three|laws?)|f\s*=\s*ma|net force|force and (mass|acceleration)|coefficient of friction|friction (force|on a block|on a box))\b/i.test(t) && !/projectile|orbit|gravitation/i.test(t) ? { score: 0.85, params: { set: { F: num1(t, /(\d+(?:\.\d+)?)\s*N\b/, 20), m: num1(t, /(\d+(?:\.\d+)?)\s*kg/i, 5) } } } : null),
    {
      defaults: { F: 20, m: 5, mu: 0.1, g: 9.81, fbd: true },
      params: [{ key: 'F', label: T('applied force F', 'القوة المؤثرة F'), unit: 'N', min: -60, max: 60, step: 1, alias: ['force'] }, { key: 'm', label: T('mass m', 'الكتلة m'), unit: 'kg', min: 0.5, max: 40, step: 0.5, alias: ['mass'] }, { key: 'mu', label: T('friction coefficient μ', 'معامل الاحتكاك μ'), unit: '', min: 0, max: 1, step: 0.01, alias: ['friction'] }],
      toggles: [{ key: 'fbd', label: T('Free-body diagram', 'مخطط القوى'), live: true }],
      series: [['v', T('velocity v (m/s)', 'السرعة'), 2, (S, t) => { const a = acc(S, 0); return a * t; }, ['v']], ['x', T('position x (m)', 'الموضع'), 1, (S, t) => 0.5 * acc(S, 0) * t * t, ['x']], ['a', T('acceleration a (m/s²)', 'التسارع'), 3, null, ['a']]], columns: ['x', 'v', 'a'], graph: true, tWindow: 6,
      view: () => ({ x0: -2, x1: 30, y0: -3, y1: 8 }),
      init(S, st) { st.x = 0; st.v = 0; st.a = acc(S, 0); },
      step(S, st, h) { st.a = acc(S, st.v); st.v += st.a * h; if (Math.abs(st.v) < 1e-9 || (st.v * (st.v - st.a * h) < 0 && Math.abs(S.F) <= S.mu * S.m * S.g)) { if (Math.abs(S.F) <= S.mu * S.m * S.g) { st.v = 0; st.a = 0; } } st.x += st.v * h; if (st.x > 60 || st.x < -60) st.done = true; },
      sample: (S, st) => [st.x, st.v, st.a],
      draw(g, p, S, st) {
        const c = L.colors(); p.view.x0 = st.x - 12; p.view.x1 = st.x + 20; p.fit();
        p.path([[p.view.x0, 0], [p.view.x1, 0]], c.muted, { w: 3 }); for (let x = Math.ceil(p.view.x0 / 5) * 5; x < p.view.x1; x += 5) p.text(x, 0, x + ' m', c.muted, { dy: 16, align: 'center' });
        const w = 2 + Math.cbrt(S.m) * 0.8, hgt = 1 + Math.cbrt(S.m) * 0.5; p.path([[st.x - w / 2, 0], [st.x + w / 2, 0], [st.x + w / 2, hgt], [st.x - w / 2, hgt]], c.pal[0], { close: true, fill: c.dark ? 'rgba(96,165,250,.3)' : 'rgba(37,99,235,.2)' }); p.text(st.x, hgt / 2, `${S.m} kg`, c.ink, { align: 'center', dy: 4 });
        if (S.fbd) { const sc = 0.08, y = hgt / 2, fr = friction(S, st.v); if (S.F) p.arrow(st.x, y, st.x + S.F * sc, y, c.pal[1], `F = ${S.F} N`); if (fr) p.arrow(st.x, 0.15, st.x + fr * sc, 0.15, c.pal[3], `f = ${N.fmt(fr, 3)} N`); const W = S.m * S.g; p.arrow(st.x + w / 4, hgt / 2, st.x + w / 4, hgt / 2 - Math.min(6, W * sc * 0.25), c.pal[4], `W = ${N.fmt(W, 3)} N`); p.arrow(st.x - w / 4, hgt / 2, st.x - w / 4, hgt / 2 + Math.min(6, W * sc * 0.25), c.pal[2], 'N'); }
      },
      readout: (S, st) => [['F', S.F + ' N'], [T('friction', 'الاحتكاك'), N.fmt(friction(S, st.v), 3) + ' N'], [T('net force', 'القوة المحصلة'), N.fmt(S.F + friction(S, st.v), 3) + ' N'], ['a = F_net/m', N.fmt(st.a, 4) + ' m/s²'], ['v', N.fmt(st.v, 3) + ' m/s'], ['x', N.fmt(st.x, 3) + ' m']],
      intro: S => T(`A ${S.m} kg block pushed with ${S.F} N (friction μ = ${S.mu}). Net force = ${N.fmt(P.newtonAcc(S.F, S.m, S.mu, S.g) * S.m, 3)} N, so a = F_net / m = ${N.fmt(P.newtonAcc(S.F, S.m, S.mu, S.g), 4)} m/s².${Math.abs(S.F) <= S.mu * S.m * S.g ? ' (Static friction holds it still.)' : ''} Change the force or mass and watch the acceleration and the v–t graph.`, 'كتلة تدفعها قوة.'),
      explain: (S, st) => `<p class="lab-eq">ΣF = ma &nbsp;⇒&nbsp; a = (F − μmg)/m</p><p>${T('First law: with no net force the velocity doesn’t change. Second law: a = ΣF/m, so doubling the force doubles the acceleration and doubling the mass halves it. Third law: the ground pushes up (N) as hard as the block pushes down (W).', 'قوانين نيوتن الثلاثة.')}</p><p>${Math.abs(S.F) <= S.mu * S.m * S.g ? T(`Here |F| ≤ μmg = ${N.fmt(S.mu * S.m * S.g, 3)} N, so friction balances the push and the block stays still.`, 'الاحتكاك يوازن القوة.') : T('The v–t graph is a straight line: constant acceleration. Its gradient is a.', 'خط مستقيم: تسارع ثابت.')}</p>`,
      assume: T('One friction coefficient for both starting and sliding (real static friction is usually a bit larger); a rigid block on a level surface; no air resistance.', 'معامل احتكاك واحد.'),
      command(t, S) { if (/\b(heavier|more mass)\b/i.test(t)) { S.m *= 2; return { note: T(`Mass doubled to ${S.m} kg: the acceleration halves.`, 'ضوعفت الكتلة.') }; } if (/\b(lighter)\b/i.test(t)) { S.m /= 2; return { note: `m = ${S.m} kg.` }; } if (/\b(double|twice) the force\b/i.test(t)) { S.F *= 2; return { note: `F = ${S.F} N.` }; } if (/\b(no|remove|without) friction\b/i.test(t)) { S.mu = 0; return { note: T('Friction removed.', 'أزيل الاحتكاك.') }; } if (/\b(push|force) (the other way|backwards|reverse)\b/i.test(t)) { S.F = -S.F; return { note: `F = ${S.F} N.` }; } return null; },
      state: (S, st) => ({ params: { F: S.F, m: S.m, mu: S.mu }, a: st.a, v: st.v, x: st.x, expectedA: P.newtonAcc(S.F, S.m, S.mu, S.g) })
    });
  function friction(S, v) { const fmax = S.mu * S.m * S.g; if (Math.abs(v) > 1e-9) return -Math.sign(v) * fmax; if (Math.abs(S.F) <= fmax) return -S.F; return -Math.sign(S.F) * fmax; }
  function acc(S, v) { return (S.F + friction(S, v)) / S.m; }
  P.newtonAcc = (F, m, mu, g) => { g = g || 9.81; return Math.abs(F) <= mu * m * g ? 0 : (F - Math.sign(F) * mu * m * g) / m; };

  /* ======================= collisions ======================= */
  P.collide = (m1, m2, u1, u2, e) => ({ v1: (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2), v2: (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2) });
  reg('collision', KIND.mech, T('Collisions and momentum', 'التصادمات والزخم'),
    t => (/\b(collisions?|collid\w*|momentum|elastic|inelastic|impulse|conservation of momentum)\b/i.test(t) ? { score: 0.88, params: { set: { e: /\binelastic\b/i.test(t) && !/\bpartially\b/i.test(t) ? 0 : /\belastic\b/i.test(t) ? 1 : 1 } } } : null),
    {
      defaults: { m1: 2, m2: 1, u1: 3, u2: -1, e: 1 },
      params: [{ key: 'm1', label: 'm₁', unit: 'kg', min: 0.2, max: 10, step: 0.1, alias: ['mass 1', 'm1'] }, { key: 'm2', label: 'm₂', unit: 'kg', min: 0.2, max: 10, step: 0.1, alias: ['mass 2', 'm2'] }, { key: 'u1', label: T('velocity u₁', 'السرعة u₁'), unit: 'm/s', min: -6, max: 6, step: 0.1, alias: ['u1'] }, { key: 'u2', label: T('velocity u₂', 'السرعة u₂'), unit: 'm/s', min: -6, max: 6, step: 0.1, alias: ['u2'] }, { key: 'e', label: T('restitution e (1 elastic, 0 sticks)', 'معامل الارتداد e'), unit: '', min: 0, max: 1, step: 0.01, alias: ['restitution', 'elasticity'] }],
      series: [['p', T('momentum (kg·m/s)', 'الزخم'), [3, 4, 5], null, ['p₁', 'p₂', T('total', 'الكلي')]], ['ke', T('kinetic energy (J)', 'الطاقة الحركية'), [6, 7, 8], null, ['KE₁', 'KE₂', T('total', 'الكلي')]]], columns: ['x1', 'x2', 'p1', 'p2', 'ptot', 'KE1', 'KE2', 'KEtot'], graph: true, tWindow: 4,
      view: () => ({ x0: -10, x1: 10, y0: -2, y1: 4 }),
      init(S, st) { st.x1 = -5; st.x2 = 3; st.v1 = S.u1; st.v2 = S.u2; st.hit = false; },
      step(S, st, h) { const w1 = 0.6 + Math.cbrt(S.m1) * 0.5, w2 = 0.6 + Math.cbrt(S.m2) * 0.5; st.x1 += st.v1 * h; st.x2 += st.v2 * h; if (!st.hit && st.x2 - st.x1 <= (w1 + w2) / 2 && st.v1 > st.v2) { const r = P.collide(S.m1, S.m2, st.v1, st.v2, S.e); st.v1 = r.v1; st.v2 = r.v2; st.hit = true; st.tHit = st.t; } if (Math.abs(st.x1) > 14 && Math.abs(st.x2) > 14) st.done = true; if (st.t > 12) st.done = true; },
      sample: (S, st) => [st.x1, st.x2, S.m1 * st.v1, S.m2 * st.v2, S.m1 * st.v1 + S.m2 * st.v2, 0.5 * S.m1 * st.v1 ** 2, 0.5 * S.m2 * st.v2 ** 2, 0.5 * S.m1 * st.v1 ** 2 + 0.5 * S.m2 * st.v2 ** 2],
      draw(g, p, S, st) { const c = L.colors(); p.path([[-20, 0], [20, 0]], c.muted, { w: 3 }); const box = (x, m, col, lab) => { const w = 0.6 + Math.cbrt(m) * 0.5, h = 0.5 + Math.cbrt(m) * 0.45; p.path([[x - w / 2, 0], [x + w / 2, 0], [x + w / 2, h], [x - w / 2, h]], col, { close: true, fill: col + '44' }); p.text(x, h + 0.3, lab, c.ink, { align: 'center' }); return h; }; const h1 = box(st.x1, S.m1, c.pal[0], `${S.m1} kg`), h2 = box(st.x2, S.m2, c.pal[1], `${S.m2} kg`); if (st.v1) p.arrow(st.x1, h1 / 2, st.x1 + st.v1 * 0.5, h1 / 2, c.ink); if (st.v2) p.arrow(st.x2, h2 / 2, st.x2 + st.v2 * 0.5, h2 / 2, c.ink); },
      readout(S, st) { const r = P.collide(S.m1, S.m2, S.u1, S.u2, S.e), pb = S.m1 * S.u1 + S.m2 * S.u2, pa = S.m1 * r.v1 + S.m2 * r.v2, kb = 0.5 * S.m1 * S.u1 ** 2 + 0.5 * S.m2 * S.u2 ** 2, ka = 0.5 * S.m1 * r.v1 ** 2 + 0.5 * S.m2 * r.v2 ** 2; return [['v₁, v₂ ' + T('after', 'بعد'), `${N.fmt(r.v1, 3)}, ${N.fmt(r.v2, 3)} m/s`], [T('momentum before → after', 'الزخم قبل ← بعد'), `${N.fmt(pb, 4)} → ${N.fmt(pa, 4)} kg·m/s`], [T('KE before → after', 'الطاقة قبل ← بعد'), `${N.fmt(kb, 4)} → ${N.fmt(ka, 4)} J`], [T('KE lost', 'الطاقة المفقودة'), N.fmt(kb - ka, 4) + ' J']]; },
      intro: S => { const r = P.collide(S.m1, S.m2, S.u1, S.u2, S.e); return T(`A ${S.m1} kg cart at ${S.u1} m/s meets a ${S.m2} kg cart at ${S.u2} m/s (${S.e === 1 ? 'elastic' : S.e === 0 ? 'perfectly inelastic — they stick' : 'partly elastic, e = ' + S.e}). Afterwards: ${N.fmt(r.v1, 3)} and ${N.fmt(r.v2, 3)} m/s. Total momentum is the same before and after; kinetic energy is kept only when e = 1.`, 'تصادم.'); },
      explain: S => `<p class="lab-eq">m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂ &nbsp; v₂ − v₁ = e(u₁ − u₂)</p><p>${T('Momentum is conserved in every collision (no outside horizontal force). Kinetic energy is conserved only in an elastic collision (e = 1); with e = 0 the carts stick together and the most energy turns into heat, sound and deformation.', 'الزخم محفوظ دائماً.')}</p><p class="lab-sub">${T('Graph: the total momentum line stays flat through the collision — that is the check.', 'خط الزخم الكلي يبقى أفقياً.')}</p>`,
      assume: T('One-dimensional, frictionless track; an instantaneous collision described by a single coefficient of restitution.', 'مسار أحادي البعد بلا احتكاك.'),
      command(t, S) { if (/\bperfectly inelastic|stick\b/i.test(t) || /\binelastic\b/i.test(t) && !/partly|partially/i.test(t)) { S.e = 0; return { note: T('Perfectly inelastic: e = 0, the carts stick.', 'غير مرن تماماً.') }; } if (/\belastic\b/i.test(t)) { S.e = 1; return { note: T('Elastic: e = 1.', 'مرن.') }; } if (/\bheavier\b/i.test(t)) { S.m1 *= 2; return { note: `m₁ = ${S.m1} kg.` }; } return null; },
      state: S => ({ params: Object.assign({}, S), after: P.collide(S.m1, S.m2, S.u1, S.u2, S.e) })
    });

  /* ======================= spring–mass ======================= */
  reg('spring', KIND.mech, T('Spring–mass oscillator', 'نابض وكتلة'),
    t => (/\b(springs?|hooke'?s?|oscillat(or|ion)s?|simple harmonic|shm|mass on a spring)\b/i.test(t) && !/pendulum/i.test(t) ? { score: 0.88, params: {} } : null),
    {
      defaults: { m: 1, k: 10, b: 0, x0: 1 },
      params: [{ key: 'm', label: T('mass m', 'الكتلة m'), unit: 'kg', min: 0.1, max: 10, step: 0.1, alias: ['mass'] }, { key: 'k', label: T('spring constant k', 'ثابت النابض k'), unit: 'N/m', min: 1, max: 100, step: 0.5, alias: ['spring constant', 'stiffness'] }, { key: 'b', label: T('damping b', 'التخميد b'), unit: 'kg/s', min: 0, max: 5, step: 0.05, alias: ['damping'] }, { key: 'x0', label: T('start displacement x₀', 'الإزاحة الابتدائية'), unit: 'm', min: -2, max: 2, step: 0.05, alias: ['amplitude', 'displacement'] }],
      series: [['x', T('displacement x (m)', 'الإزاحة'), 1, (S, t) => (S.b ? NaN : S.x0 * Math.cos(Math.sqrt(S.k / S.m) * t)), ['x']], ['v', T('velocity v (m/s)', 'السرعة'), 2, null, ['v']], ['E', T('energy (J)', 'الطاقة'), [3, 4, 5], null, ['KE', 'PE', T('total', 'الكلي')]]], columns: ['x', 'v', 'KE', 'PE', 'E'], graph: true, h: 1 / 1000, every: 10, tWindow: 8,
      view: () => ({ x0: -3, x1: 3, y0: -1.2, y1: 1.6 }),
      init(S, st) { st.s = [S.x0, 0]; st.cross = []; st.E0 = 0.5 * S.k * S.x0 * S.x0; },
      step(S, st, h) { const prev = st.s[0]; st.s = N.rk4((t, y) => [y[1], (-S.k * y[0] - S.b * y[1]) / S.m], st.t, st.s, h); if (prev < 0 && st.s[0] >= 0) st.cross.push(st.t); },
      sample: (S, st) => [st.s[0], st.s[1], 0.5 * S.m * st.s[1] ** 2, 0.5 * S.k * st.s[0] ** 2, 0.5 * S.m * st.s[1] ** 2 + 0.5 * S.k * st.s[0] ** 2],
      draw(g, p, S, st) { const c = L.colors(), x = st.s[0], wall = -2.6; p.path([[wall, -0.4], [wall, 0.9]], c.muted, { w: 6 }); const coils = 14, pts = []; for (let i = 0; i <= coils * 2; i++) { const xx = wall + (x - 0.3 - wall) * i / (coils * 2); pts.push([xx, 0.25 + (i % 2 ? 0.2 : -0.2) * (i && i < coils * 2 ? 1 : 0)]); } p.path(pts, c.pal[3], { w: 2 }); const w = 0.3 + Math.cbrt(S.m) * 0.25; p.path([[x - 0.3, -0.05], [x - 0.3 + 2 * w, -0.05], [x - 0.3 + 2 * w, 0.55], [x - 0.3, 0.55]], c.pal[0], { close: true, fill: c.pal[0] + '55' }); p.path([[-3, -0.06], [3, -0.06]], c.muted); p.path([[0, -0.3], [0, 1.2]], c.muted, { dash: [4, 4], w: 1 }); p.text(0, 1.2, T('equilibrium', 'الاتزان'), c.muted, { align: 'center', dy: -4 });
        const E = 0.5 * S.m * st.s[1] ** 2 + 0.5 * S.k * st.s[0] ** 2, Em = Math.max(st.E0, E, 1e-9); [[0.5 * S.m * st.s[1] ** 2, 'KE', c.pal[1]], [0.5 * S.k * st.s[0] ** 2, 'PE', c.pal[2]], [E, T('total', 'الكلي'), c.ink]].forEach(([v, l, col], i) => { const x0 = 1.4 + i * 0.5; p.path([[x0, 0.75], [x0 + 0.35, 0.75], [x0 + 0.35, 0.75 + 0.75 * v / Em], [x0, 0.75 + 0.75 * v / Em]], col, { close: true, fill: col + '66', w: 1 }); p.text(x0 + 0.17, 0.75, l, c.ink, { align: 'center', dy: 13 }); }); },
      readout(S, st) { const Tth = 2 * Math.PI * Math.sqrt(S.m / S.k), Tm = st.cross.length > 1 ? (st.cross[st.cross.length - 1] - st.cross[0]) / (st.cross.length - 1) : NaN, E = 0.5 * S.m * st.s[1] ** 2 + 0.5 * S.k * st.s[0] ** 2; return [['x', N.fmt(st.s[0], 4) + ' m'], ['v', N.fmt(st.s[1], 4) + ' m/s'], [T('period (theory 2π√(m/k))', 'الدور نظرياً'), N.fmt(Tth, 4) + ' s'], [T('period (measured)', 'الدور المقاس'), isFinite(Tm) ? N.fmt(Tm, 4) + ' s' : '…'], [T('energy E / E₀', 'الطاقة'), N.fmt(E / st.E0, 6)]]; },
      intro: S => T(`A ${S.m} kg mass on a spring with k = ${S.k} N/m, pulled ${S.x0} m and released. Period T = 2π√(m/k) = ${N.fmt(2 * Math.PI * Math.sqrt(S.m / S.k), 4)} s — it doesn’t depend on how far you pull it. The bars show energy swapping between kinetic and spring potential.`, 'نابض وكتلة.'),
      explain: (S, st) => `<p class="lab-eq">F = −kx &nbsp; ⇒ &nbsp; x(t) = x₀cos(ωt), ω = √(k/m)</p><p>${S.b ? T('With damping the amplitude decays and energy is lost to friction; the period is slightly longer than 2π√(m/k).', 'مع التخميد تتناقص السعة.') : T('Without damping the total energy stays constant: E/E₀ in the readout stays at 1 (the check on the numerical method).', 'بدون تخميد الطاقة ثابتة.')}</p><p class="lab-sub">${T('Dashed line on the x–t graph: the exact solution.', 'المتقطع: الحل الدقيق.')}</p>`,
      assume: T('An ideal massless spring obeying Hooke’s law, horizontal frictionless surface, viscous damping F = −bv.', 'نابض مثالي.'),
      command(t, S) { if (/\b(heavier)\b/i.test(t)) { S.m *= 2; return { note: T(`m = ${S.m} kg: the period grows by √2.`, 'زادت الكتلة.') }; } if (/\b(stiffer)\b/i.test(t)) { S.k *= 2; return { note: `k = ${S.k} N/m.` }; } if (/\b(add|more) damping\b/i.test(t)) { S.b = Math.max(0.3, S.b * 2); return { note: `b = ${S.b}.` }; } if (/\b(no|remove) damping\b/i.test(t)) { S.b = 0; return { note: T('No damping.', 'بلا تخميد.') }; } return null; },
      state: (S, st) => ({ params: Object.assign({}, S), x: st.s[0], v: st.s[1], energyRatio: (0.5 * S.m * st.s[1] ** 2 + 0.5 * S.k * st.s[0] ** 2) / st.E0, periodTheory: 2 * Math.PI * Math.sqrt(S.m / S.k), periodMeasured: st.cross.length > 1 ? (st.cross[st.cross.length - 1] - st.cross[0]) / (st.cross.length - 1) : null })
    });

  /* ======================= pendulum ======================= */
  P.ellipK = k => { let a = 1, b = Math.sqrt(1 - k * k); for (let i = 0; i < 30; i++) { const an = (a + b) / 2; b = Math.sqrt(a * b); a = an; } return Math.PI / (2 * a); };
  P.pendulumPeriod = (Lp, g, th0deg) => 4 * Math.sqrt(Lp / g) * P.ellipK(Math.sin(th0deg * Math.PI / 360));
  reg('pendulum', KIND.mech, T('Pendulum', 'البندول'),
    t => (/\bpendulum|pendula\b/i.test(t) || /\b(kinetic and potential|potential and kinetic|conservation of energy)\b/i.test(t) ? { score: 0.9, params: { set: { th0: num1(t, /(\d+(?:\.\d+)?)\s*(?:degrees|°)/i, 30), L: num1(t, /(\d+(?:\.\d+)?)\s*m\b(?!\/)/i, 2) } } } : null),
    {
      defaults: { L: 2, g: 9.81, th0: 30, b: 0, m: 1 },
      params: [{ key: 'L', label: T('length L', 'الطول L'), unit: 'm', min: 0.2, max: 10, step: 0.1, alias: ['length'] }, { key: 'th0', label: T('release angle θ₀', 'زاوية الإفلات'), unit: '°', min: 1, max: 170, step: 1, alias: ['angle', 'amplitude'] }, { key: 'g', label: T('gravity g', 'الجاذبية'), unit: 'm/s²', min: 0.5, max: 25, step: 0.01, alias: ['gravity'] }, { key: 'b', label: T('damping', 'التخميد'), unit: '1/s', min: 0, max: 1, step: 0.01, alias: ['damping'] }, { key: 'm', label: T('mass m', 'الكتلة'), unit: 'kg', min: 0.1, max: 10, step: 0.1, alias: ['mass'] }],
      series: [['th', T('angle θ (°)', 'الزاوية θ'), 1, (S, t) => S.th0 * Math.cos(Math.sqrt(S.g / S.L) * t), ['θ']], ['E', T('energy (J)', 'الطاقة'), [3, 4, 5], null, ['KE', 'PE', T('total', 'الكلي')]]], columns: ['theta_deg', 'omega', 'KE', 'PE', 'E'], graph: true, h: 1 / 1000, every: 10, tWindow: 8,
      view: S => ({ x0: -S.L * 1.25, x1: S.L * 1.25, y0: -S.L * 1.2, y1: S.L * 0.4 }),
      init(S, st) { st.s = [S.th0 * Math.PI / 180, 0]; st.cross = []; },
      step(S, st, h) { const prev = st.s[1]; st.s = N.rk4((t, y) => [y[1], -(S.g / S.L) * Math.sin(y[0]) - S.b * y[1]], st.t, st.s, h); if (prev > 0 && st.s[1] <= 0) st.cross.push(st.t); },
      sample: (S, st) => { const KE = 0.5 * S.m * (S.L * st.s[1]) ** 2, PE = S.m * S.g * S.L * (1 - Math.cos(st.s[0])); return [st.s[0] * 180 / Math.PI, st.s[1], KE, PE, KE + PE]; },
      draw(g, p, S, st) { const c = L.colors(), th = st.s[0], x = S.L * Math.sin(th), y = -S.L * Math.cos(th); p.path([[-S.L * 0.4, 0], [S.L * 0.4, 0]], c.muted, { w: 5 }); p.path([[0, 0], [x, y]], c.ink, { w: 2 }); p.path([[0, 0], [0, -S.L]], c.muted, { dash: [4, 4], w: 1 }); p.dot(x, y, c.pal[0], null, { r: 10 + Math.cbrt(S.m) * 3, ring: true }); const pts = []; for (let a = -S.th0; a <= S.th0; a += 2) pts.push([S.L * Math.sin(a * Math.PI / 180), -S.L * Math.cos(a * Math.PI / 180)]); p.path(pts, c.muted, { w: 1, dash: [2, 5] }); },
      readout(S, st) { const Tsa = 2 * Math.PI * Math.sqrt(S.L / S.g), Tex = P.pendulumPeriod(S.L, S.g, S.th0), Tm = st.cross.length > 1 ? (st.cross[st.cross.length - 1] - st.cross[0]) / (st.cross.length - 1) : NaN; return [['θ', N.fmt(st.s[0] * 180 / Math.PI, 2) + '°'], [T('period, small-angle 2π√(L/g)', 'الدور للزوايا الصغيرة'), N.fmt(Tsa, 4) + ' s'], [T('period, exact (elliptic integral)', 'الدور الدقيق'), N.fmt(Tex, 4) + ' s'], [T('period, measured', 'الدور المقاس'), isFinite(Tm) ? N.fmt(Tm, 4) + ' s' : '…']]; },
      intro: S => T(`A ${S.L} m pendulum released from ${S.th0}°. Small-angle formula: T ≈ 2π√(L/g) = ${N.fmt(2 * Math.PI * Math.sqrt(S.L / S.g), 4)} s; the exact period at this amplitude is ${N.fmt(P.pendulumPeriod(S.L, S.g, S.th0), 4)} s. The energy graph shows kinetic and potential energy trading places while the total stays constant.`, 'بندول.'),
      explain: S => `<p class="lab-eq">θ″ = −(g/L) sin θ</p><p>${T('The mass doesn’t affect the period — only L and g (and, slightly, the amplitude). For small angles sin θ ≈ θ, which gives simple harmonic motion and T = 2π√(L/g). At large angles the real period is longer:', 'الكتلة لا تؤثر على الدور.')} ${S.th0 > 20 ? T(`here ${N.fmt((P.pendulumPeriod(S.L, S.g, S.th0) / (2 * Math.PI * Math.sqrt(S.L / S.g)) - 1) * 100, 2)}% longer.`, 'أطول.') : T('at this small angle the difference is tiny.', 'الفرق صغير.')}</p>`,
      assume: T('A point mass on a light, rigid rod; no air resistance unless damping is added; the full nonlinear equation is integrated with RK4.', 'كتلة نقطية على قضيب خفيف.'),
      command(t, S) { if (/\b(longer)\b/i.test(t)) { S.L *= 2; return { note: T(`L = ${S.L} m: the period grows by √2.`, 'أطول.') }; } if (/\b(shorter)\b/i.test(t)) { S.L /= 2; return { note: `L = ${S.L} m.` }; } if (/\b(heavier)\b/i.test(t)) { S.m *= 2; return { note: T(`m = ${S.m} kg — the period does not change.`, 'الكتلة لا تغيّر الدور.') }; } if (/\bmoon\b/i.test(t)) { S.g = 1.62; return { note: 'g = 1.62 m/s².' }; } return null; },
      state: (S, st) => ({ params: Object.assign({}, S), theta: st.s[0], periodSmallAngle: 2 * Math.PI * Math.sqrt(S.L / S.g), periodExact: P.pendulumPeriod(S.L, S.g, S.th0), periodMeasured: st.cross.length > 1 ? (st.cross[st.cross.length - 1] - st.cross[0]) / (st.cross.length - 1) : null })
    });

  /* ======================= circuits (modified nodal analysis) ======================= */
  // solveDC(nNodes, elements): elements {type:'R', a, b, R} | {type:'V', a, b, V} (V(a) − V(b) = V); node 0 is ground
  P.solveDC = function (n, els) {
    const vs = els.filter(e => e.type === 'V'), size = n - 1 + vs.length; const A = Array.from({ length: size }, () => new Array(size).fill(0)), z = new Array(size).fill(0);
    const ix = k => k - 1;
    els.forEach(e => { if (e.type !== 'R') return; const g = 1 / e.R; if (e.a) A[ix(e.a)][ix(e.a)] += g; if (e.b) A[ix(e.b)][ix(e.b)] += g; if (e.a && e.b) { A[ix(e.a)][ix(e.b)] -= g; A[ix(e.b)][ix(e.a)] -= g; } });
    vs.forEach((e, j) => { const r = n - 1 + j; if (e.a) { A[ix(e.a)][r] += 1; A[r][ix(e.a)] += 1; } if (e.b) { A[ix(e.b)][r] -= 1; A[r][ix(e.b)] -= 1; } z[r] = e.V; });
    // Gaussian elimination with partial pivoting
    const M = A.map((r, i) => r.concat(z[i])); const m = size;
    for (let c = 0; c < m; c++) { let piv = c; for (let r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r; if (Math.abs(M[piv][c]) < 1e-14) return null; [M[c], M[piv]] = [M[piv], M[c]]; for (let r = 0; r < m; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= m; k++) M[r][k] -= f * M[c][k]; } }
    const x = M.map((r, i) => r[m] / r[i]); const V = [0].concat(x.slice(0, n - 1)), Iv = x.slice(n - 1);
    return { V, Iv, I: e => (e.type === 'R' ? (V[e.a] - V[e.b]) / e.R : Iv[vs.indexOf(e)]) };
  };
  const COMP = { R: { label: T('Resistor', 'مقاوم'), unit: 'Ω', def: 10 }, bulb: { label: T('Bulb', 'مصباح'), unit: 'Ω', def: 12 }, LED: { label: 'LED', unit: 'V', def: 2 }, switch: { label: T('Switch', 'مفتاح'), unit: '', def: 1 }, C: { label: T('Capacitor', 'مكثف'), unit: 'μF', def: 1000 }, Lind: { label: T('Inductor', 'ملف'), unit: 'mH', def: 50 } };
  // build the network: battery from node 0 → node 1, then series blocks; each block is a list of parallel branches
  P.circuit = function (Vb, rint, blocks, opt) {
    opt = opt || {}; let node = 1; const els = [{ type: 'V', a: 1, b: 0, V: Vb, name: 'battery' }]; let n = 2;
    // internal resistance sits between the battery's + terminal (node 1) and node 2
    let cur = 1; if (rint > 0) { els.push({ type: 'R', a: 1, b: 2, R: rint, name: 'r' }); cur = 2; n = 3; }
    const comps = [];
    blocks.forEach((blk, bi) => { const next = bi === blocks.length - 1 ? 0 : n++; blk.forEach((c, k) => { const e = { comp: c, a: cur, b: next, name: c.name || `${c.type}${bi + 1}${blk.length > 1 ? String.fromCharCode(97 + k) : ''}` }; comps.push(e); }); cur = next; });
    if (!blocks.length) return null;
    // LEDs: iterate on/off states until consistent (forward voltage Vf with a 5 Ω on-resistance; off = open)
    const led = comps.filter(e => e.comp.type === 'LED'); let state = led.map(() => true), sol = null, guard = 0;
    while (guard++ < 12) {
      const E = els.slice(); let extra = n;
      comps.forEach(e => { const c = e.comp; if (c.type === 'R' || c.type === 'bulb') E.push({ type: 'R', a: e.a, b: e.b, R: Math.max(1e-6, c.value), ref: e }); else if (c.type === 'switch') { if (c.closed) E.push({ type: 'R', a: e.a, b: e.b, R: 1e-6, ref: e }); } else if (c.type === 'Lind') E.push({ type: 'R', a: e.a, b: e.b, R: 1e-6, ref: e }); else if (c.type === 'C') { if (opt.capShort) E.push({ type: 'R', a: e.a, b: e.b, R: 1e-6, ref: e }); } else if (c.type === 'LED') { const i = led.indexOf(e); if (state[i]) { const mid = extra++; E.push({ type: 'V', a: e.a, b: mid, V: c.value, ref: e, led: true }); E.push({ type: 'R', a: mid, b: e.b, R: 5, ref: e, ledR: true }); } } });
      // every node needs a path for the matrix to be solvable: tiny leakage to ground keeps open branches defined
      for (let k = 1; k < extra; k++) E.push({ type: 'R', a: k, b: 0, R: 1e12, leak: true });
      sol = P.solveDC(extra, E); if (!sol) return null;
      const ns = led.map((e, i) => { if (state[i]) { const r = E.find(x => x.ledR && x.ref === e); return sol.I(r) > 0; } return sol.V[e.a] - sol.V[e.b] > e.comp.value; });
      if (ns.every((v, i) => v === state[i])) { sol.E = E; break; } state = ns;
    }
    const out = comps.map(e => { const c = e.comp, Vd = sol.V[e.a] - sol.V[e.b]; let I = 0; const rs = sol.E.filter(x => x.ref === e && x.type === 'R'); if (c.type === 'LED') { const r = rs.find(x => x.ledR); I = r ? sol.I(r) : 0; } else if (rs[0]) I = sol.I(rs[0]); if (Math.abs(I) < 1e-9) I = 0; return { name: e.name, type: c.type, value: c.value, V: Vd, I, P: Vd * I, on: c.type === 'LED' ? I > 0 : undefined, a: e.a, b: e.b }; });
    const Ib = -sol.I(sol.E[0]);
    return { comps: out, I: Ib, Vterm: sol.V[cur === 0 ? 1 : 1] - 0, V: sol.V, kvl: Vb - (rint > 0 ? Ib * rint : 0) - blocks.reduce((s, blk, bi) => s + (out.find(o => o.name === (blk[0].name || `${blk[0].type}${bi + 1}${blk.length > 1 ? 'a' : ''}`)) || { V: 0 }).V, 0) };
  };
  reg('circuit', KIND.elec, T('Circuit lab', 'مختبر الدوائر'),
    t => {
      if (!(/\b(circuits?|resistors?|ohm'?s law|kirchhoff'?s?|rc circuits?|capacitors?|inductors?)\b/i.test(t) || /\b(current|voltage|bulbs?|battery|leds?)\b/i.test(t) && /\b(resist|ohms?|amps?|volts?|circuit|series|parallel|ammeter|voltmeter)\b/i.test(t)) || /\b(magnetic|field lines|electric field|charges?)\b/i.test(t) && !/circuit/i.test(t)) return null;
      const n = (t.match(/\b(two|three|four|2|3|4)\b/i) || [, 'two'])[1].toLowerCase(), k = { two: 2, three: 3, four: 4 }[n] || +n || 2;
      const R = (t.match(/(\d+(?:\.\d+)?)\s*(?:Ω|ohms?)/gi) || []).map(s => parseFloat(s));
      const vals = i => R[i] || [10, 20, 30, 40][i];
      let blocks;
      if (/\bohm'?s law\b/i.test(t) && !/series|parallel/i.test(t)) blocks = [[{ type: 'R', value: R[0] || 10 }]];
      else if (/\bparallel\b/i.test(t) && /\bseries\b/i.test(t)) blocks = [[{ type: 'R', value: vals(0) }], [{ type: 'R', value: vals(1) }, { type: 'R', value: vals(2) }]];
      else if (/\bparallel\b/i.test(t)) blocks = [Array.from({ length: k }, (_, i) => ({ type: 'R', value: vals(i) }))];
      else if (/\b(rc|capacitor)\b/i.test(t)) blocks = [[{ type: 'R', value: vals(0) * 100 }], [{ type: 'C', value: 1000 }]];
      else if (/\bled\b/i.test(t)) blocks = [[{ type: 'R', value: 220 }], [{ type: 'LED', value: 2 }]];
      else if (/\bbulbs?\b/i.test(t)) blocks = Array.from({ length: k }, () => [{ type: 'bulb', value: 12 }]);
      else blocks = Array.from({ length: k }, (_, i) => [{ type: 'R', value: vals(i) }]);
      const V = num1(t, /(\d+(?:\.\d+)?)\s*(?:V|volts?)\b/i, /\bled\b/i.test(t) ? 9 : 12);
      return { score: 0.9, params: { blocks, V, ohm: /\bohm'?s law\b/i.test(t) } };
    },
    ctx => {
      const S0 = { V: ctx.params.V || 12, r: 0, blocks: JSON.parse(JSON.stringify(ctx.params.blocks || [[{ type: 'R', value: 10 }], [{ type: 'R', value: 20 }]])), ohm: !!ctx.params.ohm, flow: 0 };
      const solve = S => P.circuit(S.V, S.r, S.blocks);
      const hasC = S => S.blocks.length === 2 && S.blocks.some(b => b.length === 1 && b[0].type === 'C') && S.blocks.some(b => b.length === 1 && (b[0].type === 'R' || b[0].type === 'bulb'));
      return {
        defaults: S0, equal: true, grid: false, pan: false,
        params: [{ key: 'V', label: T('battery voltage', 'جهد البطارية'), unit: 'V', min: 0, max: 24, step: 0.5, alias: ['voltage', 'emf'], live: true }, { key: 'r', label: T('internal resistance', 'المقاومة الداخلية'), unit: 'Ω', min: 0, max: 5, step: 0.1, alias: ['internal resistance'], live: true }],
        series: [['VI', T('Ohm’s law: current I against battery voltage V', 'قانون أوم: التيار مقابل الجهد'), 1, null, ['I']], ['rc', T('RC charging: capacitor voltage against time', 'شحن المكثف'), 2, null, ['V_C']]], columns: ['I', 'V_C'], graph: true, tWindow: 5,
        graphDraw(g, p, S, st) {
          const c = L.colors();
          if (st.series === 'rc') {
            if (!hasC(S)) { p.view = { x0: 0, x1: 1, y0: 0, y1: 1 }; g.fillStyle = c.muted; g.font = '13px system-ui'; g.fillText(T('Add a capacitor in series with a resistor to see it charge.', 'أضف مكثفاً على التوالي مع مقاوم.'), 16, 28); return; }
            const tau = st.tau || 1, t1 = Math.max(5 * tau, st.t); p.view = { x0: 0, x1: t1, y0: -S.V * 0.05, y1: S.V * 1.12 }; p.labels = { x: 't (s)', y: 'V_C (V)' }; p.grid();
            p.fn(t => S.V * (1 - Math.exp(-t / tau)), c.pal[0]); p.path([[tau, 0], [tau, S.V * (1 - Math.exp(-1))]], c.muted, { dash: [4, 4], w: 1 }); p.text(tau, 0, 'τ', c.ink, { dy: -6, dx: 4 }); p.dot(Math.min(st.t, t1), st.vc, c.pal[1], `${N.fmt(st.vc, 3)} V`, { r: 5 }); return;
          }
          // I against V for the whole circuit: a straight line through the origin when every part is ohmic
          const pts = []; for (let k = 0; k <= 48; k++) { const V = 24 * k / 48, s = P.circuit(V, S.r, S.blocks); pts.push([V, s ? s.I : NaN]); }
          const ymax = Math.max(0.01, ...pts.map(q => (isFinite(q[1]) ? q[1] : 0))); p.view = { x0: -1, x1: 25, y0: -ymax * 0.06, y1: ymax * 1.15 }; p.labels = { x: 'V (V)', y: 'I (A)' }; p.grid();
          p.path(pts, c.pal[0], { w: 2.6 }); if (st.sol) p.dot(S.V, st.sol.I, c.pal[1], `${N.fmt(S.V, 3)} V, ${N.fmt(st.sol.I, 4)} A`, { r: 6, ring: true });
          g.fillStyle = c.muted; g.font = '11px system-ui'; g.fillText(S.blocks.flat().some(x => x.type === 'LED') ? T('Not a straight line: an LED only conducts above its forward voltage.', 'ليس خطاً مستقيماً بسبب الثنائي.') : T('A straight line through the origin: I ∝ V, gradient = 1/R_total.', 'خط مستقيم: التيار يتناسب مع الجهد.'), 52, p.H - 10);
        },
        view: S => { const w = Math.max(3, S.blocks.length) * 3 + 3; return { x0: -2.5, x1: w, y0: -1.5, y1: 3 + Math.max(...S.blocks.map(b => b.length)) * 1.6 }; },
        init(S, st) { st.sol = solve(S); st.vc = 0; st.phase = 0; },
        step(S, st, h) { st.sol = solve(S); st.phase += h; if (hasC(S)) { const Rb = S.blocks.find(b => b[0].type !== 'C')[0].value + S.r, Cv = S.blocks.find(b => b[0].type === 'C')[0].value * 1e-6, tau = Rb * Cv; st.vc = S.V * (1 - Math.exp(-st.t / tau)); st.tau = tau; } },
        sample: (S, st) => [st.sol ? st.sol.I : 0, st.vc],
        extraControls(pg, S, st, api) {
          const box = ui.el('div', 'lab-cir'); pg.appendChild(box);
          const render = () => {
            box.innerHTML = '';
            S.blocks.forEach((blk, bi) => {
              const g = ui.el('div', 'lab-cir__blk'); g.innerHTML = `<b>${T('Block', 'الكتلة')} ${bi + 1}${blk.length > 1 ? ' · ' + T('in parallel', 'على التوازي') : ''}</b>`;
              blk.forEach((c, k) => {
                const row = ui.el('div', 'lab-cir__row');
                row.innerHTML = `<select aria-label="${T('Component type', 'نوع المكوّن')}">${Object.entries(COMP).map(([v, d]) => `<option value="${v}" ${v === c.type ? 'selected' : ''}>${d.label}</option>`).join('')}</select>${c.type === 'switch' ? `<label class="lab-tg"><input type="checkbox" ${c.closed !== false ? 'checked' : ''}><span>${T('closed', 'مغلق')}</span></label>` : `<input type="number" min="0" step="any" value="${c.value}" aria-label="${T('value', 'القيمة')}"><span>${COMP[c.type].unit}</span>`}<button type="button" class="lab-b" data-a="par" title="${T('Add a branch in parallel', 'أضف فرعاً على التوازي')}">∥</button><button type="button" class="lab-b" data-a="del" aria-label="${T('Remove', 'حذف')}">×</button>`;
                row.querySelector('select').addEventListener('change', e => { c.type = e.target.value; c.value = COMP[c.type].def; if (c.type === 'switch') c.closed = true; render(); changed(); });
                const ni = row.querySelector('input[type=number]'); if (ni) ni.addEventListener('input', e => { const v = +e.target.value; if (v > 0) { c.value = v; changed(); } });
                const cb = row.querySelector('input[type=checkbox]'); if (cb) cb.addEventListener('change', e => { c.closed = e.target.checked; changed(); });
                row.querySelector('[data-a="par"]').addEventListener('click', () => { blk.push({ type: 'R', value: 10 }); render(); changed(); });
                row.querySelector('[data-a="del"]').addEventListener('click', () => { blk.splice(k, 1); if (!blk.length) S.blocks.splice(bi, 1); if (!S.blocks.length) S.blocks.push([{ type: 'R', value: 10 }]); render(); changed(); });
                g.appendChild(row);
              });
              box.appendChild(g);
            });
            box.appendChild(ui.buttons([[T('+ Add in series', '+ أضف على التوالي'), () => { S.blocks.push([{ type: 'R', value: 10 }]); render(); changed(); }, { primary: true }]]));
          };
          const changed = () => { api.init(); api.fit(); st.dirty = true; api.redraw(); L.explainNow(); };
          api.renderBuilder = render; render();
        },
        draw(g, p, S, st) {
          const c = L.colors(), sol = st.sol; if (!sol) { p.text(0, 1, T('This circuit can’t be solved (it may short the battery or leave a node floating).', 'لا يمكن حل الدائرة.'), '#dc2626'); return; }
          const top = 2 + Math.max(...S.blocks.map(b => b.length)) * 1.6 - 1.6, bot = -0.6, nB = S.blocks.length, x0 = 0, x1 = nB * 3 + 1;
          const wire = (pts, I) => { p.path(pts, c.ink, { w: 2 }); };
          // battery (left side)
          p.path([[x0, bot], [x0, 0.6]], c.ink, { w: 2 }); p.path([[x0, 1.4], [x0, top]], c.ink, { w: 2 }); p.path([[x0 - 0.5, 0.75], [x0 + 0.5, 0.75]], c.ink, { w: 3 }); p.path([[x0 - 0.25, 1.25], [x0 + 0.25, 1.25]], c.ink, { w: 3 }); p.path([[x0 - 0.5, 1.4], [x0 + 0.5, 1.4]], c.ink, { w: 2 }); p.text(x0 - 0.6, 1, `${N.fmt(S.V, 3)} V`, c.ink, { align: 'right', dx: -4 });
          p.path([[x0, top], [x1, top], [x1, bot], [x0, bot]], c.ink, { w: 2 });
          const flow = st.phase;
          S.blocks.forEach((blk, bi) => {
            const cx = 2 + bi * 3, k = blk.length; const ys = blk.map((_, j) => top - j * 1.6);
            if (k > 1) { p.path([[cx - 1, ys[0]], [cx - 1, ys[k - 1]]], c.ink, { w: 2 }); p.path([[cx + 1, ys[0]], [cx + 1, ys[k - 1]]], c.ink, { w: 2 }); }
            blk.forEach((comp, j) => {
              const y = ys[j], r = sol.comps.find(o => o.name === (comp.name || `${comp.type}${bi + 1}${k > 1 ? String.fromCharCode(97 + j) : ''}`)); const I = r ? r.I : 0;
              p.g.fillStyle = c.bg; const X = p.X(cx), Y = p.Y(y), sc = p.X(1) - p.X(0);
              p.g.fillRect(X - sc * 0.75, Y - 6, sc * 1.5, 12);
              if (k > 1) p.path([[cx - 1, y], [cx - 0.75, y]], c.ink, { w: 2 }), p.path([[cx + 0.75, y], [cx + 1, y]], c.ink, { w: 2 });
              const col = c.pal[bi % 8];
              if (comp.type === 'R') { const pts = []; for (let i = 0; i <= 12; i++) pts.push([cx - 0.75 + 1.5 * i / 12, y + (i % 2 ? 0.18 : -0.18) * (i && i < 12 ? 1 : 0)]); p.path(pts, col, { w: 2.4 }); }
              else if (comp.type === 'bulb') { const glow = Math.min(1, Math.abs(r ? r.P : 0) / 6); p.g.fillStyle = `rgba(250,204,21,${0.15 + glow * 0.7})`; p.g.beginPath(); p.g.arc(X, Y, sc * 0.42, 0, 7); p.g.fill(); p.g.strokeStyle = col; p.g.lineWidth = 2; p.g.stroke(); p.path([[cx - 0.3, y - 0.3], [cx + 0.3, y + 0.3]], col); p.path([[cx - 0.3, y + 0.3], [cx + 0.3, y - 0.3]], col); p.path([[cx - 0.75, y], [cx - 0.42, y]], c.ink, { w: 2 }); p.path([[cx + 0.42, y], [cx + 0.75, y]], c.ink, { w: 2 }); }
              else if (comp.type === 'LED') { p.path([[cx - 0.3, y - 0.3], [cx - 0.3, y + 0.3], [cx + 0.3, y]], r && r.on ? '#ef4444' : col, { close: true, fill: r && r.on ? 'rgba(239,68,68,.6)' : 'transparent' }); p.path([[cx + 0.3, y - 0.3], [cx + 0.3, y + 0.3]], col, { w: 2.4 }); p.path([[cx - 0.75, y], [cx - 0.3, y]], c.ink, { w: 2 }); p.path([[cx + 0.3, y], [cx + 0.75, y]], c.ink, { w: 2 }); }
              else if (comp.type === 'switch') { p.dot(cx - 0.5, y, c.ink, null, { r: 3 }); p.dot(cx + 0.5, y, c.ink, null, { r: 3 }); p.path([[cx - 0.5, y], comp.closed !== false ? [cx + 0.5, y] : [cx + 0.35, y + 0.5]], col, { w: 2.4 }); p.path([[cx - 0.75, y], [cx - 0.5, y]], c.ink, { w: 2 }); p.path([[cx + 0.5, y], [cx + 0.75, y]], c.ink, { w: 2 }); }
              else if (comp.type === 'C') { p.path([[cx - 0.12, y - 0.4], [cx - 0.12, y + 0.4]], col, { w: 3 }); p.path([[cx + 0.12, y - 0.4], [cx + 0.12, y + 0.4]], col, { w: 3 }); p.path([[cx - 0.75, y], [cx - 0.12, y]], c.ink, { w: 2 }); p.path([[cx + 0.12, y], [cx + 0.75, y]], c.ink, { w: 2 }); }
              else if (comp.type === 'Lind') { const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * 4 * Math.PI; pts.push([cx - 0.6 + 1.2 * i / 40, y + 0.2 * Math.abs(Math.sin(a / 2))]); } p.path(pts, col, { w: 2.4 }); p.path([[cx - 0.75, y], [cx - 0.6, y]], c.ink, { w: 2 }); p.path([[cx + 0.6, y], [cx + 0.75, y]], c.ink, { w: 2 }); }
              p.text(cx, y, `${comp.type === 'switch' ? (comp.closed !== false ? T('closed', 'مغلق') : T('open', 'مفتوح')) : N.fmt(comp.value, 4) + ' ' + COMP[comp.type].unit}`, c.muted, { align: 'center', dy: -14 });
              if (r) p.text(cx, y, `${N.fmt(Math.abs(r.I), 4)} A · ${N.fmt(Math.abs(r.V), 4)} V`, c.ink, { align: 'center', dy: 22, font: '600 11px ui-sans-serif, system-ui' });
              // moving charge dots: speed proportional to current (conventional current, + to −)
              if (Math.abs(I) > 1e-6 && !L.still()) { const sp = Math.min(3, Math.abs(I) * 2), ph = (flow * sp) % 1; for (let q = 0; q < 3; q++) { const u = (ph + q / 3) % 1; p.dot(cx - 0.75 + 1.5 * u * Math.sign(I) + (I < 0 ? 1.5 : 0), y, c.dark ? '#fde68a' : '#b45309', null, { r: 2.6 }); } }
            });
          });
          if (Math.abs(sol.I) > 1e-6 && !L.still()) { const sp = Math.min(3, Math.abs(sol.I) * 2), per = 2 * (x1 - x0) + 2 * (top - bot); for (let q = 0; q < 14; q++) { let u = ((st.phase * sp / per * 6 + q / 14) % 1) * per; let x, y; if (u < top - bot) { x = x0; y = bot + u; } else if ((u -= top - bot) < x1 - x0) { x = x0 + u; y = top; } else if ((u -= x1 - x0) < top - bot) { x = x1; y = top - u; } else { u -= top - bot; x = x1 - u; y = bot; } if (y > 0.5 && y < 1.5 && x === x0) continue; p.dot(x, y, c.dark ? '#fde68a' : '#b45309', null, { r: 2.4 }); } }
        },
        readout(S, st) { const s = st.sol; if (!s) return [[T('circuit', 'الدائرة'), T('no solution', 'لا حل')]]; return [[T('battery current', 'تيار البطارية'), N.fmt(s.I, 5) + ' A'], [T('total resistance', 'المقاومة الكلية'), Math.abs(s.I) > 1e-9 ? N.fmt(S.V / s.I, 5) + ' Ω' : '∞'], [T('power from battery', 'القدرة'), N.fmt(S.V * s.I, 4) + ' W']].concat(hasC(S) ? [['V_C', N.fmt(st.vc, 4) + ' V'], ['τ = RC', N.fmt(st.tau, 4) + ' s']] : []); },
        intro(S, st) { const s = solve(S); if (!s) return T('That circuit can’t be solved — check for a short circuit.', 'لا يمكن حل الدائرة.'); return T(`${S.blocks.length === 1 && S.blocks[0].length > 1 ? 'A parallel' : S.blocks.length > 1 && S.blocks.every(b => b.length === 1) ? 'A series' : 'A'} circuit on a ${S.V} V battery: the battery delivers ${N.fmt(s.I, 4)} A. Each component shows its current and voltage; Kirchhoff’s laws are checked live in the panel. Change values, add components in series (+) or in parallel (∥), or open a switch.`, 'دائرة كهربائية.'); },
        explain(S, st) {
          const s = st.sol; if (!s) return `<p>${T('No solution: a branch shorts the battery or a part of the circuit is isolated.', 'لا يوجد حل.')}</p>`;
          const rows = s.comps.map(o => [`${COMP[o.type].label} ${o.name}`, `${N.fmt(Math.abs(o.I), 5)} A · ${N.fmt(Math.abs(o.V), 5)} V · ${N.fmt(Math.abs(o.P), 4)} W${o.type === 'LED' ? (o.on ? ' · ' + T('on', 'يعمل') : ' · ' + T('off', 'مطفأ')) : ''}`]);
          const blockV = S.blocks.map((b, bi) => { const o = s.comps.find(x => x.name === (b[0].name || `${b[0].type}${bi + 1}${b.length > 1 ? 'a' : ''}`)); return o ? o.V : 0; }), sumV = blockV.reduce((a, v) => a + v, 0) + s.I * S.r;
          const kcl = S.blocks.map((b, bi) => b.reduce((a, c, k) => { const o = s.comps.find(x => x.name === (c.name || `${c.type}${bi + 1}${b.length > 1 ? String.fromCharCode(97 + k) : ''}`)); return a + (o ? o.I : 0); }, 0));
          return `${ui.readout(rows)}<h5>${T('Kirchhoff checks', 'فحوص كيرشوف')}</h5><p>${T('Voltage law (loop): battery', 'قانون الجهد: البطارية')} ${N.fmt(S.V, 5)} V = ${T('sum of drops', 'مجموع الهبوط')} ${N.fmt(sumV, 5)} V ${Math.abs(S.V - sumV) < 1e-6 ? '✓' : '✗'}<br>${T('Current law: each block carries the battery current', 'قانون التيار')} ${kcl.every(v => Math.abs(v - s.I) < 1e-6) ? '✓' : kcl.map(v => N.fmt(v, 4)).join(', ')}</p><p>${T('In series the same current flows through everything and the voltages add up; in parallel every branch gets the same voltage and the currents add up. Ohm’s law V = IR holds for each resistor.', 'في التوالي التيار واحد؛ في التوازي الجهد واحد.')}</p>${hasC(S) ? `<p>${T('RC charging: V_C(t) = V(1 − e^(−t/RC)). After one time constant τ the capacitor is at 63% of the supply; after 5τ it is effectively full. In the steady state no current flows.', 'شحن المكثف.')}</p>` : ''}`;
        },
        assume: T('Ideal wires; ideal battery plus optional internal resistance; resistors obey Ohm’s law (a bulb is treated as a fixed resistance, though real filaments heat up); an LED is a 2 V forward drop with 5 Ω on-resistance and no reverse current; in DC steady state a capacitor is an open circuit and an inductor a short.', 'أسلاك مثالية.'),
        command(t, S, st, api) {
          let m;
          const resistors = () => S.blocks.flat().filter(c => c.type === 'R' || c.type === 'bulb');
          if (/\b(double|twice) (the )?resistance\b/i.test(t)) { resistors().forEach(c => { c.value *= 2; }); api.renderBuilder(); const s = solve(S); return { note: T(`Every resistance doubled: the current is now ${N.fmt(s.I, 4)} A — half what it was (I = V/R).`, 'ضوعفت المقاومة فانخفض التيار للنصف.') }; }
          if (/\b(halve|half) (the )?resistance\b/i.test(t)) { resistors().forEach(c => { c.value /= 2; }); api.renderBuilder(); return { note: T('Resistances halved: the current doubles.', 'نصف المقاومة فتضاعف التيار.') }; }
          if (/\badd (a |another )?(resistor|bulb)\b/i.test(t)) { const type = /bulb/i.test(t) ? 'bulb' : 'R'; if (/\bparallel\b/i.test(t)) S.blocks[S.blocks.length - 1].push({ type, value: COMP[type].def }); else S.blocks.push([{ type, value: COMP[type].def }]); api.renderBuilder(); return { note: T(`Added a ${type === 'R' ? 'resistor' : 'bulb'} ${/parallel/i.test(t) ? 'in parallel' : 'in series'}.`, 'أُضيف مكوّن.') }; }
          if (/\b(make it|put them|connect them) (in )?parallel\b/i.test(t)) { S.blocks = [S.blocks.flat()]; api.renderBuilder(); return { note: T('All components now in parallel.', 'كلها على التوازي.') }; }
          if (/\b(make it|put them|connect them) (in )?series\b/i.test(t)) { S.blocks = S.blocks.flat().map(c => [c]); api.renderBuilder(); return { note: T('All components now in series.', 'كلها على التوالي.') }; }
          if (/\badd (a )?switch\b/i.test(t)) { S.blocks.push([{ type: 'switch', value: 1, closed: true }]); api.renderBuilder(); return { note: T('Switch added (closed).', 'أُضيف مفتاح.') }; }
          if (/\b(open|close) the switch\b/i.test(t)) { const sw = S.blocks.flat().find(c => c.type === 'switch'); if (sw) { sw.closed = /close/i.test(t); api.renderBuilder(); return { note: sw.closed ? T('Switch closed.', 'أُغلق المفتاح.') : T('Switch opened: no current flows through that path.', 'فُتح المفتاح.') }; } }
          if ((m = t.match(/(\d+(?:\.\d+)?)\s*(?:V|volts?)\b/i))) { S.V = +m[1]; return { note: `V = ${S.V} V.` }; }
          if ((m = t.match(/\bresist\w*\s*(?:to|=)\s*(\d+(?:\.\d+)?)/i))) { resistors().forEach(c => { c.value = +m[1]; }); api.renderBuilder(); return { note: `R = ${m[1]} Ω.` }; }
          return null;
        },
        state: (S, st) => ({ V: S.V, r: S.r, blocks: S.blocks, solution: st.sol ? { I: st.sol.I, components: st.sol.comps.map(o => ({ name: o.name, type: o.type, value: o.value, V: o.V, I: o.I, P: o.P, on: o.on })) } : null, vc: st.vc })
      };
    });

  /* ======================= electric field ======================= */
  const kC = 8.9875517923e9;
  reg('efield', KIND.elec, T('Electric field of point charges', 'المجال الكهربائي'),
    t => (/\b(electric field|coulomb|point charges?|electric potential|equipotential|field lines|dipole|electrostatic)\b/i.test(t) && !/magnetic/i.test(t) ? { score: 0.9, params: { set: { like: /like charges|two positive|repel/i.test(t) } } } : null),
    {
      defaults: { q1: 2, q2: -2, d: 4, pot: true, lines: true, like: false }, autoplay: false, static: true,
      params: [{ key: 'q1', label: 'q₁', unit: 'μC', min: -10, max: 10, step: 0.5, live: true, alias: ['charge 1', 'q1'] }, { key: 'q2', label: 'q₂', unit: 'μC', min: -10, max: 10, step: 0.5, live: true, alias: ['charge 2', 'q2'] }],
      toggles: [{ key: 'pot', label: T('Colour by potential', 'تلوين حسب الجهد'), live: true }, { key: 'lines', label: T('Field lines', 'خطوط المجال'), live: true }], graph: false, labels: { x: 'x (m)', y: 'y (m)' },
      view: () => ({ x0: -6, x1: 6, y0: -4, y1: 4 }),
      init(S, st) { if (!st.ch) { st.ch = [{ q: S.like ? 2 : S.q1, x: -S.d / 2, y: 0 }, { q: S.like ? 2 : S.q2, x: S.d / 2, y: 0 }]; if (S.like) { S.q1 = 2; S.q2 = 2; } st.probe = { x: 0, y: 2 }; } st.ch[0].q = S.q1; st.ch[1] && (st.ch[1].q = S.q2); },
      step() {},
      onDown(S, st, x, y) { const all = st.ch.concat([st.probe]); let best = null; all.forEach((c, i) => { const d = Math.hypot(c.x - x, c.y - y); if (d < 0.5 && (!best || d < best.d)) best = { d, i }; }); return best ? { i: best.i } : null; },
      onDrag(S, st, x, y, d) { const o = d.i < st.ch.length ? st.ch[d.i] : st.probe; o.x = x; o.y = y; L.explainNow(); },
      draw(g, p, S, st) {
        const c = L.colors(), E = (x, y) => { let ex = 0, ey = 0, V = 0; st.ch.forEach(q => { const dx = x - q.x, dy = y - q.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2); if (r < 1e-3) return; const k = kC * q.q * 1e-6; ex += k * dx / (r2 * r); ey += k * dy / (r2 * r); V += k / r; }); return [ex, ey, V]; };
        if (S.pot) { const cs = 8, img = g.createImageData(Math.ceil(p.W / cs), Math.ceil(p.H / cs)); for (let j = 0; j < img.height; j++) for (let i = 0; i < img.width; i++) { const v = E(p.ix(i * cs + cs / 2), p.iy(j * cs + cs / 2))[2], t = Math.max(-1, Math.min(1, Math.sign(v) * Math.log10(1 + Math.abs(v) / 2e3) / 2.5)), k = (j * img.width + i) * 4; img.data[k] = t > 0 ? 235 : 59; img.data[k + 1] = t > 0 ? 68 : 130; img.data[k + 2] = t > 0 ? 68 : 246; img.data[k + 3] = Math.abs(t) * 120; } const oc = document.createElement('canvas'); oc.width = img.width; oc.height = img.height; oc.getContext('2d').putImageData(img, 0, 0); g.save(); g.imageSmoothingEnabled = true; g.drawImage(oc, 0, 0, p.W, p.H); g.restore(); }
        if (S.lines) { g.strokeStyle = c.muted; g.lineWidth = 1.2; st.ch.filter(q => q.q > 0).forEach(q => { const n = Math.max(8, Math.round(Math.abs(q.q) * 6)); for (let k = 0; k < n; k++) { let x = q.x + 0.15 * Math.cos(2 * Math.PI * k / n), y = q.y + 0.15 * Math.sin(2 * Math.PI * k / n); g.beginPath(); g.moveTo(p.X(x), p.Y(y)); for (let s = 0; s < 600; s++) { const e = E(x, y), m = Math.hypot(e[0], e[1]); if (!m) break; x += 0.03 * e[0] / m; y += 0.03 * e[1] / m; g.lineTo(p.X(x), p.Y(y)); if (st.ch.some(o => o.q < 0 && Math.hypot(o.x - x, o.y - y) < 0.12) || x < p.view.x0 - 1 || x > p.view.x1 + 1 || y < p.view.y0 - 1 || y > p.view.y1 + 1) break; } g.stroke(); } }); if (!st.ch.some(q => q.q > 0)) st.ch.filter(q => q.q < 0).forEach(q => { const n = 12; for (let k = 0; k < n; k++) { let x = q.x + 0.15 * Math.cos(2 * Math.PI * k / n), y = q.y + 0.15 * Math.sin(2 * Math.PI * k / n); g.beginPath(); g.moveTo(p.X(x), p.Y(y)); for (let s = 0; s < 600; s++) { const e = E(x, y), m = Math.hypot(e[0], e[1]); if (!m) break; x -= 0.03 * e[0] / m; y -= 0.03 * e[1] / m; g.lineTo(p.X(x), p.Y(y)); } g.stroke(); } }); }
        const sx = (p.view.x1 - p.view.x0) / 16; for (let x = Math.ceil(p.view.x0 / sx) * sx; x <= p.view.x1; x += sx) for (let y = Math.ceil(p.view.y0 / sx) * sx; y <= p.view.y1; y += sx) { const e = E(x, y), m = Math.hypot(e[0], e[1]); if (!m || st.ch.some(q => Math.hypot(q.x - x, q.y - y) < 0.35)) continue; const l = sx * 0.4; p.arrow(x - l / 2 * e[0] / m, y - l / 2 * e[1] / m, x + l / 2 * e[0] / m, y + l / 2 * e[1] / m, c.dark ? 'rgba(226,232,240,.55)' : 'rgba(30,41,59,.45)', null, { w: 1.2 }); }
        st.ch.forEach((q, i) => { p.dot(q.x, q.y, q.q > 0 ? '#dc2626' : q.q < 0 ? '#2563eb' : c.muted, null, { r: 13, ring: true }); p.text(q.x, q.y, q.q > 0 ? '+' : q.q < 0 ? '−' : '0', '#fff', { align: 'center', dy: 5, font: '700 16px system-ui' }); p.text(q.x, q.y, `q${i + 1} = ${q.q} μC`, c.ink, { align: 'center', dy: -20 }); });
        const e = E(st.probe.x, st.probe.y), m = Math.hypot(e[0], e[1]); p.dot(st.probe.x, st.probe.y, c.dark ? '#fde68a' : '#b45309', T('probe', 'مِجَس'), { r: 6, ring: true }); if (m) p.arrow(st.probe.x, st.probe.y, st.probe.x + e[0] / m * 1.2, st.probe.y + e[1] / m * 1.2, c.dark ? '#fde68a' : '#b45309', 'E');
        st.E = e;
      },
      readout(S, st) { const [a, b] = st.ch, r = Math.hypot(a.x - b.x, a.y - b.y), F = kC * a.q * b.q * 1e-12 / (r * r), e = st.E || [0, 0, 0]; return [['r₁₂', N.fmt(r, 3) + ' m'], [T('force between them', 'القوة بينهما'), `${N.fmt(Math.abs(F), 4)} N (${F > 0 ? T('repulsive', 'تنافر') : T('attractive', 'تجاذب')})`], ['|E| ' + T('at probe', 'عند المجس'), N.fmt(Math.hypot(e[0], e[1]), 4) + ' N/C'], ['V ' + T('at probe', 'عند المجس'), N.fmt(e[2], 4) + ' V']]; },
      intro: S => T(`Two point charges (q₁ = ${S.q1} μC, q₂ = ${S.q2} μC). Arrows show the electric field direction, lines run from + to −, and colour shows the potential (red high, blue low). Drag the charges or the yellow probe; the panel gives the Coulomb force and the field at the probe.`, 'شحنتان نقطيتان.'),
      explain: () => `<p class="lab-eq">F = k q₁q₂ / r² &nbsp; E = kq / r² &nbsp; V = kq / r &nbsp; (k = 8.99 × 10⁹ N·m²/C²)</p><p>${T('The field points away from positive charges and towards negative ones. Field lines never cross; they are denser where the field is stronger. Equipotentials (equal colour) are always perpendicular to the field lines. Doubling the distance quarters the force.', 'المجال يتجه بعيداً عن الشحنات الموجبة.')}</p>`,
      assume: T('Point charges in a vacuum, fixed in place; fields from all charges add (superposition). Distances in metres, charges in microcoulombs.', 'شحنات نقطية في الفراغ.'),
      command(t, S, st) { if (/\bdouble (the )?charge/i.test(t)) { S.q1 *= 2; return { note: `q₁ = ${S.q1} μC.`, keep: true }; } if (/\b(like charges|both positive|make them both positive)\b/i.test(t)) { S.q1 = 2; S.q2 = 2; return { note: T('Two positive charges: they repel, and there is a point between them with zero field.', 'شحنتان موجبتان.'), keep: true }; } if (/\b(opposite|dipole)\b/i.test(t)) { S.q1 = 2; S.q2 = -2; return { note: T('A dipole.', 'ثنائي القطب.'), keep: true }; } if (/\badd (a )?(positive|negative) charge\b/i.test(t)) { st.ch.push({ q: /negative/i.test(t) ? -2 : 2, x: 0, y: -2 }); return { note: T('Charge added — drag it.', 'أُضيفت شحنة.'), keep: true }; } return null; },
      state: (S, st) => ({ charges: st.ch.map(q => Object.assign({}, q)), probe: Object.assign({}, st.probe), fieldAtProbe: st.E })
    });

  /* ======================= magnetic field ======================= */
  const mu0 = 4 * Math.PI * 1e-7;
  reg('bfield', KIND.elec, T('Magnetic field of currents', 'المجال المغناطيسي'),
    t => (/\b(magnetic field|right[- ]hand (grip )?rule|current[- ]carrying wire|field around (a |the |this )?wire|ampere|biot|parallel wires|force between (two )?wires|solenoid)\b/i.test(t) ? { score: 0.9, params: { set: { two: /\b(two|parallel) wires|force between\b/i.test(t) } } } : null),
    {
      defaults: { I1: 5, I2: -5, two: false, d: 4 }, autoplay: false, static: true,
      params: [{ key: 'I1', label: T('current I₁ (+ out of page)', 'التيار I₁'), unit: 'A', min: -20, max: 20, step: 0.5, live: true, alias: ['current', 'i1'] }, { key: 'I2', label: T('current I₂', 'التيار I₂'), unit: 'A', min: -20, max: 20, step: 0.5, live: true, alias: ['i2'] }, { key: 'd', label: T('separation', 'المسافة'), unit: 'cm', min: 1, max: 10, step: 0.5, live: true, alias: ['distance', 'separation'] }],
      toggles: [{ key: 'two', label: T('Second wire', 'سلك ثانٍ'), live: true }], graph: false, labels: { x: 'x (cm)', y: 'y (cm)' },
      view: () => ({ x0: -10, x1: 10, y0: -6.5, y1: 6.5 }),
      init(S, st) { st.probe = st.probe || { x: 0, y: 3 }; }, step() {},
      onDown(S, st, x, y) { return Math.hypot(st.probe.x - x, st.probe.y - y) < 0.8 ? { p: 1 } : null; },
      onDrag(S, st, x, y) { st.probe.x = x; st.probe.y = y; L.explainNow(); },
      draw(g, p, S, st) {
        const c = L.colors(), wires = [{ x: S.two ? -S.d / 2 : 0, y: 0, I: S.I1 }].concat(S.two ? [{ x: S.d / 2, y: 0, I: S.I2 }] : []);
        const B = (x, y) => { let bx = 0, by = 0; wires.forEach(w => { const dx = (x - w.x) / 100, dy = (y - w.y) / 100, r2 = dx * dx + dy * dy; if (r2 < 1e-8) return; const k = mu0 * w.I / (2 * Math.PI * r2); bx += -k * dy; by += k * dx; }); return [bx, by]; };
        const sx = 1.1; for (let x = Math.ceil(p.view.x0 / sx) * sx; x <= p.view.x1; x += sx) for (let y = Math.ceil(p.view.y0 / sx) * sx; y <= p.view.y1; y += sx) { const b = B(x, y), m = Math.hypot(b[0], b[1]); if (!m || wires.some(w => Math.hypot(w.x - x, w.y - y) < 0.7)) continue; const a = Math.min(1, 0.25 + Math.log10(1 + m * 1e6) / 3), l = 0.42; p.arrow(x - l * b[0] / m, y - l * b[1] / m, x + l * b[0] / m, y + l * b[1] / m, c.dark ? `rgba(147,197,253,${a})` : `rgba(29,78,216,${a})`, null, { w: 1.3 }); }
        if (!S.two) [1, 2, 3, 4.5, 6].forEach(r => { const pts = []; for (let k = 0; k <= 80; k++) pts.push([wires[0].x + r * Math.cos(k / 80 * 2 * Math.PI), r * Math.sin(k / 80 * 2 * Math.PI)]); p.path(pts, c.muted, { w: 1, dash: [3, 4] }); });
        wires.forEach((w, i) => { p.dot(w.x, w.y, c.pal[1], null, { r: 14, ring: true }); const X = p.X(w.x), Y = p.Y(w.y); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 2.5; if (w.I > 0) { g.beginPath(); g.arc(X, Y, 3.5, 0, 7); g.fill(); } else if (w.I < 0) { g.beginPath(); g.moveTo(X - 6, Y - 6); g.lineTo(X + 6, Y + 6); g.moveTo(X + 6, Y - 6); g.lineTo(X - 6, Y + 6); g.stroke(); } p.text(w.x, w.y, `I${i + 1} = ${Math.abs(w.I)} A ${w.I > 0 ? T('(out)', '(خارج)') : w.I < 0 ? T('(in)', '(داخل)') : ''}`, c.ink, { align: 'center', dy: -22 }); });
        const b = B(st.probe.x, st.probe.y), m = Math.hypot(b[0], b[1]); p.dot(st.probe.x, st.probe.y, c.dark ? '#fde68a' : '#b45309', T('probe', 'مِجَس'), { r: 6, ring: true }); if (m) p.arrow(st.probe.x, st.probe.y, st.probe.x + b[0] / m * 1.6, st.probe.y + b[1] / m * 1.6, c.dark ? '#fde68a' : '#b45309', 'B'); st.B = m;
      },
      readout(S, st) { const r = [['|B| ' + T('at probe', 'عند المجس'), N.fmt(st.B || 0, 4) + ' T'], ['μT', N.fmt((st.B || 0) * 1e6, 4)]]; if (S.two) { const F = mu0 * S.I1 * S.I2 / (2 * Math.PI * S.d / 100); r.push([T('force per metre', 'القوة لكل متر'), `${N.fmt(Math.abs(F), 4)} N/m (${F > 0 ? T('attract — same direction', 'تجاذب') : T('repel — opposite directions', 'تنافر')})`]); } return r; },
      intro: S => T(`The magnetic field around a long straight wire carrying ${Math.abs(S.I1)} A ${S.I1 > 0 ? 'out of' : 'into'} the page: circles around the wire, getting weaker with distance (B = μ₀I / 2πr). Drag the probe to read B. Turn on the second wire to see the force between parallel currents.`, 'المجال حول سلك.'),
      explain: S => `<p class="lab-eq">B = μ₀ I / (2π r) &nbsp; F/L = μ₀ I₁ I₂ / (2π d)</p><p>${T('Right-hand grip rule: thumb along the current, fingers curl the way the field circles. Current out of the page (dot) → anticlockwise field; into the page (cross) → clockwise. Currents in the same direction attract; opposite currents repel.', 'قاعدة اليد اليمنى.')}</p>`,
      assume: T('Infinitely long straight wires perpendicular to the page, in air (μ ≈ μ₀), steady currents. Distances in centimetres.', 'أسلاك طويلة جداً.'),
      command(t, S) { if (/\b(reverse|flip) (the )?current\b/i.test(t)) { S.I1 = -S.I1; return { note: T('Current reversed: the field circles the other way.', 'انعكس التيار.'), keep: true }; } if (/\b(two|second|parallel) wires?\b/i.test(t)) { S.two = true; return { note: T('Second wire added.', 'أُضيف سلك.'), keep: true }; } if (/\bdouble (the )?current\b/i.test(t)) { S.I1 *= 2; S.I2 *= 2; return { note: T('Current doubled: B doubles everywhere.', 'تضاعف التيار.'), keep: true }; } return null; },
      state: (S, st) => ({ params: Object.assign({}, S), probe: Object.assign({}, st.probe), B: st.B })
    });

  /* ======================= waves ======================= */
  reg('waves', KIND.wave, T('Wave lab', 'مختبر الموجات'),
    t => { if (/\b(modulat\w*|am radio|fm radio)\b/i.test(t)) return null; if (!/\b(interference|superposition|standing waves?|harmonics?|doppler|wavelength|amplitude|diffraction|young'?s|double[- ]slit|sound waves?|transverse|longitudinal|wave (speed|frequency|motion|equation)|waves? (lab|simulation)|(show|simulate|draw|make)\b.*\bwaves?)\b/i.test(t) || /\belectromagnetic spectrum\b/i.test(t)) return null; return { score: 0.85, params: { set: { mode: /doppler/i.test(t) ? 'doppler' : /standing|harmonic|string/i.test(t) ? 'standing' : /interference|double[- ]slit|young|two sources|diffraction/i.test(t) ? 'interference' : 'super' } } }; },
    {
      defaults: { mode: 'super', f1: 1, f2: 1.2, A1: 1, A2: 1, ph: 0, lam: 1.2, d: 3, n: 2, Ls: 6, vs: 0.5, c: 3 },
      selects: [{ key: 'mode', label: T('Experiment', 'التجربة'), options: [['super', T('Superposition of two waves', 'تراكب موجتين')], ['interference', T('Two-source interference', 'تداخل مصدرين')], ['standing', T('Standing wave on a string', 'موجة موقوفة')], ['doppler', T('Doppler effect', 'تأثير دوبلر')]], num: false, rebuild: true }],
      params: [{ key: 'f1', label: T('frequency f₁', 'التردد f₁'), unit: 'Hz', min: 0.2, max: 4, step: 0.05, live: true, alias: ['frequency'], when: S => S.mode !== 'interference' }, { key: 'f2', label: T('frequency f₂', 'التردد f₂'), unit: 'Hz', min: 0.2, max: 4, step: 0.05, live: true, when: S => S.mode === 'super' }, { key: 'A1', label: T('amplitude A₁', 'السعة A₁'), unit: '', min: 0, max: 2, step: 0.05, live: true, alias: ['amplitude'], when: S => S.mode === 'super' || S.mode === 'standing' }, { key: 'ph', label: T('phase difference', 'فرق الطور'), unit: '°', min: 0, max: 360, step: 1, live: true, alias: ['phase'], when: S => S.mode === 'super' || S.mode === 'interference' }, { key: 'lam', label: T('wavelength λ', 'الطول الموجي'), unit: 'm', min: 0.4, max: 3, step: 0.05, live: true, alias: ['wavelength'], when: S => S.mode === 'interference' }, { key: 'd', label: T('source separation d', 'المسافة بين المصدرين'), unit: 'm', min: 0.5, max: 6, step: 0.1, live: true, alias: ['separation'], when: S => S.mode === 'interference' }, { key: 'n', label: T('harmonic n', 'التوافقية n'), unit: '', min: 1, max: 8, step: 1, live: true, alias: ['harmonic'], when: S => S.mode === 'standing' }, { key: 'vs', label: T('source speed / wave speed', 'سرعة المصدر/الموجة'), unit: '', min: 0, max: 1.5, step: 0.01, live: true, alias: ['source speed'], when: S => S.mode === 'doppler' }],
      graph: false, equal: false, labels: { x: 'x (m)', y: 'displacement' },
      view: S => (S.mode === 'interference' || S.mode === 'doppler' ? { x0: -8, x1: 8, y0: -6, y1: 6 } : { x0: 0, x1: 12, y0: -3.2, y1: 3.2 }),
      init(S, st) { st.src = 0; }, step(S, st, h) {},
      draw(g, p, S, st) {
        const c = L.colors(), t = st.t; p.equal = S.mode === 'interference' || S.mode === 'doppler';
        if (S.mode === 'super') { const k1 = 2 * Math.PI * S.f1 / S.c, k2 = 2 * Math.PI * S.f2 / S.c, ph = S.ph * Math.PI / 180, y1 = x => S.A1 * Math.sin(k1 * x - 2 * Math.PI * S.f1 * t), y2 = x => S.A2 * Math.sin(k2 * x - 2 * Math.PI * S.f2 * t + ph); p.fn(y1, c.pal[0], { w: 1.6, dash: [6, 4] }); p.fn(y2, c.pal[1], { w: 1.6, dash: [6, 4] }); p.fn(x => y1(x) + y2(x), c.ink, { w: 3 }); p.text(0.3, 3, T('dashed: the two waves · solid: their sum', 'المتقطع: الموجتان · المتصل: المجموع'), c.muted); }
        if (S.mode === 'standing') { const Lw = 12, k = S.n * Math.PI / Lw, w = 2 * Math.PI * S.f1; p.fn(x => (x >= 0 && x <= Lw ? S.A1 * Math.sin(k * x) * Math.cos(w * t) : NaN), c.pal[0], { w: 3 }); p.fn(x => (x >= 0 && x <= Lw ? S.A1 * Math.sin(k * x) : NaN), c.muted, { w: 1, dash: [4, 4] }); p.fn(x => (x >= 0 && x <= Lw ? -S.A1 * Math.sin(k * x) : NaN), c.muted, { w: 1, dash: [4, 4] }); for (let j = 0; j <= S.n; j++) p.dot(j * Lw / S.n, 0, c.pal[1], j === 0 || j === S.n ? null : 'N', { r: 5 }); for (let j = 0; j < S.n; j++) p.text((j + 0.5) * Lw / S.n, S.A1, 'A', c.pal[2], { dy: -6, align: 'center' }); }
        if (S.mode === 'interference') { const cs = 5, img = g.createImageData(Math.ceil(p.W / cs), Math.ceil(p.H / cs)), k = 2 * Math.PI / S.lam, w = 2 * Math.PI * S.c / S.lam, ph = S.ph * Math.PI / 180, s1 = [-S.d / 2, -5], s2 = [S.d / 2, -5]; for (let j = 0; j < img.height; j++) for (let i = 0; i < img.width; i++) { const x = p.ix(i * cs), y = p.iy(j * cs), r1 = Math.hypot(x - s1[0], y - s1[1]) + 0.2, r2 = Math.hypot(x - s2[0], y - s2[1]) + 0.2; const v = Math.sin(k * r1 - w * t) / Math.sqrt(r1) + Math.sin(k * r2 - w * t + ph) / Math.sqrt(r2), q = (j * img.width + i) * 4, a = Math.max(-1, Math.min(1, v / 1.2)); img.data[q] = a > 0 ? 37 : 220; img.data[q + 1] = a > 0 ? 99 : 38; img.data[q + 2] = a > 0 ? 235 : 38; img.data[q + 3] = Math.abs(a) * 200; } const oc = document.createElement('canvas'); oc.width = img.width; oc.height = img.height; oc.getContext('2d').putImageData(img, 0, 0); g.drawImage(oc, 0, 0, p.W, p.H); p.dot(s1[0], s1[1], c.ink, 'S₁', { r: 6 }); p.dot(s2[0], s2[1], c.ink, 'S₂', { r: 6 }); for (let m = -6; m <= 6; m++) { const s = (m + S.ph / 360) * S.lam / S.d; if (Math.abs(s) >= 1) continue; const th = Math.asin(s); p.path([[0, -5], [11 * Math.sin(th), -5 + 11 * Math.cos(th)]], c.dark ? 'rgba(250,250,250,.4)' : 'rgba(0,0,0,.3)', { w: 1, dash: [3, 5] }); } }
        if (S.mode === 'doppler') { const v = S.vs * S.c, per = 1 / S.f1; const xs = -6 + ((v * t) % 14 + 14) % 14 - 0; st.src = xs; for (let k = 0; k < 24; k++) { const te = t - k * per; if (te < 0) break; const xe = -6 + ((v * te) % 14 + 14) % 14, r = S.c * (t - te); if (r > 20) continue; const pts = []; for (let a = 0; a <= 64; a++) pts.push([xe + r * Math.cos(a / 64 * 2 * Math.PI), r * Math.sin(a / 64 * 2 * Math.PI)]); p.path(pts, c.pal[0], { w: 1.4 }); } p.dot(xs, 0, c.pal[1], T('source →', 'المصدر ←'), { r: 7 }); p.dot(7, 0, c.pal[2], T('observer ahead', 'مراقب أمامي'), { r: 6 }); p.dot(-7.5, 0, c.pal[4], T('behind', 'خلفي'), { r: 6 }); }
      },
      readout(S) { if (S.mode === 'super') return [['f₁, f₂', `${S.f1}, ${S.f2} Hz`], [T('beat frequency |f₁ − f₂|', 'تردد الضربات'), N.fmt(Math.abs(S.f1 - S.f2), 3) + ' Hz']]; if (S.mode === 'standing') { const Lw = 12, lam = 2 * Lw / S.n; return [[T('wavelength λ = 2L/n', 'الطول الموجي'), N.fmt(lam, 3) + ' m'], [T('nodes', 'العقد'), S.n + 1], [T('antinodes', 'البطون'), S.n]]; } if (S.mode === 'interference') return [['λ', S.lam + ' m'], ['d', S.d + ' m'], [T('bright directions sin θ = mλ/d', 'اتجاهات الإضاءة'), `${Math.floor(S.d / S.lam) * 2 + 1}`]]; const v = S.vs * S.c; return S.vs < 1 ? [[T('f ahead = f·c/(c − v)', 'التردد أمامي'), N.fmt(S.f1 * S.c / (S.c - v), 4) + ' Hz'], [T('f behind = f·c/(c + v)', 'التردد خلفي'), N.fmt(S.f1 * S.c / (S.c + v), 4) + ' Hz']] : [[T('source speed ≥ wave speed', 'السرعة ≥ سرعة الموجة'), T('a shock wave (cone) forms', 'تتكون موجة صدمية')]]; },
      intro: S => ({ super: T('Two waves and their sum (superposition). Change frequencies, amplitude and phase: equal frequencies in phase add up (constructive), half a cycle apart cancel (destructive), and slightly different frequencies make beats.', 'تراكب موجتين.'), interference: T('Two sources emitting in step: where crests meet crests the waves add (blue/red), where crest meets trough they cancel (pale). Dashed lines mark bright directions, sin θ = mλ/d.', 'تداخل مصدرين.'), standing: T('A standing wave on a string fixed at both ends: nodes (N) never move, antinodes (A) swing most. Only whole numbers of half-wavelengths fit: λ = 2L/n.', 'موجة موقوفة.'), doppler: T('A moving source: wavefronts bunch up ahead (higher frequency) and spread out behind (lower). At or above the wave speed a shock cone forms.', 'تأثير دوبلر.') })[S.mode],
      explain: S => ({ super: `<p class="lab-eq">y = y₁ + y₂</p><p>${T('The principle of superposition: displacements simply add.', 'مبدأ التراكب.')}</p>`, interference: `<p class="lab-eq">${T('path difference', 'فرق المسار')} = mλ → ${T('bright', 'مضيء')}; (m + ½)λ → ${T('dark', 'مظلم')}</p><p>${T('Smaller λ or larger d gives more, closer fringes.', 'أطوال موجية أقصر تعطي أهدابا أكثر.')}</p>`, standing: `<p class="lab-eq">fₙ = n v / 2L</p><p>${T('Formed by two equal waves travelling in opposite directions; energy doesn’t travel along a standing wave.', 'تتكون من موجتين متعاكستين.')}</p>`, doppler: `<p class="lab-eq">f′ = f · c / (c ∓ v)</p><p>${T('The source’s own frequency doesn’t change — the spacing of the wavefronts reaching each observer does.', 'تردد المصدر لا يتغير.')}</p>` })[S.mode],
      assume: T('Linear waves in a uniform medium; interference uses circular waves whose amplitude falls as 1/√r; the string is ideal (uniform tension, no damping). Wave speed is fixed at 3 m/s so the motion is visible.', 'موجات خطية.'),
      command(t, S, st, api) { if (/\b(higher|increase|raise) (the )?(wave )?frequency\b/i.test(t)) { S.f1 *= 1.5; S.f2 *= 1.5; if (S.lam > 0.5) S.lam /= 1.5; return { note: T(`Frequency raised to ${N.fmt(S.f1, 3)} Hz: shorter wavelength (λ = v/f).`, 'رُفع التردد.'), keep: true }; } if (/\b(lower|decrease) (the )?frequency\b/i.test(t)) { S.f1 /= 1.5; S.f2 /= 1.5; S.lam *= 1.5; return { note: T(`Frequency lowered to ${N.fmt(S.f1, 3)} Hz.`, 'خُفض التردد.'), keep: true }; } if (/\b(bigger|larger|increase) (the )?amplitude\b/i.test(t)) { S.A1 = Math.min(2, S.A1 * 1.5); return { note: `A = ${N.fmt(S.A1, 3)}.`, keep: true }; } if (/\bout of phase|destructive\b/i.test(t)) { S.ph = 180; S.f2 = S.f1; return { note: T('180° out of phase: they cancel.', 'متعاكسة الطور.'), keep: true }; } if (/\bin phase|constructive\b/i.test(t)) { S.ph = 0; S.f2 = S.f1; return { note: T('In phase: the amplitudes add.', 'متفقة الطور.'), keep: true }; } let m; if ((m = t.match(/\bharmonic\s*(\d+)|(\d+)(?:st|nd|rd|th) harmonic/i))) { S.n = +(m[1] || m[2]); return { note: `n = ${S.n}.`, keep: true }; } return null; },
      state: S => ({ params: Object.assign({}, S) })
    });

  /* ======================= optics ======================= */
  const MEDIA = { air: 1.0003, water: 1.333, glass: 1.5, diamond: 2.42, oil: 1.47, ice: 1.31 };
  P.snell = (n1, n2, deg) => { const s = n1 * Math.sin(deg * Math.PI / 180) / n2; return Math.abs(s) > 1 ? null : Math.asin(s) * 180 / Math.PI; };
  P.thinLens = (f, u) => { const v = 1 / (1 / f - 1 / u); return { v, m: -v / u }; };
  reg('optics', KIND.wave, T('Optics bench', 'مقعد البصريات'),
    t => { if (!/\b(refract\w*|snell'?s?|critical angle|total internal reflection|lens(es)?|focal|mirrors?|ray diagrams?|image formation|prisms?)\b/i.test(t)) return null; const m2 = (t.match(/\b(water|glass|diamond|oil|ice)\b/gi) || []).map(x => x.toLowerCase()); return { score: 0.9, params: { set: { mode: /lens|focal|image|mirror|ray diagram/i.test(t) ? 'lens' : 'refract', m1: /from (water|glass|diamond)/i.test(t) ? m2[0] : 'air', m2: /from (water|glass|diamond)/i.test(t) ? 'air' : m2[0] || 'water', compare: m2.length > 1 ? m2 : null, kind: /diverging|concave lens/i.test(t) ? 'diverging' : /mirror/i.test(t) ? 'mirror' : 'converging' } } }; },
    {
      defaults: { mode: 'refract', m1: 'air', m2: 'water', th: 40, kind: 'converging', f: 3, u: 7, ho: 1.5, compare: null }, autoplay: false, static: true,
      selects: [{ key: 'mode', label: T('Experiment', 'التجربة'), options: [['refract', T('Refraction at a boundary', 'الانكسار')], ['lens', T('Lens / mirror ray diagram', 'العدسة / المرآة')]], num: false, rebuild: true }, { key: 'm1', label: T('upper medium', 'الوسط العلوي'), options: Object.keys(MEDIA).map(k => [k, `${k} (n = ${MEDIA[k]})`]), num: false, when: S => S.mode === 'refract' }, { key: 'm2', label: T('lower medium', 'الوسط السفلي'), options: Object.keys(MEDIA).map(k => [k, `${k} (n = ${MEDIA[k]})`]), num: false, when: S => S.mode === 'refract' }, { key: 'kind', label: T('optic', 'العنصر'), options: [['converging', T('converging lens', 'عدسة مجمعة')], ['diverging', T('diverging lens', 'عدسة مفرقة')], ['mirror', T('concave mirror', 'مرآة مقعرة')]], num: false, when: S => S.mode === 'lens' }],
      params: [{ key: 'th', label: T('angle of incidence', 'زاوية السقوط'), unit: '°', min: 0, max: 89, step: 0.5, live: true, alias: ['angle', 'incidence'], when: S => S.mode === 'refract' }, { key: 'f', label: T('focal length f', 'البعد البؤري'), unit: 'cm', min: 1, max: 6, step: 0.1, live: true, alias: ['focal length'], when: S => S.mode === 'lens' }, { key: 'u', label: T('object distance', 'بعد الجسم'), unit: 'cm', min: 0.5, max: 11, step: 0.1, live: true, alias: ['object distance'], when: S => S.mode === 'lens' }],
      graph: false, labels: { x: '', y: '' },
      view: S => (S.mode === 'lens' ? { x0: -12, x1: 14, y0: -5, y1: 5 } : { x0: -6, x1: 6, y0: -5, y1: 5 }),
      init() {}, step() {},
      onDown(S, st, x, y) { if (S.mode === 'refract' && y > 0) return { a: 1 }; if (S.mode === 'lens' && Math.abs(x + S.u) < 1 && y > -0.5 && y < S.ho + 0.5) return { o: 1 }; return null; },
      onDrag(S, st, x, y, d) { if (d.a) S.th = Math.max(0, Math.min(89, Math.atan2(Math.abs(x), y) * 180 / Math.PI)); if (d.o) S.u = Math.max(0.5, Math.min(11.5, -x)); L.explainNow(); },
      draw(g, p, S) {
        const c = L.colors();
        if (S.mode === 'refract') {
          const n1 = MEDIA[S.m1], n2 = MEDIA[S.m2]; g.fillStyle = c.dark ? 'rgba(56,189,248,.14)' : 'rgba(14,165,233,.12)'; g.fillRect(0, p.Y(0), p.W, p.H - p.Y(0)); p.path([[p.view.x0, 0], [p.view.x1, 0]], c.muted, { w: 2 }); p.path([[0, -5], [0, 5]], c.muted, { w: 1, dash: [4, 4] }); p.text(p.view.x0 + 0.3, 4.3, `${S.m1} n = ${n1}`, c.ink); p.text(p.view.x0 + 0.3, -4.5, `${S.m2} n = ${n2}`, c.ink);
          const a = S.th * Math.PI / 180, r = 5; p.path([[-r * Math.sin(a), r * Math.cos(a)], [0, 0]], c.dark ? '#fde68a' : '#b45309', { w: 3 }); p.arrow(-r * Math.sin(a) * 0.5, r * Math.cos(a) * 0.5, -r * Math.sin(a) * 0.45, r * Math.cos(a) * 0.45, c.dark ? '#fde68a' : '#b45309');
          const t2 = P.snell(n1, n2, S.th); p.path([[0, 0], [r * Math.sin(a), r * Math.cos(a)]], c.muted, { w: t2 == null ? 3 : 1.2, dash: t2 == null ? null : [5, 4] });
          if (t2 != null) { const b = t2 * Math.PI / 180; p.path([[0, 0], [r * Math.sin(b), -r * Math.cos(b)]], c.pal[0], { w: 3 }); p.text(r * Math.sin(b) * 0.6, -r * Math.cos(b) * 0.6, `${N.fmt(t2, 2)}°`, c.pal[0], { dx: 8 }); }
          (S.compare || []).forEach((m, i) => { if (m === S.m2) return; const t3 = P.snell(n1, MEDIA[m], S.th); if (t3 == null) return; const b = t3 * Math.PI / 180; p.path([[0, 0], [r * Math.sin(b), -r * Math.cos(b)]], c.pal[(i + 2) % 8], { w: 2, dash: [6, 4] }); p.text(r * Math.sin(b), -r * Math.cos(b), `${m} ${N.fmt(t3, 1)}°`, c.pal[(i + 2) % 8], { dy: 14 }); });
          p.text(-r * Math.sin(a) * 0.6, r * Math.cos(a) * 0.6, `${N.fmt(S.th, 1)}°`, c.ink, { dx: -40 });
          if (t2 == null) p.text(0.4, -0.6, T('Total internal reflection', 'انعكاس داخلي كلي'), '#dc2626', { font: '600 14px system-ui' });
        } else {
          const c2 = c, f = S.kind === 'diverging' ? -S.f : S.f, u = S.u, ho = S.ho, mirror = S.kind === 'mirror';
          p.path([[p.view.x0, 0], [p.view.x1, 0]], c2.muted, { w: 1 });
          if (mirror) { const pts = []; for (let y = -3.5; y <= 3.5; y += 0.1) pts.push([y * y / (8 * S.f) * 0 + 0.15 * y * y / 3, y]); p.path(pts, c2.pal[4], { w: 3 }); } else { p.path([[0, -3.8], [0, 3.8]], c2.pal[4], { w: 3 }); if (f > 0) { p.arrow(0, 3, 0, 3.8, c2.pal[4]); p.arrow(0, -3, 0, -3.8, c2.pal[4]); } else { p.arrow(0, 3.8, 0, 3.2, c2.pal[4]); p.arrow(0, -3.8, 0, -3.2, c2.pal[4]); } }
          [-1, 1].forEach(s => { p.dot(s * S.f, 0, c2.ink, 'F', { r: 3 }); p.dot(s * 2 * S.f, 0, c2.muted, '2F', { r: 2.5 }); });
          p.arrow(-u, 0, -u, ho, c2.pal[2], T('object', 'الجسم'));
          const r = P.thinLens(f, u); const xi = mirror ? -r.v : r.v, hi = r.m * ho;
          const ray = (pts, col) => p.path(pts, col, { w: 1.6 });
          const yc = c2.dark ? '#fde68a' : '#b45309';
          if (!mirror) {
            // 1) parallel to the axis, then through (or away from) the far focus; 2) through the centre, undeviated
            const sl1 = -ho / f; ray([[-u, ho], [0, ho], [14, ho + sl1 * 14]], yc); ray([[-u, ho], [14, ho - ho / u * 14]], c2.pal[1]);
            if (r.v < 0 || f < 0) { p.path([[0, ho], [-12, ho - sl1 * 12]], yc, { w: 1, dash: [4, 4] }); p.path([[0, 0], [-12, 12 * ho / u]], c2.pal[1], { w: 1, dash: [4, 4] }); }
          } else { ray([[-u, ho], [0, ho], [-14, ho + ho / S.f * 14]], yc); ray([[-u, ho], [0, 0], [-14, -ho / u * 14]], c2.pal[1]); if (r.v < 0) { p.path([[0, ho], [12, ho - ho / S.f * 12]], yc, { w: 1, dash: [4, 4] }); p.path([[0, 0], [12, 12 * ho / u]], c2.pal[1], { w: 1, dash: [4, 4] }); } }
          if (isFinite(xi) && Math.abs(xi) < 30) { p.arrow(xi, 0, xi, hi, c2.pal[0], r.v > 0 ? T('real image', 'صورة حقيقية') : T('virtual image', 'صورة تقديرية')); }
        }
      },
      readout(S) { if (S.mode === 'refract') { const n1 = MEDIA[S.m1], n2 = MEDIA[S.m2], t2 = P.snell(n1, n2, S.th), crit = n1 > n2 ? Math.asin(n2 / n1) * 180 / Math.PI : null; return [['θ₁', N.fmt(S.th, 2) + '°'], ['θ₂', t2 == null ? T('none (TIR)', 'لا يوجد') : N.fmt(t2, 3) + '°'], [T('critical angle', 'الزاوية الحرجة'), crit ? N.fmt(crit, 3) + '°' : T('none here', 'لا يوجد')]]; } const f = S.kind === 'diverging' ? -S.f : S.f, r = P.thinLens(f, S.u); return [[T('image distance v', 'بعد الصورة'), isFinite(r.v) ? N.fmt(r.v, 4) + ' cm' : '∞'], [T('magnification m', 'التكبير'), isFinite(r.m) ? N.fmt(r.m, 4) : '∞'], [T('image', 'الصورة'), !isFinite(r.v) ? T('at infinity (object at F)', 'في اللانهاية') : (r.v > 0 ? T('real, inverted', 'حقيقية مقلوبة') : T('virtual, upright', 'تقديرية معتدلة')) + `, ${Math.abs(r.m) > 1 ? T('magnified', 'مكبرة') : T('diminished', 'مصغرة')}`]]; },
      intro: S => (S.mode === 'refract' ? T(`Light passing from ${S.m1} (n = ${MEDIA[S.m1]}) into ${S.m2} (n = ${MEDIA[S.m2]}) at ${S.th}°: it bends to ${N.fmt(P.snell(MEDIA[S.m1], MEDIA[S.m2], S.th) || 0, 3)}° (Snell’s law).${S.compare ? ' Dashed: the same ray entering ' + S.compare.join(' and ') + '.' : ''} Drag the incoming ray or change the media; going from a denser medium, try angles beyond the critical angle.`, 'الانكسار.') : T(`A ${S.kind === 'mirror' ? 'concave mirror' : S.kind + ' lens'} with f = ${S.f} cm and the object ${S.u} cm away. Two principal rays locate the image; drag the object to see the image change from real to virtual.`, 'مخطط الأشعة.')),
      explain: S => (S.mode === 'refract' ? `<p class="lab-eq">n₁ sin θ₁ = n₂ sin θ₂</p><p>${T('Entering a medium with higher n, light slows down and bends towards the normal; leaving it, light bends away. Beyond the critical angle no refracted ray exists: all the light reflects (total internal reflection — how optical fibres work).', 'الضوء ينحني نحو العمود عند دخول وسط أكثف.')}</p>` : `<p class="lab-eq">1/f = 1/u + 1/v &nbsp; m = −v/u</p><p>${T('Sign convention: real is positive. A converging lens makes a real, inverted image when the object is beyond F, and a virtual, upright, magnified image (a magnifying glass) when it is inside F. A diverging lens always makes a virtual, upright, smaller image.', 'اصطلاح الإشارات.')}</p>`),
      assume: T('Geometric (ray) optics: thin lens or small mirror, rays close to the axis, a single wavelength (no dispersion). Refractive indices are typical values for visible light.', 'البصريات الهندسية.'),
      command(t, S, st, api) { const m = (t.match(/\b(water|glass|diamond|oil|ice|air)\b/gi) || []).map(x => x.toLowerCase()); if (m.length > 1 && /\b(compare|and|both)\b/i.test(t)) { S.compare = m; S.m2 = m[0]; return { note: T(`Comparing ${m.join(' and ')}.`, 'مقارنة.'), keep: true }; } if (m.length === 1) { S.m2 = m[0]; return { note: `${S.m1} → ${S.m2}.`, keep: true }; } if (/\bdiverging\b/i.test(t)) { S.kind = 'diverging'; return { note: T('Diverging lens.', 'عدسة مفرقة.'), keep: true }; } if (/\bconverging\b/i.test(t)) { S.kind = 'converging'; return { note: T('Converging lens.', 'عدسة مجمعة.'), keep: true }; } if (/\btotal internal reflection|critical angle\b/i.test(t)) { S.m1 = 'glass'; S.m2 = 'air'; S.th = 50; return { note: T('Glass to air at 50° — beyond the 41.8° critical angle.', 'زجاج إلى هواء.'), keep: true }; } return null; },
      state: S => ({ params: Object.assign({}, S), refracted: S.mode === 'refract' ? P.snell(MEDIA[S.m1], MEDIA[S.m2], S.th) : undefined, lens: S.mode === 'lens' ? P.thinLens(S.kind === 'diverging' ? -S.f : S.f, S.u) : undefined })
    });

  /* ======================= ideal gas (2D hard discs) ======================= */
  reg('gas', KIND.heat, T('Gas in a box (kinetic theory)', 'غاز في صندوق'),
    t => (/\b(ideal gas|gas laws?|kinetic theory|pv\s*=\s*nrt|boyle|charles|gas (particles|molecules)|pressure and (volume|temperature)|particle motion|brownian)\b/i.test(t) ? { score: 0.9, params: {} } : null),
    {
      defaults: { N: 120, T: 300, W: 12, r: 0.12 },
      params: [{ key: 'N', label: T('particles N', 'عدد الجسيمات'), unit: '', min: 10, max: 300, step: 10, alias: ['particles', 'number of particles'] }, { key: 'T', label: T('temperature T', 'درجة الحرارة'), unit: 'K', min: 50, max: 1000, step: 10, live: true, alias: ['temperature'], onSet: (S, st) => { const k = Math.sqrt(S.T / measuredT(st)); if (isFinite(k)) st.p.forEach(q => { q.vx *= k; q.vy *= k; }); st.imp = 0; st.t0 = st.t; } }, { key: 'W', label: T('box width (volume)', 'عرض الصندوق'), unit: '', min: 4, max: 16, step: 0.5, live: true, alias: ['volume', 'width'], onSet: (S, st) => { st.p.forEach(q => { q.x = Math.min(q.x, S.W - S.r); }); st.imp = 0; st.t0 = st.t; } }],
      series: [['P', T('pressure: measured vs ideal gas law', 'الضغط'), [1, 2], null, [T('measured', 'مقاس'), 'NkT/A']], ['T', T('temperature from mean kinetic energy (K)', 'الحرارة من الطاقة'), 3, null, ['T']]], columns: ['P_measured', 'P_ideal', 'T_kinetic'], graph: true, h: 1 / 400, every: 40, tWindow: 10,
      view: S => ({ x0: -0.5, x1: 16.5, y0: -0.5, y1: 8.5 }),
      init(S, st) { const rnd = N.rng(12345); st.p = []; const H = 8, sp = Math.sqrt(S.T / 100); for (let i = 0; i < S.N; i++) { const a = rnd() * 2 * Math.PI, v = sp * Math.sqrt(-2 * Math.log(1 - rnd() * 0.999)); st.p.push({ x: S.r + rnd() * (S.W - 2 * S.r), y: S.r + rnd() * (H - 2 * S.r), vx: v * Math.cos(a), vy: v * Math.sin(a) }); } st.imp = 0; st.t0 = 0; st.H = H; st.Pm = 0; },
      step(S, st, h) {
        const H = st.H, r = S.r, ps = st.p; let imp = 0;
        for (const q of ps) { q.x += q.vx * h; q.y += q.vy * h; if (q.x < r) { q.x = 2 * r - q.x; q.vx = -q.vx; imp += 2 * Math.abs(q.vx); } if (q.x > S.W - r) { q.x = 2 * (S.W - r) - q.x; q.vx = -q.vx; imp += 2 * Math.abs(q.vx); } if (q.y < r) { q.y = 2 * r - q.y; q.vy = -q.vy; imp += 2 * Math.abs(q.vy); } if (q.y > H - r) { q.y = 2 * (H - r) - q.y; q.vy = -q.vy; imp += 2 * Math.abs(q.vy); } }
        // particle–particle elastic collisions (equal masses: swap the velocity components along the line of centres)
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const a = ps[i], b = ps[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; if (d2 < 4 * r * r && d2 > 0) { const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rel > 0) { a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny; } } }
        st.imp += imp; const dt = st.t - st.t0; if (dt > 0.5) { st.Pm = st.imp / (2 * (S.W + H)) / dt; }
      },
      sample: (S, st) => [st.Pm || NaN, S.N * measuredT(st) / 100 / (S.W * st.H), measuredT(st)],
      draw(g, p, S, st) { const c = L.colors(); p.path([[0, 0], [S.W, 0], [S.W, st.H], [0, st.H]], c.ink, { close: true, w: 2.5 }); p.path([[S.W, -0.3], [S.W, st.H + 0.3]], c.pal[4], { w: 6 }); const vmax = Math.sqrt(S.T / 100) * 3; st.p.forEach(q => { const v = Math.hypot(q.vx, q.vy), t = Math.min(1, v / vmax); p.g.fillStyle = `hsl(${240 - 240 * t}, 80%, ${c.dark ? 62 : 48}%)`; p.g.beginPath(); p.g.arc(p.X(q.x), p.Y(q.y), Math.max(2, (p.X(S.r) - p.X(0))), 0, 7); p.g.fill(); });
        // speed histogram vs 2D Maxwell–Boltzmann, drawn at the right
        const x0 = S.W + 1, w = 16 - x0 - 0.3; if (w > 1.5) { const kT = measuredT(st) / 100, bins = 12, vm = Math.sqrt(kT) * 3.5, hb = new Array(bins).fill(0); st.p.forEach(q => { const v = Math.hypot(q.vx, q.vy), i = Math.floor(v / vm * bins); if (i < bins) hb[i]++; }); const f = v => v / kT * Math.exp(-v * v / (2 * kT)), dv = vm / bins, expPeak = st.p.length * f(Math.sqrt(kT)) * dv, peak = Math.max(...hb, expPeak, 1); hb.forEach((n, i) => { const bx = x0 + w * i / bins, bh = 6 * n / peak; p.path([[bx, 0.5], [bx + w / bins * 0.9, 0.5], [bx + w / bins * 0.9, 0.5 + bh], [bx, 0.5 + bh]], c.pal[0], { close: true, fill: c.pal[0] + '55', w: 1 }); }); p.path(Array.from({ length: 61 }, (_, k) => { const v = vm * k / 60; return [x0 + w * k / 60, 0.5 + 6 * st.p.length * f(v) * dv / peak]; }), c.pal[1], { w: 2 }); p.text(x0, 7.3, T('speeds vs Maxwell–Boltzmann', 'السرعات'), c.muted); } },
      readout(S, st) { const Tk = measuredT(st), A = S.W * st.H, Pi = S.N * Tk / 100 / A; return [[T('temperature (from mean KE)', 'الحرارة'), N.fmt(Tk, 4) + ' K'], [T('area A (2D volume)', 'المساحة'), N.fmt(A, 3)], [T('pressure measured', 'الضغط المقاس'), N.fmt(st.Pm, 4)], [T('ideal gas NkT/A', 'الغاز المثالي'), N.fmt(Pi, 4)], [T('measured / ideal', 'النسبة'), st.Pm ? N.fmt(st.Pm / Pi, 3) : '…']]; },
      intro: S => T(`${S.N} gas particles bouncing in a box at ${S.T} K. Pressure is measured from the momentum particles transfer to the walls and compared with the ideal gas law PV = NkT. Raise the temperature (particles speed up, pressure rises) or squeeze the box (same speed, more wall hits).`, 'جسيمات غاز في صندوق.'),
      explain: (S, st) => `<p class="lab-eq">PV = NkT &nbsp;(${T('2D: P·A = NkT', 'ثنائي الأبعاد')})</p><p>${T('Temperature measures the average kinetic energy of the particles; pressure is the force per length from countless collisions with the walls. Halve the box at constant temperature and the pressure doubles (Boyle’s law); double the temperature at fixed size and the pressure doubles.', 'الحرارة متوسط الطاقة الحركية.')}</p><p class="lab-sub">${T('Measured pressure is slightly above the ideal value because the particles have size (finite volume), as in a real gas.', 'الضغط المقاس أعلى قليلاً بسبب حجم الجسيمات.')}</p>`,
      assume: T('A simplified 2D model: identical hard discs, perfectly elastic collisions, no attractive forces, simulation units (k = 1 in scaled units, T scaled so 100 K ↔ kT = 1). Heating rescales all speeds (a thermostat), rather than modelling heat flow through the walls.', 'نموذج ثنائي الأبعاد مبسط.'),
      command(t, S, st) { if (/\b(heat|hotter|raise the temperature|increase (the )?temperature)\b/i.test(t)) { const k = Math.sqrt(2); S.T = Math.min(1000, S.T * 2); st.p.forEach(q => { q.vx *= k; q.vy *= k; }); st.imp = 0; st.t0 = st.t; return { note: T(`Temperature doubled to ${S.T} K: speeds rise by √2, pressure doubles.`, 'تضاعفت الحرارة.'), keep: true }; } if (/\b(cool|colder|lower the temperature)\b/i.test(t)) { S.T = Math.max(50, S.T / 2); st.p.forEach(q => { q.vx /= Math.SQRT2; q.vy /= Math.SQRT2; }); st.imp = 0; st.t0 = st.t; return { note: `T = ${S.T} K.`, keep: true }; } if (/\b(compress|squeeze|halve the volume|smaller box)\b/i.test(t)) { S.W = Math.max(4, S.W / 2); st.p.forEach(q => { q.x = Math.min(q.x, S.W - S.r); }); st.imp = 0; st.t0 = st.t; return { note: T('Volume halved: pressure about doubles.', 'نصف الحجم.'), keep: true }; } return null; },
      state: (S, st) => ({ params: Object.assign({}, S), T: measuredT(st), Pmeasured: st.Pm, Pideal: S.N * measuredT(st) / 100 / (S.W * st.H) })
    });
  function measuredT(st) { if (!st.p || !st.p.length) return 0; const ke = st.p.reduce((s, q) => s + 0.5 * (q.vx * q.vx + q.vy * q.vy), 0) / st.p.length; return ke * 100; }

  /* ======================= orbits (Kepler) ======================= */
  const GM = 4 * Math.PI * Math.PI; // AU³/yr² for one solar mass
  const PLANETS = [['Mercury', 0.387, 0.206, '#a8a29e'], ['Venus', 0.723, 0.007, '#fbbf24'], ['Earth', 1, 0.017, '#3b82f6'], ['Mars', 1.524, 0.093, '#ef4444']];
  reg('orbit', KIND.space, T('Orbits and Kepler’s laws', 'المدارات وقوانين كبلر'),
    t => (/\b(orbits?|orbital|kepler'?s?|planet(ary)? (motion|orbits?)|planetary|satellites?|escape velocity|solar system|gravitation(al)?|elliptical orbits?)\b/i.test(t) ? { score: /solar system/i.test(t) && !/\b(orbits?|kepler|gravit\w*|simulat\w*|escape|elliptic)/i.test(t) ? 0.8 : 0.9, params: { set: { sys: /solar system|planets\b/i.test(t) } } } : null),
    {
      defaults: { M: 1, r0: 1, vf: 1, sys: false, trail: true }, h: 1 / 4000, every: 40, tWindow: 3,
      params: [{ key: 'M', label: T('star mass', 'كتلة النجم'), unit: 'M☉', min: 0.2, max: 3, step: 0.05, alias: ['mass', 'star mass'] }, { key: 'r0', label: T('start distance', 'المسافة الابتدائية'), unit: 'AU', min: 0.3, max: 3, step: 0.05, alias: ['distance', 'radius'] }, { key: 'vf', label: T('start speed (× circular speed)', 'السرعة الابتدائية'), unit: '', min: 0.2, max: 1.6, step: 0.01, alias: ['speed', 'velocity'] }],
      toggles: [{ key: 'sys', label: T('Inner solar system (real orbits)', 'المجموعة الشمسية الداخلية') }],
      series: [['r', T('distance from the star (AU)', 'المسافة'), 1, null, ['r']], ['E', T('energy check: E / E₀', 'تحقق الطاقة'), 2, null, ['E/E₀']], ['v', T('speed (AU/yr)', 'السرعة'), 3, null, ['v']]], columns: ['r', 'E_ratio', 'v'], graph: true, labels: { x: 'x (AU)', y: 'y (AU)' },
      view: S => { const R = S.sys ? 1.8 : Math.max(1.5, S.r0 * (S.vf >= 1.4 ? 3 : S.vf > 1 ? 1 / Math.max(0.05, 2 - S.vf * S.vf) * 1.2 : 1.25)); return { x0: -R, x1: R, y0: -R, y1: R }; },
      init(S, st) { const gm = GM * S.M; const v = Math.sqrt(gm / S.r0) * S.vf; st.b = S.sys ? PLANETS.map(([n, a, e, col]) => { const rp = a * (1 - e), vp = Math.sqrt(GM * (1 + e) / (a * (1 - e))); return { n, a, e, col, x: rp, y: 0, vx: 0, vy: vp, gm: GM, trail: [], peri: [], E0: 0.5 * vp * vp - GM / rp }; }) : [{ n: T('planet', 'كوكب'), x: S.r0, y: 0, vx: 0, vy: v, gm, trail: [], peri: [], col: L.colors().pal[0], E0: 0.5 * v * v - gm / S.r0 }]; st.b.forEach(b => { b.ax = -b.gm * b.x / Math.hypot(b.x, b.y) ** 3; b.ay = -b.gm * b.y / Math.hypot(b.x, b.y) ** 3; b.prevAng = 0; }); },
      step(S, st, h) { st.b.forEach(b => { b.vx += 0.5 * h * b.ax; b.vy += 0.5 * h * b.ay; b.x += h * b.vx; b.y += h * b.vy; const r = Math.hypot(b.x, b.y); if (r < 0.01) { st.done = true; return; } b.ax = -b.gm * b.x / r ** 3; b.ay = -b.gm * b.y / r ** 3; b.vx += 0.5 * h * b.ax; b.vy += 0.5 * h * b.ay; const ang = Math.atan2(b.y, b.x); if (b.prevAng < 0 && ang >= 0 && b.vy > 0) b.peri.push(st.t); b.prevAng = ang; if (st.frame % 20 === 0) { b.trail.push([b.x, b.y]); if (b.trail.length > 1500) b.trail.shift(); } }); },
      sample: (S, st) => { const b = st.b[S.sys ? 2 : 0], r = Math.hypot(b.x, b.y), v = Math.hypot(b.vx, b.vy); return [r, (0.5 * v * v - b.gm / r) / b.E0, v]; },
      draw(g, p, S, st) { const c = L.colors(); p.dot(0, 0, '#f59e0b', S.sys ? T('Sun', 'الشمس') : T('star', 'النجم'), { r: 12 }); st.b.forEach(b => { p.path(b.trail.concat([[b.x, b.y]]), b.col, { w: 1.5 }); p.dot(b.x, b.y, b.col, b.n, { r: 6, ring: true }); if (!S.sys) p.arrow(b.x, b.y, b.x + b.vx * 0.08, b.y + b.vy * 0.08, c.pal[2], 'v', { w: 1.6 }); }); p.text(p.view.x0, p.view.y0, T('Sizes not to scale; distances to scale.', 'الأحجام ليست بمقياس.'), c.muted, { dx: 8, dy: -8 }); },
      readout(S, st) { const b = st.b[S.sys ? 2 : 0], r = Math.hypot(b.x, b.y), v = Math.hypot(b.vx, b.vy), E = 0.5 * v * v - b.gm / r, a = -b.gm / (2 * E), Lm = b.x * b.vy - b.y * b.vx, e = Math.sqrt(Math.max(0, 1 + 2 * E * Lm * Lm / (b.gm * b.gm))), Tk = E < 0 ? 2 * Math.PI * Math.sqrt(a ** 3 / b.gm) : Infinity, Tm = b.peri.length > 1 ? (b.peri[b.peri.length - 1] - b.peri[0]) / (b.peri.length - 1) : NaN; return [[T('time', 'الزمن'), N.fmt(st.t, 3) + ' yr'], ['r', N.fmt(r, 4) + ' AU'], ['v', N.fmt(v, 4) + ' AU/yr (' + N.fmt(v * 4.74047, 4) + ' km/s)'], [T('eccentricity e', 'الاختلاف المركزي'), E < 0 ? N.fmt(e, 4) : T('unbound (escapes)', 'غير مرتبط')], [T('period: Kepler 2π√(a³/GM)', 'الدور: كبلر'), isFinite(Tk) ? N.fmt(Tk, 4) + ' yr' : '—'], [T('period: measured', 'الدور المقاس'), isFinite(Tm) ? N.fmt(Tm, 4) + ' yr' : '…'], [T('energy drift', 'انجراف الطاقة'), N.fmt(Math.abs(E / b.E0 - 1), 3)]]; },
      intro: S => (S.sys ? T('Mercury, Venus, Earth and Mars on their real orbits (semi-major axes and eccentricities), each orbiting the Sun under gravity alone. Inner planets move faster and have shorter years — Kepler’s third law, T² ∝ a³.', 'الكواكب الداخلية.') : T(`A planet released ${S.r0} AU from a star of ${S.M} solar masses at ${S.vf}× the circular-orbit speed. ${S.vf === 1 ? 'Exactly circular speed gives a circle.' : S.vf * S.vf >= 2 ? 'At or above √2 × circular speed it escapes.' : 'Other speeds give ellipses with the star at one focus.'} The panel checks the period against Kepler’s third law and that energy stays constant.`, 'كوكب يدور حول نجم.')),
      explain: S => `<p class="lab-eq">F = GMm/r² &nbsp; T² = 4π²a³/(GM)</p><ul><li>${T('1st law: orbits are ellipses with the star at one focus.', 'القانون الأول.')}</li><li>${T('2nd law: a line from the star sweeps equal areas in equal times — the planet speeds up near the star.', 'القانون الثاني.')}</li><li>${T('3rd law: T² ∝ a³ (check the two period readouts).', 'القانون الثالث.')}</li></ul><p>${T('Escape speed is √2 times the circular speed at the same distance; set the speed slider to 1.42 to see the orbit open up.', 'سرعة الإفلات.')}</p>`,
      assume: T('Each planet feels only the star’s gravity (no planet–planet pulls, no relativity); the star is fixed. Integrated with velocity Verlet (a symplectic method), so energy is conserved to within the drift shown. Units: AU, years, solar masses. Planet and Sun sizes are not to scale.', 'الكوكب يتأثر بجاذبية النجم فقط.'),
      command(t, S) { if (/\b(escape|faster)\b/i.test(t)) { S.vf = /escape/i.test(t) ? 1.42 : Math.min(1.6, S.vf + 0.15); return { note: `v = ${S.vf} × v_circular.` }; } if (/\b(slower)\b/i.test(t)) { S.vf = Math.max(0.2, S.vf - 0.15); return { note: `v = ${S.vf} × v_circular.` }; } if (/\bcircular\b/i.test(t)) { S.vf = 1; return { note: T('Circular orbit.', 'مدار دائري.') }; } if (/\b(heavier|more massive) star\b/i.test(t)) { S.M *= 2; return { note: `M = ${S.M} M☉.` }; } if (/\bsolar system|planets\b/i.test(t)) { S.sys = true; return { note: T('Inner solar system.', 'المجموعة الشمسية.') }; } return null; },
      state: (S, st) => ({ params: Object.assign({}, S), bodies: st.b.map(b => { const r = Math.hypot(b.x, b.y), v = Math.hypot(b.vx, b.vy), E = 0.5 * v * v - b.gm / r; return { name: b.n, r, v, energyRatio: E / b.E0, keplerPeriod: E < 0 ? 2 * Math.PI * Math.sqrt((-b.gm / (2 * E)) ** 3 / b.gm) : null, measuredPeriod: b.peri.length > 1 ? (b.peri[b.peri.length - 1] - b.peri[0]) / (b.peri.length - 1) : null }; }) })
    });

  /* ======================= radioactive decay ======================= */
  reg('decay', KIND.modern, T('Radioactive decay', 'التحلل الإشعاعي'),
    t => (/\b(radioactiv\w*|half[- ]li(fe|ves)|nuclear decay|decay (constant|curve)|carbon[- ]14|isotopes?)\b/i.test(t) && !/\b(drug|dose|pharmaco\w*|plasma|elimination|medicine|medication)\b/i.test(t) ? { score: 0.92, params: { set: { half: num1(t, /half[- ]life of\s*(\d+(?:\.\d+)?)/i, 5) } } } : null),
    {
      defaults: { N0: 900, half: 5, seed: 7 }, h: 1 / 50, every: 1, tWindow: 25,
      params: [{ key: 'N0', label: T('starting nuclei N₀', 'عدد الأنوية'), unit: '', min: 100, max: 2500, step: 100, alias: ['nuclei', 'atoms'] }, { key: 'half', label: T('half-life T½', 'عمر النصف'), unit: 's', min: 0.5, max: 20, step: 0.5, alias: ['half-life', 'half life'] }],
      series: [['N', T('undecayed nuclei N', 'الأنوية غير المتحللة'), 1, (S, t) => S.N0 * Math.pow(2, -t / S.half), [T('simulated', 'محاكاة')]], ['A', T('decays per second (activity)', 'النشاط'), 2, (S, t) => S.N0 * Math.LN2 / S.half * Math.pow(2, -t / S.half), [T('simulated', 'محاكاة')]]], columns: ['N', 'activity'], graph: true, equal: true, grid: false, pan: false, labels: { x: '', y: '' },
      view: () => ({ x0: -1, x1: 51, y0: -1, y1: 51 }),
      init(S, st) { st.rnd = N.rng(S.seed * 7919 + S.N0); st.alive = new Uint8Array(S.N0).fill(1); st.n = S.N0; st.flash = new Float32Array(S.N0); st.rate = 0; st.win = []; },
      step(S, st, h) { const p = 1 - Math.pow(2, -h / S.half); let d = 0; for (let i = 0; i < S.N0; i++) if (st.alive[i] && st.rnd() < p) { st.alive[i] = 0; st.flash[i] = 1; d++; } st.n -= d; st.win.push(d); if (st.win.length > 50) st.win.shift(); st.rate = st.win.reduce((a, b) => a + b, 0) / (st.win.length * h); for (let i = 0; i < S.N0; i++) if (st.flash[i] > 0) st.flash[i] = Math.max(0, st.flash[i] - h * 2); if (st.n === 0) st.done = true; },
      sample: (S, st) => [st.n, st.rate],
      draw(g, p, S, st) { const c = L.colors(), n = S.N0, side = Math.ceil(Math.sqrt(n)), cell = 50 / side; for (let i = 0; i < n; i++) { const x = (i % side) * cell + cell / 2, y = 50 - Math.floor(i / side) * cell - cell / 2; const r = Math.max(1.5, (p.X(cell) - p.X(0)) * 0.36); p.g.fillStyle = st.alive[i] ? (c.dark ? '#4ade80' : '#16a34a') : st.flash[i] > 0 ? `rgba(250,204,21,${0.4 + st.flash[i] * 0.6})` : (c.dark ? 'rgba(148,163,184,.25)' : 'rgba(100,116,139,.25)'); p.g.beginPath(); p.g.arc(p.X(x), p.Y(y), r, 0, 7); p.g.fill(); } },
      readout(S, st) { const ex = S.N0 * Math.pow(2, -st.t / S.half); return [['t', N.fmt(st.t, 3) + ' s'], [T('undecayed (simulated)', 'غير متحلل (محاكاة)'), st.n], [T('expected N₀·2^(−t/T½)', 'المتوقع'), N.fmt(ex, 5)], [T('decay constant λ = ln2/T½', 'ثابت التحلل'), N.fmt(Math.LN2 / S.half, 4) + ' s⁻¹']]; },
      intro: S => T(`${S.N0} unstable nuclei with a half-life of ${S.half} s. Each nucleus decays at random — no one can say which one goes next — but the number left halves every ${S.half} s on average. Green: undecayed; flash: just decayed. The graph compares the simulated count with N₀·2^(−t/T½).`, 'أنوية غير مستقرة.'),
      explain: S => `<p class="lab-eq">N(t) = N₀ e^(−λt) = N₀ 2^(−t/T½) &nbsp; A = λN</p><p>${T('Decay is random for each nucleus but very predictable for large numbers. With fewer nuclei the simulated curve wobbles more around the expected curve — run again to see a different random outcome.', 'التحلل عشوائي لكل نواة.')}</p>`,
      assume: T('Every nucleus has the same constant probability of decaying per unit time, independent of the others and of its age; the daughter nucleus is stable. Values are simulated with a seeded random number generator.', 'احتمال تحلل ثابت.'),
      extraControls(pg, S, st, api) { pg.appendChild(ui.buttons([[T('New random run', 'تشغيل عشوائي جديد'), () => { S.seed++; api.init(); st.done = false; api.redraw(); }]])); },
      command(t, S) { let m; if ((m = t.match(/half[- ]life\s*(?:to|=|of)?\s*(\d+(?:\.\d+)?)/i))) { S.half = +m[1]; return { note: `T½ = ${S.half} s.` }; } if (/\b(more|bigger) (sample|nuclei|atoms)\b/i.test(t)) { S.N0 = Math.min(2500, S.N0 * 2); return { note: `N₀ = ${S.N0}.` }; } if (/\b(run|again)\b/i.test(t)) { S.seed++; return { note: T('New random run.', 'تشغيل جديد.') }; } return null; },
      state: (S, st) => ({ params: { N0: S.N0, half: S.half }, n: st.n, expected: S.N0 * Math.pow(2, -st.t / S.half) })
    });
})();
