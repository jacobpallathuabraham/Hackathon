/* ERLY Noor Lab — concept demonstrations (v18).

   Engines for the ideas students ask about in plain words ("what is differentiation?", "why does sin²θ + cos²θ
   = 1?", "how do electric fields work?"), each computed from its model and explained from its live state:

     secant      differentiation from first principles (secant → tangent as h → 0, with the algebra)
     optimise    maximum rectangle under a curve (geometry, area function and calculus tied to one x)
     unitcircle  the unit circle and the Pythagorean identity
     superpose   one wave, or two waves superposed (frequency, phase, direction: beats, standing waves)
     lorentz     a charged particle in electric and magnetic fields (RK4)
     induction   a coil turning in a magnetic field (flux, emf, Lenz's law)
     market      supply and demand (equilibrium, shifts, price controls, surplus)
     atwood      a pulley with two hanging masses (free-body diagrams, a and T)
     radial      potential and field around a point charge (V ∝ 1/r, E ∝ 1/r²)
     sphereplane a plane cutting a sphere (3D, with the 2D cross-section)
     molecule    VSEPR molecular geometry in 3D (lone pairs, bond angles)
     gradient    a surface z = f(x, y) with contours and gradient vectors (3D)

   Shared: L.harness (2D, lab-physics.js) and L.harness3d (below) — same controls, readouts, explanation,
   follow-up commands, state and export as every other Noor Lab model. */
(function () {
  'use strict';
  const L = window.ERLY_LAB; if (!L || !L.harness) return;
  const T = L.T, N = L.num, ui = L.ui, esc = L.esc;
  const f3 = v => (!isFinite(v) ? String(v) : Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-3 && v !== 0) ? (+v).toExponential(3) : (+(+v).toPrecision(4)).toString());
  const num = (t, re, d) => { const m = String(t).match(re); return m ? +m[1] : d; };
  const DECL = L.__decl = L.__decl || {};
  function reg(id, kind, title, match, decl, defFn, three) {
    DECL[id] = decl;
    L.register({ id, family: 'concepts', kind, title, match, async mount(ctx) { ctx.id = id; const d = await defFn(ctx); return three ? harness3d(ctx, d) : L.harness(ctx, d); } });
  }
  const label = (g, p, x, y, s, col, o) => p.text(x, y, s, col, Object.assign({ font: '600 12px ui-sans-serif, system-ui' }, o || {}));
  const K = {
    calc: T('Mathematics · Calculus', 'رياضيات · التفاضل والتكامل'), trig: T('Mathematics · Trigonometry', 'رياضيات · المثلثات'), wave: T('Physics · Waves', 'فيزياء · الموجات'),
    em: T('Physics · Electromagnetism', 'فيزياء · الكهرومغناطيسية'), econ: T('Economics · Markets', 'اقتصاد · الأسواق'), mech: T('Physics · Mechanics', 'فيزياء · الميكانيكا'),
    geo3: T('Mathematics · 3D geometry', 'رياضيات · هندسة ثلاثية الأبعاد'), chem: T('Chemistry · Molecular geometry', 'كيمياء · الشكل الجزيئي'), mv: T('Mathematics · Multivariable calculus', 'رياضيات · تفاضل متعدد المتغيرات')
  };
  async function compiler() { const M = await L.mathReady(); return (e, vars) => { const c = M.compile(L.prep(e)); return (...a) => { try { const sc = {}; (vars || ['x']).forEach((v, i) => { sc[v] = a[i]; }); const v = c.evaluate(sc); return typeof v === 'number' ? v : NaN; } catch (er) { return NaN; } }; }; }
  const fnText = (t, d) => { const s = L.normalise(t); const m = s.match(/(?:f\(x\)\s*=|y\s*=)\s*([-\w\s^*/+().]+?)(?:\s+(?:and|from|at|when|for|above|below|with|on)\b|[?,;]|$)/i); return m && /x/.test(m[1]) ? m[1].trim() : d; };

  /* ======================= secant → tangent (first principles) ======================= */
  reg('secant', K.calc, T('Differentiation from first principles', 'الاشتقاق من المبادئ الأولى'),
    t => (/\b(first principles?|from the definition|limit definition|secant|difference quotient|what is (a )?(differentiation|derivative)|how (do|does) (differentiation|derivatives?) work|what does (a |the )?derivative mean|rate of change)\b/i.test(t) && !/\b(integra\w*|area under)\b/i.test(t) ? { score: 0.95, params: { set: { f: fnText(t, 'x^2'), x0: num(t, /at\s*x\s*=\s*(-?\d+(?:\.\d+)?)/i, 1) } } } : null),
    { f: { expr: true }, x0: { min: -50, max: 50 }, h: { min: 1e-6, max: 10 } },
    async ctx => {
      const C = await compiler(); let cas = null; try { cas = await L.libs.cas(); } catch (e) { cas = null; }
      const S0 = Object.assign({ f: 'x^2', x0: 1, h: 1.5, shrink: true }, ctx.params.set || {});
      let F = C(S0.f), fsrc = S0.f;
      const sym = f => { if (!cas) return null; try { const q = cas(`((${L.prep(f).replace(/x/g, '(x+h)')})-(${L.prep(f)}))/h`).expand().toString(); const lim = cas(q).sub('h', '0').toString(); return { q, lim }; } catch (e) { return null; } };
      let SY = sym(fsrc);
      return {
        defaults: S0, graph: true, equal: false, h: 1 / 60, autoplay: true,
        params: [{ key: 'x0', label: T('point x₀', 'النقطة x₀'), min: -5, max: 5, step: 0.05, live: true }, { key: 'h', label: T('gap h', 'الفرق h'), min: 0.001, max: 3, step: 0.001, live: true }],
        toggles: [{ key: 'shrink', label: T('Animate h → 0', 'حرّك h نحو الصفر'), live: true }],
        view: S => { const x = S.x0, y = F(x); return { x0: x - 4, x1: x + 4, y0: Math.min(y - 4, F(x - 3), F(x + 3)) - 1, y1: Math.max(y + 4, F(x + 3.5)) + 1 }; },
        init(S, st) { if (S.f !== fsrc) { fsrc = S.f; F = C(S.f); SY = sym(S.f); } st.hist = []; },
        step(S, st, h, api) { if (S.shrink && S.h > 0.002) { S.h = Math.max(0.002, S.h * Math.pow(0.5, h / 0.9)); if (api.sliders.h) api.sliders.h.set(+S.h.toFixed(4)); } },
        draw(g, p, S) {
          const c = L.colors(), x = S.x0, y = F(x), x2 = x + S.h, y2 = F(x2), m = (y2 - y) / S.h, d = N.deriv(F, x);
          p.fn(F, c.pal[0], { w: 2.6 });
          p.fn(X => y + d * (X - x), c.pal[2], { w: 1.8, dash: [6, 5] });
          p.fn(X => y + m * (X - x), c.pal[1], { w: 2.2 });
          p.path([[x, y], [x2, y], [x2, y2]], c.muted, { w: 1.2, dash: [3, 3] });
          label(g, p, (x + x2) / 2, y - (p.view.y1 - p.view.y0) * 0.04, 'h = ' + f3(S.h), c.muted); label(g, p, x2 + 0.05, (y + y2) / 2, 'Δy = ' + f3(y2 - y), c.muted);
          p.dot(x, y, c.ink, `P (${f3(x)}, ${f3(y)})`, { r: 6, bold: true }); p.dot(x2, y2, c.pal[1], 'Q', { r: 6, bold: true });
          label(g, p, p.view.x0 + (p.view.x1 - p.view.x0) * 0.02, p.view.y1 - (p.view.y1 - p.view.y0) * 0.06, `${T('secant slope', 'ميل القاطع')} = ${f3(m)}   ·   ${T('tangent slope', 'ميل المماس')} = ${f3(d)}`, c.ink);
        },
        graphDraw(g, p, S) { const c = L.colors(), d = N.deriv(F, S.x0), q = hh => (F(S.x0 + hh) - F(S.x0)) / hh; p.view = { x0: 0, x1: 3, y0: Math.min(d, q(3), q(0.001)) - 1, y1: Math.max(d, q(3), q(0.001)) + 1 }; p.labels = { x: 'h', y: T('slope of PQ', 'ميل PQ') }; p.grid(); p.fn(hh => (hh > 1e-6 ? q(hh) : NaN), c.pal[1], { w: 2.2 }); p.path([[0, d], [3, d]], c.pal[2], { w: 1.5, dash: [6, 5] }); p.dot(S.h, q(S.h), c.pal[1], '', { r: 5 }); p.text(2.2, d, ' limit = ' + f3(d), c.pal[2]); },
        readout: (S) => { const q = (F(S.x0 + S.h) - F(S.x0)) / S.h, d = N.deriv(F, S.x0); return [['h', f3(S.h)], ['[f(x₀+h) − f(x₀)]/h', f3(q)], ["f′(x₀)", f3(d)], [T('difference', 'الفرق'), f3(q - d)]]; },
        intro: S => T(`Differentiation from first principles for f(x) = ${S.f}: the slope of the secant PQ, [f(x₀ + h) − f(x₀)]/h, gets closer and closer to the tangent slope as h shrinks to 0. Watch h fall — or drag the sliders.${SY ? ` Here the quotient simplifies to ${SY.q}, so the limit is f′(x) = ${SY.lim}.` : ''}`, 'الاشتقاق من المبادئ الأولى.'),
        explain(S) { const d = N.deriv(F, S.x0); const rows = [1, 0.1, 0.01, 0.001].map(hh => `<tr><td>${hh}</td><td>${f3((F(S.x0 + hh) - F(S.x0)) / hh)}</td></tr>`).join('');
          return `<p>f′(x) = lim<sub>h→0</sub> [f(x + h) − f(x)] / h.</p>${SY ? `<p>${T('For', 'لـ')} f(x) = ${esc(S.f)}: [f(x+h) − f(x)]/h = <b>${esc(SY.q)}</b> ${T('(algebra by Nerdamer). Let h → 0:', '؛ عندما h → 0:')} <b>f′(x) = ${esc(SY.lim)}</b>.</p>` : ''}<p>${T('At x₀ =', 'عند x₀ =')} ${f3(S.x0)}:</p><table class="lab-tbl"><tr><th>h</th><th>${T('secant slope', 'ميل القاطع')}</th></tr>${rows}<tr><td>→ 0</td><td><b>${f3(d)}</b></td></tr></table>`; },
        assume: T('f must be smooth near x₀; the tangent slope shown is checked numerically (central difference) against the symbolic limit where one is available.', 'يجب أن تكون الدالة ملساء.'),
        state: S => ({ f: S.f, x0: S.x0, h: S.h, secant: (F(S.x0 + S.h) - F(S.x0)) / S.h, derivative: N.deriv(F, S.x0), symbolic: SY && SY.lim }),
        command(t, S) { let m; const f = fnText(t, null); if (f && /f\(x\)\s*=|y\s*=/.test(L.normalise(t))) { S.f = f; return { note: 'f(x) = ' + f }; } if ((m = t.match(/\bx\s*(?:0|₀)?\s*(?:to|=)\s*(-?\d+(?:\.\d+)?)/i))) { S.x0 = +m[1]; return { note: 'x₀ = ' + m[1] }; } if (/\b(smaller|shrink|closer)\b/i.test(t)) { S.h /= 10; return { note: 'h = ' + f3(S.h), keep: true }; } return null; }
      };
    });

  /* ======================= optimisation: largest rectangle under a curve ======================= */
  reg('optimise', K.calc, T('Optimisation: largest rectangle', 'الأمثلة: أكبر مستطيل'),
    t => (/\b(maximi[sz]e|maximum|largest|greatest)\b[^.]*\b(area|rectangle)\b|\b(rectangle|rectangles)\b[^.]*\binscribed\b/i.test(t) ? { score: 0.97, params: { set: { f: fnText(t, '12 - x^2') } } } : null),
    { f: { expr: true }, x: { min: 0, max: 100 } },
    async ctx => {
      const C = await compiler(); const S0 = Object.assign({ f: '12 - x^2', x: 1 }, ctx.params.set || {});
      let F = C(S0.f), fsrc = S0.f;
      const solve = () => { const root = N.roots(F, 0.0001, 50, 4000).filter(r => r > 0)[0] || 5; const A = x => 2 * x * F(x); const ex = N.extrema(A, 0.0001, root, 800).filter(e => e.kind === 'max'); const best = ex.sort((a, b) => b.y - a.y)[0] || { x: root / 2, y: A(root / 2) }; return { root, A, best }; };
      let R = solve();
      return {
        defaults: S0, static: true, autoplay: false, graph: true, equal: false,
        params: [{ key: 'x', label: T('half-width x', 'نصف العرض x'), min: 0, max: 5, step: 0.01, live: true }],
        view: () => ({ x0: -R.root * 1.25, x1: R.root * 1.25, y0: -F(0) * 0.08, y1: F(0) * 1.15 }),
        init(S, st) { if (S.f !== fsrc) { fsrc = S.f; F = C(S.f); R = solve(); } if (S.x > R.root) S.x = R.root * 0.4; },
        step() {},
        onDown: (S, st, x) => ({ grab: true }), onDrag: (S, st, x) => { S.x = Math.max(0, Math.min(R.root, Math.abs(x))); },
        draw(g, p, S) { const c = L.colors(), x = S.x, h = F(x); p.fn(F, c.pal[0], { w: 2.6 }); g.fillStyle = 'rgba(37,99,235,.22)'; g.strokeStyle = c.pal[1]; g.lineWidth = 2; const X0 = p.X(-x), X1 = p.X(x), Y0 = p.Y(0), Y1 = p.Y(h); g.fillRect(X0, Y1, X1 - X0, Y0 - Y1); g.strokeRect(X0, Y1, X1 - X0, Y0 - Y1); p.dot(x, h, c.pal[1], `(${f3(x)}, ${f3(h)})`, { r: 6, bold: true }); label(g, p, -x, h * 0.5, ` A = 2x·f(x) = ${f3(2 * x * h)}`, c.ink); label(g, p, p.view.x0 + 0.1, p.view.y1 * 0.95, 'y = ' + S.f, c.pal[0]); },
        graphDraw(g, p, S) { const c = L.colors(); p.view = { x0: 0, x1: R.root, y0: 0, y1: R.best.y * 1.2 }; p.labels = { x: 'x', y: 'A(x)' }; p.grid(); p.fn(R.A, c.pal[1], { w: 2.4 }); p.dot(R.best.x, R.best.y, c.pal[2], `${T('max', 'أقصى')} A = ${f3(R.best.y)} @ x = ${f3(R.best.x)}`, { r: 6, bold: true }); p.dot(S.x, R.A(S.x), c.ink, '', { r: 5 }); },
        readout: S => [['x', f3(S.x)], ['A(x)', f3(R.A(S.x))], [T('maximum', 'القيمة القصوى'), `${f3(R.best.y)} (x = ${f3(R.best.x)})`]],
        intro: S => T(`Rectangle under y = ${S.f} with its base on the x-axis: width 2x, height f(x), so A(x) = 2x·f(x). The area is largest at x = ${f3(R.best.x)}, giving A = ${f3(R.best.y)}. Drag the corner (or the slider) and watch the point move along the area graph.`, 'أكبر مستطيل.'),
        explain(S) { const m = String(S.f).replace(/\s/g, '').match(/^(\d+(?:\.\d+)?)-x\^2$/); const c = m ? +m[1] : null;
          return `<p>A(x) = 2x·f(x) ${T('on', 'على')} 0 &lt; x &lt; ${f3(R.root)}. A′(x) = 2f(x) + 2x·f′(x) = 0.</p>${c != null ? `<p>${T('For', 'لـ')} f(x) = ${c} − x²: A = 2x(${c} − x²) = ${2 * c}x − 2x³, A′ = ${2 * c} − 6x² = 0 → x = √(${c}/3) = ${f3(Math.sqrt(c / 3))}. A″ = −12x &lt; 0, ${T('so it is a maximum', 'إذن قيمة عظمى')}: A = <b>${f3(4 * c / 3 * Math.sqrt(c / 3))}</b>.</p>` : `<p>${T('Solved numerically', 'حُلّت عددياً')}: x = ${f3(R.best.x)}, A = ${f3(R.best.y)}.</p>`}<p class="muted">${T('Check: the numerical maximum of A(x) agrees with the calculus result.', 'تحقق: القيمة العددية توافق النتيجة التحليلية.')}</p>`; },
        assume: T('The curve must be symmetric about the y-axis and positive between its roots for the rectangle to be centred; the maximum is found numerically and confirmed analytically for f = c − x².', 'المنحنى متماثل.'),
        state: S => ({ f: S.f, x: S.x, area: R.A(S.x), best: R.best, root: R.root }),
        command(t, S) { const f = fnText(t, null); if (f) { S.f = f; return { note: 'y = ' + f }; } return null; }
      };
    });

  /* ======================= unit circle ======================= */
  reg('unitcircle', K.trig, T('The unit circle', 'دائرة الوحدة'),
    t => (/\bunit circle\b|sin\s*\^?\s*2|sin²|cos²|pythagorean identity|why (is|does) sin|radians? (and|vs) degrees/i.test(t) ? { score: 0.95, params: { set: { deg: num(t, /(\d+(?:\.\d+)?)\s*(?:°|deg)/i, 35) } } } : null),
    { deg: { min: -720, max: 720 } },
    () => ({
      defaults: { deg: 35, spin: false }, graph: true, equal: true, autoplay: false, static: false, h: 1 / 60,
      params: [{ key: 'deg', label: T('angle θ', 'الزاوية θ'), unit: '°', min: 0, max: 360, step: 1, live: true }],
      toggles: [{ key: 'spin', label: T('Rotate', 'دوّر'), live: true }],
      view: () => ({ x0: -1.6, x1: 1.6, y0: -1.3, y1: 1.3 }),
      init() {}, step(S, st, h, api) { if (S.spin) { S.deg = (S.deg + 40 * h) % 360; if (api.sliders.deg) api.sliders.deg.set(Math.round(S.deg)); } },
      onDown: () => ({}), onDrag: (S, st, x, y) => { S.deg = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360; },
      draw(g, p, S) { const c = L.colors(), a = S.deg * Math.PI / 180, x = Math.cos(a), y = Math.sin(a);
        g.strokeStyle = c.muted; g.lineWidth = 1.5; g.beginPath(); g.arc(p.X(0), p.Y(0), Math.abs(p.X(1) - p.X(0)), 0, 7); g.stroke();
        p.path([[0, 0], [x, y]], c.ink, { w: 2.5 }); p.path([[0, 0], [x, 0]], c.pal[0], { w: 4 }); p.path([[x, 0], [x, y]], c.pal[1], { w: 4 });
        p.dot(x, y, c.ink, `(${f3(x)}, ${f3(y)})`, { r: 6, bold: true }); label(g, p, x / 2 - 0.1, -0.1, 'cos θ', c.pal[0]); label(g, p, x + 0.04, y / 2, 'sin θ', c.pal[1]); label(g, p, x / 2 - 0.15, y / 2 + 0.1, '1', c.ink);
        g.strokeStyle = c.pal[3]; g.lineWidth = 2; g.beginPath(); g.arc(p.X(0), p.Y(0), 22, 0, -a, a > 0); g.stroke(); },
      graphDraw(g, p, S) { const c = L.colors(); p.view = { x0: 0, x1: 360, y0: -1.2, y1: 1.2 }; p.labels = { x: 'θ (°)', y: '' }; p.grid(); p.fn(d => Math.sin(d * Math.PI / 180), c.pal[1], { w: 2 }); p.fn(d => Math.cos(d * Math.PI / 180), c.pal[0], { w: 2 }); p.fn(d => Math.sin(d * Math.PI / 180) ** 2 + Math.cos(d * Math.PI / 180) ** 2, c.pal[2], { w: 1.6, dash: [5, 4] }); p.path([[S.deg, -1.2], [S.deg, 1.2]], c.muted, { w: 1 }); p.text(250, 1.07, 'sin²θ + cos²θ', c.pal[2]); },
      readout: S => { const a = S.deg * Math.PI / 180; return [['θ', f3(S.deg) + '° = ' + f3(a) + ' rad'], ['cos θ', f3(Math.cos(a))], ['sin θ', f3(Math.sin(a))], ['sin²θ + cos²θ', f3(Math.sin(a) ** 2 + Math.cos(a) ** 2)]]; },
      intro: () => T('On the unit circle, the point at angle θ is (cos θ, sin θ). The two coloured sides and the radius make a right triangle with hypotenuse 1, so Pythagoras gives sin²θ + cos²θ = 1 — for every angle. Drag the point around and watch the identity stay at exactly 1.', 'دائرة الوحدة.'),
      explain: S => { const a = S.deg * Math.PI / 180; return `<p>${T('The radius has length 1. Its horizontal projection is cos θ and its vertical projection is sin θ.', 'نصف القطر طوله ١.')}</p><p>${T('Pythagoras on that right triangle', 'فيثاغورس')}: (cos θ)² + (sin θ)² = 1² → <b>sin²θ + cos²θ = 1</b>.</p><p>${T('Now', 'الآن')}: ${f3(Math.cos(a))}² + ${f3(Math.sin(a))}² = ${f3(Math.cos(a) ** 2 + Math.sin(a) ** 2)}. ${T('In the second to fourth quadrants a projection is negative, but its square is not, so the identity still holds.', 'في الأرباع الأخرى يبقى المربع موجباً.')}</p>`; },
      assume: T('Exact trigonometry; values shown to 4 significant figures.', 'قيم دقيقة.'),
      state: S => { const a = S.deg * Math.PI / 180; return { deg: S.deg, cos: Math.cos(a), sin: Math.sin(a), identity: Math.sin(a) ** 2 + Math.cos(a) ** 2 }; },
      command(t, S) { const m = t.match(/(-?\d+(?:\.\d+)?)\s*(?:°|deg)/i); if (m) { S.deg = +m[1]; return { note: 'θ = ' + m[1] + '°' }; } return null; }
    }));

  /* ======================= wave superposition ======================= */
  reg('superpose', K.wave, T('Waves and superposition', 'الموجات والتراكب'),
    t => (/\b(beats?|superposition|superpose|standing waves?|(two|2) waves|interfer\w* with each other|wave(s)?\b.*\bfrequency|frequency\b.*\bwave(s)?|wavelength\b.*\bfrequency)\b/i.test(t) && !/\b(double[- ]slit|young|two sources|ripple tank)\b/i.test(t) ? { score: 0.94, params: { set: { two: /\b(two|2|both|interfer|superpos|beat|standing)\b/i.test(t), opposite: /standing/i.test(t) } } } : null),
    { two: { bool: true }, opposite: { bool: true }, f1: { min: 0.05, max: 20 }, f2: { min: 0.05, max: 20 }, A1: { min: 0, max: 3 }, A2: { min: 0, max: 3 }, phi: { min: -360, max: 360 }, v: { min: 0.1, max: 20 } },
    () => ({
      defaults: { two: true, opposite: false, f1: 1, f2: 1.2, A1: 1, A2: 1, phi: 0, v: 2 }, graph: true, equal: false, autoplay: true, h: 1 / 120, tWindow: 6,
      params: [{ key: 'f1', label: T('frequency f₁', 'التردد f₁'), unit: 'Hz', min: 0.1, max: 4, step: 0.05, live: true }, { key: 'f2', label: T('frequency f₂', 'التردد f₂'), unit: 'Hz', min: 0.1, max: 4, step: 0.05, live: true, when: S => S.two }, { key: 'A1', label: T('amplitude A₁', 'السعة A₁'), min: 0, max: 2, step: 0.05, live: true }, { key: 'A2', label: T('amplitude A₂', 'السعة A₂'), min: 0, max: 2, step: 0.05, live: true, when: S => S.two }, { key: 'phi', label: T('phase difference φ', 'فرق الطور'), unit: '°', min: 0, max: 360, step: 1, live: true, when: S => S.two }, { key: 'v', label: T('wave speed v', 'سرعة الموجة'), unit: 'm/s', min: 0.5, max: 6, step: 0.1, live: true }],
      toggles: [{ key: 'two', label: T('Two waves', 'موجتان'), live: false }, { key: 'opposite', label: T('Second wave travels the other way', 'الموجة الثانية بالاتجاه المعاكس'), live: true }],
      series: [['sum', T('displacement at x = 0', 'الإزاحة عند x = 0'), 1, null, ['y(0, t)']]], sample: (S, st) => [st.y0], columns: ['y0'],
      view: () => ({ x0: 0, x1: 10, y0: -4.5, y1: 4.5 }),
      init(S, st) { st.y0 = 0; },
      step(S, st) { st.y0 = yAt(S, 0, st.t); },
      draw(g, p, S, st) { const c = L.colors(), t = st.t; const k = f => 2 * Math.PI * f / S.v;
        const w1 = x => S.A1 * Math.sin(k(S.f1) * x - 2 * Math.PI * S.f1 * t), w2 = x => S.A2 * Math.sin((S.opposite ? 1 : 1) * k(S.f2) * x * (S.opposite ? -1 : 1) - 2 * Math.PI * S.f2 * t + S.phi * Math.PI / 180);
        if (S.two) { p.fn(x => w1(x) + 2.6, c.pal[0], { w: 1.6 }); p.fn(x => w2(x) + 2.6, c.pal[1], { w: 1.6 }); label(g, p, 0.1, 4.1, T('the two waves', 'الموجتان'), c.muted); }
        p.fn(x => (S.two ? w1(x) + w2(x) - 1 : w1(x)), c.ink, { w: 2.6 }); label(g, p, 0.1, S.two ? -3.9 : -1.9, S.two ? T('their sum (superposition)', 'المجموع') : T('the wave', 'الموجة'), c.ink);
        if (!S.two) { const lam = S.v / S.f1; p.arrow(1, 1.4, 1 + lam, 1.4, c.pal[3], `λ = ${f3(lam)} m`, { w: 2 }); } },
      readout: S => { const r = [['λ₁ = v/f₁', f3(S.v / S.f1) + ' m'], ['T₁ = 1/f₁', f3(1 / S.f1) + ' s']]; if (S.two) r.push(['λ₂', f3(S.v / S.f2) + ' m'], [T('beat frequency |f₁ − f₂|', 'تردد النبض'), f3(Math.abs(S.f1 - S.f2)) + ' Hz']); return r; },
      intro: S => (S.two ? T(`Two waves (${S.f1} Hz and ${S.f2} Hz) add point by point. Because their frequencies differ by ${f3(Math.abs(S.f1 - S.f2))} Hz, they drift in and out of step: loud–soft “beats” ${f3(Math.abs(S.f1 - S.f2))} times a second. Change either frequency or the phase and watch the sum.`, 'موجتان تتراكبان.') : T(`A wave at ${S.f1} Hz moving at ${S.v} m/s has wavelength λ = v/f = ${f3(S.v / S.f1)} m. Raise the frequency and, at the same speed, the wavelength gets shorter and each point oscillates faster.`, 'موجة واحدة.')),
      explain: S => `<p>${T('Each wave', 'كل موجة')}: y = A sin(kx − ωt + φ), ω = 2πf, k = 2π/λ, v = fλ.</p>${S.two ? `<p>${T('Superposition: the displacements add', 'التراكب: تجمع الإزاحات')}: y = y₁ + y₂. ${T('For equal amplitudes and close frequencies', 'لسعتين متساويتين وترددين متقاربين')}: y = 2A cos(π(f₁−f₂)t) sin(…), ${T('so the loudness rises and falls at', 'فيتغير الارتفاع بتردد')} |f₁ − f₂| = <b>${f3(Math.abs(S.f1 - S.f2))} Hz</b>.</p><p>${T('Phase φ = 180° with equal f and A: complete cancellation (destructive); φ = 0: double amplitude (constructive). Opposite directions with equal f: a standing wave with fixed nodes.', 'الطور ١٨٠°: تلاشٍ تام.')}</p>` : `<p>${T('Doubling f at fixed v halves λ; the energy carried also rises (∝ f²A² for a mechanical wave).', 'مضاعفة التردد تنصف الطول الموجي.')}</p>`}`,
      assume: T('Ideal, non-dispersive sinusoidal waves in one dimension (same speed for both); no damping.', 'موجات مثالية.'),
      state: (S, st) => ({ f1: S.f1, f2: S.f2, two: S.two, beat: Math.abs(S.f1 - S.f2), lambda1: S.v / S.f1, y0: yAt(S, 0, st.t), t: st.t }),
      command(t, S) { let m; if ((m = t.match(/\bfrequency\b.*?(?:to|=)\s*(\d+(?:\.\d+)?)/i))) { S.f1 = +m[1]; return { note: 'f₁ = ' + m[1] + ' Hz', keep: true }; } if (/\b(increase|raise|higher)\b.*\bfrequency\b/i.test(t)) { S.f1 *= 1.5; return { note: 'f₁ = ' + f3(S.f1) + ' Hz', keep: true }; } if (/\bin phase\b/i.test(t)) { S.phi = 0; return { note: 'φ = 0°', keep: true }; } if (/\bout of phase|antiphase|180\b/i.test(t)) { S.phi = 180; return { note: 'φ = 180°', keep: true }; } if (/\bstanding\b/i.test(t)) { S.two = true; S.opposite = true; S.f2 = S.f1; return { note: T('Standing wave.', 'موجة واقفة.') }; } return null; }
    }));
  function yAt(S, x, t) { const k = f => 2 * Math.PI * f / S.v; const a = S.A1 * Math.sin(k(S.f1) * x - 2 * Math.PI * S.f1 * t); if (!S.two) return a; return a + S.A2 * Math.sin(k(S.f2) * x * (S.opposite ? -1 : 1) - 2 * Math.PI * S.f2 * t + S.phi * Math.PI / 180); }

  /* ======================= charged particle in E and B ======================= */
  reg('lorentz', K.em, T('Charged particle in E and B fields', 'جسيم مشحون في مجالين'),
    t => (/\b(charged particle|electron|proton|ion)\b[^.]*\b(magnetic|electric)\b[^.]*\bfield|\blorentz force\b|\bcyclotron\b|\bE\s*×\s*B\b|\bvelocity selector\b|\bmass spectrometer\b/i.test(t) ? { score: 0.95, params: { set: Object.assign({}, /electron/i.test(t) ? { particle: 'e' } : {}, /\bno electric|only (a )?magnetic|magnetic field only\b/i.test(t) ? { E: 0 } : {}) } } : null),
    { particle: { options: ['p', 'e', 'custom'] }, B: { min: 0, max: 10 }, E: { min: -1e6, max: 1e6 }, v: { min: 0, max: 1e8 }, angle: { min: 0, max: 180 } },
    () => ({
      defaults: { particle: 'p', B: 0.5, E: 0, v: 2e5, angle: 90, q: 1.602176634e-19, m: 1.67262192e-27 }, graph: false, autoplay: true, equal: true, h: 1 / 240,
      params: [{ key: 'B', label: T('magnetic field B (out of screen)', 'المجال المغناطيسي'), unit: 'T', min: 0, max: 2, step: 0.01 }, { key: 'E', label: T('electric field E (along +y)', 'المجال الكهربائي'), unit: 'V/m', min: -1e5, max: 1e5, step: 1000 }, { key: 'v', label: T('speed v₀ (along +x)', 'السرعة'), unit: 'm/s', min: 1e4, max: 1e6, step: 1e4 }],
      selects: [{ key: 'particle', label: T('Particle', 'الجسيم'), num: false, options: [['p', T('proton', 'بروتون')], ['e', T('electron', 'إلكترون')]], onSet: S => { if (S.particle === 'e') { S.q = -1.602176634e-19; S.m = 9.1093837e-31; } else { S.q = 1.602176634e-19; S.m = 1.67262192e-27; } } }],
      view: S => { const r = S.B ? S.m * S.v / (Math.abs(S.q) * S.B) : 1; return { x0: -3 * r, x1: 3 * r, y0: -3 * r, y1: 3 * r }; },
      init(S, st) { if (S.particle === 'e') { S.q = -1.602176634e-19; S.m = 9.1093837e-31; } st.s = [0, 0, S.v, 0]; st.path = [[0, 0]]; st.T = S.B ? 2 * Math.PI * S.m / (Math.abs(S.q) * S.B) : 1e-6; st.sim = 0; },
      step(S, st, h) { const dt = st.T / 400, n = 6; const f = (tt, y) => { const ax = S.q / S.m * (y[3] * S.B), ay = S.q / S.m * (S.E - y[2] * S.B); return [y[2], y[3], ax, ay]; }; for (let i = 0; i < n; i++) { st.s = N.rk4(f, 0, st.s, dt); st.sim += dt; } st.path.push([st.s[0], st.s[1]]); if (st.path.length > 1600) st.path.shift(); },
      draw(g, p, S, st) { const c = L.colors(); const sp = (p.view.x1 - p.view.x0) / 8; for (let x = p.view.x0 + sp / 2; x < p.view.x1; x += sp) for (let y = p.view.y0 + sp / 2; y < p.view.y1; y += sp) { if (S.B) p.dot(x, y, c.muted, '', { r: 1.6 }); }
        if (S.E) for (let x = p.view.x0 + sp; x < p.view.x1; x += sp * 2) p.arrow(x, p.view.y0 + sp, x, p.view.y0 + sp * 1.9 * Math.sign(S.E), c.pal[3], '', { w: 1.2 });
        p.path(st.path, c.pal[0], { w: 2 }); const [x, y, vx, vy] = st.s; p.dot(x, y, S.q > 0 ? '#dc2626' : '#2563eb', S.q > 0 ? '+' : '−', { r: 7, bold: true }); const L0 = (p.view.x1 - p.view.x0) * 0.12, vm = Math.hypot(vx, vy) || 1; p.arrow(x, y, x + vx / vm * L0, y + vy / vm * L0, c.pal[2], 'v', { w: 2 });
        const fx = S.q * (vy * S.B), fy = S.q * (S.E - vx * S.B), fm = Math.hypot(fx, fy) || 1; p.arrow(x, y, x + fx / fm * L0 * 0.8, y + fy / fm * L0 * 0.8, c.pal[1], 'F', { w: 2 });
        label(g, p, p.view.x0 + sp * 0.2, p.view.y1 - sp * 0.4, S.B ? T('· B points out of the screen', '· B خارج الشاشة') : '', c.muted); },
      readout: S => { const r = S.B ? S.m * S.v / (Math.abs(S.q) * S.B) : Infinity, Tp = S.B ? 2 * Math.PI * S.m / (Math.abs(S.q) * S.B) : Infinity; return [[T('radius r = mv/(|q|B)', 'نصف القطر'), f3(r) + ' m'], [T('period T = 2πm/(|q|B)', 'الدورة'), f3(Tp) + ' s'], [T('E×B drift E/B', 'انجراف E/B'), S.B ? f3(S.E / S.B) + ' m/s' : '—']]; },
      intro: S => { const r = S.B ? S.m * S.v / (Math.abs(S.q) * S.B) : Infinity; return S.E ? T(`With both fields the particle loops while drifting sideways at E/B = ${f3(S.E / S.B)} m/s (the E × B drift). Set E = v·B and it travels straight — a velocity selector.`, 'مجالان.') : T(`The magnetic force qv × B is always perpendicular to the velocity, so it bends the path into a circle without changing the speed: r = mv/(|q|B) = ${f3(r)} m, period ${f3(2 * Math.PI * S.m / (Math.abs(S.q) * S.B))} s.`, 'المجال المغناطيسي يحني المسار.'); },
      explain: S => `<p>${T('Lorentz force', 'قوة لورنتز')}: F = q(E + v × B). ${T('Magnetic part ⟂ v → no work, speed constant → circular motion', 'الجزء المغناطيسي عمودي على السرعة')}: qvB = mv²/r ⇒ r = mv/(|q|B), T = 2πm/(|q|B) (${T('independent of speed', 'مستقل عن السرعة')}).</p><p>${T('With E ⟂ B the guiding centre drifts at', 'مع E عمودي على B ينجرف المركز بسرعة')} v_d = E/B ${T('whatever the charge sign', 'مهما كانت إشارة الشحنة')}. ${T('Integrated with RK4; the simulated radius matches mv/(|q|B).', 'تكامل RK4.')}</p>`,
      assume: T('Uniform fields, non-relativistic speeds (v ≪ c), no radiation; B along z, E along y, starting velocity along x.', 'مجالات منتظمة وسرعات غير نسبية.'),
      state: (S, st) => { const xs = st.path.map(q => q[0]), ys = st.path.map(q => q[1]); return { r: S.B ? S.m * S.v / (Math.abs(S.q) * S.B) : null, simDiameterY: Math.max(...ys) - Math.min(...ys), simWidth: Math.max(...xs) - Math.min(...xs), speed: Math.hypot(st.s[2], st.s[3]), v0: S.v, sim: st.sim, T: st.T, x: st.s[0], y: st.s[1] }; },
      command(t, S) { let m; if ((m = t.match(/\bB\s*(?:to|=)\s*(\d*\.?\d+)/i))) { S.B = +m[1]; return { note: 'B = ' + m[1] + ' T' }; } if (/\belectron\b/i.test(t)) { S.particle = 'e'; return { note: T('Electron.', 'إلكترون.') }; } if (/\bproton\b/i.test(t)) { S.particle = 'p'; S.q = 1.602176634e-19; S.m = 1.67262192e-27; return { note: T('Proton.', 'بروتون.') }; } if (/\bvelocity selector|straight\b/i.test(t)) { S.E = S.v * S.B; return { note: 'E = vB' }; } return null; }
    }));

  /* ======================= electromagnetic induction ======================= */
  reg('induction', K.em, T('Electromagnetic induction', 'الحث الكهرومغناطيسي'),
    t => (/\b(electromagnetic induction|faraday'?s law|lenz'?s law|induced (emf|current)|how (does )?(a |an )?(generator|dynamo|alternator) work|magnetic flux)\b/i.test(t) ? { score: 0.95, params: {} } : null),
    { N: { min: 1, max: 5000 }, B: { min: 0, max: 5 }, A: { min: 1e-4, max: 1 }, rpm: { min: 0, max: 6000 } },
    () => ({
      defaults: { N: 100, B: 0.2, A: 0.01, rpm: 60 }, graph: true, equal: true, autoplay: true, h: 1 / 240, tWindow: 3,
      params: [{ key: 'N', label: T('turns N', 'عدد اللفات'), min: 1, max: 500, step: 1 }, { key: 'B', label: T('field B', 'المجال B'), unit: 'T', min: 0.01, max: 1, step: 0.01 }, { key: 'A', label: T('coil area A', 'مساحة الملف'), unit: 'm²', min: 0.001, max: 0.05, step: 0.001 }, { key: 'rpm', label: T('rotation speed', 'سرعة الدوران'), unit: 'rpm', min: 6, max: 600, step: 6 }],
      series: [['emf', T('emf ε (V) and flux NΦ (Wb)', 'القوة الدافعة والتدفق'), [1, 2], null, ['ε', 'NΦ × ω']]], columns: ['emf', 'fluxw'],
      sample: (S, st) => { const w = S.rpm * 2 * Math.PI / 60; return [S.N * S.B * S.A * w * Math.sin(w * st.t), S.N * S.B * S.A * Math.cos(w * st.t) * w]; },
      view: () => ({ x0: -2.2, x1: 2.2, y0: -1.6, y1: 1.6 }), init() {}, step() {},
      draw(g, p, S, st) { const c = L.colors(), w = S.rpm * 2 * Math.PI / 60, th = w * st.t, half = Math.abs(Math.cos(th));
        for (let y = -1.2; y <= 1.21; y += 0.4) p.arrow(-2.1, y, 2.1, y, c.dark ? 'rgba(148,163,184,.35)' : 'rgba(100,116,139,.3)', '', { w: 1 });
        label(g, p, -2.1, 1.4, 'B →', c.muted);
        g.strokeStyle = c.pal[3]; g.lineWidth = 4; g.strokeRect(p.X(-0.9 * half), p.Y(0.9), p.X(0.9 * half) - p.X(-0.9 * half), p.Y(-0.9) - p.Y(0.9));
        const emf = S.N * S.B * S.A * w * Math.sin(th); label(g, p, -1.8, -1.4, `ε = ${f3(emf)} V   Φ = ${f3(S.B * S.A * Math.cos(th))} Wb`, c.ink);
        if (Math.abs(emf) > 1e-9) p.arrow(0.95 * half, 0, 0.95 * half, 0.5 * Math.sign(emf), c.pal[2], 'I', { w: 2.4 }); },
      readout: S => { const w = S.rpm * 2 * Math.PI / 60; return [['ω', f3(w) + ' rad/s'], [T('peak emf NBAω', 'الذروة'), f3(S.N * S.B * S.A * w) + ' V'], [T('frequency', 'التردد'), f3(S.rpm / 60) + ' Hz']]; },
      intro: S => { const w = S.rpm * 2 * Math.PI / 60; return T(`A coil of ${S.N} turns turning in a ${S.B} T field: the flux through it, Φ = BA cos ωt, keeps changing, and Faraday’s law turns that change into an emf ε = −N dΦ/dt = NBAω sin ωt (peak ${f3(S.N * S.B * S.A * w)} V). The emf is largest when the coil is edge-on — when the flux is changing fastest, not when it is largest.`, 'الحث الكهرومغناطيسي.'); },
      explain: S => `<p>${T('Faraday', 'فاراداي')}: ε = −N dΦ/dt. ${T('For a coil turning at ω', 'لملف يدور بسرعة ω')}: Φ = BA cos ωt ⇒ ε = NBAω sin ωt.</p><p>${T('Lenz’s law: the induced current flows so that its own magnetic field opposes the change in flux — which is why it takes work to turn a generator, and that work is the electrical energy produced.', 'قانون لنز.')}</p><p>${T('Double the speed → twice the peak emf and twice the frequency; double N, B or A → twice the emf.', 'مضاعفة السرعة تضاعف القيمة القصوى.')}</p>`,
      assume: T('Uniform field, rigid rectangular coil, open circuit (no current loading); the graph shows NΦ scaled by ω so both curves share an axis.', 'مجال منتظم.'),
      state: (S, st) => { const w = S.rpm * 2 * Math.PI / 60; return { peak: S.N * S.B * S.A * w, emf: S.N * S.B * S.A * w * Math.sin(w * st.t), t: st.t }; },
      command(t, S) { if (/\b(faster|double the speed)\b/i.test(t)) { S.rpm *= 2; return { note: f3(S.rpm) + ' rpm' }; } if (/\bslower\b/i.test(t)) { S.rpm /= 2; return { note: f3(S.rpm) + ' rpm' }; } return null; }
    }));

  /* ======================= supply and demand ======================= */
  reg('market', K.econ, T('Supply and demand', 'العرض والطلب'),
    t => (/\b(supply and demand|demand and supply|market equilibrium|equilibrium price|price ceiling|price floor|consumer surplus|producer surplus|shortage|surplus)\b/i.test(t) && !/\bbreak[- ]?even\b/i.test(t) ? { score: 0.95, params: {} } : null),
    { a: { min: 0, max: 1e6 }, b: { min: 0.01, max: 1e4 }, c: { min: -1e6, max: 1e6 }, d: { min: 0.01, max: 1e4 }, ctl: { min: 0, max: 1e6 } },
    () => ({
      defaults: { a: 100, b: 2, c: 10, d: 1, ctl: 0, ctlKind: 'none' }, static: true, autoplay: false, graph: false, equal: false, labels: { x: T('quantity Q', 'الكمية'), y: T('price P', 'السعر') },
      params: [{ key: 'a', label: T('demand: buyers at P = 0', 'الطلب عند سعر صفر'), min: 20, max: 200, step: 1 }, { key: 'b', label: T('demand slope (fewer bought per +1 price)', 'ميل الطلب'), min: 0.2, max: 6, step: 0.1 }, { key: 'c', label: T('supply at P = 0', 'العرض عند سعر صفر'), min: -40, max: 60, step: 1 }, { key: 'd', label: T('supply slope', 'ميل العرض'), min: 0.2, max: 6, step: 0.1 }, { key: 'ctl', label: T('price control level', 'مستوى التحكم بالسعر'), min: 0, max: 80, step: 1 }],
      selects: [{ key: 'ctlKind', label: T('Price control', 'التحكم بالسعر'), num: false, options: [['none', T('none', 'لا يوجد')], ['ceiling', T('price ceiling', 'سقف سعري')], ['floor', T('price floor', 'حد أدنى للسعر')]] }],
      view: S => ({ x0: 0, x1: Math.max(S.a, S.c + S.d * 60) * 1.05, y0: 0, y1: Math.max(S.a / S.b, 60) * 1.05 }),
      init(S, st) { st.P = (S.a - S.c) / (S.b + S.d); st.Q = S.a - S.b * st.P; }, step() {},
      draw(g, p, S, st) { const c = L.colors(), Pmax = S.a / S.b; const D = P => S.a - S.b * P, Sp = P => S.c + S.d * P;
        g.fillStyle = 'rgba(37,99,235,.18)'; g.beginPath(); g.moveTo(p.X(0), p.Y(Pmax)); g.lineTo(p.X(st.Q), p.Y(st.P)); g.lineTo(p.X(0), p.Y(st.P)); g.closePath(); g.fill();
        g.fillStyle = 'rgba(22,163,74,.18)'; g.beginPath(); g.moveTo(p.X(0), p.Y(st.P)); g.lineTo(p.X(st.Q), p.Y(st.P)); const P0 = Math.max(0, -S.c / S.d); g.lineTo(p.X(Math.max(0, Sp(P0))), p.Y(P0)); g.lineTo(p.X(0), p.Y(P0)); g.closePath(); g.fill();
        const pts = (f, P0, P1) => Array.from({ length: 50 }, (_, i) => { const P = P0 + (P1 - P0) * i / 49; return [f(P), P]; }).filter(q => q[0] >= 0);
        p.path(pts(D, 0, Pmax), c.pal[0], { w: 2.6 }); p.path(pts(Sp, 0, p.view.y1), c.pal[1], { w: 2.6 });
        p.dot(st.Q, st.P, c.ink, `E: P* = ${f3(st.P)}, Q* = ${f3(st.Q)}`, { r: 6, bold: true }); label(g, p, pts(D, 0, Pmax)[3][0], pts(D, 0, Pmax)[3][1], ' D', c.pal[0]); label(g, p, Sp(p.view.y1 * 0.9), p.view.y1 * 0.9, ' S', c.pal[1]);
        if (S.ctlKind !== 'none' && S.ctl > 0) { p.path([[0, S.ctl], [p.view.x1, S.ctl]], c.pal[3], { w: 2, dash: [6, 4] }); const qd = D(S.ctl), qs = Sp(S.ctl); p.path([[qs, S.ctl], [qd, S.ctl]], c.pal[3], { w: 5 }); label(g, p, Math.min(qd, qs), S.ctl + p.view.y1 * 0.03, qd > qs ? `${T('shortage', 'نقص')} ${f3(qd - qs)}` : `${T('surplus', 'فائض')} ${f3(qs - qd)}`, c.pal[3]); }
        label(g, p, p.view.x1 * 0.02, st.P + (Pmax - st.P) * 0.25, T('consumer surplus', 'فائض المستهلك'), c.pal[0], { font: '11px ui-sans-serif' }); },
      readout: (S, st) => { const Pmax = S.a / S.b, cs = 0.5 * st.Q * (Pmax - st.P), P0 = Math.max(0, -S.c / S.d), ps = 0.5 * (st.P - P0) * (st.Q + Math.max(0, S.c + S.d * P0)); return [['P*', f3(st.P)], ['Q*', f3(st.Q)], [T('consumer surplus', 'فائض المستهلك'), f3(cs)], [T('producer surplus', 'فائض المنتج'), f3(ps)], [T('price elasticity of demand at E', 'مرونة الطلب'), f3(-S.b * st.P / st.Q)]]; },
      intro: (S, st) => T(`Demand Q = ${S.a} − ${S.b}P falls as price rises; supply Q = ${S.c} + ${S.d}P rises. They cross at the equilibrium price P* = ${f3(st.P)} with Q* = ${f3(st.Q)} traded. Shift either curve with the sliders, or add a price ceiling or floor, and watch shortages or surpluses appear.`, 'العرض والطلب.'),
      explain: (S, st) => `<p>${T('Equilibrium: quantity demanded = quantity supplied', 'التوازن')}: ${S.a} − ${S.b}P = ${S.c} + ${S.d}P ⇒ P* = (${S.a} − ${S.c})/(${S.b} + ${S.d}) = <b>${f3(st.P)}</b>, Q* = <b>${f3(st.Q)}</b>.</p><ul><li>${T('A rise in demand (higher a) shifts D right: both P* and Q* rise.', 'زيادة الطلب ترفع السعر والكمية.')}</li><li>${T('A rise in supply (higher c) shifts S right: P* falls, Q* rises.', 'زيادة العرض تخفض السعر.')}</li><li>${T('A ceiling below P* causes a shortage; a floor above P* causes a surplus.', 'السقف تحت التوازن يسبب نقصاً.')}</li></ul><p>${T('Point elasticity at E', 'المرونة عند التوازن')}: ε = (dQ/dP)(P/Q) = ${f3(-S.b * st.P / st.Q)}.</p>`,
      assume: T('Linear demand and supply, a single competitive market, other things equal (ceteris paribus). Numbers are illustrative, in arbitrary units.', 'نموذج خطي بأرقام توضيحية.'),
      state: (S, st) => ({ P: st.P, Q: st.Q, a: S.a, b: S.b, c: S.c, d: S.d }),
      command(t, S) { const sm = t.match(/\bset\b[^.]*?\b([abcd])\s*(?:to|=)\s*(-?\d+(?:\.\d+)?)/i); if (sm) { S[sm[1].toLowerCase()] = +sm[2]; return { note: `Set ${sm[1].toLowerCase()} = ${sm[2]}.` }; } if (/\b(increase|rise|more) (in )?demand|demand (rises|increases)\b/i.test(t)) { S.a *= 1.2; return { note: T('Demand shifted right.', 'زاد الطلب.') }; } if (/\b(decrease|fall) (in )?demand|demand (falls|decreases)\b/i.test(t)) { S.a *= 0.8; return { note: T('Demand shifted left.', 'انخفض الطلب.') }; } if (/\b(increase|rise|more) (in )?supply|supply (rises|increases)\b/i.test(t)) { S.c += 15; return { note: T('Supply shifted right.', 'زاد العرض.') }; } if (/\b(decrease|fall) (in )?supply|supply (falls|decreases)\b/i.test(t)) { S.c -= 15; return { note: T('Supply shifted left.', 'انخفض العرض.') }; } let m; if ((m = t.match(/price (ceiling|cap|floor)\s*(?:of|at)?\s*(\d+(?:\.\d+)?)/i))) { S.ctlKind = /floor/i.test(m[1]) ? 'floor' : 'ceiling'; S.ctl = +m[2]; return { note: m[1] + ' ' + m[2] }; } return null; }
    }));

  /* ======================= Atwood machine ======================= */
  reg('atwood', K.mech, T('Pulley with two hanging masses', 'بكرة بكتلتين معلقتين'),
    t => { if (!/\b(atwood|pulley)\b/i.test(t) || /\btable|incline|slope|horizontal\b/i.test(t)) return null; const ks = [...String(t).matchAll(/(\d+(?:\.\d+)?)\s*kg\b/gi)].map(m => +m[1]); return { score: ks.length >= 2 || /\b(how (does|do) (a )?pulley|two (blocks|masses))\b/i.test(t) ? 0.97 : 0.9, params: { set: Object.assign(ks[0] ? { m1: ks[0] } : {}, ks[1] ? { m2: ks[1] } : {}, ks[2] ? { M: ks[2] } : {}) } }; },
    { m1: { min: 0.01, max: 100 }, m2: { min: 0.01, max: 100 }, M: { min: 0, max: 100 } },
    () => ({
      defaults: { m1: 2, m2: 3, M: 0, R: 0.15, g: 9.81, fbd: true }, graph: true, equal: true, autoplay: true, h: 1 / 600, every: 6,
      params: [{ key: 'm1', label: T('left mass m₁', 'الكتلة اليسرى'), unit: 'kg', min: 0.1, max: 20, step: 0.1 }, { key: 'm2', label: T('right mass m₂', 'الكتلة اليمنى'), unit: 'kg', min: 0.1, max: 20, step: 0.1 }, { key: 'M', label: T('pulley mass M (disc)', 'كتلة البكرة'), unit: 'kg', min: 0, max: 20, step: 0.1 }],
      toggles: [{ key: 'fbd', label: T('Free-body diagrams', 'مخططات الجسم الحر'), live: true }],
      series: [['v', T('speed (m/s)', 'السرعة'), 1, (S, t) => Math.abs(sol(S).a) * t, ['v']]], columns: ['v', 'x'], sample: (S, st) => [Math.abs(st.v), st.x],
      view: () => ({ x0: -1.6, x1: 1.6, y0: -2.6, y1: 0.6 }),
      init(S, st) { st.x = 0; st.v = 0; st.r = sol(S); st.done = false; },
      step(S, st, h) { const a = st.r.a; st.x += st.v * h + 0.5 * a * h * h; st.v += a * h; if (Math.abs(st.x) > 0.8) { st.x = 0.8 * Math.sign(st.x); st.done = true; } },
      draw(g, p, S, st) { const c = L.colors(), R = 0.3, y1 = -1.2 + st.x, y2 = -1.2 - st.x;
        p.path([[-1, 0.45], [1, 0.45]], c.muted, { w: 4 }); p.path([[0, 0.45], [0, 0.2]], c.muted, { w: 2 });
        g.strokeStyle = c.ink; g.lineWidth = 2; g.beginPath(); g.arc(p.X(0), p.Y(0), Math.abs(p.X(R) - p.X(0)), 0, 7); g.stroke();
        p.path([[-R, 0], [-R, y1]], c.ink, { w: 1.6 }); p.path([[R, 0], [R, y2]], c.ink, { w: 1.6 });
        const box = (x, y, m, col) => { const s = 0.12 + Math.sqrt(m) * 0.05; g.fillStyle = col; const X0 = p.X(x - s), Y0 = p.Y(y); g.fillRect(X0, Y0, p.X(x + s) - X0, p.Y(y - 2 * s) - Y0); label(g, p, x - s + 0.02, y - s - 0.03, `${m} kg`, c.bg); return s; };
        const s1 = box(-R, y1, S.m1, c.pal[0]), s2 = box(R, y2, S.m2, c.pal[1]);
        if (S.fbd) { const k = 0.045; p.arrow(-R - s1 - 0.1, y1 - s1, -R - s1 - 0.1, y1 - s1 + st.r.T1 * k, c.pal[2], `T₁ ${f3(st.r.T1)} N`); p.arrow(-R - s1 - 0.1, y1 - s1, -R - s1 - 0.1, y1 - s1 - S.m1 * S.g * k, c.pal[3], `m₁g ${f3(S.m1 * S.g)} N`); p.arrow(R + s2 + 0.1, y2 - s2, R + s2 + 0.1, y2 - s2 + st.r.T2 * k, c.pal[2], `T₂ ${f3(st.r.T2)} N`); p.arrow(R + s2 + 0.1, y2 - s2, R + s2 + 0.1, y2 - s2 - S.m2 * S.g * k, c.pal[3], `m₂g ${f3(S.m2 * S.g)} N`); } },
      readout: (S, st) => [['a', f3(Math.abs(st.r.a)) + ' m/s²'], ['T₁', f3(st.r.T1) + ' N'], ['T₂', f3(st.r.T2) + ' N'], [T('heavier side', 'الجانب الأثقل'), S.m2 > S.m1 ? T('right goes down', 'الأيمن يهبط') : S.m1 > S.m2 ? T('left goes down', 'الأيسر يهبط') : T('balanced', 'متوازن')]],
      intro: (S, st) => T(`Two masses hang over a pulley: ${S.m1} kg and ${S.m2} kg. The heavier side falls with a = (m₂ − m₁)g / (m₁ + m₂${S.M ? ' + M/2' : ''}) = ${f3(Math.abs(st.r.a))} m/s², and the string tension is ${f3(st.r.T1)} N${S.M ? ` on the left and ${f3(st.r.T2)} N on the right (they differ because the pulley has mass)` : ' on both sides'}. The free-body diagrams show every force.`, 'آلة أتوود.'),
      explain: (S, st) => `<p>${T('Newton’s second law for each mass (taking “right side down” as positive)', 'قانون نيوتن الثاني لكل كتلة')}:</p><ul><li>m₁: T₁ − m₁g = m₁a</li><li>m₂: m₂g − T₂ = m₂a</li>${S.M ? `<li>${T('pulley (disc, I = ½MR²)', 'البكرة')}: (T₂ − T₁)R = Iα, α = a/R</li>` : `<li>${T('ideal (massless, frictionless) pulley', 'بكرة مثالية')}: T₁ = T₂</li>`}</ul><p>${T('Adding the equations', 'بجمع المعادلات')}: a = (m₂ − m₁)g / (m₁ + m₂ + I/R²) = <b>${f3(st.r.a)} m/s²</b>; T₁ = m₁(g + a) = <b>${f3(st.r.T1)} N</b>${S.M ? `, T₂ = m₂(g − a) = <b>${f3(st.r.T2)} N</b>` : ''}.</p><p>${T('Check: if m₁ = m₂, a = 0 and T = mg; if one mass is far heavier, a → g.', 'تحقق: الكتلتان المتساويتان تعطيان a = 0.')}</p>`,
      assume: T('Light, inextensible string that does not slip; frictionless axle; pulley a uniform disc when it has mass; g = 9.81 m/s²; no air resistance.', 'خيط خفيف غير قابل للمط.'),
      state: (S, st) => ({ m1: S.m1, m2: S.m2, M: S.M, a: st.r.a, T1: st.r.T1, T2: st.r.T2, x: st.x, v: st.v, t: st.t }),
      command(t, S) { let m; if ((m = t.match(/(?:left|first|m1|m₁)[^\d]{0,20}(\d+(?:\.\d+)?)\s*kg/i))) { S.m1 = +m[1]; return { note: 'm₁ = ' + m[1] + ' kg' }; } if ((m = t.match(/(?:right|second|m2|m₂)[^\d]{0,20}(\d+(?:\.\d+)?)\s*kg/i))) { S.m2 = +m[1]; return { note: 'm₂ = ' + m[1] + ' kg' }; } if (/\bmassless pulley|ideal pulley\b/i.test(t)) { S.M = 0; return { note: 'M = 0' }; } if (/\bequal masses\b/i.test(t)) { S.m2 = S.m1; return { note: T('Equal masses.', 'كتلتان متساويتان.') }; } return null; }
    }));
  function sol(S) { const I = 0.5 * S.M * S.R * S.R, a = (S.m2 - S.m1) * S.g / (S.m1 + S.m2 + I / (S.R * S.R)); return { a, T1: S.m1 * (S.g + a), T2: S.m2 * (S.g - a), I }; }

  /* ======================= potential and field around a point charge ======================= */
  const KC = 8.9875517923e9;
  reg('radial', K.em, T('Potential and field of a point charge', 'الجهد والمجال لشحنة نقطية'),
    t => (/\b(electric )?potential\b(?:[^.]|\.\d)*\b(point charge|distance|farther|further|away)\b|\b(electric field|field strength)\b(?:[^.]|\.\d)*\b(distance|farther|further|inverse square)\b|\binverse[- ]square\b(?:[^.]|\.\d)*\b(charge|electric)\b|\bhow (do|does) electric fields? work\b/i.test(t) ? { score: 0.95, params: {} } : null),
    { q: { min: -1e-3, max: 1e-3 }, r: { min: 0.01, max: 100 } },
    () => ({
      defaults: { q: 1e-9, r: 1 }, static: true, autoplay: false, graph: true, equal: true,
      params: [{ key: 'q', label: T('charge q', 'الشحنة q'), unit: 'C', min: -5e-9, max: 5e-9, step: 1e-10 }, { key: 'r', label: T('distance r', 'المسافة r'), unit: 'm', min: 0.1, max: 5, step: 0.01 }],
      view: () => ({ x0: -5.5, x1: 5.5, y0: -4, y1: 4 }), init() {}, step() {},
      onDown: () => ({}), onDrag: (S, st, x, y) => { S.r = Math.max(0.1, Math.min(5, Math.hypot(x, y))); },
      draw(g, p, S) { const c = L.colors(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; const d = S.q >= 0 ? 1 : -1; p.arrow(Math.cos(a) * (d > 0 ? 0.4 : 3.6), Math.sin(a) * (d > 0 ? 0.4 : 3.6), Math.cos(a) * (d > 0 ? 3.6 : 0.4), Math.sin(a) * (d > 0 ? 3.6 : 0.4), c.dark ? 'rgba(226,232,240,.4)' : 'rgba(30,41,59,.3)', '', { w: 1.2 }); }
        [1, 2, 3].forEach(r => { g.strokeStyle = c.pal[4]; g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.arc(p.X(0), p.Y(0), Math.abs(p.X(r) - p.X(0)), 0, 7); g.stroke(); g.setLineDash([]); });
        p.dot(0, 0, S.q >= 0 ? '#dc2626' : '#2563eb', S.q >= 0 ? '+q' : '−q', { r: 10, bold: true }); p.dot(S.r, 0, c.pal[3], `P: r = ${f3(S.r)} m`, { r: 6, bold: true });
        label(g, p, -5.3, 3.6, T('dashed circles: equipotentials (V constant)', 'الدوائر المتقطعة: تساوي الجهد'), c.muted); },
      graphDraw(g, p, S) { const c = L.colors(), V = r => KC * S.q / r, E = r => KC * Math.abs(S.q) / (r * r); const V1 = Math.abs(V(0.3)); p.view = { x0: 0, x1: 5, y0: S.q >= 0 ? 0 : -V1, y1: S.q >= 0 ? V1 : V1 * 0.1 }; p.labels = { x: 'r (m)', y: 'V (V)' }; p.grid(); p.fn(r => (r > 0.05 ? V(r) : NaN), c.pal[0], { w: 2.4 }); p.fn(r => (r > 0.05 ? E(r) * (S.q >= 0 ? 1 : -1) : NaN), c.pal[1], { w: 1.8, dash: [5, 4] }); p.dot(S.r, V(S.r), c.pal[3], '', { r: 5 }); p.text(3, V(3) + V1 * 0.08, 'V = kq/r', c.pal[0]); p.text(1.2, E(1.6) * (S.q >= 0 ? 1 : -1), '|E| = kq/r² (dashed)', c.pal[1]); },
      readout: S => [['V(r) = kq/r', f3(KC * S.q / S.r) + ' V'], ['|E(r)| = k|q|/r²', f3(KC * Math.abs(S.q) / (S.r * S.r)) + ' N/C'], [T('if r doubles', 'إذا تضاعفت r'), T('V halves, E quarters', 'V تنصف وE تقل للربع')]],
      intro: S => T(`Around a point charge the potential falls as 1/r and the field as 1/r². At r = ${f3(S.r)} m from ${f3(S.q * 1e9)} nC: V = ${f3(KC * S.q / S.r)} V and |E| = ${f3(KC * Math.abs(S.q) / (S.r * S.r))} N/C. Move twice as far and V halves while E drops to a quarter. Drag point P to see it.`, 'الجهد والمجال.'),
      explain: S => `<p>V(r) = kq/r, E(r) = kq/r², k = 8.988×10⁹ N·m²/C². ${T('The field is the downhill slope of the potential', 'المجال هو انحدار الجهد')}: E = −dV/dr. ${T('Field lines point away from + and towards −; equipotentials are the circles at right angles to them.', 'خطوط المجال تبتعد عن الموجبة.')}</p><p>${T('Check at the current point', 'تحقق عند النقطة')}: −dV/dr = ${f3(-N.deriv(r => KC * S.q / r, S.r))} N/C = E.</p>`,
      assume: T('A single point charge in vacuum; V is measured from zero at infinity.', 'شحنة نقطية في الفراغ.'),
      state: S => ({ q: S.q, r: S.r, V: KC * S.q / S.r, E: KC * Math.abs(S.q) / (S.r * S.r) }),
      command(t, S) { if (/\b(double|twice)\b.*\b(distance|far)\b/i.test(t)) { S.r = Math.min(5, S.r * 2); return { note: 'r = ' + f3(S.r) + ' m' }; } if (/\bnegative\b/i.test(t)) { S.q = -Math.abs(S.q); return { note: T('Negative charge.', 'شحنة سالبة.') }; } return null; }
    }));

  /* ======================= 3D harness ======================= */
  async function harness3d(ctx, def) {
    const { THREE, Orbit } = await L.libs.three();
    const S = Object.assign({}, def.defaults, ctx.params.set || {});
    const host = ctx.stage, side = ctx.side;
    host.classList.add('lab-split'); if (!def.panel) host.classList.add('lab-split--one');
    const sceneEl = ui.el('div', 'lab-scene'), panelEl = ui.el('div', 'lab-graph'); host.append(sceneEl); if (def.panel) host.append(panelEl);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.domElement.className = 'lab-cv lab-gl'; renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', def.alt ? def.alt(S) : 'Interactive 3D model'); sceneEl.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, 0.05, 500); cam.position.set(...(def.camera || [7, 5, 8])); cam.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6)); const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(5, 10, 7); scene.add(dl); const dl2 = new THREE.DirectionalLight(0xffffff, 0.3); dl2.position.set(-6, -3, -5); scene.add(dl2);
    const controls = new Orbit(cam, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08;
    const root = new THREE.Group(); scene.add(root);
    const M3 = (x, y, z) => new THREE.Vector3(x, z, -y); // maths (x, y, z), z up
    const sprite = (text, pos, color, scale) => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.font = '600 30px ui-sans-serif, system-ui'; g.fillStyle = color || L.colors().ink; g.textAlign = 'center'; g.fillText(text, 128, 42); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); sp.position.copy(pos); sp.scale.set(2 * (scale || 1), 0.5 * (scale || 1), 1); return sp; };
    const H = { THREE, M3, sprite, root, scene, cam };
    const Pl = def.panel ? new L.Plot(panelEl, { equal: def.panelEqual !== false, pan: false, zoom: false, labels: def.panelLabels || { x: '', y: '' } }) : null;
    if (Pl) Pl.draw = (g, p) => def.panel(g, p, S, H);
    function build() { while (root.children.length) { const o = root.children.pop(); o.traverse && o.traverse(m => { m.geometry && m.geometry.dispose(); m.material && (Array.isArray(m.material) ? m.material.forEach(x => x.dispose()) : m.material.dispose()); }); } scene.background = new THREE.Color(L.colors().bg); def.build(S, H); Pl && Pl.render(); L.hud(def.readout ? ui.readout(def.readout(S, H)) : ''); }
    function resize() { const r = sceneEl.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, Math.max(200, r.height), false); renderer.domElement.style.width = r.width + 'px'; renderer.domElement.style.height = Math.max(200, r.height) + 'px'; cam.aspect = r.width / Math.max(200, r.height); cam.updateProjectionMatrix(); }
    const ro = new ResizeObserver(resize); ro.observe(sceneEl);
    const mo = new MutationObserver(() => build()); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    let dead = false, raf = 0; const loop = () => { if (dead) return; controls.update(); if (S.spin) root.rotation.y += 0.006; renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
    const sliders = {};
    const pg = ui.group(T('Parameters', 'المعاملات'));
    (def.params || []).forEach(q => { const s = ui.slider({ key: q.key, label: q.label + (q.unit ? ` (${q.unit})` : ''), min: q.min, max: q.max, step: q.step, value: S[q.key], on: v => { S[q.key] = v; build(); L.explainNow(); } }); sliders[q.key] = s; pg.appendChild(s); });
    (def.selects || []).forEach(q => pg.appendChild(ui.select({ key: q.key, label: q.label, value: S[q.key], options: q.options, on: v => { S[q.key] = v; if (q.onSet) q.onSet(S); build(); L.explainNow(); } })));
    (def.toggles || []).forEach(q => pg.appendChild(ui.toggle({ key: q.key, label: q.label, value: S[q.key], on: v => { S[q.key] = v; build(); } })));
    pg.appendChild(ui.buttons([[T('Reset view', 'إعادة المنظر'), () => { cam.position.set(...(def.camera || [7, 5, 8])); controls.target.set(0, 0, 0); }, { key: 'view' }], [T('Spin', 'تدوير'), () => { S.spin = !S.spin; }, { key: 'spin' }]]));
    side.appendChild(pg);
    if (def.note) side.appendChild(ui.el('p', 'lab-sub lab-assume', '⚠︎ ' + def.note));
    resize(); build(); loop();
    return {
      api: { S, set: (k, v) => { S[k] = v; if (sliders[k]) sliders[k].set(v); build(); }, init: build, redraw: build, cam, controls },
      intro: () => def.intro(S), summary: () => def.intro(S),
      explain: () => (def.explain ? def.explain(S) : '') + (def.assume ? `<details class="lab-more"><summary>${T('Assumptions and limits of this model', 'افتراضات النموذج وحدوده')}</summary><p>${def.assume}</p></details>` : ''),
      command: t => { const r = def.command ? def.command(t, S) : null; if (r) { Object.keys(sliders).forEach(k => sliders[k].set(S[k])); build(); } return r; },
      state: () => Object.assign({ camera: cam.position.toArray().map(v => +v.toFixed(3)) }, def.state ? def.state(S) : { params: Object.assign({}, S) }),
      canvas: () => { renderer.render(scene, cam); return renderer.domElement; },
      params: () => (def.params || []).map(q => ({ key: q.key, label: q.label, unit: q.unit, alias: q.alias })), get: k => S[k], set: (k, v) => { S[k] = v; if (sliders[k]) sliders[k].set(v); build(); },
      reset: () => L.open(ctx.id, ctx.params), redraw: () => build(),
      destroy: () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); Pl && Pl.destroy(); host.classList.remove('lab-split', 'lab-split--one'); }
    };
  }
  L.harness3d = harness3d;
  const line3 = (H, pts, color, w) => { const g = new H.THREE.BufferGeometry().setFromPoints(pts); return new H.THREE.Line(g, new H.THREE.LineBasicMaterial({ color, linewidth: w || 1 })); };
  const axes3 = (H, L0) => { const c = L.colors(); [[H.M3(L0, 0, 0), '#ef4444', 'x'], [H.M3(0, L0, 0), '#22c55e', 'y'], [H.M3(0, 0, L0), '#3b82f6', 'z']].forEach(([v, col, n]) => { H.root.add(line3(H, [v.clone().multiplyScalar(-1), v], col)); H.root.add(H.sprite(n, v.clone().multiplyScalar(1.08), col, 0.7)); }); void c; };

  /* ======================= sphere ∩ plane (3D) ======================= */
  reg('sphereplane', K.geo3, T('A plane cutting a sphere', 'مستوى يقطع كرة'),
    t => (/\b(plane)\b[^.]*\b(sphere|ball)\b|\b(sphere)\b[^.]*\b(plane)\b/i.test(t) && /\b(intersect\w*|cut\w*|cross[- ]section|meet|slice)\b/i.test(t) ? { score: 0.97, params: { set: Object.assign({}, num(t, /radius\s*(\d+(?:\.\d+)?)/i, null) ? { R: num(t, /radius\s*(\d+(?:\.\d+)?)/i, 3) } : {}) } } : null),
    { R: { min: 0.1, max: 50 }, d: { min: -50, max: 50 }, tilt: { min: 0, max: 180 }, turn: { min: -360, max: 360 } },
    () => ({
      defaults: { R: 3, d: 1.5, tilt: 25, turn: 30 }, camera: [8, 6, 9],
      params: [{ key: 'R', label: T('sphere radius R', 'نصف قطر الكرة'), min: 0.5, max: 5, step: 0.1 }, { key: 'd', label: T('plane distance from centre d', 'بُعد المستوى عن المركز'), min: -6, max: 6, step: 0.05 }, { key: 'tilt', label: T('plane tilt', 'ميل المستوى'), unit: '°', min: 0, max: 90, step: 1 }, { key: 'turn', label: T('plane turn', 'دوران المستوى'), unit: '°', min: 0, max: 360, step: 1 }],
      panel: (g, p, S) => { const c = L.colors(), r2 = S.R * S.R - S.d * S.d, r = r2 > 0 ? Math.sqrt(r2) : 0; p.view = { x0: -S.R * 1.3, x1: S.R * 1.3, y0: -S.R * 1.3, y1: S.R * 1.3 }; p.fit(); p.labels = { x: T('in-plane u', 'u'), y: T('in-plane v', 'v') }; p.grid(); g.strokeStyle = c.muted; g.setLineDash([4, 4]); g.beginPath(); g.arc(p.X(0), p.Y(0), Math.abs(p.X(S.R) - p.X(0)), 0, 7); g.stroke(); g.setLineDash([]); if (r > 0) { g.strokeStyle = c.pal[1]; g.lineWidth = 3; g.beginPath(); g.arc(p.X(0), p.Y(0), Math.abs(p.X(r) - p.X(0)), 0, 7); g.stroke(); p.text(-S.R * 1.25, S.R * 1.15, `${T('cross-section: circle r =', 'المقطع: دائرة r =')} ${f3(r)}`, c.pal[1]); } else p.text(-S.R * 1.25, S.R * 1.15, Math.abs(S.d) === S.R ? T('touches at one point', 'يمس في نقطة') : T('no intersection (|d| > R)', 'لا تقاطع'), c.pal[3]); },
      build(S, H) { const { THREE, M3, root } = H, c = L.colors(); axes3(H, S.R * 1.7);
        const a = S.tilt * Math.PI / 180, b = S.turn * Math.PI / 180, n = [Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)];
        root.add(new THREE.Mesh(new THREE.SphereGeometry(S.R, 64, 40), new THREE.MeshStandardMaterial({ color: c.pal[0], transparent: true, opacity: 0.35, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false })));
        root.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(S.R, 18, 12)), new THREE.LineBasicMaterial({ color: c.pal[0], transparent: true, opacity: 0.25 })));
        const nv = M3(...n).normalize(), pl = new THREE.Mesh(new THREE.PlaneGeometry(S.R * 3.2, S.R * 3.2), new THREE.MeshStandardMaterial({ color: c.pal[3], transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
        pl.lookAt(nv); pl.position.copy(nv.clone().multiplyScalar(S.d)); root.add(pl);
        root.add(new THREE.ArrowHelper(nv, new THREE.Vector3(0, 0, 0), S.R * 1.4, new THREE.Color(c.pal[4]).getHex()));
        const r2 = S.R * S.R - S.d * S.d;
        if (r2 > 0) { const r = Math.sqrt(r2), u = new THREE.Vector3(1, 0, 0); if (Math.abs(u.dot(nv)) > 0.9) u.set(0, 1, 0); u.sub(nv.clone().multiplyScalar(u.dot(nv))).normalize(); const v = new THREE.Vector3().crossVectors(nv, u); const ctr = nv.clone().multiplyScalar(S.d); const pts = Array.from({ length: 129 }, (_, i) => { const t = i / 128 * Math.PI * 2; return ctr.clone().add(u.clone().multiplyScalar(r * Math.cos(t))).add(v.clone().multiplyScalar(r * Math.sin(t))); }); const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, Math.max(0.02, S.R * 0.012), 8, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(c.pal[1]) })); root.add(tube); root.add(H.sprite(`r = ${f3(r)}`, ctr.clone().add(u.clone().multiplyScalar(r * 1.15)), c.pal[1], 0.8)); } },
      readout: S => { const r2 = S.R * S.R - S.d * S.d, a = S.tilt * Math.PI / 180, b = S.turn * Math.PI / 180, n = [Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)]; return [[T('plane', 'المستوى'), `${f3(n[0])}x + ${f3(n[1])}y + ${f3(n[2])}z = ${f3(S.d)}`], [T('circle radius √(R² − d²)', 'نصف قطر الدائرة'), r2 > 0 ? f3(Math.sqrt(r2)) : '—'], [T('circle centre', 'مركز الدائرة'), `(${n.map(x => f3(x * S.d)).join(', ')})`]]; },
      intro: S => { const r2 = S.R * S.R - S.d * S.d; return r2 > 0 ? T(`A plane at distance d = ${S.d} from the centre of a sphere of radius ${S.R} cuts it in a circle of radius √(R² − d²) = ${f3(Math.sqrt(r2))}. Rotate the scene, tilt or move the plane, and watch the circle (and the flat cross-section beside it) change — it vanishes when |d| > R.`, 'مستوى يقطع كرة.') : T(`With |d| = ${Math.abs(S.d)} ≥ R = ${S.R} the plane ${Math.abs(S.d) === S.R ? 'just touches the sphere (a tangent plane)' : 'misses the sphere'}. Move it closer to see the intersection circle.`, 'لا تقاطع.'); },
      explain: S => `<p>${T('Sphere', 'الكرة')}: x² + y² + z² = R². ${T('Plane', 'المستوى')}: n·x = d ${T('with unit normal n', 'بمتجه عمودي وحدة')}. ${T('The distance from the centre to the plane is |d|; by Pythagoras every point of the intersection is √(R² − d²) from the foot of the perpendicular, so the intersection is a circle of radius', 'بفيثاغورس نصف القطر')} <b>r = √(R² − d²)</b>${S.R * S.R - S.d * S.d > 0 ? ` = ${f3(Math.sqrt(S.R * S.R - S.d * S.d))}` : ''}, ${T('centred at', 'مركزها')} d·n.</p><ul><li>|d| &lt; R: ${T('a circle', 'دائرة')}</li><li>|d| = R: ${T('one point (tangent plane)', 'نقطة تماس')}</li><li>|d| &gt; R: ${T('no intersection', 'لا تقاطع')}</li></ul>`,
      assume: T('Exact geometry; drawn with a mesh of 64 × 40 segments.', 'هندسة دقيقة.'),
      state: S => { const r2 = S.R * S.R - S.d * S.d; return { R: S.R, d: S.d, tilt: S.tilt, turn: S.turn, circleR: r2 > 0 ? Math.sqrt(r2) : null }; },
      command(t, S) { let m; if ((m = t.match(/\bd\s*(?:to|=)\s*(-?\d+(?:\.\d+)?)|move the plane (?:to|out to)\s*(-?\d+(?:\.\d+)?)/i))) { S.d = +(m[1] || m[2]); return { note: 'd = ' + S.d }; } if ((m = t.match(/\btilt\s*(?:to|=|it by)?\s*(\d+(?:\.\d+)?)/i))) { S.tilt = +m[1]; return { note: 'tilt = ' + m[1] + '°' }; } if (/\btangent\b/i.test(t)) { S.d = S.R; return { note: T('Tangent plane.', 'مستوى مماس.') }; } return null; }
    }), true);

  /* ======================= VSEPR molecular geometry (3D) ======================= */
  // positions are unit directions; measured angles are standard gas-phase values (rounded); ideal angles from VSEPR
  const MOL = {
    nh3: { name: 'NH₃ (ammonia)', center: 'N', sub: 'H', bonds: 3, lone: 1, shape: T('trigonal pyramidal', 'هرمي ثلاثي'), electron: T('tetrahedral (4 electron domains)', 'رباعي الأوجه'), ideal: 109.5, measured: 106.7 },
    h2o: { name: 'H₂O (water)', center: 'O', sub: 'H', bonds: 2, lone: 2, shape: T('bent', 'منحنٍ'), electron: T('tetrahedral (4 electron domains)', 'رباعي الأوجه'), ideal: 109.5, measured: 104.5 },
    ch4: { name: 'CH₄ (methane)', center: 'C', sub: 'H', bonds: 4, lone: 0, shape: T('tetrahedral', 'رباعي الأوجه'), electron: T('tetrahedral', 'رباعي الأوجه'), ideal: 109.5, measured: 109.5 },
    co2: { name: 'CO₂ (carbon dioxide)', center: 'C', sub: 'O', bonds: 2, lone: 0, shape: T('linear', 'خطي'), electron: T('linear (2 domains; double bonds count once)', 'خطي'), ideal: 180, measured: 180 },
    bf3: { name: 'BF₃ (boron trifluoride)', center: 'B', sub: 'F', bonds: 3, lone: 0, shape: T('trigonal planar', 'مستوٍ ثلاثي'), electron: T('trigonal planar', 'مستوٍ ثلاثي'), ideal: 120, measured: 120 },
    sf6: { name: 'SF₆ (sulfur hexafluoride)', center: 'S', sub: 'F', bonds: 6, lone: 0, shape: T('octahedral', 'ثماني الأوجه'), electron: T('octahedral', 'ثماني الأوجه'), ideal: 90, measured: 90 },
    pcl5: { name: 'PCl₅ (phosphorus pentachloride)', center: 'P', sub: 'Cl', bonds: 5, lone: 0, shape: T('trigonal bipyramidal', 'ثنائي الهرم الثلاثي'), electron: T('trigonal bipyramidal', 'ثنائي الهرم الثلاثي'), ideal: 90, measured: 90 },
    xef4: { name: 'XeF₄ (xenon tetrafluoride)', center: 'Xe', sub: 'F', bonds: 4, lone: 2, shape: T('square planar', 'مربع مستوٍ'), electron: T('octahedral (6 domains)', 'ثماني الأوجه'), ideal: 90, measured: 90 },
    benzene: { name: 'C₆H₆ (benzene)', ring: true, shape: T('planar hexagon', 'سداسي مستوٍ'), electron: T('each carbon trigonal planar (sp²)', 'كل كربون مستوٍ ثلاثي'), ideal: 120, measured: 120 }
  };
  const molKey = t => (/\bammonia|nh3|nh₃\b/i.test(t) ? 'nh3' : /\bwater\b|h2o|h₂o/i.test(t) ? 'h2o' : /\bmethane|ch4|ch₄\b/i.test(t) ? 'ch4' : /\bcarbon dioxide|co2|co₂\b/i.test(t) ? 'co2' : /\bbf3|boron trifluoride\b/i.test(t) ? 'bf3' : /\bsf6|sulfur hexafluoride\b/i.test(t) ? 'sf6' : /\bpcl5|phosphorus pentachloride\b/i.test(t) ? 'pcl5' : /\bxef4|xenon tetrafluoride\b/i.test(t) ? 'xef4' : /\bbenzene|c6h6\b/i.test(t) ? 'benzene' : null);
  function dirs(m) { // unit vectors (maths x, y, z) for bonds then lone pairs
    const a = m.measured * Math.PI / 180, out = [];
    if (m.ring) return out;
    const tot = m.bonds + m.lone;
    if (tot === 2) return [[1, 0, 0], [-1, 0, 0]];
    if (tot === 3) return [0, 1, 2].map(k => [Math.cos(k * 2 * Math.PI / 3), Math.sin(k * 2 * Math.PI / 3), 0]);
    if (tot === 4 && m.bonds === 4) { const s = 1 / Math.sqrt(3); return [[s, s, s], [s, -s, -s], [-s, s, -s], [-s, -s, s]]; }
    if (tot === 4) { // bonds around the −z axis at the measured angle; lone pair(s) above
      if (m.bonds === 3) { const cb = Math.sqrt((2 * Math.cos(a) + 1) / 3), sb = Math.sqrt(1 - cb * cb); return [0, 1, 2].map(k => [sb * Math.cos(k * 2 * Math.PI / 3), sb * Math.sin(k * 2 * Math.PI / 3), -cb]).concat([[0, 0, 1]]); }
      const h = a / 2; return [[Math.sin(h), 0, -Math.cos(h)], [-Math.sin(h), 0, -Math.cos(h)], [0, 0.8, 0.6], [0, -0.8, 0.6]];
    }
    if (tot === 5) return [[0, 0, 1], [0, 0, -1]].concat([0, 1, 2].map(k => [Math.cos(k * 2 * Math.PI / 3), Math.sin(k * 2 * Math.PI / 3), 0]));
    if (tot === 6) { const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]; return m.lone === 2 ? six.slice(0, 4).concat(six.slice(4)) : six; }
    return out;
  }
  const minAngle = B => (B.length < 2 ? null : Math.min(...B.flatMap((u, i) => B.slice(i + 1).map(v => angBetween(u, v)))));
  const closestPair = B => { let best = [B[0], B[1]], m = 999; B.forEach((u, i) => B.slice(i + 1).forEach(v => { const a = angBetween(u, v); if (a < m) { m = a; best = [u, v]; } })); return best; };
  const angBetween = (u, v) => Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) * 180 / Math.PI;
  reg('molecule', K.chem, T('Molecular geometry (VSEPR)', 'الشكل الجزيئي'),
    t => { const shapeQ = /\b(vsepr|molecular (shape|geometry|structure)|(structure|shape|geometry|bond angles?|3d model|lewis structure) of|molecule|bond angles?|lone pairs?|hybridi[sz]ation)\b/i.test(t); if (!shapeQ) return null; const k = molKey(t); if (!k && !/\bvsepr|molecular (shape|geometry)\b/i.test(t)) return null; return { score: k ? 0.97 : 0.9, params: { set: { mol: k || 'nh3' } } }; }, // only questions about a molecule’s structure
    { mol: { options: Object.keys(MOL) } },
    () => ({
      defaults: { mol: 'nh3', lp: true }, camera: [4, 3, 5],
      selects: [{ key: 'mol', label: T('Molecule', 'الجزيء'), options: Object.entries(MOL).map(([k, v]) => [k, v.name]) }],
      toggles: [{ key: 'lp', label: T('Show lone pairs', 'أظهر الأزواج الحرة'), live: true }],
      alt: S => MOL[S.mol].name + ', ' + MOL[S.mol].shape,
      build(S, H) { const { THREE, M3, root, sprite } = H, m = MOL[S.mol], c = L.colors();
        const ball = (el, pos, r) => { const col = { H: 0xf8fafc, C: 0x404040, N: 0x3b82f6, O: 0xef4444, F: 0x22c55e, Cl: 0x16a34a, B: 0xf59e0b, S: 0xeab308, P: 0xf97316, Xe: 0x8b5cf6 }[el] || 0x999999; const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 })); mesh.position.copy(pos); root.add(mesh); root.add(sprite(el, pos.clone().add(new THREE.Vector3(0, r + 0.22, 0)), c.ink, 0.6)); };
        const bond = (a, b, order) => { const off = order === 2 ? [-0.07, 0.07] : order === 1.5 ? [0] : [0]; off.forEach(o => { const d = b.clone().sub(a), len = d.length(), cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 12), new THREE.MeshStandardMaterial({ color: 0x9ca3af })); cyl.position.copy(a.clone().add(b).multiplyScalar(0.5)); cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); if (o) cyl.position.add(new THREE.Vector3(o, o, 0)); root.add(cyl); }); };
        if (m.ring) { const R = 1.4, Rh = 2.45, Cs = [], Hs = []; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; Cs.push(M3(R * Math.cos(a), R * Math.sin(a), 0)); Hs.push(M3(Rh * Math.cos(a), Rh * Math.sin(a), 0)); } Cs.forEach((p, k) => { ball('C', p, 0.3); ball('H', Hs[k], 0.2); bond(p, Hs[k], 1); bond(p, Cs[(k + 1) % 6], 1); }); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(c.pal[4]) })); ring.rotation.x = Math.PI / 2; root.add(ring); root.add(sprite(T('delocalised π ring', 'حلقة π'), M3(0, 0, 0.4), c.pal[4], 0.8)); return; }
        ball(m.center, new THREE.Vector3(0, 0, 0), 0.38); const D = dirs(m), L0 = 1.6;
        D.slice(0, m.bonds).forEach(d => { const p = M3(d[0] * L0, d[1] * L0, d[2] * L0); bond(new THREE.Vector3(0, 0, 0), p, m.sub === 'O' && m.center === 'C' ? 2 : 1); ball(m.sub, p, m.sub === 'H' ? 0.22 : 0.3); });
        if (S.lp) D.slice(m.bonds).forEach(d => { const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: new THREE.Color(c.pal[4]), transparent: true, opacity: 0.45 })); lobe.scale.set(0.8, 1.4, 0.8); const p = M3(d[0] * 0.95, d[1] * 0.95, d[2] * 0.95); lobe.position.copy(p); lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize()); root.add(lobe); root.add(sprite(T('lone pair', 'زوج حر'), p.clone().multiplyScalar(1.6), c.pal[4], 0.7)); });
        if (m.bonds >= 2) { const pr = closestPair(D.slice(0, m.bonds)), a = pr[0], b = pr[1]; const mid = M3((a[0] + b[0]) * 0.7, (a[1] + b[1]) * 0.7, (a[2] + b[2]) * 0.7); root.add(sprite(`${f3(angBetween(a, b))}°`, mid, c.pal[3], 0.8)); } },
      readout: S => { const m = MOL[S.mol]; return [[T('shape', 'الشكل'), m.shape], [T('electron domains', 'مجالات الإلكترونات'), m.ring ? '3 per C' : `${m.bonds} bonding + ${m.lone} lone`], [T('bond angle', 'زاوية الرابطة'), `${m.measured}° ${m.measured !== m.ideal ? `(${T('ideal', 'مثالي')} ${m.ideal}°)` : ''}`]]; },
      intro: S => { const m = MOL[S.mol]; return m.ring ? T('Benzene, C₆H₆: six carbons in a flat hexagon, every C–C–C angle 120° and every C–C bond the same length (139 pm) — the π electrons are shared around the ring rather than fixed in alternating double bonds. Rotate it to see it is flat.', 'البنزين.') : T(`${m.name}: ${m.bonds} bonding pair${m.bonds > 1 ? 's' : ''}${m.lone ? ` and ${m.lone} lone pair${m.lone > 1 ? 's' : ''}` : ''} around ${m.center} give a ${m.electron} electron arrangement and a ${m.shape} shape. ${m.lone ? `Lone pairs repel more strongly than bonds, squeezing the bond angle from the ideal ${m.ideal}° to about ${m.measured}°.` : `The bond angle is ${m.measured}°.`} Drag to rotate.`, 'الشكل الجزيئي.'); },
      explain: S => { const m = MOL[S.mol]; return `<p>${T('VSEPR: electron pairs (domains) around the central atom spread out as far apart as possible. Lone pairs take up more room than bonding pairs.', 'نظرية تنافر أزواج الإلكترونات.')}</p><p>${esc(m.name)}: ${m.ring ? T('each carbon has three domains (σ bonds to two C and one H) → trigonal planar, 120°; the leftover p orbitals overlap above and below the ring (π system).', 'لكل كربون ثلاثة مجالات.') : `${m.bonds} + ${m.lone} = ${m.bonds + m.lone} ${T('domains', 'مجالات')} → ${m.electron}; ${T('only atoms count for the shape', 'الذرات فقط تحدد الشكل')} → <b>${m.shape}</b>.`}</p><p>${T('Angle shown', 'الزاوية')}: ${m.measured}°${m.measured !== m.ideal ? ` (${T('measured, gas phase; the ideal tetrahedral value is', 'مقيسة؛ والمثالية')} ${m.ideal}°)` : ''}.</p>`; },
      assume: T('Idealised ball-and-stick geometry; bond lengths not to scale; bond angles are standard textbook gas-phase values. Lone pairs are drawn as lobes to show where the electron density points.', 'هندسة مثالية.'),
      state: S => { const m = MOL[S.mol], D = dirs(m); return { mol: S.mol, shape: m.shape, angle: m.ring ? 120 : minAngle(D.slice(0, m.bonds)), bonds: m.bonds, lone: m.lone }; },
      command(t, S) { const k = molKey(t); if (k) { S.mol = k; return { note: MOL[k].name }; } if (/\b(hide|without) (the )?lone pairs\b/i.test(t)) { S.lp = false; return { note: T('Lone pairs hidden.', 'أُخفيت.') }; } return null; }
    }), true);

  /* ======================= surface, contours and gradient (3D) ======================= */
  reg('gradient', K.mv, T('Gradient of a function of two variables', 'تدرج دالة بمتغيرين'),
    t => (/\b(gradient|grad|∇|del)\b[^.]*\b(f\s*\(\s*x\s*,\s*y|function|scalar field|surface|level (curves?|surfaces?|sets?))|\b(level (curves?|surfaces?|sets?)|contour (lines?|plots?))\b[^.]*\b(gradient|function)|directional derivative|steepest (ascent|descent)\b/i.test(t) && !/\bgradient descent\b.*\b(neural|loss|training)\b/i.test(t) ? { score: 0.95, params: { set: Object.assign({}, (L.normalise(t).match(/f\s*\(\s*x\s*,\s*y\s*\)\s*=\s*([^,;?]+)/i) || [])[1] ? { f: (L.normalise(t).match(/f\s*\(\s*x\s*,\s*y\s*\)\s*=\s*([^,;?]+)/i))[1].trim() } : {}) } } : null),
    { f: { expr: true }, x0: { min: -5, max: 5 }, y0: { min: -5, max: 5 } },
    async ctx => {
      const C = await compiler(); const S0 = Object.assign({ f: 'x^2 + y^2', x0: 1, y0: 0.5 }, ctx.params.set || {}); let F = C(S0.f, ['x', 'y']), fsrc = S0.f;
      const grad = (x, y) => { const h = 1e-4; return [(F(x + h, y) - F(x - h, y)) / (2 * h), (F(x, y + h) - F(x, y - h)) / (2 * h)]; };
      const range = () => { let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 30; i++) for (let j = 0; j <= 30; j++) { const v = F(-2.5 + 5 * i / 30, -2.5 + 5 * j / 30); if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } } return [lo, hi]; };
      return {
        defaults: S0, camera: [6, 7, 8], panelEqual: true, panelLabels: { x: 'x', y: 'y' },
        params: [{ key: 'x0', label: T('point x₀', 'x₀'), min: -2.5, max: 2.5, step: 0.05 }, { key: 'y0', label: T('point y₀', 'y₀'), min: -2.5, max: 2.5, step: 0.05 }],
        panel(g, p, S) { const c = L.colors(); if (S.f !== fsrc) { fsrc = S.f; F = C(S.f, ['x', 'y']); } p.view = { x0: -2.6, x1: 2.6, y0: -2.6, y1: 2.6 }; p.fit(); p.grid(); const [lo, hi] = range(), n = 60;
          for (let k = 1; k < 10; k++) { const lev = lo + (hi - lo) * k / 10; g.strokeStyle = c.pal[k % 8]; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = -2.5 + 5 * i / n, y = -2.5 + 5 * j / n, d = 5 / n; const a = F(x, y) - lev, b = F(x + d, y) - lev, cc = F(x + d, y + d) - lev, e = F(x, y + d) - lev; const pts = []; const edge = (p1, p2, v1, v2) => { if ((v1 < 0) !== (v2 < 0)) { const t = v1 / (v1 - v2); pts.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]); } }; edge([x, y], [x + d, y], a, b); edge([x + d, y], [x + d, y + d], b, cc); edge([x + d, y + d], [x, y + d], cc, e); edge([x, y + d], [x, y], e, a); if (pts.length >= 2) { g.moveTo(p.X(pts[0][0]), p.Y(pts[0][1])); g.lineTo(p.X(pts[1][0]), p.Y(pts[1][1])); } } g.stroke(); }
          for (let x = -2.2; x <= 2.21; x += 0.55) for (let y = -2.2; y <= 2.21; y += 0.55) { const gr = grad(x, y), m = Math.hypot(gr[0], gr[1]) || 1; p.arrow(x, y, x + gr[0] / m * 0.35, y + gr[1] / m * 0.35, c.muted, '', { w: 1.2 }); }
          const gr = grad(S.x0, S.y0), m = Math.hypot(gr[0], gr[1]) || 1; p.arrow(S.x0, S.y0, S.x0 + gr[0] / m * 0.9, S.y0 + gr[1] / m * 0.9, c.pal[1], '∇f', { w: 3 }); p.dot(S.x0, S.y0, c.ink, '', { r: 5 }); p.text(-2.5, 2.4, T('contours (level curves) with ∇f ⟂ to them', 'خطوط المستوى'), c.ink); },
        build(S, H) { if (S.f !== fsrc) { fsrc = S.f; F = C(S.f, ['x', 'y']); } const { THREE, M3, root } = H, c = L.colors(); axes3(H, 3.2); const [lo, hi] = range(), sc = 3 / Math.max(1e-9, hi - lo), z = (x, y) => (F(x, y) - lo) * sc - 1.5;
          const n = 60, geo = new THREE.BufferGeometry(), pos = [], idx = [], cols = []; const ca = new THREE.Color(c.pal[0]), cb = new THREE.Color(c.pal[1]);
          for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = -2.5 + 5 * i / n, y = -2.5 + 5 * j / n, zz = z(x, y); const v = M3(x, y, isFinite(zz) ? zz : 0); pos.push(v.x, v.y, v.z); const t = Math.max(0, Math.min(1, (zz + 1.5) / 3)); const cc = ca.clone().lerp(cb, t); cols.push(cc.r, cc.g, cc.b); }
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const a = i * (n + 1) + j, b = a + n + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.setIndex(idx); geo.computeVertexNormals();
          root.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.85, roughness: 0.6 })));
          const gr = grad(S.x0, S.y0), p0 = M3(S.x0, S.y0, z(S.x0, S.y0)); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshBasicMaterial({ color: 0x111111 })); ball.position.copy(p0); root.add(ball);
          const gm = Math.hypot(gr[0], gr[1]); if (gm > 1e-9) root.add(new THREE.ArrowHelper(M3(gr[0], gr[1], 0).normalize(), M3(S.x0, S.y0, -1.5), 1.2, new THREE.Color(c.pal[1]).getHex(), 0.25, 0.14));
          root.add(H.sprite('z = ' + S.f, M3(-2.5, 2.5, 1.9), c.ink, 1)); },
        readout: S => { const gr = grad(S.x0, S.y0); return [['f(x₀, y₀)', f3(F(S.x0, S.y0))], ['∂f/∂x', f3(gr[0])], ['∂f/∂y', f3(gr[1])], ['|∇f|', f3(Math.hypot(gr[0], gr[1]))]]; },
        intro: S => { const gr = grad(S.x0, S.y0); return T(`The surface z = ${S.f} with its level curves underneath. At (${S.x0}, ${S.y0}) the gradient ∇f = (${f3(gr[0])}, ${f3(gr[1])}) points in the direction of steepest increase, at right angles to the contour through that point; its length ${f3(Math.hypot(gr[0], gr[1]))} is the steepest slope. Rotate the surface and move the point.`, 'التدرج.'); },
        explain: S => { const gr = grad(S.x0, S.y0); return `<p>∇f = (∂f/∂x, ∂f/∂y). ${T('At the chosen point', 'عند النقطة')}: (${f3(gr[0])}, ${f3(gr[1])}).</p><p>${T('Along a level curve f stays constant, so the directional derivative along it is 0: ∇f · t = 0, i.e. ∇f is perpendicular to the level curve. The directional derivative in a unit direction u is ∇f · u, largest (= |∇f|) when u points along ∇f.', 'التدرج عمودي على خطوط المستوى.')}</p>${S.f.replace(/\s/g, '') === 'x^2+y^2' ? `<p>${T('For x² + y²: ∇f = (2x, 2y) points straight away from the origin; the level curves are circles centred there.', 'لـ x² + y²: التدرج (2x, 2y).')}</p>` : ''}`; },
        assume: T('Partial derivatives by central differences (h = 10⁻⁴); the surface is drawn over −2.5 ≤ x, y ≤ 2.5 and rescaled vertically to fit.', 'مشتقات عددية.'),
        state: S => { const gr = grad(S.x0, S.y0); return { f: S.f, x0: S.x0, y0: S.y0, grad: gr }; },
        command(t, S) { const m = L.normalise(t).match(/f\s*\(\s*x\s*,\s*y\s*\)\s*=\s*([^,;?]+)|z\s*=\s*([^,;?]+)/i); if (m) { S.f = (m[1] || m[2]).trim(); return { note: 'f = ' + S.f }; } return null; }
      };
    }, true);
})();
