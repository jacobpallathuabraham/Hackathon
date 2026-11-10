/* ERLY — ambient animated backgrounds.

   Three designed looks, all drawn on one <canvas> behind content:
     aurora        slow, soft light fields in the page's own accent colours
     constellation a sparse network of drifting points that link when near
     holo          a perspective grid with a scanning light (the companion)
   Looks can be combined: data-ambient="aurora constellation".

   Built to stay out of the way:
   - renders at reduced resolution (aurora is blurred light anyway) and is
     capped at 30 fps;
   - pauses when off-screen (IntersectionObserver) or the tab is hidden;
   - follows light/dark theme and the student's accent colour;
   - prefers-reduced-motion → one still frame; low-power devices → fewer
     particles and no animation of the aurora;
   - pointer-events: none, aria-hidden, never behind text without a scrim.

   Usage: <div class="amb" data-ambient="aurora constellation"></div> inside a
   positioned section (auto-mounted), or ERLY.ambient.mount(el, 'holo'). */
(function () {
  'use strict';
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const low = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  const css = (el, n, d) => (getComputedStyle(el).getPropertyValue(n) || '').trim() || d;
  function rgb(c) {
    const m = String(c).match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    const r = String(c).match(/rgba?\(([^)]+)\)/); if (r) return r[1].split(',').slice(0, 3).map(Number);
    return [120, 140, 200];
  }
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  const ERLY_AMBIENT_OFF = true;
  function mount(host, kinds, opts) {
    // v10.1: backgrounds are off (see v9.css) — nothing is drawn and no animation loop runs
    if (ERLY_AMBIENT_OFF) { const stub = { running: () => false, kinds: [], auroraScale: () => 0, destroy() {} }; if (host) host.__amb = stub; return stub; }
    opts = opts || {};
    if (!host || host.__amb) return host && host.__amb;
    kinds = String(kinds || host.dataset.ambient || 'aurora').split(/\s+/);
    // the light sits between the section's background and its content: the parent becomes a stacking context
    const par = host.parentElement, ps = getComputedStyle(par);
    if (ps.position === 'static' && getComputedStyle(host).position !== 'fixed') par.style.position = 'relative';
    if (ps.isolation !== 'isolate') par.style.isolation = 'isolate';
    const cv = document.createElement('canvas'); cv.className = 'amb__cv'; cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv);
    const g = cv.getContext('2d', { alpha: true });
    let W = 0, H = 0, scale = 1, dark = false, pal = {}, raf = 0, last = 0, t = Math.random() * 1000, visible = true, alive = true;
    const pts = [];
    function palette() {
      dark = document.documentElement.dataset.theme === 'dark' || host.dataset.ambientTheme === 'dark';
      const root = host.closest('[data-ambient-palette]') || document.documentElement;
      const holo = kinds.includes('holo');
      pal = {
        a: rgb(holo ? '#22d3ee' : css(root, '--accent', '#C1502B')),
        b: rgb(holo ? '#8b5cf6' : css(root, '--teal', '#146A63')),
        c: rgb(holo ? '#3b82f6' : css(root, '--gold', '#D9A441')),
        dot: dark || holo ? [220, 235, 255] : [60, 50, 40]
      };
    }
    function size() {
      const r = host.getBoundingClientRect();
      // aurora-only canvases render at 1/3 resolution (it is soft light); points/grid at up to 1.5×
      scale = kinds.length === 1 && kinds[0] === 'aurora' ? 0.34 : Math.min(1.5, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
      g.setTransform(scale, 0, 0, scale, 0, 0);
      const n = kinds.includes('constellation') || kinds.includes('holo') ? Math.round(Math.min(low ? 26 : 70, W * H / (kinds.includes('holo') ? 16000 : 22000))) : 0;
      while (pts.length < n) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 7, r: 0.7 + Math.random() * 1.6, p: Math.random() * 6.28 });
      pts.length = n;
    }
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    function onMove(e) { const r = host.getBoundingClientRect(); mouse.tx = (e.clientX - r.left) / r.width; mouse.ty = (e.clientY - r.top) / r.height; }

    // aurora light is soft: render it into a small offscreen canvas (~1/3 resolution) and scale it up
    const aur = kinds.includes('aurora') && !(kinds.length === 1) ? document.createElement('canvas') : null, ag = aur && aur.getContext('2d');
    function aurora(tt) {
      if (aur) {
        const w = Math.max(2, Math.round(W * 0.34)), h = Math.max(2, Math.round(H * 0.34));
        if (aur.width !== w || aur.height !== h) { aur.width = w; aur.height = h; }
        ag.setTransform(0.34, 0, 0, 0.34, 0, 0); ag.clearRect(0, 0, W, H);
        drawAurora(ag, tt); g.drawImage(aur, 0, 0, W, H); return;
      }
      drawAurora(g, tt);
    }
    function drawAurora(g, tt) {
      const blobs = [[pal.a, 0.22, 0.30, 0.55], [pal.b, 0.78, 0.25, 0.5], [pal.c, 0.55, 0.85, 0.45], [pal.a, 0.92, 0.75, 0.35]];
      const k = dark ? 0.26 : 0.17;
      g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      blobs.forEach(([c, bx, by, br], i) => {
        const x = (bx + Math.sin(tt * 0.00011 * (i + 1) + i) * 0.09 + (mouse.x - 0.5) * 0.04) * W;
        const y = (by + Math.cos(tt * 0.00009 * (i + 2) + i * 2) * 0.08 + (mouse.y - 0.5) * 0.03) * H;
        const R = br * Math.max(W, H) * (0.9 + Math.sin(tt * 0.00017 + i) * 0.08);
        const gr = g.createRadialGradient(x, y, 0, x, y, R);
        gr.addColorStop(0, rgba(c, k)); gr.addColorStop(0.5, rgba(c, k * 0.35)); gr.addColorStop(1, rgba(c, 0));
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      });
      g.globalCompositeOperation = 'source-over';
    }
    function constellation(dt) {
      const link = Math.min(150, Math.max(90, W / 9)), L2 = link * link;
      pts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.p += dt; if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20; });
      const ox = (mouse.x - 0.5) * 18, oy = (mouse.y - 0.5) * 12;
      g.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d2 = dx * dx + dy * dy;
        if (d2 < L2) { g.strokeStyle = rgba(i % 3 ? pal.a : pal.b, (1 - d2 / L2) * (dark ? 0.32 : 0.2)); g.beginPath(); g.moveTo(pts[i].x + ox, pts[i].y + oy); g.lineTo(pts[j].x + ox, pts[j].y + oy); g.stroke(); }
      }
      pts.forEach(p => { g.fillStyle = rgba(pal.dot, (dark ? 0.55 : 0.35) * (0.6 + 0.4 * Math.sin(p.p * 1.3))); g.beginPath(); g.arc(p.x + ox, p.y + oy, p.r, 0, 6.283); g.fill(); });
    }
    function holo(tt, dt) {
      // perspective floor grid
      const hz = H * 0.62, cx = W * (0.5 + (mouse.x - 0.5) * 0.06);
      g.lineWidth = 1;
      for (let i = -14; i <= 14; i++) { const xb = cx + i * W * 0.09; g.strokeStyle = rgba(pal.a, 0.07 + (i === 0 ? 0.05 : 0)); g.beginPath(); g.moveTo(cx + i * 6, hz); g.lineTo(xb, H); g.stroke(); }
      const off = (tt * 0.00004) % 1;
      for (let k = 0; k < 10; k++) { const f = (k + off) / 10, y = hz + (H - hz) * f * f; g.strokeStyle = rgba(pal.a, 0.03 + 0.12 * f); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // horizon glow
      const hg = g.createLinearGradient(0, hz - 60, 0, hz + 40); hg.addColorStop(0, rgba(pal.b, 0)); hg.addColorStop(0.6, rgba(pal.a, 0.12)); hg.addColorStop(1, rgba(pal.a, 0)); g.fillStyle = hg; g.fillRect(0, hz - 60, W, 100);
      // scanning sweep
      const sx = ((tt * 0.00007) % 1.4 - 0.2) * W;
      const sg = g.createLinearGradient(sx - 120, 0, sx + 120, 0); sg.addColorStop(0, rgba(pal.a, 0)); sg.addColorStop(0.5, rgba(pal.a, 0.05)); sg.addColorStop(1, rgba(pal.a, 0)); g.fillStyle = sg; g.fillRect(sx - 120, 0, 240, H);
      constellation(dt);
    }
    function frame(now) {
      if (!alive) return;
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min(0.1, (now - (last || now)) / 1000);
      if (now - last < 33 && last) { raf = requestAnimationFrame(frame); return; } // ~30 fps is plenty for ambience
      last = now; t += dt * 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
      g.clearRect(0, 0, W, H);
      if (kinds.includes('aurora')) aurora(t);
      if (kinds.includes('holo')) holo(t, dt); else if (kinds.includes('constellation')) constellation(dt);
      if (!reduce() && !(low && kinds.length === 1 && kinds[0] === 'aurora')) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && alive) { last = 0; raf = requestAnimationFrame(frame); } };
    palette(); size(); kick();
    const ro = new ResizeObserver(() => { size(); if (reduce()) { last = 0; frame(performance.now()); } }); ro.observe(host);
    const io = new IntersectionObserver(e => { visible = e[e.length - 1].isIntersecting; if (visible) kick(); }); io.observe(host);
    const mo = new MutationObserver(() => { palette(); last = 0; kick(); }); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent', 'style'] });
    const vis = () => { if (!document.hidden) kick(); }; document.addEventListener('visibilitychange', vis);
    if (!reduce()) host.parentElement.addEventListener('pointermove', onMove, { passive: true });
    const ctrl = { running: () => !!raf, kinds, auroraScale: () => (kinds.includes('aurora') ? (aur ? aur.width / Math.max(1, W) : scale) : null), destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect(); document.removeEventListener('visibilitychange', vis); host.parentElement && host.parentElement.removeEventListener('pointermove', onMove); cv.remove(); host.__amb = null; } };
    host.__amb = ctrl;
    return ctrl;
  }
  function auto(root) { (root || document).querySelectorAll('[data-ambient]').forEach(el => mount(el)); }
  window.ERLY = window.ERLY || {};
  ERLY.ambient = { mount, auto };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => auto()); else auto();
})();
