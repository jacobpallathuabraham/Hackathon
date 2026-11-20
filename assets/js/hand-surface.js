/* ERLY — Handwriting Studio writing surface (v22).
   Built on the v20 engine design: two stacked canvases — a COMMITTED layer that receives each finished stroke once,
   and a LIVE layer that draws only the stroke in progress (plus the browser's predicted points). The committed layer
   is repainted in full only after undo, redo, erase, clear, a resize or a zoom change, so long pages stay smooth.
   Input: Pointer Events with coalesced points (full-rate pens) and predicted points (lower perceived latency).
   Strokes are rendered by the Signature Ink Engine (hand-ink.js). Palm rejection: once a pen is seen, touches do not
   draw; two fingers pan and pinch-zoom. Device-pixel-ratio aware.
   Paper (white, warm, lined, grid, handwriting guides) and tracing text are drawn by CSS BEHIND the ink, so they are
   never part of an exported image. Export gives the clean version (precision ink, black on white) for OCR, or the
   ink as written. The optional "ink settles" effect is drawn on the live layer AFTER the stroke is committed: it adds
   no latency and never changes stroke data. Nothing is stored by this file. */
(function () {
  'use strict';
  const INK = () => window.ERLY.ink22;
  const MAX_BACK = 4096;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');

  function create(host, opts) {
    const narrow = host.getBoundingClientRect().width < 640 || matchMedia('(max-width: 640px)').matches;
    const W = narrow ? 800 : 1600, H = narrow ? 1040 : 900;
    opts = Object.assign({ size: 3.2, color: '#1c1b19', ink: 'classic', tool: 'pen', paper: 'lined', guide: false, trace: '', reveal: true, onChange: null, dir: 'ltr' }, opts || {});
    host.classList.add('hxs');
    host.innerHTML = `<div class="hxs__vp" tabindex="0" role="img" aria-roledescription="writing surface" aria-label="Writing surface. Write with a pen, finger or mouse.">
        <div class="hxs__sheet" data-paper="${opts.paper}"><div class="hxs__trace" aria-hidden="true" dir="${opts.dir}"></div><canvas class="hxs__base" aria-hidden="true"></canvas><canvas class="hxs__live" aria-hidden="true"></canvas></div></div>`;
    const vp = host.querySelector('.hxs__vp'), sheet = host.querySelector('.hxs__sheet'), base = host.querySelector('.hxs__base'), live = host.querySelector('.hxs__live'), trace = host.querySelector('.hxs__trace');
    const bx = base.getContext('2d'), lx = live.getContext('2d');
    let strokes = [], undoS = [], redoS = [], cur = null, pred = [], raf = 0, penSeen = false, fit = 1, zoom = 1, pan = { x: 0, y: 0 }, scale = 1, dead = false, settle = null;
    const touches = new Map(); let pinch = null;
    const st = { tool: opts.tool, size: opts.size, color: opts.color, ink: opts.ink, reveal: opts.reveal };
    const timing = { frames: 0, total: 0, max: 0 };

    function layout() {
      const r = vp.getBoundingClientRect(); if (!r.width) return;
      fit = r.width / W; vp.style.height = Math.round(H * fit) + 'px';
      const dpr = Math.min(3, window.devicePixelRatio || 1); scale = Math.min(fit * zoom * dpr, MAX_BACK / W);
      for (const c of [base, live]) { c.width = Math.round(W * scale); c.height = Math.round(H * scale); }
      sheet.style.width = W + 'px'; sheet.style.height = H + 'px';
      clampPan(); applyTransform(); repaint();
    }
    function clampPan() { const vw = W * fit, vh = H * fit, sw = vw * zoom, sh = vh * zoom; pan.x = Math.min(0, Math.max(vw - sw, pan.x)); pan.y = Math.min(0, Math.max(vh - sh, pan.y)); }
    function applyTransform() { sheet.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${fit * zoom})`; }
    function toPage(e) { const r = base.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }

    const drawTo = (ctx, s, extra) => { ctx.save(); ctx.setTransform(scale, 0, 0, scale, 0, 0); INK().draw(ctx, extra ? Object.assign({}, s, { pts: s.pts.concat(extra) }) : s, { cache: !extra, fresh: !!extra }); ctx.restore(); };
    function repaint() { bx.clearRect(0, 0, base.width, base.height); for (const s of strokes) drawTo(bx, s); lx.clearRect(0, 0, live.width, live.height); }
    function frame() {
      raf = 0; if (!cur) return;
      const t0 = performance.now();
      lx.clearRect(0, 0, live.width, live.height);
      if (cur.tool === 'eraser') { const p = cur.pts[cur.pts.length - 1]; lx.save(); lx.setTransform(scale, 0, 0, scale, 0, 0); lx.strokeStyle = 'rgba(120,120,120,.6)'; lx.lineWidth = 1.5; lx.beginPath(); lx.arc(p[0], p[1], eraseR(), 0, 7); lx.stroke(); lx.restore(); }
      else drawTo(lx, cur, pred);
      const dt = performance.now() - t0; timing.frames++; timing.total += dt; timing.max = Math.max(timing.max, dt);
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const eraseR = () => Math.max(10, st.size * 4);

    // the optional "ink settles" sheen: a short fading highlight over the stroke just written (drawing is already done)
    function settleFx(s) {
      if (!st.reveal || reduced()) return;
      const t0 = performance.now(); settle = { s, t0 };
      const step = t => { if (!settle || settle.s !== s || cur) return; const k = (t - t0) / 380; lx.clearRect(0, 0, live.width, live.height); if (k >= 1) { settle = null; return; } lx.save(); lx.setTransform(scale, 0, 0, scale, 0, 0); INK().draw(lx, s, { color: 'rgba(255,255,255,1)', alpha: 0.28 * (1 - k), cache: false }); lx.restore(); requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }

    function commit(next) { undoS.push(strokes); if (undoS.length > 200) undoS.shift(); strokes = next; redoS = []; changed(); }
    function changed() { opts.onChange && opts.onChange(api); }

    // stroke eraser: removes every stroke the eraser passes over (clean for analysis and export)
    function eraseHits(path) {
      const r = eraseR(), r2 = r * r;
      return strokes.filter(s => !s.pts.some(p => path.some(q => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 <= r2)));
    }

    function addPoints(e) {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; const list = evs.length ? evs : [e];
      for (const ev of list) {
        const [x, y] = toPage(ev), last = cur.pts[cur.pts.length - 1];
        if (last && Math.hypot(x - last[0], y - last[1]) < 0.3) continue;
        cur.pts.push([x, y, ev.pressure || 0, ev.timeStamp]); cur.pr.push(ev.pressure || 0);
      }
      pred = (e.getPredictedEvents ? e.getPredictedEvents() : []).slice(0, 2).map(ev => { const [x, y] = toPage(ev); return [x, y, ev.pressure || 0, ev.timeStamp]; });
      if (cur.tool !== 'eraser' && e.pointerType === 'pen') cur.pressure = INK().realPressure(cur.pr);
      schedule();
    }
    function down(e) {
      if (e.pointerType === 'pen') penSeen = true;
      if (e.pointerType === 'touch') { touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2) { cancelStroke(); startPinch(); return; } if (penSeen) return; }
      if (e.button > 0 || touches.size > 1) return;
      try { vp.setPointerCapture(e.pointerId); } catch (er) { /* synthetic */ }
      if (st.tool === 'pan') { pinch = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, one: true }; return; }
      e.preventDefault(); vp.focus({ preventScroll: true }); settle = null;
      cur = { tool: st.tool, size: st.size, color: st.color, ink: st.ink, pressure: false, pts: [], pr: [], id: e.pointerId };
      addPoints(e);
    }
    function move(e) {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pinch.one) { pan.x = pinch.px + e.clientX - pinch.x; pan.y = pinch.py + e.clientY - pinch.y; clampPan(); applyTransform(); return; }
      if (pinch && touches.size === 2) return doPan();
      if (!cur || e.pointerId !== cur.id) return;
      e.preventDefault(); addPoints(e);
    }
    function up(e) {
      touches.delete(e.pointerId); if (pinch && (pinch.one || touches.size < 2)) { pinch = null; return; }
      if (!cur || e.pointerId !== cur.id) return;
      const s = cur; cur = null; pred = []; cancelAnimationFrame(raf); raf = 0; lx.clearRect(0, 0, live.width, live.height);
      if (!s.pts.length) return;
      if (s.tool === 'eraser') { const keep = eraseHits(s.pts); if (keep.length !== strokes.length) { commit(keep); repaint(); } return; }
      delete s.id; delete s.pr;
      s.pts = s.pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(p[2] * 100) / 100, Math.round(p[3])]);
      drawTo(bx, s); commit(strokes.concat([s])); settleFx(s);
    }
    function cancelStroke() { if (!cur) return; cur = null; pred = []; lx.clearRect(0, 0, live.width, live.height); }
    function startPinch() { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: zoom, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, px: pan.x, py: pan.y }; }
    function doPan() {
      const [a, b] = [...touches.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
      const nz = Math.max(1, Math.min(3, pinch.z * d / Math.max(20, pinch.d))), r = vp.getBoundingClientRect(), ox = pinch.cx - r.left, oy = pinch.cy - r.top, k = nz / pinch.z;
      pan.x = ox - (ox - pinch.px) * k + (cx - pinch.cx); pan.y = oy - (oy - pinch.py) * k + (cy - pinch.cy);
      if (nz !== zoom) { zoom = nz; layoutSoon(); } else { clampPan(); applyTransform(); }
    }
    let lt = 0; function layoutSoon() { clampPan(); applyTransform(); clearTimeout(lt); lt = setTimeout(layout, 120); }
    function setZoom(z, at) {
      z = Math.max(1, Math.min(3, Math.round(z * 100) / 100)); if (z === zoom) return;
      const r = vp.getBoundingClientRect(), ox = at && at.clientX != null ? at.clientX - r.left : r.width / 2, oy = at && at.clientY != null ? at.clientY - r.top : r.height / 2, k = z / zoom;
      pan.x = ox - (ox - pan.x) * k; pan.y = oy - (oy - pan.y) * k; zoom = z; layoutSoon(); changed();
    }
    vp.addEventListener('pointerdown', down); vp.addEventListener('pointermove', move); vp.addEventListener('pointerup', up);
    vp.addEventListener('pointercancel', e => { touches.delete(e.pointerId); pinch = null; cancelStroke(); });
    vp.addEventListener('lostpointercapture', e => { if (cur && e.pointerId === cur.id) up(e); });
    vp.addEventListener('contextmenu', e => e.preventDefault());
    // keyboard: Ctrl/⌘+Z undo, Ctrl/⌘+Shift+Z or Ctrl+Y redo (when the page, not a text field, has focus)
    const onKey = e => { if (dead || !(e.ctrlKey || e.metaKey) || e.target.closest('input, textarea, select, [contenteditable]')) return; const k = e.key.toLowerCase(); if (k === 'z' && !e.shiftKey) { e.preventDefault(); api.undo(); } else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); api.redo(); } };
    document.addEventListener('keydown', onKey);
    vp.addEventListener('wheel', e => { if (!e.ctrlKey && zoom === 1) return; e.preventDefault(); if (e.ctrlKey) setZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e); else { pan.x -= e.deltaX; pan.y -= e.deltaY; clampPan(); applyTransform(); } }, { passive: false });
    const ro = new ResizeObserver(() => layout()); ro.observe(vp);

    function bounds(list) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of list) for (const p of s.pts) { const r = s.size * 1.5; x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); }
      return x0 === Infinity ? null : { x0: Math.max(0, x0), y0: Math.max(0, y0), x1: Math.min(W, x1), y1: Math.min(H, y1) };
    }
    // clean: precision black ink on white, cropped to the writing (what the recogniser reads); asWritten: chosen inks
    function exportImage(o) {
      o = o || {}; const b = o.full ? { x0: 0, y0: 0, x1: W, y1: H } : bounds(strokes); if (!b) return null;
      const pad = o.full ? 0 : 24, k = o.scale || 1, x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad), w = Math.min(W, b.x1 + pad) - x0, h = Math.min(H, b.y1 + pad) - y0;
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
      for (const s of strokes) INK().draw(cx, o.asWritten ? s : INK().clean(s), { clean: !o.asWritten, cache: false });
      return c;
    }

    const api = {
      W, H, timing,
      get strokes() { return strokes; },
      set(k, v) {
        if (k in st) st[k] = v;
        if (k === 'paper') sheet.dataset.paper = v;
        if (k === 'guide') sheet.classList.toggle('has-guide', !!v);
        if (k === 'trace') { trace.textContent = v || ''; sheet.classList.toggle('has-trace', !!v); }
        if (k === 'dir') trace.dir = v;
        host.dataset.tool = st.tool; changed();
      },
      get(k) { return k === 'zoom' ? zoom : st[k]; },
      undo() { if (!undoS.length) return; redoS.push(strokes); strokes = undoS.pop(); repaint(); changed(); },
      redo() { if (!redoS.length) return; undoS.push(strokes); strokes = redoS.pop(); repaint(); changed(); },
      clear() { if (!strokes.length) return; commit([]); repaint(); },
      canUndo: () => undoS.length > 0, canRedo: () => redoS.length > 0,
      isEmpty: () => !strokes.length, inkCount: () => strokes.length,
      zoomIn() { setZoom(zoom * 1.25); }, zoomOut() { setZoom(zoom / 1.25); }, zoomReset() { zoom = 1; pan = { x: 0, y: 0 }; layout(); changed(); },
      exportImage, bounds: () => bounds(strokes), layout, viewport: vp, repaint,
      // restyle every stroke with one ink (the stroke skeletons are unchanged)
      restyle(ink) { strokes = strokes.map(s => Object.assign({}, s, { ink })); repaint(); changed(); },
      serialize: () => ({ v: 1, W, H, strokes: strokes.map(s => ({ pts: s.pts, size: s.size, color: s.color, ink: s.ink, pressure: s.pressure })) }),
      load(data) { if (!data || !Array.isArray(data.strokes)) return false; const kx = W / (data.W || W), ky = H / (data.H || H); strokes = data.strokes.map(s => Object.assign({}, s, { pts: s.pts.map(p => [p[0] * kx, p[1] * ky, p[2], p[3]]) })); undoS = []; redoS = []; repaint(); changed(); return true; },
      wipe() { strokes = []; undoS = []; redoS = []; cur = null; pred = []; bx.clearRect(0, 0, base.width, base.height); lx.clearRect(0, 0, live.width, live.height); changed(); },
      fullscreen() { const el = host.closest('.hx-surfacewrap') || host; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); },
      destroy() { if (dead) return; dead = true; ro.disconnect(); document.removeEventListener('keydown', onKey); api.wipe(); base.width = base.height = live.width = live.height = 0; host.innerHTML = ''; }
    };
    api.set('guide', opts.guide); if (opts.trace) api.set('trace', opts.trace); host.dataset.tool = st.tool;
    requestAnimationFrame(layout);
    return api;
  }

  window.ERLY = window.ERLY || {};
  window.ERLY.handSurface = { create };
})();
