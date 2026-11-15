// ERLY handwriting recognition benchmark (v18). Runs the site's own recognition code in Chromium on REAL handwriting:
// a fixed sample of lines from the IAM test split (fetched by tests/bench/iam-extract.py, not committed), and compares
// the handwriting model (TrOCR-small-handwritten, assets/js/hand-rec.js) with Tesseract (the v12–v17 engine).
//   1. line level — each IAM line image read on its own
//   2. page level — three consecutive sample lines stacked into one "page", so line segmentation is tested too
//   3. image tools — the same pages with simulated poor photos (dim, low contrast, noise) before and after the
//      editor's automatic fixes
// Metrics: CER / WER (Levenshtein distance ÷ reference length), computed two ways: "normalised" exactly as the app
// does it (ERLY_HAND.errorRates: case, punctuation and spacing ignored) and "raw" CER on the exact characters.
// Confidence calibration: mean CER of lines grouped by the model's own confidence.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/bench/hand-bench.js [lines]
'use strict';
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const DATA = path.join(__dirname, '.data', 'iam');
const N = +(process.argv[2] || 150);

(async () => {
  if (!fs.existsSync(path.join(DATA, 'manifest.json'))) { console.error('Run tests/bench/iam-extract.py first (see its header).'); process.exit(2); }
  const man = JSON.parse(fs.readFileSync(path.join(DATA, 'manifest.json'), 'utf8')), lines = man.lines.slice(0, N);
  const b = await chromium.launch(); const ctx = await b.newContext(); await ctx.addInitScript(() => sessionStorage.setItem('acubins-role', 'student')); const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'handwriting.html'); await p.waitForTimeout(800);
  const t0 = Date.now();
  await p.evaluate(async () => {
    await ERLY.handRec.load();
    await new Promise((res, rej) => { if (window.Tesseract) return res(); const s = document.createElement('script'); s.src = 'assets/vendor/tesseract/tesseract.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    window.__tess = await Tesseract.createWorker('eng', 1, { workerPath: 'assets/vendor/tesseract/worker.min.js', corePath: 'assets/vendor/tesseract/core', langPath: 'assets/vendor/tesseract/lang', gzip: true, workerBlobURL: false });
    window.__img = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0); res(c); }; im.onerror = rej; im.src = src; });
    // the reference text without IAM's tokenised spacing (“word ,” → “word,”)
    window.__detok = t => t.replace(/\s+([.,;:!?)'’])/g, '$1').replace(/([(])\s+/g, '$1').replace(/" ([^"]*?) "/g, '"$1"').replace(/\s+/g, ' ').trim();
    window.__lev = (a, b) => { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };
    window.__score = (ref, got) => { const r = ERLY_HAND.errorRates(ref, got, 'en'), R = __detok(ref), G = String(got).replace(/\s+/g, ' ').trim(); return { cer: r.cer, wer: r.wer, rawCer: Math.min(1, __lev([...R], [...G]) / R.length) }; };
  });
  const loadMs = Date.now() - t0;
  const res = { lines: [], pages: [], tools: [] };
  for (const [i, l] of lines.entries()) {
    const r = await p.evaluate(async ([file, text]) => {
      const c = await __img('tests/bench/.data/iam/' + file);
      const a = performance.now(), m = await ERLY.handRec.readLine(c), tm = performance.now() - a;
      const b2 = performance.now(), { data } = await __tess.recognize(c), tt = performance.now() - b2;
      return { trocr: Object.assign({ text: m.text, conf: m.conf, ms: Math.round(tm) }, __score(text, m.text)), tess: Object.assign({ text: (data.text || '').trim(), conf: Math.round(data.confidence || 0), ms: Math.round(tt) }, __score(text, data.text || '')) };
    }, [l.file, l.text]);
    res.lines.push(Object.assign({ file: l.file, ref: l.text }, r));
    if (i % 25 === 0) console.log(`line ${i}: TrOCR CER ${(r.trocr.cer * 100).toFixed(1)}%  Tesseract CER ${(r.tess.cer * 100).toFixed(1)}%  | ${r.trocr.text.slice(0, 60)}`);
  }
  // pages of three consecutive sample lines, stacked with a gap, read through the full page pipeline
  for (let k = 0; k + 3 <= lines.length && res.pages.length < 30; k += 3) {
    const group = lines.slice(k, k + 3);
    const r = await p.evaluate(async ([files, texts, degrade]) => {
      const cs = []; for (const f of files) cs.push(await __img('tests/bench/.data/iam/' + f));
      const W = Math.max(...cs.map(c => c.width)) + 80, H = cs.reduce((a, c) => a + c.height + 40, 40);
      const make = mode => { const pg = document.createElement('canvas'); pg.width = W; pg.height = H; const g = pg.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); let y = 40; for (const c of cs) { g.drawImage(c, 40, y); y += c.height + 40; } if (mode === 'dim' || mode === 'lowcontrast') { const q = document.createElement('canvas'); q.width = W; q.height = H; const qg = q.getContext('2d'); qg.filter = mode === 'dim' ? 'brightness(0.55)' : 'contrast(0.35) brightness(1.15)'; qg.drawImage(pg, 0, 0); if (mode === 'dim') { const gr = qg.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); qg.filter = 'none'; qg.fillStyle = gr; qg.fillRect(0, 0, W, H); } return q; } // the whole page dimmed (with a side shadow), as in a poor photo
        if (mode === 'noise') { const d = g.getImageData(0, 0, W, H); let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < d.data.length; i += 4) { if (rnd() < 0.04) { const v = rnd() < 0.5 ? 0 : 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; } } g.putImageData(d, 0, 0); } return pg; };
      const ref = texts.join(' '), clean = make('clean');
      const m = await ERLY.handRec.readPage(clean), { data } = await __tess.recognize(clean);
      const out = { nLines: m.lines.length, trocr: Object.assign({ conf: m.conf }, __score(ref, m.text)), tess: __score(ref, data.text || '') };
      if (degrade) { out.tools = {}; for (const mode of ['dim', 'lowcontrast', 'noise']) { const bad = make(mode), fixed = ERLY.handRec.edit(bad, { flatten: true, auto: true, denoise: mode === 'noise' }); const before = await ERLY.handRec.readPage(bad), after = await ERLY.handRec.readPage(fixed); out.tools[mode] = { before: __score(ref, before.text).cer, after: __score(ref, after.text).cer }; } }
      return out;
    }, [group.map(x => x.file), group.map(x => x.text), res.pages.length < 10]);
    res.pages.push(Object.assign({ files: group.map(x => x.file) }, r));
  }
  await p.evaluate(() => __tess.terminate());
  await b.close();
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN, pct = v => (v * 100).toFixed(1) + '%';
  const L = res.lines, P = res.pages, Tl = P.filter(x => x.tools);
  const sum = {
    date: new Date().toISOString(), source: man.source, sampled: L.length, rowsInSplit: man.rows_in_split, step: man.step, modelLoadMs: loadMs,
    line: { trocr: { cer: mean(L.map(x => x.trocr.cer)), wer: mean(L.map(x => x.trocr.wer)), rawCer: mean(L.map(x => x.trocr.rawCer)), ms: mean(L.map(x => x.trocr.ms)) }, tess: { cer: mean(L.map(x => x.tess.cer)), wer: mean(L.map(x => x.tess.wer)), rawCer: mean(L.map(x => x.tess.rawCer)), ms: mean(L.map(x => x.tess.ms)) } },
    sameLines: { n: P.length * 3, trocr: mean(L.slice(0, P.length * 3).map(x => x.trocr.cer)), tess: mean(L.slice(0, P.length * 3).map(x => x.tess.cer)) },
    page: { n: P.length, segmentedRight: P.filter(x => x.nLines === 3).length, trocr: { cer: mean(P.map(x => x.trocr.cer)), wer: mean(P.map(x => x.trocr.wer)) }, tess: { cer: mean(P.map(x => x.tess.cer)), wer: mean(P.map(x => x.tess.wer)) } },
    tools: ['dim', 'lowcontrast', 'noise'].map(m => ({ mode: m, n: Tl.length, before: mean(Tl.map(x => x.tools[m].before)), after: mean(Tl.map(x => x.tools[m].after)) })),
    calibration: [[80, 101], [60, 80], [0, 60]].map(([lo, hi]) => { const g = L.filter(x => x.trocr.conf >= lo && x.trocr.conf < hi); return { band: `${lo}–${Math.min(100, hi - 1)}%`, n: g.length, cer: mean(g.map(x => x.trocr.cer)), wer: mean(g.map(x => x.trocr.wer)) }; }),
    errors
  };
  const dir = path.join(__dirname, '..', '..', 'docs', 'bench'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'handwriting-bench.json'), JSON.stringify(Object.assign({ summary: sum }, res), null, 1));
  const md = `# Handwriting recognition benchmark — results

Run ${sum.date.slice(0, 16).replace('T', ' ')} UTC in Chromium (WebAssembly, CPU), from \`tests/bench/hand-bench.js\`, on **${sum.sampled} real handwritten lines** from the IAM test split (${sum.source}; every ${sum.step}th of ${sum.rowsInSplit} lines, so many writers). Model load: ${(loadMs / 1000).toFixed(1)} s (from the browser cache after the first download).

## Line level (each line image read on its own)

| Engine | CER (normalised, as the app reports it) | WER (normalised) | CER (exact characters) | Time per line |
|---|---|---|---|---|
| Handwriting model — TrOCR-small-handwritten (v18) | **${pct(sum.line.trocr.cer)}** | **${pct(sum.line.trocr.wer)}** | ${pct(sum.line.trocr.rawCer)} | ${Math.round(sum.line.trocr.ms)} ms |
| Tesseract 5 (printed-text OCR, v12–v17) | ${pct(sum.line.tess.cer)} | ${pct(sum.line.tess.wer)} | ${pct(sum.line.tess.rawCer)} | ${Math.round(sum.line.tess.ms)} ms |

## Page level (three lines stacked into a page: segmentation + reading)

| Engine | Pages | Lines found correctly | CER | WER |
|---|---|---|---|---|
| Handwriting model (segmented into lines) | ${sum.page.n} | ${sum.page.segmentedRight}/${sum.page.n} pages split into exactly 3 lines | **${pct(sum.page.trocr.cer)}** | **${pct(sum.page.trocr.wer)}** |
| Tesseract (whole page) | ${sum.page.n} | — | ${pct(sum.page.tess.cer)} | ${pct(sum.page.tess.wer)} |

The page path is what the app runs: each line is evened out and cut to its ink before reading. Reading the same ${sum.sameLines.n} lines as raw line images gives ${pct(sum.sameLines.trocr)} (model) and ${pct(sum.sameLines.tess)} (Tesseract), so the cleaning step accounts for part of the difference.

## Image tools on simulated poor photos (handwriting model, CER)

| Problem | Pages | Before the editor's automatic fix | After (flatten light + auto levels, + denoise for the noisy pages) |
|---|---|---|---|
${sum.tools.map(t => `| ${t.mode === 'dim' ? 'Dim photo with a side shadow' : t.mode === 'lowcontrast' ? 'Low contrast' : 'Speckle noise (4% of pixels)'} | ${t.n} | ${pct(t.before)} | ${pct(t.after)} |`).join('\n')}

## Is the confidence meaningful? (line level, handwriting model)

| Model confidence | Lines | Mean CER | Mean WER |
|---|---|---|---|
${sum.calibration.map(c => `| ${c.band} | ${c.n} | ${c.n ? pct(c.cer) : '—'} | ${c.n ? pct(c.wer) : '—'} |`).join('\n')}

## Method and limits

- **CER / WER**: Levenshtein edit distance between the recognised text and the reference transcription, divided by the reference length in characters / words; averaged per line. "Normalised" ignores case, punctuation and spacing — the same function the Handwriting Check uses. "Exact characters" compares the text as written (IAM's tokenised spacing removed from the reference first).
- **Data**: real handwriting by many writers (IAM, English, scanned forms). It is *not* students' phone photos: real photos add perspective, shadows and blur that these scans do not have — the page-level and image-tool rows only partly simulate that. Results on students' own writing have **not** been validated.
- **Possible overlap**: TrOCR was fine-tuned by its authors on IAM. Their split may not match Teklia's test split exactly, so some test lines might have been seen in training; treat the TrOCR line-level number as optimistic.
- **English only**: TrOCR-handwritten reads English. Arabic and mixed pages still use Tesseract, and the page says so.
- Nothing here measures or judges the writer. Error rates describe the software.
`;
  fs.writeFileSync(path.join(dir, 'handwriting-bench.md'), md);
  console.log(md);
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
})();
