/* ERLY Learning Studio — the CIRCULAR MOTION laboratory frame (shared by all fifteen experiments of the chapter).

   One frame, one design system: every experiment gets the same toolbar (play / pause / step / reset, slow motion,
   camera views, force / component / velocity / label / trail / grid toggles), the same 3D studio, live values, a live
   formula panel with the current numbers substituted, a free-body diagram, a graph, a guided investigation and a
   prediction challenge. An experiment is a SPEC (see ls-x-circ.js) that supplies its parameters, its model, its physics
   (through LS.circ) and what to show.

   Timing: the physics advances in FIXED steps of simulated time (spec.h, default 1/240 s) via LS.circ.clock — the frame
   rate only decides how many steps are taken per frame, never the result. Slow motion and speed-up scale simulated time.
   Forces: arrows are the REAL forces on the object (N, mg, friction, tension, …); the net force is drawn separately and
   labelled "net = m v²/r" — it is the resultant, not an extra force. Pseudo-forces appear only in a rotating frame and
   are drawn dashed-pink and labelled as such.
   Performance: renders on demand (idle scenes stop drawing), adaptive pixel ratio (LS.scene3d), all GPU resources
   disposed on leave, pauses off-screen / in hidden tabs. Reduced motion: nothing moves until Play is pressed; cameras cut.
   No WebGL: the same physics drives the numbers, free-body diagram and graph. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, K = LS.kit, E = LS.circ, esc = LS.esc;
  const f = (v, d = 2) => (Number.isFinite(v) ? K.fmt(v, d) : '∞');
  const COL = { N: 0x58a6ff, mg: 0xffc247, f: 0x4fe3a1, T: 0xc59bff, net: 0xffffff, pseudo: 0xff6fae, v: 0x6ff3ff, F: 0xff8a5c, G: 0xffc247 };
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  LS.circCOL = COL; LS.circHex = hex;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');

  /* ---------- small modelling kit shared by the experiments ---------- */
  function kit(THREE) {
    const M = {};
    M.mat = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.42, metalness: 0.15, clearcoat: 0, envMapIntensity: 1 }, o));
    M.glow = (color, k = 1) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });
    M.rbox = (w, h, d, r, mat) => { const s = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r, W = w - 2 * r, H = h - 2 * r; s.moveTo(x, y - r); s.lineTo(x + W, y - r); s.quadraticCurveTo(x + W + r, y - r, x + W + r, y); s.lineTo(x + W + r, y + H); s.quadraticCurveTo(x + W + r, y + H + r, x + W, y + H + r); s.lineTo(x, y + H + r); s.quadraticCurveTo(x - r, y + H + r, x - r, y + H); s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
      const gm = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelSize: r * 0.98, bevelThickness: r, bevelSegments: 4, curveSegments: 6 }); gm.translate(0, 0, -(d - 2 * r) / 2); gm.computeVertexNormals(); const m = new THREE.Mesh(gm, mat); m.castShadow = m.receiveShadow = true; return m; };
    M.cyl = (r1, r2, h, mat, seg = 40) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; };
    M.ball = (r, mat, seg = 40) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.6)), mat); m.castShadow = true; return m; };
    // a straight link (string, rod, chain, arm) between two points, updated with .between(a, b)
    M.link = (r, mat, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg, 1, true), mat), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(); m.castShadow = true;
      m.between = (a, b) => { d.subVectors(b, a); const L = d.length(); m.visible = L > 1e-4; if (!m.visible) return; m.scale.set(1, L, 1); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(up, d.normalize()); }; return m; };
    // a wheel: tyre + rim + spokes; spins about its local x axis
    M.wheel = (R, w, tyreCol = 0x15171c, rimCol = 0xc9d2de, spokes = 6) => { const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(R - w * 0.45, w * 0.45, 14, 40), M.mat(tyreCol, { roughness: 0.85, metalness: 0 })); tyre.rotation.y = Math.PI / 2; tyre.castShadow = true; spin.add(tyre);
      const rim = M.cyl(R * 0.62, R * 0.62, w * 0.5, M.mat(rimCol, { metalness: 0.9, roughness: 0.25 }), 32); rim.rotation.z = Math.PI / 2; spin.add(rim);
      for (let i = 0; i < spokes; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, R * 1.1, R * 0.08), M.mat(0x2b313b, { metalness: 0.6 })); s.rotation.x = i / spokes * Math.PI; spin.add(s); }
      g.spin = spin; return g; };
    // a procedural car (≈ 4.4 m long, faces −z in its local frame); .wheels spin, .steer front wheels
    M.car = (paint = 0xd8332f) => { const g = new THREE.Group(), body = M.mat(paint, { metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }), glass = M.mat(0x0c1622, { metalness: 0.1, roughness: 0.05, transmission: 0, clearcoat: 1, opacity: 0.92, transparent: true }), trim = M.mat(0x1b1f26, { roughness: 0.6 });
      const low = M.rbox(1.8, 0.55, 4.4, 0.16, body); low.position.y = 0.55; g.add(low); const cab = M.rbox(1.55, 0.5, 2.2, 0.2, glass); cab.position.set(0, 1.03, 0.25); g.add(cab);
      const roof = M.rbox(1.45, 0.06, 1.6, 0.03, body); roof.position.set(0, 1.29, 0.3); g.add(roof);
      [-0.62, 0.62].forEach(x => { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.05), M.glow(0xfff4d6, 2.2)); hl.position.set(x, 0.66, -2.2); g.add(hl); const tl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.05), M.glow(0xff2a2a, 1.6)); tl.position.set(x, 0.68, 2.2); g.add(tl); });
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.04), trim); grille.position.set(0, 0.48, -2.21); g.add(grille);
      g.wheels = []; g.steer = []; [[-0.86, -1.4], [0.86, -1.4], [-0.86, 1.35], [0.86, 1.35]].forEach(([x, z], i) => { const piv = new THREE.Group(); piv.position.set(x, 0.36, z); const wh = M.wheel(0.36, 0.26); piv.add(wh); g.add(piv); g.wheels.push(wh); if (i < 2) g.steer.push(piv); });
      return g; };
    // a stylised articulated cyclist on a bicycle (faces −z); pose(crank, lean) animates pedalling
    M.cyclist = (jersey = 0x2f7de1) => { const g = new THREE.Group(), frameM = M.mat(0xe23b3b, { metalness: 0.6, roughness: 0.3, clearcoat: 1 }), dark = M.mat(0x1d2128, { roughness: 0.6 }), skin = M.mat(0xc88b62, { roughness: 0.6 }), shirt = M.mat(jersey, { roughness: 0.7 }), shorts = M.mat(0x14161b, { roughness: 0.7 }), helm = M.mat(0xf3f4f7, { roughness: 0.25, clearcoat: 1 });
      const R = 0.34, fw = M.wheel(R, 0.05, 0x111111, 0xd9dee6, 14), bw = M.wheel(R, 0.05, 0x111111, 0xd9dee6, 14); fw.position.set(0, R, -0.52); bw.position.set(0, R, 0.52); g.add(fw, bw);
      const L = (a, b, r = 0.022, m = frameM) => { const k = M.link(r, m); k.between(new THREE.Vector3(...a), new THREE.Vector3(...b)); g.add(k); return k; };
      const BB = [0, 0.3, 0.02], ST = [0, 0.86, 0.2], HT = [0, 0.84, -0.4], HB = [0, 0.98, -0.44];
      L(BB, ST); L(ST, HT); L(BB, HT); L(BB, [0, R, 0.52], 0.016); L(ST, [0, R, 0.52], 0.016); L(HT, [0, R, -0.52], 0.02); L(HT, HB, 0.02, dark);
      const bar = M.cyl(0.018, 0.018, 0.46, dark, 12); bar.rotation.z = Math.PI / 2; bar.position.set(...HB); g.add(bar);
      const seat = M.rbox(0.12, 0.05, 0.26, 0.02, dark); seat.position.set(0, 0.9, 0.24); g.add(seat);
      const crank = new THREE.Group(); crank.position.set(...BB); g.add(crank); const ca = M.cyl(0.012, 0.012, 0.34, M.mat(0xbfc6cf, { metalness: 0.9 }), 8); crank.add(ca);
      const ped = [-1, 1].map(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.06), dark); crank.add(p); p.position.set(s * 0.11, s * 0.17, 0); return p; });
      // rider: torso, head, arms to the bars, two-segment legs solved to the pedals
      const hip = new THREE.Vector3(0, 0.96, 0.22), torso = M.link(0.11, shirt); g.add(torso); const sh = new THREE.Vector3(0, 1.38, -0.12); torso.between(hip, sh);
      const head = M.ball(0.11, skin, 24); head.position.set(0, 1.55, -0.2); g.add(head); const hel = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), helm); hel.position.copy(head.position); hel.position.y += 0.02; hel.rotation.x = -0.35; g.add(hel);
      [-1, 1].forEach(s => { const a = M.link(0.035, shirt), b = M.link(0.03, skin); g.add(a, b); const sp = new THREE.Vector3(s * 0.17, 1.33, -0.1), el = new THREE.Vector3(s * 0.2, 1.15, -0.3), hd = new THREE.Vector3(s * 0.2, 0.99, -0.44); a.between(sp, el); b.between(el, hd); });
      const legs = [-1, 1].map(s => { const a = M.link(0.055, shorts), b = M.link(0.042, skin); g.add(a, b); return { a, b, s }; });
      const hp = new THREE.Vector3(), knee = new THREE.Vector3(), P0 = new THREE.Vector3(), LEG = 0.45;
      g.pose = (ang) => { crank.rotation.x = ang; fw.spin.rotation.x = ang * 2.6; bw.spin.rotation.x = ang * 2.6;
        legs.forEach(l => { const s = l.s; hp.set(s * 0.1, hip.y, hip.z); P0.set(s * 0.11, BB[1] + s * 0.17 * Math.cos(ang), BB[2] + s * 0.17 * Math.sin(ang)); // pedal (crank rotates about x)
          const dy = P0.y - hp.y, dz = P0.z - hp.z, D = Math.min(Math.hypot(dy, dz), 2 * LEG * 0.999), a = D / 2, hh = Math.sqrt(LEG * LEG - a * a); let ny = -dz / D, nz = dy / D; if (nz > 0) { ny = -ny; nz = -nz; } // two-bone IK, knee forward
          knee.set(s * 0.105, hp.y + dy / 2 + ny * hh, hp.z + dz / 2 + nz * hh); l.a.between(hp, knee); l.b.between(knee, P0); }); };
      g.pose(0); return g; };
    return M;
  }
  LS.circKit = kit;

  /* ---------- the frame ---------- */
  LS.circLab = function (host, c, spec) {
    const p = {}; (spec.modes || []).forEach(m => { p[m.id] = m.val; }); spec.params.forEach(q => { p[q.id] = q.val; });
    const st = { s: null, t: 0, running: false, speed: 1, cam: 'free', show: Object.assign({ forces: true, comp: false, vel: true, labels: true, trail: true, grid: false }, spec.show || {}), hist: [], hide: false, chal: null, inv: {}, phase: null, fx: [], gT: 0, uiT: 0 };
    let clock = E.clock(spec.hOf ? spec.hOf(p) : spec.h || 1 / 240);
    host.classList.add('cm'); host.dataset.cm = spec.id;
    // ---- toolbar ----
    const bar = K.controls(host, [{ k: 'row' }, { k: 'btn', id: 'play', label: T('Play', 'تشغيل'), accent: true }, { k: 'btn', id: 'step', label: T('Step', 'خطوة') }, { k: 'btn', id: 'reset', label: T('Reset', 'إعادة') },
      { k: 'chips', id: 'speed', label: T('Speed', 'السرعة'), opts: [[0.1, '0.1×'], [0.25, '¼×'], [0.5, '½×'], [1, '1×'], [2, '2×']], val: 1 },
      { k: 'chips', id: 'cam', label: T('View', 'المنظر'), opts: [['free', T('Free', 'حر')], ['side', T('Side', 'جانبي')], ['top', T('Top', 'علوي')], ['follow', T('Follow', 'تتبّع')]], val: 'free' }, { k: 'btn', id: 'camreset', label: T('Reset view', 'إعادة المنظر') }, { k: 'end' },
      { k: 'row' }, { k: 'toggle', id: 'forces', label: T('Forces', 'القوى'), val: st.show.forces }, { k: 'toggle', id: 'comp', label: T('Components', 'المركّبات'), val: st.show.comp }, { k: 'toggle', id: 'vel', label: T('Velocity', 'السرعة'), val: st.show.vel }, { k: 'toggle', id: 'labels', label: T('Labels', 'التسميات'), val: st.show.labels }, { k: 'toggle', id: 'trail', label: T('Trail', 'الأثر'), val: st.show.trail }, { k: 'toggle', id: 'grid', label: T('Grid', 'الشبكة'), val: st.show.grid }, { k: 'end' }], onBar);
    bar.box.classList.add('cm-bar'); const playBtn = bar.box.querySelector('[data-kb="play"]');
    // ---- stage ----
    const stageHost = document.createElement('div'); stageHost.className = 'cm-stage x3-host'; host.appendChild(stageHost);
    const hud = document.createElement('div'); hud.className = 'cm-hud'; hud.innerHTML = '<span class="cm-hud__t"></span><span class="cm-hud__s" role="status"></span>'; stageHost.appendChild(hud);
    /* v45: the DRIVING CONSOLE (experiments with spec.drive): a speedometer — actual speed (needle), the speed you asked
       for (marker), the ideal speed and the safe band — plus accelerator and brake pedals. Hold a pedal (mouse, touch,
       Enter/Space on the pedal, or ↑/↓ on the 3D view) and the target speed changes; the car follows it smoothly. */
    let drv = null;
    if (spec.drive) drv = (() => { const D = spec.drive, q = spec.params.find(x => x.id === D.param), el = document.createElement('div'); el.className = 'cm-drive'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', T('Driving controls', 'أدوات القيادة'));
      const ang = v => -120 + 240 * Math.max(0, Math.min(1, v / D.max)), P = (a, r) => { const t = (a - 90) * Math.PI / 180; return [100 + r * Math.cos(t), 100 + r * Math.sin(t)]; };
      const arc = (v0, v1, r) => { const a0 = ang(v0), a1 = ang(v1), p0 = P(a0, r), p1 = P(a1, r); return `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`; };
      let ticks = ''; for (let v = 0; v <= D.max + 1e-9; v += 5) { const maj = v % 10 === 0, a = P(ang(v), 84), b2 = P(ang(v), maj ? 72 : 77); ticks += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b2[0].toFixed(1)}" y2="${b2[1].toFixed(1)}" class="${maj ? 'maj' : ''}"/>`; if (maj) { const tp = P(ang(v), 60); ticks += `<text x="${tp[0].toFixed(1)}" y="${(tp[1] + 4).toFixed(1)}">${v}</text>`; } }
      el.innerHTML = `<svg class="cm-g" viewBox="0 0 200 172" role="img" aria-label="${T('Speedometer', 'عداد السرعة')}"><path class="cm-g__track" d="${arc(0, D.max, 84)}"/><path class="cm-g__band" d=""/><g class="cm-g__ticks">${ticks}</g><line class="cm-g__ideal" x1="0" y1="0" x2="0" y2="0"/><path class="cm-g__tgt" d="M100 9l-5 -8h10z"/><g class="cm-g__ndl"><path d="M97.5 100L100 24L102.5 100z"/></g><circle cx="100" cy="100" r="7" class="cm-g__hub"/><text class="cm-g__v" x="100" y="138">0</text><text class="cm-g__u" x="100" y="155">m/s · 0 km/h</text></svg>
        <div class="cm-pedals"><button type="button" class="cm-pedal cm-pedal--brake" data-pedal="-1" aria-label="${T('Brake — hold to slow down (↓)', 'المكابح — اضغط مطولاً للإبطاء')}"><span aria-hidden="true">${T('Brake', 'فرامل')}</span></button><button type="button" class="cm-pedal cm-pedal--gas" data-pedal="1" aria-label="${T('Accelerator — hold to speed up (↑)', 'الوقود — اضغط مطولاً للتسريع')}"><span aria-hidden="true">${T('Gas', 'وقود')}</span></button></div><span class="sr-only" aria-live="polite"></span>`;
      stageHost.appendChild(el); const $d = x => el.querySelector(x), ndl = $d('.cm-g__ndl'), tv = $d('.cm-g__v'), tu = $d('.cm-g__u'), say = $d('[aria-live]');
      const locked = () => st.chal && !st.chal.done;
      const press = dir => { if (locked()) return; st.pedal = dir; el.querySelector(`[data-pedal="${dir}"]`).classList.add('is-on'); if (!st.running) play(); };
      const release = () => { if (!st.pedal) return; el.querySelectorAll('.cm-pedal').forEach(b => b.classList.remove('is-on')); st.pedal = 0; say.textContent = T('Target speed', 'السرعة المطلوبة') + ' ' + f(p[D.param], 1) + ' m/s'; sync(); };
      el.querySelectorAll('.cm-pedal').forEach(b => { const dir = +b.dataset.pedal;
        b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* */ } press(dir); });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, release));
        b.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(dir); } });
        b.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); }); b.addEventListener('blur', release); b.addEventListener('contextmenu', e => e.preventDefault()); });
      return { press, release,
        frame(dt) { if (st.pedal) { const rate = st.pedal > 0 ? 6 : 9, v = Math.max(q.min, Math.min(q.max, p[D.param] + st.pedal * rate * dt)); if (v !== p[D.param]) { p[D.param] = v; ctl.set(D.param, +v.toFixed(1)); } }
          const sp = D.speed(st.s, p); ndl.setAttribute('transform', `rotate(${ang(sp).toFixed(2)} 100 100)`); tv.textContent = f(sp, 1); tu.textContent = `m/s · ${f(sp * 3.6, 0)} km/h`; },
        marks() { const M0 = st.hide ? {} : D.marks(st.s, p), band = $d('.cm-g__band'), id0 = $d('.cm-g__ideal'); $d('.cm-g__tgt').setAttribute('transform', `rotate(${ang(p[D.param]).toFixed(2)} 100 100)`);
          if (M0.lo != null && M0.hi != null) { band.setAttribute('d', arc(Math.max(0, M0.lo), Math.min(D.max, M0.hi), 84)); band.style.display = ''; } else band.style.display = 'none';
          if (M0.ideal != null && M0.ideal <= D.max) { const a = P(ang(M0.ideal), 90), b2 = P(ang(M0.ideal), 68); id0.setAttribute('x1', a[0]); id0.setAttribute('y1', a[1]); id0.setAttribute('x2', b2[0]); id0.setAttribute('y2', b2[1]); id0.style.display = ''; } else id0.style.display = 'none';
          el.querySelector('svg').setAttribute('aria-label', T('Speedometer: ', 'عداد السرعة: ') + f(D.speed(st.s, p), 1) + ' m/s, ' + T('target', 'المطلوب') + ' ' + f(p[D.param], 1) + (M0.ideal != null ? ', ' + T('ideal', 'المثالية') + ' ' + f(M0.ideal, 1) : '') + (M0.lo != null ? ', ' + T('safe', 'الآمن') + ' ' + f(M0.lo, 1) + '–' + f(Math.min(M0.hi, 999), 1) : '') + ' m/s'); } }; })();
    const fallback = document.createElement('p'); fallback.className = 'v26-hint cm-fallback'; host.appendChild(fallback);
    // ---- parameters ----
    const ctl = K.controls(host, [].concat((spec.modes || []).map(m => ({ k: 'chips', id: m.id, label: m.label, opts: m.opts, val: m.val })), [{ k: 'row' }], spec.params.map(q => Object.assign({ k: 'range' }, q)), [{ k: 'end' }], spec.extraCtl || []), onParam);
    ctl.box.classList.add('cm-ctl');
    // ---- panels ----
    const grid = document.createElement('div'); grid.className = 'cm-cards'; host.appendChild(grid);
    grid.innerHTML = `<section class="cm-card cm-card--read"><h3>${T('Live values', 'القيم الحية')}</h3><div class="cm-read" aria-live="off"></div><p class="cm-why"></p></section>
      <section class="cm-card cm-card--eq"><h3>${T('Formula panel · live', 'المعادلات · مباشر')}</h3><div class="cm-eq"></div></section>
      <section class="cm-card cm-card--fbd"><h3>${T('Free-body diagram', 'مخطط الجسم الحر')}</h3><div class="cm-fbd"></div><p class="cm-small cm-fbd__k"></p></section>
      <section class="cm-card cm-card--graph"><h3>${spec.graph ? esc(spec.graph.title || T('Graph', 'رسم بياني')) : T('Graph', 'رسم بياني')}</h3><div class="cm-graph"></div></section>
      <section class="cm-card cm-card--inv"><h3>${T('Guided investigation', 'استقصاء موجّه')}</h3><ol class="cm-inv"></ol></section>
      <section class="cm-card cm-card--chal"><h3>${T('Prediction challenge', 'تحدي التوقع')}</h3><div class="cm-chal"></div></section>`;
    const $ = s => grid.querySelector(s);
    const FB = K.stage($('.cm-fbd'), 340, 260, 'cm-fbd__cv'); FB.cv.setAttribute('role', 'img');
    const GR = K.stage($('.cm-graph'), 640, 230, 'cm-graph__cv'); GR.cv.setAttribute('role', 'img');
    const lab = { p, st, spec, host, set: (id, v) => { p[id] = v; ctl.set(id, v); } };

    function reinit() { if (spec.hOf) clock = E.clock(spec.hOf(p)); st.s = spec.init(p, lab); st.t = 0; st.hist = []; st.phase = spec.phase ? spec.phase(st.s, p) : null; clock.reset(); trailN = 0; if (W.onReset) W.onReset(); }
    function visParams() { spec.params.forEach(q => { const el = ctl.box.querySelector(`[data-k="${q.id}"]`); if (el) el.closest('.kx-range').hidden = q.show ? !q.show(p) : false; }); }
    function onParam(id, v) { p[id] = v; if (st.chal && !st.chal.done && st.chal.lock.includes(id)) { ctl.set(id, st.chal.p[id]); p[id] = st.chal.p[id]; return; }
      visParams(); const live = spec.live && (spec.live === true || spec.live.includes(id)); if (spec.onParam) spec.onParam(id, v, st.s, p, lab); if (!live) { reinit(); } if (S && W.rebuild && (!spec.rebuildOn || spec.rebuildOn.includes(id))) W.rebuild(p); sync(); }
    function onBar(id, v) {
      if (id === 'play') { if (st.running) pause(); else play(); }
      if (id === 'step') { pause(); advance(1 / 30); sync(); }
      if (id === 'reset') { pause(); reinit(); sync(); }
      if (id === 'speed') st.speed = v;
      if (id === 'cam') setCam(v);
      if (id === 'camreset') { bar.set('cam', 'free'); setCam('free', true); }
      if (id in st.show) { st.show[id] = v; sync(); }
    }
    function play() { if (spec.done && spec.done(st.s, p)) reinit(); st.running = true; if (S) { S.force = true; S.start(); } else if (L2) L2.start(); playBtn.textContent = T('Pause', 'إيقاف'); c.onChange && c.onChange(); }
    function pause() { st.running = false; if (S) S.force = false; playBtn.textContent = T('Play', 'تشغيل'); c.onChange && c.onChange(); }
    const ts = () => (spec.timeScale ? spec.timeScale(p) : 1);
    function advance(dt) { const n = clock.run(dt * ts(), h => { const r = spec.step(st.s, p, h, lab); st.t = typeof st.s.t === 'number' ? st.s.t : st.t + h; return r; }, spec.maxSteps || 4000);
      if (n) { const ph = spec.phase ? spec.phase(st.s, p) : null; if (ph !== st.phase) { const was = st.phase; st.phase = ph; event(was, ph); }
        st.gT += n * clock.h; if (spec.graph && spec.graph.sample && st.gT >= (spec.graph.dt || 1 / 30) * ts()) { st.gT = 0; st.hist.push(spec.graph.sample.call(spec, st.s, p, st.t)); if (st.hist.length > 900) st.hist.shift(); } }
      if (spec.done && spec.done(st.s, p) && st.running) { pause(); } return n; }
    function event(was, ph) { const fp = spec.focus(st.s, p); if (S && spec.fx && spec.fx[ph]) burst(fp, spec.fx[ph]); if (spec.onPhase) spec.onPhase(was, ph, st.s, p, lab); }

    // ---------- 3D ----------
    let S = null, W = {}, M = null, env = null, trailN = 0; const AR = {}, LB = {};
    const ok3d = LS.has3d();
    if (!ok3d) fallback.textContent = T('3D is not available on this device — the same physics still drives every number, the free-body diagram and the graph.', 'ثلاثي الأبعاد غير متاح — الفيزياء نفسها تعمل في الأرقام والرسم.');
    const sc = Object.assign({ cls: 'cm-3d', bg: 0x0b1020, fog: [0x0b1020, 40, 120], cam: [7, 4.5, 8], target: [0, 0.8, 0], shadows: true, aspect: 0.5, maxPolar: Math.PI * 0.495, minDist: 1, maxDist: 80, exposure: 1.05, label: spec.title + ' — ' + T('3D model', 'نموذج ثلاثي الأبعاد') }, spec.scene || {});
    if (ok3d) LS.scene3d(stageHost, sc).then(async s => { if (!host.isConnected) { s.destroy(); return; } S = s; const THREE = S.THREE; M = kit(THREE);
      try { const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'); if (!S.alive) return; const pm = new THREE.PMREMGenerator(S.renderer); env = pm.fromScene(new RoomEnvironment(), 0.04).texture; S.scene.environment = env; S.scene.environmentIntensity = spec.envK || 0.55; pm.dispose(); } catch (e) { /* lighting still works without reflections */ }
      if (spec.floor !== false) floor(THREE); const gh = new THREE.GridHelper(spec.gridSize || 20, spec.gridN || 20, 0x7aa2ff, 0x3a4a72); gh.material.transparent = true; gh.material.opacity = 0.45; gh.position.y = (spec.floorY || 0) + 0.004; S.scene.add(gh); W._grid = gh;
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * 600), 3)); tg.setDrawRange(0, 0); const tl = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: spec.trailCol || 0x8fd8ff, transparent: true, opacity: 0.75 })); tl.frustumCulled = false; S.scene.add(tl); W._trail = tl;
      Object.assign(W, spec.build({ THREE, S, M, p, lab, COL, floor: W._floor, grid: W._grid }) || {});
      S.tick = tick; S.cv.addEventListener('keydown', key); if (drv) { S.cv.addEventListener('keyup', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') drv.release(); }); S.cv.addEventListener('blur', () => drv.release()); } if (spec.cam0) bar.set('cam', spec.cam0); setCam(spec.cam0 || 'free', true); sync(); if (!c.reduced && spec.autoplay !== false) play(); });
    function floor(THREE) { const fc = document.createElement('canvas'); fc.width = fc.height = 512; const fg = fc.getContext('2d'); const gr = fg.createRadialGradient(256, 256, 20, 256, 256, 360); gr.addColorStop(0, '#222b40'); gr.addColorStop(1, '#141a28'); fg.fillStyle = gr; fg.fillRect(0, 0, 512, 512);
      fg.strokeStyle = 'rgba(150,180,240,.10)'; fg.lineWidth = 2; for (let i = 0; i <= 512; i += 32) { fg.beginPath(); fg.moveTo(i, 0); fg.lineTo(i, 512); fg.moveTo(0, i); fg.lineTo(512, i); fg.stroke(); }
      const t = new THREE.CanvasTexture(fc); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(spec.floorRep || 10, spec.floorRep || 10); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      const fl = new THREE.Mesh(new THREE.CircleGeometry(spec.floorR || 60, 64), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0.05 })); fl.rotation.x = -Math.PI / 2; fl.position.y = spec.floorY || 0; fl.receiveShadow = true; S.scene.add(fl); W._floor = fl; }
    function arrow(k, col, r) { if (!AR[k]) { AR[k] = LS.arrow3d(S.THREE, col, r || spec.arrowR || 0.035); S.scene.add(AR[k]); } return AR[k]; }
    function label(k, text, col) { const key = k + '|' + text; if (!LB[key]) { Object.keys(LB).filter(x => x.startsWith(k + '|')).forEach(x => { S.scene.remove(LB[x]); LB[x].material.map.dispose(); LB[x].material.dispose(); delete LB[x]; }); LB[key] = LS.label3d(S.THREE, text, { h: spec.labelH || 0.26, color: col ? hex(col) : '#fff', depthTest: false }); S.scene.add(LB[key]); } return LB[key]; }
    function burst(at, col) { const THREE = S.THREE, m = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.09, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })); m.position.set(at[0], at[1], at[2]); m.lookAt(S.camera.position); S.scene.add(m); st.fx.push({ m, t: 0 }); }
    const used = new Set();
    function drawForces() { const THREE = S.THREE; used.clear(); const fp = spec.focus(st.s, p), at = new THREE.Vector3(...fp), Fs = (spec.forces ? spec.forces(st.s, p) : []).filter(F => F && Math.hypot(...F.v) > 1e-9), sc0 = spec.fscale ? spec.fscale(p) : 1 / (9.81 * (p.m || 1)), Lk = spec.flen || 1.1;
      const len = v => Math.min(spec.fmax || 3.2, Math.hypot(...v) * sc0 * Lk);
      if (st.show.forces) { Fs.forEach(F => { const v = new THREE.Vector3(...F.v), from = F.at ? new THREE.Vector3(...F.at) : at.clone(); const a = arrow(F.k, F.col || COL[F.k] || 0xffffff, F.pseudo ? 0.028 : undefined); a.set(from, v, len(F.v)); used.add(F.k);
          if (st.show.labels) { const lb = label(F.k, F.label || F.k, F.col || COL[F.k]); lb.position.copy(from).addScaledVector(v.normalize(), len(F.v) + 0.18); lb.visible = true; used.add('L:' + F.k); } });
        if (spec.net !== false) { const real = Fs.filter(F => !F.pseudo && !F.comp), net = real.reduce((s0, F) => s0.add(new THREE.Vector3(...F.v)), new THREE.Vector3()), incl = spec.netWithPseudo && spec.netWithPseudo(p) ? Fs.filter(F => F.pseudo).reduce((s0, F) => s0.add(new THREE.Vector3(...F.v)), net.clone()) : net;
          if (incl.length() * sc0 * Lk > 0.02) { const off = spec.netAt ? new THREE.Vector3(...spec.netAt(st.s, p)) : at.clone().add(new THREE.Vector3(0, spec.netDy == null ? 0.0 : spec.netDy, 0)); const a = arrow('net', COL.net, 0.05); a.set(off, incl.clone(), len(incl.toArray())); used.add('net');
            if (st.show.labels) { const lb = label('net', spec.netLabel ? spec.netLabel(p) : T('net = m v²/r', 'المحصلة = m v²/r'), COL.net); lb.position.copy(off).addScaledVector(incl.clone().normalize(), len(incl.toArray()) + 0.2); used.add('L:net'); } } }
        if (st.show.comp && spec.basis) { const B = spec.basis(st.s, p), bx = new THREE.Vector3(...B.x), by = new THREE.Vector3(...B.y); Fs.filter(F => !F.comp).forEach(F => { const v = new THREE.Vector3(...F.v), cx = v.dot(bx), cy = v.dot(by), from = F.at ? new THREE.Vector3(...F.at) : at.clone();
          [[cx, bx, 'x'], [cy, by, 'y']].forEach(([cc, b, n]) => { if (Math.abs(cc) * sc0 * Lk < 0.03) return; const a = arrow(F.k + n, F.col || COL[F.k] || 0xffffff, 0.016); a.set(from, b.clone().multiplyScalar(Math.sign(cc)), Math.abs(cc) * sc0 * Lk); used.add(F.k + n); }); }); } }
      if (st.show.vel && spec.vel) { const v = spec.vel(st.s, p), sp = Math.hypot(...v); if (sp > 1e-6) { const a = arrow('v', COL.v, 0.028); a.set(at.clone(), new THREE.Vector3(...v), Math.min(3, sp * (spec.vscale ? spec.vscale(p) : 0.25))); used.add('v'); if (st.show.labels) { const lb = label('v', 'v', COL.v); lb.position.copy(at).addScaledVector(new THREE.Vector3(...v).normalize(), Math.min(3, sp * (spec.vscale ? spec.vscale(p) : 0.25)) + 0.16); used.add('L:v'); } } }
      Object.keys(AR).forEach(k => { AR[k].visible = used.has(k) && AR[k].visible; if (!used.has(k)) AR[k].visible = false; });
      Object.entries(LB).forEach(([k, s0]) => { s0.visible = used.has('L:' + k.split('|')[0]); }); }
    function trail() { const tl = W._trail; tl.visible = st.show.trail; if (!st.show.trail) return; const fp = spec.trailPos ? spec.trailPos(st.s, p) : spec.focus(st.s, p); if (!fp) return; const a = tl.geometry.attributes.position.array, N = 600;
      if (trailN > 0) { const j = ((trailN - 1) % N) * 3; if (Math.hypot(a[j] - fp[0], a[j + 1] - fp[1], a[j + 2] - fp[2]) < (spec.trailStep || 0.03)) return; }
      if (trailN >= N) { a.copyWithin(0, 3); a.set(fp, (N - 1) * 3); } else a.set(fp, trailN * 3); trailN = Math.min(N, trailN + 1); tl.geometry.setDrawRange(0, trailN); tl.geometry.attributes.position.needsUpdate = true; }
    const cams = () => Object.assign({ free: { pos: sc.cam, target: sc.target }, side: { pos: [0, 1.2, 9], target: [0, 1, 0] }, top: { pos: [0, 12, 0.01], target: [0, 0, 0] } }, spec.cams ? spec.cams(p) : {});
    function setCam(k, now) { st.cam = k; if (!S) return; S.controls.enabled = k !== 'follow'; if (k === 'follow') return; const C = cams()[k]; S.fly(C.pos, C.target, now ? 0 : 900); }
    const camV = { p: null, q: null };
    function follow(dt) { const THREE = S.THREE, fp = new THREE.Vector3(...spec.focus(st.s, p)); let pos; const F = spec.follow ? spec.follow(st.s, p) : null;
      if (F && F.pos) pos = new THREE.Vector3(...F.pos); else { const v = spec.vel ? new THREE.Vector3(...spec.vel(st.s, p)) : new THREE.Vector3(1, 0, 0); v.y = 0; if (v.lengthSq() < 1e-8) v.set(1, 0, 0); v.normalize(); const o = (F && F.off) || [3.2, 1.6]; pos = fp.clone().addScaledVector(v, -o[0]); pos.y += o[1]; }
      const tgt = F && F.target ? new THREE.Vector3(...F.target) : fp; const k = dt ? 1 - Math.exp(-dt * 5) : 1; S.camera.position.lerp(pos, k); S.controls.target.lerp(tgt, k); S.camera.lookAt(S.controls.target); }
    function pose() { if (!S) return; if (spec.pose) spec.pose(W, st.s, p, { THREE: S.THREE, S, M, lab, show: st.show, t: st.t }); if (W._grid) W._grid.visible = st.show.grid; drawForces(); trail(); }
    function tick(dt) { if (drv) drv.frame(dt); if (st.running) advance(dt * st.speed); pose(); if (st.cam === 'follow') follow(st.running ? dt : 0);
      st.fx = st.fx.filter(x => { x.t += dt || 0.016; const k = x.t / 0.7; x.m.scale.setScalar(1 + k * 9); x.m.material.opacity = 0.9 * (1 - k); if (k >= 1) { S.scene.remove(x.m); x.m.geometry.dispose(); x.m.material.dispose(); return false; } return true; });
      st.uiT += dt; if (st.uiT > 0.1 || !st.running) { st.uiT = 0; ui(); } return st.running || st.fx.length > 0 || !!st.pedal || st.cam === 'follow' && st.running; }
    // keyboard on the 3D view: Space play/pause · S step · R reset · F forces · L labels · T trail · 1–4 views
    function key(e) { const k = e.key.toLowerCase(); let used0 = true; if (k === ' ') onBar('play'); else if (k === 's') onBar('step'); else if (k === 'r') onBar('reset'); else if (k === 'f') { bar.set('forces', !st.show.forces); onBar('forces', !st.show.forces); } else if (k === 'l') { bar.set('labels', !st.show.labels); onBar('labels', !st.show.labels); } else if (k === 't') { bar.set('trail', !st.show.trail); onBar('trail', !st.show.trail); } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && drv) { if (!e.repeat) drv.press(e.key === 'ArrowUp' ? 1 : -1); } else if (/^[1-4]$/.test(k)) { const v = ['free', 'side', 'top', 'follow'][+k - 1]; bar.set('cam', v); setCam(v); } else used0 = false; if (used0) e.preventDefault(); }

    // ---------- panels ----------
    function ui() { const s = st.s, hide = st.hide;
      const rows = spec.read(s, p, st.t); $('.cm-read').innerHTML = hide ? `<p class="cm-hidden">${T('Hidden until you lock in your prediction.', 'مخفي حتى تثبّت توقعك.')}</p>` : `<table>${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>`;
      $('.cm-eq').innerHTML = hide ? `<p class="cm-hidden">${T('Hidden until you lock in your prediction.', 'مخفي حتى تثبّت توقعك.')}</p>` : spec.formulas(s, p).map(l => `<p class="cm-eq__l">${l}</p>`).join('');
      const why = spec.why ? spec.why(s, p) : ''; $('.cm-why').innerHTML = hide ? '' : (LS.inline ? LS.inline(why) : esc(why)).replace(/&lt;(\/?)sub&gt;/g, '<$1sub>');
      const S0 = spec.status ? spec.status(s, p) : null; hud.querySelector('.cm-hud__t').textContent = `t = ${f(st.t, 2)} s${spec.timeScale ? ' · ' + T('time ×', 'الزمن ×') + f(ts(), 0) : ''}${st.speed !== 1 ? ' · ' + st.speed + '×' : ''}`;
      const hs = hud.querySelector('.cm-hud__s'); hs.textContent = S0 ? S0.t : ''; hs.dataset.k = S0 ? S0.k : ''; hs.hidden = !S0 || hide; $('.cm-card--fbd').classList.toggle('is-hidden', hide); $('.cm-card--graph').classList.toggle('is-hidden', hide);
      if (S) S.cv.setAttribute('aria-label', spec.title + '. ' + (S0 ? S0.t + '. ' : '') + rows.map(r => LS.plain ? LS.plain(r[0] + ' ' + r[1]) : '').join('; ').replace(/<[^>]+>/g, '').slice(0, 400));
      if (drv) { drv.marks(); drv.frame(0); } fbd(); graph(); invest(); }
    function fbd() { const g = FB.g; FB.clear(); const P0 = K.pal(); if (!spec.basis) return; const B = spec.basis(st.s, p), Fs = (spec.forces ? spec.forces(st.s, p) : []).filter(F => F && Math.hypot(...F.v) > 1e-9);
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], W0 = 340, H0 = 260, cx = W0 / 2, cy = H0 / 2 + 6; const pts = Fs.map(F => [dot(F.v, B.x), dot(F.v, B.y), F]);
      const real = Fs.filter(F => !F.pseudo), withPs = spec.netWithPseudo && spec.netWithPseudo(p), net = (withPs ? Fs : real).reduce((s0, F) => [s0[0] + dot(F.v, B.x), s0[1] + dot(F.v, B.y)], [0, 0]);
      const mx = Math.max(1e-9, ...pts.map(q => Math.hypot(q[0], q[1])), Math.hypot(...net)), k = 95 / mx;
      g.strokeStyle = P0.line; g.lineWidth = 1; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(16, cy); g.lineTo(W0 - 16, cy); g.moveTo(cx, 14); g.lineTo(cx, H0 - 10); g.stroke(); g.setLineDash([]);
      K.text(g, B.xl || T('towards centre →', 'نحو المركز ←'), W0 - 14, cy - 8, { a: 'right', s: 11, c: P0.muted }); K.text(g, B.yl || T('up ↑', 'أعلى ↑'), cx + 6, 22, { s: 11, c: P0.muted });
      const ar = (x, y, col, dash, lbl) => { const ex = cx + x * k, ey = cy - y * k, L = Math.hypot(ex - cx, ey - cy); if (L < 2) return; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3; g.setLineDash(dash ? [6, 5] : []); g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]); const a = Math.atan2(ey - cy, ex - cx); g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - 11 * Math.cos(a - 0.4), ey - 11 * Math.sin(a - 0.4)); g.lineTo(ex - 11 * Math.cos(a + 0.4), ey - 11 * Math.sin(a + 0.4)); g.closePath(); g.fill(); K.tag(g, lbl, ex + 8 * Math.cos(a) - (Math.cos(a) < 0 ? 30 : 0), ey + 12 * Math.sin(a) + 4, col); };
      pts.forEach(([x, y, F]) => ar(x, y, hex(F.col || COL[F.k] || 0xffffff).replace('#ffffff', P0.ink), F.pseudo, (F.label || F.k) + ' ' + f(Math.hypot(x, y), Math.hypot(x, y) < 10 ? 2 : 0) + ' N'));
      if (spec.net !== false && Math.hypot(...net) * k > 2) ar(net[0], net[1], P0.ink, true, (withPs ? T('net (rotating frame)', 'المحصلة (إطار دوّار)') : T('net', 'المحصلة')) + ' ' + f(Math.hypot(...net), Math.hypot(...net) < 10 ? 2 : 0) + ' N');
      g.fillStyle = P0.ink; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill();
      $('.cm-fbd__k').textContent = withPs ? T('Rotating frame: the dashed pink arrow is a pseudo-force (it exists only because the frame rotates). With it, the forces balance at rest in that frame.', 'إطار دوّار: السهم الوردي المتقطع قوة وهمية.') : T('Solid arrows are real forces. The dashed arrow is their resultant — the net force, which points to the centre and equals m v²/r. It is not an extra force.', 'الأسهم الصلبة قوى حقيقية؛ المتقطع محصلتها نحو المركز ويساوي m v²/r وليس قوة إضافية.');
      FB.cv.setAttribute('aria-label', T('Free-body diagram: ', 'مخطط الجسم الحر: ') + pts.map(([x, y, F]) => `${F.label || F.k} ${f(Math.hypot(x, y), 1)} N`).join(', ')); }
    function graph() { if (!spec.graph) { $('.cm-card--graph').hidden = true; return; } const G = spec.graph, g = GR.g; GR.clear(); const P0 = K.pal(), h = st.hist, cols = [P0.blue, P0.gold, P0.red, P0.green, P0.violet];
      if (G.draw) { G.draw(g, K, st.s, p, h, P0); return; }
      const xr = G.xr ? G.xr(p, h) : [h.length ? h[0][0] : 0, Math.max(h.length ? h[h.length - 1][0] : 1, (h.length ? h[0][0] : 0) + 1)]; let yr = G.yr ? G.yr(p, h) : null;
      if (!yr) { let lo = 0, hi = 1e-9; h.forEach(r => r.slice(1).forEach(y => { if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } })); yr = [lo, hi * 1.1 || 1]; }
      const A = K.axes(g, [52, 14, 570, 180], xr, yr, { xl: G.xl, yl: G.yl, dec: G.dec == null ? 1 : G.dec });
      (G.series || []).forEach((sr, j) => { g.strokeStyle = sr.col || cols[j]; g.lineWidth = 2.4; g.beginPath(); let on = false; h.forEach(r => { const y = r[j + 1]; if (!Number.isFinite(y)) { on = false; return; } const X = A.X(r[0]), Y = A.Y(Math.max(yr[0], Math.min(yr[1], y))); on ? g.lineTo(X, Y) : g.moveTo(X, Y); on = true; }); g.stroke(); K.text(g, sr.label, 600, 24 + j * 16, { a: 'right', s: 12, c: sr.col || cols[j], w: 700 }); });
      if (G.ref) G.ref(g, A, p, P0); GR.cv.setAttribute('aria-label', (G.title || 'Graph') + ': ' + (G.series || []).map(s0 => s0.label).join(', ')); }
    function invest() { const L = $('.cm-inv'); const list = spec.invest || []; list.forEach((q, i) => { if (!st.inv[i] && q.done && q.done(st.s, p, st)) st.inv[i] = true; }); const cur = list.findIndex((q, i) => !st.inv[i]);
      const html = list.map((q, i) => `<li class="${st.inv[i] ? 'is-done' : i === cur ? 'is-cur' : ''}"><i aria-hidden="true">${st.inv[i] ? '✓' : i + 1}</i><span>${(LS.inline ? LS.inline(q.t) : esc(q.t)).replace(/&lt;(\/?)sub&gt;/g, '<$1sub>')}</span></li>`).join('') + (cur < 0 && list.length ? `<li class="is-done cm-inv__end"><i>★</i><span>${T('Investigation complete.', 'اكتمل الاستقصاء.')}</span></li>` : '');
      if (L.innerHTML !== html) L.innerHTML = html; }
    // ---------- prediction challenge ----------
    let seed = 1 + Math.floor(Math.random() * 1e6);
    function chalUI() { const box = $('.cm-chal'), ch = spec.challenge; if (!ch) { $('.cm-card--chal').hidden = true; return; } const C0 = st.chal;
      if (!C0) { box.innerHTML = `<p>${T('Predict a result from the physics before the simulation shows it. The live values hide until you commit.', 'توقّع النتيجة قبل أن تظهرها المحاكاة.')}</p><button type="button" class="ls-btn ls-btn--sm ls-btn--accent" data-cm="chal">${T('Start a challenge', 'ابدأ تحدياً')}</button>`; return; }
      if (!C0.done) { box.innerHTML = `<p class="cm-chal__q">${C0.q}</p><label class="cm-chal__in"><span>${T('Your prediction', 'توقعك')}</span><input type="number" step="any" inputmode="decimal" data-cm="pred" aria-label="${T('Your prediction', 'توقعك')}"> <b>${C0.unit}</b></label><p class="ls-row"><button type="button" class="ls-btn ls-btn--sm ls-btn--accent" data-cm="lock">${T('Lock in and run', 'ثبّت وشغّل')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-cm="quit">${T('Cancel', 'إلغاء')}</button></p><p class="cm-small cm-chal__msg" role="status"></p>`; return; }
      const err = Math.abs(C0.pred - C0.ans) / Math.max(1e-9, Math.abs(C0.ans)), good = err <= C0.tol;
      box.innerHTML = `<p class="cm-chal__q">${C0.q}</p><p>${T('You predicted', 'توقعت')} <b>${f(C0.pred, 3)} ${C0.unit}</b>. ${T('The physics gives', 'الفيزياء تعطي')} <b>${f(C0.ans, 3)} ${C0.unit}</b> (${T('off by', 'بفارق')} ${f(err * 100, 1)}%).</p><p class="cm-verdict ${good ? 'is-ok' : 'is-no'}">${good ? T('Within tolerance — well reasoned.', 'ضمن السماحية — تفكير جيد.') : T('Outside the ±' + Math.round(C0.tol * 100) + '% tolerance — compare your working with the formula panel.', 'خارج السماحية — قارن مع المعادلات.')}</p>${C0.explain ? `<p class="cm-small">${C0.explain}</p>` : ''}<button type="button" class="ls-btn ls-btn--sm" data-cm="chal">${T('Next challenge', 'التحدي التالي')}</button>`; }
    grid.addEventListener('click', e => { const b = e.target.closest('[data-cm]'); if (!b) return; const a = b.dataset.cm;
      if (a === 'chal') { const rnd = E.rng(seed++), C0 = spec.challenge.make(rnd, p); pause(); Object.entries(C0.p).forEach(([k, v]) => { p[k] = v; ctl.set(k, v); }); visParams(); reinit(); if (S && W.rebuild) W.rebuild(p); st.chal = Object.assign({ lock: Object.keys(C0.p), tol: 0.05, done: false }, C0); st.hide = true; ctl.box.classList.add('is-locked'); sync(); chalUI(); }
      if (a === 'lock') { const v = parseFloat(String(grid.querySelector('[data-cm="pred"]').value).replace(',', '.')); if (!Number.isFinite(v)) { grid.querySelector('.cm-chal__msg').textContent = T('Type a number first.', 'اكتب رقماً أولاً.'); return; } st.chal.pred = v; st.chal.done = true; st.hide = false; ctl.box.classList.remove('is-locked'); if (st.chal.after) { Object.entries(st.chal.after).forEach(([k, x]) => { p[k] = x; ctl.set(k, x); }); visParams(); reinit(); if (S && W.rebuild) W.rebuild(p); } chalUI(); if (spec.onResult) spec.onResult(st.chal); play(); sync(); }
      if (a === 'quit') { st.chal = null; st.hide = false; ctl.box.classList.remove('is-locked'); chalUI(); sync(); } });
    grid.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-cm="pred"]')) { e.preventDefault(); grid.querySelector('[data-cm="lock"]').click(); } });

    function sync() { pose(); ui(); if (S) S.render(); }
    FB.onresize = fbd; GR.onresize = graph;
    // no WebGL: the same fixed-step physics runs on a plain loop
    let L2 = null; if (!ok3d) { L2 = c.looper(host, dt => { if (drv) drv.frame(dt); if (st.running) advance(dt * st.speed); st.uiT += dt; if (st.uiT > 0.1) { st.uiT = 0; ui(); } if (!st.running) L2.stop(); }); }
    reinit(); visParams(); chalUI(); ui(); if (!ok3d && !c.reduced && spec.autoplay !== false) play();

    const api = { play, pause, running: () => st.running, reset() { pause(); reinit(); sync(); },
      destroy() { if (S) { if (env) env.dispose(); S.destroy(); } if (L2) L2.destroy(); FB.destroy(); GR.destroy(); },
      observe() { const o = spec.observe ? spec.observe(st.s, p, st) : null; return o || { text: spec.title + ': ' + spec.read(st.s, p, st.t).map(r => r[0] + ' ' + r[1]).join(', ').replace(/<[^>]+>/g, '') }; },
      preset() { if (spec.preset) { Object.entries(spec.preset).forEach(([k, v]) => { p[k] = v; ctl.set(k, v); }); visParams(); reinit(); if (S && W.rebuild) W.rebuild(p); sync(); } },
      _state: () => Object.assign({ t: st.t, running: st.running, phase: st.phase, has3d: !!S, p: Object.assign({}, p), inv: Object.keys(st.inv).length, cam: st.cam, chal: st.chal && { done: st.chal.done, ans: st.chal.ans, pred: st.chal.pred }, hide: st.hide }, spec.state ? spec.state(st.s, p) : {}),
      _set(o) { if (o.p) { Object.entries(o.p).forEach(([k, v]) => { p[k] = v; ctl.set(k, v); }); visParams(); if (!o.keep) reinit(); if (S && W.rebuild) W.rebuild(p); } if (o.run != null) { pause(); for (let left = o.run; left > 1e-12; left -= 0.5) advance(Math.min(0.5, left)); } if (o.speed) st.speed = o.speed; if (o.show) Object.assign(st.show, o.show); if (o.cam) { bar.set('cam', o.cam); setCam(o.cam, true); } sync(); return api._state(); },
      _sim: () => st.s, _snap: () => { if (!S) return null; pose(); if (st.cam === 'follow') follow(0); S.renderer.render(S.scene, S.camera); return S.cv.toDataURL('image/jpeg', 0.85); }, _fps: () => (S ? S.fps() : null), _bench: ms => (S ? S.bench(ms) : null), _lab: lab };
    lab.api = api; return api;
  };
})();
