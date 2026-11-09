/* ERLY v9 — keeps the holo scanning-grid background mounted inside Noor's
   panel (the panel's contents are re-rendered when the language changes).
   The animation only runs while the panel is open and visible. */
(function () {
  'use strict';
  function ensure(panel) {
    if (!window.ERLY || !ERLY.ambient || !panel) return;
    let amb = panel.querySelector(':scope > .amb');
    if (!amb) { amb = document.createElement('div'); amb.className = 'amb'; amb.dataset.ambient = 'holo'; amb.setAttribute('aria-hidden', 'true'); panel.prepend(amb); ERLY.ambient.mount(amb, 'holo'); }
  }
  function watch() {
    const panel = document.querySelector('.cmp');
    if (!panel) return false;
    ensure(panel);
    new MutationObserver(() => ensure(panel)).observe(panel, { childList: true });
    return true;
  }
  const start = () => { if (!watch()) { const mo = new MutationObserver(() => { if (watch()) mo.disconnect(); }); mo.observe(document.body, { childList: true }); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
