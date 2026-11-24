/* ERLY Learning Studio — the astronaut's flight controller (used by ls-cosmos.js).

   The astronaut is a real object travelling through world space — not an overlay held at a fixed screen position.

   Journey model (shared with the camera): the universe evaluates one eased journey parameter u ∈ [0, 1] from the scroll.
   The camera follows its spline at u; the astronaut follows ITS OWN world-space spline through "anchors" — one per keyframe,
   placed where the keyframe's camera framing puts the astronaut at rest (so every resting composition is preserved) — at
   u + lead. The lead grows with the journey's speed: the astronaut departs first, flies ahead toward the next world,
   arrives first and waits there while the camera catches up. Because both follow continuous splines of the same damped
   parameter, a fast scroll or a large jump can never make it teleport.

   Orientation: while travelling it faces along its direction of flight; at rest it turns toward the world it is visiting
   (quaternion slerp, rate-limited). It banks into turns in proportion to the path's curvature and speed, and pitches with
   acceleration. Zero-g drift is a sum of incommensurate slow waves (non-repeating). Propulsion (a small glow) and a short
   fading trail appear only while travelling.

   The GLB ("Astronaut" by Poly by Google, CC-BY; see assets/models/CREDITS.md) has a single rigid mesh with no skeleton,
   so limb motion is not possible; all motion is whole-body and procedural. */
(function () {
  'use strict';
  const LS = window.LS;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sstep = t => t * t * t * (t * (t * 6 - 15) + 10);

  LS.cosmosAstronaut = function (THREE, scene, o = {}) {
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    const body = new THREE.Group(); root.add(body);
    const jet = new THREE.Sprite(new THREE.SpriteMaterial({ map: o.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    jet.position.set(0, 0.12, -0.3); jet.scale.setScalar(0.1); body.add(jet);
    // trail: a short line of recent positions, brightest at the astronaut, fading to nothing
    const TN = 48, tp = new Float32Array(TN * 3), tc = new Float32Array(TN * 3), tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); trail.frustumCulled = false; scene.add(trail);
    let trailInit = false;

    const st = { ready: false, curve: null, u: 0, uPrev: 0, uVel: 0, lead: 0, pos: new THREE.Vector3(), prevPos: new THREE.Vector3(), vel: new THREE.Vector3(), prevVel: new THREE.Vector3(), speed: 0, acc: 0, bank: 0, flight: null, fade: 0 };
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), qa = new THREE.Quaternion(), qRoll = new THREE.Quaternion(), qPitch = new THREE.Quaternion();

    const api = {
      root, get ready() { return st.ready; }, get pos() { return root.position; }, get speed() { return st.speed; }, get lead() { return st.lead; }, get bank() { return st.bank; },
      load(url, warm) {
        return import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new GLTFLoader().loadAsync(url)).then(g => {
          const m = g.scene; m.traverse(x => { if (x.isMesh) { x.material.color.setScalar(1); x.material.roughness = 0.68; x.material.metalness = 0.04; } });
          m.position.set(0, -1.0, 0); const holder = new THREE.Group(); holder.add(m); holder.scale.setScalar(0.42); body.add(holder); warm && warm(holder);
          st.ready = true; root.visible = true; return true; });
      },
      /* anchors: world-space points, one per keyframe (rebuilt when the framing changes, e.g. on a phone rotating) */
      setAnchors(points) { st.curve = new THREE.CatmullRomCurve3(points, false, 'centripetal'); },
      /* flight to a selected world: a curved approach to a point beside it, facing it */
      fly(target, beside, ms) { st.flight = { t0: performance.now(), ms, p0: root.position.clone(), p1: beside.clone(), c: root.position.clone().lerp(beside, 0.5).add(tmp.set(0, 1.2, 0)), look: target.clone() }; },
      endFlight() { st.flight = null; },
      /* a direct jump (Destinations menu, deep link): the trail restarts instead of streaking across the sky */
      resetTrail() { trailInit = false; trail.material.opacity = 0; st.uVel = 0; st.lead = 0; },
      /* u: the camera's journey parameter. lookAt: the point the astronaut should face when at rest. dt in seconds. */
      update({ u, dt, t, lookAt, still, camera }) {
        if (!st.ready || !st.curve) return; dt = Math.max(1e-3, Math.min(0.1, dt));
        // journey speed → lead (flies ahead while travelling, settles at its anchor at rest)
        const du = (u - st.uPrev) / dt; st.uPrev = u; st.uVel += (du - st.uVel) * (1 - Math.exp(-dt * 5));
        const want = still ? 0 : clamp(Math.abs(st.uVel) * 0.4, 0, 0.022) * Math.sign(st.uVel || 1); st.lead += (want - st.lead) * (1 - Math.exp(-dt * 3));
        const uu = clamp(u + st.lead, 0, 1);
        st.prevPos.copy(st.pos);
        if (st.flight) { const F = st.flight, k = sstep(clamp((performance.now() - F.t0) / F.ms, 0, 1)), a = 1 - k;
          st.pos.set(a * a * F.p0.x + 2 * a * k * F.c.x + k * k * F.p1.x, a * a * F.p0.y + 2 * a * k * F.c.y + k * k * F.p1.y, a * a * F.p0.z + 2 * a * k * F.c.z + k * k * F.p1.z); }
        else st.curve.getPoint(uu, st.pos);
        // a guard: it never comes closer to the lens than 2.6 units nor sits behind the camera
        if (camera) { tmp.subVectors(st.pos, camera.position); const d = tmp.length(); camera.getWorldDirection(tmp2); const ahead = tmp.dot(tmp2);
          if (d < 2.6 || ahead < 1.5) { tmp.copy(tmp2).multiplyScalar(Math.max(2.8, ahead)).add(camera.position); st.pos.lerp(tmp, d < 2.6 ? 1 : 0.6); } }
        // framing: between worlds the camera's arc and the astronaut's arc differ; it is kept inside the frame (it may drift
        // to the edges, never out of shot) by pulling it toward the nearest point inside an inner frame at the same depth
        if (camera) { tmp.copy(st.pos).project(camera); const z = tmp.z, X = 0.8, Y = 0.72;
          if (z > -1 && z < 1 && (Math.abs(tmp.x) > X || Math.abs(tmp.y) > Y)) { tmp.x = clamp(tmp.x, -X, X); tmp.y = clamp(tmp.y, -Y, Y); tmp.unproject(camera); st.pos.copy(tmp); } }
        // kinematics from the path
        st.vel.subVectors(st.pos, st.prevPos).divideScalar(dt); const sp = st.vel.length(); if (!trailInit) { st.prevVel.copy(st.vel); }
        const acc = (sp - st.speed) / dt; st.speed += (sp - st.speed) * (1 - Math.exp(-dt * 6)); st.acc += (acc - st.acc) * (1 - Math.exp(-dt * 3));
        const moving = clamp((st.speed - 0.6) / 6, 0, 1);
        // banking: lateral acceleration (turning) relative to the direction of travel
        let bankWant = 0; if (sp > 0.5) { const turn = tmp.subVectors(st.vel, st.prevVel).divideScalar(dt); fwd.copy(st.vel).normalize(); const right = tmp2.crossVectors(fwd, up).normalize(); bankWant = clamp(-turn.dot(right) * 0.012, -0.45, 0.45); }
        st.prevVel.copy(st.vel); st.bank += (bankWant - st.bank) * (1 - Math.exp(-dt * 2.5));
        // drift (non-repeating), smaller while travelling
        const nz = (a1, a2, a3, ph) => Math.sin(t * a1 + ph) * 0.6 + Math.sin(t * a2 + ph * 1.7) * 0.3 + Math.sin(t * a3 + ph * 2.3) * 0.1, br = (0.75 + 0.25 * Math.sin(t * 0.071 + 1.1)) * (1 - 0.6 * moving);
        root.position.copy(st.pos);
        body.position.set(nz(0.23, 0.41, 0.97, 0.3) * 0.03 * br, nz(0.31, 0.57, 1.13, 1.9) * 0.045 * br, 0);
        // orientation: along the flight when moving, toward the world at rest
        const look = st.flight ? st.flight.look : lookAt;
        if (moving > 0.02 && sp > 0.01) { fwd.copy(st.vel).normalize(); tmp.copy(st.pos).addScaledVector(fwd, 10); if (look) tmp.lerp(look, 1 - moving); } else if (look) tmp.copy(look); else tmp.copy(st.pos).add(fwd.set(0, 0, -1));
        m4.lookAt(tmp, st.pos, up); qa.setFromRotationMatrix(m4);
        qRoll.setFromAxisAngle(tmp2.set(0, 0, 1), st.bank); qPitch.setFromAxisAngle(tmp.set(1, 0, 0), clamp(st.acc * 0.01, -0.25, 0.25) + 0.12 * moving); qa.multiply(qRoll).multiply(qPitch);
        root.quaternion.slerp(qa, 1 - Math.exp(-dt * (st.flight ? 4 : 2.2)));
        body.rotation.set(nz(0.19, 0.43, 0.89, 2.7) * 0.05 * br, nz(0.13, 0.29, 0.61, 0.9) * 0.09 * br, nz(0.17, 0.37, 0.79, 4.1) * 0.07 * br);
        // propulsion and trail only while travelling
        jet.material.opacity += (clamp(moving * 0.3 + clamp(st.acc / 40, 0, 1) * 0.25, 0, 0.42) - jet.material.opacity) * (1 - Math.exp(-dt * 6)); jet.scale.setScalar(0.08 + 0.12 * moving);
        if (trailInit && st.pos.distanceToSquared(st.prevPos) > 36) trailInit = false; // >6 units in one frame: restart, never streak
        if (!trailInit) { for (let i = 0; i < TN; i++) tp.set([st.pos.x, st.pos.y, st.pos.z], i * 3); trailInit = true; }
        tp.copyWithin(3, 0, (TN - 1) * 3); tp[0] = st.pos.x; tp[1] = st.pos.y - 0.05; tp[2] = st.pos.z;
        for (let i = 0; i < TN; i++) { const f = Math.pow(1 - i / TN, 2) * 0.9; tc[i * 3] = 0.62 * f; tc[i * 3 + 1] = 0.78 * f; tc[i * 3 + 2] = 1.0 * f; }
        tg.attributes.position.needsUpdate = true; tg.attributes.color.needsUpdate = true;
        trail.material.opacity += ((still ? 0 : moving * 0.55) - trail.material.opacity) * (1 - Math.exp(-dt * 4)); trail.visible = trail.material.opacity > 0.01;
      },
      dispose() { scene.remove(root); scene.remove(trail); tg.dispose(); trail.material.dispose(); jet.material.dispose(); }
    };
    return api;
  };
})();
