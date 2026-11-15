/* ERLY Learning Studio — the content schema and its validator.

   Lessons, questions and resources are data, never code. Each one is validated before it is shown; a malformed
   item is reported (on screen and in the console) instead of silently breaking the Studio. Adding a lesson is
   adding one object to a registry file — no new page, no new code.

   LESSON
     id, v (content version), title, subject, level, course, chapter, topic, mins (estimated minutes),
     objectives [text], prereq [{ text, lesson? }], provenance { kind, author, reviewed, licence, sources [{ title, url, publisher }] },
     a11y { notes }, sections [{ id, title, blocks [BLOCK] }], summary [text], further [{ title, url, publisher }],
     revision [QUESTION], cards [{ front, back, kind }]
   provenance.kind: erly (written for ERLY) · official · teacher · student · ai (AI-generated practice) · demo
   BLOCK  k = text | figure | math | example | callout | lab | video | audio | activity | reading
   QUESTION  id, type, prompt, explain, difficulty 1–3, topic, objective, + the fields its type needs */
(function (root) {
  'use strict';
  const KINDS = ['erly', 'official', 'teacher', 'student', 'ai', 'demo'];
  const BLOCKS = ['text', 'figure', 'math', 'example', 'callout', 'lab', 'video', 'audio', 'activity', 'reading'];
  const need = (o, keys, where, errs) => keys.forEach(k => { if (o[k] == null || o[k] === '' || (Array.isArray(o[k]) && !o[k].length)) errs.push(`${where}: missing “${k}”`); });
  const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

  const TYPE_FIELDS = {
    mcq: q => (Array.isArray(q.options) && q.options.length >= 2 && isInt(q.answer, 0, q.options.length - 1)) || 'needs ≥2 options and an answer index',
    multi: q => (Array.isArray(q.options) && Array.isArray(q.answer) && q.answer.length >= 1 && q.answer.every(a => isInt(a, 0, q.options.length - 1))) || 'needs options and answer indices',
    tf: q => typeof q.answer === 'boolean' || 'needs answer true/false',
    fill: q => (Array.isArray(q.blanks) && q.blanks.length >= 1 && (String(q.prompt).match(/___/g) || []).length === q.blanks.length && q.blanks.every(b => (b.accept && b.accept.length) || typeof b.num === 'number')) || 'needs one blank object per ___ in the prompt',
    match: q => (Array.isArray(q.pairs) && q.pairs.length >= 2 && q.pairs.every(p => p.length === 2)) || 'needs ≥2 [left, right] pairs',
    order: q => (Array.isArray(q.items) && q.items.length >= 3) || 'needs ≥3 items in the correct order',
    label: q => (q.figure && Array.isArray(q.targets) && q.targets.length >= 2 && q.targets.every(t => t.label && typeof t.x === 'number' && typeof t.y === 'number')) || 'needs a figure and ≥2 targets {x, y, label}',
    sort: q => (Array.isArray(q.categories) && q.categories.length >= 2 && Array.isArray(q.items) && q.items.every(i => q.categories.includes(i.cat))) || 'needs categories and items {text, cat}',
    compare: q => (Array.isArray(q.concepts) && q.concepts.length === 2 && Array.isArray(q.statements) && q.statements.every(s => q.concepts.concat(['Both']).includes(s.ans))) || 'needs 2 concepts and statements {text, ans}',
    numeric: q => typeof q.answer === 'number' || 'needs a numeric answer',
    expr: q => typeof q.answer === 'string' || 'needs an expression answer',
    graph: q => (q.plot && q.plot.fn && (q.ask === 'numeric' ? typeof q.answer === 'number' : Array.isArray(q.options))) || 'needs plot.fn and an answer',
    slider: q => (q.param && typeof q.param.min === 'number' && q.compute && typeof q.target === 'number') || 'needs param {min,max,step}, compute and target',
    short: q => (Array.isArray(q.ideas) && q.ideas.length >= 1 && !!q.model) || 'needs a model answer and key ideas',
    steps: q => (Array.isArray(q.steps) && q.steps.length >= 2 && q.steps.every(s => s.type && s.prompt)) || 'needs ≥2 typed steps'
  };

  function validateQuestion(q, where, errs) {
    where = where || 'question ' + (q && q.id);
    if (!q || typeof q !== 'object') { errs.push(where + ': not an object'); return errs; }
    need(q, ['id', 'type', 'prompt', 'explain'], where, errs);
    const f = TYPE_FIELDS[q.type]; if (!f) { errs.push(`${where}: unknown type “${q.type}”`); return errs; }
    const r = f(q); if (r !== true) errs.push(`${where} (${q.type}): ${r}`);
    if (q.difficulty != null && !isInt(q.difficulty, 1, 3)) errs.push(where + ': difficulty must be 1, 2 or 3');
    if (q.type === 'steps') q.steps.forEach((s, i) => { const g = TYPE_FIELDS[s.type]; if (!g) errs.push(`${where} step ${i + 1}: unknown type`); else { const rr = g(Object.assign({ prompt: s.prompt }, s)); if (rr !== true) errs.push(`${where} step ${i + 1}: ${rr}`); } });
    return errs;
  }

  function validateBlock(b, where, errs) {
    if (!b || !BLOCKS.includes(b.k)) { errs.push(`${where}: unknown block kind “${b && b.k}”`); return; }
    const req = { text: ['md'], figure: ['alt'], math: ['tex', 'alt'], example: ['problem', 'steps', 'answer'], callout: ['md'], lab: ['engine', 'objective'], video: ['id'], audio: ['topic'], activity: ['q'], reading: ['doc'] }[b.k];
    need(b, req, `${where} (${b.k})`, errs);
    if (b.k === 'figure' && !b.svg && !b.img) errs.push(`${where} (figure): needs svg or img`);
    if (b.k === 'activity' && b.q) validateQuestion(b.q, `${where} activity ${b.q.id}`, errs);
  }

  function validateLesson(L) {
    const errs = [], w = 'lesson ' + (L && L.id);
    if (!L || typeof L !== 'object') return ['lesson: not an object'];
    need(L, ['id', 'v', 'title', 'subject', 'level', 'topic', 'mins', 'objectives', 'sections', 'summary', 'provenance'], w, errs);
    if (L.provenance) { if (!KINDS.includes(L.provenance.kind)) errs.push(`${w}: provenance.kind must be one of ${KINDS.join(', ')}`); need(L.provenance, ['author'], w + ' provenance', errs); }
    const ids = new Set();
    (L.sections || []).forEach((s, i) => {
      const sw = `${w} section ${i + 1}`; need(s, ['id', 'title', 'blocks'], sw, errs);
      if (ids.has(s.id)) errs.push(`${sw}: duplicate id ${s.id}`); ids.add(s.id);
      (s.blocks || []).forEach((b, j) => validateBlock(b, `${sw} block ${j + 1}`, errs));
    });
    const qids = new Set();
    const allQ = [].concat(...(L.sections || []).map(s => (s.blocks || []).filter(b => b.k === 'activity').map(b => b.q)), L.revision || []);
    allQ.forEach(q => { if (q && q.id) { if (qids.has(q.id)) errs.push(`${w}: duplicate question id ${q.id}`); qids.add(q.id); } });
    (L.revision || []).forEach(q => validateQuestion(q, `${w} revision ${q && q.id}`, errs));
    (L.cards || []).forEach((c, i) => need(c, ['front', 'back'], `${w} card ${i + 1}`, errs));
    return errs;
  }

  // every question a lesson contains, tagged with where it came from
  function questionsOf(L) {
    const out = [];
    (L.sections || []).forEach(s => (s.blocks || []).forEach(b => { if (b.k === 'activity') out.push(Object.assign({ lesson: L.id, section: s.id, subject: L.subject, topic: L.topic, from: 'lesson' }, b.q)); }));
    (L.revision || []).forEach(q => out.push(Object.assign({ lesson: L.id, subject: L.subject, topic: L.topic, from: 'revision' }, q)));
    return out;
  }

  const api = { KINDS, BLOCKS, TYPES: Object.keys(TYPE_FIELDS), validateLesson, validateQuestion, questionsOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.LS = root.LS || {}; root.LS.schema = api; }
})(typeof window !== 'undefined' ? window : globalThis);
