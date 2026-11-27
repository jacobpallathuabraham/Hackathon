/* ERLY Learning Studio — life in the universe (v39, used by ls-cosmos.js).

   · Asteroid fields: irregular, cratered rocks (three noise-displaced shapes, smooth-shaded, lit by the sun) scattered in
     drifts beside the journey — never on the camera's path or inside a world — and a denser belt around the place where
     the worlds gather at the end. Every rock tumbles on its own axis at its own rate, entirely on the GPU (one instanced
     draw per shape, no per-frame CPU work).
   · Meteors: now and then a bright head with a long, fading trail streaks across the sky in the distance.
   · Speed streaks: when the journey moves fast, faint motion streaks pass the lens (an infinite field wrapped around the
     camera, also GPU-only); at rest they vanish.
   · Lens flare: when the sun is in view, a soft glow and a few gentle ghosts along the optical axis.
   All of it scales with the device tier, and all of it is off with reduced motion (the rocks stay, still). */
(function () {
  'use strict';
  const LS = window.LS;

  LS.cosmosFX = function (THREE, scene, q, o) {
    const out = { disposables: [] }, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    let s = 4211; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const uT = { value: 0 }, uObs = { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uWrap = { value: 9 }, uSeg0 = { value: new THREE.Vector3() }, uSeg1 = { value: new THREE.Vector3() }, uSegR = { value: 0 };

    /* ---------- rocks ---------- */
    const vnoise = (() => { const perm = new Uint8Array(512), g = []; for (let i = 0; i < 256; i++) perm[i] = i; for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];
      for (let i = 0; i < 256; i++) g.push(R() * 2 - 1);
      const f = (x, y, z) => { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = x - X, v = y - Y, w = z - Z, sm = t => t * t * (3 - 2 * t), a = sm(u), b = sm(v), c = sm(w);
        const h = (i, j, k) => g[perm[(perm[(perm[(X + i) & 255] + Y + j) & 255] + Z + k) & 255]];
        const l = (p, q2, t) => p + (q2 - p) * t;
        return l(l(l(h(0, 0, 0), h(1, 0, 0), a), l(h(0, 1, 0), h(1, 1, 0), a), b), l(l(h(0, 0, 1), h(1, 0, 1), a), l(h(0, 1, 1), h(1, 1, 1), a), b), c); };
      return (x, y, z) => f(x, y, z) * 0.55 + f(x * 2.1, y * 2.1, z * 2.1) * 0.3 + f(x * 4.3, y * 4.3, z * 4.3) * 0.15; })();
    /* a rock: a noise-displaced icosphere with craters (bowl + raised rim), a family shape (elongated, two-lobed, angular,
       shard…), and per-vertex ambient occlusion — hollows and crater floors are darker, ridges lighter */
    function rock(seed, detail, fam) {
      const F = [{ s: [1, 0.8, 0.9], lumpy: 0.35, cr: 5 }, { s: [1.5, 0.7, 0.8], lumpy: 0.3, cr: 4 }, { s: [1, 1, 1], lumpy: 0.55, cr: 3 }, { s: [1.1, 0.9, 0.95], lumpy: 0.25, cr: 9 }, { s: [1.6, 0.8, 0.85], lumpy: 0.3, cr: 4, lobes: true }, { s: [1.3, 0.55, 0.7], lumpy: 0.45, cr: 2, sharp: true }][fam];
      const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position, v = new THREE.Vector3(), H = new Float32Array(p.count);
      const craters = Array.from({ length: F.cr }, () => ({ c: new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize(), r: 0.16 + R() * 0.32, d: 0.06 + R() * 0.1 }));
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize();
        let h = 1 + vnoise(n.x * 1.6 + seed, n.y * 1.6, n.z * 1.6) * F.lumpy + vnoise(n.x * 5 + seed, n.y * 5, n.z * 5) * 0.08 + vnoise(n.x * 11 + seed, n.y * 11, n.z * 11) * 0.025;
        if (F.sharp) h += Math.abs(vnoise(n.x * 3 + seed, n.y * 3, n.z * 3)) * 0.25;
        craters.forEach(c => { const d = n.distanceTo(c.c) / c.r; if (d < 1) h -= c.d * (1 - d * d); else if (d < 1.3) h += c.d * 0.45 * (1 - (d - 1) / 0.3); });
        if (F.lobes) h *= 1 - 0.28 * Math.exp(-n.x * n.x * 14); // a "contact binary": two lobes joined by a waist
        H[i] = h; v.copy(n).multiplyScalar(h); v.set(v.x * F.s[0], v.y * F.s[1], v.z * F.s[2]); p.setXYZ(i, v.x, v.y, v.z); }
      let mean = 0; for (let i = 0; i < p.count; i++) mean += H[i]; mean /= p.count;
      const col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const ao = clamp(0.62 + (H[i] - mean) * 2.4, 0.35, 1.15); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('normal'); g.deleteAttribute('uv');
      const merged = LS.__bgu ? LS.__bgu.mergeVertices(g, 1e-4) : g; merged.computeVertexNormals(); return merged; }
    const bumpDummy = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1); bumpDummy.needsUpdate = true; out.disposables.push(bumpDummy);
    const rockMat = () => { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0, vertexColors: true, bumpMap: bumpDummy, bumpScale: 1 });
      m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uObs = uObs; sh.uniforms.uWrap = uWrap; sh.uniforms.uSeg0 = uSeg0; sh.uniforms.uSeg1 = uSeg1; sh.uniforms.uSegR = uSegR;
        /* fine relief and grain from 3D noise in the rock's own space (no UVs, no seams): the bump function three.js would read
           from a texture is replaced by noise, so close rocks show pits and grit and far ones stay smooth */
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n varying vec3 vRk;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vRk = position;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
          varying vec3 vRk; float rkH(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
          float rkN(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(rkH(i),rkH(i+vec3(1,0,0)),f.x),mix(rkH(i+vec3(0,1,0)),rkH(i+vec3(1,1,0)),f.x),f.y),mix(mix(rkH(i+vec3(0,0,1)),rkH(i+vec3(1,0,1)),f.x),mix(rkH(i+vec3(0,1,1)),rkH(i+vec3(1,1,1)),f.x),f.y),f.z); }
          float rkF(vec3 p){ return rkN(p*6.0)*0.6+rkN(p*14.0)*0.3+rkN(p*31.0)*0.1; }`)
          .replace('vec2 dHdxy_fwd() {', `vec2 dHdxy_fwd() { vec3 dx=dFdx(vRk), dy=dFdy(vRk); float h0=rkF(vRk); return vec2(rkF(vRk+dx)-h0, rkF(vRk+dy)-h0)*2.2; }
          vec2 dHdxy_fwd_unused() {`)
          .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.8 + 0.4*rkF(vRk*1.7);');
        sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
          attribute vec4 aSpin; attribute vec4 aDrift; uniform float uT; uniform vec4 uObs[16]; uniform float uWrap; uniform vec3 uSeg0; uniform vec3 uSeg1; uniform float uSegR;
          vec3 rotA(vec3 v, vec3 k, float a){ float c=cos(a), s=sin(a); return v*c+cross(k,v)*s+k*dot(k,v)*(1.0-c); }`)
          .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          float spinA = uT*aSpin.w + aSpin.x*6.2831; vec3 spinK = normalize(aSpin.xyz*2.0-1.0+vec3(0.001));
          objectNormal = rotA(objectNormal, spinK, spinA);`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>
          transformed = rotA(transformed, spinK, spinA);`)
          /* v40: every rock drifts through space on its own heading (wrapping inside its region, shrinking away near the
             wrap so it never pops), and is pushed out of the way of every world, the astronaut and the camera */
          .replace('#include <project_vertex>', `vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mat4 rkM = instanceMatrix; vec3 rkC = rkM[3].xyz; vec3 rkW = mod(aDrift.xyz*uT + uWrap, 2.0*uWrap) - uWrap; rkC += rkW;
            float rkF = 1.0 - smoothstep(0.8*uWrap, uWrap, max(abs(rkW.x), max(abs(rkW.y), abs(rkW.z))));
            for (int rkI = 0; rkI < 16; rkI++) { vec4 rkO = uObs[rkI]; if (rkO.w <= 0.0) continue; vec3 rkD = rkC - rkO.xyz; float rkL = length(rkD); if (rkL < rkO.w) { rkC = rkO.xyz + rkD / max(rkL, 1e-3) * rkO.w; } }
            /* keep the line of sight from the camera to the astronaut clear: push the rock out of a capsule around it */
            if (uSegR > 0.0) { vec3 sa = uSeg1 - uSeg0; float sl = max(dot(sa, sa), 1e-4); float st = clamp(dot(rkC - uSeg0, sa) / sl, 0.0, 1.0); vec3 sp = uSeg0 + sa * st; vec3 sd = rkC - sp; float sdl = length(sd); if (sdl < uSegR) rkC = sp + (sdl > 1e-3 ? sd / sdl : vec3(0.0, 1.0, 0.0)) * uSegR; }
            rkM[0] *= rkF; rkM[1] *= rkF; rkM[2] *= rkF; rkM[3] = vec4(rkC, 1.0); mvPosition = rkM * mvPosition;
          #endif
          mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`); };
      return m; };
    const NF = 6, hiD = q >= 1 ? 5 : 3, shapes = []; for (let f = 0; f < NF; f++) shapes.push(rock(1.7 + f * 3.3, 1, f), rock(1.7 + f * 3.3, hiD, f)); /* even index: small rocks (low detail); odd: large rocks (detailed) */
    const avoid = o.avoid || (() => false);
    const fieldN = [70, 170, 280][q], beltN = [110, 260, 420][q];
    const pick = () => { // a rock size: mostly pebbles and boulders, rarely a mountain
      const u = R(); return u < 0.72 ? 0.035 + R() * 0.11 : u < 0.96 ? 0.15 + R() * 0.25 : 0.5 + R() * 0.7; };
    const placements = [];
    for (let tries = 0; placements.length < fieldN && tries < fieldN * 30; tries++) {
      const z = 30 - R() * 262, x = (R() * 2 - 1) * 46, y = (R() * 2 - 1) * 24, p = new THREE.Vector3(x, y, z), size = pick();
      // drifts: thin out randomly so rocks gather in loose clouds rather than an even spray
      if (Math.sin(z * 0.06 + x * 0.05) * Math.cos(y * 0.09 - z * 0.03) < 0.05 + R() * 0.4) continue;
      if (avoid(p, size)) continue; placements.push([p, size]); }
    if (o.belt && false) { /* v40: no belt — the gathered worlds are shown clean */ const B = o.belt; for (let i = 0, tries = 0; i < beltN && tries < beltN * 10; tries++) { const a = R() * Math.PI * 2, rr = B.r0 + (B.r1 - B.r0) * Math.pow(R(), 0.8), y = (R() + R() - 1) * B.h;
        const p = new THREE.Vector3(B.c[0] + Math.cos(a) * rr, B.c[1] + y, B.c[2] + Math.sin(a) * rr * B.squash), size = R() < 0.93 ? 0.03 + R() * 0.14 : 0.22 + R() * 0.3; if (avoid(p, size, true)) continue; placements.push([p, size, true]); i++; } }
    const groups = shapes.map(() => []); placements.forEach((pl, i) => groups[(i % NF) * 2 + (pl[1] >= 0.15 ? 1 : 0)].push(pl)); /* level of detail by size: big rocks are the ones seen close */
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    out.rocks = groups.filter(l => l.length).map((list, k) => { k = groups.indexOf(list);
      const geo = shapes[k].clone(); const spin = new Float32Array(list.length * 4), drift = new Float32Array(list.length * 4);
      const mesh = new THREE.InstancedMesh(geo, rockMat(), list.length); mesh.frustumCulled = false; /* rocks move on the GPU */
      list.forEach(([p, size, belt], i) => { dummy.position.copy(p); dummy.rotation.set(R() * 6.3, R() * 6.3, R() * 6.3); dummy.scale.setScalar(size); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
        const tone = 0.07 + R() * 0.1; col.setRGB(tone * (1.04 + R() * 0.12), tone * (0.97 + R() * 0.06), tone * (0.88 + R() * 0.08)); if (R() < 0.15) col.multiplyScalar(1.6); /* real asteroids are dark: carbon-rich rock, a few brighter stony ones */ if (belt && R() < 0.3) col.offsetHSL(0.02, 0.05, 0.04); mesh.setColorAt(i, col);
        spin.set([R(), R(), R(), (0.05 + R() * 0.3) / Math.sqrt(size + 0.2) * (R() < 0.5 ? -1 : 1)], i * 4);
        const sp = (0.12 + R() * 0.45) / Math.sqrt(size + 0.3), a = R() * Math.PI * 2, e = (R() - 0.5) * 0.8; drift.set([Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp, 0], i * 4); });
      geo.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spin, 4)); geo.setAttribute('aDrift', new THREE.InstancedBufferAttribute(drift, 4));
      mesh.computeBoundingSphere(); scene.add(mesh); out.disposables.push(geo, mesh.material); return mesh; });
    shapes.forEach(g => g.dispose());

    /* ---------- meteors ---------- */
    const metMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
      vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uA; varying vec2 vU; void main(){ float x=vU.x; float y=abs(vU.y-0.5)*2.0;
        float trail=pow(x,2.2)*exp(-y*y*14.0/(0.25+x*x));        // widens and brightens toward the head
        float head=exp(-pow((1.0-x)*26.0,2.0)-y*y*9.0)*1.6;
        vec3 c=mix(vec3(0.45,0.6,1.0),vec3(1.0,0.92,0.78),x*x)+vec3(1.0,0.75,0.45)*head;
        gl_FragColor=vec4(c*(trail+head)*uA,1.0); }` });
    const mets = Array.from({ length: q ? 4 : 2 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), metMat()); m.visible = false; m.frustumCulled = false; scene.add(m); out.disposables.push(m.geometry, m.material); return { m, life: 0, ttl: 0, p: new THREE.Vector3(), d: new THREE.Vector3(), sp: 0, len: 0, w: 0 }; });
    let metSlot = -1; const metH = (k, j) => { const x = Math.sin(k * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); }; /* deterministic: slot k of the clock decides whether a meteor falls and how */
    const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), M4 = new THREE.Matrix4(), tmp = new THREE.Vector3(), fwd = new THREE.Vector3();
    function spawnMeteor(cam, k) {
      const m = mets.find(x => x.life <= 0); if (!m) return; cam.getWorldDirection(fwd); let j = 0; const R = () => metH(k, ++j);
      const right = tmp.crossVectors(fwd, cam.up).normalize(), up = new THREE.Vector3().crossVectors(right, fwd);
      const dist = 70 + R() * 110; m.p.copy(cam.position).addScaledVector(fwd, dist).addScaledVector(right, (R() * 2 - 1) * dist * 0.9).addScaledVector(up, (0.25 + R() * 0.55) * dist * 0.6);
      m.d.copy(right).multiplyScalar(R() < 0.5 ? -1 : 1).addScaledVector(up, -0.35 - R() * 0.5).addScaledVector(fwd, (R() - 0.5) * 0.6).normalize();
      m.sp = 55 + R() * 70; m.len = 9 + R() * 16; m.w = 0.16 + R() * 0.14; m.ttl = 0.9 + R() * 0.9; m.life = m.ttl; m.m.visible = true; }
    function placeMeteor(m, cam) { const head = m.p, tail = tmp.copy(head).addScaledVector(m.d, -m.len), mid = Z.addVectors(head, tail).multiplyScalar(0.5);
      X.copy(m.d); const toCam = Y.subVectors(cam.position, mid).normalize(); const side = new THREE.Vector3().crossVectors(toCam, X).normalize(); const nrm = new THREE.Vector3().crossVectors(X, side);
      M4.makeBasis(X, side, nrm); m.m.quaternion.setFromRotationMatrix(M4); m.m.position.copy(mid); m.m.scale.set(m.len, m.w, 1);
      const k = m.life / m.ttl; m.m.material.uniforms.uA.value = Math.sin(Math.PI * clamp(1 - k, 0, 1)) * 0.9; }

    /* ---------- speed streaks ---------- */
    const SN = [0, 70, 120][q]; let streaks = null;
    if (SN) { const P = new Float32Array(SN * 2 * 3), E = new Float32Array(SN * 2); for (let i = 0; i < SN; i++) { const x = (R() * 2 - 1) * 30, y = (R() * 2 - 1) * 18, z = (R() * 2 - 1) * 40; P.set([x, y, z, x, y, z], i * 6); E[i * 2] = 0; E[i * 2 + 1] = 1; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aEnd', new THREE.BufferAttribute(E, 1));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uCam: { value: new THREE.Vector3() }, uVel: { value: new THREE.Vector3() }, uA: { value: 0 } },
        vertexShader: `attribute float aEnd; uniform vec3 uCam; uniform vec3 uVel; varying float vA; varying float vE;
          void main(){ vec3 box=vec3(60.0,36.0,80.0); vec3 p=mod(position-uCam+box*0.5,box)-box*0.5+uCam; p-=uVel*aEnd*0.035;
            vec4 mv=modelViewMatrix*vec4(p,1.0); float d=-mv.z; vA=smoothstep(2.0,8.0,d)*(1.0-smoothstep(26.0,40.0,d)); vE=aEnd; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: 'uniform float uA; varying float vA; varying float vE; void main(){ gl_FragColor=vec4(vec3(0.75,0.85,1.0)*uA*vA*(1.0-vE*0.85),1.0); }' });
      streaks = new THREE.LineSegments(g, m); streaks.frustumCulled = false; scene.add(streaks); out.disposables.push(g, m); }

    /* ---------- lens flare ---------- */
    const flareTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
    const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 40, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    out.disposables.push(flareTex, ringTex);
    const ghosts = [[0.35, 0.05, 0xffe2b8, flareTex], [0.62, 0.09, 0x9fb8ff, ringTex], [1.15, 0.035, 0xb4ffe4, flareTex], [1.45, 0.14, 0xffb48a, ringTex], [1.8, 0.05, 0xc6a8ff, flareTex]].map(([k, sz, c, map]) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: c, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 })); sp.renderOrder = 50; scene.add(sp); out.disposables.push(sp.material); return { sp, k, sz }; });
    const sunNdc = new THREE.Vector3();

    out.setSightLine = (a, b, r) => { uSeg0.value.copy(a); uSeg1.value.copy(b); uSegR.value = r; };
    out.setObstacles = list => { const O = uObs.value; for (let i = 0; i < 16; i++) { const ob = list[i]; if (ob) O[i].set(ob.p.x, ob.p.y, ob.p.z, ob.r); else O[i].set(0, 0, 0, 0); } };
    out.update = (cam, t, dt, vel, sunDir, still, occluders) => {
      uT.value = still ? uT.value : t;
      // meteors
      if (!still && mets.length) { const k = Math.floor(t / 3.1); if (k !== metSlot) { metSlot = k; if (metH(k, 0) < 0.42) spawnMeteor(cam, k); } }
      mets.forEach(m => { if (m.life <= 0) return; m.life -= dt; m.p.addScaledVector(m.d, m.sp * dt); if (m.life <= 0) { m.m.visible = false; return; } placeMeteor(m, cam); });
      // streaks: only while the camera really moves
      if (streaks) { const sp = vel.length(); streaks.material.uniforms.uCam.value.copy(cam.position); streaks.material.uniforms.uVel.value.copy(vel); const a = still ? 0 : clamp((sp - 10) / 40, 0, 1) * 0.22; streaks.material.uniforms.uA.value += (a - streaks.material.uniforms.uA.value) * (1 - Math.exp(-dt * 5)); streaks.visible = streaks.material.uniforms.uA.value > 0.005; }
      // lens flare: the sun's position on screen; fades as the sun nears the edge or goes behind a world
      sunNdc.copy(cam.position).addScaledVector(sunDir, 1000).project(cam);
      let vis = sunNdc.z < 1 ? clamp(1 - Math.max(Math.abs(sunNdc.x), Math.abs(sunNdc.y)) * 0.9, 0, 1) : 0;
      if (vis > 0 && occluders) for (const oc of occluders) { tmp.subVectors(oc.p, cam.position); const along = tmp.dot(sunDir); if (along > 0) { const d2 = tmp.lengthSq() - along * along; if (d2 < oc.r * oc.r) { vis = 0; break; } } }
      cam.getWorldDirection(fwd); const right = X.crossVectors(fwd, cam.up).normalize(), up = Y.crossVectors(right, fwd), th = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), D = 10;
      ghosts.forEach(gh => { const nx = sunNdc.x * (1 - gh.k * 2) , ny = sunNdc.y * (1 - gh.k * 2); // mirrored through the centre
        gh.sp.position.copy(cam.position).addScaledVector(fwd, D).addScaledVector(right, nx * D * th * cam.aspect).addScaledVector(up, ny * D * th); gh.sp.scale.setScalar(gh.sz * D); gh.sp.material.opacity += (vis * 0.32 - gh.sp.material.opacity) * (1 - Math.exp(-dt * 6)); gh.sp.visible = gh.sp.material.opacity > 0.004; });
    };
    out.dispose = () => { out.rocks.forEach(m => scene.remove(m)); mets.forEach(m => scene.remove(m.m)); if (streaks) scene.remove(streaks); ghosts.forEach(g => scene.remove(g.sp)); out.disposables.forEach(d => d && d.dispose && d.dispose()); };
    return out;
  };
})();
