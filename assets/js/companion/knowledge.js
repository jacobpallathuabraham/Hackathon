/* ERLY AI Reading Companion — Noor's knowledge base (EN + AR).

   A curated, plain-language reference on learning differences and study
   wellbeing, written for university students: what each one is, common signs
   in adults, what else can look similar, how it is assessed, and what helps.
   It follows widely used descriptions (for example DSM-5 / ICD-11 categories
   and published guidance from dyslexia, ADHD and audiology bodies), written in
   ERLY's own words. It is general information, not medical advice.

   answer(text, lang) finds the best topic and the part of it the question is
   about (what / signs / causes / assessment / support / myths) and returns a
   friendly reply plus follow-up chips. When an external model is configured
   and consented, the same entries are sent as grounding context (RAG).

   Pure module: window.ERLY_KB in the browser, CommonJS for the tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./kb-extra.js'));
  else root.ERLY_KB = factory(root.ERLY_KB_EXTRA);
})(typeof self !== 'undefined' ? self : this, function (EXTRA) {
  'use strict';
  const B = (en, ar) => [en, ar];

  const TOPICS = [
    {
      id: 'dyslexia', area: 'reading',
      keys: ['dyslexia', 'dyslexic', 're-read', 'reread', 're read', 'lose my place', 'skip lines', 'reading is slow', 'reading takes', 'hate reading', 'words jumble', 'أعيد القراءة', 'أفقد مكاني', 'reading difficulty', 'reading disorder', 'reading problem', 'letters jump', 'reverse letters', 'decoding', 'phonological', 'spelling', 'read slowly', 'slow reader', 'عسر القراءة', 'ديسلكسيا', 'صعوبة القراءة', 'الإملاء', 'أقرأ ببطء'],
      title: B('Dyslexia (a specific learning difference in reading)', 'عسر القراءة (اختلاف تعلّم محدد في القراءة)'),
      what: B('Dyslexia is a lifelong difference in how the brain processes the sounds of language and links them to written words. It mainly affects accurate and fluent word reading and spelling. It has nothing to do with intelligence or effort, it runs in families, and it affects roughly 5–10% of people. It shows up in every language, including Arabic, where vowel marks (tashkeel) usually being absent makes fluent reading harder still.',
        'عسر القراءة اختلاف مستمر مدى الحياة في طريقة معالجة الدماغ لأصوات اللغة وربطها بالكلمات المكتوبة. يؤثر أساساً في دقة قراءة الكلمات وطلاقتها وفي الإملاء. لا علاقة له بالذكاء أو الجهد، ويتوارث في العائلات، ويصيب نحو ٥–١٠٪ من الناس. يظهر في كل اللغات بما فيها العربية، حيث يزيد غياب التشكيل غالباً من صعوبة القراءة بطلاقة.'),
      signs: [
        B('Reading is slow and effortful, even for familiar material', 'القراءة بطيئة ومتعبة حتى مع المواد المألوفة'),
        B('Re-reading sentences to understand them, losing your place', 'إعادة قراءة الجمل لفهمها وفقدان مكانك'),
        B('Persistent spelling difficulties, including inconsistent spellings of the same word', 'صعوبات مستمرة في الإملاء، منها كتابة الكلمة نفسها بطرق مختلفة'),
        B('Difficulty reading aloud or with unfamiliar words and names', 'صعوبة القراءة بصوت عالٍ أو قراءة الكلمات والأسماء غير المألوفة'),
        B('Understanding is much better when you listen than when you read', 'الفهم أفضل بكثير عند الاستماع مقارنة بالقراءة'),
        B('A history of struggling to learn to read at school, often with family members who struggled too', 'تاريخ من الصعوبة في تعلّم القراءة في المدرسة، وغالباً أفراد من العائلة واجهوا الأمر نفسه'),
        B('Difficulty with phonological tasks, such as swapping the first sounds of words or quick naming', 'صعوبة في المهام الصوتية، مثل تبديل الأصوات الأولى للكلمات أو التسمية السريعة')
      ],
      similar: B('Second-language reading, uncorrected vision problems, hearing problems, attention difficulties, tiredness or simply very technical material can look similar. A key sign of dyslexia is difficulty in your first language too, and from early childhood.', 'قد تبدو القراءة بلغة ثانية، أو مشكلات النظر غير المصححة، أو مشكلات السمع، أو صعوبات الانتباه، أو التعب، أو المواد التقنية جداً مشابهة. من العلامات المهمة لعسر القراءة وجود الصعوبة بلغتك الأم أيضاً، ومنذ الطفولة المبكرة.'),
      assess: B('A psycho-educational assessment by an educational psychologist or specialist assessor: reading accuracy and speed, spelling, phonological processing, rapid naming, working memory, and a developmental and educational history. A vision and hearing check comes first. At university, SAS can arrange or refer you.', 'تقييم نفسي تربوي يجريه أخصائي نفسي تربوي أو مقيّم متخصص: دقة القراءة وسرعتها، والإملاء، والمعالجة الصوتية، والتسمية السريعة، والذاكرة العاملة، مع تاريخ نمائي وتعليمي. يسبقه فحص للنظر والسمع. في الجامعة، يمكن لخدمات الطلبة ترتيب ذلك أو تحويلك.'),
      support: B('Extra time in exams (often 25%), text-to-speech and audiobooks, readings released early, dyslexia-friendly fonts and spacing, recorded lectures, spell-checkers, and specialist study-skills tutoring. Many very successful people are dyslexic.', 'وقت إضافي في الاختبارات (غالباً ٢٥٪)، وتحويل النص إلى كلام والكتب الصوتية، ونشر القراءات مبكراً، وخطوط وتباعد مناسبة، وتسجيل المحاضرات، والمدققات الإملائية، ودروس متخصصة في مهارات الدراسة. كثير من الناجحين جداً لديهم عسر قراءة.'),
      myths: B('Myth: dyslexia means seeing letters backwards. Reversals are common in all young children; dyslexia is mainly about the sounds of language. Myth: it goes away. It is lifelong, but support works very well.', 'خرافة: عسر القراءة يعني رؤية الحروف معكوسة. الانعكاس شائع لدى جميع الأطفال الصغار؛ أما عسر القراءة فيتعلق أساساً بأصوات اللغة. خرافة: أنه يزول. إنه مستمر مدى الحياة، لكن الدعم فعّال جداً.')
    },
    {
      id: 'dyscalculia', area: 'maths',
      keys: ['dyscalculia', 'bad at maths', 'bad at math', 'fingers to count', 'working out change', 'maths difficulty', 'math difficulty', 'numbers', 'number sense', 'mental arithmetic', 'times tables', 'calculation', 'counting', 'عسر الحساب', 'الأرقام', 'الحساب', 'الرياضيات'],
      title: B('Dyscalculia (a specific learning difference with numbers)', 'عسر الحساب (اختلاف تعلّم محدد في الأرقام)'),
      what: B('Dyscalculia is a persistent difficulty understanding numbers and quantities: an intuitive sense of “how many”, number facts and calculation. It affects around 3–6% of people and often occurs alongside dyslexia or ADHD. It is different from maths anxiety, although the two often go together.', 'عسر الحساب صعوبة مستمرة في فهم الأرقام والكميات: الإحساس البديهي بـ«كم»، وحقائق الأعداد، والحساب. يصيب نحو ٣–٦٪ من الناس وكثيراً ما يرافق عسر القراءة أو اضطراب الانتباه. وهو يختلف عن قلق الرياضيات، وإن كانا يجتمعان غالباً.'),
      signs: [
        B('Still counting on fingers for simple sums; number facts don’t stick', 'الاستمرار في العدّ على الأصابع للعمليات البسيطة؛ حقائق الأعداد لا تثبت'),
        B('Difficulty estimating quantities, time, distances or money', 'صعوبة تقدير الكميات أو الوقت أو المسافات أو المال'),
        B('Mixing up digits (e.g. 41 and 14) and losing track in multi-step calculations', 'الخلط بين الأرقام (مثل ٤١ و١٤) وفقدان التسلسل في العمليات متعددة الخطوات'),
        B('Difficulty reading analogue clocks, timetables or graphs', 'صعوبة قراءة الساعات التناظرية أو الجداول الزمنية أو الرسوم البيانية'),
        B('Strong anxiety or avoidance around maths since childhood', 'قلق شديد أو تجنّب للرياضيات منذ الطفولة')
      ],
      similar: B('Gaps in teaching, maths anxiety, attention difficulties and working-memory difficulties can look similar.', 'قد تبدو الفجوات في التعليم، وقلق الرياضيات، وصعوبات الانتباه والذاكرة العاملة مشابهة.'),
      assess: B('A specialist assessment of number sense, calculation fluency, maths reasoning and working memory, with educational history.', 'تقييم متخصص للحس العددي وطلاقة الحساب والاستدلال الرياضي والذاكرة العاملة، مع التاريخ التعليمي.'),
      support: B('Calculator use, formula sheets, extra time, concrete visual models, step-by-step worked examples, and maths support tutoring.', 'استخدام الآلة الحاسبة، وأوراق القوانين، والوقت الإضافي، والنماذج البصرية الملموسة، والأمثلة المحلولة خطوة بخطوة، ودروس دعم الرياضيات.'),
      myths: B('Myth: it just means “bad at maths”. It is a specific, persistent difficulty with number processing, not a lack of effort.', 'خرافة: أنه مجرد «ضعف في الرياضيات». إنه صعوبة محددة ومستمرة في معالجة الأعداد، وليس قلة جهد.')
    },
    {
      id: 'dysgraphia', area: 'writing',
      keys: ['dysgraphia', 'blank page', 'can\'t write', 'writing essays', 'hand hurts', 'handwriting', 'writing difficulty', 'written expression', 'messy writing', 'writing slowly', 'organise my writing', 'essay', 'عسر الكتابة', 'خط اليد', 'الكتابة', 'التعبير الكتابي', 'المقال'],
      title: B('Dysgraphia / written-expression difficulty', 'عسر الكتابة / صعوبة التعبير الكتابي'),
      what: B('Dysgraphia describes persistent difficulty getting thoughts onto paper or screen: handwriting or typing that is slow and effortful, spelling, and organising written ideas, out of line with your spoken ability. It can involve the motor side (handwriting), the language side (written expression), or both.', 'يصف عسر الكتابة صعوبة مستمرة في نقل الأفكار إلى الورق أو الشاشة: كتابة يدوية أو طباعة بطيئة ومتعبة، والإملاء، وتنظيم الأفكار المكتوبة، بما لا يتناسب مع قدرتك الشفهية. قد يشمل الجانب الحركي (خط اليد)، أو الجانب اللغوي (التعبير الكتابي)، أو كليهما.'),
      signs: [
        B('Writing is much slower and harder than talking about the same ideas', 'الكتابة أبطأ وأصعب بكثير من الحديث عن الأفكار نفسها'),
        B('Hand pain or fatigue, or handwriting others find hard to read', 'ألم أو تعب في اليد، أو خط يصعب على الآخرين قراءته'),
        B('Long pauses, blank-page freezes, lots of deleting and restarting', 'توقفات طويلة، وتجمّد أمام الصفحة الفارغة، وكثرة الحذف وإعادة البدء'),
        B('Trouble organising paragraphs, and spelling or grammar errors that you miss when proofreading', 'صعوبة تنظيم الفقرات، وأخطاء إملائية أو نحوية تفوتك عند المراجعة')
      ],
      similar: B('Writing in a second language, perfectionism, anxiety, ADHD and dyslexia can all slow writing.', 'الكتابة بلغة ثانية، والمثالية، والقلق، واضطراب الانتباه، وعسر القراءة قد تبطئ الكتابة جميعها.'),
      assess: B('A writing assessment (transcription speed, spelling, written composition), plus occupational therapy if handwriting or motor skills are involved.', 'تقييم للكتابة (سرعة النسخ، الإملاء، التأليف الكتابي)، إضافة إلى العلاج الوظيفي إن كانت الكتابة اليدوية أو المهارات الحركية متأثرة.'),
      support: B('Typing or speech-to-text, extra time, essay planners and outlines, spelling and grammar tools, and permission to submit in alternative formats.', 'الطباعة أو تحويل الكلام إلى نص، والوقت الإضافي، ومخططات المقالات، وأدوات الإملاء والقواعد، والسماح بالتسليم بصيغ بديلة.'),
      myths: B('Myth: messy handwriting just means you’re careless. Persistent difficulty despite effort deserves a proper look.', 'خرافة: الخط غير المرتب يعني الإهمال فقط. الصعوبة المستمرة رغم الجهد تستحق تقييماً حقيقياً.')
    },
    {
      id: 'adhd', area: 'attention',
      keys: ['adhd', 'add', 'attention deficit', 'mind wanders', 'zone out', 'can\'t sit still', 'last minute', 'miss deadlines', 'missing deadlines', 'deadlines', 'disorganized', 'start tasks', 'getting started', 'يشرد ذهني', 'آخر لحظة', 'hyperactivity', 'focus', 'concentrate', 'concentration', 'distracted', 'procrastinate', 'procrastination', 'forgetful', 'disorganised', 'disorganized', 'restless', 'impulsive', 'fidget', 'فرط الحركة', 'تشتت الانتباه', 'التركيز', 'التسويف', 'النسيان', 'تشتت'],
      title: B('ADHD (attention and executive-function differences)', 'اضطراب فرط الحركة وتشتت الانتباه (اختلافات الانتباه والوظائف التنفيذية)'),
      what: B('ADHD is a neurodevelopmental difference in regulating attention, activity and impulses. In adults it often looks less like hyperactivity and more like trouble starting and finishing tasks, time blindness, forgetfulness and restlessness. For a diagnosis, signs must have started in childhood (before about age 12), appear in more than one setting (study, work, home), and cause real difficulties. Around 3–5% of adults have ADHD.', 'اضطراب فرط الحركة وتشتت الانتباه اختلاف نمائي عصبي في تنظيم الانتباه والنشاط والاندفاع. لدى البالغين غالباً لا يظهر كفرط حركة بقدر ما يظهر كصعوبة في بدء المهام وإنهائها، وضعف الإحساس بالوقت، والنسيان، والتململ. وللتشخيص يجب أن تكون العلامات قد بدأت في الطفولة (قبل ١٢ عاماً تقريباً)، وأن تظهر في أكثر من بيئة (الدراسة، العمل، البيت)، وأن تسبب صعوبات حقيقية. يصيب نحو ٣–٥٪ من البالغين.'),
      signs: [
        B('Often struggling to finish the final details of a task once the interesting part is done', 'صعوبة متكررة في إنهاء التفاصيل الأخيرة للمهمة بعد انتهاء الجزء الممتع'),
        B('Difficulty organising tasks, planning ahead and estimating time', 'صعوبة تنظيم المهام والتخطيط المسبق وتقدير الوقت'),
        B('Forgetting appointments, deadlines or what you walked into a room for', 'نسيان المواعيد أو المواعيد النهائية أو سبب دخولك إلى الغرفة'),
        B('Putting off tasks that need sustained mental effort until the last minute', 'تأجيل المهام التي تتطلب جهداً ذهنياً متواصلاً حتى اللحظة الأخيرة'),
        B('Fidgeting, inner restlessness, or feeling driven “like a motor”', 'التململ، أو قلق داخلي، أو الشعور بأنك مدفوع «كالمحرك»'),
        B('Mind wandering during lectures or reading, even when the topic matters to you', 'شرود الذهن أثناء المحاضرات أو القراءة حتى عندما يهمك الموضوع'),
        B('Hyperfocus on things you find interesting', 'تركيز مفرط على الأشياء التي تثير اهتمامك')
      ],
      similar: B('Anxiety, depression, poor sleep, thyroid problems, substance use and simple overload can all cause similar attention problems — so a good assessment always checks these too.', 'القلق والاكتئاب وقلة النوم ومشكلات الغدة الدرقية وتعاطي المواد والضغط الزائد قد تسبب جميعها مشكلات انتباه مشابهة — لذلك يتحقق التقييم الجيد منها دائماً.'),
      assess: B('An assessment by a psychiatrist or clinical psychologist: a detailed clinical interview, validated adult rating scales (e.g. the WHO Adult ADHD Self-Report Scale), childhood history (school reports help), and ideally someone who knew you as a child. SAS can guide you to the right service.', 'تقييم يجريه طبيب نفسي أو أخصائي نفسي إكلينيكي: مقابلة سريرية مفصّلة، ومقاييس معتمدة للبالغين (مثل مقياس منظمة الصحة العالمية للتقييم الذاتي)، وتاريخ الطفولة (تفيد التقارير المدرسية)، ويفضل شخص عرفك في طفولتك. يمكن لخدمات الطلبة توجيهك إلى الخدمة المناسبة.'),
      support: B('Breaking work into small steps, external reminders and planners, body-doubling, short focused sprints with breaks, quiet exam rooms, extra time, and — after diagnosis — treatment options a doctor can discuss with you.', 'تقسيم العمل إلى خطوات صغيرة، والتذكيرات والمخططات الخارجية، والعمل بجانب شخص آخر، وفترات تركيز قصيرة مع استراحات، وقاعات اختبار هادئة، ووقت إضافي، وبعد التشخيص خيارات علاجية يناقشها معك الطبيب.'),
      myths: B('Myth: ADHD is only hyperactive boys. Many adults, especially women, have the mainly inattentive type. Myth: you can’t have ADHD if you can focus on games. Interest-based hyperfocus is common in ADHD.', 'خرافة: الاضطراب يخص الأولاد كثيري الحركة فقط. كثير من البالغين، خاصة النساء، لديهم النمط الغالب عليه تشتت الانتباه. خرافة: لا يمكن أن يكون لديك الاضطراب إن كنت تركز في الألعاب. التركيز المفرط على ما يثير الاهتمام شائع فيه.')
    },
    {
      id: 'apd', area: 'listening',
      keys: ['auditory processing', 'apd', 'too fast', 'rewind', 'mishear', 'can\'t follow', 'lecturer talks', 'سريع جداً', 'listening', 'hearing', 'background noise', 'noise', 'follow lectures', 'spoken instructions', 'ask people to repeat', 'accent', 'المعالجة السمعية', 'الاستماع', 'السمع', 'الضوضاء', 'المحاضرات'],
      title: B('Listening difficulties & auditory processing', 'صعوبات الاستماع والمعالجة السمعية'),
      what: B('Some people hear sounds normally on a hearing test but find it hard to make sense of speech — especially in noise, with fast talkers, or with long spoken instructions. This is often called an auditory processing difficulty (APD). A hearing loss must always be ruled out first, because it is common and easy to miss.', 'بعض الناس يسمعون الأصوات بشكل طبيعي في اختبار السمع لكنهم يجدون صعوبة في فهم الكلام — خاصة وسط الضوضاء، أو مع المتحدثين السريعين، أو مع التعليمات الشفهية الطويلة. يُسمى هذا غالباً صعوبة المعالجة السمعية. يجب دائماً استبعاد ضعف السمع أولاً لأنه شائع ويسهل أن يفوت.'),
      signs: [
        B('Understanding much less in noisy rooms than in quiet ones', 'فهم أقل بكثير في الغرف الصاخبة مقارنة بالهادئة'),
        B('Often asking people to repeat, or mishearing similar-sounding words', 'طلب الإعادة كثيراً، أو الخلط بين كلمات متشابهة الصوت'),
        B('Losing track of long spoken instructions or fast lectures', 'فقدان التسلسل في التعليمات الشفهية الطويلة أو المحاضرات السريعة'),
        B('Relying heavily on captions, transcripts or rewinding videos', 'الاعتماد الكبير على الترجمة النصية أو النصوص المكتوبة أو إعادة الفيديو')
      ],
      similar: B('Hearing loss, attention difficulties, listening in a second language, unfamiliar accents and tiredness can look the same.', 'ضعف السمع وصعوبات الانتباه والاستماع بلغة ثانية واللهجات غير المألوفة والتعب قد تبدو متشابهة.'),
      assess: B('A full hearing test (audiogram) by an audiologist first; then, if hearing is normal, specialist auditory-processing tests.', 'فحص سمع كامل (مخطط السمع) لدى أخصائي السمعيات أولاً؛ ثم إن كان السمع طبيعياً، اختبارات متخصصة للمعالجة السمعية.'),
      support: B('Captions and transcripts, recorded lectures, sitting near the speaker, written instructions, quiet study spaces, and assistive listening devices.', 'الترجمة النصية والنصوص المكتوبة، وتسجيل المحاضرات، والجلوس قرب المتحدث، والتعليمات المكتوبة، وأماكن الدراسة الهادئة، وأجهزة الاستماع المساعدة.'),
      myths: B('Myth: if your hearing test is normal, listening can’t be the problem. Processing speech is more than detecting sound.', 'خرافة: إن كان اختبار السمع طبيعياً فلا يمكن أن يكون الاستماع هو المشكلة. معالجة الكلام أكثر من مجرد التقاط الصوت.')
    },
    {
      id: 'vision', area: 'vision',
      keys: ['vision', 'eyes', 'eye strain', 'blurry', 'blur', 'headache', 'glare', 'squint', 'النظر', 'العين', 'ضبابي', 'صداع', 'إجهاد العين', 'الوهج'],
      title: B('Vision and visual comfort when reading', 'النظر والراحة البصرية أثناء القراءة'),
      what: B('Uncorrected short- or long-sightedness, astigmatism, or problems with how the two eyes work together (focusing and convergence) can make reading tiring and slow. Some people also report “visual stress” — text that seems to shimmer or crowd — which is debated in research, but tinted backgrounds and spacing help some readers feel more comfortable.', 'قصر النظر أو طوله غير المصحح، أو اللابؤرية، أو مشكلات في تعاون العينين معاً (التركيز والتقارب) قد تجعل القراءة متعبة وبطيئة. ويصف بعض الناس «إجهاداً بصرياً» — نص يبدو كأنه يلمع أو يتزاحم — وهو موضوع نقاش في الأبحاث، لكن الخلفيات الملونة والتباعد تريح بعض القراء.'),
      signs: [B('Blur, double vision or words moving', 'تشوش أو رؤية مزدوجة أو حركة الكلمات'), B('Headaches or sore eyes after reading', 'صداع أو ألم في العينين بعد القراءة'), B('Rubbing eyes, covering one eye, or getting very close to the screen', 'فرك العينين، أو تغطية عين واحدة، أو الاقتراب كثيراً من الشاشة'), B('Strong preference for larger text or zoom', 'تفضيل قوي للنص الأكبر أو التكبير')],
      similar: B('Tiredness, too much screen time, poor lighting and dyslexia can feel similar.', 'التعب، وكثرة استخدام الشاشات، والإضاءة الضعيفة، وعسر القراءة قد تُشعر بأعراض مشابهة.'),
      assess: B('A full eye examination by an optometrist, including near vision and binocular vision — not just a distance chart.', 'فحص عيون كامل لدى أخصائي البصريات يشمل الرؤية القريبة والرؤية بالعينين — وليس مجرد لوحة الرؤية البعيدة.'),
      support: B('Glasses if needed, larger text, good lighting, regular breaks (the 20-20-20 rule), tinted page backgrounds and enlarged exam papers.', 'نظارات عند الحاجة، ونص أكبر، وإضاءة جيدة، واستراحات منتظمة (قاعدة ٢٠-٢٠-٢٠)، وخلفيات صفحة ملونة، وأوراق اختبار مكبرة.'),
      myths: B('Myth: coloured overlays cure dyslexia. They may improve comfort for some readers but do not treat dyslexia.', 'خرافة: الشرائح الملونة تعالج عسر القراءة. قد تحسّن الراحة لبعض القراء لكنها لا تعالج عسر القراءة.')
    },
    {
      id: 'dcd', area: 'motor',
      keys: ['dyspraxia', 'dcd', 'coordination', 'clumsy', 'motor skills', 'organisation and coordination', 'خلل الأداء', 'التناسق الحركي', 'المهارات الحركية', 'عسر التآزر'],
      title: B('Dyspraxia / developmental coordination disorder (DCD)', 'عسر الأداء الحركي / اضطراب التناسق النمائي'),
      what: B('DCD affects the planning and coordination of movement. In students it can show up as slow, tiring handwriting, difficulty with practical lab work, clumsiness, and often difficulties with organisation and time.', 'يؤثر اضطراب التناسق النمائي في تخطيط الحركة وتنسيقها. لدى الطلبة قد يظهر في كتابة يدوية بطيئة ومتعبة، وصعوبة في الأعمال المخبرية العملية، والارتباك الحركي، وغالباً صعوبات في التنظيم والوقت.'),
      signs: [B('Handwriting that is slow, painful or hard to read', 'كتابة يدوية بطيئة أو مؤلمة أو صعبة القراءة'), B('Clumsiness, bumping into things, difficulty with sports since childhood', 'الارتباك الحركي، والاصطدام بالأشياء، وصعوبة الرياضة منذ الطفولة'), B('Difficulty with fine tasks like using lab equipment', 'صعوبة في المهام الدقيقة مثل استخدام أدوات المختبر')],
      similar: B('Neurological or joint conditions and ADHD can overlap.', 'قد تتداخل الحالات العصبية أو حالات المفاصل واضطراب الانتباه.'),
      assess: B('An occupational therapist or physiotherapist, with a doctor ruling out other causes.', 'أخصائي علاج وظيفي أو علاج طبيعي، مع استبعاد الطبيب للأسباب الأخرى.'),
      support: B('Typing, extra time, lab support, ergonomic equipment and planning tools.', 'الطباعة، والوقت الإضافي، ودعم المختبر، والأدوات المريحة، وأدوات التخطيط.'),
      myths: B('Myth: it’s just being clumsy. It is a recognised developmental condition.', 'خرافة: إنه مجرد ارتباك. إنه حالة نمائية معترف بها.')
    },
    {
      id: 'autism', area: 'social',
      keys: ['autism', 'autistic', 'asd', 'asperger', 'social cues', 'routine', 'sensory', 'eye contact', 'small talk', 'group work', 'التوحد', 'طيف التوحد', 'الإشارات الاجتماعية', 'الروتين', 'الحسية', 'التواصل البصري'],
      title: B('Autism (autism spectrum)', 'التوحد (طيف التوحد)'),
      what: B('Autism is a lifelong neurodevelopmental difference in social communication and interaction, together with focused interests, a preference for routine and predictability, and differences in sensory processing (for example sensitivity to noise, light or textures). Many autistic adults were not identified as children, especially women and people who learned to “mask”.', 'التوحد اختلاف نمائي عصبي مدى الحياة في التواصل والتفاعل الاجتماعي، إلى جانب اهتمامات مركّزة، وتفضيل للروتين والقدرة على التوقع، واختلافات في المعالجة الحسية (مثل الحساسية للضجيج أو الضوء أو الملمس). كثير من البالغين المصابين بالتوحد لم يُكتشفوا في الطفولة، خاصة النساء ومن تعلّموا «التمويه».'),
      signs: [B('Social situations feel confusing or exhausting; unwritten rules aren’t obvious', 'المواقف الاجتماعية مربكة أو مرهقة؛ والقواعد غير المكتوبة غير واضحة'), B('Strong preference for routines; unexpected changes are very stressful', 'تفضيل قوي للروتين؛ والتغييرات المفاجئة مرهقة جداً'), B('Sensitivity to noise, lights, smells or crowds', 'حساسية للضجيج أو الأضواء أو الروائح أو الزحام'), B('Deep, focused interests', 'اهتمامات عميقة ومركّزة'), B('Taking language literally; finding small talk hard', 'فهم اللغة حرفياً؛ وصعوبة الأحاديث الجانبية')],
      similar: B('Social anxiety, ADHD, language differences and cultural differences can look similar in some ways.', 'القلق الاجتماعي واضطراب الانتباه والاختلافات اللغوية والثقافية قد تبدو متشابهة من بعض النواحي.'),
      assess: B('A specialist diagnostic assessment (psychiatrist, clinical psychologist or multidisciplinary team) including a developmental history.', 'تقييم تشخيصي متخصص (طبيب نفسي، أو أخصائي نفسي إكلينيكي، أو فريق متعدد التخصصات) يشمل التاريخ النمائي.'),
      support: B('Clear written instructions, advance notice of changes, quiet spaces and exam rooms, flexibility in group work, and noise-cancelling headphones.', 'تعليمات مكتوبة واضحة، وإشعار مسبق بالتغييرات، وأماكن وقاعات اختبار هادئة، ومرونة في العمل الجماعي، وسماعات عازلة للضوضاء.'),
      myths: B('Myth: autistic people lack empathy. Many feel deeply but express or read emotions differently.', 'خرافة: المصابون بالتوحد يفتقرون إلى التعاطف. كثير منهم يشعرون بعمق لكنهم يعبّرون عن المشاعر أو يقرؤونها بطريقة مختلفة.')
    },
    {
      id: 'anxiety', area: 'wellbeing',
      keys: ['anxiety', 'anxious', 'test anxiety', 'exam stress', 'stress', 'worry', 'nervous', 'blank in exams', 'overwhelmed', 'القلق', 'قلق الاختبار', 'التوتر', 'متوتر', 'ضغط'],
      title: B('Test anxiety and stress', 'قلق الاختبار والتوتر'),
      what: B('Some worry before exams is normal and even useful. Test anxiety is when worry is so strong that your mind goes blank, you can’t show what you know, or you avoid assessments. Ongoing anxiety can also affect sleep, concentration and memory — and it often sits alongside learning differences.', 'بعض القلق قبل الاختبارات طبيعي ومفيد أحياناً. أما قلق الاختبار فهو قلق شديد يجعل ذهنك فارغاً، فلا تستطيع إظهار ما تعرفه، أو تتجنب التقييمات. والقلق المستمر قد يؤثر أيضاً في النوم والتركيز والذاكرة — وكثيراً ما يرافق اختلافات التعلّم.'),
      signs: [B('Racing heart, nausea or shaking before or during exams', 'تسارع القلب أو الغثيان أو الارتجاف قبل الاختبارات أو أثناءها'), B('Mind going blank even when you studied', 'فراغ الذهن رغم أنك ذاكرت'), B('Doing much better on untimed or practice work', 'أداء أفضل بكثير في الأعمال غير المؤقتة أو التدريبية'), B('Avoiding or delaying assessments', 'تجنّب التقييمات أو تأجيلها')],
      similar: B('An undiagnosed learning difference can cause exam anxiety (because exams genuinely are harder), so both are worth exploring.', 'قد يسبب اختلاف تعلّم غير مشخّص قلقاً من الاختبارات (لأنها أصعب فعلاً)، لذا يستحق الأمران الاستكشاف.'),
      assess: B('The university counselling / wellbeing team can assess anxiety and offer support; a doctor can check physical causes.', 'يمكن لفريق الإرشاد والرفاه في الجامعة تقييم القلق وتقديم الدعم؛ ويمكن للطبيب التحقق من الأسباب الجسدية.'),
      support: B('Breathing and grounding techniques, practice under timed conditions, spreading revision, counselling (CBT works well), and exam arrangements such as a separate room.', 'تقنيات التنفس والتهدئة، والتدرّب تحت ظروف مؤقتة، وتوزيع المراجعة، والإرشاد (العلاج المعرفي السلوكي فعّال)، وترتيبات اختبار مثل قاعة منفصلة.'),
      myths: B('Myth: anxious students just need to study more. Anxiety blocks recall — support helps more than extra hours.', 'خرافة: الطلبة القلقون يحتاجون فقط إلى مذاكرة أكثر. القلق يعيق الاسترجاع — والدعم يفيد أكثر من الساعات الإضافية.')
    },
    {
      id: 'mood', area: 'wellbeing',
      keys: ['depression', 'depressed', 'sad', 'low mood', 'no motivation', 'unmotivated', 'hopeless', 'الاكتئاب', 'حزين', 'مكتئب', 'لا دافع', 'الإرهاق'],
      title: B('Low mood, burnout and sleep', 'انخفاض المزاج والإرهاق والنوم'),
      what: B('Low mood, depression, burnout and poor sleep make concentrating, remembering and reading much harder — and can look like a learning difficulty. If you’ve felt down, hopeless or lost interest in things for two weeks or more, it’s worth talking to someone. You don’t have to be in crisis to ask for help.', 'انخفاض المزاج والاكتئاب والإرهاق وقلة النوم تجعل التركيز والتذكر والقراءة أصعب بكثير — وقد تبدو كصعوبة تعلّم. إن شعرت بالإحباط أو اليأس أو فقدان الاهتمام لأسبوعين أو أكثر، فمن المفيد التحدث مع شخص ما. لا يلزم أن تكون في أزمة لتطلب المساعدة.'),
      signs: [B('Feeling down or empty most days', 'الشعور بالحزن أو الفراغ معظم الأيام'), B('Losing interest in things you used to enjoy', 'فقدان الاهتمام بأشياء كنت تستمتع بها'), B('Sleeping much more or less than usual; constant tiredness', 'النوم أكثر أو أقل بكثير من المعتاد؛ وتعب دائم'), B('Concentration and motivation collapsing', 'انهيار التركيز والدافع')],
      similar: B('Physical health problems, thyroid issues and medication side-effects can contribute.', 'قد تسهم المشكلات الصحية الجسدية ومشكلات الغدة الدرقية والآثار الجانبية للأدوية.'),
      assess: B('University counselling or a GP/family doctor. If you ever think about harming yourself, please reach out right away — in the UAE call 999 in an emergency, or the 800 HOPE (800 4673) support line.', 'الإرشاد الجامعي أو طبيب الأسرة. إن فكرت يوماً في إيذاء نفسك، فتواصل فوراً — في الإمارات اتصل بـ٩٩٩ في الطوارئ، أو بخط الدعم 800 HOPE (800 4673).'),
      support: B('Counselling, regular sleep and routine, movement, staying connected with people, and flexible deadlines through SAS when you’re unwell.', 'الإرشاد، وانتظام النوم والروتين، والحركة، والبقاء على تواصل مع الناس، ومواعيد نهائية مرنة عبر خدمات الطلبة عندما تكون متعباً.'),
      myths: B('Myth: it’s just laziness. Low mood changes how the brain works; it’s not a character flaw.', 'خرافة: إنه مجرد كسل. انخفاض المزاج يغيّر طريقة عمل الدماغ؛ وليس عيباً في الشخصية.')
    },
    {
      id: 'second-language', area: 'language',
      keys: ['english', 'second language', 'language barrier', 'esl', 'vocabulary', 'not my first language', 'arabic', 'translate', 'اللغة الإنجليزية', 'لغة ثانية', 'المفردات', 'الترجمة', 'العربية'],
      title: B('Studying in a second language', 'الدراسة بلغة ثانية'),
      what: B('Reading and listening in a second language is slower and more tiring for everyone — that is not a disability. A useful clue: if reading feels easy in your first language but hard in English, language load is the more likely explanation. If it is hard in both languages, and has been since childhood, a learning difference is worth exploring.', 'القراءة والاستماع بلغة ثانية أبطأ وأكثر إرهاقاً للجميع — وهذا ليس إعاقة. مؤشر مفيد: إن كانت القراءة سهلة بلغتك الأم لكنها صعبة بالإنجليزية، فعبء اللغة هو التفسير الأرجح. وإن كانت صعبة باللغتين ومنذ الطفولة، فاختلاف التعلّم يستحق الاستكشاف.'),
      signs: [B('Needing to translate in your head', 'الحاجة إلى الترجمة في ذهنك'), B('Technical vocabulary slowing you down', 'المفردات التقنية تبطئك'), B('Much easier in your first language', 'أسهل بكثير بلغتك الأم')],
      similar: B('Dyslexia shows up in both languages; language load mainly in the second.', 'يظهر عسر القراءة باللغتين؛ أما عبء اللغة ففي اللغة الثانية أساساً.'),
      assess: B('Language support centres can assess academic English; SAS can help decide if a learning assessment is also needed.', 'يمكن لمراكز دعم اللغة تقييم الإنجليزية الأكاديمية؛ ويمكن لخدمات الطلبة المساعدة في تحديد الحاجة إلى تقييم التعلّم أيضاً.'),
      support: B('Bilingual glossaries, the writing centre, read-aloud, and extra reading time for English exams.', 'المسارد ثنائية اللغة، ومركز الكتابة، والقراءة الصوتية، ووقت قراءة إضافي لاختبارات الإنجليزية.'),
      myths: B('Myth: struggling in English means you have dyslexia. Compare with your first language first.', 'خرافة: الصعوبة بالإنجليزية تعني عسر القراءة. قارن بلغتك الأم أولاً.')
    },
    {
      id: 'assessment', area: 'general',
      keys: ['assessment', 'get tested', 'get assessed', 'diagnosis', 'diagnosed', 'test for', 'how do i know', 'who can diagnose', 'evaluation', 'psychologist', 'التقييم', 'التشخيص', 'فحص', 'كيف أعرف', 'أخصائي'],
      title: B('Getting assessed', 'الحصول على تقييم'),
      what: B('Only qualified professionals can diagnose a learning difference or condition. At university, Student Accessibility Services (SAS) is the place to start: they listen, can arrange or refer you for an assessment, and can put temporary support in place while you wait. You choose what to share — ERLY never contacts SAS for you.', 'وحدهم المختصون المؤهلون يمكنهم تشخيص اختلاف تعلّم أو حالة ما. في الجامعة، خدمات الطلبة هي نقطة البداية: يستمعون إليك، ويمكنهم ترتيب تقييم أو تحويلك، ويمكنهم توفير دعم مؤقت أثناء الانتظار. أنت من يقرر ما تشاركه — ولا يتواصل إيرلي مع خدمات الطلبة نيابة عنك.'),
      signs: [B('Bring: your ERLY summary (if you want), school reports, any past assessments, and examples of what feels hard', 'أحضر: ملخص إيرلي (إن أردت)، والتقارير المدرسية، وأي تقييمات سابقة، وأمثلة على ما تجده صعباً'), B('Dyslexia / dyscalculia / dysgraphia: educational psychologist or specialist assessor', 'عسر القراءة / الحساب / الكتابة: أخصائي نفسي تربوي أو مقيّم متخصص'), B('ADHD and autism: psychiatrist or clinical psychologist', 'اضطراب الانتباه والتوحد: طبيب نفسي أو أخصائي نفسي إكلينيكي'), B('Hearing: audiologist · Vision: optometrist', 'السمع: أخصائي السمعيات · النظر: أخصائي البصريات')],
      similar: B('', ''),
      assess: B('Assessments usually take 2–4 hours and include interviews, standardised tests and a written report with recommendations.', 'تستغرق التقييمات عادةً ٢–٤ ساعات وتشمل مقابلات واختبارات معيارية وتقريراً مكتوباً بالتوصيات.'),
      support: B('You don’t need a diagnosis to start using tools that help — and you can get temporary support while waiting.', 'لا تحتاج إلى تشخيص لتبدأ باستخدام الأدوات المفيدة — ويمكنك الحصول على دعم مؤقت أثناء الانتظار.'),
      myths: B('Myth: a diagnosis goes on your transcript. Disability information is confidential and only shared with your permission.', 'خرافة: التشخيص يُكتب في سجلك الأكاديمي. معلومات الإعاقة سرية ولا تُشارك إلا بإذنك.')
    },
    {
      id: 'accommodations', area: 'general',
      keys: ['accommodation', 'accommodations', 'adjustments', 'extra time', 'support plan', 'exam arrangements', 'الترتيبات', 'وقت إضافي', 'التسهيلات', 'خطة الدعم'],
      title: B('Accommodations and support', 'الترتيبات والتسهيلات'),
      what: B('Accommodations are changes that remove barriers without lowering standards: extra exam time, a quiet room, readings in advance, recorded lectures, assistive software, flexible deadlines. They are agreed with SAS and shared with lecturers only with your consent.', 'الترتيبات تغييرات تزيل العوائق دون خفض المعايير: وقت إضافي في الاختبار، وقاعة هادئة، وقراءات مسبقة، ومحاضرات مسجلة، وبرامج مساعدة، ومواعيد مرنة. يُتفق عليها مع خدمات الطلبة ولا تُشارك مع المحاضرين إلا بموافقتك.'),
      signs: [B('Exam: extra time, separate room, rest breaks, reader or scribe, computer use', 'الاختبار: وقت إضافي، قاعة منفصلة، استراحات، قارئ أو كاتب، استخدام الحاسوب'), B('Teaching: slides in advance, recordings, captions', 'التدريس: الشرائح مسبقاً، التسجيلات، الترجمة النصية'), B('Tools: text-to-speech, speech-to-text, mind-mapping, planners', 'الأدوات: تحويل النص إلى كلام والكلام إلى نص، والخرائط الذهنية، والمخططات')],
      similar: B('', ''), assess: B('', ''), support: B('', ''), myths: B('Myth: accommodations are an unfair advantage. They level the playing field.', 'خرافة: الترتيبات ميزة غير عادلة. إنها تحقق تكافؤ الفرص.')
    },
    {
      id: 'study', area: 'general',
      keys: ['study tips', 'how to study', 'revision', 'revise', 'exam preparation', 'مذاكرة', 'الدراسة', 'المراجعة'],
      title: B('Studying smarter', 'المذاكرة بذكاء'),
      what: B('Evidence-based techniques beat long hours: test yourself (retrieval practice) instead of re-reading, spread study over days (spacing), mix topics (interleaving), explain ideas in your own words, and pair words with diagrams. Short focused sessions (25–45 minutes) with breaks work for most brains.', 'التقنيات المثبتة علمياً أفضل من الساعات الطويلة: اختبر نفسك (ممارسة الاسترجاع) بدلاً من إعادة القراءة، ووزّع المذاكرة على أيام (التباعد)، وامزج المواضيع، واشرح الأفكار بكلماتك، واربط الكلمات بالرسوم. الجلسات القصيرة المركزة (٢٥–٤٥ دقيقة) مع استراحات تناسب معظم الأدمغة.'),
      signs: [B('Make flashcards or practice questions from each lecture', 'اصنع بطاقات أو أسئلة تدريبية من كل محاضرة'), B('Use the Start-Ramp to make the first step tiny', 'استخدم «منحدر البداية» لجعل الخطوة الأولى صغيرة جداً'), B('Sleep consolidates memory — late-night cramming backfires', 'النوم يثبّت الذاكرة — السهر للحفظ يأتي بنتيجة عكسية')],
      similar: B('', ''), assess: B('', ''), support: B('', ''), myths: B('Myth: highlighting and re-reading are the best ways to learn. They feel productive but are among the weakest.', 'خرافة: التظليل وإعادة القراءة أفضل طرق التعلّم. يشعرانك بالإنتاجية لكنهما من أضعفها.')
    },
    {
      id: 'erly', area: 'general',
      keys: ['erly', 'noor', 'what do you track', 'privacy', 'data', 'who are you', 'what can you do', 'are you a doctor', 'إيرلي', 'نور', 'الخصوصية', 'البيانات', 'من أنت', 'ماذا تفعلين'],
      title: B('About ERLY and Noor', 'عن إيرلي ونور'),
      what: B('I’m Noor, ERLY’s AI study companion. I can explain learning differences, help you with readings and videos, guide you through check-in activities, and — if you want — ask you questions to understand what feels hard and point you to the right support. I’m not a doctor and I can’t diagnose. Everything stays on this device unless you choose to share it.', 'أنا نور، رفيقة الدراسة الذكية في إيرلي. يمكنني شرح اختلافات التعلّم، ومساعدتك في القراءات والفيديوهات، وإرشادك في أنشطة الفحص، وإن أردت أسألك أسئلة لفهم ما يصعب عليك وتوجيهك إلى الدعم المناسب. لست طبيبة ولا أستطيع التشخيص. كل شيء يبقى على هذا الجهاز ما لم تختر مشاركته.'),
      signs: [], similar: B('', ''), assess: B('', ''), support: B('', ''), myths: B('', '')
    }
  ];

  const BLANK = B('', '');
  if (EXTRA && EXTRA.TOPICS) EXTRA.TOPICS.forEach(t => TOPICS.push(t));
  TOPICS.forEach(t => { ['similar', 'assess', 'support', 'myths', 'causes'].forEach(k => { t[k] = t[k] || BLANK; }); t.signs = t.signs || []; t.related = t.related || []; });
  const FAQS = (EXTRA && EXTRA.FAQS) || [];
  const IV_AREAS = ['reading', 'attention', 'maths', 'writing', 'listening', 'vision', 'wellbeing', 'social'];

  // what part of a topic the question is about
  const ASPECTS = [
    ['signs', /sign|symptom|indicat|how do i know|do i have|could i have|am i|look like|traits|علامات|أعراض|هل لدي|هل عندي|كيف أعرف/i],
    ['assess', /test(ed)?|assess|diagnos|who can|where (do|can) i|evaluat|تقييم|تشخيص|فحص|أين|من يشخص/i],
    ['support', /help|support|accommodat|cope|strateg|tips?|treat|what can i do|manage|cure|ساعد|دعم|علاج|نصائح|كيف أتعامل|ماذا أفعل/i],
    ['similar', /differen|confus|same as|vs\.?|versus|or just|mistak|الفرق|بين|أم مجرد/i],
    ['myths', /myth|true that|is it true|خرافة|هل صحيح/i],
    ['what', /what is|what's|what are|explain|mean|define|tell me about|ما هو|ما هي|اشرح|عرّف|أخبرني عن/i]
  ];
  const ORDER = ['what', 'signs', 'similar', 'assess', 'support', 'myths'];
  const norm = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();

  // small typo tolerance: "dyslexa", "dyscalcula", "adhd's"
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  function scoreTopic(tp, t, words) {
    let s = 0;
    tp.keys.forEach(k => {
      const kk = norm(k);
      if (t.includes(' ' + kk + ' ') || (kk.length > 5 && t.includes(kk))) s += kk.split(' ').length * 2 + (kk.length > 8 ? 1 : 0);
      else if (kk.length >= 6 && !kk.includes(' ')) { const max = kk.length >= 9 ? 2 : 1; if (words.some(w => w.length >= 5 && lev(w, kk, max) <= max)) s += 2; }
    });
    return s;
  }
  function rank(text) {
    const t = ' ' + norm(text) + ' ', words = t.trim().split(' ');
    return TOPICS.map(tp => ({ topic: tp, score: scoreTopic(tp, t, words) })).filter(x => x.score >= 2).sort((a, b) => b.score - a.score);
  }
  function find(text) {
    // a named condition beats a general topic: "how do I get tested for ADHD" is about ADHD
    const r = rank(text);
    const cond = r.find(x => x.topic.area !== 'general'), gen = r.find(x => x.topic.area === 'general');
    return cond || gen || null;
  }
  function aspect(text) { const hit = ASPECTS.find(([, re]) => re.test(text)); return hit ? hit[0] : 'what'; }
  function faq(text) {
    const t = ' ' + norm(text) + ' ';
    let best = null, bs = 0;
    FAQS.forEach(f => f.keys.forEach(k => { const kk = norm(k); if (t.includes(' ' + kk + ' ') || (kk.length > 8 && t.includes(kk))) { const sc = kk.length; if (sc > bs) { bs = sc; best = f; } } }));
    return best;
  }

  const CRISIS = /suicid|kill myself|end my life|self[- ]?harm|hurt myself|want to die|don'?t want to live|انتحار|أقتل نفسي|أؤذي نفسي|أريد أن أموت|إنهاء حياتي/i;
  const SELF_DX = /(do|could|might|can) i have|am i (dyslexic|autistic|adhd)|i think i (have|might have|am)|test me|diagnose me|is it (dyslexia|adhd)|هل لدي|هل عندي|هل أنا مصاب|أعتقد أن لدي|شخصني/i;
  const GREET = /^(hi|hello|hey|salam|assalam|good (morning|evening)|مرحبا|أهلا|السلام عليكم|صباح الخير|مساء الخير)\b/i;
  const THANKS = /\b(thanks|thank you|shukran)\b|شكرا|شكراً/i;
  const FEEL = /\b(i feel|i'?m feeling|i am feeling|frustrat|overwhelm|stress(ed)?|struggl|stuck|lost|confus|hard for me|can'?t keep up)\w*|أشعر|محبط|مرهق|متوتر|عالق|ضائع|صعب علي/i;
  // "I always / I keep / I can't …" about a known difficulty: reflect it and offer to explore
  const STRUGGLE = /\b(i (always|keep|often|usually|can'?t|cannot|struggle|find it (hard|difficult)|have (trouble|to)|never)|it'?s (so )?hard (for me )?to)\b|دائماً|لا أستطيع|أجد صعوبة|أعاني/i;
  const QUESTION = /\?|؟|\b(what|how|why|which|who|where|when|can|could|is|are|does|do|should)\b|ماذا|كيف|لماذا|هل|أين|ما هو|ما هي/i;
  // follow-ups that lean on the conversation so far
  const MORE = /^(ok(ay)?,? )?(tell me more|more|go on|continue|keep going|what else|and\??|elaborate|more (info|details?)|explain (more|further)|anything else|أكثر|المزيد|أخبرني المزيد|أخبريني المزيد|أكمل|أكملي|وماذا أيضا|وماذا أيضاً)\b/i;
  const SIMPLE = /\b(simpler|simply|easier|eli5|in short|short version|summari[sz]e|tl;?dr|in simple|plain (words|english)|too long|i don'?t understand)\b|بشكل أبسط|ببساطة|باختصار|لخص|لخصي|لم أفهم/i;
  const EXAMPLE = /\b(example|for instance|like what|such as|what does it look like)\b|مثال|مثلا|مثلاً/i;
  const PRONOUN = /\b(it|this|that|they|them|those)\b|هذا|ذلك|هذه|ذلك/i;
  const COMPARE = /differen|\bvs\.?\b|versus|compare|or is it|الفرق|مقارنة/i;
  const TOPICS_Q = /what (can|do) you (know|answer|talk about|help with)|list (of )?topics|what topics|ماذا تعرفين|ما المواضيع/i;
  const shortName = tp => { const n = tp.title[0].split(' (')[0]; return n === n.toUpperCase() ? n : n.toLowerCase(); };
  const sentences = x => String(x || '').split(/(?<=[.!?؟])\s+/).filter(Boolean);
  const first = (x, n = 1) => sentences(x).slice(0, n).join(' ');

  function chipsFor(tp, asp) {
    const chips = [];
    if (asp !== 'signs' && tp.signs.length) chips.push({ id: `kb:${tp.id}:signs`, en: 'What are the signs?', ar: 'ما العلامات؟' });
    if (asp !== 'assess' && tp.assess[0]) chips.push({ id: `kb:${tp.id}:assess`, en: 'How is it assessed?', ar: 'كيف يُقيَّم؟' });
    if (asp !== 'support' && tp.support[0]) chips.push({ id: `kb:${tp.id}:support`, en: 'What helps?', ar: 'ما الذي يساعد؟' });
    if (IV_AREAS.includes(tp.area) && tp.area !== 'general') chips.push({ id: 'interview:' + tp.area, en: 'Could this be me?', ar: 'هل ينطبق هذا عليّ؟' });
    const rel = tp.related.map(topicById).filter(Boolean)[0];
    if (rel) chips.push({ id: `kb:${rel.id}:what`, en: 'Related: ' + rel.title[0].split(' (')[0], ar: 'ذو صلة: ' + rel.title[1].split(' (')[0] });
    return chips.slice(0, 5);
  }
  // the answer for one topic and one aspect of it
  function compose(tp, asp) {
    const parts = [];
    if (asp === 'signs' && tp.signs.length) parts.push([`Common signs of ${shortName(tp)} in university students:`, 'علامات شائعة لدى طلبة الجامعة:'], ...tp.signs.map(s => ['• ' + s[0], '• ' + s[1]]), tp.similar[0] ? tp.similar : null);
    else if (asp === 'assess' && tp.assess[0]) parts.push(tp.assess);
    else if (asp === 'support' && tp.support[0]) parts.push(tp.support);
    else if (asp === 'similar' && tp.similar[0]) parts.push(tp.similar);
    else if (asp === 'myths' && tp.myths[0]) parts.push(tp.myths);
    else { asp = 'what'; parts.push(tp.what); if (tp.signs.length) parts.push([`For example: ${tp.signs.slice(0, 3).map(x => x[0].toLowerCase()).join('; ')}.`, `على سبيل المثال: ${tp.signs.slice(0, 3).map(x => x[1]).join('؛ ')}.`]); }
    const clean = parts.filter(Boolean);
    return { kind: 'answer', topic: tp.id, aspect: asp, area: tp.area, en: clean.map(p => p[0]).join('\n'), ar: clean.map(p => p[1]).join('\n'), chips: chipsFor(tp, asp), source: tp.title };
  }
  function simple(tp) {
    const en = [`In short: ${first(tp.what[0])}`], ar = [`باختصار: ${first(tp.what[1])}`];
    if (tp.signs[0]) { en.push(`For example: ${tp.signs[0][0].toLowerCase()}.`); ar.push(`مثلاً: ${tp.signs[0][1]}.`); }
    if (tp.support[0]) { en.push(`What helps: ${first(tp.support[0])}`); ar.push(`ما يساعد: ${first(tp.support[1])}`); }
    return { kind: 'answer', topic: tp.id, aspect: 'simple', area: tp.area, en: en.join('\n'), ar: ar.join('\n'), chips: chipsFor(tp, 'what'), source: tp.title };
  }
  function compare(a, b) {
    const sim = a.similar[0] ? a.similar : b.similar;
    const en = [`${a.title[0]}: ${first(a.what[0], 2)}`, `${b.title[0]}: ${first(b.what[0], 2)}`, sim[0] ? `How to tell them apart: ${sim[0]}` : '', 'They can also occur together, so a good assessment looks at both.'].filter(Boolean);
    const ar = [`${a.title[1]}: ${first(a.what[1], 2)}`, `${b.title[1]}: ${first(b.what[1], 2)}`, sim[1] ? `كيف تفرّق بينهما: ${sim[1]}` : '', 'وقد يجتمعان أيضاً، لذا ينظر التقييم الجيد في الاثنين.'].filter(Boolean);
    const chips = [{ id: `kb:${a.id}:signs`, en: `Signs of ${a.title[0].split(' (')[0]}`, ar: `علامات ${a.title[1].split(' (')[0]}` }, { id: `kb:${b.id}:signs`, en: `Signs of ${b.title[0].split(' (')[0]}`, ar: `علامات ${b.title[1].split(' (')[0]}` }, { id: 'kb:assessment:what', en: 'How do I get assessed?', ar: 'كيف أحصل على تقييم؟' }];
    return { kind: 'answer', topic: a.id, aspect: 'compare', area: a.area, compared: [a.id, b.id], en: en.join('\n'), ar: ar.join('\n'), chips, source: a.title };
  }
  function feeling(hit) {
    const chips = hit && IV_AREAS.includes(hit.topic.area) ? [{ id: 'interview:' + hit.topic.area, en: 'Talk it through', ar: 'لنتحدث عن ذلك' }, { id: 'kb:' + hit.topic.id + ':support', en: 'What helps?', ar: 'ما الذي يساعد؟' }] : AREA_CHIPS;
    return { kind: 'feeling', en: 'That sounds really tough, and thank you for telling me. You don’t have to figure it out alone. Would it help to talk through what’s been hardest — reading, listening, focusing, writing, exams, or something else?', ar: 'يبدو هذا صعباً حقاً، وشكراً لإخباري. لا يجب أن تتعامل مع الأمر وحدك. هل يفيد أن نتحدث عن الأصعب — القراءة، أو الاستماع، أو التركيز، أو الكتابة، أو الاختبارات، أو شيء آخر؟', chips };
  }
  function topicList() {
    const groups = [['Learning differences', 'اختلافات التعلّم', ['dyslexia', 'dyscalculia', 'dysgraphia', 'adhd', 'apd', 'dld', 'dcd', 'autism', 'nvld', 'tics']], ['Thinking skills', 'مهارات التفكير', ['executive', 'working-memory', 'processing-speed']], ['Study craft', 'مهارات الدراسة', ['reading-strategies', 'note-taking', 'memory', 'writing-essays', 'time-management', 'procrastination', 'assistive-tech', 'exams']], ['Wellbeing', 'الرفاه', ['anxiety', 'mood', 'sleep', 'burnout', 'panic', 'ocd', 'trauma']], ['Rights & support', 'الحقوق والدعم', ['assessment', 'accommodations', 'sas', 'uae-rights', 'disclosure', 'privacy-law']]];
    const line = (L) => groups.map(g => `${g[L]}: ${g[2].map(topicById).filter(Boolean).map(t => t.title[L].split(' (')[0]).join(', ')}`).join('\n');
    return { kind: 'answer', topic: null, aspect: 'list', en: `I know about ${TOPICS.length - 2} topics and many quick facts. Here are the main ones:\n${line(0)}\nAsk about any of them — or compare two, like “dyslexia vs ADHD”.`, ar: `أعرف عن ${TOPICS.length - 2} موضوعاً وكثيراً من الحقائق السريعة. هذه أهمها:\n${line(1)}\nاسألني عن أي منها — أو قارن بين اثنين، مثل «عسر القراءة مقابل اضطراب الانتباه».`, chips: [{ id: 'kb:dyslexia:what', en: 'What is dyslexia?', ar: 'ما عسر القراءة؟' }, { id: 'kb:executive:what', en: 'Executive function', ar: 'الوظائف التنفيذية' }, { id: 'kb:uae-rights:what', en: 'My rights in the UAE', ar: 'حقوقي في الإمارات' }] };
  }

  // the conversational brain for free text outside a structured interview.
  // ctx = { topic, aspect, seen } from the previous answer, for follow-ups.
  function answer(text, lang, ctx) {
    const raw = String(text || '');
    ctx = ctx || {};
    if (CRISIS.test(raw)) return { kind: 'crisis', en: CRISIS_TEXT[0], ar: CRISIS_TEXT[1] };
    if (TOPICS_Q.test(raw)) return topicList();
    const ranked = rank(raw);
    const conds = ranked.filter(x => x.topic.area !== 'general');
    const hit = find(raw);
    if (FEEL.test(raw) && !QUESTION.test(raw)) return feeling(hit);
    if (hit && STRUGGLE.test(raw) && !SELF_DX.test(raw) && !QUESTION.test(raw) && IV_AREAS.includes(hit.topic.area)) {
      const tp = hit.topic;
      return { kind: 'reflect', topic: tp.id, area: tp.area,
        en: `Thank you for telling me — that sounds really frustrating, and it’s more common than you might think. Lots of things can cause it: tiredness, the material itself, the language — and sometimes a learning difference like ${shortName(tp)}. Would it help if I asked you a few questions, the way a specialist would, to understand it better? You can stop any time.`,
        ar: `شكراً لإخباري — يبدو هذا محبطاً حقاً، وهو أكثر شيوعاً مما تظن. أسباب كثيرة قد تؤدي إليه: التعب، أو المادة نفسها، أو اللغة — وأحياناً اختلاف تعلّم مثل ${tp.title[1].split(' (')[0]}. هل يفيدك أن أطرح عليك بعض الأسئلة، كما يفعل المختص، لنفهم الأمر أكثر؟ يمكنك التوقف في أي وقت.`,
        chips: [{ id: 'interview:' + tp.area, en: 'Yes, ask me', ar: 'نعم، اسأليني' }, { id: `kb:${tp.id}:support`, en: 'Just tips for now', ar: 'نصائح فقط الآن' }, { id: `kb:${tp.id}:what`, en: `What is ${tp.title[0].split(' (')[0]}?`, ar: `ما هو ${tp.title[1].split(' (')[0]}؟` }] };
    }
    if (hit && SELF_DX.test(raw) && IV_AREAS.includes(hit.topic.area)) {
      const tp = hit.topic;
      return { kind: 'self-check', topic: tp.id, area: tp.area,
        en: `That’s a really good question to ask — and you’re not alone in wondering. I can’t diagnose anything, but I can help you think it through. ${tp.what[0].split('. ').slice(0, 2).join('. ')}. Common signs in students include: ${tp.signs.slice(0, 3).map(x => x[0].toLowerCase()).join('; ')}. If you like, I can ask you some questions — the same kinds of things a specialist would ask — and tell you honestly whether it looks worth a formal assessment.`,
        ar: `هذا سؤال جيد جداً — ولست وحدك من يتساءل. لا أستطيع التشخيص، لكن يمكنني مساعدتك في التفكير فيه. ${tp.what[1].split('. ').slice(0, 2).join('. ')}. من العلامات الشائعة لدى الطلبة: ${tp.signs.slice(0, 3).map(x => x[1]).join('؛ ')}. إن أردت، يمكنني طرح بعض الأسئلة — من النوع الذي يطرحه المختص — وأخبرك بصدق إن كان الأمر يستحق تقييماً رسمياً.`,
        chips: [{ id: 'interview:' + tp.area, en: 'Yes, ask me the questions', ar: 'نعم، اسأليني' }, { id: 'kb:' + tp.id + ':signs', en: 'Tell me more about the signs', ar: 'أخبريني أكثر عن العلامات' }, { id: 'kb:' + tp.id + ':assess', en: 'How is it assessed?', ar: 'كيف يُقيَّم؟' }] };
    }
    // "dyslexia vs ADHD", or "how is that different from ADHD?" after talking about dyslexia
    if (COMPARE.test(raw)) {
      if (conds.length >= 2) return compare(conds[0].topic, conds[1].topic);
      const prev = ctx.topic && topicById(ctx.topic);
      if (conds.length === 1 && prev && prev.id !== conds[0].topic.id && prev.area !== 'general') return compare(prev, conds[0].topic);
    }
    const f = faq(raw);
    if (f) { const tp = topicById(f.topic); return { kind: 'answer', topic: f.topic, aspect: 'faq', area: tp ? tp.area : 'general', en: f.a[0], ar: f.a[1], chips: tp ? chipsFor(tp, 'faq') : [], source: tp ? tp.title : null }; }
    // follow-ups about the topic we were just talking about
    const prev = ctx.topic && topicById(ctx.topic);
    if (prev && (!hit || (hit.topic.id === prev.id))) {
      if (SIMPLE.test(raw)) return simple(prev);
      if (MORE.test(raw.trim())) {
        const seen = (ctx.seen || [ctx.aspect]).filter(Boolean);
        const next = ORDER.find(a => !seen.includes(a) && (a === 'what' || (a === 'signs' ? prev.signs.length : prev[a][0])));
        if (next) return compose(prev, next);
        return { kind: 'answer', topic: prev.id, aspect: 'done', area: prev.area, en: `That’s everything I have on ${shortName(prev)}. Want to explore something related, or talk about how it affects you?`, ar: `هذا كل ما لدي عن ${prev.title[1].split(' (')[0]}. هل تريد استكشاف موضوع ذي صلة، أو الحديث عن أثره عليك؟`, chips: chipsFor(prev, 'done') };
      }
      if (EXAMPLE.test(raw) && prev.signs.length) return compose(prev, 'signs');
      if (!hit && (PRONOUN.test(raw) || ASPECTS.slice(0, 5).some(([, re]) => re.test(raw)))) return compose(prev, aspect(raw));
    }
    if (hit) return compose(hit.topic, aspect(raw));
    if (GREET.test(raw)) return { kind: 'smalltalk', en: 'Hey! Good to see you. What would you like to do — ask me something, get help with a reading or video, or talk about how studying is going?', ar: 'أهلاً! سعيدة برؤيتك. ماذا تود أن تفعل — تسألني شيئاً، أو تحصل على مساعدة في قراءة أو فيديو، أو نتحدث عن سير دراستك؟' };
    if (THANKS.test(raw)) return { kind: 'smalltalk', en: 'Any time! I’m right here whenever you need me.', ar: 'في أي وقت! أنا هنا متى احتجتني.' };
    if (FEEL.test(raw)) return feeling(null);
    return { kind: 'unknown', en: 'I’m not completely sure I understood — I know about learning differences (like dyslexia, ADHD, dyscalculia, DLD), thinking skills, study techniques, exams, wellbeing, and your rights and support in the UAE. Could you say it another way, or pick one of these?', ar: 'لست متأكدة تماماً أنني فهمت — أعرف عن اختلافات التعلّم (مثل عسر القراءة واضطراب الانتباه وعسر الحساب واضطراب اللغة)، ومهارات التفكير، وتقنيات الدراسة، والاختبارات، والرفاه، وحقوقك والدعم في الإمارات. هل يمكنك قولها بطريقة أخرى، أو اختيار أحد هذه؟',
      chips: [{ id: 'kb:dyslexia:what', en: 'What is dyslexia?', ar: 'ما عسر القراءة؟' }, { id: 'kb:adhd:signs', en: 'Signs of ADHD', ar: 'علامات اضطراب الانتباه' }, { id: 'kb:assessment:what', en: 'How do I get assessed?', ar: 'كيف أحصل على تقييم؟' }, { id: 'topics', en: 'What can you answer?', ar: 'عمَّ تستطيعين الإجابة؟' }, { id: 'talk', en: 'Talk about my studying', ar: 'لنتحدث عن دراستي' }] };
  }
  const AREA_CHIPS = [
    { id: 'interview:reading', en: 'Reading', ar: 'القراءة' }, { id: 'interview:listening', en: 'Listening', ar: 'الاستماع' }, { id: 'interview:attention', en: 'Focus & organising', ar: 'التركيز والتنظيم' },
    { id: 'interview:writing', en: 'Writing', ar: 'الكتابة' }, { id: 'interview:maths', en: 'Numbers & maths', ar: 'الأرقام والرياضيات' }, { id: 'interview:wellbeing', en: 'Stress & mood', ar: 'التوتر والمزاج' }
  ];
  const CRISIS_TEXT = B('I’m really glad you told me, and I want you to be safe right now. Please reach out to someone immediately: in the UAE, call 999 for emergencies, or the 800 HOPE (800 4673) mental-health support line. Your university counselling service can also see you urgently. If you can, tell someone you trust who is near you. You matter, and help is available.',
    'أنا ممتنة حقاً لأنك أخبرتني، وأريدك أن تكون بأمان الآن. أرجو أن تتواصل مع أحد فوراً: في الإمارات اتصل بـ٩٩٩ للطوارئ، أو بخط دعم الصحة النفسية 800 HOPE (800 4673). ويمكن لخدمة الإرشاد في جامعتك مقابلتك بشكل عاجل. إن استطعت، أخبر شخصاً تثق به قريباً منك. أنت مهم، والمساعدة متاحة.');

  function topicById(id) { return TOPICS.find(t => t.id === id) || null; }
  function aspectAnswer(id, asp) { const tp = topicById(id); return tp ? (asp === 'simple' ? simple(tp) : compose(tp, asp || 'what')) : null; }
  // compact grounding text for an external model (RAG): the best two topics
  function context(text, lang) {
    const L = lang === 'ar' ? 1 : 0;
    const r = rank(text).slice(0, 2);
    if (!r.length) return '';
    return r.map(({ topic: t }) => [t.title[L], t.what[L], 'Signs: ' + t.signs.map(s => s[L]).join('; '), 'Similar: ' + t.similar[L], 'Assessment: ' + t.assess[L], 'Support: ' + t.support[L], 'Myths: ' + t.myths[L]].filter(x => x && !/:\s*$/.test(x)).join('\n')).join('\n\n');
  }
  return { TOPICS, FAQS, AREA_CHIPS, CRISIS, CRISIS_TEXT, answer, find, rank, aspect, aspectAnswer, topicById, context, norm, faq, lev };
});
