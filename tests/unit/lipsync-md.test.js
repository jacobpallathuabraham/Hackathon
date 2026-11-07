'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../../assets/js/companion/lipsync.js');
const MD = require('../../assets/js/companion/md.js');
const VX = require('../../assets/js/companion/voice.js');

test('words become plausible mouth shapes (English and Arabic)', () => {
  assert.deepEqual(L.visemes('mama'), ['M', 'A', 'M', 'A']);
  assert.deepEqual(L.visemes('you'), ['I', 'U']);
  assert.ok(L.visemes('food').includes('F') && L.visemes('food').includes('U'));
  assert.ok(L.visemes('thought').length <= 3, 'silent gh');
  assert.ok(L.visemes('مرحبا').includes('M'));
  assert.deepEqual(L.visemes('...'), []);
});

test('the mouth follows the real word timing and rests between words', () => {
  let t = 0;
  const tr = L.Track({ now: () => t });
  tr.start('Hello world.', 1);
  tr.boundary(0);
  t = 30; assert.notEqual(tr.frame().key, 'X', 'speaking inside the first word');
  t = 2000; assert.equal(tr.frame().key, 'X', 'rest after the words, waiting for the voice');
  tr.boundary(6); t = 2010;
  assert.equal(tr.frame().key, 'U', 'w of "world" when the voice says it');
  tr.stop(); assert.equal(tr.frame().key, 'X', 'rest when stopped');
});

test('the clock calibrates to how fast the voice really is', () => {
  let t = 0;
  const tr = L.Track({ now: () => t });
  tr.start('one two three four five six', 1);
  let ci = 0;
  'one two three four five six'.split(' ').forEach((w, k) => { t = k * 600; tr.boundary(ci); ci += w.length + 1; });
  assert.ok(tr.scale > 1.3, 'slow voice → longer words: ' + tr.scale);
});

test('without boundary events the words are walked on an estimated clock', () => {
  let t = 0;
  const tr = L.Track({ now: () => t });
  tr.start('Hi, Ali.', 1);
  const keys = []; for (t = 0; t < 900; t += 20) keys.push(tr.frame().key);
  assert.ok(keys.includes('X'), 'mouth closes at the comma');
  assert.ok(keys.filter(k => k !== 'X').length > 5);
});

test('LaTeX maths renders as readable HTML, never raw', () => {
  const h = MD.render('Energy: \\[ \\frac{1}{2}mv^2 \\rightarrow \\Delta H_f^\\circ \\]');
  assert.doesNotMatch(h, /\\frac|\\rightarrow|\\\[/);
  assert.match(h, /class="mf"/); assert.match(h, /<sup>2<\/sup>/); assert.match(h, /→/); assert.match(h, /Δ/); assert.match(h, /°/);
  assert.match(MD.render('Inline \\( \\text{H}_2\\text{O} \\) and $x^2$'), /H<sub>2<\/sub>O[\s\S]*x<sup>2<\/sup>/);
  assert.doesNotMatch(MD.render('It costs $5 and $10.'), /mth/, 'money is not maths');
  assert.doesNotMatch(MD.render('\\[ <img src=x onerror=alert(1)> \\]'), /<img/, 'still escaped');
  assert.match(MD.toText('\\( x^2 \\)'), /x squared/);
});

test('numbered lists keep their numbers across blank lines and formulas', () => {
  const h = MD.render('1. First\n\n2. Second\n   \\[ a + b \\]\n\n3. Third');
  assert.equal((h.match(/<ol/g) || []).length, 1, 'one list');
  assert.equal((h.match(/<li/g) || []).length, 3);
  assert.match(MD.render('Intro\n\n4. Fourth'), /<ol start="4">/);
});

test('voices are labelled female / male from their names', () => {
  assert.equal(VX.gender({ name: 'Microsoft Ava Online (Natural)' }), 'f');
  assert.equal(VX.gender({ name: 'Google UK English Male' }), 'm');
  assert.equal(VX.gender({ name: 'Daniel' }), 'm');
  assert.equal(VX.gender({ name: 'Zzyzx' }), '');
});
