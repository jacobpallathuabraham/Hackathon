// v13 — full-viewport ink transition + Handwriting Check writing studio, in a real browser.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/ink-studio.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctxFor = async (opts = {}) => {
    const c = await b.newContext(Object.assign({ viewport: { width: 1280, height: 820 } }, opts));
    await c.addInitScript(t => { sessionStorage.setItem('acubins-role', 'student'); if (!localStorage.getItem('erly-theme')) localStorage.setItem('erly-theme', t); }, opts.theme || 'light');
    return c;
  };
  const watch = p => { p.on('pageerror', e => errors.push(e.message + ' @' + p.url().split('/').pop() + ' t=' + Date.now() % 100000)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|ViewTransition/.test(m.text())) errors.push(m.text()); }); };
  // sample how much of the viewport the overlay covers, every 80 ms, from the moment of the click
  const startSampling = p => p.evaluate(() => { window.__cov = []; window.__blocked = null; const t0 = performance.now(); const tick = () => { const cv = document.querySelector('canvas.ink-fx'); if (cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0, k = 0; for (let i = 3; i < d.length; i += 4 * 61) { k++; if (d[i] > 200) n++; } window.__cov.push(n / k); if (window.__blocked == null) window.__blocked = document.elementFromPoint(innerWidth / 2, innerHeight / 2) === cv; } if (performance.now() - t0 < 2600) setTimeout(tick, 80); }; setTimeout(tick, 20); });

  /* ---------- 1 · the transition ---------- */
  let c = await ctxFor(), p = await c.newPage(); watch(p);
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('#games [data-hand-open]').scrollIntoView({ block: 'center' }));
  let tReq = 0; p.on('request', r => { if (/handwriting\.html/.test(r.url()) && !tReq) tReq = Date.now(); });
  await p.evaluate(() => document.addEventListener('click', () => sessionStorage.setItem('__clickT', String(Date.now())), true));
  await p.route('**/handwriting.html', r => setTimeout(() => r.continue(), 400)); // a slow network must not leave anything clickable underneath
  await p.click('#games [data-hand-open]');
  await p.waitForTimeout(300);
  const mid = await p.evaluate(() => ({ cov: [], blocked: (() => { const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !!(el && el.matches('canvas.ink-fx')); })() }));
  assert.equal(mid.blocked, true, 'the overlay blocks clicks on the page underneath while it runs');
  let covs = mid.cov;
  await p.waitForURL(/handwriting\.html/, { timeout: 5000, waitUntil: 'commit' }).catch(() => {});
  const navMs = tReq - +(await p.evaluate(() => sessionStorage.getItem('__clickT')));
  await p.unroute('**/handwriting.html');
  assert.match(p.url(), /handwriting\.html/, 'navigates to the Handwriting Check');
  assert.ok(navMs > 0 && navMs < 2500, 'the page change is requested within 2.5 s of the click (' + navMs + ' ms)');
  // coverage just before navigation is checked on a repeat run below (the old page is gone now)
  await p.waitForSelector('.hxs__vp canvas');
  await p.waitForFunction(() => !document.querySelector('canvas.ink-fx'), null, { timeout: 4000 });
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('ink-arrive')), false, 'no ink cover left');
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('#hx')).opacity), '1', 'workspace revealed');
  assert.equal(await p.evaluate(() => sessionStorage.getItem('erly-ink')), null, 'transition flag consumed');
  // the ink spread over the whole viewport: sample the full sequence on a second run, stopping navigation
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(600);
  covs = [];
  await p.exposeFunction('__report', v => covs.push(v)); // samples reach the test as they are taken
  await p.evaluate(() => { const t0 = performance.now(); const tick = () => { const cv = document.querySelector('canvas.ink-fx'); if (cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0, k = 0; for (let i = 3; i < d.length; i += 4 * 61) { k++; if (d[i] > 200) n++; } window.__report(n / k); } if (performance.now() - t0 < 2600) setTimeout(tick, 100); }; setTimeout(tick, 20); });
  await p.click('#games [data-hand-open]'); await p.waitForURL(/handwriting\.html/, { timeout: 5000 });
  const peak = Math.max(...covs);
  assert.ok(covs.some(x => x > 0.05 && x < 0.6), 'ink is visibly travelling before it covers (' + covs.map(x => x.toFixed(2)).join(' ') + ')');
  assert.ok(peak >= 0.99, 'the whole viewport is covered before the page changes (peak ' + peak.toFixed(2) + ')');
  await c.close();

  /* ---------- 2 · direct load, refresh, Back/Forward, rapid clicks ---------- */
  c = await ctxFor(); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'handwriting.html'); await p.waitForSelector('.hxs__vp canvas');
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'direct load: no transition');
  await p.reload(); await p.waitForSelector('.hxs__vp canvas'); await p.waitForTimeout(200);
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'refresh: no transition replay');
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
  let navs = 0; p.on('framenavigated', f => { if (f === p.mainFrame() && /handwriting/.test(f.url())) navs++; });
  await p.evaluate(() => { const b = document.querySelector('#games [data-hand-open]'); for (let i = 0; i < 5; i++) b.click(); });
  await p.waitForURL(/handwriting\.html/, { timeout: 5000 }); await p.waitForTimeout(400);
  assert.equal(navs, 1, 'rapid repeated clicks navigate once');
  await p.goBack(); await p.waitForURL(/student\.html/); await p.waitForTimeout(500);
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'Back: no stale ink overlay');
  assert.ok(await p.evaluate(() => { const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !el.closest('canvas.ink-fx'); }), 'Back: page is clickable');
  await p.goForward(); await p.waitForURL(/handwriting\.html/); await p.waitForSelector('.hxs__vp canvas'); await p.waitForTimeout(300);
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'Forward: no replay');
  // the user menu entry also uses the transition
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(600);
  await p.click('#userBtn'); await p.click('#userMenu [data-ink-href]'); await p.waitForURL(/handwriting\.html/, { timeout: 5000 });
  await c.close();

  /* ---------- 3 · theme: palette follows the site theme, even mid-transition ---------- */
  c = await ctxFor({ theme: 'dark' }); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
  assert.equal(await p.evaluate(() => ERLY.ink._pal().cover), '#050b20', 'dark: midnight ink');
  assert.equal(await p.evaluate(() => { const t = document.documentElement.dataset.theme; document.documentElement.dataset.theme = 'light'; const v = ERLY.ink._pal(); document.documentElement.dataset.theme = t; return v.pool + ' ' + v.cover; }), '#10131c #fbfaf7', 'light: near-black ink on white paper');
  let px = null; await p.exposeFunction('__px', v => { px = v; });
  await p.evaluate(() => { document.addEventListener('click', () => { setTimeout(() => { document.documentElement.dataset.theme = 'light'; }, 500); setTimeout(() => { const cv = document.querySelector('canvas.ink-fx'); if (!cv) return window.__px(null); const d = cv.getContext('2d').getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data; window.__px([d[0], d[1], d[2], d[3]]); }, 1350); }, { capture: true, once: true }); });
  await p.click('#games [data-hand-open]'); await p.waitForTimeout(1700);
  // v17: light theme = white paper with black/cobalt ink, so the flood that ends the transition is paper-white
  assert.ok(px && px[0] > 225 && px[1] > 225 && px[3] > 200, 'light theme switched mid-way: the cover is white paper (' + px + ')');
  await c.close();

  /* ---------- 4 · reduced motion: short, calm, still complete ---------- */
  c = await ctxFor({ reducedMotion: 'reduce' }); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(600);
  const r0 = Date.now(); await p.click('#games [data-hand-open]'); await p.waitForURL(/handwriting\.html/, { timeout: 3000 });
  assert.ok(Date.now() - r0 < 1500, 'reduced motion: quick (' + (Date.now() - r0) + ' ms)');
  await p.waitForFunction(() => !document.querySelector('canvas.ink-fx'), null, { timeout: 2000 });
  await c.close();

  /* ---------- 5 · the writing surface (v22 Handwriting Studio, Signature Ink Engine) ---------- */
  c = await ctxFor({ viewport: { width: 1100, height: 900 }, hasTouch: true }); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'handwriting.html'); await p.waitForSelector('.hxs__vp canvas');
  const pad = await p.locator('.hxs__vp').boundingBox();
  const strokes = () => p.evaluate(() => ERLY.handStudio._surface().strokes.length);
  const inked = () => p.evaluate(() => { const cv = document.querySelector('.hxs__base'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n; });
  const scroll0 = await p.evaluate(() => scrollY);
  await p.mouse.move(pad.x + 60, pad.y + 60); await p.mouse.down(); await p.mouse.move(pad.x + 300, pad.y + 120, { steps: 20 }); await p.mouse.up();
  assert.equal(await strokes(), 1, 'mouse stroke recorded'); assert.ok(await inked() > 50, 'stroke rendered');
  assert.equal(await p.evaluate(() => scrollY), scroll0, 'writing does not scroll the page');
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.hxs__vp')).touchAction), 'none', 'touch never scrolls or zooms the surface');
  assert.equal(await p.evaluate(() => ERLY.handStudio._surface().strokes[0].pressure), false, 'a mouse stroke never claims pressure');
  // touch and stylus (pressure) through real PointerEvents
  const fire = (type, x, y, pt, pressure) => p.evaluate(([type, x, y, pt, pressure]) => { const v = document.querySelector('.hxs__vp'); v.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: pt === 'pen' ? 7 : 9, pointerType: pt, pressure, bubbles: true, cancelable: true, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 })); }, [type, x, y, pt, pressure]);
  await fire('pointerdown', pad.x + 80, pad.y + 200, 'pen', 0.2); for (let i = 1; i <= 10; i++) await fire('pointermove', pad.x + 80 + i * 20, pad.y + 200, 'pen', 0.2 + i * 0.07); await fire('pointerup', pad.x + 280, pad.y + 200, 'pen', 0);
  assert.equal(await strokes(), 2, 'stylus stroke recorded');
  assert.ok(await p.evaluate(() => { const s = ERLY.handStudio._surface().strokes[1]; return s.pressure === true && s.pts.some(q => q[2] > 0.5) && s.pts.some(q => q[2] < 0.4); }), 'real stylus pressure captured and used');
  await fire('pointerdown', pad.x + 400, pad.y + 260, 'touch', 0.5); await fire('pointermove', pad.x + 420, pad.y + 280, 'touch', 0.5); await fire('pointerup', pad.x + 420, pad.y + 280, 'touch', 0);
  assert.equal(await strokes(), 2, 'once a pen is in use, a resting palm does not draw');
  await p.click('[data-a="undo"]'); assert.equal(await strokes(), 1); await p.click('[data-a="redo"]'); assert.equal(await strokes(), 2);
  await p.locator('.hxs__vp').focus(); await p.keyboard.press('Control+z'); assert.equal(await strokes(), 1, 'Ctrl+Z undoes'); await p.keyboard.press('Control+Shift+z'); assert.equal(await strokes(), 2, 'Ctrl+Shift+Z redoes');
  await p.click('[data-tool="eraser"]'); await p.mouse.move(pad.x + 60, pad.y + 60); await p.mouse.down(); await p.mouse.move(pad.x + 120, pad.y + 75, { steps: 6 }); await p.mouse.up();
  assert.equal(await strokes(), 1, 'the eraser removes the stroke it touches'); await p.click('[data-tool="pen"]');
  const n0 = await strokes(); await p.setViewportSize({ width: 700, height: 900 }); await p.waitForTimeout(300);
  assert.equal(await strokes(), n0, 'resizing keeps every stroke'); assert.ok(await inked() > 20, 'and it is redrawn at the new size');
  await p.setViewportSize({ width: 1100, height: 900 }); await p.waitForTimeout(200);
  // v22: the page stays paper-white in dark mode (like real paper), so dark ink keeps its contrast in both themes
  await p.click('#themeToggle'); await p.waitForTimeout(500);
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.hxs__sheet')).backgroundColor), 'rgb(255, 255, 255)', 'paper stays light in dark mode');
  if (SHOT) await p.screenshot({ path: SHOT + '/studio-dark.png' });
  await p.click('#themeToggle'); await p.waitForTimeout(400);
  p.once('dialog', d => d.dismiss()); await p.click('[data-a="clear"]'); await p.waitForTimeout(100); assert.equal(await strokes(), 1, 'cancelled clear keeps the writing');
  p.once('dialog', d => d.accept()); await p.click('[data-a="clear"]'); await p.waitForTimeout(100); assert.equal(await strokes(), 0, 'clear');

  /* ---------- 6 · reading on-screen writing with the real recognition pipeline ---------- */
  // simulate a writer: the three sentences rendered in a handwriting-style font, traced into short pen strokes
  const traced = await p.evaluate(async () => {
    const lines = ERLY_HAND.PROMPTS.en[0], S = ERLY.handStudio._surface(), W = S.W, H = 360;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.font = '52px "Comic Sans MS", cursive'; lines.forEach((l, i) => g.fillText(l, 60, 80 + i * 100));
    const d = g.getImageData(0, 0, W, H).data, out = [];
    for (let y = 0; y < H; y += 3) { let run = null; for (let x = 0; x <= W; x++) { const on = x < W && d[(y * W + x) * 4 + 3] > 100; if (on && run === null) run = x; if (!on && run !== null) { out.push({ pts: [[run, y + 40, 0, 0], [x, y + 40, 0, 16]], size: 2.6, ink: 'precision', color: '#1c1b19', pressure: false }); run = null; } } }
    S.load({ W, H: S.H, strokes: out }); return out.length;
  });
  assert.ok(traced > 200, 'traced strokes ' + traced);
  const ocr = {};
  for (const eng of ['tesseract', 'trocr']) {
    if (eng === 'trocr' && process.env.SKIP_MODEL) continue;
    const r = await p.evaluate(async e => { if (e === 'trocr') await ERLY.handOCR.ENGINES.trocr.load(); const R = await ERLY.handOCR.recognize(ERLY.handStudio._surface().exportImage({}), { lang: 'en', engine: e }); const ref = ERLY_HAND.PROMPTS.en[0].join(' '); const rt = ERLY_HAND.errorRates(ref, R.text, 'en'); return { text: R.text.replace(/\s+/g, ' '), conf: R.conf, cer: +(rt.cer * 100).toFixed(1), wer: +(rt.wer * 100).toFixed(1), ms: R.ms }; }, eng);
    ocr[eng] = r; console.log('on-screen strokes →', eng, JSON.stringify(r));
  }
  assert.ok(ocr.tesseract && ocr.tesseract.cer < 60, 'the clean export of on-screen strokes is readable by the quick reader');
  // the app path: Read it back shows the software's reading with its own confidence, then can be corrected
  await p.evaluate(() => { ERLY.handStudio.state().engine = 'tesseract'; });
  await p.click('[data-act="readback"]'); await p.waitForSelector('.hx-read', { timeout: 120000 });
  const res = await p.textContent('.hx-out');
  assert.match(res, /What the software read/); assert.match(res, /its mistakes are not your mistakes/);
  assert.doesNotMatch(res, /dyslex|dysgraph|disorder|messy|poor handwriting/i);
  assert.doesNotMatch(await p.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage)), /strokes|"pts"|data:image/, 'nothing about the writing is stored without consent');
  await c.close();

  /* ---------- 7 · phone ---------- */
  c = await ctxFor({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, theme: 'dark' }); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('#games [data-hand-open]').scrollIntoView({ block: 'center' }));
  await p.tap('#games [data-hand-open]'); await p.waitForURL(/handwriting\.html/, { timeout: 5000 }); await p.waitForSelector('.hxs__vp canvas');
  await p.waitForFunction(() => !document.querySelector('canvas.ink-fx'), null, { timeout: 4000 });
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no sideways scroll');
  const pb = await p.locator('.hxs__vp').boundingBox(); assert.ok(pb.width > 330 && pb.height > 280, 'phone: a large writing area');
  if (SHOT) await p.screenshot({ path: SHOT + '/studio-phone-dark.png' });
  await c.close();

  if (errors.length) console.log('PAGE ERRORS', JSON.stringify(errors));
  assert.deepEqual(errors, [], 'no page errors');
  console.log('ink transition + writing studio e2e: all checks passed');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
