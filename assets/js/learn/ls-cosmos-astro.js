/* ERLY Learning Studio — the astronaut (used by ls-cosmos.js). v35.

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

    /* ---------- auto-rig: bones + smooth weights from the measured model (feet at y=0, 2.0 tall, facing +z) ---------- */
    function rigModel(mesh) {
      const geo = mesh.geometry, pos = geo.attributes.position, n = pos.count;
      const B = {}, bone = (name, x, y, z, parent) => { const b = new THREE.Bone(); b.name = name; const pw = parent ? parent.userData.w : new THREE.Vector3(); b.position.set(x - pw.x, y - pw.y, z - pw.z); b.userData.w = new THREE.Vector3(x, y, z); if (parent) parent.add(b); B[name] = b; return b; };
      bone('pelvis', 0, 0.86, 0.04); bone('chest', 0, 1.16, 0.0, B.pelvis); bone('head', 0, 1.47, 0.04, B.chest);
      [['L', 1], ['R', -1]].forEach(([s, sx]) => { bone('uArm' + s, 0.355 * sx, 1.37, 0.05, B.chest); bone('fArm' + s, 0.47 * sx, 1.07, 0.07, B['uArm' + s]); bone('thigh' + s, 0.15 * sx, 0.8, 0.05, B.pelvis); bone('shin' + s, 0.155 * sx, 0.43, 0.06, B['thigh' + s]); });
      const order = ['pelvis', 'chest', 'head', 'uArmL', 'fArmL', 'thighL', 'shinL', 'uArmR', 'fArmR', 'thighR', 'shinR'], idx = {}; order.forEach((k, i) => { idx[k] = i; });
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), v = new THREE.Vector3();
      for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i); const ax = Math.abs(v.x), s = v.x >= 0 ? 'L' : 'R', w = {};
        // arms: lateral of the torso, from the hands (y≈0.8) up into the shoulder, never the life-support pack behind
        let arm = v.y > 0.76 ? ss(0.3, 0.375, ax) * (1 - ss(1.36, 1.5, v.y)) : 0; if (v.z < -0.2 && ax < 0.36) arm = 0;
        if (v.y > 1.22) arm *= ss(0.27, 0.36, ax);
        const fore = 1 - ss(1.0, 1.15, v.y);
        const bodyW = 1 - arm, leg = 1 - ss(0.7, 0.9, v.y), shin = 1 - ss(0.35, 0.5, v.y);
        const head = ss(1.43, 1.56, v.y) * (v.z < -0.3 ? 0.3 : 1), chest = ss(0.98, 1.24, v.y);
        w['uArm' + s] = arm * (1 - fore); w['fArm' + s] = arm * fore;
        w['thigh' + s] = bodyW * leg * (1 - shin); w['shin' + s] = bodyW * leg * shin;
        const rest = bodyW * (1 - leg); w.head = rest * head; w.chest = rest * (1 - head) * chest; w.pelvis = rest * (1 - head) * (1 - chest);
        const top = Object.entries(w).filter(e => e[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), tot = top.reduce((a, e) => a + e[1], 0) || 1;
        top.forEach(([k, x], j) => { si[i * 4 + j] = idx[k]; sw[i * 4 + j] = x / tot; }); }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      const sk = new THREE.SkinnedMesh(geo, mesh.material); sk.add(B.pelvis); sk.updateMatrixWorld(true); sk.bind(new THREE.Skeleton(order.map(k => B[k]))); sk.frustumCulled = false;
      const rest = {}; order.forEach(k => { rest[k] = B[k].quaternion.clone(); });
      return { mesh: sk, B, rest };
    }
    /* ---------- boosters: two nozzles on the pack, a flame each, exhaust puffs ---------- */
    function flameMat() { return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uI: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float uI; uniform float uT; varying vec2 vU; void main(){ float y=vU.y; float core=pow(1.0-y,1.6); float flick=0.85+0.15*sin(uT*41.0+y*9.0)*sin(uT*23.0); float a=core*uI*flick; vec3 c=mix(vec3(1.0,0.45,0.15),vec3(0.75,0.88,1.0),pow(1.0-y,3.0)); gl_FragColor=vec4(c*a*1.6,a); }' }); }
    function boosters(rg) {
      const nozMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.35 }), out = [];
      [-1, 1].forEach(sx => { const g = new THREE.Group(); g.position.set(0.13 * sx, 1.02 - 1.16, -0.36); g.rotation.x = -0.35; // relative to the chest bone; nozzle points down and back
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
      load(url, warm) {
        return import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new GLTFLoader().loadAsync(url)).then(g => {
          let mesh = null; g.scene.traverse(x => { if (x.isMesh && !mesh) mesh = x; }); mesh.material.color.setScalar(1); mesh.material.roughness = 0.68; mesh.material.metalness = 0.04;
          rig = rigModel(mesh); const holder = new THREE.Group(); rig.mesh.position.set(0, -1.0, 0); holder.add(rig.mesh); holder.scale.setScalar(0.42); body.add(holder);
          jets = boosters(rig); puffs = makePuffs(); warm && warm(holder); st.ready = true; root.visible = true; return true; });
      },
      setAnchors(points) { st.curve = new THREE.CatmullRomCurve3(points, false, 'centripetal'); },
      fly(target, beside, ms) { st.flight = { t0: performance.now(), ms: ms * 1.25, p0: root.position.clone(), p1: beside.clone(), c: root.position.clone().lerp(beside, 0.5).add(tmp.set(0, 1.0, 0)), look: target.clone() }; },
      endFlight() { st.flight = null; st.off = null; },
      resetTrail() { st.off = null; st.uVel = 0; st.lead = 0; st.fresh = true; },
      update({ u, dt, t, lookAt, still, camera }) {
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
          tmp.z = zf; tmp.x = clamp(tmp.x, -d * th * camera.aspect * 0.78, d * th * camera.aspect * 0.78); tmp.y = clamp(tmp.y, -d * th * 0.7, d * th * 0.7);
          if (!st.off || st.fresh) { st.off = tmp.clone(); st.offV.set(0, 0, 0); st.fresh = false; }
          // critically damped spring with a speed limit: slow-to-medium movement in the frame
          const w = 0.85; tmp2.subVectors(tmp, st.off).multiplyScalar(w * w).addScaledVector(st.offV, -2 * w); st.offV.addScaledVector(tmp2, dt);
          const vmax = 0.55; if (st.offV.length() > vmax) st.offV.setLength(vmax); st.off.addScaledVector(st.offV, dt);
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
        root.quaternion.slerp(qa, damp(st.flight ? 1.8 : 0.9, dt)); /* v36: turns slowly and steadily */
        animate(t, dt, moving, still);
      },
      dispose() { scene.remove(root); if (puffs) puffs.list.forEach(p => { scene.remove(p.s); p.s.material.dispose(); }); jets.forEach(j => { j.fl.material.dispose(); j.glow.material.dispose(); }); }
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
