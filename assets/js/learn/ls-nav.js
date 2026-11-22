/* ERLY Learning Studio — universal navigation: the Back bar, breadcrumbs, direction-aware transitions and state that
   survives coming back.

   History. Every Studio page is a #/route. Each browser history entry the Studio creates is stamped with a number in
   history.state ({ lsi }), so a hashchange can tell whether the student went BACK (a smaller number), FORWARD or to a
   NEW place — whatever caused it: our Back button, the browser's Back/Forward, a link or a deep link.
   For every entry we keep (in sessionStorage, so a refresh keeps it): the route, the scroll position, the link that
   was used to leave it, and the state of the page's filters and search box.

   Back. The Back button goes to the previous Studio page with history.back() when there is one in this tab, so the
   browser's history and ours stay the same. When the page was opened directly (a deep link, a refresh with no Studio
   history before it) Back goes to the page's logical parent instead — an experience's subject world, a lab model's
   Visual Lab, a lesson's lesson list — replacing the current entry so Back never loops.
   Coming back restores the scroll position, the filters and search, and puts keyboard focus on the link the student
   used to leave. Clicks during a navigation are ignored (no double navigation).

   Motion. Going forward, the new page slides in from the right; going back, from the left (mirrored in Arabic).
   It uses the Studio's existing View Transition (only the page content moves; the header stays still) and a CSS
   fallback elsewhere. Reduced motion: no movement at all. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc, root = document.documentElement;
  const KEY = 'ls-nav-v1';
  let S; try { S = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  if (!S || typeof S !== 'object') S = { max: 0, e: {} };
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: in-memory only */ } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('a11y-still');
  const hashRoute = () => (location.hash.replace(/^#\/?/, '') || 'home');
  let cur = history.state && history.state.lsi;
  const stamp = () => { cur = ++S.max; try { history.replaceState(Object.assign({}, history.state || {}, { lsi: cur }), ''); } catch (e) { /* none */ } S.e[cur] = { r: hashRoute() }; Object.keys(S.e).forEach(k => { if (+k > cur) delete S.e[k]; }); save(); };
  if (cur == null) stamp(); else { S.e[cur] = Object.assign(S.e[cur] || {}, { r: hashRoute() }); save(); }
  let dir = 'new', busy = 0;

  /* ---------- where am I: breadcrumbs and the logical parent ---------- */
  const subj = id => (LS.subjectsList || []).find(s => s.id === id);
  const subjOfLesson = L => (LS.subjectsList || []).find(s => s.lesson.test(L.subject));
  const SECTION = { explore: T('Subjects', 'المواد'), cards: T('Flashcards', 'البطاقات'), discover: T('Discover', 'اكتشف'), lessons: T('Lessons', 'الدروس'), read: T('Reading', 'القراءة'), library: T('Reading', 'القراءة'), video: T('Video', 'الفيديو'), lab: T('Visual Lab', 'المختبر المرئي'), practice: T('Practice', 'التدريب'), practise: T('Practice', 'التدريب'), revise: T('Flashcards', 'البطاقات'), mistakes: T('Mistakes', 'الأخطاء'), notebook: T('Notebook', 'الدفتر'), workspace: T('Notebook', 'الدفتر'), mylibrary: T('My Library', 'مكتبتي'), paths: T('Paths', 'المسارات'), progress: T('Progress', 'التقدّم'), journey: T('Journey', 'رحلتي'), archive: T('Discovery archive', 'الأرشيف'), profile: T('Privacy & data', 'الخصوصية'), noor: T('Noor tutor', 'نور'), inspect: T('Content directory', 'دليل المحتوى'), learn: T('Lessons', 'الدروس') };
  function trail(route) {
    const p = route.split('/').map(decodeURIComponent), a = p[0], c = [];
    const sec = (r, l) => c.push({ r, l: l || SECTION[r] || r });
    if (a === 'home' || !a) return [];
    if (a === 'exp') { const x = (LS.experiences || []).find(e => e.id === p[1]), s = x && subj(x.subject); sec('explore'); if (s) c.push({ r: 'world/' + s.id, l: T(s.name, s.ar) }); c.push({ l: x ? x.title : T('Experience', 'تجربة') }); return c; }
    if (a === 'subject' || a === 'world') { const s = subj(p[1]); sec('explore'); c.push({ l: s ? T(s.name, s.ar) : p[1] }); return c; }
    if (a === 'topic') { const L = LS.lesson && LS.lesson(p[1]), s = L && subjOfLesson(L); sec('explore'); if (s) c.push({ r: 'subject/' + s.id, l: T(s.name, s.ar) }); c.push(p[2] ? { r: 'topic/' + p[1], l: L ? L.topic : p[1] } : { l: L ? L.topic : p[1] }); if (p[2]) c.push({ l: { explore: T('Explore', 'استكشف'), revise: T('Revise', 'راجع'), practice: T('Practise', 'تدرّب'), learn: T('Learn', 'تعلّم') }[p[2]] || p[2] }); return c; }
    if (a === 'lesson') { const L = LS.lesson && LS.lesson(p[1]); sec('lessons'); if (L) c.push({ r: 'topic/' + L.id, l: L.topic }); c.push({ l: L ? L.title : p[1] }); return c; }
    if (a === 'lab') { if (!p[1]) { sec('lab', SECTION.lab); c[0] = { l: SECTION.lab }; return c; } const e = window.ERLY_LAB && ERLY_LAB.engines.find(x => x.id === p[1]); sec('lab'); c.push({ l: e ? (e.title || e.id) : p[1] }); return c; }
    if (a === 'video') { if (!p[1]) return [{ l: SECTION.video }]; const v = (LS.VIDEOS || []).find(x => x.id === p[1]); sec('video'); c.push({ l: v ? v.title : p[1] }); return c; }
    if (a === 'read' && p[1] === 'doc') { const d = (window.STUDIO_LIBRARY || []).find(x => x.id === p[2]); sec('read'); c.push({ l: d ? (Array.isArray(d.name) ? d.name[0] : d.name) : p[2] }); return c; }
    if (a === 'explore' && p[1] === 'topics') { sec('explore'); c.push({ l: T('Topics', 'المواضيع') }); return c; }
    if (a === 'chapter') { const ch = LS.curriculum && LS.curriculum.chapter(p[1]), s = ch && subj(ch.subject); sec('explore'); if (s) c.push({ r: 'world/' + s.id, l: T(s.name, s.ar) }); c.push({ l: ch ? ch.title : p[1] }); return c; }
    if (a === 'cards') { sec('cards', T('Flashcards', 'البطاقات')); const ch = p[1] && LS.curriculum && LS.curriculum.chapter(p[1]); if (!p[1]) { c[0] = { l: T('Flashcards', 'البطاقات') }; return c; } if (ch) c.push({ r: 'chapter/' + ch.id, l: ch.title }); c.push({ l: T('Study', 'دراسة') }); return c; }
    if (a === 'assess') { const ch = LS.curriculum && LS.curriculum.chapter(p[1]); sec('explore'); if (ch) c.push({ r: 'chapter/' + ch.id, l: ch.title }); c.push({ l: T('Chapter check', 'فحص الفصل') }); return c; }
    if (a === 'space' || a === 'path' || a === 'constellation' || a === 'curiosity') { sec('explore'); c.push({ l: { space: T('Solar System Explorer', 'مستكشف النظام الشمسي'), path: T('Learning path', 'مسار التعلّم'), constellation: T('Knowledge Constellation', 'كوكبة المعرفة'), curiosity: T('Curiosity', 'الفضول') }[a] }); return c; }
    if (a === 'discover') { sec('explore'); c.push({ l: SECTION.discover }); return c; }
    if (a === 'finder') { sec('explore'); c.push({ l: T('Experience finder', 'باحث التجارب') }); return c; }
    if (a === 'inspect' && p[1]) { const s = subj(p[1]); sec('inspect'); c.push({ l: s ? s.name : p[1] }); return c; }
    if (a === 'practice' && p[1]) { sec('practice'); c.push({ l: T('Practice session', 'جلسة تدريب') }); return c; }
    if (a === 'mylibrary' && p[1]) { sec('mylibrary'); c.push({ l: SECTION[p[1]] || p[1] }); return c; }
    return [{ l: SECTION[a] || a }];
  }
  const parentOf = route => { const c = trail(route).filter(x => x.r); return c.length ? c[c.length - 1].r : 'home'; };
  LS.nav = { trail, parentOf };

  /* ---------- the bar ---------- */
  const bar = document.createElement('nav'); bar.className = 'ls-backbar'; bar.id = 'lsBackbar'; bar.hidden = true; bar.setAttribute('aria-label', T('Where you are', 'أين أنت'));
  const main = document.getElementById('lsView'); main.parentNode.insertBefore(bar, main);
  const arrow = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  function paintBar() {
    const route = hashRoute(), c = trail(route); if (!c.length) { bar.hidden = true; root.classList.remove('ls-has-back'); return; }
    const prev = S.e[cur - 1], pr = prev ? prev.r : parentOf(route), pc = trail(pr), toLabel = pr === 'home' || !pr ? T('Home', 'الرئيسية') : (pc.length ? pc[pc.length - 1].l : T('Home', 'الرئيسية'));
    bar.hidden = false; root.classList.add('ls-has-back');
    bar.innerHTML = `<button type="button" class="ls-back" data-ls-back aria-label="${esc(T('Back to ', 'العودة إلى ') + toLabel)}" title="${esc(T('Back to ', 'العودة إلى ') + toLabel + ' (Alt + ←)')}">${arrow}<span>${T('Back', 'رجوع')}</span></button>
      <ol class="ls-crumbs"><li><a href="#/home">${T('Studio', 'الاستوديو')}</a></li>${c.map((x, i) => `<li${i === c.length - 1 ? ' aria-current="page"' : ''}>${x.r && i < c.length - 1 ? `<a href="#/${esc(x.r)}">${esc(x.l)}</a>` : `<span>${esc(x.l)}</span>`}</li>`).join('')}</ol>`;
    placeBar();
  }
  function placeBar() { const sp = document.querySelector('.at-spine'), sub = document.querySelector('.at-sub'); let top = sp ? sp.getBoundingClientRect().height : 0; if (sub && !sub.hidden && getComputedStyle(sub).position === 'sticky') top += sub.getBoundingClientRect().height; if (root.classList.contains('at-focus')) top = 0; root.style.setProperty('--ls-back-top', top + 'px'); }
  addEventListener('resize', placeBar);
  function back() {
    if (busy && performance.now() - busy < 450) return; busy = performance.now();
    const prev = S.e[cur - 1];
    if (prev && prev.r) history.back();                           // the previous Studio page in this tab
    else { dir = 'back'; root.classList.add('ls-nav-back'); root.classList.remove('ls-nav-fwd'); LS.go(parentOf(hashRoute()), { replace: true }); } // opened directly: go up, without leaving a loop behind
  }
  LS.nav.back = back;
  bar.addEventListener('click', e => { if (e.target.closest('[data-ls-back]')) back(); });

  /* ---------- page state: filters, search, scroll, the link used to leave ---------- */
  const sig = el => { for (const a of el.attributes) if (a.name.startsWith('data-') && a.name !== 'data-v' && a.name !== 'data-i') return `${el.tagName.toLowerCase()}[${a.name}="${CSS.escape(a.value)}"]${el.dataset.v != null ? `[data-v="${CSS.escape(el.dataset.v)}"]` : ''}`; return null; };
  function capture() {
    const v = document.getElementById('lsView'); if (!v || /^exp\//.test(S.e[cur] && S.e[cur].r || '')) return null; // experiences rebuild their own model; lists and pages keep their choices
    // only view filters (chip groups, tabs) are restored — never an answer, an activity or anything inside an experience:
    // re-clicking those would act on the student's behalf
    const safe = el => !el.closest('form, .at-x, .ls-act, .ls-q, .act, [data-qid], [data-q], .lsi-q, .ls-practice__q, .ls-run') && !!el.closest('[role="group"], [role="radiogroup"], [role="tablist"], .dx-filter') && !/answer|option|choice/i.test(el.className + ' ' + (el.closest('[role]') || {}).className);
    const pressed = [...v.querySelectorAll('[aria-pressed="true"], [aria-checked="true"]')].filter(safe).map(sig).filter(Boolean);
    const fields = [...v.querySelectorAll('input[type="search"], input[type="text"]:not([readonly])')].map(i => { const s = i.id ? '#' + CSS.escape(i.id) : (i.className ? 'input.' + [...i.classList].map(c => CSS.escape(c)).join('.') : null); return s && i.value ? [s, i.value] : null; }).filter(Boolean);
    return pressed.length || fields.length ? { pressed, fields } : null;
  }
  function restore(st) {
    if (!st) return; const v = document.getElementById('lsView'); if (!v) return;
    (st.pressed || []).forEach(s => { const el = v.querySelector(s); if (el && el.getAttribute('aria-pressed') !== 'true' && el.getAttribute('aria-checked') !== 'true') el.click(); });
    (st.fields || []).forEach(([s, val]) => { const el = v.querySelector(s); if (el && !el.value) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); } });
  }
  let lastLink = null;
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="#/"]'); if (a) lastLink = a.getAttribute('href'); }, true);

  // runs before the Studio renders (capture phase on window fires first)
  addEventListener('hashchange', () => {
    if (S.e[cur]) { S.e[cur].y = scrollY; S.e[cur].link = lastLink; S.e[cur].st = capture(); }
    lastLink = null;
    const st = history.state && history.state.lsi;
    if (st != null && S.e[st]) { dir = st < cur ? 'back' : 'fwd'; cur = st; }
    else { dir = 'new'; stamp(); }
    save();
    root.classList.toggle('ls-nav-back', dir === 'back'); root.classList.toggle('ls-nav-fwd', dir !== 'back');
  }, true);

  let restoreT = [];
  LS.on('route', () => {
    if (history.state == null || history.state.lsi == null) { if (cur == null) stamp(); else try { history.replaceState({ lsi: cur }, ''); } catch (e) { /* none */ } } // a replace-navigation dropped the stamp
    if (S.e[cur]) { S.e[cur].r = hashRoute(); save(); }
    paintBar();
    restoreT.forEach(clearTimeout); restoreT = [];
    const view = document.getElementById('lsView');
    if (!reduced() && view && !document.startViewTransition) { view.classList.remove('ls-in-fwd', 'ls-in-back'); void view.offsetWidth; view.classList.add(dir === 'back' ? 'ls-in-back' : 'ls-in-fwd'); }
    if (dir !== 'back') return;
    const E = S.e[cur] || {}; let userScrolled = false; const onUser = () => { userScrolled = true; }; addEventListener('wheel', onUser, { once: true, passive: true }); addEventListener('touchmove', onUser, { once: true, passive: true });
    const apply = final => { if (userScrolled) return; restore(final ? E.st : null); if (E.y) window.scrollTo({ top: E.y, behavior: 'instant' }); if (final && E.link) { const a = view && view.querySelector(`a[href="${CSS.escape(E.link).replace(/\\\//g, '/')}"]`) || (view && [...view.querySelectorAll('a[href]')].find(x => x.getAttribute('href') === E.link)); if (a) a.focus({ preventScroll: true }); } };
    // pages that load parts lazily grow after the first paint: restore again as they do
    requestAnimationFrame(() => apply(false)); restoreT.push(setTimeout(() => apply(true), 90), setTimeout(() => apply(false), 350), setTimeout(() => apply(false), 900));
  });
  // Alt + ← is the browser's own Back; on the Studio it also covers pages opened directly (parent navigation)
  addEventListener('keydown', e => { if (e.altKey && (e.key === 'ArrowLeft') && !S.e[cur - 1] && trail(hashRoute()).length) { e.preventDefault(); back(); } });
  addEventListener('pageshow', placeBar);
  // focus mode (full-screen experiences) keeps the bar, at the top of the screen
  new MutationObserver(placeBar).observe(root, { attributes: true, attributeFilter: ['class'] });
  if (document.readyState !== 'loading') setTimeout(paintBar); else addEventListener('DOMContentLoaded', paintBar);
})();
