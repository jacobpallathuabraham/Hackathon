/* ERLY Learning Studio 2.0 — shared 3D foundation (three.js, loaded only when a 3D experience opens).

   LS.three()            → Promise<{ THREE, OrbitControls }>, cached.
   LS.scene3d(host, o)   → a managed scene: renderer + camera + OrbitControls + soft lighting + optional shadows.
     • one requestAnimationFrame loop per scene; it stops when the canvas is off-screen, the tab is hidden, or the
       scene is destroyed (IntersectionObserver + visibilitychange) — nothing renders in the background;
     • adaptive resolution: device-pixel-ratio capped at 1.75, lowered automatically if frames take too long, raised
       again when there is headroom (measured over a rolling window of frame times);
     • fly(pos, target, ms): smooth camera flights (ease-in-out cubic) that never snap;
     • pick(e, list) / dragOnPlane(...): pointer picking and dragging that do not fight the orbit controls;
     • fps(): measured frames per second and mean frame time, for the performance report;
     • destroy(): stops the loop, disconnects observers and disposes every geometry, material and texture.
   Reduced motion: flights become instant and the scene's own `tick` receives dt = 0 when nothing is being changed. */
(function () {
  'use strict';
  const LS = window.LS; let cache = null;
  LS.three = () => cache || (cache = Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')]).then(([THREE, oc]) => ({ THREE, OrbitControls: oc.OrbitControls })));
  LS.has3d = () => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  LS.scene3d = async function (host, o = {}) {
    const { THREE, OrbitControls } = await LS.three();
    const wrap = document.createElement('div'); wrap.className = 'x3-wrap' + (o.cls ? ' ' + o.cls : ''); host.appendChild(wrap);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!o.alpha, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure || 1.05;
    if (o.shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    let dpr = Math.min(1.75, devicePixelRatio || 1); renderer.setPixelRatio(dpr);
    const cv = renderer.domElement; cv.className = 'x3-cv'; cv.tabIndex = 0; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', o.label || '3D scene'); wrap.appendChild(cv);
    const scene = new THREE.Scene(); if (o.bg) scene.background = new THREE.Color(o.bg); if (o.fog) scene.fog = new THREE.Fog(o.fog[0], o.fog[1], o.fog[2]);
    const camera = new THREE.PerspectiveCamera(o.fov || 45, 16 / 9, o.near || 0.05, o.far || 500); camera.position.set(...(o.cam || [6, 4, 8]));
    const controls = new OrbitControls(camera, cv); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.target.set(...(o.target || [0, 0, 0]));
    if (o.minDist) controls.minDistance = o.minDist; if (o.maxDist) controls.maxDistance = o.maxDist; if (o.maxPolar) controls.maxPolarAngle = o.maxPolar; controls.enablePan = o.pan !== false;
    if (o.lights !== false) { // soft studio lighting: hemisphere fill + key light (+ shadows) + rim light
      scene.add(new THREE.HemisphereLight(o.sky || 0xdfe8ff, o.ground || 0x2a2f3a, 0.75));
      const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(6, 10, 7); if (o.shadows) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -12; key.shadow.camera.right = 12; key.shadow.camera.top = 12; key.shadow.camera.bottom = -12; key.shadow.radius = 4; key.shadow.bias = -0.0004; } scene.add(key);
      const rim = new THREE.DirectionalLight(0x9fc4ff, 0.6); rim.position.set(-8, 5, -6); scene.add(rim);
    }
    const S = { THREE, scene, camera, renderer, controls, cv, wrap, tick: null, alive: true, visible: true, frames: [], last: performance.now(), dirty: true };
    const fit = () => { const w = wrap.clientWidth || 800, h = o.height ? (typeof o.height === 'function' ? o.height(w) : o.height) : Math.round(w * (o.aspect || 0.56)); renderer.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px'; camera.aspect = w / h; camera.updateProjectionMatrix(); S.dirty = true; };
    fit(); const ro = new ResizeObserver(fit); ro.observe(wrap);
    const io = new IntersectionObserver(es => { S.visible = es[0].isIntersecting; if (S.visible) start(); }, { threshold: 0.01 }); io.observe(cv);
    const vis = () => { if (!document.hidden) start(); }; document.addEventListener('visibilitychange', vis);
    controls.addEventListener('change', () => { S.dirty = true; start(); });
    let raf = 0, flight = null;
    function frame(now) {
      raf = 0; if (!S.alive || !S.visible || document.hidden) return;
      const dt = Math.min(0.05, (now - S.last) / 1000); S.last = now;
      if (flight) { const k = Math.min(1, (now - flight.t0) / flight.ms), e = ease(k); camera.position.lerpVectors(flight.p0, flight.p1, e); controls.target.lerpVectors(flight.q0, flight.q1, e); if (k >= 1) { const f = flight; flight = null; f.done && f.done(); } S.dirty = true; }
      const moved = controls.update();
      const keep = S.tick ? S.tick(reduced() && !S.force ? 0 : dt, now / 1000) : false;
      const t0 = performance.now(); renderer.render(scene, camera); const ft = performance.now() - t0;
      S.frames.push([now, ft]); if (S.frames.length > 120) S.frames.shift();
      adapt(); S.dirty = false;
      if (keep || flight || S.dirty || moved || (S.always && !reduced())) raf = requestAnimationFrame(frame); // idle scenes stop drawing
    }
    let adaptN = 0;
    function adapt() { if (++adaptN % 60 || S.frames.length < 60) return; const f = S.frames, span = (f[f.length - 1][0] - f[0][0]) / (f.length - 1);
      if (span > 22 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); fit(); } else if (span < 17.5 && dpr < Math.min(1.75, devicePixelRatio || 1)) { dpr = Math.min(Math.min(1.75, devicePixelRatio || 1), dpr + 0.25); renderer.setPixelRatio(dpr); fit(); } }
    function start() { if (!raf && S.alive) { S.last = performance.now(); raf = requestAnimationFrame(frame); } }
    S.start = start; S.render = () => { S.dirty = true; start(); };
    S.fly = (pos, target, ms = 1100, done) => { const p1 = new THREE.Vector3(...pos), q1 = new THREE.Vector3(...target); if (reduced() || ms <= 0) { camera.position.copy(p1); controls.target.copy(q1); controls.update(); S.render(); done && done(); return; } flight = { t0: performance.now(), ms, p0: camera.position.clone(), p1, q0: controls.target.clone(), q1, done }; start(); };
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    S.ndc = e => { const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); return ndc; };
    S.pick = (e, list) => { ray.setFromCamera(S.ndc(e), camera); const h = ray.intersectObjects(list, true); return h[0] || null; };
    // drag objects across a plane (default: horizontal y = 0). onMove gets the hit point; returns a cleanup
    S.dragOnPlane = (list, onStart, onMove, onEnd, plane) => { const pl = plane || new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(); let cur = null;
      const down = e => { const h = S.pick(e, list); if (!h) return; let ob = h.object; while (ob && !list.includes(ob)) ob = ob.parent; cur = ob; controls.enabled = false; cv.setPointerCapture(e.pointerId); e.preventDefault(); onStart && onStart(cur, h); };
      const move = e => { if (!cur) return; ray.setFromCamera(S.ndc(e), camera); const p = typeof pl === 'function' ? pl(cur) : pl; if (ray.ray.intersectPlane(p, hit)) { onMove(cur, hit.clone(), e); S.render(); } };
      const up = () => { if (!cur) return; const c = cur; cur = null; controls.enabled = true; onEnd && onEnd(c); S.render(); };
      cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      return () => { cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); }; };
    S.fps = () => { const f = S.frames; if (f.length < 2) return { fps: 0, ms: 0 }; const span = (f[f.length - 1][0] - f[0][0]) / (f.length - 1); return { fps: 1000 / span, ms: f.reduce((s, x) => s + x[1], 0) / f.length, dpr }; };
    S.destroy = () => { S.alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', vis); controls.dispose();
      scene.traverse(ob => { if (ob.geometry) ob.geometry.dispose(); const m = ob.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(mm => { Object.values(mm).forEach(v => { if (v && v.isTexture) v.dispose(); }); mm.dispose(); }); });
      renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); wrap.remove(); };
    start(); return S;
  };

  /* ---- small helpers shared by the labs ---- */
  // a text label as a sprite (crisp canvas texture), used sparingly
  LS.label3d = (THREE, text, o = {}) => { const c = document.createElement('canvas'), g = c.getContext('2d'), fs = o.size || 44; g.font = `700 ${fs}px Inter, ui-sans-serif, system-ui`; const w = Math.ceil(g.measureText(text).width) + 28; c.width = w; c.height = fs + 22; const g2 = c.getContext('2d'); g2.font = `700 ${fs}px Inter, ui-sans-serif, system-ui`;
    if (o.bg !== false) { g2.fillStyle = o.bg || 'rgba(12,18,32,.78)'; const r = 14; g2.beginPath(); g2.roundRect ? g2.roundRect(0, 0, w, c.height, r) : g2.rect(0, 0, w, c.height); g2.fill(); }
    g2.fillStyle = o.color || '#fff'; g2.textBaseline = 'middle'; g2.fillText(text, 14, c.height / 2 + 2); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: o.depthTest !== false, transparent: true })); const h = o.h || 0.32; s.scale.set(h * w / c.height, h, 1); s.renderOrder = 10; return s; };
  // an arrow made of a cylinder + cone (looks better than ArrowHelper lines)
  LS.arrow3d = (THREE, color, r = 0.035) => { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 }); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 16), m), head = new THREE.Mesh(new THREE.ConeGeometry(r * 3, r * 7, 20), m); g.add(shaft, head);
    g.set = (from, dir, len) => { const L = Math.max(0.001, len), hl = Math.min(L * 0.45, r * 7); g.visible = len > 1e-3; shaft.scale.set(1, Math.max(0.001, L - hl), 1); shaft.position.set(0, (L - hl) / 2, 0); head.position.set(0, L - hl / 2, 0); head.scale.set(1, hl / (r * 7), 1); g.position.copy(from); const up = new THREE.Vector3(0, 1, 0), d = dir.clone().normalize(); g.quaternion.setFromUnitVectors(up, d); };
    return g; };
  // value noise + fbm, for procedural textures (planets, terrain, materials)
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const vnoise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  LS.fbm = (x, y, s = 1, oct = 5) => { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { t += a * vnoise(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2; } return t / n; };
  // seamless (wrap in x) equirectangular noise for spheres
  LS.sphereNoise = (u, v, s, scale = 4, oct = 5) => { const th = u * Math.PI * 2, R = scale / (2 * Math.PI); return LS.fbm(Math.cos(th) * R * 2 + 50, Math.sin(th) * R * 2 + v * scale + 50, s, oct) * 0.5 + LS.fbm(Math.sin(th) * R * 2 + 90, Math.cos(th) * R * 2 + v * scale + 20, s + 3, oct) * 0.5; };
})();
