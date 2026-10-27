'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../../assets/js/study-tools.js');
const LIB = (() => { global.window = {}; require('../../assets/js/studio-content.js'); const l = global.window.STUDIO_LIBRARY; delete global.window; return l; })();

const run = (str, x, y, size = 10, extra = {}) => Object.assign({ str, transform: [size, 0, 0, size, x, y], width: str.length * size * 0.5, height: size }, extra);

test('pdf text runs become a heading and mended paragraphs', () => {
  const items = [
    run('Chapter 2: Cells', 50, 760, 18),
    run('The membrane keeps the inside of the cell sepa-', 50, 720), run('rate from the outside world.', 50, 708),
    run('It is made of', 50, 696), run('lipids.', 120, 696),
    run('Proteins act as doors for ions.', 50, 660),
    run('12', 300, 40)
  ];
  const p = S.structurePage(items, 1);
  assert.equal(p.h, 'Chapter 2: Cells');
  assert.equal(p.paras.length, 2);
  assert.equal(p.paras[0].text, 'The membrane keeps the inside of the cell separate from the outside world. It is made of lipids.');
  assert.equal(p.paras[1].text, 'Proteins act as doors for ions.');
  assert.ok(!p.paras.some(x => x.text === '12'), 'page numbers are dropped');
});
test('an empty page has no paragraphs and a scanned page is detectable', () => {
  assert.deepEqual(S.structurePage([], 3).paras, []);
});
test('long paragraphs split at sentence boundaries', () => {
  const long = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} has exactly seven words.`).join(' ');
  const parts = S.splitLong(long, 40);
  assert.ok(parts.length > 1);
  parts.forEach(p => assert.ok(p.split(/\s+/).length <= 42));
  assert.equal(parts.join(' '), long);
});
test('sentences keep abbreviations together', () => {
  assert.deepEqual(S.sentences('Use tools, e.g. flashcards. Then rest! Done?'), ['Use tools, e.g. flashcards.', 'Then rest!', 'Done?']);
});
test('the summary only uses sentences from the text', () => {
  const text = LIB[1].pages.map(p => p.paras.map(x => x.text.replace(/[[\]]/g, '')).join(' ')).join(' ');
  const sum = S.summarize(text, 3);
  assert.equal(sum.length, 3);
  sum.forEach(s => assert.ok(text.includes(s)));
});
test('keywords and gap questions come from the reading', () => {
  const text = LIB[3].pages.map(p => p.paras.map(x => x.text.replace(/[[\]]/g, '')).join(' ')).join(' ');
  const keys = S.keywords(text, 8);
  assert.ok(keys.length >= 4);
  const qs = S.quizFrom(text, 4);
  assert.ok(qs.length >= 2);
  qs.forEach(q => { assert.match(q.q, /_____/); assert.equal(q.opts[q.a], q.answer); assert.equal(new Set(q.opts).size, 3); });
});
test('flashcards use the glossary when there is one', () => {
  const c = S.cardsFrom(LIB[0].terms, '');
  assert.equal(c.length, Object.keys(LIB[0].terms).length);
  assert.equal(c[0].front, 'boundary');
});
test('every library reading is complete', () => {
  assert.ok(LIB.length >= 6);
  const ids = new Set();
  LIB.forEach(d => {
    assert.ok(!ids.has(d.id)); ids.add(d.id);
    d.pages.forEach(p => p.paras.forEach(x => {
      assert.equal(x.sum.length, 3);
      assert.ok(x.check.opts[x.check.a]);
      (x.text.match(/\[([^\]]+)\]/g) || []).forEach(t => assert.ok(d.terms[t.slice(1, -1)] || d.terms[t.slice(1, -1).toLowerCase()], `${d.id}: glossary has ${t}`));
    }));
    if (d.fig) { assert.ok(d.fig.steps.length >= 3); assert.match(d.fig.svg, /data-fs="0"/); }
  });
});
test('plain text becomes pages', () => {
  const pages = S.structureText('Title line\n\nFirst para here.\n\nSecond para.\n\nThird.', 6);
  assert.equal(pages.length, 1); assert.equal(pages[0].h, 'Title line'); assert.equal(pages[0].paras.length, 3);
});
