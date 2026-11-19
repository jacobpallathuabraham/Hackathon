// Growth Plan v18 — the whole journey in a real browser: consent → free-text week → goals → preferences → plan →
// Today / Week (drag to move) / Calendar / Timeline / Progress → done / skip / reschedule → regenerate with a diff →
// export → Noor deep link → delete. "Today" is pinned to Monday 16 Nov 2026 so the test is repeatable.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/growth-v18.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + String(e.message || e).split('\n')[0].slice(0, 260)]); } };
const WEEK = 'I have football practice on Tuesdays 5-7pm. I am free after 4pm on weekdays and 10am-1pm on Saturdays. My chemistry exam is on 4 December. I lose focus after 25 minutes and I study best in the evening. Keep Sunday as a rest day.';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light'); window.__growthToday = '2026-11-16'; });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'support.html'); await p.evaluate(() => localStorage.setItem('erly-gplan-v10', '{"old":1}'));
  await p.waitForSelector('.gx--onb');
  const G = (fn, a) => p.evaluate(fn, a);

  await check('consent first: nothing is stored before the student agrees', async () => {
    assert.match(await p.textContent('.gx-card'), /Stored on this device only/); assert.match(await p.textContent('.gx-card'), /never scores your ability/);
    assert.equal(await G(() => localStorage.getItem('erly-growth-v18')), null);
    await p.click('[data-g="consent:device"]'); await p.waitForSelector('#gxText');
  });
  await check('the student’s own words are understood and shown back, editable, with the words they came from', async () => {
    await p.fill('#gxText', WEEK); await p.click('[data-g="understand"]'); await p.waitForSelector('.gx-understood');
    const av = await G(() => ERLY.growth.draft().profile.availability.map(a => `${a.day} ${a.start}-${a.end}`));
    assert.deepEqual(av, ['mon 16:00-21:00', 'tue 16:00-21:00', 'wed 16:00-21:00', 'thu 16:00-21:00', 'fri 16:00-21:00', 'sat 10:00-13:00']);
    assert.deepEqual(await G(() => ERLY.growth.draft().profile.commitments.map(c => `${c.day} ${c.start}-${c.end} ${c.label}`)), ['tue 17:00-19:00 football']);
    assert.match(await p.textContent('.gx-understood'), /exam · chemistry — 2026-12-04/); assert.match(await p.textContent('.gx-understood'), /25-minute sessions/);
    assert.ok(await p.locator('.gx-times small').count() >= 6, 'each row shows the sentence it came from');
    await p.selectOption('[data-t="availability:5:day"]', 'sat'); await p.fill('[data-t="availability:5:end"]', '14:00'); await p.locator('[data-t="availability:5:end"]').dispatchEvent('change');
    assert.equal(await G(() => ERLY.growth.draft().profile.availability[5].end), '14:00', 'rows are editable');
    await p.click('[data-g="to:goals"]'); await p.waitForSelector('.gx-add');
  });
  await check('goals: suggested from what was written; adaptive follow-up question; a free-text goal', async () => {
    assert.match(await p.textContent('.gx-card'), /\+ Chemistry exam · 2026-12-04/);
    await p.click('[data-g="addsug:0"]');
    await p.fill('.gx-add input[name="text"]', 'Get confident with calculus'); await p.selectOption('.gx-add select[name="kind"]', 'subject'); await p.click('.gx-add button');
    assert.match(await p.textContent('.gx-goals'), /Which topics\?/, 'asks for topics for a subject goal');
    const id = await G(() => ERLY.growth.draft().profile.goals[1].id);
    await p.fill(`[data-gf="${id}:topics"]`, 'limits, derivatives, integrals'); await p.locator(`[data-gf="${id}:topics"]`).dispatchEvent('change');
    assert.deepEqual(await G(() => ERLY.growth.draft().profile.goals[1].topics), ['limits', 'derivatives', 'integrals']);
    assert.equal(await G(() => ERLY.growth.draft().profile.goals[0].deadline), '2026-12-04');
    await p.click('[data-g="to:prefs"]');
  });
  await check('preferences come pre-filled from the text; the plan is built and breaks no constraint', async () => {
    assert.equal(await p.inputValue('[data-p="sessionLen"]'), '25'); assert.equal(await p.inputValue('[data-p="bestTime"]'), 'evening'); assert.equal(await p.inputValue('[data-p="restDay"]'), 'sun');
    await p.click('[data-g="to:preview"]'); await p.waitForSelector('.gx-week.is-preview');
    const r = await G(() => { const d = ERLY.growth.draft(); return { n: d.result.sessions.length, v: ERLY_GSCHED.violations(d.profile, d.result.sessions), tueClash: d.result.sessions.filter(s => ERLY_GSCHED.dayKey(s.date) === 'tue' && s.start < '19:15' && s.end > '16:45').length, afterDl: d.result.sessions.filter(s => s.goalId === d.profile.goals[0].id && s.date > '2026-12-04').length }; });
    assert.ok(r.n > 15, 'sessions ' + r.n); assert.deepEqual(r.v, []); assert.equal(r.tueClash, 0, 'football respected'); assert.equal(r.afterDl, 0, 'nothing after the exam');
    assert.ok(await p.locator('.gx-busy').count() >= 1, 'commitments drawn on the week');
    await p.click('[data-g="accept"]'); await p.waitForSelector('.gx-tabs');
    assert.ok(await G(() => !!localStorage.getItem('erly-growth-v18')), 'stored after consent');
  });
  await check('Today: every session says what to do and links to where it is done in ERLY', async () => {
    const n = await p.locator('.gx-sess').count(); assert.ok(n >= 1, 'sessions today ' + n);
    const href = await p.getAttribute('.gx-sess a.btn', 'href'); assert.match(href, /^(student\.html\?(ask|lesson)=|handwriting\.html)/);
    assert.ok(await p.locator('.gx-sess .gx-stepsl li').count() >= 3);
  });
  await check('mark done (minutes + how it felt), skip with a reason, undo', async () => {
    const ids = await G(() => ERLY.growth.state().sessions.filter(s => s.date === '2026-11-16').map(s => s.id));
    await p.click(`[data-g="done:${ids[0]}"]`); await p.fill(`[data-form="done:${ids[0]}"] input[name="minutes"]`, '22'); await p.check(`[data-form="done:${ids[0]}"] input[name="rating"][value="2"]`); await p.click(`[data-form="done:${ids[0]}"] button`);
    let s = await G(id => ERLY.growth.state().sessions.find(x => x.id === id), ids[0]); assert.equal(s.status, 'done'); assert.equal(s.minutes, 22); assert.equal(s.rating, 2);
    if (ids[1]) { await p.click(`[data-g="skip:${ids[1]}"]`); await p.selectOption(`[data-form="skip:${ids[1]}"] select`, { label: 'too tired' }); await p.click(`[data-form="skip:${ids[1]}"] button`); s = await G(id => ERLY.growth.state().sessions.find(x => x.id === id), ids[1]); assert.equal(s.status, 'skipped'); assert.equal(s.reason, 'too tired');
      await p.click(`[data-sid="${ids[1]}"] [data-g="undo:${ids[1]}"]`); assert.equal(await G(id => ERLY.growth.state().sessions.find(x => x.id === id).status, ids[1]), 'planned');
      await p.click(`[data-g="skip:${ids[1]}"]`); await p.selectOption(`[data-form="skip:${ids[1]}"] select`, { label: 'too tired' }); await p.click(`[data-form="skip:${ids[1]}"] button`); }
  });
  await check('reschedule: into football time is refused with the reason; the suggested free time is accepted', async () => {
    const id = await G(() => ERLY.growth.state().sessions.find(s => s.status === 'planned' && s.date > '2026-11-16').id);
    await G(id => { ERLY.growth.view('today'); }, id); await p.evaluate(id => { const s = ERLY.growth.state().sessions.find(x => x.id === id); document.querySelector('[data-g="day:1"]'); }, id);
    await p.evaluate(id => { const s = ERLY.growth.state().sessions.find(x => x.id === id); ERLY.growth.state(); window.__d = s.date; }, id);
    const date = await p.evaluate(() => window.__d); while (!(await p.locator(`[data-g="resched:${id}"]`).count())) await p.click('[data-g="day:1"]');
    await p.click(`[data-g="resched:${id}"]`); await p.fill(`[data-form="move:${id}"] input[name="date"]`, '2026-11-17'); await p.fill(`[data-form="move:${id}"] input[name="start"]`, '17:30'); await p.click(`[data-form="move:${id}"] button`);
    await p.waitForTimeout(200); assert.match(await p.textContent('#toast'), /clashes with a commitment|outside your free time/);
    assert.equal(await G(id => ERLY.growth.state().sessions.find(x => x.id === id).date, id), date, 'not moved');
    await p.click(`[data-g="resched:${id}"]`); await p.click(`[data-form="move:${id}"] button`); // the suggested slot
    const s = await G(id => ERLY.growth.state().sessions.find(x => x.id === id), id); assert.equal(s.locked, true);
    assert.deepEqual(await G(() => ERLY_GSCHED.violations(ERLY.growth.state().profile, ERLY.growth.state().sessions)), []);
  });
  await check('Week view: drag a session to a free slot moves it; dragging into football is refused', async () => {
    await p.click('[data-view="week"]'); await p.waitForSelector('.gx-week [data-drag]');
    await p.evaluate(() => { const g = document.querySelector('.gx-week'), h0 = +g.dataset.h0, px = +g.dataset.px; scrollTo({ top: g.getBoundingClientRect().top + scrollY + 34 + (16 * 60 - h0) * px - 120, behavior: 'instant' }); }); await p.waitForTimeout(150);
    const chip = p.locator('.gx-col[data-date="2026-11-18"] [data-drag]').first(), id = await chip.getAttribute('data-sid');
    const bx = await chip.boundingBox(), fri = await p.locator('.gx-col[data-date="2026-11-20"] .gx-lane').boundingBox();
    const h0 = +(await p.getAttribute('.gx-week', 'data-h0')), PX = +(await p.getAttribute('.gx-week', 'data-px'));
    const yAt = m => fri.y + (m - h0) * PX + 3;
    const slot = await G(id => { const S = ERLY.growth.state(); for (let m = 21 * 60 - 30; m >= 16 * 60; m -= 15) { const t = ERLY_GSCHED.hhmm(m); if (ERLY_GSCHED.checkMove(S.profile, S.sessions, id, '2026-11-20', t).ok) return m; } return null; }, id);
    assert.ok(slot != null, 'a free Friday slot exists');
    await p.mouse.move(bx.x + 10, bx.y + 4); await p.mouse.down(); await p.mouse.move(fri.x + 20, yAt(slot), { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
    let s = await G(id => ERLY.growth.state().sessions.find(x => x.id === id), id); assert.equal(s.date + ' ' + s.start, '2026-11-20 ' + await G(m => ERLY_GSCHED.hhmm(m), slot), 'moved to ' + s.date + ' ' + s.start + ' toast: ' + await p.textContent('#toast')); assert.equal(s.locked, true);
    await p.evaluate(() => { const g = document.querySelector('.gx-week'), h0 = +g.dataset.h0, px = +g.dataset.px; scrollTo({ top: g.getBoundingClientRect().top + scrollY + 34 + (16 * 60 - h0) * px - 120, behavior: 'instant' }); }); await p.waitForTimeout(150);
    const chip2 = p.locator('.gx-col[data-date="2026-11-20"] [data-drag]').first(), id2 = await chip2.getAttribute('data-sid'), b2 = await chip2.boundingBox(), tue = await p.locator('.gx-col[data-date="2026-11-17"] .gx-lane').boundingBox();
    await p.mouse.move(b2.x + 10, b2.y + 4); await p.mouse.down(); await p.mouse.move(tue.x + 20, tue.y + (18 * 60 - h0) * PX, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
    s = await G(id => ERLY.growth.state().sessions.find(x => x.id === id), id2); assert.notEqual(s.date, '2026-11-17', 'refused'); assert.match(await p.textContent('#toast'), /commitment|free time/);
  });
  await check('Calendar and Timeline views show the plan and the deadline', async () => {
    await p.click('[data-view="calendar"]'); assert.ok(await p.locator('.gx-md em').count() > 10); assert.match(await p.textContent('.gx-month'), /⚑ Chemistry exam/);
    await p.click('[data-view="timeline"]'); assert.equal(await p.locator('.gx-tlr').count(), 2); assert.ok(await p.locator('.gx-tlc.is-dl').count() === 1);
  });
  await check('Progress & weekly review: built from what happened; Noor sees only the numbers, after the student chooses', async () => {
    await p.click('[data-view="progress"]'); const t = await p.textContent('.gx-review');
    assert.match(t, /1 skipped|skipped/); assert.match(t, /too tired ×1/); assert.match(t, /not an assessment/);
    const href = await p.getAttribute('.gx-review a.btn', 'href'); const txt = decodeURIComponent(href.split('ask=')[1]);
    assert.match(txt, /sessions done/); assert.doesNotMatch(txt, /football|chemistry exam is on|@/i, 'no personal free text is passed');
    assert.ok(await p.locator('.gx-pg').count() === 2);
  });
  await check('regenerate shows the difference first; “keep” changes nothing; “apply” keeps done/skipped/moved sessions', async () => {
    const before = await G(() => JSON.stringify(ERLY.growth.state().sessions));
    await p.click('[data-view="settings"]'); await p.click('[data-g="addtime:commitments"]');
    const i = await G(() => ERLY.growth.state().profile.commitments.length - 1);
    await p.selectOption(`[data-t="commitments:${i}:day"]`, 'wed'); await p.fill(`[data-t="commitments:${i}:start"]`, '16:00'); await p.locator(`[data-t="commitments:${i}:start"]`).dispatchEvent('change'); await p.fill(`[data-t="commitments:${i}:end"]`, '21:00'); await p.locator(`[data-t="commitments:${i}:end"]`).dispatchEvent('change'); await p.fill(`[data-t="commitments:${i}:label"]`, 'job'); await p.locator(`[data-t="commitments:${i}:label"]`).dispatchEvent('change');
    await p.click('.gx-settings [data-g="regen"]'); await p.waitForSelector('.gx-modal');
    assert.match(await p.textContent('.gx-modal'), /\d+ added · \d+ moved · \d+ removed · \d+ unchanged/);
    await p.click('[data-g="diff:cancel"]'); assert.equal(await G(() => JSON.stringify(ERLY.growth.state().sessions)), before, 'cancel changes nothing');
    await p.click('.gx-settings [data-g="regen"]'); await p.click('[data-g="diff:apply"]');
    const st = await G(() => { const S = ERLY.growth.state(); return { wedFuture: S.sessions.filter(s => s.status === 'planned' && !s.locked && ERLY_GSCHED.dayKey(s.date) === 'wed' && s.date > '2026-11-16').length, done: S.sessions.filter(s => s.status === 'done').length, skipped: S.sessions.filter(s => s.status === 'skipped').length, locked: S.sessions.filter(s => s.locked).length, v: ERLY_GSCHED.violations(S.profile, S.sessions.filter(s => s.status === 'planned' && !s.locked)) }; });
    assert.equal(st.wedFuture, 0, 'no new Wednesday sessions (job)'); assert.equal(st.done, 1); assert.equal(st.skipped, 1); assert.ok(st.locked >= 2); assert.deepEqual(st.v, []);
  });
  await check('export: .ics calendar file with every session; .csv spreadsheet', async () => {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => { document.querySelector('.gx-export').open = true; document.querySelector('[data-g="export:ics"]').click(); })]);
    const txt = require('node:fs').readFileSync(await dl.path(), 'utf8'); const n = await G(() => ERLY.growth.state().sessions.filter(s => s.status !== 'skipped').length);
    assert.match(txt, /^BEGIN:VCALENDAR/); assert.equal((txt.match(/BEGIN:VEVENT/g) || []).length, n); assert.equal(dl.suggestedFilename(), 'erly-growth-plan.ics');
    const [dl2] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => document.querySelector('[data-g="export:csv"]').click())]); assert.match(require('node:fs').readFileSync(await dl2.path(), 'utf8'), /^date,start,end,goal,activity,topic,status/);
  });
  await check('the plan survives a reload; mobile width has no sideways page scroll', async () => {
    const n = await G(() => ERLY.growth.state().sessions.length); await p.reload(); await p.waitForSelector('.gx-tabs'); assert.equal(await G(() => ERLY.growth.state().sessions.length), n);
    await p.setViewportSize({ width: 390, height: 844 }); await p.click('[data-view="week"]'); await p.waitForTimeout(200);
    assert.ok(await G(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal page overflow');
    await p.setViewportSize({ width: 1280, height: 900 });
  });
  await check('a session’s Noor link opens Noor with the request typed in — not sent until the student sends it', async () => {
    await p.click('[data-view="today"]'); const href = await G(() => ERLY_GSCHED.launchFor('practice', 'moles').href);
    const q = await ctx.newPage(); await q.goto(BASE + href); await q.waitForSelector('#cmpText', { state: 'visible', timeout: 15000 }); await q.waitForTimeout(1200);
    assert.match(await q.inputValue('#cmpText'), /practice questions on moles/); assert.equal(await q.locator('.cmsg--user').count(), 0, 'not sent');
    assert.doesNotMatch(q.url(), /ask=/, 'removed from the address bar'); await q.close();
  });
  await check('delete all removes this plan and the older Growth Plan data', async () => {
    p.once('dialog', d => d.accept()); await p.click('[data-view="settings"]'); await p.click('[data-g="deleteall"]');
    assert.equal(await G(() => [localStorage.getItem('erly-growth-v18'), localStorage.getItem('erly-gplan-v10'), localStorage.getItem('erly-growth-v1')].filter(Boolean).length), 0);
    await p.waitForSelector('.gx--onb');
  });
  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  const fail = results.filter(r => r[1] !== 'PASS').length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail || errors.length ? 1 : 0);
})();
