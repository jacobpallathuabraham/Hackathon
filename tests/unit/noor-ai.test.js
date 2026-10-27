'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const MD = require('../../assets/js/companion/md.js');
const AI = require('../../assets/js/companion/ai.js');

test('markdown never lets markup or scripts through', () => {
  const h = MD.render('<img src=x onerror=alert(1)> **bold** [x](javascript:alert(1)) <script>bad()</script>');
  assert.doesNotMatch(h, /<img|<script|href="javascript/);
  assert.match(h, /&lt;img/); assert.match(h, /<strong>bold<\/strong>/);
});
test('markdown renders lists, headings, code, tables and links', () => {
  const h = MD.render('## Plan\n1. Read\n2. **Test** yourself\n   - flashcards\n\n```js\nlet a = 1 < 2;\n```\n| Day | Task |\n|---|---|\n| Mon | Review |\n\nSee [SAS](https://example.org).');
  assert.match(h, /<h4>Plan<\/h4>/);
  assert.match(h, /<ol><li[^>]*>Read<\/li><li[^>]*><strong>Test<\/strong> yourself<ul><li>flashcards<\/li><\/ul><\/li><\/ol>/);
  assert.match(h, /<pre><code>let a = 1 &lt; 2;<\/code><\/pre>/);
  assert.match(h, /<th>Day<\/th>.*<td>Review<\/td>/);
  assert.match(h, /<a href="https:\/\/example.org" target="_blank" rel="noopener noreferrer">SAS<\/a>/);
});
test('an unfinished code fence still renders while streaming', () => {
  assert.match(MD.render('Here:\n```py\nprint(1)'), /<pre><code>print\(1\)<\/code><\/pre>/);
});
test('plain text for speech drops markdown', () => {
  assert.equal(MD.toText('## Hi\n- **one**\n- two'), 'Hi\none\ntwo');
});
test('the system prompt carries the safety rules, voice style and reading', () => {
  const s = AI.systemPrompt({ lang: 'en', voice: true, care: true, reading: { title: 'A.pdf', course: 'C', page: 3, heading: 'H', text: 'body', quote: 'q' } });
  assert.match(s, /Never diagnose/); assert.match(s, /999/); assert.match(s, /800 4673/);
  assert.match(s, /ONE gentle follow-up question/); assert.match(s, /A\.pdf/); assert.match(s, /<<<q>>>/);
  assert.match(AI.systemPrompt({ lang: 'ar' }), /Reply in Arabic/);
});
test('messages alternate, start with the user and end with the new message', () => {
  const m = AI.buildMessages([{ role: 'assistant', text: 'hello' }, { role: 'user', text: 'a' }, { role: 'user', text: 'b' }, { role: 'assistant', text: 'c' }], 'new', {});
  assert.deepEqual(m.map(x => x.role), ['system', 'user', 'assistant', 'user']);
  assert.equal(m[1].content, 'a\nb'); assert.equal(m[3].content, 'new');
});
test('thinking is hidden, even half-written', () => {
  assert.equal(AI.visible('<think>hmm</think>Answer'), 'Answer');
  assert.equal(AI.visible('Ans<think>still thin'), 'Ans');
});
test('verdicts about the student are caught; general explanations are not', () => {
  assert.equal(AI.unsafe('Based on this, you probably have dyslexia.'), true);
  assert.equal(AI.unsafe('There is a 70% chance this is ADHD.'), true);
  assert.equal(AI.unsafe('Dyslexia is a common learning difference that affects reading.'), false);
  assert.equal(AI.unsafe('Many students with ADHD find timers helpful.'), false);
});
test('sentences are released for speech as soon as they are complete', () => {
  const r = AI.takeSentences('That sounds hard. When did it start? I wonder');
  assert.deepEqual(r.done, ['That sounds hard.', 'When did it start?']);
  assert.equal(r.rest, 'I wonder');
});
test('the engine streams from an on-device model and blocks unsafe replies', async () => {
  global.window = global; const navDesc = Object.getOwnPropertyDescriptor(global, 'navigator'); Object.defineProperty(global, 'navigator', { value: { gpu: { requestAdapter: async () => ({ features: new Set(['shader-f16']) }) } }, configurable: true });
  global.localStorage = { _: {}, getItem(k) { return this._[k] || null; }, setItem(k, v) { this._[k] = v; } };
  let reply = ['Hi', ' there', '!'];
  const fake = { hasModelInCache: async () => false, CreateMLCEngine: async (id, o) => { o.initProgressCallback({ progress: 1, text: 'ok' }); return { interruptGenerate() {}, chat: { completions: { create: async () => (async function* () { for (const d of reply) yield { choices: [{ delta: { content: d } }] }; })() } } }; } };
  const eng = AI.create({ importer: async () => fake });
  assert.equal(eng.ready(), false);
  assert.equal(await eng.useWebLLM('lite'), true);
  assert.equal(eng.ready(), true);
  const seen = [];
  assert.equal(await eng.generate([{ role: 'user', content: 'x' }], { onToken: t => seen.push(t) }), 'Hi there!');
  assert.deepEqual(seen, ['Hi', 'Hi there', 'Hi there!']);
  reply = ['Honestly', ', you have ADHD.'];
  await assert.rejects(eng.generate([{ role: 'user', content: 'x' }]), /unsafe/);
  assert.match(JSON.stringify(localStorage._), /webllm/);
  if (navDesc) Object.defineProperty(global, 'navigator', navDesc); else delete global.navigator; delete global.localStorage; delete global.window;
});
test('half-written markdown never hangs the renderer', () => {
  const samples = ['## ', '#', '```js extra', '| a |', '> ', '- ', '1.', '**', '---', '###### deep', '|---|', '```'];
  for (const s of samples) for (const pre of ['', 'Text\n', 'Text\n\n']) assert.equal(typeof MD.render(pre + s), 'string');
  // every prefix of a real reply renders
  const full = '## Plan\n- **one**\n  - sub\n1. two\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```py\nx = 1\n```\n> quote';
  for (let i = 0; i <= full.length; i++) MD.render(full.slice(0, i));
});
