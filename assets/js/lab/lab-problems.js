/* ERLY Noor Lab — problem-to-scene engines (v17).

   A student pastes or types an actual question ("A 2 kg block on a rough table (μ = 0.2) is tied over a pulley of
   mass 1 kg and radius 10 cm to a hanging 3 kg mass…") and Noor builds THAT situation: the numbers in the question
   become the model's parameters, the model is simulated or computed on this device, and every readout is checked
   against the closed-form answer where one exists. Nothing here is drawn by a language model.

   Engines (acceptance tests A–J):
     A rigid-body: block + massive pulley + string + friction; rolling vs slipping on an incline
     B multi-charge electrostatics (forces, field, potential; draggable charges)
     C bounded region between two curves (intersections, top/bottom, area)
     D organic mechanisms, step by step with curved arrows (SN1, SN2, E2 — others not yet)
     E circuit topology from a netlist-like description (nodes, branches, loops, series/parallel, MNA solution)
     F gear trains (simple and compound): ratio, speed, direction, torque
     G distillation of an ideal binary mixture (Antoine + Raoult; T-x-y; stages at total reflux)
     H frequency modulation (time signal, Bessel spectrum, Carson bandwidth)
     I cardiac cycle (time-varying elastance left ventricle + Windkessel; Wiggers diagram and P-V loop)
     J break-even analysis (cost/revenue lines, profit region, margin of safety)

   Scene specs: L.sceneSpec.validate(spec) checks a JSON description ({ engine, params }) against each engine's
   declared parameters (names, numeric ranges, allowed options) before anything opens. A spec is data only — no
   code from a spec is ever run — so an AI can propose a scene without being able to inject script. */
(function () {
  'use strict';
  const L = window.ERLY_LAB; if (!L || !L.harness) return;
  const T = L.T, N = L.num, ui = L.ui, esc = L.esc;
  const P = L.phys;
  const f3 = v => (!isFinite(v) ? String(v) : Math.abs(v) >= 1e9 || (Math.abs(v) < 1e-3 && v !== 0) ? (+v).toExponential(3) : Math.abs(v) >= 1e4 ? Math.round(v).toLocaleString('en') : (+(+v).toPrecision(4)).toString());
  const fHz = v => (v >= 1e9 ? f3(v / 1e9) + ' GHz' : v >= 1e6 ? f3(v / 1e6) + ' MHz' : v >= 1e3 ? f3(v / 1e3) + ' kHz' : f3(v) + ' Hz');
  const num = (t, re, d) => { const m = String(t).match(re); return m ? +m[1] : d; };
  const DECL = {}; // engine id -> declared parameters (for scene-spec validation)
  function reg(id, kind, title, match, decl, defFn) {
    DECL[id] = decl;
    L.register({ id, family: 'problems', kind, title, match, async mount(ctx) { ctx.id = id; const d = await defFn(ctx); return L.harness(ctx, d); } });
  }
  const KIND = {
    mech: T('Physics · Rotational mechanics', 'فيزياء · الميكانيكا الدورانية'), elec: T('Physics · Electrostatics', 'فيزياء · الكهرباء الساكنة'),
    calc: T('Mathematics · Integral calculus', 'رياضيات · التكامل'), chem: T('Chemistry · Organic mechanisms', 'كيمياء · الآليات العضوية'),
    circ: T('Engineering · Circuit analysis', 'هندسة · تحليل الدوائر'), mechE: T('Engineering · Machine elements', 'هندسة · عناصر الآلات'),
    chemE: T('Chemical engineering · Separation', 'هندسة كيميائية · الفصل'), comm: T('Engineering · Communications', 'هندسة · الاتصالات'),
    med: T('Medicine · Cardiovascular physiology', 'طب · فسيولوجيا القلب'), biz: T('Commerce · Cost–volume–profit', 'تجارة · التكلفة والحجم والربح')
  };
  const label = (g, p, x, y, s, col, o) => p.text(x, y, s, col, Object.assign({ font: '600 12px ui-sans-serif, system-ui' }, o || {}));
  const kgList = t => [...String(t).matchAll(/(\d+(?:\.\d+)?)\s*kg\b/gi)].map(m => +m[1]);

  /* ======================= A · rigid body: pulley + string + friction; rolling vs slipping ======================= */
  const SHAPES = { disc: [0.5, T('solid cylinder / disc', 'أسطوانة مصمتة')], sphere: [0.4, T('solid sphere', 'كرة مصمتة')], ring: [1, T('ring / hoop', 'حلقة')], shell: [2 / 3, T('hollow sphere', 'كرة مجوفة')] };
  P.pulleyTable = (m1, m2, M, R, mu, kp, g) => {
    g = g || 9.81; const I = kp * M * R * R;
    if (m2 * g <= mu * m1 * g) return { a: 0, T1: m2 * g, T2: m2 * g, alpha: 0, I, stuck: true };
    const a = (m2 - mu * m1) * g / (m1 + m2 + I / (R * R));
    return { a, T1: m1 * (a + mu * g), T2: m2 * (g - a), alpha: a / R, I, stuck: false };
  };
  P.rollIncline = (deg, k, muS, muK, g) => {
    g = g || 9.81; const th = deg * Math.PI / 180, need = Math.tan(th) * k / (1 + k);
    if (need <= muS) return { rolling: true, a: g * Math.sin(th) / (1 + k), fNeed: need, aR: g * Math.sin(th) / (1 + k) };
    return { rolling: false, a: g * (Math.sin(th) - muK * Math.cos(th)), alphaR: muK * g * Math.cos(th) / k, fNeed: need };
  };
  reg('rigid', KIND.mech, T('Rigid body: pulley, string and friction', 'جسم صلب: بكرة وخيط واحتكاك'),
    t => {
      const pulley = /\bpulley\b/i.test(t) && /\b(mass|radius|moment of inertia|massive|disc|disk)\b/i.test(t);
      const roll = /\b(roll(s|ing)?|slip(s|ping)?)\b/i.test(t) && /\b(incline|slope|ramp|plane)\b/i.test(t);
      if (!pulley && !roll) return null;
      const set = {};
      if (roll) {
        set.mode = 'roll'; set.angle = num(t, /(\d+(?:\.\d+)?)\s*(?:°|deg)/i, 30);
        const mu = t.match(/(?:μ|mu|coefficient of (?:static )?friction)\s*(?:_?s)?\s*(?:=|is|of)?\s*(0?\.\d+)/i); if (mu) set.muS = +mu[1];
        set.shape = /sphere|ball/i.test(t) ? (/hollow|shell/i.test(t) ? 'shell' : 'sphere') : /\b(ring|hoop)\b/i.test(t) ? 'ring' : 'disc';
      } else {
        const kg = '(\\d+(?:\\.\\d+)?)\\s*kg';
        const pul = t.match(new RegExp('pulley[^.;]{0,25}?(?:of\\s*)?mass\\s*(?:of\\s*)?' + kg, 'i')) || t.match(new RegExp(kg + '\\s*pulley', 'i'));
        const hang = t.match(new RegExp('hanging[^.;\\d]{0,20}' + kg, 'i')) || t.match(new RegExp(kg + '[^.;\\d]{0,20}(?:hanging|hangs|suspended)', 'i'));
        const blk = t.match(new RegExp(kg + '\\s*(?:block|box|mass on|body on)', 'i')) || t.match(new RegExp('(?:block|box)[^.;\\d]{0,20}' + kg, 'i'));
        if (pul) set.M = +pul[1]; if (hang) set.m2 = +hang[1]; if (blk) set.m1 = +blk[1];
        const rest = kgList(t).filter(v => ![set.M, set.m2, set.m1].includes(v)); if (set.m1 == null && rest.length) set.m1 = rest.shift(); if (set.m2 == null && rest.length) set.m2 = rest.shift(); if (set.M == null && rest.length) set.M = rest.shift();
        const r = t.match(/radius\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(cm|m)\b/i); if (r) set.R = +r[1] * (r[2].toLowerCase() === 'cm' ? 0.01 : 1);
        const mu = t.match(/(?:μ|mu|coefficient of (?:kinetic )?friction)\s*(?:=|is|of)?\s*(0?\.\d+)/i); if (mu) set.mu = +mu[1];
        if (/pulley[^.;]{0,40}\b(ring|hoop)\b|\b(ring|hoop)[- ]shaped pulley/i.test(t)) set.kp = 1;
      }
      return { score: 0.96, params: { set } };
    },
    { mode: { options: ['table', 'roll'] }, m1: { min: 0.1, max: 50 }, m2: { min: 0.1, max: 50 }, M: { min: 0, max: 50 }, R: { min: 0.02, max: 1 }, mu: { min: 0, max: 1 }, kp: { min: 0.3, max: 1 }, angle: { min: 1, max: 80 }, muS: { min: 0, max: 1.5 }, muK: { min: 0, max: 1.5 }, shape: { options: Object.keys(SHAPES) } },
    () => ({
      defaults: { mode: 'table', m1: 2, m2: 3, M: 1, R: 0.1, mu: 0.2, kp: 0.5, angle: 30, muS: 0.3, muK: 0.2, shape: 'disc', g: 9.81, drop: 1.5 },
      params: [
        { key: 'm1', label: T('block on the table m₁', 'الكتلة على الطاولة'), unit: 'kg', min: 0.1, max: 20, step: 0.1, when: S => S.mode === 'table' },
        { key: 'm2', label: T('hanging mass m₂', 'الكتلة المعلقة'), unit: 'kg', min: 0.1, max: 20, step: 0.1, when: S => S.mode === 'table' },
        { key: 'M', label: T('pulley mass M', 'كتلة البكرة'), unit: 'kg', min: 0, max: 20, step: 0.1, when: S => S.mode === 'table' },
        { key: 'R', label: T('pulley radius R', 'نصف قطر البكرة'), unit: 'm', min: 0.02, max: 0.5, step: 0.01, when: S => S.mode === 'table' },
        { key: 'mu', label: T('table friction μ', 'احتكاك الطاولة'), unit: '', min: 0, max: 1, step: 0.01, when: S => S.mode === 'table' },
        { key: 'angle', label: T('incline angle θ', 'زاوية الميل'), unit: '°', min: 1, max: 80, step: 1, when: S => S.mode === 'roll' },
        { key: 'muS', label: T('static friction μₛ', 'الاحتكاك السكوني'), unit: '', min: 0, max: 1.5, step: 0.01, when: S => S.mode === 'roll' },
        { key: 'muK', label: T('kinetic friction μₖ', 'الاحتكاك الحركي'), unit: '', min: 0, max: 1.5, step: 0.01, when: S => S.mode === 'roll' }
      ],
      selects: [{ key: 'mode', label: T('Situation', 'الحالة'), num: false, options: [['table', T('Block, pulley and hanging mass', 'كتلة وبكرة وكتلة معلقة')], ['roll', T('Body rolling down an incline', 'جسم يتدحرج على مستوى مائل')]], onSet: (S, st, api) => api.rebuild() },
        { key: 'shape', label: T('Rolling body', 'الجسم المتدحرج'), num: false, when: S => S.mode === 'roll', options: Object.entries(SHAPES).map(([k, v]) => [k, v[1]]) },
        { key: 'kp', label: T('Pulley shape', 'شكل البكرة'), when: S => S.mode === 'table', options: [[0.5, T('disc (I = ½MR²)', 'قرص')], [1, T('ring (I = MR²)', 'حلقة')]] }],
      graph: true, h: 1 / 1000, every: 8,
      series: [['v', T('speed v (m/s)', 'السرعة'), 1, null, ['v']], ['slip', T('v and ωR (m/s)', 'v و ωR'), [1, 2], null, ['v', 'ωR']]],
      columns: ['v', 'omegaR', 'x'],
      view: S => (S.mode === 'roll' ? { x0: -0.5, x1: 5, y0: -0.5, y1: 3.5 } : { x0: -2.6, x1: 1.2, y0: -2.4, y1: 0.9 }),
      init(S, st) { st.x = 0; st.v = 0; st.w = 0; st.th = 0; st.done = false; st.res = S.mode === 'roll' ? P.rollIncline(S.angle, SHAPES[S.shape][0], S.muS, S.muK, S.g) : P.pulleyTable(S.m1, S.m2, S.M, S.R, S.mu, S.kp, S.g); },
      step(S, st, h) {
        const r = st.res;
        if (S.mode === 'table') { st.x += st.v * h + 0.5 * r.a * h * h; st.v += r.a * h; // exact for constant acceleration
          st.w = st.v / S.R; st.th += st.w * h; if (st.x >= S.drop) { st.x = S.drop; st.done = true; } if (r.stuck && st.t > 2) st.done = true; return; }
        const k = SHAPES[S.shape][0], rr = 0.25, L0 = 4.5;
        st.x += st.v * h + 0.5 * r.a * h * h; st.v += r.a * h; st.w += (r.rolling ? r.a / rr : r.alphaR / rr) * h; st.th += st.w * h;
        if (!r.rolling && st.w * rr > st.v) st.w = st.v / rr; // the spin catches up: rolling from then on (friction stops slipping)
        if (st.x >= L0) { st.x = L0; st.done = true; }
        void k;
      },
      sample: (S, st) => [st.v, st.w * (S.mode === 'roll' ? 0.25 : S.R), st.x],
      draw(g, p, S, st) {
        const c = L.colors();
        if (S.mode === 'table') {
          const R = Math.max(0.12, S.R * 1.6), px = 0.5, py = 0.4;
          p.path([[-2.5, py - R - 0.02], [px, py - R - 0.02]], c.muted, { w: 4 }); // table top
          label(g, p, -2.4, py - R - 0.2, `μ = ${S.mu}`, c.muted);
          const bx = -1.6 + st.x; g.fillStyle = c.pal[0]; const X = p.X(bx - 0.3), Y = p.Y(py - R + 0.38); g.fillRect(X, Y, p.X(bx + 0.3) - X, p.Y(py - R - 0.02) - Y);
          label(g, p, bx - 0.22, py - R + 0.13, `m₁ ${S.m1} kg`, c.bg);
          p.path([[bx + 0.3, py - R + 0.18], [px, py - R + 0.18]], c.ink, { w: 1.6 }); // string to pulley top-left (approx)
          // pulley with a spoke that turns with ω
          g.strokeStyle = c.ink; g.lineWidth = 2; g.beginPath(); g.arc(p.X(px), p.Y(py - R + 0.18 - 0.0), Math.abs(p.X(px + R) - p.X(px)), 0, 7); g.stroke();
          for (let k = 0; k < 3; k++) { const a = -st.th + k * 2.094; p.path([[px, py - R + 0.18 - R + R], [px + R * 0.9 * Math.cos(a), py - R + 0.18 + R * 0.9 * Math.sin(a) - 0]], c.pal[4], { w: 2 }); }
          const hy = py - R + 0.18 - 0.6 - st.x; p.path([[px + R, py - R + 0.18], [px + R, hy]], c.ink, { w: 1.6 });
          g.fillStyle = c.pal[1]; const X2 = p.X(px + R - 0.25), Y2 = p.Y(hy); g.fillRect(X2, Y2, p.X(px + R + 0.25) - X2, p.Y(hy - 0.45) - Y2);
          label(g, p, px + R - 0.22, hy - 0.26, `m₂ ${S.m2} kg`, c.bg);
          const r = st.res; if (!r.stuck) { p.arrow(bx + 0.3, py - R + 0.32, bx + 0.3 + 0.35, py - R + 0.32, c.pal[2], 'T₁'); p.arrow(px + R, hy, px + R, hy + 0.35, c.pal[2], 'T₂'); p.arrow(bx - 0.3, py - R + 0.05, bx - 0.3 - 0.3, py - R + 0.05, c.pal[3], 'f'); }
          label(g, p, px - 0.2, py + 0.35, `M ${S.M} kg, R ${S.R} m`, c.muted);
        } else {
          const th = S.angle * Math.PI / 180, L0 = 4.5, rr = 0.25, H = L0 * Math.sin(th), B = L0 * Math.cos(th);
          g.fillStyle = c.dark ? 'rgba(148,163,184,.18)' : 'rgba(100,116,139,.15)'; g.beginPath(); g.moveTo(p.X(0), p.Y(0)); g.lineTo(p.X(B), p.Y(0)); g.lineTo(p.X(0), p.Y(H)); g.closePath(); g.fill();
          const s = st.x, cx = s * Math.cos(th) + rr * Math.sin(th), cy = H - s * Math.sin(th) + rr * Math.cos(th);
          g.strokeStyle = c.pal[0]; g.lineWidth = 3; g.beginPath(); g.arc(p.X(cx), p.Y(cy), Math.abs(p.X(rr) - p.X(0)), 0, 7); g.stroke();
          for (let k = 0; k < 4; k++) { const a = -st.th + k * Math.PI / 2; p.path([[cx, cy], [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]], c.pal[4], { w: 2 }); }
          label(g, p, 0.1, H + 0.15, st.res.rolling ? T('rolls without slipping', 'يتدحرج دون انزلاق') : (st.w * rr < st.v - 1e-6 ? T('slipping: v > ωr', 'ينزلق: v > ωr') : T('slipping ended — now rolling', 'انتهى الانزلاق')), st.res.rolling ? c.pal[2] : c.pal[1]);
          label(g, p, B * 0.75, 0.15, `θ = ${S.angle}°`, c.muted);
        }
      },
      readout(S, st) {
        const r = st.res;
        if (S.mode === 'table') return [[T('a (simulated)', 'التسارع (محاكاة)'), f3(st.t > 0 ? 2 * st.x / (st.t * st.t) : r.a) + ' m/s²'], [T('a (theory)', 'التسارع (نظري)'), f3(r.a) + ' m/s²'], ['T₁', f3(r.T1) + ' N'], ['T₂', f3(r.T2) + ' N'], ['α', f3(r.alpha) + ' rad/s²']];
        return [[T('motion', 'الحركة'), r.rolling ? T('rolling', 'تدحرج') : T('slipping', 'انزلاق')], ['a', f3(r.a) + ' m/s²'], ['v', f3(st.v) + ' m/s'], ['ωr', f3(st.w * 0.25) + ' m/s'], [T('friction needed / μₛ', 'الاحتكاك اللازم / μₛ'), f3(r.fNeed) + ' / ' + S.muS]];
      },
      intro(S, st) {
        const r = st.res;
        if (S.mode === 'table') return r.stuck ? T(`The hanging ${S.m2} kg can’t overcome friction on the ${S.m1} kg block (m₂g ≤ μm₁g), so nothing moves.`, 'لا تتحرك الكتل لأن الاحتكاك أكبر.') : T(`I built your system: ${S.m1} kg on a table (μ = ${S.mu}), a ${S.M} kg pulley of radius ${S.R} m, and ${S.m2} kg hanging. a = ${f3(r.a)} m/s², T₁ = ${f3(r.T1)} N, T₂ = ${f3(r.T2)} N — the two tensions differ because the pulley has mass.`, 'بنيت نظامك.');
        return T(`A ${SHAPES[S.shape][1]} on a ${S.angle}° incline: it ${r.rolling ? `rolls without slipping, a = g sinθ/(1 + k) = ${f3(r.a)} m/s²` : `slips (it would need μₛ ≥ ${f3(r.fNeed)}), a = g(sinθ − μₖcosθ) = ${f3(r.a)} m/s²`}.`, 'نموذج التدحرج.');
      },
      explain(S, st) {
        const r = st.res;
        if (S.mode === 'table') return `<p>${T('Free-body equations (string light and inextensible, no slipping on the pulley):', 'معادلات الجسم الحر:')}</p><ul><li>m₁: T₁ − μm₁g = m₁a</li><li>m₂: m₂g − T₂ = m₂a</li><li>${T('pulley', 'البكرة')}: (T₂ − T₁)R = Iα, α = a/R, I = ${S.kp}MR² = ${f3(r.I)} kg·m²</li></ul><p>a = (m₂ − μm₁)g / (m₁ + m₂ + I/R²) = <b>${f3(r.a)} m/s²</b>. ${T('Check', 'تحقق')}: (T₂ − T₁)R = ${f3((r.T2 - r.T1) * S.R)} N·m, Iα = ${f3(r.I * r.alpha)} N·m.</p><p>${T('Energy after the drop', 'الطاقة بعد السقوط')} (x = ${f3(st.x)} m): m₂gx = ${f3(S.m2 * S.g * st.x)} J = ½(m₁+m₂)v² + ½Iω² + μm₁gx = ${f3(0.5 * (S.m1 + S.m2) * st.v * st.v + 0.5 * r.I * st.w * st.w + S.mu * S.m1 * S.g * st.x)} J.</p>`;
        const k = SHAPES[S.shape][0];
        return `<p>${T('Rolling without slipping needs a friction force f = mg sinθ · k/(1+k) (k = I/mr² = ', 'التدحرج دون انزلاق يحتاج احتكاكاً')}${f3(k)}). ${T('That is possible only if', 'ممكن فقط إذا')} tanθ ≤ μₛ(1 + k)/k, ${T('i.e. μₛ ≥', 'أي μₛ ≥')} ${f3(r.fNeed)}.</p><p>${r.rolling ? T('Here it is satisfied, so a = g sinθ/(1+k) and ω = v/r at every instant.', 'الشرط محقق.') : T('Here it is not: the body slides with kinetic friction, a = g(sinθ − μₖcosθ), while friction spins it up (α = μₖg cosθ/(kr)). On the graph, v and ωR separate.', 'الشرط غير محقق: ينزلق.')}</p>`;
      },
      assume: T('Rigid bodies; light, inextensible string that does not slip on the pulley; frictionless pulley axle; the same μ is used to decide whether the block starts moving; no air resistance; g = 9.81 m/s².', 'افتراضات مبسطة.'),
      state: (S, st) => ({ params: Object.assign({}, S), res: st.res, x: st.x, v: st.v, w: st.w }),
      command(t, S) { let m; if ((m = t.match(/(?:μ|mu|friction)\s*(?:to|=)\s*(\d*\.?\d+)/i))) { if (S.mode === 'roll') S.muS = +m[1]; else S.mu = +m[1]; return { note: `μ = ${m[1]}` }; } if (/\b(frictionless|no friction)\b/i.test(t)) { S.mu = 0; S.muS = 0; S.muK = 0; return { note: T('Friction removed.', 'أزيل الاحتكاك.') }; } if (/\b(massless pulley|pulley (?:is |to be )?massless|light pulley|ignore the pulley'?s? mass|pulley has no mass)\b/i.test(t)) { S.M = 0; return { note: T('Pulley mass set to 0: now T₁ = T₂.', 'كتلة البكرة صفر.') }; } return null; }
    }));

  /* ======================= B · multi-charge electrostatics ======================= */
  const KC = 8.9875517923e9;
  const UNIT_Q = { n: 1e-9, u: 1e-6, µ: 1e-6, μ: 1e-6, m: 1e-3, '': 1 };
  P.forces = Q => Q.map((a, i) => { let fx = 0, fy = 0; Q.forEach((b, j) => { if (i === j) return; const dx = a.x - b.x, dy = a.y - b.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2), F = KC * a.q * b.q / r2; fx += F * dx / r; fy += F * dy / r; }); return [fx, fy]; });
  P.fieldAt = (Q, x, y) => { let ex = 0, ey = 0, v = 0; Q.forEach(b => { const dx = x - b.x, dy = y - b.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2) || 1e-9, E = KC * b.q / r2; ex += E * dx / r; ey += E * dy / r; v += KC * b.q / r; }); return { ex, ey, v }; };
  function parseCharges(t) {
    const cm = /\bcm\b/i.test(t) ? 0.01 : /\bmm\b/i.test(t) ? 0.001 : 1;
    const out = [];
    for (const m of String(t).matchAll(/([+\-−]?\s*\d+(?:\.\d+)?)\s*(n|u|µ|μ|m)?\s*C\b[^()]{0,25}?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/gi)) out.push({ q: +m[1].replace(/[−\s]/g, s => (s === '−' ? '-' : '')) * UNIT_Q[(m[2] || '')], x: +m[3] * cm, y: +m[4] * cm });
    const pt = String(t).match(/(?:field|potential|force)[^()]*?\bat\s*(?:the\s*)?(?:point\s*)?(?:P\s*)?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*(?![^()]*\bC\b)/i);
    return { charges: out, point: pt ? [+pt[1] * cm, +pt[2] * cm] : null, unit: cm };
  }
  reg('charges', KIND.elec, T('Point charges: forces and field', 'شحنات نقطية: القوى والمجال'),
    t => { const pc = parseCharges(t); if (pc.charges.length >= 2 || (/\b(charges?|coulomb)\b/i.test(t) && /\b(three|four|several|multiple|square|triangle|net force|net field)\b/i.test(t))) return { score: 0.95, params: { set: pc.charges.length >= 2 ? { charges: pc.charges, point: pc.point, unit: pc.unit } : {} } }; return null; },
    { charges: { list: true, max: 8 }, point: { pair: true }, unit: { min: 0.001, max: 1 } },
    () => ({
      static: true, autoplay: false, graph: false, grid: true, labels: { x: 'x (m)', y: 'y (m)' },
      defaults: { charges: [{ q: 2e-6, x: 0, y: 0 }, { q: -3e-6, x: 0.04, y: 0 }, { q: 1e-6, x: 0.02, y: 0.03 }], point: null, unit: 0.01, lines: true, heat: true },
      toggles: [{ key: 'lines', label: T('Field lines', 'خطوط المجال'), live: true }, { key: 'heat', label: T('Potential (colour)', 'الجهد (لون)'), live: true }],
      view: S => { const xs = S.charges.map(c => c.x).concat(S.point ? [S.point[0]] : []), ys = S.charges.map(c => c.y).concat(S.point ? [S.point[1]] : []); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = Math.max(x1 - x0, y1 - y0, S.unit * 2) * 0.6; return { x0: x0 - pad, x1: x1 + pad, y0: y0 - pad, y1: y1 + pad }; },
      init(S, st) { st.F = P.forces(S.charges); st.E = S.point ? P.fieldAt(S.charges, S.point[0], S.point[1]) : null; },
      step() {},
      onDown: (S, st, x, y) => { const v = S.charges.findIndex(c => Math.hypot(c.x - x, c.y - y) < S.unit * 0.6); return v >= 0 ? { i: v } : false; },
      onDrag: (S, st, x, y, d, api) => { S.charges[d.i].x = +x.toFixed(4); S.charges[d.i].y = +y.toFixed(4); api.init(); },
      draw(g, p, S, st) {
        const c = L.colors();
        if (S.heat) { const n = 46; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = p.view.x0 + (i + 0.5) / n * (p.view.x1 - p.view.x0), y = p.view.y0 + (j + 0.5) / n * (p.view.y1 - p.view.y0), v = P.fieldAt(S.charges, x, y).v, s = Math.tanh(v / 3e5); g.fillStyle = s > 0 ? `rgba(220,38,38,${0.32 * s})` : `rgba(37,99,235,${-0.32 * s})`; g.fillRect(p.X(x - (p.view.x1 - p.view.x0) / n / 2), p.Y(y + (p.view.y1 - p.view.y0) / n / 2), p.W / n + 1, p.H / n + 1); } }
        if (S.lines) {
          const span = p.view.x1 - p.view.x0, ds = span / 300;
          S.charges.filter(q => q.q > 0).forEach(q0 => { const nl = Math.max(6, Math.round(Math.abs(q0.q) / 1e-6 * 6)); for (let k = 0; k < nl; k++) { let x = q0.x + Math.cos(k * 2 * Math.PI / nl) * ds * 3, y = q0.y + Math.sin(k * 2 * Math.PI / nl) * ds * 3; const pts = [[x, y]]; for (let s = 0; s < 600; s++) { const E = P.fieldAt(S.charges, x, y), m = Math.hypot(E.ex, E.ey) || 1; x += E.ex / m * ds; y += E.ey / m * ds; pts.push([x, y]); if (S.charges.some(b => b.q < 0 && Math.hypot(b.x - x, b.y - y) < ds * 2) || x < p.view.x0 || x > p.view.x1 || y < p.view.y0 || y > p.view.y1) break; } p.path(pts, c.dark ? 'rgba(226,232,240,.55)' : 'rgba(30,41,59,.45)', { w: 1.2 }); } });
        }
        const Fmax = Math.max(...st.F.map(f => Math.hypot(f[0], f[1]))) || 1, L0 = (p.view.x1 - p.view.x0) * 0.16;
        S.charges.forEach((q, i) => { const f = st.F[i], m = Math.hypot(f[0], f[1]); p.arrow(q.x, q.y, q.x + f[0] / Fmax * L0, q.y + f[1] / Fmax * L0, c.pal[2], `F${i + 1}`, { w: 2.5 }); p.dot(q.x, q.y, q.q > 0 ? '#dc2626' : '#2563eb', `q${i + 1} = ${f3(q.q * 1e6)} µC`, { r: 9, bold: true }); void m; });
        if (S.point && st.E) { const m = Math.hypot(st.E.ex, st.E.ey) || 1; p.dot(S.point[0], S.point[1], c.pal[3], 'P', { r: 5 }); p.arrow(S.point[0], S.point[1], S.point[0] + st.E.ex / m * L0, S.point[1] + st.E.ey / m * L0, c.pal[3], 'E', { w: 2.5 }); }
      },
      readout(S, st) { return st.F.map((f, i) => [`|F${i + 1}|`, f3(Math.hypot(f[0], f[1])) + ' N @ ' + f3(Math.atan2(f[1], f[0]) * 180 / Math.PI) + '°']).concat(st.E ? [['|E(P)|', f3(Math.hypot(st.E.ex, st.E.ey)) + ' N/C'], ['V(P)', f3(st.E.v) + ' V']] : []); },
      intro(S, st) { return T(`I placed your ${S.charges.length} charges. Net forces: ${st.F.map((f, i) => `F${i + 1} = ${f3(Math.hypot(f[0], f[1]))} N`).join(', ')}${st.E ? `; at P, |E| = ${f3(Math.hypot(st.E.ex, st.E.ey))} N/C and V = ${f3(st.E.v)} V` : ''}. Drag a charge to see everything update.`, 'وضعت الشحنات.'); },
      explain(S, st) { return `<p>${T('Each force is the vector sum of Coulomb forces from every other charge', 'كل قوة هي مجموع قوى كولوم')}: F<sub>i</sub> = Σ k q<sub>i</sub>q<sub>j</sub> r̂<sub>ji</sub>/r<sub>ji</sub>², k = 8.988×10⁹ N·m²/C².</p><ul>${S.charges.map((q, i) => `<li>q${i + 1} = ${f3(q.q * 1e6)} µC at (${f3(q.x)}, ${f3(q.y)}) m → F = (${f3(st.F[i][0])}, ${f3(st.F[i][1])}) N</li>`).join('')}</ul><p>${T('Newton’s third law check: the forces add to', 'تحقق قانون نيوتن الثالث: مجموع القوى')} (${f3(st.F.reduce((a, f) => a + f[0], 0))}, ${f3(st.F.reduce((a, f) => a + f[1], 0))}) N ≈ 0.</p>${st.E ? `<p>E(P) = Σ kq/r² r̂ = (${f3(st.E.ex)}, ${f3(st.E.ey)}) N/C; V(P) = Σ kq/r = ${f3(st.E.v)} V.</p>` : ''}`; },
      assume: T('Point charges in vacuum (ε₀); static; field lines start on positive charges and are drawn from a fixed number per µC; colours show potential sign and size (saturating).', 'شحنات نقطية في الفراغ.'),
      state: (S, st) => ({ charges: S.charges, F: st.F, E: st.E }),
      command(t, S) { const pc = parseCharges(t); if (pc.charges.length) { S.charges = S.charges.concat(pc.charges.map(c => Object.assign(c, { x: c.x * (S.unit / pc.unit), y: c.y * (S.unit / pc.unit) }))); return { note: T('Charge added.', 'أضيفت شحنة.') }; } if (/remove (the )?last charge/i.test(t) && S.charges.length > 1) { S.charges.pop(); return { note: T('Removed.', 'أزيلت.') }; } return null; }
    }));

  /* ======================= C · bounded region between two curves ======================= */
  reg('area', KIND.calc, T('Area between two curves', 'المساحة بين منحنيين'),
    t => {
      if (!/\b(area|region|bounded|enclosed)\b/i.test(t)) return null;
      const s = L.normalise(t), ex = [...s.matchAll(/y\s*=\s*([^,;]+?)(?=\s+(?:and|from|between|for|over|,)\b|,|;|\?|$|\s+y\s*=)/gi)].map(m => m[1].trim()).filter(e => /x/.test(e) || /^\s*-?\d/.test(e));
      if (ex.length < 2) return null;
      const b = s.match(/from\s*x\s*=\s*(-?[\d.]+)\s*to\s*(?:x\s*=\s*)?(-?[\d.]+)/i);
      return { score: 0.97, params: { set: { f: ex[0], g: ex[1], a: b ? +b[1] : null, b: b ? +b[2] : null } } };
    },
    { f: { expr: true }, g: { expr: true }, a: { min: -1e3, max: 1e3, nullable: true }, b: { min: -1e3, max: 1e3, nullable: true } },
    async ctx => {
      const M = await L.mathReady();
      const S0 = Object.assign({ f: 'x^2', g: 'x + 2', a: null, b: null }, ctx.params.set || {});
      const comp = e => { const c = M.compile(L.prep(e)); return x => { try { const v = c.evaluate({ x }); return typeof v === 'number' ? v : NaN; } catch (er) { return NaN; } }; };
      const solve = S => {
        const F = comp(S.f), G = comp(S.g), D = x => F(x) - G(x);
        let xs = S.a != null && S.b != null ? [S.a, S.b] : N.roots(D, -20, 20, 4000).sort((p, q) => p - q);
        xs = xs.filter((x, i) => i === 0 || Math.abs(x - xs[i - 1]) > 1e-7);
        if (xs.length < 2) return { F, G, xs, ok: false };
        const a = xs[0], b = xs[xs.length - 1];
        const cuts = [a].concat(N.roots(D, a, b, 2000).filter(x => x > a + 1e-7 && x < b - 1e-7)).concat([b]);
        const parts = []; for (let i = 0; i < cuts.length - 1; i++) { const m = (cuts[i] + cuts[i + 1]) / 2, top = F(m) >= G(m) ? 'f' : 'g', I = N.simpson(D, cuts[i], cuts[i + 1], 2000); parts.push({ a: cuts[i], b: cuts[i + 1], top, area: Math.abs(I) }); }
        return { F, G, xs: cuts, a, b, parts, area: parts.reduce((s, q) => s + q.area, 0), ok: true };
      };
      return {
        static: true, autoplay: false, graph: false, defaults: S0,
        view: S => { const r = solve(S); const a = r.ok ? r.a : -4, b = r.ok ? r.b : 4, w = Math.max(1, b - a); let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 100; i++) { const x = a - w * 0.3 + w * 1.6 * i / 100; [r.F(x), r.G(x)].forEach(v => { if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); } const h = Math.max(1, hi - lo); return { x0: a - w * 0.35, x1: b + w * 0.35, y0: lo - h * 0.15, y1: hi + h * 0.15 }; },
        equal: false,
        init(S, st) { st.r = solve(S); }, step() {},
        draw(g, p, S, st) {
          const c = L.colors(), r = st.r;
          if (r.ok) r.parts.forEach((q, k) => { g.fillStyle = k % 2 ? 'rgba(234,88,12,.22)' : 'rgba(37,99,235,.2)'; g.beginPath(); const n = 160; for (let i = 0; i <= n; i++) { const x = q.a + (q.b - q.a) * i / n; const y = r.F(x); i ? g.lineTo(p.X(x), p.Y(y)) : g.moveTo(p.X(x), p.Y(y)); } for (let i = n; i >= 0; i--) { const x = q.a + (q.b - q.a) * i / n; g.lineTo(p.X(x), p.Y(r.G(x))); } g.closePath(); g.fill(); });
          p.fn(r.F, c.pal[0], { w: 2.6 }); p.fn(r.G, c.pal[1], { w: 2.6 });
          label(g, p, p.view.x0 + (p.view.x1 - p.view.x0) * 0.02, p.view.y1 - (p.view.y1 - p.view.y0) * 0.06, 'y = ' + S.f, c.pal[0]);
          label(g, p, p.view.x0 + (p.view.x1 - p.view.x0) * 0.02, p.view.y1 - (p.view.y1 - p.view.y0) * 0.12, 'y = ' + S.g, c.pal[1]);
          if (r.ok) r.xs.forEach(x => p.dot(x, r.F(x), c.ink, `x = ${f3(x)}`, { r: 4 }));
        },
        readout: (S, st) => (st.r.ok ? [[T('area', 'المساحة'), f3(st.r.area)], [T('bounds', 'الحدود'), `${f3(st.r.a)} … ${f3(st.r.b)}`], [T('pieces', 'الأجزاء'), st.r.parts.length]] : [[T('area', 'المساحة'), T('no bounded region found', 'لا توجد منطقة محدودة')]]),
        intro: (S, st) => (st.r.ok ? T(`The curves y = ${S.f} and y = ${S.g} ${S.a != null ? `between x = ${S.a} and x = ${S.b}` : `meet at x = ${st.r.xs.filter((x, i, A) => i === 0 || i === A.length - 1 || true).map(f3).join(', ')}`}. The enclosed area is ${f3(st.r.area)} square units.`, 'المساحة المحصورة.') : T('These two curves don’t enclose a region I can find between x = −20 and 20. Give bounds, e.g. “from x = 0 to 2”.', 'لم أجد منطقة محصورة.')),
        explain(S, st) { const r = st.r; if (!r.ok) return ''; return `<p>${T('Area = ∫ (top − bottom) dx, split wherever the curves cross so the integrand never changes sign:', 'المساحة = ∫ (الأعلى − الأسفل)')}</p><ul>${r.parts.map(q => `<li>x ∈ [${f3(q.a)}, ${f3(q.b)}]: ${T('top is', 'الأعلى')} y = ${q.top === 'f' ? esc(S.f) : esc(S.g)} → ∫ = ${f3(q.area)}</li>`).join('')}</ul><p><b>${T('Total', 'المجموع')} = ${f3(r.area)}</b> <small>(${T('Simpson’s rule, n = 2000 per piece; intersections found numerically', 'قاعدة سيمبسون؛ التقاطعات عددية')})</small></p>`; },
        assume: T('Intersections are searched for between x = −20 and 20 unless you give bounds; the area is computed numerically (Simpson) and is exact to many digits for smooth curves.', 'التقاطعات بين −20 و20.'),
        state: (S, st) => ({ f: S.f, g: S.g, area: st.r.area, xs: st.r.xs, ok: st.r.ok }),
        command(t, S) { if ((L.normalise(t).match(/y\s*=/gi) || []).length >= 2) return null; // a new pair of curves is a new problem
          const m = L.normalise(t).match(/from\s*x\s*=\s*(-?[\d.]+)\s*to\s*(?:x\s*=\s*)?(-?[\d.]+)/i); if (m) { S.a = +m[1]; S.b = +m[2]; return { note: T('Bounds set.', 'حُددت الحدود.') }; } return null; }
      };
    });

  /* ======================= D · organic mechanisms (curved arrows) ======================= */
  // atoms: [id, label, x, y, charge]; bonds: [a, b, order]; arrows: [from, to] where an end is an atom id or "a-b" (a bond)
  const MECH = {
    sn1: { name: T('SN1 hydrolysis of 2-bromo-2-methylpropane', 'تحلل SN1'), steps: [
      { title: T('Start: tert-butyl bromide and water', 'البداية'), atoms: [['C', 'C', 0, 0], ['Me1', 'CH₃', -1.1, 0.8], ['Me2', 'CH₃', -1.1, -0.8], ['Me3', 'CH₃', 0, 1.3], ['Br', 'Br', 1.5, 0], ['O', 'H₂O', -0.2, -2.2]], bonds: [['C', 'Me1', 1], ['C', 'Me2', 1], ['C', 'Me3', 1], ['C', 'Br', 1]], arrows: [['C-Br', 'Br']], note: T('Rate-determining step: the C–Br bond breaks heterolytically; both electrons go to bromine.', 'الخطوة المحددة للسرعة.') },
      { title: T('Carbocation intermediate (planar) + bromide', 'كاتيون كربوني'), atoms: [['C', 'C', 0, 0, '+'], ['Me1', 'CH₃', -1.1, 0.8], ['Me2', 'CH₃', -1.1, -0.8], ['Me3', 'CH₃', 1.1, 0.8], ['Br', 'Br', 2.6, -0.6, '−'], ['O', 'H₂O', 0, -1.9]], bonds: [['C', 'Me1', 1], ['C', 'Me2', 1], ['C', 'Me3', 1]], arrows: [['O', 'C']], note: T('A lone pair on water attacks the flat carbocation (from either face).', 'الماء يهاجم.') },
      { title: T('Protonated alcohol (oxonium ion)', 'أيون الأكسونيوم'), atoms: [['C', 'C', 0, 0], ['Me1', 'CH₃', -1.1, 0.8], ['Me2', 'CH₃', -1.1, -0.8], ['Me3', 'CH₃', 1.1, 0.8], ['O', 'OH₂', 0, -1.4, '+'], ['W', 'H₂O', 1.8, -2.2]], bonds: [['C', 'Me1', 1], ['C', 'Me2', 1], ['C', 'Me3', 1], ['C', 'O', 1]], arrows: [['W', 'O'], ['O', 'O']], note: T('A second water molecule removes a proton from the oxonium ion.', 'جزيء ماء ثانٍ يزيل بروتوناً.') },
      { title: T('Products: 2-methylpropan-2-ol + H₃O⁺ + Br⁻', 'النواتج'), atoms: [['C', 'C', 0, 0], ['Me1', 'CH₃', -1.1, 0.8], ['Me2', 'CH₃', -1.1, -0.8], ['Me3', 'CH₃', 1.1, 0.8], ['O', 'OH', 0, -1.4], ['W', 'H₃O', 1.9, -2.2, '+'], ['Br', 'Br', 2.6, -0.4, '−']], bonds: [['C', 'Me1', 1], ['C', 'Me2', 1], ['C', 'Me3', 1], ['C', 'O', 1]], arrows: [], note: T('Overall: rate = k[R–Br] (first order); a chiral centre would give a mixture of configurations.', 'السرعة من الرتبة الأولى.') }] },
    sn2: { name: T('SN2: hydroxide with bromomethane', 'SN2'), steps: [
      { title: T('Backside attack', 'هجوم خلفي'), atoms: [['Nu', 'HO', -2.2, 0, '−'], ['C', 'C', 0, 0], ['H1', 'H', 0.4, 1.1], ['H2', 'H', 0.4, -1.1], ['H3', 'H', -0.5, 0.6], ['Br', 'Br', 1.6, 0]], bonds: [['C', 'H1', 1], ['C', 'H2', 1], ['C', 'H3', 1], ['C', 'Br', 1]], arrows: [['Nu', 'C'], ['C-Br', 'Br']], note: T('One concerted step: the C–O bond forms as the C–Br bond breaks, opposite the leaving group.', 'خطوة واحدة متزامنة.') },
      { title: T('Transition state (trigonal bipyramidal)', 'الحالة الانتقالية'), atoms: [['Nu', 'HO', -1.4, 0, 'δ−'], ['C', 'C', 0, 0], ['H1', 'H', 0, 1.1], ['H2', 'H', 0.3, -1], ['H3', 'H', -0.3, -0.9], ['Br', 'Br', 1.5, 0, 'δ−']], bonds: [['C', 'H1', 1], ['C', 'H2', 1], ['C', 'H3', 1], ['C', 'Br', 0.5], ['Nu', 'C', 0.5]], arrows: [], note: T('Partial bonds to both O and Br; rate = k[CH₃Br][OH⁻] (second order).', 'روابط جزئية.') },
      { title: T('Products: methanol + bromide (inverted carbon)', 'النواتج'), atoms: [['Nu', 'HO', -1.4, 0], ['C', 'C', 0, 0], ['H1', 'H', -0.4, 1.1], ['H2', 'H', -0.4, -1.1], ['H3', 'H', 0.5, 0.6], ['Br', 'Br', 2.4, 0, '−']], bonds: [['C', 'H1', 1], ['C', 'H2', 1], ['C', 'H3', 1], ['Nu', 'C', 1]], arrows: [], note: T('Walden inversion: the other three groups flip like an umbrella.', 'انقلاب فالدن.') }] },
    e2: { name: T('E2: ethoxide with 2-bromopropane', 'E2'), steps: [
      { title: T('Base removes a β-hydrogen anti to Br', 'القاعدة تزيل هيدروجين بيتا'), atoms: [['B', 'EtO', -2.4, 1.6, '−'], ['Ca', 'C', 0, 0], ['Cb', 'C', -1.2, 0.6], ['H', 'H', -1.6, 1.5], ['Me', 'CH₃', 1.1, 0.7], ['Hb', 'H', -1.9, -0.1], ['Br', 'Br', 0.4, -1.4]], bonds: [['Ca', 'Cb', 1], ['Cb', 'H', 1], ['Ca', 'Me', 1], ['Cb', 'Hb', 1], ['Ca', 'Br', 1]], arrows: [['B', 'H'], ['Cb-H', 'Ca-Cb'], ['Ca-Br', 'Br']], note: T('Three arrows in one concerted step: base takes H⁺, the C–H electrons form the π bond, Br⁻ leaves.', 'ثلاثة أسهم في خطوة واحدة.') },
      { title: T('Products: propene + ethanol + Br⁻', 'النواتج'), atoms: [['B', 'EtOH', -2.6, 1.8], ['Ca', 'C', 0, 0], ['Cb', 'C', -1.2, 0.6], ['Me', 'CH₃', 1.1, 0.7], ['Hb', 'H', -1.9, -0.1], ['Br', 'Br', 0.8, -1.6, '−']], bonds: [['Ca', 'Cb', 2], ['Ca', 'Me', 1], ['Cb', 'Hb', 1]], arrows: [], note: T('Rate = k[R–Br][base]; strong bulky bases and heat favour E2 over SN2.', 'السرعة من الرتبة الثانية.') }] }
  };
  reg('mechanism', KIND.chem, T('Reaction mechanism', 'آلية التفاعل'),
    t => { if (!/\b(mechanism|curved arrows?|arrow pushing|sn1|sn2|e2|e1)\b/i.test(t)) return null; const k = /\bsn1\b|tert-?butyl|2-bromo-2-methyl/i.test(t) ? 'sn1' : /\be2\b|elimination/i.test(t) && !/\be1\b/i.test(t) ? 'e2' : /\bsn2\b|bromomethane|backside/i.test(t) ? 'sn2' : null; if (!k) return null; // any other mechanism: Noor explains it rather than opening a different one
      return { score: 0.95, params: { set: { mech: k } } }; },
    { mech: { options: Object.keys(MECH) }, step: { min: 0, max: 5 } },
    ctx => {
      const want = (ctx.params.set || {}).mech;
      return {
        static: true, autoplay: false, graph: false, grid: false, pan: false, labels: { x: '', y: '' },
        defaults: { mech: MECH[want] ? want : 'sn1', step: 0, missing: want && !MECH[want] ? want : null },
        selects: [{ key: 'mech', label: T('Mechanism', 'الآلية'), num: false, options: Object.entries(MECH).map(([k, v]) => [k, v.name]), onSet: S => { S.step = 0; S.missing = null; } }],
        extraControls(pg, S, st, api) { pg.appendChild(ui.buttons([['◀ ' + T('Previous step', 'الخطوة السابقة'), () => { S.step = Math.max(0, S.step - 1); api.init(); api.redraw(); L.explainNow(); }, { key: 'prev' }], [T('Next step', 'الخطوة التالية') + ' ▶', () => { S.step = Math.min(MECH[S.mech].steps.length - 1, S.step + 1); api.init(); api.redraw(); L.explainNow(); }, { key: 'next', primary: true }]])); },
        view: () => ({ x0: -3.4, x1: 3.4, y0: -2.8, y1: 2.4 }),
        init(S, st) { st.m = MECH[S.mech]; st.s = st.m.steps[Math.min(S.step, st.m.steps.length - 1)]; }, step() {},
        draw(g, p, S, st) {
          const c = L.colors(), s = st.s, A = Object.fromEntries(s.atoms.map(a => [a[0], a]));
          s.bonds.forEach(([a, b, o]) => { const P1 = A[a], P2 = A[b]; if (!P1 || !P2) return; const dx = P2[2] - P1[2], dy = P2[3] - P1[3], l = Math.hypot(dx, dy), nx = -dy / l * 0.07, ny = dx / l * 0.07; if (o === 0.5) p.path([[P1[2], P1[3]], [P2[2], P2[3]]], c.muted, { w: 2, dash: [5, 4] }); else if (o === 2) { p.path([[P1[2] + nx, P1[3] + ny], [P2[2] + nx, P2[3] + ny]], c.ink, { w: 2 }); p.path([[P1[2] - nx, P1[3] - ny], [P2[2] - nx, P2[3] - ny]], c.ink, { w: 2 }); } else p.path([[P1[2], P1[3]], [P2[2], P2[3]]], c.ink, { w: 2 }); });
          s.atoms.forEach(a => { const X = p.X(a[2]), Y = p.Y(a[3]); g.fillStyle = c.bg; g.beginPath(); g.arc(X, Y, 15, 0, 7); g.fill(); g.font = '600 14px ui-sans-serif, system-ui'; g.fillStyle = /Br/.test(a[1]) ? '#b45309' : /O/.test(a[1]) ? '#dc2626' : c.ink; g.textAlign = 'center'; g.fillText(a[1], X, Y + 5); if (a[4]) { g.font = '700 12px ui-sans-serif'; g.fillStyle = a[4].includes('+') ? '#dc2626' : '#2563eb'; g.fillText(a[4], X + 16, Y - 10); } g.textAlign = 'left'; });
          const end = e => { if (e.includes('-')) { const [a, b] = e.split('-'); return [(A[a][2] + A[b][2]) / 2, (A[a][3] + A[b][3]) / 2]; } return [A[e][2], A[e][3]]; };
          s.arrows.forEach(([f, t2], k) => { const a = end(f), b = end(t2); if (!a || !b) return; const X1 = p.X(a[0]), Y1 = p.Y(a[1]), X2 = p.X(b[0]), Y2 = p.Y(b[1]), mx = (X1 + X2) / 2, my = (Y1 + Y2) / 2, d = Math.max(30, Math.hypot(X2 - X1, Y2 - Y1) * 0.45), qx = mx - (Y2 - Y1) / (Math.hypot(X2 - X1, Y2 - Y1) || 1) * d, qy = my + (X2 - X1) / (Math.hypot(X2 - X1, Y2 - Y1) || 1) * d - (f === t2 ? 40 : 0);
            g.strokeStyle = g.fillStyle = c.pal[k % 3 === 0 ? 1 : k % 3 === 1 ? 4 : 5]; g.lineWidth = 2.2; g.beginPath(); g.moveTo(X1, Y1 - 6); g.quadraticCurveTo(qx, qy, X2, Y2 - 8); g.stroke(); const ang = Math.atan2(Y2 - 8 - qy, X2 - qx); g.beginPath(); g.moveTo(X2, Y2 - 8); g.lineTo(X2 - 10 * Math.cos(ang - 0.4), Y2 - 8 - 10 * Math.sin(ang - 0.4)); g.lineTo(X2 - 10 * Math.cos(ang + 0.4), Y2 - 8 - 10 * Math.sin(ang + 0.4)); g.closePath(); g.fill(); });
          g.font = '600 13px ui-sans-serif, system-ui'; g.fillStyle = c.ink; g.fillText(`${T('Step', 'الخطوة')} ${S.step + 1}/${st.m.steps.length}: ${s.title}`, 12, 22);
        },
        readout: (S, st) => [[T('step', 'الخطوة'), `${S.step + 1} / ${st.m.steps.length}`], [T('curved arrows', 'الأسهم'), st.s.arrows.length]],
        intro: (S, st) => (S.missing ? T(`I don’t have an accurate step-by-step model for “${S.missing.toUpperCase()}” yet, so I won’t draw one. Available here: SN1, SN2 and E2 (shown: ${st.m.name}).`, 'غير متاح بعد.') : T(`${st.m.name}: ${st.m.steps.length} stages. Use “Next step” to follow the curved arrows (each arrow moves one pair of electrons).`, 'استخدم الخطوة التالية.')),
        explain: (S, st) => `<p><b>${st.s.title}</b></p><p>${st.s.note}</p><p class="muted">${T('Curved arrow = movement of an electron pair, from a lone pair or bond to an atom or new bond.', 'السهم المنحني = حركة زوج إلكترونات.')}</p>`,
        assume: T('Hand-checked mechanisms for three reaction types (SN1, SN2, E2). Structures are drawn schematically (2D, condensed groups), not to scale; other mechanisms are not drawn rather than guessed.', 'ثلاث آليات فقط.'),
        state: (S, st) => ({ mech: S.mech, step: S.step, steps: st.m.steps.length, arrows: st.s.arrows.length, title: st.s.title, missing: S.missing }),
        command(t, S) { if (/\bnext\b/i.test(t)) { S.step = Math.min(MECH[S.mech].steps.length - 1, S.step + 1); return { note: T('Next step.', 'الخطوة التالية.') }; } if (/\b(back|previous)\b/i.test(t)) { S.step = Math.max(0, S.step - 1); return { note: T('Previous step.', 'الخطوة السابقة.') }; } return null; }
      };
    });

  /* ======================= E · circuit topology from a description ======================= */
  function parseNet(t) {
    const comps = [];
    for (const m of String(t).matchAll(/\b(R\d*|resistor\s*\w*)\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)\s*(k)?\s*(?:Ω|ohms?)\s*(?:is\s*)?(?:connected\s*)?(?:between|from|across)\s*(?:nodes?\s*)?([A-Z]\w?)\s*(?:and|to|-)\s*(?:node\s*)?([A-Z]\w?)\b/gi)) comps.push({ type: 'R', name: /^R\d+$/i.test(m[1]) ? m[1].toUpperCase() : 'R' + (comps.length + 1), R: +m[2] * (m[3] ? 1000 : 1), a: m[4].toUpperCase(), b: m[5].toUpperCase() });
    const src = [...String(t).matchAll(/(\d+(?:\.\d+)?)\s*V\b\s*(?:battery|source|cell|supply)?\s*(?:is\s*)?(?:connected\s*)?(?:between|from|across)\s*(?:nodes?\s*)?([A-Z]\w?)\s*(?:\(\+\)|\+)?\s*(?:and|to|-)\s*(?:node\s*)?([A-Z]\w?)\b/gi)].map(m => ({ type: 'V', name: 'V' + 1, V: +m[1], a: m[2].toUpperCase(), b: m[3].toUpperCase() }));
    return comps.concat(src.slice(0, 2));
  }
  P.netAnalyse = comps => {
    const names = [...new Set(comps.flatMap(c => [c.a, c.b]))], vs = comps.filter(c => c.type === 'V');
    if (!vs.length || names.length < 2) return null;
    const gnd = vs[0].b, order = [gnd].concat(names.filter(n => n !== gnd)), idx = Object.fromEntries(order.map((n, i) => [n, i]));
    const els = comps.map(c => Object.assign({ type: c.type, a: idx[c.a], b: idx[c.b] }, c.type === 'R' ? { R: c.R } : { V: c.V }));
    const sol = P.solveDC(order.length, els); if (!sol) return { error: 'singular', names: order };
    const cur = els.map(e => sol.I(e));
    const branches = comps.length, nodes = order.length, loops = branches - nodes + 1;
    const deg = Object.fromEntries(order.map(n => [n, comps.filter(c => c.a === n || c.b === n).length]));
    const pairs = {}; comps.forEach((c, i) => { const k = [c.a, c.b].sort().join('|'); (pairs[k] = pairs[k] || []).push(i); });
    const parallel = Object.values(pairs).filter(a => a.length > 1 && a.every(i => comps[i].type === 'R')).map(a => a.map(i => comps[i].name));
    const series = order.filter(n => deg[n] === 2 && !comps.some(c => c.type === 'V' && (c.a === n || c.b === n))).map(n => comps.filter(c => c.a === n || c.b === n).map(c => c.name));
    const kcl = order.map((n, i) => { let s = 0; els.forEach((e, k) => { if (e.a === i) s -= cur[k]; if (e.b === i) s += cur[k]; }); return s; });
    // a bridge: the network is not reducible by series/parallel steps alone
    let g = comps.filter(c => c.type === 'R').map(c => [c.a, c.b]), changed = true; const term = new Set(vs.flatMap(v => [v.a, v.b]));
    while (changed && g.length > 1) { changed = false; const seen = {}; for (let i = 0; i < g.length; i++) { const k = g[i].slice().sort().join('|'); if (seen[k] != null) { g.splice(i, 1); changed = true; break; } seen[k] = i; } if (changed) continue; const d = {}; g.forEach(([a, b]) => { d[a] = (d[a] || 0) + 1; d[b] = (d[b] || 0) + 1; }); const n = Object.keys(d).find(x => d[x] === 2 && !term.has(x)); if (n) { const two = g.filter(e => e.includes(n)); const ends = two.map(e => (e[0] === n ? e[1] : e[0])); g = g.filter(e => !e.includes(n)).concat([ends]); changed = true; } }
    return { order, V: sol.V, cur, nodes, branches, loops, parallel, series, kcl, bridge: g.length > 1, gnd };
  };
  reg('netlist', KIND.circ, T('Circuit topology and analysis', 'طوبولوجيا الدائرة وتحليلها'),
    t => { const c = parseNet(t); return c.filter(x => x.type === 'R').length >= 2 && c.some(x => x.type === 'V') ? { score: 0.97, params: { set: { comps: c } } } : (/\b(node|nodal|mesh|kirchhoff|topology)\b/i.test(t) && /\bcircuit\b/i.test(t) ? { score: 0.9, params: {} } : null); },
    { comps: { list: true, max: 16 } },
    () => ({
      static: true, autoplay: false, graph: false, grid: false, pan: true, labels: { x: '', y: '' },
      defaults: { comps: [{ type: 'R', name: 'R1', R: 10, a: 'A', b: 'B' }, { type: 'R', name: 'R2', R: 20, a: 'A', b: 'C' }, { type: 'R', name: 'R3', R: 30, a: 'B', b: 'D' }, { type: 'R', name: 'R4', R: 40, a: 'C', b: 'D' }, { type: 'R', name: 'R5', R: 50, a: 'B', b: 'C' }, { type: 'V', name: 'V1', V: 12, a: 'A', b: 'D' }] },
      view: () => ({ x0: -1.8, x1: 1.8, y0: -1.5, y1: 1.5 }),
      init(S, st) { st.r = P.netAnalyse(S.comps); const n = st.r ? st.r.order : []; st.pos = Object.fromEntries(n.map((k, i) => [k, [Math.cos(Math.PI / 2 + i * 2 * Math.PI / n.length) * 1.1, Math.sin(Math.PI / 2 + i * 2 * Math.PI / n.length) * 1.1]])); }, step() {},
      draw(g, p, S, st) {
        const c = L.colors(), r = st.r; if (!r || r.error) { label(g, p, -1.5, 0, T('I couldn’t solve this network (is every part connected to the source?)', 'تعذر حل الشبكة'), c.pal[1]); return; }
        const seen = {};
        S.comps.forEach((e, i) => { const A = st.pos[e.a], B = st.pos[e.b], k = [e.a, e.b].sort().join('|'), n = (seen[k] = (seen[k] || 0) + 1) - 1, off = (n - 0.5 * ((S.comps.filter(x => [x.a, x.b].sort().join('|') === k).length) - 1)) * 0.28; const mx = (A[0] + B[0]) / 2 - (B[1] - A[1]) * off, my = (A[1] + B[1]) / 2 + (B[0] - A[0]) * off;
          p.path([A, [mx, my], B], e.type === 'V' ? c.pal[3] : c.ink, { w: 2.2 }); const I = r.cur[i], dir = I >= 0 ? 1 : -1, ux = (B[0] - A[0]) * dir, uy = (B[1] - A[1]) * dir, ul = Math.hypot(ux, uy) || 1;
          p.arrow(mx - ux / ul * 0.1, my - uy / ul * 0.1, mx + ux / ul * 0.1, my + uy / ul * 0.1, c.pal[2], '', { w: 2 });
          label(g, p, mx + 0.06, my + 0.08, `${e.name} ${e.type === 'R' ? e.R + ' Ω' : e.V + ' V'} · ${f3(Math.abs(I))} A`, e.type === 'V' ? c.pal[3] : c.muted); });
        r.order.forEach((n, i) => p.dot(st.pos[n][0], st.pos[n][1], c.pal[0], `${n}: ${f3(r.V[i])} V${n === r.gnd ? ' (0 V ref)' : ''}`, { r: 7, bold: true }));
      },
      readout: (S, st) => (st.r && !st.r.error ? [[T('nodes / branches / loops', 'العقد/الفروع/الحلقات'), `${st.r.nodes} / ${st.r.branches} / ${st.r.loops}`], [T('max KCL error', 'أقصى خطأ'), f3(Math.max(...st.r.kcl.map(Math.abs))) + ' A'], [T('bridge', 'جسر'), st.r.bridge ? T('yes', 'نعم') : T('no', 'لا')]] : []),
      intro: (S, st) => (st.r && !st.r.error ? T(`Your circuit has ${st.r.nodes} nodes, ${st.r.branches} branches and ${st.r.loops} independent loop${st.r.loops === 1 ? '' : 's'}. ${st.r.bridge ? 'It contains a bridge, so series/parallel reduction alone can’t solve it — I used nodal analysis (MNA).' : 'It reduces by series/parallel steps; I solved it with nodal analysis to be exact.'} Source current: ${f3(Math.abs(st.r.cur[S.comps.findIndex(c => c.type === 'V')]))} A.`, 'تحليل الدائرة.') : T('I need at least two resistors with the nodes they connect and a source, e.g. “R1 = 4 Ω between A and B, R2 = 6 Ω between B and C, 12 V battery between A and C”.', 'أحتاج وصفاً للدائرة.')),
      explain(S, st) { const r = st.r; if (!r || r.error) return ''; return `<p>${T('Topology', 'الطوبولوجيا')}: n = ${r.nodes}, b = ${r.branches} → ${T('independent loops', 'الحلقات المستقلة')} = b − n + 1 = ${r.loops}.</p><ul>${r.parallel.length ? `<li>${T('In parallel (same two nodes)', 'على التوازي')}: ${r.parallel.map(a => a.join(' ∥ ')).join('; ')}</li>` : ''}${r.series.length ? `<li>${T('In series (through a node with nothing else)', 'على التوالي')}: ${r.series.map(a => a.join(' + ')).join('; ')}</li>` : ''}<li>${r.bridge ? T('Bridge present: not series–parallel reducible.', 'يوجد جسر.') : T('Series–parallel reducible.', 'قابلة للاختزال.')}</li></ul><p>${T('Node voltages (reference', 'جهود العقد (المرجع')} ${r.gnd} = 0 V): ${r.order.map((n, i) => `${n} = ${f3(r.V[i])} V`).join(', ')}.</p><p>${T('Currents', 'التيارات')}: ${S.comps.map((c, i) => `${c.name} ${f3(Math.abs(r.cur[i]))} A`).join(', ')}. ${T('Kirchhoff’s current law holds at every node to', 'قانون كيرشوف محقق بدقة')} ${f3(Math.max(...r.kcl.map(Math.abs)))} A.</p>`; },
      assume: T('Ideal DC resistors and sources; the negative terminal of the first source is the 0 V reference; layout places nodes on a circle (topology, not physical wiring).', 'مقاومات ومصادر مثالية.'),
      state: (S, st) => (st.r ? { nodes: st.r.nodes, branches: st.r.branches, loops: st.r.loops, V: st.r.V, I: st.r.cur, bridge: st.r.bridge, order: st.r.order, parallel: st.r.parallel, series: st.r.series } : null)
    }));

  /* ======================= F · gear trains ======================= */
  P.gearTrain = (teeth, compound, rpmIn, torqueIn, eta) => {
    // simple: every gear meshes the next. compound: gears 2k+1 and 2k+2 (1-based 2,3 / 4,5…) share a shaft
    const n = teeth.length, w = new Array(n).fill(0), shaft = new Array(n).fill(0); w[0] = rpmIn; let meshes = 0, s = 0;
    for (let i = 1; i < n; i++) { if (compound && i % 2 === 0) { w[i] = w[i - 1]; shaft[i] = s; } else { w[i] = -w[i - 1] * teeth[i - 1] / teeth[i]; meshes++; s++; shaft[i] = s; } }
    const ratio = rpmIn / w[n - 1];
    return { w, ratio, torqueOut: torqueIn * Math.abs(ratio) * Math.pow(eta, meshes), meshes, shaft };
  };
  reg('gears', KIND.mechE, T('Gear train', 'قطار تروس'),
    t => { const tt = [...String(t).matchAll(/(\d+)\s*[- ]?(?:teeth|tooth|T\b)/gi)].map(m => +m[1]).filter(v => v >= 6 && v <= 400); if (tt.length < 2 && !/\bgear (train|ratio|mechanism|box)\b/i.test(t)) return null; return { score: tt.length >= 2 ? 0.96 : 0.9, params: { set: Object.assign(tt.length >= 2 ? { teeth: tt.slice(0, 6) } : {}, { compound: /\b(compound|same shaft|keyed together|on one shaft)\b/i.test(t) }, /rpm/i.test(t) ? { rpm: num(t, /(\d+(?:\.\d+)?)\s*rpm/i, 120) } : {}, /N\s*·?\s*m\b/i.test(t) ? { torque: num(t, /(\d+(?:\.\d+)?)\s*N\s*·?\s*m\b/i, 10) } : {}) } }; },
    { teeth: { list: true, max: 6, min: 6, maxv: 400 }, compound: { bool: true }, rpm: { min: 0, max: 1e5 }, torque: { min: 0, max: 1e5 }, eta: { min: 0.5, max: 1 } },
    () => ({
      graph: false, autoplay: true, grid: false, labels: { x: '', y: '' }, h: 1 / 120,
      defaults: { teeth: [20, 40], compound: false, rpm: 120, torque: 10, eta: 0.98, show: 1 },
      params: [{ key: 'rpm', label: T('input speed', 'سرعة الإدخال'), unit: 'rpm', min: 1, max: 3000, step: 1 }, { key: 'torque', label: T('input torque', 'عزم الإدخال'), unit: 'N·m', min: 0.1, max: 500, step: 0.1 }, { key: 'eta', label: T('efficiency per mesh', 'الكفاءة لكل تعشيق'), unit: '', min: 0.8, max: 1, step: 0.005 }],
      toggles: [{ key: 'compound', label: T('Compound (pairs share a shaft)', 'مركّب'), live: false }],
      view: S => { const tot = S.teeth.reduce((a, b) => a + b, 0) / 2 + 10; return { x0: -S.teeth[0] / 2 - 5, x1: tot + 5, y0: -tot / 2.4, y1: tot / 2.4 }; },
      init(S, st) { st.r = P.gearTrain(S.teeth, S.compound, S.rpm, S.torque, S.eta); st.ang = S.teeth.map(() => 0);
        // compound: the gear on a shared shaft sits on top of its partner (drawn offset vertically)
        st.pos = []; let cx = 0; S.teeth.forEach((n, i) => { if (i === 0) st.pos.push([0, 0]); else if (S.compound && i % 2 === 0) st.pos.push([st.pos[i - 1][0], 0]); else { cx = st.pos[i - 1][0] + (S.teeth[i - 1] + n) / 2; st.pos.push([cx, 0]); } });
        st.phase = S.teeth.map((n, i) => (i && !(S.compound && i % 2 === 0) ? Math.PI / n : 0)); },
      step(S, st, h) { st.r.w.forEach((w, i) => { st.ang[i] += w * 2 * Math.PI / 60 * h * 0.25; }); }, // shown at a quarter of real speed
      draw(g, p, S, st) {
        const c = L.colors();
        S.teeth.forEach((n, i) => { const [x, y] = st.pos[i], R = n / 2, a0 = st.ang[i] + st.phase[i]; const shared = S.compound && i > 0 && i % 2 === 0; g.fillStyle = shared ? (c.dark ? 'rgba(251,191,36,.35)' : 'rgba(180,83,9,.25)') : (c.dark ? 'rgba(96,165,250,.28)' : 'rgba(37,99,235,.18)'); g.strokeStyle = shared ? c.pal[3] : c.pal[0]; g.lineWidth = 1.6; g.beginPath();
          for (let k = 0; k < n; k++) { const a = a0 + k * 2 * Math.PI / n, d = Math.PI / n; [[a - d * 0.5, R - 0.9], [a - d * 0.3, R + 0.9], [a + d * 0.3, R + 0.9], [a + d * 0.5, R - 0.9], [a + d * 1.5, R - 0.9]].forEach(([b, rr], j) => { const X = p.X(x + rr * Math.cos(b)), Y = p.Y(y + rr * Math.sin(b)); k === 0 && j === 0 ? g.moveTo(X, Y) : g.lineTo(X, Y); }); }
          g.closePath(); g.fill(); g.stroke(); p.path([[x, y], [x + R * 0.7 * Math.cos(a0), y + R * 0.7 * Math.sin(a0)]], c.ink, { w: 2 }); p.dot(x, y, c.ink, '', { r: 3 });
          label(g, p, x - R * 0.4, y - R - 3, `${n}T · ${f3(st.r.w[i])} rpm${st.r.w[i] < 0 ? ' ↻' : ' ↺'}`, c.ink); });
      },
      readout: (S, st) => [[T('ratio (in:out)', 'النسبة'), f3(Math.abs(st.r.ratio)) + ' : 1'], [T('output speed', 'سرعة الإخراج'), f3(Math.abs(st.r.w[st.r.w.length - 1])) + ' rpm ' + (st.r.w[st.r.w.length - 1] * S.rpm < 0 ? T('(reversed)', '(معكوس)') : T('(same direction)', '(نفس الاتجاه)'))], [T('output torque', 'عزم الإخراج'), f3(st.r.torqueOut) + ' N·m']],
      intro: (S, st) => T(`Your ${S.compound ? 'compound' : 'simple'} train (${S.teeth.join(' → ')} teeth): ratio ${f3(Math.abs(st.r.ratio))}:1, output ${f3(Math.abs(st.r.w[st.r.w.length - 1]))} rpm ${st.r.w[st.r.w.length - 1] < 0 ? 'in the opposite direction' : 'in the same direction'}, torque ≈ ${f3(st.r.torqueOut)} N·m.`, 'قطار التروس.'),
      explain: (S, st) => `<p>${T('Each mesh: ω₂ = −ω₁·N₁/N₂ (the minus sign is the reversal). Gears on one shaft turn together.', 'كل تعشيق يعكس الاتجاه.')}</p><ul>${S.teeth.map((n, i) => `<li>${T('gear', 'ترس')} ${i + 1}: ${n} ${T('teeth', 'سن')}, ${f3(st.r.w[i])} rpm${S.compound && i > 0 && i % 2 === 0 ? ' (' + T('same shaft as gear', 'نفس عمود الترس') + ' ' + i + ')' : ''}</li>`).join('')}</ul><p>${T('Torque out = torque in × ratio × η^meshes', 'العزم = العزم × النسبة × الكفاءة')} = ${S.torque} × ${f3(Math.abs(st.r.ratio))} × ${S.eta}^${st.r.meshes} = <b>${f3(st.r.torqueOut)} N·m</b>. ${T('Power in = power out ÷ efficiency', 'القدرة')}: ${f3(S.torque * S.rpm * 2 * Math.PI / 60)} W → ${f3(st.r.torqueOut * Math.abs(st.r.w[st.r.w.length - 1]) * 2 * Math.PI / 60)} W.</p>`,
      assume: T('Spur gears of equal module; teeth drawn schematically (not involute); idlers change direction but not the overall ratio; efficiency is per mesh and an input you can change. The animation runs at a quarter of real speed.', 'تروس مبسطة.'),
      state: (S, st) => ({ teeth: S.teeth, compound: S.compound, w: st.r.w, ratio: st.r.ratio, torqueOut: st.r.torqueOut }),
      command(t, S) { if ((t.match(/\d+\s*[- ]?(?:teeth|tooth)/gi) || []).length >= 2) return null; const m = t.match(/(\d+)\s*rpm/i); if (m) { S.rpm = +m[1]; return { note: `${m[1]} rpm` }; } return null; }
    }));

  /* ======================= G · distillation (ideal binary, Antoine + Raoult) ======================= */
  const ANTOINE = { benzene: [6.90565, 1211.033, 220.79, T('benzene', 'البنزين')], toluene: [6.95464, 1344.8, 219.482, T('toluene', 'التولوين')], hexane: [6.87601, 1171.17, 224.408, T('n-hexane', 'الهكسان')], heptane: [6.89385, 1264.37, 216.636, T('n-heptane', 'الهبتان')] };
  P.psat = (sp, Tc) => Math.pow(10, ANTOINE[sp][0] - ANTOINE[sp][1] / (ANTOINE[sp][2] + Tc));
  P.bubble = (a, b, x, Pt) => N.bisect(Tc => x * P.psat(a, Tc) + (1 - x) * P.psat(b, Tc) - Pt, -60, 300, 100);
  P.stagesTotalReflux = (a, b, Pt, xD, xB) => { let x = xD, n = 0; const pts = []; while (x > xB && n < 60) { const Tc = P.bubble(a, b, x, Pt); // equilibrium: liquid x leaving a stage with vapour y = x(above)
      const yv = x; const xl = N.bisect(xx => xx * P.psat(a, P.bubble(a, b, xx, Pt)) / Pt - yv, 0, 1, 100); pts.push([x, xl, Tc]); x = xl; n++; } return { n, pts }; };
  reg('distil', KIND.chemE, T('Distillation of a binary mixture', 'تقطير خليط ثنائي'),
    t => { if (!/\b(distil+ation|distil+|fractionat\w*|reflux|vle|t-x-y|txy|mccabe)\b/i.test(t)) return null; const sp = Object.keys(ANTOINE).filter(k => new RegExp(k, 'i').test(t)); const pc = [...String(t).matchAll(/(\d+(?:\.\d+)?)\s*(?:%|mol\s*%|mole\s*per\s*cent)/gi)].map(m => +m[1] / 100); return { score: 0.95, params: { set: Object.assign(sp.length >= 2 ? { a: sp[0], b: sp[1] } : {}, pc[0] != null ? { xF: pc[0] } : {}, pc[1] != null ? { xD: pc[1] } : {}, pc[2] != null ? { xB: pc[2] } : {}, /ethanol|water/i.test(t) ? { nonideal: true } : {}) } }; },
    { a: { options: Object.keys(ANTOINE) }, b: { options: Object.keys(ANTOINE) }, xF: { min: 0.01, max: 0.99 }, xD: { min: 0.02, max: 0.999 }, xB: { min: 0.001, max: 0.98 }, P: { min: 100, max: 2000 } },
    () => ({
      static: true, autoplay: false, graph: true, equal: false, labels: { x: '', y: '' }, grid: false,
      defaults: { a: 'benzene', b: 'toluene', xF: 0.5, xD: 0.95, xB: 0.05, P: 760, nonideal: false },
      params: [{ key: 'xF', label: T('feed, light component', 'التغذية'), unit: 'mol frac', min: 0.05, max: 0.95, step: 0.01 }, { key: 'xD', label: T('distillate', 'المقطّر'), unit: 'mol frac', min: 0.5, max: 0.995, step: 0.005 }, { key: 'xB', label: T('bottoms', 'القاع'), unit: 'mol frac', min: 0.005, max: 0.5, step: 0.005 }, { key: 'P', label: T('pressure', 'الضغط'), unit: 'mmHg', min: 200, max: 1500, step: 10 }],
      view: () => ({ x0: 0, x1: 10, y0: 0, y1: 10 }),
      init(S, st) { st.Tb = P.bubble(S.a, S.b, S.xF, S.P); st.TA = P.bubble(S.a, S.b, 1, S.P); st.TB = P.bubble(S.a, S.b, 0, S.P); st.st = P.stagesTotalReflux(S.a, S.b, S.P, S.xD, S.xB); const al = P.psat(S.a, st.Tb) / P.psat(S.b, st.Tb); st.alpha = al; st.fenske = Math.log((S.xD / (1 - S.xD)) * ((1 - S.xB) / S.xB)) / Math.log(al); }, step() {},
      draw(g, p, S, st) { // the column: one tray per theoretical stage, coloured by liquid composition
        const c = L.colors(), n = st.st.n, top = 9.2, bot = 1, h = (top - bot) / Math.max(1, n);
        g.strokeStyle = c.ink; g.lineWidth = 2; g.strokeRect(p.X(3.4), p.Y(top + 0.3), p.X(6.6) - p.X(3.4), p.Y(bot - 0.3) - p.Y(top + 0.3));
        st.st.pts.forEach(([x, xl, Tc], i) => { const y = top - (i + 0.5) * h, mix = x; g.fillStyle = `rgba(${Math.round(37 + (220 - 37) * (1 - mix))},${Math.round(99 * mix + 38 * (1 - mix))},${Math.round(235 * mix + 38 * (1 - mix))},.55)`; g.fillRect(p.X(3.5), p.Y(y + h * 0.35), p.X(6.5) - p.X(3.5), Math.abs(p.Y(y - h * 0.35) - p.Y(y + h * 0.35))); if (n <= 18) label(g, p, 6.8, y - 0.1, `${T('stage', 'مرحلة')} ${i + 1}: x = ${f3(x)}, ${f3(Tc)} °C`, c.muted, { font: '11px ui-sans-serif' }); });
        label(g, p, 3.2, top + 0.6, `${T('distillate', 'المقطّر')} x = ${S.xD} (${ANTOINE[S.a][3]})`, c.pal[0]); label(g, p, 3.2, bot - 0.75, `${T('bottoms', 'القاع')} x = ${S.xB}`, c.pal[1]);
        label(g, p, 0.2, 5, `${T('feed', 'تغذية')} x = ${S.xF}`, c.ink); p.arrow(1.9, 5.1, 3.3, 5.1, c.ink, '');
      },
      graphDraw(g, p, S, st) { // T-x-y diagram
        const c = L.colors(); p.view = { x0: 0, x1: 1, y0: Math.floor(st.TA - 3), y1: Math.ceil(st.TB + 3) }; p.labels = { x: `x, y (${ANTOINE[S.a][3]})`, y: 'T (°C)' }; p.grid();
        const liq = [], vap = []; for (let i = 0; i <= 80; i++) { const x = i / 80, Tc = P.bubble(S.a, S.b, x, S.P); liq.push([x, Tc]); vap.push([x * P.psat(S.a, Tc) / S.P, Tc]); }
        p.path(liq, c.pal[0], { w: 2.2 }); p.path(vap, c.pal[1], { w: 2.2 }); p.dot(S.xF, st.Tb, c.ink, T('feed bubble point', 'نقطة الفقاعة'), { r: 4 });
        p.text(0.62, st.TA + (st.TB - st.TA) * 0.15, T('liquid (bubble line)', 'سائل'), c.pal[0]); p.text(0.05, st.TB - 2, T('vapour (dew line)', 'بخار'), c.pal[1]);
      },
      readout: (S, st) => [[T('theoretical stages (total reflux)', 'المراحل النظرية'), st.st.n], ['Fenske Nmin', f3(st.fenske)], ['α (feed)', f3(st.alpha)], [T('feed bubble point', 'نقطة فقاعة التغذية'), f3(st.Tb) + ' °C']],
      intro: (S, st) => (S.nonideal ? T('Ethanol–water is strongly non-ideal (it forms an azeotrope at about 89 mol % ethanol), so Raoult’s law would give wrong answers; I’ve opened the ideal benzene–toluene model instead to show the method. Ask for that system or another ideal pair.', 'الإيثانول والماء غير مثاليين.') : T(`${ANTOINE[S.a][3]}–${ANTOINE[S.b][3]} at ${S.P} mmHg: the feed (x = ${S.xF}) starts boiling at ${f3(st.Tb)} °C. Going from x_B = ${S.xB} to x_D = ${S.xD} needs ${st.st.n} theoretical stages at total reflux (Fenske: ${f3(st.fenske)}).`, 'التقطير.')),
      explain: (S, st) => `<p>${T('Vapour pressures from the Antoine equation', 'ضغوط البخار من معادلة أنطوان')} (log₁₀P = A − B/(C + T), P in mmHg, T in °C); ${T('ideal liquid (Raoult)', 'سائل مثالي (راؤول)')}: P = xP°ₐ + (1 − x)P°ᵦ, y = xP°ₐ/P.</p><p>${T('Pure boiling points at this pressure', 'نقاط الغليان')}: ${ANTOINE[S.a][3]} ${f3(st.TA)} °C, ${ANTOINE[S.b][3]} ${f3(st.TB)} °C.</p><p>${T('At total reflux each stage’s vapour equals the liquid above it, so stepping between the curves from x_D down to x_B counts the minimum stages', 'عند الإرجاع الكلي')}: <b>${st.st.n}</b>. ${T('Fenske’s equation with α at the feed gives', 'معادلة فنسكي تعطي')} ${f3(st.fenske)} — ${T('close, since α varies a little with temperature.', 'قريبة.')}</p>`,
      assume: T('Ideal liquid and vapour (Raoult’s and Dalton’s laws), constant pressure, equilibrium stages, total reflux (the minimum number of stages). Antoine constants are standard literature values for 1–760 mmHg. Real columns need more stages and a reflux ratio above the minimum.', 'خليط مثالي.'),
      state: (S, st) => ({ a: S.a, b: S.b, stages: st.st.n, fenske: st.fenske, alpha: st.alpha, Tb: st.Tb, TA: st.TA, TB: st.TB, nonideal: S.nonideal })
    }));

  /* ======================= H · frequency modulation ======================= */
  P.besselJ = (n, x) => { n = Math.abs(n); let s = 0, term = Math.pow(x / 2, n) / [...Array(n).keys()].reduce((a, k) => a * (k + 1), 1); for (let k = 0; k < 60; k++) { s += term; term *= -(x * x / 4) / ((k + 1) * (k + 1 + n)); } return s; };
  const hz = (t, re) => { const m = String(t).match(re); if (!m) return null; return +m[1] * ({ k: 1e3, K: 1e3, M: 1e6, G: 1e9 }[m[2]] || 1); };
  reg('fm', KIND.comm, T('Frequency modulation', 'التعديل الترددي'),
    t => { if (!/\b(fm|frequency modulat\w*|modulation index|carson)\b/i.test(t)) return null; const set = {}; const fc = hz(t, /carrier[^\d]{0,20}(\d+(?:\.\d+)?)\s*([kMG]?)Hz/i), fm = hz(t, /(?:message|modulating|audio|tone|signal)[^\d]{0,20}(\d+(?:\.\d+)?)\s*([kMG]?)Hz/i), df = hz(t, /deviation[^\d]{0,20}(\d+(?:\.\d+)?)\s*([kMG]?)Hz/i), b = num(t, /(?:modulation index|β|beta)\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)/i, null); if (fc) set.fc = fc; if (fm) set.fm = fm; if (df) set.df = df; else if (b != null) set.df = b * (fm || 5e3); return { score: 0.96, params: { set } }; },
    { fc: { min: 1, max: 1e10 }, fm: { min: 1, max: 1e8 }, df: { min: 0, max: 1e9 } },
    () => ({
      graph: true, autoplay: true, equal: false, grid: true, labels: { x: T('time (message periods)', 'الزمن'), y: '' }, h: 1 / 60,
      defaults: { fc: 100e6, fm: 15e3, df: 75e3 },
      params: [{ key: 'fm', label: T('message frequency fₘ', 'تردد الرسالة'), unit: 'Hz', min: 50, max: 50e3, step: 50 }, { key: 'df', label: T('peak deviation Δf', 'الانحراف'), unit: 'Hz', min: 0, max: 200e3, step: 500 }],
      view: () => ({ x0: 0, x1: 2, y0: -2.6, y1: 2.6 }),
      init(S, st) { st.beta = S.df / S.fm; st.bw = 2 * (S.df + S.fm); st.lines = []; for (let n = -40; n <= 40; n++) { const a = P.besselJ(n, st.beta) * (n < 0 && n % 2 ? -1 : 1); if (Math.abs(a) > 1e-4) st.lines.push([n, a]); } st.power = st.lines.reduce((s, l) => s + l[1] * l[1], 0); st.sig = st.lines.filter(l => Math.abs(l[1]) >= 0.01).length; st.off = 0; },
      step(S, st, h) { st.off += h * 0.25; },
      draw(g, p, S, st) { const c = L.colors(), k = 12; // the carrier is drawn at 12 cycles per message period so it can be seen
        p.fn(x => 1.6 + 0.6 * Math.sin(2 * Math.PI * (x + st.off)), c.pal[1], { w: 2 }); p.text(0.02, 2.35, T('message m(t)', 'الرسالة'), c.pal[1]);
        p.fn(x => Math.cos(2 * Math.PI * k * (x + st.off) + Math.min(st.beta, 8) * Math.sin(2 * Math.PI * (x + st.off))) * 0.9 - 0.7, c.pal[0], { w: 1.4 }); p.text(0.02, 0.45, T('FM signal (carrier drawn slower for visibility; β capped at 8 in the picture)', 'الإشارة'), c.pal[0]); },
      graphDraw(g, p, S, st) { const c = L.colors(), nmax = Math.max(...st.lines.map(l => Math.abs(l[0]))); p.view = { x0: -nmax - 1, x1: nmax + 1, y0: 0, y1: 1.05 }; p.labels = { x: T('(f − f_c)/fₘ', '(f − f_c)/fₘ'), y: '|Jₙ(β)|' }; p.grid(); st.lines.forEach(([n, a]) => p.path([[n, 0], [n, Math.abs(a)]], Math.abs(a) >= 0.01 ? c.pal[0] : c.muted, { w: 3 })); const cb = st.bw / 2 / S.fm; p.path([[-cb, 0], [-cb, 1]], c.pal[3], { w: 1.5, dash: [5, 4] }); p.path([[cb, 0], [cb, 1]], c.pal[3], { w: 1.5, dash: [5, 4] }); p.text(cb, 0.95, ' Carson', c.pal[3]); },
      readout: (S, st) => [['β = Δf/fₘ', f3(st.beta)], [T('Carson bandwidth', 'عرض نطاق كارسون'), fHz(st.bw)], [T('lines ≥ 1 %', 'خطوط ≥ ١٪'), st.sig], ['ΣJₙ²', f3(st.power)]],
      intro: (S, st) => T(`Carrier ${fHz(S.fc)}, message ${fHz(S.fm)}, deviation ${fHz(S.df)} → β = ${f3(st.beta)}. Carson’s rule bandwidth ≈ 2(Δf + fₘ) = ${fHz(st.bw)}; the spectrum lines sit at f_c ± n·fₘ with heights |Jₙ(β)|.`, 'التعديل الترددي.'),
      explain: (S, st) => `<p>s(t) = A cos(2πf_c t + β sin 2πfₘt), β = Δf/fₘ = ${f3(st.beta)}.</p><p>${T('Expanding with Bessel functions', 'بالتوسيع بدوال بيسل')}: s(t) = A Σ Jₙ(β) cos 2π(f_c + nfₘ)t. ${T('Carrier amplitude', 'سعة الحامل')} J₀ = ${f3(P.besselJ(0, st.beta))}${Math.abs(P.besselJ(0, st.beta)) < 0.05 ? T(' (almost zero — near a Bessel zero, e.g. β ≈ 2.405)', ' (قريب من الصفر)') : ''}.</p><p>${T('Power check', 'تحقق القدرة')}: ΣJₙ² = ${f3(st.power)} (${T('should be 1: FM does not change total power', 'يجب أن يساوي ١')}). ${T('Carson bandwidth', 'كارسون')} = ${f3(st.bw)} Hz ${T('contains about 98 % of the power.', 'يحتوي ~٩٨٪ من القدرة.')}</p>`,
      assume: T('Single-tone sinusoidal message; ideal modulator; Bessel functions computed by their power series. The time-domain picture uses a slowed carrier so individual cycles are visible; the spectrum and numbers use your real frequencies.', 'رسالة نغمة واحدة.'),
      state: (S, st) => ({ beta: st.beta, bw: st.bw, power: st.power, J0: P.besselJ(0, st.beta), lines: st.sig })
    }));

  /* ======================= I · cardiac cycle (time-varying elastance + Windkessel) ======================= */
  const elast = (tc, Tc) => { const t1 = 0.215 * Tc, tn = tc / t1, a = Math.pow(tn / 0.7, 1.9), b = Math.pow(tn / 1.17, 21.9); return 1.55 * (a / (1 + a)) * (1 / (1 + b)); };
  reg('heart', KIND.med, T('Cardiac cycle (left heart)', 'الدورة القلبية'),
    t => (/\b(cardiac cycle|wiggers|pressure[- ]volume loop|pv loop|stroke volume|ejection fraction|cardiac output|left ventricle|systole|diastole)\b/i.test(t) && !/\b(diagram|label|draw the heart)\b/i.test(t) ? { score: 0.95, params: { set: /(\d+)\s*(?:bpm|beats)/i.test(t) ? { HR: num(t, /(\d+)\s*(?:bpm|beats)/i, 75) } : {} } } : null),
    { HR: { min: 30, max: 200 }, Emax: { min: 0.5, max: 5 }, R: { min: 0.3, max: 3 }, C: { min: 0.3, max: 3 }, Pla: { min: 2, max: 30 } },
    () => ({
      graph: true, autoplay: true, equal: false, grid: false, labels: { x: '', y: '' }, h: 1 / 2000, every: 10,
      defaults: { HR: 75, Emax: 2.6, Emin: 0.07, V0: 10, R: 1.25, C: 1.2, Pla: 9, Rmv: 0.01, Rav: 0.01, view: 'pv' }, // tuned so a resting adult gives EDV ≈ 130 mL, SV ≈ 68 mL, EF ≈ 53 %, CO ≈ 5 L/min, ≈ 130/83 mmHg
      params: [{ key: 'HR', label: T('heart rate', 'معدل القلب'), unit: 'bpm', min: 40, max: 180, step: 1 }, { key: 'Emax', label: T('contractility Eₘₐₓ', 'الانقباضية'), unit: 'mmHg/mL', min: 0.8, max: 5, step: 0.1 }, { key: 'R', label: T('systemic resistance', 'المقاومة'), unit: 'mmHg·s/mL', min: 0.4, max: 2.5, step: 0.05 }, { key: 'Pla', label: T('filling pressure (left atrium)', 'ضغط الملء'), unit: 'mmHg', min: 3, max: 25, step: 0.5 }],
      selects: [{ key: 'view', label: T('Graph', 'الرسم'), num: false, options: [['pv', T('Pressure–volume loop', 'حلقة الضغط والحجم')], ['wiggers', T('Pressures over time (Wiggers)', 'الضغوط عبر الزمن')]] }],
      view: () => ({ x0: 0, x1: 10, y0: 0, y1: 8 }),
      init(S, st) { st.V = 120; st.Pao = 80; st.beat = []; st.last = null; st.tc = 0; st.hist2 = []; st.cyc = 0; st.vmax = 0; st.vmin = 1e9; st.pmax = 0; st.pmin = 1e9; },
      step(S, st, h) {
        const Tc = 60 / S.HR; st.tc += h; if (st.tc >= Tc) { st.tc -= Tc; st.cyc++; if (st.cyc >= 2) st.last = { EDV: st.vmax, ESV: st.vmin, SV: st.vmax - st.vmin, EF: (st.vmax - st.vmin) / st.vmax, CO: (st.vmax - st.vmin) * S.HR / 1000, Ps: st.pmax, Pd: st.pmin }; st.vmax = 0; st.vmin = 1e9; st.pmax = 0; st.pmin = 1e9; st.loop = st.cur || []; st.cur = []; }
        const f = (tt, y) => { const E = (S.Emax - S.Emin) * elast((st.tc + tt) % Tc, Tc) + S.Emin, Plv = E * (y[0] - S.V0), Qm = Math.max(0, (S.Pla - Plv) / S.Rmv), Qa = Math.max(0, (Plv - y[1]) / S.Rav); return [Qm - Qa, (Qa - y[1] / S.R) / S.C]; };
        const n = N.rk4(f, 0, [st.V, st.Pao], h); st.V = n[0]; st.Pao = n[1];
        const E = (S.Emax - S.Emin) * elast(st.tc, Tc) + S.Emin; st.Plv = E * (st.V - S.V0); st.mv = S.Pla > st.Plv; st.av = st.Plv > st.Pao;
        st.vmax = Math.max(st.vmax, st.V); st.vmin = Math.min(st.vmin, st.V); st.pmax = Math.max(st.pmax, st.Pao); st.pmin = Math.min(st.pmin, st.Pao);
        if (st.frame % 10 === 0) { (st.cur = st.cur || []).push([st.V, st.Plv]); st.hist2.push([st.t, st.Plv, st.Pao, S.Pla]); if (st.hist2.length > 1500) st.hist2.shift(); }
      },
      draw(g, p, S, st) { const c = L.colors(), r = 1.2 + (st.V || 100) / 60; // the ventricle grows and shrinks with its volume
        g.fillStyle = c.dark ? 'rgba(248,113,113,.35)' : 'rgba(220,38,38,.22)'; g.strokeStyle = '#dc2626'; g.lineWidth = 2; g.beginPath(); g.ellipse(p.X(5), p.Y(3.5), Math.abs(p.X(r) - p.X(0)), Math.abs(p.Y(0) - p.Y(r * 1.25)), 0, 0, 7); g.fill(); g.stroke();
        label(g, p, 4.2, 3.4, T('left ventricle', 'البطين الأيسر'), c.ink); label(g, p, 4.3, 2.8, `${f3(st.V || 0)} mL · ${f3(st.Plv || 0)} mmHg`, c.muted);
        label(g, p, 1.0, 7.2, `${T('mitral valve', 'الصمام التاجي')}: ${st.mv ? T('open', 'مفتوح') : T('closed', 'مغلق')}`, st.mv ? c.pal[2] : c.muted); label(g, p, 6.0, 7.2, `${T('aortic valve', 'الصمام الأبهري')}: ${st.av ? T('open', 'مفتوح') : T('closed', 'مغلق')}`, st.av ? c.pal[2] : c.muted);
        label(g, p, 6.4, 6.4, `${T('aorta', 'الأبهر')} ${f3(st.Pao || 0)} mmHg`, c.pal[1]); label(g, p, 0.6, 6.4, `${T('left atrium', 'الأذين الأيسر')} ${S.Pla} mmHg`, c.pal[0]); },
      graphDraw(g, p, S, st) { const c = L.colors();
        if (S.view === 'pv') { p.view = { x0: 0, x1: 180, y0: 0, y1: 160 }; p.labels = { x: 'V (mL)', y: 'P (mmHg)' }; p.grid(); if (st.loop && st.loop.length) p.path(st.loop, c.pal[1], { w: 2.4 }); if (st.cur && st.cur.length) p.path(st.cur, c.muted, { w: 1.2 }); const Vx = [S.V0, 160]; p.path(Vx.map(v => [v, S.Emax * (v - S.V0)]), c.pal[4], { w: 1.2, dash: [5, 4] }); p.text(120, 150, 'ESPVR', c.pal[4]); return; }
        const H = st.hist2; if (!H.length) return; const t0 = H[0][0], t1 = H[H.length - 1][0]; p.view = { x0: t0, x1: Math.max(t1, t0 + 1), y0: 0, y1: 160 }; p.labels = { x: 't (s)', y: 'P (mmHg)' }; p.grid(); [[1, c.pal[1], 'LV'], [2, c.pal[0], T('aorta', 'الأبهر')], [3, c.pal[2], 'LA']].forEach(([i, col, nm], k) => { p.path(H.map(r => [r[0], r[i]]), col, { w: 2 }); p.text(t0 + (t1 - t0) * 0.02, 150 - k * 12, nm, col); }); },
      readout: (S, st) => (st.last ? [['EDV / ESV', `${f3(st.last.EDV)} / ${f3(st.last.ESV)} mL`], [T('stroke volume', 'حجم الضربة'), f3(st.last.SV) + ' mL'], ['EF', f3(st.last.EF * 100) + ' %'], [T('cardiac output', 'النتاج القلبي'), f3(st.last.CO) + ' L/min'], [T('aortic pressure', 'ضغط الأبهر'), `${f3(st.last.Ps)}/${f3(st.last.Pd)} mmHg`]] : [[T('settling', 'يستقر'), T('first beats…', 'النبضات الأولى…')]]),
      intro: () => T('A beating model of the left heart: ventricular elastance rises and falls each beat, the valves open only when pressure pushes them, and the aorta stores and releases blood. After a couple of beats you’ll see stroke volume, ejection fraction and cardiac output — change contractility, heart rate, resistance or filling to see how they respond.', 'نموذج القلب.'),
      explain: (S, st) => `<p>${T('Phases each beat: filling (mitral open) → isovolumetric contraction (both closed) → ejection (aortic open) → isovolumetric relaxation. On the P–V loop these are the four sides.', 'مراحل الدورة.')}</p>${st.last ? `<p>${T('This beat', 'هذه النبضة')}: SV = EDV − ESV = ${f3(st.last.EDV)} − ${f3(st.last.ESV)} = <b>${f3(st.last.SV)} mL</b>; EF = ${f3(st.last.EF * 100)} %; CO = SV × HR = <b>${f3(st.last.CO)} L/min</b>.</p>` : ''}<p>${T('Try: raise Eₘₐₓ (contractility) → larger SV, smaller ESV; raise resistance → higher pressure, smaller SV; raise filling pressure → larger EDV (Frank–Starling).', 'جرّب تغيير المعاملات.')}</p>`,
      assume: T('A teaching model, not a clinical tool: left ventricle as a time-varying elastance (double-Hill shape), ideal valves with small resistances, a two-element Windkessel aorta, constant left-atrial pressure. Parameters are typical textbook values; numbers are illustrative.', 'نموذج تعليمي وليس سريرياً.'),
      state: (S, st) => ({ last: st.last, V: st.V, Pao: st.Pao })
    }));

  /* ======================= J · break-even ======================= */
  const money = (t, re) => { const m = String(t).match(re); return m ? +m[1].replace(/,/g, '') * (/k\b/i.test(m[2] || '') ? 1e3 : /m(illion)?\b/i.test(m[2] || '') ? 1e6 : 1) : null; };
  reg('breakeven', KIND.biz, T('Break-even analysis', 'تحليل نقطة التعادل'),
    t => { if (!/\b(break[- ]?even|contribution margin|cvp|cost[- ]volume[- ]profit|margin of safety)\b/i.test(t)) return null; const set = {}; const F = money(t, /fixed costs?[^\d]{0,30}([\d,]+(?:\.\d+)?)\s*(k|m|million)?/i), p = money(t, /(?:selling )?price[^\d]{0,30}([\d,]+(?:\.\d+)?)\s*(k)?/i), v = money(t, /variable costs?[^\d]{0,30}([\d,]+(?:\.\d+)?)\s*(k)?/i), q = money(t, /(?:sells?|sales of|expects? to sell|target(?: sales)?(?: of)?)[^\d]{0,20}([\d,]+)\s*(k)?\s*units?/i); if (F) set.F = F; if (p) set.p = p; if (v) set.v = v; if (q) set.Q = q; return { score: 0.97, params: { set } }; },
    { F: { min: 0, max: 1e10 }, p: { min: 0.01, max: 1e7 }, v: { min: 0, max: 1e7 }, Q: { min: 0, max: 1e9 } },
    () => ({
      static: true, autoplay: false, graph: false, equal: false, labels: { x: T('units sold', 'الوحدات'), y: T('money', 'المال') },
      defaults: { F: 50000, p: 25, v: 15, Q: 8000 },
      params: [{ key: 'F', label: T('fixed costs', 'التكاليف الثابتة'), unit: '', min: 0, max: 500000, step: 500 }, { key: 'p', label: T('price per unit', 'السعر'), unit: '', min: 1, max: 200, step: 0.5 }, { key: 'v', label: T('variable cost per unit', 'التكلفة المتغيرة'), unit: '', min: 0, max: 199, step: 0.5 }, { key: 'Q', label: T('expected sales', 'المبيعات المتوقعة'), unit: T('units', 'وحدات'), min: 0, max: 100000, step: 100 }],
      view: S => { const be = S.p > S.v ? S.F / (S.p - S.v) : S.Q, X = Math.max(be * 2, S.Q * 1.3, 10); return { x0: -X * 0.04, x1: X, y0: -S.F * 0.1, y1: Math.max(S.p * X, S.F + S.v * X) * 1.05 }; },
      init(S, st) { st.cm = S.p - S.v; st.be = st.cm > 0 ? S.F / st.cm : Infinity; st.profit = st.cm * S.Q - S.F; st.mos = isFinite(st.be) && S.Q > 0 ? (S.Q - st.be) / S.Q : null; }, step() {},
      draw(g, p, S, st) { const c = L.colors(), X = p.view.x1;
        if (isFinite(st.be)) { const fill = (a, b, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(p.X(a), p.Y(S.p * a)); g.lineTo(p.X(b), p.Y(S.p * b)); g.lineTo(p.X(b), p.Y(S.F + S.v * b)); g.lineTo(p.X(a), p.Y(S.F + S.v * a)); g.closePath(); g.fill(); }; fill(0, st.be, 'rgba(220,38,38,.16)'); fill(st.be, X, 'rgba(22,163,74,.16)'); }
        p.path([[0, S.F], [X, S.F]], c.muted, { w: 1.5, dash: [6, 4] }); p.path([[0, S.F], [X, S.F + S.v * X]], c.pal[1], { w: 2.4 }); p.path([[0, 0], [X, S.p * X]], c.pal[0], { w: 2.4 });
        p.text(X * 0.62, S.p * X * 0.66, T('revenue', 'الإيراد'), c.pal[0]); p.text(X * 0.62, (S.F + S.v * X * 0.62) * 0.92, T('total cost', 'التكلفة الكلية'), c.pal[1]); p.text(X * 0.02, S.F * 1.06, T('fixed cost', 'التكلفة الثابتة'), c.muted);
        if (isFinite(st.be) && st.be < X) p.dot(st.be, S.p * st.be, c.ink, `${T('break-even', 'التعادل')} ${f3(st.be)} ${T('units', 'وحدة')}`, { r: 6, bold: true });
        if (S.Q > 0 && S.Q < X) { p.path([[S.Q, 0], [S.Q, S.p * S.Q]], c.pal[3], { w: 1.5, dash: [4, 4] }); p.text(S.Q, S.p * S.Q * 1.03, T('expected sales', 'المبيعات'), c.pal[3]); } },
      readout: (S, st) => [[T('contribution / unit', 'المساهمة للوحدة'), f3(st.cm)], [T('break-even', 'التعادل'), isFinite(st.be) ? `${f3(Math.ceil(st.be))} ${T('units', 'وحدة')} = ${f3(st.be * S.p)}` : '—'], [T('profit at expected sales', 'الربح'), f3(st.profit)], [T('margin of safety', 'هامش الأمان'), st.mos == null ? '—' : f3(st.mos * 100) + ' %']],
      intro: (S, st) => (st.cm <= 0 ? T('The price doesn’t cover the variable cost per unit, so every extra sale loses money and there is no break-even point.', 'لا توجد نقطة تعادل.') : T(`Each unit contributes ${f3(st.cm)} (price ${S.p} − variable cost ${S.v}). Break-even = ${S.F} ÷ ${f3(st.cm)} = ${f3(st.be)} units (sales of ${f3(st.be * S.p)}). At ${S.Q} units the ${st.profit >= 0 ? 'profit' : 'loss'} is ${f3(Math.abs(st.profit))}${st.mos != null ? `, margin of safety ${f3(st.mos * 100)} %` : ''}.`, 'تحليل التعادل.')),
      explain: (S, st) => `<ul><li>${T('Contribution margin', 'هامش المساهمة')} = p − v = ${f3(st.cm)}; ${T('ratio', 'النسبة')} = ${f3(st.cm / S.p * 100)} %</li><li>${T('Break-even units', 'وحدات التعادل')} = F ÷ (p − v) = ${f3(st.be)} → ${T('round up to', 'تقريب إلى')} ${isFinite(st.be) ? Math.ceil(st.be) : '—'}</li><li>${T('Profit', 'الربح')} = (p − v)Q − F = ${f3(st.cm)} × ${S.Q} − ${S.F} = <b>${f3(st.profit)}</b></li>${st.mos != null ? `<li>${T('Margin of safety', 'هامش الأمان')} = (Q − Q_BE)/Q = ${f3(st.mos * 100)} %</li>` : ''}</ul><p class="muted">${T('Red: loss region; green: profit region.', 'الأحمر: خسارة؛ الأخضر: ربح.')}</p>`,
      assume: T('Linear CVP model: constant price and variable cost per unit, fixed costs fixed over the range shown, everything produced is sold, one product. Currency is whatever your figures use.', 'نموذج خطي.'),
      state: (S, st) => ({ be: st.be, cm: st.cm, profit: st.profit, mos: st.mos }),
      command(t, S) { let m; if ((m = t.match(/price\s*(?:to|=)\s*([\d.]+)/i))) { S.p = +m[1]; return { note: T('Price changed.', 'تغيّر السعر.') }; } if ((m = t.match(/fixed costs?\s*(?:to|=)\s*([\d,.]+)/i))) { S.F = +m[1].replace(/,/g, ''); return { note: T('Fixed costs changed.', 'تغيّرت التكاليف.') }; } return null; }
    }));

  /* ======================= scene specs: validated data, never code ======================= */
  const SPEC_KEYS = new Set(['engine', 'params', 'title']);
  function validate(spec) {
    const errs = [];
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return { ok: false, errors: ['spec must be an object'] };
    Object.keys(spec).forEach(k => { if (!SPEC_KEYS.has(k)) errs.push(`unknown key "${k}"`); });
    const d = DECL[spec.engine]; if (!d) { errs.push(`unknown engine "${spec.engine}"`); return { ok: false, errors: errs }; }
    if (spec.title != null && (typeof spec.title !== 'string' || spec.title.length > 120)) errs.push('title must be a short string');
    const P0 = spec.params || {}; if (typeof P0 !== 'object' || Array.isArray(P0)) errs.push('params must be an object');
    const clean = {};
    Object.entries(P0).forEach(([k, v]) => {
      const r = d[k]; if (!r) { errs.push(`unknown parameter "${k}" for ${spec.engine}`); return; }
      if (typeof v === 'function') { errs.push(`"${k}" may not be code`); return; }
      if (r.options) { if (!r.options.includes(v)) errs.push(`"${k}" must be one of ${r.options.join(', ')}`); else clean[k] = v; return; }
      if (r.bool) { if (typeof v !== 'boolean') errs.push(`"${k}" must be true or false`); else clean[k] = v; return; }
      if (r.expr) { if (typeof v !== 'string' || v.length > 120 || !/^[\w\s+\-*/^().,|]+$/.test(v)) errs.push(`"${k}" must be a plain maths expression`); else clean[k] = v; return; }
      if (r.pair) { if (v !== null && !(Array.isArray(v) && v.length === 2 && v.every(Number.isFinite))) errs.push(`"${k}" must be [x, y]`); else clean[k] = v; return; }
      if (r.list) { if (!Array.isArray(v) || v.length > r.max) { errs.push(`"${k}" must be a list of at most ${r.max}`); return; } const bad = v.some(it => (typeof it === 'number' ? !(Number.isFinite(it) && (r.min == null || it >= r.min) && (r.maxv == null || it <= r.maxv)) : !(it && typeof it === 'object' && Object.values(it).every(x => typeof x === 'number' ? Number.isFinite(x) : typeof x === 'string' && x.length <= 12)))); if (bad) errs.push(`"${k}" has an invalid item`); else clean[k] = v; return; }
      if (v === null && r.nullable) { clean[k] = null; return; }
      if (typeof v !== 'number' || !Number.isFinite(v)) { errs.push(`"${k}" must be a number`); return; }
      if (v < r.min || v > r.max) { errs.push(`"${k}" = ${v} is outside ${r.min}…${r.max}`); return; }
      clean[k] = v;
    });
    return errs.length ? { ok: false, errors: errs } : { ok: true, engine: spec.engine, params: clean, title: spec.title };
  }
  L.sceneSpec = { validate, engines: () => Object.keys(DECL), declared: id => DECL[id] || null, async open(spec) { const v = validate(spec); if (!v.ok) return v; await L.open(v.engine, { set: v.params, title: v.title }); return v; } };
})();
