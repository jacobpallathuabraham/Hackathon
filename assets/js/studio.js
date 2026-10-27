/* ERLY Reading Studio — a full-screen reader for course PDFs.

   - Library: pick one of the course readings, or open your own PDF / text
     file (read on this device with pdf.js; it is never uploaded).
   - Reading: fonts, size, spacing, page tints, line focus, word anchors,
     reader zoom, natural read-aloud with a live voice wave, glossary pop-ups.
   - Study: highlights in four colours with notes, bookmarks, search, page
     thumbnails and contents, reading progress with time left, summaries,
     key terms, flip flashcards, quizzes, a focus timer, auto-scroll,
     immersive mode, full screen and keyboard shortcuts.
   Every interaction feeds the live indicators in tracker.js (recorded only
   once the student has signed the Support Pact).

   The reader also publishes small interaction events on ERLY.reader for the
   AI Reading Companion (assets/js/companion/): which section is in view,
   zoom, pinch-zoom, pan, scrolling back and forth, format changes and
   read-aloud. It never publishes document text, keystrokes or anything from
   the camera or microphone. The companion decides — with the student's
   consent — what, if anything, to do with them. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const L = () => (I18N.lang === 'ar' ? 1 : 0);
  const pk = a => (Array.isArray(a) ? a[L()] || a[0] : a || '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const SX = window.ERLY_STUDY;
  const LIB = (window.STUDIO_LIBRARY || [window.STUDIO_DOC]).slice();
  let DOC = LIB[0];
  const track = (id, v, m) => ERLY.track && ERLY.track(id, v, m);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tried = new Set();
  const tool = k => { if (!tried.has(k)) { tried.add(k); track('H10', tried.size, 'set'); } };
  const toast = m => ERLY.toast && ERLY.toast(m);

  const FONTS = [['classic', 'Classic', '"Fraunces", Georgia, serif'], ['lexend', 'Lexend', '"Lexend", sans-serif'], ['atkinson', 'Atkinson', '"Atkinson Hyperlegible", sans-serif'], ['andika', 'Andika', '"Andika", sans-serif'], ['sans', 'Sans', '"Instrument Sans", sans-serif']];
  const TINTS = [['paper', '#FFFFFF', '#1B1915'], ['cream', '#FBF3DF', '#2B2418'], ['blue', '#E3EEFA', '#14243A'], ['mint', '#E2F4EC', '#11291F'], ['rose', '#FBE7EA', '#331A1F'], ['night', '#1E1D24', '#E9E6F2']];
  const STYLES = { friendly: [1.0, 1.0], calm: [0.9, 0.97], clear: [0.96, 1.0], brisk: [1.12, 1.0] };
  const st = { font: 'classic', size: 19, lh: 1.75, ls: 0, ws: 0, width: 660, tint: 'paper', focus: false, anchors: false, zoom: 1, voice: '', style: 'friendly', rate: 1.0, pitch: 1.0, hl: true };
  const ZOOMS = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
  const HL = [['sun', T('Yellow', 'أصفر')], ['mint', T('Green', 'أخضر')], ['sky', T('Blue', 'أزرق')], ['rose', T('Pink', 'وردي')]];
  const FIELD = { engineering: 'bolt', science: 'eyeScan', computing: 'hash', business: 'chart', mine: 'file' };

  /* ---------------- this device only: notes, bookmarks, progress ---------------- */
  const KEY = 'erly-studio-v1';
  let db = { notes: {}, marks: {}, prog: {} };
  try { db = Object.assign(db, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* private mode */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage full or blocked */ } };
  const notesOf = () => (db.notes[DOC.id] = db.notes[DOC.id] || []);
  const marksOf = () => (db.marks[DOC.id] = db.marks[DOC.id] || []);

  // event bus for the companion: interaction metadata only
  const listeners = [];
  const emit = ev => { ev.t = Date.now(); listeners.slice().forEach(fn => { try { fn(ev); } catch (e) { console.error(e); } }); };

  /* ================= build the overlay ================= */
  const root = document.createElement('div');
  root.className = 'studio';
  root.id = 'studio';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'ERLY Reading Studio');
  document.body.appendChild(root);

  const termKey = t => { if (!t) return null; if (DOC.terms[t]) return t; const k = Object.keys(DOC.terms).find(x => x.toLowerCase() === String(t).toLowerCase()); return k || null; };
  function paraHTML(x, pi, ji) {
    let html = esc(x.text);
    if (!DOC.uploaded) html = html.replace(/\[([^\]]+)\]/g, (_, t) => `<dfn class="term" data-term="${esc(termKey(t) || t)}" tabindex="0">${t}</dfn>`);
    return `<div class="sp${x.sub ? ' sp--sub' : ''}" data-p="${pi}-${ji}"><div class="sp__gutter"><button class="sp__btn" data-play="${pi}-${ji}" aria-label="${T('Read this paragraph', 'اقرأ هذه الفقرة')}">${ICON('volume')}</button><button class="sp__btn sp__btn--help" data-help="${pi}-${ji}" aria-label="${T('Help with this paragraph', 'مساعدة في هذه الفقرة')}">?</button></div><p class="sp__t">${html}</p></div>`;
  }
  const figHTML = () => `<figure class="sfig" id="sfig">${DOC.fig.svg}<figcaption>${esc(DOC.fig.cap)}</figcaption><div class="sfig__acts"><button class="sfig__help" data-fig>${ICON('search')} ${T('Explain this diagram', 'اشرح هذا الرسم')}</button><button class="sfig__help" data-figzoom aria-pressed="false">${ICON('search')} ${T('Zoom diagram', 'كبّر الرسم')}</button></div></figure>`;
  const pageHTML = (p, pi) => `<article class="spage" data-page="${pi}" style="--i:${pi}">
      <span class="spage__mark" aria-hidden="true">${ICON('bookmark')}</span>
      <header class="spage__hdr"><span>${esc(DOC.course)}</span><span>${esc(pk(DOC.unit))}</span></header>
      <h2 class="spage__h">${esc(p.h)}</h2>
      ${p.paras.map((x, ji) => paraHTML(x, pi, ji)).join('')}
      ${DOC.fig && DOC.fig.page === pi ? figHTML() : ''}
      <footer class="spage__ftr">${(DOC.startPage || 1) + pi}</footer>
    </article>`;

  root.innerHTML = `
    <header class="studio__top">
      <button class="studio__close" id="stClose" aria-label="${T('Close the Reading Studio', 'إغلاق استوديو القراءة')}">${ICON('x')}</button>
      <button class="icon-btn st-ib" id="stLibBtn" aria-label="${T('Library', 'المكتبة')}" title="${T('Library', 'المكتبة')}">${ICON('grid')}</button>
      <div class="studio__file">${ICON('file')}<span><b id="stTitle"></b><small id="stCourse"></small></span></div>
      <div class="studio__pages" id="stPages"></div>
      <div class="studio__acts">
        <span class="studio__rec" id="stRec"></span>
        <button class="icon-btn st-ib" id="stFindT" aria-label="${T('Search this reading', 'ابحث في هذه القراءة')}" title="${T('Search (Ctrl F)', 'بحث')}">${ICON('search')}</button>
        <button class="icon-btn st-ib" id="stMarkT" aria-pressed="false" aria-label="${T('Bookmark this page', 'ضع علامة على هذه الصفحة')}" title="${T('Bookmark (B)', 'علامة')}">${ICON('bookmark')}</button>
        <button class="btn btn--sm btn--accent" id="stRead">${ICON('volume')}<span>${T('Read page', 'اقرأ الصفحة')}</span></button>
        <button class="icon-btn st-ib" id="stSideT" aria-label="${T('Pages, contents and notes', 'الصفحات والمحتويات والملاحظات')}" title="${T('Pages & notes', 'الصفحات والملاحظات')}">${ICON('sidebar')}</button>
        <button class="icon-btn st-ib st-ib--glow" id="stStudyT" aria-label="${T('Study tools', 'أدوات المذاكرة')}" title="${T('Study tools', 'أدوات المذاكرة')}">${ICON('sparkle')}</button>
        <button class="icon-btn st-ib studio__tgl" id="stToolsT" aria-label="${T('Text and voice settings', 'إعدادات النص والصوت')}" title="${T('Text & voice', 'النص والصوت')}">${ICON('text')}</button>
        <div class="studio__zoom" role="group" aria-label="${T('Zoom', 'التكبير')}"><button class="icon-btn" id="stZoomOut" aria-label="${T('Zoom out', 'تصغير')}">−</button><output class="mono" id="stZoomV" aria-live="polite">100%</output><button class="icon-btn" id="stZoomIn" aria-label="${T('Zoom in', 'تكبير')}">+</button></div>
        <div class="smore"><button class="icon-btn st-ib" id="stMoreT" aria-haspopup="true" aria-expanded="false" aria-label="${T('More', 'المزيد')}">${ICON('more')}</button><div class="smore__menu" id="stMore" hidden role="menu"></div></div>
      </div>
    </header>
    <div class="sprog" aria-hidden="true"><i id="stProg"></i></div>
    <div class="studio__body">
      <aside class="sside" id="stSide" aria-label="${T('Pages, contents and notes', 'الصفحات والمحتويات والملاحظات')}">
        <div class="sside__tabs" role="tablist">${[['pages', T('Pages', 'الصفحات')], ['toc', T('Contents', 'المحتويات')], ['notes', T('Notes', 'الملاحظات')], ['marks', T('Marks', 'العلامات')]].map(([k, l], i) => `<button role="tab" data-side="${k}" aria-selected="${i === 0}">${l}<i class="sside__n" data-n="${k}"></i></button>`).join('')}</div>
        <div class="sside__body" id="stSideBody"></div>
        <div class="sside__foot"><span id="stLeft" class="mono"></span></div>
      </aside>
      <main class="studio__doc" id="stDoc" tabindex="0"></main>
      <aside class="sdraw" id="stDraw" aria-label="${T('Study tools and settings', 'أدوات المذاكرة والإعدادات')}">
        <div class="sdraw__head">
          <div class="sdraw__tabs" role="tablist"><button role="tab" data-dt="study" aria-selected="true">${ICON('sparkle')} ${T('Study', 'المذاكرة')}</button><button role="tab" data-dt="tools" aria-selected="false">${ICON('text')} ${T('Text & voice', 'النص والصوت')}</button></div>
          <button class="icon-btn icon-btn--sm" id="stDrawX" aria-label="${T('Close panel', 'إغلاق اللوحة')}">${ICON('x')}</button>
        </div>
        <div class="sdraw__pane" data-dp="study">
          <div class="sst__tabs" role="tablist">${[['sum', 'file', T('Summary', 'ملخص')], ['terms', 'abc', T('Key terms', 'مصطلحات')], ['cards', 'cards', T('Flashcards', 'بطاقات')], ['quiz', 'target', T('Quiz', 'اختبار')], ['ask', 'chat', T('Ask Noor', 'اسأل نور')]].map(([k, ic, l], i) => `<button role="tab" data-st="${k}" aria-selected="${i === 0}">${ICON(ic)}<span>${l}</span></button>`).join('')}</div>
          <div class="sst__body" id="stStudyBody"></div>
        </div>
        <div class="sdraw__pane" data-dp="tools" hidden>
          <div class="studio__tools" id="stTools">
            <section class="stool"><p class="stool__h mono">${T('Read aloud', 'القراءة الصوتية')}</p>
              <div class="vstyles" id="stStyles">${[['friendly', 'Friendly', 'ودود'], ['calm', 'Calm', 'هادئ'], ['clear', 'Clear', 'واضح'], ['brisk', 'Brisk', 'سريع']].map(([k, en, ar]) => `<button class="vstyle ${k === st.style ? 'is-on' : ''}" data-style="${k}">${T(en, ar)}</button>`).join('')}</div>
              <label class="field"><span class="mono">${T('Voice', 'الصوت')}</span><select id="stVoice"></select></label>
              <label class="slider slider--sm"><span><span>${T('Speed', 'السرعة')}</span><b class="mono" id="vRate2">1.00×</b></span><input type="range" id="stRate" min="0.6" max="1.5" step="0.02" value="1"></label>
              <label class="slider slider--sm"><span><span>${T('Pitch', 'طبقة الصوت')}</span><b class="mono" id="vPitch">1.00</b></span><input type="range" id="stPitch" min="0.6" max="1.5" step="0.02" value="1"></label>
              <button class="btn btn--xs btn--ghost" id="stTest">${ICON('volume')} ${T('Try this voice', 'جرّب هذا الصوت')}</button>
              <label class="switch-row"><span><b>${T('Highlight each word', 'إبراز كل كلمة')}</b></span><input type="checkbox" id="stHl" checked><i></i></label>
            </section>
            <section class="stool"><p class="stool__h mono">${T('Text', 'النص')}</p>
              <div class="fchips" id="stFonts">${FONTS.map(f => `<button class="fchip ${f[0] === st.font ? 'is-on' : ''}" data-font="${f[0]}" style="font-family:${f[2]}">${f[1]}<small>Aa</small></button>`).join('')}</div>
              <label class="slider slider--sm"><span><span>${T('Size', 'الحجم')}</span><b class="mono" id="vSz">19px</b></span><input type="range" id="stSize" min="14" max="34" step="1" value="19"></label>
              <label class="slider slider--sm"><span><span>${T('Line spacing', 'تباعد الأسطر')}</span><b class="mono" id="vLh2">1.75</b></span><input type="range" id="stLh" min="1.3" max="2.6" step="0.05" value="1.75"></label>
              <label class="slider slider--sm"><span><span>${T('Letter spacing', 'تباعد الحروف')}</span><b class="mono" id="vLs2">0.00</b></span><input type="range" id="stLs" min="0" max="0.16" step="0.01" value="0"></label>
              <label class="slider slider--sm"><span><span>${T('Word spacing', 'تباعد الكلمات')}</span><b class="mono" id="vWs">0.00</b></span><input type="range" id="stWs" min="0" max="0.6" step="0.05" value="0"></label>
              <label class="slider slider--sm"><span><span>${T('Line length', 'طول السطر')}</span><b class="mono" id="vW">660</b></span><input type="range" id="stW" min="460" max="820" step="20" value="660"></label>
            </section>
            <section class="stool"><p class="stool__h mono">${T('Page', 'الصفحة')}</p>
              <div class="tchips" id="stTints">${TINTS.map(t => `<button class="tchip ${t[0] === st.tint ? 'is-on' : ''}" data-tint="${t[0]}" style="--bg:${t[1]};--fg:${t[2]}" aria-label="${t[0]} page">A</button>`).join('')}</div>
              <label class="switch-row"><span><b>${T('Line focus', 'تركيز السطر')}</b><small>${T('follow with mouse or ↑ ↓', 'تتبّع بالفأرة أو ↑ ↓')}</small></span><input type="checkbox" id="stFocus"><i></i></label>
              <label class="switch-row"><span><b>${T('Word anchors', 'مراسي الكلمات')}</b><small>${T('bold word beginnings', 'بدايات كلمات عريضة')}</small></span><input type="checkbox" id="stAnch"><i></i></label>
              <button class="btn btn--xs btn--quiet" id="stReset">${T('Reset everything', 'إعادة الضبط')}</button>
            </section>
          </div>
        </div>
      </aside>
    </div>
    <div class="sfind" id="stFind" hidden role="search">
      ${ICON('search')}<input id="stFindQ" type="search" autocomplete="off" placeholder="${T('Search this reading…', 'ابحث في هذه القراءة…')}" aria-label="${T('Search this reading', 'ابحث في هذه القراءة')}">
      <output class="mono" id="stFindN">0/0</output>
      <button class="icon-btn icon-btn--sm" id="stFindP" aria-label="${T('Previous match', 'النتيجة السابقة')}">↑</button><button class="icon-btn icon-btn--sm" id="stFindNx" aria-label="${T('Next match', 'النتيجة التالية')}">↓</button>
      <button class="icon-btn icon-btn--sm" id="stFindX" aria-label="${T('Close search', 'إغلاق البحث')}">${ICON('x')}</button>
    </div>
    <div class="ssel" id="stSel" hidden role="toolbar" aria-label="${T('Selection tools', 'أدوات التحديد')}">
      <span class="ssel__colors">${HL.map(([c, n]) => `<button class="ssel__c ssel__c--${c}" data-hl="${c}" aria-label="${T('Highlight', 'تمييز')} · ${n}" title="${n}"></button>`).join('')}</span>
      <button data-sa="note">${ICON('note')}<span>${T('Note', 'ملاحظة')}</span></button>
      <button data-sa="read">${ICON('volume')}<span>${T('Read', 'اقرأ')}</span></button>
      <button data-sa="define">${ICON('abc')}<span>${T('Define', 'عرّف')}</span></button>
      <button data-sa="translate">${ICON('translate')}<span>${T('Arabic', 'عربي')}</span></button>
      <button data-sa="ask" class="ssel__ask">${ICON('sparkle')}<span>${T('Ask Noor', 'اسأل نور')}</span></button>
      <button data-sa="copy" aria-label="${T('Copy', 'نسخ')}">${ICON('copy')}</button>
    </div>
    <div class="term-pop" id="termPop" hidden></div>
    <div class="term-pop shl-pop" id="hlPop" hidden></div>
    <div class="stimer" id="stTimer" hidden>
      <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" class="stimer__track"/><circle cx="32" cy="32" r="28" class="stimer__arc" id="stTimerArc"/></svg>
      <div class="stimer__in"><small id="stTimerMode">${T('Focus', 'تركيز')}</small><b class="mono" id="stTimerT">25:00</b></div>
      <div class="stimer__ctl">
        <div class="stimer__presets">${[15, 25, 45].map(m => `<button data-min="${m}" class="${m === 25 ? 'is-on' : ''}">${m}</button>`).join('')}</div>
        <div class="stimer__btns"><button id="stTimerGo" aria-label="${T('Start', 'ابدأ')}">${ICON('play')}</button><button id="stTimerRs" aria-label="${T('Reset', 'إعادة')}">${ICON('reset')}</button><button id="stTimerX" aria-label="${T('Hide timer', 'إخفاء المؤقت')}">${ICON('x')}</button></div>
      </div>
    </div>
    <div class="sauto" id="stAuto" hidden>
      <button id="stAutoGo" aria-label="${T('Start auto-scroll', 'ابدأ التمرير التلقائي')}">${ICON('play')}</button>
      <label><span>${T('Speed', 'السرعة')}</span><input type="range" id="stAutoV" min="1" max="10" value="3"></label>
      <button id="stAutoX" aria-label="${T('Close auto-scroll', 'إغلاق التمرير التلقائي')}">${ICON('x')}</button>
    </div>
    <button class="sexit" id="stExit" hidden>${ICON('shrink')} ${T('Exit immersive mode', 'الخروج من وضع الانغماس')}</button>
    <div class="slib" id="stLib" hidden>
      <div class="slib__glow" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="slib__in">
        <header class="slib__head">
          <div><p class="slib__k mono">${T('Reading Studio', 'استوديو القراءة')}</p><h2>${T('Choose what to read', 'اختر ما تقرؤه')}</h2><p class="slib__lead">${T('Your course readings, ready with read-aloud, highlights, flashcards and Noor. Or open your own PDF — it stays on this device.', 'قراءات موادك جاهزة مع القراءة الصوتية والتمييز والبطاقات ونور. أو افتح ملف PDF خاصاً بك — يبقى على هذا الجهاز.')}</p></div>
          <button class="btn btn--sm btn--ghost slib__back" id="stLibBack" hidden></button>
          <button class="studio__close slib__x" id="stLibX" aria-label="${T('Close the Reading Studio', 'إغلاق استوديو القراءة')}">${ICON('x')}</button>
        </header>
        <div class="slib__bar">
          <label class="slib__search">${ICON('search')}<input id="stLibQ" type="search" autocomplete="off" placeholder="${T('Search readings, courses, topics…', 'ابحث في القراءات والمواد والمواضيع…')}" aria-label="${T('Search the library', 'ابحث في المكتبة')}"></label>
          <div class="slib__chips" id="stLibChips" role="group" aria-label="${T('Filter by field', 'تصفية حسب المجال')}"></div>
        </div>
        <div class="slib__grid" id="stLibGrid"></div>
      </div>
      <div class="slib__drop" aria-hidden="true">${ICON('upload')}<b>${T('Drop your PDF to open it', 'أفلت ملف PDF لفتحه')}</b></div>
    </div>`;

  const doc = $('#stDoc', root);

  /* ================= render the current document ================= */
  let wordEls = [], PARA_KEYS = [];
  const P = {};
  let seenPages = new Set([0]), played = {}, looked = {};
  function renderDoc() {
    doc.innerHTML = `<div class="studio__ruler" id="stRuler" aria-hidden="true"></div>
      ${DOC.pages.map(pageHTML).join('')}
      ${DOC.pdf ? '<div class="spdf" id="stPdf"></div>' : ''}
      <div class="vdock" id="vdock" aria-hidden="true"><button class="vdock__btn" id="vdStop" aria-label="${T('Stop reading', 'إيقاف القراءة')}">${ICON('x')}</button><canvas class="vdock__wave" id="vdWave"></canvas><span class="vdock__word" id="vdWord"></span></div>`;
    $('#vdStop', root).addEventListener('click', stopSpeech);
    splitWords();
    wordEls = $$('.w', doc);
    wordEls.forEach((w, i) => { w.dataset.i = i; });
    PARA_KEYS = $$('.sp', doc).map(p => p.dataset.p);
    Object.keys(P).forEach(k => delete P[k]);
    seenPages = new Set([0]); played = {}; looked = {};
    anchorize(); applyHighlights(); renderMarks();
    $('#stTitle', root).textContent = DOC.title;
    $('#stCourse', root).textContent = DOC.course;
    $('#stPages', root).innerHTML = DOC.pages.length <= 14 ? DOC.pages.map((p, i) => `<button data-goto="${i}" class="${i === 0 ? 'is-on' : ''}">${i + 1}</button>`).join('') : `<span class="mono studio__pgn" id="stPgN">1 / ${DOC.pages.length}</span>`;
    root.classList.toggle('is-pdf', !!DOC.pdf);
    root.classList.remove('is-original');
    if (DOC.pdf && DOC.scanned) setOriginal(true);
    renderSide(); renderStudy(); renderMore(); progress();
    clearFind();
  }
  // split paragraph text into word spans (keeps <dfn> terms intact)
  function splitWords() {
    $$('.sp__t', doc).forEach(p => {
      Array.from(p.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = tok; s.dataset.raw = tok; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName === 'DFN') {
          const words = n.textContent.split(' ');
          n.innerHTML = words.map(w => `<span class="w" data-raw="${esc(w)}">${esc(w)}</span>`).join(' ');
        }
      });
    });
  }
  function anchorize() {
    wordEls.forEach(w => {
      const raw = w.dataset.raw, m = raw.match(/^([A-Za-z]+)(.*)$/);
      if (st.anchors && m) { const k = Math.ceil(m[1].length * 0.45); w.innerHTML = `<b>${esc(m[1].slice(0, k))}</b>${esc(m[1].slice(k) + m[2])}`; }
      else w.textContent = raw;
    });
  }
  function loadDoc(d, o = {}) {
    if (!d) return;
    const changed = d !== DOC;
    if (changed) { saveProgress(); stopSpeech(); if (!root.hidden) emit({ type: 'close' }); }
    DOC = d;
    if (changed || !doc.children.length) renderDoc();
    hideLibrary();
    if (changed && !root.hidden) { emit({ type: 'open', doc: d.id }); openedAt = Date.now(); firstTts = null; firstScroll = null; }
    const pr = db.prog[d.id];
    setTimeout(() => { indexLines(); if (o.resume !== false && pr && pr.top > 40) { emit({ type: 'intent', why: 'resume' }); doc.scrollTop = pr.top; } else doc.scrollTop = 0; progress(); }, changed ? 60 : 0);
    if (changed && o.announce !== false) toast(T(`Opened ${d.title}`, `تم فتح ${d.title}`));
  }

  /* ================= library ================= */
  let libFilter = 'all', docChosen = false;
  const fieldName = f => ({ all: T('All', 'الكل'), engineering: T('Engineering', 'الهندسة'), science: T('Science', 'العلوم'), computing: T('Computing', 'الحوسبة'), business: T('Business', 'الأعمال'), mine: T('My files', 'ملفاتي') })[f];
  const wordsOf = d => d.pages.reduce((n, p) => n + p.paras.reduce((m, x) => m + x.text.split(/\s+/).length, 0), 0);
  function renderLibrary() {
    const fields = ['all'].concat([...new Set(LIB.map(d => d.field))]);
    $('#stLibChips', root).innerHTML = fields.map(f => `<button data-f="${f}" class="${f === libFilter ? 'is-on' : ''}">${fieldName(f) || f}</button>`).join('');
    const q = ($('#stLibQ', root).value || '').trim().toLowerCase();
    const list = LIB.filter(d => (libFilter === 'all' || d.field === libFilter) && (!q || [d.title, d.course, pk(d.name), d.short].join(' ').toLowerCase().includes(q)));
    const last = Object.entries(db.prog).sort((a, b) => (b[1].at || 0) - (a[1].at || 0))[0];
    $('#stLibGrid', root).innerHTML = `
      <label class="sbook sbook--up" id="stUpCard" style="--i:0">
        <input type="file" id="stFile" accept=".pdf,application/pdf,.txt,text/plain" hidden>
        <span class="sbook__cover sbook__cover--up"><span class="sbook__upic">${ICON('upload')}</span><b>${T('Open your own PDF', 'افتح ملف PDF خاصاً بك')}</b><small>${T('Drag & drop, or tap to browse', 'اسحب وأفلت، أو اضغط للتصفح')}</small></span>
        <span class="sbook__meta"><b>${T('Any course file', 'أي ملف دراسي')}</b><small>${T('Read on this device — never uploaded', 'يُقرأ على هذا الجهاز — لا يُرفع أبداً')}</small><span class="sbook__up" id="stUpMsg" aria-live="polite"></span></span>
      </label>
      ${list.map((d, i) => {
        const pr = db.prog[d.id], frac = pr ? pr.frac : 0, n = (db.notes[d.id] || []).length;
        const code = d.course.split(' · ')[0];
        return `<button class="sbook${DOC === d && docChosen ? ' is-current' : ''}" data-open="${esc(d.id)}" style="--h:${d.hue};--i:${i + 1}">
          <span class="sbook__cover">
            <span class="sbook__code mono">${esc(code)}</span>
            <span class="sbook__field">${ICON(FIELD[d.field] || 'book')}</span>
            <span class="sbook__title">${esc(pk(d.name))}</span>
            <span class="sbook__lines" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <span class="sbook__shine" aria-hidden="true"></span>
            ${last && last[0] === d.id && frac > 0.02 ? `<span class="sbook__badge">${T('Continue', 'تابع')}</span>` : d.uploaded ? `<span class="sbook__badge sbook__badge--mine">${T('Your file', 'ملفك')}</span>` : ''}
          </span>
          <span class="sbook__meta"><b>${esc(d.title)}</b><small>${esc(d.course)}</small>
            <span class="sbook__row"><span>${d.pages.length} ${T('pages', 'صفحات')} · ${SX.readingMinutes(wordsOf(d), 140)} ${T('min', 'د')}${n ? ` · ${n} ${T('notes', 'ملاحظات')}` : ''}</span><span class="sbook__prog" title="${Math.round(frac * 100)}%"><i style="--p:${frac}"></i></span></span>
          </span>
        </button>`;
      }).join('')}
      ${!list.length ? `<p class="slib__none">${T('No readings match that search.', 'لا توجد قراءات تطابق البحث.')}</p>` : ''}`;
    $('#stFile', root).addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) openFile(f); e.target.value = ''; });
    const back = $('#stLibBack', root);
    back.hidden = !docChosen;
    back.innerHTML = `${ICON('book')} ${T('Back to', 'العودة إلى')} ${esc(pk(DOC.name) || DOC.title)}`;
  }
  function showLibrary() {
    renderLibrary();
    const lib = $('#stLib', root);
    lib.hidden = false;
    requestAnimationFrame(() => lib.classList.add('is-in'));
    root.classList.add('lib-open');
    setTimeout(() => { const f = $('#stLibQ', root); f && innerWidth > 700 && f.focus({ preventScroll: true }); }, reduce ? 0 : 500);
  }
  function hideLibrary() {
    const lib = $('#stLib', root);
    if (lib.hidden) return;
    lib.classList.remove('is-in');
    root.classList.remove('lib-open');
    setTimeout(() => { if (!lib.classList.contains('is-in')) lib.hidden = true; }, reduce ? 0 : 380);
    setTimeout(() => doc.focus({ preventScroll: true }), reduce ? 0 : 420);
  }
  $('#stLibBtn', root).addEventListener('click', showLibrary);
  $('#stLibBack', root).addEventListener('click', hideLibrary);
  $('#stLibX', root).addEventListener('click', close);
  $('#stLibQ', root).addEventListener('input', () => renderLibrary());
  $('#stLibChips', root).addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; libFilter = b.dataset.f; renderLibrary(); });
  $('#stLibGrid', root).addEventListener('click', e => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    const d = LIB.find(x => x.id === b.dataset.open); if (!d) return;
    b.classList.add('is-opening');
    docChosen = true;
    setTimeout(() => loadDoc(d), reduce ? 0 : 260);
  });
  // drag & drop a PDF anywhere on the library
  const libEl = $('#stLib', root);
  ['dragenter', 'dragover'].forEach(t => libEl.addEventListener(t, e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) { e.preventDefault(); libEl.classList.add('is-drop'); } }));
  ['dragleave', 'drop'].forEach(t => libEl.addEventListener(t, e => { if (t === 'dragleave' && libEl.contains(e.relatedTarget)) return; libEl.classList.remove('is-drop'); }));
  libEl.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) openFile(f); });

  /* ================= open your own PDF (on this device) ================= */
  let pdfLib = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); }); }
  async function pdfjs() {
    if (pdfLib) return pdfLib;
    if (!window.pdfjsLib) await loadScript('assets/vendor/pdf.min.js');
    pdfLib = window.pdfjsLib;
    pdfLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js';
    return pdfLib;
  }
  const MAX_PAGES = 80, MAX_MB = 60;
  async function openFile(file) {
    const msg = t => { const m = $('#stUpMsg', root); if (m) m.innerHTML = t; };
    const card = $('#stUpCard', root);
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    const isTxt = /\.txt$/i.test(file.name) || file.type === 'text/plain';
    if (!isPdf && !isTxt) return msg(`<span class="is-err">${T('Please choose a PDF or a .txt file.', 'اختر ملف PDF أو ملفاً نصياً ‎.txt.')}</span>`);
    if (file.size > MAX_MB * 1048576) return msg(`<span class="is-err">${T(`That file is over ${MAX_MB} MB — try a smaller one.`, `حجم الملف يتجاوز ${MAX_MB} ميغابايت — جرّب ملفاً أصغر.`)}</span>`);
    card && card.classList.add('is-busy');
    const base = file.name.replace(/\.(pdf|txt)$/i, '');
    const d = { id: 'up-' + Date.now(), title: file.name, short: T('My file', 'ملفي'), unit: ['Your file', 'ملفك'], field: 'mine', hue: Math.floor(Math.random() * 360), startPage: 1, name: [base, base], terms: {}, uploaded: true, pages: [] };
    try {
      if (isTxt) {
        msg(`<span class="sbar"><i style="--p:.5"></i></span>${T('Reading the text…', 'جارٍ قراءة النص…')}`);
        d.pages = SX.structureText(await file.text());
        if (!d.pages.length) throw new Error('empty');
        d.course = T(`Text file · ${d.pages.length} pages`, `ملف نصي · ${d.pages.length} صفحات`);
      } else {
        msg(`<span class="sbar"><i style="--p:.05"></i></span>${T('Opening the PDF on this device…', 'جارٍ فتح الملف على هذا الجهاز…')}`);
        const lib = await pdfjs();
        const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
        const n = Math.min(pdf.numPages, MAX_PAGES);
        let chars = 0;
        for (let i = 1; i <= n; i++) {
          const page = await pdf.getPage(i);
          const tc = await page.getTextContent();
          const s = SX.structurePage(tc.items, i);
          chars += s.paras.reduce((a, p) => a + p.text.length, 0);
          d.pages.push({ h: s.h, paras: s.paras.length ? s.paras : [{ text: T('(No selectable text on this page.)', '(لا يوجد نص قابل للتحديد في هذه الصفحة.)') }] });
          msg(`<span class="sbar"><i style="--p:${(i / n).toFixed(3)}"></i></span>${T(`Reading page ${i} of ${n}…`, `جارٍ قراءة الصفحة ${i} من ${n}…`)}`);
        }
        d.pdf = pdf; d.numPages = pdf.numPages; d.scanned = chars < 40 * n;
        d.course = T(`Your PDF · ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'}`, `ملفك · ${pdf.numPages} صفحة`);
        if (pdf.numPages > MAX_PAGES) toast(T(`Showing the first ${MAX_PAGES} pages as text.`, `يُعرض أول ${MAX_PAGES} صفحة كنص.`));
      }
      LIB.unshift(d);
      docChosen = true;
      card && card.classList.remove('is-busy');
      loadDoc(d, { announce: false });
      tool('upload');
      toast(d.scanned ? T('This PDF is a scanned image, so it opens in original view. Read-aloud and study tools need selectable text.', 'هذا الملف صورة ممسوحة، لذا يُفتح بعرض الأصل. تحتاج القراءة الصوتية وأدوات المذاكرة إلى نص قابل للتحديد.') : T(`Opened ${file.name} — it stays on this device.`, `تم فتح ${file.name} — يبقى على هذا الجهاز.`));
    } catch (e) {
      console.warn(e);
      card && card.classList.remove('is-busy');
      msg(`<span class="is-err">${/password/i.test(String(e && e.name) + (e && e.message)) ? T('That PDF is password-protected. Open it elsewhere and save an unlocked copy.', 'هذا الملف محمي بكلمة مرور. افتحه في مكان آخر واحفظ نسخة غير مقفلة.') : T('Sorry — I couldn’t read that file. Is it a valid PDF?', 'عذراً — لم أستطع قراءة الملف. هل هو ملف PDF صالح؟')}</span>`);
    }
  }
  // original pages (canvas), rendered lazily as they scroll into view
  let pdfObs = null;
  function setOriginal(on) {
    if (!DOC.pdf) return;
    root.classList.toggle('is-original', on);
    const box = $('#stPdf', root);
    if (on && box && !box.children.length) {
      box.innerHTML = Array.from({ length: Math.min(DOC.numPages, MAX_PAGES) }, (_, i) => `<div class="spdf__pg" data-n="${i + 1}"><span class="mono">${i + 1}</span></div>`).join('');
      if (pdfObs) pdfObs.disconnect();
      pdfObs = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { pdfObs.unobserve(e.target); drawPdfPage(e.target); } }), { root: doc, rootMargin: '600px' }) : null;
      $$('.spdf__pg', box).forEach(el => (pdfObs ? pdfObs.observe(el) : drawPdfPage(el)));
    }
    renderMore();
    emit({ type: 'format', key: 'view' });
  }
  async function drawPdfPage(el) {
    try {
      const page = await DOC.pdf.getPage(+el.dataset.n);
      const v1 = page.getViewport({ scale: 1 });
      const dpr = Math.min(2, devicePixelRatio || 1), w = Math.min(900, el.clientWidth || 800);
      const vp = page.getViewport({ scale: (w / v1.width) * dpr });
      const cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height;
      el.style.aspectRatio = `${v1.width} / ${v1.height}`;
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      el.appendChild(cv); el.classList.add('is-drawn');
    } catch (e) { el.classList.add('is-err'); }
  }

  /* ================= open / close with a smooth reveal ================= */
  let openedAt = 0, firstTts = null, firstScroll = null, opened = false;
  function open(fromEl, opts) {
    opts = opts || {};
    const wanted = opts.doc && LIB.find(d => d.id === opts.doc);
    if (!root.hidden) { if (wanted) { docChosen = true; loadDoc(wanted); } else if (opts.library) showLibrary(); return; }
    const r = fromEl && fromEl.getBoundingClientRect ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    root.style.setProperty('--ox', (r.left + r.width / 2) + 'px');
    root.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
    if (!doc.children.length) renderDoc();
    root.hidden = false;
    document.documentElement.classList.add('studio-open');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
    if (!opened) { opened = true; openedAt = Date.now(); }
    if (wanted) { docChosen = true; loadDoc(wanted, { announce: false }); }
    else if (opts.library !== false) showLibrary();
    emit({ type: 'open', doc: DOC.id });
    setTimeout(() => { if ($('#stLib', root).hidden) doc.focus({ preventScroll: true }); indexLines(); }, reduce ? 0 : 650);
    updateRec();
  }
  function close() {
    if (root.hidden) return;
    stopSpeech(); stopAuto(); hideSel(); hidePop(); hideHlPop();
    if (busyPara) track('V09');
    saveProgress();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    root.classList.remove('is-open', 'is-immersive');
    document.documentElement.classList.remove('studio-open');
    emit({ type: 'close' });
    setTimeout(() => { if (!root.classList.contains('is-open')) { root.hidden = true; $('#stLib', root).hidden = true; $('#stLib', root).classList.remove('is-in'); root.classList.remove('lib-open'); } }, reduce ? 0 : 560);
  }
  ERLY.openStudio = open;
  document.addEventListener('click', e => { const b = e.target.closest('[data-studio]'); if (b) { e.preventDefault(); open(b, { doc: b.dataset.studio || null }); } });
  $('#stClose', root).addEventListener('click', close);
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || root.hidden) return;
    if (!$('#termPop', root).hidden) return hidePop();
    if (!$('#hlPop', root).hidden) return hideHlPop();
    if (!$('#stSel', root).hidden) return hideSel();
    if (!$('#stFind', root).hidden) return closeFind();
    if (!$('#stMore', root).hidden) return toggleMore(false);
    if (e.target.closest && e.target.closest('.cmp')) return; // the companion handles its own Escape
    if (ERLY.companion && ERLY.companion.isOpen()) return ERLY.companion.close(); // close the companion first
    if (!$('#stLib', root).hidden) { if (docChosen) return hideLibrary(); return close(); }
    if (root.classList.contains('is-immersive')) return immersive(false);
    if (root.classList.contains('show-draw')) return drawer(false);
    close();
  });
  function updateRec() { $('#stRec', root).innerHTML = ERLY.isTracking && ERLY.isTracking() ? `<i></i>${T('tracking on', 'التتبّع مفعّل')}` : `<i class="off"></i>${T('not tracking', 'لا تتبّع')}`; }

  /* ================= panels: side navigator, study drawer ================= */
  let sideTab = 'pages', drawTab = 'study', studyTab = 'sum';
  $('#stSideT', root).addEventListener('click', () => { root.classList.toggle('hide-side'); root.classList.toggle('show-side'); });
  $('#stStudyT', root).addEventListener('click', () => drawer(!(root.classList.contains('show-draw') && drawTab === 'study'), 'study'));
  $('#stToolsT', root).addEventListener('click', () => drawer(!(root.classList.contains('show-draw') && drawTab === 'tools'), 'tools'));
  $('#stDrawX', root).addEventListener('click', () => drawer(false));
  function drawer(on, tab) {
    if (tab) setDrawTab(tab);
    root.classList.toggle('show-draw', on);
    if (on && drawTab === 'study') { renderStudy(); tool('study'); }
  }
  function setDrawTab(t) {
    drawTab = t;
    $$('[data-dt]', root).forEach(b => b.setAttribute('aria-selected', b.dataset.dt === t));
    $$('.sdraw__pane', root).forEach(p => { p.hidden = p.dataset.dp !== t; });
    if (t === 'study') renderStudy();
  }
  $('.sdraw__tabs', root).addEventListener('click', e => { const b = e.target.closest('[data-dt]'); if (b) setDrawTab(b.dataset.dt); });
  $('.sside__tabs', root).addEventListener('click', e => { const b = e.target.closest('[data-side]'); if (!b) return; sideTab = b.dataset.side; renderSide(); });

  function pageWords(pi) { return DOC.pages[pi].paras.reduce((n, x) => n + x.text.split(/\s+/).length, 0); }
  function renderSide() {
    $$('.sside__tabs [data-side]', root).forEach(b => b.setAttribute('aria-selected', b.dataset.side === sideTab));
    const nN = notesOf().length, nM = marksOf().length;
    $('[data-n="notes"]', root).textContent = nN || ''; $('[data-n="marks"]', root).textContent = nM || '';
    const body = $('#stSideBody', root), cp = currentPage(), marks = marksOf();
    if (sideTab === 'pages') {
      body.innerHTML = `<div class="sthumbs">${DOC.pages.map((p, i) => {
        const lines = Math.min(9, Math.max(3, Math.round(pageWords(i) / 25)));
        return `<button class="sthumb${i === cp ? ' is-on' : ''}${seenPages.has(i) ? ' is-seen' : ''}" data-goto="${i}" style="--i:${i}" aria-label="${T('Page', 'الصفحة')} ${i + 1}: ${esc(p.h)}">
          <span class="sthumb__pg"><b>${esc(p.h)}</b>${Array.from({ length: lines }, (_, k) => `<i style="--w:${70 + ((k * 37 + i * 11) % 30)}%"></i>`).join('')}${DOC.fig && DOC.fig.page === i ? '<em></em>' : ''}${marks.includes(i) ? `<span class="sthumb__bm">${ICON('bookmark')}</span>` : ''}</span>
          <small class="mono">${(DOC.startPage || 1) + i}</small></button>`;
      }).join('')}</div>`;
    } else if (sideTab === 'toc') {
      body.innerHTML = `<ol class="stoc">${DOC.pages.map((p, i) => `<li><button data-goto="${i}" class="${i === cp ? 'is-on' : ''}"><span class="mono">${(DOC.startPage || 1) + i}</span><b>${esc(p.h)}</b></button>${p.paras.filter(x => x.sub).map(x => `<button class="stoc__sub" data-goto="${i}">${esc(x.text)}</button>`).join('')}</li>`).join('')}</ol>`;
    } else if (sideTab === 'notes') {
      const ns = notesOf().slice().sort((a, b) => a.from - b.from);
      body.innerHTML = ns.length ? `<div class="snotes">${ns.map(n => `<div class="snote snote--${n.color}">
          <button class="snote__q" data-jump="${n.from}">“${esc(n.text.length > 150 ? n.text.slice(0, 150) + '…' : n.text)}”</button>
          ${n.note ? `<p class="snote__n">${ICON('note')} ${esc(n.note)}</p>` : ''}
          <div class="snote__a"><span class="mono">${T('p.', 'ص')} ${(DOC.startPage || 1) + n.page}</span><button data-hledit="${n.id}">${ICON('edit')}</button><button data-hldel="${n.id}" aria-label="${T('Delete', 'حذف')}">${ICON('trash')}</button></div>
        </div>`).join('')}</div><button class="btn btn--xs btn--ghost snotes__ex" data-export>${ICON('download')} ${T('Export notes (.md)', 'تصدير الملاحظات (.md)')}</button>`
        : `<p class="sside__empty">${ICON('highlight')}<span>${T('Select any text to highlight it or add a note. Your notes stay on this device.', 'حدّد أي نص لتمييزه أو لإضافة ملاحظة. تبقى ملاحظاتك على هذا الجهاز.')}</span></p>`;
    } else {
      body.innerHTML = marks.length ? `<div class="smarks">${marks.slice().sort((a, b) => a - b).map(i => `<button data-goto="${i}">${ICON('bookmark')}<span><b>${T('Page', 'الصفحة')} ${(DOC.startPage || 1) + i}</b><small>${esc(DOC.pages[i].h)}</small></span></button>`).join('')}</div>`
        : `<p class="sside__empty">${ICON('bookmark')}<span>${T('Tap the bookmark at the top (or press B) to save a page.', 'اضغط على العلامة في الأعلى (أو B) لحفظ صفحة.')}</span></p>`;
    }
  }
  $('#stSideBody', root).addEventListener('click', e => {
    const g = e.target.closest('[data-goto]'); if (g) return goPage(+g.dataset.goto);
    const j = e.target.closest('[data-jump]'); if (j) return jumpToWord(+j.dataset.jump);
    const d = e.target.closest('[data-hldel]'); if (d) { removeHighlight(d.dataset.hldel); return; }
    const ed = e.target.closest('[data-hledit]'); if (ed) { const n = notesOf().find(x => x.id === ed.dataset.hledit); if (n) { jumpToWord(n.from); setTimeout(() => showHlPop(n, wordEls[n.from]), 450); } return; }
    if (e.target.closest('[data-export]')) exportNotes();
  });

  /* ================= typography ================= */
  function apply() {
    const f = FONTS.find(x => x[0] === st.font)[2], t = TINTS.find(x => x[0] === st.tint);
    doc.style.setProperty('--pf', f); doc.style.setProperty('--ps', st.size + 'px'); doc.style.setProperty('--plh', st.lh);
    doc.style.setProperty('--pls', st.ls + 'em'); doc.style.setProperty('--pws', st.ws + 'em'); doc.style.setProperty('--pw', st.width + 'px');
    doc.style.setProperty('--pbg', t[1]); doc.style.setProperty('--pfg', t[2]); doc.style.setProperty('--pz', st.zoom);
    root.classList.toggle('is-zoomed', st.zoom > 1); $('#stZoomV', root).textContent = Math.round(st.zoom * 100) + '%';
    root.classList.toggle('is-focus', st.focus); root.classList.toggle('is-anchors', st.anchors);
    $('#vSz', root).textContent = st.size + 'px'; $('#vLh2', root).textContent = st.lh.toFixed(2); $('#vLs2', root).textContent = st.ls.toFixed(2); $('#vWs', root).textContent = st.ws.toFixed(2); $('#vW', root).textContent = st.width;
    clearTimeout(apply.t); apply.t = setTimeout(() => { indexLines(); progress(); }, 300);
  }
  const bind = (id, key, ind, fn) => {
    $(id, root).addEventListener('input', e => { const old = st[key]; st[key] = +e.target.value; if (ind && (key !== 'size' || st.size > old)) { track(ind); tool('type'); } fn && fn(); apply(); });
    $(id, root).addEventListener('change', () => emit({ type: 'format', key })); // once per adjustment, not per pixel of a drag
  };
  bind('#stSize', 'size', 'V02'); bind('#stLh', 'lh', 'V07'); bind('#stLs', 'ls', 'V07'); bind('#stWs', 'ws', 'V07'); bind('#stW', 'width');
  $('#stFonts', root).addEventListener('click', e => { const b = e.target.closest('[data-font]'); if (!b) return; st.font = b.dataset.font; $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x === b)); if (st.font !== 'classic') { track('V07'); tool('font'); } emit({ type: 'format', key: 'font' }); apply(); });
  $('#stTints', root).addEventListener('click', e => { const b = e.target.closest('[data-tint]'); if (!b) return; st.tint = b.dataset.tint; $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x === b)); track('V07'); tool('tint'); emit({ type: 'format', key: 'tint' }); apply(); });
  $('#stFocus', root).addEventListener('change', e => { st.focus = e.target.checked; if (st.focus) { track('V04'); tool('focus'); } emit({ type: 'format', key: 'focus' }); apply(); placeRuler(); });
  $('#stAnch', root).addEventListener('change', e => { st.anchors = e.target.checked; if (st.anchors) tool('anchors'); emit({ type: 'format', key: 'anchors' }); anchorize(); applyHighlights(); apply(); });
  $('#stReset', root).addEventListener('click', () => {
    Object.assign(st, { font: 'classic', size: 19, lh: 1.75, ls: 0, ws: 0, width: 660, tint: 'paper', focus: false, anchors: false });
    syncControls();
    emit({ type: 'format', key: 'reset' });
    anchorize(); applyHighlights(); apply(); placeRuler();
  });

  /* ================= reader zoom (the reader's own, so it can be measured) ================= */
  // Browser zoom (Ctrl +/−) can't be read by a web page. Pinch-zoom on
  // phones and tablets can (visualViewport.scale) and is reported too.
  function setZoom(z, o = {}) {
    z = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], z));
    if (z === st.zoom) return;
    const mid = doc.scrollTop / Math.max(1, doc.scrollHeight);
    st.zoom = z; apply();
    doc.scrollTop = mid * doc.scrollHeight;
    if (!o.silent) emit({ type: 'zoom', level: z, figure: false });
  }
  const stepZoom = d => { const i = ZOOMS.findIndex(x => x >= st.zoom - 1e-6); setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + d))]); };
  $('#stZoomIn', root).addEventListener('click', () => stepZoom(1));
  $('#stZoomOut', root).addEventListener('click', () => stepZoom(-1));
  let wheelT = 0;
  doc.addEventListener('wheel', e => {
    stopAuto(true);
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (Date.now() - wheelT < 160) return; wheelT = Date.now();
    if (e.target.closest('#sfig')) return figZoom(e.deltaY < 0);
    stepZoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  if (window.visualViewport) {
    let lastScale = visualViewport.scale, pinchT = null;
    visualViewport.addEventListener('resize', () => {
      if (root.hidden) return;
      clearTimeout(pinchT);
      pinchT = setTimeout(() => { const s = +visualViewport.scale.toFixed(2); if (Math.abs(s - lastScale) >= 0.08) { lastScale = s; emit({ type: 'pinch', scale: s }); } }, 350);
    });
  }
  // diagram zoom: excluded from friction signals (inspecting a figure is normal)
  function figZoom(on) {
    const f = $('#sfig', root), b = $('[data-figzoom]', root); if (!f) return;
    on = on === undefined ? !f.classList.contains('is-zoom') : on;
    if (on === f.classList.contains('is-zoom')) return;
    f.classList.toggle('is-zoom', on); b.setAttribute('aria-pressed', on);
    emit({ type: 'zoom', level: on ? 1.6 : 1, figure: true });
  }
  root.addEventListener('click', e => { if (e.target.closest('[data-figzoom]')) figZoom(); });

  /* ================= the voice wave ================= */
  // Browsers don't expose the speech audio, so the wave follows the speech
  // engine itself: each spoken word sets the energy (longer and stressed words
  // swell, punctuation dips into a pause, questions lift), and syllable pulses
  // ride on top at the speaking rate. Pitch changes the wave's frequency.
  const viz = { e: 0, target: 0, lift: 0, liftT: 0, t: 0, on: false, raf: 0, last: 0 };
  function vizWord(w) {
    const clean = w.replace(/[^\p{L}\p{N}]/gu, '');
    const stress = /^[A-Z]/.test(w) ? .12 : 0;
    viz.target = Math.min(1, .38 + Math.min(clean.length, 12) * .05 + stress + Math.random() * .08);
    viz.wordAt = performance.now();
    viz.liftT = /\?$/.test(w) ? .5 : /[.!]$/.test(w) ? -.3 : 0;
    if (/[.,;:!?]$/.test(w)) setTimeout(() => { viz.target = .08; }, 180 / st.rate);
  }
  function vizStart() { viz.on = true; if (!viz.raf) viz.raf = requestAnimationFrame(vizLoop); }
  function vizStop() { viz.on = false; viz.target = 0; }
  function drawWave(cv, energy, small) {
    if (!cv || !cv.offsetWidth) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (energy < .015) return;
    const cs = getComputedStyle(document.documentElement);
    const cols = [cs.getPropertyValue('--accent').trim() || '#C1502B', cs.getPropertyValue('--teal').trim() || '#146A63', cs.getPropertyValue('--s4').trim() || '#5B4B8A'];
    const freq = (small ? 2.2 : 2.6) * (0.75 + st.pitch * .35) * (1 + viz.lift * .35);
    [[1, 0, .9], [.7, 1.7, .55], [.45, 3.1, .4]].forEach(([amp, ph, alpha], li) => {
      g.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const u = x / W, env = Math.pow(Math.sin(Math.PI * u), 1.6);
        const y = H / 2 + Math.sin(u * Math.PI * 2 * freq + viz.t * (2.2 + li * .7) + ph) * env * amp * energy * (H * .42);
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = cols[li]; g.globalAlpha = alpha * (small ? 1 : .95); g.lineWidth = li ? 1.6 : 2.4; g.lineCap = 'round'; g.stroke();
    });
    g.globalAlpha = 1;
  }
  function vizLoop(now) {
    const dt = Math.min(50, now - (viz.last || now)); viz.last = now;
    viz.t += dt / 1000 * (1.2 + st.rate * 1.6);
    const since = (now - (viz.wordAt || 0)) / 1000, pulse = viz.on ? .55 + .45 * Math.abs(Math.sin(since * Math.PI * 4.5 * st.rate)) : 0;
    const goal = viz.on ? viz.target * pulse : 0;
    viz.e += (goal - viz.e) * Math.min(1, dt / 70);
    viz.target *= viz.on ? 0.992 : 0.9;
    viz.lift += (viz.liftT - viz.lift) * .05;
    const e = Math.max(viz.on ? .06 : 0, viz.e);
    drawWave($('#vdWave', root), e, false);
    if (viz.on || viz.e > .01 || talkingNow) viz.raf = requestAnimationFrame(vizLoop);
    else { viz.raf = 0; drawWave($('#vdWave', root), 0); }
  }

  /* ================= voices & natural read-aloud ================= */
  let voices = [];
  const natural = v => {
    const n = v.name;
    let s = 0;
    if (/natural|neural/i.test(n)) s += 8; if (/premium|enhanced|siri/i.test(n)) s += 7; if (/online/i.test(n)) s += 3; if (/google/i.test(n)) s += 3;
    if (/aria|jenny|sonia|libby|natasha|emma|michelle|ava|samantha|serena|allison|karen|moira|tessa|daniel|guy|ryan|zoe|evan/i.test(n)) s += 3;
    if (/compact|espeak|robot|novelty|whisper|bells|bad news|zarvox|trinoids|cellos|boing|bubbles|jester|organ|superstar|wobble|albert|fred|junior|ralph/i.test(n)) s -= 12;
    if (/^en-(GB|US|AU|IE)/i.test(v.lang)) s += 1;
    return s;
  };
  function loadVoices() {
    if (!('speechSynthesis' in window)) { $('#stVoice', root).innerHTML = `<option>${T('Read-aloud not supported here', 'القراءة الصوتية غير مدعومة')}</option>`; return; }
    voices = speechSynthesis.getVoices();
    const groups = { en: [], ar: [], other: [] };
    voices.forEach((v, i) => { const k = /^en/i.test(v.lang) ? 'en' : /^ar/i.test(v.lang) ? 'ar' : 'other'; groups[k].push([i, v]); });
    groups.en.sort((a, b) => natural(b[1]) - natural(a[1]));
    const opt = ([i, v]) => `<option value="${i}">${natural(v) >= 7 ? '★ ' : ''}${esc(v.name.replace(/Microsoft |Google |\(Natural\)|Online/g, '').trim())} · ${esc(v.lang)}</option>`;
    $('#stVoice', root).innerHTML = voices.length
      ? `${groups.en.length ? `<optgroup label="English — most natural first">${groups.en.map(opt).join('')}</optgroup>` : ''}${groups.ar.length ? `<optgroup label="العربية">${groups.ar.map(opt).join('')}</optgroup>` : ''}${groups.other.length ? `<optgroup label="${T('Other', 'أخرى')}">${groups.other.map(opt).join('')}</optgroup>` : ''}`
      : `<option value="">${T('Default voice', 'الصوت الافتراضي')}</option>`;
    if (st.voice === '' && groups.en[0]) st.voice = groups.en[0][0];
    if (st.voice !== '') $('#stVoice', root).value = st.voice;
  }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; } else loadVoices();
  $('#stVoice', root).addEventListener('change', e => { st.voice = e.target.value; });
  $('#stStyles', root).addEventListener('click', e => {
    const b = e.target.closest('[data-style]'); if (!b) return;
    st.style = b.dataset.style; [st.rate, st.pitch] = STYLES[st.style];
    $$('#stStyles .vstyle', root).forEach(x => x.classList.toggle('is-on', x === b));
    $('#stRate', root).value = st.rate; $('#stPitch', root).value = st.pitch;
    $('#vRate2', root).textContent = st.rate.toFixed(2) + '×'; $('#vPitch', root).textContent = st.pitch.toFixed(2);
    track('U03');
    say(st.style === 'calm' ? T('Okay — nice and slow. No rush at all.', 'حسناً — بهدوء وبطء. لا عجلة أبداً.') : st.style === 'brisk' ? T('Alright, let’s pick up the pace a little.', 'حسناً، لنسرّع قليلاً.') : st.style === 'clear' ? T('Clear and steady. Here we go.', 'واضح وثابت. لنبدأ.') : T('Hey! This is how I sound when we read together.', 'أهلاً! هكذا يبدو صوتي حين نقرأ معاً.'));
  });
  $('#stRate', root).addEventListener('input', e => { st.rate = +e.target.value; $('#vRate2', root).textContent = st.rate.toFixed(2) + '×'; track('U03'); });
  $('#stPitch', root).addEventListener('input', e => { st.pitch = +e.target.value; $('#vPitch', root).textContent = st.pitch.toFixed(2); });
  $('#stHl', root).addEventListener('change', e => { st.hl = e.target.checked; });
  $('#stTest', root).addEventListener('click', () => say(T('Hi! I’m Noor. Pick whichever voice feels easiest to listen to — I’ll use it whenever we read together.', 'أهلاً! أنا نور. اختر الصوت الأسهل عليك — وسأستخدمه كلما قرأنا معاً.')));

  function utter(text, rate, pitch) {
    const u = new SpeechSynthesisUtterance(text);
    const v = voices[st.voice];
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
    u.rate = rate || st.rate; u.pitch = pitch || st.pitch;
    return u;
  }
  // Speak a list of word spans as natural phrases: one utterance per sentence,
  // a breath between them, and a little pitch movement so it never sounds flat.
  let reading = null, fallback = null;
  function phrases(words) {
    const out = []; let cur = [];
    words.forEach((w, i) => { cur.push(w); if (/[.!?:;]$/.test(w.dataset.raw) || i === words.length - 1 || cur.length > 40) { out.push(cur); cur = []; } });
    return out;
  }
  function readParas(keys, rate) {
    if (!('speechSynthesis' in window)) return toast(T('Read-aloud isn\'t supported in this browser', 'القراءة الصوتية غير مدعومة في هذا المتصفح'));
    stopSpeech();
    track('H01'); tool('tts');
    if (firstTts === null && openedAt) { firstTts = (Date.now() - openedAt) / 1000; track('V08', +firstTts.toFixed(0), 'set'); }
    const queue = keys.filter(k => $(`.sp[data-p="${k}"]`, root));
    if (!queue.length) return;
    reading = { queue };
    emit({ type: 'tts', action: 'start', scope: keys.length > 1 ? 'page' : 'paragraph' });
    $('#stRead', root).classList.add('is-on');
    $('#stRead span', root).textContent = T('Stop', 'إيقاف');
    root.classList.add('is-speaking');
    vizStart();
    const nextPara = () => {
      if (!reading || !queue.length) return stopSpeech();
      const key = queue.shift();
      played[key] = (played[key] || 0) + 1;
      if (played[key] > 1) track('U02');
      const box = $(`.sp[data-p="${key}"]`, root);
      $$('.sp.is-reading', root).forEach(x => x.classList.remove('is-reading'));
      box.classList.add('is-reading');
      emit({ type: 'intent', why: 'read-aloud' });
      box.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      speakWords($$('.w', box), rate, () => { box.classList.remove('is-reading'); setTimeout(nextPara, 380); });
    };
    nextPara();
  }
  function speakWords(wordsAll, rate, done) {
    const ph = phrases(wordsAll);
    let pi = 0;
    const nextPhrase = () => {
      if (!reading) return;
      if (pi >= ph.length) return done();
      const words = ph[pi++], text = words.map(w => w.dataset.raw).join(' ');
      const starts = []; let pos = 0; words.forEach(w => { starts.push(pos); pos += w.dataset.raw.length + 1; });
      const mark = i => { words.forEach(w => w.classList.remove('is-say')); if (words[i]) { if (st.hl) words[i].classList.add('is-say'); vizWord(words[i].dataset.raw); const vw = $('#vdWord', root); if (vw) vw.textContent = words[i].dataset.raw.replace(/[^\p{L}\p{N}'’-]/gu, ''); } };
      let gotB = false, idx = -1;
      const question = /\?$/.test(text);
      const u = utter(text, (rate || st.rate) * (0.98 + Math.random() * .04), st.pitch * (question ? 1.04 : 0.98 + Math.random() * .04));
      u.onboundary = e => { if (e.name && e.name !== 'word') return; gotB = true; const i = starts.findIndex((s, k) => s <= e.charIndex && (starts[k + 1] === undefined || starts[k + 1] > e.charIndex)); if (i >= 0) { idx = i; mark(i); } };
      u.onstart = () => { mark(0); idx = 0; };
      u.onend = u.onerror = () => { clearInterval(fallback); words.forEach(w => w.classList.remove('is-say')); viz.target = .05; if (reading) setTimeout(nextPhrase, /[.!?]$/.test(text) ? 260 : 120); };
      speechSynthesis.speak(u);
      clearInterval(fallback);
      setTimeout(() => { if (!gotB && reading) fallback = setInterval(() => { if (idx + 1 < words.length) mark(++idx); }, 60000 / (165 * (rate || st.rate))); }, 600);
    };
    nextPhrase();
  }
  // read a selection (any run of word spans)
  function readSelection(ws) {
    if (!('speechSynthesis' in window) || !ws.length) return;
    stopSpeech(); track('H01'); tool('tts');
    reading = { queue: [] };
    emit({ type: 'tts', action: 'start', scope: 'selection' });
    root.classList.add('is-speaking'); vizStart();
    $('#stRead', root).classList.add('is-on'); $('#stRead span', root).textContent = T('Stop', 'إيقاف');
    speakWords(ws, null, () => stopSpeech());
  }
  function stopSpeech() {
    if (reading) emit({ type: 'tts', action: 'stop' });
    reading = null; clearInterval(fallback);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $$('.w.is-say', root).forEach(w => w.classList.remove('is-say'));
    $$('.sp.is-reading', root).forEach(w => w.classList.remove('is-reading'));
    $('#stRead', root).classList.remove('is-on'); $('#stRead span', root).textContent = T('Read page', 'اقرأ الصفحة');
    root.classList.remove('is-speaking');
    vizStop();
    talking(false);
  }
  $('#stRead', root).addEventListener('click', () => {
    if (reading) return stopSpeech();
    const pg = currentPage();
    track('U06');
    readParas(DOC.pages[pg].paras.map((_, j) => `${pg}-${j}`));
  });
  root.addEventListener('click', e => { const p = e.target.closest('[data-play]'); if (p) readParas([p.dataset.play]); });

  /* ================= pages, progress, time left ================= */
  function currentPage() {
    const mid = doc.getBoundingClientRect().top + doc.clientHeight / 2;
    let best = 0;
    $$('.spage', doc).forEach((p, i) => { if (p.getBoundingClientRect().top < mid) best = i; });
    return best;
  }
  function goPage(n) {
    n = Math.max(0, Math.min(DOC.pages.length - 1, n));
    if (n < currentPage() && seenPages.has(n)) track('V06');
    const pg = $(`.spage[data-page="${n}"]`, doc); if (!pg) return;
    emit({ type: 'intent', why: 'page-button' });
    doc.scrollTo({ top: pg.offsetTop - 20, behavior: reduce ? 'auto' : 'smooth' });
    if (innerWidth < 1100) root.classList.remove('show-side');
  }
  $('#stPages', root).addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) goPage(+b.dataset.goto); });
  let lastPg = -1;
  function progress() {
    const max = Math.max(1, doc.scrollHeight - doc.clientHeight), frac = Math.min(1, Math.max(0, doc.scrollTop / max));
    $('#stProg', root).style.transform = `scaleX(${frac.toFixed(4)})`;
    const total = wordsOf(DOC), left = Math.round(total * (1 - frac) / 140);
    $('#stLeft', root).textContent = frac > 0.985 ? T('Finished — nice work!', 'انتهيت — عمل رائع!') : left < 1 ? T('Less than a minute left', 'أقل من دقيقة متبقية') : T(`≈ ${left} min left · ${Math.round(frac * 100)}%`, `≈ ${left} د متبقية · ${Math.round(frac * 100)}٪`);
    const cp = currentPage();
    if (cp !== lastPg) {
      lastPg = cp;
      $$('#stPages button', root).forEach((b, i) => b.classList.toggle('is-on', i === cp));
      const pn = $('#stPgN', root); if (pn) pn.textContent = `${cp + 1} / ${DOC.pages.length}`;
      $$('.sthumb', root).forEach((b, i) => b.classList.toggle('is-on', i === cp));
      $$('.stoc > li > button', root).forEach((b, i) => b.classList.toggle('is-on', i === cp));
      const mk = marksOf().includes(cp), mb = $('#stMarkT', root); mb.setAttribute('aria-pressed', mk); mb.classList.toggle('is-on', mk);
      if (drawTab === 'study' && root.classList.contains('show-draw') && (studyTab === 'sum' || studyTab === 'terms')) renderStudy();
    }
    return frac;
  }
  function saveProgress() {
    if (!DOC || !doc.children.length || !opened) return;
    db.prog[DOC.id] = { frac: +progress().toFixed(3), top: Math.round(doc.scrollTop), at: Date.now() };
    if (!DOC.uploaded) save();
  }

  /* ================= bookmarks ================= */
  function renderMarks() { const m = marksOf(); $$('.spage', doc).forEach((p, i) => p.classList.toggle('is-marked', m.includes(i))); }
  function toggleMark() {
    const cp = currentPage(), m = marksOf(), i = m.indexOf(cp);
    if (i >= 0) m.splice(i, 1); else m.push(cp);
    save(); renderMarks(); lastPg = -1; progress(); renderSide();
    const b = $('#stMarkT', root); b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop');
    tool('bookmark');
    toast(i >= 0 ? T('Bookmark removed', 'أُزيلت العلامة') : T(`Page ${(DOC.startPage || 1) + cp} bookmarked`, `تم وضع علامة على الصفحة ${(DOC.startPage || 1) + cp}`));
  }
  $('#stMarkT', root).addEventListener('click', toggleMark);

  /* ================= glossary ================= */
  const pop = $('#termPop', root);
  function placePop(el, r) {
    el.hidden = false;
    const w = el.offsetWidth || 300;
    const left = Math.min(innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
    const top = r.bottom + 10 + el.offsetHeight > innerHeight ? Math.max(12, r.top - 10 - el.offsetHeight) : r.bottom + 10;
    el.style.left = left + 'px'; el.style.top = top + 'px';
    el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in');
  }
  function showTerm(el) { showTermAt(el.dataset.term, el.getBoundingClientRect()); }
  function showTermAt(t, r) {
    const k = termKey(t), d = k && DOC.terms[k]; if (!d) return false;
    looked[k] = (looked[k] || 0) + 1;
    track('M03', looked[k] > 1 ? 1 : 0); tool('glossary');
    pop.innerHTML = `<b>${esc(k)}</b><p>${esc(d[0])}</p><p class="term-pop__ar" lang="ar" dir="rtl">${esc(d[1])}</p><div class="row-btns"><button class="btn btn--xs btn--ghost" data-say-term>${ICON('volume')} ${T('Hear it', 'استمع')}</button><button class="btn btn--xs btn--ghost" data-ask-term>${ICON('sparkle')} ${T('Example', 'مثال')}</button><button class="btn btn--xs btn--quiet" data-close-pop>${T('Close', 'إغلاق')}</button></div>`;
    placePop(pop, r);
    $('[data-say-term]', pop).onclick = () => { track('H01'); say(`${k}. ${d[0]}`); };
    $('[data-ask-term]', pop).onclick = () => { hidePop(); askNoor(T(`Give me one simple, real-life example of “${k}” from ${DOC.course}.`, `أعطني مثالاً بسيطاً واحداً من الحياة على «${k}» في ${DOC.course}.`)); };
    $('[data-close-pop]', pop).onclick = hidePop;
    return true;
  }
  function hidePop() { pop.hidden = true; }
  root.addEventListener('click', e => {
    const t = e.target.closest('.term');
    if (t && !String(getSelection()).trim()) { e.stopPropagation(); showTerm(t); return; }
    if (!e.target.closest('#termPop')) hidePop();
    const w = e.target.closest('.w.hl');
    if (w && !String(getSelection()).trim()) { const n = notesOf().find(x => x.id === w.dataset.hl); if (n) showHlPop(n, w); }
    else if (!e.target.closest('#hlPop')) hideHlPop();
    if (!e.target.closest('.smore')) toggleMore(false);
  });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('term')) showTerm(e.target); });

  /* ================= selection → highlight, note, read, define, ask ================= */
  const sel = $('#stSel', root);
  let selNow = null, selT = null, selMeasure = null;
  function selWords() {
    const s = getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return null;
    const r = s.getRangeAt(0);
    if (!doc.contains(r.commonAncestorContainer)) return null;
    const anc = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    const own = anc.closest && anc.closest('.w');
    const ws = own ? [own] : $$('.w', anc).filter(w => r.intersectsNode(w));
    if (!ws.length) return null;
    return { ws, rect: r.getBoundingClientRect(), text: String(s).replace(/\s+/g, ' ').trim() };
  }
  function showSel() {
    const s = selWords();
    if (!s || s.text.length < 2) return hideSel();
    selNow = s;
    sel.hidden = false;
    const w = sel.offsetWidth, h = sel.offsetHeight;
    const left = Math.min(innerWidth - w - 10, Math.max(10, s.rect.left + s.rect.width / 2 - w / 2));
    const top = s.rect.top - h - 12 < 70 ? s.rect.bottom + 12 : s.rect.top - h - 12;
    sel.style.left = left + 'px'; sel.style.top = top + 'px';
    sel.classList.remove('is-in'); void sel.offsetWidth; sel.classList.add('is-in');
    clearTimeout(selMeasure); selMeasure = setTimeout(() => { if (!String(getSelection()).trim()) track('M07'); }, 2500);
  }
  function hideSel() { sel.hidden = true; selNow = null; }
  document.addEventListener('selectionchange', () => {
    if (root.hidden) return;
    clearTimeout(selT);
    selT = setTimeout(() => { const s = getSelection(); if (s && !s.isCollapsed && doc.contains(s.anchorNode)) showSel(); else if (!sel.matches(':hover')) hideSel(); }, 260);
  });
  doc.addEventListener('scroll', () => { if (!sel.hidden) hideSel(); hidePop(); hideHlPop(); }, { passive: true });
  sel.addEventListener('pointerdown', e => e.preventDefault()); // keep the selection while tapping a tool
  sel.addEventListener('click', e => {
    const s = selNow; if (!s) return;
    const c = e.target.closest('[data-hl]'), a = e.target.closest('[data-sa]');
    if (c) { addHighlight(s, c.dataset.hl); getSelection().removeAllRanges(); hideSel(); return; }
    if (!a) return;
    const act = a.dataset.sa;
    if (act === 'note') { const n = addHighlight(s, 'sun'); getSelection().removeAllRanges(); hideSel(); setTimeout(() => showHlPop(n, wordEls[n.to], true), 60); }
    if (act === 'read') { readSelection(s.ws); getSelection().removeAllRanges(); hideSel(); }
    if (act === 'copy') { try { navigator.clipboard.writeText(s.text); toast(T('Copied', 'تم النسخ')); } catch (err) { /* no clipboard */ } hideSel(); }
    if (act === 'define' || act === 'translate') {
      const key = s.text.toLowerCase().replace(/[^\p{L}\p{N}\s'’-]/gu, '').trim();
      const r = s.rect; hideSel(); getSelection().removeAllRanges();
      if (showTermAt(key, r)) return;
      askNoor(act === 'define' ? T(`What does “${s.text}” mean here? Explain it simply in one or two sentences.`, `ما معنى «${s.text}» هنا؟ اشرحه ببساطة في جملة أو جملتين.`) : T(`Translate into Arabic and explain briefly: “${s.text}”`, `ترجم إلى العربية واشرح باختصار: «${s.text}»`), s.text);
    }
    if (act === 'ask') { hideSel(); getSelection().removeAllRanges(); askNoor(T(`Explain this passage in simple words: “${s.text.slice(0, 700)}”`, `اشرح هذا المقطع بكلمات بسيطة: «${s.text.slice(0, 700)}»`), s.text); }
  });
  function askNoor(q, quote) {
    track('H07'); tool('ask');
    const ctx = contextFor(focusedPara() || `${currentPage()}-0`, quote);
    if (ERLY.companion && ERLY.companion.ask) ERLY.companion.ask(q, { context: ctx });
    else ERLY.emit && ERLY.emit('companion:help', { para: focusedPara() });
  }

  /* ---------------- highlights ---------------- */
  function addHighlight(s, color) {
    const idx = s.ws.map(w => +w.dataset.i).sort((a, b) => a - b);
    const from = idx[0], to = idx[idx.length - 1];
    const ns = notesOf();
    // merge with any highlight it overlaps
    const over = ns.filter(n => n.from <= to && n.to >= from);
    const n = { id: 'h' + Date.now().toString(36), from: Math.min(from, ...over.map(o => o.from)), to: Math.max(to, ...over.map(o => o.to)), color, note: over.map(o => o.note).filter(Boolean).join(' · '), page: +wordEls[from].closest('.spage').dataset.page, at: Date.now() };
    n.text = wordEls.slice(n.from, n.to + 1).map(w => w.dataset.raw).join(' ').replace(/\s+([.,;:!?)])/g, '$1');
    db.notes[DOC.id] = ns.filter(o => !over.includes(o)).concat(n);
    save(); applyHighlights(); renderSide(); tool('highlight');
    const last = wordEls[n.to]; if (last) { last.classList.add('hl-pop'); setTimeout(() => last.classList.remove('hl-pop'), 700); }
    if (sideTab !== 'notes' && notesOf().length === 1) toast(T('Highlighted — find it under Notes.', 'تم التمييز — تجده في الملاحظات.'));
    return n;
  }
  function applyHighlights() {
    $$('.w.hl', doc).forEach(w => { w.className = w.className.replace(/\s?hl(-\w+)?\b|\shas-note/g, ''); delete w.dataset.hl; });
    notesOf().forEach(n => {
      for (let i = n.from; i <= n.to && i < wordEls.length; i++) { const w = wordEls[i]; w.classList.add('hl', 'hl-' + n.color); w.dataset.hl = n.id; }
      if (n.note && wordEls[n.to]) wordEls[n.to].classList.add('has-note');
    });
  }
  function removeHighlight(id) { db.notes[DOC.id] = notesOf().filter(n => n.id !== id); save(); applyHighlights(); renderSide(); hideHlPop(); }
  const hlPop = $('#hlPop', root);
  function showHlPop(n, el, focusNote) {
    if (!n || !el) return;
    hlPop.innerHTML = `<div class="shl__colors">${HL.map(([c, nm]) => `<button class="ssel__c ssel__c--${c}${c === n.color ? ' is-on' : ''}" data-c="${c}" aria-label="${nm}"></button>`).join('')}</div>
      <label class="shl__note"><span>${T('Your note', 'ملاحظتك')}</span><textarea rows="3" maxlength="600" placeholder="${T('What does this mean to you?', 'ماذا يعني هذا لك؟')}">${esc(n.note || '')}</textarea></label>
      <div class="row-btns"><button class="btn btn--xs btn--accent" data-save>${T('Save', 'حفظ')}</button><button class="btn btn--xs btn--ghost" data-ask>${ICON('sparkle')} ${T('Ask Noor', 'اسأل نور')}</button><button class="btn btn--xs btn--quiet" data-del>${ICON('trash')} ${T('Remove', 'إزالة')}</button></div>`;
    placePop(hlPop, el.getBoundingClientRect());
    const ta = $('textarea', hlPop);
    if (focusNote) setTimeout(() => ta.focus(), 50);
    hlPop.onclick = e => {
      const c = e.target.closest('[data-c]');
      if (c) { n.color = c.dataset.c; save(); applyHighlights(); renderSide(); $$('[data-c]', hlPop).forEach(b => b.classList.toggle('is-on', b === c)); }
      if (e.target.closest('[data-save]')) { n.note = ta.value.trim(); save(); applyHighlights(); renderSide(); hideHlPop(); if (n.note) { tool('note'); toast(T('Note saved', 'تم حفظ الملاحظة')); } }
      if (e.target.closest('[data-del]')) removeHighlight(n.id);
      if (e.target.closest('[data-ask]')) { hideHlPop(); askNoor(T(`Explain this simply: “${n.text.slice(0, 600)}”`, `اشرح هذا ببساطة: «${n.text.slice(0, 600)}»`), n.text); }
    };
  }
  function hideHlPop() { hlPop.hidden = true; }
  function jumpToWord(i) {
    const w = wordEls[i]; if (!w) return;
    emit({ type: 'intent', why: 'jump' });
    w.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    const hl = $$(`.w[data-hl="${w.dataset.hl}"]`, doc);
    (hl.length ? hl : [w]).forEach(x => { x.classList.remove('flash'); void x.offsetWidth; x.classList.add('flash'); });
  }
  function exportNotes() {
    const ns = notesOf().slice().sort((a, b) => a.from - b.from), marks = marksOf().slice().sort((a, b) => a - b);
    const md = [`# ${T('My notes', 'ملاحظاتي')} — ${DOC.title}`, `${DOC.course}`, '', ...ns.map(n => `- **p. ${(DOC.startPage || 1) + n.page}** · “${n.text}”${n.note ? `\n  - ${n.note}` : ''}`), '', marks.length ? `## ${T('Bookmarks', 'العلامات')}\n` + marks.map(i => `- p. ${(DOC.startPage || 1) + i} — ${DOC.pages[i].h}`).join('\n') : '', '', `_${T('Exported from the ERLY Reading Studio', 'مُصدَّر من استوديو القراءة في إيرلي')}_`].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `notes-${DOC.title.replace(/\.(pdf|txt)$/i, '').replace(/[^\w-]+/g, '_')}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    tool('export');
  }

  /* ================= search ================= */
  const find = { hits: [], cur: -1, len: 0 };
  const norm = w => String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  function openFind(q) {
    const f = $('#stFind', root);
    f.hidden = false; requestAnimationFrame(() => f.classList.add('is-in'));
    const inp = $('#stFindQ', root);
    if (q) { inp.value = q; runFind(); }
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
    tool('search');
  }
  function closeFind() { const f = $('#stFind', root); f.classList.remove('is-in'); f.hidden = true; clearFind(); doc.focus({ preventScroll: true }); }
  function clearFind() { $$('.w.is-find', doc).forEach(w => w.classList.remove('is-find', 'is-find-cur')); find.hits = []; find.cur = -1; const n = $('#stFindN', root); if (n) n.textContent = '0/0'; }
  function runFind() {
    clearFind();
    const qws = $('#stFindQ', root).value.split(/\s+/).map(norm).filter(Boolean);
    if (!qws.length) return;
    for (let i = 0; i < wordEls.length; i++) {
      let ok = true;
      for (let j = 0; j < qws.length; j++) {
        const w = wordEls[i + j]; if (!w) { ok = false; break; }
        const n = norm(w.dataset.raw);
        if (j === qws.length - 1 ? !n.startsWith(qws[j]) : n !== qws[j]) { ok = false; break; }
      }
      if (ok) find.hits.push(i);
    }
    find.len = qws.length;
    find.hits.forEach(i => { for (let j = 0; j < find.len; j++) wordEls[i + j].classList.add('is-find'); });
    stepFind(1);
  }
  function stepFind(d) {
    const n = $('#stFindN', root);
    if (!find.hits.length) { n.textContent = '0/0'; $('#stFind', root).classList.toggle('is-none', !!$('#stFindQ', root).value.trim()); return; }
    $('#stFind', root).classList.remove('is-none');
    $$('.w.is-find-cur', doc).forEach(w => w.classList.remove('is-find-cur'));
    find.cur = (find.cur + d + find.hits.length) % find.hits.length;
    const i = find.hits[find.cur];
    for (let j = 0; j < find.len; j++) wordEls[i + j].classList.add('is-find-cur');
    emit({ type: 'intent', why: 'search' });
    wordEls[i].scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    n.textContent = `${find.cur + 1}/${find.hits.length}`;
  }
  let findT = null;
  $('#stFindQ', root).addEventListener('input', () => { clearTimeout(findT); findT = setTimeout(runFind, 180); });
  $('#stFindQ', root).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); } });
  $('#stFindP', root).addEventListener('click', () => stepFind(-1));
  $('#stFindNx', root).addEventListener('click', () => stepFind(1));
  $('#stFindX', root).addEventListener('click', closeFind);
  $('#stFindT', root).addEventListener('click', () => ($('#stFind', root).hidden ? openFind() : closeFind()));

  /* ================= study tools ================= */
  const pageText = pi => (DOC.pages[pi] ? DOC.pages[pi].paras.map(x => x.text.replace(/\[([^\]]+)\]/g, '$1')).join('\n\n') : '');
  const docText = () => DOC.pages.map((_, i) => pageText(i)).join('\n\n');
  const paraTerms = p => (p.text.match(/\[([^\]]+)\]/g) || []).map(x => termKey(x.slice(1, -1))).filter(Boolean);
  function pageTerms(pi) { const s = new Set(); DOC.pages[pi].paras.forEach(p => paraTerms(p).forEach(t => s.add(t))); return [...s]; }
  let deck = null, quizS = null;
  function renderStudy() {
    const body = $('#stStudyBody', root); if (!body) return;
    $$('[data-st]', root).forEach(b => b.setAttribute('aria-selected', b.dataset.st === studyTab));
    const pi = currentPage(), pg = DOC.pages[pi];
    const pgLbl = `<p class="sst__pg mono">${T('Page', 'الصفحة')} ${(DOC.startPage || 1) + pi} · ${esc(pg.h)}</p>`;
    if (studyTab === 'sum') {
      const prepared = !DOC.uploaded;
      const items = prepared ? pg.paras.map(p => p.sum || []) : pg.paras.filter(p => !p.sub).map(p => SX.summarize(p.text, 1)).filter(x => x.length);
      body.innerHTML = `${pgLbl}<div class="ssum">${items.map((list, i) => `<div class="ssum__b" style="--i:${i}"><span class="ssum__n">${i + 1}</span><ul>${list.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`).join('') || `<p class="muted">${T('Nothing to summarise on this page.', 'لا يوجد ما يُلخَّص في هذه الصفحة.')}</p>`}</div>
        <p class="sst__src">${prepared ? ICON('shield') + ' ' + T('Written by the course team for this reading.', 'كتبه فريق المادة لهذه القراءة.') : ICON('chip') + ' ' + T('Auto summary: key sentences picked from your file on this device.', 'ملخص تلقائي: جمل أساسية مختارة من ملفك على هذا الجهاز.')}</p>
        <div class="row-btns"><button class="btn btn--xs btn--ghost" data-sread>${ICON('volume')} ${T('Read summary', 'اقرأ الملخص')}</button><button class="btn btn--xs btn--accent" data-sask="sum">${ICON('sparkle')} ${T('Ask Noor to explain this page', 'اطلب من نور شرح الصفحة')}</button></div>`;
      track('O07'); tool('summary');
    } else if (studyTab === 'terms') {
      const ts = DOC.uploaded ? [] : pageTerms(pi);
      const keys = DOC.uploaded ? SX.keywords(pageText(pi), 10) : [];
      body.innerHTML = pgLbl + (ts.length ? `<div class="sterms">${ts.map((t, i) => `<button class="sterm" data-term-go="${esc(t)}" style="--i:${i}"><b>${esc(t)}</b><span>${esc(DOC.terms[t][0])}</span><small lang="ar" dir="rtl">${esc(DOC.terms[t][1])}</small></button>`).join('')}</div>`
        : keys.length ? `<p class="sst__src">${ICON('chip')} ${T('Key phrases found in this page — tap one to find it.', 'عبارات أساسية في هذه الصفحة — اضغط لإيجادها.')}</p><div class="skeys">${keys.map((k, i) => `<button data-find="${esc(k)}" style="--i:${i}">${esc(k)}</button>`).join('')}</div>`
          : `<p class="muted">${T('No key terms on this page.', 'لا مصطلحات أساسية في هذه الصفحة.')}</p>`);
      track('M03', 0); tool('glossary');
    } else if (studyTab === 'cards') {
      if (!deck || deck.doc !== DOC.id) { const cards = SX.cardsFrom(DOC.terms, docText(), 10); deck = { doc: DOC.id, cards, i: 0, known: 0, flipped: false }; }
      const c = deck.cards[deck.i];
      body.innerHTML = !deck.cards.length ? `<p class="muted">${T('Not enough text here to make flashcards.', 'لا يوجد نص كافٍ لصنع بطاقات.')}</p>`
        : deck.i >= deck.cards.length ? `<div class="sdone">${ICON('star')}<b>${T('Deck complete!', 'أنهيت المجموعة!')}</b><p>${T(`You knew ${deck.known} of ${deck.cards.length}.`, `عرفت ${deck.known} من ${deck.cards.length}.`)}</p><button class="btn btn--sm btn--accent" data-deck="again">${ICON('reset')} ${T('Shuffle & go again', 'اخلط وأعد')}</button></div>`
          : `<div class="sdeck__bar"><span class="mono">${deck.i + 1} / ${deck.cards.length}</span><span class="sdeck__prog"><i style="--p:${deck.i / deck.cards.length}"></i></span><button class="icon-btn icon-btn--sm" data-deck="shuffle" aria-label="${T('Shuffle', 'اخلط')}">${ICON('reset')}</button></div>
            <button class="sflip${deck.flipped ? ' is-flipped' : ''}" data-deck="flip" aria-label="${T('Flip card', 'اقلب البطاقة')}"><span class="sflip__in"><span class="sflip__f"><small>${T('Term', 'المصطلح')}</small><b>${esc(c.front)}</b><em>${T('Tap to flip', 'اضغط للقلب')}</em></span><span class="sflip__b"><small>${T('Meaning', 'المعنى')}</small><b>${esc(c.back)}</b>${c.ar ? `<i lang="ar" dir="rtl">${esc(c.ar)}</i>` : ''}</span></span></button>
            <div class="sdeck__acts"><button class="btn btn--sm btn--ghost" data-deck="again1">${ICON('reset')} ${T('Again', 'مجدداً')}</button><button class="btn btn--sm btn--accent" data-deck="know">${ICON('check')} ${T('Got it', 'عرفتها')}</button></div>`;
      tool('cards');
    } else if (studyTab === 'quiz') {
      if (!quizS || quizS.doc !== DOC.id) {
        const qs = DOC.uploaded ? SX.quizFrom(docText(), 6, 11) : DOC.pages.flatMap(p => p.paras.map(x => x.check).filter(Boolean));
        quizS = { doc: DOC.id, qs, i: 0, score: 0, answered: false };
      }
      const q = quizS.qs[quizS.i];
      body.innerHTML = !quizS.qs.length ? `<p class="muted">${T('Not enough text here for a quiz.', 'لا يوجد نص كافٍ لاختبار.')}</p>`
        : quizS.i >= quizS.qs.length ? `<div class="sdone">${ICON('star')}<b>${T('Quiz complete!', 'اكتمل الاختبار!')}</b><p>${T(`${quizS.score} of ${quizS.qs.length} right. Just for you — not saved or scored.`, `${quizS.score} من ${quizS.qs.length} صحيحة. لك فقط — لا يُحفظ ولا يُقيَّم.`)}</p><button class="btn btn--sm btn--accent" data-quiz="again">${ICON('reset')} ${T('Try again', 'حاول مجدداً')}</button></div>`
          : `<div class="sdeck__bar"><span class="mono">${T('Question', 'سؤال')} ${quizS.i + 1} / ${quizS.qs.length}</span><span class="sdeck__prog"><i style="--p:${quizS.i / quizS.qs.length}"></i></span><span class="mono">★ ${quizS.score}</span></div>
            <p class="squiz__q">${esc(q.q)}</p><div class="squiz__o">${q.opts.map((o, i) => `<button data-qo="${i}" style="--i:${i}"><span class="mono">${'ABC'[i]}</span>${esc(o)}</button>`).join('')}</div><div class="squiz__fb" id="stQfb" aria-live="polite"></div>`;
      tool('quiz');
    } else {
      const prompts = [
        ['sum', 'file', T('Explain this page simply', 'اشرح هذه الصفحة ببساطة')],
        ['exam', 'target', T('Give me 3 exam-style questions', 'أعطني ٣ أسئلة بأسلوب الامتحان')],
        ['map', 'layers', T('Make a mind map of this page', 'اصنع خريطة ذهنية لهذه الصفحة')],
        ['ar', 'translate', T('Explain this page in Arabic', 'اشرح هذه الصفحة بالعربية')],
        ['real', 'globe', T('Show a real-life example', 'أرني مثالاً من الحياة')],
        ['plan', 'calendar', T('Plan how to study this reading', 'خطط لمذاكرة هذه القراءة')]
      ];
      body.innerHTML = `${pgLbl}<div class="sask">${prompts.map(([k, ic, l], i) => `<button data-sask="${k}" style="--i:${i}">${ICON(ic)}<span>${l}</span></button>`).join('')}</div>
        <form class="sask__f" id="stAskF"><input id="stAskQ" maxlength="400" placeholder="${T('Ask anything about this reading…', 'اسأل أي شيء عن هذه القراءة…')}"><button class="btn btn--sm btn--accent" aria-label="${T('Ask', 'اسأل')}">${ICON('send')}</button></form>`;
      $('#stAskF', root).onsubmit = e => { e.preventDefault(); const v = $('#stAskQ', root).value.trim(); if (v) askNoor(v); };
    }
  }
  const ASK = {
    sum: () => T('Explain this page in simple words, then list the 3 most important ideas.', 'اشرح هذه الصفحة بكلمات بسيطة، ثم اذكر أهم ٣ أفكار.'),
    exam: () => T('Write 3 exam-style questions about this page, with short model answers.', 'اكتب ٣ أسئلة بأسلوب الامتحان عن هذه الصفحة مع إجابات نموذجية قصيرة.'),
    map: () => T('Make a mind map of this page as a nested bullet list.', 'اصنع خريطة ذهنية لهذه الصفحة على شكل قائمة متداخلة.'),
    ar: () => T('Explain this page in Arabic, keeping the key English terms in brackets.', 'اشرح هذه الصفحة بالعربية مع إبقاء المصطلحات الإنجليزية بين قوسين.'),
    real: () => T('Give me one real-life example that makes this page easy to understand.', 'أعطني مثالاً واحداً من الحياة يجعل هذه الصفحة سهلة الفهم.'),
    plan: () => T(`Make me a short study plan for this reading (${DOC.pages.length} pages) using spaced practice.`, `اصنع لي خطة مذاكرة قصيرة لهذه القراءة (${DOC.pages.length} صفحات) بالمذاكرة المتباعدة.`)
  };
  $('.sst__tabs', root).addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (!b) return; studyTab = b.dataset.st; renderStudy(); });
  $('#stStudyBody', root).addEventListener('click', e => {
    const a = e.target.closest('[data-sask]'); if (a) { askNoor(ASK[a.dataset.sask]()); return; }
    if (e.target.closest('[data-sread]')) { const items = $$('.ssum li', root).map(li => li.textContent).join(' '); say(items); track('H01'); return; }
    const tg = e.target.closest('[data-term-go]'); if (tg) { const el = $(`.term[data-term="${CSS.escape(tg.dataset.termGo)}"]`, doc); if (el) { emit({ type: 'intent', why: 'term' }); el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } return; }
    const fk = e.target.closest('[data-find]'); if (fk) { openFind(fk.dataset.find); return; }
    const d = e.target.closest('[data-deck]');
    if (d) {
      const k = d.dataset.deck;
      if (k === 'flip') { deck.flipped = !deck.flipped; d.classList.toggle('is-flipped', deck.flipped); return; }
      if (k === 'know' || k === 'again1') {
        if (k === 'know') deck.known++; else deck.cards.push(deck.cards[deck.i]);
        deck.i++; deck.flipped = false;
        if (deck.i >= deck.cards.length && window.FUN) { FUN.confetti($('#stStudyBody', root)); FUN.sfx.win(); } else if (k === 'know' && window.FUN) FUN.sfx.good();
      }
      if (k === 'shuffle' || k === 'again') { deck.cards = deck.cards.sort(() => Math.random() - 0.5); deck.i = 0; deck.known = 0; deck.flipped = false; }
      renderStudy();
      return;
    }
    const qo = e.target.closest('[data-qo]');
    if (qo && quizS && !quizS.answered) {
      const q = quizS.qs[quizS.i], ok = +qo.dataset.qo === q.a;
      quizS.answered = true;
      $$('[data-qo]', root).forEach(b => { b.disabled = true; if (+b.dataset.qo === q.a) b.classList.add('is-ok'); });
      if (!ok) qo.classList.add('is-no');
      if (ok) { quizS.score++; window.FUN && FUN.sfx.good(); window.FUN && FUN.confetti(qo, 12); } else window.FUN && FUN.sfx.soft();
      $('#stQfb', root).innerHTML = `<p class="${ok ? 'is-ok' : 'is-no'}"><b>${ok ? T('Correct!', 'صحيح!') : T('Not quite.', 'ليس تماماً.')}</b> ${esc(q.why)}</p><button class="btn btn--xs btn--accent" data-quiz="next">${T('Next', 'التالي')} →</button>`;
      if (!DOC.uploaded) track('Q02');
      return;
    }
    const qz = e.target.closest('[data-quiz]');
    if (qz) {
      if (qz.dataset.quiz === 'next') { quizS.i++; quizS.answered = false; if (quizS.i >= quizS.qs.length && window.FUN) { FUN.confetti($('#stStudyBody', root)); FUN.sfx.win(); } }
      if (qz.dataset.quiz === 'again') quizS = null;
      renderStudy();
    }
  });

  /* ================= focus timer ================= */
  const tm = { len: 25 * 60, left: 25 * 60, on: false, mode: 'focus', iv: null };
  function timerUI() {
    const el = $('#stTimer', root);
    $('#stTimerT', root).textContent = `${Math.floor(tm.left / 60)}:${String(tm.left % 60).padStart(2, '0')}`;
    $('#stTimerMode', root).textContent = tm.mode === 'focus' ? T('Focus', 'تركيز') : T('Break', 'استراحة');
    $('#stTimerArc', root).style.strokeDashoffset = (176 * (1 - tm.left / tm.len)).toFixed(2);
    $('#stTimerGo', root).innerHTML = ICON(tm.on ? 'pause' : 'play');
    el.classList.toggle('is-on', tm.on); el.classList.toggle('is-break', tm.mode === 'break');
  }
  function timerShow(on) { const el = $('#stTimer', root); el.hidden = !on; if (on) { requestAnimationFrame(() => el.classList.add('is-in')); timerUI(); tool('timer'); } else { el.classList.remove('is-in'); timerGo(false); } }
  function timerGo(on) {
    tm.on = on; clearInterval(tm.iv);
    if (on) tm.iv = setInterval(() => {
      if (--tm.left <= 0) {
        const wasFocus = tm.mode === 'focus';
        tm.mode = wasFocus ? 'break' : 'focus'; tm.len = tm.left = wasFocus ? 5 * 60 : 25 * 60;
        if (window.FUN) { FUN.sfx.win(); FUN.confetti($('#stTimer', root), 16); }
        toast(wasFocus ? T('Focus session done — take a 5-minute break. Stretch, drink water, look far away.', 'انتهت جلسة التركيز — خذ استراحة ٥ دقائق. تمدّد، واشرب الماء، وانظر بعيداً.') : T('Break over — ready for another focus round?', 'انتهت الاستراحة — مستعد لجولة تركيز أخرى؟'));
        if (wasFocus) track('P05');
      }
      timerUI();
    }, 1000);
    timerUI();
  }
  $('#stTimerGo', root).addEventListener('click', () => timerGo(!tm.on));
  $('#stTimerRs', root).addEventListener('click', () => { tm.left = tm.len; timerGo(false); });
  $('#stTimerX', root).addEventListener('click', () => timerShow(false));
  $('.stimer__presets', root).addEventListener('click', e => { const b = e.target.closest('[data-min]'); if (!b) return; tm.mode = 'focus'; tm.len = tm.left = +b.dataset.min * 60; $$('.stimer__presets button', root).forEach(x => x.classList.toggle('is-on', x === b)); timerGo(false); });

  /* ================= auto-scroll ================= */
  const auto = { on: false, raf: 0, speed: 3, acc: 0, intentAt: 0 };
  function autoLoop() {
    if (!auto.on) return;
    auto.acc += auto.speed * 0.22;
    if (auto.acc >= 1) { const px = Math.floor(auto.acc); auto.acc -= px; doc.scrollTop += px; }
    if (Date.now() - auto.intentAt > 900) { auto.intentAt = Date.now(); emit({ type: 'intent', why: 'auto-scroll' }); }
    if (doc.scrollTop + doc.clientHeight >= doc.scrollHeight - 2) return stopAuto();
    auto.raf = requestAnimationFrame(autoLoop);
  }
  function startAuto() { auto.on = true; $('#stAutoGo', root).innerHTML = ICON('pause'); $('#stAuto', root).classList.add('is-on'); auto.raf = requestAnimationFrame(autoLoop); tool('autoscroll'); }
  function stopAuto(soft) { if (!auto.on) return; auto.on = false; cancelAnimationFrame(auto.raf); $('#stAutoGo', root).innerHTML = ICON('play'); $('#stAuto', root).classList.remove('is-on'); if (soft) toast(T('Auto-scroll paused', 'توقف التمرير التلقائي')); }
  $('#stAutoGo', root).addEventListener('click', () => (auto.on ? stopAuto() : startAuto()));
  $('#stAutoV', root).addEventListener('input', e => { auto.speed = +e.target.value; });
  $('#stAutoX', root).addEventListener('click', () => { stopAuto(); $('#stAuto', root).hidden = true; });
  doc.addEventListener('touchstart', () => stopAuto(true), { passive: true });

  /* ================= immersive, full screen, menu, shortcuts ================= */
  function immersive(on) { root.classList.toggle('is-immersive', on); $('#stExit', root).hidden = !on; if (on) { tool('immersive'); toast(T('Immersive mode — press Esc or tap “Exit” to leave.', 'وضع الانغماس — اضغط Esc أو «خروج» للمغادرة.')); } setTimeout(indexLines, 400); }
  $('#stExit', root).addEventListener('click', () => immersive(false));
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (root.requestFullscreen) await root.requestFullscreen(); else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen(); else toast(T('Full screen isn’t available in this browser.', 'ملء الشاشة غير متاح في هذا المتصفح.')); }
    catch (e) { toast(T('Full screen isn’t available here.', 'ملء الشاشة غير متاح هنا.')); }
  }
  function renderMore() {
    const m = $('#stMore', root);
    const items = [
      ['timer', 'timer', T('Focus timer', 'مؤقت التركيز')],
      ['auto', 'scroll', T('Auto-scroll', 'التمرير التلقائي')],
      ['immersive', 'immersive', T('Immersive mode', 'وضع الانغماس')],
      ['full', 'fullscreen', T('Full screen', 'ملء الشاشة')],
      ...(DOC.pdf ? [['orig', 'file', root.classList.contains('is-original') ? T('Text view (tools on)', 'عرض النص (الأدوات مفعّلة)') : T('Original PDF pages', 'صفحات الملف الأصلية')]] : []),
      ['export', 'download', T('Export my notes', 'تصدير ملاحظاتي')],
      ['keys', 'keyboard', T('Keyboard shortcuts', 'اختصارات لوحة المفاتيح')],
      ['lib', 'grid', T('Open another reading', 'افتح قراءة أخرى')]
    ];
    m.innerHTML = items.map(([k, ic, l]) => `<button role="menuitem" data-more="${k}">${ICON(ic)}<span>${l}</span></button>`).join('');
  }
  function toggleMore(on) { const m = $('#stMore', root); on = on === undefined ? m.hidden : on; m.hidden = !on; $('#stMoreT', root).setAttribute('aria-expanded', on); if (on) requestAnimationFrame(() => m.classList.add('is-in')); else m.classList.remove('is-in'); }
  $('#stMoreT', root).addEventListener('click', e => { e.stopPropagation(); toggleMore(); });
  $('#stMore', root).addEventListener('click', e => {
    const b = e.target.closest('[data-more]'); if (!b) return;
    toggleMore(false);
    const k = b.dataset.more;
    if (k === 'timer') timerShow($('#stTimer', root).hidden);
    if (k === 'auto') { const a = $('#stAuto', root); a.hidden = !a.hidden; if (!a.hidden) startAuto(); else stopAuto(); }
    if (k === 'immersive') immersive(true);
    if (k === 'full') fullscreen();
    if (k === 'orig') setOriginal(!root.classList.contains('is-original'));
    if (k === 'export') { if (notesOf().length || marksOf().length) exportNotes(); else toast(T('No notes yet — select some text to highlight it first.', 'لا ملاحظات بعد — حدّد نصاً لتمييزه أولاً.')); }
    if (k === 'keys') shortcuts();
    if (k === 'lib') showLibrary();
  });
  function shortcuts() {
    const rows = [['/', T('Search', 'بحث')], ['B', T('Bookmark page', 'علامة الصفحة')], ['R', T('Read page aloud', 'قراءة الصفحة')], ['F', T('Line focus', 'تركيز السطر')], ['[ ]', T('Previous / next page', 'الصفحة السابقة / التالية')], ['+ −', T('Zoom', 'تكبير')], ['N', T('Notes', 'الملاحظات')], ['S', T('Study tools', 'أدوات المذاكرة')], ['T', T('Focus timer', 'مؤقت التركيز')], ['I', T('Immersive mode', 'وضع الانغماس')], ['L', T('Library', 'المكتبة')], ['Esc', T('Close / back', 'إغلاق / رجوع')]];
    pop.innerHTML = `<b>${T('Keyboard shortcuts', 'اختصارات لوحة المفاتيح')}</b><dl class="skeys-dl">${rows.map(([k, v]) => `<dt><kbd>${k}</kbd></dt><dd>${v}</dd>`).join('')}</dl><div class="row-btns"><button class="btn btn--xs btn--quiet" data-close-pop>${T('Close', 'إغلاق')}</button></div>`;
    placePop(pop, { left: innerWidth / 2, width: 0, top: 80, bottom: 80 });
    $('[data-close-pop]', pop).onclick = hidePop;
  }
  addEventListener('keydown', e => {
    if (root.hidden || e.altKey || e.metaKey) return;
    if ((e.ctrlKey && (e.key === 'f' || e.key === 'F'))) { e.preventDefault(); openFind(); return; }
    if (e.ctrlKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable], .cmp')) return;
    if (!$('#stLib', root).hidden) return;
    const k = e.key;
    const map = {
      '/': () => openFind(), b: toggleMark, B: toggleMark, r: () => $('#stRead', root).click(), R: () => $('#stRead', root).click(),
      f: () => { $('#stFocus', root).click(); }, '[': () => goPage(currentPage() - 1), ']': () => goPage(currentPage() + 1),
      '+': () => stepZoom(1), '=': () => stepZoom(1), '-': () => stepZoom(-1), n: () => { sideTab = 'notes'; root.classList.remove('hide-side'); root.classList.add('show-side'); renderSide(); },
      s: () => drawer(true, 'study'), t: () => timerShow($('#stTimer', root).hidden), i: () => immersive(!root.classList.contains('is-immersive')), l: showLibrary, '?': shortcuts
    };
    if (map[k]) { e.preventDefault(); map[k](); }
  });

  /* ================= line focus & re-read tracking ================= */
  let lines = [], focusLine = 0;
  function indexLines() {
    lines = [];
    if (root.hidden) return;
    const top0 = doc.getBoundingClientRect().top - doc.scrollTop;
    wordEls.forEach(w => {
      const top = w.getBoundingClientRect().top - top0;
      const Ln = lines[lines.length - 1];
      if (!Ln || Math.abs(top - Ln.top) > 6) lines.push({ top, h: w.offsetHeight, para: w.closest('.sp') && w.closest('.sp').dataset.p });
      w.dataset.line = lines.length - 1;
    });
    placeRuler();
  }
  function placeRuler(i) {
    const r = $('#stRuler', root); if (!r) return;
    if (!st.focus || !lines.length) { r.style.opacity = 0; return; }
    if (i != null) focusLine = Math.max(0, Math.min(lines.length - 1, i));
    const Ln = lines[focusLine];
    r.style.opacity = 1; r.style.top = (Ln.top - 7) + 'px'; r.style.height = (Ln.h + 14) + 'px';
  }
  const pstate = k => (P[k] = P[k] || { back: 0, regress: 0, secs: 0, offered: false, maxLine: -1 });
  let backT = null, busyPara = null;
  doc.addEventListener('pointermove', e => {
    const w = e.target.closest('.w'); if (!w) return;
    const ln = +w.dataset.line, sp = w.closest('.sp');
    if (st.focus) placeRuler(ln);
    if (!sp) return;
    busyPara = sp.dataset.p;
    const s = pstate(sp.dataset.p);
    if (ln > s.maxLine) { s.maxLine = ln; clearTimeout(backT); return; }
    if (ln < s.maxLine) { clearTimeout(backT); backT = setTimeout(() => { s.back++; s.maxLine = ln; track('V04'); check(sp.dataset.p); }, 450); }
  });
  doc.addEventListener('keydown', e => {
    if (!st.focus) return;
    if (e.key === 'ArrowDown') { placeRuler(focusLine + 1); e.preventDefault(); }
    if (e.key === 'ArrowUp') { placeRuler(focusLine - 1); e.preventDefault(); }
  });
  let sMode = 'down', sExt = 0, settleT = null, lastLeft = 0, progT = 0;
  doc.addEventListener('scroll', () => {
    const top = doc.scrollTop;
    if (firstScroll === null && openedAt) { firstScroll = (Date.now() - openedAt) / 1000; track('M09', +firstScroll.toFixed(0), 'set'); track('P07', +firstScroll.toFixed(0), 'set'); }
    if (sMode === 'down') { if (top > sExt) sExt = top; else if (top < sExt - 70) { sMode = 'up'; sExt = top; track('V01'); emit({ type: 'scrolldir', dir: 'up' }); const k = focusedPara(); if (k) { pstate(k).regress++; check(k); } } }
    else { if (top < sExt) sExt = top; else if (top > sExt + 70) { sMode = 'down'; sExt = top; emit({ type: 'scrolldir', dir: 'down' }); } }
    seenPages.add(currentPage());
    if (st.focus) placeRuler();
    if (Date.now() - progT > 120) { progT = Date.now(); progress(); }
    clearTimeout(settleT); settleT = setTimeout(settled, 220);
  }, { passive: true });
  // after scrolling settles: which section is in view, and any sideways pan
  function settled() {
    if (root.hidden) return;
    progress();
    const k = focusedPara();
    const f = $('#sfig', root), fr = f && f.getBoundingClientRect(), mid = doc.getBoundingClientRect().top + doc.clientHeight * 0.45;
    const onFig = !!(fr && fr.top < mid && fr.bottom > mid);
    if (k) emit({ type: 'section', key: k, index: PARA_KEYS.indexOf(k), figure: onFig, cause: reading || auto.on ? 'auto' : null });
    const dx = doc.scrollLeft - lastLeft;
    if (Math.abs(dx) >= 8) { emit({ type: 'pan', dx }); lastLeft = doc.scrollLeft; }
    clearTimeout(settled.save); settled.save = setTimeout(saveProgress, 1500);
  }
  function focusedPara() {
    if (root.classList.contains('is-original')) return null;
    const mid = doc.getBoundingClientRect().top + doc.clientHeight * 0.45;
    let best = null, dist = 1e9;
    $$('.sp', doc).forEach(p => { const r = p.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (d < dist) { dist = d; best = p.dataset.p; } });
    return best;
  }
  const paraOf = k => { const [a, b] = String(k).split('-').map(Number); const pg = DOC.pages[a] || DOC.pages[0]; return { pg: a, i: b, p: (pg.paras[b] || pg.paras[0]) }; };
  const wordsIn = k => paraOf(k).p.text.split(/\s+/).length;
  let sessionSecs = 0;
  setInterval(() => {
    if (root.hidden || document.hidden || !$('#stLib', root).hidden) return;
    sessionSecs++;
    if (sessionSecs % 60 === 0) track('P01', Math.round(sessionSecs / 60), 'set');
    const k = focusedPara(); if (!k) return;
    const s = pstate(k); s.secs++;
    const ratio = s.secs / (wordsIn(k) / (230 / 60));
    track('V05', +Math.max(ERLY.liveValue ? ERLY.liveValue('V05') : 0, ratio).toFixed(1), 'set');
    check(k);
  }, 1000);
  function check(k) {
    const s = pstate(k);
    const ratio = s.secs / (wordsIn(k) / (230 / 60));
    // Noticing is the companion's job, and it only checks in with consent,
    // after repeated returns compared with the student's own baseline.
    if (!s.offered && (s.back + s.regress >= 3 || ratio > 3.2)) s.offered = true;
  }

  /* ================= speaking short lines (voice tests, glossary, summaries) ================= */
  let talkingNow = false;
  function talking(on) { talkingNow = on; if (on && !viz.raf) viz.raf = requestAnimationFrame(vizLoop); }
  function say(text) {
    const plain = String(text).replace(/<[^>]+>/g, '').replace(/\s*—\s*/g, ', ').replace(/→/g, 'then').replace(/×/g, 'times');
    if (!('speechSynthesis' in window) || reading) return;
    speechSynthesis.cancel();
    const parts = plain.match(/[^.!?]+[.!?]*/g) || [plain];
    parts.forEach((p, i) => {
      const u = utter(p.trim().replace(/\bI am\b/g, "I'm").replace(/\bdo not\b/g, "don't"), Math.max(0.86, st.rate), Math.min(1.5, st.pitch + (i % 2 ? -.02 : .02)));
      u.onstart = () => talking(true);
      u.onboundary = e => { if (!e.name || e.name === 'word') vizWord(p.slice(e.charIndex).split(/\s/)[0] || 'a'); };
      u.onend = u.onerror = () => { if (i === parts.length - 1) talking(false); };
      speechSynthesis.speak(u);
    });
  }
  function spotlight(k) {
    $$('.sp.is-spot', root).forEach(x => x.classList.remove('is-spot'));
    const el = k && $(`.sp[data-p="${k}"]`, root);
    if (el) { emit({ type: 'intent', why: 'companion' }); el.classList.add('is-spot'); el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
  }
  function calm() {
    st.size = Math.max(st.size, 23); st.lh = Math.max(st.lh, 2.1); st.ls = Math.max(st.ls, .03); st.tint = 'cream'; st.font = 'lexend';
    syncControls(); track('V02'); track('V07'); tool('font'); apply();
  }
  function syncControls() {
    $('#stSize', root).value = st.size; $('#stLh', root).value = st.lh; $('#stLs', root).value = st.ls; $('#stWs', root).value = st.ws; $('#stW', root).value = st.width;
    $('#stFocus', root).checked = st.focus; $('#stAnch', root).checked = st.anchors;
    $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.font === st.font));
    $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.tint === st.tint));
  }
  // what Noor may read to answer a question about this reading (stays in the browser unless the student turned on cloud AI)
  function contextFor(k, quote) {
    const { pg } = paraOf(k || '0-0');
    return { title: DOC.title, course: DOC.course, page: (DOC.startPage || 1) + pg, heading: DOC.pages[pg].h, text: pageText(pg).slice(0, 3500), quote: quote ? String(quote).slice(0, 800) : '', uploaded: !!DOC.uploaded };
  }

  /* ================= the API the AI Reading Companion uses ================= */
  // Support tools run here, inside the reader, only when the student picks one.
  // Companion-made changes are marked so they never count as the student's own
  // format adjustments.
  const ACTIONS = {
    tts: k => { readParas([k || focusedPara()], Math.max(0.82, st.rate - 0.08)); },
    focus: k => { st.focus = true; syncControls(); apply(); track('V04'); tool('focus'); setTimeout(() => { const i = lines.findIndex(l => l.para === (k || focusedPara())); placeRuler(i >= 0 ? i : undefined); }, 320); },
    spacing: () => { st.lh = Math.max(st.lh, 2.1); st.ls = Math.max(st.ls, .04); st.ws = Math.max(st.ws, .15); syncControls(); track('V07'); tool('type'); apply(); },
    bigger: () => { st.size = Math.min(34, Math.max(st.size + 3, 22)); syncControls(); track('V02'); tool('type'); apply(); },
    zoom: () => { setZoom(Math.max(st.zoom, 1.25), { silent: true }); },
    unzoom: () => { setZoom(1, { silent: true }); },
    tint: () => { st.tint = st.tint === 'cream' ? 'blue' : 'cream'; syncControls(); track('V07'); tool('tint'); apply(); },
    narrow: () => { st.width = Math.min(st.width, 540); syncControls(); apply(); },
    font: () => { st.font = 'lexend'; syncControls(); track('V07'); tool('font'); apply(); },
    calm: () => calm(),
    break: () => { stopSpeech(); track('P05'); tool('breather'); },
    terms: () => { track('M03', 0); tool('glossary'); },
    summary: () => { track('O07'); tool('summary'); },
    diagram: () => { tool('diagram'); emit({ type: 'intent', why: 'companion' }); const f = $('#sfig', root); f && f.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); },
    quiz: () => { tool('quiz'); track('Q02'); },
    search: () => openFind(),
    study: k => { if (/^(sum|terms|cards|quiz|ask)$/.test(k || '')) studyTab = k; drawer(true, 'study'); },
    timer: () => timerShow(true),
    library: () => showLibrary()
  };
  ERLY.reader = {
    on(fn) { if (!listeners.includes(fn)) listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    root,
    get doc() { return DOC; },
    docs: () => LIB.map(d => ({ id: d.id, title: d.title, course: d.course, uploaded: !!d.uploaded })),
    openDoc(id) { const d = LIB.find(x => x.id === id); if (d) { docChosen = true; if (root.hidden) open(null, { doc: id }); else loadDoc(d); } },
    openLibrary: () => (root.hidden ? open(null, { library: true }) : showLibrary()),
    isOpen: () => !root.hidden,
    isReading: () => !!reading,
    currentPara: () => focusedPara(),
    currentPage: () => currentPage(),
    paraOf,
    paraLabel: k => { const { pg, i } = paraOf(k); return [`page ${pg + 1}, paragraph ${i + 1}`, `الصفحة ${pg + 1}، الفقرة ${i + 1}`]; },
    paraSummary: k => { const p = paraOf(k).p; return p.sum || SX.summarize(p.text, 3).slice(0, 3); },
    paraCheck: k => { const { pg, p } = paraOf(k); if (p.check) return p.check; const q = SX.quizFrom(p.text, 1, 5)[0] || SX.quizFrom(pageText(pg), 1, 5)[0]; return q || null; },
    termsIn: k => paraTerms(paraOf(k).p).map(t => [t, DOC.terms[t]]).filter(x => x[1]),
    hasFigure: () => !!DOC.fig,
    figSteps: () => (DOC.fig ? DOC.fig.steps : []),
    highlightFig: i => $$('#sfig [data-fs]', root).forEach(g => g.classList.toggle('is-hl', +g.dataset.fs === i)),
    spotlight,
    clearSpot: () => $$('.sp.is-spot', root).forEach(x => x.classList.remove('is-spot')),
    act(name, k) { const f = ACTIONS[name]; if (f) f(k); },
    stopReading: () => stopSpeech(),
    contextFor: k => contextFor(k || focusedPara()),
    find: q => openFind(q),
    format: () => ({ font: st.font, size: st.size, lh: st.lh, ls: st.ls, ws: st.ws, width: st.width, tint: st.tint, focus: st.focus, zoom: st.zoom }),
    applyPrefs(p) { Object.keys(p || {}).forEach(k => { if (k in st && typeof p[k] === typeof st[k]) st[k] = p[k]; }); syncControls(); anchorize(); applyHighlights(); apply(); placeRuler(); },
    // what this reader can and cannot measure
    availability: { regression: true, zoom: true, zoomNote: 'reader zoom and pinch-zoom; browser zoom (Ctrl +/−) cannot be measured', pan: true, panNote: 'only when the reader is zoomed in', format: true, tts: 'speechSynthesis' in window }
  };
  root.addEventListener('click', e => {
    const h = e.target.closest('[data-help]');
    if (h) { track('H07'); spotlight(h.dataset.help); ERLY.emit && ERLY.emit('companion:help', { para: h.dataset.help }); }
    if (e.target.closest('[data-fig]')) { track('H07'); ERLY.emit && ERLY.emit('companion:help', { figure: true }); }
  });

  I18N.onChange(() => { updateRec(); if (!root.hidden) { renderSide(); renderStudy(); renderMore(); if (!$('#stLib', root).hidden) renderLibrary(); } });
  ERLY.on && ERLY.on('track', updateRec);
  addEventListener('resize', () => { clearTimeout(indexLines.t); indexLines.t = setTimeout(indexLines, 250); });
  addEventListener('pagehide', saveProgress);
  renderDoc();
  apply();
})();
