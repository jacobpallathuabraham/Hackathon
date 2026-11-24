// Learning Studio v34 — the Knowledge Map, the subject interface, 3D flashcards, assessments, data integrity.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v34.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const ORDER = ['maths', 'physics', 'chemistry', 'biology', 'cs', 'geography', 'english', 'history', 'languages', 'social', 'more'];

(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (opts) => { const c = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, opts || {})); await c.addInitScript(() => { try { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); } catch (e) { /* */ } });
    const p = await c.newPage(); p.setDefaultTimeout(20000); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) errs.push(m.text()); }); return p; };
  const p = await mk();
  const go = async (h, sel) => { await p.evaluate(h => { location.hash = '#/' + h; }, h); await p.waitForSelector('#lsView ' + sel); await p.waitForTimeout(250); };
  const settle = () => p.waitForFunction(() => !LS.__constellation.busy(), null, { timeout: 5000 });
  await p.goto(BASE + 'learn.html#/constellation'); await p.waitForSelector('.km__svg');

  await t('Knowledge Map: eleven subject regions, every chapter once, sized by real content, no overlapping chapters', async () => {
    const r = await p.evaluate(() => { const C = LS.curriculum, L = LS.__constellation.layout(); const nodes = [...document.querySelectorAll('.km-n')].map(n => n.dataset.ch);
      const boxes = [...document.querySelectorAll('.km-n')].map(n => { const b = n.getBBox(), p = L.pos[n.dataset.ch]; return { id: n.dataset.ch, x: p.x + b.x, y: p.y + b.y, w: b.width, h: b.height, s: p.s }; });
      let overlap = []; boxes.forEach((a, i) => boxes.forEach((c, j) => { if (j > i && a.x < c.x + c.w - 2 && c.x < a.x + a.w - 2 && a.y < c.y + c.h - 2 && c.y < a.y + a.h - 2) overlap.push(a.id + '×' + c.id); }));
      const outside = boxes.filter(bx => { const R = L.regions.find(q => q.s === bx.s); return bx.x < R.x || bx.y < R.y || bx.x + bx.w > R.x + R.w + 1 || bx.y + bx.h > R.y + R.h + 1; }).map(b => b.id);
      return { regions: [...document.querySelectorAll('.km-reg')].map(g => g.dataset.s), names: [...document.querySelectorAll('.km-reg__name')].map(x => x.textContent), nodes: nodes.sort(), all: Object.keys(C.chapters).sort(), per: L.regions.map(q => [q.s, q.chs.length, C.bySubject(q.s).flatMap(co => co.chapters).length]), overlap, outside }; });
    assert.deepEqual(r.regions.slice().sort(), ORDER.slice().sort()); assert.equal(r.names.length, 11); assert.ok(r.names.includes('Economics & Psychology'));
    assert.deepEqual(r.nodes, r.all, 'every chapter exactly once'); r.per.forEach(([s, a, b0]) => assert.equal(a, b0, s + ' shows its real chapter count'));
    assert.deepEqual(r.overlap, []); assert.deepEqual(r.outside, [], 'chapters stay inside their subject region');
  });

  await t('Knowledge Map: only real relationships — in-subject prerequisites drawn, cross-subject ones hidden until relevant', async () => {
    const r = await p.evaluate(() => { const C = LS.curriculum; const pre = [], x = []; Object.values(C.chapters).forEach(ch => ch.prereq.forEach(q => (C.chapter(q).subject === ch.subject ? pre : x).push(q + '>' + ch.id)));
      return { pre: pre.length, x: x.length, links: C.LINKS.length, dPre: document.querySelectorAll('.km-e--pre').length, dX: document.querySelectorAll('.km-e--x').length, dL: document.querySelectorAll('.km-e--link').length, visX: [...document.querySelectorAll('.km-e--x, .km-e--link')].filter(e => +getComputedStyle(e).opacity > 0.05).length }; });
    assert.equal(r.dPre, r.pre); assert.equal(r.dX, r.x); assert.equal(r.dL, r.links); assert.equal(r.visX, 0, 'cross-subject lines hidden by default');
    await p.click('[data-all]'); await p.waitForTimeout(400); assert.equal(await p.evaluate(() => [...document.querySelectorAll('.km-e--x, .km-e--link')].filter(e => +getComputedStyle(e).opacity > 0.05).length), r.x + r.links, 'Show all connections reveals every one');
    await p.click('[data-all]'); await p.waitForTimeout(400);
  });

  await t('Knowledge Map: selecting a subject focuses it smoothly, dims the rest and fills the panel with real progress', async () => {
    const k0 = await p.evaluate(() => LS.__constellation.cam().k);
    await p.click('.km-reg[data-s="chemistry"] .km-reg__head', { force: true }); await p.waitForTimeout(120); assert.ok(await p.evaluate(() => LS.__constellation.busy()), 'camera eases (not a jump)'); await settle();
    const r = await p.evaluate(() => ({ k: LS.__constellation.cam().k, sel: LS.__constellation.sel(), dim: document.querySelectorAll('.km-reg.is-dim').length, panel: document.querySelector('.km__panel').innerText }));
    assert.ok(r.k > k0, 'zoomed in'); assert.deepEqual(r.sel, { type: 'subject', id: 'chemistry' }); assert.ok(r.dim >= 5);
    assert.match(r.panel, /Chemistry/); assert.match(r.panel, /0 \/ 5 explored/); assert.match(r.panel, /Atomic structure and the periodic table/); assert.match(r.panel, /Open Chemistry/);
  });

  await t('Knowledge Map: selecting a chapter shows its prerequisites, what it leads to and cross-subject links; a second activation opens it', async () => {
    await p.evaluate(() => LS.__constellation.select({ type: 'subject', id: 'physics' })); await settle();
    await p.click('.km-n[data-ch="p-waves"]', { force: true }); await settle();
    const r = await p.evaluate(() => ({ panel: document.querySelector('.km__panel').innerText, hot: [...document.querySelectorAll('.km-e.is-hot')].length, hotX: [...document.querySelectorAll('.km-e--link.is-hot, .km-e--x.is-hot')].filter(e => +getComputedStyle(e).opacity > 0.5).length, dimN: document.querySelectorAll('.km-n.is-dim').length, on: [...document.querySelectorAll('.km-n:not(.is-dim)')].map(n => n.dataset.ch).sort() }));
    assert.match(r.panel, /Waves, sound and light/); assert.match(r.panel, /Needs first[\s\S]*Trigonometry and the unit circle/i); assert.match(r.panel, /Leads to[\s\S]*Signals and systems/i); assert.match(r.panel, /Connected ideas[\s\S]*waves are sinusoids/i);
    const expect = await p.evaluate(() => { const C = LS.curriculum, id = 'p-waves', anc = new Set(), w = x => C.chapter(x).prereq.forEach(q => { if (!anc.has(q)) { anc.add(q); w(q); } }); w(id); return [id, ...anc, ...Object.values(C.chapters).filter(c => c.prereq.includes(id)).map(c => c.id), ...C.LINKS.filter(l => l[0] === id || l[1] === id).map(l => (l[0] === id ? l[1] : l[0]))].filter((v, i, a) => a.indexOf(v) === i).sort(); });
    assert.deepEqual(r.on, expect, 'exactly the related chapters stay lit'); assert.ok(r.hotX >= 2, 'its cross-subject connections are drawn');
    await p.click('.km-n[data-ch="p-waves"]', { force: true }); await p.waitForFunction(() => location.hash === '#/chapter/p-waves'); await p.goBack(); await p.waitForSelector('.km__svg'); await p.waitForTimeout(300);
  });

  await t('Knowledge Map: concepts show where else they are taught; search finds subjects, chapters and concepts', async () => {
    await p.evaluate(() => LS.__constellation.select({ type: 'chapter', ch: 'b-genetics' })); await settle();
    await p.click('.km__panel [data-concept="allele"]'); await p.waitForTimeout(300); const t1 = await p.innerText('.km__panel'); assert.match(t1, /Concept[\s\S]*allele/i);
    const shared = await p.evaluate(() => { const ix = {}; Object.values(LS.curriculum.chapters).forEach(c => c.concepts.forEach(k => { (ix[k.toLowerCase()] = ix[k.toLowerCase()] || []).push(c.id); })); return Object.entries(ix).find(([, v]) => v.length > 1); });
    if (shared) { await p.evaluate(([k, v]) => LS.__constellation.select({ type: 'concept', ch: v[0], concept: LS.curriculum.chapter(v[0]).concepts.find(c => c.toLowerCase() === k) }), shared); await p.waitForTimeout(300); assert.match(await p.innerText('.km__panel'), /Also taught in/); }
    await p.fill('#kmFind', 'gravit'); await p.waitForSelector('#kmRes li[data-i]'); const opts = await p.$$eval('#kmRes li[data-i] b', x => x.map(e => e.textContent)); assert.ok(opts.some(o => /Gravitation and orbits/.test(o)), opts.join('|'));
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await settle(); assert.equal((await p.evaluate(() => LS.__constellation.sel())).ch, 'p-gravitation');
    await p.fill('#kmFind', 'Biology'); await p.keyboard.press('Enter'); await settle(); assert.deepEqual(await p.evaluate(() => LS.__constellation.sel()), { type: 'subject', id: 'biology' });
  });

  await t('Knowledge Map: zoom buttons, wheel, drag and keyboard move the camera; Overview and Escape reset', async () => {
    await p.click('[data-z="home"]'); await settle(); const c0 = await p.evaluate(() => LS.__constellation.cam());
    await p.click('[data-z="in"]'); await settle(); const c1 = await p.evaluate(() => LS.__constellation.cam()); assert.ok(c1.k > c0.k * 1.3);
    const box = await p.locator('.km__stage').boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.wheel(0, -300); await p.waitForTimeout(150); const c2 = await p.evaluate(() => LS.__constellation.cam()); assert.ok(c2.k > c1.k, 'wheel zooms');
    await p.mouse.move(box.x + 300, box.y + 300); await p.mouse.down(); await p.mouse.move(box.x + 420, box.y + 360, { steps: 6 }); await p.mouse.up(); const c3 = await p.evaluate(() => LS.__constellation.cam()); assert.ok(Math.abs(c3.x - c2.x) > 20, 'drag pans');
    await p.focus('.km__stage'); await p.keyboard.press('ArrowRight'); await settle(); assert.ok((await p.evaluate(() => LS.__constellation.cam())).x > c3.x, 'arrow pans');
    await p.keyboard.press('0'); await settle(); const c4 = await p.evaluate(() => LS.__constellation.cam()); assert.ok(Math.abs(c4.k - c0.k) < 1e-3, 'overview');
    // keyboard selection: Tab reaches chapters, Enter selects, Escape steps back out
    await p.focus('.km-n[data-ch="m-int"]'); await p.keyboard.press('Enter'); await settle(); assert.equal((await p.evaluate(() => LS.__constellation.sel())).ch, 'm-int');
    await p.keyboard.press('Escape'); await settle(); assert.deepEqual(await p.evaluate(() => LS.__constellation.sel()), { type: 'subject', id: 'maths' }); await p.keyboard.press('Escape'); await settle(); assert.equal(await p.evaluate(() => LS.__constellation.sel()), null);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });

  await t('Knowledge Map on a phone: touch selection, readable zoom, the panel is a bottom sheet inside the screen; no overflow', async () => {
    const q = await mk(devices['iPhone 13']); await q.goto(BASE + 'learn.html#/constellation'); await q.waitForSelector('.km__svg'); await q.waitForTimeout(600);
    await q.evaluate(() => LS.__constellation.select({ type: 'subject', id: 'physics' })); await q.waitForFunction(() => !LS.__constellation.busy()); await q.waitForTimeout(200);
    await q.evaluate(() => scrollTo(0, scrollY + document.querySelector('.km__stage').getBoundingClientRect().top - 130)); /* below the sticky bars */ await q.waitForTimeout(300);
    const nb = await q.locator('.km-n[data-ch="p-newton"] .km-n__hit').boundingBox(); await q.touchscreen.tap(nb.x + 40, nb.y + nb.height / 2); await q.waitForFunction(() => !LS.__constellation.busy()); await q.waitForTimeout(300);
    const r = await q.evaluate(() => { const pr = document.querySelector('.km__panel').getBoundingClientRect(), st = document.querySelector('.km__stage').getBoundingClientRect(), n = document.querySelector('.km-n[data-ch="p-newton"]').getBoundingClientRect(); return { k: LS.__constellation.cam().k, sel: LS.__constellation.sel(), sheet: pr.left >= st.left && pr.right <= st.right && pr.bottom <= st.bottom + 1 && pr.top > st.top + st.height * 0.3, node: n.top >= st.top && n.bottom <= pr.top + 4, ow: document.documentElement.scrollWidth > innerWidth + 1 }; });
    assert.equal(r.sel.ch, 'p-newton'); assert.ok(r.k >= 0.84, 'readable zoom ' + r.k); assert.ok(r.sheet, 'bottom sheet'); assert.ok(r.node, 'selected chapter visible above the sheet'); assert.equal(r.ow, false); await q.context().close();
  });

  await t('Subject page: tabs swap only the panel, the indicator follows, arrow keys work, counts and the level filter are real for every tab', async () => {
    await go('world/biology', '.uv-tabs'); await p.waitForTimeout(500);
    const cv0 = await p.evaluate(() => { window.__hdr = document.querySelector('.uv-wh__bg'); return true; });
    for (const k of ['chapters', 'experiences', 'practice', 'cards', 'assess', 'overview']) { await p.click(`[data-wt="${k}"]`); await p.waitForTimeout(650);
      const r = await p.evaluate(k => { const b = document.querySelector(`[data-wt="${k}"]`), ink = document.querySelector('.uv-tabs__ink'); return { same: window.__hdr === document.querySelector('.uv-wh__bg'), sel: b.getAttribute('aria-selected'), dx: Math.abs(ink.getBoundingClientRect().left - b.getBoundingClientRect().left), dw: Math.abs(ink.getBoundingClientRect().width - b.getBoundingClientRect().width) }; }, k);
      assert.ok(r.same, 'header not rebuilt on ' + k); assert.equal(r.sel, 'true'); assert.ok(r.dx < 2 && r.dw < 2, `indicator under ${k}: ${r.dx}/${r.dw}`); }
    await p.focus('[data-wt="overview"]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200); assert.equal(await p.evaluate(() => LS.__world.tab()), 'chapters'); assert.equal(await p.evaluate(() => document.activeElement.dataset.wt), 'chapters');
    const all = await p.evaluate(() => document.querySelectorAll('.s34-journey > li').length); assert.equal(all, await p.evaluate(() => LS.curriculum.bySubject('biology').flatMap(c => c.chapters).length));
    await p.selectOption('[data-wl]', 'g11'); await p.waitForTimeout(400);
    const g11 = await p.evaluate(() => ({ shown: [...document.querySelectorAll('.s34-journey .s34-ch')].map(a => a.getAttribute('href').split('/').pop()).sort(), want: LS.curriculum.bySubject('biology').flatMap(c => c.chapters).filter(c => c.level === 'g11').map(c => c.id).sort(), n: document.querySelector('[data-wt="chapters"] .uv-tab__n').textContent }));
    assert.deepEqual(g11.shown, g11.want); assert.equal(+g11.n, g11.want.length);
    await p.click('[data-wt="experiences"]'); await p.waitForTimeout(400);
    const ex = await p.evaluate(() => { const want = new Set(LS.curriculum.bySubject('biology').flatMap(c => c.chapters).filter(c => c.level === 'g11').flatMap(c => c.items).filter(i => i.startsWith('x:')).map(i => i.slice(2))); return { shown: [...document.querySelectorAll('.s34-grid a')].map(a => a.getAttribute('href').split('/').pop()), want: [...want] }; });
    assert.ok(ex.shown.length && ex.shown.every(id => ex.want.includes(id)), 'experiences filtered by level');
    await go('chapter/b-cells', 'h1'); await go('world/biology', '.uv-tabs'); assert.equal(await p.evaluate(() => [LS.__world.tab(), LS.__world.level()].join()), 'experiences,g11', 'tab and level remembered');
    await p.selectOption('[data-wl]', 'all'); await p.click('[data-wt="overview"]'); await p.waitForTimeout(300);
    assert.match(await p.innerText('.s34-side'), /0 \/ 6\s*chapters explored/); assert.match(await p.innerText('.s34-next'), /A good place to start[\s\S]*Cells and transport/i);
  });

  await t('Subject page on a phone: the tab bar fits the screen and scrolls; every tab is reachable and the indicator follows', async () => {
    const q = await mk(devices['iPhone 13']); await q.goto(BASE + 'learn.html#/world/physics'); await q.waitForSelector('.uv-tabs'); await q.waitForTimeout(500);
    const r = await q.evaluate(() => { const w = document.querySelector('.uv-wbar').getBoundingClientRect(); return { right: w.right, iw: innerWidth, ow: document.documentElement.scrollWidth > innerWidth + 1 }; }); assert.ok(r.right <= r.iw && !r.ow, JSON.stringify(r));
    await q.tap('[data-wt="assess"]'); await q.waitForTimeout(700);
    const s = await q.evaluate(() => { const b = document.querySelector('[data-wt="assess"]').getBoundingClientRect(), ink = document.querySelector('.uv-tabs__ink').getBoundingClientRect(), t = document.querySelector('.uv-tabs').getBoundingClientRect(); return { tab: LS.__world.tab(), vis: b.left >= t.left - 1 && b.right <= t.right + 1, d: Math.abs(ink.left - b.left) }; });
    assert.equal(s.tab, 'assess'); assert.ok(s.vis, 'selected tab scrolled into view'); assert.ok(s.d < 2, 'indicator under it'); await q.context().close();
  });

  await t('Flashcards: a real 3D turn on the same element; clicks during the turn are ignored; the back face is not mirrored', async () => {
    await go('cards/p-waves/learn', '.fc3__card');
    const el0 = await p.evaluate(() => { window.__card = document.querySelector('.fc3__card'); return true; });
    await p.click('.fc3__card'); await p.waitForTimeout(230);
    const mid = await p.evaluate(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector('.fc3__card')).transform); return { a: m.a, same: window.__card === document.querySelector('.fc3__card') }; });
    assert.ok(mid.same, 'card element kept (no re-render)'); assert.ok(mid.a > -0.98 && mid.a < 0.98, 'mid-turn: cos(angle) = ' + mid.a.toFixed(2));
    await p.evaluate(() => { const c = document.querySelector('.fc3__card'); c.click(); c.click(); }); await p.waitForTimeout(700); /* two more clicks while the card is still turning */
    const end = await p.evaluate(() => { const c = new DOMMatrix(getComputedStyle(document.querySelector('.fc3__card')).transform), bk = new DOMMatrix(getComputedStyle(document.querySelector('.fc3__back')).transform), net = c.multiply(bk); return { f: LS.__fc.flipped(), a: c.a, net: net.a, bf: getComputedStyle(document.querySelector('.fc3__back')).backfaceVisibility }; });
    assert.equal(end.f, true, 'extra clicks during the turn did not flip it back'); assert.ok(end.a < -0.99, 'turned 180°'); assert.ok(end.net > 0.99, 'back face reads the right way round'); assert.equal(end.bf, 'hidden');
    assert.match(await p.innerText('.fc__actions'), /Known[\s\S]*Uncertain[\s\S]*Needs practice/);
    await p.keyboard.press('Space'); await p.waitForTimeout(700); assert.equal(await p.evaluate(() => LS.__fc.flipped()), false, 'Space turns it back');
  });

  await t('Flashcards: one keyboard listener after switching modes; next/previous slide; marks feed the Difficult mode; completion summary', async () => {
    await p.click('.fc__modes a[href$="/recall"]'); await p.waitForSelector('.fc3__card'); await p.click('.fc__modes a[href$="/learn"]'); await p.waitForSelector('.fc3__card'); await p.waitForTimeout(200);
    await p.focus('.fc3__card'); await p.keyboard.press('Space'); await p.waitForTimeout(700); assert.equal(await p.evaluate(() => LS.__fc.flipped()), true, 'flipped exactly once (no stacked listeners)');
    await p.keyboard.press('3'); await p.waitForTimeout(450); assert.equal(await p.evaluate(() => LS.__fc.pos()), 1);
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(450); assert.equal(await p.evaluate(() => LS.__fc.pos()), 0); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(450);
    const n = await p.evaluate(() => LS.__fc.n()); for (let i = 1; i < n; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(680); await p.keyboard.press('1'); await p.waitForTimeout(420); }
    const done = await p.innerText('.fc__done'); assert.match(done, /Session complete/); assert.match(done, /1\s*needs practice/); assert.match(done, /Revisit difficult cards · 1/);
    await p.click('.fc__done a[href$="/difficult"]'); await p.waitForSelector('.fc3__card'); assert.equal(await p.evaluate(() => LS.__fc.n()), 1);
  });

  await t('Flashcards: touch tap flips; reduced motion uses a cross-fade (no rotation); long answers are never clipped on a phone', async () => {
    const q = await mk(Object.assign({}, devices['iPhone 13'], { reducedMotion: 'reduce' })); await q.goto(BASE + 'learn.html#/cards/m-bayes/learn'); await q.waitForSelector('.fc3__card');
    await q.tap('.fc3__card'); await q.waitForTimeout(150);
    const r = await q.evaluate(() => ({ f: LS.__fc.flipped(), tr: getComputedStyle(document.querySelector('.fc3__card')).transform, op: getComputedStyle(document.querySelector('.fc3__back')).opacity }));
    assert.equal(r.f, true); assert.equal(r.tr, 'none', 'no rotation under reduced motion'); assert.equal(r.op, '1');
    const n = await q.evaluate(() => LS.__fc.n()); for (let i = 0; i < n; i++) { const c = await q.evaluate(() => { const card = document.querySelector('.fc3__card'), f = [...document.querySelectorAll('.fc3__face')]; return { clip: f.some(x => x.scrollHeight > x.clientHeight + 1 || x.getBoundingClientRect().height > card.getBoundingClientRect().height + 1), ow: document.documentElement.scrollWidth > innerWidth + 1 }; }); assert.ok(!c.clip && !c.ow, 'card ' + i); await q.evaluate(() => document.querySelector('[data-next]').click()); await q.waitForTimeout(60); }
    await q.context().close();
  });

  await t('Assessments: navigator keeps drafts, Previous works, finishing early asks first, the score matches the data, review lists every answer', async () => {
    await go('assess/m-probability', '.as__q'); const qs = await p.evaluate(() => LS.assess.byChapter('m-probability')); assert.ok(qs.length >= 3);
    const answer = async (q, right) => { if (q.kind === 'mcq') await p.check(`#lsView input[name="as"][value="${right ? q.answer : (q.answer + 1) % q.opts.length}"]`); else await p.fill('#lsView [data-num]', String(right ? q.opts.num : q.opts.num + 1000)); };
    await answer(qs[0], true); await p.click('.as__nav [data-q="1"]'); await p.click('.as__nav [data-q="0"]');
    if (qs[0].kind === 'mcq') assert.equal(await p.evaluate(a => document.querySelector(`input[name="as"][value="${a}"]`).checked, qs[0].answer), true, 'draft kept'); else assert.equal(await p.inputValue('[data-num]'), String(qs[0].opts.num));
    assert.equal(await p.$$eval('#lsView .as__fb, #lsView .is-right', x => x.length), 0, 'nothing revealed before checking');
    await p.click('[data-check]'); await p.click('[data-go]'); await answer(qs[1], false); await p.click('[data-check]'); assert.match(await p.innerText('.as__fb'), /Not quite/);
    await p.click('[data-prevq]'); assert.match(await p.innerText('.as__fb'), /Correct/);
    await p.click(`.as__nav [data-q="${qs.length - 1}"]`); await p.click('[data-go]'); assert.match(await p.innerText('.as__confirm'), new RegExp(`${qs.length - 2} questions? (are|is) not checked`));
    await p.click('[data-finish]'); const s = await p.innerText('.fc__done'); assert.match(s, new RegExp(`${Math.round(100 / qs.length)} %`)); assert.match(s, new RegExp(`1 / ${qs.length} correct`));
    await p.click('.as__rev summary'); assert.equal(await p.$$eval('.as__review li', x => x.length), qs.length);
    await p.click('[data-retry]'); for (const q of qs) { await answer(q, true); await p.click('[data-check]'); await p.click('[data-go]'); } assert.match(await p.innerText('.fc__done'), /100 %[\s\S]*Mastery reached/);
    assert.equal(await p.evaluate(() => LS.prog.status('m-probability')), 'mastered');
  });

  await t('Data integrity: curriculum validates; every assessment item is well-formed and gradable; no duplicate questions; every deck card has two sides', async () => {
    const r = await p.evaluate(() => { const C = LS.curriculum, errs = C.validate(); const bad = [];
      Object.keys(C.chapters).forEach(id => { const qs = LS.assess.byChapter(id) || [], seen = new Set();
        qs.forEach((q, i) => { if (seen.has(q.prompt)) bad.push(id + ' duplicate q ' + i); seen.add(q.prompt);
          if (q.kind === 'mcq') { if (!(q.answer >= 0 && q.answer < q.opts.length)) bad.push(id + ' q' + i + ' answer out of range'); if (!LS.assess.grade(q, q.answer)) bad.push(id + ' q' + i + ' key not accepted'); if (q.opts.some((o, k) => k !== q.answer && LS.assess.grade(q, k))) bad.push(id + ' q' + i + ' two right answers'); if (new Set(q.opts).size !== q.opts.length) bad.push(id + ' q' + i + ' duplicate options'); }
          else { if (typeof q.opts.num !== 'number' || !(q.opts.tol >= 0)) bad.push(id + ' q' + i + ' numeric spec'); if (!LS.assess.grade(q, String(q.opts.num))) bad.push(id + ' q' + i + ' key not accepted'); if (LS.assess.grade(q, String(q.opts.num + Math.max(1, Math.abs(q.opts.num)) ))) bad.push(id + ' q' + i + ' accepts a wrong value'); }
          if (!q.explain) bad.push(id + ' q' + i + ' no explanation'); });
        LS.decks.byChapter(id).forEach((c, i) => { if (!c.front.trim() || !c.back.trim()) bad.push(id + ' card ' + i); }); });
      return { errs, bad }; });
    assert.deepEqual(r.errs, []); assert.deepEqual(r.bad, []);
  });

  await t('no page errors', async () => { assert.deepEqual(errs, []); });
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
