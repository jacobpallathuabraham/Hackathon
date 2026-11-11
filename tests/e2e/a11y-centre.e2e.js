// v15: the Accessibility Control Centre, used like a person would — every setting changes the page at once,
// is announced, persists across pages and refresh, survives Back/Forward, and Reset restores defaults;
// read-aloud reads the page sentence by sentence with a highlight, pauses, resumes and stops; focus mode,
// large pointer and reduced motion work; keyboard: Alt+A opens, Tab reaches controls, Esc closes and focus returns.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/a11y-centre.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    window.__spoken = []; window.__paused = false;
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const q = []; let cur = null;
    const run = () => { if (cur || !q.length || window.__paused) return; const u = cur = q.shift(); window.__spoken.push(u.text); setTimeout(() => { if (cur === u) cur = null; if (!u.__x) { u.onend && u.onend(); run(); } }, 60); };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak(u) { q.push(u); run(); }, cancel() { q.length = 0; if (cur) { cur.__x = true; cur = null; } }, pause() { window.__paused = true; }, resume() { window.__paused = false; run(); }, getVoices: () => [], addEventListener() {} } });
  });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(900);
  const H = () => p.evaluate(() => document.documentElement.className);

  // keyboard: Alt+A opens with focus inside; Esc closes and focus returns
  await p.focus('#themeToggle'); await p.keyboard.press('Alt+A'); await p.waitForTimeout(200);
  assert.ok(await p.evaluate(() => !document.getElementById('a11yPanel').hidden && document.getElementById('a11yPanel').contains(document.activeElement)), 'Alt+A opens with focus inside');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  assert.equal(await p.evaluate(() => document.activeElement.id), 'themeToggle', 'Esc closes and focus returns');

  await p.click('#a11yFab'); await p.waitForTimeout(200);
  // reading tab: size, spacing, width — each visible at once and announced
  const fs0 = await p.evaluate(() => getComputedStyle(document.querySelector('.hero__lead, main p')).fontSize);
  await p.click('[data-size="125"]'); await p.waitForTimeout(150);
  assert.match(await H(), /a11y-zoom/); assert.match(await p.textContent('.a11y-live'), /Text size 125%/, 'announced');
  for (const [k, v, cls] of [['line', '1.9', 'a11y-line'], ['letter', '0.05', 'a11y-letter'], ['word', '0.16', 'a11y-word'], ['width', 'comfy', 'a11y-width']]) {
    await p.click(`[data-seg="${k}"][data-v="${v}"]`); await p.waitForTimeout(80);
    assert.match(await H(), new RegExp(cls), k + ' applied'); assert.equal(await p.getAttribute(`[data-seg="${k}"][data-v="${v}"]`, 'aria-checked'), 'true');
  }
  assert.ok(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('main p')).lineHeight) / parseFloat(getComputedStyle(document.querySelector('main p')).fontSize) > 1.8), 'line height really changed');
  // visual + interaction switches
  await p.click('[data-tab="visual"]'); await p.check('[data-k="contrast"]'); await p.check('[data-k="links"]'); await p.check('[data-k="focusmode"]'); await p.waitForTimeout(400);
  assert.match(await H(), /a11y-contrast/); assert.match(await H(), /a11y-links/); assert.match(await H(), /a11y-focusmode/);
  assert.ok(await p.$('.a11y-fmexit'), 'focus mode has an exit button');
  assert.ok(await p.evaluate(() => document.querySelectorAll('main .a11y-cur').length >= 1), 'the section in view is emphasised');
  await p.click('[data-tab="interaction"]'); await p.check('[data-k="cursor"]'); await p.check('[data-k="still"]'); await p.check('[data-k="focus"]'); await p.waitForTimeout(150);
  assert.match(await H(), /a11y-cursor/); assert.match(await H(), /a11y-still/);
  assert.match(await p.evaluate(() => getComputedStyle(document.body).cursor), /url\(/, 'large pointer');
  assert.match(await p.textContent('.a11y__f span'), /\d+ changed/, 'the panel shows how many settings changed');
  // Noor's "read replies aloud" writes the preference Noor actually reads
  await p.click('[data-tab="learning"]'); await p.check('[data-k="speakReplies"]');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('erly-companion-v1')).prefs.readAloud), true, 'speak replies → readAloud');
  await p.uncheck('[data-k="speakReplies"]');
  // focus mode exits instantly
  const fx = await p.evaluate(() => { const r = document.querySelector('.a11y-fmexit').getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; return { x, y, top: document.elementFromPoint(x, y).className }; });
  assert.equal(fx.top, 'a11y-fmexit', 'the exit button is on top of the page');
  await p.mouse.click(fx.x, fx.y); await p.waitForTimeout(100);
  assert.doesNotMatch(await H(), /a11y-focusmode/); assert.equal(await p.$('.a11y-fmexit'), null);

  // persistence: another page, refresh, Back/Forward
  await p.goto(BASE + 'games.html'); await p.waitForTimeout(700);
  for (const c of ['a11y-zoom', 'a11y-line', 'a11y-contrast', 'a11y-still', 'a11y-cursor']) assert.match(await H(), new RegExp(c), 'carried to games: ' + c);
  await p.reload(); await p.waitForTimeout(600); assert.match(await H(), /a11y-contrast/, 'after refresh');
  await p.goBack(); await p.waitForTimeout(700); assert.match(await H(), /a11y-line/, 'after Back');
  await p.goForward(); await p.waitForTimeout(700); assert.match(await H(), /a11y-zoom/, 'after Forward');
  for (const pg of ['index.html', 'login.html', 'support.html', 'handwriting.html', 'faculty.html']) { await p.goto(BASE + pg); await p.waitForTimeout(500); assert.match(await H(), /a11y-contrast/, 'applies on ' + pg); }

  // reset restores every default
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
  await p.click('#a11yFab'); await p.click('[data-a="reset"]'); await p.waitForTimeout(150);
  assert.doesNotMatch(await H(), /a11y-(zoom|line|letter|word|width|contrast|links|focusmode|cursor|focus\b)/, 'reset');
  assert.match(await p.textContent('.a11y-live'), /reset/i);

  // read aloud: no selection = the page's main content, sentence by sentence, highlighted, with pause/resume/stop
  await p.click('[data-tab="reading"]'); await p.click('[data-a="read"]'); await p.waitForTimeout(250);
  assert.ok(await p.$('.a11y-reader'), 'the read-aloud player appears');
  assert.match(await p.textContent('.a11y-reader__t'), /Sentence \d+ of \d+/);
  assert.ok(await p.evaluate(() => !window.CSS || !CSS.highlights || CSS.highlights.has('erly-read')), 'the sentence being read is highlighted');
  await p.click('.a11y-reader [data-r="pp"]'); const n1 = await p.evaluate(() => __spoken.length); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => __spoken.length), n1, 'paused'); assert.match(await p.getAttribute('.a11y-reader [data-r="pp"]', 'aria-label'), /Resume/);
  await p.click('.a11y-reader [data-r="pp"]'); await p.waitForTimeout(300); assert.ok(await p.evaluate(() => __spoken.length) > n1, 'resumed');
  // a speed change mid-reading doesn't restart it
  if (await p.evaluate(() => document.getElementById('a11yPanel').hidden)) { await p.click('#a11yFab'); await p.waitForTimeout(200); }
  const before = await p.evaluate(() => __spoken.length); await p.fill('[data-k="rate"]', '1.4'); await p.waitForTimeout(200);
  assert.ok(await p.evaluate(() => __spoken.length) >= before && await p.$('.a11y-reader'), 'still reading after a speed change');
  await p.click('.a11y-reader [data-r="stop"]'); await p.waitForTimeout(100);
  assert.equal(await p.$('.a11y-reader'), null); assert.ok(await p.evaluate(() => !window.CSS || !CSS.highlights || !CSS.highlights.has('erly-read')), 'highlight cleared');
  // a selection is read instead of the page
  await p.keyboard.press('Escape');
  await p.evaluate(() => { const el = document.querySelector('#gap .gap__claim'); const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); });
  await p.evaluate(() => { window.__spoken = []; ERLY.a11y.readAloud(); }); await p.waitForTimeout(400);
  assert.match(await p.evaluate(() => __spoken[0]), /School exams measure/, 'reads the selection');
  await p.evaluate(() => ERLY.a11y.reader.stop());

  // mobile: the panel fits and its controls are large enough to tap
  const m = await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true }); await m.addInitScript(() => sessionStorage.setItem('acubins-role', 'student'));
  const mp = await m.newPage(); await mp.goto(BASE + 'student.html'); await mp.waitForTimeout(700); await mp.tap('#a11yFab'); await mp.waitForTimeout(300);
  const box = await mp.evaluate(() => { const r = document.getElementById('a11yPanel').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
  assert.ok(box.l >= 0 && box.r <= box.w, 'panel fits on a phone');
  const small = await mp.evaluate(() => [...document.querySelectorAll('#a11yPanel button')].filter(x => x.getClientRects().length).map(x => x.getBoundingClientRect()).filter(r => r.height < 32 || r.width < 32).length);
  assert.equal(small, 0, 'every panel button is at least 32 px');

  assert.deepEqual(errors, [], 'page errors');
  console.log('accessibility centre e2e: all checks passed');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
