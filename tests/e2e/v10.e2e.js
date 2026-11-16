// v10/v12: Learning Games (all 12 played correctly, pause/skip/stop, settings, privacy)
// and a smoke check of the v18 Growth Plan (its full tests are growth-v18.e2e.js).
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/v10.e2e.js
// ERLY_SHOTS=<dir> also saves screenshots.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;
const ORIGIN = new URL(BASE).origin;

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [], foreign = [];
  const watch = p => {
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|GL Driver|GPU stall/.test(m.text())) errors.push(m.text()); });
    p.on('request', r => { const u = new URL(r.url()); if (u.origin !== ORIGIN && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) && u.protocol !== 'data:' && u.protocol !== 'blob:') foreign.push(r.url()); });
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    if (!sessionStorage.getItem('v10-init')) { ['erly-games-v1', 'erly-gplan-v10', 'erly-growth-v1'].forEach(k => localStorage.removeItem(k)); localStorage.setItem('erly-theme', 'light'); sessionStorage.setItem('v10-init', '1'); }
    // privacy probes: any microphone / camera request or audio context is recorded
    window.__media = 0; window.__audio = 0; window.__spoken = [];
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.__media++; return Promise.reject(new Error('blocked')); };
    const AC = window.AudioContext; if (AC) window.AudioContext = function () { window.__audio++; return new AC(); };
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: u => window.__spoken.push(u.text), cancel() {}, pause() {}, resume() {}, getVoices: () => [], addEventListener() {} }, configurable: true });
  });
  const p = await ctx.newPage(); watch(p);

  /* ================= Learning Games ================= */
  await p.goto(BASE + 'games.html'); await p.waitForTimeout(700);
  assert.match(await p.textContent('.gm-bound'), /do not test, detect or diagnose/, 'non-diagnostic boundary is stated');
  assert.equal(await p.locator('.gm-card').count(), 12, 'twelve activities');
  assert.equal(await p.locator('.gm-cats [role="tab"]').count(), 11, 'all + ten categories');
  assert.match(await p.textContent('.gm-hero h1'), /Learning Games/); assert.equal(await p.getAttribute('.gm-hero__dash', 'href'), 'student.html', 'return to dashboard');
  const cats = await p.$$eval('.gm-card', els => [...new Set(els.map(e => e.dataset.g))]);
  assert.equal(cats.length, 12);
  assert.equal(await p.getAttribute('[data-set="sound:false"]', 'aria-checked'), 'true', 'sound is OFF by default');
  if (SHOT) await p.screenshot({ path: SHOT + '/games-hub.png' });
  await p.click('[data-set="length:short"]');
  const cur = () => p.evaluate(() => JSON.parse(JSON.stringify(ERLY.games.current())));
  const roundNo = () => p.evaluate(() => ERLY.games.current().idx);
  async function start(id) { await p.click(`.gm-card [data-play="${id}"]`); await p.waitForSelector('.gm-intro [data-start]'); assert.ok(await p.locator('.gm-intro ol li').count() >= 3, id + ': instructions on the intro screen'); await p.click('.gm-intro [data-start]'); await waitRound(0); }
  async function waitRound(n) { await p.waitForFunction(k => ERLY.games.current() && ERLY.games.current().idx === k, n, { timeout: 15000 }); await p.waitForTimeout(150); }
  const players = {
    async words(r) { const parts = r.round[1]; for (const part of parts) await p.locator('.gp-tile:not([disabled])', { hasText: new RegExp('^' + part + '$') }).first().click(); await p.click('[data-check]'); },
    async order(r) { for (let k = 0; k < r.round.length; k++) await p.click(`.gp-sent[data-k="${k}"]`); },
    async sequence(r) { await p.waitForSelector('.gp-pads:not([data-lock])', { timeout: 15000 }); for (const k of r.round) await p.click(`.gp-pad[data-p="${k}"]`); },
    async chunk(r) { await p.waitForSelector('.gp-input', { timeout: 20000 }); await p.fill('.gp-input', r.round.digits); await p.press('.gp-input', 'Enter'); },
    async plan(r) { for (const t of r.round.tasks) await p.click(`.gp-sent[data-id="${t[0]}"]`); },
    async switch(r) { for (const t of r.round) { const want = t.rule === 'shape' ? (t.shape === 'circle' ? 0 : 1) : (t.colour === 'blue' ? 0 : 1); await p.click(`.gp-choice [data-a="${want}"]`); await p.waitForTimeout(420); } },
    async rotate(r) { await p.waitForSelector('[data-ans]'); await p.click(`[data-ans="${r.round.mirror ? 'mirror' : 'same'}"]`); },
    async comprehend(r) { await p.click(`.gp-sent[data-o="${r.round.q[2]}"]`); },
    async spark() { await p.fill('.gp-spark__ta', 'The library was quiet at midnight. A map fell out of the warm book. I followed it.'); await p.click('[data-done]'); },
    async pattern(r) { await p.click(`.gp-sent[data-o="${r.round.ans}"]`); },
    async hanoi(r) { const mv = []; const h = (n, a, b, c) => { if (!n) return; h(n - 1, a, c, b); mv.push([a, c]); h(n - 1, b, a, c); }; h(r.round, 0, 1, 2); for (const [a, c] of mv) { await p.click(`.gp-peg[data-peg="${a}"]`); await p.click(`.gp-peg[data-peg="${c}"]`); } },
    async listen(r) { await p.waitForFunction(() => { const s = document.querySelector('.gp-say'); return !s || s.classList.contains('is-hidden'); }, null, { timeout: 20000 }); for (const s of r.round.steps) { const k = r.round.items.findIndex(it => it.c[0] === s.c[0] && it.s[0] === s.s[0]); await p.click(`.gp-lit[data-k="${k}"]`); } }
  };
  for (const id of Object.keys(players)) {
    await start(id);
    if (SHOT && (id === 'rotate' || id === 'words' || id === 'listen')) await p.screenshot({ path: `${SHOT}/game-${id}.png` });
    const r = await cur();
    await players[id](r);
    await p.waitForFunction(() => /is-ok/.test(document.querySelector('.gm-p__fb').className), null, { timeout: 8000 }).catch(() => {});
    assert.match(await p.getAttribute('.gm-p__fb', 'class'), /is-ok/, id + ': a correct answer is recognised');
    await p.click('[data-c="stop"]');
    await p.waitForSelector('.gm-p__end');
    assert.match(await p.textContent('.gm-p__end'), /Strategies worth trying/, id + ': strategy feedback');
    assert.doesNotMatch(await p.textContent('.gm-p__end'), /dyslex|adhd|autis|diagnos|disorder|risk|probab/i, id + ': no clinical language at the end');
    await p.click('[data-c="close"]'); await p.waitForTimeout(300);
  }
  const sess = await p.evaluate(() => ERLY.games.sessions());
  assert.deepEqual(sess.map(s => s.g).sort(), Object.keys(players).sort()); assert.ok(sess.every(s => s.ok === 1 && s.n === 1), 'each recorded one correct round');

  // participation achievements + recent activity (v12); the story text itself is never stored
  for (const b of ['first', 'explorer', 'curious', 'writer', 'solver']) assert.match(await p.getAttribute(`[data-badge="${b}"]`, 'class'), /is-on/, 'achievement ' + b);
  assert.equal(await p.locator('.gm-recent li').count(), 4, 'recent activity');
  assert.doesNotMatch(await p.evaluate(() => JSON.stringify(localStorage)), /midnight|followed it/, 'story text is not stored');
  // restart and try-another
  await start('pattern'); await p.click('.gm-p__tools [data-c="again"]'); await p.waitForSelector('.gm-intro [data-start]'); await p.click('.gm-intro [data-start]'); await waitRound(0);
  await p.click('[data-c="stop"]'); await p.click('.gm-p__end [data-c="other"]'); await p.waitForTimeout(450); await p.waitForSelector('.gm-intro [data-start]');
  assert.doesNotMatch(await p.textContent('.gm-player.is-in .gm-p__h b'), /Pattern Seeker/, 'another game opens'); await p.click('[data-c="stop"]'); await p.click('[data-c="close"]'); await p.waitForTimeout(300);
  // pause (nothing advances), skip (moves on, no penalty), stop
  await start('sequence');
  await p.click('[data-c="pause"]'); assert.equal(await p.isVisible('.gm-p__pause'), true, 'pause overlay');
  await p.waitForTimeout(2500); assert.equal(await roundNo(), 0, 'paused: still round 1');
  assert.equal(await p.locator('.gp-pad.is-lit').count() <= 1, true);
  await p.click('[data-c="resume"]'); await p.click('[data-c="skip"]'); await waitRound(1);
  await p.click('[data-c="skip"]'); await waitRound(2);
  await p.keyboard.press('Escape'); assert.equal(await p.isVisible('.gm-p__pause'), true, 'Esc pauses');
  await p.keyboard.press('Escape');
  await p.click('[data-c="stop"]'); await p.waitForSelector('.gm-p__end');
  assert.match(await p.textContent('.gm-p__end'), /Stopped — that’s completely fine/);
  await p.click('[data-c="helped"][data-h="chunk"]');
  await p.click('[data-c="close"]');

  // low-performance graphics + sound on: the 3D game still works; sound only after opting in
  assert.equal(await p.evaluate(() => window.__audio), 0, 'no audio context while sound is off');
  await p.click('[data-set="quality:low"]'); await p.click('[data-set="sound:true"]');
  await start('rotate');
  assert.ok(await p.locator('.gp-3d__c').count(), '3D canvas in low-performance mode');
  await p.click('[data-c="stop"]'); await p.click('[data-c="close"]');
  await start('listen'); await p.waitForTimeout(300);
  assert.ok((await p.evaluate(() => window.__spoken.join(' '))).startsWith('Tap the'), 'with sound on, instructions are spoken');
  await p.click('[data-c="stop"]'); await p.click('[data-c="close"]');
  await p.click('[data-set="sound:false"]');
  // progress panel + clear
  await p.click('[data-prog]'); assert.match(await p.textContent('.gm-prog'), /Stored only on this device/);
  if (SHOT) await p.screenshot({ path: SHOT + '/games-progress.png' });
  await p.click('.gm-prog [data-c="close"]');
  // deep link from the Growth Plan
  await p.goto(BASE + 'games.html?play=plan'); await p.click('.gm-intro [data-start]'); await waitRound(0);
  assert.match(await p.textContent('.gm-p__h b'), /Plan It/);
  await p.click('[data-c="stop"]'); await p.click('[data-c="close"]');

  /* ================= Growth Plan (v18 rebuild; full coverage in tests/e2e/growth-v18.e2e.js) ================= */
  await p.goto(BASE + 'support.html'); await p.waitForSelector('#gpApp .gp-first, #gpApp .gp-tabs'); // v20: programmes view first
  assert.doesNotMatch(await p.textContent('#gpApp'), /streak/i, 'no streaks in the programmes view');
  await p.goto(BASE + 'support.html#/timetable'); await p.waitForSelector('#growthApp .gx');
  assert.doesNotMatch(await p.textContent('#growthApp'), /streak/i, 'no streaks in the timetable');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov <= 1, 'Growth Plan: no horizontal scroll at 390px (' + ov + ')');
  await p.goto(BASE + 'games.html'); await p.waitForTimeout(500);
  const ov2 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov2 <= 1, 'games: no horizontal scroll at 390px');
  if (SHOT) await p.screenshot({ path: SHOT + '/games-mobile.png' });

  assert.equal(await p.evaluate(() => window.__media), 0, 'never asked for the camera or microphone');
  assert.deepEqual(foreign, [], 'no requests to other servers');
  assert.deepEqual(errors, [], 'no console errors');
  console.log('v10 games + growth plan e2e: all checks passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
