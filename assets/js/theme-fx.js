/* ERLY — animated theme and language switching, shared by every page.

   Each page keeps its own #themeToggle / #langToggle handler (it knows what to
   redraw: charts, Noor, the studio). This file catches the click first, then
   replays it inside a View Transition so the change animates:
     - theme: the new theme spreads out in a circle from the button, with a
       sun or moon that rises and fades;
     - language: the page glides out one way and the new language glides in
       from the reading direction (right-to-left for Arabic), with a short
       "العربية" / "English" badge.
   Browsers without View Transitions get a soft colour cross-fade and a gentle
   slide instead. Reduced-motion users get an instant switch. */
(function () {
  'use strict';
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  const canVT = typeof document.startViewTransition === 'function';
  let replaying = false, busy = false;

  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="currentColor" fill-opacity=".25"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" fill-opacity=".25"/><path d="M16.5 4.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" fill="currentColor"/></svg>';

  function origin(btn) {
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    return { x, y, radius: Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) };
  }
  // run the page's own handler (it changes the DOM synchronously)
  function replay(btn) { replaying = true; try { btn.click(); } finally { replaying = false; } }
  function badge(cls, inner, ms) {
    const b = document.createElement('div');
    b.className = 'tfx-badge ' + cls;
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = inner;
    document.body.appendChild(b);
    setTimeout(() => b.remove(), ms);
    return b;
  }

  /* ---------------- theme ---------------- */
  function switchTheme(btn) {
    const { x, y, radius } = origin(btn);
    const toDark = html.dataset.theme !== 'dark';
    html.style.setProperty('--tfx-x', x + 'px');
    html.style.setProperty('--tfx-y', y + 'px');
    if (reduce()) return replay(btn);
    const glyph = () => { const g = badge('tfx-orb ' + (toDark ? 'tfx-orb--moon' : 'tfx-orb--sun'), toDark ? MOON : SUN, 1300); g.style.left = x + 'px'; g.style.top = y + 'px'; };
    if (canVT) {
      html.classList.add('vt-theme');
      const t = document.startViewTransition(() => { replay(btn); glyph(); });
      t.ready.then(() => {
        html.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 750, easing: 'cubic-bezier(.65,0,.25,1)', pseudoElement: '::view-transition-new(root)' }
        );
        html.animate({ filter: ['brightness(1)', toDark ? 'brightness(.7)' : 'brightness(1.15)'], transform: ['scale(1)', 'scale(.985)'] },
          { duration: 750, easing: 'ease-in', pseudoElement: '::view-transition-old(root)' });
      }).catch(() => {});
      t.finished.finally(() => html.classList.remove('vt-theme'));
    } else {
      html.classList.add('tfx-fade');
      const wash = badge('tfx-wash', '', 900);
      wash.style.setProperty('--r', radius + 'px');
      wash.style.background = toDark ? '#121110' : '#F4EFE6';
      requestAnimationFrame(() => { replay(btn); glyph(); });
      setTimeout(() => html.classList.remove('tfx-fade'), 700);
    }
    btn.classList.remove('tfx-spin'); void btn.offsetWidth; btn.classList.add('tfx-spin');
  }

  /* ---------------- language ---------------- */
  function switchLang(btn) {
    const toAr = html.lang !== 'ar' && html.dir !== 'rtl';
    // the new language enters from where its lines start: Arabic from the right, English from the left
    html.style.setProperty('--tfx-dx', toAr ? '-60px' : '60px');
    if (reduce()) return replay(btn);
    const label = () => badge('tfx-lang', `<b ${toAr ? 'lang="ar" dir="rtl"' : ''}>${toAr ? 'العربية' : 'English'}</b><i></i>`, 1400);
    if (canVT) {
      html.classList.add('vt-lang');
      const t = document.startViewTransition(() => { replay(btn); label(); });
      t.finished.finally(() => html.classList.remove('vt-lang'));
    } else {
      html.classList.add('tfx-lang-out');
      setTimeout(() => {
        replay(btn); label();
        html.classList.remove('tfx-lang-out'); html.classList.add('tfx-lang-in');
        setTimeout(() => html.classList.remove('tfx-lang-in'), 650);
      }, 220);
    }
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('#themeToggle, #langToggle');
    if (!btn || replaying) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (busy) return; // one switch at a time
    busy = true; setTimeout(() => { busy = false; }, 800);
    if (btn.id === 'themeToggle') switchTheme(btn); else switchLang(btn);
  }, true);

  window.ERLY_FX = { theme: () => { const b = document.getElementById('themeToggle'); b && b.click(); }, lang: () => { const b = document.getElementById('langToggle'); b && b.click(); } };
})();
