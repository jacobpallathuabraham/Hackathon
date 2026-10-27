/* ERLY — the way into the Growth Plan: a seedling grows across the screen,
   then the plan page rises in. Respects reduced motion. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href="support.html"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || reduce) return;
    e.preventDefault();
    const r = a.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'gw-grow';
    el.style.setProperty('--x', (r.left + r.width / 2) + 'px'); el.style.setProperty('--y', (r.top + r.height / 2) + 'px');
    el.innerHTML = `<div class="gw-grow__pollen">${Array.from({ length: 22 }, (_, i) => `<i style="--l:${(i * 37) % 100}%;--d:${(i % 7) * 0.12}s;--s:${0.6 + (i % 4) * 0.3}"></i>`).join('')}</div>
      <svg class="gw-grow__plant" viewBox="0 0 200 240" aria-hidden="true">
        <path class="gw-soil" d="M30 222 Q100 200 170 222"/>
        <path class="gw-stem" d="M100 222 C100 180 96 150 100 110 C104 80 100 60 100 40"/>
        <path class="gw-leaf gw-leaf--1" d="M100 150 C70 140 52 118 50 96 C78 98 96 118 100 150Z"/>
        <path class="gw-leaf gw-leaf--2" d="M100 120 C130 110 150 88 152 66 C124 68 104 88 100 120Z"/>
        <path class="gw-leaf gw-leaf--3" d="M100 84 C82 74 74 58 76 42 C92 46 100 62 100 84Z"/>
        <circle class="gw-bud" cx="100" cy="38" r="9"/>
      </svg>
      <p class="gw-grow__t"><b>${T('Growing your plan', 'ننمّي خطتك')}</b><span>${T('a little every day', 'قليلاً كل يوم')}</span></p>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-on')));
    try { sessionStorage.setItem('erly-grow', '1'); } catch (err) { /* ignore */ }
    setTimeout(() => { location.href = a.getAttribute('href'); }, 1650);
  });
})();
