// Mixed Arabic + English pages: is it reliable enough to offer? Measured, not assumed.
// Each page has English and Arabic lines (handwriting-style fonts, OFL; synthetic, not real handwriting).
// Recognised with the English model, the Arabic model, and both together ("ara+eng").
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/eval/handwriting-mixed-eval.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const ROOT = path.join(__dirname, '..', '..');
const PAIRS = [['Patrick_Hand', 'Amiri'], ['Kalam', 'Aref_Ruqaa'], ['Caveat', 'Reem_Kufi'], ['Indie_Flower', 'Amiri']];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(BASE + 'student.html').catch(() => {});
  await p.setContent('<!doctype html><meta charset="utf-8"><body></body>');
  await p.addScriptTag({ url: BASE + 'assets/js/handwriting.js' }); await p.addScriptTag({ url: BASE + 'assets/vendor/tesseract/tesseract.min.js' });
  const fonts = {}; for (const pr of PAIRS) for (const f of pr) fonts[f] = fs.readFileSync(path.join(ROOT, 'tests/fixtures/fonts', f + '.ttf')).toString('base64');
  const rows = await p.evaluate(async ({ PAIRS, fonts, BASE }) => {
    const H = window.ERLY_HAND;
    for (const [n, b64] of Object.entries(fonts)) { const ff = new FontFace(n, `url(data:font/ttf;base64,${b64})`); await ff.load(); document.fonts.add(ff); }
    const opt = { workerPath: BASE + 'assets/vendor/tesseract/worker.min.js', corePath: BASE + 'assets/vendor/tesseract/core', langPath: BASE + 'assets/vendor/tesseract/lang', gzip: true, workerBlobURL: false };
    const W = {}; for (const l of ['eng', 'ara', 'ara+eng']) W[l] = await Tesseract.createWorker(l, 1, opt);
    const out = [];
    for (const [i, [fe, fa]] of PAIRS.entries()) {
      const en = H.PROMPTS.en[i % H.PROMPTS.en.length].slice(0, 2), ar = H.PROMPTS.ar[i % H.PROMPTS.ar.length].slice(0, 2);
      const c = document.createElement('canvas'); c.width = 1400; c.height = 1000; const g = c.getContext('2d'); g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, 1400, 1000); g.fillStyle = '#1d2433';
      g.font = `58px "${fe}"`; g.textAlign = 'left'; g.direction = 'ltr'; en.forEach((l, k) => g.fillText(l, 120, 220 + k * 150));
      g.font = `58px "${fa}"`; g.textAlign = 'right'; g.direction = 'rtl'; ar.forEach((l, k) => g.fillText(l, 1280, 540 + k * 150));
      const d = g.getImageData(0, 0, 1400, 1000), img = { gray: H.toGray(d.data, 1400, 1000), width: 1400, height: 1000 }, q = H.quality(img);
      const prep = H.prepare(img, q.stats.skew), cv = document.createElement('canvas'); cv.width = prep.width; cv.height = prep.height; const id = cv.getContext('2d').createImageData(prep.width, prep.height);
      for (let k = 0; k < prep.gray.length; k++) id.data.set([prep.gray[k], prep.gray[k], prep.gray[k], 255], k * 4); cv.getContext('2d').putImageData(id, 0, 0);
      const row = { fonts: fe + '+' + fa, accepted: q.ok };
      for (const l of Object.keys(W)) {
        const { data } = await W[l].recognize(cv);
        // score each language against only its own lines, using only the recognised characters of that script
        const enGot = data.text.replace(/[؀-ۿ]+/g, ' '), arGot = data.text.replace(/[A-Za-z]+/g, ' ');
        row[l] = { en: +H.errorRates(en.join(' '), enGot, 'en').cer.toFixed(3), ar: +H.errorRates(ar.join(' '), arGot, 'ar').cer.toFixed(3) };
      }
      out.push(row);
    }
    for (const w of Object.values(W)) await w.terminate();
    return out;
  }, { PAIRS, fonts, BASE });
  await b.close();
  const mean = (l, k) => +(rows.reduce((s, r) => s + r[l][k], 0) / rows.length).toFixed(3);
  const summary = Object.fromEntries(['eng', 'ara', 'ara+eng'].map(l => [l, { enCER: mean(l, 'en'), arCER: mean(l, 'ar') }]));
  fs.writeFileSync(path.join(ROOT, 'docs/handwriting-mixed-eval.json'), JSON.stringify({ date: new Date().toISOString(), note: 'Synthetic mixed Arabic + English pages (font-rendered), not real handwriting. CER per language, scored against that language\'s lines only.', summary, rows }, null, 1));
  console.log(JSON.stringify({ summary, rows }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
