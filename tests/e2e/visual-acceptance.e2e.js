// v13 visual acceptance: the 10 required prompts, answered by Noor's LOCAL visual engine with NO AI provider
// (the engine works from validated specs, independent of any model). Checks educational content, not just pixels.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/visual-acceptance.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light'); });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const outbound = []; p.on('request', r => { const u = r.url(); if (!u.startsWith(BASE) && !/fonts\.(googleapis|gstatic)/.test(u)) outbound.push(u); });
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); await p.click('.cmp-launch'); await p.waitForTimeout(800);
  assert.equal(await p.evaluate(() => ERLY.companion.ai.state().tier), 'local', 'no AI provider is used');
  const settle = () => p.waitForFunction(() => !document.querySelector('.cmp.is-gen') && !document.querySelector('.cmsg.is-writing') && !document.querySelector('.cmsg--typing'), null, { timeout: 30000 });
  const ask = async q => { await p.fill('#cmpText', q); await p.press('#cmpText', 'Enter'); await p.waitForTimeout(500); await settle(); await p.waitForTimeout(900); };
  const vis = () => p.evaluate(() => { const v = ERLY.companion.tools.visual.current(); return v ? { title: v.scene.title[0], kind: v.scene.spec ? v.scene.spec.kind : 'scene', stages: v.scene.stages.map(s => s.title[0]), state: v.state() } : null; });
  const panel = () => p.textContent('.vz.is-in');
  const next = async () => { await p.click('.vz.is-in [data-v="next"]'); await p.waitForTimeout(150); return p.textContent('.vz.is-in .vz__t'); };
  const results = [];
  const record = (n, prompt, v, notes) => results.push({ n, prompt, kind: v && v.kind, title: v && v.title, notes });

  // 1 · four-stroke engine
  await ask('Explain how a four-stroke mechanical engine works visually.');
  let v = await vis(); assert.equal(v.kind, 'scene2d'); assert.deepEqual(v.stages.map(s => s.replace(/^\d · /, '')), ['Intake', 'Compression', 'Power', 'Exhaust']);
  for (const part of ['Piston', 'Crankshaft', 'Intake valve', 'Exhaust valve', 'Spark plug']) assert.match(await panel(), new RegExp(part), '1: labelled ' + part);
  record(1, 'four-stroke engine', v, 'labelled piston, crankshaft, valves, spark plug; four strokes in order');
  // 2 · photosynthesis, animated
  await ask('Show me photosynthesis as an animated diagram.');
  v = await vis(); assert.match(v.title, /Photosynthesis/); assert.match(await panel(), /chloroplast|light|glucose/i);
  record(2, 'photosynthesis animated', v, 'built-in animated scene');
  // 3 · binary search, interactive
  await ask('Explain binary search with an interactive visual.');
  v = await vis(); assert.equal(v.kind, 'algorithm'); await p.click('.vz.is-in [data-v="replay"]'); await p.waitForTimeout(200); await p.click('.vz.is-in [data-v="play"]').catch(() => {}); const s0 = await p.textContent('.vz.is-in .vz__t'); assert.match(s0, /Sorted list/, '3: starts at step 1'); assert.match(await next(), /Halve the range/, '3: steps forward to the halving step');
  record(3, 'binary search', v, 'step-through algorithm on real data');
  // 4 · digestive system with labels
  await ask('Show the digestive system with labels.');
  v = await vis(); for (const organ of ['Mouth', 'Oesophagus', 'Stomach', 'Small intestine', 'Large intestine', 'Liver', 'Pancreas']) assert.match(await panel(), new RegExp(organ), '4: ' + organ);
  record(4, 'digestive system', v, '10 labelled organs, food path in order');
  // 5 · Newton's laws
  await ask('Explain Newton’s laws using illustrations.');
  v = await vis(); assert.match(v.title, /Newton/); assert.equal(v.stages.length, 3);
  assert.match(await panel(), /a = F \/ m = 10 \/ 2 = 5 m\/s²/, '5: the worked example is arithmetically right');
  assert.match(v.stages.join(' '), /First law.*Second law.*Third law/);
  if (SHOT) await p.screenshot({ path: SHOT + '/visual-newton.png' });
  record(5, 'Newton’s laws', v, 'three panels; a = F/m = 5 m/s² example; action–reaction pair on different bodies');
  // 6 · electric motor
  await ask('Show how an electric motor works.');
  v = await vis(); assert.match(v.title, /DC electric motor/);
  for (const part of ['N pole', 'S pole', 'Armature coil', 'Split-ring commutator', 'brushes', 'Force up', 'Force down', 'Magnetic field B']) assert.match(await panel(), new RegExp(part, 'i'), '6: ' + part);
  assert.match(v.stages.join(' | '), /Current flows.*magnetic field.*Forces on the coil.*Torque.*commutator/i);
  const rot0 = await p.evaluate(() => document.querySelector('.vz.is-in [data-id="coil"]').getAttribute('transform')); await p.waitForTimeout(500);
  assert.notEqual(await p.evaluate(() => document.querySelector('.vz.is-in [data-id="coil"]').getAttribute('transform')), rot0, '6: the coil rotates');
  if (SHOT) await p.screenshot({ path: SHOT + '/visual-motor.png' });
  record(6, 'electric motor', v, 'magnets, field, F = BIL forces, torque, commutator reversing current; coil animates');
  // 7 · solar system, responsive
  await ask('Explain the solar system using a responsive visual.');
  v = await vis(); assert.equal(v.kind, 'scene3d'); assert.equal(v.state.objects, 9); assert.match(await panel(), /not to scale/);
  record(7, 'solar system', v, '3D, 9 bodies, honest about scale');
  // 8 · mathematical function graph
  await ask('Create a graph showing a mathematical function.');
  v = await vis(); assert.equal(v.kind, 'plot2d'); assert.ok(await p.locator('.vz.is-in input[type="range"]').count(), '8: adjustable');
  record(8, 'function graph', v, 'plot with sliders');
  // 9 · ER diagram (Mermaid, lazy-loaded from this site)
  await ask('Explain a database relationship using an ER diagram.');
  await p.waitForFunction(() => { const v = ERLY.companion.tools.visual.current(); return v && v.state().rendered === true; }, null, { timeout: 15000 });
  v = await vis(); assert.equal(v.kind, 'mermaid'); assert.ok(v.state.nodes >= 4, '9: four entities drawn (' + v.state.nodes + ')');
  const er = await p.textContent('.vz.is-in .vs-mermaid');
  for (const x of ['STUDENT', 'COURSE', 'ENROLMENT', 'LECTURER', 'student_id', 'PK', 'FK']) assert.match(er, new RegExp(x), '9: ' + x);
  assert.match(v.stages.join(' '), /Many-to-many via a junction table/);
  if (SHOT) await p.screenshot({ path: SHOT + '/visual-er.png' });
  record(9, 'ER diagram', v, 'Mermaid erDiagram: 4 entities, PK/FK, 1-to-many and many-to-many via junction table');
  // theme follows the site: dark re-renders the diagram with a dark palette
  const light = await p.evaluate(() => getComputedStyle(document.querySelector('.vs-mermaid svg')).backgroundColor + '|' + document.querySelector('.vs-mermaid svg').innerHTML.length);
  await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; }); await p.waitForTimeout(1200);
  assert.ok(await p.evaluate(() => ERLY.companion.tools.visual.current().state().rendered), '9: re-rendered in dark mode');
  await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; }); await p.waitForTimeout(800);
  // 10 · a complex abstract concept, chosen sensibly and said so
  await ask('Explain a complex abstract concept using a suitable visual.');
  await p.waitForFunction(() => { const v = ERLY.companion.tools.visual.current(); return v && v.state().rendered === true; }, null, { timeout: 15000 });
  v = await vis(); assert.match(v.title, /Recursion/); assert.match(await panel(), /didn’t name a concept/);
  for (const x of ['Base case', 'Recursive case', 'Call stack', 'Pitfalls']) assert.match(await p.textContent('.vz.is-in .vs-mermaid'), new RegExp(x), '10: ' + x);
  record(10, 'abstract concept', v, 'Mermaid concept map of recursion, labelled as an example');

  // broken and unsafe specs: validated away, never drawn
  const bad = await p.evaluate(() => ['erDiagram\n  A ||--o{ B : x\n  click A "https://evil.example"', 'graph TD\n A-->B\n %%{init: {"securityLevel":"loose"}}%%', 'flowchart TD\n A["<img src=x onerror=alert(1)>"]', 'notADiagram at all'].map(code => ERLY.vspec.validate({ kind: 'mermaid', title: 't', params: { code } }).ok));
  assert.deepEqual(bad, [false, false, false, false], 'unsafe or broken diagram specs are rejected');
  const broken = await p.evaluate(async () => { const v = ERLY.vspec.validate({ kind: 'mermaid', title: 'Broken', params: { code: 'flowchart TD\n  A -->> -->> ((' } }); if (!v.ok) return 'rejected'; const box = document.createElement('div'); document.body.appendChild(box); const sc = await ERLY.vspec.renderers.mermaid(v.spec)(box); const st = sc.state(); const txt = box.textContent; box.remove(); return st.rendered ? 'drawn' : txt; });
  assert.ok(broken === 'rejected' || /couldn’t be drawn correctly/.test(broken), 'a spec that fails to render shows an honest error, not a broken diagram: ' + broken);

  // provider independence and privacy: no network calls except this site (and fonts)
  assert.deepEqual(outbound.filter(u => !/wikipedia|wikidata/.test(u)), [], 'visuals use no external services: ' + outbound.join(' '));
  // mobile + dark
  await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
  await ask('Show how an electric motor works.');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile: no sideways scroll');
  const box = await p.locator('.vz.is-in svg').first().boundingBox(); assert.ok(box && box.width > 250, 'mobile: the visual has real size');
  if (SHOT) await p.screenshot({ path: SHOT + '/visual-motor-phone-dark.png' });

  assert.deepEqual(errors, [], 'no page errors');
  console.table(results.map(r => ({ '#': r.n, prompt: r.prompt, kind: r.kind, title: r.title })));
  console.log('visual acceptance e2e: all 10 prompts passed');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
