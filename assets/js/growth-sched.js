/* ERLY — Growth Plan v18 core (pure, no DOM): understanding the student's answers, the exercise engine, the
   constraint scheduler, plan edits, regeneration with a diff, progress and the weekly review, and export.

   SCHEDULER. Time is a grid of 15-minute slots over the plan's horizon. A slot is usable only inside the
   student's own availability, outside every fixed commitment (with a travel/settle buffer), and never on their
   rest day. Hard constraints: no overlaps, a daily study cap, a break after every long block, and nothing after
   a goal's deadline. Sessions are placed greedily by urgency (earliest deadline first, weighted by priority and by
   how much work is still unplaced), and each placement is scored for: the student's preferred time of day,
   spacing between sessions of the same goal (spaced practice: reviews 1, 3 and 7 days after first study), and an
   even spread across the week. Work that cannot fit is REPORTED, never silently dropped or squeezed in.

   Nothing here judges the student: no ability scores, no streak penalties, no predictions about them.
   window.ERLY_GSCHED in the browser, CommonJS for the unit tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_GSCHED = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DAY_RX = { mon: 'mon(day)?s?', tue: 'tue(s|sday)?s?', wed: 'wed(nesday)?s?', thu: 'thu(r|rs|rsday)?s?', fri: 'fri(day)?s?', sat: 'sat(urday)?s?', sun: 'sun(day)?s?' };
  const SLOT = 15;
  const toMin = t => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : NaN; };
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
  const dayKey = s => DAYS[(parseISO(s).getDay() + 6) % 7];
  const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
  const weekStart = s => addDays(s, -((parseISO(s).getDay() + 6) % 7));
  let seq = 0; const uid = p => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

  /* ================= 1. understanding free text (shown back to the student to confirm) ================= */
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function parseTime(t, ampmHint) {
    const m = String(t).trim().toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/); if (!m) return NaN;
    let h = +m[1]; const mi = +(m[2] || 0), ap = m[3] || ampmHint;
    if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
    if (!ap && h >= 1 && h <= 7) h += 12; // "5-7" in a student's week almost always means the evening
    return h * 60 + mi;
  }
  function daysIn(text) {
    const t = text.toLowerCase(), out = new Set();
    if (/\b(weekdays?|school days|every day after school|mon(day)?\s*(-|–|to)\s*fri(day)?)\b/.test(t)) ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(d => out.add(d));
    if (/\bweekends?\b/.test(t)) ['sat', 'sun'].forEach(d => out.add(d));
    if (/\b(every ?day|daily)\b/.test(t)) DAYS.forEach(d => out.add(d));
    DAYS.forEach(d => { if (new RegExp(`\\b${DAY_RX[d]}\\b`).test(t)) out.add(d); });
    return [...out];
  }
  function parseDate(text, today) {
    const t = text.toLowerCase(), y0 = parseISO(today).getFullYear();
    let m = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
    if (m) { let d = iso(new Date(y0, MONTHS.indexOf(m[3]), +m[1])); if (d < today) d = iso(new Date(y0 + 1, MONTHS.indexOf(m[3]), +m[1])); return d; }
    m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (m) { let d = iso(new Date(y0, MONTHS.indexOf(m[1]), +m[2])); if (d < today) d = iso(new Date(y0 + 1, MONTHS.indexOf(m[1]), +m[2])); return d; }
    m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = t.match(/\bin (\d{1,2}) (day|week|month)s?\b/); if (m) return addDays(today, +m[1] * (m[2] === 'day' ? 1 : m[2] === 'week' ? 7 : 30));
    return null;
  }
  const SUBJECTS = ['maths', 'math', 'mathematics', 'physics', 'chemistry', 'biology', 'english', 'history', 'geography', 'economics', 'computer science', 'computing', 'programming', 'french', 'spanish', 'arabic', 'german', 'statistics', 'calculus', 'accounting', 'business', 'psychology', 'art', 'music', 'law', 'medicine', 'engineering', 'philosophy', 'literature', 'essay writing', 'reading', 'handwriting', 'coding'];
  const NORM_SUBJ = { math: 'maths', mathematics: 'maths', computing: 'computer science', programming: 'computer science', coding: 'computer science' };
  // free text → structured facts. Every fact carries the words it came from so the student can check it.
  function understand(text, today) {
    const facts = { availability: [], commitments: [], deadlines: [], subjects: [], prefs: {}, wellbeing: [], notes: [] };
    String(text || '').split(/(?<=[.!?;\n])\s+|\s*\n\s*|,\s*(?=(?:and\s+)?i\b)/i).map(s => s.trim()).filter(Boolean).forEach(sent => {
      const s = sent.toLowerCase();
      const sFree = /\b(free|available|can study|study time|have time)\b/.test(s);
      // a sentence can hold several windows ("free after 4pm on weekdays and 10am-1pm on Saturdays"): read clause by clause
      let carryDays = [];
      s.split(/\s+(?:and|but|while|also)\s+|;\s*|,\s+(?=\d|on\b|every\b|after\b|from\b)/).forEach(cl => {
        const range = cl.match(/(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)\s*(?:-|–|to|until|till)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)/);
        const after = cl.match(/\b(?:after|from)\s+(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)/), before = cl.match(/\b(?:before|until)\s+(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)/);
        const cDays = daysIn(cl), days = cDays.length ? cDays : carryDays; if (cDays.length) carryDays = cDays;
        const busyWord = cl.match(/\b(practice|training|club|job|work|shift|lesson|class|tuition|football|basketball|swim\w*|gym|choir|band|church|mosque|volunteer\w*|busy|appointment|sport|rehearsal)\b/);
        const isFree = /\b(free|available|can study|study time|have time)\b/.test(cl) || (sFree && !busyWord), isBusy = !!busyWord && !/\b(free|available)\b/.test(cl);
        let win = null;
        if (range) { const pm = /pm/.test(range[2]) ? 'pm' : undefined; win = [parseTime(range[1].replace(/\s+/g, ''), /am|pm/.test(range[1]) ? undefined : pm), parseTime(range[2].replace(/\s+/g, ''))]; }
        else if (after && isFree) win = [parseTime(after[1].replace(/\s+/g, '')), before ? parseTime(before[1].replace(/\s+/g, '')) : 21 * 60];
        if (win && !(win[0] < win[1])) win = null;
        if (win && (isFree || isBusy)) {
          const ds = days.length ? days : (isFree ? ['mon', 'tue', 'wed', 'thu', 'fri'] : []);
          ds.forEach(d => (isBusy ? facts.commitments : facts.availability).push({ day: d, start: hhmm(win[0]), end: hhmm(win[1]), label: isBusy ? busyWord[0] : null, from: sent }));
        }
      });
      const dl = /\b(exam|test|mock|deadline|due|assessment|interview|essay|coursework|presentation|finals?)\b/.test(s) && parseDate(s, today);
      if (dl) { const subj = SUBJECTS.find(x => new RegExp(`\\b${x}\\b`).test(s)); facts.deadlines.push({ date: dl, what: (s.match(/\b(mock exam|exam|test|mock|deadline|assessment|interview|essay|coursework|presentation|finals?)\b/) || ['deadline'])[0], subject: subj ? (NORM_SUBJ[subj] || subj) : null, from: sent }); }
      SUBJECTS.forEach(x => { if (new RegExp(`\\b${x}\\b`).test(s)) { const n = NORM_SUBJ[x] || x; if (!facts.subjects.includes(n)) facts.subjects.push(n); } });
      if (/\b(mornings?|early)\b/.test(s) && /\b(best|prefer|focus|like|study better)\b/.test(s)) facts.prefs.bestTime = 'morning';
      if (/\b(evenings?|night|late)\b/.test(s) && /\b(best|prefer|focus|like|study better)\b/.test(s)) facts.prefs.bestTime = 'evening';
      if (/\b(afternoons?)\b/.test(s) && /\b(best|prefer|focus|like|study better)\b/.test(s)) facts.prefs.bestTime = 'afternoon';
      const short = s.match(/\b(\d{2})\s*(?:min|minute)s?\b/); if (short && /\b(focus|concentrate|attention|at a time|sessions?|chunks?)\b/.test(s)) facts.prefs.sessionLen = Math.max(15, Math.min(90, Math.round(+short[1] / 5) * 5));
      if (/\b(lose focus|distracted|can'?t concentrate|hard to focus|short attention)\b/.test(s) && !facts.prefs.sessionLen) facts.prefs.sessionLen = 25;
      const rest = s.match(/\b(?:rest|day off|no study|don'?t study|keep)\b.*?\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*/); if (rest) facts.prefs.restDay = rest[1];
      if (/\b(stress\w*|anxious|anxiety|overwhelm\w*|tired|burn ?out|sleep\w*|worried|nervous)\b/.test(s)) facts.wellbeing.push(sent);
    });
    return facts;
  }

  /* ================= 2. the exercise engine ================= */
  // structured exercise types; each says what it is for, how long, how it is done in ERLY, and when it counts as done
  const TYPES = {
    learn: { title: ['Learn', 'تعلّم'], why: ['New material, explained with a visual or audio lesson', 'مادة جديدة مع شرح مرئي أو صوتي'], launch: 'lesson' },
    visual: { title: ['See it', 'شاهدها'], why: ['Explore the idea in an interactive model and change it yourself', 'استكشف الفكرة في نموذج تفاعلي'], launch: 'visual' },
    practice: { title: ['Practise', 'تدرّب'], why: ['Worked problems with Noor checking each step', 'مسائل محلولة مع نور خطوة بخطوة'], launch: 'noor' },
    retrieve: { title: ['Recall', 'استرجع'], why: ['Answer from memory first, then check — the strongest way to make learning stick', 'أجب من الذاكرة ثم تحقق — أقوى طريقة للتثبيت'], launch: 'quiz' },
    review: { title: ['Review', 'راجع'], why: ['Spaced review of what you studied earlier', 'مراجعة متباعدة لما درسته'], launch: 'quiz' },
    timed: { title: ['Timed practice', 'تدريب بوقت'], why: ['Exam-style questions under time, then mark them', 'أسئلة بنمط الامتحان بوقت محدد'], launch: 'noor' },
    write: { title: ['Write', 'اكتب'], why: ['Plan and write a short piece, then compare with the checklist', 'خطط واكتب نصاً قصيراً'], launch: 'noor' },
    hand: { title: ['Handwriting practice', 'تدريب الكتابة'], why: ['Letters, words and tracing in the Handwriting Check', 'حروف وكلمات وتتبع'], launch: 'hand' },
    read: { title: ['Read', 'اقرأ'], why: ['A focused reading session in Reading Studio', 'جلسة قراءة مركزة'], launch: 'read' },
    reflect: { title: ['Reflect', 'تأمّل'], why: ['Five minutes: what went well, what to change next week', 'خمس دقائق: ما الذي نجح وما الذي يتغير'], launch: 'reflect' },
    calm: { title: ['Reset', 'استرخِ'], why: ['A short breathing or planning reset before study', 'تمرين تنفس أو تخطيط قصير'], launch: 'reflect' }
  };
  // goal kinds → the order of exercise types a block of study cycles through
  const CYCLES = {
    exam: ['learn', 'visual', 'practice', 'retrieve', 'timed', 'review'],
    subject: ['learn', 'visual', 'practice', 'retrieve', 'review'],
    skill: ['learn', 'practice', 'practice', 'review'],
    writing: ['read', 'write', 'review'],
    handwriting: ['hand', 'hand', 'reflect'],
    reading: ['read', 'read', 'retrieve'],
    habit: ['practice', 'reflect'],
    wellbeing: ['calm', 'reflect']
  };
  const STEPS = {
    learn: t => [`Ask for an audio lesson or explanation of ${t}`, 'Note three key ideas in your own words', 'Write one question you still have'],
    visual: t => [`Ask Noor to show ${t} — the model opens in the chat`, 'Change one control and predict what happens before it moves', 'Explain the change in one sentence'],
    practice: t => [`Ask Noor for three practice questions on ${t}, easy → harder`, 'Try each before looking at any hint', 'Ask Noor to check your working step by step'],
    retrieve: t => [`Without notes, write everything you remember about ${t}`, 'Then ask Noor for a five-question quiz', 'Mark what you missed — that is what the next review covers'],
    review: t => [`Quick quiz on ${t} (from memory first)`, 'Re-learn only what you got wrong', 'Rate how sure you feel'],
    timed: t => [`Set a timer and do exam-style questions on ${t}`, 'Mark them with Noor', 'Note one thing to do differently'],
    write: t => [`Plan a short piece about ${t}: point, evidence, explanation`, 'Write for the planned time', 'Check against the plan'],
    hand: () => ['Open Handwriting Check → Practice', 'Letters or tracing for most of the time', 'Finish with one sentence written freely'],
    read: t => [`Read about ${t} in Reading Studio for the planned time`, 'Stop every few pages and summarise in one line', 'Ask Noor about anything unclear'],
    reflect: () => ['What went well this week?', 'What got in the way?', 'One change for next week'],
    calm: () => ['Two minutes of slow breathing (in for 4, out for 6)', 'Write the three things you will do today', 'Start with the easiest']
  };
  function exerciseFor(goal, n, minutes) {
    const cyc = CYCLES[goal.kind] || CYCLES.subject, type = cyc[n % cyc.length], topic = (goal.topics && goal.topics.length ? goal.topics[Math.floor(n / cyc.length) % goal.topics.length] : null) || goal.subject || goal.text;
    return { type, topic, minutes, steps: STEPS[type](topic), launch: launchFor(type, topic), done: type === 'retrieve' || type === 'review' ? 'quiz answered' : type === 'reflect' ? 'three answers written' : 'time spent and marked done' };
  }
  // one exercise of a chosen type (used when the student edits a session)
  const exerciseOf = (type, topic, minutes) => ({ type, topic, minutes, steps: (STEPS[type] || STEPS.practice)(topic), launch: launchFor(type, topic), done: type === 'retrieve' || type === 'review' ? 'quiz answered' : type === 'reflect' ? 'three answers written' : 'time spent and marked done' });
  function launchFor(type, topic) {
    const k = (TYPES[type] || {}).launch, q = encodeURIComponent;
    if (k === 'lesson') return { href: `student.html?lesson=${q(topic)}`, label: ['Open the audio lesson', 'افتح الدرس الصوتي'] };
    if (k === 'visual') return { href: `student.html?ask=${q('Show me ' + topic)}`, label: ['See it with Noor', 'شاهدها مع نور'] };
    if (k === 'quiz') return { href: `student.html?ask=${q('Quiz me on ' + topic + ' — five questions, one at a time')}`, label: ['Quiz with Noor', 'اختبار مع نور'] };
    if (k === 'noor') return { href: `student.html?ask=${q('Give me practice questions on ' + topic + ', one at a time, and check my working')}`, label: ['Practise with Noor', 'تدرّب مع نور'] };
    if (k === 'hand') return { href: 'handwriting.html?practice=letters', label: ['Open handwriting practice', 'افتح تدريب الكتابة'] };
    if (k === 'read') return { href: 'student.html#reading', label: ['Open Reading Studio', 'افتح استوديو القراءة'] };
    return null;
  }

  /* ================= 3. the scheduler ================= */
  const DEF_PREFS = { sessionLen: 45, maxPerDay: 120, bestTime: 'afternoon', restDay: 'sun', buffer: 15, horizonWeeks: 4, breakAfter: 90 };
  // minutes of study a goal asks for per week (the student can change it)
  const weeklyNeed = g => g.weeklyMinutes || ({ exam: 180, subject: 120, skill: 90, writing: 90, handwriting: 60, reading: 90, habit: 60, wellbeing: 30 }[g.kind] || 90);
  function freeIntervals(profile, date) {
    const P = Object.assign({}, DEF_PREFS, profile.prefs || {}), d = dayKey(date);
    if (P.restDay === d) return [];
    const av = (profile.availability || []).filter(a => a.day === d).map(a => [toMin(a.start), toMin(a.end)]).filter(a => a[0] < a[1]);
    const busy = (profile.commitments || []).filter(c => c.day === d || c.date === date).map(c => [toMin(c.start) - P.buffer, toMin(c.end) + P.buffer]);
    let free = av.slice().sort((a, b) => a[0] - b[0]);
    for (const [b0, b1] of busy) free = free.flatMap(([a0, a1]) => (b1 <= a0 || b0 >= a1 ? [[a0, a1]] : [[a0, Math.min(a1, b0)], [Math.max(a0, b1), a1]].filter(x => x[1] - x[0] >= SLOT)));
    return free;
  }
  const TIME_PREF = { morning: [7 * 60, 12 * 60], afternoon: [12 * 60, 17 * 60], evening: [17 * 60, 22 * 60] };
  function plan(profile, opts) {
    opts = opts || {};
    const P = Object.assign({}, DEF_PREFS, profile.prefs || {}), start = opts.from || profile.start, horizon = (opts.weeks || P.horizonWeeks) * 7;
    const keep = (opts.keep || []).slice(), sessions = keep.map(s => Object.assign({}, s)), report = [];
    const goals = (profile.goals || []).filter(g => !g.paused);
    const used = {}; const addUse = (date, a, b) => { (used[date] = used[date] || []).push([a, b]); };
    sessions.forEach(s => addUse(s.date, toMin(s.start), toMin(s.end)));
    const dayLoad = date => (used[date] || []).reduce((t, [a, b]) => t + (b - a), 0);
    const clash = (date, a, b) => (used[date] || []).some(([x, y]) => a < y + 5 && b > x - 5);
    const lastOf = {}; sessions.forEach(s => { if (!lastOf[s.goalId] || s.date > lastOf[s.goalId]) lastOf[s.goalId] = s.date; });
    const count = {}; sessions.forEach(s => { count[s.goalId] = (count[s.goalId] || 0) + 1; });
    // block continuity: a break after `breakAfter` minutes of back-to-back study
    const runBefore = (date, a) => { let run = 0, t = a; for (;;) { const prev = (used[date] || []).find(([x, y]) => y >= t - 5 && y <= t); if (!prev) break; run += prev[1] - prev[0]; t = prev[0]; } return run; };
    for (let w = 0; w < Math.ceil(horizon / 7); w++) {
      const wk0 = addDays(start, w * 7), wkDates = Array.from({ length: 7 }, (_, i) => addDays(wk0, i)).filter(d => daysBetween(start, d) < horizon);
      // demand this week, most urgent first
      const demand = goals.map(g => { const need = weeklyNeed(g), already = sessions.filter(s => s.goalId === g.id && wkDates.includes(s.date)).reduce((t, s) => t + (toMin(s.end) - toMin(s.start)), 0); const daysLeft = g.deadline ? daysBetween(wk0, g.deadline) : 999; return { g, left: Math.max(0, need - already), urgency: (g.priority || 2) * 10 + (daysLeft < 0 ? -999 : 60 / Math.max(1, daysLeft)) }; }).filter(x => x.left > 0 && !(x.g.deadline && x.g.deadline < wk0)).sort((a, b) => b.urgency - a.urgency);
      let progress = true;
      while (progress) {
        progress = false;
        for (const dm of demand) {
          if (dm.left <= 0) continue;
          const SL = dm.g.sessionLen || P.sessionLen, len = dm.left - SL < SLOT ? Math.max(SLOT, Math.ceil(dm.left / 5) * 5) : SL; // a small remainder joins the last session instead of being lost
          let best = null;
          for (const date of wkDates) {
            if (opts.notBefore && date < opts.notBefore) continue;
            if (dm.g.deadline && date > dm.g.deadline) continue;
            if (dayLoad(date) + len > P.maxPerDay) continue;
            const sameDay = sessions.some(s => s.goalId === dm.g.id && s.date === date);
            for (const [a0, a1] of freeIntervals(profile, date)) {
              for (let t = Math.ceil(a0 / SLOT) * SLOT; t + len <= a1; t += SLOT) {
                if (clash(date, t, t + len)) continue;
                if (runBefore(date, t) + len > P.breakAfter && runBefore(date, t) > 0) continue;
                if (opts.notBeforeTime && date === opts.notBefore && t < opts.notBeforeTime) continue;
                const [p0, p1] = TIME_PREF[P.bestTime] || TIME_PREF.afternoon, inPref = t >= p0 && t + len <= p1;
                const gap = lastOf[dm.g.id] ? daysBetween(lastOf[dm.g.id], date) : 2;
                const score = (inPref ? 30 : 0) - (sameDay ? 40 : 0) - Math.abs(gap - 2) * 4 - dayLoad(date) / 10 - daysBetween(wk0, date) * 0.5 - (t - p0 > 0 ? (t - p0) / 120 : 0);
                if (!best || score > best.score) best = { date, t, score };
              }
            }
          }
          if (best) {
            const n = count[dm.g.id] || 0, ex = exerciseFor(dm.g, n, len);
            const s = { id: uid('s'), goalId: dm.g.id, date: best.date, start: hhmm(best.t), end: hhmm(best.t + len), status: 'planned', exercise: ex };
            sessions.push(s); addUse(best.date, best.t, best.t + len); lastOf[dm.g.id] = best.date; count[dm.g.id] = n + 1; dm.left -= len; progress = true;
          } else if (!dm.reported) { dm.reported = true; report.push({ goalId: dm.g.id, week: wk0, minutesUnplaced: dm.left }); }
        }
      }
      demand.filter(d => d.left > 0 && !d.reported).forEach(d => report.push({ goalId: d.g.id, week: wk0, minutesUnplaced: d.left }));
    }
    // the exercise cycle follows the calendar (learn → see → practise → recall…), not the order slots were found
    const renumber = () => goals.forEach(g => { const keptN = keep.filter(s => s.goalId === g.id).length; sessions.filter(s => s.goalId === g.id && !keep.some(k => k.id === s.id) && !s.review && !s.spaced).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).forEach((s, i) => { s.exercise = exerciseFor(g, keptN + i, toMin(s.end) - toMin(s.start)); }); });
    renumber();
    // spaced reviews: 1, 3 and 7 days after a goal's first "learn" session, where they fit (not counted as new demand)
    if (opts.spaced !== false) goals.forEach(g => {
      const firstLearn = sessions.filter(s => s.goalId === g.id && s.exercise && s.exercise.type === 'learn').sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
      if (!firstLearn) return;
      [1, 3, 7].forEach(k => {
        const date = addDays(firstLearn.date, k); if (daysBetween(start, date) >= horizon || (g.deadline && date > g.deadline)) return;
        const rv = len0 => Object.assign(exerciseFor(g, 0, len0), { type: 'review', steps: STEPS.review(firstLearn.exercise.topic), launch: launchFor('review', firstLearn.exercise.topic), topic: firstLearn.exercise.topic });
        const there = sessions.find(s => s.goalId === g.id && s.date === date);
        if (there) { if (there.status === 'planned' && !keep.some(k => k.id === there.id) && !there.spaced && !there.review && there.exercise.type !== 'learn') { there.review = k; there.exercise = rv(toMin(there.end) - toMin(there.start)); } return; } // that day's session of this goal becomes the review
        const len = 15; if (dayLoad(date) + len > P.maxPerDay) return;
        for (const [a0, a1] of freeIntervals(profile, date)) { let placed = false; for (let t = Math.ceil(a0 / SLOT) * SLOT; t + len <= a1; t += SLOT) { if (clash(date, t, t + len)) continue; sessions.push({ id: uid('s'), goalId: g.id, date, start: hhmm(t), end: hhmm(t + len), status: 'planned', spaced: k, exercise: rv(len) }); addUse(date, t, t + len); placed = true; break; } if (placed) break; }
      });
    });
    renumber(); // the cycle continues around the reviews
    sessions.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    return { sessions, report };
  }
  // every hard constraint, checked independently of how the plan was made (used by the tests and before a move)
  function violations(profile, sessions) {
    const P = Object.assign({}, DEF_PREFS, profile.prefs || {}), out = [], byDay = {};
    sessions.filter(s => s.status !== 'skipped').forEach(s => (byDay[s.date] = byDay[s.date] || []).push(s));
    for (const [date, list] of Object.entries(byDay)) {
      const free = freeIntervals(profile, date), load = list.reduce((t, s) => t + toMin(s.end) - toMin(s.start), 0);
      if (load > P.maxPerDay) out.push({ date, rule: 'daily cap', detail: `${load} > ${P.maxPerDay} min` });
      list.forEach(s => { const a = toMin(s.start), b = toMin(s.end); if (!s.custom && !free.some(([x, y]) => a >= x && b <= y)) out.push({ id: s.id, date, rule: 'outside free time or inside a commitment' }); const g = (profile.goals || []).find(x => x.id === s.goalId); if (g && g.deadline && date > g.deadline) out.push({ id: s.id, date, rule: 'after the deadline' }); });
      const sorted = list.slice().sort((x, y) => x.start.localeCompare(y.start));
      for (let i = 1; i < sorted.length; i++) if (toMin(sorted[i].start) < toMin(sorted[i - 1].end)) out.push({ id: sorted[i].id, date, rule: 'overlap' });
    }
    return out;
  }

  /* ================= 4. edits, regeneration and the diff ================= */
  function checkMove(profile, sessions, id, date, start) {
    const s = sessions.find(x => x.id === id); if (!s) return { ok: false, why: 'not found' };
    const len = toMin(s.end) - toMin(s.start), moved = Object.assign({}, s, { date, start, end: hhmm(toMin(start) + len) });
    const v = violations(profile, sessions.map(x => (x.id === id ? moved : x))).filter(x => x.id === id || (x.date === date && x.rule === 'daily cap'));
    return { ok: !v.length, why: v.map(x => x.rule), moved };
  }
  function regenerate(profile, sessions, today, opts) {
    // kept as they are: anything done, skipped, in the past, or placed/locked by the student
    const keep = sessions.filter(s => s.status !== 'planned' || s.date < today || s.locked);
    const next = plan(profile, Object.assign({ from: weekStart(today), keep, notBefore: today }, opts || {}));
    return Object.assign(next, { diff: diff(sessions, next.sessions) });
  }
  const sig = s => `${s.goalId}|${s.date}|${s.start}|${s.end}|${s.exercise ? s.exercise.type : ''}`;
  function diff(before, after) {
    const A = new Map(before.map(s => [s.id, s])), B = new Map(after.map(s => [s.id, s]));
    const kept = after.filter(s => A.has(s.id)), fresh = after.filter(s => !A.has(s.id)), gone = before.filter(s => !B.has(s.id));
    // a removed and an added session of the same goal on the same day is a move, not a delete + add
    const moved = [], added = [], removed = [], usedNew = new Set();
    gone.forEach(o => { const n = fresh.find(x => !usedNew.has(x.id) && x.goalId === o.goalId && x.date === o.date && sig(x) !== sig(o)); if (n) { usedNew.add(n.id); moved.push({ from: o, to: n }); } else { const same = fresh.find(x => !usedNew.has(x.id) && sig(x) === sig(o)); if (same) usedNew.add(same.id); else removed.push(o); } });
    fresh.forEach(n => { if (!usedNew.has(n.id)) added.push(n); });
    return { added, removed, moved, unchanged: kept.length + (fresh.length - added.length - moved.length) };
  }

  /* ================= 5. progress, weekly review, export ================= */
  function progress(profile, sessions, today) {
    return (profile.goals || []).map(g => {
      const mine = sessions.filter(s => s.goalId === g.id), past = mine.filter(s => s.date <= today);
      const done = mine.filter(s => s.status === 'done'), mins = done.reduce((t, s) => t + (s.minutes || toMin(s.end) - toMin(s.start)), 0);
      const planned = mine.reduce((t, s) => t + toMin(s.end) - toMin(s.start), 0);
      return { goalId: g.id, text: g.text, deadline: g.deadline || null, daysLeft: g.deadline ? daysBetween(today, g.deadline) : null, sessions: mine.length, due: past.length, done: done.length, skipped: mine.filter(s => s.status === 'skipped').length, minutesDone: mins, minutesPlanned: planned, share: planned ? mins / planned : 0 };
    });
  }
  function weekReview(profile, sessions, weekOf) {
    const w0 = weekStart(weekOf), w1 = addDays(w0, 6), wk = sessions.filter(s => s.date >= w0 && s.date <= w1);
    const done = wk.filter(s => s.status === 'done'), skipped = wk.filter(s => s.status === 'skipped'), open = wk.filter(s => s.status === 'planned');
    const reasons = {}; skipped.forEach(s => { const r = s.reason || 'no reason given'; reasons[r] = (reasons[r] || 0) + 1; });
    const ratings = done.filter(s => s.rating).map(s => s.rating), byType = {};
    done.forEach(s => { const t = s.exercise ? s.exercise.type : 'other'; byType[t] = (byType[t] || 0) + 1; });
    const goalLines = (profile.goals || []).map(g => { const a = wk.filter(s => s.goalId === g.id); return { goal: g.text, done: a.filter(s => s.status === 'done').length, of: a.length }; }).filter(x => x.of);
    const suggestions = [];
    if (skipped.length >= 2 && Object.keys(reasons).some(r => /tired|late|evening/i.test(r))) suggestions.push(['Several sessions were skipped as tired or late — move some to an earlier time?', 'تخطيت عدة جلسات بسبب التعب — نقلها لوقت أبكر؟']);
    if (skipped.length >= 2 && Object.keys(reasons).some(r => /no time|busy|overrun/i.test(r))) suggestions.push(['Time ran out for some sessions — a lower daily cap or shorter sessions might fit better.', 'نفد الوقت لبعض الجلسات — جرّب حداً يومياً أقل أو جلسات أقصر.']);
    if (ratings.length >= 3 && ratings.filter(r => r <= 2).length / ratings.length >= 0.5) suggestions.push(['Many sessions felt hard — add a “See it” session before practice next week?', 'كثير من الجلسات بدت صعبة — أضف جلسة «شاهدها» قبل التدريب؟']);
    if (done.length && !skipped.length && open.length === 0) suggestions.push(['Everything planned was done. Keep the same plan, or add a little more?', 'أنجزت كل المخطط. حافظ على الخطة أو أضف قليلاً؟']);
    return { week: w0, planned: wk.length, done: done.length, skipped: skipped.length, open: open.length, minutes: done.reduce((t, s) => t + (s.minutes || toMin(s.end) - toMin(s.start)), 0), reasons, byType, goals: goalLines, suggestions, avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null };
  }
  // what Noor is given for the weekly review: the numbers and the student's own notes — nothing else
  function reviewText(R, lang) {
    const g = R.goals.map(x => `- ${x.goal}: ${x.done}/${x.of} sessions done`).join('\n');
    return `My Growth Plan week starting ${R.week}: ${R.done} of ${R.planned} sessions done (${R.minutes} minutes), ${R.skipped} skipped${Object.keys(R.reasons).length ? ' (' + Object.entries(R.reasons).map(([k, v]) => `${k} ×${v}`).join(', ') + ')' : ''}, ${R.open} still open.\n${g}${R.avgRating ? `\nHow the sessions felt (1 hard – 5 easy): ${R.avgRating.toFixed(1)} on average.` : ''}\nPlease help me review the week: what worked, what to change, and one small adjustment for next week. Don’t judge my ability.`;
  }
  const icsEsc = s => String(s).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  function toICS(profile, sessions) {
    const goals = Object.fromEntries((profile.goals || []).map(g => [g.id, g])), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const ev = sessions.filter(s => s.status !== 'skipped').map(s => { const d = s.date.replace(/-/g, ''); const ex = s.exercise || {}, t = TYPES[ex.type] || { title: ['Study'] }; return ['BEGIN:VEVENT', `UID:${s.id}@erly`, `DTSTAMP:${stamp}`, `DTSTART:${d}T${s.start.replace(':', '')}00`, `DTEND:${d}T${s.end.replace(':', '')}00`, `SUMMARY:${icsEsc(`${t.title[0]}: ${ex.topic || (goals[s.goalId] || {}).text || 'Study'}`)}`, `DESCRIPTION:${icsEsc((ex.steps || []).map((x, i) => `${i + 1}. ${x}`).join('\n'))}`, 'END:VEVENT'].join('\r\n'); });
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ERLY//Growth Plan//EN', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
  }
  function toCSV(profile, sessions) {
    const goals = Object.fromEntries((profile.goals || []).map(g => [g.id, g])), q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    return ['date,start,end,goal,activity,topic,status', ...sessions.map(s => [s.date, s.start, s.end, (goals[s.goalId] || {}).text, s.exercise ? s.exercise.type : '', s.exercise ? s.exercise.topic : '', s.status].map(q).join(','))].join('\n') + '\n';
  }

  return { DAYS, TYPES, CYCLES, DEF_PREFS, toMin, hhmm, iso, addDays, dayKey, daysBetween, weekStart, understand, parseDate, parseTime, exerciseFor, exerciseOf, launchFor, weeklyNeed, freeIntervals, plan, violations, checkMove, regenerate, diff, progress, weekReview, reviewText, toICS, toCSV };
});
