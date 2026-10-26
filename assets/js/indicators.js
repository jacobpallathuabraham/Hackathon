/* ERLY — indicator catalogue.
   Every indicator ERLY tracks lives in this one list, so the catalogue can be
   replaced or extended without touching the tracker, the insight or the
   counselor views. Fields:
     id, cat (category key), area (reading | attention | language | strain),
     en / ar (name), how (what is measured — metadata only), unit,
     live: true when the Reading Studio measures it for real in this demo,
     dir: +1 when a higher value means more friction than the student's normal. */
(function () {
  const CATS = {
    R: { en: 'Reading behaviour', ar: 'سلوك القراءة', icon: 'book', color: 'var(--c-R)' },
    L: { en: 'Language load', ar: 'عبء اللغة', icon: 'globe', color: 'var(--c-L)' },
    W: { en: 'Writing & submission', ar: 'الكتابة والتسليم', icon: 'pen', color: 'var(--c-W)' },
    T: { en: 'Time & routine', ar: 'الوقت والروتين', icon: 'clock', color: 'var(--c-T)' },
    A: { en: 'Audio & modality', ar: 'الصوت والوسائط', icon: 'headphones', color: 'var(--c-A)' },
    S: { en: 'Help-seeking & check-ins', ar: 'طلب المساعدة والمتابعة', icon: 'chat', color: 'var(--c-S)' },
    X: { en: 'Strain & change', ar: 'الضغط والتغيّر', icon: 'pulse', color: 'var(--c-X)' }
  };
  const I = (id, cat, area, en, ar, how, unit, live, dir = 1) => ({ id, cat, area, en, ar, how, unit, live: !!live, dir });
  const LIST = [
    // Reading behaviour — measured live in the Reading Studio
    I('R01', 'R', 'reading', 'Re-read loops', 'حلقات إعادة القراءة', 'Scrolling back up over text already read', 'per page', 1),
    I('R02', 'R', 'reading', 'Line backtracks', 'الرجوع إلى أسطر سابقة', 'Pointer settling on an earlier line after reaching a later one', 'per paragraph', 1),
    I('R03', 'R', 'reading', 'Dwell vs. expected time', 'وقت البقاء مقابل المتوقع', 'Time on a paragraph compared with its length at ~230 wpm', '× expected', 1),
    I('R04', 'R', 'reading', 'Reading pace drift', 'انجراف وتيرة القراءة', 'Words per minute compared with your own median', '% slower', 1),
    I('R05', 'R', 'reading', 'Paragraphs abandoned', 'فقرات متروكة', 'Leaving a paragraph partway and not returning', 'per session', 1),
    I('R06', 'R', 'reading', 'Text size increases', 'تكبير النص', 'Raising font size during a session', 'changes', 1),
    I('R07', 'R', 'reading', 'Spacing adjustments', 'تعديلات التباعد', 'Line, letter or word spacing changed', 'changes', 1),
    I('R08', 'R', 'reading', 'Page tint changes', 'تغيير لون الصفحة', 'Switching to a tinted or dark page', 'changes', 1),
    I('R09', 'R', 'reading', 'Line-focus use', 'استخدام تركيز السطر', 'Turning on the one-line focus band', 'minutes', 1),
    I('R10', 'R', 'reading', 'Readable-font switch', 'التحويل لخط مقروء', 'Choosing a reading-friendly font', 'switches', 1),
    I('R11', 'R', 'reading', 'Skip-ahead then return', 'القفز ثم العودة', 'Jumping to a later section, then coming back', 'per page', 1),
    I('R12', 'R', 'reading', 'Time to first scroll', 'الوقت حتى أول تمرير', 'Seconds before the page is first moved', 'seconds', 1),
    // Language load
    I('L01', 'L', 'language', 'English vs. Arabic friction gap', 'فجوة الاحتكاك بين الإنجليزية والعربية', 'Re-read and dwell rates on English pages vs. Arabic pages (page lang attribute)', 'ratio', 1),
    I('L02', 'L', 'language', 'Glossary look-ups', 'البحث في المسرد', 'Tapping a highlighted term for its meaning', 'per page', 1),
    I('L03', 'L', 'language', 'Translation requests', 'طلبات الترجمة', 'Asking for a term in the other language', 'per page', 1),
    I('L04', 'L', 'language', 'Document language switches', 'تبديل لغة المستند', 'Switching a reading between Arabic and English', 'switches', 1),
    I('L05', 'L', 'language', 'Simplified-summary requests', 'طلب ملخص مبسّط', 'Asking for a plain-words version of a section', 'per page', 1),
    // Writing & submission — metadata from the LMS, never text
    I('W01', 'W', 'attention', 'Abandoned drafts', 'مسودات مهجورة', 'Drafts started and never submitted (button events only)', 'per week', 0),
    I('W02', 'W', 'attention', 'Posts deleted after submitting', 'منشورات حُذفت بعد إرسالها', 'Forum posts submitted then deleted', 'per week', 0),
    I('W03', 'W', 'attention', '11th-hour submissions', 'تسليمات اللحظة الأخيرة', 'Share of work done in the final 12 hours before a deadline', '% of work', 0),
    I('W04', 'W', 'attention', 'Assignment brief re-opens', 'إعادة فتح وصف الواجب', 'Times a brief is opened before work begins', 'per task', 0),
    I('W05', 'W', 'attention', 'Late submissions', 'تسليمات متأخرة', 'Submitted after the deadline', 'per term', 0),
    I('W06', 'W', 'attention', 'Extension requests', 'طلبات التمديد', 'Extensions asked for through the LMS', 'per term', 0),
    I('W07', 'W', 'attention', 'First-step delay', 'تأخر الخطوة الأولى', 'Hours from opening a task to the first saved work', 'hours', 0),
    // Time & routine
    I('T01', 'T', 'strain', 'Late-night study share', 'نسبة الدراسة ليلاً', 'Share of study time after 11 pm', '% of time', 0),
    I('T02', 'T', 'strain', 'Circadian drift', 'الانجراف اليومي', 'Centre of study hours sliding later, week to week', 'minutes later', 0),
    I('T03', 'T', 'attention', 'Session fragmentation', 'تجزؤ الجلسات', 'Study sessions shorter than 10 minutes', '% of sessions', 0),
    I('T04', 'T', 'attention', 'Focus-sprint completion', 'إكمال جولات التركيز', 'Started focus sprints that were finished', '% completed', 0, -1),
    I('T05', 'T', 'strain', 'Weekend catch-up load', 'عبء تعويض العطلة', 'Share of weekly study squeezed into the weekend', '% of week', 0),
    I('T06', 'T', 'strain', 'Days with no study', 'أيام بلا دراسة', 'Days in a teaching week without any study activity', 'days', 0),
    // Audio & modality
    I('A01', 'A', 'reading', 'Read-aloud use', 'استخدام القراءة الصوتية', 'Starting read-aloud on a page', 'starts', 1),
    I('A02', 'A', 'reading', 'Paragraph replays', 'إعادة تشغيل الفقرات', 'Hearing the same paragraph read again', 'replays', 1),
    I('A03', 'A', 'reading', 'Voice slowed down', 'إبطاء الصوت', 'Lowering read-aloud speed below 0.9×', 'changes', 1),
    I('A04', 'A', 'reading', 'Audio share of reading', 'نسبة القراءة بالصوت', 'Share of reading time spent listening rather than reading', '% of time', 0),
    I('A05', 'A', 'attention', 'Lecture rewind loops', 'إرجاع المحاضرات', 'Seeking back over the same 30 s of a recorded lecture', 'per lecture', 0),
    // Help-seeking & check-ins — measured live through the study buddy
    I('S01', 'S', 'reading', '“Help with this part” taps', 'نقرات «ساعدني في هذا الجزء»', 'Asking the study buddy for help on a paragraph', 'per page', 1),
    I('S02', 'S', 'reading', 'Understanding-check accuracy', 'دقة فحص الفهم', 'Correct answers on the buddy’s friendly check questions', '% correct', 1, -1),
    I('S03', 'S', 'reading', 'Check-question retries', 'إعادة محاولة أسئلة الفهم', 'Second tries on a check question', 'retries', 1),
    I('S04', 'S', 'strain', '“I’m tired” replies', 'إجابات «أنا متعب»', 'Choosing “I’m just tired” when the buddy asks', 'per week', 1),
    I('S05', 'S', 'reading', '“Did that help?” = not really', '«هل ساعد؟» = ليس فعلاً', 'Tools or explanations that did not help', 'per week', 1),
    I('S06', 'S', 'strain', 'Daily mood check-in', 'المزاج اليومي', 'One-tap check-in: easier, same or harder', 'harder days', 0),
    // Strain & change
    I('X01', 'X', 'strain', 'Change across all baselines', 'تغيّر في كل خطوط الأساس', 'Several unrelated indicators moving at once', 'categories', 0),
    I('X02', 'X', 'strain', 'Sudden activity drop', 'هبوط مفاجئ في النشاط', 'Study time falling sharply against your own normal', '% drop', 0),
    I('X03', 'X', 'strain', 'Exam-period amplification', 'تضخّم في فترة الامتحانات', 'Friction rising beyond what Exam Mode expects', 'σ above', 0)
  ];
  window.ERLY_IND = { CATS, LIST };
})();
