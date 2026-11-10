// Handwriting Check — measured evaluation of the real pipeline (quality checks → preparation → local Tesseract).
// Synthetic images: known sentences rendered in handwriting-style fonts (tests/fixtures/fonts, OFL),
// then degraded (rotation, blur, dim light, cropping, small writing, sideways). These are NOT real
// student handwriting, so the numbers describe the pipeline on font-rendered text only.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/eval/handwriting-eval.js
// Writes docs/handwriting-eval.json and prints a summary table.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const ROOT = path.join(__dirname, '..', '..');
const FONTS = { en: ['Caveat', 'Patrick_Hand', 'Indie_Flower', 'Kalam', 'Shadows_Into_Light', 'Homemade_Apple'], ar: ['Aref_Ruqaa', 'Amiri', 'Reem_Kufi'] };
const CONDITIONS = ['clean', 'tilt8', 'small', 'blur', 'dim', 'cropped', 'sideways', 'mixed'];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(BASE + 'student.html').catch(() => {});
  await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  await p.addScriptTag({ url: BASE + 'assets/js/handwriting.js' });
  await p.addScriptTag({ url: BASE + 'assets/vendor/tesseract/tesseract.min.js' });
  const fontsB64 = {};
  for (const f of [...FONTS.en, ...FONTS.ar]) fontsB64[f] = fs.readFileSync(path.join(ROOT, 'tests/fixtures/fonts', f + '.ttf')).toString('base64');
  const results = await p.evaluate(async ({ FONTS, CONDITIONS, fontsB64, BASE }) => {
    const H = window.ERLY_HAND;
    for (const [name, b64] of Object.entries(fontsB64)) { const ff = new FontFace(name, `url(data:font/ttf;base64,${b64})`); await ff.load(); document.fonts.add(ff); }
    const workers = {};
    const worker = async lang => workers[lang] || (workers[lang] = await Tesseract.createWorker(lang === 'ar' ? 'ara' : 'eng', 1, { workerPath: BASE + 'assets/vendor/tesseract/worker.min.js', corePath: BASE + 'assets/vendor/tesseract/core', langPath: BASE + 'assets/vendor/tesseract/lang', gzip: true, workerBlobURL: false }));
    function render(lines, font, lang, cond, seed) {
      let r = seed; const rnd = () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; };
      const W = 1400, Hh = 1000, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
      g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, W, Hh);
      const size = cond === 'small' ? 15 : 58;
      g.fillStyle = '#1d2433'; g.font = `${size}px "${font}"`; g.textBaseline = 'alphabetic'; g.direction = lang === 'ar' ? 'rtl' : 'ltr'; g.textAlign = lang === 'ar' ? 'right' : 'left';
      const x0 = lang === 'ar' ? W - 120 : 120;
      lines.forEach((ln, i) => { g.save(); g.translate(x0, 260 + i * (size * 2.4) + (rnd() - 0.5) * 6); g.rotate((rnd() - 0.5) * 0.02); g.fillText(ln, 0, 0); g.restore(); });
      let out = c;
      const xf = (fn, w = W, h = Hh) => { const d = document.createElement('canvas'); d.width = w; d.height = h; const dg = d.getContext('2d'); dg.fillStyle = '#f7f3ea'; dg.fillRect(0, 0, w, h); fn(dg); return d; };
      if (cond === 'tilt8' || cond === 'mixed') out = xf(dg => { dg.translate(W / 2, Hh / 2); dg.rotate(8 * Math.PI / 180); dg.drawImage(out, -W / 2, -Hh / 2); });
      if (cond === 'blur') out = xf(dg => { dg.filter = 'blur(5px)'; dg.drawImage(out, 0, 0); });
      if (cond === 'dim' || cond === 'mixed') out = xf(dg => { dg.filter = cond === 'dim' ? 'brightness(0.22)' : 'brightness(0.7)'; dg.drawImage(out, 0, 0); });
      if (cond === 'cropped') out = xf(dg => dg.drawImage(out, lang === 'ar' ? 420 : -420, 0));
      if (cond === 'sideways') out = xf(dg => { dg.translate(Hh, 0); dg.rotate(Math.PI / 2); dg.drawImage(out, 0, 0); }, Hh, W);
      const d = out.getContext('2d').getImageData(0, 0, out.width, out.height);
      return { gray: H.toGray(d.data, out.width, out.height), width: out.width, height: out.height };
    }
    function toCanvas(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const d = c.getContext('2d').createImageData(img.width, img.height); for (let i = 0; i < img.gray.length; i++) { const v = img.gray[i]; d.data.set([v, v, v, 255], i * 4); } c.getContext('2d').putImageData(d, 0, 0); return c; }
    const rows = [];
    for (const lang of ['en', 'ar']) for (const font of FONTS[lang]) for (const cond of CONDITIONS) {
      const set = H.PROMPTS[lang][(font.length + cond.length) % H.PROMPTS[lang].length];
      const img = render(set, font, lang, cond, font.length * 31 + cond.length);
      const q = H.quality(img);
      const row = { lang, font, cond, accepted: q.ok, issues: q.checks.filter(c => !c.ok).map(c => c.id) };
      if (q.ok) {
        const prep = H.prepare(img, q.stats.skew);
        const w = await worker(lang);
        const t0 = performance.now();
        const { data } = await w.recognize(toCanvas(prep));
        const r = H.errorRates(set.join(' '), data.text, lang);
        Object.assign(row, { cer: +r.cer.toFixed(3), wer: +r.wer.toFixed(3), conf: Math.round(data.confidence), outcome: H.outcome(r, data.confidence), ms: Math.round(performance.now() - t0), text: data.text.replace(/\s+/g, ' ').trim().slice(0, 120) });
      }
      rows.push(row);
    }
    for (const w of Object.values(workers)) await w.terminate();
    return rows;
  }, { FONTS, CONDITIONS, fontsB64, BASE });
  await b.close();
  // summary
  const sum = {};
  for (const lang of ['en', 'ar']) {
    const R = results.filter(r => r.lang === lang), ok = R.filter(r => r.accepted && r.cer != null);
    const by = c => { const x = R.filter(r => r.cond === c); const y = x.filter(r => r.cer != null); return { n: x.length, rejected: x.length - y.length, cer: y.length ? +(y.reduce((s, r) => s + r.cer, 0) / y.length).toFixed(3) : null, wer: y.length ? +(y.reduce((s, r) => s + r.wer, 0) / y.length).toFixed(3) : null }; };
    sum[lang] = { images: R.length, rejected: R.length - ok.length, meanCER: ok.length ? +(ok.reduce((s, r) => s + r.cer, 0) / ok.length).toFixed(3) : null, meanWER: ok.length ? +(ok.reduce((s, r) => s + r.wer, 0) / ok.length).toFixed(3) : null, recognised: ok.filter(r => r.outcome === 'clear').length, partial: ok.filter(r => r.outcome === 'partial').length, inconclusive: ok.filter(r => r.outcome === 'inconclusive').length, byCondition: Object.fromEntries(CONDITIONS.map(c => [c, by(c)])) };
  }
  fs.writeFileSync(path.join(ROOT, 'docs/handwriting-eval.json'), JSON.stringify({ date: new Date().toISOString(), note: 'Synthetic, font-rendered handwriting-style text; not real student handwriting.', summary: sum, results }, null, 1));
  console.log(JSON.stringify(sum, null, 1));
  results.forEach(r => console.log([r.lang, r.font.padEnd(18), r.cond.padEnd(9), r.accepted ? 'ok ' : 'REJ', r.issues.join(',').padEnd(18), r.cer != null ? 'CER ' + r.cer : '', r.outcome || ''].join(' ')));
})().catch(e => { console.error(e); process.exit(1); });
