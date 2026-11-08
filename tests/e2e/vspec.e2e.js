// Dynamic visual engine (visual-spec.js): compiler safety, validation, real computation,
// the local planner across university subjects, every renderer, an AI-planned spec for a
// topic with no built-in visual, and the consent-first flow inside the real companion.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/vspec.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver|Failed to load resource/.test(m.text())) errors.push(m.text()); }); };
  const p = await browser.newPage({ viewport: { width: 1100, height: 760 } }); watch(p);
  await p.goto(`${BASE}tests/fixtures/vspec.html`); await p.waitForFunction(() => window.fixtureReady);

  /* ---------- 1. the expression compiler only does arithmetic ---------- */
  const comp = await p.evaluate(() => {
    const C = ERLY.vspec.compile, ok = (e, env) => C(e, Object.keys(env))(env);
    const bad = ['alert(1)', 'window', 'constructor', 'x.constructor', 'this', 'fetch("x")', 'x;y', '`x`', 'a=1', '[1]', 'x => x', 'document.cookie', 'Function("return 1")()'];
    return { vals: [ok('2x^2 + 3x - 1', { x: 2 }), ok('sin(pi/2) + sqrt(16)', { x: 0 }), ok('(x+1)(x-1)', { x: 3 }), ok('a*exp(-k*x)', { x: 0, a: 5, k: 1 }), ok('max(x, 2)', { x: 1 }), ok('-x^2', { x: 3 })],
      rejected: bad.filter(e => { try { C(e, ['x']); return false; } catch (err) { return true; } }).length, total: bad.length };
  });
  assert.deepEqual(comp.vals, [13, 5, 8, 5, 2, -9], 'compiler evaluates maths correctly (incl. implicit multiplication, -x² = −9)');
  assert.equal(comp.rejected, comp.total, 'compiler rejects every non-arithmetic input');

  /* ---------- 2. validation sanitises and rejects ---------- */
  const val = await p.evaluate(() => {
    const V = ERLY.vspec.validate;
    return {
      unknownKind: V({ kind: 'html', params: {} }).ok,
      badExpr: V({ kind: 'plot2d', params: { fns: [{ expr: 'alert(document.cookie)' }] } }).ok,
      undeclaredVar: V({ kind: 'plot2d', params: { fns: [{ expr: 'k*x' }] } }).ok,
      reservedVar: V({ kind: 'plot2d', params: { fns: [{ expr: 'x' }] }, vars: [{ name: 'sin', min: 0, max: 1 }] }).spec.vars.length,
      label: V({ kind: 'plot2d', title: '<img src=x onerror=alert(1)>Graph', params: { fns: [{ expr: 'x' }] } }).spec.title,
      edges: V({ kind: 'diagram', params: { nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'zzz' }, { from: 'b', to: 'b' }] } }).spec.params.edges.length,
      clamp: V({ kind: 'plot2d', params: { fns: [{ expr: 'a*x' }] }, vars: [{ name: 'a', min: 0, max: 10, value: 999 }], steps: [{ title: 'S', set: { a: -50, evil: 3 } }] }).spec,
      json: V('{"kind":"matrix2d","params":{}}').ok, notJson: V('{nope').ok
    };
  });
  assert.equal(val.unknownKind, false); assert.equal(val.badExpr, false); assert.equal(val.undeclaredVar, false);
  assert.equal(val.reservedVar, 0, 'a variable may not shadow a maths function');
  assert.ok(!/[<>]/.test(val.label), 'markup characters are stripped from labels');
  assert.equal(val.edges, 1, 'edges to unknown nodes and self-loops are dropped');
  assert.equal(val.clamp.vars[0].value, 10, 'slider value clamped to its range'); assert.deepEqual(val.clamp.steps[0].set, { a: 0 }, 'step settings clamped; unknown variables dropped');
  assert.equal(val.json, true); assert.equal(val.notJson, false);

  /* ---------- 3. the engineering maths is real ---------- */
  const eng = await p.evaluate(() => {
    const t = ERLY.vspec.truss({ type: 'pratt', panels: 6, span: 24, height: 4 }, 120, 0.5);
    const w = ERLY.vspec.truss({ type: 'warren', panels: 5, span: 20, height: 4 }, 100, 0.6);
    const b = ERLY.vspec.beamCalc({ support: 'simple', span: 10 }, { P: 20, a: 4, w: 0 });
    const c = ERLY.vspec.beamCalc({ support: 'cantilever', span: 5 }, { P: 10, a: 5, w: 0 });
    const bottomMid = t.M.findIndex(([p, q]) => (p === 2 && q === 3) || (p === 3 && q === 2));
    const topMid = t.M.findIndex(([p, q]) => t.J[p][1] > 0 && t.J[q][1] > 0 && Math.abs((t.J[p][0] + t.J[q][0]) / 2 - 12) < 4.1);
    return { RA: t.R.Ay, RB: t.R.By, Ax: t.R.Ax, bottom: t.F[bottomMid], top: t.F[topMid], wSum: w.R.Ay + w.R.By, beamRA: b.RA, beamRB: b.RB, beamM: Math.max(...b.M), cantM: c.MA, cantEndY: c.y[c.y.length - 1] };
  });
  // dead load 0.1·P per joint: 7 bottom joints, ends half → 6 × 12 = 72 kN; total = 120 + 72
  assert.ok(Math.abs(eng.RA - 96) < 1e-6 && Math.abs(eng.RB - 96) < 1e-6, `symmetric truss reactions = half the total load each (${eng.RA}, ${eng.RB})`);
  assert.ok(Math.abs(eng.Ax) < 1e-9, 'no horizontal reaction under vertical loads');
  assert.ok(eng.bottom > 0, 'bottom chord at midspan is in tension'); assert.ok(eng.top < 0, 'top chord at midspan is in compression');
  assert.ok(Math.abs(eng.wSum - (100 + 0.1 * 100 * 5)) < 1e-6, 'Warren truss reactions balance the total load');
  assert.ok(Math.abs(eng.beamRA - 12) < 1e-9 && Math.abs(eng.beamRB - 8) < 1e-9, 'beam reactions R_A = P(L−a)/L, R_B = Pa/L');
  assert.ok(Math.abs(eng.beamM - 48) < 0.5, 'max bending moment = R_A·a = 48 kN·m (' + eng.beamM + ')');
  assert.ok(Math.abs(eng.cantM + 50) < 1e-9, 'cantilever fixed-end moment = −P·L');
  assert.ok(eng.cantEndY < 0, 'cantilever tip deflects downward');

  /* ---------- 4. the planner across university subjects ---------- */
  const QS = [
    ['Explain how a neural network learns', 'network'], ['How does a Pratt truss bridge carry load?', 'truss3d'], ['Plot y = sin(x)/x', 'plot2d'],
    ['Explain supply and demand and market equilibrium', 'plot2d'], ['How does merge sort work?', 'algorithm'], ['What is the electric field of a dipole?', 'field2d'],
    ['Show the linear transformation [[2,1],[0,1]] and its eigenvectors', 'matrix2d'], ['Explain cellular respiration and the Krebs cycle', 'diagram'], ['How does double slit interference work?', 'waves'],
    ['How does gradient descent minimise a loss function?', 'surface3d'], ['Find the bending moment in a cantilever beam', 'beam'], ['How does the heart pump blood?', 'scene'],
    ['Explain the derivative of x^3 - 3x', 'plot2d'], ['What is a normal distribution?', 'plot2d'], ['How is a SQL query executed?', 'diagram'], ['Explain binary search', 'algorithm'],
    ['Show me z = sin(x)*cos(y)', 'surface3d'], ['Explain recursion with fibonacci', 'algorithm'], ['How does compound interest work?', 'plot2d'], ['Explain the TCP three-way handshake', 'diagram']
  ];
  const planned = await p.evaluate(qs => qs.map(([q]) => { const s = ERLY.vspec.plan(q); return s ? s.kind + (s.kind === 'plot2d' ? '|' + s.params.fns[0].expr : '') : null; }), QS);
  QS.forEach(([q, k], i) => assert.equal((planned[i] || '').split('|')[0], k, 'planner: ' + q));
  assert.equal(planned[2].split('|')[1], 'sin(x)/x', 'the function in the question is the one plotted');
  assert.equal(planned[12].split('|')[1], 'x^3 - 3x', 'derivative of the student’s own function');
  assert.equal(await p.evaluate(() => ERLY.vspec.plan('What is the capital of France?')), null, 'no visual offered for a simple fact');

  /* ---------- 5. every renderer draws, interacts and reports real values ---------- */
  const shots = {};
  for (const [q, k] of QS) {
    const kind = await p.evaluate(q => window.openQ(q), q);
    assert.equal(kind, k, 'opens: ' + q);
    await p.waitForTimeout(k === 'truss3d' || k === 'surface3d' ? 900 : 300);
    // the stage shows something (a canvas with pixels, or an SVG with nodes)
    const drawn = await p.evaluate(() => {
      const st = document.querySelector('.vz__stage'); const c = st.querySelector('canvas'); const svg = st.querySelector('svg');
      if (svg) return svg.querySelectorAll('g, path, rect').length > 3;
      if (!c) return false;
      try { const g = c.getContext('2d'); if (g) { const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 52) if (d[i] !== d[0] || d[i + 1] !== d[1]) n++; return n > 20; } } catch (e) { /* webgl */ }
      return c.width > 0;
    });
    assert.ok(drawn, 'renders: ' + q);
    await p.click('[data-v="next"]').catch(() => {});
    shots[k] = shots[k] || q;
  }
  const status = () => p.evaluate(() => v.el.querySelector('.vz__status').textContent);
  const settle = () => p.waitForTimeout(450); // the previous visual animates out
  // supply & demand: a=100, b=1, c=10, d=0.8 → Q = 90/1.8 = 50, P = 50
  await p.evaluate(() => window.openQ('Explain supply and demand and market equilibrium')); await settle();
  assert.match(await status(), /Quantity = 50, Price = 50/, 'equilibrium computed by intersection');
  await p.fill('.vz.is-in input[data-var="a"]', '118'); await p.dispatchEvent('.vz.is-in input[data-var="a"]', 'input');
  assert.match(await status(), /Quantity = 60, Price = 58/, 'demand shift moves the equilibrium (Q = 108/1.8 = 60)');
  // derivative: f(x) = x³ − 3x at x₀ = 1.5 → f′ = 3.75
  await p.evaluate(() => window.openQ('Explain the derivative of x^3 - 3x'));
  assert.match(await status(), /f′\(1\.5\) = 3\.75/, 'tangent slope computed');
  // normal distribution: P(−1 < X < 1) ≈ 0.683
  await p.evaluate(() => window.openQ('What is a normal distribution?'));
  assert.match(await status(), /= 0\.68[23]/, '68% within one standard deviation');
  // neural network: training lowers the loss
  await p.evaluate(() => window.openQ('Explain how a neural network learns'));
  const loss0 = await p.evaluate(() => { v.show(3); return v.state().loss; });
  await p.waitForTimeout(3500);
  const nn = await p.evaluate(() => v.state());
  assert.ok(nn.epoch > 30, 'the network trains in the browser (' + nn.epoch + ' epochs)');
  assert.ok(nn.loss < 0.6, 'loss falls with back-propagation (' + nn.loss + ')');
  // algorithm: bubble sort ends sorted
  await p.evaluate(() => window.openQ('How does bubble sort work? [5, 3, 9, 1, 7]'));
  const algo = await p.evaluate(() => v.state().last);
  assert.deepEqual(algo.arr, [1, 3, 5, 7, 9], 'bubble sort trace ends sorted');
  // truss: moving the load changes the reactions
  await p.evaluate(() => window.openQ('How does a Pratt truss bridge carry load?')); await p.waitForTimeout(900);
  await p.fill('.vz.is-in input[data-var="pos"]', '0.17'); await p.dispatchEvent('.vz.is-in input[data-var="pos"]', 'input');
  const tr = await p.evaluate(() => v.state().reactions);
  assert.ok(tr.Ay > tr.By, 'load near the left support → larger left reaction');

  /* ---------- 6. AI-planned spec for a topic with no built-in visual (simulated AI) ---------- */
  const ai = await p.evaluate(async () => {
    const good = { kind: 'diagram', title: 'How a heat pump works', subject: 'Thermodynamics', alt: 'Refrigerant cycle', params: { layout: 'cycle', nodes: [{ id: 'ev', label: 'Evaporator', detail: 'Refrigerant absorbs heat from outside air and evaporates.' }, { id: 'co', label: 'Compressor', detail: 'Work raises pressure and temperature.' }, { id: 'cd', label: 'Condenser', detail: 'Hot gas releases heat indoors and condenses.' }, { id: 'xv', label: 'Expansion valve', detail: 'Pressure drops; the cycle repeats.' }], edges: [{ from: 'ev', to: 'co' }, { from: 'co', to: 'cd' }, { from: 'cd', to: 'xv' }, { from: 'xv', to: 'ev' }] }, steps: [{ title: 'Evaporator', text: 'Heat in', focus: ['ev'] }] };
    let reply = 'Here is the spec:\n' + JSON.stringify(good);
    window.ERLY.companion = { ai: { ready: () => true, generate: async () => reply } };
    const a = await ERLY.vspec.aiPlan('How does a heat pump work?', 'ug');
    reply = JSON.stringify({ kind: 'plot2d', params: { fns: [{ expr: 'constructor.constructor("alert(1)")()' }] } });
    const b = await ERLY.vspec.aiPlan('evil');
    reply = '{"visual": false}';
    const c = await ERLY.vspec.aiPlan('What is your name?');
    return { a: a && a.kind, nodes: a && a.params.nodes.length, b, c };
  });
  assert.equal(ai.a, 'diagram', 'AI spec for an unseen topic is validated and accepted'); assert.equal(ai.nodes, 4);
  assert.equal(ai.b, null, 'AI spec with code in an expression is rejected');
  assert.deepEqual(ai.c, { declined: true }, 'the AI can decline when a visual would not help');
  await p.evaluate(() => window.openQ(null, { kind: 'diagram', title: 'How a heat pump works', params: { layout: 'cycle', nodes: [{ id: 'ev', label: 'Evaporator' }, { id: 'co', label: 'Compressor' }, { id: 'cd', label: 'Condenser' }], edges: [{ from: 'ev', to: 'co' }, { from: 'co', to: 'cd' }, { from: 'cd', to: 'ev' }] } }));
  await settle(); await p.click('.vz.is-in .vs-node[data-k="co"]');
  await settle(); assert.match(await p.evaluate(() => v.el.querySelector('.vz__status').textContent), /Compressor/, 'diagram nodes are interactive');
  await p.close();

  /* ---------- 7. consent-first inside the real companion ---------- */
  const s = await browser.newPage({ viewport: { width: 1280, height: 860 } }); watch(s);
  await s.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); });
  await s.goto(BASE + 'student.html'); await s.waitForTimeout(600);
  await s.click('.cmp-launch'); await s.waitForTimeout(900);
  const ask = async q => { await s.fill('#cmpText', q); await s.press('#cmpText', 'Enter'); await s.waitForTimeout(1100); };
  await ask('How does a Pratt truss bridge carry load?');
  assert.equal(await s.locator('.cvoffer').count(), 1, 'a visual is OFFERED');
  assert.equal(await s.locator('.vz').count(), 0, 'and NOT opened without permission');
  await s.click('.cvoffer [data-vo="no"]'); await s.waitForTimeout(300);
  assert.equal(await s.locator('.vz').count(), 0, 'declining opens nothing');
  await ask('How does a Pratt truss bridge carry load?');
  assert.equal(await s.locator('.cvoffer:not(.is-done)').count(), 0, 'not asked again for the same question');
  await ask('Explain supply and demand and market equilibrium');
  await s.click('.cvoffer:not(.is-done) [data-vo="yes"]'); await s.waitForTimeout(800);
  assert.equal(await s.locator('.vz').count(), 1, 'accepting builds the visual');
  assert.match(await s.textContent('.vz__h b'), /Supply, demand/, 'the visual matches the question');
  await s.click('.vz [data-v="close"]'); await s.waitForTimeout(400);
  await ask('How does merge sort work?');
  await ask('yes');
  assert.equal(await s.locator('.vz').count(), 1, 'a typed or spoken “yes” accepts the offer');
  assert.match(await s.textContent('.vz__h b'), /Merge sort/);
  await s.screenshot({ path: process.env.SHOT || '/tmp/vspec-chat.png' });
  await s.click('.vz [data-v="close"]'); await s.waitForTimeout(400);
  // "Explain first, then create a visual": the visual follows the explanation
  await ask('Explain the TCP three-way handshake');
  await s.click('.cvoffer:not(.is-done) [data-vo="after"]');
  await s.waitForSelector('.vz', { timeout: 8000 });
  assert.match(await s.textContent('.vz__h b'), /TCP three-way handshake/, 'explain-first builds the visual after the answer');
  // a typed "no" declines
  await s.click('.vz [data-v="close"]'); await s.waitForTimeout(400);
  await ask('How does binary search work?');
  await ask('no thanks');
  await s.waitForTimeout(400);
  assert.equal(await s.locator('.vz').count(), 0, 'a typed “no” declines');
  await s.close();

  assert.deepEqual(errors, [], 'no page errors');
  console.log('dynamic visual engine e2e: all checks passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
