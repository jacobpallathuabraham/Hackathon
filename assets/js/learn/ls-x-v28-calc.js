/* ERLY Learning Studio v28 — Calculus: the Differentiation Explorer and the Integration Explorer.

   Every number on screen is computed from the function shown:
     • secant slope  m = (f(a + h) − f(a)) / h  (the first-principles quotient, evaluated directly);
     • tangent slope f′(a) from the exact derivative for the built-in functions, or a central difference
       (f(a + ε) − f(a − ε)) / 2ε with ε = 10⁻⁵·max(1, |a|) for a typed function;
     • Riemann sums are summed rectangle by rectangle (left, right, midpoint) or trapezium by trapezium;
     • the exact integral comes from the antiderivative for the built-in functions, or composite Simpson's rule with
       4000 sub-intervals for a typed function (error far below the 3 decimal places shown for smooth functions);
     • the accumulation function A(x) = ∫ₐˣ f(t) dt is F(x) − F(a) (or Simpson), and its slope at b is checked against f(b).
   Stationary points are found by bisection on sign changes of f′ over a 600-point grid. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, esc = LS.esc, IL = LS.inline || (s => s);
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const f3 = (v, d = 3) => (isFinite(v) ? K.fmt(v, d) : '—');
  const compile = src => { const g = K.expr(String(src).replace(/^\s*(y|f\(x\))\s*=\s*/i, '').replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3'), ['x']); const f = x => g({ x }); f(0.37); return f; };
  const numD = f => x => { const e = 1e-5 * Math.max(1, Math.abs(x)); return (f(x + e) - f(x - e)) / (2 * e); };
  const simpson = (f, a, b, n = 4000) => { if (a === b) return 0; const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; };
  const roots = (g, x0, x1, n = 600) => { const out = []; let px = x0, py = g(x0); for (let i = 1; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = g(x); if (isFinite(py) && isFinite(y) && py * y < 0 && Math.abs(py - y) < 50) { let lo = px, hi = x; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (g(lo) * g(m) <= 0) hi = m; else lo = m; } out.push((lo + hi) / 2); } else if (y === 0) out.push(x); px = x; py = y; } return out; };
  const autoY = (f, xr) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 200; i++) { const y = f(xr[0] + (xr[1] - xr[0]) * i / 200); if (isFinite(y) && Math.abs(y) < 1e4) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } if (!isFinite(lo)) return [-5, 5]; if (hi - lo < 1e-6) { lo -= 1; hi += 1; } const p = (hi - lo) * 0.12; return [Math.min(lo - p, -0.5), Math.max(hi + p, 0.5)]; };
  const customBox = (id, val, label) => ({ k: 'html', html: `<label class="kx-range v28-fx"><span class="kx-range__t">${label}</span><input type="text" class="v28-fx__in" data-fx="${id}" value="${esc(val)}" spellcheck="false" autocomplete="off" aria-label="${esc(label)}"><span class="v28-fx__err" data-fxe="${id}" role="status"></span></label>` });
  const card = (cls, h) => `<div class="v26-card"><h3>${h}</h3><div class="v26-out ${cls}" aria-live="polite"></div></div>`;
  const tick = ok => (ok ? '<span class="v28-ok">✓</span>' : '<span class="v28-todo">○</span>');

  /* ======================= DIFFERENTIATION EXPLORER ======================= */
  const DF = {
    sq: { n: 'x²', f: x => x * x, d: x => 2 * x, xr: [-3, 3], yr: [-1.5, 9.5], fp: (a, h) => [`((a + h)² − a²) / h = (2ah + h²) / h = 2a + h`, 2 * a + h] },
    cub: { n: 'x³ − 3x', f: x => x * x * x - 3 * x, d: x => 3 * x * x - 3, xr: [-2.6, 2.6], yr: [-6, 6], fp: (a, h) => [`((a + h)³ − 3(a + h) − (a³ − 3a)) / h = 3a² − 3 + 3ah + h²`, 3 * a * a - 3 + 3 * a * h + h * h] },
    sin: { n: 'sin x', f: Math.sin, d: Math.cos, xr: [-6.6, 6.6], yr: [-1.7, 1.7] },
    exp: { n: 'eˣ', f: Math.exp, d: Math.exp, xr: [-3, 2.4], yr: [-1, 9] },
    rec: { n: '1/x', f: x => 1 / x, d: x => -1 / (x * x), xr: [-4, 4], yr: [-5, 5] },
    cus: { n: T('your function', 'دالتك'), xr: [-5, 5] }
  };
  const CH_D = {
    flat: { t: ['On y = x³ − 3x, move P to a point where the tangent is horizontal.', 'ضع P حيث المماس أفقي.'], fn: 'cub', ok: s => Math.abs(s.d) < 0.05, why: s => `f′(${f3(s.a, 2)}) = ${f3(s.d)}` },
    three: { t: ['On y = x², find the point where the gradient is exactly 3.', 'أوجد النقطة التي ميلها 3.'], fn: 'sq', ok: s => Math.abs(s.d - 3) < 0.04, why: s => `f′(${f3(s.a, 2)}) = ${f3(s.d)}` },
    match: { t: ['Make the secant slope agree with the tangent slope to within 0.01.', 'اجعل ميل القاطع قريباً من ميل المماس.'], ok: s => Math.abs(s.m - s.d) < 0.01, why: s => `|m − f′(a)| = ${f3(Math.abs(s.m - s.d), 4)}` },
    steep: { t: ['On y = sin x, find a place where the graph falls most steeply.', 'أوجد أشد انحدار.'], fn: 'sin', ok: s => s.d < -0.995, why: s => `f′(${f3(s.a, 2)}) = ${f3(s.d)}` }
  };
  D['derivative-lab'] = { wide: true,
    intro: 'The **derivative** is the slope of a curve at a single point. You cannot measure a slope with one point, so take two — **P** at x = a and **Q** at x = a + h — and draw the **secant** line through them. Its slope is **Δy / Δx = (f(a + h) − f(a)) / h**. Now slide Q towards P. As **h → 0** the secant turns into the **tangent**, and its slope becomes **f′(a)**.\n\nDrag P and Q, press **Let h → 0**, and watch the lower graph: it plots the slope of the upper graph at every point.',
    predict: { q: 'As Q slides towards P (h → 0), the slope of the secant line…', options: ['grows without limit', 'gets closer and closer to the slope of the tangent at P', 'becomes 0', 'stays exactly the same'] },
    explore: '- On **x²**, put P at a = 1. Read Δy/Δx for h = 1, 0.1, 0.01. What number is it approaching? Compare with **2a + h** in the first-principles card.\n- Press **Sweep P** with **Build f′ as P moves** on: the lower graph is drawn by the moving tangent.\n- Where the curve is **green** it is increasing and f′ > 0; where it is **red** it is decreasing and f′ < 0. What happens to f′ at a turning point?\n- Try **1/x** near x = 0, or type your own function.',
    explain: 'The slope between two points is **Δy / Δx**. The derivative is the limit of that slope as the second point approaches the first: **f′(a) = lim (h → 0) (f(a + h) − f(a)) / h** — differentiation from **first principles**. For f(x) = x² the quotient simplifies to **2a + h**, which tends to **2a**, so **f′(x) = 2x**. The derivative is itself a function: where **f′ > 0** the original is **increasing**, where **f′ < 0** it is **decreasing**, and where **f′ = 0** there is a **stationary point** (a maximum, a minimum or a point of inflection). You can never put h = 0 directly — that would give 0/0 — which is exactly why a limit is needed.',
    apply: [q('x-dl1', 'For f(x) = x², the slope of the secant from x = 1 to x = 1 + h is…', ['2 + h', '2', 'h', '1 + h'], 0, '((1 + h)² − 1²)/h = (2h + h²)/h = 2 + h, which tends to 2 as h → 0.'),
      q('x-dl2', 'At x = a, f′(a) = 0 and f′ changes from positive to negative. The point is a…', ['local minimum', 'local maximum', 'root of f', 'point where f is undefined'], 1, 'Increasing then decreasing: the graph rises to a peak — a local maximum.'),
      q('x-dl3', 'If f′(x) < 0 for every x in an interval, then on that interval f is…', ['increasing', 'decreasing', 'constant', 'always negative'], 1, 'A negative gradient means the graph goes down from left to right. (f itself may still be positive.)'),
      q('x-dl4', 'Why can’t we simply put h = 0 in (f(a + h) − f(a)) / h?', ['the answer is always infinite', 'it gives 0/0, which has no value', 'h must be negative', 'the tangent would be vertical'], 1, 'Both the top and the bottom become 0; we need the limit as h approaches 0 instead.')],
    summary: ['Secant slope = Δy/Δx = (f(a + h) − f(a)) / h.', 'f′(a) is the limit of the secant slope as h → 0: the slope of the tangent.', 'f′ > 0: increasing · f′ < 0: decreasing · f′ = 0: stationary point.', 'From first principles, x² → 2x.'],
    connect: [{ label: 'Integration explorer', href: '#/exp/integral-lab' }, { label: 'Function forge', href: '#/exp/function-forge' }, { label: 'Motion graphs (velocity is a gradient)', href: '#/exp/motion-graphs' }],
    build(host, c) {
      const S1 = K.stage(host, 900, 380, 'dl__f'), S2 = K.stage(host, 900, 230, 'dl__d');
      S1.cv.tabIndex = 0; S1.cv.setAttribute('role', 'img'); S2.cv.setAttribute('role', 'img');
      const ctl = K.controls(host, [
        { k: 'row' }, { k: 'chips', id: 'fn', label: T('Function', 'الدالة'), opts: Object.keys(DF).map(k => [k, DF[k].n]), val: 'sq' }, customBox('dl', 'x^3/3 - x', T('Type f(x)', 'اكتب f(x)')), { k: 'end' },
        { k: 'row' }, { k: 'range', id: 'a', label: T('Point P: a', 'النقطة a'), min: -6.5, max: 6.5, step: 0.01, val: 1, d: 2 }, { k: 'range', id: 'h', label: T('Gap to Q: h', 'المسافة h'), min: -2, max: 2, step: 0.001, val: 1, d: 3 }, { k: 'end' },
        { k: 'row' }, { k: 'btn', id: 'h0', label: T('Let h → 0', 'اجعل h → 0'), accent: true }, { k: 'btn', id: 'sweep', label: T('Sweep P', 'حرّك P') }, { k: 'toggle', id: 'build', label: T('Build f′ as P moves', 'ارسم f′ أثناء الحركة'), val: false }, { k: 'toggle', id: 'tan', label: T('Tangent', 'المماس'), val: true }, { k: 'toggle', id: 'tri', label: T('Δx, Δy triangle', 'مثلث Δx وΔy'), val: true }, { k: 'end' },
        { k: 'row' }, { k: 'chips', id: 'ch', label: T('Challenge', 'تحدٍ'), opts: [['none', T('None', 'لا شيء')], ['flat', T('Horizontal tangent', 'مماس أفقي')], ['three', T('Gradient 3', 'ميل 3')], ['match', T('Secant = tangent', 'قاطع = مماس')], ['steep', T('Steepest fall', 'أشد هبوط')]], val: 'none' }, { k: 'end' }
      ], on);
      const grid = document.createElement('div'); grid.className = 'v26-grid2'; grid.innerHTML = card('dl__read', T('Slopes', 'الميول')) + card('dl__fp', T('First principles', 'المبادئ الأولى')); host.appendChild(grid);
      const grid2 = document.createElement('div'); grid2.className = 'v26-grid2'; grid2.innerHTML = card('dl__tab', T('h → 0 table', 'جدول h → 0')) + card('dl__ch', T('Challenge', 'التحدي')); host.appendChild(grid2);
      let key = 'sq', f = DF.sq.f, d = DF.sq.d, xr = DF.sq.xr, yr = DF.sq.yr, a = 1, h = 1, anim = null, built = -Infinity, done = {}, A1 = null, A2 = null, dyr = [-1, 1];
      const P = K.pal();
      function setFn(k) { key = k; const F0 = DF[k]; if (k === 'cus') { const src = host.querySelector('[data-fx="dl"]').value, err = host.querySelector('[data-fxe="dl"]'); try { f = compile(src); d = numD(f); err.textContent = ''; } catch (e) { err.textContent = T('Could not read that: ', 'تعذّرت القراءة: ') + e.message; return; } xr = F0.xr; yr = autoY(f, xr); } else { f = F0.f; d = F0.d; xr = F0.xr; yr = F0.yr; }
        dyr = autoY(d, xr); const inp = host.querySelector('[data-k="a"]'); inp.min = xr[0]; inp.max = xr[1]; a = K.clamp(a, xr[0] + 0.05, xr[1] - 0.05); if (k === 'rec' && Math.abs(a) < 0.3) a = 1; ctl.set('a', +a.toFixed(2)); built = -Infinity; }
      function on(id, v) {
        if (id === 'fn') setFn(v);
        else if (id === 'a') { a = v; if (key === 'rec' && Math.abs(a) < 0.02) a = 0.02; }
        else if (id === 'h') { h = Math.abs(v) < 0.001 ? (v < 0 ? -0.001 : 0.001) : v; }
        else if (id === 'h0') { if (Math.abs(h) <= 0.0011) { h = h < 0 ? -1 : 1; ctl.set('h', h); } start('h0'); }
        else if (id === 'sweep') { a = xr[0] + 0.05; built = a; start('sweep'); }
        else if (id === 'build') built = v ? a : -Infinity;
        else if (id === 'ch' && v !== 'none' && CH_D[v].fn && key !== CH_D[v].fn) { ctl.set('fn', CH_D[v].fn); setFn(CH_D[v].fn); }
        M.draw(); read();
      }
      host.addEventListener('change', e => { if (e.target.matches('[data-fx="dl"]')) { ctl.set('fn', 'cus'); setFn('cus'); M.draw(); read(); } });
      host.addEventListener('keydown', e => { if (e.target.matches('[data-fx="dl"]') && e.key === 'Enter') { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); } });
      function start(m) { anim = m; if (K.reduced()) { finish(); return; } M.play(); c.onChange && c.onChange(); }
      function finish() { if (anim === 'h0') { h = h < 0 ? -0.001 : 0.001; } if (anim === 'sweep') { a = xr[1] - 0.05; built = a; } anim = null; ctl.set('a', +a.toFixed(2)); ctl.set('h', +h.toFixed(3)); M.pause(); c.onChange && c.onChange(); read(); }
      const state = () => { const fa = f(a), fq = f(a + h), m = (fq - fa) / h, da = d(a); return { a, h, fa, fq, m, d: da }; };
      function draw() {
        const g = S1.g, s = state(); S1.clear(); A1 = K.axes(g, [46, 14, 836, 340], xr, yr, { xl: 'x', yl: 'y = ' + DF[key].n });
        // the curve, coloured by the sign of f′: green increasing, red decreasing
        g.save(); g.beginPath(); g.rect(...A1.box); g.clip(); g.lineWidth = 3.2; g.lineJoin = 'round'; const N = 500; let prev = null;
        for (let i = 0; i <= N; i++) { const x = xr[0] + (xr[1] - xr[0]) * i / N, y = f(x); if (!isFinite(y) || Math.abs(y) > 1e5) { prev = null; continue; } const pt = [A1.X(x), A1.Y(y)]; if (prev && Math.abs(pt[1] - prev[1]) < 400) { const dv = d(x - (xr[1] - xr[0]) / N / 2); g.strokeStyle = dv > 1e-9 ? P.green : dv < -1e-9 ? P.red : P.ink; g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(pt[0], pt[1]); g.stroke(); } prev = pt; }
        g.restore();
        const sps = roots(d, xr[0], xr[1]).filter(x => isFinite(f(x)));
        sps.forEach(x => { g.fillStyle = P.gold; g.strokeStyle = P.bg; g.lineWidth = 2; g.beginPath(); g.arc(A1.X(x), A1.Y(f(x)), 5, 0, 7); g.fill(); g.stroke(); });
        const ok = isFinite(s.fa) && isFinite(s.fq);
        if (ok) {
          const X = A1.X, Y = A1.Y, px = X(a), py = Y(s.fa), qx = X(a + h), qy = Y(s.fq);
          g.save(); g.beginPath(); g.rect(...A1.box); g.clip();
          if (ctl.val.tan && isFinite(s.d)) { g.strokeStyle = P.violet; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(X(xr[0]), Y(s.fa + s.d * (xr[0] - a))); g.lineTo(X(xr[1]), Y(s.fa + s.d * (xr[1] - a))); g.stroke(); g.setLineDash([]); }
          g.strokeStyle = P.blue; g.lineWidth = 2.6; g.beginPath(); g.moveTo(X(xr[0]), Y(s.fa + s.m * (xr[0] - a))); g.lineTo(X(xr[1]), Y(s.fa + s.m * (xr[1] - a))); g.stroke();
          if (ctl.val.tri && Math.abs(qx - px) > 6) { g.strokeStyle = P.gold; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(qx, py); g.lineTo(qx, qy); g.stroke(); g.fillStyle = 'rgba(232,170,40,.12)'; g.beginPath(); g.moveTo(px, py); g.lineTo(qx, py); g.lineTo(qx, qy); g.fill();
            K.text(g, 'Δx = h = ' + f3(h, 3), (px + qx) / 2, py + (qy < py ? 16 : -6), { a: 'center', s: 12, w: 700, c: P.gold }); K.text(g, 'Δy = ' + f3(s.fq - s.fa, 3), qx + (qx > px ? 6 : -6), (py + qy) / 2, { a: qx > px ? 'left' : 'right', s: 12, w: 700, c: P.gold, b: 'middle' }); }
          g.restore();
          [[qx, qy, P.blue, 'Q'], [px, py, P.ink, 'P']].forEach(([x, y, col, l]) => { g.fillStyle = col; g.strokeStyle = P.bg; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, l === 'P' ? 8 : 7, 0, 7); g.fill(); g.stroke(); K.text(g, l, x + 10, y - 10, { w: 800, s: 13, c: col }); });
        }
        // legend
        g.fillStyle = P.bg; g.globalAlpha = 0.9; K.rr(g, 54, 20, 300, 24, 8); g.fill(); g.globalAlpha = 1; g.font = '600 12px ui-sans-serif, system-ui'; let lx = 62; [[P.green, T('increasing', 'متزايدة')], [P.red, T('decreasing', 'متناقصة')], [P.blue, T('secant', 'القاطع')], [P.violet, T('tangent', 'المماس')]].forEach(([col, t]) => { g.fillStyle = col; g.fillRect(lx, 29, 14, 4); g.fillStyle = P.ink; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t, lx + 18, 31); lx += g.measureText(t).width + 32; }); g.textBaseline = 'alphabetic';
        // the derivative panel
        const g2 = S2.g; S2.clear(); A2 = K.axes(g2, [46, 10, 836, 196], xr, dyr, { xl: 'x', yl: 'y = f′(x)' });
        const lim = Math.min(xr[1], built > -Infinity ? built : xr[1]);
        g2.save(); g2.beginPath(); g2.rect(A2.box[0], A2.box[1], A2.X(lim) - A2.box[0], A2.box[3]); g2.clip();
        [[1, 'rgba(46,160,90,.22)'], [-1, 'rgba(220,70,70,.22)']].forEach(([sg, col]) => { g2.fillStyle = col; g2.beginPath(); const y0 = A2.Y(0); g2.moveTo(A2.X(xr[0]), y0); for (let i = 0; i <= 400; i++) { const x = xr[0] + (xr[1] - xr[0]) * i / 400, y = d(x); g2.lineTo(A2.X(x), isFinite(y) && sg * y > 0 ? A2.Y(K.clamp(y, dyr[0] - 50, dyr[1] + 50)) : y0); } g2.lineTo(A2.X(xr[1]), y0); g2.fill(); });
        K.plot(g2, A2, d, xr[0], xr[1], P.violet, 2.6, 500); g2.restore();
        sps.forEach(x => { g2.fillStyle = P.gold; g2.beginPath(); g2.arc(A2.X(x), A2.Y(0), 4.5, 0, 7); g2.fill(); });
        if (isFinite(s.d)) { const x = A2.X(a), y = A2.Y(K.clamp(s.d, dyr[0], dyr[1])); g2.strokeStyle = P.muted; g2.setLineDash([4, 4]); g2.beginPath(); g2.moveTo(x, A2.box[1]); g2.lineTo(x, A2.box[1] + A2.box[3]); g2.stroke(); g2.setLineDash([]); g2.fillStyle = P.violet; g2.strokeStyle = P.bg; g2.lineWidth = 2.5; g2.beginPath(); g2.arc(x, y, 7, 0, 7); g2.fill(); g2.stroke(); K.text(g2, `f′(${f3(a, 2)}) = ${f3(s.d, 3)}`, x + 10, y - 10, { w: 700, s: 12, c: P.violet }); }
        S1.cv.setAttribute('aria-label', `${T('Graph of', 'رسم')} y = ${DF[key].n}. P at x = ${f3(a, 2)}, Q at x = ${f3(a + h, 3)}. ${T('Secant slope', 'ميل القاطع')} ${f3(s.m)}, ${T('tangent slope', 'ميل المماس')} ${f3(s.d)}.`);
        S2.cv.setAttribute('aria-label', `${T('Graph of the derivative', 'رسم المشتقة')}; f′(${f3(a, 2)}) = ${f3(s.d)}. ${sps.length ? T('Stationary points at x = ', 'نقاط ثابتة عند ') + sps.map(x => f3(x, 2)).join(', ') : ''}`);
      }
      function read() {
        const s = state(), err = s.m - s.d, F0 = DF[key];
        host.querySelector('.dl__read').innerHTML = `<p>P = (${f3(a, 2)}, ${f3(s.fa)}) · Q = (${f3(a + h, 3)}, ${f3(s.fq)})</p><p><b>${T('Secant slope', 'ميل القاطع')}</b> Δy/Δx = ${f3(s.fq - s.fa, 4)} / ${f3(h, 3)} = <b>${f3(s.m, 4)}</b></p><p><b>${T('Tangent slope', 'ميل المماس')}</b> f′(${f3(a, 2)}) = <b>${f3(s.d, 4)}</b> <span class="v26-hint">${key === 'cus' ? T('(central difference)', '(فرق مركزي)') : T('(exact derivative)', '(مشتقة دقيقة)')}</span></p><p>${T('Difference', 'الفرق')}: ${f3(err, 4)} · ${s.d > 1e-9 ? T('f is increasing here', 'الدالة متزايدة هنا') : s.d < -1e-9 ? T('f is decreasing here', 'الدالة متناقصة هنا') : T('stationary point', 'نقطة ثابتة')}</p>`;
        host.querySelector('.dl__fp').innerHTML = `<p>f′(a) = lim<sub>h→0</sub> (f(a + h) − f(a)) / h</p>${F0.fp ? `<p>${esc(F0.fp(a, h)[0])}</p><p>${T('With', 'مع')} a = ${f3(a, 2)}, h = ${f3(h, 3)}: <b>${f3(F0.fp(a, h)[1], 4)}</b> → ${T('as h → 0', 'عندما h → 0')}: <b>${f3(F0.fp(a, 0)[1], 4)}</b></p>` : `<p class="v26-hint">${T('For this function the algebra needs known limits (such as sin h / h → 1); the table shows the quotient approaching f′(a) numerically.', 'الجدول يبيّن الاقتراب عددياً.')}</p>`}`;
        const sg = h < 0 ? -1 : 1, rows = [1, 0.5, 0.1, 0.01, 0.001].filter(v => v >= Math.abs(h) - 1e-12).map(v => { const hh = sg * v, m = (f(a + hh) - f(a)) / hh; return `<tr><td>${f3(hh, 3)}</td><td>${f3(m, 5)}</td><td>${f3(m - s.d, 5)}</td></tr>`; });
        host.querySelector('.dl__tab').innerHTML = `<table><tr><th>h</th><th>(f(a+h) − f(a)) / h</th><th>${T('minus f′(a)', 'ناقص f′(a)')}</th></tr>${rows.join('') || `<tr><td colspan="3">${T('Make h smaller to fill the table.', 'صغّر h.')}</td></tr>`}</table>`;
        const ch = ctl.val.ch, box = host.querySelector('.dl__ch');
        if (ch === 'none') box.innerHTML = `<p class="v26-hint">${T('Pick a challenge. Each one is checked from the live numbers.', 'اختر تحدياً.')}</p><ul>${Object.keys(CH_D).map(k => `<li>${tick(done[k])} ${esc(T(CH_D[k].t[0], CH_D[k].t[1]))}</li>`).join('')}</ul>`;
        else { const C = CH_D[ch], okk = (!C.fn || key === C.fn) && C.ok(s); if (okk) done[ch] = true; box.innerHTML = `<p>${esc(T(C.t[0], C.t[1]))}</p><p>${tick(okk)} ${okk ? `<b>${T('Done!', 'أحسنت!')}</b> ` : ''}${esc(C.why(s))}</p>`; }
      }
      K.drag(S1, () => { if (!A1) return []; const s = state(); return [{ id: 'P', x: A1.X(a), y: A1.Y(K.clamp(s.fa, -1e4, 1e4)), r: 14 }, { id: 'Q', x: A1.X(a + h), y: A1.Y(K.clamp(s.fq, -1e4, 1e4)), r: 14 }]; }, (id, x) => {
        anim = null; const v = A1.IX(x);
        if (id === 'P') { a = K.clamp(v, xr[0], xr[1]); if (key === 'rec' && Math.abs(a) < 0.02) a = 0.02; ctl.set('a', +a.toFixed(2)); if (ctl.val.build) built = Math.max(built, a); }
        else { let hh = v - a; if (Math.abs(hh) < 0.001) hh = hh < 0 ? -0.001 : 0.001; h = K.clamp(hh, -2, 2); ctl.set('h', +h.toFixed(3)); }
        M.draw(); read();
      });
      K.drag(S2, () => (A2 ? [{ id: 'P', x: A2.X(a), y: A2.Y(K.clamp(d(a), dyr[0], dyr[1])), r: 14 }] : []), (id, x) => { a = K.clamp(A2.IX(x), xr[0], xr[1]); if (key === 'rec' && Math.abs(a) < 0.02) a = 0.02; ctl.set('a', +a.toFixed(2)); M.draw(); read(); });
      S1.cv.addEventListener('keydown', e => { const st = e.shiftKey ? 0.1 : 0.01 * (xr[1] - xr[0]); if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); a = K.clamp(a + (e.key === 'ArrowRight' ? st : -st), xr[0], xr[1]); ctl.set('a', +a.toFixed(2)); M.draw(); read(); } if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); h = K.clamp(h * (e.key === 'ArrowDown' ? 0.7 : 1 / 0.7), -2, 2); ctl.set('h', +h.toFixed(3)); M.draw(); read(); } });
      let tR = 0;
      const M = K.motor(c, host, (dt, running) => {
        if (running && anim === 'h0') { h *= Math.exp(-dt * 1.15); if (Math.abs(h) <= 0.001) { finish(); } else ctl.set('h', +h.toFixed(3)); }
        if (running && anim === 'sweep') { a += dt * (xr[1] - xr[0]) / 7; if (key === 'rec' && Math.abs(a) < 0.03) a = 0.03; built = Math.max(built, a); if (a >= xr[1] - 0.05) finish(); else ctl.set('a', +a.toFixed(2)); }
        draw(); tR += dt; if (tR > 0.12 || !running) { tR = 0; read(); }
      });
      setFn('sq'); draw(); read();
      return { play() { a = xr[0] + 0.05; built = ctl.val.build ? a : -Infinity; start('sweep'); }, pause() { if (anim) { anim = null; M.pause(); c.onChange && c.onChange(); } }, running: () => !!anim, destroy() { M.pause(); S1.destroy(); S2.destroy(); },
        reset() { anim = null; M.pause(); ctl.reset(); a = 1; h = 1; done = {}; setFn('sq'); M.draw(); read(); },
        _set: o => { if (o.fn) { ctl.set('fn', o.fn); setFn(o.fn); } if (o.src != null) { host.querySelector('[data-fx="dl"]').value = o.src; ctl.set('fn', 'cus'); setFn('cus'); } if (o.ch) { ctl.set('ch', o.ch); on('ch', o.ch); } if (o.a != null) { a = o.a; ctl.set('a', o.a); } if (o.h != null) { h = o.h; ctl.set('h', o.h); } draw(); read(); const s = state(); return Object.assign(s, { sps: roots(d, xr[0], xr[1]), key, done: Object.assign({}, done), anim }); },
        _h0: () => { start('h0'); return anim; },
        observe() { const s = state(); return { text: `On y = ${DF[key].n} at a = ${f3(a, 2)} with h = ${f3(h, 3)}: secant slope **${f3(s.m, 4)}**, tangent slope f′(a) = **${f3(s.d, 4)}** (difference ${f3(s.m - s.d, 4)}).`, predOk: i => (Math.abs(h) < 0.05 ? i === 1 : null) }; }
      };
    }
  };

  /* ======================= INTEGRATION EXPLORER ======================= */
  const IF = {
    sq: { n: 'x²', f: x => x * x, F: x => x * x * x / 3, xr: [-1, 4], a: 0, b: 3 },
    sin: { n: 'sin x', f: Math.sin, F: x => -Math.cos(x), xr: [-0.6, 7], a: 0, b: Math.PI },
    lin: { n: '2 − x', f: x => 2 - x, F: x => 2 * x - x * x / 2, xr: [-1, 5], a: 0, b: 4 },
    cub: { n: 'x³ − 4x', f: x => x * x * x - 4 * x, F: x => x ** 4 / 4 - 2 * x * x, xr: [-3, 3], a: -2, b: 2 },
    cus: { n: T('your function', 'دالتك'), xr: [-4, 4], a: 0, b: 2 }
  };
  const CH_I = {
    nine: { t: ['On y = x² starting at a = 0, drag b so that the area is exactly 9.', 'اجعل المساحة 9.'], fn: 'sq', ok: s => Math.abs(s.a) < 1e-9 && Math.abs(s.I - 9) < 0.05, why: s => `∫ = ${f3(s.I)} (b = ${f3(s.b, 2)})` },
    zero: { t: ['Choose bounds a < b (at least 1 apart) so the signed area under sin x is 0.', 'اجعل المساحة الموقّعة صفراً.'], fn: 'sin', ok: s => Math.abs(s.I) < 0.02 && s.b - s.a > 1, why: s => `∫ = ${f3(s.I)} · ${T('total area', 'المساحة الكلية')} ${f3(s.abs)}` },
    err: { t: ['Left sums on x² from 0 to 3: get the error below 0.1 with as few rectangles as you can.', 'خطأ أقل من 0.1 بأقل عدد.'], fn: 'sq', ok: s => s.m === 'L' && Math.abs(s.a) < 1e-9 && Math.abs(s.b - 3) < 1e-9 && Math.abs(s.err) < 0.1, why: s => `n = ${s.n}, ${T('error', 'الخطأ')} ${f3(s.err, 4)}${s.m !== 'L' ? ' — ' + T('choose Left', 'اختر اليسار') : ''}` },
    peak: { t: ['On y = 2 − x from a = 0, find b where the accumulated area A(b) is greatest.', 'أوجد أكبر قيمة لـ A(b).'], fn: 'lin', ok: s => Math.abs(s.a) < 1e-9 && Math.abs(s.b - 2) < 0.06, why: s => `A(${f3(s.b, 2)}) = ${f3(s.I)} · f(b) = ${f3(s.fb)}` }
  };
  D['integral-lab'] = { wide: true,
    intro: 'The **definite integral** ∫ₐᵇ f(x) dx is the **signed area** between the curve and the x-axis from **a** to **b** — area above the axis counts as positive, area below as negative. To find it, fill the region with **rectangles** and add them up (a **Riemann sum**); the more rectangles, the closer you get.\n\nDrag the bounds **a** and **b**, change the number of rectangles, and watch the **accumulation function A(x)** in the lower graph: its slope is always the height of the curve — the **Fundamental Theorem of Calculus**.',
    predict: { q: 'You double the number of rectangles in a left Riemann sum for a smooth curve. The error (sum minus the exact area) becomes roughly…', options: ['twice as big', 'about half as big', 'exactly zero', 'unchanged'] },
    explore: '- On **x²** from 0 to 3, compare **Left**, **Right**, **Midpoint** and **Trapezium** sums with n = 4. Which is closest? Which are too big and which too small — and why?\n- Press **Refine n → ∞** and read the error column: what happens each time n doubles?\n- On **sin x**, drag b past π. Why does the integral start to fall even though you are adding more area?\n- On **2 − x**, watch A(x) in the lower graph. Where does A(x) reach its maximum? What is f there?',
    explain: 'A **Riemann sum** adds up rectangles of width **Δx = (b − a)/n** and height f(x) at the left end, right end or middle of each strip. As **n → ∞** the sum approaches the **definite integral**. Areas below the axis are **negative**, so the integral is the **signed** area; the total geometric area is ∫|f| dx. If **A(x) = ∫ₐˣ f(t) dt**, then **A′(x) = f(x)**: the rate the area grows is the height of the curve. That is the **Fundamental Theorem of Calculus**, and it is why integrals are computed with an **antiderivative**: ∫ₐᵇ f(x) dx = F(b) − F(a) where F′ = f. For x²: F(x) = x³/3, so ∫₀³ x² dx = 9 − 0 = **9**.',
    apply: [q('x-il1', '∫₀³ x² dx equals…', ['3', '6', '9', '27'], 2, 'F(x) = x³/3, so the integral is 27/3 − 0 = 9.'),
      q('x-il2', 'For an increasing function, a LEFT Riemann sum…', ['overestimates the area', 'underestimates the area', 'is always exact', 'is always zero'], 1, 'Each rectangle uses the lowest height in its strip, so it sits below the curve.'),
      q('x-il3', '∫₀^{2π} sin x dx equals…', ['0', '2', '4', '2π'], 0, 'The positive area from 0 to π (2) cancels the negative area from π to 2π (−2).'),
      q('x-il4', 'If A(x) = ∫₀ˣ f(t) dt, then A′(x) is…', ['f(x)', 'f′(x)', 'x · f(x)', 'A(x) / x'], 0, 'The Fundamental Theorem of Calculus: the area grows at a rate equal to the height of the curve.')],
    summary: ['∫ₐᵇ f dx is the signed area: above the axis +, below −.', 'Riemann sums (left, right, midpoint, trapezium) approach it as n → ∞.', 'Left/right sum errors roughly halve when n doubles; midpoint and trapezium errors quarter.', 'Fundamental Theorem: A′(x) = f(x), so ∫ₐᵇ f dx = F(b) − F(a).'],
    connect: [{ label: 'Differentiation explorer', href: '#/exp/derivative-lab' }, { label: 'Function forge', href: '#/exp/function-forge' }, { label: 'Motion graphs (distance is an area)', href: '#/exp/motion-graphs' }],
    build(host, c) {
      const S1 = K.stage(host, 900, 380, 'il__f'), S2 = K.stage(host, 900, 230, 'il__A');
      S1.cv.tabIndex = 0; S1.cv.setAttribute('role', 'img'); S2.cv.setAttribute('role', 'img');
      const ctl = K.controls(host, [
        { k: 'row' }, { k: 'chips', id: 'fn', label: T('Function', 'الدالة'), opts: Object.keys(IF).map(k => [k, IF[k].n]), val: 'sq' }, customBox('il', 'x*(4-x)/2', T('Type f(x)', 'اكتب f(x)')), { k: 'end' },
        { k: 'row' }, { k: 'range', id: 'n', label: T('Rectangles: n', 'عدد المستطيلات n'), min: 1, max: 200, step: 1, val: 6 }, { k: 'chips', id: 'm', label: T('Method', 'الطريقة'), opts: [['L', T('Left', 'يسار')], ['R', T('Right', 'يمين')], ['M', T('Midpoint', 'منتصف')], ['T', T('Trapezium', 'شبه منحرف')]], val: 'L' }, { k: 'end' },
        { k: 'row' }, { k: 'btn', id: 'refine', label: T('Refine n → ∞', 'زِد n'), accent: true }, { k: 'toggle', id: 'rects', label: T('Show rectangles', 'أظهر المستطيلات'), val: true }, { k: 'toggle', id: 'ftc', label: T('Show the FTC tangent on A(x)', 'مماس المبرهنة الأساسية'), val: true }, { k: 'end' },
        { k: 'row' }, { k: 'chips', id: 'ch', label: T('Challenge', 'تحدٍ'), opts: [['none', T('None', 'لا شيء')], ['nine', T('Area 9', 'مساحة 9')], ['zero', T('Zero signed area', 'مساحة صفرية')], ['err', T('Fewest rectangles', 'أقل مستطيلات')], ['peak', T('Peak of A(x)', 'قمة A')]], val: 'none' }, { k: 'end' }
      ], on);
      const grid = document.createElement('div'); grid.className = 'v26-grid2'; grid.innerHTML = card('il__read', T('Areas', 'المساحات')) + card('il__ftc', T('Fundamental Theorem', 'المبرهنة الأساسية')); host.appendChild(grid);
      const grid2 = document.createElement('div'); grid2.className = 'v26-grid2'; grid2.innerHTML = card('il__tab', T('Refining the sum', 'تحسين المجموع')) + card('il__ch', T('Challenge', 'التحدي')); host.appendChild(grid2);
      const P = K.pal();
      let key = 'sq', f = IF.sq.f, Fa = IF.sq.F, xr = IF.sq.xr, yr = [-1, 1], a = 0, b = 3, n = 6, m = 'L', grow = K.spring(1, 3), refining = null, log = [], done = {}, A1 = null, Ayr = [-1, 1];
      const integ = (x0, x1) => (Fa ? Fa(x1) - Fa(x0) : simpson(f, x0, x1));
      function rsum(N, M0) { const dx = (b - a) / N; let s = 0; for (let i = 0; i < N; i++) { const x0 = a + i * dx, x1 = x0 + dx; s += M0 === 'L' ? f(x0) : M0 === 'R' ? f(x1) : M0 === 'M' ? f((x0 + x1) / 2) : (f(x0) + f(x1)) / 2; } return s * dx; }
      function setFn(k) { key = k; const F0 = IF[k]; if (k === 'cus') { const src = host.querySelector('[data-fx="il"]').value, err = host.querySelector('[data-fxe="il"]'); try { f = compile(src); Fa = null; err.textContent = ''; } catch (e) { err.textContent = T('Could not read that: ', 'تعذّرت القراءة: ') + e.message; return; } } else { f = F0.f; Fa = F0.F; }
        xr = F0.xr; a = F0.a; b = F0.b; yr = autoY(f, xr); const A0 = x => integ(xr[0], x); Ayr = autoY(x => integ(a, x), xr); log = []; regrow(); void A0; }
      function regrow() { grow.set(0, true); grow.set(1); M && M.kick(); }
      function on(id, v) {
        if (id === 'fn') setFn(v);
        else if (id === 'n') { n = v; regrow(); }
        else if (id === 'm') { m = v; log = []; regrow(); }
        else if (id === 'refine') { refining = { k: 0, t: 0 }; n = 1; ctl.set('n', 1); log = []; addLog(); if (K.reduced()) { while (n < 128) { n *= 2; addLog(); } ctl.set('n', n); refining = null; } else { M.play(); c.onChange && c.onChange(); } }
        else if (id === 'ch' && v !== 'none' && CH_I[v].fn && key !== CH_I[v].fn) { ctl.set('fn', CH_I[v].fn); setFn(CH_I[v].fn); }
        if (id === 'ch' && v === 'err' && key === 'sq') { a = 0; b = 3; m = 'L'; ctl.set('m', 'L'); }
        Ayr = autoY(x => integ(a, x), xr); M.draw(); read();
      }
      host.addEventListener('change', e => { if (e.target.matches('[data-fx="il"]')) { ctl.set('fn', 'cus'); setFn('cus'); M.draw(); read(); } });
      host.addEventListener('keydown', e => { if (e.target.matches('[data-fx="il"]') && e.key === 'Enter') { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); } });
      function addLog() { const S0 = rsum(n, m), I = integ(a, b); log.push([n, S0, S0 - I]); }
      const state = () => { const I = integ(a, b), S0 = rsum(n, m); return { a, b, n, m, I, S: S0, err: S0 - I, abs: simpson(x => Math.abs(f(x)), a, b, 2000), fb: f(b), key }; };
      function draw() {
        const g = S1.g, s = state(); S1.clear(); A1 = K.axes(g, [46, 14, 836, 336], xr, yr, { xl: 'x', yl: 'y = ' + IF[key].n, xstep: xr[1] - xr[0] > 3 ? 1 : 0.5, dec: 1 }); const X = A1.X, Y = A1.Y, y0 = Y(0);
        g.save(); g.beginPath(); g.rect(...A1.box); g.clip();
        // signed area: blue above, red below
        const lo = Math.min(a, b), hi = Math.max(a, b), sgn = b >= a ? 1 : -1;
        [[1, sgn > 0 ? 'rgba(60,120,230,.28)' : 'rgba(220,70,70,.28)'], [-1, sgn > 0 ? 'rgba(220,70,70,.28)' : 'rgba(60,120,230,.28)']].forEach(([side, col]) => { g.save(); g.beginPath(); if (side > 0) g.rect(0, 0, 900, y0); else g.rect(0, y0, 900, 400); g.clip(); g.fillStyle = col; g.beginPath(); g.moveTo(X(lo), y0); for (let i = 0; i <= 300; i++) { const x = lo + (hi - lo) * i / 300, y = f(x); g.lineTo(X(x), isFinite(y) ? Y(K.clamp(y, yr[0] - 99, yr[1] + 99)) : y0); } g.lineTo(X(hi), y0); g.closePath(); g.fill(); g.restore(); });
        // rectangles, growing in from the axis one after another
        if (ctl.val.rects && n <= 200) { const dx = (b - a) / n, gv = grow.v; g.lineWidth = n > 60 ? 0.6 : 1.2;
          for (let i = 0; i < n; i++) { const k = K.clamp(gv * 1.6 - i / n * 0.6, 0, 1); if (k <= 0) continue; const x0 = a + i * dx, x1 = x0 + dx;
            if (m === 'T') { const h0 = f(x0) * k, h1 = f(x1) * k; g.fillStyle = 'rgba(232,170,40,.30)'; g.strokeStyle = 'rgba(190,130,20,.9)'; g.beginPath(); g.moveTo(X(x0), y0); g.lineTo(X(x0), Y(h0)); g.lineTo(X(x1), Y(h1)); g.lineTo(X(x1), y0); g.closePath(); g.fill(); g.stroke(); }
            else { const xs = m === 'L' ? x0 : m === 'R' ? x1 : (x0 + x1) / 2, hh = f(xs) * k; if (!isFinite(hh)) continue; g.fillStyle = hh * Math.sign(dx) >= 0 ? 'rgba(232,170,40,.30)' : 'rgba(200,90,40,.30)'; g.strokeStyle = 'rgba(190,130,20,.9)'; g.beginPath(); g.rect(Math.min(X(x0), X(x1)), Math.min(y0, Y(hh)), Math.abs(X(x1) - X(x0)), Math.abs(Y(hh) - y0)); g.fill(); g.stroke(); if (n <= 40 && k >= 1) { g.fillStyle = 'rgba(150,100,10,.95)'; g.beginPath(); g.arc(X(xs), Y(hh), 2.6, 0, 7); g.fill(); } } } }
        K.plot(g, A1, f, xr[0], xr[1], P.ink, 3, 600); g.restore();
        // bounds
        [['a', a], ['b', b]].forEach(([l, v]) => { const x = X(v); g.strokeStyle = P.violet; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, A1.box[1]); g.lineTo(x, A1.box[1] + A1.box[3]); g.stroke(); g.setLineDash([]); g.fillStyle = P.violet; g.strokeStyle = P.bg; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y0, 9, 0, 7); g.fill(); g.stroke(); K.text(g, l, x, y0 + 0.5, { a: 'center', b: 'middle', w: 800, s: 12, c: '#fff' }); K.text(g, `${l} = ${f3(v, 2)}`, x + (l === 'a' ? -12 : 12), y0 - 16, { w: 700, s: 12, c: P.violet, a: l === 'a' ? 'right' : 'left' }); });
        K.text(g, `∫ₐᵇ f dx = ${f3(s.I, 4)}    ${T('sum', 'المجموع')} (${m}, n = ${n}) = ${f3(s.S, 4)}    ${T('error', 'الخطأ')} ${f3(s.err, 4)}    ${T('total area', 'المساحة الكلية')} ${f3(s.abs, 3)}`, 50, 370, { w: 700, s: 12 });
        S1.cv.setAttribute('aria-label', `y = ${IF[key].n} ${T('from', 'من')} a = ${f3(a, 2)} ${T('to', 'إلى')} b = ${f3(b, 2)}. ${T('Signed area', 'المساحة الموقعة')} ${f3(s.I, 4)}; ${m} ${T('sum with', 'مجموع بـ')} ${n}: ${f3(s.S, 4)}.`);
        // accumulation A(x) = ∫_a^x f
        const g2 = S2.g; S2.clear(); const A2 = K.axes(g2, [46, 10, 836, 196], xr, Ayr, { xl: 'x', yl: 'A(x) = ∫ₐˣ f(t) dt' });
        const Af = Fa ? (x => Fa(x) - Fa(a)) : (() => { const N = 300, xs = [], ys = []; let acc = 0, px = xr[0]; const base = simpson(f, a, xr[0], 400); xs.push(xr[0]); ys.push(base); for (let i = 1; i <= N; i++) { const x = xr[0] + (xr[1] - xr[0]) * i / N; acc += simpson(f, px, x, 8); xs.push(x); ys.push(base + acc); px = x; } return x => { const t = (x - xr[0]) / (xr[1] - xr[0]) * N, i = K.clamp(Math.floor(t), 0, N - 1), u = t - i; return ys[i] + (ys[i + 1] - ys[i]) * u; }; })();
        K.plot(g2, A2, Af, xr[0], xr[1], P.blue, 2.6, 400);
        const Ab = Af(b), fb = f(b); g2.fillStyle = P.blue; g2.strokeStyle = P.bg; g2.lineWidth = 2.5; g2.beginPath(); g2.arc(A2.X(b), A2.Y(Ab), 7, 0, 7); g2.fill(); g2.stroke();
        if (ctl.val.ftc && isFinite(fb)) { g2.save(); g2.beginPath(); g2.rect(...A2.box); g2.clip(); g2.strokeStyle = P.red; g2.lineWidth = 2; g2.setLineDash([7, 5]); const w = (xr[1] - xr[0]) * 0.18; g2.beginPath(); g2.moveTo(A2.X(b - w), A2.Y(Ab - fb * w)); g2.lineTo(A2.X(b + w), A2.Y(Ab + fb * w)); g2.stroke(); g2.setLineDash([]); g2.restore(); K.text(g2, `${T('slope of A at b', 'ميل A عند b')} = f(b) = ${f3(fb, 3)}`, A2.X(b) + 10, A2.Y(Ab) - 12, { w: 700, s: 12, c: P.red }); }
        S2.cv.setAttribute('aria-label', `${T('Accumulation function', 'دالة التراكم')} A(b) = ${f3(Ab, 4)}; ${T('its slope at b is f(b)', 'ميلها عند b هو f(b)')} = ${f3(fb, 3)}.`);
        return { Ab, fb, Af };
      }
      function read() {
        const s = state(), dx = (b - a) / n, Af = Fa ? (x => Fa(x) - Fa(a)) : (x => simpson(f, a, x, 2000)), e = 1e-4, slope = (Af(b + e) - Af(b - e)) / (2 * e);
        host.querySelector('.il__read').innerHTML = `<p>Δx = (b − a) / n = (${f3(b, 2)} − ${f3(a, 2)}) / ${n} = <b>${f3(dx, 4)}</b></p><p><b>${T('Riemann sum', 'مجموع ريمان')}</b> (${({ L: T('left', 'يسار'), R: T('right', 'يمين'), M: T('midpoint', 'منتصف'), T: T('trapezium', 'شبه منحرف') })[m]}): <b>${f3(s.S, 5)}</b></p><p><b>${T('Exact integral', 'التكامل الدقيق')}</b> ∫ₐᵇ f dx = <b>${f3(s.I, 5)}</b> <span class="v26-hint">${Fa ? T('(from the antiderivative F(b) − F(a))', '(من الدالة الأصلية)') : T('(Simpson’s rule, 4000 strips)', '(قاعدة سمبسون)')}</span></p><p>${T('Error', 'الخطأ')} ${f3(s.err, 5)} · ${T('total (unsigned) area', 'المساحة غير الموقعة')} ∫|f| = ${f3(s.abs, 4)}</p>`;
        host.querySelector('.il__ftc').innerHTML = `<p>A(x) = ∫<sub>a</sub><sup>x</sup> f(t) dt ⇒ <b>A′(x) = f(x)</b></p><p>${T('Measured slope of A at b', 'ميل A المقاس عند b')}: <b>${f3(slope, 4)}</b> · f(b) = <b>${f3(s.fb, 4)}</b></p><p class="v26-hint">${s.fb > 1e-6 ? T('f(b) > 0: moving b right adds area, A is rising.', 'f(b) > 0: A تتزايد.') : s.fb < -1e-6 ? T('f(b) < 0: the curve is below the axis, so A is falling.', 'f(b) < 0: A تتناقص.') : T('f(b) = 0: A has a stationary point here.', 'f(b) = 0: نقطة ثابتة لـ A.')}</p>`;
        host.querySelector('.il__tab').innerHTML = log.length ? `<table><tr><th>n</th><th>${T('sum', 'المجموع')}</th><th>${T('error', 'الخطأ')}</th><th>${T('error ratio', 'نسبة الخطأ')}</th></tr>${log.map((r, i) => `<tr><td>${r[0]}</td><td>${f3(r[1], 5)}</td><td>${f3(r[2], 5)}</td><td>${i && Math.abs(r[2]) > 1e-12 ? f3(log[i - 1][2] / r[2], 2) : '—'}</td></tr>`).join('')}</table>` : `<p class="v26-hint">${T('Press Refine to double n repeatedly and see how the error shrinks.', 'اضغط تحسين.')}</p>`;
        const ch = ctl.val.ch, box = host.querySelector('.il__ch');
        if (ch === 'none') box.innerHTML = `<p class="v26-hint">${T('Pick a challenge. Each one is checked from the live numbers.', 'اختر تحدياً.')}</p><ul>${Object.keys(CH_I).map(k => `<li>${tick(done[k])} ${esc(T(CH_I[k].t[0], CH_I[k].t[1]))}</li>`).join('')}</ul>`;
        else { const C = CH_I[ch], okk = (!C.fn || key === C.fn) && C.ok(s); if (okk) done[ch] = true; box.innerHTML = `<p>${esc(T(C.t[0], C.t[1]))}</p><p>${tick(okk)} ${okk ? `<b>${T('Done!', 'أحسنت!')}</b> ` : ''}${esc(C.why(s))}</p>`; }
      }
      const snap = v => { if (key === 'sin') { const k = Math.round(v / (Math.PI / 2)); if (Math.abs(v - k * Math.PI / 2) < 0.06) return k * Math.PI / 2; } return Math.round(v * 20) / 20; };
      S1.cv.__handle = id => (A1 ? [A1.X(id === 'a' ? a : b), A1.Y(0)] : null); // stage coordinates of a bound handle (for tests)
      K.drag(S1, () => (A1 ? [{ id: 'a', x: A1.X(a), y: A1.Y(0), r: 16 }, { id: 'b', x: A1.X(b), y: A1.Y(0), r: 16 }] : []), (id, x) => { const v = snap(K.clamp(A1.IX(x), xr[0], xr[1])); if (id === 'a') a = v; else b = v; Ayr = autoY(t => integ(a, t), xr); M.draw(); read(); });
      S1.cv.addEventListener('keydown', e => { if (!/Arrow(Left|Right)/.test(e.key)) return; e.preventDefault(); const st = (e.key === 'ArrowRight' ? 1 : -1) * 0.05; if (e.shiftKey) a = snap(K.clamp(a + st, xr[0], xr[1])); else b = snap(K.clamp(b + st, xr[0], xr[1])); Ayr = autoY(t => integ(a, t), xr); M.draw(); read(); });
      const M = K.motor(c, host, (dt, running) => {
        if (running && refining) { refining.t += dt; if (refining.t > 0.7) { refining.t = 0; if (n >= 128) { refining = null; M.pause(); c.onChange && c.onChange(); } else { n *= 2; ctl.set('n', n); addLog(); regrow(); } } }
        draw(); read();
      });
      M.add(grow);
      setFn('sq'); grow.set(1, true); draw(); read();
      return { play() { on('refine', true); }, pause() { if (refining) { refining = null; M.pause(); c.onChange && c.onChange(); } }, running: () => !!refining, destroy() { M.pause(); S1.destroy(); S2.destroy(); },
        reset() { refining = null; M.pause(); ctl.reset(); n = 6; m = 'L'; done = {}; setFn('sq'); grow.set(1, true); M.draw(); read(); },
        _set: o => { if (o.fn) { ctl.set('fn', o.fn); setFn(o.fn); } if (o.src != null) { host.querySelector('[data-fx="il"]').value = o.src; ctl.set('fn', 'cus'); setFn('cus'); } if (o.ch) { ctl.set('ch', o.ch); on('ch', o.ch); } if (o.a != null) a = o.a; if (o.b != null) b = o.b; if (o.n != null) { n = o.n; ctl.set('n', o.n); } if (o.m) { m = o.m; ctl.set('m', o.m); } grow.set(1, true); const r = draw(); read(); const s = state(); return Object.assign(s, { Ab: r.Ab, done: Object.assign({}, done), rsum: (N, M0) => rsum(N, M0) }); },
        _sum: (N, M0) => rsum(N, M0),
        _log: () => log.map(r => r.slice()),
        observe() { const s = state(); return { text: `∫ from ${f3(a, 2)} to ${f3(b, 2)} of ${IF[key].n} = **${f3(s.I, 4)}**; the ${m} sum with n = ${n} is **${f3(s.S, 4)}** (error ${f3(s.err, 4)}).`, predOk: i => (log.length > 2 && (m === 'L' || m === 'R') ? i === 1 : null) }; }
      };
    }
  };
  /* ======================= QUADRATIC LAB: challenges (v28) ======================= */
  const QCH = [
    ['roots', 'Make a parabola with roots at x = −1 and x = 3.', 'جذران عند −1 و 3.', (a, h, k) => Math.abs(a) > 0.04 && Math.abs(h - 1) < 0.051 && Math.abs(k + 4 * a) < 0.06, 'Roots −1 and 3 → axis of symmetry x = 1, and y = a(x + 1)(x − 3) has its vertex at k = −4a.'],
    ['touch', 'Make it just touch the x-axis at x = −2.', 'يلامس المحور عند −2.', (a, h, k) => Math.abs(a) > 0.04 && Math.abs(h + 2) < 0.051 && Math.abs(k) < 0.051, 'One repeated root: the vertex sits on the axis at (−2, 0), so the discriminant is 0.'],
    ['max', 'Make it open downwards with a maximum value of 5.', 'مفتوح لأسفل وقيمته العظمى 5.', (a, h, k) => a < -0.04 && Math.abs(k - 5) < 0.051, 'a < 0 opens downwards; the maximum value is the vertex height k.'],
    ['point', 'Vertex (2, 1) and passing through (0, 5).', 'الرأس (2، 1) ويمر بـ (0، 5).', (a, h, k) => Math.abs(h - 2) < 0.051 && Math.abs(k - 1) < 0.051 && Math.abs(a * 4 + k - 5) < 0.06, 'y = a(x − 2)² + 1 through (0, 5): 4a + 1 = 5, so a = 1.']
  ];
  const qdef = D['quad-lab'];
  if (qdef) { const oldQ = qdef.build; qdef.explore = (qdef.explore || '') + '\n- Try the **challenges**: each is checked from the live parabola.'; qdef.build = function (host, c) {
    const base = oldQ(host, c); const box = document.createElement('div'); box.className = 'v26-card ql__ch'; box.innerHTML = `<h3>${T('Challenges', 'تحديات')}</h3><div class="v26-out" aria-live="polite"></div>`; host.appendChild(box);
    const done = {}; const val = id => +host.querySelector(`[data-k="${id}"]`).value;
    const check = () => { const a = val('a'), h = val('h'), k = val('k'); QCH.forEach(([id, , , ok]) => { if (ok(a, h, k)) done[id] = true; });
      box.querySelector('.v26-out').innerHTML = `<ul class="v28-checks">${QCH.map(([id, en, ar, ok, why]) => `<li>${done[id] ? '<span class="v28-ok">✓</span>' : '<span class="v28-todo">○</span>'} ${esc(T(en, ar))}${ok(a, h, k) ? ` <b>${T('Yes — right now!', 'نعم!')}</b> <span class="v26-hint">${esc(why)}</span>` : ''}</li>`).join('')}</ul>`; return QCH.map(([id, , , ok]) => ok(a, h, k)); };
    const mo = new MutationObserver(check); const cards = host.querySelector('.kx-cards'); if (cards) mo.observe(cards, { childList: true, subtree: true, characterData: true });
    host.addEventListener('input', check); check();
    return Object.assign({}, base, { destroy() { mo.disconnect(); base.destroy && base.destroy(); }, reset() { Object.keys(done).forEach(k => delete done[k]); base.reset && base.reset(); check(); }, _qch: (a, h, k) => QCH.map(([id, , , ok]) => [id, ok(a, h, k)]), _check: check }); }; }
})();
