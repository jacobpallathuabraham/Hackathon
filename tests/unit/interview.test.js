'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../../assets/js/companion/interview.js');

// answer every question with a function of the question
function run(area, pick, objective) {
  const iv = I.create(area);
  let r = I.start(iv), q = r.question, guard = 0;
  while (q && guard++ < 40) {
    const res = I.answer(iv, pick(q));
    if (res.done) break;
    q = res.question;
  }
  return { iv, out: I.result(iv, objective) };
}
const allFreq = v => q => (q.kind === 'freq' ? { option: String(v) } : q.kind === 'yn' ? { option: 'yes' } : { option: q.options[0].id });

test('every module starts with an intro and a question', () => {
  I.AREAS.forEach(a => { const iv = I.create(a); const s = I.start(iv); assert.ok(s.intro[0].length > 20); assert.ok(s.question.q[0].length > 10); });
});
test('consistently low answers end early with a low level', () => {
  const { iv, out } = run('reading', q => (q.kind === 'freq' ? { option: '0' } : q.kind === 'yn' ? { option: 'no' } : { option: 'unsure' }));
  assert.equal(out.level, 'low');
  assert.ok(iv.asked < I.MODULES.reading.items.length, 'skips the deeper questions');
});
test('frequent difficulties + childhood history + first language = clear pattern for reading', () => {
  const { out } = run('reading', q => (q.kind === 'freq' ? { option: '3' } : q.kind === 'yn' ? { option: 'yes' } : { option: 'both' }));
  assert.equal(out.level, 'strong');
  assert.match(out.headline[0], /worth a formal assessment/);
  assert.match(out.headline[0], /doesn’t mean you have it/);
});
test('reading difficulties only in a second language are downgraded', () => {
  const { out } = run('reading', q => (q.kind === 'freq' ? { option: '3' } : q.kind === 'yn' ? { option: 'yes' } : { option: 'second' }));
  assert.notEqual(out.level, 'strong');
  assert.ok(out.notes.some(n => /language load/.test(n[0])));
});
test('ADHD needs childhood onset, more than one setting and impact for a clear pattern', () => {
  const yes = run('attention', allFreq(4));
  assert.equal(yes.out.level, 'strong');
  const noOnset = run('attention', q => (q.kind === 'freq' ? { option: '4' } : q.kind === 'yn' ? { option: q.role === 'history' ? 'no' : 'yes' } : { option: 'gt7' }));
  assert.equal(noOnset.out.level, 'some');
  assert.ok(noOnset.out.notes.some(n => /childhood/.test(n[0])));
});
test('rule-outs are suggested: sleep, eye test, hearing test', () => {
  const att = run('attention', q => (q.kind === 'freq' ? { option: '3' } : q.kind === 'yn' ? { option: 'yes' } : { option: 'lt6' }));
  assert.ok(att.out.checks.some(c => /Sleep/.test(c[0])));
  const lis = run('listening', q => (q.kind === 'freq' ? { option: '3' } : { option: q.id === 'x1' ? 'no' : 'yes' }));
  assert.ok(lis.out.checks.some(c => /hearing test/i.test(c[0])));
});
test('objective evidence that agrees raises the level; disagreement is explained', () => {
  const some = run('maths', q => (q.kind === 'freq' ? { option: q.id === 'm1' || q.id === 'm2' ? '3' : '1' } : { option: 'no' }));
  assert.equal(some.out.level, 'some');
  const withObj = I.result(some.iv, 'some');
  assert.equal(withObj.level, 'strong'); assert.equal(withObj.agreement, 'agrees');
  const low = run('maths', q => (q.kind === 'freq' ? { option: '0' } : { option: 'no' }), 'strong');
  assert.equal(low.out.agreement, 'differs');
});
test('free speech is understood: frequency words and yes/no in English and Arabic', () => {
  assert.equal(I.parseFreq('honestly, all the time'), 4);
  assert.equal(I.parseFreq('yeah pretty often'), 3);
  assert.equal(I.parseFreq('أحياناً'), 2);
  assert.equal(I.parseFreq('rarely'), 1);
  assert.equal(I.parseYN('Yes I did'), 'yes');
  assert.equal(I.parseYN('لا'), 'no');
  assert.equal(I.parseYN("I can't remember"), 'unsure');
  const iv = I.create('reading'); I.start(iv);
  assert.equal(I.answer(iv, { text: 'pretty often' }).question.id, 'r2');
  assert.equal(I.answer(iv, { text: 'banana' }).clarify, true);
});
test('skipping and stopping give an unclear result, never a guess', () => {
  const { out } = run('social', () => ({ text: 'skip' }));
  assert.equal(out.level, 'unclear');
  const iv = I.create('writing'); I.start(iv);
  assert.equal(I.answer(iv, { text: 'stop the questions' }).stopped, true);
  assert.equal(I.result(iv).level, 'unclear');
});
test('the safety question is only asked when mood is low, and a yes stops everything for crisis support', () => {
  const ok = run('wellbeing', q => (q.kind === 'freq' ? { option: '1' } : { option: 'no' }));
  assert.ok(!('s1' in ok.iv.answers));
  const low = run('wellbeing', q => (q.kind === 'freq' ? { option: '4' } : { option: 'yes' }));
  assert.equal(low.iv.crisis, true); assert.equal(low.out.crisis, true);
});
test('outcomes never contain probabilities or percentages', () => {
  I.AREAS.forEach(a => [0, 2, 4].forEach(v => {
    const { out } = run(a, allFreq(v), v === 4 ? 'strong' : 'none');
    assert.doesNotMatch(JSON.stringify(out), /\d+\s?%|probab|likelihood|chance/i, a);
  }));
});
