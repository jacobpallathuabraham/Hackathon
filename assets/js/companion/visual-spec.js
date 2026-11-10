/* ERLY — Dynamic visual learning engine (v8).

   A student question becomes a structured VISUAL SPEC (JSON), the spec is
   strictly VALIDATED, and a library of tested, safe PRIMITIVES renders it.
   No AI-generated code is ever executed: expressions are compiled by a small
   arithmetic compiler that only knows numbers, declared variable names and
   maths functions; everything else is rejected.

   Where specs come from
   - plan(question): a local planner that recognises university topic
     families (functions and calculus, distributions, supply and demand,
     growth/finance, multivariable surfaces and gradient descent, electric /
     vector fields, wave interference and superposition, neural networks,
     sorting / searching / recursion, bridge trusses, beams, linear
     transformations, plus curated process diagrams) and extracts specifics
     from the question itself (e.g. the function to plot, the array to sort,
     the matrix to apply).
   - aiPlan(question): when an AI brain is connected, the model is asked for
     a spec for THIS question (or {"visual": false}); its JSON is validated
     like any other input and falls back to the local planner if invalid.

   Primitives (each with play/pause, speed, steps, sliders where useful):
     plot2d · surface3d · field2d · waves · network · algorithm · diagram ·
     truss3d · beam · matrix2d · scene (a hand-built scene from visuals.js)

   Computation is real: roots/intersections by bisection, derivatives and
   integrals numerically, a truss solved by the method of joints (Gaussian
   elimination), beam shear/moment/deflection by statics and integration, a
   neural network trained by back-propagation in the browser. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const T = (en, ar) => (window.I18N && I18N.lang === 'ar' && ar ? ar : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n || 160);
  const fmt = v => (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(2) : (+v.toFixed(3)).toString());

  /* ======================= safe expression compiler ======================= */
  const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10, log2: Math.log2, floor: Math.floor, ceil: Math.ceil, sign: Math.sign, min: Math.min, max: Math.max, pow: Math.pow };
  const CONST = { pi: Math.PI, e: Math.E };
  function tokenize(src) {
    const s = String(src).replace(/π/g, 'pi').replace(/[×·]/g, '*').replace(/−/g, '-').replace(/²/g, '^2').replace(/³/g, '^3');
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      const n = s.slice(i).match(/^(\d+\.?\d*(e[+-]?\d+)?|\.\d+)/i); if (n) { out.push({ t: 'n', v: +n[0] }); i += n[0].length; continue; }
      const id = s.slice(i).match(/^[a-z_][a-z0-9_]*/i); if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
      if ('+-*/^(),'.includes(c)) { out.push({ t: c }); i++; continue; }
      throw new Error('Unexpected “' + c + '”');
    }
    // implicit multiplication: 2x, 3(x+1), (x+1)(x-1), x y
    const r = [];
    out.forEach((tk, k) => {
      const p = r[r.length - 1];
      const pEnd = p && (p.t === 'n' || p.t === ')' || (p.t === 'id' && !FN[p.v]));
      const cStart = tk.t === 'n' || tk.t === '(' || tk.t === 'id';
      if (pEnd && cStart && !(p.t === 'id' && tk.t === '(' && FN[p.v])) r.push({ t: '*' });
      r.push(tk);
    });
    return r;
  }
  // compile(expr, ['x','a',...]) → f(env) — throws for anything outside the grammar
  function compile(src, names) {
    if (String(src).length > 160) throw new Error('Expression too long');
    const tk = tokenize(src); let i = 0;
    const allowed = new Set(names || ['x']);
    const peek = () => tk[i], eat = t => (tk[i] && tk[i].t === t ? (i++, true) : false);
    function primary() {
      const c = tk[i]; if (!c) throw new Error('Incomplete expression');
      if (eat('(')) { const v = expr(); if (!eat(')')) throw new Error('Missing )'); return v; }
      if (eat('-')) { const v = power(); return e => -v(e); }
      if (eat('+')) return power();
      if (c.t === 'n') { i++; const n = c.v; return () => n; }
      if (c.t === 'id') {
        i++;
        if (FN[c.v]) {
          if (!eat('(')) { const a = power(); const f = FN[c.v]; return e => f(a(e)); }
          const args = [expr()]; while (eat(',')) args.push(expr()); if (!eat(')')) throw new Error('Missing )');
          const f = FN[c.v]; return e => f(...args.map(a => a(e)));
        }
        if (allowed.has(c.v)) { const k = c.v; return e => e[k]; }
        if (CONST[c.v] !== undefined) { const v = CONST[c.v]; return () => v; }
        throw new Error('Unknown name “' + c.v + '”');
      }
      throw new Error('Unexpected symbol');
    }
    function power() { const b = primary(); if (eat('^')) { const x = unary(); return e => Math.pow(b(e), x(e)); } return b; }
    function unary() { if (eat('-')) { const v = unary(); return e => -v(e); } return power(); }
    function term() { let v = unary(); for (;;) { if (eat('*')) { const a = v, b = unary(); v = e => a(e) * b(e); } else if (eat('/')) { const a = v, b = unary(); v = e => a(e) / b(e); } else return v; } }
    function expr() { let v = term(); for (;;) { if (eat('+')) { const a = v, b = term(); v = e => a(e) + b(e); } else if (eat('-')) { const a = v, b = term(); v = e => a(e) - b(e); } else return v; } }
    const f = expr(); if (i < tk.length) throw new Error('Unexpected “' + (peek().v || peek().t) + '”');
    return f;
  }

  /* ======================= schema + validation ======================= */
  const KINDS = ['plot2d', 'surface3d', 'field2d', 'waves', 'network', 'algorithm', 'diagram', 'truss3d', 'beam', 'matrix2d', 'chart', 'timeline', 'scene2d', 'scene3d', 'scene'];
  // named colours the AI may use (plus any #hex); theme-safe mid tones
  const PALETTE = { red: '#ef4444', orange: '#f97316', amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16', green: '#22c55e', teal: '#14b8a6', cyan: '#06b6d4', sky: '#38bdf8', blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', pink: '#ec4899', rose: '#f43f5e', brown: '#92400e', grey: '#94a3b8', gray: '#94a3b8', slate: '#64748b', white: '#f8fafc', black: '#0f172a', blood: '#b91c1c', bone: '#e7e5e4', water: '#60a5fa', metal: '#a1a1aa' };
  const ALGOS = ['bubble', 'insertion', 'selection', 'merge', 'quick', 'binary-search', 'fibonacci'];
  function validate(input) {
    const errors = [];
    let s = input;
    if (typeof s === 'string') { try { s = JSON.parse(s); } catch (e) { return { ok: false, errors: ['not JSON'] }; } }
    if (!s || typeof s !== 'object') return { ok: false, errors: ['empty'] };
    const kind = String(s.kind || '').toLowerCase();
    if (!KINDS.includes(kind)) return { ok: false, errors: ['unknown kind ' + kind] };
    const out = { kind, title: str(s.title, 80) || 'Interactive visual', subject: str(s.subject, 40) || '', alt: str(s.alt, 300), params: {}, vars: [], steps: [] };
    // variables (sliders)
    (Array.isArray(s.vars) ? s.vars : []).slice(0, 6).forEach(v => {
      const name = String(v && v.name || '').replace(/[^a-z0-9_]/gi, '').slice(0, 12);
      if (!/^[a-z_][a-z0-9_]*$/i.test(name) || FN[name] || CONST[name] || name === 'x' || name === 'y' || name === 't') { errors.push('bad var ' + name); return; }
      let mn = num(+v.min, 0), mx = num(+v.max, 1); if (mx <= mn) mx = mn + 1;
      const step = clamp(num(+v.step, (mx - mn) / 100), (mx - mn) / 1000, mx - mn);
      out.vars.push({ name, label: str(v.label, 40) || name, min: mn, max: mx, step, value: clamp(num(+v.value, (mn + mx) / 2), mn, mx) });
    });
    const vnames = out.vars.map(v => v.name);
    const P = s.params || {};
    const ex = (e, names) => { const t = str(e, 160); compile(t, names); return t; };
    try {
      if (kind === 'plot2d') {
        const fns = (Array.isArray(P.fns) ? P.fns : P.expr ? [{ expr: P.expr }] : []).slice(0, 4).map(f => ({ expr: ex(f.expr, ['x', ...vnames]), label: str(f.label, 40) }));
        if (!fns.length) throw new Error('no function');
        const xr = Array.isArray(P.x) ? P.x.map(Number) : [-5, 5];
        out.params = { fns, x: [num(xr[0], -5), num(xr[1], 5)].sort((a, b) => a - b), y: Array.isArray(P.y) ? P.y.map(Number).filter(isFinite).slice(0, 2) : null, xlabel: str(P.xlabel, 30) || 'x', ylabel: str(P.ylabel, 30) || 'y', roots: !!P.roots, intersect: !!P.intersect && fns.length >= 2, derivative: !!P.derivative, tangentAt: vnames.includes(P.tangentAt) ? P.tangentAt : null, area: Array.isArray(P.area) && P.area.length === 2 ? P.area.map(a => (vnames.includes(a) ? a : num(+a, 0))) : null };
        if (out.params.x[1] - out.params.x[0] < 1e-6) out.params.x = [-5, 5];
      } else if (kind === 'surface3d') {
        out.params = { expr: ex(P.expr || 'x^2 - y^2', ['x', 'y', ...vnames]), range: clamp(num(+P.range, 3), 0.5, 50), descent: !!P.descent };
      } else if (kind === 'field2d') {
        if (Array.isArray(P.charges) && P.charges.length) out.params = { charges: P.charges.slice(0, 6).map(c => ({ q: typeof c.q === 'string' ? ex(c.q, vnames) : String(num(+c.q, 1)), x: clamp(num(+c.x, 0), -4, 4), y: clamp(num(+c.y, 0), -2.5, 2.5) })) };
        else out.params = { fx: ex(P.fx || '-y', ['x', 'y', ...vnames]), fy: ex(P.fy || 'x', ['x', 'y', ...vnames]) };
      } else if (kind === 'waves') {
        out.params = { mode: ['two-source', 'superposition', 'standing'].includes(P.mode) ? P.mode : 'two-source' };
      } else if (kind === 'network') {
        let L = Array.isArray(P.layers) ? P.layers.map(n => clamp(Math.round(+n || 2), 1, 6)).slice(0, 5) : [2, 4, 1];
        L[0] = 2; L[L.length - 1] = 1; if (L.length < 2) L = [2, 4, 1];
        out.params = { layers: L, task: ['xor', 'and', 'or', 'circle'].includes(P.task) ? P.task : 'xor', activation: ['tanh', 'sigmoid', 'relu'].includes(P.activation) ? P.activation : 'tanh' };
      } else if (kind === 'algorithm') {
        const algo = ALGOS.includes(P.algo) ? P.algo : 'bubble';
        const data = Array.isArray(P.data) ? P.data.map(Number).filter(isFinite).slice(0, 24) : null;
        out.params = { algo, data: data && data.length >= 3 ? data : null, target: num(+P.target, NaN), n: clamp(Math.round(num(+P.n, algo === 'fibonacci' ? 5 : 12)), algo === 'fibonacci' ? 2 : 4, algo === 'fibonacci' ? 6 : 24) };
      } else if (kind === 'diagram') {
        const nodes = (Array.isArray(P.nodes) ? P.nodes : []).slice(0, 14).map((n, k) => ({ id: String(n.id || 'n' + k).replace(/[^\w-]/g, '').slice(0, 24) || 'n' + k, label: str(n.label, 48), detail: str(n.detail, 220) })).filter(n => n.label);
        const ids = new Set(nodes.map(n => n.id));
        const edges = (Array.isArray(P.edges) ? P.edges : []).slice(0, 22).map(e => ({ from: String(e.from), to: String(e.to), label: str(e.label, 30) })).filter(e => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);
        if (nodes.length < 2) throw new Error('diagram needs nodes');
        out.params = { layout: ['flow', 'cycle', 'hub'].includes(P.layout) ? P.layout : 'flow', nodes, edges };
      } else if (kind === 'truss3d') {
        out.params = { type: ['pratt', 'warren', 'howe'].includes(P.type) ? P.type : 'pratt', panels: clamp(Math.round(num(+P.panels, 6)), 4, 10), span: clamp(num(+P.span, 24), 6, 120), height: clamp(num(+P.height, 4), 1, 20) };
        if (out.params.type !== 'warren' && out.params.panels % 2) out.params.panels++;
      } else if (kind === 'beam') {
        out.params = { support: P.support === 'cantilever' ? 'cantilever' : 'simple', span: clamp(num(+P.span, 10), 1, 100) };
      } else if (kind === 'matrix2d') {
        out.params = {};
      } else if (kind === 'chart') {
        // data visualisation from numbers the student (or a cited source) supplied — never invented here
        const labels = (Array.isArray(P.labels) ? P.labels : []).slice(0, 16).map(l => str(l, 24));
        const series = (Array.isArray(P.series) ? P.series : []).slice(0, 3).map(se => ({ name: str(se && se.name, 30), values: (Array.isArray(se && se.values) ? se.values : []).slice(0, labels.length).map(Number) })).filter(se => se.values.length === labels.length && se.values.every(isFinite));
        if (labels.length < 2 || !series.length) throw new Error('chart needs labels and numeric series');
        out.params = { type: ['bar', 'line', 'pie'].includes(P.type) ? P.type : 'bar', labels, series, unit: str(P.unit, 16), source: str(P.source, 120), labelsOn: P.labelsOn !== false };
      } else if (kind === 'timeline') {
        const events = (Array.isArray(P.events) ? P.events : []).slice(0, 12).map(e => ({ when: str(e && e.when, 20), label: str(e && e.label, 60), detail: str(e && e.detail, 220) })).filter(e => e.when && e.label);
        if (events.length < 2) throw new Error('timeline needs events');
        out.params = { events };
      } else if (kind === 'scene2d' || kind === 'scene3d') {
        // open-ended composition: any subject, built only from validated shapes, labels, layers and animations
        const ids = new Set(), color = c => c === 'none' ? 'none' : (typeof c === 'string' && (/^#[0-9a-f]{3,8}$/i.test(c) || PALETTE[c]) ? (PALETTE[c] || c) : null);
        const id = (v, k) => { let x = String(v || 'e' + k).replace(/[^\w-]/g, '').slice(0, 24) || 'e' + k; while (ids.has(x)) x += '_'; ids.add(x); return x; };
        const n = (v, a, b, d) => clamp(num(+v, d), a, b);
        const layers = (Array.isArray(P.layers) ? P.layers : []).slice(0, 6).map(l => ({ id: String(l && l.id || '').replace(/[^\w-]/g, '').slice(0, 20), label: str(l && l.label, 30) })).filter(l => l.id && l.label);
        const lids = new Set(layers.map(l => l.id));
        const anim = a => (a && ['move', 'rotate', 'pulse', 'flow', 'orbit', 'spin', 'bob'].includes(a.type) ? { type: a.type, to: Array.isArray(a.to) ? a.to.slice(0, 3).map(v => num(+v, 0)) : null, period: n(a.period, 0.3, 120, 4), radius: n(a.radius, 0, 1000, 0), around: a.around ? String(a.around).replace(/[^\w-]/g, '').slice(0, 24) : null, deg: n(a.deg, -720, 720, 360) } : null);
        if (kind === 'scene2d') {
          const SH = ['rect', 'circle', 'ellipse', 'line', 'arrow', 'polygon', 'path', 'text'];
          const els = (Array.isArray(P.elements) ? P.elements : []).slice(0, 90).map((e, k) => e && SH.includes(e.shape) ? {
            id: id(e.id, k), shape: e.shape, x: n(e.x, -50, 150, 50), y: n(e.y, -50, 110, 30), w: n(e.w, 0, 200, 10), h: n(e.h, 0, 120, 10), r: n(e.r, 0, 80, 4), rx: n(e.rx, 0, 50, 0),
            x2: n(e.x2, -50, 150, 60), y2: n(e.y2, -50, 110, 30), points: Array.isArray(e.points) ? e.points.slice(0, 40).map(pt => [n(pt && pt[0], -50, 150, 0), n(pt && pt[1], -50, 110, 0)]) : null,
            fill: color(e.fill), stroke: color(e.stroke), sw: n(e.sw, 0, 4, 0.4), text: str(e.text, 60), size: n(e.size, 1, 8, 2.6), label: str(e.label, 48), detail: str(e.detail, 260),
            layer: lids.has(e.layer) ? e.layer : null, anim: anim(e.anim), opacity: n(e.opacity, 0.05, 1, 1)
          } : null).filter(Boolean);
          if (els.length < 2) throw new Error('scene2d needs elements');
          out.params = { elements: els, layers, w: 100, h: 60, scale: P.scale === 'to-scale' ? 'to-scale' : 'schematic', caption: str(P.caption, 160) };
        } else {
          const SH = ['sphere', 'box', 'cylinder', 'cone', 'torus', 'ring', 'arrow'];
          const objs = (Array.isArray(P.objects) ? P.objects : []).slice(0, 60).map((o, k) => o && SH.includes(o.shape) ? {
            id: id(o.id, k), shape: o.shape, pos: (Array.isArray(o.pos) ? o.pos : [0, 0, 0]).slice(0, 3).map(v => n(v, -200, 200, 0)).concat([0, 0, 0]).slice(0, 3),
            size: (Array.isArray(o.size) ? o.size : [o.size]).slice(0, 3).map(v => n(v, 0.02, 60, 1)), color: color(o.color) || '#38bdf8', emissive: !!o.emissive,
            label: str(o.label, 48), detail: str(o.detail, 260), layer: lids.has(o.layer) ? o.layer : null, anim: anim(o.anim), rot: (Array.isArray(o.rot) ? o.rot : [0, 0, 0]).slice(0, 3).map(v => n(v, -360, 360, 0)).concat([0, 0, 0]).slice(0, 3)
          } : null).filter(Boolean);
          if (!objs.length) throw new Error('scene3d needs objects');
          const oid = new Set(objs.map(o => o.id));
          const links = (Array.isArray(P.links) ? P.links : []).slice(0, 60).map(l => ({ from: String(l && l.from), to: String(l && l.to), label: str(l && l.label, 30) })).filter(l => oid.has(l.from) && oid.has(l.to));
          out.params = { objects: objs, links, layers, scale: P.scale === 'to-scale' ? 'to-scale' : 'schematic', camera: n(P.camera, 2, 400, 0), caption: str(P.caption, 160) };
        }
      } else if (kind === 'scene') {
        const SC = (window.ERLY && ERLY.visuals && ERLY.visuals.scenes) || {};
        if (!SC[P.id]) throw new Error('unknown scene'); out.params = { id: P.id };
      }
    } catch (e) { return { ok: false, errors: errors.concat(String(e.message || e)) }; }
    // steps (narrated stages)
    (Array.isArray(s.steps) ? s.steps : []).slice(0, 8).forEach(st => {
      if (!st) return;
      const set = {}; Object.keys(st.set || {}).forEach(k => { const v = out.vars.find(x => x.name === k); if (v && isFinite(+st.set[k])) set[k] = clamp(+st.set[k], v.min, v.max); });
      const title = str(st.title, 80), text = str(st.text, 420);
      if (title || text) out.steps.push({ title: title || text.slice(0, 40), text: text || title, set, focus: (Array.isArray(st.focus) ? st.focus : []).map(String).slice(0, 6) });
    });
    if (!out.steps.length) out.steps.push({ title: out.title, text: out.alt || T('Explore the visual: use the sliders and controls.', 'استكشف الشرح المرئي باستخدام المنزلقات وأزرار التحكم.'), set: {}, focus: [] });
    return { ok: true, spec: out, errors };
  }

  /* ======================= helpers ======================= */
  function canvas(box, w, h, cls) {
    const c = document.createElement('canvas'); c.className = 'vz-canvas ' + (cls || ''); c.width = w; c.height = h;
    box.appendChild(c); return c;
  }
  const axes = (x0, x1, y0, y1, W, H, pad) => ({ X: x => pad + (x - x0) / (x1 - x0) * (W - 2 * pad), Y: y => H - pad - (y - y0) / (y1 - y0) * (H - 2 * pad), ix: px => x0 + (px - pad) / (W - 2 * pad) * (x1 - x0) });
  function niceStep(range) { const r = range / 8, p = Math.pow(10, Math.floor(Math.log10(r))), m = r / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; }
  function drawGrid(g, A, x0, x1, y0, y1, W, H, pad, xl, yl) {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches && !document.documentElement.classList.contains('light');
    g.fillStyle = dark ? '#0f1320' : '#ffffff'; g.fillRect(0, 0, W, H);
    g.lineWidth = 1; g.font = '12px Inter, system-ui, sans-serif'; g.fillStyle = dark ? '#9aa3b8' : '#6b7280';
    const sx = niceStep(x1 - x0), sy = niceStep(y1 - y0);
    g.strokeStyle = dark ? '#1e2638' : '#eef0f4';
    for (let x = Math.ceil(x0 / sx) * sx; x <= x1; x += sx) { g.beginPath(); g.moveTo(A.X(x), pad); g.lineTo(A.X(x), H - pad); g.stroke(); g.fillText(fmt(+x.toFixed(6)), A.X(x) + 3, H - pad + 14); }
    for (let y = Math.ceil(y0 / sy) * sy; y <= y1; y += sy) { g.beginPath(); g.moveTo(pad, A.Y(y)); g.lineTo(W - pad, A.Y(y)); g.stroke(); g.fillText(fmt(+y.toFixed(6)), 4, A.Y(y) - 3); }
    g.strokeStyle = dark ? '#5b6683' : '#9ca3af'; g.lineWidth = 1.5;
    if (y0 <= 0 && y1 >= 0) { g.beginPath(); g.moveTo(pad, A.Y(0)); g.lineTo(W - pad, A.Y(0)); g.stroke(); }
    if (x0 <= 0 && x1 >= 0) { g.beginPath(); g.moveTo(A.X(0), pad); g.lineTo(A.X(0), H - pad); g.stroke(); }
    g.fillStyle = dark ? '#cbd5e1' : '#374151'; g.font = '600 13px Inter, system-ui, sans-serif';
    if (xl) g.fillText(xl, W - pad - g.measureText(xl).width, H - pad - 6);
    if (yl) g.fillText(yl, pad + 6, pad + 12);
    return dark;
  }
  const COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#10b981'];
  function bisect(f, a, b) { let fa = f(a); for (let k = 0; k < 60; k++) { const m = (a + b) / 2, fm = f(m); if (!isFinite(fm)) return null; if ((fa <= 0) === (fm <= 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; }
  function zeros(f, x0, x1, n) { const out = []; let px = x0, pv = f(x0); for (let k = 1; k <= (n || 400); k++) { const x = x0 + (x1 - x0) * k / (n || 400), v = f(x); if (isFinite(v) && isFinite(pv) && (pv === 0 || (pv < 0) !== (v < 0)) && Math.abs(v - pv) < 50) { const r = pv === 0 ? px : bisect(f, px, x); if (r != null && !out.some(o => Math.abs(o - r) < 1e-6)) out.push(r); } px = x; pv = v; } return out.slice(0, 8); }
  const simpson = (f, a, b, n = 200) => { const h = (b - a) / n; let s = f(a) + f(b); for (let k = 1; k < n; k++) s += (k % 2 ? 4 : 2) * f(a + k * h); return s * h / 3; };
  const deriv = (f, x) => (f(x + 1e-4) - f(x - 1e-4)) / 2e-4;
  function dpr(c) { const d = Math.min(2, window.devicePixelRatio || 1); if (c.dataset.dpr != d) { const w = +c.getAttribute('width'), h = +c.getAttribute('height'); c.width = w * d; c.height = h * d; c.dataset.dpr = d; c.dataset.w = w; c.dataset.h = h; c.getContext('2d').setTransform(d, 0, 0, d, 0, 0); } return [+c.dataset.w || c.width, +c.dataset.h || c.height]; }

  /* ======================= renderers ======================= */
  const R = {};

  /* ---- plot2d: functions, parameters, roots, intersections (equilibrium), tangent, area ---- */
  R.plot2d = (spec) => (box, api) => {
    const P = spec.params, env = {}; spec.vars.forEach(v => { env[v.name] = v.value; });
    const fns = P.fns.map(f => compile(f.expr, ['x', ...spec.vars.map(v => v.name)]));
    const c = canvas(box, 800, 460); c.setAttribute('role', 'img'); c.setAttribute('aria-label', spec.alt || spec.title);
    let readout = '';
    const val = a => (typeof a === 'string' ? env[a] : a);
    function draw() {
      const [W, H] = dpr(c), g = c.getContext('2d'), pad = 34;
      const [x0, x1] = P.x;
      const fx = fns.map(f => x => { env.x = x; const v = f(env); return isFinite(v) ? v : NaN; });
      let y0, y1;
      if (P.y && P.y.length === 2 && P.y[1] > P.y[0]) [y0, y1] = P.y;
      else { const ys = []; fx.forEach(f => { for (let k = 0; k <= 200; k++) { const v = f(x0 + (x1 - x0) * k / 200); if (isFinite(v)) ys.push(v); } }); ys.sort((a, b) => a - b); y0 = ys[Math.floor(ys.length * 0.02)] || -5; y1 = ys[Math.floor(ys.length * 0.98)] || 5; const m = (y1 - y0) * 0.15 || 1; y0 -= m; y1 += m; if (y0 > 0) y0 = Math.min(0, y0 - m); }
      const A = axes(x0, x1, y0, y1, W, H, pad);
      drawGrid(g, A, x0, x1, y0, y1, W, H, pad, P.xlabel, P.ylabel);
      const bits = [];
      // shaded area (definite integral)
      if (P.area) {
        const a = val(P.area[0]), b = val(P.area[1]), lo = Math.min(a, b), hi = Math.max(a, b);
        g.fillStyle = 'rgba(124,58,237,.18)'; g.beginPath(); g.moveTo(A.X(lo), A.Y(0));
        for (let k = 0; k <= 120; k++) { const x = lo + (hi - lo) * k / 120; g.lineTo(A.X(x), A.Y(clamp(fx[0](x), y0, y1))); }
        g.lineTo(A.X(hi), A.Y(0)); g.closePath(); g.fill();
        const I = simpson(fx[0], a, b); bits.push(`∫ from ${fmt(a)} to ${fmt(b)} = ${fmt(I)}`);
      }
      // curves
      fx.forEach((f, i) => {
        g.strokeStyle = COLORS[i]; g.lineWidth = 3; g.beginPath(); let pen = false;
        for (let k = 0; k <= 600; k++) { const x = x0 + (x1 - x0) * k / 600, v = f(x); if (!isFinite(v) || v < y0 - (y1 - y0) || v > y1 + (y1 - y0)) { pen = false; continue; } if (!pen) { g.moveTo(A.X(x), A.Y(v)); pen = true; } else g.lineTo(A.X(x), A.Y(v)); }
        g.stroke();
        if (P.fns[i].label) { g.fillStyle = COLORS[i]; g.font = '600 13px Inter, system-ui'; g.fillText(P.fns[i].label, W - pad - 150, pad + 18 + i * 18); }
      });
      if (P.derivative) { g.setLineDash([6, 5]); g.strokeStyle = '#f43f5e'; g.lineWidth = 2; g.beginPath(); let pen = false; for (let k = 0; k <= 400; k++) { const x = x0 + (x1 - x0) * k / 400, v = deriv(fx[0], x); if (!isFinite(v) || v < y0 || v > y1) { pen = false; continue; } if (!pen) { g.moveTo(A.X(x), A.Y(v)); pen = true; } else g.lineTo(A.X(x), A.Y(v)); } g.stroke(); g.setLineDash([]); g.fillStyle = '#f43f5e'; g.fillText(T("derivative f′(x)", "المشتقة"), W - pad - 150, pad + 18 + fns.length * 18); }
      const dot = (x, y, col, lab) => { g.fillStyle = col; g.beginPath(); g.arc(A.X(x), A.Y(y), 5.5, 0, 7); g.fill(); if (lab) { g.font = '600 12px Inter, system-ui'; g.fillText(lab, A.X(x) + 8, A.Y(y) - 8); } };
      if (P.roots) { const r = zeros(fx[0], x0, x1); r.forEach(x => dot(x, 0, '#111827', 'x = ' + fmt(x))); bits.push(r.length ? T('roots: ', 'الجذور: ') + r.map(fmt).join(', ') : T('no real roots in view', 'لا جذور حقيقية في المجال')); }
      if (P.intersect) { const d = x => fx[0](x) - fx[1](x); const r = zeros(d, x0, x1); r.forEach(x => { const y = fx[0](x); dot(x, y, '#111827', `(${fmt(x)}, ${fmt(y)})`); g.setLineDash([4, 4]); g.strokeStyle = '#9ca3af'; g.beginPath(); g.moveTo(A.X(x), A.Y(y)); g.lineTo(A.X(x), A.Y(Math.max(y0, 0))); g.moveTo(A.X(x), A.Y(y)); g.lineTo(A.X(Math.max(x0, 0)), A.Y(y)); g.stroke(); g.setLineDash([]); }); bits.push(r.length ? T('intersection at ', 'التقاطع عند ') + r.map(x => `${P.xlabel} = ${fmt(x)}, ${P.ylabel} = ${fmt(fx[0](x))}`).join('; ') : T('the curves do not meet in view', 'المنحنيان لا يلتقيان')); }
      if (P.tangentAt) {
        const x = env[P.tangentAt], y = fx[0](x), m = deriv(fx[0], x);
        if (isFinite(y) && isFinite(m)) { g.strokeStyle = '#10b981'; g.lineWidth = 2; g.beginPath(); g.moveTo(A.X(x0), A.Y(y + m * (x0 - x))); g.lineTo(A.X(x1), A.Y(y + m * (x1 - x))); g.stroke(); dot(x, y, '#10b981', `slope = ${fmt(m)}`); bits.push(`f(${fmt(x)}) = ${fmt(y)}, f′(${fmt(x)}) = ${fmt(m)}`); }
      }
      readout = bits.join(' · '); api.status(readout);
    }
    return { stage() { draw(); }, tick() {}, set(k, v) { env[k] = v; draw(); }, state: () => Object.assign({ readout }, env), redraw: draw };
  };

  /* ---- surface3d: z = f(x, y), rotatable, with optional gradient-descent ball ---- */
  R.surface3d = (spec) => async (box, api) => {
    const THREE = await import('three'); const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const P = spec.params, env = {}; spec.vars.forEach(v => { env[v.name] = v.value; });
    const f = compile(P.expr, ['x', 'y', ...spec.vars.map(v => v.name)]);
    const wrap = document.createElement('div'); wrap.className = 'vz-3d'; box.appendChild(wrap);
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); wrap.appendChild(r.domElement);
    r.domElement.setAttribute('role', 'img'); r.domElement.setAttribute('aria-label', spec.alt || spec.title);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 200);
    cam.position.set(6, 5, 7); const ctl = new OrbitControls(cam, r.domElement); ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.6;
    scene.add(new THREE.AmbientLight(0xffffff, 0.55)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(4, 8, 5); scene.add(dl);
    const N = 70, S = 6, rg = P.range;
    const geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.05, flatShading: false });
    const mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 })); scene.add(wire);
    scene.add(new THREE.AxesHelper(3.6));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), new THREE.MeshStandardMaterial({ color: 0xff3b6b, emissive: 0x551122 })); ball.visible = !!P.descent; scene.add(ball);
    const trail = []; const trailLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff3b6b })); scene.add(trailLine);
    let zs = 1, zc = 0;
    const F = (x, y) => { env.x = x; env.y = y; const v = f(env); return isFinite(v) ? v : 0; };
    function build() {
      const pos = geo.attributes.position, cols = []; let lo = Infinity, hi = -Infinity; const vals = [];
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / S * 2 * rg, y = -pos.getZ(i) / S * 2 * rg; const v = F(x, y); vals.push(v); lo = Math.min(lo, v); hi = Math.max(hi, v); }
      zs = 3 / Math.max(1e-6, hi - lo); zc = (hi + lo) / 2;
      const col = new THREE.Color();
      for (let i = 0; i < pos.count; i++) { pos.setY(i, (vals[i] - zc) * zs); const t = (vals[i] - lo) / Math.max(1e-6, hi - lo); col.setHSL(0.72 - 0.62 * t, 0.75, 0.42 + 0.18 * t); cols.push(col.r, col.g, col.b); }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); pos.needsUpdate = true; geo.computeVertexNormals();
      wire.geometry.dispose(); wire.geometry = new THREE.WireframeGeometry(geo);
      api.status(`z = ${P.expr} · ${T('range', 'المدى')} ${fmt(lo)} … ${fmt(hi)}`);
    }
    const toW = (x, y) => new THREE.Vector3(x / (2 * rg) * S, (F(x, y) - zc) * zs + 0.11, -y / (2 * rg) * S);
    const gd = { x: rg * 0.8, y: rg * 0.6, lr: 0.08, it: 0, acc: 0 };
    function resetDescent() { gd.x = env.x0 != null ? env.x0 : rg * 0.8; gd.y = env.y0 != null ? env.y0 : rg * 0.6; gd.it = 0; trail.length = 0; }
    resetDescent(); build();
    function size() { const w = wrap.clientWidth || 800, h = wrap.clientHeight || 450; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    const ro = new ResizeObserver(size); ro.observe(wrap); size();
    return {
      stage(i) { const st = spec.steps[i]; if (st && st.focus && st.focus.includes('descent')) { ball.visible = true; resetDescent(); } },
      tick(dt, sp) {
        if (ball.visible) {
          gd.acc += dt * sp; while (gd.acc > 0.12) { gd.acc -= 0.12; const lr = env.lr != null ? env.lr : gd.lr; const gx = (F(gd.x + 1e-3, gd.y) - F(gd.x - 1e-3, gd.y)) / 2e-3, gy = (F(gd.x, gd.y + 1e-3) - F(gd.x, gd.y - 1e-3)) / 2e-3; const nx = clamp(gd.x - lr * gx, -rg, rg), ny = clamp(gd.y - lr * gy, -rg, rg); if (Math.hypot(nx - gd.x, ny - gd.y) < 1e-4 || gd.it > 300) { if (gd.it > 3) api.status(T(`Gradient descent settled after ${gd.it} steps at (${fmt(gd.x)}, ${fmt(gd.y)}), z = ${fmt(F(gd.x, gd.y))}`, `استقر الانحدار بعد ${gd.it} خطوة`)); if (gd.it > 400 || gd.done) { resetDescent(); } gd.done = true; gd.it++; } else { gd.done = false; gd.x = nx; gd.y = ny; gd.it++; trail.push(toW(gd.x, gd.y)); if (trail.length > 300) trail.shift(); trailLine.geometry.setFromPoints(trail); } }
          ball.position.copy(toW(gd.x, gd.y));
        }
        ctl.autoRotate = sp > 0; ctl.update(); r.render(scene, cam);
      },
      set(k, v) { env[k] = v; if (k === 'x0' || k === 'y0' || k === 'lr') { resetDescent(); return; } build(); resetDescent(); },
      state: () => ({ x: gd.x, y: gd.y, it: gd.it, z: F(gd.x, gd.y) }),
      destroy() { ro.disconnect(); ctl.dispose(); geo.dispose(); r.dispose(); }
    };
  };

  /* ---- field2d: electric field of point charges, or any vector field F(x, y) ---- */
  R.field2d = (spec) => (box, api) => {
    const P = spec.params, env = {}; spec.vars.forEach(v => { env[v.name] = v.value; });
    const vn = spec.vars.map(v => v.name);
    const charges = P.charges ? P.charges.map(c => ({ q: compile(c.q, vn), x: c.x, y: c.y })) : null;
    const fx = P.fx ? compile(P.fx, ['x', 'y', ...vn]) : null, fy = P.fy ? compile(P.fy, ['x', 'y', ...vn]) : null;
    const c = canvas(box, 800, 460); c.setAttribute('role', 'img'); c.setAttribute('aria-label', spec.alt || spec.title);
    const X0 = -5, X1 = 5, Y0 = -2.9, Y1 = 2.9;
    function E(x, y) {
      if (charges) { let ex = 0, ey = 0; charges.forEach(ch => { const q = ch.q(env), dx = x - ch.x, dy = y - ch.y, r2 = dx * dx + dy * dy + 0.02, r3 = r2 * Math.sqrt(r2); ex += q * dx / r3; ey += q * dy / r3; }); return [ex, ey]; }
      env.x = x; env.y = y; return [fx(env), fy(env)];
    }
    const parts = Array.from({ length: 260 }, () => ({ x: X0 + Math.random() * (X1 - X0), y: Y0 + Math.random() * (Y1 - Y0), age: Math.random() * 4 }));
    function draw(dt, sp) {
      const [W, H] = dpr(c), g = c.getContext('2d'), A = axes(X0, X1, Y0, Y1, W, H, 20);
      const dark = drawGrid(g, A, X0, X1, Y0, Y1, W, H, 20, '', '');
      // arrows
      for (let i = 0; i <= 24; i++) for (let j = 0; j <= 13; j++) {
        const x = X0 + (X1 - X0) * (i + 0.5) / 25, y = Y0 + (Y1 - Y0) * (j + 0.5) / 14; const [ex, ey] = E(x, y); const m = Math.hypot(ex, ey); if (!isFinite(m) || m < 1e-9) continue;
        const L = 14, ux = ex / m, uy = ey / m, t = clamp(Math.log10(1 + m * 3) / 1.6, 0, 1);
        const px = A.X(x), py = A.Y(y);
        g.strokeStyle = `hsla(${250 - 220 * t},80%,${dark ? 65 : 45}%,${0.35 + 0.6 * t})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px - ux * L / 2, py + uy * L / 2); g.lineTo(px + ux * L / 2, py - uy * L / 2); g.stroke();
        g.beginPath(); g.moveTo(px + ux * L / 2, py - uy * L / 2); g.lineTo(px + ux * L / 2 - (ux * 5 - uy * 3), py - uy * L / 2 + (uy * 5 + ux * 3)); g.lineTo(px + ux * L / 2 - (ux * 5 + uy * 3), py - uy * L / 2 + (uy * 5 - ux * 3)); g.closePath(); g.fillStyle = g.strokeStyle; g.fill();
      }
      // particles drift along the field (direction a positive test charge would move)
      g.fillStyle = dark ? 'rgba(255,255,255,.75)' : 'rgba(17,24,39,.6)';
      parts.forEach(p => { const [ex, ey] = E(p.x, p.y), m = Math.hypot(ex, ey) || 1; const step = (dt || 0) * (sp || 1) * 0.9; p.x += ex / m * step; p.y += ey / m * step; p.age += dt || 0; if (p.x < X0 || p.x > X1 || p.y < Y0 || p.y > Y1 || p.age > 5 || (charges && charges.some(ch => Math.hypot(p.x - ch.x, p.y - ch.y) < 0.12))) { p.x = X0 + Math.random() * (X1 - X0); p.y = Y0 + Math.random() * (Y1 - Y0); p.age = 0; } g.beginPath(); g.arc(A.X(p.x), A.Y(p.y), 1.8, 0, 7); g.fill(); });
      if (charges) charges.forEach((ch, k) => { const q = ch.q(env); g.fillStyle = q >= 0 ? '#ef4444' : '#3b82f6'; g.beginPath(); g.arc(A.X(ch.x), A.Y(ch.y), 13, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 16px Inter, system-ui'; g.textAlign = 'center'; g.fillText(q >= 0 ? '+' : '−', A.X(ch.x), A.Y(ch.y) + 5); g.textAlign = 'left'; g.fillStyle = dark ? '#e5e7eb' : '#111827'; g.font = '12px Inter, system-ui'; g.fillText(`q${k + 1} = ${fmt(q)}`, A.X(ch.x) + 16, A.Y(ch.y) - 12); });
    }
    let hover = null;
    c.addEventListener('pointermove', e => { const rc = c.getBoundingClientRect(), [W, H] = [+c.dataset.w || 800, +c.dataset.h || 460], A = axes(X0, X1, Y0, Y1, W, H, 20); const x = A.ix((e.clientX - rc.left) / rc.width * W), y = Y1 - ((e.clientY - rc.top) / rc.height * H - 20) / (H - 40) * (Y1 - Y0); const [ex, ey] = E(x, y); hover = `|F| at (${fmt(x)}, ${fmt(y)}) = ${fmt(Math.hypot(ex, ey))}`; api.status(hover); });
    draw(0, 1);
    return { stage() { draw(0, 1); }, tick(dt, sp) { draw(dt, sp); }, set(k, v) { env[k] = v; draw(0, 1); }, state: () => Object.assign({}, env) };
  };

  /* ---- waves: two-source interference, superposition, standing waves ---- */
  R.waves = (spec) => (box, api) => {
    const P = spec.params, env = { lambda: 40, d: 120, phi: 0, A1: 1, f1: 1, A2: 1, f2: 1.2 }; spec.vars.forEach(v => { env[v.name] = v.value; });
    const c = canvas(box, 800, 460); c.setAttribute('role', 'img'); c.setAttribute('aria-label', spec.alt || spec.title);
    let t = 0; const img = { w: 200, h: 115 }; const off = document.createElement('canvas'); off.width = img.w; off.height = img.h; const og = off.getContext('2d'); const id = og.createImageData(img.w, img.h);
    function draw() {
      const [W, H] = dpr(c), g = c.getContext('2d');
      if (P.mode === 'two-source') {
        const scale = 600 / img.w, k = 2 * Math.PI / env.lambda, cy = img.h / 2 * scale, s1 = cy - env.d / 2, s2 = cy + env.d / 2;
        for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
          const x = i * scale, y = j * scale, r1 = Math.hypot(x, y - s1), r2 = Math.hypot(x, y - s2);
          const a = Math.cos(k * r1 - t * 4) + Math.cos(k * r2 - t * 4 + env.phi);
          const v = (a + 2) / 4, o = (j * img.w + i) * 4; id.data[o] = 20 + 60 * v; id.data[o + 1] = 40 + 120 * v; id.data[o + 2] = 90 + 165 * v; id.data[o + 3] = 255;
        }
        og.putImageData(id, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(off, 0, 0, 600, H);
        // intensity on a screen at the right: I ∝ cos²(Δφ/2)
        g.fillStyle = '#0b1020'; g.fillRect(600, 0, W - 600, H);
        g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.beginPath();
        for (let j = 0; j <= H; j += 2) { const y = j / H * img.h * scale, x = 600; const dphi = k * (Math.hypot(x, y - s1) - Math.hypot(x, y - s2)) - env.phi; const I = Math.cos(dphi / 2) ** 2; const px = 610 + I * (W - 630); j ? g.lineTo(px, j) : g.moveTo(px, j); }
        g.stroke();
        g.fillStyle = '#fff'; [s1, s2].forEach(s => { g.beginPath(); g.arc(4, s / (img.h * scale) * H, 6, 0, 7); g.fill(); });
        g.font = '12px Inter, system-ui'; g.fillText(T('intensity on screen', 'الشدة على الشاشة'), 612, 16);
        api.status(`λ = ${fmt(env.lambda)} · d = ${fmt(env.d)} · ${T('bright fringes where path difference = mλ', 'الأهداب المضيئة حيث فرق المسار = mλ')}`);
      } else {
        const dark = drawGrid(g, axes(0, 10, -2.6, 2.6, W, H, 24), 0, 10, -2.6, 2.6, W, H, 24, 'x', 'y'); const A = axes(0, 10, -2.6, 2.6, W, H, 24);
        const y1 = x => P.mode === 'standing' ? env.A1 * Math.sin(2 * Math.PI * env.f1 * x / 4 - t * 3) : env.A1 * Math.sin(2 * Math.PI * env.f1 * x / 4 - t * 3);
        const y2 = x => P.mode === 'standing' ? env.A1 * Math.sin(2 * Math.PI * env.f1 * x / 4 + t * 3) : env.A2 * Math.sin(2 * Math.PI * env.f2 * x / 4 - t * 3.6);
        [[y1, '#0ea5e9', 1.5], [y2, '#f59e0b', 1.5], [x => y1(x) + y2(x), dark ? '#fff' : '#111827', 3]].forEach(([f, col, lw]) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let k = 0; k <= 400; k++) { const x = k / 40; k ? g.lineTo(A.X(x), A.Y(f(x))) : g.moveTo(A.X(x), A.Y(f(x))); } g.stroke(); });
        api.status(P.mode === 'standing' ? T('Two identical waves travelling in opposite directions → nodes stay still, antinodes oscillate', 'موجتان متطابقتان في اتجاهين متعاكسين ← عقد ثابتة وبطون تهتز') : T('Black/white = the sum of the two waves (superposition)', 'الأسود = مجموع الموجتين (التراكب)'));
      }
    }
    draw();
    return { stage() { draw(); }, tick(dt, sp) { t += dt * sp; draw(); }, set(k, v) { env[k] = v; draw(); }, state: () => Object.assign({}, env) };
  };

  /* ---- network: a real multilayer perceptron trained by back-propagation ---- */
  R.network = (spec) => (box, api) => {
    const P = spec.params, L = P.layers, env = { lr: 0.5, x1: 1, x2: 0 }; spec.vars.forEach(v => { env[v.name] = v.value; });
    const act = { tanh: [Math.tanh, y => 1 - y * y], sigmoid: [x => 1 / (1 + Math.exp(-x)), y => y * (1 - y)], relu: [x => Math.max(0, x), y => (y > 0 ? 1 : 0)] }[P.activation];
    const sig = x => 1 / (1 + Math.exp(-x));
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const data = P.task === 'circle' ? Array.from({ length: 60 }, () => { const a = rnd() * 2 - 1, b = rnd() * 2 - 1; return [a, b, a * a + b * b < 0.45 ? 1 : 0]; }) : [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => [a, b, P.task === 'xor' ? a ^ b : P.task === 'and' ? a & b : a | b]);
    let W, B, epoch, losses;
    function init() { seed = 7; W = []; B = []; for (let l = 1; l < L.length; l++) { W.push(Array.from({ length: L[l] }, () => Array.from({ length: L[l - 1] }, () => (rnd() * 2 - 1) * 1.2))); B.push(Array.from({ length: L[l] }, () => (rnd() * 2 - 1) * 0.3)); } epoch = 0; losses = []; }
    function forward(x) { const a = [x]; for (let l = 0; l < W.length; l++) { const last = l === W.length - 1; a.push(W[l].map((row, j) => { const z = row.reduce((s, w, k) => s + w * a[l][k], B[l][j]); return last ? sig(z) : act[0](z); })); } return a; }
    function trainEpoch() {
      const gW = W.map(m => m.map(r => r.map(() => 0))), gB = B.map(b => b.map(() => 0)); let loss = 0;
      data.forEach(([a, b, y]) => {
        const A = forward([a, b]); const o = A[A.length - 1][0]; loss += -(y * Math.log(o + 1e-9) + (1 - y) * Math.log(1 - o + 1e-9));
        let delta = [o - y]; // cross-entropy with a sigmoid output
        for (let l = W.length - 1; l >= 0; l--) {
          delta.forEach((d, j) => { gB[l][j] += d; A[l].forEach((ak, k) => { gW[l][j][k] += d * ak; }); });
          if (l > 0) delta = A[l].map((ak, k) => act[1](ak) * delta.reduce((s, d, j) => s + d * W[l][j][k], 0));
        }
      });
      const n = data.length; W.forEach((m, l) => m.forEach((r, j) => r.forEach((_, k) => { W[l][j][k] -= env.lr * gW[l][j][k] / n; }))); B.forEach((b, l) => b.forEach((_, j) => { B[l][j] -= env.lr * gB[l][j] / n; }));
      epoch++; losses.push(loss / n); if (losses.length > 400) losses.shift();
    }
    init();
    const c = canvas(box, 800, 460); c.setAttribute('role', 'img'); c.setAttribute('aria-label', spec.alt || spec.title);
    let training = false, acc = 0;
    function draw() {
      const [Wd, H] = dpr(c), g = c.getContext('2d'); const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      g.fillStyle = dark ? '#0f1320' : '#fff'; g.fillRect(0, 0, Wd, H);
      const A = forward([env.x1, env.x2]);
      const pos = L.map((n, l) => Array.from({ length: n }, (_, j) => [50 + l * (420 / (L.length - 1)), H / 2 + (j - (n - 1) / 2) * Math.min(70, 360 / n)]));
      // edges: colour = sign, width = |weight|
      W.forEach((m, l) => m.forEach((r, j) => r.forEach((w, k) => { g.strokeStyle = w >= 0 ? 'rgba(14,165,233,.8)' : 'rgba(244,63,94,.8)'; g.lineWidth = clamp(Math.abs(w) * 1.6, 0.4, 6); g.beginPath(); g.moveTo(...pos[l][k]); g.lineTo(...pos[l + 1][j]); g.stroke(); })));
      // nodes: fill = activation
      pos.forEach((col, l) => col.forEach(([x, y], j) => { const v = A[l][j]; const t = clamp((v + (P.activation === 'tanh' && l > 0 && l < L.length - 1 ? 1 : 0)) / (P.activation === 'tanh' && l > 0 && l < L.length - 1 ? 2 : 1), 0, 1); g.fillStyle = `hsl(${260 - 200 * t},75%,${30 + 35 * t}%)`; g.beginPath(); g.arc(x, y, 17, 0, 7); g.fill(); g.strokeStyle = dark ? '#cbd5e1' : '#334155'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#fff'; g.font = '600 11px Inter, system-ui'; g.textAlign = 'center'; g.fillText(fmt(+v.toFixed(2)), x, y + 4); }));
      g.textAlign = 'left'; g.fillStyle = dark ? '#e2e8f0' : '#111827'; g.font = '600 12px Inter, system-ui';
      g.fillText(T('inputs', 'المدخلات'), 24, 24); g.fillText(T('hidden', 'مخفية'), 50 + 420 / (L.length - 1) - 20, 24); g.fillText(T('output', 'المخرج'), 450, 24);
      // decision map + data
      const mx = 530, my = 20, ms = 230;
      const range = P.task === 'circle' ? [-1, 1] : [-0.25, 1.25];
      for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) { const a = range[0] + (range[1] - range[0]) * (i + 0.5) / 40, b = range[1] - (range[1] - range[0]) * (j + 0.5) / 40; const o = forward([a, b]).pop()[0]; g.fillStyle = `hsla(${200 * (1 - o) + 20},70%,55%,.55)`; g.fillRect(mx + i * ms / 40, my + j * ms / 40, ms / 40 + 0.5, ms / 40 + 0.5); }
      data.forEach(([a, b, y]) => { g.fillStyle = y ? '#f59e0b' : '#1d4ed8'; g.strokeStyle = '#fff'; g.beginPath(); g.arc(mx + (a - range[0]) / (range[1] - range[0]) * ms, my + (range[1] - b) / (range[1] - range[0]) * ms, P.task === 'circle' ? 4 : 8, 0, 7); g.fill(); g.stroke(); });
      g.fillStyle = dark ? '#e2e8f0' : '#111827'; g.fillText(T('what the network predicts', 'ما تتنبأ به الشبكة'), mx, my + ms + 16);
      // loss curve
      const ly = my + ms + 30, lh = H - ly - 26; g.strokeStyle = dark ? '#334155' : '#e5e7eb'; g.strokeRect(mx, ly, ms, lh);
      if (losses.length > 1) { const mxl = Math.max(...losses); g.strokeStyle = '#7c3aed'; g.lineWidth = 2; g.beginPath(); losses.forEach((v, k) => { const x = mx + k / (losses.length - 1) * ms, y = ly + lh - v / mxl * lh; k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
      g.fillText(`${T('loss', 'الخسارة')} ${losses.length ? fmt(losses[losses.length - 1]) : '—'} · ${T('epoch', 'الحقبة')} ${epoch}`, mx, H - 8);
      const accN = data.filter(([a, b, y]) => (forward([a, b]).pop()[0] > 0.5 ? 1 : 0) === y).length;
      api.status(`${T('output for', 'المخرج لـ')} (${fmt(env.x1)}, ${fmt(env.x2)}) = ${fmt(A[A.length - 1][0])} · ${T('accuracy', 'الدقة')} ${accN}/${data.length}`);
    }
    draw();
    return {
      stage(i) { const st = spec.steps[i] || {}; training = (st.focus || []).includes('train'); if ((st.focus || []).includes('reset')) init(); draw(); },
      tick(dt, sp) { if (!training) return; acc += dt * sp * 60; let n = 0; while (acc >= 1 && n < 40) { trainEpoch(); acc -= 1; n++; } if (n) draw(); },
      set(k, v) { env[k] = v; draw(); },
      train(on) { training = on !== false; }, reset() { init(); draw(); },
      state: () => ({ epoch, loss: losses[losses.length - 1], training })
    };
  };

  /* ---- algorithm: sorting / searching / recursion traced step by step ---- */
  function frames(P) {
    const F = [];
    if (P.algo === 'fibonacci') {
      let idn = 0; const nodes = [];
      const call = (n, depth, parent) => { const me = { id: idn++, n, depth, parent, val: null }; nodes.push(me); F.push({ nodes: nodes.map(x => Object.assign({}, x)), active: me.id, msg: `fib(${n}) ${T('is called', 'تُستدعى')}` }); if (n < 2) me.val = n; else me.val = call(n - 1, depth + 1, me.id) + call(n - 2, depth + 1, me.id); F.push({ nodes: nodes.map(x => Object.assign({}, x)), active: me.id, msg: `fib(${n}) ${T('returns', 'تُرجع')} ${me.val}` }); return me.val; };
      call(P.n, 0, -1); return F;
    }
    const a = (P.data || Array.from({ length: P.n }, (_, i) => Math.round(10 + ((i * 37 + 11) % 89)))).slice();
    const snap = (o) => F.push(Object.assign({ arr: a.slice() }, o));
    let cmp = 0, sw = 0;
    const S = new Set();
    if (P.algo === 'bubble') { for (let i = 0; i < a.length; i++) { let any = false; for (let j = 0; j < a.length - 1 - i; j++) { cmp++; snap({ hi: [j, j + 1], sorted: [...S], msg: `compare ${a[j]} and ${a[j + 1]}`, cmp, sw }); if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; sw++; any = true; snap({ hi: [j, j + 1], swap: true, sorted: [...S], msg: 'swap', cmp, sw }); } } S.add(a.length - 1 - i); if (!any) { for (let k = 0; k < a.length; k++) S.add(k); break; } } }
    else if (P.algo === 'insertion') { S.add(0); for (let i = 1; i < a.length; i++) { let j = i; while (j > 0) { cmp++; snap({ hi: [j - 1, j], sorted: [...S], msg: `compare ${a[j - 1]} and ${a[j]}`, cmp, sw }); if (a[j - 1] <= a[j]) break; [a[j - 1], a[j]] = [a[j], a[j - 1]]; sw++; snap({ hi: [j - 1, j], swap: true, sorted: [...S], msg: 'shift left', cmp, sw }); j--; } for (let k = 0; k <= i; k++) S.add(k); } }
    else if (P.algo === 'selection') { for (let i = 0; i < a.length - 1; i++) { let m = i; for (let j = i + 1; j < a.length; j++) { cmp++; snap({ hi: [m, j], sorted: [...S], msg: `smallest so far ${a[m]}, check ${a[j]}`, cmp, sw }); if (a[j] < a[m]) m = j; } if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; sw++; snap({ hi: [i, m], swap: true, sorted: [...S], msg: 'move the smallest into place', cmp, sw }); } S.add(i); } S.add(a.length - 1); }
    else if (P.algo === 'merge') { const ms = (lo, hi) => { if (hi - lo < 1) return; const mid = (lo + hi) >> 1; ms(lo, mid); ms(mid + 1, hi); const L2 = a.slice(lo, mid + 1), R2 = a.slice(mid + 1, hi + 1); let i = 0, j = 0, k = lo; while (i < L2.length || j < R2.length) { cmp++; if (j >= R2.length || (i < L2.length && L2[i] <= R2[j])) a[k++] = L2[i++]; else a[k++] = R2[j++]; sw++; snap({ hi: [k - 1], range: [lo, hi], sorted: [...S], msg: `merge [${lo}…${mid}] with [${mid + 1}…${hi}]`, cmp, sw }); } }; ms(0, a.length - 1); for (let k = 0; k < a.length; k++) S.add(k); }
    else if (P.algo === 'quick') { const qs = (lo, hi) => { if (lo >= hi) { if (lo === hi) S.add(lo); return; } const p = a[hi]; let i = lo; for (let j = lo; j < hi; j++) { cmp++; snap({ hi: [j], pivot: hi, range: [lo, hi], sorted: [...S], msg: `pivot ${p}: is ${a[j]} smaller?`, cmp, sw }); if (a[j] < p) { [a[i], a[j]] = [a[j], a[i]]; sw++; i++; } } [a[i], a[hi]] = [a[hi], a[i]]; sw++; S.add(i); snap({ hi: [i], pivot: i, sorted: [...S], msg: `pivot ${p} is now in its final place`, cmp, sw }); qs(lo, i - 1); qs(i + 1, hi); }; qs(0, a.length - 1); }
    else if (P.algo === 'binary-search') { a.sort((x, y) => x - y); const target = isFinite(P.target) ? P.target : a[Math.floor(a.length * 0.7)]; let lo = 0, hi = a.length - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; cmp++; snap({ hi: [mid], range: [lo, hi], sorted: [], msg: `look for ${target}: middle is ${a[mid]}`, cmp, sw }); if (a[mid] === target) { snap({ hi: [mid], found: mid, range: [mid, mid], sorted: [mid], msg: `found ${target} at index ${mid} after ${cmp} comparisons`, cmp, sw }); return F; } if (a[mid] < target) lo = mid + 1; else hi = mid - 1; } snap({ hi: [], sorted: [], msg: `${target} is not in the list`, cmp, sw }); return F; }
    snap({ hi: [], sorted: a.map((_, i) => i), msg: T('sorted!', 'تم الترتيب!'), cmp, sw, done: true });
    return F;
  }
  R.algorithm = (spec) => (box, api) => {
    const P = Object.assign({}, spec.params); const env = {}; spec.vars.forEach(v => { env[v.name] = v.value; if (v.name === 'n') P.n = Math.round(v.value); });
    let F = frames(P), k = 0, acc = 0;
    const c = canvas(box, 800, 460); c.setAttribute('role', 'img'); c.setAttribute('aria-label', spec.alt || spec.title);
    function draw() {
      const [W, H] = dpr(c), g = c.getContext('2d'); const dark = matchMedia('(prefers-color-scheme: dark)').matches; const f = F[Math.min(k, F.length - 1)];
      g.fillStyle = dark ? '#0f1320' : '#fff'; g.fillRect(0, 0, W, H);
      if (P.algo === 'fibonacci') {
        const nodes = f.nodes, maxD = Math.max(...nodes.map(n => n.depth)) + 1; const leaves = {}; let order = 0;
        const kids = id => nodes.filter(n => n.parent === id);
        const place = n => { const ch = kids(n.id); if (!ch.length) { leaves[n.id] = order++; return leaves[n.id]; } const xs = ch.map(place); leaves[n.id] = (xs[0] + xs[xs.length - 1]) / 2; return leaves[n.id]; };
        nodes.filter(n => n.parent === -1).forEach(place);
        const span = Math.max(1, order - 1), X = id => 40 + leaves[id] / span * (W - 80), Y = d => 40 + d * (H - 90) / Math.max(1, maxD - 1);
        nodes.forEach(n => { if (n.parent >= 0) { g.strokeStyle = '#94a3b8'; g.beginPath(); g.moveTo(X(n.id), Y(n.depth)); g.lineTo(X(n.parent), Y(n.depth - 1)); g.stroke(); } });
        nodes.forEach(n => { g.fillStyle = n.id === f.active ? '#f59e0b' : n.val != null ? '#10b981' : '#7c3aed'; g.beginPath(); g.arc(X(n.id), Y(n.depth), 16, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '600 11px Inter, system-ui'; g.textAlign = 'center'; g.fillText(`f(${n.n})${n.val != null ? '=' + n.val : ''}`, X(n.id), Y(n.depth) + 4); });
        g.textAlign = 'left';
      } else {
        const a = f.arr, n = a.length, mx = Math.max(...a), bw = (W - 60) / n;
        a.forEach((v, i) => {
          const h = v / mx * (H - 110), x = 30 + i * bw, inR = f.range && (i < f.range[0] || i > f.range[1]);
          g.fillStyle = f.found === i ? '#10b981' : (f.hi || []).includes(i) ? (f.swap ? '#f43f5e' : '#f59e0b') : f.pivot === i ? '#ec4899' : (f.sorted || []).includes(i) ? '#10b981' : inR ? (dark ? '#334155' : '#e2e8f0') : '#7c3aed';
          g.fillRect(x + 2, H - 50 - h, bw - 4, h);
          g.fillStyle = dark ? '#e2e8f0' : '#111827'; g.font = `600 ${n > 16 ? 10 : 12}px Inter, system-ui`; g.textAlign = 'center'; g.fillText(v, x + bw / 2, H - 34);
        });
        g.textAlign = 'left';
      }
      g.fillStyle = dark ? '#e2e8f0' : '#111827'; g.font = '600 14px Inter, system-ui'; g.fillText(f.msg || '', 30, 26);
      g.font = '12px Inter, system-ui'; g.fillText(`${T('step', 'خطوة')} ${Math.min(k + 1, F.length)}/${F.length}${f.cmp != null ? ` · ${T('comparisons', 'مقارنات')} ${f.cmp} · ${T('writes/swaps', 'تبديلات')} ${f.sw}` : ''}`, 30, H - 10);
      api.status(f.msg || '');
    }
    draw();
    return {
      stage(i) { if (i === 0) { k = 0; draw(); } },
      tick(dt, sp) { acc += dt * sp * 3; if (acc >= 1) { acc = 0; if (k < F.length - 1) { k++; draw(); } } },
      set(key, v) { env[key] = v; if (key === 'n') { P.n = Math.round(v); P.data = null; F = frames(P); k = 0; draw(); } },
      step(d) { k = clamp(k + d, 0, F.length - 1); draw(); },
      state: () => ({ frame: k, frames: F.length, done: k >= F.length - 1, last: F[F.length - 1] })
    };
  };

  /* ---- diagram: processes, pathways, systems (nodes + labelled arrows) ---- */
  R.diagram = (spec) => (box, api) => {
    const P = spec.params, W = 800, H = 460, N = P.nodes;
    const pos = {};
    if (P.layout === 'cycle') N.forEach((n, i) => { const a = -Math.PI / 2 + i / N.length * 2 * Math.PI; pos[n.id] = [W / 2 + Math.cos(a) * 300, H / 2 + Math.sin(a) * 165]; });
    else if (P.layout === 'hub') { pos[N[0].id] = [W / 2, H / 2]; N.slice(1).forEach((n, i) => { const a = -Math.PI / 2 + i / (N.length - 1) * 2 * Math.PI; pos[n.id] = [W / 2 + Math.cos(a) * 300, H / 2 + Math.sin(a) * 170]; }); }
    else {
      // layered left → right by longest path from the sources
      const layer = {}; N.forEach(n => { layer[n.id] = 0; });
      for (let it = 0; it < N.length; it++) P.edges.forEach(e => { if (layer[e.to] < layer[e.from] + 1 && layer[e.from] + 1 < N.length) layer[e.to] = layer[e.from] + 1; });
      const cols = {}; N.forEach(n => { (cols[layer[n.id]] = cols[layer[n.id]] || []).push(n.id); });
      const nL = Object.keys(cols).length;
      if (nL === 1 || (nL > 5 && P.edges.length <= N.length)) { // a long chain: snake rows
        const per = Math.min(4, N.length); N.forEach((n, i) => { const r = Math.floor(i / per), c0 = i % per, c = r % 2 ? per - 1 - c0 : c0; pos[n.id] = [100 + c * (W - 200) / Math.max(1, per - 1), 70 + r * 120]; });
      } else Object.keys(cols).forEach(l => cols[l].forEach((id, j) => { pos[id] = [90 + l * (W - 180) / Math.max(1, nL - 1), H / 2 + (j - (cols[l].length - 1) / 2) * 110]; }));
    }
    let inner = '<defs><marker id="vsArr" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#7c3aed"/></marker></defs>';
    P.edges.forEach((e, i) => { const [x1, y1] = pos[e.from], [x2, y2] = pos[e.to]; const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d; const sx = x1 + ux * 70, sy = y1 + uy * 30, ex = x2 - ux * 72, ey = y2 - uy * 32; const mx = (sx + ex) / 2 - uy * 18, my = (sy + ey) / 2 + ux * 18; inner += `<g data-k="e${i}" data-from="${esc(e.from)}" data-to="${esc(e.to)}"><path class="vs-edge" d="M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}" fill="none" stroke="#7c3aed" stroke-width="2.2" marker-end="url(#vsArr)"/>${e.label ? `<text x="${mx}" y="${my - 6}" text-anchor="middle" class="vs-elab">${esc(e.label)}</text>` : ''}</g>`; });
    N.forEach(n => { const [x, y] = pos[n.id]; inner += `<g data-k="${esc(n.id)}" class="vs-node" tabindex="0" role="button" aria-label="${esc(n.label)}${n.detail ? ': ' + esc(n.detail) : ''}"><rect x="${x - 72}" y="${y - 30}" width="144" height="60" rx="14"/><foreignObject x="${x - 68}" y="${y - 27}" width="136" height="54"><div xmlns="http://www.w3.org/1999/xhtml" class="vs-ntxt">${esc(n.label)}</div></foreignObject></g>`; });
    const w = document.createElement('div'); w.className = 'vz-svgwrap'; w.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="vz-svg vs-diagram" role="img" aria-label="${esc(spec.alt || spec.title)}">${inner}</svg>`; box.appendChild(w);
    const svg = w.querySelector('svg');
    const pick = id => { const n = N.find(x => x.id === id); if (n) api.status(n.detail ? `${n.label}: ${n.detail}` : n.label); };
    svg.addEventListener('click', e => { const g = e.target.closest('.vs-node'); if (g) { focus([g.dataset.k]); pick(g.dataset.k); } });
    svg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const g = e.target.closest('.vs-node'); if (g) { e.preventDefault(); focus([g.dataset.k]); pick(g.dataset.k); } } });
    function focus(keys) { svg.querySelectorAll('[data-k]').forEach(n => { const k = n.dataset.k; const on = keys.includes(k) || (n.dataset.from && keys.includes(n.dataset.from) && keys.includes(n.dataset.to)); n.classList.toggle('is-hi', on); n.classList.toggle('is-dim', keys.length > 0 && !on); }); }
    let off = 0;
    return { stage(i) { const st = spec.steps[i] || {}; const f = st.focus && st.focus.length ? st.focus : (N[i] ? [N[i].id] : []); focus(f); if (f[0]) pick(f[0]); }, tick(dt, sp) { off -= dt * sp * 40; svg.querySelectorAll('.vs-edge').forEach(p => { p.style.strokeDasharray = '8 6'; p.style.strokeDashoffset = off; }); }, state: () => ({ nodes: N.length, edges: P.edges.length }) };
  };

  /* ---- truss3d: a bridge truss solved by the method of joints ---- */
  function truss(P, load, pos01) {
    const n = P.panels, a = P.span / n, h = P.height, J = [], M = [];
    for (let i = 0; i <= n; i++) J.push([i * a, 0]);
    const bot = i => i;
    if (P.type === 'warren') { for (let i = 0; i < n; i++) J.push([(i + 0.5) * a, h]); const top = i => n + 1 + i; for (let i = 0; i < n; i++) { M.push([bot(i), bot(i + 1)], [bot(i), top(i)], [top(i), bot(i + 1)]); if (i < n - 1) M.push([top(i), top(i + 1)]); } }
    else { for (let i = 1; i < n; i++) J.push([i * a, h]); const top = i => n + i; for (let i = 0; i < n; i++) M.push([bot(i), bot(i + 1)]); for (let i = 1; i < n - 1; i++) M.push([top(i), top(i + 1)]); for (let i = 1; i < n; i++) M.push([top(i), bot(i)]); M.push([bot(0), top(1)], [bot(n), top(n - 1)]); const half = n / 2; for (let i = 1; i < n - 1; i++) { if (P.type === 'pratt') { if (i < half) M.push([top(i), bot(i + 1)]); else M.push([top(i + 1), bot(i)]); } else { if (i < half) M.push([bot(i), top(i + 1)]); else M.push([bot(i + 1), top(i)]); } } }
    const nj = J.length, nm = M.length, nu = nm + 3;
    const A = Array.from({ length: 2 * nj }, () => new Float64Array(nu)), b = new Float64Array(2 * nj);
    M.forEach(([p, q], k) => { const dx = J[q][0] - J[p][0], dy = J[q][1] - J[p][1], L = Math.hypot(dx, dy); A[2 * p][k] += dx / L; A[2 * p + 1][k] += dy / L; A[2 * q][k] -= dx / L; A[2 * q + 1][k] -= dy / L; });
    A[0][nm] = 1; A[1][nm + 1] = 1; A[2 * n + 1][nm + 2] = 1; // pin at the left end, roller at the right
    const loaded = Math.round(pos01 * n); const dead = 0.1 * load;
    for (let i = 0; i <= n; i++) b[2 * i + 1] += dead * (i === 0 || i === n ? 0.5 : 1);
    b[2 * loaded + 1] += load; // downward loads move to the right-hand side as +
    // Gaussian elimination with partial pivoting (square system: 2j = m + 3)
    const m = A.map((r, i) => Array.from(r).concat(b[i]));
    for (let c = 0; c < nu; c++) { let p = c; for (let r = c + 1; r < m.length; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r; [m[c], m[p]] = [m[p], m[c]]; const d = m[c][c]; if (Math.abs(d) < 1e-12) return null; for (let r = 0; r < m.length; r++) if (r !== c) { const f = m[r][c] / d; if (f) for (let k = c; k <= nu; k++) m[r][k] -= f * m[c][k]; } }
    const x = m.map((r, i) => (i < nu ? r[nu] / r[i] : 0));
    return { J, M, F: x.slice(0, nm), R: { Ax: x[nm], Ay: x[nm + 1], By: x[nm + 2] }, loaded };
  }
  R.truss3d = (spec) => async (box, api) => {
    const THREE = await import('three'); const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const P = spec.params, env = { P: 100, pos: 0.5 }; spec.vars.forEach(v => { env[v.name] = v.value; });
    const wrap = document.createElement('div'); wrap.className = 'vz-3d'; box.appendChild(wrap);
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); wrap.appendChild(r.domElement);
    r.domElement.setAttribute('role', 'img'); r.domElement.setAttribute('aria-label', spec.alt || spec.title);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 1000);
    const s = 12 / P.span; // fit to ~12 units
    cam.position.set(4, 5, 13); const ctl = new OrbitControls(cam, r.domElement); ctl.target.set(0, 1, 0); ctl.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.6)); const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(5, 10, 6); scene.add(dl);
    const grp = new THREE.Group(); scene.add(grp);
    const ground = new THREE.Mesh(new THREE.BoxGeometry(16, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0xd6d3cb, roughness: 0.95 })); ground.position.y = -0.6; scene.add(ground);
    let res = null;
    function build() {
      grp.clear();
      res = truss(P, env.P, env.pos); if (!res) { api.status(T('This truss shape is unstable.', 'هذا الشكل غير مستقر.')); return; }
      const maxF = Math.max(...res.F.map(Math.abs), 1e-6), off = -P.span * s / 2;
      const V = (j, z) => new THREE.Vector3(res.J[j][0] * s + off, res.J[j][1] * s, z);
      [-0.9, 0.9].forEach(z => res.M.forEach(([p, q], k) => {
        const f = res.F[k], t = Math.min(1, Math.abs(f) / maxF), a = V(p, z), b = V(q, z), len = a.distanceTo(b);
        const col = Math.abs(f) < maxF * 0.02 ? new THREE.Color(0x9ca3af) : f > 0 ? new THREE.Color().setHSL(0.6, 0.85, 0.65 - 0.3 * t) : new THREE.Color().setHSL(0.0, 0.85, 0.65 - 0.3 * t);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06 + 0.09 * t, 0.06 + 0.09 * t, len, 10), new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.3 }));
        m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); grp.add(m);
      }));
      const deck = new THREE.Mesh(new THREE.BoxGeometry(P.span * s, 0.08, 1.8), new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.8 })); deck.position.set(0, -0.05, 0); grp.add(deck);
      // cross beams and supports
      for (let i = 0; i <= P.panels; i++) { const x = res.J[i][0] * s + off; const cb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.8), new THREE.MeshStandardMaterial({ color: 0x4b5563 })); cb.position.set(x, 0, 0); grp.add(cb); }
      [0, P.panels].forEach((i, k) => { const sup = new THREE.Mesh(k ? new THREE.CylinderGeometry(0.25, 0.25, 2.2, 16) : new THREE.ConeGeometry(0.35, 0.55, 4), new THREE.MeshStandardMaterial({ color: 0x374151 })); if (k) { sup.rotation.x = Math.PI / 2; sup.position.set(res.J[i][0] * s + off, -0.3, 0); } else sup.position.set(res.J[i][0] * s + off, -0.33, 0); grp.add(sup); });
      // the load: an arrow on the loaded joint
      const lx = res.J[res.loaded][0] * s + off; const arr = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(lx, 2.2 + P.height * s, 0), 2 + P.height * s - 0.1, 0xf59e0b, 0.45, 0.3); grp.add(arr);
      const maxT = Math.max(...res.F), maxC = Math.min(...res.F);
      api.status(`${T('Load', 'الحمل')} ${fmt(env.P)} kN ${T('at joint', 'عند العقدة')} ${res.loaded} · ${T('reactions', 'ردود الأفعال')} A = ${fmt(res.R.Ay)} kN, B = ${fmt(res.R.By)} kN · ${T('max tension', 'أقصى شد')} ${fmt(maxT)} kN (${T('blue', 'أزرق')}) · ${T('max compression', 'أقصى ضغط')} ${fmt(-maxC)} kN (${T('red', 'أحمر')})`);
    }
    build();
    function size() { const w = wrap.clientWidth || 800, h = wrap.clientHeight || 450; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    const ro = new ResizeObserver(size); ro.observe(wrap); size();
    let sweep = false, sx = 0;
    return {
      stage(i) { const st = spec.steps[i] || {}; sweep = (st.focus || []).includes('sweep'); },
      tick(dt, sp) { if (sweep) { sx += dt * sp * 0.15; const p = (Math.sin(sx * Math.PI) + 1) / 2; if (Math.round(p * P.panels) !== Math.round(env.pos * P.panels)) { env.pos = p; build(); } } ctl.update(); r.render(scene, cam); },
      set(k, v) { env[k] = v; build(); },
      state: () => ({ reactions: res && res.R, forces: res && res.F.slice(), members: res && res.M.length, loaded: res && res.loaded }),
      destroy() { ro.disconnect(); ctl.dispose(); r.dispose(); }
    };
  };

  /* ---- beam: reactions, shear force, bending moment, deflection and bending stress ---- */
  function beamCalc(P, env) {
    const L = P.span, Pl = env.P || 0, a = clamp(env.a != null ? env.a : L / 2, 0, L), w = env.w || 0, n = 200, xs = [], V = [], Mo = [];
    let RA = 0, RB = 0, MA = 0;
    if (P.support === 'simple') { RA = Pl * (L - a) / L + w * L / 2; RB = Pl * a / L + w * L / 2; }
    else { RA = Pl + w * L; MA = -(Pl * a + w * L * L / 2); }
    for (let k = 0; k <= n; k++) { const x = L * k / n; xs.push(x);
      if (P.support === 'simple') { V.push(RA - w * x - (x > a ? Pl : 0)); Mo.push(RA * x - w * x * x / 2 - (x > a ? Pl * (x - a) : 0)); }
      else { V.push((x < a ? Pl : 0) + w * (L - x)); Mo.push(-(x < a ? Pl * (a - x) : 0) - w * (L - x) * (L - x) / 2); } }
    // deflection: integrate M/EI twice (EI = 1, shape only), with the right boundary conditions
    const h = L / n, th = [0], y = [0]; for (let k = 1; k <= n; k++) { th.push(th[k - 1] + (Mo[k] + Mo[k - 1]) / 2 * h); y.push(y[k - 1] + (th[k] + th[k - 1]) / 2 * h); }
    if (P.support === 'simple') { const c = y[n] / L; for (let k = 0; k <= n; k++) y[k] -= c * xs[k]; }
    return { xs, V, M: Mo, y, RA, RB, MA, a };
  }
  R.beam = (spec) => (box, api) => {
    const P = spec.params, env = { P: 10, a: P.span / 2, w: 0 }; spec.vars.forEach(v => { env[v.name] = v.value; });
    const c = canvas(box, 800, 460); c.setAttribute('role', 'img'); c.setAttribute('aria-label', spec.alt || spec.title);
    let res = null;
    function draw() {
      res = beamCalc(P, env); const [W, H] = dpr(c), g = c.getContext('2d'); const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      g.fillStyle = dark ? '#0f1320' : '#fff'; g.fillRect(0, 0, W, H);
      const L = P.span, X = x => 60 + x / L * (W - 120), n = res.xs.length - 1;
      const Mmax = Math.max(...res.M.map(Math.abs), 1e-9), Vmax = Math.max(...res.V.map(Math.abs), 1e-9), ymax = Math.max(...res.y.map(Math.abs), 1e-12);
      // beam with bending-stress colouring (top and bottom fibres) and exaggerated deflection
      const by = 110, bh = 26;
      for (let k = 0; k < n; k++) { const m = res.M[k] / Mmax, dy = res.y[k] / ymax * 22; const x = X(res.xs[k]), w2 = X(res.xs[k + 1]) - x + 1;
        const top = m > 0 ? `rgba(239,68,68,${Math.abs(m)})` : `rgba(59,130,246,${Math.abs(m)})`, bot = m > 0 ? `rgba(59,130,246,${Math.abs(m)})` : `rgba(239,68,68,${Math.abs(m)})`;
        const gr = g.createLinearGradient(0, by - bh / 2 - dy, 0, by + bh / 2 - dy); gr.addColorStop(0, top); gr.addColorStop(0.5, dark ? '#475569' : '#cbd5e1'); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(x, by - bh / 2 - dy, w2, bh); }
      g.fillStyle = dark ? '#94a3b8' : '#374151';
      if (P.support === 'simple') { [0, L].forEach((x, i) => { g.beginPath(); g.moveTo(X(x), by + bh / 2); g.lineTo(X(x) - 12, by + bh / 2 + 18); g.lineTo(X(x) + 12, by + bh / 2 + 18); g.closePath(); g.fill(); if (i) { g.beginPath(); g.arc(X(x) - 6, by + bh / 2 + 23, 4, 0, 7); g.arc(X(x) + 6, by + bh / 2 + 23, 4, 0, 7); g.fill(); } }); }
      else g.fillRect(X(0) - 18, by - 50, 18, 100);
      const arrow = (x, y0, y1, col) => { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); g.beginPath(); g.moveTo(x, y1); g.lineTo(x - 6, y1 - 10); g.lineTo(x + 6, y1 - 10); g.closePath(); g.fill(); };
      if (env.P) { arrow(X(res.a), 30, by - bh / 2 - 4, '#f59e0b'); g.font = '600 12px Inter, system-ui'; g.fillText(`P = ${fmt(env.P)} kN`, X(res.a) + 8, 40); }
      if (env.w) { for (let x = 0; x <= L + 1e-9; x += L / 12) arrow(X(x), 62, by - bh / 2 - 4, '#10b981'); g.fillStyle = '#10b981'; g.fillText(`w = ${fmt(env.w)} kN/m`, X(L) - 90, 56); }
      // shear force and bending moment diagrams
      const plot = (arr, mx, y0, hh, col, lab) => { g.strokeStyle = dark ? '#334155' : '#e5e7eb'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(0), y0); g.lineTo(X(L), y0); g.stroke(); g.fillStyle = col.replace('1)', '.18)'); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0), y0); arr.forEach((v, k) => g.lineTo(X(res.xs[k]), y0 - v / mx * hh)); g.lineTo(X(L), y0); g.closePath(); g.fill(); g.beginPath(); arr.forEach((v, k) => (k ? g.lineTo(X(res.xs[k]), y0 - v / mx * hh) : g.moveTo(X(res.xs[k]), y0 - v / mx * hh))); g.stroke(); g.fillStyle = dark ? '#e2e8f0' : '#111827'; g.font = '600 12px Inter, system-ui'; g.fillText(lab, 8, y0 - hh + 4); };
      plot(res.V, Vmax, 250, 50, 'rgba(14,165,233,1)', T('Shear V', 'القص V'));
      plot(res.M, Mmax, 385, 60, 'rgba(124,58,237,1)', T('Moment M', 'العزم M'));
      const iM = res.M.reduce((b, v, k) => (Math.abs(v) > Math.abs(res.M[b]) ? k : b), 0);
      api.status(`${P.support === 'simple' ? `R_A = ${fmt(res.RA)} kN, R_B = ${fmt(res.RB)} kN` : `R = ${fmt(res.RA)} kN, M_fixed = ${fmt(res.MA)} kN·m`} · ${T('max |M|', 'أقصى عزم')} = ${fmt(Math.abs(res.M[iM]))} kN·m ${T('at', 'عند')} x = ${fmt(res.xs[iM])} m · ${T('red = compression, blue = tension', 'الأحمر ضغط والأزرق شد')}`);
    }
    draw();
    return { stage() { draw(); }, tick() {}, set(k, v) { env[k] = v; draw(); }, state: () => ({ RA: res.RA, RB: res.RB, MA: res.MA, Mmax: Math.max(...res.M.map(Math.abs)) }) };
  };

  /* ---- matrix2d: a 2×2 matrix as a transformation of the plane ---- */
  R.matrix2d = (spec) => (box, api) => {
    const env = { a: 1, b: 1, c: 0, d: 1 }; spec.vars.forEach(v => { env[v.name] = v.value; });
    const c = canvas(box, 800, 460); c.setAttribute('role', 'img'); c.setAttribute('aria-label', spec.alt || spec.title);
    let t = 1, dir = 0;
    function draw() {
      const [W, H] = dpr(c), g = c.getContext('2d'); const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      g.fillStyle = dark ? '#0f1320' : '#fff'; g.fillRect(0, 0, W, H);
      const s = 42, ox = W / 2, oy = H / 2; const m = [1 + (env.a - 1) * t, env.b * t, env.c * t, 1 + (env.d - 1) * t];
      const P = (x, y) => [ox + (m[0] * x + m[1] * y) * s, oy - (m[2] * x + m[3] * y) * s];
      g.strokeStyle = dark ? '#1e293b' : '#eef2f7'; g.lineWidth = 1; for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(ox + k * s, 0); g.lineTo(ox + k * s, H); g.moveTo(0, oy - k * s); g.lineTo(W, oy - k * s); g.stroke(); }
      g.strokeStyle = 'rgba(124,58,237,.35)'; for (let k = -10; k <= 10; k++) { g.beginPath(); g.moveTo(...P(k, -10)); g.lineTo(...P(k, 10)); g.moveTo(...P(-10, k)); g.lineTo(...P(10, k)); g.stroke(); }
      g.fillStyle = 'rgba(245,158,11,.35)'; g.beginPath(); g.moveTo(...P(0, 0)); g.lineTo(...P(1, 0)); g.lineTo(...P(1, 1)); g.lineTo(...P(0, 1)); g.closePath(); g.fill();
      const vec = (x, y, col, lab) => { const [px, py] = P(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(ox, oy); g.lineTo(px, py); g.stroke(); const an = Math.atan2(py - oy, px - ox); g.beginPath(); g.moveTo(px, py); g.lineTo(px - 10 * Math.cos(an - 0.4), py - 10 * Math.sin(an - 0.4)); g.lineTo(px - 10 * Math.cos(an + 0.4), py - 10 * Math.sin(an + 0.4)); g.closePath(); g.fill(); g.font = '600 13px Inter, system-ui'; g.fillText(lab, px + 6, py - 6); };
      vec(1, 0, '#10b981', 'î'); vec(0, 1, '#ef4444', 'ĵ');
      const det = env.a * env.d - env.b * env.c, tr = env.a + env.d, disc = tr * tr - 4 * det;
      let eig = T('no real eigenvectors (a rotation component)', 'لا متجهات ذاتية حقيقية');
      if (t > 0.99 && disc >= 0) { const ls = [(tr + Math.sqrt(disc)) / 2, (tr - Math.sqrt(disc)) / 2]; eig = 'λ = ' + ls.map(fmt).join(', '); ls.forEach(l => { let vx = env.b, vy = l - env.a; if (Math.abs(vx) + Math.abs(vy) < 1e-9) { vx = l - env.d; vy = env.c; } if (Math.abs(vx) + Math.abs(vy) < 1e-9) { vx = 1; vy = 0; } const nn = Math.hypot(vx, vy); g.setLineDash([6, 6]); g.strokeStyle = '#0ea5e9'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ox - vx / nn * 600, oy + vy / nn * 600); g.lineTo(ox + vx / nn * 600, oy - vy / nn * 600); g.stroke(); g.setLineDash([]); }); }
      g.fillStyle = dark ? '#e2e8f0' : '#111827'; g.font = '600 14px Inter, system-ui'; g.fillText(`[ ${fmt(env.a)}  ${fmt(env.b)} ; ${fmt(env.c)}  ${fmt(env.d)} ]`, 16, 26);
      api.status(`det = ${fmt(det)} (${T('area scale of the yellow square', 'معامل مساحة المربع الأصفر')}${det < 0 ? T(', orientation flipped', '، مع انقلاب الاتجاه') : ''}) · ${eig}`);
    }
    draw();
    return { stage(i) { if (i === 0) { t = 0; dir = 1; } draw(); }, tick(dt, sp) { if (dir) { t = Math.min(1, t + dt * sp * 0.5); if (t >= 1) dir = 0; draw(); } }, set(k, v) { env[k] = v; t = 1; draw(); }, state: () => Object.assign({ t }, env) };
  };

  /* ---- chart: bar / line / pie from supplied numbers ---- */
  R.chart = (spec) => (box) => {
    const P = spec.params, W = 800, H = 460, pad = 52, COL = ['#38bdf8', '#a78bfa', '#f59e0b'];
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'vs-svg vs-chart'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', spec.alt || spec.title);
    box.appendChild(svg);
    let hi = -1;
    const el = (tag, at, txt) => { const e = document.createElementNS(NS, tag); Object.keys(at).forEach(k => e.setAttribute(k, at[k])); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };
    const fmtv = v => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : +v.toFixed(2)) + (P.unit ? ' ' + P.unit : '');
    function draw() {
      svg.textContent = '';
      const L = P.labels, S = P.series;
      if (P.type === 'pie') {
        const vals = S[0].values.map(v => Math.max(0, v)), tot = vals.reduce((a, b) => a + b, 0) || 1; let a0 = -Math.PI / 2;
        vals.forEach((v, i) => { const a1 = a0 + v / tot * 2 * Math.PI, r = i === hi ? 182 : 170, cx = W / 2 - 120, cy = H / 2; const big = a1 - a0 > Math.PI ? 1 : 0;
          el('path', { d: `M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${big} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`, fill: `hsl(${(i * 47 + 200) % 360} 70% 58%)`, stroke: 'var(--vz-bg, #0b1220)', 'stroke-width': 2, 'data-i': i, class: 'vs-bar' });
          el('text', { x: W / 2 + 90, y: 70 + i * 26, class: 'vs-lbl', 'font-size': 14, fill: 'currentColor' }, `■ ${L[i]} — ${fmtv(v)} (${Math.round(v / tot * 100)}%)`).setAttribute('style', `fill:hsl(${(i * 47 + 200) % 360} 70% 62%)`);
          a0 = a1; });
        return;
      }
      const all = S.flatMap(se => se.values), mn = Math.min(0, ...all), mx = Math.max(0, ...all) || 1;
      const Y = v => H - pad - (v - mn) / (mx - mn) * (H - 2 * pad), bw = (W - 2 * pad) / L.length;
      for (let k = 0; k <= 4; k++) { const v = mn + (mx - mn) * k / 4; el('line', { x1: pad, x2: W - pad / 2, y1: Y(v), y2: Y(v), class: 'vs-grid', stroke: 'currentColor', 'stroke-opacity': .14 }); el('text', { x: pad - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'currentColor', opacity: .7 }, fmtv(v)); }
      L.forEach((l, i) => el('text', { x: pad + bw * (i + .5), y: H - pad + 18, 'text-anchor': 'middle', 'font-size': 12, fill: 'currentColor', 'font-weight': i === hi ? 700 : 400 }, l));
      S.forEach((se, j) => {
        if (P.type === 'line') {
          el('polyline', { points: se.values.map((v, i) => `${pad + bw * (i + .5)},${Y(v)}`).join(' '), fill: 'none', stroke: COL[j], 'stroke-width': 3 });
          se.values.forEach((v, i) => { el('circle', { cx: pad + bw * (i + .5), cy: Y(v), r: i === hi ? 7 : 4.5, fill: COL[j], class: 'vs-bar', 'data-i': i }); if (P.labelsOn) el('text', { x: pad + bw * (i + .5), y: Y(v) - 10, 'text-anchor': 'middle', 'font-size': 11, fill: 'currentColor' }, fmtv(v)); });
        } else {
          const w = bw * .7 / S.length;
          se.values.forEach((v, i) => { const x = pad + bw * i + bw * .15 + w * j; el('rect', { x, y: Math.min(Y(v), Y(0)), width: w, height: Math.abs(Y(v) - Y(0)), rx: 4, fill: COL[j], opacity: hi < 0 || hi === i ? 1 : .35, class: 'vs-bar', 'data-i': i }); if (P.labelsOn) el('text', { x: x + w / 2, y: Math.min(Y(v), Y(0)) - 6, 'text-anchor': 'middle', 'font-size': 11, fill: 'currentColor' }, fmtv(v)); });
        }
      });
      if (S.length > 1) S.forEach((se, j) => el('text', { x: W - pad, y: 22 + j * 18, 'text-anchor': 'end', 'font-size': 12, fill: COL[j] }, '■ ' + se.name));
      if (P.source) el('text', { x: pad, y: H - 8, 'font-size': 11, fill: 'currentColor', opacity: .65 }, 'Source: ' + P.source);
    }
    svg.addEventListener('pointermove', e => { const b = e.target.closest('[data-i]'); const n = b ? +b.dataset.i : -1; if (n !== hi) { hi = n; draw(); } });
    draw();
    return { stage(i) { const st = spec.steps[i] || {}; const f = (st.focus || [])[0]; const k = f != null ? P.labels.findIndex(l => l.toLowerCase() === String(f).toLowerCase()) : -1; hi = k; draw(); }, tick() {}, set(k, v) { if (k === 'labelsOn') { P.labelsOn = !!v; draw(); } }, state: () => ({ type: P.type, bars: P.labels.length, highlight: hi }) };
  };

  /* ---- timeline: dated events along an axis ---- */
  R.timeline = (spec) => (box) => {
    const E = spec.params.events, W = 800, H = 460;
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'vs-svg vs-timeline'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', spec.alt || spec.title);
    box.appendChild(svg);
    const x = i => 60 + i * (W - 120) / Math.max(1, E.length - 1);
    svg.innerHTML = `<line x1="40" x2="${W - 40}" y1="${H / 2}" y2="${H / 2}" stroke="currentColor" stroke-opacity=".35" stroke-width="3"/>` + E.map((e, i) => { const up = i % 2 === 0, y = up ? H / 2 - 70 : H / 2 + 70; return `<g class="vs-node" data-id="t${i}"><line x1="${x(i)}" x2="${x(i)}" y1="${H / 2}" y2="${y + (up ? 26 : -26)}" stroke="currentColor" stroke-opacity=".3"/><circle cx="${x(i)}" cy="${H / 2}" r="9" fill="#38bdf8"/><text x="${x(i)}" y="${y - 6}" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">${esc(e.when)}</text><text x="${x(i)}" y="${y + 12}" text-anchor="middle" font-size="12" fill="currentColor" opacity=".85">${esc(e.label.length > 26 ? e.label.slice(0, 25) + '…' : e.label)}</text></g>`; }).join('');
    const focus = ids => svg.querySelectorAll('.vs-node').forEach(g => { const on = !ids.length || ids.includes(g.dataset.id); g.style.opacity = on ? 1 : .3; g.querySelector('circle').setAttribute('r', ids.includes(g.dataset.id) ? 13 : 9); });
    return { stage(i) { const st = spec.steps[i] || {}; focus(st.focus && st.focus.length ? st.focus : ['t' + i]); }, tick() {}, state: () => ({ events: E.length }) };
  };

  /* ---- scene2d: an open-ended 2D composition (SVG): hover/tap for detail, layers, zoom & pan, animation ---- */
  R.scene2d = (spec) => (box, api) => {
    const P = spec.params, VB = [0, 0, P.w, P.h];
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'vs-svg vs-compose'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', spec.alt || spec.title);
    svg.setAttribute('viewBox', VB.join(' ')); box.appendChild(svg);
    svg.innerHTML = '<defs><marker id="vsArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>';
    const root = document.createElementNS(NS, 'g'); svg.appendChild(root);
    const hidden = new Set(); let showLabels = P.labelsAll !== false, t = 0, focus = [];
    const el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) if (at[k] != null) e.setAttribute(k, at[k]); return e; };
    const nodes = {};
    P.elements.forEach(e => {
      const g = el('g', { class: 'vs-node vs-c', 'data-id': e.id, tabindex: e.detail || e.label ? 0 : null, role: e.detail || e.label ? 'button' : null, 'aria-label': e.label || null });
      const st = { fill: e.fill || (e.shape === 'line' || e.shape === 'arrow' ? 'none' : 'rgba(148,163,184,.25)'), stroke: e.stroke || (e.shape === 'text' ? 'none' : 'currentColor'), 'stroke-width': e.sw, opacity: e.opacity };
      let shape;
      if (e.shape === 'rect') shape = el('rect', Object.assign({ x: e.x - e.w / 2, y: e.y - e.h / 2, width: e.w, height: e.h, rx: e.rx }, st));
      else if (e.shape === 'circle') shape = el('circle', Object.assign({ cx: e.x, cy: e.y, r: e.r }, st));
      else if (e.shape === 'ellipse') shape = el('ellipse', Object.assign({ cx: e.x, cy: e.y, rx: e.w / 2, ry: e.h / 2 }, st));
      else if (e.shape === 'line' || e.shape === 'arrow') shape = el('line', Object.assign({ x1: e.x, y1: e.y, x2: e.x2, y2: e.y2, 'marker-end': e.shape === 'arrow' ? 'url(#vsArr)' : null }, st, { fill: null, stroke: e.stroke || 'currentColor' }));
      else if ((e.shape === 'polygon' || e.shape === 'path') && e.points && e.points.length > 1) shape = el(e.shape === 'polygon' ? 'polygon' : 'polyline', Object.assign({ points: e.points.map(q => q.join(',')).join(' ') }, st, e.shape === 'path' ? { fill: 'none' } : {}));
      else if (e.shape === 'text') { shape = el('text', { x: e.x, y: e.y, 'font-size': e.size, 'text-anchor': 'middle', fill: e.fill || 'currentColor' }); shape.textContent = e.text || e.label; }
      if (!shape) return;
      if (e.anim && e.anim.type === 'flow') shape.setAttribute('stroke-dasharray', '2 1.5');
      g.appendChild(shape);
      if (e.label && e.shape !== 'text') { const tx = el('text', { class: 'vs-c__lbl', x: e.shape === 'line' || e.shape === 'arrow' ? (e.x + e.x2) / 2 : e.x, y: (e.shape === 'line' || e.shape === 'arrow' ? (e.y + e.y2) / 2 - 1.6 : e.shape === 'circle' ? e.y + e.r + 3.2 : e.y + e.h / 2 + 3.2), 'font-size': 2.4, 'text-anchor': 'middle', fill: 'currentColor' }); tx.textContent = e.label; g.appendChild(tx); }
      root.appendChild(g); nodes[e.id] = { g, e, shape };
    });
    // zoom (wheel / pinch via buttons) and pan (drag)
    let zoom = 1, px = 0, py = 0, drag = null;
    const view = () => { const w = P.w / zoom, h = P.h / zoom; svg.setAttribute('viewBox', `${clamp(px, -P.w / 2, P.w - w / 2)} ${clamp(py, -P.h / 2, P.h - h / 2)} ${w} ${h}`); };
    svg.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 6); view(); }, { passive: false });
    svg.addEventListener('pointerdown', e => { if (e.target.closest('[data-id][tabindex]')) return; drag = [e.clientX, e.clientY, px, py]; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', e => { if (!drag) return; const k = P.w / zoom / svg.clientWidth; px = drag[2] - (e.clientX - drag[0]) * k; py = drag[3] - (e.clientY - drag[1]) * k; view(); });
    svg.addEventListener('pointerup', () => { drag = null; });
    const pick = id => { const nd = nodes[id]; if (!nd) return; Object.values(nodes).forEach(x => x.g.classList.toggle('is-on', x === nd)); api.status(`${nd.e.label || ''}${nd.e.detail ? ' — ' + nd.e.detail : ''}`); };
    svg.addEventListener('click', e => { const g = e.target.closest('[data-id]'); if (g) pick(g.dataset.id); });
    svg.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.id) { e.preventDefault(); pick(e.target.dataset.id); } });
    // layer toggles + zoom buttons
    const bar = document.createElement('div'); bar.className = 'vs-tools';
    bar.innerHTML = P.layers.map(l => `<label><input type="checkbox" checked data-layer="${l.id}"> ${esc(l.label)}</label>`).join('') + `<button type="button" data-z="in" aria-label="${T('Zoom in', 'تكبير')}">＋</button><button type="button" data-z="out" aria-label="${T('Zoom out', 'تصغير')}">－</button><button type="button" data-z="reset">${T('Reset view', 'إعادة العرض')}</button>` + (P.scale === 'schematic' ? `<span class="vs-tools__note">${T('Schematic — not to scale', 'تخطيطي — ليس بمقياس حقيقي')}</span>` : '');
    box.appendChild(bar);
    bar.addEventListener('change', e => { const c = e.target.closest('[data-layer]'); if (!c) return; c.checked ? hidden.delete(c.dataset.layer) : hidden.add(c.dataset.layer); paint(); });
    bar.addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (!b) return; if (b.dataset.z === 'reset') { zoom = 1; px = py = 0; } else zoom = clamp(zoom * (b.dataset.z === 'in' ? 1.4 : 1 / 1.4), 1, 6); view(); });
    function paint() {
      Object.values(nodes).forEach(({ g, e, shape }) => {
        g.style.display = e.layer && hidden.has(e.layer) ? 'none' : '';
        g.style.opacity = focus.length && !focus.includes(e.id) ? 0.28 : 1;
        g.classList.toggle('is-focus', focus.includes(e.id));
        const lbl = g.querySelector('.vs-c__lbl'); if (lbl) lbl.style.display = showLabels ? '' : 'none';
        const a = e.anim; if (!a) return;
        const ph = (t / a.period) % 1, s = Math.sin(ph * 2 * Math.PI);
        if (a.type === 'move' && a.to) { const k = (1 - Math.cos(ph * 2 * Math.PI)) / 2; g.setAttribute('transform', `translate(${(a.to[0] - e.x) * k} ${(a.to[1] - e.y) * k})`); }
        else if (a.type === 'rotate' || a.type === 'spin') g.setAttribute('transform', `rotate(${ph * a.deg} ${e.x} ${e.y})`);
        else if (a.type === 'pulse') g.setAttribute('transform', `translate(${e.x} ${e.y}) scale(${1 + 0.12 * s}) translate(${-e.x} ${-e.y})`);
        else if (a.type === 'bob') g.setAttribute('transform', `translate(0 ${s * 1.5})`);
        else if (a.type === 'flow') shape.setAttribute('stroke-dashoffset', -t * 6 / a.period);
        else if (a.type === 'orbit') { const c = a.around && nodes[a.around] ? nodes[a.around].e : { x: P.w / 2, y: P.h / 2 }, R0 = a.radius || Math.hypot(e.x - c.x, e.y - c.y), an = ph * 2 * Math.PI; g.setAttribute('transform', `translate(${c.x + R0 * Math.cos(an) - e.x} ${c.y + R0 * Math.sin(an) - e.y})`); }
      });
    }
    paint();
    return {
      stage(i) { const st = spec.steps[i] || {}; focus = st.focus || []; if (focus[0]) pick(focus[0]); paint(); },
      tick(dt, sp) { if (P.elements.some(e => e.anim)) { t += dt * sp; paint(); } },
      set(k, v) { if (k === 'labels') { showLabels = !!v; paint(); } },
      state: () => ({ elements: P.elements.length, layers: P.layers.length, hidden: [...hidden], labels: showLabels, zoom })
    };
  };

  /* ---- scene3d: an open-ended 3D composition (three.js): orbit camera, labels, layers, orbits & spins ---- */
  R.scene3d = (spec) => async (box, api) => {
    const THREE = await import('three'); const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const P = spec.params;
    const wrap = document.createElement('div'); wrap.className = 'vs-3d'; box.appendChild(wrap);
    const cv = document.createElement('canvas'); cv.className = 'vz-canvas'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', spec.alt || spec.title); wrap.appendChild(cv);
    const lblBox = document.createElement('div'); lblBox.className = 'vs-3d__labels'; lblBox.setAttribute('aria-hidden', 'true'); wrap.appendChild(lblBox);
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 4000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.2)); const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(5, 8, 6); scene.add(sun);
    const ext = Math.max(4, ...P.objects.map(o => Math.hypot(...o.pos) + Math.max(...o.size) + (o.anim && o.anim.radius || 0)));
    cam.position.set(ext * 0.9, ext * 0.7, ext * 1.3); const ctl = new OrbitControls(cam, r.domElement); ctl.enableDamping = true; if (P.camera) cam.position.setLength(P.camera);
    const mats = [], geos = [], items = {}, hidden = new Set(); let showLabels = true, t = 0, focus = [];
    P.objects.forEach(o => {
      const [a, b, c] = [o.size[0], o.size[1] || o.size[0], o.size[2] || o.size[0]];
      const g = o.shape === 'sphere' ? new THREE.SphereGeometry(a, 32, 20) : o.shape === 'box' ? new THREE.BoxGeometry(a, b, c) : o.shape === 'cylinder' ? new THREE.CylinderGeometry(a, a, b, 32) : o.shape === 'cone' ? new THREE.ConeGeometry(a, b, 32) : o.shape === 'torus' ? new THREE.TorusGeometry(a, Math.max(0.02, b * 0.25), 16, 64) : o.shape === 'ring' ? new THREE.RingGeometry(a, a + Math.max(0.02, b * 0.15), 64) : new THREE.ConeGeometry(a * 0.3, b, 12);
      const m = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.5, metalness: 0.1, emissive: o.emissive ? o.color : 0x000000, emissiveIntensity: o.emissive ? 0.9 : 0, side: o.shape === 'ring' ? THREE.DoubleSide : THREE.FrontSide });
      const mesh = new THREE.Mesh(g, m); mesh.position.set(...o.pos); mesh.rotation.set(...o.rot.map(d => d * Math.PI / 180)); mesh.userData.id = o.id;
      scene.add(mesh); mats.push(m); geos.push(g);
      const lab = document.createElement('span'); lab.textContent = o.label || ''; lblBox.appendChild(lab);
      items[o.id] = { o, mesh, lab, home: mesh.position.clone() };
      if (o.anim && o.anim.type === 'orbit') { const ring = new THREE.Mesh(new THREE.RingGeometry(o.anim.radius - 0.01, o.anim.radius + 0.01, 128), new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; scene.add(ring); items[o.id].ring = ring; geos.push(ring.geometry); mats.push(ring.material); }
    });
    const lines = P.links.map(l => { const g = new THREE.BufferGeometry().setFromPoints([items[l.from].mesh.position, items[l.to].mesh.position]); const m = new THREE.LineBasicMaterial({ color: 0x94a3b8 }); const ln = new THREE.Line(g, m); scene.add(ln); geos.push(g); mats.push(m); return { l, ln }; });
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    const pick = id => { const it = items[id]; if (!it) return; api.status(`${it.o.label || ''}${it.o.detail ? ' — ' + it.o.detail : ''}`); Object.values(items).forEach(x => { x.mesh.material.emissiveIntensity = x === it ? 0.6 : (x.o.emissive ? 0.9 : 0); if (x === it && !x.o.emissive) x.mesh.material.emissive.set(0x334155); }); };
    cv.addEventListener('click', e => { const rc = cv.getBoundingClientRect(); ptr.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(ptr, cam); const hit = ray.intersectObjects(Object.values(items).map(x => x.mesh))[0]; if (hit) pick(hit.object.userData.id); });
    const bar = document.createElement('div'); bar.className = 'vs-tools';
    bar.innerHTML = P.layers.map(l => `<label><input type="checkbox" checked data-layer="${l.id}"> ${esc(l.label)}</label>`).join('') + `<button type="button" data-v3="reset">${T('Reset camera', 'إعادة الكاميرا')}</button>` + (P.scale === 'schematic' ? `<span class="vs-tools__note">${T('Schematic — sizes and distances not to scale', 'تخطيطي — الأحجام والمسافات ليست بمقياس حقيقي')}</span>` : '');
    box.appendChild(bar);
    bar.addEventListener('change', e => { const c = e.target.closest('[data-layer]'); if (!c) return; c.checked ? hidden.delete(c.dataset.layer) : hidden.add(c.dataset.layer); });
    bar.addEventListener('click', e => { if (e.target.closest('[data-v3="reset"]')) { cam.position.set(ext * 0.9, ext * 0.7, ext * 1.3); ctl.target.set(0, 0, 0); } });
    const v = new THREE.Vector3();
    function frame() {
      const W = wrap.clientWidth || 800, H = Math.round(W * 9 / 16); if (cv.width !== Math.round(W * r.getPixelRatio())) { r.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
      Object.values(items).forEach(({ o, mesh, lab, home, ring }) => {
        const vis = !(o.layer && hidden.has(o.layer)); mesh.visible = vis; if (ring) ring.visible = vis;
        const a = o.anim;
        if (a) { const ph = (t / a.period) % 1, an = ph * 2 * Math.PI;
          if (a.type === 'orbit') { const c = a.around && items[a.around] ? items[a.around].mesh.position : new THREE.Vector3(); mesh.position.set(c.x + a.radius * Math.cos(an), home.y, c.z - a.radius * Math.sin(an)); if (ring) ring.position.set(c.x, home.y, c.z); }
          else if (a.type === 'spin' || a.type === 'rotate') mesh.rotation.y = an;
          else if (a.type === 'bob') mesh.position.y = home.y + Math.sin(an) * 0.3;
          else if (a.type === 'pulse') mesh.scale.setScalar(1 + 0.1 * Math.sin(an));
          else if (a.type === 'move' && a.to) { const k = (1 - Math.cos(an)) / 2; mesh.position.set(home.x + (a.to[0] - home.x) * k, home.y + (a.to[1] - home.y) * k, home.z + ((a.to[2] || home.z) - home.z) * k); }
        }
        mesh.material.opacity = 1; mesh.material.transparent = focus.length > 0 && !focus.includes(o.id); if (mesh.material.transparent) mesh.material.opacity = 0.25;
        v.copy(mesh.position).project(cam);
        const on = vis && showLabels && o.label && v.z < 1; lab.style.display = on ? '' : 'none';
        if (on) lab.style.transform = `translate(${(v.x + 1) / 2 * W}px, ${(1 - v.y) / 2 * H}px) translate(-50%, -150%)`;
      });
      lines.forEach(({ ln, l }) => { ln.geometry.setFromPoints([items[l.from].mesh.position, items[l.to].mesh.position]); });
      ctl.update(); r.render(scene, cam);
    }
    frame();
    return {
      stage(i) { const st = spec.steps[i] || {}; focus = st.focus || []; if (focus[0]) pick(focus[0]); frame(); },
      tick(dt, sp) { t += dt * sp; frame(); },
      set(k, val) { if (k === 'labels') { showLabels = !!val; frame(); } },
      state: () => ({ objects: P.objects.length, labels: showLabels, hidden: [...hidden], positions: Object.fromEntries(Object.values(items).map(x => [x.o.id, x.mesh.position.toArray().map(n => +n.toFixed(2))])) }),
      destroy() { geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); r.dispose(); ctl.dispose(); }
    };
  };

  /* ======================= spec → scene for the visual player ======================= */
  function toScene(spec) {
    if (spec.kind === 'scene') { const SC = ERLY.visuals.scenes[spec.params.id]; return { id: spec.params.id, scene: SC }; }
    const mount = R[spec.kind](spec);
    const scene = {
      title: [spec.title, spec.title], subject: [spec.subject || T('Interactive visual', 'شرح مرئي'), spec.subject || 'شرح مرئي'], mode: 'deep', spec,
      stages: spec.steps.map((s, i) => ({ keys: s.focus || [], title: [s.title, s.title], text: [s.text, s.text], set: s.set, words: new RegExp(s.title.split(/\s+/).filter(w => w.length > 4).slice(0, 3).map(w => w.replace(/[^\w]/g, '')).filter(Boolean).join('|') || '^$', 'i') })),
      vars: spec.vars.length ? spec.vars.map(v => [v.name, [v.label, v.label], v.min, v.max, v.step, v.value]) : null,
      note: spec.alt ? [spec.alt, spec.alt] : null,
      async mount(box, api) {
        const sc = await mount(box, api);
        const st = sc.stage.bind(sc);
        sc.stage = i => { const s = spec.steps[i]; if (s && s.set) Object.keys(s.set).forEach(k => { api.setVar(k, s.set[k]); sc.set && sc.set(k, s.set[k]); }); st(i); };
        return sc;
      }
    };
    return { id: 'spec:' + spec.kind, scene };
  }

  /* ======================= curated process diagrams (accurate, reviewed) ======================= */
  const D = (title, subject, layout, nodes, edges, alt) => ({ kind: 'diagram', title, subject, alt, params: { layout, nodes: nodes.map(([id, label, detail]) => ({ id, label, detail })), edges: edges.map(([from, to, label]) => ({ from, to, label })) }, steps: nodes.map(([id, label, detail]) => ({ title: label, text: detail, focus: [id] })) });
  const DIAGRAMS = [
    [/cellular respiration|krebs|citric acid cycle|electron transport chain|how (do )?cells (make|produce) (atp|energy)/i, () => D('Cellular respiration', 'Biology', 'flow', [['glu', 'Glycolysis (cytoplasm)', 'Glucose is split into 2 pyruvate, giving a net 2 ATP and 2 NADH. No oxygen needed.'], ['link', 'Link reaction', 'In the mitochondrion each pyruvate becomes acetyl-CoA, releasing CO₂ and making NADH.'], ['krebs', 'Krebs cycle', 'Acetyl-CoA is oxidised; per glucose the cycle yields 2 ATP, 6 NADH, 2 FADH₂ and releases CO₂.'], ['etc', 'Electron transport chain', 'NADH and FADH₂ pass electrons along proteins in the inner membrane, pumping H⁺ ions across it. Oxygen is the final electron acceptor, forming water.'], ['atp', 'ATP synthase', 'H⁺ flowing back through ATP synthase drives most ATP production (roughly 26–34 ATP per glucose; ~30–32 in total).']], [['glu', 'link', 'pyruvate'], ['link', 'krebs', 'acetyl-CoA'], ['krebs', 'etc', 'NADH, FADH₂'], ['etc', 'atp', 'H⁺ gradient']], 'Flow diagram of aerobic respiration from glycolysis to ATP synthase.')],
    [/protein synthesis|transcription and translation|gene expression|how (are )?proteins (made|synthesi[sz]ed)|central dogma/i, () => D('Protein synthesis', 'Molecular biology', 'flow', [['dna', 'DNA (nucleus)', 'The gene’s template strand is read 3′→5′.'], ['tx', 'Transcription', 'RNA polymerase builds a complementary pre-mRNA strand 5′→3′.'], ['proc', 'mRNA processing', 'In eukaryotes introns are spliced out, a 5′ cap and poly-A tail are added.'], ['ribo', 'Translation (ribosome)', 'The ribosome reads codons (3 bases); tRNAs bring the matching amino acids.'], ['prot', 'Polypeptide → protein', 'The chain folds (and may be modified) into a functional protein.']], [['dna', 'tx'], ['tx', 'proc', 'pre-mRNA'], ['proc', 'ribo', 'mature mRNA'], ['ribo', 'prot', 'amino acids']], 'From DNA to protein: transcription, processing and translation.')],
    [/sql|database query|query (execution|processing)|how (does|do) (a )?(database|query)/i, () => D('How a SQL query is evaluated', 'Computer science', 'flow', [['from', 'FROM / JOIN', 'Choose the tables and combine rows that match the join condition.'], ['where', 'WHERE', 'Keep only the rows that satisfy the condition (before grouping).'], ['group', 'GROUP BY', 'Collect rows into groups that share the grouping values.'], ['having', 'HAVING', 'Filter whole groups using aggregates such as COUNT or SUM.'], ['select', 'SELECT', 'Compute the output columns and aggregates.'], ['order', 'ORDER BY / LIMIT', 'Sort the result and keep the requested number of rows.']], [['from', 'where'], ['where', 'group'], ['group', 'having'], ['having', 'select'], ['select', 'order']], 'Logical order of evaluation of a SQL SELECT statement. (The optimiser may execute it differently but must give the same result.)')],
    [/tcp|three.way handshake|how (does )?the internet (send|deliver)/i, () => D('TCP three-way handshake', 'Computer networks', 'flow', [['c1', 'Client: SYN', 'The client picks an initial sequence number x and sends SYN.'], ['s1', 'Server: SYN-ACK', 'The server acknowledges x+1 and sends its own sequence number y.'], ['c2', 'Client: ACK', 'The client acknowledges y+1. The connection is ESTABLISHED.'], ['data', 'Data transfer', 'Both sides send data; every byte is numbered and acknowledged; lost segments are retransmitted.']], [['c1', 's1', 'SYN'], ['s1', 'c2', 'SYN-ACK'], ['c2', 'data', 'ACK']], 'The three messages that open a reliable TCP connection.')],
    [/action potential|nerve impulse|how (do )?neurons? (fire|signal|communicate)/i, () => D('The action potential', 'Physiology', 'cycle', [['rest', 'Resting potential (≈ −70 mV)', 'Na⁺/K⁺ pumps and leak channels keep the inside negative.'], ['dep', 'Depolarisation', 'A stimulus reaches threshold (≈ −55 mV); voltage-gated Na⁺ channels open and Na⁺ rushes in.'], ['peak', 'Peak (≈ +30 mV)', 'Na⁺ channels inactivate; voltage-gated K⁺ channels open.'], ['rep', 'Repolarisation', 'K⁺ flows out and the inside becomes negative again.'], ['hyp', 'Hyperpolarisation', 'K⁺ channels close slowly, briefly overshooting below rest (refractory period).']], [['rest', 'dep'], ['dep', 'peak'], ['peak', 'rep'], ['rep', 'hyp'], ['hyp', 'rest']], 'The cycle of membrane potential changes in a neuron.')],
    [/research (method|process|design)|scientific method|how (to|do i) (design|plan) (a |an )?(study|experiment)/i, () => D('The research process', 'Research methods', 'flow', [['q', 'Research question', 'A focused, answerable question grounded in the literature.'], ['h', 'Hypothesis / aims', 'A testable prediction (quantitative) or clear aims (qualitative).'], ['d', 'Design & sampling', 'Choose the design (experiment, survey, case study…), sample, variables, ethics approval.'], ['c', 'Data collection', 'Collect data consistently; record procedures so the study can be replicated.'], ['a', 'Analysis', 'Statistical tests or thematic analysis appropriate to the data and design.'], ['i', 'Interpretation & limits', 'Answer the question, discuss validity, reliability and limitations, and suggest further work.']], [['q', 'h'], ['h', 'd'], ['d', 'c'], ['c', 'a'], ['a', 'i']], 'Main stages of an empirical research study.')],
    [/stack (and|vs\.?|versus) heap|memory (allocation|management)|how (does )?memory (allocation )?work/i, () => D('Stack vs heap memory', 'Computer science', 'hub', [['mem', 'Process memory', 'A running program’s address space.'], ['stack', 'Stack', 'Function call frames: parameters, local variables, return addresses. Allocated/freed automatically (LIFO); fast; limited size.'], ['heap', 'Heap', 'Dynamically allocated objects (malloc/new). Lives until freed or garbage-collected; flexible size; slower allocation.'], ['code', 'Code (text)', 'The compiled machine instructions; usually read-only.'], ['data', 'Static data', 'Global and static variables, allocated for the whole run.'], ['gc', 'Garbage collector', 'In managed languages (Java, Python, JS) unreachable heap objects are reclaimed automatically.']], [['mem', 'stack'], ['mem', 'heap'], ['mem', 'code'], ['mem', 'data'], ['heap', 'gc', 'reclaims']], 'The main regions of a program’s memory and what lives in each.')],
    [/dna replication|how (does )?dna (copy|replicate)/i, () => D('DNA replication', 'Molecular biology', 'flow', [['heli', 'Helicase unwinds', 'Hydrogen bonds between bases break, opening a replication fork.'], ['prim', 'Primase adds primers', 'Short RNA primers give DNA polymerase a starting point.'], ['pol', 'DNA polymerase extends', 'New nucleotides are added 5′→3′: continuously on the leading strand, in Okazaki fragments on the lagging strand.'], ['lig', 'Ligase joins', 'Primers are replaced with DNA and ligase seals the fragments.'], ['semi', 'Two DNA molecules', 'Each new molecule has one old and one new strand (semi-conservative).']], [['heli', 'prim'], ['prim', 'pol'], ['pol', 'lig'], ['lig', 'semi']], 'The main enzymes and steps of DNA replication.')]
  ];

  /* ======================= built-in compositions (accurate, reviewed; the AI composes new ones) ======================= */
  const PLANETS = [['Mercury', '#a8a29e', 0.38, 0.24, 'Smallest planet; a year lasts 88 Earth days.'], ['Venus', '#fbbf24', 0.95, 0.62, 'Thick CO₂ atmosphere makes it the hottest planet (~465 °C).'], ['Earth', '#3b82f6', 1, 1, 'The only planet known to support life; 1 year = 365.25 days.'], ['Mars', '#ef4444', 0.53, 1.88, 'Iron oxide dust makes it red; has the tallest volcano, Olympus Mons.'], ['Jupiter', '#f59e0b', 11.2, 11.86, 'Largest planet — a gas giant with a storm (the Great Red Spot) bigger than Earth.'], ['Saturn', '#eab308', 9.45, 29.46, 'Gas giant with bright rings of ice and rock.'], ['Uranus', '#22d3ee', 4.0, 84.0, 'Ice giant tilted ~98°, so it rolls around the Sun on its side.'], ['Neptune', '#6366f1', 3.88, 164.8, 'Ice giant with the fastest winds measured in the Solar System.']];
  const COMPOSED = [
    [/solar system|planets? (orbit|around the sun)|orbits? of the planets/i, () => ({
      kind: 'scene3d', title: 'The Solar System', subject: 'Astronomy', alt: 'The Sun and eight planets orbiting it; click a planet for facts. Sizes and distances are not to scale.',
      params: { scale: 'schematic', caption: 'Orbit order and relative orbital periods are real; sizes and distances are compressed so everything fits.', layers: [{ id: 'inner', label: 'Inner (rocky) planets' }, { id: 'outer', label: 'Outer (giant) planets' }],
        objects: [{ id: 'sun', shape: 'sphere', pos: [0, 0, 0], size: [2.2], color: '#fbbf24', emissive: true, label: 'Sun', detail: 'A G-type star holding 99.8% of the Solar System’s mass.' }].concat(PLANETS.map(([n, c, rad, yr, d], i) => ({ id: n.toLowerCase(), shape: 'sphere', pos: [3.6 + i * 2.1, 0, 0], size: [0.28 + Math.log10(1 + rad) * 0.55], color: c, label: n, detail: d, layer: i < 4 ? 'inner' : 'outer', anim: { type: 'orbit', around: 'sun', radius: 3.6 + i * 2.1, period: 6 * Math.pow(yr, 0.5) } }))) },
      steps: [{ title: 'The Sun at the centre', text: 'Everything orbits the Sun, which holds almost all the mass. Drag to rotate, scroll to zoom.', focus: ['sun'] }, { title: 'The rocky inner planets', text: 'Mercury, Venus, Earth and Mars are small and rocky.', focus: ['mercury', 'venus', 'earth', 'mars'] }, { title: 'The giant outer planets', text: 'Jupiter and Saturn are gas giants; Uranus and Neptune are ice giants.', focus: ['jupiter', 'saturn', 'uranus', 'neptune'] }, { title: 'Farther means slower', text: 'Kepler’s third law: the farther a planet is, the longer its year (T² ∝ a³). Watch the inner planets lap the outer ones.' }] })],
    [/four[- ]stroke|4[- ]stroke|internal combustion engine|how (does )?a (car|petrol|gasoline) engine work|otto cycle/i, () => ({
      kind: 'scene2d', title: 'How a four-stroke engine works', subject: 'Mechanical engineering', alt: 'A cylinder with a piston, two valves, a spark plug and a crankshaft, cycling through intake, compression, power and exhaust.',
      params: { scale: 'schematic', caption: 'One cycle = two crankshaft turns (720°).', layers: [{ id: 'flow', label: 'Gas flow' }],
        elements: [
          { id: 'cyl', shape: 'rect', x: 50, y: 30, w: 26, h: 40, fill: 'none', stroke: 'slate', sw: 0.8, label: '', detail: 'The cylinder: the piston slides inside it.' },
          { id: 'head', shape: 'rect', x: 50, y: 8.5, w: 30, h: 3, fill: 'slate', label: '' },
          { id: 'piston', shape: 'rect', x: 50, y: 34, w: 24, h: 8, rx: 1, fill: 'metal', label: 'Piston', detail: 'Moves down on intake and power, up on compression and exhaust.', anim: { type: 'move', to: [50, 44], period: 2 } },
          { id: 'rod', shape: 'line', x: 50, y: 38, x2: 50, y2: 54, stroke: 'grey', sw: 1.4, label: '', anim: { type: 'move', to: [50, 48], period: 2 } },
          { id: 'crank', shape: 'circle', x: 50, y: 55, r: 4, fill: 'none', stroke: 'slate', sw: 0.8, label: 'Crankshaft', detail: 'Turns the piston’s up-and-down motion into rotation.', anim: { type: 'rotate', period: 2, deg: 360 } },
          { id: 'inlet', shape: 'polygon', points: [[36, 10], [41, 10], [43, 14], [38, 14]], fill: 'sky', label: 'Intake valve', detail: 'Opens on the intake stroke to let the air–fuel mixture in.' },
          { id: 'exhaust', shape: 'polygon', points: [[59, 10], [64, 10], [62, 14], [57, 14]], fill: 'rose', label: 'Exhaust valve', detail: 'Opens on the exhaust stroke to let burnt gases out.' },
          { id: 'plug', shape: 'rect', x: 50, y: 5.5, w: 3, h: 4, fill: 'amber', label: 'Spark plug', detail: 'Ignites the compressed mixture at the start of the power stroke.', anim: { type: 'pulse', period: 2 } },
          { id: 'mix', shape: 'arrow', x: 26, y: 12, x2: 38, y2: 13, stroke: 'sky', sw: 0.9, label: 'Air + fuel', layer: 'flow', anim: { type: 'flow', period: 1 } },
          { id: 'out', shape: 'arrow', x: 62, y: 13, x2: 76, y2: 12, stroke: 'rose', sw: 0.9, label: 'Exhaust gas', layer: 'flow', anim: { type: 'flow', period: 1 } }
        ] },
      steps: [{ title: '1 · Intake', text: 'The piston moves down with the intake valve open, drawing in the air–fuel mixture.', focus: ['inlet', 'mix', 'piston'] }, { title: '2 · Compression', text: 'Both valves close and the piston moves up, squeezing the mixture (compression ratio ≈ 8–12 : 1 in petrol engines).', focus: ['piston', 'cyl'] }, { title: '3 · Power', text: 'The spark plug fires; the burning gas expands and pushes the piston down — the only stroke that does work.', focus: ['plug', 'piston', 'crank'] }, { title: '4 · Exhaust', text: 'The exhaust valve opens and the piston moves up, pushing the burnt gas out. Then the cycle repeats.', focus: ['exhaust', 'out'] }] })],
    [/quantum entangle|entangled (particles|photons|qubits)|bell (state|test|inequality)|epr paradox/i, () => ({
      kind: 'scene2d', title: 'Quantum entanglement (simplified)', subject: 'Quantum physics', alt: 'A source emits two entangled particles to two distant detectors whose results are correlated.',
      params: { scale: 'schematic', caption: 'Simplified model: arrows show measurement outcomes, not little spinning balls. No signal travels between the detectors.', layers: [{ id: 'meas', label: 'Measurements' }],
        elements: [
          { id: 'src', shape: 'circle', x: 50, y: 30, r: 4, fill: 'violet', label: 'Source', detail: 'Creates a pair in one shared state, e.g. (|↑↓⟩ − |↓↑⟩)/√2 — neither particle has its own definite spin.', anim: { type: 'pulse', period: 2 } },
          { id: 'a', shape: 'circle', x: 30, y: 30, r: 2.4, fill: 'sky', label: 'Particle A', detail: 'Travels left. Its spin is undetermined until measured.', anim: { type: 'move', to: [14, 30], period: 4 } },
          { id: 'b', shape: 'circle', x: 70, y: 30, r: 2.4, fill: 'pink', label: 'Particle B', detail: 'Travels right. Measured along the same axis it always gives the opposite result to A.', anim: { type: 'move', to: [86, 30], period: 4 } },
          { id: 'detA', shape: 'rect', x: 8, y: 30, w: 6, h: 14, rx: 1, fill: 'slate', label: 'Detector A (Alice)', detail: 'Measures spin along a chosen axis: result ↑ or ↓, each 50% of the time.' },
          { id: 'detB', shape: 'rect', x: 92, y: 30, w: 6, h: 14, rx: 1, fill: 'slate', label: 'Detector B (Bob)', detail: 'Same axis → always opposite to Alice. Different axes → correlation −cos θ.' },
          { id: 'ra', shape: 'arrow', x: 8, y: 50, x2: 8, y2: 43, stroke: 'sky', sw: 1, label: 'A: ↑', layer: 'meas' },
          { id: 'rb', shape: 'arrow', x: 92, y: 43, x2: 92, y2: 50, stroke: 'pink', sw: 1, label: 'B: ↓', layer: 'meas' },
          { id: 'link', shape: 'path', points: [[14, 20], [50, 12], [86, 20]], stroke: 'violet', sw: 0.5, label: 'Correlation, not communication', detail: 'Each side alone sees random 50/50 results, so no message can be sent faster than light; the correlation shows only when results are compared.' }
        ] },
      steps: [{ title: 'One shared state', text: 'The source creates a pair whose spins are described together; neither has its own definite value.', focus: ['src'] }, { title: 'Separated', text: 'The particles fly apart — the distance can be anything.', focus: ['a', 'b'] }, { title: 'Measure A', text: 'Alice gets ↑ or ↓ at random (50/50).', focus: ['detA', 'ra'] }, { title: 'Measure B', text: 'Bob, measuring the same axis, always gets the opposite. At other angles the correlation is −cos θ, which Bell tests show no local hidden-variable theory can reproduce.', focus: ['detB', 'rb'] }, { title: 'No faster-than-light signal', text: 'Bob’s results on their own are random; the correlation appears only when the two lists are compared over ordinary channels.', focus: ['link'] }] })]
  ];

  /* ======================= local planner ======================= */
  const V = (name, label, min, max, step, value) => ({ name, label, min, max, step, value });
  function exprFrom(q, letter) {
    const re = letter === 'z' ? /(?:z|f\s*\(\s*x\s*,\s*y\s*\))\s*=\s*([^?;\n]+?)(?:\s+(?:for|from|between|on|over|and explain|please)\b|[?.]?\s*$)/i : /(?:y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\))\s*=\s*([^?;\n]+?)(?:\s+(?:for|from|between|on|over|and explain|please)\b|[?.]?\s*$)/i;
    let m = String(q).match(re);
    // also a bare expression: "the derivative of x^3 - 3x", "plot sin(x)/x", "integral of x^2 from 0 to 1"
    if (!m && letter !== 'z') { const b = String(q).match(/\b(?:of|plot|graph|sketch|differentiate|integrate)\s+((?:[\dx.+\-*/^()\s]|sin|cos|tan|exp|ln|log|sqrt|abs|pi)+?)(?:\s+(?:from|between|at|for|on|and|with|dx)\b|[?.]?\s*$)/i); if (b && /x/.test(b[1]) && /[\d^*/+\-()]|sin|cos|exp|ln|sqrt/.test(b[1].replace(/^x$/, ''))) m = b; }
    if (!m) return null;
    const e = m[1].trim().replace(/\.$/, '');
    try { compile(e, letter === 'z' ? ['x', 'y'] : ['x']); return e; } catch (err) { return null; }
  }
  function plan(question) {
    const q = String(question || ''), t = q.toLowerCase();
    let spec = null;
    const ch = chartFrom(q); if (ch) return ch;
    // curated diagrams first (specific vocabulary)
    for (const [re, mk] of COMPOSED) if (re.test(q)) { spec = mk(); break; }
    if (!spec) for (const [re, mk] of DIAGRAMS) if (re.test(q)) { spec = mk(); break; }
    const zf = !spec && exprFrom(q, 'z');
    const yf = !spec && !zf && exprFrom(q, 'y');
    if (spec) { /* done */ }
    else if (zf || /\b(surface|multivariable|partial derivative|saddle point|paraboloid|level curves?|contour|gradient (vector|of a function)|function of two variables)\b|\b(three[- ]dimensional|3d|3-d)\b.{0,30}\b(function|graph|plot|surface)\b/.test(t)) {
      const desc = /gradient descent|optimi[sz]/.test(t);
      spec = { kind: 'surface3d', title: zf ? `z = ${zf}` : desc ? 'Gradient descent on a surface' : 'A surface z = f(x, y)', subject: 'Multivariable calculus', alt: 'A rotatable 3D surface coloured by height.', params: { expr: zf || (desc ? '0.5*x^2 + y^2 + 0.6*sin(2*x)' : 'x^2 - y^2'), range: 3, descent: desc }, vars: desc ? [V('lr', 'learning rate', 0.01, 0.6, 0.01, 0.12)] : [],
        steps: desc ? [{ title: 'The loss surface', text: 'Height = the value we want to minimise. Drag to rotate.' }, { title: 'Follow the slope downhill', text: 'Each step moves against the gradient: (x, y) ← (x, y) − η∇f. Watch the red ball.', focus: ['descent'] }, { title: 'Learning rate', text: 'Too small = slow; too large = overshoot and oscillate. Try the slider.', focus: ['descent'] }] : [{ title: 'The surface', text: 'Each point (x, y) has a height z = f(x, y). Drag to rotate, scroll to zoom.' }, { title: 'Partial derivatives', text: '∂f/∂x is the slope walking parallel to the x-axis; ∂f/∂y the slope parallel to y.' }, { title: 'Critical points', text: 'Where both partial derivatives are zero: a minimum, maximum or (like x² − y²) a saddle point.' }] };
    }
    else if (/gradient descent|(train|optimi[sz]).{0,30}(loss|cost) function/.test(t) && !/neural/.test(t)) {
      spec = { kind: 'surface3d', title: 'Gradient descent', subject: 'Optimisation / ML', alt: 'A ball descending a 3D loss surface.', params: { expr: '0.5*x^2 + y^2 + 0.6*sin(2*x)', range: 3, descent: true }, vars: [V('lr', 'learning rate', 0.01, 0.6, 0.01, 0.12)], steps: [{ title: 'The loss surface', text: 'The height is the loss for each choice of two parameters.' }, { title: 'Step against the gradient', text: 'θ ← θ − η∇L: the ball always moves in the direction of steepest descent.', focus: ['descent'] }, { title: 'Learning rate η', text: 'Change η: small is slow and steady; large overshoots and can diverge.', focus: ['descent'] }] };
    }
    else if (/neural net|neural network|perceptron|backprop|back-propagation|deep learning|how (does|do) (an? )?(ai|machine learning|neural)/.test(t)) {
      const task = /\bxor\b/.test(t) ? 'xor' : /\band gate|\band\b function/.test(t) ? 'and' : /circle|non-?linear/.test(t) ? 'circle' : 'xor';
      spec = { kind: 'network', title: 'How a neural network learns', subject: 'Machine learning', alt: `A ${task.toUpperCase()} classifier with one hidden layer training live by back-propagation.`, params: { layers: [2, 4, 1], task, activation: 'tanh' }, vars: [V('x1', 'input x₁', 0, 1, 0.01, 1), V('x2', 'input x₂', 0, 1, 0.01, 0), V('lr', 'learning rate', 0.05, 3, 0.05, 0.8)],
        steps: [{ title: 'Layers of neurons', text: 'Inputs feed hidden neurons, which feed the output. Each line is a weight: blue positive, red negative, thicker = larger.' }, { title: 'Forward pass', text: 'Each neuron computes a weighted sum plus a bias, then an activation (tanh here). Move the input sliders and watch the values flow.' }, { title: 'Loss', text: 'Before training the predictions are poor. The loss (cross-entropy) measures how wrong they are.' }, { title: 'Back-propagation', text: 'The chain rule gives the gradient of the loss for every weight; gradient descent nudges each weight downhill. Watch the loss fall.', focus: ['train'] }, { title: 'Trained network', text: `The decision map now separates the classes — ${task === 'xor' ? 'something a single neuron cannot do for XOR' : 'a curved boundary'}.`, focus: ['train'] }] };
    }
    else if (/(bubble|insertion|selection|merge|quick)\s*-?sort|sorting algorithm|how (does|do) (a )?sort/.test(t)) {
      const algo = (t.match(/(bubble|insertion|selection|merge|quick)/) || [, 'bubble'])[1];
      const arr = (q.match(/\[([\d\s,.-]+)\]/) || [])[1]; const data = arr ? arr.split(/[\s,]+/).map(Number).filter(isFinite) : null;
      const cx = { bubble: 'O(n²) comparisons; stable; simple', insertion: 'O(n²) worst case but O(n) when nearly sorted; stable', selection: 'always O(n²) comparisons but at most n−1 swaps', merge: 'O(n log n) always; stable; needs O(n) extra memory', quick: 'O(n log n) on average, O(n²) worst case; in place' }[algo];
      spec = { kind: 'algorithm', title: algo[0].toUpperCase() + algo.slice(1) + ' sort', subject: 'Algorithms', alt: `Bars being sorted by ${algo} sort, step by step.`, params: { algo, data, n: 12 }, vars: data ? [] : [V('n', 'array size', 5, 24, 1, 12)], steps: [{ title: 'The idea', text: { bubble: 'Repeatedly compare neighbours and swap them if they are in the wrong order; the largest values “bubble” to the end.', insertion: 'Build a sorted prefix: take the next value and shift it left into place.', selection: 'Find the smallest remaining value and put it next in line.', merge: 'Split the list in half recursively, then merge sorted halves.', quick: 'Pick a pivot, put smaller values before it and larger after, then sort each side.' }[algo] }, { title: 'Watch the comparisons', text: 'Orange = being compared, red = swapped, green = in final position.' }, { title: 'Cost', text: cx }] };
    }
    else if (/binary search/.test(t)) spec = { kind: 'algorithm', title: 'Binary search', subject: 'Algorithms', alt: 'Halving a sorted list to find a value.', params: { algo: 'binary-search', n: 16 }, vars: [], steps: [{ title: 'Sorted list', text: 'Binary search only works on sorted data.' }, { title: 'Halve the range', text: 'Compare with the middle; discard the half that cannot contain the target.' }, { title: 'Cost', text: 'At most ⌈log₂(n+1)⌉ comparisons — 20 for a million items.' }] };
    else if (/recursion|recursive|fibonacci|call stack/.test(t)) spec = { kind: 'algorithm', title: 'Recursion: the call tree of fib(n)', subject: 'Computer science', alt: 'The tree of recursive calls made by a naive Fibonacci function.', params: { algo: 'fibonacci', n: 5 }, vars: [V('n', 'n', 2, 6, 1, 5)], steps: [{ title: 'Base case', text: 'fib(0) = 0 and fib(1) = 1 stop the recursion.' }, { title: 'Recursive case', text: 'fib(n) = fib(n−1) + fib(n−2): each call makes two more calls (purple), returns are green.' }, { title: 'Why it is slow', text: 'The same values are recomputed many times — O(φⁿ) calls. Memoisation or a loop makes it O(n).' }] };
    else if (/\b(bridge|truss|load path|tension and compression|structural load|how (do|does) (a )?bridges?)\b/.test(t)) {
      const type = /warren/.test(t) ? 'warren' : /howe/.test(t) ? 'howe' : 'pratt';
      spec = { kind: 'truss3d', title: `How a ${type[0].toUpperCase() + type.slice(1)} truss bridge carries load`, subject: 'Structural engineering', alt: 'A 3D truss bridge with members coloured by axial force (blue tension, red compression).', params: { type, panels: 6, span: 24, height: 4 }, vars: [V('P', 'load P (kN)', 0, 400, 5, 120), V('pos', 'load position', 0, 1, 0.01, 0.5)],
        steps: [{ title: 'Triangles', text: 'A truss is made of straight members joined at nodes; triangles keep it rigid. Drag to rotate.' }, { title: 'Load path', text: 'The load at the deck flows through the members to the two supports. The reactions always add up to the total load.' }, { title: 'Tension vs compression', text: 'Blue members are pulled (tension), red members are squeezed (compression); thicker = larger force. Top chord in compression, bottom chord in tension.' }, { title: 'Moving load', text: 'As a truck crosses, member forces change — engineers design each member for its worst case.', focus: ['sweep'] }] };
    }
    else if (/\b(beam|bending moment|shear force|cantilever|deflection|stress distribution|stress and strain|flexure)\b/.test(t)) {
      const support = /cantilever/.test(t) ? 'cantilever' : 'simple';
      spec = { kind: 'beam', title: support === 'simple' ? 'Simply supported beam' : 'Cantilever beam', subject: 'Structural mechanics', alt: 'A loaded beam with shear force and bending moment diagrams.', params: { support, span: 10 }, vars: [V('P', 'point load P (kN)', 0, 50, 1, 20), V('a', 'load position a (m)', 0, 10, 0.1, support === 'simple' ? 4 : 10), V('w', 'distributed load w (kN/m)', 0, 10, 0.5, 0)],
        steps: [{ title: 'Equilibrium', text: support === 'simple' ? 'Supports push up: R_A = P(L−a)/L, R_B = Pa/L (plus wL/2 each for a uniform load).' : 'The fixed end supplies an upward force and a resisting moment.' }, { title: 'Shear force', text: 'V(x) is the net vertical force to the left of a cut; it jumps at point loads.' }, { title: 'Bending moment', text: 'M(x) is the area under the shear diagram; it peaks where V = 0.' }, { title: 'Bending stress', text: 'σ = M·y / I: one face is compressed (red), the other stretched (blue); stress is zero at the neutral axis.', set: { w: 2 } }] };
    }
    else if (/\b(matrix|matrices|linear transformation|eigen(value|vector)s?|determinant|linear algebra)\b/.test(t)) {
      const m = q.match(/\[\[?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]?\s*[,;]\s*\[?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]?\]/);
      const [a, b, c, d] = m ? m.slice(1).map(Number) : [2, 1, 1, 2];
      spec = { kind: 'matrix2d', title: 'A matrix as a transformation', subject: 'Linear algebra', alt: 'The plane being transformed by a 2×2 matrix.', params: {}, vars: [V('a', 'a', -3, 3, 0.1, a), V('b', 'b', -3, 3, 0.1, b), V('c', 'c', -3, 3, 0.1, c), V('d', 'd', -3, 3, 0.1, d)], steps: [{ title: 'Where the basis vectors go', text: 'The columns of the matrix are where î (green) and ĵ (red) land; the whole grid follows.' }, { title: 'Determinant', text: 'det = ad − bc is the factor by which areas scale (the yellow square). Negative = the plane is flipped; zero = squashed onto a line.' }, { title: 'Eigenvectors', text: 'Directions that are only stretched, not turned (dashed blue). The stretch factor is the eigenvalue.' }] };
    }
    else if (/\b(electric field|field lines|point charges?|dipole|coulomb|electrostatic)\b/.test(t)) {
      const like = /like charges|two positive|repel/.test(t);
      spec = { kind: 'field2d', title: like ? 'Field of two like charges' : 'Electric field of a dipole', subject: 'Electromagnetism', alt: 'Arrows showing the direction and strength of the electric field around point charges.', params: { charges: [{ q: 'q1', x: -1.6, y: 0 }, { q: 'q2', x: 1.6, y: 0 }] }, vars: [V('q1', 'charge q₁', -5, 5, 0.5, 2), V('q2', 'charge q₂', -5, 5, 0.5, like ? 2 : -2)], steps: [{ title: 'Field direction', text: 'Arrows show the force on a small positive test charge: away from + and towards −.' }, { title: 'Field strength', text: 'E = kq/r² falls off with the square of distance; brighter arrows = stronger field. Hover to read |E|.' }, { title: 'Superposition', text: 'The total field is the vector sum of each charge’s field. Change q₂ to see attraction vs repulsion.' }] };
    }
    else if (/\b(vector field|curl|divergence|flux)\b/.test(t)) spec = { kind: 'field2d', title: 'A vector field F(x, y)', subject: 'Vector calculus', alt: 'Arrows of a 2D vector field with particles flowing along it.', params: { fx: '-y + a*x', fy: 'x + a*y' }, vars: [V('a', 'spiral strength a', -1, 1, 0.05, 0.2)], steps: [{ title: 'A field of arrows', text: 'At each point the field assigns a vector F = (−y + ax, x + ay).' }, { title: 'Curl', text: 'The (−y, x) part makes the flow rotate: non-zero curl.' }, { title: 'Divergence', text: 'The a·(x, y) part spreads outward (a > 0) or sinks inward (a < 0): divergence = 2a.' }] };
    else if (/interference|double.?slit|young'?s|two.source/.test(t)) spec = { kind: 'waves', title: 'Two-source interference', subject: 'Physics: waves', alt: 'Ripples from two sources overlapping to form bright and dark fringes.', params: { mode: 'two-source' }, vars: [V('lambda', 'wavelength λ', 15, 70, 1, 36), V('d', 'source separation d', 30, 250, 5, 120), V('phi', 'phase difference', 0, 6.28, 0.05, 0)], steps: [{ title: 'Two coherent sources', text: 'Both sources emit waves of the same wavelength and a fixed phase difference.' }, { title: 'Constructive and destructive', text: 'Where crests meet crests (path difference = mλ) the waves add: bright. Where crests meet troughs ((m+½)λ) they cancel: dark.' }, { title: 'Fringe spacing', text: 'Increase λ or reduce d: the fringes spread out (y ≈ λL/d).', set: { lambda: 55 } }] };
    else if (/standing wave|harmonics?|resonance/.test(t)) spec = { kind: 'waves', title: 'Standing waves', subject: 'Physics: waves', alt: 'Two opposite travelling waves combining into a standing wave.', params: { mode: 'standing' }, vars: [V('A1', 'amplitude', 0.2, 1.2, 0.05, 1), V('f1', 'frequency', 0.5, 3, 0.05, 1)], steps: [{ title: 'Two travelling waves', text: 'Identical waves moving in opposite directions (blue and orange).' }, { title: 'Nodes and antinodes', text: 'Their sum (black) has points that never move (nodes) half a wavelength apart.' }] };
    else if (/superposition|beats?\b|wave/.test(t) && /wave/.test(t)) spec = { kind: 'waves', title: 'Superposition of waves', subject: 'Physics: waves', alt: 'Two waves and their sum.', params: { mode: 'superposition' }, vars: [V('A1', 'amplitude 1', 0, 1.2, 0.05, 1), V('f1', 'frequency 1', 0.5, 3, 0.05, 1), V('A2', 'amplitude 2', 0, 1.2, 0.05, 1), V('f2', 'frequency 2', 0.5, 3, 0.05, 1.2)], steps: [{ title: 'Add the displacements', text: 'Where waves overlap, the displacement is the sum of each wave’s displacement.' }, { title: 'Beats', text: 'Close frequencies produce a slowly varying envelope: beats at |f₁ − f₂|.' }] };
    else if (/supply and demand|market equilibrium|equilibrium price|price elasticity|demand curve|supply curve|shortage|surplus/.test(t)) spec = { kind: 'plot2d', title: 'Supply, demand and equilibrium', subject: 'Economics', alt: 'Downward demand and upward supply lines crossing at the equilibrium.', params: { fns: [{ expr: 'a - b*x', label: 'Demand' }, { expr: 'c + d*x', label: 'Supply' }], x: [0, 100], y: [0, 120], xlabel: 'Quantity', ylabel: 'Price', intersect: true }, vars: [V('a', 'demand intercept', 40, 120, 1, 100), V('b', 'demand slope', 0.2, 2, 0.05, 1), V('c', 'supply intercept', 0, 60, 1, 10), V('d', 'supply slope', 0.2, 2, 0.05, 0.8)], steps: [{ title: 'Demand and supply', text: 'Demand slopes down (people buy more when cheaper); supply slopes up (firms sell more when prices are higher).' }, { title: 'Equilibrium', text: 'Where they cross, the quantity demanded equals the quantity supplied: the market-clearing price.' }, { title: 'Demand shifts right', text: 'Higher income or popularity raises demand: both price and quantity rise.', set: { a: 115 } }, { title: 'Supply shifts right', text: 'Cheaper inputs or better technology raise supply: price falls, quantity rises.', set: { a: 100, c: 0 } }] };
    else if (/compound interest|exponential growth|present value|future value|interest rate/.test(t)) spec = { kind: 'plot2d', title: 'Compound vs simple interest', subject: 'Finance', alt: 'Growth of an investment with compound and simple interest over time.', params: { fns: [{ expr: 'p*(1 + r/100)^x', label: 'Compound' }, { expr: 'p*(1 + r/100*x)', label: 'Simple' }], x: [0, 30], xlabel: 'Years', ylabel: 'Value' }, vars: [V('p', 'principal', 100, 10000, 100, 1000), V('r', 'annual rate %', 0.5, 15, 0.5, 6)], steps: [{ title: 'Simple interest', text: 'Interest only on the principal: a straight line, P(1 + rt).' }, { title: 'Compound interest', text: 'Interest on interest: P(1 + r)ᵗ grows exponentially — the gap widens over time.' }, { title: 'Rule of 72', text: 'Doubling time ≈ 72 / r years (12 years at 6%).' }] };
    else if (/normal distribution|gaussian|bell curve|standard deviation|z-?score/.test(t)) spec = { kind: 'plot2d', title: 'The normal distribution', subject: 'Statistics', alt: 'A bell-shaped curve with a shaded probability area.', params: { fns: [{ expr: 'exp(-(x-m)^2/(2*s^2))/(s*sqrt(2*pi))', label: 'N(μ, σ²)' }], x: [-6, 6], xlabel: 'x', ylabel: 'density', area: ['lo', 'hi'] }, vars: [V('m', 'mean μ', -3, 3, 0.1, 0), V('s', 'std dev σ', 0.3, 3, 0.05, 1), V('lo', 'from', -6, 6, 0.1, -1), V('hi', 'to', -6, 6, 0.1, 1)], steps: [{ title: 'Shape', text: 'Symmetric about the mean μ; σ controls the spread.' }, { title: 'Probability = area', text: 'P(a < X < b) is the shaded area. About 68% lies within one σ of the mean…' }, { title: '95% rule', text: '…and about 95% within two σ.', set: { lo: -2, hi: 2 } }] };
    else if (/integral|integration|area under|riemann/.test(t)) spec = { kind: 'plot2d', title: yf ? `∫ ${yf} dx` : 'The definite integral as area', subject: 'Calculus', alt: 'A curve with the area beneath it shaded between two limits.', params: { fns: [{ expr: yf || '0.3*x^3 - x + 2', label: 'f(x)' }], x: [-4, 4], area: ['a', 'b'] }, vars: [V('a', 'lower limit a', -4, 4, 0.1, -1), V('b', 'upper limit b', -4, 4, 0.1, 2)], steps: [{ title: 'Signed area', text: '∫ₐᵇ f(x) dx is the area between the curve and the x-axis; area below the axis counts as negative.' }, { title: 'Fundamental theorem', text: 'If F′ = f then ∫ₐᵇ f = F(b) − F(a). Move the limits and watch the value.' }] };
    else if (/derivative|differentiat|tangent line|rate of change|slope of (a|the) curve/.test(t)) spec = { kind: 'plot2d', title: yf ? `The derivative of ${yf}` : 'The derivative as a slope', subject: 'Calculus', alt: 'A curve with a moving tangent line and the derivative curve.', params: { fns: [{ expr: yf || 'x^3 - 3*x', label: 'f(x)' }], x: [-3, 3], tangentAt: 'x0', derivative: true }, vars: [V('x0', 'point x₀', -3, 3, 0.05, 1.5)], steps: [{ title: 'Tangent line', text: 'The derivative f′(x₀) is the slope of the tangent at x₀ — the limit of (f(x₀+h) − f(x₀))/h.' }, { title: 'The derivative curve', text: 'Dashed red: f′(x). Where f has a peak or trough, f′ = 0.', set: { x0: 1 } }] };
    else if (yf || /\b(plot|graph|sketch)\b.{0,30}(function|curve|y\s*=)|\bquadratic|parabola\b/.test(t)) {
      const e = yf || 'a*x^2 + b*x + c'; const usesABC = !yf;
      spec = { kind: 'plot2d', title: yf ? `y = ${yf}` : 'Quadratic functions', subject: 'Mathematics', alt: `Graph of y = ${e}.`, params: { fns: [{ expr: e, label: 'y = ' + e }], x: [-6, 6], roots: true }, vars: usesABC ? [V('a', 'a', -3, 3, 0.1, 1), V('b', 'b', -6, 6, 0.5, 0), V('c', 'c', -6, 6, 0.5, -2)] : [], steps: [{ title: 'The graph', text: 'Each point (x, y) on the curve satisfies the equation.' }, { title: 'Roots', text: 'Where the curve crosses the x-axis, y = 0.' }] };
    }
    // the hand-built scenes (visuals.js) when nothing more specific matched
    if (!spec && window.ERLY && ERLY.visuals) { const d = ERLY.visuals.detect(q); if (d) spec = { kind: 'scene', title: d.scene.title[0], params: { id: d.id }, steps: [] }; }
    if (!spec) return null;
    const v = validate(spec);
    return v.ok ? v.spec : null;
  }

  // is a visual likely to help? (a cheap check before offering one)
  const EXPLAIN = /\b(how (does|do|is|are)|why (does|do|is|are)|explain|visuali[sz]e|show me|demonstrate|what happens|walk me through|illustrate|draw|animate|simulate)\b/i;
  function offerable(question, aiReady) {
    if (plan(question)) return 'local';
    if (aiReady && EXPLAIN.test(question) && String(question).length > 14) return 'ai';
    return null;
  }

  /* ======================= explicit requests and follow-up edits =======================
     A visual is created only when the student ASKS for one (“draw…”, “show me a
     diagram/graph/3D model…”, “animate…”, “simulate…”). Ordinary questions get a
     text answer with no offer. Once a visual is open, follow-ups edit the SAME
     spec — validated again before it is re-rendered. */
  const EXPLICIT = /\b(visual (explanation|representation|model|diagram|summary|walkthrough|guide)|(create|make|build|generate|give me|produce) (me )?(a |an )?(visual|diagram|model|simulation|animation|infographic|illustration|graphic|3d)|visuali[sz]e|visuali[sz]ation|diagram|flow ?chart|concept map|mind ?map|graph (it|this|that|of|the|y|f)|plot|sketch|draw|chart|infographic|timeline|simulat(e|ion)|animat(e|ion)|3d|three.dimensional|interactive (visual|model|demo)|show (me )?(it |this )?(as |with )?(a |an )?(visual|picture|diagram|graph|model|animation))\b|ارسم|مخطط|رسم بياني|محاكاة/i;
  function explicit(text) { const t = String(text || ''); return EXPLICIT.test(t) && t.length > 4 ? (/\b3d|three.dimensional\b/i.test(t) ? '3d' : /animat|simulat/i.test(t) ? 'animate' : 'visual') : null; }
  const EDIT = [
    ['3d', /\b(make|turn|show|convert|render|view)\b.{0,20}\b(it|this|that)?\b.{0,10}\b(3d|three.dimensional|in 3 ?d)\b|^3d\b/i],
    ['rotate', /\b(rotate|spin|turn) (it|this|that|the (model|surface|graph|bridge))\b|\bstop rotating\b/i],
    ['labels', /\b(add|show|turn on|include|hide|remove|turn off)\b.{0,12}\b(labels?|values|numbers|annotations?)\b/i],
    ['layer', /\b(add|show)\b.{0,12}\b(another|one more|a second|an extra|more)\b.{0,10}\b(layer|hidden layer|curve|function|line|series)\b|\bshow the derivative\b|\badd the derivative\b/i],
    ['animate', /\b(animate|play|walk me through|step through|run) (it|this|that|the (process|steps|animation|visual))\b|^animate\b/i],
    ['highlight', /\b(highlight|focus on|zoom (in )?on|point to|show me) (the )?(.{2,40})$/i],
    ['param', /\b(set|change|make|increase|decrease|raise|lower)\b.{0,6}\b(the )?([a-zα-ω₀-₉ ]{1,30}?)\s*(to|=|by)\s*(-?[\d.]+)/i],
    ['type', /\b(as|to|into) (a |an )?(bar|line|pie) (chart|graph)\b/i],
    ['simplify', /\b(simplify|simpler|less detail|fewer (parts|labels|details)|declutter)\b.{0,20}\b(diagram|visual|it|this|picture|model)\b|^simplify\b/i],
    ['detail', /\b(more detail(ed)?|more detailed|show more|add (more )?detail|label every (part|component)|label all)\b/i],
    ['advanced', /\b(more (advanced|detailed|rigorous|in.depth)|go deeper|explain (it )?(at a )?(higher|harder|more advanced) level|simpler|more simply|easier)\b/i]
  ];
  function editIntent(text) { const t = String(text || '').trim(); if (t.length > 120) return null; for (const [k, re] of EDIT) { const m = t.match(re); if (m) return { kind: k, m }; } return null; }
  // apply a follow-up to a spec. Returns { spec?, action, note } — note is an honest, short message.
  function edit(spec, text) {
    const it = editIntent(text); if (!it || !spec) return null;
    const S = JSON.parse(JSON.stringify(spec)), m = it.m;
    const ok = sp => { const v = validate(sp); return v.ok ? v.spec : null; };
    switch (it.kind) {
      case '3d': {
        if (S.kind === 'surface3d' || S.kind === 'truss3d' || S.kind === 'scene3d') return { action: 'none', note: 'It is already a 3D model — drag to rotate, scroll or pinch to zoom.' };
        if (S.kind === 'plot2d' && S.params.fns.length) {
          const e = S.params.fns[0].expr.replace(/\bx\b/g, '(sqrt(x^2+y^2))');
          const sp = ok({ kind: 'surface3d', title: S.title + ' — rotated into 3D', subject: S.subject, alt: `The curve y = ${S.params.fns[0].expr} spun about the vertical axis into a surface of revolution.`, params: { expr: e, range: Math.max(1, Math.min(6, Math.max(Math.abs(S.params.x[0]), Math.abs(S.params.x[1])))) }, vars: S.vars, steps: [{ title: 'Surface of revolution', text: `The 2D curve has been spun around the vertical axis: every point at distance r from the centre has height f(r). Drag to rotate.` }, { title: 'Reading it', text: 'A cross-section through the centre gives back the original curve.' }] });
          return sp ? { spec: sp, action: 'reopen', note: 'Here it is in 3D: the curve is spun around the vertical axis into a surface of revolution (z = f(r), r = √(x² + y²)). Drag to rotate.' } : null;
        }
        if (S.kind === 'field2d' && S.params.fx) {
          const sp = ok({ kind: 'surface3d', title: 'Field magnitude in 3D', subject: S.subject, alt: 'Height = the size of the vector field at each point.', params: { expr: `sqrt((${S.params.fx})^2 + (${S.params.fy})^2)`, range: 3 }, vars: S.vars, steps: [{ title: 'Magnitude as height', text: 'The surface height is |F(x, y)|: tall where the field is strong.' }] });
          return sp ? { spec: sp, action: 'reopen', note: 'This shows the field’s strength |F| as height in 3D. The arrow directions are in the 2D view.' } : null;
        }
        return { action: 'none', note: 'I don’t have a faithful 3D version of this visual yet, so I’ve left it in 2D rather than fake depth. I can make 3D models of surfaces, functions, fields and trusses.' };
      }
      case 'rotate':
        if (S.kind === 'surface3d' || S.kind === 'truss3d' || S.kind === 'scene3d') return { action: 'play', note: /stop/i.test(text) ? 'Rotation paused — press ▶ to resume.' : 'Rotating now. You can also drag it with a finger or the mouse; ⏸ stops it.' };
        return { action: 'none', note: 'This visual is 2D, so there is nothing to rotate. Say “make it 3D” if it’s a surface, function or field.' };
      case 'labels': {
        const on = !/\b(hide|remove|turn off)\b/i.test(text);
        if (S.kind === 'scene2d' || S.kind === 'scene3d') return { action: 'setvar', name: 'labels', value: on ? 1 : 0, note: on ? 'Every labelled part now shows its name — tap any part for its detail.' : 'Labels hidden; tap a part to see its name and detail.' };
        if (S.kind === 'chart') { S.params.labelsOn = on; return { spec: ok(S), action: 'reopen', note: on ? 'Value labels added to every bar/point.' : 'Value labels hidden.' }; }
        if (S.kind === 'plot2d') { S.params.roots = on; return { spec: ok(S), action: 'reopen', note: on ? 'Labelled the roots (where the curve crosses y = 0) and kept the axis labels.' : 'Root labels hidden.' }; }
        return { action: 'none', note: 'Every part of this visual is already labelled — tap any part for its detail.' };
      }
      case 'layer': {
        if (S.kind === 'network' && S.params.layers.length < 5) { S.params.layers.splice(S.params.layers.length - 1, 0, 3); const sp = ok(S); return { spec: sp, action: 'reopen', note: `Added a hidden layer: the network is now ${sp.params.layers.join(' → ')}. More layers can model more complex boundaries but take longer to train.` }; }
        if (S.kind === 'plot2d' && /derivative/i.test(text) || S.kind === 'plot2d' && !S.params.derivative && S.params.fns.length === 1) { S.params.derivative = true; return { spec: ok(S), action: 'reopen', note: 'Added the derivative f′(x) as a dashed curve: it is zero exactly where f has a turning point.' }; }
        return { action: 'none', note: 'I can’t add another layer to this kind of visual without making something up. Tell me what you’d like added (e.g. “add the curve y = 2x”) and I’ll draw it.' };
      }
      case 'animate': return { action: 'tour', note: 'Playing it step by step — I’ll move through each stage. Press ■ to stop at any time.' };
      case 'highlight': {
        const want = m[4].replace(/[.?!]$/, '').toLowerCase();
        const ORD = { first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2, fourth: 3, '4th': 3, fifth: 4, '5th': 4, last: S.steps.length - 1 };
        const om = want.match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\b/);
        if (om && S.steps[ORD[om[1]]]) return { action: 'stage', stage: ORD[om[1]], note: `Highlighted: ${S.steps[ORD[om[1]]].title}.` };
        const k = S.steps.findIndex(st => (st.title + ' ' + st.text).toLowerCase().includes(want) || want.split(/\s+/).filter(w => w.length > 3).some(w => st.title.toLowerCase().includes(w)));
        if (k >= 0) return { action: 'stage', stage: k, note: `Highlighted: ${S.steps[k].title}.` };
        if (S.kind === 'chart') { const i = S.params.labels.findIndex(l => l.toLowerCase().includes(want) || want.includes(l.toLowerCase())); if (i >= 0) { S.steps = [{ title: S.params.labels[i], text: S.params.series.map(se => `${se.name || 'Value'}: ${se.values[i]}`).join(' · '), focus: [S.params.labels[i]] }].concat(S.steps); return { spec: ok(S), action: 'reopen', note: `Highlighted ${S.params.labels[i]}.` }; } }
        return { action: 'none', note: `I couldn’t find “${m[4]}” in this visual — the parts are: ${S.steps.map(st => st.title).slice(0, 8).join(', ')}.` };
      }
      case 'param': {
        const name = m[3].trim().toLowerCase(), val = +m[5];
        const v = S.vars.find(x => x.name.toLowerCase() === name || x.label.toLowerCase().includes(name) || name.includes(x.label.toLowerCase()));
        if (!v) return S.vars.length ? { action: 'none', note: `This visual’s adjustable values are: ${S.vars.map(x => x.label).join(', ')}.` } : null;
        let target = /\bby\b/i.test(m[4]) ? v.value + (/(decrease|lower)/i.test(m[1]) ? -val : val) : val;
        const clamped = clamp(target, v.min, v.max);
        return { action: 'setvar', name: v.name, value: clamped, note: `Set ${v.label} to ${+clamped.toFixed(4)}` + (clamped !== target ? ` (the allowed range is ${v.min} to ${v.max}).` : '.') };
      }
      case 'type':
        if (S.kind !== 'chart') return { action: 'none', note: 'Only data charts can switch between bar, line and pie.' };
        S.params.type = m[3].toLowerCase(); return { spec: ok(S), action: 'reopen', note: `Shown as a ${S.params.type} chart.` };
      case 'simplify': {
        if ((S.kind === 'scene2d' || S.kind === 'scene3d') && S.params.layers.length) { const key = S.kind === 'scene2d' ? 'elements' : 'objects'; S.params[key] = S.params[key].filter(e => !e.layer); S.params.layers = []; const sp = ok(S); return sp ? { spec: sp, action: 'reopen', note: 'Simplified: only the core parts are shown now (the optional layers are hidden). Say “show more detail” to bring them back.' } : null; }
        if (S.kind === 'diagram' && S.params.nodes.length > 4) { const keep = new Set(S.params.nodes.slice(0, 4).map(n => n.id)); S.params.nodes = S.params.nodes.filter(n => keep.has(n.id)); S.params.edges = S.params.edges.filter(e => keep.has(e.from) && keep.has(e.to)); S.steps = S.steps.filter(st => !st.focus.length || st.focus.some(f => keep.has(f))); const sp = ok(S); return sp ? { spec: sp, action: 'reopen', note: 'Simplified to the first four stages.' } : null; }
        return { action: 'level', up: false };
      }
      case 'detail':
        if (S.kind === 'scene2d' || S.kind === 'scene3d' || S.kind === 'chart' || S.kind === 'plot2d') return { action: 'setvar', name: 'labels', value: 1, note: 'All parts are labelled. Tap any part for a one-line explanation — or ask me about a specific part and I’ll go deeper.' };
        return { action: 'level', up: true };
      case 'advanced': return { action: 'level', up: !/simpl|easier/i.test(text), note: '' };
    }
    return null;
  }
  // numbers typed in the question → a chart ("bar chart of A 12, B 30, C 7")
  function chartFrom(q) {
    const t = String(q);
    if (!/\b(bar|line|pie)?\s*(chart|graph)\b/i.test(t)) return null;
    const pairs = [...t.matchAll(/([A-Za-z][\w .'-]{0,20}?)\s*[:=]?\s+(-?\d+(?:\.\d+)?)\s*%?(?=\s*(?:,|;|and\b|$))/g)].map(x => [x[1].replace(/^(of|for|with|and)\s+/i, '').trim(), +x[2]]);
    if (pairs.length < 2) return null;
    const type = (t.match(/\b(bar|line|pie)\b/i) || [, 'bar'])[1].toLowerCase();
    const v = validate({ kind: 'chart', title: 'Your data', subject: 'Data visualisation', alt: `A ${type} chart of the values you gave.`, params: { type, labels: pairs.map(p => p[0]), series: [{ name: 'Value', values: pairs.map(p => p[1]) }] }, steps: [{ title: 'Your data', text: 'These are exactly the numbers you typed. Hover a bar to highlight it; say “as a pie chart” or “add labels” to change it.' }] });
    return v.ok ? v.spec : null;
  }

  /* ======================= AI planner ======================= */
  const AI_SCHEMA = `Return ONLY one JSON object, no prose.
If a visual would not genuinely help, return {"visual": false}.
Otherwise return {"kind": K, "title": "...", "subject": "...", "alt": "one-sentence description", "params": {...}, "vars": [{"name","label","min","max","step","value"}], "steps": [{"title","text","set":{"var":value},"focus":["id"]}]}
Kinds and params:
- "plot2d": {"fns":[{"expr":"a*x^2+b","label":"..."}], "x":[min,max], "xlabel","ylabel", "roots":bool, "intersect":bool (2 curves), "derivative":bool, "tangentAt":"<var name>", "area":["<var or number>","<var or number>"]}
- "surface3d": {"expr":"f of x and y", "range":3, "descent":bool}
- "field2d": {"charges":[{"q":"<var or number>","x":-4..4,"y":-2.5..2.5}]} OR {"fx":"expr in x,y","fy":"expr in x,y"}
- "waves": {"mode":"two-source"|"superposition"|"standing"} (vars: lambda, d, phi or A1, f1, A2, f2)
- "network": {"layers":[2,4,1], "task":"xor"|"and"|"or"|"circle", "activation":"tanh"|"sigmoid"|"relu"} (vars x1, x2, lr; a step with "focus":["train"] trains it)
- "algorithm": {"algo":"bubble"|"insertion"|"selection"|"merge"|"quick"|"binary-search"|"fibonacci", "data":[numbers]}
- "diagram": {"layout":"flow"|"cycle"|"hub", "nodes":[{"id","label","detail"}], "edges":[{"from","to","label"}]} (≤12 nodes; steps focus node ids)
- "truss3d": {"type":"pratt"|"warren"|"howe","panels":6,"span":24,"height":4} (vars P in kN, pos 0..1; a step with "focus":["sweep"] moves the load)
- "beam": {"support":"simple"|"cantilever","span":10} (vars P, a, w)
- "matrix2d": {} (vars a, b, c, d)
- "chart": {"type":"bar"|"line"|"pie","labels":["..."],"series":[{"name","values":[numbers]}],"unit":"","source":"where the numbers come from"} — ONLY with numbers the student gave or well-established figures; name the source
- "timeline": {"events":[{"when":"1953","label":"...","detail":"..."}]} — ONLY well-established dates; steps focus "t0","t1",…
- "scene2d": an open-ended labelled 2D diagram for ANY subject without a better kind (anatomy, cells, engines, circuits, ecosystems, geology, architecture, computer systems, processes…). Canvas is 100 wide × 60 tall (x right, y down). {"scale":"schematic"|"to-scale","caption":"...","layers":[{"id","label"}],"elements":[{"id","shape":"rect"|"circle"|"ellipse"|"line"|"arrow"|"polygon"|"path"|"text","x","y","w","h","r","x2","y2","points":[[x,y],…],"fill":"<named colour or #hex>","stroke","label","detail":"one accurate sentence","layer":"<layer id>","anim":{"type":"move"|"rotate"|"pulse"|"flow"|"orbit"|"bob","to":[x,y],"period":seconds,"around":"<id>","radius"}}]} (≤ 90 elements; steps focus element ids)
- "scene3d": an open-ended 3D model (planetary systems, molecules, structures, machines, organs). {"scale":"schematic"|"to-scale","caption":"...","layers":[…],"objects":[{"id","shape":"sphere"|"box"|"cylinder"|"cone"|"torus"|"ring","pos":[x,y,z],"size":[a,b,c],"color","emissive":bool,"label","detail","layer","anim":{"type":"orbit"|"spin"|"bob"|"pulse"|"move","around":"<id>","radius","period"}}],"links":[{"from","to","label"}]} (≤ 60 objects)
Named colours: red orange amber yellow lime green teal cyan sky blue indigo violet purple pink rose brown grey slate white black blood bone water metal.
Accuracy rules: correct names, relationships and order; never invent measurements; use "schematic" unless proportions are real; one-sentence "detail" per labelled part.
Expressions use only numbers, x, y, declared var names, + - * / ^ ( ) and sin cos tan exp ln log sqrt abs pi e.
Use 2–6 steps of accurate, university-level explanation for THIS question. Choose the kind that teaches best: a specialised kind when one fits (plot2d, surface3d, network, truss3d…), "diagram" for step processes, "scene2d"/"scene3d" for anything that needs a picture or model of the thing itself.`;
  async function aiPlan(question, level) {
    const ai = window.ERLY && ERLY.companion && ERLY.companion.ai;
    const gen = ai && ai.ready && ai.ready() ? ai : null;
    if (!gen) return null;
    let out = '';
    const msgs = [{ role: 'system', content: 'You design interactive educational visualisations as strict JSON specs. ' + AI_SCHEMA }, { role: 'user', content: `Student question (${level || 'undergraduate'} level): ${String(question).slice(0, 600)}` }];
    const timer = new Promise(res => setTimeout(() => res('__timeout__'), 20000));
    try { out = await Promise.race([gen.generate(msgs, { onToken: () => {} }), timer]); } catch (e) { return null; }
    if (out === '__timeout__' || !out) return null;
    const m = String(out).match(/\{[\s\S]*\}/); if (!m) return null;
    let obj; try { obj = JSON.parse(m[0]); } catch (e) { return null; }
    if (obj.visual === false) return { declined: true };
    const v = validate(obj);
    return v.ok ? v.spec : null;
  }

  window.ERLY = window.ERLY || {};
  ERLY.vspec = { compile, validate, plan, aiPlan, offerable, explicit, edit, editIntent, chartFrom, toScene, truss, beamCalc, frames, KINDS, renderers: R, diagrams: DIAGRAMS.length };
})();
