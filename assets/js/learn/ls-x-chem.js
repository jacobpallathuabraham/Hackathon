/* ERLY Learning Studio — Chemistry: a molecular world (v24). Six experiences, including a genuine 3D molecule builder.
   Data used: standard valences, Pauling electronegativities and standard atomic weights (rounded) for elements 1–36. */
(function () {
  'use strict';
  const LS = window.LS, K = LS.kit, D = LS.exp.DEFS, T = LS.T, IL = LS.inline, esc = LS.esc;
  const { fmt, clamp } = K;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const readout = host => { const r = document.createElement('p'); r.className = 'kx-read'; r.setAttribute('aria-live', 'polite'); host.appendChild(r); return r; };

  /* ============ 1 · 3D molecule builder ============ */
  const EL = { H: { v: 1, lp: 0, col: 0xf4f4f4, r: 0.32, name: 'hydrogen' }, C: { v: 4, lp: 0, col: 0x303030, r: 0.5, name: 'carbon' }, N: { v: 3, lp: 1, col: 0x3050f8, r: 0.48, name: 'nitrogen' }, O: { v: 2, lp: 2, col: 0xff2010, r: 0.46, name: 'oxygen' }, F: { v: 1, lp: 3, col: 0x90e050, r: 0.42, name: 'fluorine' }, Cl: { v: 1, lp: 3, col: 0x1ff01f, r: 0.56, name: 'chlorine' }, S: { v: 2, lp: 2, col: 0xffd030, r: 0.58, name: 'sulfur', ok: [2, 4, 6] }, B: { v: 3, lp: 0, col: 0xffb5b5, r: 0.46, name: 'boron' }, Si: { v: 4, lp: 0, col: 0xf0c8a0, r: 0.6, name: 'silicon' }, P: { v: 3, lp: 1, col: 0xff8000, r: 0.58, name: 'phosphorus', ok: [3, 5] }, Br: { v: 1, lp: 3, col: 0xa62929, r: 0.62, name: 'bromine' }, I: { v: 1, lp: 3, col: 0x940094, r: 0.7, name: 'iodine' } };
  const VE = { H: 1, B: 3, C: 4, Si: 4, N: 5, P: 5, O: 6, S: 6, F: 7, Cl: 7, Br: 7, I: 7 }; // valence electrons
  const okOf = e => EL[e].ok || [EL[e].v];
  const KNOWN = { H3N: 'ammonia', ClH: 'hydrogen chloride', FH: 'hydrogen fluoride', CHN: 'hydrogen cyanide', H4N2: 'hydrazine', C2H6O: 'ethanol (or its isomer methoxymethane)', H2O: 'water', CH4: 'methane', NH3: 'ammonia', CO2: 'carbon dioxide', H2: 'hydrogen', O2: 'oxygen', N2: 'nitrogen', Cl2: 'chlorine', F2: 'fluorine', HCl: 'hydrogen chloride', HF: 'hydrogen fluoride', H2S: 'hydrogen sulfide', C2H6: 'ethane', C2H4: 'ethene', C2H2: 'ethyne', C3H8: 'propane', CH4O: 'methanol', CH2O: 'methanal (formaldehyde)', HCN: 'hydrogen cyanide', H2O2: 'hydrogen peroxide', CCl4: 'tetrachloromethane', CHCl3: 'trichloromethane (chloroform)', CH3Cl: 'chloromethane', CH3F: 'fluoromethane', CO: 'carbon monoxide', C4H10: 'butane (or methylpropane)', N2H4: 'hydrazine', CH5N: 'methylamine', C2H4O2: 'ethanoic acid (or an isomer)', HOCl: 'hypochlorous acid', ClHO: 'hypochlorous acid', BF3: 'boron trifluoride', BH3: 'borane', H4Si: 'silane', H3P: 'phosphine', Cl3P: 'phosphorus trichloride', Cl5P: 'phosphorus pentachloride', F6S: 'sulfur hexafluoride', O2S: 'sulfur dioxide', O3S: 'sulfur trioxide', H2O4S: 'sulfuric acid', BrH: 'hydrogen bromide', HI: 'hydrogen iodide', Br2: 'bromine', I2: 'iodine', CH3Br: 'bromomethane', CH3I: 'iodomethane', CS2: 'carbon disulfide', Cl4Si: 'silicon tetrachloride', F5P: 'phosphorus pentafluoride', F3P: 'phosphorus trifluoride' };
  const hill = atoms => { const n = {}; atoms.forEach(a => { n[a.e] = (n[a.e] || 0) + 1; }); const keys = Object.keys(n); const order = n.C ? ['C', 'H'].filter(k => n[k]).concat(keys.filter(k => k !== 'C' && k !== 'H').sort()) : keys.sort(); return order.map(k => k + (n[k] > 1 ? n[k] : '')).join(''); };
  const SHAPES = { '2,0': ['linear', 180], '3,0': ['trigonal planar', 120], '4,0': ['tetrahedral', 109.5], '3,1': ['trigonal pyramidal', '≈107'], '2,1': ['bent', '≈117'], '2,2': ['bent', '≈104.5'], '1,3': ['linear (one bond)', '—'], '1,2': ['— (one bond)', '—'], '1,1': ['linear', 180], '1,0': ['— (one bond)', '—'], '5,0': ['trigonal bipyramidal', '90 and 120'], '6,0': ['octahedral', '90'], '4,1': ['seesaw', '≈90 and ≈117'], '3,2': ['T-shaped', '≈90'], '2,3': ['linear', 180], '5,1': ['square pyramidal', '≈90'], '4,2': ['square planar', '90'] };
  let curM = null; const nameOf = f => { if (f === 'C2H6O' && curM) { const O = curM.atoms.find(a => a.e === 'O'); return O && curM.nb(O).some(n => n.e === 'H') ? 'ethanol' : 'methoxymethane'; } return KNOWN[f]; };
  function molecule() {
    const M = { atoms: [], bonds: [] };
    M.add = (e, p) => { const a = { id: Math.random().toString(36).slice(2, 8), e, p: p || [(Math.random() - .5) * .2, (Math.random() - .5) * .2, (Math.random() - .5) * .2] }; M.atoms.push(a); return a; };
    M.used = a => M.bonds.filter(b => b.a === a || b.b === a).reduce((s, b) => s + b.o, 0);
    // bonds still needed to reach the next allowed valence (P may have 3 or 5 bonds, S 2, 4 or 6); negative = more bonds than the element can make
    M.free = a => { const u = M.used(a), ok = okOf(a.e), nx = ok.find(v => v >= u); return nx == null ? Math.max(...ok) - u : nx - u; };
    M.room = a => Math.max(...okOf(a.e)) - M.used(a);
    M.bond = (a, b) => M.bonds.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    M.nb = a => M.bonds.filter(b => b.a === a || b.b === a).map(b => (b.a === a ? b.b : b.a));
    M.del = a => { M.bonds = M.bonds.filter(b => b.a !== a && b.b !== a); M.atoms = M.atoms.filter(x => x !== a); };
    M.lp = a => (a.e === 'H' ? 0 : Math.max(0, Math.floor((VE[a.e] - M.used(a)) / 2))); // lone pairs from the electrons not used in bonds
    // relax: springs on bonds, repulsion between all atoms and lone-pair "ghosts", so shapes follow VSEPR
    M.relax = (it = 60) => { const A = M.atoms; if (!A.length) return; for (let k = 0; k < it; k++) {
      const F = A.map(() => [0, 0, 0]);
      M.bonds.forEach(b => { const i = A.indexOf(b.a), j = A.indexOf(b.b), L0 = (EL[b.a.e].r + EL[b.b.e].r) * 1.9 - (b.o - 1) * 0.12, d = [0, 1, 2].map(t => b.b.p[t] - b.a.p[t]), r = Math.hypot(...d) || 1e-3, f = (r - L0) * 0.6; d.forEach((v, t) => { F[i][t] += f * v / r; F[j][t] -= f * v / r; }); });
      // VSEPR: every pair of atoms bonded to the same centre is held at the distance that gives the ideal angle for that centre's electron domains
      A.forEach(a => { const nbs = M.nb(a); if (nbs.length < 2) return; if (M.ideal(a) == null) { // 5 or 6 electron domains: the bonded atoms repel each other round the centre, which settles into the trigonal-bipyramid / octahedron
          for (let x = 0; x < nbs.length; x++) for (let y = x + 1; y < nbs.length; y++) { const i = A.indexOf(nbs[x]), j = A.indexOf(nbs[y]), d = [0, 1, 2].map(t => nbs[y].p[t] - nbs[x].p[t]), r = Math.hypot(...d) || 1e-3, f = 0.25 / (r * r); d.forEach((v, t) => { F[i][t] -= f * v / r; F[j][t] += f * v / r; }); } return; }
        const th = M.ideal(a) * Math.PI / 180;
        for (let x = 0; x < nbs.length; x++) for (let y = x + 1; y < nbs.length; y++) { const p = nbs[x], q2 = nbs[y], i = A.indexOf(p), j = A.indexOf(q2);
          const la = Math.hypot(...[0, 1, 2].map(t => p.p[t] - a.p[t])), lb = Math.hypot(...[0, 1, 2].map(t => q2.p[t] - a.p[t])), want = Math.sqrt(la * la + lb * lb - 2 * la * lb * Math.cos(th));
          const d = [0, 1, 2].map(t => q2.p[t] - p.p[t]), r = Math.hypot(...d) || 1e-3, f = (r - want) * 0.35; d.forEach((v, t) => { F[i][t] += f * v / r; F[j][t] -= f * v / r; }); } });
      for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { if (M.bond(A[i], A[j])) continue; const d = [0, 1, 2].map(t => A[j].p[t] - A[i].p[t]), r = Math.hypot(...d) || 1e-3; if (r > 4) continue; const f = 0.03 / (r * r); d.forEach((v, t) => { F[i][t] -= f * v / r; F[j][t] += f * v / r; }); }
      A.forEach((a, i) => { F[i].forEach((v, t) => { a.p[t] += clamp(v, -0.2, 0.2); }); });
    }
    const cm = [0, 1, 2].map(t => A.reduce((s, a) => s + a.p[t], 0) / A.length); A.forEach(a => { a.p = a.p.map((v, t) => v - cm[t]); }); };
    M.ideal = a => { const nb = M.nb(a).length, lp = M.lp(a), Dm = nb + lp; return Dm >= 5 ? null : Dm <= 2 ? 180 : Dm === 3 ? (lp ? 117 : 120) : lp === 1 ? 107 : lp >= 2 ? 104.5 : 109.5; };
    M.angle = a => { const n = M.nb(a); if (n.length < 2) return null; const u = [0, 1, 2].map(t => n[0].p[t] - a.p[t]), w = [0, 1, 2].map(t => n[1].p[t] - a.p[t]); return Math.acos(clamp((u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (Math.hypot(...u) * Math.hypot(...w)), -1, 1)) * 180 / Math.PI; };
    return M;
  }
  LS.molecule = molecule;
  D['molecule-3d'] = { wide: true,
    intro: 'Build molecules atom by atom in 3D. Pick an element, then **click an atom** to bond a new one to it. Click a bond (or use Bond mode) to make it double or triple. Drag to rotate, scroll to zoom. ERLY checks every atom’s **valence** and names the molecule when it recognises it.',
    predict: { q: 'Water (H₂O) has two hydrogens on one oxygen. Its shape is…', options: ['straight (180°)', 'bent (about 104.5°)', 'a flat triangle', 'a tetrahedron'] },
    explore: 'Build water: start with O, add two H. Then methane (C + 4 H) and ammonia (N + 3 H). Compare the angles. Then try CO₂ with double bonds.',
    explain: 'Each element forms a typical number of bonds — its **valence**: H 1, O 2, N 3, C 4. Shape comes from **electron-pair repulsion (VSEPR)**: bonding pairs and **lone pairs** around a central atom spread as far apart as possible. Four electron domains point to the corners of a tetrahedron. Methane has four bonds → **tetrahedral, 109.5°**. Ammonia has three bonds and one lone pair → **pyramidal, ~107°**. Water has two bonds and two lone pairs → **bent, ~104.5°**. CO₂ has two double bonds and no lone pairs on C → **linear**. The builder’s layout imitates these repulsions; its angles are approximate.',
    apply: [q('x-mb1', 'Ammonia (NH₃) is pyramidal rather than flat because…', ['N has 3 bonds only', 'the lone pair on N repels the bonds', 'H atoms repel each other', 'it is ionic'], 1, 'The lone pair is a fourth electron domain.'), q('x-mb2', 'How many bonds does carbon usually form?', ['1', '2', '3', '4'], 3, 'Carbon’s valence is 4.')],
    summary: ['Valence: H 1, O 2, N 3, C 4, halogens 1.', 'Shape follows electron-pair repulsion, including lone pairs.', 'CH₄ tetrahedral, NH₃ pyramidal, H₂O bent, CO₂ linear.'],
    build(host, c) {
      const M = molecule(); curM = M; let sel = 'H', mode = 'add', pick = null, view = null, three = null, rep = 'ball';
      const atomS = a => (rep === 'space' ? EL[a.e].r * 2.05 : rep === 'stick' ? 0.17 : EL[a.e].r); // space-filling ≈ van der Waals size (about twice the covalent radius)
      host.innerHTML = `<div class="mb"><div class="mb__stage kx-stage"><div class="mb__gl" tabindex="0" role="img" aria-roledescription="3D viewer" aria-label="${T('3D molecule. Drag to rotate, scroll to zoom.', 'جزيء ثلاثي الأبعاد')}"></div><p class="mb__load">${T('Loading 3D…', 'جارٍ تحميل ثلاثي الأبعاد…')}</p></div></div>`;
      const gl = host.querySelector('.mb__gl'), loadEl = host.querySelector('.mb__load');
      const ctl = K.controls(host, [{ k: 'chips', id: 'el', label: T('Element', 'العنصر'), opts: Object.keys(EL).map(e => [e, e]), val: 'H' }, { k: 'chips', id: 'rep', label: T('View', 'العرض'), opts: [['ball', T('Ball and stick', 'كرة وعصا')], ['space', T('Space-filling', 'ملء الفراغ')], ['stick', T('Sticks', 'عصي')]], val: 'ball' }, { k: 'chips', id: 'mode', label: T('Click does', 'النقر يقوم بـ'), opts: [['add', T('Add atom', 'أضف ذرة')], ['bond', T('Bond / bond order', 'رابطة')], ['del', T('Delete', 'احذف')], ['info', T('Inspect', 'افحص')]], val: 'add' }, { k: 'row' }, { k: 'btn', id: 'fill', label: T('Fill with hydrogen', 'أكمل بالهيدروجين'), accent: true }, { k: 'btn', id: 'new', label: T('Start new (C)', 'ابدأ جديداً') },
        { k: 'chips', id: 'pre', label: T('Examples', 'أمثلة'), opts: [['water', 'H₂O'], ['methane', 'CH₄'], ['ammonia', 'NH₃'], ['co2', 'CO₂'], ['ethanol', 'C₂H₅OH'], ['ethene', 'C₂H₄']], val: '' }, { k: 'end' }], (id, v) => {
          if (id === 'el') sel = v; if (id === 'rep') rep = v; if (id === 'mode') { mode = v; pick = null; } if (id === 'fill') fill(); if (id === 'new') start('C'); if (id === 'pre') preset(v); update(); c.onChange(); });
      const info = document.createElement('div'); info.className = 'kx-cards'; host.appendChild(info); const read = readout(host);
      function start(e) { M.atoms = []; M.bonds = []; M.add(e, [0, 0, 0]); pick = null; M.relax(80); }
      function addTo(a, e) { if (M.room(a) < 1) { flash(T(`${a.e} cannot make another bond: ${EL[a.e].name} forms at most ${Math.max(...okOf(a.e))} bond${Math.max(...okOf(a.e)) > 1 ? 's' : ''}${okOf(a.e).length > 1 ? '' : ` (its valence is ${EL[a.e].v})`}.`, 'لا روابط حرة.')); return null; }
        if (M.used(a) + 1 > EL[a.e].v) flash(T(`${a.e} now has ${M.used(a) + 1} bonds: an “expanded octet”. Period-3 elements such as P and S can do this (PCl₅, SF₆) because they have more room around them; C, N and O cannot.`, 'ثماني موسّع')); const dir = [Math.random() - .5, Math.random() - .5, Math.random() - .5], r = Math.hypot(...dir); const b = M.add(e, a.p.map((v, t) => v + dir[t] / r * 1.2)); M.bonds.push({ a, b, o: 1 }); M.relax(120); return b; }
      function fill() { M.atoms.slice().forEach(a => { if (a.e === 'H') return; let n = M.free(a); while (n-- > 0) { const dir = [Math.random() - .5, Math.random() - .5, Math.random() - .5], r = Math.hypot(...dir); const h = M.add('H', a.p.map((v, t) => v + dir[t] / r)); M.bonds.push({ a, b: h, o: 1 }); } }); M.relax(200); }
      function preset(k) { M.atoms = []; M.bonds = [];
        const B = (x, y, o = 1) => M.bonds.push({ a: x, b: y, o });
        if (k === 'water') { const o = M.add('O'); B(o, M.add('H')); B(o, M.add('H')); }
        if (k === 'methane') { const C = M.add('C'); for (let i = 0; i < 4; i++) B(C, M.add('H')); }
        if (k === 'ammonia') { const N = M.add('N'); for (let i = 0; i < 3; i++) B(N, M.add('H')); }
        if (k === 'co2') { const C = M.add('C'); B(C, M.add('O'), 2); B(C, M.add('O'), 2); }
        if (k === 'ethanol') { const c1 = M.add('C'), c2 = M.add('C'), o = M.add('O'); B(c1, c2); B(c2, o); B(o, M.add('H')); for (let i = 0; i < 3; i++) B(c1, M.add('H')); for (let i = 0; i < 2; i++) B(c2, M.add('H')); }
        if (k === 'ethene') { const c1 = M.add('C'), c2 = M.add('C'); B(c1, c2, 2); for (let i = 0; i < 2; i++) { B(c1, M.add('H')); B(c2, M.add('H')); } }
        M.atoms.forEach(a => { a.p = [(Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2]; }); M.relax(400); pick = null; }
      let fl = '', flT = 0; const flash = t => { fl = t; flT = performance.now(); };
      function click(a, bond) {
        if (bond && mode !== 'del') { bond.o = bond.o % 3 + 1; if (M.free(bond.a) < 0 || M.free(bond.b) < 0) { bond.o = 1; flash(T('Not enough free valence for a higher bond order.', 'تكافؤ غير كافٍ.')); } M.relax(80); update(); return; }
        if (!a) return;
        if (mode === 'add') addTo(a, sel);
        if (mode === 'del') { if (M.atoms.length > 1) M.del(a); M.relax(60); }
        if (mode === 'bond') { if (!pick) { pick = a; } else if (pick === a) pick = null; else { const ex = M.bond(pick, a); if (ex) { ex.o = ex.o % 3 + 1; if (M.free(pick) < 0 || M.free(a) < 0) { ex.o = 1; flash(T('Not enough free valence.', 'تكافؤ غير كافٍ.')); } } else if (M.free(pick) > 0 && M.free(a) > 0) M.bonds.push({ a: pick, b: a, o: 1 }); else flash(T('One of these atoms has no free bonds.', 'لا روابط حرة.')); pick = null; M.relax(120); } }
        if (mode === 'info') pick = a;
        update(); c.onChange();
      }
      function describe() {
        const f = hill(M.atoms), open = M.atoms.filter(a => M.free(a) > 0), complete = !open.length && M.atoms.length > 1, name = nameOf(f);
        const centres = M.atoms.filter(a => M.nb(a).length >= 2 || (pick && a === pick));
        info.innerHTML = `<div class="kx-card"><small>${T('Formula', 'الصيغة')}</small><div class="kx-mono" style="font-size:1.2rem">${f.replace(/(\d+)/g, '<sub>$1</sub>')}</div></div><div class="kx-card"><small>${T('Name', 'الاسم')}</small><div>${complete ? (name ? `<b>${esc(name)}</b>` : T('Not in ERLY’s list of named molecules', 'غير موجود في القائمة')) : T('Incomplete — atoms still have free bonds', 'غير مكتمل')}</div></div>` +
          centres.slice(0, 4).map(a => { const nb = M.nb(a).length, lp = M.lp(a), sh = SHAPES[nb + ',' + lp] || ['—', '—'], ang = M.angle(a); return `<div class="kx-card"><small>${T('Around', 'حول')} ${a.e} (${nb} ${T('bonded', 'مرتبطة')}, ${lp} ${T('lone pair(s)', 'أزواج حرة')})</small><div><b>${sh[0]}</b> · ${T('ideal', 'المثالي')} ${sh[1]}°${ang ? ` · ${T('here', 'هنا')} ${fmt(ang, 0)}°` : ''}</div></div>`; }).join('');
        read.innerHTML = IL((fl && performance.now() - flT < 4000 ? `⚠ ${fl} ` : '') + (complete ? `**${f}${name ? ' — ' + name : ''}**: every atom has its full number of bonds (valence satisfied).` : `**${open.length}** atom(s) still have free bonds: ${open.slice(0, 6).map(a => `${a.e} needs ${M.free(a)}`).join(', ')}. ${mode === 'bond' && pick ? `Selected ${pick.e} — now click another atom.` : ''}`));
      }
      function update() { describe(); if (view) view.sync(); }
      start('O'); preset('water');
      // ----- renderer: Three.js if available, otherwise a 2D projection with the same controls -----
      (async () => {
        try { const THREE = await import('three'); const { OrbitControls } = await import('three/addons/controls/OrbitControls.js'); three = THREE; view = make3D(THREE, OrbitControls); }
        catch (e) { view = make2D(); }
        loadEl.remove(); update();
      })();
      function make3D(T3, Orbit) {
        const w = gl.clientWidth || 700, h = Math.round(w * 0.6); gl.style.height = h + 'px';
        let renderer; try { renderer = new T3.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return make2D(); }
        renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(w, h); gl.appendChild(renderer.domElement);
        const scene = new T3.Scene(), cam = new T3.PerspectiveCamera(40, w / h, 0.1, 100); cam.position.set(0, 1.5, 7);
        scene.add(new T3.HemisphereLight(0xffffff, 0x334466, 1.3)); const dl = new T3.DirectionalLight(0xffffff, 1.4); dl.position.set(3, 5, 4); scene.add(dl);
        const ctrl = new Orbit(cam, renderer.domElement); ctrl.enableDamping = true; ctrl.dampingFactor = 0.08; ctrl.minDistance = 3; ctrl.maxDistance = 18;
        const grp = new T3.Group(); scene.add(grp); const sph = new T3.SphereGeometry(1, 32, 20), cyl = new T3.CylinderGeometry(0.09, 0.09, 1, 14);
        const mats = {}; const mat = col => mats[col] || (mats[col] = new T3.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.05 }));
        const selMat = new T3.MeshStandardMaterial({ color: 0xffb020, emissive: 0x553300, roughness: 0.3 }); const bondMat = new T3.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.5 });
        let meshes = [], disp = new Map();
        function sync() {
          grp.clear(); meshes = [];
          M.atoms.forEach(a => { if (!disp.has(a)) disp.set(a, a.p.slice()); const m = new T3.Mesh(sph, a === pick ? selMat : mat(EL[a.e].col)); m.scale.setScalar(atomS(a)); m.userData.atom = a; grp.add(m); meshes.push(m); a._m = m;
            if (M.free(a) > 0 && rep !== 'space') { const ring = new T3.Mesh(new T3.TorusGeometry(Math.max(atomS(a), 0.2) * 1.25, 0.025, 8, 32), new T3.MeshBasicMaterial({ color: 0xffb020 })); m.add(ring); ring.scale.setScalar(1 / atomS(a)); a._ring = ring; } });
          if (rep !== 'space') M.bonds.forEach(b => { for (let k = 0; k < b.o; k++) { const m = new T3.Mesh(cyl, bondMat); m.userData.bond = b; m.userData.k = k; m.userData.w = rep === 'stick' ? 1.7 : 1; grp.add(m); meshes.push(m); } });
          place();
        }
        function place() { const tmp = new T3.Vector3(), up = new T3.Vector3(0, 1, 0);
          grp.children.forEach(m => { if (m.userData.atom) { const p = disp.get(m.userData.atom); m.position.set(...p); }
            else if (m.userData.bond) { const b = m.userData.bond, pa = new T3.Vector3(...disp.get(b.a)), pb = new T3.Vector3(...disp.get(b.b)), d = tmp.subVectors(pb, pa), L = d.length(); m.scale.set(m.userData.w || 1, L, m.userData.w || 1); m.quaternion.setFromUnitVectors(up, d.clone().normalize());
              const off = (m.userData.k - (b.o - 1) / 2) * 0.22, side = new T3.Vector3().crossVectors(d, new T3.Vector3(0.3, 1, 0.1)).normalize().multiplyScalar(off); m.position.copy(pa).add(pb).multiplyScalar(0.5).add(side); } }); }
        const ray = new T3.Raycaster(), ndc = new T3.Vector2(); let down = null;
        renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
        renderer.domElement.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam); const hit = ray.intersectObjects(meshes, false)[0]; if (!hit) return; click(hit.object.userData.atom || null, hit.object.userData.bond || null); });
        let raf = 0, dead = false; const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; }); let vis = true; io.observe(gl);
        const loop = () => { if (dead) return; raf = requestAnimationFrame(loop); if (!vis || document.hidden) return; let mv = false;
          M.atoms.forEach(a => { const d = disp.get(a) || a.p.slice(); for (let t = 0; t < 3; t++) { const nd = d[t] + (a.p[t] - d[t]) * (K.reduced() ? 1 : 0.18); if (Math.abs(nd - d[t]) > 1e-4) mv = true; d[t] = nd; } disp.set(a, d); });
          if (mv) { place(); const rad = Math.max(1, ...[...disp.values()].map(p => Math.hypot(...p))); fitTo = Math.max(5.5, rad * 3.4 + 2); }
          if (fitTo) { const d = cam.position.length(), nd = d + (fitTo - d) * 0.12; cam.position.multiplyScalar(nd / d); if (Math.abs(nd - fitTo) < 0.01) fitTo = 0; }
          if (!K.reduced()) grp.rotation.y += 0.0015; ctrl.update(); renderer.render(scene, cam); };
        let fitTo = 0;
        loop();
        const ro = new ResizeObserver(() => { const W = gl.clientWidth, H = Math.round(W * 0.6); gl.style.height = H + 'px'; renderer.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix(); }); ro.observe(gl);
        sync();
        return { sync, destroy() { dead = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); ctrl.dispose(); renderer.dispose(); sph.dispose(); cyl.dispose(); }, kind: '3d', _render: () => renderer.render(scene, cam) };
      }
      function make2D() {
        const S = K.stage(gl, 700, 420); let rx = 0.3, ry = 0.5, zoom = 70, drag = null;
        const proj = p => { const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx); const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy, y1 = p[1] * cx - z1 * sx, z2 = p[1] * sx + z1 * cx; return [350 + x1 * zoom, 210 - y1 * zoom, z2]; };
        const draw = () => { const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); M.bonds.forEach(b => { const A = proj(b.a.p), B = proj(b.b.p); for (let k = 0; k < b.o; k++) { const off = (k - (b.o - 1) / 2) * 6, nx = -(B[1] - A[1]), ny = B[0] - A[0], nl = Math.hypot(nx, ny) || 1; G.strokeStyle = Pl.grey; G.lineWidth = 5; G.beginPath(); G.moveTo(A[0] + nx / nl * off, A[1] + ny / nl * off); G.lineTo(B[0] + nx / nl * off, B[1] + ny / nl * off); G.stroke(); } });
          M.atoms.map(a => [a, proj(a.p)]).sort((x, y) => x[1][2] - y[1][2]).forEach(([a, P]) => { G.fillStyle = '#' + EL[a.e].col.toString(16).padStart(6, '0'); G.beginPath(); G.arc(P[0], P[1], EL[a.e].r * zoom * 0.6, 0, 7); G.fill(); G.strokeStyle = a === pick ? '#ffb020' : Pl.ink; G.lineWidth = a === pick ? 4 : 1.5; G.stroke(); K.text(G, a.e, P[0], P[1] + 5, { a: 'center', w: 800, c: a.e === 'C' || a.e === 'N' ? '#fff' : '#111' }); }); };
        S.cv.style.touchAction = 'none'; S.cv.addEventListener('pointerdown', e => { e.preventDefault(); drag = { p: S.pt(e), rx, ry, moved: false }; S.cv.setPointerCapture(e.pointerId); });
        S.cv.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = S.pt(e); if (Math.hypot(x - drag.p[0], y - drag.p[1]) > 5) drag.moved = true; ry = drag.ry + (x - drag.p[0]) / 150; rx = drag.rx + (y - drag.p[1]) / 150; draw(); });
        S.cv.addEventListener('pointerup', e => { if (drag && !drag.moved) { const [x, y] = S.pt(e); const hit = M.atoms.map(a => [a, proj(a.p)]).filter(([a, P]) => Math.hypot(P[0] - x, P[1] - y) < EL[a.e].r * zoom * 0.7).sort((p, q2) => q2[1][2] - p[1][2])[0]; if (hit) click(hit[0], null); } drag = null; });
        S.cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * (e.deltaY < 0 ? 1.1 : 0.9), 30, 160); draw(); }, { passive: false });
        return { sync: draw, destroy() { S.destroy(); }, kind: '2d' };
      }
      return { destroy() { if (view) view.destroy(); }, reset() { ctl.reset(); sel = 'H'; mode = 'add'; preset('water'); update(); }, _M: M, _view: () => view, _click: click, _preset: k => { preset(k); update(); }, _fill: () => { fill(); update(); },
        observe() { const f = hill(M.atoms), complete = M.atoms.length > 1 && !M.atoms.some(a => M.free(a) > 0), cen = M.atoms.filter(a => M.nb(a).length >= 2); const parts = cen.slice(0, 3).map(a => { const sh = SHAPES[M.nb(a).length + ',' + M.lp(a)] || ['—']; const ang = M.angle(a); return `${a.e}: **${sh[0]}**${ang ? ` (${fmt(ang, 0)}° in the model)` : ''}`; });
          return { text: `You built **${f}**${complete && nameOf(f) ? ` (${nameOf(f)})` : ''}${complete ? ', with every valence satisfied' : ', still incomplete'}. ${parts.join('; ')}.`, predOk: f === 'H2O' && complete ? p => p === 1 : null }; } };
    }
  };

  /* ============ 2 · Atom builder ============ */
  const ELN = ['', 'Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon', 'Sodium', 'Magnesium', 'Aluminium', 'Silicon', 'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium', 'Scandium', 'Titanium', 'Vanadium', 'Chromium', 'Manganese', 'Iron', 'Cobalt', 'Nickel', 'Copper', 'Zinc', 'Gallium', 'Germanium', 'Arsenic', 'Selenium', 'Bromine', 'Krypton'];
  const SYM = ['', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'];
  const STABLE = { 1: [1, 2], 2: [3, 4], 3: [6, 7], 4: [9], 5: [10, 11], 6: [12, 13], 7: [14, 15], 8: [16, 17, 18], 9: [19], 10: [20, 21, 22], 11: [23], 12: [24, 25, 26], 13: [27], 14: [28, 29, 30], 15: [31], 16: [32, 33, 34, 36], 17: [35, 37], 18: [36, 38, 40], 19: [39, 41], 20: [40, 42, 43, 44, 46] };
  D['atom-builder'] = { wide: true,
    intro: 'Build an atom from **protons**, **neutrons** and **electrons**. The number of protons decides the element; neutrons make different **isotopes**; electrons that don’t match the protons make an **ion**. Electrons fill shells around the nucleus.',
    predict: { q: 'You add one **neutron** to a carbon-12 atom. It becomes…', options: ['nitrogen', 'carbon-13, still carbon', 'a carbon ion', 'boron'] },
    explore: 'Build carbon-12 (6, 6, 6). Add a neutron, then a proton instead. Then remove an electron from sodium (11 p, 12 n, 11 e).',
    explain: 'The **atomic number (protons)** identifies the element. **Mass number = protons + neutrons**; atoms of the same element with different neutron numbers are **isotopes** (carbon-12, carbon-13). If electrons ≠ protons the atom has a **charge**: fewer electrons → positive ion (Na⁺), more → negative ion (Cl⁻). Electrons fill shells (in this simple model 2, 8, 8, 2…), and the outer shell decides chemical behaviour. Stability shown here is taken from the list of naturally stable isotopes.',
    apply: [q('x-ab1', 'An atom has 17 protons, 18 neutrons and 18 electrons. It is…', ['Ar', 'a chloride ion, Cl⁻', 'Cl-36', 'K⁺'], 1, '17 protons = chlorine; one extra electron → −1.'), q('x-ab2', 'Isotopes of an element differ in their number of…', ['protons', 'neutrons', 'electrons only', 'shells'], 1, 'Same protons, different neutrons.')],
    summary: ['Protons = atomic number = element.', 'Mass number = protons + neutrons; isotopes differ in neutrons.', 'Charge = protons − electrons.'],
    build(host, c) {
      const S = K.stage(host, 800, 380); let p = 6, n = 6, e = 6, t = 0; const sp = K.spring(6), sn = K.spring(6), se = K.spring(6);
      const ctl = K.controls(host, [{ k: 'range', id: 'p', label: T('Protons', 'بروتونات'), min: 1, max: 20, step: 1, val: 6 }, { k: 'range', id: 'n', label: T('Neutrons', 'نيوترونات'), min: 0, max: 26, step: 1, val: 6 }, { k: 'range', id: 'e', label: T('Electrons', 'إلكترونات'), min: 0, max: 22, step: 1, val: 6 }], (id, v) => { if (id === 'p') { p = v; sp.set(v); } if (id === 'n') { n = v; sn.set(v); } if (id === 'e') { e = v; se.set(v); } M.kick(); c.onChange(); });
      const read = readout(host);
      const shells = k => { const out = []; const cap = [2, 8, 8, 18]; let left = k; for (const cp of cap) { if (left <= 0) break; out.push(Math.min(cp, left)); left -= cp; } return out; };
      const M = K.motor(c, host, dt => {
        t += dt; const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); const cx = 230, cy = 190;
        const tot = p + n; for (let i = 0; i < tot; i++) { const a = i * 2.4, r = 5 * Math.sqrt(i), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; G.fillStyle = (i % 2 === 0 ? i / 2 < p : (i - 1) / 2 >= n) || i >= 2 * Math.min(p, n) && p > n ? Pl.red : Pl.grey; G.beginPath(); G.arc(x, y, 6, 0, 7); G.fill(); }
        const sh = shells(e); sh.forEach((cnt, k) => { const R = 60 + k * 38; G.strokeStyle = Pl.line; G.lineWidth = 1.5; G.beginPath(); G.arc(cx, cy, R, 0, 7); G.stroke(); for (let j = 0; j < cnt; j++) { const a = j / cnt * 2 * Math.PI + t * (0.8 - k * 0.15) * (K.reduced() ? 0 : 1); G.fillStyle = Pl.blue; G.beginPath(); G.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 5, 0, 7); G.fill(); } });
        const ch = p - e, A = p + n, st = (STABLE[p] || []).includes(A);
        G.fillStyle = Pl.bg; K.rr(G, 470, 40, 250, 250, 16); G.fill(); G.strokeStyle = Pl.ink; G.lineWidth = 2; G.stroke();
        K.text(G, String(A), 500, 100, { s: 22, w: 700 }); K.text(G, String(p), 500, 250, { s: 22, w: 700 }); K.text(G, SYM[p], 600, 200, { a: 'center', s: 96, w: 800 }); if (ch) K.text(G, (Math.abs(ch) > 1 ? Math.abs(ch) : '') + (ch > 0 ? '+' : '−'), 690, 110, { s: 30, w: 800, c: ch > 0 ? Pl.red : Pl.blue });
        K.text(G, ELN[p], 595, 280, { a: 'center', s: 15, w: 700, c: Pl.muted });
        read.innerHTML = IL(`**${ELN[p]}-${A}**${ch ? ` ion (charge **${ch > 0 ? '+' : '−'}${Math.abs(ch)}**)` : ''}: ${p} protons, ${n} neutrons, ${e} electrons in shells **${sh.join(', ') || '—'}**. ${STABLE[p] ? (st ? 'A naturally **stable** isotope.' : `Not one of ${ELN[p]}’s stable isotopes (${STABLE[p].map(m => SYM[p] + '-' + m).join(', ')}).`) : ''}`);
      }).add(sp, sn, se);
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); p = n = e = 6; M.play(); },
        observe() { const A = p + n; return { text: `${ELN[p]}-${A}${p !== e ? ` (charge ${p - e > 0 ? '+' : '−'}${Math.abs(p - e)})` : ''}. ${p === 6 && n === 7 ? 'Adding a neutron to carbon-12 gave **carbon-13** — still carbon.' : ''}`, predOk: p === 6 && n === 7 ? q2 => q2 === 1 : null }; } };
    }
  };

  /* ============ 3 · Periodic table explorer (elements 1–36) ============ */
  const MASS = [0, 1.008, 4.003, 6.94, 9.012, 10.81, 12.011, 14.007, 15.999, 18.998, 20.180, 22.990, 24.305, 26.982, 28.085, 30.974, 32.06, 35.45, 39.95, 39.098, 40.078, 44.956, 47.867, 50.942, 51.996, 54.938, 55.845, 58.933, 58.693, 63.546, 65.38, 69.723, 72.630, 74.922, 78.971, 79.904, 83.798];
  const EN = [0, 2.20, null, 0.98, 1.57, 2.04, 2.55, 3.04, 3.44, 3.98, null, 0.93, 1.31, 1.61, 1.90, 2.19, 2.58, 3.16, null, 0.82, 1.00, 1.36, 1.54, 1.63, 1.66, 1.55, 1.83, 1.88, 1.91, 1.90, 1.65, 1.81, 2.01, 2.18, 2.55, 2.96, 3.00];
  const pos = z => { if (z === 1) return [1, 1]; if (z === 2) return [1, 18]; if (z <= 10) return [2, z <= 4 ? z - 2 : z + 8]; if (z <= 18) return [3, z <= 12 ? z - 10 : z]; return [4, z - 18]; };
  const ORD = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p']; const CAP = { s: 2, p: 6, d: 10 };
  function config(z) { const out = []; let left = z; for (const o of ORD) { if (left <= 0) break; const k = Math.min(CAP[o[1]], left); out.push([o, k]); left -= k; } if (z === 24) return [['1s', 2], ['2s', 2], ['2p', 6], ['3s', 2], ['3p', 6], ['4s', 1], ['3d', 5]]; if (z === 29) return [['1s', 2], ['2s', 2], ['2p', 6], ['3s', 2], ['3p', 6], ['4s', 1], ['3d', 10]]; return out; }
  const CAT = z => [2, 10, 18, 36].includes(z) ? 'noble gas' : [3, 11, 19].includes(z) ? 'alkali metal' : [4, 12, 20].includes(z) ? 'alkaline earth metal' : z >= 21 && z <= 30 ? 'transition metal' : [9, 17, 35].includes(z) ? 'halogen' : [5, 14, 32, 33].includes(z) ? 'metalloid' : [13, 31].includes(z) ? 'post-transition metal' : 'non-metal';
  D.periodic = { wide: true,
    intro: 'The first 36 elements. **Select any element** to see its electron configuration and where it sits; **colour the table** by category, atomic mass or electronegativity and look for the patterns that give the table its shape.',
    predict: { q: 'Across a period (left to right), electronegativity generally…', options: ['increases', 'decreases', 'stays the same', 'is random'] },
    explore: 'Colour by electronegativity and read across period 2 and down group 1. Select Cr and Cu: what is odd about their configurations?',
    explain: 'The table is arranged by **atomic number**, and its columns (groups) collect elements with the same **outer-electron arrangement**, which is why they behave alike. Across a period the nuclear charge grows while the outer electrons stay in the same shell, so atoms attract bonding electrons more strongly — **electronegativity increases** (fluorine is highest). Down a group the outer electrons are further away, so it **decreases**. Chromium and copper are famous exceptions to simple filling: 4s¹3d⁵ and 4s¹3d¹⁰ are more stable.',
    apply: [q('x-pt1', 'Which group contains elements with one outer electron?', ['Group 1 (alkali metals)', 'Group 17', 'Group 18', 'the transition metals'], 0, 'Li, Na, K…'), q('x-pt2', 'The electron configuration of sodium (11) is…', ['1s² 2s² 2p⁶ 3s¹', '1s² 2s² 2p⁷', '2, 8, 2', '1s² 2s² 2p⁶ 3p¹'], 0, 'The 11th electron goes into 3s.')],
    summary: ['Groups share outer-electron arrangement and behaviour.', 'Electronegativity rises across a period, falls down a group.', 'Configurations fill 1s 2s 2p 3s 3p 4s 3d 4p (with Cr, Cu exceptions).'],
    build(host, c) {
      let selZ = 26, colour = 'cat'; const seen = new Set([26]);
      host.insertAdjacentHTML('beforeend', '<div class="pt" role="group" aria-label="Periodic table, elements 1 to 36. Use the arrow keys to move between elements."></div>'); const grid = host.querySelector('.pt');
      const ctl = K.controls(host, [{ k: 'chips', id: 'col', label: T('Colour by', 'لوّن حسب'), opts: [['cat', T('Category', 'الفئة')], ['en', T('Electronegativity', 'السالبية الكهربائية')], ['mass', T('Atomic mass', 'الكتلة الذرية')], ['val', T('Outer electrons', 'إلكترونات خارجية')]], val: 'cat' }], (id, v) => { colour = v; draw(); c.onChange(); });
      const info = document.createElement('div'); info.className = 'kx-read'; info.setAttribute('aria-live', 'polite'); host.appendChild(info);
      const CC = { 'noble gas': '#7b6cd9', 'alkali metal': '#e0533d', 'alkaline earth metal': '#f08a3c', 'transition metal': '#d9a62b', halogen: '#2aa87e', metalloid: '#3c9bd6', 'post-transition metal': '#8fa1b3', 'non-metal': '#4cb7a5' };
      const outer = z => { const cf = config(z), n = Math.max(...cf.map(([o]) => +o[0])); return cf.filter(([o]) => +o[0] === n).reduce((s, [, k]) => s + k, 0); };
      function colourOf(z) { if (colour === 'cat') return CC[CAT(z)]; if (colour === 'en') { const e = EN[z]; if (e == null) return '#9a9a9a'; const k = (e - 0.8) / 3.2; return `hsl(${220 - k * 220}, 70%, ${55 - k * 10}%)`; } if (colour === 'mass') { const k = MASS[z] / 84; return `hsl(260, 55%, ${85 - k * 50}%)`; } const v = outer(z); return `hsl(${v * 40}, 60%, 55%)`; }
      function draw() { grid.innerHTML = Array.from({ length: 36 }, (_, i) => { const z = i + 1, [r, g] = pos(z); return `<button type="button" class="pt__el ${z === selZ ? 'is-sel' : ''}" style="grid-row:${r};grid-column:${g};--c:${colourOf(z)}" data-z="${z}" aria-label="${ELN[z]}, ${z}"><small>${z}</small><b>${SYM[z]}</b></button>`; }).join('');
        const z = selZ, cf = config(z), sup = k => String(k).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join(''), [r, g] = pos(z);
        info.innerHTML = IL(`**${ELN[z]} (${SYM[z]})** — atomic number **${z}**, relative atomic mass **${MASS[z]}**, ${CAT(z)}; period ${r}, group ${g}. Electron configuration **${cf.map(([o, k]) => o + sup(k)).join(' ')}**${z === 24 || z === 29 ? ' (an exception: a half-filled or full 3d is more stable)' : ''}. Electronegativity: **${EN[z] == null ? 'not defined (noble gas)' : EN[z]}**.`); }
      grid.addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (!b) return; selZ = +b.dataset.z; seen.add(selZ); draw(); grid.querySelector(`[data-z="${selZ}"]`).focus(); c.onChange(); });
      grid.addEventListener('keydown', e => { const m = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 8, ArrowUp: -8 }[e.key]; if (!m) return; e.preventDefault(); selZ = clamp(selZ + m, 1, 36); seen.add(selZ); draw(); grid.querySelector(`[data-z="${selZ}"]`).focus(); });
      draw();
      return { reset() { selZ = 26; colour = 'cat'; ctl.reset(); draw(); }, _config: config,
        observe() { const p2 = [3, 4, 5, 6, 7, 8, 9].map(z => EN[z]); return { text: `You looked at ${seen.size} element(s). Across period 2, electronegativity rises from **${p2[0]}** (Li) to **${p2[6]}** (F); down group 1 it falls from ${EN[3]} (Li) to ${EN[19]} (K).`, predOk: p => p === 0 }; } };
    }
  };

  /* ============ 4 · Equation balancer ============ */
  const RX = [['H2 + O2 -> H2O'], ['CH4 + O2 -> CO2 + H2O'], ['N2 + H2 -> NH3'], ['Fe + O2 -> Fe2O3'], ['C3H8 + O2 -> CO2 + H2O'], ['Na + Cl2 -> NaCl'], ['Al + O2 -> Al2O3'], ['KClO3 -> KCl + O2'], ['Mg + HCl -> MgCl2 + H2'], ['C2H6 + O2 -> CO2 + H2O']];
  const parseF = f => { const out = {}; const re = /([A-Z][a-z]?)(\d*)/g; let m; while ((m = re.exec(f))) out[m[1]] = (out[m[1]] || 0) + (m[2] ? +m[2] : 1); return out; };
  const sub = f => f.replace(/(\d+)/g, '<sub>$1</sub>');
  D.balance = { wide: true,
    intro: 'Atoms are never created or destroyed in a reaction — they are rearranged. Change the **coefficients** (the big numbers in front) until every element has the same number of atoms on both sides. The bars show the count for each element.',
    predict: { q: 'To balance H₂ + O₂ → H₂O, the coefficients are…', options: ['1, 1, 1', '2, 1, 2', '1, 2, 2', '2, 2, 1'] },
    explore: 'Balance the first reaction, then try propane burning. Hint: balance C first, then H, then O last.',
    explain: 'A balanced equation obeys the **law of conservation of mass**: the same atoms appear on both sides. You may change only the **coefficients**, never the small subscripts (changing H₂O to H₂O₂ would make a different substance). A good order: elements that appear in only one substance on each side first, oxygen and hydrogen last. 2H₂ + O₂ → 2H₂O has 4 H and 2 O on each side.',
    apply: [q('x-bl1', 'Balanced: CH₄ + 2O₂ → CO₂ + ___ H₂O', ['1', '2', '3', '4'], 1, '4 H on the left need 2 H₂O.'), q('x-bl2', 'When balancing, you may change…', ['subscripts', 'coefficients', 'both', 'the products'], 1, 'Subscripts define the substance.')],
    summary: ['Atoms are conserved: same count of each element on both sides.', 'Change coefficients only.', 'Use the smallest whole-number ratio.'],
    build(host, c) {
      let ri = 0, co = []; const solvedSet = new Set();
      const box = document.createElement('div'); box.className = 'bal'; host.appendChild(box);
      const ctl = K.controls(host, [{ k: 'chips', id: 'rx', label: T('Reaction', 'التفاعل'), opts: RX.map((r, i) => [i, r[0].split('->')[0].trim().replace(/ \+ .*/, '…')]), val: 0 }], (id, v) => { ri = v; setup(); c.onChange(); });
      const S = K.stage(host, 800, 220); const bars = {}; const read = readout(host);
      function sides() { const [l, r] = RX[ri][0].split('->').map(s => s.trim().split(' + ')); return { l, r }; }
      function setup() { const { l, r } = sides(); co = Array(l.length + r.length).fill(1); render(); }
      function counts() { const { l, r } = sides(); const L = {}, R = {}; l.forEach((f, i) => { const a = parseF(f); Object.entries(a).forEach(([e, n]) => { L[e] = (L[e] || 0) + n * co[i]; }); }); r.forEach((f, i) => { const a = parseF(f); Object.entries(a).forEach(([e, n]) => { R[e] = (R[e] || 0) + n * co[l.length + i]; }); }); return { L, R }; }
      function render() { const { l, r } = sides(); const term = (f, i) => `<span class="bal__t"><span class="bal__c"><button type="button" data-d="${i}:-1" aria-label="${T('fewer', 'أقل')} ${f}">−</button><b>${co[i]}</b><button type="button" data-d="${i}:1" aria-label="${T('more', 'أكثر')} ${f}">+</button></span><span class="bal__f">${sub(f)}</span></span>`;
        box.innerHTML = l.map((f, i) => term(f, i)).join('<span class="bal__op">+</span>') + '<span class="bal__op">→</span>' + r.map((f, i) => term(f, l.length + i)).join('<span class="bal__op">+</span>'); M.kick(); }
      box.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; const [i, d] = b.dataset.d.split(':').map(Number); co[i] = clamp(co[i] + d, 1, 12); render(); c.onChange(); });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g, { L, R } = counts(); S.clear(Pl.bg2); const els = Object.keys(L); const mx = Math.max(...els.map(e => Math.max(L[e], R[e] || 0)), 4);
        els.forEach((e, i) => { const y = 30 + i * (180 / els.length); if (!bars[e]) bars[e] = [K.spring(0, 12), K.spring(0, 12)], M.add(...bars[e]); bars[e][0].set(L[e]); bars[e][1].set(R[e] || 0); const bh = Math.min(30, 150 / els.length);
          K.text(G, e, 380, y + bh / 2 + 5, { a: 'center', w: 800, s: 16 }); G.fillStyle = Pl.blue; G.fillRect(360 - bars[e][0].v / mx * 320, y, bars[e][0].v / mx * 320, bh); G.fillStyle = L[e] === R[e] ? Pl.green : Pl.red; G.fillRect(400, y, bars[e][1].v / mx * 320, bh);
          K.text(G, String(L[e]), 352 - bars[e][0].v / mx * 320, y + bh / 2 + 5, { a: 'right', w: 700 }); K.text(G, String(R[e] || 0), 408 + bars[e][1].v / mx * 320, y + bh / 2 + 5, { w: 700 }); });
        K.text(G, T('reactants', 'المتفاعلات'), 200, 18, { a: 'center', c: Pl.muted, s: 12 }); K.text(G, T('products', 'النواتج'), 560, 18, { a: 'center', c: Pl.muted, s: 12 });
        const ok = els.every(e => L[e] === R[e]) && Object.keys(R).every(e => L[e] === R[e]), g = co.reduce((a, b) => { const f = (x, y) => (y ? f(y, x % y) : x); return f(a, b); }), small = g === 1;
        if (ok) solvedSet.add(ri);
        read.innerHTML = IL(ok ? (small ? `**Balanced!** ${els.map(e => `${e}: ${L[e]} = ${R[e]}`).join(' · ')}.` : `Balanced, but every coefficient can be divided by ${g} — use the **smallest** whole numbers.`) : `Not yet: ${els.filter(e => L[e] !== R[e]).map(e => `${e} ${L[e]} vs ${R[e] || 0}`).join(', ')}.`);
      });
      setup();
      return { destroy() { S.destroy(); }, reset() { ri = 0; ctl.reset(); setup(); }, _set: (i, arr) => { ri = i; setup(); co = arr.slice(); render(); }, _ok: () => { const { L, R } = counts(); return Object.keys(L).every(e => L[e] === R[e]); },
        observe() { const { L, R } = counts(), ok = Object.keys(L).every(e => L[e] === R[e]); return { text: `${ok ? 'Balanced' : 'Not balanced yet'}: ${sides().l.map((f, i) => co[i] + f).join(' + ')} → ${sides().r.map((f, i) => co[sides().l.length + i] + f).join(' + ')}. You have balanced **${solvedSet.size}** reaction(s).`, predOk: ri === 0 && ok ? p => p === 1 : null }; } };
    }
  };

  /* ============ 5 · Titration curve ============ */
  D.titration = { wide: true,
    intro: 'Add sodium hydroxide (0.100 mol/dm³) from a burette to 25.0 cm³ of acid (0.100 mol/dm³). Watch the **pH** and the **indicator colour**. Compare a strong acid (HCl) with a weak one (ethanoic acid).',
    predict: { q: 'Strong acid + strong base: at the exact point of neutralisation the pH is…', options: ['1', '7', '10', '14'] },
    explore: 'Add base slowly through 20–30 cm³ and watch the steep jump. Switch to ethanoic acid: where is the pH at the equivalence point now? Which indicator works for each?',
    explain: 'Before equivalence, acid is in excess; after it, hydroxide is. Near **25.0 cm³** (equal moles) the pH jumps steeply. For **HCl + NaOH** the equivalence point is **pH 7**. For a **weak acid** the solution at equivalence contains ethanoate ions, which are slightly basic, so the equivalence pH is **above 7** (about 8.7 here), and the curve starts higher. An indicator must change colour within the steep part: phenolphthalein suits both; methyl orange only suits the strong acid. pH is calculated from the charge balance with Kw = 1.0 × 10⁻¹⁴ and Ka(ethanoic) = 1.8 × 10⁻⁵ at 25 °C.',
    apply: [q('x-ti1', 'How much 0.100 mol/dm³ NaOH neutralises 20.0 cm³ of 0.100 mol/dm³ HCl?', ['10.0 cm³', '20.0 cm³', '40.0 cm³', '0.100 cm³'], 1, 'Equal concentrations, 1:1 ratio.'), q('x-ti2', 'For a weak acid titrated with a strong base, the equivalence point pH is…', ['below 7', 'exactly 7', 'above 7', 'always 14'], 2, 'The conjugate base is slightly basic.')],
    summary: ['Steep pH jump at equivalence.', 'Strong/strong: pH 7 at equivalence; weak acid/strong base: above 7.', 'Choose an indicator that changes within the jump.'],
    build(host, c) {
      const S = K.stage(host, 800, 380); const sv = K.spring(0, 10); let acid = 'hcl', ind = 'phph';
      const Ca = 0.1, Va = 25, Cb = 0.1, Kw = 1e-14, Ka = 1.8e-5;
      function pH(vb) { const Vt = (Va + vb) / 1000, na = Ca * Va / 1000 / Vt, nb = Cb * vb / 1000 / Vt;
        if (acid === 'hcl') { const ex = na - nb; const h = (ex + Math.sqrt(ex * ex + 4 * Kw)) / 2; return -Math.log10(h); }
        let lo = 1e-14, hi = 1; for (let i = 0; i < 100; i++) { const h = Math.sqrt(lo * hi), f = h + nb - Kw / h - na * Ka / (Ka + h); if (f > 0) hi = h; else lo = h; } return -Math.log10(Math.sqrt(lo * hi)); }
      const IND = { phph: ['Phenolphthalein', v => v < 8.2 ? 'rgba(255,255,255,.0)' : v > 10 ? 'rgba(230,40,140,.75)' : `rgba(230,40,140,${(v - 8.2) / 1.8 * 0.75})`], mo: ['Methyl orange', v => v < 3.1 ? 'rgba(220,40,40,.75)' : v > 4.4 ? 'rgba(240,190,40,.75)' : 'rgba(240,120,40,.75)'], btb: ['Bromothymol blue', v => v < 6 ? 'rgba(220,200,40,.75)' : v > 7.6 ? 'rgba(40,90,220,.75)' : 'rgba(60,170,90,.75)'] };
      const ctl = K.controls(host, [{ k: 'range', id: 'v', label: T('NaOH added', 'NaOH المضاف'), min: 0, max: 50, step: 0.1, val: 0, d: 1, unit: ' cm³' }, { k: 'chips', id: 'acid', label: T('Acid', 'الحمض'), opts: [['hcl', 'HCl (strong)'], ['eth', T('Ethanoic (weak)', 'الإيثانويك (ضعيف)')]], val: 'hcl' }, { k: 'chips', id: 'ind', label: T('Indicator', 'الكاشف'), opts: Object.entries(IND).map(([k, v]) => [k, v[0]]), val: 'phph' }], (id, v) => { if (id === 'v') sv.set(v); if (id === 'acid') acid = v; if (id === 'ind') ind = v; M.kick(); c.onChange(); });
      const read = readout(host);
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g, vb = sv.v, ph = pH(vb); S.clear(Pl.bg2);
        const A = K.axes(G, [330, 20, 450, 320], [0, 50], [0, 14], { xl: 'cm³ NaOH', yl: 'pH', xstep: 10, ystep: 2 });
        K.plot(G, A, pH, 0, 50, Pl.grey, 2, 300); K.plot(G, A, pH, 0, vb, Pl.violet, 3.5, 300); G.fillStyle = Pl.red; G.beginPath(); G.arc(A.X(vb), A.Y(ph), 7, 0, 7); G.fill();
        G.strokeStyle = Pl.muted; G.setLineDash([4, 4]); G.beginPath(); G.moveTo(A.X(25), A.Y(0)); G.lineTo(A.X(25), A.Y(14)); G.stroke(); G.setLineDash([]); K.tag(G, T('equivalence 25.0 cm³', 'التكافؤ'), A.X(25), 30, Pl.muted);
        // burette and flask
        G.fillStyle = Pl.bg; G.fillRect(130, 10, 26, 180); G.strokeStyle = Pl.ink; G.lineWidth = 2; G.strokeRect(130, 10, 26, 180); G.fillStyle = 'rgba(120,160,255,.35)'; G.fillRect(132, 12 + vb / 50 * 176, 22, 176 - vb / 50 * 176);
        for (let i = 0; i <= 5; i++) { G.beginPath(); G.moveTo(156, 12 + i * 35.2); G.lineTo(148, 12 + i * 35.2); G.stroke(); }
        G.beginPath(); G.moveTo(143, 190); G.lineTo(143, 210); G.stroke();
        G.beginPath(); G.moveTo(118, 225); G.lineTo(168, 225); G.lineTo(168, 255); G.lineTo(220, 330); G.lineTo(66, 330); G.lineTo(118, 255); G.closePath(); G.fillStyle = 'rgba(200,220,255,.35)'; G.fill(); G.fillStyle = IND[ind][1](ph); G.fill(); G.stroke();
        read.innerHTML = IL(`**${fmt(vb, 1)} cm³** of NaOH added to ${acid === 'hcl' ? 'hydrochloric' : 'ethanoic'} acid: **pH ${fmt(ph, 2)}**. ${vb < 24.9 ? 'Acid still in excess.' : vb <= 25.1 ? '**Equivalence point.**' : 'Hydroxide in excess.'} At equivalence this pair gives pH **${fmt(pH(25), 2)}**.`);
      }).add(sv);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); acid = 'hcl'; ind = 'phph'; sv.set(0, true); M.draw(); }, _pH: (v, a) => { const o = acid; if (a) acid = a; const r = pH(v); acid = o; return r; },
        observe() { return { text: `With ${acid === 'hcl' ? 'HCl' : 'ethanoic acid'}, pH at 0 cm³ is **${fmt(pH(0), 2)}**, at 24 cm³ **${fmt(pH(24), 2)}**, at 25 cm³ **${fmt(pH(25), 2)}**, at 26 cm³ **${fmt(pH(26), 2)}** — the jump around equivalence.`, predOk: acid === 'hcl' ? p => p === 1 : null }; } };
    }
  };

  /* ============ 6 · Collision theory ============ */
  D.collisions = { wide: true,
    intro: 'Particles of **A** (blue) and **B** (red) bump around. When an A meets a B with enough energy — at least the **activation energy** — they react to form a product (green). Change the **temperature**, the **concentration** and add a **catalyst**, and count how often reactions happen.',
    predict: { q: 'Raising the temperature speeds up a reaction mainly because…', options: ['there are more particles', 'a larger fraction of collisions have enough energy', 'the activation energy rises', 'particles get bigger'] },
    explore: 'Note the reaction rate. Raise the temperature; then return it and raise the concentration; then add the catalyst. Watch the energy histogram: how many particles are beyond the dashed line?',
    explain: 'A reaction needs particles to **collide** with at least the **activation energy (Eₐ)**. Higher **concentration** → more collisions per second. Higher **temperature** → particles move faster, so collisions are more frequent and, much more importantly, a **bigger fraction** of them exceeds Eₐ (the tail of the energy distribution grows). A **catalyst** provides a route with a **lower Eₐ**, so more collisions succeed without being used up. This is a simplified 2D model in arbitrary units.',
    apply: [q('x-co1', 'A catalyst increases the rate by…', ['raising the temperature', 'lowering the activation energy', 'adding more reactant', 'being used up'], 1, 'It offers an alternative pathway.'), q('x-co2', 'Doubling concentration mainly increases…', ['the energy of each collision', 'the frequency of collisions', 'the activation energy', 'nothing'], 1, 'More particles per volume → more collisions.')],
    summary: ['Reactions need collisions with energy ≥ Eₐ.', 'Temperature raises both frequency and (mostly) the fraction of successful collisions.', 'Catalysts lower Eₐ; concentration raises collision frequency.'],
    build(host, c) {
      const S = K.stage(host, 800, 380); let T0 = 1, conc = 30, cat = false, P = [], reacted = [], tsim = 0;
      const ctl = K.controls(host, [{ k: 'range', id: 'T', label: T('Temperature (model)', 'درجة الحرارة'), min: 0.4, max: 2.5, step: 0.05, val: 1, d: 2 }, { k: 'range', id: 'n', label: T('Concentration (particles of each)', 'التركيز'), min: 10, max: 60, step: 1, val: 30 }, { k: 'row' }, { k: 'toggle', id: 'cat', label: T('Catalyst (lower Eₐ)', 'محفّز'), val: false }, { k: 'btn', id: 'refill', label: T('Refill reactants', 'أعد الملء') }, { k: 'end' }], (id, v) => { if (id === 'T') { const k = Math.sqrt(v / T0); P.forEach(p => { p.vx *= k; p.vy *= k; }); T0 = v; } if (id === 'n') { conc = v; fillP(); } if (id === 'cat') cat = v; if (id === 'refill') fillP(); c.onChange(); });
      const read = readout(host);
      function fillP() { P = []; reacted = []; tsim = 0; for (let i = 0; i < conc * 2; i++) { const a = Math.random() * 6.283, s = Math.sqrt(T0) * (60 + Math.random() * 60); P.push({ x: 20 + Math.random() * 440, y: 20 + Math.random() * 340, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: i % 2 ? 'B' : 'A' }); } }
      fillP(); const Ea = () => (cat ? 0.8 : 1.6);
      const M = K.motor(c, host, dt => {
        dt = Math.min(dt, 0.03); tsim += dt; const Pl = K.pal(), G = S.g; S.clear(Pl.bg2);
        P.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < 8 || p.x > 472) { p.vx *= -1; p.x = clamp(p.x, 8, 472); } if (p.y < 8 || p.y > 372) { p.vy *= -1; p.y = clamp(p.y, 8, 372); } });
        for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], b = P[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; if (d2 > 144 || d2 === 0) continue; const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rv <= 0) continue;
          const e = 0.5 * rv * rv / 10000; if (((a.t === 'A' && b.t === 'B') || (a.t === 'B' && b.t === 'A')) && e >= Ea()) { a.t = 'C'; b.t = 'X'; reacted.push(tsim); continue; }
          a.vx -= rv * nx; a.vy -= rv * ny; b.vx += rv * nx; b.vy += rv * ny; }
        P = P.filter(p => p.t !== 'X');
        P.forEach(p => { G.fillStyle = p.t === 'A' ? Pl.blue : p.t === 'B' ? Pl.red : Pl.green; G.beginPath(); G.arc(p.x, p.y, p.t === 'C' ? 7 : 5.5, 0, 7); G.fill(); });
        G.strokeStyle = Pl.ink; G.lineWidth = 2; G.strokeRect(2, 2, 476, 376);
        const es = P.map(p => 0.5 * (p.vx * p.vx + p.vy * p.vy) / 10000), bins = Array(20).fill(0); es.forEach(e => { bins[Math.min(19, Math.floor(e / 0.15))]++; }); const bm = Math.max(...bins, 1);
        const A = K.axes(G, [510, 40, 270, 230], [0, 3], [0, bm], { xl: T('energy', 'الطاقة'), grid: false, ticks: 3 });
        bins.forEach((n, i) => { G.fillStyle = i * 0.15 >= Ea() ? Pl.gold : Pl.grey; G.fillRect(A.X(i * 0.15) + 1, A.Y(n), A.X(0.15) - A.X(0) - 2, A.Y(0) - A.Y(n)); });
        G.strokeStyle = Pl.red; G.setLineDash([5, 4]); G.lineWidth = 2; G.beginPath(); G.moveTo(A.X(Ea()), 40); G.lineTo(A.X(Ea()), 270); G.stroke(); G.setLineDash([]); K.tag(G, `Eₐ${cat ? ' (catalyst)' : ''}`, A.X(Ea()), 50, Pl.red);
        const recent = reacted.filter(t => t > tsim - 3).length / Math.min(3, tsim || 1), nA = P.filter(p => p.t === 'A').length, nC = P.filter(p => p.t === 'C').length;
        K.text(G, `${T('rate', 'المعدل')}: ${fmt(recent, 1)} / s`, 510, 310, { w: 800, s: 18 }); K.text(G, `A left: ${nA} · product: ${nC}`, 510, 336, { c: Pl.muted });
        read.innerHTML = IL(`Temperature **${fmt(T0, 2)}**, ${conc} of each reactant${cat ? ', **catalyst on**' : ''}: about **${fmt(recent, 1)} reactions per second** (last 3 s); ${fmt(es.filter(e => e >= Ea()).length / Math.max(1, es.length) * 100, 0)}% of particles carry at least Eₐ.`);
      });
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); T0 = 1; conc = 30; cat = false; fillP(); M.play(); },
        observe() { const recent = reacted.filter(t => t > tsim - 3).length / Math.min(3, tsim || 1); return { text: `At temperature ${fmt(T0, 2)} with ${conc} of each${cat ? ' and a catalyst' : ''}, the model is reacting at about **${fmt(recent, 1)} per second**; ${reacted.length} reactions so far.`, predOk: p => p === 1 }; } };
    }
  };
})();
