/* ERLY v20 — shared interaction helpers (no dependencies).
   ERLY.ui.busy(button, promise)  — shows a spinner on the button while work runs, restores it after.
   ERLY.ui.flash(element, 'ok'|'err') — a brief, non-layout-shifting acknowledgement.
   ERLY.ui.swap(container, render) — replaces a view with a short enter transition (View Transitions when the
   browser has them and motion is allowed, otherwise a CSS fade). */
(function () {
  'use strict';
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const ui = {
    async busy(btn, work) {
      if (!btn) return work; btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
      try { return await work; } finally { btn.removeAttribute('aria-busy'); btn.disabled = false; }
    },
    flash(el, kind) { if (!el) return; const c = kind === 'err' ? 'ui-err' : 'ui-ok'; el.classList.remove(c); void el.offsetWidth; el.classList.add(c); setTimeout(() => el.classList.remove(c), 950); },
    swap(container, render) {
      if (!container) return render();
      if (!still() && document.startViewTransition && !document.documentElement.classList.contains('vt-theme')) { try { return document.startViewTransition(() => render()); } catch (e) { /* fall through */ } }
      render(); if (!still()) { container.classList.remove('ui-view-in'); void container.offsetWidth; container.classList.add('ui-view-in'); }
    },
    still
  };
  window.ERLY = window.ERLY || {}; ERLY.ui = ui;
})();
