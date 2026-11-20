/* ERLY Learning Studio — Explore: subject worlds, topics, Discover, experiences and the Discovery Archive.

   The experience REGISTRY lives here (small, loaded with the page). The experiences themselves (simulations,
   models, missions) and the ambient subject worlds are in ls-exp.js / ls-exp2.js / ls-worlds.js and are loaded
   only when a student opens one — nothing heavy runs on the Home page.

   Each experience is chosen for what suits the idea (an experiment for cause and effect, a model for structure,
   a mission for evidence), says plainly what it simplifies, and records evidence for the objectives it serves. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store;

  const KINDS = {
    experiment: 'Experiment', simulation: 'Simulation', model: 'Interactive model', explore: 'Explore', mission: 'Mystery case',
    journey: 'Cinematic journey', build: 'Build & break', whatif: 'What-if lab', zoom: 'Zoom through knowledge', conversation: 'Conversation', builder: 'Builder'
  };
  const X = [
    { id: 'newton-lab', subject: 'physics', kind: 'experiment', title: 'Newton’s laws lab', hook: 'Push a crate, change its mass and the floor beneath it, crash two carts — and watch the forces.', mins: 12, objs: ['phys-newton:0', 'phys-newton:1', 'phys-newton:2'], lesson: 'phys-newton', simplified: 'One dimension; a rigid crate; constant friction coefficients (typical values, real surfaces vary); no air resistance; g = 9.8 m/s².' },
    { id: 'motion-graphs', subject: 'physics', kind: 'experiment', title: 'Motion graphs lab', hook: 'A car speeds up steadily. What shape is its distance–time graph?', mins: 8, objs: ['phys-motion:1', 'phys-motion:2', 'phys-motion:3'], lesson: 'phys-motion', simplified: 'One dimension, constant acceleration, no friction or air resistance.' },
    { id: 'orbit-whatif', subject: 'physics', kind: 'whatif', title: 'What if the Sun were heavier?', hook: 'Double the Sun’s mass and keep the planet’s speed. What happens to its orbit?', mins: 6, objs: [], simplified: 'One planet, a Sun that does not move, Newtonian gravity, no other planets. Units are scaled so Earth-like values are 1.' },
    { id: 'circuit-break', subject: 'physics', kind: 'build', title: 'Build & break a circuit', hook: 'Three bulbs, one battery. If one bulb breaks, do the others go out?', mins: 6, objs: ['phys-circuits:2'], lesson: 'phys-circuits', simplified: 'Ideal 12 V battery and wires; identical 6 Ω bulbs whose resistance does not change as they heat up.' },
    { id: 'waves', subject: 'physics', kind: 'experiment', title: 'When two waves meet', hook: 'Two waves meet. When do they cancel out completely?', mins: 4, objs: [], simplified: 'Two ideal sine waves of equal amplitude on a line.' },
    { id: 'particles', subject: 'chemistry', kind: 'simulation', title: 'Inside a substance', hook: 'Why does heating a solid make it melt — what are the particles actually doing?', mins: 7, objs: [], simplified: 'A 2-D model of 64 identical particles with a simple attraction law (Lennard-Jones). Temperatures are in model units, not °C.' },
    { id: 'line-builder', subject: 'maths', kind: 'model', title: 'Line builder', hook: 'What do m and c actually do to a line?', mins: 6, objs: ['math-linear:0', 'math-linear:1', 'math-linear:2'], lesson: 'math-linear', simplified: 'Exact: the graph is computed from y = mx + c.' },
    { id: 'leaf-dive', subject: 'biology', kind: 'zoom', title: 'Into the leaf', hook: 'Dive from a meadow into a single chloroplast — a million-times zoom — and find where sunlight becomes food.', mins: 7, objs: ['bio-photo:1'], lesson: 'bio-photo', simplified: 'Drawn diagrams, not to scale within a level; scale bars rounded to a useful power of ten.' },
    { id: 'heart-journey', subject: 'biology', kind: 'journey', title: 'Journey of a red blood cell', hook: 'Follow one red blood cell all the way round the body and back.', mins: 6, objs: ['bio-heart:1', 'bio-heart:0'], lesson: 'bio-heart', simplified: 'Schematic heart; valves and vessels simplified; not to scale.' },
    { id: 'cell-explorer', subject: 'biology', kind: 'explore', title: 'Inside a plant cell', hook: 'What is inside a leaf cell — and which parts would an animal cell not have?', mins: 6, objs: [], simplified: 'A labelled diagram of a typical leaf cell; real cells vary in shape and number of organelles.' },
    { id: 'zoom', subject: 'biology', kind: 'zoom', title: 'From the universe to a chloroplast', hook: 'How many times bigger is the observable universe than a chloroplast?', mins: 5, objs: [], simplified: 'Sizes are rounded to the nearest useful power of ten.' },
    { id: 'timeline', subject: 'history', kind: 'explore', title: 'How we learned how blood moves', hook: 'Who worked out that blood circulates — and how do we know?', mins: 7, objs: [], simplified: 'Ten turning points chosen from a long history; many other people contributed.' },
    { id: 'mystery-lungs', subject: 'history', kind: 'mission', title: 'The case of the missing pores', hook: 'Who first described blood travelling through the lungs? Weigh the evidence.', mins: 6, objs: [], simplified: 'Real sources, summarised. Historians still debate how ideas travelled.' },
    { id: 'seasons', subject: 'geography', kind: 'simulation', title: 'Why seasons happen', hook: 'Why is it summer in Sydney when it is winter in London?', mins: 7, objs: [], simplified: 'Day length from the standard sunrise equation; ignores atmospheric refraction and the size of the Sun’s disc (real days are a few minutes longer).' },
    { id: 'sentence-lab', subject: 'english', kind: 'builder', title: 'Sentence workshop & story architect', hook: 'Move one word — can you change what a sentence means?', mins: 8, objs: [], simplified: 'A small set of example sentences; English allows more orders than are listed here.' },
    { id: 'cafe', subject: 'languages', kind: 'conversation', title: 'Ordering at a French café', hook: 'Order a drink in French without freezing.', mins: 6, objs: [], simplified: 'One polite, standard café exchange; real conversations vary.' },
    { id: 'city', subject: 'social', kind: 'simulation', title: 'Run a city budget', hook: 'You run a city. What happens when you cut public transport?', mins: 8, objs: [], simplified: 'A teaching toy with stated rules, not an economic forecast. The rules are shown on the page.' }
  ];
  LS.experiences = X;
  LS.expKinds = KINDS;
  LS.expMeta = id => { const x = X.find(e => e.id === id); return x ? Object.assign({ kindLabel: KINDS[x.kind] }, x, { kind: KINDS[x.kind] }) : null; };

  /* ---------- lazy loading of the heavy parts ---------- */
  const once = {};
  const script = src => once[src] || (once[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete once[src]; rej(new Error('Could not load ' + src)); }; document.head.appendChild(s); }));
  LS.needExp = () => script('assets/js/learn/ls-exp.js?v=23b').then(() => Promise.all([script('assets/js/learn/ls-exp2.js?v=22b'), script('assets/js/learn/ls-exp-newton.js?v=23b'), script('assets/js/learn/ls-exp-bio.js?v=23d')]));
  LS.needWorlds = () => script('assets/js/learn/ls-worlds.js?v=23');

  /* ---------- the subject worlds (Explore → Subjects) ---------- */
  const subj = () => LS.subjectsList || [];
  function worldCard(S) {
    const xs = X.filter(x => x.subject === S.id), c = LS.subjectContents ? LS.subjectContents(S.id) : { lessons: [] };
    return `<li class="at-subj-${S.id} at-wcard"><a href="#/subject/${S.id}"><canvas class="at-world at-world--card" data-world="${S.id}" aria-hidden="true"></canvas><span class="at-wcard__b">${LS.emblem(S.id)}<b>${T(S.name, S.ar)}</b><small>${esc(S.world || '')}</small><small class="at-muted">${[c.lessons.length ? c.lessons.length + ' ' + T(c.lessons.length === 1 ? 'lesson' : 'lessons', 'دروس') : '', xs.length ? xs.length + ' ' + T(xs.length === 1 ? 'experience' : 'experiences', 'تجارب') : ''].filter(Boolean).join(' · ') || T('Reading tools & Noor', 'أدوات القراءة ونور')}</small></span></a></li>`;
  }
  function explore(view, parts) {
    if (parts[0] === 'topics') return topics(view);
    view.innerHTML = `<div class="at-explore"><header class="ls-pagehead"><p class="ls-kicker">${T('Explore', 'استكشف')}</p><h1>${T('Nine worlds to wander', 'تسعة عوالم للتجوال')}</h1><p class="ls-lead">${T('Each subject has its own atmosphere and its own kinds of experience — experiments in physics, evidence in history, conversation in languages. Pick one.', 'لكل مادة أجواؤها وتجاربها.')}</p></header>
      <ul class="at-worlds">${subj().filter(S => S.id !== 'cs' && S.id !== 'more').map(worldCard).join('')}</ul>
      <p class="at-muted" style="margin-top:20px"><a class="at-more" href="#/subject/cs">${T('Computer science', 'علوم الحاسوب')}</a> · <a class="at-more" href="#/subject/more">${T('Economics, psychology & more', 'الاقتصاد وعلم النفس والمزيد')}</a></p></div>`;
    paintWorlds(view);
  }
  function paintWorlds(view) {
    const cs = view.querySelectorAll('canvas[data-world]'); if (!cs.length) return;
    LS.needWorlds().then(() => { if (view.isConnected && LS.worlds) cs.forEach(c => LS.worlds.mount(c, c.dataset.world, { still: c.classList.contains('at-world--card'), hero: c.classList.contains('at-world--hero') || c.classList.contains('at-world--portal') })); }).catch(() => { /* the cards still work without atmosphere */ });
  }
  LS.paintWorlds = paintWorlds;

  /* ---------- topics: every topic and its objectives, with their current state ---------- */
  function topics(view) {
    const E = LS.engine, by = {};
    LS.lessons.forEach(L => { (by[L.subject] = by[L.subject] || []).push(L); });
    view.innerHTML = `<div class="at-topics"><header class="ls-pagehead"><p class="ls-kicker">${T('Explore · Topics', 'استكشف · المواضيع')}</p><h1>${T('Every topic, and where you are with it', 'كل موضوع وأين أنت منه')}</h1><p class="ls-lead">${T('States come from your own answers and activity, and change as soon as you do something new. Open one to see the evidence.', 'الحالات من إجاباتك ونشاطك.')}</p></header>
      ${Object.entries(by).map(([sub, Ls]) => `<section class="at-sec"><h2 class="at-h2">${esc(sub)}</h2>${Ls.map(L => `<div class="at-topic"><h3><a href="#/lesson/${L.id}">${esc(L.topic)}</a> <small class="at-muted">· ${esc(L.title)}</small></h3><ul class="at-objs">${E.objectivesOf(L.id).map(s => objRow(s)).join('')}</ul></div>`).join('')}</section>`).join('')}</div>`;
  }
  function objRow(s) {
    const S = LS.engine.STATES[s.state];
    return `<li><details><summary><span class="at-state at-state--${s.state}"><i aria-hidden="true"></i>${T(S.label, S.label)}</span><span class="at-objs__t">${esc(s.obj.text)}</span></summary><div class="at-objs__why"><p class="at-muted">${esc(S.desc)}</p><ul>${s.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div></details><a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/learn/obj/${esc(s.key)}" aria-label="${s.state === 'not' ? T('Start', 'ابدأ') : s.state === 'demonstrated' ? T('Challenge me', 'تحدَّني') : T('Continue', 'تابع')}: ${esc(s.obj.text)}">${s.state === 'not' ? T('Start', 'ابدأ') : s.state === 'demonstrated' ? T('Challenge me', 'تحدَّني') : T('Continue', 'تابع')}</a></li>`;
  }
  LS.objRow = objRow;

  /* ---------- Discover: the curiosity portal, signature experiences, everything else by kind ---------- */
  const PORTAL = ['newton-lab', 'zoom', 'orbit-whatif', 'mystery-lungs', 'seasons', 'particles', 'cafe', 'city', 'heart-journey', 'circuit-break'];
  LS.portalPick = () => { const dayN = Math.floor(Date.now() / 864e5); return X.find(x => x.id === PORTAL[dayN % PORTAL.length]); };
  function discover(view) {
    const p = LS.portalPick(), seen = new Set((st.data().events || []).filter(e => e.t === 'experience').map(e => e.id));
    const group = {}; X.forEach(x => { (group[x.kind] = group[x.kind] || []).push(x); });
    view.innerHTML = `<div class="at-discover"><header class="ls-pagehead"><p class="ls-kicker">${T('Explore · Discover', 'استكشف · اكتشف')}</p><h1>${T('Follow a question', 'اتبع سؤالاً')}</h1></header>
      ${portal(p, true)}
      <section class="at-sec"><div class="at-sec__head"><h2 class="at-h2">${T('All experiences', 'كل التجارب')}</h2><a href="#/mylibrary/archive">${T('Discovery archive', 'أرشيف الاكتشافات')} →</a></div>
        <ul class="at-xlist">${X.map(x => xItem(x, seen.has(x.id))).join('')}</ul></section></div>`;
  }
  function xItem(x, seen) {
    const S = subj().find(s => s.id === x.subject) || {};
    return `<li class="at-subj-${x.subject}"><a href="#/exp/${x.id}"><span class="at-xlist__k">${T(KINDS[x.kind], KINDS[x.kind])} · ${T(S.name || '', S.ar || '')}</span><b>${esc(x.title)}</b><span class="at-xlist__h">${esc(x.hook)}</span><small class="at-muted">${x.mins} min${seen ? ' · ' + T('explored', 'استُكشف') : ''}</small></a></li>`;
  }
  LS.xItem = xItem;
  function portal(x, big) {
    return `<section class="at-portal at-subj-${x.subject} ${big ? 'at-portal--big' : ''}" aria-labelledby="atPortalH"><canvas class="at-world at-world--portal" data-world="${x.subject}" aria-hidden="true"></canvas><div class="at-portal__b"><p class="at-k">${T('Curiosity portal', 'بوابة الفضول')} · ${T(KINDS[x.kind], KINDS[x.kind])}</p><h2 id="atPortalH" class="at-portal__q">${esc(x.hook)}</h2><p><a class="ls-btn ls-btn--accent" href="#/exp/${x.id}">${T('Step through', 'ادخل')} →</a> <span class="at-muted">${esc(x.title)} · ${x.mins} min</span></p></div></section>`;
  }
  LS.portalHTML = portal;

  /* ---------- an experience page: frame here, the experience itself is lazy ---------- */
  function exp(view, parts) {
    const x = X.find(e => e.id === parts[0]);
    if (!x) { view.innerHTML = `<section class="ls-empty"><h1>${T('Experience not found', 'التجربة غير موجودة')}</h1><a class="ls-btn" href="#/discover">${T('All experiences', 'كل التجارب')}</a></section>`; return; }
    view.innerHTML = `<p class="ls-loading" role="status"><span class="ls-spin" aria-hidden="true"></span>${T('Opening the experience…', 'أفتح التجربة…')}</p>`;
    LS.needExp().then(() => { if (view.isConnected && LS.current()[0] === 'exp' && LS.current()[1] === x.id) LS.exp.mount(view, x); })
      .catch(e => { view.innerHTML = `<section class="ls-empty"><h1>${T('This experience could not load', 'تعذر تحميل التجربة')}</h1><p>${esc(e.message)}</p><button type="button" class="ls-btn" onclick="LS.render()">${T('Try again', 'حاول مجدداً')}</button></section>`; });
  }

  LS.route('explore', explore);
  LS.route('discover', discover);
  LS.route('exp', exp);
})();
