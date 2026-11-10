// v11 AI companion acceptance tests (the ten scenarios in the brief), run against a local fake
// OpenAI-style model server so the browser pipeline is tested exactly; the model itself is not.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/companion-quality.e2e.js
'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;

// a plant cell spec the "model" composes — nothing like it exists in ERLY's code
const PLANT_CELL = { kind: 'scene2d', title: 'Plant cell', subject: 'Biology', alt: 'A labelled plant cell.', params: { scale: 'schematic', layers: [{ id: 'org', label: 'Organelles' }], elements: [
  { id: 'wall', shape: 'rect', x: 50, y: 30, w: 80, h: 50, rx: 6, fill: 'none', stroke: 'green', sw: 1.2, label: 'Cell wall', detail: 'Rigid cellulose layer outside the membrane.' },
  { id: 'vac', shape: 'ellipse', x: 50, y: 32, w: 30, h: 20, fill: 'water', label: 'Central vacuole', detail: 'Stores water and keeps the cell turgid.', layer: 'org' },
  { id: 'nuc', shape: 'circle', x: 25, y: 22, r: 6, fill: 'violet', label: 'Nucleus', detail: 'Holds the DNA.', layer: 'org' },
  { id: 'chl', shape: 'ellipse', x: 75, y: 45, w: 10, h: 5, fill: 'green', label: 'Chloroplast', detail: 'Site of photosynthesis.', layer: 'org', anim: { type: 'bob', period: 3 } },
  { id: 'evil', shape: 'text', x: 50, y: 58, text: '<img src=x onerror=alert(1)>', fill: 'red' } ] },
  steps: [{ title: 'Cell wall', text: 'The outer boundary.', focus: ['wall'] }, { title: 'Organelles', text: 'Inside the membrane.', focus: ['nuc', 'chl'] }] };

const seen = [];
const srv = http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let raw = ''; req.on('data', c => { raw += c; });
  req.on('end', () => {
    const body = JSON.parse(raw); seen.push(body);
    const sys = body.messages[0].content, last = body.messages[body.messages.length - 1];
    const q = Array.isArray(last.content) ? last.content.map(p => p.text || '').join(' ') : last.content;
    let out;
    if (/strict JSON specs/.test(sys)) out = /plant cell/i.test(q) ? JSON.stringify(PLANT_CELL) : 'not json at all';
    else if (/entanglement/i.test(q) && !/visual/i.test(q)) out = 'Quantum entanglement is a correlation between particles described by one shared state…';
    else out = 'A detailed, structured answer.';
    res.writeHead(200, Object.assign({ 'content-type': 'text/event-stream' }, cors));
    out.match(/.{1,24}/gs).forEach(ch => res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: ch } }] })}\n\n`));
    res.end('data: [DONE]\n\n');
  });
}).listen(8793);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    window.__media = 0; if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.__media++; return Promise.reject(new Error('no')); };
    localStorage.setItem('erly-ai-v1', JSON.stringify({ tier: 'online', consented: Date.now() }));
    Object.defineProperty(window, 'ERLY_AI_CONFIG', { configurable: true, get: () => ({ online: { name: 'Claude', model: 'claude', vision: true, url: 'http://localhost:8793/v1/chat/completions', get: '' } }), set() {} });
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); await p.click('.cmp-launch'); await p.waitForTimeout(900);
  const settle = () => p.waitForFunction(() => !document.querySelector('.cmp.is-gen') && !document.querySelector('.cmsg.is-writing') && !document.querySelector('.cmsg--typing'), null, { timeout: 20000 });
  const ask = async q => { await p.fill('#cmpText', q); await p.press('#cmpText', 'Enter'); await p.waitForTimeout(400); await settle(); await p.waitForTimeout(500); };
  const vis = () => p.evaluate(() => { const v = ERLY.companion.tools.visual.current(); return v ? { title: v.scene.title[0], kind: v.scene.spec ? v.scene.spec.kind : 'scene', state: v.state() } : null; });
  const lastAI = () => p.locator('.cmsg--ai').last().textContent();

  // 1 · ordinary question: an answer, no visual question
  await ask('What is quantum entanglement?');
  assert.match(await lastAI(), /shared state/, '1: answered by the model');
  assert.equal(await p.locator('.cvoffer').count(), 0, '1: no “would you like a visual?”');
  assert.equal(await vis(), null, '1: no visual opened');
  // 2 · explicit visual → a composed, relevant visual
  await ask('Create an interactive visual representation of quantum entanglement.');
  let v = await vis(); assert.equal(v.kind, 'scene2d', '2: an open composition'); assert.match(v.title, /entanglement/i);
  assert.ok(await p.locator('.vz.is-in .vs-compose .vs-c').count() >= 6, '2: labelled parts rendered');
  await p.click('.vz.is-in .vs-c[data-id="detB"]'); assert.match(await p.textContent('.vz.is-in .vz__status'), /−cos θ/, '2: parts explain themselves');
  // 3 · 3D solar system with controls, labels and moving orbits
  await ask('Create an interactive 3D representation of the solar system.');
  v = await vis(); assert.equal(v.kind, 'scene3d'); assert.equal(v.state.objects, 9, '3: Sun + 8 planets');
  const pos0 = v.state.positions.earth; await p.waitForTimeout(800); const pos1 = (await vis()).state.positions.earth;
  assert.notDeepEqual(pos0, pos1, '3: planets orbit');
  assert.ok(await p.locator('.vz.is-in .vs-3d__labels span').filter({ hasText: 'Jupiter' }).count(), '3: labelled');
  const cvBox = await p.locator('.vz.is-in .vs-3d canvas').boundingBox(); assert.ok(cvBox && cvBox.height > 150, '3: the 3D view has real size (' + (cvBox && cvBox.height) + ')');
  assert.ok(await p.locator('.vz.is-in .vs-3d__labels span:visible').count() >= 5, '3: labels are on screen');
  assert.match(await p.textContent('.vz.is-in .vs-tools'), /not to scale/, '3: honest about scale');
  await p.click('.vz.is-in .vs-tools [data-layer="outer"]'); await p.waitForTimeout(200);
  assert.deepEqual((await vis()).state.hidden, ['outer'], '3: layers toggle');
  if (SHOT) await p.screenshot({ path: SHOT + '/visual-solar-system.png' });
  // 4 · a real 3D maths surface
  await ask('Plot and explain a three-dimensional mathematical function.');
  v = await vis(); assert.equal(v.kind, 'surface3d', '4: a real surface z = f(x, y)');
  // 5 · engineering
  await ask('Create a visual explanation of how a four-stroke engine works.');
  v = await vis(); assert.match(v.title, /four-stroke/i); assert.equal(v.kind, 'scene2d');
  if (SHOT) await p.screenshot({ path: SHOT + '/visual-engine.png' });
  // 6 · follow-up edits the SAME visual
  await p.evaluate(() => ERLY.companion.tools.visual.current().setVar('labels', 0)); await p.waitForTimeout(100);
  await ask('Make the previous visual more detailed and label every component.');
  v = await vis(); assert.match(v.title, /four-stroke/i, '6: still the same visual'); assert.equal(v.state.labels, true, '6: every component labelled');
  await ask('highlight the third step');
  assert.match(await p.textContent('.vz.is-in .vz__t'), /Power/, '6: “the third step” understood');
  await ask('simplify the diagram');
  assert.equal((await vis()).state.layers, 0, '6: simplified (optional layer removed)');
  // 7 + 8 · advanced question with context: the model receives the conversation and the visual on screen
  seen.length = 0;
  await ask('Why does the power stroke produce more work than the compression stroke absorbs?');
  const req = seen[seen.length - 1];
  assert.match(req.messages[0].content, /On the student's screen right now: an interactive visual "How a four-stroke engine works"/, '8: the model knows which visual is open');
  assert.ok(req.messages.some(m => m.role === 'user' && /quantum entanglement/i.test(typeof m.content === 'string' ? m.content : '')), '8: earlier turns are sent');
  assert.match(req.messages[0].content, /Never invent facts/, '7: accuracy rules in force');
  // open-ended generation: a subject with no built-in visual is composed by the model, validated and rendered
  await ask('Draw a labelled diagram of a plant cell');
  v = await vis(); assert.equal(v.title, 'Plant cell', 'model-composed visual'); assert.equal(v.state.elements, 5);
  assert.equal(await p.locator('.vz.is-in img').count(), 0, 'markup in model text is never executed or injected');
  assert.match(await p.textContent('.vz.is-in svg'), /img src=x onerror=alert\(1\)/, '…angle brackets are stripped and it is shown as plain text');
  // 9 · visual engine can't build it → said plainly, nothing fake
  await ask('Draw a diagram of the history of jazz improvisation');
  assert.match(await p.locator('#cmpLog').textContent(), /couldn’t build a reliable interactive visual for this, so I won’t show a made-up one/, '9: graceful, honest limitation');
  // 10 · privacy
  assert.equal(await p.evaluate(() => window.__media), 0, '10: microphone never requested');
  const leaks = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const fp = path.join(d, f); if (/vendor|node_modules/.test(fp)) continue; if (fs.statSync(fp).isDirectory()) walk(fp); else if (/\.(js|html|json)$/.test(f) && /sk-ant-[A-Za-z0-9]|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{30}/.test(fs.readFileSync(fp, 'utf8'))) leaks.push(fp); } })(path.join(__dirname, '..', '..', 'assets'));
  assert.deepEqual(leaks, [], '10: no API keys in the website');
  assert.deepEqual(errors, [], 'no page errors');
  console.log('AI companion acceptance e2e: all checks passed');
  await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
