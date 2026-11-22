/* ERLY Learning Studio 2.0 — SOLAR SYSTEM EXPLORER (three.js), used full-screen at #/space and as a compact live
   scene on the Studio home.

   Data: NASA Planetary Fact Sheet (mean radius, mean distance from the Sun, orbital period, length of day, axial tilt,
   mean temperature, surface gravity, known moons; moon counts change as new ones are confirmed — the year is stated).
   What is real and what is scaled — stated on screen too:
     • orbital SPEEDS are real relative to one another (angular speed ∝ 1 / orbital period); the clock is sped up;
     • axial tilts and spin directions (Venus and Uranus retrograde) are real;
     • SIZES and DISTANCES are compressed (sizes ∝ radius^0.45, distances ∝ √AU) — at true scale the planets would be
       invisible dots; a "true size" layer shows the real radius ratios side by side.
   Textures are generated procedurally (value-noise fbm) so nothing is downloaded: Mercury's craters, Venus's clouds,
   Earth's oceans/continents/ice/clouds, Mars's dark plains and polar cap, Jupiter's bands and Great Red Spot, Saturn's
   bands and rings with the Cassini division, Uranus's pale cyan, Neptune's deep blue and dark spot. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc;
  const PL = [ // name, radius km, a AU, period d, day h (− = retrograde), tilt °, temp °C, g m/s², moons
    ['Mercury', 2439.7, 0.387, 88.0, 4222.6, 0.03, 167, 3.7, 0, 'The smallest planet and closest to the Sun; no real atmosphere, so its temperature swings from about 430 °C by day to −180 °C at night.'],
    ['Venus', 6051.8, 0.723, 224.7, -2802.0, 177.4, 464, 8.9, 0, 'Wrapped in thick carbon-dioxide clouds; the runaway greenhouse makes it the hottest planet. It spins backwards, very slowly.'],
    ['Earth', 6371.0, 1.0, 365.2, 24.0, 23.4, 15, 9.8, 1, 'The only world known to have life and liquid water on its surface. Its 23.4° tilt gives us seasons.'],
    ['Mars', 3389.5, 1.524, 687.0, 24.7, 25.2, -65, 3.7, 2, 'A cold desert with iron-oxide dust, the tallest volcano (Olympus Mons) and polar ice caps.'],
    ['Jupiter', 69911, 5.203, 4331, 9.9, 3.1, -110, 23.1, 95, 'The largest planet — a gas giant more than twice as massive as all the others combined. The Great Red Spot is a storm larger than Earth.'],
    ['Saturn', 58232, 9.537, 10747, 10.7, 26.7, -140, 9.0, 146, 'Famous for its rings of ice and rock; less dense than water on average.'],
    ['Uranus', 25362, 19.19, 30589, -17.2, 97.8, -195, 8.7, 28, 'An ice giant tipped on its side, so each pole has about 42 years of continuous daylight and then darkness.'],
    ['Neptune', 24622, 30.07, 59800, 16.1, 28.3, -200, 11.0, 16, 'The farthest planet, with the fastest winds measured in the Solar System (over 2 000 km/h).']
  ].map(([n, r, a, per, day, tilt, temp, g, moons, about]) => ({ n, r, a, per, day, tilt, temp, g, moons, about }));
  LS.planets = PL;
  const SUN_R_KM = 695700; const fmtN = (v, d) => Number(v).toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
  const vizR = p => 0.18 * Math.pow(p.r / 2439.7, 0.45), vizA = p => 3.2 + 7.2 * Math.sqrt(p.a);
  // ---------- procedural textures ----------
  function tex(THREE, w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, gg, b, a] = fn(x / w, y / h); const i = (y * w + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a == null ? 255 : a; } g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t), cl = v => Math.max(0, Math.min(1, v));
  const N = (u, v, s, sc, o) => LS.sphereNoise(u, v, s, sc, o);
  const SURF = {
    Mercury: (u, v) => { const n = N(u, v, 3, 8, 5), cr = N(u, v, 9, 22, 3); const k = 0.45 + n * 0.45 - (cr > 0.62 ? 0.18 : 0); return mix([92, 88, 84], [180, 172, 162], cl(k)); },
    Venus: (u, v) => { const n = N(u * 0.5 + v * 0.1, v, 4, 5, 5), b = Math.sin(v * 18 + n * 6) * 0.5 + 0.5; return mix([196, 154, 92], [238, 214, 160], cl(0.35 + 0.4 * b + 0.25 * n)); },
    Earth: (u, v) => { const lat = Math.abs(v - 0.5) * 2, n = N(u, v, 2, 4, 6); if (lat > 0.86 - n * 0.08) return [236, 242, 248]; const land = n > 0.53; if (land) { const dry = N(u, v, 6, 10, 3), green = lat < 0.35 && dry > 0.5 ? [196, 172, 110] : [64 + dry * 60, 110 + dry * 40, 52]; return mix(green, [140, 120, 90], cl((n - 0.53) * 3)); } return mix([12, 46, 110], [32, 96, 168], cl((n - 0.3) * 3)); },
    Mars: (u, v) => { const lat = Math.abs(v - 0.5) * 2, n = N(u, v, 5, 5, 6); if (lat > 0.9) return [240, 232, 226]; return mix([118, 52, 30], [206, 110, 62], cl(0.3 + n * 0.9 - (N(u, v, 11, 3, 3) > 0.62 ? 0.3 : 0))); },
    Jupiter: (u, v) => { const n = N(u, v, 7, 6, 4), b = Math.sin((v + n * 0.04) * 40) * 0.5 + 0.5; let c = mix([150, 110, 80], [236, 220, 196], b); const dx = (u - 0.65) / 0.07, dy = (v - 0.62) / 0.035, d = dx * dx + dy * dy; if (d < 1) c = mix([196, 90, 60], c, d * d); return c; },
    Saturn: (u, v) => { const n = N(u, v, 8, 5, 3), b = Math.sin((v + n * 0.02) * 30) * 0.5 + 0.5; return mix([196, 164, 110], [236, 218, 172], b); },
    Uranus: (u, v) => { const b = Math.sin(v * 12) * 0.04; return mix([140, 206, 214], [176, 226, 232], cl(0.5 + b + N(u, v, 12, 4, 3) * 0.1)); },
    Neptune: (u, v) => { const n = N(u, v, 13, 5, 4), b = Math.sin((v + n * 0.05) * 16) * 0.5 + 0.5; let c = mix([30, 64, 170], [72, 120, 220], b * 0.6 + n * 0.4); const dx = (u - 0.3) / 0.05, dy = (v - 0.62) / 0.03; if (dx * dx + dy * dy < 1) c = [20, 36, 110]; return c; }
  };
  function atmo(THREE, color, size, power) { // fresnel rim glow
    return new THREE.Mesh(new THREE.SphereGeometry(size, 48, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color(color) }, p: { value: power } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 c; uniform float p; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), p); gl_FragColor = vec4(c, f*0.9); }' })); }

  // ---------- the explorer ----------
  LS.solarSystem = async function (host, o = {}) {
    if (!LS.has3d()) { host.innerHTML = fallback(); return { destroy() {}, fallback: true }; }
    const compact = !!o.compact;
    const S = await LS.scene3d(host, { cls: 'sp__3d' + (compact ? ' sp__3d--compact' : ''), bg: 0x02030a, lights: false, cam: compact ? [0, 13, 26] : [0, 18, 34], fov: 42, near: 0.05, far: 900, aspect: compact ? 0.42 : 0.56, minDist: 0.6, maxDist: 120, exposure: 1.0, label: T('The Solar System, 3D. Select a planet to fly to it.', 'النظام الشمسي ثلاثي الأبعاد.') });
    const THREE = S.THREE, sc = S.scene; S.always = true;
    if (compact) { S.controls.enableZoom = false; S.controls.enablePan = false; S.controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; S.controls.autoRotateSpeed = 0.25; }
    // stars: a restrained field on a far sphere, a few brighter ones
    const sp = [], sz = []; for (let i = 0; i < 2600; i++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 400; sp.push(r * Math.sqrt(1 - u * u) * Math.cos(th), r * u, r * Math.sqrt(1 - u * u) * Math.sin(th)); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sc.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfd0ff, size: 0.9, sizeAttenuation: false, transparent: true, opacity: 0.7 })));
    // the Sun: emissive surface + soft glow sprite + point light
    const sunTex = tex(THREE, 256, 128, (u, v) => { const n = N(u, v, 21, 10, 5); return mix([255, 150, 40], [255, 236, 170], n); });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.6, 64, 32), new THREE.MeshBasicMaterial({ map: sunTex })); sc.add(sun);
    const gc = document.createElement('canvas'); gc.width = gc.height = 256; const gg = gc.getContext('2d'), grd = gg.createRadialGradient(128, 128, 0, 128, 128, 128); grd.addColorStop(0, 'rgba(255,220,150,.9)'); grd.addColorStop(0.25, 'rgba(255,170,60,.35)'); grd.addColorStop(1, 'rgba(255,140,40,0)'); gg.fillStyle = grd; gg.fillRect(0, 0, 256, 256);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); glow.scale.set(9, 9, 1); sc.add(glow);
    sc.add(new THREE.PointLight(0xfff2dd, 3.2, 0, 0.0)); sc.add(new THREE.AmbientLight(0x404a66, 0.32));
    // planets
    const W = PL.map((p, i) => {
      const R = vizR(p), A = vizA(p), orbit = new THREE.Group(); sc.add(orbit);
      const res = compact ? [192, 96] : [384, 192];
      const mat = new THREE.MeshStandardMaterial({ map: tex(THREE, res[0], res[1], SURF[p.n]), roughness: p.n === 'Earth' ? 0.7 : 0.95, metalness: 0 });
      const tilt = new THREE.Group(); tilt.rotation.z = -p.tilt * Math.PI / 180; orbit.add(tilt);
      const body = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 32), mat); tilt.add(body); body.userData.i = i;
      if (p.n === 'Earth') { const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.015, 64, 32), new THREE.MeshStandardMaterial({ map: tex(THREE, res[0], res[1], (u, v) => { const n = N(u, v, 31, 6, 5); return [255, 255, 255, n > 0.55 ? Math.min(220, (n - 0.55) * 900) : 0]; }), transparent: true, depthWrite: false })); tilt.add(clouds); body.userData.clouds = clouds; }
      if (['Earth', 'Venus', 'Uranus', 'Neptune'].includes(p.n)) tilt.add(atmo(THREE, { Earth: 0x6fb2ff, Venus: 0xffd59a, Uranus: 0x9ff0ff, Neptune: 0x5c8cff }[p.n], R * 1.12, 3.2));
      if (p.n === 'Saturn') { const rt = tex(THREE, 512, 8, u => { const r0 = u; const cassini = r0 > 0.58 && r0 < 0.63; const a = cassini ? 20 : 120 + 110 * Math.abs(Math.sin(r0 * 47)); return [222 - r0 * 40, 200 - r0 * 50, 160 - r0 * 50, r0 < 0.05 ? 0 : a]; }); const rg = new THREE.RingGeometry(R * 1.25, R * 2.3, 128, 1); const pos = rg.attributes.position, uv = rg.attributes.uv; for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), y = pos.getY(k), rr = Math.hypot(x, y); uv.setXY(k, (rr - R * 1.25) / (R * 1.05), 0.5); } const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false })); ring.rotation.x = Math.PI / 2; tilt.add(ring); }
      // orbit path
      const pts = []; for (let k = 0; k <= 256; k++) { const a = k / 256 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * A, 0, Math.sin(a) * A)); }
      const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5b6f9c, transparent: true, opacity: 0.32 })); sc.add(path);
      const label = LS.label3d(THREE, T(p.n, p.n), { h: compact ? 0.55 : 0.42, bg: 'rgba(8,12,24,.55)' }); label.material.depthTest = false; orbit.add(label);
      const ang0 = (i * 2.399963) % (Math.PI * 2); return { p, R, A, orbit, tilt, body, path, label, ang: ang0 };
    });
    const st = { speed: compact ? 6 : 20, paused: false, focus: -1, labels: !compact, orbits: true, trueSize: false };
    const place = () => W.forEach(w => { w.orbit.position.set(Math.cos(w.ang) * w.A, 0, -Math.sin(w.ang) * w.A); w.label.position.set(0, w.R * (st.trueSize ? 1 : 1) + 0.45, 0); w.label.visible = st.labels; w.path.visible = st.orbits; });
    place();
    S.tick = (dt) => { if (!st.paused) { const days = dt * st.speed; W.forEach(w => { w.ang += 2 * Math.PI * days / w.p.per; w.body.rotation.y += 2 * Math.PI * (days * 24 / w.p.day) * 0.02; if (w.body.userData.clouds) w.body.userData.clouds.rotation.y += dt * 0.02; }); sun.rotation.y += dt * 0.03; place(); }
      if (st.focus >= 0) { const w = W[st.focus], wp = w.orbit.position; const off = S.camera.position.clone().sub(S.controls.target); if (!S.__flying) { S.controls.target.copy(wp); S.camera.position.copy(wp.clone().add(off)); } } return true; };
    // picking: hover highlight + click to fly
    const bodies = W.map(w => w.body); let hover = -1;
    S.cv.addEventListener('pointermove', e => { const h = S.pick(e, bodies); const i = h ? h.object.userData.i : -1; if (i !== hover) { hover = i; S.cv.style.cursor = i >= 0 ? 'pointer' : ''; W.forEach((w, k) => { w.label.material.opacity = k === hover || st.labels ? 1 : 0; w.label.visible = st.labels || k === hover; }); o.onHover && o.onHover(i >= 0 ? W[i].p : null); } });
    S.cv.addEventListener('click', e => { const h = S.pick(e, bodies); if (h) focus(h.object.userData.i); });
    function focus(i) { if (i < 0) return reset(); st.focus = -1; const w = W[i], wp = w.orbit.position, d = Math.max(w.R * 5.5, 1.6); S.__flying = true; S.fly([wp.x + d * 0.8, wp.y + d * 0.45, wp.z + d * 0.9], [wp.x, wp.y, wp.z], 1400, () => { S.__flying = false; st.focus = i; }); o.onFocus && o.onFocus(w.p, i); }
    function reset() { st.focus = -1; S.fly(compact ? [0, 13, 26] : [0, 18, 34], [0, 0, 0], 1300); o.onFocus && o.onFocus(null, -1); }
    S.cv.addEventListener('keydown', e => { if (e.key === 'Escape') reset(); if (/^[1-8]$/.test(e.key)) focus(+e.key - 1); if (e.key === '0') reset(); });
    return { S, W, st, focus, reset, setTrueSize: on => { st.trueSize = on; W.forEach(w => { const k = on ? (0.06 * w.p.r / 2439.7) / w.R : 1; w.tilt.scale.setScalar(Math.max(0.05, k)); }); S.render(); }, set: (k, v) => { st[k] = v; place(); S.render(); }, destroy: () => S.destroy(), fps: () => S.fps() };
  };
  function fallback() { return `<div class="sp__fallback"><p>${T('3D is not available on this device. Here are the planets and their real data:', 'البيانات الحقيقية للكواكب:')}</p>${table()}</div>`; }
  function table(sel) { return `<table class="sp__table"><caption>${T('NASA Planetary Fact Sheet values (moon counts as of 2023)', 'قيم ناسا')}</caption><tr><th>${T('Planet', 'الكوكب')}</th><th>${T('Radius', 'نصف القطر')}</th><th>${T('Distance from Sun', 'البعد عن الشمس')}</th><th>${T('Year', 'السنة')}</th><th>${T('Day', 'اليوم')}</th><th>${T('Tilt', 'الميل')}</th><th>${T('Mean temp.', 'الحرارة')}</th><th>g</th><th>${T('Moons', 'الأقمار')}</th></tr>${PL.filter((p, i) => !sel || sel.includes(i)).map(p => `<tr><th scope="row">${p.n}</th><td>${LS.kit ? fmtN(p.r, 0) : p.r} km</td><td>${p.a} AU</td><td>${p.per >= 1000 ? (p.per / 365.25).toFixed(1) + ' yr' : p.per + ' d'}</td><td>${Math.abs(p.day) > 100 ? (Math.abs(p.day) / 24).toFixed(0) + ' d' : Math.abs(p.day) + ' h'}${p.day < 0 ? ' (retro.)' : ''}</td><td>${p.tilt}°</td><td>${p.temp} °C</td><td>${p.g} m/s²</td><td>${p.moons}</td></tr>`).join('')}</table>`; }
  LS.planetTable = table;

  // ---------- full-screen route #/space ----------
  LS.route('space', view => {
    view.innerHTML = `<section class="sp-page" aria-labelledby="spT"><header class="sp-head"><p class="ls-kicker">${T('Physics · Astronomy', 'فيزياء · فلك')}</p><h1 id="spT">${T('Solar System Explorer', 'مستكشف النظام الشمسي')}</h1><p class="ls-lead">${T('Drag to orbit, scroll or pinch to zoom, select a planet to fly to it. Esc or “Whole system” to return.', 'اسحب للدوران، اختر كوكباً للانتقال إليه.')}</p></header>
      <div class="sp-stage"><div class="sp-host"></div><aside class="sp-info" aria-live="polite"></aside></div>
      <div class="sp-bar" role="toolbar" aria-label="${T('Planets', 'الكواكب')}"><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-sp="-1">☉ ${T('Whole system', 'النظام كله')}</button>${PL.map((p, i) => `<button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-sp="${i}">${i + 1} ${p.n}</button>`).join('')}</div>
      <div class="sp-tools"><label class="kx-tog"><input type="checkbox" data-spl="labels" checked><span>${T('Labels', 'التسميات')}</span></label><label class="kx-tog"><input type="checkbox" data-spl="orbits" checked><span>${T('Orbits', 'المدارات')}</span></label><label class="kx-tog"><input type="checkbox" data-spl="paused"><span>${T('Pause time', 'أوقف الزمن')}</span></label><label class="kx-tog"><input type="checkbox" data-spl="true"><span>${T('True relative sizes', 'الأحجام الحقيقية')}</span></label><label class="kx-range"><span class="kx-range__t">${T('Time: days per second', 'الأيام في الثانية')}<output data-spo>20</output></span><input type="range" min="1" max="200" value="20" data-sps aria-label="${T('Days per second', 'أيام في الثانية')}"></label><label class="sp-cmp">${T('Compare with', 'قارن مع')} <select data-spc aria-label="${T('Compare with', 'قارن مع')}"><option value="">—</option>${PL.map((p, i) => `<option value="${i}">${p.n}</option>`).join('')}</select></label></div>
      <p class="v26-hint sp-scale">${T('Scale: orbital speeds and tilts are real; planet sizes and distances are compressed so you can see them (at true scale the planets would be invisible dots). Data: NASA Planetary Fact Sheet.', 'السرعات والميل حقيقية؛ الأحجام والمسافات مضغوطة.')}</p>
      <section class="ls-panel"><h2 class="ls-h2">${T('All planets', 'كل الكواكب')}</h2>${table()}</section></section>`;
    const info = view.querySelector('.sp-info'); let cur = -1, cmp = null;
    const show = (p, i) => { cur = i; view.querySelectorAll('[data-sp]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.sp === i))); if (!p) { info.innerHTML = `<h2>${T('The Solar System', 'النظام الشمسي')}</h2><p>${T('Eight planets orbit the Sun. The inner four are rocky; the outer four are giants of gas and ice. Select one to visit it.', 'ثمانية كواكب.')}</p><p class="v26-hint">${T('Sun radius', 'نصف قطر الشمس')} ${fmtN(SUN_R_KM, 0)} km — ${T('109 Earths across.', '109 أرض.')}</p>`; return; }
      const c2 = cmp != null && cmp !== i ? PL[cmp] : null; info.innerHTML = `<h2>${p.n}</h2><p>${esc(p.about)}</p><dl class="sp-dl"><dt>${T('Radius', 'نصف القطر')}</dt><dd>${fmtN(p.r, 0)} km (${fmtN(p.r / 6371, 2)} × ${T('Earth', 'الأرض')})</dd><dt>${T('From the Sun', 'من الشمس')}</dt><dd>${p.a} AU · ${fmtN(p.a * 149.6, 1)} ${T('million km', 'مليون كم')}</dd><dt>${T('Year', 'السنة')}</dt><dd>${p.per} ${T('Earth days', 'يوماً')}</dd><dt>${T('Day', 'اليوم')}</dt><dd>${Math.abs(p.day)} h${p.day < 0 ? ' ' + T('(spins backwards)', '(يدور عكسياً)') : ''}</dd><dt>${T('Axial tilt', 'الميل')}</dt><dd>${p.tilt}°</dd><dt>${T('Mean temperature', 'الحرارة')}</dt><dd>${p.temp} °C</dd><dt>${T('Surface gravity', 'الجاذبية')}</dt><dd>${p.g} m/s² (${fmtN(p.g / 9.8, 2)} g)</dd><dt>${T('Known moons', 'الأقمار')}</dt><dd>${p.moons}</dd></dl>${c2 ? `<h3>${p.n} ${T('vs', 'مقابل')} ${c2.n}</h3><p>${T('Radius', 'نصف القطر')} ${fmtN(p.r / c2.r, 2)}× · ${T('year', 'السنة')} ${fmtN(p.per / c2.per, 2)}× · ${T('gravity', 'الجاذبية')} ${fmtN(p.g / c2.g, 2)}× · ${T('Kepler: (T₁/T₂)² vs (a₁/a₂)³', 'كبلر')} = ${fmtN((p.per / c2.per) ** 2, 2)} vs ${fmtN((p.a / c2.a) ** 3, 2)}</p>` : ''}`; };
    show(null, -1);
    LS.solarSystem(view.querySelector('.sp-host'), { onFocus: show }).then(X => { LS.__space = X; if (!view.isConnected) { X.destroy(); return; }
      view.addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (b) { const i = +b.dataset.sp; if (i < 0) X.reset && X.reset(); else X.focus && X.focus(i); } });
      view.addEventListener('change', e => { const t = e.target; if (t.dataset.spl === 'labels') X.set('labels', t.checked); if (t.dataset.spl === 'orbits') X.set('orbits', t.checked); if (t.dataset.spl === 'paused') X.set('paused', t.checked); if (t.dataset.spl === 'true') X.setTrueSize(t.checked); if (t.matches('[data-spc]')) { cmp = t.value === '' ? null : +t.value; show(cur >= 0 ? PL[cur] : null, cur); } });
      view.addEventListener('input', e => { if (e.target.matches('[data-sps]')) { X.set('speed', +e.target.value); view.querySelector('[data-spo]').textContent = e.target.value; } });
      const off = () => { if (!view.isConnected || LS.current()[0] !== 'space') { X.destroy && X.destroy(); window.removeEventListener('hashchange', off); } }; window.addEventListener('hashchange', off); });
  });
})();
