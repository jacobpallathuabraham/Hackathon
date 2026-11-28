/* ERLY Learning Studio — v46 POLISH: motion and atmosphere for the Studio's pages.

   After every route render (and once more when late content arrives) this
   • lets sections, cards, plan rows, momentum tiles, topics and objectives FLOW IN as they scroll into view (LS.xreveal:
     IntersectionObserver + transform/opacity only — nothing runs per frame);
   • COUNTS UP the momentum numbers when they appear;
   • gives every topic a small animated drawing (LS.xart) in its heading;
   • keeps an ambient aurora behind the pages that are not the 3D universe (pure CSS, GPU-composited, paused when the tab
     is hidden; switched off with reduced motion or "fewer distractions").
   No layout is changed by script; the look lives in learn-v46.css. */
(function () {
  'use strict';
  const LS = window.LS; if (!LS || !LS.on) return;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const SEL = ['.uv-card', '.at-open > div', '.at-shelf', '.at-plan__i', '.at-mom__list > li', '.at-insw', '.at-portal', '.at-atlas > li', '.at-xlist > li', '.cz-index__list > li', '.at-topic', '.at-objs > li', '.ls-panel', '.ls-pagehead', '.uv-sec > .uv-h2', '.s34-stat'];
  let amb = null;
  function ambient(on) { if (!amb) { amb = document.createElement('div'); amb.className = 'ls-aurora'; amb.setAttribute('aria-hidden', 'true'); amb.innerHTML = '<i></i><i></i><i></i><b></b>'; document.body.prepend(amb); } amb.hidden = !on; }
  function countUp(root, cleanups) { const els = [...root.querySelectorAll('.at-mom__list b')].filter(b => !b.dataset.cu); if (!els.length) return;
    const run = b => { const tn = [...b.childNodes].find(n => n.nodeType === 3); if (!tn) return; const to = parseFloat(tn.textContent); if (!Number.isFinite(to) || to <= 0 || still()) return; const t0 = performance.now(), D = 900 + Math.min(900, to * 40);
      const f = now => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); tn.textContent = String(Math.round(to * e)); if (k < 1 && b.isConnected) requestAnimationFrame(f); }; tn.textContent = '0'; requestAnimationFrame(f); };
    if (!('IntersectionObserver' in window)) return; const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } }), { threshold: 0.4 });
    els.forEach(b => { b.dataset.cu = '1'; io.observe(b); }); if (cleanups) cleanups.push(() => io.disconnect()); }
  function topicArt(root) { root.querySelectorAll('.at-topic > h3').forEach(h => { if (h.querySelector('.xc-art') || !LS.xart) return; const a = h.querySelector('a'); const txt = a ? a.textContent : h.textContent, sec = h.closest('.at-sec'), sub = sec && sec.querySelector('.at-h2') ? sec.querySelector('.at-h2').textContent.toLowerCase() : '';
      const key = { biology: 'biology', chemistry: 'chemistry', mathematics: 'maths', physics: 'physics' }[sub] || 'more', t = h.closest('.at-topic'); t.style.setProperty('--hue', LS.xHue ? LS.xHue(key) : 220); h.insertAdjacentHTML('afterbegin', `<span class="xc-art at-topic__art">${LS.xart('', txt, key)}</span>`); }); }
  function polish(view) { if (!view || !view.isConnected) return; SEL.forEach(s => view.querySelectorAll(s).forEach((e, i) => { if (!e.classList.contains('xc-reveal')) { e.classList.add('xc-reveal'); e.style.setProperty('--i', i % 12); } }));
    view.querySelectorAll('.cz-index__list a').forEach(a => { const o = a.querySelector('.cz-orb'); if (o && !a.style.getPropertyValue('--a')) a.style.setProperty('--a', o.style.getPropertyValue('--a')); }); /* the card glows in its world's colour */
    topicArt(view); if (LS.xreveal) LS.xreveal(view, live); countUp(view, live); }
  const live = []; LS.on('leave', () => { live.splice(0).forEach(f => { try { f(); } catch (e) { /* */ } }); }); /* observers end with their page */
  LS.polish = polish;
  LS.on('route', ({ area }) => { const view = document.getElementById('lsView'); ambient(area !== 'home' && area !== 'space'); polish(view);
    // content that arrives a moment later (the dashboard under the universe, lazy panels)
    setTimeout(() => polish(view), 400); setTimeout(() => polish(view), 1500); });
  document.addEventListener('visibilitychange', () => { if (amb) amb.classList.toggle('is-paused', document.hidden); });
})();
