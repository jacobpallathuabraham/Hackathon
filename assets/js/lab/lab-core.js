/* ERLY — Noor Lab core (v16): the workspace shell, shared plotting canvas, controls, numerics, the
   plain-language router and export. Engines (graphing, geometry, 3D, calculus, statistics, algebra and the
   physics simulations) register themselves with ERLY_LAB.register(); each one owns its own model, controls,
   explanation and commands, so no engine is one giant component.

   Everything runs in the browser with open-source libraries hosted on this site (math.js — Apache-2.0,
   Nerdamer — MIT, JSXGraph — MIT/LGPL, three.js — MIT). No API key, no paid service, and it works when
   Noor's AI is offline. */
(function () {
  'use strict';
  const L = window.ERLY_LAB = window.ERLY_LAB || {};
  L.engines = L.engines || [];
  const T = (en, ar) => (window.I18N && I18N.t ? I18N.t(en, ar) : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const still = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still'); } catch (e) { return false; } };
  L.T = T; L.esc = esc; L.still = still;

  /* ---------------- libraries, loaded only when an engine needs them ---------------- */
  const base = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/assets\/js\/lab\/lab-core\.js.*$/, '') : ''; })();
  L.base = base;
  const loaded = {};
  function script(src) { return loaded[src] || (loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = base + src; s.onload = () => res(); s.onerror = () => { delete loaded[src]; rej(new Error('Could not load ' + src)); }; document.head.appendChild(s); })); }
  function css(href) { if (document.querySelector(`link[href="${base + href}"]`)) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + href; document.head.appendChild(l); }
  L.libs = {
    math: () => (window.math && window.math.evaluate ? Promise.resolve(window.math) : script('assets/vendor/mathjs/math.min.js').then(() => window.math)),
    cas: () => (window.nerdamer ? Promise.resolve(window.nerdamer) : script('assets/vendor/nerdamer/nerdamer.min.js').then(() => window.nerdamer)),
    jsx: () => { css('assets/vendor/jsxgraph/jsxgraph.css'); return window.JXG ? Promise.resolve(window.JXG) : script('assets/vendor/jsxgraph/jsxgraphcore.js').then(() => window.JXG); },
    three: async () => {
      const THREE = await import(base + 'assets/vendor/three/build/three.module.min.js');
      let Orbit = null;
      try { Orbit = (await import(base + 'assets/vendor/three/examples/jsm/controls/OrbitControls.js')).OrbitControls; } catch (e) { /* the page has no import map for "three": rotate/zoom are handled by the engine's own pointer code */ }
      return { THREE, Orbit };
    }
  };

  /* ---------------- numerics (shared, deterministic, unit-tested) ---------------- */
  const N = L.num = {
    fmt(v, d) { if (v == null || !isFinite(v)) return v === Infinity ? '∞' : v === -Infinity ? '−∞' : '—'; d = d == null ? 4 : d; const a = Math.abs(v); if (a !== 0 && (a >= 1e6 || a < 1e-4)) return v.toExponential(2).replace('e', '×10^').replace('+', ''); const s = (+v.toFixed(d)).toString(); return s === '-0' ? '0' : s.replace('-', '−'); },
    bisect(f, a, b, it) { let fa = f(a); for (let i = 0; i < (it || 60); i++) { const m = (a + b) / 2, fm = f(m); if (!isFinite(fm)) return NaN; if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } return (a + b) / 2; },
    // roots of f on [a, b]: sign changes on a fine grid, refined by bisection; a sign change across a pole is rejected
    roots(f, a, b, n) {
      n = n || 600; const out = []; let x0 = a, y0 = f(a);
      for (let i = 1; i <= n; i++) {
        const x1 = a + (b - a) * i / n, y1 = f(x1);
        if (isFinite(y0) && isFinite(y1)) {
          if (y0 === 0) out.push(x0);
          else if (y0 * y1 < 0) { const r = N.bisect(f, x0, x1); const fr = f(r); if (isFinite(fr) && Math.abs(fr) < 1e-6 * (1 + Math.abs(y0) + Math.abs(y1))) out.push(r); }
        }
        x0 = x1; y0 = y1;
      }
      if (isFinite(y0) && y0 === 0) out.push(x0);
      return out.filter((r, i) => i === 0 || Math.abs(r - out[i - 1]) > (b - a) / n / 2);
    },
    deriv(f, x, h) { h = h || 1e-5 * (1 + Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); },
    deriv2(f, x, h) { h = h || 1e-4 * (1 + Math.abs(x)); return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h); },
    simpson(f, a, b, n) { n = n || 1000; if (n % 2) n++; const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; },
    // extrema: where f' changes sign (and f is defined around it)
    extrema(f, a, b, n) {
      const d = x => N.deriv(f, x); const xs = N.roots(d, a, b, n || 500);
      return xs.map(x => { const y = f(x), l = f(x - 1e-3 * (b - a)), r = f(x + 1e-3 * (b - a)); return { x, y, kind: y > l && y > r ? 'max' : y < l && y < r ? 'min' : 'flat' }; }).filter(p => isFinite(p.y) && p.kind !== 'flat');
    },
    rk4(f, t, y, h) { const k1 = f(t, y), k2 = f(t + h / 2, y.map((v, i) => v + h / 2 * k1[i])), k3 = f(t + h / 2, y.map((v, i) => v + h / 2 * k2[i])), k4 = f(t + h, y.map((v, i) => v + h * k3[i])); return y.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); },
    rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; },
    nice(span, target) { const raw = span / (target || 8), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; },
    erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; },
    normCdf(x, mu, sd) { return 0.5 * (1 + N.erf((x - mu) / (sd * Math.SQRT2))); },
    lgamma(z) { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - N.lgamma(1 - z); z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); },
    tPdf(t, df) { return Math.exp(N.lgamma((df + 1) / 2) - N.lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + t * t / df)); },
    tCdf(t, df) { if (t === 0) return 0.5; const a = Math.abs(t), v = 0.5 + N.simpson(x => N.tPdf(x, df), 0, a, 2000); return t > 0 ? v : 1 - v; },
    tInv(p, df) { let lo = -60, hi = 60; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (N.tCdf(m, df) < p) lo = m; else hi = m; } return (lo + hi) / 2; },
    binom(n, k) { if (k < 0 || k > n) return 0; return Math.exp(N.lgamma(n + 1) - N.lgamma(k + 1) - N.lgamma(n - k + 1)); }
  };

  /* ---------------- theme colours (read live, so dark/light switch redraws correctly) ---------------- */
  L.colors = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    return dark ? { dark, bg: '#0f1424', panel: '#161c30', ink: '#e8ecf6', muted: '#9aa4bd', grid: 'rgba(160,175,210,.12)', grid2: 'rgba(160,175,210,.24)', axis: 'rgba(220,228,245,.75)', accent: '#7dd3fc', pal: ['#60a5fa', '#f87171', '#4ade80', '#fbbf24', '#c084fc', '#2dd4bf', '#fb923c', '#f472b6'] }
      : { dark, bg: '#ffffff', panel: '#f6f7fb', ink: '#17131f', muted: '#5b6070', grid: 'rgba(23,19,31,.07)', grid2: 'rgba(23,19,31,.16)', axis: 'rgba(23,19,31,.7)', accent: '#2563eb', pal: ['#2563eb', '#dc2626', '#16a34a', '#b45309', '#7c3aed', '#0f766e', '#c2410c', '#be185d'] };
  };

  /* ---------------- Plot: a pannable, zoomable math canvas shared by every 2D engine ---------------- */
  class Plot {
    constructor(host, o) {
      o = o || {};
      this.host = host; this.o = o;
      this.cv = document.createElement('canvas'); this.cv.className = 'lab-cv'; this.cv.setAttribute('role', 'img'); this.cv.setAttribute('aria-label', o.label || 'Graph');
      host.appendChild(this.cv);
      this.view = Object.assign({ x0: -10, x1: 10, y0: -7, y1: 7 }, o.view || {});
      this.home = Object.assign({}, this.view);
      this.equal = o.equal !== false; this.draw = () => {}; this.layers = [];
      this.labels = o.labels || { x: 'x', y: 'y' };
      this._bind(); this._ro = new ResizeObserver(() => this.render()); this._ro.observe(host);
    }
    size() { const r = this.host.getBoundingClientRect(); return [Math.max(50, r.width), Math.max(50, r.height)]; }
    X(x) { return (x - this.view.x0) / (this.view.x1 - this.view.x0) * this.W; }
    Y(y) { return this.H - (y - this.view.y0) / (this.view.y1 - this.view.y0) * this.H; }
    ix(px) { return this.view.x0 + px / this.W * (this.view.x1 - this.view.x0); }
    iy(py) { return this.view.y0 + (this.H - py) / this.H * (this.view.y1 - this.view.y0); }
    fit() { // keep 1:1 aspect when asked, so circles look like circles
      if (!this.equal) return; const [w, h] = [this.W, this.H]; const v = this.view, cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2, sx = (v.x1 - v.x0) / w, sy = (v.y1 - v.y0) / h, s = Math.max(sx, sy);
      v.x0 = cx - s * w / 2; v.x1 = cx + s * w / 2; v.y0 = cy - s * h / 2; v.y1 = cy + s * h / 2;
    }
    setView(v) { Object.assign(this.view, v); this.fit(); this.render(); }
    reset() { this.view = Object.assign({}, this.home); this.fit(); this.render(); }
    zoom(f, px, py) { const v = this.view, x = this.ix(px == null ? this.W / 2 : px), y = this.iy(py == null ? this.H / 2 : py); v.x0 = x + (v.x0 - x) * f; v.x1 = x + (v.x1 - x) * f; v.y0 = y + (v.y0 - y) * f; v.y1 = y + (v.y1 - y) * f; this.render(); this.o.onView && this.o.onView(); }
    render() {
      const [w, h] = this.size(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) { this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr); this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px'; }
      this.W = w; this.H = h; if (!this._fitted) { this._fitted = true; this.fit(); this.home = Object.assign({}, this.view); }
      const g = this.g = this.cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const C = this.C = L.colors(); g.fillStyle = C.bg; g.fillRect(0, 0, w, h);
      if (this.o.grid !== false) this.grid();
      try { this.draw(g, this); } catch (e) { g.fillStyle = '#dc2626'; g.font = '13px system-ui'; g.fillText(String(e.message || e), 12, 22); }
    }
    grid() {
      const g = this.g, C = this.C, v = this.view, sx = N.nice(v.x1 - v.x0, this.W / 90), sy = N.nice(v.y1 - v.y0, this.H / 70);
      g.lineWidth = 1;
      for (const [s, col] of [[sx / 5, C.grid], [sx, C.grid2]]) { g.strokeStyle = col; g.beginPath(); for (let x = Math.ceil(v.x0 / s) * s; x <= v.x1; x += s) { const X = Math.round(this.X(x)) + .5; g.moveTo(X, 0); g.lineTo(X, this.H); } g.stroke(); }
      for (const [s, col] of [[sy / 5, C.grid], [sy, C.grid2]]) { g.strokeStyle = col; g.beginPath(); for (let y = Math.ceil(v.y0 / s) * s; y <= v.y1; y += s) { const Y = Math.round(this.Y(y)) + .5; g.moveTo(0, Y); g.lineTo(this.W, Y); } g.stroke(); }
      const ax = Math.min(this.H - 2, Math.max(2, this.Y(0))), ay = Math.min(this.W - 2, Math.max(2, this.X(0)));
      g.strokeStyle = C.axis; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, ax); g.lineTo(this.W, ax); g.moveTo(ay, 0); g.lineTo(ay, this.H); g.stroke();
      g.fillStyle = C.muted; g.font = '11px ui-sans-serif, system-ui'; g.textAlign = 'center'; g.textBaseline = 'top';
      for (let x = Math.ceil(v.x0 / sx) * sx; x <= v.x1; x += sx) { if (Math.abs(x) < sx / 2) continue; g.fillText(N.fmt(x, 6), this.X(x), Math.min(this.H - 14, ax + 4)); }
      g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let y = Math.ceil(v.y0 / sy) * sy; y <= v.y1; y += sy) { if (Math.abs(y) < sy / 2) continue; g.fillText(N.fmt(y, 6), Math.max(30, ay - 5), this.Y(y)); }
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = C.ink; g.font = 'italic 13px Georgia, serif';
      g.fillText(this.labels.x, this.W - 8 - g.measureText(this.labels.x).width, ax - 6); g.fillText(this.labels.y, ay + 6, 14);
    }
    // a function y = f(x): sampled per pixel; a jump across the screen or an undefined value breaks the line (asymptotes)
    fn(f, col, o) {
      o = o || {}; const g = this.g; g.strokeStyle = col; g.lineWidth = o.w || 2.6; g.setLineDash(o.dash || []); g.beginPath();
      let pen = false, py = null; const a = o.from != null ? Math.max(this.X(o.from), 0) : 0, b = o.to != null ? Math.min(this.X(o.to), this.W) : this.W;
      for (let px = a; px <= b; px += 1) {
        const y = f(this.ix(px)), Y = this.Y(y);
        if (!isFinite(y) || Math.abs(Y) > 1e5) { pen = false; py = null; continue; }
        if (pen && py != null && Math.abs(Y - py) > this.H * 1.2) pen = false;
        if (!pen) { g.moveTo(px, Y); pen = true; } else g.lineTo(px, Y);
        py = Y;
      }
      g.stroke(); g.setLineDash([]);
    }
    path(pts, col, o) { o = o || {}; const g = this.g; g.strokeStyle = col; g.lineWidth = o.w || 2.4; g.setLineDash(o.dash || []); g.beginPath(); let pen = false; for (const p of pts) { if (!p || !isFinite(p[0]) || !isFinite(p[1])) { pen = false; continue; } const X = this.X(p[0]), Y = this.Y(p[1]); if (!pen) { g.moveTo(X, Y); pen = true; } else g.lineTo(X, Y); } if (o.close) g.closePath(); if (o.fill) { g.fillStyle = o.fill; g.fill(); } g.stroke(); g.setLineDash([]); }
    dot(x, y, col, label, o) { o = o || {}; const g = this.g, X = this.X(x), Y = this.Y(y); if (!isFinite(X) || !isFinite(Y)) return; g.fillStyle = col; g.beginPath(); g.arc(X, Y, o.r || 5, 0, 7); g.fill(); if (o.ring) { g.strokeStyle = this.C.bg; g.lineWidth = 2; g.stroke(); } if (label) { g.font = (o.bold ? '600 ' : '') + '12px ui-sans-serif, system-ui'; g.fillStyle = o.lc || this.C.ink; g.fillText(label, X + 8, Y - 8); } }
    arrow(x1, y1, x2, y2, col, label, o) { o = o || {}; const g = this.g, X1 = this.X(x1), Y1 = this.Y(y1), X2 = this.X(x2), Y2 = this.Y(y2), a = Math.atan2(Y2 - Y1, X2 - X1), L2 = Math.hypot(X2 - X1, Y2 - Y1); if (L2 < 1) return; g.strokeStyle = g.fillStyle = col; g.lineWidth = o.w || 2.5; g.beginPath(); g.moveTo(X1, Y1); g.lineTo(X2, Y2); g.stroke(); const hs = Math.min(11, L2 / 2.5); g.beginPath(); g.moveTo(X2, Y2); g.lineTo(X2 - hs * Math.cos(a - .4), Y2 - hs * Math.sin(a - .4)); g.lineTo(X2 - hs * Math.cos(a + .4), Y2 - hs * Math.sin(a + .4)); g.closePath(); g.fill(); if (label) { g.font = '600 12px ui-sans-serif, system-ui'; g.fillText(label, X2 + 6, Y2 - 6); } }
    text(x, y, s, col, o) { o = o || {}; const g = this.g; g.font = o.font || '12px ui-sans-serif, system-ui'; g.fillStyle = col || this.C.ink; g.textAlign = o.align || 'left'; g.fillText(s, this.X(x) + (o.dx || 0), this.Y(y) + (o.dy || 0)); g.textAlign = 'left'; }
    _bind() {
      const cv = this.cv, pts = new Map(); let last = null, pinch = null;
      cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', e => {
        const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        if (this.o.onDown && this.o.onDown(this.ix(px), this.iy(py), e)) { this._drag = true; cv.setPointerCapture(e.pointerId); return; }
        pts.set(e.pointerId, [e.clientX, e.clientY]); cv.setPointerCapture(e.pointerId); last = [e.clientX, e.clientY];
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); }
      });
      cv.addEventListener('pointermove', e => {
        const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        if (this._drag) { this.o.onDrag && this.o.onDrag(this.ix(px), this.iy(py), e); return; }
        if (!pts.has(e.pointerId)) { this.o.onHover && this.o.onHover(this.ix(px), this.iy(py), px, py); return; }
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d > 0) { this.zoom(pinch / d, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); pinch = d; } return; }
        if (this.o.pan === false || pts.size !== 1) return;
        const dx = (e.clientX - last[0]) / this.W * (this.view.x1 - this.view.x0), dy = (e.clientY - last[1]) / this.H * (this.view.y1 - this.view.y0);
        this.view.x0 -= dx; this.view.x1 -= dx; this.view.y0 += dy; this.view.y1 += dy; last = [e.clientX, e.clientY]; this.render(); this.o.onView && this.o.onView();
      });
      const up = e => { if (this._drag) { this._drag = false; this.o.onUp && this.o.onUp(); } pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (pts.size === 1) last = [...pts.values()][0]; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', e => { if (this.o.zoom === false) return; e.preventDefault(); const r = cv.getBoundingClientRect(); this.zoom(Math.exp(e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    }
    destroy() { this._ro.disconnect(); this.cv.remove(); }
  }
  L.Plot = Plot;

  /* ---------------- small UI kit for engine side panels ---------------- */
  const ui = L.ui = {
    el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; },
    group(title, sub) { const s = ui.el('section', 'lab-grp'); s.innerHTML = `<h4>${esc(title)}</h4>${sub ? `<p class="lab-sub">${sub}</p>` : ''}`; return s; },
    slider(o) { // {key, label, min, max, step, value, unit, on}
      const w = ui.el('label', 'lab-sl'); const id = 'lab-' + o.key + '-' + Math.random().toString(36).slice(2, 7);
      w.innerHTML = `<span class="lab-sl__l"><b>${esc(o.label)}</b><output for="${id}"></output></span><input id="${id}" type="range" min="${o.min}" max="${o.max}" step="${o.step}" value="${o.value}" data-key="${esc(o.key)}" aria-label="${esc(o.label)}">`;
      const inp = w.querySelector('input'), out = w.querySelector('output');
      const show = v => { out.textContent = N.fmt(+v, 4) + (o.unit ? ' ' + o.unit : ''); };
      show(o.value); inp.addEventListener('input', () => { show(inp.value); o.on && o.on(+inp.value); });
      w.set = v => { inp.value = v; show(v); }; w.input = inp;
      // the number can also be typed: tap the value
      out.tabIndex = 0; out.title = T('Type a value', 'اكتب قيمة');
      const edit = () => { const v = prompt(o.label, inp.value); if (v == null || v.trim() === '' || !isFinite(+v)) return; const n = +v; if (+n < +inp.min) inp.min = n; if (+n > +inp.max) inp.max = n; inp.value = n; show(n); o.on && o.on(n); };
      out.addEventListener('click', edit); out.addEventListener('keydown', e => { if (e.key === 'Enter') edit(); });
      return w;
    },
    toggle(o) { const w = ui.el('label', 'lab-tg'); w.innerHTML = `<input type="checkbox" ${o.value ? 'checked' : ''} data-key="${esc(o.key)}"><span>${esc(o.label)}</span>`; const i = w.querySelector('input'); i.addEventListener('change', () => o.on && o.on(i.checked)); w.set = v => { i.checked = !!v; }; w.input = i; return w; },
    select(o) { const w = ui.el('label', 'lab-se'); w.innerHTML = `<span>${esc(o.label)}</span><select data-key="${esc(o.key)}">${o.options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(o.value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; const s = w.querySelector('select'); s.addEventListener('change', () => o.on && o.on(s.value)); w.set = v => { s.value = v; }; w.input = s; return w; },
    buttons(list) { const w = ui.el('div', 'lab-btns'); list.forEach(([label, fn, o]) => { const b = ui.el('button', 'lab-b' + (o && o.primary ? ' lab-b--p' : ''), esc(label)); b.type = 'button'; if (o && o.key) b.dataset.key = o.key; b.addEventListener('click', fn); w.appendChild(b); }); return w; },
    readout(rows) { return `<dl class="lab-ro">${rows.map(([k, v, cls]) => `<div${cls ? ` class="${cls}"` : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`; }
  };

  /* ---------------- the workspace ---------------- */
  let ws = null, current = null;
  function shell() {
    if (ws) return ws;
    ws = ui.el('section', 'lab');
    ws.setAttribute('role', 'dialog'); ws.setAttribute('aria-modal', 'false'); ws.setAttribute('aria-labelledby', 'labTitle'); ws.hidden = true;
    ws.innerHTML = `
      <header class="lab__h"><div class="lab__id"><span class="lab__k" id="labKind"></span><b id="labTitle" class="lab__t"></b></div>
        <div class="lab__hb">
          <button type="button" class="lab-ic" data-lab="explain" aria-pressed="true" title="${T('Explanation panel', 'لوحة الشرح')}">${T('Explain', 'اشرح')}</button>
          <div class="lab-menu"><button type="button" class="lab-ic" data-lab="export" aria-haspopup="true" aria-expanded="false">${T('Export', 'تصدير')}</button>
            <div class="lab-menu__pop" hidden><button type="button" data-lab="png">${T('Image (PNG)', 'صورة PNG')}</button><button type="button" data-lab="json">${T('Model (JSON)', 'النموذج JSON')}</button><button type="button" data-lab="csv">${T('Data table (CSV)', 'جدول بيانات CSV')}</button><button type="button" data-lab="copy">${T('Copy result', 'نسخ النتيجة')}</button><a href="coverage.html" class="lab-menu__link">${T('What Noor can show (coverage)', 'ما يمكن لنور عرضه')}</a></div></div>
          <button type="button" class="lab-ic" data-lab="reset">${T('Reset', 'إعادة')}</button>
          <button type="button" class="lab-ic" data-lab="max" aria-pressed="false" aria-label="${T('Full screen', 'ملء الشاشة')}">⤢</button>
          <button type="button" class="lab-ic" data-lab="close" aria-label="${T('Close the lab', 'إغلاق المختبر')}">✕</button>
        </div></header>
      <div class="lab__body">
        <aside class="lab__side" aria-label="${T('Controls', 'أدوات التحكم')}"></aside>
        <div class="lab__stage"><div class="lab__canvas"></div><div class="lab__hud" aria-live="polite"></div></div>
        <aside class="lab__ex" aria-live="polite" aria-label="${T('Explanation', 'الشرح')}"></aside>
      </div>
      <form class="lab__cmd"><label class="lab-vh" for="labCmd">${T('Tell Noor what to change', 'أخبر نور بما تريد تغييره')}</label><input id="labCmd" autocomplete="off" placeholder="${T('Tell Noor what to change — e.g. “make it wider”, “show the derivative”, “double the resistance”', 'أخبر نور بما تريد تغييره')}"><button type="submit" class="lab-b lab-b--p">${T('Apply', 'طبّق')}</button><span class="lab__note" role="status"></span></form>`;
    document.body.appendChild(ws);
    ws.addEventListener('click', e => {
      const b = e.target.closest('[data-lab]'); if (!b) return; const a = b.dataset.lab;
      if (a === 'close') close();
      if (a === 'reset' && current) { current.inst.reset ? current.inst.reset() : open(current.engine.id, current.params, { reuse: false }); note(T('Reset to the starting model.', 'أُعيد النموذج إلى بدايته.')); }
      if (a === 'max') { const on = ws.classList.toggle('is-max'); b.setAttribute('aria-pressed', String(on)); }
      if (a === 'explain') { const on = ws.classList.toggle('no-ex'); b.setAttribute('aria-pressed', String(!on)); }
      if (a === 'export') { const p = b.nextElementSibling; p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden)); }
      if (['png', 'json', 'csv', 'copy'].includes(a)) { exportAs(a); const p = ws.querySelector('.lab-menu__pop'); p.hidden = true; }
    });
    ws.querySelector('.lab__cmd').addEventListener('submit', e => { e.preventDefault(); const i = ws.querySelector('#labCmd'); const t = i.value.trim(); if (!t) return; const r = command(t); note(r ? r.note : T('I couldn’t apply that here. Try “set a to 2”, “show the derivative”, “zoom out” or ask a new question.', 'لم أستطع تطبيق ذلك هنا.')); if (r) i.value = ''; if (window.ERLY && ERLY.emit) ERLY.emit('lab:command', { text: t, result: r }); });
    ws.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.target.closest('input, textarea, select')) { e.stopPropagation(); close(); } });
    new MutationObserver(() => { if (current && current.inst.redraw) current.inst.redraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return ws;
  }
  function note(t) { if (!ws) return; const n = ws.querySelector('.lab__note'); n.textContent = t || ''; n.classList.remove('is-on'); void n.offsetWidth; n.classList.add('is-on'); }
  L.note = note;
  function explainNow() { if (!current || !ws) return; const ex = ws.querySelector('.lab__ex'); try { ex.innerHTML = current.inst.explain ? current.inst.explain() : ''; } catch (e) { ex.textContent = String(e.message || e); } }
  L.explainNow = explainNow;
  L.hud = html => { if (ws) ws.querySelector('.lab__hud').innerHTML = html || ''; };

  async function open(id, params, o) {
    o = o || {};
    const engine = L.engines.find(e => e.id === id); if (!engine) throw new Error('No lab engine ' + id);
    shell();
    if (current && current.inst.destroy) { try { current.inst.destroy(); } catch (e) { /* already gone */ } }
    current = null;
    const side = ws.querySelector('.lab__side'), stage = ws.querySelector('.lab__canvas'), ex = ws.querySelector('.lab__ex');
    side.innerHTML = ''; stage.innerHTML = ''; ex.innerHTML = ''; L.hud('');
    ws.dataset.engine = id; ws.dataset.family = engine.family || 'math';
    ws.querySelector('#labKind').textContent = engine.kind;
    ws.querySelector('#labTitle').textContent = (params && params.title) || engine.title;
    ws.hidden = false; document.documentElement.classList.add('lab-on');
    requestAnimationFrame(() => ws.classList.add('is-in'));
    stage.innerHTML = `<p class="lab-loading">${T('Building the model…', 'أبني النموذج…')}</p>`;
    let inst;
    try { inst = await engine.mount({ side, stage, ex, params: params || {}, ws }); }
    catch (e) { stage.innerHTML = `<p class="lab-err">${esc(T('This model could not be built: ', 'تعذر بناء هذا النموذج: ') + (e.message || e))}</p>`; throw e; }
    const ld = stage.querySelector('.lab-loading'); if (ld) ld.remove();
    current = { engine, inst, params: params || {} };
    if (params && params.title) ws.querySelector('#labTitle').textContent = params.title;
    explainNow();
    if (window.ERLY && ERLY.emit) ERLY.emit('lab:open', { id, params });
    return inst;
  }
  function close() {
    if (!ws) return; ws.classList.remove('is-in'); document.documentElement.classList.remove('lab-on');
    if (current && current.inst.destroy) { try { current.inst.destroy(); } catch (e) { /* ok */ } }
    current = null; setTimeout(() => { if (!current) ws.hidden = true; }, 220);
    if (window.ERLY && ERLY.emit) ERLY.emit('lab:close', {});
  }
  // a command for the open model ("make it wider", "set m to 3", "show the derivative")
  function command(text) {
    if (!current) return null;
    const t = String(text).trim(); let r = null;
    if (/^(reset|start again|start over)\b/i.test(t)) { if (current.inst.reset) current.inst.reset(); r = { note: T('Reset to the starting model.', 'أُعيد النموذج إلى بدايته.') }; }
    else if (/^(close|exit) (the )?(lab|workspace|simulation|graph)\b/i.test(t)) { close(); r = { note: T('Closed the lab.', 'أُغلق المختبر.') }; }
    else if (current.inst.command) r = current.inst.command(t);
    if (!r && current.inst.params) r = genericSet(t, current.inst);
    if (r) explainNow();
    return r;
  }
  // "set X to 5", "X = 5", "make X 5", "increase X", "double X", "halve X"
  function genericSet(t, inst) {
    const P = inst.params(); if (!P || !P.length) return null;
    const find = name => { name = name.toLowerCase().trim().replace(/^the /, ''); return P.find(p => p.key.toLowerCase() === name || p.label.toLowerCase() === name || p.label.toLowerCase().replace(/\s*\(.*\)/, '') === name || (p.alias || []).some(a => a === name)); };
    let m = t.match(/^(?:set|make|change|put)\s+(?:the\s+)?([a-zθ\w\s₀-₉]+?)\s+(?:to|=|equal to|as)\s+(-?[\d.]+)/i) || t.match(/^([a-zθ\w₀-₉]+)\s*=\s*(-?[\d.]+)\s*$/i);
    if (m) { const p = find(m[1]); if (p) { inst.set(p.key, +m[2]); return { note: `${p.label} = ${N.fmt(+m[2])}${p.unit ? ' ' + p.unit : ''}.` }; } }
    m = t.match(/^(double|halve|increase|decrease|raise|lower|reduce)\s+(?:the\s+)?(.+?)\s*$/i);
    if (m) { const p = find(m[2]); if (p) { const cur = inst.get(p.key), k = m[1].toLowerCase(); const v = k === 'double' ? cur * 2 : k === 'halve' ? cur / 2 : /increase|raise/.test(k) ? cur + (p.step || 1) * 5 : cur - (p.step || 1) * 5; inst.set(p.key, v); return { note: `${p.label}: ${N.fmt(cur)} → ${N.fmt(inst.get(p.key))}${p.unit ? ' ' + p.unit : ''}.` }; } }
    return null;
  }

  /* ---------------- export ---------------- */
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400); }
  async function exportAs(kind) {
    if (!current) return; const inst = current.inst, slug = (ws.querySelector('#labTitle').textContent || 'noor-lab').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    try {
      if (kind === 'png') { const c = inst.canvas ? await inst.canvas() : ws.querySelector('.lab__canvas canvas'); if (!c) throw new Error('nothing to export'); c.toBlob(b => { download(slug + '.png', b); L.lastExport = { kind, bytes: b.size }; }, 'image/png'); note(T('Image downloaded.', 'نُزّلت الصورة.')); }
      if (kind === 'json') { const d = { engine: current.engine.id, title: ws.querySelector('#labTitle').textContent, model: inst.state ? inst.state() : {}, exported: new Date().toISOString(), note: 'Exported from ERLY Noor Lab' }; const s = JSON.stringify(d, null, 2); download(slug + '.json', new Blob([s], { type: 'application/json' })); L.lastExport = { kind, text: s }; note(T('Model downloaded as JSON.', 'نُزّل النموذج بصيغة JSON.')); }
      if (kind === 'csv') { const rows = inst.table ? inst.table() : null; if (!rows || !rows.length) return note(T('This model has no data table to export.', 'لا يوجد جدول بيانات لهذا النموذج.')); const s = rows.map(r => r.map(v => (typeof v === 'number' ? +v.toPrecision(10) : '"' + String(v).replace(/"/g, '""') + '"')).join(',')).join('\n'); download(slug + '.csv', new Blob([s], { type: 'text/csv' })); L.lastExport = { kind, text: s }; note(T('Data table downloaded (CSV).', 'نُزّل جدول البيانات.')); }
      if (kind === 'copy') { const s = inst.summary ? inst.summary() : ws.querySelector('.lab__ex').innerText; L.lastExport = { kind, text: s }; try { await navigator.clipboard.writeText(s); note(T('Result copied.', 'نُسخت النتيجة.')); } catch (e) { note(T('Copy isn’t allowed here — select the text in the explanation instead.', 'النسخ غير مسموح هنا.')); } }
    } catch (e) { note(T('Export failed: ', 'فشل التصدير: ') + (e.message || e)); }
  }

  /* ---------------- routing plain language to an engine ---------------- */
  function register(engine) { L.engines = L.engines.filter(e => e.id !== engine.id).concat(engine); }
  // words students use for maths, turned into expressions the engines can read
  function normalise(text) {
    return String(text).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√\s*\(?([\w.]+)\)?/g, 'sqrt($1)').replace(/π/g, 'pi').replace(/θ/g, 'theta')
      .replace(/\b([a-z])\s+squared\b/gi, '$1^2').replace(/\b([a-z])\s+cubed\b/gi, '$1^3').replace(/\bsquare root of\s+([\w.()^+\-*/]+)/gi, 'sqrt($1)');
  }
  L.normalise = normalise;
  function candidates(text) {
    const t = normalise(text), out = [];
    for (const e of L.engines) { let m = null; try { m = e.match ? e.match(t, text) : null; } catch (er) { m = null; } if (m && m.score > 0) out.push({ id: e.id, params: m.params || {}, score: m.score, reply: m.reply }); }
    return out.sort((a, b) => b.score - a.score);
  }
  function route(text) { return candidates(text)[0] || null; }
  // Noor's entry point: an edit to the open model, a calculation answered in chat, or a new model
  async function handle(text) {
    if (current) { const r = command(normalise(text)); if (r) return { kind: 'edit', text: r.note + (r.more ? '\n\n' + r.more : '') }; }
    // Noor's hand-built illustrated scenes (Newton's laws, the solar system, the heart…) answer "explain/illustrate"
    // requests; the lab takes over when the student wants to simulate, graph, calculate, build or experiment
    const LABWORDS = /\b(solve|factor\w*|simulat\w*|experiment\w*|graph\w*|plot\w*|calculat\w*|comput\w*|sliders?|adjust\w*|lab|interactive model|construct\w*|build\w*|let me (try|play|explore))\b/i;
    // a conceptual "why…?" with no maths in it and no request to build anything is Noor's to explain, not a model to open
    if (/^\s*why\b/i.test(text) && !LABWORDS.test(text) && !/[=^]|\d\s*[+\-*/]\s*\d|\bx\b/.test(text)) return null;
    const list = candidates(text); let r = null;
    const top = list[0];
    const wantsPicture = /\b(diagram|illustrat\w*|picture|tour|show me how)\b/i.test(text);
    if (top && !top.reply && (top.score < 0.88 || wantsPicture)) { try { const V = window.ERLY && ERLY.vspec; const pl = V && !LABWORDS.test(text) ? V.plan(text) : null; if (pl && ['scene', 'scene2d', 'scene3d', 'mermaid', 'timeline', 'diagram'].includes(pl.kind)) return null; } catch (e) { /* no curated visual */ } }
    for (const c of list) {
      if (c.reply) { let rep = null; try { rep = await c.reply(); } catch (e) { rep = null; } if (rep && rep.text) { if (rep.open) await open(rep.open.id, rep.open.params); return { kind: 'answer', text: rep.text }; } if (c.id === 'algebra') continue; }
      if (c.id === 'algebra') continue; r = c; break;
    }
    if (!r) return null;
    await open(r.id, r.params);
    const sum = current && current.inst.intro ? current.inst.intro() : '';
    return { kind: 'open', id: r.id, text: sum };
  }
  // v17: what Noor would show for a question, without opening anything (used by the coverage page). Mirrors the
  // decisions in handle(): a confident lab engine, unless the student asked for a picture of a curated scene
  function predict(text) {
    const LABWORDS = /\b(solve|factor\w*|simulat\w*|experiment\w*|graph\w*|plot\w*|calculat\w*|comput\w*|sliders?|adjust\w*|lab|interactive model|construct\w*|build\w*|let me (try|play|explore))\b/i;
    const V = window.ERLY && ERLY.vspec; let pl = null; try { pl = V ? V.plan(text) : null; } catch (e) { pl = null; }
    const top = candidates(text)[0];
    const curated = pl && ['scene', 'scene2d', 'scene3d', 'mermaid', 'timeline', 'diagram'].includes(pl.kind);
    const wantsPicture = /\b(diagram|illustrat\w*|picture|tour|show me how)\b/i.test(text);
    const why = /^\s*why\b/i.test(text) && !LABWORDS.test(text) && !/[=^]|\d\s*[+\-*/]\s*\d|\bx\b/.test(text);
    if (top && !why && top.score >= 0.6 && !(curated && !top.reply && !LABWORDS.test(text) && (top.score < 0.88 || wantsPicture))) return { status: 'interactive', engine: top.id, score: top.score };
    if (pl && pl.kind) return { status: ['diagram', 'mermaid', 'timeline', 'chart'].includes(pl.kind) ? 'diagram' : 'visual', kind: pl.kind, title: pl.title && (pl.title[0] || pl.title) };
    return { status: 'explain' };
  }
  L.predict = predict;
  Object.assign(L, { register, open, close, command, route, candidates, handle, current: () => current, workspace: () => ws, state: () => (current && current.inst.state ? current.inst.state() : null) });
})();
