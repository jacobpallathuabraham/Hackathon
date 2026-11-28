/* ERLY Learning Studio — OUTDOOR SCENERY and VEHICLE MODELS for the circular-motion road experiments (v45).

   LS.circScenery(THREE, S, o) builds a small racing circuit around a circular road of radius r, width o.w, banked by deg:
     asphalt with aggregate grain and bump, white edge lines, red-and-white kerbs, a grass embankment (banked roads), a
     mown infield, a crash barrier with posts and boards, instanced trees with soft contact shadows, distant hills, a sky
     with sun and clouds, an OUTDOOR environment map (so paint, glass and chrome reflect sky and grass) and one sun whose
     shadow follows the vehicle (crisp, cheap: a ±20 m shadow box, 2048² map).
     .rebuild(r, deg)  reshapes everything for a new radius / bank (geometry only; textures and materials are kept)
     .update(focus)    keeps the shadow box on the vehicle
     .ground(x)        height of the ground at radius x (for cameras)
     .dispose()        frees what the scene graph does not own (the environment map)
   LS.circCar(THREE, M, paint)    a detailed coupé (≈ 4.5 m, faces −z): .wheels[i].spin, .steer
   LS.circRider(THREE, M, jersey) a road bike and rider (faces −z): .pose(crankAngle) pedals with two-bone IK

   Performance: trees, posts and shadows are instanced (one draw call each); every texture is generated once per scene
   on a canvas; the road meshes are rebuilt only when the radius or bank actually change. */
(function () {
  'use strict';
  const LS = window.LS, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function canvasTex(THREE, S, w, h, paint, rep, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(16, S.renderer.capabilities.getMaxAnisotropy ? S.renderer.capabilities.getMaxAnisotropy() : 8); if (rep) t.repeat.set(rep[0], rep[1]); return t; }

  /* ---------- textures ---------- */
  function texAsphalt(THREE, S, o) { // u across the road (0 → 1), v along it; white edge lines inside the kerbs, optional dashed centre line
    const R = rnd(7), paint = (g, w, h, bump) => { g.fillStyle = bump ? '#808080' : '#34373c'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 26000; i++) { const x = R() * w, y = R() * h, k = R(), s = 1 + R() * 2.2; g.fillStyle = bump ? `rgba(${k > .5 ? 255 : 0},${k > .5 ? 255 : 0},${k > .5 ? 255 : 0},${.15 + R() * .35})` : (k > .62 ? `rgba(200,200,205,${.06 + R() * .16})` : k > .3 ? `rgba(10,10,12,${.12 + R() * .25})` : `rgba(120,110,100,${.05 + R() * .1})`); g.fillRect(x, y, s, s); }
        if (bump) return; const lg = g.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(.32, 'rgba(0,0,0,.10)'); lg.addColorStop(.5, 'rgba(0,0,0,0)'); lg.addColorStop(.68, 'rgba(0,0,0,.10)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, h); // two worn racing lines
        const e = o.edge * w; g.fillStyle = '#f1f2ee'; g.fillRect(e, 0, w * 0.016, h); g.fillRect(w - e - w * 0.016, 0, w * 0.016, h);
        if (o.dash) { g.fillStyle = 'rgba(245,245,240,.92)'; for (let y = 0; y < h; y += h / 4) g.fillRect(w / 2 - w * 0.008, y + h * 0.04, w * 0.016, h * 0.13); } };
    return { map: canvasTex(THREE, S, 512, 1024, (g, w, h) => paint(g, w, h, false)), bump: canvasTex(THREE, S, 256, 512, (g, w, h) => paint(g, w, h, true), null, false) }; }
  const texKerb = (THREE, S) => canvasTex(THREE, S, 64, 256, (g, w, h) => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f4f4f0' : '#d8262b'; g.fillRect(0, i * h / 4, w, h / 4); } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, w * 0.12, h); });
  const texGrass = (THREE, S, rep) => canvasTex(THREE, S, 512, 512, (g, w, h) => { const R = rnd(3); g.fillStyle = '#3d6a2f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const x = R() * w, y = R() * h, r = 30 + R() * 90, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, R() > .5 ? 'rgba(90,130,50,.25)' : 'rgba(30,60,25,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    for (let i = 0; i < 16000; i++) { const x = R() * w, y = R() * h, l = 2 + R() * 5, c = 70 + R() * 90; g.strokeStyle = `rgba(${c * .55 | 0},${c | 0},${c * .35 | 0},${.35 + R() * .4})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R() * 2 - 1, y - l); g.stroke(); } }, [rep, rep]);
  const texStripes = (THREE, S) => canvasTex(THREE, S, 256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,230,.10)' : 'rgba(0,30,0,.10)'; g.fillRect(i * w / 8, 0, w / 8, h); } });
  const texBoards = (THREE, S) => canvasTex(THREE, S, 2048, 128, (g, w, h) => { const P = [['#123c8c', '#ffffff', 'ERLY LEARNING STUDIO'], ['#f2f2ee', '#1b2a4a', 'F = m v² / r'], ['#d8262b', '#ffffff', 'tan θ = v² / (r g)'], ['#111418', '#ffd24a', 'PHYSICS LAB · CIRCULAR MOTION'], ['#f2c230', '#141414', 'v = ω r'], ['#0f6b4f', '#ffffff', 'μ N ≥ m v² / r']];
    const pw = w / P.length; P.forEach(([bg, fg, t], i) => { g.fillStyle = bg; g.fillRect(i * pw, 0, pw, h); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(i * pw, 0, pw, 6); g.fillStyle = fg; g.font = `700 ${t.length > 18 ? 34 : 46}px system-ui, -apple-system, Segoe UI, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, i * pw + pw / 2, h / 2 + 3); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(i * pw + pw - 3, 0, 3, h); }); });
  const texBlob = (THREE, S) => canvasTex(THREE, S, 128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.6, 'rgba(0,0,0,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const texCloud = (THREE, S, seed) => canvasTex(THREE, S, 256, 128, (g, w, h) => { const R = rnd(seed); for (let i = 0; i < 22; i++) { const x = w * (.15 + R() * .7), y = h * (.45 + R() * .25), r = 18 + R() * 34, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } });

  /* ---------- the circuit ---------- */
  LS.circScenery = function (THREE, S, o = {}) {
    const W0 = o.w || 9, own = [], scene = S.scene, sunDir = new THREE.Vector3(0.45, 0.82, 0.36).normalize();
    // sky: gradient dome + sun glow + a few clouds
    const sky = new THREE.Mesh(new THREE.SphereGeometry(460, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: sunDir } },
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform vec3 sun; varying vec3 vp; void main(){ float k = clamp(vp.y,0.,1.); vec3 zen = vec3(.20,.42,.78), hor = vec3(.74,.85,.95); vec3 c = mix(hor, zen, pow(k,.55)); float s = max(dot(vp, sun),0.); c += vec3(1.,.93,.78) * (pow(s,900.)*4. + pow(s,24.)*.22); c = mix(vec3(.62,.70,.62), c, smoothstep(-.06,.02,vp.y)); gl_FragColor = vec4(c,1.); }' }));
    sky.renderOrder = -1; sky.frustumCulled = false; sky.onBeforeRender = (r, sc, cam) => { sky.position.copy(cam.position); sky.updateMatrixWorld(); }; /* the dome travels with the camera: never clipped by the far plane */ scene.add(sky); scene.background = null;
    for (let i = 0; i < 9; i++) { const R = rnd(11 + i), a = R() * TAU, el = 0.08 + R() * 0.22, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texCloud(THREE, S, 5 + i), transparent: true, depthWrite: false, fog: false, opacity: 0.85 })); sp.position.set(Math.cos(a) * 400 * Math.cos(el), 400 * Math.sin(el), Math.sin(a) * 400 * Math.cos(el)); sp.scale.set(150 + R() * 120, 55 + R() * 35, 1); scene.add(sp); }
    // outdoor environment for reflections (sky above, grass below)
    let envTex = null; try { const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { sun: { value: sunDir } }, vertexShader: sky.material.vertexShader, fragmentShader: 'uniform vec3 sun; varying vec3 vp; void main(){ float k = clamp(vp.y,0.,1.); vec3 c = mix(vec3(.80,.88,.96), vec3(.30,.52,.86), pow(k,.6)); c += vec3(1.,.95,.85) * pow(max(dot(vp,sun),0.),60.) * 3.; c = mix(vec3(.16,.24,.12), c, smoothstep(-.05,.05,vp.y)); gl_FragColor = vec4(c,1.); }' })));
      const pm = new THREE.PMREMGenerator(S.renderer); envTex = pm.fromScene(es, 0.02).texture; pm.dispose(); es.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); scene.environment = envTex; scene.environmentIntensity = 0.95; } catch (e) { /* reflections are optional */ }
    // sun with a shadow box that follows the vehicle
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 160 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
    const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x3a4a2a, 0.55); scene.add(hemi);
    // materials
    const A = texAsphalt(THREE, S, { edge: o.kerb ? (o.kerb + 0.18) / W0 : 0.06, dash: !!o.dash }), roadM = new THREE.MeshStandardMaterial({ map: A.map, bumpMap: A.bump, bumpScale: 0.6, roughness: 0.88, metalness: 0.0, envMapIntensity: 0.5 });
    const kerbM = new THREE.MeshStandardMaterial({ map: texKerb(THREE, S), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const grassT = texGrass(THREE, S, 1), bermM = new THREE.MeshStandardMaterial({ map: grassT, roughness: 0.96, color: 0xe2ecd2 });
    const stripeM = new THREE.MeshBasicMaterial({ map: texStripes(THREE, S), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const railM = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide }), postM = new THREE.MeshStandardMaterial({ color: 0x8d949e, metalness: 0.6, roughness: 0.45 });
    const boardM = new THREE.MeshStandardMaterial({ map: texBoards(THREE, S), roughness: 0.55, side: THREE.DoubleSide });
    // the floor the lab created becomes grass
    if (o.floor) { o.floor.material.map = grassT.clone(); o.floor.material.map.needsUpdate = true; o.floor.material.map.repeat.set(140, 140); o.floor.material.color.set(0xe6f0d8); o.floor.material.roughness = 0.97; o.floor.material.needsUpdate = true; own.push(o.floor.material.map); }
    // trees (instanced) and their soft contact shadows
    const NT = o.trees == null ? 150 : o.trees, trunkG = new THREE.CylinderGeometry(0.18, 0.3, 1, 7), crownG = new THREE.IcosahedronGeometry(1, 1);
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 }), NT), crowns = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }), NT);
    const blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texBlob(THREE, S), transparent: true, depthWrite: false }), NT + 1);
    crowns.castShadow = true; trunks.castShadow = true; scene.add(trunks, crowns, blobs);
    const hills = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); scene.add(hills);
    { const R = rnd(5), seg = 220, rows = 5, pos = [], col = [], idx = [], c0 = new THREE.Color(0x4f7a46), c1 = new THREE.Color(0x7d9a8c);
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= seg; i++) { const a = i / seg * TAU, rr = 330 + j * 22, hgt = j === 0 || j === rows ? 0 : (18 + 26 * Math.abs(Math.sin(a * 3 + 1.3) * Math.sin(a * 7 + .4)) + R() * 8) * Math.sin(j / rows * Math.PI); pos.push(rr * Math.cos(a), hgt - 0.5, rr * Math.sin(a)); const k = Math.min(1, hgt / 45); const c = c0.clone().lerp(c1, k * .6 + j / rows * .3); col.push(c.r, c.g, c.b); }
      for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + seg + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
      hills.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hills.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); hills.geometry.setIndex(idx); hills.geometry.computeVertexNormals(); }
    let road = null, kerbs = [], berm = null, stripes = null, rails = [], posts = null, boards = null, P0 = { r: 0, deg: -1 };
    const strip = (r, deg, sa, sb, mat, segs, vLen, lift) => { const th = deg * D2R, y0 = W0 / 2 * Math.sin(th) + 0.06, pos = [], uv = [], idx = [];
      for (let i = 0; i <= segs; i++) { const a = i / segs * TAU; for (let j = 0; j < 2; j++) { const s0 = j ? sb : sa, rr = r + s0 * Math.cos(th), y = y0 + s0 * Math.sin(th) + lift; pos.push(rr * Math.cos(a), y, -rr * Math.sin(a)); uv.push(j, i / segs * TAU * r / vLen); } }
      for (let i = 0; i < segs; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gm.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gm.setIndex(idx); gm.computeVertexNormals(); const m = new THREE.Mesh(gm, mat); m.receiveShadow = true; return m; };
    const drop = m => { if (m) { scene.remove(m); m.geometry.dispose(); } };
    const geo = (r, deg) => { const th = deg * D2R, y0 = W0 / 2 * Math.sin(th) + 0.06, ri = r - W0 / 2 * Math.cos(th), ro = r + W0 / 2 * Math.cos(th), yo = y0 + W0 / 2 * Math.sin(th), ext = Math.max(1.5, yo * 2.2), Rb = (deg > 0.01 ? ro + ext : ro) + 5; return { th, y0, ri, ro, yo, ext, Rb }; };
    const api = {
      rebuild(r, deg, clear) { const ck = JSON.stringify(clear || []); if (Math.abs(r - P0.r) < 1e-3 && Math.abs(deg - P0.deg) < 1e-3 && ck === P0.ck) return; P0 = { r, deg, ck }; const G = geo(r, deg), segs = Math.max(160, Math.min(420, Math.round(r * 4)));
        [road, berm, stripes, boards, posts, ...kerbs, ...rails].forEach(drop); kerbs = []; rails = [];
        road = strip(r, deg, -W0 / 2, W0 / 2, roadM, segs, W0 * 2, 0); scene.add(road);
        const kw = o.kerb || 0.8; kerbs = [strip(r, deg, -W0 / 2, -W0 / 2 + kw, kerbM, segs, 6, 0.012), strip(r, deg, W0 / 2 - kw, W0 / 2, kerbM, segs, 6, 0.012)]; kerbs.forEach(k => scene.add(k));
        if (deg > 0.01) { const pts = [new THREE.Vector2(G.ri - 0.6, 0), new THREE.Vector2(G.ri, 0.04), new THREE.Vector2(G.ro, G.yo - 0.03), new THREE.Vector2(G.ro + 0.5, G.yo - 0.05), new THREE.Vector2(G.ro + G.ext, 0)]; berm = new THREE.Mesh(new THREE.LatheGeometry(pts, segs), bermM); berm.receiveShadow = true; scene.add(berm);
          const t = bermM.map; t.repeat.set(segs / 6, 3); } else berm = null;
        const inR = Math.max(2, G.ri - 1.5); stripes = new THREE.Mesh(new THREE.CircleGeometry(inR, 96), stripeM); stripes.rotation.x = -Math.PI / 2; stripes.position.y = 0.012; stripeM.map.repeat.set(inR / 16, inR / 16); scene.add(stripes);
        const Rb = G.Rb, rs = Math.max(96, Math.round(Rb * 2)); [0.52, 0.86].forEach(y => { const m = new THREE.Mesh(new THREE.CylinderGeometry(Rb, Rb, 0.3, rs, 1, true), railM); m.position.y = y; m.castShadow = true; scene.add(m); rails.push(m); });
        const nP = Math.round(TAU * Rb / 2.5), pg = new THREE.BoxGeometry(0.12, 1.1, 0.12); posts = new THREE.InstancedMesh(pg, postM, nP); const mm = new THREE.Matrix4();
        for (let i = 0; i < nP; i++) { const a = i / nP * TAU; mm.makeTranslation((Rb + 0.12) * Math.cos(a), 0.55, (Rb + 0.12) * Math.sin(a)); posts.setMatrixAt(i, mm); } posts.castShadow = true; scene.add(posts);
        boards = new THREE.Mesh(new THREE.CylinderGeometry(Rb + 1.2, Rb + 1.2, 0.95, rs, 1, true), boardM); boards.position.y = 0.6; boardM.map.repeat.set(Math.round(TAU * (Rb + 1.2) / 36), 1); boardM.map.needsUpdate = true; scene.add(boards);
        // trees: mostly beyond the barrier, a few clumps in a large infield; deterministic
        const R = rnd(42), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color(); let n = 0;
        for (let i = 0; i < NT; i++) { let a = R() * TAU, rr = Rb + 9 + R() * 70; if (i % 9 === 0 && G.ri > 95) rr = 8 + R() * Math.min(30, G.ri - 40); /* only a large infield gets a small copse at its centre */ const hgt = 4 + R() * 5, w = hgt * (0.38 + R() * 0.12), x = rr * Math.cos(a), z = rr * Math.sin(a);
          if ((clear || []).some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr)) continue; /* keep zones (e.g. a second road) clear */
          trunks.setMatrixAt(n, mm.compose(ps.set(x, hgt * 0.22, z), q.identity(), sc.set(1, hgt * 0.44, 1)));
          crowns.setMatrixAt(n, mm.compose(ps.set(x, hgt * 0.62, z), q.setFromAxisAngle(sc.set(0, 1, 0), R() * TAU), sc.set(w, hgt * 0.5, w))); crowns.setColorAt(n, col.setHSL(0.24 + R() * 0.08, 0.42 + R() * 0.2, 0.22 + R() * 0.1));
          blobs.setMatrixAt(n, mm.compose(ps.set(x, 0.02, z), q.setFromAxisAngle(sc.set(1, 0, 0), -Math.PI / 2), sc.set(w * 2.6, w * 2.6, 1))); n++; }
        trunks.count = crowns.count = n; blobs.count = n; trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = blobs.instanceMatrix.needsUpdate = true; if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
        trunks.computeBoundingSphere(); crowns.computeBoundingSphere(); blobs.computeBoundingSphere(); },
      update(f) { sun.target.position.set(f[0], f[1], f[2]); sun.position.set(f[0] + sunDir.x * 70, f[1] + sunDir.y * 70, f[2] + sunDir.z * 70); sun.target.updateMatrixWorld(); },
      ground(x) { const G = geo(P0.r, P0.deg); if (P0.deg <= 0.01) return 0.06; if (x < G.ri - 0.6) return 0; if (x < G.ri) return 0.06; if (x <= G.ro) return G.y0 + (x - P0.r) / Math.max(1e-6, Math.cos(G.th)) * Math.sin(G.th); if (x < G.ro + G.ext) return G.yo * (1 - (x - G.ro) / G.ext); return 0; },
      geo: () => geo(P0.r, P0.deg),
      dispose() { if (envTex) envTex.dispose(); own.forEach(t => t.dispose()); }
    };
    return api;
  };

  /* ---------- a detailed coupé (≈ 4.5 m long, faces −z) ---------- */
  LS.circCar = function (THREE, M, paint = 0xd8332f) {
    const g = new THREE.Group(), body = new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 }),
      glass = new THREE.MeshPhysicalMaterial({ color: 0x0b141d, metalness: 0.2, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.4 }), trim = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.55, metalness: 0.2 }),
      chrome = new THREE.MeshStandardMaterial({ color: 0xe6e9ee, metalness: 1, roughness: 0.16 }), under = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9 });
    const ext = (pts, width, bev, mat) => { const s = new THREE.Shape(); pts.forEach((c, i) => { if (typeof c[0] !== 'string') return i ? s.lineTo(c[0], c[1]) : s.moveTo(c[0], c[1]); const [k, ...v] = c; if (k === 'm') s.moveTo(...v); else if (k === 'l') s.lineTo(...v); else if (k === 'q') s.quadraticCurveTo(...v); else s.bezierCurveTo(...v); }); s.closePath(); const gm = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelSize: Math.min(bev, 0.03), bevelThickness: bev, bevelOffset: -Math.min(bev, 0.03), bevelSegments: 4, curveSegments: 12 }); /* the bevel rounds the sides inwards only (offset −size), so tight profile corners never fold outwards */ gm.rotateY(-Math.PI / 2); gm.translate(width / 2, 0, 0); gm.computeVertexNormals(); const m = new THREE.Mesh(gm, mat); m.castShadow = true; m.receiveShadow = true; return m; };
    // lower body: nose, bonnet, flanks, tail (side profile in (z, y); z negative = front)
    const lower = ext([['m', -2.12, 0.27], ['q', -2.34, 0.28, -2.37, 0.46], ['q', -2.38, 0.64, -2.06, 0.7], ['b', -1.6, 0.76, -1.1, 0.83, -0.86, 0.89], ['l', 1.5, 0.94], ['q', 2.2, 0.96, 2.3, 0.82], ['q', 2.4, 0.55, 2.26, 0.3], ['l', -2.12, 0.27]], 1.74, 0.055, body); g.add(lower);
    // greenhouse (glass) and the roof over it
    g.add(ext([['m', -0.9, 0.87], ['q', -0.5, 1.12, -0.12, 1.25], ['q', 0.42, 1.32, 0.95, 1.255], ['q', 1.55, 1.12, 1.9, 0.92], ['l', 1.9, 0.87]], 1.42, 0.07, glass));
    g.add(ext([['m', -0.16, 1.255], ['q', 0.42, 1.33, 0.98, 1.255], ['l', 0.96, 1.295], ['q', 0.42, 1.37, -0.14, 1.295]], 1.36, 0.05, body));
    const bp = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.34, 0.09), body); bp.position.set(0, 1.08, 0.42); bp.rotation.x = -0.25; g.add(bp); // B-pillars
    // wheel arches, sills, splitter, diffuser, grille, lights, mirrors, spoiler, exhausts
    [[-1.42], [1.36]].forEach(([z]) => [-1, 1].forEach(sx => { const arch = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 10, 36, Math.PI), trim); arch.position.set(sx * 0.93, 0.36, z); arch.rotation.y = Math.PI / 2; g.add(arch); const well = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28, 0, Math.PI), under); well.position.set(sx * 0.9, 0.36, z); well.rotation.y = sx * Math.PI / 2; g.add(well); }));
    [-1, 1].forEach(sx => { const sill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 1.9), trim); sill.position.set(sx * 0.92, 0.33, 0); g.add(sill); });
    const split = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.05, 0.3), trim); split.position.set(0, 0.24, -2.22); g.add(split);
    const diff = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.25), trim); diff.position.set(0, 0.3, 2.24); g.add(diff);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.06), trim); grille.position.set(0, 0.4, -2.39); g.add(grille);
    [-1, 1].forEach(sx => { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.12), M.glow(0xfff6e0, 2.6)); hl.position.set(sx * 0.62, 0.62, -2.27); hl.rotation.y = sx * 0.12; g.add(hl);
      const mir = M.rbox(0.22, 0.12, 0.1, 0.03, body); mir.position.set(sx * 0.98, 0.98, -0.66); g.add(mir); const ex = M.cyl(0.05, 0.05, 0.12, chrome, 16); ex.rotation.x = Math.PI / 2; ex.position.set(sx * 0.45, 0.27, 2.32); g.add(ex); });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.05), M.glow(0xff2020, 2.2)); tail.position.set(0, 0.8, 2.34); g.add(tail);
    const wing = M.rbox(1.6, 0.04, 0.34, 0.02, trim); wing.position.set(0, 1.1, 2.08); g.add(wing); [-0.55, 0.55].forEach(x => { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.12), trim); st.position.set(x, 1.0, 2.08); g.add(st); });
    const floorP = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.04, 4.3), under); floorP.position.y = 0.22; g.add(floorP);
    // wheels: tyre, five-spoke alloy, brake disc; calipers stay still
    g.wheels = []; g.steer = []; const tyreM = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.86 }), rimM = new THREE.MeshStandardMaterial({ color: 0xc8ced6, metalness: 0.95, roughness: 0.22 }), discM = new THREE.MeshStandardMaterial({ color: 0x6d7079, metalness: 0.8, roughness: 0.4 }), calM = new THREE.MeshStandardMaterial({ color: 0xd2232a, roughness: 0.4 });
    [[-0.84, -1.42], [0.84, -1.42], [-0.84, 1.36], [0.84, 1.36]].forEach(([x, z], i) => { const piv = new THREE.Group(); piv.position.set(x, 0.36, z); g.add(piv); const wh = new THREE.Group(), spin = new THREE.Group(); wh.add(spin); piv.add(wh);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.085, 16, 40), tyreM); tyre.rotation.y = Math.PI / 2; tyre.scale.set(1, 1, 1.5); tyre.castShadow = true; spin.add(tyre);
      const rim = M.cyl(0.215, 0.215, 0.2, rimM, 32); rim.rotation.z = Math.PI / 2; spin.add(rim); const face = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), discM); face.position.x = Math.sign(x) * 0.105; face.rotation.y = Math.sign(x) * Math.PI / 2; spin.add(face);
      for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.05), rimM); sp.position.x = Math.sign(x) * 0.11; sp.rotation.x = k / 5 * Math.PI * 2; spin.add(sp); }
      const cap = M.cyl(0.04, 0.04, 0.03, chrome, 16); cap.rotation.z = Math.PI / 2; cap.position.x = Math.sign(x) * 0.125; spin.add(cap);
      const cal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.16), calM); cal.position.set(Math.sign(x) * 0.07, 0.11, -0.08); wh.add(cal);
      wh.spin = spin; g.wheels.push(wh); if (i < 2) g.steer.push(piv); });
    // a soft contact shadow under the car (the real sun shadow sits on top of it)
    const bc = document.createElement('canvas'); bc.width = bc.height = 128; const bg = bc.getContext('2d'), gr = bg.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); bg.fillStyle = gr; bg.fillRect(0, 0, 128, 128);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; g.add(blob);
    return g;
  };

  /* ---------- a road bike and rider (faces −z); .pose(crank) ---------- */
  LS.circRider = function (THREE, M, jersey = 0x2f7de1) {
    const g = new THREE.Group(), frameM = new THREE.MeshPhysicalMaterial({ color: 0xe8edf3, metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }), accent = new THREE.MeshPhysicalMaterial({ color: 0xd8262b, metalness: 0.3, roughness: 0.3, clearcoat: 1 }),
      dark = new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.6 }), alu = new THREE.MeshStandardMaterial({ color: 0xbfc6cf, metalness: 0.95, roughness: 0.25 }), skin = new THREE.MeshStandardMaterial({ color: 0xc58a62, roughness: 0.6 }),
      shirt = new THREE.MeshStandardMaterial({ color: jersey, roughness: 0.55 }), shirt2 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), shorts = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.65 }), helm = new THREE.MeshPhysicalMaterial({ color: 0xf4f5f8, roughness: 0.2, clearcoat: 1 }), visor = new THREE.MeshPhysicalMaterial({ color: 0x1a2230, metalness: 0.6, roughness: 0.05, clearcoat: 1 });
    const tube = (a, b, r, m) => { const k = M.link(r, m, 14); k.between(new THREE.Vector3(...a), new THREE.Vector3(...b)); g.add(k); return k; };
    const R = 0.34, wheel = z => { const w = new THREE.Group(), spin = new THREE.Group(); w.add(spin); w.position.set(0, R, z); g.add(w);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(R - 0.014, 0.016, 10, 64), dark); tyre.rotation.y = Math.PI / 2; tyre.castShadow = true; spin.add(tyre);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.04, 0.014, 8, 64), new THREE.MeshStandardMaterial({ color: 0x22252b, metalness: 0.6, roughness: 0.3 })); rim.rotation.y = Math.PI / 2; rim.scale.set(1, 1, 1.8); spin.add(rim);
      const sp = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, s0 = (i % 2 ? 1 : -1) * 0.025; sp.push(s0, 0, 0, 0, Math.cos(a) * (R - 0.05), Math.sin(a) * (R - 0.05)); } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); spin.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xcfd5dc })));
      const hub = M.cyl(0.03, 0.03, 0.1, alu, 16); hub.rotation.z = Math.PI / 2; spin.add(hub); w.spin = spin; return w; };
    const fw = wheel(-0.5), bw = wheel(0.5);
    const BB = [0, 0.29, 0.02], ST = [0, 0.86, 0.17], HT = [0, 0.82, -0.36], HB = [0, 0.95, -0.42], RD = [0, R, 0.5], FD = [0, R, -0.5];
    tube(BB, ST, 0.02, frameM); tube(ST, HT, 0.019, frameM); tube(BB, HT, 0.026, accent); tube(BB, RD, 0.013, frameM); tube(ST, RD, 0.012, frameM); tube(HT, FD, 0.017, accent); tube([0, 0.8, -0.37], [0, 0.95, -0.41], 0.02, dark);
    tube(ST, [0, 0.93, 0.2], 0.014, alu); const seat = M.rbox(0.13, 0.045, 0.27, 0.02, dark); seat.position.set(0, 0.95, 0.22); g.add(seat);
    // drop handlebar
    [-1, 1].forEach(s => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.21, 0.95, -0.45), new THREE.Vector3(s * 0.21, 0.96, -0.54), new THREE.Vector3(s * 0.21, 0.88, -0.58), new THREE.Vector3(s * 0.21, 0.8, -0.52)]); const hb = new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.013, 8), dark); g.add(hb); });
    const bar = M.cyl(0.014, 0.014, 0.42, dark, 12); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.95, -0.45); g.add(bar);
    // drivetrain: chainring, cranks, pedals, chain
    const crank = new THREE.Group(); crank.position.set(...BB); g.add(crank); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 40), alu); ring.rotation.y = Math.PI / 2; ring.position.x = 0.05; crank.add(ring);
    const ca = M.cyl(0.01, 0.01, 0.34, alu, 8); crank.add(ca); const ped = [-1, 1].map(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.06), dark); crank.add(p); p.position.set(s * 0.11, s * 0.17, 0); return p; });
    const chain = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 4, 48), dark); chain.scale.set(1, 0.1, 0.27); chain.rotation.y = Math.PI / 2; chain.position.set(0.05, 0.3, 0.26); g.add(chain);
    // rider: smooth limbs (capsule links + joint spheres), aero helmet with visor, two-tone jersey
    const limb = (r, m) => { const k = M.link(r, m, 16); g.add(k); return k; }, ball = (r, m, p) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m); b.position.copy(p); b.castShadow = true; g.add(b); return b; };
    const hip = new THREE.Vector3(0, 1.0, 0.2), sh = new THREE.Vector3(0, 1.36, -0.2);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.36, 8, 16), shirt); torso.scale.set(1.15, 1, 0.82); torso.castShadow = true; g.add(torso); { const mid = hip.clone().add(sh).multiplyScalar(0.5), d = sh.clone().sub(hip).normalize(); torso.position.copy(mid); torso.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); }
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.07, 20, 1, true), shirt2); band.scale.set(1.15, 1, 0.82); band.position.copy(torso.position); band.quaternion.copy(torso.quaternion); g.add(band);
    const hipBall = ball(0.15, shorts, hip); hipBall.scale.set(1.15, 0.8, 1);
    const head = ball(0.105, skin, new THREE.Vector3(0, 1.56, -0.3)); const hel = new THREE.Mesh(new THREE.SphereGeometry(0.135, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), helm); hel.scale.set(0.95, 0.9, 1.35); hel.position.set(0, 1.585, -0.27); hel.rotation.x = -0.45; hel.castShadow = true; g.add(hel);
    const vis = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 10, -0.9, 1.8, 1.25, 0.45), visor); vis.position.copy(head.position); vis.rotation.y = Math.PI; g.add(vis);
    [-1, 1].forEach(s => { const sp = new THREE.Vector3(s * 0.17, 1.33, -0.18), el = new THREE.Vector3(s * 0.21, 1.14, -0.36), hd = new THREE.Vector3(s * 0.21, 0.97, -0.52); limb(0.045, shirt).between(sp, el); limb(0.036, skin).between(el, hd); ball(0.05, shirt, sp); ball(0.04, skin, el); ball(0.042, dark, hd); });
    const legs = [-1, 1].map(s => ({ s, a: limb(0.068, shorts), b: limb(0.05, skin), k: ball(0.058, skin, new THREE.Vector3()), f: (() => { const sh0 = M.rbox(0.09, 0.07, 0.24, 0.03, new THREE.MeshStandardMaterial({ color: 0xf1f1f1, roughness: 0.4 })); g.add(sh0); return sh0; })() }));
    const hp = new THREE.Vector3(), knee = new THREE.Vector3(), P0 = new THREE.Vector3(), LEG = 0.46;
    g.pose = ang => { crank.rotation.x = ang; fw.spin.rotation.x = ang * 2.6; bw.spin.rotation.x = ang * 2.6;
      legs.forEach(l => { const s = l.s; hp.set(s * 0.1, hip.y - 0.03, hip.z); P0.set(s * 0.12, BB[1] + s * 0.17 * Math.cos(ang) + 0.04, BB[2] + s * 0.17 * Math.sin(ang));
        const dy = P0.y - hp.y, dz = P0.z - hp.z, D = Math.min(Math.hypot(dy, dz), 2 * LEG * 0.999), a = D / 2, hh = Math.sqrt(LEG * LEG - a * a); let ny = -dz / D, nz = dy / D; if (nz > 0) { ny = -ny; nz = -nz; }
        knee.set(s * 0.11, hp.y + dy / 2 + ny * hh, hp.z + dz / 2 + nz * hh); l.a.between(hp, knee); l.b.between(knee, P0); l.k.position.copy(knee); l.f.position.set(P0.x, P0.y - 0.02, P0.z - 0.04); }); };
    g.pose(0); g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
  };
})();
