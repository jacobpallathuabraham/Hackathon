/* ERLY — full-viewport liquid-ink transition (Handwriting Check).
   cover: a fountain-pen nib appears at the button, releases a stream of ink that sweeps across the whole
   viewport, branches into ribbons that thicken into pools, and floods the screen; then the browser navigates.
   reveal: on the destination page the ink recedes through organic openings, the workspace appears in
   staggered steps, a few droplets settle, and the canvas is removed.
   One Canvas 2D layer, redrawn from parameters each frame (no libraries). Colours come from the site's own
   theme (html[data-theme]) every frame, so switching theme mid-transition simply recolours it.
   Safe by design: clicks are blocked only while it runs, a watchdog always finishes it (navigation within
   2.4 s, reveal removed within 2.5 s), reduced motion gets a short calm fade, and any error falls back to
   plain navigation. Leaving the page (Back/Forward, bfcache) removes any overlay. */
(function () {
  'use strict';
  const KEY = 'erly-ink';
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const dark = () => document.documentElement.dataset.theme === 'dark';
  const PAL = {
    dark: { cover: '#050b20', deep: '#0b1c4f', ink: '#1d4ed8', glow: '#22d3ee', hi: 'rgba(232,246,255,0.9)', accent: 'rgba(139,92,246,0.55)', wash: 'rgba(56,189,248,0.22)', nib: ['#f8fbff', '#9fb7ff'] },
    light: { cover: '#0b0e16', deep: '#141b2e', ink: '#121a33', glow: '#2b4fd6', hi: 'rgba(147,180,255,0.65)', accent: 'rgba(30,58,138,0.55)', wash: 'rgba(37,99,235,0.28)', nib: ['#20242e', '#3b56c4'] }
  };
  const pal = () => PAL[dark() ? 'dark' : 'light'];
  const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
  const inout = t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = t => Math.max(0, Math.min(1, t));
  function rng(seed) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
  // Catmull-Rom through points → dense polyline
  function spline(P, n = 18) { const out = []; for (let i = 0; i < P.length - 1; i++) { const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2; for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } } out.push(P[P.length - 1]); return out; }
  // a tapered ribbon along part of a polyline, as a filled shape (thicker in the middle, wobbling edges)
  function ribbon(g, pts, upto, width, phase, time) {
    const n = Math.max(2, Math.floor(pts.length * upto)); if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const u = i / (n - 1), taper = Math.sin(Math.PI * Math.min(1, u * 1.05)) * 0.85 + 0.15, wob = 1 + 0.18 * Math.sin(u * 17 + phase + time * 0.004);
      const w = width * taper * wob * (i === n - 1 ? 0.35 : 1);
      L.push([pts[i][0] - dy / d * w, pts[i][1] + dx / d * w]); R.push([pts[i][0] + dy / d * w, pts[i][1] - dx / d * w]);
    }
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) g.lineTo(L[i][0], L[i][1]);
    const tip = pts[n - 1]; g.arc(tip[0], tip[1], width * 0.35, 0, Math.PI * 2);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath(); g.fill();
  }
  function blob(g, x, y, r, phase, time, k = 0.12) {
    if (r <= 0.5) return;
    g.beginPath();
    for (let i = 0; i <= 56; i++) { const a = i / 56 * Math.PI * 2, rr = r * (1 + k * Math.sin(a * 3 + phase + time * 0.003) + k * 0.6 * Math.sin(a * 7 - phase * 1.7 + time * 0.005)); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath(); g.fill();
  }
  function nib(g, x, y, ang, s, p, glow) {
    g.save(); g.translate(x, y); g.rotate(ang + Math.PI * 0.82);
    if (glow) { g.shadowColor = p.glow; g.shadowBlur = 22; }
    const gr = g.createLinearGradient(-6 * s, 0, 6 * s, 0); gr.addColorStop(0, p.nib[0]); gr.addColorStop(1, p.nib[1]);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(5 * s, -10 * s, 7 * s, -26 * s, 6 * s, -44 * s); g.lineTo(-6 * s, -44 * s); g.bezierCurveTo(-7 * s, -26 * s, -5 * s, -10 * s, 0, 0); g.fill();
    g.shadowBlur = 0; g.strokeStyle = p.cover; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -3 * s); g.lineTo(0, -24 * s); g.stroke();
    g.fillStyle = p.cover; g.beginPath(); g.arc(0, -24 * s, 2.2 * s, 0, Math.PI * 2); g.fill();
    // barrel
    g.fillStyle = p.deep; g.fillRect(-7.5 * s, -78 * s, 15 * s, 36 * s);
    g.fillStyle = p.glow; g.globalAlpha = 0.7; g.fillRect(-7.5 * s, -46 * s, 15 * s, 2.5 * s); g.globalAlpha = 1;
    g.restore();
  }

  function overlay() {
    const cv = document.createElement('canvas');
    cv.className = 'ink-fx'; cv.setAttribute('aria-hidden', 'true');
    Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '9500', pointerEvents: 'auto', touchAction: 'none' });
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    document.body.appendChild(cv);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { cv, g, W, H };
  }
  const say = msg => { let s = document.getElementById('inkLive'); if (!s) { s = document.createElement('p'); s.id = 'inkLive'; s.setAttribute('role', 'status'); s.className = 'visually-hidden'; Object.assign(s.style, { position: 'fixed', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }); document.body.appendChild(s); } s.textContent = msg; };

  /* ---------------- cover, then navigate ---------------- */
  let running = false;
  function go(href, opts = {}) {
    if (running) return; // rapid repeated clicks
    running = true;
    const from = opts.from && opts.from.getBoundingClientRect ? opts.from.getBoundingClientRect() : null;
    const nav = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now() })); } catch (e) { /* storage blocked: the page simply opens */ } location.href = href; };
    say(opts.label || 'Opening Handwriting Check');
    if (opts.from && opts.from.animate && !still()) opts.from.animate([{ transform: 'scale(1)' }, { transform: 'scale(.96)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    let o;
    try { o = overlay(); } catch (e) { running = false; return nav(); }
    const { cv, g, W, H } = o;
    const watchdog = setTimeout(nav, still() ? 900 : 2400);
    if (still()) { // reduced motion: a short, calm ink wash
      const t0 = performance.now();
      const step = now => { const t = clamp01((now - t0) / 260); g.clearRect(0, 0, W, H); g.globalAlpha = t; g.fillStyle = pal().cover; g.fillRect(0, 0, W, H); g.globalAlpha = 1; if (t < 1) requestAnimationFrame(step); else { clearTimeout(watchdog); nav(); } };
      requestAnimationFrame(step); return;
    }
    const r = rng(((W * 31 + H * 17) | 0) + 7);
    const O = from ? [from.left + from.width / 2, from.top + from.height / 2] : [W * 0.5, H * 0.55];
    // the main stream sweeps the whole viewport in a long S
    const main = spline([O, [W * 0.78, H * 0.12], [W * 0.95, H * 0.42], [W * 0.38, H * 0.48], [W * 0.06, H * 0.7], [W * 0.42, H * 0.95], [W * 0.92, H * 0.86]], 22);
    // branches peel off the main stream towards every edge and corner
    const targets = [[-0.05, -0.05], [0.5, -0.08], [1.05, 0.05], [1.08, 0.6], [1.05, 1.05], [0.5, 1.08], [-0.08, 1.02], [-0.08, 0.35], [0.25, 0.2], [0.7, 0.66]];
    const branches = targets.map((tg, i) => {
      const s = 0.12 + (i / targets.length) * 0.78, p0 = main[Math.floor(s * (main.length - 1))], T = [tg[0] * W, tg[1] * H];
      const mid = [(p0[0] + T[0]) / 2 + (r() - 0.5) * W * 0.25, (p0[1] + T[1]) / 2 + (r() - 0.5) * H * 0.25];
      return { s, pts: spline([p0, mid, [mid[0] * 0.5 + T[0] * 0.5 + (r() - 0.5) * 60, mid[1] * 0.5 + T[1] * 0.5 + (r() - 0.5) * 60], T], 16), w: 9 + r() * 10, phase: r() * 6, dur: 520 + r() * 280 };
    });
    const pools = Array.from({ length: 16 }, (_, i) => { const b = branches[i % branches.length], q = b.pts[Math.floor((0.35 + r() * 0.6) * (b.pts.length - 1))]; return { x: q[0], y: q[1], R: 70 + r() * Math.max(W, H) * 0.22, at: 0.42 + r() * 0.3, phase: r() * 6 }; });
    const drops = [];
    const C = 1500, t0 = performance.now(), diag = Math.hypot(W, H);
    let alive = true;
    const frame = now => {
      if (!alive) return;
      const t = now - t0, u = t / C, p = pal();
      g.clearRect(0, 0, W, H);
      // flood (last): from the pen's starting point, covering everything
      const fl = inout(clamp01((u - 0.62) / 0.38));
      // pools
      g.fillStyle = p.cover;
      for (const pl of pools) blob(g, pl.x, pl.y, pl.R * ease(clamp01((u - pl.at) / 0.35)), pl.phase, t);
      // branch ribbons
      for (const b of branches) {
        const age = clamp01((u - b.s * 0.5) / (b.dur / C));
        if (age <= 0) continue;
        g.fillStyle = p.deep; ribbon(g, b.pts, ease(age), b.w * (1 + 2.6 * ease(clamp01((u - 0.35) / 0.5))), b.phase, t);
        g.fillStyle = p.ink; g.globalAlpha = 0.9; ribbon(g, b.pts, ease(age), b.w * 0.55 * (1 + 2 * ease(clamp01((u - 0.35) / 0.5))), b.phase + 1, t); g.globalAlpha = 1;
        // tip droplets
        if (age < 1 && r() < 0.35 && drops.length < 90) { const q = b.pts[Math.floor(ease(age) * (b.pts.length - 1))]; drops.push({ x: q[0], y: q[1], vx: (r() - 0.5) * 2.4, vy: (r() - 0.5) * 2.4, r: 1.5 + r() * 4.5, life: 1 }); }
      }
      // main stream, drawn by the pen
      const mp = ease(clamp01(u / 0.62));
      g.fillStyle = p.deep; ribbon(g, main, mp, 14 + 30 * ease(clamp01((u - 0.2) / 0.6)), 0.3, t);
      g.fillStyle = p.ink; ribbon(g, main, mp, 8 + 16 * ease(clamp01((u - 0.2) / 0.6)), 1.1, t);
      // luminous highlight riding the stream
      g.save(); g.globalCompositeOperation = dark() ? 'lighter' : 'source-over';
      g.strokeStyle = p.hi; g.lineWidth = 1.6; g.lineCap = 'round';
      const n = Math.floor(main.length * mp); g.beginPath(); for (let i = Math.max(0, n - 70); i < n; i++) { const q = main[i]; if (i === Math.max(0, n - 70)) g.moveTo(q[0] - 2, q[1] - 3); else g.lineTo(q[0] - 2, q[1] - 3); } g.stroke();
      g.strokeStyle = p.accent; g.lineWidth = 3; g.beginPath(); for (let i = Math.max(0, n - 40); i < n; i++) { const q = main[i]; if (i === Math.max(0, n - 40)) g.moveTo(q[0] + 3, q[1] + 4); else g.lineTo(q[0] + 3, q[1] + 4); } g.stroke();
      g.restore();
      // droplets
      g.fillStyle = p.ink;
      for (const d of drops) { d.x += d.vx; d.y += d.vy; d.vx *= 0.96; d.vy *= 0.96; d.life -= 0.02; if (d.life > 0) { g.globalAlpha = Math.min(1, d.life * 1.5); g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill(); } }
      g.globalAlpha = 1;
      // the flood, with a soft wash ahead of its edge
      if (fl > 0) { g.fillStyle = p.wash; blob(g, O[0], O[1], diag * 1.15 * fl + 40, 2, t, 0.08); g.fillStyle = p.cover; blob(g, O[0], O[1], diag * 1.12 * fl, 2.4, t, 0.08); }
      // pen nib follows the head of the stream
      if (mp < 1) { const i = Math.max(1, Math.floor((main.length - 1) * mp)), a = main[i - 1], b = main[i]; nib(g, b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), Math.min(1.4, Math.max(0.8, W / 900)), p, dark()); }
      else if (u < 0.75) { const q = main[main.length - 1]; nib(g, q[0], q[1], -0.6, Math.min(1.4, Math.max(0.8, W / 900)), p, dark()); }
      if (u < 1) requestAnimationFrame(frame);
      else { g.fillStyle = p.cover; g.fillRect(0, 0, W, H); clearTimeout(watchdog); nav(); }
    };
    requestAnimationFrame(frame);
    const stop = () => { alive = false; running = false; clearTimeout(watchdog); cv.remove(); };
    addEventListener('pagehide', stop, { once: true });
    // a bfcache restore (Back after navigating) must never show a stale overlay
    addEventListener('pageshow', e => { if (e.persisted) stop(); }, { once: true });
  }

  /* ---------------- reveal on arrival ---------------- */
  function arriving() {
    try { const f = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); return f && Date.now() - f.at < 8000; } catch (e) { return false; }
  }
  function reveal() {
    const html = document.documentElement;
    try { sessionStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } // a refresh must not replay it
    const done = () => { html.classList.remove('ink-arrive'); html.classList.add('ink-revealed'); };
    if (!html.classList.contains('ink-arrive')) { html.classList.add('ink-revealed'); return; }
    if (still()) { // calm fade
      let o; try { o = overlay(); } catch (e) { return done(); }
      html.classList.remove('ink-arrive');
      const t0 = performance.now(), step = now => { const t = clamp01((now - t0) / 280); o.g.clearRect(0, 0, o.W, o.H); o.g.globalAlpha = 1 - t; o.g.fillStyle = pal().cover; o.g.fillRect(0, 0, o.W, o.H); if (t < 1) requestAnimationFrame(step); else { o.cv.remove(); done(); } };
      requestAnimationFrame(step); setTimeout(() => { o.cv.remove(); done(); }, 900); return;
    }
    let o; try { o = overlay(); } catch (e) { return done(); }
    const { cv, g, W, H } = o;
    html.classList.remove('ink-arrive');
    const r = rng(((W * 13 + H * 7) | 0) + 3), diag = Math.hypot(W, H);
    const heading = document.querySelector('[data-ink-origin]'), hb = heading ? heading.getBoundingClientRect() : null;
    const O = hb ? [hb.left + Math.min(hb.width, 260) / 2, hb.top + hb.height / 2] : [W * 0.4, H * 0.3];
    const holes = [{ x: O[0], y: O[1], R: diag * 1.2, at: 0, dur: 0.95, phase: 1 }].concat(Array.from({ length: 9 }, () => ({ x: r() * W, y: r() * H, R: 120 + r() * Math.max(W, H) * 0.35, at: 0.05 + r() * 0.3, dur: 0.55 + r() * 0.3, phase: r() * 6 })));
    const tendrils = Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2 + r(); const e = [O[0] + Math.cos(a) * diag * 0.7, O[1] + Math.sin(a) * diag * 0.7]; return { pts: spline([e, [(e[0] + O[0]) / 2 + (r() - 0.5) * 200, (e[1] + O[1]) / 2 + (r() - 0.5) * 200], [O[0] + (r() - 0.5) * 160, O[1] + (r() - 0.5) * 120]], 18).reverse(), w: 10 + r() * 14, phase: r() * 6 }; });
    const settle = Array.from({ length: 18 }, () => ({ x: r() * W, y: r() * H, r: 1.2 + r() * 3.2 }));
    const R = 1250, t0 = performance.now(); let staged = false, alive = true;
    const finish = () => { if (!alive) return; alive = false; cv.remove(); done(); };
    const frame = now => {
      if (!alive) return;
      const t = now - t0, u = t / R, p = pal();
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
      g.fillStyle = p.cover; g.fillRect(0, 0, W, H);
      // the ink pulls back through organic openings
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      for (const h of holes) blob(g, h.x, h.y, h.R * inout(clamp01((u - h.at) / h.dur)), h.phase, t, 0.1);
      g.globalCompositeOperation = 'source-over';
      // receding ribbons draining back to where the ink came from
      const back = 1 - ease(clamp01((u - 0.15) / 0.75));
      for (const tr of tendrils) { g.fillStyle = p.deep; ribbon(g, tr.pts, back, tr.w * back + 1, tr.phase, t); g.fillStyle = p.ink; ribbon(g, tr.pts, back, tr.w * 0.5 * back + 0.5, tr.phase + 1, t); }
      // a few droplets settle and fade
      if (u > 0.6) { g.fillStyle = p.ink; g.globalAlpha = Math.max(0, 1 - (u - 0.6) / 0.4); for (const d of settle) { g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; }
      if (!staged && u > 0.18) { staged = true; html.classList.add('ink-revealed'); }
      if (u < 1) requestAnimationFrame(frame); else finish();
    };
    requestAnimationFrame(frame);
    setTimeout(finish, 2500); // watchdog: the page is never left covered
    addEventListener('pagehide', finish, { once: true });
  }

  // the ink replaces the browser's cross-document view transition for this navigation; any transition the
  // browser starts or aborts has its promises handled, so it is never reported as an error
  const tame = vt => { if (!vt) return; [vt.ready, vt.finished, vt.updateCallbackDone].forEach(p => p && p.catch(() => {})); };
  addEventListener('pageswap', e => { tame(e.viewTransition); if (running && e.viewTransition) e.viewTransition.skipTransition(); });
  addEventListener('pagereveal', e => tame(e.viewTransition));

  window.ERLY = window.ERLY || {};
  ERLY.ink = { go, reveal, arriving, _pal: pal, running: () => running };
  // links and buttons marked data-ink-href play the transition (e.g. the Handwriting Check entry points)
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-ink-href]');
    if (!el || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    e.preventDefault(); go(el.dataset.inkHref, { from: el });
  }, true);
  addEventListener('pageshow', e => { if (e.persisted) { running = false; document.querySelectorAll('canvas.ink-fx').forEach(c => c.remove()); document.documentElement.classList.remove('ink-arrive'); } });
})();
