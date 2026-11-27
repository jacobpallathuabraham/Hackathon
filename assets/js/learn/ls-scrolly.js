/* ERLY Learning Studio — SIGNATURE INTERACTIONS: the scroll engine and the lightweight (no-3D) pieces.

   • LS.scrolly(root, update)  a scroll-progress engine for "scrollytelling" sections. The page scrolls normally (no
     hijacking, no wheel capture): each text step is an ordinary block, and progress p ∈ [0, n − 1] is where the reading
     line (55 % down the viewport) falls between the centres of consecutive steps. p is eased towards that target on
     requestAnimationFrame only while the section is on screen (IntersectionObserver), and every visual is a pure
     function of p — so scrolling backwards, jumping or flinging can never leave a model half-way between states.
     The student can take over at any time: play/pause, previous/next stage, a scrub slider, reset, and a switch that
     detaches the model from scrolling. Reduced motion or a narrow screen start detached (manual), with no easing.
   • Chapter hubs (LS.chapterHub) for the chapters that carry a signature interaction; the 3D scenes themselves live in
     ls-signature.js, loaded only when such a section comes near the viewport.
   • The living timeline (history), the chapter path rail (every chapter page) and the Δv construction (circular motion)
     are SVG/HTML and live here. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc, IL = s => (LS.inline ? LS.inline(s) : esc(s));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const narrow = () => innerWidth < 760;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = t => t * t * (3 - 2 * t);
  /* stage(p, i, a, b): 0 before p = i + a, 1 after p = i + b, smooth in between (a, b default 0 → 1) */
  LS.sgK = (p, i, a = 0, b = 1) => sm(clamp((p - i - a) / Math.max(1e-6, b - a), 0, 1));

  /* =============================== the engine =============================== */
  LS.scrolly = function (root, update) {
    const steps = [...root.querySelectorAll('.sg-step')], n = steps.length, ctl = root.querySelector('.sg-ctl');
    const st = { target: 0, disp: -1, manual: reduced() || narrow(), playing: false, raf: 0, last: 0, vis: false, dirty: true, dead: false };
    const $ = s => ctl.querySelector(s), range = $('[data-sg="range"]'), follow = $('[data-sg="follow"]'), playB = $('[data-sg="play"]');
    range.max = String(n - 1); follow.checked = !st.manual;
    const line = () => innerHeight * 0.55;
    function measure() { const L = line(), c = steps.map(s => { const r = s.getBoundingClientRect(); return r.top + r.height / 2; });
      if (L <= c[0]) return 0; if (L >= c[n - 1]) return n - 1; for (let i = 0; i < n - 1; i++) if (L < c[i + 1]) return i + (L - c[i]) / (c[i + 1] - c[i]); return n - 1; }
    function kick() { if (!st.raf && !st.dead) st.raf = requestAnimationFrame(frame); }
    function frame(t) { st.raf = 0; if (st.dead) return; const dt = st.last ? Math.min(0.05, (t - st.last) / 1000) : 1 / 60; st.last = t;
      if (st.playing) { st.target = Math.min(n - 1, st.target + dt * 0.42); if (st.target >= n - 1) setPlay(false); }
      else if (!st.manual && st.dirty) { st.target = measure(); st.dirty = false; }
      const k = reduced() ? 1 : 1 - Math.exp(-dt * 8); let d = st.disp < 0 ? st.target : st.disp + (st.target - st.disp) * k; if (Math.abs(st.target - d) < 5e-4) d = st.target;
      if (d !== st.disp) { st.disp = d; try { update(d); } catch (e) { console.warn('scrolly', e); } ui(); }
      if (st.vis && (st.disp !== st.target || st.playing)) kick(); else st.last = 0; }
    function ui() { const a = Math.round(st.disp); steps.forEach((s, i) => { s.classList.toggle('is-active', i === a); s.classList.toggle('is-past', i < a); if (i === a) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current'); });
      if (document.activeElement !== range) range.value = String(st.disp); range.setAttribute('aria-valuetext', `${T('Stage', 'المرحلة')} ${a + 1} / ${n}: ${(steps[a].querySelector('h3') || {}).textContent || ''}`); $('[data-sg="pos"]').textContent = `${a + 1} / ${n}`; root.style.setProperty('--sg-p', (st.disp / Math.max(1, n - 1)).toFixed(4)); }
    function setManual(m) { st.manual = m; follow.checked = !m; if (!m) { st.dirty = true; kick(); } }
    function setPlay(v) { st.playing = v; playB.textContent = v ? T('Pause', 'إيقاف') : T('Play', 'تشغيل'); playB.setAttribute('aria-pressed', String(v)); if (v) { setManual(true); if (st.target >= n - 1) st.target = 0; st.last = 0; kick(); } }
    const go = p => { setManual(true); setPlay(false); st.target = clamp(p, 0, n - 1); kick(); };
    ctl.addEventListener('click', e => { const b = e.target.closest('[data-sg]'); if (!b) return; const a = b.dataset.sg;
      if (a === 'play') { if (reduced()) { go(Math.min(n - 1, Math.floor(st.target + 1e-6) + 1)); return; } setPlay(!st.playing); }
      if (a === 'prev') go(Math.ceil(st.target - 1e-6) - 1); if (a === 'next') go(Math.floor(st.target + 1e-6) + 1); if (a === 'reset') { go(0); root.dispatchEvent(new CustomEvent('sg-reset')); } });
    range.addEventListener('input', () => go(+range.value)); follow.addEventListener('change', () => { setPlay(false); setManual(!follow.checked); });
    steps.forEach((s, i) => { s.addEventListener('click', e => { if (e.target.closest('a, button, summary, input')) return; go(i); }); });
    const onScroll = () => { if (!st.manual && st.vis) { st.dirty = true; kick(); } };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll, { passive: true });
    const io = new IntersectionObserver(es => { st.vis = es[0].isIntersecting; if (st.vis) { st.dirty = true; kick(); } }, { rootMargin: '10% 0px' }); io.observe(root);
    kick();
    return { set: go, get: () => st.disp, target: () => st.target, manual: () => st.manual, setManual, n,
      destroy() { st.dead = true; cancelAnimationFrame(st.raf); io.disconnect(); removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); } };
  };
  // the section skeleton shared by every signature scene
  LS.sgSection = (kind, title, lead, steps, extra = '') => `<section class="sg" data-sg-kind="${kind}" aria-label="${esc(title)}"><header class="sg-head"><p class="ls-kicker">${T('Signature interaction', 'تفاعل مميز')}</p><h2 class="uv-h2">${esc(title)}</h2><p class="ls-lead">${esc(lead)}</p></header>
    <div class="sg-grid"><div class="sg-stage"><div class="sg-view" role="img" aria-label="${esc(title)}"></div><p class="sg-note" hidden></p>${extra}
      <div class="sg-ctl" role="group" aria-label="${T('Animation controls', 'أدوات التحكم')}"><button type="button" class="ls-btn ls-btn--sm" data-sg="prev" aria-label="${T('Previous stage', 'المرحلة السابقة')}">‹</button><button type="button" class="ls-btn ls-btn--sm ls-btn--accent" data-sg="play" aria-pressed="false">${T('Play', 'تشغيل')}</button><button type="button" class="ls-btn ls-btn--sm" data-sg="next" aria-label="${T('Next stage', 'المرحلة التالية')}">›</button>
        <label class="sg-range"><span class="sr-only">${T('Stage', 'المرحلة')}</span><input type="range" min="0" max="1" step="0.01" value="0" data-sg="range"></label><span class="sg-pos" data-sg="pos">1 / ${steps.length}</span>
        <button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-sg="reset">${T('Reset', 'إعادة')}</button><label class="sg-follow"><input type="checkbox" data-sg="follow"> ${T('Scrolling moves the model', 'التمرير يحرك النموذج')}</label></div></div>
    <ol class="sg-steps">${steps.map(([h, b], i) => `<li class="sg-step" data-i="${i}" tabindex="-1"><p class="sg-step__k">${i + 1}</p><h3>${esc(h)}</h3><div>${IL(b).replace(/&lt;(\/?)sub&gt;/g, '<$1sub>')}</div></li>`).join('')}</ol></div></section>`;

  /* ============ the scene scripts (text). The 3D for each lives in ls-signature.js ============ */
  const P = LS.content || {}, cp = k => (P.cellParts && P.cellParts[k] ? P.cellParts[k][1] : '');
  LS.SG = {
    cell: { t: T('Unfold a plant cell', 'افتح خلية نباتية'), lead: T('Scroll, and a leaf cell opens up layer by layer. Every part stays where it sits in the cell — it only moves apart so you can see it. Select any part to read about it; drag to turn the model.', 'مرّر لتنفتح الخلية طبقة بعد طبقة.'),
      steps: [[T('A leaf cell, complete', 'خلية ورقة كاملة'), T('A palisade cell from a leaf: box-shaped, held by a **cell wall**. Plant cells like this are a few tens of micrometres long.', 'خلية عمادية.')], [T('Cell wall', 'الجدار الخلوي'), cp('wall')], [T('Cell membrane and cytoplasm', 'الغشاء والسيتوبلازم'), cp('membrane') + ' ' + cp('cyto')], [T('Permanent vacuole', 'الفجوة العصارية'), cp('vacuole')], [T('Nucleus', 'النواة'), cp('nucleus')], [T('Organelles, layer by layer', 'العضيات طبقة بعد طبقة'), cp('chloro') + ' ' + cp('mito') + ' ' + cp('ribo')], [T('Inspect it yourself', 'افحصها بنفسك'), T('Every structure is now separated but in its own place. **Select** one to highlight it, **drag** to rotate, or press **Reset** to close the cell again.', 'اختر جزءاً.')]] },
    molecule: { t: T('Take a molecule apart — and build it again', 'فكّك جزيئاً وأعد بناءه'), lead: T('Real bond lengths and bond angles (from measured structures). Scroll to separate the atoms, then watch the bonds form and the shape appear. Choose a molecule below.', 'أطوال وزوايا حقيقية.'),
      steps: [[T('The whole molecule', 'الجزيء كاملاً'), T('Ball-and-stick model, to scale: 1 unit = 100 pm. Drag to turn it.', 'نموذج الكرات والعصي.')], [T('The atoms, apart', 'الذرات منفصلة'), T('Each atom moves outward **along its bond**, so the directions are kept. Colours: hydrogen white, carbon grey, nitrogen blue, oxygen red.', 'كل ذرة تتحرك على امتداد رابطتها.')], [T('Bonds form', 'تتكون الروابط'), T('The atoms come back together and each **covalent bond** — a shared pair of electrons — forms, one at a time. The bond length is shown.', 'تتكون الروابط.')], [T('Shape and angle', 'الشكل والزاوية'), T('Electron pairs around the central atom repel and spread out (**VSEPR**). Lone pairs (shaded) push the bonds closer together, so the angle is smaller than the tetrahedral 109.5°.', 'نظرية تنافر أزواج الإلكترونات.')], [T('Inspect', 'افحص'), T('Drag to rotate. Switch molecules to compare methane (tetrahedral, 109.5°), ammonia (trigonal pyramidal, 106.7°) and water (bent, 104.5°).', 'قارن الجزيئات.')]] },
    solid: { t: T('Unfold a solid into its net', 'افتح المجسم إلى شبكته'), lead: T('Each face turns about the edge it shares with its neighbour, by exactly the angle between them — so the net you see is the true net. Coloured edges show which edges meet when it folds back.', 'كل وجه يدور حول حافته المشتركة.'),
      steps: [[T('The complete solid', 'المجسم كاملاً'), T('Drag to turn it. Choose a cube or a square-based pyramid with equilateral sides.', 'اختر مكعباً أو هرماً.')], [T('The first face opens', 'يُفتح الوجه الأول'), T('A face rotates about the edge it shares with its neighbour.', 'يدور الوجه حول حافته.')], [T('The sides fold down', 'تنثني الجوانب'), T('Cube: every hinge opens by 90° (the angle between adjacent faces). Pyramid: each triangle opens by 180° − 54.7° = 125.3°.', 'زاوية الفتح.')], [T('The net, flat', 'الشبكة مسطحة'), T('All faces lie in one plane: this is the net. A cube has 6 faces; this pyramid has 5.', 'الشبكة.')], [T('Which edges meet?', 'أي الحواف تلتقي؟'), T('Edges with the **same colour** are joined when the net folds back into the solid. Scroll back up to fold it again.', 'الحواف بنفس اللون تلتقي.')]] },
    earth: { t: T('Cut into the Earth', 'اقطع داخل الأرض'), lead: T('Every layer is drawn to scale. Scroll to lift a slice out of the planet and separate its layers.', 'كل طبقة بمقياس صحيح.'),
      steps: [[T('The whole Earth', 'الأرض كاملة'), T('Radius 6,371 km. Everything we know about the deep interior comes mostly from **seismic waves**.', 'نصف القطر 6371 كم.')], [T('A slice is lifted out', 'تُرفع شريحة'), T('A quarter-wedge is lifted away, showing the cut faces of the layers.', 'تُرفع شريحة ربعية.')], [T('The layers separate', 'تنفصل الطبقات'), T('The slice’s layers move apart along the radius, keeping their true thicknesses.', 'تنفصل الطبقات.')], [T('Crust', 'القشرة'), T('0–35 km (a typical continental thickness): drawn to scale, the crust is thinner than the line around the planet.', 'القشرة.')], [T('Mantle', 'الوشاح'), T('Upper mantle 35–660 km and lower mantle 660–2,890 km: solid rock that creeps very slowly.', 'الوشاح.')], [T('Core', 'اللب'), T('Outer core 2,890–5,150 km: **liquid** iron and nickel — its flow makes the magnetic field. Inner core 5,150–6,371 km: **solid**, because of the pressure.', 'اللب.')]] },
    dv: { t: T('Why the acceleration points to the centre', 'لماذا يتجه التسارع نحو المركز'), lead: T('A construction drawn step by step: the speed stays the same, but the velocity changes direction — and that change points inwards.', 'إنشاء خطوة بخطوة.'),
      steps: [[T('The path', 'المسار'), T('An object moves round a circle at **constant speed**.', 'سرعة ثابتة.')], [T('Velocity at A', 'السرعة عند A'), T('Its velocity **v**<sub>A</sub> is along the tangent — at right angles to the radius.', 'على المماس.')], [T('Velocity at B', 'السرعة عند B'), T('A moment later, at B, the velocity **v**<sub>B</sub> has the same length but a new direction.', 'الطول نفسه واتجاه جديد.')], [T('Put the tails together', 'ضع الذيلين معاً'), T('Move **v**<sub>B</sub> (without turning it) so it starts where **v**<sub>A</sub> starts.', 'انقل vB.')], [T('The change Δv', 'التغير Δv'), T('**Δv = v**<sub>B</sub> **− v**<sub>A</sub> joins the tip of v<sub>A</sub> to the tip of v<sub>B</sub>.', 'Δv.')], [T('Shrink the time', 'قلّص الزمن'), T('As B moves closer to A, Δv points **towards the centre**. The acceleration a = Δv/Δt therefore points to the centre, with size **v²/r**.', 'نحو المركز.')]] }
  };

  /* ===================== lazy loading of the 3D signature scenes ===================== */
  let sigP = null; const loadSig = () => sigP || (sigP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'assets/js/learn/ls-signature.js?v=42'; s.onload = () => res(LS.sig); s.onerror = () => { sigP = null; rej(new Error('signature')); }; document.head.appendChild(s); }));
  // mount a 3D signature section once it nears the viewport (no 3D is created for sections the student never reaches)
  function mount3d(sec, kind, cleanups) { let done = false, inst = null; const io = new IntersectionObserver(es => { if (done || !es[0].isIntersecting) return; done = true; io.disconnect();
      loadSig().then(sig => { if (!sec.isConnected) return; inst = sig.mount(kind, sec); }).catch(() => { const n0 = sec.querySelector('.sg-note'); n0.hidden = false; n0.textContent = T('The 3D model could not load — the text explains every stage.', 'تعذر تحميل النموذج.'); }); }, { rootMargin: '600px 0px' });
    io.observe(sec); cleanups.push(() => { io.disconnect(); if (inst) inst.destroy(); }); }
  LS.sgMount3d = mount3d;
  const hub3d = kind => ({ html: () => LS.sgSection(kind, LS.SG[kind].t, LS.SG[kind].lead, LS.SG[kind].steps, kind === 'molecule' ? `<div class="sg-pick" role="radiogroup" aria-label="${T('Molecule', 'الجزيء')}">${[['ch4', 'CH₄ methane'], ['nh3', 'NH₃ ammonia'], ['h2o', 'H₂O water']].map(([k, l], i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-mol="${k}">${l}</button>`).join('')}</div>` : kind === 'solid' ? `<div class="sg-pick" role="radiogroup" aria-label="${T('Solid', 'المجسم')}">${[['cube', T('Cube', 'مكعب')], ['pyr', T('Square pyramid', 'هرم رباعي')]].map(([k, l], i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-solid="${k}">${l}</button>`).join('')}</div>` : ''), mount: (view, ch, cleanups) => { const sec = view.querySelector(`[data-sg-kind="${kind}"]`); if (sec) mount3d(sec, kind, cleanups); } });
  LS.chapterHub = LS.chapterHub || {};
  LS.chapterHub['b-cells'] = hub3d('cell'); LS.chapterHub['c-bonding'] = hub3d('molecule'); LS.chapterHub['m-geometry'] = hub3d('solid'); LS.chapterHub['g-tectonics'] = hub3d('earth');

  /* ===================== Δv construction (SVG, drawn by scroll) — added to the circular-motion landing ===================== */
  LS.sgDv = { html: () => LS.sgSection('dv', LS.SG.dv.t, LS.SG.dv.lead, LS.SG.dv.steps),
    mount(view, ch, cleanups) { const sec = view.querySelector('[data-sg-kind="dv"]'); if (!sec) return; const v = sec.querySelector('.sg-view'), NS = 'http://www.w3.org/2000/svg';
      v.innerHTML = `<svg viewBox="0 0 600 420" class="sg-dv" aria-hidden="true"><defs><marker id="dvA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>
        <circle class="dv-path" cx="230" cy="215" r="150" pathLength="1"/><circle class="dv-c" cx="230" cy="215" r="4"/><text class="dv-l" x="238" y="232">O</text>
        <line class="dv-r dv-rA"/><line class="dv-r dv-rB"/><g class="dv-arc"><path class="dv-sweep"/></g>
        <line class="dv-v dv-vA" marker-end="url(#dvA)"/><line class="dv-v dv-vB" marker-end="url(#dvA)"/><line class="dv-v dv-vB2" marker-end="url(#dvA)"/><line class="dv-dv" marker-end="url(#dvA)"/><line class="dv-in"/>
        <circle class="dv-o dv-oA" r="9"/><circle class="dv-o dv-oB" r="9"/><text class="dv-l dv-tA">A</text><text class="dv-l dv-tB">B</text><text class="dv-l dv-tvA">v<tspan baseline-shift="sub" font-size="70%">A</tspan></text><text class="dv-l dv-tvB">v<tspan baseline-shift="sub" font-size="70%">B</tspan></text><text class="dv-l dv-tdv">Δv</text><text class="dv-l dv-ta"></text></svg>`;
      const q = s => v.querySelector(s), K = LS.sgK, C = [230, 215], R = 150, L0 = 120, set = (el, a) => Object.entries(a).forEach(([k, x]) => el.setAttribute(k, typeof x === 'number' ? x.toFixed(2) : x));
      const pt = a => [C[0] + R * Math.cos(a), C[1] - R * Math.sin(a)], tan = a => [-Math.sin(a), -Math.cos(a)]; // anticlockwise motion (screen y down)
      const line = (el, a, b, k) => { set(el, { x1: a[0], y1: a[1], x2: a[0] + (b[0] - a[0]) * k, y2: a[1] + (b[1] - a[1]) * k }); el.style.opacity = k > 0.01 ? 1 : 0; };
      function update(p) { const aA = Math.PI * 0.5 + 0.0, gap = (60 - 48 * K(p, 4, 0.45, 1)) * Math.PI / 180, aB = aA + gap, A = pt(aA), B = pt(aB), tA = tan(aA), tB = tan(aB);
        q('.dv-path').style.strokeDashoffset = String(1 - K(p, 0, -0.6, 0.6)); q('.dv-c').style.opacity = K(p, 0, -0.5, 0.4);
        const kA = K(p, 1, -0.6, 0.3), kB = K(p, 2, -0.6, 0.3), kM = K(p, 3, -0.5, 0.4), kD = K(p, 4, -0.5, 0.3);
        set(q('.dv-oA'), { cx: A[0], cy: A[1] }); q('.dv-oA').style.opacity = K(p, 0, 0.2, 0.7); set(q('.dv-tA'), { x: A[0] - 26, y: A[1] - 12 }); q('.dv-tA').style.opacity = q('.dv-oA').style.opacity;
        line(q('.dv-rA'), C, A, kA); line(q('.dv-vA'), A, [A[0] + tA[0] * L0, A[1] + tA[1] * L0], kA); set(q('.dv-tvA'), { x: A[0] + tA[0] * L0 - 4, y: A[1] + tA[1] * L0 - 12 }); q('.dv-tvA').style.opacity = kA;
        set(q('.dv-oB'), { cx: B[0], cy: B[1] }); q('.dv-oB').style.opacity = kB; set(q('.dv-tB'), { x: B[0] - 24, y: B[1] + 4 }); q('.dv-tB').style.opacity = kB; line(q('.dv-rB'), C, B, kB); line(q('.dv-vB'), B, [B[0] + tB[0] * L0, B[1] + tB[1] * L0], kB);
        const sw = 34, s0 = [C[0] + sw * Math.cos(aA), C[1] - sw * Math.sin(aA)], s1 = [C[0] + sw * Math.cos(aB), C[1] - sw * Math.sin(aB)]; set(q('.dv-sweep'), { d: `M${s0[0]} ${s0[1]} A${sw} ${sw} 0 0 0 ${s1[0]} ${s1[1]}` }); q('.dv-sweep').style.opacity = kB;
        const base = [B[0] + (A[0] - B[0]) * kM, B[1] + (A[1] - B[1]) * kM]; line(q('.dv-vB2'), base, [base[0] + tB[0] * L0, base[1] + tB[1] * L0], kM > 0.001 ? 1 : 0); q('.dv-vB2').style.opacity = kM > 0.001 ? 1 : 0;
        set(q('.dv-tvB'), kM > 0.5 ? { x: A[0] + tB[0] * L0 + 8, y: A[1] + tB[1] * L0 + 4 } : { x: B[0] + tB[0] * L0 - 6, y: B[1] + tB[1] * L0 - 10 }); q('.dv-tvB').style.opacity = kB;
        const ta = [A[0] + tA[0] * L0, A[1] + tA[1] * L0], tb = [A[0] + tB[0] * L0, A[1] + tB[1] * L0]; line(q('.dv-dv'), ta, tb, kD); set(q('.dv-tdv'), { x: (ta[0] + tb[0]) / 2 + 8, y: (ta[1] + tb[1]) / 2 + 22 }); q('.dv-tdv').style.opacity = kD;
        const kI = K(p, 4, 0.5, 1), mid = [(ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2], dvx = tb[0] - ta[0], dvy = tb[1] - ta[1], dl = Math.hypot(dvx, dvy) || 1; line(q('.dv-in'), mid, [mid[0] + dvx / dl * 170, mid[1] + dvy / dl * 170], kI);
        q('.dv-ta').textContent = T(`Δv makes ${(gap * 90 / Math.PI).toFixed(0)}° with the line to O — 0° as B reaches A`, `Δv يصنع ${(gap * 90 / Math.PI).toFixed(0)}° مع الخط إلى O`); set(q('.dv-ta'), { x: 590, y: 404, 'text-anchor': 'end' }); q('.dv-ta').style.opacity = kD; }
      const sc = LS.scrolly(sec, update); cleanups.push(() => sc.destroy()); }
  };
  // add the Δv construction to the circular-motion chapter's own landing
  const cm = LS.chapterHub['p-circular']; if (cm && !cm._dv) { const h0 = cm.html, m0 = cm.mount; cm.html = ch => h0(ch) + LS.sgDv.html(); cm.mount = (view, ch, cl) => { m0(view, ch, cl); LS.sgDv.mount(view, ch, cl); }; cm._dv = true; }

  /* ===================== the living timeline (history) ===================== */
  LS.chapterHub['h-sources'] = {
    html() { const E = (LS.content && LS.content.bloodHistory) || [], CERT = { documented: T('Well documented', 'موثّق جيداً'), approx: T('Date approximate', 'التاريخ تقريبي') };
      const rows = []; E.forEach((e, i) => { if (i) { const gap = e[0] - E[i - 1][0]; if (gap > 200) rows.push(`<li class="lt-gap" aria-hidden="true"><span>${T('≈ ' + Math.round(gap / 10) * 10 + ' years pass', 'تمر ' + gap + ' سنة تقريباً')}</span></li>`); }
        rows.push(`<li class="lt-ev ${i % 2 ? 'lt-ev--r' : 'lt-ev--l'}" data-i="${i}"><span class="lt-dot" aria-hidden="true"></span><article class="lt-card" tabindex="0"><p class="lt-date">${esc(e[1])}</p><h3>${esc(e[2])}</h3><p>${IL(e[3])}</p><details><summary>${T('Evidence and certainty', 'الدليل ودرجة اليقين')}</summary><p><b>${T('Evidence', 'الدليل')}:</b> ${IL(e[4])}</p><p><span class="lt-cert lt-cert--${e[5]}">${CERT[e[5]] || ''}</span> ${IL(e[6])}</p></details></article></li>`); });
      return `<section class="lt" aria-labelledby="ltH"><header class="sg-head"><p class="ls-kicker">${T('Living timeline', 'خط زمني حي')}</p><h2 class="uv-h2" id="ltH">${T('How we learned how blood moves', 'كيف عرفنا حركة الدم')}</h2><p class="ls-lead">${T('Scroll through nearly 1,800 years of evidence. The line draws itself forward to each turning point; every card shows who, what, the evidence and how sure we can be.', 'مرّر عبر ما يقارب 1800 سنة من الأدلة.')}</p><p><a class="ls-btn ls-btn--quiet ls-btn--sm" href="#/exp/timeline">${T('Open the timeline experience', 'افتح تجربة الخط الزمني')} →</a> <button type="button" class="ls-btn ls-btn--quiet ls-btn--sm" data-lt="all">${T('Show everything at once', 'اعرض كل شيء')}</button></p></header>
        <div class="lt-wrap"><svg class="lt-spine" aria-hidden="true"><path class="lt-track"/><path class="lt-line"/></svg><ol class="lt-list">${rows.join('')}</ol></div></section>`; },
    mount(view, ch, cleanups) { const sec = view.querySelector('.lt'); if (!sec) return; const wrap = sec.querySelector('.lt-wrap'), svg = sec.querySelector('.lt-spine'), track = svg.querySelector('.lt-track'), lineEl = svg.querySelector('.lt-line'), evs = [...sec.querySelectorAll('.lt-ev')];
      let len = 0, ys = [], H = 0, raf = 0, vis = false, all = reduced(), dead = false, drawn = -1;
      function layout() { const r0 = wrap.getBoundingClientRect(), W = r0.width; H = wrap.scrollHeight; const x = narrow() ? 22 : W / 2; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.height = H + 'px';
        ys = evs.map(e => { const d = e.querySelector('.lt-dot').getBoundingClientRect(); return d.top + d.height / 2 - r0.top; }); const dpath = `M${x} 0 L${x} ${H}`; track.setAttribute('d', dpath); lineEl.setAttribute('d', dpath); len = H; lineEl.style.strokeDasharray = `${len} ${len}`; drawn = -1; tick(); }
      function tick() { raf = 0; if (dead) return; const r0 = wrap.getBoundingClientRect(), L = innerHeight * 0.6 - r0.top; const y = all ? H : clamp(L, 0, H);
        if (Math.abs(y - drawn) > 0.5) { drawn = y; lineEl.style.strokeDashoffset = String(len - y); evs.forEach((e, i) => { const on = all || ys[i] <= y + 4; e.classList.toggle('is-on', on); e.classList.toggle('is-cur', !all && on && (i === evs.length - 1 || ys[i + 1] > y + 4)); }); } }
      const onS = () => { if (vis && !raf) raf = requestAnimationFrame(tick); }; addEventListener('scroll', onS, { passive: true });
      const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; onS(); }, { rootMargin: '20% 0px' }); io.observe(sec); const ro = new ResizeObserver(() => layout()); ro.observe(wrap);
      sec.querySelector('[data-lt="all"]').addEventListener('click', e => { all = !all; e.target.setAttribute('aria-pressed', String(all)); e.target.textContent = all ? T('Draw it as I scroll', 'ارسمه أثناء التمرير') : T('Show everything at once', 'اعرض كل شيء'); drawn = -1; tick(); });
      sec.classList.toggle('is-static', all); layout();
      cleanups.push(() => { dead = true; cancelAnimationFrame(raf); removeEventListener('scroll', onS); io.disconnect(); ro.disconnect(); }); }
  };

  /* ===================== the chapter path rail (every chapter page) ===================== */
  // A rail of the chapter's eleven stages drawn up to the student's real progress (LS.prog), animated once when it comes into view.
  LS.sgRail = (view, cleanups) => { const ol = view.querySelector('.uv-steps'); if (!ol || ol.previousElementSibling && ol.previousElementSibling.classList.contains('cr')) return; const items = [...ol.children], n = items.length, done = items.map(li => li.classList.contains('is-done')), last = done.lastIndexOf(true);
    const next = done.indexOf(false), wrap = document.createElement('div'); wrap.className = 'cr'; wrap.setAttribute('role', 'img'); wrap.setAttribute('aria-label', T(`Progress: ${done.filter(Boolean).length} of ${n} stages done`, `التقدم: ${done.filter(Boolean).length} من ${n}`) + (next >= 0 ? T('; next: ', '؛ التالي: ') + items[next].textContent.replace(/^\s*\d+|✓/, '').trim() : ''));
    const W = 1000, x = i => 20 + (W - 40) * i / (n - 1), y = 22, d = `M${x(0)} ${y} L${x(n - 1)} ${y}`;
    wrap.innerHTML = `<svg viewBox="0 0 ${W} 44" preserveAspectRatio="none" aria-hidden="true"><path class="cr-track" d="${d}"/><path class="cr-line" d="M${x(0)} ${y} L${x(Math.max(0, last))} ${y}" pathLength="1"/></svg>${items.map((li, i) => `<a class="cr-dot ${done[i] ? 'is-done' : ''} ${i === next ? 'is-next' : ''}" href="${li.querySelector('a').getAttribute('href')}" style="left:${(x(i) / W * 100).toFixed(3)}%" tabindex="-1" aria-hidden="true"><i>${done[i] ? '✓' : i + 1}</i></a>`).join('')}`;
    ol.parentNode.insertBefore(wrap, ol); const ln = wrap.querySelector('.cr-line'); if (last < 1) ln.style.display = 'none';
    if (reduced()) { wrap.classList.add('is-in'); return; } const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { wrap.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.6 }); io.observe(wrap); cleanups.push(() => io.disconnect()); };
})();
