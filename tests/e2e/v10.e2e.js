// v10/v12: Learning Games (all 12 played correctly, pause/skip/stop, settings, privacy)
// and the Growth Plan (timetable, planner, programme, review, progress, strategies, future plan).
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

  /* ================= Growth Plan ================= */
  await p.goto(BASE + 'support.html?fast=1');
  await p.click('[data-next]'); await p.click('[data-area="reading"]'); await p.click('[data-next]');
  for (let i = 0; i < 4; i++) { const pills = p.locator('.gx-body button:not([data-next])'); if (await pills.count()) await pills.first().click(); await p.click('[data-next]'); }
  await p.click('[data-startplan]'); await p.waitForSelector('.gv-tabs');
  assert.doesNotMatch(await p.textContent('#growthApp'), /streak/i, 'no streaks anywhere');
  assert.equal(await p.locator('.gv-tabs [role="tab"]').count(), 7);
  // timetable
  await p.click('[data-gvtab="timetable"]');
  assert.equal(await p.locator('.gv-col').count(), 7, 'Mon–Sun grid');
  assert.ok(await p.locator('[data-col="mon"] .gv-b--lunch').count(), 'lunch on weekdays');
  assert.match(await p.textContent('[data-col="sat"]'), /Optional catch-up/);
  assert.match(await p.textContent('[data-col="sun"]'), /Rest day/);
  assert.match(await p.textContent('[data-col="mon"] .gv-b'), /08:30/);
  if (SHOT) await p.waitForTimeout(900); if (SHOT) await p.screenshot({ path: SHOT + '/growth-timetable.png', fullPage: true });
  await p.click('.gv-set summary');
  await p.fill('[data-gvtt] [name="start"]', '09:00'); await p.selectOption('[data-gvtt] [name="session"]', '30'); await p.click('[data-gvtt] .gv-btn');
  assert.match(await p.textContent('[data-col="tue"] .gv-b'), /09:00/, 'start time customised');
  await p.selectOption('[data-gvfix] [name="day"]', 'mon'); await p.fill('[data-gvfix] [name="from"]', '10:00'); await p.fill('[data-gvfix] [name="to"]', '11:00'); await p.fill('[data-gvfix] [name="label"]', 'Biology lecture'); await p.click('[data-gvfix] .gv-btn');
  assert.match(await p.textContent('[data-col="mon"] .gv-b--class'), /Biology lecture/, 'a class is placed');
  // planner (move to Wednesday, which has the Plan It game this week) — evidence is suggested, not auto-ticked
  await p.click('[data-gvtab="today"]');
  const wed = await p.evaluate(() => { const d = new Date(); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() + ((2 - k + 7) % 7)); const pad = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); });
  await p.evaluate(k => { const db = JSON.parse(localStorage.getItem('erly-games-v1')); db.sessions.push({ g: 'plan', at: new Date(k + 'T11:00:00').getTime(), n: 1, ok: 1, mins: 3 }); localStorage.setItem('erly-games-v1', JSON.stringify(db)); const V = JSON.parse(localStorage.getItem('erly-gplan-v10')); V.day = k; localStorage.setItem('erly-gplan-v10', JSON.stringify(V)); }, wed);
  await p.reload(); await p.waitForSelector('.gv-tabs'); await p.click('[data-gvtab="today"]');
  const items = p.locator('.gv-e');
  assert.ok(await items.count() >= 2, 'planned entries for the day');
  assert.match(await p.textContent('.gv-list'), /You played this game \d+× on this day/, 'real activity is suggested as evidence');
  assert.equal(await p.locator('.gv-e.is-done').count(), 0, 'but nothing is ticked automatically');
  await items.nth(0).locator('[data-gv="done"]').first().click();
  await p.fill('.gv-modal textarea', 'Ordering by what each step needs made sense'); await p.fill('.gv-modal input', 'Use it on my essay');
  await p.click('.gv-modal [data-m="0"]'); await p.waitForTimeout(300);
  assert.equal(await p.locator('.gv-e.is-done').count(), 1); assert.match(await p.textContent('.gv-e.is-done'), /Use it on my essay/);
  await p.locator('.gv-e:not(.is-done)').first().locator('[data-gv="skip"]').click();
  assert.equal(await p.locator('.gv-e.is-skipped').count(), 1, 'skip without penalty');
  await p.fill('[data-gvadd] [name="t"]', 'Chemistry problem sheet'); await p.click('[data-gvadd] .gv-btn');
  assert.match(await p.textContent('.gv-e.is-own'), /Chemistry problem sheet/, 'own work added');
  await p.locator('.gv-e.is-own [data-gvmins]').selectOption('45');
  const before = await p.$$eval('.gv-e', els => els.map(e => e.dataset.id));
  await p.locator('.gv-e').nth(1).locator('[data-gv="up"]').click();
  const after = await p.$$eval('.gv-e', els => els.map(e => e.dataset.id));
  assert.deepEqual([after[0], after[1]], [before[1], before[0]], 'rearranged');
  const n0 = await items.count();
  await p.locator('.gv-e.is-own [data-gv="tomorrow"]').click();
  assert.equal(await items.count(), n0 - 1, 'rescheduled to tomorrow');
  await p.click('[data-gv="next"]'); assert.match(await p.textContent('.gv-list'), /Chemistry problem sheet/, 'and it is there tomorrow');
  if (SHOT) { await p.click('[data-gv="prev"]'); await p.waitForTimeout(900); await p.screenshot({ path: SHOT + '/growth-planner.png', fullPage: true }); }
  // six weeks: journey map + weekly cards; weekly review from real answers
  await p.click('[data-gvtab="programme"]');
  assert.equal(await p.locator('.gv-j__n').count(), 6); assert.equal(await p.locator('.gv-wk').count(), 6);
  assert.match(await p.textContent('#gvw4'), /Start-Ramp/);
  if (SHOT) await p.screenshot({ path: SHOT + '/growth-programme.png', fullPage: true });
  await p.click('.gv-wk.is-now [data-gv="review"]');
  await p.click('.gv-review [data-v="4"]');
  await p.click('.gv-review [data-v="morph"]'); await p.click('.gv-review [data-q="next"]');
  await p.click('.gv-review [data-v="time"]'); await p.click('.gv-review [data-v="same"]');
  await p.fill('.gv-review textarea', 'More breaks please'); await p.click('.gv-review [data-q="next"]');
  const rv = await p.textContent('.gv-review');
  assert.match(rv, /You completed 1 planned activity/, 'the review quotes real activity');
  assert.match(rv, /Word parts/); assert.match(rv, /More breaks please/); assert.match(rv, /no AI model and no server/);
  assert.doesNotMatch(rv, /dyslex|adhd|diagnos|disorder|probab/i);
  await p.click('.gv-review [data-q="ok"]'); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => ERLY_GPV10.state().week), 2, 'moved on to week 2');
  await p.click('[data-gv="repeat"]'); assert.equal(await p.evaluate(() => ERLY_GPV10.state().week), 2, 'repeat keeps the week');
  await p.click('[data-gv="pause"]'); assert.match(await p.textContent('.gv-paused'), /paused/); await p.click('.gv-paused [data-gv="resume"]');
  // progress from real data
  await p.click('[data-gvtab="progress"]');
  assert.match(await p.textContent('.gv-pr__top'), /1\s*activities done/);
  assert.match(await p.textContent('.gv-pr'), /Ordering by what each step needs/, 'reflections listed');
  assert.match(await p.textContent('.gv-pr'), /never turns it into a score of ability/);
  if (SHOT) await p.screenshot({ path: SHOT + '/growth-progress.png', fullPage: true });
  // strategies → future plan
  await p.click('[data-gvtab="strategies"]'); await p.click('[data-gvstrat="spacing:helpful"]');
  await p.click('[data-gvtab="future"]');
  const fu = await p.textContent('.gv-fu'); assert.match(fu, /Spaced review/); assert.match(fu, /Word parts/, 'strategies kept from the review');
  // mobile: timetable becomes a day-by-day view
  await p.setViewportSize({ width: 390, height: 844 });
  await p.click('[data-gvtab="timetable"]');
  assert.equal(await p.locator('.gv-col:visible').count(), 1, 'one day at a time on a phone');
  await p.click('[data-gvday="sun"]'); assert.match(await p.textContent('.gv-col.is-sel'), /Rest day/);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov <= 1, 'no horizontal scroll at 390px (' + ov + ')');
  if (SHOT) { await p.click('[data-gvday="mon"]'); await p.waitForTimeout(900); await p.screenshot({ path: SHOT + '/growth-timetable-mobile.png', fullPage: true }); }
  await p.goto(BASE + 'games.html'); await p.waitForTimeout(500);
  const ov2 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov2 <= 1, 'games: no horizontal scroll at 390px');
  if (SHOT) await p.screenshot({ path: SHOT + '/games-mobile.png' });

  assert.equal(await p.evaluate(() => window.__media), 0, 'never asked for the camera or microphone');
  assert.deepEqual(foreign, [], 'no requests to other servers');
  assert.deepEqual(errors, [], 'no console errors');
  console.log('v10 games + growth plan e2e: all checks passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
