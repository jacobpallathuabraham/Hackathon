/* ERLY Learning Studio — the experience kit (v24).
   Shared building blocks so every experience feels the same in the hand while looking different:
   • K.stage    — a crisp, high-DPI canvas in LOGICAL units (default 800 wide) that redraws itself on resize
   • K.spring   — a critically-damped value: sliders set a target and the picture glides there (no jumps)
   • K.motor    — one animation loop per experience that runs only while something moves, a simulation plays,
                  the stage is on screen and the tab is visible; then it sleeps (no idle background loops)
   • K.controls — sliders / chips / buttons / toggles with live, eased read-outs, all keyboard-operable
   • K.axes     — graph axes, grid and tick labels with mapping functions
   • K.drag     — pointer dragging of handles in logical units (pointer capture, touch-safe)
   • K.expr     — a small, safe maths expression compiler (no eval) for typed functions
   With reduced motion, springs snap and the motor draws single frames. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const K = {};
  K.reduced = reduced;
  K.fmt = (v, d = 1) => { if (!isFinite(v)) return '—'; const s = (Math.abs(v) < 1e-12 ? 0 : v).toFixed(d); return s.replace('-', '−'); };
  K.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  K.lerp = (a, b, t) => a + (b - a) * t;
  K.css = v => getComputedStyle(document.body).getPropertyValue(v).trim();
  K.dark = () => document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches && !document.documentElement.classList.contains('light') && document.documentElement.dataset.theme !== 'light';
  K.pal = () => { const d = K.dark(); return { ink: K.css('--ink') || (d ? '#eee' : '#1b1915'), muted: K.css('--muted') || '#6e675b', line: K.css('--line') || '#ddd4c4', bg: K.css('--surface') || (d ? '#1c1a17' : '#fbf8f2'), bg2: K.css('--surface-2') || '#f1ebe0', accent: K.css('--accent') || '#3446d4', blue: d ? '#7aa7ff' : '#2557d6', red: d ? '#ff7a6b' : '#d23a2a', green: d ? '#5fd69a' : '#178a4a', gold: d ? '#ffc65c' : '#c47a00', violet: d ? '#c3a6ff' : '#6b3fd1', teal: d ? '#4fd1c5' : '#0f8a80', grey: d ? '#8f8a80' : '#8a8378' }; };

  /* ---------- springs ---------- */
  K.spring = (v, rate = 14) => {
    const s = { v, t: v, rate, set(x, snap) { s.t = x; if (snap || reduced()) s.v = x; }, step(dt) { const d = s.t - s.v; if (Math.abs(d) < 1e-6 * (1 + Math.abs(s.t))) { s.v = s.t; return false; } s.v += d * (1 - Math.exp(-dt * s.rate)); return true; } };
    return s;
  };

  /* ---------- the stage ---------- */
  K.stage = (host, W, H, cls) => {
    const wrap = document.createElement('div'); wrap.className = 'kx-stage' + (cls ? ' ' + cls : ''); const cv = document.createElement('canvas'); cv.className = 'kx-cv'; wrap.appendChild(cv); host.appendChild(wrap);
    const S = { cv, wrap, W, H, g: cv.getContext('2d'), s: 1, onresize: null };
    S.fit = () => { const dpr = Math.min(2, devicePixelRatio || 1), w = wrap.clientWidth || W; S.s = w / W; cv.width = Math.round(w * dpr); cv.height = Math.round(w * H / W * dpr); cv.style.height = (w * H / W) + 'px'; S.g.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0); if (S.onresize) S.onresize(); };
    S.clear = col => { const g = S.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (col) { g.fillStyle = col; g.fillRect(0, 0, cv.width, cv.height); } else g.clearRect(0, 0, cv.width, cv.height); g.restore(); };
    S.pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    (host.__kxStages = host.__kxStages || []).push(S);
    S.fit(); const ro = 'ResizeObserver' in window ? new ResizeObserver(() => S.fit()) : null; if (ro) ro.observe(wrap);
    S.destroy = () => ro && ro.disconnect();
    return S;
  };

  /* ---------- the motor ---------- */
  K.motor = (c, host, frame) => {
    let springs = [], sim = false, L = null, reqd = false;
    const M = { springs, add(...s) { springs.push(...s); return M; }, playing: () => sim,
      kick() { if (reduced()) { springs.forEach(s => { s.v = s.t; }); frame(0, false); return; } if (!L.running()) L.start(); },
      play() { sim = true; if (reduced()) { frame(0.016, true); return; } L.start(); }, pause() { sim = false; L.stop(); frame(0, false); }, draw() { frame(0, sim); } };
    L = c.looper(host, dt => { let moving = false; springs.forEach(s => { if (s.step(dt)) moving = true; }); frame(dt, sim); if (!moving && !sim) L.stop(); });
    M.loop = L; (host.__kxStages || []).forEach(st => { st.onresize = () => frame(0, sim); }); return M;
  };

  /* ---------- controls ---------- */
  // spec: { k: 'range', id, label, min, max, step, val, unit, d, fmt } | { k: 'chips', id, label, opts: [[v, label]], val } | { k: 'btn', id, label, accent } | { k: 'toggle', id, label, val }
  K.controls = (host, specs, on) => {
    const box = document.createElement('div'); box.className = 'kx-ctl'; host.appendChild(box);
    const val = {}, outs = {};
    box.innerHTML = specs.map(s => {
      if (s.k === 'range') { val[s.id] = s.val; return `<label class="kx-range"><span class="kx-range__t">${s.label}<output data-ko="${s.id}">${(s.fmt || (v => K.fmt(v, s.d == null ? 0 : s.d)))(s.val)}${s.unit || ''}</output></span><input type="range" data-k="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.val}" aria-label="${esc(String(s.label).replace(/<[^>]+>/g, ''))}"></label>`; }
      if (s.k === 'chips') { val[s.id] = s.val; return `<div class="kx-chips" role="radiogroup" aria-label="${esc(String(s.label).replace(/<[^>]+>/g, ''))}"><span class="kx-chips__t">${s.label}</span>${s.opts.map(([v, l]) => `<button type="button" role="radio" data-kc="${s.id}" data-v="${esc(String(v))}" aria-checked="${String(v) === String(s.val)}">${l}</button>`).join('')}</div>`; }
      if (s.k === 'toggle') { val[s.id] = !!s.val; return `<label class="kx-tog"><input type="checkbox" data-kt="${s.id}" ${s.val ? 'checked' : ''}><span>${s.label}</span></label>`; }
      if (s.k === 'btn') return `<button type="button" class="ls-btn ls-btn--sm ${s.accent ? 'ls-btn--accent' : 'ls-btn--quiet'}" data-kb="${s.id}">${s.label}</button>`;
      if (s.k === 'row') return '<div class="kx-row">';
      if (s.k === 'end') return '</div>';
      if (s.k === 'html') return s.html;
      return '';
    }).join('');
    specs.forEach(s => { if (s.k === 'range') outs[s.id] = s; });
    const fill = el => { const p = (el.value - el.min) / (el.max - el.min) * 100; el.style.setProperty('--p', p + '%'); };
    box.querySelectorAll('input[type=range]').forEach(fill);
    box.addEventListener('input', e => { const r = e.target.closest('[data-k]'); if (r) { const v = +r.value; val[r.dataset.k] = v; fill(r); const s = outs[r.dataset.k]; box.querySelector(`[data-ko="${r.dataset.k}"]`).textContent = (s.fmt || (x => K.fmt(x, s.d == null ? 0 : s.d)))(v) + (s.unit || ''); on(r.dataset.k, v); }
      const t = e.target.closest('[data-kt]'); if (t) { val[t.dataset.kt] = t.checked; on(t.dataset.kt, t.checked); } });
    box.addEventListener('click', e => { const ch = e.target.closest('[data-kc]'); if (ch) { const id = ch.dataset.kc; box.querySelectorAll(`[data-kc="${id}"]`).forEach(b => b.setAttribute('aria-checked', String(b === ch))); const raw = ch.dataset.v, v = isNaN(+raw) || raw === '' ? raw : +raw; val[id] = v; on(id, v); return; }
      const b = e.target.closest('[data-kb]'); if (b) on(b.dataset.kb, true); });
    box.addEventListener('keydown', e => { const ch = e.target.closest('[data-kc]'); if (!ch || !/Arrow(Left|Right|Up|Down)/.test(e.key)) return; e.preventDefault(); const all = [...box.querySelectorAll(`[data-kc="${ch.dataset.kc}"]`)], i = all.indexOf(ch), n = all[(i + (/Right|Down/.test(e.key) ? 1 : all.length - 1)) % all.length]; n.focus(); n.click(); });
    return { box, val,
      set(id, v) { val[id] = v; const r = box.querySelector(`[data-k="${id}"]`); if (r) { r.value = v; fill(r); const s = outs[id]; box.querySelector(`[data-ko="${id}"]`).textContent = (s.fmt || (x => K.fmt(x, s.d == null ? 0 : s.d)))(v) + (s.unit || ''); }
        const cs = box.querySelectorAll(`[data-kc="${id}"]`); cs.forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === String(v)))); const t = box.querySelector(`[data-kt="${id}"]`); if (t) t.checked = !!v; },
      reset() { specs.forEach(s => { if ('val' in s) this.set(s.id, s.val); }); }
    };
  };

  /* ---------- axes ---------- */
  K.axes = (g, box, xr, yr, o = {}) => {
    const P = K.pal(), [bx, by, bw, bh] = box;
    const X = x => bx + (x - xr[0]) / (xr[1] - xr[0]) * bw, Y = y => by + bh - (y - yr[0]) / (yr[1] - yr[0]) * bh;
    const IX = px => xr[0] + (px - bx) / bw * (xr[1] - xr[0]), IY = py => yr[0] + (by + bh - py) / bh * (yr[1] - yr[0]);
    const nice = span => { const r = span / (o.ticks || 8), p = Math.pow(10, Math.floor(Math.log10(r))), m = r / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
    const sx = o.xstep || nice(xr[1] - xr[0]), sy = o.ystep || nice(yr[1] - yr[0]);
    g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
    if (o.grid !== false) { g.strokeStyle = P.line; g.lineWidth = 1; g.globalAlpha = 0.7; g.beginPath();
      for (let x = Math.ceil(xr[0] / sx) * sx; x <= xr[1] + 1e-9; x += sx) { g.moveTo(X(x), by); g.lineTo(X(x), by + bh); }
      for (let y = Math.ceil(yr[0] / sy) * sy; y <= yr[1] + 1e-9; y += sy) { g.moveTo(bx, Y(y)); g.lineTo(bx + bw, Y(y)); } g.stroke(); g.globalAlpha = 1; }
    g.restore();
    g.strokeStyle = P.muted; g.lineWidth = 1.4; g.beginPath();
    const ax = K.clamp(0, yr[0], yr[1]), ay = K.clamp(0, xr[0], xr[1]);
    g.moveTo(bx, Y(ax)); g.lineTo(bx + bw, Y(ax)); g.moveTo(X(ay), by); g.lineTo(X(ay), by + bh); g.stroke();
    g.fillStyle = P.muted; g.font = '12px ui-sans-serif, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
    const lab = v => { const d = Math.max(0, -Math.floor(Math.log10(Math.abs(v) || 1)) + (Math.abs(v) < 1 ? 1 : 0)); return K.fmt(v, Math.min(3, (o.dec != null ? o.dec : d))); };
    for (let x = Math.ceil(xr[0] / sx) * sx; x <= xr[1] + 1e-9; x += sx) if (Math.abs(x) > 1e-9 || o.zero) g.fillText(lab(x), X(x), Math.min(by + bh - 14, Y(ax) + 4));
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let y = Math.ceil(yr[0] / sy) * sy; y <= yr[1] + 1e-9; y += sy) if (Math.abs(y) > 1e-9 || o.zero) g.fillText(lab(y), Math.max(bx + 26, X(ay) - 5), Y(y));
    if (o.xl) { g.textAlign = 'right'; g.textBaseline = 'bottom'; g.font = '600 13px ui-sans-serif, system-ui'; g.fillText(o.xl, bx + bw - 4, Y(ax) - 4); }
    if (o.yl) { g.textAlign = 'left'; g.textBaseline = 'top'; g.font = '600 13px ui-sans-serif, system-ui'; g.fillText(o.yl, X(ay) + 6, by + 4); }
    return { X, Y, IX, IY, box };
  };
  K.plot = (g, A, f, x0, x1, col, w = 2.5, n = 400) => { g.save(); if (A.box) { g.beginPath(); g.rect(...A.box); g.clip(); } g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); let pen = false;
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = f(x); if (!isFinite(y) || Math.abs(y) > 1e6) { pen = false; continue; } const py = A.Y(y); if (pen) g.lineTo(A.X(x), py); else { g.moveTo(A.X(x), py); pen = true; } } g.stroke(); g.restore(); };
  K.arrow = (g, x0, y0, x1, y1, col, w = 3, head = 10, label) => { const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0); g.strokeStyle = g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round'; if (len < 1) return;
    const h = Math.min(head, len * 0.45); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - Math.cos(a) * h * 0.6, y1 - Math.sin(a) * h * 0.6); g.stroke(); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - h * Math.cos(a - 0.42), y1 - h * Math.sin(a - 0.42)); g.lineTo(x1 - h * Math.cos(a + 0.42), y1 - h * Math.sin(a + 0.42)); g.closePath(); g.fill();
    if (label) { g.font = '600 13px ui-sans-serif, system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; const ox = -Math.sin(a) * 14, oy = Math.cos(a) * 14; K.tag(g, label, x1 + Math.cos(a) * 12 + ox * 0.3, y1 + Math.sin(a) * 12 + oy * 0.3, col); } };
  K.tag = (g, text, x, y, col, bg) => { const P = K.pal(); g.font = g.font || '600 13px ui-sans-serif'; const w = g.measureText(text).width + 10; g.fillStyle = bg || P.bg; g.globalAlpha = 0.88; g.fillRect(x - w / 2, y - 10, w, 20); g.globalAlpha = 1; g.fillStyle = col || P.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y); };
  K.text = (g, t, x, y, o = {}) => { const P = K.pal(); g.font = `${o.w || 500} ${o.s || 13}px ui-sans-serif, system-ui, sans-serif`; g.fillStyle = o.c || P.ink; g.textAlign = o.a || 'left'; g.textBaseline = o.b || 'alphabetic'; g.fillText(t, x, y); };
  K.rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

  /* ---------- dragging ---------- */
  // handles(): [{ id, x, y, r }] in logical units; move(id, x, y); end(id)
  K.drag = (S, handles, move, end) => {
    let cur = null; const cv = S.cv; cv.style.touchAction = 'none';
    const hit = (x, y) => { let best = null, bd = 1e9; handles().forEach(h => { const d = Math.hypot(h.x - x, h.y - y); if (d < (h.r || 18) + 8 && d < bd) { bd = d; best = h; } }); return best; };
    cv.addEventListener('pointerdown', e => { const [x, y] = S.pt(e), h = hit(x, y); if (!h) return; cur = h.id; cv.setPointerCapture(e.pointerId); cv.classList.add('is-grab'); e.preventDefault(); move(cur, x, y); });
    cv.addEventListener('pointermove', e => { const [x, y] = S.pt(e); if (cur != null) { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; const last = evs.length ? S.pt(evs[evs.length - 1]) : [x, y]; move(cur, last[0], last[1]); } else cv.style.cursor = hit(x, y) ? 'grab' : ''; });
    const up = () => { if (cur != null) { const c0 = cur; cur = null; cv.classList.remove('is-grab'); if (end) end(c0); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    return { dragging: () => cur };
  };

  /* ---------- a safe expression compiler: + − × ÷ ^, unary minus, implicit ×, functions, constants, x and named params ---------- */
  K.expr = (src, vars = ['x']) => {
    const s = String(src).toLowerCase().replace(/\s+/g, '').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\*\*/g, '^').replace(/π/g, 'pi');
    let i = 0; const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, sign: Math.sign };
    const CONST = { pi: Math.PI, e: Math.E };
    const peek = () => s[i];
    function num() { const m = /^\d*\.?\d+(e[+-]?\d+)?/.exec(s.slice(i)); if (!m) return null; i += m[0].length; const v = +m[0]; return () => v; }
    function ident() { const m = /^[a-z]+/.exec(s.slice(i)); if (!m) return null; let w = m[0];
      // split runs like "ax" or "2pix" into known names greedily
      const names = Object.keys(FN).concat(Object.keys(CONST), vars).sort((a, b) => b.length - a.length);
      const n = names.find(k => w.startsWith(k)); if (!n) throw new Error('Unknown name “' + w + '”'); i += n.length;
      if (FN[n]) { const arg = atom(); if (!arg) throw new Error(n + ' needs a value'); const f = FN[n]; return sc => f(arg(sc)); }
      if (n in CONST) { const v = CONST[n]; return () => v; }
      return sc => sc[n]; }
    function atom() { const c = peek(); if (c === '(') { i++; const v = add(); if (peek() !== ')') throw new Error('Missing “)”'); i++; return v; } if (c === '|') { i++; const v = add(); if (peek() !== '|') throw new Error('Missing “|”'); i++; return sc => Math.abs(v(sc)); } return num() || ident(); }
    function pow() { const b = atom(); if (!b) throw new Error('Expected a number or x'); if (peek() === '^') { i++; const e = unary(); return sc => Math.pow(b(sc), e(sc)); } return b; }
    function unary() { if (peek() === '-') { i++; const v = unary(); return sc => -v(sc); } if (peek() === '+') { i++; return unary(); } return pow(); }
    function mul() { let v = unary(); for (;;) { const c = peek(); if (c === '*' || c === '/') { i++; const r = unary(), l = v; v = c === '*' ? sc => l(sc) * r(sc) : sc => l(sc) / r(sc); } else if (c && /[a-z0-9(.|]/.test(c) && c !== '|') { const r = unary(), l = v; v = sc => l(sc) * r(sc); } else return v; } }
    function add() { let v = mul(); for (;;) { const c = peek(); if (c === '+' || c === '-') { i++; const r = mul(), l = v; v = c === '+' ? sc => l(sc) + r(sc) : sc => l(sc) - r(sc); } else return v; } }
    if (!s) throw new Error('Type a function of x');
    const f = add(); if (i < s.length) throw new Error('Unexpected “' + s[i] + '”');
    return f;
  };

  /* ---------- a running number that glides to its new value in text ---------- */
  K.count = (el, from, to, d = 1, ms = 380, suffix = '') => { if (reduced() || !el) { if (el) el.textContent = K.fmt(to, d) + suffix; return; } const t0 = performance.now(); const tick = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = K.fmt(from + (to - from) * e, d) + suffix; if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };

  LS.kit = K;
})();
