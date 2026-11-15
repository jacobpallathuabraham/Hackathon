/* ERLY — handwriting recognition model + image tools (v18).
   Tesseract (used since v12) was built for printed text; it reads joined-up handwriting poorly. This module adds a
   model trained on handwriting: TrOCR-small-handwritten (Microsoft, MIT licence; ONNX export by Xenova), run IN THIS
   PAGE with transformers.js / ONNX Runtime (WebAssembly). The model files (~64 MB) are downloaded once, only after the
   student presses “Download the handwriting model”, and cached by the browser. The image itself never leaves the
   device: it is read in memory and discarded.
   TrOCR reads one line at a time, so a page is first split into lines (projection profile on a cleaned copy) and
   each line is read separately. Confidence is the model's own probability for every token it produced (computed by
   re-scoring the output), shown per word and per line — it describes how sure the SOFTWARE is, never the writer.
   English only: TrOCR-handwritten was trained on English. Arabic stays on Tesseract, and the page says so.
   window.ERLY.handRec in the browser; the pure image tools are also exported for the unit tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api.pure;
  else { root.ERLY = root.ERLY || {}; root.ERLY.handRec = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MODEL = 'Xenova/trocr-small-handwritten';
  const BASE = (() => { try { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/js\/hand-rec\.js.*$/, '') : 'assets/'; } catch (e) { return 'assets/'; } })();

  /* ---------- pure image tools (gray Uint8 arrays) ---------- */
  // brightness −100…100, contrast −100…100 (applied around mid-grey), gamma 0.4…2.5
  function adjust(gray, o) {
    const b = (o.brightness || 0) * 1.28, c = (o.contrast || 0) / 100, f = c >= 0 ? 1 + c * 2 : 1 + c, gm = o.gamma || 1, out = new Uint8Array(gray.length);
    const lut = new Uint8Array(256); for (let v = 0; v < 256; v++) { let x = (v - 128) * f + 128 + b; x = Math.max(0, Math.min(255, x)); if (gm !== 1) x = 255 * Math.pow(x / 255, gm); lut[v] = Math.round(x); }
    for (let i = 0; i < gray.length; i++) out[i] = lut[gray[i]];
    return out;
  }
  // 3×3 median: removes speckle (paper grain, JPEG noise) without blurring strokes the way a mean filter does
  function median3(gray, W, H) {
    const out = new Uint8Array(gray.length), win = new Uint8Array(9);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = Math.min(W - 1, Math.max(0, x + dx)), yy = Math.min(H - 1, Math.max(0, y + dy)); win[n++] = gray[yy * W + xx]; }
      win.sort(); out[y * W + x] = win[4];
    }
    return out;
  }
  // a slow-varying background (shadow, uneven light) divided out: each pixel relative to a wide local maximum
  function flattenLight(gray, W, H) {
    const r = Math.max(8, Math.round(Math.min(W, H) / 24)), bg = new Float32Array(gray.length), tmp = new Float32Array(gray.length), out = new Uint8Array(gray.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 0; for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k += 2) m = Math.max(m, gray[y * W + k]); tmp[y * W + x] = m; }
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { let m = 0; for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k += 2) m = Math.max(m, tmp[k * W + x]); bg[y * W + x] = m; }
    for (let i = 0; i < gray.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(255 * gray[i] / Math.max(24, bg[i]))));
    return out;
  }
  // auto settings from the histogram: stretch the 2nd–98th percentile to the full range
  function autoLevels(gray) {
    const h = new Uint32Array(256); for (let i = 0; i < gray.length; i++) h[gray[i]]++;
    let lo = 0, hi = 255, acc = 0; const n = gray.length;
    for (let v = 0; v < 256; v++) { acc += h[v]; if (acc >= n * 0.02) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += h[v]; if (acc >= n * 0.02) { hi = v; break; } }
    const span = Math.max(16, hi - lo), out = new Uint8Array(n); for (let i = 0; i < n; i++) out[i] = Math.max(0, Math.min(255, Math.round((gray[i] - lo) * 255 / span)));
    return out;
  }
  // line bands from a binarised copy: rows with ink, merged across small gaps (dots, descenders), padded
  function lineBands(bin, W, H) {
    const prof = new Float64Array(H); for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (bin[y * W + x] < 128) n++; prof[y] = n; }
    const sm = prof.map((v, y) => (prof[Math.max(0, y - 1)] + v + prof[Math.min(H - 1, y + 1)]) / 3), peak = Math.max(1, ...sm), on = v => v > peak * 0.05;
    const bands = []; let y0 = -1;
    for (let y = 0; y <= H; y++) { const v = y < H && on(sm[y]); if (v && y0 < 0) y0 = y; if (!v && y0 >= 0) { bands.push([y0, y - 1]); y0 = -1; } }
    const hs = bands.map(b => b[1] - b[0] + 1).sort((a, b) => a - b), typ = hs.length ? hs[hs.length >> 1] : 1, merged = [];
    for (const b of bands) { const last = merged[merged.length - 1]; if (last && b[0] - last[1] < typ * 0.3) last[1] = b[1]; else merged.push(b.slice()); }
    // a band needs real ink: thin strips of shadow, ruling or speckle make a line model invent text
    const mass = b => { let n = 0; for (let y = b[0]; y <= b[1]; y++) n += prof[y]; return n; }, masses = merged.map(mass), mMed = masses.slice().sort((a, b) => a - b)[masses.length >> 1] || 1;
    const out = merged.filter((b, i) => b[1] - b[0] + 1 >= Math.max(5, typ * 0.35) && masses[i] >= mMed * 0.18);
    return out.map(([a, b], i) => { const m = Math.round((b - a + 1) * 0.22), prev = out[i - 1], next = out[i + 1]; return { y0: Math.max(prev ? Math.round((prev[1] + a) / 2) : 0, a - m), y1: Math.min(next ? Math.round((b + next[0]) / 2) : H - 1, b + m) }; });
  }
  // horizontal extent of the ink in a band (so the model sees the writing, not a strip of empty paper)
  function inkSpan(bin, W, y0, y1) {
    let x0 = W, x1 = -1; for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) if (bin[y * W + x] < 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    return x1 < 0 ? null : { x0, x1 };
  }
  // per-word confidence from per-token probabilities (a word's confidence is its least certain token)
  function wordsFromTokens(toks) {
    const words = []; let cur = null;
    for (const t of toks) { const startsWord = /^\s/.test(t.t) || !cur; const piece = t.t.replace(/^\s+/, ''); if (!piece) continue; if (startsWord) { cur = { w: piece, conf: t.p }; words.push(cur); } else { cur.w += piece; cur.conf = Math.min(cur.conf, t.p); } }
    return words.map(w => ({ text: w.w, conf: Math.round(w.conf * 100) }));
  }
  function repetitive(text) { const w = String(text).toLowerCase().split(/\s+/).filter(Boolean); if (w.length < 6) return false; const seen = {}; for (let i = 0; i + 2 < w.length; i++) { const k = w.slice(i, i + 3).join(' '); seen[k] = (seen[k] || 0) + 1; if (seen[k] >= 3) return true; } return false; }
  const pure = { repetitive, adjust, median3, flattenLight, autoLevels, lineBands, inkSpan, wordsFromTokens };

  /* ---------- the model (browser only) ---------- */
  let T = null, proc = null, model = null, tok = null, loading = null, status = 'idle';
  const subs = new Set(), emit = () => subs.forEach(f => { try { f(status); } catch (e) { /* ok */ } });
  const supported = () => typeof WebAssembly === 'object' && typeof document !== 'undefined';
  function load(onProgress) {
    if (model) return Promise.resolve(true);
    if (loading) return loading;
    status = 'loading'; emit();
    const files = {};
    const cb = p => { if (p && p.file && p.total) { files[p.file] = [p.loaded || 0, p.total]; const L = Object.values(files).reduce((a, f) => a + f[0], 0), Tt = Object.values(files).reduce((a, f) => a + f[1], 0); onProgress && onProgress(Math.min(0.99, L / Math.max(Tt, 6.4e7)), L); } };
    loading = (async () => {
      T = await import(BASE + 'vendor/transformers/transformers.min.js');
      T.env.allowLocalModels = false; T.env.backends.onnx.wasm.wasmPaths = BASE + 'vendor/transformers/';
      proc = await T.AutoProcessor.from_pretrained(MODEL, { progress_callback: cb });
      tok = await T.AutoTokenizer.from_pretrained(MODEL, { progress_callback: cb });
      model = await T.VisionEncoderDecoderModel.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm', progress_callback: cb });
      status = 'ready'; emit(); onProgress && onProgress(1); return true;
    })().catch(e => { loading = null; status = 'error'; emit(); throw e; });
    return loading;
  }
  // one line image (canvas) → text + the model's probability for each token it wrote
  async function readLine(canvas) {
    if (!model) throw new Error('model not loaded');
    const img = await T.RawImage.fromCanvas(canvas), inp = await proc(img.rgb());
    const out = await model.generate({ ...inp, max_new_tokens: 64, num_beams: 1 });
    const seq = out.sequences || out, ids = Array.from(seq.data, Number);
    const text = tok.decode(ids, { skip_special_tokens: true }).trim();
    // re-score the produced sequence (teacher forcing) to get each token's probability under the model
    const fw = await model({ ...inp, decoder_input_ids: seq }), lg = fw.logits, V = lg.dims[2], L = lg.dims[1], D = lg.data, toks = [];
    let prevText = '';
    for (let i = 0; i < L - 1; i++) {
      const id = ids[i + 1]; if (id === tok.eos_token_id || id === tok.pad_token_id) break;
      let m = -Infinity; for (let v = 0; v < V; v++) if (D[i * V + v] > m) m = D[i * V + v];
      let z = 0; for (let v = 0; v < V; v++) z += Math.exp(D[i * V + v] - m);
      const upto = tok.decode(ids.slice(0, i + 2), { skip_special_tokens: true }), piece = upto.slice(prevText.length); prevText = upto; toks.push({ t: piece, p: Math.exp(D[i * V + id] - m) / z }); // the text a token adds, spaces included
    }
    const conf0 = toks.length ? Math.exp(toks.reduce((a, t) => a + Math.log(Math.max(1e-6, t.p)), 0) / toks.length) : 0; // geometric mean
    // a known failure of line models: on a blank or unclear strip they loop (“of the time of the time…”) — flagged, not trusted
    const rep = repetitive(text), conf = rep ? Math.min(conf0, 0.2) : conf0;
    return { text, conf: Math.round(conf * 100), words: wordsFromTokens(toks).map(w => (rep ? Object.assign(w, { conf: Math.min(w.conf, 20) }) : w)), tokens: toks.length, suspect: rep };
  }
  const toGray = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, g = new Uint8Array(c.width * c.height); for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114) | 0; return g; };
  const fromGray = (g, W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), d = x.createImageData(W, H); for (let i = 0; i < g.length; i++) { d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = g[i]; d.data[i * 4 + 3] = 255; } x.putImageData(d, 0, 0); return c; };
  function otsuThr(g) { const h = new Float64Array(256); for (let i = 0; i < g.length; i++) h[g[i]]++; let sum = 0; for (let i = 0; i < 256; i++) sum += i * h[i]; let sb = 0, wb = 0, best = 0, thr = 128; for (let t = 0; t < 256; t++) { wb += h[t]; if (!wb) continue; const wf = g.length - wb; if (!wf) break; sb += t * h[t]; const mb = sb / wb, mf = (sum - sb) / wf, v = wb * wf * (mb - mf) ** 2; if (v > best) { best = v; thr = t; } } return thr; }
  // split a page into line images (gray, not binarised: the model was trained on grey scans)
  function segment(canvas) {
    const W = canvas.width, H = canvas.height, g = flattenLight(toGray(canvas), W, H), thr = otsuThr(g), bin = new Uint8Array(g.length);
    for (let i = 0; i < g.length; i++) bin[i] = g[i] < thr ? 0 : 255;
    return lineBands(bin, W, H).map(b => { const sp = inkSpan(bin, W, b.y0, b.y1); if (!sp) return null; const pad = Math.round((b.y1 - b.y0) * 0.3), x0 = Math.max(0, sp.x0 - pad), x1 = Math.min(W - 1, sp.x1 + pad), w = x1 - x0 + 1, h = b.y1 - b.y0 + 1, c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(fromGray(g, W, H), x0, b.y0, w, h, 0, 0, w, h); return { canvas: c, box: { x: x0, y: b.y0, w, h } }; }).filter(Boolean);
  }
  async function readPage(canvas, onProgress) {
    const lines = segment(canvas), out = [];
    for (let i = 0; i < lines.length; i++) { onProgress && onProgress(i / lines.length); const r = await readLine(lines[i].canvas); out.push(Object.assign({ box: lines[i].box }, r)); }
    onProgress && onProgress(1);
    const conf = out.length ? Math.round(out.reduce((a, l) => a + l.conf, 0) / out.length) : 0;
    return { text: out.map(l => l.text).join('\n'), conf, lines: out, words: out.flatMap(l => l.words) };
  }
  // the image tools applied to a canvas (used by the photo editor and by the benchmark)
  function edit(canvas, o) {
    const W = canvas.width, H = canvas.height; let g = toGray(canvas);
    if (o.flatten) g = flattenLight(g, W, H);
    if (o.auto) g = autoLevels(g);
    if (o.brightness || o.contrast || (o.gamma && o.gamma !== 1)) g = adjust(g, o);
    if (o.denoise) g = median3(g, W, H);
    return fromGray(g, W, H);
  }
  return { pure, supported, load, ready: () => !!model, status: () => status, on: f => { subs.add(f); return () => subs.delete(f); }, readLine, readPage, segment, edit, MODEL, SIZE_MB: 64 };
});
