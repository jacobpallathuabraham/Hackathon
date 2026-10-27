'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../../assets/js/companion/signals.js');
const Store = require('../../assets/js/companion/store.js');
const Voice = require('../../assets/js/companion/voice.js');
const LLM = require('../../assets/js/companion/llm.js');

const cfg = S.config();
const T0 = 5_000_000;
function frictionSession() {
  const s = S.createSession(T0);
  let t = T0;
  const sec = (key, index) => { t += 4000; S.record(s, { type: 'section', key, index, t }, cfg); };
  ['a', 'b', 'c', 'd'].forEach((k, i) => sec(k, i));
  for (let i = 0; i < 3; i++) { sec('b', 1); sec('d', 3); }
  const now = T0 + cfg.invite.warmupMs + 5000;
  return { s, now, sig: S.evaluate(s, null, cfg, now) };
}
const ctx = over => Object.assign({ consent: true, paused: false, invitations: 'on', conversationActive: false, snoozeUntil: 0 }, over);

test('no invitation without monitoring consent', () => {
  const { s, now, sig } = frictionSession();
  assert.deepEqual(S.shouldInvite(s, sig, ctx({ now, consent: false }), cfg), { invite: false, reason: 'no-consent' });
});
test('invitation when consented and friction persists', () => {
  const { s, now, sig } = frictionSession();
  const r = S.shouldInvite(s, sig, ctx({ now }), cfg);
  assert.equal(r.invite, true); assert.equal(r.signal, 'regression'); assert.equal(r.section, 'b');
});
test('paused, turned off, snoozed, mid-conversation: no invitation', () => {
  const { s, now, sig } = frictionSession();
  assert.equal(S.shouldInvite(s, sig, ctx({ now, paused: true }), cfg).reason, 'paused');
  assert.equal(S.shouldInvite(s, sig, ctx({ now, invitations: 'off' }), cfg).reason, 'invitations-off');
  assert.equal(S.shouldInvite(s, sig, ctx({ now, snoozeUntil: now + 1 }), cfg).reason, 'snoozed');
  assert.equal(S.shouldInvite(s, sig, ctx({ now, conversationActive: true }), cfg).reason, 'conversation-active');
});
test('no duplicate prompts: cooldown and a per-session maximum', () => {
  const { s, now, sig } = frictionSession();
  S.noteInvite(s, now);
  assert.equal(S.shouldInvite(s, sig, ctx({ now: now + 1000 }), cfg).reason, 'cooldown');
  S.noteInvite(s, now + cfg.invite.cooldownMs + 1);
  assert.equal(S.shouldInvite(s, sig, ctx({ now: now + 3 * cfg.invite.cooldownMs }), cfg).reason, 'max-per-session');
});
test('no invitation during the warm-up', () => {
  const { s, sig } = frictionSession();
  assert.equal(S.shouldInvite(s, sig, ctx({ now: T0 + 1000 }), cfg).reason, 'warming-up');
});

test('store: consent is never assumed, and each kind is separate', () => {
  const st = Store.create(Store.memoryStorage());
  assert.equal(st.consent('monitoring'), false); assert.equal(st.asked('monitoring'), false);
  st.setConsent('mic', true);
  assert.equal(st.consent('mic'), true); assert.equal(st.consent('llm'), false); assert.equal(st.consent('monitoring'), false);
});
test('store: baseline is only saved with monitoring consent, and withdrawing consent deletes it', () => {
  const mem = Store.memoryStorage();
  const st = Store.create(mem);
  st.setBaseline({ sessions: [{ minutes: 5, returnsPerMin: 1 }] });
  assert.equal(st.baseline().sessions.length, 0, 'not saved without consent');
  st.setConsent('monitoring', true);
  st.setBaseline({ sessions: [{ minutes: 5, returnsPerMin: 1 }] });
  assert.equal(Store.create(mem).baseline().sessions.length, 1, 'persisted');
  st.setConsent('monitoring', false);
  assert.equal(Store.create(mem).baseline().sessions.length, 0, 'deleted on withdrawal');
});
test('store: delete history keeps consent; delete everything removes it all', () => {
  const mem = Store.memoryStorage();
  const st = Store.create(mem);
  st.setConsent('monitoring', true);
  st.setBaseline({ sessions: [{ minutes: 5 }] });
  st.keepSummary({ id: 'x', sections: {} });
  st.setLab({ ratings: { spacing: 'easier' } });
  st.deleteHistory();
  let again = Store.create(mem);
  assert.equal(again.baseline().sessions.length, 0); assert.equal(again.summaries().length, 0); assert.equal(again.lab(), null);
  assert.equal(again.consent('monitoring'), true);
  st.deleteAll();
  assert.equal(mem.getItem(Store.KEY), null);
  again = Store.create(mem);
  assert.equal(again.asked('monitoring'), false);
});
test('store: only summary numbers are persisted — never raw events', () => {
  const mem = Store.memoryStorage();
  const st = Store.create(mem);
  st.setConsent('monitoring', true);
  const s = S.createSession(T0);
  S.record(s, { type: 'section', key: 'secret-para', index: 0, t: T0 + 10 }, cfg);
  st.setBaseline(S.addToBaseline(st.baseline(), S.sessionSummary(s, T0 + 5 * 60e3), cfg));
  const raw = mem.getItem(Store.KEY);
  assert.ok(!raw.includes('secret-para'));
  assert.deepEqual(Object.keys(JSON.parse(raw).baseline.sessions[0]).sort(), ['formatPerMin', 'minutes', 'panPerMin', 'returnsPerMin', 'ttsStarts', 'zoomPerMin']);
});
test('store: corrupt storage falls back safely', () => {
  const mem = Store.memoryStorage();
  mem.setItem(Store.KEY, '{not json');
  assert.equal(Store.create(mem).consent('monitoring'), false);
});

function fakeRecognition() {
  const made = [];
  class R { constructor() { made.push(this); } start() { this.started = true; } stop() { this.onend && this.onend(); } abort() { this.onend && this.onend(); } }
  return { R, made };
}
test('voice: the microphone never starts without consent', () => {
  const { R, made } = fakeRecognition();
  let consent = false; let err = null;
  const v = Voice.create({ synth: null, Recognition: R, getConsent: () => consent });
  assert.equal(v.listen({ onerror: e => { err = e; } }), false);
  assert.equal(err, 'no-consent'); assert.equal(made.length, 0);
  consent = true;
  assert.equal(v.listen({}), true); assert.equal(made.length, 1); assert.equal(made[0].started, true);
  v.stopListening(); assert.equal(v.state().listening, false);
});
test('voice: unsupported recognition is reported, not thrown', () => {
  let err = null;
  const v = Voice.create({ synth: null, Recognition: null, getConsent: () => true });
  assert.equal(v.supported.stt, false);
  assert.equal(v.listen({ onerror: e => { err = e; } }), false);
  assert.equal(err, 'unsupported');
});
test('voice: permission denial and no-speech errors reach the UI', () => {
  const { R, made } = fakeRecognition();
  const errs = [];
  const v = Voice.create({ synth: null, Recognition: R, getConsent: () => true });
  v.listen({ onerror: e => errs.push(e) });
  made[0].onerror({ error: 'not-allowed' });
  made[0].onerror({ error: 'no-speech' });
  assert.deepEqual(errs, ['not-allowed', 'no-speech']);
  v.abortListening();
});
test('voice: speech is interruptible, repeatable and skippable', () => {
  const spoken = []; let cancels = 0;
  const synth = { getVoices: () => [], cancel() { cancels++; }, speak(u) { spoken.push(u.text); }, pause() {}, resume() {} };
  class U { constructor(t) { this.text = t; } }
  const v = Voice.create({ synth, Utterance: U });
  v.speak('First sentence. Second one! Third?');
  assert.deepEqual(spoken, ['First sentence.']);
  v.skip(); assert.equal(spoken[1].trim(), 'Second one!');
  v.stop(); assert.equal(v.state().speaking, false);
  v.repeat(); assert.equal(spoken[2], 'First sentence.');
  assert.ok(cancels >= 3);
});

test('llm: nothing is sent without external-AI consent', async () => {
  let calls = 0;
  const a = LLM.create({ endpoint: 'https://example.test/api', getConsent: () => false, fetch: async () => { calls++; return { ok: true, json: async () => ({}) }; } });
  const r = await a.interpret({ question: 'q', answer: 'a', allowed: ['yes'] });
  assert.equal(calls, 0); assert.equal(r.source, 'rules');
});
test('llm: payload is minimal and redacted', async () => {
  let body = null;
  const a = LLM.create({ endpoint: 'https://example.test/api', getConsent: () => true, fetch: async (u, o) => { body = JSON.parse(o.body); return { ok: true, json: async () => ({ intents: ['yes'], ack: 'Thanks.' }) }; } });
  await a.interpret({ question: 'Q?', answer: 'mail me at a.b@uni.ac.ae or 050 123 4567', allowed: ['yes'], lang: 'en', telemetry: { returns: 9 }, name: 'Acubins' });
  assert.deepEqual(Object.keys(body).sort(), ['allowed', 'answer', 'lang', 'question']);
  assert.ok(!body.answer.includes('@') && !body.answer.includes('4567'));
});
test('llm: output is validated — unknown intents and diagnostic wording are dropped', async () => {
  const a = LLM.create({ endpoint: 'https://example.test/api', getConsent: () => true, fetch: async () => ({ ok: true, json: async () => ({ intents: ['yes', 'diagnose_dyslexia'], ack: 'This looks like dyslexia (80% likely).' }) }) });
  const r = await a.interpret({ question: 'q', answer: 'a', allowed: ['yes', 'no'] });
  assert.deepEqual(r.intents, ['yes']); assert.equal(r.ack, '');
});
test('llm: network errors and timeouts fall back to the rules', async () => {
  const a = LLM.create({ endpoint: 'https://example.test/api', getConsent: () => true, fetch: async () => { throw new Error('offline'); } });
  const r = await a.interpret({ question: 'q', answer: 'a', allowed: [] });
  assert.equal(r.source, 'rules'); assert.equal(r.fallback, 'offline');
  const b = LLM.create({ endpoint: 'https://example.test/api', getConsent: () => true, timeoutMs: 20, fetch: (u, o) => new Promise((res, rej) => o.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); })) });
  assert.equal((await b.interpret({ question: 'q', answer: 'a', allowed: [] })).fallback, 'timeout');
});
test('llm: with no endpoint configured the adapter is the simulated demo', async () => {
  const a = LLM.create({ endpoint: '', getConsent: () => true });
  assert.equal(a.configured, false); assert.equal(a.active().simulated, true);
});
