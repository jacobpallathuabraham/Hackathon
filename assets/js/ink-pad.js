/* ERLY — InkPad: the Handwriting Check writing surface.
   Pointer Events (mouse, touch, stylus) with coalesced points, pressure when the device reports it
   (otherwise a speed-based width), smoothed quadratic strokes, pen / eraser, undo / redo / clear,
   High-DPI rendering, and strokes kept as vectors so resizing the window never loses work.
   Ink colours are semantic ("auto", "blue", …) and resolved against the current theme on every render,
   so the same writing stays readable in light and dark mode. export() renders dark ink on white for
   text recognition, whatever the theme. Nothing is stored or sent anywhere. */
(function () {
  'use strict';
  const INKS = {
    auto: { light: '#14161c', dark: '#eef3ff' },
    blue: { light: '#1d3fb8', dark: '#8fb4ff' },
    teal: { light: '#0f766e', dark: '#5eead4' },
    crimson: { light: '#b4233c', dark: '#fda4af' }
  };
  const theme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  class InkPad {
    constructor(host, opts = {}) {
      this.host = host; this.opts = opts;
      this.strokes = []; this.redo = []; this.tool = 'pen'; this.ink = 'auto'; this.size = opts.size || 4;
      this.cv = document.createElement('canvas'); this.cv.className = 'inkpad__canvas';
      this.cv.setAttribute('role', 'img'); this.cv.setAttribute('aria-label', opts.label || 'Writing area');
      host.appendChild(this.cv);
      this.g = this.cv.getContext('2d');
      this.cur = null; this.lastPen = 0;
      this.onDown = this.onDown.bind(this); this.onMove = this.onMove.bind(this); this.onUp = this.onUp.bind(this);
      this.cv.addEventListener('pointerdown', this.onDown);
      this.cv.addEventListener('pointermove', this.onMove);
      this.cv.addEventListener('pointerup', this.onUp); this.cv.addEventListener('pointercancel', this.onUp); this.cv.addEventListener('lostpointercapture', this.onUp);
      // no scrolling, zooming or long-press menu while writing
      this.cv.style.touchAction = 'none';
      this.cv.addEventListener('contextmenu', e => e.preventDefault());
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
      this.mo = new MutationObserver(() => this.render()); this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      this.resize();
    }
    // strokes are stored in "width units" (x / width, y / width) so the writing scales with the pad
    resize() {
      const r = this.host.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
      if (!r.width) return;
      this.w = r.width; this.h = r.height; this.dpr = dpr;
      this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
      this.cv.style.width = r.width + 'px'; this.cv.style.height = r.height + 'px';
      this.render();
    }
    pt(e) { const r = this.cv.getBoundingClientRect(); return [(e.clientX - r.left) / this.w, (e.clientY - r.top) / this.w, e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : -1, e.timeStamp]; }
    onDown(e) {
      if (e.button > 0) return;
      if (e.pointerType === 'pen') this.lastPen = e.timeStamp;
      else if (e.pointerType === 'touch' && e.timeStamp - this.lastPen < 1500) return; // palm resting while using a stylus
      e.preventDefault();
      try { this.cv.setPointerCapture(e.pointerId); } catch (er) { /* not capturable */ }
      this.cur = { id: e.pointerId, tool: this.tool, ink: this.ink, size: this.size, pts: [this.pt(e)] };
      this.redo = [];
      this.render();
    }
    onMove(e) {
      if (!this.cur || e.pointerId !== this.cur.id) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const c of (evs.length ? evs : [e])) this.cur.pts.push(this.pt(c));
      this.render();
    }
    onUp(e) {
      if (!this.cur || (e && e.pointerId !== this.cur.id)) return;
      if (this.cur.pts.length === 1) { const p = this.cur.pts[0]; this.cur.pts.push([p[0] + 0.0005, p[1] + 0.0005, p[2], p[3] + 1]); } // a dot
      this.strokes.push(this.cur); this.cur = null;
      this.render(); this.opts.onChange && this.opts.onChange(this);
    }
    setTool(t) { this.tool = t === 'eraser' ? 'eraser' : 'pen'; }
    setInk(k) { if (INKS[k]) this.ink = k; }
    setSize(n) { this.size = Math.max(1, Math.min(16, +n || 4)); }
    undo() { if (this.strokes.length) { this.redo.push(this.strokes.pop()); this.render(); this.opts.onChange && this.opts.onChange(this); } }
    redoOne() { if (this.redo.length) { this.strokes.push(this.redo.pop()); this.render(); this.opts.onChange && this.opts.onChange(this); } }
    clear() { if (!this.strokes.length) return; this.redo = this.strokes.slice().reverse(); this.strokes = []; this.render(); this.opts.onChange && this.opts.onChange(this); }
    isEmpty() { return !this.strokes.some(s => s.tool === 'pen'); }
    canUndo() { return this.strokes.length > 0; }
    canRedo() { return this.redo.length > 0; }

    // draw one stroke onto context g, scale k (px per width unit), colour resolver col()
    static paint(g, s, k, col, sizeScale = 1) {
      const pts = s.pts; if (pts.length < 2) return;
      g.save();
      g.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
      g.strokeStyle = s.tool === 'eraser' ? '#000' : col(s.ink); g.lineCap = 'round'; g.lineJoin = 'round';
      const base = s.size * sizeScale * (s.tool === 'eraser' ? 4 : 1);
      // variable width: stylus pressure if reported, otherwise slightly thinner when moving fast (like a nib)
      let prevW = base;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], c = pts[i + 1] || b;
        let w = base;
        if (b[2] >= 0) w = base * (0.35 + b[2] * 1.15);
        else if (s.tool === 'pen') { const dt = Math.max(1, b[3] - a[3]), v = Math.hypot(b[0] - a[0], b[1] - a[1]) * k / dt; w = base * Math.max(0.55, Math.min(1.15, 1.15 - v * 0.18)); }
        w = prevW * 0.6 + w * 0.4; prevW = w;
        g.lineWidth = Math.max(0.6, w);
        const m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m2 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
        g.beginPath();
        if (i === 1) g.moveTo(a[0] * k, a[1] * k); else g.moveTo(m1[0] * k, m1[1] * k);
        g.quadraticCurveTo(b[0] * k, b[1] * k, m2[0] * k, m2[1] * k);
        g.stroke();
      }
      g.restore();
    }
    render() {
      const g = this.g; if (!g || !this.w) return;
      const t = theme(), col = k => (INKS[k] || INKS.auto)[t];
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.cv.width, this.cv.height);
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // strokes go onto a layer so the eraser removes ink, not the page behind it
      for (const s of this.strokes) InkPad.paint(g, s, this.w, col);
      if (this.cur) InkPad.paint(g, this.cur, this.w, col);
    }
    // dark ink on white, trimmed to the writing, for text recognition (theme-independent)
    export(scale = 2) {
      const pen = this.strokes.filter(s => s.tool === 'pen'); if (!pen.length) return null;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of pen) for (const p of s.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      const W = this.w * scale, pad = 0.04;
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = x1 + pad; y1 = y1 + pad;
      const c = document.createElement('canvas'); c.width = Math.max(8, Math.round((x1 - x0) * W)); c.height = Math.max(8, Math.round((y1 - y0) * W));
      const g = c.getContext('2d');
      const ink = document.createElement('canvas'); ink.width = c.width; ink.height = c.height; const ig = ink.getContext('2d');
      ig.translate(-x0 * W, -y0 * W);
      for (const s of this.strokes) InkPad.paint(ig, s, W, () => '#111', scale);
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(ink, 0, 0);
      return c;
    }
    destroy() { this.ro.disconnect(); this.mo.disconnect(); this.cv.remove(); }
  }
  window.ERLY = window.ERLY || {};
  ERLY.InkPad = InkPad;
  ERLY.InkPad.INKS = INKS;
})();
