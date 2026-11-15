/* ERLY Noor Lab — syllabus engine builder (v18).

   The syllabus files (syl-math.js, syl-physics.js, syl-chem.js, syl-life.js, syl-applied.js) describe one model per
   syllabus chapter/topic as a SPEC: its parameters, what to draw, what to compute, and how to explain it from the live
   numbers. This file turns a spec into a full Noor Lab engine on the shared harness, so every model gets the same
   controls, live readouts, follow-up commands ("set k to 3", "double the mass", "make it a cylinder"), exact state
   for testing, and the inline chat card.

   Specs are code written and reviewed here, never generated at run time. Each spec also records where it sits in
   the syllabus (exam · unit), which the coverage registry reads.

   spec = { id, kind, title, unit, probe, rx, not, score, p: [[key, label, unit, min, max, step, default, rx?]],
            sel: [[key, label, [[value, label, rx?]...], default]], tog: [[key, label, default, rx?]],
            view(S) | view, labels, equal, auto (re-fit the view when parameters change),
            draw(p, S, c, H, st), curves(S) → [[f, label, opts]], ro(S) → [[label, value]], st(S) → numbers,
            intro(S), ex(S) (HTML), assume, parse(t) → extra set, cmd(t, S, api) → note,
            ode: { y0(S), f(t, y, S), scale, T, names, plot: [[label, i]...], tlabel }, three: build(S, H) } */
(function () {
  'use strict';
  const L = window.ERLY_LAB; if (!L || !L.harness) return;
  const T = L.T, N = L.num;
  const Y = L.syl = L.syl || { list: [] };
  const DECL = L.__decl = L.__decl || {};
  const f3 = Y.f3 = v => (v == null || !isFinite(v) ? String(v === Infinity ? '∞' : v) : Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0) ? (+v).toExponential(3).replace('e', '×10^').replace('+', '') : (+(+v).toPrecision(4)).toString());
  Y.num = (t, re, d) => { const m = String(t).match(re); return m ? +m[1] : d; };
  const lab = (p, x, y, s, col, o) => p.text(x, y, s, col, Object.assign({ font: '600 12px ui-sans-serif, system-ui' }, o || {}));
  const H = { lab, f3, rk4: N.rk4,
    // a horizontal/vertical bar from (x, 0) of height v (charts)
    bar: (p, x, w, v, col) => p.path([[x - w / 2, 0], [x - w / 2, v], [x + w / 2, v], [x + w / 2, 0]], col, { w: 1, close: true, fill: col }),
    poly: (p, pts, col, o) => p.path(pts.concat([pts[0]]), col, Object.assign({ w: 2 }, o || {})),
    circle: (p, cx, cy, r, col, o) => p.path(Array.from({ length: 97 }, (_, i) => [cx + r * Math.cos(i * Math.PI / 48), cy + r * Math.sin(i * Math.PI / 48)]), col, Object.assign({ w: 2 }, o || {})),
    curve: (p, f, a, b, col, o, n) => p.path(Array.from({ length: (n || 300) + 1 }, (_, i) => { const x = a + (b - a) * i / (n || 300); return [x, f(x)]; }), col, o || {}),
    param: (p, fx, fy, a, b, col, o, n) => p.path(Array.from({ length: (n || 400) + 1 }, (_, i) => { const t = a + (b - a) * i / (n || 400); return [fx(t), fy(t)]; }), col, o || {}),
    shade: (p, f, g, a, b, col, n) => { const k = n || 160, up = [], dn = []; for (let i = 0; i <= k; i++) { const x = a + (b - a) * i / k; up.push([x, f(x)]); dn.push([x, g ? g(x) : 0]); } p.path(up.concat(dn.reverse()), col, { w: 0.5, close: true, fill: col }); }
  };
  Y.H = H;
  const words = s => String(s).toLowerCase().replace(/[^a-z0-9α-ωₐ-ₜ₀-₉ ]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  function genericCommand(t, S, api, spec) {
    const s = String(t).toLowerCase(), P = spec.p || [];
    const find = phrase => { const ws = words(phrase); let best = null, sc = 0; P.forEach(q => { const lw = words(q[1]).concat([q[0].toLowerCase()]); const hit = ws.filter(w => lw.includes(w)).length; if (hit > sc) { sc = hit; best = q; } }); return best; };
    let m = s.match(/\b(?:set|make|change|put|use)\s+(?:the\s+)?(.+?)\s+(?:to|=|as|equal to)\s*(-?\d+(?:\.\d+)?)/) || s.match(/\b(.+?)\s*=\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) { const q = find(m[1]); if (q) { const v = Math.max(q[3], Math.min(q[4], +m[2])); api.set(q[0], v); return { note: `${q[1]} = ${f3(v)}${q[2] ? ' ' + q[2] : ''}${v !== +m[2] ? T(' (the allowed range is ', ' (المدى ') + q[3] + '–' + q[4] + ')' : ''}`, keep: true }; } }
    m = s.match(/\b(double|halve|triple|increase|raise|decrease|reduce|lower)\s+(?:the\s+)?(.+?)(?:\s+by\s+(\d+(?:\.\d+)?))?$/);
    if (m) { const q = find(m[2]); if (q) { const k = m[1], v0 = S[q[0]], by = m[3] != null ? +m[3] : null; let v = k === 'double' ? v0 * 2 : k === 'halve' ? v0 / 2 : k === 'triple' ? v0 * 3 : /increase|raise/.test(k) ? (by != null ? v0 + by : v0 + (q[4] - q[3]) / 10) : (by != null ? v0 - by : v0 - (q[4] - q[3]) / 10); v = Math.max(q[3], Math.min(q[4], v)); api.set(q[0], v); return { note: `${q[1]} = ${f3(v)}${q[2] ? ' ' + q[2] : ''}`, keep: true }; } }
    for (const sl of spec.sel || []) for (const o of sl[2]) if (o[2] && o[2].test(s) && /\b(show|make|switch|change|use|try|now|what about|instead|set)\b/.test(s)) { api.set(sl[0], o[0]); return { note: `${sl[1]}: ${o[1]}`, keep: true }; }
    for (const tg of spec.tog || []) if (tg[3] && tg[3].test(s)) { const on = !/\b(hide|remove|turn off|without|no)\b/.test(s); api.set(tg[0], on); return { note: `${tg[1]}: ${on ? T('on', 'تشغيل') : T('off', 'إيقاف')}`, keep: true }; }
    return null;
  }
  function parseFrom(spec, t) {
    const set = {};
    (spec.p || []).forEach(q => { if (q[7]) { const m = String(t).match(q[7]); if (m) { const v = +m[1]; if (isFinite(v)) set[q[0]] = Math.max(q[3], Math.min(q[4], v)); } } });
    (spec.sel || []).forEach(sl => { const o = sl[2].find(x => x[2] && x[2].test(t)); if (o) set[sl[0]] = o[0]; });
    (spec.tog || []).forEach(tg => { if (tg[3] && tg[3].test(t)) set[tg[0]] = true; });
    return Object.assign(set, spec.parse ? spec.parse(t) || {} : {});
  }
  function defaults(spec) { const d = {}; (spec.p || []).forEach(q => { d[q[0]] = q[6]; }); (spec.sel || []).forEach(s => { d[s[0]] = s[3]; }); (spec.tog || []).forEach(s => { d[s[0]] = !!s[2]; }); return Object.assign(d, spec.extra || {}); }
  // integrate an ODE spec from 0 to T (used for the exact state, independent of the animation)
  Y.integrate = (ode, S, T1, h) => { let y = ode.y0(S).slice(), t = 0; const dt = h || ode.h || T1 / 4000; while (t < T1 - 1e-12) { const s = Math.min(dt, T1 - t); y = N.rk4((tt, yy) => ode.f(tt, yy, S), t, y, s); t += s; } return y; };

  function build2(spec) {
    const ode = spec.ode, view = typeof spec.view === 'function' ? spec.view : () => spec.view;
    let lastKey = '';
    return {
      defaults: defaults(spec), static: !ode && !spec.anim, autoplay: !!(ode || spec.anim), graph: !!ode && spec.graph !== false, equal: !!spec.equal, grid: spec.auto ? false : spec.grid,
      labels: spec.labels || { x: 'x', y: 'y' }, h: ode ? 1 / 60 : 1 / 60, note: spec.note,
      params: (spec.p || []).map(q => ({ key: q[0], label: q[1], unit: q[2], min: q[3], max: q[4], step: q[5], live: !ode })),
      selects: (spec.sel || []).map(s => ({ key: s[0], label: s[1], num: typeof s[3] === 'number', options: s[2].map(o => [o[0], o[1]]) })),
      toggles: (spec.tog || []).map(s => ({ key: s[0], label: s[1], live: !ode })),
      view: S => Object.assign({}, view(S)),
      init(S, st, api) { if (spec.init) spec.init(S, st, api); if (ode) { st.y = ode.y0(S).slice(); st.tt = 0; st.trace = [[0].concat(st.y)]; } },
      step(S, st, h) {
        if (spec.anim) spec.anim(S, st, h);
        if (!ode) return; const T1 = typeof ode.T === 'function' ? ode.T(S) : ode.T, dt = h * (T1 / (ode.secs || 8));
        if (st.tt >= T1) { st.done = true; return; }
        const n = 4; for (let i = 0; i < n; i++) st.y = N.rk4((tt, yy) => ode.f(tt, yy, S), st.tt + dt * i / n, st.y, dt / n);
        st.tt += dt; if (st.frame % 2 === 0) st.trace.push([st.tt].concat(st.y));
      },
      graphDraw: ode ? (g, p, S, st) => {
        const c = L.colors(), Tr = st.trace || [], T1 = typeof ode.T === 'function' ? ode.T(S) : ode.T, idx = (ode.plot || ode.names.map((nm, i) => [nm, i]));
        let lo = Infinity, hi = -Infinity; Tr.forEach(r => idx.forEach(([, i]) => { const v = r[i + 1]; if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
        if (ode.yr) { lo = ode.yr(S)[0]; hi = ode.yr(S)[1]; } if (!isFinite(lo)) { lo = 0; hi = 1; } if (hi - lo < 1e-12) { hi += 1; lo -= 1; }
        const pad = (hi - lo) * 0.08; p.view = { x0: 0, x1: T1, y0: lo - pad, y1: hi + pad }; p.labels = { x: ode.tlabel || 't', y: '' }; p.grid();
        idx.forEach(([nm, i], k) => { p.path(Tr.map(r => [r[0], r[i + 1]]), c.pal[k % 8], { w: 2.2 }); p.text(p.view.x0 + (p.view.x1 - p.view.x0) * 0.02, p.view.y1 - (p.view.y1 - p.view.y0) * (0.07 + k * 0.07), nm, c.pal[k % 8], { font: '600 11px ui-sans-serif, system-ui' }); });
      } : null,
      draw(g, p, S, st, api) {
        const c = L.colors();
        if (spec.auto) { const key = JSON.stringify(S); if (key !== lastKey) { lastKey = key; p.view = Object.assign({}, view(S)); p.fit(); } p.grid(); }
        if (spec.curves) spec.curves(S, st).forEach((cv, i) => { const col = (cv[2] && cv[2].col) || c.pal[i % 8]; p.fn(cv[0], col, Object.assign({ w: 2.4 }, cv[2] || {})); if (cv[1]) lab(p, p.view.x0 + (p.view.x1 - p.view.x0) * 0.02, p.view.y1 - (p.view.y1 - p.view.y0) * (0.06 + i * 0.065), cv[1], col); });
        if (spec.draw) spec.draw(p, S, c, H, st, api);
      },
      readout: (S, st) => (spec.ro ? spec.ro(S, st) : []),
      intro: (S, st) => (spec.intro ? spec.intro(S, st) : spec.title),
      explain: (S, st) => (spec.ex ? spec.ex(S, st) : ''),
      assume: spec.assume,
      state: (S, st) => Object.assign({ params: Object.assign({}, S) }, spec.st ? spec.st(S, st) : {}, ode ? { final: Y.integrate(ode, S, typeof ode.T === 'function' ? ode.T(S) : ode.T), simT: st.tt } : {}),
      command(t, S, st, api) { const r = spec.cmd ? spec.cmd(t, S, api) : null; if (r) { api.redraw(); return typeof r === 'string' ? { note: r, keep: true } : r; } return genericCommand(t, S, api, spec); }
    };
  }
  function build3(spec) {
    return {
      defaults: Object.assign(defaults(spec), { spin: false }), camera: spec.camera, alt: S => spec.title,
      params: (spec.p || []).map(q => ({ key: q[0], label: q[1], unit: q[2], min: q[3], max: q[4], step: q[5] })),
      selects: (spec.sel || []).map(s => ({ key: s[0], label: s[1], options: s[2].map(o => [o[0], o[1]]) })),
      toggles: (spec.tog || []).map(s => ({ key: s[0], label: s[1] })),
      panel: spec.panel ? (g, p, S, H3) => spec.panel(p, S, L.colors(), H, H3) : null, panelLabels: spec.labels,
      build: (S, H3) => spec.three(S, H3, L.colors(), H),
      readout: S => (spec.ro ? spec.ro(S) : []), intro: S => (spec.intro ? spec.intro(S) : spec.title), explain: S => (spec.ex ? spec.ex(S) : ''), assume: spec.assume,
      state: S => Object.assign({ params: Object.assign({}, S) }, spec.st ? spec.st(S) : {}),
      command(t, S, api) { const r = spec.cmd ? spec.cmd(t, S, api) : null; if (r) return typeof r === 'string' ? { note: r } : r; return genericCommand(t, S, api, spec); }
    };
  }
  Y.def = function (spec) {
    DECL[spec.id] = Object.fromEntries((spec.p || []).map(q => [q[0], { min: q[3], max: q[4] }]));
    Y.list.push({ id: spec.id, title: spec.title, kind: spec.kind, unit: spec.unit, probe: spec.probe, probes: spec.probes || [] });
    L.register({ id: spec.id, family: 'syllabus', kind: spec.kind, title: spec.title,
      match: t => (spec.rx.test(t) && !(spec.not && spec.not.test(t)) ? { score: typeof spec.score === 'function' ? spec.score(t) : spec.score || 0.93, params: { set: parseFrom(spec, t) } } : null),
      async mount(ctx) { ctx.id = spec.id; if (spec.three) { if (!L.harness3d) throw new Error('3D harness missing'); return L.harness3d(ctx, build3(spec)); } return L.harness(ctx, build2(spec)); } });
  };
  // a readout row helper and an explanation wrapper used by the subject files
  Y.p = (s) => `<p>${s}</p>`;
  Y.T = T;
})();
