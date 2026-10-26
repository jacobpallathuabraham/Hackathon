/* Acubins portal — user menu and sign-out (demo session only). */
(function () {
  'use strict';
  const btn = document.getElementById('userBtn'), menu = document.getElementById('userMenu');
  if (btn) {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  }
  const out = document.getElementById('logoutBtn');
  if (out) out.addEventListener('click', () => {
    try { sessionStorage.removeItem('acubins-role'); sessionStorage.setItem('acubins-bye', '1'); } catch (e) {}
    document.body.classList.add('is-leaving');
    setTimeout(() => location.href = 'index.html', 450);
  });
})();
