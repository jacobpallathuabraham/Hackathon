// v11: navigation, Back/Forward, refresh and the demo session.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/nav.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ ...devices['iPad Pro 11'] });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  // a fresh open of the login page, then sign in as the student
  await p.goto(BASE + 'login.html');
  await p.evaluate(() => { localStorage.setItem('erly-gplan-v10', JSON.stringify({ tt: {}, week: 3, status: 'active', planner: {}, reviews: [], prefs: {}, strat: {}, started: Date.now(), tab: 'today' })); });
  await p.click('[data-role="student"]').catch(() => {});
  await p.fill('#user', 'Acubins').catch(async () => { await p.fill('input[autocomplete="username"]', 'Acubins'); });
  await p.fill('#pass', '1234').catch(async () => { await p.fill('input[type="password"]', '1234'); });
  await p.click('#signIn'); await p.waitForURL(/student\.html/, { timeout: 10000 });
  // student → Growth Plan (through its seedling transition) → Back → Forward → Refresh
  await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('a.growth-cta').scrollIntoView()); await p.click('a.growth-cta');
  await p.waitForURL(/support\.html/, { timeout: 8000 }); await p.waitForSelector('.gv-tabs');
  await p.click('[data-gvtab="timetable"]');
  await p.goBack(); await p.waitForURL(/student\.html/); await p.waitForTimeout(600);
  assert.equal(await p.locator('.gw-grow').count(), 0, 'no leftover seedling overlay after Back');
  await p.goForward(); await p.waitForURL(/support\.html/); await p.waitForSelector('.gv-tabs');
  await p.reload(); await p.waitForSelector('.gv-tabs');
  assert.match(p.url(), /support\.html/, 'refresh keeps you signed in');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('erly-gplan-v10')).week), 3, 'progress kept through the whole journey');
  // Safari-style restore from memory with the leaving animation still on screen
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { const d = document.createElement('div'); d.className = 'gw-grow is-on'; document.body.appendChild(d); document.body.classList.add('is-leaving'); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  assert.equal(await p.locator('.gw-grow').count(), 0, 'a restored page clears the seedling overlay');
  assert.equal(await p.evaluate(() => document.body.classList.contains('is-leaving')), false);
  // the login page restored from memory is usable again
  await p.goto(BASE + 'login.html'); await p.evaluate(() => { document.getElementById('wipe').classList.add('is-on', 'is-accent'); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  assert.doesNotMatch(await p.getAttribute('#wipe', 'class'), /is-on/, 'login wipe cleared on restore');
  // a new tab (Safari drops the tab's session) opening a page directly stays signed in for 8 hours
  const p2 = await ctx.newPage(); await p2.goto(BASE + 'games.html'); await p2.waitForTimeout(600);
  assert.match(p2.url(), /games\.html/, 'direct URL in a new tab works while signed in');
  // the homepage opened directly no longer wipes the student's own progress
  await p2.goto(BASE + 'index.html'); await p2.waitForTimeout(400);
  assert.equal(await p2.evaluate(() => !!localStorage.getItem('erly-gplan-v10') && !!localStorage.getItem('acubins-session')), true, 'homepage keeps progress and sign-in');
  // sign out → protected pages ask to sign in, and come back to the page asked for
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { document.getElementById('userBtn').click(); document.getElementById('logoutBtn').click(); }); await p.waitForURL(/login\.html/);
  assert.equal(await p.evaluate(() => localStorage.getItem('acubins-session')), null, 'sign-out clears the device session');
  await p.goto(BASE + 'support.html'); await p.waitForURL(/login\.html\?next=student&back=support\.html/);
  await p.click('[data-role="student"]').catch(() => {}); await p.fill('#user', 'Acubins'); await p.fill('#pass', '1234'); await p.click('#signIn');
  await p.waitForURL(/support\.html/, { timeout: 10000 });
  assert.deepEqual(errors, []);
  console.log('navigation + session e2e: all checks passed'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
