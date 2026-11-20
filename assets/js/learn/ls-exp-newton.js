/* ERLY Learning Studio — the Newton's laws lab (v23). Loaded with the other experiences.

   A crate on a track, with real forces:
     weight W = m·g (g = 9.8 m/s²), normal force N = W, applied force F (you choose, or push with the arrow keys),
     friction: static up to μs·N while the crate is still (it exactly balances F), kinetic μk·N against the motion once it
     slides. Net force F_net = F + f;  a = F_net / m;  integrated each frame (semi-implicit Euler, 1 ms sub-steps).
   Collisions: two carts on a frictionless track; momentum is conserved; the coefficient of restitution e decides how
   bouncy the collision is (e = 1 elastic, e = 0 the carts stick). Final velocities:
     v1' = (m1·v1 + m2·v2 + m2·e·(v2 − v1)) / (m1 + m2),   v2' = (m1·v1 + m2·v2 + m1·e·(v1 − v2)) / (m1 + m2).
   Simplified: one dimension, a rigid crate, constant friction coefficients (typical values; real surfaces vary), no air
   resistance, no rolling. Every number on screen comes from this model. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS;
  const G = 9.8;
  const SURF = { frictionless: { en: 'Frictionless', ar: 'بلا احتكاك', s: 0, k: 0, col: ['#1b2a4a', '#24385f'] }, ice: { en: 'Ice', ar: 'جليد', s: 0.1, k: 0.03, col: ['#2a4e6e', '#6aa6c9'] }, wood: { en: 'Wood', ar: 'خشب', s: 0.5, k: 0.3, col: ['#4a3220', '#7a5434'] }, rubber: { en: 'Rubber mat', ar: 'مطاط', s: 1.0, k: 0.8, col: ['#1d1d22', '#34343c'] } };
  const MISSIONS = [
    ['inertia', 'Push & glide', 'ادفع وانزلق', 'First law: give the crate a 1-second push on frictionless ice, then let go. What does it do with no force on it?'],
    ['fma', 'F = ma', 'ق = ك × ت', 'Second law: run the crate with different forces and masses. Each run is logged — look for the pattern.'],
    ['friction', 'Friction', 'الاحتكاك', 'On wood, raise the force slowly. Find the smallest push that gets the crate moving.'],
    ['collide', 'Collisions', 'التصادم', 'Third law and momentum: two carts meet. Change the masses, speeds and bounciness.']
  ];
  const fmt = (v, d) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(d == null ? 2 : d).replace('-', '−');

  D['newton-lab'] = {
    wide: true,
    intro: 'Newton’s three laws describe how forces change motion. In this lab the forces are real numbers in a real model: you push, the friction pushes back, and the crate does exactly what the sum of the forces says.\n\n**Missions:** push & glide (first law), F = ma (second law), friction, and collisions (third law and momentum).',
    predict: { q: 'A crate slides on **frictionless** ice after a short push. Now **no force** acts on it. What happens?', options: ['It slows down and stops', 'It keeps moving at the same speed in the same direction', 'It speeds up', 'It stops immediately'] },
    preset: true,
    explore: 'Choose a mission above the track. **Push & glide**: press *Push for 1 s* and watch the speed afterwards. **F = ma**: try 20 N on 2 kg, then on 8 kg. **Friction**: on wood, raise the force until it moves. **Collisions**: make the carts stick (e = 0), then bounce (e = 1), and compare the total momentum.',
    explain: '**First law:** with no resultant force, velocity does not change — the crate glides on at constant speed (the evenly spaced dots). Things only *seem* to stop by themselves because of friction.\n\n**Second law:** the resultant force decides the acceleration, **a = F_net ÷ m**: double the force, double the acceleration; double the mass, half the acceleration.\n\n**Friction:** static friction matches your push up to a limit (μs·m·g); beyond it the crate slides and the smaller kinetic friction acts.\n\n**Third law and momentum:** in a collision each cart pushes the other with an equal and opposite force for the same time, so the total momentum before and after is the same.',
    apply: ['n-num', 'n-tf', 'n-mcq'],
    summary: ['First law: no resultant force → constant velocity (or staying still).', 'Second law: a = F_net ÷ m.', 'Friction opposes sliding; static friction can hold up to μs·m·g.', 'Third law: forces come in equal and opposite pairs; total momentum is conserved in a collision.'],
    connect: [{ label: 'Motion graphs lab', href: '#/exp/motion-graphs' }],
    build(host, c) {
      let mission = 'inertia';
      const S = { x: 2, v: 0, t: 0, F: 0, m: 4, surf: 'frictionless', hold: 0, holdT: 0, dots: [], hist: [], slow: false, runs: [], startedMove: null, pushDone: false, glideV: null };
      const K = { m1: 2, m2: 4, v1: 3, v2: -1, e: 1, x1: 3, x2: 13, u1: 3, u2: -1, hit: false, flash: 0, before: null, after: null, t: 0 };
      host.innerHTML = `<div class="nl">
        <div class="nl__missions" role="tablist" aria-label="${T('Missions', 'المهام')}">${MISSIONS.map(([k, en, ar]) => `<button type="button" role="tab" data-mis="${k}" aria-selected="${k === mission}">${T(en, ar)}</button>`).join('')}</div>
        <p class="nl__brief" aria-live="polite"></p>
        <div class="nl__stage"><canvas class="nl__cv" tabindex="0" aria-label="${T('Newton lab track. Arrow keys push the crate; space runs or pauses; R resets.', 'مضمار المختبر')}"></canvas></div>
        <p class="nl__read" aria-live="off"></p>
        <div class="nl__ctl"></div>
        <div class="nl__log" aria-live="polite"></div></div>`;
      const cv = c.canvas(host.querySelector('.nl__stage'), 900, 400), g = cv.getContext('2d');
      const ctl = host.querySelector('.nl__ctl');
      function controls() {
        if (mission === 'collide') {
          ctl.innerHTML = `<div class="nl__grid">${c.slider('m1', T('Cart A mass', 'كتلة أ'), 1, 10, 0.5, K.m1, ' kg')}${c.slider('v1', T('Cart A velocity', 'سرعة أ'), -4, 6, 0.5, K.v1, ' m/s')}${c.slider('m2', T('Cart B mass', 'كتلة ب'), 1, 10, 0.5, K.m2, ' kg')}${c.slider('v2', T('Cart B velocity', 'سرعة ب'), -6, 4, 0.5, K.v2, ' m/s')}${c.slider('e', T('Bounciness e (0 = stick, 1 = elastic)', 'المرونة'), 0, 1, 0.05, K.e, '')}</div>
            <p class="ls-row"><button type="button" class="ls-btn ls-btn--accent ls-btn--sm" data-nl="go">${T('Run the collision', 'شغّل التصادم')}</button><label class="ls-chk"><input type="checkbox" data-nl="slow" ${S.slow ? 'checked' : ''}> ${T('Slow motion', 'حركة بطيئة')}</label></p>`;
          return;
        }
        ctl.innerHTML = `<div class="nl__grid">${c.slider('F', T('Applied force F', 'القوة المؤثرة'), -50, 50, 1, S.F, ' N')}${c.slider('m', T('Mass m', 'الكتلة'), 1, 20, 0.5, S.m, ' kg')}</div>
          <div class="nl__surf" role="radiogroup" aria-label="${T('Surface', 'السطح')}">${Object.entries(SURF).map(([k, s]) => `<button type="button" role="radio" class="ls-chip" data-surf="${k}" aria-checked="${S.surf === k}">${T(s.en, s.ar)} <small>μs ${s.s} · μk ${s.k}</small></button>`).join('')}</div>
          <p class="ls-row"><button type="button" class="ls-btn ls-btn--accent ls-btn--sm" data-nl="push1">${T('Push for 1 s', 'ادفع لثانية')}</button><button type="button" class="ls-btn ls-btn--sm" data-nl="run">${T('Apply F continuously', 'طبّق القوة باستمرار')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-nl="stopF">${T('Let go (F = 0)', 'اترك (ق = 0)')}</button><label class="ls-chk"><input type="checkbox" data-nl="slow" ${S.slow ? 'checked' : ''}> ${T('Slow motion', 'حركة بطيئة')}</label></p>
          <p class="nl__muted">${T('Typical friction coefficients; real surfaces vary. Keyboard: ← → push while held, space runs/pauses, R resets.', 'معاملات احتكاك نموذجية.')}</p>`;
      }
      function setMission(k) {
        mission = k; host.querySelectorAll('[data-mis]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mis === k)));
        host.querySelector('.nl__brief').textContent = T(...[MISSIONS.find(m => m[0] === k)[3], '']);
        if (k === 'inertia') Object.assign(S, { surf: 'frictionless', F: 0, m: 4 });
        if (k === 'fma') Object.assign(S, { surf: 'frictionless', F: 20, m: 2 });
        if (k === 'friction') Object.assign(S, { surf: 'wood', F: 0, m: 5 });
        reset(); controls(); log(); c.onChange();
      }
      function reset() { Object.assign(S, { x: 2, v: 0, t: 0, hold: 0, holdT: 0, dots: [], hist: [], startedMove: null, pushDone: false, glideV: null, cont: false }); Object.assign(K, { x1: 3, x2: 13, u1: K.v1, u2: K.v2, hit: false, flash: 0, before: null, after: null, t: 0 }); L.stop(); draw(); }
      // ----- physics -----
      const forces = () => {
        const s = SURF[S.surf], N = S.m * G, Fapp = S.hold ? S.hold : S.cont ? S.F : 0;
        let f;
        if (Math.abs(S.v) < 1e-4) f = Math.abs(Fapp) <= s.s * N ? -Fapp : -Math.sign(Fapp) * s.k * N;
        else f = -Math.sign(S.v) * s.k * N;
        return { W: N, N, F: Fapp, f, net: Fapp + f, a: (Fapp + f) / S.m, static: Math.abs(S.v) < 1e-4 && Math.abs(Fapp) <= s.s * N && Fapp !== 0 };
      };
      function stepCrate(dt) {
        for (let k = 0; k < Math.ceil(dt / 0.001); k++) {
          const h = Math.min(0.001, dt - k * 0.001); if (h <= 0) break;
          const fr = forces(); let v2 = S.v + fr.a * h;
          if (S.v !== 0 && Math.sign(v2) !== Math.sign(S.v) && Math.abs(fr.F) <= SURF[S.surf].s * S.m * G) v2 = 0; // friction stops it, never reverses it
          if (Math.abs(v2) < 1e-4 && Math.abs(fr.F) <= SURF[S.surf].s * S.m * G) v2 = 0;
          S.v = v2; S.x += S.v * h; S.t += h;
          if (S.holdT > 0) { S.holdT -= h; if (S.holdT <= 0) { S.hold = 0; S.pushDone = true; S.glideV = S.v; S.glideAt = S.t; } }
          if (S.startedMove == null && Math.abs(S.v) > 1e-3) S.startedMove = fr.F;
        }
        if (!S.dots.length || S.t - S.dots[S.dots.length - 1].t >= 0.5) S.dots.push({ t: S.t, x: S.x });
        S.hist.push([S.t, S.v]); if (S.hist.length > 600) S.hist.shift();
        if (S.x > 400) S.x = 400;
      }
      function stepCarts(dt) {
        for (let k = 0; k < Math.ceil(dt / 0.001); k++) {
          const h = Math.min(0.001, dt - k * 0.001); if (h <= 0) break;
          K.x1 += K.u1 * h; K.x2 += K.u2 * h; K.t += h;
          const gap = (K.x2 - 0.5 * w2()) - (K.x1 + 0.5 * w1());
          if (!K.hit && gap <= 0 && K.u1 - K.u2 > 0) {
            const p = K.m1 * K.u1 + K.m2 * K.u2;
            K.before = { p, ke: 0.5 * K.m1 * K.u1 ** 2 + 0.5 * K.m2 * K.u2 ** 2, u1: K.u1, u2: K.u2 };
            const a = (p + K.m2 * K.e * (K.u2 - K.u1)) / (K.m1 + K.m2), b = (p + K.m1 * K.e * (K.u1 - K.u2)) / (K.m1 + K.m2);
            K.u1 = a; K.u2 = b; K.hit = true; K.flash = 0.35;
            K.after = { p: K.m1 * a + K.m2 * b, ke: 0.5 * K.m1 * a * a + 0.5 * K.m2 * b * b, u1: a, u2: b, J: K.m2 * (b - K.before.u2) };
            c.onChange(); log();
          }
        }
        K.flash = Math.max(0, K.flash - dt);
      }
      const w1 = () => 0.6 + K.m1 * 0.08, w2 = () => 0.6 + K.m2 * 0.08;
      // ----- drawing -----
      const css = v => c.css(v) || '#999';
      const fs = n => Math.max(n, 11 / Math.max(0.2, (cv.clientWidth || 900) / 900)) * cv._s;
      function arrow(x, y, dx, dy, col, label) {
        if (Math.abs(dx) + Math.abs(dy) < 2) return; const k = cv._s;
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(x * k, y * k); g.lineTo((x + dx) * k, (y + dy) * k); g.stroke();
        const a = Math.atan2(dy, dx), hl = 9; g.beginPath(); g.moveTo((x + dx) * k, (y + dy) * k); g.lineTo((x + dx - hl * Math.cos(a - 0.45)) * k, (y + dy - hl * Math.sin(a - 0.45)) * k); g.lineTo((x + dx - hl * Math.cos(a + 0.45)) * k, (y + dy - hl * Math.sin(a + 0.45)) * k); g.fill();
        if (label) { g.font = `${fs(11)}px system-ui, sans-serif`; g.fillText(label, (x + dx + (dx >= 0 ? 6 : -6 - g.measureText(label).width / k)) * k, (y + dy + (dy > 0 ? 14 : dy < 0 ? -6 : 4)) * k); }
      }
      function backdrop(W, H, k) {
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1024'); bg.addColorStop(1, '#141b38'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(220,228,255,.5)'; for (let i = 0; i < 40; i++) { const sx = (i * 137.5) % 900, sy = (i * 71.3) % 220; g.fillRect(sx * k, sy * k, 1.2 * k, 1.2 * k); }
      }
      function draw() {
        const W = cv.width, H = cv.height, k = cv._s; g.clearRect(0, 0, W, H); backdrop(W, H, k);
        if (mission === 'collide') return drawCarts(k);
        const PX = 42, groundY = 300, camX = Math.max(0, S.x * PX - 300), sx = x => x * PX - camX;
        const s = SURF[S.surf];
        // the surface and its distance marks (the marks scroll, so steady motion is visible)
        const gr = g.createLinearGradient(0, groundY * k, 0, H); gr.addColorStop(0, s.col[1]); gr.addColorStop(1, s.col[0]); g.fillStyle = gr; g.fillRect(0, groundY * k, W, H - groundY * k);
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.fillStyle = 'rgba(235,240,255,.7)'; g.font = `${fs(10)}px ui-monospace, monospace`;
        for (let m = Math.floor(camX / PX); m <= (camX + 900) / PX; m++) { const X = sx(m); g.beginPath(); g.moveTo(X * k, groundY * k); g.lineTo(X * k, (groundY + (m % 5 ? 6 : 14)) * k); g.stroke(); if (m % 5 === 0) g.fillText(m + ' m', (X + 3) * k, (groundY + 26) * k); }
        // ticker tape: one dot every 0.5 s — spacing shows the motion
        g.fillStyle = '#ffd36b'; S.dots.forEach(d => { const X = sx(d.x); if (X > -10 && X < 910) { g.beginPath(); g.arc(X * k, (groundY + 40) * k, 3 * k, 0, 7); g.fill(); } });
        // the crate
        const side = 46 + S.m * 3, cx = sx(S.x), top = groundY - side;
        const cg = g.createLinearGradient(0, top * k, 0, groundY * k); cg.addColorStop(0, '#c99a5e'); cg.addColorStop(1, '#8a5f33'); g.fillStyle = cg; g.fillRect((cx - side / 2) * k, top * k, side * k, side * k);
        g.strokeStyle = 'rgba(40,24,10,.6)'; g.lineWidth = 2 * k; g.strokeRect((cx - side / 2) * k, top * k, side * k, side * k); g.beginPath(); g.moveTo((cx - side / 2) * k, top * k); g.lineTo((cx + side / 2) * k, groundY * k); g.moveTo((cx + side / 2) * k, top * k); g.lineTo((cx - side / 2) * k, groundY * k); g.stroke();
        g.fillStyle = '#fff'; g.font = `bold ${fs(12)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText(fmt(S.m, 1) + ' kg', cx * k, (top - 8) * k); g.textAlign = 'start';
        // forces (scale 2.2 px per newton, capped)
        const fr = forces(), sc = n => Math.max(-170, Math.min(170, n * 2.2)), my = top + side / 2;
        arrow(cx, my, sc(fr.F), 0, '#6ea8ff', fr.F ? `F ${fmt(fr.F, 0)} N` : '');
        arrow(cx, groundY - 6, sc(fr.f), 0, '#ff7a59', fr.f ? `f ${fmt(fr.f, 1)} N${fr.static ? ' (static)' : ''}` : '');
        arrow(cx, groundY, 0, Math.min(90, fr.W * 0.5), 'rgba(220,220,235,.75)', `W ${fmt(fr.W, 0)} N`);
        arrow(cx, top, 0, -Math.min(90, fr.N * 0.5), 'rgba(220,220,235,.75)', `N ${fmt(fr.N, 0)} N`);
        if (fr.net) arrow(cx, top - 26, sc(fr.net), 0, '#7ef0b0', `F net ${fmt(fr.net, 1)} N`);
        // velocity–time graph, top right
        const gx = 640, gy = 22, gw = 240, gh = 110; g.fillStyle = 'rgba(5,8,20,.55)'; g.fillRect(gx * k, gy * k, gw * k, gh * k); g.strokeStyle = 'rgba(200,210,255,.35)'; g.strokeRect(gx * k, gy * k, gw * k, gh * k);
        g.fillStyle = 'rgba(220,228,255,.8)'; g.font = `${fs(10)}px system-ui, sans-serif`; g.fillText('v (m/s) against t (s)', (gx + 6) * k, (gy + 13) * k);
        if (S.hist.length > 1) { const t0 = Math.max(0, S.t - 10), vmax = Math.max(1, ...S.hist.map(h => Math.abs(h[1]))); g.strokeStyle = '#7ef0b0'; g.lineWidth = 2 * k; g.beginPath(); S.hist.filter(h => h[0] >= t0).forEach((h, i) => { const X = gx + 6 + (h[0] - t0) / 10 * (gw - 12), Y = gy + gh / 2 - h[1] / vmax * (gh / 2 - 12); i ? g.lineTo(X * k, Y * k) : g.moveTo(X * k, Y * k); }); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.moveTo((gx + 6) * k, (gy + gh / 2) * k); g.lineTo((gx + gw - 6) * k, (gy + gh / 2) * k); g.stroke(); }
        host.querySelector('.nl__read').textContent = `t = ${fmt(S.t, 1)} s · x = ${fmt(S.x - 2, 2)} m · v = ${fmt(S.v)} m/s · a = ${fmt(fr.a)} m/s² · F = ${fmt(fr.F, 0)} N · friction = ${fmt(fr.f, 1)} N · F net = ${fmt(fr.net, 1)} N`;
      }
      function drawCarts(k) {
        const PX = 52, groundY = 300, ox = 30, sx = x => ox + x * PX;
        g.fillStyle = '#1b2a4a'; g.fillRect(0, groundY * k, cv.width, cv.height); g.strokeStyle = 'rgba(160,190,255,.4)'; g.beginPath(); g.moveTo(0, groundY * k); g.lineTo(cv.width, groundY * k); g.stroke();
        const cart = (x, m, w, col, label) => { const X = sx(x), wpx = w * PX, hpx = 34 + m * 3; g.fillStyle = col; g.fillRect((X - wpx / 2) * k, (groundY - hpx - 10) * k, wpx * k, hpx * k); g.fillStyle = '#0c1020'; [X - wpx / 3, X + wpx / 3].forEach(wx => { g.beginPath(); g.arc(wx * k, (groundY - 6) * k, 7 * k, 0, 7); g.fill(); }); g.fillStyle = '#fff'; g.font = `bold ${fs(12)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText(`${label} · ${fmt(m, 1)} kg`, X * k, (groundY - hpx - 18) * k); g.textAlign = 'start'; return { X, top: groundY - hpx - 10, hpx }; };
        const A = cart(K.x1, K.m1, w1(), '#5b8cff', 'A'), B = cart(K.x2, K.m2, w2(), '#ff8a5b', 'B');
        arrow(A.X, A.top - 30, K.u1 * 14, 0, '#bcd2ff', `${fmt(K.u1, 2)} m/s`); arrow(B.X, B.top - 30, K.u2 * 14, 0, '#ffd2bc', `${fmt(K.u2, 2)} m/s`);
        if (K.flash > 0 && K.after) { const mid = (A.X + B.X) / 2, y = groundY - 30, len = 30 + Math.min(60, Math.abs(K.after.J) * 4); arrow(mid - 4, y, -len, 0, '#ffe36b', 'force on A'); arrow(mid + 4, y, len, 0, '#ffe36b', 'force on B'); }
        const p = K.m1 * K.u1 + K.m2 * K.u2, ke = 0.5 * K.m1 * K.u1 ** 2 + 0.5 * K.m2 * K.u2 ** 2;
        host.querySelector('.nl__read').textContent = `${T('Total momentum', 'الزخم الكلي')} = ${fmt(p)} kg·m/s · ${T('kinetic energy', 'الطاقة الحركية')} = ${fmt(ke)} J · A: ${fmt(K.u1)} m/s · B: ${fmt(K.u2)} m/s`;
      }
      // ----- the log (mission evidence) -----
      function log() {
        const el = host.querySelector('.nl__log');
        if (mission === 'fma') el.innerHTML = S.runs.length ? `<table class="nl__tab"><caption>${T('Your runs (frictionless)', 'تجاربك')}</caption><thead><tr><th>F (N)</th><th>m (kg)</th><th>${T('measured a', 'ت المقاسة')} (m/s²)</th><th>F ÷ m</th></tr></thead><tbody>${S.runs.map(r => `<tr><td>${fmt(r.F, 0)}</td><td>${fmt(r.m, 1)}</td><td>${fmt(r.a)}</td><td>${fmt(r.F / r.m)}</td></tr>`).join('')}</tbody></table>${S.runs.length >= 3 ? `<p class="nl__ok">${T('In every run the measured acceleration equals F ÷ m.', 'في كل تجربة التسارع = ق ÷ ك.')}</p>` : `<p class="nl__muted">${3 - S.runs.length} ${T('more run(s) with a different force or mass.', 'تجارب أخرى بقوة أو كتلة مختلفة.')}</p>`}` : `<p class="nl__muted">${T('Press “Apply F continuously”. After 2 s the acceleration is measured and logged.', 'اضغط “طبّق القوة باستمرار”.')}</p>`;
        else if (mission === 'friction') { const lim = SURF[S.surf].s * S.m * G; el.innerHTML = S.startedMove != null ? `<p class="nl__ok">${T('It started to slide at', 'بدأ الانزلاق عند')} <b>${fmt(Math.abs(S.startedMove), 0)} N</b>. ${T('The model’s limit for static friction is μs·m·g', 'حد الاحتكاك السكوني')} = ${SURF[S.surf].s} × ${fmt(S.m, 1)} × 9.8 = <b>${fmt(lim, 1)} N</b>. ${T('Once sliding, kinetic friction is smaller', 'بعد الانزلاق يصبح الاحتكاك أصغر')}: ${fmt(SURF[S.surf].k * S.m * G, 1)} N.</p>` : `<p class="nl__muted">${T('Press “Apply F continuously”, then raise F a little at a time. Watch the friction arrow match your push.', 'ارفع القوة تدريجياً.')}</p>`; }
        else if (mission === 'collide') el.innerHTML = K.after ? `<table class="nl__tab"><thead><tr><th></th><th>${T('before', 'قبل')}</th><th>${T('after', 'بعد')}</th></tr></thead><tbody><tr><td>${T('Total momentum', 'الزخم الكلي')} (kg·m/s)</td><td>${fmt(K.before.p)}</td><td>${fmt(K.after.p)}</td></tr><tr><td>${T('Kinetic energy', 'الطاقة الحركية')} (J)</td><td>${fmt(K.before.ke)}</td><td>${fmt(K.after.ke)}</td></tr><tr><td>A (m/s)</td><td>${fmt(K.before.u1)}</td><td>${fmt(K.after.u1)}</td></tr><tr><td>B (m/s)</td><td>${fmt(K.before.u2)}</td><td>${fmt(K.after.u2)}</td></tr></tbody></table><p class="nl__ok">${T('Momentum is the same before and after.', 'الزخم نفسه قبل وبعد.')} ${K.e < 1 ? T('Some kinetic energy became heat and sound (e < 1).', 'تحولت بعض الطاقة إلى حرارة وصوت.') : T('With e = 1 kinetic energy is kept too.', 'مع e = 1 تُحفظ الطاقة الحركية أيضاً.')}</p>` : `<p class="nl__muted">${T('Run the collision to see momentum before and after.', 'شغّل التصادم.')}</p>`;
        else el.innerHTML = S.pushDone ? `<p class="${Math.abs(S.v - S.glideV) < 0.01 * Math.max(0.1, Math.abs(S.glideV)) ? 'nl__ok' : 'nl__muted'}">${T('After the push ended (at', 'بعد انتهاء الدفع (عند')} ${fmt(S.glideAt, 1)} s) ${T('the speed was', 'كانت السرعة')} ${fmt(S.glideV)} m/s; ${T('now it is', 'الآن')} ${fmt(S.v)} m/s.${SURF[S.surf].k === 0 ? ' ' + T('No resultant force, no change in velocity.', 'لا قوة محصلة، لا تغير في السرعة.') : ' ' + T('Friction is the resultant force here, so it slows down.', 'الاحتكاك هو القوة المحصلة هنا.')}</p>` : `<p class="nl__muted">${T('Press “Push for 1 s”.', 'اضغط “ادفع لثانية”.')}</p>`;
      }
      // ----- the loop -----
      let measureAt = null;
      const L = c.looper(host, dt => {
        const h = dt * (S.slow ? 0.25 : 1);
        if (mission === 'collide') { stepCarts(h); if (K.x1 < -1 || K.x2 > 18 || K.t > 12) L.stop(); }
        else { stepCrate(h); if (measureAt != null && S.t >= measureAt) { const fr = forces(); S.runs.push({ F: fr.F, m: S.m, a: fr.a }); measureAt = null; LS.engine.event('experience-success', { id: 'newton-lab', objs: ['phys-newton:1'], label: 'Measured F = ma' }); log(); c.onChange(); }
          if (S.pushDone && mission === 'inertia' && S.t - S.glideAt > 3 && !S.inertiaLogged) { S.inertiaLogged = true; log(); c.onChange(); LS.engine.event('experience-success', { id: 'newton-lab', objs: ['phys-newton:2'], label: 'First law observed' }); }
          if (mission === 'friction' && S.startedMove != null && !S.frLogged) { S.frLogged = true; log(); c.onChange(); LS.engine.event('experience-success', { id: 'newton-lab', objs: ['phys-newton:0'], label: 'Static friction limit found' }); }
          if (Math.abs(S.v) < 1e-6 && !S.hold && !S.cont && S.t > 0.5) { /* at rest with nothing acting: keep drawing but the clock can rest */ }
        }
        draw(); if (S.pushDone && mission === 'inertia' && (S.t - S.glideAt) % 1 < h) log();
      });
      const sync = () => { const b = document.querySelector('[data-x="pause"]'); if (b) b.textContent = L.running() ? T('Pause', 'إيقاف') : T('Play', 'تشغيل'); };
      const run = () => { if (c.reduced) { const steps = mission === 'collide' ? 600 : 300; for (let i = 0; i < steps; i++) { if (mission === 'collide') stepCarts(0.02); else stepCrate(0.02); } if (measureAt != null && S.t >= measureAt) { const fr = forces(); S.runs.push({ F: fr.F, m: S.m, a: fr.a }); measureAt = null; } draw(); log(); c.onChange(); return; } L.start(); sync(); };
      host.addEventListener('click', e => {
        const mb = e.target.closest('[data-mis]'); if (mb) { setMission(mb.dataset.mis); return; }
        const sf = e.target.closest('[data-surf]'); if (sf) { S.surf = sf.dataset.surf; host.querySelectorAll('[data-surf]').forEach(b => b.setAttribute('aria-checked', String(b === sf))); draw(); log(); return; }
        const b = e.target.closest('[data-nl]'); if (!b) return; const a = b.dataset.nl;
        if (a === 'push1') { reset(); S.hold = S.F || 20; if (!S.F) S.F = 20; S.holdT = 1; run(); }
        if (a === 'run') { reset(); S.cont = true; S.hold = 0; if (mission === 'fma') measureAt = 2; run(); }
        if (a === 'stopF') { S.cont = false; S.hold = 0; S.holdT = 0; }
        if (a === 'go') { reset(); run(); }
      });
      host.addEventListener('input', e => {
        const sl = e.target.closest('[data-s]'); if (sl) { const k = sl.dataset.s, v = +sl.value; if (mission === 'collide') K[k] = v; else S[k] = v; host.querySelector(`[data-o="${k}"]`).textContent = sl.value + ({ F: ' N', m: ' kg', m1: ' kg', m2: ' kg', v1: ' m/s', v2: ' m/s', e: '' })[k]; if (mission === 'collide') reset(); draw(); return; }
        if (e.target.matches('[data-nl="slow"]')) S.slow = e.target.checked;
      });
      cv.addEventListener('keydown', e => { if (mission === 'collide') return; if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); S.hold = (e.key === 'ArrowRight' ? 1 : -1) * Math.max(10, Math.abs(S.F) || 20); S.holdT = 0; if (!L.running()) run(); } if (e.key === ' ') { e.preventDefault(); L.running() ? L.stop() : run(); sync(); } if (e.key === 'r' || e.key === 'R') reset(); });
      cv.addEventListener('keyup', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { S.hold = 0; } });
      setMission('inertia');
      return {
        play() { run(); }, pause() { L.stop(); }, running: () => L.running(),
        reset() { reset(); log(); }, preset() { setMission('inertia'); },
        observe() {
          if (mission === 'collide') return { text: K.after ? `Cart A (**${fmt(K.m1, 1)} kg**) and cart B (**${fmt(K.m2, 1)} kg**) collided with e = **${fmt(K.e, 2)}**. Total momentum before **${fmt(K.before.p)}** and after **${fmt(K.after.p)} kg·m/s** — the same. Kinetic energy ${fmt(K.before.ke)} J → ${fmt(K.after.ke)} J.` : 'Run the collision first.', predOk: null };
          if (mission === 'fma') return { text: S.runs.length ? `Runs logged: ${S.runs.map(r => `F = ${fmt(r.F, 0)} N, m = ${fmt(r.m, 1)} kg → a = **${fmt(r.a)} m/s²**`).join('; ')}. Each time a = F ÷ m.` : 'Apply a force continuously to log a run.', predOk: null };
          if (mission === 'friction') return { text: S.startedMove != null ? `On ${SURF[S.surf].en.toLowerCase()} the ${fmt(S.m, 1)} kg crate began to slide at **${fmt(Math.abs(S.startedMove), 0)} N**; the model’s static limit is μs·m·g = **${fmt(SURF[S.surf].s * S.m * G, 1)} N**.` : 'Raise the force until the crate starts to move.', predOk: null };
          return { text: S.pushDone ? `After a 1-second push on ${SURF[S.surf].en.toLowerCase()}, the crate was moving at **${fmt(S.glideV)} m/s**. ${fmt(S.t - S.glideAt, 1)} s later it is moving at **${fmt(S.v)} m/s**${SURF[S.surf].k === 0 ? ' — unchanged, because no resultant force acts (the yellow dots are evenly spaced).' : ' — friction is slowing it.'}` : 'Press “Push for 1 s” and watch what happens after the push.', predOk: S.pushDone && SURF[S.surf].k === 0 && S.t - S.glideAt > 1 ? p => p === 1 : null };
        },
        destroy() { L.destroy(); cv._destroy(); }
      };
    }
  };
})();
