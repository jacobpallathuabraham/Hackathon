// v9 experience layer: eclipse theme switch, ambient backgrounds, holo companion,
// Accessibility Control Centre and the self-fitting header.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/v9.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|GL Driver/.test(m.text())) errors.push(m.text()); }); };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    if (!localStorage.getItem('v9-init')) { localStorage.setItem('v9-init', '1'); localStorage.setItem('erly-theme', 'light'); }
    window.__spoken = []; window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: u => window.__spoken.push(u.text), cancel() {}, pause() {}, resume() {}, getVoices: () => [], addEventListener() {} }, configurable: true });
  });
  const p = await ctx.newPage(); watch(p);
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1000);

  /* ---------- eclipse theme switch ---------- */
  await p.click('#themeToggle');
  await p.waitForTimeout(150);
  const mid = await p.evaluate(() => ({ cls: document.documentElement.className, ring: !!document.querySelector('.tfx-ring'), anims: document.getAnimations().map(a => a.effect && a.effect.pseudoElement).filter(Boolean) }));
  assert.match(mid.cls, /vt-theme/, 'the switch runs as a view transition');
  assert.ok(mid.ring, 'the luminous ring layer exists during the switch');
  assert.ok(mid.anims.includes('::view-transition-new(tfx-ring)') && mid.anims.includes('::view-transition-new(root)'), 'ring and reveal are animated');
  await p.waitForTimeout(1400);
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.equal(await p.evaluate(() => document.querySelectorAll('.tfx-ring').length), 0, 'ring removed afterwards');
  for (let i = 0; i < 7; i++) { await p.click('#themeToggle'); await p.waitForTimeout(70); } // rapid clicks
  await p.waitForTimeout(1600);
  const rapid = await p.evaluate(() => ({ t: document.documentElement.dataset.theme, s: localStorage.getItem('erly-theme'), c: document.documentElement.className, r: document.querySelectorAll('.tfx-ring').length }));
  assert.equal(rapid.t, 'light', '7 rapid clicks from dark end on light'); assert.equal(rapid.s, 'light', 'choice persisted');
  assert.doesNotMatch(rapid.c, /vt-theme|tfx-fade/, 'no stuck transition classes'); assert.equal(rapid.r, 0, 'no leftover rings');

  /* ---------- ambient backgrounds: switched off in v10.1 (they cost ~40 fps on tablets) ---------- */
  const amb = await p.evaluate(() => [...document.querySelectorAll('.amb')].map(a => ({ shown: getComputedStyle(a).display !== 'none', run: !!(a.__amb && a.__amb.running()), canvas: !!a.querySelector('canvas') })));
  assert.ok(amb.every(a => !a.shown && !a.run && !a.canvas), 'no background canvases drawn or animated ' + JSON.stringify(amb));

  /* ---------- holo companion ---------- */
  await p.click('.cmp-launch'); await p.waitForTimeout(800);
  const holo = await p.evaluate(() => { const panel = document.querySelector('.cmp'); const a = panel.querySelector(':scope > .amb'); return { amb: !!a, kind: a && a.dataset.ambient, run: a && a.__amb && a.__amb.running(), border: getComputedStyle(panel).borderTopColor }; });
  assert.ok(holo.amb && holo.kind === 'holo' && !holo.run, 'the holo scanning grid no longer animates');
  assert.match(holo.border, /rgba?\(56, 189, 248/, 'luminous cyan panel edge');
  await p.click('#cmpClose'); await p.waitForTimeout(500);

  /* ---------- accessibility control centre ---------- */
  await p.keyboard.press('Alt+a'); await p.waitForTimeout(250);
  assert.equal(await p.isVisible('#a11yPanel'), true, 'Alt+A opens');
  await p.click('[data-size="125"]');
  for (const k of ['contrast', 'still', 'font', 'spacing', 'links', 'focus']) await p.click(`.a11y__row:has([data-k="${k}"])`);
  const cls = await p.evaluate(() => document.documentElement.className);
  ['a11y-zoom', 'a11y-contrast', 'a11y-still', 'a11y-font', 'a11y-spacing', 'a11y-links', 'a11y-focus'].forEach(c => assert.match(cls, new RegExp(c), c));
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).zoom), '1.25');
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.hero h1')).opacity), '1', 'stopping animations never hides content');
  const panelBox = await p.locator('#a11yPanel').boundingBox();
  assert.ok(panelBox.y >= 0 && panelBox.y + panelBox.height <= 800, 'panel stays on screen at 125% text');
  await p.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('.hero h1')); getSelection().removeAllRanges(); getSelection().addRange(r); });
  await p.click('[data-a="read"]');
  assert.match(await p.evaluate(() => window.__spoken.join(' ')), /Notice sooner/, 'reads the selection aloud');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  assert.equal(await p.isVisible('#a11yPanel'), false, 'Esc closes');
  await p.reload(); await p.waitForTimeout(600);
  assert.match(await p.evaluate(() => document.documentElement.className), /a11y-contrast/, 'persists on this device');
  await p.evaluate(() => ERLY.a11y.open()); await p.click('[data-a="reset"]');
  assert.doesNotMatch(await p.evaluate(() => document.documentElement.className), /a11y-/, 'reset');

  // (v10.2: the v9 header changes were reverted to the original header at the student's request)

  /* ---------- page-to-page transitions are declared; reduced motion opts out ---------- */
  const vt = await p.evaluate(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.cssText && r.cssText.includes('@view-transition')); } catch (e) { return false; } }));
  assert.ok(vt, 'cross-page view transitions declared');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('v9 experience e2e: all checks passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
