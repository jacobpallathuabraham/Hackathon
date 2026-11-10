/* ERLY — Accessibility Control Centre (every page), v11.

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
  const DEF = { size: 100, contrast: false, still: null, font: false, spacing: false, links: false, focus: false, rate: 1, voice: '', line: 0, letter: 0, word: 0, width: 'full', guide: false, tint: 'none', calm: false, targets: false, learn: { short: false, steps: false, examples: false, dense: 'normal' }, tab: 'reading' };
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
    html.classList.toggle('a11y-calm', !!st.calm);
    html.classList.toggle('a11y-line', !!st.line); html.style.setProperty('--a11y-line', st.line || 'normal');
    html.classList.toggle('a11y-letter', !!st.letter); html.style.setProperty('--a11y-letter', (st.letter || 0) + 'em');
    html.classList.toggle('a11y-word', !!st.word); html.style.setProperty('--a11y-word', (st.word || 0) + 'em');
    html.classList.toggle('a11y-width', st.width !== 'full'); html.style.setProperty('--a11y-width', WIDTHS[st.width] || 'none');
    html.classList.toggle('a11y-tint', st.tint !== 'none'); html.style.setProperty('--a11y-tint', TINTS[st.tint] || 'transparent');
    guide(st.guide);
    if (window.ERLY && ERLY.navfit) ERLY.navfit();
    const on = st.size !== 100 || st.contrast || st.still || st.font || st.spacing || st.links || st.focus || st.targets || st.calm || st.line || st.letter || st.word || st.width !== 'full' || st.tint !== 'none' || st.guide;
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
      ${sw('calm', 'Fewer distractions', 'تقليل المشتتات', T('Hides moving tickers and decorative backgrounds', 'يخفي الأشرطة المتحركة والخلفيات الزخرفية'), st.calm)}
      ${sw('links', 'Underline links', 'تسطير الروابط', '', st.links)}`;
    if (st.tab === 'interaction') return `
      ${sw('still', 'Stop animations', 'إيقاف الحركة', st.still === null ? T(`Following your device (${osStill.matches ? 'reduced motion is on' : 'motion allowed'})`, 'يتبع إعداد جهازك') : T('No moving backgrounds or transitions', 'بلا خلفيات متحركة أو انتقالات'), still())}
      ${sw('focus', 'Bold focus ring', 'إطار تركيز واضح', T('Easier to follow keyboard focus', 'أسهل لتتبّع تركيز لوحة المفاتيح'), st.focus)}
      ${sw('targets', 'Larger click targets', 'أهداف نقر أكبر', T('Buttons and links at least 44 × 44 px', 'أزرار وروابط بحجم ٤٤ بكسل على الأقل'), st.targets)}
      <p class="a11y__note">${T('Keyboard: Tab moves between controls, Enter or Space activates, Esc closes panels. Alt+A opens this panel; Alt+N opens Noor.', 'لوحة المفاتيح: Tab للتنقل، Enter أو Space للتفعيل، Esc للإغلاق. Alt+A يفتح هذه اللوحة؛ Alt+N يفتح نور.')}</p>`;
    if (st.tab === 'learning') return `
      <p class="a11y__note">${T('These change how Noor explains things to you. Nothing here is a label — change them any time.', 'هذه تغيّر طريقة شرح نور لك. لا شيء هنا تصنيف — غيّرها متى شئت.')}</p>
      ${sw('learn.short', 'Shorter instructions', 'تعليمات أقصر', T('Brief answers first; ask to expand', 'إجابات موجزة أولاً'), L.short)}
      ${sw('learn.steps', 'Step-by-step explanations', 'شرح خطوة بخطوة', '', L.steps)}
      ${sw('learn.examples', 'More examples', 'أمثلة أكثر', '', L.examples)}
      ${seg('learn.dense', T('Information density', 'كثافة المعلومات'), [['light', T('Light', 'خفيفة')], ['normal', T('Normal', 'عادية')], ['rich', T('Rich', 'غنية')]], L.dense)}
      ${sw('suggestVisuals', 'Suggest visual explanations', 'اقتراح شروحات مرئية', T('Noor may offer a diagram when it would help (off: only when you ask)', 'قد تقترح نور مخططاً عند الحاجة'), !!((vs.vs || {}).suggestVisuals))}
      ${sw('speakReplies', 'Read Noor’s replies aloud', 'قراءة ردود نور بصوت', T('Spoken only when you have Noor open', 'تُنطق فقط عندما تكون نور مفتوحة'), vs.muted === false)}`;
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
      <div class="a11y__read"><b>${T('Read aloud', 'القراءة بصوت')}</b><small>${T('Select any text on the page, then press Play.', 'حدّد أي نص في الصفحة ثم اضغط تشغيل.')}</small>
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
      <footer class="a11y__f"><button type="button" data-a="reset">${T('Reset all', 'إعادة الضبط')}</button><span>ERLY v13 · Alt+A</span></footer>`;
    if (focusKey) { const f = panel.querySelector(`[data-k="${focusKey}"], [data-tab="${focusKey}"][aria-selected="true"], [data-size="${focusKey}"]`); if (f) f.focus(); }
  }
  function voices() { try { const l = (html.lang || 'en').slice(0, 2); return (speechSynthesis.getVoices() || []).filter(v => v.lang && v.lang.slice(0, 2) === l).slice(0, 30); } catch (e) { return []; } }
  if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { if (panel && st.tab === 'reading') render(); });
  function companionPref(patch) { // the Learning section writes Noor's own preferences, so Noor and this panel always agree
    try { const db = JSON.parse(localStorage.getItem('erly-companion-v1') || '{}'); db.prefs = db.prefs || {}; if (patch.vs) db.prefs.vs = Object.assign({}, db.prefs.vs || {}, patch.vs); if ('muted' in patch) db.prefs.muted = patch.muted; localStorage.setItem('erly-companion-v1', JSON.stringify(db)); } catch (e) { /* not persisted */ }
  }
  function onClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { st.tab = b.dataset.tab; save(); render(); panel.querySelector(`[data-tab="${st.tab}"]`).focus(); return; }
    if (b.dataset.size) { st.size = +b.dataset.size; save(); apply(); panel.querySelectorAll('[data-size]').forEach(x => x.setAttribute('aria-pressed', x === b)); return; }
    if (b.dataset.seg) {
      const k = b.dataset.seg, raw = b.dataset.v, v = /^-?[\d.]+$/.test(raw) ? +raw : raw;
      if (k === 'theme') setTheme(v); else if (k.startsWith('learn.')) st.learn[k.slice(6)] = v; else st[k] = v;
      save(); apply(); b.parentElement.querySelectorAll('[data-seg]').forEach(x => x.setAttribute('aria-checked', x === b)); return;
    }
    const a = b.dataset.a;
    if (a === 'close') close();
    if (a === 'reset') { st = JSON.parse(JSON.stringify(DEF)); save(); apply(); render(); status(T('All settings are back to their defaults.', 'عادت الإعدادات إلى وضعها الافتراضي.')); }
    if (a === 'read') readSel();
    if (a === 'pause' && window.speechSynthesis) speechSynthesis.pause();
    if (a === 'resume' && window.speechSynthesis) speechSynthesis.resume();
    if (a === 'stop' && window.speechSynthesis) speechSynthesis.cancel();
  }
  function onChange(e) {
    const i = e.target.closest('[data-k]'); if (!i) return;
    const k = i.dataset.k;
    if (i.type === 'checkbox') {
      if (k === 'still') st.still = i.checked;
      else if (k.startsWith('learn.')) st.learn[k.slice(6)] = i.checked;
      else if (k === 'suggestVisuals') companionPref({ vs: { suggestVisuals: i.checked } });
      else if (k === 'speakReplies') companionPref({ muted: !i.checked });
      else st[k] = i.checked;
    } else if (k === 'voice') st.voice = i.value;
    save(); apply();
  }
  function onInput(e) { const i = e.target.closest('[data-k="rate"]'); if (!i) return; st.rate = +i.value; i.nextElementSibling.textContent = st.rate.toFixed(1) + '×'; save(); }
  let sel = '';
  document.addEventListener('selectionchange', () => { const s = String(window.getSelection ? getSelection() : '').trim(); if (s && !(panel && panel.contains(getSelection().anchorNode))) sel = s; });
  function readSel() {
    const text = sel || String(getSelection()).trim();
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return status(T('Read-aloud isn’t available in this browser.', 'القراءة الصوتية غير متاحة في هذا المتصفح.'));
    if (!text) return status(T('Select some text on the page first.', 'حدّد نصاً في الصفحة أولاً.'));
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 4000)); u.rate = st.rate; u.lang = html.lang === 'ar' ? 'ar' : 'en';
    const v = st.voice && voices().find(x => x.name === st.voice); if (v) u.voice = v;
    speechSynthesis.speak(u); status(T('Reading…', 'جارٍ القراءة…'));
  }
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
    document.querySelectorAll('.gw-grow, .q-warp, .tfx-ring').forEach(x => x.remove());
    document.body && document.body.classList.remove('is-leaving', 'gp-lock');
    html.classList.remove('vt-theme', 'vt-mask', 'tfx-fade', 'gm-open');
  });
  apply(); // settings apply before the button exists (no flash after load)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  document.addEventListener('click', e => { if (panel && panel.contains(e.target)) onClick(e); });
  document.addEventListener('change', e => { if (panel && panel.contains(e.target)) onChange(e); });
  document.addEventListener('input', e => { if (panel && panel.contains(e.target)) onInput(e); });
  window.ERLY = window.ERLY || {};
  ERLY.a11y = { get: () => JSON.parse(JSON.stringify(st)), set(k, v) { st[k] = v; save(); apply(); if (panel) render(); }, open: () => open(), close: () => close(), theme: setTheme };
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
