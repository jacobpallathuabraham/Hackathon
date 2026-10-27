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

test('the knowledge base is large, bilingual and internally linked', () => {
  assert.ok(K.TOPICS.length >= 50, 'topics: ' + K.TOPICS.length);
  assert.ok(K.FAQS.length >= 10);
  const ids = new Set(K.TOPICS.map(t => t.id));
  assert.equal(ids.size, K.TOPICS.length, 'unique ids');
  K.TOPICS.forEach(t => {
    t.related.forEach(r => assert.ok(ids.has(r), `${t.id} → ${r}`));
    ['similar', 'assess', 'support', 'myths'].forEach(k => assert.equal(!!t[k][0], !!t[k][1], `${t.id}.${k} has both languages`));
  });
  K.FAQS.forEach(f => { assert.ok(ids.has(f.topic), f.topic); assert.ok(f.a[0] && f.a[1]); });
});
test('new topics are found, including in Arabic', () => {
  [['what is developmental language disorder', 'dld'], ['tips for working memory', 'working-memory'], ['how do I stop procrastinating', 'procrastination'],
    ['what are my rights as a person of determination', 'uae-rights'], ['what happens at my first appointment with student accessibility services', 'sas'],
    ['can coloured overlays help', 'visual-stress'], ['how much sleep do I need', 'sleep'], ['ما هي الذاكرة العاملة', 'working-memory'], ['exam tips please', 'exams'],
    ['what is executive function', 'executive'], ['should I tell my professor', 'disclosure']].forEach(([q, id]) => assert.equal(K.answer(q).topic, id, q));
});
test('small typos still find the topic', () => {
  ['what is dyslexa', 'signs of dyscalcula', 'what is dysgrapia'].forEach(q => assert.ok(K.answer(q).topic, q));
  assert.equal(K.answer('what is dyslexa').topic, 'dyslexia');
});
test('quick facts answer common questions directly', () => {
  assert.match(K.answer('is dyslexia genetic?').en, /run strongly in families/);
  assert.match(K.answer('will it show on my transcript?').en, /confidential/);
  assert.match(K.answer('can adults be diagnosed?').en, /university or later/);
});
test('follow-ups use the conversation so far', () => {
  const a = K.answer('what is dyslexia');
  const m = K.answer('tell me more', 'en', { topic: a.topic, aspect: a.aspect, seen: ['what'] });
  assert.equal(m.topic, 'dyslexia'); assert.equal(m.aspect, 'signs');
  const s = K.answer('can you say that more simply?', 'en', { topic: 'adhd', aspect: 'what' });
  assert.equal(s.aspect, 'simple'); assert.match(s.en, /^In short:/);
  const h = K.answer('how is it assessed?', 'en', { topic: 'dyscalculia', aspect: 'what' });
  assert.equal(h.topic, 'dyscalculia'); assert.equal(h.aspect, 'assess');
  const all = K.answer('more', 'en', { topic: 'colour-vision', seen: ['what', 'support'] });
  assert.equal(all.aspect, 'done');
});
test('comparisons explain both and how to tell them apart', () => {
  const c = K.answer('what is the difference between dyslexia and ADHD?');
  assert.equal(c.aspect, 'compare'); assert.deepEqual(c.compared.slice().sort(), ['adhd', 'dyslexia']);
  assert.match(c.en, /tell them apart/);
  const f = K.answer('how is that different from DLD?', 'en', { topic: 'apd' });
  assert.deepEqual(f.compared, ['apd', 'dld']);
});
test('Noor can list what she knows', () => {
  const l = K.answer('what can you answer?');
  assert.match(l.en, /Learning differences:/); assert.match(l.en, /Rights & support:/);
});
test('grounding context includes up to two topics', () => {
  const c = K.context('dyslexia vs adhd', 'en');
  assert.match(c, /Dyslexia/); assert.match(c, /ADHD/);
});
