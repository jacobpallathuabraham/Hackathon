/* ERLY Handwriting Studio (v24) — the ink engine and item renderer.

   Strokes keep their raw input [x, y, pressure, time] plus whether the pressure was REAL (a stylus reporting it).
   At draw time the points are resampled along a Catmull–Rom spline (no lag is added while writing: smoothing is
   geometric, not temporal, unless the student turns on the stabiliser). Each brush turns the same points into
   a different mark:
     • outline brushes (fountain, ballpoint, brush, calligraphy, custom) build a filled polygon whose half-width at
       every point comes from pressure (real, or simulated from speed when the device has none), speed and taper;
       calligraphy uses a fixed nib angle instead of the stroke normal;
     • line brushes (fine liner, technical pen, marker, highlighter) stroke a smoothed path with their own caps,
       widths and blending (highlighter multiplies, so text stays readable underneath);
     • grain brushes (pencil, mechanical pencil, charcoal) scatter seeded micro-marks, so a pencil stroke re-renders
       identically every time;
     • stamp brushes (soft airbrush, watercolour) build colour from many translucent dabs.
   Everything else — shapes, text, images, plotted functions, science components and measurements — is drawn here
   too, so export (PNG/SVG/PDF) uses exactly what is on screen. */
(function () {
  'use strict';
  const H = window.HWS, T = H.T;

  /* ---------- geometry ---------- */
  function resample(pts, step) {
    if (pts.length < 2) return pts.map(p => p.slice());
    const out = [], P = i => pts[Math.max(0, Math.min(pts.length - 1, i))];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(1, Math.ceil(d / step));
      for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d2) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d2) * t2 + (-a + 3 * b - 3 * c + d2) * t3);
        out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * t, p1[3] + (p2[3] - p1[3]) * t]); }
    }
    out.push(pts[pts.length - 1].slice()); return out;
  }
  function speeds(pts) { const v = []; let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 2)], b = pts[i], dt = Math.max(1, (b[3] - a[3])), raw = Math.hypot(b[0] - a[0], b[1] - a[1]) / dt; s = i ? s + (raw - s) * 0.3 : raw; v.push(s); } return v; }
  function rng(seed) { let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0; return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 100000) / 100000; }; }
  const hexA = (hex, a) => { const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  H.hexA = hexA;

  /* ---------- brushes ---------- */
  // kind: outline | line | grain | stamp. press: how much (simulated or real) pressure changes width. taper: [start, end] in px.
  const B = {
    fountain: { name: ['Fountain pen', 'قلم حبر'], kind: 'outline', w: 1.1, min: 0.22, press: 1.15, speed: 0.35, taper: [6, 12], nib: 0.3 },
    ballpoint: { name: ['Ballpoint', 'قلم جاف'], kind: 'outline', w: 0.6, min: 0.85, press: 0.2, speed: 0.05, taper: [1, 3], alphaPress: 0.18 },
    fineliner: { name: ['Fine liner', 'قلم رفيع'], kind: 'line', w: 0.7, cap: 'round' },
    technical: { name: ['Technical pen', 'قلم فني'], kind: 'line', w: 0.55, cap: 'butt', join: 'miter' },
    pencil: { name: ['Pencil', 'قلم رصاص'], kind: 'grain', w: 1.1, dens: 3, alpha: 0.28, tone: 0.82 },
    mechanical: { name: ['Mechanical pencil', 'قلم رصاص ميكانيكي'], kind: 'grain', w: 0.6, dens: 4, alpha: 0.38, tone: 0.75 },
    marker: { name: ['Marker', 'قلم تحديد عريض'], kind: 'line', w: 2.8, cap: 'round', alpha: 0.9 },
    highlighter: { name: ['Highlighter', 'قلم تمييز'], kind: 'line', w: 6, cap: 'butt', alpha: 0.36, blend: 'multiply' },
    calligraphy: { name: ['Calligraphy pen', 'قلم خط'], kind: 'outline', w: 2.2, min: 0.12, press: 0.3, speed: 0.1, taper: [2, 4], fixedNib: -Math.PI / 4 },
    brush: { name: ['Ink brush', 'فرشاة حبر'], kind: 'outline', w: 2.2, min: 0.12, press: 1.5, speed: 0.55, taper: [14, 22] },
    airbrush: { name: ['Soft brush', 'فرشاة ناعمة'], kind: 'stamp', w: 4, alpha: 0.05, spacing: 0.25, soft: true },
    watercolour: { name: ['Watercolour', 'ألوان مائية'], kind: 'stamp', w: 3.2, alpha: 0.035, spacing: 0.18, blob: true },
    charcoal: { name: ['Charcoal', 'فحم'], kind: 'grain', w: 2.4, dens: 5, alpha: 0.2, tone: 0.9, streak: true },
    custom: { name: ['Custom pen', 'قلم مخصص'], kind: 'outline', w: 1, min: 0.4, press: 0.8, speed: 0.3, taper: [6, 10] }
  };
  H.BRUSHES = B;
  H.brushName = k => T(...B[k].name);

  function widths(item, R, b) {
    const s = item.size, o = item.opt || {}, press = o.press != null ? o.press : b.press, min = o.min != null ? o.min : b.min, sp = b.speed || 0, V = speeds(R), n = R.length;
    let acc = 0; const lens = [0]; for (let i = 1; i < n; i++) { acc += Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]); lens.push(acc); }
    const [t0, t1] = (o.taper != null ? [o.taper, o.taper * 1.6] : b.taper || [0, 0]);
    return R.map((p, i) => { const pr = item.pr ? p[2] : 0.5 + 0.5 * (1 - Math.min(1, V[i] / 1.6)) * 0.6; // simulated: slower = heavier
      let w = s * b.w * (min + (1 - min) * Math.min(1, pr * press + (1 - press) * 0.5));
      w *= 1 - sp * Math.min(1, V[i] / 2.2);
      const ta = t0 ? Math.min(1, (lens[i] + 1) / t0) : 1, tb = t1 ? Math.min(1, (acc - lens[i] + 1) / t1) : 1; w *= Math.sqrt(Math.min(ta, tb));
      if (b.nib) { const a = Math.atan2(R[Math.min(n - 1, i + 1)][1] - R[Math.max(0, i - 1)][1], R[Math.min(n - 1, i + 1)][0] - R[Math.max(0, i - 1)][0]); w *= 1 - b.nib + b.nib * Math.abs(Math.sin(a - 0.6)) * 1.2; }
      return Math.max(0.35, w / 2); });
  }
  function outline(g, item, b) {
    const R = resample(item.pts, Math.max(0.8, item.size * 0.25)); if (!R.length) return;
    const hw = widths(item, R, b), n = R.length;
    if (n === 1 || (n < 4 && Math.hypot(R[n - 1][0] - R[0][0], R[n - 1][1] - R[0][1]) < 1)) { g.beginPath(); g.arc(R[0][0], R[0][1], Math.max(hw[0], item.size * b.w * 0.45), 0, 7); g.fill(); return; }
    const L = [], Rt = [];
    for (let i = 0; i < n; i++) { let nx, ny;
      if (b.fixedNib != null) { nx = Math.cos(b.fixedNib); ny = Math.sin(b.fixedNib); }
      else { const a = R[Math.max(0, i - 1)], c = R[Math.min(n - 1, i + 1)], dx = c[0] - a[0], dy = c[1] - a[1], d = Math.hypot(dx, dy) || 1; nx = -dy / d; ny = dx / d; }
      L.push([R[i][0] + nx * hw[i], R[i][1] + ny * hw[i]]); Rt.push([R[i][0] - nx * hw[i], R[i][1] - ny * hw[i]]); }
    g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
    if (b.fixedNib == null) { const e = R[n - 1], a0 = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]); g.arc(e[0], e[1], hw[n - 1], a0, a0 - Math.PI, true); } else g.lineTo(Rt[n - 1][0], Rt[n - 1][1]);
    for (let i = n - 1; i >= 0; i--) g.lineTo(Rt[i][0], Rt[i][1]);
    if (b.fixedNib == null) { const s0 = R[0], a1 = Math.atan2(Rt[0][1] - s0[1], Rt[0][0] - s0[0]); g.arc(s0[0], s0[1], hw[0], a1, a1 - Math.PI, true); }
    g.closePath(); g.fill();
  }
  function smoothPath(g, pts) { if (pts.length < 3) { g.moveTo(pts[0][0], pts[0][1]); g.lineTo((pts[1] || pts[0])[0] + 0.01, (pts[1] || pts[0])[1]); return; } g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } const l = pts[pts.length - 1]; g.lineTo(l[0], l[1]); }
  function strokeItem(g, item, dark) {
    const b = B[item.brush] || B.fountain, col = item.color, op = item.opacity == null ? 1 : item.opacity;
    g.save();
    if (b.kind === 'outline') { const alpha = b.alphaPress ? 1 - b.alphaPress * (1 - (item.pts[0] || [0, 0, 0.5])[2]) : 1; g.fillStyle = hexA(col, op * alpha); outline(g, item, b); }
    else if (b.kind === 'line') { g.strokeStyle = hexA(col, op * (b.alpha || 1)); g.lineWidth = item.size * b.w; g.lineCap = b.cap; g.lineJoin = b.join || 'round'; if (b.blend) g.globalCompositeOperation = dark ? 'screen' : b.blend; g.beginPath(); smoothPath(g, item.pts.length > 2 ? resample(item.pts, 2) : item.pts); g.stroke(); }
    else if (b.kind === 'grain') { const R = resample(item.pts, 0.7), r = rng(item.id), V = speeds(R); g.fillStyle = hexA(col, op * b.alpha * b.tone);
      R.forEach((p, i) => { const pr = item.pr ? p[2] : 0.55, w = item.size * b.w * (0.45 + 0.75 * pr) * (1 - 0.25 * Math.min(1, V[i] / 2)); for (let k = 0; k < b.dens; k++) { const a = r() * 6.283, d = Math.sqrt(r()) * w * 0.6; if (b.streak) { g.save(); g.translate(p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d); g.rotate(r() * 0.6); g.globalAlpha = 0.5 + r() * 0.5; g.fillRect(-w * 0.25, -0.45, w * 0.5, 0.9); g.restore(); } else { g.globalAlpha = 0.45 + r() * 0.55; g.fillRect(p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d, 0.9 + r() * 0.8, 0.9 + r() * 0.8); } } }); }
    else if (b.kind === 'stamp') { const R = resample(item.pts, Math.max(1, item.size * b.w * b.spacing)), r = rng(item.id);
      R.forEach(p => { const pr = item.pr ? p[2] : 0.6, rad = item.size * b.w * (0.6 + 0.6 * pr);
        if (b.soft) { const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad); gr.addColorStop(0, hexA(col, op * b.alpha * 1.6)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], rad, 0, 7); g.fill(); }
        else { g.fillStyle = hexA(col, op * b.alpha); for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(p[0] + (r() - 0.5) * rad * 0.35, p[1] + (r() - 0.5) * rad * 0.35, rad * (0.75 + r() * 0.3), rad * (0.65 + r() * 0.3), r() * 3, 0, 7); g.fill(); } } });
      if (b.blob) { g.globalCompositeOperation = 'source-over'; g.strokeStyle = hexA(col, op * 0.08); g.lineWidth = Math.max(1, item.size * 0.4); g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); smoothPath(g, R); g.stroke(); } }
    g.restore();
  }
  H.strokeItem = strokeItem;

  /* ---------- the safe expression compiler for plotted functions (same grammar as the Learning Studio) ---------- */
  H.expr = src => { const s = String(src).toLowerCase().replace(/\s+/g, '').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\*\*/g, '^').replace(/π/g, 'pi').replace(/^y=/, '').replace(/^f\(x\)=/, ''); let i = 0;
    const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, asin: Math.asin, acos: Math.acos, atan: Math.atan }, CONST = { pi: Math.PI, e: Math.E }, names = Object.keys(FN).concat(Object.keys(CONST), ['x']).sort((a, b) => b.length - a.length);
    const peek = () => s[i];
    const atom = () => { const c = peek(); if (c === '(') { i++; const v = add(); if (peek() !== ')') throw new Error('Missing “)”'); i++; return v; } if (c === '|') { i++; const v = add(); if (peek() !== '|') throw new Error('Missing “|”'); i++; return x => Math.abs(v(x)); }
      const m = /^\d*\.?\d+/.exec(s.slice(i)); if (m) { i += m[0].length; const v = +m[0]; return () => v; } const w = /^[a-z]+/.exec(s.slice(i)); if (!w) throw new Error('Unexpected “' + (c || 'end') + '”'); const n = names.find(k => w[0].startsWith(k)); if (!n) throw new Error('Unknown “' + w[0] + '”'); i += n.length;
      if (FN[n]) { const a = atom(), f = FN[n]; return x => f(a(x)); } if (n in CONST) { const v = CONST[n]; return () => v; } return x => x; };
    const pow = () => { const b = atom(); if (peek() === '^') { i++; const e = unary(); return x => Math.pow(b(x), e(x)); } return b; };
    const unary = () => { if (peek() === '-') { i++; const v = unary(); return x => -v(x); } if (peek() === '+') { i++; return unary(); } return pow(); };
    const mul = () => { let v = unary(); for (;;) { const c = peek(); if (c === '*' || c === '/') { i++; const r = unary(), l = v; v = c === '*' ? x => l(x) * r(x) : x => l(x) / r(x); } else if (c && /[a-z0-9(.]/.test(c)) { const r = unary(), l = v; v = x => l(x) * r(x); } else return v; } };
    const add = () => { let v = mul(); for (;;) { const c = peek(); if (c === '+' || c === '-') { i++; const r = mul(), l = v; v = c === '+' ? x => l(x) + r(x) : x => l(x) - r(x); } else return v; } };
    if (!s) throw new Error('Type a function of x'); const f = add(); if (i < s.length) throw new Error('Unexpected “' + s[i] + '”'); return f; };
  // the coordinate frame of a page: origin at the centre, one unit = 40 px (one grid square)
  H.frame = page => ({ ox: page.w / 2, oy: page.h / 2, u: 40 });

  /* ---------- science components (drawn in a local box ~ 100 × 100 around 0,0) ---------- */
  const ST = {
    block: (g, it) => { g.fillStyle = H.hexA(it.color, 0.12); g.fillRect(-40, -30, 80, 60); g.strokeRect(-40, -30, 80, 60); if (it.props && it.props.label) txt(g, it.props.label, 0, 5, 18); },
    cart: (g) => { g.strokeRect(-50, -30, 100, 40); [-28, 28].forEach(x => { g.beginPath(); g.arc(x, 18, 12, 0, 7); g.stroke(); }); },
    ball: (g, it) => { g.fillStyle = H.hexA(it.color, 0.15); g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); g.stroke(); },
    incline: (g, it) => { const a = ((it.props && it.props.angle) || 30) * Math.PI / 180, L = 220; g.beginPath(); g.moveTo(-L / 2, 50); g.lineTo(L / 2, 50); g.lineTo(L / 2, 50 - Math.tan(a) * L); g.closePath(); g.fillStyle = H.hexA(it.color, 0.08); g.fill(); g.stroke(); g.beginPath(); g.arc(-L / 2, 50, 34, -a, 0); g.stroke(); txt(g, Math.round(a * 180 / Math.PI) + '°', -L / 2 + 52, 42, 15); },
    pulley: (g) => { g.beginPath(); g.arc(0, 0, 28, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -55); g.stroke(); g.beginPath(); g.moveTo(-20, -55); g.lineTo(20, -55); g.stroke(); },
    spring: (g) => { g.beginPath(); g.moveTo(-60, 0); for (let i = 0; i <= 12; i++) g.lineTo(-45 + i * 7.5, i % 2 ? -14 : 14); g.lineTo(60, 0); g.stroke(); },
    pendulum: (g) => { g.beginPath(); g.moveTo(-30, -60); g.lineTo(30, -60); g.stroke(); g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, -60); g.lineTo(0, 40); g.stroke(); g.setLineDash([]); g.beginPath(); g.moveTo(0, -60); g.lineTo(30, 30); g.stroke(); g.beginPath(); g.arc(30, 30, 12, 0, 7); g.stroke(); },
    cell: (g) => { g.beginPath(); g.moveTo(-50, 0); g.lineTo(-6, 0); g.moveTo(-6, -24); g.lineTo(-6, 24); g.moveTo(6, -12); g.lineTo(6, 12); g.moveTo(6, 0); g.lineTo(50, 0); g.stroke(); txt(g, '+', -14, -28, 14); },
    battery: (g) => { g.beginPath(); g.moveTo(-60, 0); g.lineTo(-22, 0); [-22, -6, 10].forEach((x, i) => { g.moveTo(x, -22); g.lineTo(x, 22); g.moveTo(x + 8, -11); g.lineTo(x + 8, 11); }); g.moveTo(18, 0); g.lineTo(60, 0); g.stroke(); },
    resistor: (g) => { g.beginPath(); g.moveTo(-60, 0); g.lineTo(-30, 0); g.moveTo(30, 0); g.lineTo(60, 0); g.stroke(); g.strokeRect(-30, -12, 60, 24); },
    bulb: (g) => { g.beginPath(); g.moveTo(-60, 0); g.lineTo(-20, 0); g.moveTo(20, 0); g.lineTo(60, 0); g.stroke(); g.beginPath(); g.arc(0, 0, 20, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-14, -14); g.lineTo(14, 14); g.moveTo(14, -14); g.lineTo(-14, 14); g.stroke(); },
    switch: (g) => { g.beginPath(); g.moveTo(-60, 0); g.lineTo(-20, 0); g.lineTo(18, -20); g.moveTo(20, 0); g.lineTo(60, 0); g.stroke(); g.beginPath(); g.arc(-20, 0, 3, 0, 7); g.arc(20, 0, 3, 0, 7); g.fill(); },
    ammeter: (g) => { meter(g, 'A'); }, voltmeter: (g) => { meter(g, 'V'); },
    capacitor: (g) => { g.beginPath(); g.moveTo(-60, 0); g.lineTo(-6, 0); g.moveTo(-6, -22); g.lineTo(-6, 22); g.moveTo(6, -22); g.lineTo(6, 22); g.moveTo(6, 0); g.lineTo(60, 0); g.stroke(); },
    lens: (g) => { g.beginPath(); g.ellipse(0, 0, 12, 70, 0, 0, 7); g.stroke(); g.setLineDash([5, 5]); g.beginPath(); g.moveTo(-120, 0); g.lineTo(120, 0); g.stroke(); g.setLineDash([]); [-70, 70].forEach(x => { g.beginPath(); g.arc(x, 0, 3, 0, 7); g.fill(); txt(g, 'F', x, 18, 13); }); },
    concave: (g) => { g.beginPath(); g.moveTo(-14, -70); g.quadraticCurveTo(4, 0, -14, 70); g.lineTo(14, 70); g.quadraticCurveTo(-4, 0, 14, -70); g.closePath(); g.stroke(); },
    mirror: (g) => { g.beginPath(); g.moveTo(0, -70); g.lineTo(0, 70); g.stroke(); for (let y = -66; y <= 66; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(10, y + 8); g.stroke(); } },
    prism: (g, it) => { g.beginPath(); g.moveTo(0, -60); g.lineTo(55, 40); g.lineTo(-55, 40); g.closePath(); g.fillStyle = H.hexA(it.color, 0.08); g.fill(); g.stroke(); },
    beaker: (g) => { g.beginPath(); g.moveTo(-40, -55); g.lineTo(-40, 50); g.lineTo(40, 50); g.lineTo(40, -55); g.stroke(); for (let y = -30; y <= 30; y += 20) { g.beginPath(); g.moveTo(-40, y); g.lineTo(-28, y); g.stroke(); } },
    flask: (g) => { g.beginPath(); g.moveTo(-12, -60); g.lineTo(-12, -20); g.lineTo(-45, 45); g.lineTo(45, 45); g.lineTo(12, -20); g.lineTo(12, -60); g.stroke(); },
    axes: (g) => { g.beginPath(); g.moveTo(-60, 50); g.lineTo(70, 50); g.moveTo(-60, 50); g.lineTo(-60, -70); g.stroke(); arrowHead(g, 70, 50, 0); arrowHead(g, -60, -70, -Math.PI / 2); txt(g, 'x', 76, 66, 13); txt(g, 'y', -48, -66, 13); },
    numberline: (g) => { g.beginPath(); g.moveTo(-110, 0); g.lineTo(110, 0); g.stroke(); arrowHead(g, 110, 0, 0); arrowHead(g, -110, 0, Math.PI); for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(i * 20, -6); g.lineTo(i * 20, 6); g.stroke(); txt(g, String(i), i * 20, 20, 11); } },
    protractor: (g) => { g.beginPath(); g.arc(0, 30, 90, Math.PI, 0); g.lineTo(-90, 30); g.stroke(); for (let d = 0; d <= 180; d += 10) { const a = Math.PI + d * Math.PI / 180, r1 = d % 30 ? 82 : 74; g.beginPath(); g.moveTo(Math.cos(a) * 90, 30 + Math.sin(a) * 90); g.lineTo(Math.cos(a) * r1, 30 + Math.sin(a) * r1); g.stroke(); if (!(d % 30)) txt(g, String(d), Math.cos(a) * 62, 34 + Math.sin(a) * 62, 10); } }
  };
  function meter(g, L) { g.beginPath(); g.moveTo(-60, 0); g.lineTo(-20, 0); g.moveTo(20, 0); g.lineTo(60, 0); g.stroke(); g.beginPath(); g.arc(0, 0, 20, 0, 7); g.stroke(); txt(g, L, 0, 6, 17); }
  function txt(g, s, x, y, size) { const f = g.fillStyle; g.fillStyle = g.strokeStyle; g.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`; g.textAlign = 'center'; g.fillText(s, x, y); g.fillStyle = f; }
  function arrowHead(g, x, y, a, s = 12) { g.save(); g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(x, y); g.lineTo(x - s * Math.cos(a - 0.4), y - s * Math.sin(a - 0.4)); g.lineTo(x - s * Math.cos(a + 0.4), y - s * Math.sin(a + 0.4)); g.closePath(); g.fill(); g.restore(); }
  H.STAMPS = { block: ['Block', 'كتلة'], cart: ['Cart', 'عربة'], ball: ['Ball', 'كرة'], incline: ['Inclined plane', 'مستوى مائل'], pulley: ['Pulley', 'بكرة'], spring: ['Spring', 'نابض'], pendulum: ['Pendulum', 'بندول'], cell: ['Cell', 'خلية كهربائية'], battery: ['Battery', 'بطارية'], resistor: ['Resistor', 'مقاومة'], bulb: ['Lamp', 'مصباح'], switch: ['Switch', 'مفتاح'], ammeter: ['Ammeter', 'أميتر'], voltmeter: ['Voltmeter', 'فولتميتر'], capacitor: ['Capacitor', 'مكثف'], lens: ['Converging lens', 'عدسة محدبة'], concave: ['Diverging lens', 'عدسة مقعرة'], mirror: ['Plane mirror', 'مرآة'], prism: ['Prism', 'منشور'], beaker: ['Beaker', 'كأس'], flask: ['Conical flask', 'دورق'], axes: ['Axes', 'محاور'], numberline: ['Number line', 'خط الأعداد'], protractor: ['Protractor', 'منقلة'] };
  H.stampBox = it => { const r = it.k === 'incline' ? 120 : it.k === 'lens' ? 125 : it.k === 'numberline' ? 118 : it.k === 'protractor' ? 95 : 72; return r * (it.s || 1); };

  /* ---------- items ---------- */
  const imgs = new Map();
  H.image = (it, redraw) => { let im = imgs.get(it.id); if (!im) { im = new Image(); im.onload = () => redraw && redraw(); im.src = it.src; imgs.set(it.id, im); } return im.complete && im.naturalWidth ? im : null; };
  function shape(g, it) {
    const p = it.pts; g.lineWidth = it.w || 3; g.strokeStyle = it.color; g.lineCap = 'round'; g.lineJoin = 'round'; if (it.dash) g.setLineDash([it.w * 3, it.w * 2.4]);
    const fill = () => { if (it.fill) { g.fillStyle = H.hexA(it.fill, it.fillA == null ? 0.25 : it.fillA); g.fill(); } };
    g.beginPath();
    if (it.k === 'line' || it.k === 'arrow' || it.k === 'darrow') { g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.stroke(); g.setLineDash([]); const a = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]), hs = 8 + (it.w || 3) * 2.4; if (it.k !== 'line') arrowHead(g, p[1][0], p[1][1], a, hs); if (it.k === 'darrow') arrowHead(g, p[0][0], p[0][1], a + Math.PI, hs);
      if (it.label) { const mx = (p[0][0] + p[1][0]) / 2, my = (p[0][1] + p[1][1]) / 2; g.fillStyle = it.color; g.font = `italic 600 ${18 + (it.w || 3)}px Georgia, serif`; g.textAlign = 'center'; g.fillText(it.label, mx - Math.sin(a) * 20, my + Math.cos(a) * 20 + 6); } }
    else if (it.k === 'rect' || it.k === 'rrect') { const x = Math.min(p[0][0], p[1][0]), y = Math.min(p[0][1], p[1][1]), w = Math.abs(p[1][0] - p[0][0]), h = Math.abs(p[1][1] - p[0][1]), r = it.k === 'rrect' ? Math.min(18, w / 4, h / 4) : 0; g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); fill(); g.stroke(); }
    else if (it.k === 'ellipse') { g.ellipse((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2, Math.abs(p[1][0] - p[0][0]) / 2 + 0.01, Math.abs(p[1][1] - p[0][1]) / 2 + 0.01, 0, 0, 7); fill(); g.stroke(); }
    else if (it.k === 'tri') { const x0 = Math.min(p[0][0], p[1][0]), x1 = Math.max(p[0][0], p[1][0]), y0 = Math.min(p[0][1], p[1][1]), y1 = Math.max(p[0][1], p[1][1]); g.moveTo((x0 + x1) / 2, y0); g.lineTo(x1, y1); g.lineTo(x0, y1); g.closePath(); fill(); g.stroke(); }
    else if (it.k === 'poly') { p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); if (it.closed) g.closePath(); fill(); g.stroke(); }
    else if (it.k === 'curve') { g.moveTo(p[0][0], p[0][1]); g.quadraticCurveTo(p[2][0], p[2][1], p[1][0], p[1][1]); g.stroke(); }
    g.setLineDash([]);
  }
  function fnItem(g, it, page) { let f; try { f = H.expr(it.expr); } catch (e) { return; } const F = H.frame(page); g.strokeStyle = it.color; g.lineWidth = it.w || 3; g.lineJoin = 'round'; g.beginPath(); let pen = false;
    for (let px = 0; px <= page.w; px += 1.5) { const x = (px - F.ox) / F.u, y = f(x); if (!isFinite(y) || Math.abs(y) > 1e4) { pen = false; continue; } const py = F.oy - y * F.u; if (py < -page.h || py > page.h * 2) { pen = false; continue; } if (pen) g.lineTo(px, py); else { g.moveTo(px, py); pen = true; } } g.stroke();
    g.fillStyle = it.color; g.font = 'italic 600 18px Georgia, serif'; g.textAlign = 'left'; g.fillText('y = ' + it.expr.replace(/^y=/, ''), (it.lx != null ? it.lx : 24), (it.ly != null ? it.ly : 40)); }
  function measure(g, it, page) { const p = it.pts; g.strokeStyle = it.color; g.fillStyle = it.color; g.lineWidth = 2;
    if (it.k === 'angle' && p.length === 3) { const [a, o, b] = p, a1 = Math.atan2(a[1] - o[1], a[0] - o[0]), a2 = Math.atan2(b[1] - o[1], b[0] - o[0]); let d = a2 - a1; while (d < -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI; const deg = Math.abs(d * 180 / Math.PI);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(o[0], o[1]); g.lineTo(b[0], b[1]); g.stroke(); g.beginPath(); g.arc(o[0], o[1], 36, a1, a1 + d, d < 0); g.stroke(); const m = a1 + d / 2; g.font = '700 17px ui-sans-serif, system-ui'; g.textAlign = 'center'; g.fillText(deg.toFixed(1) + '°', o[0] + Math.cos(m) * 58, o[1] + Math.sin(m) * 58 + 6); }
    if (it.k === 'ruler' && p.length === 2) { const L = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) / H.frame(page).u; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.stroke(); g.setLineDash([]); [0, 1].forEach(i => { g.beginPath(); g.arc(p[i][0], p[i][1], 4, 0, 7); g.fill(); }); g.font = '700 16px ui-sans-serif, system-ui'; g.textAlign = 'center'; g.fillText(L.toFixed(2) + ' ' + T('units', 'وحدة'), (p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2 - 10); }
    if (it.k === 'point') { const F = H.frame(page), x = (p[0][0] - F.ox) / F.u, y = (F.oy - p[0][1]) / F.u; g.beginPath(); g.arc(p[0][0], p[0][1], 6, 0, 7); g.fill(); g.font = '600 15px ui-sans-serif, system-ui'; g.textAlign = 'left'; g.fillText(`${it.label ? it.label + ' ' : ''}(${+x.toFixed(2)}, ${+y.toFixed(2)})`, p[0][0] + 10, p[0][1] - 10); } }
  H.render = (g, it, page, o = {}) => {
    g.save();
    if (it.t === 'stroke') strokeItem(g, it, o.dark);
    else if (it.t === 'erase') { g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineWidth = it.size; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); smoothPath(g, it.pts); g.stroke(); }
    else if (it.t === 'shape') shape(g, it);
    else if (it.t === 'text') { g.translate(it.x, it.y); if (it.rot) g.rotate(it.rot); g.fillStyle = it.color; g.font = `${it.weight || 500} ${it.size}px ${it.font === 'serif' ? 'Georgia, serif' : it.font === 'hand' ? '"Segoe Print", "Comic Sans MS", cursive' : it.font === 'mono' ? 'ui-monospace, monospace' : 'ui-sans-serif, system-ui, sans-serif'}`; g.textBaseline = 'top'; String(it.text).split('\n').forEach((ln, i) => g.fillText(ln, 0, i * it.size * 1.25)); }
    else if (it.t === 'image') { const im = H.image(it, o.redraw); g.translate(it.x + it.w / 2, it.y + it.h / 2); if (it.rot) g.rotate(it.rot); if (im) g.drawImage(im, -it.w / 2, -it.h / 2, it.w, it.h); else { g.strokeStyle = '#999'; g.strokeRect(-it.w / 2, -it.h / 2, it.w, it.h); } }
    else if (it.t === 'fn') fnItem(g, it, page);
    else if (it.t === 'stamp') { g.translate(it.x, it.y); if (it.rot) g.rotate(it.rot); g.scale(it.s || 1, it.s || 1); g.strokeStyle = it.color; g.fillStyle = it.color; g.lineWidth = (it.w || 2.5) / (it.s || 1); g.lineCap = 'round'; g.lineJoin = 'round'; (ST[it.k] || ST.block)(g, it); }
    else if (it.t === 'measure') measure(g, it, page);
    g.restore();
  };

  /* ---------- bounds, hit-testing and transforms ---------- */
  H.bbox = (it, page) => {
    let xs = [], ys = [];
    if (it.pts) { it.pts.forEach(p => { xs.push(p[0]); ys.push(p[1]); }); const pad = (it.size || it.w || 3) * ((H.BRUSHES[it.brush] || {}).w || 1) / 2 + 2; return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad]; }
    if (it.t === 'text') { const lines = String(it.text).split('\n'), w = Math.max(...lines.map(l => l.length)) * it.size * 0.56; return [it.x, it.y, it.x + w, it.y + lines.length * it.size * 1.25]; }
    if (it.t === 'image') return [it.x, it.y, it.x + it.w, it.y + it.h];
    if (it.t === 'stamp') { const r = H.stampBox(it); return [it.x - r, it.y - r, it.x + r, it.y + r]; }
    if (it.t === 'fn') return [0, 0, page.w, page.h];
    return [0, 0, 0, 0];
  };
  const segDist = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l)) : 0; return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy); };
  H.hit = (it, x, y, tol, page) => {
    if (it.t === 'fn') { try { const f = H.expr(it.expr), F = H.frame(page), yy = F.oy - f((x - F.ox) / F.u) * F.u; return Math.abs(yy - y) < tol + 4; } catch (e) { return false; } }
    if ((it.t === 'stroke' || it.t === 'erase') && it.pts) { const w = it.size * ((H.BRUSHES[it.brush] || {}).w || 1) / 2; for (let i = 0; i < it.pts.length; i++) { if (segDist(x, y, it.pts[i], it.pts[Math.min(it.pts.length - 1, i + 1)]) < tol + w) return true; } return false; }
    if (it.t === 'shape' && (it.k === 'line' || it.k === 'arrow' || it.k === 'darrow')) return segDist(x, y, it.pts[0], it.pts[1]) < tol + (it.w || 3);
    const [a, b, c, d] = H.bbox(it, page); return x >= a - tol && x <= c + tol && y >= b - tol && y <= d + tol;
  };
  // apply a mapping (x, y) → [x', y'] plus a scale factor to an item, returning a new item
  H.transform = (it, map, scale = 1, rot = 0) => {
    const n = JSON.parse(JSON.stringify(it)); n.id = it.id;
    if (n.pts) { n.pts = n.pts.map(p => { const q = map(p[0], p[1]); return [q[0], q[1]].concat(p.slice(2)); }); if (n.size) n.size *= scale; if (n.w && n.t === 'shape') n.w = Math.max(1, n.w * Math.sqrt(scale)); }
    if (n.t === 'text') { const q = map(n.x, n.y); n.x = q[0]; n.y = q[1]; n.size *= scale; n.rot = (n.rot || 0) + rot; }
    if (n.t === 'image') { const c = map(n.x + n.w / 2, n.y + n.h / 2); n.w *= scale; n.h *= scale; n.x = c[0] - n.w / 2; n.y = c[1] - n.h / 2; n.rot = (n.rot || 0) + rot; }
    if (n.t === 'stamp') { const q = map(n.x, n.y); n.x = q[0]; n.y = q[1]; n.s = (n.s || 1) * scale; n.rot = (n.rot || 0) + rot; }
    return n;
  };
  H.resample = resample;
})();
