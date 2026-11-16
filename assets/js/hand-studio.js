/* ERLY — Handwriting Studio (v20 rebuild).
   Flow: instructions → write (or a photo of paper) → review → recognise → result → discard.
   What is true about privacy here, and what the page says:
   • Writing and photos are held in this page's memory only. They are never uploaded and never written to storage.
   • Recognition runs in this page. Tesseract's English/Arabic data comes from this site. The optional handwriting
     model (TrOCR, ~64 MB) is downloaded only after the student presses its button, from the Hugging Face model hub;
     the browser caches the MODEL. The writing itself is never sent anywhere.
   • Only display preferences (paper, pen size, colour, guide) are remembered on this device, under erly-hand-prefs.
   • Discard wipes the strokes, the undo history, the photo, the exported image copies and the recognised text.
   It never judges handwriting, spelling or ability and never suggests any condition: confidence describes how sure
   the SOFTWARE is about what it read. */
(function () {
  'use strict';
  const HW = window.ERLY_HAND, HC = window.ERLY && ERLY.handCanvas, host = document.getElementById('hwStudio');
  if (!HW || !HC || !host) return;
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const P = pair => (Array.isArray(pair) ? T(pair[0], pair[1]) : String(pair || ''));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ICON = k => (window.ICON ? window.ICON(k) : '');
  const VENDOR = 'assets/vendor/tesseract/';
  const PREF_KEY = 'erly-hand-prefs';
  const COLOURS = [['#1c1b19', 'Graphite', 'غرافيت'], ['#1f3c88', 'Blue ink', 'حبر أزرق'], ['#7a2e1f', 'Sepia', 'بني'], ['#1e6b52', 'Green', 'أخضر']];
  const PAPERS = [['plain', 'Plain', 'سادة'], ['ruled', 'Ruled', 'مسطّر'], ['grid', 'Grid', 'مربعات'], ['dotted', 'Dotted', 'منقّط']];
  const SIZES = [[2.5, 'Fine', 'رفيع'], [4, 'Medium', 'متوسط'], [6.5, 'Bold', 'عريض']];
  const prefs = (() => { try { return Object.assign({ paper: 'ruled', size: 4, color: '#1c1b19', guide: false }, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { return { paper: 'ruled', size: 4, color: '#1c1b19', guide: false }; } })();
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* preferences are optional */ } };

  let st = fresh(), pad = null, worker = null, workerLang = null, photoURL = null;
  function fresh() { return { step: 'intro', lang: (window.I18N && I18N.lang === 'ar') ? 'ar' : 'en', set: 0, source: 'screen', photo: null, rot: 0, review: null, ocr: null, edit: '', progress: 0, err: '', engine: 'auto', wiped: null }; }
  const sentences = () => { const L = HW.PROMPTS[st.lang] || HW.PROMPTS.en; return L[st.set % L.length]; };
  const model = () => ERLY.handRec;
  const useModel = () => st.lang === 'en' && model() && model().ready() && st.engine !== 'tess';

  /* ---------- views ---------- */
  const STEPS = [['intro', 'Get ready', 'استعد'], ['write', 'Write', 'اكتب'], ['review', 'Review', 'راجع'], ['result', 'Result', 'النتيجة']];
  function stepper() {
    const at = st.step === 'reading' ? 'review' : st.step === 'done' ? 'result' : st.step, ix = STEPS.findIndex(s => s[0] === at);
    return `<ol class="hs-steps" aria-label="${T('Progress', 'التقدم')}">${STEPS.map((s, i) => `<li class="${i < ix ? 'is-done' : i === ix ? 'is-on' : ''}" ${i === ix ? 'aria-current="step"' : ''}><span>${i < ix ? '✓' : i + 1}</span>${T(s[1], s[2])}</li>`).join('')}</ol>`;
  }
  function prompt() {
    const s = sentences();
    return `<div class="hs-prompt" ${st.lang === 'ar' ? 'dir="rtl" lang="ar"' : ''}><span class="hs-prompt__k">${T('Copy these three sentences', 'انسخ هذه الجمل الثلاث')}</span><ol>${s.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <button type="button" class="hs-link" data-a="newset">${T('Different sentences', 'جمل أخرى')}</button></div>`;
  }
  function intro() {
    return `<section class="hs-card hs-intro" aria-labelledby="hsIntroH">
      <h2 id="hsIntroH">${T('How it works', 'كيف يعمل')}</h2>
      <ol class="hs-how">
        <li><b>${T('Write', 'اكتب')}</b><span>${T('Copy three short sentences on the page below with a stylus, finger or mouse — or write on paper and add a photo.', 'انسخ ثلاث جمل قصيرة بالقلم أو الإصبع أو الفأرة — أو اكتب على ورق وأضف صورة.')}</span></li>
        <li><b>${T('Review', 'راجع')}</b><span>${T('See exactly the image the reader will look at. Go back and change anything.', 'شاهد الصورة التي سيقرؤها البرنامج بالضبط، وعدّل ما تشاء.')}</span></li>
        <li><b>${T('Recognise', 'تعرّف')}</b><span>${T('Text-recognition software in this page tries to read it, and shows how sure it is about each word.', 'يحاول برنامج داخل الصفحة قراءة الكتابة ويبيّن مدى ثقته في كل كلمة.')}</span></li>
        <li><b>${T('Correct or discard', 'صحّح أو احذف')}</b><span>${T('Fix what it misread, try again, or delete everything.', 'صحّح ما أخطأ فيه، أو أعد المحاولة، أو احذف كل شيء.')}</span></li>
      </ol>
      <p class="hs-note">${T('This is not a test. It cannot judge your handwriting, spelling or ability, and it cannot detect dyslexia, dysgraphia or any other condition.', 'هذا ليس اختباراً. لا يقيّم خطك أو إملاءك أو قدرتك، ولا يكشف عسر القراءة أو الكتابة أو أي حالة.')}</p>
      <div class="hs-intro__go"><button type="button" class="btn btn--accent" data-a="start">${T('Start writing', 'ابدأ الكتابة')}</button><label class="btn btn--ghost hs-file">${T('Use a photo of paper instead', 'استخدم صورة لورقة بدلاً من ذلك')}<input type="file" accept="image/*" data-photo hidden></label></div>
    </section>`;
  }
  function toolbar() {
    const tool = pad ? pad.get('tool') : 'pen';
    const seg = (name, list, cur, label) => `<div class="hs-seg" role="radiogroup" aria-label="${label}">${list.map(([v, en, ar]) => `<button type="button" role="radio" aria-checked="${String(String(cur) === String(v))}" data-${name}="${v}" ${name === 'color' ? `style="--c:${v}" title="${T(en, ar)}" aria-label="${T(en, ar)}"` : ''}>${name === 'color' ? '<i aria-hidden="true"></i>' : T(en, ar)}</button>`).join('')}</div>`;
    return `<div class="hs-tools" role="toolbar" aria-label="${T('Writing tools', 'أدوات الكتابة')}">
      <div class="hs-seg" role="radiogroup" aria-label="${T('Tool', 'الأداة')}">
        <button type="button" role="radio" aria-checked="${tool === 'pen'}" data-tool="pen" title="${T('Pen (P)', 'قلم (P)')}">${ICON('pen')}<span>${T('Pen', 'قلم')}</span></button>
        <button type="button" role="radio" aria-checked="${tool === 'eraser'}" data-tool="eraser" title="${T('Eraser (E)', 'ممحاة (E)')}">${ICON('trash')}<span>${T('Eraser', 'ممحاة')}</span></button>
        <button type="button" role="radio" aria-checked="${tool === 'pan'}" data-tool="pan" title="${T('Move the page (H)', 'تحريك الصفحة (H)')}">${ICON('expand')}<span>${T('Move', 'تحريك')}</span></button>
      </div>
      ${seg('size', SIZES, prefs.size, T('Pen size', 'حجم القلم'))}
      ${seg('color', COLOURS, prefs.color, T('Ink colour', 'لون الحبر'))}
      <span class="hs-tools__sp"></span>
      <button type="button" class="hs-ib" data-a="undo" title="${T('Undo (Ctrl+Z)', 'تراجع')}" aria-label="${T('Undo', 'تراجع')}" ${pad && pad.canUndo() ? '' : 'disabled'}>↶</button>
      <button type="button" class="hs-ib" data-a="redo" title="${T('Redo (Ctrl+Shift+Z)', 'إعادة')}" aria-label="${T('Redo', 'إعادة')}" ${pad && pad.canRedo() ? '' : 'disabled'}>↷</button>
      <button type="button" class="hs-ib" data-a="clear" aria-label="${T('Clear the page', 'امسح الصفحة')}" title="${T('Clear the page', 'امسح الصفحة')}" ${pad && pad.strokes.length ? '' : 'disabled'}>${T('Clear', 'مسح')}</button>
    </div>`;
  }
  function pageBar() {
    const z = pad ? Math.round(pad.get('zoom') * 100) : 100;
    return `<div class="hs-pagebar">
      ${'' /* paper */}<div class="hs-seg hs-seg--sm" role="radiogroup" aria-label="${T('Paper', 'الورق')}">${PAPERS.map(([v, en, ar]) => `<button type="button" role="radio" aria-checked="${prefs.paper === v}" data-paper="${v}">${T(en, ar)}</button>`).join('')}</div>
      <label class="hs-check"><input type="checkbox" data-guide ${prefs.guide ? 'checked' : ''}> ${T('Letter-height guide', 'دليل ارتفاع الحروف')}</label>
      <span class="hs-tools__sp"></span>
      <div class="hs-zoom" role="group" aria-label="${T('Zoom', 'التكبير')}"><button type="button" class="hs-ib" data-a="zout" aria-label="${T('Zoom out', 'تصغير')}" ${z <= 100 ? 'disabled' : ''}>−</button><button type="button" class="hs-zoom__v" data-a="zreset" aria-label="${T('Reset zoom', 'إعادة التكبير')}">${z}%</button><button type="button" class="hs-ib" data-a="zin" aria-label="${T('Zoom in', 'تكبير')}" ${z >= 300 ? 'disabled' : ''}>+</button></div>
    </div>`;
  }
  function write() {
    return `${prompt()}
      <section class="hs-desk" aria-label="${T('Writing page', 'صفحة الكتابة')}">
        ${toolbar()}
        <div class="hs-surface" id="hsSurface"></div>
        ${pageBar()}
        <p class="hs-hint" id="hsHint">${T('Write anywhere on the page. Two fingers pan and zoom; with a stylus, your palm won’t draw.', 'اكتب في أي مكان. إصبعان للتحريك والتكبير؛ مع القلم الرقمي لن ترسم راحة يدك.')}</p>
      </section>
      ${st.err ? `<p class="hs-err" role="alert">${esc(st.err)}</p>` : ''}
      <div class="hs-actions"><button type="button" class="btn btn--accent" data-a="toreview" ${pad && !pad.isEmpty() ? '' : 'disabled'}>${T('Review my writing', 'راجع كتابتي')} →</button>
        <label class="btn btn--ghost hs-file">${T('Use a photo instead', 'استخدم صورة')}<input type="file" accept="image/*" data-photo hidden></label>
        <button type="button" class="btn btn--ghost" data-a="discard">${T('Discard', 'احذف')}</button></div>`;
  }
  function engineChoice() {
    if (st.lang !== 'en') return `<p class="hs-note">${T('Reader: Tesseract (runs in this page). The handwriting model reads English only.', 'القارئ: Tesseract داخل الصفحة. نموذج الكتابة اليدوية يقرأ الإنجليزية فقط.')}</p>`;
    const R = model();
    if (!R || !R.supported || !R.supported()) return `<p class="hs-note">${T('Reader: Tesseract (runs in this page).', 'القارئ: Tesseract داخل الصفحة.')}</p>`;
    if (!R.ready()) return `<div class="hs-engine"><p><b>${T('Optional: a reader trained on handwriting', 'اختياري: قارئ مدرّب على الكتابة اليدوية')}</b> ${T(`Tesseract (built in) was made for printed text. TrOCR-small-handwritten usually reads handwriting better. It is about ${R.SIZE_MB} MB, downloaded once from the Hugging Face model hub when you press the button, then cached by your browser. Your writing is not sent anywhere.`, `القارئ المدمج مصمم للنص المطبوع. نموذج TrOCR يقرأ الكتابة اليدوية أفضل غالباً. حجمه نحو ${R.SIZE_MB} ميغابايت ويُنزَّل مرة واحدة عند الضغط على الزر. كتابتك لا تُرسل.`)}</p>
      <button type="button" class="btn btn--ghost btn--sm" data-a="getmodel" ${R.status() === 'loading' ? 'aria-busy="true" disabled' : ''}>${R.status() === 'loading' ? T('Downloading…', 'جارٍ التنزيل…') : T('Download the handwriting reader', 'نزّل قارئ الكتابة اليدوية')}</button></div>`;
    return `<div class="hs-seg hs-seg--sm" role="radiogroup" aria-label="${T('Reader', 'القارئ')}"><button type="button" role="radio" data-engine="model" aria-checked="${st.engine !== 'tess'}">${T('Handwriting reader (TrOCR)', 'قارئ الكتابة اليدوية')}</button><button type="button" role="radio" data-engine="tess" aria-checked="${st.engine === 'tess'}">${T('Quick reader (Tesseract)', 'القارئ السريع')}</button></div>`;
  }
  function review() {
    const img = st.review;
    return `<section class="hs-card" aria-labelledby="hsRevH"><h2 id="hsRevH">${T('Review', 'المراجعة')}</h2>
      <p class="hs-sub">${st.source === 'photo' ? T('This is the photo the reader will look at. Rotate it if the lines don’t run across.', 'هذه هي الصورة التي سيقرؤها البرنامج. دوّرها إذا لم تكن الأسطر أفقية.') : T('This is exactly what the reader will look at: your ink in black on white, cropped to the writing. The paper lines are left out.', 'هذا ما سيقرؤه البرنامج بالضبط: الحبر بالأسود على الأبيض، دون خطوط الورق.')}</p>
      <figure class="hs-review"><img alt="${T('Preview of your writing', 'معاينة كتابتك')}" src="${img ? img.toDataURL('image/png') : ''}"></figure>
      ${st.source === 'photo' ? `<div class="hs-actions hs-actions--sm"><button type="button" class="btn btn--ghost btn--sm" data-a="rotate">${T('Rotate 90°', 'تدوير 90°')}</button></div>` : ''}
      ${st.err ? `<p class="hs-err" role="alert">${esc(st.err)}</p>` : ''}
      ${st.warn && st.warn.length ? `<ul class="hs-warn">${st.warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      ${engineChoice()}
      <div class="hs-actions"><button type="button" class="btn btn--accent" data-a="recognise">${T('Recognise', 'تعرّف على النص')}</button><button type="button" class="btn btn--ghost" data-a="back">← ${st.source === 'photo' ? T('Choose another photo', 'اختر صورة أخرى') : T('Back to writing', 'عُد إلى الكتابة')}</button><button type="button" class="btn btn--ghost" data-a="discard">${T('Discard', 'احذف')}</button></div>
    </section>`;
  }
  function reading() {
    return `<section class="hs-card hs-reading" aria-busy="true" aria-labelledby="hsReadH"><h2 id="hsReadH">${T('Reading your writing…', 'جارٍ قراءة كتابتك…')}</h2>
      <div class="hs-bar" role="progressbar" aria-label="${T('Recognition progress', 'تقدم التعرف')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(st.progress * 100)}"><i style="width:${Math.round(st.progress * 100)}%"></i></div>
      <p class="hs-sub">${T('Running in this page. The first time can take a little longer while the reader starts.', 'يعمل داخل الصفحة. قد تستغرق المرة الأولى وقتاً أطول.')}</p></section>`;
  }
  const FLAG = { ok: ['clear', 'واضحة'], uncertain: ['unsure', 'غير مؤكدة'], unreadable: ['unclear', 'غير واضحة'] };
  function result() {
    const r = st.ocr, words = r.words || [], unclear = words.filter(w => w.flag !== 'ok'), conf = Math.round(r.conf || 0);
    const map = HW.wordMap(sentences().join(' '), st.edit || r.text, st.lang === 'mix' ? 'ar' : st.lang), found = map.filter(m => m.found).length;
    // the verdict is about how well the SOFTWARE read what is on the page; how much of the prompt was copied is reported separately
    const read = !words.length || conf < 35 ? 'inconclusive' : conf >= 70 && unclear.length <= Math.ceil(words.length * 0.2) ? 'clear' : 'partial';
    r.outcome = read;
    const verdict = { clear: T('The software read your writing clearly.', 'قرأ البرنامج كتابتك بوضوح.'), partial: T('The software read some of it; some words were hard for it.', 'قرأ البرنامج جزءاً منها؛ بعض الكلمات كانت صعبة عليه.'), inconclusive: T('Inconclusive — the software could not read enough to say anything.', 'غير حاسم — لم يستطع البرنامج قراءة ما يكفي.') }[read];
    return `<section class="hs-card" aria-labelledby="hsResH"><h2 id="hsResH">${T('What the software read', 'ما قرأه البرنامج')}</h2>
      <div class="hs-res__top"><div class="hs-conf" style="--v:${conf}"><b>${conf}%</b><span>${T('software confidence', 'ثقة البرنامج')}</span></div>
        <div><p class="hs-verdict hs-verdict--${r.outcome}">${verdict}</p><p class="hs-sub">${T('Confidence is how sure the reading software is about its own guesses. It says nothing about you or your handwriting.', 'الثقة تعني مدى تأكد البرنامج من تخميناته. لا تقول شيئاً عنك أو عن خطك.')}</p></div></div>
      <h3 class="hs-h3">${T('Word by word', 'كلمة بكلمة')}</h3>
      <p class="hs-words" ${st.lang !== 'en' ? 'dir="auto"' : ''}>${words.length ? words.map(w => `<span class="hs-w hs-w--${w.flag}" title="${T(FLAG[w.flag][0], FLAG[w.flag][1])} · ${w.conf}%">${esc(w.text)}<small>${w.conf}%</small></span>`).join(' ') : `<em>${T('No words were recognised.', 'لم يتم التعرف على أي كلمة.')}</em>`}</p>
      <p class="hs-legend"><span class="hs-w hs-w--ok">${T('clear', 'واضحة')}</span><span class="hs-w hs-w--uncertain">${T('unsure', 'غير مؤكدة')}</span><span class="hs-w hs-w--unreadable">${T('unclear', 'غير واضحة')}</span></p>
      ${unclear.length ? `<p class="hs-sub"><b>${unclear.length}</b> ${T(unclear.length === 1 ? 'word the software was unsure about' : 'words the software was unsure about', 'كلمات لم يتأكد منها البرنامج')}: ${unclear.slice(0, 12).map(w => `“${esc(w.text)}”`).join(', ')}</p>` : ''}
      <h3 class="hs-h3"><label for="hsEdit">${T('Correct what it misread', 'صحّح ما أخطأ فيه')}</label></h3>
      <textarea id="hsEdit" class="hs-edit" rows="4" ${st.lang !== 'en' ? 'dir="auto"' : ''}>${esc(st.edit)}</textarea>
      <p class="hs-sub">${T('Your correction stays in this page and is removed by Discard. It updates the comparison below.', 'يبقى تصحيحك في هذه الصفحة ويُحذف عند الحذف.')}</p>
      <details class="hs-cmp"><summary>${T('Compare with the sentences you copied', 'قارن بالجمل التي نسختها')} <span class="hs-cmp__n">${found}/${map.length} ${T('words found', 'كلمات وُجدت')}</span></summary>
        <p class="hs-words" ${st.lang !== 'en' ? 'dir="auto"' : ''}>${map.map(m => `<span class="hs-w ${m.found ? 'hs-w--ok' : 'hs-w--miss'}">${esc(m.w)}</span>`).join(' ')}</p>
        <p class="hs-sub">${T('Highlighted words were found in the text above. A missing word usually means the software misread it — not that you wrote it wrongly.', 'الكلمات المظللة وُجدت في النص. الكلمة المفقودة تعني غالباً أن البرنامج أخطأ قراءتها.')}</p></details>
      <p class="hs-note">${r.engine === 'model' ? T('Read by TrOCR-small-handwritten, running in this page.', 'قُرئ بواسطة TrOCR داخل الصفحة.') : T('Read by Tesseract, running in this page.', 'قُرئ بواسطة Tesseract داخل الصفحة.')}</p>
      <div class="hs-actions"><button type="button" class="btn btn--accent" data-a="retry">${T('Try again', 'حاول مجدداً')}</button>${st.lang === 'en' && model() && model().ready() ? `<button type="button" class="btn btn--ghost" data-a="other">${r.engine === 'model' ? T('Read with Tesseract', 'اقرأ بـ Tesseract') : T('Read with the handwriting reader', 'اقرأ بقارئ الكتابة اليدوية')}</button>` : ''}<button type="button" class="btn btn--ghost" data-a="discard">${T('Discard everything', 'احذف كل شيء')}</button></div>
    </section>`;
  }
  function done() {
    const w = st.wiped || {};
    return `<section class="hs-card hs-done" aria-labelledby="hsDoneH" tabindex="-1"><h2 id="hsDoneH">${T('Discarded', 'تم الحذف')}</h2>
      <ul class="hs-wiped">${[w.strokes ? T(`${w.strokes} pen strokes and their undo history`, `${w.strokes} ضربة قلم وسجل التراجع`) : '', w.photo ? T('the photo', 'الصورة') : '', w.images ? T('the image copy prepared for the reader', 'نسخة الصورة المعدّة للقارئ') : '', w.text ? T('the recognised and corrected text', 'النص المعروف والمصحّح') : ''].filter(Boolean).map(x => `<li>${x}</li>`).join('') || `<li>${T('There was nothing to delete.', 'لم يكن هناك ما يُحذف.')}</li>`}</ul>
      <p class="hs-sub">${T('These were removed from this page. Nothing was uploaded or saved, so no other copy exists.', 'حُذفت من هذه الصفحة. لم يُرفع أو يُحفظ شيء، فلا توجد نسخة أخرى.')}</p>
      <div class="hs-actions"><button type="button" class="btn btn--accent" data-a="start">${T('Write again', 'اكتب مجدداً')}</button><a class="btn btn--ghost" href="student.html">${T('Back to the dashboard', 'العودة إلى لوحة الطالب')}</a></div></section>`;
  }

  /* ---------- render ---------- */
  function render(focus) {
    if (st.step !== 'write' && pad) { /* keep the page alive across views so Back returns to the same writing */ }
    const body = { intro, write, review, reading, result, done }[st.step]();
    const surfaceKept = st.step === 'write' && pad && host.querySelector('#hsSurface');
    if (surfaceKept) { // re-render around the live surface without destroying it
      const keep = host.querySelector('.hsc');
      host.innerHTML = stepper() + body;
      host.querySelector('#hsSurface').replaceWith(keep); keep.id = 'hsSurface';
      pad.layout();
    } else {
      host.innerHTML = stepper() + body;
      if (st.step === 'write') mountPad();
    }
    if (focus) { const h = host.querySelector('h2, .hs-prompt'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: false }); } }
  }
  function mountPad() {
    const el = host.querySelector('#hsSurface');
    if (pad && pad._el) { el.replaceWith(pad._el); pad._el.id = 'hsSurface'; pad.layout(); return; }
    pad = HC.create(el, { paper: prefs.paper, size: prefs.size, color: prefs.color, guide: prefs.guide, onChange: syncTools });
    pad._el = el;
    pad.viewport.setAttribute('aria-label', T('Writing page. Use a stylus, finger or mouse. Keyboard: P pen, E eraser, H move, Ctrl+Z undo, plus and minus to zoom.', 'صفحة الكتابة.'));
  }
  function syncTools() {
    if (!pad || st.step !== 'write') return;
    const q = s => host.querySelector(s);
    const set = (s, on) => { const b = q(s); if (b) b.disabled = !on; };
    set('[data-a="undo"]', pad.canUndo()); set('[data-a="redo"]', pad.canRedo()); set('[data-a="clear"]', pad.strokes.length > 0); set('[data-a="toreview"]', !pad.isEmpty());
    host.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.tool === pad.get('tool'))));
    const z = Math.round(pad.get('zoom') * 100), zv = q('.hs-zoom__v'); if (zv) zv.textContent = z + '%'; set('[data-a="zout"]', z > 100); set('[data-a="zin"]', z < 300);
    const h = q('#hsHint'); if (h) h.classList.toggle('is-quiet', pad.strokes.length > 0);
  }

  /* ---------- photo ---------- */
  function loadPhoto(file) {
    if (!file || !/^image\//.test(file.type)) { st.err = T('Please choose an image file.', 'اختر ملف صورة.'); return render(); }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); img.src = '';
      st.photo = c; st.rot = 0; st.source = 'photo'; st.err = ''; toReview();
    };
    img.onerror = () => { URL.revokeObjectURL(url); st.err = T('That image couldn’t be opened.', 'تعذر فتح الصورة.'); render(); };
    img.src = url;
  }
  function rotated(c, deg) { if (!deg) return c; const r = document.createElement('canvas'), q = deg % 180 !== 0; r.width = q ? c.height : c.width; r.height = q ? c.width : c.height; const x = r.getContext('2d'); x.translate(r.width / 2, r.height / 2); x.rotate(deg * Math.PI / 180); x.drawImage(c, -c.width / 2, -c.height / 2); return r; }
  const grayOf = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height); return { gray: HW.toGray(d.data, c.width, c.height), width: c.width, height: c.height }; };

  function toReview() {
    st.err = ''; st.warn = [];
    if (st.source === 'photo') st.review = rotated(st.photo, st.rot);
    else st.review = pad.exportImage({ scale: 1 });
    if (!st.review) { st.step = 'write'; st.err = T('There’s no writing on the page yet.', 'لا توجد كتابة بعد.'); return render(); }
    const q = HW.quality(grayOf(st.review)); st.q = q;
    const ids = st.source === 'photo' ? null : ['amount', 'size'];
    st.warn = q.checks.filter(c => !c.ok && (!ids || ids.includes(c.id))).map(c => P(c.msg));
    st.step = 'review'; render(true);
  }

  /* ---------- recognition ---------- */
  function loadScript(src) { return new Promise((res, rej) => { if (window.Tesseract) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script')); document.head.appendChild(s); }); }
  const bar = () => { const i = host.querySelector('.hs-bar i'), b = host.querySelector('.hs-bar'); if (i) i.style.width = Math.round(st.progress * 100) + '%'; if (b) b.setAttribute('aria-valuenow', Math.round(st.progress * 100)); };
  async function recognise() {
    st.step = 'reading'; st.progress = 0.03; st.err = ''; render(true);
    const expected = sentences().join(' ');
    try {
      if (useModel()) {
        const r = await model().readPage(st.review, p => { st.progress = 0.05 + p * 0.95; bar(); });
        const rates = HW.errorRates(expected, r.text, 'en');
        st.ocr = { engine: 'model', text: r.text, conf: r.conf, rates, outcome: HW.outcome(rates, r.conf), words: HW.flagWords(r.words.map(w => ({ text: w.text, confidence: w.conf }))) };
      } else {
        await loadScript(VENDOR + 'tesseract.min.js');
        if (!worker || workerLang !== st.lang) {
          if (worker) await worker.terminate();
          worker = await Tesseract.createWorker(st.lang === 'ar' ? 'ara' : st.lang === 'mix' ? 'ara+eng' : 'eng', 1, { workerPath: VENDOR + 'worker.min.js', corePath: VENDOR + 'core', langPath: VENDOR + 'lang', gzip: true, workerBlobURL: false, logger: m => { if (m.progress != null && st.step === 'reading') { st.progress = (/recogniz/.test(m.status) ? 0.4 : 0) + m.progress * 0.6; bar(); } } });
          workerLang = st.lang;
        }
        const img = grayOf(st.review), q = st.q || HW.quality(img);
        const prep = HW.prepare(img, st.source === 'photo' ? q.stats.skew : 0, { source: true, uneven: st.source === 'photo' && q.stats.uneven > 0.2, letterHeight: q.stats.letterHeight });
        const c = document.createElement('canvas'); c.width = prep.width; c.height = prep.height; const d = c.getContext('2d').createImageData(prep.width, prep.height);
        for (let i = 0; i < prep.gray.length; i++) { const v = prep.gray[i]; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
        c.getContext('2d').putImageData(d, 0, 0);
        const { data } = await worker.recognize(c, {}, { text: true, blocks: true });
        c.width = c.height = 0;
        const ws = (data.blocks || []).flatMap(b => b.paragraphs || []).flatMap(p => p.lines || []).flatMap(l => l.words || []);
        const text = data.text || '', conf = data.confidence || 0, rates = HW.errorRates(expected, text, st.lang === 'mix' ? 'ar' : st.lang);
        st.ocr = { engine: 'tess', text, conf, rates, outcome: HW.outcome(rates, conf), words: HW.flagWords(ws.length ? ws : (data.words || [])) };
      }
      st.edit = st.ocr.text.trim(); st.step = 'result';
    } catch (e) {
      console.error('ERLY handwriting: recognition failed', e);
      st.step = 'review'; st.err = T('The reading software couldn’t run on this device, so nothing was analysed. Your writing is still here — try again or use the other reader.', 'تعذر تشغيل برنامج القراءة على هذا الجهاز. كتابتك ما زالت هنا.');
      if (useModel()) st.engine = 'tess';
    }
    render(true);
  }

  /* ---------- discard: really wipe what this page holds ---------- */
  function discard() {
    const w = { strokes: pad ? pad.inkCount() : 0, photo: !!st.photo, images: !!st.review, text: !!(st.ocr || st.edit) };
    if (pad) { pad.destroy(); pad = null; }
    for (const c of [st.photo, st.review]) if (c) { c.width = c.height = 0; }
    if (photoURL) { URL.revokeObjectURL(photoURL); photoURL = null; }
    const lang = st.lang, set = st.set;
    st = fresh(); st.lang = lang; st.set = set; st.step = 'done'; st.wiped = w;
    render(true);
  }

  /* ---------- events ---------- */
  host.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const a = b.dataset.a;
    if (b.dataset.tool && pad) { pad.set('tool', b.dataset.tool); return syncTools(); }
    if (b.dataset.size) { prefs.size = +b.dataset.size; savePrefs(); pad && pad.set('size', prefs.size); b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b))); return; }
    if (b.dataset.color) { prefs.color = b.dataset.color; savePrefs(); if (pad) { pad.set('color', prefs.color); pad.set('tool', 'pen'); } b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b))); return syncTools(); }
    if (b.dataset.paper) { prefs.paper = b.dataset.paper; savePrefs(); pad && pad.set('paper', prefs.paper); b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b))); return; }
    if (b.dataset.engine) { st.engine = b.dataset.engine; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b))); return; }
    if (a === 'start') { st.step = 'write'; st.source = 'screen'; st.err = ''; render(true); }
    else if (a === 'newset') { st.set++; render(); }
    else if (a === 'undo') pad.undo();
    else if (a === 'redo') pad.redo();
    else if (a === 'clear') { pad.clear(); window.ERLY.toast && ERLY.toast(T('Page cleared — Undo brings it back.', 'مُسحت الصفحة — التراجع يعيدها.')); }
    else if (a === 'zin') pad.zoomIn(); else if (a === 'zout') pad.zoomOut(); else if (a === 'zreset') pad.zoomReset();
    else if (a === 'toreview') toReview();
    else if (a === 'rotate') { st.rot = (st.rot + 90) % 360; toReview(); }
    else if (a === 'back') { st.step = st.source === 'photo' ? 'intro' : 'write'; if (st.source === 'photo') { if (st.photo) st.photo.width = 0; st.photo = null; } st.err = ''; render(true); }
    else if (a === 'recognise') recognise();
    else if (a === 'retry') { st.ocr = null; st.edit = ''; st.step = st.source === 'photo' ? 'review' : 'write'; render(true); }
    else if (a === 'other') { st.engine = st.ocr.engine === 'model' ? 'tess' : 'model'; recognise(); }
    else if (a === 'discard') discard();
    else if (a === 'getmodel') { b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = T('Downloading…', 'جارٍ التنزيل…'); model().load(p => { b.textContent = T('Downloading…', 'جارٍ التنزيل…') + ' ' + Math.round(p * 100) + '%'; }).then(() => { st.engine = 'model'; render(); }).catch(() => { st.err = T('The handwriting reader couldn’t be downloaded. The quick reader still works.', 'تعذر تنزيل القارئ. القارئ السريع ما زال يعمل.'); render(); }); }
  });
  host.addEventListener('change', e => {
    if (e.target.matches('[data-photo]')) loadPhoto(e.target.files && e.target.files[0]);
    if (e.target.matches('[data-guide]')) { prefs.guide = e.target.checked; savePrefs(); pad && pad.set('guide', prefs.guide); }
  });
  host.addEventListener('input', e => { if (e.target.id === 'hsEdit') { st.edit = e.target.value; const map = HW.wordMap(sentences().join(' '), st.edit, st.lang === 'mix' ? 'ar' : st.lang), cmp = host.querySelector('.hs-cmp .hs-words'), n = host.querySelector('.hs-cmp__n'); if (cmp) cmp.innerHTML = map.map(m => `<span class="hs-w ${m.found ? 'hs-w--ok' : 'hs-w--miss'}">${esc(m.w)}</span>`).join(' '); if (n) n.textContent = `${map.filter(m => m.found).length}/${map.length} ${T('words found', 'كلمات وُجدت')}`; } });
  document.addEventListener('keydown', e => {
    if (st.step !== 'write' || !pad || e.target.matches('input, textarea, select')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? pad.redo() : pad.undo(); }
    else if (mod && k === 'y') { e.preventDefault(); pad.redo(); }
    else if (mod) return;
    else if (k === 'p') { pad.set('tool', 'pen'); syncTools(); } else if (k === 'e') { pad.set('tool', 'eraser'); syncTools(); } else if (k === 'h') { pad.set('tool', 'pan'); syncTools(); }
    else if (k === '+' || k === '=') pad.zoomIn(); else if (k === '-') pad.zoomOut(); else if (k === '0') pad.zoomReset();
  });
  // leaving the page also drops everything (nothing is ever written to storage)
  window.addEventListener('pagehide', () => { if (pad) pad.wipe(); });

  window.ERLY.handwriting = {
    state: () => st, pad: () => pad,
    setLang(l) { st.lang = l; st.set = 0; if (st.step === 'result' || st.step === 'review') { st.step = st.source === 'photo' ? 'intro' : 'write'; } render(); },
    rerender: () => render(), discard
  };
  render();
})();
