/* ERLY — Growth Plan logic (pure).
   A six-week skills-and-strategies programme, run the way a good learning
   specialist would: an intake consult, SMART goals, short daily sessions that
   adapt in difficulty, and a weekly review that changes the plan.
   It builds skills and habits; it complements — never replaces — support from
   SAS, a specialist tutor or a clinician.
   Pure: window.ERLY_GROWTH in the browser, CommonJS for the tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_GROWTH = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const B = (en, ar) => [en, ar];
  const WEEKS = 6, PER_WEEK = 5;

  const AREAS = {
    reading: { name: B('Reading', 'القراءة'), color: '#2a78d6', icon: 'book',
      goals: [B('Read a 2-page article in one sitting, with read-aloud on, four days a week', 'قراءة مقال من صفحتين في جلسة واحدة مع القراءة الصوتية، أربعة أيام في الأسبوع'), B('Break long words into syllables without guessing', 'تقسيم الكلمات الطويلة إلى مقاطع دون تخمين'), B('Summarise each reading in three lines', 'تلخيص كل قراءة في ثلاثة أسطر')],
      themes: [B('Hearing the sounds in words', 'سماع الأصوات في الكلمات'), B('Chunking long words', 'تقسيم الكلمات الطويلة'), B('Fluency with a pacer', 'الطلاقة مع موجّه'), B('Reading for meaning', 'القراءة للفهم'), B('Spelling patterns', 'أنماط الإملاء'), B('Putting it all together', 'جمع كل شيء معاً')] },
    attention: { name: B('Focus & starting', 'التركيز والبدء'), color: '#eb6834', icon: 'target',
      goals: [B('Start a study task within 5 minutes of sitting down, five days a week', 'بدء مهمة دراسية خلال ٥ دقائق من الجلوس، خمسة أيام في الأسبوع'), B('Complete three 25-minute focus sprints a day', 'إنجاز ثلاث جولات تركيز من ٢٥ دقيقة يومياً'), B('Plan the week every Sunday in 15 minutes', 'التخطيط للأسبوع كل أحد في ١٥ دقيقة')],
      themes: [B('Making the first step tiny', 'تصغير الخطوة الأولى'), B('Short focus sprints', 'جولات تركيز قصيرة'), B('Holding things in mind', 'الاحتفاظ بالأشياء في الذهن'), B('Longer sprints, fewer switches', 'جولات أطول وتنقّل أقل'), B('Planning the week', 'التخطيط للأسبوع'), B('Your own system', 'نظامك الخاص')] },
    maths: { name: B('Numbers & maths', 'الأرقام والرياضيات'), color: '#1baf7a', icon: 'calc',
      goals: [B('Estimate before calculating, every problem', 'التقدير قبل الحساب في كل مسألة'), B('Work through one worked example a day, step by step', 'حل مثال محلول واحد يومياً خطوة بخطوة'), B('Feel calmer starting maths tasks', 'الشعور بهدوء أكبر عند بدء مهام الرياضيات')],
      themes: [B('Seeing quantities', 'رؤية الكميات'), B('The number line', 'خط الأعداد'), B('Estimating first', 'التقدير أولاً'), B('Bigger numbers', 'أعداد أكبر'), B('Calm maths', 'رياضيات بهدوء'), B('Putting it together', 'جمع كل شيء معاً')] },
    writing: { name: B('Writing', 'الكتابة'), color: '#6250d6', icon: 'pen',
      goals: [B('Plan every paragraph with Point–Evidence–Explain–Link', 'التخطيط لكل فقرة بالفكرة–الدليل–الشرح–الربط'), B('Draft first, edit later — never both at once', 'المسودة أولاً والتحرير لاحقاً — لا الاثنان معاً'), B('Use dictation for first drafts', 'استخدام الإملاء الصوتي للمسودات الأولى')],
      themes: [B('Building sentences', 'بناء الجمل'), B('Planning a paragraph', 'التخطيط للفقرة'), B('Spelling strategies', 'استراتيجيات الإملاء'), B('Linking ideas', 'ربط الأفكار'), B('Drafting fast', 'كتابة المسودة بسرعة'), B('Putting it together', 'جمع كل شيء معاً')] },
    listening: { name: B('Listening', 'الاستماع'), color: '#eda100', icon: 'ear',
      goals: [B('Follow three-step spoken instructions first time', 'اتباع تعليمات شفهية من ثلاث خطوات من المرة الأولى'), B('Use recorded lectures to fill gaps within 24 hours', 'استخدام المحاضرات المسجلة لسد الفجوات خلال ٢٤ ساعة')],
      themes: [B('Holding instructions', 'الاحتفاظ بالتعليمات'), B('Longer instructions', 'تعليمات أطول'), B('Listening with notes', 'الاستماع مع الملاحظات'), B('Noisy rooms', 'الغرف الصاخبة'), B('Lecture strategies', 'استراتيجيات المحاضرات'), B('Putting it together', 'جمع كل شيء معاً')] },
    wellbeing: { name: B('Calm & confidence', 'الهدوء والثقة'), color: '#e87ba4', icon: 'sprout',
      goals: [B('Use a 1-minute breathing reset before every study session', 'استخدام استراحة تنفّس لدقيقة قبل كل جلسة دراسة'), B('Catch and reframe one unhelpful thought a day', 'التقاط فكرة غير مفيدة يومياً وإعادة صياغتها'), B('Sleep 7+ hours on five nights a week', 'النوم ٧ ساعات أو أكثر خمس ليالٍ في الأسبوع')],
      themes: [B('Breathing resets', 'استراحات التنفّس'), B('Noticing thoughts', 'ملاحظة الأفكار'), B('Reframing', 'إعادة الصياغة'), B('Sleep and energy', 'النوم والطاقة'), B('Exam calm', 'هدوء الامتحان'), B('Your toolkit', 'أدواتك')] }
  };

  // the exercise library: id, area, minutes, which weeks it suits
  const GAMES = [
    { id: 'syllables', area: 'reading', mins: 3, weeks: [1, 2, 6], name: B('Break down academic words', 'فكّك الكلمات الأكاديمية'), desc: B('Hear a long word, count its syllables', 'اسمع كلمة طويلة وعدّ مقاطعها') },
    { id: 'pacer', area: 'reading', mins: 4, weeks: [3, 4, 6], name: B('Pacer reading', 'القراءة مع الموجّه'), desc: B('Read along with a moving highlight, then answer', 'اقرأ مع إضاءة متحركة ثم أجب') },
    { id: 'spelling', area: 'reading', mins: 3, weeks: [2, 5, 6], name: B('Look, say, cover, write', 'انظر، قل، غطِّ، اكتب'), desc: B('The multisensory spelling routine', 'روتين الإملاء متعدد الحواس') },
    { id: 'nback', area: 'attention', mins: 3, weeks: [3, 4, 6], name: B('Memory match (n-back)', 'مطابقة الذاكرة'), desc: B('Spot when a letter repeats', 'التقط تكرار الحرف') },
    { id: 'sprint', area: 'attention', mins: 3, weeks: [2, 4, 5, 6], name: B('Focus sprint', 'جولة تركيز'), desc: B('A short, timed burst on a real task', 'دفعة قصيرة موقوتة على مهمة حقيقية') },
    { id: 'ramp', area: 'attention', mins: 2, weeks: [1, 5, 6], name: B('Tiny first step', 'الخطوة الأولى الصغيرة'), desc: B('Break a task into three tiny steps', 'قسّم مهمة إلى ثلاث خطوات صغيرة') },
    { id: 'dots', area: 'maths', mins: 2, weeks: [1, 3, 6], name: B('Quick estimate', 'تقدير سريع'), desc: B('How many data points? Estimate, don’t count', 'كم نقطة بيانات؟ قدّر ولا تعدّ') },
    { id: 'numberline', area: 'maths', mins: 3, weeks: [2, 3, 4, 6], name: B('Number line', 'خط الأعداد'), desc: B('Place numbers where they belong', 'ضع الأعداد في مكانها') },
    { id: 'sentence', area: 'writing', mins: 3, weeks: [1, 4, 6], name: B('Sentence builder', 'بناء الجمل'), desc: B('Put the words in order', 'رتّب الكلمات') },
    { id: 'peel', area: 'writing', mins: 4, weeks: [2, 4, 5, 6], name: B('PEEL planner', 'مخطط الفقرة'), desc: B('Plan a paragraph in four boxes', 'خطط لفقرة في أربعة مربعات') },
    { id: 'listen', area: 'listening', mins: 3, weeks: [1, 2, 3, 4, 5, 6], name: B('Lab instructions', 'تعليمات المختبر'), desc: B('Hear multi-step instructions once, then follow them', 'اسمع تعليمات متعددة الخطوات مرة ثم نفّذها') },
    { id: 'breathe', area: 'wellbeing', mins: 1, weeks: [1, 2, 3, 4, 5, 6], name: B('Box breathing', 'التنفّس المربع'), desc: B('Four slow breaths to reset', 'أربعة أنفاس بطيئة لإعادة الضبط') },
    { id: 'reframe', area: 'wellbeing', mins: 2, weeks: [2, 3, 4, 5, 6], name: B('Reframe it', 'أعد صياغتها'), desc: B('Swap an unhelpful thought for a balanced one', 'استبدل فكرة غير مفيدة بأخرى متوازنة') }
  ];
  const game = id => GAMES.find(g => g.id === id) || null;

  /* ---------- plan ---------- */
  // intake = { areas: ['reading', ...], goals: {area: index}, minutes: 10|15|20|30 }
  function buildPlan(intake) {
    const areas = (intake.areas || []).filter(a => AREAS[a]).slice(0, 3);
    if (!areas.length) areas.push('attention');
    const focus = areas.filter(a => a !== 'wellbeing');
    const goals = areas.map(a => ({ area: a, text: AREAS[a].goals[Math.min(AREAS[a].goals.length - 1, (intake.goals || {})[a] || 0)] }));
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const n = i + 1;
      return { n, themes: areas.map(a => ({ area: a, theme: AREAS[a].themes[i] })), games: GAMES.filter(g => (areas.includes(g.area) || g.id === 'breathe') && g.weeks.includes(n)).map(g => g.id) };
    });
    return { areas, focus: focus.length ? focus : areas, goals, minutes: intake.minutes || 15, weeks };
  }
  // today's session: a warm-up, one or two skill games, fitted to the minutes available
  function sessionFor(plan, week, day) {
    const W = plan.weeks[Math.min(WEEKS, Math.max(1, week)) - 1];
    const skills = W.games.filter(id => id !== 'breathe' && id !== 'reframe');
    const calm = W.games.filter(id => id === 'breathe' || id === 'reframe');
    const out = [calm.length ? calm[day % calm.length] : 'breathe'];
    let mins = game(out[0]).mins;
    for (let k = 0; k < skills.length && out.length < 4; k++) {
      const id = skills[(day * 2 + k) % skills.length];
      if (out.includes(id)) continue;
      if (mins + game(id).mins > plan.minutes && out.length >= 2) break;
      out.push(id); mins += game(id).mins;
    }
    if (out.length < 2) out.push(skills[0] || 'breathe');
    return { week: W.n, games: out, minutes: mins };
  }
  // progress: a week opens after 5 sessions in the one before (or 4 once 7 days have passed)
  function progress(sessions, startMs, nowMs) {
    const DAY = 864e5;
    const days = Math.floor((midnight(nowMs) - midnight(startMs)) / DAY);
    let week = 1, inWeek = 0;
    const byWeek = {};
    (sessions || []).forEach(s => { byWeek[s.week] = (byWeek[s.week] || 0) + 1; });
    while (week < WEEKS && ((byWeek[week] || 0) >= PER_WEEK || ((byWeek[week] || 0) >= 4 && days >= week * 7))) week++;
    inWeek = byWeek[week] || 0;
    const today = dateKey(nowMs);
    const doneToday = (sessions || []).some(s => s.date === today);
    const finished = week === WEEKS && inWeek >= PER_WEEK;
    return { week, inWeek, perWeek: PER_WEEK, doneToday, finished, total: (sessions || []).length };
  }
  const pad = n => String(n).padStart(2, '0');
  function dateKey(ms) { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function midnight(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function streak(dates, nowMs) {
    const set = new Set(dates || []);
    let d = new Date(midnight(nowMs));
    if (!set.has(dateKey(d.getTime()))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (set.has(dateKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* ---------- adapting, like a tutor would ---------- */
  function adapt(level, scores) {
    const xs = (scores || []).slice(-3);
    if (xs.length < 2) return level;
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    if (m >= 0.85) return Math.min(3, level + 1);
    if (m < 0.5) return Math.max(1, level - 1);
    return level;
  }
  // weekly consult answers → plan changes + notes
  // ans = { feel: 1..5, helped: gameId, barrier: 'time'|'energy'|'hard'|'easy'|'none', mood: 1..5 }
  function consult(plan, levels, ans) {
    const changes = [], notes = [];
    const lv = Object.assign({}, levels);
    if (ans.barrier === 'hard') { plan.focus.forEach(a => { lv[a] = Math.max(1, (lv[a] || 1) - 1); }); changes.push(B('Exercises will be a little easier next week.', 'ستكون التمارين أسهل قليلاً الأسبوع القادم.')); }
    if (ans.barrier === 'easy') { plan.focus.forEach(a => { lv[a] = Math.min(3, (lv[a] || 1) + 1); }); changes.push(B('Exercises will step up a level next week.', 'سترتفع التمارين مستوى الأسبوع القادم.')); }
    let minutes = plan.minutes;
    if (ans.barrier === 'time' && minutes > 10) { minutes = Math.max(10, minutes - 5); changes.push(B(`Sessions shortened to about ${minutes} minutes.`, `قُصّرت الجلسات إلى نحو ${minutes} دقيقة.`)); }
    if (ans.barrier === 'energy') { changes.push(B('Each session will start with a calm reset, and you can split it in two.', 'ستبدأ كل جلسة باستراحة هادئة، ويمكنك تقسيمها إلى جزأين.')); }
    if (ans.helped && game(ans.helped)) notes.push(B(`What helped most: ${game(ans.helped).name[0]}. Keep using it outside the plan too.`, `أكثر ما ساعد: ${game(ans.helped).name[1]}. استمر في استخدامه خارج الخطة أيضاً.`));
    if (ans.feel >= 4) notes.push(B('You felt this week went well — that confidence is part of the progress.', 'شعرت أن هذا الأسبوع سار جيداً — وهذه الثقة جزء من التقدّم.'));
    if (ans.feel <= 2) notes.push(B('A hard week is normal. Progress in skills is rarely a straight line.', 'الأسبوع الصعب أمر طبيعي. نادراً ما يكون تقدّم المهارات خطاً مستقيماً.'));
    const referral = ans.mood <= 2;
    if (referral) notes.push(B('Your mood has been low. A counsellor can help with that alongside this plan — it’s confidential, and you can book from “Get support”.', 'كان مزاجك منخفضاً. يمكن للمرشد المساعدة في ذلك إلى جانب هذه الخطة — بسرية، ويمكنك الحجز من «احصل على الدعم».'));
    if (!changes.length) changes.push(B('The plan stays as it is — it’s working.', 'تبقى الخطة كما هي — إنها تنجح.'));
    return { levels: lv, minutes, changes, notes, referral };
  }

  /* ---------- points ---------- */
  const xpFor = score => 10 + Math.round(Math.max(0, Math.min(1, score)) * 20);
  const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900];
  function levelOf(xp) { let l = 0; while (l + 1 < LEVELS.length && xp >= LEVELS[l + 1]) l++; return { level: l + 1, from: LEVELS[l], to: LEVELS[l + 1] || LEVELS[l] + 600, xp }; }

  /* ---------- exercise content (seeded, so tests are repeatable) ---------- */
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }
  const shuffle = (xs, r) => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const SYLL = [['campus', 2], ['lecture', 2], ['library', 3], ['deadline', 2], ['professor', 3], ['semester', 3], ['assignment', 3], ['university', 5], ['biology', 4], ['calculator', 4], ['information', 4], ['presentation', 4], ['psychology', 4], ['hypothesis', 4], ['vocabulary', 5], ['experiment', 4], ['laboratory', 5], ['accessibility', 6]];
  function syllables(level, seed) { const r = rng(seed); const pool = SYLL.filter(([, n]) => level === 1 ? n <= 3 : level === 2 ? n <= 4 : true); return shuffle(pool, r).slice(0, 6).map(([w, n]) => ({ word: w, n })); }
  const SPELL = { 1: ['friend', 'because', 'answer', 'thought', 'early'], 2: ['separate', 'necessary', 'definitely', 'different', 'beginning'], 3: ['accommodate', 'conscientious', 'occurrence', 'questionnaire', 'rhythm'] };
  function spelling(level, seed) { return shuffle(SPELL[level] || SPELL[1], rng(seed)).slice(0, 4); }
  function nback(level, len, seed) {
    const n = level >= 3 ? 2 : 1, r = rng(seed), L = 'BCDFGHKLMNPRST'.split('');
    const seq = [];
    for (let i = 0; i < len; i++) {
      if (i >= n && r() < 0.32) seq.push(seq[i - n]);
      else { let c; do { c = L[Math.floor(r() * L.length)]; } while (i >= n && c === seq[i - n]); seq.push(c); }
    }
    return { n, seq, targets: seq.map((c, i) => i >= n && c === seq[i - n]) };
  }
  function nbackScore(targets, pressed) {
    let hits = 0, fa = 0; const T = targets.filter(Boolean).length;
    targets.forEach((t, i) => { if (pressed[i] && t) hits++; else if (pressed[i] && !t) fa++; });
    return T ? Math.max(0, Math.min(1, (hits - fa * 0.5) / T)) : 1;
  }
  function dots(level, seed) {
    const r = rng(seed), max = 6 + level * 3;
    return Array.from({ length: 6 }, () => {
      const want = 3 + Math.floor(r() * (max - 2));
      const pts = [];
      let tries = 0; while (pts.length < want && tries++ < 5000) { const p = [0.08 + r() * 0.84, 0.08 + r() * 0.84]; if (pts.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.12)) pts.push(p); }
      const n = pts.length;
      const opts = shuffle([n, n - 1, n + 1, n + 2].filter(x => x > 0), r).slice(0, 4);
      if (!opts.includes(n)) opts[0] = n;
      return { n, pts, opts };
    });
  }
  function numberline(level, seed) {
    const r = rng(seed), max = level === 1 ? 100 : level === 2 ? 1000 : 1;
    return Array.from({ length: 5 }, () => level === 3 ? { min: 0, max: 1, target: [0.25, 0.5, 0.75, 0.1, 0.2, 0.6, 0.4, 0.9][Math.floor(r() * 8)], frac: true } : { min: 0, max, target: Math.round((0.05 + r() * 0.9) * max) });
  }
  const lineScore = (t, v) => Math.max(0, 1 - Math.abs(v - t.target) / (t.max - t.min) * 5);
  const SENT = {
    1: [B('I read the notes after class', 'قرأت الملاحظات بعد الدرس'), B('The exam starts at nine', 'يبدأ الامتحان في التاسعة'), B('She asked a good question', 'طرحت سؤالاً جيداً')],
    2: [B('Before the lecture I skim the slides', 'قبل المحاضرة أتصفح الشرائح'), B('Short breaks help me focus for longer', 'تساعدني الاستراحات القصيرة على التركيز لفترة أطول'), B('Our group shared the reading list', 'تشاركت مجموعتنا قائمة القراءة')],
    3: [B('Although the topic was difficult the examples made it clear', 'رغم صعوبة الموضوع جعلته الأمثلة واضحاً'), B('Students who test themselves remember more than those who reread', 'الطلبة الذين يختبرون أنفسهم يتذكرون أكثر ممن يعيدون القراءة')]
  };
  function sentences(level, lang, seed) { const L = lang === 'ar' ? 1 : 0, r = rng(seed); return shuffle(SENT[level] || SENT[1], r).slice(0, 3).map(s => { const words = s[L].split(' '); return { words, mixed: shuffle(words, r) }; }); }
  const SHAPES = ['circle', 'square', 'star', 'triangle'], COLORS = [['red', 'الأحمر', '#e5484d'], ['blue', 'الأزرق', '#2a78d6'], ['green', 'الأخضر', '#1baf7a'], ['yellow', 'الأصفر', '#eda100']];
  const SHAPE_AR = { circle: 'الدائرة', square: 'المربع', star: 'النجمة', triangle: 'المثلث' };
  function instructions(level, seed) {
    const r = rng(seed), steps = level + 1;
    return Array.from({ length: 4 }, () => {
      const grid = shuffle(SHAPES.flatMap(s => COLORS.map(c => ({ shape: s, color: c[0], ar: c[1], hex: c[2] }))), r).slice(0, 8);
      const order = shuffle(grid.map((_, i) => i), r).slice(0, steps);
      const say = order.map(i => grid[i]);
      return { grid, order, en: 'Tap ' + say.map(g => `the ${g.color} ${g.shape}`).join(', then ') + '.', ar: 'انقر ' + say.map(g => `${SHAPE_AR[g.shape]} ${g.ar === 'الأحمر' ? 'الحمراء' : g.ar === 'الأزرق' ? 'الزرقاء' : g.ar === 'الأخضر' ? 'الخضراء' : 'الصفراء'}`).join(' ثم ') + '.' };
    });
  }
  const REFRAMES = [
    { thought: B('I’m just stupid at this.', 'أنا غبي في هذا ببساطة.'), opts: [B('This is hard for me right now, and I can learn ways around it.', 'هذا صعب علي الآن، ويمكنني تعلّم طرق للتعامل معه.'), B('Everyone else finds it easy.', 'الجميع يجده سهلاً.'), B('I should give up.', 'يجب أن أستسلم.')], ok: 0 },
    { thought: B('If I don’t get an A, I’ve failed.', 'إن لم أحصل على امتياز فقد فشلت.'), opts: [B('Only perfect counts.', 'الكمال وحده يُحتسب.'), B('A B is a solid result, and I’ll learn from the feedback.', 'جيد جداً نتيجة جيدة، وسأتعلم من الملاحظات.'), B('I’ll never be good enough.', 'لن أكون جيداً بما يكفي أبداً.')], ok: 1 },
    { thought: B('I can’t start until I feel ready.', 'لا أستطيع البدء حتى أشعر بالاستعداد.'), opts: [B('Waiting will make it easier.', 'الانتظار سيجعله أسهل.'), B('I’ll do it all tonight.', 'سأنجزه كله الليلة.'), B('Starting small makes me feel ready.', 'البدء بخطوة صغيرة يجعلني مستعداً.')], ok: 2 },
    { thought: B('Asking for help means I’m weak.', 'طلب المساعدة يعني أنني ضعيف.'), opts: [B('Strong students use support — that’s why it exists.', 'الطلبة الأقوياء يستخدمون الدعم — لهذا وُجد.'), B('I should manage alone.', 'يجب أن أتدبر أمري وحدي.'), B('Nobody else asks.', 'لا أحد غيري يسأل.')], ok: 0 }
  ];
  function reframes(seed) { return shuffle(REFRAMES, rng(seed)).slice(0, 3); }
  const PASSAGES = {
    en: [{ text: 'Sleep is when the brain sorts and stores what you learned during the day. Students who sleep well before an exam usually remember more than students who stay up late revising. A short walk or a few minutes of exercise can also help you focus for the next hour.', qs: [{ q: 'When does the brain store what you learned?', opts: ['During sleep', 'During exams', 'While walking'], ok: 0 }, { q: 'What can help you focus for the next hour?', opts: ['Staying up late', 'A short walk', 'Skipping meals'], ok: 1 }] },
      { text: 'Testing yourself is one of the best ways to learn. When you try to recall an answer, your memory gets stronger each time. Re-reading feels productive, but it is much less effective. Flashcards and past papers turn revision into practice.', qs: [{ q: 'What makes memory stronger?', opts: ['Re-reading', 'Trying to recall', 'Highlighting'], ok: 1 }, { q: 'Which tools turn revision into practice?', opts: ['Flashcards and past papers', 'Coloured pens', 'Long notes'], ok: 0 }] }],
    ar: [{ text: 'النوم هو الوقت الذي يرتّب فيه الدماغ ما تعلمته خلال اليوم ويخزّنه. الطلبة الذين ينامون جيداً قبل الامتحان يتذكرون عادةً أكثر من الذين يسهرون للمراجعة. ويمكن لنزهة قصيرة أو دقائق من الرياضة أن تساعدك على التركيز في الساعة التالية.', qs: [{ q: 'متى يخزّن الدماغ ما تعلمته؟', opts: ['أثناء النوم', 'أثناء الامتحانات', 'أثناء المشي'], ok: 0 }, { q: 'ما الذي يساعدك على التركيز في الساعة التالية؟', opts: ['السهر', 'نزهة قصيرة', 'تخطي الوجبات'], ok: 1 }] }]
  };
  function passage(lang, seed) { const P = PASSAGES[lang === 'ar' ? 'ar' : 'en']; return P[(seed >>> 0) % P.length]; }

  return { WEEKS, PER_WEEK, AREAS, GAMES, game, buildPlan, sessionFor, progress, streak, dateKey, adapt, consult, xpFor, levelOf, rng, syllables, spelling, nback, nbackScore, dots, numberline, lineScore, sentences, instructions, reframes, passage };
});
