'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/js/checkins-score.js');

// a result at the reference mean for every metric of a domain, optionally shifted by z
function metricsAt(domain, shifts = {}) {
  const m = {};
  Object.entries(C.REF[domain]).forEach(([k, [mean, sd, dir]]) => { m[k] = mean + dir * sd * (shifts[k] || 0); });
  return m;
}
const hist = (domain, shifts, validity) => [C.scoreRun(domain, metricsAt(domain, shifts), validity)];
function statuses(map) { const o = {}; C.DOMAINS.forEach(k => { o[k] = C.domainStatus(map[k]); }); return o; }

test('reference-level performance is typical', () => {
  C.DOMAINS.filter(k => k !== 'H').forEach(k => assert.equal(C.scoreRun(k, metricsAt(k)).band, 'typical', k));
});
test('z-scores respect direction (lower accuracy and higher time both count as friction)', () => {
  const r = C.scoreRun('V', metricsAt('V', { ldAcc: 2, ldRT: 2 }));
  assert.ok(r.rows.find(x => x.key === 'ldAcc').z >= 1.9);
  assert.ok(r.rows.find(x => x.key === 'ldRT').z >= 1.9);
  const better = C.scoreRun('V', metricsAt('V', { ldAcc: -2 }));
  assert.ok(better.rows.find(x => x.key === 'ldAcc').z <= -1.9);
  assert.equal(better.band, 'typical');
});
test('one measure alone is never “notable”', () => {
  assert.equal(C.scoreRun('E', metricsAt('E', { commission: 3 })).band, 'watch');
  assert.equal(C.scoreRun('E', metricsAt('E', { commission: 3, rtCV: 2 })).band, 'notable');
});
test('invalid runs say nothing: anticipations, time away, unfinished', () => {
  assert.equal(C.scoreRun('E', metricsAt('E', { commission: 3, rtCV: 3 }), { trials: 40, anticipations: 20 }).band, 'invalid');
  assert.equal(C.scoreRun('P', metricsAt('P'), { durationMs: 100000, awayMs: 50000 }).band, 'invalid');
  assert.equal(C.scoreRun('O', metricsAt('O'), { complete: false }).band, 'invalid');
});
test('missing measures are reported as unavailable, not as friction', () => {
  const r = C.scoreRun('U', { quietAcc: 0.9, noiseCost: null, replays: 0 });
  assert.equal(r.rows.find(x => x.key === 'noiseCost').unavailable, true);
  assert.equal(r.band, 'typical');
  assert.equal(C.scoreRun('U', {}).band, 'unavailable');
});
test('help-seeking is support only and never flags', () => {
  assert.equal(C.scoreRun('H', {}).band, 'support');
  const syn = C.synthesize(statuses({ H: [C.scoreRun('H', {})] }));
  assert.equal(syn.completed, 0);
  assert.deepEqual(syn.explore, []);
});
test('nothing is suggested from typical results', () => {
  const map = {}; ['V', 'U', 'M', 'E', 'P', 'O', 'N', 'Q', 'C'].forEach(k => { map[k] = hist(k); });
  const syn = C.synthesize(statuses(map));
  assert.equal(syn.enough, true); assert.deepEqual(syn.explore, []);
});
test('a reading difference needs converging evidence', () => {
  const onlyWatch = C.synthesize(statuses({ V: hist('V', { ldRT: 1.2 }) }));
  assert.ok(!onlyWatch.explore.some(x => x.id === 'reading'));
  const conv = C.synthesize(statuses({ V: hist('V', { ldAcc: 1.6 }), M: hist('M', { fwdSpan: 1.6 }) }));
  assert.ok(conv.explore.some(x => x.id === 'reading'));
  const strongV = C.synthesize(statuses({ V: hist('V', { ldAcc: 2, ldRT: 2 }), M: hist('M', { bwdSpan: 2, fwdSpan: 2 }) }));
  const r = strongV.explore.find(x => x.id === 'reading');
  assert.ok(['moderate', 'stronger'].includes(r.level));
});
test('attention/executive needs the executive check-in plus another domain', () => {
  assert.ok(!C.synthesize(statuses({ E: hist('E', { commission: 2, rtCV: 2 }) })).explore.some(x => x.id === 'attention'));
  assert.ok(C.synthesize(statuses({ E: hist('E', { commission: 2, rtCV: 2 }), P: hist('P', { hitDrop: 1.6 }) })).explore.some(x => x.id === 'attention'));
});
test('listening in noise suggests a hearing check first', () => {
  const x = C.synthesize(statuses({ U: hist('U', { noiseCost: 2 }) })).explore.find(e => e.id === 'auditory');
  assert.ok(x); assert.match(x.assess[0], /hearing/i);
});
test('test anxiety needs the timed drop AND worry or answer changes', () => {
  assert.ok(!C.synthesize(statuses({ Q: hist('Q', { timedDrop: 2 }) })).explore.some(x => x.id === 'testanxiety'));
  assert.ok(C.synthesize(statuses({ Q: hist('Q', { timedDrop: 2, anxiety: 2 }) })).explore.some(x => x.id === 'testanxiety'));
});
test('repeated runs and agreement with 28-day tracking raise the evidence level', () => {
  const run = () => C.scoreRun('U', metricsAt('U', { noiseCost: 1.6 }));
  const once = C.synthesize(statuses({ U: [run()] })).explore.find(x => x.id === 'auditory');
  const twice = C.synthesize(statuses({ U: [run(), run()] }), { available: true, areas: ['reading'] }).explore.find(x => x.id === 'auditory');
  assert.equal(once.level, 'early');
  assert.equal(twice.repeated, true); assert.equal(twice.agreesWithTracking, true);
  assert.equal(twice.level, 'moderate'); // one domain, but repeated and matching tracking
});
test('invalid runs never feed the combined profile', () => {
  const bad = [C.scoreRun('U', metricsAt('U', { noiseCost: 3, quietAcc: 3 }), { complete: false })];
  assert.deepEqual(C.synthesize(statuses({ U: bad })).explore, []);
});
test('ordinary explanations are always listed and nothing is a probability', () => {
  const syn = C.synthesize(statuses({ V: hist('V', { ldAcc: 2, ldRT: 2 }), U: hist('U', { noiseCost: 2 }) }));
  assert.ok(syn.ordinary.length >= 4);
  const text = JSON.stringify(syn);
  assert.doesNotMatch(text, /\d+\s?%|probab|likelihood|chance of/i);
});
test('helpers: median, cv, levenshtein, span, vigilance', () => {
  assert.equal(C.median([5, 1, 3]), 3); assert.equal(C.median([1, 2, 3, 4]), 2.5);
  assert.equal(C.cv([10, 10, 10]), 0);
  assert.equal(C.levenshtein('kitten', 'sitting'), 3);
  assert.equal(C.span([{ len: 3, correct: true }, { len: 4, correct: false }, { len: 4, correct: true }, { len: 5, correct: false }]), 4);
  const tr = [];
  for (let i = 0; i < 30; i++) tr.push({ target: true, hit: i < 20 || i % 2 === 0, rt: 400 + i * 5 });
  const v = C.vigilance(tr);
  assert.ok(v.hitDrop > 0); assert.ok(v.rtSlow > 0);
});
