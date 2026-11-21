/* ERLY Learning Studio v27 — Function Forge, Maths Missions, Probability Lab, the Water Cycle (rebuilt) and the
   Reaction Lab. Loaded after the other experience packs (it replaces the v24 water-cycle definition).
   Every number shown is computed here: roots and intersections by bisection on sign changes, turning points from the
   sign of the slope, probabilities from crypto-random trials, the water cycle from a conserved box model, chemical
   balance from atom counts. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, IL = LS.inline, esc = LS.esc;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const f2 = (v, d = 2) => K.fmt(v, d);
  const COLS = ['#2f6fe0', '#d0503b', '#0d9488', '#9b5de5'];
  const comp = src => { const f = K.expr(String(src).replace(/^\s*(y|f\(x\))\s*=\s*/i, '').replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/'), ['x', 'a', 'b', 'c', 'd']); return x => f({ x, a: P.a, b: P.b, c: P.c, d: P.d }); };
  let P = { a: 1, b: 1, c: 0, d: 0 };
  // numerical analysis on [x0, x1]: roots, turning points, gaps, extremes
  function analyse(f, x0, x1, n = 1600) {
    const xs = [], ys = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; let y; try { y = f(x); } catch (e) { y = NaN; } xs.push(x); ys.push(isFinite(y) ? y : NaN); }
    const bis = (a, b, g) => { let fa = g(a); for (let k = 0; k < 60; k++) { const m = (a + b) / 2, fm = g(m); if (!isFinite(fm)) return null; if ((fa <= 0) === (fm <= 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; };
    const roots = [], turns = [], gaps = []; let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const a = ys[i], b = ys[i + 1]; if (isFinite(a)) { lo = Math.min(lo, a); hi = Math.max(hi, a); }
      if (!isFinite(a) || !isFinite(b)) { if (isFinite(a) !== isFinite(b)) gaps.push(isFinite(a) ? xs[i + 1] : xs[i]); continue; } // the first sample where the rule cannot be evaluated
      const jump = Math.abs(b - a) > 50 * (Math.abs(hi - lo) + 1) / n * 40 && Math.abs(b - a) > 20;
      if (a === 0) roots.push(xs[i]); else if (a * b < 0 && !jump) { const r = bis(xs[i], xs[i + 1], f); if (r != null && Math.abs(f(r)) < 1e-6 * (1 + Math.abs(hi - lo))) roots.push(r); }
      else if (a * b < 0 && jump) gaps.push((xs[i] + xs[i + 1]) / 2);
      if (i > 0 && isFinite(ys[i - 1])) { const s1 = a - ys[i - 1], s2 = b - a; if (s1 * s2 < 0 && !jump) { const slope = x => (f(x + 1e-5) - f(x - 1e-5)) / 2e-5; let t = bis(xs[i - 1], xs[i + 1], slope); if (t == null) t = xs[i]; turns.push({ x: t, y: f(t), kind: s1 > 0 ? 'max' : 'min' }); if (Math.abs(f(t)) < 1e-7 && !roots.some(r => Math.abs(r - t) < 1e-4)) roots.push(t); } }
    }
    const uniq = (arr, tol) => arr.sort((a, b) => a - b).filter((r, i, s) => i === 0 || Math.abs(r - s[i - 1]) > tol);
    return { roots: uniq(roots, 1e-6 * (x1 - x0)), turns, gaps: uniq(gaps, 3 * (x1 - x0) / n), lo, hi };
  }
  const num = (v, d = 3) => { if (!isFinite(v)) return '—'; const r = Math.round(v * 1e6) / 1e6; return Number.isInteger(r) ? String(r).replace('-', '−') : f2(v, d); };

  /* ======================= FUNCTION FORGE ======================= */
  D['function-forge'] = { wide: true,
    intro: 'A workshop for functions. Type up to four functions of **x** — use the parameters **a, b, c, d** wherever you like and move their sliders. The graph, the table of values and the list of key features all update together: **roots**, the **y-intercept**, **turning points**, **intersections**, the **range** on screen and any **gaps** in the domain.',
    predict: { q: 'f(x) = x². What does the graph of **f(x − 3)** look like?', options: ['the same curve moved 3 left', 'the same curve moved 3 right', 'moved 3 up', 'moved 3 down'] },
    explore: '- Type **(x − a)^2 + b** and move a and b: watch the vertex and the roots in the feature list.\n- Add **2x + 1** as a second function: where do they meet? Change a until they meet only once.\n- Try **1/(x − a)**: what does the feature list say about the domain?\n- Drag the graph to pan, scroll or pinch to zoom; move along the curve to trace values.',
    explain: 'A function’s **equation, graph and table** are three views of the same rule. Replacing x by **(x − h)** shifts the graph **h to the right**; adding **k** shifts it **up**; multiplying by **a** stretches it vertically (and flips it if a < 0). **Roots** are where the graph crosses y = 0; **intersections** of f and g are the roots of **f − g**; a **turning point** is where the slope changes sign. Where a rule cannot be evaluated (dividing by zero, √ of a negative), the graph has a **gap** — x is outside the **domain**.',
    apply: [q('x-ff1', 'f(x) = x² − 4. Its roots are…', ['x = 4', 'x = ±2', 'x = ±4', 'x = 2 only'], 1, 'x² − 4 = 0 → x² = 4 → x = ±2.'), q('x-ff2', 'The graph of y = (x + 1)² − 3 has its turning point at…', ['(1, −3)', '(−1, −3)', '(−1, 3)', '(1, 3)'], 1, 'Vertex form (x − h)² + k with h = −1, k = −3.'), q('x-ff3', 'y = 2x + 1 and y = x + 4 intersect at…', ['(3, 7)', '(1, 3)', '(−3, 1)', '(5, 9)'], 0, '2x + 1 = x + 4 → x = 3, y = 7.')],
    summary: ['Equation, graph and table show the same rule.', 'f(x − h) shifts right by h; f(x) + k shifts up by k.', 'Intersections of f and g are the roots of f − g.', 'Gaps in the graph show values outside the domain.'],
    connect: [{ label: 'Quadratic lab', href: '#/exp/quad-lab' }, { label: 'Maths missions', href: '#/exp/math-missions' }, { label: 'Lesson: Quadratic functions', href: '#/lesson/math-quad' }],
    build(host, c) {
      P = { a: 1, b: 1, c: 0, d: 0 };
      host.innerHTML = `<div class="v26-ws ff"><div class="ff__rows"></div><div class="v26-bar"><button type="button" class="v26-tool" data-ff="add">+ ${T('Add a function', 'أضف دالة')}</button><span class="v26-hint">${T('Examples:', 'أمثلة:')}</span>${['(x-a)^2+b', 'a*sin(b*x)+c', '1/(x-a)', 'sqrt(x+a)', 'x^3-3x', 'abs(x-a)-b'].map(e => `<button type="button" class="v26-tool" data-ex="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>`;
      const ws = host.querySelector('.ff');
      const S = K.stage(ws, 900, 540, 'ff__stage'); S.cv.tabIndex = 0; S.cv.setAttribute('role', 'img');
      const ctl = K.controls(ws, [{ k: 'row' }, ...['a', 'b', 'c', 'd'].map((p, i) => ({ k: 'range', id: p, label: p, min: -5, max: 5, step: 0.1, val: [1, 1, 0, 0][i], d: 1 })), { k: 'end' }, { k: 'row' }, { k: 'btn', id: 'zin', label: T('Zoom in', 'تكبير') }, { k: 'btn', id: 'zout', label: T('Zoom out', 'تصغير') }, { k: 'btn', id: 'home', label: T('Reset view', 'إعادة العرض') }, { k: 'end' }], (id, v) => { if ('abcd'.includes(id) && id.length === 1) { P[id] = v; draw(); } if (id === 'zin') zoom(0.7); if (id === 'zout') zoom(1 / 0.7); if (id === 'home') { V = { x0: -8, x1: 8, y0: -6, y1: 6 }; draw(); } });
      const out = document.createElement('div'); out.className = 'v26-grid2'; out.innerHTML = `<div class="v26-card"><h3>${T('Key features (on the visible part of the graph)', 'الخصائص')}</h3><div class="v26-out ff__feat" aria-live="polite"></div></div><div class="v26-card"><h3>${T('Table of values', 'جدول القيم')}</h3><div class="v26-bar"><label>x ${T('from', 'من')} <input class="ls-input ff__t0" style="width:70px" value="-3"></label><label>${T('step', 'الخطوة')} <input class="ls-input ff__ts" style="width:70px" value="1"></label></div><div class="v26-out ff__tab"></div></div>`; ws.appendChild(out);
      let fns = [{ src: '(x-a)^2+b', on: true }, { src: '2x+1', on: true }], comps = [], V = { x0: -8, x1: 8, y0: -6, y1: 6 }, trace = null;
      function rows() { ws.querySelector('.ff__rows').innerHTML = fns.map((f, i) => `<div class="v26-bar ff__row"><span style="width:14px;height:14px;border-radius:4px;background:${COLS[i]}" aria-hidden="true"></span><label class="sr-only" for="ffIn${i}">Function ${i + 1}</label><span class="v26-eq" style="padding:0 4px;font-size:1rem">${'fghk'[i]}(x) =</span><input id="ffIn${i}" class="ls-input ff__in" data-i="${i}" value="${esc(f.src)}" spellcheck="false" autocomplete="off" style="flex:1;min-width:160px;font-family:var(--f-mono,ui-monospace)"><label class="kx-tog"><input type="checkbox" data-on="${i}" ${f.on ? 'checked' : ''}><span>${T('show', 'إظهار')}</span></label><button type="button" class="v26-tool" data-del="${i}" aria-label="${T('Remove function', 'أزل الدالة')} ${i + 1}">✕</button><span class="ff__err" data-err="${i}" role="alert" style="color:var(--red,#c0392b);font-size:.85rem"></span></div>`).join(''); compile(); }
      function compile() { comps = fns.map((f, i) => { try { const g = comp(f.src); g(0.37); return g; } catch (e) { const el = ws.querySelector(`[data-err="${i}"]`); if (el) el.textContent = e.message; return null; } }); fns.forEach((f, i) => { const el = ws.querySelector(`[data-err="${i}"]`); if (el && comps[i]) el.textContent = ''; }); draw(); }
      const zoom = k => { const cx = (V.x0 + V.x1) / 2, cy = (V.y0 + V.y1) / 2, hw = (V.x1 - V.x0) / 2 * k, hh = (V.y1 - V.y0) / 2 * k; V = { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh }; draw(); };
      let A = null;
      function draw() {
        const G = S.g, Pl = K.pal(); S.clear(Pl.bg); A = K.axes(G, [44, 14, 840, 500], [V.x0, V.x1], [V.y0, V.y1], { xl: 'x', yl: 'y' });
        const feats = [], tab = [];
        comps.forEach((f, i) => { if (!f || !fns[i].on) return; const col = COLS[i];
          // draw with breaks at gaps and vertical jumps
          G.save(); G.beginPath(); G.rect(...A.box); G.clip(); G.strokeStyle = col; G.lineWidth = 2.6; G.beginPath(); let pen = false, py = null;
          for (let k = 0; k <= 900; k++) { const x = V.x0 + (V.x1 - V.x0) * k / 900; let y; try { y = f(x); } catch (e) { y = NaN; } if (!isFinite(y) || (py != null && Math.abs(y - py) > (V.y1 - V.y0) * 3)) { pen = false; py = isFinite(y) ? y : null; continue; } const X = A.X(x), Y = K.clamp(A.Y(y), -2000, 2600); if (pen) G.lineTo(X, Y); else G.moveTo(X, Y); pen = true; py = y; }
          G.stroke(); G.restore();
          const an = analyse(f, V.x0, V.x1); let y0; try { y0 = f(0); } catch (e) { y0 = NaN; }
          an.roots.forEach(r => { G.fillStyle = col; G.beginPath(); G.arc(A.X(r), A.Y(0), 5, 0, 7); G.fill(); });
          an.turns.forEach(t => { if (isFinite(t.y)) { G.strokeStyle = col; G.lineWidth = 2; G.beginPath(); G.arc(A.X(t.x), A.Y(t.y), 6, 0, 7); G.stroke(); } });
          if (isFinite(y0) && V.x0 < 0 && V.x1 > 0) { G.fillStyle = col; G.fillRect(A.X(0) - 4, A.Y(y0) - 4, 8, 8); }
          feats.push(`<p><b style="color:${col}">${'fghk'[i]}(x) = ${esc(fns[i].src)}</b><br>${T('roots', 'الجذور')}: ${an.roots.length ? an.roots.slice(0, 6).map(r => 'x = ' + num(r)).join(', ') + (an.roots.length > 6 ? ' …' : '') : T('none on screen', 'لا توجد')} · ${T('y-intercept', 'المقطع الصادي')}: ${isFinite(y0) ? num(y0) : T('undefined at x = 0', 'غير معرّف')}<br>${T('turning points', 'نقاط الانعطاف')}: ${an.turns.length ? an.turns.slice(0, 4).map(t => `${t.kind === 'max' ? T('max', 'عظمى') : T('min', 'صغرى')} (${num(t.x)}, ${num(t.y)})`).join(', ') : T('none on screen', 'لا توجد')}<br>${T('range on screen', 'المدى الظاهر')}: ${isFinite(an.lo) ? `${num(an.lo)} ≤ y ≤ ${num(an.hi)}` : '—'}${an.gaps.length ? ` · <b>${T('gaps in the domain near', 'فجوات في المجال قرب')} x = ${an.gaps.slice(0, 3).map(g => num(g, 2)).join(', ')}</b>` : ''}</p>`);
        });
        // intersections of every visible pair
        for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) { if (!comps[i] || !comps[j] || !fns[i].on || !fns[j].on) continue; const g = x => comps[i](x) - comps[j](x), an = analyse(g, V.x0, V.x1); const pts = an.roots.filter(x => isFinite(comps[i](x))); pts.forEach(x => { const y = comps[i](x); G.strokeStyle = Pl.ink; G.lineWidth = 2; G.beginPath(); G.arc(A.X(x), A.Y(y), 7, 0, 7); G.stroke(); }); feats.push(`<p>${'fghk'[i]} ${T('and', 'و')} ${'fghk'[j]} ${T('meet at', 'تلتقيان عند')}: ${pts.length ? pts.slice(0, 5).map(x => `(${num(x)}, ${num(comps[i](x))})`).join(', ') : T('no point on screen', 'لا نقطة ظاهرة')}</p>`); }
        if (trace != null) { G.strokeStyle = Pl.muted; G.setLineDash([4, 4]); G.beginPath(); G.moveTo(A.X(trace), A.box[1]); G.lineTo(A.X(trace), A.box[1] + A.box[3]); G.stroke(); G.setLineDash([]); comps.forEach((f, i) => { if (!f || !fns[i].on) return; const y = f(trace); if (!isFinite(y)) return; G.fillStyle = COLS[i]; G.beginPath(); G.arc(A.X(trace), A.Y(y), 4.5, 0, 7); G.fill(); K.tag(G, `(${num(trace, 2)}, ${num(y, 2)})`, A.X(trace) + 46, A.Y(y) - 14, COLS[i]); }); }
        ws.querySelector('.ff__feat').innerHTML = feats.join('') || `<p class="v26-hint">${T('Type a function above.', 'اكتب دالة.')}</p>`;
        const t0 = +ws.querySelector('.ff__t0').value || 0, ts = +ws.querySelector('.ff__ts').value || 1;
        ws.querySelector('.ff__tab').innerHTML = `<table><tr><th>x</th>${fns.map((f, i) => comps[i] && f.on ? `<th style="color:${COLS[i]}">${'fghk'[i]}(x)</th>` : '').join('')}</tr>${Array.from({ length: 9 }, (_, k) => t0 + k * ts).map(x => `<tr><td>${num(x)}</td>${fns.map((f, i) => { if (!comps[i] || !f.on) return ''; let y; try { y = comps[i](x); } catch (e) { y = NaN; } return `<td>${isFinite(y) ? num(y) : T('undefined', 'غير معرّف')}</td>`; }).join('')}</tr>`).join('')}</table>`;
        S.cv.setAttribute('aria-label', T('Graph of ', 'منحنى ') + fns.filter((f, i) => comps[i] && f.on).map(f => f.src).join(', '));
      }
      // pan (drag), zoom (wheel / pinch), trace (move)
      let drag = null; const pts = new Map(); S.cv.style.touchAction = 'none';
      S.cv.addEventListener('pointerdown', e => { e.preventDefault(); S.cv.focus({ preventScroll: true }); pts.set(e.pointerId, S.pt(e)); S.cv.setPointerCapture(e.pointerId); const [x, y] = S.pt(e); drag = { x, y, V: Object.assign({}, V) }; S.cv.classList.add('is-grab'); });
      S.cv.addEventListener('pointermove', e => { const [x, y] = S.pt(e); if (pts.has(e.pointerId)) pts.set(e.pointerId, [x, y]); if (pts.size === 2) { const [p1, p2] = [...pts.values()], d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]); if (drag.pd) zoom(drag.pd / d); drag.pd = d; return; } if (drag) { const dx = (x - drag.x) / 840 * (drag.V.x1 - drag.V.x0), dy = (y - drag.y) / 500 * (drag.V.y1 - drag.V.y0); V = { x0: drag.V.x0 - dx, x1: drag.V.x1 - dx, y0: drag.V.y0 + dy, y1: drag.V.y1 + dy }; } if (A) trace = A.IX(x); draw(); });
      const up = e => { pts.delete(e.pointerId); if (!pts.size) { drag = null; S.cv.classList.remove('is-grab'); } }; S.cv.addEventListener('pointerup', up); S.cv.addEventListener('pointercancel', up); S.cv.addEventListener('pointerleave', () => { trace = null; draw(); });
      S.cv.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 0.85 : 1 / 0.85); }, { passive: false });
      S.cv.addEventListener('keydown', e => { const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]; if (m) { e.preventDefault(); const sx = (V.x1 - V.x0) / 10, sy = (V.y1 - V.y0) / 10; V = { x0: V.x0 + m[0] * sx, x1: V.x1 + m[0] * sx, y0: V.y0 + m[1] * sy, y1: V.y1 + m[1] * sy }; draw(); } if (e.key === '+' || e.key === '=') zoom(0.8); if (e.key === '-') zoom(1.25); });
      ws.addEventListener('input', e => { const i = e.target.dataset.i; if (i != null) { fns[+i].src = e.target.value; compile(); } if (e.target.closest('.ff__t0, .ff__ts')) draw(); });
      ws.addEventListener('change', e => { const o = e.target.dataset.on; if (o != null) { fns[+o].on = e.target.checked; draw(); } });
      ws.addEventListener('click', e => { if (e.target.closest('[data-ff="add"]') && fns.length < 4) { fns.push({ src: '', on: true }); rows(); ws.querySelector(`#ffIn${fns.length - 1}`).focus(); } const dl = e.target.closest('[data-del]'); if (dl) { fns.splice(+dl.dataset.del, 1); rows(); } const ex = e.target.closest('[data-ex]'); if (ex) { if (fns.length < 4 && fns.every(f => f.src)) fns.push({ src: ex.dataset.ex, on: true }); else { const k = fns.findIndex(f => !f.src); fns[k < 0 ? fns.length - 1 : k].src = ex.dataset.ex; } rows(); } });
      S.onresize = () => draw(); // a resize clears the canvas: draw it again
      rows();
      return { play() {}, pause() {}, running: () => false, destroy() { S.destroy(); },
        reset() { P = { a: 1, b: 1, c: 0, d: 0 }; ctl.reset(); fns = [{ src: '(x-a)^2+b', on: true }, { src: '2x+1', on: true }]; V = { x0: -8, x1: 8, y0: -6, y1: 6 }; rows(); },
        preset() { this.reset(); fns = [{ src: 'x^2', on: true }, { src: '(x-3)^2', on: true }]; rows(); },
        _analyse: (src, x0 = -10, x1 = 10) => { const f = comp(src), a = analyse(f, x0, x1); return { roots: a.roots.map(r => +r.toFixed(6)), turns: a.turns.map(t => [+t.x.toFixed(4), +t.y.toFixed(4), t.kind]), gaps: a.gaps.map(g => +g.toFixed(2)) }; },
        observe() { const an = comps.map((f, i) => (f && fns[i].on ? `${'fghk'[i]}(x) = ${fns[i].src}: roots ${analyse(f, V.x0, V.x1).roots.map(r => num(r)).join(', ') || 'none on screen'}` : null)).filter(Boolean); return { text: `With a = ${num(P.a)}, b = ${num(P.b)}, c = ${num(P.c)}, d = ${num(P.d)}: ${an.join('; ')}.`, predOk: i => i === 1 }; }
      };
    }
  };

  /* ======================= MATHS MISSIONS ======================= */
  const MISSIONS = [
    { id: 'hide1', n: 'Hidden line', task: 'A mystery straight line is drawn. Type its equation.', show: [x => 2 * x - 3], check: f => [-3, -1, 0, 1.5, 4].every(x => Math.abs(f(x) - (2 * x - 3)) < 1e-6), hint: 'Read the y-intercept where it crosses the y-axis, then count how far it rises for every 1 across.', sol: 'y = 2x − 3' },
    { id: 'hide2', n: 'Hidden parabola', task: 'A mystery parabola is drawn. Type its equation (any equivalent form is accepted).', show: [x => x * x - 4 * x + 1], check: f => [-2, 0, 1, 2, 3, 5].every(x => Math.abs(f(x) - (x * x - 4 * x + 1)) < 1e-6), hint: 'Find the vertex first: it is at (2, −3). Try (x − 2)² − 3.', sol: '(x − 2)² − 3 = x² − 4x + 1' },
    { id: 'thru', n: 'Through three points', task: 'Make a parabola that passes through all three red points: (−1, 0), (3, 0) and (1, −4).', pts: [[-1, 0], [3, 0], [1, -4]], check: f => [[-1, 0], [3, 0], [1, -4]].every(([x, y]) => Math.abs(f(x) - y) < 1e-6), hint: 'Two points are roots: start from (x + 1)(x − 3), then check the third point.', sol: 'y = (x + 1)(x − 3)' },
    { id: 'touch', n: 'Just touching', task: 'Make a parabola that opens DOWNWARDS and touches the x-axis at exactly one point, x = 2.', check: f => Math.abs(f(2)) < 1e-6 && Math.abs((f(2 + 1e-4) - f(2 - 1e-4)) / 2e-4) < 1e-3 && f(1) < -1e-9 && f(3) < -1e-9, hint: 'A repeated root at 2 means (x − 2)²; a minus sign in front flips it.', sol: 'y = −(x − 2)²' },
    { id: 'par', n: 'Parallel line', task: 'Make a line parallel to the blue line y = 3x + 1 that passes through the red point (2, 5).', show: [x => 3 * x + 1], pts: [[2, 5]], check: f => Math.abs(f(2) - 5) < 1e-6 && Math.abs(f(1) - f(0) - 3) < 1e-6 && Math.abs(f(4) - f(3) - 3) < 1e-6, hint: 'Parallel means the same gradient, 3. Then choose c so that 3 × 2 + c = 5.', sol: 'y = 3x − 1' },
    { id: 'seq', n: 'Sequence detective', task: 'The sequence 3, 7, 11, 15, 19, … continues forever. Type a formula for the n-th term (use n).', vars: ['n'], seq: [3, 7, 11, 15, 19], check: f => [1, 2, 3, 4, 5, 10].every(n => Math.abs(f(n) - (4 * n - 1)) < 1e-9), hint: 'It goes up by 4 each time, so it is 4n + something. Check n = 1.', sol: '4n − 1' }
  ];
  D['math-missions'] = { wide: true,
    intro: 'Six missions where you **build** the answer instead of choosing it: reconstruct hidden functions, make graphs that satisfy conditions, crack a sequence. Every attempt is drawn on top of the target, and the feedback tells you exactly which condition is met and which is not.',
    predict: { q: 'A parabola goes through (−1, 0) and (3, 0). Its axis of symmetry must be…', options: ['x = 0', 'x = 1', 'x = 2', 'it depends on the third point'] },
    explore: 'Work through the missions in any order. Use **Hint** if you are stuck — the solution only appears after you ask twice.',
    explain: 'Building a function from conditions uses the links between forms: **roots** give factors (x − r), a **repeated root** gives a squared factor and a graph that only touches the axis, a **vertex** gives (x − h)² + k, **parallel lines** share a gradient, and an **arithmetic sequence** with common difference d has n-th term **dn + (first term − d)**. The checks here evaluate your function at several points, so any equivalent form passes.',
    apply: [q('x-mm1', 'The n-th term of 5, 8, 11, 14, … is…', ['3n + 2', '5n', 'n + 3', '3n + 5'], 0, 'Difference 3, so 3n + c; n = 1 gives 3 + c = 5 → c = 2.'), q('x-mm2', 'A parabola has roots 1 and 5. Its axis of symmetry is…', ['x = 1', 'x = 3', 'x = 5', 'x = 6'], 1, 'Halfway between the roots: (1 + 5)/2 = 3.')],
    summary: ['Roots ↔ factors; a repeated root ↔ touching the axis.', 'Parallel lines have equal gradients.', 'Arithmetic sequences: n-th term = dn + (a₁ − d).'],
    connect: [{ label: 'Function forge', href: '#/exp/function-forge' }, { label: 'Quadratic lab', href: '#/exp/quad-lab' }],
    build(host, c) {
      host.innerHTML = `<div class="v26-ws mm"><div class="v26-bar" role="tablist" aria-label="${T('Missions', 'المهمات')}">${MISSIONS.map((m, i) => `<button type="button" class="v26-tool" role="tab" data-m="${i}" aria-selected="${i === 0}">${i + 1}. ${esc(m.n)} <span class="mm__ok" data-ok="${m.id}" aria-hidden="true"></span></button>`).join('')}</div><p class="mm__task" style="font-size:1.05rem"></p><form class="v26-bar mm__form"><label class="mm__lab"></label><input class="ls-input mm__in" style="flex:1;min-width:180px;font-family:var(--f-mono,ui-monospace)" autocomplete="off" spellcheck="false"><button class="v26-tool" type="submit">${T('Check', 'تحقق')}</button><button type="button" class="v26-tool" data-hint>${T('Hint', 'تلميح')}</button></form><p class="mm__fb" role="status" aria-live="polite"></p></div>`;
      const ws = host.querySelector('.mm'), S = K.stage(ws, 900, 480, 'mm__stage'); S.cv.setAttribute('role', 'img'); ws.appendChild(S.wrap);
      let mi = 0, attempt = null, hints = 0; const done = new Set();
      function draw() {
        const m = MISSIONS[mi], G = S.g, Pl = K.pal(); S.clear(Pl.bg);
        if (m.seq) { const A = K.axes(G, [44, 14, 840, 440], [0, 8], [-2, 34], { xl: 'n', yl: 'term' }); m.seq.forEach((v, i) => { G.fillStyle = '#d0503b'; G.beginPath(); G.arc(A.X(i + 1), A.Y(v), 6, 0, 7); G.fill(); }); if (attempt) for (let n = 1; n <= 8; n++) { const v = attempt(n); if (isFinite(v)) { G.strokeStyle = COLS[0]; G.lineWidth = 2.5; G.beginPath(); G.arc(A.X(n), A.Y(v), 9, 0, 7); G.stroke(); } } return; }
        const A = K.axes(G, [44, 14, 840, 440], [-5, 7], [-6, 10], { xl: 'x', yl: 'y' });
        (m.show || []).forEach(f => K.plot(G, A, f, -5, 7, '#7aa7ff', 3));
        if (attempt) K.plot(G, A, attempt, -5, 7, COLS[1], 2.6);
        (m.pts || []).forEach(([x, y]) => { G.fillStyle = '#d0503b'; G.beginPath(); G.arc(A.X(x), A.Y(y), 6, 0, 7); G.fill(); K.text(G, `(${x}, ${y})`, A.X(x) + 8, A.Y(y) - 8, { s: 12, w: 700 }); });
        S.cv.setAttribute('aria-label', m.task);
      }
      function open(i) { mi = i; attempt = null; hints = 0; const m = MISSIONS[i]; ws.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.m === i))); ws.querySelector('.mm__task').textContent = m.task; ws.querySelector('.mm__lab').textContent = m.vars ? 'term(n) =' : 'y ='; ws.querySelector('.mm__in').value = ''; ws.querySelector('.mm__fb').textContent = ''; draw(); }
      function check() {
        const m = MISSIONS[mi], src = ws.querySelector('.mm__in').value, fb = ws.querySelector('.mm__fb');
        try { const vars = m.vars || ['x']; const g = K.expr(src.replace(/^\s*(y|term\(n\))\s*=\s*/i, '').replace(/[−–]/g, '-').replace(/×/g, '*'), vars); attempt = v => g({ [vars[0]]: v }); attempt(1.3); } catch (e) { attempt = null; fb.innerHTML = IL(T('I could not read that: ', 'تعذّر قراءتها: ') + e.message); draw(); return; }
        draw(); const ok = m.check(attempt);
        let why = ''; if (!ok && m.pts) why = ' ' + m.pts.map(([x, y]) => `x = ${x}: ${T('yours gives', 'دالتك تعطي')} ${num(attempt(x))} ${Math.abs(attempt(x) - y) < 1e-6 ? '✓' : `(${T('needs', 'المطلوب')} ${y})`}`).join(' · ');
        if (!ok && m.seq) why = ' ' + m.seq.map((v, i) => `n = ${i + 1}: ${num(attempt(i + 1))}${Math.abs(attempt(i + 1) - v) < 1e-9 ? ' ✓' : ` (${T('needs', 'المطلوب')} ${v})`}`).join(' · ');
        if (!ok && m.id === 'touch') why = ` f(2) = ${num(attempt(2))}${Math.abs(attempt(2)) < 1e-6 ? ' ✓' : ''}; ${T('opens downwards', 'يفتح لأسفل')}: ${attempt(1) < 0 && attempt(3) < 0 ? '✓' : '✗'}; ${T('flat at x = 2', 'مماس عند 2')}: ${Math.abs((attempt(2 + 1e-4) - attempt(2 - 1e-4)) / 2e-4) < 1e-3 ? '✓' : '✗'}`;
        if (ok) { done.add(m.id); ws.querySelector(`[data-ok="${m.id}"]`).textContent = '✓'; }
        fb.innerHTML = IL(ok ? T('**Mission complete.** Your function meets every condition.', '**أنجزت المهمة.**') : T('**Not yet.**', '**ليس بعد.**') + why);
        return ok;
      }
      ws.querySelector('.mm__form').addEventListener('submit', e => { e.preventDefault(); check(); });
      ws.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) open(+b.dataset.m); if (e.target.closest('[data-hint]')) { hints++; const m = MISSIONS[mi]; ws.querySelector('.mm__fb').innerHTML = IL(hints === 1 ? '💡 ' + m.hint : '💡 ' + m.hint + ' ' + T('One answer: ', 'إجابة ممكنة: ') + '**' + m.sol + '**'); } });
      S.onresize = () => draw();
      open(0);
      return { play() {}, pause() {}, running: () => false, destroy() { S.destroy(); }, reset() { done.clear(); ws.querySelectorAll('[data-ok]').forEach(s => { s.textContent = ''; }); open(0); }, preset() {},
        _try: (i, src) => { open(i); ws.querySelector('.mm__in').value = src; return check(); },
        observe() { return { text: `Missions completed: **${done.size} of ${MISSIONS.length}**${done.size ? ` (${MISSIONS.filter(m => done.has(m.id)).map(m => m.n).join(', ')})` : ''}.`, predOk: i => i === 1 }; } };
    }
  };

  /* ======================= PROBABILITY LAB ======================= */
  const rnd = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; };
  const EXPS = {
    coin: { n: 'Coin', out: ['Heads', 'Tails'], p: () => [0.5, 0.5], draw: () => (rnd() < 0.5 ? 0 : 1) },
    die: { n: 'Die', out: ['1', '2', '3', '4', '5', '6'], p: () => Array(6).fill(1 / 6), draw: () => Math.floor(rnd() * 6) },
    two: { n: 'Two dice (sum)', out: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], p: () => [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map(k => k / 36), draw: () => Math.floor(rnd() * 6) + Math.floor(rnd() * 6) },
    spin: { n: 'Spinner', out: ['Red', 'Blue', 'Gold'], p: w => { const s = w.reduce((a, b) => a + b, 0); return w.map(x => x / s); }, draw: w => { const s = w.reduce((a, b) => a + b, 0); let r = rnd() * s; for (let i = 0; i < w.length; i++) { if (r < w[i]) return i; r -= w[i]; } return w.length - 1; } },
    card: { n: 'Card (suit)', out: ['♠ Spades', '♥ Hearts', '♦ Diamonds', '♣ Clubs'], p: () => [0.25, 0.25, 0.25, 0.25], draw: () => Math.floor(rnd() * 52) % 4 }
  };
  D['prob-lab'] = { wide: true,
    intro: 'Run real random experiments — coins, dice, a spinner you design, cards from a shuffled deck — and watch **experimental** frequencies chase the **theoretical** probabilities as the number of trials grows. The random numbers come from your browser’s cryptographic generator; nothing is pre-made.',
    predict: { q: 'You roll two dice 1000 times. The most common total will be…', options: ['2 or 12', '6', '7', 'all totals are equally common'] },
    explore: '- Roll **two dice** 10 times, then 1000. Look at the grid of 36 outcomes: why is 7 the most likely?\n- Make the spinner **unfair** (gold twice as big) and predict the result before running 1000 spins.\n- Watch the **convergence** graph: does the relative frequency settle down? Does it ever hit the theory exactly?',
    explain: 'The **theoretical probability** of an outcome is (favourable outcomes) ÷ (equally likely outcomes): for two dice there are 36 ordered outcomes and 6 of them total 7, so P(7) = 6/36 = 1/6. The **relative frequency** from an experiment wanders at first but, by the **law of large numbers**, settles closer to the theoretical value as the number of trials grows — typically the error shrinks like 1/√(trials). It is still random: short runs can look very unfair.',
    apply: [q('x-prl1', 'P(total = 7) with two fair dice is…', ['1/12', '1/6', '7/36', '1/11'], 1, '6 of the 36 outcomes total 7: 6/36 = 1/6.'), q('x-prl2', 'A spinner is 2 parts red, 1 part blue. P(blue) is…', ['1/2', '1/3', '2/3', '1/4'], 1, '1 part out of 3 equal parts: 1/3.')],
    summary: ['Theoretical P = favourable ÷ equally likely outcomes.', 'Relative frequency → theoretical P as trials grow.', 'Short runs vary a lot; that is chance, not unfairness.'],
    connect: [{ label: 'Probability lab (two dice)', href: '#/exp/probability' }, { label: 'Statistics visualizer', href: '#/exp/stats' }],
    build(host, c) {
      host.innerHTML = `<div class="v26-ws pl"><div class="v26-bar" role="radiogroup" aria-label="${T('Experiment', 'التجربة')}">${Object.entries(EXPS).map(([k, e]) => `<button type="button" class="v26-tool" role="radio" data-ex="${k}" aria-checked="${k === 'two'}">${e.n}</button>`).join('')}</div>
        <div class="v26-bar pl__spin" hidden>${['Red', 'Blue', 'Gold'].map((n, i) => `<label class="kx-range" style="min-width:160px"><span class="kx-range__t">${n} <output>1</output></span><input type="range" min="0" max="5" step="1" value="1" data-w="${i}" aria-label="${n} size"></label>`).join('')}</div>
        <div class="v26-bar">${[1, 10, 100, 1000].map(n => `<button type="button" class="v26-tool${n === 1 ? '' : ''}" data-run="${n}">${T('Run', 'شغّل')} ${n}</button>`).join('')}<button type="button" class="v26-tool" data-run="0">${T('Reset', 'إعادة')}</button><span class="v26-hint pl__last" aria-live="polite"></span></div></div>`;
      const ws = host.querySelector('.pl'), S = K.stage(ws, 900, 300, 'pl__h'), C = K.stage(ws, 900, 200, 'pl__c');
      const tab = document.createElement('div'); tab.className = 'v26-grid2'; tab.innerHTML = `<div class="v26-card"><h3>${T('Results', 'النتائج')}</h3><div class="v26-out pl__tab"></div></div><div class="v26-card pl__extra"></div>`; ws.appendChild(tab);
      let ex = 'two', w = [1, 1, 1], counts = [], N = 0, hist = [], focus = 5, last = null;
      const reset = () => { counts = Array(EXPS[ex].out.length).fill(0); N = 0; hist = []; last = null; focus = ex === 'two' ? 5 : 0; paint(); };
      function run(n) { const E = EXPS[ex]; for (let i = 0; i < n; i++) { const k = E.draw(w); counts[k]++; N++; last = k; if (N <= 50 || N % Math.ceil(N / 200) === 0) hist.push([N, counts[focus] / N]); } paint(); }
      function paint() {
        const E = EXPS[ex], th = E.p(w), G = S.g, Pl = K.pal(); S.clear(Pl.bg); const n = E.out.length, bw = 820 / n;
        const top = Math.max(...th, ...counts.map(c2 => (N ? c2 / N : 0)), 0.05) * 1.15;
        E.out.forEach((o, i) => { const x = 50 + i * bw, h1 = th[i] / top * 240, h2 = N ? counts[i] / N / top * 240 : 0;
          G.fillStyle = 'rgba(122,167,255,.35)'; G.fillRect(x + bw * 0.12, 265 - h1, bw * 0.36, h1); G.fillStyle = i === focus ? '#d0503b' : '#2f6fe0'; G.fillRect(x + bw * 0.52, 265 - h2, bw * 0.36, h2);
          K.text(G, o, x + bw / 2, 288, { a: 'center', s: 12, w: 600 }); });
        K.text(G, T('light: theoretical · solid: your experiment (relative frequency)', 'فاتح: نظري · داكن: تجربتك'), 50, 18, { s: 12, c: Pl.muted });
        // convergence of the focused outcome
        const g2 = C.g; C.clear(Pl.bg); const A = K.axes(g2, [50, 10, 820, 160], [1, Math.max(10, N)], [0, Math.min(1, Math.max(th[focus] * 2.2, 0.3))], { xl: T('trials', 'المحاولات') });
        g2.strokeStyle = 'rgba(122,167,255,.9)'; g2.setLineDash([6, 4]); g2.beginPath(); g2.moveTo(A.X(1), A.Y(th[focus])); g2.lineTo(A.X(Math.max(10, N)), A.Y(th[focus])); g2.stroke(); g2.setLineDash([]);
        g2.strokeStyle = '#d0503b'; g2.lineWidth = 2; g2.beginPath(); hist.forEach(([t, v], i) => { if (i) g2.lineTo(A.X(t), A.Y(v)); else g2.moveTo(A.X(t), A.Y(v)); }); g2.stroke();
        K.text(g2, `${T('relative frequency of', 'التكرار النسبي لـ')} “${E.out[focus]}” ${T('vs trials (dashed: theory)', 'مقابل المحاولات')}`, 60, 196, { s: 12, c: Pl.muted });
        const maxErr = N ? Math.max(...counts.map((c2, i) => Math.abs(c2 / N - th[i]))) : 0;
        ws.querySelector('.pl__tab').innerHTML = `<table><tr><th>${T('Outcome', 'النتيجة')}</th><th>${T('count', 'العدد')}</th><th>${T('experimental', 'تجريبي')}</th><th>${T('theoretical', 'نظري')}</th></tr>${E.out.map((o, i) => `<tr${i === focus ? ' style="font-weight:700"' : ''}><td><button type="button" class="v26-tool" style="min-height:0;padding:2px 8px" data-focus="${i}">${esc(o)}</button></td><td>${counts[i]}</td><td>${N ? f2(counts[i] / N, 3) : '—'}</td><td>${f2(th[i], 3)}</td></tr>`).join('')}</table><p>${T('Trials', 'المحاولات')}: <b>${N}</b> · ${T('largest gap from theory', 'أكبر فرق عن النظري')}: <b>${N ? f2(maxErr, 3) : '—'}</b>${N ? ` (≈ 1/√N = ${f2(1 / Math.sqrt(N), 3)})` : ''}</p>`;
        ws.querySelector('.pl__last').textContent = last != null ? T('Last result: ', 'آخر نتيجة: ') + E.out[last] : '';
        const xtra = ws.querySelector('.pl__extra');
        if (ex === 'two') xtra.innerHTML = `<h3>${T('All 36 equally likely outcomes', 'النتائج الـ 36')}</h3><table style="text-align:center">${[1, 2, 3, 4, 5, 6].map(a => `<tr>${[1, 2, 3, 4, 5, 6].map(b => `<td style="width:30px;padding:3px;border-radius:6px;${a + b === focus + 2 ? 'background:#d0503b;color:#fff;font-weight:700' : ''}">${a + b}</td>`).join('')}</tr>`).join('')}</table><p class="v26-hint">${T('Highlighted: the outcomes that make', 'المميز: النتائج التي تعطي')} ${focus + 2} — ${[1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1][focus]} ${T('of 36', 'من 36')}.</p>`;
        else xtra.innerHTML = `<h3>${T('Why these probabilities?', 'لماذا هذه الاحتمالات؟')}</h3><p>${ex === 'spin' ? T(`The spinner is split into ${w.reduce((a, b) => a + b, 0)} equal parts: ${w.map((x, i) => `${['red', 'blue', 'gold'][i]} ${x}`).join(', ')}.`, 'أجزاء متساوية') : ex === 'card' ? T('A full deck has 13 cards of each of the 4 suits: 13/52 = 1/4 each.', '13 من 52') : ex === 'die' ? T('Six faces, each equally likely: 1/6.', 'ستة أوجه') : T('Two faces, each equally likely: 1/2.', 'وجهان')}</p>`;
      }
      ws.addEventListener('click', e => { const b = e.target.closest('[data-ex]'); if (b) { ex = b.dataset.ex; ws.querySelectorAll('[data-ex]').forEach(x => x.setAttribute('aria-checked', String(x === b))); ws.querySelector('.pl__spin').hidden = ex !== 'spin'; reset(); } const r = e.target.closest('[data-run]'); if (r) { if (+r.dataset.run === 0) reset(); else run(+r.dataset.run); } const fo = e.target.closest('[data-focus]'); if (fo) { focus = +fo.dataset.focus; hist = []; paint(); } });
      ws.addEventListener('input', e => { const wi = e.target.dataset.w; if (wi != null) { w[+wi] = +e.target.value; e.target.previousElementSibling.querySelector('output').textContent = e.target.value; if (w.every(x => x === 0)) { w[+wi] = 1; e.target.value = 1; } reset(); } });
      S.onresize = C.onresize = () => paint();
      reset();
      return { play() { run(100); }, pause() {}, running: () => false, destroy() { S.destroy(); C.destroy(); }, reset() { ex = 'two'; reset(); }, preset() { ex = 'two'; reset(); },
        _run: (k, n) => { ex = k; reset(); run(n); return { counts: counts.slice(), N, th: EXPS[k].p(w) }; },
        observe() { const E = EXPS[ex], th = E.p(w); return { text: N ? `${E.n}: after **${N}** trials, “${E.out[focus]}” came up ${counts[focus]} times — relative frequency **${f2(counts[focus] / N, 3)}** against the theoretical **${f2(th[focus], 3)}**.` : 'Run some trials first.', predOk: i => (ex === 'two' && N >= 100 ? i === 2 : null) }; } };
    }
  };

  /* ======================= WATER CYCLE (rebuilt) ======================= */
  // A box model of the water cycle. Stocks (arbitrary units, total conserved exactly): ocean, vapour over sea and land,
  // cloud over sea and land, snow and ice, soil moisture, groundwater, river. Fluxes per simulated day follow simple,
  // named rules: evaporation rises with temperature (×2 about every 10 °C, the Clausius–Clapeyron rule of thumb) and with
  // sunshine; air holds more vapour when warm, and condenses the excess into cloud; wind carries cloud from sea to land;
  // cloud above a threshold rains (or snows on the mountain if its air is below 0 °C: the top is 18 °C colder than the coast, about 2.8 km at the standard 6.5 °C per km);
  // rain on land soaks in (infiltration, by the ground's permeability) or runs off into the river; plants transpire soil
  // water; groundwater seeps into the river; the river flows to the sea. The numbers are a teaching model — the
  // directions of change are right, the sizes are illustrative.
  D['water-cycle'] = { wide: true,
    intro: 'One planet, one supply of water, always on the move. The **sun** evaporates the ocean, the air **condenses** vapour into **clouds**, the **wind** carries them inland, they **rain** or **snow** on the mountain, and the water returns — over the land as **runoff** and **rivers**, or underground through **infiltration** and **groundwater** — while plants **transpire** water back into the air.\n\nChange the conditions and watch every flow respond. Select any part of the scene to learn what happens there, or **follow a droplet** on its journey.',
    predict: { q: 'The ground becomes much more paved (water cannot soak in). What happens to the river after rain?', options: ['it rises less', 'it rises more and faster', 'it dries up completely', 'nothing changes'] },
    explore: '- Warm the world by 10 °C. Which flows grow? What happens to the **snow** on the mountain?\n- Turn the **wind** to zero: where does the rain fall now?\n- Lower **permeability** (paved ground) and compare **runoff** with **infiltration**.\n- Remove the **forest**: how does transpiration change?\n- Press **Follow a droplet** and read its journey.',
    explain: 'The water cycle is a **closed system**: the total amount of water stays the same (watch the total in the stocks table) — it only changes **where it is** and **what state it is in**. The **sun** drives it: warmer water evaporates faster and warmer air holds more vapour, so a warmer world speeds up the whole cycle and turns snow to rain. **Wind** moves clouds inland; without it, rain falls back on the sea. On land, rain either **soaks in** (feeding soil, plants and groundwater, which then feeds rivers slowly) or **runs off** straight into rivers — which is why paved ground makes rivers rise faster and flood more. Plants return soil water to the air by **transpiration**.',
    apply: [q('x-wc1', 'Which process turns water vapour into cloud droplets?', ['evaporation', 'condensation', 'transpiration', 'infiltration'], 1, 'Condensation: vapour cools and becomes liquid droplets.'), q('x-wc2', 'A town paves over its fields. After a storm its river will…', ['rise more slowly', 'rise faster and higher', 'not change', 'dry up'], 1, 'Less infiltration, more runoff reaching the river quickly.'), q('x-wc3', 'Where does most evaporation on Earth happen?', ['from plants', 'from the oceans', 'from rivers', 'from snow'], 1, 'The oceans cover about 71 % of the surface and supply most evaporation.')],
    summary: ['The total amount of water is conserved; only its place and state change.', 'Sun → evaporation; cooling → condensation; clouds → precipitation.', 'Rain soaks in (infiltration) or runs off; groundwater feeds rivers slowly.', 'Warmer worlds speed up the cycle; paving increases runoff and flooding.'],
    connect: [{ label: 'Greenhouse balance', href: '#/exp/greenhouse' }, { label: 'Why seasons happen', href: '#/exp/seasons' }, { label: 'Into the leaf (transpiration)', href: '#/exp/leaf-dive' }],
    build(host, c) {
      const S = K.stage(host, 960, 560, 'wc__stage'); S.cv.tabIndex = 0; S.cv.setAttribute('role', 'img'); S.cv.setAttribute('aria-label', T('The water cycle: ocean, clouds, mountain, river, soil and groundwater. Select a part for an explanation.', 'دورة الماء'));
      const ctl = K.controls(host, [{ k: 'row' }, { k: 'range', id: 'T', label: T('Air temperature at the coast', 'الحرارة'), min: -5, max: 35, step: 1, val: 15, unit: ' °C' }, { k: 'range', id: 'sun', label: T('Sunshine', 'الشمس'), min: 0.3, max: 1.5, step: 0.05, val: 1, d: 2, unit: '×' }, { k: 'range', id: 'wind', label: T('Wind towards the land', 'الرياح'), min: 0, max: 2, step: 0.05, val: 1, d: 2, unit: '×' }, { k: 'end' }, { k: 'row' }, { k: 'range', id: 'veg', label: T('Forest cover', 'الغابات'), min: 0, max: 1, step: 0.05, val: 0.6, d: 2, fmt: v => Math.round(v * 100) + '%' }, { k: 'range', id: 'perm', label: T('Ground permeability (soaks in)', 'نفاذية التربة'), min: 0, max: 1, step: 0.05, val: 0.6, d: 2, fmt: v => Math.round(v * 100) + '%' }, { k: 'end' }, { k: 'row' }, { k: 'btn', id: 'drop', label: T('Follow a droplet', 'تتبّع قطرة'), accent: true }, { k: 'btn', id: 'storm', label: T('Send a storm inland', 'أرسل عاصفة') }, { k: 'end' }], (id, v) => { if (id === 'drop') follow(); else if (id === 'storm') { st.cl += 0.6 * st.cs; st.cs *= 0.4; } M.kick(); });
      const info = document.createElement('div'); info.className = 'v26-grid2'; info.innerHTML = `<div class="v26-card"><h3>${T('What is happening here', 'ماذا يحدث هنا')}</h3><div class="v26-out wc__info" aria-live="polite"></div></div><div class="v26-card"><h3>${T('Flows and stores (model units)', 'التدفقات والمخازن')}</h3><div class="v26-out wc__tab"></div></div>`; host.appendChild(info);
      const st = { o: 1000, vs: 6, vl: 3, cs: 4, cl: 3, snow: 20, soil: 30, gw: 60, riv: 8 }, TOTAL0 = Object.values(st).reduce((a, b) => a + b, 0);
      let F = {}, sim = true, tDay = 0, clouds = [], parts = [], drop = null, sel = null;
      for (let i = 0; i < 9; i++) clouds.push({ x: 40 + i * 110, y: 95 + (i % 3) * 28, r: 1, ph: i * 1.7 });
      const ff = T0 => Math.pow(2, (T0 - 15) / 10); // ×2 per 10 °C
      function step(dt) {
        const T0 = ctl.val.T, sun = ctl.val.sun, wind = ctl.val.wind, veg = ctl.val.veg, perm = ctl.val.perm, Tm = T0 - 18, cap = 8 * ff(T0);
        F.evap = 0.0012 * st.o * ff(T0) * sun; F.trans = 0.06 * st.soil * veg * ff(T0) * sun; F.evapL = 0.02 * st.soil * (1 - veg) * ff(T0) * sun;
        F.condS = Math.max(0, st.vs - cap * 0.6) * 0.8; F.condL = Math.max(0, st.vl - cap * 0.4) * 0.8;
        F.adv = 0.18 * wind * st.cs; F.advV = 0.1 * wind * st.vs;
        F.rainS = Math.max(0, st.cs - 2) * 0.35; const pl = Math.max(0, st.cl - 1.5) * 0.45; F.snowfall = Tm < 0 ? pl * 0.5 : 0; F.rainL = pl - F.snowfall;
        F.melt = Math.max(0, Tm) * 0.03 * st.snow; F.inf = F.rainL * perm + F.melt * perm * 0.5; F.run = F.rainL * (1 - perm) + F.melt * (1 - perm * 0.5);
        F.base = 0.03 * st.gw; F.recharge = 0.05 * st.soil * perm; F.flow = 0.25 * st.riv;
        const d = { o: F.rainS + F.flow - F.evap, vs: F.evap - F.condS - F.advV, vl: F.trans + F.evapL + F.advV - F.condL, cs: F.condS - F.adv - F.rainS, cl: F.condL + F.adv - F.rainL - F.snowfall, snow: F.snowfall - F.melt, soil: F.inf - F.trans - F.evapL - F.recharge, gw: F.recharge - F.base, riv: F.run + F.base - F.flow };
        const k = dt * 2; Object.keys(d).forEach(n => { st[n] = Math.max(0, st[n] + d[n] * k); });
        const tot = Object.values(st).reduce((a, b) => a + b, 0); st.o += TOTAL0 - tot; // keep the total exact (rounding at zero floors)
        tDay += k;
      }
      // the scene
      const SEA = 380, COAST = 400, ground = x => (x < COAST ? 430 : x < 520 ? 430 - (x - COAST) * 0.5 : x < 760 ? 370 - Math.sin((x - 520) / 240 * Math.PI) * 190 - (x - 520) * 0.1 : 340 + (x - 760) * 0.12);
      const ZONES = [['ocean', 0, 400, 380, 560], ['sky', 0, 960, 0, 200], ['mountain', 560, 760, 170, 360], ['forest', 420, 560, 330, 430], ['river', 760, 960, 340, 420], ['soil', 400, 960, 430, 500], ['ground', 400, 960, 500, 560], ['sun', 820, 960, 0, 100]];
      const INFO = {
        ocean: ['The ocean', 'Holds about 97 % of Earth’s water. The sun heats its surface and water **evaporates** — warmer water and stronger sunshine evaporate it faster. Salt stays behind, which is why rain is fresh water.'],
        sky: ['Water vapour and clouds', 'Rising vapour **cools**; cool air can hold less vapour, so the extra **condenses** onto tiny dust particles as cloud droplets. The **wind** carries clouds inland. When droplets merge and grow heavy enough, they fall as **precipitation**.'],
        mountain: ['Mountains, snow and ice', 'Air cools as it rises over mountains (about 6.5 °C per kilometre), so clouds rain on the windward side. Here, about 2.8 km up, it is **18 °C colder than the coast**: below 0 °C precipitation falls as **snow**, which is stored and later **melts** into streams.'],
        forest: ['Plants and transpiration', 'Roots take up soil water and leaves release it as vapour through their stomata: **transpiration**. Forests return a large share of rain to the air and also help rain **soak in** rather than run off.'],
        river: ['Runoff and rivers', 'Rain that cannot soak in **runs off** over the surface into streams and rivers, which carry it back to the sea. **Groundwater** seeps into rivers slowly, keeping them flowing between rains.'],
        soil: ['Infiltration and soil water', 'Rain **infiltrates** permeable ground and fills the spaces in the soil. Plants use some; some trickles down to **recharge** the groundwater. Paved or frozen ground lets little soak in.'],
        ground: ['Groundwater', 'Water stored in rock and gravel underground (an **aquifer**). It moves slowly — days to thousands of years — and feeds rivers, springs and wells.'],
        sun: ['The Sun', 'The energy source for the whole cycle: it evaporates water and drives the winds. More sunshine → more evaporation.']
      };
      function draw() {
        const G = S.g, T0 = ctl.val.T, P0 = K.pal(), night = 0;
        const sky = G.createLinearGradient(0, 0, 0, 430); sky.addColorStop(0, `hsl(${205 - (T0 - 15)}, 70%, ${52 + ctl.val.sun * 8}%)`); sky.addColorStop(1, `hsl(${200 - (T0 - 15) * 0.5}, 60%, ${82}%)`); G.fillStyle = sky; G.fillRect(0, 0, 960, 560);
        const sg = G.createRadialGradient(890, 55, 6, 890, 55, 70 * ctl.val.sun); sg.addColorStop(0, '#fff7d0'); sg.addColorStop(0.35, '#ffd86a'); sg.addColorStop(1, 'rgba(255,200,90,0)'); G.fillStyle = sg; G.beginPath(); G.arc(890, 55, 70 * ctl.val.sun, 0, 7); G.fill();
        // ocean with moving waves
        const og = G.createLinearGradient(0, SEA, 0, 560); og.addColorStop(0, '#2f7fc4'); og.addColorStop(1, '#0d3f73'); G.fillStyle = og; G.beginPath(); G.moveTo(0, SEA); for (let x = 0; x <= COAST + 4; x += 8) G.lineTo(x, SEA + Math.sin(x / 26 + tDay * 3) * 3); G.lineTo(COAST + 4, 560); G.lineTo(0, 560); G.fill();
        G.strokeStyle = 'rgba(255,255,255,.35)'; G.lineWidth = 1.4; for (let r = 0; r < 3; r++) { G.beginPath(); for (let x = 0; x <= COAST; x += 8) { const y = SEA + 16 + r * 22 + Math.sin(x / 30 + tDay * 2 + r) * 2.5; if (x) G.lineTo(x, y); else G.moveTo(x, y); } G.stroke(); }
        // land, soil and groundwater cross-section
        G.fillStyle = '#6b8f3e'; G.beginPath(); G.moveTo(COAST, 560); for (let x = COAST; x <= 960; x += 6) G.lineTo(x, ground(x)); G.lineTo(960, 560); G.fill();
        G.fillStyle = '#7b5a3a'; G.beginPath(); G.moveTo(COAST, 560); for (let x = COAST; x <= 960; x += 6) G.lineTo(x, Math.max(ground(x) + 14, 445)); G.lineTo(960, 560); G.fill();
        const gwTop = 560 - Math.min(110, st.gw * 0.9); G.fillStyle = 'rgba(70,140,220,.55)'; G.fillRect(COAST, gwTop, 560, 560 - gwTop); G.fillStyle = 'rgba(255,255,255,.75)'; G.font = '600 11px ui-sans-serif'; G.fillText(T('groundwater', 'المياه الجوفية'), 830, 552);
        // snow cap
        const snowH = Math.min(100, st.snow * 1.1); if (snowH > 2) { G.fillStyle = '#f5f8ff'; G.beginPath(); for (let x = 520; x <= 760; x += 4) { const y = ground(x); if (y < 180 + 190 - snowH) G.lineTo(x, y); } G.closePath(); G.fill(); }
        // forest
        const nT = Math.round(ctl.val.veg * 14); for (let i = 0; i < nT; i++) { const x = 420 + i * 10 + (i % 2) * 3, y = ground(x); G.fillStyle = '#2f6b2f'; G.beginPath(); G.moveTo(x, y - 30); G.lineTo(x - 9, y); G.lineTo(x + 9, y); G.fill(); G.fillStyle = '#5b3b22'; G.fillRect(x - 1.5, y - 2, 3, 6); }
        // river from the mountain foot to the sea (width by flow)
        const rw = 2 + Math.min(10, st.riv * 0.5); G.strokeStyle = '#3d8fe0'; G.lineWidth = rw; G.lineCap = 'round'; G.lineJoin = 'round'; G.beginPath(); for (let x = 590; x >= COAST - 4; x -= 6) { const y = (x < COAST ? SEA + 2 : ground(x)) - rw / 2 + Math.sin(x / 23) * 1.5; if (x === 590) G.moveTo(x, y); else G.lineTo(x, y); } G.stroke(); // the river runs down the seaward flank, below the snow, to the sea
        // clouds: size from cloud water, drifting with the wind; rain/snow from them
        const nS = Math.min(1, st.cs / 10), nL = Math.min(1.2, st.cl / 8);
        clouds.forEach((cl, i) => { const overLand = cl.x > COAST; const sz = 0.5 + (overLand ? nL : nS) * 1.1; cl.r += (sz - cl.r) * 0.05; const x = cl.x, y = cl.y, r = 30 * cl.r; if (r < 6) return; G.fillStyle = `rgba(255,255,255,${0.75 - Math.min(0.35, (overLand ? nL : nS) * 0.3)})`; [[0, 0, 1], [-1, 0.3, 0.75], [1, 0.3, 0.8], [0.4, -0.4, 0.7]].forEach(([dx, dy, s]) => { G.beginPath(); G.arc(x + dx * r, y + dy * r, r * s, 0, 7); G.fill(); }); G.fillStyle = `rgba(120,130,150,${Math.min(0.35, (overLand ? nL : nS) * 0.3)})`; G.beginPath(); G.arc(x, y + r * 0.4, r * 0.8, 0, 7); G.fill(); });
        parts.forEach(p => { G.fillStyle = p.c; if (p.k === 'rain') G.fillRect(p.x, p.y, 1.4, 7); else if (p.k === 'snow') { G.beginPath(); G.arc(p.x, p.y, 1.8, 0, 7); G.fill(); } else { G.globalAlpha = p.a; G.beginPath(); G.arc(p.x, p.y, 1.6, 0, 7); G.fill(); G.globalAlpha = 1; } });
        if (drop) { G.fillStyle = '#ff3b6b'; G.strokeStyle = '#fff'; G.lineWidth = 2; G.beginPath(); G.arc(drop.x, drop.y, 6, 0, 7); G.fill(); G.stroke(); }
        if (sel) { const z = ZONES.find(zz => zz[0] === sel); if (z) { G.strokeStyle = 'rgba(255,255,255,.9)'; G.setLineDash([6, 5]); G.lineWidth = 2; G.strokeRect(z[1] + 2, z[3] + 2, z[2] - z[1] - 4, z[4] - z[3] - 4); G.setLineDash([]); } }
        // labels
        G.fillStyle = 'rgba(255,255,255,.9)'; G.font = '700 12px ui-sans-serif'; G.fillText(`${T('Coast', 'الساحل')} ${ctl.val.T} °C · ${T('mountain top', 'قمة الجبل')} ${ctl.val.T - 18} °C`, 14, 22); G.fillText(`${T('Day', 'اليوم')} ${Math.floor(tDay)}`, 14, 40);
      }
      function particles(dt) {
        const em = (rate, k, x0, x1, y0, c2) => { let n = rate * dt * 3; while (n > 0 && parts.length < 420) { if (n < 1 && Math.random() > n) break; n--; const x = x0 + Math.random() * (x1 - x0); parts.push({ k, x, y: y0(x), vy: k === 'rain' ? 260 : k === 'snow' ? 50 : -38, vx: k === 'vap' || k === 'tr' ? 6 * ctl.val.wind : 10 * ctl.val.wind, c: c2, a: 0.7 }); } };
        em(F.evap, 'vap', 10, COAST - 10, () => SEA - 2, 'rgba(255,255,255,.9)'); em(F.trans * 2, 'tr', 420, 560, x => ground(x) - 28, 'rgba(210,255,210,.9)');
        clouds.forEach(cl => { if (cl.r < 0.8) return; const land = cl.x > COAST, rate = land ? (F.rainL + F.snowfall) / 6 : F.rainS / 6; const snowy = land && cl.x > 540 && cl.x < 780 && ctl.val.T - 18 < 0; em(rate, snowy ? 'snow' : 'rain', cl.x - 16, cl.x + 16, () => cl.y + 12, snowy ? '#fff' : 'rgba(90,150,230,.85)'); });
        parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'vap' || p.k === 'tr') { p.a -= dt * 0.25; if (p.y < 110 || p.a <= 0) p.dead = true; } else { const gy = p.x < COAST ? SEA : ground(p.x); if (p.y > gy) p.dead = true; } if (p.x > 965) p.dead = true; });
        parts = parts.filter(p => !p.dead);
        clouds.forEach(cl => { cl.x += (8 + 22 * ctl.val.wind) * dt; if (cl.x > 1010) { cl.x = -50; } });
      }
      // follow a single droplet: each step chosen in proportion to the real flows out of where it is
      const ROUTE = { o: [['evap', 'vs', 'evaporates from the ocean surface']], vs: [['condS', 'cs', 'condenses into a cloud over the sea'], ['advV', 'vl', 'is blown inland as vapour']], vl: [['condL', 'cl', 'condenses into a cloud over the land']], cs: [['rainS', 'o', 'falls as rain back into the sea'], ['adv', 'cl', 'is carried inland by the wind']], cl: [['rainL', 'land', 'falls as rain on the land'], ['snowfall', 'snow', 'falls as snow on the mountain']], snow: [['melt', 'land', 'melts in the warm season']], land: [['inf', 'soil', 'soaks into the soil (infiltration)'], ['run', 'riv', 'runs off into the river']], soil: [['trans', 'vl', 'is drawn up by a tree and transpired'], ['recharge', 'gw', 'trickles down to the groundwater'], ['evapL', 'vl', 'evaporates from the ground']], gw: [['base', 'riv', 'seeps slowly into the river']], riv: [['flow', 'o', 'flows back to the sea']] };
      const POS = { o: [200, 420], vs: [200, 200], vl: [600, 220], cs: [220, 95], cl: [640, 95], snow: [650, 220], land: [620, 380], soil: [700, 460], gw: [700, 530], riv: [560, 448] };
      function follow() { drop = { at: 'o', x: POS.o[0], y: POS.o[1], log: [T('A droplet starts in the ocean.', 'تبدأ القطرة في المحيط.')], n: 0 }; show(); }
      let dropT = 0;
      function moveDrop(dt) { if (!drop) return; const [tx, ty] = POS[drop.at]; drop.x += (tx - drop.x) * Math.min(1, dt * 3); drop.y += (ty - drop.y) * Math.min(1, dt * 3); dropT += dt; if (dropT < 1.6 || drop.n > 14) return; dropT = 0;
        const opts = ROUTE[drop.at].map(([f, to, txt]) => [Math.max(0, F[f] || 0), to, txt]), tot = opts.reduce((s, o) => s + o[0], 0); if (tot <= 0) return; let r = Math.random() * tot, pick = opts[0]; for (const o of opts) { if (r < o[0]) { pick = o; break; } r -= o[0]; }
        drop.at = pick[1]; drop.n++; drop.log.push(T('It ', 'إنها ') + pick[2] + '.'); show(); }
      function show() { const box = host.querySelector('.wc__info'); if (drop) box.innerHTML = `<p><b>${T('Droplet journey', 'رحلة القطرة')}</b></p><ol>${drop.log.slice(-8).map(l => `<li>${esc(l)}</li>`).join('')}</ol>${drop.n > 14 ? `<p class="v26-hint">${T('That is 15 steps — press Follow again for a new droplet.', 'خمس عشرة خطوة.')}</p>` : ''}`; else if (sel) { const [h, b] = INFO[sel]; box.innerHTML = `<p><b>${esc(h)}</b></p>${LS.md(b)}`; } else box.innerHTML = `<p class="v26-hint">${T('Select a part of the scene — the ocean, sky, mountain, forest, river, soil or groundwater.', 'اختر جزءاً من المشهد.')}</p>`; }
      function table() { const r = (n, v) => `<tr><td>${n}</td><td>${f2(v, 2)}</td></tr>`; host.querySelector('.wc__tab').innerHTML = `<table><tr><th>${T('Flow per day', 'التدفق اليومي')}</th><th></th></tr>${r(T('Evaporation (ocean)', 'التبخر'), F.evap)}${r(T('Transpiration', 'النتح'), F.trans)}${r(T('Condensation', 'التكثف'), F.condS + F.condL)}${r(T('Rain on sea', 'مطر على البحر'), F.rainS)}${r(T('Rain on land', 'مطر على اليابسة'), F.rainL)}${r(T('Snowfall', 'تساقط الثلج'), F.snowfall)}${r(T('Snowmelt', 'ذوبان الثلج'), F.melt)}${r(T('Infiltration', 'التسرب'), F.inf)}${r(T('Runoff', 'الجريان السطحي'), F.run)}${r(T('River to sea', 'النهر إلى البحر'), F.flow)}</table><p>${T('Stores', 'المخازن')}: ${T('snow', 'ثلج')} ${f2(st.snow, 1)} · ${T('soil', 'تربة')} ${f2(st.soil, 1)} · ${T('groundwater', 'جوفية')} ${f2(st.gw, 1)} · ${T('river', 'نهر')} ${f2(st.riv, 1)} · ${T('clouds', 'غيوم')} ${f2(st.cs + st.cl, 1)}<br>${T('Total water', 'إجمالي الماء')}: <b>${f2(Object.values(st).reduce((a, b) => a + b, 0), 2)}</b> (${T('always', 'دائماً')} ${f2(TOTAL0, 2)})</p>`; }
      let tT = 0;
      const M = K.motor(c, host, (dt, running) => { if (running) { const h = Math.min(dt, 0.05); step(h); if (!K.reduced()) particles(h); moveDrop(h); tT += h; if (tT > 0.4) { tT = 0; table(); } } draw(); });
      S.cv.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = S.pt(e); const z = ZONES.slice().reverse().find(([, x0, x1, y0, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1); sel = z ? z[0] : null; drop = null; show(); M.draw(); });
      S.cv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const order = ZONES.map(z => z[0]); sel = order[(order.indexOf(sel) + 1) % order.length]; drop = null; show(); M.draw(); } });
      for (let i = 0; i < 200; i++) step(0.05); // settle the model before the student sees it
      show(); table(); M.play();
      return { play() { sim = true; M.play(); }, pause() { sim = false; M.pause(); }, running: () => M.playing(), destroy() { M.pause(); S.destroy(); },
        reset() { ctl.reset(); Object.assign(st, { o: 1000, vs: 6, vl: 3, cs: 4, cl: 3, snow: 20, soil: 30, gw: 60, riv: 8 }); drop = null; sel = null; parts = []; for (let i = 0; i < 200; i++) step(0.05); show(); table(); M.play(); },
        _sim: (set, days) => { Object.entries(set).forEach(([k, v]) => ctl.set(k, v)); for (let i = 0; i < days * 10; i++) step(0.05); table(); return { F: Object.assign({}, F), st: Object.assign({}, st), total: Object.values(st).reduce((a, b) => a + b, 0), total0: TOTAL0 }; },
        observe() { return { text: `At ${ctl.val.T} °C with ${Math.round(ctl.val.perm * 100)} % permeable ground: evaporation **${f2(F.evap)}**, rain on land **${f2(F.rainL)}**, runoff **${f2(F.run)}** vs infiltration **${f2(F.inf)}**, snow store **${f2(st.snow, 1)}**. Total water: **${f2(Object.values(st).reduce((a, b) => a + b, 0))}** — conserved.`, predOk: i => (ctl.val.perm < 0.3 ? i === 1 : null) }; }
      };
    }
  };

  /* ======================= REACTION LAB ======================= */
  const AT = { H: ['#f2f2f2', 7], C: ['#333', 10], N: ['#3050f8', 10], O: ['#e8322a', 10], Na: ['#ab5cf2', 12], Cl: ['#1fbf1f', 12], Zn: ['#7d80b0', 12], Fe: ['#e06633', 12], Ag: ['#c0c0c0', 12] };
  const parseF = f => { const out = {}; f.replace(/([A-Z][a-z]?)(\d*)/g, (m, e, n) => { out[e] = (out[e] || 0) + (n ? +n : 1); }); return out; };
  const RX = [
    { n: 'Hydrogen + oxygen → water', L: ['H2', 'O2'], R: ['H2O'], k: [2, 1, 2], type: 'Synthesis (combination)', e: 'Strongly exothermic — it is the reaction in hydrogen fuel cells and rocket engines.' },
    { n: 'Methane burns', L: ['CH4', 'O2'], R: ['CO2', 'H2O'], k: [1, 2, 1, 2], type: 'Combustion', e: 'Exothermic: natural gas burning in a cooker.' },
    { n: 'Making ammonia', L: ['N2', 'H2'], R: ['NH3'], k: [1, 3, 2], type: 'Synthesis (combination)', e: 'The Haber process; exothermic and reversible.' },
    { n: 'Hydrogen peroxide decomposes', L: ['H2O2'], R: ['H2O', 'O2'], k: [2, 2, 1], type: 'Decomposition', e: 'Exothermic; speeded up by a catalyst such as manganese dioxide.' },
    { n: 'Zinc and hydrochloric acid', L: ['Zn', 'HCl'], R: ['ZnCl2', 'H2'], k: [1, 2, 1, 1], type: 'Single displacement', e: 'Zinc displaces hydrogen; bubbles of hydrogen gas form.' },
    { n: 'Neutralisation', L: ['NaOH', 'HCl'], R: ['NaCl', 'H2O'], k: [1, 1, 1, 1], type: 'Double displacement (neutralisation)', e: 'Acid + base → salt + water; exothermic.' },
    { n: 'Propane burns', L: ['C3H8', 'O2'], R: ['CO2', 'H2O'], k: [1, 5, 3, 4], type: 'Combustion', e: 'Exothermic: camping-stove gas.' },
    { n: 'Iron rusts (simplified)', L: ['Fe', 'O2'], R: ['Fe2O3'], k: [4, 3, 2], type: 'Synthesis (oxidation)', e: 'Slow and exothermic; real rust is a hydrated oxide and needs water too.' },
    { n: 'Silver chloride precipitates', L: ['AgNO3', 'NaCl'], R: ['AgCl', 'NaNO3'], k: [1, 1, 1, 1], type: 'Double displacement (precipitation)', e: 'A white solid of silver chloride forms in the solution.' },
    { n: 'Respiration (glucose)', L: ['C6H12O6', 'O2'], R: ['CO2', 'H2O'], k: [1, 6, 6, 6], type: 'Combustion-like oxidation (respiration)', e: 'Releases the energy cells use; happens in many controlled steps in mitochondria.' }
  ];
  const gcdA = a => a.reduce((x, y) => { while (y) [x, y] = [y, x % y]; return x; });
  D['reaction-lab'] = { wide: true,
    intro: 'Atoms are never created or destroyed in a chemical reaction — they are **rearranged**. Choose a reaction, set the **coefficients** (how many of each molecule), and the atom counters compare both sides. When it balances, **run the reaction** and watch every atom move from the reactant molecules into the product molecules.',
    predict: { q: 'In 2H₂ + O₂ → 2H₂O, how many oxygen atoms are on each side?', options: ['1 on the left, 2 on the right', '2 on each side', '4 on each side', '2 on the left, 1 on the right'] },
    explore: '- Balance **methane burning**, then run it: count the atoms before and after.\n- Try **propane** — it needs bigger numbers. Change only one coefficient at a time.\n- Set every coefficient to 2 in a balanced equation: is it still balanced? Why is it not the usual answer?',
    explain: 'A balanced equation has the **same number of atoms of each element on both sides** — that is the **law of conservation of mass**. Balance by changing **coefficients** (the number of molecules), never the small subscripts (which would change what the substance is). Equations are written with the **smallest whole numbers** that balance; doubling every coefficient is still balanced but not simplest. Reactions fall into families — synthesis, decomposition, single and double displacement, combustion — which helps predict products.',
    apply: [q('x-rl1', 'Balance: _ N₂ + _ H₂ → _ NH₃', ['1, 1, 1', '1, 3, 2', '2, 3, 2', '1, 3, 1'], 1, 'N: 2 = 2 × 1; H: 3 × 2 = 6 = 2 × 3.'), q('x-rl2', 'When balancing, you may change…', ['subscripts', 'coefficients', 'both', 'neither'], 1, 'Changing a subscript makes a different substance.')],
    summary: ['Atoms are conserved: same count of each element on both sides.', 'Balance with coefficients, never subscripts.', 'Use the smallest whole-number coefficients.'],
    connect: [{ label: 'Equation balancer', href: '#/exp/balance' }, { label: '3D molecule builder', href: '#/exp/molecule-3d' }, { label: 'Lesson: Acids and bases', href: '#/lesson/chem-ph' }],
    build(host, c) {
      host.innerHTML = `<div class="v26-ws rl"><div class="v26-bar"><label>${T('Reaction', 'التفاعل')} <select class="ls-input rl__sel" style="width:auto">${RX.map((r, i) => `<option value="${i}">${esc(r.n)}</option>`).join('')}</select></label><button type="button" class="v26-tool" data-rl="run">${T('Run the reaction ▸', 'شغّل التفاعل')}</button><button type="button" class="v26-tool" data-rl="reset">${T('Coefficients back to 1', 'أعد المعاملات')}</button></div><div class="rl__eq v26-eq" aria-live="polite"></div><div class="rl__tally"></div><p class="rl__fb" role="status" aria-live="polite"></p></div>`;
      const ws = host.querySelector('.rl'), S = K.stage(ws, 960, 360, 'rl__stage'); S.cv.setAttribute('role', 'img'); ws.insertBefore(S.wrap, ws.querySelector('.rl__tally'));
      let ri = 0, k = [], anim = null, ran = false;
      const sp = () => RX[ri].L.concat(RX[ri].R);
      const sub = f => f.replace(/(\d+)/g, '<sub>$1</sub>');
      function counts() { const r = RX[ri], L = {}, R = {}; r.L.forEach((f, i) => Object.entries(parseF(f)).forEach(([e, n]) => { L[e] = (L[e] || 0) + n * k[i]; })); r.R.forEach((f, j) => Object.entries(parseF(f)).forEach(([e, n]) => { R[e] = (R[e] || 0) + n * k[r.L.length + j]; })); return { L, R, els: [...new Set(Object.keys(L).concat(Object.keys(R)))] }; }
      function eq() { const r = RX[ri]; const term = (f, i) => `<span class="rl__t"><button type="button" class="v26-tool" data-k="${i}" data-d="-1" aria-label="${T('fewer', 'أقل')} ${f}">−</button><b class="rl__k">${k[i]}</b><button type="button" class="v26-tool" data-k="${i}" data-d="1" aria-label="${T('more', 'أكثر')} ${f}">+</button> ${sub(f)}</span>`; ws.querySelector('.rl__eq').innerHTML = r.L.map((f, i) => term(f, i)).join(' + ') + ' → ' + r.R.map((f, j) => term(f, r.L.length + j)).join(' + '); }
      function tally() { const { L, R, els } = counts(), ok = els.every(e => (L[e] || 0) === (R[e] || 0)), g = gcdA(k.slice()); ws.querySelector('.rl__tally').innerHTML = `<table class="v26-out" style="margin:6px auto"><tr><th>${T('Element', 'العنصر')}</th><th>${T('left', 'يسار')}</th><th>${T('right', 'يمين')}</th><th></th></tr>${els.map(e => `<tr><td><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${AT[e][0]};border:1px solid #888"></span> ${e}</td><td>${L[e] || 0}</td><td>${R[e] || 0}</td><td>${(L[e] || 0) === (R[e] || 0) ? '✓' : (L[e] || 0) < (R[e] || 0) ? T('more needed on the left', 'نحتاج أكثر يساراً') : T('more needed on the right', 'نحتاج أكثر يميناً')}</td></tr>`).join('')}</table>`;
        ws.querySelector('.rl__fb').innerHTML = IL(ok ? (g > 1 ? T(`**Balanced — but not in lowest terms.** Every coefficient can be divided by ${g}.`, `**متوازن لكن ليس بأبسط صورة**`) : T(`**Balanced.** ${RX[ri].type}. ${RX[ri].e}`, '**متوازنة.**')) : T('Not balanced yet: the atom counts differ.', 'غير متوازنة.'));
        return ok; }
      // molecule layouts: atoms around the first heavy atom
      function molAtoms(f) { const a = []; Object.entries(parseF(f)).forEach(([e, n]) => { for (let i = 0; i < n; i++) a.push(e); }); const heavy = a.findIndex(e => e !== 'H' && e !== 'O') >= 0 ? a.findIndex(e => e !== 'H' && e !== 'O') : 0; const c0 = a.splice(heavy, 1)[0]; return [c0].concat(a); }
      function layout(side) { // positions of every atom in every molecule on one side
        const r = RX[ri], list = side === 'L' ? r.L : r.R, off = side === 'L' ? 0 : r.L.length, x0 = side === 'L' ? 30 : 520, out = []; let x = x0 + 30, y = 70;
        list.forEach((f, i) => { for (let m = 0; m < k[off + i]; m++) { const at = molAtoms(f), cx = x + 26, cy = y; at.forEach((e, j) => { const ang = j === 0 ? 0 : (j - 1) / Math.max(1, at.length - 1) * Math.PI * 2, rr = j === 0 ? 0 : 18 + (at.length > 6 ? 6 : 0); out.push({ e, x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr }); }); x += 70; if (x > x0 + 400) { x = x0 + 30; y += 64; } } });
        return out; }
      function draw(t) {
        const G = S.g, Pl = K.pal(); S.clear(Pl.bg); G.fillStyle = Pl.line; G.fillRect(478, 20, 4, 320); K.text(G, T('Reactants', 'المتفاعلات'), 30, 22, { w: 700, s: 13, c: Pl.muted }); K.text(G, T('Products', 'النواتج'), 520, 22, { w: 700, s: 13, c: Pl.muted });
        const dot = (e, x, y, alpha = 1) => { const [col, r] = AT[e] || ['#999', 9]; G.globalAlpha = alpha; G.fillStyle = col; G.beginPath(); G.arc(x, y, r, 0, 7); G.fill(); G.strokeStyle = 'rgba(0,0,0,.35)'; G.lineWidth = 1; G.stroke(); if (r >= 10) K.text(G, e, x, y + 4, { a: 'center', s: 9, w: 700, c: e === 'H' || e === 'Ag' ? '#222' : '#fff' }); G.globalAlpha = 1; };
        if (anim) { const ease = x => 1 - Math.pow(1 - x, 3), u = ease(Math.min(1, t)); anim.pairs.forEach(([a, b2]) => dot(a.e, a.x + (b2.x - a.x) * u, a.y + (b2.y - a.y) * u)); anim.extraL.forEach(a => dot(a.e, a.x, a.y, 1 - u * 0.6)); return; }
        const Ls = layout('L'), Rs = layout('R'); (ran ? [] : Ls).forEach(a => dot(a.e, a.x, a.y)); Rs.forEach(a => dot(a.e, a.x, a.y, ran ? 1 : 0.28));
        if (!ran) K.text(G, T('faded: the molecules the equation says will form', 'باهت: الجزيئات المتوقعة'), 520, 345, { s: 11, c: Pl.muted });
      }
      function runRx() {
        if (!tally()) { ws.querySelector('.rl__fb').innerHTML = IL(T('**Balance it first.** A reaction cannot make or lose atoms — with these numbers some atoms would have to appear from nowhere or vanish.', '**وازن أولاً.**')); return; }
        // pair each reactant atom with a product atom of the same element
        const Ls = layout('L'), Rs = layout('R'), used = new Set(), pairs = [], extraL = [];
        Ls.forEach(a => { const j = Rs.findIndex((b2, jj) => !used.has(jj) && b2.e === a.e); if (j >= 0) { used.add(j); pairs.push([a, Rs[j]]); } else extraL.push(a); });
        anim = { pairs, extraL }; ran = false; let t = 0; if (K.reduced()) { anim = null; ran = true; draw(); return; }
        const tick = () => { t += 1 / 60 / 1.4; draw(t); if (t < 1) requestAnimationFrame(tick); else { anim = null; ran = true; draw(); } }; requestAnimationFrame(tick);
      }
      function setR(i) { ri = i; k = sp().map(() => 1); ran = false; anim = null; eq(); tally(); draw(); }
      ws.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { const i = +b.dataset.k; k[i] = Math.max(1, Math.min(12, k[i] + +b.dataset.d)); ran = false; eq(); tally(); draw(); } const a = e.target.closest('[data-rl]'); if (a && a.dataset.rl === 'run') runRx(); if (a && a.dataset.rl === 'reset') setR(ri); });
      ws.querySelector('.rl__sel').addEventListener('change', e => setR(+e.target.value));
      S.onresize = () => { if (!anim) draw(); };
      setR(0);
      return { play() { runRx(); }, pause() {}, running: () => false, destroy() { S.destroy(); }, reset() { ws.querySelector('.rl__sel').value = 0; setR(0); }, preset() { this.reset(); },
        _set: (i, kk) => { ws.querySelector('.rl__sel').value = i; setR(i); k = kk.slice(); eq(); return tally(); },
        observe() { const ok = (() => { const { L, R, els } = counts(); return els.every(e => (L[e] || 0) === (R[e] || 0)); })(); return { text: `${RX[ri].n}: coefficients ${k.join(', ')} — ${ok ? '**balanced**' : '**not balanced**'}. ${ok ? 'Every atom on the left appears on the right.' : ''}`, predOk: i => i === 1 }; } };
    }
  };
})();
