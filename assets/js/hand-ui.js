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
  let st = null, root = null, worker = null, workerLang = null;
  const fresh = () => ({ step: 'intro', lang: (window.I18N && I18N.lang === 'ar') ? 'ar' : 'en', set: 0, canvas: null, rot: 0, crop: null, q: null, ocr: null, busy: false, progress: 0 });

  function mount() {
    if (root) return;
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
  let opener = null;
  function open() { opener = document.activeElement; mount(); st = fresh(); root.hidden = false; document.body.classList.add('hw-lock'); requestAnimationFrame(() => root.classList.add('is-on')); render(); }
  function discard() { if (st) { st.canvas = null; st.q = null; st.ocr = null; st.crop = null; } }
  function close() { if (!root) return; discard(); root.classList.remove('is-on'); document.body.classList.remove('hw-lock'); try { speechSynthesis.cancel(); } catch (e) { /* none */ } setTimeout(() => { root.hidden = true; }, still() ? 0 : 250); if (opener && opener.focus && document.contains(opener)) { try { opener.focus(); } catch (er) { /* gone */ } } if (worker) { worker.terminate(); worker = null; workerLang = null; } }

  /* ---------- screens ---------- */
  const set = () => HW.PROMPTS[st.lang][st.set % HW.PROMPTS[st.lang].length];
  function stepDots(k) { root.querySelectorAll('.hw2__steps li').forEach(li => { const order = ['write', 'photo', 'check', 'result']; li.classList.toggle('is-on', li.dataset.s === k); li.classList.toggle('is-done', order.indexOf(li.dataset.s) < order.indexOf(k)); }); }
  // after each step, move keyboard/screen-reader focus to the step's main action
  function render() { draw(); requestAnimationFrame(() => { if (!root || root.hidden) return; const t = root.querySelector('#hwBody .hw2-btn:not([disabled]), #hwBody button:not([disabled])'); if (t && !root.contains(document.activeElement) || (t && document.activeElement === document.body)) t.focus({ preventScroll: true }); else if (t && st._step !== st.step) t.focus({ preventScroll: true }); st._step = st.step; }); }
  function draw() {
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
    if (s === 'write') {
      b.innerHTML = `<div class="hw2-book" dir="${st.lang === 'ar' ? 'rtl' : 'ltr'}"><div class="hw2-page">
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
        </div>${st.err ? `<p class="hw2-err" role="alert">${esc(st.err)}</p>` : ''}`;
      if (st.canvas) drawPreview();
      return;
    }
    if (s === 'check') {
      const q = st.q;
      b.innerHTML = `<div class="hw2-checks"><h3>${q.ok ? T('The photo looks good enough to read.', 'الصورة جيدة بما يكفي للقراءة.') : T('This photo isn’t clear enough to read reliably.', 'هذه الصورة ليست واضحة بما يكفي للقراءة بثقة.')}</h3>
        <ul>${q.checks.map(c => `<li class="${c.ok ? 'is-ok' : c.essential ? 'is-bad' : 'is-warn'}"><span>${c.ok ? '✓' : c.essential ? '✕' : '!'}</span>${esc(T({ light: 'Lighting', glare: 'No glare', contrast: 'Ink stands out from the paper', sharp: 'Sharp focus', amount: 'Enough writing in view', size: 'Writing large enough', rotation: 'Page the right way up', tilt: 'Page fairly straight', cropped: 'Nothing cut off at the edges', background: 'Plain background' }[c.id], { light: 'الإضاءة', glare: 'بلا وهج', contrast: 'الحبر يبرز عن الورق', sharp: 'وضوح التركيز', amount: 'كتابة كافية', size: 'حجم كتابة كافٍ', rotation: 'الصفحة في الاتجاه الصحيح', tilt: 'الصفحة مستقيمة تقريباً', cropped: 'لا شيء مقطوع عند الحواف', background: 'خلفية سادة' }[c.id]))}${c.ok ? '' : `<small>${esc(P(c.msg))}</small>`}</li>`).join('')}</ul>
        ${q.ok ? '' : `<p class="hw2-tip">${T('We won’t try to read an unclear photo — that would only produce guesses. You can try again whenever you’re ready.', 'لن نحاول قراءة صورة غير واضحة — فذلك ينتج تخمينات فقط. يمكنك المحاولة مجدداً متى شئت.')}</p>`}</div>
        <div class="hw2-row"><button type="button" class="hw2-ghost" data-a="retake">${T('Retake the photo', 'أعد التصوير')}</button>${q.ok ? `<button type="button" class="hw2-btn" data-a="read">${T('Read my writing', 'اقرأ كتابتي')}</button>` : ''}</div>`;
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
        <div class="hw2-stats"><div><b>${r.rates.matched}/${r.rates.words}</b><span>${T('expected words recognised', 'كلمات متوقعة مقروءة')}</span></div><div><b>${Math.round(r.conf)}%</b><span>${T('software confidence', 'ثقة البرنامج')}</span></div><div><b>${T('Good', 'جيدة')}</b><span>${T('photo quality', 'جودة الصورة')}</span></div></div>
        <div class="hw2-words" dir="${st.lang === 'ar' ? 'rtl' : 'ltr'}"><b>${T('What the software recognised', 'ما تعرّف عليه البرنامج')}</b>${map.map(line => `<p dir="auto">${line.map(x => `<span class="${x.found ? 'is-found' : 'is-missed'}">${esc(x.w)}</span>`).join(' ')}</p>`).join('')}<small>${T('Highlighted words weren’t matched by the software — that’s about recognition, not about whether they were written correctly.', 'الكلمات المظللة لم يطابقها البرنامج — هذا عن القراءة الآلية، لا عن صحة الكتابة.')}</small>
          <details><summary>${T('Show the raw recognised text', 'اعرض النص المقروء كما هو')}</summary><pre>${esc(r.text.trim() || '—')}</pre></details></div>
        <p class="hw2-tip">${T('Recognition uses Tesseract (open-source, running in this page). Measured on synthetic, font-rendered samples it reads clear print-like writing well, Arabic less reliably, and joined-up writing much less reliably. Its accuracy on real student handwriting has not been validated.', 'يستخدم التعرف برنامج Tesseract مفتوح المصدر داخل هذه الصفحة. في عيّنات اصطناعية قرأ الكتابة الواضحة جيداً، والعربية بدقة أقل، والكتابة المتصلة بضعف. لم تُقيَّم دقته على كتابة طلاب حقيقية.')}${st.lang === 'mix' ? ' ' + T('Mixed pages are experimental: Arabic lines are read much less reliably than English ones.', 'الصفحات المختلطة تجريبية: تُقرأ الأسطر العربية بدقة أقل بكثير من الإنجليزية.') : ''}</p>
        <div class="hw2-row"><button type="button" class="hw2-ghost" data-a="again">${T('Try again', 'حاول مجدداً')}</button><button type="button" class="hw2-ghost" data-a="other2">${T('Try different sentences', 'جرّب جملاً أخرى')}</button><a class="hw2-ghost" href="student.html#handoff" data-a="sas">${T('Talk to Student Accessibility Services', 'تحدث مع خدمات الطلبة ذوي الإعاقة')}</a><button type="button" class="hw2-btn" data-a="discard">${T('Discard and finish', 'احذف وأنهِ')}</button></div>
        <p class="hw2-privacy">🔒 ${T('Nothing from this check was saved. Discard deletes the photo and this result from memory now.', 'لم يُحفظ شيء من هذا الفحص. «احذف» يمسح الصورة والنتيجة من الذاكرة الآن.')}</p></div>`;
    }
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
    if (!st.crop) return c;
    const { x, y, w, h } = st.crop, o = document.createElement('canvas'); o.width = Math.round(w * sw); o.height = Math.round(h * sh);
    o.getContext('2d').drawImage(c, x * sw, y * sh, w * sw, h * sh, 0, 0, o.width, o.height); return o;
  }
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
  const grayOf = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height); return { gray: HW.toGray(d.data, c.width, c.height), width: c.width, height: c.height }; };
  function loadScript(src) { return new Promise((res, rej) => { if (window.Tesseract) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script')); document.head.appendChild(s); }); }
  async function recognise() {
    st.step = 'reading'; st.progress = 0.02; render();
    try {
      await loadScript(VENDOR + 'tesseract.min.js');
      if (!worker || workerLang !== st.lang) {
        if (worker) await worker.terminate();
        worker = await Tesseract.createWorker(st.lang === 'ar' ? 'ara' : st.lang === 'mix' ? 'ara+eng' : 'eng', 1, { workerPath: VENDOR + 'worker.min.js', corePath: VENDOR + 'core', langPath: VENDOR + 'lang', gzip: true, workerBlobURL: false, logger: m => { if (m.progress != null && st.step === 'reading') { st.progress = (/recogniz/.test(m.status) ? 0.4 : 0) + m.progress * 0.6; const i = root.querySelector('.hw2-bar i'); if (i) i.style.width = Math.round(st.progress * 100) + '%'; } } });
        workerLang = st.lang;
      }
      const img = grayOf(working()), prep = HW.prepare(img, st.q.stats.skew);
      const c = document.createElement('canvas'); c.width = prep.width; c.height = prep.height; const d = c.getContext('2d').createImageData(prep.width, prep.height);
      for (let i = 0; i < prep.gray.length; i++) { const v = prep.gray[i]; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
      c.getContext('2d').putImageData(d, 0, 0);
      const { data } = await worker.recognize(c);
      const rates = HW.errorRates(set().join(' '), data.text, st.lang === 'mix' ? 'ar' : st.lang);
      st.ocr = { text: data.text, conf: data.confidence || 0, rates, outcome: HW.outcome(rates, data.confidence || 0) };
      st.step = 'result';
    } catch (e) {
      console.error('ERLY handwriting: recognition failed', e);
      st.step = 'photo'; st.err = T('The reading software couldn’t start on this device, so nothing was analysed. Your photo is still here — you can try again.', 'تعذر تشغيل برنامج القراءة على هذا الجهاز، لذلك لم يُحلَّل شيء. صورتك ما زالت هنا.');
    }
    render();
  }

  /* ---------- events ---------- */
  function onClick(e) {
    const lb = e.target.closest('[data-lang]'); if (lb) { st.lang = lb.dataset.lang; st.set = 0; return render(); }
    const a = (e.target.closest('[data-a]') || {}).dataset; if (!a || !a.a) return;
    const k = a.a;
    if (k === 'close') return close();
    if (k === 'start') { if (!still() && !st.anim && e.target.closest('.hw2-btn')) { st.anim = true; root.querySelector('.hw2-intro').classList.add('is-leaving'); return setTimeout(() => { st.step = 'write'; render(); }, 650); } st.step = 'write'; return render(); }
    if (k === 'other' || k === 'other2') { st.set++; discard(); st.step = 'write'; return render(); }
    if (k === 'listen') { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(set().join(' … ')); u.lang = st.lang === 'ar' ? 'ar' : 'en-GB'; u.rate = 0.85; speechSynthesis.speak(u); } catch (er) { /* no speech */ } return; }
    if (k === 'tophoto' || k === 'back') { st.step = k === 'back' ? 'write' : 'photo'; return render(); }
    if (k === 'rotl' || k === 'rotr') { st.rot += k === 'rotl' ? -90 : 90; st.crop = null; return render(); }
    if (k === 'crop') { if (st.cropping) { st.crop = st.cropDraft; st.cropping = false; } else st.cropping = true; return render(); }
    if (k === 'retake' || k === 'remove' || k === 'again') { discard(); st.cropping = false; st.err = ''; st.step = 'photo'; return render(); }
    if (k === 'check') { st.cropping = false; st.q = HW.quality(grayOf(working())); st.step = 'check'; return render(); }
    if (k === 'read') return recognise();
    if (k === 'discard') { discard(); close(); ERLY.toast && ERLY.toast(T('Photo and result discarded.', 'تم حذف الصورة والنتيجة.')); return; }
    if (k === 'sas') { discard(); close(); return; }
  }
  function onChange(e) { const i = e.target.closest('[data-file]'); if (i && i.files && i.files[0]) { load(i.files[0]); i.value = ''; } }

  ERLY.on && ERLY.on('hand:open', open);
  window.ERLY.handwriting = { open, close, state: () => st, _working: () => (st && st.canvas ? working() : null) };
})();
document.addEventListener('click', e => { if (e.target.closest('[data-hand-open]')) window.ERLY && ERLY.emit('hand:open', { from: 'page' }); });
