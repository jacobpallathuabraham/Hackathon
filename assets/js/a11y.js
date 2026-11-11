/* ERLY — Accessibility Control Centre (every page), v15.

   One central state ("erly-a11y" in this browser only), applied as classes and
   CSS variables on <html> — no re-rendering of the page, so every control
   responds immediately and settings never fight each other. Organised as:
     Reading      text size · reading-friendly font · line / letter / word spacing
                  · reading width · reading guide · read aloud (play, pause, resume,
                  stop, voice, speed)
     Visual       theme (light / dark / system) · high contrast · colour tint
                  · fewer distractions · underline links
     Interaction  stop animations (on automatically when the device asks for
                  reduced motion) · bold focus ring · larger click targets
     Learning     how Noor explains: shorter, step by step, more examples,
                  information density, suggest visuals, speak replies
   ERLY never guesses or labels anyone: these are the student's own choices.
   Open with the floating button (bottom-left) or Alt+A. Esc closes; focus returns. */
(function () {
  'use strict';
  const KEY = 'erly-a11y';
  const html = document.documentElement;
  const T = (en, ar) => ((window.I18N && I18N.lang === 'ar') || html.lang === 'ar' ? ar : en);
  const osStill = matchMedia('(prefers-reduced-motion: reduce)');
  const DEF = { size: 100, contrast: false, still: null, font: false, spacing: false, links: false, focus: false, rate: 1, voice: '', line: 0, letter: 0, word: 0, width: 'full', guide: false, tint: 'none', calm: false, targets: false, cursor: false, focusmode: false, learn: { short: false, steps: false, examples: false, dense: 'normal' }, tab: 'reading' };
  let st = JSON.parse(JSON.stringify(DEF));
  try { const saved = JSON.parse(localStorage.getItem(KEY) || '{}'); st = Object.assign(st, saved, { learn: Object.assign({}, DEF.learn, saved.learn || {}) }); } catch (e) { /* storage blocked: defaults */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* not persisted */ } };
  const still = () => (st.still === null ? osStill.matches : !!st.still); // follows the device until the student chooses
  const LINES = [0, 1.6, 1.9, 2.2], LETTERS = [0, 0.05, 0.12], WORDS = [0, 0.16, 0.32];
  const WIDTHS = { full: '', comfy: '70ch', narrow: '58ch' };
  const TINTS = { none: '', cream: 'rgba(255, 236, 179, .22)', blue: 'rgba(147, 197, 253, .2)', green: 'rgba(167, 243, 208, .2)', grey: 'rgba(148, 163, 184, .18)' };

  /* ---------- apply: classes + variables only ---------- */
  function apply() {
    html.style.setProperty('--a11y-zoom', st.size / 100);
    html.classList.toggle('a11y-zoom', st.size !== 100);
    html.classList.toggle('a11y-contrast', !!st.contrast);
    html.classList.toggle('a11y-still', still());
    html.classList.toggle('a11y-font', !!st.font);
    html.classList.toggle('a11y-spacing', !!st.spacing);
    html.classList.toggle('a11y-links', !!st.links);
    html.classList.toggle('a11y-focus', !!st.focus);
    html.classList.toggle('a11y-targets', !!st.targets);
    html.classList.toggle('a11y-calm', !!st.calm || !!st.focusmode);
    html.classList.toggle('a11y-cursor', !!st.cursor);
    html.classList.toggle('a11y-focusmode', !!st.focusmode); focusMode(!!st.focusmode);
    html.classList.toggle('a11y-line', !!st.line); html.style.setProperty('--a11y-line', st.line || 'normal');
    html.classList.toggle('a11y-letter', !!st.letter); html.style.setProperty('--a11y-letter', (st.letter || 0) + 'em');
    html.classList.toggle('a11y-word', !!st.word); html.style.setProperty('--a11y-word', (st.word || 0) + 'em');
    html.classList.toggle('a11y-width', st.width !== 'full'); html.style.setProperty('--a11y-width', WIDTHS[st.width] || 'none');
    html.classList.toggle('a11y-tint', st.tint !== 'none'); html.style.setProperty('--a11y-tint', TINTS[st.tint] || 'transparent');
    guide(st.guide);
    if (window.ERLY && ERLY.navfit) ERLY.navfit();
    const on = st.size !== 100 || st.contrast || st.still || st.font || st.spacing || st.links || st.focus || st.targets || st.calm || st.line || st.letter || st.word || st.width !== 'full' || st.tint !== 'none' || st.guide || st.cursor || st.focusmode;
    if (btn) btn.classList.toggle('is-on', !!on);
  }
  osStill.addEventListener && osStill.addEventListener('change', () => { if (st.still === null) { apply(); if (panel && !panel.hidden) render(); } });

  /* ---------- theme: light / dark / follow the device ---------- */
  const themePref = () => { try { return localStorage.getItem('erly-theme') || 'system'; } catch (e) { return 'system'; } };
  const osDark = matchMedia('(prefers-color-scheme: dark)');
  function setTheme(v) {
    try { localStorage.setItem('erly-theme', v); } catch (e) { /* not persisted */ }
    const want = v === 'system' ? (osDark.matches ? 'dark' : 'light') : v;
    if (html.dataset.theme !== want) { const b = document.getElementById('themeToggle'); if (b && window.ERLY_FX && !still()) { b.click(); try { localStorage.setItem('erly-theme', v); } catch (e) { /* ok */ } } else html.dataset.theme = want; }
  }
  osDark.addEventListener && osDark.addEventListener('change', () => { if (themePref() === 'system') html.dataset.theme = osDark.matches ? 'dark' : 'light'; });

  /* ---------- reading guide: a soft band that follows the pointer or keyboard focus ---------- */
  let band = null;
  function guide(on) {
    if (on && !band) {
      band = document.createElement('div'); band.className = 'a11y-guide'; band.setAttribute('aria-hidden', 'true'); html.appendChild(band);
      addEventListener('pointermove', moveBand, { passive: true }); document.addEventListener('focusin', focusBand);
    } else if (!on && band) { band.remove(); band = null; removeEventListener('pointermove', moveBand); document.removeEventListener('focusin', focusBand); }
  }
  function moveBand(e) { if (band) band.style.transform = `translateY(${e.clientY - 22}px)`; }
  function focusBand(e) { if (!band) return; const r = e.target.getBoundingClientRect(); band.style.transform = `translateY(${r.top + r.height / 2 - 22}px)`; }

  /* ---------- panel ---------- */
  const ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.8" fill="currentColor"/><path d="M5 8.6l7 1.6 7-1.6M12 10.2v4.3m0 0l-3 6m3-6l3 6"/></svg>';
  let btn = null, panel = null, lastFocus = null;
  const sw = (k, en, ar, sub, val) => `<label class="a11y__row"><span><b>${T(en, ar)}</b>${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" role="switch" data-k="${k}" ${val ? 'checked' : ''}><i aria-hidden="true"></i></label>`;
  const seg = (k, label, opts, cur) => `<div class="a11y__seg" role="radiogroup" aria-label="${label}"><b>${label}</b><div>${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${String(cur) === String(v)}" data-seg="${k}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  const TABS = [['reading', 'Reading', 'القراءة'], ['visual', 'Visual', 'المرئيات'], ['interaction', 'Interaction', 'التفاعل'], ['learning', 'Learning', 'التعلّم']];
  function build() {
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'a11y-fab'; btn.id = 'a11yFab';
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'a11yPanel');
    btn.setAttribute('aria-label', T('Accessibility settings (Alt+A)', 'إعدادات سهولة الوصول (Alt+A)'));
    btn.title = T('Accessibility (Alt+A)', 'سهولة الوصول (Alt+A)');
    btn.innerHTML = ICON;
    panel = document.createElement('div');
    panel.className = 'a11y'; panel.id = 'a11yPanel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false'); panel.setAttribute('aria-labelledby', 'a11yTitle');
    render();
    // outside <body>, so the text-size zoom (applied to body) never moves or clips the controls themselves
    html.append(btn, panel);
    btn.addEventListener('click', () => (panel.hidden ? open() : close()));
    apply();
  }
  function pane() {
    const L = st.learn, vs = (() => { try { return (JSON.parse(localStorage.getItem('erly-companion-v1') || '{}').prefs || {}); } catch (e) { return {}; } })();
    if (st.tab === 'visual') return `
      ${seg('theme', T('Theme', 'المظهر'), [['light', T('Light', 'فاتح')], ['dark', T('Dark', 'داكن')], ['system', T('System', 'النظام')]], themePref())}
      ${sw('contrast', 'High contrast', 'تباين عالٍ', T('Stronger text and borders, no see-through panels', 'نص وحدود أقوى بلا لوحات شفافة'), st.contrast)}
      ${seg('tint', T('Colour tint', 'لون التظليل'), [['none', T('None', 'بلا')], ['cream', T('Cream', 'كريمي')], ['blue', T('Blue', 'أزرق')], ['green', T('Green', 'أخضر')], ['grey', T('Grey', 'رمادي')]], st.tint)}
      ${sw('focusmode', 'Focus mode', 'وضع التركيز', T('Dims everything except the part you’re reading; hides decoration. Navigation stays.', 'يخفّف كل شيء عدا الجزء الذي تقرؤه؛ ويُبقي التنقل.'), st.focusmode)}
      ${sw('calm', 'Fewer distractions', 'تقليل المشتتات', T('Hides moving tickers and decorative backgrounds', 'يخفي الأشرطة المتحركة والخلفيات الزخرفية'), st.calm)}
      ${sw('links', 'Underline links', 'تسطير الروابط', '', st.links)}`;
    if (st.tab === 'interaction') return `
      ${sw('still', 'Stop animations', 'إيقاف الحركة', st.still === null ? T(`Following your device (${osStill.matches ? 'reduced motion is on' : 'motion allowed'})`, 'يتبع إعداد جهازك') : T('No moving backgrounds or transitions', 'بلا خلفيات متحركة أو انتقالات'), still())}
      ${sw('focus', 'Bold focus ring', 'إطار تركيز واضح', T('Easier to follow keyboard focus', 'أسهل لتتبّع تركيز لوحة المفاتيح'), st.focus)}
      ${sw('cursor', 'Large pointer', 'مؤشر كبير', T('A bigger, high-contrast mouse pointer (mouse and trackpad)', 'مؤشر فأرة أكبر وعالي التباين'), st.cursor)}
      ${sw('targets', 'Larger click targets', 'أهداف نقر أكبر', T('Buttons and links at least 44 × 44 px', 'أزرار وروابط بحجم ٤٤ بكسل على الأقل'), st.targets)}
      <p class="a11y__note">${T('Keyboard: Tab moves between controls, Enter or Space activates, Esc closes panels. Alt+A opens this panel; Alt+N opens Noor.', 'لوحة المفاتيح: Tab للتنقل، Enter أو Space للتفعيل، Esc للإغلاق. Alt+A يفتح هذه اللوحة؛ Alt+N يفتح نور.')}</p>`;
    if (st.tab === 'learning') return `
      <p class="a11y__note">${T('These change how Noor explains things to you. Nothing here is a label — change them any time.', 'هذه تغيّر طريقة شرح نور لك. لا شيء هنا تصنيف — غيّرها متى شئت.')}</p>
      ${sw('learn.short', 'Shorter instructions', 'تعليمات أقصر', T('Brief answers first; ask to expand', 'إجابات موجزة أولاً'), L.short)}
      ${sw('learn.steps', 'Step-by-step explanations', 'شرح خطوة بخطوة', '', L.steps)}
      ${sw('learn.examples', 'More examples', 'أمثلة أكثر', '', L.examples)}
      ${seg('learn.dense', T('Information density', 'كثافة المعلومات'), [['light', T('Light', 'خفيفة')], ['normal', T('Normal', 'عادية')], ['rich', T('Rich', 'غنية')]], L.dense)}
      ${sw('suggestVisuals', 'Suggest visual explanations', 'اقتراح شروحات مرئية', T('Noor may offer a diagram when it would help (off: only when you ask)', 'قد تقترح نور مخططاً عند الحاجة'), !!((vs.vs || {}).suggestVisuals))}
      ${sw('speakReplies', 'Read Noor’s replies aloud', 'قراءة ردود نور بصوت', T('Off by default: Noor speaks only when you ask, or when this is on', 'مغلق افتراضياً: تتحدث نور عندما تطلب ذلك أو عند تفعيل هذا'), vs.readAloud === true)}`;
    // reading
    return `
      <div class="a11y__size" role="group" aria-label="${T('Text size', 'حجم النص')}"><b>${T('Text size', 'حجم النص')}</b><div>${[90, 100, 112, 125, 140].map(v => `<button type="button" data-size="${v}" aria-pressed="${st.size === v}">${v === 100 ? 'A' : v < 100 ? 'A−' : 'A+'}<small>${v}%</small></button>`).join('')}</div></div>
      ${sw('font', 'Reading-friendly font', 'خط مريح للقراءة', T('Clear, open letter shapes', 'حروف واضحة ومفتوحة'), st.font)}
      ${seg('line', T('Line spacing', 'تباعد الأسطر'), LINES.map((v, i) => [v, [T('Default', 'افتراضي'), '1.6', '1.9', '2.2'][i]]), st.line)}
      ${seg('letter', T('Letter spacing', 'تباعد الحروف'), LETTERS.map((v, i) => [v, [T('Default', 'افتراضي'), T('Wide', 'واسع'), T('Wider', 'أوسع')][i]]), st.letter)}
      ${seg('word', T('Word spacing', 'تباعد الكلمات'), WORDS.map((v, i) => [v, [T('Default', 'افتراضي'), T('Wide', 'واسع'), T('Wider', 'أوسع')][i]]), st.word)}
      ${seg('width', T('Reading width', 'عرض القراءة'), [['full', T('Full', 'كامل')], ['comfy', T('Comfortable', 'مريح')], ['narrow', T('Narrow', 'ضيق')]], st.width)}
      ${sw('guide', 'Reading guide', 'دليل القراءة', T('A soft band follows your pointer or focus', 'شريط خفيف يتبع المؤشر أو التركيز'), st.guide)}
      ${sw('spacing', 'WCAG text spacing preset', 'إعداد تباعد WCAG', T('Line, letter and word spacing together (WCAG 1.4.12)', 'تباعد الأسطر والحروف والكلمات معاً'), st.spacing)}
      <div class="a11y__read"><b>${T('Read aloud', 'القراءة بصوت')}</b><small>${T('Plays the text you selected — or, with nothing selected, the main content of this page. Each sentence is highlighted as it is read.', 'يقرأ النص المحدد — أو المحتوى الرئيسي للصفحة إن لم تحدد شيئاً. تُميَّز كل جملة أثناء قراءتها.')}</small>
        <div class="a11y__readrow"><button type="button" data-a="read">${T('▶ Play', '▶ تشغيل')}</button><button type="button" data-a="pause">${T('❚❚ Pause', '❚❚ إيقاف مؤقت')}</button><button type="button" data-a="resume">${T('↻ Resume', '↻ استئناف')}</button><button type="button" data-a="stop">${T('■ Stop', '■ إيقاف')}</button></div>
        <div class="a11y__readrow"><label>${T('Voice', 'الصوت')} <select data-k="voice" aria-label="${T('Voice', 'الصوت')}"><option value="">${T('Default', 'افتراضي')}</option>${voices().map(v => `<option value="${v.name}" ${st.voice === v.name ? 'selected' : ''}>${v.name.slice(0, 32)}</option>`).join('')}</select></label>
        <label>${T('Speed', 'السرعة')} <input type="range" min="0.6" max="1.6" step="0.1" value="${st.rate}" data-k="rate" aria-label="${T('Reading speed', 'سرعة القراءة')}"><output>${(+st.rate).toFixed(1)}×</output></label></div></div>`;
  }
  function render() {
    const focusKey = panel && document.activeElement && panel.contains(document.activeElement) ? (document.activeElement.dataset.k || document.activeElement.dataset.v || document.activeElement.dataset.tab || document.activeElement.dataset.size) : null;
    panel.innerHTML = `
      <header class="a11y__h"><div><b id="a11yTitle">${T('Accessibility', 'سهولة الوصول')}</b><small>${T('Your choices, saved only on this device.', 'اختياراتك، محفوظة على هذا الجهاز فقط.')}</small></div><button type="button" class="a11y__x" data-a="close" aria-label="${T('Close', 'إغلاق')}">✕</button></header>
      <div class="a11y__tabs" role="tablist" aria-label="${T('Settings groups', 'مجموعات الإعدادات')}">${TABS.map(([k, en, ar]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${st.tab === k}">${T(en, ar)}</button>`).join('')}</div>
      <div class="a11y__pane" role="tabpanel">${pane()}</div>
      <footer class="a11y__f"><button type="button" data-a="reset">${T('Reset all', 'إعادة الضبط')}</button><span>${changed() ? T(`${changed()} changed · `, `${changed()} مُعدّل · `) : ''}ERLY v15 · Alt+A</span></footer>`;
    if (focusKey) { const f = panel.querySelector(`[data-k="${focusKey}"], [data-tab="${focusKey}"][aria-selected="true"], [data-size="${focusKey}"]`); if (f) f.focus(); }
  }
  function voices() { try { const l = (html.lang || 'en').slice(0, 2); return (speechSynthesis.getVoices() || []).filter(v => v.lang && v.lang.slice(0, 2) === l).slice(0, 30); } catch (e) { return []; } }
  if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { if (panel && st.tab === 'reading') render(); });
  function companionPref(patch) { // the Learning section writes Noor's own preferences, so Noor and this panel always agree
    try { const db = JSON.parse(localStorage.getItem('erly-companion-v1') || '{}'); db.prefs = db.prefs || {}; if (patch.vs) db.prefs.vs = Object.assign({}, db.prefs.vs || {}, patch.vs); if ('readAloud' in patch) db.prefs.readAloud = patch.readAloud; localStorage.setItem('erly-companion-v1', JSON.stringify(db)); } catch (e) { /* not persisted */ }
  }
  function onClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { st.tab = b.dataset.tab; save(); render(); panel.querySelector(`[data-tab="${st.tab}"]`).focus(); return; }
    if (b.dataset.size) { st.size = +b.dataset.size; save(); apply(); panel.querySelectorAll('[data-size]').forEach(x => x.setAttribute('aria-pressed', x === b)); announce(T(`Text size ${st.size}%`, `حجم النص ${st.size}٪`)); refreshFoot(); return; }
    if (b.dataset.seg) {
      const k = b.dataset.seg, raw = b.dataset.v, v = /^-?[\d.]+$/.test(raw) ? +raw : raw;
      if (k === 'theme') setTheme(v); else if (k.startsWith('learn.')) st.learn[k.slice(6)] = v; else st[k] = v;
      save(); apply(); b.parentElement.querySelectorAll('[data-seg]').forEach(x => x.setAttribute('aria-checked', x === b)); announce(`${b.closest('[role=radiogroup]').getAttribute('aria-label')}: ${b.textContent.trim()}`); refreshFoot(); return;
    }
    const a = b.dataset.a;
    if (a === 'close') close();
    if (a === 'reset') { st = JSON.parse(JSON.stringify(DEF)); save(); apply(); render(); status(T('All settings are back to their defaults.', 'عادت الإعدادات إلى وضعها الافتراضي.')); announce(T('All settings reset', 'أُعيدت كل الإعدادات')); }
    if (a === 'read') readAloud();
    if (a === 'pause') reader.pause();
    if (a === 'resume') reader.resume();
    if (a === 'stop') reader.stop();
  }
  function onChange(e) {
    const i = e.target.closest('[data-k]'); if (!i) return;
    const k = i.dataset.k;
    if (i.type === 'checkbox') {
      if (k === 'still') st.still = i.checked;
      else if (k.startsWith('learn.')) st.learn[k.slice(6)] = i.checked;
      else if (k === 'suggestVisuals') companionPref({ vs: { suggestVisuals: i.checked } });
      else if (k === 'speakReplies') companionPref({ readAloud: i.checked });
      else st[k] = i.checked;
    } else if (k === 'voice') st.voice = i.value;
    save(); apply();
    if (i.type === 'checkbox') { const lab = i.closest('.a11y__row'); announce(`${lab ? lab.querySelector('b').textContent : k}: ${i.checked ? T('on', 'مفعّل') : T('off', 'متوقف')}`); refreshFoot(); }
  }
  function onInput(e) { const i = e.target.closest('[data-k="rate"]'); if (!i) return; st.rate = +i.value; i.nextElementSibling.textContent = st.rate.toFixed(1) + '×'; save(); }
  /* ---------- read aloud: the selection, or this page's main content, sentence by sentence ----------
     Each sentence is its own utterance, so a new speed or voice applies from the next sentence (reading
     never restarts), pause/resume/stop are reliable across browsers, and the sentence being read is
     highlighted in the page (CSS Custom Highlight API where supported) and named in a small player. */
  let lastRange = null;
  document.addEventListener('selectionchange', () => {
    const g = window.getSelection && getSelection();
    if (g && g.rangeCount && !g.isCollapsed && !(panel && panel.contains(g.anchorNode)) && String(g).trim()) lastRange = g.getRangeAt(0).cloneRange();
  });
  const SKIP = 'script, style, noscript, svg, canvas, [aria-hidden="true"], [hidden], .a11y, .a11y-fab, .a11y-reader, .cmp, .cmp-launch, nav, .toast';
  function textMap(range) {
    const root = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (!n.nodeValue.trim() || !range.intersectsNode(n) || (n.parentElement && n.parentElement.closest(SKIP)) || (n.parentElement && !n.parentElement.getClientRects().length) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const segs = []; let str = '', lastBlock = null;
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      let a = 0, b = n.nodeValue.length;
      if (n === range.startContainer) a = range.startOffset;
      if (n === range.endContainer) b = range.endOffset;
      if (b <= a) continue;
      const blk = n.parentElement.closest('p, li, h1, h2, h3, h4, h5, h6, td, th, dd, dt, blockquote, figcaption, summary, label, button, div');
      if (lastBlock && blk !== lastBlock && !/[.!?؟:\n]\s*$/.test(str)) str += '.\n'; else if (lastBlock && blk !== lastBlock) str += '\n';
      lastBlock = blk;
      segs.push({ n, a, s: str.length }); str += n.nodeValue.slice(a, b);
    }
    return { str, segs };
  }
  function domRange(map, from, to) {
    const at = pos => { let k = map.segs.length - 1; while (k > 0 && map.segs[k].s > pos) k--; const g = map.segs[k]; return [g.n, Math.min(g.n.nodeValue.length, g.a + Math.max(0, pos - g.s))]; };
    try { const r = document.createRange(); const [sn, so] = at(from), [en, eo] = at(to); r.setStart(sn, so); r.setEnd(en, eo); return r; } catch (e) { return null; }
  }
  const HL = window.CSS && CSS.highlights && window.Highlight;
  let bar = null;
  const reader = {
    job: 0, list: [], i: 0, paused: false,
    start(list) { this.stop(true); this.job++; this.list = list; this.i = 0; this.paused = false; showBar(); this.next(this.job); },
    next(job) {
      if (job !== this.job) return;
      if (this.i >= this.list.length) return this.stop();
      const it = this.list[this.i], u = new SpeechSynthesisUtterance(it.text);
      u.rate = st.rate; u.lang = html.lang === 'ar' ? 'ar' : 'en';
      const v = st.voice && voices().find(x => x.name === st.voice); if (v) u.voice = v;
      u.onend = () => { if (job !== this.job) return; this.i++; this.next(job); };
      u.onerror = e => { if (job !== this.job || (e && /interrupted|canceled/.test(e.error))) return; this.i++; this.next(job); };
      if (HL && it.range) { try { CSS.highlights.set('erly-read', new Highlight(it.range)); } catch (e) { /* highlight unsupported */ } }
      if (it.range) { const r = it.range.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 90) { const el = it.range.startContainer.parentElement; el && el.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' }); } }
      updateBar();
      speechSynthesis.speak(u);
    },
    pause() { if (!this.list.length) return; this.paused = true; try { speechSynthesis.pause(); } catch (e) { /* ok */ } updateBar(); status(T('Paused.', 'متوقف مؤقتاً.')); },
    resume() { if (!this.list.length) return; this.paused = false; try { speechSynthesis.resume(); } catch (e) { /* ok */ } updateBar(); status(T('Reading…', 'جارٍ القراءة…')); },
    stop(quiet) { this.job++; this.list = []; this.i = 0; this.paused = false; try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* ok */ } if (HL) try { CSS.highlights.delete('erly-read'); } catch (e) { /* ok */ } if (bar) { bar.remove(); bar = null; } if (!quiet && panel) status(T('Stopped.', 'توقفت القراءة.')); }
  };
  function showBar() {
    if (bar) return;
    bar = document.createElement('div'); bar.className = 'a11y-reader'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', T('Read aloud', 'القراءة بصوت'));
    bar.innerHTML = `<span class="a11y-reader__w" aria-hidden="true"><i></i><i></i><i></i></span><span class="a11y-reader__t" aria-live="off"></span><button type="button" data-r="pp"></button><button type="button" data-r="stop" aria-label="${T('Stop reading', 'إيقاف القراءة')}">■</button>`;
    bar.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; if (b.dataset.r === 'stop') reader.stop(); else reader.paused ? reader.resume() : reader.pause(); });
    html.appendChild(bar);
  }
  function updateBar() {
    if (!bar) return;
    bar.classList.toggle('is-paused', reader.paused);
    bar.querySelector('.a11y-reader__t').textContent = T(`Sentence ${reader.i + 1} of ${reader.list.length}`, `الجملة ${reader.i + 1} من ${reader.list.length}`);
    const pp = bar.querySelector('[data-r="pp"]'); pp.textContent = reader.paused ? '▶' : '❚❚'; pp.setAttribute('aria-label', reader.paused ? T('Resume reading', 'استئناف القراءة') : T('Pause reading', 'إيقاف القراءة مؤقتاً'));
  }
  function readAloud() {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return status(T('Read-aloud isn’t available in this browser.', 'القراءة الصوتية غير متاحة في هذا المتصفح.'));
    const g = window.getSelection && getSelection();
    if (g && g.rangeCount && !g.isCollapsed && !(panel && panel.contains(g.anchorNode)) && String(g).trim()) lastRange = g.getRangeAt(0).cloneRange();
    let range = lastRange && document.contains(lastRange.startContainer) && String(lastRange).trim() ? lastRange : null, whole = false;
    if (!range) { const m = document.querySelector('main, [role="main"]') || document.body; range = document.createRange(); range.selectNodeContents(m); whole = true; }
    const map = textMap(range);
    const list = []; const re = /[^.!?؟\n]+[.!?؟]*["”’)]*\s*/g; let m;
    while ((m = re.exec(map.str)) && list.length < 400) { const t = m[0].trim(); if (/[\p{L}\p{N}]/u.test(t)) { const a = m.index + m[0].indexOf(t); list.push({ text: t, range: domRange(map, a, a + t.length) }); } }
    if (!list.length) return status(T('There is no readable text here — select some text first.', 'لا يوجد نص للقراءة هنا — حدّد نصاً أولاً.'));
    reader.start(list);
    status(whole ? T(`Reading this page: ${list.length} sentences.`, `أقرأ هذه الصفحة: ${list.length} جملة.`) : T(`Reading your selection: ${list.length} sentences.`, `أقرأ النص المحدد: ${list.length} جملة.`));
  }
  addEventListener('pagehide', () => reader.stop(true));
  /* ---------- focus mode: the section in the middle of the screen stays bright, the rest dims ---------- */
  let fmObs = null, fmExit = null;
  function focusMode(on) {
    if (on && !fmObs && 'IntersectionObserver' in window) {
      const secs = [...document.querySelectorAll('main section, main > article, main > div > section, .hws__grid > *, .gp-main > *')];
      fmObs = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('a11y-cur', e.isIntersecting)), { rootMargin: '-38% 0px -38% 0px' });
      secs.forEach(x => fmObs.observe(x));
      fmExit = document.createElement('button'); fmExit.type = 'button'; fmExit.className = 'a11y-fmexit'; fmExit.textContent = T('Exit focus mode', 'الخروج من وضع التركيز');
      fmExit.addEventListener('click', () => { st.focusmode = false; save(); apply(); if (panel && !panel.hidden) render(); announce(T('Focus mode off', 'وضع التركيز متوقف')); });
      html.appendChild(fmExit);
    } else if (!on && fmObs) { fmObs.disconnect(); fmObs = null; document.querySelectorAll('.a11y-cur').forEach(x => x.classList.remove('a11y-cur')); if (fmExit) { fmExit.remove(); fmExit = null; } }
  }
  /* ---------- confirmation: every change is announced to screen readers and shown in the panel ---------- */
  let live = null;
  function announce(t) {
    if (!live) { live = document.createElement('div'); live.className = 'a11y-live'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); html.appendChild(live); }
    live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30);
    if (panel && !panel.hidden) { let c = panel.querySelector('.a11y__ok'); if (!c) { c = document.createElement('p'); c.className = 'a11y__ok'; c.setAttribute('aria-hidden', 'true'); panel.querySelector('.a11y__f').before(c); } c.textContent = '✓ ' + t; c.classList.remove('is-on'); void c.offsetWidth; c.classList.add('is-on'); }
  }
  function changed() { const d = DEF; return ['size', 'contrast', 'still', 'font', 'spacing', 'links', 'focus', 'line', 'letter', 'word', 'width', 'guide', 'tint', 'calm', 'targets', 'cursor', 'focusmode'].filter(k => k === 'still' ? st.still !== null && st.still !== d.still : JSON.stringify(st[k]) !== JSON.stringify(d[k])).length; }
  function refreshFoot() { const f = panel && panel.querySelector('.a11y__f span'); if (f) f.textContent = (changed() ? T(`${changed()} changed · `, `${changed()} مُعدّل · `) : '') + 'ERLY v15 · Alt+A'; }
  function status(t) { let s = panel.querySelector('.a11y__status'); if (!s) { s = document.createElement('p'); s.className = 'a11y__status'; s.setAttribute('role', 'status'); panel.appendChild(s); } s.textContent = t; }
  function open() { lastFocus = document.activeElement; panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); requestAnimationFrame(() => panel.classList.add('is-in')); (panel.querySelector('[role="tab"][aria-selected="true"]') || panel.querySelector('button')).focus(); }
  function close() { panel.classList.remove('is-in'); btn.setAttribute('aria-expanded', 'false'); setTimeout(() => { panel.hidden = true; }, 160); if (lastFocus && lastFocus.focus) lastFocus.focus(); else btn.focus(); }
  document.addEventListener('keydown', e => {
    if (e.altKey && (e.key === 'a' || e.key === 'A' || e.code === 'KeyA')) { e.preventDefault(); panel.hidden ? open() : close(); }
    else if (e.key === 'Escape' && panel && !panel.hidden) { e.stopPropagation(); close(); }
    else if (panel && !panel.hidden && panel.contains(e.target) && e.target.getAttribute('role') === 'tab' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const tabs = [...panel.querySelectorAll('[role="tab"]')], i = tabs.indexOf(e.target), n = (i + (e.key === 'ArrowRight' ? 1 : -1) * (html.dir === 'rtl' ? -1 : 1) + tabs.length) % tabs.length;
      tabs[n].click();
    }
  }, true);
  document.addEventListener('pointerdown', e => { if (panel && !panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close(); });
  if (window.I18N && I18N.onChange) I18N.onChange(() => { if (panel) { render(); btn.setAttribute('aria-label', T('Accessibility settings (Alt+A)', 'إعدادات سهولة الوصول (Alt+A)')); } });
  addEventListener('resize', () => apply(), { passive: true });
  // Back/Forward restores pages from the browser's memory exactly as they were left — including a
  // full-screen leaving animation (the Growth Plan seedling, the Learning Games rocket, a sign-out fade).
  // That made pages look frozen after pressing Back. Clear any such leftovers on restore.
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    document.querySelectorAll('.gw-grow, .q-warp, .tfx-ring, .tfx-circle').forEach(x => x.remove());
    document.body && document.body.classList.remove('is-leaving', 'gp-lock');
    html.classList.remove('vt-theme', 'vt-mask', 'vt-circle', 'tfx-fade', 'gm-open');
  });
  /* ---------- skip link on every page: Tab once, Enter, and focus lands on the main content ---------- */
  function skip() {
    const m = document.querySelector('main, [role="main"]') || document.querySelector('h1');
    const old = document.querySelector('.skip, .skip-link, .a11y-skip, a[href="#main"]');
    if (old) { // an existing skip link must lead somewhere
      const id = (old.getAttribute('href') || '').slice(1);
      if (id && !document.getElementById(id) && m) m.id = id;
      const t = id && document.getElementById(id); if (t && !t.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) t.setAttribute('tabindex', '-1');
      return;
    }
    if (!m || !document.body) return;
    if (!m.id) m.id = 'main';
    if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1');
    const a = document.createElement('a'); a.className = 'a11y-skip'; a.href = '#' + m.id; a.textContent = T('Skip to main content', 'انتقل إلى المحتوى الرئيسي');
    a.addEventListener('click', e => { e.preventDefault(); m.focus({ preventScroll: true }); m.scrollIntoView({ block: 'start', behavior: still() ? 'auto' : 'smooth' }); });
    document.body.prepend(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', skip); else skip();
  apply(); // settings apply before the button exists (no flash after load)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  document.addEventListener('click', e => { if (panel && panel.contains(e.target)) onClick(e); });
  document.addEventListener('change', e => { if (panel && panel.contains(e.target)) onChange(e); });
  document.addEventListener('input', e => { if (panel && panel.contains(e.target)) onInput(e); });
  window.ERLY = window.ERLY || {};
  ERLY.a11y = { reader, readAloud, get: () => JSON.parse(JSON.stringify(st)), set(k, v) { st[k] = v; save(); apply(); if (panel) render(); }, open: () => open(), close: () => close(), theme: setTheme };
})();
/* the principles ticker loops seamlessly by showing its items twice; the second copy is made here,
   marked aria-hidden, so the page source (and screen readers) contain each statement only once */
(function () {
  function clone() {
    document.querySelectorAll('.ticker__track').forEach(t => {
      t.querySelectorAll('[data-tk-clone]').forEach(c => c.remove());
      [...t.children].forEach(k => { const c = k.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.setAttribute('data-tk-clone', ''); c.removeAttribute('data-i18n'); t.appendChild(c); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', clone); else clone();
  if (window.I18N && I18N.onChange) I18N.onChange(() => setTimeout(clone, 0));
})();
