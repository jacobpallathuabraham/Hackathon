/* ERLY — motion that follows you: hero cards drift with the pointer and the
   scroll, primary buttons lean toward the cursor, and the hero glows softly. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero'), stage = document.querySelector('.hero__stage--v2');
  if (hero && !hero.querySelector('.hero__bgfx')) { const fx = document.createElement('div'); fx.className = 'hero__bgfx'; fx.setAttribute('aria-hidden', 'true'); fx.innerHTML = '<i></i><i></i>'; hero.prepend(fx); }
  if (hero && stage && matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      stage.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      stage.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
    hero.addEventListener('pointerleave', () => { stage.style.setProperty('--mx', 0); stage.style.setProperty('--my', 0); });
  }
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking || !stage) return; ticking = true;
    requestAnimationFrame(() => { const y = Math.min(scrollY, 900); stage.style.setProperty('--py', (y * .12).toFixed(1) + 'px'); ticking = false; });
  }, { passive: true });
  if (matchMedia('(pointer: fine)').matches) {
    document.addEventListener('pointermove', e => {
      const b = e.target.closest && e.target.closest('.btn--accent, .btn--big');
      document.querySelectorAll('.btn.is-mag').forEach(x => { if (x !== b) { x.classList.remove('is-mag'); x.style.removeProperty('--bx'); x.style.removeProperty('--by'); } });
      if (!b || b.closest('.studio')) return;
      const r = b.getBoundingClientRect();
      b.classList.add('is-mag');
      b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px');
      b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .25).toFixed(1) + 'px');
    }, { passive: true });
  }
})();
