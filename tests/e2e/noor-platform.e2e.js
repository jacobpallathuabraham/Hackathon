// v13 Noor platform, end to end: the real browser client → the REAL gateway (server/gateway/handler.mjs)
// → a fake Gemini upstream (only the provider's HTTP endpoint is simulated). Open sources are served from
// response shapes recorded from the real APIs, so the run is repeatable.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/noor-platform.e2e.js
'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;
const GW = 8796;

// ---------------- fake Gemini (OpenAI-compatible endpoint) ----------------
let mode = 'ok', geminiCalls = [];
const sse = parts => parts.map(t => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`).join('') + 'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":420,"completion_tokens":60}}\n\ndata: [DONE]\n\n';
function answerFor(body) {
  const sys = body.messages[0].content, last = body.messages[body.messages.length - 1].content;
  const q = typeof last === 'string' ? last : '';
  const cites = /\[1\]/.test(sys) ? ' [1]' : '';
  if (/comparison of/i.test(sys)) return '**Python** and **JavaScript** are both popular.\n\n| | Python | JavaScript |\n|---|---|---|\n| Advantages | Readable syntax, huge science libraries | Runs in every browser |\n| Disadvantages | Slower for CPU-heavy loops | Quirky type coercion |\n\nWho it suits: Python for data work; JavaScript for the web. It depends on your goals.' + cites;
  if (/engine/i.test(q)) return 'A four-stroke engine repeats intake, compression, power and exhaust while the piston turns the crankshaft' + cites + '. The intake valve lets the fuel-air mixture in during the intake stroke [9].';
  if (/arsenal/i.test(q)) return 'Arsenal’s most recent listed result was a 1–0 home win over Hull City on 7 November 2026' + cites + '.';
  if (/photosynthesis/i.test(q)) return 'Photosynthesis turns light energy, water and carbon dioxide into glucose and oxygen in chloroplasts.';
  return 'A focused answer about ' + q.slice(0, 40) + '.';
}
async function fakeGemini(url, init) {
  const body = JSON.parse(init.body); geminiCalls.push(body);
  const q = String(body.messages[body.messages.length - 1].content);
  if (mode === 'quota') return new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded for metric: generate_content_free_tier_requests, limit: 250', details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } }), { status: 429 });
  if (mode === 'hang') return new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  if (mode === 'offtopic-once' && !/Answer exactly this question/.test(q)) return new Response(sse(['Presentation anxiety is common; rehearse aloud, slow your breathing and remember the audience wants you to succeed. Practising in front of friends helps a lot too.']), { status: 200, headers: { 'content-type': 'text/event-stream' } });
  if (mode === 'offtopic-always') return new Response(sse(['Presentation anxiety is common; rehearse aloud, slow your breathing and remember the audience wants you to succeed. Practising in front of friends helps a lot too.']), { status: 200, headers: { 'content-type': 'text/event-stream' } });
  if (mode === 'slow') await new Promise(r => setTimeout(r, 1500));
  const text = answerFor(body);
  return new Response(sse(text.match(/.{1,30}/gs)), { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

// ---------------- the real gateway, in-process ----------------
let handle, Usage, gwUsage;
const ENV = { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-test', NOOR_PROVIDERS: 'gemini', NOOR_FIRST_TOKEN_MS: '1500', NOOR_IP_PER_MINUTE: '100', NOOR_IP_PER_DAY: '500' };
const server = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const request = new Request(`http://localhost:${GW}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const response = await handle(request, ENV, { fetchFn: fakeGemini, usage: gwUsage, ip: 'browser' });
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) return res.end();
  const rd = response.body.getReader(); for (;;) { const { done, value } = await rd.read(); if (done) break; res.write(value); } res.end();
});

// ---------------- recorded open-source responses ----------------
const WIKI = {
  engine: { title: 'Four-stroke engine', extract: 'A four-stroke engine is an internal combustion engine in which the piston completes four separate strokes while turning the crankshaft.\n== Intake ==\nThe piston moves down and draws the fuel-air mixture in through the intake valve.' },
  python: { title: 'Python (programming language)', extract: 'Python is a high-level, general-purpose programming language that emphasises code readability.\n== Criticism ==\nPython is slower than compiled languages for CPU-bound loops.' },
  javascript: { title: 'JavaScript', extract: 'JavaScript is a programming language and core technology of the web, run by every major browser.\n== Criticism ==\nIts implicit type coercion is a common source of bugs.' }
};
async function routeSources(ctx) {
  await ctx.route(/wikipedia\.org\/w\/api\.php/, r => {
    const u = decodeURIComponent(r.request().url()), key = /python/i.test(u) ? 'python' : /javascript/i.test(u) ? 'javascript' : /engine|stroke/i.test(u) ? 'engine' : null;
    const page = key && WIKI[key];
    const body = /list=search/.test(u) ? { query: { search: page ? [{ title: page.title }] : [] } } : { query: { pages: page ? { 1: { title: page.title, fullurl: 'https://en.wikipedia.org/wiki/' + page.title.replace(/ /g, '_'), extract: page.extract } } : {} } };
    r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  await ctx.route(/wikidata\.org/, r => r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: '{"search":[]}' }));
  await ctx.route(/thesportsdb\.com\/.*searchteams/, r => r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ teams: [{ idTeam: '133604', strTeam: 'Arsenal', strSport: 'Soccer', strLeague: 'English Premier League', strCountry: 'England' }] }) }));
  await ctx.route(/thesportsdb\.com\/.*eventslast/, r => r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ results: [{ dateEvent: '2026-11-07', strHomeTeam: 'Arsenal', strAwayTeam: 'Hull City', intHomeScore: '1', intAwayScore: '0', strLeague: 'English Premier League' }] }) }));
}

(async () => {
  ({ handle } = await import('../../server/gateway/handler.mjs')); ({ Usage } = await import('../../server/gateway/usage.mjs'));
  gwUsage = new Usage(ENV);
  await new Promise(r => server.listen(GW, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(port => {
    sessionStorage.setItem('acubins-role', 'student'); window.__limits = { aiPerMinute: 100, aiPerDay: 500 };
    localStorage.setItem('erly-ai-v1', JSON.stringify({ tier: 'online', consented: Date.now() }));
    Object.defineProperty(window, 'ERLY_AI_CONFIG', { configurable: true, get: () => ({ gateway: { url: 'http://localhost:' + port, name: 'Noor AI (Gemini)' }, limits: window.__limits || {} }), set() {} });
  }, GW);
  await routeSources(ctx);
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const gwBodies = []; p.on('request', r => { if (r.url().startsWith(`http://localhost:${GW}/v1/chat`)) gwBodies.push(JSON.parse(r.postData())); });
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); await p.click('.cmp-launch'); await p.waitForTimeout(800);
  const settle = () => p.waitForFunction(() => !document.querySelector('.cmp.is-gen') && !document.querySelector('.cmsg.is-writing') && !document.querySelector('.cmsg--typing'), null, { timeout: 30000 });
  const ask = async q => { await p.fill('#cmpText', q); await p.press('#cmpText', 'Enter'); await p.waitForTimeout(400); await settle(); await p.waitForTimeout(400); };
  const lastAI = () => p.locator('.cmsg--ai:not(.cmsg--note)').last();

  // 1 · grounded answer through the gateway: provider-independent client, cited sources, evidence label, IDs, privacy
  await ask('How does a four-stroke mechanical engine work?');
  let m = lastAI(), t = await m.textContent();
  assert.match(t, /intake, compression, power and exhaust/, '1: answered via the gateway');
  assert.match(t, /Sources/); assert.equal(await m.locator('a[href="https://en.wikipedia.org/wiki/Four-stroke_engine"]').count() >= 1, true, '1: the cited source is linked');
  assert.doesNotMatch(t, /\[9\]/, '1: an invented citation number is removed');
  assert.match(await m.locator('.cev').textContent(), /Retrieved sources/, '1: evidence label');
  const req1 = gwBodies[gwBodies.length - 1];
  assert.match(req1.conversation_id, /^conv-/); assert.match(req1.turn_id, /^t\d+-/); assert.match(req1.request_id, /^nr-/); assert.equal(req1.task, 'research');
  assert.match(req1.messages[0].content, /\[1\] Four-stroke engine/, '1: retrieved passages are sent as numbered sources');
  assert.doesNotMatch(JSON.stringify(req1), /Acubins(?! University)|@uni|erly-growth|Support Pact|handwriting|learning record/i, '1: no student identity or private records sent (the university name in Noor’s instructions is not personal)');
  assert.equal(geminiCalls[geminiCalls.length - 1].model, 'gemini-test', '1: the gateway used the configured model');
  if (SHOT) await p.screenshot({ path: SHOT + '/noor-grounded.png' });

  // 2 · off-topic reply → one controlled regeneration → correct answer; nothing unrelated stays on screen
  mode = 'offtopic-once'; let before = geminiCalls.length;
  await ask('How does a four-stroke mechanical engine work?');
  t = await lastAI().textContent();
  assert.match(t, /intake, compression/, '2: regenerated answer shown'); assert.doesNotMatch(t, /Presentation anxiety/, '2: the off-topic answer is gone');
  assert.equal(geminiCalls.length - before, 2, '2: exactly one regeneration');
  // 3 · off-topic twice → clear error, message kept, no unrelated content
  mode = 'offtopic-always'; before = geminiCalls.length;
  await ask('Explain how an electric motor converts energy');
  const log = await p.textContent('#cmpLog');
  assert.match(await lastAI().textContent(), /temporarily unable to complete this request/, '3: clear error');
  assert.equal(geminiCalls.length - before, 2, '3: no retry loop');
  assert.doesNotMatch((await lastAI().textContent()), /Presentation anxiety/);
  assert.match(await p.inputValue('#cmpText'), /electric motor/, '3: the message is still there');
  await p.fill('#cmpText', '');

  // 4 · quota exhausted → the sources retrieved for THIS question are quoted and labelled; no provider text
  mode = 'quota';
  await ask('How does a four-stroke mechanical engine work?');
  t = await lastAI().textContent();
  assert.match(t, /quoted, not written by the AI/, '4: honest AI-free answer');
  assert.match(t, /piston completes four separate strokes/, '4: quoted from the source');
  assert.doesNotMatch(await p.textContent('#cmpLog'), /generate_content|limit: 250|Quota exceeded/, '4: provider error text never shown');
  // …and the gateway paused Gemini, so the next question does not hit the exhausted quota again
  before = geminiCalls.length;
  await ask('What is photosynthesis in plants?');
  assert.equal(geminiCalls.length, before, '4: no requests to an exhausted provider');
  assert.match(await lastAI().textContent(), /temporarily unable|quoted/, '4: graceful');
  await p.fill('#cmpText', '');
  gwUsage.providers.gemini.pausedUntil = 0; // quota resets (simulated)

  // 5 · provider timeout before the first token → clear error, request ID as a support reference
  mode = 'hang';
  await ask('Explain the photoelectric effect in physics');
  assert.match(await lastAI().textContent(), /temporarily unable/, '5: timeout handled');
  assert.match(await p.textContent('#cmpLog'), /Support reference: nr-/, '5: support reference');
  await p.fill('#cmpText', ''); gwUsage.providers.gemini.pausedUntil = 0;

  // 6 · live question: a dated, live source and the "Live sources" label
  mode = 'ok';
  await ask('What was Arsenal’s latest result?');
  m = lastAI(); t = await m.textContent();
  assert.match(await m.locator('.cev').textContent(), /Live sources/, '6: live evidence label');
  assert.match(t, /TheSportsDB/); assert.match(t, /2026-11-07/, '6: the source date is shown');

  // 7 · comparison: structured instructions + a rendered table, no invented scores
  await ask('Python vs JavaScript');
  const req7 = gwBodies[gwBodies.length - 1];
  assert.equal(req7.task, 'compare'); assert.match(req7.messages[0].content, /This is a comparison of: Python, JavaScript/); assert.match(req7.messages[0].content, /Do not invent ratings/);
  assert.ok(await lastAI().locator('table').count(), '7: comparison table');

  // 8 · multiple rapid messages: only the newest question's answer remains
  mode = 'slow';
  await p.fill('#cmpText', 'What is photosynthesis?'); await p.press('#cmpText', 'Enter'); await p.waitForTimeout(300);
  await p.fill('#cmpText', 'How does a four-stroke engine work?'); await p.press('#cmpText', 'Enter');
  await p.waitForTimeout(500); await settle(); await p.waitForTimeout(600);
  t = await lastAI().textContent();
  assert.match(t, /four-stroke|intake/, '8: the newest question was answered'); mode = 'ok';

  // 9 · long conversation: 22 more turns; earlier questions summarised, still answers the latest
  for (let i = 0; i < 22; i++) { await p.fill('#cmpText', `Quick question number ${i} about cells`); await p.press('#cmpText', 'Enter'); await p.waitForTimeout(150); await settle(); }
  await ask('How does a four-stroke engine work?');
  const req9 = gwBodies[gwBodies.length - 1];
  assert.ok(req9.messages.length <= 32, '9: history is bounded (' + req9.messages.length + ' messages)');
  assert.match(req9.messages[0].content, /Earlier in this conversation the student asked about/, '9: older turns summarised, not dropped silently');
  assert.match(await lastAI().textContent(), /four-stroke|intake/);

  // 10 · usage manager: requests, provider and tokens counted on the device and in the gateway
  const use = await p.evaluate(() => ERLY.noorUsage.snapshot());
  assert.ok(use.ai.gemini && use.ai.gemini.ok >= 3 && use.ai.gemini.input > 0, '10: device counts tokens per provider: ' + JSON.stringify(use.ai));
  assert.ok(use.research.wikipedia && use.research.wikipedia.ok > 0, '10: research calls counted');
  const health = await (await fetch(`http://localhost:${GW}/v1/health`)).json();
  assert.ok(health.usage.providers.gemini.requests > 5 && health.usage.providers.gemini.quota >= 1, '10: gateway usage snapshot');
  assert.doesNotMatch(JSON.stringify(health), /test-key/);
  // device cap: a configurable per-device limit gives a friendly message instead of sending
  await p.evaluate(() => { window.__limits = { aiPerDay: 1 }; ERLY.noorUsage = window.ERLY_USAGE.create(localStorage, { aiPerDay: 1 }); });
  before = geminiCalls.length;
  await ask('Explain entropy in thermodynamics');
  assert.equal(geminiCalls.length, before, '10: capped device sends nothing');
  assert.match(await p.textContent('#cmpLog'), /daily limit of AI questions on this device/, '10: the device limit is explained');
  await p.evaluate(() => { ERLY.noorUsage = window.ERLY_USAGE.create(localStorage, {}); ERLY.noorUsage.reset(); });
  await p.fill('#cmpText', '');

  // 11 · phone + dark theme: the comparison table stacks into cards, no sideways scroll
  await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
  const card = await p.evaluate(() => { const t = [...document.querySelectorAll('.md-table table')].pop(); const td = t && t.querySelector('td'); return td ? { display: getComputedStyle(td).display, fits: [...t.querySelectorAll('td')].every(c => c.scrollWidth <= c.clientWidth + 1) } : null; });
  assert.ok(card && /block|grid|flex/.test(card.display) && card.fits, '11: tables stack on a phone');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '11: no sideways scroll');
  if (SHOT) await p.screenshot({ path: SHOT + '/noor-phone-dark.png' });

  assert.deepEqual(errors, [], 'no page errors');
  console.log('Noor platform e2e (real gateway, fake Gemini): all checks passed');
  await b.close(); server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
