/* ERLY — the warp into the Learning Studio (v37), the departure half. Any link to learn.html on this page opens a portal
   from the point you pressed, jumps to hyperspace, then loads the Studio, which opens already inside the same warp
   (learn.html carries the arrival half). Modified clicks (new tab), reduced motion and the "still" setting skip it. */
(function () {
  'use strict';
  const root = document.documentElement;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('a11y-still');
  const T = (en, ar) => (window.I18N && I18N.t ? I18N.t(en, ar) : en);
  let going = false;
  const markup = (x, y) => `<div class="lw__portal" style="--x:${x}px;--y:${y}px;--d:${Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) * 2.1)}px"></div>
    <div class="lw__streaks"></div><div class="lw__streaks lw__streaks--b"></div><div class="lw__streaks lw__streaks--c"></div><div class="lw__core"></div><div class="lw__scan"></div>
    <div class="lw__hud"><div class="lw__ring"></div><div class="lw__ring lw__ring--t"></div><div class="lw__ring lw__ring--a"></div><div class="lw__ring lw__ring--b"></div></div>
    <div class="lw__label"><span class="lw__k">${T('ERLY · Entering', 'إيرلي · الدخول إلى')}</span><span class="lw__t">${T('The Learning Studio', 'استوديو التعلّم')}</span><span class="lw__bar"></span></div>`;
  // warm the Studio up while the pointer is on its way (the HTML is small; the browser's cache does the rest)
  let warmed = false;
  const warm = () => { if (warmed) return; warmed = true; try { const l = document.createElement('link'); l.rel = 'prefetch'; l.href = 'learn.html'; document.head.appendChild(l); } catch (e) { /* */ } };
  document.addEventListener('pointerover', e => { if (e.target.closest && e.target.closest('a[href^="learn.html"]')) warm(); }, { passive: true });
  document.addEventListener('focusin', e => { if (e.target.closest && e.target.closest('a[href^="learn.html"]')) warm(); });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="learn.html"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    e.preventDefault(); if (going) return; going = true;
    const href = a.getAttribute('href');
    if (still()) { location.href = href; return; }
    const r = a.getBoundingClientRect(), x = e.clientX || (r.left + r.width / 2), y = e.clientY || (r.top + r.height / 2);
    const el = document.createElement('div'); el.className = 'lw'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = markup(Math.round(x), Math.round(y));
    document.body.appendChild(el);
    const live = document.createElement('p'); live.className = 'sr-only'; live.setAttribute('role', 'status'); live.textContent = T('Opening the Learning Studio…', 'جارٍ فتح استوديو التعلّم…'); document.body.appendChild(live);
    try { sessionStorage.setItem('ls-warp', String(Date.now())); } catch (err) { /* private mode: the Studio simply opens without the arrival half */ }
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-go')));
    setTimeout(() => { location.href = href; }, 780);
  });
  // the warp is its own transition: the default page cross-fade would freeze a snapshot of it
  addEventListener('pageswap', e => { if (going && e.viewTransition) e.viewTransition.skipTransition(); });
  // coming Back to this page from the Studio: never show a half-finished portal
  addEventListener('pageshow', e => { if (e.persisted) { going = false; document.querySelectorAll('.lw').forEach(n => n.remove()); } });
})();
