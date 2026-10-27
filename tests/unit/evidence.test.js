'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/companion/evidence.js');

const seek = (t, from, to) => ({ t, type: 'seek', from, to });
test('a single rewind is never video friction', () => {
  const r = E.videoFriction([seek(1000, 80, 60)]);
  assert.equal(r.backSeeks, 1); assert.equal(r.friction, false);
});
test('going back to the same part three times is friction, with the segment reported', () => {
  const r = E.videoFriction([seek(1000, 80, 62), seek(20000, 85, 61), seek(40000, 90, 64)]);
  assert.equal(r.friction, true); assert.deepEqual(r.segmentRange, [60, 90]);
});
test('forward skips, tiny nudges and the first seconds are ignored', () => {
  const r = E.videoFriction([seek(1000, 10, 60), seek(2000, 61, 60), seek(3000, 3, 0), seek(4000, 62, 61)]);
  assert.equal(r.backSeeks, 0);
});
test('rewinds spread over different parts are not repeated friction', () => {
  const r = E.videoFriction([seek(1000, 40, 20), seek(2000, 100, 75), seek(3000, 200, 170)]);
  assert.equal(r.friction, false);
});
test('old rewinds fall out of the window', () => {
  const r = E.videoFriction([seek(0, 80, 62), seek(1000, 85, 61), seek(2000, 90, 64), { t: 2000 + 11 * 60e3, type: 'play' }]);
  assert.equal(r.friction, false);
});
test('slowdowns, restarts and transcript use are counted', () => {
  const r = E.videoFriction([{ t: 1, type: 'rate', rate: 0.75 }, { t: 2, type: 'rate', rate: 1.5 }, { t: 3, type: 'restart' }, { t: 4, type: 'transcript' }]);
  assert.equal(r.slowdowns, 1); assert.equal(r.restarts, 1); assert.equal(r.transcript, 1);
});
test('no data means no evidence anywhere', () => {
  Object.values(E.profile({})).forEach(o => assert.equal(o.level, 'none'));
});
test('one source alone stays early; two agreeing sources reach “some”', () => {
  assert.equal(E.profile({ video: { episodes: 1 } }).listening.level, 'early');
  assert.equal(E.profile({ checkins: [{ id: 'auditory', level: 'early' }], video: { videosWithFriction: 2 } }).listening.level, 'some');
});
test('“strong” needs weight across at least two sources', () => {
  assert.equal(E.profile({ checkins: [{ id: 'reading', level: 'stronger' }] }).reading.level, 'some');
  const p = E.profile({ checkins: [{ id: 'reading', level: 'stronger' }], tracker: { available: true, areas: ['reading'] }, reading: { frictionSessions: 2 } });
  assert.equal(p.reading.level, 'strong');
  assert.deepEqual(p.reading.sources.sort(), ['checkins', 'studio', 'tracker']);
});
test('tracker areas map to the right interview areas', () => {
  const p = E.profile({ tracker: { available: true, areas: ['executive', 'strain'] } });
  assert.equal(p.attention.level, 'early'); assert.equal(p.wellbeing.level, 'early');
  assert.equal(E.profile({ tracker: { available: false, areas: ['reading'] } }).reading.level, 'none');
});
test('Noor offers help for one area at a time, never nags, and respects “off”', () => {
  const prof = E.profile({ checkins: [{ id: 'auditory', level: 'moderate' }], video: { videosWithFriction: 2 } });
  const now = 1e12;
  assert.equal(E.shouldNotify(prof, { now }).area, 'listening');
  assert.equal(E.shouldNotify(prof, { now, lastNotified: { listening: now - 864e5 } }), null);
  assert.equal(E.shouldNotify(prof, { now, interviewed: { listening: now - 5 * 864e5 } }), null);
  assert.equal(E.shouldNotify(prof, { now, invitations: 'off' }), null);
  assert.equal(E.shouldNotify(prof, { now, snoozeUntil: now + 1 }), null);
  assert.equal(E.shouldNotify(E.profile({ video: { episodes: 1 } }), { now }), null, 'early evidence never triggers a notification');
});
