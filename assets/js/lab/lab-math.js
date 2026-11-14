/* ERLY — Noor Lab: mathematics engines (v16)
     MathExpr        natural notation → math.js expressions, with free parameters found automatically
     GraphingEngine  explicit, implicit, inequalities, parametric, polar, piecewise, points; sliders, key points,
                     intersections, table, zoom/pan/pinch, colours, visibility, export
     CalculusEngine  derivative + tangent, analysis (f, f′, f″), integral with Riemann sums, limits, slope fields
     AlgebraEngine   solve / factor / expand / simplify / d/dx / ∫ / systems / matrices / complex — Nerdamer and
                     math.js, every answer checked by substitution or numerically before it is shown
     StatsEngine     summary statistics, histogram, box plot, scatter + regression, normal and binomial models,
                     sampling simulation, confidence interval and one-sample t-test
   Results come from the libraries, never from the language model. */
(function () {
  'use strict';
  const L = window.ERLY_LAB; if (!L) return;
  const { T, esc, num: N, ui } = L;

  /* ======================= expressions ======================= */
  const FUNCS = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'exp', 'log', 'ln', 'log10', 'log2', 'sqrt', 'cbrt', 'abs', 'floor', 'ceil', 'round', 'sign', 'min', 'max', 'mod', 'nthRoot', 'pow', 'sum', 'factorial', 'gamma'];
  const VARS = ['x', 'y', 't', 'theta', 'e', 'pi', 'i', 'E'];
  const ALIAS = { arcsin: 'asin', arccos: 'acos', arctan: 'atan', ln: 'log' };
  let mathLib = null;
  async function M() { if (!mathLib) { mathLib = await L.libs.math(); try { mathLib.import({ sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x), cot: x => 1 / Math.tan(x) }, { override: false, silent: true }); } catch (e) { /* already there */ } } return mathLib; }
  L.mathReady = M;
  // turn what a student types into something math.js parses, the way a graphing calculator reads it
  function prep(src) {
    let s = L.normalise(src).trim();
    s = s.replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/\*\*/g, '^');
    // piecewise {cond: expr, cond: expr, else}
    s = s.replace(/\{([^{}]+)\}/g, (m, body) => { const parts = body.split(',').map(p => p.trim()).filter(Boolean); let out = ''; let close = 0; for (const p of parts) { const k = p.indexOf(':'); if (k > 0) { out += `(${p.slice(0, k)}) ? (${p.slice(k + 1)}) : (`; close++; } else { out += `(${p})`; } } if (!/\)$/.test(out) || out.endsWith(': (')) out += 'NaN'; return '(' + out + ')'.repeat(close) + ')'; });
    // |x| → abs(x)
    for (let k = 0; k < 3; k++) s = s.replace(/\|([^|]+)\|/g, 'abs($1)');
    // identifiers: functions stay, sinx → sin(x), "ax" → a*x, a(x-h) → a*(x-h)
    s = s.replace(/[A-Za-z_][A-Za-z_0-9]*/g, (id, off, all) => {
      if (ALIAS[id]) id = ALIAS[id];
      if (FUNCS.includes(id) || VARS.includes(id)) return id;
      const fn = FUNCS.concat(Object.keys(ALIAS)).sort((a, b) => b.length - a.length).find(f => id.startsWith(f) && /^[a-z]$/.test(id.slice(f.length)));
      if (fn) return (ALIAS[fn] || fn) + '(' + id.slice(fn.length) + ')';
      if (/^theta/.test(id) && id.length > 5) return 'theta*' + id.slice(5).split('').join('*');
      if (id.length > 1 && /^[a-zA-Z]+$/.test(id)) return id.split('').join('*');
      return id;
    });
    s = s.replace(/\b([a-zA-Z])\s*\(/g, (m, v, off, all) => { const before = all.slice(Math.max(0, off - 6), off); return /[a-zA-Z]$/.test(before) ? m : v + '*('; });
    s = s.replace(/\)\s*\(/g, ')*(').replace(/(\d)\s*\(/g, '$1*(');
    return s;
  }
  L.prep = prep;
  function compileExpr(m, s, known) {
    const node = m.parse(s), code = node.compile();
    const params = []; node.traverse((n, path, parent) => { if (n.isSymbolNode && !(parent && parent.isFunctionNode && parent.fn === n) && !VARS.includes(n.name) && !(known || []).includes(n.name) && !FUNCS.includes(n.name) && !params.includes(n.name) && !m[n.name]) params.push(n.name); });
    return { node, code, params, tex: () => { try { return node.toTex(); } catch (e) { return s; } } };
  }
  const OPS = /(<=|>=|<|>|=)/;
  // split at a comparison only at the top level (a piecewise condition inside brackets is not an inequality)
  function splitTop(s) { let depth = 0; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === '(' || ch === '[' || ch === '{') depth++; else if (ch === ')' || ch === ']' || ch === '}') depth--; else if (depth === 0 && /[<>=]/.test(ch)) { const op = s[i + 1] === '=' && ch !== '=' ? ch + '=' : ch; const rest = s.slice(i + op.length); const r = splitTop(rest); if (r.length > 1) return [s.slice(0, i), op].concat(r).length > 3 ? [s.slice(0, i), op, rest, 'x'] : [s.slice(0, i), op, rest]; return [s.slice(0, i), op, rest]; } } return [s]; }
  // classify one line of input into a graphable object
  function classify(m, raw) {
    const s0 = prep(raw);
    let mm;
    if ((mm = s0.match(/^x\s*=\s*(.+?)\s*[,;]\s*y\s*=\s*(.+)$/))) { const a = compileExpr(m, mm[1], ['t']), b = compileExpr(m, mm[2], ['t']); return { kind: 'param', fx: a, fy: b, params: [...new Set(a.params.concat(b.params))] }; }
    if ((mm = s0.match(/^\(\s*([^,]+?)\s*,\s*([^,]+?)\s*\)$/))) {
      const a = compileExpr(m, mm[1]), b = compileExpr(m, mm[2]); const uses = s => /\bt\b/.test(s);
      if (uses(mm[1]) || uses(mm[2])) return { kind: 'param', fx: a, fy: b, params: [...new Set(a.params.concat(b.params))] };
      return { kind: 'point', fx: a, fy: b, params: [...new Set(a.params.concat(b.params))] };
    }
    if ((mm = s0.match(/^r\s*=\s*(.+)$/))) { const a = compileExpr(m, mm[1], ['theta', 't']); return { kind: 'polar', f: a, params: a.params }; }
    const parts = splitTop(s0);
    if (parts.length === 3) {
      const [lhs, op, rhs] = parts.map(p => p.trim());
      const hasY = s => /\by\b/.test(s), hasX = s => /\bx\b/.test(s);
      if (op === '=') {
        if (/^(y|[fgh]\(x\))$/.test(lhs) && !hasY(rhs)) { const f = compileExpr(m, rhs); return { kind: 'fx', f, params: f.params, name: lhs }; }
        if (lhs === 'x' && !hasX(rhs) && hasY(rhs)) { const f = compileExpr(m, rhs); return { kind: 'fy', f, params: f.params }; }
        if (lhs === 'x' && !hasX(rhs) && !hasY(rhs)) { const f = compileExpr(m, rhs); return { kind: 'vline', f, params: f.params }; }
        const F = compileExpr(m, `(${lhs}) - (${rhs})`); return { kind: 'implicit', f: F, params: F.params, op };
      }
      if (lhs === 'y' && !hasY(rhs)) { const f = compileExpr(m, rhs); return { kind: 'ineqy', f, params: f.params, op }; }
      const F = compileExpr(m, `(${lhs}) - (${rhs})`); return { kind: 'ineq', f: F, params: F.params, op };
    }
    if (parts.length > 3) throw new Error(T('Use one comparison per line.', 'استخدم مقارنة واحدة في كل سطر.'));
    if (/\by\b/.test(s0)) { const F = compileExpr(m, s0); return { kind: 'implicit', f: F, params: F.params, op: '=' }; }
    const f = compileExpr(m, s0);
    if (/\bx\b/.test(s0)) return { kind: 'fx', f, params: f.params, name: 'y' };
    return { kind: 'value', f, params: f.params };
  }
  L.classify = async raw => classify(await M(), raw);

  /* ======================= graphing ======================= */
  const DEF_PARAM = n => (/^[hkcdpq]$/.test(n) ? 0 : n === 'r' ? 3 : 1);
  function Grapher(opts) {
    const st = { exprs: [], params: {}, view: { x0: -10, x1: 10, y0: -7, y1: 7 }, keypts: true, table: { idx: 0, start: -3, step: 1 } };
    let m = null, plot = null, side = null, hover = null, anim = null, seq = 0;
    const scope = () => { const s = { e: Math.E, pi: Math.PI }; for (const k in st.params) s[k] = st.params[k].value; return s; };
    const C = () => L.colors();
    function add(src, o) {
      o = o || {}; const c = classify(m, src);
      const id = 'e' + (++seq), col = o.color || C().pal[(st.exprs.length) % C().pal.length];
      c.params.forEach(p => { if (!st.params[p]) st.params[p] = Object.assign({ value: o.paramValues && o.paramValues[p] != null ? o.paramValues[p] : DEF_PARAM(p), min: -10, max: 10, step: 0.1 }, (o.paramRanges || {})[p] || {}); });
      const e = Object.assign({ id, src, color: col, visible: true, label: o.label || null, dash: o.dash || null, role: o.role || null }, c);
      st.exprs.push(e); return e;
    }
    // evaluation helpers built per draw (with the current parameter values)
    function fOf(e) { const sc = scope(); return x => { sc.x = x; try { const v = e.f.code.evaluate(sc); return typeof v === 'number' ? v : (v && v.re != null && Math.abs(v.im) < 1e-12 ? v.re : NaN); } catch (er) { return NaN; } }; }
    function F2(e) { const sc = scope(); return (x, y) => { sc.x = x; sc.y = y; try { const v = e.f.code.evaluate(sc); return typeof v === 'number' ? v : (typeof v === 'boolean' ? (v ? 1 : -1) : NaN); } catch (er) { return NaN; } }; }
    function draw(g, P) {
      const c = C();
      for (const e of st.exprs) {
        if (!e.visible) continue; const col = e.color;
        try {
          if (e.kind === 'fx') P.fn(fOf(e), col, { dash: e.dash });
          else if (e.kind === 'fy') { const f = fOf(e), sc = scope(); const pts = []; for (let py = 0; py <= P.H; py += 1) { const y = P.iy(py); sc.y = y; let v; try { v = e.f.code.evaluate(sc); } catch (er) { v = NaN; } pts.push([v, y]); } P.path(pts, col); }
          else if (e.kind === 'vline') { const v = e.f.code.evaluate(scope()); P.path([[v, P.view.y0], [v, P.view.y1]], col); }
          else if (e.kind === 'implicit') implicit(P, F2(e), col);
          else if (e.kind === 'ineqy' || e.kind === 'ineq') region(P, e, col);
          else if (e.kind === 'param') { const sc = scope(), pts = []; const t0 = st.params.__t0 ? st.params.__t0.value : 0, t1 = st.params.__t1 ? st.params.__t1.value : 2 * Math.PI; for (let i = 0; i <= 800; i++) { sc.t = t0 + (t1 - t0) * i / 800; let X, Y; try { X = e.fx.code.evaluate(sc); Y = e.fy.code.evaluate(sc); } catch (er) { X = Y = NaN; } pts.push([X, Y]); } P.path(pts, col); }
          else if (e.kind === 'polar') { const sc = scope(), pts = []; for (let i = 0; i <= 1440; i++) { const th = i / 1440 * 4 * Math.PI; sc.theta = sc.t = th; let r; try { r = e.f.code.evaluate(sc); } catch (er) { r = NaN; } pts.push([r * Math.cos(th), r * Math.sin(th)]); } P.path(pts, col); }
          else if (e.kind === 'point') { const sc = scope(); const X = e.fx.code.evaluate(sc), Y = e.fy.code.evaluate(sc); P.dot(X, Y, col, `(${N.fmt(X, 3)}, ${N.fmt(Y, 3)})`, { r: 6 }); }
        } catch (er) { e.error = er.message; }
      }
      if (st.keypts) for (const k of keyPoints()) P.dot(k.x, k.y, c.muted, k.label, { r: 4.5, ring: true, lc: c.muted });
      if (opts.extraDraw) opts.extraDraw(g, P, api);
      if (hover) { P.dot(hover.x, hover.y, hover.col, `(${N.fmt(hover.x, 3)}, ${N.fmt(hover.y, 3)})`, { r: 6, ring: true, bold: true }); }
    }
    // marching squares: the zero set of F(x, y), skipping cells that straddle a pole
    function implicit(P, F, col) {
      const g = P.g, cs = 5, nx = Math.ceil(P.W / cs) + 1, ny = Math.ceil(P.H / cs) + 1, V = new Float64Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[j * nx + i] = F(P.ix(i * cs), P.iy(j * cs));
      g.strokeStyle = col; g.lineWidth = 2.6; g.beginPath();
      const lerp = (a, b) => (a === b ? 0.5 : a / (a - b));
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = V[j * nx + i], b = V[j * nx + i + 1], c = V[(j + 1) * nx + i + 1], d = V[(j + 1) * nx + i];
        if (![a, b, c, d].every(isFinite)) continue;
        const mx = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)); const span = (P.view.x1 - P.view.x0) * 50; if (mx > span * span) continue;
        const pts = []; const x = i * cs, y = j * cs;
        if ((a > 0) !== (b > 0)) pts.push([x + cs * lerp(a, b), y]);
        if ((b > 0) !== (c > 0)) pts.push([x + cs, y + cs * lerp(b, c)]);
        if ((d > 0) !== (c > 0)) pts.push([x + cs * lerp(d, c), y + cs]);
        if ((a > 0) !== (d > 0)) pts.push([x, y + cs * lerp(a, d)]);
        if (pts.length >= 2) { g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); if (pts.length === 4) { g.moveTo(pts[2][0], pts[2][1]); g.lineTo(pts[3][0], pts[3][1]); } }
      }
      g.stroke();
    }
    function region(P, e, col) {
      const g = P.g, strict = e.op === '<' || e.op === '>';
      g.save(); g.globalAlpha = 0.18; g.fillStyle = col;
      if (e.kind === 'ineqy') { // y < f(x): shade each pixel column between the curve and the edge
        const f = fOf(e), above = e.op[0] === '>';
        for (let px = 0; px < P.W; px += 2) { const y = f(P.ix(px)); if (!isFinite(y)) continue; const Y = Math.max(0, Math.min(P.H, P.Y(y))); if (above) g.fillRect(px, 0, 2, Y); else g.fillRect(px, Y, 2, P.H - Y); }
        g.restore(); P.fn(f, col, { dash: strict ? [7, 6] : null });
      } else {
        const F = F2(e), cs = 4, gt = e.op[0] === '>';
        for (let py = 0; py < P.H; py += cs) for (let px = 0; px < P.W; px += cs) { const v = F(P.ix(px + cs / 2), P.iy(py + cs / 2)); if (isFinite(v) && (gt ? (strict ? v > 0 : v >= 0) : (strict ? v < 0 : v <= 0))) g.fillRect(px, py, cs, cs); }
        g.restore(); g.save(); if (strict) g.setLineDash([7, 6]); implicit(P, F, col); g.restore();
      }
    }
    // roots, turning points and intersections of the visible explicit functions (numerical, labelled as such)
    function keyPoints() {
      if (!plot || !plot.W) return [];
      const v = plot.view, out = [], fx = st.exprs.filter(e => e.visible && e.kind === 'fx');
      fx.forEach(e => {
        const f = fOf(e);
        N.roots(f, v.x0, v.x1, 500).slice(0, 8).forEach(x => out.push({ x, y: 0, label: `(${N.fmt(x, 3)}, 0)`, type: 'root', of: e.id }));
        N.extrema(f, v.x0, v.x1, 400).slice(0, 6).forEach(p => out.push({ x: p.x, y: p.y, label: `${p.kind} (${N.fmt(p.x, 3)}, ${N.fmt(p.y, 3)})`, type: p.kind, of: e.id }));
        const y0 = f(0); if (isFinite(y0) && v.x0 < 0 && v.x1 > 0) out.push({ x: 0, y: y0, label: `(0, ${N.fmt(y0, 3)})`, type: 'yint', of: e.id });
      });
      for (let i = 0; i < fx.length; i++) for (let j = i + 1; j < fx.length; j++) { const a = fOf(fx[i]), b = fOf(fx[j]); N.roots(x => a(x) - b(x), v.x0, v.x1, 500).slice(0, 6).forEach(x => out.push({ x, y: a(x), label: `∩ (${N.fmt(x, 3)}, ${N.fmt(a(x), 3)})`, type: 'intersection', of: fx[i].id + '|' + fx[j].id })); }
      return out;
    }
    // table of values for the chosen explicit function
    function table() {
      const fx = st.exprs.filter(e => e.kind === 'fx'); const e = fx[st.table.idx] || fx[0]; if (!e) return [];
      const f = fOf(e), rows = [['x', e.name || 'y']]; for (let i = 0; i < 11; i++) { const x = +(st.table.start + i * st.table.step).toFixed(10); rows.push([x, f(x)]); } return rows;
    }
    /* ---------- side panel ---------- */
    function renderSide() {
      side.innerHTML = '';
      const list = ui.group(T('Expressions', 'التعابير'));
      st.exprs.forEach((e, i) => {
        const row = ui.el('div', 'lab-ex' + (e.visible ? '' : ' is-off')); row.dataset.id = e.id;
        row.innerHTML = `<button type="button" class="lab-ex__sw" style="--c:${e.color}" aria-label="${T('Show or hide', 'إظهار أو إخفاء')} ${esc(e.src)}" aria-pressed="${e.visible}"></button><input class="lab-ex__in" value="${esc(e.src)}" aria-label="${T('Expression', 'التعبير')} ${i + 1}" spellcheck="false"><button type="button" class="lab-ex__x" aria-label="${T('Remove', 'حذف')}">×</button>${e.error ? `<small class="lab-ex__err">${esc(e.error)}</small>` : ''}${e.label ? `<small class="lab-ex__lbl">${esc(e.label)}</small>` : ''}`;
        row.querySelector('.lab-ex__sw').addEventListener('click', () => { e.visible = !e.visible; renderSide(); redraw(); });
        row.querySelector('.lab-ex__sw').addEventListener('contextmenu', ev => { ev.preventDefault(); const p = C().pal; e.color = p[(p.indexOf(e.color) + 1) % p.length]; renderSide(); redraw(); });
        row.querySelector('.lab-ex__x').addEventListener('click', () => { st.exprs = st.exprs.filter(x => x !== e); prune(); renderSide(); redraw(); });
        row.querySelector('.lab-ex__in').addEventListener('change', ev => { try { const idx = st.exprs.indexOf(e); const n = add(ev.target.value, { color: e.color }); st.exprs.splice(st.exprs.length - 1, 1); st.exprs[idx] = n; prune(); } catch (er) { e.error = er.message; } renderSide(); redraw(); });
        list.appendChild(row);
      });
      const nw = ui.el('form', 'lab-ex lab-ex--new'); nw.innerHTML = `<span class="lab-ex__sw" aria-hidden="true">+</span><input class="lab-ex__in" placeholder="${T('Add: y = 2x + 1, x^2 + y^2 = 9, y < sin x, (cos t, sin t), r = 2cos(3θ)', 'أضف تعبيراً')}" aria-label="${T('Add an expression', 'أضف تعبيراً')}" spellcheck="false">`;
      nw.addEventListener('submit', ev => { ev.preventDefault(); const v = nw.querySelector('input').value.trim(); if (!v) return; try { add(v); } catch (er) { L.note(T('Not understood: ', 'غير مفهوم: ') + er.message); } renderSide(); redraw(); });
      list.appendChild(nw);
      const vals = st.exprs.filter(e => e.kind === 'value'); vals.forEach(e => { try { const v = e.f.code.evaluate(scope()); list.appendChild(ui.el('p', 'lab-val', `${esc(e.src)} = <b>${esc(typeof v === 'number' ? N.fmt(v, 10) : String(v))}</b>`)); } catch (er) { /* shown as error */ } });
      side.appendChild(list);
      const pk = Object.keys(st.params).filter(k => !k.startsWith('__') && used(k));
      if (pk.length) {
        const g = ui.group(T('Sliders', 'المنزلقات'), T('Drag, or tap the value to type one. ▶ animates.', 'اسحب أو اضغط القيمة لكتابتها.'));
        pk.forEach(k => {
          const p = st.params[k]; const wrap = ui.el('div', 'lab-slrow');
          const s = ui.slider({ key: k, label: k, min: p.min, max: p.max, step: p.step, value: p.value, on: v => { p.value = v; redraw(); } });
          const play = ui.el('button', 'lab-play', '▶'); play.type = 'button'; play.setAttribute('aria-label', T('Animate ', 'حرّك ') + k);
          play.addEventListener('click', () => { if (anim && anim.k === k) { stopAnim(); return; } stopAnim(); let dir = 1; const tick = () => { p.value += dir * (p.max - p.min) / 240; if (p.value > p.max) { p.value = p.max; dir = -1; } if (p.value < p.min) { p.value = p.min; dir = 1; } s.set(+p.value.toFixed(4)); redraw(); anim.raf = requestAnimationFrame(tick); }; anim = { k, raf: requestAnimationFrame(tick), btn: play }; play.textContent = '❚❚'; });
          s.dataset.param = k; wrap.append(s, play); g.appendChild(wrap);
        });
        side.appendChild(g);
      }
      if (st.exprs.some(e => e.kind === 'param')) {
        const g = ui.group(T('Parameter t', 'المعامل t'));
        if (!st.params.__t0) { st.params.__t0 = { value: 0, min: -20, max: 20, step: 0.1 }; st.params.__t1 = { value: +(2 * Math.PI).toFixed(4), min: -20, max: 40, step: 0.1 }; }
        g.appendChild(ui.slider({ key: '__t0', label: 't from', min: -20, max: 20, step: 0.1, value: st.params.__t0.value, on: v => { st.params.__t0.value = v; redraw(); } }));
        g.appendChild(ui.slider({ key: '__t1', label: 't to', min: -20, max: 40, step: 0.1, value: st.params.__t1.value, on: v => { st.params.__t1.value = v; redraw(); } }));
        side.appendChild(g);
      }
      const kp = ui.group(T('Key points', 'نقاط مهمة'), T('Found numerically in the current window.', 'محسوبة عددياً في النافذة الحالية.'));
      kp.appendChild(ui.toggle({ key: 'keypts', label: T('Show roots, turning points and intersections', 'إظهار الجذور ونقاط الانعطاف والتقاطعات'), value: st.keypts, on: v => { st.keypts = v; redraw(); } }));
      const kl = ui.el('ul', 'lab-kp'); kp.appendChild(kl); side.appendChild(kp);
      const tb = ui.group(T('Table', 'جدول القيم'));
      const fx = st.exprs.filter(e => e.kind === 'fx');
      if (fx.length) {
        if (fx.length > 1) tb.appendChild(ui.select({ key: 'tbl', label: T('Function', 'الدالة'), value: st.table.idx, options: fx.map((e, i) => [i, e.src]), on: v => { st.table.idx = +v; renderTable(); } }));
        const row = ui.el('div', 'lab-row2'); const st0 = ui.el('label', 'lab-se', `<span>${T('Start x', 'بداية x')}</span><input type="number" step="any" value="${st.table.start}">`), sp = ui.el('label', 'lab-se', `<span>${T('Step', 'الخطوة')}</span><input type="number" step="any" value="${st.table.step}">`);
        st0.querySelector('input').addEventListener('change', e2 => { st.table.start = +e2.target.value || 0; renderTable(); }); sp.querySelector('input').addEventListener('change', e2 => { st.table.step = +e2.target.value || 1; renderTable(); });
        row.append(st0, sp); tb.appendChild(row); tb.appendChild(ui.el('div', 'lab-tbl'));
      } else tb.appendChild(ui.el('p', 'lab-sub', T('Add a function y = … to see a table.', 'أضف دالة لرؤية الجدول.')));
      side.appendChild(tb);
      const vw = ui.group(T('Window', 'النافذة'));
      const vr = ui.el('div', 'lab-row4'); ['x0', 'x1', 'y0', 'y1'].forEach(k => { const l = ui.el('label', 'lab-se', `<span>${{ x0: 'x min', x1: 'x max', y0: 'y min', y1: 'y max' }[k]}</span><input type="number" step="any" data-v="${k}">`); vr.appendChild(l); }); vw.appendChild(vr);
      vr.addEventListener('change', e2 => { const i = e2.target.closest('[data-v]'); if (!i || !isFinite(+i.value)) return; const v = Object.assign({}, plot.view); v[i.dataset.v] = +i.value; if (v.x1 > v.x0 && v.y1 > v.y0) { plot.equal = false; plot.setView(v); } });
      vw.appendChild(ui.buttons([['−', () => plot.zoom(1.25)], ['+', () => plot.zoom(0.8)], [T('Fit', 'ملاءمة'), () => { plot.equal = true; plot.reset(); }], [T('Equal axes', 'محاور متساوية'), () => { plot.equal = true; plot.fit(); plot.render(); }]]));
      side.appendChild(vw);
      renderTable(); syncWindow(); listKeys();
    }
    function used(k) { return st.exprs.some(e => e.params && e.params.includes(k)); }
    function prune() { Object.keys(st.params).forEach(k => { if (!k.startsWith('__') && !used(k)) delete st.params[k]; }); }
    function renderTable() { const box = side && side.querySelector('.lab-tbl'); if (!box) return; const rows = table(); box.innerHTML = rows.length ? `<table><thead><tr><th>${esc(rows[0][0])}</th><th>${esc(rows[0][1])}</th></tr></thead><tbody>${rows.slice(1).map(r => `<tr><td>${N.fmt(r[0], 6)}</td><td>${isFinite(r[1]) ? N.fmt(r[1], 6) : T('undefined', 'غير معرّف')}</td></tr>`).join('')}</tbody></table>` : ''; }
    function syncWindow() { if (!side || !plot || !plot.W) return; side.querySelectorAll('[data-v]').forEach(i => { if (document.activeElement !== i) i.value = +plot.view[i.dataset.v].toPrecision(4); }); }
    function listKeys() { const ul = side && side.querySelector('.lab-kp'); if (!ul) return; const ks = st.keypts ? keyPoints() : []; ul.innerHTML = ks.slice(0, 14).map(k => `<li><i class="lab-kp__${k.type}"></i>${esc(k.label.replace(/^max/, T('maximum', 'قيمة عظمى')).replace(/^min/, T('minimum', 'قيمة صغرى')))}</li>`).join('') || `<li class="lab-sub">${T('None in this window.', 'لا شيء في هذه النافذة.')}</li>`; }
    function redraw() { if (!plot) return; plot.render(); syncWindow(); listKeys(); renderTable(); L.explainNow(); }
    function stopAnim() { if (anim) { cancelAnimationFrame(anim.raf); anim.btn.textContent = '▶'; anim = null; } }

    const api = {
      st, add, fOf, scope, redraw, keyPoints, table, renderSide,
      async mount(ctx) {
        m = await M(); side = ctx.side;
        (opts.exprs || []).forEach(x => { try { add(typeof x === 'string' ? x : x.src, typeof x === 'string' ? { paramValues: opts.paramValues, paramRanges: opts.paramRanges } : Object.assign({ paramValues: opts.paramValues, paramRanges: opts.paramRanges }, x)); } catch (er) { L.note(T('Skipped: ', 'تم تجاهل: ') + (typeof x === 'string' ? x : x.src) + ' — ' + er.message); } });
        plot = new L.Plot(ctx.stage, { view: opts.view || autoView(), label: T('Graph of ', 'رسم ') + st.exprs.map(e => e.src).join('; '), onView: () => { syncWindow(); listKeys(); },
          onHover: (x, y, px, py) => { let best = null; st.exprs.filter(e => e.visible && e.kind === 'fx').forEach(e => { const f = fOf(e), fy = f(x); if (!isFinite(fy)) return; const d = Math.abs(plot.Y(fy) - py); if (d < 14 && (!best || d < best.d)) best = { d, x, y: fy, col: e.color }; }); hover = best; plot.render(); },
          onDown: opts.onDown ? (x, y, e) => opts.onDown(x, y, e, api) : null, onDrag: opts.onDrag ? (x, y, e) => opts.onDrag(x, y, e, api) : null });
        plot.draw = draw; api.plot = plot;
        plot.cv.addEventListener('pointerleave', () => { hover = null; plot.render(); });
        renderSide(); plot.render(); setTimeout(() => { listKeys(); renderTable(); }, 30);
        return api;
      },
      destroy() { stopAnim(); plot && plot.destroy(); }
    };
    function autoView() { return { x0: -10, x1: 10, y0: -7, y1: 7 }; }
    return api;
  }
  L.Grapher = Grapher;

  // quadratic facts from a function, numerically (works for any coefficients, including slider values)
  function quadFacts(f) { const c = f(0), a = (f(1) + f(-1) - 2 * c) / 2, b = (f(1) - f(-1)) / 2, check = Math.abs(f(2) - (4 * a + 2 * b + c)) + Math.abs(f(-3) - (9 * a - 3 * b + c)); if (check > 1e-7 * (1 + Math.abs(a) + Math.abs(b) + Math.abs(c)) || Math.abs(a) < 1e-12) return null; const D = b * b - 4 * a * c, h = -b / (2 * a), k = f(h); return { a, b, c, D, h, k }; }
  L.quadFacts = quadFacts;
  const clean = s => esc(s).replace(/\*/g, '·');

  const MATHWORDS = /^(sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|arcsin|arccos|arctan|exp|log|ln|sqrt|cbrt|abs|floor|ceil|round|sign|min|max|mod|theta|pi)$/i;
  const englishy = s => (s.match(/[a-zA-Z]{3,}/g) || []).some(w => !MATHWORDS.test(w) && !/^(sin|cos|tan|log|sqrt|exp|abs)[a-z]$/i.test(w));
  function extractExprs(t) {
    const s = t.replace(/^[^:]*:\s*/, m0 => (/=|<|>/.test(m0) ? m0 : '')).replace(/\b(graph|plot|sketch|draw|show( me)?|visuali[sz]e|compare)\b/gi, ' ');
    const pieces = s.split(/;|,(?![^(]*\))|\band\b|\n/).map(x => x.trim().replace(/[.?!]+$/, '')).filter(Boolean);
    const out = [];
    for (const p of pieces) {
      const mm = p.match(/((?:[yr]|[fgh]\(x\)|x)\s*(?:<=|>=|≤|≥|<|>|=)\s*.+|[-\w\s^*/+().|]+?\s*(?:<=|>=|≤|≥|<|>|=)\s*[-\w\s^*/+().|]+)/i);
      if (mm && /[xy0-9θ]/.test(mm[1]) && !englishy(mm[1])) out.push(mm[1].trim());
      else { const bare = p.match(/^(?:y\s*=\s*)?((?:sin|cos|tan|log|ln|sqrt|abs|exp|e\^|\d|x|\()[-\w\s^*/+().|]*x[-\w\s^*/+().|]*)$/i); if (bare && /x/.test(bare[1])) out.push(bare[1].trim()); }
    }
    const pts = t.match(/\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)/g); if (pts && /\bpoints?\b|\bplot\b/i.test(t)) pts.forEach(p => out.push(p));
    return out;
  }
  L.extractExprs = extractExprs;

  /* -------- the graphing engine (Noor Lab) -------- */
  const PRESETS = [
    [/\bsine\b.*\bcosine\b|\bsin\b.*\bcos\b.*(relationship|compare|differ|together)|relationship between sin/i, { title: 'Sine and cosine', exprs: ['y = sin(x)', 'y = cos(x)', { src: 'y = sin(x + c)', dash: [6, 5] }], paramValues: { c: 0 }, paramRanges: { c: { min: -6.3, max: 6.3, step: 0.01 } }, note: 'cos x = sin(x + π/2): drag c to π/2 ≈ 1.571 and the dashed sine lands exactly on the cosine.' }],
    [/linear (and|vs\.?|versus) exponential|exponential (and|vs\.?|versus) linear/i, { title: 'Linear vs exponential growth', exprs: ['y = m x + 1', 'y = b^x'], paramValues: { m: 2, b: 2 }, paramRanges: { b: { min: 0.1, max: 4, step: 0.01 } }, view: { x0: -2, x1: 8, y0: -2, y1: 40 }, note: 'A linear function adds the same amount each step; an exponential multiplies by the same factor — so for any b > 1 the exponential eventually overtakes the line.' }],
    [/\bparabola\b|quadratic|vertex form/i, { title: 'A quadratic in vertex form', exprs: ['y = a(x - h)^2 + k'], paramValues: { a: 1, h: 0, k: 0 } }],
    [/\bcircle\b.*\bequation\b|\bequation of a circle\b/i, { title: 'Circle: (x − h)² + (y − k)² = r²', exprs: ['(x - h)^2 + (y - k)^2 = r^2'], paramValues: { h: 0, k: 0, r: 3 } }],
    [/\bstraight line\b|\blinear function\b|\by\s*=\s*mx\s*\+\s*c\b|gradient and intercept/i, { title: 'Straight line y = mx + c', exprs: ['y = m x + c'], paramValues: { m: 1, c: 0 } }],
    [/\bexponential\b/i, { title: 'Exponential function', exprs: ['y = a b^x'], paramValues: { a: 1, b: 2 }, paramRanges: { b: { min: 0.1, max: 4, step: 0.01 } } }],
    [/\blogarithm|\blog function|\bln\b graph/i, { title: 'Logarithm and exponential', exprs: ['y = ln(x)', 'y = e^x', { src: 'y = x', dash: [5, 5] }] }],
    [/\babsolute value\b/i, { title: 'Absolute value', exprs: ['y = a|x - h| + k'], paramValues: { a: 1, h: 0, k: 0 } }],
    [/\bpiecewise\b/i, { title: 'A piecewise function', exprs: ['y = {x < 0: -x, x < 2: x^2, 4}'] }],
    [/\bpolar\b|\brose curve\b|\bcardioid\b/i, { title: 'Polar curve', exprs: ['r = a cos(n θ)'], paramValues: { a: 4, n: 3 } }],
    [/\bparametric\b/i, { title: 'Parametric curve', exprs: ['(a cos(t), b sin(t))'], paramValues: { a: 4, b: 2 } }],
    [/\binequalit/i, { title: 'Inequalities', exprs: ['y > x^2 - 4', 'y <= 2x + 1'] }],
    [/\btrig(onometric)? (functions?|graphs?)\b|\btangent graph\b/i, { title: 'Trigonometric functions', exprs: ['y = a sin(b(x - c))', 'y = tan(x)'], paramValues: { a: 1, b: 1, c: 0 } }],
    [/\brational function\b|asymptote/i, { title: 'A rational function', exprs: ['y = (x^2 - 1)/(x - 2)'] }]
  ];
  let g1 = null; // the open grapher (for conversational edits)
  L.register({
    id: 'graph', family: 'math', kind: T('Maths · Graphing', 'رياضيات · الرسم البياني'), title: T('Graphing calculator', 'الحاسبة البيانية'),
    match(t) {
      const ask = /\b(graph|plot|sketch|draw|visuali[sz]e|show( me)?|compare|explain why|why does)\b/i.test(t), ex = extractExprs(t);
      if (/\b(derivative|differentiat|integra|area under|riemann|limit|tangent line|slope field|concav|inflection)\b/i.test(t)) return null;
      if (ex.length && (ask || ex.some(e => /^(y|r|f\(x\))\s*=/.test(e) || /[<>]/.test(e)))) return { score: 0.9, params: { exprs: ex, title: ex.length > 1 ? T(`${ex.length} graphs`, `${ex.length} رسوم`) : ex[0] } };
      for (const [re, p] of PRESETS) if (re.test(t) && (ask || /\b(explain|how|what|why|experiment|explore)\b/i.test(t))) return { score: 0.7, params: p };
      if (/\b(graphing calculator|graph paper|open the grapher)\b/i.test(t)) return { score: 0.8, params: { exprs: [] } };
      return null;
    },
    async mount(ctx) {
      const p = ctx.params; g1 = Grapher({ exprs: p.exprs || [], paramValues: p.paramValues, paramRanges: p.paramRanges, view: p.view });
      await g1.mount(ctx); g1.note = p.note;
      const inst = {
        g: g1, intro: () => graphIntro(g1),
        explain: () => graphExplain(g1),
        command: t => graphCommand(g1, t),
        state: () => ({ expressions: g1.st.exprs.map(e => ({ src: e.src, kind: e.kind, color: e.color, visible: e.visible })), parameters: Object.fromEntries(Object.entries(g1.st.params).filter(([k]) => !k.startsWith('__')).map(([k, v]) => [k, v.value])), window: Object.assign({}, g1.plot.view), keyPoints: g1.keyPoints().map(k => ({ type: k.type, x: +k.x.toFixed(6), y: +k.y.toFixed(6) })) }),
        table: () => g1.table(), canvas: () => g1.plot.cv, summary: () => graphSummary(g1),
        params: () => Object.keys(g1.st.params).filter(k => !k.startsWith('__')).map(k => ({ key: k, label: k, step: g1.st.params[k].step })),
        get: k => g1.st.params[k].value, set: (k, v) => setParam(g1, k, v),
        reset: () => { L.open('graph', p); }, redraw: () => g1.redraw(), destroy: () => g1.destroy()
      };
      return inst;
    }
  });
  function setParam(G, k, v) { const p = G.st.params[k]; if (!p) return; p.value = v; if (v < p.min) p.min = Math.floor(v - 1); if (v > p.max) p.max = Math.ceil(v + 1); const s = G.st && document.querySelector(`.lab__side [data-param="${k}"]`); G.renderSide(); G.redraw(); }
  function graphSummary(G) { return G.st.exprs.map(e => e.src).join('\n') + '\n' + G.keyPoints().map(k => k.label).join('\n'); }
  function graphIntro(G) {
    const ex = G.st.exprs; if (!ex.length) return T('The graphing calculator is open — type an expression in the panel or tell me what to graph.', 'الحاسبة البيانية مفتوحة.');
    const pk = Object.keys(G.st.params).filter(k => !k.startsWith('__'));
    let s = T(`I’ve graphed ${ex.map(e => '`' + e.src + '`').join(', ')} in the lab.`, `رسمت ${ex.map(e => e.src).join('، ')} في المختبر.`);
    if (pk.length) s += ' ' + T(`Sliders for ${pk.join(', ')} change the graph live.`, `منزلقات ${pk.join('، ')} تغيّر الرسم مباشرة.`);
    const ks = G.keyPoints(); if (ks.length) s += ' ' + T('Key points (computed numerically): ', 'النقاط المهمة (عددياً): ') + ks.slice(0, 6).map(k => k.label).join('; ') + '.';
    if (G.note) s += '\n\n' + G.note;
    return s;
  }
  function graphExplain(G) {
    const ex = G.st.exprs.filter(e => e.visible), sc = G.scope(); let h = '';
    const fx = ex.filter(e => e.kind === 'fx');
    if (G.note) h += `<p class="lab-callout">${esc(G.note)}</p>`;
    for (const e of ex.slice(0, 4)) {
      h += `<h5><i class="lab-dot" style="--c:${e.color}"></i>${clean(e.src)}</h5>`;
      if (e.kind === 'fx') {
        const f = G.fOf(e), q = quadFacts(f);
        if (q) {
          h += `<p>${T('A quadratic', 'دالة تربيعية')}: ${T('with the current sliders', 'بقيم المنزلقات الحالية')} y = ${N.fmt(q.a, 3)}x² ${q.b < 0 ? '−' : '+'} ${N.fmt(Math.abs(q.b), 3)}x ${q.c < 0 ? '−' : '+'} ${N.fmt(Math.abs(q.c), 3)}.</p><ul>
            <li>${T('Vertex', 'الرأس')} (${N.fmt(q.h, 3)}, ${N.fmt(q.k, 3)}) — ${q.a > 0 ? T('opens upward (a > 0), so the vertex is a minimum', 'يفتح لأعلى') : T('opens downward (a < 0), so the vertex is a maximum', 'يفتح لأسفل')}.</li>
            <li>${T('|a| sets the width', '|a| يحدد العرض')}: |a| = ${N.fmt(Math.abs(q.a), 3)} ${Math.abs(q.a) > 1 ? T('(narrower than y = x²)', '(أضيق)') : Math.abs(q.a) < 1 ? T('(wider than y = x²)', '(أعرض)') : ''}.</li>
            <li>${T('Discriminant', 'المميز')} b² − 4ac = ${N.fmt(q.D, 4)} → ${q.D > 1e-9 ? T('two real roots: the curve crosses the x-axis twice', 'جذران حقيقيان') : Math.abs(q.D) <= 1e-9 ? T('one repeated root: the vertex touches the x-axis', 'جذر مكرر') : T('no real roots: the curve never reaches the x-axis', 'لا جذور حقيقية')}.</li></ul>`;
        } else {
          const v = G.plot.view, rs = N.roots(f, v.x0, v.x1, 500), xs = N.extrema(f, v.x0, v.x1, 400);
          h += `<ul><li>${T('Roots in view', 'الجذور الظاهرة')}: ${rs.length ? rs.slice(0, 6).map(x => N.fmt(x, 4)).join(', ') : T('none', 'لا يوجد')}</li><li>${T('Turning points in view', 'نقاط الانعطاف')}: ${xs.length ? xs.slice(0, 5).map(p => `${p.kind === 'max' ? T('max', 'عظمى') : T('min', 'صغرى')} (${N.fmt(p.x, 3)}, ${N.fmt(p.y, 3)})`).join('; ') : T('none', 'لا يوجد')}</li></ul>`;
          if (/\/|tan|log|ln|sqrt/.test(e.src)) h += `<p class="lab-sub">${T('Gaps in the curve are where it is undefined (division by zero, a log or square root of a negative number) — the grapher leaves them out rather than joining across them.', 'الفجوات حيث تكون الدالة غير معرّفة.')}</p>`;
        }
      } else if (e.kind === 'implicit') h += `<p>${T('An implicit equation: every point (x, y) that makes both sides equal is drawn.', 'معادلة ضمنية: تُرسم كل نقطة تحققها.')}</p>`;
      else if (e.kind === 'ineqy' || e.kind === 'ineq') h += `<p>${T('The shaded region is every point that satisfies the inequality.', 'المنطقة المظللة تحقق المتباينة.')} ${/[<>]$|^[^=]*[<>][^=]/.test(e.op) && e.op.length === 1 ? T('The dashed boundary is not included (strict inequality).', 'الحد المتقطع غير مشمول.') : T('The solid boundary is included.', 'الحد المتصل مشمول.')}</p>`;
      else if (e.kind === 'param') h += `<p>${T('A parametric curve: as t runs over its range, (x(t), y(t)) traces the path.', 'منحنى وسيطي.')}</p>`;
      else if (e.kind === 'polar') h += `<p>${T('A polar curve: for each angle θ the point is at distance r(θ) from the origin.', 'منحنى قطبي.')}</p>`;
    }
    const inter = G.keyPoints().filter(k => k.type === 'intersection');
    if (inter.length) h += `<h5>${T('Intersections', 'التقاطعات')}</h5><p>${inter.map(k => esc(k.label)).join('<br>')}</p><p class="lab-sub">${T('Each is a solution of the system — where both equations are true at once.', 'كل تقاطع حل للنظام.')}</p>`;
    const pk = Object.keys(G.st.params).filter(k => !k.startsWith('__'));
    if (pk.length) h += `<p class="lab-sub">${T('Current values', 'القيم الحالية')}: ${pk.map(k => `${k} = ${N.fmt(sc[k], 3)}`).join(', ')}</p>`;
    h += `<details class="lab-more"><summary>${T('Try this', 'جرّب')}</summary><ul><li>${T('Say “make it wider”, “move the vertex to (2, 3)”, “show the derivative”, “zoom out” or “add y = 2x”.', 'قل «اجعله أعرض» أو «أظهر المشتقة».')}</li><li>${T('Drag the graph to pan; pinch or scroll to zoom; hover or touch a curve to read coordinates.', 'اسحب للتحريك، واقرص للتكبير.')}</li></ul></details>`;
    return h;
  }
  function graphCommand(G, t) {
    let mm; const P = G.st.params, has = k => P[k] && !k.startsWith('__');
    const first = G.st.exprs.find(e => e.kind === 'fx');
    if ((mm = t.match(/\b(?:add|also (?:graph|plot)|and (?:graph|plot)|plot also)\s+(.+)$/i))) { const ex = extractExprs(mm[1]); const list = ex.length ? ex : (/[=<>]/.test(mm[1]) || (/\bx\b/.test(mm[1]) && !englishy(mm[1])) ? [mm[1]] : []); const done = []; for (const s of list) { try { G.add(s); done.push(s); } catch (e) { /* not an expression */ } } if (done.length) { G.renderSide(); G.redraw(); return { note: T('Added ', 'أضفت ') + done.join(', ') + '.' }; } }
    if (/\b(wider|widen|flatter|less steep)\b/i.test(t) && has('a')) { setParam(G, 'a', P.a.value / 2); return { note: T(`Wider: a is now ${N.fmt(P.a.value)} (|a| < 1 stretches the parabola sideways).`, `أعرض: a = ${N.fmt(P.a.value)}`) }; }
    if (/\b(narrower|thinner|steeper|stretch)\b/i.test(t) && has('a')) { setParam(G, 'a', P.a.value * 2); return { note: T(`Narrower: a is now ${N.fmt(P.a.value)}.`, `أضيق: a = ${N.fmt(P.a.value)}`) }; }
    if ((mm = t.match(/\bvertex (?:to|at)\s*\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?/i))) {
      const h = +mm[1], k = +mm[2];
      if (has('h') && has('k')) { setParam(G, 'h', h); setParam(G, 'k', k); return { note: T(`Vertex moved to (${h}, ${k}).`, `نُقل الرأس إلى (${h}, ${k}).`) }; }
      if (first) { const q = quadFacts(G.fOf(first)); if (q) { const idx = G.st.exprs.indexOf(first); const n = G.add('y = a(x - h)^2 + k', { color: first.color, paramValues: { a: +q.a.toFixed(6), h, k } }); G.st.exprs.splice(G.st.exprs.length - 1, 1); G.st.exprs[idx] = n; ['a', 'h', 'k'].forEach(x => { G.st.params[x].value = x === 'a' ? +q.a.toFixed(6) : x === 'h' ? h : k; }); G.renderSide(); G.redraw(); return { note: T(`Rewritten in vertex form with the same a = ${N.fmt(q.a)} and the vertex at (${h}, ${k}).`, 'أُعيدت الكتابة بصيغة الرأس.') }; } }
    }
    if (/\b(show|add|draw|graph)\b.*\b(second derivative|f''|f″)/i.test(t) && first) return addDerivative(G, first, 2);
    if (/\b(show|add|draw|graph|plot)\b.*\b(derivative|f'|f′|gradient function)\b/i.test(t) && first) return addDerivative(G, first, 1);
    if (/\b(hide|remove|delete)\b.*\b(derivative|f')/i.test(t)) { const n = G.st.exprs.length; G.st.exprs = G.st.exprs.filter(e => e.role !== 'deriv'); G.renderSide(); G.redraw(); return { note: n !== G.st.exprs.length ? T('Derivative removed.', 'حُذفت المشتقة.') : T('There is no derivative on the graph.', 'لا توجد مشتقة.') }; }
    if (/\bexplain\b.*\b(difference|derivative|relationship|compare)\b/i.test(t) && G.st.exprs.some(e => e.role === 'deriv')) { const d = G.st.exprs.find(e => e.role === 'deriv'); return { note: T('Explained below and in the panel.', 'الشرح أدناه.'), more: T(`The dashed curve ${'`' + d.src + '`'} is the derivative of ${'`' + first.src + '`'}: its height at any x equals the slope of the original curve there. Where the original rises the derivative is positive, where it falls the derivative is negative, and at each turning point of the original the derivative crosses zero.`, 'المنحنى المتقطع هو المشتقة: ارتفاعه يساوي ميل المنحنى الأصلي.') }; }
    if ((mm = t.match(/\b(reflect|flip)\b/i)) && first) { wrapExpr(G, first, s => `-(${s})`); return { note: T('Reflected in the x-axis (y → −y).', 'انعكاس في محور x.') }; }
    if ((mm = t.match(/\b(?:shift|move|translate)\s+(?:it\s+)?(up|down|left|right)\s+(?:by\s+)?(-?[\d.]+)/i)) && first) {
      const d = +mm[2], dir = mm[1].toLowerCase();
      if ((dir === 'up' || dir === 'down') && has('k')) { setParam(G, 'k', P.k.value + (dir === 'up' ? d : -d)); return { note: T(`Moved ${dir} ${d}: k = ${N.fmt(P.k.value)}.`, 'نُقل.') }; }
      if ((dir === 'left' || dir === 'right') && has('h')) { setParam(G, 'h', P.h.value + (dir === 'right' ? d : -d)); return { note: T(`Moved ${dir} ${d}: h = ${N.fmt(P.h.value)}.`, 'نُقل.') }; }
      if (dir === 'up' || dir === 'down') wrapExpr(G, first, s => `(${s}) ${dir === 'up' ? '+' : '-'} ${d}`); else wrapExpr(G, first, s => s.replace(/\bx\b/g, `(x ${dir === 'right' ? '-' : '+'} ${d})`));
      return { note: T(`Translated ${dir} by ${d}.`, 'تمت الإزاحة.') };
    }
    if (/\bzoom in\b/i.test(t)) { G.plot.zoom(0.6); return { note: T('Zoomed in.', 'تكبير.') }; }
    if (/\bzoom out\b/i.test(t)) { G.plot.zoom(1.6); return { note: T('Zoomed out.', 'تصغير.') }; }
    if ((mm = t.match(/\bx\s*(?:from|between)\s*(-?[\d.]+)\s*(?:to|and)\s*(-?[\d.]+)/i))) { G.plot.equal = false; G.plot.setView({ x0: +mm[1], x1: +mm[2] }); G.redraw(); return { note: T(`x window: ${mm[1]} to ${mm[2]}.`, 'نافذة x.') }; }
    if (/\b(reset|fit) (the )?(view|window|zoom)\b/i.test(t)) { G.plot.equal = true; G.plot.reset(); return { note: T('View reset.', 'أعيد العرض.') }; }
    if ((mm = t.match(/\b(?:colou?r)\s+(?:the\s+)?(?:(first|second|third|derivative)\s+)?(?:one|graph|curve|line)?\s*(red|blue|green|orange|purple|teal|pink|black)\b/i))) { const map = { red: '#dc2626', blue: '#2563eb', green: '#16a34a', orange: '#ea580c', purple: '#7c3aed', teal: '#0f766e', pink: '#db2777', black: '#111827' }; const which = { first: 0, second: 1, third: 2 }[(mm[1] || 'first').toLowerCase()]; const e = mm[1] === 'derivative' ? G.st.exprs.find(x => x.role === 'deriv') : G.st.exprs[which || 0]; if (e) { e.color = map[mm[2].toLowerCase()]; G.renderSide(); G.redraw(); return { note: T('Colour changed.', 'تغيّر اللون.') }; } }
    if ((mm = t.match(/\b(hide|show)\s+(?:the\s+)?(first|second|third|last)\b/i))) { const arr = G.st.exprs; const e = mm[2] === 'last' ? arr[arr.length - 1] : arr[{ first: 0, second: 1, third: 2 }[mm[2].toLowerCase()]]; if (e) { e.visible = mm[1].toLowerCase() === 'show'; G.renderSide(); G.redraw(); return { note: (e.visible ? T('Showing ', 'إظهار ') : T('Hiding ', 'إخفاء ')) + e.src }; } }
    if (/\b(table|values)\b/i.test(t) && /\b(show|make|give|table)\b/i.test(t)) { const box = document.querySelector('.lab__side .lab-tbl'); box && box.scrollIntoView({ block: 'center', behavior: L.still() ? 'auto' : 'smooth' }); return { note: T('The table of values is in the side panel; change Start x and Step to explore.', 'جدول القيم في اللوحة الجانبية.') }; }
    if (/\b(key points|roots|zeros|intersections?)\b/i.test(t)) { const ks = G.keyPoints(); G.st.keypts = true; G.redraw(); return { note: ks.length ? ks.slice(0, 8).map(k => k.label).join('; ') : T('No roots or intersections in this window.', 'لا جذور أو تقاطعات في هذه النافذة.') }; }
    return null;
  }
  function wrapExpr(G, e, fn) { const rhs = e.src.replace(/^\s*(y|f\(x\))\s*=\s*/, ''); const idx = G.st.exprs.indexOf(e); const n = G.add('y = ' + fn(rhs), { color: e.color }); G.st.exprs.splice(G.st.exprs.length - 1, 1); G.st.exprs[idx] = n; G.renderSide(); G.redraw(); }
  // a derivative computed symbolically (Nerdamer), checked numerically against the original before it is drawn
  async function symDeriv(src, order) {
    const cas = await L.libs.cas(); let e = src.replace(/^\s*(y|f\(x\))\s*=\s*/, '');
    e = prep(e).replace(/\blog\(/g, 'log(');
    let d = cas(e); for (let i = 0; i < order; i++) d = cas.diff(d, 'x');
    return d.toString();
  }
  function addDerivative(G, e, order) {
    const f = G.fOf(e); const placeholder = { note: T('Working out the derivative…', 'أحسب المشتقة…') };
    symDeriv(e.src, order).then(ds => {
      let txt = ds.replace(/\*/g, '*');
      const n = G.add('y = ' + txt, { color: G.st.exprs.length % 2 ? '#dc2626' : '#16a34a', dash: [8, 6], label: order === 1 ? T('derivative f′(x)', 'المشتقة') : T('second derivative f″(x)', 'المشتقة الثانية'), role: 'deriv' });
      // check: symbolic derivative ≈ numerical slope at several points
      const d = G.fOf(n), xs = [-2.3, -0.7, 0.4, 1.9]; const ok = xs.every(x => { const a = d(x), b = order === 1 ? N.deriv(f, x) : N.deriv2(f, x); return !isFinite(a) || !isFinite(b) || Math.abs(a - b) < 1e-3 * (1 + Math.abs(b)); });
      if (!ok) n.label += ' — ' + T('check failed: treat with care', 'فشل التحقق');
      G.renderSide(); G.redraw(); L.note(T(`Added ${order === 1 ? 'f′' : 'f″'}(x) = ${txt}${ok ? ' (checked numerically)' : ''}.`, `أضيفت المشتقة ${txt}`));
    }).catch(err => {
      const n = G.add('y = 0', { label: T('numerical derivative', 'مشتقة عددية'), role: 'deriv', dash: [8, 6] }); n.kind = 'fx'; const base = G.fOf(e); n.f = { code: { evaluate: sc => N.deriv(x => { const s2 = Object.assign({}, sc, { x }); return e.f.code.evaluate(s2); }, sc.x) } }; n.src = T('numerical d/dx', 'مشتقة عددية'); G.renderSide(); G.redraw();
      L.note(T('The derivative couldn’t be found symbolically, so it is drawn numerically.', 'رُسمت المشتقة عددياً.'));
    });
    return placeholder;
  }

  /* ======================= calculus ======================= */
  function fnFromText(t, dflt) {
    const s = L.normalise(t);
    let mm = s.match(/(?:of|for|f\(x\)\s*=|y\s*=)\s*([-\w\s^*/+().|]+?)(?:\s+(?:from|between|as|when|at|on|over|with|using|and)\b|[?.,]|$)/i);
    let e = mm && mm[1].trim();
    if (e && !/x/.test(e)) e = null;
    if (e) e = e.replace(/^(y|f\(x\))\s*=\s*/i, '');
    return e || dflt;
  }
  L.fnFromText = fnFromText;
  L.register({
    id: 'calculus', family: 'math', kind: T('Maths · Calculus', 'رياضيات · التفاضل والتكامل'), title: T('Calculus', 'التفاضل والتكامل'),
    match(t) {
      if (/\b(integra|area under|riemann|antideriv|definite integral)/i.test(t)) return { score: 0.92, params: { mode: 'integral', f: fnFromText(t, '0.3x^2 + 1'), ...bounds(t) } };
      if (/\blimit\b|\bapproaches\b|\btends to\b|→/i.test(t) && /x/.test(t)) return { score: 0.9, params: { mode: 'limit', f: fnFromText(t, 'sin(x)/x'), at: (t.match(/(?:approaches|tends to|→|->|to)\s*(-?[\d.]+|infinity|∞)/i) || [, '0'])[1] } };
      if (/\b(slope field|direction field|differential equation|dy\/dx\s*=)/i.test(t)) { const m0 = L.normalise(t).match(/dy\/dx\s*=\s*([-\w\s^*/+().]+)/i); return { score: 0.92, params: { mode: 'ode', rhs: m0 ? m0[1].trim() : 'x - y' } }; }
      if (/\b(concav|inflection|increasing|decreasing|stationary point|turning point|maxim|minim|extrem|optimi[sz])/i.test(t) && /\b(function|curve|graph|x)\b/i.test(t)) return { score: 0.85, params: { mode: 'analysis', f: fnFromText(t, 'x^3 - 3x') } };
      if (/\b(derivatives?|differentiat\w*|tangent( lines?)?|normal line|slope of|rate of change|gradient of (the |a )?curve)\b/i.test(t) && !/\bcircle\b/i.test(t) && !/^\s*(differentiate|find the derivative)\b.*\bwith respect\b/i.test(t)) return { score: 0.9, params: { mode: 'derivative', f: fnFromText(t, 'x^2') } };
      return null;
    },
    async mount(ctx) { return calculus(ctx); }
  });
  function bounds(t) { const m0 = L.normalise(t).match(/from\s*(-?[\d.]+|pi|\-?pi)\s*(?:to|and)\s*(-?[\d.]+|pi)/i) || L.normalise(t).match(/between\s*(-?[\d.]+)\s*and\s*(-?[\d.]+)/i); const v = s => (/pi/.test(s) ? (s.startsWith('-') ? -Math.PI : Math.PI) : +s); return m0 ? { a: v(m0[1]), b: v(m0[2]) } : {}; }
  async function calculus(ctx) {
    const p = Object.assign({ mode: 'derivative', f: 'x^2' }, ctx.params), mode = p.mode;
    const S = { x0: 1, a: p.a != null ? p.a : 0, b: p.b != null ? p.b : 3, n: 6, method: 'left', normal: false, second: false, playing: false, h: 0.5, y0: 1, xs: 0, ys: 1 };
    let G, sym = null, symI = null, exactI = null, raf = 0, tLimit = null;
    const fsrc = mode === 'ode' ? null : 'y = ' + p.f;
    const exprs = mode === 'ode' ? [] : [fsrc];
    G = Grapher({ exprs, view: mode === 'integral' ? { x0: Math.min(-1, S.a - 1), x1: Math.max(5, S.b + 1.5), y0: -2, y1: 8 } : mode === 'limit' ? { x0: -6, x1: 6, y0: -2, y1: 3 } : null,
      extraDraw: (g, P) => extra(g, P),
      onDown: (x, y) => { if (mode === 'derivative' || mode === 'analysis') { const f = fx(); if (Math.abs(P2.Y(f(x)) - P2.Y(y)) < 30 || Math.abs(x - S.x0) < (P2.view.x1 - P2.view.x0) * 0.04) { S.x0 = x; sync(); return true; } } if (mode === 'ode') { S.xs = x; S.ys = y; sync(); return true; } return false; },
      onDrag: x2 => { if (mode === 'ode') return; S.x0 = x2; sync(); } });
    await G.mount(ctx);
    const P2 = G.plot; const fe = G.st.exprs[0]; const fx = () => (fe ? G.fOf(fe) : () => NaN);
    if (fe) fe.label = mode === 'derivative' || mode === 'analysis' ? 'f(x)' : null;
    // symbolic derivative / integral (Nerdamer), each checked numerically
    try {
      if (mode === 'derivative' || mode === 'analysis') { sym = await symDeriv(fsrc, 1); const d = G.add('y = ' + sym, { dash: [8, 6], color: '#dc2626', label: 'f′(x)', role: 'deriv' }); if (mode === 'analysis') { const d2 = await symDeriv(fsrc, 2); G.add('y = ' + d2, { dash: [3, 5], color: '#16a34a', label: 'f″(x)', role: 'deriv2' }); } }
      if (mode === 'integral') { const cas = await L.libs.cas(); symI = cas.integrate(prep(p.f), 'x').toString(); if (/integrate/.test(symI)) symI = null; }
    } catch (e) { sym = sym || null; }
    G.renderSide(); P2.render();
    const side = ctx.side, grp = ui.group(mode === 'integral' ? T('Integral', 'التكامل') : mode === 'limit' ? T('Limit', 'النهاية') : mode === 'ode' ? T('Differential equation', 'المعادلة التفاضلية') : T('Point on the curve', 'نقطة على المنحنى'));
    if (mode === 'derivative' || mode === 'analysis') {
      grp.appendChild(ui.slider({ key: 'x0', label: 'x₀', min: -8, max: 8, step: 0.01, value: S.x0, on: v => { S.x0 = v; sync(true); } }));
      grp.appendChild(ui.buttons([[T('▶ Move the point', '▶ حرّك النقطة'), () => toggle(), { key: 'play' }]]));
      grp.appendChild(ui.toggle({ key: 'normal', label: T('Show the normal line', 'إظهار الخط العمودي'), value: false, on: v => { S.normal = v; P2.render(); } }));
      if (mode === 'analysis') { grp.appendChild(ui.toggle({ key: 'shade', label: T('Colour increasing / decreasing and concavity', 'تلوين التزايد والتقعر'), value: true, on: v => { S.shade = v; P2.render(); } })); S.shade = true; }
    }
    if (mode === 'integral') {
      grp.appendChild(ui.slider({ key: 'a', label: T('lower limit a', 'الحد الأدنى a'), min: -10, max: 10, step: 0.05, value: S.a, on: v => { S.a = v; sync(); } }));
      grp.appendChild(ui.slider({ key: 'b', label: T('upper limit b', 'الحد الأعلى b'), min: -10, max: 10, step: 0.05, value: S.b, on: v => { S.b = v; sync(); } }));
      grp.appendChild(ui.slider({ key: 'n', label: T('rectangles n', 'المستطيلات n'), min: 1, max: 200, step: 1, value: S.n, on: v => { S.n = v; sync(); } }));
      grp.appendChild(ui.select({ key: 'method', label: T('Method', 'الطريقة'), value: S.method, options: [['left', T('Left Riemann sum', 'مجموع ريمان الأيسر')], ['right', T('Right Riemann sum', 'مجموع ريمان الأيمن')], ['mid', T('Midpoint rule', 'قاعدة النقطة الوسطى')], ['trap', T('Trapezoid rule', 'قاعدة شبه المنحرف')]], on: v => { S.method = v; sync(); } }));
    }
    if (mode === 'limit') { const at = p.at === 'infinity' || p.at === '∞' ? Infinity : +p.at; S.at = at; grp.appendChild(ui.slider({ key: 'hstep', label: T('distance from the point', 'المسافة من النقطة'), min: 0.0001, max: 1, step: 0.0001, value: 0.5, on: v => { S.h = v; sync(); } })); }
    if (mode === 'ode') {
      const fi = ui.el('label', 'lab-se', `<span>dy/dx =</span><input value="${esc(p.rhs)}" spellcheck="false">`); fi.querySelector('input').addEventListener('change', async e => { try { S.rhs = (await M()).compile(prep(e.target.value)); S.rhsSrc = e.target.value; sync(); } catch (er) { L.note(er.message); } }); grp.appendChild(fi);
      S.rhs = (await M()).compile(prep(p.rhs)); S.rhsSrc = p.rhs;
      grp.appendChild(ui.slider({ key: 'xs', label: T('start x₀', 'البداية x₀'), min: -8, max: 8, step: 0.1, value: S.xs, on: v => { S.xs = v; sync(); } }));
      grp.appendChild(ui.slider({ key: 'ys', label: T('start y₀', 'البداية y₀'), min: -6, max: 6, step: 0.1, value: S.ys, on: v => { S.ys = v; sync(); } }));
      grp.appendChild(ui.slider({ key: 'hh', label: T('Euler step h', 'خطوة أويلر h'), min: 0.05, max: 1, step: 0.05, value: S.h, on: v => { S.h = v; sync(); } }));
    }
    side.prepend(grp);
    const fslope = x => N.deriv(fx(), x);
    function riemann() { const f = fx(), a = S.a, b = S.b, n = S.n, w = (b - a) / n; let s = 0; for (let i = 0; i < n; i++) { const xl = a + i * w, xr = xl + w; s += S.method === 'left' ? f(xl) * w : S.method === 'right' ? f(xr) * w : S.method === 'mid' ? f((xl + xr) / 2) * w : (f(xl) + f(xr)) / 2 * w; } return s; }
    function exact() { if (symI) { try { const m = mathLib; const Fc = m.compile(prep(symI)); const v = Fc.evaluate({ x: S.b }) - Fc.evaluate({ x: S.a }); if (isFinite(v)) { const num = N.simpson(fx(), S.a, S.b, 2000); if (Math.abs(v - num) < 1e-6 * (1 + Math.abs(num))) return { v, how: 'exact', F: symI }; } } catch (e) { /* fall through */ } } return { v: N.simpson(fx(), S.a, S.b, 4000), how: 'numerical' }; }
    function odeCurve(h, rk) { const f = (x, y) => { try { return S.rhs.evaluate({ x, y }); } catch (e) { return NaN; } }; const pts = [[S.xs, S.ys]]; for (const dir of [1, -1]) { let x = S.xs, y = S.ys; const arr = []; for (let i = 0; i < 400; i++) { if (rk) { const k = N.rk4((xx, yy) => [f(xx, yy[0])], x, [y], dir * h); y = k[0]; } else y += dir * h * f(x, y); x += dir * h; if (!isFinite(y) || Math.abs(x - S.xs) > 30) break; arr.push([x, y]); } if (dir === 1) pts.push(...arr); else pts.unshift(...arr.reverse()); } return pts; }
    function extra(g, P) {
      const c = L.colors(), f = fx();
      if (mode === 'derivative' || mode === 'analysis') {
        if (mode === 'analysis' && S.shade) { const v = P.view; g.save(); g.globalAlpha = 0.09; for (let px = 0; px < P.W; px += 2) { const x = P.ix(px), d = N.deriv(f, x), dd = N.deriv2(f, x); if (!isFinite(d)) continue; g.fillStyle = d > 0 ? '#16a34a' : '#dc2626'; g.fillRect(px, 0, 2, 8); g.fillStyle = dd > 0 ? '#2563eb' : '#c2410c'; g.fillRect(px, P.H - 8, 2, 8); } g.restore(); }
        const x = S.x0, y = f(x), m = fslope(x); if (!isFinite(y)) return;
        P.fn(X => y + m * (X - x), c.dark ? '#fde68a' : '#b45309', { w: 2 });
        if (S.normal && Math.abs(m) > 1e-9) P.fn(X => y - (X - x) / m, c.muted, { w: 1.5, dash: [4, 4] });
        const d = isFinite(m) ? m : NaN; P.dot(x, y, c.dark ? '#fde68a' : '#b45309', `P(${N.fmt(x, 2)}, ${N.fmt(y, 2)})  slope ${N.fmt(d, 3)}`, { r: 7, ring: true, bold: true });
        P.dot(x, d, '#dc2626', `f′(${N.fmt(x, 2)}) = ${N.fmt(d, 3)}`, { r: 5, ring: true });
        g.setLineDash([3, 4]); g.strokeStyle = c.muted; g.beginPath(); g.moveTo(P.X(x), P.Y(y)); g.lineTo(P.X(x), P.Y(d)); g.stroke(); g.setLineDash([]);
      }
      if (mode === 'integral') {
        const a = Math.min(S.a, S.b), b = Math.max(S.a, S.b), n = S.n, w = (b - a) / n;
        g.save(); g.globalAlpha = 0.16; g.fillStyle = '#2563eb'; g.beginPath(); g.moveTo(P.X(a), P.Y(0)); for (let i = 0; i <= 300; i++) { const X = a + (b - a) * i / 300; const Y = f(X); g.lineTo(P.X(X), P.Y(isFinite(Y) ? Y : 0)); } g.lineTo(P.X(b), P.Y(0)); g.closePath(); g.fill(); g.restore();
        if (n <= 120) { g.save(); g.strokeStyle = c.dark ? '#fbbf24' : '#b45309'; g.lineWidth = 1.2; g.fillStyle = c.dark ? 'rgba(251,191,36,.18)' : 'rgba(180,83,9,.14)'; for (let i = 0; i < n; i++) { const xl = a + i * w, xr = xl + w; g.beginPath(); if (S.method === 'trap') { g.moveTo(P.X(xl), P.Y(0)); g.lineTo(P.X(xl), P.Y(f(xl))); g.lineTo(P.X(xr), P.Y(f(xr))); g.lineTo(P.X(xr), P.Y(0)); g.closePath(); } else { const h = S.method === 'left' ? f(xl) : S.method === 'right' ? f(xr) : f((xl + xr) / 2); g.rect(P.X(xl), Math.min(P.Y(0), P.Y(h)), P.X(xr) - P.X(xl), Math.abs(P.Y(h) - P.Y(0))); } g.fill(); g.stroke(); } g.restore(); }
        P.text(a, 0, 'a', c.ink, { dy: 16, align: 'center' }); P.text(b, 0, 'b', c.ink, { dy: 16, align: 'center' });
      }
      if (mode === 'limit') {
        const at = S.at; if (isFinite(at)) { const h = S.h, l = f(at - h), r = f(at + h); P.dot(at - h, l, '#2563eb', `x = ${N.fmt(at - h, 4)}: ${N.fmt(l, 6)}`, { r: 5 }); P.dot(at + h, r, '#dc2626', `x = ${N.fmt(at + h, 4)}: ${N.fmt(r, 6)}`, { r: 5 }); const L0 = tLimit; if (L0 != null && isFinite(L0)) { g.strokeStyle = c.muted; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(0, P.Y(L0)); g.lineTo(P.W, P.Y(L0)); g.stroke(); g.setLineDash([]); g.strokeStyle = c.ink; g.fillStyle = c.bg; g.lineWidth = 2; g.beginPath(); g.arc(P.X(at), P.Y(L0), 5, 0, 7); g.fill(); g.stroke(); } }
      }
      if (mode === 'ode') {
        const v = P.view, sx = (v.x1 - v.x0) / 22, sy = sx; g.strokeStyle = c.muted; g.lineWidth = 1.2;
        for (let x = Math.ceil(v.x0 / sx) * sx; x <= v.x1; x += sx) for (let y = Math.ceil(v.y0 / sy) * sy; y <= v.y1; y += sy) { let m; try { m = S.rhs.evaluate({ x, y }); } catch (e) { continue; } if (!isFinite(m)) continue; const a = Math.atan(m), L2 = sx * 0.38; g.beginPath(); g.moveTo(P.X(x - L2 * Math.cos(a)), P.Y(y - L2 * Math.sin(a))); g.lineTo(P.X(x + L2 * Math.cos(a)), P.Y(y + L2 * Math.sin(a))); g.stroke(); }
        P.path(odeCurve(0.02, true), '#2563eb', { w: 2.8 }); P.path(odeCurve(S.h, false), '#dc2626', { w: 1.8, dash: [6, 4] }); P.dot(S.xs, S.ys, c.ink, `(${N.fmt(S.xs, 2)}, ${N.fmt(S.ys, 2)})`, { r: 6, ring: true });
      }
    }
    function sync(fromSlider) { if (!fromSlider) side.querySelectorAll('[data-key]').forEach(i => { const k = i.dataset.key; const w = i.closest('.lab-sl'); if (w && S[k] != null && document.activeElement !== i) w.set(S[k]); }); P2.render(); L.explainNow(); }
    function toggle() { const b = side.querySelector('[data-key="play"]'); if (raf) { cancelAnimationFrame(raf); raf = 0; b.textContent = T('▶ Move the point', '▶ حرّك النقطة'); return; } const v = P2.view; let dir = 1; const tick = () => { S.x0 += dir * (v.x1 - v.x0) / 400; if (S.x0 > v.x1 - 0.5) dir = -1; if (S.x0 < v.x0 + 0.5) dir = 1; sync(); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); b.textContent = T('❚❚ Pause', '❚❚ إيقاف'); }
    // limit: numerical table from both sides; Nerdamer's limit where it can find one
    if (mode === 'limit') { try { const cas = await L.libs.cas(); const r = cas(`limit(${prep(p.f)}, x, ${isFinite(S.at) ? S.at : 'Infinity'})`).evaluate().text('decimals'); const v = +r; if (isFinite(v)) tLimit = v; } catch (e) { tLimit = null; } }
    function limitTable() { const f = fx(), at = S.at; if (!isFinite(at)) { return [1e1, 1e2, 1e3, 1e4, 1e6].map(x => [x, f(x)]); } return [1, 0.1, 0.01, 0.001, 0.0001].map(h => [h, f(at - h), f(at + h)]); }
    P2.render();
    const inst = {
      g: G,
      intro() {
        if (mode === 'derivative') return T(`I’ve drawn f(x) = ${p.f}, its derivative${sym ? ` f′(x) = ${sym.replace(/\*/g, '')}` : ''} (dashed, red) and a point P you can drag along the curve. The orange line is the tangent at P: its slope always equals the height of the red curve at the same x. Press ▶ to watch it move.`, 'رسمت الدالة ومشتقتها والمماس.');
        if (mode === 'integral') { const e = exact(); return T(`The shaded area under f(x) = ${p.f} from a = ${N.fmt(S.a)} to b = ${N.fmt(S.b)} is ${N.fmt(e.v, 6)} (${e.how === 'exact' ? 'exact, from the antiderivative ' + e.F.replace(/\*/g, '') : 'computed numerically'}). The rectangles are a ${S.n}-rectangle Riemann sum — increase n to watch the sum approach the integral.`, 'المساحة تحت المنحنى.'); }
        if (mode === 'limit') return T(`I’ve graphed f(x) = ${p.f} and evaluated it on both sides of x = ${p.at}. ${tLimit != null ? `The values approach ${N.fmt(tLimit, 6)}` : 'See the table'} — the limit describes what f(x) approaches, even if f is undefined exactly there.`, 'النهاية.');
        if (mode === 'ode') return T(`Slope field for dy/dx = ${S.rhsSrc}: each short line shows the slope at that point. The blue curve is a solution through your starting point (RK4), and the dashed red one is Euler’s method with step h — make h larger to see Euler drift away.`, 'حقل الميل.');
        return T(`f(x) = ${p.f} with f′ (red dashed) and f″ (green dotted). Top strip: green where f is increasing, red where decreasing. Bottom strip: blue where concave up, orange where concave down.`, 'تحليل الدالة.');
      },
      explain() {
        const f = fx(), c = [];
        if (mode === 'derivative' || mode === 'analysis') {
          const x = S.x0, y = f(x), m = fslope(x);
          c.push(`<p>${T('The derivative f′(x) is the slope of the tangent line at x.', 'المشتقة هي ميل المماس.')}</p>`);
          if (sym) c.push(`<p class="lab-eq">f′(x) = ${clean(sym)}</p><p class="lab-sub">${T('Computed symbolically (Nerdamer) and checked against the numerical slope.', 'محسوبة رمزياً ومتحقق منها عددياً.')}</p>`);
          c.push(ui.readout([['x₀', N.fmt(x, 4)], ['f(x₀)', N.fmt(y, 5)], [T('tangent slope', 'ميل المماس'), N.fmt(m, 5)], [T('tangent line', 'المماس'), `y = ${N.fmt(m, 4)}(x − ${N.fmt(x, 3)}) + ${N.fmt(y, 4)}`]]));
          c.push(`<p>${Math.abs(m) < 1e-3 ? T('Here the tangent is flat: a stationary point.', 'المماس أفقي: نقطة ثابتة.') : m > 0 ? T('Slope positive: f is increasing here.', 'الميل موجب: الدالة متزايدة.') : T('Slope negative: f is decreasing here.', 'الميل سالب: الدالة متناقصة.')}</p>`);
          if (mode === 'analysis') { const v = P2.view; const ex = N.extrema(f, v.x0, v.x1, 500); const infl = N.roots(x2 => N.deriv2(f, x2), v.x0, v.x1, 400).filter(x2 => Math.sign(N.deriv2(f, x2 - 0.01)) !== Math.sign(N.deriv2(f, x2 + 0.01))); c.push(`<h5>${T('Turning points', 'نقاط الانعطاف')}</h5><p>${ex.map(q => `${q.kind === 'max' ? T('local maximum', 'قيمة عظمى محلية') : T('local minimum', 'قيمة صغرى محلية')} (${N.fmt(q.x, 4)}, ${N.fmt(q.y, 4)})`).join('<br>') || T('none in view', 'لا يوجد')}</p><h5>${T('Inflection points', 'نقاط الانقلاب')}</h5><p>${infl.map(x2 => `(${N.fmt(x2, 4)}, ${N.fmt(f(x2), 4)})`).join('<br>') || T('none in view', 'لا يوجد')}</p><p class="lab-sub">${T('Found numerically where f′ or f″ changes sign.', 'محسوبة عددياً.')}</p>`); }
          c.push(`<details class="lab-more"><summary>${T('Common misconception', 'خطأ شائع')}</summary><p>${T('f′(x) = 0 doesn’t always mean a maximum or minimum — for f(x) = x³ the slope is 0 at x = 0 but the curve keeps rising (a stationary inflection point).', 'المشتقة صفر لا تعني دائماً قيمة عظمى أو صغرى.')}</p></details>`);
        }
        if (mode === 'integral') {
          const e = exact(), r = riemann(), lab = { left: T('left', 'الأيسر'), right: T('right', 'الأيمن'), mid: T('midpoint', 'الوسطى'), trap: T('trapezoid', 'شبه المنحرف') }[S.method];
          c.push(`<p>${T('The definite integral is the signed area between f and the x-axis from a to b (area below the axis counts as negative).', 'التكامل المحدد هو المساحة المؤشرة.')}</p>`);
          if (e.F) c.push(`<p class="lab-eq">∫ f(x) dx = ${clean(e.F)} + C</p>`);
          c.push(ui.readout([[`∫<sub>${N.fmt(S.a, 3)}</sub><sup>${N.fmt(S.b, 3)}</sup> f(x) dx`, `${N.fmt(e.v, 8)} <small>(${e.how === 'exact' ? T('exact, via F(b) − F(a)', 'دقيق') : T('numerical, Simpson’s rule', 'عددي')})</small>`], [T(`${lab} sum, n = ${S.n}`, `مجموع ${lab}، n = ${S.n}`), N.fmt(r, 8)], [T('error', 'الخطأ'), N.fmt(r - e.v, 6)]]));
          c.push(`<p>${T('Doubling n roughly halves the error of left/right sums and quarters it for the midpoint and trapezoid rules.', 'مضاعفة n تقلل الخطأ.')}</p>`);
        }
        if (mode === 'limit') {
          const rows = limitTable();
          c.push(`<p>lim<sub>x→${esc(String(p.at))}</sub> ${clean(p.f)} ${tLimit != null ? '= <b>' + N.fmt(tLimit, 6) + '</b>' : ''}</p>`);
          c.push(isFinite(S.at) ? `<table class="lab-t"><tr><th>h</th><th>f(${N.fmt(S.at)} − h)</th><th>f(${N.fmt(S.at)} + h)</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${N.fmt(r[1], 7)}</td><td>${N.fmt(r[2], 7)}</td></tr>`).join('')}</table>` : `<table class="lab-t"><tr><th>x</th><th>f(x)</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${N.fmt(r[1], 7)}</td></tr>`).join('')}</table>`);
          const f0 = isFinite(S.at) ? f(S.at) : NaN; c.push(`<p>${isFinite(S.at) ? (isFinite(f0) ? T(`f(${S.at}) = ${N.fmt(f0, 6)}: defined there${tLimit != null && Math.abs(f0 - tLimit) < 1e-6 ? ', and equal to the limit, so f is continuous at this point' : ''}.`, 'الدالة معرفة.') : T(`f(${S.at}) is undefined (the open circle), yet the values from both sides still approach the limit.`, 'الدالة غير معرفة عند النقطة.')) : ''}</p>`);
          c.push(`<p class="lab-sub">${T('The table and dots are numerical; the limit value comes from Nerdamer’s symbolic limit where it can find one.', 'الجدول عددي.')}</p>`);
        }
        if (mode === 'ode') c.push(`<p>${T('A first-order differential equation gives the slope everywhere; a solution is a curve that follows those slopes.', 'معادلة تفاضلية من الرتبة الأولى.')}</p><p class="lab-eq">dy/dx = ${clean(S.rhsSrc)}</p>${ui.readout([[T('start', 'البداية'), `(${N.fmt(S.xs, 2)}, ${N.fmt(S.ys, 2)})`], [T('Euler step', 'خطوة أويلر'), N.fmt(S.h, 3)]])}<p class="lab-sub">${T('Blue: RK4 with step 0.02 (accurate). Dashed red: Euler’s method — its error grows with h.', 'أزرق: RK4. أحمر: أويلر.')}</p>`);
        return c.join('');
      },
      command(t) {
        let mm;
        if ((mm = t.match(/\b(?:rectangles?|n)\s*(?:to|=)?\s*(\d+)/i)) && mode === 'integral') { S.n = Math.max(1, Math.min(200, +mm[1])); sync(); return { note: `n = ${S.n}.` }; }
        if (/\b(more|increase) rectangles\b/i.test(t) && mode === 'integral') { S.n = Math.min(200, S.n * 2); sync(); return { note: `n = ${S.n}.` }; }
        if ((mm = t.match(/\bfrom\s*(-?[\d.]+)\s*to\s*(-?[\d.]+)/i)) && mode === 'integral') { S.a = +mm[1]; S.b = +mm[2]; sync(); return { note: T(`Limits: ${S.a} to ${S.b}.`, 'الحدود.') }; }
        if ((mm = t.match(/\b(left|right|midpoint|mid|trapezoid|trapezium)\b/i)) && mode === 'integral') { S.method = { left: 'left', right: 'right', midpoint: 'mid', mid: 'mid', trapezoid: 'trap', trapezium: 'trap' }[mm[1].toLowerCase()]; side.querySelector('[data-key="method"]').value = S.method; sync(); return { note: T('Method: ', 'الطريقة: ') + S.method + '.' }; }
        if ((mm = t.match(/\b(?:at|point|x\s*=)\s*(-?[\d.]+)/i)) && (mode === 'derivative' || mode === 'analysis')) { S.x0 = +mm[1]; sync(); return { note: `x₀ = ${S.x0}: ${T('slope', 'الميل')} ${N.fmt(fslope(S.x0), 5)}.` }; }
        if (/\b(animate|play|move the point)\b/i.test(t)) { toggle(); return { note: T('Animating the point.', 'تحريك النقطة.') }; }
        if (/\bnormal\b/i.test(t)) { S.normal = !/hide|remove/i.test(t); P2.render(); return { note: S.normal ? T('Normal line shown.', 'إظهار الخط العمودي.') : T('Normal line hidden.', 'إخفاء الخط العمودي.') }; }
        if ((mm = t.match(/\b(?:step|h)\s*(?:to|=)\s*([\d.]+)/i)) && mode === 'ode') { S.h = +mm[1]; sync(); return { note: `h = ${S.h}.` }; }
        return graphCommand(G, t);
      },
      state: () => ({ mode, f: p.f, derivative: sym, antiderivative: symI, x0: S.x0, slope: mode === 'derivative' || mode === 'analysis' ? fslope(S.x0) : undefined, a: S.a, b: S.b, n: S.n, method: S.method, integral: mode === 'integral' ? exact() : undefined, riemann: mode === 'integral' ? riemann() : undefined, limit: tLimit }),
      table: () => (mode === 'limit' ? [['h', 'f(a-h)', 'f(a+h)']].concat(limitTable()) : G.table()),
      canvas: () => P2.cv, summary: () => inst.intro(),
      params: () => mode === 'integral' ? [{ key: 'a', label: 'a' }, { key: 'b', label: 'b' }, { key: 'n', label: 'n', step: 1 }] : mode === 'ode' ? [{ key: 'h', label: 'h' }] : [{ key: 'x0', label: 'x0', alias: ['x₀', 'point'] }],
      get: k => S[k], set: (k, v) => { S[k] = k === 'n' ? Math.max(1, Math.round(v)) : v; sync(); },
      reset: () => L.open('calculus', ctx.params), redraw: () => P2.render(), destroy: () => { cancelAnimationFrame(raf); G.destroy(); }
    };
    return inst;
  }

  /* ======================= algebra (answers in chat; opens a graph when one helps) ======================= */
  const md = s => s;
  async function algebra(t) {
    const cas = await L.libs.cas(), m = await M(); const s = L.normalise(t);
    const out = [], verify = [];
    let mm;
    // matrices: [[1,2],[3,4]]
    if ((mm = s.match(/\[\s*\[[^\]]+\](?:\s*,\s*\[[^\]]+\])*\s*\]/))) {
      const A = JSON.parse(mm[0].replace(/\s+/g, '')); const mat = m.matrix(A);
      if (/\bdeterminant|\bdet\b/i.test(s)) { const d = m.det(mat); out.push(`det(A) = **${N.fmt(d, 10)}**`); }
      if (/\binverse\b/i.test(s)) { try { const inv = m.inv(mat); out.push('A⁻¹ = ' + mtx(inv.toArray ? inv.toArray() : inv)); const I = m.multiply(mat, inv); verify.push(T('A·A⁻¹ = I checked: ', 'تحقق A·A⁻¹ = I: ') + (m.deepEqual(m.round(I, 9), m.identity(A.length)) ? '✓' : '✗')); } catch (e) { out.push(T('A has no inverse (its determinant is 0).', 'لا معكوس للمصفوفة.')); } }
      if (/\beigen/i.test(s)) { try { const r = m.eigs(mat); const vals = r.values.toArray ? r.values.toArray() : r.values; out.push(T('Eigenvalues: ', 'القيم الذاتية: ') + vals.map(v => '**' + (typeof v === 'number' ? N.fmt(v, 8) : m.format(v, { precision: 8 })) + '**').join(', ')); if (r.eigenvectors) out.push(T('Eigenvectors: ', 'المتجهات الذاتية: ') + r.eigenvectors.map(ev => mtx([[].concat(ev.vector.toArray ? ev.vector.toArray() : ev.vector).map(v => +(+v).toFixed(6))])).join(' ')); } catch (e) { out.push(T('Eigenvalues couldn’t be computed for this matrix here.', 'تعذر حساب القيم الذاتية.')); } }
      if (/\btranspose\b/i.test(s)) out.push('Aᵀ = ' + mtx(m.transpose(A)));
      if (!out.length) out.push(T('det(A) = ', 'det(A) = ') + N.fmt(m.det(mat), 10) + '; A = ' + mtx(A));
      return { text: out.concat(verify.length ? ['', ...verify] : []).join('\n\n') + '\n\n' + T('_Computed with math.js._', '_محسوب بـ math.js._') };
    }
    // systems: two or more equations in x, y (z)
    const eqs = s.replace(/^\s*(?:please\s+)?(?:solve|find|work out)\s*(?:the\s+)?(?:system|simultaneous equations|equations)?\s*:?\s*/i, '').split(/;|,(?![^(]*\))|\band\b|\n/).map(e => e.trim().replace(/[.?!]+$/, '')).filter(e => /=/.test(e) && /[a-z]/.test(e) && !englishy(e));
    if (eqs.length >= 2 && /\b(solve|system|simultaneous|intersect)/i.test(s)) {
      const sol = cas.solveEquations(eqs.map(prep)); const pairs = []; for (let i = 0; i < sol.length; i++) pairs.push([sol[i][0], sol[i][1]]);
      if (!pairs.length) return { text: T('These equations have no common solution (for lines: they are parallel).', 'لا يوجد حل مشترك.') };
      const sc = Object.fromEntries(pairs.map(([k, v]) => [k, +v]));
      const checks = eqs.map(e => { const [l, r] = prep(e).split('='); return Math.abs(m.evaluate(l, sc) - m.evaluate(r, sc)) < 1e-9; });
      const text = [T('**Solution:** ', '**الحل:** ') + pairs.map(([k, v]) => `${k} = ${fracOrDec(cas, v)}`).join(', '), T('Check by substitution: ', 'التحقق بالتعويض: ') + eqs.map((e, i) => `${e} ${checks[i] ? '✓' : '✗'}`).join('; '), T('_Solved with Nerdamer; checked with math.js._', '_الحل بـ Nerdamer._')].join('\n\n');
      const two = pairs.length === 2 && pairs.every(([k]) => k === 'x' || k === 'y') && eqs.every(e => /y/.test(e) || /x/.test(e));
      // graph each equation as y = … where it can be rearranged, so the solution shows as a marked intersection
      const asY = eqs.map(e => { try { const r = cas.solve(prep(e), 'y').toString().replace(/^\[|\]$/g, '').split(','); return r.length === 1 && r[0] && !/y/.test(r[0]) ? 'y = ' + r[0] : e; } catch (er) { return e; } });
      return { text, open: two ? { id: 'graph', params: { exprs: asY, title: T('System of equations', 'نظام المعادلات'), note: T(`The solution (${sc.x}, ${sc.y}) is where the lines cross.`, 'الحل هو نقطة التقاطع.') } } : null };
    }
    const body = s.replace(/^\s*(?:please\s+)?(?:can you\s+)?(solve|factor(?:i[sz]e)?|expand|simplify|differentiate|integrate|evaluate|calculate|compute|work out|what is|what's|find)\s*(?:the\s+)?(?:value of\s+)?/i, '').replace(/\s*(?:for x|with respect to x|wrt x)\s*[?.]*$/i, '').replace(/[?]+$/, '').trim();
    const verb = (s.match(/^\s*(?:please\s+)?(?:can you\s+)?(solve|factor(?:i[sz]e)?|expand|simplify|differentiate|integrate|evaluate|calculate|compute|work out|what is|what's|find)/i) || [, ''])[1].toLowerCase();
    if (/^factor/.test(verb)) { const r = cas(`factor(${prep(body)})`).toString(); const ok = numEq(m, prep(body), r); return { text: `${body} = **${pretty(r)}**\n\n${T('Check: expanding the factors gives back the original', 'التحقق: فك الأقواس يعيد الأصل')} ${ok ? '✓' : '✗'}\n\n${T('_Factorised with Nerdamer._', '_بـ Nerdamer._')}` }; }
    if (verb === 'expand') { const r = cas(`expand(${prep(body)})`).toString(); const ok = numEq(m, prep(body), r); return { text: `${body} = **${pretty(r)}**\n\n${T('Checked numerically', 'تحقق عددياً')} ${ok ? '✓' : '✗'}` }; }
    if (verb === 'simplify') { const r = cas(`simplify(${prep(body)})`).toString(); const ok = numEq(m, prep(body), r); return { text: `${body} = **${pretty(r)}**\n\n${T('Checked numerically', 'تحقق عددياً')} ${ok ? '✓' : '✗'}` }; }
    if (verb === 'differentiate' || (verb === 'find' && /derivative/.test(s))) { const e = body.replace(/^.*derivative of\s*/i, ''); const r = cas.diff(prep(e), 'x').toString(); const f = m.compile(prep(e)), d = m.compile(prep(r)); const ok = [0.3, 1.7, -2.2].every(x => { const a = d.evaluate({ x }), b = N.deriv(v => f.evaluate({ x: v }), x); return !isFinite(a) || Math.abs(a - b) < 1e-4 * (1 + Math.abs(b)); }); return { text: `d/dx (${e}) = **${pretty(r)}**\n\n${T('Checked against the numerical slope at three points', 'تحقق مقابل الميل العددي')} ${ok ? '✓' : '✗'}`, open: { id: 'calculus', params: { mode: 'derivative', f: e } } }; }
    if (verb === 'integrate' || (verb === 'find' && /integral/.test(s))) {
      const bnd = bounds(s); const e = body.replace(/^.*integral of\s*/i, '').replace(/\s*(from|between)\s.*$/i, '').replace(/\s*dx\s*$/, '');
      const r = cas.integrate(prep(e), 'x').toString();
      if (/integrate/.test(r)) return { text: T(`I couldn’t find a closed-form antiderivative of ${e}. `, 'لم أجد تكاملاً مغلقاً. ') + (bnd.a != null ? T(`Numerically, ∫ from ${bnd.a} to ${bnd.b} = **${N.fmt(N.simpson(x => m.evaluate(prep(e), { x }), bnd.a, bnd.b, 4000), 8)}** (Simpson’s rule).`, 'عددياً: ') : ''), open: { id: 'calculus', params: Object.assign({ mode: 'integral', f: e }, bnd) } };
      const F = m.compile(prep(r)), f = m.compile(prep(e)); const ok = [0.4, 1.3, 2.1].every(x => Math.abs(N.deriv(v => F.evaluate({ x: v }), x) - f.evaluate({ x })) < 1e-4 * (1 + Math.abs(f.evaluate({ x }))));
      let txt = `∫ ${e} dx = **${pretty(r)} + C**\n\n${T('Check: differentiating the answer gives back the integrand', 'التحقق: اشتقاق الناتج يعيد الدالة')} ${ok ? '✓' : '✗'}`;
      if (bnd.a != null) { const v = F.evaluate({ x: bnd.b }) - F.evaluate({ x: bnd.a }); txt += `\n\n∫ ${T('from', 'من')} ${bnd.a} ${T('to', 'إلى')} ${bnd.b} = F(${bnd.b}) − F(${bnd.a}) = **${N.fmt(v, 10)}**`; }
      return { text: txt, open: { id: 'calculus', params: Object.assign({ mode: 'integral', f: e }, bnd) } };
    }
    // a single equation in one unknown
    if (/=/.test(body) && (/^solve/.test(verb) || /\bsolve\b/i.test(s) || /^find/.test(verb))) {
      const v = (body.match(/[a-z]/) || ['x'])[0] === 'e' ? 'x' : ((body.replace(/\b(sin|cos|tan|log|ln|sqrt|exp|abs)\b/g, '').match(/[a-z]/) || ['x'])[0]);
      const [l, r] = prep(body).split('=');
      const steps = quadSteps(cas, m, l, r, v);
      let sols = []; try { sols = cas.solve(`${l}=${r}`, v).toString().replace(/^\[|\]$/g, '').split(',').filter(Boolean); } catch (e) { sols = []; }
      const real = sols.map(x => ({ s: x, v: (() => { try { const z = m.evaluate(x); return typeof z === 'number' ? z : (z && Math.abs(z.im) < 1e-12 ? z.re : NaN); } catch (e) { return NaN; } })() }));
      const checked = real.filter(o => isFinite(o.v)).map(o => ({ o, ok: Math.abs(m.evaluate(l, { [v]: o.v }) - m.evaluate(r, { [v]: o.v })) < 1e-6 * (1 + Math.abs(o.v)) }));
      let txt = steps ? steps + '\n\n' : '';
      if (!sols.length) txt += T('No solutions were found.', 'لم يُعثر على حلول.');
      else txt += T('**Solutions:** ', '**الحلول:** ') + sols.map(x => `${v} = ${pretty(x)}${(real.find(o => o.s === x) || {}).v != null && isFinite(real.find(o => o.s === x).v) && /sqrt|\//.test(x) ? ' ≈ ' + N.fmt(real.find(o => o.s === x).v, 8) : ''}`).join(', ');
      if (checked.length) txt += '\n\n' + T('Check by substitution: ', 'التحقق بالتعويض: ') + checked.map(c => `${v} = ${N.fmt(c.o.v, 6)} ${c.ok ? '✓' : '✗'}`).join('; ');
      const complex = real.filter(o => !isFinite(o.v)); if (complex.length) txt += '\n\n' + T('Complex (non-real) solutions are shown exactly; they don’t appear on the graph.', 'الحلول المركبة لا تظهر على الرسم.');
      txt += '\n\n' + T('_Solved with Nerdamer; each real answer substituted back with math.js._', '_الحل بـ Nerdamer._');
      return { text: txt, open: v === 'x' ? { id: 'graph', params: { exprs: [`y = ${l}`, `y = ${r}`], title: T(`Solving ${body}`, `حل ${body}`) } } : null };
    }
    // arithmetic, complex numbers, functions, sequences/series
    try {
      if (/\bsum\b|\bseries\b/i.test(s) && (mm = s.match(/sum of\s+(.+?)\s+(?:for|from)\s+([a-z])\s*=\s*(-?\d+)\s*(?:to|\.\.)\s*(\d+|infinity)/i))) { const [, ex, k, a, b] = mm; let tot = 0; const B = b === 'infinity' ? 100000 : +b; const f = m.compile(prep(ex)); for (let i = +a; i <= B; i++) tot += f.evaluate({ [k]: i }); return { text: `Σ ${ex}, ${k} = ${a}…${b} = **${N.fmt(tot, 10)}**${b === 'infinity' ? T(' (partial sum to 100 000 terms — an approximation)', ' (مجموع جزئي)') : ''}` }; }
      const ex = prep(body || s); const v = m.evaluate(ex);
      if (typeof v === 'number' || (v && (v.re != null || v.isFraction))) { const exact = (() => { try { return cas(ex).toString(); } catch (e) { return null; } })(); return { text: `${body || s} = **${m.format(v, { precision: 12 })}**${exact && exact !== m.format(v, { precision: 12 }) && /[\/a-z]/.test(exact) ? ` (${T('exact', 'دقيق')}: ${pretty(exact)})` : ''}\n\n${T('_Computed with math.js._', '_محسوب بـ math.js._')}` }; }
    } catch (e) { /* not arithmetic */ }
    return null;
  }
  const pretty = s => String(s).replace(/\*/g, '·').replace(/sqrt\(/g, '√(');
  function mtx(A) { return '\n\n| ' + A.map(r => r.map(v => N.fmt(+v, 6)).join(' | ')).join(' |\n| ') + ' |\n'.replace(/^/, ''); }
  function fracOrDec(cas, v) { const s = String(v); try { const f = cas(s).toString(); return /\//.test(f) ? `${f} ≈ ${N.fmt(+cas(s).evaluate().text('decimals'), 8)}` : N.fmt(+s, 10); } catch (e) { return s; } }
  function numEq(m, a, b) { try { return [-1.7, 0.3, 2.4, 3.9].every(x => { const u = m.evaluate(a, { x, y: 1.3 }), v = m.evaluate(b, { x, y: 1.3 }); return Math.abs(u - v) < 1e-8 * (1 + Math.abs(u)); }); } catch (e) { return false; } }
  // genuine steps for a quadratic: read a, b, c from the polynomial itself, then the formula
  function quadSteps(cas, m, l, r, v) {
    try {
      const poly = cas(`expand((${l})-(${r}))`).toString(); const f = m.compile(poly);
      const c = f.evaluate({ [v]: 0 }), a = (f.evaluate({ [v]: 1 }) + f.evaluate({ [v]: -1 }) - 2 * c) / 2, b = (f.evaluate({ [v]: 1 }) - f.evaluate({ [v]: -1 })) / 2;
      if (Math.abs(f.evaluate({ [v]: 3 }) - (9 * a + 3 * b + c)) > 1e-9 || Math.abs(a) < 1e-12 || Math.abs(f.evaluate({ [v]: -2 }) - (4 * a - 2 * b + c)) > 1e-9) {
        if (Math.abs(a) < 1e-12 && Math.abs(f.evaluate({ [v]: 5 }) - (5 * b + c)) < 1e-9 && b !== 0) return [T('**Steps** (a linear equation):', '**الخطوات** (معادلة خطية):'), `1. ${T('Collect terms', 'اجمع الحدود')}: ${N.fmt(b)}${v} ${c < 0 ? '−' : '+'} ${N.fmt(Math.abs(c))} = 0`, `2. ${T('Move the constant', 'انقل الثابت')}: ${N.fmt(b)}${v} = ${N.fmt(-c)}`, `3. ${T('Divide by', 'اقسم على')} ${N.fmt(b)}: ${v} = ${N.fmt(-c / b, 10)}`].join('\n');
        return null;
      }
      const D = b * b - 4 * a * c;
      return [T('**Steps** (a quadratic, read from the expanded equation):', '**الخطوات** (معادلة تربيعية):'), `1. ${T('Standard form', 'الصيغة القياسية')}: ${pretty(poly)} = 0, ${T('so', 'إذن')} a = ${N.fmt(a)}, b = ${N.fmt(b)}, c = ${N.fmt(c)}`, `2. ${T('Discriminant', 'المميز')}: b² − 4ac = ${N.fmt(b * b)} − ${N.fmt(4 * a * c)} = ${N.fmt(D)} → ${D > 0 ? T('two real roots', 'جذران حقيقيان') : D === 0 ? T('one repeated root', 'جذر مكرر') : T('no real roots (two complex roots)', 'جذران مركبان')}`, `3. ${T('Quadratic formula', 'القانون العام')}: ${v} = (−b ± √D) / 2a = (${N.fmt(-b)} ± √${N.fmt(D)}) / ${N.fmt(2 * a)}`].join('\n');
    } catch (e) { return null; }
  }
  L.algebra = algebra;
  L.register({
    id: 'algebra', family: 'math', kind: T('Maths · Algebra', 'رياضيات · الجبر'), title: T('Algebra', 'الجبر'),
    match(t) {
      const s = t.trim();
      if (/\b(mean|median|mode|average|standard deviation|variance|quartile|percentile|range of|histogram|regression|correlation|probability)\b/i.test(s)) return null;
      if (/^\s*(please\s+)?(can you\s+)?(solve|factor(?:i[sz]e)?|expand|simplify|differentiate|integrate|evaluate|calculate|compute|work out)\b/i.test(s) && /[\dx=^]/.test(s) && !/\b(visuali[sz]e|graph|show|explain why|animate)\b/i.test(s)) return { score: 0.95, reply: () => algebra(s) };
      if (/\b(determinant|inverse|eigen(value|vector)s?|transpose)\b/i.test(s) && /\[\s*\[/.test(s)) return { score: 0.95, reply: () => algebra(s) };
      if (/\b(solve|simultaneous|system of equations)\b/i.test(s) && (s.match(/=/g) || []).length >= 2) return { score: 0.93, reply: () => algebra('solve ' + s) };
      // plain arithmetic is left to Noor's calculator; complex numbers and functions come here
      if (/^\s*(what is|what's|find|calculate|compute)?\s*[-\d\s+*/^().]*(sqrt\(\s*-|\bi\b|\d\s*i\b)[-\d\s+*/^().i]*\??\s*$/i.test(s)) return { score: 0.85, reply: () => algebra(s) };
      if (/\b(sum of|series)\b.*\bfrom\b/i.test(s)) return { score: 0.8, reply: () => algebra(s) };
      return null;
    },
    async mount(ctx) { return { explain: () => '', intro: () => '' }; }
  });

  /* ======================= statistics and probability ======================= */
  const Stats = L.stats = {
    sort: a => a.slice().sort((x, y) => x - y),
    mean: a => a.reduce((s, v) => s + v, 0) / a.length,
    median: a => { const s = Stats.sort(a), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; },
    modes: a => { const c = new Map(); a.forEach(v => c.set(v, (c.get(v) || 0) + 1)); const mx = Math.max(...c.values()); return mx === 1 ? [] : [...c].filter(([, n]) => n === mx).map(([v]) => v).sort((x, y) => x - y); },
    variance: (a, sample) => { const m = Stats.mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - (sample ? 1 : 0)); },
    sd: (a, sample) => Math.sqrt(Stats.variance(a, sample)),
    // quartiles by the median-of-halves method (the one most school courses use); stated in the panel
    quartiles: a => { const s = Stats.sort(a), n = s.length, lo = s.slice(0, Math.floor(n / 2)), hi = s.slice(Math.ceil(n / 2)); return [Stats.median(lo.length ? lo : s), Stats.median(s), Stats.median(hi.length ? hi : s)]; },
    percentile: (a, p) => { const s = Stats.sort(a), i = (s.length - 1) * p / 100, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); },
    regress(xs, ys, deg) { // least squares via the normal equations (math.js lusolve)
      deg = deg || 1; const m = mathLib; const X = xs.map(x => Array.from({ length: deg + 1 }, (_, k) => x ** k)); const Xt = m.transpose(X); const beta = m.lusolve(m.multiply(Xt, X), m.multiply(Xt, ys)).map(r => r[0]);
      const yh = xs.map(x => beta.reduce((s, b, k) => s + b * x ** k, 0)); const my = Stats.mean(ys), ssr = ys.reduce((s, y, i) => s + (y - yh[i]) ** 2, 0), sst = ys.reduce((s, y) => s + (y - my) ** 2, 0);
      return { beta, r2: 1 - ssr / sst, f: x => beta.reduce((s, b, k) => s + b * x ** k, 0) };
    },
    corr(xs, ys) { const mx = Stats.mean(xs), my = Stats.mean(ys); let sxy = 0, sxx = 0, syy = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; }); return sxy / Math.sqrt(sxx * syy); }
  };
  function parseData(t) { const pairs = [...t.matchAll(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g)].map(m0 => [+m0[1], +m0[2]]); if (pairs.length >= 2) return { pairs }; const nums = (t.replace(/\b(?:n|k|p|df|μ|mu|sigma|σ)\s*=\s*-?[\d.]+/gi, '').match(/-?\d+(?:\.\d+)?/g) || []).map(Number); return nums.length >= 3 ? { nums } : null; }
  L.register({
    id: 'stats', family: 'math', kind: T('Maths · Statistics & probability', 'رياضيات · الإحصاء والاحتمال'), title: T('Statistics lab', 'مختبر الإحصاء'),
    match(t) {
      const d = parseData(t);
      const kw = /\b(mean|median|mode|average|standard deviations?|variance|quartiles?|percentiles?|iqr|range|histograms?|box ?plots?|box-and-whisker|scatter( ?plots?)?|regression|line of best fit|correlation|normal distributions?|bell curve|binomial|probability|probabilities|dice|die|coins?|sampling|sample means?|central limit|confidence intervals?|hypothesis|t-test|significance|frequency)\b/i;
      if (!kw.test(t)) return null;
      let mode = /\b(scatter|regression|best fit|correlation)\b/i.test(t) || (d && d.pairs) ? 'scatter' : /\bbinomial\b/i.test(t) ? 'binomial' : /\b(normal distribution|bell curve|z-score)\b/i.test(t) ? 'normal' : /\b(dice|die|coin|sampling|sample means?|central limit|experiment with probability|probability experiment|let me experiment)\b/i.test(t) ? 'sim' : /\b(confidence interval|hypothesis|t-test|significance)\b/i.test(t) ? 'infer' : 'describe';
      if (mode === 'describe' && !d && !/\b(histogram|box ?plot|statistics|data)\b/i.test(t)) return null;
      const params = { mode, data: d && d.nums, pairs: d && d.pairs };
      if (mode === 'binomial') { const n0 = t.match(/\bn\s*=\s*(\d+)/i) || t.match(/(\d+)\s*(?:trials|flips|tosses)/i), p0 = t.match(/\bp\s*=\s*([\d.]+)/i); params.n = n0 ? +n0[1] : 10; params.p = p0 ? +p0[1] : 0.5; }
      return { score: d ? 0.95 : 0.75, params, reply: d && mode === 'describe' ? () => statsReply(d.nums) : null };
    },
    async mount(ctx) { await M(); return statsLab(ctx); }
  });
  async function statsReply(a) {
    await M(); const q = Stats.quartiles(a), md = Stats.modes(a);
    const text = [`${T('For your', 'لبياناتك')} ${a.length} ${T('values', 'قيمة')}:`, ui && `| ${T('statistic', 'المقياس')} | ${T('value', 'القيمة')} |\n|---|---|\n| ${T('mean', 'المتوسط')} | ${N.fmt(Stats.mean(a), 6)} |\n| ${T('median', 'الوسيط')} | ${N.fmt(Stats.median(a), 6)} |\n| ${T('mode', 'المنوال')} | ${md.length ? md.join(', ') : T('none (no value repeats)', 'لا يوجد')} |\n| ${T('range', 'المدى')} | ${N.fmt(Math.max(...a) - Math.min(...a), 6)} |\n| ${T('population standard deviation σ', 'الانحراف المعياري للمجتمع σ')} | ${N.fmt(Stats.sd(a, false), 6)} |\n| ${T('sample standard deviation s', 'الانحراف المعياري للعينة s')} | ${a.length > 1 ? N.fmt(Stats.sd(a, true), 6) : '—'} |\n| Q1, Q3 (${T('median of halves', 'وسيط النصفين')}) | ${N.fmt(q[0], 6)}, ${N.fmt(q[2], 6)} |`, T('Use σ when these values are the whole group you care about, and s when they are a sample from a bigger population. The histogram and box plot are open in the lab — edit the numbers there and everything updates.', 'استخدم σ للمجتمع كله وs للعينة.')].join('\n\n');
    return { text, open: { id: 'stats', params: { mode: 'describe', data: a } } };
  }
  function statsLab(ctx) {
    const p = ctx.params; const S = { mode: p.mode || 'describe', data: p.data || null, pairs: p.pairs || null, bins: 8, deg: 1, mu: 0, sd: 1, lo: -1, hi: 1, n: p.n || 10, p: p.p || 0.5, k: Math.round((p.n || 10) * (p.p || 0.5)), trials: 200, sim: 'dice', sampleN: 5, seed: 7, mu0: 0, conf: 95, source: 'yours' };
    if (!S.data && (S.mode === 'describe' || S.mode === 'infer')) { S.data = [12, 15, 15, 17, 18, 19, 21, 21, 21, 23, 24, 26, 28, 31, 35]; S.source = 'example'; }
    if (!S.pairs && S.mode === 'scatter') { S.pairs = [[1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8], [5, 10.1], [6, 12.2], [7, 13.8], [8, 16.1]]; S.source = 'example'; }
    let simOut = null;
    const plot = new L.Plot(ctx.stage, { equal: false, pan: true, label: T('Statistics chart', 'مخطط إحصائي') });
    const side = ctx.side;
    function controls() {
      side.innerHTML = '';
      const mg = ui.group(T('Model', 'النموذج'));
      mg.appendChild(ui.select({ key: 'mode', label: T('Show', 'اعرض'), value: S.mode, options: [['describe', T('Describe data (histogram + box plot)', 'وصف البيانات')], ['scatter', T('Scatter plot + regression', 'مخطط انتشار وانحدار')], ['normal', T('Normal distribution', 'التوزيع الطبيعي')], ['binomial', T('Binomial distribution', 'التوزيع ذو الحدين')], ['sim', T('Probability experiment (simulation)', 'تجربة احتمالية')], ['infer', T('Confidence interval & t-test', 'فترة الثقة واختبار t')]], on: v => { S.mode = v; if ((v === 'describe' || v === 'infer') && !S.data) { S.data = [12, 15, 15, 17, 18, 19, 21, 21, 21, 23, 24, 26, 28, 31, 35]; S.source = 'example'; } if (v === 'scatter' && !S.pairs) { S.pairs = [[1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8], [5, 10.1], [6, 12.2], [7, 13.8], [8, 16.1]]; S.source = 'example'; } controls(); fitView(); update(); } }));
      side.appendChild(mg);
      const g = ui.group(T('Inputs', 'المدخلات'));
      if (S.mode === 'describe' || S.mode === 'infer') {
        const ta = ui.el('label', 'lab-ta', `<span>${T('Data (numbers separated by commas or spaces)', 'البيانات')}</span><textarea rows="3" spellcheck="false" data-key="data">${S.data.join(', ')}</textarea><small>${S.source === 'example' ? T('Example data — illustrative, not real measurements. Paste your own.', 'بيانات توضيحية.') : S.source === 'simulated' ? T('Simulated data.', 'بيانات محاكاة.') : T('Your data.', 'بياناتك.')}</small>`);
        ta.querySelector('textarea').addEventListener('input', e => { const nums = (e.target.value.match(/-?\d+(?:\.\d+)?/g) || []).map(Number); if (nums.length >= 2) { S.data = nums; S.source = 'yours'; ta.querySelector('small').textContent = T('Your data.', 'بياناتك.'); fitView(); update(); } });
        g.appendChild(ta);
        if (S.mode === 'describe') g.appendChild(ui.slider({ key: 'bins', label: T('histogram bins', 'فئات المدرج'), min: 1, max: 30, step: 1, value: S.bins, on: v => { S.bins = v; update(); } }));
        if (S.mode === 'infer') { g.appendChild(ui.slider({ key: 'mu0', label: T('hypothesised mean μ₀', 'المتوسط المفترض μ₀'), min: -100, max: 200, step: 0.5, value: S.mu0 || Math.round(Stats.mean(S.data)), on: v => { S.mu0 = v; update(); } })); S.mu0 = S.mu0 || Math.round(Stats.mean(S.data)); g.appendChild(ui.select({ key: 'conf', label: T('confidence level', 'مستوى الثقة'), value: S.conf, options: [[90, '90%'], [95, '95%'], [99, '99%']], on: v => { S.conf = +v; update(); } })); }
      }
      if (S.mode === 'scatter') {
        const ta = ui.el('label', 'lab-ta', `<span>${T('Points (x, y) — one pair per line', 'النقاط (x, y)')}</span><textarea rows="5" spellcheck="false">${S.pairs.map(q => q.join(', ')).join('\n')}</textarea><small>${S.source === 'example' ? T('Example data — illustrative.', 'بيانات توضيحية.') : T('Your data.', 'بياناتك.')}</small>`);
        ta.querySelector('textarea').addEventListener('input', e => { const ps = e.target.value.split(/\n/).map(l => (l.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)).filter(q => q.length >= 2).map(q => [q[0], q[1]]); if (ps.length >= 2) { S.pairs = ps; S.source = 'yours'; fitView(); update(); } });
        g.appendChild(ta); g.appendChild(ui.select({ key: 'deg', label: T('Model', 'النموذج'), value: S.deg, options: [[1, T('Linear', 'خطي')], [2, T('Quadratic', 'تربيعي')], [3, T('Cubic', 'تكعيبي')]], on: v => { S.deg = +v; update(); } }));
      }
      if (S.mode === 'normal') { [['mu', 'μ (mean)', -10, 10, 0.1], ['sd', 'σ (standard deviation)', 0.2, 5, 0.1], ['lo', T('from a', 'من a'), -15, 15, 0.1], ['hi', T('to b', 'إلى b'), -15, 15, 0.1]].forEach(([k, l, a, b, s]) => g.appendChild(ui.slider({ key: k, label: l, min: a, max: b, step: s, value: S[k], on: v => { S[k] = v; update(); } }))); }
      if (S.mode === 'binomial') { [['n', T('trials n', 'المحاولات n'), 1, 60, 1], ['p', T('success probability p', 'احتمال النجاح p'), 0, 1, 0.01], ['k', T('highlight k', 'إبراز k'), 0, 60, 1]].forEach(([k, l, a, b, s]) => g.appendChild(ui.slider({ key: k, label: l, min: a, max: b, step: s, value: S[k], on: v => { S[k] = v; fitView(); update(); } }))); }
      if (S.mode === 'sim') {
        g.appendChild(ui.select({ key: 'sim', label: T('Experiment', 'التجربة'), value: S.sim, options: [['dice', T('Roll a fair die', 'رمي حجر نرد')], ['two', T('Sum of two dice', 'مجموع حجري نرد')], ['coin', T('Flip a fair coin', 'رمي عملة')], ['means', T('Sample means (central limit theorem)', 'متوسطات العينات')]], on: v => { S.sim = v; simOut = null; fitView(); run(); } }));
        g.appendChild(ui.slider({ key: 'trials', label: T('number of trials', 'عدد المحاولات'), min: 10, max: 10000, step: 10, value: S.trials, on: v => { S.trials = v; run(); } }));
        if (S.sim === 'means') g.appendChild(ui.slider({ key: 'sampleN', label: T('dice per sample', 'أحجار في العينة'), min: 1, max: 30, step: 1, value: S.sampleN, on: v => { S.sampleN = v; run(); } }));
        g.appendChild(ui.buttons([[T('Run again', 'أعد التجربة'), () => { S.seed++; run(); }, { primary: true }]]));
      }
      side.appendChild(g);
      const out = ui.group(T('Results', 'النتائج')); out.appendChild(ui.el('div', 'lab-stat-out')); side.appendChild(out);
    }
    function run() { const rnd = N.rng(S.seed * 9973 + S.trials), tr = S.trials; const roll = () => 1 + Math.floor(rnd() * 6); const r = []; for (let i = 0; i < tr; i++) { if (S.sim === 'dice') r.push(roll()); else if (S.sim === 'two') r.push(roll() + roll()); else if (S.sim === 'coin') r.push(rnd() < 0.5 ? 1 : 0); else { let s = 0; for (let j = 0; j < S.sampleN; j++) s += roll(); r.push(s / S.sampleN); } } simOut = r; fitView(); update(); }
    function fitView() {
      if (S.mode === 'describe') { const a = S.data, mn = Math.min(...a), mx = Math.max(...a), pad = (mx - mn || 1) * 0.15; plot.view = { x0: mn - pad, x1: mx + pad, y0: -0.35 * Math.max(3, a.length / 2), y1: Math.max(3, a.length / 1.6) }; }
      if (S.mode === 'scatter') { const xs = S.pairs.map(q => q[0]), ys = S.pairs.map(q => q[1]), px = (Math.max(...xs) - Math.min(...xs) || 1) * 0.15, py = (Math.max(...ys) - Math.min(...ys) || 1) * 0.2; plot.view = { x0: Math.min(...xs) - px, x1: Math.max(...xs) + px, y0: Math.min(...ys) - py, y1: Math.max(...ys) + py }; }
      if (S.mode === 'normal') plot.view = { x0: S.mu - 4.5 * S.sd, x1: S.mu + 4.5 * S.sd, y0: -0.05 / S.sd, y1: 0.48 / S.sd };
      if (S.mode === 'binomial') plot.view = { x0: -1, x1: S.n + 1, y0: -0.02, y1: Math.max(0.12, ...Array.from({ length: S.n + 1 }, (_, k) => N.binom(S.n, k) * S.p ** k * (1 - S.p) ** (S.n - k))) * 1.25 };
      if (S.mode === 'sim') plot.view = S.sim === 'two' ? { x0: 1, x1: 13, y0: -0.03, y1: 0.3 } : S.sim === 'coin' ? { x0: -1, x1: 2, y0: -0.05, y1: 0.85 } : S.sim === 'means' ? { x0: 0.5, x1: 6.5, y0: -0.05, y1: 1.2 } : { x0: 0, x1: 7, y0: -0.03, y1: 0.35 };
      if (S.mode === 'infer') { const a = S.data, mn = Math.min(...a), mx = Math.max(...a), pad = (mx - mn || 1) * 0.4; plot.view = { x0: mn - pad, x1: mx + pad, y0: -1, y1: 4 }; }
      plot.labels = S.mode === 'scatter' ? { x: 'x', y: 'y' } : S.mode === 'normal' ? { x: 'x', y: T('density', 'الكثافة') } : S.mode === 'describe' ? { x: T('value', 'القيمة'), y: T('frequency', 'التكرار') } : { x: S.mode === 'binomial' ? 'k' : T('outcome', 'الناتج'), y: T('probability', 'الاحتمال') };
      plot.home = Object.assign({}, plot.view);
    }
    function hist(a, bins, x0, x1) { const w = (x1 - x0) / bins, c = new Array(bins).fill(0); a.forEach(v => { let i = Math.floor((v - x0) / w); if (i === bins) i--; if (i >= 0 && i < bins) c[i]++; }); return { w, c }; }
    plot.draw = (g, P) => {
      const c = L.colors(), col = c.pal[0], col2 = c.pal[1];
      if (S.mode === 'describe') {
        const a = S.data, mn = Math.min(...a), mx = Math.max(...a) + (Math.max(...a) === Math.min(...a) ? 1 : 0), h = hist(a, S.bins, mn, mx);
        h.c.forEach((n, i) => { if (!n) return; P.path([[mn + i * h.w, 0], [mn + i * h.w, n], [mn + (i + 1) * h.w, n], [mn + (i + 1) * h.w, 0]], col, { fill: c.dark ? 'rgba(96,165,250,.3)' : 'rgba(37,99,235,.22)', close: true, w: 1.5 }); P.text(mn + (i + .5) * h.w, n, String(n), c.ink, { dy: -5, align: 'center' }); });
        const q = Stats.quartiles(a), y = -0.18 * Math.max(3, a.length / 2), hgt = 0.1 * Math.max(3, a.length / 2), iqr = q[2] - q[0], lo = Math.min(...a.filter(v => v >= q[0] - 1.5 * iqr)), hi = Math.max(...a.filter(v => v <= q[2] + 1.5 * iqr));
        P.path([[q[0], y - hgt], [q[2], y - hgt], [q[2], y + hgt], [q[0], y + hgt]], col2, { close: true, fill: c.dark ? 'rgba(248,113,113,.18)' : 'rgba(220,38,38,.12)' }); P.path([[q[1], y - hgt], [q[1], y + hgt]], col2, { w: 3 }); P.path([[lo, y], [q[0], y]], col2); P.path([[q[2], y], [hi, y]], col2); P.path([[lo, y - hgt / 2], [lo, y + hgt / 2]], col2); P.path([[hi, y - hgt / 2], [hi, y + hgt / 2]], col2);
        a.filter(v => v < q[0] - 1.5 * iqr || v > q[2] + 1.5 * iqr).forEach(v => P.dot(v, y, col2, null, { r: 4 }));
        const mean = Stats.mean(a); P.path([[mean, 0], [mean, P.view.y1]], c.dark ? '#fbbf24' : '#b45309', { dash: [6, 5], w: 1.6 }); P.text(mean, P.view.y1, T('mean', 'المتوسط'), c.dark ? '#fbbf24' : '#b45309', { dy: 14, dx: 4 });
      }
      if (S.mode === 'scatter') { S.pairs.forEach(q => P.dot(q[0], q[1], col, null, { r: 5 })); try { const r = Stats.regress(S.pairs.map(q => q[0]), S.pairs.map(q => q[1]), S.deg); P.fn(r.f, col2); } catch (e) { /* singular */ } }
      if (S.mode === 'normal') { const f = x => Math.exp(-((x - S.mu) ** 2) / (2 * S.sd ** 2)) / (S.sd * Math.sqrt(2 * Math.PI)); const lo = Math.min(S.lo, S.hi), hi = Math.max(S.lo, S.hi); const pts = [[lo, 0]]; for (let i = 0; i <= 200; i++) { const x = lo + (hi - lo) * i / 200; pts.push([x, f(x)]); } pts.push([hi, 0]); P.path(pts, col2, { fill: c.dark ? 'rgba(248,113,113,.25)' : 'rgba(220,38,38,.18)', close: true, w: 1 }); P.fn(f, col); P.path([[S.mu, 0], [S.mu, f(S.mu)]], c.muted, { dash: [4, 4], w: 1 }); }
      if (S.mode === 'binomial') { for (let k = 0; k <= S.n; k++) { const pk = N.binom(S.n, k) * S.p ** k * (1 - S.p) ** (S.n - k); P.path([[k - 0.4, 0], [k - 0.4, pk], [k + 0.4, pk], [k + 0.4, 0]], k === S.k ? col2 : col, { close: true, fill: k === S.k ? (c.dark ? 'rgba(248,113,113,.5)' : 'rgba(220,38,38,.35)') : (c.dark ? 'rgba(96,165,250,.3)' : 'rgba(37,99,235,.22)'), w: 1 }); } }
      if (S.mode === 'sim' && simOut) {
        const vals = S.sim === 'dice' ? [1, 2, 3, 4, 5, 6] : S.sim === 'two' ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : S.sim === 'coin' ? [0, 1] : null;
        if (vals) { const th = S.sim === 'dice' ? () => 1 / 6 : S.sim === 'two' ? v => (6 - Math.abs(v - 7)) / 36 : () => 0.5; vals.forEach(v => { const f = simOut.filter(x => x === v).length / simOut.length; P.path([[v - 0.35, 0], [v - 0.35, f], [v + 0.35, f], [v + 0.35, 0]], col, { close: true, fill: c.dark ? 'rgba(96,165,250,.3)' : 'rgba(37,99,235,.22)', w: 1 }); P.path([[v - 0.42, th(v)], [v + 0.42, th(v)]], col2, { w: 2.4 }); if (S.sim === 'coin') P.text(v, 0, v ? T('heads', 'صورة') : T('tails', 'كتابة'), c.ink, { dy: 16, align: 'center' }); }); }
        else { const h = hist(simOut, 30, 1, 6), tot = simOut.length; h.c.forEach((n, i) => { const d = n / tot / h.w; P.path([[1 + i * h.w, 0], [1 + i * h.w, d], [1 + (i + 1) * h.w, d], [1 + (i + 1) * h.w, 0]], col, { close: true, fill: c.dark ? 'rgba(96,165,250,.3)' : 'rgba(37,99,235,.22)', w: 1 }); }); const sd = Math.sqrt(35 / 12 / S.sampleN); P.fn(x => Math.exp(-((x - 3.5) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI)), col2); P.view.y1 = Math.max(1.2, 1 / (sd * Math.sqrt(2 * Math.PI)) * 1.2); }
      }
      if (S.mode === 'infer') { const a = S.data, ci = inference(); a.forEach((v, i) => P.dot(v, 0.4 + (i % 5) * 0.25, col, null, { r: 4 })); P.path([[ci.lo, 2.4], [ci.hi, 2.4]], col2, { w: 4 }); P.dot(ci.mean, 2.4, col2, T(`mean ${N.fmt(ci.mean, 3)}`, 'المتوسط'), { r: 6 }); P.text(ci.lo, 2.4, N.fmt(ci.lo, 3), c.ink, { dy: -10, align: 'center' }); P.text(ci.hi, 2.4, N.fmt(ci.hi, 3), c.ink, { dy: -10, align: 'center' }); P.path([[S.mu0, -0.6], [S.mu0, 3.4]], c.dark ? '#fbbf24' : '#b45309', { dash: [6, 5], w: 1.8 }); P.text(S.mu0, 3.4, 'μ₀', c.dark ? '#fbbf24' : '#b45309', { dx: 4, dy: 10 }); }
    };
    function inference() { const a = S.data, n = a.length, mean = Stats.mean(a), s = Stats.sd(a, true), se = s / Math.sqrt(n), df = n - 1, tc = N.tInv(1 - (1 - S.conf / 100) / 2, df), t = (mean - S.mu0) / se, pv = 2 * (1 - N.tCdf(Math.abs(t), df)); return { n, mean, s, se, df, tc, lo: mean - tc * se, hi: mean + tc * se, t, p: pv }; }
    function results() {
      const o = side.querySelector('.lab-stat-out'); if (!o) return; let h = '';
      if (S.mode === 'describe') { const a = S.data, q = Stats.quartiles(a), md = Stats.modes(a); h = ui.readout([['n', a.length], [T('mean', 'المتوسط'), N.fmt(Stats.mean(a), 5)], [T('median', 'الوسيط'), N.fmt(Stats.median(a), 5)], [T('mode', 'المنوال'), md.length ? md.join(', ') : '—'], ['σ (' + T('population', 'المجتمع') + ')', N.fmt(Stats.sd(a, false), 5)], ['s (' + T('sample', 'العينة') + ')', N.fmt(Stats.sd(a, true), 5)], [T('variance σ² / s²', 'التباين'), `${N.fmt(Stats.variance(a, false), 5)} / ${N.fmt(Stats.variance(a, true), 5)}`], ['Q1 · Q2 · Q3', `${N.fmt(q[0], 4)} · ${N.fmt(q[1], 4)} · ${N.fmt(q[2], 4)}`], ['IQR', N.fmt(q[2] - q[0], 4)], [T('90th percentile', 'المئين 90'), N.fmt(Stats.percentile(a, 90), 4)]]); }
      if (S.mode === 'scatter') { try { const xs = S.pairs.map(q => q[0]), ys = S.pairs.map(q => q[1]), r = Stats.regress(xs, ys, S.deg); h = ui.readout([[T('model', 'النموذج'), 'y = ' + r.beta.map((b, k) => `${N.fmt(b, 4)}${k ? 'x' + (k > 1 ? '^' + k : '') : ''}`).reverse().join(' + ').replace(/\+ −/g, '− ')], ['R²', N.fmt(r.r2, 5)], [T('correlation r', 'معامل الارتباط r'), N.fmt(Stats.corr(xs, ys), 5)]]); } catch (e) { h = T('Need more distinct x values for this model.', 'نحتاج قيماً أكثر.'); } }
      if (S.mode === 'normal') { const pr = N.normCdf(Math.max(S.lo, S.hi), S.mu, S.sd) - N.normCdf(Math.min(S.lo, S.hi), S.mu, S.sd); h = ui.readout([[`P(${N.fmt(Math.min(S.lo, S.hi), 3)} < X < ${N.fmt(Math.max(S.lo, S.hi), 3)})`, N.fmt(pr, 5)], ['z (a, b)', `${N.fmt((Math.min(S.lo, S.hi) - S.mu) / S.sd, 3)}, ${N.fmt((Math.max(S.lo, S.hi) - S.mu) / S.sd, 3)}`]]); }
      if (S.mode === 'binomial') { const k = Math.min(S.k, S.n), pk = N.binom(S.n, k) * S.p ** k * (1 - S.p) ** (S.n - k); let cum = 0; for (let j = 0; j <= k; j++) cum += N.binom(S.n, j) * S.p ** j * (1 - S.p) ** (S.n - j); h = ui.readout([[`P(X = ${k})`, N.fmt(pk, 6)], [`P(X ≤ ${k})`, N.fmt(cum, 6)], [T('mean np', 'المتوسط np'), N.fmt(S.n * S.p, 4)], [T('variance np(1−p)', 'التباين'), N.fmt(S.n * S.p * (1 - S.p), 4)]]); }
      if (S.mode === 'sim' && simOut) { const m = Stats.mean(simOut); h = ui.readout([[T('trials', 'المحاولات'), simOut.length], [T('simulated mean', 'المتوسط المحاكى'), N.fmt(m, 4)], [T('theoretical mean', 'المتوسط النظري'), S.sim === 'coin' ? '0.5' : S.sim === 'two' ? '7' : '3.5'], [T('simulated SD', 'الانحراف المحاكى'), N.fmt(Stats.sd(simOut, true), 4)], [T('theoretical SD', 'الانحراف النظري'), N.fmt(S.sim === 'coin' ? 0.5 : S.sim === 'two' ? Math.sqrt(35 / 6) : S.sim === 'means' ? Math.sqrt(35 / 12 / S.sampleN) : Math.sqrt(35 / 12), 4)]]) + `<p class="lab-sub">${T('Bars: simulated frequencies (random, seeded). Red: theoretical probabilities.', 'الأعمدة: محاكاة. الأحمر: نظري.')}</p>`; }
      if (S.mode === 'infer') { const r = inference(); h = ui.readout([['n · ' + T('mean', 'المتوسط') + ' · s', `${r.n} · ${N.fmt(r.mean, 4)} · ${N.fmt(r.s, 4)}`], [`${S.conf}% CI`, `(${N.fmt(r.lo, 4)}, ${N.fmt(r.hi, 4)})`], [`t (df = ${r.df})`, N.fmt(r.t, 4)], [T('p-value (two-sided)', 'القيمة الاحتمالية'), N.fmt(r.p, 4)]]) + `<p>${r.p < 1 - S.conf / 100 ? T(`At the ${100 - S.conf}% level the data are evidence against μ = ${S.mu0}.`, 'دليل ضد الفرضية.') : T(`At the ${100 - S.conf}% level the data are not evidence against μ = ${S.mu0} — that is not proof that μ = ${S.mu0}.`, 'لا دليل ضد الفرضية.')}</p>`; }
      o.innerHTML = h;
    }
    function update() { plot.render(); results(); L.explainNow(); }
    controls(); fitView(); if (S.mode === 'sim') run(); setTimeout(() => { plot.render(); results(); }, 20);
    return {
      intro() { const m = S.mode; return m === 'describe' ? T(`Histogram and box plot of ${S.source === 'example' ? 'example (illustrative)' : 'your'} data, with mean, median, quartiles and both standard deviations in the panel — edit the numbers and everything updates.`, 'مدرج تكراري ومخطط صندوقي.') : m === 'scatter' ? T('Scatter plot with a least-squares regression line, R² and the correlation coefficient. Switch to a quadratic or cubic model in the panel.', 'مخطط انتشار وخط انحدار.') : m === 'normal' ? T('A normal distribution: move μ and σ, and the shaded area is P(a < X < b), computed from the normal CDF.', 'التوزيع الطبيعي.') : m === 'binomial' ? T(`Binomial distribution with n = ${S.n}, p = ${S.p}: each bar is P(X = k) = C(n, k) pᵏ(1 − p)ⁿ⁻ᵏ.`, 'التوزيع ذو الحدين.') : m === 'sim' ? T('A probability experiment: the bars are simulated outcomes (random, but repeatable), the red lines the theoretical probabilities. More trials → closer agreement.', 'تجربة احتمالية.') : T('A confidence interval for the mean and a one-sample t-test against μ₀ (Student’s t distribution).', 'فترة الثقة واختبار t.'); },
      explain() {
        const m = S.mode; if (m === 'describe') return `<p>${T('The <b>mean</b> balances the data; the <b>median</b> is the middle value, so it resists outliers. The box spans Q1–Q3 (the middle half); whiskers reach the furthest values within 1.5 × IQR, and dots beyond are possible outliers.', 'المتوسط والوسيط والمخطط الصندوقي.')}</p><p class="lab-sub">${T('Quartiles use the median-of-halves method; other software may use slightly different conventions.', 'طريقة وسيط النصفين.')}</p><p>${T('σ divides by n (a whole population); s divides by n − 1 (a sample), which makes it slightly larger.', 'σ تقسم على n وs على n − 1.')}</p>`;
        if (m === 'scatter') return `<p>${T('Least squares chooses the model that makes the sum of squared vertical distances to the points as small as possible. R² is the share of the variation in y the model explains. Correlation is not causation.', 'المربعات الصغرى.')}</p>`;
        if (m === 'normal') return `<p>${T('About 68% of values lie within 1σ of μ, 95% within 2σ and 99.7% within 3σ. The total area under the curve is 1.', 'قاعدة 68–95–99.7.')}</p>`;
        if (m === 'binomial') return `<p>${T('n independent trials, each a success with probability p. The distribution is symmetric only when p = 0.5.', 'n محاولات مستقلة.')}</p>`;
        if (m === 'sim') return `<p>${T('The law of large numbers: as the number of trials grows, observed frequencies settle towards the theoretical probabilities. For sample means, the distribution becomes bell-shaped and narrower (SD ÷ √n) — the central limit theorem.', 'قانون الأعداد الكبيرة.')}</p><p class="lab-sub">${T('These are simulated values, not real measurements.', 'قيم محاكاة لا قياسات حقيقية.')}</p>`;
        return `<p>${T('The interval is mean ± t* × s/√n. A 95% interval is produced by a method that captures the true mean in 95% of samples — it is not a 95% chance for this particular interval.', 'فترة الثقة.')}</p><p class="lab-sub">${T('Assumes a random sample from a roughly normal population.', 'يفترض عينة عشوائية.')}</p>`;
      },
      command(t) {
        let mm;
        if ((mm = t.match(/\bbins?\s*(?:to|=)?\s*(\d+)/i))) { S.bins = +mm[1]; controls(); update(); return { note: T(`${S.bins} bins.`, `${S.bins} فئات.`) }; }
        if ((mm = t.match(/\b(\d+)\s*(?:trials|rolls|flips|times)\b/i))) { S.trials = Math.min(10000, +mm[1]); controls(); run(); return { note: T(`Ran ${S.trials} trials.`, 'أُجريت التجربة.') }; }
        if (/\b(run|roll|flip|simulate) again\b/i.test(t)) { S.seed++; run(); return { note: T('New random run.', 'تجربة جديدة.') }; }
        if (/\b(quadratic|cubic|linear)\b/i.test(t) && S.mode === 'scatter') { S.deg = /quadratic/i.test(t) ? 2 : /cubic/i.test(t) ? 3 : 1; controls(); update(); return { note: T('Model changed.', 'تغيّر النموذج.') }; }
        const d = parseData(t); if (d && d.nums && /\b(data|use|these|numbers)\b/i.test(t)) { S.data = d.nums; S.source = 'yours'; controls(); fitView(); update(); return { note: T('Data replaced.', 'استُبدلت البيانات.') }; }
        return null;
      },
      state: () => { const m = S.mode; const base = { mode: m, source: S.source }; if (m === 'describe') { const a = S.data; return Object.assign(base, { data: a, mean: Stats.mean(a), median: Stats.median(a), sdPopulation: Stats.sd(a, false), sdSample: Stats.sd(a, true), quartiles: Stats.quartiles(a) }); } if (m === 'scatter') { const r = Stats.regress(S.pairs.map(q => q[0]), S.pairs.map(q => q[1]), S.deg); return Object.assign(base, { pairs: S.pairs, coefficients: r.beta, r2: r.r2 }); } if (m === 'sim') return Object.assign(base, { experiment: S.sim, trials: S.trials, mean: simOut && Stats.mean(simOut) }); if (m === 'infer') return Object.assign(base, inference()); return Object.assign(base, { mu: S.mu, sd: S.sd, n: S.n, p: S.p }); },
      table: () => (S.mode === 'scatter' ? [['x', 'y']].concat(S.pairs) : S.mode === 'sim' && simOut ? [['trial', 'outcome']].concat(simOut.map((v, i) => [i + 1, v])) : [['value']].concat((S.data || []).map(v => [v]))),
      canvas: () => plot.cv, summary: () => side.querySelector('.lab-stat-out').innerText,
      params: () => [{ key: 'bins', label: 'bins', step: 1 }, { key: 'mu', label: 'mean', alias: ['μ', 'mu'] }, { key: 'sd', label: 'standard deviation', alias: ['σ', 'sigma', 'sd'] }, { key: 'n', label: 'n', step: 1 }, { key: 'p', label: 'p', step: 0.01 }, { key: 'trials', label: 'trials', step: 10 }],
      get: k => S[k], set: (k, v) => { S[k] = v; controls(); fitView(); if (S.mode === 'sim') run(); else update(); },
      reset: () => L.open('stats', ctx.params), redraw: () => plot.render(), destroy: () => plot.destroy()
    };
  }
})();
