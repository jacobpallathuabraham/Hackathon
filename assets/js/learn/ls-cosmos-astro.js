/* ERLY Learning Studio — the astronaut (used by ls-cosmos.js). v44: rebuilt.

   Why it was rebuilt (defects found in v40): limbs were uniform capsules with protruding torus "bellows" stacked on
   them, so arms and legs read as robot segments; the hands were a small box with five capsules; the backpack was a flat
   box; and every joint was driven by its own sine waves plus random gestures, so movement had no purpose and could not
   be reproduced. The thrusters were bright cones.

   1. MODEL (built in code, no downloaded asset; ~1.85 m at 1 unit = 1 m before the scene scale):
      · hard upper torso (an elliptical shell with a shoulder yoke), soft lower torso, flush waist/neck/arm/leg bearings;
      · tapered fabric limbs (lathe profiles with soft fold displacement, not rings), smooth elbow and knee joints with
        shallow fold bands; red commander stripes on the thighs;
      · gloves: gauntlet cuff, a shaped palm, four two-jointed fingers and a two-jointed thumb (curl, index, thumb pose);
      · boots: ankle cuff, shaped foot with a toe cap, thick treaded sole;
      · helmet: clear pressure bubble, the visor-assembly shell, a gold sun visor that reflects the universe LIVE (a cube
        camera re-renders the surroundings every ~0.5–1.5 s on capable devices, so passing worlds appear in it), visor
        rail, lamps and a camera;
      · life-support backpack with panel seams and handles, and the jet unit (main nozzles, braking nozzles, four RCS
        clusters) beneath it.
   2. MOTION: LS.astroAnim (ls-cosmos-anim.js) — states, blend weights, joint springs and deterministic gestures from the
      physical inputs computed here (travel, acceleration, braking, banking, yaw/pitch rate, nearness to a world).
   3. THRUSTERS: bell nozzles (metal outside, heat-tinted inside); each plume is two layered, view-softened shells (a short
      bright core and a long faint outer plume) with turbulence and faint shock diamonds; pooled exhaust particles from
      the main and braking jets only; RCS puffs only when the body actually turns or translates.
   4. PLACEMENT (unchanged in principle since v40): carried with the camera; a critically damped spring keeps it in the
      composition, in front of every world along the line of sight and clear of every world's silhouette on screen.

   API (used by ls-cosmos.js): root, ready, pos, speed, lead, bank, load(), setAnchors(), fly(), endFlight(),
   resetTrail(), update({u, dt, t, lookAt, still, camera, obstacles, near, opening}), debug(), dispose(). */
(function () {
  'use strict';
  const LS = window.LS;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sstep = t => t * t * t * (t * (t * 6 - 15) + 10);
  const damp = (k, dt) => 1 - Math.exp(-k * dt);

  LS.cosmosAstronaut = function (THREE, scene, o = {}) {
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    const body = new THREE.Group(); root.add(body);
    const st = { ready: false, curve: null, uPrev: 0, uVel: 0, lead: 0, pos: new THREE.Vector3(), off: null, offV: new THREE.Vector3(), vel: new THREE.Vector3(), prev: new THREE.Vector3(), speed: 0, acc: 0, bank: 0, flight: null, fresh: true,
      qPrev: new THREE.Quaternion(), yawRate: 0, pitchRate: 0, envT: 0, out: null, nan: 0 };
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), qa = new THREE.Quaternion(), qr = new THREE.Quaternion(), e3 = new THREE.Euler();
    const ANIM = LS.astroAnim ? LS.astroAnim.create() : null;
    let rig = null, thr = null, envRig = null;
    const q = o.q == null ? 2 : o.q;

    /* ===================================================================== textures */
    function weaveNormal() { // fine ortho-fabric weave with a few soft creases (tileable)
      const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), H = new Float32Array(N * N);
      let sd = 11; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const cr = Array.from({ length: 18 }, () => [R() * N, R() * N, 18 + R() * 40, R() * Math.PI, 0.25 + R() * 0.4]);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let h = 0.5 + 0.03 * Math.sin(x / N * Math.PI * 2 * 64) * Math.sin(y / N * Math.PI * 2 * 64) + 0.02 * Math.sin((x + y) / N * Math.PI * 2 * 32);
        for (const [cx, cy, len, a, s] of cr) { let dx = x - cx, dy = y - cy; dx -= N * Math.round(dx / N); dy -= N * Math.round(dy / N); const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a); if (Math.abs(u) < len) h += s * 0.12 * Math.exp(-v * v / 10) * (1 - Math.abs(u) / len); }
        H[y * N + x] = h; }
      const img = g.createImageData(N, N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const at = (i, j) => H[((j + N) % N) * N + ((i + N) % N)]; const dx = (at(x + 1, y) - at(x - 1, y)) * 4, dy = (at(x, y + 1) - at(x, y - 1)) * 4, l = Math.hypot(dx, dy, 1), k = (y * N + x) * 4;
        img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
      g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 4; return t; }
    function patchTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#16245e'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#d9b75c'; g.lineWidth = 5; g.stroke();
      const gr = g.createLinearGradient(0, 30, 0, 90); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(1, '#ff8a4c'); g.fillStyle = gr; g.beginPath(); g.arc(64, 76, 23, Math.PI, 0); g.fill();
      g.fillStyle = '#f4efe6'; g.fillRect(30, 78, 68, 3); g.font = '600 15px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('ERLY', 64, 102);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

    /* ===================================================================== geometry helpers */
    function roundedBox(w, h, d, r, seg) { const sh = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
      sh.moveTo(x, -h / 2); sh.lineTo(x + ww, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, y); sh.lineTo(w / 2, y + hh); sh.quadraticCurveTo(w / 2, h / 2, x + ww, h / 2); sh.lineTo(x, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, y + hh); sh.lineTo(-w / 2, y); sh.quadraticCurveTo(-w / 2, -h / 2, x, -h / 2);
      const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: seg || 4, curveSegments: 6 }); g.translate(0, 0, -Math.max(0.001, d - 2 * r) / 2); g.computeVertexNormals(); return g; }
    /* a tapered fabric segment along −y from 0 to −len: radii at top/mid/bottom, soft circumferential fold displacement */
    function limb(rTop, rMid, rBot, len, folds, seed, sz = 1) {
      const pts = []; const n = 14; for (let i = 0; i <= n; i++) { const u = i / n, r = u < 0.5 ? rTop + (rMid - rTop) * (u / 0.5) : rMid + (rBot - rMid) * ((u - 0.5) / 0.5); pts.push(new THREE.Vector2(Math.max(0.001, r), -u * len)); }
      pts.unshift(new THREE.Vector2(0.001, 0.0)); pts.push(new THREE.Vector2(0.001, -len)); pts.reverse(); // closed ends (hidden inside the joints); bottom → top so the normals face outward
      const g = new THREE.LatheGeometry(pts, 28), p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const u = -v.y / len, a = Math.atan2(v.z, v.x), e = Math.sin(Math.PI * u); // folds fade out at both ends
        const f = 1 + (0.03 * Math.sin(u * folds * Math.PI * 2 + Math.sin(a * 2 + seed) * 0.9 + seed) + 0.008 * Math.sin(a * 6 + u * 17 + seed)) * e * e; p.setXYZ(i, v.x * f, v.y, v.z * f * sz); }
      g.computeVertexNormals(); return g; }
    const lathe = (pts, segs) => { const v = pts.map(([r, y]) => new THREE.Vector2(r, y)); if (v[0].y > v[v.length - 1].y) v.reverse(); return new THREE.LatheGeometry(v, segs || 40); }; // ascending y: outward normals

    function buildSuit() {
      const env = o.env || null, fab = weaveNormal(), mats = [];
      const M = (Ctor, p) => { const m = new Ctor(Object.assign({ envMap: env, envMapIntensity: 0.45 }, p)); mats.push(m); return m; };
      const suit = M(THREE.MeshPhysicalMaterial, { color: 0xf3f1ec, roughness: 0.78, envMapIntensity: 0.18, sheen: 0.45, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.6, normalMap: fab, normalScale: new THREE.Vector2(0.4, 0.4) });
      const fold = M(THREE.MeshPhysicalMaterial, { color: 0xe6e4de, roughness: 0.84, envMapIntensity: 0.18, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), normalMap: fab, normalScale: new THREE.Vector2(0.3, 0.3) });
      const hut = M(THREE.MeshPhysicalMaterial, { color: 0xf1efea, roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 0.8 });
      const metal = M(THREE.MeshStandardMaterial, { color: 0xc5cad2, metalness: 0.92, roughness: 0.26, envMapIntensity: 1.2 });
      const anod = M(THREE.MeshStandardMaterial, { color: 0x2f56b8, metalness: 0.8, roughness: 0.32, envMapIntensity: 1.0 });
      const anodR = M(THREE.MeshStandardMaterial, { color: 0xb0352a, metalness: 0.75, roughness: 0.34, envMapIntensity: 1.0 });
      const red = M(THREE.MeshStandardMaterial, { color: 0xb2382d, roughness: 0.7 });
      const glove = M(THREE.MeshPhysicalMaterial, { color: 0xeeebe4, roughness: 0.76, envMapIntensity: 0.2, sheen: 0.3, sheenColor: new THREE.Color(0xffffff), normalMap: fab, normalScale: new THREE.Vector2(0.25, 0.25) });
      const gripM = M(THREE.MeshStandardMaterial, { color: 0x5d6068, roughness: 0.85 });
      const boot = M(THREE.MeshPhysicalMaterial, { color: 0xeae7e0, roughness: 0.7, envMapIntensity: 0.25, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) }), sole = M(THREE.MeshStandardMaterial, { color: 0x2c2f36, roughness: 0.92 });
      const dark = M(THREE.MeshStandardMaterial, { color: 0x272b33, roughness: 0.55, metalness: 0.35 });
      const seam = M(THREE.MeshStandardMaterial, { color: 0xb9b6ae, roughness: 0.9 });
      const shell = M(THREE.MeshPhysicalMaterial, { color: 0xf4f2ee, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0 });
      const bubble = M(THREE.MeshPhysicalMaterial, { color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.14, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false });
      const visor = M(THREE.MeshPhysicalMaterial, { color: 0xffc766, metalness: 1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.0 });
      const cap = M(THREE.MeshStandardMaterial, { color: 0x1c1f26, roughness: 0.85 });
      const lamp = M(THREE.MeshStandardMaterial, { color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 2.6, roughness: 0.3 });
      const ledG = M(THREE.MeshStandardMaterial, { color: 0x103010, emissive: 0x39ff7a, emissiveIntensity: 2.2 }), ledR = M(THREE.MeshStandardMaterial, { color: 0x301010, emissive: 0xff4a3a, emissiveIntensity: 2.2 });
      const screen = M(THREE.MeshStandardMaterial, { color: 0x0b1a22, emissive: 0x2cc6a6, emissiveIntensity: 0.5, roughness: 0.25 });
      const patch = M(THREE.MeshStandardMaterial, { map: patchTex(), roughness: 0.7, transparent: true });
      const B = {}, R0 = new THREE.Group();
      const J = (name, x, y, z, parent) => { const b = new THREE.Object3D(); b.name = name; const pw = parent ? parent.userData.w : new THREE.Vector3(); b.position.set(x - pw.x, y - pw.y, z - pw.z); b.userData.w = new THREE.Vector3(x, y, z); (parent || R0).add(b); B[name] = b; return b; };
      const at = (parent, m, x, y, z, rx, ry, rz) => { const w = parent.userData.w; m.position.set(x - w.x, y - w.y, z - w.z); m.rotation.set(rx || 0, ry || 0, rz || 0); parent.add(m); m.castShadow = false; return m; };
      const add = (parent, geo, mat, x, y, z, rx, ry, rz) => at(parent, new THREE.Mesh(geo, mat), x, y, z, rx, ry, rz);
      const ring = (parent, p, r, tube, mat, dir) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 48), mat), w = parent.userData.w; m.position.set(p[0] - w.x, p[1] - w.y, p[2] - w.z); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...(dir || [0, 1, 0])).normalize()); parent.add(m); return m; };
      // a segment hung from joint `parent` (at its pivot) pointing along local −y to the child pivot; returns the mesh
      const seg = (parent, geo, mat, from, to) => { const A = new THREE.Vector3(...from), Bv = new THREE.Vector3(...to), m = new THREE.Mesh(geo, mat), w = parent.userData.w; m.position.set(A.x - w.x, A.y - w.y, A.z - w.z); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), Bv.sub(A).normalize()); parent.add(m); return m; };
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

      /* skeleton (feet at y = 0, ~1.85 tall, facing +z, +x = the astronaut's left) */
      J('pelvis', 0, 0.98, 0); J('chest', 0, 1.18, 0, B.pelvis); J('neck', 0, 1.5, 0.0, B.chest); J('head', 0, 1.6, 0.02, B.neck);
      const SH = [0.212, 1.42, 0.0], EL = [0.232, 1.135, -0.01], WR = [0.24, 0.885, 0.02], HP = [0.098, 0.95, 0.0], KN = [0.108, 0.53, 0.03], AN = [0.112, 0.105, 0.0];
      ['L', 'R'].forEach(s => { const sx = s === 'L' ? 1 : -1; J('uArm' + s, SH[0] * sx, SH[1], SH[2], B.chest); J('fArm' + s, EL[0] * sx, EL[1], EL[2], B['uArm' + s]); J('hand' + s, WR[0] * sx, WR[1], WR[2], B['fArm' + s]);
        J('thigh' + s, HP[0] * sx, HP[1], HP[2], B.pelvis); J('shin' + s, KN[0] * sx, KN[1], KN[2], B['thigh' + s]); J('foot' + s, AN[0] * sx, AN[1], AN[2], B['shin' + s]); });

      /* lower torso (soft) and waist bearing */
      add(B.pelvis, lathe([[0.001, 0.82], [0.13, 0.83], [0.165, 0.88], [0.178, 0.95], [0.174, 1.02], [0.168, 1.07], [0.001, 1.075]], 48), suit, 0, 0, 0).scale.set(1, 1, 0.8);
      ring(B.pelvis, [0, 1.07, 0], 0.169, 0.011, metal); ring(B.pelvis, [0, 1.055, 0], 0.171, 0.005, anod);
      /* hard upper torso: an elliptical shell, broader at the shoulders, with a yoke over each shoulder */
      const hutG = lathe([[0.001, 1.065], [0.158, 1.07], [0.188, 1.13], [0.21, 1.24], [0.222, 1.34], [0.214, 1.42], [0.18, 1.48], [0.125, 1.515], [0.001, 1.52]], 64); add(B.chest, hutG, hut, 0, 0, 0).scale.set(1.04, 1, 0.74);
      [-1, 1].forEach(sx => { add(B.chest, new THREE.SphereGeometry(0.082, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), hut, 0.186 * sx, 1.43, 0.0, 0, 0, -0.5 * sx).scale.set(1, 0.8, 0.95); });
      // panel seams on the torso shell (thin raised lines, as on a real hard upper torso)
      [1.16, 1.3].forEach(y => { const m = ring(B.chest, [0, y, 0], 0.212 + (y - 1.16) * 0.06, 0.0025, seam); m.scale.set(1.04, 0.74, 1); });
      ring(B.chest, [0, 1.515, 0.02], 0.116, 0.02, metal); ring(B.chest, [0, 1.533, 0.02], 0.112, 0.009, anod);
      // display-and-control module on the chest: housing, screen, dials, status lights, the ERLY mission patch on the left arm
      add(B.chest, roundedBox(0.23, 0.115, 0.07, 0.02), hut, 0, 1.235, 0.168); add(B.chest, roundedBox(0.12, 0.034, 0.012, 0.006), screen, -0.035, 1.26, 0.204);
      [-0.08, -0.02, 0.04].forEach((x, i) => add(B.chest, new THREE.CylinderGeometry(0.012, 0.014, 0.022, 18), i === 1 ? anod : metal, x, 1.21, 0.208, Math.PI / 2, 0, 0));
      add(B.chest, new THREE.SphereGeometry(0.006, 10, 8), ledG, 0.07, 1.265, 0.205); const ledRed = add(B.chest, new THREE.SphereGeometry(0.006, 10, 8), ledR, 0.088, 1.265, 0.205);
      /* life-support backpack (PLSS): shaped body, top cover, panel seams, side handles; the jet unit underneath */
      const plss = new THREE.Group(); at(B.chest, plss, 0, 1.25, -0.27);
      const pb = new THREE.Mesh(roundedBox(0.42, 0.56, 0.18, 0.06, 6), hut); plss.add(pb);
      const top = new THREE.Mesh(roundedBox(0.38, 0.08, 0.17, 0.035), shell); top.position.set(0, 0.31, 0.005); plss.add(top);
      [[0, -0.05, -0.101, 0.4, 0.004], [0, 0.12, -0.101, 0.4, 0.004]].forEach(([x, y, z, w, h]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.004), seam); m.position.set(x, y, z); plss.add(m); });
      const vents = new THREE.Mesh(roundedBox(0.2, 0.09, 0.01, 0.004), dark); vents.position.set(0.06, -0.16, -0.102); plss.add(vents);
      for (let i = 0; i < 6; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.004, 0.006), metal); v.position.set(0.06, -0.195 + i * 0.014, -0.106); plss.add(v); }
      [-1, 1].forEach(sx => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.232 * sx, -0.18, -0.02), new THREE.Vector3(0.25 * sx, -0.05, -0.04), new THREE.Vector3(0.25 * sx, 0.12, -0.04), new THREE.Vector3(0.232 * sx, 0.24, -0.02)]); plss.add(new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.009, 8), metal)); });
      const safer = new THREE.Mesh(roundedBox(0.5, 0.13, 0.22, 0.035), shell); safer.position.set(0, -0.365, -0.01); plss.add(safer);
      [-1, 1].forEach(sx => { const tower = new THREE.Mesh(roundedBox(0.06, 0.22, 0.07, 0.02), shell); tower.position.set(0.25 * sx, -0.27, 0.03); plss.add(tower); });
      // hoses from the backpack round to the chest unit
      [-1, 1].forEach(sx => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.17 * sx, 1.2, -0.17), new THREE.Vector3(0.226 * sx, 1.21, -0.02), new THREE.Vector3(0.17 * sx, 1.225, 0.135), new THREE.Vector3(0.1 * sx, 1.23, 0.178)]); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 28, 0.008, 10), sx < 0 ? anod : anodR); m.position.set(0, -1.18, 0); B.chest.add(m); });

      /* helmet on the neck: comm cap, clear bubble, visor-assembly shell, gold visor, rail, lamps, camera */
      const HC = [0, 1.69, 0.035];
      add(B.head, new THREE.SphereGeometry(0.1, 28, 20), cap, HC[0], HC[1] - 0.02, HC[2] - 0.015);
      add(B.head, new THREE.SphereGeometry(0.168, 48, 36), bubble, ...HC).renderOrder = 3;
      add(B.head, new THREE.SphereGeometry(0.184, 56, 40, Math.PI / 2 + 0.98, 2 * Math.PI - 1.96, 0, Math.PI * 0.8), shell, ...HC);          // back and sides
      const vis = add(B.head, new THREE.SphereGeometry(0.18, 56, 40, Math.PI / 2 - 1.02, 2.04, 0.3, 1.05), visor, ...HC);                      // gold sun visor (lowered)
      [-1, 1].forEach(sx => { add(B.head, new THREE.CylinderGeometry(0.024, 0.028, 0.055, 20), metal, 0.165 * sx, HC[1] + 0.085, HC[2] + 0.03, Math.PI / 2, 0, 0); add(B.head, new THREE.CircleGeometry(0.02, 20), lamp, 0.165 * sx, HC[1] + 0.085, HC[2] + 0.058); });
      add(B.head, roundedBox(0.032, 0.028, 0.048, 0.007), dark, -0.172, HC[1] + 0.02, HC[2] + 0.04);
      add(B.head, new THREE.CylinderGeometry(0.115, 0.118, 0.03, 40), metal, 0, 1.545, 0.02);                                                    // helmet neck ring

      /* arms: shoulder bearing, tapered upper arm, smooth elbow with shallow folds, forearm, wrist disconnect, glove */
      const hands = {};
      ['L', 'R'].forEach((s, k) => { const sx = s === 'L' ? 1 : -1, U = B['uArm' + s], F = B['fArm' + s], Hd = B['hand' + s];
        const sh = [SH[0] * sx, SH[1], SH[2]], el = [EL[0] * sx, EL[1], EL[2]], wr = [WR[0] * sx, WR[1], WR[2]];
        add(U, new THREE.SphereGeometry(0.071, 32, 24), suit, sh[0], sh[1] - 0.01, sh[2]);
        ring(U, [sh[0] - 0.004 * sx, sh[1] - 0.036, sh[2]], 0.0655, 0.0055, metal, [0.2 * sx, -1, 0]);
        seg(U, limb(0.067, 0.064, 0.06, dist(sh, el) - 0.02, 2.2, 1.3 + k), suit, [sh[0], sh[1] - 0.035, sh[2]], el);
        if (s === 'L') { const pm = new THREE.Mesh(new THREE.CircleGeometry(0.036, 32), patch); pm.position.set(sh[0] + 0.06 - U.userData.w.x, sh[1] - 0.1 - U.userData.w.y, sh[2] + 0.012 - U.userData.w.z); pm.rotation.set(0, Math.PI / 2 - 0.25, 0); U.add(pm); }
        add(F, new THREE.SphereGeometry(0.06, 28, 20), fold, el[0], el[1], el[2]);
        [0.026, -0.026].forEach(dy => ring(F, [el[0], el[1] + dy, el[2]], 0.058, 0.0055, fold, [0, 1, 0.05]));
        seg(F, limb(0.058, 0.054, 0.049, dist(el, wr) - 0.02, 1.6, 2.1 + k), suit, el, wr);
        ring(F, [wr[0], wr[1] + 0.012, wr[2]], 0.0485, 0.0062, s === 'L' ? anod : anodR, [0, -1, 0.05]);
        // glove: gauntlet cuff, palm, back-of-hand pad, two-jointed fingers and thumb (palm faces the body: −x on the left)
        add(Hd, lathe([[0.046, 0.0], [0.05, -0.02], [0.053, -0.045], [0.001, -0.046]], 28), glove, wr[0], wr[1] - 0.005, wr[2]);
        const palm = add(Hd, new THREE.SphereGeometry(1, 24, 18), glove, wr[0], wr[1] - 0.088, wr[2] + 0.004); palm.scale.set(0.023, 0.05, 0.043);
        add(Hd, roundedBox(0.008, 0.05, 0.05, 0.003), gripM, wr[0] - 0.02 * sx, wr[1] - 0.088, wr[2] + 0.004);
        const fingers = [], fz = [0.026, 0.009, -0.008, -0.024], fl = [[0.03, 0.024], [0.033, 0.026], [0.031, 0.024], [0.025, 0.02]];
        fz.forEach((z, i) => { const base = new THREE.Group(); at(Hd, base, wr[0], wr[1] - 0.124, wr[2] + 0.004 + z); const [l1, l2] = fl[i];
          const s1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, l1, 4, 10), glove); s1.position.y = -l1 / 2; base.add(s1);
          const mid = new THREE.Group(); mid.position.y = -l1 - 0.004; base.add(mid); const s2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, l2, 4, 10), glove); s2.position.y = -l2 / 2; mid.add(s2);
          base.rotation.x = (i - 1.5) * -0.06; fingers.push({ base, mid }); });
        const tb = new THREE.Group(); at(Hd, tb, wr[0] - 0.012 * sx, wr[1] - 0.07, wr[2] + 0.036); const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.026, 4, 10), glove); t1.position.y = -0.016; tb.add(t1);
        const tm = new THREE.Group(); tm.position.y = -0.034; tb.add(tm); const t2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.02, 4, 10), glove); t2.position.y = -0.012; tm.add(t2);
        hands[s] = { fingers, thumb: { base: tb, mid: tm }, sx }; });

      /* legs: hip bearing, tapered thigh with a commander stripe, smooth knee with shallow folds, shin, ankle bearing, boot */
      ['L', 'R'].forEach((s, k) => { const sx = s === 'L' ? 1 : -1, Tg = B['thigh' + s], Sn = B['shin' + s], Ft = B['foot' + s];
        const hp = [HP[0] * sx, HP[1], HP[2]], kn = [KN[0] * sx, KN[1], KN[2]], an = [AN[0] * sx, AN[1], AN[2]];
        add(Tg, new THREE.SphereGeometry(0.086, 28, 20), suit, hp[0], hp[1] - 0.02, hp[2]);
        seg(Tg, limb(0.088, 0.082, 0.071, dist(hp, kn) - 0.02, 2.4, 3.7 + k, 1.04), suit, [hp[0], hp[1] - 0.04, hp[2]], kn);
        [0.0, 0.035].forEach(d => { const f = 0.52 + d; const m = ring(Tg, [hp[0] + (kn[0] - hp[0]) * f, hp[1] - 0.04 + (kn[1] - hp[1] + 0.04) * f, hp[2] + (kn[2] - hp[2]) * f], 0.0805, 0.0032, red, [kn[0] - hp[0], kn[1] - hp[1], kn[2] - hp[2]]); m.scale.set(1, 1.04, 1); });
        add(Sn, new THREE.SphereGeometry(0.071, 28, 20), fold, kn[0], kn[1], kn[2]);
        [0.03, -0.03].forEach(dy => ring(Sn, [kn[0], kn[1] + dy, kn[2]], 0.069, 0.006, fold, [0, 1, 0.08]));
        seg(Sn, limb(0.069, 0.064, 0.056, dist(kn, an) - 0.05, 2.0, 4.9 + k), suit, kn, [an[0], an[1] + 0.05, an[2]]);
        ring(Sn, [an[0], an[1] + 0.07, an[2]], 0.0575, 0.006, metal);
        add(Ft, lathe([[0.063, 0.1], [0.068, 0.06], [0.07, 0.03], [0.001, 0.028]], 28), boot, an[0], -0.0 + 0.0, an[2]).position.y = -AN[1] + 0.0 + 0.0;
        const foot = add(Ft, roundedBox(0.104, 0.07, 0.2, 0.032), boot, an[0], 0.045, an[2] + 0.055);
        const toe = add(Ft, new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), boot, an[0], 0.03, an[2] + 0.14); toe.scale.set(0.052, 0.045, 0.045); toe.rotation.x = Math.PI / 2;
        add(Ft, roundedBox(0.118, 0.026, 0.27, 0.011), sole, an[0], 0.012, an[2] + 0.05); void foot; });

      R0.traverse(m => { if (m.isMesh) m.frustumCulled = false; });
      const rest = {}; Object.keys(B).forEach(k => { rest[k] = B[k].quaternion.clone(); });
      return { mesh: R0, B, rest, hands, leds: [ledRed], mats, tex: [fab, patch.map], glossy: [visor, bubble, shell, metal, hut], visor: vis };
    }

    /* ===================================================================== thrusters */
    const PLUME_V = 'varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ vU=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }';
    const PLUME_F = `uniform float uI; uniform float uT; uniform vec3 uCore; uniform vec3 uOut; uniform float uDia; varying vec2 vU; varying vec3 vN; varying vec3 vV;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ float y=vU.y;                                                   // 0 at the nozzle exit → 1 at the plume's end
        float soft=pow(abs(dot(vN,vV)),1.8);                                       // view-softened: bright through the middle, transparent at the rim (a volume, not a cone)
        float turb=0.65+0.35*(n(vec2(vU.x*8.0, y*6.0-uT*14.0))*0.6+n(vec2(vU.x*19.0, y*13.0-uT*23.0))*0.4);
        float dia=1.0+uDia*pow(0.5+0.5*cos(y*34.0),10.0)*(1.0-y);                  // faint shock diamonds near the exit (main jets only)
        float fall=pow(1.0-y,2.4)*smoothstep(0.0,0.04,y+0.02);
        vec3 col=mix(uCore,uOut,smoothstep(0.0,0.55,y));
        gl_FragColor=vec4(col*fall*soft*turb*dia*uI,1.0); }`;
    function thrusters(rg) {
      const mk = (col, k) => new THREE.MeshStandardMaterial({ color: col, metalness: 0.9, roughness: 0.34, envMap: o.env || null, envMapIntensity: k });
      const outerMat = mk(0x9aa1ab, 1.1), heat = { main: new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.6, metalness: 0.4, emissive: 0xff6a24, emissiveIntensity: 0 }), brake: new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.6, metalness: 0.4, emissive: 0xff7a34, emissiveIntensity: 0 }), rcs: new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.6, metalness: 0.4, emissive: 0xffa060, emissiveIntensity: 0 }) };
      // bell nozzle: throat → flared exit (outer metal, inner heat-tinted), plus a mounting collar
      const bellOut = lathe([[0.012, 0.0], [0.011, -0.01], [0.016, -0.025], [0.026, -0.05], [0.0275, -0.052]], 24), bellIn = lathe([[0.0105, 0.0], [0.0098, -0.01], [0.0145, -0.025], [0.0245, -0.0505]], 24); bellIn.scale(1, 1, 1);
      const collar = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 20);
      const plumeG = (() => { const pts = []; for (let i = 0; i <= 18; i++) { const u = i / 18; pts.push(new THREE.Vector2(0.024 * (1 + 2.1 * Math.pow(u, 0.75)), -u)); } return new THREE.LatheGeometry(pts, 32); })();
      const mats = []; const out = { main: [], brake: [], rcs: {} };
      const plumeMat = (core, outC, dia) => { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 0 }, uT: { value: 0 }, uCore: { value: new THREE.Color(core) }, uOut: { value: new THREE.Color(outC) }, uDia: { value: dia } }, vertexShader: PLUME_V, fragmentShader: PLUME_F }); mats.push(m); return m; };
      const nozzle = (parent, p, dir, scale, kind, list) => { const g = new THREE.Group(); const w = parent.userData.w; g.position.set(p[0] - w.x, p[1] - w.y, p[2] - w.z); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...dir).normalize()); g.scale.setScalar(scale); parent.add(g);
        const co = new THREE.Mesh(collar, outerMat); co.position.y = 0.004; g.add(co); const bo = new THREE.Mesh(bellOut, outerMat); g.add(bo); const bi = new THREE.Mesh(bellIn, heat[kind]); bi.material.side = THREE.BackSide; g.add(bi);
        const outer = new THREE.Mesh(plumeG, plumeMat(kind === 'rcs' ? 0xeaf2ff : 0xf4f6ff, kind === 'rcs' ? 0x9fb8ff : 0x6f8cff, kind === 'main' ? 0.35 : 0)); outer.position.y = -0.05; outer.scale.set(1, 0.001, 1); g.add(outer);
        const core = new THREE.Mesh(plumeG, plumeMat(0xffffff, 0xc8d6ff, kind === 'main' ? 0.5 : 0)); core.position.y = -0.05; core.scale.set(0.45, 0.001, 0.45); g.add(core);
        [bo, bi, co, outer, core].forEach(m => { m.frustumCulled = false; });
        const n = { g, outer, core, scale, kind, base: kind === 'main' ? 0.75 : kind === 'brake' ? 0.45 : 0.34 }; list && list.push(n); return n; };
      const C = rg.B.chest, pw = [0, 1.25, -0.27]; // plss origin in model space (chest-relative positions below are absolute model space)
      // main propulsion: two nozzles at the back of the jet unit, exhausting backwards and slightly down/out
      [-1, 1].forEach(sx => nozzle(C, [0.13 * sx, 0.875, -0.392], [0.08 * sx, -0.18, -1], 1.25, 'main', out.main));
      // braking: two nozzles at the front of the jet-unit towers, exhausting forwards
      [-1, 1].forEach(sx => nozzle(C, [0.25 * sx, 0.93, -0.215], [0.18 * sx, -0.08, 1], 0.8, 'brake', out.brake));
      // attitude control: a cluster at each corner of the backpack — lateral (±x) everywhere, up at the top, down at the bottom
      [['TL', 1, 1.53], ['TR', -1, 1.53], ['BL', 1, 0.96], ['BR', -1, 0.96]].forEach(([k, sx, y]) => { const side = y > 1.2 ? 1 : -1;
        out.rcs[k] = { lat: nozzle(C, [0.234 * sx, y, -0.33], [sx, 0, 0], 0.62, 'rcs'), vert: nozzle(C, [0.17 * sx, y + 0.03 * side, -0.36], [0, side, 0], 0.62, 'rcs') }; });
      void pw;
      // exhaust particles (main and braking jets only): a fixed ring buffer of GPU points in world space
      const NP = q === 0 ? 120 : 240, P = new Float32Array(NP * 3), A = new Float32Array(NP * 2), V = new Float32Array(NP * 3);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aLife', new THREE.BufferAttribute(A, 2));
      const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: 1 } },
        vertexShader: 'attribute vec2 aLife; uniform float uPx; varying float vL; void main(){ vL=aLife.x; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=(aLife.x>0.0? (4.0+22.0*(1.0-aLife.x))*aLife.y*uPx*(3.0/max(0.5,-mv.z)) : 0.0); }',
        fragmentShader: 'varying float vL; void main(){ if(vL<=0.0) discard; vec2 c=gl_PointCoord-0.5; float a=exp(-dot(c,c)*16.0); vec3 col=mix(vec3(0.42,0.5,1.0),vec3(0.95,0.96,1.0),vL*vL); gl_FragColor=vec4(col*a*vL*vL*0.35,1.0); }' });
      const pts = new THREE.Points(g, pm); pts.frustumCulled = false; scene.add(pts);
      out.parts = { pts, P, A, V, NP, i: 0, acc: 0, g, pm }; out.mats = mats; out.heat = heat; out.geos = [bellOut, bellIn, collar, plumeG]; out.outerMat = outerMat;
      return out; }

    /* ===================================================================== live reflections in the visor */
    function makeEnvRig() {
      if (!o.renderer || q === 0) return null;
      const size = q >= 2 ? 128 : 64, rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
      const cam = new THREE.CubeCamera(0.3, 2000, rt); scene.add(cam);
      return { rt, cam, every: q >= 2 ? 0.5 : 1.4 };
    }

    /* ===================================================================== API */
    const api = {
      root, get ready() { return st.ready; }, get pos() { return root.position; }, get speed() { return st.speed; }, get lead() { return st.lead; }, get bank() { return st.bank; },
      load(url, warm) { // built here (no download); kept async so the universe's loading sequence is unchanged
        return new Promise(res => (window.requestIdleCallback || setTimeout)(res, { timeout: 200 })).then(() => {
          rig = buildSuit(); const holder = new THREE.Group(); rig.mesh.position.set(0, -0.95, 0); holder.add(rig.mesh); holder.scale.setScalar(0.46); body.add(holder);
          thr = thrusters(rig); envRig = makeEnvRig(); if (envRig) rig.glossy.forEach(m => { m.envMap = envRig.rt.texture; m.needsUpdate = true; });
          warm && warm(holder); st.ready = true; root.visible = true; return true; });
      },
      setAnchors(points) { st.curve = new THREE.CatmullRomCurve3(points, false, 'centripetal'); },
      fly(target, beside, ms) { st.flight = { t0: performance.now(), ms: ms * 1.25, p0: root.position.clone(), p1: beside.clone(), c: root.position.clone().lerp(beside, 0.5).add(tmp.set(0, 1.0, 0)), look: target.clone() }; },
      endFlight() { st.flight = null; st.off = null; },
      resetTrail() { st.off = null; st.uVel = 0; st.lead = 0; st.fresh = true; },
      update({ u, dt, t, lookAt, still, camera, obstacles, near, opening }) {
        if (!st.ready || !st.curve) return; dt = Math.max(1e-3, Math.min(0.25, dt)); camera.updateMatrixWorld();
        const du = (u - st.uPrev) / dt; st.uPrev = u; st.uVel += (du - st.uVel) * damp(4, dt);
        const travel = still ? 0 : clamp(Math.abs(st.uVel) * 9, 0, 1);
        st.lead += ((still ? 0 : clamp(st.uVel * 0.25, -0.012, 0.012)) - st.lead) * damp(3, dt);
        st.prev.copy(root.position);
        const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); th0.v = th; th0.a = camera.aspect; const frame = v => { v.z = Math.min(v.z, -2.9); const d = -v.z; v.x = clamp(v.x, -d * th * camera.aspect * 0.74, d * th * camera.aspect * 0.74); v.y = clamp(v.y, -d * th * 0.64, Math.max(-d * th * 0.64, d * th * 0.8 - 1.95 * root.scale.y)); return v; }; /* v44: the origin is at the boots, so the bound keeps the top of the helmet (~1.9 above it) below the page header (top 10% of the view) */
        if (st.flight) { const F = st.flight, k = sstep(clamp((performance.now() - F.t0) / F.ms, 0, 1)), a = 1 - k;
          st.pos.set(a * a * F.p0.x + 2 * a * k * F.c.x + k * k * F.p1.x, a * a * F.p0.y + 2 * a * k * F.c.y + k * k * F.p1.y, a * a * F.p0.z + 2 * a * k * F.c.z + k * k * F.p1.z); }
        else {
          st.curve.getPoint(clamp(u + st.lead, 0, 1), tmp); camera.worldToLocal(tmp); frame(tmp);
          /* while travelling the astronaut flies in a chase slot just ahead of the lens (seen from behind and a little to the side) */
          const ch = sstep(clamp(travel * 1.25, 0, 1)); if (ch > 0.001) { st.side = st.side || Math.sign(tmp.x || 1); if (Math.abs(tmp.x) > 0.6) st.side = Math.sign(tmp.x); tmp.lerp(tmp3.set(st.side * 0.85, -0.5, -3.4), ch * 0.85); }
          if (obstacles && obstacles.length) keepClear(tmp, camera, obstacles, frame);
          if (!st.off || st.fresh) { st.off = tmp.clone(); st.offV.set(0, 0, 0); st.fresh = false; }
          let urgent = false; const C = st.clear; if (C && st.off.z < -0.5) { const k = C.d / -st.off.z, x = st.off.x * k, y = st.off.y * k; for (let i = 0; i < C.list.length; i += 4) if (Math.hypot(x - C.list[i], y - C.list[i + 1]) < C.list[i + 2]) { urgent = true; break; } }
          const w = urgent ? 7 : 2.6; tmp2.subVectors(tmp, st.off).multiplyScalar(w * w).addScaledVector(st.offV, -2 * w); st.offV.addScaledVector(tmp2, dt);
          const vmax = urgent ? 7 : 2.6; if (st.offV.length() > vmax) st.offV.setLength(vmax); st.off.addScaledVector(st.offV, dt);
          st.pos.copy(st.off); camera.localToWorld(st.pos);
          if (obstacles) for (const ob of obstacles) { tmp2.subVectors(st.pos, ob.p); const L = tmp2.length(); if (L < ob.r) { st.pos.copy(ob.p).addScaledVector(tmp2.divideScalar(Math.max(L, 1e-4)), ob.r); st.off.copy(st.pos); camera.worldToLocal(st.off); } }
        }
        if (!Number.isFinite(st.pos.x + st.pos.y + st.pos.z)) { st.nan++; st.pos.copy(st.prev); st.off = null; st.offV.set(0, 0, 0); } // never let an invalid transform reach the scene
        root.position.copy(st.pos);
        /* kinematics (world space, smoothed): speed, acceleration */
        tmp.subVectors(root.position, st.prev).divideScalar(dt); if (tmp.length() > 400) tmp.set(0, 0, 0); st.vel.lerp(tmp, damp(3, dt));
        const sp = st.vel.length(), acc = (sp - st.speed) / dt; st.speed += (sp - st.speed) * damp(4, dt); st.acc += (acc - st.acc) * damp(2.5, dt);
        const moving = st.flight ? 1 : travel;
        /* orientation: along the travel direction while moving, toward the world at rest; banks into lateral motion */
        const look = st.flight ? st.flight.look : lookAt; camera.getWorldDirection(tmp2);
        if (moving > 0.05 && sp > 0.3) { tmp.copy(st.vel).normalize().lerp(tmp2, 0.35).normalize(); tmp.multiplyScalar(10).add(root.position); if (look) tmp.lerp(look, 1 - moving); } else if (look) tmp.copy(look); else tmp.copy(root.position).add(tmp2);
        m4.lookAt(tmp, root.position, up); qa.setFromRotationMatrix(m4);
        const latIn = st.off ? clamp(-st.offV.x * 0.55, -1, 1) : 0; st.bank += (clamp(latIn * 0.35, -0.35, 0.35) - st.bank) * damp(2, dt);
        const W = st.out ? st.out.weights : null, flyW = W ? W.cruise + W.accel : moving, brkW = W ? W.brake : 0;
        qr.setFromEuler(e3.set(0.9 * flyW - 0.32 * brkW, 0, st.bank)); qa.multiply(qr); // lean into the flight; sit back to brake
        st.qPrev.copy(root.quaternion); root.quaternion.slerp(qa, damp(st.flight ? 2.4 : 1.6, dt));
        /* angular velocity in the body frame → yaw / pitch inputs for the attitude jets and the turn layer */
        qr.copy(st.qPrev).invert().multiply(root.quaternion); const ang = 2 * Math.acos(clamp(qr.w, -1, 1)), sn = Math.sqrt(Math.max(1e-9, 1 - qr.w * qr.w)); const wy = qr.y / sn * ang / dt, wx = qr.x / sn * ang / dt;
        st.yawRate += ((ang > 1e-6 ? wy : 0) - st.yawRate) * damp(6, dt); st.pitchRate += ((ang > 1e-6 ? wx : 0) - st.pitchRate) * damp(6, dt);
        /* gaze/pointing direction to the world, in body space */
        let lookYaw = 0, lookPitch = 0, pointDir = null; if (look) { tmp.copy(look); root.worldToLocal(tmp); const L = tmp.length() || 1; lookYaw = Math.atan2(tmp.x, tmp.z); lookPitch = Math.asin(clamp(tmp.y / L, -1, 1)); pointDir = [tmp.x / L, tmp.y / L - 0.05, tmp.z / L]; }
        const input = { t, still, travel: moving, accel: clamp(st.acc / 18, 0, 1), decel: clamp(-st.acc / 14, 0, 1), lat: latIn, yaw: clamp(st.yawRate / 1.2, -1, 1), pitch: clamp(st.pitchRate / 1.2, -1, 1), near: clamp(near || 0, 0, 1) * (st.flight ? 0 : 1), opening: !!opening, lookYaw: clamp(lookYaw, -1.2, 1.2), lookPitch: clamp(lookPitch, -0.7, 0.7), pointDir };
        st.in = input; st.out = ANIM ? ANIM.step(input, dt) : null;
        if (st.out) pose(st.out, t, still);
        exhaust(dt, still, api.force || (st.out ? st.out.thrust : null), t); // api.force: inspection only (forces jets on)
        reflect(dt, still);
      },
      debug() { const O = st.out; let bad = 0; if (rig) rig.mesh.traverse(m => { const e = m.matrixWorld.elements; for (let i = 0; i < 16; i++) if (!Number.isFinite(e[i])) { bad++; break; } });
        return { ready: st.ready, weights: O && Object.fromEntries(Object.entries(O.weights).map(([k, v]) => [k, +v.toFixed(3)])), thrust: O && { main: +O.thrust.main.toFixed(3), brake: +O.thrust.brake.toFixed(3), rcs: Object.fromEntries(Object.entries(O.thrust.rcs).map(([k, v]) => [k, +v.toFixed(3)])) }, gesture: O && O.gesture, input: st.in && { travel: +st.in.travel.toFixed(3), accel: +st.in.accel.toFixed(3), decel: +st.in.decel.toFixed(3), lat: +st.in.lat.toFixed(3), yaw: +st.in.yaw.toFixed(3), near: +st.in.near.toFixed(3) }, joints: O && Object.fromEntries(Object.entries(O.joints).map(([k, v]) => [k, v.map(x => +x.toFixed(3))])), nanTransforms: bad, nanGuards: st.nan, particles: thr ? thr.parts.NP : 0, envLive: !!envRig }; },
      dispose() { scene.remove(root); if (rig) { rig.mats.forEach(m => m.dispose()); rig.tex.forEach(x => x && x.dispose()); rig.mesh.traverse(m => m.geometry && m.geometry.dispose()); }
        if (thr) { thr.mats.forEach(m => m.dispose()); Object.values(thr.heat).forEach(m => m.dispose()); thr.outerMat.dispose(); thr.geos.forEach(g => g.dispose()); scene.remove(thr.parts.pts); thr.parts.g.dispose(); thr.parts.pm.dispose(); }
        if (envRig) { scene.remove(envRig.cam); envRig.rt.dispose(); } }
    };

    /* keep the target clear of every world: in front of it along the line of sight, and away from its silhouette on screen */
    function keepClear(T, camera, obstacles, frame) {
      const cp = camera.position, wv = tmp3;
      wv.copy(T); camera.localToWorld(wv);
      for (const ob of obstacles) { const L = tmp2.subVectors(wv, cp), len = L.length(); L.divideScalar(len); const ocx = ob.p.x - cp.x, ocy = ob.p.y - cp.y, ocz = ob.p.z - cp.z, along = ocx * L.x + ocy * L.y + ocz * L.z, d2 = ocx * ocx + ocy * ocy + ocz * ocz - along * along;
        if (along > 0 && d2 < ob.r * ob.r) { const nearD = along - Math.sqrt(ob.r * ob.r - d2); if (nearD < len && nearD > 3.2) wv.copy(cp).addScaledVector(L, nearD - 0.3); } }
      T.copy(wv); camera.worldToLocal(T); frame(T);
      const d = -T.z, RA = 0.66, list = [];
      for (const ob of obstacles) { wv.copy(ob.p); camera.worldToLocal(wv); if (wv.z > -0.5 || -wv.z < d - 0.2) continue; const k = d / -wv.z, rb = (ob.rb || ob.r * 0.6) * k; if (rb < 0.006 * d) continue; list.push(wv.x * k, wv.y * k, rb + RA, ((ob.rv || ob.rb || ob.r) * k) + RA); }
      st.clear = list.length ? { list, d } : null; if (!list.length) { st.lastT = null; return; }
      const cost = (x, y) => { let c = 0; for (let i = 0; i < list.length; i += 4) { const dd = Math.hypot(x - list[i], y - list[i + 1]); if (dd < list[i + 2]) c += 40 + (list[i + 2] - dd) * 60; if (dd < list[i + 3]) c += (list[i + 3] - dd) * 2.5; } return c; };
      const ox = T.x, oy = T.y, lx = st.lastT ? st.lastT.x : ox, ly = st.lastT ? st.lastT.y : oy, hw = d * th0.v * th0.a * 0.74, hh = d * th0.v * 0.64;
      let bx = ox, by = oy, best = cost(ox, oy) + 0.35 * Math.hypot(ox - lx, oy - ly);
      if (best > 0.001) for (let r = 0.2; r <= 3.4; r += 0.2) for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, x = clamp(ox + Math.cos(a) * r, -hw, hw), y = clamp(oy + Math.sin(a) * r, -hh, hh);
        const c = cost(x, y) + 0.5 * Math.hypot(x - ox, y - oy) + 0.35 * Math.hypot(x - lx, y - ly); if (c < best) { best = c; bx = x; by = y; } }
      T.x = bx; T.y = by; st.lastT = st.lastT || new THREE.Vector2(); st.lastT.set(bx, by);
    }
    const th0 = { v: 0.4, a: 1.6 };

    /* ===================================================================== apply the animated pose to the rig */
    function pose(O, t, still) {
      if (!rig) return; const B = rig.B;
      Object.entries(O.joints).forEach(([name, v]) => { const b = B[name]; if (b) b.quaternion.copy(rig.rest[name]).multiply(qr.setFromEuler(e3.set(v[0], v[1], v[2]))); });
      ['L', 'R'].forEach(s => { const H = rig.hands[s], F = O.fingers[s], sx = H.sx;
        H.fingers.forEach((f, i) => { const c = clamp(i === 0 ? F.index : F.curl, 0, 1); f.base.rotation.z = -sx * c * 1.25 * (0.95 + i * 0.03); f.mid.rotation.z = -sx * c * 1.05; });
        H.thumb.base.rotation.set(-0.35 - F.thumb * 0.4, 0, -sx * (0.35 + F.thumb * 0.55)); H.thumb.mid.rotation.z = -sx * F.thumb * 0.8; });
      const breath = 1 + 0.012 * Math.sin(t * 1.25) * (still ? 0 : 1); B.chest.scale.set(breath, 1 + (breath - 1) * 0.4, breath);
      rig.leds.forEach(l => { l.visible = (t % 1.6) < 0.18 || still; });
    }

    /* ===================================================================== exhaust */
    function exhaust(dt, still, TH, t) {
      if (!thr) return; const calm = still ? 0 : 1, Tm = TH ? TH.main * calm : 0, Tb = TH ? TH.brake * calm : 0, R = TH ? TH.rcs : {};
      const set = (n, I, k) => { const fl = 0.93 + 0.07 * Math.sin(t * 47 + k * 1.7) * Math.sin(t * 31 + k); const len = Math.max(0.001, (0.15 + 0.85 * I) * n.base * fl);
        n.outer.material.uniforms.uI.value = I * 0.9; n.outer.material.uniforms.uT.value = t + k; n.outer.scale.set(1 + 0.25 * I, len / 1, 1 + 0.25 * I); n.outer.visible = I > 0.015;
        n.core.material.uniforms.uI.value = I * 1.5; n.core.material.uniforms.uT.value = t * 1.3 + k; n.core.scale.set(0.45, len * 0.38, 0.45); n.core.visible = I > 0.015; };
      thr.main.forEach((n, k) => set(n, Tm, k)); thr.brake.forEach((n, k) => set(n, Tb, k + 7));
      const rc = { TL: { lat: R.yawL || 0, vert: R.down || 0 }, BL: { lat: R.yawL || 0, vert: R.up || 0 }, TR: { lat: Math.max(R.yawR || 0, R.latL || 0), vert: R.down || 0 }, BR: { lat: Math.max(R.yawR || 0, R.latL || 0), vert: R.up || 0 } };
      if (R.latR) { rc.TL.lat = Math.max(rc.TL.lat, R.latR); rc.BL.lat = Math.max(rc.BL.lat, R.latR); }
      Object.entries(thr.rcs).forEach(([k, c], i) => { set(c.lat, clamp(rc[k].lat, 0, 1) * calm, 20 + i); set(c.vert, clamp(rc[k].vert, 0, 1) * calm, 30 + i); });
      thr.heat.main.emissiveIntensity = 2.2 * Tm; thr.heat.brake.emissiveIntensity = 2.0 * Tb; thr.heat.rcs.emissiveIntensity = 1.5 * Math.max(0, ...Object.values(R).map(Number)); // cold at rest; heat only while firing
      // particles stream from the main and braking jets (world space), inherit the astronaut's velocity, and fade
      const P = thr.parts, rate = (Tm * 80 + Tb * 40) * calm; P.acc += dt * rate;
      while (P.acc >= 1) { P.acc -= 1; const useB = Tb > 0 && P.i % 3 === 0 ? true : Tm < 0.02; const L = useB ? thr.brake : thr.main; if (!L.length) break; const n = L[P.i % L.length]; const j = P.i++ % P.NP;
        n.core.getWorldPosition(tmp); n.g.getWorldQuaternion(qa); const h = (P.i * 0.618034) % 1, h2 = (P.i * 0.381966) % 1; tmp2.set((h - 0.5) * 0.22, -1, (h2 - 0.5) * 0.22).applyQuaternion(qa).multiplyScalar(0.9 + h * 0.7);
        P.P[j * 3] = tmp.x; P.P[j * 3 + 1] = tmp.y; P.P[j * 3 + 2] = tmp.z; P.V[j * 3] = tmp2.x + st.vel.x * 0.5; P.V[j * 3 + 1] = tmp2.y + st.vel.y * 0.5; P.V[j * 3 + 2] = tmp2.z + st.vel.z * 0.5; P.A[j * 2] = 1; P.A[j * 2 + 1] = useB ? 0.55 : 1; }
      for (let j = 0; j < P.NP; j++) { if (P.A[j * 2] <= 0) continue; P.A[j * 2] = Math.max(0, P.A[j * 2] - dt * 1.6); P.P[j * 3] += P.V[j * 3] * dt; P.P[j * 3 + 1] += P.V[j * 3 + 1] * dt; P.P[j * 3 + 2] += P.V[j * 3 + 2] * dt; }
      P.g.attributes.position.needsUpdate = true; P.g.attributes.aLife.needsUpdate = true; P.pm.uniforms.uPx.value = Math.min(2, devicePixelRatio || 1);
    }

    /* visor reflections: re-render the surroundings from the helmet now and then (not every frame), the astronaut hidden */
    function reflect(dt, still) {
      if (!envRig || !rig) return; st.envT -= dt; const moved = !st.envP || st.envP.distanceToSquared(root.position) > 0.25; if (st.envT > 0 || (!moved && st.envT > -3)) return; st.envT = envRig.every; st.envP = (st.envP || new THREE.Vector3()).copy(root.position);
      rig.visor.getWorldPosition(envRig.cam.position); const wasT = thr && thr.parts.pts.visible; root.visible = false; if (thr) thr.parts.pts.visible = false;
      try { envRig.cam.update(o.renderer, scene); envRig.rt.texture.needsPMREMUpdate = true; } catch (e) { /* reflections are optional */ }
      root.visible = true; if (thr) thr.parts.pts.visible = wasT;
    }
    return api;
  };
})();
