/* ERLY Learning Studio — the content registry.
   Lessons are added with LS.addLesson(object): each is validated first (ls-schema.js). An invalid lesson is
   kept out of the Studio and listed in LS.invalid with its errors (shown on the Library page), so a typo in
   content can never silently break the interface. Questions from lessons plus the practice bank form LS.bank. */
(function () {
  'use strict';
  const LS = window.LS;
  LS.lessons = []; LS.invalid = []; LS.extraQuestions = [];
  LS.addLesson = L => {
    const errs = LS.schema.validateLesson(L);
    if (errs.length) { LS.invalid.push({ id: L && L.id, title: L && L.title, errors: errs }); console.error('[Learning Studio] lesson rejected:', L && L.id, errs); return false; }
    LS.lessons.push(L); return true;
  };
  LS.addQuestions = (qs, meta) => (qs || []).forEach(q => {
    const errs = LS.schema.validateQuestion(q, 'practice ' + q.id, []);
    if (errs.length) { LS.invalid.push({ id: q.id, title: 'Practice question', errors: errs }); console.error('[Learning Studio] question rejected:', q.id, errs); return; }
    LS.extraQuestions.push(Object.assign({ from: 'bank' }, meta || {}, q));
  });
  LS.lesson = id => LS.lessons.find(l => l.id === id) || null;
  // every question available for practice, with lesson context attached
  LS.bank = () => {
    const out = []; LS.lessons.forEach(L => LS.schema.questionsOf(L).forEach(q => out.push(Object.assign({ lessonTitle: L.title, provenance: L.provenance.kind }, q))));
    LS.extraQuestions.forEach(q => { const L = LS.lesson(q.lesson); out.push(Object.assign({ lessonTitle: L ? L.title : '', subject: L ? L.subject : q.subject, topic: L ? L.topic : q.topic, provenance: 'erly' }, q)); });
    return out;
  };
  LS.topics = () => { const m = {}; LS.lessons.forEach(L => { m[L.topic] = { topic: L.topic, subject: L.subject, lesson: L.id }; }); return Object.values(m); };

  LS.paths = [
    { id: 'path-bio', title: 'Human and plant biology foundations', subject: 'Biology', desc: 'How the body moves oxygen around, and how plants make the glucose we all depend on.', steps: ['bio-heart', 'bio-photo'], level: 'Secondary / NEET foundation' },
    { id: 'path-calc', title: 'Ready for calculus', subject: 'Mathematics', desc: 'Parabolas, roots and turning points, then the derivative that finds them.', steps: ['math-quad', 'math-deriv'], level: 'Secondary → pre-university' },
    { id: 'path-mech', title: 'Forces and circuits', subject: 'Physics', desc: 'Newton’s second law, then current, voltage and resistance.', steps: ['phys-newton', 'phys-circuits'], level: 'Secondary / JEE foundation' },
    { id: 'path-chem', title: 'Chemistry foundations', subject: 'Chemistry', desc: 'Acids, bases and pH, then why molecules have the shapes they do.', steps: ['chem-ph', 'chem-vsepr'], level: 'Secondary → JEE' }
  ];
})();
