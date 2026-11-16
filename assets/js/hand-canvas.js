/* ERLY — Handwriting Studio canvas engine (v20).
   Two stacked canvases: a COMMITTED layer that only ever receives finished strokes (drawn once, incrementally), and
   a LIVE layer that shows the stroke in progress plus the browser's predicted points. The committed layer is only
   repainted in full after undo, redo, clear, a resize or a zoom change — never while writing — which is what keeps
   drawing smooth on long pages.
   Input: Pointer Events with coalesced points (full-rate pen input) and predicted points (lower perceived latency),
   pressure from pens that report it, gentle speed-based thinning for mouse and finger, quadratic smoothing through
   segment midpoints, device-pixel-ratio aware backing stores. A pen in use stops touches from drawing (palm
   rejection); two fingers always pan and pinch-zoom.
   Paper (plain, ruled, grid, dotted) and the writing guide are drawn with CSS behind the ink, so they are never
   part of the exported image that the recogniser reads.
   Nothing is stored. Strokes live in this object's memory until clear() or destroy(). */
(function () {
  'use strict';
  const MAX_BACK = 4096;                        // largest backing-store side, in device pixels

  function create(host, opts) {
    // the page, in page units: landscape on wide screens, a portrait page with comfortable line spacing on phones
    const narrow = host.getBoundingClientRect().width < 640 || matchMedia('(max-width: 640px)').matches;
    const W = narrow ? 800 : 1600, H = narrow ? 1040 : 1000;
    opts = Object.assign({ size: 4, color: '#1c1b19', tool: 'pen', paper: 'ruled', guide: false, onChange: null }, opts || {});
    host.classList.add('hsc');
    host.innerHTML = `<div class="hsc__vp" tabindex="0" role="img" aria-roledescription="writing surface">
        <div class="hsc__sheet" data-paper="${opts.paper}"><div class="hsc__guide" aria-hidden="true"></div><canvas class="hsc__base" aria-hidden="true"></canvas><canvas class="hsc__live" aria-hidden="true"></canvas></div>
      </div>`;
    const vp = host.querySelector('.hsc__vp'), sheet = host.querySelector('.hsc__sheet'), base = host.querySelector('.hsc__base'), live = host.querySelector('.hsc__live');
    const bx = base.getContext('2d'), lx = live.getContext('2d');
    let strokes = [], undoS = [], redoS = [], cur = null, pred = [], raf = 0, penSeen = false, fit = 1, zoom = 1, pan = { x: 0, y: 0 }, scale = 1, dead = false;
    const touches = new Map(); let pinch = null;
    const st = { tool: opts.tool, size: opts.size, color: opts.color };

    /* ---------- geometry ---------- */
    function layout() {
      const r = vp.getBoundingClientRect(); if (!r.width) return;
      fit = r.width / W;
      vp.style.height = Math.round(H * fit) + 'px';
      const dpr = Math.min(3, window.devicePixelRatio || 1), want = fit * zoom * dpr;
      scale = Math.min(want, MAX_BACK / W);
      for (const c of [base, live]) { c.width = Math.round(W * scale); c.height = Math.round(H * scale); }
      sheet.style.width = W + 'px'; sheet.style.height = H + 'px';
      clampPan(); applyTransform(); repaint();
    }
    function clampPan() {
      const vw = W * fit, vh = H * fit, sw = W * fit * zoom, sh = H * fit * zoom;
      pan.x = Math.min(0, Math.max(vw - sw, pan.x)); pan.y = Math.min(0, Math.max(vh - sh, pan.y));
    }
    function applyTransform() { sheet.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${fit * zoom})`; sheet.style.setProperty('--z', fit * zoom); }
    function toPage(e) { const r = base.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }

    /* ---------- drawing ---------- */
    // width at a point: pens use their pressure; mouse and finger thin slightly with speed, like a real nib
    function widthAt(s, i) {
      const p = s.pts[i], k = s.tool === 'eraser' ? 1 : s.pressure ? 0.35 + 0.95 * p[2] : Math.max(0.62, 1 - Math.min(1, (p[3] || 0) / 2.2) * 0.38);
      return s.size * (s.tool === 'eraser' ? 4 : 1) * k;
    }
    function strokePath(ctx, s, from, extra) {
      const pts = extra && extra.length ? s.pts.concat(extra) : s.pts, n = pts.length;
      ctx.save(); ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = s.tool === 'eraser' ? '#000' : s.color; ctx.fillStyle = ctx.strokeStyle;
      if (n === 1) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], widthAt(s, 0) / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
      for (let i = Math.max(1, from); i < n; i++) {
        const a = pts[i - 1], b = pts[i], c = pts[i + 1];
        const m0 = i === 1 ? a : [(pts[i - 2][0] + a[0]) / 2, (pts[i - 2][1] + a[1]) / 2], m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        ctx.lineWidth = widthAt({ pts, tool: s.tool, size: s.size, pressure: s.pressure }, i - 1);
        ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(a[0], a[1], m1[0], m1[1]);
        if (!c) ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.restore();
    }
    function repaint() { bx.clearRect(0, 0, base.width, base.height); for (const s of strokes) strokePath(bx, s, 1); lx.clearRect(0, 0, live.width, live.height); }
    function frame() {
      raf = 0; if (!cur) return;
      if (cur.tool === 'eraser') { strokePath(bx, cur, Math.max(1, cur.drawn - 1)); cur.drawn = cur.pts.length; return; }
      lx.clearRect(0, 0, live.width, live.height); strokePath(lx, cur, 1, pred);
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(frame); };

    /* ---------- history ---------- */
    function commit(next) { undoS.push(strokes); if (undoS.length > 200) undoS.shift(); strokes = next; redoS = []; changed(); }
    function changed() { opts.onChange && opts.onChange(api); }

    /* ---------- pointer input ---------- */
    function addPoints(e) {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; const list = evs.length ? evs : [e];
      for (const ev of list) {
        const [x, y] = toPage(ev), last = cur.pts[cur.pts.length - 1];
        if (last && Math.hypot(x - last[0], y - last[1]) < 0.35) continue;
        const dt = last ? Math.max(1, ev.timeStamp - last[4]) : 16, v = last ? Math.hypot(x - last[0], y - last[1]) / dt : 0;
        cur.pts.push([x, y, ev.pressure || 0.5, last ? last[3] * 0.6 + v * 0.4 : 0, ev.timeStamp]);
      }
      pred = (e.getPredictedEvents ? e.getPredictedEvents() : []).slice(0, 2).map(ev => { const [x, y] = toPage(ev); return [x, y, ev.pressure || 0.5, 0, 0]; });
      schedule();
    }
    function down(e) {
      if (e.pointerType === 'pen') penSeen = true;
      if (e.pointerType === 'touch') { touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2) { cancelStroke(); startPinch(); return; } if (penSeen) return; }
      if (e.button > 0 || touches.size > 1) return;
      vp.setPointerCapture(e.pointerId);
      if (st.tool === 'pan') { cur = null; pinch = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, one: true }; return; }
      e.preventDefault(); vp.focus({ preventScroll: true });
      cur = { tool: st.tool, size: st.size, color: st.color, pressure: e.pointerType === 'pen' && e.pressure > 0 && e.pressure !== 0.5, pts: [], id: e.pointerId, drawn: 0 };
      addPoints(e);
    }
    function move(e) {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pinch.one) return;
      if (pinch && touches.size === 2) return doPan();
      if (!cur || e.pointerId !== cur.id) return;
      e.preventDefault(); addPoints(e);
    }
    function up(e) {
      touches.delete(e.pointerId); if (pinch && (pinch.one || touches.size < 2)) { pinch = null; return; }
      if (!cur || e.pointerId !== cur.id) return;
      const s = cur; cur = null; pred = []; cancelAnimationFrame(raf); raf = 0;
      if (!s.pts.length) return;
      if (s.tool !== 'eraser') strokePath(bx, s, 1); else strokePath(bx, s, Math.max(1, s.drawn - 1));
      lx.clearRect(0, 0, live.width, live.height);
      delete s.drawn; delete s.id; s.pts = s.pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(p[2] * 100) / 100, Math.round(p[3] * 100) / 100]);
      commit(strokes.concat([s]));
    }
    function cancelStroke() { if (!cur) return; cur = null; pred = []; lx.clearRect(0, 0, live.width, live.height); repaint(); }
    function startPinch() { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: zoom, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, px: pan.x, py: pan.y }; }
    function doPan() {
      const [a, b] = [...touches.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
      const nz = Math.max(1, Math.min(3, pinch.z * d / Math.max(20, pinch.d)));
      const r = vp.getBoundingClientRect(), ox = pinch.cx - r.left, oy = pinch.cy - r.top, k = nz / pinch.z;
      pan.x = ox - (ox - pinch.px) * k + (cx - pinch.cx); pan.y = oy - (oy - pinch.py) * k + (cy - pinch.cy);
      if (nz !== zoom) { zoom = nz; layoutSoon(); } else { clampPan(); applyTransform(); }
    }
    let lt = 0; function layoutSoon() { clampPan(); applyTransform(); clearTimeout(lt); lt = setTimeout(layout, 120); }
    // a one-finger / mouse drag with the Move tool
    vp.addEventListener('pointermove', e => { if (pinch && pinch.one) { pan.x = pinch.px + e.clientX - pinch.x; pan.y = pinch.py + e.clientY - pinch.y; clampPan(); applyTransform(); } });

    vp.addEventListener('pointerdown', down);
    vp.addEventListener('pointermove', move);
    vp.addEventListener('pointerup', up);
    vp.addEventListener('pointercancel', e => { touches.delete(e.pointerId); pinch = null; cancelStroke(); });
    vp.addEventListener('lostpointercapture', e => { if (cur && e.pointerId === cur.id) up(e); });
    vp.addEventListener('contextmenu', e => e.preventDefault());
    vp.addEventListener('wheel', e => { if (!e.ctrlKey && zoom === 1) return; e.preventDefault(); if (e.ctrlKey) setZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e); else { pan.x -= e.deltaX; pan.y -= e.deltaY; clampPan(); applyTransform(); } }, { passive: false });
    const ro = new ResizeObserver(() => layout()); ro.observe(vp);

    function setZoom(z, at) {
      z = Math.max(1, Math.min(3, Math.round(z * 100) / 100)); if (z === zoom) return;
      const r = vp.getBoundingClientRect(), ox = at && at.clientX != null ? at.clientX - r.left : r.width / 2, oy = at && at.clientY != null ? at.clientY - r.top : r.height / 2, k = z / zoom;
      pan.x = ox - (ox - pan.x) * k; pan.y = oy - (oy - pan.y) * k; zoom = z; layoutSoon(); changed();
    }

    /* ---------- export: black ink on white, cropped to the writing — what the recogniser reads ---------- */
    function bounds(list) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of list) if (s.tool !== 'eraser') for (const p of s.pts) { const r = s.size; x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); }
      return x0 === Infinity ? null : { x0: Math.max(0, x0), y0: Math.max(0, y0), x1: Math.min(W, x1), y1: Math.min(H, y1) };
    }
    function exportImage(o) {
      o = o || {}; const b = bounds(strokes); if (!b) return null;
      const pad = 24, k = o.scale || 1, x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad), w = Math.min(W, b.x1 + pad) - x0, h = Math.min(H, b.y1 + pad) - y0;
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      const ink = document.createElement('canvas'); ink.width = c.width; ink.height = c.height;
      const ix = ink.getContext('2d'), keep = scale;
      scale = k; // strokePath sets its own transform from `scale`, so each stroke is drawn as an offset copy
      for (const s of strokes) strokePath(ix, Object.assign({}, s, { pts: s.pts.map(p => [p[0] - x0, p[1] - y0, p[2], p[3]]), color: o.keepColour ? s.color : '#111' }), 1);
      scale = keep;
      const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(ink, 0, 0);
      ink.width = ink.height = 0;
      return c;
    }

    const api = {
      W, H,
      get strokes() { return strokes; },
      set(k, v) { if (k in st) st[k] = v; if (k === 'paper') sheet.dataset.paper = v; if (k === 'guide') sheet.classList.toggle('has-guide', !!v); host.dataset.tool = st.tool; changed(); },
      get(k) { return k === 'zoom' ? zoom : st[k]; },
      undo() { if (!undoS.length) return; redoS.push(strokes); strokes = undoS.pop(); repaint(); changed(); },
      redo() { if (!redoS.length) return; undoS.push(strokes); strokes = redoS.pop(); repaint(); changed(); },
      clear() { if (!strokes.length) return; commit([]); repaint(); },
      canUndo: () => undoS.length > 0, canRedo: () => redoS.length > 0,
      isEmpty: () => !strokes.some(s => s.tool !== 'eraser'),
      inkCount: () => strokes.filter(s => s.tool !== 'eraser').length,
      zoomIn() { setZoom(zoom * 1.25); }, zoomOut() { setZoom(zoom / 1.25); }, zoomReset() { zoom = 1; pan = { x: 0, y: 0 }; layout(); changed(); },
      exportImage, bounds: () => bounds(strokes), layout, viewport: vp,
      // forget everything: strokes, history, the pixels in both layers
      wipe() { strokes = []; undoS = []; redoS = []; cur = null; pred = []; bx.clearRect(0, 0, base.width, base.height); lx.clearRect(0, 0, live.width, live.height); changed(); },
      destroy() { if (dead) return; dead = true; ro.disconnect(); api.wipe(); base.width = base.height = live.width = live.height = 0; host.innerHTML = ''; }
    };
    api.set('guide', opts.guide); host.dataset.tool = st.tool;
    requestAnimationFrame(layout);
    return api;
  }

  window.ERLY = window.ERLY || {};
  window.ERLY.handCanvas = { create };
})();
