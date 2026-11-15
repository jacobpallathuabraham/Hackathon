/* ERLY — Handwriting Check v2 (interface).
   intro (signature transition, skippable) → notebook: copy three sentences → photo (camera only after the
   student taps “Take a photo”, or upload) → preview: rotate / crop / retake / remove → photo-quality checks
   → text recognition with Tesseract running IN THIS PAGE (WebAssembly; English or Arabic model loaded from
   this site) → result: what was recognised, what wasn't, and an honest verdict.
   Privacy: the image never leaves the device (no network request carries it), is held in memory only,
   and is wiped by “Discard”, by closing, or by leaving the page. Nothing about the writing is stored.
   It never judges handwriting, spelling or ability, and never suggests any condition. */
(function () {
  'use strict';
  const HW = window.ERLY_HAND;
  if (!HW || !window.ERLY) return;
  const $ = (s, r = document) => r.querySelector(s);
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const P = pair => T(pair[0], pair[1]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  try { localStorage.removeItem('erly-hand-v1'); } catch (e) { /* the old feature "levels" are no longer kept */ }
  const VENDOR = 'assets/vendor/tesseract/';
  const BENCH = { n: 150, trocr: '…', tess: '…' }; // filled from docs/bench/handwriting-bench.md (tests/bench/hand-bench.js)
  let st = null, root = null, worker = null, workerLang = null;
  const fresh = () => ({ step: 'intro', lang: (window.I18N && I18N.lang === 'ar') ? 'ar' : 'en', set: 0, canvas: null, rot: 0, crop: null, q: null, ocr: null, busy: false, progress: 0, adj: { brightness: 0, contrast: 0, flatten: false, denoise: false }, engine: null });

  const studio = () => document.getElementById('hwStudio');
  function mount() {
    if (root) return;
    if (studio()) { // the Handwriting Check page: the same flow, in the page instead of a dialog
      root = studio(); root.classList.add('hw2', 'hw2--inline');
      root.innerHTML = `<section class="hw2__panel" aria-labelledby="hwTitle">
        <header class="hw2__head"><div><b id="hwTitle">${T('Your notebook', 'دفترك')}</b><small>${T('Optional · on this device · not a test', 'اختياري · على هذا الجهاز · ليس اختباراً')}</small></div>
          <ol class="hw2__steps" aria-label="${T('Steps', 'الخطوات')}">${[['write', 'Write', 'اكتب'], ['photo', 'Photo', 'صوّر'], ['check', 'Check', 'تحقق'], ['result', 'Result', 'النتيجة']].map(([k, en, ar]) => `<li data-s="${k}">${T(en, ar)}</li>`).join('')}</ol></header>
        <div class="hw2__body" id="hwBody" aria-live="polite"></div>
      </section>`;
      root.addEventListener('click', onClick); root.addEventListener('change', onChange);
      root.addEventListener('dragover', e => { if (e.target.closest('.hw2-drop')) e.preventDefault(); });
      root.addEventListener('drop', e => { const z = e.target.closest('.hw2-drop'); if (!z) return; e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f); });
      root.addEventListener('keydown', e => { const l = e.target.closest('label.hw2-btn, label.hw2-ghost'); if (l && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const i = l.querySelector('input'); if (i) i.click(); } });
      return;
    }
    if (!document.getElementById('hwFont')) { const l = document.createElement('link'); l.id = 'hwFont'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&display=swap'; document.head.appendChild(l); }
    root = document.createElement('div');
    root.className = 'hw2'; root.id = 'hw'; root.hidden = true;
    root.innerHTML = `<div class="hw2__scrim" data-a="close"></div>
      <section class="hw2__panel" role="dialog" aria-modal="true" aria-labelledby="hwTitle">
        <header class="hw2__head"><div><b id="hwTitle">${T('Handwriting Check', 'فحص الكتابة اليدوية')}</b><small>${T('Optional · on this device · not a test', 'اختياري · على هذا الجهاز · ليس اختباراً')}</small></div>
          <ol class="hw2__steps" aria-label="${T('Steps', 'الخطوات')}">${[['write', 'Write', 'اكتب'], ['photo', 'Photo', 'صوّر'], ['check', 'Check', 'تحقق'], ['result', 'Result', 'النتيجة']].map(([k, en, ar]) => `<li data-s="${k}">${T(en, ar)}</li>`).join('')}</ol>
          <button type="button" class="hw2__x" data-a="close" aria-label="${T('Close and discard', 'إغلاق وحذف')}">✕</button></header>
        <div class="hw2__body" id="hwBody" aria-live="polite"></div>
      </section>`;
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('dragover', e => { if (e.target.closest('.hw2-drop')) e.preventDefault(); });
    root.addEventListener('drop', e => { const z = e.target.closest('.hw2-drop'); if (!z) return; e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f); });
    document.addEventListener('keydown', e => {
      if (!root || root.hidden) return;
      if (e.key === 'Escape') return close();
      if (e.key === 'Tab') { // keep keyboard focus inside the dialog
        const f = [...root.querySelectorAll('.hw2__panel button:not([disabled]), .hw2__panel a[href], .hw2__panel label.hw2-btn, .hw2__panel label.hw2-ghost, .hw2__panel summary')].filter(x => x.offsetParent);
        if (!f.length) return; const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    // file inputs live inside labels: make the labels keyboard-operable
    root.addEventListener('keydown', e => { const l = e.target.closest('label.hw2-btn, label.hw2-ghost'); if (l && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const i = l.querySelector('input'); if (i) i.click(); } });
  }
  let opener = null, pad = null, padStrokes = [];
  // v17: several pages on screen (each kept as vector strokes, in memory only) and a paper style
  let pages = [padStrokes], pageIx = 0, paper = 'ruled';
  const savePage = () => { if (pad) { padStrokes = pad.strokes; pages[pageIx] = padStrokes; } };
  function goPage(n) { savePage(); pageIx = Math.max(0, Math.min(pages.length - 1, n)); padStrokes = pages[pageIx]; if (pad) { pad.strokes = padStrokes; pad.redo = []; pad.render(); } syncTools(); renderPages(); }
  function renderPages() { const b = root && root.querySelector('#hwPages'); if (!b) return; b.innerHTML = `<span>${T('Pages', 'الصفحات')}</span>${pages.map((pg, i) => `<button type="button" data-page="${i}" aria-current="${i === pageIx}" aria-label="${T('Page', 'صفحة')} ${i + 1}${pg.length ? '' : ' ' + T('(empty)', '(فارغة)')}">${i + 1}</button>`).join('')}${pages.length < 5 ? `<button type="button" class="hw2-pages__add" data-a="addpage">+ ${T('New page', 'صفحة جديدة')}</button>` : ''}`; }
  function openInline() { mount(); st = fresh(); st.step = 'write'; st.method = 'screen'; render(); }
  function open() {
    if (!studio()) { // the Handwriting Check lives on its own page; the ink transition takes you there
      if (window.ERLY && ERLY.ink) return ERLY.ink.go('handwriting.html', { from: document.activeElement });
      location.href = 'handwriting.html'; return;
    } opener = document.activeElement; mount(); st = fresh(); root.hidden = false; document.body.classList.add('hw-lock'); requestAnimationFrame(() => root.classList.add('is-on')); render(); }
  // Discard genuinely clears: the photo, every page's strokes, the result and any edits, and the recognition
  // worker (which held the last image in its memory) is shut down
  function discard(all) { if (st) { st.canvas = null; st.canvases = null; st.q = null; st.ocr = null; st.crop = null; st.edit = null; } if (all) { padStrokes = []; pages = [padStrokes]; pageIx = 0; if (pad) { pad.strokes = padStrokes; pad.redo = []; pad.render(); } if (worker) { const w = worker; worker = null; workerLang = null; try { w.terminate(); } catch (e) { /* already gone */ } } } }
  addEventListener('pagehide', () => discard(true));
  document.addEventListener('keydown', e => { if (!pad || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.altKey) return; const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; if (document.querySelector('.cmp:not([hidden]).is-in')) return; e.preventDefault(); e.shiftKey ? pad.redoOne() : pad.undo(); syncTools(); });
  function close() { if (!root) return; discard(); root.classList.remove('is-on'); document.body.classList.remove('hw-lock'); try { speechSynthesis.cancel(); } catch (e) { /* none */ } setTimeout(() => { root.hidden = true; }, still() ? 0 : 250); if (opener && opener.focus && document.contains(opener)) { try { opener.focus(); } catch (er) { /* gone */ } } if (worker) { worker.terminate(); worker = null; workerLang = null; } }

  /* ---------- screens ---------- */
  const set = () => HW.PROMPTS[st.lang][st.set % HW.PROMPTS[st.lang].length];
  function stepDots(k) { root.querySelectorAll('.hw2__steps li').forEach(li => { const order = ['write', 'photo', 'check', 'result']; li.classList.toggle('is-on', li.dataset.s === k); li.classList.toggle('is-done', order.indexOf(li.dataset.s) < order.indexOf(k)); }); }
  // after each step, move keyboard/screen-reader focus to the step's main action
  function render() { draw(); requestAnimationFrame(() => { if (!root || root.hidden || st.step === 'write') return; const t = root.querySelector('#hwBody .hw2-btn:not([disabled]), #hwBody button:not([disabled])'); if (t && !root.contains(document.activeElement) || (t && document.activeElement === document.body)) t.focus({ preventScroll: true }); else if (t && st._step !== st.step) t.focus({ preventScroll: true }); st._step = st.step; }); }
  const methodTabs = () => `<div class="hw2-method" role="tablist" aria-label="${T('How do you want to write?', 'كيف تريد أن تكتب؟')}">${[['screen', '✍️', 'Write on screen', 'اكتب على الشاشة'], ['paper', '📄', 'Write on paper + photo', 'اكتب على ورق وصوّر'], ['practice', '🎯', 'Practice', 'تدريب']].map(([k, ic, en, ar]) => `<button type="button" role="tab" aria-selected="${(st.method || 'paper') === k}" data-method="${k}">${ic} ${T(en, ar)}</button>`).join('')}</div>`;
  function draw() {
    if (ERLY.handPractice && !(st.step === 'write' && st.method === 'practice')) ERLY.handPractice.unmount();
    const b = $('#hwBody'); const s = st.step;
    stepDots(s === 'intro' ? '' : s === 'write' ? 'write' : s === 'photo' ? 'photo' : s === 'check' || s === 'reading' ? 'check' : 'result');
    if (s === 'intro') {
      b.innerHTML = `<div class="hw2-intro ${still() ? 'is-still' : ''}">
        <svg class="hw2-sig" viewBox="0 0 900 200" role="img" aria-label="${T('Your handwriting, your pace.', 'كتابتك، بإيقاعك.')}">
          <defs><clipPath id="hwReveal"><rect class="hw2-sig__clip" x="0" y="0" width="900" height="200"/></clipPath><linearGradient id="hwInk" x1="0" x2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs>
          <text class="hw2-sig__stroke" x="450" y="128" text-anchor="middle">${T('Your handwriting, your pace.', 'كتابتك، بإيقاعك.')}</text>
          <g clip-path="url(#hwReveal)"><text class="hw2-sig__fill" x="450" y="128" text-anchor="middle">${T('Your handwriting, your pace.', 'كتابتك، بإيقاعك.')}</text></g>
          <circle class="hw2-sig__nib" cx="0" cy="118" r="5"/>
        </svg>
        <p class="hw2-intro__lead">${T('Let’s explore how this activity works. You copy three short sentences by hand, take a photo, and ERLY tries to read them back — right here on your device.', 'لنستكشف كيف يعمل هذا النشاط. تنسخ ثلاث جمل قصيرة بخط يدك، ثم تلتقط صورة، ويحاول ERLY قراءتها — هنا على جهازك.')}</p>
        <div class="hw2-intro__cols">
          <div><b>${T('What it does', 'ما يفعله')}</b><ul><li>${T('Checks whether the photo is clear enough to read', 'يتحقق من وضوح الصورة للقراءة')}</li><li>${T('Tries to recognise the words with text-recognition software', 'يحاول التعرف على الكلمات ببرنامج قراءة النصوص')}</li><li>${T('Shows which words were recognised and which weren’t', 'يبيّن الكلمات المقروءة وغير المقروءة')}</li></ul></div>
          <div><b>${T('What it cannot do', 'ما لا يستطيعه')}</b><ul><li>${T('Judge your handwriting, spelling or ability', 'الحكم على خطك أو إملائك أو قدرتك')}</li><li>${T('Detect dyslexia, dysgraphia, ADHD or any condition', 'اكتشاف عسر القراءة أو الكتابة أو أي حالة')}</li><li>${T('Replace a conversation with a specialist', 'أن يحل محل الحديث مع مختص')}</li></ul></div>
        </div>
        <p class="hw2-privacy">🔒 ${T('Your photo stays on this device: it is read inside this page, never uploaded or saved, and is deleted when you press Discard or close this window.', 'تبقى صورتك على هذا الجهاز: تُقرأ داخل هذه الصفحة ولا تُرفع ولا تُحفظ، وتُحذف عند الضغط على حذف أو إغلاق النافذة.')}</p>
        <div class="hw2-row"><div class="hw2-seg" role="radiogroup" aria-label="${T('Language', 'اللغة')}"><button type="button" role="radio" aria-checked="${st.lang === 'en'}" data-lang="en">English</button><button type="button" role="radio" aria-checked="${st.lang === 'ar'}" data-lang="ar">العربية</button><button type="button" role="radio" aria-checked="${st.lang === 'mix'}" data-lang="mix">${T('Mixed (experimental)', 'مختلط (تجريبي)')}</button></div>
          <button type="button" class="hw2-btn" data-a="start">${T('Open the notebook', 'افتح الدفتر')}</button>${still() ? '' : `<button type="button" class="hw2-link" data-a="start">${T('Skip animation', 'تخطَّ الحركة')}</button>`}</div>
      </div>`;
      return;
    }
    if (s === 'write' && studio()) { if (pad) { savePage(); pad.destroy(); pad = null; } }
    if (s === 'write' && studio() && st.method === 'practice' && ERLY.handPractice) {
      b.innerHTML = `${methodTabs()}<div id="hwPractice"></div>`; ERLY.handPractice.mount($('#hwPractice')); return;
    }
    if (s === 'write' && studio() && st.method === 'screen') {
      b.innerHTML = `${methodTabs()}
        <div class="hw2-copy" dir="${st.lang === 'ar' ? 'rtl' : 'ltr'}"><span>${T('Copy these sentences, one per line:', 'انسخ هذه الجمل، كل جملة في سطر:')}</span><ol>${set().map(l => `<li dir="auto">${esc(l)}</li>`).join('')}</ol></div>
        <div class="hw2-tools" role="toolbar" aria-label="${T('Writing tools', 'أدوات الكتابة')}">
          <div class="hw2-seg" role="radiogroup" aria-label="${T('Tool', 'الأداة')}"><button type="button" role="radio" aria-checked="true" data-tool="pen">🖋 ${T('Pen', 'قلم')}</button><button type="button" role="radio" aria-checked="false" data-tool="eraser">🧽 ${T('Eraser', 'ممحاة')}</button></div>
          <div class="hw2-inks" role="radiogroup" aria-label="${T('Ink colour', 'لون الحبر')}">${Object.keys(ERLY.InkPad.INKS).map(k => `<button type="button" role="radio" aria-checked="${k === 'auto'}" data-ink="${k}" style="--ink-l:${ERLY.InkPad.INKS[k].light};--ink-d:${ERLY.InkPad.INKS[k].dark}" aria-label="${T({ auto: 'Ink (matches the theme)', blue: 'Blue', teal: 'Teal', crimson: 'Crimson' }[k], { auto: 'حبر (يناسب المظهر)', blue: 'أزرق', teal: 'أخضر مزرق', crimson: 'قرمزي' }[k])}"></button>`).join('')}</div>
          <label class="hw2-size">${T('Size', 'السُمك')} <input type="range" min="1" max="12" value="4" data-size aria-label="${T('Pen thickness', 'سُمك القلم')}"></label>
          <span class="hw2-tools__sp"></span>
          <button type="button" class="hw2-ghost hw2-ic" data-a="undo" aria-label="${T('Undo', 'تراجع')}" title="${T('Undo (Ctrl+Z)', 'تراجع')}">↶</button><button type="button" class="hw2-ghost hw2-ic" data-a="redo" aria-label="${T('Redo', 'إعادة')}" title="${T('Redo (Ctrl+Shift+Z)', 'إعادة')}">↷</button><button type="button" class="hw2-ghost" data-a="clearpad">${T('Clear', 'مسح')}</button>
        </div>
        <div class="hw2-row hw2-row--tight"><div class="hw2-seg hw2-paper" role="radiogroup" aria-label="${T('Paper', 'الورق')}">${[['ruled', 'Ruled', 'مسطّر'], ['blank', 'Blank', 'سادة'], ['grid', 'Grid', 'مربعات']].map(([k, en, ar]) => `<button type="button" role="radio" aria-checked="${paper === k}" data-paper="${k}">${T(en, ar)}</button>`).join('')}</div><div class="hw2-pages" id="hwPages"></div></div>
        <div class="hw2-pad" id="hwPad" data-paper="${paper}"><div class="hw2-pad__hint" aria-hidden="true">${T('Write here with your finger, a stylus or the mouse', 'اكتب هنا بإصبعك أو بقلم أو بالفأرة')}</div></div>
        <p class="hw2-tip">${T('Write the three sentences on the lines, at your own pace. Pressure is used if your stylus reports it.', 'اكتب الجمل الثلاث على الأسطر بإيقاعك. يُستخدم ضغط القلم إن كان جهازك يدعمه.')}</p>
        ${st.err ? `<p class="hw2-err" role="alert">${esc(st.err)}</p>` : ''}
        <div class="hw2-row"><button type="button" class="hw2-link" data-a="other">${T('Different sentences', 'جمل أخرى')}</button><button type="button" class="hw2-link" data-a="listen">🔊 ${T('Read them aloud', 'اقرأها بصوت')}</button><button type="button" class="hw2-btn" data-a="analysepad" disabled>${T('Analyse my writing', 'حلّل كتابتي')}</button></div>`;
      pad = new ERLY.InkPad($('#hwPad'), { label: T('Writing area', 'مساحة الكتابة'), onChange: syncTools });
      pad.strokes = padStrokes; pad.render(); syncTools(); renderPages();
      return;
    }
    if (s === 'write') {
      b.innerHTML = `${studio() ? `${methodTabs()}` : ''}<div class="hw2-book" dir="${st.lang === 'ar' ? 'rtl' : 'ltr'}"><div class="hw2-page">
          <p class="hw2-k">${T('On a sheet of paper, copy these three sentences — one per line, at your own pace', 'على ورقة، انسخ هذه الجمل الثلاث — كل جملة في سطر، بإيقاعك')}</p>
          <ol class="hw2-lines">${set().map(l => `<li dir="auto">${esc(l)}</li>`).join('')}</ol>${st.lang === 'mix' ? `<p class="hw2-tip">${T('Experimental: on our synthetic test pages the English lines were read well but the Arabic lines only partly, and results varied a lot between pages.', 'تجريبي: في صفحات الاختبار الاصطناعية قُرئت الأسطر الإنجليزية جيداً والعربية جزئياً فقط، وتفاوتت النتائج كثيراً بين الصفحات.')}</p>` : ''}
          <p class="hw2-tip">${T('Tips: dark pen, plain paper, good light. There’s no time limit and no right or wrong way to write.', 'نصائح: قلم داكن، ورق سادة، إضاءة جيدة. لا وقت محدد ولا طريقة صحيحة أو خاطئة للكتابة.')}</p>
        </div></div>
        <div class="hw2-row"><button type="button" class="hw2-link" data-a="other">${T('Different sentences', 'جمل أخرى')}</button><button type="button" class="hw2-link" data-a="listen">🔊 ${T('Read them aloud', 'اقرأها بصوت')}</button><button type="button" class="hw2-btn" data-a="tophoto">${T('I’ve written them', 'لقد كتبتها')}</button></div>`;
      return;
    }
    if (s === 'photo') {
      b.innerHTML = `<div class="hw2-drop ${st.canvas ? 'has-img' : ''}">${st.canvas ? '<canvas class="hw2-prev" id="hwPrev"></canvas><div class="hw2-crop" id="hwCrop" hidden></div>' : `<p>${T('Take a photo of your page, or choose / drop an image (PNG, JPEG, WebP).', 'التقط صورة لصفحتك، أو اختر صورة أو أفلتها هنا.')}</p><p class="hw2-tip">${T('The camera only opens when you tap “Take a photo”.', 'لا تُفتح الكاميرا إلا عند الضغط على «التقط صورة».')}</p>`}</div>
        <div class="hw2-row">
          ${st.canvas ? `<button type="button" class="hw2-ghost" data-a="rotl" aria-label="${T('Rotate left', 'تدوير لليسار')}">↺</button><button type="button" class="hw2-ghost" data-a="rotr" aria-label="${T('Rotate right', 'تدوير لليمين')}">↻</button><button type="button" class="hw2-ghost" data-a="crop">${st.cropping ? T('Apply crop', 'طبّق القص') : T('Crop', 'قص')}</button><button type="button" class="hw2-ghost" data-a="retake">${T('Retake', 'أعد الالتقاط')}</button><button type="button" class="hw2-ghost" data-a="remove">${T('Remove', 'إزالة')}</button><button type="button" class="hw2-btn" data-a="check">${T('Check this photo', 'افحص هذه الصورة')}</button>`
            : `<label class="hw2-btn" tabindex="0">📷 ${T('Take a photo', 'التقط صورة')}<input type="file" accept="image/*" capture="environment" data-file hidden></label><label class="hw2-ghost" tabindex="0">${T('Choose an image', 'اختر صورة')}<input type="file" accept="image/png,image/jpeg,image/webp" data-file hidden></label><button type="button" class="hw2-link" data-a="back">${T('Back to the sentences', 'عودة للجمل')}</button>`}
        </div>${st.canvas && ERLY.handRec ? toolsHtml() : ''}${st.err ? `<p class="hw2-err" role="alert">${esc(st.err)}</p>` : ''}`;
      if (st.canvas) drawPreview();
      return;
    }
    if (s === 'check') {
      const q = st.q;
      b.innerHTML = `<div class="hw2-checks"><h3>${q.ok ? T('The photo looks good enough to read.', 'الصورة جيدة بما يكفي للقراءة.') : T('This photo isn’t clear enough to read reliably.', 'هذه الصورة ليست واضحة بما يكفي للقراءة بثقة.')}</h3>
        <ul>${q.checks.map(c => `<li class="${c.ok ? 'is-ok' : c.essential ? 'is-bad' : 'is-warn'}"><span>${c.ok ? '✓' : c.essential ? '✕' : '!'}</span>${esc(T({ light: 'Lighting', glare: 'No glare', contrast: 'Ink stands out from the paper', sharp: 'Sharp focus', amount: 'Enough writing in view', size: 'Writing large enough', rotation: 'Page the right way up', tilt: 'Page fairly straight', cropped: 'Nothing cut off at the edges', background: 'Plain background' }[c.id], { light: 'الإضاءة', glare: 'بلا وهج', contrast: 'الحبر يبرز عن الورق', sharp: 'وضوح التركيز', amount: 'كتابة كافية', size: 'حجم كتابة كافٍ', rotation: 'الصفحة في الاتجاه الصحيح', tilt: 'الصفحة مستقيمة تقريباً', cropped: 'لا شيء مقطوع عند الحواف', background: 'خلفية سادة' }[c.id]))}${c.ok ? '' : `<small>${esc(P(c.msg))}</small>`}</li>`).join('')}</ul>
        ${q.ok ? '' : `<p class="hw2-tip">${T('We won’t try to read an unclear photo — that would only produce guesses. You can try again whenever you’re ready.', 'لن نحاول قراءة صورة غير واضحة — فذلك ينتج تخمينات فقط. يمكنك المحاولة مجدداً متى شئت.')}</p>`}</div>
        <div class="hw2-row"><button type="button" class="hw2-ghost" data-a="retake">${T('Retake the photo', 'أعد التصوير')}</button>${q.ok ? `<button type="button" class="hw2-btn" data-a="read">${T('Read my writing', 'اقرأ كتابتي')}</button>` : ''}</div>${q.ok ? engineHtml() : ''}`;
      return;
    }
    if (s === 'reading') {
      b.innerHTML = `<div class="hw2-reading"><div class="hw2-quill" aria-hidden="true"></div><p>${T('Reading your page on this device…', 'نقرأ صفحتك على هذا الجهاز…')}</p><div class="hw2-bar"><i style="width:${Math.round(st.progress * 100)}%"></i></div><small>${T('The first time takes a little longer while the reading model loads from this website.', 'المرة الأولى أبطأ قليلاً أثناء تحميل نموذج القراءة من هذا الموقع.')}</small></div>`;
      return;
    }
    if (s === 'result') {
      const r = st.ocr, map = set().map(l => HW.wordMap(l, r.text, st.lang === 'mix' ? 'ar' : st.lang));
      const head = { clear: [T('Most of your writing was recognised.', 'تم التعرف على معظم كتابتك.'), T('The software read most of the sentences. Differences may be the software’s, not yours.', 'قرأ البرنامج معظم الجمل. قد تكون الاختلافات من البرنامج لا منك.')], partial: [T('Some words were difficult to recognise.', 'كان التعرف على بعض الكلمات صعباً.'), T('Part of the page was read; some words weren’t. That is common with handwriting — this software is built mainly for printed text.', 'قُرئ جزء من الصفحة ولم تُقرأ بعض الكلمات. هذا شائع مع الكتابة اليدوية — فهذا البرنامج مصمم أساساً للنص المطبوع.')], inconclusive: [T('This result isn’t conclusive.', 'هذه النتيجة غير حاسمة.'), T('The software couldn’t read enough of the page to say anything useful. That says more about the software than about your writing — joined-up and personal writing styles are hard for it.', 'لم يستطع البرنامج قراءة ما يكفي من الصفحة. هذا يقول عن البرنامج أكثر مما يقول عن كتابتك — فأساليب الكتابة المتصلة والشخصية صعبة عليه.')] }[r.outcome];
      b.innerHTML = `<div class="hw2-result hw2-result--${r.outcome}">
        <div class="hw2-badge" aria-hidden="true">${r.outcome === 'clear' ? '✓' : r.outcome === 'partial' ? '◐' : '?'}</div>
        <h3>${head[0]}</h3><p>${head[1]}</p>
        <div class="hw2-stats"><div><b>${r.rates.matched}/${r.rates.words}</b><span>${T('expected words recognised', 'كلمات متوقعة مقروءة')}</span></div><div><b>${Math.round(r.conf)}%</b><span>${T('software confidence', 'ثقة البرنامج')}</span></div><div><b>${T('Good', 'جيدة')}</b><span>${st.fromPad ? T('writing area', 'مساحة الكتابة') : T('photo quality', 'جودة الصورة')}</span></div></div>
        <div class="hw2-words" dir="${st.lang === 'ar' ? 'rtl' : 'ltr'}"><b>${T('What the software recognised', 'ما تعرّف عليه البرنامج')}</b>${map.map(line => `<p dir="auto">${line.map(x => `<span class="${x.found ? 'is-found' : 'is-missed'}">${esc(x.w)}</span>`).join(' ')}</p>`).join('')}<small>${T('Highlighted words weren’t matched by the software — that’s about recognition, not about whether they were written correctly.', 'الكلمات المظللة لم يطابقها البرنامج — هذا عن القراءة الآلية، لا عن صحة الكتابة.')}</small>
          <details><summary>${T('Show the raw recognised text', 'اعرض النص المقروء كما هو')}</summary><pre>${esc(r.text.trim() || '—')}</pre></details></div>
        ${r.words && r.words.length ? `<div class="hw2-flagbox"><b>${T('How sure the software was, word by word', 'مدى ثقة البرنامج كلمة بكلمة')}</b><div class="hw2-flags" dir="auto">${r.words.map(w => `<span class="is-${w.flag}" title="${T('Software confidence', 'ثقة البرنامج')} ${w.conf}%">${esc(w.text)}</span>`).join('')}</div>
          <p class="hw2-key"><span>✓ ${T('read with confidence', 'قُرئت بثقة')}</span><span>⋯ ${T('uncertain (50–79%)', 'غير مؤكدة (٥٠–٧٩٪)')}</span><span>〰 ${T('unreadable to the software (under 50%)', 'غير مقروءة للبرنامج (أقل من ٥٠٪)')}</span></p>
          <p class="muted cmp-small">${r.engine === 'model' ? T('These are the handwriting model’s own probabilities for each word it wrote (a word is as sure as its least certain part). They describe the software, not your writing.', 'هذه احتمالات النموذج لكل كلمة كتبها. تصف البرنامج لا كتابتك.') : T('These are Tesseract’s own confidence scores for its reading. They describe the software, not your writing.', 'هذه درجات ثقة Tesseract في قراءته. تصف البرنامج لا كتابتك.')}</p></div>` : ''}
        <div class="hw2-edit"><label for="hwEdit"><b>${T('Recognised text — you can correct it', 'النص المقروء — يمكنك تصحيحه')}</b></label>
          <textarea id="hwEdit" dir="auto" spellcheck="false">${esc(st.edit != null ? st.edit : r.text.trim())}</textarea>
          <div class="hw2-edit__row"><button type="button" class="hw2-ghost" data-a="copy">${T('Copy text', 'انسخ النص')}</button><button type="button" class="hw2-ghost" data-a="compare" aria-expanded="${!!st.showCmp}">${T('Compare with the sentences', 'قارن بالجمل')}</button>${st.fromPad ? '' : `<button type="button" class="hw2-ghost" data-a="retryprep">${T('Read again with a different preparation', 'اقرأ مجدداً بتحضير مختلف')}</button>`}</div>
          ${st.showCmp ? compareTable() : ''}
          ${r.prep && r.prep.model ? `<p class="muted cmp-small">${T(`Read on this device by the handwriting model, line by line: ${r.prep.lines} line${r.prep.lines === 1 ? '' : 's'} found${r.pages > 1 ? `, ${r.pages} pages` : ''}.`, `قُرئت على هذا الجهاز سطراً سطراً: ${r.prep.lines} أسطر.`)}${r.lines && r.lines.some(l => l.suspect) ? ' ' + T('One line came out as repeated words — a known failure of this kind of model on an unclear strip — so it is marked unreadable.', 'سطر خرج بكلمات مكررة — خطأ معروف لهذا النوع من النماذج — لذا عُلّم غير مقروء.') : ''}</p>` : r.prep ? `<p class="muted cmp-small">${T(`Prepared on this device: ${r.prep.adaptive ? 'adaptive threshold for uneven light' : 'one threshold for the whole page'}${r.prep.scale && Math.abs(r.prep.scale - 1) > 0.05 ? `, scaled ×${r.prep.scale.toFixed(2)}` : ''}, ${r.prep.lines} line${r.prep.lines === 1 ? '' : 's'} found${r.pages > 1 ? `, ${r.pages} pages` : ''}.`, `حُضّرت على هذا الجهاز: ${r.prep.lines} أسطر.`)}</p>` : ''}
        </div>
        <p class="hw2-tip">${r.engine === 'model' ? T(`Recognition used TrOCR-small-handwritten, a model trained on handwriting, running in this page. On ${BENCH.n} real handwritten lines by many writers (the IAM test set) it got ${BENCH.trocr} of characters wrong, against ${BENCH.tess} for the quick reader. Those are scanned forms, not phone photos, and its accuracy on students’ own writing has not been validated.`, 'استُخدم نموذج مدرَّب على الكتابة اليدوية داخل هذه الصفحة. لم تُقيَّم دقته على كتابة الطلاب.') + ` <a href="docs/bench/handwriting-bench.md" target="_blank" rel="noopener">${T('How this was measured', 'كيف قيس ذلك')}</a>` : T('Recognition uses Tesseract (open-source, running in this page). Measured on synthetic, font-rendered samples it reads clear print-like writing well, Arabic less reliably, and joined-up writing much less reliably. Its accuracy on real student handwriting has not been validated.', 'يستخدم التعرف برنامج Tesseract مفتوح المصدر داخل هذه الصفحة. في عيّنات اصطناعية قرأ الكتابة الواضحة جيداً، والعربية بدقة أقل، والكتابة المتصلة بضعف. لم تُقيَّم دقته على كتابة طلاب حقيقية.')}${ERLY.handRec && st.lang === 'en' && r.engine !== 'model' ? ` <button type="button" class="hw2-link" data-a="${ERLY.handRec.ready() ? 'readmodel' : 'getmodel'}">${ERLY.handRec.ready() ? T('Read again with the handwriting model', 'اقرأ مجدداً بنموذج الكتابة') : T('Get the handwriting model for better reading', 'نزّل نموذج الكتابة لقراءة أفضل')}</button>` : ''}${st.lang === 'mix' ? ' ' + T('Mixed pages are experimental: Arabic lines are read much less reliably than English ones.', 'الصفحات المختلطة تجريبية: تُقرأ الأسطر العربية بدقة أقل بكثير من الإنجليزية.') : ''}</p>
        <div class="hw2-row"><button type="button" class="hw2-ghost" data-a="again">${T('Try again', 'حاول مجدداً')}</button><button type="button" class="hw2-ghost" data-a="other2">${T('Try different sentences', 'جرّب جملاً أخرى')}</button><a class="hw2-ghost" href="student.html#handoff" data-a="sas">${T('Talk to Student Accessibility Services', 'تحدث مع خدمات الطلبة ذوي الإعاقة')}</a><button type="button" class="hw2-btn" data-a="discard">${T('Discard and finish', 'احذف وأنهِ')}</button></div>
        <p class="hw2-privacy">🔒 ${T('Nothing from this check was saved. Discard deletes the photo and this result from memory now.', 'لم يُحفظ شيء من هذا الفحص. «احذف» يمسح الصورة والنتيجة من الذاكرة الآن.')}</p></div>`;
    }
  }

  // expected sentence vs what was recognised (the corrected text if the student edited it), word by word
  function compareTable() {
    const got = String(st.edit != null ? st.edit : st.ocr.text).split(/\n+/).map(x => x.trim()).filter(Boolean), L = st.lang === 'mix' ? 'ar' : st.lang;
    return `<table class="hw2-cmp"><thead><tr><th>${T('Sentence to copy', 'الجملة المطلوبة')}</th><th>${T('Recognised', 'المقروء')}</th></tr></thead><tbody>${set().map((line, i) => {
      const g = got[i] || '', gw = new Set(HW.norm(g, L).split(' ')), ew = new Set(HW.norm(line, L).split(' '));
      const exp = line.split(/\s+/).map(w => (gw.has(HW.norm(w, L)) ? esc(w) : `<del>${esc(w)}</del>`)).join(' ');
      const rec = g ? g.split(/\s+/).map(w => (ew.has(HW.norm(w, L)) ? esc(w) : `<ins>${esc(w)}</ins>`)).join(' ') : `<span class="muted">${T('(nothing on this line)', '(لا شيء في هذا السطر)')}</span>`;
      return `<tr><td dir="auto">${exp}</td><td dir="auto">${rec}</td></tr>`; }).join('')}</tbody></table><p class="hw2-key"><span><del>${T('word', 'كلمة')}</del> ${T('not found', 'غير موجودة')}</span><span><ins>${T('word', 'كلمة')}</ins> ${T('read differently', 'قُرئت بشكل مختلف')}</span></p>`;
  }

  /* ---------- image handling ---------- */
  function load(file) {
    st.err = '';
    if (!/^image\//.test(file.type)) { st.err = T('That file isn’t an image. Please choose a photo of your page.', 'هذا الملف ليس صورة. اختر صورة لصفحتك.'); return render(); }
    if (file.size > 25e6) { st.err = T('That image is larger than 25 MB. Please choose a smaller one.', 'الصورة أكبر من ٢٥ ميغابايت.'); return render(); }
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const k = Math.min(1, 2400 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); st.canvas = c; st.rot = 0; st.crop = null; render(); };
    im.onerror = () => { URL.revokeObjectURL(url); st.err = T('This image couldn’t be opened. Try a JPEG or PNG.', 'تعذر فتح الصورة. جرّب JPEG أو PNG.'); render(); };
    im.src = url;
  }
  // the working image after rotation and crop
  function working() {
    const src = st.canvas, r = ((st.rot % 360) + 360) % 360, sw = r % 180 ? src.height : src.width, sh = r % 180 ? src.width : src.height;
    const c = document.createElement('canvas'); c.width = sw; c.height = sh; const g = c.getContext('2d');
    g.translate(sw / 2, sh / 2); g.rotate(r * Math.PI / 180); g.drawImage(src, -src.width / 2, -src.height / 2);
    let o = c;
    if (st.crop) { const { x, y, w, h } = st.crop; o = document.createElement('canvas'); o.width = Math.round(w * sw); o.height = Math.round(h * sh); o.getContext('2d').drawImage(c, x * sw, y * sh, w * sw, h * sh, 0, 0, o.width, o.height); }
    const A = st.adj || {}; // v18 image tools: brightness, contrast, even out light, remove specks (all on this device)
    return ERLY.handRec && (A.brightness || A.contrast || A.flatten || A.denoise) ? ERLY.handRec.edit(o, A) : o;
  }
  const useModel = () => st.lang === 'en' && ERLY.handRec && ERLY.handRec.ready() && st.engine !== 'tess';
  function engineHtml() {
    const R = ERLY.handRec; if (!R) return '';
    if (st.lang !== 'en') return `<p class="hw2-tip">${T('Reader: Tesseract. The handwriting model reads English only, so Arabic and mixed pages use Tesseract, which is less reliable on handwriting.', 'القارئ: Tesseract. نموذج الكتابة اليدوية يقرأ الإنجليزية فقط.')}</p>`;
    if (R.status() === 'loading') return `<div class="hw2-engine"><p>${T('Downloading the handwriting model…', 'نُنزّل نموذج الكتابة اليدوية…')}</p><div class="hw2-bar"><i style="width:${Math.round((st.mprog || 0.02) * 100)}%"></i></div></div>`;
    if (!R.ready()) return `<div class="hw2-engine"><p><b>${T('Better reading for handwriting', 'قراءة أفضل للكتابة اليدوية')}</b> — ${T('a model trained on handwriting (TrOCR) reads joined-up writing far better than the quick reader: on real handwritten lines it made about a tenth of the errors. It runs on this device; the model is a one-time download of about 64 MB. Your photo is never uploaded.', 'نموذج مدرَّب على الكتابة اليدوية يقرأ الكتابة المتصلة أفضل بكثير. يعمل على هذا الجهاز؛ تنزيل لمرة واحدة بحجم ٦٤ ميغابايت تقريباً. صورتك لا تُرفع أبداً.')}</p><button type="button" class="hw2-ghost" data-a="getmodel">⬇ ${T('Download the handwriting model', 'نزّل نموذج الكتابة اليدوية')}</button> <small class="muted">${T('Without it, the quick reader (Tesseract) is used.', 'من دونه يُستخدم القارئ السريع (Tesseract).')}</small></div>`;
    return `<div class="hw2-engine" role="radiogroup" aria-label="${T('Reader', 'القارئ')}"><b>${T('Reader', 'القارئ')}</b><label><input type="radio" name="hwEng" data-eng="model" ${st.engine !== 'tess' ? 'checked' : ''}> ${T('Handwriting model (recommended)', 'نموذج الكتابة اليدوية (موصى به)')}</label><label><input type="radio" name="hwEng" data-eng="tess" ${st.engine === 'tess' ? 'checked' : ''}> ${T('Quick reader (Tesseract, for print-like writing)', 'القارئ السريع (للكتابة الشبيهة بالطباعة)')}</label></div>`;
  }
  const toolsHtml = () => { const A = st.adj; return `<details class="hw2-adj" ${A.open ? 'open' : ''}><summary>${T('Adjust the photo', 'اضبط الصورة')}${A.brightness || A.contrast || A.flatten || A.denoise ? ` <span class="hw2-adj__on">${T('edited', 'معدّلة')}</span>` : ''}</summary>
      <label>${T('Brightness', 'السطوع')} <input type="range" min="-60" max="60" step="5" value="${A.brightness}" data-adj="brightness"></label>
      <label>${T('Contrast', 'التباين')} <input type="range" min="-50" max="80" step="5" value="${A.contrast}" data-adj="contrast"></label>
      <label class="hw2-sw"><input type="checkbox" data-adj="flatten" ${A.flatten ? 'checked' : ''}> ${T('Even out shadows and uneven light', 'وحّد الظلال والإضاءة')}</label>
      <label class="hw2-sw"><input type="checkbox" data-adj="denoise" ${A.denoise ? 'checked' : ''}> ${T('Remove specks (noise)', 'أزل النقاط (التشويش)')}</label>
      <div class="hw2-row"><button type="button" class="hw2-ghost" data-a="autofix">${T('Auto-fix', 'إصلاح تلقائي')}</button><button type="button" class="hw2-link" data-a="adjreset">${T('Reset', 'إعادة')}</button></div>
      <p class="muted cmp-small">${T('Tested on 30 sample pages: “Remove specks” cut the reading error on speckled photos from about 60% to under 10%; on photos that were only dim, the reader already copes and these tools change little.', 'اختُبرت على ٣٠ صفحة: «أزل النقاط» خفّض خطأ القراءة في الصور المشوشة كثيراً؛ أما الصور الخافتة فقط فالتغيير قليل.')}</p></details>`; };
  function drawPreview() {
    const cv = $('#hwPrev'), w = working(); cv.width = w.width; cv.height = w.height; cv.getContext('2d').drawImage(w, 0, 0);
    const box = $('#hwCrop'); if (!st.cropping) return;
    box.hidden = false; let drag = null; st.cropDraft = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
    const place = () => { const r = cv.getBoundingClientRect(), pr = cv.parentElement.getBoundingClientRect(), d = st.cropDraft; Object.assign(box.style, { left: (r.left - pr.left + d.x * r.width) + 'px', top: (r.top - pr.top + d.y * r.height) + 'px', width: d.w * r.width + 'px', height: d.h * r.height + 'px' }); };
    place();
    cv.parentElement.onpointerdown = e => { const r = cv.getBoundingClientRect(); drag = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    cv.parentElement.onpointermove = e => { if (!drag) return; const r = cv.getBoundingClientRect(), x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)); st.cropDraft = { x: Math.min(drag[0], x), y: Math.min(drag[1], y), w: Math.max(0.05, Math.abs(x - drag[0])), h: Math.max(0.05, Math.abs(y - drag[1])) }; place(); };
    cv.parentElement.onpointerup = () => { drag = null; };
  }
  // isolated dark or light single pixels (salt-and-pepper speckle) as a share of the image
  function speckled(img) { const { gray: g, width: W, height: H } = img; let n = 0, t = 0; for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) { const v = g[y * W + x], m = (g[y * W + x - 1] + g[y * W + x + 1] + g[(y - 1) * W + x] + g[(y + 1) * W + x]) / 4; t++; if (Math.abs(v - m) > 110) n++; } return n / Math.max(1, t) > 0.006; }
  const grayOf = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height); return { gray: HW.toGray(d.data, c.width, c.height), width: c.width, height: c.height }; };
  function loadScript(src) { return new Promise((res, rej) => { if (window.Tesseract) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script')); document.head.appendChild(s); }); }
  async function recogniseModel() {
    const imgs = st.fromPad && st.canvases ? st.canvases : [working()], R = ERLY.handRec; let lines = [];
    for (let n = 0; n < imgs.length; n++) { const r = await R.readPage(imgs[n], p => { st.progress = (n + p) / imgs.length; const i = root.querySelector('.hw2-bar i'); if (i) i.style.width = Math.round(st.progress * 100) + '%'; }); lines = lines.concat(r.lines); }
    const text = lines.map(l => l.text).join('\n'), conf = lines.length ? lines.reduce((a, l) => a + l.conf, 0) / lines.length : 0;
    const rates = HW.errorRates(set().join(' '), text, 'en');
    st.ocr = { engine: 'model', text, conf, rates, outcome: HW.outcome(rates, conf), words: HW.flagWords(lines.flatMap(l => l.words.map(w => ({ text: w.text, confidence: w.conf })))), lines: lines.map(l => ({ text: l.text, conf: l.conf, suspect: l.suspect })), prep: { model: true, lines: lines.length }, pages: imgs.length };
    st.edit = text.trim(); st.step = 'result';
  }
  async function recognise() {
    st.step = 'reading'; st.progress = 0.02; render();
    if (useModel()) { try { await recogniseModel(); } catch (e) { console.error('ERLY handwriting: model failed', e); st.step = st.fromPad ? 'write' : 'photo'; st.err = T('The handwriting model couldn’t read this on this device. Your writing is still here — you can try the quick reader.', 'تعذر على النموذج القراءة على هذا الجهاز.'); st.engine = 'tess'; } return render(); }
    try {
      await loadScript(VENDOR + 'tesseract.min.js');
      if (!worker || workerLang !== st.lang) {
        if (worker) await worker.terminate();
        worker = await Tesseract.createWorker(st.lang === 'ar' ? 'ara' : st.lang === 'mix' ? 'ara+eng' : 'eng', 1, { workerPath: VENDOR + 'worker.min.js', corePath: VENDOR + 'core', langPath: VENDOR + 'lang', gzip: true, workerBlobURL: false, logger: m => { if (m.progress != null && st.step === 'reading') { st.progress = (/recogniz/.test(m.status) ? 0.4 : 0) + m.progress * 0.6; const i = root.querySelector('.hw2-bar i'); if (i) i.style.width = Math.round(st.progress * 100) + '%'; } } });
        workerLang = st.lang;
      }
      const imgs = st.fromPad && st.canvases ? st.canvases : [working()];
      let text = '', words = [], confs = [], prepInfo = null;
      for (let n = 0; n < imgs.length; n++) {
        const img = grayOf(imgs[n]), q = n === 0 && !st.fromPad ? st.q : HW.quality(img);
        const uneven = !st.fromPad && (st.forceAdaptive != null ? st.forceAdaptive : q.stats.uneven > 0.2);
        const prep = HW.prepare(img, st.fromPad ? 0 : st.q.stats.skew, { source: true, uneven, letterHeight: q.stats.letterHeight });
        prepInfo = prepInfo || { adaptive: !!prep.adaptive, scale: prep.scale || 1, lines: HW.lines(prep).length };
        const c = document.createElement('canvas'); c.width = prep.width; c.height = prep.height; const d = c.getContext('2d').createImageData(prep.width, prep.height);
        for (let i = 0; i < prep.gray.length; i++) { const v = prep.gray[i]; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
        c.getContext('2d').putImageData(d, 0, 0);
        const { data } = await worker.recognize(c, {}, { text: true, blocks: true });
        text += (n ? '\n' : '') + (data.text || '');
        const ws = (data.blocks || []).flatMap(b => b.paragraphs || []).flatMap(p => p.lines || []).flatMap(l => l.words || []);
        words = words.concat(ws.length ? ws : (data.words || []));
        if (data.confidence) confs.push(data.confidence);
          }
      const conf = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
      const rates = HW.errorRates(set().join(' '), text, st.lang === 'mix' ? 'ar' : st.lang);
      st.ocr = { engine: 'tess', text, conf, rates, outcome: HW.outcome(rates, conf), words: HW.flagWords(words), prep: prepInfo, pages: imgs.length };
      st.edit = text.trim();
      st.step = 'result';
    } catch (e) {
      console.error('ERLY handwriting: recognition failed', e);
      st.step = st.fromPad ? 'write' : 'photo'; st.err = T('The reading software couldn’t start on this device, so nothing was analysed. Your writing is still here — you can try again.', 'تعذر تشغيل برنامج القراءة على هذا الجهاز، لذلك لم يُحلَّل شيء. كتابتك ما زالت هنا.');
    }
    render();
  }

  /* ---------- the on-screen pad ---------- */
  function syncTools() {
    if (!pad || !root) return;
    const u = root.querySelector('[data-a="undo"]'), r = root.querySelector('[data-a="redo"]'), go = root.querySelector('[data-a="analysepad"]'), h = root.querySelector('.hw2-pad__hint');
    if (u) u.disabled = !pad.canUndo(); if (r) r.disabled = !pad.canRedo(); if (go) go.disabled = pad.isEmpty(); if (h) h.hidden = pad.strokes.length > 0;
  }
  function analysePad() {
    savePage();
    const live = pad.strokes, used = pages.filter(pg => pg.some(x => x.tool === 'pen'));
    if (!used.length) return;
    const canv = used.map(pg => { pad.strokes = pg; return pad.export(); }).filter(Boolean);
    pad.strokes = live; pad.render();
    const c = canv[0];
    st.canvas = c; st.canvases = canv; st.rot = 0; st.crop = null; st.fromPad = true; st.err = '';
    const q = HW.quality(grayOf(c));
    // lighting, glare, edges and background describe photos, not a clean digital page
    const need = q.checks.filter(x => ['amount', 'size'].includes(x.id) && !x.ok);
    if (need.length && canv.length === 1) { st.step = 'write'; st.err = need.map(x => x.id === 'amount' ? T('There isn’t enough writing yet — please write all three sentences.', 'لا توجد كتابة كافية بعد — اكتب الجمل الثلاث.') : T('The writing is very small — try writing a little larger.', 'الكتابة صغيرة جداً — جرّب الكتابة بحجم أكبر قليلاً.')).join(' '); return render(); }
    st.q = q; st.q.stats.skew = 0;
    recognise();
  }

  /* ---------- events ---------- */
  function onClick(e) {
    const lb = e.target.closest('[data-lang]'); if (lb) { st.lang = lb.dataset.lang; st.set = 0; return render(); }
    const mb = e.target.closest('[data-method]'); if (mb) { st.method = mb.dataset.method; st.err = ''; return render(); }
    const pb = e.target.closest('[data-page]'); if (pb && pad) return goPage(+pb.dataset.page);
    const pp = e.target.closest('[data-paper]'); if (pp && pp.tagName === 'BUTTON') { paper = pp.dataset.paper; const h = root.querySelector('#hwPad'); if (h) h.dataset.paper = paper; root.querySelectorAll('button[data-paper]').forEach(x => x.setAttribute('aria-checked', String(x === pp))); return; }
    const tb = e.target.closest('[data-tool]'); if (tb && pad) { pad.setTool(tb.dataset.tool); root.querySelectorAll('[data-tool]').forEach(x => x.setAttribute('aria-checked', String(x === tb))); return; }
    const ib = e.target.closest('[data-ink]'); if (ib && pad) { pad.setInk(ib.dataset.ink); pad.setTool('pen'); root.querySelectorAll('[data-ink]').forEach(x => x.setAttribute('aria-checked', String(x === ib))); root.querySelectorAll('[data-tool]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.tool === 'pen'))); return; }
    const a = (e.target.closest('[data-a]') || {}).dataset; if (!a || !a.a) return;
    const k = a.a;
    if (k === 'close') return close();
    if (k === 'start') { if (!still() && !st.anim && e.target.closest('.hw2-btn')) { st.anim = true; root.querySelector('.hw2-intro').classList.add('is-leaving'); return setTimeout(() => { st.step = 'write'; render(); }, 650); } st.step = 'write'; return render(); }
    if (k === 'other' || k === 'other2') { st.set++; discard(true); st.step = 'write'; return render(); }
    if (k === 'listen') { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(set().join(' … ')); u.lang = st.lang === 'ar' ? 'ar' : 'en-GB'; u.rate = 0.85; speechSynthesis.speak(u); } catch (er) { /* no speech */ } return; }
    if (k === 'tophoto' || k === 'back') { st.fromPad = false; st.step = k === 'back' ? 'write' : 'photo'; if (k === 'back' && studio()) st.method = 'paper'; return render(); }
    if (k === 'rotl' || k === 'rotr') { st.rot += k === 'rotl' ? -90 : 90; st.crop = null; return render(); }
    if (k === 'crop') { if (st.cropping) { st.crop = st.cropDraft; st.cropping = false; } else st.cropping = true; return render(); }
    if ((k === 'again' || k === 'retake') && st.fromPad) { discard(); st.err = ''; st.step = 'write'; st.method = 'screen'; return render(); }
    if (k === 'retake' || k === 'remove' || k === 'again') { discard(); st.cropping = false; st.err = ''; st.step = 'photo'; return render(); }
    if (k === 'getmodel') { st.mprog = 0.02; ERLY.handRec.load(p => { st.mprog = p; const i = root.querySelector('.hw2-engine .hw2-bar i'); if (i) i.style.width = Math.round(p * 100) + '%'; }).then(() => { ERLY.toast && ERLY.toast(T('Handwriting model ready — it stays in this browser’s cache.', 'نموذج الكتابة جاهز.')); render(); }).catch(() => { st.err = T('The handwriting model could not be downloaded right now; the quick reader still works. Nothing was sent anywhere.', 'تعذر تنزيل النموذج الآن؛ القارئ السريع ما زال يعمل.'); render(); }); return render(); }
    if (k === 'readmodel') { st.engine = 'model'; return recognise(); }
    if (k === 'autofix') { const g = grayOf(working()), q = HW.quality(g); st.adj = Object.assign({}, st.adj, { open: true, flatten: q.stats.uneven > 0.12 || q.stats.mean < 150, brightness: q.stats.mean < 110 ? 20 : 0, contrast: q.stats.sep < 0.35 ? 30 : 0, denoise: speckled(g) }); return render(); }
    if (k === 'adjreset') { st.adj = { brightness: 0, contrast: 0, flatten: false, denoise: false, open: true }; return render(); }
    if (k === 'check') { st.cropping = false; st.q = HW.quality(grayOf(working())); st.step = 'check'; return render(); }
    if (k === 'read') return recognise();
    if (k === 'undo' && pad) { pad.undo(); return syncTools(); }
    if (k === 'redo' && pad) { pad.redoOne(); return syncTools(); }
    if (k === 'clearpad' && pad) { if (pad.strokes.length && !confirm(T('Clear this page? You can undo it straight after.', 'مسح هذه الصفحة؟ يمكنك التراجع مباشرة بعد ذلك.'))) return; pad.clear(); return syncTools(); }
    if (k === 'addpage' && pad) { savePage(); pages.push([]); return goPage(pages.length - 1); }
    if (k === 'copy') { const t = (root.querySelector('#hwEdit') || {}).value || ''; (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => ERLY.toast && ERLY.toast(T('Copied.', 'تم النسخ.'))).catch(() => { const ta = root.querySelector('#hwEdit'); ta.select(); try { document.execCommand('copy'); } catch (er) { /* manual copy */ } }); return; }
    if (k === 'compare') { st.showCmp = !st.showCmp; return render(); }
    if (k === 'retryprep') { st.forceAdaptive = !(st.ocr && st.ocr.prep && st.ocr.prep.adaptive); return recognise(); }
    if (k === 'analysepad' && pad) return analysePad();
    if (k === 'discard' && studio()) { discard(true); st.step = 'write'; st.method = 'screen'; render(); ERLY.toast && ERLY.toast(T('Your writing and the result were discarded.', 'تم حذف كتابتك والنتيجة.')); return; }
    if (k === 'discard') { discard(); close(); ERLY.toast && ERLY.toast(T('Photo and result discarded.', 'تم حذف الصورة والنتيجة.')); return; }
    if (k === 'sas') { discard(); close(); return; }
  }
  document.addEventListener('input', e => { if (e.target && e.target.id === 'hwEdit' && st) { st.edit = e.target.value; if (st.showCmp) { const t = root.querySelector('.hw2-cmp'); if (t) { const w = document.createElement('div'); w.innerHTML = compareTable(); t.nextElementSibling && t.nextElementSibling.remove(); t.replaceWith(...w.childNodes); } } } });
  document.addEventListener('input', e => { const r = e.target.closest && e.target.closest('[data-adj]'); if (!r || !st || r.type !== 'range') return; st.adj[r.dataset.adj] = +r.value; st.adj.open = true; clearTimeout(st._adjT); st._adjT = setTimeout(() => { if ($('#hwPrev')) { const w = working(), cv = $('#hwPrev'); cv.width = w.width; cv.height = w.height; cv.getContext('2d').drawImage(w, 0, 0); } }, 60); });
  function onChange(e) { const en = e.target.closest('[data-eng]'); if (en) { st.engine = en.dataset.eng; return; } const ad = e.target.closest('[data-adj]'); if (ad && ad.type === 'checkbox') { st.adj[ad.dataset.adj] = ad.checked; st.adj.open = true; return render(); } if (ad) return; const i = e.target.closest('[data-file]'); if (i && i.files && i.files[0]) { load(i.files[0]); i.value = ''; } }

  ERLY.on && ERLY.on('hand:open', open);
  window.ERLY.handwriting = { open, close, rerender: () => st && render(), state: () => st, pad: () => pad, pages: () => pages.map(pg => pg.length), _worker: () => !!worker, _working: () => (st && st.canvas ? working() : null) };
  if (studio()) { const startIt = () => openInline(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startIt); else startIt(); }
})();
document.addEventListener('click', e => { const b = e.target.closest('[data-hand-open]'); if (!b) return; e.preventDefault(); if (window.ERLY && ERLY.ink) ERLY.ink.go('handwriting.html', { from: b }); else location.href = 'handwriting.html'; });
