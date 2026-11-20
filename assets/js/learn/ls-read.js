/* ERLY Learning Studio — Reading & Resources (v21). This is where the Reading Studio lives now.
   The reader itself is the existing ERLY reader (assets/js/studio.js): PDFs and text files read on this device with
   pdf.js, original-page view, highlights in four colours with notes, bookmarks, search, zoom, read-aloud, line focus,
   fonts, tints, spacing, summaries, key terms, flashcards, a focus timer, immersive and full-screen modes. Nothing of
   it was removed. This module is the library around it:
     • Course readings — the six course PDFs.
     • Study guides — one per lesson, built from the lesson itself (objectives, each section, summary) and opened in
       the same reader, so read-aloud, highlights and Noor work on them too.
     • Worksheets — printable question sheets made from each lesson's own questions.
     • References — the open textbooks and sources the lessons cite (external, labelled as such).
     • Your files — a PDF or .txt you open or drop here; read on this device, never uploaded.
   Reading preferences chosen here are applied to the reader and kept with the student's storage choice. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store;
  const icon = k => LS.icon(k);
  const R = () => window.ERLY && ERLY.reader;
  const KIND = { reading: ['Course reading', 'قراءة مقررة'], guide: ['Study guide', 'دليل دراسة'], sheet: ['Worksheet', 'ورقة عمل'], book: ['Reference', 'مرجع'], file: ['Your file', 'ملفك'] };
  const prettyTitle = t => String(t || '').replace(/_/g, ' ').replace(/\.pdf$/i, '');
  const subjFor = (txt) => (LS.subjectsList || []).find(s => s.lesson.test(txt || '') || s.read.includes(txt)) || { id: 'more' };
  const prog = id => (R() && R().progressOf ? R().progressOf(id) : null);
  const starred = () => (st.data().settings.readStar || []);

  /* ---------- study guides: a lesson turned into a reader document ---------- */
  function guideDoc(L) {
    const page = (h, paras) => ({ h, paras: paras.filter(Boolean).map(text => ({ text })) });
    const pages = [page(T('About this guide', 'عن هذا الدليل'), [T(`A study guide for the ERLY lesson “${L.title}” (${L.subject}). Read it here with read-aloud, highlights and notes, or open the interactive lesson for the models and questions.`, 'دليل دراسة لهذا الدرس.'), L.why ? T('Why it matters: ', 'لماذا يهم: ') + L.why : '', (L.objectives || []).length ? T('By the end you should be able to: ', 'في النهاية ستتمكن من: ') + L.objectives.map(o => LS.plain(o)).join('; ') + '.' : ''])];
    L.sections.forEach(s => { const paras = []; s.blocks.forEach(b => { if (b.k === 'text' && b.md) LS.plain(b.md).split(/\n\s*\n/).forEach(p => paras.push(p.replace(/\n[-•]\s*/g, ' • ').trim())); if (b.k === 'example' && (b.problem || b.steps)) paras.push(T('Worked example: ', 'مثال محلول: ') + LS.plain(b.problem || b.title || '') + (b.steps ? ' — ' + b.steps.map(x => LS.plain(typeof x === 'string' ? x : x.text || '')).join(' ') : '')); }); if (paras.length) pages.push(page(s.title, paras)); });
    if ((L.summary || []).length) pages.push(page(T('Summary', 'الخلاصة'), L.summary.map(x => '• ' + LS.plain(x))));
    return { id: 'guide-' + L.id, title: `${L.title} — ${T('study guide', 'دليل دراسة')}`, course: `${L.subject} · ${T('ERLY study guide', 'دليل ERLY')}`, short: L.subject, unit: [L.topic, L.topic], field: 'science', hue: 230, startPage: 1, name: [L.title, L.title], terms: {}, pages };
  }
  /* ---------- the shelf ---------- */
  function readables() {
    const out = [];
    (window.STUDIO_LIBRARY || []).forEach(d => out.push({ key: 'reading:' + d.id, kind: 'reading', id: d.id, title: prettyTitle(d.title), sub: d.course, cls: 'at-subj-' + subjFor(d.id).id, pages: d.pages ? d.pages.length : 0, open: () => openReading(d.id), href: '#/read/doc/' + d.id }));
    (LS.lessons || []).forEach(L => {
      out.push({ key: 'guide:' + L.id, kind: 'guide', id: 'guide-' + L.id, title: L.title, sub: `${L.subject} · ${L.topic}`, cls: 'at-subj-' + subjFor(L.subject).id, open: () => openGuide(L.id), href: '#/read/guide/' + L.id });
      out.push({ key: 'sheet:' + L.id, kind: 'sheet', id: L.id, title: L.title, sub: `${L.subject} · ${L.topic}`, cls: 'at-subj-' + subjFor(L.subject).id, href: '#/read/sheet/' + L.id });
    });
    const seen = new Set();
    (LS.lessons || []).forEach(L => (L.further || []).concat((L.provenance && L.provenance.sources) || []).forEach(x => { if (!x || !x.url || seen.has(x.url)) return; seen.add(x.url); out.push({ key: 'book:' + x.url, kind: 'book', id: x.url, title: x.title || x.url, sub: (x.by || x.publisher || new URL(x.url).hostname) + (x.licence ? ' · ' + x.licence : ''), cls: 'at-subj-' + subjFor(L.subject).id, url: x.url }); }));
    (R() ? R().docs() : []).filter(d => d.uploaded).forEach(d => out.push({ key: 'file:' + d.id, kind: 'file', id: d.id, title: d.title, sub: d.course || '', cls: 'at-subj-more', open: () => R().openDoc(d.id) }));
    out.forEach(x => { x.kindLabel = T(...KIND[x.kind]); });
    return out;
  }
  LS.readables = readables;

  /* ---------- opening things ---------- */
  function applyPrefs() { const p = st.data().settings.readPrefs; if (p && R() && R().applyPrefs) R().applyPrefs(p); }
  function openReading(id) {
    const d = (window.STUDIO_LIBRARY || []).find(x => x.id === id) || (R() && R().docs().find(x => x.id === id));
    if (!R()) return LS.toast(T('The reader could not load on this page.', 'تعذّر تحميل القارئ.'));
    st.touch('reading', id, d ? prettyTitle(d.title) : id); applyPrefs(); R().openDoc(id);
  }
  function openGuide(lessonId) {
    const L = LS.lesson(lessonId); if (!L || !R()) return;
    R().addDoc(guideDoc(L)); st.touch('reading', 'guide-' + L.id, L.title + ' — ' + T('study guide', 'دليل دراسة')); applyPrefs(); R().openDoc('guide-' + L.id);
  }
  LS.openReading = openReading; LS.openGuide = openGuide;
  // when the reader closes after being opened from a link (#/read/doc/…), return to the shelf without re-opening it
  if (R() && R().on) R().on(ev => { if (ev.type === 'close' && /^read\/(doc|guide)\//.test(LS.current().join('/'))) history.replaceState(null, '', '#/read'); });

  /* ---------- the Reading & Resources page ---------- */
  let kindF = 'all', q = '';
  function shelf(view) {
    const all = readables(), rp = id => prog(id), stars = starred();
    const counts = { all: all.length }; all.forEach(x => { counts[x.kind] = (counts[x.kind] || 0) + 1; });
    const kinds = [['all', 'Everything', 'الكل'], ['reading', 'Course readings', 'قراءات مقررة'], ['guide', 'Study guides', 'أدلة دراسة'], ['sheet', 'Worksheets', 'أوراق عمل'], ['book', 'References', 'مراجع'], ['file', 'Your files', 'ملفاتك'], ['star', 'Starred', 'المميزة']];
    counts.star = all.filter(x => stars.includes(x.key)).length;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = all.filter(x => (kindF === 'all' || (kindF === 'star' ? stars.includes(x.key) : x.kind === kindF)) && words.every(w => (x.title + ' ' + x.sub + ' ' + x.kindLabel).toLowerCase().includes(w)));
    const reading = all.filter(x => (x.kind === 'reading' || x.kind === 'guide') && rp(x.id) && rp(x.id).frac > 0.01 && rp(x.id).frac < 0.99).sort((a, b) => rp(b.id).at - rp(a.id).at).slice(0, 3);
    const p = Object.assign({ font: 'classic', size: 19, lh: 1.75, tint: 'paper', width: 660, focus: false }, R() ? R().format() : {}, st.data().settings.readPrefs || {});
    const seg = (key, opts) => `<span class="at-seg" role="group">${opts.map(([v, l]) => `<button type="button" data-pref="${key}" data-v="${v}" aria-pressed="${String(String(p[key]) === String(v))}">${l}</button>`).join('')}</span>`;
    view.innerHTML = `<div class="at-read">
      <header class="at-read__head"><div><p class="at-k">${T('Reading & Resources', 'القراءة والموارد')}</p><h1>${T('Read with full attention.', 'اقرأ بتركيز كامل.')}</h1><p class="at-lead">${T('Course readings, study guides, worksheets, references and your own PDFs — all opening in one focused reader with highlights, notes, bookmarks, search, zoom and read-aloud. Select any passage to ask Noor about it.', 'كل المواد في قارئ واحد مركّز.')}</p></div>
        <label class="at-find">${icon('search')}<span class="sr-only">${T('Search reading & resources', 'ابحث في القراءة والموارد')}</span><input type="search" id="atReadQ" value="${esc(q)}" placeholder="${T('Search titles, courses, topics…', 'ابحث في العناوين والمقررات…')}" autocomplete="off"></label></header>
      ${reading.length ? `<section style="margin-bottom:34px" aria-labelledby="atRCont"><p class="at-k" id="atRCont">${T('Continue reading', 'تابع القراءة')}</p><ul class="at-index">${reading.map(x => row(x, rp(x.id), stars, true)).join('')}</ul></section>` : ''}
      <div class="at-kinds" role="toolbar" aria-label="${T('Show', 'اعرض')}">${kinds.filter(([k]) => k === 'all' || counts[k]).map(([k, en, ar]) => `<button type="button" class="at-kind" data-kind="${k}" aria-pressed="${String(kindF === k)}">${T(en, ar)}<span>${counts[k] || 0}</span></button>`).join('')}</div>
      <p class="sr-only" aria-live="polite">${shown.length} ${T('results', 'نتيجة')}</p>
      ${shown.length ? `<ul class="at-index" id="atShelf">${shown.map(x => row(x, rp(x.id), stars)).join('')}</ul>` : `<p class="at-empty">${kindF === 'star' ? T('Nothing starred yet — use the star on any resource to keep it close.', 'لا شيء مميز بعد.') : T('Nothing matches. Try another word.', 'لا نتائج.')}</p>`}
      <div class="at-drop" id="atDrop">${icon('file')}<div><b>${T('Open your own PDF or text file', 'افتح ملف PDF أو نصاً')}</b><p>${T('Drop it here or choose it. It is read on this device with the same reader — never uploaded. Scanned PDFs open as original pages.', 'يُقرأ على هذا الجهاز ولا يُرفع.')}</p></div><label class="ls-btn">${T('Choose a file', 'اختر ملفاً')}<input type="file" id="atFile" accept=".pdf,.txt,application/pdf,text/plain" hidden></label></div>
      <details class="at-sec" style="margin-top:40px" id="atPrefs"><summary class="at-h2" style="cursor:pointer;list-style:none">${T('Reading preferences', 'تفضيلات القراءة')} <span class="at-muted" style="font:400 .9rem var(--f-body)">— ${T('applied every time you open the reader', 'تُطبَّق كلما فتحت القارئ')}</span></summary>
        <div class="at-prefs">
          <label>${T('Font', 'الخط')}<select data-pref="font">${[['classic', 'Classic (serif)'], ['sans', 'Sans'], ['lexend', 'Lexend'], ['atkinson', 'Atkinson Hyperlegible'], ['andika', 'Andika']].map(([v, l]) => `<option value="${v}" ${p.font === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>${T('Text size', 'حجم النص')} <output>${p.size}px</output><input type="range" data-pref="size" min="15" max="30" step="1" value="${p.size}"></label>
          <label>${T('Line spacing', 'تباعد الأسطر')} <output>${(+p.lh).toFixed(2)}</output><input type="range" data-pref="lh" min="1.4" max="2.4" step="0.05" value="${p.lh}"></label>
          <label>${T('Reading width', 'عرض القراءة')}<span>${seg('width', [[540, T('Narrow', 'ضيق')], [660, T('Medium', 'متوسط')], [800, T('Wide', 'عريض')]])}</span></label>
          <label>${T('Page tint', 'لون الصفحة')}<select data-pref="tint">${[['paper', T('White paper', 'أبيض')], ['cream', T('Cream', 'كريمي')], ['blue', T('Blue', 'أزرق')], ['mint', T('Mint', 'نعناعي')], ['rose', T('Rose', 'وردي')], ['night', T('Night (high contrast)', 'ليلي')]].map(([v, l]) => `<option value="${v}" ${p.tint === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>${T('Focus mode', 'وضع التركيز')}<span>${seg('focus', [[false, T('Off', 'إيقاف')], [true, T('Line focus', 'تركيز السطر')]])}</span></label>
          <p class="at-muted" style="grid-column:1/-1;margin:0;font-size:.88rem">${T('Read-aloud, zoom, word anchors, voice and speed are inside the reader (the speaker and “Aa” buttons). These settings are kept with your storage choice.', 'القراءة الصوتية والتكبير داخل القارئ.')}</p>
        </div></details></div>`;
    wireShelf(view);
  }
  function row(x, pr, stars, compact) {
    const on = stars.includes(x.key), frac = pr ? pr.frac : 0;
    const act = x.kind === 'book' ? `<a class="ls-btn ls-btn--quiet" href="${esc(x.url)}" target="_blank" rel="noopener">${T('Open', 'افتح')} ↗</a>` : x.kind === 'sheet' ? `<a class="ls-btn ls-btn--quiet" href="${x.href}">${T('Open', 'افتح')}</a>` : `<button type="button" class="ls-btn ${frac ? 'ls-btn--accent' : 'ls-btn--quiet'}" data-open="${esc(x.key)}">${frac ? T('Resume', 'تابع') : T('Read', 'اقرأ')}</button>`;
    const title = x.kind === 'book' ? `<a class="at-row__t" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)} <span class="sr-only">(${T('opens another website', 'يفتح موقعاً آخر')})</span></a>` : x.kind === 'sheet' ? `<a class="at-row__t" href="${x.href}">${esc(x.title)}</a>` : `<button type="button" class="at-row__t" data-open="${esc(x.key)}">${esc(x.title)}</button>`;
    return `<li class="${x.cls}"><div class="at-row"><span class="at-glyph">${icon(x.kind === 'book' ? 'read' : x.kind === 'sheet' ? 'quiz' : x.kind === 'guide' ? 'notes' : 'file')}</span><span>${title}<span class="at-row__m"><span class="at-tag">${esc(x.kindLabel)}</span>${esc(x.sub || '')}${x.pages ? ` · ${x.pages} ${T('pages', 'صفحات')}` : ''}</span></span><span class="at-row__p">${frac ? `<span>${Math.round(frac * 100)}% ${T('read', 'مقروء')} · ${LS.ago(pr.at)}</span><i><b style="width:${Math.round(frac * 100)}%"></b></i>` : ''}</span><span class="at-row__a">${act}${compact ? '' : `<button type="button" class="at-iconbtn" data-star="${esc(x.key)}" aria-pressed="${on}" aria-label="${on ? T('Remove star', 'أزل النجمة') : T('Star', 'ميّز')}: ${esc(x.title)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z"/></svg></button>`}</span></div></li>`;
  }
  function wireShelf(view) {
    const qi = view.querySelector('#atReadQ'); let t;
    qi.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { q = qi.value; const pos = qi.selectionStart; shelf(view); const n = view.querySelector('#atReadQ'); n.focus(); n.setSelectionRange(pos, pos); }, 160); });
    view.addEventListener('click', e => {
      const k = e.target.closest('[data-kind]'); if (k) { kindF = k.dataset.kind; shelf(view); const b = view.querySelector(`[data-kind="${kindF}"]`); b && b.focus(); return; }
      const o = e.target.closest('[data-open]'); if (o) { const x = readables().find(r => r.key === o.dataset.open); if (x && x.open) x.open(); return; }
      const s = e.target.closest('[data-star]'); if (s) { const key = s.dataset.star; st.update(d => { const a = d.settings.readStar || []; d.settings.readStar = a.includes(key) ? a.filter(z => z !== key) : a.concat(key); }); const open = view.querySelector('#atPrefs').open; shelf(view); view.querySelector('#atPrefs').open = open; const n = view.querySelector(`[data-star="${CSS.escape(key)}"]`); n && n.focus(); return; }
      const pb = e.target.closest('button[data-pref]'); if (pb) { setPref(pb.dataset.pref, pb.dataset.v === 'true' ? true : pb.dataset.v === 'false' ? false : +pb.dataset.v); pb.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === pb))); }
    });
    view.addEventListener('input', e => { const i = e.target.closest('input[type="range"][data-pref], select[data-pref]'); if (!i) return; const v = i.tagName === 'SELECT' ? i.value : +i.value; setPref(i.dataset.pref, v); const out = i.parentElement.querySelector('output'); if (out) out.textContent = i.dataset.pref === 'size' ? v + 'px' : (+v).toFixed(2); });
    const file = view.querySelector('#atFile'), drop = view.querySelector('#atDrop');
    const take = f => { if (!f) return; if (!R() || !R().openFile) return LS.toast(T('The reader could not load on this page.', 'تعذّر تحميل القارئ.')); applyPrefs(); R().openFile(f); };
    file.addEventListener('change', () => take(file.files && file.files[0]));
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('is-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('is-over'); take(e.dataTransfer.files && e.dataTransfer.files[0]); });
  }
  function setPref(k, v) { st.update(d => { d.settings.readPrefs = Object.assign({}, d.settings.readPrefs || {}, { [k]: v }); }); if (R() && R().applyPrefs) R().applyPrefs({ [k]: v }); LS.announce(T('Saved', 'حُفظ')); }

  /* ---------- worksheets: a printable sheet from a lesson's own questions ---------- */
  function sheet(view, id) {
    const L = LS.lesson(id); if (!L) return LS.go('read', { replace: true });
    const qs = []; L.sections.forEach(s => s.blocks.forEach(b => { if (b.k === 'activity' && b.q) qs.push(b.q); }));
    const opt = o => LS.plain(typeof o === 'string' ? o : (o.text || o.label || ''));
    const body = q => {
      const ty = q.type, p = `<p>${LS.inline(q.prompt || '')}</p>`;
      if ((ty === 'mcq' || ty === 'multi') && q.options) return p + `<ol type="A">${q.options.map(o => `<li>${esc(opt(o))}</li>`).join('')}</ol>${ty === 'multi' ? `<p class="at-muted">${T('Choose every correct answer.', 'اختر كل الإجابات الصحيحة.')}</p>` : ''}`;
      if (ty === 'tf') return p + `<p>${T('True / False', 'صح / خطأ')}</p>`;
      if (ty === 'match' && q.pairs) return p + `<ol>${q.pairs.map(pr => `<li>${esc(LS.plain(pr[0] || pr.a || ''))} → ______</li>`).join('')}</ol><p class="at-muted">${T('Options:', 'الخيارات:')} ${q.pairs.map(pr => esc(LS.plain(pr[1] || pr.b || ''))).join(' · ')}</p>`;
      if (ty === 'order' && q.items) return p + `<ol>${q.items.map(i => `<li>${esc(LS.plain(typeof i === 'string' ? i : i.text || ''))} — ${T('position', 'الترتيب')} ___</li>`).join('')}</ol>`;
      return p + '<span class="at-line"></span><span class="at-line"></span><span class="at-line"></span>';
    };
    view.innerHTML = `<article class="at-doc"><p class="at-k">${T('Worksheet', 'ورقة عمل')} · ${esc(L.subject)}</p><h1>${esc(L.title)}</h1><p class="at-lead">${T(`${qs.length} questions from this lesson. Print it, or answer them online with instant explanations.`, 'أسئلة هذا الدرس.')}</p>
      <p style="display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 8px" class="at-noprint"><button type="button" class="ls-btn ls-btn--accent" onclick="print()">${T('Print or save as PDF', 'اطبع أو احفظ PDF')}</button><a class="ls-btn" href="#/lesson/${L.id}">${T('Open the interactive lesson', 'افتح الدرس التفاعلي')}</a><a class="ls-btn ls-btn--quiet" href="#/read">← ${T('Reading & Resources', 'القراءة والموارد')}</a></p>
      <p class="at-muted" style="margin:18px 0">${T('Name', 'الاسم')}: ____________________ &nbsp; ${T('Date', 'التاريخ')}: ____________</p>
      <ol style="padding-inline-start:20px">${qs.map(q => `<li class="at-q">${body(q)}</li>`).join('')}</ol>
      <p class="at-muted" style="font-size:.85rem;margin-top:30px">${T('ERLY demonstration content written for this lesson — not official exam material.', 'محتوى تجريبي من ERLY.')}</p></article>`;
  }

  LS.route('read', (view, parts) => {
    if (parts[0] === 'sheet') return sheet(view, parts[1]);
    shelf(view);
    if (parts[0] === 'doc' && parts[1]) setTimeout(() => openReading(parts[1]), 0);
    if (parts[0] === 'guide' && parts[1]) setTimeout(() => openGuide(parts[1]), 0);
  });
  LS.route('library', () => LS.go('read', { replace: true }));
  // keep reading preferences in step with the reader from the first moment
  LS.on('route', ({ area }) => { if (area === 'read') applyPrefs(); });
  setTimeout(applyPrefs, 0);
  // "Delete everything" in Privacy & data also deletes what the reader kept: highlights, notes, bookmarks, positions
  LS.on('change', what => { if (what === 'deleted' && R() && R().forget) R().forget(); });
})();

/* v22 — reading connected to everything else. From a selected passage the student can make a practice question,
   make a flashcard, explore the idea visually or open a related lesson. The question is made by a plain rule
   (one key term from the passage is blanked) and is labelled as such; nothing is sent anywhere. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T;
  const STOP = new Set('about above after again against because before being below between could does doing during their there these those through under until which while would should other another every things where when what with from into than then them they this that have were your yours ours also only just very more most such some many much each been here like over well made make same'.split(' '));
  const words = t => (String(t).toLowerCase().match(/[\p{L}][\p{L}'’-]{2,}/gu) || []).filter(w => !STOP.has(w));
  function keyTerm(text) {
    const tags = new Set([].concat(...LS.lessons.map(L => (L.tags || []).concat(L.topic.toLowerCase().split(/\s+/)))));
    const ws = words(text), cnt = {}; ws.forEach(w => { cnt[w] = (cnt[w] || 0) + 1; });
    return Object.keys(cnt).sort((a, b) => ((tags.has(b) ? 10 : 0) + cnt[b] * 2 + Math.min(b.length, 12) * 0.5) - ((tags.has(a) ? 10 : 0) + cnt[a] * 2 + Math.min(a.length, 12) * 0.5))[0] || null;
  }
  function sentenceWith(text, term) { const ss = String(text).split(/(?<=[.!?])\s+/); return (ss.find(s => s.toLowerCase().includes(term)) || ss[0] || text).slice(0, 320); }
  function score(text, hay) { const ws = new Set(words(text)); return words(hay).filter(w => ws.has(w)).length; }
  function bestLesson(text) { return LS.lessons.map(L => ({ L, s: score(text, [L.title, L.topic, (L.tags || []).join(' '), L.objectives.join(' '), L.summary.join(' ')].join(' ')) })).sort((a, b) => b.s - a.s)[0]; }
  const record = (kind, doc, extra) => LS.engine && LS.engine.event('read-link', Object.assign({ kind, doc: doc && doc.id, label: 'From reading: ' + kind }, extra || {}));
  LS.readLinks = {
    question(text, doc) {
      const term = keyTerm(text); if (!term) { LS.toast(T('Select a longer passage to make a question.', 'اختر مقطعاً أطول.')); return; }
      const sent = sentenceWith(text, term), re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const q = { id: LS.uid('rq'), type: 'fill', prompt: sent.replace(re, '___'), blanks: [{ accept: [term] }], explain: `From your reading${doc ? ' (' + doc.title + ')' : ''}: “${sent}”`, topic: doc ? doc.title : 'Reading', subject: 'Reading' };
      const d = LS.dialog(`<h2 id="lsDlgT">${T('A question from your passage', 'سؤال من مقطعك')}</h2><p class="ls-muted ls-small">${T('Made by a simple rule: one key term from the passage is blanked out. Not written by AI.', 'صُنع بقاعدة بسيطة: حُجبت كلمة رئيسية.')}</p><div data-host></div><div class="ls-row"><button type="button" class="ls-btn ls-btn--quiet" data-close>${T('Close', 'إغلاق')}</button></div>`);
      LS.activity(d.el.querySelector('[data-host]'), q, { from: 'reading', lessonTitle: doc ? doc.title : 'Reading' });
      record('question', doc);
    },
    card(text, doc) {
      const term = keyTerm(text), sent = term ? sentenceWith(text, term) : text.slice(0, 300);
      LS.cards.quickEdit({ front: term ? sent.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '___') : sent, back: term || sent, kind: 'qa', topic: doc ? doc.title : 'Reading', src: { type: 'reading', id: doc && doc.id, title: doc ? doc.title : 'Reading' } });
      record('card', doc);
    },
    visual(text, doc) {
      const xs = (LS.experiences || []).map(x => ({ href: '#/exp/' + x.id, t: x.title, s: score(text, x.title + ' ' + x.hook + ' ' + x.id.replace(/-/g, ' ')) }));
      const go = list => { const best = list.sort((a, b) => b.s - a.s)[0]; record('visual', doc); if (best && best.s > 0) { LS.toast(T('Opening: ', 'أفتح: ') + best.t); if (window.ERLY && ERLY.reader && ERLY.reader.isOpen && ERLY.reader.isOpen()) { try { document.querySelector('#stClose, [data-st-close]') && document.querySelector('#stClose, [data-st-close]').click(); } catch (e) { /* ok */ } } LS.go(best.href.slice(2)); } else LS.toast(T('No visual model matches this passage yet — try “Ask Noor” instead.', 'لا نموذج مطابق بعد.')); };
      if (window.ERLY_LAB) go(xs.concat(ERLY_LAB.engines.map(e => ({ href: '#/lab/' + e.id, t: e.title || e.id, s: score(text, (e.title || '') + ' ' + (e.kind || '') + ' ' + e.id) * 0.9 }))));
      else LS.needLab().then(() => go(xs.concat(ERLY_LAB.engines.map(e => ({ href: '#/lab/' + e.id, t: e.title || e.id, s: score(text, (e.title || '') + ' ' + (e.kind || '') + ' ' + e.id) * 0.9 }))))).catch(() => go(xs));
    },
    lesson(text, doc) {
      const b = bestLesson(text); record('lesson', doc);
      if (b && b.s >= 2) { LS.toast(T('Related lesson: ', 'درس مرتبط: ') + b.L.title); const c = document.querySelector('#stClose'); if (c && window.ERLY.reader.isOpen()) c.click(); LS.go('lesson/' + b.L.id); }
      else LS.toast(T('No lesson in the Studio covers this passage closely. Try “Ask Noor” or “Make a question”.', 'لا درس يغطي هذا المقطع.'));
    },
    _keyTerm: keyTerm, _bestLesson: bestLesson
  };
})();
