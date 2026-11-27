/* ERLY Learning Studio — the Circular Motion chapter landing (#/chapter/p-circular): a live 3D scene, the key formulas,
   chapter progress and the fifteen experiments grouped by kind. Plugs into the chapter page through LS.chapterHub. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc;
  const GROUPS = [
    [T('Fundamentals', 'الأساسيات'), ['cm-ucm']],
    [T('Horizontal circular motion', 'الحركة الدائرية الأفقية'), ['cm-conical', 'cm-string', 'cm-table', 'cm-multi']],
    [T('Vertical circular motion', 'الحركة الدائرية الرأسية'), ['cm-vertical', 'cm-loop']],
    [T('Curved surfaces', 'الأسطح المنحنية'), ['cm-bowl', 'cm-sphere']],
    [T('Vehicles, sports and rides', 'المركبات والرياضة والألعاب'), ['cm-bank', 'cm-flat', 'cm-cyclist', 'cm-chair']],
    [T('Advanced', 'متقدم'), ['cm-orbit', 'cm-challenge']]
  ];
  LS.circGroups = GROUPS;
  const FORM = ['v = ωr · T = 2π/ω · f = 1/T', 'a = v²/r = ω²r (towards the centre)', 'F<sub>net</sub> = m v²/r — the resultant of real forces', 'banked: tan θ = v²/(rg) · flat: v<sub>max</sub> = √(μgr)', 'conical: ω² = g/(L cos θ)', 'vertical: T = m(v²/R + g cos φ); v₀ ≥ √(5gR)', 'sphere: leaves at cos θ = 2/3', 'orbit: v = √(GM/r), T² ∝ r³'];
  const xs = () => LS.experiences || [];
  LS.chapterHub = LS.chapterHub || {};
  LS.chapterHub['p-circular'] = {
    html(ch) { const seen = LS.prog.d().seen, n = ch.items.filter(i => seen[i]).length, a = LS.prog.d().assess[ch.id];
      return `<div class="cmh"><div class="cmh__scene" data-cmh-scene role="img" aria-label="${T('A ball moving in a circle: its velocity is along the tangent and the net force points to the centre.', 'كرة تتحرك في دائرة: السرعة مماسية والمحصلة نحو المركز.')}"><p class="cmh__cap">${T('Velocity (cyan) is always along the tangent; the net force (white) always points to the centre.', 'السرعة (سماوي) على المماس؛ المحصلة (أبيض) نحو المركز.')}</p></div>
        <section class="uv-card"><h2 class="uv-h3">${T('Key formulas', 'المعادلات الأساسية')}</h2><div class="cmh__formulas">${FORM.map(x => `<span>${x}</span>`).join('')}</div>
        <h2 class="uv-h3">${T('Your progress', 'تقدّمك')}</h2><div class="cmh__prog" role="progressbar" aria-valuemin="0" aria-valuemax="${ch.items.length}" aria-valuenow="${n}" aria-label="${T('Experiments opened', 'التجارب المفتوحة')}"><i style="width:${Math.round(100 * n / ch.items.length)}%"></i></div><p class="v26-hint">${n} / ${ch.items.length} ${T('experiments opened', 'تجارب فُتحت')}${a ? ' · ' + T('chapter check best', 'أفضل نتيجة') + ' ' + Math.round(a.best * 100) + '%' : ''}</p>
        <p class="ls-row"><a class="ls-btn ls-btn--accent" href="#/exp/cm-ucm">${T('Start with the fundamentals', 'ابدأ بالأساسيات')} →</a> <a class="ls-btn ls-btn--quiet" href="#/exp/cm-challenge">${T('Challenge lab', 'مختبر التحدي')}</a></p></section></div>
        <section class="uv-sec"><h2 class="uv-h2">${T('Choose an experiment', 'اختر تجربة')}</h2><div class="cmh-groups">${GROUPS.map(([g, ids]) => `<div class="cmh-group"><h3>${g}</h3><ul class="cmh-exps">${ids.map(id => { const x = xs().find(e => e.id === id) || { title: id, hook: '', mins: 0 }; return `<li class="${seen['x:' + id] ? 'is-seen' : ''}"><a href="#/exp/${id}" data-cm-exp="${id}"><b>${esc(x.title)}</b><span>${esc(x.hook)}</span><small>${x.mins} min · ${T('3D experiment', 'تجربة ثلاثية الأبعاد')}</small></a></li>`; }).join('')}</ul></div>`).join('')}</div></section>`; },
    mount(view, ch, cleanups) { const host = view.querySelector('[data-cmh-scene]'); if (!host || !LS.has3d || !LS.has3d()) return; let S = null, dead = false; cleanups.push(() => { dead = true; if (S) S.destroy(); });
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
      LS.scene3d(host, { cls: 'cmh-3d', bg: 0x070a16, cam: [0, 3.4, 5.2], target: [0, 0.2, 0], aspect: 0.62, shadows: false, label: T('Circular motion', 'الحركة الدائرية'), maxPolar: Math.PI * 0.49, minDist: 3, maxDist: 12, pan: false }).then(s => { if (dead || !host.isConnected) { s.destroy(); return; } S = s; const THREE = S.THREE, R = 1.6;
        const sp = new Float32Array(3 * 900); for (let i = 0; i < 900; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = 40; sp[i * 3] = r * Math.sqrt(1 - u * u) * Math.cos(a); sp[i * 3 + 1] = r * u; sp[i * 3 + 2] = r * Math.sqrt(1 - u * u) * Math.sin(a); } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); S.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfdcff, size: 1.2, sizeAttenuation: false })));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 8, 200), new THREE.MeshStandardMaterial({ color: 0x6ea8ff, emissive: 0x2a4fa0, emissiveIntensity: 1 })); ring.rotation.x = Math.PI / 2; S.scene.add(ring);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshBasicMaterial({ color: 0x3a5ab8, transparent: true, opacity: 0.08, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2; S.scene.add(disc);
        const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8899cc, emissiveIntensity: 0.6, metalness: 0.6 })); S.scene.add(hub);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 40, 24), new THREE.MeshPhysicalMaterial({ color: 0xff7a4d, roughness: 0.2, metalness: 0.3, clearcoat: 1 })); S.scene.add(ball);
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), new THREE.MeshStandardMaterial({ color: 0xf2efe6 })); S.scene.add(str);
        const vA = LS.arrow3d(THREE, 0x6ff3ff, 0.03), fA = LS.arrow3d(THREE, 0xffffff, 0.035); S.scene.add(vA, fA);
        const N = 140, tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); const tl = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffb07a, transparent: true, opacity: 0.85 })); S.scene.add(tl);
        const lv = LS.label3d(THREE, 'v', { h: 0.22, color: '#6ff3ff' }), lf = LS.label3d(THREE, 'F = mv²/r', { h: 0.2 }); S.scene.add(lv, lf);
        const up = new THREE.Vector3(0, 1, 0); let th = 0;
        const place = () => { const x = R * Math.cos(th), z = -R * Math.sin(th), p = new THREE.Vector3(x, 0, z); ball.position.copy(p); const d = p.clone(), L = d.length(); str.scale.set(1, L, 1); str.position.copy(p).multiplyScalar(0.5); str.quaternion.setFromUnitVectors(up, d.normalize());
          const t = new THREE.Vector3(-Math.sin(th), 0, -Math.cos(th)); vA.set(p.clone().add(new THREE.Vector3(0, 0.02, 0)), t, 1.1); fA.set(p.clone().add(new THREE.Vector3(0, 0.02, 0)), p.clone().negate().normalize(), 0.9); lv.position.copy(p).addScaledVector(t, 1.3).add(new THREE.Vector3(0, 0.12, 0)); lf.position.copy(p).multiplyScalar(0.28).add(new THREE.Vector3(0, 0.25, 0));
          const a = tg.attributes.position.array; for (let i = 0; i < N; i++) { const q = th - (N - 1 - i) * 0.012; a[i * 3] = R * Math.cos(q); a[i * 3 + 1] = 0; a[i * 3 + 2] = -R * Math.sin(q); } tg.attributes.position.needsUpdate = true; };
        place(); S.render(); if (!still) { S.always = true; S.tick = dt => { th += dt * 0.9; place(); return true; }; S.start(); } }).catch(() => { /* the page works without the scene */ }); }
  };
})();
