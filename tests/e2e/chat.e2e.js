// v11 chat reliability: sending (Enter, Shift+Enter, Send button, while a reply streams),
// image attachments end to end (validation → preview → remove → request → vision model → reply),
// honest handling when no vision model is connected or the server fails, stop,
// and scrolling that stays inside the chat.
// A local fake server speaks exactly the OpenAI-style SSE format of server/noor-core.mjs.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/chat.e2e.js
'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { chromium, devices } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const FIX = path.join(__dirname, '..', 'fixtures');

// ---- fake vision model server ----
const seen = []; let mode = 'ok';
const srv = http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let raw = ''; req.on('data', c => { raw += c; });
  req.on('end', async () => {
    const body = JSON.parse(raw); seen.push(body);
    if (mode === 'fail') { res.writeHead(500, cors); return res.end('{"error":"upstream"}'); }
    res.writeHead(200, Object.assign({ 'content-type': 'text/event-stream' }, cors));
    const last = body.messages[body.messages.length - 1];
    const parts = Array.isArray(last.content) ? last.content : [{ type: 'text', text: last.content }];
    const nImg = parts.filter(p => p.type === 'image_url').length;
    const words = (nImg ? `I can see ${nImg} image(s): a yellow square on a blue background. ` : 'Here is a careful answer. ').split(' ');
    const slow = mode === 'slow';
    for (let i = 0; i < (slow ? 200 : words.length); i++) {
      if (res.destroyed) return;
      res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: (words[i % words.length] || 'more') + ' ' } }] })}\n\n`);
      await new Promise(r => setTimeout(r, slow ? 60 : 5));
    }
    res.end('data: [DONE]\n\n');
  });
}).listen(8791);

(async () => {
  const b = await chromium.launch(); const errors = [];
  const run = async (dev, useAI) => {
    const ctx = await b.newContext({ ...devices[dev] });
    await ctx.addInitScript(ai => {
      sessionStorage.setItem('acubins-role', 'student');
      window.__media = 0; if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.__media++; return Promise.reject(new Error('no')); };
      if (ai) localStorage.setItem('erly-ai-v1', JSON.stringify({ tier: 'online', consented: Date.now() }));
      // the AI config points at the local fake vision server for this test
      Object.defineProperty(window, 'ERLY_AI_CONFIG', { configurable: true, get: () => ({ endpoint: '', online: ai ? { name: 'Claude', site: 'test server', model: 'claude', vision: true, url: 'http://localhost:8791/v1/chat/completions', get: '' } : null }), set() {} });
    }, useAI);
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(dev + ': ' + e.message));
    await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200);
    await p.click('.cmp-launch'); await p.waitForTimeout(900);
    return { ctx, p };
  };
  const aiText = p => p.locator('.cmsg--ai').last().textContent();
  const settle = p => p.waitForFunction(() => !document.querySelector('.cmp.is-gen') && !document.querySelector('.cmsg.is-writing'), null, { timeout: 15000 });

  /* ---- with a vision-capable AI server ---- */
  let { ctx, p } = await run('iPad Pro 11', true);
  assert.equal(await p.evaluate(() => ERLY.companion._ui.ai.ready() && ERLY.companion._ui.ai.canSee()), true, 'the vision server is the brain');
  await p.fill('#cmpText', 'What is entropy?'); await p.press('#cmpText', 'Enter'); await settle(p);
  assert.match(await aiText(p), /careful answer/, 'Enter sends and the reply streams in');
  await p.fill('#cmpText', 'line one'); await p.press('#cmpText', 'Shift+Enter'); await p.type('#cmpText', 'line two');
  assert.equal(await p.inputValue('#cmpText'), 'line one\nline two', 'Shift+Enter adds a new line');
  await p.click('#cmpSend'); await settle(p);
  assert.equal(await p.inputValue('#cmpText'), '', 'Send button sends');
  // attachments: invalid file rejected; PNG + JPEG previewed; one removed
  await p.setInputFiles('#cmpFile', [path.join(FIX, 'notes.txt')]);
  assert.match(await p.textContent('#cmpImgs'), /isn’t a PNG, JPEG or WebP/, 'unsupported files are refused with a reason');
  await p.setInputFiles('#cmpFile', [path.join(FIX, 'diagram.png'), path.join(FIX, 'photo.jpg')]);
  await p.waitForFunction(() => document.querySelectorAll('#cmpImgs .cmp__img').length === 2);
  await p.click('#cmpImgs [data-unimg="1"]');
  assert.equal(await p.locator('#cmpImgs .cmp__img').count(), 1, 'an image can be removed before sending');
  seen.length = 0;
  await p.fill('#cmpText', 'What does this diagram show?'); await p.press('#cmpText', 'Enter'); await settle(p);
  const last = seen[0].messages[seen[0].messages.length - 1];
  assert.ok(Array.isArray(last.content) && last.content.some(x => x.type === 'image_url' && /^data:image\/png;base64,/.test(x.image_url.url)), 'the PNG reached the AI server as an image part');
  assert.equal(last.content.find(x => x.type === 'text').text, 'What does this diagram show?');
  assert.match(await aiText(p), /I can see 1 image/, 'the vision model’s answer is shown');
  assert.equal(await p.locator('.cmsg--you').last().locator('.cmsg__imgs img').count(), 1, 'the sent image is shown in the student’s bubble');
  assert.equal(await p.locator('#cmpImgs .cmp__img').count(), 0, 'composer cleared after sending');
  // image only, no text → a sensible default question
  await p.setInputFiles('#cmpFile', [path.join(FIX, 'photo.jpg')]); await p.waitForSelector('#cmpImgs .cmp__img');
  await p.click('#cmpSend'); await settle(p);
  assert.match(await aiText(p), /I can see 1 image/);
  // server failure: the image is NOT pretended-analysed and comes back to the composer
  mode = 'fail';
  await p.setInputFiles('#cmpFile', [path.join(FIX, 'diagram.png')]); await p.waitForSelector('#cmpImgs .cmp__img');
  await p.fill('#cmpText', 'explain this'); await p.press('#cmpText', 'Enter'); await settle(p);
  await p.waitForFunction(() => /has not been analysed/.test(document.querySelector('#cmpLog').textContent), null, { timeout: 8000 }).catch(() => {});
  assert.match(await aiText(p), /has not been analysed/, 'failure is stated plainly');
  assert.equal(await p.locator('#cmpImgs .cmp__img').count(), 1, 'the image is restored for a retry');
  assert.equal(await p.inputValue('#cmpText'), 'explain this', 'and so is the question');
  mode = 'ok'; await p.press('#cmpText', 'Enter'); await settle(p);
  assert.match(await aiText(p), /I can see 1 image/, 'retry works');
  // stop a long reply; Enter while writing sends the new message
  mode = 'slow';
  await p.fill('#cmpText', 'Write a long essay'); await p.press('#cmpText', 'Enter');
  await p.waitForSelector('.cmp.is-gen'); await p.waitForTimeout(500);
  await p.click('#cmpSend'); await p.waitForTimeout(400);
  assert.equal(await p.locator('.cmp.is-gen').count(), 0, 'Stop ends the reply');
  mode = 'slow';
  await p.fill('#cmpText', 'first question'); await p.press('#cmpText', 'Enter'); await p.waitForSelector('.cmp.is-gen'); await p.waitForTimeout(300);
  mode = 'ok';
  const youBefore = await p.locator('.cmsg--you').count();
  await p.fill('#cmpText', 'second question'); await p.press('#cmpText', 'Enter');
  await p.waitForFunction(() => /second question/.test((document.querySelectorAll('.cmsg--you')[document.querySelectorAll('.cmsg--you').length - 1] || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
  await settle(p);
  assert.equal(await p.locator('.cmsg--you').count(), youBefore + 1, 'Enter while Noor is writing sends the new message (not just stop)');
  assert.match(await p.locator('.cmsg--you').last().textContent(), /second question/);
  // scrolling: 30+ messages, the page never moves; reading older messages isn't interrupted
  for (let i = 0; i < 14; i++) { await p.fill('#cmpText', 'q' + i); await p.press('#cmpText', 'Enter'); await settle(p); }
  const box = await p.locator('#cmpLog').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const pageY = await p.evaluate(() => scrollY);
  for (let i = 0; i < 12; i++) await p.mouse.wheel(0, -900);
  await p.waitForTimeout(400);
  const top = await p.evaluate(() => document.querySelector('#cmpLog').scrollTop);
  assert.equal(top, 0, 'scrolled to the very first message');
  for (let i = 0; i < 4; i++) await p.mouse.wheel(0, -900);
  assert.equal(await p.evaluate(() => scrollY), pageY, 'the page behind never scrolls');
  mode = 'slow';
  await p.evaluate(() => { document.getElementById('cmpText').value = 'another'; document.getElementById('cmpForm').requestSubmit(); });
  await p.waitForTimeout(1500); // the view settles on the message just sent, then the student scrolls up to read
  await p.mouse.wheel(0, -2000); await p.waitForTimeout(700);
  const readPos = await p.evaluate(() => document.querySelector('#cmpLog').scrollTop);
  await p.waitForTimeout(1200);
  assert.ok(Math.abs(await p.evaluate(() => document.querySelector('#cmpLog').scrollTop) - readPos) < 5, 'a streaming reply does not drag the reader down');
  assert.equal(await p.isVisible('#cmpNewMsg'), true, '“New messages” appears');
  await p.click('#cmpNewMsg'); await p.waitForTimeout(700);
  assert.ok(await p.evaluate(() => { const l = document.querySelector('#cmpLog'); return l.scrollHeight - l.scrollTop - l.clientHeight < 200; }), 'and jumps to the latest');
  await p.click('#cmpSend'); mode = 'ok';
  assert.equal(await p.evaluate(() => window.__media), 0, 'the microphone was never requested');
  await ctx.close();

  /* ---- no AI connected (the default): an image is never pretended-read ---- */
  ({ ctx, p } = await run('iPhone 13', false));
  await p.setInputFiles('#cmpFile', [path.join(FIX, 'diagram.png')]); await p.waitForSelector('#cmpImgs .cmp__img');
  await p.fill('#cmpText', 'what is this?'); await p.press('#cmpText', 'Enter');
  await p.waitForFunction(() => /haven’t looked at your image/.test(document.querySelector('#cmpLog').textContent), null, { timeout: 8000 }).catch(() => {});
  assert.match(await aiText(p), /haven’t looked at your image/, 'says plainly that the image was not analysed');
  assert.equal(await p.locator('#cmpImgs .cmp__img').count(), 1, 'image kept in the composer');
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(ov <= 1, 'no sideways scroll on a phone');
  await p.screenshot({ path: process.env.SHOT || '/tmp/chat-mobile.png' });
  await ctx.close();

  assert.deepEqual(errors, [], 'no page errors');
  console.log('chat reliability + images e2e: all checks passed');
  await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
