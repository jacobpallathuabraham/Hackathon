/* ERLY Handwriting Studio v22 — end-to-end checks: ink engine, writing surface, practice, analysis, scan & analyze,
   the six assessment types, history, privacy and accessibility basics.
   Real-handwriting recognition is measured separately on IAM (tests/bench/hand-bench.js); here the scan path is also
   run on real IAM lines through the UI when tests/bench/.data/iam is present (it is not committed).
   NODE_PATH=$(npm root -g) node tests/e2e/handwriting-v22.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert'), fs = require('fs'), path = require('path');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const IAM = path.join(__dirname, '..', 'bench', '.data', 'iam');
let pass = 0, fail = 0; const results = [];
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.message).split('\n').slice(0, 6).join('\n      ')); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => sessionStorage.setItem('acubins-role', 'student'));
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const errs = [], posts = []; p.on('pageerror', e => errs.push(e.message)); p.on('request', r => { if (r.method() !== 'GET') posts.push(r.url()); });
  await p.goto(BASE + 'handwriting.html'); await p.waitForSelector('.hxs__vp'); await p.waitForTimeout(400);
  const surf = () => p.evaluate(() => ERLY.handStudio._surface().strokes.length);
  // writes `n` short strokes as word-like groups using the mouse
  async function scribble(lines, words, fast) {
    const box = await p.locator('.hxs__vp').boundingBox();
    for (let L = 0; L < lines; L++) for (let w = 0; w < words; w++) for (let l = 0; l < 3; l++) {
      const x = box.x + 40 + w * 120 + l * 22, y = box.y + 60 + L * 70; await p.mouse.move(x, y); await p.mouse.down();
      for (let k = 1; k <= 8; k++) { await p.mouse.move(x + 6 * Math.sin(k / 8 * 3), y + k * 4, { steps: fast ? 1 : 3 }); }
      await p.mouse.up();
    }
  }

  await t('page: four modes, honest framing, nothing stored before consent', async () => {
    assert.deepEqual(await p.$$eval('.hx-tabs [role=tab]', x => x.map(e => e.dataset.mode)), ['practice', 'scan', 'assess', 'history']);
    assert.match(await p.textContent('.hx-head'), /nothing is uploaded/i);
    assert.equal(await p.evaluate(() => localStorage.getItem('erly-hand-v22')), null);
  });

  await t('ink engine: four genuinely different personalities (same stroke, different ink area and width profile)', async () => {
    const r = await p.evaluate(() => { const I = ERLY.ink22, pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([20 + t * 260, 60 + Math.sin(t * 6.3) * 35, 0, t * 500]); }
      const area = k => { const c = document.createElement('canvas'); c.width = 300; c.height = 120; const x = c.getContext('2d'); I.draw(x, { pts, size: 4, ink: k, color: '#000' }, { cache: false }); const d = x.getImageData(0, 0, 300, 120).data; let n = 0; for (let i = 3; i < d.length; i += 4) n += d[i] / 255; return Math.round(n); };
      const prof = k => { const g = I.geometry({ pts, size: 4, ink: k }); const w = g.hw; return +(Math.max(...w) / Math.min(...w)).toFixed(2); };
      return Object.fromEntries(Object.keys(I.PERSONALITIES).map(k => [k, { area: area(k), ratio: prof(k) }])); });
    const areas = Object.values(r).map(x => x.area); assert.equal(new Set(areas).size, 4, JSON.stringify(r));
    assert.ok(r.precision.ratio < 1.25, 'precision is even ' + r.precision.ratio); assert.ok(r.classic.ratio > 3, 'classic has nib contrast ' + r.classic.ratio); assert.ok(r.signature.ratio > 2, 'signature tapers ' + r.signature.ratio);
    results.push(['ink', r]);
  });

  await t('ink engine: no fake pressure — a mouse never counts as pressure; speed thins the signature ink', async () => {
    const r = await p.evaluate(() => { const I = ERLY.ink22, line = dt => { const p = []; for (let i = 0; i <= 40; i++) p.push([i * 5, 0, 0.5, i * dt]); return p; }, mid = (pts, k) => { const w = I.widths(I.resample(pts, 1), { size: 4, kind: k }); return w[Math.floor(w.length / 2)] * 2; };
      return { mouse: I.realPressure([0.5, 0.5, 0.5, 0.5]), touch0: I.realPressure([0, 0, 0]), pen: I.realPressure([0.2, 0.35, 0.6, 0.7]), fast: mid(line(2), 'signature'), slow: mid(line(40), 'signature') }; });
    assert.equal(r.mouse, false); assert.equal(r.touch0, false); assert.equal(r.pen, true); assert.ok(r.fast < r.slow * 0.6, JSON.stringify(r));
  });

  await t('writing: strokes, undo/redo, eraser removes whole strokes, clear asks first', async () => {
    await scribble(1, 2); assert.equal(await surf(), 6);
    await p.click('[data-a="undo"]'); assert.equal(await surf(), 5); await p.click('[data-a="redo"]'); assert.equal(await surf(), 6);
    await p.click('[data-tool="eraser"]'); const box = await p.locator('.hxs__vp').boundingBox(); await p.mouse.move(box.x + 40, box.y + 75); await p.mouse.down(); await p.mouse.move(box.x + 46, box.y + 80, { steps: 3 }); await p.mouse.up();
    assert.equal(await surf(), 5, 'one stroke erased'); await p.click('[data-tool="pen"]');
    p.once('dialog', d => d.dismiss()); await p.click('[data-a="clear"]'); assert.equal(await surf(), 5, 'dismissed clear keeps the page');
    p.once('dialog', d => d.accept()); await p.click('[data-a="clear"]'); assert.equal(await surf(), 0);
    await p.click('[data-a="undo"]'); assert.equal(await surf(), 5, 'clear can be undone');
  });

  await t('latency: live ink costs well under a frame; full repaint of 600 strokes measured', async () => {
    await scribble(2, 4, true);
    const r = await p.evaluate(() => { const S = ERLY.handStudio._surface(), tm = S.timing, live = { avg: tm.total / tm.frames, max: tm.max };
      const many = []; for (let i = 0; i < 600; i++) { const pts = []; for (let k = 0; k < 20; k++) pts.push([30 + (i % 30) * 50 + k * 1.5, 40 + Math.floor(i / 30) * 40 + Math.sin(k / 3) * 8, 0, k * 12]); many.push({ pts, size: 3, ink: 'signature' }); }
      S.load({ W: S.W, H: S.H, strokes: many }); const t0 = performance.now(); S.repaint(); const rep = performance.now() - t0; S.undo && S.clear(); return { liveAvgMs: +live.avg.toFixed(3), liveMaxMs: +live.max.toFixed(2), repaint600Ms: Math.round(rep) }; });
    assert.ok(r.liveAvgMs < 4, JSON.stringify(r)); results.push(['latency', r]);
  });

  await t('paper styles, tracing, ink settles toggle, zoom, ink/size/colour controls', async () => {
    for (const v of ['white', 'warm', 'lined', 'grid', 'guides']) { await p.selectOption('[data-paper]', v); assert.equal(await p.getAttribute('.hxs__sheet', 'data-paper'), v); }
    await p.check('[data-trace]'); assert.match(await p.textContent('.hxs__trace'), /library opens/i);
    await p.uncheck('[data-reveal]'); assert.equal(await p.evaluate(() => ERLY.handStudio._surface().get('reveal')), false);
    await p.click('[data-a="zoomin"]'); assert.ok(await p.evaluate(() => ERLY.handStudio._surface().get('zoom')) > 1); await p.click('[data-a="zoomout"]');
    await p.click('[data-ink="signature"]'); assert.equal(await p.evaluate(() => ERLY.handStudio._surface().get('ink')), 'signature');
    await p.click('[data-color="#1f3a8a"]'); assert.equal(await p.evaluate(() => ERLY.handStudio._surface().get('color')), '#1f3a8a');
  });

  await t('presentation analysis: measured values with how they are measured; suggestion → drill and goal', async () => {
    await p.click('[data-cat="spacing"]'); await scribble(2, 4);
    await p.click('[data-act="analyse"]'); const tx = await p.textContent('.hx-out');
    for (const w of ['Space between words', 'Baseline', 'Letter size consistency', 'Slant', 'measurements of layout, not marks']) assert.ok(tx.includes(w), w);
    assert.doesNotMatch(tx, /\b(score|grade|dyslexi|dysgraph|disorder|diagnos)/i);
    const g = await p.$('[data-goal]'); if (g) { await g.click(); assert.match(await p.textContent('.hx-goals'), /0\/3|1\/3/); }
  });

  await t('export: PNG (as written) and clean PNG download; clean export is black ink on white', async () => {
    const [d1] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="png"]')]); assert.match(d1.suggestedFilename(), /\.png$/);
    const [d2] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="pngclean"]')]); assert.match(d2.suggestedFilename(), /clean\.png$/);
    const px = await p.evaluate(() => { const c = ERLY.handStudio._surface().exportImage({}); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let col = 0; for (let i = 0; i < d.length; i += 4) { if (Math.abs(d[i] - d[i + 2]) > 30) col++; } return { col, w: c.width, corner: [d[0], d[1], d[2]] }; });
    assert.equal(px.col, 0, 'no coloured pixels in the clean export'); assert.deepEqual(px.corner, [255, 255, 255]);
  });

  await t('save page: kept for the visit only until the student chooses to keep data', async () => {
    await p.click('[data-act="draft"]'); assert.equal(await p.evaluate(() => localStorage.getItem('erly-hand-v22')), null);
  });

  await t('scan & analyze: upload, quality assistant, rotate/straighten/crop/contrast, original vs processed', async () => {
    await p.click('[data-mode="scan"]');
    const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1400; c.height = 700; const x = c.getContext('2d'); x.fillStyle = '#f6f3ea'; x.fillRect(0, 0, 1400, 700); x.fillStyle = '#222'; x.font = '64px "Comic Sans MS", cursive';
      ['The library opens early on Monday.', 'Bring a pen and some paper.', 'We meet near the main gate.'].forEach((l, i) => x.fillText(l, 70, 170 + i * 150)); return c.toDataURL('image/png').split(',')[1]; });
    await p.setInputFiles('input[data-files]:not([capture])', [{ name: 'page1.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }, { name: 'page2.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }]);
    await p.waitForSelector('.hx-ed'); assert.equal(await p.locator('.hx-thumbs li').count(), 2);
    assert.ok(await p.locator('.hx-q li').count() >= 8, 'quality checklist');
    const w0 = await p.evaluate(() => document.querySelector('.hx-ed__cv').width); await p.click('[data-ed="rotr"]'); const w1 = await p.evaluate(() => document.querySelector('.hx-ed__cv').width); assert.notEqual(w0, w1, 'rotated');
    await p.click('[data-ed="rotl"]'); await p.click('[data-view="orig"]'); assert.equal(await p.getAttribute('[data-view="orig"]', 'aria-checked'), 'true');
    await p.click('[data-ed="crop"]'); const box = await p.locator('.hx-ed__img').boundingBox(); await p.mouse.move(box.x + 10, box.y + 10); await p.mouse.down(); await p.mouse.move(box.x + box.width - 10, box.y + box.height - 20, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(200);
    assert.equal(await p.isDisabled('[data-ed="uncrop"]'), false, 'cropped');
    await p.fill('[data-ed-r="contrast"]', '30'); await p.dispatchEvent('[data-ed-r="contrast"]', 'input'); await p.waitForTimeout(250);
    await p.click('[data-delpage="1"]'); assert.equal(await p.locator('.hx-thumbs li').count(), 1);
  });

  await t('scan: the quick reader (Tesseract) reads a synthetic page, with per-word engine confidence and editable text', async () => {
    p.setDefaultTimeout(120000);
    await p.evaluate(() => { ERLY.handStudio.state().engine = 'tesseract'; });
    await p.click('[data-scanread]'); await p.waitForSelector('.hx-res', { timeout: 120000 });
    const txt = await p.inputValue('.hx-res [data-confirmed]'); assert.match(txt, /library/i, txt);
    assert.ok(await p.locator('.hx-res .hx-w').count() >= 5); assert.match(await p.textContent('.hx-res'), /software’s own estimate/);
    results.push(['scan-synthetic-tesseract', txt.replace(/\s+/g, ' ').slice(0, 120)]);
    p.setDefaultTimeout(8000);
  });

  await t('assess: six types offered; copy task → instructions → focused writing → results with every section', async () => {
    await p.click('[data-mode="assess"]'); assert.equal(await p.locator('[data-astype]').count(), 6);
    await p.click('[data-astype="copy"]'); assert.match(await p.textContent('.hx-as--intro'), /Not measured/);
    await p.click('[data-asstart]'); await p.waitForSelector('.hxs__vp'); await scribble(2, 4);
    p.setDefaultTimeout(120000); await p.click('[data-asfinish]'); await p.waitForSelector('.hx-as--result', { timeout: 120000 }); p.setDefaultTimeout(8000);
    const tx = await p.textContent('.hx-as--result'); for (const w of ['Completed', 'What the software read', 'What can be measured', 'Compared with your last attempt', 'Limitations']) assert.ok(tx.includes(w), w);
  });

  await t('the student confirms the text before any comparison — software errors are not their errors', async () => {
    await p.fill('[data-confirmed]', 'The library opens early on Monday. Bring a pen and paper.'); await p.click('[data-confirm]'); await p.waitForTimeout(200);
    const tx = await p.textContent('.hx-as--result'); assert.match(tx, /on the text you confirmed/); assert.match(tx, /Not found/); assert.match(tx, /some/);
  });

  await t('saving asks for consent first; then history compares only the same task', async () => {
    await p.click('[data-assave]'); await p.waitForSelector('.hx-dlg'); assert.match(await p.textContent('.hx-dlg'), /Not saved: photos/); await p.click('.hx-dlg [data-ok]'); await p.waitForTimeout(200);
    assert.ok(await p.evaluate(() => JSON.parse(localStorage.getItem('erly-hand-v22')).attempts.length === 1));
    await p.click('[data-asretry]'); await p.click('[data-asstart]'); await scribble(1, 3);
    p.setDefaultTimeout(120000); await p.click('[data-asfinish]'); await p.waitForSelector('.hx-as--result'); p.setDefaultTimeout(8000);
    assert.doesNotMatch(await p.textContent('.hx-as--result'), /No earlier attempt at this exact task/);
    await p.click('[data-assave]'); await p.click('[data-mode="history"]'); assert.match(await p.textContent('.hx-hist'), /Comparable attempts/);
  });

  await t('timed, sentence, letters, free and photo types start with their own instructions', async () => {
    await p.click('[data-mode="assess"]'); if (await p.$('[data-asdone]')) await p.click('[data-asdone]'); // an unsaved result stays until the student leaves it
    for (const k of ['timed', 'sentence', 'letters', 'free', 'photo']) { await p.click(`[data-astype="${k}"]`); assert.ok(await p.isVisible('.hx-as--intro'), k); if (k === 'timed') assert.ok(await p.isVisible('[data-timer]')); await p.click('[data-asback]'); }
    await p.click('[data-astype="photo"]'); await p.click('[data-asstart]'); assert.ok(await p.isVisible('input[data-asphoto]:not([capture])') || await p.locator('input[data-asphoto]').count() === 2); assert.equal(await p.isDisabled('[data-asfinish]'), true);
    await p.click('[data-ascancel]');
  });

  await t('Arabic: writing direction and prompts switch, labelled experimental and read by Tesseract only', async () => {
    await p.click('[data-mode="practice"]'); await p.click('[data-lang="ar"]'); await p.waitForTimeout(300);
    assert.equal(await p.getAttribute('.hx-prompt', 'dir'), 'rtl'); assert.match(await p.textContent('.hx-items'), /[؀-ۿ]/);
    assert.equal(await p.evaluate(() => ERLY.handOCR.pick('ar').id), 'tesseract'); assert.match(await p.textContent('.hx-head'), /experimental/);
    await p.click('[data-lang="en"]');
  });

  await t('privacy: export my data, stop keeping deletes it, delete everything', async () => {
    await p.click('[data-mode="history"]'); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-export]')]); assert.match(dl.suggestedFilename(), /\.json$/);
    p.once('dialog', d => d.accept()); await p.click('[data-consentset="visit"]'); await p.waitForTimeout(200);
    assert.equal(await p.evaluate(() => localStorage.getItem('erly-hand-v22')), null);
  });

  await t('keyboard: arrow keys move between mode tabs; dialogs close on Escape', async () => {
    await p.focus('[data-mode="history"]'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(200); assert.equal(await p.getAttribute('[data-mode="assess"]', 'aria-selected'), 'true');
  });

  await t('Growth Plan link handwriting.html?practice=letters opens letter practice', async () => {
    const q = await ctx.newPage(); await q.goto(BASE + 'handwriting.html?practice=letters'); await q.waitForSelector('.hxs__vp'); assert.equal(await q.getAttribute('[data-cat="letters"]', 'aria-pressed'), 'true'); await q.close();
  });

  await t('phone: no horizontal overflow; drawing with touch works', async () => {
    const m = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await m.addInitScript(() => sessionStorage.setItem('acubins-role', 'student')); const q = await m.newPage();
    await q.goto(BASE + 'handwriting.html'); await q.waitForSelector('.hxs__vp');
    for (const md of ['practice', 'scan', 'assess', 'history']) { await q.click(`[data-mode="${md}"]`); await q.waitForTimeout(250); const ov = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov <= 1, md + ' overflow ' + ov); }
    await m.close();
  });

  if (fs.existsSync(path.join(IAM, 'manifest.json')) && !process.env.SKIP_IAM) {
    await t('REAL handwriting through the app (IAM lines, scan path, handwriting model): measured, not asserted to be perfect', async () => {
      const man = JSON.parse(fs.readFileSync(path.join(IAM, 'manifest.json'), 'utf8')), pick = [man.lines[3], man.lines[4], man.lines[5]];
      const imgs = pick.map(l => fs.readFileSync(path.join(IAM, l.file)).toString('base64'));
      await p.click('[data-mode="scan"]'); while (await p.locator('[data-delpage]').count()) await p.click('[data-delpage="0"]');
      const page = await p.evaluate(async ims => { const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; }); const L = await Promise.all(ims.map(load)); const W = Math.max(...L.map(i => i.width)) + 80, H = L.reduce((a, i) => a + i.height + 40, 40); const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); let y = 40; L.forEach(i => { x.drawImage(i, 40, y); y += i.height + 40; }); return c.toDataURL('image/png').split(',')[1]; }, imgs);
      await p.setInputFiles('input[data-files]:not([capture])', { name: 'iam-page.png', mimeType: 'image/png', buffer: Buffer.from(page, 'base64') });
      await p.waitForSelector('.hx-ed');
      p.setDefaultTimeout(600000);
      await p.evaluate(async () => { await ERLY.handOCR.ENGINES.trocr.load(); ERLY.handStudio.state().engine = 'trocr'; });
      await p.click('[data-scanread]'); await p.waitForSelector('.hx-res', { timeout: 600000 }); p.setDefaultTimeout(8000);
      const got = await p.inputValue('.hx-res [data-confirmed]'), ref = pick.map(l => l.text.replace(/ ([.,;:!?'")])/g, '$1').replace(/([("]) /g, '$1')).join(' ');
      const r = await p.evaluate(([a, b]) => ERLY_HAND.errorRates(a, b, 'en'), [ref, got]);
      results.push(['iam-ui', { cer: +(r.cer * 100).toFixed(1), wer: +(r.wer * 100).toFixed(1), ref, got }]);
      assert.ok(r.cer < 0.4, 'CER ' + r.cer);
    });
  }

  await t('no uploads and no page errors', async () => { assert.deepEqual(posts, []); assert.deepEqual(errs, []); });

  console.log('\nRESULTS ' + JSON.stringify(results));
  console.log(`\n${pass}/${pass + fail} passed`); await b.close(); process.exit(fail ? 1 : 0);
})();
