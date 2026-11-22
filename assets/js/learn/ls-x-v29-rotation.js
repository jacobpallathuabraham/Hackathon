/* ERLY Learning Studio 2.0 — ROTATION LAB: explore the mechanics of a rotating universe (3D, three.js).

   Physics (all analytic, so every frame — and stepping backwards — is exact):
     angular kinematics   θ(t) = θ₀ + ω₀t + ½αt²,  ω(t) = ω₀ + αt
     torque               τ = r F sin φ   (φ = angle between the radius vector and the force); α = τ / I
     inertia              I = Σ kᵢ mᵢ Rᵢ² + Σ m r²;  disc ½MR², ring MR², solid sphere ⅖MR², hollow sphere ⅔MR², rod (about centre) ML²/12
     angular momentum     with negligible external torque L = Iω is conserved, so ω = L / I; KE = ½Iω² = L² / 2I changes —
                          pulling masses in does positive work on them (KE rises); letting them out does negative work
     rolling              k = I/(mr²); rolling without slipping needs μ ≥ k tan θ /(1 + k); then a = g sin θ /(1 + k);
                          otherwise it slides: a = g(sin θ − μ cos θ), angular α = μ g cos θ /(k r) and friction turns energy into heat
   g = 9.81 m s⁻². Units are SI throughout. LS.rot exposes the engine for the automated tests. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, esc = LS.esc;
  const g = 9.81, f = (v, d = 2) => K.fmt(v, d);
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 2, prompt, options, answer, explain });
  const SHAPES = { disc: ['Solid disc', 0.5], ring: ['Hoop / ring', 1], sphere: ['Solid sphere', 0.4], shell: ['Hollow sphere', 2 / 3], rod: ['Rod (about its centre, L = 2R)', 1 / 3] };
  const ROLL = { sphere: ['Solid sphere', 0.4, '#d9603b'], shell: ['Hollow sphere', 2 / 3, '#8a6bd9'], cyl: ['Solid cylinder', 0.5, '#2f8f7a'], ring: ['Ring (hoop)', 1, '#d4a12a'], disc: ['Disc', 0.5, '#3b7fd9'] };
  const rot = LS.rot = {
    kin: (th0, w0, a, t) => ({ th: th0 + w0 * t + 0.5 * a * t * t, w: w0 + a * t }),
    torque: (r, F, phiDeg) => r * F * Math.sin(phiDeg * Math.PI / 180),
    I: (k, M, R) => k * M * R * R,
    platform: (Mp, Rp, masses) => 0.5 * Mp * Rp * Rp + masses.reduce((s, [m, r]) => s + m * r * r, 0),
    roll: (k, deg, mu, r = 0.25) => { const th = deg * Math.PI / 180, need = k * Math.tan(th) / (1 + k); if (mu >= need - 1e-12) return { rolls: true, a: g * Math.sin(th) / (1 + k), alpha: g * Math.sin(th) / ((1 + k) * r), need }; const a = Math.max(0, g * (Math.sin(th) - mu * Math.cos(th))); return { rolls: false, a, alpha: mu * g * Math.cos(th) / (k * r), need }; }
  };
  const PLAT = { Mp: 2, Rp: 1.2, m: 0.5, L0: null }; // challenge platform: I₀ = 1.44 + 4·0.5·1² = 3.44 kg m², ω₀ = 2 rad/s → L = 6.88

  D['rotation-lab'] = { wide: true, three: true,
    intro: 'A laboratory for things that **spin**. Choose an experiment: watch **angular motion** unfold, apply a **torque** by dragging where you push, change a platform’s **moment of inertia** by sliding its masses, race **different shapes**, and roll objects down a **ramp**.\n\nEverything you see is calculated from the equations of rotational mechanics — drag the 3D view to look around, scroll to zoom.',
    predict: { q: 'A spinning platform has masses on rails. With no external torque, you slide the masses **towards the axis**. The platform will…', options: ['slow down', 'spin faster', 'keep exactly the same speed', 'stop'] },
    explore: '- **Angular motion**: give the disc an angular acceleration, then step backwards in time — the marker retraces its path exactly.\n- **Torque**: push at the rim, then halfway in, then at a slant. Watch the lever arm.\n- **Mass distribution**: spin the platform, then drag all four masses inwards. What happens to ω, to L, to the kinetic energy?\n- **Shapes**: equal mass, radius and torque — which spins up fastest, and why?\n- **Rolling**: predict the winner before you race. Then reduce friction until something slips.',
    explain: 'Rotation mirrors straight-line motion: **θ, ω, α** play the parts of **x, v, a**, and **torque τ = rF sin φ** plays the part of force. A force pushes hardest on rotation when it is far from the axis and at right angles to the radius. The rotational “mass” is the **moment of inertia I = Σ m r²**: it depends on **where** the mass is, not just how much there is. Mass far from the axis makes I large, so the same torque gives a smaller **angular acceleration α = τ / I**. With no external torque, **angular momentum L = Iω is conserved** — pull mass in, I falls, ω rises (an ice-skater’s spin). The kinetic energy **½Iω² = L²/2I** is *not* conserved: pulling the masses in takes work, and that work becomes extra rotational energy. A rolling object shares its energy between moving and spinning; the bigger its k = I/(mr²), the more goes into spinning, so the **slower** it rolls — whatever its mass or size.',
    apply: [q('x-rl1', 'Two identical forces push a door, one at the handle and one halfway to the hinge, both at right angles. The torque from the push at the handle is…', ['the same', 'twice as large', 'half as large', 'four times as large'], 1, 'τ = rF sin 90°: doubling r doubles τ.'),
      q('x-rl2', 'A skater pulls her arms in and her moment of inertia halves. Ignoring friction, her angular speed…', ['halves', 'stays the same', 'doubles', 'quadruples'], 2, 'L = Iω is conserved: half the I means twice the ω.'),
      q('x-rl3', 'In the same situation her rotational kinetic energy…', ['stays the same', 'doubles', 'halves', 'drops to zero'], 1, 'KE = L²/(2I): with L fixed and I halved, KE doubles — the extra energy comes from the work her muscles do pulling her arms in.'),
      q('x-rl4', 'A solid sphere and a hoop are released together down the same ramp and both roll without slipping. Which reaches the bottom first?', ['the hoop', 'the sphere', 'they tie', 'whichever is heavier'], 1, 'a = g sin θ/(1 + k): the sphere’s k = 2/5 is smaller than the hoop’s k = 1.'),
      q('x-rl5', 'A force of 20 N acts 0.3 m from an axis at 30° to the radius. The torque is…', ['6 N·m', '3 N·m', '5.2 N·m', '0 N·m'], 1, 'τ = 0.3 × 20 × sin 30° = 3 N·m.')],
    summary: ['θ, ω, α ↔ x, v, a; ω = ω₀ + αt, θ = θ₀ + ω₀t + ½αt².', 'τ = rF sin φ; α = τ / I.', 'I = Σ m r² — mass far from the axis counts most.', 'No external torque ⇒ L = Iω conserved; KE = L²/2I changes.', 'Rolling: a = g sin θ /(1 + k), independent of mass and radius.'],
    whatif: ['What if all the masses were at the rim?', 'What if the force pointed straight at the axis?', 'What if the ramp were twice as steep?', 'What if there were almost no friction?'],
    connect: [{ label: 'Newton’s laws laboratory', href: '#/exp/newton-lab' }, { label: 'Energy track', href: '#/exp/energy-track' }, { label: 'Solar system explorer', href: '#/space' }],
    guide: [
      { t: 'Choose the mass-distribution experiment', say: 'Select **Mass distribution** — the flagship experiment.', target: '[data-kc="mod"][data-v="inertia"]', done: a => a._state().mod === 'inertia' },
      { t: 'Spin the platform', say: 'Press **Spin up** to give the platform an initial spin (ω₀ = 2 rad/s).', target: '[data-kb="spin"]', done: a => a._state().w > 0.1 },
      { t: 'Pull the masses inwards', say: 'Drag the masses towards the axis (or use the **All masses at radius** slider). Watch ω climb while L stays fixed.', target: '[data-k="rall"]', done: a => a._state().I < 2.2 && a._state().w > 2.5, hint: a => (a._state().w <= 0.1 ? 'Spin the platform first — with nothing rotating there is nothing to conserve.' : 'Move the masses closer than about 0.6 m from the axis.') },
      { t: 'Compare the energy', say: 'Read the **kinetic energy** — it went up. Where did the extra energy come from?', target: '.rl__read', done: () => true, wait: 1 },
      { t: 'Shapes under the same torque', say: 'Open **Shapes** and press **Apply the torque** to race five shapes with equal mass and radius.', target: '[data-kc="mod"][data-v="shapes"]', done: a => a._state().mod === 'shapes' && a._state().shapeT > 0.5 },
      { t: 'Predict a rolling race', say: 'Open **Rolling**, make a prediction, and race.', target: '[data-kc="mod"][data-v="roll"]', done: a => a._state().mod === 'roll' && a._state().rollDone }
    ],
    build(host, c) {
      const P = K.pal();
      const ctl = K.controls(host, [{ k: 'row' }, { k: 'chips', id: 'mod', label: T('Experiment', 'التجربة'), opts: [['motion', T('Angular motion', 'الحركة الزاوية')], ['torque', T('Torque', 'العزم')], ['inertia', T('Mass distribution', 'توزيع الكتلة')], ['shapes', T('Shapes', 'الأشكال')], ['roll', T('Rolling', 'الدحرجة')]], val: 'inertia' }, { k: 'end' }], (id, v) => { if (id === 'mod') setMod(v); });
      const stageHost = document.createElement('div'); stageHost.className = 'rl__stage x3-host'; host.appendChild(stageHost);
      const fallback = document.createElement('p'); fallback.className = 'v26-hint'; host.appendChild(fallback);
      const boxes = {}; ['motion', 'torque', 'inertia', 'shapes', 'roll'].forEach(k => { const d = document.createElement('div'); d.className = 'rl__ctl'; d.dataset.mod = k; host.appendChild(d); boxes[k] = d; });
      const G2 = K.stage(host, 900, 230, 'rl__graph'); G2.cv.setAttribute('role', 'img');
      const grid = document.createElement('div'); grid.className = 'v26-grid2'; grid.innerHTML = `<div class="v26-card"><h3>${T('Live values', 'القيم الحية')}</h3><div class="v26-out rl__read" aria-live="polite"></div></div><div class="v26-card"><h3>${T('What is happening', 'ماذا يحدث')}</h3><div class="v26-out rl__why"></div></div>`; host.appendChild(grid);
      // ---------- state ----------
      const st = { mod: 'inertia', running: false, t: 0,
        motion: { th0: 0, w0: 1, a: 0.5 }, hist: [],
        torque: { r: 0.8, F: 10, phi: 90, M: 4, R: 1, w: 0, th: 0, on: false, ang: 0 },
        inertia: { r: [1, 1, 1, 1], w: 0, th: 0, L: 0, hist: [], done: false },
        shapes: { tau: 1, M: 2, R: 0.5, t: 0, on: false },
        roll: { deg: 20, mu: 0.6, pick: ['sphere', 'shell', 'cyl', 'ring'], t: 0, on: false, done: false, pred: null } };
      const Iplat = () => rot.platform(PLAT.Mp, PLAT.Rp, st.inertia.r.map(r => [PLAT.m, r]));
      // ---------- controls per experiment ----------
      const C = {
        motion: K.controls(boxes.motion, [{ k: 'row' }, { k: 'range', id: 'w0', label: T('Initial angular velocity ω₀', 'السرعة الزاوية الابتدائية'), min: -4, max: 4, step: 0.1, val: 1, d: 1, unit: ' rad/s' }, { k: 'range', id: 'a', label: T('Angular acceleration α', 'التسارع الزاوي'), min: -2, max: 2, step: 0.05, val: 0.5, d: 2, unit: ' rad/s²' }, { k: 'range', id: 'th0', label: T('Initial angle θ₀', 'الزاوية الابتدائية'), min: 0, max: 6.28, step: 0.01, val: 0, d: 2, unit: ' rad' }, { k: 'end' }, { k: 'row' }, { k: 'btn', id: 'play', label: T('Play / pause', 'تشغيل / إيقاف'), accent: true }, { k: 'btn', id: 'back', label: '⏮ ' + T('Step back 0.1 s', 'خطوة للخلف') }, { k: 'btn', id: 'fwd', label: T('Step forward 0.1 s', 'خطوة للأمام') + ' ⏭' }, { k: 'btn', id: 'reset', label: T('Reset', 'إعادة') }, { k: 'chips', id: 'spd', label: T('Speed', 'السرعة'), opts: [[0.25, '¼×'], [0.5, '½×'], [1, '1×'], [2, '2×']], val: 1 }, { k: 'end' }], (id, v) => {
          const m = st.motion; if (id === 'w0') m.w0 = v; if (id === 'a') m.a = v; if (id === 'th0') m.th0 = v; if (/w0|^a$|th0/.test(id)) { st.t = 0; st.hist = []; }
          if (id === 'play') st.running = !st.running; if (id === 'back') { st.running = false; st.t = Math.max(0, st.t - 0.1); } if (id === 'fwd') { st.running = false; st.t += 0.1; } if (id === 'reset') { st.running = false; st.t = 0; st.hist = []; } sync(); }),
        torque: K.controls(boxes.torque, [{ k: 'row' }, { k: 'range', id: 'r', label: T('Distance from axis r', 'البعد عن المحور'), min: 0, max: 1, step: 0.01, val: 0.8, d: 2, unit: ' m' }, { k: 'range', id: 'F', label: T('Force F', 'القوة'), min: 0, max: 30, step: 0.5, val: 10, d: 1, unit: ' N' }, { k: 'range', id: 'phi', label: T('Angle between r and F (φ)', 'الزاوية φ'), min: 0, max: 180, step: 1, val: 90, unit: '°' }, { k: 'end' }, { k: 'row' }, { k: 'btn', id: 'push', label: T('Push for 1 s', 'ادفع ثانية'), accent: true }, { k: 'btn', id: 'rev', label: T('Reverse the force', 'اعكس القوة') }, { k: 'btn', id: 'stop', label: T('Stop the wheel', 'أوقف العجلة') }, { k: 'end' }], (id, v) => {
          const s = st.torque; if (id === 'r') s.r = v; if (id === 'F') s.F = v; if (id === 'phi') s.phi = v; if (id === 'push') { s.on = true; s.left = 1; } if (id === 'rev') { s.phi = (s.phi + 180) % 360; if (s.phi > 180) s.phi -= 360; C.torque.set('phi', Math.abs(s.phi)); s.sign = s.phi < 0 ? -1 : 1; } if (id === 'stop') { s.w = 0; } sync(); }),
        inertia: K.controls(boxes.inertia, [{ k: 'row' }, { k: 'range', id: 'rall', label: T('All masses at radius', 'كل الكتل على نصف القطر'), min: 0.2, max: 1.1, step: 0.01, val: 1, d: 2, unit: ' m' }, { k: 'end' }, { k: 'row' }, { k: 'btn', id: 'spin', label: T('Spin up (ω₀ = 2 rad/s)', 'دوّر (ω₀ = 2)'), accent: true }, { k: 'btn', id: 'brake', label: T('Stop', 'أوقف') }, { k: 'chips', id: 'chal', label: T('Challenge', 'التحدي'), opts: [['off', T('Off', 'إيقاف')], ['on', T('Reach ω = 4.0 rad/s', 'الوصول إلى ω = 4.0')]], val: 'off' }, { k: 'end' }], (id, v) => {
          const s = st.inertia; if (id === 'rall') { setR([v, v, v, v]); } if (id === 'spin') { const I = Iplat(); s.w = 2 * (3.44 / I); if (s.r.every(r => Math.abs(r - 1) < 1e-9)) s.w = 2; s.L = Iplat() * s.w; s.hist = []; s.t0 = performance.now(); } if (id === 'brake') { s.w = 0; s.L = 0; } if (id === 'chal') { s.chal = v === 'on'; if (s.chal) { setR([1, 1, 1, 1]); C.inertia.set('rall', 1); s.w = 2; s.L = Iplat() * 2; s.done = false; } } sync(); }),
        shapes: K.controls(boxes.shapes, [{ k: 'row' }, { k: 'range', id: 'tau', label: T('Same torque on each τ', 'العزم نفسه'), min: 0.2, max: 3, step: 0.1, val: 1, d: 1, unit: ' N·m' }, { k: 'range', id: 'M', label: T('Same mass M', 'الكتلة نفسها'), min: 0.5, max: 5, step: 0.5, val: 2, d: 1, unit: ' kg' }, { k: 'range', id: 'R', label: T('Same radius R', 'نصف القطر نفسه'), min: 0.2, max: 0.6, step: 0.05, val: 0.5, d: 2, unit: ' m' }, { k: 'end' }, { k: 'row' }, { k: 'btn', id: 'go', label: T('Apply the torque', 'طبّق العزم'), accent: true }, { k: 'btn', id: 'reset', label: T('Reset', 'إعادة') }, { k: 'end' }], (id, v) => {
          const s = st.shapes; if (id in s) s[id] = v; if (id === 'go') { s.on = true; s.t = 0; } if (id === 'reset') { s.on = false; s.t = 0; } sync(); }),
        roll: K.controls(boxes.roll, [{ k: 'row' }, { k: 'range', id: 'deg', label: T('Ramp angle', 'زاوية المنحدر'), min: 5, max: 45, step: 1, val: 20, unit: '°' }, { k: 'range', id: 'mu', label: T('Friction coefficient μ', 'معامل الاحتكاك'), min: 0, max: 1, step: 0.01, val: 0.6, d: 2 }, { k: 'end' }, { k: 'html', html: `<div class="rl__pred" role="group" aria-label="${T('Predict the winner', 'توقّع الفائز')}"><span>${T('Predict first — which arrives first?', 'توقّع أولاً — من يصل أولاً؟')}</span>${Object.keys(ROLL).filter(k => k !== 'disc').map(k => `<button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-pred="${k}">${ROLL[k][0]}</button>`).join('')}<button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-pred="tie">${T('A tie', 'تعادل')}</button></div>` }, { k: 'row' }, { k: 'btn', id: 'race', label: T('Release!', 'أطلق!'), accent: true }, { k: 'btn', id: 'slow', label: T('Slow motion', 'حركة بطيئة') }, { k: 'btn', id: 'reset', label: T('Reset', 'إعادة') }, { k: 'end' }], (id, v) => {
          const s = st.roll; if (id === 'deg') { s.deg = v; buildRamp(); } if (id === 'mu') s.mu = v; if (id === 'race') { s.on = true; s.t = 0; s.done = false; } if (id === 'slow') s.slow = !s.slow; if (id === 'reset') { s.on = false; s.t = 0; s.done = false; } sync(); })
      };
      host.querySelector('.rl__pred').addEventListener('click', e => { const b = e.target.closest('[data-pred]'); if (!b) return; st.roll.pred = b.dataset.pred; host.querySelectorAll('[data-pred]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); sync(); });
      function setR(arr) { st.inertia.r = arr.map(r => K.clamp(r, 0.2, 1.1)); if (st.inertia.L) st.inertia.w = st.inertia.L / Iplat(); sync(); }
      // ---------- the 3D world ----------
      let S = null, W = {};
      const ok3d = LS.has3d();
      if (!ok3d) fallback.textContent = T('3D is not available on this device — every number, graph and explanation still works below.', 'ثلاثي الأبعاد غير متاح — الأرقام والرسوم تعمل.');
      if (ok3d) LS.scene3d(stageHost, { cls: 'rl__3d', bg: 0x0d1220, fog: [0x0d1220, 14, 34], cam: [4.6, 3.4, 5.6], shadows: true, label: T('Rotation laboratory, 3D view', 'مختبر الدوران'), aspect: 0.5, maxPolar: Math.PI * 0.49, minDist: 2.2, maxDist: 16, exposure: 1.1 }).then(s => { if (!host.isConnected) { s.destroy(); return; } S = s; build3d(); setMod(st.mod, true); S.tick = tick; S.start(); });
      function mat(color, o = {}) { return new S.THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.45, metalness: 0.2 }, o)); }
      function build3d() {
        const THREE = S.THREE, sc = S.scene;
        // floor: a soft studio floor with a faint grid, catching shadows
        const fc = document.createElement('canvas'); fc.width = fc.height = 512; const fg = fc.getContext('2d'); fg.fillStyle = '#1a2133'; fg.fillRect(0, 0, 512, 512); fg.strokeStyle = 'rgba(140,170,230,.16)'; fg.lineWidth = 2; for (let i = 0; i <= 512; i += 64) { fg.beginPath(); fg.moveTo(i, 0); fg.lineTo(i, 512); fg.moveTo(0, i); fg.lineTo(512, i); fg.stroke(); }
        const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(8, 8); ft.colorSpace = THREE.SRGBColorSpace;
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0xffffff, { map: ft, roughness: 0.9, metalness: 0 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
        const spot = new THREE.SpotLight(0xfff1dc, 40, 18, 0.55, 0.6, 1.6); spot.position.set(0, 7, 2); spot.target.position.set(0, 0, 0); sc.add(spot, spot.target);
        const metal = mat(0xb9c4d6, { metalness: 0.85, roughness: 0.3 }), dark = mat(0x2a3245, { metalness: 0.6, roughness: 0.45 }), red = mat(0xe8463a, { emissive: 0x501010 });
        // --- angular motion: a flywheel on a vertical axle ---
        const M1 = new THREE.Group(); sc.add(M1);
        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 24), metal); axle.position.y = 1.2; M1.add(axle);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.18, 48), dark); base.position.y = 0.09; base.castShadow = base.receiveShadow = true; M1.add(base);
        const wheel = new THREE.Group(); wheel.position.y = 1.3; M1.add(wheel);
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.16, 96), metal); disc.castShadow = true; wheel.add(disc);
        for (let i = 0; i < 12; i++) { const tick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.17, 0.12), dark); const a = i / 12 * Math.PI * 2; tick.position.set(Math.cos(a) * 1.12, 0.01, Math.sin(a) * 1.12); tick.rotation.y = -a; wheel.add(tick); }
        const marker = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.08), red); marker.position.set(0.6, 0.095, 0); wheel.add(marker);
        const trailG = new THREE.BufferGeometry(); trailG.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * 240), 3)); const trail = new THREE.Line(trailG, new THREE.LineBasicMaterial({ color: 0xff7a6e, transparent: true, opacity: 0.7 })); trail.position.y = 1.4; M1.add(trail);
        const wArrow = LS.arrow3d(THREE, 0x58a6ff), aArrow = LS.arrow3d(THREE, 0xffb648); M1.add(wArrow, aArrow);
        const ref = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.02), mat(0xffffff, { emissive: 0x444444 })); ref.position.set(1.45, 1.39, 0); M1.add(ref); // θ = 0 reference
        W.m1 = { g: M1, wheel, trail, trailG, wArrow, aArrow, pts: [] };
        // --- torque: a horizontal wheel you push in its plane ---
        const M2 = new THREE.Group(); sc.add(M2);
        const tWheel = new THREE.Group(); tWheel.position.y = 0.9; M2.add(tWheel);
        const tDisc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 96), mat(0x9fb3cf, { metalness: 0.75, roughness: 0.32 })); tDisc.castShadow = true; tWheel.add(tDisc);
        for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.02, 0.05), dark); sp.position.y = 0.07; sp.rotation.y = i * Math.PI / 6; tWheel.add(sp); }
        const tAx = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 24), metal); tAx.position.y = 0.95; M2.add(tAx);
        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 16), mat(0x58e0a0, { emissive: 0x0e4a30 })); handle.position.y = 0.98; M2.add(handle); handle.userData.drag = 'point';
        const fArrow = LS.arrow3d(THREE, 0x58e0a0, 0.03), tArrow = LS.arrow3d(THREE, 0xffb648, 0.04); M2.add(fArrow, tArrow);
        const armG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]); const arm = new THREE.Line(armG, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.06, gapSize: 0.04 })); arm.position.y = 0.98; M2.add(arm);
        const rLineG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]); const rLine = new THREE.Line(rLineG, new THREE.LineBasicMaterial({ color: 0x58a6ff })); rLine.position.y = 0.985; M2.add(rLine);
        W.m2 = { g: M2, tWheel, handle, fArrow, tArrow, arm, armG, rLine, rLineG };
        // --- mass distribution: a turntable with four rails and sliding masses ---
        const M3 = new THREE.Group(); sc.add(M3);
        const plat = new THREE.Group(); plat.position.y = 0.6; M3.add(plat);
        const pd = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 96), mat(0x34405a, { metalness: 0.55, roughness: 0.35 })); pd.castShadow = pd.receiveShadow = true; plat.add(pd);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.025, 12, 128), metal); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; plat.add(ring);
        const masses = [];
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const rail = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.04, 0.07), metal); rail.position.set(Math.cos(a) * 0.66, 0.08, Math.sin(a) * 0.66); rail.rotation.y = -a; plat.add(rail);
          const ms = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 40), mat([0xe8463a, 0x58a6ff, 0x58e0a0, 0xffb648][i], { metalness: 0.3, roughness: 0.35 })); ms.castShadow = true; ms.userData.i = i; ms.userData.a = a; plat.add(ms); masses.push(ms); }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 24), metal); hub.position.y = 0.1; plat.add(hub);
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.25, 0.55, 24), dark); stand.position.y = 0.27; stand.castShadow = true; M3.add(stand);
        const LArrow = LS.arrow3d(THREE, 0x58a6ff, 0.05); M3.add(LArrow);
        W.m3 = { g: M3, plat, masses, LArrow };
        const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.68);
        S.dragOnPlane(masses, (o) => { o.userData.grab = true; host.dispatchEvent(new CustomEvent('rl-drag')); }, (o, p) => { const local = plat.worldToLocal(p.clone()); const a = o.userData.a; const r = local.x * Math.cos(a) + local.z * Math.sin(a); const arr = st.inertia.r.slice(); arr[o.userData.i] = r; setR(arr); }, o => { o.userData.grab = false; }, dragPlane);
        // drag the force point on the torque wheel
        const tPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.98);
        S.dragOnPlane([handle], null, (o, p) => { const r = Math.min(1, Math.hypot(p.x, p.z)); st.torque.r = Math.round(r * 100) / 100; C.torque.set('r', st.torque.r); sync(); }, null, tPlane);
        // --- shapes: five objects on parallel axles ---
        const M4 = new THREE.Group(); sc.add(M4); const shapeObjs = {};
        Object.keys(SHAPES).forEach((k, i) => { const x = (i - 2) * 1.35, holder = new THREE.Group(); holder.position.set(x, 0.85, 0); M4.add(holder); const sm = mat([0x58a6ff, 0xffb648, 0xe8463a, 0x8a6bd9, 0x58e0a0][i], { metalness: 0.35, roughness: 0.35 }); let mesh;
          if (k === 'disc') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 64), sm); else if (k === 'ring') mesh = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 20, 96), sm); else if (k === 'sphere') mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 24), sm); else if (k === 'shell') { mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 24, 0, Math.PI * 1.6), Object.assign(sm, { side: THREE.DoubleSide })); } else mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.08), sm);
          if (k === 'ring') mesh.rotation.x = Math.PI / 2; mesh.castShadow = true; const spinner = new THREE.Group(); spinner.add(mesh); const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), red); stripe.position.set(0.44, 0, 0); if (k === 'rod') stripe.position.set(0.47, 0.06, 0); spinner.add(stripe); holder.add(spinner);
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 12), dark); post.position.set(x, 0.42, 0); M4.add(post); const lab = LS.label3d(THREE, SHAPES[k][0].split(' (')[0], { h: 0.2 }); lab.position.set(x, 1.62, 0); M4.add(lab); shapeObjs[k] = spinner; });
        W.m4 = { g: M4, shapeObjs };
        // --- rolling: an inclined ramp with lanes ---
        const M5 = new THREE.Group(); sc.add(M5); W.m5 = { g: M5, objs: {} }; buildRamp();
      }
      function buildRamp() {
        if (!S) return; const THREE = S.THREE, M5 = W.m5.g; while (M5.children.length) { const ch = M5.children.pop(); ch.traverse(o => { o.geometry && o.geometry.dispose(); }); }
        const th = st.roll.deg * Math.PI / 180, L = 4.4, w = 2.6; /* 4.4 m ramp: start 0.2 m from the top, finish line 4 m further down */ const ramp = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, w), mat(0x6c5b46, { roughness: 0.85, metalness: 0.05 })); ramp.castShadow = ramp.receiveShadow = true;
        const holder = new THREE.Group(); holder.rotation.z = -th; holder.position.set(0, L / 2 * Math.sin(th) + 0.04, 0); holder.add(ramp); M5.add(holder);
        const sup = new THREE.Mesh(new THREE.BoxGeometry(0.12, L * Math.sin(th), w), mat(0x2a3245)); sup.position.set(-L / 2 * Math.cos(th), L * Math.sin(th) / 2, 0); sup.castShadow = true; M5.add(sup);
        st.roll.pick.forEach((k, i) => { const z = (i - 1.5) * 0.62, r = 0.25, mt = mat(ROLL[k][2], { metalness: 0.3, roughness: 0.4 }); let mesh;
          if (k === 'sphere') mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 20), mt); else if (k === 'shell') mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 20), Object.assign(mt, { transparent: true, opacity: 0.85 })); else if (k === 'ring') { mesh = new THREE.Mesh(new THREE.TorusGeometry(r - 0.04, 0.04, 16, 64), mt); } else { mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 48), mt); mesh.rotation.x = Math.PI / 2; }
          const roller = new THREE.Group(), spinG = new THREE.Group(); spinG.add(mesh); const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), mat(0xffffff, { emissive: 0x666666 })); dot.position.set(0, r * 0.75, k === 'cyl' ? 0.16 : 0); spinG.add(dot); roller.add(spinG); mesh.castShadow = true; M5.add(roller); W.m5.objs[k] = { roller, spinG, z, r }; });
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, w + 0.2), mat(0xffffff, { emissive: 0x888888 })); flag.position.set((-L / 2 + 4.2) * Math.cos(th), (L - 4.2) * Math.sin(th) + 0.1, 0); M5.add(flag);
        placeRollers(0);
      }
      function placeRollers() { const th = st.roll.deg * Math.PI / 180, L = 4.4; Object.entries(W.m5.objs).forEach(([k, o]) => { const s = Math.min(4, rollS(k)), x = (-L / 2 + 0.2 + s) * Math.cos(th) + o.r * Math.sin(th), y = (L - 0.2 - s) * Math.sin(th) + (o.r + 0.08) * Math.cos(th); o.roller.position.set(x, y, o.z); o.roller.rotation.z = -th; o.spinG.rotation.z = -rollAng(k); }); }
      const rollS = k => { const R0 = rot.roll(ROLL[k][1], st.roll.deg, st.roll.mu); return 0.5 * R0.a * st.roll.t * st.roll.t; };
      const rollAng = k => { const R0 = rot.roll(ROLL[k][1], st.roll.deg, st.roll.mu); return 0.5 * R0.alpha * st.roll.t * st.roll.t; };
      // ---------- switching experiments ----------
      const CAM = { motion: [[3.4, 3.2, 4.2], [0, 1.2, 0]], torque: [[0.2, 3.6, 3.4], [0, 0.9, 0]], inertia: [[2.6, 2.8, 3.2], [0, 0.6, 0]], shapes: [[0.5, 2.6, 6.6], [0, 0.9, 0]], roll: [[0.6, 2.4, 6.2], [0, 0.9, 0]] };
      function setMod(m, instant) { st.mod = m; st.running = false; Object.entries(boxes).forEach(([k, b]) => { b.hidden = k !== m; }); ctl.set('mod', m);
        if (S) { ['m1', 'm2', 'm3', 'm4', 'm5'].forEach((k, i) => { W[k].g.visible = ['motion', 'torque', 'inertia', 'shapes', 'roll'][i] === m; }); S.fly(...CAM[m], instant ? 0 : 1000); }
        sync(); c.onChange && c.onChange(); }
      // ---------- animation ----------
      let gT = 0;
      function tick(dt) {
        const m = st.mod;
        if (m === 'motion' && st.running) { st.t += dt * (C.motion.val.spd || 1); st.hist.push([st.t, rot.kin(st.motion.th0, st.motion.w0, st.motion.a, st.t)]); if (st.hist.length > 600) st.hist.shift(); }
        if (m === 'torque') { const s = st.torque, I = rot.I(0.5, s.M, s.R), tau = rot.torque(s.r, s.F, s.phi) * (s.sign || 1); if (s.on) { s.w += tau / I * dt; s.left -= dt; if (s.left <= 0) s.on = false; } s.ang += s.w * dt; }
        if (m === 'inertia') { st.inertia.th += st.inertia.w * dt; if (st.inertia.w) { st.inertia.hist.push([performance.now() / 1000, st.inertia.w, 0.5 * Iplat() * st.inertia.w ** 2]); if (st.inertia.hist.length > 400) st.inertia.hist.shift(); } }
        if (m === 'shapes' && st.shapes.on) { st.shapes.t += dt; if (st.shapes.t > 6) st.shapes.on = false; }
        if (m === 'roll' && st.roll.on) { st.roll.t += dt * (st.roll.slow ? 0.25 : 1); const all = st.roll.pick.every(k => rollS(k) >= 4); if (all || st.roll.t > 20) { st.roll.on = false; st.roll.done = true; } }
        if (S) draw3d();
        gT += dt; if (gT > 0.1 || !dt) { gT = 0; read(); graph(); }
        return st.running || st.torque.on || Math.abs(st.torque.w) > 1e-6 || st.inertia.w || st.shapes.on || st.roll.on;
      }
      function draw3d() {
        const THREE = S.THREE;
        if (st.mod === 'motion') { const k = rot.kin(st.motion.th0, st.motion.w0, st.motion.a, st.t), o = W.m1; o.wheel.rotation.y = -k.th;
          const pts = o.trailG.attributes.position.array, n = 80; for (let i = 0; i < n; i++) { const tt = Math.max(0, st.t - (n - 1 - i) * 0.04), kk = rot.kin(st.motion.th0, st.motion.w0, st.motion.a, tt), rr = 1.05; pts[i * 3] = Math.cos(kk.th) * rr; pts[i * 3 + 1] = 0; pts[i * 3 + 2] = -Math.sin(kk.th) * rr; } o.trailG.setDrawRange(0, n); o.trailG.attributes.position.needsUpdate = true;
          o.wArrow.set(new THREE.Vector3(0, 1.45, 0), new THREE.Vector3(0, Math.sign(k.w) || 1, 0), Math.min(1.6, Math.abs(k.w) * 0.35)); o.aArrow.set(new THREE.Vector3(0.18, 1.45, 0), new THREE.Vector3(0, Math.sign(st.motion.a) || 1, 0), Math.min(1.4, Math.abs(st.motion.a) * 0.6)); }
        if (st.mod === 'torque') { const s = st.torque, o = W.m2; o.tWheel.rotation.y = -s.ang; const px = s.r, ph = (s.phi * (s.sign || 1)) * Math.PI / 180; o.handle.position.set(px, 0.98, 0);
          const dir = new THREE.Vector3(Math.cos(ph), 0, -Math.sin(ph)); const len = 0.25 + s.F / 30 * 1.1; o.fArrow.set(new THREE.Vector3(px, 0.98, 0), dir, len);
          const tau = rot.torque(s.r, s.F, s.phi) * (s.sign || 1); o.tArrow.set(new THREE.Vector3(0, 1.9, 0), new THREE.Vector3(0, tau >= 0 ? 1 : -1, 0), Math.min(1.2, Math.abs(tau) * 0.06));
          // lever arm: perpendicular from the axis to the line of action
          const P0 = new THREE.Vector3(px, 0, 0), foot = P0.clone().add(dir.clone().multiplyScalar(-P0.dot(dir))); const a = o.armG.attributes.position.array; a[0] = 0; a[1] = 0; a[2] = 0; a[3] = foot.x; a[4] = 0; a[5] = foot.z; o.armG.attributes.position.needsUpdate = true; o.arm.computeLineDistances();
          const b = o.rLineG.attributes.position.array; b[3] = px; o.rLineG.attributes.position.needsUpdate = true; }
        if (st.mod === 'inertia') { const o = W.m3; o.plat.rotation.y = -st.inertia.th; o.masses.forEach((ms, i) => { const r = st.inertia.r[i], a = ms.userData.a; ms.position.set(Math.cos(a) * r, 0.14, Math.sin(a) * r); ms.scale.setScalar(ms.userData.grab ? 1.15 : 1); }); o.LArrow.set(new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0, 1, 0), Math.min(1.6, st.inertia.L * 0.18)); }
        if (st.mod === 'shapes') { const s = st.shapes; Object.entries(W.m4.shapeObjs).forEach(([k, sp]) => { const I = rot.I(SHAPES[k][1], s.M, s.R), al = s.tau / I; sp.rotation.y = -0.5 * al * s.t * s.t; }); }
        if (st.mod === 'roll') placeRollers();
      }
      // ---------- numbers ----------
      function read() {
        const box = host.querySelector('.rl__read'), why = host.querySelector('.rl__why'), m = st.mod; let html = '', ex = '';
        if (m === 'motion') { const k = rot.kin(st.motion.th0, st.motion.w0, st.motion.a, st.t); html = `t = <b>${f(st.t)} s</b><br>θ = θ₀ + ω₀t + ½αt² = <b>${f(k.th)} rad</b> (${f(k.th / (2 * Math.PI), 2)} turns)<br>ω = ω₀ + αt = <b>${f(k.w)} rad/s</b><br>α = <b>${f(st.motion.a)} rad/s²</b>`; ex = k.w * st.motion.a < 0 ? T('ω and α point opposite ways: the wheel is slowing down (and will reverse if you wait).', 'الإبطاء.') : st.motion.a ? T('ω and α point the same way: the wheel speeds up. The blue arrow (ω) and orange arrow (α) follow the right-hand rule.', 'تسارع.') : T('No angular acceleration: constant ω, so θ grows steadily.', 'ثبات ω.'); }
        if (m === 'torque') { const s = st.torque, I = rot.I(0.5, s.M, s.R), tau = rot.torque(s.r, s.F, s.phi) * (s.sign || 1), arm = s.r * Math.sin(s.phi * Math.PI / 180); html = `r = <b>${f(s.r)} m</b>, F = <b>${f(s.F, 1)} N</b>, φ = <b>${s.phi}°</b><br>${T('lever arm', 'ذراع القوة')} r sin φ = <b>${f(arm)} m</b><br>τ = rF sin φ = <b>${f(tau)} N·m</b><br>I (${T('disc', 'قرص')} ${s.M} kg, R = ${s.R} m) = ½MR² = <b>${f(I)} kg·m²</b><br>α = τ / I = <b>${f(tau / I)} rad/s²</b> · ω = <b>${f(s.w)} rad/s</b>`; ex = Math.abs(Math.sin(s.phi * Math.PI / 180)) < 0.02 ? T('The force points straight through the axis: the lever arm is zero, so it cannot turn the wheel at all.', 'ذراع صفري.') : s.r < 0.2 ? T('Pushing close to the axis gives a tiny lever arm — a big force makes only a small torque.', 'قرب المحور.') : T('The dashed line is the lever arm: the perpendicular distance from the axis to the line of the force. Torque = force × lever arm.', 'ذراع القوة.'); }
        if (m === 'inertia') { const s = st.inertia, I = Iplat(), KE = 0.5 * I * s.w * s.w; html = `${T('masses', 'الكتل')} 4 × ${PLAT.m} kg ${T('at', 'على')} r = ${s.r.map(r => f(r)).join(', ')} m<br>I = ½M<sub>p</sub>R<sub>p</sub>² + Σmr² = 1.44 + ${f(I - 1.44, 3)} = <b>${f(I, 3)} kg·m²</b><br>ω = <b>${f(s.w)} rad/s</b> · L = Iω = <b>${f(I * s.w, 3)} kg·m²/s</b>${s.L ? ` (${T('conserved', 'محفوظ')})` : ''}<br>KE = ½Iω² = <b>${f(KE, 3)} J</b>`;
          if (s.chal) { const okc = Math.abs(s.w - 4) <= 0.1; if (okc) s.done = true; html += `<p>${T('Challenge: reach ω = 4.0 rad/s by moving the masses only.', 'التحدي: ω = 4.0')} ${okc ? '<b class="v28-ok">✓ ' + T('Reached!', 'تم!') + '</b>' : ''}</p>`; }
          ex = !s.w ? T('Press Spin up. Then slide the masses — with no external torque, L stays the same while I changes.', 'دوّر ثم حرّك الكتل.') : T(`L stays ${f(I * s.w, 2)} kg·m²/s whatever you do, because the masses push on the platform only inwards/outwards — no external torque. Smaller I ⇒ bigger ω. The kinetic energy L²/2I is not conserved: moving a mass inwards takes work, and that work appears as extra spin energy.`, 'L محفوظ.'); }
        if (m === 'shapes') { const s = st.shapes; html = `<table><tr><th>${T('Shape', 'الشكل')}</th><th>I = kMR²</th><th>α = τ/I</th><th>ω ${T('now', 'الآن')}</th></tr>${Object.entries(SHAPES).map(([k, [n, kk]]) => { const I = rot.I(kk, s.M, s.R), al = s.tau / I; return `<tr><td>${n}</td><td>${f(kk, 3)} × ${f(s.M * s.R * s.R, 3)} = ${f(I, 3)}</td><td>${f(al)}</td><td>${f(al * s.t)}</td></tr>`; }).join('')}</table>`; ex = T('Same mass, same radius, same torque — the only difference is where the mass sits. The ring keeps all its mass at the rim (k = 1), so it spins up slowest; the rod and solid sphere keep more mass near the axis.', 'الفرق في توزيع الكتلة.'); }
        if (m === 'roll') { const s = st.roll, rows = s.pick.map(k => { const R0 = rot.roll(ROLL[k][1], s.deg, s.mu), tt = Math.sqrt(2 * 4 / R0.a); return [k, R0, tt]; }), win = rows.slice().sort((a, b) => a[2] - b[2]), first = win[0]; const tie = win.length > 1 && Math.abs(win[0][2] - win[1][2]) < 1e-9;
          html = `<table><tr><th></th><th>k</th><th>a (m/s²)</th><th>${T('time over 4 m', 'زمن 4 م')}</th><th></th></tr>${rows.map(([k, R0, tt]) => `<tr><td>${ROLL[k][0]}</td><td>${f(ROLL[k][1], 3)}</td><td>${f(R0.a)}</td><td>${f(tt)} s</td><td>${R0.rolls ? T('rolls', 'يتدحرج') : '<b>' + T('slips', 'ينزلق') + '</b>'}</td></tr>`).join('')}</table>`;
          if (s.pred && s.done) { const right = s.pred === first[0] || (s.pred === 'tie' && tie); html += `<p>${T('You predicted', 'توقعت')}: <b>${s.pred === 'tie' ? T('a tie', 'تعادل') : ROLL[s.pred][0]}</b> — ${right ? '<b class="v28-ok">' + T('correct!', 'صحيح!') + '</b>' : T('the winner was', 'الفائز') + ' <b>' + ROLL[first[0]][0] + '</b>'}</p>`; }
          ex = rows.some(r => !r[1].rolls) ? T(`At ${s.deg}° with μ = ${s.mu} some objects need more friction than is available (μ ≥ k tan θ/(1 + k)), so they slide: friction now wastes energy as heat and they spin less.`, 'انزلاق.') : T('Rolling without slipping: a = g sin θ /(1 + k). Mass and radius cancel out — only the shape factor k matters. The smaller k, the less energy goes into spinning, the faster it rolls.', 'الدحرجة.'); }
        box.innerHTML = html; why.innerHTML = LS.inline ? LS.inline(ex) : esc(ex);
        if (S) S.cv.setAttribute('aria-label', T('Rotation laboratory. ', 'مختبر الدوران. ') + box.textContent.slice(0, 300));
      }
      function graph() {
        const G = G2.g; G2.clear(); const m = st.mod;
        if (m === 'motion') { const tmax = Math.max(4, st.t + 0.5); const A = K.axes(G, [46, 12, 836, 190], [0, tmax], [-8, 12], { xl: 't (s)', yl: 'θ (rad) · ω (rad/s)', dec: 1 }); K.plot(G, A, t => rot.kin(st.motion.th0, st.motion.w0, st.motion.a, t).th, 0, st.t, P.red, 2.5); K.plot(G, A, t => rot.kin(st.motion.th0, st.motion.w0, st.motion.a, t).w, 0, st.t, P.blue, 2.5); G.fillStyle = P.red; G.fillText('θ', A.X(st.t) + 6, A.Y(rot.kin(st.motion.th0, st.motion.w0, st.motion.a, st.t).th)); G.fillStyle = P.blue; G.fillText('ω', A.X(st.t) + 6, A.Y(rot.kin(st.motion.th0, st.motion.w0, st.motion.a, st.t).w)); }
        else if (m === 'inertia') { const h = st.inertia.hist; const t0 = h.length ? h[0][0] : 0; const A = K.axes(G, [46, 12, 836, 190], [0, Math.max(5, h.length ? h[h.length - 1][0] - t0 : 5)], [0, 12], { xl: 't (s)', yl: 'ω (rad/s) · KE (J)', dec: 1 }); [[1, P.blue], [2, P.gold]].forEach(([j, col]) => { G.strokeStyle = col; G.lineWidth = 2.5; G.beginPath(); h.forEach((p, i) => { const x = A.X(p[0] - t0), y = A.Y(p[j]); i ? G.lineTo(x, y) : G.moveTo(x, y); }); G.stroke(); }); K.text(G, '— ω', 700, 28, { c: P.blue, w: 800 }); K.text(G, '— KE', 760, 28, { c: P.gold, w: 800 }); }
        else if (m === 'shapes') { const s = st.shapes, A = K.axes(G, [46, 12, 836, 190], [0, 6], [0, Math.max(5, s.tau / rot.I(1 / 3, s.M, s.R) * 6 * 1.05)], { xl: 't (s)', yl: 'ω (rad/s)', dec: 1 }); Object.entries(SHAPES).forEach(([k, [n, kk]], i) => { const al = s.tau / rot.I(kk, s.M, s.R), col = [P.blue, P.gold, P.red, P.violet, P.green][i]; K.plot(G, A, t => al * t, 0, Math.max(0.001, s.t), col, 2.5); K.text(G, n.split(' (')[0], A.X(Math.max(0.3, s.t)) + 4, A.Y(al * Math.max(0.3, s.t)), { s: 11, c: col }); }); }
        else if (m === 'roll') { const s = st.roll, A = K.axes(G, [46, 12, 836, 190], [0, 3], [0, 8], { xl: 't (s)', yl: 'v (m/s)', dec: 1 }); s.pick.forEach(k => { const R0 = rot.roll(ROLL[k][1], s.deg, s.mu), tend = Math.sqrt(8 / R0.a); K.plot(G, A, t => R0.a * Math.min(t, tend), 0, Math.min(3, s.t || 3), ROLL[k][2], 2.5); }); }
        else { const s = st.torque, I = rot.I(0.5, s.M, s.R), A = K.axes(G, [46, 12, 836, 190], [0, 180], [-1, 32], { xl: 'φ (°)', yl: 'τ (N·m)' }); K.plot(G, A, ph => rot.torque(s.r, s.F, ph), 0, 180, P.gold, 2.5); G.fillStyle = P.red; G.beginPath(); G.arc(A.X(s.phi), A.Y(rot.torque(s.r, s.F, s.phi)), 6, 0, 7); G.fill(); void I; }
        G2.cv.setAttribute('aria-label', T('Graph for the current experiment.', 'رسم التجربة.'));
      }
      function sync() { read(); graph(); if (S) S.render(); }
      // keyboard on the 3D view: 1–4 choose a mass, ←/→ move it; in torque, ←/→ move the push point
      let selMass = 0;
      stageHost.addEventListener('keydown', e => { if (st.mod === 'inertia') { if (/^[1-4]$/.test(e.key)) { selMass = +e.key - 1; e.preventDefault(); } if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const arr = st.inertia.r.slice(); arr[selMass] += e.key === 'ArrowRight' ? 0.05 : -0.05; setR(arr); e.preventDefault(); } }
        if (st.mod === 'torque' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { st.torque.r = K.clamp(st.torque.r + (e.key === 'ArrowRight' ? 0.05 : -0.05), 0, 1); C.torque.set('r', st.torque.r); sync(); e.preventDefault(); } });
      G2.onresize = graph; setMod('inertia', true); sync();
      if (!ok3d) { const M2 = K.motor(c, host, dt => { tick(dt); }); M2.play(); } // no WebGL: the same physics drives the numbers and graphs
      const api = { play() { if (st.mod === 'motion') st.running = true; else if (st.mod === 'roll') { st.roll.on = true; st.roll.t = 0; } else if (st.mod === 'shapes') { st.shapes.on = true; st.shapes.t = 0; } S && S.start(); }, pause() { st.running = false; st.roll.on = false; st.shapes.on = false; }, running: () => st.running || st.roll.on || st.shapes.on,
        destroy() { S && S.destroy(); G2.destroy(); }, reset() { st.t = 0; st.hist = []; st.running = false; setR([1, 1, 1, 1]); st.inertia.w = 0; st.inertia.L = 0; st.torque.w = 0; st.shapes.on = false; st.shapes.t = 0; st.roll.on = false; st.roll.t = 0; sync(); },
        _state: () => ({ mod: st.mod, t: st.t, w: st.inertia.w, I: Iplat(), L: Iplat() * st.inertia.w, KE: 0.5 * Iplat() * st.inertia.w ** 2, r: st.inertia.r.slice(), shapeT: st.shapes.t, rollT: st.roll.t, rollDone: st.roll.done, done: st.inertia.done, torque: Object.assign({}, st.torque), has3d: !!S }),
        _set: o => { if (o.mod) setMod(o.mod, true); if (o.r) setR(o.r); if (o.spin) C.inertia.box.querySelector('[data-kb="spin"]').click(); if (o.chal) { C.inertia.box.querySelector('[data-kc="chal"][data-v="on"]').click(); } if (o.motion) { Object.assign(st.motion, o.motion); } if (o.t != null) st.t = o.t; if (o.torque) Object.assign(st.torque, o.torque); if (o.roll) Object.assign(st.roll, o.roll); sync(); return api._state(); },
        _snap: () => { if (!S) return null; S.renderer.render(S.scene, S.camera); return S.cv.toDataURL('image/jpeg', 0.82); }, _fps: () => (S ? S.fps() : null),
        observe() { const s = st.inertia; return { text: st.mod === 'inertia' && s.w ? `Platform: I = ${f(Iplat(), 3)} kg·m², ω = ${f(s.w)} rad/s, L = ${f(Iplat() * s.w, 3)} kg·m²/s (conserved), KE = ${f(0.5 * Iplat() * s.w * s.w, 3)} J.` : `Experiment: ${st.mod}. ` + host.querySelector('.rl__read').textContent.slice(0, 220), predOk: i => (st.mod === 'inertia' && s.w && Iplat() < 3.44 ? i === 1 : null) }; } };
      return api;
    }
  };
})();
