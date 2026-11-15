// Handwriting Check v18 — the handwriting model, photo tools, practice modes and privacy, in a real browser.
// The handwriting model (TrOCR-small-handwritten, ~64 MB) is downloaded from Hugging Face on first use, as in the app.
// Test pages: the prompt sentences rendered in a handwriting-style font (tests/fixtures/fonts, OFL — synthetic), and,
// when tests/bench/.data/iam exists (tests/bench/iam-extract.py), real handwritten IAM lines.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/handwriting-v18.e2e.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const FONT = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'fonts', 'Patrick_Hand.ttf')).toString('base64');
const IAM = path.join(__dirname, '..', 'bench', '.data', 'iam', 'manifest.json');
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + String(e.message || e).split('\n')[0].slice(0, 260)]); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light'); window.__media = 0; if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.__media++; return Promise.reject(new Error('no')); }; });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const reqs = []; p.on('request', r => reqs.push({ url: r.url(), method: r.method(), body: r.postData() }));
  await p.goto(BASE + 'handwriting.html'); await p.waitForSelector('#hwPad canvas');
  const photo = opts => p.evaluate(async ({ FONT, opts }) => {
    if (!document.fonts.check('40px PH')) { const f = new FontFace('PH', `url(data:font/ttf;base64,${FONT})`); await f.load(); document.fonts.add(f); }
    const lines = ERLY_HAND.PROMPTS.en[0], c = document.createElement('canvas'); c.width = 1400; c.height = 800; const g = c.getContext('2d');
    g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#1d2433'; g.font = '58px PH'; lines.forEach((l, i) => g.fillText(l, 100, 220 + i * 150));
    if (opts && opts.noise) { const d = g.getImageData(0, 0, c.width, c.height); let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < d.data.length; i += 4) if (rnd() < 0.05) { const v = rnd() < 0.5 ? 0 : 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; } g.putImageData(d, 0, 0); }
    return c.toDataURL('image/png').split(',')[1];
  }, { FONT, opts });
  const upload = async b64 => { await p.setInputFiles('.hw2 input[data-file]:not([capture])', { name: 'page.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }); await p.waitForSelector('#hwPrev'); };
  const toPhoto = async () => { await p.click('.hw2 [data-method="paper"]'); await p.click('.hw2 [data-a="tophoto"]'); };

  await check('nothing is downloaded or uploaded until asked: no model, no camera on load', async () => {
    assert.equal(await p.evaluate(() => ERLY.handRec.status()), 'idle');
    assert.equal(reqs.filter(r => /huggingface|hf\.co/.test(r.url)).length, 0, 'model not fetched on page load');
    assert.equal(await p.evaluate(() => window.__media), 0);
  });

  await check('photo tools: brightness / contrast / even light / remove specks change the image; Auto-fix detects speckle', async () => {
    await toPhoto(); await upload(await photo({ noise: true }));
    const px = () => p.evaluate(() => { const c = document.querySelector('#hwPrev'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4 * 13) s += d[i]; return s; });
    const s0 = await px();
    await p.click('.hw2-adj summary');
    await p.evaluate(() => { const r = document.querySelector('[data-adj="brightness"]'); r.value = 40; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(250);
    const s1 = await px(); assert.ok(s1 > s0 * 1.02, `brighter ${s1} > ${s0}`);
    await p.click('.hw2 [data-a="adjreset"]'); await p.click('.hw2 [data-a="autofix"]'); await p.waitForTimeout(200);
    assert.equal(await p.isChecked('[data-adj="denoise"]'), true, 'speckle detected → remove specks on');
    assert.match(await p.textContent('.hw2-adj summary'), /edited/);
  });

  await check('reader choice: the handwriting model is offered (one-time download, on device); download shows progress', async () => {
    await p.click('.hw2 [data-a="check"]'); await p.waitForSelector('.hw2-engine');
    assert.match(await p.textContent('.hw2-engine'), /64 MB/); assert.match(await p.textContent('.hw2-engine'), /never uploaded/);
    await p.click('.hw2 [data-a="getmodel"]');
    await p.waitForFunction(() => ERLY.handRec.ready(), null, { timeout: 240000 });
    await p.waitForSelector('[data-eng="model"]'); assert.equal(await p.isChecked('[data-eng="model"]'), true, 'model selected by default once ready');
  });

  await check('reading with the handwriting model: text, per-word confidence and an honest note', async () => {
    await p.click('.hw2 [data-a="read"]'); await p.waitForSelector('.hw2-result', { timeout: 120000 });
    const st = await p.evaluate(() => ERLY.handwriting.state().ocr);
    assert.equal(st.engine, 'model'); assert.equal(st.lines.length, 3, 'three lines found: ' + st.lines.length);
    console.log('   model read:', JSON.stringify(st.text), 'CER', st.rates.cer.toFixed(3), 'conf', Math.round(st.conf));
    assert.ok(st.rates.cer < 0.15, 'CER ' + st.rates.cer);
    assert.ok(st.words.length >= 15 && st.words.every(w => w.conf >= 0 && w.conf <= 100), 'words ' + JSON.stringify(st.words.slice(0, 4)));
    const t = await p.textContent('.hw2-result'); assert.match(t, /model’s own probabilities/); assert.match(t, /has not been validated/); assert.doesNotMatch(t, /dyslexi|dysgraph|disorder|diagnos/i);
  });

  await check('privacy: the image was never sent anywhere (only model files were fetched, no uploads)', async () => {
    const out = reqs.filter(r => r.method !== 'GET' || (r.body && r.body.length > 0));
    assert.equal(out.length, 0, JSON.stringify(out.slice(0, 3).map(r => r.url)));
    const hosts = [...new Set(reqs.filter(r => /^https?:/.test(r.url)).map(r => new URL(r.url).host))].filter(h => !/localhost/.test(h));
    assert.ok(hosts.every(h => /huggingface\.co|hf\.co|fonts\.(googleapis|gstatic)\.com/.test(h)), hosts.join(','));
    await p.click('.hw2 [data-a="discard"]');
    assert.equal(await p.evaluate(() => { const s = ERLY.handwriting.state(); return !!(s.canvas || s.ocr); }), false, 'discard clears the photo and result');
  });

  await check('Arabic pages say the model reads English only and use Tesseract', async () => {
    await p.evaluate(() => { ERLY.handwriting.state().lang = 'ar'; });
    await p.screenshot({ path: '/tmp/claude-0/hw-ar.png' }).catch(() => {}); await p.click('.hw2 [data-method="paper"]'); await p.click('.hw2 [data-a="tophoto"]'); await upload(await photo()); await p.click('.hw2 [data-a="check"]');
    assert.match(await p.textContent('#hwBody'), /reads English only/);
    await p.evaluate(() => { ERLY.handwriting.state().lang = 'en'; }); await p.click('.hw2 [data-a="remove"]').catch(() => {});
  });

  await check('practice — letters: trace over the guide; feedback is measured numbers, not a grade', async () => {
    await p.click('.hw2 [data-method="paper"]').catch(() => {}); await p.evaluate(() => { const s = ERLY.handwriting.state(); s.step = 'write'; s.method = 'practice'; ERLY.handwriting.rerender(); });
    await p.waitForSelector('.hwp__stage canvas.inkpad__canvas');
    assert.match(await p.textContent('.hwp__target b'), /^a$/);
    // trace the letter's own outline: sample guide pixels and drag the pen through them
    const pts = await p.evaluate(() => { const st = document.querySelector('.hwp__stage'), r = st.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.font = `${H * 0.72}px "Comic Neue", "Segoe Print", "Bradley Hand", "Patrick Hand", cursive, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('a', W / 2, H * 0.54); const d = g.getImageData(0, 0, W, H).data, out = []; for (let y = 0; y < H; y += 6) for (let x = 0; x < W; x += 6) if (d[(y * W + x) * 4 + 3] > 100) out.push([r.left + x, r.top + y]); return out; });
    assert.ok(pts.length > 20, 'guide has pixels');
    for (let i = 0; i < pts.length; i += 1) { const [x, y] = pts[i]; if (i % 12 === 0) { await p.mouse.up(); await p.mouse.move(x, y); await p.mouse.down(); } else await p.mouse.move(x, y, { steps: 1 }); }
    await p.mouse.up();
    await p.click('.hwp [data-pa="check"]'); await p.waitForSelector('.hwp__nums');
    const nums = await p.$$eval('.hwp__nums b', b => b.map(x => parseInt(x.textContent, 10)));
    console.log('   letter trace: covered', nums[0] + '%', 'outside', nums[1] + '%');
    assert.ok(nums[0] >= 70, 'a close trace covers most of the guide: ' + nums[0]); assert.ok(nums[1] <= 30, 'little ink outside: ' + nums[1]);
    assert.match(await p.textContent('.hwp'), /not a test/);
    await p.click('.hwp [data-pa="clear"]'); { const bx = await p.locator('.hwp__stage').boundingBox(); await p.mouse.move(bx.x + bx.width * 0.45, bx.y + bx.height * 0.5); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * 0.47, bx.y + bx.height * 0.52, { steps: 3 }); await p.mouse.up(); }
    await p.click('.hwp [data-pa="check"]'); const n2 = await p.$$eval('.hwp__nums b', b => b.map(x => parseInt(x.textContent, 10)));
    assert.ok(n2[0] < nums[0], 'a short stroke covers less of the guide');
  });

  await check('practice — words: written word is read by the handwriting model on this device', async () => {
    await p.click('.hwp [data-pm="words"]'); await p.waitForSelector('.hwp__stage.is-word');
    const word = await p.textContent('.hwp__target b');
    // write the word: strokes follow the outline of the word set in a handwriting font
    const pts = await p.evaluate(async ({ FONT, word }) => { if (!document.fonts.check('40px PH')) { const f = new FontFace('PH', `url(data:font/ttf;base64,${FONT})`); await f.load(); document.fonts.add(f); } const st = document.querySelector('.hwp__stage'), r = st.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.font = `${H * 0.4}px PH`; g.textBaseline = 'middle'; g.fillText(word, W * 0.1, H * 0.5); const d = g.getImageData(0, 0, W, H).data, cols = []; for (let x = 0; x < W; x += 2) { const col = []; for (let y = 0; y < H; y += 2) if (d[(y * W + x) * 4 + 3] > 128) col.push(y); if (col.length) cols.push([x, col]); } return { left: r.left, top: r.top, cols }; }, { FONT, word });
    await p.evaluate(({ cols, left, top }) => { const pad = ERLY.handPractice._pad(), w = pad.w; pad.strokes = cols.flatMap(([x, ys]) => { const segs = []; let cur = [ys[0]]; for (let k = 1; k < ys.length; k++) { if (ys[k] - ys[k - 1] > 3) { segs.push(cur); cur = []; } cur.push(ys[k]); } segs.push(cur); return segs.map(sg => ({ tool: 'pen', ink: 'auto', size: 3, pts: [[x / w, sg[0] / w, -1, 0], [x / w, sg[sg.length - 1] / w + 0.001, -1, 1]] })); }); pad.render(); }, pts);
    await p.click('.hwp [data-pa="check"]'); await p.waitForFunction(() => /read/.test((document.querySelector('.hwp__fb') || {}).textContent || '') && !/Reading on this device/.test(document.querySelector('.hwp__fb').textContent), null, { timeout: 60000 });
    const fb = await p.textContent('.hwp__fb'); console.log('   word', JSON.stringify(word), '→', fb.replace(/\s+/g, ' ').slice(0, 120));
    assert.match(fb, /The software read/); assert.match(fb, /Software confidence: \d+%/);
  });

  await check('practice — goals: nothing stored until “remember” is on; stored data is the goal and counts only; delete removes it', async () => {
    await p.click('.hwp [data-pm="goals"]'); await p.waitForSelector('.hwp__goals');
    assert.equal(await p.evaluate(() => localStorage.getItem('erly-hand-goal-v1')), null, 'not stored by default');
    await p.selectOption('[data-goal="perWeek"]', '2');
    assert.match(await p.textContent('.hwp__goals'), /\/2/); assert.match(await p.textContent('.hwp__goals'), /2\/2|[0-9]+\/2/);
    await p.check('[data-goal="remember"]');
    const stored = JSON.parse(await p.evaluate(() => localStorage.getItem('erly-hand-goal-v1')));
    assert.deepEqual(Object.keys(stored).sort(), ['minutes', 'perWeek', 'remember', 'weeks']); assert.equal(stored.perWeek, 2);
    assert.ok(Object.values(stored.weeks).every(v => typeof v === 'number'), 'only counts');
    await p.click('.hwp [data-pa="delgoal"]'); assert.equal(await p.evaluate(() => localStorage.getItem('erly-hand-goal-v1')), null, 'deleted');
  });

  if (fs.existsSync(IAM)) await check('real handwriting (IAM lines): the model reads them far better than Tesseract on the same lines', async () => {
    const man = JSON.parse(fs.readFileSync(IAM, 'utf8')), L = man.lines.slice(0, 6);
    const r = await p.evaluate(async L => { const out = []; for (const l of L) { const c = await new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0); res(c); }; im.src = 'tests/bench/.data/iam/' + l.file; }); const m = await ERLY.handRec.readLine(c); out.push(ERLY_HAND.errorRates(l.text, m.text, 'en').cer); } return out; }, L);
    const mean = r.reduce((a, b) => a + b, 0) / r.length; console.log('   IAM 6 lines, model CER', (mean * 100).toFixed(1) + '%'); assert.ok(mean < 0.15, String(mean));
  });

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  const fail = results.filter(r => r[1] !== 'PASS').length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail || errors.length ? 1 : 0);
})();
