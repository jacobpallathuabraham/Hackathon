/* ERLY Learning Studio — the astronaut (used by ls-cosmos.js). v40.

   Built in code, no downloaded model. Three parts:

   1. The suit — modelled on a real extravehicular suit, at human proportions (not a toy): a hard upper torso with a
      display-and-control unit, a life-support backpack carrying a small jet unit, soft fabric limbs with real folds
      (displaced geometry, plus a quilted normal map and a fabric sheen), bellows at the elbows and knees, anodised bearing
      rings, gloves with articulated fingers and dark grip pads, shaped boots, red commander stripes, an ERLY mission
      patch, and the helmet: a clear polycarbonate bubble inside a white visor shell, a gold sun visor that mirrors the sky
      (environment map rendered from the universe) and two helmet lamps.

   2. Motion — a jointed body (pelvis, chest, head, upper arms, forearms, hands, thighs, shins, feet) animated
      procedurally from what the astronaut is doing:
        · at rest it hangs in the "neutral body posture" every astronaut adopts in weightlessness (arms floating up and
          forward, elbows and knees softly bent), with slow, layered, never-repeating drift, breathing, and head turns
          toward the world it is looking at; now and then it waves, points at the world, or looks around;
        · travelling, it flies: one arm reaches ahead, the other trails, the legs stretch out behind with a slow flutter
          kick, the body leans into the flight and the torso twists into turns;
        · braking, the arms and knees come forward;
      every joint eases toward its target with its own damping, so poses blend; nothing snaps.

   3. Thrusters — a jet unit under the backpack with four rear nozzles: a turbulent plume (white-hot core, shock
      diamonds, blue-violet outer flame, flicker) whose length follows thrust; glowing exhaust particles (GPU points)
      that stream out and fade; two forward nozzles that fire when braking; tiny attitude puffs at rest.

   Placement: the astronaut is carried with the camera; its place in the shot eases (critically damped spring) toward the
   composition for the current scene. That target is kept (a) in frame, (b) in front of every world — slid along the line
   of sight, so its screen position does not change — and (c) clear of every nearby world's silhouette ON SCREEN, so it
   never appears to touch or overlap a planet, at rest or while scrolling. Its real position is also kept out of every
   world's safety sphere.

   API (used by ls-cosmos.js): root, ready, pos, speed, lead, bank, load(), setAnchors(), fly(), endFlight(),
   resetTrail(), update({u, dt, t, lookAt, still, camera, obstacles}), dispose(). */
(function () {
  'use strict';
  const LS = window.LS;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sstep = t => t * t * t * (t * (t * 6 - 15) + 10);
  const damp = (k, dt) => 1 - Math.exp(-k * dt);

  LS.cosmosAstronaut = function (THREE, scene, o = {}) {
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    const body = new THREE.Group(); root.add(body);
    const st = { ready: false, curve: null, uPrev: 0, uVel: 0, lead: 0, pos: new THREE.Vector3(), off: null, offV: new THREE.Vector3(), vel: new THREE.Vector3(), prev: new THREE.Vector3(), speed: 0, acc: 0, thrust: 0, brake: 0, bank: 0, turn: 0, flight: null, fresh: true,
      act: { kind: null, t: 0, len: 0, next: 6 }, trav: 0, kick: 0 };
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), qa = new THREE.Quaternion(), qr = new THREE.Quaternion(), e3 = new THREE.Euler();
    let rig = null, thr = null;

    /* ===================================================================== the suit */
    function fabricNormal() {
      const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), H = new Float32Array(N * N);
      let sd = 7; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const creases = Array.from({ length: 46 }, () => [R() * N, R() * N, 10 + R() * 30, R() * Math.PI, 0.3 + R() * 0.5]);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let h = 0.5 + 0.1 * Math.sin((y / N) * Math.PI * 2 * 8 + Math.sin(x / N * Math.PI * 2 * 3) * 0.6);        // quilting rows
        h += 0.035 * Math.sin((x / N) * Math.PI * 2 * 48) + 0.035 * Math.sin((y / N) * Math.PI * 2 * 48);            // weave
        for (const [cx, cy, len, a, s] of creases) { let dx = x - cx, dy = y - cy; dx -= N * Math.round(dx / N); dy -= N * Math.round(dy / N); const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a); if (Math.abs(u) < len) h += s * 0.16 * Math.exp(-v * v / 6) * (1 - Math.abs(u) / len); }
        H[y * N + x] = h; }
      const img = g.createImageData(N, N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const at = (i, j) => H[((j + N) % N) * N + ((i + N) % N)]; const dx = (at(x + 1, y) - at(x - 1, y)) * 3, dy = (at(x, y + 1) - at(x, y - 1)) * 3; const l = Math.hypot(dx, dy, 1), k = (y * N + x) * 4;
        img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
      g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); t.anisotropy = 4; return t; }
    function patchTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#1b2a6b'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#e8c56a'; g.lineWidth = 5; g.stroke();
      const gr = g.createLinearGradient(0, 30, 0, 90); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(1, '#ff8a4c'); g.fillStyle = gr; g.beginPath(); g.arc(64, 78, 24, Math.PI, 0); g.fill();
      g.strokeStyle = '#ffd27a'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) / 7 * Math.PI; g.beginPath(); g.moveTo(64 + Math.cos(a) * 30, 78 + Math.sin(a) * 30); g.lineTo(64 + Math.cos(a) * 40, 78 + Math.sin(a) * 40); g.stroke(); }
      g.fillStyle = '#f4efe6'; g.fillRect(28, 80, 72, 4); g.font = '600 15px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('ERLY', 64, 104);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
    function roundedBox(w, h, d, r, seg) { const sh = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
      sh.moveTo(x, -h / 2); sh.lineTo(x + ww, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, y); sh.lineTo(w / 2, y + hh); sh.quadraticCurveTo(w / 2, h / 2, x + ww, h / 2); sh.lineTo(x, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, y + hh); sh.lineTo(-w / 2, y); sh.quadraticCurveTo(-w / 2, -h / 2, x, -h / 2);
      const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: seg || 4, curveSegments: 6 }); g.translate(0, 0, -Math.max(0.001, d - 2 * r) / 2); g.computeVertexNormals(); return g; }
    // a fabric limb: a capsule with soft, uneven circumferential folds (the way a pressurised suit wrinkles)
    function foldedLimb(r, len, seed, folds) { const g = new THREE.CapsuleGeometry(r, Math.max(0.01, len), 8, 28), p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const y = v.y / (len / 2 + r); if (Math.abs(y) > 0.78) continue; const ang = Math.atan2(v.z, v.x);
        const f = 1 + 0.045 * Math.sin(y * folds * Math.PI + Math.sin(ang * 2 + seed) * 0.8 + seed) * (1 - Math.abs(y)) + 0.012 * Math.sin(ang * 5 + y * 11 + seed);
        p.setXYZ(i, v.x * f, v.y, v.z * f); }
      g.computeVertexNormals(); return g; }

    function buildSuit() {
      const env = o.env || null, fab = fabricNormal(), mats = [];
      const M = (Ctor, p) => { const m = new Ctor(Object.assign({ envMap: env, envMapIntensity: 0.5 }, p)); mats.push(m); return m; };
      const suit = M(THREE.MeshPhysicalMaterial, { color: 0xe4e1da, roughness: 0.86, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.7, normalMap: fab, normalScale: new THREE.Vector2(0.55, 0.55) });
      const fold = M(THREE.MeshStandardMaterial, { color: 0xc7c3bb, roughness: 0.92, normalMap: fab, normalScale: new THREE.Vector2(0.3, 0.3) });
      const hut = M(THREE.MeshStandardMaterial, { color: 0xe9e6e0, roughness: 0.3, metalness: 0.03, envMapIntensity: 0.9 });
      const metal = M(THREE.MeshStandardMaterial, { color: 0xc8ccd3, metalness: 0.95, roughness: 0.24, envMapIntensity: 1.3 });
      const anod = M(THREE.MeshStandardMaterial, { color: 0x3b5fc4, metalness: 0.85, roughness: 0.3, envMapIntensity: 1.1 });
      const red = M(THREE.MeshStandardMaterial, { color: 0xb3372b, roughness: 0.72 });
      const glove = M(THREE.MeshStandardMaterial, { color: 0xd9d6cf, roughness: 0.8, normalMap: fab, normalScale: new THREE.Vector2(0.25, 0.25) });
      const grip = M(THREE.MeshStandardMaterial, { color: 0x6f7279, roughness: 0.75 });
      const boot = M(THREE.MeshStandardMaterial, { color: 0xd3d0c9, roughness: 0.78 }), sole = M(THREE.MeshStandardMaterial, { color: 0x34373e, roughness: 0.9 });
      const dark = M(THREE.MeshStandardMaterial, { color: 0x2c3038, roughness: 0.5, metalness: 0.45 });
      const shell = M(THREE.MeshPhysicalMaterial, { color: 0xf0eee9, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 });
      const bubble = M(THREE.MeshPhysicalMaterial, { color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false });
      const visor = M(THREE.MeshPhysicalMaterial, { color: 0xffcf74, metalness: 1, roughness: 0.035, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.4 });
      const cap = M(THREE.MeshStandardMaterial, { color: 0x1d2027, roughness: 0.8 });
      const lamp = M(THREE.MeshStandardMaterial, { color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 3.4, roughness: 0.3 });
      const ledG = M(THREE.MeshStandardMaterial, { color: 0x103010, emissive: 0x39ff7a, emissiveIntensity: 2.6 }), ledR = M(THREE.MeshStandardMaterial, { color: 0x301010, emissive: 0xff4a3a, emissiveIntensity: 2.4 });
      const screen = M(THREE.MeshStandardMaterial, { color: 0x0b1a22, emissive: 0x2cc6a6, emissiveIntensity: 0.55, roughness: 0.25 });
      const patch = M(THREE.MeshStandardMaterial, { map: patchTex(), roughness: 0.7, transparent: true });
      const B = {}, R0 = new THREE.Group();
      const J = (name, x, y, z, parent) => { const b = new THREE.Object3D(); b.name = name; const pw = parent ? parent.userData.w : new THREE.Vector3(); b.position.set(x - pw.x, y - pw.y, z - pw.z); b.userData.w = new THREE.Vector3(x, y, z); (parent || R0).add(b); B[name] = b; return b; };
      const at = (parent, m, x, y, z, rx, ry, rz) => { const w = parent.userData.w; m.position.set(x - w.x, y - w.y, z - w.z); m.rotation.set(rx || 0, ry || 0, rz || 0); parent.add(m); return m; };
      const add = (parent, geo, mat, x, y, z, rx, ry, rz) => at(parent, new THREE.Mesh(geo, mat), x, y, z, rx, ry, rz);
      const between = (parent, geo, mat, a, b) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), m = new THREE.Mesh(geo, mat), mid = A.clone().add(Bv).multiplyScalar(0.5), w = parent.userData.w; m.position.set(mid.x - w.x, mid.y - w.y, mid.z - w.z); m.quaternion.setFromUnitVectors(up, Bv.sub(A).normalize()); parent.add(m); return m; };
      const ring = (parent, p, r, tube, mat, dir) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 40), mat), w = parent.userData.w; m.position.set(p[0] - w.x, p[1] - w.y, p[2] - w.z); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...(dir || [0, 1, 0])).normalize()); parent.add(m); return m; };
      const lathe = (pts, segs) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs || 48);
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

      /* skeleton (model units: feet at y=0, ~1.95 tall, facing +z; +x is the astronaut's left) */
      J('pelvis', 0, 0.95, 0.0); J('chest', 0, 1.2, 0.0, B.pelvis); J('head', 0, 1.5, 0.02, B.chest);
      const SH = [0.235, 1.43, 0.0], EL = [0.29, 1.15, 0.03], WR = [0.315, 0.9, 0.06], HP = [0.105, 0.93, 0.01], KN = [0.115, 0.53, 0.04], AN = [0.12, 0.13, 0.02];
      [['L', 1], ['R', -1]].forEach(([s, sx]) => { J('uArm' + s, SH[0] * sx, SH[1], SH[2], B.chest); J('fArm' + s, EL[0] * sx, EL[1], EL[2], B['uArm' + s]); J('hand' + s, WR[0] * sx, WR[1], WR[2], B['fArm' + s]);
        J('thigh' + s, HP[0] * sx, HP[1], HP[2], B.pelvis); J('shin' + s, KN[0] * sx, KN[1], KN[2], B['thigh' + s]); J('foot' + s, AN[0] * sx, AN[1], AN[2], B['shin' + s]); });

      /* torso: soft lower torso (briefs), waist bearing, hard upper torso, neck ring */
      add(B.pelvis, lathe([[0.001, 0.8], [0.15, 0.81], [0.178, 0.88], [0.184, 0.96], [0.176, 1.03], [0.001, 1.04]]), suit, 0, 0, 0.0).scale.set(1, 1, 0.82);
      ring(B.pelvis, [0, 1.03, 0], 0.172, 0.018, metal); ring(B.pelvis, [0, 1.012, 0], 0.175, 0.009, anod);
      add(B.chest, lathe([[0.001, 1.03], [0.165, 1.04], [0.2, 1.12], [0.224, 1.24], [0.226, 1.36], [0.2, 1.44], [0.12, 1.49], [0.001, 1.495]], 56), hut, 0, 0, 0.0).scale.set(1, 1, 0.76);
      ring(B.chest, [0, 1.485, 0.02], 0.118, 0.026, metal); ring(B.chest, [0, 1.507, 0.02], 0.114, 0.012, anod);
      // display-and-control unit on the chest, with a glowing screen, dials, switches and status lights
      add(B.chest, roundedBox(0.22, 0.11, 0.06, 0.018), hut, 0, 1.22, 0.186); add(B.chest, roundedBox(0.12, 0.035, 0.012, 0.006), screen, -0.03, 1.245, 0.217);
      [-0.075, -0.015, 0.045].forEach((x, i) => add(B.chest, new THREE.CylinderGeometry(0.013, 0.015, 0.024, 18), i === 1 ? anod : metal, x, 1.195, 0.222, Math.PI / 2, 0, 0));
      add(B.chest, new THREE.SphereGeometry(0.007, 10, 8), ledG, 0.075, 1.25, 0.218); const ledRed = add(B.chest, new THREE.SphereGeometry(0.007, 10, 8), ledR, 0.09, 1.25, 0.218);
      add(B.chest, new THREE.CircleGeometry(0.048, 32), patch, -0.13, 1.35, 0.168, -0.15, -0.45, 0);
      // life-support backpack with a jet unit underneath, vents, and two hoses round to the chest unit
      add(B.chest, roundedBox(0.44, 0.58, 0.2, 0.045, 5), hut, 0, 1.24, -0.235); add(B.chest, roundedBox(0.36, 0.1, 0.16, 0.035), hut, 0, 1.56, -0.23);
      add(B.chest, roundedBox(0.44, 0.13, 0.17, 0.035), shell, 0, 0.9, -0.24);                                   // jet unit
      for (let i = 0; i < 5; i++) add(B.chest, new THREE.BoxGeometry(0.28, 0.008, 0.008), dark, 0, 1.06 + i * 0.024, -0.34);
      add(B.chest, roundedBox(0.14, 0.09, 0.025, 0.01), metal, 0.12, 1.4, -0.338);
      [-1, 1].forEach(sx => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.19 * sx, 1.08, -0.16), new THREE.Vector3(0.235 * sx, 1.1, 0.02), new THREE.Vector3(0.16 * sx, 1.17, 0.17), new THREE.Vector3(0.09 * sx, 1.2, 0.2)]); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 28, 0.014, 10), sx < 0 ? anod : fold); m.position.set(0, -1.2, 0); B.chest.add(m); });

      /* helmet: comm cap inside a clear bubble, a white visor shell, the gold sun visor, two lamps and a camera */
      const HC = [0, 1.66, 0.03];
      add(B.head, new THREE.SphereGeometry(0.105, 28, 20), cap, HC[0], HC[1] - 0.01, HC[2] - 0.01);
      add(B.head, new THREE.SphereGeometry(0.19, 48, 36), bubble, ...HC).renderOrder = 3;
      add(B.head, new THREE.SphereGeometry(0.205, 56, 40, Math.PI / 2 + 0.95, 2 * Math.PI - 1.9, 0, Math.PI * 0.82), shell, ...HC);   // back and sides
      add(B.head, new THREE.SphereGeometry(0.2, 56, 40, Math.PI / 2 - 1.05, 2.1, 0.38, 1.02), visor, ...HC);                        // gold visor (lowered)
      add(B.head, new THREE.TorusGeometry(0.2, 0.011, 10, 64), shell, HC[0], HC[1], HC[2], 0, 0, 0).rotation.set(0.06, 0, 0);       // visor rail
      [-1, 1].forEach(sx => { add(B.head, new THREE.CylinderGeometry(0.026, 0.03, 0.06, 20), metal, 0.18 * sx, HC[1] + 0.07, HC[2] + 0.05, Math.PI / 2, 0, 0); add(B.head, new THREE.CircleGeometry(0.022, 20), lamp, 0.18 * sx, HC[1] + 0.07, HC[2] + 0.081); });
      add(B.head, roundedBox(0.035, 0.03, 0.05, 0.008), dark, -0.19, HC[1] + 0.0, HC[2] + 0.05);

      /* arms: shoulder bearing, folded fabric, elbow bellows, wrist disconnect, gloves with fingers */
      [['L', 1], ['R', -1]].forEach(([s, sx], k) => { const U = B['uArm' + s], F = B['fArm' + s], Hd = B['hand' + s];
        const sh = [SH[0] * sx, SH[1], SH[2]], el = [EL[0] * sx, EL[1], EL[2]], wr = [WR[0] * sx, WR[1], WR[2]];
        add(U, new THREE.SphereGeometry(0.085, 32, 24), hut, sh[0] + 0.012 * sx, sh[1] + 0.005, sh[2]);
        ring(U, sh, 0.078, 0.016, metal, [sx, -0.2, 0]);
        between(U, foldedLimb(0.066, dist(sh, el) - 0.07, 1.3 + k, 5), suit, [sh[0] + 0.01 * sx, sh[1] - 0.04, sh[2]], [el[0], el[1] + 0.03, el[2]]);
        ring(U, [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2 + 0.03, (sh[2] + el[2]) / 2], 0.069, 0.01, red, [0.2 * sx, -1, 0.05]);
        [0.018, -0.008, -0.034].forEach(dy => ring(F, [el[0], el[1] + dy, el[2]], 0.064, 0.012, fold, [0.12 * sx, -1, 0.05]));
        between(F, foldedLimb(0.06, dist(el, wr) - 0.06, 2.1 + k, 4), suit, [el[0], el[1] - 0.04, el[2]], [wr[0], wr[1] + 0.02, wr[2]]);
        ring(F, [wr[0], wr[1] + 0.005, wr[2]], 0.056, 0.014, anod, [0.08 * sx, -1, 0.1]);
        // glove: palm, back of the hand with a grip pad, four slightly curled fingers and a thumb
        add(Hd, roundedBox(0.068, 0.085, 0.036, 0.016), glove, wr[0] + 0.004 * sx, wr[1] - 0.06, wr[2] + 0.004, 0, 0, 0.05 * sx);
        add(Hd, roundedBox(0.05, 0.05, 0.008, 0.004), grip, wr[0] + 0.004 * sx, wr[1] - 0.06, wr[2] + 0.022);
        for (let f = 0; f < 4; f++) { const fx = wr[0] + (0.025 - f * 0.017) * sx * -1 + 0.004 * sx, fl = [0.04, 0.046, 0.044, 0.036][f]; const fg = add(Hd, new THREE.CapsuleGeometry(0.0085, fl, 4, 10), glove, fx, wr[1] - 0.125, wr[2] + 0.012, 0.35, 0, 0); fg.position.y -= fl * 0.2; }
        add(Hd, new THREE.CapsuleGeometry(0.01, 0.035, 4, 10), glove, wr[0] - 0.04 * sx, wr[1] - 0.07, wr[2] + 0.028, 0.6, 0, 0.7 * sx); });

      /* legs: hip bearing, folded fabric, knee bellows, ankle ring, boots */
      [['L', 1], ['R', -1]].forEach(([s, sx], k) => { const T = B['thigh' + s], S = B['shin' + s], Ft = B['foot' + s];
        const hp = [HP[0] * sx, HP[1], HP[2]], kn = [KN[0] * sx, KN[1], KN[2]], an = [AN[0] * sx, AN[1], AN[2]];
        between(T, foldedLimb(0.082, dist(hp, kn) - 0.1, 3.7 + k, 5), suit, [hp[0], hp[1] - 0.06, hp[2]], [kn[0], kn[1] + 0.04, kn[2]]);
        ring(T, [(hp[0] + kn[0]) / 2, (hp[1] + kn[1]) / 2 + 0.06, (hp[2] + kn[2]) / 2], 0.085, 0.01, red, [0, 1, 0.05]);
        [0.03, 0.0, -0.03].forEach(dy => ring(S, [kn[0], kn[1] + dy, kn[2]], 0.08, 0.013, fold, [0, 1, 0.08]));
        between(S, foldedLimb(0.072, dist(kn, an) - 0.12, 4.9 + k, 4), suit, [kn[0], kn[1] - 0.04, kn[2]], [an[0], an[1] + 0.06, an[2]]);
        ring(S, [an[0], an[1] + 0.05, an[2]], 0.07, 0.015, metal);
        const bt = add(Ft, lathe([[0.001, 0.0], [0.06, 0.0], [0.07, 0.04], [0.066, 0.1], [0.058, 0.13], [0.001, 0.135]], 28), boot, an[0], -0.0, an[2] + 0.0); bt.position.y = -AN[1]; bt.scale.set(1, 1, 1.0);
        add(Ft, roundedBox(0.11, 0.07, 0.15, 0.03), boot, an[0], 0.04, an[2] + 0.08); add(Ft, roundedBox(0.125, 0.025, 0.25, 0.01), sole, an[0], 0.012, an[2] + 0.04); });

      R0.traverse(m => { if (m.isMesh) m.frustumCulled = false; });
      const rest = {}; Object.keys(B).forEach(k => { rest[k] = B[k].quaternion.clone(); });
      return { mesh: R0, B, rest, leds: [ledRed], mats, tex: [fab, patch.map] };
    }

    /* ===================================================================== thrusters */
    function plumeMat() { return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ vU=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: `uniform float uI; uniform float uT; varying vec2 vU; varying vec3 vN; varying vec3 vV;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){ float y=vU.y;                                   // 0 at the nozzle → 1 at the tip
          float edge=pow(abs(dot(vN,vV)),1.4);                         // brighter through the middle of the plume
          float turb=n(vec2(vU.x*9.0, y*7.0-uT*16.0))*0.6+n(vec2(vU.x*21.0, y*15.0-uT*27.0))*0.4;
          float diamonds=0.65+0.35*pow(0.5+0.5*cos(y*38.0-uT*3.0),6.0)*(1.0-y);      // shock diamonds near the nozzle
          float body=pow(1.0-y,1.7)*(0.55+0.45*turb)*diamonds*edge;
          vec3 col=mix(vec3(0.55,0.62,1.0),vec3(0.75,0.5,1.0),y); col=mix(vec3(1.0,0.97,0.92),col,smoothstep(0.0,0.35,y));
          gl_FragColor=vec4(col*body*uI*1.7,1.0); }` }); }
    function thrusters(rg) {
      const nozMat = new THREE.MeshStandardMaterial({ color: 0x8e97a2, metalness: 0.9, roughness: 0.32, envMap: o.env || null }); const out = { main: [], fwd: [] };
      const nozzle = (parent, x, y, z, dir, scale, list) => { const g = new THREE.Group(); const w = parent.userData.w; g.position.set(x - w.x, y - w.y, z - w.z); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...dir).normalize()); parent.add(g);
        const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.016 * scale, 0.026 * scale, 0.04 * scale, 18, 1, true), nozMat); bell.material.side = THREE.DoubleSide; bell.position.y = -0.02 * scale; g.add(bell);
        const pl = new THREE.Mesh(new THREE.ConeGeometry(0.03 * scale, 1, 20, 6, true), plumeMat()); pl.geometry.rotateX(Math.PI); pl.geometry.translate(0, -0.5, 0); pl.position.y = -0.04 * scale; pl.scale.set(1, 0.01, 1); g.add(pl);
        const core = new THREE.Mesh(new THREE.ConeGeometry(0.012 * scale, 1, 12, 1, true), plumeMat()); core.geometry.rotateX(Math.PI); core.geometry.translate(0, -0.5, 0); core.position.y = -0.04 * scale; core.scale.set(1, 0.01, 1); g.add(core);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: o.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, color: 0xbfd2ff })); glow.position.y = -0.05 * scale; glow.scale.setScalar(0.08); g.add(glow);
        list.push({ g, pl, core, glow, scale }); };
      // four rear nozzles under the backpack, angled back and slightly down; two small forward nozzles at the sides
      [[-0.15, 0.86], [-0.05, 0.86], [0.05, 0.86], [0.15, 0.86]].forEach(([x, y]) => nozzle(rg.B.chest, x, y, -0.33, [x * 0.5, -0.85, -0.55], 1, out.main));
      [-1, 1].forEach(sx => nozzle(rg.B.chest, 0.24 * sx, 0.9, -0.16, [0.3 * sx, -0.1, 1], 0.6, out.fwd));
      // exhaust particles: a ring buffer of GPU points in world space
      const NP = 220, P = new Float32Array(NP * 3), A = new Float32Array(NP * 2), V = new Float32Array(NP * 3); for (let i = 0; i < NP; i++) A[i * 2] = 0;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aLife', new THREE.BufferAttribute(A, 2));
      const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: 1 } },
        vertexShader: 'attribute vec2 aLife; uniform float uPx; varying float vL; void main(){ vL=aLife.x; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=(aLife.x>0.0? (6.0+30.0*(1.0-aLife.x))*aLife.y*uPx*(3.0/max(0.5,-mv.z)) : 0.0); }',
        fragmentShader: 'varying float vL; void main(){ if(vL<=0.0) discard; vec2 c=gl_PointCoord-0.5; float a=exp(-dot(c,c)*14.0); vec3 col=mix(vec3(0.45,0.5,1.0),vec3(1.0,0.96,0.9),vL*vL); gl_FragColor=vec4(col*a*vL*vL*0.55,1.0); }' });
      const pts = new THREE.Points(g, pm); pts.frustumCulled = false; scene.add(pts);
      out.parts = { pts, P, A, V, NP, i: 0, acc: 0, g, pm };
      return out; }

    /* ===================================================================== API */
    const api = {
      root, get ready() { return st.ready; }, get pos() { return root.position; }, get speed() { return st.speed; }, get lead() { return st.lead; }, get bank() { return st.bank; },
      load(url, warm) { // built here (no download); kept async so the universe's loading sequence is unchanged
        return new Promise(res => (window.requestIdleCallback || setTimeout)(res, { timeout: 200 })).then(() => {
          rig = buildSuit(); const holder = new THREE.Group(); rig.mesh.position.set(0, -0.98, 0); holder.add(rig.mesh); holder.scale.setScalar(0.44); body.add(holder);
          thr = thrusters(rig); warm && warm(holder); st.ready = true; root.visible = true; return true; });
      },
      setAnchors(points) { st.curve = new THREE.CatmullRomCurve3(points, false, 'centripetal'); },
      fly(target, beside, ms) { st.flight = { t0: performance.now(), ms: ms * 1.25, p0: root.position.clone(), p1: beside.clone(), c: root.position.clone().lerp(beside, 0.5).add(tmp.set(0, 1.0, 0)), look: target.clone() }; },
      endFlight() { st.flight = null; st.off = null; },
      resetTrail() { st.off = null; st.uVel = 0; st.lead = 0; st.fresh = true; },
      update({ u, dt, t, lookAt, still, camera, obstacles }) {
        if (!st.ready || !st.curve) return; dt = Math.max(1e-3, Math.min(0.25, dt)); camera.updateMatrixWorld();
        const du = (u - st.uPrev) / dt; st.uPrev = u; st.uVel += (du - st.uVel) * damp(4, dt);
        const travel = still ? 0 : clamp(Math.abs(st.uVel) * 9, 0, 1);
        st.lead += ((still ? 0 : clamp(st.uVel * 0.25, -0.012, 0.012)) - st.lead) * damp(3, dt);
        st.prev.copy(root.position);
        const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); th0.v = th; th0.a = camera.aspect; const frame = v => { v.z = Math.min(v.z, -2.9); const d = -v.z; v.x = clamp(v.x, -d * th * camera.aspect * 0.74, d * th * camera.aspect * 0.74); v.y = clamp(v.y, -d * th * 0.64, d * th * 0.64); return v; };
        if (st.flight) { const F = st.flight, k = sstep(clamp((performance.now() - F.t0) / F.ms, 0, 1)), a = 1 - k;
          st.pos.set(a * a * F.p0.x + 2 * a * k * F.c.x + k * k * F.p1.x, a * a * F.p0.y + 2 * a * k * F.c.y + k * k * F.p1.y, a * a * F.p0.z + 2 * a * k * F.c.z + k * k * F.p1.z); }
        else {
          st.curve.getPoint(clamp(u + st.lead, 0, 1), tmp); camera.worldToLocal(tmp); frame(tmp);
          /* while travelling, the astronaut flies in a chase slot just ahead of the lens (seen from behind and a little to the
             side, thrusters toward us) instead of drifting far away; on arrival it eases back into the scene's composition */
          const ch = sstep(clamp(travel * 1.25, 0, 1)); if (ch > 0.001) { st.side = st.side || Math.sign(tmp.x || 1); if (Math.abs(tmp.x) > 0.6) st.side = Math.sign(tmp.x); tmp.lerp(tmp3.set(st.side * 0.85, -0.5, -3.4), ch * 0.85); }
          if (obstacles && obstacles.length) keepClear(tmp, camera, obstacles, frame);
          if (!st.off || st.fresh) { st.off = tmp.clone(); st.offV.set(0, 0, 0); st.fresh = false; }
          // if the astronaut where it is now would overlap a world's body on screen, it catches up with its (clear) target fast
          let urgent = false; const C = st.clear; if (C && st.off.z < -0.5) { const k = C.d / -st.off.z, x = st.off.x * k, y = st.off.y * k; for (let i = 0; i < C.list.length; i += 4) if (Math.hypot(x - C.list[i], y - C.list[i + 1]) < C.list[i + 2]) { urgent = true; break; } }
          const w = urgent ? 7 : 2.6; tmp2.subVectors(tmp, st.off).multiplyScalar(w * w).addScaledVector(st.offV, -2 * w); st.offV.addScaledVector(tmp2, dt);
          const vmax = urgent ? 7 : 2.6; if (st.offV.length() > vmax) st.offV.setLength(vmax); st.off.addScaledVector(st.offV, dt);
          st.pos.copy(st.off); camera.localToWorld(st.pos);
          // the real position never enters a world's safety sphere (a smooth radial push; the spring keeps it continuous)
          if (obstacles) for (const ob of obstacles) { tmp2.subVectors(st.pos, ob.p); const L = tmp2.length(); if (L < ob.r) { st.pos.copy(ob.p).addScaledVector(tmp2.divideScalar(Math.max(L, 1e-4)), ob.r); st.off.copy(st.pos); camera.worldToLocal(st.off); } }
        }
        root.position.copy(st.pos);
        // kinematics (world space, smoothed): speed, acceleration, braking, turning
        tmp.subVectors(root.position, st.prev).divideScalar(dt); if (tmp.length() > 400) tmp.set(0, 0, 0); st.vel.lerp(tmp, damp(3, dt));
        const sp = st.vel.length(), acc = (sp - st.speed) / dt; st.speed += (sp - st.speed) * damp(4, dt); st.acc += (acc - st.acc) * damp(2.5, dt);
        const moving = st.flight ? 1 : travel;
        st.thrust += (clamp(moving * 0.8 + clamp(st.acc / 25, 0, 0.5), 0, 1) - st.thrust) * damp(3.5, dt);
        st.brake += (clamp(-st.acc / 18, 0, 1) * (moving > 0.1 ? 1 : 0.4) - st.brake) * damp(4, dt);
        // orientation: along the direction of travel while moving, toward the world at rest; banks into turns
        const look = st.flight ? st.flight.look : lookAt; camera.getWorldDirection(tmp2);
        if (moving > 0.05 && sp > 0.3) { tmp.copy(st.vel).normalize().lerp(tmp2, 0.35).normalize(); tmp.multiplyScalar(10).add(root.position); if (look) tmp.lerp(look, 1 - moving); } else if (look) tmp.copy(look); else tmp.copy(root.position).add(tmp2);
        m4.lookAt(tmp, root.position, up); qa.setFromRotationMatrix(m4);
        const lat = st.off ? clamp(-st.offV.x * 0.3, -0.35, 0.35) : 0; st.bank += (lat - st.bank) * damp(2, dt); st.turn += (clamp(st.offV.x * 0.6, -0.5, 0.5) - st.turn) * damp(2.5, dt);
        qr.setFromEuler(e3.set(0.85 * moving - 0.3 * st.brake, 0, st.bank)); qa.multiply(qr); // lean into the flight (a flying pose), sit back to brake
        root.quaternion.slerp(qa, damp(st.flight ? 2.4 : 1.6, dt));
        animate(t, dt, moving, still);
        exhaust(dt, still, camera);
      },
      dispose() { scene.remove(root); if (rig) { rig.mats.forEach(m => m.dispose()); rig.tex.forEach(x => x && x.dispose()); rig.mesh.traverse(m => m.geometry && m.geometry.dispose()); }
        if (thr) { [...thr.main, ...thr.fwd].forEach(n => { n.pl.material.dispose(); n.core.material.dispose(); n.glow.material.dispose(); n.pl.geometry.dispose(); n.core.geometry.dispose(); }); scene.remove(thr.parts.pts); thr.parts.g.dispose(); thr.parts.pm.dispose(); } }
    };

    /* keep the target clear of every world: in front of it along the line of sight, and away from its silhouette on screen */
    function keepClear(T, camera, obstacles, frame) {
      const cp = camera.position, wv = tmp3;
      // (a) in front of every world: slide along the line of sight (same place on screen)
      wv.copy(T); camera.localToWorld(wv);
      for (const ob of obstacles) { const L = tmp2.subVectors(wv, cp), len = L.length(); L.divideScalar(len); const ocx = ob.p.x - cp.x, ocy = ob.p.y - cp.y, ocz = ob.p.z - cp.z, along = ocx * L.x + ocy * L.y + ocz * L.z, d2 = ocx * ocx + ocy * ocy + ocz * ocz - along * along;
        if (along > 0 && d2 < ob.r * ob.r) { const near = along - Math.sqrt(ob.r * ob.r - d2); if (near < len && near > 3.2) wv.copy(cp).addScaledVector(L, near - 0.3); } }
      T.copy(wv); camera.worldToLocal(T); frame(T);
      /* (b) on screen: the astronaut's silhouette never overlaps a world's body (hard), and keeps out of its rings and moons
         where it can (soft). Candidate places around the composition's choice are scored — overlap with any body costs a
         lot, with rings a little, distance from the composition and from last frame's choice a little — and the best one
         wins. Searching (rather than pushing away from one world at a time) also works when several worlds crowd together. */
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

    /* ===================================================================== motion */
    const nz = (t, a1, a2, a3, ph) => Math.sin(t * a1 + ph) * 0.55 + Math.sin(t * a2 + ph * 1.7) * 0.3 + Math.sin(t * a3 + ph * 2.3) * 0.15; // smooth, never repeating
    const pose = {};
    function J(name, x, y, z, rate, dt) { const p = pose[name] = pose[name] || { x, y, z }; const k = damp(rate, dt); p.x += (x - p.x) * k; p.y += (y - p.y) * k; p.z += (z - p.z) * k;
      const b = rig.B[name]; if (b) b.quaternion.copy(rig.rest[name]).multiply(qr.setFromEuler(e3.set(p.x, p.y, p.z))); }
    function animate(t, dt, moving, still) {
      if (!rig) return; const calm = still ? 0 : 1, fly = moving, rest = 1 - fly, brk = st.brake, turn = st.turn;
      // gestures at rest: a wave, pointing at the world, looking around (one at a time, never while travelling)
      const A = st.act; if (A.kind) { A.t += dt; if (A.t > A.len || fly > 0.4) A.kind = null; } else if (calm && rest > 0.9) { A.next -= dt; if (A.next <= 0) { const r = Math.random(); A.kind = r < 0.35 ? 'wave' : r < 0.7 ? 'point' : 'look'; A.t = 0; A.len = A.kind === 'wave' ? 3.4 : A.kind === 'point' ? 3.0 : 4.0; A.next = 7 + Math.random() * 7; } }
      const g = A.kind ? Math.sin(Math.PI * clamp(A.t / A.len, 0, 1)) : 0, wave = A.kind === 'wave' ? g : 0, point = A.kind === 'point' ? g : 0, lookAround = A.kind === 'look' ? g : 0;
      // travel phase: a slow flutter kick and a gentle stroke while flying
      if (fly > 0.2 && calm) st.trav += dt * (0.6 + 0.6 * fly); const kp = st.trav * Math.PI * 2 * 0.55;
      const b = calm; // drift amplitude
      /* torso and head — the neutral zero-g posture is slightly curled forward */
      J('pelvis', 0.08 * rest + nz(t, 0.21, 0.37, 0.83, 0.4) * 0.07 * b - 0.1 * fly + 0.15 * brk, nz(t, 0.17, 0.33, 0.71, 1.3) * 0.1 * b + turn * 0.25, nz(t, 0.19, 0.41, 0.9, 2.2) * 0.06 * b, 1.8, dt);
      J('chest', 0.06 * rest + nz(t, 0.23, 0.45, 0.97, 3.1) * 0.07 * b + 0.05 * fly - 0.1 * brk + 0.02 * Math.sin(t * 1.25) * b, nz(t, 0.19, 0.39, 0.77, 0.6) * 0.1 * b + turn * 0.3 + Math.sin(kp) * 0.06 * fly, nz(t, 0.27, 0.51, 1.1, 1.7) * 0.05 * b, 2, dt);
      J('head', -0.05 * rest + nz(t, 0.13, 0.29, 0.61, 2.6) * 0.12 * b - 0.35 * fly + 0.1 * brk, nz(t, 0.11, 0.23, 0.53, 4.2) * 0.25 * b + Math.sin(t * 0.9) * 0.7 * lookAround + turn * 0.4 + 0.2 * point, 0, 1.8, dt);
      [['L', 1], ['R', -1]].forEach(([s, sx], i) => {
        const ph = i * 2.3, lead = i === 1; // the right arm leads in flight and gestures
        const gw = lead ? wave : 0, gp = lead ? point : 0;
        // arms — rest: floating up and forward (shoulder flexed ~35°, abducted ~30°, elbow ~80°) with drift
        //        flight: lead arm reaches ahead, the other rests along the body; brake: both come forward and out
        const stroke = Math.sin(kp + i * Math.PI);
        const flex = (-0.6 + nz(t, 0.29, 0.53, 1.07, ph) * 0.22 * b) * rest + (lead ? -2.65 + 0.1 * stroke : 0.25 + 0.12 * stroke) * fly - 0.9 * brk - 2.2 * gw - 1.45 * gp;
        const abd = (0.5 + nz(t, 0.23, 0.47, 0.91, ph + 1) * 0.15 * b) * rest + (lead ? 0.12 : 0.18) * fly + 0.45 * brk + 0.6 * gw - 0.1 * gp;
        const twist = nz(t, 0.17, 0.31, 0.7, ph + 3) * 0.15 * b * rest;
        J('uArm' + s, flex, twist * sx, abd * sx, fly > 0.3 ? 3.2 : 2.4, dt);
        const elbow = -(1.3 + nz(t, 0.31, 0.61, 1.3, ph + 2) * 0.25 * b) * rest - (lead ? 0.15 : 0.35) * fly - 0.5 * brk - (0.9 + 0.35 * Math.sin(A.t * 7.5)) * gw - 0.05 * gp;
        J('fArm' + s, elbow, 0, 0, fly > 0.3 ? 3.4 : 2.6, dt);
        J('hand' + s, nz(t, 0.37, 0.7, 1.4, ph) * 0.15 * b * rest - 0.2 * fly, 0, (0.15 + nz(t, 0.3, 0.6, 1.2, ph + 5) * 0.1 * b) * sx * rest, 3, dt);
        // legs — rest: hips flexed ~45°, knees ~60°, slowly bicycling; flight: stretched behind with a flutter kick; brake: knees up
        const kick = Math.sin(kp * 1.4 + i * Math.PI);
        const hip = (-0.7 + nz(t, 0.25, 0.49, 0.97, ph + 0.7) * 0.2 * b) * rest + (0.12 + 0.2 * kick) * fly - 0.7 * brk;
        J('thigh' + s, hip, 0, (0.1 + nz(t, 0.2, 0.4, 0.8, ph) * 0.05 * b) * sx * rest + 0.03 * sx * fly, fly > 0.3 ? 3 : 2.2, dt);
        J('shin' + s, (1.0 + nz(t, 0.27, 0.53, 1.1, ph + 1.5) * 0.22 * b) * rest + (0.25 + 0.25 * Math.max(0, -kick)) * fly + 0.9 * brk, 0, 0, fly > 0.3 ? 3.2 : 2.4, dt);
        J('foot' + s, (0.25 + nz(t, 0.3, 0.6, 1.2, ph + 2) * 0.1 * b) * rest + 0.5 * fly, 0, 0, 3, dt); });
      // breathing, a blinking status light, a tiny drift of the whole body in the frame
      const breath = 1 + 0.014 * Math.sin(t * 1.25) * calm; rig.B.chest.scale.set(breath, 1 + (breath - 1) * 0.4, breath);
      rig.leds.forEach(l => { l.visible = (t % 1.6) < 0.18 || !calm; });
      body.position.set(nz(t, 0.23, 0.41, 0.97, 0.3) * 0.03 * calm, nz(t, 0.31, 0.57, 1.13, 1.9) * 0.04 * calm, 0);
    }

    /* thrusters: main plumes follow thrust; forward nozzles fire to brake; little attitude puffs at rest; particles */
    let pulseT = -1, pulseNext = 4;
    function exhaust(dt, still, camera) {
      if (!thr) return; const t = performance.now() / 1000, calm = still ? 0 : 1;
      if (calm && st.thrust < 0.15 && pulseT < 0) { pulseNext -= dt; if (pulseNext <= 0) { pulseT = 0; pulseNext = 4 + Math.random() * 6; } }
      if (pulseT >= 0) { pulseT += dt; if (pulseT > 0.35) pulseT = -1; }
      const pulse = pulseT >= 0 ? Math.sin(Math.PI * pulseT / 0.35) * 0.4 : 0;
      const I = clamp(st.thrust + pulse, 0, 1) * calm, Ib = clamp(st.brake * 1.2, 0, 1) * calm;
      const set = (n, k, i) => { const fl = 0.9 + 0.1 * Math.sin(t * 43 + k * 1.7) * Math.sin(t * 29 + k); const len = (0.08 + 1.15 * i) * n.scale * fl;
        n.pl.material.uniforms.uI.value = i; n.pl.material.uniforms.uT.value = t + k; n.pl.scale.set(1 + 0.5 * i, Math.max(0.001, len), 1 + 0.5 * i); n.pl.visible = i > 0.02;
        n.core.material.uniforms.uI.value = i * 1.3; n.core.material.uniforms.uT.value = t * 1.3 + k; n.core.scale.set(1, Math.max(0.001, len * 0.45), 1); n.core.visible = i > 0.02;
        n.glow.material.opacity = i * 0.9; n.glow.scale.setScalar((0.06 + 0.14 * i) * n.scale); };
      thr.main.forEach((n, k) => set(n, k, I)); thr.fwd.forEach((n, k) => set(n, k + 7, Ib));
      // particles stream from the active nozzles in world space and fade
      const P = thr.parts, rate = (I * 70 + Ib * 30) * calm; P.acc += dt * rate;
      while (P.acc >= 1) { P.acc -= 1; const useB = Ib > I ? Math.random() < 0.7 : Math.random() < Ib / (I + Ib + 1e-3); const L = useB ? thr.fwd : thr.main, n = L[(Math.random() * L.length) | 0]; const j = P.i++ % P.NP;
        n.glow.getWorldPosition(tmp); n.g.getWorldQuaternion(qa); tmp2.set((Math.random() - 0.5) * 0.25, -1, (Math.random() - 0.5) * 0.25).applyQuaternion(qa).multiplyScalar(0.8 + Math.random() * 0.8);
        P.P[j * 3] = tmp.x; P.P[j * 3 + 1] = tmp.y; P.P[j * 3 + 2] = tmp.z; P.V[j * 3] = tmp2.x + st.vel.x * 0.4; P.V[j * 3 + 1] = tmp2.y + st.vel.y * 0.4; P.V[j * 3 + 2] = tmp2.z + st.vel.z * 0.4; P.A[j * 2] = 1; P.A[j * 2 + 1] = useB ? 0.5 : 1; }
      for (let j = 0; j < P.NP; j++) { if (P.A[j * 2] <= 0) continue; P.A[j * 2] = Math.max(0, P.A[j * 2] - dt * 1.4); P.P[j * 3] += P.V[j * 3] * dt; P.P[j * 3 + 1] += P.V[j * 3 + 1] * dt; P.P[j * 3 + 2] += P.V[j * 3 + 2] * dt; }
      P.g.attributes.position.needsUpdate = true; P.g.attributes.aLife.needsUpdate = true; P.pm.uniforms.uPx.value = Math.min(2, devicePixelRatio || 1);
    }
    return api;
  };
})();
