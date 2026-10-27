/* ERLY — handwriting check (pure analysis, runs on this device).
   The student chooses to photograph a short dictation. This module measures
   features that specialists look at in handwriting samples — consistency of
   letter size, baseline, spacing, slant, line direction and margins, plus
   crossings-out — and compares them with loose reference bands.

   It never identifies a condition. Uneven handwriting is common for many
   reasons (a rushed sample, a bumpy desk, writing in a second language). The
   result is a "how many of these features showed up" level that can add a
   little supporting evidence alongside interviews, check-ins and tracking.

   Input: a grayscale image { gray: Uint8Array, width, height } (0 = black).
   Pure: window.ERLY_HAND in the browser, CommonJS for the tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_HAND = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const B = (en, ar) => [en, ar];

  /* ---------- image basics ---------- */
  function otsu(gray) {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
    const total = gray.length;
    let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, best = 0, thr = 127;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue;
      const wF = total - wB; if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; thr = t; }
    }
    return thr;
  }
  // connected components of ink (8-connected), with the moments we need
  function components(ink, W, H) {
    const lab = new Int32Array(W * H), out = [];
    const stack = new Int32Array(W * H);
    let id = 0;
    for (let p = 0; p < W * H; p++) {
      if (!ink[p] || lab[p]) continue;
      id++;
      let sp = 0; stack[sp++] = p; lab[p] = id;
      const c = { id, x0: W, y0: H, x1: 0, y1: 0, area: 0, sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0 };
      while (sp) {
        const q = stack[--sp], x = q % W, y = (q - x) / W;
        c.area++; c.sx += x; c.sy += y; c.sxx += x * x; c.syy += y * y; c.sxy += x * y;
        if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= W) continue;
            const r = yy * W + xx;
            if (ink[r] && !lab[r]) { lab[r] = id; stack[sp++] = r; }
          }
        }
      }
      c.w = c.x1 - c.x0 + 1; c.h = c.y1 - c.y0 + 1;
      c.cx = c.sx / c.area; c.cy = c.sy / c.area;
      out.push(c);
    }
    return out;
  }
  const median = xs => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const sd = xs => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1)); };
  const mad = xs => { const m = median(xs); return median(xs.map(x => Math.abs(x - m))); };
  function fit(pts) { // least squares y = a + b x
    const n = pts.length, mx = mean(pts.map(p => p[0])), my = mean(pts.map(p => p[1]));
    let sxx = 0, sxy = 0; pts.forEach(([x, y]) => { sxx += (x - mx) * (x - mx); sxy += (x - mx) * (y - my); });
    const b = sxx ? sxy / sxx : 0, a = my - b * mx;
    const res = pts.map(([x, y]) => y - (a + b * x));
    return { a, b, resSd: n > 2 ? Math.sqrt(res.reduce((s, r) => s + r * r, 0) / (n - 2)) : 0 };
  }

  /* ---------- reference bands (demo calibration, see README) ---------- */
  const METRICS = [
    { id: 'size', name: B('Letter size consistency', 'ثبات حجم الحروف'), bands: [0.22, 0.36], unit: '', tip: B('How much letter heights vary', 'مدى تفاوت ارتفاع الحروف') },
    { id: 'baseline', name: B('Staying on the line', 'الثبات على السطر'), bands: [0.16, 0.28], unit: '', tip: B('How far letters drift above or below the line', 'مدى انحراف الحروف فوق السطر أو تحته') },
    { id: 'spacing', name: B('Spacing between letters and words', 'التباعد بين الحروف والكلمات'), bands: [0.5, 0.8], unit: '', tip: B('How even the gaps are', 'مدى انتظام الفراغات') },
    { id: 'slant', name: B('Slant consistency', 'ثبات الميل'), bands: [7, 13], unit: '°', tip: B('How much the lean of letters changes', 'مدى تغيّر ميل الحروف') },
    { id: 'lines', name: B('Line direction', 'اتجاه الأسطر'), bands: [2.5, 5], unit: '°', tip: B('How much lines tilt differently from each other', 'مدى اختلاف ميل الأسطر عن بعضها') },
    { id: 'margin', name: B('Left margin', 'الهامش الأيسر'), bands: [0.025, 0.05], unit: '', tip: B('How much the start of each line wanders', 'مدى تنقّل بداية كل سطر') },
    { id: 'crossouts', name: B('Crossings-out and overwriting', 'الشطب والكتابة فوق الكلمات'), bands: [0.5, 2.5], unit: '', tip: B('Dense scribbled areas', 'مناطق شطب كثيفة') }
  ];
  const band = (m, v) => v == null ? 'na' : v <= m.bands[0] ? 'typical' : v <= m.bands[1] ? 'mixed' : 'notable';

  /* ---------- photo clean-up: even out shadows and uneven light ---------- */
  function normalize(img) {
    const { gray, width: W, height: H } = img, S = Math.max(16, Math.round(Math.max(W, H) / 28));
    const bw = Math.ceil(W / S), bh = Math.ceil(H / S), bg = new Float32Array(bw * bh);
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      // the paper is the bright part of each block: take a high percentile, not the max (glints)
      const vals = [];
      for (let y = by * S; y < Math.min(H, by * S + S); y += 2) for (let x = bx * S; x < Math.min(W, bx * S + S); x += 2) vals.push(gray[y * W + x]);
      vals.sort((p, q) => p - q); bg[by * bw + bx] = vals[Math.floor(vals.length * 0.9)] || 255;
    }
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const fy = Math.min(bh - 1, Math.max(0, y / S - 0.5)), y0 = Math.floor(fy), y1 = Math.min(bh - 1, y0 + 1), ty = fy - y0;
      for (let x = 0; x < W; x++) {
        const fx = Math.min(bw - 1, Math.max(0, x / S - 0.5)), x0 = Math.floor(fx), x1 = Math.min(bw - 1, x0 + 1), tx = fx - x0;
        const b = (bg[y0 * bw + x0] * (1 - tx) + bg[y0 * bw + x1] * tx) * (1 - ty) + (bg[y1 * bw + x0] * (1 - tx) + bg[y1 * bw + x1] * tx) * ty;
        out[y * W + x] = Math.max(0, Math.min(255, Math.round(gray[y * W + x] / Math.max(40, b) * 240)));
      }
    }
    return { gray: out, width: W, height: H };
  }

  /* ---------- synthetic samples, for trying the check without paper (and for tests) ---------- */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }
  function sample(kind, seed) {
    const W = 900, H = 640, img = { gray: new Uint8Array(W * H).fill(236), width: W, height: H };
    const P = kind === 'irregular' ? { margin: 45, tilt: 7, size: 0.45, base: 9, slant0: 78, slant: 24, gap: 0.3, gapJ: 0.35, wordJ: 0.6, cross: 3 }
      : { margin: 2, tilt: 0.4, size: 0.04, base: 1, slant0: 72, slant: 2, gap: 0.25, gapJ: 0.03, wordJ: 0.05, cross: 0 };
    const dot = (x, y, t) => { for (let dy = -t; dy <= t; dy++) for (let dx = -t; dx <= t; dx++) { if (dx * dx + dy * dy > t * t) continue; const xx = Math.round(x + dx), yy = Math.round(y + dy); if (xx >= 0 && yy >= 0 && xx < W && yy < H) img.gray[yy * W + xx] = 28; } };
    const line = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 3); };
    const r = rng(seed || 7), h0 = 26;
    for (let ln = 0; ln < 5; ln++) {
      let x = 60 + (r() - .5) * 2 * P.margin;
      const base = 90 + ln * 105, tilt = (r() - .5) * 2 * P.tilt * Math.PI / 180;
      for (let word = 0; word < 6; word++) {
        const letters = 3 + Math.floor(r() * 4);
        for (let k = 0; k < letters; k++) {
          const h = h0 * (1 + (r() - .5) * 2 * P.size), yb = base + Math.tan(tilt) * (x - 60) + (r() - .5) * 2 * P.base;
          const ang = (P.slant0 + (r() - .5) * 2 * P.slant) * Math.PI / 180, dx = h / Math.tan(ang);
          line(x, yb, x + dx, yb - h);
          x += Math.abs(dx) + 8 + h0 * (P.gap + (r() - .5) * 2 * P.gapJ);
        }
        x += h0 * (0.9 + (r() - .5) * 2 * P.wordJ);
        if (x > 820) break;
      }
    }
    for (let i = 0; i < P.cross; i++) for (let y = 160 + (i % 2) * 210; y < 184 + (i % 2) * 210; y++) for (let x = 120 + i * 210; x < 166 + i * 210; x++) img.gray[y * W + x] = 28;
    return img;
  }

  /* ---------- the analysis ---------- */
  function analyse(img, opts) {
    opts = opts || {};
    if (opts.normalize) img = normalize(img);
    const { gray, width: W, height: H } = img;
    const quality = { issues: [] };
    const thr = otsu(gray);
    let inkN = 0, bgSum = 0, inkSum = 0;
    const ink = new Uint8Array(W * H);
    for (let i = 0; i < gray.length; i++) { if (gray[i] <= thr) { ink[i] = 1; inkN++; inkSum += gray[i]; } else bgSum += gray[i]; }
    const ratio = inkN / (W * H);
    quality.inkRatio = +ratio.toFixed(4);
    quality.contrast = Math.round((bgSum / Math.max(1, W * H - inkN)) - (inkSum / Math.max(1, inkN)));
    if (ratio < 0.003) quality.issues.push('empty');
    if (ratio > 0.3) quality.issues.push('dark');
    if (quality.contrast < 50) quality.issues.push('contrast');
    if (quality.issues.length) return { ok: false, quality, metrics: [], level: 'unclear' };

    let comps = components(ink, W, H);
    const speck = Math.max(5, W * H * 0.000015);
    const ruled = comps.filter(c => c.w > W * 0.45 && c.h < H * 0.025);
    comps = comps.filter(c => c.area >= speck && !ruled.includes(c) && c.w < W * 0.6 && c.h < H * 0.4);
    const areaMed = median(comps.map(c => c.area));
    const main = comps.filter(c => c.area >= areaMed * 0.25);
    const dots = comps.length - main.length;
    const h0 = median(main.map(c => c.h)) || 1;

    // lines: cluster by vertical centre
    const sorted = main.slice().sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
    const lines = [];
    sorted.forEach(c => {
      const cy = (c.y0 + c.y1) / 2, L = lines[lines.length - 1];
      if (L && cy - L.cy < h0 * 0.9) { L.c.push(c); L.cy = mean(L.c.map(k => (k.y0 + k.y1) / 2)); } else lines.push({ c: [c], cy });
    });
    const good = lines.filter(L => L.c.length >= 3);
    const nMain = good.reduce((a, L) => a + L.c.length, 0);
    quality.lines = good.length; quality.marks = nMain;
    if (good.length < 2 || nMain < 12) { quality.issues.push('short'); return { ok: false, quality, metrics: [], level: 'unclear' }; }

    const relH = [], gapsAll = [], slopes = [], margins = [], slants = [], ann = { lines: [], flagged: [] };
    let crossouts = 0;
    good.forEach(L => {
      const cs = L.c.slice().sort((a, b) => a.x0 - b.x0);
      const lm = median(cs.map(c => c.h));
      cs.forEach(c => relH.push(c.h / lm));
      const f = fit(cs.map(c => [(c.x0 + c.x1) / 2, c.y1]));
      L.resSd = f.resSd / h0; L.slope = Math.atan(f.b) * 180 / Math.PI;
      slopes.push(L.slope); margins.push(cs[0].x0 / W);
      const gaps = [];
      for (let i = 1; i < cs.length; i++) gaps.push(Math.max(0, cs[i].x0 - cs[i - 1].x1) / h0);
      gapsAll.push(gaps);
      cs.forEach(c => {
        const fill = c.area / (c.w * c.h);
        if (fill > 0.5 && c.w > h0 * 1.2 && c.h > h0 * 0.6) { crossouts++; ann.flagged.push({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, why: 'crossout' }); }
        // stroke direction from second moments, for elongated marks only
        const mx = c.cx, my = c.cy;
        const mu20 = c.sxx / c.area - mx * mx, mu02 = c.syy / c.area - my * my, mu11 = c.sxy / c.area - mx * my;
        const common = Math.sqrt(4 * mu11 * mu11 + (mu20 - mu02) * (mu20 - mu02));
        const l1 = (mu20 + mu02 + common) / 2, l2 = (mu20 + mu02 - common) / 2;
        if (l2 > 0 && l1 / l2 > 3 && fill < 0.5) { let ang = 0.5 * Math.atan2(2 * mu11, mu20 - mu02) * 180 / Math.PI; if (ang < 0) ang += 180; if (ang > 40 && ang < 140) slants.push(ang); } // upright strokes only (not joined-up words)
      });
      ann.lines.push({ x0: cs[0].x0, x1: cs[cs.length - 1].x1, a: f.a, b: f.b });
    });
    // size: robust spread of relative heights
    const size = 1.4826 * mad(relH) / (median(relH) || 1);
    // flag size outliers for the overlay
    good.forEach(L => { const lm = median(L.c.map(c => c.h)); L.c.forEach(c => { const r = c.h / lm; if (r > 1 + 2.2 * Math.max(0.12, size) || r < 1 - 2.2 * Math.max(0.12, size) * 0.6) ann.flagged.push({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, why: 'size' }); }); });
    const baseline = mean(good.map(L => L.resSd));
    // spacing: split gaps into letter gaps and word gaps at the biggest jump, then measure spread inside each group
    const spacing = mean(gapsAll.filter(g => g.length >= 3).map(g => {
      const s = g.slice().sort((a, b) => a - b);
      let cut = -1, jump = 0;
      for (let i = 1; i < s.length; i++) { const j = s[i] - s[i - 1]; if (j > jump) { jump = j; cut = i; } }
      const groups = jump > 0.35 ? [s.slice(0, cut), s.slice(cut)] : [s];
      return mean(groups.filter(x => x.length >= 2).map(x => sd(x) / Math.max(0.15, mean(x))));
    }));
    let slant = null;
    if (slants.length >= 6) slant = 1.4826 * mad(slants);
    const vals = { size, baseline, spacing, slant, lines: sd(slopes), margin: sd(margins), crossouts };
    const metrics = METRICS.map(m => { const v = vals[m.id]; return { id: m.id, name: m.name, tip: m.tip, unit: m.unit, value: v == null || isNaN(v) ? null : +v.toFixed(3), band: band(m, v == null || isNaN(v) ? null : v) }; });
    const notable = metrics.filter(m => m.band === 'notable').length, mixed = metrics.filter(m => m.band === 'mixed').length;
    const weight = notable + mixed * 0.5;
    const level = weight >= 3 ? 'several' : weight >= 1.5 ? 'some' : 'few';
    return { ok: true, quality, metrics, notable, mixed, level, h0, dots, ann, size: { W, H } };
  }

  /* ---------- the dictation and the spelling self-check ---------- */
  const DICTATION = {
    en: [
      { text: 'The scientist described the necessary equipment for the experiment.', tricky: ['scientist', 'described', 'necessary', 'equipment', 'experiment'] },
      { text: 'Because of the weather, they decided to leave early on Wednesday.', tricky: ['Because', 'weather', 'decided', 'early', 'Wednesday'] },
      { text: 'My friend thought the separate answers were definitely different.', tricky: ['friend', 'thought', 'separate', 'definitely', 'different'] }
    ],
    ar: [
      { text: 'ذهب الطالب إلى المكتبة ليقرأ كتاباً مفيداً عن تاريخ العلوم.', tricky: ['المكتبة', 'ليقرأ', 'كتاباً', 'مفيداً', 'تاريخ'] },
      { text: 'سألت المعلمة عن مسؤولية الطلاب في المحافظة على البيئة.', tricky: ['سألت', 'مسؤولية', 'الطلاب', 'المحافظة', 'البيئة'] },
      { text: 'إن الهدوء ضروري لكي نفهم الأسئلة الصعبة في الامتحان.', tricky: ['الهدوء', 'ضروري', 'لكي', 'الأسئلة', 'الامتحان'] }
    ]
  };
  function spellingBand(missed, total) {
    const r = total ? missed / total : 0;
    return missed <= 1 ? 'typical' : r < 0.27 ? 'mixed' : 'notable';
  }
  // the combined, honest summary
  function summary(res, spelling) {
    const sp = spelling ? spellingBand(spelling.missed, spelling.total) : null;
    const lvl = res && res.ok ? res.level : 'unclear';
    const head = {
      several: B('Several features that often appear in the handwriting of people with dysgraphia or dyslexia showed up in this sample.', 'ظهرت في هذه العينة عدة سمات تظهر غالباً في كتابة من لديهم عسر كتابة أو عسر قراءة.'),
      some: B('A few features that sometimes appear in the handwriting of people with dysgraphia or dyslexia showed up, alongside many typical ones.', 'ظهرت بعض السمات التي تظهر أحياناً في كتابة من لديهم عسر كتابة أو عسر قراءة، إلى جانب كثير من السمات المعتادة.'),
      few: B('Your handwriting looked fairly consistent on the features we measure.', 'بدت كتابتك متسقة إلى حد ما في السمات التي نقيسها.'),
      unclear: B('We couldn’t measure this photo reliably.', 'لم نتمكن من قياس هذه الصورة بشكل موثوق.')
    }[lvl];
    const spl = sp === 'notable' ? B('Several of the dictated words were spelled differently — spelling is one of the most consistent signs of dyslexia, so it is worth mentioning to SAS.', 'كُتبت عدة كلمات من الإملاء بشكل مختلف — والإملاء من أكثر علامات عسر القراءة ثباتاً، لذا يستحق ذكره لخدمات الطلبة.')
      : sp === 'mixed' ? B('A couple of tricky words were spelled differently — very common, even without dyslexia.', 'كُتبت كلمتان صعبتان بشكل مختلف — وهذا شائع جداً حتى دون عسر قراءة.')
        : sp === 'typical' ? B('Spelling of the dictated words looked typical.', 'بدا إملاء الكلمات المملاة معتاداً.') : null;
    const evidence = lvl === 'several' && sp === 'notable' ? 'stronger' : (lvl === 'several' || sp === 'notable' || (lvl === 'some' && sp === 'mixed')) ? 'some' : lvl === 'unclear' && !sp ? 'none' : 'little';
    return { level: lvl, spelling: sp, evidence, head, spl,
      note: B('Handwriting alone can’t identify dyslexia or dysgraphia — a rushed sample, an uneven surface or writing in a second language can all change it. This only adds a little to the bigger picture, and only an assessment can confirm anything.', 'لا يمكن للكتابة وحدها تحديد عسر القراءة أو عسر الكتابة — فالعينة المستعجلة أو السطح غير المستوي أو الكتابة بلغة ثانية قد تغيّرها. هذا يضيف القليل إلى الصورة الأكبر فقط، والتقييم وحده يؤكد أي شيء.') };
  }
  return { METRICS, DICTATION, otsu, components, normalize, sample, analyse, band, spellingBand, summary };
});
