'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../assets/js/realtrack.js');

const IND = [
  { id: 'V01', area: 'reading', cat: 'V', dir: 1 }, { id: 'V05', area: 'reading', cat: 'V', dir: 1 },
  { id: 'M03', area: 'executive', cat: 'M', dir: 1 }, { id: 'H01', area: 'support', cat: 'H', dir: 0 }
];
const ck = (o = {}) => Object.assign({ sleep: 7.5, mood: 4, stress: 2, readHard: 2, startHard: 2, study: '120', hardest: 'nothing', unusual: 'none', at: 1 }, o);
/* 28 days; `hot` decides which watched days run above normal */
function month(hot, extra = {}) {
  return Array.from({ length: 28 }, (_, i) => {
    const n = i + 1, h = n > 14 && hot(n);
    const vals = { V01: h ? 20 : 10 + (n % 3), V05: h ? 2.4 : 1 + (n % 2) * 0.1, M03: 4 + (n % 2) };
    return Object.assign({ n, vals, ck: ck(h ? { readHard: 5 } : {}) }, extra[n] || {});
  });
}

test('day numbers follow the real calendar, not clicks', () => {
  const start = new Date(2026, 9, 1, 22, 30).getTime();
  assert.equal(R.dayIndex(start, start), 1);
  assert.equal(R.dayIndex(start, new Date(2026, 9, 2, 0, 5).getTime()), 2);
  assert.equal(R.dayIndex(start, new Date(2026, 9, 28, 9).getTime()), 28);
  assert.equal(R.keyForDay(start, 3), '2026-10-03');
});
test('check-ins are validated strictly', () => {
  assert.equal(R.validCheckin(ck()), true);
  assert.equal(R.validCheckin(ck({ mood: 7 })), false);
  assert.equal(R.validCheckin(ck({ sleep: 1 })), false);
  assert.equal(R.validCheckin(ck({ hardest: 'everything' })), false);
  assert.equal(R.validCheckin({}), false);
});
test('missed, paused, short-sleep and unusual days are excluded', () => {
  assert.equal(R.exclusion(undefined), 'missed');
  assert.equal(R.exclusion({ n: 3 }), 'missed');
  assert.equal(R.exclusion({ ck: ck(), paused: true }), 'paused');
  assert.equal(R.exclusion({ ck: ck({ sleep: 5 }) }), 'sleep');
  assert.equal(R.exclusion({ ck: ck({ unusual: 'ill' }) }), 'ill');
  assert.equal(R.exclusion({ ck: ck() }), null);
});
test('a persistent reading pattern with behaviour + self-report flags reading', () => {
  const r = R.judge(month(() => true), IND);
  assert.equal(r.insufficient, null);
  assert.deepEqual(r.flaggedAreas, ['reading']);
  assert.equal(r.strong, true);
  assert.equal(r.per.find(p => p.id === 'H01'), undefined, 'support indicators never judge');
});
test('a typical month flags nothing', () => {
  const r = R.judge(month(() => false), IND);
  assert.deepEqual(r.flaggedAreas, []); assert.equal(r.strong, false);
});
test('spikes on only some days do not persist', () => {
  const r = R.judge(month(n => n % 4 === 0), IND);
  assert.deepEqual(r.flaggedAreas, []);
});
test('self-report alone never flags an area', () => {
  const days = month(() => false).map(d => d.n > 14 ? Object.assign(d, { ck: ck({ readHard: 5, stress: 5 }) }) : d);
  const r = R.judge(days, IND);
  assert.ok(r.per.find(p => p.id === 'SR1').persistent);
  assert.deepEqual(r.flaggedAreas, []);
});
test('hot days that were excluded never count', () => {
  const extra = {}; for (let n = 15; n <= 28; n++) extra[n] = { ck: ck({ readHard: 5, unusual: n % 2 ? 'exam' : 'ill' }) };
  const r = R.judge(month(() => true, extra), IND);
  assert.equal(r.watched, 0); assert.equal(r.insufficient, 'watch'); assert.equal(r.strong, false);
});
test('too few clean baseline days means no judgement at all', () => {
  const days = month(() => true).filter(d => d.n > 8);
  const r = R.judge(days, IND);
  assert.equal(r.insufficient, 'baseline'); assert.deepEqual(r.flaggedAreas, []);
});
test('no insight before day 28 even if a pattern is forming', () => {
  const r = R.judge(month(() => true).slice(0, 24), IND);
  assert.equal(r.strong, false);
});
test('daily rows carry exclusion reasons and check-in times', () => {
  const r = R.judge(month(() => true, { 16: { ck: ck({ sleep: 4, at: 99 }) } }), IND);
  const d16 = r.daily.find(d => d.n === 16);
  assert.equal(d16.why, 'sleep'); assert.equal(d16.flags, 0); assert.equal(d16.at, 99);
});
