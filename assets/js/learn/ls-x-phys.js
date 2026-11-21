/* ERLY Learning Studio — Physics playground (v24): nine experiences built on the kit.
   Every model states what it simplifies; numbers on screen are computed from the model, never typed in. */
(function () {
  'use strict';
  const LS = window.LS, K = LS.kit, D = LS.exp.DEFS, T = LS.T, IL = LS.inline;
  const { fmt, clamp } = K;
  const deg = Math.PI / 180;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });

  /* ============ 1 · Projectile launcher ============ */
  const WORLDS = { earth: ['Earth', 9.81], moon: ['Moon', 1.62], mars: ['Mars', 3.71], jupiter: ['Jupiter', 24.79] };
  D.projectile = { wide: true,
    intro: 'Launch a ball and watch its path. Change the **angle**, the **launch speed**, the **world** (its gravity) and, if you like, switch on **air resistance**. Every launch leaves a faint trail so you can compare.',
    predict: { q: 'On flat ground with **no air resistance**, which launch angle sends the ball furthest?', options: ['30°', '45°', '60°', '75°'] },
    explore: 'Launch at 30°, 45° and 60° with the same speed. Then pair 30° with 60°: what do you notice about their ranges? Try the Moon, then turn on air resistance.',
    explain: 'Without air, the horizontal and vertical motions are independent: horizontal speed stays **v cos θ**, while gravity slows and reverses the vertical **v sin θ**. Flight time is **2v sin θ / g**, so the range is **R = v² sin 2θ / g**, which is largest when sin 2θ = 1, at **45°**. Complementary angles (30° and 60°) give the **same range**. Weaker gravity stretches every path; air resistance shortens it and moves the best angle **below** 45°.',
    apply: [q('x-pr1', 'A ball is launched at 20 m/s at 45° on Earth (g = 9.81 m/s², no air). Its range is closest to…', ['20 m', '41 m', '82 m', '400 m'], 1, 'R = v² sin 90° / g = 400 / 9.81 ≈ 40.8 m.'),
      q('x-pr2', 'At the top of its flight (no air), the ball’s velocity is…', ['zero', 'horizontal, equal to v cos θ', 'vertical', 'the launch speed'], 1, 'Only the vertical part is zero at the top; the horizontal part never changes without air.')],
    summary: ['Horizontal and vertical motion are independent (no air).', 'Range R = v² sin 2θ / g: largest at 45°, equal for complementary angles.', 'Gravity sets the time in the air; air resistance shortens the path and lowers the best angle.'],
    connect: [{ label: 'Newton’s laws lab', href: '#/exp/newton-lab' }, { label: 'Motion graphs lab', href: '#/exp/motion-graphs' }],
    build(host, c) {
      const P0 = { a: 45, v: 20, w: 'earth', drag: false };
      const S = K.stage(host, 800, 420), sa = K.spring(45), sv = K.spring(20), sc = K.spring(60, 6);
      let ball = null, trails = [], world = 'earth', drag = false, slow = false;
      const ctl = K.controls(host, [{ k: 'range', id: 'a', label: T('Angle', 'الزاوية'), min: 5, max: 85, step: 1, val: 45, unit: '°' }, { k: 'range', id: 'v', label: T('Launch speed', 'سرعة الإطلاق'), min: 5, max: 40, step: 0.5, val: 20, d: 1, unit: ' m/s' },
        { k: 'chips', id: 'w', label: T('World', 'العالم'), opts: Object.entries(WORLDS).map(([k, [n, g]]) => [k, `${n} <small>${g}</small>`]), val: 'earth' }, { k: 'row' }, { k: 'toggle', id: 'drag', label: T('Air resistance', 'مقاومة الهواء'), val: false }, { k: 'toggle', id: 'slow', label: T('Slow motion', 'حركة بطيئة'), val: false }, { k: 'btn', id: 'go', label: T('Launch ▸', 'أطلق ▸'), accent: true }, { k: 'btn', id: 'clr', label: T('Clear trails', 'امسح المسارات') }, { k: 'end' }], (id, v) => {
        if (id === 'a') sa.set(v); if (id === 'v') sv.set(v); if (id === 'w') world = v; if (id === 'drag') drag = v; if (id === 'slow') slow = v; if (id === 'go') launch(); if (id === 'clr') { trails = []; M.draw(); } fitScale(); M.kick(); c.onChange(); });
      const read = document.createElement('p'); read.className = 'kx-read'; read.setAttribute('aria-live', 'polite'); host.appendChild(read);
      const g = () => WORLDS[world][1], k = 0.012; // drag constant per metre (model units), stated as simplified
      function path(v, a, withDrag) { const pts = []; let x = 0, y = 0, vx = v * Math.cos(a * deg), vy = v * Math.sin(a * deg), t = 0; const G = g(), dt = 0.002; let top = 0;
        while (t < 120) { if (withDrag) { const sp = Math.hypot(vx, vy); vx -= k * sp * vx * dt; vy -= (G + k * sp * vy) * dt; } else vy -= G * dt; x += vx * dt; y += vy * dt; t += dt; top = Math.max(top, y); if (pts.length === 0 || t - pts[pts.length - 1][2] > 0.02) pts.push([x, y, t]); if (y < 0) { const f = y / (y - (y - vy * dt)); pts.push([x - vx * dt * f, 0, t]); break; } }
        return { pts, range: pts[pts.length - 1][0], top, time: pts[pts.length - 1][2] }; }
      function fitScale() { const ext = Math.max(sv.t * sv.t / g(), 8); sc.set(ext * 1.08); }
      function launch() { const p = path(ctl.val.v, ctl.val.a, drag); ball = { p, t0: performance.now(), a: ctl.val.a, v: ctl.val.v, world, drag }; if (K.reduced()) { finish(); return; } M.play(); }
      function finish() { trails.unshift({ p: ball.p, a: ball.a, v: ball.v, world: ball.world, drag: ball.drag }); trails = trails.slice(0, 5); const b = ball; ball = null; M.pause(); say(b); c.onChange(); }
      function say(b) { const R = b.p.range, f = b.v * b.v * Math.sin(2 * b.a * deg) / WORLDS[b.world][1]; read.innerHTML = IL(`**${b.a}°** at **${fmt(b.v, 1)} m/s** on ${WORLDS[b.world][0]}${b.drag ? ' with air' : ''}: range **${fmt(R, 1)} m**, peak **${fmt(b.p.top, 1)} m**, flight **${fmt(b.p.time, 2)} s**.${b.drag ? '' : ` Formula v² sin 2θ / g = ${fmt(f, 1)} m.`}`); }
      const M = K.motor(c, host, (dt) => {
        const G = S.g, Pl = K.pal(); S.clear(Pl.bg2); const ext = sc.v, ground = 370, x0 = 60, W = 700, H = 320;
        const A = K.axes(G, [x0, ground - H, W, H], [0, ext], [0, ext * H / W], { xl: 'x (m)', yl: 'y (m)', ticks: 8 });
        G.fillStyle = Pl.line; G.fillRect(0, ground, 800, 60);
        trails.forEach((t, i) => { G.globalAlpha = 0.18 + 0.5 * (1 - i / 5); G.setLineDash([5, 5]); G.strokeStyle = i ? Pl.grey : Pl.violet; G.lineWidth = 2; G.beginPath(); t.p.pts.forEach(([x, y], j) => j ? G.lineTo(A.X(x), A.Y(y)) : G.moveTo(A.X(x), A.Y(y))); G.stroke(); G.setLineDash([]); G.globalAlpha = 1; const e = t.p.pts[t.p.pts.length - 1]; K.tag(G, `${t.a}° · ${fmt(e[0], 1)} m`, A.X(e[0]), ground + 16, i ? Pl.muted : Pl.violet); });
        const pre = path(sv.v, sa.v, drag); G.strokeStyle = Pl.blue; G.globalAlpha = 0.45; G.lineWidth = 2; G.setLineDash([2, 6]); G.beginPath(); pre.pts.forEach(([x, y], j) => j ? G.lineTo(A.X(x), A.Y(y)) : G.moveTo(A.X(x), A.Y(y))); G.stroke(); G.setLineDash([]); G.globalAlpha = 1;
        G.save(); G.translate(x0, ground); G.rotate(-sa.v * deg); G.fillStyle = Pl.ink; K.rr(G, -6, -9, 54, 18, 6); G.fill(); G.restore(); G.fillStyle = Pl.muted; G.beginPath(); G.arc(x0, ground, 16, Math.PI, 2 * Math.PI); G.fill();
        G.strokeStyle = Pl.gold; G.lineWidth = 1.5; G.beginPath(); G.arc(x0, ground, 70, -sa.v * deg, 0); G.stroke(); K.text(G, `${Math.round(sa.v)}°`, x0 + 76, ground - 8, { c: Pl.gold, w: 700 });
        if (ball) { const el = (performance.now() - ball.t0) / 1000 * (slow ? 0.35 : 1) * Math.max(1, ball.p.time / 2.4); const pts = ball.p.pts; let i = pts.findIndex(p => p[2] >= el); if (i < 0) i = pts.length - 1;
          G.strokeStyle = Pl.violet; G.lineWidth = 3; G.beginPath(); for (let j = 0; j <= i; j++) j ? G.lineTo(A.X(pts[j][0]), A.Y(pts[j][1])) : G.moveTo(A.X(pts[j][0]), A.Y(pts[j][1])); G.stroke();
          const [bx, by] = pts[i]; G.fillStyle = Pl.red; G.beginPath(); G.arc(A.X(bx), A.Y(by), 8, 0, 7); G.fill();
          if (i > 0) { const [px, py, pt] = pts[i - 1], vx = (bx - px) / (pts[i][2] - pt || 1e-3), vy = (by - py) / (pts[i][2] - pt || 1e-3); K.arrow(G, A.X(bx), A.Y(by), A.X(bx) + vx * 3, A.Y(by), Pl.blue, 2.5, 9, 'vₓ'); K.arrow(G, A.X(bx), A.Y(by), A.X(bx), A.Y(by) - vy * 3, Pl.green, 2.5, 9, 'v_y'); }
          if (i === pts.length - 1) finish(); }
        K.text(G, `${WORLDS[world][0]} · g = ${g()} m/s²${drag ? ' · air on' : ''}`, 790, 24, { a: 'right', c: Pl.muted, w: 600 });
      }).add(sa, sv, sc);
      fitScale(); sc.v = sc.t; M.draw();
      return { play: launch, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); },
        reset() { ctl.reset(); sa.set(45, true); sv.set(20, true); world = 'earth'; drag = false; slow = false; trails = []; ball = null; read.textContent = ''; fitScale(); sc.v = sc.t; M.pause(); },
        observe() { if (!trails.length) return { text: 'Launch the ball at least twice to compare.', predOk: null }; const flat = trails.filter(t => !t.drag && t.world === trails[0].world && t.v === trails[0].v); const best = flat.slice().sort((a, b) => b.p.range - a.p.range)[0];
          return { text: `Your launches: ${trails.map(t => `**${t.a}°** → ${fmt(t.p.range, 1)} m${t.drag ? ' (air)' : ''}${t.world !== 'earth' ? ' on ' + WORLDS[t.world][0] : ''}`).join(', ')}.${best && flat.length > 1 ? ` At the same speed without air, the furthest was **${best.a}°**.` : ''}`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 2 · Inclined plane ============ */
  D.incline = { wide: true,
    intro: 'A block rests on a ramp. Tilt the ramp, change how rough the surfaces are (the coefficient of friction **μ**) and the **mass**. The weight is split into two parts: one pulls the block **down the slope**, the other presses it **into the slope**.',
    predict: { q: 'A heavier block of the same material on the same ramp starts to slide…', options: ['at a smaller angle', 'at the same angle', 'at a larger angle', 'never'] },
    explore: 'Raise the angle slowly until the block slides. Note the angle, then double the mass and try again. Then make the surface smoother.',
    explain: 'Along the slope the pull is **mg sin θ**; friction can push back up to **μₛ N = μₛ mg cos θ**. The block slips when mg sin θ > μₛ mg cos θ, that is when **tan θ > μₛ** — the **mass cancels**, so heavy and light blocks of the same material start sliding at the same angle. Once moving, kinetic friction (μₖ, smaller) acts and the acceleration is **a = g(sin θ − μₖ cos θ)**.',
    apply: [q('x-in1', 'μₛ = 0.50. Roughly at what angle does the block start to slide?', ['about 14°', 'about 27°', 'about 45°', 'about 60°'], 1, 'tan θ = 0.5 → θ ≈ 26.6°.'), q('x-in2', 'On a frictionless 30° ramp, the acceleration down the slope is…', ['9.8 m/s²', '4.9 m/s²', '8.5 m/s²', '0'], 1, 'a = g sin 30° = 4.9 m/s².')],
    summary: ['Weight splits into mg sin θ (along) and mg cos θ (into the slope).', 'Static friction holds the block until tan θ > μₛ — mass cancels.', 'Sliding: a = g(sin θ − μₖ cos θ).'],
    build(host, c) {
      const S = K.stage(host, 800, 400), st = K.spring(20), sm = K.spring(2); let mu = 0.5, x = 0, v = 0, sliding = false, slipAt = [];
      const ctl = K.controls(host, [{ k: 'range', id: 'th', label: T('Ramp angle θ', 'زاوية المنحدر'), min: 0, max: 60, step: 0.5, val: 20, d: 1, unit: '°' }, { k: 'range', id: 'mu', label: T('Static friction μₛ', 'معامل الاحتكاك'), min: 0, max: 1.2, step: 0.01, val: 0.5, d: 2 }, { k: 'range', id: 'm', label: T('Mass', 'الكتلة'), min: 0.5, max: 10, step: 0.5, val: 2, d: 1, unit: ' kg' }, { k: 'row' }, { k: 'btn', id: 'rel', label: T('Back to the top', 'أعد إلى الأعلى') }, { k: 'end' }], (id, val) => { if (id === 'th') st.set(val); if (id === 'm') sm.set(val); if (id === 'mu') mu = val; if (id === 'rel') { x = 0; v = 0; sliding = false; } M.kick(); M.play(); c.onChange(); });
      const read = document.createElement('p'); read.className = 'kx-read'; read.setAttribute('aria-live', 'polite'); host.appendChild(read);
      const g = 9.81, L = 8; // ramp length 8 m
      const M = K.motor(c, host, dt => {
        const th = st.v * deg, m = sm.v, muk = 0.8 * mu, Pl = K.pal(), G = S.g; S.clear(Pl.bg2);
        const holds = Math.tan(th) <= mu + 1e-9;
        if (!holds && x < L) { if (!sliding) slipAt.push([Math.round(st.v * 2) / 2, ctl.val.m, mu]); sliding = true; const a = g * (Math.sin(th) - muk * Math.cos(th)); v += a * dt; x = Math.min(L, x + v * dt); }
        if (holds && sliding && v > 0) { const a = g * (Math.sin(th) - muk * Math.cos(th)); v = Math.max(0, v + a * dt); x = Math.min(L, x + v * dt); if (v === 0) sliding = false; }
        const ox = 120, oy = 350, sc = 70, ex = ox + Math.cos(th) * L * sc, ey = oy - Math.sin(th) * L * sc;
        G.fillStyle = Pl.line; G.beginPath(); G.moveTo(ox, oy); G.lineTo(ex, oy); G.lineTo(ex, ey); G.closePath(); G.fill(); G.strokeStyle = Pl.muted; G.lineWidth = 2; G.beginPath(); G.moveTo(ox - 40, oy); G.lineTo(780, oy); G.stroke();
        G.strokeStyle = Pl.gold; G.beginPath(); G.arc(ox, oy, 46, -th, 0); G.stroke(); K.text(G, `θ = ${fmt(st.v, 1)}°`, ox + 52, oy - 10, { c: Pl.gold, w: 700 });
        // block position: s along slope measured from top
        const s = L - 1 - x * (L - 1.2) / L, bx = ox + Math.cos(th) * s * sc, by = oy - Math.sin(th) * s * sc, bs = 34 + m * 3;
        G.save(); G.translate(bx, by); G.rotate(-th); G.fillStyle = sliding ? Pl.red : Pl.blue; K.rr(G, -bs / 2, -bs, bs, bs, 4); G.fill(); K.text(G, `${fmt(m, 1)} kg`, 0, -bs / 2 + 4, { a: 'center', c: '#fff', w: 700, s: 12 }); G.restore();
        const cx = bx - Math.sin(th) * bs / 2, cy = by - Math.cos(th) * bs / 2, W = m * g, f = 130 / (Math.max(W, 20) * 0.55);
        const along = W * Math.sin(th), into = W * Math.cos(th), fr = holds && !sliding ? along : muk * into * (sliding ? 1 : 0);
        K.arrow(G, cx, cy, cx, cy + W * f * 0.55, Pl.ink, 3, 10, `mg = ${fmt(W, 1)} N`);
        K.arrow(G, cx, cy, cx - Math.cos(th) * along * f * 0.55, cy + Math.sin(th) * along * f * 0.55, Pl.violet, 2.5, 9, `mg sin θ`);
        K.arrow(G, cx, cy, cx + Math.sin(th) * into * f * 0.55, cy + Math.cos(th) * into * f * 0.55, Pl.grey, 2.5, 9, `mg cos θ`);
        K.arrow(G, cx, cy, cx - Math.sin(th) * into * f * 0.55, cy - Math.cos(th) * into * f * 0.55, Pl.green, 3, 10, `N = ${fmt(into, 1)} N`);
        if (fr > 0.01) K.arrow(G, cx, cy, cx + Math.cos(th) * fr * f * 0.55, cy - Math.sin(th) * fr * f * 0.55, Pl.red, 3, 10, `f = ${fmt(fr, 1)} N`);
        const a = sliding ? g * (Math.sin(th) - muk * Math.cos(th)) : 0;
        read.innerHTML = IL(holds && !sliding ? `**Holding.** tan θ = ${fmt(Math.tan(th), 2)} ≤ μₛ = ${fmt(mu, 2)}. Friction ${fmt(along, 1)} N balances the pull down the slope; the most it could give is μₛN = ${fmt(mu * into, 1)} N.` : `**Sliding.** tan θ = ${fmt(Math.tan(th), 2)} > μₛ = ${fmt(mu, 2)}. Kinetic friction μₖN = ${fmt(muk * into, 1)} N (μₖ = ${fmt(muk, 2)}); acceleration ${fmt(Math.max(0, a), 2)} m/s², speed ${fmt(v, 2)} m/s.`);
        if (x >= L) { v = 0; }
      }).add(st, sm);
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); },
        reset() { ctl.reset(); st.set(20, true); sm.set(2, true); mu = 0.5; x = 0; v = 0; sliding = false; slipAt = []; M.play(); },
        observe() { const th = ctl.val.th; return { text: slipAt.length ? `The block started to slide at: ${slipAt.map(([a, m, u]) => `**${a}°** (${m} kg, μₛ ${fmt(u, 2)})`).join('; ')}. Theory: tan⁻¹(μₛ) = **${fmt(Math.atan(mu) / deg, 1)}°** for μₛ = ${fmt(mu, 2)}, for any mass.` : `Now at ${th}° with μₛ = ${fmt(mu, 2)}: the block ${Math.tan(th * deg) > mu ? 'slides' : 'holds'}. Raise the angle until it slides.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 3 · Gravity explorer ============ */
  const PLANETS = [['Mercury', 3.70], ['Venus', 8.87], ['Earth', 9.81], ['Moon', 1.62], ['Mars', 3.71], ['Jupiter', 24.79], ['Saturn', 10.44], ['Uranus', 8.69], ['Neptune', 11.15]];
  D['gravity-explorer'] = { wide: true,
    intro: 'Every mass attracts every other mass. Drag the two bodies closer or further apart and change their masses: the arrows show the pull on **each** body, and the graph shows how the force falls with distance. The starting values are the Earth and the Moon.',
    predict: { q: 'If you **double the distance** between two bodies, the gravitational force becomes…', options: ['half as big', 'a quarter as big', 'twice as big', 'unchanged'] },
    explore: 'Note the force, then drag the Moon to twice the distance. Then double one mass. Below, compare what you would weigh on other worlds.',
    explain: 'Newton’s law of gravitation: **F = G m₁ m₂ / r²**, with G = 6.674 × 10⁻¹¹ N m² kg⁻². The force is **proportional to each mass** and falls with the **square** of the distance: double r and F becomes **¼**. The two bodies pull on each other with **equal and opposite** forces (Newton’s third law), even though one is far more massive. Your **weight** is the pull of a world on you, W = mg, where g depends on that world’s mass and radius.',
    apply: [q('x-gr1', 'Two bodies attract with 100 N. One mass is tripled. The force becomes…', ['33 N', '300 N', '900 N', '100 N'], 1, 'F is proportional to each mass: ×3.'), q('x-gr2', 'The Earth pulls the Moon with force F. The Moon pulls the Earth with…', ['a much smaller force', 'the same size force F', 'no force', 'a bigger force'], 1, 'Newton’s third law: equal and opposite.')],
    summary: ['F = G m₁ m₂ / r²: proportional to each mass, inverse square of distance.', 'Forces on the two bodies are equal and opposite.', 'Weight W = mg depends on the world you stand on.'],
    build(host, c) {
      const G6 = 6.674e-11; let m1 = 5.97, m2 = 0.0735; const sr = K.spring(384), sm1 = K.spring(5.97), sm2 = K.spring(0.0735); let mass = 60;
      const S = K.stage(host, 800, 360);
      const ctl = K.controls(host, [{ k: 'range', id: 'm1', label: T('Mass A (× 10²⁴ kg)', 'الكتلة أ'), min: 0.5, max: 20, step: 0.01, val: 5.97, d: 2 }, { k: 'range', id: 'm2', label: T('Mass B (× 10²⁴ kg)', 'الكتلة ب'), min: 0.01, max: 2, step: 0.0005, val: 0.0735, d: 4 }, { k: 'range', id: 'r', label: T('Distance (thousand km)', 'المسافة (ألف كم)'), min: 100, max: 800, step: 1, val: 384 }], (id, v) => { if (id === 'm1') sm1.set(m1 = v); if (id === 'm2') sm2.set(m2 = v); if (id === 'r') sr.set(v); M.kick(); c.onChange(); });
      const pl = document.createElement('div'); pl.className = 'kx-planets'; host.appendChild(pl);
      const drawPlanets = () => { pl.innerHTML = `<label class="kx-inline">${T('Your mass', 'كتلتك')} <input type="number" min="1" max="300" value="${mass}" data-pm> kg</label><ul>${PLANETS.map(([n, g]) => `<li><b>${n}</b><span style="--w:${g / 24.79 * 100}%"></span><em>${fmt(mass * g, 0)} N</em></li>`).join('')}</ul><p class="at-muted at-small">${T('Weight W = m × g, using each world’s surface gravity (NASA fact-sheet values, rounded).', 'الوزن = الكتلة × الجاذبية السطحية.')}</p>`; };
      drawPlanets(); pl.addEventListener('input', e => { if (e.target.matches('[data-pm]')) { mass = clamp(+e.target.value || 60, 1, 300); pl.querySelectorAll('em').forEach((el, i) => { el.textContent = fmt(mass * PLANETS[i][1], 0) + ' N'; }); } });
      const F = (r, a, b) => G6 * a * 1e24 * b * 1e24 / Math.pow(r * 1e6, 2);
      let ax = 140;
      const posB = () => ax + sr.v * 0.75;
      K.drag(S, () => [{ id: 'b', x: posB(), y: 130, r: 26 }], (id, x) => { const r = clamp((x - ax) / 0.75, 100, 800); ctl.set('r', Math.round(r)); sr.set(Math.round(r), true); M.kick(); c.onChange(); });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); const f = F(sr.v, sm1.v, sm2.v), f0 = F(384, 5.97, 0.0735);
        const ra = 14 + Math.cbrt(sm1.v) * 9, rb = 6 + Math.cbrt(sm2.v) * 14, bx = posB();
        G.fillStyle = Pl.blue; G.beginPath(); G.arc(ax, 130, ra, 0, 7); G.fill(); G.fillStyle = Pl.grey; G.beginPath(); G.arc(bx, 130, rb, 0, 7); G.fill(); G.strokeStyle = Pl.ink; G.setLineDash([3, 5]); G.beginPath(); G.moveTo(ax, 180); G.lineTo(bx, 180); G.stroke(); G.setLineDash([]);
        K.tag(G, `r = ${fmt(sr.v, 0)} × 10³ km`, (ax + bx) / 2, 180, Pl.ink); const len = clamp(Math.log10(f / f0 * 10 + 1) * 60, 8, 140);
        K.arrow(G, ax + ra, 130, ax + ra + len, 130, Pl.red, 3.5, 11, 'F'); K.arrow(G, bx - rb, 130, bx - rb - len, 130, Pl.red, 3.5, 11, 'F'); K.text(G, 'A', ax, 135, { a: 'center', c: '#fff', w: 700 }); K.text(G, 'B ⇆', bx, 130 - rb - 10, { a: 'center', c: Pl.muted, w: 700, s: 12 });
        K.text(G, `F = ${(f / 1e20).toFixed(2)} × 10²⁰ N  (${fmt(f / f0, 2)} × Earth–Moon)`, 20, 30, { w: 700, s: 15 });
        const A = K.axes(G, [80, 210, 680, 130], [100, 800], [0, F(100, sm1.v, sm2.v) / 1e20 * 1.05], { xl: 'r (10³ km)', yl: 'F (10²⁰ N)', ticks: 7 });
        K.plot(G, A, r => F(r, sm1.v, sm2.v) / 1e20, 100, 800, Pl.violet, 2.5); G.fillStyle = Pl.red; G.beginPath(); G.arc(A.X(sr.v), A.Y(f / 1e20), 6, 0, 7); G.fill();
      }).add(sr, sm1, sm2);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); m1 = 5.97; m2 = 0.0735; sr.set(384, true); sm1.set(5.97, true); sm2.set(0.0735, true); M.draw(); },
        observe() { const f = F(ctl.val.r, ctl.val.m1, ctl.val.m2), f0 = F(384, 5.97, 0.0735); return { text: `At r = **${ctl.val.r} thousand km** with masses ${fmt(ctl.val.m1, 2)} and ${fmt(ctl.val.m2, 4)} × 10²⁴ kg, F = **${(f / 1e20).toFixed(2)} × 10²⁰ N**, which is **${fmt(f / f0, 2)}×** the Earth–Moon value. ${Math.abs(ctl.val.r / 384 - 2) < 0.05 && Math.abs(ctl.val.m1 - 5.97) < 0.01 && Math.abs(ctl.val.m2 - 0.0735) < 0.001 ? 'You doubled the distance: the force fell to about a **quarter**.' : 'Try exactly 768 (twice 384) with the original masses.'}`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 4 · Atmosphere explorer (International Standard Atmosphere, 0–86 km) ============ */
  const ISA = [[0, 288.15, -6.5, 101325], [11, 216.65, 0, 22632.1], [20, 216.65, 1.0, 5474.89], [32, 228.65, 2.8, 868.019], [47, 270.65, 0, 110.906], [51, 270.65, -2.8, 66.9389], [71, 214.65, -2.0, 3.95642], [86, 186.87, 0, 0.3734]];
  function isa(h) { const b = ISA.slice().reverse().find(l => h >= l[0]) || ISA[0]; const [hb, Tb, Lr, pb] = b, dh = h - hb, Tt = Tb + Lr * dh, gMR = 9.80665 * 0.0289644 / 8.3144598;
    const p = Lr === 0 ? pb * Math.exp(-gMR * dh * 1000 / Tb) : pb * Math.pow(Tt / Tb, -gMR / (Lr / 1000)); return { T: Tt, p }; }
  LS.isa = isa;
  const LAYERS = [[0, 12, 'Troposphere', 'Almost all weather and clouds. Temperature falls about 6.5 °C per km.'], [12, 50, 'Stratosphere', 'Calm, dry air. The ozone layer absorbs ultraviolet light, warming this layer from below.'], [50, 85, 'Mesosphere', 'Coldest layer: most meteors burn up here.'], [85, 120, 'Thermosphere (lower part)', 'Very thin air that the Sun heats strongly. Aurorae glow from about 100 km up.']];
  const SIGHTS = [[1.5, 'Low clouds'], [10.5, 'Airliners cruise (~10–12 km)'], [7.2, 'Everest summit (8.85 km) ▲'], [25, 'Ozone layer (most ozone ~15–35 km)'], [35, 'Weather balloons burst (~30–40 km)'], [80, 'Noctilucent clouds (~80–85 km)'], [90, 'Meteors burn up (~70–100 km)'], [100, 'Kármán line (100 km)'], [110, 'Aurora (from ~100 km)']];
  D.atmosphere = { wide: true,
    intro: 'Rise through the air above your head. Drag the probe (or use the slider, or scroll on the picture) from the ground to 120 km and watch **temperature** and **pressure** change, layer by layer.',
    predict: { q: 'As you climb from the ground to 50 km, the temperature…', options: ['falls steadily all the way', 'falls, then stays level, then rises again', 'rises steadily', 'stays the same'] },
    explore: 'Climb slowly. Find where the temperature stops falling, where it starts rising, and where it falls again. Watch the pressure: how high must you go for it to halve?',
    explain: 'The atmosphere is layered by how **temperature** changes with height. In the **troposphere** air is warmed from the ground, so it cools as you rise (about 6.5 °C per km). In the **stratosphere** the **ozone layer** absorbs ultraviolet light and warms the air, so temperature **rises** with height. It falls again through the **mesosphere**, then climbs sharply in the **thermosphere**. Pressure falls roughly **exponentially**: about half every 5.5 km near the ground. Values come from the International Standard Atmosphere (ISA), an average model; the real atmosphere varies with place and season.',
    apply: [q('x-at1', 'Why does the stratosphere get warmer with height?', ['It is closer to the Sun', 'Ozone absorbs ultraviolet light', 'Clouds trap heat there', 'Meteors heat it'], 1, 'Ozone absorption of UV heats the stratosphere.'), q('x-at2', 'At about 5.5 km, the air pressure is roughly…', ['the same as at sea level', 'half of sea level', 'zero', 'double'], 1, 'Pressure roughly halves every ~5.5 km near the ground.')],
    summary: ['Layers: troposphere → stratosphere → mesosphere → thermosphere.', 'Temperature falls, rises (ozone), falls, then rises again.', 'Pressure falls roughly exponentially with height.'],
    build(host, c) {
      const S = K.stage(host, 800, 460), sh = K.spring(0, 9); const seen = new Set(); let tw = 0;
      const ctl = K.controls(host, [{ k: 'range', id: 'h', label: T('Altitude', 'الارتفاع'), min: 0, max: 120, step: 0.5, val: 0, d: 1, unit: ' km' }], (id, v) => { sh.set(v); M.kick(); c.onChange(); });
      const read = document.createElement('p'); read.className = 'kx-read'; read.setAttribute('aria-live', 'polite'); host.appendChild(read);
      const Y = h => 430 - h / 120 * 410;
      K.drag(S, () => [{ id: 'p', x: 230, y: Y(sh.v), r: 22 }], (id, x, y) => { const h = clamp((430 - y) / 410 * 120, 0, 120); ctl.set('h', Math.round(h * 2) / 2); sh.set(h, true); M.kick(); c.onChange(); });
      S.cv.addEventListener('wheel', e => { e.preventDefault(); const h = clamp(ctl.val.h - Math.sign(e.deltaY) * 2, 0, 120); ctl.set('h', h); sh.set(h); M.kick(); c.onChange(); }, { passive: false });
      const M = K.motor(c, host, dt => {
        const Pl = K.pal(), G = S.g, h = sh.v; tw += dt;
        for (let i = 0; i < 46; i++) { const k = i / 45, hh = 120 * (1 - k), sky = hh < 12 ? [120, 180, 235] : hh < 50 ? [60, 110, 200] : hh < 85 ? [20, 40, 110] : [5, 8, 30]; G.fillStyle = `rgb(${sky.join(',')})`; G.fillRect(0, Y(hh) - 10, 460, 11); }
        const grd = G.createLinearGradient(0, 0, 0, 460); grd.addColorStop(0, 'rgba(2,4,18,.85)'); grd.addColorStop(0.55, 'rgba(10,30,90,.25)'); grd.addColorStop(1, 'rgba(160,210,255,0)'); G.fillStyle = grd; G.fillRect(0, 0, 460, 440);
        for (let i = 0; i < 40; i++) { const sx = (i * 97) % 460, sy = (i * 53) % 120; G.fillStyle = `rgba(255,255,255,${0.25 + 0.25 * Math.sin(tw * 2 + i)})`; G.fillRect(sx, sy, 1.6, 1.6); }
        G.fillStyle = '#4c7d3a'; G.fillRect(0, 430, 460, 30);
        LAYERS.forEach(([a, b, n]) => { G.strokeStyle = 'rgba(255,255,255,.35)'; G.setLineDash([4, 6]); G.beginPath(); G.moveTo(0, Y(b)); G.lineTo(460, Y(b)); G.stroke(); G.setLineDash([]); K.text(G, n.split(' ')[0], 12, Y((a + b) / 2) + 4, { c: '#fff', w: 700, s: 13 }); });
        SIGHTS.forEach(([hh, n]) => { G.fillStyle = 'rgba(255,255,255,.9)'; G.beginPath(); G.arc(300, Y(hh), 3, 0, 7); G.fill(); K.text(G, n, 308, Y(hh) + 4, { c: 'rgba(255,255,255,.88)', s: 11 }); });
        for (let i = 0; i < 5; i++) { const cx = (i * 120 + tw * 8) % 520 - 40; G.fillStyle = 'rgba(255,255,255,.7)'; G.beginPath(); G.ellipse(cx, Y(1.5 + (i % 3) * 2), 34, 8, 0, 0, 7); G.fill(); }
        if (Math.sin(tw * 1.3) > 0.96) { G.strokeStyle = 'rgba(255,240,200,.9)'; G.lineWidth = 2; const mx = (tw * 140) % 400; G.beginPath(); G.moveTo(mx, Y(98)); G.lineTo(mx + 40, Y(80)); G.stroke(); }
        const au = G.createLinearGradient(0, Y(120), 0, Y(100)); au.addColorStop(0, 'rgba(90,255,170,0)'); au.addColorStop(1, `rgba(90,255,170,${0.18 + 0.08 * Math.sin(tw)})`); G.fillStyle = au; G.fillRect(0, Y(120), 460, Y(100) - Y(120));
        G.fillStyle = Pl.gold; G.beginPath(); G.arc(230, Y(h), 11, 0, 7); G.fill(); G.strokeStyle = '#fff'; G.lineWidth = 2; G.stroke(); G.beginPath(); G.moveTo(230, Y(h) + 11); G.lineTo(230, 430); G.strokeStyle = 'rgba(255,255,255,.35)'; G.stroke();
        // profiles
        G.fillStyle = Pl.bg2; G.fillRect(460, 0, 340, 460);
        const A = K.axes(G, [500, 20, 130, 410], [-100, 20], [0, 120], { xl: '°C', yl: 'km', ticks: 4, xstep: 40 });
        G.strokeStyle = Pl.red; G.lineWidth = 2.5; G.beginPath(); for (let hh = 0; hh <= 86; hh += 0.5) { const t = isa(hh).T - 273.15; hh ? G.lineTo(A.X(t), A.Y(hh)) : G.moveTo(A.X(t), A.Y(hh)); } G.stroke(); G.setLineDash([3, 4]); G.beginPath(); G.moveTo(A.X(-87), A.Y(86)); G.lineTo(A.X(10), A.Y(120)); G.stroke(); G.setLineDash([]);
        const B = K.axes(G, [660, 20, 120, 410], [0, 1013], [0, 120], { xl: 'hPa', ticks: 3, xstep: 500 }); G.strokeStyle = Pl.blue; G.lineWidth = 2.5; G.beginPath(); for (let hh = 0; hh <= 86; hh += 0.5) { const p = isa(hh).p / 100; hh ? G.lineTo(B.X(p), B.Y(hh)) : G.moveTo(B.X(p), B.Y(hh)); } G.stroke();
        const r = isa(Math.min(h, 86)); G.fillStyle = Pl.red; G.beginPath(); G.arc(A.X(r.T - 273.15), A.Y(Math.min(h, 86)), 5, 0, 7); G.fill(); G.fillStyle = Pl.blue; G.beginPath(); G.arc(B.X(r.p / 100), B.Y(Math.min(h, 86)), 5, 0, 7); G.fill();
        const L0 = LAYERS.find(([a, b]) => h >= a && h < b) || LAYERS[3]; seen.add(L0[2]);
        read.innerHTML = IL(`**${fmt(h, 1)} km — ${L0[2]}.** ${L0[3]} ${h <= 86 ? `Model temperature **${fmt(r.T - 273.15, 1)} °C**, pressure **${r.p > 1000 ? fmt(r.p / 100, 0) + ' hPa' : fmt(r.p, 2) + ' Pa'}** (${fmt(r.p / 1013.25, r.p / 1013.25 < 1 ? 3 : 1)}% of sea level).` : 'The standard model stops at 86 km; above, the thin thermosphere is heated strongly by the Sun (temperatures depend on solar activity).'}`);
      }).add(sh);
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); sh.set(0, true); seen.clear(); M.play(); },
        observe() { const t11 = isa(11).T - 273.15, t47 = isa(47).T - 273.15; return { text: `You visited **${seen.size} of 4** layers (${[...seen].join(', ')}). In this model the temperature falls to **${fmt(t11, 1)} °C** at 11 km, stays level to 20 km, then **rises** to **${fmt(t47, 1)} °C** at 47 km before falling again.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 5 · Light bender: refraction and lenses ============ */
  const MEDIA = { aw: ['Air → water', 1.0, 1.33], ag: ['Air → glass', 1.0, 1.5], wa: ['Water → air', 1.33, 1.0], ga: ['Glass → air', 1.5, 1.0] };
  D.optics = { wide: true,
    intro: 'Two ways light changes direction. **Refraction:** aim a ray at the boundary between two materials. **Lens:** move an object in front of a converging lens and find its image.',
    predict: { q: 'Light goes from glass into air. If you make the angle steep enough, the light…', options: ['passes straight through', 'is completely reflected back into the glass', 'stops', 'bends towards the normal'] },
    explore: 'Refraction: try glass → air and increase the angle past about 42°. Lens: move the object from far away to inside the focal length.',
    explain: 'At a boundary, light obeys **Snell’s law: n₁ sin θ₁ = n₂ sin θ₂**. Going into a denser material (higher n) it bends **towards** the normal. Going out of glass into air it bends away, and beyond the **critical angle** (sin θc = n₂/n₁ ≈ 41.8° for glass → air) no refracted ray is possible: **total internal reflection**. A converging lens obeys **1/f = 1/u + 1/v**: an object beyond f gives a **real, inverted** image; inside f, a **virtual, upright, magnified** image (a magnifying glass).',
    apply: [q('x-op1', 'Light enters water (n = 1.33) from air at 30°. The refracted angle is about…', ['22°', '30°', '42°', '60°'], 0, 'sin θ₂ = sin 30° / 1.33 = 0.376 → 22°.'), q('x-op2', 'An object is placed inside the focal length of a converging lens. The image is…', ['real and inverted', 'virtual, upright and larger', 'the same size', 'there is no image'], 1, 'That is how a magnifying glass works.')],
    summary: ['n₁ sin θ₁ = n₂ sin θ₂.', 'Beyond the critical angle: total internal reflection.', 'Thin lens: 1/f = 1/u + 1/v; inside f the image is virtual and upright.'],
    build(host, c) {
      const S = K.stage(host, 800, 420), sa = K.spring(35), su = K.spring(260), sf = K.spring(110); let mode = 'ref', med = 'ag'; let sawTIR = false, lensSeen = { real: false, virt: false };
      const ctl = K.controls(host, [{ k: 'chips', id: 'mode', label: T('Mode', 'الوضع'), opts: [['ref', T('Refraction', 'الانكسار')], ['lens', T('Lens', 'العدسة')]], val: 'ref' }, { k: 'chips', id: 'med', label: T('Materials', 'المواد'), opts: Object.entries(MEDIA).map(([k, v]) => [k, v[0]]), val: 'ag' }, { k: 'range', id: 'a', label: T('Angle of incidence', 'زاوية السقوط'), min: 0, max: 89, step: 0.5, val: 35, d: 1, unit: '°' }, { k: 'range', id: 'f', label: T('Lens focal length', 'البعد البؤري'), min: 60, max: 160, step: 1, val: 110, unit: ' mm' }], (id, v) => { if (id === 'mode') mode = v; if (id === 'med') med = v; if (id === 'a') sa.set(v); if (id === 'f') sf.set(v); M.kick(); c.onChange(); });
      const read = document.createElement('p'); read.className = 'kx-read'; read.setAttribute('aria-live', 'polite'); host.appendChild(read);
      K.drag(S, () => mode === 'ref' ? [{ id: 'ray', x: 400 - Math.sin(sa.v * deg) * 180, y: 210 - Math.cos(sa.v * deg) * 180, r: 20 }] : [{ id: 'obj', x: 400 - su.v, y: 210 - 50, r: 24 }],
        (id, x, y) => { if (id === 'ray') { const a = clamp(Math.atan2(400 - x, 210 - y) / deg, 0, 89); ctl.set('a', Math.round(a * 2) / 2); sa.set(a, true); } else { su.set(clamp(400 - x, 30, 380), true); } M.kick(); c.onChange(); });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2);
        if (mode === 'ref') {
          const [nm, n1, n2] = MEDIA[med]; G.fillStyle = n2 > n1 ? 'rgba(80,150,255,.18)' : 'rgba(80,150,255,.06)'; G.fillRect(0, 210, 800, 210); G.fillStyle = n1 > n2 ? 'rgba(80,150,255,.18)' : 'rgba(80,150,255,.06)'; G.fillRect(0, 0, 800, 210);
          K.text(G, `n₁ = ${n1}`, 20, 30, { w: 700 }); K.text(G, `n₂ = ${n2}`, 20, 400, { w: 700 }); K.text(G, nm, 780, 30, { a: 'right', c: Pl.muted, w: 600 });
          G.strokeStyle = Pl.muted; G.setLineDash([5, 5]); G.beginPath(); G.moveTo(400, 20); G.lineTo(400, 400); G.stroke(); G.setLineDash([]); G.beginPath(); G.moveTo(0, 210); G.lineTo(800, 210); G.stroke();
          const a1 = sa.v * deg, s2 = n1 * Math.sin(a1) / n2, sx = 400 - Math.sin(a1) * 200, sy = 210 - Math.cos(a1) * 200;
          G.strokeStyle = Pl.gold; G.lineWidth = 4; G.beginPath(); G.moveTo(sx, sy); G.lineTo(400, 210); G.stroke(); G.fillStyle = Pl.gold; G.beginPath(); G.arc(sx, sy, 9, 0, 7); G.fill();
          const tir = s2 > 1, Rf = tir ? 1 : Math.pow((n1 * Math.cos(a1) - n2 * Math.sqrt(1 - s2 * s2)) / (n1 * Math.cos(a1) + n2 * Math.sqrt(1 - s2 * s2)), 2);
          G.globalAlpha = clamp(0.15 + Rf, 0.15, 1); G.lineWidth = 3; G.beginPath(); G.moveTo(400, 210); G.lineTo(400 + Math.sin(a1) * 200, 210 - Math.cos(a1) * 200); G.stroke(); G.globalAlpha = 1;
          if (!tir) { const a2 = Math.asin(s2); G.strokeStyle = Pl.red; G.lineWidth = 4; G.beginPath(); G.moveTo(400, 210); G.lineTo(400 + Math.sin(a2) * 200, 210 + Math.cos(a2) * 200); G.stroke(); G.strokeStyle = Pl.red; G.lineWidth = 1.5; G.beginPath(); G.arc(400, 210, 60, Math.PI / 2 - a2, Math.PI / 2); G.stroke(); K.tag(G, `θ₂ = ${fmt(a2 / deg, 1)}°`, 450, 300, Pl.red); }
          else sawTIR = true;
          G.strokeStyle = Pl.gold; G.lineWidth = 1.5; G.beginPath(); G.arc(400, 210, 70, -Math.PI / 2 - a1, -Math.PI / 2); G.stroke(); K.tag(G, `θ₁ = ${fmt(sa.v, 1)}°`, 350, 110, Pl.gold);
          const crit = n1 > n2 ? Math.asin(n2 / n1) / deg : null;
          read.innerHTML = IL(tir ? `**Total internal reflection.** ${fmt(sa.v, 1)}° is beyond the critical angle **${fmt(crit, 1)}°**: n₁ sin θ₁ / n₂ = ${fmt(s2, 3)} > 1, so no refracted ray exists and all the light reflects.` : `n₁ sin θ₁ = ${fmt(n1 * Math.sin(a1), 3)} = n₂ sin θ₂ → **θ₂ = ${fmt(Math.asin(s2) / deg, 1)}°**. ${n2 > n1 ? 'Into a denser material: the ray bends **towards** the normal.' : n2 < n1 ? 'Out of a denser material: it bends **away** from the normal.' : ''} ${crit ? `Critical angle here: ${fmt(crit, 1)}°.` : ''} Reflected: about ${fmt(Rf * 100, 0)}% of the light.`);
        } else {
          const f = sf.v, u = su.v, oh = 50, ax = 400, ay = 210;
          G.strokeStyle = Pl.muted; G.lineWidth = 1.2; G.beginPath(); G.moveTo(10, ay); G.lineTo(790, ay); G.stroke();
          G.strokeStyle = Pl.blue; G.lineWidth = 3; G.beginPath(); G.ellipse(ax, ay, 10, 150, 0, 0, 7); G.stroke(); [-1, 1].forEach(s => { G.fillStyle = Pl.ink; G.beginPath(); G.arc(ax + s * f, ay, 4, 0, 7); G.fill(); K.text(G, 'F', ax + s * f, ay + 20, { a: 'center', c: Pl.muted, w: 700 }); G.beginPath(); G.arc(ax + s * 2 * f, ay, 3, 0, 7); G.fill(); K.text(G, '2F', ax + s * 2 * f, ay + 20, { a: 'center', c: Pl.muted, s: 11 }); });
          K.arrow(G, ax - u, ay, ax - u, ay - oh, Pl.green, 5, 12, ''); K.text(G, 'object (drag)', ax - u, ay + 38, { a: 'center', c: Pl.green, s: 11, w: 700 });
          const v = Math.abs(u - f) < 0.5 ? Infinity : 1 / (1 / f - 1 / u), m = -v / u, ih = m * oh, ix = ax + v;
          const ray = (pts, dash) => { G.setLineDash(dash ? [6, 6] : []); G.beginPath(); pts.forEach(([x, y], i) => i ? G.lineTo(x, y) : G.moveTo(x, y)); G.stroke(); G.setLineDash([]); };
          G.strokeStyle = Pl.gold; G.lineWidth = 2;
          const tx = ax - u, ty = ay - oh;
          // ray 1: parallel then through far focal point
          const s1 = oh / f; ray([[tx, ty], [ax, ty], [790, ty + s1 * (790 - ax)]]);
          // ray 2: through centre
          const s2 = oh / u; ray([[tx, ty], [790, ty + s2 * (790 - tx)]]);
          if (isFinite(v)) {
            if (v > 0) { lensSeen.real = true; K.arrow(G, ix, ay, ix, ay - ih, Pl.red, 5, 12, ''); K.text(G, 'real image', ix, ay + (ih < 0 ? -ih + 18 : 38), { a: 'center', c: Pl.red, s: 11, w: 700 }); }
            else { lensSeen.virt = true; G.strokeStyle = Pl.gold; G.globalAlpha = 0.6; ray([[ax, ty], [ix, ay - ih]], true); ray([[tx, ty], [ix, ay - ih]], true); G.globalAlpha = 1; G.setLineDash([5, 4]); K.arrow(G, ix, ay, ix, ay - ih, Pl.red, 4, 12, ''); G.setLineDash([]); K.text(G, 'virtual image', ix, ay + 24, { a: 'center', c: Pl.red, s: 11, w: 700 }); }
          }
          read.innerHTML = IL(!isFinite(v) ? `The object is **at F** (u = f = ${fmt(f, 0)} mm): rays leave parallel, no image forms.` : `u = **${fmt(u, 0)} mm**, f = **${fmt(f, 0)} mm** → 1/v = 1/f − 1/u → **v = ${fmt(v, 0)} mm**. ${v > 0 ? `**Real, inverted** image, magnification ${fmt(Math.abs(m), 2)}×.` : `Negative v: a **virtual, upright** image on the same side, magnified **${fmt(Math.abs(m), 2)}×**.`}`);
        }
      }).add(sa, su, sf);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); mode = 'ref'; med = 'ag'; sa.set(35, true); su.set(260, true); sf.set(110, true); sawTIR = false; lensSeen = { real: false, virt: false }; M.draw(); },
        observe() { const crit = Math.asin(1 / 1.5) / deg; return { text: `${sawTIR ? `You found **total internal reflection** (glass → air critical angle ${fmt(crit, 1)}°).` : 'You have not yet seen total internal reflection — try glass → air above 42°.'} ${lensSeen.real ? 'You made a **real** image' : ''}${lensSeen.real && lensSeen.virt ? ' and a **virtual** one.' : lensSeen.virt ? 'You made a **virtual** image.' : lensSeen.real ? '.' : ''}`, predOk: sawTIR ? p => p === 1 : null }; } };
    }
  };

  /* ============ 6 · Sound explorer ============ */
  D.sound = { wide: true,
    intro: 'Sound is a **longitudinal** wave: air particles shuffle back and forth along the direction the sound travels, making squashed regions (**compressions**) and stretched ones (**rarefactions**). Change the **frequency** and **amplitude**; if you like, switch on the tone to hear it.',
    predict: { q: 'Raising the frequency of a sound makes its wavelength in air…', options: ['longer', 'shorter', 'unchanged', 'zero'] },
    explore: 'Double the frequency and count the compressions. Then raise only the amplitude: what changes, and what does not?',
    explain: 'All sound in the same air travels at the same speed (about **343 m/s** at 20 °C), so **wavelength = speed ÷ frequency**: higher frequency → **shorter** wavelength and higher **pitch**. **Amplitude** is how far the particles move; larger amplitude carries more energy and sounds **louder**, but does not change the pitch or wavelength. The animation is slowed down enormously so you can see it.',
    apply: [q('x-sn1', 'A 686 Hz sound in air (343 m/s) has a wavelength of…', ['0.5 m', '2 m', '343 m', '686 m'], 0, 'λ = 343 / 686 = 0.5 m.'), q('x-sn2', 'Making a sound louder (same note) changes its…', ['frequency', 'wavelength', 'amplitude', 'speed'], 2, 'Loudness is amplitude.')],
    summary: ['Sound is longitudinal: compressions and rarefactions.', 'λ = v / f — higher pitch, shorter wavelength.', 'Amplitude sets loudness, not pitch.'],
    build(host, c) {
      const S = K.stage(host, 800, 320), sf = K.spring(440, 8), sa = K.spring(0.6, 8); let t = 0, ac = null, osc = null, gain = null, on = false;
      const ctl = K.controls(host, [{ k: 'range', id: 'f', label: T('Frequency', 'التردد'), min: 110, max: 1760, step: 1, val: 440, unit: ' Hz' }, { k: 'range', id: 'a', label: T('Amplitude', 'السعة'), min: 0, max: 1, step: 0.01, val: 0.6, d: 2 }, { k: 'row' }, { k: 'toggle', id: 'tone', label: T('Play the tone (quiet)', 'شغّل النغمة (بهدوء)'), val: false }, { k: 'end' }], (id, v) => { if (id === 'f') sf.set(v); if (id === 'a') sa.set(v); if (id === 'tone') tone(v); audio(); M.kick(); c.onChange(); });
      const read = document.createElement('p'); read.className = 'kx-read'; read.setAttribute('aria-live', 'polite'); host.appendChild(read);
      function tone(v) { on = v; try { if (v && !ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); osc = ac.createOscillator(); gain = ac.createGain(); gain.gain.value = 0; osc.connect(gain).connect(ac.destination); osc.start(); } audio(); } catch (e) { on = false; } }
      function audio() { if (!ac) return; osc.frequency.setTargetAtTime(ctl.val.f, ac.currentTime, 0.03); gain.gain.setTargetAtTime(on ? 0.08 * ctl.val.a : 0, ac.currentTime, 0.05); }
      const N = 60, rows = 7;
      const M = K.motor(c, host, dt => {
        t += dt; const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); const f = sf.v, A = sa.v, lamPx = clamp(34000 / f, 18, 300), w = 2 * Math.PI * 0.7; // slowed: visual frequency 0.7 Hz
        for (let r = 0; r < rows; r++) for (let i = 0; i < N; i++) { const x0 = 30 + i * 12.5, d = A * 9 * Math.sin(2 * Math.PI * x0 / lamPx - w * t), y = 30 + r * 20 + ((i * 7 + r * 3) % 5) - 2; G.fillStyle = Pl.blue; G.globalAlpha = 0.75; G.beginPath(); G.arc(x0 + d, y, 3.2, 0, 7); G.fill(); }
        G.globalAlpha = 1; G.fillStyle = Pl.ink; G.fillRect(10, 20, 8, rows * 20); K.text(G, 'speaker', 14, 186, { a: 'center', s: 11, c: Pl.muted });
        const Ax = K.axes(G, [30, 200, 760, 110], [0, 760], [-1.1, 1.1], { xl: 'distance', yl: 'pressure', grid: false, ticks: 2 });
        G.strokeStyle = Pl.red; G.lineWidth = 2.5; G.beginPath(); for (let x = 0; x <= 760; x += 2) { const y = -A * Math.cos(2 * Math.PI * (x + 30) / lamPx - w * t); x ? G.lineTo(Ax.X(x), Ax.Y(y)) : G.moveTo(Ax.X(x), Ax.Y(y)); } G.stroke();
        K.arrow(G, 60, 300, 60 + lamPx, 300, Pl.gold, 2, 8, 'λ'); K.arrow(G, 60 + lamPx, 300, 60, 300, Pl.gold, 2, 8, '');
        read.innerHTML = IL(`**${fmt(f, 0)} Hz**: wavelength in air λ = 343 ÷ ${fmt(f, 0)} = **${fmt(343 / f, 3)} m**; period ${fmt(1000 / f, 2)} ms. Amplitude ${fmt(A, 2)} (relative). Animation slowed so one cycle takes ~1.4 s.`);
      }).add(sf, sa);
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); try { if (ac) ac.close(); } catch (e) { /* closed */ } },
        reset() { ctl.reset(); sf.set(440, true); sa.set(0.6, true); tone(false); M.play(); },
        observe() { return { text: `At **${ctl.val.f} Hz** the wavelength is **${fmt(343 / ctl.val.f, 3)} m**. Doubling to ${ctl.val.f * 2} Hz would halve it to ${fmt(343 / ctl.val.f / 2, 3)} m — amplitude changes neither.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 7 · Energy track ============ */
  D['energy-track'] = { wide: true,
    intro: 'A ball rolls on a U-shaped track. Drag the ball to choose its starting height and let go. The bars show its **gravitational potential energy**, **kinetic energy** and the energy turned into **heat** by friction.',
    predict: { q: 'With **no friction**, released from 2 m, the ball reaches on the other side…', options: ['less than 2 m', 'exactly 2 m', 'more than 2 m', 'only the bottom'] },
    explore: 'Release with friction at zero and watch the total. Then add a little friction and watch where the energy goes.',
    explain: 'Energy is **conserved**: it changes form but the total stays the same. At the top it is all **potential (mgh)**; at the bottom it is all **kinetic (½mv²)**. Without friction the ball climbs back to **exactly** its starting height. With friction, some energy is transferred to the **thermal** store each pass, so each swing is lower — the total, including heat, is still constant.',
    apply: [q('x-en1', 'A 2 kg ball falls 5 m (g = 9.8, no air). Its kinetic energy at the bottom is…', ['10 J', '49 J', '98 J', '196 J'], 2, 'mgh = 2 × 9.8 × 5 = 98 J.'), q('x-en2', 'With friction, the ball’s swings get lower because energy is…', ['destroyed', 'transferred to heating the track and ball', 'created', 'stored as speed'], 1, 'Energy is transferred, not destroyed.')],
    summary: ['Total energy is conserved.', 'mgh ↔ ½mv² as the ball rises and falls.', 'Friction transfers energy to the thermal store.'],
    build(host, c) {
      const S = K.stage(host, 800, 380), m = 1, g = 9.81, a = 0.35; let x = -2.5, v = 0, mu = 0, heat = 0, E0 = null, held = false, maxOther = 0;
      const ctl = K.controls(host, [{ k: 'range', id: 'mu', label: T('Friction (model)', 'الاحتكاك (نموذج)'), min: 0, max: 0.2, step: 0.005, val: 0, d: 3 }, { k: 'row' }, { k: 'btn', id: 'rel', label: T('Release from the top', 'أطلق من الأعلى'), accent: true }, { k: 'end' }], (id, val) => { if (id === 'mu') mu = val; if (id === 'rel') { x = -2.5; v = 0; heat = 0; E0 = null; maxOther = 0; M.play(); } c.onChange(); });
      const read = document.createElement('p'); read.className = 'kx-read'; host.appendChild(read);
      const H = xx => a * xx * xx, sx = xx => 300 + xx * 95, sy = h => 330 - h * 95;
      K.drag(S, () => [{ id: 'b', x: sx(x), y: sy(H(x)) - 14, r: 22 }], (id, px) => { held = true; x = clamp((px - 300) / 95, -2.8, 2.8); v = 0; heat = 0; E0 = null; maxOther = 0; M.kick(); M.draw(); }, () => { held = false; M.play(); });
      const M = K.motor(c, host, dt => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2);
        if (!held) for (let k = 0; k < 20; k++) { const h = dt / 20, sl = 2 * a * x, cs = 1 / Math.sqrt(1 + sl * sl), sn = sl * cs; let acc = -g * sn; if (Math.abs(v) > 1e-4) acc -= Math.sign(v) * mu * g * cs * 5; else if (Math.abs(g * sn) < mu * g * cs * 5) { acc = 0; v = 0; }
          const vOld = v; v += acc * h; const ds = v * h; heat += Math.abs(mu * g * cs * 5 * m * ds); x += ds * cs; }
        const PE = m * g * H(x), KE = 0.5 * m * v * v; if (E0 == null) E0 = PE + KE + heat;
        G.strokeStyle = Pl.ink; G.lineWidth = 6; G.lineCap = 'round'; G.beginPath(); for (let xx = -2.9; xx <= 2.9; xx += 0.05) { xx > -2.9 ? G.lineTo(sx(xx), sy(H(xx)) + 4) : G.moveTo(sx(xx), sy(H(xx)) + 4); } G.stroke();
        for (let hh = 0.5; hh <= 2.5; hh += 0.5) { G.strokeStyle = Pl.line; G.lineWidth = 1; G.setLineDash([3, 5]); G.beginPath(); G.moveTo(sx(-3), sy(hh)); G.lineTo(sx(3), sy(hh)); G.stroke(); G.setLineDash([]); K.text(G, `${hh} m`, sx(-3) - 6, sy(hh) + 4, { a: 'right', c: Pl.muted, s: 11 }); }
        G.fillStyle = Pl.red; G.beginPath(); G.arc(sx(x), sy(H(x)) - 10, 14, 0, 7); G.fill();
        const tot = PE + KE + heat, bars = [['Potential (mgh)', PE, Pl.blue], ['Kinetic (½mv²)', KE, Pl.red], ['Thermal', heat, Pl.gold], ['Total', tot, Pl.ink]], bmax = Math.max(E0 || 1, tot) * 1.05;
        bars.forEach(([n, e, col], i) => { const bx = 620 + i * 44, bh = e / bmax * 250; G.fillStyle = col; G.globalAlpha = i === 3 ? 0.35 : 0.9; G.fillRect(bx, 330 - bh, 32, bh); G.globalAlpha = 1; G.save(); G.translate(bx + 22, 345); G.rotate(-0.6); K.text(G, n.split(' ')[0], 0, 0, { a: 'right', s: 11, c: Pl.muted }); G.restore(); K.text(G, `${fmt(e, 1)} J`, bx + 16, 322 - bh, { a: 'center', s: 11, w: 700 }); });
        read.innerHTML = IL(`Height **${fmt(H(x), 2)} m**, speed **${fmt(Math.abs(v), 2)} m/s** (1 kg ball). PE ${fmt(PE, 1)} J + KE ${fmt(KE, 1)} J + thermal ${fmt(heat, 1)} J = **${fmt(tot, 1)} J**${E0 ? ` (started with ${fmt(E0, 1)} J)` : ''}.`);
      });
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); mu = 0; x = -2.5; v = 0; heat = 0; E0 = null; M.play(); },
        observe() { const PE = m * g * H(x), KE = 0.5 * m * v * v; return { text: `Started with **${fmt(E0 || 0, 1)} J**; now PE ${fmt(PE, 1)} + KE ${fmt(KE, 1)} + thermal ${fmt(heat, 1)} = **${fmt(PE + KE + heat, 1)} J**. ${mu === 0 ? 'With no friction the ball keeps returning to its starting height.' : 'With friction, energy moves steadily into the thermal store.'}`, predOk: mu === 0 ? p => p === 1 : null }; } };
    }
  };

  /* ============ 8 · Magnet field lab ============ */
  D['magnet-field'] = { wide: true,
    intro: 'Two bar magnets. Drag them anywhere and flip either one. Field lines are traced from **north** poles to **south** poles, and tiny compasses show the field direction everywhere.',
    predict: { q: 'Two **north** poles facing each other: the field lines between them…', options: ['join straight across', 'bend away from each other, leaving a neutral point', 'disappear entirely', 'form a circle'] },
    explore: 'Place the magnets end to end, N facing S. Then flip one so N faces N. Look for the point between them where the compasses don’t know which way to point.',
    explain: 'Field lines leave **north** poles and enter **south** poles; they never cross, and where they are **closer together** the field is **stronger**. Opposite poles facing each other give lines that run straight across (they **attract**). Like poles push the lines apart and create a **neutral point** where the fields cancel (they **repel**). A compass needle lines up with the field. (This model treats each pole as a point; real magnets spread their poles out.)',
    apply: [q('x-mg1', 'Where are magnetic field lines closest together?', ['Where the field is weakest', 'Near the poles, where it is strongest', 'Halfway between poles', 'They are evenly spaced'], 1, 'Line density shows field strength.'), q('x-mg2', 'A compass needle’s north end points…', ['towards a north pole', 'along the field, away from N and towards S', 'always up the page', 'nowhere'], 1, 'It aligns with the field direction.')],
    summary: ['Lines run from N to S and never cross.', 'Opposites attract: lines join across; likes repel: a neutral point.', 'Compasses align with the field.'],
    build(host, c) {
      const S = K.stage(host, 800, 440); const mags = [{ x: 260, y: 220, flip: false }, { x: 540, y: 220, flip: true }]; let lines = [], dirty = true;
      const ctl = K.controls(host, [{ k: 'btn', id: 'fa', label: T('Flip magnet A', 'اقلب المغناطيس أ') }, { k: 'btn', id: 'fb', label: T('Flip magnet B', 'اقلب المغناطيس ب') }, { k: 'btn', id: 'ns', label: T('N facing S', 'ش مقابل ج') }, { k: 'btn', id: 'nn', label: T('N facing N', 'ش مقابل ش') }], id => { if (id === 'fa') mags[0].flip = !mags[0].flip; if (id === 'fb') mags[1].flip = !mags[1].flip; if (id === 'ns') { mags[0].flip = false; mags[1].flip = false; } if (id === 'nn') { mags[0].flip = false; mags[1].flip = true; } dirty = true; M.draw(); c.onChange(); });
      const read = document.createElement('p'); read.className = 'kx-read'; host.appendChild(read);
      const poles = () => mags.flatMap(m => { const d = m.flip ? -1 : 1; return [{ x: m.x + 60 * d, y: m.y, q: 1 }, { x: m.x - 60 * d, y: m.y, q: -1 }]; });
      const B = (x, y, P) => { let bx = 0, by = 0; P.forEach(p => { const dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy + 30, r3 = r2 * Math.sqrt(r2); bx += p.q * dx / r3; by += p.q * dy / r3; }); return [bx, by]; };
      function trace() { const P = poles(); lines = []; P.filter(p => p.q > 0).forEach(p => { for (let k = 0; k < 14; k++) { const a = (k + 0.5) / 14 * 2 * Math.PI; let x = p.x + Math.cos(a) * 8, y = p.y + Math.sin(a) * 8; const pts = [[x, y]];
        for (let s = 0; s < 700; s++) { const [bx, by] = B(x, y, P), bm = Math.hypot(bx, by); if (bm < 2e-6) break; x += bx / bm * 4; y += by / bm * 4; pts.push([x, y]); if (x < -50 || x > 850 || y < -50 || y > 490) break; if (P.some(o => o.q < 0 && Math.hypot(o.x - x, o.y - y) < 6)) break; } lines.push(pts); } }); dirty = false; }
      K.drag(S, () => mags.map((m, i) => ({ id: i, x: m.x, y: m.y, r: 60 })), (id, x, y) => { mags[id].x = clamp(x, 80, 720); mags[id].y = clamp(y, 40, 400); dirty = true; M.draw(); }, () => c.onChange());
      const M = K.motor(c, host, () => {
        if (dirty) trace(); const Pl = K.pal(), G = S.g, P = poles(); S.clear(Pl.bg2);
        G.strokeStyle = Pl.violet; G.globalAlpha = 0.75; G.lineWidth = 1.6; lines.forEach(pts => { G.beginPath(); pts.forEach(([x, y], i) => i ? G.lineTo(x, y) : G.moveTo(x, y)); G.stroke(); const mid = pts[Math.floor(pts.length / 2)], nx = pts[Math.floor(pts.length / 2) + 1]; if (nx) K.arrow(G, mid[0], mid[1], mid[0] + (nx[0] - mid[0]) * 2.4, mid[1] + (nx[1] - mid[1]) * 2.4, Pl.violet, 1.6, 7); }); G.globalAlpha = 1;
        for (let gx = 40; gx < 800; gx += 64) for (let gy = 36; gy < 440; gy += 64) { if (mags.some(m => Math.abs(gx - m.x) < 78 && Math.abs(gy - m.y) < 26)) continue; const [bx, by] = B(gx, gy, P), a = Math.atan2(by, bx); G.save(); G.translate(gx, gy); G.rotate(a); G.fillStyle = Pl.red; G.beginPath(); G.moveTo(10, 0); G.lineTo(-2, -3.5); G.lineTo(-2, 3.5); G.fill(); G.fillStyle = Pl.grey; G.beginPath(); G.moveTo(-10, 0); G.lineTo(-2, -3.5); G.lineTo(-2, 3.5); G.fill(); G.restore(); }
        mags.forEach((m, i) => { const d = m.flip ? -1 : 1; G.fillStyle = Pl.red; G.fillRect(m.x + (d > 0 ? 0 : -60), m.y - 20, 60, 40); G.fillStyle = Pl.blue; G.fillRect(m.x + (d > 0 ? -60 : 0), m.y - 20, 60, 40); K.text(G, 'N', m.x + 30 * d, m.y + 6, { a: 'center', c: '#fff', w: 800, s: 18 }); K.text(G, 'S', m.x - 30 * d, m.y + 6, { a: 'center', c: '#fff', w: 800, s: 18 }); K.text(G, i ? 'B' : 'A', m.x, m.y - 28, { a: 'center', c: Pl.muted, w: 700 }); });
        const facing = (() => { const [a, b] = mags[0].x < mags[1].x ? mags : [mags[1], mags[0]]; const ra = a.flip ? 'S' : 'N', lb = b.flip ? 'N' : 'S'; return ra + lb; })();
        read.innerHTML = IL(facing === 'NS' || facing === 'SN' ? 'The facing ends are **opposite poles**: lines run straight across the gap — the magnets **attract**.' : `The facing ends are **both ${facing[0] === 'N' ? 'north' : 'south'}**: the lines turn away from each other and there is a **neutral point** between them — the magnets **repel**.`);
      });
      M.draw();
      return { destroy() { S.destroy(); }, reset() { mags[0].x = 260; mags[1].x = 540; mags.forEach(m => { m.y = 220; }); mags[0].flip = false; mags[1].flip = true; dirty = true; M.draw(); },
        observe() { const [a, b] = mags[0].x < mags[1].x ? mags : [mags[1], mags[0]]; const like = (a.flip ? 'S' : 'N') === (b.flip ? 'N' : 'S'); /* right end of the left magnet vs left end of the right one */ return { text: like ? 'Like poles face each other now: the field lines bend apart and there is a neutral point between them.' : 'Opposite poles face each other: lines cross the gap directly.', predOk: like ? p => p === 1 : null }; } };
    }
  };

  /* ============ 9 · Black hole explorer ============ */
  D['black-hole'] = { wide: true,
    intro: 'A black hole is a region where gravity is so strong that, inside the **event horizon**, not even light can escape. Choose its **mass** and send light rays past it; move a probe to see the escape speed at different distances.',
    predict: { q: 'If a black hole has **10 times** the mass, its event horizon radius is…', options: ['the same', '10 times bigger', '100 times bigger', 'smaller'] },
    explore: 'Compare a black hole of 1 solar mass, 10 solar masses and the 4 million solar masses of Sagittarius A* at the centre of our galaxy. Move the probe in towards the horizon.',
    explain: 'The event horizon’s radius is the **Schwarzschild radius r_s = 2GM/c²** — about **2.95 km per solar mass**, so it grows **in proportion** to the mass. The escape speed at distance r is **v = c √(r_s / r)**: it reaches the speed of light exactly at the horizon. Light passing far away is bent by about **2r_s / b** (b is how far it passes from the centre); rays aimed within **3√3⁄2 r_s ≈ 2.6 r_s** are captured. The rays here follow the exact Schwarzschild orbit equation for light; the glowing disc is an illustration.',
    apply: [q('x-bh1', 'A black hole of 3 solar masses has a Schwarzschild radius of about…', ['3 km', '9 km', '30 km', '3,000 km'], 1, '2.95 km × 3 ≈ 8.9 km.'), q('x-bh2', 'At the event horizon, the escape speed equals…', ['the speed of sound', 'half the speed of light', 'the speed of light', 'zero'], 2, 'v = c√(r_s/r) = c at r = r_s.')],
    summary: ['r_s = 2GM/c² ≈ 2.95 km × (mass in solar masses).', 'Escape speed v = c√(r_s/r): equals c at the horizon.', 'Light bends around it; close-passing rays are captured.'],
    build(host, c) {
      const S = K.stage(host, 800, 420), sm = K.spring(0, 6), sp = K.spring(6); let t = 0;
      const ctl = K.controls(host, [{ k: 'range', id: 'lm', label: T('Mass (solar masses, log scale)', 'الكتلة (كتل شمسية)'), min: 0, max: 9, step: 0.01, val: 0, d: 0, fmt: v => { const m = Math.pow(10, v); return m >= 1e6 ? fmt(m / 1e6, 1) + ' million' : m >= 1e3 ? fmt(m / 1e3, 1) + ' thousand' : fmt(m, 1); } }, { k: 'range', id: 'p', label: T('Probe distance (× r_s)', 'بعد المسبار'), min: 1, max: 20, step: 0.1, val: 6, d: 1 }, { k: 'chips', id: 'pre', label: T('Examples', 'أمثلة'), opts: [['0', '1 M☉'], ['1', '10 M☉'], ['6.62', 'Sgr A*']], val: '0' }], (id, v) => { if (id === 'lm') sm.set(v); if (id === 'p') sp.set(v); if (id === 'pre') { ctl.set('lm', +v); sm.set(+v); } M.kick(); c.onChange(); });
      const read = document.createElement('p'); read.className = 'kx-read'; read.setAttribute('aria-live', 'polite'); host.appendChild(read);
      const M = K.motor(c, host, dt => {
        t += dt; const G = S.g; G.fillStyle = '#04050c'; G.fillRect(0, 0, 800, 420);
        for (let i = 0; i < 120; i++) { const x = (i * 211) % 800, y = (i * 137) % 420; G.fillStyle = `rgba(255,255,255,${0.2 + 0.5 * ((i * 31) % 10) / 10})`; G.fillRect(x, y, 1.3, 1.3); }
        const cx = 330, cy = 210, R = 46; // r_s drawn as 46 px whatever the mass (scale shown in text)
        for (let k = 0; k < 3; k++) { G.save(); G.translate(cx, cy); G.scale(1, 0.28); G.rotate(t * (0.5 - k * 0.12)); const gr = G.createRadialGradient(0, 0, R * 1.6, 0, 0, R * (3.6 + k)); gr.addColorStop(0, 'rgba(255,190,90,.0)'); gr.addColorStop(0.15, `rgba(255,170,70,${0.55 - k * 0.15})`); gr.addColorStop(1, 'rgba(255,90,40,0)'); G.fillStyle = gr; G.beginPath(); G.arc(0, 0, R * (3.6 + k), 0, 7); G.fill(); G.restore(); }
        G.strokeStyle = 'rgba(255,255,255,.35)'; G.setLineDash([3, 4]); G.beginPath(); G.arc(cx, cy, R * 1.5, 0, 7); G.stroke(); G.setLineDash([]); G.fillStyle = '#000'; G.beginPath(); G.arc(cx, cy, R, 0, 7); G.fill(); G.strokeStyle = 'rgba(255,200,120,.8)'; G.lineWidth = 1.5; G.stroke();
        K.text(G, 'event horizon', cx, cy + R + 16, { a: 'center', c: 'rgba(255,255,255,.75)', s: 11 }); K.text(G, 'photon sphere 1.5 r_s', cx, cy - R * 1.5 - 8, { a: 'center', c: 'rgba(255,255,255,.55)', s: 11 });
        // light rays from the left, impact parameter b (in r_s): exact Schwarzschild photon orbits, u'' = −u + 1.5u² (r_s = 1)
        [-6, -4, -3, -2.7, -2.5, -1.6, 1.6, 2.5, 2.7, 3, 4, 6].forEach(b => { const sgn = Math.sign(b), B = Math.abs(b); let u = 1 / 40, du = Math.sqrt(Math.max(0, 1 / (B * B) - u * u * (1 - u))), ph = Math.asin(Math.min(1, B / 40)); const capt = B < 2.598;
          G.strokeStyle = capt ? 'rgba(255,120,120,.9)' : 'rgba(140,200,255,.85)'; G.lineWidth = 1.6; G.beginPath(); let first = true;
          for (let s = 0; s < 4000; s++) { const r = 1 / u, x = cx - r * Math.cos(ph) * R, y = cy - sgn * r * Math.sin(ph) * R; if (x > -20 && x < 820 && y > -20 && y < 440) { if (first) { G.moveTo(x, y); first = false; } else G.lineTo(x, y); }
            const h = 0.004; const a1 = -u + 1.5 * u * u; du += a1 * h; u += du * h; ph += h; if (u >= 1) break; if (u <= 1 / 60 && du < 0) break; } G.stroke(); });
        // probe
        const pr = sp.v, px = cx + pr * R * Math.cos(t * 0.3), py = cy - pr * R * 0.28 * Math.sin(t * 0.3) - 0; G.fillStyle = '#7cf'; G.beginPath(); G.arc(Math.min(px, 790), py, 5, 0, 7); G.fill();
        const Ms = Math.pow(10, sm.v), rs = 2.953 * Ms, vesc = Math.sqrt(1 / pr);
        G.fillStyle = 'rgba(255,255,255,.08)'; G.fillRect(560, 20, 220, 150); K.text(G, `Mass: ${Ms >= 1e6 ? fmt(Ms / 1e6, 2) + ' million' : fmt(Ms, Ms < 10 ? 2 : 0)} M☉`, 572, 46, { c: '#fff', w: 700 }); K.text(G, `r_s = ${rs >= 1e6 ? fmt(rs / 1e6, 2) + ' million km' : rs >= 1000 ? fmt(rs / 1000, 1) + ' thousand km' : fmt(rs, 1) + ' km'}`, 572, 72, { c: '#ffcf7a', w: 700 });
        K.text(G, `Probe at ${fmt(pr, 1)} r_s`, 572, 104, { c: '#9cf' }); K.text(G, `escape speed ${fmt(vesc * 100, 1)}% of c`, 572, 128, { c: '#9cf', w: 700 }); K.text(G, `(${fmt(vesc * 299792, 0)} km/s)`, 572, 150, { c: 'rgba(255,255,255,.6)', s: 12 });
        read.innerHTML = IL(`**${Ms >= 1e6 ? fmt(Ms / 1e6, 2) + ' million' : fmt(Ms, Ms < 10 ? 2 : 0)} solar masses** → Schwarzschild radius **${rs >= 1e3 ? fmt(rs, 0) : fmt(rs, 2)} km**. At ${fmt(pr, 1)} r_s the escape speed is **${fmt(vesc * 100, 1)}%** of the speed of light. Blue rays escape (bent); red rays pass within 2.6 r_s (3√3⁄2) and fall in. Paths are exact Schwarzschild light orbits, drawn to scale relative to r_s.`);
      }).add(sm, sp);
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); sm.set(0, true); sp.set(6, true); M.play(); },
        observe() { const Ms = Math.pow(10, ctl.val.lm); return { text: `At ${Ms >= 1e6 ? fmt(Ms / 1e6, 2) + ' million' : fmt(Ms, 2)} M☉ the horizon is **${fmt(2.953 * Ms, 2)} km** across in radius; ten times the mass gives **${fmt(29.53 * Ms, 2)} km** — exactly ten times bigger.`, predOk: p => p === 1 }; } };
    }
  };
})();
