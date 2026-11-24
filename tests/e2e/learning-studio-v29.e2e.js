// Learning Studio 2.0 (v29): the three 3D laboratories (Rotation, Counting, Probability) with their engines checked against
// independent calculation, the universe home and navigation, subject worlds, chapter blueprints, curriculum validation,
// structured flashcards, assessments, the guided layer and What-if comparisons, the Solar System Explorer, and page errors.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v29.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
const fact = n => (n <= 1 ? 1 : n * fact(n - 1));

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); } catch (e) { /* about:blank */ } });
  let p = null; const fresh = async () => { if (p) await p.close().catch(() => {}); p = await ctx.newPage(); p.setDefaultTimeout(30000); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR|WebGL|GPU stall/.test(m.text())) errs.push(m.text()); }); };
  const go = async (r, sel, wait, keep) => { if (!keep) await fresh(); await p.goto(BASE + 'learn.html#/' + r); if (sel) await p.waitForSelector('#lsView ' + sel, { timeout: 30000 }); await p.waitForTimeout(wait || 1200); };
  const live = fn => p.evaluate(fn);

  /* ---------------- Rotation Lab ---------------- */
  await t('Rotation engine: kinematics, torque, inertia, angular momentum and rolling match independent formulas', async () => {
    await go('exp/rotation-lab', '.rl__stage');
    const r = await live(() => { const R = LS.rot; return { kin: R.kin(0.5, 1, 0.5, 2), tq: R.torque(0.4, 12, 30), I: R.platform(2, 1.2, [[0.5, 1], [0.5, 1], [0.5, 1], [0.5, 1]]), I2: R.platform(2, 1.2, [[0.5, 0.374], [0.5, 0.374], [0.5, 0.374], [0.5, 0.374]]), sph: R.roll(0.4, 30, 1), hoop: R.roll(1, 30, 1), slip: R.roll(0.4, 40, 0.1) }; });
    near(r.kin.th, 0.5 + 2 + 0.5 * 0.5 * 4, 1e-12, 'θ'); near(r.kin.w, 2, 1e-12, 'ω'); near(r.tq, 2.4, 1e-12, 'τ = rF sin φ');
    near(r.I, 3.44, 1e-12, 'platform I'); near(r.I2, 1.44 + 4 * 0.5 * 0.374 ** 2, 1e-12, 'I with masses in');
    near(r.sph.a, 9.81 * 0.5 / 1.4, 1e-12, 'sphere a = g sinθ/(1+k)'); near(r.hoop.a, 9.81 * 0.5 / 2, 1e-12, 'hoop'); assert.ok(r.sph.a > r.hoop.a);
    assert.equal(r.slip.rolls, false, 'μ = 0.1 at 40° cannot keep a sphere rolling'); near(r.slip.need, 0.4 * Math.tan(40 * Math.PI / 180) / 1.4, 1e-12, 'μ needed'); near(r.slip.a, 9.81 * (Math.sin(40 * Math.PI / 180) - 0.1 * Math.cos(40 * Math.PI / 180)), 1e-12, 'sliding a');
  });
  await t('Mass distribution: L = Iω is conserved while the masses move; KE = L²/2I rises; keyboard moves a mass; the challenge is reachable', async () => {
    await go('exp/rotation-lab', '.rl__stage', 2500);
    const s0 = await live(() => LS.exp.live._set({ mod: 'inertia', spin: true })); near(s0.w, 2, 1e-12, 'ω₀'); near(s0.L, 6.88, 1e-9, 'L₀');
    const s1 = await live(() => LS.exp.live._set({ r: [0.5, 0.5, 0.5, 0.5] })); near(s1.L, 6.88, 1e-9, 'L conserved'); near(s1.w, 6.88 / (1.44 + 4 * 0.5 * 0.25), 1e-9, 'ω = L/I'); assert.ok(s1.KE > s0.KE, 'KE rises when masses move in');
    near(s1.KE, 6.88 ** 2 / (2 * s1.I), 1e-9, 'KE = L²/2I');
    await p.focus('#lsView .x3-cv'); await p.keyboard.press('1'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
    const s2 = await live(() => LS.exp.live._state()); near(s2.r[0], 0.6, 1e-9, 'keyboard moved mass 1 out by 0.1 m'); near(s2.L, 6.88, 1e-9, 'L still conserved');
    const c = await live(() => { const a = LS.exp.live; a._set({ chal: true }); return a._set({ r: [0.374, 0.374, 0.374, 0.374] }); }); near(c.w, 4, 0.01, 'target ω = 4.0 rad/s'); assert.equal(c.done, true);
    assert.equal(c.has3d, true, 'the 3D scene is running');
  });
  await t('Rotation experiments all render; rolling race result follows k; prediction is scored after the race', async () => {
    await go('exp/rotation-lab', '.rl__stage', 2500);
    for (const m of ['motion', 'torque', 'shapes', 'roll', 'inertia']) { await p.click(`#lsView [data-kc="mod"][data-v="${m}"]`); await p.waitForTimeout(300); assert.ok((await p.innerText('#lsView .rl__read')).length > 20, m + ' readout'); }
    await p.click('#lsView [data-kc="mod"][data-v="roll"]'); await p.click('#lsView [data-rpred="sphere"]'); await p.click('#lsView [data-kb="race"]');
    await p.waitForFunction(() => LS.exp.live._state().rollDone, null, { timeout: 30000 }); await p.waitForTimeout(300);
    assert.match(await p.innerText('#lsView .rl__read'), /You predicted: Solid sphere — correct!/);
  });

  /* ---------------- Counting Studio ---------------- */
  await t('Counting engine: every formula agrees with listing the outcomes (n ≤ 6), circular and necklace counts, all six puzzles', async () => {
    await go('exp/counting-studio', '.cs__slots');
    const r = await live(() => { const C = LS.count, out = []; for (let n = 1; n <= 6; n++) for (let k = 0; k <= n; k++) out.push([n, k, C.nPr(n, k), C.listPerm(n, k).length, C.nCr(n, k), C.listComb(n, k).length, C.rep(n, k), C.tuples([...Array(n).keys()], k).length]); const circ = [3, 4, 5, 6].map(n => [n, C.circ(n), C.listCirc(n).length, C.circ(n, true), C.listCirc(n, true).length]); return { out, circ, puz: LS.exp.live._puz() }; });
    r.out.forEach(([n, k, P, lp, Cc, lc, R, lr]) => { assert.equal(P, lp, `P(${n},${k})`); assert.equal(Cc, lc, `C(${n},${k})`); assert.equal(R, lr, `rep ${n}^${k}`); assert.equal(P, fact(n) / fact(n - k)); });
    r.circ.forEach(([n, c, lc, nk, lnk]) => { assert.equal(c, lc, 'circular ' + n); assert.equal(c, fact(n - 1)); assert.equal(nk, lnk, 'necklace ' + n); });
    assert.deepEqual(r.puz.map(x => x.answer), [12, 12, 24, 72, 36, 60]);
    assert.deepEqual(r.puz.map(x => x.answer), [2 * fact(3), fact(4) - 2 * fact(3), fact(4), 3 * fact(4), fact(3) * fact(3), fact(5) / 2], 'puzzle answers equal the stated formulas');
  });
  await t('Arrange vs choose: swapping podium places makes a new arrangement; the same three in Choose mode make one team; tree has nPr leaves', async () => {
    await go('exp/counting-studio', '.cs__slots', 2000);
    await p.selectOption('#lsView [data-slot="0"]', '0'); await p.selectOption('#lsView [data-slot="1"]', '1'); await p.selectOption('#lsView [data-slot="2"]', '2');
    await p.selectOption('#lsView [data-slot="0"]', '1'); // Bea to gold: Ali moves to silver (no repetition)
    let s = await live(() => LS.exp.live._state()); assert.deepEqual(s.slots, [1, 0, 2]); assert.equal(s.foundPerm, 2, 'two different arrangements');
    const leaves = await p.$$eval('#lsView .cs__tree svg circle', cs => cs.length); assert.ok(leaves >= 60, 'tree drawn with at least 60 leaves: ' + leaves);
    await p.click('#lsView [data-kc="mode"][data-v="team"]'); await p.waitForTimeout(200);
    for (const order of [[0, 1, 2], [2, 0, 1], [1, 2, 0]]) { for (let i = 0; i < 3; i++) await p.selectOption(`#lsView [data-slot="${i}"]`, String(order[i])); }
    s = await live(() => LS.exp.live._state()); assert.equal(s.foundComb, 1, 'three orders, one team');
    assert.match(await p.innerText('#lsView .cs__math'), /⁵?5?\s*C\s*3 = 60 ÷ 6 = 10|60 ÷ 6 = 10/);
  });
  await t('Restriction puzzle: an invalid seating explains the violated rule; the correct count is accepted and verified by listing', async () => {
    await go('exp/counting-studio', '.cs__slots', 1500); await p.click('#lsView [data-kc="mode"][data-v="row"]'); await p.waitForTimeout(200);
    for (const [i, v] of [[0, 0], [1, 2], [2, 1], [3, 3]]) await p.selectOption(`#lsView [data-slot="${i}"]`, String(v));
    assert.match(await p.innerText('#lsView .cs__puz'), /not side by side/);
    await p.fill('#lsView [data-ans]', '24'); await p.click('#lsView [data-check]'); assert.match(await p.innerText('#lsView .cs__fb'), /too many/);
    await p.fill('#lsView [data-ans]', '12'); await p.click('#lsView [data-check]'); assert.match(await p.innerText('#lsView .cs__fb'), /Correct: 12/);
    assert.equal((await live(() => LS.exp.live._state())).solved, 1);
    await p.click('#lsView [data-kc="mode"][data-v="circle"]'); await p.waitForTimeout(200); await p.click('#lsView [data-kb="shuffle"]'); const before = (await live(() => LS.exp.live._state())).slots;
    await p.click('#lsView [data-kb="rotate"]'); const after = (await live(() => LS.exp.live._state())).slots;
    const same = await p.evaluate(([a, c]) => LS.count.canonCircle(a, false) === LS.count.canonCircle(c, false), [before, after]); assert.equal(same, true, 'rotating the table gives the same seating');
  });

  /* ---------------- Probability Lab ---------------- */
  await t('Probability engine: binomial sums to 1, two-dice distribution, exact tree fractions, Bayes and expected value', async () => {
    await go('exp/probability-lab', '.pb__read');
    const r = await live(() => { const P = LS.prob; let sb = 0; for (let k = 0; k <= 30; k++) sb += P.binom(30, k, 0.3); let sd = 0; for (let s = 2; s <= 12; s++) sd += P.sum2(s); const tr = P.tree([3, 2], 2, false), tw = P.tree([3, 2], 2, true), by = P.bayes(0.01, 0.99, 0.95), ev = P.ev([{ out: [1, 2, 3, 4, 5, 6].map(v => [1 / 6, v - 4]) }]); return { sb, sd, p7: P.sum2(7), tr: tr.map(x => [x.path.join(''), x.p.s, x.p.v]), tw: tw.map(x => x.p.s), by, ev: ev[0], b500: P.binom(1000, 500, 0.5) }; });
    near(r.sb, 1, 1e-9, 'Σ binom'); near(r.sd, 1, 1e-12, 'Σ two dice'); near(r.p7, 1 / 6, 1e-12, 'P(7)');
    assert.deepEqual(r.tr.map(x => x.slice(0, 2)), [['00', '3/10'], ['01', '3/10'], ['10', '3/10'], ['11', '1/10']], 'without replacement'); near(r.tr.reduce((s, x) => s + x[2], 0), 1, 1e-12, 'tree sums to 1');
    assert.deepEqual(r.tw, ['9/25', '6/25', '6/25', '4/25'], 'with replacement');
    near(r.by.ppv, 9.9 / (9.9 + 49.5), 1e-12, 'P(ill | +)'); near(r.ev.e, -0.5, 1e-12, 'E(dice game)'); near(r.b500, 0.025225, 1e-5, 'P(500 heads in 1000)');
  });
  await t('Coin and dice: frequencies settle; the 3D die and coin come to rest showing the drawn outcome; tree and Bayes views work', async () => {
    await go('exp/probability-lab', '.pb__read', 2500);
    let s = await live(() => LS.exp.live._run(4000)); near(s.heads / s.n, 0.5, 0.04, '4000 flips');
    await live(() => LS.exp.live._run(1)); await p.waitForTimeout(2500); s = await live(() => LS.exp.live._state()); if (s.has3d) assert.equal(s.coinUp, s.lastRes, 'coin shows the drawn face');
    await live(() => { LS.exp.live._mode('dice'); LS.exp.live._run(3000); LS.exp.live._run(1); }); await p.waitForTimeout(2500); s = await live(() => LS.exp.live._state());
    near((s.sums[7] || 0) / 3001, 1 / 6, 0.03, 'sum 7'); if (s.has3d) assert.deepEqual(s.dieUp, s.lastRes, 'dice show the drawn faces');
    await live(() => LS.exp.live._mode('urn')); await p.click('#lsView [data-kt="replace"]'); await p.waitForTimeout(200); assert.match(await p.innerText('#lsView .pb__panel'), /3\/10[\s\S]*1\/10/);
    await live(() => LS.exp.live._mode('cond')); await p.click('#lsView [data-kb="cond"]'); await p.waitForTimeout(200); assert.match(await p.innerText('#lsView .pb__read'), /16\.7 %/);
    assert.equal(await p.$$eval('#lsView .pb__grid i', x => x.length), 1000, '1000-person population');
    await live(() => LS.exp.live._mode('venn')); assert.match(await p.innerText('#lsView .pb__read'), /P\(A \| B\) = 30\/42/);
  });

  /* ---------------- universe, worlds, chapters, curriculum ---------------- */
  await t('Universe home: no category-pill rows; the journey has eleven worlds and an index; recommendations and discoveries link to real pages', async () => {
    await go('home', '.cz', 2500);
    assert.equal(await p.$$eval('#lsView .dx-filter, #lsView [data-fk]', x => x.length), 0, 'no category pills');
    assert.equal(await p.$$eval('#lsView [data-cz-enter]', x => x.length), 11); assert.equal(await p.$$eval('#lsView .cz-index__list a', x => x.length), 11); /* v30: the cinematic universe replaced the hero and its five actions */
    const hrefs = await p.$$eval('#lsView .uv-list a', a => a.map(x => x.getAttribute('href'))); assert.ok(hrefs.length >= 6);
    const ok = await p.evaluate(hs => hs.every(h => { const [r, id] = h.slice(2).split('/'); if (r === 'exp') return !!LS.experiences.find(x => x.id === id); if (r === 'chapter') return !!LS.curriculum.chapter(id); if (r === 'lab') return true; return true; }), hrefs); assert.equal(ok, true, 'every link resolves');
    assert.deepEqual(await p.$$eval('#atTabs a', a => a.map(x => x.textContent.trim())), ['Discover', 'Subjects', 'Learn', 'Practice', 'My Learning']);
  });
  await t('Curriculum validates: every chapter’s experiences, lab models, lessons, prerequisites, deck and assessment exist; no cycles', async () => {
    await go('lab', '.ls-labcat, .lab', 3000); await p.waitForFunction(() => window.ERLY_LAB && ERLY_LAB.engines.length > 100, null, { timeout: 60000 }); await p.evaluate(() => LS.needExp());
    const r = await p.evaluate(() => ({ errs: LS.curriculum.validate(ERLY_LAB.engines.map(e => e.id)), n: Object.keys(LS.curriculum.chapters).length, levels: [...new Set(Object.values(LS.curriculum.chapters).map(c => c.level))].sort(), cards: Object.values(LS.DECKDATA).reduce((s, d) => s + d.length, 0), qs: Object.values(LS.ASSESSDATA).reduce((s, d) => s + d.length, 0) }));
    assert.deepEqual(r.errs, []); assert.ok(r.n >= 40, r.n + ' chapters'); assert.deepEqual(r.levels, ['g11', 'g12', 'pg', 'ug1', 'ug2']); console.log(`     (${r.n} chapters · ${r.cards} cards · ${r.qs} assessment questions)`);
  });
  await t('Assessment numeric answers are recomputed independently', async () => {
    await go('home', '.cz');
    const A = await p.evaluate(() => LS.ASSESSDATA);
    const want = { 'p-rigid': [2 * 9 / 12 + 2 * 1.5 ** 2, +Math.sqrt(2 * 9.8 * 1.4 / (1 + 0.4)).toFixed(2)], 'p-relativity': [+(2 * 6.674e-11 * 1.989e30 / 2.998e8 ** 2 / 1000).toFixed(2), +Math.sqrt(1 - 1 / 4).toFixed(3)], 'm-discrete': [40 - (25 + 18 - 7), (7 * 6 * 5) / (3 * 2 * 1)], 'm-stochastic': [Math.sqrt(0.25 / 400), 4], 'cs-graphs': [Math.min(4 + 1, 1 + 5, 1 + 2 + 1)], 'b-popgen': [+(2 * (1 - Math.sqrt(1 / 2500)) * Math.sqrt(1 / 2500)).toFixed(3)], 'p-rotation': [2.4, 4.0], 'm-pc': [336, 56, 48, 120], 'm-probability': [+(5 / 36).toFixed(3), +(30 / 90).toFixed(3), +(19 / 117).toFixed(3), 3 * 3.5 - 5], 'm-diff': [12, (3.1 ** 2 - 9) / 0.1, 19], 'm-int': [9, 0 + 1 + 4, 75], 'm-bayes': [+(4 / 13).toFixed(3)], 'm-stats': [4], 'p-projectile': [+(400 / 9.81).toFixed(1)], 'cs-data': [53], 'x-markets': [1000 * 1.05 ** 2, 5], 'p-circuits': [3, 36], 'm-quadratics': [3], 'c-acids': [3] };
    Object.entries(want).forEach(([ch, vals]) => { const nums = A[ch].filter(q => q[0] === 'numeric').map(q => q[2].num); vals.forEach((v, i) => near(nums[i], v, 1e-6, ch + ' #' + i)); });
  });
  await t('World and chapter pages: tabs and level filter; blueprint shows objectives, prerequisites, concept map, 11 steps, mastery and next', async () => {
    await go('world/maths', '.uv-tabs');
    for (const tab of ['chapters', 'experiences', 'practice', 'cards', 'assess', 'overview']) { await p.click(`#lsView [data-wt="${tab}"]`); await p.waitForTimeout(150); assert.equal(await p.getAttribute(`#lsView [data-wt="${tab}"]`, 'aria-selected'), 'true'); }
    await p.selectOption('#lsView [data-wl]', 'pg'); await p.waitForTimeout(150); assert.deepEqual(await p.$$eval('#lsView .uv-ch b', x => x.map(e => e.textContent)), ['Bayesian reasoning', 'Random processes and Monte Carlo']);
    await go('chapter/m-pc', '.uv-steps'); assert.equal(await p.$$eval('#lsView .uv-steps li', x => x.length), 11);
    const txt = await p.innerText('#lsView'); assert.match(txt, /multiplication principle/i); assert.match(txt, /Mastery/); assert.match(txt, /Next chapter: Probability/); assert.match(txt, /Commonly taught in/);
    assert.ok(await p.$('#lsView .uv-cmap'));
  });

  /* ---------------- flashcards & assessments ---------------- */
  await t('Flashcards: teaching order, flip, keyboard marking, resume, review only shows due cards', async () => {
    await go('cards/m-pc', '.fc__card');
    const first = await p.innerText('#lsView .fc__front'); assert.match(first, /multiplication principle/);
    await p.keyboard.press('Space'); await p.waitForTimeout(100); assert.ok(await p.$('#lsView .fc__card.is-flipped'));
    await p.keyboard.press('1'); await p.waitForTimeout(450); assert.match(await p.innerText('#lsView .fc__meta'), /Card 2 \/ 12/); /* v34: cards slide (≈ 240 ms) */
    await p.keyboard.press('Space'); await p.keyboard.press('3'); await p.waitForTimeout(450);
    await go('cards/m-pc/learn', '.fc__card', 1200, true); assert.match(await p.innerText('#lsView .fc__meta'), /Card 3 \/ 12/, 'resumes where you were');
    await go('cards/m-pc/review', '.fc__body', 1200, true); assert.match(await p.innerText('#lsView .fc__body'), /Nothing is due|Card 1 \/ 1/);
    await go('cards/m-pc/apply', '.fc__card', 1200, true); assert.match(await p.innerText('#lsView .fc__meta'), /Application|Reasoning|Misconception|Comparison/);
  });
  await t('Assessment: no answer before trying; wrong answers explain the misconception; result by objective; mastery recorded', async () => {
    await go('assess/m-pc', '.as__q');
    assert.equal(await p.$$eval('#lsView .is-right, #lsView .as__fb', x => x.length), 0, 'nothing revealed before an attempt');
    await p.fill('#lsView [data-num]', '120'); await p.click('#lsView [data-check]'); assert.match(await p.innerText('#lsView .as__fb'), /Not quite[\s\S]*8 × 7 × 6 = 336/);
    for (let i = 1; i < 6; i++) { await p.click('#lsView [data-go]'); await p.waitForTimeout(80); const q = await p.evaluate(i => LS.assess.byChapter('m-pc')[i], i);
      if (q.kind === 'numeric') await p.fill('#lsView [data-num]', String(q.opts.num)); else await p.check(`#lsView input[name="as"][value="${q.answer}"]`); await p.click('#lsView [data-check]'); }
    await p.click('#lsView [data-go]'); const sum = await p.innerText('#lsView .fc__done'); assert.match(sum, /83 %|83%/); assert.match(sum, /Mastery reached/);
    assert.equal(await p.evaluate(() => Math.round(LS.prog.d().assess['m-pc'].best * 100)), 83);
    await go('assess/m-pc', '.as__q'); await p.check('#lsView input[name="as"][value="1"]').catch(() => {});
    await go('assess/p-rotation', '.as__q'); await p.check('#lsView input[name="as"][value="0"]'); await p.click('#lsView [data-check]'); assert.match(await p.innerText('#lsView .as__fb'), /Likely misconception/);
  });

  /* ---------------- guided layer, what-if, navigation, space ---------------- */
  await t('Guided mode: steps follow the live model, highlight their control, and advance only when done; What-if compares two states', async () => {
    await go('exp/rotation-lab/guided', '.gd-card', 2500);
    assert.equal(await p.getAttribute('#lsView [data-gm="guided"]', 'aria-checked'), 'true');
    assert.match(await p.innerText('#lsView .gd-card'), /step 1 \/ 6/i); await p.waitForTimeout(500); assert.equal(await p.isDisabled('#lsView [data-gd="next"]'), false, 'step 1 is already true (mass distribution is open)');
    await p.click('#lsView [data-gd="next"]'); assert.ok(await p.$('#lsView .gd-target'), 'step 2 highlights its control'); assert.equal(await p.isDisabled('#lsView [data-gd="next"]'), true, 'cannot advance before spinning');
    await p.click('#lsView [data-kb="spin"]'); await p.waitForTimeout(500); assert.equal(await p.isDisabled('#lsView [data-gd="next"]'), false, 'advance after spinning');
    await p.click('#lsView [data-gm="independent"]'); assert.equal(await p.isHidden('#lsView .gd-card'), true); await p.click('#lsView [data-gm="guided"]'); assert.match(await p.innerText('#lsView .gd-card'), /step 2 \/ 6/i, 'progress kept across modes');
    await p.click('#lsView [data-wi="save"]'); await live(() => LS.exp.live._set({ r: [0.4, 0.4, 0.4, 0.4] })); await p.click('#lsView [data-wi="cmp"]'); await p.waitForTimeout(200);
    assert.equal(await p.$$eval('#lsView .gd-wi img', x => x.length), 2, 'two pictures'); assert.match(await p.innerText('#lsView .gd-wi'), /Numbers that changed/);
  });
  await t('Navigation: Back from an assessment goes to its chapter, from a chapter to its world, from a world to Subjects; Escape leaves full screen', async () => {
    await go('explore', '.uv-worlds'); await p.click('#lsView a[href="#/world/physics"]'); await p.waitForTimeout(600); await p.click('#lsView a[href="#/chapter/p-rotation"]'); await p.waitForTimeout(600); await p.click('#lsView a[href="#/assess/p-rotation"]'); await p.waitForTimeout(600);
    await p.click('[data-ls-back]'); await p.waitForTimeout(500); assert.equal(await p.evaluate(() => location.hash), '#/chapter/p-rotation');
    await p.click('[data-ls-back]'); await p.waitForTimeout(500); assert.equal(await p.evaluate(() => location.hash), '#/world/physics');
    await p.click('[data-ls-back]'); await p.waitForTimeout(500); assert.equal(await p.evaluate(() => location.hash), '#/explore');
    await go('exp/counting-studio', '.gd-bar', 1500); await p.evaluate(() => { HTMLElement.prototype.requestFullscreen = undefined; }); await p.click('#lsView [data-fs]'); assert.ok(await p.$('#lsView .gd-full')); await p.keyboard.press('Escape'); assert.equal(await p.$('#lsView .gd-full'), null);
  });
  await t('Solar System Explorer: eight planets with NASA values; selecting a planet flies there and fills the panel; constellation and curiosity resolve', async () => {
    await go('space', '.sp-bar', 4000);
    const r = await live(() => ({ n: LS.planets.length, jup: LS.planets[4].r, earthYear: LS.planets[2].per, venusTilt: LS.planets[1].tilt, X: !!LS.__space }));
    assert.deepEqual([r.n, r.jup, r.earthYear, r.venusTilt], [8, 69911, 365.2, 177.4]);
    await p.click('#lsView [data-sp="3"]'); await p.waitForTimeout(300); assert.match(await p.innerText('#lsView .sp-info'), /Mars[\s\S]*3,389|Mars[\s\S]*3389/);
    await p.selectOption('#lsView [data-spc]', '2'); assert.match(await p.innerText('#lsView .sp-info'), /Mars vs Earth/);
    await go('constellation', '.km__svg'); const cn = await live(() => [LS.__constellation.count(), LS.__constellation.links()]); assert.ok(cn[0] >= 40 && cn[1] >= 15);
    await go('curiosity', '.uv-qs'); const bad = await p.$$eval('#lsView .uv-qs a', as => as.map(a => a.getAttribute('href')).filter(h => h.startsWith('#/exp/') && !LS.experiences.find(x => x.id === h.split('/')[2]))); assert.deepEqual(bad, []);
  });
  await t('no page errors', async () => { assert.deepEqual(errs, []); });
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
