/* ERLY Learning Studio — the shell (v21 "Atelier").
   A slim top spine with the nine places of the Studio as words (an ink line slides to the one you are in), a
   ⌘K / "/" command palette that searches everything in the Studio, the Noor margin (contextual help that slides in
   from the edge and closes again — it never covers the page permanently), and on phones a five-item dock with a
   sheet for the rest. Everything here is local: the palette searches data already in the page. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store;
  const P = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    read: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H11v17H5.5A1.5 1.5 0 0 1 4 18.5zM20 4.5A1.5 1.5 0 0 0 18.5 3H13v17h5.5a1.5 1.5 0 0 0 1.5-1.5z',
    learn: 'M12 3 2 8l10 5 10-5zM6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5',
    lab: 'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7.5 14h9',
    watch: 'M4 5h16v14H4zM10 9l5 3-5 3z',
    practise: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
    revise: 'M7 4h11a1 1 0 0 1 1 1v13M4 7h11a1 1 0 0 1 1 1v12H5a1 1 0 0 1-1-1z',
    notebook: 'M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2zM9 7h6M9 11h6M5 17h14',
    paths: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a3 3 0 0 1 3-3h7M18 9v6a3 3 0 0 1-3 3H8',
    progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    noor: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    close: 'M6 6l12 12M18 6 6 18',
    back: 'M15 18l-6-6 6-6',
    explain: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17h.01',
    simplify: 'M4 6h16M7 12h10M10 18h4',
    steps: 'M4 18h4v-4h4v-4h4V6h4',
    example: 'M4 5h16v10H4zM9 19h6M12 15v4',
    compare: 'M8 4v16M16 4v16M4 8h8M12 16h8',
    quiz: 'M9 4h6M8 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M9 11l2 2 4-4',
    notes: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h4',
    mistake: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5',
    model: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5'
  };
  const icon = (k, cls) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls || ''}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${P[k] || P.more}"/></svg>`;
  LS.icon = icon;

  // the five places of the Studio (progressive disclosure: each has a few sub-places), and their routes
  const ENVS = [
    { id: 'home', en: 'Discover', ar: 'اكتشف', icon: 'home', routes: ['home', 'space', 'curiosity'], subs: [] },
    { id: 'explore', en: 'Subjects', ar: 'المواد', icon: 'lab', routes: ['explore', 'subject', 'world', 'exp', 'discover', 'topic', 'chapter', 'path', 'constellation'],
      subs: [['explore', 'Worlds', 'العوالم', ['explore', 'subject', 'world', 'topic', 'chapter']], ['path', 'Learning path', 'مسار التعلّم', ['path']], ['constellation', 'Knowledge map', 'خريطة المعرفة', ['constellation']], ['discover', 'All experiences', 'كل التجارب', ['discover', 'exp']]] },
    { id: 'learn', en: 'Learn', ar: 'تعلّم', icon: 'learn', routes: ['lessons', 'lesson', 'read', 'library', 'video', 'lab', 'learn'],
      subs: [['lessons', 'Lessons', 'الدروس', ['lessons', 'lesson', 'learn']], ['read', 'Reading', 'القراءة', ['read', 'library']], ['video', 'Video', 'الفيديو', ['video']], ['lab', 'Visual Lab', 'المختبر المرئي', ['lab']]] },
    { id: 'practise', en: 'Practice', ar: 'تدرّب', icon: 'practise', routes: ['practice', 'mistakes', 'revise', 'cards', 'assess'],
      subs: [['cards', 'Flashcards', 'البطاقات', ['cards']], ['practice', 'Practice', 'التدريب', ['practice', 'assess']], ['revise', 'My cards', 'بطاقاتي', ['revise']], ['mistakes', 'Mistakes', 'الأخطاء', ['mistakes']]] },
    { id: 'workspace', en: 'My Learning', ar: 'تعلّمي', icon: 'notebook', routes: ['notebook', 'mylibrary', 'paths', 'progress', 'journey', 'archive', 'profile'],
      subs: [['notebook', 'Notebook', 'الدفتر', ['notebook']], ['mylibrary', 'My Library', 'مكتبتي', ['mylibrary', 'archive']], ['paths', 'Paths', 'المسارات', ['paths']], ['progress', 'Progress', 'التقدّم', ['progress']], ['journey', 'Journey', 'رحلتي', ['journey']], ['profile', 'Privacy & data', 'الخصوصية', ['profile']]] }
  ];
  const EXTRA = [{ id: 'noor', en: 'Noor tutor', ar: 'المعلّمة نور', icon: 'noor', routes: ['noor'], subs: [] }];
  LS.route('practise', v => LS.go('practice', { replace: true })); LS.route('workspace', v => LS.go('notebook', { replace: true }));
  const envOf = area => ENVS.concat(EXTRA).find(e => e.routes.includes(area)) || ENVS[0];
  LS.envs = ENVS;

  /* ---------- spine ---------- */
  function build() {
    const tabs = document.getElementById('atTabs');
    tabs.innerHTML = ENVS.map(e => `<a href="#/${e.subs && e.subs[0] ? e.subs[0][0] : e.id}" data-env="${e.id}">${T(e.en, e.ar)}<span class="at-badge" data-badge="${e.id}" hidden></span></a>`).join('') + '<span class="at-ink" aria-hidden="true"></span>';
    document.getElementById('atSearch').innerHTML = `${icon('search')}<span class="at-tool__label">${T('Search', 'بحث')}</span><kbd>⌘K</kbd>`;
    document.getElementById('atNoorBtn').innerHTML = `${icon('noor')}<span class="at-tool__label">${T('Ask Noor', 'اسأل نور')}</span>`;
    document.getElementById('atYou').innerHTML = icon('user');
    const dock = document.getElementById('atDock');
    dock.innerHTML = ['home', 'explore', 'learn', 'practise'].map(id => { const e = ENVS.find(x => x.id === id); return `<a href="#/${e.subs && e.subs[0] ? e.subs[0][0] : id}" data-env="${id}">${icon(e.icon)}<span>${T(e.en, e.ar)}</span></a>`; }).join('') + `<button type="button" data-more aria-expanded="false" aria-controls="atSheet">${icon('more')}<span>${T('More', 'المزيد')}</span></button>`;
    const sheet = document.getElementById('atSheet');
    sheet.innerHTML = `<ul>${ENVS.find(e => e.id === 'workspace').subs.map(([h, en, ar]) => `<li><a href="#/${h}" data-env="workspace" data-sub="${h}">${icon(h === 'profile' ? 'user' : h === 'progress' || h === 'journey' ? 'progress' : h === 'paths' ? 'paths' : 'notebook')}${T(en, ar)}</a></li>`).join('')}<li><a href="#/noor" data-env="noor">${icon('noor')}${T('Noor tutor', 'المعلّمة نور')}</a></li><li><a href="student.html">${icon('back')}${T('Back to ERLY', 'العودة إلى ERLY')}</a></li></ul>`;
  }
  // the second row: the sub-places of the current place (hidden on Home)
  function subnav(area, parts) {
    const bar = document.getElementById('atSub'); if (!bar) return;
    const env = envOf(area), ps = parts || [], path = (ps[0] === area ? ps : [area].concat(ps)).join('/');
    if (!env.subs || !env.subs.length) { bar.hidden = true; bar.innerHTML = ''; document.documentElement.classList.remove('at-has-sub'); return; }
    const cur = env.subs.slice().reverse().find(([, , , r]) => r.some(x => x.includes('/') ? path.startsWith(x) : x === area));
    bar.hidden = false; document.documentElement.classList.add('at-has-sub');
    bar.setAttribute('aria-label', T(env.en, env.ar));
    bar.innerHTML = env.subs.map(sb => `<a href="#/${sb[0]}" data-sub="${sb[0]}" ${sb === cur ? 'aria-current="page"' : ''}>${T(sb[1], sb[2])}</a>`).join('');
  }
  function moveInk() {
    const tabs = document.getElementById('atTabs'), ink = tabs && tabs.querySelector('.at-ink'), cur = tabs && tabs.querySelector('[aria-current="page"]');
    if (!ink) return;
    if (!cur) { ink.style.opacity = 0; return; }
    ink.style.opacity = 1; ink.style.transform = `translateX(${cur.offsetLeft + 11}px) scaleX(${cur.offsetWidth - 22})`;
    if (cur.scrollIntoView && (cur.offsetLeft < tabs.scrollLeft || cur.offsetLeft + cur.offsetWidth > tabs.scrollLeft + tabs.clientWidth)) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function mark(area, parts) {
    const env = envOf(area); subnav(area, parts);
    document.querySelectorAll('[data-env]').forEach(a => { if (a.dataset.env === env.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    requestAnimationFrame(moveInk);
    document.title = `${T(env.en, env.ar)} · ${T('Learning Studio', 'استوديو التعلّم')} · ERLY`;
  }
  function badges() {
    const now = Date.now(), d = st.data(), due = Object.values(d.cards).filter(c => (c.due || 0) <= now).length, mk = Object.values(d.mistakes).filter(m => !m.laterCorrect).length;
    const set = (k, n, label) => document.querySelectorAll(`[data-badge="${k}"]`).forEach(b => { b.textContent = n || ''; b.hidden = !n; if (n) b.setAttribute('aria-label', n + ' ' + label); });
    set('practise', due + mk, T('cards due and mistakes to revisit', 'بطاقات مستحقة وأخطاء'));
  }
  function banner() {
    const b = document.getElementById('lsBanner'); if (!b) return;
    if (st.mode() === 'demo') { b.hidden = false; b.innerHTML = `<p><b>${T('Demonstration data', 'بيانات تجريبية')}</b> — ${T('everything you see is made up for exploring the Studio. It is never saved and never mixed with your own learning.', 'كل ما تراه مصطنع ولا يُحفظ.')} <button type="button" class="ls-linkbtn" data-demooff>${T('Leave the demonstration', 'اخرج من العرض التجريبي')}</button></p>`; }
    else b.hidden = true;
  }
  const sheetOpen = on => { const s = document.getElementById('atSheet'), m = document.querySelector('#atDock [data-more]'); s.hidden = !on; document.body.classList.toggle('at-sheet-on', on); document.documentElement.classList.toggle('at-sheet-on', on); if (m) m.setAttribute('aria-expanded', String(on)); if (on) { const a = s.querySelector('a'); if (a) a.focus(); } };

  /* ---------- command palette ---------- */
  let palItems = [], palSel = 0, palBack = null;
  function palIndex() {
    const out = [], add = (g, t, s, href, ic) => out.push({ g, t, s, href, ic, k: (t + ' ' + (s || '')).toLowerCase() });
    ENVS.concat(EXTRA).forEach(e => add(T('Go to', 'انتقل إلى'), T(e.en, e.ar), '', '#/' + e.id, e.icon));
    (LS.subjectsList || []).forEach(s => add(T('Subjects', 'المواد'), s.name, s.blurb, '#/subject/' + s.id, 'learn'));
    (LS.lessons || []).forEach(L => { add(T('Lessons', 'الدروس'), L.title, L.subject + ' · ' + L.topic, '#/lesson/' + L.id, 'learn'); L.sections.forEach(s => add(T('Lesson sections', 'أقسام الدروس'), s.title, L.title, `#/lesson/${L.id}/${s.id}`, 'learn')); });
    (LS.readables ? LS.readables() : []).forEach(r => add(T('Reading & resources', 'القراءة والموارد'), r.title, r.kindLabel + ' · ' + (r.sub || ''), r.href, 'read'));
    (LS.VIDEOS || []).concat(LS.EXTERNAL_VIDEOS || []).forEach(v => add(T('Videos', 'الفيديو'), v.title, (v.by || 'ERLY') + ' · ' + (v.subject || ''), (v.id ? '#/video/' + v.id : '#/video'), 'watch'));
    (window.ERLY_LAB ? ERLY_LAB.engines : []).forEach(e => add(T('Interactive models', 'النماذج التفاعلية'), e.title || e.id, e.kind || '', '#/lab/' + e.id, 'model'));
    (LS.paths || []).forEach(p => add(T('Learning paths', 'مسارات التعلم'), p.title, p.subject, '#/paths/' + p.id, 'paths'));
    Object.values(st.data().notes || {}).forEach(n => add(T('My notes', 'ملاحظاتي'), n.title || T('Untitled note', 'ملاحظة بلا عنوان'), (n.tags || []).join(', '), '#/notebook/' + n.id, 'notebook'));
    return out;
  }
  function palRender(q) {
    q = (q || '').trim().toLowerCase();
    const all = palIndex(), words = q.split(/\s+/).filter(Boolean);
    let hits = !q ? all.filter(x => x.g === T('Go to', 'انتقل إلى') || x.g === T('Subjects', 'المواد')) : all.filter(x => words.every(w => x.k.includes(w)));
    hits.sort((a, b) => (q ? (b.t.toLowerCase().startsWith(q) - a.t.toLowerCase().startsWith(q)) : 0));
    palItems = hits.slice(0, 40); palSel = 0;
    const list = document.getElementById('atPalList'); let g = null;
    list.innerHTML = palItems.length ? palItems.map((x, i) => { const head = x.g !== g ? `<li class="at-pal__g" role="presentation">${esc(x.g)}</li>` : ''; g = x.g; return `${head}<li role="option" id="atPo${i}" data-i="${i}" aria-selected="${i === 0}">${icon(x.ic)}<span>${esc(x.t)}${x.s ? `<br><small>${esc(x.s)}</small>` : ''}</span><small>↵</small></li>`; }).join('') : `<li class="at-pal__g" role="presentation">${T('Nothing found. Try another word, or ask Noor.', 'لا نتائج. جرّب كلمة أخرى أو اسأل نور.')}</li>`;
    document.getElementById('atPalQ').setAttribute('aria-activedescendant', palItems.length ? 'atPo0' : '');
  }
  function palOpen() {
    const pal = document.getElementById('atPal'); palBack = document.activeElement;
    pal.hidden = false; const q = document.getElementById('atPalQ'); q.value = ''; palRender(''); q.focus();
    if (!window.ERLY_LAB && LS.needLab) LS.needLab().then(() => { if (!pal.hidden) palRender(q.value); });
  }
  function palClose() { const pal = document.getElementById('atPal'); if (pal.hidden) return; pal.hidden = true; if (palBack && palBack.focus) palBack.focus(); }
  function palGo(i) { const x = palItems[i]; if (!x) return; palClose(); if (x.href.startsWith('#')) location.hash = x.href; else if (x.run) x.run(); }
  function palMove(d) { if (!palItems.length) return; palSel = (palSel + d + palItems.length) % palItems.length; document.querySelectorAll('#atPalList [role="option"]').forEach(o => o.setAttribute('aria-selected', String(+o.dataset.i === palSel))); const el = document.getElementById('atPo' + palSel); if (el) { el.scrollIntoView({ block: 'nearest' }); document.getElementById('atPalQ').setAttribute('aria-activedescendant', el.id); } }
  LS.palette = { open: palOpen, close: palClose };

  /* ---------- Noor margin ---------- */
  let sel = null; // the last passage selected inside the Studio view: { text, at }
  document.addEventListener('selectionchange', () => {
    const s = getSelection(), view = document.getElementById('lsView');
    if (!s || s.isCollapsed || !view || !view.contains(s.anchorNode)) return;
    const t = String(s).replace(/\s+/g, ' ').trim(); if (t.length >= 3) sel = { text: t.slice(0, 1200), at: Date.now() };
  });
  function routeContext() {
    const [area, a, b] = LS.current();
    if (area === 'lesson' && LS.lesson && LS.lesson(a)) { const L = LS.lesson(a), s = L.sections.find(x => x.id === b) || L.sections[(st.lessonProgress(a) || {}).secIx || 0] || L.sections[0]; return { label: T('Lesson section', 'قسم الدرس'), text: `${L.title} — ${s.title}`, lesson: L, section: s.title, title: L.title }; }
    if (area === 'lab' && a && window.ERLY_LAB) { const e = ERLY_LAB.engines.find(x => x.id === a); if (e) return { label: T('Interactive model', 'نموذج تفاعلي'), text: e.title || e.id, engine: e.id, title: e.title }; }
    if (area === 'video' && a) { const v = (LS.VIDEOS || []).concat(LS.EXTERNAL_VIDEOS || []).find(x => (x.id || x.yt) === a), vid = document.querySelector('#lsView video'); if (v) return { label: T('Video', 'فيديو'), text: v.title + (vid ? ` (${Math.floor(vid.currentTime / 60)}:${String(Math.floor(vid.currentTime % 60)).padStart(2, '0')})` : ''), title: v.title }; }
    if (area === 'subject' && a && LS.subjectsList) { const S = LS.subjectsList.find(x => x.id === a); if (S) return { label: T('Subject', 'مادة'), text: S.name, title: S.name }; }
    return null;
  }
  const ACTS = [['explain', 'Explain this', 'اشرح هذا'], ['simplify', 'Simplify', 'بسّط'], ['steps', 'Teach step by step', 'علّمني خطوة بخطوة'], ['example', 'Give an example', 'أعطني مثالاً'], ['practice', 'Quiz me', 'اختبرني'], ['notes', 'Revision notes', 'ملاحظات مراجعة'], ['compare', 'Compare two ideas', 'قارن فكرتين'], ['mistake', 'Help with a mistake', 'ساعدني في خطأ']];
  function noorRender() {
    const body = document.getElementById('atNoorBody'), ctxSel = sel && Date.now() - sel.at < 10 * 60 * 1000 ? sel : null, rc = routeContext(), w = LS.noor ? LS.noor.where() : { label: '' };
    const open = Object.values(st.data().mistakes || {}).filter(m => !m.laterCorrect).length;
    body.innerHTML = `<div class="at-ctx">${ctxSel ? `<b>${T('Your selection', 'ما حدّدته')}</b><q>${esc(ctxSel.text)}</q>` : rc ? `<b>${esc(rc.label)}</b>${esc(rc.text)}<br><span class="at-muted">${T('Tip: select a sentence on the page to ask about exactly that.', 'تلميح: حدّد جملة لتسأل عنها تحديداً.')}</span>` : `<b>${T('Nothing selected', 'لا تحديد')}</b><span class="at-muted">${T('Select a passage, equation or label on the page, or just ask a question below.', 'حدّد مقطعاً أو اسأل سؤالاً أدناه.')}</span>`}</div>
      <div class="at-acts" role="group" aria-label="${T('Ask Noor to…', 'اطلب من نور أن…')}">${ACTS.map(([k, en, ar]) => `<button type="button" class="at-act" data-noor="${k}" ${k === 'mistake' ? (open ? '' : 'disabled title="' + T('No open mistakes', 'لا أخطاء مفتوحة') + '"') : k === 'compare' ? '' : (ctxSel || rc ? '' : 'disabled')}>${icon(k === 'practice' ? 'quiz' : k)}${T(en, ar)}</button>`).join('')}</div>
      <div id="atCmp" hidden><label class="at-range">${T('First idea', 'الفكرة الأولى')}<input type="text" id="atCmpA" maxlength="80"></label><label class="at-range" style="margin-top:8px">${T('Second idea', 'الفكرة الثانية')}<input type="text" id="atCmpB" maxlength="80"></label><p style="margin:10px 0 0"><button type="button" class="ls-btn" data-noor-cmp>${T('Compare', 'قارن')}</button></p></div>`;
    document.getElementById('atNoorWhere').textContent = w.label || '';
  }
  function noorOpen() { noorRender(); const m = document.getElementById('atNoor'); m.classList.add('is-on'); document.body.classList.add('at-noor-on'); document.documentElement.classList.add('at-noor-on'); document.getElementById('atScrim').classList.add('is-on'); m.setAttribute('aria-hidden', 'false'); setTimeout(() => { const f = m.querySelector('.at-act:not(:disabled)') || document.getElementById('atNoorQ'); f && f.focus(); }, 60); }
  function noorClose(refocus) { const m = document.getElementById('atNoor'); if (!m.classList.contains('is-on')) return; m.classList.remove('is-on'); document.body.classList.remove('at-noor-on'); document.documentElement.classList.remove('at-noor-on'); m.setAttribute('aria-hidden', 'true'); document.getElementById('atScrim').classList.remove('is-on'); if (refocus !== false) document.getElementById('atNoorBtn').focus(); }
  LS.margin = { open: noorOpen, close: noorClose };
  function noorAct(kind) {
    if (!LS.noor) return;
    const ctxSel = sel && Date.now() - sel.at < 10 * 60 * 1000 ? sel : null, rc = routeContext() || {};
    if (kind === 'compare') { const c = document.getElementById('atCmp'); c.hidden = false; document.getElementById('atCmpA').focus(); return; }
    if (kind === 'mistake') { noorClose(false); LS.go('mistakes'); LS.toast(T('Pick a mistake and choose “Explain my mistake”.', 'اختر خطأً ثم «اشرح خطئي».')); return; }
    if (kind === 'explain' && rc.engine && !ctxSel) { noorClose(false); return LS.noor.ask('model', { engine: rc.engine, lesson: rc.lesson }); }
    noorClose(false);
    LS.noor.ask(kind, { text: ctxSel ? ctxSel.text : rc.text || '', lesson: rc.lesson, section: rc.section, title: rc.title });
    sel = null;
  }

  /* ---------- events ---------- */
  function wire() {
    const tabs = document.getElementById('atTabs');
    addEventListener('resize', () => { clearTimeout(moveInk.t); moveInk.t = setTimeout(moveInk, 120); });
    document.getElementById('atSearch').addEventListener('click', palOpen);
    // the Noor margin can be resized (drag the edge, or arrow keys on the handle); never wider than 60% of the screen
    (function () { const m = document.getElementById('atNoor'); if (!m || m.querySelector('.at-noor__grip')) return; const g = document.createElement('div'); g.className = 'at-noor__grip'; g.setAttribute('role', 'separator'); g.setAttribute('aria-orientation', 'vertical'); g.setAttribute('aria-label', T('Resize Noor', 'غيّر حجم نور')); g.tabIndex = 0; m.prepend(g);
      const setW = w => { w = Math.max(320, Math.min(Math.round(innerWidth * 0.6), w)); m.style.width = w + 'px'; document.documentElement.style.setProperty('--at-noor-w', w + 'px'); g.setAttribute('aria-valuenow', w); try { localStorage.setItem('ls-noor-w', w); } catch (e) { /* none */ } };
      try { const w0 = +localStorage.getItem('ls-noor-w'); if (w0 && innerWidth > 900) m.style.width = Math.min(w0, innerWidth * 0.6) + 'px'; } catch (e) { /* none */ }
      g.addEventListener('pointerdown', e => { if (innerWidth <= 900) return; g.setPointerCapture(e.pointerId); const rtl = document.dir === 'rtl'; const mv = ev => setW(rtl ? ev.clientX : innerWidth - ev.clientX); const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); }; g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); });
      g.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d = (e.key === 'ArrowLeft') !== (document.dir === 'rtl') ? 40 : -40; setW(m.getBoundingClientRect().width + d); } }); })();
    // a question handed over from another ERLY page (e.g. Handwriting results): shown ready to send, never sent automatically
    setTimeout(() => { let q = null; try { q = sessionStorage.getItem('erly-noor-prefill'); sessionStorage.removeItem('erly-noor-prefill'); } catch (e) { /* none */ } if (q) { noorOpen(); const f = document.getElementById('atNoorQ'); if (f) { f.value = q; f.focus(); } } }, 400);
    document.getElementById('atNoorBtn').addEventListener('click', () => (document.getElementById('atNoor').classList.contains('is-on') ? noorClose() : noorOpen()));
    document.getElementById('atScrim').addEventListener('click', () => noorClose());
    document.getElementById('atNoorX').addEventListener('click', () => noorClose());
    document.getElementById('atNoor').addEventListener('click', e => {
      const b = e.target.closest('[data-noor]'); if (b && !b.disabled) noorAct(b.dataset.noor);
      if (e.target.closest('[data-noor-cmp]')) { const a = document.getElementById('atCmpA').value.trim(), bb = document.getElementById('atCmpB').value.trim(); if (!a || !bb) return; noorClose(false); LS.noor.ask('compare', { a, b: bb }); }
    });
    document.getElementById('atNoorForm').addEventListener('submit', e => {
      e.preventDefault(); const q = document.getElementById('atNoorQ'), v = q.value.trim(); if (!v) return;
      const rc = routeContext() || {}, C = window.ERLY && ERLY.companion;
      if (!C || !C.ask) { LS.toast(T('Noor could not load on this page. Nothing was sent.', 'تعذّر تحميل نور. لم يُرسل شيء.')); return; }
      noorClose(false); q.value = '';
      C.ask(v, { context: { title: rc.title || T('Learning Studio', 'استوديو التعلّم'), course: rc.lesson ? rc.lesson.subject : '', page: rc.section || '', heading: rc.section || '', quote: '', text: '', uploaded: false, from: 'learning-studio' } });
      st.touch('noor', 'ask', v.slice(0, 80));
    });
    document.getElementById('atNoorQ').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('atNoorForm').requestSubmit(); } });
    const pal = document.getElementById('atPal'), q = document.getElementById('atPalQ');
    q.addEventListener('input', () => palRender(q.value));
    q.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); } else if (e.key === 'Enter') { e.preventDefault(); palGo(palSel); } });
    pal.addEventListener('click', e => { if (e.target === pal) return palClose(); const o = e.target.closest('[role="option"]'); if (o) palGo(+o.dataset.i); });
    document.getElementById('atDock').addEventListener('click', e => { if (e.target.closest('[data-more]')) sheetOpen(document.getElementById('atSheet').hidden); else sheetOpen(false); });
    document.getElementById('atSheet').addEventListener('click', e => { if (e.target.closest('a')) sheetOpen(false); });
    document.addEventListener('keydown', e => {
      const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return document.getElementById('atPal').hidden ? palOpen() : palClose(); }
      if (e.key === '/' && !typing && document.getElementById('atPal').hidden && !document.documentElement.classList.contains('studio-open')) { e.preventDefault(); return palOpen(); }
      if (e.key === 'Escape') { if (!pal.hidden) { e.preventDefault(); return palClose(); } if (document.getElementById('atNoor').classList.contains('is-on')) return noorClose(); if (!document.getElementById('atSheet').hidden) { sheetOpen(false); document.querySelector('#atDock [data-more]').focus(); } }
      // Tab stays inside the palette while it is open
      if (e.key === 'Tab' && !pal.hidden) { e.preventDefault(); q.focus(); }
    });
    document.addEventListener('click', e => { if (e.target.closest('[data-demooff]')) { st.demo(false); LS.render(); } if (e.target.closest('[data-open-noor]')) noorOpen(); if (e.target.closest('[data-open-search]')) palOpen(); });
    LS.on('route', ({ area, parts }) => { mark(area, parts); badges(); banner(); const v = document.getElementById('lsView'); if (v && !document.documentElement.classList.contains('a11y-still')) { v.classList.remove('at-view-in'); void v.offsetWidth; v.classList.add('at-view-in'); } });
    LS.on('change', () => badges());
    tabs.addEventListener('scroll', () => requestAnimationFrame(moveInk), { passive: true });
  }
  LS.startShell = () => { document.documentElement.classList.add('at-html'); build(); wire(); };
})();
