'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../../assets/js/companion/knowledge.js');

test('every topic has bilingual content', () => {
  K.TOPICS.forEach(t => { assert.ok(t.title[0] && t.title[1], t.id); assert.ok(t.what[0].length > 40 && t.what[1].length > 40, t.id); t.signs.forEach(s => assert.ok(s[0] && s[1], t.id)); });
});
test('finds the topic and the aspect of the question', () => {
  const cases = [['what is dyslexia', 'dyslexia', 'what'], ['signs of ADHD', 'adhd', 'signs'], ['how do I get tested for ADHD', 'adhd', 'assess'], ['what helps with dyscalculia', 'dyscalculia', 'support'], ['is it true dyslexics see letters backwards', 'dyslexia', 'myths'], ['ما هي علامات عسر القراءة', 'dyslexia', 'signs'], ['how do I get assessed', 'assessment', 'assess'], ['I can’t follow lectures in noisy rooms, what is that', 'apd', 'what']];
  cases.forEach(([q, topic, asp]) => { const a = K.answer(q); assert.equal(a.topic, topic, q); assert.equal(a.aspect, asp, q); });
});
test('“do I have …?” offers the interview instead of a verdict', () => {
  const a = K.answer('do I have dyslexia?');
  assert.equal(a.kind, 'self-check');
  assert.match(a.en, /can’t diagnose/);
  assert.equal(a.chips[0].id, 'interview:reading');
});
test('feelings get empathy first', () => {
  const a = K.answer('I feel so overwhelmed with everything');
  assert.equal(a.kind, 'feeling');
  assert.ok(a.chips.length >= 2);
});
test('crisis language always gets crisis support', () => {
  ['I want to kill myself', 'sometimes I think about self-harm', 'أريد أن أموت'].forEach(t => assert.equal(K.answer(t).kind, 'crisis', t));
  assert.match(K.CRISIS_TEXT[0], /999/);
});
test('unknown questions are admitted, with suggestions', () => {
  const a = K.answer('qwerty zxcv');
  assert.equal(a.kind, 'unknown'); assert.ok(a.chips.length);
});
test('grounding context for an external model', () => {
  assert.match(K.context('signs of dyscalculia', 'en'), /Dyscalculia/);
  assert.equal(K.context('banana'), '');
});
test('everyday statements of difficulty are reflected back with an offer to explore', () => {
  [['I always have to re-read things', 'reading'], ['I keep missing deadlines', 'attention'], ['the lecturer talks too fast and I cant follow', 'listening'], ['I find it hard to start tasks', 'attention']].forEach(([t, area]) => {
    const a = K.answer(t);
    assert.equal(a.kind, 'reflect', t); assert.equal(a.area, area, t);
    assert.equal(a.chips[0].id, 'interview:' + area);
    assert.match(a.en, /Lots of things can cause it/);
  });
});
