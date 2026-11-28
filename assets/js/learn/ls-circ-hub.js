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
  /* v45 experiment centre: each family has a colour and a one-line idea; each experiment a small animated drawing */
  const GINFO = [[205, T('Speed, angular speed, period — and why going round at steady speed means accelerating.', 'السرعة والزمن الدوري — ولماذا الحركة الدائرية تسارع.')],
    [165, T('In a level circle something must pull inwards: a string, a tilted string, friction.', 'في دائرة أفقية لا بد من قوة نحو المركز.')],
    [265, T('Gravity joins in: speed and tension change all the way round the loop.', 'الجاذبية تتدخل: تتغير السرعة والشد.')],
    [35, T('Normal forces on bowls and spheres — and the moment contact is lost.', 'قوى التلامس على الأوعية والكرات.')],
    [352, T('Roads, bikes and fairground rides: the same physics, engineered.', 'طرق ودراجات وألعاب: الفيزياء نفسها.')],
    [295, T('Orbits, and a challenge lab that mixes everything.', 'المدارات ومختبر التحدي.')]];
  const el = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
  const mv = (path, body, d = 0, dur = 3) => `<g class="mv" style="offset-path:path('${path}');animation-duration:${dur}s;animation-delay:${-d * dur}s">${body}</g>`;
  const ball = (r = 4.5) => `<circle r="${r}" class="hl"/>`;
  const ART = {
    'cm-ucm': `<circle cx="40" cy="40" r="22" class="ln dash"/><circle cx="40" cy="40" r="2.5" class="dim"/><g class="sp"><line x1="40" y1="40" x2="62" y2="40" class="ln thin"/><line x1="62" y1="40" x2="62" y2="22" class="ar c2"/><line x1="62" y1="40" x2="50" y2="40" class="ar"/><circle cx="62" cy="40" r="5" class="hl"/></g>`,
    'cm-conical': `<line x1="40" y1="10" x2="18" y2="60" class="ln dash"/><line x1="40" y1="10" x2="62" y2="60" class="ln dash"/><path d="${el(40, 60, 22, 6)}" class="ln"/><rect x="30" y="6" width="20" height="4" rx="2" class="dim"/>${mv(el(40, 60, 22, 6), ball())}`,
    'cm-string': `<path d="${el(40, 34, 30, 10)}" class="fill"/><circle cx="40" cy="34" r="2.5" class="dim"/><line x1="40" y1="34" x2="40" y2="58" class="ln thin"/><rect x="34" y="58" width="12" height="12" rx="2" class="c2f"/>${mv(el(40, 34, 20, 6.5), ball(4))}`,
    'cm-table': `<path d="${el(40, 46, 30, 10)}" class="fill"/><rect x="38" y="46" width="4" height="22" class="dim"/>${mv(el(40, 46, 20, 6.5), '<rect x="-5" y="-2.5" width="10" height="5" rx="2.5" class="hl"/>', 0, 2.6)}`,
    'cm-multi': `<path d="${el(40, 46, 32, 11)}" class="fill"/>${mv(el(40, 46, 10, 3.4), '<rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" class="c3f"/>', 0.1, 2.6)}${mv(el(40, 46, 18, 6.2), '<rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" class="c2f"/>', 0.4, 2.6)}${mv(el(40, 46, 26, 9), '<rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" class="hl"/>', 0.7, 2.6)}`,
    'cm-vertical': `<circle cx="40" cy="40" r="24" class="ln dash"/><circle cx="40" cy="40" r="3" class="dim"/><g class="sp"><line x1="40" y1="40" x2="40" y2="16" class="ln"/><circle cx="40" cy="16" r="5.5" class="hl"/></g>`,
    'cm-loop': `<path d="M4 14C18 56 26 68 44 68A17 17 0 1 0 43.9 68L78 68" class="ln"/>${mv('M4 14C18 56 26 68 44 68A17 17 0 1 0 43.9 68L78 68', '<rect x="-5" y="-3" width="10" height="6" rx="2" class="hl"/>', 0, 3.4)}`,
    'cm-bowl': `<path d="M10 24A30 30 0 0 0 70 24" class="ln"/><path d="M10 24A30 30 0 0 0 70 24Z" class="fill"/><path d="${el(40, 40, 22, 5)}" class="ln dash thin"/>${mv(el(40, 40, 22, 5), '<rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" class="hl"/>', 0, 2.4)}`,
    'cm-sphere': `<circle cx="36" cy="54" r="20" class="fill"/><circle cx="36" cy="54" r="20" class="ln"/><line x1="2" y1="76" x2="78" y2="76" class="ln thin"/>${mv('M36 31A23 23 0 0 1 53 39Q66 52 72 74', '<rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" class="hl"/>', 0, 2.6)}`,
    'cm-bank': `<circle cx="40" cy="40" r="30" class="road"/><circle cx="40" cy="40" r="30" class="ln dash thin"/>${mv(el(40, 40, 30, 30), '<rect x="-6" y="-3.5" width="12" height="7" rx="2.5" class="hl"/>', 0, 4)}`,
    'cm-flat': `<path d="M8 72A44 44 0 0 1 52 28" class="road"/>${mv('M8 72A44 44 0 0 1 52 28L78 12', '<rect x="-6" y="-3.5" width="12" height="7" rx="2.5" class="hl"/>', 0, 3)}`,
    'cm-cyclist': `<line x1="4" y1="70" x2="76" y2="70" class="ln thin"/><g class="lean"><circle cx="26" cy="60" r="9" class="ln"/><circle cx="54" cy="60" r="9" class="ln"/><path d="M26 60L38 46L54 60M38 46L50 44" class="ln"/><line x1="38" y1="46" x2="42" y2="28" class="ln c2"/><circle cx="43" cy="24" r="4.5" class="hl"/></g>`,
    'cm-chair': `<line x1="40" y1="12" x2="40" y2="70" class="ln"/><path d="${el(40, 18, 24, 5)}" class="fill"/><path d="${el(40, 44, 32, 8)}" class="ln dash thin"/>${mv(el(40, 44, 32, 8), '<rect x="-4" y="-3" width="8" height="6" rx="1.5" class="hl"/>', 0, 3)}${mv(el(40, 44, 32, 8), '<rect x="-4" y="-3" width="8" height="6" rx="1.5" class="c2f"/>', 0.5, 3)}`,
    'cm-orbit': `<path d="${el(40, 40, 30, 17)}" class="ln dash"/><circle cx="40" cy="40" r="9" class="c2f"/>${mv(el(40, 40, 30, 17), ball(3.5), 0, 5)}`,
    'cm-challenge': `<g class="pulse"><circle cx="40" cy="40" r="26" class="ln"/><circle cx="40" cy="40" r="17" class="ln"/><circle cx="40" cy="40" r="8" class="hl"/></g><path d="M64 14L44 36" class="ar c2"/>`
  };
  const art = id => `<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">${ART[id] || ART['cm-ucm']}</svg>`;
  const FORM = ['v = ωr · T = 2π/ω · f = 1/T', 'a = v²/r = ω²r (towards the centre)', 'F<sub>net</sub> = m v²/r — the resultant of real forces', 'banked: tan θ = v²/(rg) · flat: v<sub>max</sub> = √(μgr)', 'conical: ω² = g/(L cos θ)', 'vertical: T = m(v²/R + g cos φ); v₀ ≥ √(5gR)', 'sphere: leaves at cos θ = 2/3', 'orbit: v = √(GM/r), T² ∝ r³'];
  const xs = () => LS.experiences || [];
  /* filters: one family (or all), free-text search, and "not opened yet"; the count is announced politely */
  function centre(view, cleanups) { const box = view.querySelector('.cmx'); if (!box) return; let fam = 'all', q = '', todo = false;
    const chips = [...box.querySelectorAll('[data-cmx-f]')], inp = box.querySelector('[data-cmx-q]'), td = box.querySelector('[data-cmx-todo]'), cnt = box.querySelector('[data-cmx-count]'), empty = box.querySelector('[data-cmx-empty]');
    const apply = () => { let shown = 0; box.querySelectorAll('.cmh-group').forEach(g => { const famOk = fam === 'all' || g.dataset.cmxG === fam; let n = 0;
        g.querySelectorAll('.cmx-card').forEach(c => { const ok = famOk && (!q || c.dataset.cmxT.includes(q)) && (!todo || !c.classList.contains('is-seen')); c.hidden = !ok; if (ok) n++; }); g.hidden = !n; shown += n; });
      cnt.textContent = shown + ' ' + T(shown === 1 ? 'experiment shown' : 'experiments shown', 'تجارب معروضة'); empty.hidden = shown > 0; box.classList.add('is-filtered'); };
    chips.forEach(b => b.addEventListener('click', () => { fam = b.dataset.cmxF; chips.forEach(c => c.setAttribute('aria-pressed', String(c === b))); apply(); }));
    let tq = 0; inp.addEventListener('input', () => { clearTimeout(tq); tq = setTimeout(() => { q = inp.value.trim().toLowerCase(); apply(); }, 120); }); cleanups.push(() => clearTimeout(tq));
    td.addEventListener('click', () => { todo = !todo; td.setAttribute('aria-pressed', String(todo)); apply(); });
    cnt.textContent = box.querySelectorAll('.cmx-card').length + ' ' + T('experiments', 'تجارب'); }
  LS.chapterHub = LS.chapterHub || {};
  LS.chapterHub['p-circular'] = {
    html(ch) { const seen = LS.prog.d().seen, n = ch.items.filter(i => seen[i]).length, a = LS.prog.d().assess[ch.id];
      return `<div class="cmh"><div class="cmh__scene" data-cmh-scene role="img" aria-label="${T('A ball moving in a circle: its velocity is along the tangent and the net force points to the centre.', 'كرة تتحرك في دائرة: السرعة مماسية والمحصلة نحو المركز.')}"><p class="cmh__cap">${T('Velocity (cyan) is always along the tangent; the net force (white) always points to the centre.', 'السرعة (سماوي) على المماس؛ المحصلة (أبيض) نحو المركز.')}</p></div>
        <section class="uv-card"><h2 class="uv-h3">${T('Key formulas', 'المعادلات الأساسية')}</h2><div class="cmh__formulas">${FORM.map(x => `<span>${x}</span>`).join('')}</div>
        <h2 class="uv-h3">${T('Your progress', 'تقدّمك')}</h2><div class="cmh__prog" role="progressbar" aria-valuemin="0" aria-valuemax="${ch.items.length}" aria-valuenow="${n}" aria-label="${T('Experiments opened', 'التجارب المفتوحة')}"><i style="width:${Math.round(100 * n / ch.items.length)}%"></i></div><p class="v26-hint">${n} / ${ch.items.length} ${T('experiments opened', 'تجارب فُتحت')}${a ? ' · ' + T('chapter check best', 'أفضل نتيجة') + ' ' + Math.round(a.best * 100) + '%' : ''}</p>
        <p class="ls-row"><a class="ls-btn ls-btn--accent" href="#/exp/cm-ucm">${T('Start with the fundamentals', 'ابدأ بالأساسيات')} →</a> <a class="ls-btn ls-btn--quiet" href="#/exp/cm-challenge">${T('Challenge lab', 'مختبر التحدي')}</a></p></section></div>
        <section class="uv-sec cmx" aria-labelledby="cmxH"><div class="cmx__head"><div><p class="at-k">${T('Experiment centre', 'مركز التجارب')}</p><h2 class="uv-h2" id="cmxH">${T('Choose an experiment', 'اختر تجربة')}</h2><p class="cmx__lead">${ch.items.length} ${T('hands-on 3D experiments in six families. Filter, search, or follow the order — every one runs live.', 'تجربة ثلاثية الأبعاد في ست مجموعات.')}</p></div></div>
        <div class="cmx__tools"><div class="cmx__chips" role="group" aria-label="${T('Show experiments from', 'اعرض تجارب')}"><button type="button" class="cmx-chip" data-cmx-f="all" aria-pressed="true">${T('All', 'الكل')} <span>${GROUPS.reduce((a, g) => a + g[1].length, 0)}</span></button>${GROUPS.map(([g, ids], k) => `<button type="button" class="cmx-chip" data-cmx-f="${k}" aria-pressed="false" style="--hue:${GINFO[k][0]}"><i aria-hidden="true"></i>${g} <span>${ids.length}</span></button>`).join('')}</div>
          <div class="cmx__row"><label class="cmx__search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input type="search" data-cmx-q placeholder="${T('Search experiments…', 'ابحث في التجارب…')}" aria-label="${T('Search experiments', 'ابحث في التجارب')}" autocomplete="off"></label><button type="button" class="cmx-chip cmx-chip--todo" data-cmx-todo aria-pressed="false">${T('Not opened yet', 'لم تُفتح بعد')}</button></div></div>
        <p class="cmx__count" data-cmx-count aria-live="polite"></p>
        <div class="cmh-groups cmx__groups">${(() => { let n = 0; const next = GROUPS.flatMap(g => g[1]).find(id => !seen['x:' + id]); return GROUPS.map(([g, ids], k) => { const done = ids.filter(id => seen['x:' + id]).length; return `<section class="cmh-group" data-cmx-g="${k}" style="--hue:${GINFO[k][0]};--gi:${k}" aria-labelledby="cmxG${k}"><header class="cmh-group__h"><span class="cmh-group__n" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span><div><h3 id="cmxG${k}">${g}</h3><p>${GINFO[k][1]}</p></div><span class="cmh-group__c" title="${T('opened', 'فُتحت')}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15"/><circle cx="18" cy="18" r="15" class="on" style="stroke-dasharray:${(94.25 * done / ids.length).toFixed(1)} 94.25"/></svg><b>${done}/${ids.length}</b><span class="sr-only"> ${T('opened', 'فُتحت')}</span></span></header>
          <ul class="cmh-exps">${ids.map(id => { const x = xs().find(e => e.id === id) || { title: id, hook: '', mins: 0 }, sn = !!seen['x:' + id], nx = id === next; n++; return `<li class="cmx-card${sn ? ' is-seen' : ''}${nx ? ' is-next' : ''}" data-cmx-id="${id}" data-cmx-t="${esc((x.title + ' ' + x.hook).toLowerCase())}" style="--i:${n}"><a href="#/exp/${id}" data-cm-exp="${id}"><span class="cmx-art">${art(id)}</span><span class="cmx-body"><b>${esc(x.title)}</b><span>${esc(x.hook)}</span><small>${x.mins} min · ${T('3D experiment', 'تجربة ثلاثية الأبعاد')}${sn ? ` · <em>${T('opened', 'فُتحت')} ✓</em>` : ''}${nx ? ` · <strong>${T('next up', 'التالي')}</strong>` : ''}</small></span><span class="cmx-go" aria-hidden="true">→</span></a></li>`; }).join('')}</ul></section>`; }).join(''); })()}</div>
        <p class="cmx__empty" data-cmx-empty hidden>${T('No experiment matches — clear the search or pick another family.', 'لا توجد تجربة مطابقة.')}</p></section>`; },
    mount(view, ch, cleanups) { centre(view, cleanups); if (LS.warmExp) { const ric = window.requestIdleCallback || (f => setTimeout(f, 300)); ric(() => { if (view.isConnected) LS.warmExp(); }, { timeout: 1500 }); }
      const host = view.querySelector('[data-cmh-scene]'); if (!host || !LS.has3d || !LS.has3d()) return; let S = null, dead = false; cleanups.push(() => { dead = true; if (S) S.destroy(); });
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
