// Learning Studio v21 ("Atelier") — the Reading Studio moved into the Learning Studio. Acceptance checks for the new
// shell, Reading & Resources (the existing reader), storage choice and deletion, Noor in context, the palette, lazy
// loading, the redirects from the rest of ERLY, and the Support Pact bridge. Run with the local server:
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v21.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + String(e.message || e).split('\n')[0].slice(0, 260)]); } };

(async () => {
  const b = await chromium.launch();
  const fresh = async (opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1360, height: 900 } }, opts || {})); await ctx.addInitScript(() => sessionStorage.setItem('acubins-role', 'student')); const p = await ctx.newPage(); p.errs = []; p.posts = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('request', r => { if (r.method() !== 'GET') p.posts.push(r.url()); }); return { ctx, p }; };
  const stored = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
  const selectFirstParagraph = p => p.evaluate(() => { const el = document.querySelector('.studio .sp__t'); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event('selectionchange')); });

  /* ---------- session-only: nothing is written, not even by the reader ---------- */
  let { ctx, p } = await fresh();
  await p.goto(BASE + 'learn.html#/home', { waitUntil: 'load' });
  await check('the Visual Lab (1.1 MB) is not loaded before the page has loaded', async () => {
    const early = await p.evaluate(() => performance.getEntriesByType('resource').filter(e => /assets\/js\/lab\//.test(e.name) && e.startTime < performance.timing.loadEventStart - performance.timing.navigationStart).length);
    assert.equal(early, 0);
    await p.evaluate(() => LS.needLab()); assert.ok(await p.evaluate(() => ERLY_LAB.engines.length >= 170), 'loads on demand');
  });
  await check('home: one spine with nine places, a verb sentence, the atlas and an honest empty shelf', async () => {
    assert.equal(await p.locator('#atTabs a[data-env]').count(), 9);
    assert.equal(await p.getAttribute('#atTabs a[data-env="home"]', 'aria-current'), 'page');
    assert.equal(await p.locator('.at-verbs a').count(), 8);
    assert.equal(await p.locator('#atAtlas > li').count(), 7);
    assert.match(await p.textContent('.at-shelf'), /Nothing to resume yet/);
  });
  await check('first visit asks where learning is kept; nothing is stored before choosing', async () => {
    assert.ok(await p.isVisible('.at-choice')); assert.equal(await stored(p, 'erly-learn-v1'), null);
  });
  await p.click('.at-choice [data-consent="visit"]'); await p.waitForTimeout(300);
  await check('"Just this visit": reading, highlighting and preferences write nothing to the device', async () => {
    await p.evaluate(() => { location.hash = '#/read'; }); await p.waitForTimeout(600);
    await p.click('#atPrefs summary'); await p.selectOption('select[data-pref="tint"]', 'cream');
    await p.click('[data-open="reading:biol101"]'); await p.waitForTimeout(1300);
    assert.equal(await p.evaluate(() => ERLY.reader.format().tint), 'cream', 'preference applied to the reader');
    await selectFirstParagraph(p); await p.waitForTimeout(500); await p.click('#stSel [data-hl] >> nth=0'); await p.waitForTimeout(300);
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    assert.equal(await stored(p, 'erly-studio-v1'), null, 'reader stored nothing'); assert.equal(await stored(p, 'erly-learn-v1'), null, 'studio stored nothing');
  });
  await check('no request is sent anywhere by reading, searching or using the Studio', async () => { assert.deepEqual(p.posts, []); });
  await ctx.close();

  /* ---------- this device: reading persists, resumes and is deleted on request ---------- */
  ({ ctx, p } = await fresh());
  await p.goto(BASE + 'learn.html#/home'); await p.waitForTimeout(1200); await p.click('.at-choice [data-consent="device"]'); await p.waitForTimeout(300);
  await check('Reading & Resources: course readings, study guides, worksheets and references, with real counts', async () => {
    await p.evaluate(() => { location.hash = '#/read'; }); await p.waitForTimeout(600);
    const c = await p.evaluate(() => ({ r: STUDIO_LIBRARY.length, l: LS.lessons.length }));
    for (const [k, n] of [['reading', c.r], ['guide', c.l], ['sheet', c.l]]) assert.equal(await p.textContent(`[data-kind="${k}"] span`), String(n));
    assert.ok(await p.locator('[data-kind="book"]').count(), 'references from the lessons’ cited sources');
  });
  await check('a course reading opens in the full reader (highlight saved, progress kept, resumes from Home)', async () => {
    await p.click('[data-open="reading:psyc101"]'); await p.waitForTimeout(1300);
    assert.ok(await p.evaluate(() => ERLY.reader.isOpen() && ERLY.reader.doc.id === 'psyc101'));
    await selectFirstParagraph(p); await p.waitForTimeout(500); await p.click('#stSel [data-hl] >> nth=0'); await p.waitForTimeout(300);
    await p.evaluate(() => { const d = document.querySelector('.studio .sdoc, .studio [class*="sdoc"]') || document.querySelector('#stDoc'); if (d) d.scrollTop = 900; }); await p.waitForTimeout(400);
    await p.keyboard.press('Escape'); await p.waitForTimeout(800);
    const db = JSON.parse(await stored(p, 'erly-studio-v1')); assert.ok((db.notes.psyc101 || []).length >= 1, 'highlight saved'); assert.ok(db.prog.psyc101, 'position saved');
    await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(600); assert.match(await p.textContent('.at-shelf'), /PSYC101/);
  });
  await check('selecting a passage in the reader offers seven ways to ask Noor, with the passage attached', async () => {
    await p.evaluate(() => { window.__asked = []; ERLY.companion.ask = (q, o) => window.__asked.push({ q, o }); });
    await p.evaluate(() => ERLY.reader.openDoc('psyc101')); await p.waitForTimeout(900); await selectFirstParagraph(p); await p.waitForTimeout(500);
    await p.click('#stSel [data-sa="ask"]'); assert.equal(await p.locator('#stSel [data-sq]').count(), 7);
    await p.click('#stSel [data-sq="simplify"]'); const a = await p.evaluate(() => window.__asked[0]);
    assert.match(a.q, /simpler words/); assert.ok(a.o.context.quote.length > 20, 'the selected passage travels with the question');
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
  });
  await check('a study guide built from a lesson opens in the same reader', async () => {
    await p.evaluate(() => { location.hash = '#/read'; }); await p.waitForTimeout(500); await p.click('[data-kind="guide"]'); await p.click('[data-open="guide:math-quad"]'); await p.waitForTimeout(1100);
    assert.deepEqual(await p.evaluate(() => [ERLY.reader.doc.id, ERLY.reader.doc.pages.length > 2]), ['guide-math-quad', true]);
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
  });
  await check('a worksheet lists the lesson’s own questions and can be printed', async () => {
    await p.evaluate(() => { location.hash = '#/read/sheet/bio-heart'; }); await p.waitForTimeout(500);
    const n = await p.evaluate(() => LS.lesson('bio-heart').sections.flatMap(s => s.blocks).filter(b => b.k === 'activity').length);
    assert.equal(await p.locator('.at-doc .at-q').count(), n); assert.ok(await p.isVisible('text=Print or save as PDF'));
  });
  await check('your own text file opens in the reader on this device (never uploaded)', async () => {
    await p.evaluate(() => { location.hash = '#/read'; }); await p.waitForTimeout(500);
    await p.setInputFiles('#atFile', { name: 'my-notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Photosynthesis\n\nPlants turn light energy into chemical energy stored in glucose. Chlorophyll absorbs red and blue light.') });
    await p.waitForTimeout(1500); assert.ok(await p.evaluate(() => ERLY.reader.isOpen() && ERLY.reader.doc.uploaded === true));
    await p.keyboard.press('Escape'); await p.waitForTimeout(700); assert.deepEqual(p.posts, []);
  });
  await check('lesson sections can be bookmarked and appear in the Notebook', async () => {
    await p.evaluate(() => { location.hash = '#/lesson/bio-heart/chambers'; }); await p.waitForTimeout(900);
    await p.click('[data-lbm]'); assert.equal(await p.getAttribute('[data-lbm]', 'aria-pressed'), 'true');
    await p.evaluate(() => { location.hash = '#/notebook'; }); await p.waitForTimeout(600); await p.click('[data-folder="Bookmarks"]'); await p.waitForTimeout(300);
    assert.match(await p.textContent('.ls-nbbm'), /Four chambers/);
  });
  await check('Noor margin: context from the page, eight ways to ask, honest about where it answers', async () => {
    await p.evaluate(() => { location.hash = '#/lesson/bio-heart/chambers'; }); await p.waitForTimeout(800);
    await p.evaluate(() => { const el = document.querySelector('#lsView [data-ls-sel] p, #lsView p'); const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); });
    await p.waitForTimeout(300); await p.click('#atNoorBtn'); await p.waitForTimeout(300);
    assert.equal(await p.locator('#atNoor .at-act').count(), 8); assert.match(await p.textContent('#atNoorWhere'), /device|online|brain/i);
    assert.match(await p.textContent('#atNoor .at-ctx'), /Your selection/);
    await p.click('#atNoor [data-noor="steps"]'); const s = await p.evaluate(() => LS.noor.lastSent);
    assert.equal(s.kind, 'steps'); assert.match(s.prompt, /step by step/i); assert.ok(!(await p.evaluate(() => document.getElementById('atNoor').classList.contains('is-on'))), 'the margin closes after asking');
  });
  await check('⌘K palette: keyboard search across lessons, readings, videos and models; Enter opens', async () => {
    await p.keyboard.press('Control+k'); await p.waitForTimeout(200); assert.ok(await p.isVisible('#atPal'));
    await p.keyboard.type('photosynthesis'); await p.waitForTimeout(200); const opts = await p.$$eval('#atPalList [role="option"]', o => o.map(x => x.textContent));
    assert.ok(opts.some(t => /Photosynthesis and limiting factors/.test(t)), opts.join('|'));
    await p.keyboard.press('Enter'); await p.waitForTimeout(500); assert.match(await p.evaluate(() => location.hash), /#\/lesson\/bio-photo/);
  });
  await check('"Delete everything" also deletes the reader’s highlights, notes, bookmarks and positions', async () => {
    p.on('dialog', d => d.accept());
    await p.evaluate(() => { location.hash = '#/profile'; }); await p.waitForTimeout(600); await p.click('[data-delall]'); await p.waitForTimeout(500);
    assert.equal(await stored(p, 'erly-studio-v1'), null); assert.equal(await p.evaluate(() => (ERLY.reader.progressOf('psyc101'))), null);
  });
  await check('the Support Pact can still measure reading here — and records nothing without a signed pact', async () => {
    assert.equal(await p.evaluate(() => typeof ERLY.track), 'function'); assert.equal(await p.evaluate(() => ERLY.isTracking()), false);
    await p.evaluate(() => ERLY.track('V01')); const t = JSON.parse(await stored(p, 'erly-track-v2') || '{}'); assert.ok(!t.live || !t.live.V01, 'nothing recorded without a pact');
  });
  await check('no page errors in the Studio', async () => { assert.deepEqual(p.errs, []); });
  await ctx.close();

  /* ---------- the rest of ERLY now leads here ---------- */
  ({ ctx, p } = await fresh());
  await check('every old way into the Reading Studio now opens the Learning Studio', async () => {
    const via = async fn => { await p.goto(BASE + 'student.html'); await p.waitForTimeout(800); await fn(); await p.waitForURL(/learn\.html/, { timeout: 6000 }); return p.url(); };
    assert.match(await via(() => p.click('.hero__cta a.btn--accent')), /learn\.html$/);
    assert.match(await via(() => p.evaluate(() => document.querySelector('#reading-studio [data-studio]').click())), /learn\.html#\/read/);
    assert.match(await via(() => p.evaluate(() => ERLY.reader.openLibrary())), /learn\.html#\/read/);
    await via(() => p.evaluate(() => ERLY.reader.openDoc('mech210'))); await p.waitForTimeout(1500); assert.ok(await p.evaluate(() => ERLY.reader.isOpen() && ERLY.reader.doc.id === 'mech210'));
  });
  await check('the student page has one Learning Studio entry and no Reading Studio entry', async () => {
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(600);
    const nav = await p.$$eval('header nav a', as => as.map(a => a.textContent.trim())); assert.equal(nav.filter(t => /Learning Studio/.test(t)).length, 1); assert.equal(nav.filter(t => /Reading Studio/.test(t)).length, 0);
    assert.doesNotMatch(await p.textContent('body'), /Reading Studio/);
  });
  await ctx.close();

  /* ---------- phone ---------- */
  ({ ctx, p } = await fresh(devices['iPhone 13']));
  await check('phone: dock + sheet, Noor as a bottom sheet, no sideways scrolling, floating buttons out of the way', async () => {
    for (const r of ['home', 'read', 'lesson/bio-heart', 'subject/physics', 'practice']) { await p.goto(BASE + 'learn.html#/' + r); await p.waitForTimeout(900); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), r); }
    assert.ok(await p.isVisible('#atDock')); await p.click('#atDock [data-more]'); assert.ok(await p.isVisible('#atSheet'));
    await p.keyboard.press('Escape'); await p.click('#atNoorBtn'); await p.waitForTimeout(400);
    assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.a11y-fab')).visibility), 'hidden');
  });
  await ctx.close();

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? 'PASS ' : 'FAIL ') + n + (r === 'PASS' ? '' : ' — ' + r));
  const f = results.filter(r => r[1] !== 'PASS').length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
})();
