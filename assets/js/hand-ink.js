/* ERLY — Signature Ink Engine (v22).
   Every stroke is rendered as a filled OUTLINE (a polygon whose half-width varies along the stroke) instead of a
   chain of fixed-width line segments. That is what gives smooth variable width, tapered ends and clean joins.

   Four ink personalities — genuinely different width models, not colour presets:
     classic   — a fountain-pen nib held at 40°: the line is broad when it moves across the nib and thin when it
                 moves along it (calligraphic contrast). Real pen pressure, if the device reports it, adds a little.
     precision — a technical pen: uniform width, crisp round ends. The clean choice, and what OCR export uses.
     soft      — a felt tip: near-uniform width with a faint soft edge (a second, wider, very light pass).
     signature — expressive: real pressure if the pen reports it; otherwise width follows SPEED (fast → thinner),
                 smoothed, with long tapered entry and exit strokes.
   No fake pressure: a mouse or finger reports a constant 0.5 (or 0) — that is detected and ignored, and only the
   personality's own speed/direction rules apply.

   Pure geometry (resample, widths, outline) is exported for Node tests; drawing needs a 2D context. Zero added
   latency: drawing a stroke is one path fill, done in the same frame as the input event that produced it. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.ERLY = root.ERLY || {}; root.ERLY.ink22 = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const NIB = 40 * Math.PI / 180;
  const PERSONALITIES = {
    classic: { label: ['Classic fountain', 'قلم حبر كلاسيكي'], desc: ['Broad and thin strokes from a nib held at an angle.', 'خطوط عريضة ورفيعة من سن مائل.'], taper: 0.6 },
    precision: { label: ['Precision', 'دقيق'], desc: ['Even width and crisp ends — the clearest for reading back.', 'عرض ثابت ونهايات حادة.'], taper: 0.15 },
    soft: { label: ['Soft', 'ناعم'], desc: ['A felt tip with a gentle edge.', 'رأس لبّادي بحافة ناعمة.'], taper: 0.3 },
    signature: { label: ['Signature', 'توقيع'], desc: ['Expressive: thinner when fast, tapered ends; uses real pen pressure if your pen has it.', 'معبّر: أرفع عند السرعة.'], taper: 1 }
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => t * t * (3 - 2 * t);

  /* points: [x, y, pressure, t]. Returns evenly spaced points (spacing ~step) along a Catmull-Rom spline through them,
     each with interpolated pressure, speed (units/ms) and direction. */
  function resample(pts, step) {
    if (!pts.length) return [];
    if (pts.length === 1) return [{ x: pts[0][0], y: pts[0][1], p: pts[0][2], v: 0, a: 0, d: 0 }];
    const P = i => pts[Math.max(0, Math.min(pts.length - 1, i))], out = [];
    let dist = 0, carry = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(1, Math.ceil(seg / (step * 0.5)));
      const dt = Math.max(1, (p2[3] || 0) - (p1[3] || 0)), v = seg / dt;
      let px = p1[0], py = p1[1];
      for (let k = (i ? 1 : 0); k <= n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        const d = Math.hypot(x - px, y - py); dist += d; carry += d; px = x; py = y;
        if (!out.length || carry >= step || (i === pts.length - 2 && k === n)) { carry = 0; out.push({ x, y, p: p1[2] + (p2[2] - p1[2]) * t, v, a: 0, d: dist }); }
      }
    }
    for (let i = 0; i < out.length; i++) { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)]; out[i].a = Math.atan2(b.y - a.y, b.x - a.x); }
    // smooth speed so width does not flicker
    let ev = out[0].v; out.forEach(q => { ev = ev * 0.75 + q.v * 0.25; q.v = ev; });
    return out;
  }

  // the half-width at each resampled point, for one personality
  function widths(R, o) {
    const s = o.size || 3, kind = o.kind || 'precision', real = !!o.pressure, total = R.length ? R[R.length - 1].d : 0;
    const taperLen = Math.min(total * 0.35, s * (2 + 8 * PERSONALITIES[kind].taper));
    return R.map((q, i) => {
      let w;
      const pr = real ? clamp(q.p, 0.05, 1) : null;
      if (kind === 'precision') w = s * (pr != null ? 0.9 + 0.2 * pr : 1);
      else if (kind === 'classic') { const nib = 0.2 + 1.15 * Math.abs(Math.sin(q.a - NIB)); w = s * 1.15 * nib * (pr != null ? 0.8 + 0.4 * pr : 1); }
      else if (kind === 'soft') w = s * (pr != null ? 0.85 + 0.3 * pr : 1.05 - clamp(q.v, 0, 2) * 0.06);
      else w = s * (pr != null ? 0.25 + 1.25 * pr : clamp(1.4 - q.v * 0.55, 0.45, 1.4));
      // tapered entry and exit (precision keeps nearly full width — just a clean round end)
      if (taperLen > 0 && total > 0) { const e = Math.min(q.d, total - q.d) / taperLen; if (e < 1) w *= (1 - PERSONALITIES[kind].taper * 0.7) + PERSONALITIES[kind].taper * 0.7 * smooth(clamp(e, 0, 1)); }
      return Math.max(0.35, w / 2);
    });
  }

  // a closed polygon (array of [x, y]) around the stroke, with round caps
  function outline(R, hw) {
    if (!R.length) return [];
    if (R.length === 1) { const r = hw[0], c = []; for (let k = 0; k < 12; k++) { const a = k / 12 * 2 * Math.PI; c.push([R[0].x + Math.cos(a) * r, R[0].y + Math.sin(a) * r]); } return c; }
    const L = [], Rt = [];
    for (let i = 0; i < R.length; i++) { const n = R[i].a + Math.PI / 2, w = hw[i]; L.push([R[i].x + Math.cos(n) * w, R[i].y + Math.sin(n) * w]); Rt.push([R[i].x - Math.cos(n) * w, R[i].y - Math.sin(n) * w]); }
    // a half circle from one side to the other: round the FRONT at the end, round the BACK at the start
    const cap = (q, w, from) => { const pts = []; for (let k = 1; k < 8; k++) { const a = from - k / 8 * Math.PI; pts.push([q.x + Math.cos(a) * w, q.y + Math.sin(a) * w]); } return pts; };
    const last = R.length - 1;
    return L.concat(cap(R[last], hw[last], R[last].a + Math.PI / 2), Rt.reverse(), cap(R[0], hw[0], R[0].a - Math.PI / 2));
  }

  function geometry(stroke) {
    const step = Math.max(0.6, (stroke.size || 3) * 0.3);
    const R = resample(stroke.pts, step), hw = widths(R, { size: stroke.size, kind: stroke.ink || 'precision', pressure: stroke.pressure });
    return { R, hw, poly: outline(R, hw) };
  }

  // draw one stroke into a 2D context (already transformed to page units)
  function draw(ctx, stroke, o) {
    o = o || {};
    const g = stroke._g && stroke._g.n === stroke.pts.length && !o.fresh ? stroke._g : Object.assign(geometry(stroke), { n: stroke.pts.length });
    if (o.cache !== false) Object.defineProperty(stroke, '_g', { value: g, writable: true, configurable: true, enumerable: false });
    const col = o.color || stroke.color || '#1c1b19', poly = g.poly;
    if (!poly.length) return;
    const fill = (p, alpha) => { ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); ctx.fill('nonzero'); };
    ctx.save(); ctx.fillStyle = col;
    if ((stroke.ink === 'soft') && !o.clean) { const wide = outline(g.R, g.hw.map(w => w + Math.max(0.6, (stroke.size || 3) * 0.18))); fill(wide, 0.16); }
    fill(poly, o.alpha == null ? (stroke.ink === 'soft' && !o.clean ? 0.92 : 1) : o.alpha);
    ctx.restore();
  }

  // a stroke as the clean version used for OCR and plain export: precision ink, black, the same skeleton
  const clean = s => ({ pts: s.pts, size: Math.max(2.2, s.size), ink: 'precision', pressure: false, color: '#111' });

  // pressure that is real: pens report a range; mice/touch report a constant 0.5 or 0
  function realPressure(samples) { if (!samples.length) return false; const vals = samples.filter(v => v > 0 && v !== 0.5); return vals.length >= Math.max(2, samples.length * 0.3); }

  return { PERSONALITIES, resample, widths, outline, geometry, draw, clean, realPressure };
});
