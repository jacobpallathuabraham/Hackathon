/* ERLY — real tracking. The strict, calendar-driven version of the Support
   Pact: one real day at a time, no simulating, no fast-forward.
     - Each calendar day holds the Reading Studio counts measured that day and
       one timed daily check-in, answered on the day (no back-filling).
     - A day is excluded from judgement when it was missed, paused, followed a
       short night (< 6 h sleep) or was unusual (ill, travel, family event,
       exam). Excluded days never count for or against the student.
     - Days 1–14 learn the student's own normal; a baseline needs 7+ clean
       days. Days 15–28 are judged against it. Only measured indicators and
       the student's own check-in answers are used — nothing is simulated.
     - An indicator persists when it is clearly above normal on half or more
       of 5+ clean watched days. An area is flagged only when 2+ indicators
       persist there and at least one of them is behavioural (self-report
       alone never flags). Nothing here is a diagnosis.
   Pure: no DOM, no storage. Shared by tracker.js and the unit tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_REAL = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DAYS = 28, BLIND = 14, MIN_BASE = 7, MIN_WATCH = 7, MIN_IND = 5;

  /* the daily check-in, asked once per calendar day */
  const QUESTIONS = [
    { id: 'sleep', type: 'range', min: 3, max: 11, step: 0.5, def: 7, unit: 'h', en: 'How many hours did you sleep last night?', ar: 'كم ساعة نمت الليلة الماضية؟' },
    { id: 'mood', type: 'scale', en: 'How was your mood today?', ar: 'كيف كان مزاجك اليوم؟', lo: ['Very low', 'منخفض جداً'], hi: ['Great', 'ممتاز'] },
    { id: 'stress', type: 'scale', en: 'How stressed did you feel?', ar: 'ما مدى شعورك بالتوتر؟', lo: ['Calm', 'هادئ'], hi: ['Very stressed', 'متوتر جداً'] },
    { id: 'readHard', type: 'scale', en: 'How hard did reading feel today?', ar: 'ما مدى صعوبة القراءة اليوم؟', lo: ['Easy', 'سهلة'], hi: ['Very hard', 'صعبة جداً'] },
    { id: 'startHard', type: 'scale', en: 'How hard was it to start or stay on a task?', ar: 'ما مدى صعوبة البدء بمهمة أو الاستمرار فيها؟', lo: ['Easy', 'سهل'], hi: ['Very hard', 'صعب جداً'] },
    { id: 'study', type: 'choice', en: 'Roughly how long did you study?', ar: 'كم درست تقريباً؟', opts: [['0', 'Not today', 'لم أدرس'], ['30', 'Under 30 min', 'أقل من ٣٠ دقيقة'], ['60', '30–60 min', '٣٠–٦٠ دقيقة'], ['120', '1–2 hours', '١–٢ ساعة'], ['240', '2–4 hours', '٢–٤ ساعات'], ['300', '4 hours +', '٤ ساعات أو أكثر']] },
    { id: 'hardest', type: 'choice', en: 'What was hardest today?', ar: 'ما الأصعب اليوم؟', opts: [['reading', 'Reading', 'القراءة'], ['starting', 'Getting started', 'البدء'], ['focus', 'Staying focused', 'التركيز'], ['numbers', 'Numbers', 'الأرقام'], ['writing', 'Writing', 'الكتابة'], ['listening', 'Following talk', 'متابعة الكلام'], ['nothing', 'Nothing really', 'لا شيء تقريباً']] },
    { id: 'unusual', type: 'choice', en: 'Was today unusual?', ar: 'هل كان اليوم غير عادي؟', opts: [['none', 'No, a normal day', 'لا، يوم عادي'], ['ill', 'I was unwell', 'كنت مريضاً'], ['travel', 'Travel', 'سفر'], ['event', 'Family / life event', 'حدث عائلي'], ['exam', 'Exam day', 'يوم امتحان']] }
  ];

  /* self-report indicators derived from the check-in (higher = harder) */
  const SELF = [
    { id: 'SR1', area: 'reading', cat: 'V', from: c => c.readHard, en: 'Reading felt hard (self-report)', ar: 'صعوبة القراءة (تقرير ذاتي)' },
    { id: 'SR2', area: 'executive', cat: 'P', from: c => c.startHard, en: 'Starting/staying on task (self-report)', ar: 'البدء والاستمرار (تقرير ذاتي)' },
    { id: 'SR3', area: 'strain', cat: 'C', from: c => c.stress, en: 'Stress (self-report)', ar: 'التوتر (تقرير ذاتي)' },
    { id: 'SR4', area: 'strain', cat: 'C', from: c => c.mood == null ? null : 6 - c.mood, en: 'Low mood (self-report)', ar: 'انخفاض المزاج (تقرير ذاتي)' }
  ];
  const REASONS = {
    missed: ['No check-in that day', 'لا تسجيل يومي في ذلك اليوم'],
    paused: ['Paused', 'متوقف مؤقتاً'],
    sleep: ['Short night (< 6 h sleep)', 'ليلة قصيرة (أقل من ٦ ساعات نوم)'],
    ill: ['Unwell', 'مرض'], travel: ['Travel', 'سفر'], event: ['Life event', 'حدث حياتي'], exam: ['Exam day', 'يوم امتحان']
  };

  const pad = n => String(n).padStart(2, '0');
  function dateKey(ms) { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function midnight(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  /* calendar day number since the pact was signed (day 1 = signing day); DST-safe */
  function dayIndex(startMs, nowMs) { return Math.round((midnight(nowMs) - midnight(startMs)) / 864e5) + 1; }
  function keyForDay(startMs, n) { const d = new Date(midnight(startMs)); d.setDate(d.getDate() + n - 1); return dateKey(d.getTime()); }
  function msToMidnight(nowMs) { const d = new Date(midnight(nowMs)); d.setDate(d.getDate() + 1); return d.getTime() - nowMs; }

  function validCheckin(c) {
    if (!c || typeof c !== 'object') return false;
    return QUESTIONS.every(q => {
      const v = c[q.id];
      if (q.type === 'range') return typeof v === 'number' && v >= q.min && v <= q.max;
      if (q.type === 'scale') return Number.isInteger(v) && v >= 1 && v <= 5;
      return q.opts.some(o => o[0] === v);
    });
  }
  /* why a day can't be judged, or null when it is clean */
  function exclusion(day) {
    if (!day) return 'missed';
    if (day.paused) return 'paused';
    const c = day.ck;
    if (!c) return 'missed';
    if (c.sleep < 6) return 'sleep';
    if (c.unusual && c.unusual !== 'none') return c.unusual;
    return null;
  }

  function stats(xs) {
    const n = xs.length; if (!n) return null;
    const m = xs.reduce((a, b) => a + b, 0) / n;
    const sd = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1)) : 0;
    return { m, sd, n };
  }
  /* "clearly above normal": both a relative and a spread-aware margin */
  function above(v, b, self) {
    if (v == null || !b) return false;
    if (self) return v - b.m >= 1.5;
    const floor = b.m * 1.45, spread = b.m + 1.5 * b.sd;
    return v > Math.max(floor, spread) && v > 0;
  }

  /* days: array of { n, ck, vals, paused } for n = 1..up to 28 (missing = missed)
     ind: [{ id, area, cat, dir }] — measured indicators that may appear in vals */
  function judge(days, ind) {
    const byN = {}; (days || []).forEach(d => { byN[d.n] = d; });
    const last = Math.min(DAYS, Math.max(0, ...Object.keys(byN).map(Number)));
    const all = [];
    for (let n = 1; n <= last; n++) { const d = byN[n] || { n }; all.push(Object.assign({}, d, { n, why: exclusion(d) })); }
    const clean = all.filter(d => !d.why);
    const base = clean.filter(d => d.n <= BLIND), watch = clean.filter(d => d.n > BLIND);
    const behav = (ind || []).filter(i => i.dir > 0).map(i => ({ id: i.id, area: i.area, cat: i.cat, en: i.en, ar: i.ar, self: false, get: d => (d.vals || {})[i.id] }));
    const selfI = SELF.map(s => ({ id: s.id, area: s.area, cat: s.cat, en: s.en, ar: s.ar, self: true, get: d => d.ck ? s.from(d.ck) : null }));
    const per = behav.concat(selfI).map(I => {
      const bvals = base.map(I.get).filter(v => typeof v === 'number');
      const b = bvals.length >= 4 ? stats(bvals) : null;
      const w = watch.filter(d => typeof I.get(d) === 'number');
      const upDays = b ? w.filter(d => above(I.get(d), b, I.self)).map(d => d.n) : [];
      const n = b ? w.length : 0;
      const frac = n ? upDays.length / n : 0;
      return { id: I.id, area: I.area, cat: I.cat, en: I.en, ar: I.ar, self: I.self, base: b ? +b.m.toFixed(2) : null, n, up: upDays.length, upDays, frac, persistent: n >= MIN_IND && frac >= 0.5 };
    }).filter(p => p.base != null || p.self);
    const areas = {};
    ['reading', 'executive', 'strain'].forEach(a => {
      const inA = per.filter(p => p.area === a && p.base != null);
      const ps = inA.filter(p => p.persistent);
      areas[a] = { n: inA.length, persistent: ps.length, behavioural: ps.filter(p => !p.self).length, score: inA.length ? inA.reduce((x, p) => x + p.frac, 0) / inA.length : 0 };
    });
    const baselineOk = base.length >= MIN_BASE, watchOk = watch.length >= MIN_WATCH;
    const insufficient = !baselineOk ? 'baseline' : (last > BLIND && !watchOk && last >= DAYS) ? 'watch' : null;
    const flaggedAreas = insufficient ? [] : ['reading', 'executive', 'strain'].filter(a => areas[a].persistent >= 2 && areas[a].behavioural >= 1);
    const strong = !insufficient && last >= DAYS && flaggedAreas.length > 0;
    const moodLow = per.find(p => p.id === 'SR4');
    const crisis = strong && flaggedAreas.includes('strain') && !!(moodLow && moodLow.persistent);
    const daily = all.map(d => {
      const flags = d.why || d.n <= BLIND ? [] : per.filter(p => p.upDays.includes(d.n));
      const byArea = { reading: 0, executive: 0, strain: 0 }, byCat = {};
      flags.forEach(p => { byArea[p.area]++; byCat[p.cat] = (byCat[p.cat] || 0) + 1; });
      return { n: d.n, why: d.why, flags: flags.length, byArea, byCat, at: d.ck ? d.ck.at : null };
    });
    const excluded = all.filter(d => d.why).map(d => ({ n: d.n, why: d.why }));
    return { last, baseline: base.length, watched: watch.length, excluded, per, areas, flaggedAreas, strong, crisis, insufficient, daily };
  }

  return { DAYS, BLIND, MIN_BASE, MIN_WATCH, MIN_IND, QUESTIONS, SELF, REASONS, dateKey, midnight, dayIndex, keyForDay, msToMidnight, validCheckin, exclusion, above, stats, judge };
});
