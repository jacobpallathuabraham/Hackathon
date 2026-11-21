// v13 — full-viewport ink transition into the Handwriting Studio (studio itself: handwriting-studio-v24.e2e.js), in a real browser.
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
  await p.waitForSelector('.hws-vp canvas');
  await p.waitForFunction(() => !document.querySelector('canvas.ink-fx'), null, { timeout: 4000 });
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('ink-arrive')), false, 'no ink cover left');
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('#hws')).opacity), '1', 'workspace revealed');
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
  await p.goto(BASE + 'handwriting.html'); await p.waitForSelector('.hws-vp canvas');
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'direct load: no transition');
  await p.reload(); await p.waitForSelector('.hws-vp canvas'); await p.waitForTimeout(200);
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'refresh: no transition replay');
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
  let navs = 0; p.on('framenavigated', f => { if (f === p.mainFrame() && /handwriting/.test(f.url())) navs++; });
  await p.evaluate(() => { const b = document.querySelector('#games [data-hand-open]'); for (let i = 0; i < 5; i++) b.click(); });
  await p.waitForURL(/handwriting\.html/, { timeout: 5000 }); await p.waitForTimeout(400);
  assert.equal(navs, 1, 'rapid repeated clicks navigate once');
  await p.goBack(); await p.waitForURL(/student\.html/); await p.waitForTimeout(500);
  assert.equal(await p.locator('canvas.ink-fx').count(), 0, 'Back: no stale ink overlay');
  assert.ok(await p.evaluate(() => { const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !el.closest('canvas.ink-fx'); }), 'Back: page is clickable');
  await p.goForward(); await p.waitForURL(/handwriting\.html/); await p.waitForSelector('.hws-vp canvas'); await p.waitForTimeout(300);
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

  /* 5–6 (v22 writing surface + on-screen OCR) were retired in v24: the studio was rebuilt and is covered by
     tests/e2e/handwriting-studio-v24.e2e.js (ink, pressure, palm rejection, undo, eraser, export, scan/OCR). */

  /* ---------- 7 · phone ---------- */
  c = await ctxFor({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, theme: 'dark' }); p = await c.newPage(); watch(p);
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('#games [data-hand-open]').scrollIntoView({ block: 'center' }));
  await p.tap('#games [data-hand-open]'); await p.waitForURL(/handwriting\.html/, { timeout: 5000 }); await p.waitForSelector('.hws-vp canvas');
  await p.waitForFunction(() => !document.querySelector('canvas.ink-fx'), null, { timeout: 4000 });
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no sideways scroll');
  const pb = await p.locator('.hws-vp').boundingBox(); assert.ok(pb.width > 330 && pb.height > 280, 'phone: a large writing area');
  assert.equal(await p.locator('.hws-props').isVisible(), false, 'phone: tool settings stay out of the way until asked for');
  await p.tap('[data-a="props"]'); assert.equal(await p.locator('.hws-props').isVisible(), true, 'phone: Tool settings opens the sheet');
  await p.tap('[data-a="props"]'); assert.equal(await p.locator('.hws-props').isVisible(), false, 'phone: and closes it');
  if (SHOT) await p.screenshot({ path: SHOT + '/studio-phone-dark.png' });
  await c.close();

  if (errors.length) console.log('PAGE ERRORS', JSON.stringify(errors));
  assert.deepEqual(errors, [], 'no page errors');
  console.log('ink transition + writing studio e2e: all checks passed');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
