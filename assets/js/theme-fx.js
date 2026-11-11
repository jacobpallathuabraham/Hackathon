/* ERLY — animated theme and language switching, shared by every page.

   Each page keeps its own #themeToggle / #langToggle handler (it knows what to
   redraw: charts, Noor, the studio). This file catches the click first, then
   replays it inside a View Transition so the change animates:
     - theme: "opening circle" — the new theme opens out in a circle from the
       button, covering the page edge to edge; the sun and moon icons morph;
     - language: the page glides out one way and the new language glides in
       from the reading direction (right-to-left for Arabic), with a short
       "العربية" / "English" badge.
   Browsers without View Transitions get a soft colour cross-fade and a gentle
   slide instead. Reduced-motion users get an instant switch. */
(function () {
  'use strict';
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
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

  /* ---------------- theme: "opening circle" ----------------
     The new theme is clipped to a circle centred on the button that grows to
     the farthest corner (0.56–0.82 s, eased), so it always covers the whole
     viewport. The old page stays still underneath: no fading, no blending,
     nothing falls or flies. Reduced motion: an instant switch. */
  let active = null, fallback = null;
  const BG = { dark: '#0e1120', light: '#F4EFE6' };
  const EASE = 'cubic-bezier(.65, .05, .25, 1)';
  function switchTheme(btn) {
    const toDark = html.dataset.theme !== 'dark';
    // a click mid-switch finishes the running one at once, so rapid clicks never stack or flicker
    if (active) { try { active.skipTransition(); } catch (e) { /* already done */ } active = null; }
    if (fallback) { fallback(); fallback = null; }
    if (reduce()) return replay(btn);
    const o = origin(btn);
    const ms = Math.round(Math.min(820, Math.max(560, o.radius * 0.55)));
    const from = `circle(0px at ${o.x}px ${o.y}px)`, to = `circle(${Math.ceil(o.radius) + 2}px at ${o.x}px ${o.y}px)`;
    if (canVT) {
      // "opening circle": the new theme opens out from the button over the old one
      html.classList.add('vt-circle');
      const t = active = document.startViewTransition(() => replay(btn));
      [t.ready, t.finished, t.updateCallbackDone].forEach(pr => pr && pr.catch(() => {}));
      t.ready.then(() => {
        html.animate({ clipPath: [from, to] }, { duration: ms, easing: EASE, fill: 'both', pseudoElement: '::view-transition-new(root)' });
      }).catch(() => {});
      t.finished.catch(() => {}).finally(() => { html.classList.remove('vt-circle'); if (active === t) active = null; });
    } else {
      // no View Transitions: a circle in the new background colour opens out, the theme switches underneath, the circle fades
      const veil = badge('tfx-circle', '', ms + 600);
      veil.style.background = BG[toDark ? 'dark' : 'light'];
      let done = false;
      const finish = () => { if (done) return; done = true; replay(btn); veil.classList.add('is-out'); };
      fallback = finish;
      const a = veil.animate ? veil.animate({ clipPath: [from, to] }, { duration: ms, easing: EASE, fill: 'forwards' }) : null;
      if (a) a.onfinish = () => { finish(); if (fallback === finish) fallback = null; };
      else setTimeout(finish, 0);
    }
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
      [t.ready, t.updateCallbackDone].forEach(pr => pr && pr.catch(() => {}));
      t.finished.catch(() => {}).finally(() => html.classList.remove('vt-lang'));
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
    if (btn.id === 'themeToggle') return switchTheme(btn); // a new click finishes the running switch first
    if (busy) return; // one language switch at a time
    busy = true; setTimeout(() => { busy = false; }, 800);
    switchLang(btn);
  }, true);

  window.ERLY_FX = { theme: () => { const b = document.getElementById('themeToggle'); b && b.click(); }, lang: () => { const b = document.getElementById('langToggle'); b && b.click(); } };
})();
