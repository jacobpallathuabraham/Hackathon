/* ERLY — Handwriting Studio (v22): Practice · Scan & Analyze · Assess · History.

   Principles kept everywhere on this page:
   • Local first. Writing and photos are processed in this page. Nothing is uploaded. Attempts are kept only if the
     student chooses "Keep on this device"; otherwise everything disappears with the tab. Delete is always one tap.
   • The software's recognition errors are never shown as the student's errors. The student sees what the software
     read (with the engine's own confidence per word), corrects it, and only the CONFIRMED text is compared with a
     reference.
   • Only measurable presentation is reported (spacing, baseline, size, slant, line spacing — see hand-analysis.js),
     each with what it does not tell you. No scores, no grades, no diagnosis, no streaks.
   • Comparisons only between comparable attempts (same task type and the same prompt).
   • Noor is optional and is told plainly what it receives: text and numbers, never the image. */
(function () {
  'use strict';
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en), tt = a => (Array.isArray(a) ? T(a[0], a[1]) : a);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const HW = window.ERLY_HAND, A = () => ERLY.handAnalysis, OCR = () => ERLY.handOCR, INK = () => ERLY.ink22;
  const KEY = 'erly-hand-v22';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');

  /* ---------- storage (only with consent) ---------- */
  let mem = { consent: null, attempts: [], goals: [], draft: null, prefs: {} };
  try { const raw = localStorage.getItem(KEY); if (raw) mem = Object.assign(mem, JSON.parse(raw)); } catch (e) { /* blocked */ }
  const save = () => { if (mem.consent !== 'device') return; try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { toast(T('Could not save on this device (storage full or blocked).', 'تعذر الحفظ.')); } };
  function setConsent(c) { mem.consent = c; if (c === 'device') save(); else { try { localStorage.removeItem(KEY); } catch (e) { /* none */ } } }
  function deleteAll() { const c = mem.consent; mem = { consent: c, attempts: [], goals: [], draft: null, prefs: {} }; try { localStorage.removeItem(KEY); } catch (e) { /* none */ } if (c === 'device') save(); }

  /* ---------- content ---------- */
  const LIB = {
    en: {
      letters: ['a b c d e f g h i j k l m', 'n o p q r s t u v w x y z', 'A B C D E F G H I J K L M', 'N O P Q R S T U V W X Y Z'],
      combos: ['th sh ch wh ph', 'ing ed er ly tion', 'oo ee ll ss tt', 'br cl dr fl gr st'],
      words: ['because friend quietly', 'library minute important', 'rhythm necessary separate'],
      sentences: HW.PROMPTS.en.flat().concat(['Sphinx of black quartz, judge my vow.']),
      paragraphs: ['Rain fell softly over the quiet city. The streets shone under the lamps, and the last bus waited at the corner.'],
      spacing: ['one two three four five six', 'a big red bus came by', 'cats nap in the sun'],
      alignment: ['level lines stay level', 'write along the line', 'steady steps to the end']
    },
    ar: {
      letters: ['ا ب ت ث ج ح خ', 'د ذ ر ز س ش ص', 'ض ط ظ ع غ ف ق', 'ك ل م ن ه و ي'],
      combos: ['لا بـ تـ سـ', 'مـ نـ يـ هـ'],
      words: ['كتاب مدرسة قلم', 'صديق مكتبة علم'],
      sentences: HW.PROMPTS.ar.flat().concat(['العلم نور.', 'القراءة تفتح أبواب المعرفة.']),
      paragraphs: ['هطل المطر بهدوء على المدينة. لمعت الشوارع تحت المصابيح.'],
      spacing: ['واحد اثنان ثلاثة أربعة', 'قلم ورقة كتاب'],
      alignment: ['الأسطر المستقيمة تبقى مستقيمة']
    }
  };
  const CATS = [['letters', 'Letters', 'الحروف'], ['combos', 'Combinations', 'تراكيب'], ['words', 'Words', 'كلمات'], ['sentences', 'Sentences', 'جمل'], ['paragraphs', 'Paragraphs', 'فقرات'], ['spacing', 'Spacing drill', 'تمرين المسافات'], ['alignment', 'Alignment drill', 'تمرين المحاذاة'], ['free', 'Free page', 'صفحة حرة']];
  const ASSESS = {
    copy: { icon: '✎', en: 'Copy text', ar: 'نسخ نص', desc: ['Copy a short passage. The confirmed text is compared with it.', 'انسخ مقطعاً قصيراً.'], ref: true },
    free: { icon: '¶', en: 'Free writing', ar: 'كتابة حرة', desc: ['Write a few sentences on a topic. Only presentation is measured.', 'اكتب جملاً عن موضوع.'], ref: false },
    letters: { icon: 'Aa', en: 'Letter & word practice', ar: 'حروف وكلمات', desc: ['Write the letters or words shown.', 'اكتب الحروف أو الكلمات.'], ref: true },
    sentence: { icon: '“”', en: 'Sentence writing', ar: 'كتابة جملة', desc: ['Write your own sentence that uses a given word.', 'اكتب جملة تستخدم كلمة معينة.'], ref: false },
    timed: { icon: '⏱', en: 'Timed writing (optional timer)', ar: 'كتابة مؤقتة', desc: ['Copy a passage with a timer you choose. Words per minute are counted from the text you confirm.', 'انسخ مقطعاً مع مؤقت تختاره.'], ref: true },
    photo: { icon: '📷', en: 'Photograph submission', ar: 'تقديم صورة', desc: ['Write on paper, then add a photo of it.', 'اكتب على الورق ثم أضف صورة.'], ref: true }
  };
  const FREE_TOPICS = { en: ['Describe a place you like to study.', 'What did you learn this week?', 'Explain how to make your favourite drink.'], ar: ['صف مكاناً تحب الدراسة فيه.', 'ماذا تعلمت هذا الأسبوع؟'] };
  const SENT_WORDS = { en: ['because', 'although', 'before', 'carefully'], ar: ['لأن', 'قبل', 'بعناية'] };

  const S = { mode: 'practice', lang: 'en', ink: mem.prefs.ink || 'classic', size: mem.prefs.size || 3.2, color: mem.prefs.color || '#1c1b19', paper: mem.prefs.paper || 'lined', guide: false, trace: false, reveal: mem.prefs.reveal !== false, cat: 'sentences', item: 0, engine: null, pages: [], page: 0, as: null };
  let surf = null, root = null;
  const toast = m => { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 2600); };
  const prefs = () => { mem.prefs = { ink: S.ink, size: S.size, color: S.color, paper: S.paper, reveal: S.reveal }; save(); };
  const rtl = () => S.lang === 'ar';

  /* ================= shell ================= */
  function shell() {
    root.innerHTML = `<header class="hx-head"><div><p class="hx-k">${T('Handwriting Studio', 'استوديو الكتابة اليدوية')}</p><h1 class="hx-title">${T('Write, read back, and see what you can measure.', 'اكتب واقرأ وقِس ما يمكن قياسه.')}</h1>
        <p class="hx-lead">${T('Practise on screen with real ink, scan pages you wrote on paper, or take a short assessment. Recognition and analysis run on this device; nothing is uploaded.', 'تدرّب على الشاشة أو امسح صفحاتك أو خذ تقييماً قصيراً. كل شيء على هذا الجهاز.')}</p></div>
        <div class="hx-head__side"><div class="hx-seg" role="radiogroup" aria-label="${T('Language', 'اللغة')}"><button type="button" role="radio" data-lang="en" aria-checked="${S.lang === 'en'}">English</button><button type="button" role="radio" data-lang="ar" aria-checked="${S.lang === 'ar'}">العربية <small>${T('experimental', 'تجريبي')}</small></button></div>
        <p class="hx-priv"><span aria-hidden="true">🔒</span> ${mem.consent === 'device' ? T('Attempts you save stay on this device.', 'المحاولات المحفوظة تبقى على هذا الجهاز.') : T('Nothing is kept after you close this tab.', 'لا يُحفظ شيء بعد إغلاق التبويب.')} <a href="#history" data-mode-link="history">${T('Privacy', 'الخصوصية')}</a></p></div></header>
      <nav class="hx-tabs" role="tablist" aria-label="${T('Modes', 'الأوضاع')}">${[['practice', 'Practice', 'تدرّب'], ['scan', 'Scan & Analyze', 'امسح وحلّل'], ['assess', 'Assess', 'تقييم'], ['history', 'History', 'السجل']].map(([k, en, ar]) => `<button type="button" role="tab" id="hxTab-${k}" aria-controls="hxPanel" aria-selected="${S.mode === k}" data-mode="${k}" tabindex="${S.mode === k ? 0 : -1}">${T(en, ar)}</button>`).join('')}</nav>
      <section id="hxPanel" class="hx-panel" role="tabpanel" aria-labelledby="hxTab-${S.mode}" tabindex="-1"></section>`;
    mode(S.mode, true);
  }
  function mode(m, first) {
    if (surf) { surf.destroy(); surf = null; }
    S.mode = m; $$('.hx-tabs [role=tab]', root).forEach(b => { const on = b.dataset.mode === m; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    const P = $('#hxPanel', root); P.setAttribute('aria-labelledby', 'hxTab-' + m);
    ({ practice, scan, assess, history: historyMode })[m](P);
    if (!first) history_replace(m);
  }
  const history_replace = m => { try { window.history.replaceState(null, '', '#' + m); } catch (e) { /* ok */ } };

  /* ================= the toolbar shared by Practice and Assess ================= */
  function inkPreview(kind) {
    const c = document.createElement('canvas'); c.width = 120; c.height = 36; const x = c.getContext('2d'), pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([8 + t * 104, 18 + Math.sin(t * Math.PI * 2.2) * 10, 0, t * (kind === 'signature' ? 300 : 900)]); }
    INK().draw(x, { pts, size: 3.4, ink: kind, color: getComputedStyle(document.body).color || '#222' }, { cache: false }); return c.toDataURL();
  }
  function toolbar(o) {
    o = o || {};
    return `<div class="hx-tools" role="toolbar" aria-label="${T('Writing tools', 'أدوات الكتابة')}">
      <div class="hx-tools__g" role="radiogroup" aria-label="${T('Ink', 'الحبر')}">${Object.entries(INK().PERSONALITIES).map(([k, P]) => `<button type="button" role="radio" class="hx-ink" data-ink="${k}" aria-checked="${S.ink === k}" title="${esc(tt(P.desc))}"><img alt="" src="${inkPreview(k)}"><span>${esc(tt(P.label))}</span></button>`).join('')}</div>
      <div class="hx-tools__g"><label class="hx-mini">${T('Size', 'الحجم')} <input type="range" min="1.6" max="7" step="0.2" value="${S.size}" data-size></label>
        <span class="hx-sw" role="radiogroup" aria-label="${T('Colour', 'اللون')}">${[['#1c1b19', T('Ink black', 'أسود')], ['#1f3a8a', T('Blue-black', 'أزرق داكن')], ['#6b3e1f', T('Sepia', 'بني')]].map(([c, n]) => `<button type="button" role="radio" aria-checked="${S.color === c}" data-color="${c}" aria-label="${n}" style="--c:${c}"></button>`).join('')}</span></div>
      <div class="hx-tools__g"><button type="button" class="hx-tb" data-tool="pen" aria-pressed="true">${T('Pen', 'قلم')}</button><button type="button" class="hx-tb" data-tool="eraser" aria-pressed="false" title="${T('Removes whole strokes', 'يحذف خطوطاً كاملة')}">${T('Eraser', 'ممحاة')}</button><button type="button" class="hx-tb" data-a="undo" disabled>${T('Undo', 'تراجع')}</button><button type="button" class="hx-tb" data-a="redo" disabled>${T('Redo', 'إعادة')}</button><button type="button" class="hx-tb" data-a="clear">${T('Clear', 'امسح')}</button></div>
      ${o.full ? `<div class="hx-tools__g"><label class="hx-mini">${T('Paper', 'الورق')} <select data-paper>${[['white', 'Clean white', 'أبيض'], ['warm', 'Warm paper', 'ورق دافئ'], ['lined', 'Lined', 'مسطّر'], ['grid', 'Grid', 'مربعات'], ['guides', 'Handwriting guides', 'خطوط إرشاد']].map(([k, en, ar]) => `<option value="${k}" ${S.paper === k ? 'selected' : ''}>${T(en, ar)}</option>`).join('')}</select></label>
        <label class="hx-chk"><input type="checkbox" data-trace ${S.trace ? 'checked' : ''}> ${T('Tracing', 'تتبّع')}</label><label class="hx-chk"><input type="checkbox" data-reveal ${S.reveal ? 'checked' : ''}> ${T('Ink settles (effect)', 'تأثير الحبر')}</label>
        <button type="button" class="hx-tb" data-a="zoomout" aria-label="${T('Zoom out', 'تصغير')}">−</button><button type="button" class="hx-tb" data-a="zoomin" aria-label="${T('Zoom in', 'تكبير')}">+</button><button type="button" class="hx-tb" data-a="full">${T('Full screen', 'ملء الشاشة')}</button></div>` : ''}
    </div>`;
  }
  function mountSurface(host, extra) {
    surf = ERLY.handSurface.create(host, Object.assign({ ink: S.ink, size: S.size, color: S.color, paper: S.paper, reveal: S.reveal, dir: rtl() ? 'rtl' : 'ltr', onChange: syncTools }, extra || {}));
    return surf;
  }
  function syncTools() {
    if (!surf || !root) return;
    const u = $('[data-a="undo"]', root), r = $('[data-a="redo"]', root); if (u) u.disabled = !surf.canUndo(); if (r) r.disabled = !surf.canRedo();
    $$('[data-needs-ink]', root).forEach(b => { b.disabled = surf.isEmpty(); });
  }
  function toolClick(e) {
    const ink = e.target.closest('[data-ink]'); if (ink && surf) { S.ink = ink.dataset.ink; surf.set('ink', S.ink); $$('[data-ink]', root).forEach(b => b.setAttribute('aria-checked', b === ink)); prefs(); return true; }
    const col = e.target.closest('[data-color]'); if (col && surf) { S.color = col.dataset.color; surf.set('color', S.color); $$('[data-color]', root).forEach(b => b.setAttribute('aria-checked', b === col)); prefs(); return true; }
    const tl = e.target.closest('[data-tool]'); if (tl && surf) { surf.set('tool', tl.dataset.tool); $$('[data-tool]', root).forEach(b => b.setAttribute('aria-pressed', b === tl)); return true; }
    const a = e.target.closest('[data-a]'); if (!a || !surf) return false;
    const k = a.dataset.a;
    if (k === 'undo') surf.undo(); else if (k === 'redo') surf.redo(); else if (k === 'zoomin') surf.zoomIn(); else if (k === 'zoomout') surf.zoomOut(); else if (k === 'full') surf.fullscreen();
    else if (k === 'clear') { if (surf.isEmpty()) return true; if (confirm(T('Clear the whole page? You can still undo it.', 'مسح الصفحة كلها؟ يمكنك التراجع.'))) surf.clear(); }
    else return false;
    return true;
  }
  function toolInput(e) {
    if (!surf) return;
    if (e.target.matches('[data-size]')) { S.size = +e.target.value; surf.set('size', S.size); prefs(); }
    if (e.target.matches('[data-paper]')) { S.paper = e.target.value; surf.set('paper', S.paper); surf.set('guide', S.paper === 'guides'); prefs(); }
    if (e.target.matches('[data-trace]')) { S.trace = e.target.checked; surf.set('trace', S.trace ? currentText() : ''); }
    if (e.target.matches('[data-reveal]')) { S.reveal = e.target.checked; surf.set('reveal', S.reveal); prefs(); }
  }

  /* ================= PRACTICE ================= */
  const lib = () => LIB[S.lang];
  const currentText = () => (S.cat === 'free' ? '' : (lib()[S.cat] || [])[S.item] || '');
  function practice(P) {
    P.innerHTML = `<div class="hx-prac"><aside class="hx-lib" aria-label="${T('Practice library', 'مكتبة التدريب')}"><h2 class="hx-h2">${T('Practice library', 'مكتبة التدريب')}</h2>
        <ul class="hx-cats">${CATS.map(([k, en, ar]) => `<li><button type="button" data-cat="${k}" aria-pressed="${S.cat === k}">${T(en, ar)}</button></li>`).join('')}</ul>
        <div class="hx-items"></div>${goalsHTML()}</aside>
      <div class="hx-main"><div class="hx-prompt" dir="${rtl() ? 'rtl' : 'ltr'}" aria-live="polite"></div>${toolbar({ full: true })}<div class="hx-surfacewrap"><div class="hx-surface"></div></div>
        <div class="hx-actions"><button type="button" class="btn btn--accent" data-act="analyse" data-needs-ink disabled>${T('Check my presentation', 'افحص طريقة الكتابة')}</button><button type="button" class="btn" data-act="readback" data-needs-ink disabled>${T('Read it back (recognition)', 'اقرأها (التعرّف)')}</button>
          <button type="button" class="btn btn--ghost" data-act="png" data-needs-ink disabled>${T('Export PNG', 'تصدير PNG')}</button><button type="button" class="btn btn--ghost" data-act="pngclean" data-needs-ink disabled>${T('Export clean PNG', 'تصدير نسخة نظيفة')}</button>
          <button type="button" class="btn btn--ghost" data-act="draft" data-needs-ink disabled>${T('Save page', 'احفظ الصفحة')}</button>${mem.draft ? `<button type="button" class="btn btn--ghost" data-act="resume">${T('Resume saved page', 'استأنف الصفحة المحفوظة')}</button>` : ''}</div>
        <div class="hx-out" aria-live="polite"></div></div></div>`;
    mountSurface($('.hx-surface', P), { guide: S.paper === 'guides' });
    items(P); syncTools();
  }
  function items(P) {
    const list = S.cat === 'free' ? [] : lib()[S.cat] || [];
    $('.hx-items', P).innerHTML = list.length ? `<ol>${list.map((t, i) => `<li><button type="button" data-item="${i}" aria-pressed="${S.item === i}" dir="${rtl() ? 'rtl' : 'ltr'}">${esc(t)}</button></li>`).join('')}</ol>` : `<p class="hx-muted">${T('A blank page: write anything.', 'صفحة فارغة: اكتب أي شيء.')}</p>`;
    const t = currentText(), cat = CATS.find(c => c[0] === S.cat);
    $('.hx-prompt', P).innerHTML = t ? `<span class="hx-k">${T(cat[1], cat[2])}</span><p class="hx-copy">${esc(t)}</p>${S.cat === 'spacing' ? `<p class="hx-muted">${T('Leave about the width of an “o” between words.', 'اترك عرض حرف بين الكلمات.')}</p>` : S.cat === 'alignment' ? `<p class="hx-muted">${T('Keep the bottoms of the letters on the line.', 'أبقِ أسفل الحروف على السطر.')}</p>` : ''}` : `<span class="hx-k">${T('Free page', 'صفحة حرة')}</span>`;
    if (surf) surf.set('trace', S.trace ? t : '');
  }
  function goalsHTML() {
    const G = mem.goals || [];
    return `<section class="hx-goals"><h3 class="hx-h3">${T('My goals', 'أهدافي')}</h3>${G.length ? `<ul>${G.map((g, i) => `<li><span>${esc(g.text)}</span><small>${g.done}/${g.target}</small><button type="button" class="hx-x" data-delgoal="${i}" aria-label="${T('Remove goal', 'أزل الهدف')}">×</button></li>`).join('')}</ul>` : `<p class="hx-muted">${T('No goals yet. A suggestion can become a goal. Goals count practice sessions — there is no streak to keep.', 'لا أهداف بعد. لا يوجد تسلسل أيام للحفاظ عليه.')}</p>`}</section>`;
  }
  function bumpGoal(drill) { (mem.goals || []).forEach(g => { if (g.drill === drill && g.done < g.target) g.done++; }); save(); }
  function analysisHTML(res, sugg) {
    if (!res.enough) return `<p class="hx-note">${T('Write a little more (at least a few words) so there is something to measure.', 'اكتب أكثر قليلاً ليكون هناك ما يُقاس.')}</p>`;
    return `<h3 class="hx-h3">${T('What can be measured', 'ما يمكن قياسه')}</h3><p class="hx-muted">${res.lines} ${T('line(s)', 'سطر')} · ${res.words} ${T('word groups', 'مجموعات كلمات')}${res.time ? ` · ${Math.round(res.time / 1000)} s ${T('of writing', 'من الكتابة')}` : ''}. ${T('These are measurements of layout, not marks.', 'هذه قياسات للتنسيق وليست درجات.')}</p>
      <dl class="hx-metrics">${res.metrics.map(m => `<div class="${m.enough ? '' : 'is-thin'}"><dt>${esc(tt(m.label))}</dt><dd>${m.enough ? esc(m.display) : T('Not enough writing to measure this.', 'لا يكفي للقياس.')}<details><summary>${T('How it is measured', 'كيف يُقاس')}</summary><p>${esc(m.what)}</p><p><b>${T('It does not tell you:', 'لا يخبرك:')}</b> ${esc(m.notWhat)}</p></details></dd></div>`).join('')}</dl>
      ${sugg.length ? `<h3 class="hx-h3">${T('Suggestions from these measurements', 'اقتراحات من هذه القياسات')}</h3><ul class="hx-sugg">${sugg.map(s => `<li><b>${esc(tt(s.text))}</b><p class="hx-muted">${esc(s.why)}</p><p>${esc(tt(s.try))}</p><p><button type="button" class="btn btn--sm" data-drill="${s.drill}">${T('Open the drill', 'افتح التمرين')}</button> <button type="button" class="btn btn--sm btn--ghost" data-goal="${s.drill}" data-goaltext="${esc(tt(s.try))}">${T('Make it a goal (3 sessions)', 'اجعله هدفاً (٣ جلسات)')}</button></p></li>`).join('')}</ul>` : `<p class="hx-good">${T('Nothing in these measurements stands out. Keep writing the way that feels comfortable.', 'لا شيء لافت في هذه القياسات.')}</p>`}`;
  }

  /* ================= recognition (shared) ================= */
  async function ensureEngine(lang) {
    if (lang !== 'en') return 'tesseract';
    const E = OCR().ENGINES.trocr;
    if (E.ready()) return S.engine || 'trocr';
    if (S.engine === 'tesseract') return 'tesseract';
    return new Promise(res => {
      const d = dialog(`<h2 id="hxDlgT">${T('Which reader should read your writing?', 'أي قارئ تريد؟')}</h2>
        <p>${T('Both run on this device and never send your writing anywhere.', 'كلاهما على هذا الجهاز ولا يرسلان كتابتك.')}</p>
        <ul class="hx-eng"><li><b>${T('Handwriting model (TrOCR)', 'نموذج الكتابة اليدوية')}</b> — ${T('much better on handwriting (15% character error on real handwritten lines in our benchmark). Needs a one-time download of about 64 MB of model files from Hugging Face; your writing is not sent there.', 'أفضل بكثير، يحتاج تنزيلاً لمرة واحدة (٦٤ ميغابايت).')}</li><li><b>${T('Quick reader (Tesseract)', 'القارئ السريع')}</b> — ${T('already here, but made for printed text (50% character error on the same lines).', 'موجود لكنه مصمم للنص المطبوع.')}</li></ul>
        <div class="hx-row"><button type="button" class="btn btn--accent" data-e="trocr">${T('Download the handwriting model', 'نزّل النموذج')}</button><button type="button" class="btn" data-e="tesseract">${T('Use the quick reader', 'استخدم القارئ السريع')}</button><button type="button" class="btn btn--ghost" data-e="none">${T('Skip recognition', 'تخطَّ التعرّف')}</button></div><p class="hx-dl" hidden><span class="hx-bar"><i></i></span> <span data-pct>0%</span></p>`, { onClose: v => res(v || 'none') });
      d.el.addEventListener('click', async e => {
        const b = e.target.closest('[data-e]'); if (!b) return;
        if (b.dataset.e !== 'trocr') { S.engine = b.dataset.e === 'tesseract' ? 'tesseract' : null; d.close(b.dataset.e); return; }
        $$('[data-e]', d.el).forEach(x => { x.disabled = true; }); b.setAttribute('aria-busy', 'true'); $('.hx-dl', d.el).hidden = false;
        try { await E.load(p => { $('.hx-bar i', d.el).style.width = Math.round(p * 100) + '%'; $('[data-pct]', d.el).textContent = Math.round(p * 100) + '%'; }); S.engine = 'trocr'; d.close('trocr'); }
        catch (er) { $('.hx-dl', d.el).innerHTML = `<span class="hx-err">${T('The download failed (no connection, or blocked). You can use the quick reader instead.', 'فشل التنزيل. يمكنك استخدام القارئ السريع.')}</span>`; $$('[data-e]', d.el).forEach(x => { x.disabled = false; }); b.removeAttribute('aria-busy'); }
      });
    });
  }
  async function read(canvas, lang, host) {
    const eng = await ensureEngine(lang); if (eng === 'none') return null;
    host.innerHTML = `<p class="hx-busy" role="status"><span class="hx-spin" aria-hidden="true"></span>${T('Reading… this stays on your device.', 'أقرأ… يبقى على جهازك.')} <span class="hx-bar"><i></i></span></p>`;
    try { return await OCR().recognize(canvas, { lang, engine: eng, deskew: true, onProgress: p => { const i = $('.hx-bar i', host); if (i) i.style.width = Math.round(p * 100) + '%'; } }); }
    catch (e) { console.error(e); host.innerHTML = `<p class="hx-err" role="alert">${T('The reader could not run on this device. Your writing is still here.', 'تعذر تشغيل القارئ. كتابتك ما زالت هنا.')}</p>`; return null; }
  }
  function readHTML(r, lang) {
    const name = tt(OCR().ENGINES[r.engine].label);
    return `<div class="hx-read"><h3 class="hx-h3">${T('What the software read', 'ما قرأه البرنامج')}</h3>
      <p class="hx-muted">${esc(name)} · ${T('average confidence', 'متوسط الثقة')} ${r.conf}% (${T('the software’s own estimate', 'تقدير البرنامج نفسه')}) · ${r.ms} ms</p>
      <p class="hx-words" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${r.words.length ? r.words.map(w => `<span class="hx-w hx-w--${OCR().flag(w.conf)}" title="${T('Software confidence', 'ثقة البرنامج')}: ${w.conf}%">${esc(w.text)}</span>`).join(' ') : `<span class="hx-muted">${T('(nothing recognised)', '(لم يُتعرّف على شيء)')}</span>`}</p>
      <p class="hx-legend"><span class="hx-w hx-w--ok">${T('sure', 'متأكد')}</span> <span class="hx-w hx-w--uncertain">${T('uncertain', 'غير متأكد')}</span> <span class="hx-w hx-w--low">${T('low confidence', 'ثقة منخفضة')}</span> — ${T('this is how sure the SOFTWARE is, not a judgement of your writing.', 'هذا مدى تأكد البرنامج لا حكم على كتابتك.')}</p>
      ${(r.lines || []).some(l => l.suspect) ? `<p class="hx-note">${T('One line looks like a known failure of the model (it repeated itself). Its text is not trusted.', 'سطر يبدو خطأً معروفاً للنموذج.')}</p>` : ''}
      <label class="hx-field">${T('Correct anything it got wrong — its mistakes are not your mistakes', 'صحّح أخطاءه — أخطاؤه ليست أخطاءك')}<textarea rows="3" data-confirmed dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${esc(r.text)}</textarea></label></div>`;
  }

  /* ================= SCAN & ANALYZE ================= */
  const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  function scan(P) {
    P.innerHTML = `<div class="hx-scan"><div class="hx-drop" tabindex="0" role="button" aria-label="${T('Add photos of your writing: drop them here or choose files', 'أضف صوراً لكتابتك')}"><p><b>${T('Drop photos of your pages here', 'أفلت صور صفحاتك هنا')}</b></p><p class="hx-muted">${T('JPEG, PNG or WebP · several pages at once · read on this device, never uploaded', 'JPEG أو PNG أو WebP · على هذا الجهاز')}</p>
        <p class="hx-row"><label class="btn">${T('Choose photos', 'اختر صوراً')}<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-files hidden></label><label class="btn btn--ghost">${T('Use the camera', 'استخدم الكاميرا')}<input type="file" accept="image/*" capture="environment" data-files hidden></label></p></div>
      <div class="hx-pages"></div><div class="hx-editor"></div><div class="hx-out" aria-live="polite"></div></div>`;
    const dz = $('.hx-drop', P);
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('is-over'); }); dz.addEventListener('dragleave', () => dz.classList.remove('is-over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('is-over'); addFiles([...e.dataTransfer.files]); });
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('[data-files]', dz).click(); } });
    P.addEventListener('change', e => { if (e.target.matches('[data-files]')) { addFiles([...e.target.files]); e.target.value = ''; } });
    pagesUI();
  }
  async function addFiles(files) {
    const bad = files.filter(f => !TYPES.includes(f.type) && !/\.(jpe?g|png|webp)$/i.test(f.name)); if (bad.length) toast(T('Only JPEG, PNG and WebP images can be read here.', 'يُقبل JPEG وPNG وWebP فقط.'));
    for (const f of files.filter(f => !bad.includes(f))) {
      try { const img = await loadImage(f); const c = document.createElement('canvas'), k = Math.min(1, 2400 / Math.max(img.width, img.height)); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); S.pages.push({ name: f.name, orig: c, rot: 0, fine: 0, crop: null, bright: 0, contrast: 0, auto: false, view: 'processed', result: null }); }
      catch (e) { toast(T('Could not open ', 'تعذر فتح ') + f.name); }
    }
    S.page = Math.max(0, S.pages.length - 1); pagesUI();
  }
  const loadImage = f => new Promise((res, rej) => { const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image')); }; im.src = u; });
  // processed copy: rotation + straighten + crop + light/contrast fixes. The original canvas is never modified.
  function processed(pg) {
    const a = (pg.rot + pg.fine) * Math.PI / 180, W = pg.orig.width, H = pg.orig.height, cw = Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a)), ch = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a));
    let c = document.createElement('canvas'); c.width = Math.round(cw); c.height = Math.round(ch); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.translate(c.width / 2, c.height / 2); x.rotate(a); x.drawImage(pg.orig, -W / 2, -H / 2);
    if (pg.crop) { const k = pg.crop, d = document.createElement('canvas'); d.width = Math.max(20, Math.round(k.w * c.width)); d.height = Math.max(20, Math.round(k.h * c.height)); d.getContext('2d').drawImage(c, k.x * c.width, k.y * c.height, d.width, d.height, 0, 0, d.width, d.height); c = d; }
    if ((pg.auto || pg.bright || pg.contrast) && ERLY.handRec && ERLY.handRec.edit) c = ERLY.handRec.edit(c, { flatten: pg.auto, auto: pg.auto, brightness: pg.bright, contrast: pg.contrast, denoise: pg.auto && pg.noisy });
    return c;
  }
  const grayOf = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height); return { gray: HW.toGray(d.data, c.width, c.height), width: c.width, height: c.height }; };
  function pagesUI() {
    const P = $('#hxPanel', root); if (!P || S.mode !== 'scan') return;
    $('.hx-pages', P).innerHTML = S.pages.length ? `<ol class="hx-thumbs">${S.pages.map((pg, i) => `<li><button type="button" data-page="${i}" aria-pressed="${i === S.page}"><img alt="${T('Page', 'صفحة')} ${i + 1}" src="${pg.orig.toDataURL('image/jpeg', 0.5)}"><span>${T('Page', 'صفحة')} ${i + 1}${pg.result ? ' ✓' : ''}</span></button><button type="button" class="hx-x" data-delpage="${i}" aria-label="${T('Remove page', 'أزل الصفحة')} ${i + 1}">×</button></li>`).join('')}</ol>` : '';
    const pg = S.pages[S.page], ed = $('.hx-editor', P);
    if (!pg) { ed.innerHTML = ''; return; }
    const proc = processed(pg), q = HW.quality(grayOf(proc)); pg.noisy = !q.checks.find(c => c.id === 'background').ok;
    ed.innerHTML = `<div class="hx-ed"><div class="hx-ed__view"><div class="hx-seg hx-seg--sm" role="radiogroup" aria-label="${T('View', 'العرض')}"><button type="button" role="radio" data-view="orig" aria-checked="${pg.view === 'orig'}">${T('Original', 'الأصل')}</button><button type="button" role="radio" data-view="processed" aria-checked="${pg.view === 'processed'}">${T('Processed', 'المعالجة')}</button></div>
        <div class="hx-ed__img"><canvas class="hx-ed__cv" aria-label="${T('Page preview', 'معاينة الصفحة')}"></canvas><div class="hx-crop" hidden></div></div></div>
      <div class="hx-ed__tools"><h3 class="hx-h3">${T('Adjust', 'اضبط')} <small class="hx-muted">${T('(the original is kept)', '(الأصل محفوظ)')}</small></h3>
        <p class="hx-row"><button type="button" class="hx-tb" data-ed="rotl">⟲ 90°</button><button type="button" class="hx-tb" data-ed="rotr">⟳ 90°</button><button type="button" class="hx-tb" data-ed="crop" aria-pressed="false">${T('Crop', 'قص')}</button><button type="button" class="hx-tb" data-ed="uncrop" ${pg.crop ? '' : 'disabled'}>${T('Undo crop', 'تراجع عن القص')}</button><button type="button" class="hx-tb" data-ed="auto" aria-pressed="${pg.auto}">${T('Auto fix light', 'إصلاح الإضاءة')}</button><button type="button" class="hx-tb" data-ed="reset">${T('Reset', 'إعادة')}</button></p>
        <label class="hx-mini">${T('Straighten', 'تقويم')} <input type="range" min="-15" max="15" step="0.5" value="${pg.fine}" data-ed-r="fine"> <output>${pg.fine}°</output></label>
        <label class="hx-mini">${T('Brightness', 'السطوع')} <input type="range" min="-60" max="60" value="${pg.bright}" data-ed-r="bright"></label><label class="hx-mini">${T('Contrast', 'التباين')} <input type="range" min="-60" max="80" value="${pg.contrast}" data-ed-r="contrast"></label>
        <h3 class="hx-h3">${T('Image quality check', 'فحص جودة الصورة')}</h3><ul class="hx-q">${q.checks.map(c => `<li class="${c.ok ? 'ok' : c.essential ? 'bad' : 'warn'}"><span aria-hidden="true">${c.ok ? '✓' : '!'}</span> ${c.ok ? esc({ light: T('Light is fine', 'الإضاءة جيدة'), glare: T('No strong glare', 'لا وهج'), contrast: T('Writing stands out', 'الكتابة واضحة'), sharp: T('Sharp enough', 'واضحة بما يكفي'), amount: T('Writing found', 'وُجدت كتابة'), size: T('Writing is big enough', 'الحجم مناسب'), rotation: T('Upright', 'معتدلة'), tilt: T('Not too tilted', 'غير مائلة كثيراً'), cropped: T('Nothing cut off', 'لا شيء مقصوص'), background: T('Clean background', 'خلفية نظيفة') }[c.id] || c.id) : esc(tt(c.msg))}</li>`).join('')}</ul>
        <p class="hx-muted">${q.ok ? T('This photo looks readable.', 'هذه الصورة تبدو مقروءة.') : T('Fixing the items marked “!” will help the reader; you can still try.', 'إصلاح العناصر المميزة سيساعد.')}</p>
        <div class="hx-row"><button type="button" class="btn btn--accent" data-scanread>${S.pages.length > 1 ? T('Read all pages', 'اقرأ كل الصفحات') : T('Read this page', 'اقرأ هذه الصفحة')}</button><button type="button" class="btn btn--ghost" data-pngproc>${T('Export processed image', 'صدّر الصورة المعالجة')}</button></div></div></div>`;
    const cv = $('.hx-ed__cv', ed), src = pg.view === 'orig' ? pg.orig : proc; cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0);
    cropUI(ed, pg);
  }
  function cropUI(ed, pg) {
    const wrap = $('.hx-ed__img', ed), box = $('.hx-crop', ed); let on = false, s0 = null;
    ed.addEventListener('click', e => { const b = e.target.closest('[data-ed="crop"]'); if (!b) return; on = !on; b.setAttribute('aria-pressed', on); wrap.classList.toggle('is-cropping', on); if (on) toast(T('Drag over the writing to crop.', 'اسحب فوق الكتابة للقص.')); });
    wrap.addEventListener('pointerdown', e => { if (!on) return; const r = wrap.getBoundingClientRect(); s0 = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; wrap.setPointerCapture(e.pointerId); box.hidden = false; });
    wrap.addEventListener('pointermove', e => { if (!s0) return; const r = wrap.getBoundingClientRect(), p = [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))]; const x = Math.min(s0[0], p[0]), y = Math.min(s0[1], p[1]), w = Math.abs(p[0] - s0[0]), h = Math.abs(p[1] - s0[1]); Object.assign(box.style, { left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: h * 100 + '%' }); box._k = { x, y, w, h }; });
    wrap.addEventListener('pointerup', () => { if (!s0) return; s0 = null; const k = box._k; if (k && k.w > 0.05 && k.h > 0.05) { if (pg.crop) { const c = pg.crop; pg.crop = { x: c.x + k.x * c.w, y: c.y + k.y * c.h, w: k.w * c.w, h: k.h * c.h }; } else pg.crop = k; pg.view = 'processed'; pagesUI(); } else box.hidden = true; });
  }
  async function scanRead() {
    const P = $('#hxPanel', root), out = $('.hx-out', P); const eng = await ensureEngine(S.lang); if (eng === 'none') return;
    const results = [];
    for (let i = 0; i < S.pages.length; i++) {
      out.innerHTML = `<p class="hx-busy" role="status"><span class="hx-spin" aria-hidden="true"></span>${T('Reading page', 'أقرأ الصفحة')} ${i + 1} / ${S.pages.length}… <span class="hx-bar"><i></i></span></p>`;
      const proc = processed(S.pages[i]);
      try { const r = await OCR().recognize(proc, { lang: S.lang, engine: eng, deskew: !S.pages[i].fine, onProgress: p => { const b = $('.hx-bar i', out); if (b) b.style.width = Math.round(((i + p) / S.pages.length) * 100) + '%'; } }); const g = grayOf(proc); r.analysis = A().fromImage(g.gray, g.width, g.height, HW); S.pages[i].result = r; results.push(r); }
      catch (e) { console.error(e); S.pages[i].result = null; }
    }
    pagesUI(); scanResults();
  }
  function scanResults() {
    const P = $('#hxPanel', root), out = $('.hx-out', P), done = S.pages.map((p, i) => [p, i]).filter(([p]) => p.result);
    if (!done.length) { out.innerHTML = `<p class="hx-err" role="alert">${T('Nothing could be read. Try the light fix, crop to the writing, or the other reader.', 'تعذرت القراءة.')}</p>`; return; }
    out.innerHTML = done.map(([p, i]) => `<section class="hx-res" data-respage="${i}"><h3 class="hx-h3">${T('Page', 'صفحة')} ${i + 1}</h3>${readHTML(p.result, S.lang)}${analysisHTML(p.result.analysis, A().suggestions(p.result.analysis))}<p class="hx-muted">${T('Layout measured from the photo: perspective and paper lines can affect it.', 'قيس من الصورة: قد يتأثر بالمنظور.')}</p></section>`).join('') +
      `<div class="hx-row"><button type="button" class="btn" data-scantxt>${T('Export the text (.txt)', 'صدّر النص')}</button><button type="button" class="btn btn--ghost" data-scanretry>${T('Retry with the other reader', 'أعد بالقارئ الآخر')}</button><button type="button" class="btn btn--ghost" data-scansave>${T('Save to History', 'احفظ في السجل')}</button></div>`;
  }

  /* ================= ASSESS ================= */
  function assess(P) {
    if (S.as && S.as.step === 'write') return assessWrite(P);
    if (S.as && S.as.step === 'result') return assessResult(P);
    if (S.as && S.as.step === 'intro') return assessIntro(P);
    P.innerHTML = `<div class="hx-as"><h2 class="hx-h2">${T('Choose an assessment', 'اختر تقييماً')}</h2><p class="hx-muted">${T('Short and low-stakes. You get measurements and the text the software read — never a score or a grade.', 'قصير ومنخفض المخاطر. لا درجات.')}</p>
      <ul class="hx-ascards">${Object.entries(ASSESS).map(([k, a]) => `<li><button type="button" data-astype="${k}"><span class="hx-ascards__i" aria-hidden="true">${a.icon}</span><b>${T(a.en, a.ar)}</b><span>${esc(tt(a.desc))}</span></button></li>`).join('')}</ul></div>`;
  }
  function pickPrompt(type) {
    const L = S.lang, n = mem.attempts.filter(a => a.type === type).length;
    if (type === 'copy' || type === 'timed' || type === 'photo') { const sets = HW.PROMPTS[L]; return sets[n % sets.length].join(' '); }
    if (type === 'letters') { const l = LIB[L].letters; return l[n % l.length]; }
    if (type === 'free') { const f = FREE_TOPICS[L]; return f[n % f.length]; }
    if (type === 'sentence') { const w = SENT_WORDS[L]; return w[n % w.length]; }
  }
  function assessIntro(P) {
    const a = ASSESS[S.as.type];
    P.innerHTML = `<div class="hx-as hx-as--intro"><p class="hx-k">${T(a.en, a.ar)}</p><h2 class="hx-h2">${T('Before you start', 'قبل أن تبدأ')}</h2>
      <div class="hx-card"><p><b>${T('Your task', 'مهمتك')}:</b> ${S.as.type === 'sentence' ? T('Write one sentence of your own that uses the word', 'اكتب جملة من عندك تستخدم الكلمة') + ` <q dir="auto">${esc(S.as.prompt)}</q>.` : S.as.type === 'free' ? esc(S.as.prompt) + ' ' + T('(3–4 sentences)', '(٣–٤ جمل)') : T('Copy this', 'انسخ هذا') + `: <q dir="auto">${esc(S.as.prompt)}</q>`}</p>
        <ul><li>${S.as.type === 'photo' ? T('Write it on paper, then add a photo.', 'اكتبه على الورق ثم أضف صورة.') : T('Write on the page with a pen, finger or mouse. Undo and the eraser are available.', 'اكتب على الصفحة. التراجع والممحاة متاحان.')}</li>
          <li>${T('Afterwards you will see what the software read, and you can correct it before anything is compared.', 'بعدها سترى ما قرأه البرنامج ويمكنك تصحيحه.')}</li>
          <li>${T('Measured: layout (spacing, baseline, size, slant) and — for copy tasks — how the confirmed text matches the original.', 'يُقاس: التنسيق ومطابقة النص المؤكد.')}</li>
          <li>${T('Not measured: neatness as a grade, intelligence, personality or any condition.', 'لا يُقاس: الدرجات أو الذكاء أو الشخصية أو أي حالة.')}</li></ul>
        ${S.as.type === 'timed' ? `<label class="hx-field">${T('Timer (optional)', 'المؤقت (اختياري)')} <select data-timer><option value="0">${T('No timer', 'بدون مؤقت')}</option><option value="60">1 min</option><option value="120" selected>2 min</option><option value="180">3 min</option></select></label>` : ''}</div>
      <div class="hx-row"><button type="button" class="btn btn--accent" data-asstart>${T('Start', 'ابدأ')}</button><button type="button" class="btn btn--ghost" data-asback>${T('Back', 'رجوع')}</button></div></div>`;
  }
  function assessWrite(P) {
    const as = S.as;
    P.innerHTML = `<div class="hx-as hx-as--focus"><div class="hx-as__bar"><p class="hx-copy" dir="auto">${as.type === 'sentence' ? T('Use the word', 'استخدم الكلمة') + ` <q>${esc(as.prompt)}</q>` : esc(as.prompt)}</p>${as.timer ? `<p class="hx-timer" role="timer" aria-live="off" data-left>${fmtT(as.timer)}</p>` : ''}</div>
      ${as.type === 'photo' ? `<div class="hx-drop"><p class="hx-row"><label class="btn btn--accent">${T('Add the photo', 'أضف الصورة')}<input type="file" accept="image/jpeg,image/png,image/webp" data-asphoto hidden></label><label class="btn btn--ghost">${T('Use the camera', 'استخدم الكاميرا')}<input type="file" accept="image/*" capture="environment" data-asphoto hidden></label></p><p class="hx-muted" data-asphotoname></p></div>`
        : `${toolbar({ full: false })}<div class="hx-surfacewrap"><div class="hx-surface"></div></div>`}
      <div class="hx-row"><button type="button" class="btn btn--accent" data-asfinish ${as.type === 'photo' ? 'disabled' : 'data-needs-ink disabled'}>${T('Finish', 'أنهِ')}</button><button type="button" class="btn btn--ghost" data-ascancel>${T('Cancel', 'إلغاء')}</button></div></div>`;
    if (as.type !== 'photo') { mountSurface($('.hx-surface', P), { paper: 'lined', reveal: false }); syncTools(); }
    as.t0 = Date.now();
    if (as.timer) { clearInterval(as.iv); as.iv = setInterval(() => { const left = as.timer - Math.floor((Date.now() - as.t0) / 1000), el = $('[data-left]', root); if (!el) { clearInterval(as.iv); return; } el.textContent = fmtT(Math.max(0, left)); if (left <= 0) { clearInterval(as.iv); el.textContent = T('Time — finish when ready', 'انتهى الوقت'); } }, 1000); }
  }
  const fmtT = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  async function assessFinish() {
    const as = S.as, P = $('#hxPanel', root); clearInterval(as.iv); as.secs = Math.round((Date.now() - as.t0) / 1000);
    let canvas;
    if (as.type === 'photo') { canvas = as.photo; const g = grayOf(canvas); as.analysis = A().fromImage(g.gray, g.width, g.height, HW); as.quality = HW.quality(g); }
    else { as.analysis = A().fromStrokes(surf.strokes); canvas = surf.exportImage({ scale: 1 }); as.thumb = thumb(surf.exportImage({ asWritten: true, scale: 0.4 })); }
    P.innerHTML = `<div class="hx-as"><div class="hx-out"></div></div>`;
    as.ocr = canvas ? await read(canvas, S.lang, $('.hx-out', P)) : null;
    as.confirmed = as.ocr ? as.ocr.text : ''; as.step = 'result';
    if (surf) { surf.destroy(); surf = null; }
    assessResult(P);
  }
  const thumb = c => { if (!c) return null; const d = document.createElement('canvas'), k = Math.min(1, 360 / c.width); d.width = Math.round(c.width * k); d.height = Math.round(c.height * k); d.getContext('2d').drawImage(c, 0, 0, d.width, d.height); return d.toDataURL('image/jpeg', 0.6); };
  function contentFor(as) {
    if (as.type === 'sentence') { const has = HW.norm(as.confirmed, S.lang).split(' ').includes(HW.norm(as.prompt, S.lang)); return { sentence: true, uses: has, words: HW.norm(as.confirmed, S.lang).split(' ').filter(Boolean).length }; }
    if (!ASSESS[as.type].ref) return null;
    const c = A().content(as.prompt, as.confirmed, HW, S.lang);
    if (as.type === 'timed' && c) { const got = HW.norm(as.confirmed, S.lang).split(' ').filter(Boolean).length; c.wpm = as.secs ? Math.round(got / (as.secs / 60)) : null; }
    return c;
  }
  function assessResult(P) {
    const as = S.as, a = ASSESS[as.type], res = as.analysis, c = as.confirmedOK ? contentFor(as) : null;
    const prev = mem.attempts.filter(x => x.type === as.type && x.prompt === as.prompt && x.lang === S.lang).slice(-1)[0];
    const cmp = prev ? A().compare(res, prev.analysis) : [];
    P.innerHTML = `<div class="hx-as hx-as--result"><p class="hx-k">${T(a.en, a.ar)} · ${T('results', 'النتائج')}</p><h2 class="hx-h2">${T('Done', 'تم')} — ${as.secs ? `${Math.floor(as.secs / 60)} min ${as.secs % 60} s` : ''}</h2>
      <section class="hx-card"><h3 class="hx-h3">${T('Completed', 'المنجز')}</h3><p>${res.lines} ${T('line(s)', 'سطر')}, ${res.words} ${T('word groups found on the page', 'مجموعات كلمات على الصفحة')}${res.strokes ? `, ${res.strokes} ${T('strokes', 'خطوط')}` : ''}.</p>${as.thumb ? `<img class="hx-thumb" alt="${T('Your writing', 'كتابتك')}" src="${as.thumb}">` : ''}</section>
      <section class="hx-card">${as.ocr ? readHTML(as.ocr, S.lang) + `<p><button type="button" class="btn btn--accent btn--sm" data-confirm>${as.confirmedOK ? T('Update the check', 'حدّث التحقق') : T('This is what I wrote — check it', 'هذا ما كتبته — تحقق')}</button></p>` : `<p class="hx-muted">${T('Recognition was skipped, so only layout is reported.', 'تُخطّي التعرّف؛ يُعرض التنسيق فقط.')}</p>`}
        ${c ? (c.sentence ? `<h3 class="hx-h3">${T('Your sentence', 'جملتك')}</h3><p>${c.uses ? T('It uses the word', 'تستخدم الكلمة') : T('The word was not found in the text you confirmed', 'لم تُوجد الكلمة في النص المؤكد')} <q>${esc(as.prompt)}</q> · ${c.words} ${T('words', 'كلمات')}.</p>` : `<h3 class="hx-h3">${T('Matching the original (on the text you confirmed)', 'المطابقة مع الأصل (على النص المؤكد)')}</h3><p><b>${c.match}%</b> ${T('of the characters match', 'من الحروف متطابقة')} · ${c.words - c.missing.length}/${c.words} ${T('words found', 'كلمات موجودة')}${c.wpm != null ? ` · <b>${c.wpm}</b> ${T('words per minute', 'كلمة في الدقيقة')}` : ''}</p>${c.missing.length ? `<p>${T('Not found', 'غير موجودة')}: ${c.missing.map(w => `<q>${esc(w)}</q>`).join(' ')}</p>` : ''}${c.extra.length ? `<p class="hx-muted">${T('Extra or different words', 'كلمات زائدة أو مختلفة')}: ${c.extra.slice(0, 8).map(w => `<q>${esc(w)}</q>`).join(' ')}</p>` : ''}`) : (as.ocr && ASSESS[as.type].ref ? `<p class="hx-muted">${T('Confirm the text above to compare it with the original.', 'أكّد النص للمقارنة.')}</p>` : '')}</section>
      <section class="hx-card">${analysisHTML(res, A().suggestions(res))}</section>
      <section class="hx-card"><h3 class="hx-h3">${T('Compared with your last attempt at this same task', 'مقارنة بمحاولتك السابقة لنفس المهمة')}</h3>${prev ? (cmp.length ? `<ul class="hx-cmp">${cmp.map(x => `<li>${esc(tt(x.label))}: ${x.before} → <b>${x.after}</b> <span class="hx-muted">(${x.key === 'cv' ? T('variation %', 'التفاوت %') : x.key === 'wobble' ? T('wobble %', 'التموج %') : T('spread °', 'التشتت °')}; ${T('lower = more consistent', 'أقل = أكثر ثباتاً')})</span></li>`).join('')}</ul>` : `<p class="hx-muted">${T('Not enough measurements in both attempts to compare.', 'لا قياسات كافية للمقارنة.')}</p>`) : `<p class="hx-muted">${T('No earlier attempt at this exact task is saved, so there is nothing comparable yet.', 'لا محاولة سابقة محفوظة لهذه المهمة.')}</p>`}</section>
      <section class="hx-card hx-limits"><h3 class="hx-h3">${T('Limitations', 'القيود')}</h3><ul><li>${T('Recognition software makes mistakes, especially on joined-up writing and on Arabic; that is why you confirm the text first.', 'برامج التعرّف تخطئ؛ لذلك تؤكد النص أولاً.')}</li><li>${T('Layout measurements depend on how much you wrote; short samples are less reliable.', 'القياسات تعتمد على كمية الكتابة.')}</li><li>${T('Nothing here is a grade or a diagnosis.', 'لا شيء هنا درجة أو تشخيص.')}</li></ul></section>
      <div class="hx-row"><button type="button" class="btn btn--accent" data-assave>${T('Save to History', 'احفظ في السجل')}</button><button type="button" class="btn" data-asretry>${T('Try again', 'حاول مجدداً')}</button><button type="button" class="btn btn--ghost" data-asnoor>${T('Ask Noor about these results', 'اسأل نور عن النتائج')}</button><button type="button" class="btn btn--ghost" data-asdone>${T('Back to assessments', 'العودة للتقييمات')}</button></div></div>`;
  }
  function saveAttempt(rec) {
    if (mem.consent !== 'device') {
      const d = dialog(`<h2 id="hxDlgT">${T('Keep attempts on this device?', 'الاحتفاظ بالمحاولات على هذا الجهاز؟')}</h2><p>${T('Saved: the task, the text you confirmed, the layout measurements and a small preview of on-screen writing. Not saved: photos. Nothing is sent anywhere, and you can delete everything in History.', 'يُحفظ: المهمة والنص والقياسات. لا تُحفظ الصور.')}</p><div class="hx-row"><button type="button" class="btn btn--accent" data-ok>${T('Keep on this device', 'احتفظ على هذا الجهاز')}</button><button type="button" class="btn btn--ghost" data-close>${T('Not now', 'ليس الآن')}</button></div>`);
      $('[data-ok]', d.el).onclick = () => { setConsent('device'); d.close(); saveAttempt(rec); };
      return;
    }
    mem.attempts.push(rec); if (mem.attempts.length > 200) mem.attempts = mem.attempts.slice(-200); save(); toast(T('Saved to History.', 'حُفظ في السجل.'));
  }
  function noorHandoff(summary) {
    const ok = confirm(T('Noor will receive only this text summary (no image, no strokes):\n\n', 'ستتلقى نور هذا الملخص النصي فقط:\n\n') + summary + T('\n\nOpen Noor in the Learning Studio with this question ready to send?', '\n\nافتح نور مع هذا السؤال جاهزاً؟'));
    if (!ok) return;
    try { sessionStorage.setItem('erly-noor-prefill', summary); } catch (e) { /* none */ }
    location.href = 'learn.html#/home';
  }

  /* ================= HISTORY ================= */
  function historyMode(P) {
    const At = mem.attempts.slice().sort((a, b) => b.at - a.at), groups = {};
    At.forEach(a => { const k = a.type + '|' + a.prompt + '|' + a.lang; (groups[k] = groups[k] || []).push(a); });
    P.innerHTML = `<div class="hx-hist"><section class="hx-card"><h2 class="hx-h2">${T('Privacy and storage', 'الخصوصية والتخزين')}</h2>
        <p>${mem.consent === 'device' ? T('Attempts you save are kept in this browser only.', 'المحاولات المحفوظة في هذا المتصفح فقط.') : T('Nothing is kept. Choose “Keep on this device” to build a history.', 'لا يُحفظ شيء.')}</p>
        <div class="hx-row"><button type="button" class="btn ${mem.consent === 'device' ? '' : 'btn--accent'}" data-consentset="device" ${mem.consent === 'device' ? 'disabled' : ''}>${T('Keep on this device', 'احتفظ على هذا الجهاز')}</button><button type="button" class="btn btn--ghost" data-consentset="visit" ${mem.consent !== 'device' ? 'disabled' : ''}>${T('Stop keeping (deletes saved data)', 'أوقف الحفظ (يحذف البيانات)')}</button><button type="button" class="btn btn--ghost" data-export>${T('Export my data (JSON)', 'صدّر بياناتي')}</button><button type="button" class="btn btn--ghost" data-delall>${T('Delete everything', 'احذف كل شيء')}</button></div></section>
      <section><h2 class="hx-h2">${T('Your attempts', 'محاولاتك')}</h2>${At.length ? Object.values(groups).map(g => { const a0 = g[0], A_ = ASSESS[a0.type] || { en: a0.type, ar: a0.type };
        const series = g.slice().reverse(); const sp = series.map(x => ((x.analysis.metrics || []).find(m => m.id === 'spacing' && m.enough) || {}).value);
        return `<article class="hx-card"><h3 class="hx-h3">${T(A_.en, A_.ar)} <small class="hx-muted" dir="auto">— ${esc(String(a0.prompt).slice(0, 60))}</small></h3>
          ${g.length >= 2 ? `<p class="hx-muted">${T('Comparable attempts (same task):', 'محاولات قابلة للمقارنة:')} ${T('word-gap variation', 'تفاوت المسافات')} ${sp.map(v => v ? v.cv + '%' : '—').join(' → ')}</p>` : ''}
          <ul class="hx-att">${g.map(x => `<li>${x.thumb ? `<img alt="" src="${x.thumb}">` : ''}<span><b>${new Date(x.at).toLocaleString()}</b><small dir="auto">${esc((x.confirmed || '').slice(0, 80)) || T('(no text confirmed)', '(لا نص)')}</small>${x.content && x.content.match != null ? `<small>${T('matched', 'تطابق')} ${x.content.match}%${x.content.wpm != null ? ` · ${x.content.wpm} wpm` : ''}</small>` : ''}</span><button type="button" class="hx-x" data-delatt="${x.id}" aria-label="${T('Delete attempt', 'احذف المحاولة')}">×</button></li>`).join('')}</ul></article>`; }).join('') : `<p class="hx-muted">${T('No saved attempts yet.', 'لا محاولات محفوظة بعد.')}</p>`}</section></div>`;
  }

  /* ================= dialog ================= */
  function dialog(html, o) {
    o = o || {}; const back = document.activeElement, w = document.createElement('div'); w.className = 'hx-dlg'; w.innerHTML = `<div class="hx-dlg__box" role="dialog" aria-modal="true" aria-labelledby="hxDlgT" tabindex="-1">${html}</div>`; document.body.appendChild(w);
    const box = w.firstElementChild; let closed = false; const close = v => { if (closed) return; closed = true; w.remove(); if (back && back.focus) back.focus(); o.onClose && o.onClose(v); };
    w.addEventListener('click', e => { if (e.target === w) close(); if (e.target.closest('[data-close]')) close(); });
    w.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const f = $$('button:not([disabled]), input, select, textarea, a[href]', box); if (!f.length) return; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } } });
    requestAnimationFrame(() => (box.querySelector('button, input') || box).focus());
    return { el: box, close };
  }

  /* ================= events ================= */
  function wire() {
    root.addEventListener('click', async e => {
      const t = e.target;
      const md = t.closest('[data-mode]'); if (md) { mode(md.dataset.mode); return; }
      const ml = t.closest('[data-mode-link]'); if (ml) { e.preventDefault(); mode(ml.dataset.modeLink); return; }
      const lg = t.closest('[data-lang]'); if (lg) { S.lang = lg.dataset.lang; S.item = 0; S.as = null; document.documentElement.classList.toggle('hx-rtl-content', S.lang === 'ar'); shell(); return; }
      if (toolClick(e)) return;
      const cat = t.closest('[data-cat]'); if (cat) { S.cat = cat.dataset.cat; S.item = 0; $$('[data-cat]', root).forEach(b => b.setAttribute('aria-pressed', b === cat)); items(root); return; }
      const it = t.closest('[data-item]'); if (it) { S.item = +it.dataset.item; items(root); return; }
      const dr = t.closest('[data-drill]'); if (dr) { S.cat = dr.dataset.drill; S.item = 0; S.paper = S.cat === 'alignment' ? 'guides' : S.paper; mode('practice'); return; }
      const gl = t.closest('[data-goal]'); if (gl) { mem.goals = mem.goals || []; if (!mem.goals.some(g => g.drill === gl.dataset.goal)) mem.goals.push({ drill: gl.dataset.goal, text: gl.dataset.goaltext, target: 3, done: 0, at: Date.now() }); save(); toast(mem.consent === 'device' ? T('Goal added.', 'أُضيف الهدف.') : T('Goal added for this visit (choose “Keep on this device” in History to keep it).', 'أُضيف الهدف لهذه الزيارة.')); const g = $('.hx-goals', root); if (g) g.outerHTML = goalsHTML(); return; }
      const dg = t.closest('[data-delgoal]'); if (dg) { mem.goals.splice(+dg.dataset.delgoal, 1); save(); $('.hx-goals', root).outerHTML = goalsHTML(); return; }
      const act = t.closest('[data-act]'); if (act && surf) {
        const out = $('.hx-out', root), k = act.dataset.act;
        if (k === 'analyse') { const r = A().fromStrokes(surf.strokes); out.innerHTML = analysisHTML(r, A().suggestions(r)); if (S.cat === 'spacing' || S.cat === 'alignment' || S.cat === 'letters') bumpGoal(S.cat); }
        if (k === 'readback') { const r = await read(surf.exportImage({ scale: 1 }), S.lang, out); if (r) { out.innerHTML = readHTML(r, S.lang) + (currentText() ? `<p class="hx-muted">${T('Compare it with what you meant to write:', 'قارن بما قصدت كتابته:')} <q dir="auto">${esc(currentText())}</q></p>` : ''); } }
        if (k === 'png' || k === 'pngclean') download(surf.exportImage({ asWritten: k === 'png', scale: 2 }), 'erly-handwriting' + (k === 'pngclean' ? '-clean' : '') + '.png');
        if (k === 'draft') { mem.draft = surf.serialize(); if (mem.consent === 'device') { save(); toast(T('Page saved on this device.', 'حُفظت الصفحة على هذا الجهاز.')); } else toast(T('Page kept for this visit. Choose “Keep on this device” in History to keep it after closing.', 'حُفظت الصفحة لهذه الزيارة.')); }
        if (k === 'resume' && mem.draft) { surf.load(mem.draft); toast(T('Saved page restored.', 'استُعيدت الصفحة.')); }
        return;
      }
      const pg = t.closest('[data-page]'); if (pg) { S.page = +pg.dataset.page; pagesUI(); return; }
      const dp = t.closest('[data-delpage]'); if (dp) { S.pages.splice(+dp.dataset.delpage, 1); S.page = Math.max(0, Math.min(S.page, S.pages.length - 1)); pagesUI(); $('.hx-out', root).innerHTML = ''; return; }
      const vw = t.closest('[data-view]'); if (vw) { S.pages[S.page].view = vw.dataset.view; pagesUI(); return; }
      const ed = t.closest('[data-ed]'); if (ed && ed.dataset.ed !== 'crop') { const p = S.pages[S.page]; const k = ed.dataset.ed; if (k === 'rotl') p.rot = (p.rot + 270) % 360; if (k === 'rotr') p.rot = (p.rot + 90) % 360; if (k === 'auto') p.auto = !p.auto; if (k === 'uncrop') p.crop = null; if (k === 'reset') Object.assign(p, { rot: 0, fine: 0, crop: null, bright: 0, contrast: 0, auto: false }); p.view = 'processed'; pagesUI(); return; }
      if (t.closest('[data-scanread]')) { scanRead(); return; }
      if (t.closest('[data-pngproc]')) { download(processed(S.pages[S.page]), 'erly-page-' + (S.page + 1) + '-processed.png'); return; }
      if (t.closest('[data-scantxt]')) { const txt = $$('.hx-res', root).map(s => $('[data-confirmed]', s).value).join('\n\n'); downloadText(txt, 'erly-handwriting.txt'); return; }
      if (t.closest('[data-scanretry]')) { S.engine = S.engine === 'tesseract' ? (OCR().ENGINES.trocr.ready() ? 'trocr' : null) : 'tesseract'; if (S.lang === 'ar') { toast(T('Arabic is read by the quick reader only.', 'العربية بالقارئ السريع فقط.')); return; } scanRead(); return; }
      if (t.closest('[data-scansave]')) { $$('.hx-res', root).forEach(s => { const p = S.pages[+s.dataset.respage]; saveAttempt({ id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: Date.now(), type: 'scan', prompt: p.name, lang: S.lang, confirmed: $('[data-confirmed]', s).value, analysis: p.result.analysis, ocr: { engine: p.result.engine, conf: p.result.conf } }); }); return; }
      const ty = t.closest('[data-astype]'); if (ty) { S.as = { type: ty.dataset.astype, prompt: pickPrompt(ty.dataset.astype), step: 'intro' }; assess($('#hxPanel', root)); return; }
      if (t.closest('[data-asback]') || t.closest('[data-asdone]') || t.closest('[data-ascancel]')) { if (S.as) clearInterval(S.as.iv); S.as = null; if (surf) { surf.destroy(); surf = null; } assess($('#hxPanel', root)); return; }
      if (t.closest('[data-asstart]')) { const tm = $('[data-timer]', root); S.as.timer = tm ? +tm.value : 0; S.as.step = 'write'; assess($('#hxPanel', root)); return; }
      if (t.closest('[data-asfinish]')) { assessFinish(); return; }
      if (t.closest('[data-confirm]')) { S.as.confirmed = $('[data-confirmed]', root).value; S.as.confirmedOK = true; assessResult($('#hxPanel', root)); return; }
      if (t.closest('[data-asretry]')) { S.as = { type: S.as.type, prompt: S.as.prompt, step: 'intro' }; assess($('#hxPanel', root)); return; }
      if (t.closest('[data-assave]')) { const as = S.as; const ta = $('[data-confirmed]', root); if (ta) as.confirmed = ta.value; saveAttempt({ id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: Date.now(), type: as.type, prompt: as.prompt, lang: S.lang, secs: as.secs, confirmed: as.confirmed, content: as.confirmedOK ? contentFor(as) : null, analysis: { metrics: as.analysis.metrics, lines: as.analysis.lines, words: as.analysis.words }, ocr: as.ocr ? { engine: as.ocr.engine, conf: as.ocr.conf } : null, thumb: as.thumb || null }); return; }
      if (t.closest('[data-asnoor]')) { const as = S.as, ms = as.analysis.metrics.filter(m => m.enough).map(m => `${tt(m.label)}: ${m.display}`).join('; '); noorHandoff(`I did a "${ASSESS[as.type].en}" handwriting task. You cannot see my writing — only these measurements and the text I confirmed. Measurements: ${ms || 'none'}. Text: "${(as.confirmed || '').slice(0, 300)}". What is one practical thing I could practise next?`); return; }
      const cs = t.closest('[data-consentset]'); if (cs) { if (cs.dataset.consentset === 'visit' && !confirm(T('Stop keeping data? Everything saved on this device will be deleted.', 'إيقاف الحفظ؟ سيُحذف كل شيء.'))) return; setConsent(cs.dataset.consentset); if (cs.dataset.consentset === 'visit') mem.attempts = []; shell(); mode('history'); return; }
      if (t.closest('[data-export]')) { downloadText(JSON.stringify(Object.assign({ exported: new Date().toISOString(), note: 'ERLY Handwriting Studio — exactly what this browser stores for it.' }, mem), null, 2), 'erly-handwriting-data.json'); return; }
      if (t.closest('[data-delall]')) { if (confirm(T('Delete all saved attempts, goals and the saved page?', 'حذف كل المحاولات والأهداف والصفحة المحفوظة؟'))) { deleteAll(); toast(T('Deleted.', 'حُذف.')); mode('history'); } return; }
      const da = t.closest('[data-delatt]'); if (da) { mem.attempts = mem.attempts.filter(a => a.id !== da.dataset.delatt); save(); mode('history'); }
    });
    root.addEventListener('input', e => {
      toolInput(e);
      const r = e.target.closest('[data-ed-r]'); if (r) { const p = S.pages[S.page]; p[r.dataset.edR] = +r.value; p.view = 'processed'; clearTimeout(wire.t); wire.t = setTimeout(pagesUI, 160); }
    });
    root.addEventListener('change', async e => {
      const f = e.target.closest('[data-asphoto]'); if (f && f.files[0]) { try { const im = await loadImage(f.files[0]); const c = document.createElement('canvas'), k = Math.min(1, 2400 / Math.max(im.width, im.height)); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); S.as.photo = c; $('[data-asphotoname]', root).textContent = f.files[0].name; $('[data-asfinish]', root).disabled = false; } catch (er) { toast(T('Could not open that image.', 'تعذر فتح الصورة.')); } }
    });
    root.addEventListener('keydown', e => { const tab = e.target.closest('[role=tab]'); if (!tab || !/Arrow(Left|Right)/.test(e.key)) return; const tabs = $$('[role=tab]', root), i = tabs.indexOf(tab), d = (e.key === 'ArrowRight') !== rtl() ? 1 : -1, n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); mode(n.dataset.mode); });
  }
  function download(c, name) { if (!c) return; c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, 'image/png'); }
  function downloadText(t, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  function start() {
    root = document.getElementById('hx'); if (!root) return;
    const h = (location.hash || '').slice(1), q = new URLSearchParams(location.search).get('practice');
    if (['practice', 'scan', 'assess', 'history'].includes(h)) S.mode = h;
    if (q) { S.mode = 'practice'; S.cat = q === 'tracing' ? 'letters' : q === 'goals' ? 'spacing' : (CATS.some(c => c[0] === q) ? q : 'letters'); if (q === 'tracing') S.trace = true; }
    shell(); wire();
    addEventListener('beforeunload', () => { if (mem.consent !== 'device') { S.pages = []; } });
    document.addEventListener('erly:lang', () => shell());
  }
  window.ERLY = window.ERLY || {};
  window.ERLY.handStudio = { start, state: () => S, data: () => mem, deleteAll, _surface: () => surf };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
