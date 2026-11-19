/* ERLY — the 100-point cognitive telemetry matrix.
   Ten domains × ten indicators, all metadata (events, counts, timestamps),
   never content. Every view — tracker, insight, Evidence Pack, counselor —
   reads this one list. Fields:
     id, cat (domain key), area — which friction profile the indicator feeds:
       reading   → Profile A, visual decoder
       executive → Profile B, executive struggler
       strain    → Profile C, acquired strain
       support   → coping & help-seeking: personalises support, never flags
       control   → confounders that normalise other signals, never flag
     en / ar (name), how (what is counted), tag (what it may reflect),
     live: measured for real by the Reading Studio in this demo,
     dir: +1 when a higher value means more friction than the student's normal. */
(function () {
  const AREA_COLOR = { reading: 'var(--c-R)', executive: 'var(--c-L)', strain: 'var(--c-W)', support: 'var(--muted)', control: 'var(--muted)' };
  const CATS = {
    V: { en: 'Visual & reading friction', ar: 'الاحتكاك البصري والقرائي', icon: 'eye', area: 'reading' },
    U: { en: 'Auditory & video processing', ar: 'المعالجة السمعية والمرئية', icon: 'headphones', area: 'reading' },
    M: { en: 'Working memory & comprehension', ar: 'الذاكرة العاملة والفهم', icon: 'brain', area: 'executive' },
    E: { en: 'Executive function & starting', ar: 'الوظائف التنفيذية وبدء المهام', icon: 'rocket', area: 'executive' },
    P: { en: 'Endurance & pacing', ar: 'التحمّل والإيقاع', icon: 'clock', area: 'strain' },
    O: { en: 'Output & drafting', ar: 'المخرجات والصياغة', icon: 'pen', area: 'executive' },
    N: { en: 'Navigation & orientation', ar: 'التنقّل والتوجّه', icon: 'compass', area: 'executive' },
    Q: { en: 'Assessment & quizzes', ar: 'التقييمات والاختبارات', icon: 'target', area: 'strain' },
    H: { en: 'Help-seeking & coping', ar: 'طلب المساعدة والتكيّف', icon: 'hand', area: 'support' },
    C: { en: 'Collaboration & communication', ar: 'التعاون والتواصل', icon: 'users', area: 'strain' }
  };
  Object.values(CATS).forEach(c => { c.color = AREA_COLOR[c.area]; });

  // [en, ar, how, tag, area, live]
  const D = {
    V: [
      ['Scroll regression frequency', 'تكرار الرجوع بالتمرير', 'Upward scroll reversions within the same page section per session — re-reading, losing place', 'visual tracking', 'reading', 1],
      ['Zoom magnification reliance', 'الاعتماد على التكبير', 'Sustained reading above 150% zoom or a raised text size', 'visual processing', 'reading', 1],
      ['Pan-to-scroll ratio', 'نسبة السحب الأفقي إلى التمرير', 'Horizontal pan share versus vertical scroll on PDFs and slides', 'visual tracking', 'reading', 0],
      ['Line-pointer tracking', 'تتبّع الأسطر بالمؤشر', 'Using the cursor or a line-focus band to trace lines while reading', 'visual tracking', 'reading', 1],
      ['Complexity-normalised pace', 'الوتيرة المعدّلة حسب التعقيد', 'Dwell on a paragraph versus what its length and density predict', 'decoding', 'reading', 1],
      ['Same-passage re-visit', 'العودة إلى المقطع نفسه', 'Returning to the identical section in a later session', 'comprehension', 'reading', 1],
      ['Simplified-reader adoption', 'اعتماد وضع القراءة المبسّط', 'Switching to a reading-friendly font, tint or layout mid-document', 'coping', 'reading', 1],
      ['Read-aloud trigger latency', 'سرعة اللجوء للقراءة الصوتية', 'Seconds from opening a dense page to starting read-aloud', 'decoding', 'reading', 1],
      ['Abandonment-point concentration', 'تركّز نقاط التوقّف', 'Sessions repeatedly ending at the same section', 'endurance', 'reading', 1],
      ['Print / export fallback', 'اللجوء للطباعة أو التصدير', 'Printing or exporting instead of reading on screen', 'coping', 'reading', 0]
    ],
    U: [
      ['Micro-scrub density', 'كثافة الإرجاع القصير', 'Backward seeks of 5 s or less per minute of lecture video', 'auditory processing', 'reading', 0],
      ['Replay loop count', 'تكرار إعادة التشغيل', 'The same short clip or paragraph played 3+ times in a row', 'auditory processing', 'reading', 1],
      ['Playback-rate oscillation', 'تذبذب سرعة التشغيل', 'Frequent speed changes inside one listening session', 'regulation', 'executive', 1],
      ['Density pause clusters', 'تجمّع التوقفات عند الكثافة', 'Pause bursts at high-information moments of a video', 'auditory processing', 'reading', 0],
      ['Transcript-toggle reliance', 'الاعتماد على تبديل النص المكتوب', 'Opening and closing the transcript while audio plays', 'dual coding', 'reading', 0],
      ['Audio-only preference', 'تفضيل الصوت فقط', 'Audio versus text consumption when both exist', 'modality', 'reading', 1],
      ['Read-aloud sync drift', 'انحراف التزامن مع القراءة الصوتية', 'Gap between the voice position and where the student scrolls', 'tracking', 'reading', 0],
      ['Restart-from-zero rate', 'معدل البدء من الصفر', 'Abandoning a video mid-way and restarting from the beginning', 'working memory', 'executive', 0],
      ['Caption-enable latency', 'سرعة تفعيل الترجمة المرئية', 'Seconds from video start to captions on', 'auditory processing', 'reading', 0],
      ['Short-clip bias', 'تفضيل المقاطع القصيرة', 'Preferring sub-5-minute segments over full lectures', 'endurance', 'strain', 0]
    ],
    M: [
      ['Prompt–draft pendulum', 'التأرجح بين التعليمات والمسودة', 'Alternating between the instructions and the editor view', 'working memory', 'executive', 0],
      ['Resource-bridging loops', 'حلقات الربط بين المصادر', 'Cycling between slides and the task page', 'working memory', 'executive', 0],
      ['Term re-query recurrence', 'تكرار البحث عن المصطلح نفسه', 'The same glossary or course-search lookup repeated within minutes', 'working memory', 'executive', 1],
      ['Rapid re-open cycles', 'دورات إعادة الفتح السريعة', 'Closing and re-opening the same resource within two minutes', 'working memory', 'executive', 0],
      ['Breadcrumb re-trace', 'تتبّع المسار للخلف', 'Navigating back through the module to re-find just-visited material', 'working memory', 'executive', 0],
      ['Anchor over-creation', 'الإكثار من الإشارات المرجعية', 'Many bookmarks or anchors created in one session', 'compensation', 'executive', 0],
      ['Selection-abandon rate', 'معدل التحديد ثم الترك', 'Text selected then deselected with no follow-up action', 'working memory', 'executive', 1],
      ['Step-repeat errors', 'أخطاء تكرار الخطوات', 'Re-doing an already completed LMS step', 'working memory', 'executive', 0],
      ['Context re-establishment time', 'وقت استعادة السياق', 'Seconds from session resume to the first on-task action', 'working memory', 'executive', 1],
      ['Open-loop count', 'عدد المهام المفتوحة', 'Tasks started but left unsubmitted across days', 'working memory', 'executive', 0]
    ],
    E: [
      ['Blank-canvas dwell', 'البقاء أمام صفحة فارغة', 'Editor focused with no interaction events for minutes, then exit — silence, never strokes', 'initiation', 'executive', 0],
      ['Approach–avoidance cycles', 'دورات الاقتراب والتجنّب', 'Opening the assignment and leaving within 60 s, 3+ times a day', 'initiation', 'executive', 0],
      ['Submission abandonment', 'التراجع عن التسليم', 'A posted answer deleted by its author shortly after — the “Forum Ghost”', 'regulation', 'executive', 0],
      ['Stall-save pattern', 'الحفظ دون تقدّم', 'Repeated draft saves with almost no edit events between them', 'initiation', 'executive', 0],
      ['Funnel drop-off point', 'نقطة الانقطاع في التسليم', 'The submit stage where sessions repeatedly end', 'execution', 'executive', 0],
      ['Confirm-step abort', 'الإلغاء عند التأكيد', 'Starting a submission then aborting at the final confirm', 'regulation', 'executive', 0],
      ['Task-sequencing scatter', 'تشتّت ترتيب المهام', 'Many short bursts across assignments instead of finishing one', 'executive', 'executive', 0],
      ['Over-preparation loop', 'حلقة الإفراط في التحضير', 'Re-opening the same material many times before any work event', 'initiation', 'executive', 0],
      ['Initiation latency vs. baseline', 'تأخّر البدء مقارنةً بالمعدل', 'Days from assignment release to first interaction, against your own norm', 'initiation', 'executive', 0],
      ['Micro-intention bursts', 'نوبات البدء القصيرة', 'Several sub-3-minute bursts on the same task in one evening', 'initiation', 'executive', 0]
    ],
    P: [
      ['Cognitive endurance curve', 'منحنى التحمّل الذهني', 'Within-session decay of interaction quality — the fatigue-wall minute', 'endurance', 'strain', 1],
      ['Session-length contraction', 'تقلّص مدة الجلسة', 'Effective session length shrinking across weeks', 'endurance', 'strain', 0],
      ['Deadline compression index', 'مؤشر الضغط قبل الموعد', 'Share of task work squeezed into the final hours — the “11th-hour spike”', 'executive', 'executive', 0],
      ['Circadian drift', 'انجراف الساعة البيولوجية', 'Productive time shifting toward late night versus your own baseline', 'regulation', 'strain', 0],
      ['Post-break recovery slope', 'منحنى التعافي بعد الاستراحة', 'Interaction quality after a self-initiated short break', 'regulation', 'strain', 1],
      ['Rhythm volatility', 'تقلّب الإيقاع', 'Week-over-week instability of the engagement pattern', 'regulation', 'strain', 0],
      ['Ramp-up time', 'وقت الإحماء', 'Minutes from session start to the first sustained block', 'initiation', 'executive', 1],
      ['Sustained-block scarcity', 'ندرة فترات التركيز الطويلة', 'How rarely 20-minute-plus continuous on-task blocks happen', 'endurance', 'strain', 0],
      ['Concurrent-load index', 'مؤشر تزامن الأعباء', 'Overlapping deadlines in a friction window — normalises other signals, never flags', 'control', 'control', 0],
      ['Calendar-alignment check', 'التحقق من التقويم الأكاديمي', 'Whether spikes coincide with assessment weeks — separates exam stress from persistent barriers', 'control', 'control', 0]
    ],
    O: [
      ['Version churn', 'كثرة نسخ المسودة', 'Draft versions and saves per final submission', 'regulation', 'executive', 0],
      ['Attachment vs. composition', 'الإرفاق مقابل الكتابة المباشرة', 'Submitting files versus writing in the editor', 'modality', 'executive', 0],
      ['Length-trajectory collapse', 'انهيار طول المسودة', 'Draft length metadata shrinking sharply near submission', 'regulation', 'strain', 0],
      ['Commit hesitation', 'التردّد قبل الإرسال', 'Gap between the last edit and the submit click', 'regulation', 'executive', 0],
      ['Submit–withdraw–resubmit cycles', 'دورات التسليم والسحب', 'Resubmitting after withdrawing', 'regulation', 'executive', 0],
      ['Scaffold reliance', 'الاعتماد على القوالب', 'Using provided templates or outlines versus blank starts', 'support', 'executive', 0],
      ['Assistive-drafting adoption', 'اعتماد أدوات الصياغة المساعدة', 'Summariser or outline-tool use before drafting', 'coping', 'executive', 1],
      ['Output-modality switching', 'تبديل صيغة المخرجات', 'Changing submission format across attempts', 'modality', 'executive', 0],
      ['Repost-after-delete frequency', 'إعادة النشر بعد الحذف', 'Republishing after a deletion versus going silent', 'regulation', 'strain', 0],
      ['Feedback-opening latency', 'تأخّر فتح الملاحظات', 'Time from grade or feedback release to first open', 'avoidance', 'strain', 0]
    ],
    N: [
      ['Back-button reliance', 'الاعتماد على زر الرجوع', 'Navigation share via back button versus structured menus', 'orientation', 'executive', 0],
      ['Path inefficiency', 'عدم كفاءة المسار', 'Steps taken versus the shortest path to the same resource', 'orientation', 'executive', 0],
      ['Course-search loops', 'حلقات البحث في المقرر', 'Repeated searches with short result dwell', 'orientation', 'executive', 0],
      ['Dead-end rate', 'معدل الطرق المسدودة', 'Opening irrelevant pages and returning immediately', 'orientation', 'executive', 0],
      ['Menu-hover hesitation', 'التردّد عند القوائم', 'Time spent in course menus before choosing', 'executive', 'executive', 0],
      ['Cross-course slip', 'الخلط بين المقررات', 'Opening the wrong course’s material then correcting', 'attention', 'executive', 0],
      ['Announcement re-checks', 'تكرار تفقّد الإعلانات', 'Repeated visits to the announcements page', 'anxiety', 'strain', 0],
      ['Grade-book check frequency', 'تكرار تفقّد الدرجات', 'Many grade-page visits within short windows', 'anxiety', 'strain', 0],
      ['Orientation-reset events', 'العودة لنقطة البداية', 'Returning to course home mid-task to re-orient', 'orientation', 'executive', 0],
      ['Help-page orbit', 'الدوران حول صفحات المساعدة', 'Visits to help or FAQ pages during an active task', 'comprehension', 'executive', 0]
    ],
    Q: [
      ['Attempt multiplicity', 'تعدّد المحاولات', 'Routinely using every allowed quiz attempt', 'strategy', 'executive', 0],
      ['Answer-revision count', 'عدد تغييرات الإجابة', 'Answer-selection changes per attempt (selection events only)', 'regulation', 'strain', 1],
      ['Flag-without-return rate', 'التعليم دون العودة', 'Items flagged for review then never revisited', 'working memory', 'executive', 0],
      ['Per-item time variance', 'تباين الوقت لكل سؤال', 'Variance of time per item against your own baseline', 'processing', 'reading', 0],
      ['Within-attempt fatigue slope', 'منحنى التعب داخل المحاولة', 'Time and revision change from early to late items', 'endurance', 'strain', 0],
      ['Optional-hint requests', 'طلب التلميحات الاختيارية', 'Help requests per assessment when hints are optional', 'support', 'executive', 0],
      ['Assessment freeze rate', 'معدل التجمّد في التقييم', 'Assessments started but never submitted', 'regulation', 'strain', 0],
      ['Retake-improvement slope', 'منحنى التحسّن عند الإعادة', 'Score change across attempts versus your own norm', 'learning', 'executive', 0],
      ['Stakes divergence', 'الفجوة بين الاختبارات القصيرة والنهائية', 'Gap between low-stakes quizzes and graded exams', 'anxiety', 'strain', 0],
      ['Review-page dwell', 'البقاء في صفحة المراجعة', 'Time on the post-submission feedback view', 'learning', 'strain', 0]
    ],
    H: [
      ['Assistive-trigger frequency', 'تكرار استخدام الأدوات المساعدة', 'Read-aloud, summary and reader-mode uses per session', 'coping', 'support', 1],
      ['Coping-effectiveness delta', 'أثر أدوات التكيّف', 'Friction change after each tool use — learns what works for you', 'personalisation', 'support', 1],
      ['Help-escalation latency', 'تأخّر طلب المساعدة', 'Time from a friction spike to the first help-seeking action', 'advocacy', 'support', 1],
      ['Peer-help initiation', 'اللجوء لمساعدة الزملاء', 'Opening peer-forum or study-group pages during friction', 'coping', 'support', 0],
      ['Instructor-contact rate', 'معدل التواصل مع المدرّس', 'Messages to instructors per term (count only)', 'advocacy', 'support', 0],
      ['Booking-intent clicks', 'نقرات نية الحجز', 'Clicks on office-hours or SAS booking links', 'advocacy', 'support', 1],
      ['Micro-nudge cause mix', 'أسباب الاحتكاك المختارة', 'Single-tap causes chosen: “too dense”, “tired”, “lost thread”', 'self-report', 'support', 1],
      ['Nudge–telemetry agreement', 'توافق السبب مع القياس', 'How well the chosen cause matches the inferred profile', 'validation', 'support', 0],
      ['Ally-share initiation', 'مبادرة المشاركة مع الحليف', 'Student-initiated Support Pact shares', 'disclosure', 'support', 1],
      ['Feature-exploration breadth', 'تنوّع الأدوات المجرّبة', 'Distinct assistive features tried in the first month', 'coping', 'support', 1]
    ],
    C: [
      ['Lurk-to-contribute ratio', 'نسبة المتابعة إلى المشاركة', 'Thread views versus own posts in course forums', 'participation', 'strain', 0],
      ['Reply-latency outlier', 'تأخّر الردود غير المعتاد', 'Own reply delay versus own baseline', 'processing', 'strain', 0],
      ['Thread re-open rumination', 'إعادة فتح المواضيع القديمة', 'Repeatedly re-opening one’s own old threads', 'anxiety', 'strain', 0],
      ['Co-presence avoidance', 'تجنّب العمل المتزامن', 'Preferring solo edit windows over live group sessions', 'anxiety', 'strain', 0],
      ['Post-length contraction', 'تقلّص طول المشاركات', 'Own post length metadata shrinking across the term', 'withdrawal', 'strain', 0],
      ['Channel-exposure preference', 'تفضيل القنوات الخاصة', 'Direct messages versus whole-class channels', 'anxiety', 'strain', 0],
      ['Audience-size effect', 'أثر حجم الجمهور', 'Reply latency and length in small versus large threads', 'anxiety', 'strain', 0],
      ['Collaboration-modality mix', 'مزيج قنوات التعاون', 'Chat versus document versus meeting-join counts', 'modality', 'strain', 0],
      ['Late-window contribution share', 'المساهمات في الوقت المتأخر', 'Group edits landing late at night or at the last minute', 'pacing', 'strain', 0],
      ['Support-loop closure', 'إغلاق حلقة الدعم', 'Whether the ally or counsellor flow is activated after an insight', 'outcome', 'support', 0]
    ]
  };
  const LIST = [];
  Object.entries(D).forEach(([cat, rows]) => rows.forEach((r, i) => {
    const [en, ar, how, tag, area, live] = r;
    LIST.push({ id: cat + String(i + 1).padStart(2, '0'), cat, area, en, ar, how, tag, live: !!live, dir: area === 'control' || area === 'support' ? 0 : 1 });
  }));
  // The four headline signals of the cluster, and which indicators carry them.
  const SIGNALS = [
    { id: 'S1', en: 'Visual tracking friction', ar: 'احتكاك التتبّع البصري', ind: ['V01', 'V04', 'V05', 'V06'] },
    { id: 'S2', en: 'Submission abandonment', ar: 'التراجع عن التسليم', ind: ['E03', 'E05', 'E06', 'O05'] },
    { id: 'S3', en: 'Modality shifting', ar: 'تبديل الوسيلة', ind: ['V08', 'U06', 'U02', 'H01'] },
    { id: 'S4', en: 'Deadline proximity paralysis', ar: 'الشلل قرب الموعد النهائي', ind: ['P03', 'E09', 'E01', 'C09'] }
  ];
  const AREAS = {
    reading: { en: 'Visual decoding', ar: 'فك الرموز البصري', profile: 'A', color: 'var(--c-R)' },
    executive: { en: 'Executive function', ar: 'الوظائف التنفيذية', profile: 'B', color: 'var(--c-L)' },
    strain: { en: 'Acquired strain', ar: 'ضغط مكتسب', profile: 'C', color: 'var(--c-W)' },
    language: { en: 'Language load', ar: 'عبء اللغة', profile: '—', color: 'var(--c-T)' }
  };
  window.ERLY_IND = { CATS, LIST, SIGNALS, AREAS };
})();
