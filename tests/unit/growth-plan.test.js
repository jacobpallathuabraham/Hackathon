// Growth Plan v10 logic: timetable, programme, planner operations, weekly review.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../../assets/js/growth-plan-core.js');

test('default timetable is a UK-style day: 08:30–14:15, breaks and lunch, Sat optional, Sun rest', () => {
  const tt = P.timetable({}, 1);
  const mon = tt.days.mon;
  assert.equal(mon[0].from, '08:30');
  assert.equal(mon[mon.length - 1].to, '14:15');
  assert.ok(mon.some(b => b.kind === 'lunch' && b.from === '12:00'), 'lunch at 12:00');
  assert.ok(mon.filter(b => b.kind === 'break').length >= 2, 'breaks between sessions');
  assert.equal(tt.days.sat[0].kind, 'catchup');
  assert.match(tt.days.sat[0].label[0], /Optional/);
  assert.equal(tt.days.sun[0].kind, 'rest');
  assert.ok(tt.days.fri.some(b => b.kind === 'review'), 'the weekly review ends Friday');
  // blocks never overlap and are in order
  for (const d of ['mon', 'tue', 'wed', 'thu', 'fri']) tt.days[d].reduce((t, b) => { assert.ok(P.toMin(b.from) >= t, `${d} ${b.from} overlaps`); return P.toMin(b.to); }, 0);
});

test('classes and commitments are placed first and study fits around them', () => {
  const tt = P.timetable({ classes: [{ day: 'mon', from: '09:00', to: '10:30', label: 'Biology lecture' }], commitments: [{ day: 'tue', from: '13:00', to: '14:15', label: 'Work shift' }] }, 2);
  const cls = tt.days.mon.find(b => b.kind === 'class');
  assert.deepEqual([cls.from, cls.to, cls.label[0]], ['09:00', '10:30', 'Biology lecture']);
  assert.ok(!tt.days.mon.some(b => b.kind === 'study' && P.toMin(b.from) < 630 && P.toMin(b.to) > 540), 'no study during the class');
  assert.ok(tt.days.tue.some(b => b.kind === 'commit'));
  assert.ok(tt.days.mon.some(b => b.kind === 'study' && /Reading Studio session/.test(b.label[0])), 'week 2 activities');
});

test('settings are validated and customisable', () => {
  const s = P.settings({ start: '07:00', end: '07:10', session: 999, brk: 1, lunch: -5 });
  assert.equal(s.start, '07:00'); assert.ok(P.toMin(s.end) > P.toMin(s.start) + 30, 'a usable day');
  assert.equal(s.session, 120); assert.equal(s.brk, 5); assert.equal(s.lunch, 0);
  const tt = P.timetable({ start: '09:00', end: '15:00', session: 30, lunch: 0, workload: 'light' }, 1);
  assert.equal(tt.days.wed[0].from, '09:00'); assert.equal(P.minutesOf(tt.days.wed[0]), 30);
  assert.equal(tt.days.wed.filter(b => b.act).length, 1, 'light workload: one programme block a day');
  assert.equal(P.timetable({ sat: 'off', sun: 'reflect' }, 1).days.sun.some(b => b.kind === 'reflect'), true);
});

test('six weeks with the requested themes; every activity says why and where', () => {
  assert.deepEqual(P.WEEKS.map(w => w.name[0]), ['Foundation', 'Reading and understanding', 'Memory and revision', 'Planning and organisation', 'Focus and independent learning', 'Review and future planning']);
  assert.ok(P.WEEKS[3].acts.some(a => a.where === 'ramp'), 'week 4 uses Start-Ramp');
  assert.ok(P.WEEKS[5].acts.some(a => a.kind === 'optional' && a.where === 'share'), 'week 6 report is optional');
  P.WEEKS.forEach(w => w.acts.forEach(a => { assert.ok(a.why[0].length > 5 && a.where, a.id); }));
});

test('planner: complete with reflection, skip, resize, reorder, add, reschedule', () => {
  let L = P.dayPlan(P.timetable({}, 1), 'mon');
  assert.ok(L.length >= 2);
  const [a, b] = L;
  L = P.ops.complete(L, a.id, 'went fine', 'read chapter 2');
  assert.equal(L[0].status, 'done'); assert.equal(L[0].reflection, 'went fine'); assert.equal(L[0].next, 'read chapter 2');
  L = P.ops.skip(L, b.id); assert.equal(L[1].status, 'skipped');
  L = P.ops.resize(L, b.id, 500); assert.equal(L[1].mins, 180);
  L = P.ops.add(L, 'Chemistry sheet', '07:00', 25); assert.equal(L[0].title[0], 'Chemistry sheet'); assert.equal(L[0].src, 'own');
  const moved = P.ops.move(L, L[1].id, -1); assert.equal(moved[0].id, L[1].id); assert.equal(moved[0].time, '07:00', 'times stay in order after a swap');
  const r = P.ops.reschedule(L, b.id); assert.equal(r.today.some(e => e.id === b.id), false); assert.equal(r.moved.status, 'todo');
  assert.equal(P.ops.remove(L, a.id).length, L.length, 'programme entries cannot be deleted (only skipped)');
});

test('weekly review is written only from answers and real activity — no labels, no scores of ability', () => {
  const now = Date.now(), k = new Date(now).toISOString().slice(0, 10);
  const planner = { [k]: [{ status: 'done', mins: 30, src: 'plan', reflection: 'the word parts helped' }, { status: 'done', mins: 20, src: 'own' }, { status: 'skipped', mins: 15, src: 'plan' }] };
  const st = P.weekStats(planner, now - 3 * 864e5, now + 864e5, [{ g: 'words', at: now, mins: 4 }]);
  assert.deepEqual([st.done, st.skipped, st.minutes, st.own, st.games, st.activeDays], [2, 1, 50, 1, 1, 1]);
  const r = P.review(2, { went: 4, helped: ['morph', 'retrieval'], hard: 'time', change: 'lighter', note: 'more breaks' }, st);
  const text = JSON.stringify(r);
  assert.match(r.lines[0][0], /completed 2 planned activities \(about 50 minutes\) on 1 day/);
  assert.equal(r.keep.length, 2); assert.equal(r.workload, 'light'); assert.equal(r.shorter, true); assert.equal(r.next, 3);
  assert.match(text, /more breaks/);
  assert.doesNotMatch(text, /dyslex|adhd|diagnos|disorder|risk|probab|%/i, 'no clinical language or probabilities');
  assert.equal(P.review(3, { went: 2, change: 'repeat' }, {}).next, 3, 'repeat keeps the week');
  assert.equal(P.review(3, { change: 'pause' }, {}).pause, true);
});
