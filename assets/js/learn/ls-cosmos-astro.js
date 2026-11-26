/* ERLY Learning Studio — the astronaut (used by ls-cosmos.js). v35; built in code since v39 (see buildSuit below — the
   notes on the GLB rig that follow describe v35, whose joint names and animation are kept).

   What changed from v33 and why
   · It moved too fast and "glitched": its position was a spline point evaluated straight from the scroll, plus two hard
     corrections (snapped in front of the lens; clamped back into the frame) that could jump in a single frame.
     Now the astronaut is carried along the journey with the camera, and its place IN THE SHOT eases toward the keyframe
     composition at a limited, slow-to-medium speed (critically damped, ≤ 1.1 units/s relative to the viewer). The frame
     limits are applied to the target, never to the astronaut itself, so nothing ever snaps.
   · It now has a body. The GLB (one rigid mesh, no skeleton) is rigged here at load time: eleven bones (pelvis, chest,
     head, upper/lower arms, thighs, shins) and smooth skin weights computed from the model's measured proportions, so the
     suit bends at shoulders, elbows, hips and knees without tearing. Arms, legs, head and torso are animated procedurally:
     relaxed zero-g float at rest (slow, asymmetric, non-repeating), a streamlined pose with trailing legs while flying,
     arms forward to "brake" when slowing, and an occasional wave toward the world it is visiting.
   · Boosters: two nozzles on the life-support pack with flames whose length and brightness follow thrust, plus small
     exhaust puffs left behind in space; short attitude-thruster pulses at rest.

   API (unchanged for ls-cosmos.js): root, ready, pos, speed, lead, bank, load(), setAnchors(), fly(), endFlight(),
   resetTrail(), update({u, dt, t, lookAt, still, camera}), dispose(). */
(function () {
  'use strict';
  const LS = window.LS;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sstep = t => t * t * t * (t * (t * 6 - 15) + 10);
  const sstepA = t => t * t * t * (t * (t * 6 - 15) + 10);
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const damp = (k, dt) => 1 - Math.exp(-k * dt);

  LS.cosmosAstronaut = function (THREE, scene, o = {}) {
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    const body = new THREE.Group(); root.add(body);
    const st = { ready: false, curve: null, uPrev: 0, uVel: 0, lead: 0, pos: new THREE.Vector3(), off: null, offV: new THREE.Vector3(), vel: new THREE.Vector3(), prev: new THREE.Vector3(), speed: 0, acc: 0, thrust: 0, bank: 0, flight: null, fresh: true, wave: { next: 9, t: -1 }, pulse: { next: 4, t: -1 }, trav: 0, sup: { next: 5, t: -1 }, roll: { next: 3.5, t: -1 } };
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), qa = new THREE.Quaternion(), qr = new THREE.Quaternion(), e3 = new THREE.Euler();
    let rig = null, jets = [], puffs = null;

    /* ---------- v39: the astronaut, built from smooth parts ----------
       An EVA suit in model units (feet at y=0, 2.0 tall, facing +z): a white multi-layer fabric suit with quilted detail
       (a generated normal map) and a soft sheen; bellows at the joints; anodised bearing rings at the waist, wrists and
       neck; a polished hard upper torso with a display-and-control unit; a life-support pack with hoses; red commander
       stripes; boots and gloves; and a helmet with a gold, mirror-polished sun visor that reflects the sky and the sun.
       Every limb hangs from a named joint (the same names the animation drives), so it moves like a body. */
    function fabricNormal() {
      const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), H = new Float32Array(N * N);
      let sd = 7; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const bumps = Array.from({ length: 70 }, () => [R() * N, R() * N, 6 + R() * 22, R() * 0.6 + 0.2]);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let h = 0.5 + 0.22 * Math.sin((y / N) * Math.PI * 2 * 6 + Math.sin(x / N * Math.PI * 2 * 2) * 0.8);         // soft horizontal quilting
        h += 0.08 * Math.sin((x / N) * Math.PI * 2 * 22) * Math.sin((y / N) * Math.PI * 2 * 3);                       // weave
        for (const [bx, by, br, bs] of bumps) { let dx = Math.abs(x - bx), dy = Math.abs(y - by); dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy); const d = (dx * dx + dy * dy) / (br * br); if (d < 1) h += bs * 0.12 * (1 - d) * (1 - d); } // creases
        H[y * N + x] = h; }
      const img = g.createImageData(N, N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const at = (i, j) => H[((j + N) % N) * N + ((i + N) % N)]; const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2, dy = (at(x, y + 1) - at(x, y - 1)) * 2.2; const l = Math.hypot(dx, dy, 1), k = (y * N + x) * 4;
        img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
      g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 4; return t; }
    function patchTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#1b2a6b'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#e8c56a'; g.lineWidth = 5; g.stroke();
      const gr = g.createLinearGradient(0, 30, 0, 90); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(1, '#ff8a4c'); g.fillStyle = gr; g.beginPath(); g.arc(64, 78, 24, Math.PI, 0); g.fill();
      g.strokeStyle = '#ffd27a'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) / 7 * Math.PI; g.beginPath(); g.moveTo(64 + Math.cos(a) * 30, 78 + Math.sin(a) * 30); g.lineTo(64 + Math.cos(a) * 40, 78 + Math.sin(a) * 40); g.stroke(); }
      g.fillStyle = '#f4efe6'; g.fillRect(28, 80, 72, 4); g.font = '600 15px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('ERLY', 64, 104);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
    function roundedBox(w, h, d, r, seg) { const sh = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
      sh.moveTo(x, -h / 2); sh.lineTo(x + ww, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, y); sh.lineTo(w / 2, y + hh); sh.quadraticCurveTo(w / 2, h / 2, x + ww, h / 2); sh.lineTo(x, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, y + hh); sh.lineTo(-w / 2, y); sh.quadraticCurveTo(-w / 2, -h / 2, x, -h / 2);
      const g = new THREE.ExtrudeGeometry(sh, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: seg || 4, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals(); return g; }
    function buildSuit() {
      const env = o.env || null, fab = fabricNormal(); const mats = [];
      const M = (Ctor, p) => { const m = new Ctor(Object.assign({ envMap: env, envMapIntensity: 0.55 }, p)); mats.push(m); return m; };
      const suit = M(THREE.MeshPhysicalMaterial, { color: 0xdedad2, roughness: 0.84, metalness: 0, sheen: 0.55, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.75, normalMap: fab, normalScale: new THREE.Vector2(0.45, 0.45) });
      const bellows = M(THREE.MeshStandardMaterial, { color: 0xc9c5bc, roughness: 0.9 });
      const hut = M(THREE.MeshStandardMaterial, { color: 0xe6e3dd, roughness: 0.32, metalness: 0.02, envMapIntensity: 0.9 });
      const metal = M(THREE.MeshStandardMaterial, { color: 0xc9ced6, metalness: 0.95, roughness: 0.26, envMapIntensity: 1.2 });
      const anod = M(THREE.MeshStandardMaterial, { color: 0x3d63c9, metalness: 0.85, roughness: 0.3, envMapIntensity: 1.1 });
      const red = M(THREE.MeshStandardMaterial, { color: 0xb5372a, roughness: 0.7 });
      const glove = M(THREE.MeshStandardMaterial, { color: 0xdcd8cf, roughness: 0.78 });
      const boot = M(THREE.MeshStandardMaterial, { color: 0x8b9099, roughness: 0.62, metalness: 0.15 });
      const sole = M(THREE.MeshStandardMaterial, { color: 0x2b2e35, roughness: 0.9 });
      const dark = M(THREE.MeshStandardMaterial, { color: 0x30343c, roughness: 0.55, metalness: 0.4 });
      const visor = M(THREE.MeshPhysicalMaterial, { color: 0xffd27f, metalness: 1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2 });
      const lamp = M(THREE.MeshStandardMaterial, { color: 0xffffff, emissive: 0xfff2d6, emissiveIntensity: 3.2, roughness: 0.3 });
      const ledG = M(THREE.MeshStandardMaterial, { color: 0x103010, emissive: 0x39ff7a, emissiveIntensity: 2.5 }), ledR = M(THREE.MeshStandardMaterial, { color: 0x301010, emissive: 0xff4a3a, emissiveIntensity: 2.2 });
      const patch = M(THREE.MeshStandardMaterial, { map: patchTex(), roughness: 0.7, transparent: true });
      const B = {}, J = (name, x, y, z, parent) => { const b = new THREE.Object3D(); b.name = name; const pw = parent ? parent.userData.w : new THREE.Vector3(); b.position.set(x - pw.x, y - pw.y, z - pw.z); b.userData.w = new THREE.Vector3(x, y, z); (parent || root0).add(b); B[name] = b; return b; };
      const root0 = new THREE.Group();
      const add = (parent, geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); const w = parent.userData.w; m.position.set(x - w.x, y - w.y, z - w.z); m.rotation.set(rx || 0, ry || 0, rz || 0); if (sx) m.scale.set(sx, sy, sz); parent.add(m); return m; };
      const limb = (parent, a, b, r, mat, seg) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), len = A.distanceTo(Bv); const g = new THREE.CapsuleGeometry(r, Math.max(0.01, len - r * 0.6), 6, seg || 20); const m = new THREE.Mesh(g, mat);
        const mid = A.clone().add(Bv).multiplyScalar(0.5), w = parent.userData.w; m.position.set(mid.x - w.x, mid.y - w.y, mid.z - w.z); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize()); parent.add(m); return m; };
      const ring = (parent, at, r, tube, mat, dir) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 36), mat); const w = parent.userData.w; m.position.set(at[0] - w.x, at[1] - w.y, at[2] - w.z); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...(dir || [0, 1, 0])).normalize()); parent.add(m); return m; };
      const lathe = (pts, segs) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs || 40);
      // skeleton
      J('pelvis', 0, 0.86, 0.04); J('chest', 0, 1.16, 0.0, B.pelvis); J('head', 0, 1.47, 0.04, B.chest);
      [['L', 1], ['R', -1]].forEach(([s, sx]) => { J('uArm' + s, 0.33 * sx, 1.36, 0.02, B.chest); J('fArm' + s, 0.42 * sx, 1.08, 0.05, B['uArm' + s]); J('thigh' + s, 0.13 * sx, 0.82, 0.04, B.pelvis); J('shin' + s, 0.14 * sx, 0.45, 0.06, B['thigh' + s]); });
      // torso: soft lower torso + a polished hard upper torso (HUT)
      const lower = add(B.pelvis, lathe([[0.001, 0.72], [0.17, 0.73], [0.205, 0.8], [0.215, 0.9], [0.205, 0.99], [0.19, 1.02], [0.001, 1.03]]), suit, 0, 0, 0.04, 0, 0, 0, 1, 1, 0.82);
      ring(B.pelvis, [0, 0.995, 0.04], 0.198, 0.022, metal); ring(B.pelvis, [0, 0.975, 0.04], 0.2, 0.012, anod);
      add(B.chest, lathe([[0.001, 0.99], [0.19, 1.0], [0.235, 1.08], [0.262, 1.2], [0.258, 1.32], [0.22, 1.41], [0.13, 1.45], [0.001, 1.455]], 48), hut, 0, 0, 0, 0, 0, 0, 1, 1, 0.8);
      ring(B.chest, [0, 1.445, 0.03], 0.142, 0.03, metal); ring(B.chest, [0, 1.47, 0.03], 0.136, 0.016, anod);
      // display and control unit, with dials and status lights
      const dcm = add(B.chest, roundedBox(0.25, 0.13, 0.07, 0.022), hut, 0, 1.17, 0.215); add(B.chest, roundedBox(0.2, 0.05, 0.02, 0.008), dark, 0, 1.19, 0.252);
      [-0.07, 0.0, 0.07].forEach((x, i) => add(B.chest, new THREE.CylinderGeometry(0.016, 0.018, 0.03, 16), i === 1 ? anod : metal, x, 1.135, 0.255, Math.PI / 2, 0, 0));
      add(B.chest, new THREE.SphereGeometry(0.008, 10, 8), ledG, 0.095, 1.205, 0.262); const ledRed = add(B.chest, new THREE.SphereGeometry(0.008, 10, 8), ledR, 0.11, 1.205, 0.262);
      const patchM = new THREE.Mesh(new THREE.CircleGeometry(0.055, 32), patch); patchM.position.set(-0.13, 1.31 - 1.16, 0.205); patchM.rotation.set(-0.18, -0.38, 0); B.chest.add(patchM);
      // life-support pack, with a top cap, vents and two hoses to the chest unit
      add(B.chest, roundedBox(0.48, 0.6, 0.22, 0.05, 5), hut, 0, 1.17, -0.3); add(B.chest, roundedBox(0.4, 0.12, 0.18, 0.04), hut, 0, 1.5, -0.29);
      for (let i = 0; i < 4; i++) add(B.chest, new THREE.BoxGeometry(0.3, 0.012, 0.01), dark, 0, 1.0 + i * 0.03, -0.415);
      add(B.chest, roundedBox(0.16, 0.1, 0.03, 0.012), metal, 0.12, 1.33, -0.413);
      [[-1, 0x3d63c9], [1, 0xb5372a]].forEach(([sx]) => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.2 * sx, 1.0, -0.2), new THREE.Vector3(0.26 * sx, 1.02, 0.02), new THREE.Vector3(0.17 * sx, 1.1, 0.2), new THREE.Vector3(0.1 * sx, 1.14, 0.24)]); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.018, 10), sx < 0 ? anod : bellows); m.position.set(0, -1.16, 0); B.chest.add(m); });
      // helmet: hard shell, gold visor, brow, lamps
      add(B.head, new THREE.SphereGeometry(0.232, 48, 36), hut, 0, 1.63, 0.02);
      add(B.head, new THREE.SphereGeometry(0.237, 64, 40, Math.PI / 2 - 1.15, 2.3, 0.48, 1.18), visor, 0, 1.63, 0.02);
      add(B.head, new THREE.TorusGeometry(0.239 * Math.sin(0.48), 0.012, 8, 48), hut, 0, 1.63 + 0.237 * Math.cos(0.48), 0.02, Math.PI / 2, 0, 0);
      [-1, 1].forEach(sx => { add(B.head, new THREE.CylinderGeometry(0.032, 0.036, 0.06, 20), metal, 0.215 * sx, 1.72, 0.07, Math.PI / 2, 0, 0); add(B.head, new THREE.CircleGeometry(0.026, 20), lamp, 0.215 * sx, 1.72, 0.101, 0, 0, 0); });
      // arms
      [['L', 1], ['R', -1]].forEach(([s, sx]) => { const U = B['uArm' + s], F = B['fArm' + s];
        add(U, new THREE.SphereGeometry(0.115, 32, 24), hut, 0.31 * sx, 1.37, 0.02);                       // shoulder bearing
        ring(U, [0.33 * sx, 1.36, 0.02], 0.1, 0.018, metal, [sx, -0.25, 0]);
        limb(U, [0.34 * sx, 1.32, 0.03], [0.41 * sx, 1.11, 0.05], 0.09, suit);
        ring(U, [0.37 * sx, 1.24, 0.04], 0.093, 0.012, red, [0.33 * sx, -1, 0]);                         // commander stripe
        add(F, new THREE.SphereGeometry(0.082, 24, 18), bellows, 0.42 * sx, 1.08, 0.05);
        ring(F, [0.42 * sx, 1.1, 0.05], 0.083, 0.012, bellows, [0.33 * sx, -1, 0]); ring(F, [0.425 * sx, 1.06, 0.05], 0.081, 0.012, bellows, [0.15 * sx, -1, 0]);
        limb(F, [0.425 * sx, 1.05, 0.055], [0.445 * sx, 0.86, 0.065], 0.078, suit);
        ring(F, [0.447 * sx, 0.84, 0.065], 0.07, 0.016, anod, [0.1 * sx, -1, 0]);                          // wrist bearing
        const hand = add(F, roundedBox(0.09, 0.12, 0.055, 0.024), glove, 0.45 * sx, 0.76, 0.068, 0, 0, 0.08 * sx);
        add(F, new THREE.CapsuleGeometry(0.019, 0.04, 4, 10), glove, 0.4 * sx, 0.785, 0.09, 0.5, 0, -0.6 * sx); });
      // legs
      [['L', 1], ['R', -1]].forEach(([s, sx]) => { const T = B['thigh' + s], S = B['shin' + s];
        limb(T, [0.135 * sx, 0.8, 0.045], [0.14 * sx, 0.5, 0.055], 0.11, suit);
        ring(T, [0.138 * sx, 0.66, 0.05], 0.112, 0.011, red);
        add(S, new THREE.SphereGeometry(0.1, 24, 18), bellows, 0.14 * sx, 0.45, 0.06); ring(S, [0.14 * sx, 0.47, 0.06], 0.102, 0.012, bellows); ring(S, [0.14 * sx, 0.43, 0.06], 0.1, 0.012, bellows);
        limb(S, [0.142 * sx, 0.42, 0.062], [0.15 * sx, 0.16, 0.06], 0.092, suit);
        ring(S, [0.15 * sx, 0.15, 0.06], 0.095, 0.018, metal);
        add(S, roundedBox(0.16, 0.13, 0.29, 0.045), boot, 0.15 * sx, 0.075, 0.1); add(S, roundedBox(0.165, 0.03, 0.3, 0.012), sole, 0.15 * sx, 0.012, 0.1); });
      root0.traverse(m => { if (m.isMesh) { m.frustumCulled = false; m.castShadow = false; } });
      const rest = {}; Object.keys(B).forEach(k => { rest[k] = B[k].quaternion.clone(); });
      return { mesh: root0, B, rest, leds: [ledRed], mats, tex: [fab, patch.map] };
    }
    /* ---------- boosters: two nozzles on the pack, a flame each, exhaust puffs ---------- */
    function flameMat() { return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uI: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float uI; uniform float uT; varying vec2 vU; void main(){ float y=vU.y; float core=pow(1.0-y,1.6); float flick=0.85+0.15*sin(uT*41.0+y*9.0)*sin(uT*23.0); float a=core*uI*flick; vec3 c=mix(vec3(1.0,0.45,0.15),vec3(0.75,0.88,1.0),pow(1.0-y,3.0)); gl_FragColor=vec4(c*a*1.6,a); }' }); }
    function boosters(rg) {
      const nozMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.35 }), out = [];
      [-1, 1].forEach(sx => { const g = new THREE.Group(); g.position.set(0.12 * sx, 0.86 - 1.16, -0.34); g.rotation.x = -0.45; // relative to the chest bone; nozzle points down and back
        const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.11, 16, 1, true), nozMat); noz.material.side = THREE.DoubleSide; g.add(noz);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.008, 8, 20), nozMat); rim.rotation.x = Math.PI / 2; rim.position.y = -0.055; g.add(rim);
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.055, 1, 16, 1, true), flameMat()); fl.geometry.rotateX(Math.PI); fl.geometry.translate(0, -0.5, 0); fl.position.y = -0.055; fl.scale.set(1, 0.01, 1);
        // the cone's base sits in the nozzle and its tip points away; uv.y is 0 at the base, so the flame is brightest at the nozzle
        g.add(fl); const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: o.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, color: 0xffb070 })); glow.position.y = -0.1; glow.scale.setScalar(0.2); g.add(glow);
        rg.B.chest.add(g); out.push({ g, fl, glow }); });
      return out;
    }
    function makePuffs() { const N = 36, list = []; for (let i = 0; i < N; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: o.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, color: 0xc8d8ff })); s.visible = false; scene.add(s); list.push({ s, life: 0, v: new THREE.Vector3() }); } return { list, i: 0, acc: 0 }; }

    const api = {
      root, get ready() { return st.ready; }, get pos() { return root.position; }, get speed() { return st.speed; }, get lead() { return st.lead; }, get bank() { return st.bank; },
      load(url, warm) { // v39: the suit is built here (no download); kept async so the universe's loading sequence is unchanged
        return new Promise(res => (window.requestIdleCallback || setTimeout)(res, { timeout: 200 })).then(() => {
          rig = buildSuit(); const holder = new THREE.Group(); rig.mesh.position.set(0, -1.0, 0); holder.add(rig.mesh); holder.scale.setScalar(0.42); body.add(holder);
          jets = boosters(rig); puffs = makePuffs(); warm && warm(holder); st.ready = true; root.visible = true; return true; });
      },
      setAnchors(points) { st.curve = new THREE.CatmullRomCurve3(points, false, 'centripetal'); },
      fly(target, beside, ms) { st.flight = { t0: performance.now(), ms: ms * 1.25, p0: root.position.clone(), p1: beside.clone(), c: root.position.clone().lerp(beside, 0.5).add(tmp.set(0, 1.0, 0)), look: target.clone() }; },
      endFlight() { st.flight = null; st.off = null; },
      resetTrail() { st.off = null; st.uVel = 0; st.lead = 0; st.fresh = true; },
      update({ u, dt, t, lookAt, still, camera, obstacles }) {
        if (!st.ready || !st.curve) return; dt = Math.max(1e-3, Math.min(0.25, dt)); camera.updateMatrixWorld();
        // journey speed (from the scroll-driven camera parameter) → a small lead and the booster thrust
        const du = (u - st.uPrev) / dt; st.uPrev = u; st.uVel += (du - st.uVel) * damp(4, dt);
        const travel = still ? 0 : clamp(Math.abs(st.uVel) * 9, 0, 1);
        st.lead += ((still ? 0 : clamp(st.uVel * 0.25, -0.012, 0.012)) - st.lead) * damp(3, dt);
        st.prev.copy(root.position);
        if (st.flight) { const F = st.flight, k = sstep(clamp((performance.now() - F.t0) / F.ms, 0, 1)), a = 1 - k;
          st.pos.set(a * a * F.p0.x + 2 * a * k * F.c.x + k * k * F.p1.x, a * a * F.p0.y + 2 * a * k * F.c.y + k * k * F.p1.y, a * a * F.p0.z + 2 * a * k * F.c.z + k * k * F.p1.z); }
        else {
          // where the composition wants it, expressed relative to the camera…
          st.curve.getPoint(clamp(u + st.lead, 0, 1), tmp); camera.worldToLocal(tmp);
          // …kept comfortably in shot (applied to the target, so the astronaut itself never snaps)
          const zf = Math.min(tmp.z, -2.9), d = -zf, th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          tmp.z = zf; tmp.x = clamp(tmp.x, -d * th * camera.aspect * 0.74, d * th * camera.aspect * 0.74); tmp.y = clamp(tmp.y, -d * th * 0.66, d * th * 0.66);
          // v39: never inside a world, and never behind one. The target is tested in world space against every world's
          // sphere (with clearance for atmospheres, rings and satellites): a target inside is pushed out to the surface of
          // that safety sphere; a target hidden behind a world is drawn toward the lens until it is in front of it.
          if (obstacles && obstacles.length) { camera.localToWorld(tmp); const cp = camera.position;
            /* the target is slid along the line of sight toward the lens until it is in front of every world: its place on
               screen does not change, it simply comes forward (only if a world is so close to the lens that there is no room
               in front of it is the target pushed sideways, out of that world) */
            for (let pass = 0; pass < 2; pass++) for (const ob of obstacles) {
              const R = ob.r, L = tmp2.subVectors(tmp, cp), len = L.length(); L.divideScalar(len); const oc = up.clone().subVectors(ob.p, cp), along = oc.dot(L), d2 = oc.lengthSq() - along * along;
              if (d2 < R * R && along > 0) { const near = along - Math.sqrt(R * R - d2); if (near < len + 1e-3) { if (near > 3.2) tmp.copy(cp).addScaledVector(L, near - 0.3); else { const out = up.clone().subVectors(tmp, ob.p); if (out.length() < R) tmp.copy(ob.p).addScaledVector(out.normalize(), R + 0.05); } } } }
            camera.worldToLocal(tmp); tmp.z = Math.min(tmp.z, -2.9); const d3 = -tmp.z; tmp.x = clamp(tmp.x, -d3 * th * camera.aspect * 0.74, d3 * th * camera.aspect * 0.74); tmp.y = clamp(tmp.y, -d3 * th * 0.66, d3 * th * 0.66); }
          if (!st.off || st.fresh) { st.off = tmp.clone(); st.offV.set(0, 0, 0); st.fresh = false; }
          // critically damped spring with a speed limit: it holds its place in the composition closely, and glides (never
          // jumps) when the composition changes — tighter than before, so the camera visibly follows the astronaut
          const w = 2.1; tmp2.subVectors(tmp, st.off).multiplyScalar(w * w).addScaledVector(st.offV, -2 * w); st.offV.addScaledVector(tmp2, dt);
          const vmax = 1.9; if (st.offV.length() > vmax) st.offV.setLength(vmax); st.off.addScaledVector(st.offV, dt);
          st.pos.copy(st.off); camera.localToWorld(st.pos);
        }
        root.position.copy(st.pos);
        // kinematics (world space, smoothed) — for orientation and the booster
        tmp.subVectors(root.position, st.prev).divideScalar(dt); if (tmp.length() > 400) tmp.set(0, 0, 0); st.vel.lerp(tmp, damp(3, dt));
        const sp = st.vel.length(), acc = (sp - st.speed) / dt; st.speed += (sp - st.speed) * damp(4, dt); st.acc += (acc - st.acc) * damp(2.5, dt);
        const moving = st.flight ? 1 : travel;
        st.thrust += (clamp(moving * 0.75 + clamp(st.acc / 30, 0, 0.5), 0, 1) - st.thrust) * damp(3, dt);
        // orientation: toward the direction of travel while moving, toward the world at rest; banks with lateral drift
        const look = st.flight ? st.flight.look : lookAt; camera.getWorldDirection(tmp2);
        if (moving > 0.05 && sp > 0.3) { tmp.copy(st.vel).normalize().lerp(tmp2, 0.35).normalize(); tmp.multiplyScalar(10).add(root.position); if (look) tmp.lerp(look, 1 - moving); } else if (look) tmp.copy(look); else tmp.copy(root.position).add(tmp2);
        m4.lookAt(tmp, root.position, up); qa.setFromRotationMatrix(m4);
        const lat = st.off ? clamp(-st.offV.x * 0.35, -0.3, 0.3) : 0; st.bank += (lat - st.bank) * damp(2, dt);
        qr.setFromEuler(e3.set(0.32 * moving + clamp(-st.acc * 0.004, -0.15, 0.15), 0, st.bank)); qa.multiply(qr); // lean into the flight; roll with drift
        root.quaternion.slerp(qa, damp(st.flight ? 2.2 : 1.4, dt)); /* turns smoothly and steadily */
        animate(t, dt, moving, still);
      },
      dispose() { scene.remove(root); if (rig) { rig.mats.forEach(m => m.dispose()); rig.tex.forEach(t => t && t.dispose()); rig.mesh.traverse(m => m.geometry && m.geometry.dispose()); } if (puffs) puffs.list.forEach(p => { scene.remove(p.s); p.s.material.dispose(); }); jets.forEach(j => { j.fl.material.dispose(); j.glow.material.dispose(); }); }
    };

    /* ---------- procedural body animation ---------- */
    const nz = (t, a1, a2, a3, ph) => Math.sin(t * a1 + ph) * 0.6 + Math.sin(t * a2 + ph * 1.7) * 0.3 + Math.sin(t * a3 + ph * 2.3) * 0.1; // smooth, non-repeating
    const pose = {}; // current joint angles (eased toward targets)
    function J(name, x, y, z, rate, dt) { const p = pose[name] = pose[name] || { x: 0, y: 0, z: 0 }; const k = damp(rate, dt); p.x += (x - p.x) * k; p.y += (y - p.y) * k; p.z += (z - p.z) * k;
      const b = rig.B[name]; b.quaternion.copy(rig.rest[name]).multiply(qr.setFromEuler(e3.set(p.x, p.y, p.z))); }
    function animate(t, dt, moving, still) {
      if (!rig) return; const calm = still ? 0 : 1, br = (0.8 + 0.2 * Math.sin(t * 0.07)) * calm, fly = moving, rest = 1 - fly;
      const brake = clamp(-st.acc / 25, 0, 1) * fly; // arms come forward when slowing down
      // an occasional wave toward the world being visited (only at rest)
      const W = st.wave; if (rest > 0.9 && calm && W.t < 0 && t > W.next) W.t = 0; if (W.t >= 0) { W.t += dt; if (W.t > 3.2 || rest < 0.5) { W.t = -1; W.next = t + 14 + Math.random() * 10; } }
      const wv = W.t >= 0 ? Math.sin(Math.PI * clamp(W.t / 3.2, 0, 1)) : 0, wag = Math.sin(W.t * 7.5) * 0.35 * wv;
      /* v36 travel choreography (only while flying between worlds): a zero-g "swim" — alternating arm strokes and a slow
         flutter kick — an occasional superman pose (one arm reaching ahead), and on longer trips one slow barrel roll */
      if (fly > 0.3 && calm) st.trav += dt; else st.trav = Math.max(0, st.trav - dt * 2);
      const ph = st.trav * Math.PI * 2 / 2.8, sw = fly * calm;
      const S = st.sup; if (fly > 0.6 && calm && S.t < 0 && st.trav > S.next) S.t = 0; if (S.t >= 0) { S.t += dt; if (S.t > 3 || fly < 0.2) { S.t = -1; S.next = st.trav + 7 + Math.random() * 4; } }
      const sup = S.t >= 0 ? Math.sin(Math.PI * Math.min(1, S.t / 3)) : 0;
      const Rr = st.roll; if (fly > 0.6 && calm && Rr.t < 0 && st.trav > Rr.next) Rr.t = 0; if (Rr.t >= 0) { Rr.t += dt; if (Rr.t > 2.6) { Rr.t = -1; Rr.next = st.trav + 11 + Math.random() * 6; } }
      const roll = Rr.t >= 0 ? sstepA(Math.min(1, Rr.t / 2.6)) * Math.PI * 2 : 0;
      body.rotation.z = roll;
      // torso and head
      J('pelvis', nz(t, 0.21, 0.37, 0.83, 0.4) * 0.05 * br - 0.06 * fly, nz(t, 0.17, 0.33, 0.71, 1.3) * 0.06 * br, nz(t, 0.19, 0.41, 0.9, 2.2) * 0.04 * br, 2, dt);
      J('chest', nz(t, 0.23, 0.45, 0.97, 3.1) * 0.05 * br + 0.08 * fly - 0.05 * brake, nz(t, 0.19, 0.39, 0.77, 0.6) * 0.07 * br + Math.sin(ph) * 0.12 * sw, nz(t, 0.27, 0.51, 1.1, 1.7) * 0.04 * br, 2, dt);
      J('head', nz(t, 0.13, 0.29, 0.61, 2.6) * 0.1 * br - 0.12 * fly, nz(t, 0.11, 0.23, 0.53, 4.2) * 0.22 * br + 0.15 * wv, 0, 1.6, dt);
      const phS = ph, swF = sw; // stroke phase and strength (named apart from the per-arm phase below)
      // arms: relaxed float (slightly out, elbows soft) → swept back and in while flying → forward to brake; right arm waves
      [['L', 1], ['R', -1]].forEach(([s, sx], i) => {
        const ph = i * 2.1, waveArm = s === 'R' ? wv : 0;
        const stroke = Math.sin(phS + i * Math.PI), reach = s === 'R' ? sup : -sup * 0.6; // reach>0: arm ahead; <0: arm tucked back
        const abd = (0.26 + nz(t, 0.29, 0.53, 1.07, ph) * 0.09 * br) * rest + (0.18 + 0.32 * Math.max(0, -stroke)) * swF * (1 - sup) + 0.08 * sup + 1.15 * waveArm,
          swing = (nz(t, 0.23, 0.47, 0.91, ph + 1) * 0.12 * br - 0.08) * rest + (0.35 + 0.75 * stroke) * swF * (1 - sup) - 2.5 * Math.max(0, reach) + 0.45 * Math.max(0, -reach) - 0.9 * brake - 0.35 * waveArm;
        J('uArm' + s, swing, 0, abd * sx, fly > 0.3 ? 3.6 : 2.4, dt);
        J('fArm' + s, -(0.38 + nz(t, 0.31, 0.61, 1.3, ph + 2) * 0.12 * br) * rest - (0.25 + 0.55 * Math.max(0, stroke)) * swF * (1 - sup) - 0.15 * Math.abs(reach) - 0.5 * brake - (0.7 + wag) * waveArm, 0, wag * 0.6 * sx * waveArm, fly > 0.3 ? 3.8 : 2.8, dt);
        // legs: loose, slowly bicycling at rest; together and trailing while flying
        const kick = nz(t, 0.25, 0.49, 0.97, ph + 0.7);
        const flutter = Math.sin(phS * 1.5 + i * Math.PI);
        J('thigh' + s, (-0.12 + kick * 0.12 * br) * rest + (0.2 + 0.16 * flutter) * swF + 0.1 * sup, 0, (0.06 + nz(t, 0.2, 0.4, 0.8, ph) * 0.03 * br) * sx * rest + 0.02 * sx * swF, fly > 0.3 ? 3.2 : 2.2, dt);
        J('shin' + s, (0.28 + Math.max(0, -kick) * 0.25 * br) * rest + (0.18 + 0.3 * Math.max(0, flutter)) * swF + 0.05 * sup, 0, 0, fly > 0.3 ? 3.4 : 2.4, dt); });
      // life signs: the chest rises with each slow breath, a status light blinks
      if (rig.B.chest) { const breath = 1 + 0.012 * Math.sin(t * 1.25) * calm; rig.B.chest.scale.set(breath, 1 + (breath - 1) * 0.4, breath); }
      if (rig.leds) rig.leds.forEach(l => { l.visible = (t % 1.6) < 0.18 || !calm; });
      // body drift in the frame (tiny; the root carries the real motion)
      body.position.set(nz(t, 0.23, 0.41, 0.97, 0.3) * 0.025 * br, nz(t, 0.31, 0.57, 1.13, 1.9) * 0.035 * br, 0);
      // boosters: main thrust while travelling; short attitude pulses at rest
      const P = st.pulse; if (rest > 0.9 && calm && P.t < 0 && t > P.next) P.t = 0; if (P.t >= 0) { P.t += dt; if (P.t > 0.45) { P.t = -1; P.next = t + 5 + Math.random() * 7; } }
      const pulse = P.t >= 0 ? Math.sin(Math.PI * P.t / 0.45) * 0.35 : 0, I = clamp(st.thrust + pulse, 0, 1) * calm;
      jets.forEach((j, k) => { const fl = 0.92 + 0.08 * Math.sin(t * 37 + k * 2) * Math.sin(t * 19 + k); j.fl.material.uniforms.uI.value = I; j.fl.material.uniforms.uT.value = t + k; j.fl.scale.set(1 + 0.4 * I, Math.max(0.01, (0.18 + 0.95 * I) * fl), 1 + 0.4 * I); j.fl.visible = I > 0.02; j.glow.material.opacity = I * 0.8; j.glow.scale.setScalar(0.2 + 0.35 * I); });
      // exhaust puffs: spawned at the nozzles in world space, drifting backwards and fading
      if (puffs) { puffs.acc += dt * 26 * I; while (puffs.acc >= 1 && jets.length) { puffs.acc -= 1; const p = puffs.list[puffs.i++ % puffs.list.length], j = jets[puffs.i % 2]; j.glow.getWorldPosition(p.s.position); j.g.getWorldQuaternion(qa); p.v.set((Math.random() - 0.5) * 0.15, -0.6 - Math.random() * 0.4, (Math.random() - 0.5) * 0.15).applyQuaternion(qa); p.life = 1; p.s.visible = true; }
        puffs.list.forEach(p => { if (p.life <= 0) return; p.life -= dt * 1.6; p.s.position.addScaledVector(p.v, dt); const a = Math.max(0, p.life); p.s.material.opacity = a * a * 0.35; p.s.scale.setScalar(0.05 + (1 - a) * 0.22); if (p.life <= 0) p.s.visible = false; }); }
    }
    return api;
  };
})();
