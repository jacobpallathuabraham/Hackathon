/* ERLY Learning Studio — subject worlds (v23).

   Each subject has its own environment, drawn procedurally on one canvas:
     Physics — deep space: nebulae, three depths of stars, a planet horizon with its atmosphere, a moon on its orbit.
     Biology — a living tissue: cells with nuclei drifting at three depths through shafts of light.
     Maths — a perspective grid running to a horizon, with curves that draw themselves.
     Chemistry — molecules (ball-and-stick, rotating in 3-D) suspended in a violet space.
     History — a beam of light with dust over strata of time.
     Geography — the Earth turning, with continents, an atmosphere and a cloud band.
     English — letterforms drifting at different depths; a line of ink writing itself.
     Languages — greetings in speech bubbles, crossing at different depths.
     Social science — a city at night, three layers deep, windows lighting and going out.

   Cost: the static layers (gradients, nebulae, grids, strata) are painted ONCE into an offscreen canvas per size;
   each frame only the few moving things are drawn. ≤ 30 fps, ≤ 1.5× pixel density, one loop for all canvases,
   paused off-screen, in hidden tabs and when the canvas leaves the page. Modes:
     full — moving;  calm — one still frame (also with reduced motion and on low-power devices);  off — nothing.
   Heroes follow the pointer with a few pixels of parallax (none in calm/off or with reduced motion). */
(function () {
  'use strict';
  const LS = window.LS;
  const weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  let MODE = (LS.envPref && LS.envPref()) || 'full';
  const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

  const SCENES = {
    physics: {
      bg(g, w, h, R) {
        const gr = g.createRadialGradient(w * 0.3, h * 0.35, 0, w * 0.3, h * 0.35, Math.max(w, h)); gr.addColorStop(0, '#141a3d'); gr.addColorStop(0.55, '#0a0d22'); gr.addColorStop(1, '#03040b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        [[0.22, 0.3, 0.55, '120,80,200'], [0.62, 0.22, 0.45, '40,120,200'], [0.45, 0.55, 0.35, '200,70,140']].forEach(([x, y, r, c]) => { const n = g.createRadialGradient(w * x, h * y, 0, w * x, h * y, Math.max(w, h) * r); n.addColorStop(0, `rgba(${c},.22)`); n.addColorStop(1, `rgba(${c},0)`); g.fillStyle = n; g.fillRect(0, 0, w, h); });
        for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(220,228,255,${R() * 0.5 + 0.1})`; g.fillRect(R() * w, R() * h, R() < 0.95 ? 1 : 1.6, R() < 0.95 ? 1 : 1.6); }
        // the planet horizon, bottom right, with its atmosphere
        const cx = w * 0.82, cy = h * 1.9, r = Math.max(w, h) * 1.05;
        const pl = g.createRadialGradient(cx - r * 0.3, cy - r * 0.7, r * 0.2, cx, cy, r); pl.addColorStop(0, '#22406f'); pl.addColorStop(0.5, '#0c1733'); pl.addColorStop(1, '#040817');
        g.fillStyle = pl; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
        g.strokeStyle = 'rgba(120,190,255,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r + 1, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        const at = g.createRadialGradient(cx, cy, r, cx, cy, r * 1.08); at.addColorStop(0, 'rgba(90,170,255,.35)'); at.addColorStop(1, 'rgba(90,170,255,0)'); g.fillStyle = at; g.beginPath(); g.arc(cx, cy, r * 1.08, 0, 7); g.fill();
      },
      init(R, w, h) { return { stars: Array.from({ length: 70 }, () => ({ x: R() * w, y: R() * h, d: R() * 0.8 + 0.2, ph: R() * 6 })), comet: null }; },
      fg(g, w, h, t, s, px, py) {
        s.stars.forEach(p => { const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * (0.6 + p.d) + p.ph)); g.fillStyle = `rgba(235,240,255,${a})`; g.beginPath(); g.arc(p.x + px * p.d * 8, p.y + py * p.d * 6, p.d * 1.3, 0, 7); g.fill(); });
        // a moon on a tilted orbit in front of the planet
        const ox = w * 0.62 + px * 10, oy = h * 0.5 + py * 6, a = t * 0.18, rx = w * 0.28, ry = h * 0.09;
        g.strokeStyle = 'rgba(150,180,255,.16)'; g.lineWidth = 1; g.beginPath(); g.ellipse(ox, oy, rx, ry, -0.18, 0, 7); g.stroke();
        const mx = ox + Math.cos(a) * rx * Math.cos(-0.18) - Math.sin(a) * ry * Math.sin(-0.18), my = oy + Math.cos(a) * rx * Math.sin(-0.18) + Math.sin(a) * ry * Math.cos(-0.18), behind = Math.sin(a) < 0;
        const mr = Math.max(4, Math.min(w, h) * 0.018) * (behind ? 0.85 : 1.1), mg = g.createRadialGradient(mx - mr * 0.4, my - mr * 0.4, 0, mx, my, mr); mg.addColorStop(0, '#eef1ff'); mg.addColorStop(1, '#7c86a8');
        g.globalAlpha = behind ? 0.55 : 1; g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill(); g.globalAlpha = 1;
        // now and then a meteor
        if (!s.comet && Math.random() < 0.004) s.comet = { x: Math.random() * w * 0.6, y: Math.random() * h * 0.3, t: 0 };
        if (s.comet) { const c = s.comet; c.t += 0.03; const x = c.x + c.t * w * 0.5, y = c.y + c.t * h * 0.25; const gr = g.createLinearGradient(x, y, x - 80, y - 40); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 80, y - 40); g.stroke(); if (c.t > 1) s.comet = null; }
      }
    },
    biology: {
      bg(g, w, h) {
        const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#062a26'); gr.addColorStop(1, '#03110f'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++) { const x = w * (0.15 + i * 0.22); const b = g.createLinearGradient(x, 0, x + w * 0.2, h); b.addColorStop(0, 'rgba(160,255,220,.10)'); b.addColorStop(1, 'rgba(160,255,220,0)'); g.fillStyle = b; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w * 0.06, 0); g.lineTo(x + w * 0.26, h); g.lineTo(x + w * 0.12, h); g.fill(); }
      },
      init(R, w, h) { return { cells: Array.from({ length: 16 }, () => ({ x: R() * w, y: R() * h, r: 14 + R() * 46, d: R() * 0.8 + 0.2, ph: R() * 6, hue: 150 + R() * 40 })), dots: Array.from({ length: 50 }, () => ({ x: R() * w, y: R() * h, d: R() })) }; },
      fg(g, w, h, t, s, px, py) {
        s.dots.forEach(p => { g.fillStyle = `rgba(180,255,230,${0.15 + p.d * 0.3})`; g.fillRect((p.x + t * 6 * p.d) % w, (p.y + Math.sin(t * 0.4 + p.x) * 6) % h, 1.5, 1.5); });
        s.cells.slice().sort((a, b) => a.d - b.d).forEach(c => {
          const x = (c.x + Math.sin(t * 0.15 + c.ph) * 20 * c.d + px * 14 * c.d + w) % (w + 80) - 40, y = c.y + Math.cos(t * 0.12 + c.ph) * 14 * c.d + py * 10 * c.d, r = c.r * (0.5 + c.d * 0.6), sq = 1 + 0.05 * Math.sin(t * 0.8 + c.ph);
          g.fillStyle = `hsla(${c.hue},60%,45%,${0.10 + c.d * 0.14})`; g.strokeStyle = `hsla(${c.hue},70%,70%,${0.25 + c.d * 0.35})`; g.lineWidth = 1 + c.d;
          g.beginPath(); g.ellipse(x, y, r * sq, r / sq, c.ph, 0, 7); g.fill(); g.stroke();
          g.fillStyle = `hsla(${c.hue + 30},50%,70%,${0.18 + c.d * 0.3})`; g.beginPath(); g.arc(x + r * 0.2, y - r * 0.1, r * 0.28, 0, 7); g.fill();
        });
      }
    },
    maths: {
      bg(g, w, h) {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b0f24'); gr.addColorStop(1, '#141a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        const hz = h * 0.48, cx = w * 0.5; g.strokeStyle = 'rgba(140,160,255,.16)'; g.lineWidth = 1;
        for (let i = -20; i <= 20; i++) { g.beginPath(); g.moveTo(cx + i * 12, hz); g.lineTo(cx + i * w * 0.12, h); g.stroke(); }
        for (let k = 1; k < 14; k++) { const y = hz + (h - hz) * Math.pow(k / 14, 2); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        const hg = g.createLinearGradient(0, hz - 40, 0, hz + 30); hg.addColorStop(0, 'rgba(120,140,255,0)'); hg.addColorStop(0.6, 'rgba(120,140,255,.18)'); hg.addColorStop(1, 'rgba(120,140,255,0)'); g.fillStyle = hg; g.fillRect(0, hz - 40, w, 70);
      },
      init() { return {}; },
      fg(g, w, h, t, s, px, py) {
        const hz = h * 0.48, drawCurve = (f, col, k) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); const n = 160, m = Math.floor(n * k); for (let i = 0; i <= m; i++) { const u = i / n, [x, y] = f(u); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); if (m > 0) { const [x, y] = f(m / n); g.fillStyle = col; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } };
        const k = (t * 0.12) % 1.4;
        drawCurve(u => [w * 0.05 + u * w * 0.9 + px * 10, hz - 40 - Math.sin(u * Math.PI * 4 + t * 0.3) * h * 0.08 + py * 6], 'rgba(150,170,255,.85)', Math.min(1, k));
        drawCurve(u => { const a = u * Math.PI * 2, r = Math.cos(3 * a) * h * 0.16; return [w * 0.78 + Math.cos(a) * r + px * 16, h * 0.28 + Math.sin(a) * r + py * 10]; }, 'rgba(255,190,120,.8)', Math.min(1, (t * 0.09) % 1.3));
        g.fillStyle = 'rgba(200,210,255,.5)'; g.font = `${Math.round(h * 0.035)}px Georgia, serif`; g.fillText('y = sin 4x', w * 0.06 + px * 6, hz - h * 0.15);
      }
    },
    chemistry: {
      bg(g, w, h) { const gr = g.createRadialGradient(w * 0.6, h * 0.4, 0, w * 0.6, h * 0.4, Math.max(w, h)); gr.addColorStop(0, '#2a1446'); gr.addColorStop(1, '#0b0614'); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
      init(R, w, h) {
        const mol = (cx, cy, d, atoms, bonds) => ({ cx, cy, d, atoms, bonds, ry: R() * 6, rx: R() * 6, sp: 0.2 + R() * 0.3 });
        return { mols: [
          mol(w * 0.2, h * 0.35, 0.9, [[0, 0, 0, 'O', 14], [-0.9, 0.6, 0, 'H', 8], [0.9, 0.6, 0, 'H', 8]], [[0, 1], [0, 2]]),
          mol(w * 0.72, h * 0.3, 0.6, [[0, 0, 0, 'C', 12], [1.2, 0, 0, 'O', 13], [-1.2, 0, 0, 'O', 13]], [[0, 1], [0, 2]]),
          mol(w * 0.55, h * 0.72, 1, [[0, 0, 0, 'C', 12], [0.9, 0.9, 0.9, 'H', 7], [-0.9, -0.9, 0.9, 'H', 7], [-0.9, 0.9, -0.9, 'H', 7], [0.9, -0.9, -0.9, 'H', 7]], [[0, 1], [0, 2], [0, 3], [0, 4]]),
          mol(w * 0.88, h * 0.75, 0.4, [[0, 0, 0, 'N', 12], [0, 1, 0.4, 'H', 7], [0.9, -0.5, 0.4, 'H', 7], [-0.9, -0.5, 0.4, 'H', 7]], [[0, 1], [0, 2], [0, 3]])
        ], dots: Array.from({ length: 60 }, () => ({ x: R() * w, y: R() * h, v: R() })) };
      },
      fg(g, w, h, t, s, px, py) {
        const COL = { O: '#ff6b6b', H: '#e9ecff', C: '#9aa3b8', N: '#6b8cff' };
        s.dots.forEach(p => { g.fillStyle = 'rgba(210,170,255,.25)'; g.fillRect((p.x + Math.sin(t + p.v * 9) * 8) % w, (p.y + t * 4 * p.v) % h, 1.4, 1.4); });
        s.mols.forEach(m => {
          const ay = m.ry + t * m.sp, ax = m.rx + t * m.sp * 0.6, sc = Math.min(w, h) * 0.06 * (0.5 + m.d), cx = m.cx + px * 18 * m.d, cy = m.cy + py * 12 * m.d;
          const P = m.atoms.map(([x, y, z, el, r]) => { let X = x * Math.cos(ay) + z * Math.sin(ay), Z = -x * Math.sin(ay) + z * Math.cos(ay), Y = y * Math.cos(ax) - Z * Math.sin(ax); Z = y * Math.sin(ax) + Z * Math.cos(ax); return { x: cx + X * sc, y: cy + Y * sc, z: Z, el, r: r * (0.5 + m.d * 0.6) }; });
          g.strokeStyle = 'rgba(220,210,255,.45)'; g.lineWidth = 3 * m.d + 1; m.bonds.forEach(([a, b]) => { g.beginPath(); g.moveTo(P[a].x, P[a].y); g.lineTo(P[b].x, P[b].y); g.stroke(); });
          P.slice().sort((a, b) => a.z - b.z).forEach(p => { const gr = g.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, 0, p.x, p.y, p.r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, COL[p.el]); gr.addColorStop(1, 'rgba(20,10,40,.9)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); });
        });
      }
    },
    history: {
      bg(g, w, h, R) {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#24170d'); gr.addColorStop(1, '#3a2614'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 6; i++) { const y = h * (0.55 + i * 0.08); g.fillStyle = `rgba(${120 + i * 14},${80 + i * 10},${45 + i * 6},.35)`; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 30) g.lineTo(x, y + Math.sin(x / 120 + i) * 6 + R() * 3); g.lineTo(w, h); g.lineTo(0, h); g.fill(); }
        const b = g.createLinearGradient(w * 0.15, 0, w * 0.5, h); b.addColorStop(0, 'rgba(255,220,160,.20)'); b.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = b; g.beginPath(); g.moveTo(w * 0.12, 0); g.lineTo(w * 0.3, 0); g.lineTo(w * 0.62, h); g.lineTo(w * 0.34, h); g.fill();
        g.strokeStyle = 'rgba(255,220,170,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w * 0.05, h * 0.5); g.lineTo(w * 0.95, h * 0.5); g.stroke();
        for (let i = 0; i <= 10; i++) { const x = w * (0.05 + i * 0.09); g.beginPath(); g.moveTo(x, h * 0.5 - (i % 5 ? 4 : 9)); g.lineTo(x, h * 0.5 + (i % 5 ? 4 : 9)); g.stroke(); }
      },
      init(R, w, h) { return { dust: Array.from({ length: 70 }, () => ({ x: R(), y: R(), s: R() })) }; },
      fg(g, w, h, t, s, px, py) { s.dust.forEach(d => { const x = (w * (0.18 + d.x * 0.42) + Math.sin(t * 0.3 + d.s * 9) * 18 + px * 8), y = (h * d.y + t * 6 * (0.3 + d.s)) % h; const inBeam = Math.abs((x - w * 0.2) - (y / h) * w * 0.32) < w * 0.14; g.fillStyle = `rgba(255,230,190,${inBeam ? 0.55 : 0.12})`; g.beginPath(); g.arc(x, y, 0.6 + d.s * 1.4, 0, 7); g.fill(); }); }
    },
    geography: {
      bg(g, w, h) { const gr = g.createRadialGradient(w * 0.7, h * 0.5, 0, w * 0.7, h * 0.5, Math.max(w, h)); gr.addColorStop(0, '#0d2a44'); gr.addColorStop(1, '#020812'); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
      init(R) { const land = Array.from({ length: 9 }, () => ({ lon: R() * 360, lat: (R() - 0.5) * 120, r: 12 + R() * 26 })); return { land, stars: Array.from({ length: 80 }, () => [R(), R(), R()]) }; },
      fg(g, w, h, t, s, px, py) {
        s.stars.forEach(([x, y, a]) => { g.fillStyle = `rgba(220,235,255,${0.2 + a * 0.4})`; g.fillRect(x * w, y * h, 1, 1); });
        const R = Math.min(w, h) * 0.38, cx = w * 0.72 + px * 8, cy = h * 0.55 + py * 6, rot = t * 6;
        const oc = g.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R); oc.addColorStop(0, '#2d6fb0'); oc.addColorStop(1, '#0a2546'); g.fillStyle = oc; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
        g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
        s.land.forEach(l => { const lon = (l.lon + rot) * Math.PI / 180, lat = l.lat * Math.PI / 180, x = Math.cos(lat) * Math.sin(lon), z = Math.cos(lat) * Math.cos(lon); if (z < -0.1) return; const y = Math.sin(lat); g.fillStyle = `rgba(${90 + 40 * z},${150 + 30 * z},${90},.9)`; g.beginPath(); g.ellipse(cx + x * R, cy - y * R, l.r / 90 * R * (0.3 + 0.7 * Math.max(0, z)), l.r / 120 * R, 0, 0, 7); g.fill(); });
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy - R * 0.1, R * 0.95, R * 0.12, 0.1, 0, 7); g.stroke();
        const sh = g.createLinearGradient(cx - R, 0, cx + R, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.65, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,4,15,.6)'); g.fillStyle = sh; g.fillRect(cx - R, cy - R, R * 2, R * 2); g.restore();
        g.strokeStyle = 'rgba(120,200,255,.5)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R + 1.5, 0, 7); g.stroke();
      }
    },
    english: {
      bg(g, w, h) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#221810'); gr.addColorStop(1, '#120c08'); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
      init(R, w, h) { return { L: 'AaBbEeGgKkMmQqRrSsWwYy&¶§'.split('').map(ch => ({ ch, x: R() * w, y: R() * h, d: R() * 0.8 + 0.2, ph: R() * 6 })) }; },
      fg(g, w, h, t, s, px, py) {
        s.L.forEach(l => { g.font = `italic ${Math.round(18 + l.d * 70)}px Georgia, serif`; g.fillStyle = `rgba(255,225,180,${0.05 + l.d * 0.16})`; g.fillText(l.ch, (l.x + t * 5 * l.d + px * 16 * l.d) % (w + 80) - 40, l.y + Math.sin(t * 0.3 + l.ph) * 10 + py * 10 * l.d); });
        const k = (t * 0.1) % 1.3, n = 120; g.strokeStyle = 'rgba(255,210,150,.6)'; g.lineWidth = 2; g.beginPath();
        for (let i = 0; i <= Math.min(n, n * k); i++) { const u = i / n, x = w * 0.1 + u * w * 0.8, y = h * 0.78 + Math.sin(u * 40) * 6 + Math.sin(u * 7) * 4; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      }
    },
    languages: {
      bg(g, w, h) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d1233'); gr.addColorStop(1, '#0d0818'); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
      init(R) { return { B: ['Bonjour', 'مرحبا', 'Hola', 'Ciao', 'こんにちは', 'Hallo', 'Olá', 'नमस्ते', '你好', 'Привет'].map((s, i) => ({ s, y: 0.12 + (i % 5) * 0.18, d: R() * 0.8 + 0.2, x: R() })) }; },
      fg(g, w, h, t, s, px, py) {
        s.B.slice().sort((a, b) => a.d - b.d).forEach(b => { const fs = Math.round(11 + b.d * 13), x = ((b.x * (w + 200) + t * (8 + b.d * 22)) % (w + 200)) - 100 + px * 14 * b.d, y = h * b.y + py * 10 * b.d; g.font = `${fs}px system-ui, sans-serif`; const tw = g.measureText(b.s).width + fs * 1.4, th = fs * 2;
          g.fillStyle = `rgba(190,160,255,${0.08 + b.d * 0.18})`; g.strokeStyle = `rgba(220,200,255,${0.2 + b.d * 0.35})`; g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(x - tw / 2, y - th / 2, tw, th, th / 2) : g.rect(x - tw / 2, y - th / 2, tw, th); g.fill(); g.stroke();
          g.fillStyle = `rgba(245,240,255,${0.35 + b.d * 0.5})`; g.textAlign = 'center'; g.fillText(b.s, x, y + fs * 0.35); g.textAlign = 'start'; });
      }
    },
    social: {
      bg(g, w, h, R) {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1226'); gr.addColorStop(0.7, '#1b2140'); gr.addColorStop(1, '#2b2340'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,240,210,.9)'; g.beginPath(); g.arc(w * 0.8, h * 0.2, Math.min(w, h) * 0.05, 0, 7); g.fill();
        for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(230,235,255,${R() * 0.4})`; g.fillRect(R() * w, R() * h * 0.5, 1, 1); }
      },
      init(R, w, h) { const layer = (d, n, col) => ({ d, col, b: Array.from({ length: n }, (_, i) => ({ x: i / n, bw: 0.6 + R() * 0.5, bh: 0.15 + R() * 0.4 * d, seed: R() * 99 })) }); return { L: [layer(0.35, 22, '#1c2444'), layer(0.65, 16, '#151a33'), layer(1, 11, '#0c1022')] }; },
      fg(g, w, h, t, s, px, py) {
        s.L.forEach(L => { const n = L.b.length, unit = w / n; L.b.forEach(b => { const x = b.x * w + px * 20 * L.d - 20, bw = unit * b.bw, bh = h * b.bh, y = h - bh; g.fillStyle = L.col; g.fillRect(x, y, bw, bh);
          for (let yy = y + 8; yy < h - 6; yy += 12) for (let xx = x + 5; xx < x + bw - 5; xx += 9) { const on = Math.sin(xx * 12.9898 + yy * 78.233 + b.seed + Math.floor(t * 0.25 + b.seed)) > 0.55; if (on) { g.fillStyle = `rgba(255,214,140,${0.35 + 0.5 * L.d})`; g.fillRect(xx, yy, 3, 4); } } }); });
      }
    }
  };
  SCENES.cs = SCENES.maths; SCENES.more = SCENES.social;

  const live = new Set(); let raf = 0, last = 0; const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { ptr.tx = (e.clientX / innerWidth - 0.5) * 2; ptr.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  function setup(m) {
    const c = m.c, dpr = Math.min(1.5, devicePixelRatio || 1), w = Math.max(1, c.clientWidth || 300), h = Math.max(1, c.clientHeight || 150);
    if (m.w === w && m.h === h) return;
    m.w = w; m.h = h; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); m.dpr = dpr;
    const S = SCENES[m.s] || SCENES.maths, R = seeded(42 + m.s.length);
    m.bg = document.createElement('canvas'); m.bg.width = c.width; m.bg.height = c.height; const bg = m.bg.getContext('2d'); bg.scale(dpr, dpr); S.bg(bg, w, h, R);
    m.state = S.init(seeded(7), w, h);
  }
  function paint(m, t) {
    setup(m); const c = m.c, g = c.getContext('2d'), S = SCENES[m.s] || SCENES.maths;
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(m.bg, 0, 0); g.setTransform(m.dpr, 0, 0, m.dpr, 0, 0);
    const par = m.hero && MODE === 'full' && !reduced() ? 1 : 0;
    S.fg(g, m.w, m.h, t, m.state, ptr.x * par, ptr.y * par);
  }
  function loop(ts) {
    raf = 0; if (document.hidden) return;
    if (last && ts - last < 32) { raf = requestAnimationFrame(loop); return; }
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0.033; last = ts;
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    live.forEach(m => { if (!m.c.isConnected) { live.delete(m); if (m.io) m.io.disconnect(); if (m.ro) m.ro.disconnect(); return; } if (m.vis) { m.t += dt; paint(m, m.t); } });
    if (live.size) raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && live.size && !raf) { last = 0; raf = requestAnimationFrame(loop); } });
  const all = new Set();
  function mount(c, subject, o) {
    if (c._world) return; c._world = true; o = o || {};
    const m = { c, s: subject, t: 11.3, vis: true, hero: !!o.hero };
    all.add(m);
    if (MODE === 'off') return;
    paint(m, m.t);
    if ('ResizeObserver' in window) { m.ro = new ResizeObserver(() => { if (MODE !== 'off') paint(m, m.t); }); m.ro.observe(c); }
    if (o.still || MODE !== 'full' || reduced() || weak) return;
    if ('IntersectionObserver' in window) { m.io = new IntersectionObserver(es => { m.vis = es[0].isIntersecting; }); m.io.observe(c); }
    live.add(m); if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
  }
  LS.worlds = {
    mount, count: () => live.size, weak, scenes: Object.keys(SCENES),
    setMode(v) { MODE = v; all.forEach(m => { if (!m.c.isConnected) { all.delete(m); return; } if (v === 'off') { live.delete(m); m.c.getContext('2d').clearRect(0, 0, m.c.width, m.c.height); return; } paint(m, m.t); if (v === 'full' && !reduced() && !weak && !m.still) { live.add(m); if (!raf) { last = 0; raf = requestAnimationFrame(loop); } } else live.delete(m); }); },
    stopAll() { live.clear(); }
  };
})();
