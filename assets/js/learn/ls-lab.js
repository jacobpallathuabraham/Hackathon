/* ERLY Learning Studio — Visual Learning Lab.
   A catalogue over every computed model in Noor Lab (assets/js/lab/: one engine, one model, the same one Noor
   uses in chat), organised by subject, with a coverage map that says plainly which topics have a model and which
   are not built yet. Each model page gives the goal, the live model (controls, readouts, reset, its own
   explanation), what it assumes, related lesson questions, and Noor. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, IL = LS.inline;
  // topics named in the Studio brief → the model that covers each (null = not built yet; listed honestly)
  const MAP = {
    Mathematics: [['Coordinate plane & function plotter', 'graph'], ['Equation solver / visualiser', 'algebra'], ['Algebra balance model', 'balance'], ['Fraction visualiser', 'fractions'], ['Ratio and proportion explorer', null], ['Geometry constructions', 'geometry'], ['Angles and the unit circle', 'unitcircle'], ['Transformations of graphs', 'transform'], ['Probability simulator', 'stats'], ['Statistics explorer', 'stats'], ['Trigonometric functions', 'trigfn'], ['Calculus: derivatives', 'secant'], ['Calculus: integrals and areas', 'calculus'], ['Vectors', 'vectors'], ['Matrices as transformations', 'matrix'], ['Quadratics', 'quadratic'], ['3D surfaces and gradients', 'gradient']],
    Physics: [['Motion in one dimension', 'kin1d'], ['Projectile motion', 'projectile'], ['Newton’s laws and friction', 'newton'], ['Forces on an incline', 'incline'], ['Momentum and collisions', 'collision'], ['Energy transformations', 'coaster'], ['Waves and interference', 'waves'], ['Sound (resonance)', 'resonance'], ['Optics: lenses and mirrors', 'optics'], ['Electric circuits', 'circuit'], ['Magnetic fields', 'bfield'], ['Electromagnetic induction', 'induction'], ['Thermodynamics (P–V cycles)', 'pvcycle'], ['Gas laws', 'gas'], ['Gravity and orbits', 'orbit'], ['Oscillations (spring, pendulum)', 'spring'], ['Electromagnetic waves', 'emwave']],
    Biology: [['Cell explorer (organelles)', 'cell'], ['Cell division', 'celldiv'], ['Circulatory system: cardiac cycle', 'heart'], ['Respiratory system: oxygen transport', 'o2curve'], ['Digestive system: enzymes and pH', 'digestph'], ['Nervous system: action potential', 'actionpot'], ['Skeletal and muscular systems', null], ['DNA structure', 'dna'], ['Genetics: Punnett squares', 'punnett'], ['Evolution: Hardy–Weinberg', 'hardyweinberg'], ['Ecology: populations', 'predprey'], ['Ecological pyramids', 'pyramid'], ['Photosynthesis: limiting factors', 'photorate'], ['Cellular respiration', null], ['Enzyme kinetics', 'enzyme'], ['Microscopy-style exploration', null]],
    Chemistry: [['Interactive periodic table (trends)', 'periodic'], ['Atomic structure (Bohr model)', 'bohr'], ['Electron configuration and orbitals', 'orbitals'], ['Molecular geometry (VSEPR, 3D)', 'molecule'], ['Chemical bonding (MO theory)', 'motheory'], ['Reaction balancing', 'balancer'], ['Stoichiometry (limiting reagent)', 'limiting'], ['Acids and bases (titration)', 'titration'], ['Chemical equilibrium', 'equilibrium'], ['Organic structures (conformations)', 'conform'], ['Reaction-energy diagrams', 'eprofile'], ['Reaction kinetics', 'kinetics']]
  };
  const SUBJ = { Maths: 'Mathematics', Physics: 'Physics', Chemistry: 'Chemistry', Biology: 'Biology', Medicine: 'Medicine', Economics: 'Economics', Statistics: 'Statistics', Engineering: 'Engineering', Computing: 'Computer science', 'Computer science': 'Computer science', Environment: 'Geography & environment', Commerce: 'Economics' };
  const engines = () => (window.ERLY_LAB ? ERLY_LAB.engines : []);
  const has = id => id && engines().some(e => e.id === id);
  const subjOf = e => { const k = String(e.kind || '').split('·')[0].trim(); return SUBJ[k] || k || 'Other'; };
  // a lesson block that uses this model gives the best goal, things to try and assumptions
  const lessonUse = id => { for (const L of LS.lessons) for (const s of L.sections) for (const b of s.blocks) if (b.k === 'lab' && b.engine === id) return { L, s, b }; return null; };

  function catalogue(view) {
    const q = (LS._labq || '').toLowerCase(), subj = LS._labs || 'All';
    const all = engines().map(e => ({ id: e.id, title: e.title || e.id, kind: e.kind || '', subject: subjOf(e) }));
    const subjects = ['All'].concat([...new Set(all.map(x => x.subject))].sort());
    const shown = all.filter(x => (subj === 'All' || x.subject === subj) && (!q || (x.title + ' ' + x.kind).toLowerCase().includes(q))).sort((a, b) => a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title));
    const cov = Object.entries(MAP).map(([s, rows]) => ({ s, rows, built: rows.filter(r => has(r[1])).length }));
    view.innerHTML = `<div class="ls-labcat"><header class="ls-pagehead"><p class="ls-kicker">${T('Visual Learning Lab', 'مختبر التعلم المرئي')}</p><h1>${T('Learn by changing things', 'تعلّم بتغيير الأشياء')}</h1><p class="ls-lead">${all.length} ${T('computed models — each one calculates what you see from real equations, explains its live numbers and can be reset. Noor uses the same models in chat.', 'نموذجاً محسوباً.')}</p></header>
      <section class="ls-panel"><h2 class="ls-h2">${T('Coverage map', 'خريطة التغطية')}</h2><p class="ls-muted">${T('What each core subject has today. “Not built yet” means exactly that — no model exists for it in ERLY.', '“لم يُبنَ بعد” تعني عدم وجود نموذج.')}</p>
        <div class="ls-cov">${cov.map(c => `<details class="ls-cov__s"><summary><b>${esc(c.s)}</b> <span class="ls-muted">${c.built} / ${c.rows.length} ${T('topics have a model', 'موضوعاً له نموذج')}</span></summary><ul>${c.rows.map(([label, id]) => has(id) ? `<li><a href="#/lab/${id}">${esc(label)}</a></li>` : `<li class="is-missing">${esc(label)} <span class="ls-tag ls-tag--muted">${T('not built yet', 'لم يُبنَ بعد')}</span></li>`).join('')}</ul></details>`).join('')}</div></section>
      <section class="ls-panel"><div class="ls-row ls-row--between"><h2 class="ls-h2">${T('All models', 'كل النماذج')} (${shown.length})</h2><div class="ls-row"><label class="ls-search"><span class="sr-only">${T('Search models', 'ابحث')}</span><input type="search" data-labq value="${esc(LS._labq || '')}" placeholder="${T('Search models…', 'ابحث…')}"></label><label>${T('Subject', 'المادة')} <select data-labs>${subjects.map(s => `<option ${s === subj ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label></div></div>
        <ul class="ls-modlist">${shown.map(x => `<li><a href="#/lab/${x.id}"><b>${esc(x.title)}</b><small>${esc(x.kind)}</small></a></li>`).join('') || `<li class="ls-muted">${T('No models match.', 'لا نماذج مطابقة.')}</li>`}</ul></section></div>`;
    const root = view.querySelector('.ls-labcat');
    root.addEventListener('input', e => { if (e.target.matches('[data-labq]')) { LS._labq = e.target.value; clearTimeout(catalogue.t); catalogue.t = setTimeout(() => { LS.render(); const s = document.querySelector('[data-labq]'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 250); } });
    root.addEventListener('change', e => { if (e.target.matches('[data-labs]')) { LS._labs = e.target.value; LS.render(); } });
  }

  function model(view, id) {
    const e = engines().find(x => x.id === id); if (!e) { view.innerHTML = `<section class="ls-empty"><h1>${T('Model not found', 'النموذج غير موجود')}</h1><a class="ls-btn" href="#/lab">${T('Visual Learning Lab', 'المختبر')}</a></section>`; return; }
    const use = lessonUse(id), qs = use ? LS.bank().filter(q => q.lesson === use.L.id).slice(0, 3) : [];
    view.innerHTML = `<div class="ls-labpage"><header class="ls-pagehead"><a class="ls-linkbtn" href="#/lab">← ${T('Visual Learning Lab', 'المختبر')}</a><p class="ls-kicker">${esc(e.kind || '')}</p><h1>${esc(e.title || e.id)}</h1></header>
      <div class="ls-labpage__grid"><section class="ls-panel ls-labpage__model"><div class="ls-labcard__host" data-host></div></section>
      <aside class="ls-labpage__side"><section class="ls-panel"><h2 class="ls-h2">${T('Goal', 'الهدف')}</h2><p>${use ? IL(use.b.objective) : T('Change the controls and watch how the model responds. The explanation under the model is written from its live numbers.', 'غيّر الأدوات وراقب النموذج.')}</p>${use && use.b.try ? `<h3 class="ls-h3">${T('Try this', 'جرّب')}</h3><ul>${use.b.try.map(t => `<li>${IL(t)}</li>`).join('')}</ul>` : ''}${use && use.b.assume ? `<h3 class="ls-h3">${T('Assumptions', 'الافتراضات')}</h3><p>${IL(use.b.assume)}</p>` : `<p class="ls-muted ls-small">${T('The model states its own assumptions and equations in its explanation panel.', 'يذكر النموذج افتراضاته في شرحه.')}</p>`}
        <div class="ls-row"><button type="button" class="ls-btn ls-btn--sm" data-reset>${T('Reset the model', 'أعد النموذج')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-asknoor>${T('Ask Noor about this model', 'اسأل نور')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-snap>${T('Save a snapshot to my notebook', 'احفظ لقطة')}</button></div></section>
        ${use ? `<section class="ls-panel"><h2 class="ls-h2">${T('Used in a lesson', 'مستخدم في درس')}</h2><p><a href="#/lesson/${use.L.id}/${use.s.id}">${esc(use.L.title)} — ${esc(use.s.title)}</a></p></section>` : ''}
        <section class="ls-panel"><h2 class="ls-h2">${T('Check your understanding', 'تحقق من فهمك')}</h2><div class="ls-labqs"></div>${qs.length ? '' : `<p class="ls-muted">${T('No ERLY questions are written for this model yet.', 'لا أسئلة بعد لهذا النموذج.')}</p><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-genq>${T('Ask Noor for practice questions', 'اطلب أسئلة من نور')}</button>`}</section></aside></div>
      <p class="ls-muted ls-small">${T('Accessible alternative: every model lists its live values as text below the drawing, and every control is a labelled slider or menu.', 'بديل نصي متاح لكل نموذج.')}</p></div>`;
    const host = view.querySelector('[data-host]');
    LS.mountModel(host, id, use && use.b.params ? use.b.params : {}, { title: e.title });
    const qh = view.querySelector('.ls-labqs'); qs.forEach(q => LS.activity(qh, q, { from: 'practice', lesson: q.lesson, topic: q.topic, subject: q.subject, lessonTitle: q.lessonTitle }));
    view.querySelector('.ls-labpage').addEventListener('click', ev => {
      if (ev.target.closest('[data-reset]')) { const c = window.ERLY_LAB && ERLY_LAB.current(); if (c && c.inst.reset) { c.inst.reset(); LS.announce(T('Model reset.', 'أُعيد النموذج.')); } else LS.mountModel(host, id, use && use.b.params ? use.b.params : {}); }
      if (ev.target.closest('[data-asknoor]')) LS.noor.ask('model', { engine: id, lesson: use && use.L });
      if (ev.target.closest('[data-genq]')) LS.noor.ask('practice', { text: e.title });
      if (ev.target.closest('[data-snap]')) { const s = window.ERLY_LAB && ERLY_LAB.snapshot(); if (!s) return; LS.notes.create({ title: 'Model snapshot: ' + (e.title || id), html: `${s.png ? `<p>Snapshot taken ${new Date().toLocaleString()}.</p>` : ''}<p>Settings: ${esc(JSON.stringify((s.params && s.params.set) || {}))}</p><p><a href="#/lab/${id}">Open the model again</a></p>`, folder: 'Diagrams', src: { type: 'lab', id, title: e.title, where: '#/lab/' + id } }); LS.toast(T('Snapshot saved to your notebook.', 'حُفظت اللقطة.')); }
    });
  }
  LS.labMap = MAP;
  LS.route('lab', (view, parts) => {
    if (!window.ERLY_LAB && LS.needLab) { // the models load on first use (ls-lazy.js)
      view.innerHTML = `<p class="ls-loading" role="status"><span class="ls-spin" aria-hidden="true"></span>${T('Loading the Visual Lab…', 'أحمّل المختبر…')}</p>`;
      LS.needLab().then(() => { if (LS.current()[0] === 'lab') LS.render(); }).catch(() => { view.innerHTML = `<p class="ls-fb ls-fb--warn" role="alert">${T('The Visual Lab could not load. Check your connection and try again.', 'تعذّر تحميل المختبر.')}</p>`; });
      return;
    }
    return parts[0] ? model(view, parts[0]) : catalogue(view);
  });
})();
