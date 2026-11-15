/* ERLY Learning Studio — learning-pattern insights you can inspect.

   This engine looks ONLY at learning activity the student did in the Studio (answers to questions, retries,
   flashcard reviews, which formats they chose to open, lessons finished). It does not read time spent
   hesitating, keystrokes, the camera, the microphone or anything outside the Studio.

   It never diagnoses, never names a condition, never estimates the likelihood of one and never scores risk.
   Each insight separates four things:
     observed     — what actually happened, with counts and dates
     suggests     — what that may mean for a learning TASK (not for the person)
     alternatives — other ordinary reasons the same pattern can appear
     tryThis      — things the student could try, which they are free to ignore
   plus the evidence rows it was built from and how reliable it is (amount of data, number of separate days).

   An insight is only shown when there is enough evidence; otherwise the engine says so. Pure functions. */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const dayKey = t => new Date(t).toISOString().slice(0, 10);
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
  const dateOf = t => new Date(t).toISOString().slice(0, 10);
  const FORMAT_NAMES = { text: 'reading', visual: 'interactive models', audio: 'listening', video: 'video', practice: 'practice questions' };
  const TYPE_NAMES = { mcq: 'multiple choice', multi: 'choose-all-that-apply', tf: 'true / false', fill: 'fill in the blank', match: 'matching', order: 'putting steps in order', label: 'labelling a diagram', sort: 'sorting into groups', compare: 'comparing two concepts', numeric: 'calculations with a number answer', expr: 'typing a formula', graph: 'reading a graph', slider: 'adjusting a model', short: 'short written answers', steps: 'step-by-step problems' };

  function reliability(n, days) {
    if (n >= 15 && days >= 3) return { level: 'good', label: 'Good amount of evidence', why: `${n} answers on ${days} different days` };
    if (n >= 8 && days >= 2) return { level: 'moderate', label: 'Some evidence', why: `${n} answers on ${days} different days — more practice would make this clearer` };
    return { level: 'low', label: 'Too little evidence', why: `${n} answer${n === 1 ? '' : 's'} on ${days} day${days === 1 ? '' : 's'}` };
  }
  const span = rows => ({ from: dateOf(Math.min(...rows.map(r => r.at))), to: dateOf(Math.max(...rows.map(r => r.at))), days: new Set(rows.map(r => dayKey(r.at))).size });
  const evidence = rows => rows.slice(-40).map(r => ({ at: r.at, q: r.qid, prompt: r.prompt, topic: r.topic, type: r.type, correct: r.correct, from: r.from, answer: r.answerText }));

  // the first attempt at each question counts for accuracy; retries are measured separately
  const firsts = attempts => attempts.filter(a => a.correct !== null && a.correct !== undefined && (a.attemptNo || 1) === 1);

  function analyse(data, o) {
    o = o || {};
    const attempts = (data.attempts || []).slice().sort((a, b) => a.at - b.at);
    const marked = attempts.filter(a => a.correct === true || a.correct === false);
    const first = firsts(marked);
    const allDays = new Set(marked.map(a => dayKey(a.at))).size;
    const out = { insights: [], notEnough: [], summary: { answers: marked.length, firstTries: first.length, days: allDays, accuracy: first.length ? pct(first.filter(a => a.correct).length, first.length) : null } };
    const dismissed = (data.dismissed || {});
    const push = ins => { ins.dismissed = !!dismissed[ins.key]; ins.note = dismissed[ins.key] && dismissed[ins.key].note || ''; out.insights.push(ins); };

    if (marked.length < 10 || allDays < 2) out.notEnough.push({ key: 'overall', text: `Insights appear once there are at least 10 marked answers on 2 or more different days. So far: ${marked.length} answer${marked.length === 1 ? '' : 's'} on ${allDays} day${allDays === 1 ? '' : 's'}.` });

    // 1 · topics that need more practice (first-try accuracy below 60% with enough attempts)
    const byTopic = {};
    first.forEach(a => { (byTopic[a.topic] = byTopic[a.topic] || []).push(a); });
    Object.entries(byTopic).forEach(([topic, rows]) => {
      const s = span(rows), ok = rows.filter(r => r.correct).length, rel = reliability(rows.length, s.days);
      if (rows.length < 5 || s.days < 2) { if (rows.length >= 3) out.notEnough.push({ key: 'topic:' + topic, text: `${topic}: ${rows.length} first tries on ${s.days} day${s.days === 1 ? '' : 's'} — not enough yet to say anything.` }); return; }
      const acc = pct(ok, rows.length);
      if (acc < 60) push({
        key: 'topic:' + topic, kind: 'practice', title: `${topic} could use more practice`,
        observed: `${ok} of ${rows.length} questions on ${topic} were right on the first try (${acc}%), between ${s.from} and ${s.to}.`,
        suggests: 'Some ideas in this topic have not settled yet. This is about the topic, not about you — first tries are where learning starts.',
        alternatives: ['The questions may have been harder than the lesson examples.', 'A prerequisite idea may be missing.', 'Tiredness, distraction or rushing on the day.', 'The way the questions were worded.'],
        tryThis: [{ label: 'Review the lesson', act: { go: 'lesson', topic } }, { label: 'Practise this topic (guided)', act: { go: 'practice', topic, mode: 'guided' } }, { label: 'Ask Noor to explain it another way', act: { go: 'noor', topic } }],
        reliability: rel, when: s, evidence: evidence(rows)
      });
    });

    // 2 · improvement within a topic (first half vs second half of the first tries)
    Object.entries(byTopic).forEach(([topic, rows]) => {
      if (rows.length < 6) return; const h = Math.floor(rows.length / 2), a = rows.slice(0, h), b = rows.slice(h);
      const pa = pct(a.filter(r => r.correct).length, a.length), pb = pct(b.filter(r => r.correct).length, b.length), s = span(rows);
      if (pb - pa >= 25 && s.days >= 2) push({
        key: 'improve:' + topic, kind: 'progress', title: `Getting better at ${topic}`,
        observed: `Your earlier ${a.length} first tries on ${topic} were ${pa}% right; your later ${b.length} were ${pb}% right (${s.from} to ${s.to}).`,
        suggests: 'Practice on this topic is paying off.',
        alternatives: ['Later questions may have been easier.', 'You may have seen similar questions before.'],
        tryThis: [{ label: 'Try harder questions on this topic', act: { go: 'practice', topic, difficulty: 3 } }],
        reliability: reliability(rows.length, s.days), when: s, evidence: evidence(rows)
      });
    });

    // 3 · a question FORMAT that is not working as well as the others
    const byType = {}; first.forEach(a => { (byType[a.type] = byType[a.type] || []).push(a); });
    const overall = first.length ? first.filter(a => a.correct).length / first.length : 0;
    Object.entries(byType).forEach(([type, rows]) => {
      const others = first.filter(a => a.type !== type); if (rows.length < 6 || others.length < 6) return;
      const acc = rows.filter(r => r.correct).length / rows.length, accO = others.filter(r => r.correct).length / others.length, s = span(rows);
      if (accO - acc >= 0.3 && s.days >= 2) push({
        key: 'format:' + type, kind: 'format', title: `${cap(TYPE_NAMES[type] || type)} questions are going less well than other kinds`,
        observed: `First-try accuracy on ${TYPE_NAMES[type] || type} questions: ${Math.round(acc * 100)}% (${rows.length} questions). On every other kind: ${Math.round(accO * 100)}% (${others.length} questions).`,
        suggests: 'This way of answering may not be suiting you right now, even where you understand the idea.',
        alternatives: ['These questions may have been on harder topics.', 'The format may simply be unfamiliar — it usually gets easier with use.', 'Small slips (typing, units, order) can cost marks in some formats.'],
        tryThis: [{ label: 'Practise the same topics in another format', act: { go: 'practice', avoidType: type } }, { label: 'Use guided mode, with hints', act: { go: 'practice', mode: 'guided' } }],
        reliability: reliability(rows.length, s.days), when: s, evidence: evidence(rows)
      });
    });

    // 4 · text-heavy questions (with a reading passage) vs the rest
    const th = first.filter(a => a.textHeavy), rest = first.filter(a => !a.textHeavy);
    if (th.length >= 5 && rest.length >= 5) {
      const a1 = th.filter(r => r.correct).length / th.length, a2 = rest.filter(r => r.correct).length / rest.length, s = span(th);
      if (a2 - a1 >= 0.25 && s.days >= 2) push({
        key: 'texty', kind: 'format', title: 'Questions built on a reading passage have been harder',
        observed: `With a passage to read first: ${Math.round(a1 * 100)}% right on the first try (${th.length} questions). Without: ${Math.round(a2 * 100)}% (${rest.length}).`,
        suggests: 'The current reading format may not be working well for these tasks.',
        alternatives: ['Familiarity with the language or the vocabulary.', 'Subject knowledge the passage assumed.', 'The passages were longer or more complex.', 'Tiredness or circumstances on those days.'],
        tryThis: [{ label: 'Turn on read-aloud for passages', act: { go: 'settings', set: 'readAloud' } }, { label: 'Show passages in smaller chunks', act: { go: 'settings', set: 'chunk' } }, { label: 'Tap words for their meaning (glossary)', act: { go: 'settings', set: 'glossary' } }],
        reliability: reliability(th.length, s.days), when: s, evidence: evidence(th)
      });
    }

    // 5 · repeated error types (from the tags on wrong options / known wrong numeric answers)
    const tags = {}; marked.filter(a => !a.correct && a.errorTag).forEach(a => { (tags[a.errorTag] = tags[a.errorTag] || []).push(a); });
    Object.entries(tags).forEach(([tag, rows]) => {
      const qs = new Set(rows.map(r => r.qid)).size, s = span(rows);
      if (rows.length >= 3 && qs >= 2) push({
        key: 'err:' + tag, kind: 'error', title: `A repeated kind of slip: ${tag}`,
        observed: `${rows.length} answers on ${qs} different questions had the same kind of error (${tag}), ${s.from} to ${s.to}.`,
        suggests: 'One specific step is worth a closer look — fixing it may fix several questions at once.',
        alternatives: ['Rushing at the end of a question.', 'The questions shared a trap.'],
        tryThis: [{ label: 'Open these mistakes', act: { go: 'mistakes', tag } }, { label: 'Ask Noor about this kind of error', act: { go: 'noor', tag } }],
        reliability: reliability(rows.length, s.days), when: s, evidence: evidence(rows)
      });
    });

    // 6 · mistakes turned into correct answers
    const mist = Object.values(data.mistakes || {});
    const fixed = mist.filter(m => m.laterCorrect);
    if (mist.length >= 3) push({
      key: 'fixed', kind: 'progress', title: 'Mistakes you came back to',
      observed: `${fixed.length} of the ${mist.length} questions you once got wrong were later answered correctly.`,
      suggests: fixed.length ? 'Going back to mistakes is working.' : 'Revisiting a mistake once is often enough to fix it.',
      alternatives: [], tryThis: [{ label: 'Review open mistakes', act: { go: 'mistakes' } }],
      reliability: reliability(mist.length, new Set(mist.map(m => dayKey(m.at))).size), when: mist.length ? span(mist) : null, evidence: []
    });

    // 7 · revision recall (flashcards, last 14 days)
    const now = o.now || Date.now();
    const revs = [].concat(...Object.values(data.cards || {}).map(c => (c.history || []).map(h => Object.assign({ card: c.front }, h)))).filter(h => now - h.at <= 14 * DAY);
    if (revs.length >= 10) {
      const ok = revs.filter(h => h.grade !== 'again').length, s = { from: dateOf(Math.min(...revs.map(r => r.at))), to: dateOf(Math.max(...revs.map(r => r.at))), days: new Set(revs.map(r => dayKey(r.at))).size };
      push({ key: 'recall', kind: 'progress', title: 'Flashcard recall over the last two weeks',
        observed: `You remembered ${ok} of ${revs.length} cards when they came up (${pct(ok, revs.length)}%).`,
        suggests: pct(ok, revs.length) >= 80 ? 'Your revision spacing is holding well.' : 'Some cards come up before they have settled — that is how spacing is meant to work.',
        alternatives: ['New cards are always harder at first.'], tryThis: [{ label: 'Start a revision session', act: { go: 'revise' } }],
        reliability: reliability(revs.length, s.days), when: s, evidence: [] });
    } else if (revs.length) out.notEnough.push({ key: 'recall', text: `Flashcards: ${revs.length} review${revs.length === 1 ? '' : 's'} in the last two weeks — at least 10 are needed to say anything about recall.` });

    // 8 · formats the student CHOSE to use (descriptive only — not a "learning style")
    const fu = data.formatUse || {}; const totalF = Object.values(fu).reduce((a, b) => a + b, 0);
    if (totalF >= 8) {
      const [top, n] = Object.entries(fu).sort((a, b) => b[1] - a[1])[0];
      if (n / totalF >= 0.45) push({ key: 'fmt:' + top, kind: 'choice', title: `You often choose ${FORMAT_NAMES[top] || top}`,
        observed: `${n} of the ${totalF} times you opened learning material, you chose ${FORMAT_NAMES[top] || top}.`,
        suggests: `ERLY can put ${FORMAT_NAMES[top] || top} first where it exists. This reflects what you chose, not a fixed "learning style" — mixing formats usually helps memory.`,
        alternatives: ['It may just be what was available for the topics you studied.'],
        tryThis: [{ label: `Show ${FORMAT_NAMES[top] || top} first`, act: { go: 'settings', set: 'prefer:' + top } }],
        reliability: { level: totalF >= 15 ? 'good' : 'moderate', label: 'Based on your own choices', why: `${totalF} times you opened material` }, when: null, evidence: [] });
    }

    // only insights with enough evidence are shown as insights; the rest are listed as "not enough yet"
    out.insights = out.insights.filter(i => { if (i.reliability.level === 'low') { out.notEnough.push({ key: i.key, text: `${i.title}: ${i.reliability.why} — not enough yet.` }); return false; } return true; });
    return out;
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // what to study next: built from progress, open mistakes, due cards and stated goals — each with its reason
  function recommend(data, lessons, o) {
    o = o || {}; const now = o.now || Date.now(), recs = [];
    const prog = data.lessons || {};
    const started = Object.entries(prog).filter(([id, p]) => !p.completed && lessons.some(l => l.id === id)).sort((a, b) => b[1].last - a[1].last);
    started.slice(0, 2).forEach(([id, p]) => { const L = lessons.find(l => l.id === id); recs.push({ kind: 'continue', id, title: L.title, why: `You stopped at section ${(p.secIx || 0) + 1} of ${L.sections.length}.` }); });
    const ana = analyse(data, o);
    ana.insights.filter(i => i.kind === 'practice' && !i.dismissed).slice(0, 2).forEach(i => recs.push({ kind: 'practice', topic: i.key.slice(6), title: 'Practise ' + i.key.slice(6), why: i.observed }));
    const due = Object.values(data.cards || {}).filter(c => (c.due || 0) <= now).length;
    if (due) recs.push({ kind: 'revise', title: `Review ${due} flashcard${due === 1 ? '' : 's'}`, why: 'They are due today on your revision schedule.' });
    const open = Object.values(data.mistakes || {}).filter(m => !m.laterCorrect).length;
    if (open) recs.push({ kind: 'mistakes', title: `Revisit ${open} mistake${open === 1 ? '' : 's'}`, why: 'Questions you have not yet answered correctly after getting them wrong.' });
    // the next lesson: prerequisites met, matching the student's goals first
    const done = new Set(Object.entries(prog).filter(([, p]) => p.completed).map(([id]) => id));
    const goals = ((data.profile || {}).goals || []).map(g => String(g).toLowerCase());
    const candidates = lessons.filter(l => !prog[l.id] && (l.prereq || []).every(p => !p.lesson || done.has(p.lesson)));
    candidates.sort((a, b) => score(b) - score(a));
    function score(l) { const t = (l.subject + ' ' + l.topic + ' ' + l.title).toLowerCase(); return goals.some(g => g && t.includes(g)) ? 2 : (l.prereq || []).some(p => done.has(p.lesson)) ? 1 : 0; }
    candidates.slice(0, 2).forEach(l => recs.push({ kind: 'new', id: l.id, title: l.title, why: score(l) === 2 ? 'Matches a goal in your learning profile.' : score(l) === 1 ? 'Builds on a lesson you finished.' : 'A lesson you have not started yet.' }));
    return recs;
  }

  const FORBIDDEN = /\b(dyslexi\w*|adhd|attention deficit|autis\w*|dyscalcul\w*|dysgraph\w*|disorder|disabilit\w*|diagnos(e|is|ed|tic)|probability of|likelihood of|risk score|at risk)\b/i;
  const api = { analyse, recommend, reliability, FORBIDDEN, TYPE_NAMES, FORMAT_NAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.LS = root.LS || {}; root.LS.intel = api; }
})(typeof window !== 'undefined' ? window : globalThis);
