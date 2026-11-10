// server/noor-core.mjs — request building, image validation, effort, streaming (with a fake Claude client).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../../server/noor-core.mjs');
const PNG = 'data:image/png;base64,' + Buffer.from('fakepngbytes').toString('base64');

test('OpenAI-style messages become Claude turns; images become real image blocks before the text', async () => {
  const { buildRequest } = await load();
  const r = buildRequest({ messages: [
    { role: 'system', content: 'You are Noor.' },
    { role: 'assistant', content: 'dropped: conversations must start with the student' },
    { role: 'user', content: 'what is ATP?' }, { role: 'assistant', content: 'ATP is…' },
    { role: 'user', content: [{ type: 'text', text: 'Explain this diagram' }, { type: 'image_url', image_url: { url: PNG } }] }
  ] });
  assert.equal(r.messages.length, 3); assert.equal(r.messages[0].role, 'user');
  const last = r.messages[2].content;
  assert.deepEqual(last.map(b => b.type), ['image', 'text']);
  assert.equal(last[0].source.media_type, 'image/png'); assert.equal(r.images, 1);
  assert.match(r.system, /^You are Noor\.[\s\S]*Never diagnose/, 'safety rules are added on the server');
});

test('invalid images are rejected, never silently dropped', async () => {
  const { buildRequest, BadRequest } = await load();
  const bad = url => () => buildRequest({ messages: [{ role: 'user', content: [{ type: 'text', text: 'x' }, { type: 'image_url', image_url: { url } }] }] });
  assert.throws(bad('data:application/pdf;base64,AAAA'), BadRequest);
  assert.throws(bad('https://example.com/a.png'), BadRequest);
  assert.throws(bad('data:image/png;base64,' + 'A'.repeat(7.2e6)), /image-too-large/);
  const five = Array.from({ length: 5 }, () => ({ type: 'image_url', image_url: { url: PNG } }));
  assert.throws(() => buildRequest({ messages: [{ role: 'user', content: five }] }), /too-many-images/);
});

test('reasoning depth follows the question', async () => {
  const { effortFor } = await load();
  assert.equal(effortFor('hi'), 'low');
  assert.equal(effortFor('Explain how photosynthesis works'), 'medium');
  assert.equal(effortFor('Prove that the square root of 2 is irrational'), 'high');
  assert.equal(effortFor('Prove it', { voice: true }), 'low');
});

function fakeClient(rounds) {
  const calls = [];
  return { calls, beta: { messages: { stream(params) {
    calls.push(JSON.parse(JSON.stringify(params)));
    const r = rounds[calls.length - 1];
    return { async *[Symbol.asyncIterator]() { for (const e of r.events) yield e; }, finalMessage: async () => r.final };
  } } } };
}
const text = t => ({ type: 'content_block_delta', delta: { type: 'text_delta', text: t } });

test('streams text, resumes a paused web-search turn, lists real cited sources, and uses Opus 5.5 with adaptive effort and fallbacks', async () => {
  const { buildRequest, streamAnswer } = await load();
  const client = fakeClient([
    { events: [text('Searching… ')], final: { stop_reason: 'pause_turn', content: [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } }] } },
    { events: [text('The answer'), { type: 'content_block_delta', delta: { type: 'citations_delta', citation: { url: 'https://www.nature.com/a', title: 'Nature article' } } }, text('.')], final: { stop_reason: 'end_turn', content: [] } }
  ]);
  let out = '';
  const r = await streamAnswer(client, buildRequest({ messages: [{ role: 'user', content: 'What did the latest JWST results show about exoplanet atmospheres? Explain.' }] }), { ERLY_WEB_SEARCH: '1' }, t => { out += t; });
  assert.equal(client.calls.length, 2, 'pause_turn resumed once');
  assert.equal(client.calls[1].messages.at(-1).role, 'assistant', 'resumed with the paused assistant turn, no extra user message');
  const p = client.calls[0];
  assert.equal(p.model, 'claude-opus-5-5'); assert.equal(p.output_config.effort, 'medium'); assert.equal(p.max_tokens, 16000);
  assert.equal(p.fallbacks, 'default'); assert.deepEqual(p.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(p.tools[0].type, 'web_search_20260209'); assert.equal(p.thinking, undefined, 'adaptive thinking (the model default) is not overridden');
  assert.match(out, /The answer\.[\s\S]*\*\*Sources\*\*\n- \[Nature article\]\(https:\/\/www\.nature\.com\/a\)/);
  assert.deepEqual(r.sources, ['https://www.nature.com/a']);
});

test('no web search unless enabled; refusals are reported plainly', async () => {
  const { buildRequest, streamAnswer } = await load();
  const client = fakeClient([{ events: [], final: { stop_reason: 'refusal', content: [] } }]);
  let out = '';
  await streamAnswer(client, buildRequest({ messages: [{ role: 'user', content: 'something' }] }), {}, t => { out += t; });
  assert.equal(client.calls[0].tools, undefined);
  assert.match(out, /can’t help with that request/);
});

test('request IDs: the browser’s ID is kept when well-formed, otherwise a fresh one is made', async () => {
  const { requestId } = await load();
  assert.equal(requestId({ request_id: 'nr-abc1234' }), 'nr-abc1234');
  for (const bad of [undefined, '', 'x', '<script>', 'a'.repeat(80), 42]) assert.match(requestId({ request_id: bad }), /^srv-[a-z0-9]+$/);
  assert.match(requestId(null), /^srv-/);
});
