/* ERLY Learning Studio — SIGNATURE 3D SCENES (loaded on demand by ls-scrolly.js when a section nears the viewport).

   Every scene is a pure function of the scroll progress p (LS.scrolly), so it is fully reversible and can never be
   left half-way. The student can drag to rotate at any time (OrbitControls); the scripted camera approach stops as soon
   as they do and returns on Reset. Geometry and data:
     cell      a palisade leaf cell; parts and texts from LS.content.cellParts (same as the Inside-a-plant-cell experience).
               Parts move apart along their own direction from the centre, so relative positions are preserved.
     molecule  measured geometries: CH₄ C–H 108.7 pm, 109.47° (tetrahedral); NH₃ N–H 101.2 pm, H–N–H 106.7°;
               H₂O O–H 95.8 pm, H–O–H 104.5°. 1 scene unit = 100 pm. Lone-pair lobes are schematic.
     solid     nets built from a hinge tree: each face turns about its shared edge by the true dihedral supplement
               (cube 90°; square pyramid with equilateral sides 180° − arctan √2 = 125.26°). Matching edges are found
               by comparing the folded positions — nothing is hand-placed.
     earth     radii from LS.content.earthLayers at true scale (1 unit = 1,000 km). */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc, K = LS.sgK, PI = Math.PI, TAU = 2 * PI;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');

  function base(sec, o, build) {
    const view = sec.querySelector('.sg-view'), note = sec.querySelector('.sg-note'); let S = null, M = null, sc = null, dead = false, user = false;
    const ready = LS.scene3d(view, Object.assign({ cls: 'sg-3d', bg: 0x0b1020, fog: null, shadows: false, height: w => Math.round(Math.min(innerHeight * 0.6, w * 0.78, 620)), minDist: 1, maxDist: 60, label: o.label }, o.scene)).then(s => { if (dead || !sec.isConnected) { s.destroy(); return; } S = s; S.scene.add(new S.THREE.AmbientLight(0xffffff, 0.25));
      S.controls.addEventListener('start', () => { user = true; }); M = build(S); sc = LS.scrolly(sec, p => { M.update(p); if (!user && M.cam) { const c = M.cam(p); S.camera.position.set(...c[0]); S.controls.target.set(...c[1]); S.controls.update(); } S.render(); }); M.update(0); S.render();
      if (M.pick) S.cv.addEventListener('click', e => { const h = S.pick(e, M.pickables()); M.pick(h && h.object); S.render(); });
      sec.addEventListener('sg-reset', () => { user = false; if (M.pick) M.pick(null); if (M.cam) { const c = M.cam(0); S.fly(c[0], c[1], reduced() ? 0 : 700); } S.render(); }); });
    ready.catch(() => { note.hidden = false; note.textContent = T('3D is not available here — the text explains every stage.', 'ثلاثي الأبعاد غير متاح.'); });
    const api = { destroy() { dead = true; if (sc) sc.destroy(); if (S) S.destroy(); }, _S: () => S, _sc: () => sc, _M: () => M, note }; sec._sg = api; return api;
  }
  const mat = (THREE, color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.45, metalness: 0.05, clearcoat: 0.3 }, o));
  const fade = (m, a) => { m.transparent = true; m.opacity = a; m.depthWrite = a > 0.95; };
  const say = (note, html) => { if (!html) { note.hidden = true; return; } note.hidden = false; note.innerHTML = html; };

  /* =============================== CELL =============================== */
  function cell(sec) { const CP = LS.content.cellParts;
    const api = base(sec, { label: T('Plant cell model', 'نموذج خلية نباتية'), scene: { cam: [0, 1.4, 9], target: [0, 0, 0] } }, S => { const THREE = S.THREE, g = new THREE.Group(); S.scene.add(g);
      const key = new THREE.DirectionalLight(0xfff3e0, 1.5); key.position.set(4, 6, 5); S.scene.add(key);
      const A = 1.7, Bh = 0.85, C = 0.85; // half-extents of the cell (a long palisade cell)
      const parts = []; const add = (m, part, layer, home) => { m.userData = { part, layer, home: home.clone(), dir: home.clone().length() > 1e-6 ? home.clone().normalize() : new THREE.Vector3() }; g.add(m); parts.push(m); return m; };
      // wall and membrane as six panels each, so they can open outwards along their normals
      const panels = (ext, th, m, part, layer) => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(n => { const sx = n[0] ? th : ext[0] * 2, sy = n[1] ? th : ext[1] * 2, sz = n[2] ? th : ext[2] * 2;
        const p = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); const h = new THREE.Vector3(n[0] * ext[0], n[1] * ext[1], n[2] * ext[2]); p.position.copy(h); add(p, part, layer, h); p.userData.n = new THREE.Vector3(...n); return p; });
      const wallM = mat(THREE, 0x7cc46a, { roughness: 0.6, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }), memM = mat(THREE, 0xe8e2b6, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, roughness: 0.3 });
      const wall = panels([A + 0.08, Bh + 0.08, C + 0.08], 0.07, wallM, 'wall', 1), mem = panels([A, Bh, C], 0.02, memM, 'membrane', 2);
      const cyt = new THREE.Mesh(new THREE.BoxGeometry(A * 2 - 0.04, Bh * 2 - 0.04, C * 2 - 0.04), mat(THREE, 0xd9eec8, { transparent: true, opacity: 0.08, depthWrite: false })); add(cyt, 'cyto', 2, new THREE.Vector3());
      const vac = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat(THREE, 0x8fc3e8, { transparent: true, opacity: 0.38, roughness: 0.1, clearcoat: 1, depthWrite: false })); vac.scale.set(1.15, 0.55, 0.55); add(vac, 'vacuole', 3, new THREE.Vector3(0.25, 0, 0));
      const nuc = new THREE.Group(); const env = new THREE.Mesh(new THREE.SphereGeometry(0.34, 40, 28), mat(THREE, 0x9a7bd0, { transparent: true, opacity: 0.55, depthWrite: false })); const nl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), mat(THREE, 0x55308f)); nl.position.set(0.06, 0.04, 0); nuc.add(env, nl); add(nuc, 'nucleus', 4, new THREE.Vector3(-1.15, 0.35, 0.3));
      const chlM = mat(THREE, 0x2f9e44, { roughness: 0.4 }), granM = mat(THREE, 0x16602a); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 16; i++) { const ch = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), chlM); body.scale.set(0.2, 0.08, 0.1); ch.add(body); for (let j = -1; j <= 1; j++) { const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), granM); gr.position.x = j * 0.09; ch.add(gr); }
        const side = i % 4, u = (Math.floor(i / 4) + 0.5) / 4 * 2 - 1, h = side < 2 ? new THREE.Vector3(u * (A - 0.25), (side ? -1 : 1) * (Bh - 0.14), (rnd() - 0.5) * 0.9) : new THREE.Vector3(u * (A - 0.25), (rnd() - 0.5) * 0.9, (side === 2 ? -1 : 1) * (C - 0.14)); ch.position.copy(h); ch.rotation.set(0, rnd() * PI, side < 2 ? 0 : PI / 2); add(ch, 'chloro', 5, h); }
      const mitM = mat(THREE, 0xe8843a, { roughness: 0.35 }); for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.14, 6, 12), mitM); const h = new THREE.Vector3((rnd() * 2 - 1) * (A - 0.35), (rnd() * 2 - 1) * (Bh - 0.3), (rnd() * 2 - 1) * (C - 0.3)); if (Math.abs(h.y) < 0.3 && Math.abs(h.z) < 0.3) h.z += 0.45; m.position.copy(h); m.rotation.set(rnd() * PI, rnd() * PI, 0); add(m, 'mito', 5, h); }
      const ribo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 6, 4), mat(THREE, 0x6a3c8c), 260), rh = [], o3 = new THREE.Object3D(); for (let i = 0; i < 260; i++) rh.push(new THREE.Vector3((rnd() * 2 - 1) * (A - 0.1), (rnd() * 2 - 1) * (Bh - 0.1), (rnd() * 2 - 1) * (C - 0.1))); g.add(ribo); ribo.userData = { part: 'ribo', layer: 5 };
      const labels = {}; [['wall', 1, [-A - 0.4, Bh + 1.2, -0.8]], ['membrane', 2, [A - 0.2, 1.25, 0.9]], ['vacuole', 3, [0.9, 2.0, 0]], ['nucleus', 4, [-1.5, 1.4, 0.9]], ['chloro', 5, [1.6, 1.5, 1.2]], ['mito', 5, [-1.6, -1.4, 1.1]], ['ribo', 5, [0.4, -1.7, 0.9]]].forEach(([k, st, pos]) => { const l = LS.label3d(THREE, CP[k][0], { h: 0.22, depthTest: false }); l.position.set(...pos); l.userData = { st }; S.scene.add(l); labels[k] = l; });
      let sel = null, last = 0; const hiMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.25 });
      const glow = (m, on) => m.traverse(x => { if (x.material && x.material.emissive && (on || !x.userData.lit)) { x.material.emissive.set(on ? 0x3a3a3a : 0x000000); x.material.userData.lit = on; } });
      return { cam: p => { const k = K(p, 0, 0, 1); return [[0 + 3.4 * k, 1.4 + 1.2 * k, 9 - 3.4 * k], [0, 0, 0]]; },
        pickables: () => parts.filter(m => m.visible && m.userData.part !== 'cyto'),
        pick(ob) { while (ob && !(ob.userData && ob.userData.part)) ob = ob.parent; const k = ob ? ob.userData.part : null; parts.forEach(m => glow(m, false)); parts.forEach(m => { if (m.userData.part === k) glow(m, true); }); sel = k; const q = k && CP[k]; say(api.note, q ? `<b>${esc(q[0])}</b>${q[2] ? ` <span class="ls-tag">${T('plant cells', 'الخلايا النباتية')}</span>` : ''} — ${LS.inline ? LS.inline(q[1]) : esc(q[1])}` : ''); },
        update(p) { last = p; const kW = K(p, 1, -0.4, 0.5), kM = K(p, 2, -0.4, 0.5), kV = K(p, 3, -0.4, 0.5), kN = K(p, 4, -0.4, 0.5), kO = K(p, 5, -0.4, 0.6);
          wall.forEach(w => { w.position.copy(w.userData.home).addScaledVector(w.userData.n, 2.4 * kW); }); wallM.opacity = 0.32 - 0.26 * kW;
          mem.forEach(w => { w.position.copy(w.userData.home).addScaledVector(w.userData.n, 0.9 * kM); }); memM.opacity = 0.22 - 0.17 * kM;
          vac.position.copy(vac.userData.home).add(new THREE.Vector3(0, 1.25 * kV, -0.2 * kV)); nuc.position.copy(nuc.userData.home).add(new THREE.Vector3(-0.35 * kN, 0.25 * kN, 0.9 * kN)); nuc.scale.setScalar(1 + 0.25 * kN);
          parts.forEach(m => { if (m.userData.layer !== 5) return; const sp = m.userData.part === 'chloro' ? 1.2 : 0.55, dy = m.userData.part === 'mito' ? -0.55 : 0; m.position.copy(m.userData.home).multiplyScalar(1 + sp * kO * 0.6).add(new THREE.Vector3(0, dy * kO, 0)); });
          rh.forEach((h, i) => { o3.position.copy(h).multiplyScalar(1 + 0.25 * kO).add(new THREE.Vector3(0, -0.9 * kO, 0)); o3.updateMatrix(); ribo.setMatrixAt(i, o3.matrix); }); ribo.instanceMatrix.needsUpdate = true;
          Object.values(labels).forEach(l => { const a = K(p, l.userData.st, -0.35, 0.15); l.material.opacity = a; l.visible = a > 0.02; });
          void hiMat; } }; });
    return api; }

  /* =============================== MOLECULE =============================== */
  const EL = { H: [0xf2f2f2, 0.22, 'hydrogen'], C: [0x3a3d44, 0.34, 'carbon'], N: [0x3b63e0, 0.33, 'nitrogen'], O: [0xe0382f, 0.32, 'oxygen'] };
  function molData(k) { const d = (a, L) => a.map(v => { const n = Math.hypot(...v); return v.map(x => x / n * L); });
    if (k === 'ch4') return { c: 'C', bonds: d([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], 1.087), ang: 109.47, lp: [], shape: T('tetrahedral', 'رباعي الأوجه'), name: 'CH₄', pm: 108.7 };
    if (k === 'nh3') { const th = 106.7 * PI / 180, s2 = (1 - Math.cos(th)) / 1.5, al = Math.asin(Math.sqrt(s2)); return { c: 'N', bonds: d([0, 1, 2].map(i => [Math.sin(al) * Math.cos(i * TAU / 3), -Math.cos(al), Math.sin(al) * Math.sin(i * TAU / 3)]), 1.012), ang: 106.7, lp: [[0, 1, 0]], shape: T('trigonal pyramidal', 'هرمي ثلاثي'), name: 'NH₃', pm: 101.2 }; }
    const h = 104.5 * PI / 360; return { c: 'O', bonds: d([[Math.sin(h), -Math.cos(h), 0], [-Math.sin(h), -Math.cos(h), 0]], 0.958), ang: 104.5, lp: [[0, 0.58, 0.82], [0, 0.58, -0.82]], shape: T('bent', 'منحني'), name: 'H₂O', pm: 95.8 }; }
  function molecule(sec) { let kind = 'ch4', rebuild = null;
    const api = base(sec, { label: T('Molecule model', 'نموذج جزيء'), scene: { cam: [0, 0.6, 5.2], target: [0, -0.1, 0], minDist: 2, maxDist: 12 } }, S => { const THREE = S.THREE, g = new THREE.Group(); S.scene.add(g); const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 4); S.scene.add(key);
      let atoms = [], bonds = [], lps = [], arc = null, lab = [], D = null, p0 = 0;
      rebuild = () => { while (g.children.length) { const c0 = g.children.pop(); c0.traverse(x => { x.geometry && x.geometry.dispose(); x.material && x.material.map && x.material.map.dispose(); x.material && x.material.dispose && x.material.dispose(); }); } D = molData(kind); atoms = []; bonds = []; lps = []; lab = [];
        const at = (e, pos) => { const [col, r] = EL[e], m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), mat(THREE, col, { roughness: 0.25, clearcoat: 1, metalness: 0.0 })); m.userData = { home: new THREE.Vector3(...pos), e }; g.add(m); atoms.push(m); const l = LS.label3d(THREE, e, { h: 0.2, depthTest: false }); l.userData = { a: m }; g.add(l); lab.push(l); return m; };
        at(D.c, [0, 0, 0]); D.bonds.forEach(b => at('H', b));
        D.bonds.forEach((b, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 16), mat(THREE, 0xbfc6d2, { metalness: 0.3, roughness: 0.3 })); m.userData = { i, dir: new THREE.Vector3(...b).normalize(), L: Math.hypot(...b) }; g.add(m); bonds.push(m); const l = LS.label3d(THREE, D.pm + ' pm', { h: 0.15, color: '#cfe0ff', depthTest: false }); l.userData = { bond: m }; g.add(l); lab.push(l); });
        D.lp.forEach(v => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false, roughness: 0.4 })); const dir = new THREE.Vector3(...v).normalize(); m.scale.set(0.2, 0.42, 0.2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); m.position.copy(dir).multiplyScalar(0.5); g.add(m); lps.push(m); });
        const a = new THREE.Vector3(...D.bonds[0]).normalize(), b = new THREE.Vector3(...D.bonds[1]).normalize(), pts = []; for (let i = 0; i <= 32; i++) pts.push(a.clone().lerp(b, i / 32).normalize().multiplyScalar(0.5)); arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true })); g.add(arc);
        const al = LS.label3d(THREE, D.ang.toFixed(1) + '°', { h: 0.2, color: '#ffd27a', depthTest: false }); al.position.copy(a.clone().add(b).normalize().multiplyScalar(0.8)); al.userData = { ang: true }; g.add(al); lab.push(al); upd(p0); };
      function upd(p) { p0 = p; const kOut = K(p, 0, 0.2, 1) * (1 - K(p, 1, 0.35, 1.25)), kB = i => (p < 1 ? 1 - K(p, 0, 0.1, 0.6) : K(p, 1, 0.45 + i * 0.18, 0.75 + i * 0.18)), kA = K(p, 2, 0.3, 0.9);
        atoms.forEach(m => m.position.copy(m.userData.home).multiplyScalar(1 + 1.4 * kOut));
        bonds.forEach(m => { const s = kB(m.userData.i), L = m.userData.L * (1 + 1.4 * kOut), len = Math.max(0.0001, L * s); m.visible = s > 0.01; m.scale.set(1, len, 1); m.position.copy(m.userData.dir).multiplyScalar(len / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), m.userData.dir); });
        lps.forEach(m => { m.material.opacity = 0.35 * kA; m.visible = kA > 0.01; }); arc.material.opacity = kA; arc.visible = kA > 0.01;
        lab.forEach(l => { let a = 0; if (l.userData.a) { a = K(p, 0, 0.4, 1) * (1 - K(p, 2, 0.6, 1.0)); l.position.copy(l.userData.a.position).add(new THREE.Vector3(0, 0.36, 0)); } else if (l.userData.bond) { const b = l.userData.bond; a = (p > 1.4 ? kB(b.userData.i) : 0) * (1 - K(p, 3, 0, 0.5)); l.position.copy(b.userData.dir).multiplyScalar(b.userData.L * 0.55).add(new THREE.Vector3(0.12, 0.1, 0)); } else if (l.userData.ang) a = kA; l.material.opacity = a; l.visible = a > 0.02; });
        say(api.note, p > 2.5 ? `<b>${D.name}</b>: ${D.shape}, ${T('bond angle', 'زاوية الرابطة')} ${D.ang.toFixed(1)}°, ${T('bond length', 'طول الرابطة')} ${D.pm} pm${D.lp.length ? ' · ' + D.lp.length + ' ' + T(D.lp.length > 1 ? 'lone pairs' : 'lone pair', 'أزواج حرة') : ''}` : ''); }
      rebuild(); return { update: upd, cam: p => [[0 + 0.8 * K(p, 0, 0, 1), 0.6 + 0.6 * K(p, 2, 0, 1), 5.2 + 1.6 * K(p, 0, 0, 1) - 1.6 * K(p, 2, 0, 1)], [0, -0.1, 0]] }; });
    sec.querySelectorAll('[data-mol]').forEach(b => b.addEventListener('click', () => { kind = b.dataset.mol; sec.querySelectorAll('[data-mol]').forEach(x => x.setAttribute('aria-checked', String(x === b))); if (rebuild) { rebuild(); const S = api._S(); S && S.render(); } }));
    api._kind = () => kind; return api; }

  /* =============================== SOLID → NET =============================== */
  // face: { pts: [[x,z]...] flat in the net, parent, hinge: [[x,z],[x,z]], angle (radians to fold), order }
  const SOLIDS = {
    cube: { col: [0x5b8def, 0xf2a541, 0x4fbf8f, 0xe06c75, 0xa78bfa, 0x56c2d6], faces: [{ pts: [[0, 0], [1, 0], [1, 1], [0, 1]] }, { pts: [[0, 1], [1, 1], [1, 2], [0, 2]], parent: 0, hinge: [[0, 1], [1, 1]], ang: PI / 2, ord: 1 }, { pts: [[0, 2], [1, 2], [1, 3], [0, 3]], parent: 1, hinge: [[0, 2], [1, 2]], ang: PI / 2, ord: 0 }, { pts: [[0, -1], [1, -1], [1, 0], [0, 0]], parent: 0, hinge: [[0, 0], [1, 0]], ang: PI / 2, ord: 2 }, { pts: [[-1, 0], [0, 0], [0, 1], [-1, 1]], parent: 0, hinge: [[0, 0], [0, 1]], ang: PI / 2, ord: 3 }, { pts: [[1, 0], [2, 0], [2, 1], [1, 1]], parent: 0, hinge: [[1, 0], [1, 1]], ang: PI / 2, ord: 4 }] },
    pyr: (() => { const h = Math.sqrt(3) / 2, a = PI - Math.atan(Math.SQRT2); return { col: [0x5b8def, 0xf2a541, 0x4fbf8f, 0xe06c75, 0xa78bfa], faces: [{ pts: [[0, 0], [1, 0], [1, 1], [0, 1]] }, { pts: [[0, 1], [1, 1], [0.5, 1 + h]], parent: 0, hinge: [[0, 1], [1, 1]], ang: a, ord: 0 }, { pts: [[0, 0], [1, 0], [0.5, -h]], parent: 0, hinge: [[0, 0], [1, 0]], ang: a, ord: 1 }, { pts: [[0, 0], [0, 1], [-h, 0.5]], parent: 0, hinge: [[0, 0], [0, 1]], ang: a, ord: 2 }, { pts: [[1, 0], [1, 1], [1 + h, 0.5]], parent: 0, hinge: [[1, 0], [1, 1]], ang: a, ord: 3 }] }; })()
  };
  function solid(sec) { let kind = 'cube', rebuild = null;
    const api = base(sec, { label: T('Solid and its net', 'المجسم وشبكته'), scene: { cam: [3.2, 3.4, 4.2], target: [0, 0.3, 0], minDist: 2, maxDist: 16 } }, S => { const THREE = S.THREE, root = new THREE.Group(); S.scene.add(root); const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 6, 4); S.scene.add(key);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0x141b2e, roughness: 0.9 })); floor.rotation.x = -PI / 2; floor.position.y = -0.01; S.scene.add(floor);
      let F = [], marks = [], cF = null, cN = null, p0 = 0;
      rebuild = () => { root.position.set(0, 0, 0); while (root.children.length) { const c0 = root.children.pop(); c0.traverse(x => { x.geometry && x.geometry.dispose(); x.material && x.material.dispose && x.material.dispose(); }); } const D = SOLIDS[kind]; F = []; marks = [];
        D.faces.forEach((fc, i) => { const sh = new THREE.Shape(fc.pts.map(([x, z]) => new THREE.Vector2(x, z))); const gm = new THREE.ShapeGeometry(sh); gm.rotateX(PI / 2); // (x, y) → (x, 0, y)
          const piv = new THREE.Group(), mesh = new THREE.Mesh(gm, new THREE.MeshPhysicalMaterial({ color: D.col[i], roughness: 0.4, clearcoat: 0.6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(gm), new THREE.LineBasicMaterial({ color: 0x0b1020 })); mesh.add(edges);
          let hp = new THREE.Vector3(), axis = new THREE.Vector3(1, 0, 0);
          if (fc.hinge) { const [a, b] = fc.hinge, A = new THREE.Vector3(a[0], 0, a[1]), Bv = new THREE.Vector3(b[0], 0, b[1]); hp = A.clone().add(Bv).multiplyScalar(0.5); const c = fc.pts.reduce((s, [x, z]) => s.add(new THREE.Vector3(x, 0, z)), new THREE.Vector3()).multiplyScalar(1 / fc.pts.length), e = Bv.clone().sub(A).normalize(), toF = c.clone().sub(hp); const n = toF.sub(e.clone().multiplyScalar(toF.dot(e))).normalize(); axis = n.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(); }
          const parent = fc.parent == null ? root : F[fc.parent].piv, pHp = fc.parent == null ? new THREE.Vector3() : F[fc.parent].hp; piv.position.copy(hp).sub(pHp); mesh.position.copy(hp).multiplyScalar(-1); piv.add(mesh); parent.add(piv); F.push({ fc, piv, mesh, hp, axis }); });
        const setF = f => F.forEach(x => { if (x.fc.hinge) x.piv.quaternion.setFromAxisAngle(x.axis, x.fc.ang * f(x)); });
        // centres of the folded solid and of the flat net, to keep the object centred while it changes
        setF(() => 1); root.updateMatrixWorld(true); cF = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3()); setF(() => 0); root.updateMatrixWorld(true); cN = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
        // matching edges: compare every face edge in the folded state; pairs that coincide there but not in the net are glued edges
        setF(() => 1); root.updateMatrixWorld(true); const E = []; F.forEach((x, fi) => { const P = x.fc.pts; P.forEach((a, j) => { const b = P[(j + 1) % P.length], la = new THREE.Vector3(a[0], 0, a[1]), lb = new THREE.Vector3(b[0], 0, b[1]); E.push({ fi, la, lb, wa: x.mesh.localToWorld(la.clone()), wb: x.mesh.localToWorld(lb.clone()), na: la, nb: lb }); }); });
        const same = (p, q, r, s) => (p.distanceTo(r) < 1e-4 && q.distanceTo(s) < 1e-4) || (p.distanceTo(s) < 1e-4 && q.distanceTo(r) < 1e-4); const PAL = [0xffffff, 0xffd27a, 0xff6fae, 0x6ff3ff, 0xb7f36f, 0xff9b5c, 0xc6a8ff]; let ci = 0;
        for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) { const a = E[i], b = E[j]; if (a.fi === b.fi || !same(a.wa, a.wb, b.wa, b.wb) || same(a.na, a.nb, b.na, b.nb)) continue; const col = PAL[ci++ % PAL.length];
          [a, b].forEach(x => { const gm = new THREE.BufferGeometry().setFromPoints([x.la.clone().add(new THREE.Vector3(0, 0.004, 0)), x.lb.clone().add(new THREE.Vector3(0, 0.004, 0))]), ln = new THREE.Line(gm, new THREE.LineBasicMaterial({ color: col, transparent: true, linewidth: 2 })); const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, x.la.distanceTo(x.lb), 8), new THREE.MeshBasicMaterial({ color: col, transparent: true })); tube.position.copy(x.la).add(x.lb).multiplyScalar(0.5); tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), x.lb.clone().sub(x.la).normalize()); F[x.fi].mesh.add(ln, tube); marks.push(ln, tube); }); }
        api._pairs = ci; upd(p0); };
      function upd(p) { p0 = p; const n = F.length - 1, unfold = x => { if (!x.fc.hinge) return 0; const o = x.fc.ord; return o === 0 ? K(p, 1, -0.2, 0.8) : K(p, 2, -0.3 + (o - 1) * 0.18, 0.5 + (o - 1) * 0.18); };
        F.forEach(x => { if (x.fc.hinge) x.piv.quaternion.setFromAxisAngle(x.axis, x.fc.ang * (1 - Math.max(unfold(x), K(p, 3, -0.6, 0)))); });
        const u = K(p, 1, -0.2, 2.2); root.position.copy(cF.clone().lerp(cN, u)).multiplyScalar(-1); root.position.y = 0;
        const km = K(p, 4, -0.5, 0.3); marks.forEach(m => { m.material.opacity = km; m.visible = km > 0.02; }); void n;
        say(api.note, p > 3.6 ? T(`${api._pairs} pairs of edges are glued when it folds (same colours). Faces: ${F.length}.`, `${api._pairs} أزواج من الحواف تلتصق.`) : ''); }
      rebuild(); return { update: upd, cam: p => { const k = K(p, 1, 0, 2.4); return [[3.2 - 3.2 * k, 3.4 + 2.2 * k, 4.2 - 1.8 * k + 0.01], [0, 0.3 - 0.3 * k, 0]]; } }; });
    sec.querySelectorAll('[data-solid]').forEach(b => b.addEventListener('click', () => { kind = b.dataset.solid; sec.querySelectorAll('[data-solid]').forEach(x => x.setAttribute('aria-checked', String(x === b))); if (rebuild) { rebuild(); const S = api._S(); S && S.render(); } }));
    api._kind = () => kind; return api; }

  /* =============================== EARTH =============================== */
  function earth(sec) { const LAY = LS.content.earthLayers, R0 = 6.371;
    return base(sec, { label: T('Earth cutaway', 'مقطع الأرض'), scene: { bg: 0x05070f, cam: [0, 2.5, 26], target: [0, 0, 0], minDist: 8, maxDist: 60 } }, S => { const THREE = S.THREE, g = new THREE.Group(); S.scene.add(g); const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(-10, 8, 14); S.scene.add(sun);
      const sp = new Float32Array(3 * 1200); for (let i = 0; i < 1200; i++) { const u = Math.random() * 2 - 1, a = Math.random() * TAU, r = 200; sp[i * 3] = r * Math.sqrt(1 - u * u) * Math.cos(a); sp[i * 3 + 1] = r * u; sp[i * 3 + 2] = r * Math.sqrt(1 - u * u) * Math.sin(a); } const sg0 = new THREE.BufferGeometry(); sg0.setAttribute('position', new THREE.BufferAttribute(sp, 3)); S.scene.add(new THREE.Points(sg0, new THREE.PointsMaterial({ color: 0xcfdcff, size: 1, sizeAttenuation: false })));
      const cv = document.createElement('canvas'); cv.width = 384; cv.height = 192; const gx = cv.getContext('2d'), img = gx.createImageData(384, 192); for (let y = 0; y < 192; y++) for (let x = 0; x < 384; x++) { const lo = x / 384 * TAU, la = (y / 192 - 0.5) * PI, px = Math.cos(la) * Math.cos(lo), py = Math.sin(la), pz = Math.cos(la) * Math.sin(lo), n = (LS.fbm(px * 1.8 + 10, py * 1.8, 3, 4) + LS.fbm(pz * 1.8, py * 1.8 + 5, 4, 4) + LS.fbm(px * 1.8, pz * 1.8 + 20, 5, 4)) / 3 + 0.04, lat = Math.abs(y / 192 - 0.5) * 2, c = lat > 0.86 ? [235, 240, 248] : n > 0.53 ? (n > 0.62 ? [130, 116, 84] : [72, 122, 62]) : [22, 64 + n * 60, 132 + n * 70], i = (y * 384 + x) * 4; img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255; } gx.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const surfM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
      const radii = LAY.map(l => (6371 - l[0]) / 1000), inner = LAY.map(l => (6371 - l[1]) / 1000), cols = LAY.map(l => new THREE.Color(l[5]));
      const W = PI / 2, dir = phi => new THREE.Vector3(-Math.cos(phi), 0, Math.sin(phi));
      const face = (ri, ro, phi, m) => { const d = dir(phi), pos = [], idx = [], N = 48; for (let i = 0; i <= N; i++) { const th = i / N * PI; for (const r of [ri, ro]) pos.push(r * Math.sin(th) * d.x, r * Math.cos(th), r * Math.sin(th) * d.z); } for (let i = 0; i < N; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gm.setIndex(idx); gm.computeVertexNormals(); return new THREE.Mesh(gm, m); };
      const lm = cols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, side: THREE.DoubleSide, emissive: c, emissiveIntensity: 0.12 }));
      // the planet minus a quarter wedge (azimuth 0 → 90°)
      const body = new THREE.Group(); g.add(body); body.add(new THREE.Mesh(new THREE.SphereGeometry(R0, 96, 64, W, TAU - W), surfM)); LAY.forEach((l, i) => { body.add(face(inner[i], radii[i], 0, lm[i]), face(inner[i], radii[i], W, lm[i])); });
      // the slice, one piece per layer, so the layers can separate
      const slice = new THREE.Group(); g.add(slice); const pieces = LAY.map((l, i) => { const pc = new THREE.Group(); pc.add(new THREE.Mesh(new THREE.SphereGeometry(radii[i], 48, 32, 0, W), i === 0 ? surfM : lm[i])); if (i > 0) { /* outer face shows the layer's colour */ } if (inner[i] > 0.01) pc.add(new THREE.Mesh(new THREE.SphereGeometry(inner[i], 48, 32, 0, W), lm[i])); pc.add(face(inner[i], radii[i], 0, lm[i]), face(inner[i], radii[i], W, lm[i])); slice.add(pc); return pc; });
      const bis = dir(W / 2); const labels = LAY.map((l, i) => { const lb = LS.label3d(THREE, l[2], { h: 0.85, depthTest: false }); S.scene.add(lb); return lb; });
      const steps = [3, 4, 4, 5, 5]; // which text stage highlights each layer
      const side = bis.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 1.25);
      return { cam: p => { const k = K(p, 0, 0.2, 1.4), tg = bis.clone().multiplyScalar(3.6 * k), c = new THREE.Vector3(0, 2.5, 26).lerp(side.clone().multiplyScalar(31).add(new THREE.Vector3(0, 7, 0)).add(tg), k); return [c.toArray(), tg.toArray()]; },
        update(p) { const kS = K(p, 1, -0.4, 0.6), kL = K(p, 2, -0.4, 0.6); slice.position.copy(bis).multiplyScalar(4.5 * kS);
          pieces.forEach((pc, i) => pc.position.copy(bis).multiplyScalar(kL * (LAY.length - 1 - i) * 1.25));
          LAY.forEach((l, i) => { const hi = Math.round(p) === steps[i] || (Math.round(p) === 5 && i >= 3) || (Math.round(p) === 4 && (i === 1 || i === 2)); lm[i].emissiveIntensity = hi && p > 2.6 ? 0.55 : 0.12; const mid = (radii[i] + inner[i]) / 2, pos = pc0(i).add(bis.clone().multiplyScalar(0.001)); const a = K(p, 2, 0.1, 0.6); labels[i].position.copy(slice.position).add(pieces[i].position).add(bis.clone().multiplyScalar(radii[i] + 0.3)).add(new THREE.Vector3(0, 0.9 + (i % 2) * 0.7, 0)); labels[i].material.opacity = a; labels[i].visible = a > 0.02; void mid; }); } };
      function pc0(i) { return slice.position.clone().add(pieces[i].position).add(bis.clone().multiplyScalar((radii[i] + inner[i]) / 2 * 0.72)); } });
  }

  LS.sig = { mount(kind, sec) { return kind === 'cell' ? cell(sec) : kind === 'molecule' ? molecule(sec) : kind === 'solid' ? solid(sec) : earth(sec); }, SOLIDS, molData };
})();
