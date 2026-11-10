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
  await p.waitForSelector('#hwPad canvas');
  await p.waitForFunction(() => !document.querySelector('canvas.ink-fx'), null, { timeout: 4000 });
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('ink-arrive')), false, 'no ink cover left');
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.hws__studio')).opacity), '1', 'workspace revealed');
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
  await p.goto(BASE + 'handwriting.html'); await p.waitForSelector('#hwPad canvas');
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'direct load: no transition');
  await p.reload(); await p.waitForSelector('#hwPad canvas'); await p.waitForTimeout(200);
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'refresh: no transition replay');
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
  let navs = 0; p.on('framenavigated', f => { if (f === p.mainFrame() && /handwriting/.test(f.url())) navs++; });
  await p.evaluate(() => { const b = document.querySelector('#games [data-hand-open]'); for (let i = 0; i < 5; i++) b.click(); });
  await p.waitForURL(/handwriting\.html/, { timeout: 5000 }); await p.waitForTimeout(400);
  assert.equal(navs, 1, 'rapid repeated clicks navigate once');
  await p.goBack(); await p.waitForURL(/student\.html/); await p.waitForTimeout(500);
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'Back: no stale ink overlay');
  assert.ok(await p.evaluate(() => { const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !el.closest('canvas.ink-fx'); }), 'Back: page is clickable');
  await p.goForward(); await p.waitForURL(/handwriting\.html/); await p.waitForSelector('#hwPad canvas'); await p.waitForTimeout(300);
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'Forward: no replay');
  // the user menu entry also uses the transition
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(600);
  await p.click('#userBtn'); await p.click('#userMenu [data-ink-href]'); await p.waitForURL(/handwriting\.html/, { timeout: 5000 });
  await c.close();

  /* ---------- 3 · theme: palette follows the site theme, even mid-transition ---------- */
  c = await ctxFor({ theme: 'dark' }); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
  assert.equal(await p.evaluate(() => ERLY.ink._pal().cover), '#050b20', 'dark: midnight ink');
  let px = null; await p.exposeFunction('__px', v => { px = v; });
  await p.evaluate(() => { document.addEventListener('click', () => { setTimeout(() => { document.documentElement.dataset.theme = 'light'; }, 500); setTimeout(() => { const cv = document.querySelector('canvas.ink-fx'); if (!cv) return window.__px(null); const d = cv.getContext('2d').getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data; window.__px([d[0], d[1], d[2], d[3]]); }, 1350); }, { capture: true, once: true }); });
  await p.click('#games [data-hand-open]'); await p.waitForTimeout(1700);
  assert.ok(px && px[2] < 40, 'light theme switched mid-way: the cover is near-black ink (' + px + ')');
  await c.close();

  /* ---------- 4 · reduced motion: short, calm, still complete ---------- */
  c = await ctxFor({ reducedMotion: 'reduce' }); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(600);
  const r0 = Date.now(); await p.click('#games [data-hand-open]'); await p.waitForURL(/handwriting\.html/, { timeout: 3000 });
  assert.ok(Date.now() - r0 < 1500, 'reduced motion: quick (' + (Date.now() - r0) + ' ms)');
  await p.waitForFunction(() => !document.querySelector('canvas.ink-fx'), null, { timeout: 2000 });
  await c.close();

  /* ---------- 5 · the writing pad ---------- */
  c = await ctxFor({ viewport: { width: 1100, height: 900 }, hasTouch: true }); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'handwriting.html'); await p.waitForSelector('#hwPad canvas');
  const pad = await p.locator('#hwPad').boundingBox();
  const strokes = () => p.evaluate(() => ERLY.handwriting.pad().strokes.length);
  const inked = () => p.evaluate(() => { const cv = document.querySelector('#hwPad canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n; });
  const scroll0 = await p.evaluate(() => scrollY);
  // mouse
  await p.mouse.move(pad.x + 60, pad.y + 60); await p.mouse.down(); await p.mouse.move(pad.x + 300, pad.y + 120, { steps: 20 }); await p.mouse.up();
  assert.equal(await strokes(), 1, 'mouse stroke recorded'); assert.ok(await inked() > 50, 'stroke rendered');
  assert.equal(await p.evaluate(() => scrollY), scroll0, 'writing does not scroll the page');
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('#hwPad canvas')).touchAction), 'none', 'touch never scrolls or zooms the canvas');
  // touch and stylus (pressure) through real PointerEvents
  const fire = (type, x, y, pt, pressure) => p.evaluate(([type, x, y, pt, pressure]) => { const cv = document.querySelector('#hwPad canvas'); cv.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: pt === 'pen' ? 7 : 9, pointerType: pt, pressure, isPrimary: true, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 })); }, [type, x, y, pt, pressure]);
  await fire('pointerdown', pad.x + 80, pad.y + 200, 'pen', 0.2); for (let i = 1; i <= 10; i++) await fire('pointermove', pad.x + 80 + i * 20, pad.y + 200, 'pen', 0.2 + i * 0.07); await fire('pointerup', pad.x + 280, pad.y + 200, 'pen', 0);
  assert.equal(await strokes(), 2, 'stylus stroke recorded');
  assert.ok(await p.evaluate(() => { const s = ERLY.handwriting.pad().strokes[1]; return s.pts.some(q => q[2] > 0.5) && s.pts.some(q => q[2] < 0.4); }), 'stylus pressure captured');
  await fire('pointerdown', pad.x + 400, pad.y + 260, 'touch', 0.5); await fire('pointermove', pad.x + 420, pad.y + 280, 'touch', 0.5); await fire('pointerup', pad.x + 420, pad.y + 280, 'touch', 0);
  assert.equal(await strokes(), 2, 'a resting palm right after the stylus is ignored');
  await p.waitForTimeout(1600);
  await fire('pointerdown', pad.x + 400, pad.y + 300, 'touch', 0.5); for (let i = 1; i <= 6; i++) await fire('pointermove', pad.x + 400 + i * 15, pad.y + 300 + i * 5, 'touch', 0.5); await fire('pointerup', pad.x + 490, pad.y + 330, 'touch', 0);
  assert.equal(await strokes(), 3, 'finger stroke recorded');
  // undo / redo / eraser / clear
  await p.click('[data-a="undo"]'); assert.equal(await strokes(), 2); await p.click('[data-a="redo"]'); assert.equal(await strokes(), 3);
  await p.keyboard.press('Control+z'); assert.equal(await strokes(), 2, 'Ctrl+Z undoes');
  const before = await inked();
  await p.click('[data-tool="eraser"]'); await p.mouse.move(pad.x + 60, pad.y + 60); await p.mouse.down(); await p.mouse.move(pad.x + 300, pad.y + 120, { steps: 20 }); await p.mouse.up();
  assert.ok(await inked() < before, 'eraser removes ink');
  await p.click('[data-tool="pen"]');
  // resize keeps the writing
  const n0 = await strokes(); await p.setViewportSize({ width: 700, height: 900 }); await p.waitForTimeout(300);
  assert.equal(await strokes(), n0, 'resizing keeps every stroke'); assert.ok(await inked() > 20, 'and it is redrawn at the new size');
  await p.setViewportSize({ width: 1100, height: 900 }); await p.waitForTimeout(200);
  // theme switch while open recolours the ink (light ink on the dark page)
  const colour = () => p.evaluate(() => { const cv = document.querySelector('#hwPad canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) return d[i] + d[i + 1] + d[i + 2]; return null; });
  const lightInk = await colour(); await p.click('#themeToggle'); await p.waitForTimeout(700); const darkInk = await colour();
  assert.ok(lightInk < 200 && darkInk > 500, `ink colour follows the theme (${lightInk} → ${darkInk})`);
  if (SHOT) await p.screenshot({ path: SHOT + '/studio-dark.png' });
  await p.click('#themeToggle'); await p.waitForTimeout(500);
  await p.click('[data-a="clearpad"]'); assert.equal(await strokes(), 0, 'clear');

  /* ---------- 6 · analysing on-screen writing uses the real recognition pipeline ---------- */
  // simulate a writer: the three sentences rendered in a handwriting-style font, traced into short pen strokes
  await p.evaluate(async () => {
    const lines = ERLY_HAND.PROMPTS.en[0], pd = ERLY.handwriting.pad(), W = pd.w, H = pd.h;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.font = '34px Caveat, cursive'; await document.fonts.ready;
    lines.forEach((l, i) => g.fillText(l, 70, 52 + i * 64));
    const d = g.getImageData(0, 0, W, H).data, strokes = [];
    for (let y = 0; y < H; y += 2) { let run = null; for (let x = 0; x <= W; x++) { const on = x < W && d[(y * W + x) * 4 + 3] > 100; if (on && !run) run = x; if (!on && run !== null) { strokes.push({ id: 1, tool: 'pen', ink: 'auto', size: 2.2, pts: [[run / W, y / W, -1, 0], [x / W, y / W, -1, 16]] }); run = null; } } }
    pd.strokes = strokes; pd.render(); document.querySelector('[data-a="analysepad"]').disabled = false;
  });
  await p.click('[data-a="analysepad"]');
  await p.waitForSelector('.hw2-result', { timeout: 120000 });
  const res = await p.textContent('.hw2-result');
  assert.match(res, /writing area/, 'result describes the writing area, not a photo');
  assert.match(res, /recognised|difficult|conclusive/);
  assert.doesNotMatch(res, /dyslex|dysgraph|disorder|messy|poor handwriting/i);
  const found = await p.locator('.hw2-words .is-found').count();
  console.log('on-screen writing: words recognised', found, '/', await p.locator('.hw2-words span').count());
  if (SHOT) await p.screenshot({ path: SHOT + '/studio-result.png' });
  await p.click('.hw2 [data-a="discard"]'); await p.waitForTimeout(300);
  assert.equal(await strokes(), 0, 'discard clears the writing'); assert.equal(await p.evaluate(() => ERLY.handwriting.state().ocr), null);
  assert.doesNotMatch(await p.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage)), /strokes|"pts"|data:image/, 'nothing about the writing is stored');
  await c.close();

  /* ---------- 7 · phone ---------- */
  c = await ctxFor({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, theme: 'dark' }); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('#games [data-hand-open]').scrollIntoView({ block: 'center' }));
  await p.tap('#games [data-hand-open]'); await p.waitForURL(/handwriting\.html/, { timeout: 5000 }); await p.waitForSelector('#hwPad canvas');
  await p.waitForFunction(() => !document.querySelector('canvas.ink-fx'), null, { timeout: 4000 });
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no sideways scroll');
  const pb = await p.locator('#hwPad').boundingBox(); assert.ok(pb.width > 330 && pb.height > 280, 'phone: a large writing area');
  if (SHOT) await p.screenshot({ path: SHOT + '/studio-phone-dark.png' });
  await c.close();

  if (errors.length) console.log('PAGE ERRORS', JSON.stringify(errors));
  assert.deepEqual(errors, [], 'no page errors');
  console.log('ink transition + writing studio e2e: all checks passed');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
