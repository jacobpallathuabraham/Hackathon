// Growth Plan v20 — programmes, goals, configuration, a full daily session, reflection, weekly review,
// pause/resume/restart/remove, history, data controls and the timetable tab, in a real browser.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/growth-v20.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + String(e.message || e).split('\n')[0].slice(0, 260)]); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); window.__growthToday = window.__growthToday || '2026-11-16'; });
  const p = await ctx.newPage(); const errs = [], posts = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('request', r => { if (r.method() !== 'GET') posts.push(r.url()); }); p.on('dialog', d => d.accept());
  const GP = f => p.evaluate(f);
  await p.goto(BASE + 'support.html'); await p.waitForTimeout(900);

  await check('first visit asks where to keep the plan; nothing is stored before choosing', async () => {
    assert.ok(await p.isVisible('[data-consent="device"]')); assert.ok(await p.isVisible('[data-consent="visit"]'));
    assert.equal(await GP(() => localStorage.getItem('erly-growth-v20')), null);
  });
  await p.click('[data-consent="device"]'); await p.waitForTimeout(200);
  await check('empty dashboard shows the six optional programmes with non-clinical wording', async () => {
    assert.equal(await p.locator('.gp-cat li').count(), 6);
    const t = await p.textContent('#gpApp'); assert.match(t, /not a test or a treatment/); assert.doesNotMatch(t, /diagnos|disorder|deficit/i);
  });
  await check('set up a programme: suggested + custom goals, days, length, breaks', async () => {
    await p.click('a[href="#/new/reading"]'); await p.waitForSelector('.gp-form');
    await p.check('input[name="goal"] >> nth=0'); await p.fill('#gpCustom', 'Read one article a week for fun'); await p.press('#gpCustom', 'Enter');
    await p.click('.gp-days label:has(input[value="mon"])'); // Monday was on by default: now off
    await p.click('.gp-days label:has(input[value="mon"])'); // and on again
    await p.click('.gp-seg label:has(input[name="mins"][value="10"])'); await p.click('.gp-seg label:has(input[name="breaks"][value="between"])');
    await p.click('.gp-form button[type="submit"]'); await p.waitForSelector('.gp-danger');
    const P = await GP(() => ERLY.growthPlan.state().programmes.reading);
    assert.equal(P.cfg.mins, 10); assert.equal(P.cfg.breaks, 'between'); assert.ok(P.cfg.days.includes('mon'));
    assert.deepEqual(P.goals.map(g => [g.text, g.custom]), [['Find the main idea of a text faster', false], ['Read one article a week for fun', true]]);
  });
  await check('choosing no days is caught with a message', async () => {
    await p.goto(BASE + 'support.html#/edit/reading'); await p.waitForSelector('.gp-form');
    for (const d of await p.$$eval('.gp-days input:checked', xs => xs.map(x => x.value))) await p.click(`.gp-days label:has(input[value="${d}"])`);
    await p.click('.gp-form button[type="submit"]'); assert.match(await p.textContent('.gp-err'), /at least one day/);
    await p.goto(BASE + 'support.html#/home'); await p.waitForTimeout(300);
  });
  await check('today shows the session; a full session runs with feedback, breaks and a reflection', async () => {
    assert.ok(await p.isVisible('a[href="#/do/reading"]'));
    await p.click('a[href="#/do/reading"]'); await p.waitForSelector('#gpStage h2');
    let types = [];
    for (let i = 0; i < 12; i++) {
      const t = await GP(() => { const r = ERLY.growthPlan.run(); return r.phase === 'act' ? r.list[r.i].type : r.phase; }); types.push(t);
      if (t === 'reflect') { await p.click('.gp-feel label:has(input[value="okay"])'); await p.fill('#gpNote', 'Shorter passages felt easier.'); await p.click('[data-a="finish"]'); break; }
      if (t === 'break') { assert.match(await p.textContent('#gpStage'), /Short break/); await p.click('[data-a="next"]'); continue; }
      if (t === 'mcq') { await p.click('[data-a="check"]'); assert.match(await p.textContent('.gp-fb'), /Choose an answer/); await p.click('.gp-opts label >> nth=1'); await p.click('[data-a="check"]'); assert.match(await p.textContent('.gp-fb'), /that’s it|best answer/); await p.click('[data-a="next"]'); }
      else if (t === 'write') { await p.fill('#gpWrite', 'Too short'); await p.click('[data-a="check"]'); assert.match(await p.textContent('.gp-fb'), /at least/); await p.fill('#gpWrite', 'Sleep helps the brain keep what it learned during the day.'); await p.click('[data-a="check"]'); await p.click('[data-a="next"]'); }
      else await p.click('[data-a="done"]');
      await p.waitForTimeout(120);
    }
    await p.waitForSelector('.gp-end');
    const day = await GP(() => ERLY.growthPlan.state().programmes.reading.days['2026-11-16']);
    assert.ok(Object.keys(day.acts).length >= 1, JSON.stringify(types)); assert.equal(day.reflection.feel, 'okay');
    assert.ok(types.includes('break'), JSON.stringify(types));
  });
  await check('progress persists across reload (saved on this device)', async () => {
    await p.goto(BASE + 'support.html#/home'); await p.reload(); await p.waitForTimeout(500);
    assert.ok(await GP(() => !!ERLY.growthPlan.state().programmes.reading.days['2026-11-16']));
    assert.equal(await p.locator('.gp-path li.is-done').count(), 1);
  });
  await check('goal checkboxes on the dashboard are saved', async () => {
    await p.goto(BASE + 'support.html#/home'); await p.waitForTimeout(300);
    await p.check('[data-goal^="reading|"] >> nth=0');
    assert.equal(await GP(() => ERLY.growthPlan.state().programmes.reading.goals[0].done), true);
  });
  await check('a week later a review is offered; "lighter" shortens the sessions', async () => {
    await GP(() => { window.__growthToday = '2026-11-23'; ERLY.growthPlan.render(); });
    assert.equal(await p.locator('.gp-banner').count(), 1); await p.click('.gp-banner a'); await p.waitForSelector('.gp-form');
    assert.match(await p.textContent('.gp-setup'), /You did 1 session/);
    await p.fill('#rvWent', 'Doing it after lunch.'); await p.click('.gp-seg label:has(input[value="lighter"])'); await p.click('.gp-form button[type="submit"]'); await p.waitForTimeout(300);
    const P = await GP(() => ERLY.growthPlan.state().programmes.reading); assert.equal(P.cfg.mins, 5); assert.equal(P.reviews.length, 1);
  });
  await check('pause and resume (the end date moves back), then restart clears activity', async () => {
    await p.goto(BASE + 'support.html#/p/reading'); await p.waitForSelector('[data-a="pause"]');
    const end0 = await GP(() => ERLY_GROWTH.endDate(ERLY.growthPlan.state().programmes.reading));
    await p.click('[data-a="pause"]'); await GP(() => { window.__growthToday = '2026-11-26'; ERLY.growthPlan.render(); }); await p.click('[data-a="resume"]');
    const end1 = await GP(() => ERLY_GROWTH.endDate(ERLY.growthPlan.state().programmes.reading)); assert.ok(end1 > end0, end0 + ' ' + end1);
    await p.click('.gp-danger summary'); await p.click('[data-a="restart"]'); await p.waitForTimeout(200);
    assert.deepEqual(await GP(() => ERLY.growthPlan.state().programmes.reading.days), {});
  });
  await check('add a second programme, then remove it', async () => {
    await p.goto(BASE + 'support.html#/new/planning'); await p.waitForSelector('.gp-form'); await p.click('.gp-form button[type="submit"]'); await p.waitForSelector('.gp-danger');
    await p.click('.gp-danger summary'); await p.click('[data-a="remove"]'); await p.waitForTimeout(200);
    assert.equal(await GP(() => !!ERLY.growthPlan.state().programmes.planning), false);
  });
  await check('history records what happened, in plain words', async () => {
    await p.goto(BASE + 'support.html#/history'); await p.waitForSelector('.gp-hist');
    const t = await p.textContent('.gp-hist'); for (const w of ['Started', 'Session', 'Weekly review', 'Paused', 'Resumed', 'Restarted', 'Removed']) assert.match(t, new RegExp(w));
  });
  await check('journey never labels a session as missed', async () => {
    await p.goto(BASE + 'support.html#/journey'); await p.waitForSelector('.gp-path');
    assert.doesNotMatch(await p.textContent('#gpApp'), /missed|failed|streak/i);
  });
  await check('stop saving, then delete everything', async () => {
    await p.goto(BASE + 'support.html#/history'); await p.waitForSelector('[data-a="tovisit"]'); await p.click('[data-a="tovisit"]');
    assert.equal(await GP(() => localStorage.getItem('erly-growth-v20')), null);
    await p.click('[data-a="wipe"]'); await p.waitForTimeout(200); assert.deepEqual(await GP(() => ERLY.growthPlan.state().programmes), {});
  });
  await check('the timetable is a tab of the Growth Plan', async () => {
    await p.goto(BASE + 'support.html#/timetable'); await p.waitForTimeout(600); assert.ok(await p.isVisible('#growthApp'));
    await p.goto(BASE + 'support.html#/home'); await p.waitForTimeout(300); assert.ok(!(await p.isVisible('#growthApp')));
  });
  await check('phone width: no sideways scroll', async () => {
    const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(BASE + 'support.html'); await m.waitForTimeout(700);
    assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390)); await m.close();
  });
  await check('nothing is sent anywhere; no page errors', async () => { assert.deepEqual(posts, []); assert.deepEqual(errs.filter(e => !/favicon|404/.test(e)), []); });

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? 'PASS ' : 'FAIL ') + n + (r === 'PASS' ? '' : ' — ' + r));
  const f = results.filter(r => r[1] !== 'PASS').length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
})();
