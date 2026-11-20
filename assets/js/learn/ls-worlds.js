/* ERLY Learning Studio — subject worlds: lightweight procedural atmospheres, one per subject.
   Physics: a quiet orbit in a field of stars · Chemistry: drifting particles that briefly bond ·
   Maths: a slowly turning geometric lattice · Biology: cells drifting and dividing · History: strata of time ·
   Geography: a turning globe · English: letters drifting into words · Languages: speech bubbles crossing ·
   Social science: a small city whose lights come and go.

   Cost rules: canvas 2D only, a few dozen shapes, capped at ~30 frames per second, rendered at most at 1.5× pixel
   density; paused when off-screen, in a hidden tab or once the canvas leaves the page. With reduced motion, on
   small "card" canvases, or on low-power devices (≤ 2 cores or ≤ 2 GB memory reported), one still frame is drawn. */
(function () {
  'use strict';
  const LS = window.LS;
  const weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const dark = () => document.documentElement.dataset.theme === 'dark';
  const HUE = { maths: 236, physics: 204, chemistry: 168, biology: 352, history: 28, geography: 128, english: 32, languages: 300, social: 12, cs: 278, more: 20 };
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);

  const W = {
    physics(g, w, h, t, H) { const cx = w * 0.72, cy = h * 0.55; for (const s of this.stars || (this.stars = Array.from({ length: 70 }, () => [rnd(), rnd(), rnd()]))) { g.globalAlpha = 0.25 + 0.5 * s[2] * (0.6 + 0.4 * Math.sin(t * 0.7 + s[0] * 20)); g.fillRect(s[0] * w, s[1] * h, 1.4, 1.4); } g.globalAlpha = 1;
      g.strokeStyle = `hsla(${H},60%,60%,.35)`; g.beginPath(); g.ellipse(cx, cy, w * 0.22, h * 0.18, -0.3, 0, 7); g.stroke(); g.fillStyle = `hsla(40,90%,60%,.9)`; g.beginPath(); g.arc(cx, cy, Math.min(w, h) * 0.04, 0, 7); g.fill();
      const a = t * 0.35; g.fillStyle = `hsla(${H},70%,65%,1)`; g.beginPath(); g.arc(cx + Math.cos(a) * w * 0.22 * Math.cos(-0.3) - Math.sin(a) * h * 0.18 * Math.sin(-0.3), cy + Math.cos(a) * w * 0.22 * Math.sin(-0.3) + Math.sin(a) * h * 0.18 * Math.cos(-0.3), Math.min(w, h) * 0.018, 0, 7); g.fill(); },
    chemistry(g, w, h, t, H) { const P = this.p || (this.p = Array.from({ length: 26 }, () => ({ x: rnd() * w, y: rnd() * h, vx: (rnd() - 0.5) * 12, vy: (rnd() - 0.5) * 12 })));
      P.forEach(p => { p.x = (p.x + p.vx * this.dt + w) % w; p.y = (p.y + p.vy * this.dt + h) % h; });
      g.strokeStyle = `hsla(${H},55%,55%,.35)`; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y); if (d < 60) { g.globalAlpha = 1 - d / 60; g.beginPath(); g.moveTo(P[i].x, P[i].y); g.lineTo(P[j].x, P[j].y); g.stroke(); } } g.globalAlpha = 1;
      P.forEach((p, i) => { g.fillStyle = `hsla(${i % 3 ? H : H + 140},60%,55%,.75)`; g.beginPath(); g.arc(p.x, p.y, i % 3 ? 4 : 6, 0, 7); g.fill(); }); },
    maths(g, w, h, t, H) { g.strokeStyle = `hsla(${H},50%,55%,.32)`; const cx = w * 0.7, cy = h * 0.5, R = Math.min(w, h) * 0.42; for (let k = 0; k < 6; k++) { g.beginPath(); const n = 3 + k, rot = t * 0.08 * (k % 2 ? 1 : -1) + k; for (let i = 0; i <= n; i++) { const a = rot + i * 2 * Math.PI / n, r = R * (0.35 + k * 0.12); g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.stroke(); }
      g.strokeStyle = `hsla(${H},60%,60%,.5)`; g.beginPath(); for (let x = 0; x <= w; x += 6) { const y = h * 0.5 + Math.sin(x / w * 6 + t * 0.5) * h * 0.18; g[x ? 'lineTo' : 'moveTo'](x, y); } g.stroke(); },
    biology(g, w, h, t, H) { const C = this.c || (this.c = Array.from({ length: 10 }, () => ({ x: rnd() * w, y: rnd() * h, r: 14 + rnd() * 22, ph: rnd() * 6 })));
      C.forEach((c, i) => { const x = (c.x + Math.sin(t * 0.2 + c.ph) * 14 + w) % w, y = c.y + Math.cos(t * 0.17 + c.ph) * 10, sq = 1 + 0.06 * Math.sin(t * 0.9 + c.ph); g.fillStyle = `hsla(${H + (i % 2) * 30},55%,60%,.18)`; g.strokeStyle = `hsla(${H},50%,50%,.4)`; g.beginPath(); g.ellipse(x, y, c.r * sq, c.r / sq, c.ph, 0, 7); g.fill(); g.stroke(); g.fillStyle = `hsla(${H + 40},45%,45%,.4)`; g.beginPath(); g.arc(x + c.r * 0.2, y, c.r * 0.28, 0, 7); g.fill(); }); },
    history(g, w, h, t, H) { for (let i = 0; i < 7; i++) { const y = h * (0.2 + i * 0.11); g.fillStyle = `hsla(${H + i * 6},${30 + i * 4}%,${dark() ? 30 + i * 3 : 70 - i * 4}%,.35)`; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 20) g.lineTo(x, y + Math.sin(x / 90 + i + t * 0.05) * 6); g.lineTo(w, h); g.lineTo(0, h); g.fill(); }
      g.fillStyle = `hsla(${H},60%,50%,.7)`; const x = (t * 18) % (w + 40) - 20; g.beginPath(); g.arc(x, h * 0.16, 3, 0, 7); g.fill(); },
    geography(g, w, h, t, H) { const cx = w * 0.72, cy = h * 0.52, R = Math.min(w, h) * 0.38; g.fillStyle = `hsla(205,55%,${dark() ? 30 : 75}%,.5)`; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.strokeStyle = `hsla(${H},45%,40%,.45)`;
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(cx, cy + k * R * 0.32, R * Math.cos(Math.asin(k * 0.32)), R * 0.08, 0, 0, 7); g.stroke(); }
      for (let k = 0; k < 6; k++) { const a = (t * 0.15 + k * Math.PI / 6) % Math.PI; g.beginPath(); g.ellipse(cx, cy, Math.abs(Math.cos(a)) * R, R, 0, 0, 7); g.stroke(); }
      g.fillStyle = `hsla(${H},45%,45%,.5)`; for (let k = 0; k < 5; k++) { const a = t * 0.15 + k * 1.3, x = cx + Math.sin(a) * R * 0.7; if (Math.cos(a) > 0) { g.beginPath(); g.ellipse(x, cy + (k - 2) * R * 0.25, R * 0.12 * Math.cos(a), R * 0.08, 0, 0, 7); g.fill(); } } },
    english(g, w, h, t, H) { const L = this.l || (this.l = 'onceuponatimestorywordsplot'.split('').map((ch, i) => ({ ch, x: rnd() * w, y: rnd() * h, s: 12 + rnd() * 16, ph: i }))); g.textAlign = 'center';
      L.forEach(l => { g.font = `italic ${l.s}px Georgia, serif`; g.fillStyle = `hsla(${H},45%,45%,${0.18 + 0.2 * (1 + Math.sin(t * 0.5 + l.ph)) / 2})`; g.fillText(l.ch, (l.x + t * 6) % (w + 20), l.y + Math.sin(t * 0.3 + l.ph) * 6); }); },
    languages(g, w, h, t, H) { ['Bonjour', 'مرحبا', 'Hola', 'Ciao', 'こんにちは', 'Hallo', 'Olá', 'नमस्ते'].forEach((s, i) => { const x = ((i * 0.13 * w + t * (10 + i * 2)) % (w + 120)) - 60, y = h * (0.18 + (i % 4) * 0.2); g.fillStyle = `hsla(${H + i * 12},45%,${dark() ? 35 : 88}%,.55)`; g.strokeStyle = `hsla(${H},40%,45%,.35)`; g.beginPath(); g.roundRect ? g.roundRect(x - 34, y - 14, 68, 26, 12) : g.rect(x - 34, y - 14, 68, 26); g.fill(); g.stroke(); g.fillStyle = `hsla(${H},40%,30%,.6)`; g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText(s, x, y + 4); }); },
    social(g, w, h, t, H) { const B = this.b || (this.b = Array.from({ length: 18 }, (_, i) => ({ x: i / 18, w: 0.035 + rnd() * 0.03, h: 0.25 + rnd() * 0.5 })));
      B.forEach((b, i) => { const x = b.x * w, bw = b.w * w, bh = b.h * h; g.fillStyle = `hsla(${H},20%,${dark() ? 22 : 70}%,.55)`; g.fillRect(x, h - bh, bw, bh); for (let y = h - bh + 6; y < h - 6; y += 10) for (let xx = x + 3; xx < x + bw - 3; xx += 7) { const on = Math.sin(xx * 13.1 + y * 7.7 + Math.floor(t * 0.3 + i)) > 0.3; if (on) { g.fillStyle = `hsla(45,90%,${dark() ? 65 : 50}%,.7)`; g.fillRect(xx, y, 3, 4); } } }); }
  };
  W.cs = W.maths; W.more = W.social;

  const live = new Set(); let raf = 0, last = 0;
  function loop(ts) {
    raf = 0; if (document.hidden) return;
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0.033; if (last && ts - last < 32) { raf = requestAnimationFrame(loop); return; } last = ts;
    live.forEach(m => { if (!m.c.isConnected) { live.delete(m); m.io && m.io.disconnect(); return; } if (m.vis) { m.t += dt; m.st.dt = dt; paint(m); } });
    if (live.size) raf = requestAnimationFrame(loop);
  }
  function paint(m) {
    const c = m.c, dpr = Math.min(1.5, devicePixelRatio || 1), w = c.clientWidth || 300, h = c.clientHeight || 150;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); g.fillStyle = `hsla(${HUE[m.s] || 220},50%,${dark() ? 70 : 35}%,.6)`; g.lineWidth = 1.2;
    (W[m.s] || W.maths).call(m.st, g, w, h, m.t, HUE[m.s] || 220);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && live.size && !raf) { last = 0; raf = requestAnimationFrame(loop); } });

  LS.worlds = {
    mount(c, subject, o) {
      if (c._world) return; c._world = true;
      const m = { c, s: subject, t: 7.3, st: { dt: 0.033 }, vis: true };
      paint(m);
      if ((o && o.still) || reduced() || weak) return;
      if ('IntersectionObserver' in window) { m.io = new IntersectionObserver(es => { m.vis = es[0].isIntersecting; }); m.io.observe(c); }
      live.add(m); if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
    },
    stopAll() { live.forEach(m => m.io && m.io.disconnect()); live.clear(); },
    count: () => live.size, weak
  };
  LS.on('leave', () => { /* canvases of the old page are dropped from the loop when they leave the DOM */ });
})();
