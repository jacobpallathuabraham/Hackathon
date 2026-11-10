/* ERLY — animated theme and language switching, shared by every page.

   Each page keeps its own #themeToggle / #langToggle handler (it knows what to
   redraw: charts, Noor, the studio). This file catches the click first, then
   replays it inside a View Transition so the change animates:
     - theme: "dusk / dawn" — a soft cross-fade of the whole page with one gentle
       diagonal sheen of light; the button's sun and moon morph into each other;
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

  /* ---------------- theme: "eclipse" reveal ----------------
     The new theme spreads out from the button with a feathered edge (an
     animated radial mask, not a hard circle) while a luminous ring rides the
     edge — warm gold into light, cyan-violet into dark — and the old theme
     dims and recedes slightly. Clicking again mid-way finishes the running
     switch at once and starts the next one, so rapid clicks never stack or
     flicker. Without View Transitions: a soft colour cross-fade with a wash.
     Reduced motion: an instant switch. */
  let canMask = false;
  try { CSS.registerProperty({ name: '--tfx-r', syntax: '<length>', inherits: true, initialValue: '0px' }); canMask = CSS.supports('mask-image', 'radial-gradient(#000, transparent)') || CSS.supports('-webkit-mask-image', 'radial-gradient(#000, transparent)'); }
  catch (e) { canMask = !!(window.CSS && CSS.supports && CSS.supports('mask-image', 'radial-gradient(#000, transparent)')) && /already/i.test(String(e && e.message)); }
  let active = null;
  function switchTheme(btn) {
    const toDark = html.dataset.theme !== 'dark';
    if (active) { try { active.skipTransition(); } catch (e) { /* already done */ } active = null; }
    if (reduce()) return replay(btn);
    html.classList.toggle('tfx-to-dark', toDark);
    if (canVT) {
      // "dusk / dawn": the whole page cross-fades softly while a gentle diagonal light sweeps across once
      html.classList.add('vt-dusk');
      const t = active = document.startViewTransition(() => {
        replay(btn);
        const sheen = badge('tfx-sheen ' + (toDark ? 'tfx-sheen--dark' : 'tfx-sheen--light'), '', 900);
        sheen.style.transform = '';
      });
      // a transition aborted by a rapid second click or a page change is harmless: the theme still switches
      [t.ready, t.finished, t.updateCallbackDone].forEach(pr => pr && pr.catch(() => {}));
      t.finished.catch(() => {}).finally(() => { html.classList.remove('vt-dusk', 'tfx-to-dark'); if (active === t) active = null; });
    } else {
      // no View Transitions: a short full-screen veil in the new background colour, then gone
      const veil = badge('tfx-veil ' + (toDark ? 'tfx-veil--dark' : 'tfx-veil--light'), '', 700);
      requestAnimationFrame(() => { veil.classList.add('is-on'); setTimeout(() => { replay(btn); veil.classList.remove('is-on'); }, 220); });
      setTimeout(() => html.classList.remove('tfx-to-dark'), 720);
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
