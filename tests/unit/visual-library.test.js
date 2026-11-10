// Noor's visual library (v14): every entry must pass the same validator the AI planner uses,
// stay within the renderer limits, use safe Mermaid, and be reachable from plan().
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const win = { matchMedia: () => ({ matches: false }), addEventListener() {}, requestAnimationFrame() {} };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, { document: { documentElement: { lang: 'en', dataset: {} }, addEventListener() {} }, console, setTimeout, clearTimeout }));
  for (const f of ['assets/js/companion/visual-spec.js', 'assets/js/companion/visual-library.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../..', f), 'utf8'), ctx, { filename: f });
  return ctx.ERLY.vspec;
}
const V = load();
const LIB = V.library();

test('the library holds at least 100 visuals', () => { assert.ok(LIB.length >= 100, 'only ' + LIB.length); });

test('every library visual validates, with steps, and titles are unique', () => {
  const titles = new Set();
  for (const [re, spec] of LIB) {
    const v = V.validate(spec);
    assert.ok(v.ok, spec.title + ': ' + (v.errors || []).join(', '));
    assert.equal(v.errors.length, 0, spec.title + ' had dropped parts: ' + v.errors.join(', '));
    assert.ok(v.spec.steps.length >= 1 && v.spec.steps.length <= 8, spec.title + ' steps');
    assert.ok(!titles.has(spec.title), 'duplicate ' + spec.title); titles.add(spec.title);
    assert.ok(re.test(spec.title) || re.source.length > 3, spec.title);
  }
});

test('Mermaid code stays inside the safe subset (no parentheses inside mindmap leaves, quoted flowchart labels)', () => {
  for (const [, s] of LIB.filter(([, s]) => s.kind === 'mermaid')) {
    const code = s.params.code;
    if (/^mindmap/.test(code)) code.split('\n').slice(2).forEach(l => assert.ok(!/[()[\]{}]/.test(l), s.title + ' mindmap line: ' + l));
    if (/^flowchart/.test(code)) code.split('\n').filter(l => /\[/.test(l)).forEach(l => assert.match(l, /\["[^"]*"\]/, s.title + ': ' + l));
  }
});

test('library triggers are specific: ordinary chat and AI questions do not pull in a library visual', () => {
  for (const q of ['hi', 'how are you?', 'how does a transformer model work in an LLM?', 'what is a python generator?', 'I feel stressed about exams', 'tell me a joke', 'what time is it?']) {
    const p = V.plan(q);
    assert.ok(!p || !LIB.some(([, s]) => s.title === p.title), `"${q}" → ${p && p.title}`);
  }
});

test('plan() reaches library visuals for typical questions', () => {
  const cases = { 'Explain mitosis': 'Mitosis', 'What is the nitrogen cycle?': 'The nitrogen cycle', 'Explain the OSI model': 'The OSI model', 'How does DNS work?': 'How DNS finds a website', 'Explain the rock cycle': 'The rock cycle', 'Timeline of World War II': 'World War II: key events', 'Explain Bloom\'s taxonomy': 'Bloom’s taxonomy (revised)', 'How does a jet engine work?': 'How a jet engine works', 'Explain radioactive decay and half-life': 'Radioactive decay and half-life', 'What is a SWOT analysis?': 'SWOT analysis', 'How was the UAE formed? history of the UAE': 'Formation of the UAE', 'Explain the greenhouse effect': 'The greenhouse effect', 'how does a step-up transformer work': 'How a transformer works', 'Explain projectile motion': 'Projectile motion' };
  for (const [q, title] of Object.entries(cases)) assert.equal((V.plan(q) || {}).title, title, q);
});
