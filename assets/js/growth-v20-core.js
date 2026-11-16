/* ERLY — Growth Plan v20 core: programmes, activities, plan generation, reviews, history.
   Programmes are OPTIONAL EDUCATIONAL SUPPORT — study habits and practice. They are not treatment, therapy or
   remediation, they do not measure ability, and nothing here infers a condition. Scores inside an activity are
   feedback on that exercise only; they are never combined into a rating of the student.
   Pure functions (no DOM) so the unit tests can run them in Node: window.ERLY_GROWTH in the browser. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_GROWTH = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const parse = s => new Date(s + 'T12:00:00');
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const dayKey = s => DAYS[(parse(s).getDay() + 6) % 7];
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (arr, seed) => arr[hash(seed) % arr.length];

  /* ---------- activities: each `make(level, seed)` returns one concrete exercise ---------- */
  const PASSAGES = [
    { t: 'Sleep and memory', p: 'During deep sleep the brain replays what was learned during the day. Studies of students show that a night of sleep after studying helps facts stick better than the same hours spent awake. Cramming late into the night can therefore undo some of the effort it took.', main: 'Sleep helps the brain keep what was learned.', wrong: ['Students should study only at night.', 'Deep sleep is the same as being awake.', 'Cramming always improves results.'], word: ['replays', 'goes over again', ['forgets', 'speeds up', 'records']] },
    { t: 'Why bridges sway', p: 'Long bridges are designed to move a little. Wind and traffic push on them, and a structure that could not bend would crack. Engineers add dampers — heavy weights or pistons — that soak up the motion so the swaying stays small and safe.', main: 'Bridges are built to bend slightly, with dampers to keep the motion safe.', wrong: ['Bridges should never move at all.', 'Wind cannot affect large bridges.', 'Dampers make bridges sway more.'], word: ['soak up', 'absorb', ['increase', 'measure', 'reflect']] },
    { t: 'Coral reefs', p: 'Coral reefs cover a tiny part of the ocean floor but shelter about a quarter of all marine species. The corals depend on algae living inside them. When the water gets too warm the algae leave, the coral turns white, and without help it can starve.', main: 'Reefs support many species and depend on algae that leave when water is too warm.', wrong: ['Coral reefs cover most of the ocean floor.', 'Algae harm corals.', 'White coral is the healthiest coral.'], word: ['shelter', 'give a home to', ['hide from', 'eat', 'count']] },
    { t: 'The first maps', p: 'Early maps were drawn from travellers’ stories, so distant places were often the wrong size or in the wrong place. As ships began to measure position with stars and clocks, maps became accurate enough to sail by, and empty spaces on them slowly filled in.', main: 'Maps became accurate as navigation tools improved.', wrong: ['The earliest maps were perfectly accurate.', 'Stars made maps less accurate.', 'Maps were never used for sailing.'], word: ['accurate', 'correct and exact', ['beautiful', 'old', 'large']] },
    { t: 'Bees and colour', p: 'Bees see ultraviolet light, which people cannot. Many flowers have ultraviolet patterns, invisible to us, that point like runways towards the nectar. A flower that looks plain yellow to a person may look striped to a bee.', main: 'Bees see ultraviolet patterns on flowers that guide them to nectar.', wrong: ['Bees cannot see colour.', 'All flowers look the same to bees and people.', 'Ultraviolet light hides nectar from bees.'], word: ['invisible', 'cannot be seen', ['bright', 'small', 'dangerous']] },
    { t: 'Recycling aluminium', p: 'Making a can from recycled aluminium uses about a twentieth of the energy needed to make one from raw ore. Aluminium can be melted and reshaped again and again without losing quality, which is why a recycled can may be back on a shelf within weeks.', main: 'Recycling aluminium saves most of the energy and can be repeated without losing quality.', wrong: ['Recycled aluminium is weaker each time.', 'Making cans from ore uses less energy.', 'Cans cannot be recycled more than once.'], word: ['reshaped', 'formed into a new shape', ['painted', 'weighed', 'thrown away']] }
  ];
  const PARAS = [
    ['Many students study best in short sessions.', 'For example, three 20-minute blocks often beat one long hour.', 'Short breaks give the brain time to settle what it has just taken in.', 'So planning a few focused blocks can make study time count for more.'],
    ['Cities are getting hotter than the land around them.', 'Dark roads and roofs absorb sunlight and release it as heat.', 'Planting trees and using lighter surfaces can cool streets by several degrees.', 'Small design choices can therefore make cities more comfortable.'],
    ['Learning a language takes regular practice.', 'Ten minutes a day keeps new words fresh.', 'Speaking, even with mistakes, builds confidence faster than silent study.', 'Steady, imperfect practice is the quickest route to fluency.'],
    ['Good notes are short and in your own words.', 'Copying whole sentences rarely helps you remember them.', 'Rewriting an idea simply forces you to understand it first.', 'This is why paraphrasing is one of the most useful study skills.']
  ];
  const COMBINE = [
    { a: 'The library was quiet.', b: 'Many students were working there.', good: 'The library was quiet, although many students were working there.', bad: ['The library was quiet many students were working there.', 'The library, was quiet, many students, were working there.'] },
    { a: 'Rana finished her essay.', b: 'She went for a walk.', good: 'After Rana finished her essay, she went for a walk.', bad: ['Rana finished her essay she went for a walk.', 'Rana finished her essay, and, she went, for a walk.'] },
    { a: 'The experiment failed.', b: 'The team learned something useful.', good: 'The experiment failed, but the team learned something useful.', bad: ['The experiment failed the team learned something useful.', 'The experiment failed, because the team learned something useful.'] },
    { a: 'It was raining.', b: 'The match continued.', good: 'Even though it was raining, the match continued.', bad: ['It was raining, so the match continued.', 'It was raining the match continued.'] }
  ];
  const REFRAMES = [
    { thought: '“I got that question wrong, so I’m bad at this subject.”', good: '“That question showed me what to practise next.”', bad: ['“I should stop trying.”', '“Everyone else finds this easy.”'] },
    { thought: '“I didn’t study as much as I planned this week.”', good: '“I did some study, and I can plan a smaller, realistic target.”', bad: ['“The week is ruined.”', '“Plans never work for me.”'] },
    { thought: '“Asking for help means I can’t cope.”', good: '“Asking for help is a normal study skill that saves time.”', bad: ['“I have to figure everything out alone.”', '“People will think less of me.”'] },
    { thought: '“My first draft is messy.”', good: '“First drafts are meant to be messy; editing is the next step.”', bad: ['“Good writers get it right first time.”', '“I should delete it and give up.”'] }
  ];
  const STEPSQ = [
    { task: 'Write a 1,500-word essay', steps: ['Read the question and underline key words', 'Collect 4–5 sources and take short notes', 'Write an outline with one line per paragraph', 'Draft the body paragraphs', 'Write the introduction and conclusion', 'Edit and check references'] },
    { task: 'Prepare for a chemistry test', steps: ['List the topics in the test', 'Mark which ones feel least secure', 'Do practice questions on those first', 'Make flashcards of key equations', 'Do one timed practice paper', 'Review the mistakes'] },
    { task: 'Give a 5-minute presentation', steps: ['Decide the one main message', 'Choose three supporting points', 'Make simple slides for each point', 'Write short speaker notes', 'Practise out loud twice', 'Time it and trim'] }
  ];
  const lvl = l => (l === 'gentle' ? 0 : l === 'stretch' ? 2 : 1);
  const shuffle = (arr, seed) => { const a = arr.slice(); let h = hash(seed); for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mcq = (q, good, bad, seed, explain, extra) => Object.assign({ type: 'mcq', q, options: shuffle([good].concat(bad), seed), answer: good, explain }, extra || {});

  const ACT = {
    // reading
    mainidea: { title: 'Find the main idea', mins: 4, make: (l, s) => { const P = pick(PASSAGES, s); return mcq('What is the main idea of this passage?', P.main, P.wrong.slice(0, 2 + lvl(l) > 3 ? 3 : 2 + lvl(l)), s, 'The main idea is the point every sentence supports. Skim the first and last sentences first — they often carry it.', { passage: P.p, ptitle: P.t }); } },
    vocab: { title: 'Words in context', mins: 3, make: (l, s) => { const P = pick(PASSAGES, s + 'v'); return mcq(`In the passage, what does “${P.word[0]}” mean?`, P.word[1], P.word[2], s, 'Use the sentence around a word to guess its meaning, then check that your guess still makes sense in the sentence.', { passage: P.p, ptitle: P.t }); } },
    summary: { title: 'Say it in one sentence', mins: 5, make: (l, s) => { const P = pick(PASSAGES, s + 's'); return { type: 'write', q: 'Read the passage, then sum it up in one sentence of your own.', passage: P.p, ptitle: P.t, minWords: [6, 8, 12][lvl(l)], model: P.main, explain: 'Compare your sentence with the example. Different wording is fine — what matters is that the key idea is there.' }; } },
    guided: { title: 'Guided reading in the Learning Studio', mins: 10, make: () => ({ type: 'link', q: 'Open a reading in Guided mode (focus line, short sections, a summary after each). Come back and mark it done.', href: 'learn.html#/read/readings', label: 'Open Reading & Resources' }) },
    // writing
    order: { title: 'Build a paragraph', mins: 4, make: (l, s) => { const P = pick(PARAS, s); return { type: 'order', q: 'Put these sentences in the order that makes the clearest paragraph.', items: P, start: shuffle(P, s), explain: 'Topic sentence first, then an example or reason, then why it matters, then a closing sentence.' }; } },
    combine: { title: 'Combine two sentences', mins: 3, make: (l, s) => { const C = pick(COMBINE, s); return mcq(`Which is the clearest way to join: “${C.a}” + “${C.b}”`, C.good, C.bad, s, 'A joining word (although, after, but, even though) shows how the two ideas relate.'); } },
    freewrite: { title: 'Free-write', mins: 6, make: (l, s) => ({ type: 'write', q: pick(['Write about something you learned this week that surprised you.', 'Describe a place where you study best, and why.', 'Explain one idea from a recent lecture as if to a friend.', 'Write about a goal you have for this term.'], s), minWords: [30, 50, 80][lvl(l)], timer: [3, 5, 7][lvl(l)] * 60, explain: 'Free-writing is for getting words down, not for perfect sentences. Your text stays on this device.' }) },
    handwarm: { title: 'Handwriting warm-up', mins: 5, make: () => ({ type: 'link', q: 'Copy three short sentences in the Handwriting Studio, at your own pace. Nothing is judged or saved.', href: 'handwriting.html', label: 'Open the Handwriting Studio' }) },
    // maths
    estimate: { title: 'Estimate first', mins: 3, make: (l, s) => { const h = hash(s), a = [19, 48, 31, 72, 59, 88][h % 6], b = [21, 9, 41, 12, 19, 31][(h >>> 3) % 6], c = l === 'stretch' ? [3.9, 6.1, 2.05][(h >>> 6) % 3] : 1; const ans = Math.round(a * b * c * 100) / 100, r1 = x => { const k = Math.pow(10, Math.floor(Math.log10(x))); return Math.round(x / k) * k; }, ra = r1(a), rb = r1(b), rc = c !== 1 ? Math.round(c) : 1; return { type: 'numeric', q: `Without a calculator, estimate ${a} × ${b}${c !== 1 ? ' × ' + c : ''}. An answer within 10% counts.`, answer: ans, tol: 0.1, explain: `Round each number first: ${ra} × ${rb}${c !== 1 ? ' × ' + rc : ''} ≈ ${Math.round(ra * rb * rc)}. The exact answer is ${ans}.` }; } },
    percent: { title: 'Percentages', mins: 3, make: (l, s) => { const h = hash(s), p = [10, 15, 20, 25, 30, 12.5][h % (l === 'gentle' ? 3 : 6)], n = [40, 80, 120, 240, 360, 64][(h >>> 4) % 6], ans = Math.round(p * n) / 100; return { type: 'numeric', q: `What is ${p}% of ${n}?`, answer: ans, tol: 0.001, explain: `${p}% means ${p}/100. Find 10% (${n / 10}) and scale: ${p}% of ${n} = ${ans}.` }; } },
    fraction: { title: 'Fractions', mins: 3, make: (l, s) => { const Q = [['1/2 + 1/4', '3/4', ['2/6', '1/6']], ['2/3 of 18', '12', ['6', '9']], ['3/4 − 1/2', '1/4', ['2/2', '1/2']], ['1/3 + 1/6', '1/2', ['2/9', '1/9']], ['5/8 of 40', '25', ['20', '30']]]; const q = pick(Q, s); return mcq(`Work out ${q[0]}.`, q[1], q[2], s, 'With different denominators, rewrite both fractions over a common denominator first.'); } },
    practice: { title: 'Practice in the Learning Studio', mins: 10, make: () => ({ type: 'link', q: 'Do a short practice set — questions explain themselves when you get one wrong.', href: 'learn.html#/practice', label: 'Open Practice & Revision' }) },
    // memory
    recall: { title: 'Look, cover, recall', mins: 3, make: (l, s) => { const pool = ['river', 'candle', 'orbit', 'lemon', 'violin', 'harbour', 'pencil', 'maple', 'comet', 'saddle', 'garden', 'tunnel', 'basket', 'falcon']; const n = [4, 6, 8][lvl(l)]; return { type: 'recall', q: `Look at these ${n} words for ${[12, 15, 18][lvl(l)]} seconds. Then type as many as you remember, in any order.`, items: shuffle(pool, s).slice(0, n), secs: [12, 15, 18][lvl(l)], explain: 'Linking words into a little story or picture usually doubles how many you keep.' }; } },
    digits: { title: 'Chunk a number', mins: 2, make: (l, s) => { const h = hash(s), n = [6, 8, 10][lvl(l)], d = String(h).padEnd(12, '7').slice(0, n); return { type: 'recall', q: `Remember this number. Try splitting it into chunks of 2 or 3.`, items: [d], secs: 6, exact: true, explain: 'Chunking (like 07 93 41) lets working memory hold more digits.' }; } },
    revise: { title: 'Spaced review', mins: 8, make: () => ({ type: 'link', q: 'Review your due flashcards — the Learning Studio spaces them out so you see each just before you would forget it.', href: 'learn.html#/revise', label: 'Open flashcards' }) },
    // planning
    breakdown: { title: 'Break a task down', mins: 4, make: (l, s) => { const B = pick(STEPSQ, s); return { type: 'order', q: `Put these steps for “${B.task}” in a sensible order.`, items: B.steps.slice(0, [4, 5, 6][lvl(l)]), start: shuffle(B.steps.slice(0, [4, 5, 6][lvl(l)]), s), explain: 'There is often more than one good order. Starting with understanding the task, and ending with checking, usually works.' }; } },
    mytask: { title: 'Plan one real task', mins: 5, make: () => ({ type: 'steps', q: 'Pick one real task coming up. Write it, then split it into three small first steps you could each do in under 30 minutes.', n: 3, explain: 'Small, concrete first steps make starting easier. These notes stay on this device.' }) },
    timecheck: { title: 'Time-estimate check', mins: 3, make: () => ({ type: 'estimate', q: 'Think of a study task you will do today. How many minutes do you expect it to take? Later, note how long it really took.', explain: 'Most people underestimate. Comparing estimate and reality over a few weeks makes planning more accurate.' }) },
    // confidence
    reframe: { title: 'A kinder way to say it', mins: 3, make: (l, s) => { const R = pick(REFRAMES, s); return mcq(`Which is a more helpful way to think about ${R.thought}`, R.good, R.bad, s, 'Helpful thoughts are still honest — they describe what happened and point to a next step.'); } },
    evidence: { title: 'Evidence of progress', mins: 3, make: () => ({ type: 'write', q: 'Write down one thing you did this week that moved you forward — however small.', minWords: 5, explain: 'Noticing real progress, with evidence, builds steadier confidence than general praise.' }) },
    askhelp: { title: 'Practise asking for help', mins: 4, make: () => ({ type: 'template', q: 'Fill in the gaps to draft a short message asking a tutor or Student Accessibility Services for help.', parts: ['Hello, I’m working on ', ' and I’m finding ', ' difficult. Could we ', '? Thank you.'], explain: 'A specific request (what, where it’s hard, what you’d like) usually gets a faster, more useful answer.' }) },
    breathe: { title: 'One-minute pause', mins: 1, make: () => ({ type: 'timer', q: 'Breathe in as the circle grows and out as it shrinks. Stop whenever you like.', secs: 60, explain: 'A short pause before study can make it easier to settle into the task.' }) }
  };

  const PROGRAMMES = [
    { id: 'reading', title: 'Reading', icon: 'book', hue: 210, blurb: 'Skim for the main idea, work out words from context, and sum up in your own words.', is: 'Short reading exercises and links to guided reading in the Learning Studio.', goals: ['Find the main idea of a text faster', 'Understand new words from context', 'Summarise what I read in my own words', 'Read for 15 minutes without losing my place'], acts: ['mainidea', 'vocab', 'summary', 'guided'] },
    { id: 'writing', title: 'Writing', icon: 'pen', hue: 18, blurb: 'Build clear paragraphs, join ideas smoothly and get words on the page.', is: 'Paragraph-building, sentence practice, timed free-writing and optional handwriting warm-ups.', goals: ['Organise paragraphs more clearly', 'Start writing without a long delay', 'Join ideas with linking words', 'Write a first draft before editing'], acts: ['order', 'combine', 'freewrite', 'handwarm'] },
    { id: 'maths', title: 'Maths', icon: 'calc', hue: 160, blurb: 'Estimate before you calculate and get comfortable with percentages and fractions.', is: 'Quick number exercises with worked feedback, and practice sets in the Learning Studio.', goals: ['Estimate answers before calculating', 'Feel at ease with percentages', 'Work with fractions confidently', 'Check my answers make sense'], acts: ['estimate', 'percent', 'fraction', 'practice'] },
    { id: 'memory', title: 'Memory & revision', icon: 'brain', hue: 280, blurb: 'Retrieval practice, chunking and spaced review — study techniques with good evidence behind them.', is: 'Recall exercises and spaced flashcard review. These are study techniques, not memory tests.', goals: ['Use retrieval practice when revising', 'Review flashcards a little each day', 'Remember key terms for exams', 'Try chunking long information'], acts: ['recall', 'digits', 'revise'] },
    { id: 'planning', title: 'Planning & organisation', icon: 'calendar', hue: 40, blurb: 'Break big tasks into small steps and get better at estimating time.', is: 'Task breakdown practice, real-task planning and time-estimate checks.', goals: ['Break big assignments into steps', 'Estimate how long tasks take', 'Start tasks earlier', 'Keep a simple weekly plan'], acts: ['breakdown', 'mytask', 'timecheck'] },
    { id: 'confidence', title: 'Study confidence', icon: 'sprout', hue: 130, blurb: 'Notice your progress, practise kinder self-talk and feel ready to ask for help.', is: 'Short reflective activities. This is study support, not therapy or counselling — if you are struggling, the Get support page lists people to talk to.', goals: ['Notice my progress', 'Be kinder to myself after mistakes', 'Feel ready to ask for help', 'Settle before studying'], acts: ['reframe', 'evidence', 'askhelp', 'breathe'] }
  ];
  const byId = id => PROGRAMMES.find(p => p.id === id);

  const DEFAULT_CFG = { weeks: 4, days: ['mon', 'wed', 'fri'], mins: 15, level: 'steady', format: 'mixed', reminders: 'none', review: 'weekly', breaks: 'none' };
  const validCfg = c => {
    const o = Object.assign({}, DEFAULT_CFG, c || {});
    o.weeks = Math.max(1, Math.min(12, Math.round(+o.weeks || 4)));
    o.days = (Array.isArray(o.days) ? o.days : []).filter(d => DAYS.includes(d)); if (!o.days.length) o.days = ['mon'];
    o.mins = [5, 10, 15, 20, 30].includes(+o.mins) ? +o.mins : 15;
    if (!['gentle', 'steady', 'stretch'].includes(o.level)) o.level = 'steady';
    if (!['mixed', 'interactive', 'reflective'].includes(o.format)) o.format = 'mixed';
    if (!['none', 'banner', 'calendar'].includes(o.reminders)) o.reminders = 'none';
    if (!['weekly', 'fortnightly'].includes(o.review)) o.review = 'weekly';
    if (!['none', 'between'].includes(o.breaks)) o.breaks = 'none';
    return o;
  };

  /* ---------- state ---------- */
  const empty = () => ({ v: 20, programmes: {}, history: [] });
  function log(S, ev, pid, detail) { S.history.unshift({ at: Date.now(), ev, pid: pid || null, detail: detail || '' }); if (S.history.length > 300) S.history.length = 300; }
  function start(S, pid, cfg, goals, date) {
    if (!byId(pid)) throw new Error('unknown programme ' + pid);
    S.programmes[pid] = { id: pid, status: 'active', started: date, cfg: validCfg(cfg), goals: (goals || []).map((g, i) => ({ id: 'g' + i + '-' + hash(g.text || g).toString(36).slice(0, 4), text: String(g.text || g).slice(0, 140), custom: !!g.custom, done: false })), days: {}, reviews: [], pausedDays: 0, pausedAt: null };
    log(S, 'start', pid); return S.programmes[pid];
  }
  function change(S, pid, cfg, goals) { const P = S.programmes[pid]; if (!P) return; if (cfg) P.cfg = validCfg(Object.assign({}, P.cfg, cfg)); if (goals) P.goals = goals; log(S, 'change', pid); }
  function pause(S, pid, date) { const P = S.programmes[pid]; if (!P || P.status !== 'active') return; P.status = 'paused'; P.pausedAt = date; log(S, 'pause', pid); }
  function resume(S, pid, date) { const P = S.programmes[pid]; if (!P || P.status !== 'paused') return; P.pausedDays += Math.max(0, daysBetween(P.pausedAt, date)); P.pausedAt = null; P.status = 'active'; log(S, 'resume', pid); }
  function remove(S, pid) { const P = S.programmes[pid]; if (!P) return; delete S.programmes[pid]; log(S, 'remove', pid, `${Object.keys(P.days).length} days of activity removed`); }
  function restart(S, pid, date) { const P = S.programmes[pid]; if (!P) return; const done = Object.keys(P.days).length; P.status = 'active'; P.started = date; P.days = {}; P.reviews = []; P.pausedDays = 0; P.pausedAt = null; P.goals.forEach(g => { g.done = false; }); log(S, 'restart', pid, `${done} earlier days cleared`); }

  // the programme's end date (pauses push it back)
  const endDate = P => addDays(P.started, P.cfg.weeks * 7 - 1 + (P.pausedDays || 0) + (P.pausedAt ? 0 : 0));
  const weekOf = (P, date) => Math.floor(daysBetween(P.started, date) / 7) + 1;
  function scheduled(P, date) { return P.status === 'active' && date >= P.started && date <= endDate(P) && P.cfg.days.includes(dayKey(date)); }

  // today's activities for a programme: rotate through its activity bank, fitting the session length
  function session(P, date) {
    const prog = byId(P.id); let bank = prog.acts.slice();
    if (P.cfg.format === 'interactive') bank = bank.filter(a => !['write', 'template', 'steps', 'estimate'].includes(ACT[a].make(P.cfg.level, 'x').type));
    if (P.cfg.format === 'reflective') bank = bank.filter(a => ['write', 'template', 'steps', 'estimate', 'link', 'timer'].includes(ACT[a].make(P.cfg.level, 'x').type));
    if (!bank.length) bank = prog.acts.slice();
    const offset = hash(P.id + date) % bank.length, out = []; let used = 0;
    for (let i = 0; i < bank.length && (used < P.cfg.mins || !out.length); i++) { const id = bank[(offset + i) % bank.length]; if (out.length && used + ACT[id].mins > P.cfg.mins + 2) continue; out.push(id); used += ACT[id].mins; }
    return out.map((id, i) => Object.assign({ id, n: i, title: ACT[id].title, mins: ACT[id].mins }, ACT[id].make(P.cfg.level, `${P.id}|${date}|${id}`)));
  }

  /* ---------- checking an answer (feedback only; never aggregated into a score of the student) ---------- */
  const normW = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  function check(ex, input) {
    switch (ex.type) {
      case 'mcq': return { ok: input === ex.answer, answer: ex.answer };
      case 'numeric': { const v = parseFloat(String(input).replace(/,/g, '')); if (!isFinite(v)) return { ok: false, answer: ex.answer, invalid: true }; return { ok: Math.abs(v - ex.answer) <= Math.max(Math.abs(ex.answer) * ex.tol, 1e-9), answer: ex.answer }; }
      case 'order': { const right = (input || []).filter((x, i) => x === ex.items[i]).length; return { ok: right === ex.items.length, right, of: ex.items.length, answer: ex.items }; }
      case 'recall': { if (ex.exact) { const v = String(input || '').replace(/\D/g, ''); return { ok: v === ex.items[0], answer: ex.items[0], right: [...v].filter((c, i) => c === ex.items[0][i]).length, of: ex.items[0].length }; } const got = new Set(normW(input)); const right = ex.items.filter(w => got.has(w)).length; return { ok: right === ex.items.length, right, of: ex.items.length, answer: ex.items }; }
      case 'write': { const n = normW(input).length; return { ok: n >= ex.minWords, words: n, need: ex.minWords }; }
      default: return { ok: true };
    }
  }

  /* ---------- days, reflection, reviews ---------- */
  function record(P, date, actId, result) { const d = P.days[date] = P.days[date] || { acts: {} }; d.acts[actId] = Object.assign({ at: Date.now() }, result || {}); }
  function reflect(P, date, feel, note) { const d = P.days[date] = P.days[date] || { acts: {} }; d.reflection = { feel: ['easy', 'okay', 'hard', 'skip'].includes(feel) ? feel : 'skip', note: String(note || '').slice(0, 600) }; }
  const dayDone = (P, date) => { const d = P.days[date]; return !!(d && (d.reflection || Object.keys(d.acts).length >= session(P, date).length)); };
  function plannedDates(P, until) { const out = []; const end = until < endDate(P) ? until : endDate(P); for (let d = P.started; d <= end; d = addDays(d, 1)) if (P.cfg.days.includes(dayKey(d))) out.push(d); return out; }
  function weekStats(P, fromDate, toDate) { const planned = plannedDates(P, toDate).filter(d => d >= fromDate), done = Object.keys(P.days).filter(d => d >= fromDate && d <= toDate && Object.keys(P.days[d].acts).length); return { planned: planned.length, done: done.length, extra: done.filter(d => !planned.includes(d)).length }; }
  // a review covers everything since the previous review (or since the start)
  const reviewFrom = P => (P.reviews.length ? addDays(P.reviews[P.reviews.length - 1].date, 1) : P.started);
  function reviewDue(P, date) {
    if (P.status !== 'active') return false;
    const every = P.cfg.review === 'fortnightly' ? 14 : 7, last = P.reviews.length ? P.reviews[P.reviews.length - 1].date : P.started;
    return daysBetween(last, date) >= every && Object.keys(P.days).some(d => d > (P.reviews.length ? last : addDays(P.started, -1)));
  }
  function addReview(S, pid, date, r) {
    const P = S.programmes[pid]; if (!P) return;
    const stats = weekStats(P, reviewFrom(P), date);
    P.reviews.push({ date, week: weekOf(P, date), went: String(r.went || '').slice(0, 600), hard: String(r.hard || '').slice(0, 600), next: String(r.next || '').slice(0, 300), adjust: r.adjust || 'keep', stats });
    const c = P.cfg, mins = [5, 10, 15, 20, 30];
    if (r.adjust === 'lighter') { c.mins = mins[Math.max(0, mins.indexOf(c.mins) - 1)]; if (c.level === 'stretch') c.level = 'steady'; else if (c.level === 'steady' && c.mins === 5) c.level = 'gentle'; }
    if (r.adjust === 'more') { c.mins = mins[Math.min(mins.length - 1, mins.indexOf(c.mins) + 1)]; }
    if (r.adjust === 'harder') c.level = c.level === 'gentle' ? 'steady' : 'stretch';
    log(S, 'review', pid, r.adjust || 'keep');
  }
  // the journey: one node per planned session, with what happened — "missed" is shown neutrally as "open"
  function journey(P, date) {
    const end = endDate(P), out = [];
    for (let d = P.started; d <= end; d = addDays(d, 1)) {
      const planned = P.cfg.days.includes(dayKey(d)), did = P.days[d] && Object.keys(P.days[d].acts).length > 0;
      if (!planned && !did) continue;
      out.push({ date: d, week: weekOf(P, d), state: did ? 'done' : d < date ? 'open' : d === date ? 'today' : 'ahead', extra: did && !planned });
    }
    return out;
  }
  // an .ics calendar of the planned sessions, for students who chose calendar reminders
  function ics(S, date) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ERLY//Growth Plan//EN', 'CALSCALE:GREGORIAN'];
    for (const P of Object.values(S.programmes)) {
      if (P.status !== 'active') continue; const prog = byId(P.id);
      for (const d of plannedDates(P, endDate(P)).filter(x => x >= date)) {
        const ds = d.replace(/-/g, '');
        lines.push('BEGIN:VEVENT', `UID:erly-${P.id}-${ds}@erly.local`, `DTSTAMP:${ds}T080000Z`, `DTSTART;VALUE=DATE:${ds}`, `SUMMARY:ERLY Growth Plan — ${prog.title} (${P.cfg.mins} min)`, 'DESCRIPTION:Optional study practice. Open ERLY → Growth Plan.', 'END:VEVENT');
      }
    }
    lines.push('END:VCALENDAR'); return lines.join('\r\n');
  }

  return { DAYS, PROGRAMMES, ACT, DEFAULT_CFG, iso, addDays, dayKey, daysBetween, byId, validCfg, empty, start, change, pause, resume, remove, restart, endDate, weekOf, scheduled, session, check, record, reflect, dayDone, plannedDates, weekStats, reviewFrom, reviewDue, addReview, journey, ics, log };
});
