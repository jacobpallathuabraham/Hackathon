/* ERLY — the header nav collapses into its menu button whenever the links
   would collide with the header tools. Measured, not guessed: it works for
   English and Arabic, any text size (Accessibility Centre) and any width.
   Re-checks on resize, language change and once web fonts have loaded. */
(function () {
  'use strict';
  const html = document.documentElement;
  let raf = 0;
  function fit() {
    raf = 0;
    const inner = document.querySelector('.nav__inner'); if (!inner) return;
    const links = inner.querySelector('.nav__links'), tools = inner.querySelector('.nav__tools');
    if (!links || !tools) return;
    const was = html.classList.contains('nav-collapse');
    html.classList.remove('nav-collapse');
    // with the media-query collapse active (narrow screens) there is nothing to measure
    const cs = getComputedStyle(links);
    if (cs.position === 'fixed') { if (was) { /* keep menu state consistent */ } return; }
    const a = [...links.children].filter(el => el.getBoundingClientRect().width), first = a[0], last = a[a.length - 1];
    if (!first) return;
    const rtl = getComputedStyle(inner).direction === 'rtl';
    const lr = links.getBoundingClientRect(), tr = tools.getBoundingClientRect();
    const linksEnd = rtl ? Math.min(...a.map(el => el.getBoundingClientRect().left)) : Math.max(...a.map(el => el.getBoundingClientRect().right));
    const overflow = links.scrollWidth > links.clientWidth + 1;
    const collide = rtl ? linksEnd < tr.right + 12 : linksEnd > tr.left - 12;
    html.classList.toggle('nav-collapse', overflow || collide || lr.width < 40);
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(fit); };
  addEventListener('resize', queue, { passive: true });
  if (window.I18N && I18N.onChange) I18N.onChange(() => setTimeout(queue, 30));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', queue); else queue();
  window.ERLY = window.ERLY || {};
  ERLY.navfit = queue;
})();
