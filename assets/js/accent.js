/* SAS / ERLY — accent colour picker. The choice is applied before paint by
   each page's head script (erly-accent in localStorage) and shared by the
   login page, the student site and the counselor workspace. */
(function () {
  'use strict';
  const ACCENTS = [['terracotta', '#C1502B', 'Terracotta', 'تيراكوتا'], ['orange', '#D2600A', 'Orange', 'برتقالي'], ['rose', '#C3346C', 'Rose', 'وردي'], ['violet', '#6A49CF', 'Violet', 'بنفسجي'], ['blue', '#2463C9', 'Blue', 'أزرق'], ['teal', '#0D7A6E', 'Teal', 'فيروزي'], ['green', '#2E7A3A', 'Green', 'أخضر']];
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const current = () => document.documentElement.dataset.accent || 'terracotta';
  function set(name) {
    const html = document.documentElement;
    html.classList.add('accent-anim');
    if (name === 'terracotta') delete html.dataset.accent; else html.dataset.accent = name;
    try { localStorage.setItem('erly-accent', name); } catch (e) {}
    setTimeout(() => html.classList.remove('accent-anim'), 600);
    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('is-on', s.dataset.accent === name));
    dispatchEvent(new CustomEvent('accentchange', { detail: name }));
  }
  const sw = a => `<button class="swatch ${current() === a[0] ? 'is-on' : ''}" data-accent="${a[0]}" style="--sw:${a[1]}" aria-label="${T(a[2], a[3])}" title="${T(a[2], a[3])}"></button>`;
  // inline rows (login page)
  document.querySelectorAll('[data-swatches]').forEach(el => { el.innerHTML = ACCENTS.map(sw).join(''); });
  // nav buttons with a popover
  document.querySelectorAll('[data-accent-picker]').forEach(host => {
    host.classList.add('accent-pick');
    host.innerHTML = `<button class="icon-btn accent-btn" aria-label="${T('Change colour', 'تغيير اللون')}" aria-haspopup="true" aria-expanded="false"><span class="accent-dot"></span></button><div class="accent-pop" role="menu"><p>${T('Colour', 'اللون')}</p>${ACCENTS.map(sw).join('')}</div>`;
    const btn = host.querySelector('.accent-btn'), pop = host.querySelector('.accent-pop');
    btn.addEventListener('click', e => { e.stopPropagation(); const o = !pop.classList.contains('is-open'); pop.classList.toggle('is-open', o); btn.setAttribute('aria-expanded', o); });
    document.addEventListener('click', e => { if (!host.contains(e.target)) { pop.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); } });
    addEventListener('keydown', e => { if (e.key === 'Escape') pop.classList.remove('is-open'); });
  });
  document.addEventListener('click', e => { const s = e.target.closest('.swatch'); if (s) set(s.dataset.accent); });
})();
