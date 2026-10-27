/* ERLY Check-ins — scoring engine (pure, unit-tested).

   Each of the ten matrix domains has a short interactive activity modelled on
   a well-known screening task (lexical decision, visual crowding, listening
   in quiet vs noise, digit span, dot comparison, Trail Making A/B, go/no-go,
   a continuous-performance task, copy vs free writing, a course-site search,
   untimed vs timed quiz items, and two self-report scales).

   How a result is reached, so it stays careful:
   1. every metric is compared with a REFERENCE range (z-score, direction-aware);
      the ranges below are demo placeholders based on typical adult values and
      must be replaced with locally validated norms before real use;
   2. a run can be marked not valid (too many anticipations, lots of time away
      from the task, unfinished) — it then says nothing;
   3. a domain is "notable" only when TWO OR MORE of its measures agree, and
      "worth a look" when one does — one bad trial or one metric never is;
   4. a possible explanation to explore with SAS needs converging domains, and
      gets more weight when it repeats on a second run or matches the
      student's own 28-day tracking. Ordinary explanations are always listed.
   Results are screening indications, never a diagnosis and never a
   probability. Only a qualified assessment at SAS can confirm anything. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_CHECKS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // metric: [reference mean, reference sd, dir (+1 = higher means more friction), en label, ar label, unit]
  const REF = {
    V: { ldAcc: [0.92, 0.05, -1, 'Real-word accuracy', 'دقة تمييز الكلمات', '%'], ldRT: [780, 170, 1, 'Word decision time', 'زمن قرار الكلمة', 'ms'], crowdCost: [0.06, 0.08, 1, 'Crowding cost (spaced vs crowded letters)', 'أثر الازدحام (حروف متباعدة مقابل متزاحمة)', '%'] },
    U: { quietAcc: [0.92, 0.1, -1, 'Listening accuracy (quiet)', 'دقة الاستماع (هدوء)', '%'], noiseCost: [0.1, 0.14, 1, 'Drop with background noise', 'الانخفاض مع الضوضاء', '%'], replays: [0.6, 0.9, 1, 'Replays needed', 'مرات الإعادة', ''] },
    M: { fwdSpan: [6.6, 1.1, -1, 'Digits forward', 'الأرقام للأمام', ''], bwdSpan: [5.0, 1.2, -1, 'Digits backward', 'الأرقام للخلف', ''], dotAcc: [0.86, 0.07, -1, 'Quantity comparison', 'مقارنة الكميات', '%'] },
    E: { trailRatio: [2.1, 0.6, 1, 'Switching cost (Trail B ÷ A)', 'كلفة التبديل (المسار ب ÷ أ)', '×'], trailErr: [0.6, 0.9, 1, 'Switching errors', 'أخطاء التبديل', ''], commission: [0.1, 0.08, 1, 'Responses you meant to hold back', 'استجابات كان يجب كبحها', '%'], rtCV: [0.2, 0.06, 1, 'Response-time variability', 'تذبذب زمن الاستجابة', ''] },
    P: { hitDrop: [0.03, 0.07, 1, 'Accuracy drop, start → end', 'انخفاض الدقة من البداية للنهاية', '%'], rtSlow: [0.04, 0.08, 1, 'Slowing, start → end', 'التباطؤ من البداية للنهاية', '%'], fatigueRise: [0.8, 1.0, 1, 'Tiredness rise (self-rated)', 'زيادة التعب (تقدير ذاتي)', ''] },
    O: { copyWpm: [30, 8, -1, 'Copying speed', 'سرعة النسخ', 'wpm'], composeWpm: [14, 5, -1, 'Writing speed (own words)', 'سرعة الكتابة (بكلماتك)', 'wpm'], startLatency: [12, 10, 1, 'Time to start writing', 'الوقت لبدء الكتابة', 's'], longPauses: [6, 4, 1, 'Long pauses per 100 words', 'التوقفات الطويلة لكل ١٠٠ كلمة', ''], deleteRatio: [0.12, 0.07, 1, 'Deleting while writing', 'نسبة الحذف أثناء الكتابة', '%'] },
    N: { findTime: [16, 7, 1, 'Time to find each item', 'الوقت لإيجاد كل عنصر', 's'], wrongClicks: [1.0, 1.1, 1, 'Wrong turns per item', 'المنعطفات الخاطئة لكل عنصر', ''] },
    Q: { untimedAcc: [0.85, 0.12, -1, 'Accuracy without a timer', 'الدقة بلا مؤقت', '%'], timedDrop: [0.08, 0.13, 1, 'Drop under time pressure', 'الانخفاض تحت ضغط الوقت', '%'], changes: [1.0, 1.2, 1, 'Answer changes', 'تغيير الإجابات', ''], anxiety: [2.6, 1.0, 1, 'Worry before the quiz (self-rated)', 'القلق قبل الاختبار (تقدير ذاتي)', '/5'] },
    C: { comfort: [3.4, 0.8, -1, 'Comfort in everyday class situations', 'الارتياح في مواقف الصف اليومية', '/5'], avoid: [1.0, 1.1, 1, 'Situations you would avoid', 'مواقف قد تتجنبها', ''] },
    H: {}
  };
  const DOMAINS = ['V', 'U', 'M', 'E', 'P', 'O', 'N', 'Q', 'H', 'C'];
  const SUPPORT_ONLY = ['H'];

  const z = (x, [m, sd, dir]) => (typeof x === 'number' && isFinite(x) ? dir * (x - m) / sd : null);
  const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

  // Score one activity run. validity: { anticipations, trials, awayMs, durationMs, complete, unavailable }
  function scoreRun(domain, metrics, validity) {
    const ref = REF[domain] || {};
    const v = validity || {};
    const notes = [];
    let valid = v.complete !== false;
    if (v.complete === false) notes.push('unfinished');
    if (v.trials && v.anticipations / v.trials > 0.2) { valid = false; notes.push('many-anticipations'); }
    if (v.durationMs && v.awayMs / v.durationMs > 0.25) { valid = false; notes.push('away-from-task'); }
    if (v.random) { valid = false; notes.push('random-responding'); } // e.g. chance-level accuracy at very fast speed, or pressing for everything
    const rows = Object.keys(ref).map(k => {
      const zz = z(metrics[k], ref[k]);
      return { key: k, value: metrics[k], z: zz == null ? null : round(zz), en: ref[k][3], ar: ref[k][4], unit: ref[k][5], mean: ref[k][0], sd: ref[k][1], dir: ref[k][2], flag: zz != null && zz >= 1.5, watch: zz != null && zz >= 1 && zz < 1.5, unavailable: zz == null };
    });
    const measured = rows.filter(r => !r.unavailable);
    const flags = rows.filter(r => r.flag).length, watches = rows.filter(r => r.watch).length;
    let band;
    if (SUPPORT_ONLY.includes(domain)) band = 'support';
    else if (!valid) band = 'invalid';
    else if (!measured.length) band = 'unavailable';
    else if (flags >= 2) band = 'notable';
    else if (flags + watches >= 1 && (flags >= 1 || watches >= 2)) band = 'watch';
    else band = 'typical';
    const zs = measured.map(r => Math.max(0, r.z));
    return { domain, band, valid, notes, rows, index: zs.length ? round(zs.reduce((a, b) => a + b, 0) / zs.length) : null, at: new Date().toISOString() };
  }

  const RANK = { notable: 3, watch: 2, typical: 1, invalid: 0, unavailable: 0, support: 0 };
  // Latest valid run, plus whether an earlier valid run agreed
  function domainStatus(history) {
    const runs = (history || []).filter(r => r.valid);
    if (!runs.length) return history && history.length ? { band: history[history.length - 1].band, runs: 0, repeated: false, latest: history[history.length - 1] } : { band: 'not-done', runs: 0, repeated: false, latest: null };
    const latest = runs[runs.length - 1], prev = runs[runs.length - 2];
    return { band: latest.band, runs: runs.length, repeated: !!prev && RANK[prev.band] >= 2 && RANK[latest.band] >= 2, latest };
  }
  const flagged = (st, k) => st[k] && (st[k].band === 'notable' || st[k].band === 'watch');
  const strong = (st, k) => st[k] && st[k].band === 'notable';
  const row = (st, k, key) => st[k] && st[k].latest && st[k].latest.valid && st[k].latest.rows.find(r => r.key === key);
  const rowFlag = (st, k, key) => { const r = row(st, k, key); return !!(r && r.z != null && r.z >= 1.5); };

  // What might be worth exploring with SAS. Each needs converging evidence.
  // tracking = { areas: ['reading','executive','strain'], available: bool } from the 28-day tracker
  const EXPLORE = [
    {
      id: 'reading', area: 'reading', en: 'A specific learning difference in reading (such as dyslexia)', ar: 'اختلاف تعلّم محدد في القراءة (مثل عسر القراءة)',
      test: st => strong(st, 'V') || (flagged(st, 'V') && (flagged(st, 'M') || flagged(st, 'U'))),
      domains: ['V', 'M', 'U'],
      assess: ['Psycho-educational assessment: word reading, decoding, phonological processing and rapid naming — in Arabic and English', 'A vision check to rule out an eyesight cause'],
      assessAr: ['تقييم نفسي تربوي: قراءة الكلمات وفك الرموز والمعالجة الصوتية والتسمية السريعة — بالعربية والإنجليزية', 'فحص النظر لاستبعاد سبب بصري']
    },
    {
      id: 'visual', area: 'reading', en: 'Visual comfort when reading (a vision check, possibly visual stress)', ar: 'الراحة البصرية أثناء القراءة (فحص النظر، وربما الإجهاد البصري)',
      test: st => rowFlag(st, 'V', 'crowdCost') && !rowFlag(st, 'V', 'ldAcc'),
      domains: ['V'],
      assess: ['An eye test with an optometrist, including near vision and binocular vision'], assessAr: ['فحص عيون لدى أخصائي البصريات يشمل الرؤية القريبة والرؤية بالعينين']
    },
    {
      id: 'numbers', area: 'executive', en: 'A specific learning difference with numbers (such as dyscalculia)', ar: 'اختلاف تعلّم محدد في الأرقام (مثل عسر الحساب)',
      test: st => rowFlag(st, 'M', 'dotAcc') && (flagged(st, 'Q') || rowFlag(st, 'M', 'bwdSpan')),
      domains: ['M', 'Q'],
      assess: ['A maths-skills assessment: number sense, calculation fluency and maths reasoning'], assessAr: ['تقييم مهارات الرياضيات: الحس العددي وطلاقة الحساب والاستدلال الرياضي']
    },
    {
      id: 'attention', area: 'executive', en: 'Attention and executive function (such as ADHD)', ar: 'الانتباه والوظائف التنفيذية (مثل اضطراب فرط الحركة وتشتت الانتباه)',
      test: st => (strong(st, 'E') && (flagged(st, 'P') || flagged(st, 'M') || flagged(st, 'N'))) || (flagged(st, 'E') && flagged(st, 'P') && flagged(st, 'N')),
      domains: ['E', 'P', 'M', 'N'],
      assess: ['An adult ADHD assessment: clinical interview, validated rating scales and developmental history', 'Screening for sleep, mood and anxiety, which can look similar'],
      assessAr: ['تقييم فرط الحركة وتشتت الانتباه لدى البالغين: مقابلة سريرية ومقاييس معتمدة وتاريخ نمائي', 'فحص النوم والمزاج والقلق، لأنها قد تبدو متشابهة']
    },
    {
      id: 'auditory', area: 'reading', en: 'Listening in noise (an auditory-processing question — and a hearing check)', ar: 'الاستماع وسط الضوضاء (سؤال حول المعالجة السمعية — مع فحص للسمع)',
      test: st => rowFlag(st, 'U', 'noiseCost') || strong(st, 'U'),
      domains: ['U'],
      assess: ['A hearing test (audiology) first', 'If hearing is fine: an auditory-processing assessment'], assessAr: ['فحص السمع أولاً', 'إن كان السمع سليماً: تقييم للمعالجة السمعية']
    },
    {
      id: 'writing', area: 'executive', en: 'Getting ideas into writing (such as dysgraphia or a written-expression difficulty)', ar: 'تحويل الأفكار إلى كتابة (مثل عسر الكتابة أو صعوبة التعبير الكتابي)',
      test: st => strong(st, 'O') || (rowFlag(st, 'O', 'copyWpm') && flagged(st, 'O')),
      domains: ['O'],
      assess: ['A writing assessment: transcription speed, spelling and written expression; occupational therapy if handwriting is affected'], assessAr: ['تقييم للكتابة: سرعة النسخ والإملاء والتعبير الكتابي؛ وعلاج وظيفي إن تأثر خط اليد']
    },
    {
      id: 'testanxiety', area: 'strain', en: 'Test anxiety or time-pressure stress', ar: 'قلق الاختبار أو توتر ضغط الوقت',
      test: st => rowFlag(st, 'Q', 'timedDrop') && (rowFlag(st, 'Q', 'anxiety') || rowFlag(st, 'Q', 'changes')),
      domains: ['Q'],
      assess: ['A conversation with the SAS wellbeing / counselling team; exam strategies and possible exam arrangements'], assessAr: ['حديث مع فريق الرفاه والإرشاد في خدمات الطلبة؛ استراتيجيات للاختبارات وترتيبات ممكنة']
    },
    {
      id: 'stamina', area: 'strain', en: 'Mental stamina (sleep, health, mood or attention can all play a part)', ar: 'القدرة على التحمّل الذهني (النوم والصحة والمزاج والانتباه قد تؤثر جميعها)',
      test: st => strong(st, 'P') || (flagged(st, 'P') && rowFlag(st, 'P', 'fatigueRise')),
      domains: ['P'],
      assess: ['A check-in about sleep, health and wellbeing; if attention is also flagged, an attention assessment'], assessAr: ['حديث عن النوم والصحة والرفاه؛ وإن ظهر الانتباه أيضاً، تقييم للانتباه']
    },
    {
      id: 'social', area: 'strain', en: 'Confidence with communication and group work (often anxiety-related)', ar: 'الثقة في التواصل والعمل الجماعي (غالباً ما يرتبط بالقلق)',
      test: st => strong(st, 'C') || (flagged(st, 'C') && rowFlag(st, 'C', 'avoid')),
      domains: ['C'],
      assess: ['A conversation with SAS wellbeing; if communication has always felt different for you, ask whether a broader assessment would help'], assessAr: ['حديث مع فريق الرفاه؛ وإن شعرت دائماً أن التواصل مختلف لديك، اسأل إن كان تقييم أشمل سيفيد']
    }
  ];
  const ORDINARY = [
    ['Tiredness, poor sleep or illness on the day', 'التعب أو قلة النوم أو المرض في ذلك اليوم'],
    ['Reading or listening in your second language', 'القراءة أو الاستماع بلغتك الثانية'],
    ['A small screen, a noisy room or a slow device', 'شاشة صغيرة أو غرفة صاخبة أو جهاز بطيء'],
    ['Stress, worry or low mood', 'التوتر أو القلق أو انخفاض المزاج'],
    ['Never having done tasks like these before', 'عدم تجربة مهام كهذه من قبل']
  ];

  // statuses: { V: domainStatus(...), ... }
  function synthesize(statuses, tracking) {
    tracking = tracking || { available: false, areas: [] };
    const done = DOMAINS.filter(k => !SUPPORT_ONLY.includes(k) && statuses[k] && statuses[k].runs > 0);
    const out = [];
    EXPLORE.forEach(x => {
      if (!x.test(statuses)) return;
      const doms = x.domains.filter(k => flagged(statuses, k));
      const repeated = doms.some(k => statuses[k].repeated);
      const agrees = tracking.available && tracking.areas.includes(x.area);
      const strongN = doms.filter(k => strong(statuses, k)).length;
      // evidence wording, never a probability
      const points = strongN + (doms.length > 1 ? 1 : 0) + (repeated ? 1 : 0) + (agrees ? 1 : 0);
      const level = points >= 3 ? 'stronger' : points >= 2 ? 'moderate' : 'early';
      out.push({ id: x.id, en: x.en, ar: x.ar, area: x.area, domains: doms, repeated, agreesWithTracking: agrees, trackingAvailable: !!tracking.available, level, assess: x.assess, assessAr: x.assessAr });
    });
    const order = { stronger: 0, moderate: 1, early: 2 };
    out.sort((a, b) => order[a.level] - order[b.level]);
    return { completed: done.length, total: DOMAINS.length - SUPPORT_ONLY.length, explore: out, ordinary: ORDINARY, enough: done.length >= 4 };
  }

  /* ---------- helpers used by the activities (also tested) ---------- */
  function median(xs) { const a = xs.filter(x => isFinite(x)).slice().sort((p, q) => p - q); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function cv(xs) { const a = xs.filter(x => isFinite(x)); if (a.length < 3) return null; const m = a.reduce((p, q) => p + q, 0) / a.length; const sd = Math.sqrt(a.reduce((p, q) => p + (q - m) ** 2, 0) / (a.length - 1)); return round(sd / m, 3); }
  function levenshtein(a, b) {
    a = String(a); b = String(b);
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  // digit span: longest length with at least one correct trial
  function span(trials) { let best = 0; trials.forEach(t => { if (t.correct) best = Math.max(best, t.len); }); return best; }
  // vigilance: compare first and last thirds of a continuous-performance run
  function vigilance(trials) {
    const n = trials.length, third = Math.max(1, Math.floor(n / 3));
    const part = arr => { const tg = arr.filter(t => t.target); const hits = tg.filter(t => t.hit); return { hit: tg.length ? hits.length / tg.length : null, rt: median(hits.map(t => t.rt)) }; };
    const a = part(trials.slice(0, third)), b = part(trials.slice(n - third));
    return { hitDrop: a.hit != null && b.hit != null ? round(a.hit - b.hit, 3) : null, rtSlow: a.rt && b.rt ? round((b.rt - a.rt) / a.rt, 3) : null };
  }
  return { REF, DOMAINS, EXPLORE, ORDINARY, scoreRun, domainStatus, synthesize, median, cv, levenshtein, span, vigilance };
});
