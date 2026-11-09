/* ERLY — Accessibility Control Centre (every page).

   Optional comfort settings the student chooses for themselves — ERLY never
   guesses or labels anyone. Stored only on this device (localStorage
   "erly-a11y"); nothing is sent anywhere.
     text size · high contrast · stop animations · reading-friendly font ·
     extra text spacing (WCAG 1.4.12 values) · underline links · bold focus
     ring · read selected text aloud (with speed)
   Open with the floating button (bottom-left) or Alt+A. Esc closes; focus
   returns to where it was. */
(function () {
  'use strict';
  const KEY = 'erly-a11y';
  const html = document.documentElement;
  const T = (en, ar) => ((window.I18N && I18N.lang === 'ar') || html.lang === 'ar' ? ar : en);
  const DEF = { size: 100, contrast: false, still: false, font: false, spacing: false, links: false, focus: false, rate: 1 };
  let st = Object.assign({}, DEF);
  try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* storage blocked: defaults */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* not persisted */ } };
  function apply() {
    html.style.setProperty('--a11y-zoom', st.size / 100);
    html.classList.toggle('a11y-zoom', st.size !== 100);
    html.classList.toggle('a11y-contrast', !!st.contrast);
    html.classList.toggle('a11y-still', !!st.still);
    html.classList.toggle('a11y-font', !!st.font);
    html.classList.toggle('a11y-spacing', !!st.spacing);
    html.classList.toggle('a11y-links', !!st.links);
    html.classList.toggle('a11y-focus', !!st.focus);
    if (window.ERLY && ERLY.navfit) ERLY.navfit(); // the header re-measures itself at the new text size
    const on = st.size !== 100 || st.contrast || st.still || st.font || st.spacing || st.links || st.focus;
    if (btn) btn.classList.toggle('is-on', !!on);
  }
  const ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.8" fill="currentColor"/><path d="M5 8.6l7 1.6 7-1.6M12 10.2v4.3m0 0l-3 6m3-6l3 6"/></svg>';
  let btn = null, panel = null, lastFocus = null;
  const row = (k, en, ar, sub) => `<label class="a11y__row"><span><b>${T(en, ar)}</b>${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" role="switch" data-k="${k}" ${st[k] ? 'checked' : ''}><i aria-hidden="true"></i></label>`;
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
  function render() {
    panel.innerHTML = `
      <header class="a11y__h"><div><b id="a11yTitle">${T('Accessibility', 'سهولة الوصول')}</b><small>${T('Your choices, saved only on this device.', 'اختياراتك، محفوظة على هذا الجهاز فقط.')}</small></div><button type="button" class="a11y__x" data-a="close" aria-label="${T('Close', 'إغلاق')}">✕</button></header>
      <div class="a11y__size" role="group" aria-label="${T('Text size', 'حجم النص')}"><b>${T('Text size', 'حجم النص')}</b><div>${[90, 100, 112, 125, 140].map(v => `<button type="button" data-size="${v}" aria-pressed="${st.size === v}">${v === 100 ? 'A' : v < 100 ? 'A−' : 'A+'.repeat(1)}<small>${v}%</small></button>`).join('')}</div></div>
      ${row('contrast', 'High contrast', 'تباين عالٍ', T('Stronger text and borders, no see-through panels', 'نص وحدود أقوى بلا لوحات شفافة'))}
      ${row('still', 'Stop animations', 'إيقاف الحركة', T('No moving backgrounds or transitions', 'بلا خلفيات متحركة أو انتقالات'))}
      ${row('font', 'Reading-friendly font', 'خط مريح للقراءة', T('Clear, open letter shapes', 'حروف واضحة ومفتوحة'))}
      ${row('spacing', 'Extra text spacing', 'تباعد إضافي للنص', T('More space between lines, words and letters', 'مسافة أكبر بين الأسطر والكلمات والحروف'))}
      ${row('links', 'Underline links', 'تسطير الروابط', '')}
      ${row('focus', 'Bold focus ring', 'إطار تركيز واضح', T('Easier to follow keyboard focus', 'أسهل لتتبّع تركيز لوحة المفاتيح'))}
      <div class="a11y__read"><b>${T('Read aloud', 'القراءة بصوت')}</b><small>${T('Select any text on the page, then press Read.', 'حدّد أي نص في الصفحة ثم اضغط اقرأ.')}</small>
        <div class="a11y__readrow"><button type="button" data-a="read">${T('▶ Read selection', '▶ اقرأ التحديد')}</button><button type="button" data-a="stop">${T('■ Stop', '■ إيقاف')}</button>
        <label>${T('Speed', 'السرعة')} <input type="range" min="0.6" max="1.6" step="0.1" value="${st.rate}" data-k="rate" aria-label="${T('Reading speed', 'سرعة القراءة')}"><output>${(+st.rate).toFixed(1)}×</output></label></div></div>
      <footer class="a11y__f"><button type="button" data-a="reset">${T('Reset all', 'إعادة الضبط')}</button><span>Alt+A</span></footer>`;
    panel.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.size) { st.size = +b.dataset.size; panel.querySelectorAll('[data-size]').forEach(x => x.setAttribute('aria-pressed', x === b)); save(); apply(); return; }
      const a = b.dataset.a;
      if (a === 'close') close();
      if (a === 'reset') { st = Object.assign({}, DEF); save(); apply(); render(); panel.querySelector('[data-size="100"]').focus(); }
      if (a === 'read') readSel();
      if (a === 'stop' && window.speechSynthesis) speechSynthesis.cancel();
    };
    panel.onchange = e => { const i = e.target.closest('[data-k]'); if (!i) return; if (i.type === 'checkbox') st[i.dataset.k] = i.checked; save(); apply(); };
    panel.oninput = e => { const i = e.target.closest('[data-k="rate"]'); if (!i) return; st.rate = +i.value; i.nextElementSibling.textContent = st.rate.toFixed(1) + '×'; save(); };
  }
  let sel = '';
  document.addEventListener('selectionchange', () => { const s = String(window.getSelection ? getSelection() : '').trim(); if (s && !(panel && panel.contains(getSelection().anchorNode))) sel = s; });
  function readSel() {
    const text = sel || String(getSelection()).trim();
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return status(T('Read-aloud isn’t available in this browser.', 'القراءة الصوتية غير متاحة في هذا المتصفح.'));
    if (!text) return status(T('Select some text on the page first.', 'حدّد نصاً في الصفحة أولاً.'));
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 4000)); u.rate = st.rate; u.lang = html.lang === 'ar' ? 'ar' : 'en';
    speechSynthesis.speak(u); status(T('Reading…', 'جارٍ القراءة…'));
  }
  function status(t) { let s = panel.querySelector('.a11y__status'); if (!s) { s = document.createElement('p'); s.className = 'a11y__status'; s.setAttribute('role', 'status'); panel.querySelector('.a11y__read').appendChild(s); } s.textContent = t; }
  function open() { lastFocus = document.activeElement; panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); requestAnimationFrame(() => panel.classList.add('is-in')); (panel.querySelector('[aria-pressed="true"]') || panel.querySelector('button')).focus(); }
  function close() { panel.classList.remove('is-in'); btn.setAttribute('aria-expanded', 'false'); setTimeout(() => { panel.hidden = true; }, 160); if (lastFocus && lastFocus.focus) lastFocus.focus(); else btn.focus(); }
  document.addEventListener('keydown', e => {
    if (e.altKey && (e.key === 'a' || e.key === 'A' || e.code === 'KeyA')) { e.preventDefault(); panel.hidden ? open() : close(); }
    else if (e.key === 'Escape' && panel && !panel.hidden) { e.stopPropagation(); close(); }
  }, true);
  document.addEventListener('pointerdown', e => { if (panel && !panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close(); });
  if (window.I18N && I18N.onChange) I18N.onChange(() => { if (panel) { render(); btn.setAttribute('aria-label', T('Accessibility settings (Alt+A)', 'إعدادات سهولة الوصول (Alt+A)')); } });
  addEventListener('resize', () => apply(), { passive: true });
  apply(); // settings apply before the button exists (no flash after load)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.ERLY = window.ERLY || {};
  ERLY.a11y = { get: () => Object.assign({}, st), set(k, v) { st[k] = v; save(); apply(); if (panel) render(); }, open: () => open(), close: () => close() };
})();
