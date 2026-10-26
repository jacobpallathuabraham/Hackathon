/* SAS sign-in — living background, drawn in one fixed canvas: flowing aurora
   ribbons, a rolling dotted-wave terrain, a drifting constellation that leans
   toward the pointer, and the occasional shooting star. The canvas never
   rebuilds on scroll (mobile address bars change the height while scrolling);
   it only re-seeds when the width changes. Pauses when the tab is hidden. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.getElementById('loginFx'), spot = document.getElementById('loginSpot');
  if (!cv) return;
  const g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, pts = [], stars = [], col = {}, raf = 0, lastW = 0;
  const mouse = { x: -999, y: -999, tx: -999, ty: -999 };
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function rgb(h, a) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return `rgba(150,140,130,${a})`; const n = parseInt(m[1], 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  function colours() { col = { a: css('--accent') || '#C1502B', b: css('--teal') || '#146A63', c: css('--s4') || '#5B4B8A', ink: css('--ink') || '#1B1915', dark: document.documentElement.dataset.theme === 'dark' }; }
  function size() {
    dpr = Math.min(1.75, devicePixelRatio || 1);
    W = innerWidth;
    // use the larger of the viewport and the screen so the mobile URL bar never forces a resize
    H = Math.max(innerHeight, (screen && screen.height) || 0);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (W !== lastW) {
      lastW = W;
      const n = Math.round(Math.min(90, W * innerHeight / 16000));
      pts = Array.from({ length: n }, (_, i) => ({ x: Math.random() * W, y: Math.random() * innerHeight, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: 1 + Math.random() * 1.6, c: ['a', 'b', 'c'][i % 3], ph: Math.random() * 6.28 }));
    }
  }
  let rT = 0;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (innerWidth !== lastW || innerHeight > H) size(); }, 150); });

  function ribbon(t, yBase, amp, freq, speed, thick, c1, c2, alpha) {
    const grd = g.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, rgb(c1, 0)); grd.addColorStop(.3, rgb(c1, alpha)); grd.addColorStop(.7, rgb(c2, alpha)); grd.addColorStop(1, rgb(c2, 0));
    g.fillStyle = grd;
    g.beginPath();
    const step = 24;
    for (let x = 0; x <= W + step; x += step) {
      const y = yBase + Math.sin(x * freq + t * speed) * amp + Math.sin(x * freq * 2.3 - t * speed * 1.4) * amp * .35;
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    for (let x = W + step; x >= 0; x -= step) {
      const y = yBase + thick * (0.6 + .4 * Math.sin(x * .004 + t * speed * .7)) + Math.sin(x * freq + t * speed + .6) * amp + Math.sin(x * freq * 2.3 - t * speed * 1.4) * amp * .35;
      g.lineTo(x, y);
    }
    g.closePath(); g.fill();
  }
  function terrain(t) {
    const rows = 13, cols = Math.min(64, Math.round(W / 22)), vh = innerHeight;
    const top = vh * .66, depth = vh * .34;
    for (let r = 0; r < rows; r++) {
      const z = r / (rows - 1), py = top + Math.pow(z, 1.6) * depth, spread = .55 + z * .9;
      for (let c = 0; c <= cols; c++) {
        const u = c / cols - .5, px = W / 2 + u * W * spread;
        const wave = Math.sin(u * 7 + t * .0011 + r * .45) * Math.cos(r * .6 - t * .0008) * (6 + z * 14);
        const near = Math.max(0, 1 - Math.hypot(mouse.x - px, mouse.y - (py + wave)) / 160);
        g.globalAlpha = (.08 + z * .28) * (col.dark ? 1.1 : 1) + near * .4;
        g.fillStyle = c % 2 ? col.b : col.a;
        g.beginPath(); g.arc(px, py + wave - near * 8, .7 + z * 1.4 + near * 1.2, 0, 6.283); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  function constellation(t) {
    const link = 120;
    for (const p of pts) {
      const a = Math.sin(p.x * .004 + t * .00012) + Math.cos(p.y * .004 - t * .0001);
      p.vx += Math.cos(a) * .006; p.vy += Math.sin(a) * .006;
      const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < 200) { p.vx += dx / d * .025; p.vy += dy / d * .025; }
      p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = innerHeight + 20; if (p.y > innerHeight + 20) p.y = -20;
    }
    g.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const p = pts[i], q = pts[j], dx = p.x - q.x, dy = p.y - q.y;
      if (Math.abs(dx) > link || Math.abs(dy) > link) continue;
      const d = Math.hypot(dx, dy);
      if (d < link) { g.strokeStyle = col[p.c]; g.globalAlpha = (1 - d / link) * (col.dark ? .26 : .2); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); }
    }
    for (const p of pts) {
      const near = Math.max(0, 1 - Math.hypot(mouse.x - p.x, mouse.y - p.y) / 200);
      g.globalAlpha = .45 + .2 * Math.sin(t * .002 + p.ph) + near * .4;
      g.fillStyle = col[p.c];
      g.beginPath(); g.arc(p.x, p.y, p.r + near * 1.5, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
  }
  function shooting(t) {
    if (Math.random() < .004 && stars.length < 2) stars.push({ x: Math.random() * W * .7, y: Math.random() * innerHeight * .4, vx: 7 + Math.random() * 4, vy: 2.5 + Math.random() * 2, life: 1 });
    stars = stars.filter(s => s.life > 0);
    for (const s of stars) {
      s.x += s.vx; s.y += s.vy; s.life -= .018;
      const grd = g.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
      grd.addColorStop(0, rgb(col.a, .9 * s.life)); grd.addColorStop(1, rgb(col.a, 0));
      g.strokeStyle = grd; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * 14, s.y - s.vy * 14); g.stroke();
    }
  }
  function frame(t) {
    g.clearRect(0, 0, W, H);
    mouse.x += (mouse.tx - mouse.x) * .08; mouse.y += (mouse.ty - mouse.y) * .08;
    const vh = innerHeight, al = col.dark ? .16 : .13;
    ribbon(t * .001, vh * .18, 46, .0032, .35, 120, col.a, col.c, al);
    ribbon(t * .001, vh * .42, 60, .0024, -.28, 150, col.b, col.a, al * .85);
    ribbon(t * .001, vh * .58, 38, .004, .22, 90, col.c, col.b, al * .7);
    terrain(t);
    constellation(t);
    shooting(t);
    raf = requestAnimationFrame(frame);
  }
  colours(); size();
  addEventListener('accentchange', () => setTimeout(colours, 60));
  new MutationObserver(colours).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });
  addEventListener('pointermove', e => {
    mouse.tx = e.clientX; mouse.ty = e.clientY;
    if (spot) { spot.style.setProperty('--mx', e.clientX + 'px'); spot.style.setProperty('--my', e.clientY + 'px'); spot.style.opacity = 1; }
  }, { passive: true });
  if (reduce) { frame(0); cancelAnimationFrame(raf); return; }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame); });

  // the sign-in card leans gently toward the pointer (2D-safe: no backdrop blur on a 3D layer)
  const card = document.getElementById('lcard');
  if (card && matchMedia('(pointer: fine)').matches) {
    const wrap = card.parentElement;
    let tx = 0, ty = 0, cx = 0, cy = 0, on = false, tr = 0;
    const loop = () => { cx += (tx - cx) * .12; cy += (ty - cy) * .12; card.style.setProperty('--rx', (-cy * 4).toFixed(2) + 'deg'); card.style.setProperty('--ry', (cx * 5).toFixed(2) + 'deg'); if (on || Math.abs(cx) + Math.abs(cy) > .002) tr = requestAnimationFrame(loop); else tr = 0; };
    wrap.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; on = true;
      card.style.setProperty('--gx', ((tx + .5) * 100).toFixed(1) + '%'); card.style.setProperty('--gy', ((ty + .5) * 100).toFixed(1) + '%');
      if (!tr) tr = requestAnimationFrame(loop);
    });
    wrap.addEventListener('pointerleave', () => { tx = 0; ty = 0; on = false; if (!tr) tr = requestAnimationFrame(loop); });
    addEventListener('scroll', () => { tx = 0; ty = 0; on = false; if (!tr) tr = requestAnimationFrame(loop); }, { passive: true });
  }
})();
