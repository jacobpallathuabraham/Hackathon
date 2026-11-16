/* ERLY Learning Studio v20 — Home, subjects, topics and universal search.

   SUBJECTS group everything the Studio has (lessons, readings, videos, Lab models, practice) by discipline, each
   with its own colour and illustration. A subject with little content says so instead of looking full.
   TOPICS are the connective tissue: one topic id links its lesson, readings, video, interactive models,
   practice questions, the student's notes, flashcards and mistakes, and a suggested route through them.
   SEARCH looks across subjects, topics, lessons (and their sections), readings, videos, models and questions. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store;
  const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

  /* ---------- subject illustrations (original line art, theme-aware through currentColor and --hue) ---------- */
  const ART = {
    mathematics: '<path d="M10 100 H190 M100 10 V140" class="a1"/><path d="M30 20 Q100 260 170 20" class="a2"/><circle cx="100" cy="135" r="4" class="a3"/><path d="M135 60 l14 -14 M135 46 l14 14" class="a1"/><text x="40" y="58" class="t">π</text><text x="150" y="128" class="t">∫</text>',
    physics: '<ellipse cx="100" cy="80" rx="80" ry="28" class="a1"/><ellipse cx="100" cy="80" rx="80" ry="28" transform="rotate(60 100 80)" class="a1"/><ellipse cx="100" cy="80" rx="80" ry="28" transform="rotate(-60 100 80)" class="a1"/><circle cx="100" cy="80" r="9" class="a3"/><circle cx="178" cy="78" r="5" class="a2"/>',
    chemistry: '<path d="M70 50 L100 33 L130 50 L130 85 L100 102 L70 85 Z" class="a1"/><path d="M78 55 L78 80 M100 95 L122 82 M122 55 L100 42" class="a2"/><path d="M130 50 L158 34 M70 85 L42 101 M100 102 V130" class="a1"/><circle cx="158" cy="34" r="6" class="a3"/><circle cx="42" cy="101" r="6" class="a3"/><circle cx="100" cy="132" r="6" class="a3"/>',
    biology: '<path d="M70 10 C130 40 70 80 130 110 C160 125 130 140 130 150" class="a1"/><path d="M130 10 C70 40 130 80 70 110 C40 125 70 140 70 150" class="a2"/><path d="M82 22 H118 M86 47 H114 M88 72 H112 M86 97 H114 M80 120 H120" class="a3"/>',
    'computer-science': '<circle cx="50" cy="40" r="10" class="a3"/><circle cx="150" cy="40" r="10" class="a3"/><circle cx="100" cy="85" r="12" class="a2"/><circle cx="55" cy="130" r="10" class="a3"/><circle cx="145" cy="130" r="10" class="a3"/><path d="M58 47 L90 78 M142 47 L110 78 M92 95 L62 122 M108 95 L138 122 M60 40 H140" class="a1"/><text x="88" y="152" class="t">{ }</text>',
    geography: '<circle cx="100" cy="80" r="62" class="a1"/><ellipse cx="100" cy="80" rx="28" ry="62" class="a2"/><path d="M38 80 H162 M48 50 H152 M48 110 H152" class="a2"/><path d="M78 36 q14 10 6 22 q-12 8 -4 20 q10 6 22 -4" class="a3"/>',
    english: '<path d="M100 40 C80 28 50 26 28 32 V130 C50 124 80 126 100 138 C120 126 150 124 172 130 V32 C150 26 120 28 100 40 Z" class="a1"/><path d="M100 40 V138" class="a2"/><path d="M45 55 H85 M45 72 H85 M45 89 H78 M115 55 H155 M115 72 H155 M115 89 H148" class="a3"/>',
    other: '<circle cx="100" cy="80" r="56" class="a1"/><path d="M100 30 L112 80 L100 130 L88 80 Z" class="a2"/><path d="M50 80 H150" class="a3"/><circle cx="100" cy="80" r="6" class="a3"/>'
  };
  const subjectArt = (id, cls) => `<svg viewBox="0 0 200 160" class="ls-art ${cls || ''}" aria-hidden="true">${ART[id] || ART.other}</svg>`;
  LS.subjectArt = subjectArt;

  // subjects; `models` matches Lab engine kinds, `readings` matches reading-library short names
  LS.subjects = [
    { id: 'mathematics', name: 'Mathematics', hue: 220, lesson: /^Mathematics$/, models: /^(Maths|Mathematics)/, readings: /^$/, blurb: 'Functions, calculus, geometry, algebra and statistics you can move and reshape.' },
    { id: 'physics', name: 'Physics', hue: 262, lesson: /^Physics$/, models: /^Physics/, readings: /Thermodynamics/i, blurb: 'Forces, energy, waves and fields — simulated from the real equations.' },
    { id: 'chemistry', name: 'Chemistry', hue: 168, lesson: /^Chemistry$/, models: /^Chemistry/, readings: /^$/, blurb: 'Molecules in 3D, acids and bases, equilibrium and reactions.' },
    { id: 'biology', name: 'Biology & medicine', hue: 8, lesson: /^Biology$/, models: /^(Biology|Medicine)/, readings: /Biology/i, blurb: 'Cells, the heart, photosynthesis, genetics and ecology.' },
    { id: 'computer-science', name: 'Computer science', hue: 196, lesson: /^Computer science$/, models: /^(Computing|Computer science)/, readings: /Computing/i, blurb: 'Algorithms you can watch, step by step.' },
    { id: 'geography', name: 'Geography & environment', hue: 132, lesson: /^Geography$/, models: /^(Environment|Geography)/, readings: /Sustainability/i, blurb: 'Climate, energy and the systems of a living planet.' },
    { id: 'english', name: 'English', hue: 36, lesson: /^English$/, models: /^English/, readings: /^English/i, blurb: 'Reading tools for any text you bring, read-aloud, glossary and Noor.' },
    { id: 'other', name: 'Economics, psychology & more', hue: 300, lesson: /^(Economics|Psychology|Business)$/, models: /^(Economics|Commerce|Statistics|Engineering)/, readings: /Psychology|Business/i, blurb: 'Markets, data, engineering systems, memory and marketing.' }
  ];
  LS.subjectOf = name => LS.subjects.find(s => s.lesson.test(name)) || LS.subjects.find(s => s.name === name) || null;

  /* ---------- what belongs to a subject ---------- */
  const readings = () => (window.STUDIO_LIBRARY || []);
  const engines = () => (window.ERLY_LAB ? ERLY_LAB.engines : []);
  LS.subjectContent = S => ({
    lessons: LS.lessons.filter(L => S.lesson.test(L.subject)),
    readings: readings().filter(r => S.readings.test(r.short || '') || S.readings.test(r.course || '')),
    videos: LS.VIDEOS.filter(v => S.lesson.test(v.subject)),
    external: LS.EXTERNAL_VIDEOS.filter(v => S.lesson.test(v.subject)),
    models: engines().filter(e => S.models.test(String(e.kind || ''))),
    questions: LS.bank().filter(q => S.lesson.test(q.subject || ''))
  });

  /* ---------- topics: one id connects every format ---------- */
  const EXTRA_MODELS = { 'The heart': ['heart', 'o2curve'], 'Photosynthesis': ['photorate', 'cell'], pH: ['titration', 'equilibrium'], 'Molecular shape': ['molecule', 'orbitals'], 'Quadratic functions': ['quadratic', 'graph'], Derivatives: ['secant', 'calculus'], 'Newton’s second law': ['newton', 'incline'], 'Electric circuits': ['circuit', 'netlist'] };
  let TOPICS = null;
  LS.topics2 = () => {
    if (TOPICS) return TOPICS;
    TOPICS = LS.lessons.map(L => {
      const models = new Set(); L.sections.forEach(s => s.blocks.forEach(b => { if (b.k === 'lab') models.add(b.engine); })); (EXTRA_MODELS[L.topic] || []).forEach(m => models.add(m));
      const words = (L.tags || []).concat([L.topic.toLowerCase()]);
      return { id: slug(L.topic), title: L.topic, subject: L.subject, lesson: L, why: L.why || '',
        models: [...models].filter(id => engines().some(e => e.id === id)),
        videos: LS.VIDEOS.filter(v => v.lesson === L.id),
        readings: readings().filter(r => words.some(w => (r.title + ' ' + (r.course || '')).toLowerCase().includes(w))),
        external: (L.further || []).concat(L.provenance.sources || []).filter((x, i, a) => a.findIndex(y => y.url === x.url) === i) };
    });
    return TOPICS;
  };
  LS.topic = id => LS.topics2().find(t => t.id === id) || null;
  LS.topicOfLesson = L => LS.topics2().find(t => t.lesson.id === L.id);

  /* ---------- universal search ---------- */
  function index() {
    const out = [];
    LS.subjects.forEach(S => out.push({ k: 'Subject', t: S.name, s: S.blurb, h: '#/subject/' + S.id }));
    LS.topics2().forEach(tp => out.push({ k: 'Topic', t: tp.title, s: tp.lesson.subject + ' · lesson, ' + tp.models.length + ' models' + (tp.videos.length ? ', video' : ''), h: '#/topic/' + tp.id, x: (tp.lesson.tags || []).join(' ') }));
    LS.lessons.forEach(L => { out.push({ k: 'Lesson', t: L.title, s: L.subject + ' · ' + L.mins + ' min', h: '#/lesson/' + L.id, x: L.objectives.join(' ') + ' ' + (L.tags || []).join(' ') }); L.sections.forEach(s => out.push({ k: 'Section', t: s.title, s: L.title, h: `#/lesson/${L.id}/${s.id}`, x: s.blocks.filter(b => b.k === 'text').map(b => b.md).join(' ').slice(0, 600) })); });
    readings().forEach(r => out.push({ k: 'Reading', t: r.title.replace(/_/g, ' ').replace(/\.pdf$/i, ''), s: r.course, read: r.id }));
    LS.VIDEOS.forEach(v => out.push({ k: 'Video', t: v.title, s: v.subject + ' · ERLY video', h: '#/video/' + v.id }));
    engines().forEach(e => out.push({ k: 'Model', t: e.title || e.id, s: e.kind, h: '#/lab/' + e.id }));
    LS.bank().forEach(q => out.push({ k: 'Question', t: LS.plain(q.prompt).slice(0, 90), s: q.topic + ' · practise', h: '#/practice', topic: q.topic }));
    return out;
  }
  let IDX = null;
  function find(q) {
    IDX = IDX || index(); const words = q.toLowerCase().split(/\s+/).filter(Boolean); if (!words.length) return [];
    const scored = IDX.map(r => { const hay = (r.t + ' ' + (r.s || '') + ' ' + (r.x || '')).toLowerCase(), title = r.t.toLowerCase(); if (!words.every(w => hay.includes(w))) return null; let sc = words.reduce((a, w) => a + (title.includes(w) ? 3 : 1) + (title.startsWith(w) ? 2 : 0), 0); sc += { Subject: 4, Topic: 4, Lesson: 3, Reading: 2, Video: 2, Model: 1, Section: 0, Question: -1 }[r.k] || 0; return [sc, r]; }).filter(Boolean).sort((a, b) => b[0] - a[0]);
    return scored.map(x => x[1]);
  }
  function go(r) { if (r.read) return LS.openReading(r.read); if (r.topic) return LS.practiceWith({ topic: r.topic, mode: 'guided' }); location.hash = r.h; }
  LS.search = {
    find,
    // a WAI-ARIA combobox: type, arrow through grouped results, Enter to open; Ctrl/⌘K or "/" focuses it
    mount(host) {
      host.innerHTML = `<div class="ui-field ls-sbox"><svg viewBox="0 0 24 24" aria-hidden="true" class="ls-i"><path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm5-2 5 5"/></svg><input id="lsQ" type="search" role="combobox" aria-expanded="false" aria-controls="lsQList" aria-autocomplete="list" autocomplete="off" placeholder="${T('Search subjects, topics, lessons, readings, videos, models…', 'ابحث…')}" aria-label="${T('Search the Learning Studio', 'ابحث في استوديو التعلم')}"><kbd>⌘K</kbd></div><ul id="lsQList" role="listbox" class="ls-sres" hidden></ul>`;
      const inp = host.querySelector('input'), list = host.querySelector('ul'); let res = [], cur = -1;
      const draw = () => {
        const q = inp.value.trim(); res = q ? find(q).slice(0, 12) : []; cur = res.length ? 0 : -1;
        list.hidden = !q; inp.setAttribute('aria-expanded', !!q);
        list.innerHTML = res.length ? res.map((r, i) => `<li role="option" id="lsQo${i}" aria-selected="${i === cur}" data-i="${i}"><span class="ls-sres__k">${esc(r.k)}</span><b>${esc(r.t)}</b><small>${esc(r.s || '')}</small></li>`).join('') : q ? `<li class="ls-sres__none" role="option" aria-disabled="true">${T('Nothing found. Try another word, or ask Noor.', 'لا نتائج.')} <button type="button" class="ls-linkbtn" data-asknoor>${T('Ask Noor about', 'اسأل نور عن')} “${esc(q)}”</button></li>` : '';
        inp.setAttribute('aria-activedescendant', cur >= 0 ? 'lsQo' + cur : '');
      };
      const move = d => { if (!res.length) return; cur = (cur + d + res.length) % res.length; list.querySelectorAll('[role=option]').forEach((o, i) => o.setAttribute('aria-selected', i === cur)); inp.setAttribute('aria-activedescendant', 'lsQo' + cur); const o = list.querySelector(`#lsQo${cur}`); if (o) o.scrollIntoView({ block: 'nearest' }); };
      const close = () => { list.hidden = true; inp.setAttribute('aria-expanded', 'false'); };
      inp.addEventListener('input', draw);
      inp.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); } else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); const r = res[cur]; close(); inp.value = ''; inp.blur(); go(r); } else if (e.key === 'Escape') { inp.value = ''; close(); } });
      list.addEventListener('mousedown', e => e.preventDefault());
      list.addEventListener('click', e => { const o = e.target.closest('[data-i]'); if (o) { const r = res[+o.dataset.i]; close(); inp.value = ''; go(r); } if (e.target.closest('[data-asknoor]')) { LS.noor.ask('explain', { text: inp.value.trim(), title: 'Learning Studio search' }); close(); } });
      inp.addEventListener('blur', () => setTimeout(close, 120));
      document.addEventListener('keydown', e => { if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !e.target.closest('input, textarea, [contenteditable=true], select'))) { e.preventDefault(); inp.focus(); inp.select(); } });
    }
  };

  /* ---------- Home ---------- */
  function home(view) {
    const d = st.data(), now = Date.now();
    const recent = d.recent.filter(r => r.type === 'lesson' && LS.lesson(r.id) || r.type === 'video' && LS.video.byId(r.id) || r.type === 'lab' || r.type === 'reading');
    const readProg = readingProgress();
    const cont = recent[0];
    const due = Object.values(d.cards).filter(c => (c.due || 0) <= now).length, open = Object.values(d.mistakes).filter(m => !m.laterCorrect).length;
    const recs = LS.intel.recommend(d, LS.lessons, { now });
    const notes = Object.values(d.notes).sort((a, b) => b.updated - a.updated).slice(0, 4);
    const marked = d.attempts.filter(a => a.correct === true || a.correct === false);
    const done = Object.values(d.lessons).filter(p => p.completed).length;
    const fresh = !Object.keys(d.lessons).length && !marked.length && !Object.keys(d.cards).length && !Object.keys(d.notes).length && !readProg.length;
    view.innerHTML = `<div class="lh">
      <header class="lh__hero"><div class="lh__aura" aria-hidden="true"><i></i><i></i><i></i></div>
        <p class="lh__eyebrow">${T('ERLY Learning Studio', 'استوديو التعلم')}</p>
        <h1 class="lh__title">${fresh ? T('A new way to understand everything.', 'طريقة جديدة لفهم كل شيء.') : T('Welcome back.', 'مرحباً بعودتك.')}</h1>
        <p class="lh__lead">${fresh ? T('Explore subjects, interact with ideas and build your understanding — by reading, watching, experimenting, practising and asking.', 'استكشف المواد وتفاعل مع الأفكار.') : esc(summaryLine(d, done, due, open))}</p>
        <div class="lh__quick" role="group" aria-label="${T('Ways to learn', 'طرق التعلم')}">${[['read', 'Read', '#/read'], ['watch', 'Watch', '#/video'], ['lab', 'Explore', '#/lab'], ['practise', 'Practise', '#/practice'], ['lessons', 'Revise', '#/revise'], ['noor', 'Ask Noor', '#/noor']].map(([i, l, h]) => `<a class="lh__q" href="${h}">${LS.icon(i)}<span>${T(l, l)}</span></a>`).join('')}</div>
      </header>
      ${cont || readProg.length ? `<section class="lh__sec" aria-labelledby="lhCont"><h2 class="lh__h" id="lhCont">${T('Continue learning', 'تابع التعلم')}</h2><div class="lh__cont">${continueCard(cont, d)}${readProg.slice(0, 2).map(r => `<button type="button" class="lc lc--read" data-reading="${esc(r.id)}"><span class="lc__k">${T('Reading', 'قراءة')} · ${esc(r.course)}</span><b>${esc(r.title)}</b><span class="lc__bar" role="progressbar" aria-label="${T('Read', 'مقروء')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(r.frac * 100)}"><i style="width:${Math.round(r.frac * 100)}%"></i></span><small>${Math.round(r.frac * 100)}% · ${LS.ago(r.at)}</small></button>`).join('')}</div></section>` : ''}
      <section class="lh__sec" aria-labelledby="lhSub"><div class="lh__row"><h2 class="lh__h" id="lhSub">${T('Explore subjects', 'استكشف المواد')}</h2></div>
        <ul class="lh__subjects">${LS.subjects.map(S => { const c = LS.subjectContent(S), n = c.lessons.length + c.readings.length + c.videos.length + c.models.length; return `<li><a class="lsub" href="#/subject/${S.id}" style="--hue:${S.hue}">${subjectArt(S.id)}<span class="lsub__n">${esc(S.name)}</span><span class="lsub__c">${n ? [[c.lessons.length, 'lesson', 'lessons'], [c.models.length, 'model', 'models'], [c.readings.length, 'reading', 'readings']].filter(x => x[0]).map(([k, one, many]) => `${k} ${k === 1 ? one : many}`).join(' · ') : T('Reading tools & Noor', 'أدوات القراءة ونور')}</span></a></li>`; }).join('')}</ul></section>
      <div class="lh__split">
        <section class="lh__sec" aria-labelledby="lhNext"><h2 class="lh__h" id="lhNext">${T('Suggested next', 'مقترح تالياً')}</h2>${recs.length ? `<ol class="lh__recs">${recs.slice(0, 5).map(r => `<li><a href="${recHref(r)}"><b>${esc(r.title)}</b><small>${esc(r.why)}</small></a></li>`).join('')}</ol>` : `<p class="ls-muted">${T('Start any lesson — suggestions appear as you learn.', 'ابدأ أي درس.')}</p>`}</section>
        <section class="lh__sec lh__stats" aria-labelledby="lhProg"><h2 class="lh__h" id="lhProg">${T('Your progress', 'تقدمك')}</h2>
          <dl><div><dt>${T('Lessons finished', 'دروس مكتملة')}</dt><dd>${done}<small>/ ${LS.lessons.length}</small></dd></div><div><dt>${T('Questions answered', 'أسئلة مجابة')}</dt><dd>${marked.length}</dd></div><div><dt>${T('Flashcards due', 'بطاقات مستحقة')}</dt><dd>${due}</dd></div><div><dt>${T('Mistakes to revisit', 'أخطاء للمراجعة')}</dt><dd>${open}</dd></div></dl>
          <p class="ls-small ls-muted">${marked.length < 10 ? T('Accuracy appears after 10 answers — nothing is estimated.', 'الدقة بعد ١٠ إجابات.') : ''} <a href="#/progress">${T('My progress', 'تقدمي')} →</a></p></section>
      </div>
      <section class="lh__sec" aria-labelledby="lhDisc"><div class="lh__row"><h2 class="lh__h" id="lhDisc">${T('Discover something new', 'اكتشف شيئاً جديداً')}</h2><a href="#/lab" class="ls-linkbtn">${T('All 174 models', 'كل النماذج')} →</a></div>
        <ul class="lh__disc">${discover().map(x => `<li><a class="ld" href="${x.h}" style="--hue:${x.hue}"><span class="ld__k">${esc(x.k)}</span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></a></li>`).join('')}</ul></section>
      ${notes.length || d.bookmarks.length ? `<section class="lh__sec lh__split" aria-label="${T('Saved', 'المحفوظات')}"><div><h2 class="lh__h">${T('Recent notes', 'ملاحظات حديثة')}</h2><ul class="lh__list">${notes.map(n => `<li><a href="#/notebook/${n.id}">${esc(n.title)}</a><small>${LS.ago(n.updated)}</small></li>`).join('') || `<li class="ls-muted">—</li>`}</ul></div><div><h2 class="lh__h">${T('Saved', 'المحفوظات')}</h2><ul class="lh__list">${d.bookmarks.slice(0, 4).map(b => `<li><a href="${esc(b.where)}">${esc(b.label)}</a></li>`).join('') || `<li class="ls-muted">—</li>`}</ul></div></section>` : ''}
    </div>`;
    LS.consentSheet();
  }
  function continueCard(r, d) {
    if (!r) return '';
    if (r.type === 'lesson') { const L = LS.lesson(r.id); const p = d.lessons[L.id] || {}, n = L.sections.filter(s => (p.done || {})[s.id]).length, S = LS.subjectOf(L.subject); return `<a class="lc lc--big" href="#/lesson/${L.id}" style="--hue:${S ? S.hue : 30}">${S ? subjectArt(S.id, 'lc__art') : ''}<span class="lc__k">${esc(L.subject)} · ${T('lesson', 'درس')}</span><b>${esc(L.title)}</b><span>${p.secIx >= L.sections.length ? T('Summary and revision', 'الخلاصة') : T('Next', 'التالي') + ': ' + esc((L.sections[p.secIx || 0] || L.sections[0]).title)}</span><span class="lc__bar" role="progressbar" aria-label="${T('Sections done', 'الأقسام المنجزة')}" aria-valuemin="0" aria-valuemax="${L.sections.length}" aria-valuenow="${n}"><i style="width:${100 * n / L.sections.length}%"></i></span><small>${n}/${L.sections.length} ${T('sections', 'أقسام')} · ${LS.ago(r.at)}</small><span class="lc__go">${T('Resume', 'تابع')} →</span></a>`; }
    if (r.type === 'video') return `<a class="lc lc--big" href="#/video/${esc(r.id)}"><span class="lc__k">${T('Video', 'فيديو')}</span><b>${esc(r.title)}</b><span class="lc__go">${T('Resume', 'تابع')} →</span></a>`;
    if (r.type === 'lab') return `<a class="lc lc--big" href="#/lab/${esc(r.id)}"><span class="lc__k">${T('Model', 'نموذج')}</span><b>${esc(r.title)}</b><span class="lc__go">${T('Open again', 'افتح')} →</span></a>`;
    return '';
  }
  function summaryLine(d, done, due, open) {
    const parts = []; const inprog = Object.values(d.lessons).filter(p => !p.completed).length;
    if (inprog) parts.push(`${inprog} lesson${inprog === 1 ? '' : 's'} in progress`); if (done) parts.push(`${done} finished`); if (due) parts.push(`${due} card${due === 1 ? '' : 's'} due`); if (open) parts.push(`${open} mistake${open === 1 ? '' : 's'} to revisit`);
    return parts.length ? parts.join(' · ') + '.' : 'Pick up a subject below.';
  }
  const recHref = r => ({ continue: `#/lesson/${r.id}`, new: `#/lesson/${r.id}`, practice: '#/practice', revise: '#/revise/session/due', mistakes: '#/mistakes' })[r.kind] || '#/home';
  // a rotating, real selection: models from different subjects, the ERLY videos and lessons
  function discover() {
    const pick = ['molecule', 'dna', 'orbit', 'fourier', 'predprey', 'sorting', 'waves', 'cell', 'balancer', 'gradient', 'heart', 'optics'];
    const day = Math.floor(Date.now() / 864e5), es = engines();
    const models = pick.map(id => es.find(e => e.id === id)).filter(Boolean);
    const rot = models.slice(day % models.length).concat(models.slice(0, day % models.length)).slice(0, 4);
    const hueOf = k => { const S = LS.subjects.find(s => s.models.test(String(k || ''))); return S ? S.hue : 30; };
    return rot.map(e => ({ k: T('Interactive model', 'نموذج تفاعلي'), t: e.title, s: e.kind, h: '#/lab/' + e.id, hue: hueOf(e.kind) }))
      .concat(LS.VIDEOS.slice(day % 3, day % 3 + 1).map(v => ({ k: T('ERLY video', 'فيديو'), t: v.title, s: v.subject, h: '#/video/' + v.id, hue: (LS.subjectOf(v.subject) || {}).hue || 30 })))
      .concat(LS.lessons.slice(day % 8, day % 8 + 1).map(L => ({ k: T('Lesson', 'درس'), t: L.title, s: L.subject + ' · ' + L.mins + ' min', h: '#/lesson/' + L.id, hue: (LS.subjectOf(L.subject) || {}).hue || 30 })));
  }
  // the reader's own record of how far each reading has got (assets/js/studio.js, key erly-studio-v1)
  function readingProgress() {
    let db = null; try { db = JSON.parse(localStorage.getItem('erly-studio-v1') || 'null'); } catch (e) { db = null; }
    if (!db || !db.prog) return [];
    return Object.entries(db.prog).map(([id, p]) => { const r = readings().find(x => x.id === id); return r && p.frac > 0.01 ? { id, title: r.title.replace(/_/g, ' ').replace(/\.pdf$/i, ''), course: r.course, frac: Math.min(1, p.frac), at: p.at || 0 } : null; }).filter(Boolean).sort((a, b) => b.at - a.at);
  }
  LS.readingProgress = readingProgress;

  /* ---------- a subject world ---------- */
  function subject(view, id) {
    const S = LS.subjects.find(s => s.id === id); if (!S) { view.innerHTML = `<section class="ls-empty"><h1>${T('Subject not found', 'المادة غير موجودة')}</h1><a class="ls-btn" href="#/home">${T('Home', 'الرئيسية')}</a></section>`; return; }
    const c = LS.subjectContent(S), tps = LS.topics2().filter(t => S.lesson.test(t.subject));
    const groups = {}; c.models.forEach(e => { const k = String(e.kind || '').split('·')[1] || String(e.kind || ''); (groups[k.trim()] = groups[k.trim()] || []).push(e); });
    view.innerHTML = `<div class="lsj" style="--hue:${S.hue}">
      <header class="lsj__hero">${subjectArt(S.id, 'lsj__art')}<div><p class="lh__eyebrow">${T('Subject', 'مادة')}</p><h1>${esc(S.name)}</h1><p class="lh__lead">${esc(S.blurb)}</p>
        <p class="lsj__counts">${[[c.lessons.length, 'lessons'], [c.readings.length, 'readings'], [c.videos.length, 'videos'], [c.models.length, 'interactive models'], [c.questions.length, 'practice questions']].filter(x => x[0]).map(([n, l]) => `<span><b>${n}</b> ${l}</span>`).join('') || `<span>${T('No ERLY lessons or models for this subject yet', 'لا دروس بعد')}</span>`}</p></div></header>
      ${tps.length ? `<section class="lh__sec"><h2 class="lh__h">${T('Topics with a full learning route', 'مواضيع بمسار تعلم كامل')}</h2><ul class="lsj__topics">${tps.map(tp => `<li><a href="#/topic/${tp.id}"><b>${esc(tp.title)}</b><small>${esc(tp.lesson.title)}</small><span class="lsj__fmt">${[T('lesson', 'درس'), tp.models.length ? tp.models.length + ' ' + T('models', 'نماذج') : '', tp.videos.length ? T('video', 'فيديو') : '', tp.readings.length ? T('reading', 'قراءة') : '', LS.bank().filter(q => q.lesson === tp.lesson.id).length + ' ' + T('questions', 'أسئلة')].filter(Boolean).map(x => `<i>${esc(x)}</i>`).join('')}</span></a></li>`).join('')}</ul></section>` : ''}
      ${c.readings.length ? `<section class="lh__sec"><h2 class="lh__h">${T('Readings', 'القراءات')}</h2><ul class="lsj__list">${c.readings.map(r => `<li><button type="button" class="ls-linkrow" data-reading="${esc(r.id)}"><b>${esc(r.title.replace(/_/g, ' ').replace(/\.pdf$/i, ''))}</b><small>${esc(r.course)}</small></button></li>`).join('')}</ul></section>` : ''}
      ${c.models.length ? `<section class="lh__sec"><h2 class="lh__h">${T('Explore in the Visual Lab', 'استكشف في المختبر')}</h2>${Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([g, es]) => `<h3 class="lsj__g">${esc(g)}</h3><ul class="lsj__models">${es.map(e => `<li><a href="#/lab/${e.id}">${esc(e.title || e.id)}</a></li>`).join('')}</ul>`).join('')}</section>` : ''}
      ${c.external.length ? `<section class="lh__sec"><h2 class="lh__h">${T('External videos', 'فيديوهات خارجية')}</h2><ul class="lsj__list">${c.external.map(x => `<li><a href="#/video">${esc(x.title)}</a> <small class="ls-muted">${esc(x.by)} · ${T('external', 'خارجي')}</small></li>`).join('')}</ul></section>` : ''}
      ${S.id === 'english' ? `<section class="lh__sec"><h2 class="lh__h">${T('What the Studio offers for English today', 'ما يقدمه الاستوديو للإنجليزية')}</h2><p>${T('There are no ERLY English lessons yet. You can open your own text or PDF in the reader (read-aloud, glossary, highlights, summaries) and ask Noor about any passage.', 'لا دروس إنجليزية بعد.')}</p><div class="ls-row"><button type="button" class="ls-btn" data-ownpdf>${T('Open your own text or PDF', 'افتح ملفك')}</button><a class="ls-btn ls-btn--quiet" href="#/noor">${T('Ask Noor', 'اسأل نور')}</a></div></section>` : ''}
    </div>`;
    view.querySelector('.lsj').addEventListener('click', e => { const r = e.target.closest('[data-reading]'); if (r) LS.openReading(r.dataset.reading); if (e.target.closest('[data-ownpdf]')) LS.openReading(null); });
  }

  /* ---------- a topic: every format in one place, with a suggested route ---------- */
  function topic(view, id) {
    const tp = LS.topic(id); if (!tp) { view.innerHTML = `<section class="ls-empty"><h1>${T('Topic not found', 'الموضوع غير موجود')}</h1><a class="ls-btn" href="#/home">${T('Home', 'الرئيسية')}</a></section>`; return; }
    const d = st.data(), L = tp.lesson, S = LS.subjectOf(L.subject), p = d.lessons[L.id] || null, nDone = p ? L.sections.filter(s => (p.done || {})[s.id]).length : 0;
    const qs = LS.bank().filter(q => q.lesson === L.id), answered = new Set(d.attempts.map(a => a.qid));
    const myNotes = Object.values(d.notes).filter(n => n.src && (n.src.id === L.id || (n.src.title || '').includes(L.title))), myCards = Object.values(d.cards).filter(c => c.topic === L.topic), myMist = Object.values(d.mistakes).filter(m => m.lesson === L.id && !m.laterCorrect);
    const labSec = s => L.sections.find(x => x.blocks.some(b => b.k === s));
    const route = [
      [T('Read the explanation', 'اقرأ الشرح'), `#/lesson/${L.id}/${L.sections[0].id}`, nDone > 0],
      tp.models.length ? [T('Explore the model', 'استكشف النموذج'), `#/lab/${tp.models[0]}`, d.recent.some(r => r.type === 'lab' && r.id === tp.models[0])] : null,
      tp.videos.length ? [T('Watch the lesson video', 'شاهد الفيديو'), `#/video/${tp.videos[0].id}`, !!(d.video[tp.videos[0].id] && d.video[tp.videos[0].id].t > 5)] : null,
      labSec('activity') ? [T('Try the activities', 'جرّب الأنشطة'), `#/lesson/${L.id}/${labSec('activity').id}`, qs.some(q => answered.has(q.id))] : null,
      [T('Practise', 'تدرّب'), 'practice:' + L.topic, qs.filter(q => answered.has(q.id)).length >= Math.min(5, qs.length)],
      [T('Make revision cards', 'أنشئ بطاقات'), `#/lesson/${L.id}/summary`, myCards.length > 0]
    ].filter(Boolean);
    view.innerHTML = `<div class="ltp" style="--hue:${S ? S.hue : 30}">
      <header class="ltp__hero">${S ? subjectArt(S.id, 'ltp__art') : ''}<div><p class="lh__eyebrow">${esc(L.subject)} · ${T('topic', 'موضوع')}</p><h1>${esc(tp.title)}</h1><p class="lh__lead">${esc(L.why || L.objectives[0])}</p>
        <div class="ls-row"><a class="ls-btn ls-btn--accent" href="#/lesson/${L.id}">${p ? T('Continue the lesson', 'تابع الدرس') : T('Start learning', 'ابدأ التعلم')}</a><button type="button" class="ls-btn ls-btn--quiet" data-asktopic>${LS.icon('noor')} ${T('Ask Noor about this topic', 'اسأل نور')}</button></div></div></header>
      <section class="lh__sec"><h2 class="lh__h">${T('Your route through this topic', 'مسارك في هذا الموضوع')}</h2><ol class="ltp__route">${route.map(([t, h, ok], i) => `<li class="${ok ? 'is-done' : ''}"><a href="${h.startsWith('practice:') ? '#/practice' : h}" ${h.startsWith('practice:') ? `data-prac="${esc(h.slice(9))}"` : ''}><span class="ltp__n" aria-hidden="true">${ok ? '✓' : i + 1}</span><span>${esc(t)}</span>${ok ? `<span class="sr-only"> (done)</span>` : ''}</a></li>`).join('')}</ol></section>
      <div class="ltp__grid">
        <section class="lh__sec"><h2 class="lh__h">${T('Lesson', 'الدرس')}</h2><a class="ltp__res" href="#/lesson/${L.id}"><b>${esc(L.title)}</b><small>${L.sections.length} ${T('sections', 'أقسام')} · ${L.mins} min · ${nDone}/${L.sections.length} ${T('done', 'منجز')}</small></a>
          <ul class="ltp__secs">${L.sections.map(s => `<li><a href="#/lesson/${L.id}/${s.id}" class="${p && (p.done || {})[s.id] ? 'is-done' : ''}">${esc(s.title)}</a></li>`).join('')}</ul></section>
        <section class="lh__sec"><h2 class="lh__h">${T('Interactive models', 'نماذج تفاعلية')}</h2><ul class="ltp__list">${tp.models.map(m => { const e = engines().find(x => x.id === m); return `<li><a href="#/lab/${m}">${esc(e.title)}</a><small>${esc(e.kind)}</small></li>`; }).join('') || `<li class="ls-muted">—</li>`}</ul></section>
        <section class="lh__sec"><h2 class="lh__h">${T('Watch & read', 'شاهد واقرأ')}</h2><ul class="ltp__list">${tp.videos.map(v => `<li><a href="#/video/${v.id}">▶ ${esc(v.title)}</a><small>${T('ERLY video · captions & transcript', 'فيديو مع نص')}</small></li>`).join('')}${tp.readings.map(r => `<li><button type="button" class="ls-linkbtn" data-reading="${esc(r.id)}">${esc(r.title)}</button></li>`).join('')}${tp.external.slice(0, 3).map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><small>${esc(x.publisher)} · ${T('external, opens in a new tab', 'خارجي')}</small></li>`).join('')}</ul></section>
        <section class="lh__sec"><h2 class="lh__h">${T('Practice', 'التدريب')}</h2><p>${qs.length} ${T('questions', 'أسئلة')} · ${qs.filter(q => answered.has(q.id)).length} ${T('tried', 'جُربت')}${myMist.length ? ` · ${myMist.length} ${T('to revisit', 'للمراجعة')}` : ''}</p><div class="ls-row"><button type="button" class="ls-btn ls-btn--sm" data-prac="${esc(L.topic)}">${T('Practise this topic', 'تدرّب على هذا الموضوع')}</button>${myMist.length ? `<a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/mistakes">${T('Mistakes', 'الأخطاء')}</a>` : ''}</div></section>
        <section class="lh__sec"><h2 class="lh__h">${T('My notes & cards', 'ملاحظاتي وبطاقاتي')}</h2><ul class="ltp__list">${myNotes.slice(0, 4).map(n => `<li><a href="#/notebook/${n.id}">${esc(n.title)}</a></li>`).join('')}</ul><p class="ls-small ls-muted">${myCards.length} ${T('flashcards on this topic', 'بطاقات لهذا الموضوع')} · ${myNotes.length} ${T('notes', 'ملاحظات')}</p></section>
      </div></div>`;
    view.querySelector('.ltp').addEventListener('click', e => { const pr = e.target.closest('[data-prac]'); if (pr) { e.preventDefault(); LS.practiceWith({ topic: pr.dataset.prac, mode: 'guided' }); } const r = e.target.closest('[data-reading]'); if (r) LS.openReading(r.dataset.reading); if (e.target.closest('[data-asktopic]')) LS.noor.ask('explain', { text: tp.title + ': ' + L.objectives.join(' '), lesson: L }); });
  }

  LS.route('home', home); LS.route('subject', (v, p) => subject(v, p[0])); LS.route('topic', (v, p) => topic(v, p[0]));
})();
