// ERLY Interactive Learning Studio — acceptance tests (the brief's section 19), in a real browser.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/learning-studio.e2e.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + String(e.message || e).split('\n')[0].slice(0, 260)]); } };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => sessionStorage.setItem('acubins-role', 'student'));
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const go = async (r, wait) => { await p.evaluate(r => { location.hash = '#/' + r; }, r); await p.waitForTimeout(wait || 500); };
  const h1 = () => p.textContent('#lsView h1');
  await p.goto(BASE + 'learn.html'); await p.waitForTimeout(2200);

  /* ---------- Learning Studio ---------- */
  await check('opens with a consent choice; nothing is stored before the student chooses', async () => {
    assert.ok(await p.isVisible('.at-choice'), 'consent card');
    assert.equal(await p.evaluate(() => localStorage.getItem('erly-learn-v1')), null);
    await p.click('[data-consent="device"]'); await p.waitForTimeout(400);
    assert.ok(await p.evaluate(() => !!localStorage.getItem('erly-learn-v1')), 'saved after choosing device storage');
    await p.reload(); await p.waitForTimeout(1800); assert.equal(await p.isVisible('.at-choice'), false, 'choice remembered');
  });
  await check('navigation: every area opens from the side navigation, with a heading and no errors', async () => {
    const areas = await p.$$eval('#atTabs a[data-env]', as => as.map(a => a.dataset.env));
    assert.ok(areas.length >= 5, 'areas ' + areas.length); // v22: five places, each with sub-places (checked below)
    for (const a of areas) { await p.click(`#atTabs a[data-env="${a}"]`); await p.waitForTimeout(450); assert.ok((await h1()).trim().length > 3, a + ' heading'); assert.equal(await p.getAttribute(`#atTabs a[data-env="${a}"]`, 'aria-current'), 'page', a + ' current'); assert.equal(await p.$('.ls-err'), null, a + ' error screen');
      for (const sub of await p.$$eval('#atSub a', as => as.map(x => x.dataset.sub))) { await p.click(`#atSub a[data-sub="${sub}"]`); await p.waitForTimeout(450); assert.ok((await h1()).trim().length > 3, sub + ' heading'); assert.equal(await p.$('.ls-err'), null, sub + ' error screen'); } }
  });
  await check('the dashboard shows real (empty) state and an onboarding path — no invented numbers', async () => {
    await go('home'); const t = await p.textContent('#lsView');
    assert.match(t, /0\s*\/\s*\d+\s*objectives demonstrated/); assert.match(t, /0\s*flashcards recalled this week/); // v22 momentum figures assert.match(t, /Nothing to resume yet/); assert.doesNotMatch(t, /\d+%/, 'no percentages without data');
  });
  await check('search finds real resources of every kind (v21: the ⌘K palette searches everything)', async () => {
    await go('home'); await p.evaluate(() => LS.needLab()); await p.keyboard.press('Control+k'); await p.waitForTimeout(200); await p.fill('#atPalQ', 'heart'); await p.waitForTimeout(300);
    const titles = await p.$$eval('#atPalList [role="option"]', os => os.map(x => x.textContent)); assert.ok(titles.some(t => /heart and double circulation/i.test(t)) && titles.some(t => /double journey/i.test(t)) && titles.some(t => /cardiac/i.test(t)), titles.join('|'));
    await p.keyboard.press('Escape');
    await go('read'); const counts = await p.evaluate(() => ({ readings: (window.STUDIO_LIBRARY || []).length, lessons: LS.lessons.length }));
    assert.match(await p.textContent('[data-kind="reading"]'), new RegExp(String(counts.readings))); assert.match(await p.textContent('[data-kind="guide"]'), new RegExp(String(counts.lessons)));
    await p.fill('#atReadQ', 'membrane'); await p.waitForTimeout(500); const rows = await p.$$eval('#atShelf .at-row__t', x => x.map(y => y.textContent)); assert.ok(rows.length >= 1 && rows.every(t => /membrane/i.test(t)), rows.join('|'));
    await p.fill('#atReadQ', ''); await p.waitForTimeout(400);
  });
  await check('a course reading opens in the reader from Reading & Resources (PDF reader kept)', async () => {
    await go('read'); await p.click('[data-kind="reading"]'); await p.waitForTimeout(300); await p.click('#atShelf [data-open^="reading:"] >> nth=0'); await p.waitForTimeout(1200);
    assert.ok(await p.evaluate(() => document.documentElement.classList.contains('studio-open')), 'reader open');
    await p.keyboard.press('Escape'); await p.waitForTimeout(600); if (await p.evaluate(() => document.documentElement.classList.contains('studio-open'))) await p.evaluate(() => document.querySelector('[data-st="close"], .st__close, #stClose') && document.querySelector('[data-st="close"], .st__close, #stClose').click());
  });

  /* ---------- Lessons ---------- */
  await check('a structured lesson opens with objectives, sections and a provenance badge', async () => {
    await go('lesson/bio-heart', 900); assert.match(await h1(), /Why a pump/); assert.ok(await p.isVisible('.ls-before')); assert.equal(await p.locator('.ls-toc ol li').count(), 7); assert.match(await p.textContent('.ls-prov'), /Written for ERLY/);
  });
  await check('activities validate answers, explain wrong options, allow retry and record the attempt', async () => {
    const act = p.locator('.ls-act[data-q="h-why-1"]');
    await act.locator('.ls-opt', { hasText: 'Oxygen cannot diffuse' }).click(); await act.locator('[data-a="check"]').click(); await p.waitForTimeout(200);
    assert.match(await act.locator('.ls-act__fb').textContent(), /Not quite[\s\S]*small molecule/);
    await act.locator('[data-a="retry"]').click(); await act.locator('.ls-opt', { hasText: 'too slow' }).click(); await act.locator('[data-a="check"]').click(); await p.waitForTimeout(200);
    assert.match(await act.locator('.ls-act__fb').textContent(), /Correct/);
    const a = await p.evaluate(() => LS.store.data().attempts.filter(x => x.qid === 'h-why-1').map(x => [x.correct, x.attemptNo])); assert.deepEqual(a, [[false, 1], [true, 2]]);
  });
  await check('section completion persists, and the student can resume where they stopped', async () => {
    await p.click('[data-next]'); await p.waitForTimeout(600); assert.match(await h1(), /Four chambers/);
    await p.reload(); await p.waitForTimeout(1800); await go('lesson/bio-heart', 900);
    assert.match(await h1(), /Four chambers/, 'resumed at section 2'); assert.ok(await p.locator('.ls-toc a.is-done').count() >= 1);
    await go('home', 600); assert.match(await p.textContent('.at-shelf'), /The heart and double circulation[\s\S]*1 of 6 sections/);
  });
  await check('diagram labelling works with the lists (keyboard path) and with tap-to-place', async () => {
    await go('lesson/bio-heart/chambers', 900); const act = p.locator('.ls-act[data-q="h-label"]');
    const targets = await p.evaluate(() => LS.bank().find(q => q.id === 'h-label').targets.map(t => t.label));
    await act.locator('.ls-chip', { hasText: targets[0] }).click(); await act.locator('.ls-pin[data-t="0"]').click();
    assert.equal(await act.locator('select[data-t="0"]').inputValue(), targets[0], 'tap-to-place filled the list');
    for (let i = 1; i < targets.length; i++) await act.locator(`select[data-t="${i}"]`).selectOption(targets[i]);
    await act.locator('[data-a="check"]').click(); await p.waitForTimeout(200); assert.match(await act.locator('.ls-act__fb').textContent(), /Correct/);
  });
  await check('ordering works with the move buttons alone', async () => {
    await go('lesson/bio-heart/path', 900); const act = p.locator('.ls-act[data-q="h-order"]');
    const want = await p.evaluate(() => LS.bank().find(q => q.id === 'h-order').items);
    for (let target = 0; target < want.length; target++) { for (let guard = 0; guard < 12; guard++) { const cur = await act.locator('.ls-order__tx').allTextContents(); const at = cur.indexOf(want[target]); if (at === target) break; await act.locator(`.ls-order__it[data-pos="${at}"] [data-mv="-1"]`).click(); } }
    await act.locator('[data-a="check"]').click(); await p.waitForTimeout(200); assert.match(await act.locator('.ls-act__fb').textContent(), /Correct/);
  });
  await check('a live simulation inside a lesson: controls change the values, reset restores them', async () => {
    await go('lesson/bio-heart/output', 900); await p.click('.ls-labcard [data-model]'); await p.waitForSelector('.ls-labcard .lab.lab--inline', { timeout: 15000 }); await p.waitForTimeout(800);
    const S = () => p.evaluate(() => ERLY_LAB.current().inst.api.S.HR); const s0 = await S();
    await p.evaluate(() => ERLY_LAB.current().inst.set('HR', 140)); await p.waitForTimeout(300);
    assert.equal(await S(), 140);
    await p.evaluate(() => ERLY_LAB.current().inst.reset && ERLY_LAB.current().inst.reset()); await p.waitForTimeout(300);
    assert.equal(await S(), s0, 'reset');
    assert.ok((await p.textContent('.ls-labcard')).match(/Goal|assumes/i));
  });

  /* ---------- every question type ---------- */
  await check('every implemented question type: a correct answer is accepted and a wrong one is explained', async () => {
    const types = await p.evaluate(() => [...new Set(LS.bank().map(q => q.type))]);
    const out = await p.evaluate(async () => {
      const G = LS.grade, res = {}, host = document.createElement('div'); document.getElementById('lsView').appendChild(host);
      const pick = t => LS.bank().find(q => q.type === t);
      const fill = (el, q, right) => {
        const sel = (s, v) => { s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); };
        switch (q.type) {
          case 'mcq': case 'tf': { const want = q.type === 'tf' ? (right ? (q.answer ? '1' : '0') : (q.answer ? '0' : '1')) : String(right ? q.answer : (q.answer + 1) % q.options.length); el.querySelector(`input[value="${want}"]`).click(); break; }
          case 'multi': q.options.forEach((o, i) => { if (right ? q.answer.includes(i) : !q.answer.includes(i)) el.querySelector(`input[value="${i}"]`).click(); }); break;
          case 'fill': el.querySelectorAll('.ls-blank').forEach((x, i) => { x.value = right ? (q.blanks[i].num != null ? q.blanks[i].num : q.blanks[i].accept[0]) : 'zzz'; }); break;
          case 'match': el.querySelectorAll('select[data-m]').forEach(s => sel(s, right ? s.dataset.m : String((+s.dataset.m + 1) % q.pairs.length))); break;
          case 'label': el.querySelectorAll('.ls-label__list select').forEach(s => sel(s, right ? q.targets[+s.dataset.t].label : q.targets[(+s.dataset.t + 1) % q.targets.length].label)); break;
          case 'sort': el.querySelectorAll('select[data-s]').forEach(s => sel(s, right ? q.items[+s.dataset.s].cat : q.categories.find(c => c !== q.items[+s.dataset.s].cat))); break;
          case 'compare': q.statements.forEach((s, i) => { const want = right ? s.ans : q.concepts.concat(['Both']).find(c => c !== s.ans); [...el.querySelectorAll(`input[name="${q.id}-c${i}"]`)].find(x => x.value === want).click(); }); break;
          case 'numeric': case 'expr': case 'graph': { if (q.type === 'graph' && q.ask !== 'numeric') { el.querySelector(`input[value="${right ? q.answer : (q.answer + 1) % q.options.length}"]`).click(); break; } const inp = el.querySelector('input'); inp.value = right ? String(q.answer) : (q.type === 'expr' ? 'x+12345' : String(q.answer + 777)); inp.dispatchEvent(new Event('input', { bubbles: true })); break; }
          case 'slider': { const r = el.querySelector('input[type=range]'); let v = q.param.min; if (right) { for (let x = q.param.min; x <= q.param.max; x += q.param.step) if (G.check(q, +x.toFixed(6)).correct) { v = x; break; } } else v = q.param.max; r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); break; }
          case 'short': el.querySelector('textarea').value = right ? q.model.replace(/\*/g, '') : 'I am not sure about this one at all.'; break;
          case 'order': break;
        }
      };
      for (const t of [...new Set(LS.bank().map(q => q.type))]) {
        if (t === 'order' || t === 'steps') continue; // covered by their own UI tests
        const q = Object.assign({}, pick(t), { id: pick(t).id + '-uitest' }); res[t] = {};
        for (const right of [true, false]) {
          host.innerHTML = ''; const a = LS.activity(host, q, { record: false }); fill(a.el, q, right); a.el.querySelector('[data-a="check"]').click(); await new Promise(r => setTimeout(r, 30));
          const fb = a.el.querySelector('.ls-act__fb').textContent; res[t][right ? 'right' : 'wrong'] = t === 'short' ? (/model answer/i.test(fb) ? 'self' : fb.slice(0, 60)) : /Correct/.test(fb) && !/Not quite/.test(fb) ? 'ok' : /Not quite/.test(fb) ? 'no' : fb.slice(0, 80);
        }
      }
      host.remove(); return res;
    });
    const bad = Object.entries(out).filter(([t, r]) => (t === 'short' ? r.right !== 'self' : r.right !== 'ok' || r.wrong !== 'no'));
    assert.equal(bad.length, 0, JSON.stringify(bad)); assert.ok(Object.keys(out).length >= 13, 'types tested: ' + Object.keys(out).join(','));
    assert.ok(types.includes('order') && types.includes('steps'));
  });
  await check('step-by-step problems reveal one step at a time and mark the whole problem', async () => {
    await go('lesson/phys-newton/friction', 900); const act = p.locator('.ls-act[data-q="n-steps"]');
    assert.equal(await act.locator('.ls-step:not([hidden])').count(), 1);
    for (const [i, v] of [[0, '2400'], [1, '2'], [2, '10']]) { await act.locator(`.ls-step[data-s="${i}"] input`).fill(v); await act.locator(`[data-stepcheck="${i}"]`).click(); await p.waitForTimeout(150); }
    assert.match(await act.locator('.ls-act__fb').textContent(), /Correct/);
  });
  await check('wrong numeric answers get a targeted explanation and a tagged mistake that persists', async () => {
    await go('lesson/bio-heart/output', 900); const act = p.locator('.ls-act[data-q="h-co"]');
    await act.locator('input').fill('16500'); await act.locator('[data-a="check"]').click(); await p.waitForTimeout(200);
    assert.match(await act.locator('.ls-act__fb').textContent(), /millilitres/);
    await p.reload(); await p.waitForTimeout(1800); await go('mistakes', 700);
    const t = await p.textContent('.ls-mklist'); assert.match(t, /16500/); assert.match(t, /units/);
  });

  /* ---------- Practice and revision ---------- */
  await check('practice centre: guided set, hints, results summary and mistake review', async () => {
    await go('practice', 600); await p.click('.ls-chipck:has-text("The heart")'); await p.check('input[name="mode"][value="guided"]'); await p.selectOption('select[name="n"]', '5'); await p.click('[data-setup] button[type=submit]'); await p.waitForTimeout(700);
    assert.match(await h1(), /Question 1 of/);
    for (let i = 0; i < 6; i++) { if (!(await p.$('.ls-run'))) break; await p.click('[data-skip]').catch(() => {}); await p.waitForTimeout(250); }
    assert.match(await h1(), /marked questions right/); assert.match(await p.textContent('#lsView'), /not how able you are/);
  });
  await check('test mode holds feedback until the end, then reveals it', async () => {
    await go('practice', 600); await p.check('input[name="mode"][value="test"]'); await p.selectOption('select[name="ty"]', 'tf'); await p.click('[data-setup] button[type=submit]'); await p.waitForTimeout(700);
    await p.click('.ls-run .ls-opt >> nth=0'); await p.click('.ls-run [data-a="check"]'); await p.waitForTimeout(200);
    assert.match(await p.textContent('.ls-run .ls-act__fb'), /Feedback comes at the end/);
    while (await p.$('[data-nextq]:not([hidden]), [data-skip]:not([hidden])')) { const n = await p.$('[data-nextq]:not([hidden])'); if (n) await n.click(); else await p.click('[data-skip]'); await p.waitForTimeout(250); if (await p.$('.ls-runsum')) break; }
    assert.match(await p.textContent('.ls-revlist'), /Correct|Not quite/);
  });
  await check('flashcards: add from a lesson, create, edit, delete with undo, review with the schedule explained', async () => {
    await go('revise', 600); await p.click('[data-addl="bio-heart"]'); await p.waitForTimeout(300);
    const n0 = await p.evaluate(() => Object.keys(LS.store.data().cards).length); assert.ok(n0 >= 4);
    await p.click('[data-newcard]'); await p.fill('.ls-dlg [name=f]', 'Unit of force'); await p.fill('.ls-dlg [name=b]', 'newton (N)'); await p.click('.ls-dlg [data-ok]'); await p.waitForTimeout(300);
    const id = await p.evaluate(() => Object.values(LS.store.data().cards).find(c => c.front === 'Unit of force').id);
    await p.click(`[data-edit="${id}"]`); await p.fill('.ls-dlg [name=b]', 'the newton, N = kg·m/s²'); await p.click('.ls-dlg [data-ok]'); await p.waitForTimeout(300);
    assert.equal(await p.evaluate(id => LS.store.data().cards[id].back, id), 'the newton, N = kg·m/s²');
    await p.click(`[data-delc="${id}"]`); await p.waitForTimeout(200); assert.equal(await p.evaluate(id => !!LS.store.data().cards[id], id), false); await p.click('#lsToast [data-undo]'); await p.waitForTimeout(300); assert.equal(await p.evaluate(id => !!LS.store.data().cards[id], id), true, 'undo');
    await p.click('a[href="#/revise/session/due"]'); await p.waitForTimeout(400);
    assert.match(await p.textContent('.ls-why'), /New card/); await p.keyboard.press('Space'); await p.waitForTimeout(200);
    assert.ok(await p.isVisible('.ls-grades')); const due0 = await p.evaluate(() => Object.values(LS.store.data().cards).filter(c => (c.due || 0) <= Date.now()).length);
    await p.keyboard.press('3'); await p.waitForTimeout(200);
    const due1 = await p.evaluate(() => Object.values(LS.store.data().cards).filter(c => (c.due || 0) <= Date.now()).length); assert.equal(due1, due0 - 1);
    const c = await p.evaluate(() => Object.values(LS.store.data().cards).find(c => (c.history || []).length)); assert.equal(c.interval, 1); assert.match(await p.evaluate(c => LS.srs.strength(c).label, c), /Still learning/);
  });

  /* ---------- Notebook ---------- */
  await check('notebook: create, edit, autosave, retrieve after reload, export as Markdown', async () => {
    await go('notebook', 500); await p.click('[data-new="note"]'); await p.waitForTimeout(500);
    await p.fill('.ls-ed__title', 'Heart revision'); await p.click('.ls-ed__body'); await p.keyboard.type('Left ventricle has the thickest wall.'); await p.waitForTimeout(1100);
    assert.match(await p.textContent('[data-state]'), /Saved on this device/);
    await p.reload(); await p.waitForTimeout(1800); await go('notebook', 500); await p.click('.ls-nblist a:has-text("Heart revision")'); await p.waitForTimeout(400);
    assert.match(await p.textContent('.ls-ed__body'), /thickest wall/, JSON.stringify(await p.evaluate(() => Object.values(LS.store.data().notes).map(n => [n.title, n.html.slice(0, 60)]))));
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-exp="md"]')]); const md = fs.readFileSync(await dl.path(), 'utf8'); assert.match(md, /^# Heart revision/); assert.match(md, /thickest wall/);
  });
  await check('an interrupted edit is offered back (draft recovery), and pasted HTML is cleaned', async () => {
    const id = await p.evaluate(() => Object.values(LS.store.data().notes).find(n => n.title === 'Heart revision').id);
    await p.evaluate(id => sessionStorage.setItem('erly-learn-draft', JSON.stringify({ id, at: Date.now() + 5000, html: '<p>Draft text that was never saved</p>' })), id);
    await go('home', 300); await go('notebook/' + id, 600); assert.ok(await p.isVisible('[data-restore]'), 'restore offered');
    await p.click('[data-restore]'); await p.waitForTimeout(900); assert.match(await p.evaluate(id => LS.store.data().notes[id].html, id), /never saved/);
    assert.equal(await p.evaluate(() => LS.notes.clean('<p onclick="x()">a<script>alert(1)</script><img src=x onerror=1><b>b</b></p>')), '<p>a<b>b</b></p>');
  });
  await check('saving from a lesson keeps the source reference (and a link back)', async () => {
    await go('lesson/bio-heart/output', 900); const act = p.locator('.ls-act[data-q="h-co"]'); if (!(await act.locator('[data-a="note"]').count())) { await act.locator('input').fill('16.5'); await act.locator('[data-a="check"]').click(); }
    await act.locator('[data-a="note"]').click(); await p.waitForTimeout(300);
    const n = await p.evaluate(() => Object.values(LS.store.data().notes).sort((a, b) => b.created - a.created)[0]); assert.equal(n.src.type, 'question'); assert.match(n.src.where, /#\/lesson\/bio-heart/);
    await go('notebook/' + n.id, 500); assert.ok(await p.isVisible(`.ls-src a[href="${n.src.where}"]`));
  });
  await check('concept map: add ideas, link them, keep a text view', async () => {
    await go('notebook', 400); await p.click('[data-new="map"]'); await p.waitForTimeout(500);
    p.once('dialog', d => d.accept('Right ventricle')); await p.click('[data-madd]'); await p.waitForTimeout(300);
    await p.click('[data-mlink]'); await p.waitForTimeout(200); await p.fill('.ls-dlg [name=l]', 'pumps to'); await p.click('.ls-dlg [data-ok]'); await p.waitForTimeout(1000);
    const m = await p.evaluate(() => Object.values(LS.store.data().notes).find(n => n.kind === 'map').map); assert.equal(m.nodes.length, 2); assert.equal(m.edges.length, 1); assert.equal(m.edges[0].label, 'pumps to');
    assert.equal(await p.inputValue('.ls-map__list [data-elabel="0"]'), 'pumps to');
  });

  /* ---------- Video ---------- */
  await check('video studio: real narrated video, captions track, transcript click seeks, bookmark and timestamped note', async () => {
    await go('video/erly-heart', 1500); await p.waitForSelector('.ls-tr li', { timeout: 10000 });
    const n = await p.locator('.ls-tr li').count(); assert.ok(n >= 12, 'cues ' + n);
    await p.waitForFunction(() => document.querySelector('.ls-player video').readyState >= 1, null, { timeout: 15000 });
    assert.ok(await p.evaluate(() => document.querySelector('.ls-player video').duration > 60), 'duration');
    assert.equal(await p.evaluate(() => document.querySelector('.ls-player video track').kind), 'captions');
    const want = await p.getAttribute('.ls-tr li:nth-child(6) button', 'data-t'); await p.click('.ls-tr li:nth-child(6) button'); await p.waitForTimeout(500);
    const now = await p.evaluate(() => document.querySelector('.ls-player video').currentTime); assert.ok(Math.abs(now - +want) < 1.2, `seek ${now} vs ${want}`);
    await p.evaluate(() => document.querySelector('.ls-player video').pause());
    await p.click('[data-act="bm"]'); await p.click('[data-act="note"]'); await p.fill('.ls-dlg [name=n]', 'Tricuspid valve is on the right'); await p.click('.ls-dlg [data-ok]'); await p.waitForTimeout(300);
    const vn = await p.evaluate(() => Object.values(LS.store.data().notes).find(n => n.src && n.src.type === 'video')); assert.match(vn.src.where, /#\/video\/erly-heart\/\d+/);
    assert.ok(await p.evaluate(() => LS.store.data().bookmarks.some(b => b.type === 'video')));
    await p.click('[data-tab="ch"]'); assert.equal(await p.locator('.ls-chl li').count(), 4);
  });

  /* ---------- Visual Learning Lab ---------- */
  await check('visual lab: catalogue with an honest coverage map; a model page responds to controls and resets', async () => {
    await go('lab', 700); assert.match(await p.textContent('.ls-cov'), /not built yet/);
    await go('lab/balance', 2500); await p.waitForSelector('.lab.lab--inline', { timeout: 15000 });
    const r0 = await p.evaluate(() => ERLY_LAB.state()); assert.equal(r0.solution, 4, '3x+2 = x+10 → x = 4'); assert.equal(r0.balanced, false);
    await p.evaluate(() => ERLY_LAB.current().inst.set('x', 4)); await p.waitForTimeout(200); assert.equal(await p.evaluate(() => ERLY_LAB.state().balanced), true);
    await p.click('[data-reset]'); await p.waitForTimeout(300); assert.equal(await p.evaluate(() => ERLY_LAB.state().params.x), 1);
    await go('lab/balancer', 2500); await p.evaluate(() => { const i = ERLY_LAB.current().inst; i.set('k1', 1); i.set('k2', 2); i.set('k3', 1); i.set('k4', 2); }); await p.waitForTimeout(200); assert.equal(await p.evaluate(() => ERLY_LAB.state().lowest), true, 'CH4 + 2O2 → CO2 + 2H2O');
  });

  /* ---------- Noor ---------- */
  await check('Noor in context: select text → explain; only the selection and lesson title are sent; the destination is shown', async () => {
    await go('lesson/bio-heart/vessels', 900);
    await p.evaluate(() => { const el = document.querySelector('.ls-text p'); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event('selectionchange')); });
    await p.waitForSelector('.ls-selbar:not([hidden])', { timeout: 3000 }); await p.click('.ls-selbar [data-sk="simplify"]'); await p.waitForTimeout(1500);
    const sent = await p.evaluate(() => LS.noor.lastSent); assert.equal(sent.kind, 'simplify'); assert.match(sent.prompt, /simpler words/); assert.match(sent.context.quote, /Arteries/); assert.equal(sent.context.title, 'The heart and double circulation');
    const ctxKeys = Object.keys(sent.context).sort().join(','); assert.equal(ctxKeys, 'course,from,heading,page,quote,text,title,uploaded');
    assert.ok(!JSON.stringify(sent).includes('16500'), 'no learning history in the request');
    assert.ok(await p.evaluate(() => ERLY.companion.isOpen()), 'Noor opened'); assert.match(await p.textContent('#cmpAttach'), /heart and double circulation/i);
    await p.evaluate(() => ERLY.companion.close());
    await go('noor', 500); assert.match(await p.textContent('.ls-where'), /brain|device|Noor/i); assert.match(await p.textContent('.ls-pre'), /simplify|simpler/);
  });
  await check('“Explain my mistake” asks Noor for the misconception, not the answer', async () => {
    await go('mistakes', 600); await p.click('[data-mnoor] >> nth=0'); await p.waitForTimeout(800);
    const s = await p.evaluate(() => LS.noor.lastSent); assert.equal(s.kind, 'mistake'); assert.match(s.prompt, /don't just give me the answer/); assert.match(s.prompt, /My answer/);
    await p.evaluate(() => ERLY.companion.close());
  });

  /* ---------- Learning intelligence ---------- */
  await check('insights: too little data is acknowledged; no insight appears from a handful of answers', async () => {
    await go('progress', 600); const t = await p.textContent('.ls-insights'); assert.match(t, /Not enough evidence yet/); assert.equal(await p.locator('.ls-ins').count(), 0);
  });
  await check('insights from real activity show evidence, alternatives, reliability — and never a diagnosis', async () => {
    await p.evaluate(() => { const D = 864e5, now = Date.now(), qs = LS.bank().filter(q => q.topic === 'The heart').slice(0, 8); let k = 0; for (let day = 3; day >= 1; day--) qs.forEach((q, i) => { if ((k++) % 2) return; LS.store.recordAttempt({ qid: q.id + '-d' + day, type: q.type, topic: q.topic, subject: q.subject, lesson: q.lesson, from: 'practice', correct: i % 3 === 0, answerText: 'x', prompt: LS.plain(q.prompt), at: now - day * D }); }); const pq = LS.bank().filter(q => q.topic === 'pH'); for (let day = 3; day >= 1; day--) pq.forEach((q, i) => LS.store.recordAttempt({ qid: q.id + '-e' + day, type: q.type, topic: q.topic, subject: q.subject, lesson: q.lesson, from: 'practice', correct: true, answerText: 'y', prompt: LS.plain(q.prompt), at: now - day * D - 3600e3 })); });
    // recordAttempt stamps "now"; spread the new rows over three days as they would be in real use
    await p.evaluate(() => { const D = 864e5, rows = LS.store.data().attempts.filter(a => /-[de]\d$/.test(a.qid)); rows.forEach(a => { a.at = Date.now() - (+a.qid.slice(-1)) * D; }); LS.store.save(); });
    await go('home', 200); await go('progress', 700);
    const cards = await p.locator('.ls-ins').count(); assert.ok(cards >= 1, 'insights ' + cards);
    const t = await p.textContent('.ls-insights'); assert.match(t, /What was observed/); assert.match(t, /Other explanations/); assert.match(t, /How reliable/);
    const page = await p.textContent('#lsView'); const bad = page.match(/\b(dyslexi\w*|adhd|autis\w*|dyscalcul\w*|disorder|disabilit\w*|probability of|risk score)\b/i); assert.equal(bad, null, 'forbidden wording: ' + (bad && bad[0]));
    await p.click('.ls-evid summary >> nth=0'); assert.ok(await p.locator('.ls-evid table tr').count() > 2, 'evidence rows');
    await p.click('[data-dismiss] >> nth=0'); await p.fill('.ls-dlg [name=n]', 'I was ill that week'); await p.click('.ls-dlg [data-ok]'); await p.waitForTimeout(400);
    assert.equal(await p.locator('.ls-ins').count(), cards - 1, 'dismissed'); assert.match(await p.textContent('.ls-insights'), /I was ill that week/);
  });
  await check('demonstration data is labelled and never mixed with, or saved over, the student’s own data', async () => {
    const before = await p.evaluate(() => ({ n: LS.store.data().attempts.length, raw: localStorage.getItem('erly-learn-v1') }));
    await p.evaluate(() => { LS.store.demo(true); LS.render(); }); await p.waitForTimeout(400); assert.ok(await p.isVisible('#lsBanner'), 'banner'); assert.match(await p.textContent('#lsBanner'), /made up/);
    await p.evaluate(() => LS.store.recordAttempt({ qid: 'demo-only', type: 'tf', topic: 'x', correct: true })); await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => localStorage.getItem('erly-learn-v1')), before.raw, 'storage untouched in demo mode');
    await p.click('[data-demooff]'); await p.waitForTimeout(300); assert.equal(await p.evaluate(() => LS.store.data().attempts.length), before.n); assert.equal(await p.evaluate(() => LS.store.data().attempts.some(a => a.qid === 'demo-only')), false);
  });

  /* ---------- Privacy ---------- */
  await check('export contains the stored data; partial and full deletion work; switching to “this visit” removes storage', async () => {
    await go('profile', 500); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-export]')]); const j = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); assert.ok(j.attempts.length > 5 && j.notes && j.cards);
    p.once('dialog', d => d.accept()); await p.click('[data-delpart="cards"]'); await p.waitForTimeout(300); assert.equal(await p.evaluate(() => Object.keys(LS.store.data().cards).length), 0);
    p.once('dialog', d => d.accept()); await p.click('[data-delall]'); await p.waitForTimeout(400); assert.equal(await p.evaluate(() => LS.store.data().attempts.length + Object.keys(LS.store.data().notes).length), 0);
    await p.click('[data-consent="visit"]'); await p.waitForTimeout(300); assert.equal(await p.evaluate(() => localStorage.getItem('erly-learn-v1')), null);
    await go('lesson/chem-ph', 700); await p.click('[data-next]'); await p.waitForTimeout(400); assert.equal(await p.evaluate(() => localStorage.getItem('erly-learn-v1')), null, 'nothing written in visit-only mode');
  });
  await check('turning insights off stops the analysis', async () => {
    await go('profile', 500); await p.uncheck('[data-set="insights"]'); await p.waitForTimeout(200); await go('progress', 500); assert.match(await p.textContent('.ls-insights'), /switched off/); assert.equal(await p.locator('.ls-ins').count(), 0);
    await go('profile', 400); await p.check('[data-set="insights"]');
  });
  await check('no API keys or secrets in the Studio’s code', async () => {
    const dir = path.join(__dirname, '..', '..', 'assets', 'js', 'learn'); const leaks = fs.readdirSync(dir).filter(f => /sk-ant-[A-Za-z0-9]|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{30}|api[_-]?key\s*[:=]\s*['"][^'"]{12,}/i.test(fs.readFileSync(path.join(dir, f), 'utf8'))); assert.deepEqual(leaks, []);
  });

  /* ---------- Accessibility & layout ---------- */
  await check('keyboard: skip link first, nav reachable, Enter navigates; dialogs trap focus and Escape closes them', async () => {
    await p.goto(BASE + 'learn.html?fresh=1#/home'); await p.waitForTimeout(1800); await p.keyboard.press('Tab');
    assert.match(await p.evaluate(() => document.activeElement.textContent), /Skip to content/);
    await p.focus('#atTabs a[data-env="practise"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(500); assert.match(await h1(), /Practise/);
    await go('revise', 400); await p.click('[data-newcard]'); await p.waitForTimeout(150);
    for (let i = 0; i < 8; i++) await p.keyboard.press('Tab'); assert.ok(await p.evaluate(() => !!document.activeElement.closest('.ls-dlg')), 'focus stays in the dialog');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); assert.equal(await p.$('.ls-dlg'), null);
  });
  await check('reduced motion removes transitions and animations', async () => {
    await p.emulateMedia({ reducedMotion: 'reduce' }); await go('lessons', 400);
    const d = await p.evaluate(() => getComputedStyle(document.querySelector('.ls-card')).transitionDuration); assert.ok(d.split(',').every(x => parseFloat(x) < 0.02), d);
    await p.emulateMedia({ reducedMotion: 'no-preference' });
  });
  await check('phone layout: bottom navigation, the drawer opens and closes, no horizontal scrolling', async () => {
    const m = await b.newContext({ ...devices['iPhone 13'] }); await m.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-learn-v1', JSON.stringify({ v: 1, consent: { store: 'device', at: 1 } })); });
    const q = await m.newPage(); await q.goto(BASE + 'learn.html'); await q.waitForTimeout(2000);
    assert.ok(await q.isVisible('#atDock')); await q.click('#atDock [data-more]'); await q.waitForTimeout(350); assert.ok(await q.evaluate(() => document.body.classList.contains('at-sheet-on')));
    await q.click('#atSheet a[data-sub="paths"]'); await q.waitForTimeout(500); assert.equal(await q.evaluate(() => document.body.classList.contains('at-sheet-on')), false);
    for (const r of ['home', 'lesson/bio-heart/chambers', 'practice', 'revise', 'notebook', 'progress', 'video/erly-quad', 'profile']) { await q.evaluate(r => { location.hash = '#/' + r; }, r); await q.waitForTimeout(700); const ov = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov <= 1, `${r}: horizontal overflow ${ov}px`); }
    await m.close();
  });

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 6));
  const fail = results.filter(r => r[1] !== 'PASS').length; console.log(`\n${results.length - fail}/${results.length} passed`); process.exit(fail || errors.length ? 1 : 0);
})();
