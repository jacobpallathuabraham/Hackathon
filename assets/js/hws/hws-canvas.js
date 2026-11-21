/* ERLY Handwriting Studio (v24) — the canvas: viewport, input, tools and rendering.

   Latency: the stroke in progress is drawn on its own "live" canvas (desynchronized where the browser allows), from
   every coalesced pointer sample, and the browser's predicted samples are drawn a little ahead of the pen so the ink
   keeps up with fast movement; predictions are never saved. Committed ink is drawn once into the base canvas, layer by
   layer (so the pixel eraser only removes ink from its own layer). Pinch or two fingers pan and zoom; once a stylus has
   been used, resting a palm (touch) never draws. */
(function () {
  'use strict';
  const H = window.HWS, T = H.T;

  H.renderPage = (g, page, scale, o = {}) => {
    g.save(); g.scale(scale, scale); if (!o.noPaper) H.drawPaper(g, page); g.restore();
    const lay = document.createElement('canvas'); lay.width = g.canvas.width; lay.height = g.canvas.height; const lg = lay.getContext('2d');
    page.layers.forEach(L => { if (!L.visible) return; lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, lay.width, lay.height); lg.setTransform(scale, 0, 0, scale, o.ox || 0, o.oy || 0); L.items.forEach(it => H.render(lg, it, page, { dark: H.paperDark(page.paper), redraw: o.redraw })); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(lay, 0, 0); g.restore(); });
  };

  H.Canvas = function (host, api) {
    const vp = document.createElement('div'); vp.className = 'hws-vp'; vp.tabIndex = 0; vp.setAttribute('role', 'application'); vp.setAttribute('aria-label', T('Writing canvas. Draw with a mouse, finger or stylus. Press ? for shortcuts.', 'لوحة الكتابة'));
    vp.innerHTML = '<canvas class="hws-base"></canvas><canvas class="hws-live"></canvas><div class="hws-over"></div>'; host.appendChild(vp);
    const base = vp.querySelector('.hws-base'), live = vp.querySelector('.hws-live'), over = vp.querySelector('.hws-over');
    const bg = base.getContext('2d'), lg = live.getContext('2d', { desynchronized: true }) || live.getContext('2d');
    let dpr = 1, VW = 0, VH = 0, zoom = 1, px = 0, py = 0, needBase = true, needLive = true, raf = 0;
    let cur = null, pred = [], sel = [], drag = null, penSeen = false, touches = new Map(), pinch = null, hoverPt = null, spaceDown = false;
    const page = () => api.page(), tool = () => api.tool();
    const W2S = (x, y) => [x * zoom + px, y * zoom + py], S2W = (x, y) => [(x - px) / zoom, (y - py) / zoom];
    const evPt = e => { const r = vp.getBoundingClientRect(); return S2W(e.clientX - r.left, e.clientY - r.top); };

    function size() { const r = vp.getBoundingClientRect(); dpr = Math.min(2.5, devicePixelRatio || 1); const ow = VW, oh = VH; VW = Math.max(50, r.width); VH = Math.max(50, r.height); [base, live].forEach(c => { c.width = Math.round(VW * dpr); c.height = Math.round(VH * dpr); c.style.width = VW + 'px'; c.style.height = VH + 'px'; });
      if (ow && oh) { px += (VW - ow) / 2; py += (VH - oh) / 2; } needBase = needLive = true; tick(); }
    const ro = new ResizeObserver(size); ro.observe(vp);
    function fit() { const p = page(); zoom = Math.min((VW - 48) / p.w, (VH - 48) / p.h); px = (VW - p.w * zoom) / 2; py = (VH - p.h * zoom) / 2; changed(); }
    function actual() { const p = page(), [cx, cy] = S2W(VW / 2, VH / 2); zoom = 1; px = VW / 2 - cx; py = VH / 2 - cy; clampView(); changed(); }
    function zoomAt(f, sx = VW / 2, sy = VH / 2) { const [wx, wy] = S2W(sx, sy); zoom = H.clamp(zoom * f, 0.15, 8); px = sx - wx * zoom; py = sy - wy * zoom; clampView(); changed(); }
    function clampView() { const p = page(), m = 80; px = H.clamp(px, Math.min(m, VW - p.w * zoom - m), Math.max(m, VW - m)); py = H.clamp(py, Math.min(m, VH - p.h * zoom - m), Math.max(m, VH - m)); }
    function changed() { needBase = needLive = true; tick(); api.onView && api.onView(zoom); }
    function tick() { if (!raf) raf = requestAnimationFrame(frame); }
    function frame() { raf = 0; if (needBase) drawBase(); if (needLive) drawLive(); }

    function drawBase() { needBase = false; const p = page(); bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, base.width, base.height);
      const s = zoom * dpr, ox = px * dpr, oy = py * dpr;
      bg.save(); bg.shadowColor = 'rgba(0,0,0,.18)'; bg.shadowBlur = 24 * dpr; bg.shadowOffsetY = 6 * dpr; bg.fillStyle = H.paperBg(p.paper); bg.fillRect(ox, oy, p.w * s, p.h * s); bg.restore();
      bg.save(); bg.translate(ox, oy); bg.scale(s, s); bg.beginPath(); bg.rect(0, 0, p.w, p.h); bg.clip(); H.drawPaper(bg, p); bg.restore();
      // layers
      if (!drawBase.lay) drawBase.lay = document.createElement('canvas'); const lay = drawBase.lay; if (lay.width !== base.width || lay.height !== base.height) { lay.width = base.width; lay.height = base.height; } const g = lay.getContext('2d');
      const hidden = new Set(drag && drag.mode === 'move' || drag && drag.mode === 'scale' || drag && drag.mode === 'rotate' ? sel : []);
      p.layers.forEach(L => { if (!L.visible) return; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, lay.width, lay.height); g.setTransform(s, 0, 0, s, ox, oy); g.save(); g.beginPath(); g.rect(0, 0, p.w, p.h); g.clip(); L.items.forEach(it => { if (!hidden.has(it.id)) H.render(g, it, p, { dark: H.paperDark(p.paper), redraw: () => { needBase = true; tick(); } }); }); g.restore(); bg.drawImage(lay, 0, 0); });
    }
    function drawLive() { needLive = false; const p = page(); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, live.width, live.height); const s = zoom * dpr; lg.setTransform(s, 0, 0, s, px * dpr, py * dpr);
      if (cur) { const show = pred.length ? Object.assign({}, cur, { pts: cur.pts.concat(pred) }) : cur; if (cur.t === 'erase') { lg.strokeStyle = 'rgba(200,60,60,.35)'; lg.lineWidth = cur.size; lg.lineCap = 'round'; lg.lineJoin = 'round'; lg.beginPath(); show.pts.forEach((q, i) => i ? lg.lineTo(q[0], q[1]) : lg.moveTo(q[0], q[1])); lg.stroke(); } else H.render(lg, show, p, { dark: H.paperDark(p.paper) }); }
      if (drag && drag.preview) H.render(lg, drag.preview, p, {});
      if (drag && drag.mode === 'marquee') { lg.setLineDash([6 / zoom, 5 / zoom]); lg.strokeStyle = '#3446d4'; lg.lineWidth = 1.2 / zoom; lg.fillStyle = 'rgba(52,70,212,.07)'; const [a, b] = drag.box; lg.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); lg.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); lg.setLineDash([]); }
      if (drag && drag.mode === 'lasso') { lg.setLineDash([6 / zoom, 5 / zoom]); lg.strokeStyle = '#3446d4'; lg.lineWidth = 1.4 / zoom; lg.beginPath(); drag.path.forEach((q, i) => i ? lg.lineTo(q[0], q[1]) : lg.moveTo(q[0], q[1])); lg.closePath(); lg.stroke(); lg.setLineDash([]); }
      if (drag && drag.ghost) drag.ghost.forEach(it => H.render(lg, it, p, {}));
      if (sel.length) { const bb = selBox(); if (bb) { lg.strokeStyle = '#3446d4'; lg.lineWidth = 1.5 / zoom; lg.setLineDash([5 / zoom, 4 / zoom]); lg.strokeRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); lg.setLineDash([]); handles(bb).forEach(([x, y, k]) => { lg.fillStyle = k === 'rot' ? '#3446d4' : '#fff'; lg.strokeStyle = '#3446d4'; lg.beginPath(); lg.arc(x, y, 6 / zoom, 0, 7); lg.fill(); lg.stroke(); }); } }
      if (hoverPt && (tool().id === 'eraser' || tool().id === 'erasePix')) { lg.strokeStyle = 'rgba(0,0,0,.5)'; lg.lineWidth = 1 / zoom; lg.beginPath(); lg.arc(hoverPt[0], hoverPt[1], (tool().id === 'eraser' ? 8 / zoom : tool().size * 3) , 0, 7); lg.stroke(); }
      if (api.overlay) api.overlay(lg, zoom);
    }

    /* ---------- selection helpers ---------- */
    const items = () => H.layer(page()).items; // tools act on the active layer
    const byId = id => items().find(i => i.id === id);
    function selBox() { const bs = sel.map(byId).filter(Boolean).map(it => H.bbox(it, page())); if (!bs.length) return null; return [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))]; }
    function handles(b) { const pad = 0; return [[b[0], b[1], 'nw'], [b[2], b[1], 'ne'], [b[0], b[3], 'sw'], [b[2], b[3], 'se'], [(b[0] + b[2]) / 2, b[1] - 28 / zoom, 'rot']]; }
    function setSel(ids) { sel = ids; needLive = true; tick(); api.onSelect && api.onSelect(sel.map(byId).filter(Boolean)); }
    function commit(mut) { H.checkpoint(page()); mut(); needBase = needLive = true; tick(); api.onChange && api.onChange(); }

    /* ---------- pointer input ---------- */
    function sample(e, P) { const r = vp.getBoundingClientRect(); const [x, y] = S2W(e.clientX - r.left, e.clientY - r.top); let pr = e.pressure; if (e.pointerType === 'pen' && pr > 0 && pr !== 0.5) cur.pr = true; if (!(pr > 0)) pr = 0.5; return [x, y, pr, e.timeStamp || performance.now()]; }
    function addPts(e) { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; (evs.length ? evs : [e]).forEach(ev => { const q = sample(ev); const st = tool().stab || 0; if (st > 0 && cur.pts.length) { const l = cur.pts[cur.pts.length - 1], k = 1 - st * 0.85; q[0] = l[0] + (q[0] - l[0]) * k; q[1] = l[1] + (q[1] - l[1]) * k; } const l = cur.pts[cur.pts.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.25 / zoom) cur.pts.push(q); });
      pred = e.getPredictedEvents && !(tool().stab > 0) ? e.getPredictedEvents().slice(0, 2).map(ev => sample(ev)) : []; needLive = true; tick(); }
    const cap = id => { try { vp.setPointerCapture(id); } catch (err) { /* synthetic or finished pointer */ } };
    vp.addEventListener('pointerdown', e => {
      vp.focus({ preventScroll: true });
      if (e.pointerType === 'pen') penSeen = true;
      if (e.pointerType === 'touch') { touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2) { cancelCur(); const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: zoom, px, py, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2 }; return; } if (penSeen) { drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, px, py }; cap(e.pointerId); return; } }
      const t = tool(); if (e.button === 1 || spaceDown || t.id === 'hand') { drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, px, py }; cap(e.pointerId); vp.classList.add('is-panning'); return; }
      if (e.button > 0) return;
      if (H.layer(page()).locked && t.id !== 'pick') { api.toast && api.toast(T('This layer is locked. Unlock it in Layers, or choose another layer.', 'هذه الطبقة مقفلة. افتحها من الطبقات أو اختر طبقة أخرى.')); return; }
      cap(e.pointerId); e.preventDefault();
      const [x, y] = evPt(e), p = page();
      if (t.id === 'pen' || t.id === 'erasePix') { cur = t.id === 'pen' ? { t: 'stroke', id: H.uid('s'), brush: t.brush, color: t.color, size: t.size, opacity: t.opacity, opt: t.opt, pr: false, pts: [] } : { t: 'erase', id: H.uid('e'), size: t.size * 6, pts: [] }; addPts(e); api.onInk && api.onInk(); return; }
      if (t.id === 'eraser') { drag = { mode: 'erase', any: false, last: [x, y] }; eraseAt(x, y); return; }
      if (t.id === 'shape') { if (t.shape === 'poly') return polyClick(x, y, e.detail); if (drag && drag.mode === 'curve2') { finishCurve(); return; } drag = { mode: 'shape', a: [x, y], preview: null }; return; }
      if (t.id === 'select') { const bb = sel.length && selBox(); if (bb) { const h = handles(bb).find(([hx, hy]) => Math.hypot(hx - x, hy - y) < 10 / zoom); if (h) { drag = { mode: h[2] === 'rot' ? 'rotate' : 'scale', a: [x, y], bb, h: h[2], orig: sel.map(byId) }; needBase = true; tick(); return; } }
        const hit = items().slice().reverse().find(it => H.hit(it, x, y, 6 / zoom, p)); if (hit) { if (!sel.includes(hit.id)) setSel(e.shiftKey ? sel.concat(hit.id) : [hit.id]); drag = { mode: 'move', a: [x, y], orig: sel.map(byId) }; needBase = true; tick(); return; }
        setSel([]); drag = { mode: 'marquee', box: [[x, y], [x, y]] }; return; }
      if (t.id === 'lasso') { setSel([]); drag = { mode: 'lasso', path: [[x, y]] }; return; }
      if (t.id === 'text') { textAt(x, y); return; }
      if (t.id === 'fill') { floodFill(x, y); return; }
      if (t.id === 'pick') { pickColour(e); return; }
      if (t.id === 'stamp') { const it = { t: 'stamp', id: H.uid('k'), k: t.stamp, x, y, s: 1, rot: 0, color: t.color, w: 2.5, props: t.stampProps ? Object.assign({}, t.stampProps) : {} }; commit(() => items().push(it)); setSel([it.id]); api.onStamp && api.onStamp(it); return; }
      if (t.id === 'point') { const F = H.frame(p), sx = F.ox + Math.round((x - F.ox) / F.u * 2) / 2 * F.u, sy = F.oy + Math.round((y - F.oy) / F.u * 2) / 2 * F.u; const it = { t: 'measure', k: 'point', id: H.uid('m'), pts: [[sx, sy]], color: t.color, label: t.label || '' }; commit(() => items().push(it)); return; }
      if (t.id === 'angle') { drag = drag && drag.mode === 'angle' ? drag : { mode: 'angle', pts: [] }; drag.pts.push([x, y]); if (drag.pts.length === 3) { const it = { t: 'measure', k: 'angle', id: H.uid('m'), pts: drag.pts, color: t.color }; drag = null; commit(() => items().push(it)); } else { drag.preview = null; needLive = true; tick(); } return; }
      if (t.id === 'ruler') { drag = { mode: 'ruler', a: [x, y] }; return; }
    });
    vp.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' && touches.has(e.pointerId)) { touches.set(e.pointerId, [e.clientX, e.clientY]); if (pinch && touches.size === 2) { const [a, b] = [...touches.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, r = vp.getBoundingClientRect(); const f = d / pinch.d; const wx = (pinch.cx - r.left - pinch.px) / pinch.z, wy = (pinch.cy - r.top - pinch.py) / pinch.z; zoom = H.clamp(pinch.z * f, 0.15, 8); px = cx - r.left - wx * zoom; py = cy - r.top - wy * zoom; changed(); return; } }
      const [x, y] = evPt(e); hoverPt = [x, y];
      if (cur) { addPts(e); return; }
      if (!drag) { if (tool().id === 'eraser' || tool().id === 'erasePix') { needLive = true; tick(); } return; }
      const p = page(), t = tool();
      if (drag.mode === 'pan') { px = drag.px + e.clientX - drag.sx; py = drag.py + e.clientY - drag.sy; changed(); return; }
      if (drag.mode === 'erase') { const [lx, ly] = drag.last, n = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / (4 / zoom))); for (let k = 1; k <= n; k++) eraseAt(lx + (x - lx) * k / n, ly + (y - ly) * k / n); drag.last = [x, y]; return; }
      if (drag.mode === 'shape') { let b = [x, y]; const a = drag.a; if (e.shiftKey) { if (/line|arrow/.test(t.shape)) { const ang = Math.round(Math.atan2(y - a[1], x - a[0]) / (Math.PI / 4)) * Math.PI / 4, L = Math.hypot(x - a[0], y - a[1]); b = [a[0] + Math.cos(ang) * L, a[1] + Math.sin(ang) * L]; } else { const s = Math.max(Math.abs(x - a[0]), Math.abs(y - a[1])); b = [a[0] + Math.sign(x - a[0]) * s, a[1] + Math.sign(y - a[1]) * s]; } }
        drag.preview = shapeItem(t, [a, b]); needLive = true; tick(); return; }
      if (drag.mode === 'curve2') { drag.preview = Object.assign({}, drag.preview, { pts: [drag.preview.pts[0], drag.preview.pts[1], [x, y]] }); needLive = true; tick(); return; }
      if (drag.mode === 'ruler') { drag.preview = { t: 'measure', k: 'ruler', id: 'tmp', pts: [drag.a, [x, y]], color: t.color }; needLive = true; tick(); return; }
      if (drag.mode === 'angle') { drag.preview = drag.pts.length === 2 ? { t: 'measure', k: 'angle', id: 'tmp', pts: [drag.pts[0], drag.pts[1], [x, y]], color: t.color } : { t: 'shape', k: 'line', id: 'tmp', pts: [drag.pts[0], [x, y]], color: t.color, w: 2 }; needLive = true; tick(); return; }
      if (drag.mode === 'marquee') { drag.box[1] = [x, y]; needLive = true; tick(); return; }
      if (drag.mode === 'lasso') { drag.path.push([x, y]); needLive = true; tick(); return; }
      if (drag.mode === 'move') { const dx = x - drag.a[0], dy = y - drag.a[1]; drag.ghost = drag.orig.map(it => H.transform(it, (a, b) => [a + dx, b + dy])); needLive = true; tick(); return; }
      if (drag.mode === 'scale') { const b = drag.bb, ax = drag.h.includes('w') ? b[2] : b[0], ay = drag.h.includes('n') ? b[3] : b[1], s0 = Math.hypot(drag.a[0] - ax, drag.a[1] - ay), s1 = Math.hypot(x - ax, y - ay), k = H.clamp(s1 / (s0 || 1), 0.05, 20); drag.k = k; drag.ghost = drag.orig.map(it => H.transform(it, (a, c) => [ax + (a - ax) * k, ay + (c - ay) * k], k)); needLive = true; tick(); return; }
      if (drag.mode === 'rotate') { const b = drag.bb, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; let ang = Math.atan2(y - cy, x - cx) - Math.atan2(drag.a[1] - cy, drag.a[0] - cx); if (e.shiftKey) ang = Math.round(ang / (Math.PI / 12)) * Math.PI / 12; const c = Math.cos(ang), s = Math.sin(ang); drag.ghost = drag.orig.map(it => H.transform(it, (a, d) => [cx + (a - cx) * c - (d - cy) * s, cy + (a - cx) * s + (d - cy) * c], 1, ang)); needLive = true; tick(); }
    });
    const up = e => {
      if (e.pointerType === 'touch') { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; }
      vp.classList.remove('is-panning'); pred = [];
      if (cur) { const c = cur; cur = null; if (c.pts.length) commit(() => items().push(c)); else { needLive = true; tick(); } return; }
      if (!drag) return; const d = drag, p = page(), t = tool();
      if (d.mode === 'pan') { drag = null; return; }
      if (d.mode === 'erase') { drag = null; if (d.any) { needBase = true; tick(); api.onChange && api.onChange(); } return; }
      if (d.mode === 'shape') { if (!d.preview) { drag = null; return; } const it = Object.assign({}, d.preview, { id: H.uid('h') }); if (t.shape === 'curve') { drag = { mode: 'curve2', preview: Object.assign(it, { pts: [it.pts[0], it.pts[1], [(it.pts[0][0] + it.pts[1][0]) / 2, (it.pts[0][1] + it.pts[1][1]) / 2 - 60]] }) }; needLive = true; tick(); return; } drag = null; if (Math.hypot(it.pts[1][0] - it.pts[0][0], it.pts[1][1] - it.pts[0][1]) < 3) { needLive = true; tick(); return; } commit(() => items().push(it)); return; }
      if (d.mode === 'ruler') { drag = null; if (d.preview) commit(() => items().push(Object.assign({}, d.preview, { id: H.uid('m') }))); return; }
      if (d.mode === 'marquee') { const [a, b] = d.box, x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]); drag = null; setSel(items().filter(it => { const bb = H.bbox(it, p); return it.t !== 'fn' && bb[0] >= x0 && bb[2] <= x1 && bb[1] >= y0 && bb[3] <= y1; }).map(i => i.id)); return; }
      if (d.mode === 'lasso') { drag = null; const poly = d.path, inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
        setSel(items().filter(it => { if (it.pts) { const n = it.pts.filter(q => inside(q[0], q[1])).length; return n / it.pts.length > 0.6; } const bb = H.bbox(it, p); return it.t !== 'fn' && inside((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2); }).map(i => i.id)); return; }
      if ((d.mode === 'move' || d.mode === 'scale' || d.mode === 'rotate') && d.ghost) { const g = d.ghost; drag = null; commit(() => { const L = H.layer(p); L.items = L.items.map(it => g.find(n => n.id === it.id) || it); }); setSel(g.map(i => i.id)); return; }
      drag = d.mode === 'angle' || d.mode === 'curve2' || d.mode === 'poly' ? d : null; needBase = needLive = true; tick();
    };
    vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', e => { if (cur) { cur = null; pred = []; needLive = true; tick(); } up(e); });
    vp.addEventListener('pointerleave', () => { hoverPt = null; needLive = true; tick(); });
    vp.addEventListener('wheel', e => { e.preventDefault(); const r = vp.getBoundingClientRect(); if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top); else { px -= e.deltaX; py -= e.deltaY; clampView(); changed(); } }, { passive: false });
    vp.addEventListener('contextmenu', e => e.preventDefault());
    function cancelCur() { cur = null; pred = []; needLive = true; tick(); }

    function shapeItem(t, [a, b]) { return { t: 'shape', id: 'tmp', k: t.shape, pts: [a, b], color: t.color, w: Math.max(1.5, t.size * 0.9), fill: t.fill ? t.fillColor || t.color : null, fillA: 0.22, dash: !!t.dash, label: (t.shape === 'arrow' || t.shape === 'darrow') ? t.label || '' : '' }; }
    function polyClick(x, y, clicks) { const t = tool(); if (!drag || drag.mode !== 'poly') drag = { mode: 'poly', pts: [] }; const st = drag.pts[0]; if (drag.pts.length > 2 && (clicks >= 2 || Math.hypot(x - st[0], y - st[1]) < 12 / zoom)) { const it = { t: 'shape', id: H.uid('h'), k: 'poly', pts: drag.pts.slice(), closed: Math.hypot(x - st[0], y - st[1]) < 12 / zoom || clicks >= 2, color: t.color, w: Math.max(1.5, t.size * 0.9), fill: t.fill ? t.fillColor || t.color : null, fillA: 0.22, dash: !!t.dash }; drag = null; commit(() => items().push(it)); return; } drag.pts.push([x, y]); drag.preview = { t: 'shape', id: 'tmp', k: 'poly', pts: drag.pts.slice(), color: t.color, w: Math.max(1.5, t.size * 0.9) }; needLive = true; tick(); }
    function finishCurve() { const it = Object.assign({}, drag.preview, { id: H.uid('h') }); drag = null; commit(() => items().push(it)); }
    function eraseAt(x, y) { const p = page(), L = H.layer(p), tol = 8 / zoom; const keep = L.items.filter(it => !(it.t !== 'fn' && H.hit(it, x, y, tol, p))); if (keep.length !== L.items.length) { if (!drag.any) { L.items = L.items.slice(); H.checkpoint(p); } L.items = keep; drag.any = true; needBase = true; tick(); } }
    function textAt(x, y, existing) {
      const t = tool(), [sx, sy] = W2S(x, y); over.innerHTML = ''; const ta = document.createElement('textarea'); ta.className = 'hws-text'; ta.value = existing ? existing.text : ''; ta.setAttribute('aria-label', T('Type your text. Ctrl+Enter to place it, Escape to cancel.', 'اكتب نصك'));
      const size = existing ? existing.size : Math.max(14, t.size * 7); Object.assign(ta.style, { left: sx + 'px', top: sy + 'px', font: `500 ${size * zoom}px ${t.font === 'serif' ? 'Georgia, serif' : t.font === 'hand' ? '"Segoe Print","Comic Sans MS",cursive' : t.font === 'mono' ? 'ui-monospace,monospace' : 'ui-sans-serif,system-ui,sans-serif'}`, color: existing ? existing.color : t.color });
      over.appendChild(ta); ta.focus(); requestAnimationFrame(() => { if (document.activeElement !== ta) ta.focus(); }); let done = false;
      const fin = ok => { if (done) return; done = true; const v = ta.value; over.innerHTML = ''; vp.focus({ preventScroll: true }); if (!ok || !v.trim()) return; const it = existing ? Object.assign({}, existing, { text: v }) : { t: 'text', id: H.uid('t'), x, y, text: v, size, font: t.font || 'sans', color: t.color };
        commit(() => { const L = H.layer(page()); if (existing) L.items = L.items.map(i => (i.id === existing.id ? it : i)); else L.items.push(it); }); };
      ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') fin(false); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) fin(true); }); ta.addEventListener('blur', () => fin(true));
    }
    vp.addEventListener('dblclick', e => { if (tool().id !== 'select') return; const [x, y] = evPt(e), hit = items().slice().reverse().find(it => it.t === 'text' && H.hit(it, x, y, 4, page())); if (hit) textAt(hit.x, hit.y, hit); });
    function pickColour(e) { const r = vp.getBoundingClientRect(), x = Math.round((e.clientX - r.left) * dpr), y = Math.round((e.clientY - r.top) * dpr), d = bg.getImageData(x, y, 1, 1).data; api.onPick && api.onPick('#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('')); }
    function floodFill(x, y) {
      const p = page(), sc = 1, W = Math.ceil(p.w * sc), Hh = Math.ceil(p.h * sc), c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
      p.layers.forEach(L => L.visible && L.items.forEach(it => { if (it.t !== 'fn') H.render(g, it, p, {}); }));
      const d = g.getImageData(0, 0, W, Hh).data, sx = Math.floor(x * sc), sy = Math.floor(y * sc); if (sx < 0 || sy < 0 || sx >= W || sy >= Hh || d[(sy * W + sx) * 4 + 3] > 90) { api.toast && api.toast(T('Click inside an empty area enclosed by ink.', 'انقر داخل منطقة مغلقة.')); return; }
      const mask = new Uint8Array(W * Hh), stack = [sx + sy * W]; let n = 0, leak = false, x0 = sx, x1 = sx, y0 = sy, y1 = sy;
      while (stack.length) { const i = stack.pop(); if (mask[i]) continue; const a = d[i * 4 + 3]; if (a > 90) continue; mask[i] = 1; n++; const xx = i % W, yy = (i / W) | 0; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; if (xx === 0 || yy === 0 || xx === W - 1 || yy === Hh - 1) leak = true; if (xx > 0) stack.push(i - 1); if (xx < W - 1) stack.push(i + 1); if (yy > 0) stack.push(i - W); if (yy < Hh - 1) stack.push(i + W); }
      const out = document.createElement('canvas'); out.width = x1 - x0 + 3; out.height = y1 - y0 + 3; const og = out.getContext('2d'), od = og.createImageData(out.width, out.height), hex = tool().color.replace('#', ''), num = parseInt(hex, 16);
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const i = yy * W + xx; if (!mask[i]) continue; // grow by 1 px under the ink edge so no gap shows
        for (let oy = 0; oy <= 2; oy++) for (let ox = 0; ox <= 2; ox++) { const k = ((yy - y0 + oy) * out.width + (xx - x0 + ox)) * 4; od.data[k] = num >> 16 & 255; od.data[k + 1] = num >> 8 & 255; od.data[k + 2] = num & 255; od.data[k + 3] = Math.round(255 * (tool().opacity || 1)); } }
      og.putImageData(od, 0, 0);
      const it = { t: 'image', id: H.uid('f'), x: (x0 - 1) / sc, y: (y0 - 1) / sc, w: out.width / sc, h: out.height / sc, src: out.toDataURL('image/png'), fill: true };
      const L = H.layer(p); commit(() => L.items.unshift(it)); if (leak) api.toast && api.toast(T('That area was not closed, so the fill reached the page edge. Undo if that was not intended.', 'المنطقة غير مغلقة؛ يمكنك التراجع.'));
    }

    /* ---------- keyboard ---------- */
    vp.addEventListener('keydown', e => {
      if (e.target !== vp) return; const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (k === ' ') { spaceDown = true; vp.classList.add('is-hand'); e.preventDefault(); return; }
      if ((k === 'delete' || k === 'backspace') && sel.length) { e.preventDefault(); deleteSel(); return; }
      if (mod && k === 'd' && sel.length) { e.preventDefault(); dupSel(); return; }
      if (k === 'escape') { if (drag && drag.mode === 'poly' && drag.pts.length > 2) { polyClick(drag.pts[0][0], drag.pts[0][1], 2); } drag = null; setSel([]); needLive = true; tick(); return; }
      if (k === 'enter' && drag && drag.mode === 'poly' && drag.pts.length > 1) { const t = tool(); const it = { t: 'shape', id: H.uid('h'), k: 'poly', pts: drag.pts.slice(), closed: false, color: t.color, w: Math.max(1.5, t.size * 0.9) }; drag = null; commit(() => items().push(it)); return; }
      if (sel.length && /^arrow/.test(k)) { e.preventDefault(); const st = e.shiftKey ? 10 : 1, dx = k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, dy = k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0; commit(() => { const L = H.layer(page()); L.items = L.items.map(it => (sel.includes(it.id) ? H.transform(it, (a, b) => [a + dx, b + dy]) : it)); }); return; }
      if (api.onKey && api.onKey(e)) e.preventDefault();
    });
    vp.addEventListener('keyup', e => { if (e.key === ' ') { spaceDown = false; vp.classList.remove('is-hand'); } });

    function deleteSel() { const ids = sel.slice(); commit(() => { const L = H.layer(page()); L.items = L.items.filter(i => !ids.includes(i.id)); }); setSel([]); }
    function dupSel() { const copies = sel.map(byId).filter(Boolean).map(it => { const n = H.transform(it, (a, b) => [a + 24, b + 24]); n.id = H.uid('d'); return n; }); commit(() => H.layer(page()).items.push(...copies)); setSel(copies.map(i => i.id)); }
    function order(dir) { commit(() => { const L = H.layer(page()), pick = L.items.filter(i => sel.includes(i.id)), rest = L.items.filter(i => !sel.includes(i.id)); L.items = dir > 0 ? rest.concat(pick) : pick.concat(rest); }); }
    size(); setTimeout(fit, 0);
    return { el: vp, fit, actual, zoomAt, zoom: () => zoom, render() { needBase = needLive = true; tick(); }, setSel, sel: () => sel.map(byId).filter(Boolean), deleteSel, dupSel, order, cancel() { drag = null; cur = null; needLive = true; tick(); },
      updateSel(fn) { const ids = sel.slice(); commit(() => { const L = H.layer(page()); L.items = L.items.map(i => (ids.includes(i.id) ? fn(i) : i)); }); setSel(ids); },
      destroy() { ro.disconnect(); cancelAnimationFrame(raf); vp.remove(); }, _state: () => ({ zoom, px, py, VW, VH }) };
  };
})();
