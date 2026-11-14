'use strict';
// v17 curriculum registry: well-formed rows. What each concept actually gets is MEASURED in the browser
// (tests/e2e/problems.e2e.js, coverage page), never stored here.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/js/lab/curriculum.js');
test('every concept has a discipline, a known level, a unit, a name and a real question as its probe', () => {
  assert.ok(C.list.length >= 120, 'at least 120 concepts: ' + C.list.length);
  for (const c of C.list) { assert.ok(c.discipline && c.unit && c.concept, JSON.stringify(c)); assert.ok(C.LEVEL[c.level], 'level ' + c.level); assert.ok(c.probe.length >= 12, 'probe: ' + c.probe); assert.ok(!('status' in c), 'no hand-written status'); }
});
test('ids and probes are unique; the ten acceptance problems are present', () => {
  assert.equal(new Set(C.list.map(c => c.id)).size, C.list.length);
  assert.equal(new Set(C.list.map(c => c.probe.toLowerCase())).size, C.list.length);
  ['Connected bodies over a massive pulley', 'Several point charges', 'Area between curves', 'SN1 mechanism', 'Wheatstone bridge (nodal analysis)', 'Compound gear train', 'Raoult’s law and distillation', 'Frequency modulation', 'Cardiac cycle and P–V loop', 'Break-even analysis'].forEach(k => assert.ok(C.list.some(c => c.concept === k), k));
  assert.ok(new Set(C.list.map(c => c.discipline)).size >= 15, 'many disciplines');
});
