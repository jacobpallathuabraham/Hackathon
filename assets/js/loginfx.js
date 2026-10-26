/* SAS sign-in — living background: drifting aurora, a particle constellation
   that gently follows the pointer, a soft spotlight, and a card that tilts
   toward the cursor. Pauses when the tab is hidden; still for reduced motion. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.getElementById('loginFx'), spot = document.getElementById('loginSpot');
  if (!cv) return;
  const g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, pts = [], mouse = { x: -999, y: -999, tx: -999, ty: -999 }, col = {}, raf = 0;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function colours() { col = { a: css('--accent') || '#C1502B', b: css('--teal') || '#146A63', c: css('--s4') || '#5B4B8A', line: css('--ink') || '#1B1915', dark: document.documentElement.dataset.theme === 'dark' }; }
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(110, W * H / 14000));
    pts = Array.from({ length: n }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: 1 + Math.random() * 1.8, c: ['a', 'b', 'c'][i % 3], ph: Math.random() * 6.28 }));
  }
  function frame(t) {
    g.clearRect(0, 0, W, H);
    mouse.x += (mouse.tx - mouse.x) * .08; mouse.y += (mouse.ty - mouse.y) * .08;
    const link = 130;
    for (const p of pts) {
      // a slow flow field keeps the drift organic
      const a = Math.sin(p.x * .004 + t * .00012) + Math.cos(p.y * .004 - t * .0001);
      p.vx += Math.cos(a) * .006; p.vy += Math.sin(a) * .006;
      const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
      if (d < 220) { p.vx += dx / d * .03; p.vy += dy / d * .03; }
      p.vx *= .985; p.vy *= .985;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
    }
    g.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const p = pts[i], q = pts[j], d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < link) { g.strokeStyle = col[p.c]; g.globalAlpha = (1 - d / link) * (col.dark ? .28 : .22); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); }
    }
    for (const p of pts) {
      const near = Math.max(0, 1 - Math.hypot(mouse.x - p.x, mouse.y - p.y) / 220);
      g.globalAlpha = .45 + .4 * Math.sin(t * .002 + p.ph) * .5 + near * .5;
      g.fillStyle = col[p.c];
      g.beginPath(); g.arc(p.x, p.y, p.r + near * 1.6, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  colours(); size();
  addEventListener('resize', size);
  addEventListener('accentchange', () => setTimeout(colours, 60));
  new MutationObserver(colours).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });
  addEventListener('pointermove', e => {
    mouse.tx = e.clientX; mouse.ty = e.clientY;
    if (spot) { spot.style.setProperty('--mx', e.clientX + 'px'); spot.style.setProperty('--my', e.clientY + 'px'); spot.style.opacity = 1; }
  }, { passive: true });
  if (reduce) { frame(0); cancelAnimationFrame(raf); return; }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(frame); });

  // the sign-in card leans gently toward the pointer
  const card = document.getElementById('lcard');
  if (card && matchMedia('(pointer: fine)').matches) {
    const wrap = card.parentElement;
    wrap.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg'); card.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
      card.style.setProperty('--gx', ((x + .5) * 100).toFixed(1) + '%'); card.style.setProperty('--gy', ((y + .5) * 100).toFixed(1) + '%');
    });
    wrap.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  }
})();
