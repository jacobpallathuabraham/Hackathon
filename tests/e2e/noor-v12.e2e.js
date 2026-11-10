// v12 Noor acceptance: visuals Noor builds itself (engine, photosynthesis, binary search, speed–distance–time, atom),
// answers that stay on the question asked, the standard failure message, and tables that never split words.
// A local fake OpenAI-style server stands in for the model, so the browser pipeline is tested, not a model.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/noor-v12.e2e.js
'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;

let mode = 'ok';
const ANSWERS = [
  [/engine/i, 'A four-stroke engine repeats intake, compression, power and exhaust; the piston turns the crankshaft.'],
  [/photosynthesis/i, 'Photosynthesis uses light energy to turn carbon dioxide and water into glucose and oxygen.'],
  [/binary search/i, 'Binary search halves a sorted list each step by comparing with the middle element.'],
  [/presentation anxiety|presentation/i, 'Presentation anxiety is common; rehearsing aloud and slowing your breathing help.'],
  [/planets|solar system/i, '| Planet | Distance from the Sun (million km) | Notable feature |\n|---|---|---|\n| Mercury | 57.9 | Smallest planet, extreme temperatures |\n| Jupiter | 778.5 | Largest planet, Great Red Spot storm |\n| Neptune | 4,495.1 | Strongest winds in the Solar System |']
];
const srv = http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let raw = ''; req.on('data', c => { raw += c; });
  req.on('end', () => {
    if (mode === 'fail') { res.writeHead(500, Object.assign({ 'content-type': 'application/json' }, cors)); return res.end('{"error":{"message":"upstream provider overloaded, cooling down"}}'); }
    const body = JSON.parse(raw), last = body.messages[body.messages.length - 1];
    const q = Array.isArray(last.content) ? last.content.map(p => p.text || '').join(' ') : last.content;
    const hit = ANSWERS.find(([re]) => re.test(q)); const out = hit ? hit[1] : 'A focused answer.';
    res.writeHead(200, Object.assign({ 'content-type': 'text/event-stream' }, cors));
    out.match(/.{1,24}/gs).forEach(ch => res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: ch } }] })}\n\n`));
    res.end('data: [DONE]\n\n');
  });
}).listen(8794);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    localStorage.setItem('erly-ai-v1', JSON.stringify({ tier: 'online', consented: Date.now() }));
    Object.defineProperty(window, 'ERLY_AI_CONFIG', { configurable: true, get: () => ({ online: { name: 'Claude', model: 'claude', vision: true, url: 'http://localhost:8794/v1/chat/completions', get: '' } }), set() {} });
  });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); await p.click('.cmp-launch'); await p.waitForTimeout(900);
  const settle = () => p.waitForFunction(() => !document.querySelector('.cmp.is-gen') && !document.querySelector('.cmsg.is-writing') && !document.querySelector('.cmsg--typing'), null, { timeout: 30000 });
  const ask = async q => { await p.fill('#cmpText', q); await p.press('#cmpText', 'Enter'); await p.waitForTimeout(400); await settle(); await p.waitForTimeout(500); };
  const vis = () => p.evaluate(() => { const v = ERLY.companion.tools.visual.current(); return v ? { title: v.scene.title[0], kind: v.scene.spec ? v.scene.spec.kind : 'scene', state: v.state() } : null; });
  const lastAI = () => p.locator('.cmsg--ai').last().textContent();
  const stepTitle = () => p.textContent('.vz.is-in .vz__t');

  // A · "how mechanical engines work" — Noor decides the format and builds it, with stages and replay
  await ask('Show me how mechanical engines work visually');
  let v = await vis(); assert.ok(v, 'A: a visual was built'); assert.match(v.title, /four-stroke/i); assert.equal(v.kind, 'scene2d');
  const svg = await p.textContent('.vz.is-in svg');
  for (const part of ['Piston', 'Crankshaft']) assert.match(svg, new RegExp(part, 'i'), 'A: labelled ' + part);
  assert.match(svg, /valve/i, 'A: valves labelled');
  const steps = []; for (let i = 0; i < 4; i++) { steps.push(await stepTitle()); await p.click('.vz.is-in [data-v="next"]'); await p.waitForTimeout(150); }
  assert.deepEqual(steps.map(s => (s.match(/Intake|Compression|Power|Exhaust/i) || [''])[0].toLowerCase()), ['intake', 'compression', 'power', 'exhaust'], 'A: the four strokes in order: ' + steps.join(' | '));
  await p.click('.vz.is-in [data-v="replay"]'); await p.waitForTimeout(200); assert.match(await stepTitle(), /Intake/i, 'A: replay returns to the start');
  if (SHOT) await p.screenshot({ path: SHOT + '/v12-engine.png' });
  // B · photosynthesis visually
  await ask('Explain photosynthesis visually');
  v = await vis(); assert.match(v.title, /photosynthesis/i, 'B: photosynthesis visual');
  // C · binary search with step forward / back
  await ask('Show me binary search visually');
  v = await vis(); assert.match(v.title, /binary search/i); assert.equal(v.kind, 'algorithm');
  const t0 = await stepTitle(); await p.click('.vz.is-in [data-v="next"]'); await p.waitForTimeout(150); const t1 = await stepTitle();
  assert.notEqual(t0, t1, 'C: step forward'); await p.click('.vz.is-in [data-v="prev"]'); await p.waitForTimeout(150); assert.equal(await stepTitle(), t0, 'C: step back');
  // D · speed–distance–time with values the student changes
  await ask('Show me the relationship between speed, distance and time visually');
  v = await vis(); assert.equal(v.kind, 'plot2d', 'D: a graph'); assert.match(v.title, /speed|distance/i);
  const sl = p.locator('.vz.is-in input[type="range"]').first(); assert.ok(await sl.count(), 'D: a value to change');
  const pic = () => p.evaluate(() => { const r = document.querySelector('.vz.is-in'); const c = r.querySelector('canvas'); return c ? c.toDataURL() : (r.querySelector('svg') || r).innerHTML; });
  const before = await pic(); await sl.evaluate(el => { el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(400);
  assert.notEqual(await pic(), before, 'D: changing the value redraws the graph');
  if (SHOT) await p.screenshot({ path: SHOT + '/v12-speed.png' });
  // E · atom structure: labelled and marked conceptual
  await ask('Show me the structure of an atom visually');
  v = await vis(); assert.match(v.title, /atom/i); assert.match(await p.textContent('.vz.is-in'), /not to scale|conceptual|schematic/i, 'E: labelled as conceptual');
  assert.match(await p.textContent('.vz.is-in svg'), /nucleus/i, 'E: labelled');

  // F · relevance sequence — every answer is about the question just asked
  for (const [q, re] of [['How do engines work?', /four-stroke engine/], ['What is photosynthesis?', /light energy/], ['How does binary search work?', /halves a sorted list/], ['How can I deal with presentation anxiety?', /rehearsing aloud/], ['And how do engines work again?', /four-stroke engine/]]) {
    await ask(q); assert.match(await lastAI(), re, 'F: on-topic answer for “' + q + '”');
  }
  // G · tables: whole words, stacked cards on a phone
  await ask('Give me a table of some planets with distance from the Sun and a notable feature');
  assert.ok(await p.locator('.cmsg--ai').last().locator('table').count(), 'G: a table');
  const wide = await p.evaluate(() => [...document.querySelectorAll('.cmsg--ai:last-of-type td, .md-table td')].slice(-9).map(td => getComputedStyle(td).wordBreak + '|' + getComputedStyle(td).overflowWrap));
  assert.ok(wide.every(s => !/break-all/.test(s)), 'G: never break-all: ' + wide.join());
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
  const cards = await p.evaluate(() => { const t = [...document.querySelectorAll('.md-table table')].pop(); const td = t.querySelector('td'); return { display: getComputedStyle(td).display, label: td.dataset.label, fits: [...t.querySelectorAll('td')].every(c => c.scrollWidth <= c.clientWidth + 1) }; });
  assert.match(cards.display, /^(block|grid|flex)$/, 'G: stacked on a phone'); assert.equal(cards.label, 'Planet'); assert.ok(cards.fits, 'G: no cell overflows');
  if (SHOT) await p.screenshot({ path: SHOT + '/v12-table-mobile.png' });
  await p.setViewportSize({ width: 1280, height: 900 });

  // H · failure: the standard message, the question kept, no provider text, no unrelated answer
  mode = 'fail';
  await ask('Why does the compression stroke raise the temperature of the gas?');
  const log = await p.textContent('#cmpLog'), last = await lastAI();
  assert.match(last, /Noor is temporarily unable to complete this request/, 'H: standard failure message');
  assert.doesNotMatch(log, /cooling down|overloaded|upstream|free AI service|HTTP 5|error:/i, 'H: no provider error text shown');
  assert.doesNotMatch(last, /presentation|anxiety/i, 'H: no unrelated answer substituted');
  assert.match(await p.inputValue('#cmpText'), /compression stroke/, 'H: the message is still there');
  assert.ok(await p.locator('.cmsg--ai').last().locator('text=Try again').count() || await p.locator('button:has-text("Try again")').count(), 'H: a retry control');
  mode = 'ok';
  await p.locator('button:has-text("Try again")').last().click(); await p.waitForTimeout(400); await settle(); await p.waitForTimeout(400);
  assert.doesNotMatch(await lastAI(), /temporarily unable/, 'H: retry works once the service is back');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('Noor v12 acceptance e2e: all checks passed');
  await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
