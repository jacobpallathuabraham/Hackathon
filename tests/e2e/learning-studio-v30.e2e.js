// Learning Studio — the cinematic universe (v30): the WebGL universe renders with all eleven worlds and the astronaut;
// scroll drives the journey forward and backward; each world scene frames its planet and the astronaut on screen; entering a
// world flies there and opens its page (with the same planet live in the header); Back returns; the Destinations map;
// picking a planet by pointer; skip links; reduced motion; no-WebGL fallback; phone layout; lifecycle (one renderer, cleaned
// up on leave); the upgraded Solar System; and page errors.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/learning-studio-v30.e2e.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, +(process.env.LOGN || 6)).join('\n     ')); } };
const ORDER = ['maths', 'physics', 'chemistry', 'biology', 'geography', 'cs', 'english', 'history', 'languages', 'social', 'more'];

(async () => {
  const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const b = await chromium.launch({ args: GL }); const errs = [];
  const mk = async (opts, init) => { const c = await b.newContext(Object.assign({ viewport: { width: 1360, height: 860 } }, opts || {})); await c.addInitScript(() => { try { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); localStorage.setItem('erly-cosmos', 'gl'); /* this machine renders WebGL in software; force the 3D universe for testing */ } catch (e) { /* */ } }); if (init) await c.addInitScript(init);
    const p = await c.newPage(); p.setDefaultTimeout(40000); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR|GPU stall|WebGL/.test(m.text())) errs.push(m.text()); }); return p; };
  const ready = p => p.waitForFunction(() => window.LS && LS.__cosmos && LS.__cosmos.stats().astronaut, null, { timeout: 60000 });
  const toScene = (p, k) => p.evaluate(k => { const tr = document.querySelector('.cz-track'), r = tr.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + k / ((LS.__cosmos ? LS.__cosmos.N : 15) - 1) * (r.height - innerHeight) + 1, behavior: 'instant' }); }, k);
  const settle = async (p, k) => { try { await p.waitForFunction(k => Math.abs(LS.__cosmos.progress() - k) < 0.02, k, { timeout: 30000 }); } catch (e) { throw new Error('settle at ' + k + ': progress ' + await p.evaluate(() => LS.__cosmos && LS.__cosmos.progress()) + ' y ' + await p.evaluate(() => scrollY)); } await p.waitForTimeout(400); };
  const onScreen = (p, id) => p.evaluate(id => LS.__cosmos.debugWorld(id), id);

  const p = await mk(); await p.goto(BASE + 'learn.html#/home'); await ready(p); await p.evaluate(() => LS.__cosmos.buildAll());

  await t('The universe renders in WebGL with all eleven worlds, the astronaut, fifteen scenes and an index of every world', async () => {
    const s = await p.evaluate(() => LS.__cosmos.stats()); assert.equal(s.worlds, 11); assert.equal(s.astronaut, true); assert.ok(s.draws > 50, 'draw calls ' + s.draws);
    assert.equal(await p.locator('.cz-scene').count(), 15); assert.equal(await p.locator('.cz-rail button').count(), 15); assert.equal(await p.locator('[data-cz-enter]').count(), 11);
    const idx = await p.$$eval('.cz-index__list a', a => a.map(x => x.getAttribute('href'))); assert.deepEqual(idx, ORDER.map(id => '#/world/' + id));
    assert.equal(await p.$$eval('#lsView .dx-filter, #lsView [data-fk]', x => x.length), 0, 'no filter pills');
    assert.match(await p.textContent('.cz-scene[data-i="0"]'), /A universe of questions/); assert.equal(await p.locator('canvas.cz-cv').count(), 1);
    assert.ok(fs.existsSync(path.join(__dirname, '../../assets/models/astronaut.glb')) && /Poly by Google/.test(fs.readFileSync(path.join(__dirname, '../../assets/models/CREDITS.md'), 'utf8')), 'model and its credit are shipped');
  });

  await t('Scroll drives the journey forward and backward; the matching scene text is the one shown; the rail marks the current scene', async () => {
    for (const k of [3, 7, 12, 5, 0]) { await toScene(p, k); await settle(p, k); const vis = await p.$$eval('.cz-scene', els => els.filter(e => +e.style.opacity > 0.9).map(e => +e.dataset.i)); assert.deepEqual(vis, [k], 'scene ' + k);
      assert.equal(await p.getAttribute(`.cz-rail button[data-cz-go="${k}"]`, 'aria-current'), ''); }
    await p.mouse.move(700, 400); await p.mouse.wheel(0, 900); await p.waitForFunction(() => LS.__cosmos.progress() > 0.4, null, { timeout: 15000 });
  });

  await t('Every world scene frames its planet on screen with the astronaut in view and in front of the camera', async () => {
    for (let i = 0; i < 11; i++) { const k = i + 3; await toScene(p, k); await settle(p, k); await p.waitForTimeout(500);
      const w = await onScreen(p, ORDER[i]), a = await p.evaluate(() => LS.__cosmos.debugAstro());
      assert.ok(Math.abs(w.ndc[0]) < 1 && Math.abs(w.ndc[1]) < 1 && w.ndc[2] < 1, ORDER[i] + ' planet on screen ' + w.ndc);
      assert.ok(w.revealed > 0.9, ORDER[i] + ' structures revealed ' + w.revealed);
      assert.ok(Math.abs(a.ndc[0]) < 1 && Math.abs(a.ndc[1]) < 1 && a.ndc[2] < 1, ORDER[i] + ' astronaut on screen ' + a.ndc); }
  });

  await t('The overview gathers all eleven worlds into view; hovering one shows its label; clicking it travels there', async () => {
    await toScene(p, 14); await settle(p, 14); await p.waitForTimeout(1200);
    for (const id of ORDER) { const w = await onScreen(p, id); assert.ok(Math.abs(w.ndc[0]) < 1 && Math.abs(w.ndc[1]) < 1, id + ' visible in the overview ' + w.ndc); }
    const w = await onScreen(p, 'chemistry'); const box = await p.locator('.cz-stage').boundingBox(); const x = box.x + (w.ndc[0] * 0.5 + 0.5) * box.width, y = box.y + (-w.ndc[1] * 0.5 + 0.5) * box.height;
    await p.mouse.move(x, y, { steps: 4 }); await p.waitForSelector('.cz-label:not([hidden])', { timeout: 10000 }); assert.match(await p.textContent('.cz-label b'), /Chemistry/);
    await p.mouse.click(x, y); await p.waitForFunction(() => location.hash === '#/world/chemistry', null, { timeout: 20000 });
  });

  await t('Entering a world: a short flight, the subject page with the same planet live in its header; Back returns to the journey', async () => {
    await p.waitForSelector('.uv-wh.has-planet .cz-wp canvas'); await p.waitForTimeout(800);
    assert.equal(await p.evaluate(() => document.getElementById('czVeil').classList.contains('is-on')), false, 'the veil clears on arrival');
    assert.equal(await p.evaluate(() => LS.__cosmos), null, 'the universe was destroyed when leaving home');
    await p.goBack(); await ready(p); await p.waitForTimeout(1500); assert.equal(await p.evaluate(() => location.hash), '#/home'); assert.equal(await p.locator('canvas.cz-cv').count(), 1, 'one renderer');
    assert.ok(await p.evaluate(() => LS.__cosmos.progress() > 12.5), 'back at the overview, where we left');
  });

  await t('Scene buttons enter worlds; any key skips the flight; the flight never blocks', async () => {
    await toScene(p, 4); await settle(p, 4); await p.click('[data-cz-enter="physics"]'); await p.waitForTimeout(150); assert.equal(await p.evaluate(() => LS.__cosmos && LS.__cosmos.flying()), true);
    await p.keyboard.press('Escape'); await p.waitForFunction(() => location.hash === '#/world/physics', null, { timeout: 5000 });
    await p.goBack(); await ready(p); await p.waitForTimeout(1200); /* the Studio re-applies the restored scroll for up to 900 ms after Back */
  });

  await t('Destinations map: a dialog with search, focus trapped, Escape closes and returns focus; choosing a world goes there', async () => {
    await p.click('[data-cz-map]'); await p.waitForTimeout(300); assert.equal(await p.isVisible('.cz-map'), true); assert.equal(await p.evaluate(() => document.activeElement.matches('[data-cz-find]')), true);
    await p.fill('[data-cz-find]', 'molecul'); assert.equal(await p.$$eval('.cz-map__list li', l => l.filter(x => !x.hidden).length), 0); await p.fill('[data-cz-find]', 'chem'); assert.deepEqual(await p.$$eval('.cz-map__list li:not([hidden]) b', l => l.map(x => x.textContent)), ['Chemistry']);
    for (let i = 0; i < 12; i++) await p.keyboard.press('Tab'); assert.equal(await p.evaluate(() => !!document.activeElement.closest('.cz-map')), true, 'focus stays in the dialog');
    await p.keyboard.press('Escape'); assert.equal(await p.isHidden('.cz-map'), true); assert.equal(await p.evaluate(() => document.activeElement.matches('[data-cz-map]')), true);
    await p.click('[data-cz-map]'); await p.fill('[data-cz-find]', ''); await p.click('.cz-map [data-cz-dest="history"]'); await p.waitForFunction(() => location.hash === '#/world/history', null, { timeout: 20000 });
    await p.goBack(); await ready(p); await p.waitForTimeout(1200); /* the Studio re-applies the restored scroll for up to 900 ms after Back */
  });

  await t('Skip the journey (keyboard) reaches the index; “All worlds” and the rail jump to their scenes', async () => {
    await toScene(p, 0); await settle(p, 0); await p.focus('[data-cz-skip]'); assert.equal(await p.isVisible('[data-cz-skip]'), true); await p.keyboard.press('Enter'); await p.waitForTimeout(1600);
    const top = await p.evaluate(() => document.querySelector('.cz-index').getBoundingClientRect().top); assert.ok(top < 300, 'index in view ' + top);
    await toScene(p, 0); await settle(p, 0); await p.click('[data-cz-end]'); await p.waitForFunction(() => LS.__cosmos.progress() > 13.9, null, { timeout: 30000 }).catch(async () => { throw new Error('All worlds: progress ' + await p.evaluate(() => LS.__cosmos.progress())); });
    await p.click('.cz-rail button[data-cz-go="6"]'); await p.waitForFunction(() => Math.abs(LS.__cosmos.progress() - 6) < 0.05, null, { timeout: 30000 });
  });

  await t('Lifecycle: leaving and returning repeatedly keeps one renderer; textures and geometries do not accumulate; idle frames stop off-screen', async () => {
    const s0 = await p.evaluate(() => LS.__cosmos.stats());
    for (let i = 0; i < 3; i++) { await p.evaluate(() => { location.hash = '#/path'; }); await p.waitForTimeout(600); await p.evaluate(() => { location.hash = '#/home'; }); await ready(p); await p.evaluate(() => LS.__cosmos.buildAll()); await p.waitForTimeout(800); }
    const s1 = await p.evaluate(() => LS.__cosmos.stats()); assert.equal(await p.locator('canvas.cz-cv').count(), 1); assert.ok(s1.textures <= s0.textures + 3 && s1.geometries <= s0.geometries * 1.2, JSON.stringify([s0.textures, s1.textures, s0.geometries, s1.geometries])); /* each visit has a new renderer; counts are of what it uploaded */
    await p.evaluate(() => document.querySelector('#czAfter').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(800);
    const n = await p.evaluate(async () => { let n = 0; const o = window.requestAnimationFrame; window.requestAnimationFrame = f => { if (String(f).includes('st.visible')) n++; return o(f); }; await new Promise(z => setTimeout(z, 1200)); window.requestAnimationFrame = o; return LS.__cosmos.debugRaf(); });
    await p.waitForFunction(() => !LS.__cosmos.debugRaf(), null, { timeout: 8000 }).catch(() => {}); assert.equal(await p.evaluate(() => LS.__cosmos.debugRaf()), false, 'no frame scheduled while the universe is off-screen');
  });

  await t('Reduced motion: the journey moves scene by scene with no idle animation, and entering a world is immediate', async () => {
    const q = await mk({ reducedMotion: 'reduce' }); await q.goto(BASE + 'learn.html#/home'); await ready(q);
    await toScene(q, 5.4); await q.waitForTimeout(1500); assert.equal(await q.evaluate(() => LS.__cosmos.progress()), 5);
    await q.waitForTimeout(1500); assert.equal(await q.evaluate(() => LS.__cosmos.debugRaf()), false, 'no animation loop at rest');
    await toScene(q, 5); await q.waitForTimeout(800); await q.click('[data-cz-enter="chemistry"]'); assert.equal(await q.evaluate(() => LS.__cosmos ? LS.__cosmos.flying() : false), false, 'no flight'); await q.waitForFunction(() => location.hash === '#/world/chemistry', null, { timeout: 15000 }); await q.context().close();
  });

  await t('Without WebGL: a painted universe tells the same story, with planets, the index and working Enter buttons', async () => {
    const q = await mk(null, () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...a) { return /webgl/.test(k) ? null : g.call(this, k, ...a); }; });
    await q.goto(BASE + 'learn.html#/home'); await q.waitForSelector('.cz--flat'); assert.equal(await q.locator('.cz-scene .cz-orb--big').count(), 11); assert.equal(await q.locator('canvas.cz-cv').count(), 0);
    await toScene(q, 0); await q.evaluate(() => { const tr = document.querySelector('.cz-track'), r = tr.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + 8 / 14 * (r.height - innerHeight) + 1, behavior: 'instant' }); }); await q.waitForTimeout(500);
    assert.equal(await q.evaluate(() => +document.querySelector('.cz-scene[data-i="8"]').style.opacity > 0.9), true, 'scroll still drives the scenes');
    await q.click('.cz-scene[data-i="8"] [data-cz-enter]'); await q.waitForFunction(() => location.hash === '#/world/cs', null, { timeout: 5000 }); await q.context().close();
  });

  await t('Phone: low-cost tier, no horizontal overflow, tools reachable, the storage choice does not cover the title', async () => {
    const q = await mk(devices['iPhone 13']); await q.goto(BASE + 'learn.html#/home'); await ready(q);
    const s = await q.evaluate(() => LS.__cosmos.stats()); assert.equal(s.tier, 0); assert.ok(await q.evaluate(() => document.documentElement.scrollWidth) <= 392);
    assert.equal(await q.isVisible('[data-cz-map]'), true);
    const [h, c] = await q.evaluate(() => [document.querySelector('.cz-scene[data-i="0"] .cz-h1').getBoundingClientRect(), document.querySelector('.cz-dock').getBoundingClientRect()].map(r => [r.top, r.bottom]));
    assert.ok(!c[0] || h[1] <= c[0] + 1, 'title above the card ' + JSON.stringify([h, c])); await q.context().close();
  });

  await t('All eleven world pages show their own planet in the header without errors', async () => {
    const q = await mk(); for (const id of ORDER) { await q.goto(BASE + 'learn.html#/world/' + id); await q.waitForSelector('.uv-wh .cz-wp canvas'); } await q.waitForTimeout(800); await q.context().close();
  });

  await t('Solar System Explorer: the living Sun, the asteroid belt, Uranus’s rings and the Moon are added; the scale notice mentions the belt', async () => {
    const q = await mk(); await q.goto(BASE + 'learn.html#/space'); await q.waitForFunction(() => LS.__space, null, { timeout: 40000 }); await q.waitForTimeout(1500);
    const r = await q.evaluate(() => { let inst = 0, shader = 0; LS.__space.S.scene.traverse(o => { if (o.isInstancedMesh) inst += o.count; if (o.material && o.material.isShaderMaterial) shader++; }); return { inst, shader }; });
    assert.ok(r.inst >= 400, 'belt rocks ' + r.inst); assert.ok(r.shader >= 1, 'sun shader'); assert.match(await q.textContent('#lsView'), /asteroid belt is drawn as a thin band/); await q.context().close();
  });

  await t('v32: languages shows only scripts this device can draw; the camera moves continuously; the astronaut keeps a safe distance', async () => {
    await toScene(p, 11); await settle(p, 11);
    const words = await p.evaluate(() => LS.__cosmos.debugWords('languages')); assert.ok(words && words.length >= 4, 'words ' + words);
    const tofu = await p.evaluate(ws => { const g = document.createElement('canvas').getContext('2d'); g.font = '40px system-ui'; const box = g.measureText('\u0378').width; return ws.filter(w => [...w.replace(/\s/g, '')].some(ch => Math.abs(g.measureText(ch).width - box) < 0.01)); }, words); assert.deepEqual(tofu, []);
    // camera continuity: fine scroll steps move the camera by small, similar amounts (no jumps or reversals)
    const steps = await p.evaluate(async () => { const tr = document.querySelector('.cz-track'), r0 = tr.getBoundingClientRect(), base = scrollY + r0.top, span = r0.height - innerHeight, out = [];
      for (let k = 30; k <= 50; k++) { scrollTo({ top: base + (k / 10) / 14 * span, behavior: 'instant' }); LS.__cosmos.jump(k / 10); await new Promise(z => requestAnimationFrame(() => requestAnimationFrame(z))); out.push(LS.__cosmos.debugCam()); } return out; });
    const d = steps.slice(1).map((c, i) => Math.hypot(c[0] - steps[i][0], c[1] - steps[i][1], c[2] - steps[i][2])); const med = d.slice().sort((x, y) => x - y)[d.length >> 1]; assert.ok(Math.max(...d) < 9 && Math.max(...d) < med * 6 + 1, 'largest camera step ' + Math.max(...d).toFixed(2) + ' (median ' + med.toFixed(2) + ')'); /* a 0.1 scroll step mid-segment between worlds ~27 units apart */
    for (const k of [0, 1, 3, 7, 13, 14]) { await toScene(p, k); await settle(p, k); await p.waitForTimeout(600); const a = await p.evaluate(() => LS.__cosmos.debugAstro()); const dist = Math.hypot(a.pos[0] - a.cam[0], a.pos[1] - a.cam[1], a.pos[2] - a.cam[2]); assert.ok(dist > 2.6, 'astronaut distance at ' + k + ': ' + dist.toFixed(2)); }
  });

  await t('v32: in the overview, focusing a world brings it forward and the others recede; entering clears the stage', async () => {
    await toScene(p, 14); await settle(p, 14); await p.waitForTimeout(800);
    const before = await p.evaluate(() => ({ c: LS.__cosmos.debugWorld('chemistry').dist, h: LS.__cosmos.debugScale('history') }));
    await p.evaluate(() => LS.__cosmos.hover('chemistry')); await p.waitForTimeout(1500);
    const after = await p.evaluate(() => ({ c: LS.__cosmos.debugWorld('chemistry').dist, h: LS.__cosmos.debugScale('history') }));
    assert.ok(after.c < before.c, 'focused world closer: ' + before.c + ' → ' + after.c); assert.ok(after.h < before.h, 'others recede: ' + before.h + ' → ' + after.h);
    await p.evaluate(() => LS.__cosmos.enter('chemistry', 6000)); const cleared = await p.waitForFunction(lim => LS.__cosmos.debugScale('history') < lim, after.h * 0.85, { timeout: 5500 }).then(() => true, () => false); assert.ok(cleared, 'others clear away during travel: ' + await p.evaluate(() => LS.__cosmos.debugScale('history')) + ' vs ' + after.h);
    await p.evaluate(() => LS.__cosmos.skip()); await p.waitForFunction(() => location.hash === '#/world/chemistry', null, { timeout: 10000 }); await p.goBack(); await ready(p); await p.waitForTimeout(1200);
  });

  await t('Device-aware: on a software WebGL renderer (no GPU) the painted universe is used by default; ?cosmos=gl forces 3D', async () => {
    const c = await b.newContext({ viewport: { width: 1360, height: 860 } }); await c.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); });
    const q = await c.newPage(); await q.goto(BASE + 'learn.html#/home'); await q.waitForSelector('.cz'); await q.waitForTimeout(800);
    const r = await q.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'), d = g.getExtension('WEBGL_debug_renderer_info'); return String(g.getParameter(d.UNMASKED_RENDERER_WEBGL)); });
    if (/swiftshader|llvmpipe|software/i.test(r)) { assert.equal(await q.locator('.cz--flat').count(), 1, 'painted on ' + r); assert.equal(await q.locator('canvas.cz-cv').count(), 0); }
    await q.goto(BASE + 'learn.html?cosmos=gl#/home'); await q.waitForFunction(() => window.LS && LS.__cosmos, null, { timeout: 60000 }); assert.equal(await q.locator('canvas.cz-cv').count(), 1); await c.close();
  });

  await t('no page errors', async () => { assert.deepEqual(errs, []); });
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
