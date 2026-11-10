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
    const { x, y, radius } = origin(btn);
    const toDark = html.dataset.theme !== 'dark';
    html.style.setProperty('--tfx-x', x + 'px');
    html.style.setProperty('--tfx-y', y + 'px');
    if (active) { try { active.skipTransition(); } catch (e) { /* already done */ } active = null; }
    if (reduce()) return replay(btn);
    const glyph = () => { const g = badge('tfx-orb ' + (toDark ? 'tfx-orb--moon' : 'tfx-orb--sun'), toDark ? MOON : SUN, 1300); g.style.left = x + 'px'; g.style.top = y + 'px'; };
    btn.classList.remove('tfx-spin'); void btn.offsetWidth; btn.classList.add('tfx-spin');
    if (canVT) {
      const dur = Math.round(Math.min(1150, 700 + radius * 0.22)); // larger screens get a little longer, never sluggish
      const feather = Math.max(70, Math.min(160, radius * 0.08));
      let ring = null;
      html.classList.add('vt-theme'); html.classList.toggle('vt-mask', canMask); html.classList.toggle('vt-to-dark', toDark);
      html.style.setProperty('--tfx-f', feather + 'px');
      const t = active = document.startViewTransition(() => {
        replay(btn); glyph();
        ring = document.createElement('div');
        ring.className = 'tfx-ring ' + (toDark ? 'tfx-ring--dark' : 'tfx-ring--light');
        ring.setAttribute('aria-hidden', 'true');
        ring.style.left = x + 'px'; ring.style.top = y + 'px';
        document.body.appendChild(ring);
      });
      // a transition aborted by a rapid second click or a page change is harmless: the theme still switches
      [t.ready, t.finished, t.updateCallbackDone].forEach(pr => pr && pr.catch(() => {}));
      t.ready.then(() => {
        const ease = 'cubic-bezier(.62,0,.22,1)';
        if (canMask) html.animate({ '--tfx-r': ['0px', (radius + feather + 20) + 'px'] }, { duration: dur, easing: ease, pseudoElement: '::view-transition-new(root)' });
        else html.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: dur, easing: ease, pseudoElement: '::view-transition-new(root)' });
        html.animate({ filter: ['brightness(1) saturate(1)', toDark ? 'brightness(.62) saturate(.85)' : 'brightness(1.12) saturate(1.05)'], transform: ['scale(1)', 'scale(.982)'] },
          { duration: dur, easing: 'cubic-bezier(.4,0,.6,1)', pseudoElement: '::view-transition-old(root)' });
        // the ring is a 1024px glowing circle scaled to ride the reveal's edge (soft upscaling adds glow)
        const end = (radius + feather * 0.5 + 20) / (0.966 * 512); // ring core sits mid-feather
        html.animate([{ transform: 'scale(.02)', opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 0.95, offset: 0.72 }, { transform: `scale(${end})`, opacity: 0 }],
          { duration: dur, easing: ease, pseudoElement: '::view-transition-new(tfx-ring)', fill: 'both' });
      }).catch(() => {});
      t.finished.catch(() => {}).finally(() => { if (ring) ring.remove(); html.classList.remove('vt-theme', 'vt-mask', 'vt-to-dark'); if (active === t) active = null; });
    } else {
      html.classList.add('tfx-fade');
      const wash = badge('tfx-wash', '', 900);
      wash.style.setProperty('--r', radius + 'px');
      wash.style.background = toDark ? 'radial-gradient(circle at var(--tfx-x) var(--tfx-y), #1c2340, #0e1120 70%)' : 'radial-gradient(circle at var(--tfx-x) var(--tfx-y), #fff7e6, #F4EFE6 70%)';
      requestAnimationFrame(() => { replay(btn); glyph(); });
      setTimeout(() => html.classList.remove('tfx-fade'), 700);
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
