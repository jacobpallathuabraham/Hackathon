/* ERLY — Growth Plan v10 logic (pure, no DOM).

   - TIMETABLE: a UK-style school/college day built from the student's own
     settings (start/finish, session and break length, lunch, class hours and
     commitments). Mon–Fri structured, Saturday optional catch-up, Sunday rest
     with an optional reflection.
   - PROGRAMME: six themed weeks. Each activity says what it is for and where
     in ERLY it happens; nothing pretends to be done automatically.
   - PLANNER: dated entries the student can complete, skip, reschedule,
     resize, reorder, add to or pause — none of it costs anything.
   - REVIEW: a weekly summary written ONLY from what the student did and
     answered. No scores of ability, no labels, no predictions.
   window.ERLY_GPLAN in the browser, CommonJS for the unit tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_GPLAN = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const B = (en, ar) => [en, ar];
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DAY_N = { mon: B('Monday', 'الاثنين'), tue: B('Tuesday', 'الثلاثاء'), wed: B('Wednesday', 'الأربعاء'), thu: B('Thursday', 'الخميس'), fri: B('Friday', 'الجمعة'), sat: B('Saturday', 'السبت'), sun: B('Sunday', 'الأحد') };

  /* ---------- time helpers ---------- */
  const toMin = t => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/); return m ? Math.min(23 * 60 + 59, +m[1] * 60 + +m[2]) : NaN; };
  const toHHMM = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const DEFAULT_TT = {
    start: '08:30', end: '14:15', session: 45, brk: 15, lunchAt: '12:00', lunch: 45,
    sat: 'optional', sun: 'rest', // sat: 'optional' | 'off' | 'study'; sun: 'rest' | 'reflect'
    classes: [],     // [{ day:'mon', from:'09:00', to:'10:30', label:'Lecture' }]
    commitments: [], // same shape: work shifts, prayer, travel, family time…
    workload: 'balanced' // 'light' | 'balanced' | 'heavy'
  };
  function settings(s) {
    const o = Object.assign({}, DEFAULT_TT, s || {});
    let a = toMin(o.start), b = toMin(o.end);
    if (!isFinite(a)) a = toMin(DEFAULT_TT.start);
    if (!isFinite(b) || b <= a + 30) b = Math.min(23 * 60, a + 345);
    o.start = toHHMM(a); o.end = toHHMM(b);
    o.session = clamp(Math.round(+o.session || 45), 15, 120);
    o.brk = clamp(Math.round(+o.brk || 15), 5, 45);
    o.lunch = clamp(Math.round(+o.lunch || 45), 0, 90);
    if (!isFinite(toMin(o.lunchAt))) o.lunchAt = DEFAULT_TT.lunchAt;
    const fixed = x => (Array.isArray(x) ? x : []).filter(c => c && DAYS.includes(c.day) && isFinite(toMin(c.from)) && toMin(c.to) > toMin(c.from)).slice(0, 40).map(c => ({ day: c.day, from: c.from, to: c.to, label: String(c.label || '').slice(0, 40) }));
    o.classes = fixed(o.classes); o.commitments = fixed(o.commitments);
    return o;
  }

  /* ---------- the six weeks ---------- */
  // where: a real place in ERLY (or 'self' for something done away from the screen)
  const A = (id, mins, title, why, where, kind) => ({ id, mins, title, why, where, kind: kind || 'task' });
  const WEEKS = [
    { n: 1, name: B('Foundation', 'التأسيس'), aim: B('Get to know how you work best, set up your timetable and start small.', 'تعرّف على أفضل طريقة تعمل بها، وجهّز جدولك، وابدأ بخطوات صغيرة.'), colour: '#c1502b',
      acts: [A('consult', 15, B('First consultation with Noor', 'الاستشارة الأولى مع نور'), B('Agree what you want from the six weeks.', 'اتفق على ما تريده من الأسابيع الستة.'), 'plan', 'consult'),
        A('prefs', 10, B('Learning preferences reflection', 'تأمل تفضيلات التعلم'), B('Notice what helps you — times of day, places, formats. Preferences, not labels.', 'لاحظ ما يساعدك: الأوقات والأماكن والصيغ. تفضيلات لا تصنيفات.'), 'prefs', 'reflect'),
        A('tt', 10, B('Set up your timetable', 'جهّز جدولك'), B('Put classes and commitments in, so study blocks fit around real life.', 'أدخل المحاضرات والالتزامات لتتناسب جلسات الدراسة مع حياتك.'), 'timetable'),
        A('read1', 15, B('A short reading task', 'مهمة قراءة قصيرة'), B('One short text in the Reading Studio, at your pace.', 'نص قصير في استوديو القراءة بإيقاعك.'), 'studio'),
        A('plan1', 10, B('Planning warm-up: Plan It', 'تمرين تخطيط: خطّط لها'), B('Order real study tasks by what each needs first.', 'رتّب مهاماً دراسية حسب ما تحتاجه كل منها أولاً.'), 'game:plan'),
        A('rev1', 10, B('First weekly review', 'المراجعة الأسبوعية الأولى'), B('What worked, what didn’t, what to change.', 'ما الذي نجح وما لم ينجح وما الذي نغيّره.'), 'review', 'review')] },
    { n: 2, name: B('Reading and understanding', 'القراءة والفهم'), aim: B('Read academic texts with less effort and more understanding.', 'اقرأ النصوص الأكاديمية بجهد أقل وفهم أكبر.'), colour: '#f97316',
      acts: [A('studio2', 20, B('Reading Studio session', 'جلسة في استوديو القراءة'), B('Try one comfort setting (font, spacing, read-aloud) and keep what helps.', 'جرّب إعداداً مريحاً واحتفظ بما يساعد.'), 'studio'),
        A('words', 8, B('Word Builder', 'بنّاء الكلمات'), B('Unlock new terms from their parts.', 'افهم المصطلحات من أجزائها.'), 'game:words'),
        A('order', 8, B('Sentence Flow', 'تسلسل الجمل'), B('Follow how a paragraph’s argument moves.', 'تتبّع كيف تتحرك حجة الفقرة.'), 'game:order'),
        A('video2', 15, B('Watch a lecture video with captions', 'شاهد محاضرة مع الترجمة'), B('Pause and note the three key points.', 'توقف ودوّن ثلاث نقاط رئيسية.'), 'videos'),
        A('summ', 15, B('One-paragraph summary', 'ملخص من فقرة واحدة'), B('Explain a reading in your own words — the best test of understanding.', 'اشرح قراءة بكلماتك — أفضل اختبار للفهم.'), 'self'),
        A('rev2', 10, B('Weekly review', 'المراجعة الأسبوعية'), B('Look back at the week with Noor.', 'راجع الأسبوع مع نور.'), 'review', 'review')] },
    { n: 3, name: B('Memory and revision', 'الذاكرة والمراجعة'), aim: B('Use the revision methods with the strongest evidence: retrieval and spacing.', 'استخدم أقوى طرق المراجعة دليلاً: الاسترجاع والتباعد.'), colour: '#a855f7',
      acts: [A('seq', 6, B('Glow Sequence', 'تسلسل الضوء'), B('Practise holding a sequence in mind.', 'تدرّب على الاحتفاظ بتسلسل في ذهنك.'), 'game:sequence'),
        A('chunk', 6, B('Chunk It', 'جزّئها'), B('See how grouping makes information lighter.', 'لاحظ كيف يخفف التجميع المعلومات.'), 'game:chunk'),
        A('quiz', 15, B('Retrieval practice with Noor', 'تدريب الاسترجاع مع نور'), B('Ask Noor to “quiz me on …” a topic — recall beats re-reading.', 'اطلب من نور «اختبرني في…» — الاسترجاع أفضل من إعادة القراءة.'), 'noor'),
        A('space', 10, B('Make a spaced-review schedule', 'اصنع جدول مراجعة متباعدة'), B('Revisit each topic after 1 day, 3 days and 1 week.', 'راجع كل موضوع بعد يوم ثم ثلاثة أيام ثم أسبوع.'), 'self'),
        A('rev3', 10, B('Weekly review', 'المراجعة الأسبوعية'), B('Which method felt most useful?', 'أي طريقة شعرت أنها الأكثر فائدة؟'), 'review', 'review')] },
    { n: 4, name: B('Planning and organisation', 'التخطيط والتنظيم'), aim: B('Make starting easier and deadlines calmer with Start-Ramp.', 'اجعل البدء أسهل والمواعيد أهدأ مع منحدر البدء.'), colour: '#22c55e',
      acts: [A('ramp', 15, B('Start-Ramp: break one assignment into first steps', 'منحدر البدء: قسّم واجباً إلى خطوات أولى'), B('A 5-minute first step is easier to start than “write the essay”.', 'خطوة من ٥ دقائق أسهل بدءاً من «اكتب المقال».'), 'ramp'),
        A('plan4', 8, B('Plan It', 'خطّط لها'), B('Practise ordering by dependencies.', 'تدرّب على الترتيب حسب الاعتماد.'), 'game:plan'),
        A('week4', 15, B('Plan next week in your timetable', 'خطّط للأسبوع القادم في جدولك'), B('Put deadlines in first, then work backwards.', 'ضع المواعيد أولاً ثم اعمل بالعكس.'), 'timetable'),
        A('coach', 10, B('Ask Noor’s study coach to split a task', 'اطلب من مدرب نور تقسيم مهمة'), B('“Break down my lab report into steps.”', '«قسّم تقرير المختبر إلى خطوات».'), 'noor'),
        A('rev4', 10, B('Weekly review', 'المراجعة الأسبوعية'), B('Did starting feel any easier?', 'هل صار البدء أسهل؟'), 'review', 'review')] },
    { n: 5, name: B('Focus and independent learning', 'التركيز والتعلم المستقل'), aim: B('Protect focus and learn to guide your own study.', 'احمِ تركيزك وتعلّم توجيه دراستك بنفسك.'), colour: '#eab308',
      acts: [A('switch', 6, B('Switch!', 'بدّل!'), B('Notice the cost of switching — then batch similar work.', 'لاحظ كلفة التبديل ثم جمّع الأعمال المتشابهة.'), 'game:switch'),
        A('sprint', 25, B('Two focus blocks with phone away', 'جلستا تركيز والهاتف بعيداً'), B('Short, protected blocks beat long, distracted ones.', 'الجلسات القصيرة المحمية أفضل من الطويلة المشتتة.'), 'self'),
        A('listen', 6, B('Listen & Tap', 'استمع واضغط'), B('Practise holding multi-step instructions.', 'تدرّب على الاحتفاظ بتعليمات متعددة.'), 'game:listen'),
        A('check5', 10, B('A Daily Quest check-in', 'فحص من المهمة اليومية'), B('A quick look at how the week is going.', 'نظرة سريعة على سير الأسبوع.'), 'checkins'),
        A('indep', 20, B('Self-directed topic: choose, learn, explain', 'موضوع ذاتي: اختر وتعلّم واشرح'), B('Pick something from your module and teach it back to Noor.', 'اختر شيئاً من مادتك واشرحه لنور.'), 'noor'),
        A('rev5', 10, B('Weekly review', 'المراجعة الأسبوعية'), B('What protects your focus?', 'ما الذي يحمي تركيزك؟'), 'review', 'review')] },
    { n: 6, name: B('Review and future planning', 'المراجعة والتخطيط للمستقبل'), aim: B('Keep what worked, and plan how you’ll study from here.', 'احتفظ بما نجح وخطّط لكيف ستدرس من الآن.'), colour: '#38bdf8',
      acts: [A('final', 15, B('Final consultation with Noor', 'الاستشارة الأخيرة مع نور'), B('Look back over six weeks.', 'راجع الأسابيع الستة.'), 'review', 'review'),
        A('strat', 10, B('Your strategy summary', 'ملخص استراتيجياتك'), B('Keep the strategies you rated as helpful.', 'احتفظ بالاستراتيجيات التي قيّمتها مفيدة.'), 'strategies'),
        A('over', 10, B('Progress overview', 'نظرة عامة على التقدم'), B('What you actually did, week by week.', 'ما أنجزته فعلاً أسبوعاً بأسبوع.'), 'progress'),
        A('future', 15, B('Build your future timetable', 'ابنِ جدولك المستقبلي'), B('A sustainable weekly routine for after the programme.', 'روتين أسبوعي مستدام لما بعد البرنامج.'), 'future'),
        A('report', 5, B('Optional: a summary to share with SAS', 'اختياري: ملخص لمشاركته مع خدمات الطلبة'), B('Only if you choose to share it.', 'فقط إن اخترت مشاركته.'), 'share', 'optional')] }
  ];

  /* ---------- strategy library (evidence-informed, plain language) ---------- */
  const STRATEGIES = [
    { id: 'retrieval', area: 'memory', name: B('Retrieval practice', 'تدريب الاسترجاع'), how: B('Close the notes and write or say what you remember, then check.', 'أغلق الملاحظات واكتب ما تتذكره ثم تحقق.'), why: B('Recalling strengthens memory more than re-reading.', 'الاستدعاء يقوي الذاكرة أكثر من إعادة القراءة.') },
    { id: 'spacing', area: 'memory', name: B('Spaced review', 'المراجعة المتباعدة'), how: B('Revisit a topic after 1 day, 3 days, 1 week.', 'راجع الموضوع بعد يوم ثم ٣ أيام ثم أسبوع.'), why: B('Spreading practice out beats cramming for long-term recall.', 'توزيع التدريب أفضل من الحشو للتذكر الطويل.') },
    { id: 'chunking', area: 'memory', name: B('Chunking', 'التجزئة'), how: B('Group items into 3–4 meaningful chunks.', 'جمّع العناصر في ٣–٤ مجموعات ذات معنى.'), why: B('Working memory holds a few chunks more easily than many separate items.', 'تحتفظ الذاكرة العاملة بمجموعات قليلة بسهولة أكبر.') },
    { id: 'morph', area: 'reading', name: B('Word parts', 'أجزاء الكلمات'), how: B('Split new terms into prefix, root, suffix.', 'قسّم المصطلحات الجديدة إلى سابقة وجذر ولاحقة.'), why: B('Turns long words into meaningful pieces.', 'يحوّل الكلمات الطويلة إلى قطع ذات معنى.') },
    { id: 'skim', area: 'reading', name: B('Survey before reading', 'استطلع قبل القراءة'), how: B('Read headings, first sentences and figures first.', 'اقرأ العناوين والجمل الأولى والأشكال أولاً.'), why: B('A map of the text makes the details easier to place.', 'خريطة النص تسهّل وضع التفاصيل.') },
    { id: 'aloud', area: 'reading', name: B('Read-aloud and comfort settings', 'القراءة الصوتية وإعدادات الراحة'), how: B('Use text-to-speech, larger spacing or a tint in the Reading Studio.', 'استخدم القراءة الصوتية أو التباعد أو اللون في الاستوديو.'), why: B('Reducing visual effort leaves more attention for meaning.', 'تقليل الجهد البصري يترك انتباهاً أكبر للمعنى.') },
    { id: 'tiny', area: 'planning', name: B('Tiny first step', 'الخطوة الأولى الصغيرة'), how: B('Make the first step something you can do in 5 minutes.', 'اجعل الخطوة الأولى شيئاً يُنجز في ٥ دقائق.'), why: B('Starting is often the hardest part; momentum follows.', 'البدء غالباً الأصعب، ثم يأتي الزخم.') },
    { id: 'backward', area: 'planning', name: B('Plan backwards from deadlines', 'خطط بالعكس من المواعيد'), how: B('Put the deadline in, then schedule each step before it.', 'ضع الموعد ثم جدول كل خطوة قبله.'), why: B('Makes the real time available visible.', 'يُظهر الوقت المتاح فعلاً.') },
    { id: 'blocks', area: 'focus', name: B('Protected focus blocks', 'جلسات تركيز محمية'), how: B('25–45 minutes, phone in another room, one task.', '٢٥–٤٥ دقيقة، الهاتف في غرفة أخرى، مهمة واحدة.'), why: B('Fewer interruptions means less time spent re-starting.', 'مقاطعات أقل تعني وقتاً أقل لإعادة البدء.') },
    { id: 'batch', area: 'focus', name: B('Batch similar tasks', 'جمّع المهام المتشابهة'), how: B('Do all emails together, all reading together.', 'أنجز الرسائل معاً والقراءة معاً.'), why: B('Switching between task types has a cost for everyone.', 'التبديل بين أنواع المهام له كلفة على الجميع.') },
    { id: 'notes', area: 'listening', name: B('Keyword notes', 'ملاحظات الكلمات المفتاحية'), how: B('In lectures, write keywords, not sentences; fill gaps from the recording later.', 'دوّن الكلمات المفتاحية لا الجمل، وأكمل من التسجيل لاحقاً.'), why: B('Keeps you listening instead of transcribing.', 'يبقيك مستمعاً لا ناسخاً.') },
    { id: 'reset', area: 'wellbeing', name: B('One-minute reset', 'استراحة دقيقة'), how: B('Four slow breaths before starting.', 'أربعة أنفاس بطيئة قبل البدء.'), why: B('A calmer start makes it easier to begin.', 'بداية أهدأ تجعل البدء أسهل.') }
  ];

  /* ---------- timetable ---------- */
  // returns { days: { mon: [blocks…], … } } — a block: { from, to, kind: 'study'|'break'|'lunch'|'class'|'commit'|'rest'|'reflect'|'catchup', label }
  function timetable(ttIn, week, programmeState) {
    const tt = settings(ttIn);
    const W = WEEKS[clamp((week || 1) - 1, 0, 5)];
    const acts = W.acts.filter(a => a.kind !== 'review' && a.kind !== 'optional');
    const a0 = toMin(tt.start), a1 = toMin(tt.end), lunchAt = toMin(tt.lunchAt);
    const perDay = tt.workload === 'light' ? 1 : tt.workload === 'heavy' ? 3 : 2; // programme blocks per day (the rest is your own study)
    const out = {}; let ai = 0;
    DAYS.forEach((d, di) => {
      if (d === 'sun') { out[d] = [{ from: '10:00', to: '10:00', kind: 'rest', label: B('Rest day', 'يوم راحة') }].concat(tt.sun === 'reflect' ? [{ from: '18:00', to: '18:15', kind: 'reflect', label: B('Optional 15-minute reflection', 'تأمل اختياري لمدة ١٥ دقيقة'), act: 'reflect' }] : []); return; }
      if (d === 'sat') { out[d] = tt.sat === 'off' ? [{ from: '10:00', to: '10:00', kind: 'rest', label: B('Day off', 'يوم عطلة') }] : [{ from: '10:00', to: '11:30', kind: 'catchup', label: tt.sat === 'study' ? B('Study block (your choice)', 'جلسة دراسة (باختيارك)') : B('Optional catch-up — only if you want to', 'تعويض اختياري — فقط إن أردت') }]; return; }
      const fixed = tt.classes.filter(c => c.day === d).map(c => ({ from: toMin(c.from), to: toMin(c.to), kind: 'class', label: c.label ? B(c.label, c.label) : B('Class', 'محاضرة') }))
        .concat(tt.commitments.filter(c => c.day === d).map(c => ({ from: toMin(c.from), to: toMin(c.to), kind: 'commit', label: c.label ? B(c.label, c.label) : B('Commitment', 'التزام') })))
        .filter(b => b.to > a0 && b.from < a1).sort((x, y) => x.from - y.from);
      const blocks = []; let t = a0, lunchDone = tt.lunch === 0, prog = 0;
      const busy = (s, e) => fixed.find(f => f.from < e && f.to > s);
      let guard = 0;
      while (t < a1 && guard++ < 200) {
        const f = fixed.find(x => x.from <= t && x.to > t);
        if (f) { blocks.push(Object.assign({}, f, { from: toHHMM(Math.max(f.from, a0)), to: toHHMM(Math.min(f.to, a1)) })); t = f.to; fixed.splice(fixed.indexOf(f), 1); continue; }
        if (!lunchDone && t >= lunchAt - 10) { const e = Math.min(a1, t + tt.lunch); blocks.push({ from: toHHMM(t), to: toHHMM(e), kind: 'lunch', label: B('Lunch', 'الغداء') }); t = e; lunchDone = true; continue; }
        const next = fixed.length ? fixed[0].from : Infinity;
        let end = Math.min(a1, t + tt.session, next, !lunchDone ? Math.max(t + 15, lunchAt) : Infinity);
        if (end - t < 15) { // too short to study: a break until the next fixed thing
          blocks.push({ from: toHHMM(t), to: toHHMM(Math.min(a1, next === Infinity ? a1 : next)), kind: 'break', label: B('Break', 'استراحة') }); t = Math.min(a1, next === Infinity ? a1 : next); continue;
        }
        let blk;
        if (prog < perDay) { const act = acts[ai % acts.length]; ai++; prog++; blk = { from: toHHMM(t), to: toHHMM(end), kind: 'study', label: act.title, act: act.id, where: act.where }; }
        else blk = { from: toHHMM(t), to: toHHMM(end), kind: 'study', label: B('Your own study (modules, assignments)', 'دراستك الخاصة (المواد والواجبات)') };
        blocks.push(blk); t = end;
        if (t < a1 && !busy(t, t + tt.brk) && (lunchDone || t + tt.brk < lunchAt)) { const e = Math.min(a1, t + tt.brk); blocks.push({ from: toHHMM(t), to: toHHMM(e), kind: 'break', label: B('Break', 'استراحة') }); t = e; }
      }
      // the weekly review sits at the end of Friday
      if (d === 'fri') { const rv = W.acts.find(a => a.kind === 'review'); if (rv) blocks.push({ from: tt.end, to: toHHMM(Math.min(23 * 60 + 59, a1 + 15)), kind: 'review', label: rv.title, act: rv.id, where: 'review' }); }
      out[d] = blocks;
    });
    return { settings: tt, week: W.n, days: out };
  }
  const minutesOf = b => Math.max(0, toMin(b.to) - toMin(b.from));
  function totals(tt) { const o = { study: 0, class: 0, break: 0, lunch: 0, commit: 0 }; Object.values(tt.days).forEach(bs => bs.forEach(b => { if (o[b.kind] != null) o[b.kind] += minutesOf(b); })); return o; }

  /* ---------- the planner (one day) ---------- */
  let uid = 0;
  const newId = () => 'p' + Date.now().toString(36) + (uid++).toString(36);
  function dayPlan(tt, dayKey, objectiveOf) {
    return (tt.days[dayKey] || []).filter(b => b.kind === 'study' || b.kind === 'review' || b.kind === 'reflect' || b.kind === 'catchup').map(b => ({ id: newId(), time: b.from, mins: minutesOf(b) || 15, title: b.label, act: b.act || null, where: b.where || null, objective: objectiveOf ? objectiveOf(b.act) : null, status: 'todo', reflection: '', next: '', src: 'plan' }));
  }
  // planner operations (pure: they return a new list)
  const ops = {
    complete: (L, id, refl, next) => L.map(e => e.id === id ? Object.assign({}, e, { status: 'done', reflection: String(refl || e.reflection || '').slice(0, 400), next: String(next || e.next || '').slice(0, 200), doneAt: Date.now() }) : e),
    skip: (L, id) => L.map(e => e.id === id ? Object.assign({}, e, { status: 'skipped' }) : e),
    reopen: (L, id) => L.map(e => e.id === id ? Object.assign({}, e, { status: 'todo' }) : e),
    resize: (L, id, mins) => L.map(e => e.id === id ? Object.assign({}, e, { mins: clamp(Math.round(+mins || e.mins), 5, 180) }) : e),
    move: (L, id, dir) => { const i = L.findIndex(e => e.id === id), j = i + dir; if (i < 0 || j < 0 || j >= L.length) return L; const M = L.slice(); [M[i], M[j]] = [M[j], M[i]]; const lo = Math.min(i, j), hi = Math.max(i, j), early = L[lo].time, late = L[hi].time; M[lo] = Object.assign({}, M[lo], { time: early }); M[hi] = Object.assign({}, M[hi], { time: late }); return M; }, // swap the tasks, keep the time slots
    add: (L, title, time, mins) => L.concat([{ id: newId(), time: isFinite(toMin(time)) ? time : '16:00', mins: clamp(Math.round(+mins || 30), 5, 180), title: [String(title || 'My task').slice(0, 80), String(title || 'مهمتي').slice(0, 80)], act: null, where: null, objective: null, status: 'todo', reflection: '', next: '', src: 'own' }]).sort((a, b) => toMin(a.time) - toMin(b.time)),
    remove: (L, id) => L.filter(e => !(e.id === id && e.src === 'own')),
    reschedule: (L, id) => { const e = L.find(x => x.id === id); return { today: L.filter(x => x.id !== id), moved: e ? Object.assign({}, e, { status: 'todo', id: newId(), movedFrom: true }) : null }; }
  };

  /* ---------- progress from real activity ---------- */
  // planner: { 'YYYY-MM-DD': [entries] }, games: [{g, at, n, ok}], extra: { readings, checkins }
  function weekStats(planner, fromMs, toMs, games, extra) {
    const days = Object.keys(planner || {}).filter(k => { const t = Date.parse(k + 'T12:00:00'); return t >= fromMs && t < toMs; });
    const all = days.flatMap(k => planner[k]);
    const done = all.filter(e => e.status === 'done'), skipped = all.filter(e => e.status === 'skipped');
    const g = (games || []).filter(s => s.at >= fromMs && s.at < toMs);
    return {
      planned: all.length, done: done.length, skipped: skipped.length, minutes: done.reduce((s, e) => s + (e.mins || 0), 0),
      activeDays: new Set(days.filter(k => planner[k].some(e => e.status === 'done'))).size,
      own: done.filter(e => e.src === 'own').length, reflections: done.filter(e => e.reflection).map(e => e.reflection),
      games: g.length, gameMins: g.reduce((s, x) => s + (x.mins || 1), 0), readings: (extra && extra.readings) || 0, checkins: (extra && extra.checkins) || 0
    };
  }

  /* ---------- Noor's weekly review — from the student's own answers and activity ---------- */
  // ans: { went: 1..5, helped: [strategy ids], hard: 'time'|'energy'|'starting'|'focus'|'understanding'|'nothing', change: 'same'|'lighter'|'more'|'repeat'|'pause', note: free text }
  function review(week, ans, stats) {
    const W = WEEKS[clamp(week - 1, 0, 5)], out = { week, lines: [], keep: [], change: [], next: null };
    const s = stats || {};
    if (s.done) out.lines.push(B(`You completed ${s.done} planned activit${s.done === 1 ? 'y' : 'ies'} (about ${s.minutes} minutes) on ${s.activeDays} day${s.activeDays === 1 ? '' : 's'} this week.`, `أنجزت ${s.done} من الأنشطة المخططة (نحو ${s.minutes} دقيقة) في ${s.activeDays} أيام هذا الأسبوع.`));
    else out.lines.push(B('No planned activities were ticked off this week. That’s alright — this review is about what to change, not about catching up.', 'لم تُعلَّم أنشطة مخططة هذا الأسبوع. لا بأس — هذه المراجعة عن التغيير لا عن التعويض.'));
    if (s.skipped) out.lines.push(B(`You skipped ${s.skipped}. Skipping is allowed; it tells us what to adjust.`, `تخطيت ${s.skipped}. التخطي مسموح ويخبرنا بما نعدّله.`));
    if (s.own) out.lines.push(B(`You also added ${s.own} task${s.own === 1 ? '' : 's'} of your own — that’s the plan becoming yours.`, `أضفت أيضاً ${s.own} من مهامك الخاصة — هكذا تصبح الخطة خطتك.`));
    if (s.games) out.lines.push(B(`You played ${s.games} learning game session${s.games === 1 ? '' : 's'}.`, `لعبت ${s.games} جلسة من ألعاب التعلم.`));
    if (ans.went >= 4) out.lines.push(B('You said the week went well.', 'قلت إن الأسبوع سار جيداً.'));
    else if (ans.went <= 2) out.lines.push(B('You said the week was hard going. Weeks like that are part of any plan.', 'قلت إن الأسبوع كان صعباً. أسابيع كهذه جزء من أي خطة.'));
    (ans.helped || []).forEach(id => { const st = STRATEGIES.find(x => x.id === id); if (st) out.keep.push(st.name); });
    const H = { time: B('Time was tight: next week’s programme blocks will be shorter — change “session length” in your timetable if you’d like.', 'كان الوقت ضيقاً: ستكون جلسات البرنامج أقصر.'), energy: B('Energy was low: put the most demanding block at the time of day you named as your best, and keep the one-minute reset before it.', 'كانت الطاقة منخفضة: ضع الجلسة الأصعب في أفضل وقت لك.'), starting: B('Starting was hard: use Start-Ramp’s 5-minute first step before each block.', 'كان البدء صعباً: استخدم خطوة الخمس دقائق قبل كل جلسة.'), focus: B('Focus slipped: try one protected block a day with the phone in another room.', 'تشتت التركيز: جرّب جلسة محمية يومياً والهاتف بعيداً.'), understanding: B('Understanding was the sticking point: ask Noor to explain the hardest topic at a simpler level, then teach it back.', 'كان الفهم هو العائق: اطلب من نور شرح الموضوع الأصعب بمستوى أبسط.') };
    if (H[ans.hard]) out.change.push(H[ans.hard]);
    const C = { lighter: B('You asked for a lighter week: workload set to light (1 programme block a day).', 'طلبت أسبوعاً أخف: عبء خفيف.'), more: B('You asked for more: workload set to heavy (3 programme blocks a day).', 'طلبت المزيد: عبء ثقيل.'), repeat: B(`You chose to repeat week ${week} (“${W.name[0]}”) — repeating is a normal part of the programme.`, `اخترت تكرار الأسبوع ${week} — التكرار جزء طبيعي من البرنامج.`), pause: B('You chose to pause the programme. Your timetable and planner stay; resume whenever you like.', 'اخترت إيقاف البرنامج مؤقتاً. يبقى جدولك ومخططك؛ استأنف متى شئت.'), same: null };
    if (C[ans.change]) out.change.push(C[ans.change]);
    if (ans.note) out.lines.push(B(`Your note: “${String(ans.note).slice(0, 240)}”`, `ملاحظتك: «${String(ans.note).slice(0, 240)}»`));
    out.next = ans.change === 'repeat' ? week : ans.change === 'pause' ? week : Math.min(6, week + 1);
    out.workload = ans.change === 'lighter' ? 'light' : ans.change === 'more' ? 'heavy' : null;
    out.shorter = ans.hard === 'time';
    out.pause = ans.change === 'pause';
    if (!out.change.length) out.change.push(B('No changes needed — keep going as you are.', 'لا حاجة لتغييرات — تابع كما أنت.'));
    return out;
  }

  return { DAYS, DAY_N, WEEKS, STRATEGIES, DEFAULT_TT, settings, timetable, totals, dayPlan, ops, weekStats, review, toMin, toHHMM, minutesOf };
});
