// v17 Noor: ready by default (no "Turn on" step), visible disclosure + "On this device only", automatic on-device
// noticing (told once, pausable centrally), keyboard-safe composer on touch devices, scrolling, composer keys.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/noor-v17.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + (e.message || e).split('\n')[0].slice(0, 240) + ' @' + ((e.stack || '').match(/e2e.js:(\d+)/) || [])[1]]); } };

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const page = async (opts = {}, init) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 860 } }, opts));
    await ctx.addInitScript(init || (() => {}));
    await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    p.net = []; p.on('request', r => { if (/pollinations\.ai|workers\.dev|\/v1\/chat/.test(r.url())) p.net.push(r.url()); });
    // a stand-in online model, so nothing real is contacted
    await p.route(/text\.pollinations\.ai/, route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"choices":[{"delta":{"content":"Photosynthesis turns light into chemical energy."}}]}\n\ndata: [DONE]\n\n' }));
    return p;
  };
  const DEF = () => localStorage.setItem('erly-ai-default-online', '1'); // opt this automated browser into the real default

  await check('Noor is ready by default with no activation step', async () => {
    const p = await page({}, DEF);
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(800);
    assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'online');
    assert.equal(await p.evaluate(() => ERLY.companion.ai.ready()), true);
    await p.click('.cmp-launch'); await p.waitForTimeout(900);
    assert.equal(await p.locator('.cbcard').count(), 0, 'no "turn on" card');
    const txt = await p.evaluate(() => document.querySelector('.cmp').innerText);
    assert.ok(!/ChatGPT|Turn on Noor Online/i.test(txt), 'no activation wording');
    await p.context().close();
  });
  await check('nothing leaves the device until Send; the disclosure names the service', async () => {
    const p = await page({}, DEF);
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(700); await p.click('.cmp-launch'); await p.waitForTimeout(700);
    assert.match(await p.textContent('#cmpPrivacy'), /only when you press Send/);
    await p.fill('#cmpText', 'what is photosynthesis'); await p.waitForTimeout(400);
    assert.equal(p.net.length, 0, 'typing sends nothing');
    await p.press('#cmpText', 'Enter');
    await p.waitForFunction(() => /chemical energy/.test(document.querySelector('#cmpLog').innerText), null, { timeout: 15000 });
    assert.ok(p.net.length >= 1, 'the message was sent after Send');
    await p.context().close();
  });
  await check('"On this device only" is one tap, remembered, and sends nothing', async () => {
    const p = await page({}, DEF);
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(700); await p.click('.cmp-launch'); await p.waitForTimeout(700);
    await p.click('#cmpPrivacy [data-priv="local"]');
    assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'local');
    await p.reload(); await p.waitForTimeout(800);
    assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'local', 'choice survives a reload');
    await p.click('.cmp-launch'); await p.waitForTimeout(700);
    await p.fill('#cmpText', 'who won the 1998 world cup'); await p.press('#cmpText', 'Enter'); await p.waitForTimeout(2500);
    assert.equal(p.net.length, 0, 'no AI request on device-only');
    assert.match(await p.textContent('#cmpLog'), /on this device only/i);
    await p.context().close();
  });
  await check('central settings switch Noor Online and noticing, in sync with Noor', async () => {
    const p = await page({}, DEF);
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(800);
    await p.evaluate(() => ERLY.a11y.open()); await p.waitForTimeout(300);
    await p.click('.a11y [data-tab="learning"]'); await p.waitForTimeout(200);
    const on = p.locator('.a11y [data-k="noorOnline"]'), mon = p.locator('.a11y [data-k="noorNotice"]');
    assert.equal(await on.isChecked(), true); assert.equal(await mon.isChecked(), true, 'noticing is on by default');
    await on.uncheck({ force: true }); await mon.uncheck({ force: true });
    assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'local');
    assert.equal(await p.evaluate(() => ERLY.companion.store.consent('monitoring')), false);
    await on.check({ force: true });
    assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'online');
    await p.context().close();
  });
  await check('noticing: told once, never asked; pausing stops it', async () => {
    const p = await page();
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(700); await p.click('.cmp-launch'); await p.waitForTimeout(800);
    assert.equal(await p.locator('text=Can I notice reading friction').count(), 0, 'no yes/no question');
    assert.equal(await p.locator('.ccard--notice').count(), 1, 'a one-time notice');
    await p.click('.ccard--notice [data-c="pause"]');
    assert.equal(await p.evaluate(() => ERLY.companion.store.consent('monitoring')), false);
    await p.reload(); await p.waitForTimeout(700); await p.click('.cmp-launch'); await p.waitForTimeout(800);
    assert.equal(await p.locator('.ccard--notice').count(), 0, 'not shown again');
    await p.context().close();
  });
  await check('automated browsers start on-device (test runs never use the free service)', async () => {
    const p = await page();
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(700);
    assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'local');
  });
  await check('iPhone keyboard: the panel follows the visual viewport, composer stays above the keyboard', async () => {
    // Chromium can't raise a real iOS keyboard, so a stand-in visualViewport reports what Safari does:
    // the height shrinks and the visual viewport pans down (offsetTop) while the layout viewport stays the same
    const p = await page(devices['iPhone 13'], () => {
      const vv = new EventTarget(); vv.height = innerHeight; vv.width = innerWidth; vv.offsetTop = 0; vv.offsetLeft = 0; vv.scale = 1; vv.pageTop = 0;
      Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true }); window.__vv = vv;
    });
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(800); await p.tap('.cmp-launch'); await p.waitForTimeout(900);
    const H = await p.evaluate(() => innerHeight);
    await p.evaluate(() => { const v = window.__vv; v.height = innerHeight - 336; v.offsetTop = 120; v.dispatchEvent(new Event('resize')); v.dispatchEvent(new Event('scroll')); });
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => { const c = document.querySelector('.cmp').getBoundingClientRect(), f = document.querySelector('#cmpForm').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, form: f.bottom, kb: document.querySelector('.cmp').classList.contains('is-kb') }; });
    assert.ok(r.kb, 'keyboard state detected');
    assert.ok(Math.abs(r.top - (120 + 8)) <= 10, 'panel top follows the visual viewport: ' + r.top);
    assert.ok(r.bottom <= 120 + (H - 336) + 1, 'panel ends at the keyboard: ' + r.bottom);
    assert.ok(r.form <= 120 + (H - 336) + 1 && r.form > 120 + (H - 336) - 80, 'composer sits on the keyboard: ' + r.form);
    await p.evaluate(() => { const v = window.__vv; v.height = innerHeight; v.offsetTop = 0; v.dispatchEvent(new Event('resize')); });
    await p.waitForTimeout(150);
    const r2 = await p.evaluate(() => { const c = document.querySelector('.cmp').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, kb: document.querySelector('.cmp').classList.contains('is-kb') }; });
    assert.ok(!r2.kb && r2.top >= 0 && r2.top <= 12 && Math.abs(r2.bottom - H) <= 2, 'panel returns to full height, no jump: ' + JSON.stringify(r2));
    assert.equal(await p.evaluate(() => scrollY), 0, 'the page behind never scrolled');
    await p.context().close();
  });
  await check('composer: Shift+Enter adds a line, Enter sends once, the box grows and the log stays pinned', async () => {
    const p = await page();
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(700); await p.click('.cmp-launch'); await p.waitForTimeout(700);
    for (let i = 0; i < 6; i++) { await p.fill('#cmpText', 'study tip ' + i); await p.press('#cmpText', 'Enter'); await p.waitForTimeout(500); }
    await p.waitForTimeout(800);
    const h0 = await p.evaluate(() => document.querySelector('#cmpText').offsetHeight);
    await p.fill('#cmpText', 'line one'); await p.press('#cmpText', 'Shift+Enter'); await p.keyboard.type('line two'); await p.press('#cmpText', 'Shift+Enter'); await p.keyboard.type('line three');
    assert.equal(await p.inputValue('#cmpText'), 'line one\nline two\nline three');
    assert.ok(await p.evaluate(() => document.querySelector('#cmpText').offsetHeight) > h0, 'the box grows');
    await p.waitForTimeout(1200);
    const gap = await p.evaluate(() => { const l = document.querySelector('#cmpLog'); return [l.scrollHeight - l.scrollTop - l.clientHeight, l.__pinned, l.__erlyFollow, l.scrollHeight, l.clientHeight]; });
    assert.ok(gap[0] < 30, 'still at the latest message after the box grew: ' + gap);
    const n = await p.locator('.cmsg--you').count();
    await p.press('#cmpText', 'Enter'); await p.press('#cmpText', 'Enter');
    await p.waitForTimeout(400);
    assert.equal(await p.locator('.cmsg--you').count(), n + 1, 'one message, not two');
    await p.context().close();
  });
  await check('scrolled up: new replies do not move the reader; "New messages" jumps to the latest', async () => {
    const p = await page();
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(700); await p.click('.cmp-launch'); await p.waitForTimeout(700);
    for (let i = 0; i < 6; i++) { await p.fill('#cmpText', 'how do I plan revision ' + i); await p.press('#cmpText', 'Enter'); await p.waitForTimeout(700); }
    await p.waitForTimeout(800);
    const box = await p.locator('#cmpLog').boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + 80);
    for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, -600); await p.waitForTimeout(40); } // the reader scrolls up with the wheel
    await p.waitForTimeout(500);
    await p.evaluate(() => ERLY.companion._ui.aiSays('A new reply arrives.', 'رد جديد.'));
    await p.waitForTimeout(900);
    assert.ok(await p.evaluate(() => document.querySelector('#cmpLog').scrollTop) < 5, 'reader not moved');
    assert.equal(await p.isVisible('#cmpNewMsg'), true, 'new-messages button: ' + JSON.stringify(await p.evaluate(() => { const l = document.querySelector('#cmpLog'); return [l.scrollTop, l.__pinned, l.__erlyFollow, document.querySelector('#cmpNewMsg').hidden, l.scrollHeight, l.clientHeight]; })));
    await p.click('#cmpNewMsg');
    await p.waitForFunction(() => { const l = document.querySelector('#cmpLog'); return l.scrollHeight - l.scrollTop - l.clientHeight < 30; }, null, { timeout: 3000 });
    assert.equal(await p.evaluate(() => scrollY), 0, 'the page did not move');
    await p.context().close();
  });

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  const fail = results.filter(r => r[1] !== 'PASS').length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail || errors.length ? 1 : 0);
})();
