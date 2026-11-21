/* ERLY Learning Studio — Newton's laws lab (v26 rebuild).

   One mechanics engine, four investigations:
     1 · Inertia (first law)   2 · F = ma (second law)   3 · Friction   4 · Interaction (third law, momentum)

   The physics (every number on screen comes from here):
     Crate on a level track. Weight W = m·g (g = 9.81 m/s²), normal force N = W (level track, no vertical acceleration).
     Applied force F (you set it with the slider, by dragging the orange arrow, or with ← →).
     Friction: while the crate is at rest, static friction matches F exactly up to μs·N; beyond that the crate slips and
     kinetic friction μk·N acts against the motion. Net force F_net = F + f, a = F_net / m.
     Integration: semi-implicit Euler in fixed 1 ms sub-steps; a velocity that would cross zero while |F| ≤ μs·N stops.
     Two carts (third law): a stiff spring-and-damper contact between the bumpers. The contact force on B is exactly
     minus the force on A at every sub-step, so total momentum is conserved to rounding. The damper is chosen from the
     coefficient of restitution e (e = 1 elastic … e = 0 the carts stay together):  ζ = −ln e / √(π² + ln²e).
   Simplified: one dimension, rigid bodies, constant friction coefficients (typical textbook values; real surfaces vary),
   no air resistance, no rolling resistance for the carts. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, IL = LS.inline, esc = LS.esc;
  const g0 = 9.81, DT = 0.001;
  const SURF = {
    frictionless: { n: 'Frictionless', s: 0, k: 0, top: '#2a3f66', bot: '#1a2742', line: 'rgba(160,200,255,.35)' },
    ice: { n: 'Ice', s: 0.1, k: 0.03, top: '#bfe3f5', bot: '#7fb6d6', line: 'rgba(255,255,255,.7)' },
    wood: { n: 'Wood', s: 0.5, k: 0.3, top: '#b98552', bot: '#7a5230', line: 'rgba(60,35,15,.35)' },
    rubber: { n: 'Rubber mat', s: 1.0, k: 0.8, top: '#3a3a40', bot: '#1f1f24', line: 'rgba(255,255,255,.08)' }
  };
  const MODES = [['inertia', '1 · Inertia'], ['fma', '2 · F = ma'], ['friction', '3 · Friction'], ['interact', '4 · Interaction']];
  const TASK = {
    inertia: 'First law. On frictionless ice, press **Push for 1 s** and watch the strobe dots after the push ends. With **no net force**, is the spacing changing?',
    fma: 'Second law. Choose a force and a mass, press **Run**, then **Save run**. Repeat with double the force, then double the mass. Compare **measured a** with **F_net / m** in the log.',
    friction: 'On **wood**, raise the force slowly from 0. Static friction matches your push exactly — until it can’t. Find the force where the crate starts to slide, then watch friction drop.',
    interact: 'Third law. Two carts collide. During contact the arrows show the **force on A by B** and the **force on B by A**. Change the masses and the bounciness — are the two forces ever different sizes?'
  };
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const f2 = (v, d = 2) => K.fmt(v, d);

  D['newton-lab'] = { wide: true,
    intro: 'A laboratory for Newton’s three laws. Push a crate along a track, change its **mass** and the **surface** beneath it, then crash two carts together. The model shows the motion, a **free-body diagram**, live numbers and graphs of velocity and acceleration — all computed from the same equations.\n\nYou can set the force with the slider, by **dragging the orange arrow**, or with the **← →** keys when the track is focused.',
    predict: { q: 'On frictionless ice you push a 4 kg crate for one second, then let go. **After you let go**, the crate…', options: ['slows down and stops', 'keeps moving at the same speed', 'keeps speeding up', 'stops immediately'] },
    preset: true,
    explore: '- **1 · Inertia:** Push for 1 s on ice. Look at the strobe dots after the push.\n- **2 · F = ma:** Save runs with F = 20 N and 40 N (m = 4 kg), then 40 N with m = 8 kg. What happens to a?\n- **3 · Friction:** On wood, raise F slowly. When does the crate start to move?\n- **4 · Interaction:** Collide a heavy cart into a light one. Compare the two contact-force arrows and the total momentum.',
    explain: '**First law:** with **zero net force** an object keeps its velocity — the strobe dots stay evenly spaced after the push. Nothing is needed to *keep* it moving, only to *change* its motion.\n\n**Second law:** **a = F_net / m**. Double the net force and the acceleration doubles; double the mass and it halves. On a rough surface the net force is the push **minus friction**.\n\n**Friction:** static friction rises to match your push, up to **μₛN**. Past that the crate slips and **kinetic friction μₖN** (smaller) takes over — which is why it is harder to start something sliding than to keep it sliding.\n\n**Third law:** during the collision the force on A by B and the force on B by A are **equal in size and opposite in direction** at every instant, whatever the masses. They act on **different** objects, so they do not cancel each other out. Because the forces are equal and act for the same time, the momentum one cart gains the other loses: **total momentum is conserved**.',
    apply: [
      q('x-nl1', 'A 5 kg crate on a frictionless floor is pushed with a net force of 20 N. Its acceleration is…', ['0.25 m/s²', '4 m/s²', '25 m/s²', '100 m/s²'], 1, 'a = F/m = 20/5 = 4 m/s².'),
      q('x-nl2', 'A 10 kg crate rests on wood (μₛ = 0.5, g = 9.81 m/s²). The smallest horizontal push that starts it sliding is about…', ['5 N', '25 N', '49 N', '98 N'], 2, 'μₛN = 0.5 × 10 × 9.81 ≈ 49 N.'),
      q('x-nl3', 'A truck hits a small car. During the collision, the force of the car on the truck is…', ['smaller than the force of the truck on the car', 'the same size as the force of the truck on the car', 'larger', 'zero'], 1, 'Newton’s third law: the pair of forces is equal and opposite, whatever the masses. The car accelerates more because its mass is smaller.'),
      q('x-nl4', 'A crate slides across ice at a steady 3 m/s with no push. The net force on it is…', ['3 N forwards', 'zero (or very nearly)', 'equal to its weight', 'it depends on its mass'], 1, 'Constant velocity means zero acceleration, so the net force is zero (first law).')
    ],
    summary: ['First law: zero net force → constant velocity (including staying at rest).', 'Second law: a = F_net / m.', 'Static friction matches the push up to μₛN; sliding friction is μₖN against the motion.', 'Third law: forces come in equal and opposite pairs on two different objects; total momentum is conserved.'],
    connect: [{ label: 'Inclined plane lab', href: '#/exp/incline' }, { label: 'Motion graphs lab', href: '#/exp/motion-graphs' }, { label: 'Lesson: Newton’s second law', href: '#/lesson/phys-newton' }],
    build(host, c) {
      host.classList.add('nl2');
      const S = K.stage(host, 960, 420, 'nl2__stage'), Gs = K.stage(host, 960, 220, 'nl2__graph');
      S.cv.tabIndex = 0; S.cv.setAttribute('role', 'img');
      S.cv.setAttribute('aria-label', T('Newton lab track. Drag the orange arrow or use the left and right arrow keys to set the force; space runs or pauses; R resets.', 'مضمار المختبر'));
      const ctl = K.controls(host, [
        { k: 'chips', id: 'mode', label: T('Investigation', 'التجربة'), opts: MODES.map(([v, l]) => [v, l]), val: 'inertia' },
        { k: 'row' }, { k: 'range', id: 'F', label: T('Applied force F', 'القوة'), min: -60, max: 60, step: 1, val: 0, unit: ' N' },
        { k: 'range', id: 'm', label: T('Mass m', 'الكتلة'), min: 1, max: 20, step: 0.5, val: 4, d: 1, unit: ' kg' },
        { k: 'range', id: 'v0', label: T('Starting velocity', 'السرعة الابتدائية'), min: -6, max: 6, step: 0.5, val: 0, d: 1, unit: ' m/s' }, { k: 'end' },
        { k: 'chips', id: 'surf', label: T('Surface', 'السطح'), opts: Object.entries(SURF).map(([k, s]) => [k, `${s.n} <small>μₛ ${s.s} · μₖ ${s.k}</small>`]), val: 'ice' },
        { k: 'row' }, { k: 'btn', id: 'run', label: T('Run ▸', 'تشغيل'), accent: true }, { k: 'btn', id: 'step', label: T('Step 0.05 s', 'خطوة') }, { k: 'btn', id: 'push', label: T('Push for 1 s', 'ادفع ثانية') }, { k: 'btn', id: 'letgo', label: T('Let go (F = 0)', 'اترك') }, { k: 'btn', id: 'save', label: T('Save run to compare', 'احفظ التجربة') }, { k: 'btn', id: 'clear', label: T('Clear saved runs', 'امسح') }, { k: 'end' },
        { k: 'html', html: '<div class="nl2__two" hidden>' },
        { k: 'row' }, { k: 'range', id: 'mA', label: T('Mass of cart A', 'كتلة أ'), min: 0.5, max: 10, step: 0.5, val: 4, d: 1, unit: ' kg' }, { k: 'range', id: 'vA', label: T('Velocity of A', 'سرعة أ'), min: -4, max: 6, step: 0.5, val: 3, d: 1, unit: ' m/s' }, { k: 'end' },
        { k: 'row' }, { k: 'range', id: 'mB', label: T('Mass of cart B', 'كتلة ب'), min: 0.5, max: 10, step: 0.5, val: 1, d: 1, unit: ' kg' }, { k: 'range', id: 'vB', label: T('Velocity of B', 'سرعة ب'), min: -6, max: 4, step: 0.5, val: 0, d: 1, unit: ' m/s' }, { k: 'end' },
        { k: 'row' }, { k: 'range', id: 'e', label: T('Bounciness e', 'معامل الارتداد'), min: 0, max: 1, step: 0.05, val: 1, d: 2 }, { k: 'chips', id: 'scene', label: T('Scene', 'المشهد'), opts: [['collide', T('Collide', 'تصادم')], ['apart', T('Push apart', 'تنافر')]], val: 'collide' }, { k: 'end' },
        { k: 'html', html: '</div>' }
      ], on);
      const task = document.createElement('p'); task.className = 'nl2__task'; host.insertBefore(task, S.wrap);
      const read = document.createElement('div'); read.className = 'kx-read nl2__read'; read.setAttribute('aria-live', 'polite'); host.appendChild(read);
      const logBox = document.createElement('div'); logBox.className = 'nl2__log'; host.appendChild(logBox);
      const two = host.querySelector('.nl2__two');

      /* ---------- state ---------- */
      let mode = 'inertia', surf = 'ice', t = 0, x = 0, v = 0, a = 0, fr = 0, F = 0, m = 4, pushT = 0, sim = false, moving = false, slipF = null;
      let hist = [], strobe = [], saved = [], runLog = [], nextDot = 0;
      let A = null, B = null, contactF = 0, peakF = 0, p0 = 0, cam = 0; // two-cart scene
      const reset1 = () => { nextDot = 0; t = 0; x = 0; v = ctl.val.v0; a = 0; fr = 0; pushT = 0; hist = []; strobe = []; slipF = null; moving = Math.abs(v) > 1e-9; cam = 0; };
      const reset2 = () => {
        t = 0; hist = []; contactF = 0; peakF = 0; cam = 0;
        const apart = ctl.val.scene === 'apart';
        A = { m: ctl.val.mA, x: apart ? -0.21 : -3, v: apart ? 0 : ctl.val.vA, w: 0.4 };
        B = { m: ctl.val.mB, x: apart ? 0.21 : 2, v: apart ? 0 : ctl.val.vB, w: 0.4 };
        A.spring = apart; p0 = A.m * A.v + B.m * B.v;
      };
      const S0 = () => SURF[surf];

      /* ---------- physics: one crate ---------- */
      function step1(dt) {
        const s = S0(), N = m * g0;
        for (let k = 0, n = Math.round(dt / DT); k < n; k++) {
          const Fa = pushT > 0 ? Math.max(F, 0) || 20 : F;
          if (pushT > 0) { pushT -= DT; if (pushT <= 0) { pushT = 0; F = 0; ctl.set('F', 0); } }
          if (!moving) {
            if (Math.abs(Fa) <= s.s * N + 1e-9) { fr = -Fa; a = 0; v = 0; }
            else { moving = true; if (slipF == null) slipF = Math.abs(Fa); fr = -Math.sign(Fa) * s.k * N; a = (Fa + fr) / m; v += a * DT; }
          } else {
            fr = Math.abs(v) > 1e-9 ? -Math.sign(v) * s.k * N : 0; a = (Fa + fr) / m;
            const nv = v + a * DT;
            if (v !== 0 && Math.sign(nv) !== Math.sign(v) && Math.abs(Fa) <= s.s * N) { v = 0; a = 0; moving = false; fr = -Fa; }
            else v = nv;
            if (s.k === 0 && Math.abs(v) < 1e-12 && Math.abs(Fa) < 1e-12) moving = false;
          }
          x += v * DT; t += DT;
          if (t >= nextDot - 1e-9) { strobe.push([x, t]); nextDot += 0.5; } // ticker tape: a dot every 0.5 s
        }
        hist.push([t, v, a, fr, pushT > 0 ? (Math.max(F, 0) || 20) : F]); if (hist.length > 1200) hist.shift();
      }
      /* ---------- physics: two carts with a contact force ---------- */
      function step2(dt) {
        const e = Math.max(1e-3, ctl.val.e), ln = Math.log(e), zeta = -ln / Math.sqrt(Math.PI * Math.PI + ln * ln), k = 4e4;
        // fine sub-steps (20 µs) while the bumpers are within 2 cm of touching: the stiff contact spring needs them to keep energy to 0.1 %
        const inner = () => (B.x - B.w / 2) - (A.x + A.w / 2) < 0.02 || A.spring;
        for (let i = 0, n = Math.round(dt / DT); i < n; i++) { const fine = inner(), sub = fine ? 50 : 1, DTs = DT / sub; for (let s2 = 0; s2 < sub; s2++) {
          const mu = A.m * B.m / (A.m + B.m), cdamp = 2 * zeta * Math.sqrt(k * mu);
          const gap = (B.x - B.w / 2) - (A.x + A.w / 2);
          let f = 0; // force on B by A (positive pushes B to +x); force on A by B is −f
          if (A.spring) { // push-apart: a compressed spring between the carts, released at t = 0
            const comp = 0.05 - gap; if (comp > 0) f = 900 * comp; else A.spring = false;
          } else if (gap < 0) { f = -k * gap - cdamp * (B.v - A.v); if (f < 0) f = 0; }
          if (ctl.val.e < 0.02 && gap < 0.002 && Math.abs(B.v - A.v) < 0.02) { const vc = (A.m * A.v + B.m * B.v) / (A.m + B.m); A.v = B.v = vc; f = 0; } // perfectly inelastic: they move together
          B.v += f / B.m * DTs; A.v += -f / A.m * DTs; A.x += A.v * DTs; B.x += B.v * DTs; t += DTs; contactF = f; peakF = Math.max(peakF, f);
        } }
        hist.push([t, A.v, B.v, contactF, -contactF]); if (hist.length > 1200) hist.shift();
      }

      /* ---------- drawing ---------- */
      const P = () => K.pal();
      const SC = 60; // pixels per metre on the track
      function drawTrack(G, ox) {
        const s = S0(), y0 = 300, Pl = P();
        const sky = G.createLinearGradient(0, 0, 0, y0); sky.addColorStop(0, Pl.bg2); sky.addColorStop(1, Pl.bg); G.fillStyle = sky; G.fillRect(0, 0, 960, y0);
        const fl = G.createLinearGradient(0, y0, 0, 420); fl.addColorStop(0, s.top); fl.addColorStop(1, s.bot); G.fillStyle = fl; G.fillRect(0, y0, 960, 120);
        G.strokeStyle = s.line; G.lineWidth = 1; // surface texture moves with the world so motion reads correctly
        const step = surf === 'wood' ? 90 : surf === 'ice' ? 140 : 45;
        for (let X = ((-ox) % step + step) % step - step; X < 960; X += step) { G.beginPath(); if (surf === 'wood') { G.moveTo(X, y0); G.lineTo(X, 420); } else if (surf === 'ice') { G.moveTo(X, y0 + 18); G.lineTo(X + 60, y0 + 6); } else { G.moveTo(X, y0 + 30); G.lineTo(X + 20, y0 + 30); } G.stroke(); }
        // metre ruler
        G.fillStyle = Pl.muted; G.font = '600 11px ui-monospace, monospace'; G.textAlign = 'center';
        const m0 = Math.floor(ox / SC) - 1;
        for (let k = m0; k < m0 + 960 / SC + 3; k++) { const X = k * SC - ox; G.fillRect(X, y0 + 2, 1, k % 5 === 0 ? 12 : 6); if (k % 5 === 0) G.fillText(k + ' m', X, y0 + 26); }
      }
      function crate(G, X, y, w, h, label, col) {
        G.save(); G.fillStyle = 'rgba(0,0,0,.18)'; G.beginPath(); G.ellipse(X, y + 2, w * 0.55, 5, 0, 0, Math.PI * 2); G.fill();
        const gr = G.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); G.fillStyle = gr; K.rr(G, X - w / 2, y - h, w, h, 6); G.fill();
        G.strokeStyle = 'rgba(0,0,0,.25)'; G.lineWidth = 2; G.stroke(); G.strokeStyle = 'rgba(255,255,255,.18)'; G.beginPath(); G.moveTo(X - w / 2 + 8, y - h + 8); G.lineTo(X + w / 2 - 8, y - 8); G.moveTo(X + w / 2 - 8, y - h + 8); G.lineTo(X - w / 2 + 8, y - 8); G.stroke();
        K.text(G, label, X, y - h / 2 + 5, { a: 'center', c: '#fff', w: 700, s: 14 }); G.restore();
      }
      let fHandle = null;
      function frame1() {
        const G = S.g, Pl = P(); S.clear();
        const target = x * SC - 360; cam += (target - cam) * (sim ? 0.12 : 1); if (!isFinite(cam)) cam = 0;
        drawTrack(G, cam);
        const X = x * SC - cam, y = 300, w = 46 + m * 3.2, h = 40 + m * 2;
        G.fillStyle = Pl.accent || '#c8341f'; strobe.forEach(([sx]) => { const sxp = sx * SC - cam; if (sxp > -10 && sxp < 970) { G.globalAlpha = 0.85; G.beginPath(); G.arc(sxp, y + 44, 4, 0, Math.PI * 2); G.fill(); } }); G.globalAlpha = 1;
        if (strobe.length) K.text(G, T('strobe: one dot every 0.5 s', 'نقطة كل نصف ثانية'), 12, y + 66, { c: Pl.muted, s: 11 });
        crate(G, X, y, w, h, `${f2(m, 1)} kg`, ['#c98a4b', '#8a5526']);
        const Fa = pushT > 0 ? (Math.max(F, 0) || 20) : F, cy = y - h / 2, sc = 2.4;
        if (Math.abs(Fa) > 0.01) K.arrow(G, X + Math.sign(Fa) * w / 2, cy, X + Math.sign(Fa) * w / 2 + Fa * sc, cy, '#ef7d22', 5, 13, `F = ${f2(Fa, 0)} N`);
        fHandle = { id: 'F', x: X + (Math.abs(Fa) > 0.01 ? Math.sign(Fa) * w / 2 + Fa * sc : w / 2 + 18), y: cy, r: 20 };
        G.save(); G.globalAlpha = 0.85; G.strokeStyle = '#ef7d22'; G.setLineDash([3, 3]); G.beginPath(); G.arc(fHandle.x, fHandle.y, 10, 0, Math.PI * 2); G.stroke(); G.restore();
        if (Math.abs(fr) > 0.01) K.arrow(G, X + Math.sign(fr) * w / 2, y - 6, X + Math.sign(fr) * w / 2 + fr * sc, y - 6, Pl.red, 4, 11, `f = ${f2(fr, 1)} N`);
        if (Math.abs(v) > 0.02) K.arrow(G, X, y - h - 18, X + v * 22, y - h - 18, Pl.blue, 3, 10, `v = ${f2(v, 2)} m/s`);
        // free-body diagram inset
        const bx = 830, by = 120, Pn = Pl; G.fillStyle = Pl.bg; G.globalAlpha = 0.92; K.rr(G, 730, 18, 212, 200, 12); G.fill(); G.globalAlpha = 1; G.strokeStyle = Pl.line; G.stroke();
        K.text(G, T('Free-body diagram', 'مخطط القوى'), 740, 38, { w: 700, s: 12, c: Pl.muted });
        G.fillStyle = Pl.ink; G.fillRect(bx - 12, by - 12, 24, 24);
        const W = m * g0, s2 = 60 / Math.max(W, Math.abs(Fa), 30);
        K.arrow(G, bx, by + 12, bx, by + 12 + W * s2, Pn.violet, 3, 9, 'W'); K.arrow(G, bx, by - 12, bx, by - 12 - W * s2, Pn.green, 3, 9, 'N');
        if (Math.abs(Fa) > 0.01) K.arrow(G, bx + Math.sign(Fa) * 12, by, bx + Math.sign(Fa) * 12 + Fa * s2, by, '#ef7d22', 3, 9, 'F');
        if (Math.abs(fr) > 0.01) K.arrow(G, bx + Math.sign(fr) * 12, by, bx + Math.sign(fr) * 12 + fr * s2, by, Pn.red, 3, 9, 'f');
        K.text(G, `F_net = ${f2(Fa + fr, 1)} N`, 932, 38, { w: 700, s: 12, a: 'right' });
        K.text(G, `t = ${f2(t, 2)} s`, 14, 26, { w: 700, s: 13, c: Pl.muted });
        read.innerHTML = IL(`**x** = ${f2(x)} m · **v** = ${f2(v)} m/s · **a** = ${f2(a)} m/s² · **F** = ${f2(Fa, 1)} N · **friction** = ${f2(fr, 1)} N · **F_net** = ${f2(Fa + fr, 1)} N → **F_net / m** = ${f2((Fa + fr) / m)} m/s²` +
          (mode === 'friction' ? ` · limit of static friction **μₛN** = ${f2(S0().s * m * g0, 1)} N${slipF != null ? ` · it started to slide at **${f2(slipF, 1)} N**` : ''}` : '') +
          (mode === 'inertia' && moving && Math.abs(Fa) < 1e-9 && S0().k === 0 ? ' · **No net force: the velocity stays constant.**' : ''));
      }
      function cart(G, X, y, label, mass, col) { const w = 78 + mass * 6, h = 26 + mass * 2; G.fillStyle = col; K.rr(G, X - w / 2, y - h - 10, w, h, 6); G.fill(); G.fillStyle = '#222'; [-w / 3, w / 3].forEach(o => { G.beginPath(); G.arc(X + o, y - 8, 8, 0, Math.PI * 2); G.fill(); }); K.text(G, `${label} · ${f2(mass, 1)} kg`, X, y - h / 2 - 6, { a: 'center', c: '#fff', w: 700, s: 12 }); return { w, h }; }
      function frame2() {
        const G = S.g, Pl = P(); S.clear();
        const mid = (A.x + B.x) / 2 * SC - 480; cam += (mid - cam) * (sim ? 0.08 : 1);
        drawTrack(G, cam); const y = 300;
        const XA = A.x * SC - cam, XB = B.x * SC - cam;
        const a1 = cart(G, XA, y, 'A', A.m, '#3c6fd8'), b1 = cart(G, XB, y, 'B', B.m, '#d0503b');
        if (Math.abs(A.v) > 0.02) K.arrow(G, XA, y - a1.h - 30, XA + A.v * 20, y - a1.h - 30, Pl.blue, 3, 9, `vA = ${f2(A.v)} m/s`);
        if (Math.abs(B.v) > 0.02) K.arrow(G, XB, y - b1.h - 30, XB + B.v * 20, y - b1.h - 30, Pl.blue, 3, 9, `vB = ${f2(B.v)} m/s`);
        if (contactF > 0.5) { const L = Math.min(160, 12 + contactF * 0.05); K.arrow(G, XB, y - b1.h / 2 - 12, XB + L, y - b1.h / 2 - 12, '#ef7d22', 4, 11, `on B by A: ${f2(contactF, 0)} N`); K.arrow(G, XA, y - a1.h / 2 - 12, XA - L, y - a1.h / 2 - 12, '#8b5cf6', 4, 11, `on A by B: ${f2(contactF, 0)} N`); }
        const pA = A.m * A.v, pB = B.m * B.v;
        // momentum bars
        const bx = 40, by = 40, s2 = 8; G.fillStyle = Pl.bg; G.globalAlpha = 0.9; K.rr(G, 20, 14, 360, 104, 12); G.fill(); G.globalAlpha = 1;
        K.text(G, T('Momentum p = m·v (kg·m/s)', 'كمية الحركة'), 30, 34, { w: 700, s: 12, c: Pl.muted });
        [['A', pA, '#3c6fd8'], ['B', pB, '#d0503b'], ['total', pA + pB, Pl.ink]].forEach(([n, p, col], i) => { const yy = by + 14 + i * 24; G.fillStyle = Pl.line; G.fillRect(bx + 150, yy - 8, 1, 16); G.fillStyle = col; G.fillRect(bx + 150, yy - 6, Math.max(-140, Math.min(140, p * s2)), 12); K.text(G, `${n}: ${f2(p)}`, bx, yy + 4, { s: 12, w: 600 }); });
        K.text(G, `t = ${f2(t, 2)} s`, 870, 26, { w: 700, s: 13, c: Pl.muted });
        const KE = 0.5 * A.m * A.v * A.v + 0.5 * B.m * B.v * B.v;
        read.innerHTML = IL(`**vA** = ${f2(A.v)} m/s · **vB** = ${f2(B.v)} m/s · **Total momentum** before: ${f2(p0)} · now: **${f2(pA + pB)}** kg·m/s · kinetic energy now: ${f2(KE)} J · largest contact force so far: ${f2(peakF, 0)} N — on each cart, in opposite directions.`);
      }
      /* ---------- graphs (synchronised with the motion) ---------- */
      function graph() {
        const G = Gs.g, Pl = P(); Gs.clear(Pl.bg);
        const two2 = mode === 'interact', span = 10, tmax = Math.max(span, t), t0 = tmax - span;
        const box = [60, 16, 860, 170];
        const series = two2 ? [[1, '#3c6fd8', 'vA'], [2, '#d0503b', 'vB']] : [[1, Pl.blue, 'v (m/s)'], [2, Pl.green, 'a (m/s²)']];
        let lo = -1, hi = 1; hist.forEach(r => series.forEach(([i]) => { lo = Math.min(lo, r[i]); hi = Math.max(hi, r[i]); })); saved.forEach(s => s.hist.forEach(r => { lo = Math.min(lo, r[1]); hi = Math.max(hi, r[1]); }));
        const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
        const X = tt => box[0] + (tt - t0) / span * box[2], Y = v => box[1] + (hi - v) / (hi - lo) * box[3];
        G.strokeStyle = Pl.line; G.lineWidth = 1; G.strokeRect(...box); G.beginPath(); G.moveTo(box[0], Y(0)); G.lineTo(box[0] + box[2], Y(0)); G.stroke();
        G.font = '600 11px ui-monospace, monospace'; G.fillStyle = Pl.muted; G.textAlign = 'right'; [hi - pad, 0, lo + pad].forEach(v => G.fillText(f2(v, 1), box[0] - 6, Y(v) + 4)); G.textAlign = 'center'; for (let k = Math.ceil(t0); k <= tmax; k++) G.fillText(k + ' s', X(k), box[1] + box[3] + 16);
        G.save(); G.beginPath(); G.rect(...box); G.clip();
        saved.forEach((s, i) => { G.strokeStyle = s.col; G.lineWidth = 1.6; G.setLineDash([5, 4]); G.beginPath(); s.hist.forEach((r, j) => { const xx = box[0] + r[0] / span * box[2]; if (j) G.lineTo(xx, Y(r[1])); else G.moveTo(xx, Y(r[1])); }); G.stroke(); G.setLineDash([]); });
        series.forEach(([i, col]) => { G.strokeStyle = col; G.lineWidth = 2.5; G.beginPath(); hist.forEach((r, j) => { if (j) G.lineTo(X(r[0]), Y(r[i])); else G.moveTo(X(r[0]), Y(r[i])); }); G.stroke(); });
        G.restore();
        G.textAlign = 'left'; series.forEach(([, col, n], i) => { G.fillStyle = col; G.fillRect(box[0] + 10 + i * 120, 6, 14, 3); G.fillStyle = Pl.ink; G.fillText(n, box[0] + 30 + i * 120, 12); });
        if (saved.length && !two2) saved.forEach((s, i) => { G.fillStyle = s.col; G.fillText(`- - ${s.name}`, box[0] + 260 + i * 200, 12); });
      }
      function render() { if (mode === 'interact') { if (!A) reset2(); frame2(); } else frame1(); graph(); }

      /* ---------- loop ---------- */
      const M = K.motor(c, host, (dt, running) => {
        if (running) { const h = Math.min(dt, 0.05); if (mode === 'interact') step2(h); else step1(h); }
        render();
      });
      function setMode(md) {
        mode = md; two.hidden = md !== 'interact';
        host.querySelectorAll('[data-k="F"],[data-k="m"],[data-k="v0"]').forEach(el => { el.closest('label').hidden = md === 'interact'; });
        host.querySelectorAll('[data-kc="surf"], [data-kb="push"], [data-kb="letgo"]').forEach(el => { el.hidden = md === 'interact'; }); const sc = host.querySelector('[data-kc="surf"]'); if (sc) sc.closest('.kx-chips').hidden = md === 'interact';
        task.innerHTML = IL(TASK[md]);
        if (md === 'inertia') { surf = 'frictionless'; ctl.set('surf', 'frictionless'); }
        if (md === 'friction') { surf = 'wood'; ctl.set('surf', 'wood'); F = 0; ctl.set('F', 0); }
        saved = []; runLog = []; renderLog(); sim = false; if (md === 'interact') reset2(); else reset1(); M.pause(); render(); syncRun();
      }
      function renderLog() {
        if (mode !== 'fma' || !runLog.length) { logBox.innerHTML = mode === 'fma' ? `<p class="at-muted">${T('Saved runs appear here, with measured acceleration next to F_net / m.', 'تظهر التجارب المحفوظة هنا.')}</p>` : ''; return; }
        logBox.innerHTML = `<table class="nl2__tbl"><caption>${T('Your runs', 'تجاربك')}</caption><thead><tr><th scope="col">#</th><th scope="col">F (N)</th><th scope="col">m (kg)</th><th scope="col">${T('Surface', 'السطح')}</th><th scope="col">F_net (N)</th><th scope="col">${T('measured a', 'ت المقيسة')} (m/s²)</th><th scope="col">F_net / m</th></tr></thead><tbody>${runLog.map((r, i) => `<tr><td>${i + 1}</td><td>${f2(r.F, 0)}</td><td>${f2(r.m, 1)}</td><td>${esc(r.surf)}</td><td>${f2(r.Fn, 1)}</td><td><b>${f2(r.a)}</b></td><td>${f2(r.Fn / r.m)}</td></tr>`).join('')}</tbody></table>`;
      }
      const RUNCOL = ['#7c3aed', '#0d9488', '#b45309', '#be123c'];
      function syncRun() { const b = host.querySelector('[data-kb="run"]'); if (b) b.textContent = sim ? T('Pause ❚❚', 'إيقاف') : T('Run ▸', 'تشغيل'); c.onChange && c.onChange(); } // keeps the frame’s Play/Pause label in step
      function on(id, val) {
        if (id === 'mode') return setMode(val);
        if (id === 'F') { F = val; if (pushT > 0) pushT = 0; if (!sim && mode !== 'interact') { render(); } }
        if (id === 'm') { m = val; render(); }
        if (id === 'v0') { if (!sim && t === 0) { v = val; moving = Math.abs(v) > 1e-9; render(); } }
        if (id === 'surf') { surf = val; render(); }
        if (['mA', 'vA', 'mB', 'vB', 'scene'].includes(id)) { sim = false; M.pause(); reset2(); render(); syncRun(); }
        if (id === 'run') { sim = !sim; if (sim) M.play(); else M.pause(); syncRun(); }
        if (id === 'step') { sim = false; M.pause(); if (mode === 'interact') step2(0.05); else step1(0.05); render(); syncRun(); }
        if (id === 'push') { if (mode === 'interact') return; pushT = 1; F = Math.max(F, 0) || 20; ctl.set('F', F); sim = true; M.play(); syncRun(); }
        if (id === 'letgo') { F = 0; pushT = 0; ctl.set('F', 0); render(); }
        if (id === 'save') {
          if (mode === 'interact' || !hist.length) return;
          const moved = hist.filter(r => Math.abs(r[2]) > 1e-6 || Math.abs(r[1]) > 1e-6);
          const h0 = hist[0], h1 = hist[hist.length - 1], aMeas = h1[0] - h0[0] > 1e-6 ? (h1[1] - h0[1]) / (h1[0] - h0[0]) : 0; // measured from the velocity record: Δv / Δt
          const last = hist[hist.length - 1];
          runLog.push({ F: last[4], m, surf: S0().n, Fn: last[4] + last[3], a: moved.length ? aMeas : 0 });
          saved.push({ name: `${f2(last[4], 0)} N, ${f2(m, 1)} kg`, col: RUNCOL[saved.length % 4], hist: hist.map(r => [r[0] - hist[0][0], r[1]]) }); if (saved.length > 4) saved.shift();
          renderLog(); sim = false; M.pause(); reset1(); render(); syncRun();
        }
        if (id === 'clear') { saved = []; runLog = []; renderLog(); render(); }
        M.draw();
      }
      // direct manipulation: drag the orange arrow tip to set the force
      K.drag(S, () => (mode === 'interact' || !fHandle ? [] : [fHandle]), (id, px) => {
        const X = x * SC - cam, w = 46 + m * 3.2; const side = px >= X ? 1 : -1; const val = K.clamp(Math.round((px - X - side * w / 2) / 2.4), -60, 60);
        F = val; pushT = 0; ctl.set('F', val); render();
      });
      S.cv.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); F = K.clamp(F + (e.key === 'ArrowRight' ? 5 : -5), -60, 60); ctl.set('F', F); render(); }
        else if (e.key === ' ') { e.preventDefault(); on('run', true); }
        else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); api.reset(); }
      });
      setMode('inertia');
      const api = {
        play() { sim = true; M.play(); syncRun(); }, pause() { sim = false; M.pause(); syncRun(); }, running: () => sim,
        preset() { setMode('inertia'); ctl.set('mode', 'inertia'); m = 4; ctl.set('m', 4); },
        reset() { sim = false; M.pause(); F = 0; pushT = 0; ctl.set('F', 0); if (mode === 'interact') reset2(); else reset1(); render(); syncRun(); },
        destroy() { sim = false; M.pause(); S.destroy(); Gs.destroy(); },
        observe() {
          if (mode === 'interact') { const pA = A.m * A.v, pB = B.m * B.v; return { text: `Two carts: total momentum before **${f2(p0)}**, now **${f2(pA + pB)}** kg·m/s. The largest contact force was **${f2(peakF, 0)} N** — the same size on A and on B, in opposite directions.` }; }
          const after = strobe.filter(([, tt]) => tt > 1.05); let gaps = []; for (let i = 1; i < after.length; i++) gaps.push(after[i][0] - after[i - 1][0]);
          const steady = gaps.length >= 2 && Math.max(...gaps) - Math.min(...gaps) < 0.01;
          const txt = mode === 'inertia' ? (gaps.length >= 2 ? `After the push the strobe dots are ${steady ? '**evenly spaced**' : '**not evenly spaced**'} (${gaps.slice(0, 4).map(g => f2(g)).join(' m, ')} m apart every 0.5 s): the velocity stayed at **${f2(v)} m/s**${S0().k ? ' — friction is slowing it on this surface' : ' with zero net force'}.` : 'Press **Push for 1 s** and let the crate glide for a few seconds.')
            : mode === 'fma' ? (runLog.length ? `Your runs: ${runLog.map(r => `F_net ${f2(r.Fn, 1)} N on ${f2(r.m, 1)} kg → measured a **${f2(r.a)}** (F_net/m = ${f2(r.Fn / r.m)})`).join('; ')}.` : 'Save a few runs to compare measured acceleration with F_net / m.')
              : slipF != null ? `On ${S0().n.toLowerCase()} the crate stayed still until the push reached **${f2(slipF, 1)} N** (μₛN = ${f2(S0().s * m * g0, 1)} N), then sliding friction dropped to μₖN = **${f2(S0().k * m * g0, 1)} N**.` : `The crate has not slipped yet: static friction is matching the ${f2(Math.abs(F), 1)} N push. The limit is μₛN = ${f2(S0().s * m * g0, 1)} N.`;
          return { text: txt, predOk: i => (mode === 'inertia' && gaps.length >= 2 ? i === 1 : null) };
        }
      };
      return api;
    }
  };
})();
