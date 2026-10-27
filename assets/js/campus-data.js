/* Acubins University — shared demo campus data for the University, Faculty
   and SAS dashboards. Courses, rosters and attendance are synthetic but
   deterministic; what faculty record (attendance marks, classroom
   observations, referrals to SAS) is saved in this browser
   (localStorage "acubins-campus-v1") so every dashboard sees the same thing.

   Observations describe what a teacher SEES in class ("copies slowly from
   the board") — never a diagnosis. A referral is shared with SAS and the
   student is told; SAS then decides, with the student, what happens next. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CAMPUS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = 'acubins-campus-v1';
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const COLLEGES = [
    { id: 'eng', name: 'College of Engineering', students: 2140, hue: 18 },
    { id: 'bus', name: 'College of Business', students: 1890, hue: 210 },
    { id: 'med', name: 'College of Medicine & Health', students: 1320, hue: 160 },
    { id: 'cs', name: 'College of Computing', students: 1610, hue: 265 },
    { id: 'art', name: 'College of Arts & Humanities', students: 1460, hue: 330 }
  ];
  const PEOPLE = [
    ['Acubins', 'A. Rahman', 'MECH'], ['Mariam Al Hashimi', '', 'MECH'], ['Omar Haddad', '', 'MECH'], ['Layla Nasser', '', 'MECH'], ['Yousef Al Marri', '', 'MECH'],
    ['Aisha Khan', '', 'MECH'], ['Hamdan Al Suwaidi', '', 'MECH'], ['Noura Saeed', '', 'MECH'], ['Rashid Al Ketbi', '', 'MECH'], ['Fatima Zahra', '', 'MECH'],
    ['Khalid Mansour', '', 'MECH'], ['Sara Al Nuaimi', '', 'MECH'], ['Daniel Thomas', '', 'MECH'], ['Priya Menon', '', 'MECH'],
    ['Hessa Al Mazrouei', '', 'CS'], ['Ali Reza', '', 'CS'], ['Meera Pillai', '', 'CS'], ['Saif Al Dhaheri', '', 'CS'], ['Lina Barakat', '', 'CS'], ['Ahmed Fawzi', '', 'CS']
  ];
  const STUDENTS = PEOPLE.map(([name, , dept], i) => {
    const r = rng(i * 97 + 13);
    return { id: 'S' + (2026040 + i * 7), name, dept, stream: dept === 'MECH' ? 'B.Sc. Mechanical Engineering' : 'B.Sc. Computer Science', year: 1 + Math.floor(r() * 3), gpa: +(2.3 + r() * 1.6).toFixed(2), hue: Math.floor(r() * 360), init: name.split(' ').map(w => w[0]).join('').slice(0, 2), you: i === 0 };
  });
  const COURSES = [
    { id: 'MECH210', code: 'MECH 210', name: 'Thermodynamics I', stream: 'Mechanical Engineering · Year 2', section: 'A', room: 'Eng 2.14', slots: [[0, '09:00'], [2, '09:00'], [3, '11:00']], students: STUDENTS.filter(s => s.dept === 'MECH').map(s => s.id) },
    { id: 'MATH201', code: 'MATH 201', name: 'Calculus II', stream: 'Engineering Foundation · Year 1–2', section: 'C', room: 'Sci 1.03', slots: [[1, '10:30'], [3, '13:00']], students: STUDENTS.slice(0, 10).concat(STUDENTS.slice(14, 18)).map(s => s.id) },
    { id: 'ENGL102', code: 'ENGL 102', name: 'Academic Writing', stream: 'General Education', section: 'B', room: 'Hum 3.08', slots: [[0, '13:00'], [2, '13:00']], students: STUDENTS.filter((s, i) => i % 2 === 0).map(s => s.id) },
    { id: 'CS120', code: 'CS 120', name: 'Programming Fundamentals', stream: 'Computer Science · Year 1', section: 'A', room: 'Lab C4', slots: [[1, '08:30'], [4, '08:30']], students: STUDENTS.filter(s => s.dept === 'CS').concat(STUDENTS.slice(1, 5)).map(s => s.id) }
  ];
  // classroom-observable signs, grouped like the ERLY areas (what a teacher can SEE)
  const SIGNS = [
    { id: 'aloud', area: 'reading', en: 'Struggles reading aloud', ar: 'يواجه صعوبة في القراءة بصوت عالٍ' },
    { id: 'copy', area: 'reading', en: 'Copies slowly from the board', ar: 'ينسخ ببطء من السبورة' },
    { id: 'spell', area: 'reading', en: 'Frequent, inconsistent spelling errors', ar: 'أخطاء إملائية متكررة وغير ثابتة' },
    { id: 'avoidread', area: 'reading', en: 'Avoids reading-heavy tasks', ar: 'يتجنب المهام كثيفة القراءة' },
    { id: 'hand', area: 'writing', en: 'Handwriting hard to read / very slow', ar: 'خط صعب القراءة / بطيء جداً' },
    { id: 'written', area: 'writing', en: 'Ideas much stronger spoken than written', ar: 'أفكاره أقوى بكثير شفهياً منها كتابياً' },
    { id: 'focus', area: 'attention', en: 'Loses focus quickly in class', ar: 'يفقد التركيز بسرعة في الصف' },
    { id: 'late', area: 'attention', en: 'Late or missing submissions', ar: 'تأخر أو غياب التسليمات' },
    { id: 'disorg', area: 'attention', en: 'Disorganised notes and materials', ar: 'ملاحظات ومواد غير منظمة' },
    { id: 'instr', area: 'listening', en: 'Misses verbal instructions / asks for repeats', ar: 'تفوته التعليمات الشفهية / يطلب الإعادة' },
    { id: 'noise', area: 'listening', en: 'Struggles in noisy group work', ar: 'يواجه صعوبة في العمل الجماعي الصاخب' },
    { id: 'numbers', area: 'maths', en: 'Mixes up numbers / slow with basic calculation', ar: 'يخلط الأرقام / بطيء في الحساب الأساسي' },
    { id: 'squint', area: 'vision', en: 'Squints or sits very close to the screen', ar: 'يضيّق عينيه أو يجلس قريباً جداً من الشاشة' },
    { id: 'testanx', area: 'wellbeing', en: 'Visible anxiety in tests', ar: 'قلق واضح في الاختبارات' },
    { id: 'withdrawn', area: 'wellbeing', en: 'Withdrawn, tired or low lately', ar: 'منعزل أو متعب أو محبط مؤخراً' },
    { id: 'groupwork', area: 'social', en: 'Avoids group work / speaking up', ar: 'يتجنب العمل الجماعي / المشاركة' }
  ];
  const AREA_NAME = { reading: 'Reading', writing: 'Writing', attention: 'Focus & organising', listening: 'Listening', maths: 'Numbers', vision: 'Vision', wellbeing: 'Wellbeing', social: 'Communication' };

  // ten past sessions per course; deterministic attendance with a few patterns
  function sessionsFor(course, now) {
    const out = []; const d = new Date(now); d.setHours(0, 0, 0, 0);
    for (let back = 1; out.length < 10 && back < 60; back++) {
      const day = new Date(d.getTime() - back * 864e5);
      const wd = (day.getDay() + 6) % 7; // Mon = 0
      course.slots.forEach(([w, t]) => { if (w === wd && out.length < 10) out.push({ id: course.id + '-' + day.toISOString().slice(0, 10) + '-' + t, date: day.toISOString().slice(0, 10), time: t }); });
    }
    return out.reverse();
  }
  function seededMark(courseId, sessId, stuId) {
    const r = rng(hashStr(courseId + sessId + stuId))();
    const weak = ['Omar Haddad', 'Rashid Al Ketbi', 'Ali Reza'].includes(STUDENTS.find(s => s.id === stuId).name);
    return r < (weak ? 0.22 : 0.05) ? 'A' : r < (weak ? 0.34 : 0.11) ? 'L' : 'P';
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const SEED_OBS = [
    { stu: 'Omar Haddad', course: 'MECH210', signs: ['late', 'focus', 'disorg'], note: 'Bright in discussion but has missed three lab deadlines; often starts the task in the last 10 minutes.', days: 6, by: 'Dr. Haddad' },
    { stu: 'Layla Nasser', course: 'ENGL102', signs: ['spell', 'written', 'aloud'], note: 'Excellent verbal answers; essays are much shorter and spelling is inconsistent (same word spelt 3 ways).', days: 3, by: 'Ms. Grant' },
    { stu: 'Rashid Al Ketbi', course: 'MATH201', signs: ['withdrawn', 'testanx'], note: 'Quieter than at the start of term, looked very anxious in the quiz.', days: 2, by: 'Dr. Nair' },
    { stu: 'Ali Reza', course: 'CS120', signs: ['instr', 'noise'], note: 'Often asks a neighbour what to do after I give instructions; fine when instructions are written.', days: 8, by: 'Mr. Costa' }
  ];

  function blank() { return { marks: {}, obs: [], refs: [], seeded: false }; }
  function load(store) {
    store = store || (typeof localStorage !== 'undefined' ? localStorage : null);
    let D = blank();
    try { if (store) D = Object.assign(blank(), JSON.parse(store.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
    if (!D.seeded) {
      const now = Date.now();
      SEED_OBS.forEach((o, i) => { const s = STUDENTS.find(x => x.name === o.stu); D.obs.push({ id: 'o' + i, stu: s.id, course: o.course, signs: o.signs, note: o.note, at: now - o.days * 864e5, by: o.by }); });
      D.refs.push({ id: 'r0', stu: STUDENTS.find(x => x.name === 'Layla Nasser').id, obs: ['o1'], at: now - 2 * 864e5, by: 'Ms. Grant', status: 'acknowledged', studentInformed: true, msg: 'Layla agreed I could share this with SAS.' });
      D.seeded = true;
    }
    return D;
  }
  function save(D, store) { store = store || (typeof localStorage !== 'undefined' ? localStorage : null); try { store && store.setItem(KEY, JSON.stringify(D)); } catch (e) { /* ignore */ } }

  function mark(D, course, sessId, stuId) { return (D.marks[sessId] || {})[stuId] || seededMark(course, sessId, stuId); }
  function attendance(D, courseId, stuId, now) {
    const c = COURSES.find(x => x.id === courseId);
    const ss = sessionsFor(c, now || Date.now());
    let p = 0, l = 0, a = 0;
    ss.forEach(s => { const m = mark(D, courseId, s.id, stuId); if (m === 'P') p++; else if (m === 'L') l++; else a++; });
    return { present: p, late: l, absent: a, total: ss.length, rate: ss.length ? (p + l * 0.5) / ss.length : 1 };
  }
  // observations for a student → areas with counts (what faculty noticed, not a diagnosis)
  function obsAreas(D, stuId) {
    const out = {};
    D.obs.filter(o => o.stu === stuId).forEach(o => o.signs.forEach(id => { const sg = SIGNS.find(x => x.id === id); if (sg) out[sg.area] = (out[sg.area] || 0) + 1; }));
    return out;
  }
  return { KEY, COLLEGES, STUDENTS, COURSES, SIGNS, AREA_NAME, sessionsFor, load, save, mark, attendance, obsAreas, blank, rng };
});
