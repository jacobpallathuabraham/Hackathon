/* ERLY Learning Studio — Home and subjects (v21 "Atelier").
   The opening spread: a sentence of verbs instead of a grid of tiles (read · learn · watch · explore · practise ·
   revise · write · ask), and a shelf of things to pick up again — built only from what the student actually did
   (lesson sections, reading position, video time, models opened, practice). Then the atlas of subjects, each with
   its own drawn emblem and colour, a live interactive to play with right on the page, and quiet figures for today.
   Nothing on this page is invented: every number is counted from the learning record or the content itself. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store;
  const icon = (k, c) => LS.icon(k, c);

  /* ---------- subjects: one colour and one emblem each ---------- */
  const E = {
    maths: '<path d="M10 50 C 22 50 22 14 32 14 S 42 50 54 50"/><path d="M6 32h52M32 6v52" opacity=".35"/><circle cx="32" cy="14" r="2.5"/>',
    physics: '<ellipse cx="32" cy="32" rx="25" ry="9"/><ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(120 32 32)"/><circle cx="32" cy="32" r="3.5"/>',
    chemistry: '<path d="M32 10 51 21v22L32 54 13 43V21z"/><path d="M32 18 44 25v14l-12 7-12-7V25z" opacity=".45"/><circle cx="32" cy="10" r="2.5"/><circle cx="51" cy="43" r="2.5"/>',
    biology: '<path d="M22 6c0 14 20 18 20 32s-20 14-20 20M42 6c0 14-20 18-20 32s20 14 20 20"/><path d="M25 14h14M23 24h18M23 40h18M25 50h14" opacity=".5"/>',
    cs: '<path d="M22 20 10 32l12 12M42 20l12 12-12 12M36 14 28 50"/>',
    english: '<path d="M14 12h22a12 12 0 0 1 0 24H24v16"/><path d="M24 12v40M40 52h10" opacity=".5"/>',
    geography: '<circle cx="32" cy="32" r="22"/><path d="M10 32h44M32 10c-8 8-8 36 0 44M32 10c8 8 8 36 0 44" opacity=".5"/><path d="M18 18c4 4 10 2 14 6s2 8 6 10 8 0 10 4"/>',
    history: '<path d="M20 8h24M20 56h24M22 8c0 14 20 16 20 24s-20 10-20 24M42 8c0 14-20 16-20 24s20 10 20 24"/><path d="M27 50h10" opacity=".5"/>',
    languages: '<path d="M8 14h30a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H22l-8 7v-7H8a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z"/><path d="M46 26h10a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-4v6l-7-6h-9a4 4 0 0 1-4-4v-4" opacity=".55"/>',
    social: '<path d="M6 56h52M10 56V30l10-6v32M24 56V18l12-8v46M40 56V28l14 6v22"/><path d="M15 36h2M15 44h2M29 26h2M29 34h2M29 42h2M46 40h2M46 48h2" opacity=".55"/>',
    more: '<circle cx="20" cy="22" r="8"/><circle cx="44" cy="22" r="8"/><circle cx="32" cy="44" r="8"/><path d="M26 27l4 10M38 27l-4 10M28 22h8" opacity=".5"/>'
  };
  const emblem = (id, cls) => `<svg viewBox="0 0 64 64" aria-hidden="true" class="${cls || ''}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${E[id] || E.more}</svg>`;
  const SUBJECTS = [
    { id: 'maths', name: 'Mathematics', ar: 'الرياضيات', lesson: /math/i, lab: /^(Maths|Mathematics|Statistics)$/, read: [], vid: /math/i, topics: ['Functions & graphs', 'Calculus', 'Geometry & trigonometry', 'Probability & statistics'], blurb: 'Functions, calculus, geometry and statistics you can move and test.', world: 'Geometry' },
    { id: 'physics', name: 'Physics', ar: 'الفيزياء', lesson: /physic/i, lab: /^(Physics|Engineering)$/, read: ['mech210'], vid: /physic/i, topics: ['Motion & forces', 'Energy', 'Waves & optics', 'Circuits & fields'], blurb: 'Motion, energy, waves and circuits — change the numbers and watch.', world: 'Space & forces' },
    { id: 'chemistry', name: 'Chemistry', ar: 'الكيمياء', lesson: /chem/i, lab: /^(Chemistry|Chemical engineering)$/, read: [], vid: /chem/i, topics: ['Atoms & the periodic table', 'Bonding & shape', 'Acids & bases', 'Reactions'], blurb: 'Atoms, bonds, shapes and reactions in three dimensions.', world: 'Matter' },
    { id: 'biology', name: 'Biology', ar: 'الأحياء', lesson: /bio/i, lab: /^(Biology|Medicine)$/, read: ['biol101'], vid: /bio/i, topics: ['Cells', 'The heart & circulation', 'Genetics & DNA', 'Photosynthesis'], blurb: 'Cells, body systems, genetics and the living world.', world: 'Living systems' },
    { id: 'cs', name: 'Computer science', ar: 'علوم الحاسوب', lesson: /comput/i, lab: /^(Computer science|Computing)$/, read: ['csci110'], vid: /comput/i, topics: ['Algorithms', 'Data', 'Programming ideas'], blurb: 'Algorithms and how programs think.', world: 'Logic' },
    { id: 'english', name: 'English & study', ar: 'الإنجليزية والدراسة', lesson: /english/i, lab: /^English$/, read: [], vid: /study|english/i, topics: ['Reading with focus', 'Note-making', 'Writing clearly'], blurb: 'Reading tools, note-making and writing support for every subject.', world: 'Story world' },
    { id: 'geography', name: 'Geography & environment', ar: 'الجغرافيا والبيئة', lesson: /geog|environ/i, lab: /^(Environment|Geography)$/, read: ['envs120'], vid: /geog|environ/i, topics: ['Energy & sustainability', 'Climate'], blurb: 'Energy, climate and the systems we live in.', world: 'Living Earth' },
    { id: 'history', name: 'History', ar: 'التاريخ', lesson: /histor/i, lab: /^History$/, read: [], vid: /histor/i, topics: ['History of science', 'Evidence & sources', 'Timelines'], blurb: 'How we know what we know: sources, evidence and how ideas changed.', world: 'Time explorer' },
    { id: 'languages', name: 'Languages', ar: 'اللغات', lesson: /language|french|arabic/i, lab: /^Languages$/, read: [], vid: /language/i, topics: ['Everyday conversation', 'Useful phrases'], blurb: 'Conversations you can practise, out loud if you like.', world: 'Conversation journey' },
    { id: 'social', name: 'Social science', ar: 'العلوم الاجتماعية', lesson: /social|civic/i, lab: /^Social science$/, read: [], vid: /social/i, topics: ['Cities & resources', 'Trade-offs'], blurb: 'Cities, resources and the choices societies make.', world: 'Civilisation lab' },
    { id: 'more', name: 'Economics, psychology & more', ar: 'الاقتصاد وعلم النفس والمزيد', lesson: /econ|psych|business/i, lab: /^(Economics|Commerce)$/, read: ['psyc101', 'busn210'], vid: /econ|psych/i, topics: ['Markets', 'Memory & learning', 'Marketing'], blurb: 'Markets, memory and the social sciences.', world: 'Markets & minds' }
  ];
  LS.subjectsList = SUBJECTS.map(s => Object.assign({}, s, { name: s.name }));
  LS.emblem = emblem;
  const lab = () => (window.ERLY_LAB ? ERLY_LAB.engines : []);
  const kindOf = e => String(e.kind || '').split('·')[0].trim();
  function contents(S) {
    return {
      lessons: (LS.lessons || []).filter(L => S.lesson.test(L.subject)),
      models: lab().filter(e => S.lab.test(kindOf(e))),
      readings: (window.STUDIO_LIBRARY || []).filter(d => S.read.includes(d.id)),
      videos: (LS.VIDEOS || []).concat(LS.EXTERNAL_VIDEOS || []).filter(v => S.vid.test(v.subject || '')),
      paths: (LS.paths || []).filter(p => S.lesson.test(p.subject))
    };
  }
  LS.subjectContents = id => { const S = SUBJECTS.find(s => s.id === id); return S ? contents(S) : null; };
  const subjOfLesson = L => SUBJECTS.find(s => s.lesson.test(L.subject)) || SUBJECTS[7];
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const countLine = c => [[c.lessons.length, 'lesson', 'lessons'], [c.models.length, 'model', 'models'], [c.readings.length, 'reading', 'readings'], [c.videos.length, 'video', 'videos']].filter(x => x[0]).map(x => plural(...x)).join(' · ');

  /* ---------- the shelf: real things to pick up again ---------- */
  function readerProgress() { try { return (JSON.parse(localStorage.getItem('erly-studio-v1') || '{}').prog) || {}; } catch (e) { return {}; } }
  function resumables() {
    const d = st.data(), out = [], seen = new Set(), rp = readerProgress();
    const push = x => { const k = x.type + ':' + x.id; if (seen.has(k)) return; seen.add(k); out.push(x); };
    const lessonItem = id => { const L = LS.lesson(id), p = d.lessons[id]; if (!L || !p) return null; const n = L.sections.filter(s => (p.done || {})[s.id]).length; if (p.completed) return null; const sec = L.sections[Math.min(p.secIx || 0, L.sections.length - 1)]; return { type: 'lesson', id, at: p.last || 0, cls: 'at-subj-' + subjOfLesson(L).id, ic: 'learn', title: L.title, meta: T(`Lesson · ${n} of ${L.sections.length} sections · next: ${sec.title}`, `درس · ${n} من ${L.sections.length}`), frac: n / L.sections.length, href: `#/lesson/${id}` }; };
    (d.recent || []).forEach(r => {
      if (out.length >= 5) return;
      if (r.type === 'lesson') { const x = lessonItem(r.id); if (x) push(x); }
      else if (r.type === 'reading') { const doc = (window.STUDIO_LIBRARY || []).find(x => x.id === r.id), p = rp[r.id]; if (doc) push({ type: 'reading', id: r.id, at: r.at, cls: 'at-subj-' + ((SUBJECTS.find(s => s.read.includes(r.id)) || SUBJECTS[7]).id), ic: 'read', title: doc.title.replace(/_/g, ' ').replace(/\.pdf$/i, ''), meta: T(`Reading · ${doc.course}${p ? ` · ${Math.round(p.frac * 100)}% read` : ''}`, 'قراءة'), frac: p ? p.frac : 0, read: r.id }); }
      else if (r.type === 'video') { const v = (LS.VIDEOS || []).find(x => x.id === r.id), vp = d.video[r.id]; if (v) push({ type: 'video', id: r.id, at: r.at, cls: 'at-subj-' + ((SUBJECTS.find(s => s.vid.test(v.subject || '')) || SUBJECTS[7]).id), ic: 'watch', title: v.title, meta: T(`Video${vp && vp.t ? ` · stopped at ${Math.floor(vp.t / 60)}:${String(Math.floor(vp.t % 60)).padStart(2, '0')}` : ''}`, 'فيديو'), frac: 0, href: `#/video/${r.id}` }); }
      else if (r.type === 'lab') push({ type: 'lab', id: r.id, at: r.at, cls: 'at-subj-physics', ic: 'model', title: r.title || r.id, meta: T('Interactive model', 'نموذج تفاعلي'), frac: 0, href: `#/lab/${r.id}` });
    });
    Object.keys(d.lessons).sort((a, b) => (d.lessons[b].last || 0) - (d.lessons[a].last || 0)).forEach(id => { if (out.length < 5) { const x = lessonItem(id); if (x) push(x); } });
    const week = Date.now() - 7 * 864e5, recentAns = d.attempts.filter(a => a.at > week && a.from === 'practice');
    if (recentAns.length && out.length < 5) push({ type: 'practice', id: 'p', at: recentAns[recentAns.length - 1].at, cls: 'at-subj-more', ic: 'practise', title: T('Practice', 'التدريب'), meta: T(`${recentAns.length} answers this week · ${Object.values(d.mistakes).filter(m => !m.laterCorrect).length} to revisit`, 'تدريب'), frac: 0, href: '#/practice' });
    return out.slice(0, 5);
  }
  LS.resumables = resumables;
  LS.waveSVG = (a, b) => waveSVG(a, b); LS.waveText = (a, b) => waveText(a, b);

  /* ---------- a small live interactive: two waves meeting (computed on input only — nothing runs idle) ---------- */
  function waveSVG(f2, ph) {
    const W = 800, H = 280, mid = H / 2, n = 200, pts = [[], [], []];
    for (let i = 0; i <= n; i++) { const x = i / n, a = Math.sin(2 * Math.PI * 3 * x), b = Math.sin(2 * Math.PI * 3 * f2 * x + ph * Math.PI / 180); pts[0].push([x * W, mid - a * 46]); pts[1].push([x * W, mid - b * 46]); pts[2].push([x * W, mid - (a + b) * 46]); }
    const d = p => 'M' + p.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L');
    return `<path d="${d(pts[0])}" fill="none" stroke="hsl(204 60% 50% / .55)" stroke-width="2"/><path d="${d(pts[1])}" fill="none" stroke="hsl(352 60% 52% / .55)" stroke-width="2"/><path d="${d(pts[2])}" fill="none" stroke="currentColor" stroke-width="3"/>`;
  }
  const waveText = (f2, ph) => (Math.abs(f2 - 1) < .02 ? (Math.abs(((ph % 360) + 360) % 360 - 180) < 8 ? T('Same frequency, half a cycle apart: the waves cancel — destructive interference.', 'تداخل هدّام: الموجتان تلغيان بعضهما.') : ph % 360 < 8 || ph % 360 > 352 ? T('Same frequency, in step: the waves add — constructive interference, twice the height.', 'تداخل بنّاء: ضعف الارتفاع.') : T('Same frequency, partly out of step: still one clean wave, but smaller than double.', 'موجة واحدة أصغر من الضعف.')) : T(`Different frequencies (ratio ${f2.toFixed(2)}): the sum swells and fades — the pattern musicians hear as beats.`, 'ترددات مختلفة: نبضات.'));

  /* ---------- home ---------- */
  function home(view) {
    const d = st.data(), consent = st.consent(), items = resumables(), J = LS.journey;
    const day = new Date();
    const VERBS = [['read', 'read', 'اقرأ', 'Readings, open textbooks, study guides and your own PDFs — in a focused reader.', '#/read'], ['learn', 'learn', 'تعلّم', 'Step-by-step interactive lessons with live models and questions.', '#/lessons'], ['watch', 'watch', 'شاهد', 'Narrated ERLY videos with captions, chapters and a clickable transcript.', '#/video'], ['explore', 'explore', 'استكشف', `${lab().length || 174} interactive models you can change and test.`, '#/explore'], ['practise', 'practise', 'تدرّب', 'Questions that explain every answer, and a notebook of mistakes.', '#/practice'], ['revise', 'revise', 'راجع', 'Flashcards that space themselves out — each says why it is due.', '#/revise'], ['write', 'write notes', 'دوّن', 'A notebook with headings, maths, tags and saved explanations.', '#/notebook'], ['ask', 'ask Noor', 'اسأل نور', 'Select anything and ask Noor to explain, simplify or quiz you.', 'noor']];
    const f = LS.engine ? LS.engine.funnel() : null;
    const line = !f || (!f.attempted && !Object.keys(d.lessons).length) ? T('Pick anything below. What you actually do is all this page ever shows.', 'اختر أي شيء. هذه الصفحة تعرض ما تفعله فقط.')
      : [f.demonstrated ? `${f.demonstrated} ${T(f.demonstrated === 1 ? 'objective demonstrated' : 'objectives demonstrated', 'أهداف مُثبتة')}` : '', f.revisit ? `${f.revisit} ${T('worth another look', 'تستحق نظرة أخرى')}` : '', f.review ? `${f.review} ${T('ready for review', 'جاهزة للمراجعة')}` : ''].filter(Boolean).join(' · ') || T('Every answer you give builds the picture.', 'كل إجابة تبني الصورة.');
    const top = items[0], rest = items.slice(1, 4);
    view.innerHTML = `<div class="at-home at-home--v22">
      <section class="at-open" aria-labelledby="atHomeH">
        <div>
          <p class="at-k">${T('Learning Studio', 'استوديو التعلّم')} · ${esc(day.toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
          <h1 class="at-open__h" id="atHomeH">${T('Let’s make something', 'لنجعل شيئاً')} <em>${T('click.', 'يتّضح.')}</em></h1>
          <p class="at-open__line">${esc(line)}</p>
          <p class="at-verbs">${T('I’d like to', 'أريد أن')} ${VERBS.map(([k, en, ar, hint, href], i) => `${i ? ' <span class="at-dot" aria-hidden="true">·</span> ' : ' '}<a href="${href === 'noor' ? '#' : href}" data-hint="${esc(hint)}"${href === 'noor' ? ' data-open-noor' : ''}>${T(en, ar)}</a>`).join('')}</p>
          <p class="at-verbhint" id="atVerbHint" aria-hidden="true">&nbsp;</p>
        </div>
        <aside class="at-shelf" aria-labelledby="atShelfH">
          <p class="at-shelf__h"><b id="atShelfH">${T('Continue learning', 'تابع التعلّم')}</b>${items.length ? `<a class="at-more" href="#/progress">${T('Progress', 'التقدّم')}</a>` : ''}</p>
          ${top ? `<div class="at-continue ${top.cls}">${top.read ? `<button type="button" data-read="${esc(top.read)}">` : `<a href="${top.href}">`}<span class="at-glyph">${icon(top.ic)}</span><span class="at-continue__t"><b>${esc(top.title)}</b><small>${top.meta}</small></span>${top.frac != null ? `<span class="at-bar" role="progressbar" aria-label="${T('Progress', 'التقدّم')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(100 * top.frac)}"><i style="--w:${Math.round(100 * top.frac)}%"></i></span>` : ''}<span class="at-continue__go">${T('Resume', 'استأنف')} →</span>${top.read ? '</button>' : '</a>'}</div>
            ${rest.length ? `<ul class="at-resume">${rest.map(x => `<li class="${x.cls}">${x.read ? `<button type="button" data-read="${esc(x.read)}">` : `<a href="${x.href}">`}<span class="at-glyph">${icon(x.ic)}</span><span><b>${esc(x.title)}</b><small>${x.meta}</small></span>${x.read ? '</button>' : '</a>'}</li>`).join('')}</ul>` : ''}`
            : `<p class="at-empty">${T('Nothing to resume yet. Start anything — a reading, a lesson, a video or an experience — and it will wait for you here, exactly where you stopped.', 'لا شيء بعد. ابدأ أي شيء وسينتظرك هنا.')}</p>`}
        </aside>
      </section>
      ${!consent && st.mode() !== 'demo' ? choice() : ''}
      ${J ? J.planHTML() : ''}
      ${J ? `<section class="at-sec at-two" aria-label="${T('Momentum and insights', 'الزخم والرؤى')}">${J.momentumHTML()}${J.insightsHTML(2, true)}</section>` : ''}
      <section class="at-sec at-two at-two--portal" aria-label="${T('Discover', 'اكتشف')}">
        ${LS.portalHTML ? LS.portalHTML(LS.portalPick(), false) : ''}
        <div><div class="at-sec__head"><h2 class="at-h2">${T('Discover', 'اكتشف')}</h2><a href="#/discover">${T('Everything', 'الكل')} →</a></div><ol class="at-list">${discover().map(x => `<li><a href="${x.href}"><b>${esc(x.title)}</b><small>${esc(x.meta)}</small></a></li>`).join('')}</ol></div>
      </section>
      <section class="at-sec" aria-labelledby="atAtlasH">
        <div class="at-sec__head"><h2 class="at-h2" id="atAtlasH">${T('Worlds', 'العوالم')}</h2><a href="#/explore">${T('Explore all', 'استكشف الكل')} →</a></div>
        <ul class="at-atlas" id="atAtlas">${SUBJECTS.filter(S => S.id !== 'cs' && S.id !== 'more').map(S => atlasItem(S)).join('')}</ul>
      </section></div>`;
    wireHome(view);
  }
  function atlasItem(S) {
    const c = contents(S), line = countLine(c);
    return `<li class="at-subj-${S.id}"><a href="#/subject/${S.id}">${emblem(S.id)}<b>${T(S.name, S.ar)}</b><small data-count="${S.id}">${line || T('Reading tools & Noor', 'أدوات القراءة ونور')}</small><ul class="at-atlas__t">${S.topics.slice(0, 3).map(t => `<li>${esc(t)}</li>`).join('')}</ul></a></li>`;
  }
  function choice() {
    return `<section class="at-choice" aria-labelledby="atChoiceH"><div><h2 id="atChoiceH">${T('Where should your learning be kept?', 'أين يُحفظ تعلّمك؟')}</h2><p>${T('Your place in lessons and readings, answers, flashcards, highlights and notes can be saved in this browser so you can come back to them — or kept only for this visit. Nothing is sent to ERLY or anyone else.', 'يمكن حفظ تقدّمك في هذا المتصفح أو لهذه الزيارة فقط. لا يُرسل شيء.')}</p></div>
      <div class="at-choice__b"><button type="button" class="ls-btn ls-btn--accent" data-consent="device">${T('Save on this device', 'احفظ على هذا الجهاز')}</button><button type="button" class="ls-btn" data-consent="visit">${T('Just this visit', 'لهذه الزيارة فقط')}</button><button type="button" class="ls-btn ls-btn--quiet" data-demo>${T('Explore with demo data', 'استكشف ببيانات تجريبية')}</button></div>
      <details><summary>${T('What exactly is stored, and what is sent?', 'ما الذي يُحفظ ويُرسل بالضبط؟')}</summary><p>${T('Stored (only if you choose this device): lesson progress, your answers and mistakes, flashcards, notes, bookmarks, reading position, highlights and video positions. Nothing about how long you hesitated, no keystrokes, no camera or microphone. When you ask Noor something, only your question and the passage you selected are used — and the Studio shows you whether Noor is answering on this device or online. You can export or delete everything in Privacy & data.', 'يُحفظ فقط ما تختاره. لا تشخيص. يمكنك الحذف في الخصوصية والبيانات.')}</p>
      <label class="ls-chk"><input type="checkbox" checked data-insights> ${T('Show me learning insights built from my own answers (never a diagnosis; you can turn this off later)', 'أظهر لي رؤى من إجاباتي')}</label></details></section>`;
  }
  function discover() {
    const dayN = Math.floor(Date.now() / 864e5), pick = (arr, k) => arr.length ? arr[(dayN + k) % arr.length] : null, out = [];
    const x = (LS.experiences || []).length ? pick(LS.experiences.filter(e => e.id !== (LS.portalPick && LS.portalPick().id)), 5) : null; if (x) out.push({ title: x.title, meta: T(`${LS.expKinds[x.kind]} · ${x.mins} min`, 'تجربة'), href: `#/exp/${x.id}` });
    const L = pick(LS.lessons || [], 0); if (L) out.push({ title: L.title, meta: T(`Lesson · ${L.subject} · ${L.mins} min`, 'درس'), href: `#/lesson/${L.id}` });
    const v = pick(LS.VIDEOS || [], 1); if (v) out.push({ title: v.title, meta: T(`ERLY video · ${v.subject}`, 'فيديو'), href: `#/video/${v.id}` });
    const r = pick(window.STUDIO_LIBRARY || [], 2); if (r) out.push({ title: r.title.replace(/_/g, ' ').replace(/\.pdf$/i, ''), meta: T(`Reading · ${r.course}`, 'قراءة'), href: `#/read/doc/${r.id}` });
    const e = pick(lab().filter(x => /^(Biology|Chemistry|Physics|Maths)$/.test(kindOf(x))), 3); if (e) out.push({ title: e.title, meta: T(`Interactive model · ${e.kind}`, 'نموذج'), href: `#/lab/${e.id}` });
    else out.push({ title: T('174 interactive models', '174 نموذجاً تفاعلياً'), meta: T('Maths, physics, chemistry and biology — loading…', 'جارٍ التحميل…'), href: '#/lab' });
    const p = pick(LS.paths || [], 4); if (p) out.push({ title: p.title, meta: T(`Learning path · ${p.subject}`, 'مسار'), href: `#/paths/${p.id}` });
    return out.slice(0, 5);
  }
  function wireHome(view) {
    const hint = view.querySelector('#atVerbHint');
    view.querySelector('.at-verbs').addEventListener('pointerover', e => { const a = e.target.closest('a'); if (a && hint) hint.textContent = a.dataset.hint; });
    view.querySelector('.at-verbs').addEventListener('focusin', e => { const a = e.target.closest('a'); if (a && hint) hint.textContent = a.dataset.hint; });
    view.querySelector('.at-verbs').addEventListener('click', e => { if (e.target.closest('[data-open-noor]')) e.preventDefault(); });
    if (!view._hwired) { view._hwired = true; view.addEventListener('click', e => { const r = e.target.closest('[data-read]'); if (r && LS.current()[0] === 'home') LS.openReading(r.dataset.read); }); }
    if (LS.journey) LS.journey.wire(view);
    const labIn = () => { if (!view.isConnected) return; view.querySelectorAll('[data-count]').forEach(x => { const S = SUBJECTS.find(y => y.id === x.dataset.count); x.textContent = countLine(contents(S)) || x.textContent; }); };
    if (!(window.ERLY_LAB && ERLY_LAB.engines.length > 100)) { const off = LS.on('lab-ready', () => { off(); labIn(); }); }
    if (LS.paintWorlds) LS.paintWorlds(view);
  }

  /* ---------- subject page ---------- */
  function subject(view, parts) {
    const S = SUBJECTS.find(s => s.id === parts[0]); if (!S) return LS.go('home', { replace: true });
    const c = contents(S), d = st.data();
    const row = (ic, title, meta, href, extra) => `<li class="at-subj-${S.id}"><div class="at-row"><span class="at-glyph">${icon(ic)}</span><span><a class="at-row__t" href="${href}">${esc(title)}</a><span class="at-row__m">${meta}</span></span><span class="at-row__p">${extra || ''}</span><span class="at-row__a"><a class="at-iconbtn" href="${href}" aria-label="${T('Open', 'افتح')} ${esc(title)}">→</a></span></div></li>`;
    const lessonMeta = L => { const p = d.lessons[L.id], n = p ? L.sections.filter(s => (p.done || {})[s.id]).length : 0; return { meta: `${esc(L.topic)} · ${L.mins} min · ${L.sections.length} ${T('sections', 'أقسام')}`, extra: p ? `<span>${p.completed ? T('Finished', 'مكتمل') : `${n}/${L.sections.length}`}</span><i><b style="width:${100 * n / L.sections.length}%"></b></i>` : '' }; };
    const xs = (LS.experiences || []).filter(x => x.subject === S.id);
    const objs = LS.engine ? [].concat(...c.lessons.map(L => LS.engine.objectivesOf(L.id))) : [];
    view.innerHTML = `<div class="at-subj at-subj-${S.id}"><header class="at-subj__head at-subj__head--world"><canvas class="at-world at-world--hero" data-world="${S.id}" aria-hidden="true"></canvas>${emblem(S.id)}<div><p class="at-k">${T('World', 'عالم')} · ${esc(S.world || '')}</p><h1 style="margin:0 0 10px">${T(S.name, S.ar)}</h1><p class="at-lead">${esc(S.blurb)}</p></div></header>
      ${xs.length ? `<section class="at-sec" style="margin-top:36px"><div class="at-sec__head"><h2 class="at-h2">${T('Experiences', 'تجارب')}</h2><a href="#/discover">${T('All experiences', 'كل التجارب')} →</a></div><ul class="at-xlist">${xs.map(x => LS.xItem(x, (d.events || []).some(e => e.t === 'experience' && e.id === x.id))).join('')}</ul></section>` : ''}
      ${objs.length ? `<section class="at-sec" style="margin-top:36px"><div class="at-sec__head"><h2 class="at-h2">${T('Your objectives here', 'أهدافك هنا')}</h2><a href="#/journey">${T('See your sky', 'شاهد سماءك')} →</a></div><ul class="at-objs">${objs.map(o => LS.objRow(o)).join('')}</ul></section>` : ''}
      ${c.paths.length ? `<section class="at-sec" style="margin-top:36px"><div class="at-sec__head"><h2 class="at-h2">${T('Learning paths', 'مسارات التعلم')}</h2></div><ul class="at-index">${c.paths.map(p => row('paths', p.title, `${esc(p.level || '')} · ${p.steps.length} ${T('lessons', 'دروس')} · ${esc(p.desc || '')}`, `#/paths/${p.id}`)).join('')}</ul></section>` : ''}
      ${c.lessons.length ? `<section class="at-sec" style="margin-top:36px"><div class="at-sec__head"><h2 class="at-h2">${T('Interactive lessons', 'دروس تفاعلية')}</h2></div><ul class="at-index">${c.lessons.map(L => { const m = lessonMeta(L); return row('learn', L.title, m.meta, `#/lesson/${L.id}`, m.extra); }).join('')}</ul></section>` : ''}
      ${c.readings.length ? `<section class="at-sec" style="margin-top:36px"><div class="at-sec__head"><h2 class="at-h2">${T('Readings', 'القراءات')}</h2><a href="#/read">${T('All reading & resources', 'كل القراءة والموارد')} →</a></div><ul class="at-index">${c.readings.map(r => row('read', r.title.replace(/_/g, ' ').replace(/\.pdf$/i, ''), esc(r.course), `#/read/doc/${r.id}`)).join('')}</ul></section>` : ''}
      ${c.videos.length ? `<section class="at-sec" style="margin-top:36px"><div class="at-sec__head"><h2 class="at-h2">${T('Videos', 'الفيديو')}</h2></div><ul class="at-index">${c.videos.map(v => row('watch', v.title, esc(v.id ? T('ERLY video · captions, chapters and transcript', 'فيديو ERLY') : `${v.by || ''} · YouTube`), v.id ? `#/video/${v.id}` : '#/video')).join('')}</ul></section>` : ''}
      <section class="at-sec" style="margin-top:36px"><div class="at-sec__head"><h2 class="at-h2">${T('Interactive models', 'نماذج تفاعلية')}</h2><a href="#/lab">${T('Open the Lab', 'افتح المختبر')} →</a></div>
        ${window.ERLY_LAB ? (c.models.length ? `<div class="at-cols">${c.models.slice().sort((a, b) => (a.title || '').localeCompare(b.title || '')).map(e => `<a class="at-row__t" style="font-size:1rem;padding:8px 0;border-bottom:1px solid var(--line)" href="#/lab/${e.id}">${esc(e.title || e.id)}</a>`).join('')}</div>` : `<p class="at-muted">${T('No interactive models for this subject yet — the Lab says so honestly rather than inventing one.', 'لا نماذج لهذه المادة بعد.')}</p>`) : `<p class="at-muted" aria-busy="true">${T('Loading the models…', 'جارٍ تحميل النماذج…')}</p>`}</section></div>`;
    if (!window.ERLY_LAB && LS.needLab) LS.needLab().then(() => { if (view.isConnected && LS.current()[0] === 'subject') subject(view, parts); });
    if (LS.paintWorlds) LS.paintWorlds(view);
  }

  LS.route('home', home);
  LS.route('subject', subject);
})();
