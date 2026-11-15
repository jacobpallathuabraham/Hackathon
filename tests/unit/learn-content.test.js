// Learning Studio content: every lesson validates, every question is answerable by its own key,
// IDs are unique, and the insight engine's wording never names a condition.
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const ROOT = path.join(__dirname, '..', '..', 'assets', 'js', 'learn');
function load() {
  const win = { console }; win.window = win; const ctx = vm.createContext(win);
  ['ls-grade.js', 'ls-schema.js', 'ls-srs.js', 'ls-intel.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/typeof module !== 'undefined' && module\.exports/g, 'false'), ctx));
  ['ls-registry.js', 'ls-figures.js', 'ls-lessons-bio-chem.js', 'ls-lessons-math-phys.js', 'ls-bank.js'].forEach(f => { const p = path.join(ROOT, f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx); });
  return win.LS;
}
const LS = load();
// the response that the content itself declares correct, per type
function keyResponse(q) {
  switch (q.type) {
    case 'mcq': case 'graph': return q.ask === 'numeric' ? String(q.answer) : q.answer;
    case 'tf': return q.answer; case 'multi': return q.answer.slice();
    case 'fill': return q.blanks.map(b => (b.num != null ? String(b.num) : b.accept[0]));
    case 'match': return Object.fromEntries(q.pairs.map((_, i) => [i, i]));
    case 'order': return q.items.map((_, i) => i);
    case 'label': return Object.fromEntries(q.targets.map((t, i) => [i, t.label]));
    case 'sort': return Object.fromEntries(q.items.map((it, i) => [i, it.cat]));
    case 'compare': return Object.fromEntries(q.statements.map((s, i) => [i, s.ans]));
    case 'numeric': return String(q.answer); case 'expr': return q.answer;
    case 'slider': { for (let v = q.param.min; v <= q.param.max + 1e-9; v += q.param.step || 0.1) { const r = LS.grade.check(q, +v.toFixed(6)); if (r.correct) return +v.toFixed(6); } return null; }
    case 'steps': return q.steps.map(keyResponse);
    case 'short': return q.model;
  }
}
test('every lesson passes validation (none rejected)', () => {
  assert.equal(LS.invalid.length, 0, JSON.stringify(LS.invalid));
  assert.ok(LS.lessons.length >= 8, 'lessons: ' + LS.lessons.length);
});
test('every question is correctly answerable from its own key, and IDs are unique', () => {
  const bank = LS.bank(), ids = new Set();
  bank.forEach(q => { assert.ok(!ids.has(q.id), 'duplicate ' + q.id); ids.add(q.id);
    const r = LS.grade.check(q, keyResponse(q));
    if (q.type === 'short') assert.equal(r.score, 1, q.id + ': model answer covers its own key ideas'); else assert.equal(r.correct, true, q.id + ' (' + q.type + ')'); });
  assert.ok(bank.length >= 60, 'bank size ' + bank.length);
});
test('wrong-answer explanations: each “why” is for a wrong option, each known wrong number is actually wrong', () => {
  LS.bank().forEach(q => {
    if (q.why) Object.keys(q.why).forEach(k => assert.notEqual(+k, q.answer, q.id + ' why on the correct option'));
    if (q.wrong) q.wrong.forEach(w => assert.equal(LS.grade.check(q, String(w.value)).correct, false, q.id + ' wrong value ' + w.value + ' is marked correct'));
  });
});
test('a balance of activity types (not all multiple choice)', () => {
  const by = {}; LS.bank().forEach(q => { by[q.type] = (by[q.type] || 0) + 1; });
  assert.ok(Object.keys(by).length >= 12, JSON.stringify(by));
  assert.ok(by.mcq / LS.bank().length < 0.35, 'mcq share ' + JSON.stringify(by));
});
test('every lesson declares provenance, objectives, sources and an estimated time', () => {
  LS.lessons.forEach(L => { assert.ok(LS.schema.KINDS.includes(L.provenance.kind)); assert.ok(L.objectives.length >= 2); assert.ok(L.provenance.sources.length >= 1, L.id + ' sources'); assert.ok(L.mins > 0); });
});
test('the schema rejects malformed content', () => {
  const bad = { id: 'x', v: '1', title: 'Bad', subject: 'S', level: 'L', topic: 'T', mins: 5, objectives: ['a'], summary: ['s'], provenance: { kind: 'made-up', author: 'a' }, sections: [{ id: 's', title: 't', blocks: [{ k: 'activity', q: { id: 'q1', type: 'mcq', prompt: 'p', explain: 'e', options: ['a'], answer: 3 } }, { k: 'nope' }] }] };
  const errs = LS.schema.validateLesson(bad);
  assert.ok(errs.some(e => /provenance\.kind/.test(e)) && errs.some(e => /mcq/.test(e)) && errs.some(e => /unknown block/.test(e)), errs.join('\n'));
});
