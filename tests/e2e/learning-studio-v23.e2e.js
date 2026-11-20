/* ERLY v23 — end-to-end checks for the immersive Learning Studio work and the student desk:
   entrance, environment modes, focus mode, route transitions, subject world pages, the topic hub, the Newton's laws
   lab (physics checked against hand calculations), the "Into the leaf" zoom, Noor from a topic, and the portal desk.
   Run with: NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v23.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 10).join('\n     ')); } };
const num = s => parseFloat(String(s).replace('−', '-'));

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const fresh = async (opts, entered = true) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1360, height: 900 } }, opts || {}));
    await ctx.addInitScript(e => { sessionStorage.setItem('acubins-role', 'student'); if (e) sessionStorage.setItem('ls-entered', '1'); }, entered);
    const p = await ctx.newPage(); p.setDefaultTimeout(8000);
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_INTERNET|net::/.test(m.text())) errs.push(m.text()); });
    return p;
  };

  /* ---------- entrance ---------- */
  await t('entrance: plays once per session, ends by itself within ~1 s, and any key skips it', async () => {
    const p = await fresh(null, false); await p.goto(BASE + 'learn.html#/home'); await p.waitForTimeout(150);
    assert.ok(await p.locator('.at-enter').count() === 1, 'entrance shown on first open');
    await p.keyboard.press('Space'); await p.waitForTimeout(700); assert.equal(await p.locator('.at-enter').count(), 0, 'skipped by a key');
    await p.reload(); await p.waitForTimeout(200); assert.equal(await p.locator('.at-enter').count(), 0, 'not again in the same session');
    const q = await fresh(null, false); await q.goto(BASE + 'learn.html#/home'); await q.waitForTimeout(1800); assert.equal(await q.locator('.at-enter').count(), 0, 'gone by itself');
    await p.context().close(); await q.context().close();
  });
  await t('entrance: never shown with reduced motion', async () => {
    const p = await fresh({ reducedMotion: 'reduce' }, false); await p.goto(BASE + 'learn.html#/home'); await p.waitForTimeout(150);
    assert.equal(await p.locator('.at-enter').count(), 0); await p.context().close();
  });

  const p = await fresh();
  const go = async (h, w) => { await p.evaluate(x => { location.hash = '#/' + x; }, h); await p.waitForTimeout(w || 900); };
  await p.goto(BASE + 'learn.html#/home'); await p.waitForTimeout(1000);
  const consent = p.locator('.at-choice [data-consent="device"]'); if (await consent.count()) { await consent.click(); await p.waitForTimeout(300); }

  /* ---------- subject world page ---------- */
  await t('subject world: full-bleed living hero, a topic trail, experiences, and a begin/continue action', async () => {
    await go('subject/physics', 1400);
    assert.ok(await p.isVisible('.at-wh canvas.at-world--hero'));
    const box = await p.locator('.at-wh').boundingBox(); assert.ok(box.width >= 1340, 'hero spans the window: ' + box.width);
    assert.ok(await p.locator('.at-trail__list li').count() >= 3); assert.ok(await p.locator('.at-xlist li').count() >= 4);
    assert.match(await p.textContent('.at-wh'), /Enter the lab/);
    assert.ok(await p.evaluate(() => LS.worlds.count() >= 1), 'world is animating');
  });
  await t('environment switch: Living / Still / Plain, remembered, and Plain stops every world', async () => {
    await p.click('[data-env-set="off"]'); await p.waitForTimeout(400);
    assert.equal(await p.evaluate(() => document.documentElement.dataset.lsEnv), 'off'); assert.equal(await p.evaluate(() => LS.worlds.count()), 0);
    assert.equal(await p.evaluate(() => LS.store.data().settings.env), 'off', 'saved with the student’s settings');
    await p.click('[data-env-set="calm"]'); await p.waitForTimeout(400); assert.equal(await p.evaluate(() => LS.worlds.count()), 0, 'still = one frame, no loop');
    await p.click('[data-env-set="full"]'); await p.waitForTimeout(600); assert.ok(await p.evaluate(() => LS.worlds.count() >= 1));
  });
  await t('every subject has its own world and none throws', async () => {
    for (const s of ['maths', 'chemistry', 'biology', 'history', 'geography', 'english', 'languages', 'social']) { await go('subject/' + s, 700); assert.ok(await p.isVisible('.at-wh h1'), s); }
  });

  /* ---------- topic hub ---------- */
  await t('topic hub: Learn / Explore / Practise / Revise, with the Newton lab inside Explore', async () => {
    await go('topic/phys-newton', 1200);
    const modes = await p.$$eval('.at-modes a, .at-modes button', a => a.map(x => x.textContent.trim()));
    ['Learn', 'Explore', 'Practise', 'Revise'].forEach(m => assert.ok(modes.some(x => x.startsWith(m)), m + ' in ' + modes));
    await go('topic/phys-newton/explore', 900); assert.ok(await p.locator('a[href="#/exp/newton-lab"]').count() >= 1);
    await go('topic/phys-newton/revise', 900); assert.ok((await p.textContent('#lsView')).length > 200);
  });
  await t('focus mode: hides the chrome, Escape brings it back', async () => {
    await go('topic/phys-newton', 900); await p.click('[data-focus-toggle]'); await p.waitForTimeout(200);
    assert.ok(await p.evaluate(() => document.documentElement.classList.contains('at-focus'))); assert.equal(await p.isVisible('.at-sub'), false, 'sub-navigation hidden'); assert.ok(await p.isVisible('[data-focus-toggle]'), 'the way out stays visible');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); assert.equal(await p.evaluate(() => document.documentElement.classList.contains('at-focus')), false);
  });
  await t('Noor from a topic: only the topic and its objectives are sent, and the prompt asks for questions without answers', async () => {
    await go('topic/phys-newton', 900); await p.click('[data-tpnoor="practice"]'); await p.waitForTimeout(500);
    const s = await p.evaluate(() => LS.noor.lastSent); assert.equal(s.kind, 'practice'); assert.match(s.prompt, /Do not give the answers yet/);
    assert.match(s.context.text, /F = ma/); assert.ok(!/attempt|mistake|profile/i.test(JSON.stringify(s.context)), 'no history in the context');
    await p.evaluate(() => ERLY.companion && ERLY.companion.close && ERLY.companion.close());
  });

  /* ---------- Newton's laws lab ---------- */
  const setS = async (k, v) => { await p.fill(`[data-s="${k}"]`, String(v)); await p.dispatchEvent(`[data-s="${k}"]`, 'input'); };
  await t('Newton lab · first law: after a 1 s push on a frictionless floor the speed stays the same', async () => {
    await go('exp/newton-lab', 1200); await p.click('.at-x__steps [data-step="explore"]'); await p.waitForTimeout(300);
    await p.click('[data-nl="push1"]'); await p.waitForTimeout(4500);
    const log = await p.textContent('.nl__log'); const v = [...log.matchAll(/([\d.]+) m\/s/g)].map(m => +m[1]);
    assert.ok(v.length >= 2 && Math.abs(v[0] - 5) < 0.02 && Math.abs(v[1] - v[0]) < 0.02, log.slice(0, 200));
  });
  await t('Newton lab · second law: measured a equals F ÷ m for three runs', async () => {
    await p.click('[data-mis="fma"]'); await setS('F', 20); await setS('m', 2); await p.click('[data-nl="run"]'); await p.waitForTimeout(2600);
    await setS('m', 8); await p.click('[data-nl="run"]'); await p.waitForTimeout(2600);
    await setS('F', 40); await p.click('[data-nl="run"]'); await p.waitForTimeout(2600);
    const rows = await p.$$eval('.nl__log tbody tr', r => r.map(x => [...x.cells].map(c => c.textContent.trim())));
    assert.ok(rows.length >= 3, 'three runs logged: ' + JSON.stringify(rows));
    rows.slice(-3).forEach(r => { const [F, m, a] = r.map(num); assert.ok(Math.abs(a - F / m) < 0.05, `a=${a} for F=${F}, m=${m}`); });
  });
  await t('Newton lab · friction: holds below μs·m·g, slides above it; kinetic friction is μk·m·g', async () => {
    await p.click('[data-mis="friction"]'); await setS('m', 5); await setS('F', 20); await p.click('[data-nl="run"]'); await p.waitForTimeout(800);
    assert.match(await p.textContent('.nl__read'), /v = 0\.00 m\/s/);
    for (const f of [24, 25]) { await setS('F', f); await p.waitForTimeout(600); }
    const log = (await p.textContent('.nl__log')).replace(/\s+/g, ' ');
    assert.match(log, /24\.5 N/); assert.match(log, /14\.7 N/);
  });
  await t('Newton lab · collisions: momentum conserved; with e = 1 kinetic energy too; velocities match the formulas', async () => {
    await p.click('[data-mis="collide"]'); await p.click('[data-nl="go"]'); await p.waitForTimeout(3600);
    const log = (await p.textContent('.nl__log')).replace(/\s+/g, ' ');
    assert.match(log, /momentum.*?2\.00\s*2\.00/i); assert.match(log, /energy.*?11\.00\s*11\.00/i); assert.match(log, /−2\.33/); assert.match(log, /1\.67/);
  });
  await t('experience frame: the Play/Pause label follows the simulation', async () => {
    // the collision run is still going (it ends when the carts leave the track, at most 12 s): the label says Pause …
    assert.equal((await p.textContent('[data-x="pause"]')).trim(), 'Pause');
    // … and once the simulation stops by itself, the label must say Play without anyone touching it
    await p.waitForFunction(() => document.querySelector('[data-x="pause"]').textContent.trim() === 'Play', null, { timeout: 14000 });
  });

  /* ---------- Into the leaf ---------- */
  await t('Into the leaf: meadow → plant → leaf → palisade cell → chloroplast, with the scale bar changing each level', async () => {
    await go('exp/leaf-dive', 1200); await p.click('.at-x__steps [data-step="explore"]').catch(() => {}); await p.waitForTimeout(300);
    const scales = [await p.textContent('.ld__scale')];
    for (const k of ['plant', 'leaf', 'palisade', 'chloroplast']) {
      const part = p.locator(`.ld__scene [data-part="${k}"] :is(ellipse,path,circle,rect:not([fill=transparent]))`).first();
      await part.click({ force: true }); await p.waitForTimeout(120); await part.click({ force: true }); await p.waitForTimeout(1000);
      scales.push(await p.textContent('.ld__scale'));
    }
    assert.deepEqual(scales.map(s => s.split(': ')[1]), ['≈ 10 m', '≈ 50 cm', '≈ 0.3 mm', '≈ 50 µm', '≈ 5 µm']);
    await p.locator('.ld__scene [data-part="grana"] rect').nth(3).click({ force: true }); await p.waitForTimeout(200);
    assert.match(await p.textContent('.ld__info'), /Thylakoids/);
  });
  await t('Into the leaf: every part is reachable by keyboard', async () => {
    await p.click('[data-ld="out"]'); await p.waitForTimeout(900);
    const n = await p.locator('.ld__scene [data-part][tabindex="0"]').count(); assert.ok(n >= 3, 'focusable parts ' + n);
    await p.locator('.ld__scene [data-part][tabindex="0"]').first().focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    assert.ok((await p.textContent('.ld__info')).length > 20);
  });

  /* ---------- phone layout ---------- */
  await t('phone: no horizontal overflow on a world page, a topic hub and both new experiences', async () => {
    const q = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true }); await q.goto(BASE + 'learn.html#/home'); await q.waitForTimeout(900);
    for (const h of ['subject/physics', 'topic/phys-newton', 'exp/newton-lab', 'exp/leaf-dive']) { await q.evaluate(x => { location.hash = '#/' + x; }, h); await q.waitForTimeout(1000); const w = await q.evaluate(() => document.documentElement.scrollWidth); assert.ok(w <= 392, h + ' width ' + w); }
    await q.context().close();
  });

  /* ---------- student desk ---------- */
  await t('desk (empty): says plainly that nothing is saved, and offers a real first step', async () => {
    const q = await fresh(); await q.goto(BASE + 'student.html'); await q.waitForTimeout(900);
    const txt = await q.textContent('#desk'); assert.match(txt, /Nothing is saved in this browser yet/); assert.match(txt, /Open the Learning Studio/);
    assert.equal(await q.locator('h1').count(), 1, 'one h1 on the portal'); await q.context().close();
  });
  await t('desk (with data): the next step comes from the student’s own saved activity', async () => {
    const q = await fresh(); await q.addInitScript(() => { localStorage.setItem('erly-learn-v1', JSON.stringify({ v: 1, recent: [{ type: 'exp', id: 'newton-lab', title: 'Newton’s laws lab', at: Date.now() - 36e5 }], cards: {}, lessons: {}, mistakes: {} })); });
    await q.goto(BASE + 'student.html'); await q.waitForTimeout(900);
    assert.match(await q.textContent('.desk__next'), /Pick up where you left off.*Newton’s laws lab/s);
    assert.equal(await q.getAttribute('.desk__next', 'href'), 'learn.html#/exp/newton-lab');
    await q.context().close();
  });

  assert.deepEqual(errs, [], 'no page errors');
  console.log(`\n${pass}/${pass + fail} passed`); if (errs.length) console.log('errors', errs);
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
