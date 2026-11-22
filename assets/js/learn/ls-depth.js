/* ERLY Learning Studio v28 — cursor depth.
   One passive pointermove listener for the whole Studio, coalesced to one write per animation frame:
     • --cx / --cy on <html> (−1…1, eased by CSS transitions) let the ambient world canvases drift slightly against
       the cursor, giving the dashboard and subject worlds depth;
     • the card under the pointer (and only that card) gets --tx / --ty and the .ls-tilt class, so it tilts gently
       towards the cursor; leaving it resets it.
   Active only for a fine pointer that can hover (no touch), and never with reduced motion or the Still setting.
   It never calls preventDefault, never captures the pointer and never touches canvases, sliders or text fields. */
(function () {
  'use strict';
  const root = document.documentElement, SEL = '.dx-card, .at-tile, .ls-card, .at-portal';
  const mq = matchMedia('(hover: hover) and (pointer: fine)'), rm = matchMedia('(prefers-reduced-motion: reduce)');
  let on = false, raf = 0, lx = 0, ly = 0, tgt = null, cur = null;
  const allowed = () => mq.matches && !rm.matches && !root.classList.contains('a11y-still');
  function sync() { const a = allowed(); if (a === on) return; on = a; root.classList.toggle('ls-depth', on); if (!on) { root.style.removeProperty('--cx'); root.style.removeProperty('--cy'); leave(); } }
  function leave() { if (cur) { cur.classList.remove('ls-tilt'); cur.style.removeProperty('--tx'); cur.style.removeProperty('--ty'); cur = null; } }
  function frame() {
    raf = 0; if (!on) return;
    root.style.setProperty('--cx', (lx / innerWidth * 2 - 1).toFixed(3)); root.style.setProperty('--cy', (ly / innerHeight * 2 - 1).toFixed(3));
    if (tgt !== cur) { leave(); if (tgt) { cur = tgt; cur.classList.add('ls-tilt'); } }
    if (cur) { const r = cur.getBoundingClientRect(); if (r.width && r.height) { cur.style.setProperty('--tx', ((lx - r.left) / r.width * 2 - 1).toFixed(3)); cur.style.setProperty('--ty', ((ly - r.top) / r.height * 2 - 1).toFixed(3)); } }
  }
  document.addEventListener('pointermove', e => {
    if (!on || e.pointerType !== 'mouse') return; lx = e.clientX; ly = e.clientY;
    const t = e.target && e.target.closest ? e.target.closest(SEL) : null; tgt = t && t.closest('#lsView, .ls-main, main') ? t : null;
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { tgt = null; if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  window.addEventListener('hashchange', () => { tgt = null; leave(); });
  [mq, rm].forEach(m => (m.addEventListener ? m.addEventListener('change', sync) : m.addListener(sync)));
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
  sync();
  window.LS_DEPTH = { active: () => on, current: () => cur };
})();
