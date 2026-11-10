// v11 Accessibility Control Centre: every control has a measurable effect, persists, resets,
// works by keyboard, and follows the device's reduced-motion setting; theme Light/Dark/System.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); if (!sessionStorage.getItem('a11y-init')) { localStorage.removeItem('erly-a11y'); localStorage.removeItem('erly-theme'); sessionStorage.setItem('a11y-init', '1'); } });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(800);
  const css = (sel, prop) => p.evaluate(([s, pr]) => getComputedStyle(document.querySelector(s))[pr], [sel, prop]);
  const cls = () => p.evaluate(() => document.documentElement.className);
  // the device asks for reduced motion → animations stop without anyone touching a switch; System theme follows the device (dark)
  assert.match(await cls(), /a11y-still/, 'reduced motion from the device is respected');
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'dark', 'no saved theme: follows the device');
  // open by keyboard; tabs by arrow keys
  await p.keyboard.press('Alt+a'); await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => document.activeElement.dataset.tab), 'reading', 'focus lands on the Reading tab');
  await p.keyboard.press('ArrowRight'); assert.equal(await p.evaluate(() => document.activeElement.dataset.tab), 'visual', 'arrow keys move between sections');
  await p.keyboard.press('ArrowLeft');
  // Reading
  const pSel = 'main p, section p';
  const lh0 = await css(pSel, 'lineHeight');
  await p.click('[data-seg="line"][data-v="2.2"]'); assert.notEqual(await css(pSel, 'lineHeight'), lh0, 'line spacing changes paragraphs');
  await p.click('[data-seg="letter"][data-v="0.12"]'); assert.notEqual(await css(pSel, 'letterSpacing'), 'normal', 'letter spacing');
  await p.click('[data-seg="word"][data-v="0.32"]'); assert.notEqual(await css(pSel, 'wordSpacing'), '0px', 'word spacing');
  await p.click('[data-seg="width"][data-v="narrow"]'); assert.notEqual(await css('main p', 'maxWidth'), 'none', 'reading width');
  await p.click('.a11y__row:has([data-k="guide"])'); assert.equal(await p.locator('.a11y-guide').count(), 1, 'reading guide appears');
  await p.mouse.move(400, 500); assert.match(await p.evaluate(() => document.querySelector('.a11y-guide').style.transform), /478px/, 'and follows the pointer');
  await p.click('[data-size="125"]'); assert.equal(await css('body', 'zoom'), '1.25');
  await p.click('.a11y__row:has([data-k="font"])'); assert.match(await css('main p', 'fontFamily'), /Atkinson|Lexend|Verdana/);
  // Visual
  await p.click('[data-tab="visual"]');
  await p.click('[data-seg="theme"][data-v="light"]'); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'light', 'theme: light');
  await p.click('[data-seg="theme"][data-v="system"]'); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('erly-theme')].join()), 'dark,system', 'theme: system follows the device');
  await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'light', 'and changes when the device changes');
  await p.click('[data-seg="tint"][data-v="cream"]'); assert.match(await p.evaluate(() => getComputedStyle(document.documentElement, '::after').backgroundColor), /255, 236, 179/, 'colour tint overlay');
  await p.click('.a11y__row:has([data-k="calm"])'); assert.equal(await css('.ticker', 'display'), 'none', 'fewer distractions hides the moving ticker');
  await p.click('.a11y__row:has([data-k="contrast"])'); assert.match(await cls(), /a11y-contrast/);
  // Interaction
  await p.click('[data-tab="interaction"]');
  await p.click('.a11y__row:has([data-k="targets"])');
  const h = await p.evaluate(() => document.querySelector('#themeToggle').getBoundingClientRect().height); assert.ok(h >= 44 * 1.25 - 1, 'larger click targets (' + h + ')');
  await p.click('.a11y__row:has([data-k="still"])'); assert.doesNotMatch(await cls(), /a11y-still/, 'the student can override the device setting');
  // Learning → Noor's instructions really change
  await p.click('[data-tab="learning"]');
  await p.click('.a11y__row:has([data-k="learn.steps"])'); await p.click('[data-seg="learn.dense"][data-v="light"]');
  await p.click('.a11y__row:has([data-k="suggestVisuals"])');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('erly-companion-v1')).prefs.vs.suggestVisuals), true, 'visual suggestions preference reaches Noor');
  // persistence across reload and pages; a tab click never resets anything
  await p.reload(); await p.waitForTimeout(500);
  const after = await cls();
  ['a11y-line', 'a11y-letter', 'a11y-word', 'a11y-width', 'a11y-zoom', 'a11y-font', 'a11y-tint', 'a11y-calm', 'a11y-contrast', 'a11y-targets'].forEach(c => assert.match(after, new RegExp(c), c + ' persists'));
  await p.goto(BASE + 'support.html'); await p.waitForTimeout(500);
  assert.match(await cls(), /a11y-line.*a11y-width|a11y-width.*a11y-line|a11y-line/, 'same settings on other pages');
  assert.equal(await p.locator('.a11y-guide').count(), 1, 'reading guide on every page');
  // reset
  await p.evaluate(() => ERLY.a11y.open()); await p.click('[data-a="reset"]');
  assert.doesNotMatch((await cls()).replace('a11y-still', ''), /a11y-/, 'reset clears everything (device reduced motion still respected)');
  assert.equal(await p.locator('.a11y-guide').count(), 0);
  assert.deepEqual(errors, []);
  console.log('accessibility control centre e2e: all checks passed'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
