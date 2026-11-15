/* ERLY Learning Studio — spaced repetition you can see into.

   A simplified SM-2 schedule (the algorithm behind most flashcard apps), with four buttons:
     Again — you did not remember it: the card comes back in this session and its interval restarts at 1 day.
     Hard  — you remembered it with effort: the interval grows a little (×1.2) and the card gets slightly harder.
     Good  — you remembered it: the interval grows by the card's ease (starts at 2.5×).
     Easy  — it was effortless: the interval grows faster (ease × 1.3) and the card gets easier.
   First reviews use fixed steps (1 day, then 3 days) before multiplying.

   Every card keeps its review history, so the app can say in plain words why a card is due. A card is only
   called "well remembered" after at least three successful reviews on at least two different days with a
   current interval of a week or more — never after a single correct answer. Pure functions; times in ms. */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const GRADES = ['again', 'hard', 'good', 'easy'];
  const dayKey = t => new Date(t).toISOString().slice(0, 10);

  function fresh(now) { return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, history: [] }; }

  function review(card, grade, now) {
    if (!GRADES.includes(grade)) throw new Error('grade must be one of ' + GRADES.join(', '));
    const c = Object.assign(fresh(now), card); c.history = (card.history || []).slice();
    const prevInterval = c.interval;
    if (grade === 'again') {
      c.lapses++; c.reps = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.interval = 0; c.due = now + 10 * 60000; // back in ten minutes
    } else {
      if (grade === 'hard') c.ease = Math.max(1.3, c.ease - 0.15);
      if (grade === 'easy') c.ease = c.ease + 0.15;
      c.reps++;
      if (c.reps === 1) c.interval = grade === 'easy' ? 3 : 1;
      else if (c.reps === 2) c.interval = grade === 'hard' ? 2 : grade === 'easy' ? 6 : 3;
      else c.interval = Math.max(prevInterval + 1, Math.round(prevInterval * (grade === 'hard' ? 1.2 : grade === 'easy' ? c.ease * 1.3 : c.ease)));
      c.interval = Math.min(c.interval, 365);
      c.due = now + c.interval * DAY;
    }
    c.history.push({ at: now, grade, interval: c.interval });
    if (c.history.length > 60) c.history = c.history.slice(-60);
    return c;
  }

  function isDue(card, now) { return (card.due == null ? 0 : card.due) <= now; }

  function strength(card) {
    const ok = (card.history || []).filter(h => h.grade !== 'again');
    const days = new Set(ok.map(h => dayKey(h.at))).size;
    if (!card.history || !card.history.length) return { level: 'new', label: 'New — not reviewed yet' };
    if (ok.length >= 3 && days >= 2 && card.interval >= 7) return { level: 'strong', label: 'Well remembered so far — it will still come back, less often' };
    if (card.history[card.history.length - 1].grade === 'again') return { level: 'relearn', label: 'Being relearned — you missed it last time' };
    return { level: 'learning', label: 'Still learning — ' + ok.length + ' successful review' + (ok.length === 1 ? '' : 's') + (days < 2 ? ', all on one day' : '') };
  }

  // a plain-language reason for when a card is shown
  function why(card, now) {
    const h = card.history || [];
    if (!h.length) return 'New card — first review.';
    const last = h[h.length - 1], ago = Math.max(0, Math.round((now - last.at) / DAY));
    const when = ago === 0 ? 'today' : ago === 1 ? 'yesterday' : ago + ' days ago';
    const g = { again: 'did not remember it', hard: 'found it hard', good: 'remembered it', easy: 'found it easy' }[last.grade];
    if (last.grade === 'again') return `You ${g} ${when}, so it comes back soon to relearn it.`;
    return `You ${g} ${when}. It was scheduled ${last.interval} day${last.interval === 1 ? '' : 's'} later — that time has come${isDue(card, now) ? '' : ' (not yet due)'}.`;
  }

  function preview(card, now) { const o = {}; GRADES.forEach(g => { const r = review(card, g, now); o[g] = g === 'again' ? '10 min' : r.interval + (r.interval === 1 ? ' day' : ' days'); }); return o; }

  function queue(cards, now, o) {
    o = o || {}; const due = cards.filter(c => isDue(c, now)).sort((a, b) => (a.due || 0) - (b.due || 0));
    const fresh0 = due.filter(c => !(c.history || []).length), seen = due.filter(c => (c.history || []).length);
    return seen.concat(fresh0.slice(0, o.newLimit == null ? 20 : o.newLimit));
  }

  const api = { DAY, GRADES, fresh, review, isDue, strength, why, preview, queue };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.LS = root.LS || {}; root.LS.srs = api; }
})(typeof window !== 'undefined' ? window : globalThis);
