/* ERLY Learning Studio — the personal learning engine.

   WHAT IT MEASURES. Progress is tracked per learning OBJECTIVE (each lesson states its objectives; every question
   is linked to one). Evidence comes only from things the student did in the Studio:
     answers (correct / incorrect, which attempt, whether hints were used) · lesson sections viewed and finished ·
     explanations opened ("Show me why") · models and experiences explored · predictions made in experiments ·
     flashcards recalled or not · reading finished · video chapters watched · revision done.
   Never: time spent hesitating, keystrokes, camera, microphone or anything outside the Studio.

   WHAT IT SAYS. Each objective gets one of eight transparent states, always with the evidence behind it:
     Not started · Exploring · Learning · Practising · Needs revisiting · Developing understanding ·
     Demonstrated understanding · Ready for review.
   States describe where a piece of LEARNING is, never the student. They change as soon as new evidence arrives,
   in both directions, and none of them is a grade, a prediction or a diagnosis.

   "Demonstrated understanding" needs at least two DIFFERENT questions on the objective answered correctly without
   hints (or the only question there is, right first time without hints), and the latest answer correct.
   It becomes "Ready for review" after 10 days without new evidence — that is spacing, not forgetting.

   The core functions are pure (data in, results out) so they can be tested in Node; the browser glue at the end
   wires them to the Studio's store. */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const REVIEW_AFTER = 10 * DAY;

  /* Question → objective index for the v19 lessons (bank questions and the newer lessons carry `objective`
     themselves). Authored from each question's prompt against the lesson's stated objectives. */
  const OBJ_MAP = {
    'bio-heart': { 'h-why-1': 1, 'h-label': 0, 'h-order': 1, 'h-tf-pa': 1, 'h-cmp': 0, 'h-match': 0, 'h-co': 3, 'h-lv': 2, 'h-short': 1, 'h-r1': 1, 'h-r2': 0 },
    'bio-photo': { 'p-fill': 0, 'p-bal': 0, 'p-match': 1, 'p-graph': 2, 'p-steps': 2, 'p-r1': 2 },
    'chem-ph': { 'c-fill': 3, 'c-ph1': 1, 'c-ph2': 1, 'c-sort': 0, 'c-cmp': 2, 'c-mcq': 3, 'c-r1': 1 },
    'chem-vsepr': { 'v-num': 1, 'v-match': 1, 'v-why': 2, 'v-steps': 1, 'v-r1': 0 },
    'math-quad': { 'q-a': 0, 'q-expr': 1, 'q-graph': 1, 'q-disc': 2, 'q-slider': 2, 'q-steps': 3, 'q-r1': 2 },
    'math-deriv': { 'd-grad': 0, 'd-tf': 0, 'd-expr': 2, 'd-rate': 2, 'd-r1': 2 },
    'phys-newton': { 'n-tf': 2, 'n-num': 1, 'n-slider': 1, 'n-steps': 0, 'n-graph': 1, 'n-mcq': 1, 'n-r1': 1 },
    'phys-circuits': { 'e-match': 0, 'e-num': 1, 'e-par': 2, 'e-steps': 2, 'e-sort': 2, 'e-r1': 2 }
  };

  const STATES = {
    not: { label: 'Not started', tone: 'none', desc: 'Nothing done on this yet.' },
    exploring: { label: 'Exploring', tone: 'info', desc: 'You have opened or explored it. No questions answered yet.' },
    learning: { label: 'Learning', tone: 'info', desc: 'You have worked through the explanation. Questions come next.' },
    practising: { label: 'Practising', tone: 'work', desc: 'You have started answering questions. More evidence is needed either way.' },
    revisit: { label: 'Needs revisiting', tone: 'warn', desc: 'Recent answers did not go as hoped. Another approach usually helps.' },
    developing: { label: 'Developing understanding', tone: 'work', desc: 'Some correct answers, some with help or after a retry. It is coming together.' },
    demonstrated: { label: 'Demonstrated understanding', tone: 'ok', desc: 'Different questions answered correctly without hints, most recently too.' },
    review: { label: 'Ready for review', tone: 'review', desc: 'Demonstrated earlier; a quick check now helps it last.' }
  };
  const ORDER = ['not', 'exploring', 'learning', 'practising', 'revisit', 'developing', 'demonstrated', 'review'];
  const dayKey = t => new Date(t).toISOString().slice(0, 10);
  const fmtDay = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  /* ---------- the objective registry ---------- */
  function objOf(q) {
    if (!q) return null;
    if (q.obj) return q.obj;
    if (q.lesson && q.objective != null && q.objective !== '') return q.lesson + ':' + q.objective;
    const m = q.lesson && OBJ_MAP[q.lesson]; if (m && m[q.id] != null) return q.lesson + ':' + m[q.id];
    for (const L in OBJ_MAP) if (OBJ_MAP[L][q.id] != null) return L + ':' + OBJ_MAP[L][q.id];
    return null;
  }
  function registry(lessons, bank) {
    const objs = {}, byQ = {};
    lessons.forEach(L => (L.objectives || []).forEach((text, i) => {
      objs[L.id + ':' + i] = { key: L.id + ':' + i, lesson: L.id, idx: i, text, subject: L.subject, topic: L.topic, lessonTitle: L.title, questions: [], sections: [] };
    }));
    (bank || []).forEach(q => {
      const k = objOf(q); if (!k || !objs[k]) return; byQ[q.id] = k;
      objs[k].questions.push(q.id);
      if (q.section && !objs[k].sections.includes(q.section)) objs[k].sections.push(q.section);
    });
    // an objective with no question yet is still taught by the section with the same position, if any
    lessons.forEach(L => (L.objectives || []).forEach((t, i) => { const o = objs[L.id + ':' + i]; if (!o.sections.length && L.sections[i + 1]) o.sections.push(L.sections[i + 1].id); }));
    return { objs, byQ };
  }

  /* ---------- evidence and state ---------- */
  function evidenceFor(o, data, reg) {
    const qset = new Set(o.questions);
    const attempts = (data.attempts || []).filter(a => (a.obj ? a.obj === o.key : qset.has(a.qid)) && (a.correct === true || a.correct === false)).sort((a, b) => a.at - b.at);
    const lp = (data.lessons || {})[o.lesson] || null;
    const L = reg.lessonsById[o.lesson];
    const secIx = s => L ? L.sections.findIndex(x => x.id === s) : -1;
    const viewed = !!lp && o.sections.some(s => secIx(s) > -1 && secIx(s) <= (lp.maxIx != null ? lp.maxIx : lp.secIx || 0));
    const doneAt = lp && lp.done ? Math.max(0, ...o.sections.map(s => lp.done[s] || 0)) : 0;
    const events = (data.events || []).filter(e => e.obj === o.key || (e.objs && e.objs.includes(o.key)));
    const cards = Object.values(data.cards || {}).filter(c => c.obj === o.key);
    return { attempts, viewed, doneAt, events, cards, lp };
  }

  function stateOf(o, data, reg, now) {
    now = now || Date.now();
    const ev = evidenceFor(o, data, reg), A = ev.attempts, why = [];
    const explored = ev.events.filter(e => /explore|model|experience|explain|predict|video|read/.test(e.t));
    const lastAt = Math.max(0, ev.doneAt, ...A.map(a => a.at), ...ev.events.map(e => e.at), ...ev.cards.map(c => ((c.history || []).slice(-1)[0] || {}).at || 0));
    const base = { key: o.key, attempts: A.length, correct: A.filter(a => a.correct).length, lastAt, why, events: ev.events.length };
    if (!A.length) {
      if (ev.doneAt) { why.push(`You finished the section that teaches this on ${fmtDay(ev.doneAt)}.`); why.push('No questions on it answered yet.'); return Object.assign(base, { state: 'learning' }); }
      if (ev.viewed || explored.length) {
        if (ev.viewed) why.push('You have opened the section that teaches this.');
        if (explored.length) why.push(`${explored.length} exploration${explored.length === 1 ? '' : 's'}: ${[...new Set(explored.map(e => e.label || e.t))].slice(0, 3).join(', ')}.`);
        why.push('No questions on it answered yet.');
        return Object.assign(base, { state: 'exploring' });
      }
      why.push('Nothing done on this objective yet.');
      return Object.assign(base, { state: 'not' });
    }
    const indep = new Set(A.filter(a => a.correct && !(a.hintsUsed > 0) && a.from !== 'guided-help').map(a => a.qid));
    const last = A[A.length - 1], last2 = A.slice(-2);
    const total = new Set(o.questions).size;
    const fmtA = a => `${a.correct ? 'right' : 'not right'}${a.hintsUsed ? ` with ${a.hintsUsed} hint${a.hintsUsed === 1 ? '' : 's'}` : ''} (${fmtDay(a.at)})`;
    why.push(`${A.length} answer${A.length === 1 ? '' : 's'} on ${new Set(A.map(a => a.qid)).size} of ${total} question${total === 1 ? '' : 's'}; ${base.correct} right.`);
    why.push(`Latest: ${fmtA(last)}.`);
    const demonstrated = last.correct && (indep.size >= 2 || (total === 1 && indep.size === 1));
    if (demonstrated) {
      why.push(`${indep.size} different question${indep.size === 1 ? '' : 's'} answered correctly without hints.`);
      if (now - lastAt > REVIEW_AFTER) { why.push(`Last evidence ${Math.round((now - lastAt) / DAY)} days ago — a quick check helps it stick.`); return Object.assign(base, { state: 'review', independent: indep.size }); }
      return Object.assign(base, { state: 'demonstrated', independent: indep.size });
    }
    if (last2.length === 2 && last2.every(a => !a.correct)) { why.push('The last two answers were not right. Trying it another way usually helps.'); return Object.assign(base, { state: 'revisit', independent: indep.size }); }
    if (base.correct >= 1 && (A.some(a => !a.correct) || A.some(a => a.hintsUsed > 0) || indep.size < 2)) {
      if (indep.size < 2 && total > 1) why.push(`Demonstrated needs ${2 - indep.size} more different question${2 - indep.size === 1 ? '' : 's'} right without hints.`);
      return Object.assign(base, { state: last.correct ? 'developing' : 'practising', independent: indep.size });
    }
    return Object.assign(base, { state: 'practising', independent: indep.size });
  }

  function computeAll(data, lessons, bank, now) {
    const reg = registry(lessons, bank); reg.lessonsById = {}; lessons.forEach(L => { reg.lessonsById[L.id] = L; });
    const out = {};
    Object.values(reg.objs).forEach(o => { out[o.key] = Object.assign({ obj: o }, stateOf(o, data, reg, now)); });
    return { reg, states: out };
  }

  /* ---------- analytics: opened ≠ completed ≠ attempted ≠ demonstrated ≠ retained ---------- */
  function funnel(data, lessons, comp) {
    const S = Object.values(comp.states);
    const retained = S.filter(s => {
      if (s.state !== 'demonstrated' && s.state !== 'review') return false;
      // correct, unaided answers on at least two different days, the later at least a day after the first
      const qset = new Set(s.obj.questions);
      const ok = (data.attempts || []).filter(a => qset.has(a.qid) && a.correct && !(a.hintsUsed > 0));
      const days = [...new Set(ok.map(a => dayKey(a.at)))];
      return days.length >= 2;
    });
    return {
      lessonsOpened: lessons.filter(L => data.lessons && data.lessons[L.id]).length,
      lessonsCompleted: lessons.filter(L => data.lessons && data.lessons[L.id] && data.lessons[L.id].completed).length,
      objectives: S.length,
      attempted: S.filter(s => s.attempts > 0).length,
      demonstrated: S.filter(s => s.state === 'demonstrated' || s.state === 'review').length,
      retained: retained.length,
      revisit: S.filter(s => s.state === 'revisit').length,
      review: S.filter(s => s.state === 'review').length
    };
  }

  /* ---------- insights: observation · evidence · why it may matter · action · dismiss/correct ---------- */
  function insights(data, comp, o) {
    o = o || {}; const now = o.now || Date.now(), out = [], dis = data.dismissed || {};
    const add = i => { const d = dis[i.key]; if (d && (d.wrong || !d.until || d.until > now)) { i.hidden = d; } out.push(i); };
    const S = Object.values(comp.states);
    // 1 · objectives that need revisiting — and a different way in
    S.filter(s => s.state === 'revisit').slice(0, 3).forEach(s => {
      const A = (data.attempts || []).filter(a => s.obj.questions.includes(a.qid)).slice(-4);
      add({ key: 'revisit:' + s.key, kind: 'revisit', title: `“${s.obj.text}” is worth another look`,
        observed: `Your last ${Math.min(2, A.length)} answers on this objective were not right.`,
        evidence: A.map(a => `${fmtDay(a.at)} · ${a.prompt || a.qid} · ${a.correct ? 'right' : 'not right'}${a.hintsUsed ? ' · with hints' : ''}`),
        why: 'When the same idea trips you up twice, a different explanation often works better than another question of the same kind.',
        action: { label: 'Learn it another way', href: '#/learn/obj/' + s.key } });
    });
    // 2 · a repeated kind of error → a visual model of that step
    const tags = {}; (data.attempts || []).filter(a => a.correct === false && a.errorTag).forEach(a => { (tags[a.errorTag] = tags[a.errorTag] || []).push(a); });
    Object.entries(tags).forEach(([tag, rows]) => {
      const qs = new Set(rows.map(r => r.qid)); if (rows.length < 3 || qs.size < 2) return;
      const lesson = rows[rows.length - 1].lesson, L = comp.reg.lessonsById[lesson];
      const lab = L && L.sections.map(s => s.blocks.find(b => b.k === 'lab')).find(Boolean);
      add({ key: 'err:' + tag, kind: 'error', title: `The same kind of slip keeps appearing: ${tag}`,
        observed: `${rows.length} answers on ${qs.size} different questions had this kind of error.`,
        evidence: rows.slice(-5).map(r => `${fmtDay(r.at)} · ${r.prompt || r.qid} · you answered “${String(r.answerText || '').slice(0, 40)}”`),
        why: 'One step is going wrong in several places. Seeing that step drawn out can fix several questions at once.',
        action: lab ? { label: 'Try the visual model', href: '#/lab/' + lab.engine } : { label: 'Open these mistakes', href: '#/practise/mistakes' } });
    });
    // 3 · strong recall but weaker application (per lesson): cards remembered, questions harder
    comp.reg && Object.values(comp.reg.lessonsById).forEach(L => {
      const cards = Object.values(data.cards || {}).filter(c => c.src && c.src.id === L.id || c.topic === L.topic);
      const revs = [].concat(...cards.map(c => (c.history || []))).filter(h => now - h.at < 30 * DAY);
      const firsts = (data.attempts || []).filter(a => a.lesson === L.id && (a.attemptNo || 1) === 1 && (a.correct === true || a.correct === false));
      if (revs.length < 5 || firsts.length < 4) return;
      const rec = revs.filter(h => h.grade !== 'again').length / revs.length, app = firsts.filter(a => a.correct).length / firsts.length;
      if (rec >= 0.75 && app <= 0.5) add({ key: 'recall-apply:' + L.id, kind: 'apply', title: `${L.topic}: you remember the facts; using them is the next step`,
        observed: `Flashcards: ${Math.round(rec * 100)}% remembered (${revs.length} reviews). Questions: ${Math.round(app * 100)}% right on the first try (${firsts.length}).`,
        evidence: [`${revs.length} flashcard reviews in the last 30 days`, `${firsts.length} first tries on ${L.title} questions`],
        why: 'Recalling a fact and applying it are different skills. Worked examples bridge the two.',
        action: { label: 'Work through an example step by step', href: '#/lesson/' + L.id } });
    });
    // 4 · improvement after a visual explanation or a model (real before/after answers on the same objective)
    S.forEach(s => {
      const vis = (data.events || []).filter(e => (e.obj === s.key || (e.objs && e.objs.includes(s.key))) && /model|visual|experience|explore/.test((e.mode || '') + ' ' + e.t));
      if (!vis.length) return; const t = vis[0].at;
      const A = (data.attempts || []).filter(a => s.obj.questions.includes(a.qid) && (a.correct === true || a.correct === false));
      const before = A.filter(a => a.at < t), after = A.filter(a => a.at > t);
      if (before.length < 2 || after.length < 2) return;
      const pb = before.filter(a => a.correct).length / before.length, pa = after.filter(a => a.correct).length / after.length;
      if (pa - pb >= 0.34) add({ key: 'visual:' + s.key, kind: 'progress', title: 'Answers improved after you explored it visually',
        observed: `On “${s.obj.text}”: ${Math.round(pb * 100)}% right before (${before.length} answers), ${Math.round(pa * 100)}% after (${after.length}).`,
        evidence: [`${vis[0].label || 'Visual explanation'} opened ${fmtDay(t)}`].concat(after.slice(0, 3).map(a => `${fmtDay(a.at)} · ${a.prompt || a.qid} · ${a.correct ? 'right' : 'not right'}`)),
        why: 'This is a pattern in your own answers, not a fixed “learning style”: the later questions may also have been easier, or practice itself helped. It may be worth trying a visual first next time.',
        action: { label: 'Open the visual lab', href: '#/explore/lab' } });
    });
    // 5 · demonstrated a while ago, not revisited since
    const due = S.filter(s => s.state === 'review');
    if (due.length) add({ key: 'review:' + dayKey(now), kind: 'review', title: `${due.length} objective${due.length === 1 ? ' is' : 's are'} ready for a quick review`,
      observed: `You demonstrated ${due.length === 1 ? 'it' : 'them'}, then had no new evidence for more than 10 days.`,
      evidence: due.slice(0, 5).map(s => `${s.obj.text} · last ${fmtDay(s.lastAt)}`),
      why: 'A short check after a gap is one of the most reliable ways to make learning last (spaced practice).',
      action: { label: 'Do a 2-minute check', href: '#/learn/obj/' + due[0].key } });
    return out;
  }

  /* ---------- today's plan ---------- */
  function suggestions(data, comp, lessons, now) {
    const S = Object.values(comp.states), out = [];
    S.filter(s => s.state === 'revisit').sort((a, b) => b.lastAt - a.lastAt).slice(0, 1).forEach(s => out.push({ key: 'obj:' + s.key, kind: 'revisit', title: 'Try another way: ' + s.obj.text, href: '#/learn/obj/' + s.key, why: 'Your last two answers on this were not right.', mins: 8 }));
    const due = Object.values(data.cards || {}).filter(c => (c.due || 0) <= now).length;
    if (due) out.push({ key: 'cards', kind: 'revise', title: `Review ${due} flashcard${due === 1 ? '' : 's'}`, href: '#/revise/session/due', why: 'Due today on your spacing schedule.', mins: Math.max(2, Math.round(due * 0.5)) });
    const going = Object.entries(data.lessons || {}).filter(([id, p]) => !p.completed && lessons.some(L => L.id === id)).sort((a, b) => b[1].last - a[1].last)[0];
    if (going) { const L = lessons.find(x => x.id === going[0]), ix = Math.min(going[1].secIx || 0, L.sections.length - 1); out.push({ key: 'lesson:' + L.id, kind: 'continue', title: `Continue ${L.title}`, href: `#/lesson/${L.id}/${L.sections[ix].id}`, why: `Section ${ix + 1} of ${L.sections.length}.`, mins: L.mins ? Math.round(L.mins / L.sections.length * 2) : 10 }); }
    S.filter(s => s.state === 'review').slice(0, 1).forEach(s => out.push({ key: 'obj:' + s.key, kind: 'review', title: 'Quick check: ' + s.obj.text, href: '#/learn/obj/' + s.key, why: 'Demonstrated over 10 days ago.', mins: 3 }));
    S.filter(s => s.state === 'developing' || s.state === 'practising').sort((a, b) => b.lastAt - a.lastAt).slice(0, 1).forEach(s => out.push({ key: 'obj:' + s.key, kind: 'practise', title: 'Practise: ' + s.obj.text, href: '#/learn/obj/' + s.key, why: STATES[s.state].label + ' — one more unaided answer moves it on.', mins: 5 }));
    const fresh = lessons.find(L => !(data.lessons || {})[L.id]);
    if (fresh) out.push({ key: 'lesson:' + fresh.id, kind: 'new', title: `Start ${fresh.title}`, href: `#/lesson/${fresh.id}`, why: 'Something new, if you have time.', mins: fresh.mins || 20 });
    return out;
  }
  function plan(data, comp, lessons, now) {
    const today = dayKey(now), p = data.plan && data.plan.day === today ? data.plan : { day: today, items: [], removed: (data.plan && data.plan.removed) || {}, later: (data.plan && data.plan.later) || {} };
    if (!p.built) {
      const carry = (data.plan && data.plan.day !== today ? data.plan.items : []).filter(i => i.own && i.status === 'todo');
      const later = Object.entries(p.later || {}).filter(([, d]) => d <= today).map(([k]) => k);
      const sug = suggestions(data, comp, lessons, now).filter(s => !(p.removed[s.key] > now) && !(p.later[s.key] > today));
      const first = sug.filter(s => later.includes(s.key)).concat(sug.filter(s => !later.includes(s.key)));
      p.items = carry.concat(first.slice(0, Math.max(0, 3 - carry.length)).map(s => Object.assign({ status: 'todo' }, s)));
      later.forEach(k => { delete p.later[k]; });
      p.built = now;
    }
    // items finish themselves when the evidence says so
    p.items.forEach(i => { if (i.status !== 'todo') return; if (isDone(i, data, comp, p.built)) { i.status = 'done'; i.doneAt = now; } });
    return p;
  }
  function isDone(i, data, comp, since) {
    if (i.kind === 'revise') return !Object.values(data.cards || {}).some(c => (c.due || 0) <= Date.now()) && Object.values(data.cards || {}).some(c => (c.history || []).some(h => h.at >= since));
    if (i.key.startsWith('obj:')) { const s = comp.states[i.key.slice(4)]; return !!s && s.lastAt >= since && (s.state === 'demonstrated' || s.state === 'developing'); }
    if (i.key.startsWith('lesson:')) { const p = (data.lessons || {})[i.key.slice(7)]; return !!p && Object.values(p.done || {}).some(t => t >= since); }
    return false;
  }

  /* ---------- milestones: earned by meaningful learning only; one journey (charting your own sky) ---------- */
  const MILESTONES = [
    { id: 'first-light', title: 'First light', desc: 'Demonstrate understanding of your first objective.', theme: 'dusk', test: (d, c) => c.f.demonstrated >= 1, prog: (d, c) => [Math.min(1, c.f.demonstrated), 1] },
    { id: 'constellation', title: 'A whole constellation', desc: 'Demonstrate every objective in one lesson.', theme: 'aurora', test: (d, c) => c.lessonsFull >= 1, prog: (d, c) => [c.bestLesson[0], c.bestLesson[1]] },
    { id: 'turnaround', title: 'Turnaround', desc: 'Come back to 5 mistakes and get them right.', test: d => Object.values(d.mistakes || {}).filter(m => m.laterCorrect).length >= 5, prog: d => [Math.min(5, Object.values(d.mistakes || {}).filter(m => m.laterCorrect).length), 5] },
    { id: 'steady', title: 'Steady recall', desc: '20 flashcard reviews on at least 3 different days.', test: (d, c) => c.revs >= 20 && c.revDays >= 3, prog: (d, c) => [Math.min(20, c.revs), 20] },
    { id: 'experimenter', title: 'Experimenter', desc: 'Make a prediction, test it and record what happened — 3 times.', theme: 'nebula', test: d => (d.archive || []).filter(a => a.prediction).length >= 3, prog: d => [Math.min(3, (d.archive || []).filter(a => a.prediction).length), 3] },
    { id: 'wanderer', title: 'Wanderer', desc: 'Explore experiences in 4 different subjects.', test: (d, c) => c.subjectsExplored >= 4, prog: (d, c) => [Math.min(4, c.subjectsExplored), 4] },
    { id: 'second-look', title: 'Second look', desc: 'Show you still understand something on a different day.', theme: 'tide', test: (d, c) => c.f.retained >= 1, prog: (d, c) => [Math.min(1, c.f.retained), 1] },
    { id: 'another-way', title: 'Another way in', desc: 'After a “needs revisiting”, try another explanation and then get it right.', test: d => (d.events || []).some(e => e.t === 'adapt-success'), prog: d => [(d.events || []).some(e => e.t === 'adapt-success') ? 1 : 0, 1] }
  ];
  const THEMES = {
    ink: { label: 'Ink (default)', free: true },
    dusk: { label: 'Dusk', from: 'first-light' },
    aurora: { label: 'Aurora', from: 'constellation' },
    nebula: { label: 'Nebula', from: 'experimenter' },
    tide: { label: 'Tide', from: 'second-look' }
  };
  function milestoneCtx(data, comp, lessons) {
    const f = funnel(data, lessons, comp);
    const per = {}; Object.values(comp.states).forEach(s => { const L = s.obj.lesson; per[L] = per[L] || [0, 0]; per[L][1]++; if (s.state === 'demonstrated' || s.state === 'review') per[L][0]++; });
    const vals = Object.values(per); const bestLesson = vals.sort((a, b) => b[0] / b[1] - a[0] / a[1])[0] || [0, 1];
    const revs = [].concat(...Object.values(data.cards || {}).map(c => c.history || []));
    const subjectsExplored = new Set((data.events || []).filter(e => e.t === 'experience' && e.subject).map(e => e.subject)).size;
    return { f, lessonsFull: vals.filter(v => v[0] === v[1] && v[1] > 0).length, bestLesson, revs: revs.length, revDays: new Set(revs.map(h => dayKey(h.at))).size, subjectsExplored };
  }
  function milestones(data, comp, lessons) {
    const c = milestoneCtx(data, comp, lessons), got = data.milestones || {};
    return MILESTONES.map(m => { const [a, b] = m.prog(data, c); return { id: m.id, title: m.title, desc: m.desc, theme: m.theme || null, earned: got[m.id] || (m.test(data, c) ? 'now' : null), progress: [a, b] }; });
  }

  const core = { DAY, OBJ_MAP, STATES, ORDER, objOf, registry, stateOf, computeAll, funnel, insights, suggestions, plan, milestones, MILESTONES, THEMES, dayKey };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  /* ================= browser glue ================= */
  const LS = root.LS = root.LS || {};
  let cache = null, cacheV = -1, version = 0;
  const bump = () => { version++; };
  LS.on && LS.on('change', bump);
  function comp() {
    if (cache && cacheV === version) return cache;
    cache = computeAll(LS.store.data(), LS.lessons, LS.bank(), Date.now()); cacheV = version; return cache;
  }
  const E = LS.engine = Object.assign({}, core, {
    comp,
    state: key => comp().states[key] || null,
    objective: key => (comp().reg.objs[key] || null),
    objectivesOf: lessonId => Object.values(comp().states).filter(s => s.obj.lesson === lessonId).sort((a, b) => a.obj.idx - b.obj.idx),
    questionsFor: key => { const o = comp().reg.objs[key]; if (!o) return []; const bank = LS.bank(); return o.questions.map(id => bank.find(q => q.id === id)).filter(Boolean); },
    funnel: () => funnel(LS.store.data(), LS.lessons, comp()),
    insights: () => insights(LS.store.data(), comp()),
    milestones: () => milestones(LS.store.data(), comp(), LS.lessons),
    plan() {
      const d = LS.store.data(), p = plan(d, comp(), LS.lessons, Date.now());
      const changed = JSON.stringify(p) !== JSON.stringify(d.plan); d.plan = p; if (changed) LS.store.save();
      return p;
    },
    // record a piece of evidence (never anything but a learning action)
    event(t, extra) {
      const d = LS.store.data(); d.events = d.events || [];
      d.events.push(Object.assign({ t, at: Date.now() }, extra || {}));
      if (d.events.length > 2000) d.events = d.events.slice(-2000);
      LS.store.save(); bump(); LS.emit('change', 'event');
    },
    // remember milestones the first time they are reached; returns the newly earned ones
    award() {
      const d = LS.store.data(); d.milestones = d.milestones || {}; const fresh = [];
      milestones(d, comp(), LS.lessons).forEach(m => { if (m.earned === 'now') { d.milestones[m.id] = Date.now(); fresh.push(m); } });
      if (fresh.length) LS.store.save();
      return fresh;
    },
    themes() { const got = LS.store.data().milestones || {}; return Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label, unlocked: !!t.free || !!got[t.from], from: t.from && MILESTONES.find(m => m.id === t.from).title })); }
  });
  E.version = () => version;
})(typeof window !== 'undefined' ? window : globalThis);
