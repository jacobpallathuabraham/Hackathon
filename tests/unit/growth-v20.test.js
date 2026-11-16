// Growth Plan v20 core: programmes, sessions, answer checking, reviews, pause/resume/restart, journey, calendar file.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../../assets/js/growth-v20-core.js');

test('six programmes, each with goals and an activity bank that resolves', () => {
  assert.deepEqual(G.PROGRAMMES.map(p => p.id), ['reading', 'writing', 'maths', 'memory', 'planning', 'confidence']);
  for (const p of G.PROGRAMMES) { assert.ok(p.goals.length >= 3, p.id); for (const a of p.acts) assert.ok(G.ACT[a], `${p.id}:${a}`); }
});

test('programme copy never claims treatment, diagnosis or ability measurement', () => {
  const text = JSON.stringify(G.PROGRAMMES).toLowerCase();
  for (const bad of [/diagnos/, /\btreat/, /\bcure/, /disorder/, /\biq\b/, /deficit/]) assert.ok(!bad.test(text), String(bad));
  assert.match(G.byId('confidence').is, /not therapy or counselling/);
});

test('every activity builds a well-formed exercise at every level', () => {
  for (const [id, A] of Object.entries(G.ACT)) for (const lv of ['gentle', 'steady', 'stretch']) for (const seed of ['a', 'b', 'c', 'd']) {
    const ex = A.make(lv, seed + id);
    assert.ok(ex.type && ex.q, id);
    if (ex.type === 'mcq') { assert.ok(ex.options.includes(ex.answer), id); assert.equal(new Set(ex.options).size, ex.options.length, id); }
    if (ex.type === 'order') { assert.deepEqual([...ex.start].sort(), [...ex.items].sort(), id); }
    if (ex.type === 'numeric') assert.ok(Number.isFinite(ex.answer), id);
  }
});

test('config is validated and clamped', () => {
  const c = G.validCfg({ weeks: 99, days: ['mon', 'nope'], mins: 7, level: 'x', reminders: 'push' });
  assert.equal(c.weeks, 12); assert.deepEqual(c.days, ['mon']); assert.equal(c.mins, 15); assert.equal(c.level, 'steady'); assert.equal(c.reminders, 'none');
  assert.deepEqual(G.validCfg({ days: [] }).days, ['mon']);
});

test('a session fits the chosen length and is stable for a given day', () => {
  const S = G.empty(), P = G.start(S, 'maths', { mins: 10, days: G.DAYS }, [], '2026-11-02');
  const a = G.session(P, '2026-11-10'), b = G.session(P, '2026-11-10');
  assert.deepEqual(a.map(x => x.id), b.map(x => x.id));
  assert.ok(a.reduce((n, x) => n + x.mins, 0) <= 12);
  assert.ok(a.length >= 1);
});

test('format "interactive" leaves out writing tasks; "reflective" keeps them', () => {
  const S = G.empty(), P = G.start(S, 'confidence', { mins: 30, days: G.DAYS, format: 'interactive' }, [], '2026-11-02');
  assert.ok(G.session(P, '2026-11-03').every(x => !['write', 'template', 'steps', 'estimate'].includes(x.type)));
  G.change(S, 'confidence', { format: 'reflective' });
  assert.ok(G.session(P, '2026-11-03').every(x => x.type !== 'mcq'));
});

test('checking answers gives feedback per exercise', () => {
  assert.equal(G.check({ type: 'mcq', answer: 'x' }, 'x').ok, true);
  assert.equal(G.check({ type: 'numeric', answer: 100, tol: 0.1 }, '109').ok, true);
  assert.equal(G.check({ type: 'numeric', answer: 100, tol: 0.1 }, '111').ok, false);
  assert.equal(G.check({ type: 'numeric', answer: 1, tol: 0 }, 'abc').invalid, true);
  assert.deepEqual(G.check({ type: 'order', items: ['a', 'b', 'c'] }, ['a', 'c', 'b']).right, 1);
  assert.equal(G.check({ type: 'recall', items: ['river', 'lemon'] }, 'Lemon, river!').ok, true);
  assert.equal(G.check({ type: 'recall', items: ['0793'], exact: true }, '07 93').ok, true);
  assert.equal(G.check({ type: 'write', minWords: 3 }, 'two words').ok, false);
});

test('pause pushes the end date back; resume and restart behave', () => {
  const S = G.empty(), P = G.start(S, 'reading', { weeks: 2 }, ['Find the main idea of a text faster'], '2026-11-02');
  const end = G.endDate(P);
  G.pause(S, 'reading', '2026-11-05'); assert.equal(P.status, 'paused'); assert.equal(G.scheduled(P, '2026-11-06'), false);
  G.resume(S, 'reading', '2026-11-08'); assert.equal(P.status, 'active'); assert.equal(G.endDate(P), G.addDays(end, 3));
  G.record(P, '2026-11-09', 'mainidea', { ok: true }); P.goals[0].done = true;
  G.restart(S, 'reading', '2026-11-20'); assert.deepEqual(P.days, {}); assert.equal(P.started, '2026-11-20'); assert.equal(P.goals[0].done, false);
  assert.deepEqual(S.history.map(h => h.ev), ['restart', 'resume', 'pause', 'start']);
  G.remove(S, 'reading'); assert.equal(S.programmes.reading, undefined);
});

test('weekly review is due after a week with activity, and adjusts the plan', () => {
  const S = G.empty(), P = G.start(S, 'writing', { mins: 15, days: ['mon', 'wed', 'fri'] }, [], '2026-11-02');
  assert.equal(G.reviewDue(P, '2026-11-09'), false, 'no activity yet');
  G.record(P, '2026-11-04', 'order', { ok: true });
  assert.equal(G.reviewDue(P, '2026-11-09'), true);
  G.addReview(S, 'writing', '2026-11-09', { went: 'mornings', adjust: 'lighter' });
  assert.equal(P.cfg.mins, 10); assert.equal(P.reviews[0].stats.done, 1); assert.equal(G.reviewDue(P, '2026-11-10'), false);
  G.addReview(S, 'writing', '2026-11-16', { adjust: 'harder' }); assert.equal(P.cfg.level, 'stretch');
});

test('journey marks done, open, today and ahead — never "missed"', () => {
  const S = G.empty(), P = G.start(S, 'memory', { weeks: 1, days: ['mon', 'wed', 'fri'] }, [], '2026-11-02');
  G.record(P, '2026-11-02', 'recall', { ok: true });
  const J = G.journey(P, '2026-11-04');
  assert.deepEqual(J.map(j => j.state), ['done', 'today', 'ahead']);
  assert.ok(!JSON.stringify(J).includes('miss'));
  assert.deepEqual(G.journey(P, '2026-11-07').map(j => j.state), ['done', 'open', 'open']);
});

test('calendar file lists upcoming planned sessions of active programmes only', () => {
  const S = G.empty(); G.start(S, 'planning', { weeks: 1, days: ['tue'] }, [], '2026-11-02'); G.start(S, 'maths', { weeks: 1, days: ['tue'] }, [], '2026-11-02'); G.pause(S, 'maths', '2026-11-02');
  const ics = G.ics(S, '2026-11-02');
  assert.match(ics, /BEGIN:VCALENDAR/); assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1); assert.match(ics, /DTSTART;VALUE=DATE:20261103/);
});
