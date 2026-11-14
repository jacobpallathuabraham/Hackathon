/* ERLY — Handwriting Check v2: image quality + preparation for text recognition (pure, no DOM).

   What this module does — all in the student's browser, nothing is uploaded:
   1. QUALITY: measures the photo itself — sharpness (variance of the Laplacian),
      lighting (mean brightness, clipped shadows/highlights), contrast between ink
      and paper (Otsu separation), rotation (projection-profile skew search, plus
      90° detection), cropping (ink touching the edges), writing size (median
      height of ink components) and whether there is enough writing at all.
      If any essential check fails, the image is NOT analysed: the student gets a
      plain explanation and is asked to retake it.
   2. PREPARATION: deskews, binarises, trims to the writing and scales it to a
      size the recognition engine (Tesseract, run locally in the page) reads best.
   3. COMPARISON: character and word error rates between what was recognised and
      the sentences the student was asked to copy — reported as how well the
      SOFTWARE recognised the page, never as a judgement of the writer.

   What it deliberately does NOT do: it does not measure or score handwriting
   features, spelling, neatness or speed, and it never infers a learning
   difficulty or any condition. Recognition errors come from the software as
   much as the writing.
   window.ERLY_HAND in the browser, CommonJS for the unit tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_HAND = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const B = (en, ar) => [en, ar];

  /* ---------- prompts the student copies (short, everyday, both languages) ---------- */
  const PROMPTS = {
    en: [
      ['The library opens early on Monday.', 'Bring a pen and some paper.', 'We meet near the main gate.'],
      ['Rain fell softly over the quiet city.', 'She wrote three notes before lunch.', 'The train leaves at half past nine.'],
      ['Good ideas grow with patience.', 'Please return the book by Friday.', 'The garden smells of fresh mint.']
    ],
    ar: [
      ['تفتح المكتبة مبكرا يوم الاثنين.', 'أحضر قلما وبعض الورق.', 'نلتقي قرب البوابة الرئيسية.'],
      ['هطل المطر بهدوء على المدينة.', 'كتبت ثلاث ملاحظات قبل الغداء.', 'يغادر القطار في التاسعة والنصف.']
    ],
    // mixed pages (experimental): English and Arabic lines on one page, read with both models together
    mix: [
      ['The library opens early on Monday.', 'تفتح المكتبة مبكرا يوم الاثنين.', 'Bring a pen and some paper.'],
      ['Rain fell softly over the quiet city.', 'كتبت ثلاث ملاحظات قبل الغداء.', 'The train leaves at half past nine.']
    ]
  };

  /* ---------- image basics ---------- */
  function toGray(rgba, W, H) { const g = new Uint8Array(W * H); for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (rgba[j] * 0.299 + rgba[j + 1] * 0.587 + rgba[j + 2] * 0.114) | 0; return g; }
  function otsu(gray) {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
    const total = gray.length; let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, best = 0, thr = 127;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break;
      sumB += t * hist[t]; const mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; thr = t; }
    }
    // separation: how far apart the dark (ink) and light (paper) classes are, 0..1
    let s0 = 0, n0 = 0, s1 = 0, n1 = 0; for (let t = 0; t < 256; t++) { if (t <= thr) { s0 += t * hist[t]; n0 += hist[t]; } else { s1 += t * hist[t]; n1 += hist[t]; } }
    return { thr, sep: n0 && n1 ? (s1 / n1 - s0 / n0) / 255 : 0, inkShare: n0 / total };
  }
  // downscale (box filter) so every check runs fast on phone-sized photos
  function shrink(gray, W, H, maxSide) {
    const k = Math.max(1, Math.ceil(Math.max(W, H) / maxSide)); if (k === 1) return { gray, W, H, k };
    const w = Math.floor(W / k), h = Math.floor(H / k), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) s += gray[(y * k + dy) * W + x * k + dx]; out[y * w + x] = s / (k * k); }
    return { gray: out, W: w, H: h, k };
  }
  function laplacianVar(gray, W, H) {
    let n = 0, s = 0, ss = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x, v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - W] - gray[i + W]; s += v; ss += v * v; n++; }
    return n ? ss / n - (s / n) * (s / n) : 0;
  }
  function components(ink, W, H, minArea) {
    const lab = new Int32Array(W * H), out = [], stack = new Int32Array(W * H); let id = 0;
    for (let p = 0; p < W * H; p++) {
      if (!ink[p] || lab[p]) continue; id++;
      let sp = 0; stack[sp++] = p; lab[p] = id; const c = { x0: W, y0: H, x1: 0, y1: 0, area: 0 };
      while (sp) { const q = stack[--sp], x = q % W, y = (q - x) / W; c.area++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; const r = yy * W + xx; if (ink[r] && !lab[r]) { lab[r] = id; stack[sp++] = r; } } } }
      if (c.area >= (minArea || 3)) out.push(c);
    }
    return out;
  }
  const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  // skew: the angle whose horizontal projection of ink is most "peaky" (text lines line up)
  function projectionScore(pts, ang) {
    const c = Math.cos(ang), s = Math.sin(ang), bins = new Map();
    for (let i = 0; i < pts.length; i += 2) { const y = Math.round(pts[i + 1] * c - pts[i] * s); bins.set(y, (bins.get(y) || 0) + 1); }
    let sc = 0; bins.forEach(v => { sc += v * v; }); return sc;
  }
  function skew(ink, W, H) {
    const pts = []; const step = Math.max(1, Math.round(Math.sqrt(W * H / 60000)));
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (ink[y * W + x]) pts.push(x, y);
    if (pts.length < 40) return { deg: 0, ninety: false };
    let best = -1, bestA = 0;
    for (let d = -20; d <= 20; d += 1) { const sc = projectionScore(pts, d * Math.PI / 180); if (sc > best) { best = sc; bestA = d; } }
    for (let d = bestA - 1; d <= bestA + 1; d += 0.25) { const sc = projectionScore(pts, d * Math.PI / 180); if (sc > best) { best = sc; bestA = d; } }
    const vert = projectionScore(pts.map((v, i) => (i % 2 ? pts[i - 1] : v)), 0); // columns instead of rows
    return { deg: bestA, ninety: vert > best * 1.25 };
  }

  /* ---------- 1. quality ---------- */
  // img: { gray, width, height } (0 = black). Returns { ok, checks, stats }.
  const MSG = {
    blur: B('The photo looks blurry. Hold the phone still, tap to focus on the writing, and try again.', 'تبدو الصورة ضبابية. ثبّت الهاتف واضغط للتركيز على الكتابة ثم حاول مجدداً.'),
    dark: B('The photo is too dark. Move to better light or turn on more lights.', 'الصورة مظلمة جداً. انتقل إلى ضوء أفضل.'),
    bright: B('The photo is too bright or washed out. Avoid direct glare on the page.', 'الصورة ساطعة جداً. تجنّب الوهج المباشر على الصفحة.'),
    contrast: B('The writing doesn’t stand out from the paper. A darker pen or better light will help.', 'الكتابة لا تبرز عن الورق. قلم أغمق أو ضوء أفضل سيساعد.'),
    rotated90: B('The page seems to be sideways. Rotate it so the lines run left to right (or use Rotate).', 'يبدو أن الصفحة مائلة جانبياً. استخدم زر التدوير.'),
    tilted: B('The page is quite tilted. We’ll straighten it automatically; for best results hold the phone square to the page.', 'الصفحة مائلة. سنعدّلها تلقائياً؛ للأفضل امسك الهاتف موازياً للصفحة.'),
    cropped: B('Some writing touches the edge of the photo, so parts may be cut off. Step back a little so all three lines fit.', 'بعض الكتابة تلامس حافة الصورة. ابتعد قليلاً لتظهر الأسطر الثلاثة كاملة.'),
    small: B('The writing is very small in the photo. Move closer, or crop to the writing.', 'الكتابة صغيرة جداً في الصورة. اقترب أو قصّ الصورة حول الكتابة.'),
    empty: B('We couldn’t find enough writing in this photo. Make sure the three sentences are in view.', 'لم نجد كتابة كافية في الصورة. تأكد من ظهور الجمل الثلاث.'),
    noisy: B('The background is busy (lines, patterns or shadows), so the writing is hard to separate. Plain paper and even light work best.', 'الخلفية مزدحمة، لذا يصعب فصل الكتابة. الورق السادة والإضاءة المتساوية أفضل.')
  };
  // v17: even out the paper's brightness (a shadow, a lamp on one side): divide by a smooth estimate of the
  // local paper colour, so the checks below judge the writing rather than the lighting
  function flatten(gray, W, H) {
    const G = 12, bw = W / G, bh = H / G, bg = new Float64Array(G * G);
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const v = []; for (let y = Math.floor(gy * bh); y < Math.floor((gy + 1) * bh); y += 2) for (let x = Math.floor(gx * bw); x < Math.floor((gx + 1) * bw); x += 2) v.push(gray[y * W + x]);
      v.sort((a, b) => a - b); bg[gy * G + gx] = Math.max(30, v.length ? v[Math.floor(v.length * 0.85)] : 255);
    }
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) { const fy = Math.min(G - 1.001, Math.max(0, y / bh - 0.5)), y0 = Math.floor(fy), ty = fy - y0;
      for (let x = 0; x < W; x++) { const fx = Math.min(G - 1.001, Math.max(0, x / bw - 0.5)), x0 = Math.floor(fx), tx = fx - x0;
        const b = bg[y0 * G + x0] * (1 - tx) * (1 - ty) + bg[y0 * G + x0 + 1] * tx * (1 - ty) + bg[(y0 + 1) * G + x0] * (1 - tx) * ty + bg[(y0 + 1) * G + x0 + 1] * tx * ty;
        out[y * W + x] = Math.min(255, Math.round(gray[y * W + x] / b * 240)); } }
    return out;
  }
  function quality(img) {
    const s = shrink(img.gray, img.width, img.height, 900), W = s.W, H = s.H, uneven = unevenLight(s.gray, W, H);
    const g = uneven > 0.2 ? flatten(s.gray, W, H) : s.gray;
    let mean = 0, lo = 0, hi = 0; for (let i = 0; i < g.length; i++) { mean += g[i]; if (g[i] < 25) lo++; if (g[i] > 248) hi++; } mean /= g.length;
    const o = otsu(g), ink = new Uint8Array(W * H); for (let i = 0; i < g.length; i++) ink[i] = g[i] <= o.thr ? 1 : 0;
    const comps = components(ink, W, H, 4);
    const minH = Math.max(2, H * 0.004), text = comps.filter(c => c.y1 - c.y0 + 1 >= minH && c.area < W * H * 0.05 && (c.x1 - c.x0) < W * 0.6);
    // writing size: a high percentile of component heights, so the many small dots and marks (especially in Arabic) don't hide the letter size
    const hs = text.map(c => c.y1 - c.y0 + 1).sort((x, y) => x - y), hMed = (hs.length ? hs[Math.floor(hs.length * 0.75)] : 0) * s.k; // in original pixels
    const lapl = laplacianVar(g, W, H);
    // sharpness relative to content: a crisp page has strong edges where there is ink
    const sharp = lapl / Math.max(1, o.inkShare * 1000 + 1);
    // cropping: letters cut by the photo's edge (touching it), or writing that starts right at the edge
    const edge = text.filter(c => c.x0 <= 2 || c.y0 <= 2 || c.x1 >= W - 3 || c.y1 >= H - 3).length;
    let bx0 = W, bx1 = 0, by0 = H, by1 = 0; text.forEach(c => { bx0 = Math.min(bx0, c.x0); bx1 = Math.max(bx1, c.x1); by0 = Math.min(by0, c.y0); by1 = Math.max(by1, c.y1); });
    const atEdge = text.length && (bx0 <= 3 || bx1 >= W - 4 || by0 <= 3 || by1 >= H - 4);
    const sk = skew(ink, W, H);
    const big = comps.filter(c => c.area > W * H * 0.05).length; // big dark blobs: shadows, table edges, ruled-paper grids
    const checks = [
      { id: 'light', ok: mean >= 70 && lo / g.length < 0.35, value: Math.round(mean), msg: MSG.dark, essential: true },
      { id: 'glare', ok: hi / g.length < 0.6 || o.sep > 0.25, value: +(hi / g.length).toFixed(2), msg: MSG.bright, essential: true },
      { id: 'contrast', ok: o.sep >= 0.18, value: +o.sep.toFixed(2), msg: MSG.contrast, essential: true },
      { id: 'sharp', ok: sharp >= 6, value: +sharp.toFixed(1), msg: MSG.blur, essential: true },
      { id: 'amount', ok: text.length >= 12, value: text.length, msg: MSG.empty, essential: true },
      { id: 'size', ok: hMed >= 14 || text.length < 12, value: Math.round(hMed), msg: MSG.small, essential: true },
      { id: 'rotation', ok: !sk.ninety, value: sk.ninety ? 90 : sk.deg, msg: MSG.rotated90, essential: true },
      { id: 'tilt', ok: Math.abs(sk.deg) <= 12, value: sk.deg, msg: MSG.tilted, essential: false },
      { id: 'cropped', ok: !(atEdge && edge >= 2), value: edge, msg: MSG.cropped, essential: true },
      { id: 'background', ok: big === 0 && o.inkShare < 0.35, value: +o.inkShare.toFixed(2), msg: MSG.noisy, essential: false }
    ];
    return { ok: checks.every(c => c.ok || !c.essential), checks, stats: { mean, sep: o.sep, sharp, comps: text.length, letterHeight: hMed, skew: sk.deg, sideways: sk.ninety, uneven } };
  }

  /* ---------- 2. preparation for recognition ---------- */
  // rotate (deg) + binarise + trim to the writing + scale so x-height is ~32 px (what Tesseract reads best)
  function prepare(img, deg, opts) {
    const { gray, width: W, height: H } = img, a = -(deg || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const o = otsu(gray);
    const nw = Math.ceil(Math.abs(W * c) + Math.abs(H * s)), nh = Math.ceil(Math.abs(W * s) + Math.abs(H * c));
    const rot = new Uint8Array(nw * nh).fill(255), cx = W / 2, cy = H / 2, ncx = nw / 2, ncy = nh / 2;
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { const dx = x - ncx, dy = y - ncy, sx = Math.round(dx * c + dy * s + cx), sy = Math.round(-dx * s + dy * c + cy); if (sx >= 0 && sy >= 0 && sx < W && sy < H) rot[y * nw + x] = gray[sy * W + sx] <= o.thr ? 0 : 255; }
    // trim to the ink with a margin
    let x0 = nw, y0 = nh, x1 = 0, y1 = 0; for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) if (!rot[y * nw + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0) return { gray: rot, width: nw, height: nh, scale: 1 };
    const m = 20; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(nw - 1, x1 + m); y1 = Math.min(nh - 1, y1 + m);
    const tw = x1 - x0 + 1, th = y1 - y0 + 1, out = new Uint8Array(tw * th);
    for (let y = 0; y < th; y++) out.set(rot.subarray((y0 + y) * nw + x0, (y0 + y) * nw + x0 + tw), y * tw);
    // v17: uneven lighting → adaptive (Sauvola) threshold of the trimmed page; small writing → upscaled so the
    // letters are ~40 px tall (Tesseract reads best between ~30 and 50 px); very large writing is scaled down
    let res = { gray: out, width: tw, height: th, adaptive: false, scale: 1 };
    const o2 = opts || {};
    if (o2.source && o2.uneven) {
      const src = new Uint8Array(tw * th);
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const dx = x0 + x - ncx, dy = y0 + y - ncy, sx = Math.round(dx * c + dy * s + cx), sy = Math.round(-dx * s + dy * c + cy); src[y * tw + x] = sx >= 0 && sy >= 0 && sx < W && sy < H ? gray[sy * W + sx] : 255; }
      res.gray = sauvola(src, tw, th); res.adaptive = true;
    }
    const lh = o2.letterHeight || 0;
    if (lh > 0) { const k = Math.max(0.5, Math.min(3, 40 / lh)); if (Math.abs(k - 1) > 0.15) { const sc = scale(res.gray, res.width, res.height, k); res = Object.assign(res, sc, { scale: k }); } }
    return res;
  }

  /* ---------- v17: adaptive threshold, upscaling, line segmentation, word flags ---------- */
  // Sauvola thresholding (integral images): each pixel is compared with its own neighbourhood, so a page
  // with a shadow across one corner still separates ink from paper. Returns 0 (ink) / 255 (paper).
  function sauvola(gray, W, H, win, k) {
    win = win || Math.max(15, Math.round(Math.min(W, H) / 24) | 1); k = k == null ? 0.2 : k;
    const I = new Float64Array((W + 1) * (H + 1)), I2 = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let r = 0, r2 = 0; for (let x = 0; x < W; x++) { const v = gray[y * W + x]; r += v; r2 += v * v; const i = (y + 1) * (W + 1) + x + 1; I[i] = I[i - W - 1] + r; I2[i] = I2[i - W - 1] + r2; } }
    const out = new Uint8Array(W * H), h = win >> 1;
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - h), y1 = Math.min(H, y + h + 1);
      for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - h), x1 = Math.min(W, x + h + 1), n = (x1 - x0) * (y1 - y0);
        const a = y1 * (W + 1) + x1, b = y0 * (W + 1) + x1, c = y1 * (W + 1) + x0, d = y0 * (W + 1) + x0;
        const m = (I[a] - I[b] - I[c] + I[d]) / n, v = Math.max(0, (I2[a] - I2[b] - I2[c] + I2[d]) / n - m * m);
        out[y * W + x] = gray[y * W + x] <= m * (1 + k * (Math.sqrt(v) / 128 - 1)) ? 0 : 255;
      }
    }
    return out;
  }
  // how uneven the paper's lighting is: spread of local background brightness across a coarse grid
  function unevenLight(gray, W, H) {
    const G = 6, vals = [];
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const hist = []; for (let y = Math.floor(gy * H / G); y < Math.floor((gy + 1) * H / G); y += 3) for (let x = Math.floor(gx * W / G); x < Math.floor((gx + 1) * W / G); x += 3) hist.push(gray[y * W + x]);
      if (hist.length) { hist.sort((a, b) => a - b); vals.push(hist[Math.floor(hist.length * 0.8)]); } // the paper, not the ink
    }
    return vals.length ? (Math.max(...vals) - Math.min(...vals)) / 255 : 0;
  }
  // bilinear scale of a 0..255 image
  function scale(gray, W, H, k) {
    const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k)), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) { const sy = Math.min(H - 1, (y + 0.5) / k - 0.5), y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(H - 1, y0 + 1), fy = Math.max(0, sy - y0);
      for (let x = 0; x < w; x++) { const sx = Math.min(W - 1, (x + 0.5) / k - 0.5), x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(W - 1, x0 + 1), fx = Math.max(0, sx - x0);
        const v = gray[y0 * W + x0] * (1 - fx) * (1 - fy) + gray[y0 * W + x1] * fx * (1 - fy) + gray[y1 * W + x0] * (1 - fx) * fy + gray[y1 * W + x1] * fx * fy; out[y * w + x] = v > 127 ? 255 : 0; } }
    return { gray: out, width: w, height: h };
  }
  // text lines: rows of ink separated by (near-)empty rows in the horizontal projection
  function lines(img) {
    const { gray, width: W, height: H } = img, prof = new Float64Array(H);
    for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (gray[y * W + x] < 128) n++; prof[y] = n; }
    const peak = Math.max(1, ...prof), on = v => v > peak * 0.04;
    const bands = []; let y0 = -1;
    for (let y = 0; y <= H; y++) { const v = y < H && on(prof[y]); if (v && y0 < 0) y0 = y; if (!v && y0 >= 0) { bands.push([y0, y - 1]); y0 = -1; } }
    // merge bands split by a gap smaller than a third of a typical line (dots, accents, descenders)
    const hs = bands.map(b => b[1] - b[0] + 1), typ = median(hs) || 1, merged = [];
    for (const b of bands) { const last = merged[merged.length - 1]; if (last && b[0] - last[1] < typ * 0.35) last[1] = b[1]; else merged.push(b.slice()); }
    return merged.filter(b => b[1] - b[0] + 1 >= Math.max(4, typ * 0.3)).map(([a, b]) => { const m = Math.round((b - a + 1) * 0.15); return { y0: Math.max(0, a - m), y1: Math.min(H - 1, b + m) }; });
  }
  // Tesseract's own per-word confidence (0–100), shown as the software's certainty — never as the writer's
  function flagWords(words) {
    return (words || []).filter(w => w && String(w.text || '').trim()).map(w => ({ text: String(w.text).trim(), conf: Math.round(w.confidence), flag: w.confidence >= 80 ? 'ok' : w.confidence >= 50 ? 'uncertain' : 'unreadable' }));
  }

  /* ---------- 3. comparison (how well the software recognised the copied sentences) ---------- */
  const norm = (t, lang) => String(t || '').normalize('NFKC').toLowerCase().replace(lang === 'ar' ? /[ً-ْـ]/g : /$^/, '').replace(lang === 'ar' ? /[أإآ]/g : /$^/, 'ا').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; }
  function errorRates(expected, got, lang) {
    const e = norm(expected, lang), g = norm(got, lang);
    const ew = e.split(' ').filter(Boolean), gw = g.split(' ').filter(Boolean);
    return { cer: e.length ? Math.min(1, lev([...e], [...g]) / e.length) : 1, wer: ew.length ? Math.min(1, lev(ew, gw) / ew.length) : 1, words: ew.length, matched: ew.filter(w => gw.includes(w)).length };
  }
  // per-word view for the result screen: which expected words were found
  function wordMap(expected, got, lang) { const gw = new Set(norm(got, lang).split(' ')); return expected.split(/\s+/).map(w => ({ w, found: gw.has(norm(w, lang)) })); }
  // the honest verdict the result screen shows
  function outcome(rates, conf) {
    if (rates.cer <= 0.15 && conf >= 60) return 'clear';      // most of it was recognised
    if (rates.cer <= 0.45) return 'partial';                   // some parts were hard to recognise
    return 'inconclusive';                                     // too little recognised to say anything
  }

  return { PROMPTS, MSG, toGray, otsu, shrink, laplacianVar, components, skew, quality, prepare, sauvola, unevenLight, flatten, scale, lines, flagWords, norm, lev, errorRates, wordMap, outcome };
});
