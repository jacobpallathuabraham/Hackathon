// Learning Studio logic: grading, the maths parser, spaced repetition, and the insight engine's safeguards.
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const G = require('../../assets/js/learn/ls-grade.js'), S = require('../../assets/js/learn/ls-srs.js'), I = require('../../assets/js/learn/ls-intel.js');
const DAY = 864e5, NOW = Date.UTC(2026, 10, 15, 12);

test('maths parser: precedence, implicit multiplication, functions, and safe failure', () => {
  assert.equal(G.evaluate('2+3*4'), 14); assert.equal(G.evaluate('2^3^2'), 512); assert.equal(G.evaluate('-2^2'), -4);
  assert.equal(G.evaluate('2x', { x: 5 }), 10); assert.equal(G.evaluate('3(x+1)', { x: 2 }), 9); assert.ok(Math.abs(G.evaluate('sin(pi/2)') - 1) < 1e-12);
  assert.throws(() => G.parse('2+')); assert.throws(() => G.evaluate('alert(1)'), /unknown symbol/); assert.throws(() => G.parse('x;y'), /unexpected/); assert.throws(() => G.evaluate('y', { x: 1 }), /unknown symbol/);
  assert.ok(G.sameExpr('(x+2)(x-2)', 'x^2-4').ok); assert.ok(!G.sameExpr('x^2+4', 'x^2-4').ok);
});
test('number answers: units, fractions, scientific notation and tolerances', () => {
  assert.equal(G.parseNum('9.8 m/s²'), 9.8); assert.equal(G.parseNum('1/4'), 0.25); assert.equal(G.parseNum('6.02 × 10^23'), 6.02e23); assert.equal(G.parseNum('3.0x10^8 m/s'), 3e8); assert.ok(isNaN(G.parseNum('about five')));
  assert.equal(G.check({ type: 'numeric', answer: 16.5, tol: 0.05 }, '16.52 L/min').correct, true); assert.equal(G.check({ type: 'numeric', answer: 16.5, tol: 0.05 }, '16500').correct, false);
  assert.equal(G.check({ type: 'numeric', answer: 1e-5, tol: 1e-7 }, '1e-5').correct, true);
});
test('every checker returns a score between 0 and 1, and short answers are never auto-marked', () => {
  const r = G.check({ type: 'multi', answer: [0, 2] }, [0, 1]); assert.equal(r.correct, false); assert.ok(r.score >= 0 && r.score <= 1);
  const s = G.check({ type: 'short', ideas: [['pressure'], ['mix']] }, 'higher pressure to the body'); assert.equal(s.correct, null); assert.equal(s.score, 0.5);
});
test('spaced repetition: intervals grow, “again” resets, and one success is never “well remembered”', () => {
  let c = S.fresh(NOW); c = S.review(c, 'good', NOW); assert.equal(c.interval, 1); assert.equal(S.strength(c).level, 'learning');
  c = S.review(c, 'good', NOW + DAY); assert.equal(c.interval, 3); c = S.review(c, 'good', NOW + 4 * DAY); assert.ok(c.interval >= 7, 'grows to ' + c.interval);
  assert.equal(S.strength(c).level, 'strong');
  const lapsed = S.review(c, 'again', NOW + 12 * DAY); assert.equal(lapsed.interval, 0); assert.equal(lapsed.reps, 0); assert.ok(lapsed.ease < c.ease); assert.equal(S.strength(lapsed).level, 'relearn');
  let same = S.fresh(NOW); for (let i = 0; i < 4; i++) same = S.review(same, 'easy', NOW + i * 60000); assert.notEqual(S.strength(same).level, 'strong', 'all on one day is not enough');
  assert.match(S.why(lapsed, NOW + 12 * DAY), /did not remember it today/);
  assert.deepEqual(Object.keys(S.preview(S.fresh(NOW), NOW)), S.GRADES);
});
function attempts(spec) { // spec: [[topic, type, correct, daysAgo], …]
  return spec.map(([topic, type, correct, d], i) => ({ qid: 'q' + i, topic, subject: 'S', type, correct, at: NOW - d * DAY - i * 1000, attemptNo: 1, prompt: 'p' + i }));
}
test('insights: nothing is concluded from too little data, and the shortfall is stated', () => {
  const r = I.analyse({ attempts: attempts([['Heart', 'mcq', false, 0], ['Heart', 'mcq', false, 0], ['Heart', 'mcq', true, 0]]) }, { now: NOW });
  assert.equal(r.insights.length, 0); assert.match(r.notEnough[0].text, /at least 10 marked answers on 2 or more different days/);
});
test('insights: observation, interpretation, alternatives, reliability and evidence are separate and present', () => {
  const rows = []; for (let d = 0; d < 4; d++) for (let k = 0; k < 4; k++) rows.push(['Heart', 'mcq', k === 0, d]);
  for (let d = 0; d < 3; d++) for (let k = 0; k < 4; k++) rows.push(['pH', 'numeric', true, d]);
  const r = I.analyse({ attempts: attempts(rows) }, { now: NOW }); const ins = r.insights.find(i => i.key === 'topic:Heart');
  assert.ok(ins, JSON.stringify(r.insights.map(i => i.key)));
  assert.match(ins.observed, /4 of 16 questions on Heart/); assert.ok(ins.alternatives.length >= 3); assert.ok(ins.tryThis.length >= 2); assert.equal(ins.reliability.level, 'good'); assert.ok(ins.evidence.length === 16); assert.ok(ins.when.days >= 3);
});
test('insights never name a condition or estimate a probability or risk — across many random activity patterns', () => {
  const topics = ['Heart', 'pH', 'Quadratics'], types = ['mcq', 'numeric', 'label', 'fill', 'short'];
  for (let seed = 1; seed <= 300; seed++) {
    let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const rows = Array.from({ length: 10 + Math.floor(rnd() * 80) }, () => [topics[Math.floor(rnd() * 3)], types[Math.floor(rnd() * 5)], rnd() < rnd(), Math.floor(rnd() * 14)]);
    const a = attempts(rows); a.forEach(x => { x.textHeavy = rnd() < 0.3; if (!x.correct && rnd() < 0.4) x.errorTag = 'units'; });
    const r = I.analyse({ attempts: a, mistakes: {}, cards: {}, formatUse: { text: Math.floor(rnd() * 20), visual: Math.floor(rnd() * 20) } }, { now: NOW });
    const text = JSON.stringify(r); const bad = text.match(I.FORBIDDEN); assert.equal(bad, null, `seed ${seed}: “${bad && bad[0]}”`);
    r.insights.forEach(i => { assert.ok(i.observed && i.suggests && Array.isArray(i.alternatives) && i.reliability && i.tryThis.length); assert.notEqual(i.reliability.level, 'low'); });
  }
});
test('dismissed insights are kept (with the student’s correction) but flagged, not silently deleted', () => {
  const rows = []; for (let d = 0; d < 4; d++) for (let k = 0; k < 4; k++) rows.push(['Heart', 'mcq', k === 0, d]); for (let d = 0; d < 3; d++) for (let k = 0; k < 4; k++) rows.push(['pH', 'mcq', true, d]);
  const r = I.analyse({ attempts: attempts(rows), dismissed: { 'topic:Heart': { at: NOW, note: 'I was ill' } } }, { now: NOW });
  const ins = r.insights.find(i => i.key === 'topic:Heart'); assert.equal(ins.dismissed, true); assert.equal(ins.note, 'I was ill');
});
test('recommendations explain themselves and respect prerequisites', () => {
  const lessons = [{ id: 'a', title: 'A', subject: 'Maths', topic: 'Quadratics', sections: [{ id: 's' }, { id: 't' }], prereq: [] }, { id: 'b', title: 'B', subject: 'Maths', topic: 'Derivatives', sections: [{ id: 's' }], prereq: [{ lesson: 'a' }] }];
  let recs = I.recommend({ lessons: {}, cards: {}, mistakes: {}, attempts: [], profile: {} }, lessons, { now: NOW });
  assert.deepEqual(recs.map(r => r.id), ['a'], 'B waits for its prerequisite'); recs.forEach(r => assert.ok(r.why.length > 10));
  recs = I.recommend({ lessons: { a: { completed: NOW, secIx: 2, last: NOW } }, cards: { c: { due: NOW - 1 } }, mistakes: {}, attempts: [], profile: { goals: ['derivatives'] } }, lessons, { now: NOW });
  assert.ok(recs.some(r => r.kind === 'revise')); assert.equal(recs.find(r => r.kind === 'new').id, 'b'); assert.match(recs.find(r => r.kind === 'new').why, /goal/);
});
