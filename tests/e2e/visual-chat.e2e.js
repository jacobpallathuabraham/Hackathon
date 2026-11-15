// v18 acceptance: visual-first NORMAL Noor chat. Every question is typed into the ordinary chat box — the Visual Lab is
// never opened first. Checks that the right live model appears INSIDE the reply, that its numbers are right, that the
// controls really change it, that follow-ups edit the same model, and that plain questions get no forced visual.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/visual-chat.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + (e.message || e).split('\n')[0].slice(0, 240) + ' @' + ((e.stack || '').match(/e2e.js:(\d+)/) || [])[1]]); } };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  const make = async (opts, init) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, opts || {}));
    await ctx.addInitScript(() => sessionStorage.setItem('acubins-role', 'student'));
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); await p.click('.cmp-launch'); await p.waitForTimeout(700);
    return p;
  };
  const ask = async (p, q) => { const n = await p.locator('.cmsg--ai').count(); await p.fill('#cmpText', q); await p.press('#cmpText', 'Enter'); await p.waitForFunction(n => document.querySelectorAll('.cmsg--ai').length > n && !document.querySelector('.cmsg.is-writing') && !document.querySelector('.cmsg--typing'), n, { timeout: 20000 }); await p.waitForTimeout(500); return p.evaluate(() => [...document.querySelectorAll('.cmsg--ai')].pop().innerText); };
  const live = p => p.evaluate(() => ({ id: ERLY_LAB.current() ? ERLY_LAB.current().engine.id : null, inline: ERLY_LAB.isInline(), inLog: !!document.querySelector('#cmpLog .lab.lab--inline'), state: ERLY_LAB.state() }));
  const slide = (p, key, v) => p.evaluate(([k, v]) => { const i = document.querySelector(`#cmpLog .lab__side input[data-key="${k}"]`); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, [key, v]);
  const p = await make();
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('lab-on')), false);

  await check('1 quadratic explained with a live graph in the reply; sliders move the roots', async () => {
    const r = await ask(p, 'Explain y = x^2 - 6x + 5 and how its graph works');
    const L = await live(p); assert.equal(L.id, 'graph'); assert.ok(L.inline && L.inLog, 'inside the chat'); assert.match(r, /Noor Lab/);
    const roots = L.state.keyPoints.filter(k => k.type === 'root').map(k => +k.x.toFixed(6)).sort((a, c) => a - c); assert.deepEqual(roots, [1, 5]);
  });
  await check('2 projectile motion: animated model + graphs; a follow-up changes the same model', async () => {
    await ask(p, 'Explain projectile motion.'); let L = await live(p); assert.equal(L.id, 'projectile'); assert.ok(L.inLog);
    assert.ok(await p.locator('#cmpLog .lab .lab-graph canvas').count() >= 1, 'graph panel');
    await ask(p, 'make the angle 30 degrees'); L = await live(p); assert.equal(L.id, 'projectile', 'same model edited'); assert.equal(L.state.params ? L.state.params.angle : (await p.evaluate(() => ERLY_LAB.current().inst.get('angle'))), 30);
  });
  await check('3 first principles: secant → tangent, h slider drives the slope to f′', async () => {
    const r = await ask(p, 'Explain differentiation from first principles for f(x) = x^2'); let L = await live(p); assert.equal(L.id, 'secant'); assert.match(r, /2\*x|2x/);
    await p.evaluate(() => { const a = ERLY_LAB.current().inst.api; a.S.shrink = false; }); await slide(p, 'h', 1); L = await live(p); near(L.state.secant, 3, 1e-9, 'h = 1 → slope 3');
    await slide(p, 'h', 0.001); L = await live(p); near(L.state.secant, 2.001, 1e-6, 'h = 0.001 → slope 2.001'); near(L.state.derivative, 2, 1e-6, 'tangent slope 2');
  });
  await check('4 pulley: diagram with free-body forces and the right a and T', async () => {
    const r = await ask(p, 'How does a pulley system work?'); const L = await live(p); assert.equal(L.id, 'atwood');
    const a = (3 - 2) * 9.81 / 5; near(L.state.a, a, 1e-9, 'a'); near(L.state.T1, 2 * (9.81 + a), 1e-9, 'T'); assert.match(r, /m₁: T₁ − m₁g = m₁a/);
  });
  await check('5 electric fields: field model in the chat', async () => { await ask(p, 'Show me how electric fields work.'); const L = await live(p); assert.ok(['efield', 'radial'].includes(L.id), L.id); assert.ok(L.inLog); });
  await check('6 wave interference: two waves, frequency control changes the beats', async () => {
    await ask(p, 'Can you show what happens when I change the frequency of two waves that interfere with each other?'); let L = await live(p); assert.equal(L.id, 'superpose'); assert.equal(L.state.two, true);
    await slide(p, 'f2', 1.5); L = await live(p); near(L.state.beat, 0.5, 1e-9, 'beat = |f1 − f2|');
  });
  await check('7 molecular structure: rotatable 3D ammonia with its bond angle', async () => {
    const r = await ask(p, 'Show me the molecular geometry of ammonia and explain why it has that shape'); let L = await live(p); assert.equal(L.id, 'molecule'); assert.match(r, /trigonal pyramidal/); near(L.state.angle, 106.7, 0.05, 'H–N–H angle');
    await p.evaluate(() => document.querySelector('#cmpLog .lab canvas.lab-gl').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
    const box = await p.locator('#cmpLog .lab canvas.lab-gl').boundingBox(); const before = L.state.camera; await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 30, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(300);
    L = await live(p); assert.notDeepEqual(L.state.camera, before, 'dragging rotates the camera');
  });
  await check('8 3D surface + contours + gradient vectors (university)', async () => {
    await ask(p, 'Visualise the gradient of f(x,y) = x^2 + y^2'); let L = await live(p); assert.equal(L.id, 'gradient'); near(L.state.grad[0], 2 * L.state.x0, 1e-6, '∂f/∂x = 2x'); near(L.state.grad[1], 2 * L.state.y0, 1e-6, '∂f/∂y = 2y');
    assert.equal(await p.locator('#cmpLog .lab .lab-graph canvas').count(), 1, 'contour panel');
  });
  await check('9 JEE-style multi-concept problem gets its own model', async () => {
    await ask(p, 'A 2 kg block on a rough horizontal table (coefficient of friction 0.2) is connected by a light string over a pulley of mass 1 kg and radius 10 cm to a hanging 3 kg mass. Find the acceleration.');
    const L = await live(p); assert.equal(L.id, 'rigid'); near(L.state.res.a, (3 - 0.4) * 9.81 / 5.5, 1e-9, 'a');
  });
  await check('10 an unfamiliar wording generalises to the right model', async () => {
    await ask(p, 'What happens to the potential if I double my distance from a point charge?'); const L = await live(p); assert.equal(L.id, 'radial');
    await ask(p, 'double the distance'); const L2 = await live(p); near(L2.state.V, L.state.V / 2, 1e-9, 'V halves');
  });
  await check('11 a new question freezes the old card (snapshot) and Reopen restores it exactly', async () => {
    assert.ok(await p.locator('#cmpLog .cvis__snap').count() >= 5, 'earlier models kept as snapshots');
    const snap = p.locator('#cmpLog .cvis__snap').filter({ hasText: /Waves and superposition/ }).first();
    await snap.evaluate(e => e.scrollIntoView({ block: 'center' })); await snap.locator('[data-reopen]').click(); await p.waitForTimeout(900); const L = await live(p); assert.equal(L.id, 'superpose'); near(L.state.beat, 0.5, 1e-9, 'restored with its changed f₂');
  });
  await check('12 a plain factual question gets no forced visual', async () => {
    const n = await p.locator('#cmpLog .cvis').count(); await ask(p, 'What is the capital of France?'); assert.equal(await p.locator('#cmpLog .cvis').count(), n, 'no new visual card');
    const n2 = await p.locator('#cmpLog .cvis').count(); await ask(p, 'thanks, that helps'); assert.equal(await p.locator('#cmpLog .cvis').count(), n2);
  });
  await check('13 Visual Lab shows the same model and state; Back to chat docks it', async () => {
    await ask(p, 'Show me the intersection of a plane and a sphere'); const a = await live(p);
    await p.evaluate(() => document.querySelector('#cmpLog .lab [data-lab="expand"]').scrollIntoView({ block: 'center' })); await p.click('#cmpLog .lab [data-lab="expand"]'); await p.waitForTimeout(400);
    const b2 = await live(p); assert.equal(b2.inline, false); assert.equal(b2.id, a.id); near(b2.state.circleR, a.state.circleR, 1e-12, 'same state');
    await p.click('.lab [data-lab="dock"]'); await p.waitForTimeout(300); assert.equal((await live(p)).inLog, true);
  });
  await check('curated visuals also appear inside the chat (heart, eigenvectors) with an explanation', async () => {
    let r = await ask(p, 'Show me the structure of the human heart.'); assert.equal(await p.locator('#cmpLog .vz.vz--inline').count() >= 1, true); assert.match(r, /heart/i);
    r = await ask(p, 'Help me understand eigenvectors.'); assert.ok(await p.locator('#cmpLog .vz.vz--inline').count() >= 1);
  });
  await check('invalid expressions and unsupported models fail honestly (no crash, no fake)', async () => {
    const r = await ask(p, 'graph y = (x + '); assert.ok(r.length > 0);
    const r2 = await ask(p, 'Show the mechanism of nitration of benzene with curved arrows'); assert.ok((await live(p)).id !== 'mechanism' || /don’t have an accurate/.test(r2));
  });
  await check('keyboard: a model slider is reachable and arrow keys change the model', async () => {
    await ask(p, 'Show why sin^2 θ + cos^2 θ = 1'); const s = p.locator('#cmpLog .lab__side input[data-key="deg"]'); await s.focus(); const v0 = await s.inputValue(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
    const L = await live(p); assert.equal(+(await s.inputValue()), +v0 + 2); near(L.state.identity, 1, 1e-12, 'identity');
  });
  await check('with an AI model, the explanation is written from the live model (its numbers are sent with the question)', async () => {
    const q = await make({}, () => { localStorage.setItem('erly-ai-v1', JSON.stringify({ tier: 'online', chosen: Date.now() })); Object.defineProperty(window, 'ERLY_AI_CONFIG', { configurable: true, get: () => ({ endpoint: '', limits: { aiPerDay: 999, aiPerMinute: 999 }, online: { name: 'Test AI', site: 'test', model: 'x', url: 'https://ai.test/v1/chat/completions', get: '' } }), set() {} }); });
    let body = null; await q.route('https://ai.test/**', async route => { body = route.request().postData(); await route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"choices":[{"delta":{"content":"The range is 40.775 m because…"}}]}\n\ndata: [DONE]\n\n' }); });
    const r = await ask(q, 'Explain projectile motion.'); assert.equal((await live(q)).id, 'projectile'); assert.match(r, /40\.775/);
    assert.ok(body && /live Noor Lab model/.test(body) && /Computed state/.test(body) && /40\.77/.test(body), 'model state reached the AI');
    await q.context().close();
  });
  await check('phone and dark mode: the inline model fits and follows the theme', async () => {
    const q = await make({ ...devices['iPhone 13'] }); await ask(q, 'Explain supply and demand.');
    const r = await q.evaluate(() => { const l = document.querySelector('#cmpLog .lab'); const b2 = l.getBoundingClientRect(); return [b2.width <= innerWidth + 1, document.documentElement.scrollWidth <= innerWidth + 1, l.querySelector('.lab__canvas').getBoundingClientRect().height]; });
    assert.ok(r[0] && r[1], 'no overflow'); assert.ok(r[2] > 200, 'stage height ' + r[2]);
    await q.evaluate(() => { document.documentElement.dataset.theme = 'dark'; ERLY_LAB.current().inst.redraw(); }); await q.waitForTimeout(200);
    const dark = await q.evaluate(() => { const c = document.querySelector('#cmpLog .lab__canvas canvas'), g = c.getContext('2d'); let n = 0, k = 0; for (let i = 1; i < 10; i++) for (let j = 1; j < 10; j++) { const d = g.getImageData(Math.round(c.width * i / 10), Math.round(c.height * j / 10), 1, 1).data; k++; if (d[0] + d[1] + d[2] < 150) n++; } return n / k; }); assert.ok(dark > 0.6, 'dark canvas background (share of dark samples ' + dark + ')');
    await q.context().close();
  });

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  const fail = results.filter(r => r[1] !== 'PASS').length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail || errors.length ? 1 : 0);
})();
