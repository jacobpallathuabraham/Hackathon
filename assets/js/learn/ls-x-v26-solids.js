/* ERLY Learning Studio v26 — 3D solids and their nets (three.js, loaded only when this experience opens).

   Polyhedra are built as a NET: flat faces joined by hinge edges in a tree. Folding rotates every face about its
   hinge by t × (its fold angle) and composes the rotations down the tree, so the same faces you see flat close up
   into the solid. Fold angles: 90° for boxes; 120° between the rectangles of an equilateral triangular prism;
   180° − α for a pyramid's sides, where α = atan(h / (a/2)) is the angle between a side face and the base.
   Cylinder and cone are curved: the cylinder's side is a rectangle 2πr wide that is bent with curvature t / r; the
   cone's side is a sector of radius l (the slant height) whose rolling is a family of cones with sin β = 1 / s,
   s going from 1 (flat) to l / r (closed).
   Every number in the panel is computed from the dimensions you set; the net's area is summed from the actual face
   polygons and compared with the surface-area formula. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, IL = LS.inline, esc = LS.esc;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const SH = {
    cube: { n: 'Cube', dims: [['a', 'Edge a', 1, 6, 3]] },
    cuboid: { n: 'Cuboid', dims: [['l', 'Length l', 1, 7, 4], ['w', 'Width w', 1, 6, 2.5], ['h', 'Height h', 1, 6, 2]] },
    prism: { n: 'Triangular prism', dims: [['s', 'Triangle side s', 1, 6, 3], ['L', 'Length L', 1, 7, 4]] },
    pyramid: { n: 'Square pyramid', dims: [['a', 'Base edge a', 1, 6, 3.5], ['h', 'Height h', 0.5, 7, 3]] },
    cylinder: { n: 'Cylinder', dims: [['r', 'Radius r', 0.5, 3, 1.4], ['h', 'Height h', 0.5, 6, 3]] },
    cone: { n: 'Cone', dims: [['r', 'Radius r', 0.5, 3, 1.6], ['h', 'Height h', 0.5, 6, 3.2]] }
  };
  const area = P => Math.abs(P.reduce((s, p, i) => { const q2 = P[(i + 1) % P.length]; return s + p[0] * q2[1] - q2[0] * p[1]; }, 0)) / 2;
  const fmt = (v, d = 2) => K.fmt(v, d);
  function facts(k, d) { // formulas and their values
    const r = d.r, h = d.h, pi = Math.PI;
    switch (k) {
      case 'cube': return { V: d.a ** 3, A: 6 * d.a ** 2, Vf: 'V = a³', Af: 'A = 6a²', F: 6, E: 12, Vt: 8 };
      case 'cuboid': return { V: d.l * d.w * d.h, A: 2 * (d.l * d.w + d.l * d.h + d.w * d.h), Vf: 'V = l × w × h', Af: 'A = 2(lw + lh + wh)', F: 6, E: 12, Vt: 8 };
      case 'prism': { const tri = Math.sqrt(3) / 4 * d.s ** 2; return { V: tri * d.L, A: 2 * tri + 3 * d.s * d.L, Vf: 'V = (√3/4)s² × L', Af: 'A = 2 × (√3/4)s² + 3sL', F: 5, E: 9, Vt: 6 }; }
      case 'pyramid': { const s = Math.sqrt(d.h ** 2 + (d.a / 2) ** 2); return { V: d.a ** 2 * d.h / 3, A: d.a ** 2 + 2 * d.a * s, Vf: 'V = a²h / 3', Af: `A = a² + 2a·s,  s = √(h² + (a/2)²) = ${fmt(s)}`, F: 5, E: 8, Vt: 5 }; }
      case 'cylinder': return { V: pi * r * r * h, A: 2 * pi * r * r + 2 * pi * r * h, Vf: 'V = πr²h', Af: 'A = 2πr² + 2πrh', F: 3, E: 2, Vt: 0, curved: true };
      case 'cone': { const l = Math.sqrt(r * r + h * h); return { V: pi * r * r * h / 3, A: pi * r * r + pi * r * l, Vf: 'V = πr²h / 3', Af: `A = πr² + πrl,  l = √(r² + h²) = ${fmt(l)}`, F: 2, E: 1, Vt: 1, curved: true }; }
    }
  }
  // the net: faces with a parent, a hinge (two points in flat coordinates) and a fold angle
  function net(k, d) {
    const F = [], add = (poly, parent, hinge, ang, col) => { F.push({ poly, parent, hinge, ang, col }); return F.length - 1; };
    const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], q90 = Math.PI / 2;
    if (k === 'cube' || k === 'cuboid') {
      const l = k === 'cube' ? d.a : d.l, w = k === 'cube' ? d.a : d.w, h = k === 'cube' ? d.a : d.h;
      const b = add(R(0, 0, l, w), -1, null, 0, 0);
      add(R(0, -h, l, 0), b, [[0, 0], [l, 0]], q90, 1); const bk = add(R(0, w, l, w + h), b, [[0, w], [l, w]], q90, 2);
      add(R(-h, 0, 0, w), b, [[0, 0], [0, w]], q90, 3); add(R(l, 0, l + h, w), b, [[l, 0], [l, w]], q90, 4);
      add(R(0, w + h, l, w + h + w), bk, [[0, w + h], [l, w + h]], q90, 5);
    }
    if (k === 'prism') {
      const s = d.s, L = d.L, f = Math.PI - Math.PI / 3, ht = Math.sqrt(3) / 2 * s;
      const r1 = add(R(0, 0, s, L), -1, null, 0, 0); const r2 = add(R(s, 0, 2 * s, L), r1, [[s, 0], [s, L]], f, 1); add(R(2 * s, 0, 3 * s, L), r2, [[2 * s, 0], [2 * s, L]], f, 2);
      add([[0, L], [s, L], [s / 2, L + ht]], r1, [[0, L], [s, L]], q90, 3); add([[0, 0], [s / 2, -ht], [s, 0]], r1, [[0, 0], [s, 0]], q90, 4);
    }
    if (k === 'pyramid') {
      const a = d.a, s = Math.sqrt(d.h ** 2 + (a / 2) ** 2), al = Math.atan2(d.h, a / 2), f = Math.PI - al;
      const b = add(R(0, 0, a, a), -1, null, 0, 0);
      add([[0, 0], [a / 2, -s], [a, 0]], b, [[0, 0], [a, 0]], f, 1); add([[0, a], [a, a], [a / 2, a + s]], b, [[0, a], [a, a]], f, 2);
      add([[0, 0], [0, a], [-s, a / 2]], b, [[0, 0], [0, a]], f, 3); add([[a, 0], [a + s, a / 2], [a, a]], b, [[a, 0], [a, a]], f, 4);
    }
    return F;
  }

  D['solids-nets'] = { wide: true,
    intro: 'Every solid with flat faces can be cut along some edges and laid flat: its **net**. Fold this net up and it closes into the solid — the same faces, so the **surface area is the area of the net**.\n\nPick a solid, change its dimensions, then drag **Fold** between flat and closed. Rotate the view by dragging, zoom with the wheel or a pinch.',
    predict: { q: 'You double every edge of a cube. Its **volume** becomes…', options: ['2 times bigger', '4 times bigger', '6 times bigger', '8 times bigger'] },
    explore: '- Unfold the **cube**: count its faces in the net. Then double the edge and compare area and volume.\n- Fold the **square pyramid** slowly: which faces meet at the apex?\n- Roll up the **cylinder**: why is the rectangle exactly 2πr wide?\n- Check Euler’s formula **F − E + V = 2** for each polyhedron.',
    explain: 'Surface area is the total area of the faces — exactly the area of the net. Volume measures space inside. Scaling every length by k multiplies **areas by k²** and **volumes by k³**: double a cube’s edge and its surface area becomes 4× larger but its volume 8×. A cylinder’s curved side unrolls into a rectangle whose width is the circle’s circumference, **2πr**; a cone’s unrolls into a sector of radius l (the slant height) whose arc is 2πr. For any polyhedron without holes, **faces − edges + vertices = 2** (Euler).',
    apply: [
      q('x-sn1', 'A cuboid is 4 cm × 3 cm × 2 cm. Its surface area is…', ['24 cm²', '26 cm²', '52 cm²', '48 cm²'], 2, 'A = 2(4×3 + 4×2 + 3×2) = 2(12 + 8 + 6) = 52 cm².'),
      q('x-sn2', 'A cylinder has r = 2 cm. The rectangle in its net is how wide?', ['2 cm', '4 cm', 'about 12.6 cm', 'about 25.1 cm'], 2, 'Width = circumference = 2πr = 4π ≈ 12.6 cm.'),
      q('x-sn3', 'A square pyramid has F = 5 faces and V = 5 vertices. Euler’s formula says it has…', ['6 edges', '8 edges', '10 edges', '12 edges'], 1, 'F − E + V = 2 → 5 − E + 5 = 2 → E = 8.')
    ],
    summary: ['Surface area = area of the net.', 'Scale lengths by k: areas × k², volumes × k³.', 'Cylinder net: rectangle 2πr × h and two circles.', 'Euler: F − E + V = 2 for polyhedra.'],
    connect: [{ label: 'Geometry Construction Studio', href: '#/exp/geo-construct' }, { label: '3D molecule builder', href: '#/exp/molecule-3d' }],
    build(host, c) {
      host.innerHTML = `<div class="v26-ws sn"><div class="v26-bar" role="radiogroup" aria-label="${T('Solid', 'المجسم')}">${Object.entries(SH).map(([k, s]) => `<button type="button" class="v26-tool" role="radio" data-sh="${k}" aria-checked="${k === 'cube'}">${s.n}</button>`).join('')}</div>
        <div class="v26-grid2"><div><div class="sn__view" style="position:relative;aspect-ratio:16/11;border-radius:14px;overflow:hidden;background:radial-gradient(120% 120% at 30% 20%,#23304f,#0c1222)"><p class="ls-loading sn__load" role="status" style="color:#dfe6ff;position:absolute;inset:0;display:grid;place-items:center;margin:0">${T('Loading the 3D view…', 'أحمّل العرض…')}</p></div>
          <div class="sn__ctl"></div></div>
          <div class="v26-card"><h3>${T('Measurements', 'القياسات')}</h3><div class="v26-out sn__out" aria-live="polite"></div></div></div></div>`;
      const view = host.querySelector('.sn__view'), out = host.querySelector('.sn__out'); let shape = 'cube', dims = {}, fold = K.spring(1, 5), three = null, ctl = null, dead = false;
      const setDims = () => { dims = {}; SH[shape].dims.forEach(([id, , , , v]) => { dims[id] = v; }); };
      setDims();
      function buildCtl() {
        const box = host.querySelector('.sn__ctl'); box.innerHTML = '';
        ctl = K.controls(box, SH[shape].dims.map(([id, label, min, max, v]) => ({ k: 'range', id, label, min, max, step: 0.1, val: v, d: 1, unit: ' cm' })).concat([{ k: 'range', id: 'fold', label: T('Fold: flat net → closed solid', 'الطي'), min: 0, max: 1, step: 0.01, val: fold.t, d: 2, fmt: v => Math.round(v * 100) + '%' }, { k: 'row' }, { k: 'btn', id: 'up', label: T('Fold up', 'اطوِ'), accent: true }, { k: 'btn', id: 'flat', label: T('Unfold flat', 'افرد') }, { k: 'btn', id: 'cam', label: T('Reset view', 'إعادة العرض') }, { k: 'end' }]), (id, v) => {
          if (id === 'fold') { fold.set(v, true); rebuild(); }
          else if (id === 'up' || id === 'flat') { fold.set(id === 'up' ? 1 : 0); ctl.set('fold', id === 'up' ? 1 : 0); anim(); }
          else if (id === 'cam') { if (three) { three.cam.position.set(9, 8, 11); three.ctrl.target.set(0, 0, 0); three.ctrl.update(); render(); } }
          else { dims[id] = v; rebuild(); }
        });
      }
      function readout() {
        const f = facts(shape, dims); let netA = 0;
        if (!f.curved) netA = net(shape, dims).reduce((s, fc) => s + area(fc.poly), 0);
        else netA = shape === 'cylinder' ? 2 * Math.PI * dims.r * dims.h + 2 * Math.PI * dims.r ** 2 : Math.PI * dims.r * Math.sqrt(dims.r ** 2 + dims.h ** 2) + Math.PI * dims.r ** 2;
        out.innerHTML = `<table><tr><th>${T('Volume', 'الحجم')}</th><td>${esc(f.Vf)} = <b>${fmt(f.V)} cm³</b></td></tr><tr><th>${T('Surface area', 'المساحة السطحية')}</th><td>${esc(f.Af)} = <b>${fmt(f.A)} cm²</b></td></tr><tr><th>${T('Area of the net', 'مساحة الشبكة')}</th><td>${fmt(netA)} cm² ${Math.abs(netA - f.A) < 1e-6 ? '✓ ' + T('= surface area', '= المساحة السطحية') : ''}</td></tr>${f.curved ? `<tr><th>${T('Net', 'الشبكة')}</th><td>${shape === 'cylinder' ? `${T('rectangle', 'مستطيل')} 2πr × h = ${fmt(2 * Math.PI * dims.r)} × ${fmt(dims.h)} cm + 2 ${T('circles', 'دائرتان')} r = ${fmt(dims.r)}` : `${T('sector of radius', 'قطاع نصف قطره')} l = ${fmt(Math.hypot(dims.r, dims.h))}, ${T('angle', 'زاوية')} ${fmt(360 * dims.r / Math.hypot(dims.r, dims.h), 1)}° + ${T('a circle', 'دائرة')} r = ${fmt(dims.r)}`}</td></tr>` : `<tr><th>Euler</th><td>F − E + V = ${f.F} − ${f.E} + ${f.Vt} = <b>${f.F - f.E + f.Vt}</b></td></tr>`}<tr><th>${T('Folded', 'مطوي')}</th><td>${Math.round(fold.v * 100)}%</td></tr></table>`;
      }
      /* ---------- three.js scene ---------- */
      const COLS = [0xf2b134, 0x4aa3df, 0xe0644f, 0x5cc49a, 0xa77be0, 0xf08bb6];
      let group = null;
      function render() { if (three && !dead) three.renderer.render(three.scene, three.cam); }
      function rebuild() {
        readout(); if (!three) return; const THREE = three.THREE;
        if (group) { three.scene.remove(group); group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
        group = new THREE.Group(); const t = fold.v;
        const mat = (col, op = 0.92) => new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.05, transparent: op < 1, opacity: op, polygonOffset: true, polygonOffsetFactor: 1 });
        const edge = geo => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x101525 }));
        if (!facts(shape, dims).curved) {
          const F = net(shape, dims), M = [];
          F.forEach((fc, i) => {
            let m = new THREE.Matrix4();
            if (fc.parent >= 0) { const [p, q2] = fc.hinge, ax = new THREE.Vector3(q2[0] - p[0], q2[1] - p[1], 0).normalize(), cx = fc.poly.reduce((s, v) => s + v[0], 0) / fc.poly.length, cy = fc.poly.reduce((s, v) => s + v[1], 0) / fc.poly.length;
              const rot = ang => new THREE.Matrix4().makeTranslation(p[0], p[1], 0).multiply(new THREE.Matrix4().makeRotationAxis(ax, ang)).multiply(new THREE.Matrix4().makeTranslation(-p[0], -p[1], 0));
              const test = new THREE.Vector3(cx, cy, 0).applyMatrix4(rot(0.3)); const sign = test.z >= 0 ? 1 : -1; // fold towards +z
              m = M[fc.parent].clone().multiply(rot(sign * fc.ang * t)); }
            M[i] = m;
            const sh = new THREE.Shape(fc.poly.map(([x, y]) => new THREE.Vector2(x, y))), geo = new THREE.ShapeGeometry(sh), mesh = new THREE.Mesh(geo, mat(COLS[fc.col % 6]));
            mesh.matrixAutoUpdate = false; mesh.matrix.copy(m); group.add(mesh); const e = edge(geo); e.matrixAutoUpdate = false; e.matrix.copy(m); group.add(e);
          });
        } else if (shape === 'cylinder') {
          // side: a 2πr × h rectangle in the x–y plane, bent about the y direction with curvature t / r (tangent at x = 0)
          const r = dims.r, h = dims.h, W = 2 * Math.PI * r, N = 96, k = t / r, pos = [], idx = [];
          for (let i = 0; i <= N; i++) { const u = W * i / N - W / 2; let x, z; if (k < 1e-6) { x = u; z = 0; } else { const ph = u * k; x = Math.sin(ph) / k; z = (1 - Math.cos(ph)) / k; } pos.push(x, 0, z, x, h, z); }
          for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); group.add(new THREE.Mesh(geo, mat(COLS[1])));
          // the two circles are hinged on the rectangle’s bottom and top edges at x = 0, and swing 90° to close the ends
          [[0, -1, 2], [h, 1, 0]].forEach(([y0, sg, ci]) => { const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mat(COLS[ci])); disc.position.set(0, sg * r, 0); const piv = new THREE.Group(); piv.position.set(0, y0, 0); piv.rotation.x = sg * Math.PI / 2 * t; piv.add(disc); group.add(piv); });
        } else if (shape === 'cone') {
          // side: a sector of radius l; rolling it is the family of cones with sin β = 1 / s, s from 1 (flat) to l / r (closed)
          const r = dims.r, h = dims.h, l = Math.hypot(r, h), Th = 2 * Math.PI * r / l, sMax = l / r, s = 1 + (sMax - 1) * t, sb = 1 / s, cb = Math.sqrt(Math.max(0, 1 - sb * sb)), N = 72, M2 = 24, pos = [], idx = [];
          for (let j = 0; j <= M2; j++) for (let i = 0; i <= N; i++) { const rho = l * j / M2, az = Th * (i / N - 0.5) * s; pos.push(rho * sb * Math.sin(az), -rho * cb, rho * sb * Math.cos(az)); }
          for (let j = 0; j < M2; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b2 = a + N + 1; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); group.add(new THREE.Mesh(geo, mat(COLS[3])));
          // the base circle: beside the sector’s arc when flat, moving into the base of the cone as it closes
          const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mat(COLS[0])); disc.rotation.x = -Math.PI / 2; disc.position.set(0, -h * t, (l + r + 0.3) * (1 - t)); group.add(disc);
        }
        // centre the model
        if (shape !== 'cone') group.rotation.x = -Math.PI / 2; // nets are built in the x–y plane: lay them on the floor, folding upwards
        group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(group), cen = bb.getCenter(new THREE.Vector3()); group.position.set(-cen.x, -bb.min.y - 3.2 + 0.001, -cen.z); // sit on the grid, centred
        three.scene.add(group); render();
      }
      let raf = 0;
      function anim() { cancelAnimationFrame(raf); if (K.reduced()) { fold.v = fold.t; rebuild(); ctl.set('fold', fold.t); return; } let last = performance.now(); const tick = now => { if (dead) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; const mv = fold.step(dt); rebuild(); ctl.set('fold', fold.v); if (mv) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); }
      buildCtl(); readout();
      (async () => {
        try {
          const THREE = await import('three'); const { OrbitControls } = await import('three/addons/controls/OrbitControls.js'); if (dead) return;
          const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
          const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 16 / 11, 0.1, 200); cam.position.set(9, 8, 11);
          scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x202030, 1.1)); const dl = new THREE.DirectionalLight(0xffffff, 1.3); dl.position.set(6, 10, 7); scene.add(dl);
          const grid = new THREE.GridHelper(20, 20, 0x3a4a70, 0x26324d); grid.position.y = -3.2; scene.add(grid);
          view.querySelector('.sn__load').remove(); view.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
          renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', T('3D model of the solid and its net. Drag to rotate, scroll or pinch to zoom.', 'نموذج ثلاثي الأبعاد'));
          const ctrl = new OrbitControls(cam, renderer.domElement); ctrl.enableDamping = false; ctrl.addEventListener('change', () => render());
          const fit = () => { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); render(); };
          const ro = new ResizeObserver(fit); ro.observe(view);
          three = { THREE, renderer, scene, cam, ctrl, ro }; fit(); rebuild();
        } catch (e) { const l = view.querySelector('.sn__load'); if (l) l.textContent = T('3D is not available in this browser. The measurements still work.', 'العرض ثلاثي الأبعاد غير متاح.'); }
      })();
      host.addEventListener('click', e => { const b = e.target.closest('[data-sh]'); if (!b) return; shape = b.dataset.sh; host.querySelectorAll('[data-sh]').forEach(x => x.setAttribute('aria-checked', String(x === b))); setDims(); buildCtl(); rebuild(); });
      const api = { play() { fold.set(1); anim(); }, pause() {}, running: () => false,
        destroy() { dead = true; cancelAnimationFrame(raf); if (three) { three.ro.disconnect(); three.ctrl.dispose(); if (group) group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); three.renderer.dispose(); } },
        reset() { shape = 'cube'; host.querySelectorAll('[data-sh]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.sh === 'cube'))); setDims(); fold.set(1, true); buildCtl(); rebuild(); },
        preset() { this.reset(); },
        _faceHeights: () => { if (!group) return null; const THREE = three.THREE; group.updateMatrixWorld(true); const base = group.children[0]; const yb = new THREE.Box3().setFromObject(base).min.y; return group.children.filter(o => o.isMesh).map(o => +(new THREE.Box3().setFromObject(o).min.y - yb).toFixed(3)); },
        _facts: () => facts(shape, dims), _netArea: () => net(shape, dims).reduce((s, fc) => s + area(fc.poly), 0), _set: (k, d) => { shape = k; dims = Object.assign({}, d); rebuild(); },
        observe() { const f = facts(shape, dims); return { text: `${SH[shape].n} with ${Object.entries(dims).map(([k, v]) => `${k} = ${fmt(v, 1)} cm`).join(', ')}: volume **${fmt(f.V)} cm³**, surface area **${fmt(f.A)} cm²**${f.curved ? '' : `, and F − E + V = ${f.F} − ${f.E} + ${f.Vt} = **2**`}.`, predOk: i => i === 3 }; }
      };
      LS.__snProbe = () => api._faceHeights();
      return api;
    }
  };
})();
