/* ERLY Learning Studio — the shell: navigation, Home, Library, Lessons, Learning Paths, My Progress,
   Noor Tutor, Profile & privacy, first-visit consent and the clearly labelled demonstration dataset.
   Every number on these pages is computed from the learning record in ls-core.js. Nothing is invented: with no
   activity the dashboard shows how to begin, not placeholder statistics. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store, IL = LS.inline, I = LS.intel;
  const NAV = [
    ['home', 'Home', 'الرئيسية', 'home'], ['library', 'My Library', 'مكتبتي', 'book'], ['lessons', 'Interactive Lessons', 'الدروس التفاعلية', 'layers'], ['lab', 'Visual Learning Lab', 'مختبر التعلم المرئي', 'atom'], ['video', 'Video Studio', 'استوديو الفيديو', 'play'],
    ['practice', 'Practice Centre', 'مركز التدريب', 'target'], ['revise', 'Flashcards & Revision', 'البطاقات والمراجعة', 'cards'], ['notebook', 'My Notebook', 'دفتري', 'pen'], ['paths', 'Learning Paths', 'مسارات التعلم', 'route'], ['noor', 'Noor Tutor', 'المعلمة نور', 'spark'], ['progress', 'My Progress', 'تقدمي', 'chart']
  ];
  const GROUPS = [['Learn', 'تعلّم', ['home', 'library', 'lessons', 'lab', 'video']], ['Practise', 'تدرّب', ['practice', 'revise']], ['My work', 'عملي', ['notebook', 'paths', 'noor', 'progress']]];
  const ICONS = { home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z', book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', atom: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 3c4 0 7 4 7 9s-3 9-7 9-7-4-7-9 3-9 7-9', play: 'M6 4l14 8-14 8z', target: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0', cards: 'M4 7h12v13H4zM8 4h12v13', pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3', route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8', spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2' };
  const ic = k => `<svg viewBox="0 0 24 24" aria-hidden="true" class="ls-i"><path d="${ICONS[k]}"/></svg>`;
  LS.ic = ic;

  /* ---------------- shell ---------------- */
  function shell() {
    const nav = document.getElementById('lsNav'), mob = document.getElementById('lsMob');
    nav.innerHTML = GROUPS.map(([en, ar, ids]) => `<p class="ls-nav__g">${T(en, ar)}</p><ul>${ids.map(id => { const n = NAV.find(x => x[0] === id); return `<li><a href="#/${id}" data-nav="${id}">${ic(n[3])}<span>${T(n[1], n[2])}</span><span class="ls-nav__badge" data-badge="${id}"></span></a></li>`; }).join('')}</ul>`).join('') + `<p class="ls-nav__g">${T('Settings', 'الإعدادات')}</p><ul><li><a href="#/profile" data-nav="profile">${ic('spark').replace('spark', 'x')}<span>${T('Profile, privacy & data', 'الملف والخصوصية')}</span></a></li></ul>`;
    nav.querySelector('[data-nav="profile"] svg').outerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" class="ls-i"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"/></svg>`;
    mob.innerHTML = ['home', 'lessons', 'practice', 'notebook'].map(id => { const n = NAV.find(x => x[0] === id); return `<a href="#/${id}" data-nav="${id}">${ic(n[3])}<span>${T(n[1].replace('Interactive ', '').replace(' Centre', '').replace('My ', ''), n[2])}</span></a>`; }).join('') + `<button type="button" data-more aria-expanded="false" aria-controls="lsNav">${ic('layers')}<span>${T('More', 'المزيد')}</span></button>`;
    mob.querySelector('[data-more]').addEventListener('click', e => { const on = !document.body.classList.contains('ls-navopen'); document.body.classList.toggle('ls-navopen', on); e.currentTarget.setAttribute('aria-expanded', on); if (on) nav.querySelector('a').focus(); });
    nav.addEventListener('click', e => { if (e.target.closest('a')) document.body.classList.remove('ls-navopen'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('ls-navopen')) { document.body.classList.remove('ls-navopen'); mob.querySelector('[data-more]').focus(); } });
    document.getElementById('lsAsk').addEventListener('submit', e => { e.preventDefault(); const v = e.target.q.value.trim(); if (!v) return; if (window.ERLY && ERLY.companion) { ERLY.companion.ask(v); e.target.q.value = ''; } });
    LS.on('route', ({ area }) => { document.querySelectorAll('[data-nav]').forEach(a => { const on = a.dataset.nav === area || (area === 'lesson' && a.dataset.nav === 'lessons') || (area === 'mistakes' && a.dataset.nav === 'practice'); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); badges(); banner(); });
    LS.on('change', () => badges());
  }
  function badges() {
    const now = Date.now(), d = st.data(), due = Object.values(d.cards).filter(c => (c.due || 0) <= now).length, mk = Object.values(d.mistakes).filter(m => !m.laterCorrect).length;
    const set = (k, n, label) => document.querySelectorAll(`[data-badge="${k}"]`).forEach(b => { b.textContent = n || ''; b.hidden = !n; if (n) b.setAttribute('aria-label', n + ' ' + label); });
    set('revise', due, T('cards due', 'بطاقات مستحقة')); set('practice', mk, T('open mistakes', 'أخطاء مفتوحة'));
  }
  function banner() {
    const b = document.getElementById('lsBanner'); if (!b) return;
    if (st.mode() === 'demo') { b.hidden = false; b.innerHTML = `<p><b>${T('Demonstration data', 'بيانات تجريبية')}</b> — ${T('everything you see is made up for exploring the Studio. It is not yours, is never saved, and is not mixed with your own learning record.', 'كل ما تراه مصطنع ولا يُحفظ.')} <button type="button" class="ls-btn ls-btn--sm" data-demooff>${T('Back to my own data', 'العودة لبياناتي')}</button></p>`; b.querySelector('[data-demooff]').onclick = () => { st.demo(false); LS.render(); }; }
    else b.hidden = true;
  }

  /* ---------------- first visit: where to keep learning data ---------------- */
  function consentCard() {
    return `<section class="ls-consent ls-panel" aria-labelledby="lsCH"><h2 id="lsCH">${T('Before you start: where should your learning be kept?', 'قبل البدء: أين نحفظ تعلمك؟')}</h2>
      <p>${T('The Studio remembers your lesson progress, answers, mistakes, flashcards and notes so you can continue later and see your progress. You choose where that lives:', 'تتذكر الاستوديو تقدمك. اختر مكان الحفظ:')}</p>
      <div class="ls-consent__opts"><button type="button" class="ls-opt-card" data-consent="device"><b>${T('Save on this device', 'احفظ على هذا الجهاز')}</b><span>${T('Kept in this browser only. Not sent to ERLY or anyone else. You can export or delete it any time.', 'في هذا المتصفح فقط.')}</span></button>
        <button type="button" class="ls-opt-card" data-consent="visit"><b>${T('Just this visit', 'لهذه الزيارة فقط')}</b><span>${T('Nothing is stored. Closing the tab forgets everything.', 'لا يُحفظ شيء.')}</span></button></div>
      <label class="ls-chk"><input type="checkbox" checked data-insights> ${T('Show me learning insights built from my own answers (you can turn this off later)', 'أظهر لي رؤى من إجاباتي')}</label>
      <p class="ls-muted ls-small">${T('ERLY never diagnoses anything. Insights describe how learning tasks went and suggest things to try; you can inspect, correct or dismiss each one. When you ask Noor something, only the question and the part of the lesson you selected are used. Full details:', 'لا تشخيص أبداً.')} <a href="#/profile">${T('Profile, privacy & data', 'الخصوصية')}</a>.</p>
      <p><button type="button" class="ls-linkbtn" data-demo>${T('Or explore first with demonstration data (made up, never saved)', 'أو استكشف ببيانات تجريبية')}</button></p></section>`;
  }
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-consent]'); if (c) { const ins = document.querySelector('[data-insights]'); st.setConsent({ store: c.dataset.consent, insights: ins ? ins.checked : true }); st.update(d => { d.settings.insights = ins ? ins.checked : true; }); LS.toast(c.dataset.consent === 'device' ? T('Your learning will be saved on this device.', 'سيُحفظ تعلمك على هذا الجهاز.') : T('Nothing will be stored after this visit.', 'لن يُحفظ شيء.')); LS.render(); }
    if (e.target.closest('[data-demo]')) { st.demo(true); LS.render(); }
  });

  /* ---------------- Home ---------------- */
  function home(view) {
    const d = st.data(), consent = st.consent(), now = Date.now();
    const lp = Object.entries(d.lessons).map(([id, p]) => ({ L: LS.lesson(id), p })).filter(x => x.L);
    const started = lp.filter(x => !x.p.completed).sort((a, b) => b.p.last - a.p.last), completed = lp.filter(x => x.p.completed);
    const marked = d.attempts.filter(a => a.correct === true || a.correct === false), firsts = marked.filter(a => (a.attemptNo || 1) === 1);
    const due = Object.values(d.cards).filter(c => (c.due || 0) <= now), open = Object.values(d.mistakes).filter(m => !m.laterCorrect);
    const recs = I.recommend(d, LS.lessons, { now });
    const notes = Object.values(d.notes).sort((a, b) => b.updated - a.updated).slice(0, 3);
    const fresh = !lp.length && !marked.length && !Object.keys(d.cards).length && !Object.keys(d.notes).length;
    const cont = d.recent[0];
    view.innerHTML = `<div class="ls-home">
      <header class="ls-hero"><p class="ls-kicker">${T('ERLY Interactive Learning Studio', 'استوديو التعلم التفاعلي')}</p><h1>${fresh ? T('Learn it your way — read it, see it, try it, explain it.', 'تعلّم بطريقتك.') : T('Welcome back.', 'مرحباً بعودتك.')}</h1>
        <p class="ls-lead">${fresh ? T('Interactive lessons with live models, videos with clickable transcripts, practice that explains every answer, flashcards that space themselves, and Noor to explain anything you select.', 'دروس تفاعلية ونماذج حية.') : esc(summaryLine(started, completed, firsts, due, open))}</p></header>
      ${!consent && st.mode() !== 'demo' ? consentCard() : ''}
      ${cont && cont.type === 'lesson' && LS.lesson(cont.id) ? (() => { const L = LS.lesson(cont.id), p = d.lessons[L.id] || {}, n = L.sections.filter(s => (p.done || {})[s.id]).length; return `<section class="ls-continue ls-panel" aria-labelledby="lsCont"><p class="ls-kicker" id="lsCont">${T('Continue where you stopped', 'تابع من حيث توقفت')}</p><div class="ls-continue__row"><div><h2>${esc(L.title)}</h2><p class="ls-muted">${p.secIx >= L.sections.length ? T('Summary and revision', 'الخلاصة') : T('Section', 'القسم') + ' ' + ((p.secIx || 0) + 1) + ': ' + esc(L.sections[p.secIx || 0].title)} · ${n}/${L.sections.length} ${T('sections done', 'أقسام')} · ${LS.ago(cont.at)}</p><div class="ls-meter" role="progressbar" aria-label="${T('Lesson progress', 'تقدم الدرس')}" aria-valuemin="0" aria-valuemax="${L.sections.length}" aria-valuenow="${n}"><i style="width:${100 * n / L.sections.length}%"></i></div></div><a class="ls-btn ls-btn--accent" href="#/lesson/${L.id}">${T('Continue', 'تابع')} →</a></div></section>`; })() : cont && cont.type === 'video' && LS.video.byId(cont.id) ? `<section class="ls-continue ls-panel"><p class="ls-kicker">${T('Continue watching', 'تابع المشاهدة')}</p><div class="ls-continue__row"><h2>${esc(cont.title)}</h2><a class="ls-btn ls-btn--accent" href="#/video/${esc(cont.id)}">${T('Resume', 'تابع')} →</a></div></section>` : ''}
      <div class="ls-dash">
        <section class="ls-panel ls-dash__today" aria-labelledby="lsToday"><h2 class="ls-h2" id="lsToday">${T('Suggested for today', 'مقترح لليوم')}</h2>${recs.length ? `<ul class="ls-recs">${recs.slice(0, 5).map(r => `<li><a href="${recHref(r)}"><b>${esc(r.title)}</b><small>${esc(r.why)}</small></a></li>`).join('')}</ul><p class="ls-muted ls-small">${T('Each suggestion says why it is here. They come from your own progress, due flashcards, open mistakes and your goals.', 'كل اقتراح يذكر سببه.')}</p>` : `<p class="ls-muted">${T('Nothing yet — pick any lesson to begin.', 'لا شيء بعد.')}</p>`}</section>
        <section class="ls-panel" aria-labelledby="lsRev"><h2 class="ls-h2" id="lsRev">${T('Revision', 'المراجعة')}</h2><p class="ls-big">${due.length}</p><p class="ls-muted">${T('flashcards due', 'بطاقة مستحقة')} · ${Object.keys(d.cards).length} ${T('in your deck', 'في مجموعتك')}</p>${due.length ? `<a class="ls-btn ls-btn--sm" href="#/revise/session/due">${T('Review now', 'راجع الآن')}</a>` : `<a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/revise">${T('Open revision', 'المراجعة')}</a>`}</section>
        <section class="ls-panel" aria-labelledby="lsMk"><h2 class="ls-h2" id="lsMk">${T('Mistakes to revisit', 'أخطاء للمراجعة')}</h2><p class="ls-big">${open.length}</p><p class="ls-muted">${Object.values(d.mistakes).filter(m => m.laterCorrect).length} ${T('already put right', 'صُححت')}</p><a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/mistakes">${T('Mistake notebook', 'دفتر الأخطاء')}</a></section>
        <section class="ls-panel" aria-labelledby="lsPr"><h2 class="ls-h2" id="lsPr">${T('Progress so far', 'التقدم حتى الآن')}</h2><dl class="ls-kv"><dt>${T('Lessons finished', 'دروس مكتملة')}</dt><dd>${completed.length} / ${LS.lessons.length}</dd><dt>${T('Lessons in progress', 'دروس جارية')}</dt><dd>${started.length}</dd><dt>${T('Questions answered', 'أسئلة مجابة')}</dt><dd>${marked.length}</dd><dt>${T('Right first time', 'صحيحة من أول مرة')}</dt><dd>${firsts.length >= 10 ? Math.round(100 * firsts.filter(a => a.correct).length / firsts.length) + '%' : `<span class="ls-muted ls-small">${T('shown after 10 answers', 'بعد ١٠ إجابات')}</span>`}</dd></dl><a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/progress">${T('My progress', 'تقدمي')}</a></section>
      </div>
      ${pathsStrip(d)}
      <div class="ls-dash ls-dash--2">
        <section class="ls-panel" aria-labelledby="lsRec"><h2 class="ls-h2" id="lsRec">${T('Recently opened', 'فُتح مؤخراً')}</h2>${d.recent.length ? `<ul class="ls-recent">${d.recent.slice(0, 6).map(r => `<li><a href="${recentHref(r)}"><span class="ls-tag">${esc(typeLabel(r.type))}</span> ${esc(r.title)}</a><small>${LS.ago(r.at)}</small></li>`).join('')}</ul>` : `<p class="ls-muted">${T('Lessons, videos and models you open will be listed here.', 'ستظهر هنا.')}</p>`}</section>
        <section class="ls-panel" aria-labelledby="lsNt"><h2 class="ls-h2" id="lsNt">${T('Recent notes', 'ملاحظات حديثة')}</h2>${notes.length ? `<ul class="ls-recent">${notes.map(n => `<li><a href="#/notebook/${n.id}">${esc(n.title)}</a><small>${LS.ago(n.updated)}</small></li>`).join('')}</ul>` : `<p class="ls-muted">${T('Select any text in a lesson and choose “Save to notebook”.', 'حدد نصاً واحفظه.')}</p>`}<a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/notebook">${T('My Notebook', 'دفتري')}</a></section>
        <section class="ls-panel" aria-labelledby="lsSv"><h2 class="ls-h2" id="lsSv">${T('Saved', 'المحفوظات')}</h2>${d.bookmarks.length ? `<ul class="ls-recent">${d.bookmarks.slice(0, 5).map(b => `<li><a href="${esc(b.where)}">${esc(b.label)}</a></li>`).join('')}</ul>` : `<p class="ls-muted">${T('Bookmarks from videos appear here.', 'تظهر العلامات هنا.')}</p>`}</section>
      </div>
      <section class="ls-panel" aria-labelledby="lsSug"><h2 class="ls-h2" id="lsSug">${fresh ? T('Start with a lesson', 'ابدأ بدرس') : T('Lessons', 'الدروس')}</h2><div class="ls-grid">${LS.lessons.map(lessonCard).join('')}</div></section>
    </div>`;
  }
  function summaryLine(started, completed, firsts, due, open) {
    const parts = [];
    if (started.length) parts.push(`${started.length} lesson${started.length === 1 ? '' : 's'} in progress`);
    if (completed.length) parts.push(`${completed.length} finished`);
    if (due.length) parts.push(`${due.length} card${due.length === 1 ? '' : 's'} due`);
    if (open.length) parts.push(`${open.length} mistake${open.length === 1 ? '' : 's'} to revisit`);
    return parts.length ? parts.join(' · ') + '.' : 'Pick up a lesson below.';
  }
  const recHref = r => ({ continue: `#/lesson/${r.id}`, new: `#/lesson/${r.id}`, practice: '#/practice', revise: '#/revise/session/due', mistakes: '#/mistakes' })[r.kind] || '#/home';
  const recentHref = r => ({ lesson: `#/lesson/${r.id}`, video: `#/video/${r.id}`, lab: `#/lab/${r.id}`, reading: '#/library', noor: '#/noor' })[r.type] || '#/home';
  const typeLabel = t => ({ lesson: 'Lesson', video: 'Video', lab: 'Model', reading: 'Reading', noor: 'Noor', audio: 'Audio' })[t] || t;
  function lessonCard(L) {
    const p = st.data().lessons[L.id], n = p ? L.sections.filter(s => (p.done || {})[s.id]).length : 0;
    return `<a class="ls-card" href="#/lesson/${L.id}"><span class="ls-card__k">${esc(L.subject)} · ${esc(L.level)}</span><b>${esc(L.title)}</b><small>${L.mins} min · ${L.sections.length} ${T('sections', 'أقسام')} · ${(L.formats || []).map(f => ({ text: 'read', visual: 'model', video: 'video', practice: 'practice', audio: 'audio' })[f]).join(' · ')}</small>${p ? `<span class="ls-meter ls-meter--sm" role="progressbar" aria-label="${T('Progress', 'التقدم')}" aria-valuemin="0" aria-valuemax="${L.sections.length}" aria-valuenow="${n}"><i style="width:${100 * n / L.sections.length}%"></i></span><small>${p.completed ? '✓ ' + T('Finished', 'مكتمل') : n + '/' + L.sections.length + ' ' + T('done', 'منجز')}</small>` : ''}${LS.provBadge(L.provenance.kind)}</a>`;
  }
  function pathsStrip(d) {
    const act = LS.paths.filter(P => P.steps.some(id => d.lessons[id]));
    if (!act.length) return '';
    return `<section class="ls-panel" aria-labelledby="lsAP"><h2 class="ls-h2" id="lsAP">${T('Your learning paths', 'مساراتك')}</h2><ul class="ls-pathmini">${act.map(P => { const done = P.steps.filter(id => d.lessons[id] && d.lessons[id].completed).length; return `<li><a href="#/paths/${P.id}"><b>${esc(P.title)}</b><small>${done}/${P.steps.length} ${T('lessons finished', 'دروس مكتملة')}</small></a></li>`; }).join('')}</ul></section>`;
  }

  /* ---------------- Library ---------------- */
  function resources() {
    const out = [];
    LS.lessons.forEach(L => out.push({ type: 'lesson', id: L.id, title: L.title, subject: L.subject, topic: L.topic, tags: (L.tags || []).join(' '), href: `#/lesson/${L.id}`, prov: L.provenance.kind, meta: `${L.mins} min · ${L.level}` }));
    (window.STUDIO_LIBRARY || []).forEach(R => out.push({ type: 'reading', id: R.id, title: R.title.replace(/_/g, ' ').replace(/\.pdf$/i, ''), subject: R.short || '', topic: R.course || '', tags: '', prov: 'demo', meta: R.course, reading: R.id }));
    LS.VIDEOS.forEach(V => out.push({ type: 'video', id: V.id, title: V.title, subject: V.subject, topic: V.topic, tags: '', href: `#/video/${V.id}`, prov: 'erly', meta: 'ERLY video lesson' }));
    LS.EXTERNAL_VIDEOS.forEach(V => out.push({ type: 'video', id: V.yt, title: V.title, subject: V.subject, topic: V.topic, tags: V.by, href: '#/video', prov: 'external', meta: V.by + ' · external' }));
    (window.ERLY_LAB ? ERLY_LAB.engines : []).forEach(e => out.push({ type: 'model', id: e.id, title: e.title || e.id, subject: String(e.kind || '').split('·')[0].trim(), topic: e.kind || '', tags: '', href: `#/lab/${e.id}`, prov: 'erly', meta: e.kind }));
    return out;
  }
  LS.resources = resources;
  LS.openReading = id => { if (window.ERLY && ERLY.openStudio) { st.touch('reading', id, ((window.STUDIO_LIBRARY || []).find(r => r.id === id) || {}).title || id); st.useFormat('text'); ERLY.openStudio(document.activeElement, id ? { doc: id } : { library: true }); } else LS.toast(T('The Reading Studio could not load.', 'تعذر تحميل استوديو القراءة.')); };
  function library(view) {
    const q = LS._libq || '', ty = LS._libt || 'all';
    const all = resources(), words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = all.filter(r => (ty === 'all' || r.type === ty) && words.every(w => (r.title + ' ' + r.subject + ' ' + r.topic + ' ' + r.tags + ' ' + r.meta).toLowerCase().includes(w)));
    const counts = {}; all.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
    const lim = ty === 'all' && !q ? 24 : 400;
    view.innerHTML = `<div class="ls-lib"><header class="ls-pagehead"><p class="ls-kicker">${T('My Library', 'مكتبتي')}</p><h1>${T('Everything you can learn from here', 'كل ما يمكنك التعلم منه')}</h1><p class="ls-lead">${counts.lesson || 0} ${T('lessons', 'دروس')} · ${counts.reading || 0} ${T('course readings (PDF reader)', 'قراءات')} · ${counts.video || 0} ${T('videos', 'فيديو')} · ${counts.model || 0} ${T('interactive models', 'نماذج تفاعلية')} · ${T('audio lessons on any topic', 'دروس صوتية لأي موضوع')}</p></header>
      <div class="ls-panel ls-libbar"><label class="ls-search ls-search--big"><span class="sr-only">${T('Search the library', 'ابحث في المكتبة')}</span><input type="search" data-libq value="${esc(q)}" placeholder="${T('Search lessons, readings, videos, models…', 'ابحث…')}" autocomplete="off"></label>
        <div class="ls-seg" role="group" aria-label="${T('Type', 'النوع')}">${[['all', T('All', 'الكل')], ['lesson', T('Lessons', 'دروس')], ['reading', T('Readings', 'قراءات')], ['video', T('Videos', 'فيديو')], ['model', T('Models', 'نماذج')]].map(([k, l]) => `<button type="button" data-libt="${k}" aria-pressed="${k === ty}">${l}</button>`).join('')}</div>
        <p class="ls-small ls-muted" aria-live="polite">${shown.length} ${T('results', 'نتيجة')}</p></div>
      ${LS.invalid.length ? `<div class="ls-call ls-call--warn" role="alert"><p>${LS.invalid.length} ${T('content item(s) failed validation and are hidden until fixed:', 'عناصر لم تجتز التحقق:')} ${LS.invalid.map(x => esc(x.id)).join(', ')}</p></div>` : ''}
      <ul class="ls-reslist">${shown.slice(0, lim).map(r => `<li class="ls-res ls-res--${r.type}">${r.reading ? `<button type="button" data-reading="${esc(r.reading)}">` : `<a href="${esc(r.href)}">`}<span class="ls-res__type">${esc(typeLabel(r.type === 'model' ? 'lab' : r.type))}</span><b>${esc(r.title)}</b><small>${esc(r.meta || '')}</small>${r.prov === 'external' ? `<span class="ls-prov ls-prov--ext">${T('External', 'خارجي')}</span>` : LS.provBadge(r.prov)}${r.reading ? '</button>' : '</a>'}</li>`).join('')}</ul>
      ${shown.length > lim ? `<p class="ls-muted">${shown.length - lim} ${T('more — search or choose a type to see them.', 'أخرى — ابحث لرؤيتها.')}</p>` : ''}
      <section class="ls-panel"><h2 class="ls-h2">${T('Your own files and any topic', 'ملفاتك وأي موضوع')}</h2><div class="ls-row"><button type="button" class="ls-btn" data-ownpdf>📄 ${T('Open your own PDF or text file', 'افتح ملف PDF خاص بك')}</button><form class="ls-row" data-audioform><label class="ls-field ls-field--inline">${T('Audio lesson on', 'درس صوتي عن')} <input name="t" placeholder="${T('e.g. the water cycle', 'مثلاً دورة الماء')}" required></label><button class="ls-btn" type="submit">🎧 ${T('Make it', 'أنشئه')}</button></form></div><p class="ls-muted ls-small">${T('Your own files are read on this device with the PDF reader and are never uploaded. Audio lessons quote a named encyclopedia source, or say when none was found.', 'ملفاتك تُقرأ على جهازك فقط.')}</p></section></div>`;
    const root = view.querySelector('.ls-lib');
    root.addEventListener('input', e => { if (e.target.matches('[data-libq]')) { LS._libq = e.target.value; clearTimeout(library.t); library.t = setTimeout(() => { const pos = e.target.selectionStart; LS.render(); const s = document.querySelector('[data-libq]'); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }, 220); } });
    root.addEventListener('click', e => { const t = e.target.closest('[data-libt]'); if (t) { LS._libt = t.dataset.libt; LS.render(); } const r = e.target.closest('[data-reading]'); if (r) LS.openReading(r.dataset.reading); if (e.target.closest('[data-ownpdf]')) LS.openReading(null); });
    root.querySelector('[data-audioform]').addEventListener('submit', e => { e.preventDefault(); const t = e.target.t.value.trim(); if (t && window.ERLY && ERLY.audioLesson) { st.useFormat('audio'); st.touch('audio', t, 'Audio lesson: ' + t); ERLY.audioLesson.start(t); } });
  }

  /* ---------------- Lessons ---------------- */
  function lessons(view) {
    const by = {}; LS.lessons.forEach(L => (by[L.subject] = by[L.subject] || []).push(L));
    view.innerHTML = `<header class="ls-pagehead"><p class="ls-kicker">${T('Interactive Lessons', 'الدروس التفاعلية')}</p><h1>${T('Structured lessons you can touch', 'دروس منظمة تفاعلية')}</h1><p class="ls-lead">${T('Each lesson mixes explanation, diagrams, live models, worked examples and activities, and ends with a summary, revision questions and flashcards. Your place is saved.', 'كل درس يمزج الشرح والنماذج والأنشطة.')}</p></header>
      ${Object.entries(by).map(([s, ls]) => `<section class="ls-panel"><h2 class="ls-h2">${esc(s)}</h2><div class="ls-grid">${ls.map(lessonCard).join('')}</div></section>`).join('')}
      <p class="ls-muted ls-small">${LS.lessons.length} ${T('lessons. Lessons are data in a validated registry (assets/js/learn/ls-lessons-*.js); adding one needs no new code.', 'دروس في سجل موثّق.')}</p>`;
  }

  /* ---------------- Learning Paths ---------------- */
  function paths(view, parts) {
    const d = st.data(), P = parts[0] && LS.paths.find(x => x.id === parts[0]);
    if (P) {
      const steps = P.steps.map(id => LS.lesson(id)).filter(Boolean); let nextFound = false;
      view.innerHTML = `<header class="ls-pagehead"><a class="ls-linkbtn" href="#/paths">← ${T('Learning Paths', 'المسارات')}</a><p class="ls-kicker">${esc(P.subject)} · ${esc(P.level)}</p><h1>${esc(P.title)}</h1><p class="ls-lead">${esc(P.desc)}</p></header>
        <ol class="ls-pathsteps">${steps.map((L, i) => { const p = d.lessons[L.id], done = p && p.completed, isNext = !done && !nextFound; if (isNext) nextFound = true; return `<li class="${done ? 'is-done' : isNext ? 'is-next' : ''}"><span class="ls-pathsteps__n" aria-hidden="true">${done ? '✓' : i + 1}</span><div><b>${esc(L.title)}</b><p class="ls-muted ls-small">${L.mins} min · ${L.objectives.length} ${T('objectives', 'أهداف')}${done ? ' · ' + T('finished', 'مكتمل') : p ? ' · ' + T('in progress', 'جارٍ') : ''}</p></div><a class="ls-btn ${isNext ? 'ls-btn--accent' : 'ls-btn--quiet'} ls-btn--sm" href="#/lesson/${L.id}">${done ? T('Review', 'راجع') : p ? T('Continue', 'تابع') : T('Start', 'ابدأ')}</a></li>`; }).join('')}
          <li class="${nextFound ? '' : 'is-next'}"><span class="ls-pathsteps__n" aria-hidden="true">★</span><div><b>${T('Mixed practice on the whole path', 'تدريب مختلط على المسار')}</b><p class="ls-muted ls-small">${T('Interleaved questions from every lesson above.', 'أسئلة متداخلة.')}</p></div><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-pathprac="${P.id}">${T('Practise', 'تدرّب')}</button></li></ol>`;
      view.querySelector('[data-pathprac]').addEventListener('click', () => LS.practiceWith({ topics: steps.map(L => L.topic), mode: 'independent' }));
      return;
    }
    view.innerHTML = `<header class="ls-pagehead"><p class="ls-kicker">${T('Learning Paths', 'مسارات التعلم')}</p><h1>${T('Journeys through a subject', 'رحلات عبر مادة')}</h1><p class="ls-lead">${T('A path orders lessons so that each builds on the last, and ends with mixed practice.', 'المسار يرتب الدروس.')}</p></header>
      <div class="ls-grid">${LS.paths.map(P => { const done = P.steps.filter(id => d.lessons[id] && d.lessons[id].completed).length; return `<a class="ls-card ls-card--path" href="#/paths/${P.id}"><span class="ls-card__k">${esc(P.subject)} · ${esc(P.level)}</span><b>${esc(P.title)}</b><small>${esc(P.desc)}</small><span class="ls-meter ls-meter--sm" role="progressbar" aria-label="${T('Path progress', 'تقدم المسار')}" aria-valuemin="0" aria-valuemax="${P.steps.length}" aria-valuenow="${done}"><i style="width:${100 * done / P.steps.length}%"></i></span><small>${done}/${P.steps.length} ${T('lessons finished', 'دروس مكتملة')}</small></a>`; }).join('')}</div>`;
  }
  // the same practice preset hook the insight buttons use
  const prac = LS.practiceWith;

  /* ---------------- My Progress (with explainable insights) ---------------- */
  function progress(view) {
    const d = st.data(), ins = d.settings.insights !== false;
    const marked = d.attempts.filter(a => a.correct === true || a.correct === false), firsts = marked.filter(a => (a.attemptNo || 1) === 1);
    const subj = {}; firsts.forEach(a => { const k = a.subject || 'Other'; subj[k] = subj[k] || { a: 0, n: 0, topics: {} }; subj[k].n++; if (a.correct) subj[k].a++; const t = subj[k].topics[a.topic] = subj[k].topics[a.topic] || { a: 0, n: 0 }; t.n++; if (a.correct) t.a++; });
    const R = ins ? I.analyse(d, { now: Date.now() }) : null;
    const weeks = {}; marked.forEach(a => { const w = weekOf(a.at); weeks[w] = weeks[w] || { a: 0, n: 0 }; weeks[w].n++; if (a.correct) weeks[w].a++; });
    const wk = Object.entries(weeks).sort().slice(-8);
    const fmtUse = Object.entries(d.formatUse || {}).sort((a, b) => b[1] - a[1]);
    view.innerHTML = `<div class="ls-prog"><header class="ls-pagehead"><p class="ls-kicker">${T('My Progress', 'تقدمي')}</p><h1>${T('How your learning is going', 'كيف يسير تعلمك')}</h1><p class="ls-lead">${T('Built only from what you did in the Studio. Nothing here is a grade, a prediction or a judgement about you.', 'مبني فقط مما فعلته. ليس درجة ولا حكماً.')}</p></header>
      ${!marked.length && !Object.keys(d.lessons).length ? `<section class="ls-empty ls-panel"><h2>${T('Nothing to show yet', 'لا شيء بعد')}</h2><p>${T('Finish a lesson section or answer a few questions and your progress will appear here — counted, never estimated.', 'أنهِ قسماً أو أجب عن أسئلة.')}</p><a class="ls-btn ls-btn--accent" href="#/lessons">${T('Choose a lesson', 'اختر درساً')}</a></section>` : `
      <section class="ls-panel"><h2 class="ls-h2">${T('By subject and topic', 'حسب المادة والموضوع')}</h2><p class="ls-muted ls-small">${T('First-try results only; retries are counted separately as recovery.', 'نتائج المحاولة الأولى فقط.')}</p>
        ${Object.entries(subj).map(([s, v]) => `<details class="ls-subj" open><summary><b>${esc(s)}</b> — ${v.a}/${v.n} ${T('right first time', 'صحيحة أولاً')}</summary><ul class="ls-bars">${Object.entries(v.topics).map(([t, x]) => `<li><span>${esc(t)}</span><span class="ls-bar" role="img" aria-label="${x.a} of ${x.n} right first time"><i style="width:${Math.round(100 * x.a / x.n)}%"></i></span><b>${x.a}/${x.n}</b>${x.n < 5 ? `<small class="ls-muted">${T('few answers yet', 'إجابات قليلة')}</small>` : ''}</li>`).join('')}</ul></details>`).join('') || `<p class="ls-muted">${T('No answers yet.', 'لا إجابات بعد.')}</p>`}</section>
      <section class="ls-panel"><h2 class="ls-h2">${T('Lessons', 'الدروس')}</h2><table class="ls-table"><caption class="sr-only">${T('Lesson progress', 'تقدم الدروس')}</caption><thead><tr><th scope="col">${T('Lesson', 'الدرس')}</th><th scope="col">${T('Sections done', 'أقسام')}</th><th scope="col">${T('Status', 'الحالة')}</th></tr></thead><tbody>${LS.lessons.map(L => { const p = d.lessons[L.id]; const n = p ? L.sections.filter(s => (p.done || {})[s.id]).length : 0; return `<tr><td><a href="#/lesson/${L.id}">${esc(L.title)}</a></td><td>${n}/${L.sections.length}</td><td>${p ? (p.completed ? '✓ ' + T('finished', 'مكتمل') + ' ' + LS.fmtDate(p.completed) : T('in progress', 'جارٍ')) : '—'}</td></tr>`; }).join('')}</tbody></table></section>
      ${wk.length >= 2 ? `<section class="ls-panel"><h2 class="ls-h2">${T('Answers by week', 'الإجابات أسبوعياً')}</h2><table class="ls-table"><caption class="sr-only">${T('Answers per week', 'الإجابات')}</caption><thead><tr><th scope="col">${T('Week starting', 'بداية الأسبوع')}</th><th scope="col">${T('Answers', 'إجابات')}</th><th scope="col">${T('Right', 'صحيحة')}</th></tr></thead><tbody>${wk.map(([w, x]) => `<tr><td>${esc(w)}</td><td>${x.n}</td><td>${x.a} (${Math.round(100 * x.a / x.n)}%)</td></tr>`).join('')}</tbody></table></section>` : ''}
      <section class="ls-panel"><h2 class="ls-h2">${T('Formats you chose', 'الصيغ التي اخترتها')}</h2>${fmtUse.length ? `<ul class="ls-bars">${fmtUse.map(([f, n]) => `<li><span>${esc(I.FORMAT_NAMES[f] || f)}</span><span class="ls-bar" role="img" aria-label="${n} times"><i style="width:${Math.round(100 * n / fmtUse[0][1])}%"></i></span><b>${n}</b></li>`).join('')}</ul><p class="ls-muted ls-small">${T('What you opened, counted — not a “learning style”.', 'ما فتحته معدوداً — ليس نمط تعلم.')}</p>` : `<p class="ls-muted">—</p>`}</section>`}
      <section class="ls-panel ls-insights" aria-labelledby="lsInsH"><h2 class="ls-h2" id="lsInsH">${T('Learning insights', 'رؤى التعلم')}</h2>
        ${!ins ? `<p>${T('Insights are switched off. Turn them on in', 'الرؤى متوقفة. شغلها من')} <a href="#/profile">${T('Profile, privacy & data', 'الخصوصية')}</a>.</p>` : `
        <p class="ls-muted">${T('Each insight shows what was observed, what it may mean for a learning task, other explanations, and things to try. You can open the evidence, dismiss an insight, or add a correction. ERLY does not diagnose and does not label you.', 'كل رؤية تعرض الملاحظة والتفسير والبدائل.')}</p>
        ${R.insights.filter(i => !i.dismissed).map(insightHTML).join('') || `<p>${T('No insights yet.', 'لا رؤى بعد.')}</p>`}
        ${R.notEnough.length ? `<details class="ls-ne"><summary>${T('Not enough evidence yet', 'أدلة غير كافية بعد')} (${R.notEnough.length})</summary><ul>${R.notEnough.map(n => `<li>${esc(n.text)}</li>`).join('')}</ul></details>` : ''}
        ${R.insights.filter(i => i.dismissed).length ? `<details><summary>${T('Dismissed insights', 'رؤى مستبعدة')} (${R.insights.filter(i => i.dismissed).length})</summary>${R.insights.filter(i => i.dismissed).map(i => `<p>${esc(i.title)}${i.note ? ` — <i>${esc(i.note)}</i>` : ''} <button type="button" class="ls-linkbtn" data-undismiss="${esc(i.key)}">${T('Restore', 'استعد')}</button></p>`).join('')}</details>` : ''}`}
      </section></div>`;
    const root = view.querySelector('.ls-prog');
    root.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (a) { act(JSON.parse(a.dataset.act)); return; }
      const ds = e.target.closest('[data-dismiss]'); if (ds) { const k = ds.dataset.dismiss; const dlg = LS.dialog(`<h2 id="lsDlgT">${T('Dismiss this insight', 'استبعد هذه الرؤية')}</h2><p>${T('It will be hidden. Optionally tell ERLY why — for example, “I was ill that week” or “these were deliberately hard questions”.', 'ستُخفى. يمكنك ذكر السبب.')}</p><label class="ls-field">${T('Correction or reason (optional)', 'تصحيح أو سبب')}<textarea name="n" rows="2"></textarea></label><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ok>${T('Dismiss', 'استبعد')}</button><button type="button" class="ls-btn ls-btn--quiet" data-close>${T('Cancel', 'إلغاء')}</button></div>`); dlg.el.querySelector('[data-ok]').onclick = () => { st.update(dd => { dd.dismissed[k] = { at: Date.now(), note: dlg.el.querySelector('[name=n]').value.trim().slice(0, 200) }; }); dlg.close(); LS.render(); }; return; }
      const ud = e.target.closest('[data-undismiss]'); if (ud) { st.update(dd => { delete dd.dismissed[ud.dataset.undismiss]; }); LS.render(); }
    });
  }
  function weekOf(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); }
  function insightHTML(i) {
    return `<article class="ls-ins ls-ins--${esc(i.kind)}" aria-labelledby="ins-${esc(i.key)}"><h3 id="ins-${esc(i.key)}">${esc(i.title)}</h3>
      <dl class="ls-ins__dl"><dt>${T('What was observed', 'ما لوحظ')}</dt><dd>${esc(i.observed)}</dd>${i.when ? `<dt>${T('When', 'متى')}</dt><dd>${esc(i.when.from)} → ${esc(i.when.to)} (${i.when.days} ${T('day(s)', 'يوم')})</dd>` : ''}
      <dt>${T('What it may mean for the task', 'ماذا قد يعني للمهمة')}</dt><dd>${esc(i.suggests)}</dd>
      ${i.alternatives.length ? `<dt>${T('Other explanations', 'تفسيرات أخرى')}</dt><dd><ul>${i.alternatives.map(a => `<li>${esc(a)}</li>`).join('')}</ul></dd>` : ''}
      <dt>${T('How reliable', 'مدى الموثوقية')}</dt><dd><span class="ls-rel ls-rel--${esc(i.reliability.level)}">${esc(i.reliability.label)}</span> — ${esc(i.reliability.why)}</dd></dl>
      <div class="ls-row">${i.tryThis.map(t => `<button type="button" class="ls-btn ls-btn--sm" data-act='${esc(JSON.stringify(t.act))}'>${esc(t.label)}</button>`).join('')}</div>
      ${i.evidence.length ? `<details class="ls-evid"><summary>${T('See the evidence', 'اعرض الأدلة')} (${i.evidence.length})</summary><table class="ls-table"><thead><tr><th scope="col">${T('Date', 'التاريخ')}</th><th scope="col">${T('Question', 'السؤال')}</th><th scope="col">${T('Type', 'النوع')}</th><th scope="col">${T('Result', 'النتيجة')}</th></tr></thead><tbody>${i.evidence.map(r => `<tr><td>${LS.fmtDate(r.at)}</td><td>${esc(r.prompt || r.q)}</td><td>${esc(I.TYPE_NAMES[r.type] || r.type)}</td><td>${r.correct ? '✓' : '✕'}</td></tr>`).join('')}</tbody></table></details>` : ''}
      <p class="ls-small"><button type="button" class="ls-linkbtn" data-dismiss="${esc(i.key)}">${T('This doesn’t fit — dismiss or correct it', 'لا يناسبني — استبعد')}</button></p></article>`;
  }
  function act(a) {
    if (a.go === 'lesson') { const L = LS.lessons.find(x => x.topic === a.topic); LS.go(L ? 'lesson/' + L.id : 'lessons'); }
    else if (a.go === 'practice') prac({ topic: a.topic, mode: a.mode, difficulty: a.difficulty, avoidType: a.avoidType });
    else if (a.go === 'noor') LS.noor.ask('explain', { text: a.topic || a.tag });
    else if (a.go === 'mistakes') { LS._mt = a.tag || ''; LS.go('mistakes'); }
    else if (a.go === 'revise') LS.go('revise/session/due');
    else if (a.go === 'settings') { st.update(d => { if (a.set === 'readAloud') d.settings.readAloud = true; else if (a.set === 'chunk') d.settings.chunk = true; else if (a.set === 'glossary') d.settings.glossary = true; else if (/^prefer:/.test(a.set)) d.profile.prefer = a.set.slice(7); }); LS.toast(T('Setting turned on. Change it any time in Profile.', 'فُعّل الإعداد.')); }
  }

  /* ---------------- Noor Tutor ---------------- */
  function noor(view) {
    const w = LS.noor.where(), last = LS.noor.lastSent;
    view.innerHTML = `<div class="ls-noor"><header class="ls-pagehead"><p class="ls-kicker">${T('Noor Tutor', 'المعلمة نور')}</p><h1>${T('Ask about what you are learning', 'اسأل عما تتعلمه')}</h1><p class="ls-lead">${T('Noor helps you understand rather than handing over answers: it asks you to try steps, explains mistakes and gives new examples.', 'نور تساعدك على الفهم.')}</p></header>
      <section class="ls-panel"><h2 class="ls-h2">${T('Where your questions go right now', 'أين تذهب أسئلتك الآن')}</h2><p class="ls-where ${w.online ? 'is-online' : 'is-local'}"><b>${esc(w.label)}</b></p><p class="ls-muted">${w.online ? T('This is an online AI service you agreed to use. Your question and the selected lesson text are sent to it.', 'خدمة ذكاء اصطناعي عبر الإنترنت وافقت عليها.') : T('Noor is answering on this device with its built-in brain — nothing leaves your device. Answers are simpler than an online AI’s and are labelled as such in the chat.', 'تجيب نور على جهازك.')} ${T('You can change this in Noor’s panel (the switch under the message box).', 'يمكنك التغيير من لوحة نور.')}</p><button type="button" class="ls-btn" data-opennoor>${T('Open Noor', 'افتح نور')}</button></section>
      <section class="ls-panel"><h2 class="ls-h2">${T('Ask about a topic', 'اسأل عن موضوع')}</h2><form class="ls-noorform" data-noorform><label class="ls-field">${T('Topic or question', 'الموضوع أو السؤال')}<input name="t" required placeholder="${T('e.g. why does the left ventricle have a thicker wall?', 'مثلاً…')}"></label>
        <fieldset class="ls-radios ls-radios--row"><legend class="sr-only">${T('What kind of help', 'نوع المساعدة')}</legend>${['explain', 'simplify', 'steps', 'example', 'practice', 'notes', 'activity'].map((k, i) => `<label><input type="radio" name="k" value="${k}" ${i === 0 ? 'checked' : ''}><span>${esc(LS.noor.LABELS[k])}</span></label>`).join('')}</fieldset>
        <div class="ls-row"><button class="ls-btn ls-btn--accent" type="submit">${T('Ask Noor', 'اسأل نور')}</button></div></form>
        <details><summary>${T('Compare two concepts', 'قارن مفهومين')}</summary><form class="ls-row" data-cmpform><label class="ls-field">A <input name="a" required></label><label class="ls-field">B <input name="b" required></label><button class="ls-btn" type="submit">${T('Compare', 'قارن')}</button></form></details>
        <details><summary>${T('Plan my revision', 'خطط مراجعتي')}</summary><form data-planform><label class="ls-field">${T('What is coming up, and how much time do you have?', 'ما القادم وكم لديك من وقت؟')}<textarea name="p" rows="2" placeholder="${T('e.g. a biology test on the heart in 5 days, 30 minutes a day', 'مثلاً…')}"></textarea></label><button class="ls-btn" type="submit">${T('Help me plan', 'ساعدني')}</button></form></details></section>
      <section class="ls-panel"><h2 class="ls-h2">${T('Inside lessons', 'داخل الدروس')}</h2><ul><li>${T('Select any text, then choose Explain, Simplify, Teach me step by step or Give another example.', 'حدد أي نص ثم اختر.')}</li><li>${T('Under a wrong answer: “Explain my mistake”.', 'تحت الإجابة الخاطئة: اشرح خطئي.')}</li><li>${T('Under a diagram: “Ask Noor what this shows”. Under an equation: “Teach me this step by step”.', 'تحت الرسم والمعادلة.')}</li><li>${T('In a video: “Summarise this section”.', 'في الفيديو: لخّص هذا القسم.')}</li></ul></section>
      <section class="ls-panel"><h2 class="ls-h2">${T('Exactly what Noor received last time', 'ما استلمته نور آخر مرة بالضبط')}</h2>${last ? `<p class="ls-muted ls-small">${LS.ago(last.at)} · ${esc(last.label)}</p><pre class="ls-pre">${esc(JSON.stringify({ request: last.prompt, context: last.context }, null, 2))}</pre><p class="ls-muted ls-small">${T('Nothing else from your learning record (answers, notes, insights, profile) is included.', 'لا شيء آخر من سجلك يُرسل.')}</p>` : `<p class="ls-muted">${T('You have not asked Noor anything from the Studio in this visit.', 'لم تسأل نور شيئاً في هذه الزيارة.')}</p>`}</section></div>`;
    const root = view.querySelector('.ls-noor');
    root.querySelector('[data-opennoor]').onclick = () => window.ERLY && ERLY.companion && ERLY.companion.open('chat');
    root.querySelector('[data-noorform]').addEventListener('submit', e => { e.preventDefault(); LS.noor.ask(e.target.k.value, { text: e.target.t.value.trim(), title: 'Noor Tutor' }); });
    root.querySelector('[data-cmpform]').addEventListener('submit', e => { e.preventDefault(); LS.noor.ask('compare', { a: e.target.a.value.trim(), b: e.target.b.value.trim(), title: 'Noor Tutor' }); });
    root.querySelector('[data-planform]').addEventListener('submit', e => { e.preventDefault(); LS.noor.ask('plan', { text: e.target.p.value.trim() || 'I want to revise what I have studied.', title: 'Noor Tutor' }); });
  }

  /* ---------------- Profile, privacy & data ---------------- */
  function profile(view) {
    const d = st.data(), c = st.consent(), P = d.profile, S = d.settings, bytes = st.sizeBytes();
    const chk = (name, v, label) => `<label class="ls-chipck"><input type="checkbox" name="${name}" value="${esc(v)}" ${(P[name] || []).includes(v) ? 'checked' : ''}><span>${esc(label)}</span></label>`;
    view.innerHTML = `<div class="ls-prof"><header class="ls-pagehead"><p class="ls-kicker">${T('Profile, privacy & data', 'الملف والخصوصية والبيانات')}</p><h1>${T('You decide', 'أنت تقرر')}</h1></header>
      <section class="ls-panel"><h2 class="ls-h2">${T('Where your learning is kept', 'أين يُحفظ تعلمك')}</h2>${st.mode() === 'demo' ? `<p class="ls-call ls-call--warn">${T('You are viewing demonstration data. These settings apply to your own data.', 'تعرض بيانات تجريبية.')}</p>` : ''}
        <p>${c ? (c.store === 'device' ? T('Saved on this device (this browser’s storage).', 'محفوظ على هذا الجهاز.') : T('This visit only — nothing is stored.', 'هذه الزيارة فقط.')) : T('Not chosen yet.', 'لم يُختر بعد.')} ${c ? `<span class="ls-muted ls-small">(${T('since', 'منذ')} ${LS.fmtDate(c.at)})</span>` : ''}</p>
        <div class="ls-row"><button type="button" class="ls-btn ls-btn--sm" data-consent="device">${T('Save on this device', 'احفظ على الجهاز')}</button><button type="button" class="ls-btn ls-btn--sm" data-consent="visit">${T('Switch to this visit only (removes stored data)', 'الزيارة فقط (يحذف المخزن)')}</button></div>
        <p class="ls-muted ls-small">${T('Stored size:', 'الحجم المخزن:')} ${(bytes / 1024).toFixed(1)} KB ${T('in localStorage key “erly-learn-v1”.', 'في المفتاح erly-learn-v1.')}</p></section>
      <section class="ls-panel"><h2 class="ls-h2">${T('Learning insights', 'رؤى التعلم')}</h2><label class="ls-switch"><input type="checkbox" data-set="insights" ${S.insights !== false ? 'checked' : ''}> ${T('Build insights from my answers (shown only to me, in My Progress)', 'ابنِ الرؤى من إجاباتي')}</label><p class="ls-muted ls-small">${T('Turning this off stops all analysis immediately. Your answers stay in your record (for the mistake notebook and progress) unless you delete them below.', 'إيقافه يوقف التحليل فوراً.')}</p></section>
      <form class="ls-panel" data-profile><h2 class="ls-h2">${T('My learning profile (optional)', 'ملفي التعليمي (اختياري)')}</h2><p class="ls-muted">${T('Only what you choose to tell ERLY. It is used to order suggestions — never to label you. ERLY does not infer anything about you from how you use the tools.', 'فقط ما تختاره. لا استنتاج.')}</p>
        <fieldset><legend>${T('Explanations I find helpful', 'الشروحات المفيدة لي')}</legend><div class="ls-chips">${[['visual', 'Diagrams and models'], ['examples', 'Worked examples'], ['analogies', 'Everyday comparisons'], ['short', 'Short and direct'], ['detailed', 'Detailed']].map(([v, l]) => chk('explain', v, l)).join('')}</div></fieldset>
        <fieldset><legend>${T('Formats I like', 'الصيغ التي أحبها')}</legend><div class="ls-chips">${[['text', 'Reading'], ['visual', 'Interactive models'], ['video', 'Video'], ['audio', 'Listening'], ['practice', 'Practice questions']].map(([v, l]) => chk('formats', v, l)).join('')}</div></fieldset>
        <div class="ls-row"><label class="ls-field">${T('Pace', 'الوتيرة')}<select name="pace"><option value="">—</option>${['steady', 'quick', 'gentle'].map(p => `<option ${P.pace === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label class="ls-field">${T('Put this format first when available', 'ضع هذه الصيغة أولاً')}<select name="prefer"><option value="">—</option>${['text', 'visual', 'video', 'audio', 'practice'].map(p => `<option value="${p}" ${P.prefer === p ? 'selected' : ''}>${esc(I.FORMAT_NAMES[p])}</option>`).join('')}</select></label></div>
        <label class="ls-field">${T('My goals (comma separated, e.g. “biology”, “calculus”)', 'أهدافي')}<input name="goals" value="${esc((P.goals || []).join(', '))}"></label>
        <label class="ls-field">${T('Areas I would like help with (in my own words)', 'مجالات أريد المساعدة فيها')}<textarea name="help" rows="2">${esc((P.helpWith || []).join('\n'))}</textarea></label>
        <div class="ls-row"><button class="ls-btn ls-btn--accent" type="submit">${T('Save profile', 'احفظ الملف')}</button><button class="ls-btn ls-btn--quiet" type="button" data-clearprofile>${T('Clear my profile', 'امسح ملفي')}</button></div></form>
      <section class="ls-panel"><h2 class="ls-h2">${T('Reading and accessibility in the Studio', 'القراءة وإمكانية الوصول')}</h2>
        <label class="ls-switch"><input type="checkbox" data-set="readAloud" ${S.readAloud ? 'checked' : ''}> ${T('Show a “Listen” button on every passage', 'زر استمع لكل فقرة')}</label>
        <label class="ls-switch"><input type="checkbox" data-set="chunk" ${S.chunk ? 'checked' : ''}> ${T('Show long passages in smaller parts', 'عرض الفقرات الطويلة على أجزاء')}</label>
        <label class="ls-field">${T('Content density', 'كثافة المحتوى')}<select data-set="density">${['comfortable', 'compact', 'spacious'].map(x => `<option ${S.density === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <p class="ls-muted ls-small">${T('Text size, fonts, spacing, contrast, reduced motion, colour themes and more are in the Accessibility panel (the button at the bottom corner), and apply to the whole of ERLY.', 'حجم النص والخطوط في لوحة الوصول.')}</p></section>
      <section class="ls-panel"><h2 class="ls-h2">${T('Exactly what is stored, sent and analysed', 'ما يُخزن ويُرسل ويُحلل بالضبط')}</h2>
        <table class="ls-table"><caption class="sr-only">${T('Data flows', 'تدفق البيانات')}</caption><thead><tr><th scope="col">${T('Data', 'البيانات')}</th><th scope="col">${T('Where', 'أين')}</th><th scope="col">${T('Used for', 'الاستخدام')}</th><th scope="col">${T('Kept', 'المدة')}</th></tr></thead><tbody>
          <tr><td>${T('Lesson progress, answers, mistakes, flashcards, notes, bookmarks, profile, settings', 'التقدم والإجابات والملاحظات')}</td><td>${T('This browser only (or memory, for “this visit”)', 'هذا المتصفح فقط')}</td><td>${T('Resuming, your dashboard, revision, mistake notebook, insights (if on)', 'المتابعة واللوحة')}</td><td>${T('Until you delete it or clear site data; answers keep the latest 3,000', 'حتى تحذفها')}</td></tr>
          <tr><td>${T('A question you ask Noor + the selected text (≤ 1,200 characters) + lesson title/section', 'سؤالك لنور والنص المحدد')}</td><td>${T('Noor on this device, or the online AI you agreed to in Noor’s panel', 'نور على الجهاز أو الذكاء الاصطناعي الذي وافقت عليه')}</td><td>${T('Answering that question', 'الإجابة')}</td><td>${T('Noor’s own chat history settings apply', 'حسب إعدادات نور')}</td></tr>
          <tr><td>${T('Videos: ERLY-made files; external videos', 'الفيديوهات')}</td><td>${T('ERLY files load from this site; external ones from youtube-nocookie.com only when you open them', 'ملفات ERLY من الموقع')}</td><td>${T('Playback', 'التشغيل')}</td><td>—</td></tr>
          <tr><td>${T('Audio lessons (no AI)', 'الدروس الصوتية')}</td><td>${T('The topic words go to Wikipedia’s public API', 'كلمات الموضوع تذهب إلى ويكيبيديا')}</td><td>${T('Finding the source article', 'إيجاد المقالة')}</td><td>—</td></tr>
          <tr><td>${T('Hesitation, typing, mouse movement, camera, microphone', 'التردد والكتابة والكاميرا')}</td><td>${T('Not collected', 'لا تُجمع')}</td><td>—</td><td>—</td></tr></tbody></table>
        <p class="ls-muted ls-small">${T('This page describes what the code does. It is not a statement of legal compliance with any law (such as the UAE PDPL or GDPR); that needs legal and technical review for a real deployment.', 'هذا وصف للكود وليس إقراراً بالامتثال القانوني.')}</p></section>
      <section class="ls-panel"><h2 class="ls-h2">${T('Export and delete', 'التصدير والحذف')}</h2><div class="ls-row"><button type="button" class="ls-btn" data-export>${T('Download all my Studio data (JSON)', 'نزّل كل بياناتي')}</button><button type="button" class="ls-btn ls-btn--quiet" data-view>${T('View it here', 'اعرضها هنا')}</button></div>
        <div class="ls-row">${[['attempts', T('answers and mistakes', 'الإجابات والأخطاء')], ['cards', T('flashcards', 'البطاقات')], ['notes', T('notes', 'الملاحظات')], ['lessons', T('lesson progress', 'تقدم الدروس')], ['formatUse', T('format counts', 'عدادات الصيغ')]].map(([k, l]) => `<button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-delpart="${k}">${T('Delete', 'احذف')} ${l}</button>`).join('')}</div>
        <button type="button" class="ls-btn ls-btn--danger" data-delall>${T('Delete everything in the Studio', 'احذف كل شيء')}</button><pre class="ls-pre" data-dump hidden></pre></section></div>`;
    const root = view.querySelector('.ls-prof');
    root.addEventListener('change', e => { const s = e.target.closest('[data-set]'); if (s) { st.update(dd => { dd.settings[s.dataset.set] = s.type === 'checkbox' ? s.checked : s.value; }); if (s.dataset.set === 'insights' && st.consent()) st.setConsent(Object.assign({}, st.consent(), { insights: s.checked })); document.documentElement.dataset.lsDensity = st.data().settings.density; LS.toast(T('Saved.', 'حُفظ.')); } });
    root.querySelector('[data-profile]').addEventListener('submit', e => { e.preventDefault(); const fd = new FormData(e.target); st.update(dd => { dd.profile = { explain: fd.getAll('explain'), formats: fd.getAll('formats'), pace: fd.get('pace'), prefer: fd.get('prefer'), goals: String(fd.get('goals') || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 10), helpWith: String(fd.get('help') || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 10), updated: Date.now() }; }); LS.toast(T('Profile saved.', 'حُفظ الملف.')); });
    root.addEventListener('click', e => {
      if (e.target.closest('[data-clearprofile]')) { st.update(dd => { dd.profile = { explain: [], formats: [], pace: '', goals: [], helpWith: [], prefer: '', updated: Date.now() }; }); LS.render(); LS.toast(T('Profile cleared.', 'مُسح الملف.')); }
      if (e.target.closest('[data-export]')) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([st.exportJSON()], { type: 'application/json' })); a.download = 'erly-learning-studio-data.json'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 300); }
      if (e.target.closest('[data-view]')) { const p = root.querySelector('[data-dump]'); p.hidden = !p.hidden; p.textContent = st.exportJSON(); }
      const dp = e.target.closest('[data-delpart]'); if (dp) { if (confirm(T('Delete this part of your Studio data? This cannot be undone.', 'حذف هذا الجزء؟ لا يمكن التراجع.'))) { st.deletePart(dp.dataset.delpart); LS.toast(T('Deleted.', 'حُذف.')); LS.render(); } }
      if (e.target.closest('[data-delall]')) { if (confirm(T('Delete EVERYTHING in the Learning Studio on this device — progress, answers, flashcards, notes, profile? This cannot be undone.', 'حذف كل شيء؟'))) { st.deleteAll(); LS.toast(T('All Studio data deleted.', 'حُذفت كل البيانات.')); LS.render(); } }
    });
  }

  /* ---------------- demonstration dataset (made up, labelled, never saved) ---------------- */
  LS.makeDemo = blank => {
    const d = blank, now = Date.now(), DAY = 864e5, bank = LS.bank(); let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    d.consent = { store: 'visit', demo: true, at: now };
    d.lessons = { 'bio-heart': { started: now - 9 * DAY, last: now - 1 * DAY, secIx: 4, done: { why: now - 9 * DAY, chambers: now - 8 * DAY, path: now - 5 * DAY, vessels: now - 2 * DAY } }, 'math-quad': { started: now - 12 * DAY, last: now - 6 * DAY, secIx: 4, completed: now - 6 * DAY, done: { shape: 1, roots: 1, disc: 1, vertex: 1 } }, 'phys-newton': { started: now - 3 * DAY, last: now - 3 * DAY, secIx: 1, done: { net: now - 3 * DAY } } };
    const pick = bank.filter(q => ['bio-heart', 'math-quad', 'phys-newton', 'chem-ph'].includes(q.lesson) && q.type !== 'short' && q.type !== 'steps');
    pick.forEach((q, k) => { const at = now - (12 - (k % 12)) * DAY + k * 6e5; const ok = q.type === 'label' || q.type === 'order' ? rnd() < 0.3 : rnd() < 0.72; d.attempts.push({ qid: q.id, type: q.type, topic: q.topic, subject: q.subject, lesson: q.lesson, from: 'practice', correct: ok, score: ok ? 1 : 0, answerText: ok ? '(demo answer)' : '(demo wrong answer)', prompt: LS.plain(q.prompt).slice(0, 200), at, attemptNo: 1, errorTag: !ok && q.wrong ? q.wrong[0].tag : !ok && q.tags ? Object.values(q.tags)[0] : null }); if (!ok) d.mistakes[q.id] = { qid: q.id, at, first: '(demo wrong answer)', topic: q.topic, subject: q.subject, lesson: q.lesson, prompt: LS.plain(q.prompt), type: q.type, tries: 1, laterCorrect: rnd() < 0.4, revisited: 0 }; });
    LS.lessons.slice(0, 3).forEach(L => (L.cards || []).forEach((c, i) => { const id = 'demo-c-' + L.id + i; d.cards[id] = Object.assign(LS.srs.fresh(now), { id, front: c.front, back: c.back, kind: c.kind, topic: L.topic, due: now - (i % 2) * DAY + (i % 3) * DAY, history: i % 2 ? [{ at: now - 3 * DAY, grade: 'good', interval: 3 }] : [], reps: i % 2, interval: i % 2 ? 3 : 0 }); }));
    d.notes['demo-n1'] = { id: 'demo-n1', title: 'Heart — my summary (demo)', html: '<h2>Left vs right</h2><ul><li>Right side → lungs</li><li>Left side → body (thicker wall)</li></ul>', kind: 'note', folder: 'General', tags: ['biology'], src: { type: 'lesson', id: 'bio-heart', title: 'The heart and double circulation', where: '#/lesson/bio-heart' }, created: now - 5 * DAY, updated: now - 2 * DAY };
    d.formatUse = { text: 6, visual: 9, video: 3, practice: 11 };
    d.recent = [{ type: 'lesson', id: 'bio-heart', title: 'The heart and double circulation', at: now - DAY }, { type: 'video', id: 'erly-quad', title: 'What a, b and c do to a parabola', at: now - 6 * DAY }];
    return d;
  };

  LS.route('home', home); LS.route('library', library); LS.route('lessons', lessons); LS.route('paths', paths); LS.route('progress', progress); LS.route('noor', noor); LS.route('profile', profile);
  LS.start = () => { shell(); document.documentElement.dataset.lsDensity = st.data().settings.density || 'comfortable'; LS.render(); };
})();
