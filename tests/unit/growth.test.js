'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../../assets/js/growth-core.js');

test('every area and exercise is bilingual and complete', () => {
  Object.entries(G.AREAS).forEach(([k, a]) => { assert.ok(a.name[0] && a.name[1], k); assert.equal(a.themes.length, G.WEEKS, k); a.goals.forEach(g => assert.ok(g[0] && g[1], k)); });
  G.GAMES.forEach(g => { assert.ok(G.AREAS[g.area], g.id); assert.ok(g.name[0] && g.name[1] && g.desc[0] && g.desc[1], g.id); });
});
test('the plan follows the intake: chosen areas, goals and a calm warm-up every week', () => {
  const p = G.buildPlan({ areas: ['reading', 'attention'], goals: { reading: 1 }, minutes: 15 });
  assert.deepEqual(p.areas, ['reading', 'attention']);
  assert.match(p.goals[0].text[0], /syllables/);
  assert.equal(p.weeks.length, 6);
  p.weeks.forEach(w => { assert.ok(w.games.includes('breathe')); assert.ok(w.games.some(id => G.game(id).area === 'reading')); assert.ok(!w.games.some(id => G.game(id).area === 'maths')); });
});
test('a session fits the time available and starts calm', () => {
  const p = G.buildPlan({ areas: ['reading', 'attention'], minutes: 10 });
  for (let d = 0; d < 7; d++) {
    const s = G.sessionFor(p, 2, d);
    assert.ok(['breathe', 'reframe'].includes(s.games[0]));
    assert.ok(s.games.length >= 2 && s.games.length <= 4);
    assert.equal(new Set(s.games).size, s.games.length);
    assert.ok(s.minutes <= 10 || s.games.length === 2, JSON.stringify(s));
  }
});
test('weeks open by doing sessions, one plan session per real day', () => {
  const start = new Date(2026, 9, 1, 9).getTime(), day = n => new Date(2026, 9, 1 + n, 18).getTime();
  const ses = n => Array.from({ length: n }, (_, i) => ({ week: 1, date: G.dateKey(day(i)) }));
  assert.equal(G.progress([], start, start).week, 1);
  assert.equal(G.progress(ses(4), start, day(4)).week, 1);
  assert.equal(G.progress(ses(5), start, day(5)).week, 2);
  assert.equal(G.progress(ses(4), start, day(8)).week, 2, '4 sessions are enough once the week is over');
  assert.equal(G.progress(ses(3), start, day(2)).doneToday, true);
});
test('streaks count consecutive days up to today or yesterday', () => {
  const now = new Date(2026, 9, 10, 12).getTime(), k = n => G.dateKey(new Date(2026, 9, 10 - n, 9).getTime());
  assert.equal(G.streak([k(0), k(1), k(2), k(4)], now), 3);
  assert.equal(G.streak([k(1), k(2)], now), 2);
  assert.equal(G.streak([k(3)], now), 0);
});
test('difficulty adapts like a tutor: up when easy, down when hard', () => {
  assert.equal(G.adapt(1, [0.9, 0.95]), 2);
  assert.equal(G.adapt(2, [0.3, 0.4, 0.45]), 1);
  assert.equal(G.adapt(3, [0.95, 1]), 3);
  assert.equal(G.adapt(2, [0.7]), 2);
});
test('the weekly consult changes the plan and suggests a counsellor when mood is low', () => {
  const p = G.buildPlan({ areas: ['reading'], minutes: 20 });
  const c = G.consult(p, { reading: 2 }, { feel: 2, helped: 'pacer', barrier: 'hard', mood: 2 });
  assert.equal(c.levels.reading, 1); assert.equal(c.referral, true);
  assert.ok(c.notes.some(n => /counsellor/.test(n[0])));
  const t = G.consult(p, { reading: 1 }, { feel: 4, barrier: 'time', mood: 4 });
  assert.equal(t.minutes, 15); assert.equal(t.referral, false);
});
test('points and levels', () => {
  assert.equal(G.xpFor(0), 10); assert.equal(G.xpFor(1), 30);
  assert.equal(G.levelOf(0).level, 1); assert.equal(G.levelOf(260).level, 3);
});
test('exercise content is valid and repeatable', () => {
  const nb = G.nback(1, 20, 5);
  assert.deepEqual(nb, G.nback(1, 20, 5));
  assert.ok(nb.targets.filter(Boolean).length >= 2);
  assert.equal(G.nbackScore(nb.targets, nb.targets), 1);
  assert.equal(G.nbackScore(nb.targets, nb.targets.map(() => false)), 0);
  G.dots(2, 3).forEach(t => { assert.equal(t.pts.length, t.n); assert.ok(t.opts.includes(t.n)); });
  G.numberline(2, 4).forEach(t => assert.ok(t.target >= t.min && t.target <= t.max));
  assert.equal(G.lineScore({ min: 0, max: 100, target: 50 }, 50), 1);
  G.sentences(2, 'en', 1).forEach(s => assert.deepEqual(s.mixed.slice().sort(), s.words.slice().sort()));
  G.instructions(2, 9).forEach(r => { assert.equal(r.order.length, 3); assert.match(r.en, /then/); });
  G.syllables(1, 2).forEach(s => assert.ok(s.n <= 3));
  assert.equal(G.reframes(3).length, 3);
});
