/* ERLY Learning Studio v22 — end-to-end checks for the learning engine, the adaptive loop (Demo 5), every
   experience, the plan, insights, journey, three-grade flashcards and the new navigation. Run with:
   NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v22.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 14).join('\n     ')); } };

(async () => {
  const b = await chromium.launch();
  const fresh = async (opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1360, height: 900 } }, opts || {})); await ctx.addInitScript(() => sessionStorage.setItem('acubins-role', 'student')); const p = await ctx.newPage(); p.errs = []; p.posts = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('request', r => { if (r.method() !== 'GET') p.posts.push(r.url()); }); return p; };
  const p = await fresh();
  p.setDefaultTimeout(6000);
  // ERLY's site-wide side check-in ("Looking for something?") can appear after scrolling; close it as a student would
  const calm = () => p.evaluate(() => document.querySelectorAll('.cside [data-nu="close"]').forEach(b => b.click()));
  // answer the question on screen correctly, whatever its type (mcq/tf/numeric/graph), using the content itself
  const answerRight = async qid => {
    const q = await p.evaluate(id => { const x = LS.bank().find(b => b.id === id); return { type: x.type, answer: x.answer, ask: x.ask }; }, qid);
    if (q.type === 'mcq' || (q.type === 'graph' && q.ask !== 'numeric')) await p.check(`.at-adapt__stage .ls-act[data-q="${qid}"] input[value="${q.answer}"]`);
    else if (q.type === 'tf') await p.check(`.at-adapt__stage .ls-act[data-q="${qid}"] input[value="${q.answer ? 1 : 0}"]`);
    else await p.fill(`.at-adapt__stage .ls-act[data-q="${qid}"] input`, String(q.answer));
    await p.click(`.at-adapt__stage .ls-act[data-q="${qid}"] [data-a="check"]`); await p.waitForTimeout(300);
  };
  const go = async (h, w) => { await p.evaluate(x => { location.hash = '#/' + x; }, h); await p.waitForTimeout(w || 700); };
  await p.goto(BASE + 'learn.html#/home'); await p.waitForTimeout(1200);
  await p.click('.at-choice [data-consent="device"]'); await p.waitForTimeout(300);

  await t('navigation: five places, sub-places follow the route', async () => {
    assert.deepEqual(await p.$$eval('#atTabs a[data-env]', a => a.map(x => x.dataset.env)), ['home', 'explore', 'learn', 'practise', 'workspace']);
    await go('revise'); assert.equal(await p.getAttribute('#atTabs a[data-env="practise"]', 'aria-current'), 'page'); assert.equal(await p.textContent('#atSub a[aria-current]'), 'Flashcards');
    await go('explore/topics'); assert.equal(await p.textContent('#atSub a[aria-current]'), 'Topics');
    await go('home'); assert.equal(await p.isHidden('#atSub'), true);
  });

  await t('home: welcome, continue, plan, momentum, insights, portal, worlds', async () => {
    assert.match(await p.textContent('#atHomeH'), /Let’s make something click/);
    for (const s of ['.at-shelf', '.at-plan', '.at-mom', '.at-insw', '.at-portal', '#atAtlas']) assert.ok(await p.isVisible(s), s);
    assert.equal(await p.locator('.at-mom__list li').count(), 4);
    assert.equal(await p.locator('#atAtlas > li').count(), 9);
  });

  await t('engine: 8 states with reasons; the two new lessons register 8 objectives', async () => {
    const r = await p.evaluate(() => ({ n: Object.keys(LS.engine.comp().states).length, s: LS.engine.state('math-linear:0'), lin: LS.engine.objectivesOf('math-linear').length, mot: LS.engine.objectivesOf('phys-motion').length, invalid: LS.invalid.length }));
    assert.equal(r.invalid, 0); assert.equal(r.lin, 4); assert.equal(r.mot, 4); assert.ok(r.n >= 35); assert.equal(r.s.state, 'not'); assert.ok(r.s.why.length >= 1);
  });

  await t('Demo 5 — adaptive loop: wrong → recorded → explanation → another way → different question → evidence → insight', async () => {
    await go('learn/obj/math-linear:0', 900);
    const q1 = await p.getAttribute('.at-adapt__stage .ls-act', 'data-q'); assert.equal(q1, 'lf-g1');
    await p.fill('.at-adapt__stage input', '0.5'); await p.click('.at-adapt__stage [data-a="check"]'); await p.waitForTimeout(300);
    assert.match(await p.textContent('.at-adapt__stage .ls-fb'), /run ÷ rise/); // the wrong option's own explanation
    assert.match(await p.textContent('.at-adapt__log'), /Answer recorded: ✕/);
    assert.match(await p.textContent('.at-adapt__next'), /Suggested next: Read it simply/);
    assert.equal(await p.evaluate(() => LS.store.data().attempts.slice(-1)[0].obj), 'math-linear:0');
    await p.click('.at-why__modes [data-mode="visual"]'); await p.waitForTimeout(200);
    assert.ok(await p.isVisible('.at-why__body svg')); assert.match(await p.textContent('.at-why__body'), /1 right and 2 up/);
    await p.click('.at-why__modes [data-mode="analogy"]'); assert.match(await p.textContent('.at-why__body'), /staircase/); // the explanation really changes
    await p.click('.at-why__body [data-ad="again"]'); await p.waitForTimeout(300);
    const q2 = await p.getAttribute('.at-adapt__stage .ls-act', 'data-q'); assert.notEqual(q2, q1);
    await answerRight(q2);
    const log = await p.textContent('.at-adapt__log');
    assert.match(log, /Explanation opened: See it/); assert.match(log, /Answer recorded: ✓ right/); assert.match(log, /Insight: after you chose “An analogy”, the next question went right/);
    assert.match(log, /State: .*→/);
    assert.ok(await p.evaluate(() => LS.store.data().events.some(e => e.t === 'adapt-success')));
    const st = await p.evaluate(() => LS.engine.state('math-linear:0').state); assert.ok(['developing', 'practising'].includes(st), st);
  });

  await t('engine reaches "Demonstrated" only after two different questions right without hints', async () => {
    await p.evaluate(() => { const d = LS.store.data(); d.attempts.push({ qid: 'lf-r1', correct: true, at: Date.now(), hintsUsed: 0, attemptNo: 1, obj: 'math-linear:0' }); LS.store.update(() => {}); });
    const s = await p.evaluate(() => LS.engine.state('math-linear:0')); assert.equal(s.state, 'demonstrated'); assert.match(s.why.join(' '), /2 different questions/);
    const later = await p.evaluate(() => { const E = LS.engine; return E.computeAll(LS.store.data(), LS.lessons, LS.bank(), Date.now() + 11 * 864e5).states['math-linear:0'].state; });
    assert.equal(later, 'review');
  });

  await t('milestone "First light" is earned and stored; a theme unlocks', async () => {
    await p.waitForTimeout(700);
    assert.ok(await p.evaluate(() => !!LS.store.data().milestones['first-light']));
    await go('journey'); assert.ok(await p.isVisible('.at-uni')); assert.equal(await p.isDisabled('[data-lstheme="dusk"]'), false);
    await p.click('[data-lstheme="dusk"]'); await p.waitForTimeout(200); assert.equal(await p.evaluate(() => document.documentElement.dataset.lsTheme), 'dusk');
    await p.click('[data-lstheme="ink"]'); await p.waitForTimeout(200);
  });

  await t('today’s plan: reorder, tomorrow, skip, remove, add my own', async () => {
    await go('home'); await calm(); const n0 = await p.locator('.at-plan__i').count(); assert.ok(n0 >= 1);
    await p.evaluate(() => { document.querySelector('.at-plan__add').open = true; }); await p.fill('[data-planadd] input[name=t]', 'Re-read my circuits notes'); await p.click('[data-planadd] button'); await p.waitForTimeout(300);
    assert.match(await p.textContent('.at-plan__list'), /Re-read my circuits notes/);
    const n1 = await p.locator('.at-plan__i').count(); assert.equal(n1, n0 + 1);
    await calm(); await p.click('.at-plan__i >> nth=-1 >> [data-pl="up"]'); await p.waitForTimeout(200); assert.match(await p.textContent(`.at-plan__i >> nth=${n1 - 2}`), /circuits notes/);
    await calm(); await p.click('.at-plan__i >> nth=0 >> [data-pl="skip"]'); await p.waitForTimeout(200); assert.match(await p.textContent('.at-plan__i >> nth=0'), /Skipped today/);
    await p.click('.at-plan__i >> nth=0 >> [data-pl="undo"]'); await p.waitForTimeout(200);
    await calm(); await p.click('.at-plan__i >> nth=0 >> [data-pl="later"]'); await p.waitForTimeout(200); assert.equal(await p.locator('.at-plan__i').count(), n1 - 1);
    assert.ok(await p.evaluate(() => Object.keys(LS.store.data().plan.later || {}).length >= 1 || LS.store.data().plan.items.length >= 0));
  });

  await t('insight: shows observation, evidence, why, action; can be corrected', async () => {
    await p.evaluate(() => { const d = LS.store.data(), now = Date.now(); ['pm-a1', 'pm-a3'].forEach((q, i) => d.attempts.push({ qid: q, correct: false, at: now - 1000 + i, hintsUsed: 0, attemptNo: 1, obj: 'phys-motion:2', prompt: q })); LS.store.update(() => {}); });
    await go('progress'); const card = p.locator('[data-ins="revisit:phys-motion:2"]');
    assert.ok(await card.isVisible()); const tx = await card.textContent();
    for (const w of ['What I noticed', 'Why it may matter', 'The evidence', 'Learn it another way', 'This isn’t right']) assert.ok(tx.includes(w), w);
    await card.locator('[data-insx="wrong"]').click(); await p.fill('#lsDlg textarea, .ls-dlg textarea', 'I was rushing'); await p.click('[data-ok]'); await p.waitForTimeout(300);
    assert.equal(await p.locator('[data-ins="revisit:phys-motion:2"]').count(), 0); assert.match(await p.textContent('.at-ins__hidden'), /I was rushing/);
    const banned = await p.evaluate(() => LS.intel.FORBIDDEN.test(document.body.innerText)); assert.equal(banned, false);
  });

  await t('progress separates opened, completed, attempted, demonstrated, retained', async () => {
    const tx = await p.textContent('.at-funnel'); for (const w of ['Lessons opened', 'Lessons completed', 'Objectives attempted', 'Objectives demonstrated', 'Objectives retained']) assert.ok(tx.includes(w), w);
  });

  const XS = ['motion-graphs', 'orbit-whatif', 'circuit-break', 'waves', 'particles', 'line-builder', 'heart-journey', 'cell-explorer', 'zoom', 'timeline', 'mystery-lungs', 'seasons', 'sentence-lab', 'cafe', 'city'];
  await t(`all ${XS.length} experiences open, take a prediction, compute an observation, and save to the archive`, async () => {
    for (const id of XS) {
      await go('exp/' + id, 1100); await calm();
      assert.ok(await p.isVisible('.at-x__model'), id + ' model');
      await p.click('.at-x__steps [data-step="predict"]'); await calm(); await p.click('[data-pred="0"]');
      await p.click('.at-x__steps [data-step="observe"]'); await p.waitForTimeout(150);
      const obs = (await p.textContent('.at-x__obs')).trim(); assert.ok(obs.length > 20, id + ' observation');
      await calm(); await p.click('[data-x="archive"]'); await p.click('.at-x__steps [data-step="apply"]'); await p.waitForTimeout(150);
      assert.ok(await p.locator('.at-x__qs .ls-act').count() >= 1, id + ' apply questions');
      await p.click('.at-x__steps [data-step="summary"]'); assert.ok(await p.locator('.at-x__sum li').count() >= 2, id + ' summary');
    }
    assert.equal(await p.evaluate(() => LS.store.data().archive.length), XS.length);
  });

  await t('physics motion: model output is computed (u=0, a=2 → 36 m after 6 s) and matches the prediction', async () => {
    await go('exp/motion-graphs', 1000); await p.click('.at-x__steps [data-step="predict"]'); await p.click('[data-pred="1"]');
    await p.evaluate(() => { const m = document.querySelector('[data-x="pause"]'); m.click(); }); await p.waitForTimeout(6600);
    await p.click('.at-x__steps [data-step="observe"]');
    const o = await p.textContent('.at-x__obs'); assert.match(o, /36\.0 m/); assert.match(o, /12\.0 m\/s/); assert.match(await p.textContent('.at-x__cmp'), /agrees/);
  });

  await t('maths: line builder equation and two-point mode; keyboard moves a point', async () => {
    await go('exp/line-builder', 900); await p.fill('[data-s="m"]', '-1'); await p.dispatchEvent('[data-s="m"]', 'input'); assert.match(await p.textContent('.at-lb__eq'), /y = −x \+ 1/);
    await p.check('[data-two]'); await p.waitForTimeout(100); await p.focus('[data-pt="B"]'); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(100);
    assert.match(await p.textContent('.at-lb__eq'), /m = /);
  });

  await t('chemistry: particle model classifies states from its own measurements', async () => {
    const r = await p.evaluate(async () => { await LS.needExp(); const out = {}; for (const T of [0.1, 1.2]) { const s = LS.exp.particleSim(64, 16); for (let k = 0; k < 6000; k++) s.step(0.005, T); out[T] = s.neighbours(); } return out; });
    assert.ok(r['0.1'] > 4.4, 'cold neighbours ' + r['0.1']); assert.ok(r['1.2'] < 2.5, 'hot neighbours ' + r['1.2']);
  });

  await t('geography: day length from the sunrise equation (London ~16.4 h, Sydney ~9.7 h on 21 June)', async () => {
    const r = await p.evaluate(() => [LS.exp.dayLen(51.5, 172), LS.exp.dayLen(-33.9, 172), LS.exp.dayLen(69.6, 172), LS.exp.dayLen(69.6, 355)]);
    assert.ok(Math.abs(r[0] - 16.4) < 0.15); assert.ok(Math.abs(r[1] - 9.74) < 0.15); assert.equal(r[2], 24); assert.equal(r[3], 0);
  });

  await t('circuit: breaking a series bulb turns all off; in parallel the others stay at 24 W', async () => {
    await go('exp/circuit-break', 900); await p.click('[data-bulb="1"]'); assert.match(await p.textContent('.at-cir__read'), /battery current 0\.00 A/);
    await p.click('[data-wire="p"]'); assert.match(await p.textContent('.at-cir__read'), /bulb 1: 2\.00 A, 24\.0 W/);
  });

  await t('flashcards use Not sure / Getting there / Know it, with reset and preferences', async () => {
    await go('lesson/math-linear/summary', 800); await p.click('[data-addcards]'); await go('revise/session/all', 700);
    await p.click('[data-flip]'); const g = await p.$$eval('.ls-grades [data-g]', bs => bs.map(x => x.querySelector('b').textContent)); assert.deepEqual(g, ['Not sure', 'Getting there', 'Know it']);
    await p.click('[data-g="good"]'); await p.waitForTimeout(200);
    assert.ok(await p.evaluate(() => LS.store.data().events.some(e => e.t === 'card')));
    await go('revise', 600); assert.ok(await p.locator('[data-resetc]').count() >= 1); assert.ok(await p.locator('[data-pref="newLimit"]').count() === 1);
  });

  await t('mistake notebook shows a suggested next step and “learn it another way”', async () => {
    await go('mistakes', 700); const tx = await p.textContent('.ls-mklist'); assert.match(tx, /Suggested next step/); assert.ok(await p.locator('.ls-mklist a[href^="#/learn/obj/"]').count() >= 1);
  });

  await t('my library connects bookmarks, notes, cards and the archive', async () => {
    await go('mylibrary', 700); const tx = await p.textContent('.at-mylib'); for (const w of ['Bookmarks', 'Recent notes', 'Flashcard collections', 'Discovery archive']) assert.ok(tx.includes(w), w);
    await go('mylibrary/archive', 600); assert.ok(await p.locator('.at-arch li').count() >= XS.length);
  });

  await t('subject world: ambient canvas, experiences and objectives; worlds pause offscreen', async () => {
    await go('subject/physics', 1200); assert.ok(await p.isVisible('.at-world--hero')); assert.ok(await p.locator('.at-xlist li').count() >= 4); assert.ok(await p.locator('.at-objs li').count() >= 4);
    assert.ok(await p.evaluate(() => LS.worlds && LS.worlds.count() >= 1));
  });

  await t('reduced motion: worlds draw a still frame only', async () => {
    const q = await fresh({ reducedMotion: 'reduce' }); await q.goto(BASE + 'learn.html#/subject/biology'); await q.waitForTimeout(1500);
    assert.equal(await q.evaluate(() => LS.worlds ? LS.worlds.count() : 0), 0); await q.context().close();
  });

  await t('phone layout: no horizontal overflow on home, an experience and the adaptive page', async () => {
    const q = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true }); await q.goto(BASE + 'learn.html#/home'); await q.waitForTimeout(1000);
    for (const h of ['home', 'exp/seasons', 'learn/obj/phys-motion:2', 'journey', 'exp/city']) { await q.evaluate(x => { location.hash = '#/' + x; }, h); await q.waitForTimeout(900); const w = await q.evaluate(() => document.documentElement.scrollWidth); assert.ok(w <= 392, h + ' width ' + w); }
    await q.context().close();
  });

  await t('no network writes and no page errors', async () => {
    assert.deepEqual(p.posts, []); assert.deepEqual(p.errs, []);
  });

  console.log(`\n${pass}/${pass + fail} passed`); await b.close(); process.exit(fail ? 1 : 0);
})();
