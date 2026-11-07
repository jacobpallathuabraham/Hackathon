'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const PR = require('../../assets/js/companion/prosody.js');
const VL = require('../../assets/js/companion/voicelib.js');
const VX = require('../../assets/js/companion/voice.js');

test('each sentence gets a tone from what it says and the conversation', () => {
  assert.equal(PR.classify('Congratulations, you did it!'), 'enthusiastic');
  assert.equal(PR.classify('That sounds really stressful.'), 'empathetic');
  assert.equal(PR.classify('Be careful: never share your password.'), 'serious');
  assert.equal(PR.classify('Have you ever wondered why?'), 'curious');
  assert.equal(PR.classify('Because energy is conserved, the answer is 4.', { user: 'I am so confused' }), 'reassuring', 'a confused student gets a calmer explanation');
  assert.equal(PR.classify('Nice.', { user: 'I passed my exam!', first: true }), 'enthusiastic');
});

test('tones change pace, pitch and pauses — gently, and scaled by expressiveness', () => {
  const happy = PR.prosody('enthusiastic', 1), calm = PR.prosody('reassuring', 1), flat = PR.prosody('enthusiastic', 0);
  assert.ok(happy.rate > 1 && happy.pitch > 1);
  assert.ok(calm.rate < 1 && calm.pause > 0);
  assert.deepEqual([flat.rate, flat.pitch, flat.pause], [1, 1, 0]);
  for (const t of PR.tones) { const p = PR.prosody(t, 1.5); assert.ok(p.rate > 0.8 && p.rate < 1.15 && p.pitch > 0.88 && p.pitch < 1.2, t + ' stays natural'); }
});

test('written text becomes speakable text without changing its meaning', () => {
  const s = PR.speechify('On 2026-11-07 we drove 60 km/h for 5-10 min at 25°C, x^2 ≈ 3/4. Dr. Ali vs. Fig. 2');
  assert.match(s, /7 November 2026/); assert.match(s, /60 kilometres per hour/); assert.match(s, /5 to 10 minutes/);
  assert.match(s, /25 degrees Celsius/); assert.match(s, /x squared approximately 3 over 4/); assert.match(s, /Doctor Ali versus figure 2/);
  assert.match(PR.speechify('Meet Siobhan.', 'en', [{ word: 'Siobhan', say: 'shiv-awn' }]), /shiv-awn/, 'student pronunciations');
  assert.equal(PR.speechify('مرحبا 2026-11-07', 'ar'), 'مرحبا 2026-11-07', 'Arabic left to the Arabic voice');
});

test('voice profiles only use voices that exist, and never share one', () => {
  const V = ['Ava|en-US', 'Andrew|en-US', 'Sonia|en-GB', 'Neerja|en-IN', 'Prabhat|en-IN', 'Hamdan|ar-AE', 'Fatima|ar-AE'].map(x => { const [n, l] = x.split('|'); return { name: `Microsoft ${n} Online (Natural) - ${l}`, lang: l }; });
  const r = VL.resolve(V, { score: VX.naturalScore, gender: VX.gender });
  const names = r.available.map(x => x.voice.name);
  assert.equal(new Set(names).size, names.length, 'no two profiles play the same voice');
  const by = id => r.available.find(x => x.profile.id === id);
  assert.match(by('meera').voice.name, /Neerja/); assert.match(by('arjun').voice.name, /Prabhat/);
  assert.match(by('noura').voice.name, /Fatima/); assert.match(by('fahd').voice.name, /Hamdan/);
  assert.ok(r.missing.some(p => p.id === 'kai'), 'no Australian voice → Kai is listed as unavailable');
  assert.equal(r.available.length + r.missing.length, VL.profiles.length);
  assert.equal(VL.resolve([], {}).available.length, 0, 'no voices → nothing offered');
});
