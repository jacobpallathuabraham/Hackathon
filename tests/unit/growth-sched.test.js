'use strict';
// v18 Growth Plan core: free-text understanding, the constraint scheduler (property-tested on random profiles),
// edits, regeneration with a diff, progress, the weekly review and export.
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../../assets/js/growth-sched.js');
const TODAY = '2026-11-16'; // a Monday

const base = () => ({ start: TODAY, availability: ['mon', 'tue', 'wed', 'thu', 'fri'].map(day => ({ day, start: '16:00', end: '21:00' })).concat([{ day: 'sat', start: '10:00', end: '13:00' }]), commitments: [{ day: 'tue', start: '17:00', end: '19:00', label: 'football' }], prefs: { sessionLen: 45, maxPerDay: 120, bestTime: 'evening', restDay: 'sun' }, goals: [{ id: 'g1', text: 'Chemistry exam', kind: 'exam', subject: 'chemistry', deadline: '2026-12-04', priority: 3, topics: ['moles', 'bonding'] }, { id: 'g2', text: 'Maths confidence', kind: 'subject', subject: 'maths', priority: 2 }] });

test('free text: windows per clause, commitments, deadlines, preferences, wellbeing', () => {
  const f = S.understand('I have football practice on Tuesdays 5-7pm. I am free after 4pm on weekdays and 10am-1pm on Saturdays. My chemistry exam is on 12 June. I lose focus after 25 minutes. I study best in the evening. Keep Sunday as a rest day. I feel stressed about maths.', '2026-11-15');
  assert.deepEqual(f.availability.filter(a => a.day === 'mon').map(a => [a.start, a.end]), [['16:00', '21:00']]);
  assert.deepEqual(f.availability.filter(a => a.day === 'sat').map(a => [a.start, a.end]), [['10:00', '13:00']]);
  assert.deepEqual(f.commitments.map(c => [c.day, c.start, c.end, c.label]), [['tue', '17:00', '19:00', 'football']]);
  assert.deepEqual(f.deadlines.map(d => [d.date, d.subject]), [['2027-06-12', 'chemistry']]);
  assert.deepEqual(f.prefs, { sessionLen: 25, bestTime: 'evening', restDay: 'sun' });
  assert.equal(f.wellbeing.length, 1); assert.ok(f.subjects.includes('maths') && f.subjects.includes('chemistry'));
  assert.ok(f.availability.every(a => typeof a.from === 'string'), 'every fact keeps the words it came from');
});
test('dates: “in 3 weeks”, ISO, month-first', () => {
  assert.equal(S.parseDate('test in 3 weeks', TODAY), '2026-12-07'); assert.equal(S.parseDate('due 2027-01-20', TODAY), '2027-01-20'); assert.equal(S.parseDate('exam March 3rd', TODAY), '2027-03-03');
});
test('the plan breaks no hard constraint and respects the football commitment and the deadline', () => {
  const p = base(), r = S.plan(p, {});
  assert.deepEqual(S.violations(p, r.sessions), []);
  assert.ok(r.sessions.length > 10);
  r.sessions.filter(s => S.dayKey(s.date) === 'tue').forEach(s => assert.ok(S.toMin(s.end) <= 17 * 60 - 15 || S.toMin(s.start) >= 19 * 60 + 15, `${s.start}-${s.end}`));
  assert.ok(r.sessions.filter(s => s.goalId === 'g1').every(s => s.date <= '2026-12-04'));
  assert.equal(r.sessions.filter(s => S.dayKey(s.date) === 'sun').length, 0, 'rest day');
});
test('property: 200 random profiles never produce an overlap, a session outside free time, or a day over the cap', () => {
  let rnd = 42; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(R() * a.length)];
  for (let k = 0; k < 200; k++) {
    const av = S.DAYS.filter(() => R() < 0.8).map(day => { const a = 7 + Math.floor(R() * 10), b = a + 1 + Math.floor(R() * 6); return { day, start: S.hhmm(a * 60), end: S.hhmm(Math.min(23, b) * 60) }; });
    const cm = S.DAYS.filter(() => R() < 0.4).map(day => { const a = 8 + Math.floor(R() * 12); return { day, start: S.hhmm(a * 60), end: S.hhmm(a * 60 + 30 + Math.floor(R() * 4) * 30) }; });
    const goals = Array.from({ length: 1 + Math.floor(R() * 4) }, (_, i) => ({ id: 'g' + i, text: 'goal ' + i, kind: pick(Object.keys(S.CYCLES)), priority: 1 + Math.floor(R() * 3), deadline: R() < 0.5 ? S.addDays(TODAY, 3 + Math.floor(R() * 30)) : undefined, weeklyMinutes: 30 + Math.floor(R() * 8) * 30 }));
    const p = { start: TODAY, availability: av, commitments: cm, prefs: { sessionLen: pick([25, 30, 45, 60]), maxPerDay: pick([60, 90, 120, 180]), bestTime: pick(['morning', 'afternoon', 'evening']), restDay: pick(['sun', 'sat', 'none']) }, goals };
    const r = S.plan(p, { weeks: 3 }); const v = S.violations(p, r.sessions);
    assert.deepEqual(v, [], `profile ${k}: ${JSON.stringify(v.slice(0, 2))}`);
    const placed = {}; r.sessions.forEach(s => { if (!s.spaced) placed[s.goalId] = (placed[s.goalId] || 0) + S.toMin(s.end) - S.toMin(s.start); });
    // what was not placed is reported: placed + reported covers the demand for every goal without a deadline
    goals.filter(g => !g.deadline).forEach(g => { const rep = r.report.filter(x => x.goalId === g.id).reduce((t, x) => t + x.minutesUnplaced, 0); assert.ok((placed[g.id] || 0) + rep >= g.weeklyMinutes * 3 - 1, `profile ${k} goal ${g.id}: ${(placed[g.id] || 0)} + ${rep} < ${g.weeklyMinutes * 3}`); });
  }
});
test('too little time is reported, not squeezed in', () => {
  const p = base(); p.availability = [{ day: 'mon', start: '16:00', end: '17:00' }]; const r = S.plan(p, { weeks: 1 });
  assert.ok(r.report.length >= 1 && r.report.some(x => x.minutesUnplaced > 0)); assert.deepEqual(S.violations(p, r.sessions), []);
});
test('the exercise cycle follows the calendar and every session has steps and a way to do it in ERLY', () => {
  const r = S.plan(base(), {}), g1 = r.sessions.filter(s => s.goalId === 'g1' && !s.spaced && !s.review);
  assert.deepEqual(g1.slice(0, 3).map(s => s.exercise.type), ['learn', 'visual', 'practice']);
  r.sessions.forEach(s => { assert.ok(s.exercise.steps.length >= 3); assert.ok(s.exercise.launch && /\.html/.test(s.exercise.launch.href) || ['reflect', 'calm'].includes(s.exercise.type)); });
  assert.ok(r.sessions.some(s => (s.spaced || s.review) === 1) && r.sessions.some(s => (s.spaced || s.review) === 3), 'spaced reviews after first study');
});
test('moving a session: into football time is refused; into free time is accepted', () => {
  const p = base(), r = S.plan(p, {}), s = r.sessions.find(x => S.dayKey(x.date) === 'mon');
  const tue = S.addDays(s.date, 1);
  assert.equal(S.checkMove(p, r.sessions, s.id, tue, '17:30').ok, false);
  const ok = S.checkMove(p, r.sessions.filter(x => x.date !== tue), s.id, tue, '20:00'); assert.equal(ok.ok, true, JSON.stringify(ok.why));
});
test('regenerate keeps what is done, skipped or locked, and shows the difference before anything changes', () => {
  const p = base(), r = S.plan(p, {}); const ss = r.sessions.map(s => Object.assign({}, s));
  ss[0].status = 'done'; ss[1].status = 'skipped'; ss[2].locked = true;
  p.commitments.push({ day: 'wed', start: '16:00', end: '21:00', label: 'job' }); // a new commitment on Wednesdays
  const g = S.regenerate(p, ss, TODAY);
  [ss[0], ss[1], ss[2]].forEach(k => assert.ok(g.sessions.some(x => x.id === k.id), 'kept ' + k.id));
  assert.deepEqual(S.violations(p, g.sessions.filter(x => x.status === 'planned' && !x.locked)), []);
  assert.ok(g.diff.removed.length + g.diff.moved.length > 0, 'Wednesday sessions are moved or removed');
  assert.ok(g.diff.removed.concat(g.diff.moved.map(m => m.from)).every(x => S.dayKey(x.date) === 'wed' || x.status === 'planned'));
});
test('weekly review is written only from what happened; nothing judges the student', () => {
  const p = base(), r = S.plan(p, {}), wk = r.sessions.filter(s => s.date < S.addDays(TODAY, 7));
  wk.forEach((s, i) => { if (i % 3 === 0) { s.status = 'done'; s.rating = 2; } else if (i % 3 === 1) { s.status = 'skipped'; s.reason = 'too tired'; } });
  const R = S.weekReview(p, r.sessions, TODAY);
  assert.equal(R.done, wk.filter(s => s.status === 'done').length); assert.equal(R.reasons['too tired'], R.skipped);
  assert.ok(R.suggestions.length >= 1);
  const t = S.reviewText(R); assert.match(t, /sessions done/); assert.doesNotMatch(t, /lazy|failure|poor student|disorder|diagnos/i); assert.match(t, /Don’t judge my ability/);
});
test('export: iCalendar and CSV contain every planned session', () => {
  const p = base(), r = S.plan(p, { weeks: 1 }), ics = S.toICS(p, r.sessions), csv = S.toCSV(p, r.sessions);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/); assert.match(ics, /END:VCALENDAR\r\n$/); assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, r.sessions.length);
  assert.match(ics, /DTSTART:2026111\dT\d{6}/); assert.equal(csv.trim().split('\n').length, r.sessions.length + 1);
});
test('progress per goal counts done minutes against planned', () => {
  const p = base(), r = S.plan(p, {}); r.sessions[0].status = 'done';
  const pr = S.progress(p, r.sessions, TODAY), g = pr.find(x => x.goalId === r.sessions[0].goalId);
  assert.equal(g.done, 1); assert.ok(g.minutesDone > 0 && g.share > 0 && g.share < 1);
});
