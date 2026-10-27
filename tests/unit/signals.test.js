'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../../assets/js/companion/signals.js');

const cfg = S.config();
const T0 = 1_000_000;
// visit sections a..e in order, then return to "b" n times (each with a long dwell)
function sessionWithReturns(n, opts = {}) {
  const s = S.createSession(T0);
  let t = T0;
  const sec = (key, index, extra) => { t += opts.step || 4000; S.record(s, Object.assign({ type: 'section', key, index, t }, extra), cfg); };
  ['a', 'b', 'c', 'd', 'e'].forEach((k, i) => sec(k, i));
  for (let i = 0; i < n; i++) {
    if (opts.intentBefore) S.record(s, { type: 'intent', t: t + (opts.step || 4000) - 200 }, cfg); // e.g. a page button just before the jump
    sec('b', 1, opts.returnExtra);
    sec('e', 4);
  }
  return { s, now: t + 1000 };
}

test('a single return is never friction', () => {
  const { s, now } = sessionWithReturns(1);
  const r = S.evaluate(s, null, cfg, now).find(x => x.id === 'regression');
  assert.equal(r.value, 1);
  assert.equal(r.friction, false);
});

test('repeated returns to the same section within the window become provisional friction', () => {
  const { s, now } = sessionWithReturns(3);
  const r = S.evaluate(s, null, cfg, now).find(x => x.id === 'regression');
  assert.equal(r.value, 3);
  assert.deepEqual(r.repeatedSections, ['b']);
  assert.equal(r.friction, true);
  assert.equal(r.provisional, true, 'no baseline yet, so it is provisional');
});

test('returns outside the window do not count', () => {
  const { s } = sessionWithReturns(3);
  const later = s.last + cfg.regression.windowMs + 60e3;
  const r = S.evaluate(s, null, cfg, later).find(x => x.id === 'regression');
  assert.equal(r.recent, 0);
  assert.equal(r.friction, false);
});

test('intentional navigation (page buttons, read-aloud, companion) is excluded', () => {
  const { s, now } = sessionWithReturns(3, { intentBefore: true });
  const r = S.evaluate(s, null, cfg, now).find(x => x.id === 'regression');
  assert.equal(r.value, 0);
  assert.equal(r.excluded.intentional, 3);
  assert.equal(r.friction, false);
});

test('read-aloud auto-scroll ("auto" cause) is excluded', () => {
  const { s, now } = sessionWithReturns(3, { returnExtra: { cause: 'auto' } });
  assert.equal(S.evaluate(s, null, cfg, now)[0].value, 0);
});

test('going back to look at a diagram is excluded', () => {
  const { s, now } = sessionWithReturns(3, { returnExtra: { figure: true } });
  const r = S.evaluate(s, null, cfg, now)[0];
  assert.equal(r.value, 0);
  assert.equal(r.excluded.figure, 3);
});

test('a quick skim back (no dwell) is not a return', () => {
  const { s, now } = sessionWithReturns(3, { step: 400 });
  const r = S.evaluate(s, null, cfg, now)[0];
  assert.equal(r.value, 0);
  assert.ok(r.excluded.skim >= 2);
});

test('diagram zoom is excluded; repeated reader zoom becomes friction', () => {
  const s = S.createSession(T0);
  for (let i = 0; i < 6; i++) S.record(s, { type: 'zoom', level: i % 2 ? 1.6 : 1, figure: true, t: T0 + i * 1000 }, cfg);
  let z = S.evaluate(s, null, cfg, T0 + 7000).find(x => x.id === 'zoom');
  assert.equal(z.value, 0); assert.equal(z.excludedFigure, 6); assert.equal(z.friction, false);
  [1.1, 1.25, 1.1, 1.25].forEach((lv, i) => S.record(s, { type: 'zoom', level: lv, t: T0 + 10000 + i * 1000 }, cfg));
  z = S.evaluate(s, null, cfg, T0 + 15000).find(x => x.id === 'zoom');
  assert.equal(z.value, 4); assert.equal(z.friction, true);
});

test('small pans are ignored', () => {
  const s = S.createSession(T0);
  for (let i = 0; i < 10; i++) S.record(s, { type: 'pan', dx: 3, t: T0 + i * 100 }, cfg);
  assert.equal(S.evaluate(s, null, cfg, T0 + 2000).find(x => x.id === 'pan').value, 0);
});

test('read-aloud is an observation only and can never be friction', () => {
  const s = S.createSession(T0);
  for (let i = 0; i < 20; i++) S.record(s, { type: 'tts', action: 'start', scope: 'paragraph', t: T0 + i * 1000 }, cfg);
  const tts = S.evaluate(s, null, cfg, T0 + 30000).find(x => x.id === 'tts');
  assert.equal(tts.value, 20); assert.equal(tts.friction, false); assert.equal(tts.observationOnly, true);
});

test('unavailable signals are reported as unavailable and never friction', () => {
  const s = S.createSession(T0);
  for (let i = 0; i < 10; i++) S.record(s, { type: 'pan', dx: 40, t: T0 + i * 1000 }, cfg);
  const pan = S.evaluate(s, null, cfg, T0 + 12000, { pan: false }).find(x => x.id === 'pan');
  assert.equal(pan.available, false); assert.equal(pan.friction, false);
});

test('baseline: needs minimum sessions, skips short ones, keeps the latest', () => {
  let b = { sessions: [] };
  b = S.addToBaseline(b, { minutes: 1, returnsPerMin: 9 }, cfg);
  assert.equal(b.sessions.length, 0, 'sessions under 2 minutes are not learned from');
  for (let i = 0; i < 15; i++) b = S.addToBaseline(b, { minutes: 10, returnsPerMin: i }, cfg);
  assert.equal(b.sessions.length, cfg.baseline.maxSessions);
  assert.equal(b.sessions[0].returnsPerMin, 3);
  const st2 = S.stats({ sessions: b.sessions.slice(0, 2) }, 'returnsPerMin', cfg);
  assert.equal(st2.ready, false);
  assert.equal(S.compare(100, st2, cfg), 'no-baseline');
});

test('baseline comparison uses the student’s own mean + k·spread (with a floor)', () => {
  const b = { sessions: [0.2, 0.3, 0.25, 0.3].map(r => ({ minutes: 10, returnsPerMin: r })) };
  const st = S.stats(b, 'returnsPerMin', cfg);
  assert.equal(st.n, 4); assert.equal(st.ready, true);
  assert.ok(Math.abs(st.mean - 0.2625) < 1e-3);
  const limit = st.mean + cfg.baseline.k * Math.max(st.sd, cfg.baseline.sdFloor);
  assert.equal(S.compare(limit - 0.01, st, cfg), 'within');
  assert.equal(S.compare(limit + 0.01, st, cfg), 'above');
});

test('repeated returns that are normal for this student are not friction', () => {
  const { s, now } = sessionWithReturns(3);
  const usual = S.sessionSummary(s, now).returnsPerMin;
  const b = { sessions: [usual * 1.4, usual * 1.6, usual * 1.5].map(r => ({ minutes: 10, returnsPerMin: r })) };
  const r = S.evaluate(s, b, cfg, now)[0];
  assert.equal(r.compared, 'within');
  assert.equal(r.friction, false);
});

test('thresholds are configurable; invalid overrides are ignored', () => {
  const c = S.config({ regression: { repeatsSameSection: 2, windowMs: -5 }, zoom: { adjustMin: 'x' } });
  assert.equal(c.regression.repeatsSameSection, 2);
  assert.equal(c.regression.windowMs, S.DEFAULTS.regression.windowMs);
  assert.equal(c.zoom.adjustMin, S.DEFAULTS.zoom.adjustMin);
  const { s, now } = sessionWithReturns(2);
  assert.equal(S.evaluate(s, null, cfg, now)[0].friction, false);
  assert.equal(S.evaluate(s, null, c, now)[0].friction, true);
});
