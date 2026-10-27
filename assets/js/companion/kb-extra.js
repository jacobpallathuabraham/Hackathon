/* ERLY — Noor's extended knowledge (EN + AR).
   More learning differences, thinking skills, study craft, wellbeing, and the
   UAE context (People of Determination, data protection, how SAS works).
   Same shape as the core topics in knowledge.js; written in ERLY's own words
   from widely used public guidance. General information, not medical advice.
   Pure data: window.ERLY_KB_EXTRA in the browser, CommonJS for the tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_KB_EXTRA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const B = (en, ar) => [en, ar];
  const E = B('', '');
  const T = (o) => Object.assign({ signs: [], similar: E, assess: E, support: E, myths: E, causes: E, related: [] }, o);

  const TOPICS = [
    /* ---------- more learning differences ---------- */
    T({
      id: 'dld', area: 'listening',
      keys: ['developmental language disorder', 'dld', 'language disorder', 'specific language impairment', 'find the right words', 'word finding', 'can\'t find words', 'understanding instructions', 'long instructions', 'اضطراب اللغة النمائي', 'اضطراب اللغة', 'أجد الكلمات', 'إيجاد الكلمات'],
      title: B('Developmental Language Disorder (DLD)', 'اضطراب اللغة النمائي'),
      what: B('DLD is a lifelong difference in learning and using spoken language — understanding what people say, finding words, and putting sentences together — that isn’t explained by hearing loss or another condition. It affects about 7% of people (two in every classroom), yet it is far less known than dyslexia. It often affects reading comprehension and writing too.', 'اضطراب اللغة النمائي اختلاف مستمر مدى الحياة في تعلّم اللغة المنطوقة واستخدامها — فهم ما يقوله الناس، وإيجاد الكلمات، وتركيب الجمل — ولا يفسّره ضعف السمع أو حالة أخرى. يصيب نحو ٧٪ من الناس (اثنين في كل صف)، لكنه أقل شهرة بكثير من عسر القراءة. وكثيراً ما يؤثر في فهم المقروء والكتابة أيضاً.'),
      signs: [B('Long or fast spoken instructions are hard to follow', 'صعوبة متابعة التعليمات الطويلة أو السريعة'), B('Word-finding pauses: “the thing… you know…”', 'توقفات للبحث عن الكلمة: «الشيء… تعرف…»'), B('Understanding complex sentences, idioms or jokes takes longer', 'فهم الجمل المعقدة أو التعابير أو النكات يستغرق وقتاً أطول'), B('Written work is short or simple compared with your ideas', 'الكتابة قصيرة أو بسيطة مقارنةً بأفكارك'), B('Learning new subject vocabulary is slow', 'تعلّم مفردات المادة الجديدة بطيء')],
      similar: B('Hearing loss, auditory processing difficulties, ADHD, autism and second-language learning can look similar. DLD shows in your first language and from early childhood.', 'قد يبدو ضعف السمع وصعوبات المعالجة السمعية واضطراب الانتباه والتوحد وتعلّم لغة ثانية مشابهاً. يظهر اضطراب اللغة النمائي في لغتك الأم ومنذ الطفولة المبكرة.'),
      assess: B('A speech and language therapist assesses understanding and use of language with standardised tests, after a hearing check.', 'يقيّم أخصائي النطق واللغة فهم اللغة واستخدامها باختبارات معيارية، بعد فحص السمع.'),
      support: B('Written copies of instructions, recorded lectures, subject glossaries with pictures, extra time, checking understanding by paraphrasing, and speech and language therapy strategies.', 'نسخ مكتوبة من التعليمات، وتسجيل المحاضرات، ومسارد مصورة للمادة، ووقت إضافي، والتحقق من الفهم بإعادة الصياغة، واستراتيجيات علاج النطق واللغة.'),
      myths: B('Myth: children grow out of it. Many adults still have DLD; they just learn ways around it.', 'خرافة: أن الأطفال يتجاوزونه مع العمر. كثير من البالغين ما زال لديهم؛ لكنهم يتعلمون طرقاً للتعامل معه.'),
      related: ['apd', 'dyslexia', 'second-language']
    }),
    T({
      id: 'nvld', area: 'vision',
      keys: ['nonverbal learning disability', 'non-verbal learning', 'nvld', 'nld', 'visual spatial', 'visual-spatial', 'spatial reasoning', 'maps and diagrams', 'صعوبات التعلم غير اللفظية', 'المكاني البصري'],
      title: B('Non-verbal learning difficulties (NVLD)', 'صعوبات التعلّم غير اللفظية'),
      what: B('NVLD describes strong verbal skills alongside real difficulty with visual-spatial reasoning: diagrams, graphs, maps, geometry, handwriting layout and sometimes reading body language. It isn’t a separate diagnosis in DSM-5, so it is usually described within an assessment report.', 'تصف صعوبات التعلّم غير اللفظية مهارات لفظية قوية مع صعوبة حقيقية في الاستدلال البصري المكاني: الرسوم والمخططات والخرائط والهندسة وتنظيم الكتابة على الصفحة، وأحياناً قراءة لغة الجسد. ليست تشخيصاً مستقلاً في DSM-5، لذا توصف عادةً داخل تقرير التقييم.'),
      signs: [B('Diagrams and graphs feel much harder than text', 'الرسوم والمخططات أصعب بكثير من النص'), B('Getting lost easily, trouble with maps', 'الضياع بسهولة وصعوبة قراءة الخرائط'), B('Geometry and spatial maths are hard; arithmetic is fine', 'الهندسة والرياضيات المكانية صعبة بينما الحساب جيد'), B('Messy page layout, misaligned columns', 'تنظيم غير مرتب للصفحة وأعمدة غير متراصفة')],
      similar: B('Dyspraxia (DCD), dyscalculia, vision problems and autism can overlap.', 'قد يتداخل مع عسر التناسق الحركي وعسر الحساب ومشكلات النظر والتوحد.'),
      assess: B('An educational psychologist compares verbal and visual-spatial reasoning and looks at everyday impact.', 'يقارن الأخصائي النفسي التربوي الاستدلال اللفظي بالبصري المكاني وينظر في الأثر اليومي.'),
      support: B('Talk-through descriptions of diagrams (alt text), written step-by-step instructions, graph paper, and turning visuals into verbal summaries. ERLY’s “Diagram walk-through” tool does exactly this.', 'وصف شفهي للرسوم (نص بديل)، وتعليمات مكتوبة خطوة بخطوة، وورق مربعات، وتحويل المرئيات إلى ملخصات لفظية. أداة «شرح الرسم» في إيرلي تفعل ذلك تماماً.'),
      related: ['dcd', 'dyscalculia', 'vision']
    }),
    T({
      id: 'tics', area: 'social',
      keys: ['tourette', 'tourettes', 'tics', 'tic disorder', 'twitch', 'vocal tic', 'متلازمة توريت', 'العرّات', 'لزمات'],
      title: B('Tourette syndrome and tic disorders', 'متلازمة توريت واضطرابات العرّات'),
      what: B('Tics are sudden, repeated movements or sounds that are hard to hold back — like an urge that builds until it’s released. Tourette syndrome means several motor tics and at least one vocal tic for over a year, starting in childhood. Tics often get worse with stress or tiredness and often come with ADHD, OCD or anxiety.', 'العرّات حركات أو أصوات مفاجئة متكررة يصعب كبحها — كإلحاح يتصاعد حتى يخرج. متلازمة توريت تعني عدة عرّات حركية وعرّة صوتية واحدة على الأقل لأكثر من عام، تبدأ في الطفولة. تزداد العرّات غالباً مع التوتر أو التعب وكثيراً ما ترافق اضطراب الانتباه أو الوسواس القهري أو القلق.'),
      assess: B('A neurologist or psychiatrist diagnoses from history and observation.', 'يشخّصها طبيب أعصاب أو طبيب نفسي من التاريخ والملاحظة.'),
      support: B('A separate exam room, breaks, permission to leave class briefly, and behavioural therapy (CBIT) which helps many people.', 'قاعة امتحان منفصلة، واستراحات، وإذن بمغادرة الصف لفترة قصيرة، والعلاج السلوكي (CBIT) الذي يساعد كثيرين.'),
      myths: B('Myth: Tourette means swearing. Only a minority have that tic (coprolalia).', 'خرافة: أن توريت يعني الشتم. أقلية فقط لديهم هذه العرّة.'),
      related: ['adhd', 'ocd', 'anxiety']
    }),
    T({
      id: 'ocd', area: 'wellbeing',
      keys: ['ocd', 'obsessive', 'compulsive', 'intrusive thoughts', 'checking things', 'have to redo', 'perfect before', 'الوسواس القهري', 'وسواس', 'أفكار متطفلة'],
      title: B('OCD (obsessive-compulsive disorder)', 'الوسواس القهري'),
      what: B('OCD is a mental-health condition with unwanted, distressing thoughts (obsessions) and repeated actions or mental rituals (compulsions) done to ease that distress. In study it can look like re-reading a line until it feels “right”, rewriting notes, or checking work again and again. It is very treatable.', 'الوسواس القهري حالة نفسية فيها أفكار غير مرغوبة ومزعجة (وساوس) وأفعال أو طقوس ذهنية متكررة (أفعال قهرية) لتخفيف ذلك الانزعاج. في الدراسة قد يظهر كإعادة قراءة سطر حتى «يبدو صحيحاً»، أو إعادة كتابة الملاحظات، أو مراجعة العمل مراراً. وهو قابل للعلاج جداً.'),
      signs: [B('Re-reading or rewriting until it feels exactly right', 'إعادة القراءة أو الكتابة حتى يبدو الأمر صحيحاً تماماً'), B('Checking submissions many times, fear of a mistake', 'مراجعة التسليمات مرات عديدة والخوف من الخطأ'), B('Rituals that take more than an hour a day', 'طقوس تستغرق أكثر من ساعة يومياً')],
      similar: B('Re-reading from OCD is about a feeling of “not right”; re-reading from dyslexia is about decoding. Perfectionism and anxiety can also look similar.', 'إعادة القراءة في الوسواس سببها شعور بأن الأمر «ليس صحيحاً»؛ أما في عسر القراءة فسببها فك الرموز. وقد يبدو الكمالية والقلق مشابهين.'),
      assess: B('A psychologist or psychiatrist, using a clinical interview and validated questionnaires.', 'أخصائي نفسي أو طبيب نفسي، بمقابلة سريرية واستبانات معتمدة.'),
      support: B('CBT with exposure and response prevention (ERP) is the leading treatment; sometimes medication. Extra time and deadline flexibility can help while treatment works.', 'العلاج المعرفي السلوكي بالتعرّض ومنع الاستجابة هو العلاج الرئيسي؛ وأحياناً الدواء. ويساعد الوقت الإضافي ومرونة المواعيد أثناء العلاج.'),
      myths: B('Myth: OCD just means being tidy. It is distressing and time-consuming, not a personality quirk.', 'خرافة: أن الوسواس يعني حب الترتيب. إنه مزعج ويستهلك الوقت، وليس طبعاً شخصياً.'),
      related: ['anxiety', 'tics', 'mood']
    }),
    T({
      id: 'trauma', area: 'wellbeing',
      keys: ['trauma', 'ptsd', 'post traumatic', 'flashbacks', 'nightmares', 'something bad happened', 'صدمة', 'اضطراب ما بعد الصدمة', 'كوابيس'],
      title: B('Trauma and PTSD', 'الصدمة واضطراب ما بعد الصدمة'),
      what: B('After a frightening or overwhelming event, the brain can stay on high alert. That makes concentration, memory and reading much harder — not because of a learning difference, but because the body is busy keeping you safe. PTSD is when flashbacks, avoidance and feeling on edge last more than a month.', 'بعد حدث مخيف أو مرهق، قد يبقى الدماغ في حالة تأهب. هذا يجعل التركيز والذاكرة والقراءة أصعب بكثير — ليس بسبب اختلاف تعلّم، بل لأن الجسم منشغل بحمايتك. اضطراب ما بعد الصدمة هو حين تستمر الذكريات الاقتحامية والتجنّب والتوتر أكثر من شهر.'),
      signs: [B('Sudden drop in concentration after a hard event', 'تراجع مفاجئ في التركيز بعد حدث صعب'), B('Sleep problems and nightmares', 'مشكلات في النوم وكوابيس'), B('Feeling jumpy, numb or detached', 'الشعور بالتوتر أو الخدر أو الانفصال')],
      similar: B('A sudden change, rather than a lifelong pattern, points away from dyslexia or ADHD — ERLY’s “sudden strain” profile exists for this reason.', 'التغيّر المفاجئ، لا النمط الممتد طوال الحياة، يُبعد احتمال عسر القراءة أو اضطراب الانتباه — ولهذا يوجد نمط «الضغط المفاجئ» في إيرلي.'),
      assess: B('A counsellor, psychologist or psychiatrist. Your university counselling service is a good first step.', 'مرشد أو أخصائي نفسي أو طبيب نفسي. خدمة الإرشاد في جامعتك خطوة أولى جيدة.'),
      support: B('Trauma-focused therapy (such as TF-CBT or EMDR) works well. Short-term academic adjustments — extensions, deferrals — are common and fair.', 'العلاج المركّز على الصدمة (مثل TF-CBT أو EMDR) فعّال. والتعديلات الأكاديمية قصيرة المدى — التمديد والتأجيل — شائعة وعادلة.'),
      related: ['mood', 'anxiety', 'sleep']
    }),
    T({
      id: 'stammer', area: 'social',
      keys: ['stammer', 'stutter', 'stuttering', 'stammering', 'speech blocks', 'التأتأة', 'التلعثم'],
      title: B('Stammering (stuttering)', 'التأتأة'),
      what: B('Stammering is a neurological difference in speech: repeating sounds, stretching them, or getting “blocked”. About 1% of adults stammer. It is not caused by nerves, though stress can make it more noticeable.', 'التأتأة اختلاف عصبي في الكلام: تكرار الأصوات أو مدّها أو «الانحباس». نحو ١٪ من البالغين يتأتئون. لا يسببها التوتر، وإن كان قد يجعلها أوضح.'),
      support: B('Alternatives to timed oral presentations, extra time in vivas, not being rushed or finished for, and speech therapy if you want it.', 'بدائل للعروض الشفهية الموقوتة، ووقت إضافي في الاختبارات الشفهية، وعدم الاستعجال أو إكمال الكلام عنك، وعلاج النطق إن أردت.'),
      myths: B('Myth: people who stammer are anxious or less capable. Neither is true.', 'خرافة: أن من يتأتئ قلق أو أقل قدرة. كلاهما غير صحيح.'),
      related: ['presentations', 'anxiety']
    }),
    T({
      id: 'brain-injury', area: 'attention',
      keys: ['concussion', 'head injury', 'brain injury', 'hit my head', 'tbi', 'ارتجاج', 'إصابة في الرأس', 'إصابة الدماغ'],
      title: B('Concussion and acquired brain injury', 'الارتجاج وإصابات الدماغ المكتسبة'),
      what: B('After a concussion or head injury, reading, focus, memory and screen tolerance can drop for weeks or months, along with headaches and fatigue. This is a medical issue first — see a doctor, especially if symptoms are new.', 'بعد ارتجاج أو إصابة في الرأس، قد تتراجع القراءة والتركيز والذاكرة وتحمّل الشاشات لأسابيع أو أشهر، مع صداع وتعب. هذه مسألة طبية أولاً — راجع طبيباً خاصة إن كانت الأعراض جديدة.'),
      support: B('A graded return to study, rest breaks, reduced screen time, audio versions of readings and temporary exam adjustments.', 'عودة تدريجية للدراسة، واستراحات، وتقليل وقت الشاشة، ونسخ صوتية من القراءات، وتعديلات مؤقتة في الامتحانات.'),
      related: ['vision', 'sleep']
    }),
    T({
      id: 'health', area: 'wellbeing',
      keys: ['chronic illness', 'long term condition', 'chronic pain', 'fatigue', 'always tired', 'migraine', 'epilepsy', 'diabetes', 'long covid', 'مرض مزمن', 'تعب دائم', 'الصداع النصفي', 'الصرع', 'السكري'],
      title: B('Long-term health conditions and fatigue', 'الحالات الصحية المزمنة والإرهاق'),
      what: B('Conditions like migraine, epilepsy, diabetes, chronic pain, long COVID or anaemia can affect concentration, energy and attendance. They count as disabilities for support purposes when they have a long-term effect on study — and SAS can help.', 'قد تؤثر حالات مثل الصداع النصفي والصرع والسكري والألم المزمن وكوفيد الطويل وفقر الدم في التركيز والطاقة والحضور. وتُعد إعاقة لأغراض الدعم حين يكون لها أثر طويل على الدراسة — ويمكن لخدمات الطلبة المساعدة.'),
      support: B('Flexible deadlines, rest breaks in exams, recorded lectures, an attendance plan and a quiet room. Bring a doctor’s letter to SAS.', 'مواعيد مرنة، واستراحات في الامتحانات، وتسجيل المحاضرات، وخطة حضور، وغرفة هادئة. أحضر خطاباً من طبيبك إلى خدمات الطلبة.'),
      related: ['sleep', 'accommodations', 'sas']
    }),
    T({
      id: 'sensory', area: 'social',
      keys: ['sensory', 'sensory overload', 'too loud', 'noise sensitive', 'bright lights', 'overstimulated', 'الحمل الحسي', 'حساسية للضوضاء', 'الأضواء الساطعة'],
      title: B('Sensory sensitivity and overload', 'الحساسية الحسية والحمل الزائد'),
      what: B('Some brains process sound, light, touch or crowds more intensely. In a loud lecture hall or a bright exam room, that can use up the energy you need for thinking. It is common in autism and ADHD, and also happens on its own.', 'تعالج بعض الأدمغة الصوت أو الضوء أو اللمس أو الزحام بشدة أكبر. في قاعة محاضرات صاخبة أو قاعة امتحان ساطعة، قد يستهلك ذلك الطاقة التي تحتاجها للتفكير. وهو شائع في التوحد واضطراب الانتباه، ويحدث أيضاً وحده.'),
      support: B('Noise-cancelling headphones, a seat near the exit, a smaller exam room, tinted or dimmable screens, and planned quiet breaks.', 'سماعات عازلة للضوضاء، ومقعد قرب المخرج، وقاعة امتحان أصغر، وشاشات معتمة أو قابلة للتعتيم، واستراحات هادئة مخطط لها.'),
      related: ['autism', 'adhd', 'visual-stress']
    }),
    T({
      id: 'visual-stress', area: 'vision',
      keys: ['visual stress', 'irlen', 'meares irlen', 'scotopic', 'coloured overlays', 'colored overlays', 'tinted glasses', 'text moves', 'words move', 'words swim', 'white page glare', 'الإجهاد البصري', 'الشفافيات الملونة', 'الكلمات تتحرك'],
      title: B('Visual stress (sometimes called Meares-Irlen)', 'الإجهاد البصري (يسمى أحياناً ميرز-إرلين)'),
      what: B('Some people describe text that seems to move, blur or glare on a white page, with headaches when reading. Coloured overlays help some of them. The research is mixed, and it is not the same as dyslexia — so the first step is always a full eye test with an optometrist, including binocular vision.', 'يصف بعض الناس نصاً يبدو أنه يتحرك أو يتشوش أو يلمع على الصفحة البيضاء، مع صداع عند القراءة. تساعد الشفافيات الملونة بعضهم. الأبحاث متباينة، وهو ليس عسر القراءة — لذا الخطوة الأولى دائماً فحص نظر شامل لدى أخصائي البصريات يشمل الرؤية بالعينين.'),
      support: B('An optometrist check first. Then try a tinted background, larger spacing and ERLY’s calmer font settings — they cost nothing.', 'فحص لدى أخصائي البصريات أولاً. ثم جرّب خلفية ملونة وتباعداً أكبر وإعدادات الخط الأهدأ في إيرلي — فهي مجانية.'),
      myths: B('Myth: a coloured overlay treats dyslexia. It doesn’t; dyslexia is about language sounds.', 'خرافة: أن الشفافيات الملونة تعالج عسر القراءة. لا تفعل؛ فعسر القراءة يتعلق بأصوات اللغة.'),
      related: ['vision', 'dyslexia']
    }),
    T({
      id: 'colour-vision', area: 'vision',
      keys: ['colour blind', 'color blind', 'colour blindness', 'color blindness', 'red green', 'عمى الألوان'],
      title: B('Colour vision deficiency', 'قصور رؤية الألوان'),
      what: B('About 1 in 12 men and 1 in 200 women have some colour vision deficiency, usually red-green. It mainly matters when charts, maps or slides rely on colour alone.', 'نحو رجل من كل ١٢ وامرأة من كل ٢٠٠ لديهم قصور ما في رؤية الألوان، غالباً الأحمر والأخضر. يهم الأمر أساساً حين تعتمد الرسوم أو الخرائط أو الشرائح على اللون وحده.'),
      support: B('Ask for materials that use labels and patterns, not just colour. ERLY’s charts use labelled, colour-blind-safe palettes.', 'اطلب مواد تستخدم التسميات والأنماط لا اللون وحده. تستخدم رسوم إيرلي ألواناً آمنة مع تسميات.'),
      related: ['vision']
    }),
    T({
      id: 'twice-exceptional', area: 'general',
      keys: ['twice exceptional', '2e', 'gifted', 'smart but', 'clever but', 'high iq', 'intelligent but struggle', 'موهوب', 'ذكي لكن', 'الموهوبين'],
      title: B('Gifted and struggling (“twice exceptional”)', 'موهوب ومتعثّر («مزدوج الاستثنائية»)'),
      what: B('You can be very able and have a learning difference at the same time. Strong reasoning can hide dyslexia or ADHD for years — until university workload outgrows your workarounds. That late surfacing is common and it doesn’t mean you “got worse”.', 'يمكن أن تكون قادراً جداً ولديك اختلاف تعلّم في الوقت نفسه. قد يُخفي الاستدلال القوي عسر القراءة أو اضطراب الانتباه لسنوات — حتى يتجاوز عبء الجامعة حيلك. هذا الظهور المتأخر شائع ولا يعني أنك «تراجعت».'),
      signs: [B('Great in discussion, much weaker on timed written work', 'ممتاز في النقاش وأضعف بكثير في الكتابة الموقوتة'), B('A big gap between what you understand and what you can show', 'فجوة كبيرة بين ما تفهمه وما تستطيع إظهاره'), B('School felt easy, university suddenly doesn’t', 'كانت المدرسة سهلة، والجامعة فجأة ليست كذلك')],
      assess: B('A full psycho-educational assessment shows the profile — strengths and the specific weaker skills.', 'يُظهر التقييم النفسي التربوي الشامل الملف — نقاط القوة والمهارات الأضعف تحديداً.'),
      related: ['dyslexia', 'adhd', 'assessment']
    }),

    /* ---------- thinking skills ---------- */
    T({
      id: 'executive', area: 'attention',
      keys: ['executive function', 'executive dysfunction', 'executive functioning', 'planning', 'organising', 'organizing', 'getting started', 'can\'t start', 'task initiation', 'losing things', 'forgetting deadlines', 'الوظائف التنفيذية', 'التخطيط', 'التنظيم', 'البدء'],
      title: B('Executive function (planning, starting, finishing)', 'الوظائف التنفيذية (التخطيط والبدء والإنجاز)'),
      what: B('Executive functions are the brain’s management skills: planning, starting tasks, switching between them, keeping track of time, holding things in mind and controlling impulses. Everyone’s vary; they are often weaker in ADHD, and they drop for anyone under stress or short of sleep.', 'الوظائف التنفيذية هي مهارات الإدارة في الدماغ: التخطيط، وبدء المهام، والتنقل بينها، وتتبع الوقت، والاحتفاظ بالأشياء في الذهن، وضبط الاندفاع. تتفاوت لدى الجميع؛ وغالباً تكون أضعف في اضطراب الانتباه، وتتراجع لدى أي شخص تحت الضغط أو قلة النوم.'),
      signs: [B('Knowing what to do but not being able to start', 'تعرف ما يجب فعله لكنك لا تستطيع البدء'), B('Underestimating how long things take', 'تقدير وقت أقل مما تستغرقه الأمور'), B('Starting many things, finishing few', 'بدء أشياء كثيرة وإنهاء القليل'), B('Last-minute rushes before every deadline', 'اندفاع في اللحظة الأخيرة قبل كل موعد')],
      support: B('Make the first step tiny (ERLY’s Start-Ramp), externalise everything — calendars, timers, checklists — work in short sprints, and use body-doubling (studying next to someone).', 'اجعل الخطوة الأولى صغيرة جداً (منحدر البداية في إيرلي)، وأخرج كل شيء من رأسك — تقويمات ومؤقتات وقوائم — واعمل في جولات قصيرة، وجرّب الدراسة بجانب شخص آخر.'),
      related: ['adhd', 'procrastination', 'time-management']
    }),
    T({
      id: 'working-memory', area: 'attention',
      keys: ['working memory', 'short term memory', 'forget what i read', 'forget instructions', 'lose track', 'mental maths', 'can\'t remember', 'memory problems', 'الذاكرة العاملة', 'الذاكرة قصيرة المدى', 'أنسى ما قرأت', 'أنسى'],
      title: B('Working memory', 'الذاكرة العاملة'),
      what: B('Working memory is the brain’s sticky note: holding a few things in mind while you use them — a phone number, the start of a long sentence, the steps of a sum. When it is small, long sentences, multi-step instructions and note-taking while listening become hard. Weak working memory is common in dyslexia, ADHD and DLD.', 'الذاكرة العاملة هي الورقة اللاصقة في الدماغ: الاحتفاظ ببضعة أشياء في الذهن أثناء استخدامها — رقم هاتف، بداية جملة طويلة، خطوات عملية حسابية. حين تكون محدودة، تصعب الجمل الطويلة والتعليمات متعددة الخطوات وتدوين الملاحظات أثناء الاستماع. ضعفها شائع في عسر القراءة واضطراب الانتباه واضطراب اللغة.'),
      signs: [B('Forgetting the start of a sentence by the end', 'نسيان بداية الجملة عند نهايتها'), B('Losing your place in multi-step problems', 'فقدان التسلسل في المسائل متعددة الخطوات'), B('Struggling to listen and write notes at once', 'صعوبة الاستماع والكتابة في آن واحد')],
      support: B('Write things down immediately, chunk information, use checklists and worked examples, record lectures so you can listen and note separately, and use ERLY’s 3-line summaries.', 'دوّن الأشياء فوراً، وقسّم المعلومات، واستخدم القوائم والأمثلة المحلولة، وسجّل المحاضرات لتستمع وتدوّن بشكل منفصل، واستخدم ملخصات إيرلي من ٣ أسطر.'),
      myths: B('Myth: brain-training games fix working memory. They improve the game, not everyday learning; strategies work better.', 'خرافة: أن ألعاب تدريب الدماغ تُصلح الذاكرة العاملة. إنها تحسّن اللعبة لا التعلّم اليومي؛ الاستراتيجيات أنفع.'),
      related: ['executive', 'note-taking', 'memory']
    }),
    T({
      id: 'processing-speed', area: 'reading',
      keys: ['processing speed', 'slow processing', 'slow thinker', 'take longer than everyone', 'slow at everything', 'never finish exams', 'سرعة المعالجة', 'بطء المعالجة', 'لا أنهي الامتحان'],
      title: B('Processing speed', 'سرعة المعالجة'),
      what: B('Processing speed is how quickly you can take in simple information and respond. Slower processing has nothing to do with intelligence — the answer is still right, it just takes longer. It shows most under time pressure: exams, fast lectures and quick-fire discussions.', 'سرعة المعالجة هي مدى سرعة استيعابك للمعلومات البسيطة والاستجابة لها. البطء لا علاقة له بالذكاء — الإجابة صحيحة لكنها تستغرق وقتاً أطول. يظهر أكثر تحت ضغط الوقت: الامتحانات والمحاضرات السريعة والنقاشات المتلاحقة.'),
      signs: [B('Running out of time in exams but doing well untimed', 'نفاد الوقت في الامتحانات مع أداء جيد دون توقيت'), B('Copying from the board is hard to keep up with', 'صعوبة مجاراة النقل من السبورة')],
      support: B('Extra time (commonly 25%), lecture slides in advance, recorded lectures, and fewer but deeper questions where possible.', 'وقت إضافي (غالباً ٢٥٪)، والشرائح مسبقاً، وتسجيل المحاضرات، وأسئلة أقل وأعمق حيث أمكن.'),
      related: ['dyslexia', 'adhd', 'accommodations']
    }),
    T({
      id: 'dyslexia-arabic', area: 'reading',
      keys: ['arabic dyslexia', 'dyslexia in arabic', 'reading arabic', 'tashkeel', 'diacritics', 'harakat', 'arabic letters', 'عسر القراءة بالعربية', 'التشكيل', 'الحركات', 'قراءة العربية'],
      title: B('Dyslexia in Arabic and bilingual readers', 'عسر القراءة بالعربية ولدى ثنائيي اللغة'),
      what: B('Arabic is written with full vowel marks (tashkeel) for young readers, then mostly without them. Without vowels, a reader has to use context to choose between several possible words, which puts extra load on reading for people with dyslexia. Letters also change shape by position, and dots distinguish many of them. Dyslexia can show differently in Arabic and English, so assessments should look at both languages.', 'تُكتب العربية بالتشكيل الكامل للقراء الصغار، ثم غالباً من دونه. ومن دون الحركات، يحتاج القارئ إلى السياق للاختيار بين عدة كلمات محتملة، ما يزيد عبء القراءة على من لديهم عسر قراءة. كما تتغير أشكال الحروف بحسب موقعها، وتميّز النقاط كثيراً منها. قد يظهر عسر القراءة بشكل مختلف بالعربية والإنجليزية، لذا ينبغي أن يشمل التقييم اللغتين.'),
      signs: [B('Confusing letters that differ only by dots (ب ت ث)', 'الخلط بين الحروف التي تختلف بالنقاط فقط (ب ت ث)'), B('Much slower reading without tashkeel', 'قراءة أبطأ بكثير دون تشكيل'), B('Spelling errors with hamza and long vowels', 'أخطاء إملائية في الهمزة وحروف المد')],
      similar: B('If reading is hard only in English but fine in Arabic, that points more to second-language load than to dyslexia.', 'إن كانت القراءة صعبة بالإنجليزية فقط وجيدة بالعربية، فهذا يشير إلى عبء اللغة الثانية أكثر من عسر القراءة.'),
      assess: B('Ask for an assessor who can test reading in both Arabic and English.', 'اطلب مقيّماً يستطيع اختبار القراءة بالعربية والإنجليزية معاً.'),
      support: B('Vowelled (mushakkal) versions of key texts, Arabic text-to-speech, extra time and dictionaries that show root patterns.', 'نسخ مشكولة من النصوص المهمة، وتحويل النص العربي إلى كلام، ووقت إضافي، وقواميس تُظهر الجذور.'),
      related: ['dyslexia', 'second-language']
    }),

    /* ---------- study craft ---------- */
    T({
      id: 'procrastination', area: 'attention',
      keys: ['procrastinat', 'putting off', 'last minute', 'can\'t make myself', 'motivation', 'unmotivated', 'lazy', 'avoid studying', 'التسويف', 'المماطلة', 'الدافعية', 'كسول', 'آخر لحظة'],
      title: B('Procrastination and motivation', 'التسويف والدافعية'),
      what: B('Procrastination isn’t laziness — it’s mostly about avoiding an uncomfortable feeling: boredom, confusion, fear of doing it badly. That’s why “just try harder” fails. Shrinking the task and lowering the bar to start works much better.', 'التسويف ليس كسلاً — إنه غالباً تجنّب لشعور غير مريح: الملل أو الحيرة أو الخوف من الأداء السيئ. لهذا يفشل «حاول أكثر». تصغير المهمة وخفض عتبة البدء أنجح بكثير.'),
      signs: [B('Cleaning, scrolling or doing other work instead', 'التنظيف أو التصفح أو أداء أعمال أخرى بدلاً منها'), B('Panic-driven all-nighters', 'السهر طوال الليل بدافع الذعر'), B('Feeling guilty but still stuck', 'الشعور بالذنب مع البقاء عالقاً')],
      support: B('Try a 5-minute start (you may stop after five), name the very next physical action, use a timer, remove the phone from the room, reward yourself after, and be kind to yourself — self-criticism makes avoidance worse. If it has been lifelong and severe, ADHD is worth exploring.', 'جرّب بداية من ٥ دقائق (يمكنك التوقف بعدها)، وسمِّ الفعل التالي بالتحديد، واستخدم مؤقتاً، وأخرج الهاتف من الغرفة، وكافئ نفسك بعدها، وكن لطيفاً مع نفسك — جلد الذات يزيد التجنّب. وإن كان الأمر شديداً وممتداً طوال حياتك، فاضطراب الانتباه يستحق الاستكشاف.'),
      myths: B('Myth: you work best under pressure. Most people just only work under pressure — and the quality drops.', 'خرافة: أنك تعمل أفضل تحت الضغط. معظم الناس يعملون فقط تحت الضغط — وتنخفض الجودة.'),
      related: ['executive', 'adhd', 'time-management']
    }),
    T({
      id: 'time-management', area: 'attention',
      keys: ['time management', 'manage my time', 'deadlines', 'schedule', 'timetable', 'planner', 'too much to do', 'إدارة الوقت', 'المواعيد النهائية', 'جدول', 'مخطط'],
      title: B('Time management that actually works', 'إدارة وقت تنجح فعلاً'),
      what: B('Good time management is less about willpower and more about making time visible. Put every deadline in one calendar, work backwards from each due date, and plan your week in blocks — including rest. Expect tasks to take 1.5× longer than you think.', 'إدارة الوقت الجيدة ليست قوة إرادة بقدر ما هي جعل الوقت مرئياً. ضع كل المواعيد في تقويم واحد، وخطط بالعكس من كل موعد تسليم، ونظّم أسبوعك في كتل — بما فيها الراحة. توقّع أن تستغرق المهام ١.٥ ضعف ما تظن.'),
      signs: [B('Weekly review every Sunday — 15 minutes', 'مراجعة أسبوعية كل أحد — ١٥ دقيقة'), B('Break big assignments into dated mini-deadlines', 'قسّم المهام الكبيرة إلى مواعيد صغيرة مؤرخة'), B('Use the Pomodoro rhythm: 25 minutes on, 5 off', 'استخدم إيقاع بومودورو: ٢٥ دقيقة عمل و٥ راحة')],
      related: ['procrastination', 'executive', 'study']
    }),
    T({
      id: 'note-taking', area: 'listening',
      keys: ['note taking', 'notes', 'taking notes', 'cornell', 'lecture notes', 'can\'t keep up in lectures', 'تدوين الملاحظات', 'الملاحظات', 'محاضرة سريعة'],
      title: B('Note-taking in lectures', 'تدوين الملاحظات في المحاضرات'),
      what: B('Trying to write everything down overloads working memory. Better: get slides beforehand, write only key ideas and questions, and fill gaps afterwards from the recording. The Cornell method (notes, cues, summary) and mind maps both work well.', 'محاولة كتابة كل شيء تُثقل الذاكرة العاملة. الأفضل: احصل على الشرائح مسبقاً، واكتب الأفكار الأساسية والأسئلة فقط، وأكمل الفجوات لاحقاً من التسجيل. طريقة كورنيل (ملاحظات، إشارات، ملخص) والخرائط الذهنية كلتاهما فعّالتان.'),
      support: B('Recorded lectures, a note-taker or shared notes are common accommodations. Speech-to-text apps and live captions help too.', 'تسجيل المحاضرات وكاتب الملاحظات أو الملاحظات المشتركة تسهيلات شائعة. وتساعد تطبيقات تحويل الكلام إلى نص والترجمة الحية أيضاً.'),
      related: ['working-memory', 'apd', 'assistive-tech']
    }),
    T({
      id: 'reading-strategies', area: 'reading',
      keys: ['reading strategies', 'read faster', 'speed reading', 'read better', 'how to read', 'sq3r', 'skim', 'skimming', 'long readings', 'too much reading', 'استراتيجيات القراءة', 'القراءة السريعة', 'أقرأ أسرع', 'قراءة كثيرة'],
      title: B('Reading strategies for heavy reading lists', 'استراتيجيات القراءة للقوائم الطويلة'),
      what: B('You don’t have to read every word. Start with the purpose (what question am I answering?), then skim headings, the abstract, first sentences and conclusions. Read closely only the parts you need. SQ3R — Survey, Question, Read, Recite, Review — turns reading into active learning.', 'لا يلزمك قراءة كل كلمة. ابدأ بالهدف (ما السؤال الذي أجيب عنه؟)، ثم تصفّح العناوين والملخص والجمل الأولى والخلاصات. اقرأ بعناية الأجزاء التي تحتاجها فقط. طريقة SQ3R — استطلع، اسأل، اقرأ، سمّع، راجع — تحوّل القراءة إلى تعلّم نشط.'),
      support: B('Listen while you read (text-to-speech), use a line guide, increase spacing, and summarise each section in one sentence. ERLY’s Reading Studio has all of these.', 'استمع أثناء القراءة (تحويل النص إلى كلام)، واستخدم موجّه السطر، وزد التباعد، ولخّص كل قسم في جملة. استوديو القراءة في إيرلي فيه كل ذلك.'),
      myths: B('Myth: speed-reading apps let you read 1,000 words a minute with full understanding. Comprehension drops sharply above normal speeds.', 'خرافة: أن تطبيقات القراءة السريعة تتيح قراءة ١٠٠٠ كلمة في الدقيقة بفهم كامل. ينخفض الفهم بشدة فوق السرعات العادية.'),
      related: ['dyslexia', 'study', 'assistive-tech']
    }),
    T({
      id: 'memory', area: 'general',
      keys: ['memorise', 'memorize', 'remember for exams', 'memory techniques', 'flashcards', 'spaced repetition', 'anki', 'mnemonic', 'memory palace', 'الحفظ', 'تقنيات الذاكرة', 'بطاقات', 'التكرار المتباعد'],
      title: B('Remembering what you study', 'تذكّر ما تذاكره'),
      what: B('Memory is built by pulling information out, not by putting it in again. Test yourself (flashcards, past papers, explaining aloud), space your reviews (1 day, 3 days, a week, a month), and connect new facts to things you already know or to images. Sleep is when memories are fixed.', 'تُبنى الذاكرة بإخراج المعلومة لا بإدخالها مجدداً. اختبر نفسك (بطاقات، اختبارات سابقة، الشرح بصوت عالٍ)، وباعد المراجعات (يوم، ٣ أيام، أسبوع، شهر)، واربط المعلومات الجديدة بما تعرفه أو بصور. وفي النوم تُثبَّت الذكريات.'),
      signs: [B('Spaced-repetition apps schedule reviews for you', 'تطبيقات التكرار المتباعد تجدول المراجعات لك'), B('Mnemonics and the memory palace help with lists', 'الحيل التذكيرية وقصر الذاكرة تساعد في القوائم'), B('Teach it to a friend — the best test of understanding', 'علّمه لصديق — أفضل اختبار للفهم')],
      related: ['study', 'exams', 'sleep']
    }),
    T({
      id: 'writing-essays', area: 'writing',
      keys: ['essay', 'write an essay', 'essay structure', 'organise my writing', 'thesis statement', 'paragraph structure', 'blank page', 'writer\'s block', 'المقال', 'كتابة مقال', 'بنية المقال', 'الصفحة البيضاء'],
      title: B('Writing essays step by step', 'كتابة المقالات خطوة بخطوة'),
      what: B('Split writing into stages so you never face a blank page and a perfect sentence at the same time: 1) brain-dump ideas (talking into a voice recorder counts), 2) group them, 3) plan one point per paragraph, 4) draft fast, 5) edit later. Each paragraph: point, evidence, explanation, link.', 'قسّم الكتابة إلى مراحل كي لا تواجه الصفحة البيضاء والجملة المثالية معاً: ١) أفرغ أفكارك (التحدث في مسجل صوت يُحتسب)، ٢) جمّعها، ٣) خطط لفكرة واحدة في كل فقرة، ٤) اكتب المسودة بسرعة، ٥) حرّر لاحقاً. كل فقرة: فكرة، دليل، شرح، ربط.'),
      support: B('Speech-to-text, mind-mapping software, a writing tutor, grammar checkers and extended deadlines help, especially with dysgraphia or dyslexia.', 'تحويل الكلام إلى نص، وبرامج الخرائط الذهنية، ومدرّس الكتابة، والمدققات اللغوية، والمواعيد الممددة تساعد، خاصة مع عسر الكتابة أو القراءة.'),
      related: ['dysgraphia', 'dyslexia', 'assistive-tech']
    }),
    T({
      id: 'presentations', area: 'wellbeing',
      keys: ['presentation', 'public speaking', 'speak in front', 'oral exam', 'viva', 'class participation', 'العرض التقديمي', 'التحدث أمام', 'الامتحان الشفهي'],
      title: B('Presentations and speaking anxiety', 'العروض التقديمية وقلق التحدث'),
      what: B('Most people feel nervous presenting — a racing heart is your body getting ready, not a sign of failing. Rehearse aloud three times, use cue cards with keywords, slow your breathing before you start (in for 4, out for 6), and focus on one friendly face.', 'يشعر معظم الناس بالتوتر عند العرض — تسارع القلب هو استعداد الجسم لا علامة فشل. تدرّب بصوت عالٍ ثلاث مرات، واستخدم بطاقات بكلمات مفتاحية، وأبطئ تنفسك قبل البدء (شهيق ٤ وزفير ٦)، وركّز على وجه ودود.'),
      support: B('If anxiety, a stammer or autism makes live presentations very hard, SAS can arrange alternatives such as a recorded presentation or a smaller audience.', 'إن جعل القلق أو التأتأة أو التوحد العروض الحية صعبة جداً، يمكن لخدمات الطلبة ترتيب بدائل كعرض مسجّل أو جمهور أصغر.'),
      related: ['anxiety', 'stammer', 'autism']
    }),
    T({
      id: 'maths-anxiety', area: 'maths',
      keys: ['maths anxiety', 'math anxiety', 'scared of maths', 'afraid of math', 'freeze in maths', 'hate maths', 'قلق الرياضيات', 'أخاف من الرياضيات'],
      title: B('Maths anxiety', 'قلق الرياضيات'),
      what: B('Maths anxiety is tension and fear around numbers that blocks working memory — so you can’t show what you know. It is very common, affects people of every ability, and is different from dyscalculia, although they often travel together.', 'قلق الرياضيات توتر وخوف حول الأرقام يعطّل الذاكرة العاملة — فلا تستطيع إظهار ما تعرفه. شائع جداً، ويصيب أصحاب كل القدرات، ويختلف عن عسر الحساب وإن اجتمعا كثيراً.'),
      support: B('Write worries down for 10 minutes before an exam (it frees working memory), practise in low-stakes settings, use worked examples, and talk to a maths support tutor.', 'اكتب مخاوفك ١٠ دقائق قبل الامتحان (يحرر الذاكرة العاملة)، وتدرّب في مواقف منخفضة المخاطر، واستخدم الأمثلة المحلولة، وتحدث مع مدرّس دعم الرياضيات.'),
      related: ['dyscalculia', 'anxiety', 'exams']
    }),
    T({
      id: 'assistive-tech', area: 'general',
      keys: ['assistive technology', 'assistive tech', 'text to speech', 'speech to text', 'dictation', 'screen reader', 'apps for dyslexia', 'tools for adhd', 'read aloud app', 'التقنيات المساعدة', 'تحويل النص إلى كلام', 'الإملاء الصوتي', 'قارئ الشاشة'],
      title: B('Assistive technology', 'التقنيات المساعدة'),
      what: B('Assistive technology lets you work around a difficulty instead of through it: text-to-speech reads aloud (built into phones, Edge and Word), speech-to-text lets you dictate, mind-mapping tools help you plan, spell and grammar checkers catch errors, focus timers and blockers protect attention, and live captions help in lectures. Most are free.', 'تتيح لك التقنيات المساعدة الالتفاف حول الصعوبة بدل مواجهتها: تحويل النص إلى كلام يقرأ بصوت عالٍ (مدمج في الهواتف ومتصفح إيدج ووورد)، وتحويل الكلام إلى نص للإملاء، وأدوات الخرائط الذهنية للتخطيط، والمدققات الإملائية والنحوية لاكتشاف الأخطاء، ومؤقتات التركيز وحاجبات التطبيقات لحماية الانتباه، والترجمة الحية في المحاضرات. ومعظمها مجاني.'),
      support: B('ERLY’s Reading Studio includes read-aloud, line focus, calmer fonts, key-word glossaries and 3-line summaries. SAS can also set you up with specialist software.', 'يتضمن استوديو القراءة في إيرلي القراءة الصوتية، وتركيز السطر، والخطوط الأهدأ، ومسارد الكلمات المهمة، والملخصات من ٣ أسطر. ويمكن لخدمات الطلبة تزويدك ببرامج متخصصة.'),
      myths: B('Myth: using assistive tech is cheating. It removes a barrier; it doesn’t do the thinking for you.', 'خرافة: أن استخدام التقنيات المساعدة غش. إنها تزيل عائقاً ولا تفكر نيابة عنك.'),
      related: ['accommodations', 'reading-strategies', 'writing-essays']
    }),

    T({
      id: 'exams', area: 'wellbeing',
      keys: ['exam technique', 'exam tips', 'exam strategy', 'how to prepare for exams', 'during the exam', 'run out of time in exams', 'mind goes blank', 'past papers', 'finals', 'midterms', 'تقنيات الامتحان', 'الاستعداد للامتحان', 'نصائح الامتحان', 'النهائي', 'منتصف الفصل'],
      title: B('Exam technique', 'تقنيات الامتحان'),
      what: B('Exams test recall under time pressure, so practise exactly that: past papers, timed, without notes. In the exam, read every question first, mark what each is worth, start with the one you know best, and give each mark its share of time. If your mind goes blank, breathe out slowly, write anything related, and move on — memories often come back.', 'تختبر الامتحانات الاسترجاع تحت ضغط الوقت، فتدرّب على ذلك تماماً: امتحانات سابقة، موقوتة، دون ملاحظات. في الامتحان، اقرأ كل الأسئلة أولاً، وحدد درجة كل منها، وابدأ بما تعرفه أكثر، وامنح كل درجة نصيبها من الوقت. وإن فرغ ذهنك، ازفر ببطء، واكتب أي شيء ذي صلة، وانتقل — فالذكريات غالباً تعود.'),
      signs: [B('Two weeks out: a calendar of topics with spaced reviews', 'قبل أسبوعين: تقويم للمواضيع مع مراجعات متباعدة'), B('The night before: light review and a full night’s sleep', 'الليلة السابقة: مراجعة خفيفة ونوم كامل'), B('On the day: food, water, arrive early, avoid last-minute panic chats', 'يوم الامتحان: طعام وماء ووصول مبكر وتجنّب أحاديث الذعر')],
      support: B('If you consistently run out of time, read slowly or blank under pressure, exam arrangements (extra time, a smaller room, rest breaks, a reader or computer) may be right for you — ask SAS.', 'إن كان الوقت ينفد منك باستمرار، أو تقرأ ببطء، أو يفرغ ذهنك تحت الضغط، فقد تناسبك ترتيبات الامتحان (وقت إضافي، قاعة أصغر، استراحات، قارئ أو حاسوب) — اسأل خدمات الطلبة.'),
      related: ['anxiety', 'memory', 'processing-speed']
    }),
    /* ---------- wellbeing ---------- */
    T({
      id: 'sleep', area: 'wellbeing',
      keys: ['sleep', 'insomnia', 'can\'t sleep', 'tired all the time', 'all nighter', 'all-nighter', 'sleep schedule', 'النوم', 'الأرق', 'لا أستطيع النوم', 'السهر'],
      title: B('Sleep and learning', 'النوم والتعلّم'),
      what: B('Sleep is when the brain files what you learned. After a short night, attention, working memory and reading speed all drop — they can look just like a learning difference. Most students need 7–9 hours. That’s why ERLY’s real tracking excludes days after under 6 hours of sleep.', 'في النوم يرتّب الدماغ ما تعلّمته. بعد ليلة قصيرة، يتراجع الانتباه والذاكرة العاملة وسرعة القراءة — وقد تبدو تماماً كاختلاف تعلّم. يحتاج معظم الطلبة ٧–٩ ساعات. ولهذا يستبعد التتبّع الحقيقي في إيرلي الأيام التي تلي نوماً أقل من ٦ ساعات.'),
      signs: [B('A regular wake-up time, even at weekends', 'وقت استيقاظ ثابت حتى في العطل'), B('No screens for 30–60 minutes before bed', 'لا شاشات قبل النوم بـ٣٠–٦٠ دقيقة'), B('No caffeine after 2 pm', 'لا كافيين بعد الثانية ظهراً'), B('An all-nighter before an exam usually lowers the grade', 'السهر طوال الليل قبل الامتحان يخفض الدرجة عادةً')],
      support: B('If sleep problems last over a month, see a doctor — insomnia responds well to CBT-I. Sleep problems are also common with ADHD and anxiety.', 'إن استمرت مشكلات النوم أكثر من شهر، راجع طبيباً — يستجيب الأرق جيداً للعلاج المعرفي السلوكي للأرق. وهي شائعة أيضاً مع اضطراب الانتباه والقلق.'),
      related: ['mood', 'anxiety', 'lifestyle']
    }),
    T({
      id: 'burnout', area: 'wellbeing',
      keys: ['burnout', 'burnt out', 'burned out', 'exhausted', 'no energy', 'drained', 'can\'t do this anymore', 'الاحتراق', 'منهك', 'مستنزف'],
      title: B('Burnout', 'الاحتراق النفسي'),
      what: B('Burnout is exhaustion from long-term stress without enough recovery: feeling drained, cynical about your course and less effective however hard you try. It builds slowly and is common in students who mask a difficulty by working twice as hard.', 'الاحتراق النفسي إنهاك ناتج عن ضغط طويل دون تعافٍ كافٍ: الشعور بالاستنزاف، والسلبية تجاه دراستك، وتراجع الفعالية مهما حاولت. يتراكم ببطء، وهو شائع لدى الطلبة الذين يخفون صعوبة ما بالعمل ضعف الجهد.'),
      support: B('Rest is part of the work: protect sleep, cut non-essential load, talk to your advisor about extensions, and see a counsellor. If an underlying learning difference is draining you, getting the right support reduces the load.', 'الراحة جزء من العمل: احمِ نومك، وقلّل الأعباء غير الضرورية، وتحدث مع مرشدك عن التمديد، وقابل مرشداً نفسياً. وإن كان اختلاف تعلّم كامن يستنزفك، فالدعم الصحيح يخفف العبء.'),
      related: ['mood', 'sleep', 'twice-exceptional']
    }),
    T({
      id: 'impostor', area: 'wellbeing',
      keys: ['impostor', 'imposter', 'don\'t belong', 'not smart enough', 'everyone else is smarter', 'fraud', 'متلازمة المحتال', 'لا أنتمي', 'لست ذكياً بما يكفي'],
      title: B('Impostor feelings', 'الشعور بالاحتيال'),
      what: B('Impostor feelings are the sense that you don’t deserve your place and will be “found out”. They are extremely common at university — and especially common in students with undiagnosed learning differences, who have spent years working harder than others for the same result.', 'الشعور بالاحتيال هو الإحساس بأنك لا تستحق مكانك وسيُكشف أمرك. وهو شائع جداً في الجامعة — وخاصة لدى الطلبة ذوي اختلافات التعلّم غير المشخصة، الذين قضوا سنوات يعملون أكثر من غيرهم للنتيجة نفسها.'),
      support: B('Keep a list of evidence (grades, feedback), talk about it — you’ll find many others feel it — and notice whether a specific barrier is behind it.', 'احتفظ بقائمة أدلة (درجات وملاحظات)، وتحدث عن الأمر — ستجد كثيرين يشعرون به — وانتبه إن كان وراءه عائق محدد.'),
      related: ['mood', 'twice-exceptional']
    }),
    T({
      id: 'panic', area: 'wellbeing',
      keys: ['panic attack', 'panic', 'can\'t breathe', 'heart racing', 'chest tight', 'نوبة هلع', 'هلع', 'لا أستطيع التنفس', 'قلبي يدق'],
      title: B('Panic attacks', 'نوبات الهلع'),
      what: B('A panic attack is a sudden rush of fear with a pounding heart, fast breathing, dizziness or tight chest. It feels frightening but passes, usually within 10–20 minutes, and isn’t dangerous. If it’s the first time, or you have chest pain, get checked by a doctor.', 'نوبة الهلع اندفاع مفاجئ من الخوف مع خفقان القلب وتسارع التنفس والدوار أو ضيق الصدر. تبدو مخيفة لكنها تزول، عادةً خلال ١٠–٢٠ دقيقة، وليست خطيرة. إن كانت المرة الأولى أو لديك ألم في الصدر، راجع طبيباً.'),
      support: B('Right now: breathe out slowly, longer than you breathe in; name 5 things you can see; remind yourself it will pass. Longer term, CBT works very well. ERLY has a 60-second breathing break in the Reading Studio.', 'الآن: ازفر ببطء أطول من الشهيق؛ سمِّ ٥ أشياء تراها؛ وذكّر نفسك أنها ستزول. وعلى المدى الأطول، العلاج المعرفي السلوكي فعّال جداً. في استوديو القراءة استراحة تنفّس من ٦٠ ثانية.'),
      related: ['anxiety', 'exams']
    }),
    T({
      id: 'lifestyle', area: 'wellbeing',
      keys: ['caffeine', 'coffee', 'energy drink', 'diet', 'food and focus', 'exercise', 'phone addiction', 'social media', 'screen time', 'distracted by my phone', 'الكافيين', 'القهوة', 'مشروبات الطاقة', 'الرياضة', 'الهاتف', 'وسائل التواصل'],
      title: B('Energy, exercise and phones', 'الطاقة والرياضة والهواتف'),
      what: B('Small daily habits change how well you learn: 20–30 minutes of movement improves focus for hours; regular meals and water keep energy steady; caffeine helps a little but after 2 pm it costs sleep; and a phone in sight — even face down — pulls attention. Put it in another room while you study.', 'العادات اليومية الصغيرة تغيّر جودة تعلّمك: ٢٠–٣٠ دقيقة من الحركة تحسّن التركيز لساعات؛ والوجبات المنتظمة والماء تحافظ على الطاقة؛ والكافيين يساعد قليلاً لكنه بعد الثانية ظهراً يكلّفك نوماً؛ والهاتف في مرمى البصر — حتى مقلوباً — يشتّت الانتباه. ضعه في غرفة أخرى أثناء الدراسة.'),
      myths: B('Myth: energy drinks help you study. The crash and lost sleep usually cost more than they give.', 'خرافة: أن مشروبات الطاقة تساعد على المذاكرة. الهبوط بعدها وفقدان النوم يكلّفان أكثر مما تعطي.'),
      related: ['sleep', 'study', 'adhd']
    }),

    /* ---------- UAE context, rights and process ---------- */
    T({
      id: 'uae-rights', area: 'general',
      keys: ['people of determination', 'uae law', 'my rights', 'disability rights', 'federal law', 'sanad', 'determination card', 'legal rights', 'أصحاب الهمم', 'حقوقي', 'قانون', 'بطاقة أصحاب الهمم', 'سند'],
      title: B('Your rights in the UAE (People of Determination)', 'حقوقك في الإمارات (أصحاب الهمم)'),
      what: B('In the UAE, people with disabilities — including learning differences when they substantially affect learning — are called People of Determination (أصحاب الهمم). Federal Law No. 29 of 2006, as amended, protects their rights, including equal opportunities in education. Universities provide reasonable accommodations through their disability or accessibility services, and national and emirate-level People of Determination cards can open access to further services. Rules and processes differ by emirate and university, so SAS is the best place to check what applies to you.', 'في الإمارات، يُسمى الأشخاص ذوو الإعاقة — بما في ذلك اختلافات التعلّم حين تؤثر في التعلّم بشكل كبير — أصحاب الهمم. يحمي القانون الاتحادي رقم ٢٩ لسنة ٢٠٠٦ وتعديلاته حقوقهم، ومنها تكافؤ الفرص في التعليم. تقدّم الجامعات التسهيلات المعقولة عبر خدمات ذوي الإعاقة أو إمكانية الوصول، وقد تتيح بطاقات أصحاب الهمم الاتحادية أو المحلية الوصول إلى خدمات إضافية. تختلف القواعد والإجراءات بحسب الإمارة والجامعة، لذا فخدمات الطلبة هي أفضل مكان لمعرفة ما ينطبق عليك.'),
      support: B('You choose whether to disclose. Accommodations are about equal access, not an advantage, and asking for them is your right.', 'أنت من يقرر الإفصاح. التسهيلات تتعلق بتكافؤ الوصول لا بالأفضلية، وطلبها حقك.'),
      related: ['accommodations', 'sas', 'disclosure']
    }),
    T({
      id: 'privacy-law', area: 'general',
      keys: ['pdpl', 'data protection', 'personal data', 'who sees my data', 'is my data safe', 'gdpr', 'حماية البيانات', 'البيانات الشخصية', 'من يرى بياناتي'],
      title: B('Your data and privacy', 'بياناتك وخصوصيتك'),
      what: B('The UAE’s Personal Data Protection Law (Federal Decree-Law No. 45 of 2021) treats health and disability information as sensitive personal data that needs clear consent. ERLY goes further: everything stays on this device, nothing is sent to staff or external AI unless you choose to, tracking stops by itself after 28 days, and you can delete it all at any time.', 'يتعامل قانون حماية البيانات الشخصية في الإمارات (المرسوم بقانون اتحادي رقم ٤٥ لسنة ٢٠٢١) مع المعلومات الصحية ومعلومات الإعاقة كبيانات شخصية حساسة تتطلب موافقة واضحة. ويذهب إيرلي أبعد: كل شيء يبقى على هذا الجهاز، ولا يُرسل شيء إلى الموظفين أو الذكاء الاصطناعي الخارجي إلا باختيارك، ويتوقف التتبّع تلقائياً بعد ٢٨ يوماً، ويمكنك حذف كل شيء في أي وقت.'),
      related: ['erly', 'disclosure']
    }),
    T({
      id: 'sas', area: 'general',
      keys: ['sas', 'student accessibility services', 'accessibility office', 'disability office', 'what happens at sas', 'first appointment', 'book sas', 'referral', 'خدمات الطلبة', 'خدمات إمكانية الوصول', 'مكتب ذوي الإعاقة', 'الموعد الأول', 'إحالة'],
      title: B('What happens when you contact SAS', 'ماذا يحدث عند التواصل مع خدمات الطلبة'),
      what: B('Student Accessibility Services is a confidential service. A first meeting is a conversation: what feels hard, what you have tried, and any reports you have. If you have no diagnosis yet, they can often put interim support in place and refer you for an assessment. Once evidence is in, you agree an accommodation plan together, and faculty receive only what they need to know — usually the adjustments, not your diagnosis.', 'خدمات الطلبة لإمكانية الوصول خدمة سرية. الاجتماع الأول محادثة: ما الذي يصعب عليك، وما الذي جربته، وأي تقارير لديك. إن لم يكن لديك تشخيص بعد، يمكنهم غالباً توفير دعم مؤقت وتحويلك للتقييم. وحين تكتمل الأدلة، تتفقان على خطة تسهيلات معاً، ولا يتلقى أعضاء الهيئة التدريسية إلا ما يحتاجون معرفته — عادةً التعديلات لا التشخيص.'),
      signs: [B('Bring: any old school reports, ERLY’s one-page summary if you want, and a list of what is hardest', 'أحضر: أي تقارير مدرسية قديمة، وملخص إيرلي من صفحة واحدة إن أردت، وقائمة بأصعب الأمور'), B('Ask: what interim support is possible while I wait for an assessment?', 'اسأل: ما الدعم المؤقت الممكن ريثما أنتظر التقييم؟'), B('Accommodations do not appear on your transcript at most universities', 'لا تظهر التسهيلات في كشف الدرجات في معظم الجامعات')],
      support: B('You can book from ERLY’s “Get support” section — you decide what, if anything, is shared.', 'يمكنك الحجز من قسم «احصل على الدعم» في إيرلي — وأنت تقرر ما يُشارك إن شاركت شيئاً.'),
      related: ['assessment', 'accommodations', 'disclosure']
    }),
    T({
      id: 'growth-plan', area: 'general',
      keys: ['growth plan', 'improve my reading', 'get better at', 'how can i improve', 'exercises', 'practice', 'training programme', 'training program', 'overcome', 'خطة النمو', 'أتحسن', 'تمارين', 'كيف أتحسن', 'التغلب على'],
      title: B('Getting better, step by step (the Growth Plan)', 'التحسّن خطوة بخطوة (خطة النمو)'),
      what: B('Skills like decoding words, holding instructions in mind, number sense, planning and staying calm can all be strengthened with short, regular practice — and strategies make the rest easier. ERLY’s Growth Plan runs this like a learning specialist would: a first consult, specific goals, about 10–20 minutes a day of adaptive exercises, and a weekly review that changes the plan. It complements, never replaces, SAS, a specialist tutor or a clinician.', 'يمكن تقوية مهارات مثل فك الكلمات، والاحتفاظ بالتعليمات في الذهن، والحس العددي، والتخطيط، والهدوء بالتدريب القصير المنتظم — والاستراتيجيات تسهّل الباقي. تدير خطة النمو في إيرلي ذلك كما يفعل أخصائي التعلّم: استشارة أولى، وأهداف محددة، ونحو ١٠–٢٠ دقيقة يومياً من التمارين المتكيّفة، ومراجعة أسبوعية تغيّر الخطة. إنها تكمّل ولا تحل محل خدمات الطلبة أو المدرّس المتخصص أو الطبيب.'),
      signs: [B('Little and often beats long and rare', 'القليل الدائم أفضل من الكثير المنقطع'), B('Exercises get harder only when you’re ready', 'تصعب التمارين فقط حين تكون مستعداً'), B('Open it from “Growth Plan” in the menu', 'افتحها من «خطة النمو» في القائمة')],
      myths: B('Myth: learning differences can be “cured” with brain games. Practice builds specific skills and confidence; strategies and accommodations do the rest.', 'خرافة: أن اختلافات التعلّم «تُشفى» بألعاب الدماغ. التدريب يبني مهارات محددة وثقة؛ والاستراتيجيات والتسهيلات تكمل الباقي.'),
      related: ['assistive-tech', 'study', 'sas']
    }),
    T({
      id: 'disclosure', area: 'general',
      keys: ['disclose', 'disclosure', 'tell my professor', 'tell my teacher', 'should i tell', 'tell my parents', 'tell my family', 'tell my employer', 'stigma', 'ashamed', 'embarrassed', 'الإفصاح', 'أخبر أستاذي', 'أخبر أهلي', 'الوصمة', 'محرج'],
      title: B('Telling people (disclosure)', 'إخبار الآخرين (الإفصاح)'),
      what: B('It’s your choice who knows, and when. Through SAS, professors usually just get a short note of the adjustments you need — not your diagnosis. With family, it can help to start with what you’ve noticed and what helps, rather than a label. Many students find telling one trusted person makes everything lighter.', 'إنه اختيارك من يعرف ومتى. عبر خدمات الطلبة، يتلقى الأساتذة عادةً ملاحظة قصيرة بالتعديلات التي تحتاجها — لا تشخيصك. ومع العائلة، قد يفيد البدء بما لاحظته وما يساعدك بدلاً من التسمية. يجد كثير من الطلبة أن إخبار شخص واحد موثوق يخفف كل شيء.'),
      support: B('ERLY’s Support Pact lets you name one ally, and asks again before anyone is involved. A counsellor can help you plan a family conversation.', 'يتيح لك ميثاق الدعم في إيرلي تسمية حليف واحد، ويسألك مجدداً قبل إشراك أي أحد. ويمكن للمرشد مساعدتك في التخطيط لحديث مع العائلة.'),
      myths: B('Myth: a diagnosis will hold you back in your career. Many professionals are open about dyslexia and ADHD, and workplaces must also make reasonable adjustments.', 'خرافة: أن التشخيص سيعيقك مهنياً. كثير من المهنيين يتحدثون بصراحة عن عسر القراءة واضطراب الانتباه، وعلى أماكن العمل أيضاً تقديم تعديلات معقولة.'),
      related: ['sas', 'uae-rights', 'privacy-law']
    })
  ];

  /* quick facts: one-line answers to very common questions */
  const FAQS = [
    { keys: ['is dyslexia genetic', 'does dyslexia run in families', 'is adhd genetic', 'does adhd run in families', 'inherited', 'hereditary', 'وراثي', 'هل هو وراثي'], topic: 'dyslexia', a: B('Yes — dyslexia and ADHD both run strongly in families. If a parent or sibling has one, your chance is several times higher. Genes load the dice; they don’t decide everything.', 'نعم — يتوارث عسر القراءة واضطراب الانتباه بقوة في العائلات. إن كان لدى أحد الوالدين أو الإخوة أحدهما، فاحتمالك أعلى بعدة مرات. الجينات ترفع الاحتمال لكنها لا تحسم كل شيء.') },
    { keys: ['can adults be diagnosed', 'too old to be diagnosed', 'diagnosed as an adult', 'adult diagnosis', 'late diagnosis', 'تشخيص البالغين', 'متأخر على التشخيص'], topic: 'assessment', a: B('Absolutely. Many people are first identified at university or later, when the workload outgrows their coping strategies. Adult assessments are routine.', 'بالتأكيد. كثيرون يُكتشفون لأول مرة في الجامعة أو بعدها، حين يتجاوز العبء استراتيجياتهم. تقييمات البالغين أمر معتاد.') },
    { keys: ['is it linked to intelligence', 'does it mean i\'m stupid', 'am i stupid', 'low iq', 'هل يعني أنني غبي', 'غبي', 'الذكاء'], topic: 'dyslexia', a: B('No. Learning differences occur at every level of intelligence. They describe how your brain handles specific tasks, not how clever you are.', 'لا. تحدث اختلافات التعلّم في كل مستويات الذكاء. إنها تصف كيف يتعامل دماغك مع مهام محددة، لا مدى ذكائك.') },
    { keys: ['can you outgrow adhd', 'does adhd go away', 'does dyslexia go away', 'will it go away', 'cured', 'هل يزول', 'هل يختفي'], topic: 'adhd', a: B('Dyslexia is lifelong. ADHD continues into adulthood for most people, although hyperactivity often fades and strategies get stronger. What changes most is how well the environment and support fit you.', 'عسر القراءة مستمر مدى الحياة. ويستمر اضطراب الانتباه في البلوغ لدى معظم الناس، وإن كان فرط الحركة يخف غالباً وتقوى الاستراتيجيات. أكثر ما يتغير هو مدى ملاءمة البيئة والدعم لك.') },
    { keys: ['is extra time unfair', 'is extra time cheating', 'unfair advantage', 'do accommodations give an advantage', 'ميزة غير عادلة', 'هل الوقت الإضافي غش'], topic: 'accommodations', a: B('No. Accommodations remove a barrier so the exam measures what you know, not how fast you decode or write. Research shows extra time helps students with learning differences much more than it helps others.', 'لا. تزيل التسهيلات عائقاً كي يقيس الامتحان ما تعرفه، لا سرعة فك الرموز أو الكتابة. وتُظهر الأبحاث أن الوقت الإضافي يفيد ذوي اختلافات التعلّم أكثر بكثير من غيرهم.') },
    { keys: ['will it show on my transcript', 'on my transcript', 'on my degree', 'will employers know', 'كشف الدرجات', 'هل سيظهر', 'سيعرف صاحب العمل'], topic: 'sas', a: B('At most universities, no — accommodations and diagnoses are confidential and do not appear on your transcript or degree. Check your own university’s policy with SAS.', 'في معظم الجامعات لا — التسهيلات والتشخيصات سرية ولا تظهر في كشف الدرجات أو الشهادة. تحقق من سياسة جامعتك مع خدمات الطلبة.') },
    { keys: ['support without diagnosis', 'without a diagnosis', 'no diagnosis yet', 'while i wait', 'interim support', 'دون تشخيص', 'بلا تشخيص', 'دعم مؤقت'], topic: 'sas', a: B('Often, yes. Many universities offer interim support — such as recorded lectures or a study-skills tutor — while you wait for an assessment. Ask SAS what’s possible.', 'غالباً نعم. تقدّم جامعات كثيرة دعماً مؤقتاً — كتسجيل المحاضرات أو مدرّس مهارات الدراسة — ريثما تنتظر التقييم. اسأل خدمات الطلبة عما هو ممكن.') },
    { keys: ['how long does an assessment take', 'how long is the assessment', 'assessment length', 'كم يستغرق التقييم', 'مدة التقييم'], topic: 'assessment', a: B('A full psycho-educational assessment usually takes 2–4 hours of testing, sometimes over two sessions, and the report follows within a few weeks.', 'يستغرق التقييم النفسي التربوي الشامل عادةً ٢–٤ ساعات من الاختبارات، أحياناً على جلستين، ويصدر التقرير خلال بضعة أسابيع.') },
    { keys: ['how common is', 'how many people have', 'prevalence', 'is it rare', 'ما مدى شيوع', 'كم شخص', 'هل هو نادر'], topic: 'dyslexia', a: B('More common than most people think: around 1 in 10 people has dyslexia, about 1 in 20 adults has ADHD, roughly 1 in 20 has dyscalculia and about 1 in 14 has DLD — and they often overlap.', 'أكثر شيوعاً مما يظن معظم الناس: نحو شخص من كل ١٠ لديه عسر قراءة، ونحو بالغ من كل ٢٠ لديه اضطراب انتباه، ونحو ١ من ٢٠ لديه عسر حساب، ونحو ١ من ١٤ لديه اضطراب لغة نمائي — وكثيراً ما تتداخل.') },
    { keys: ['can i have more than one', 'more than one', 'both dyslexia and adhd', 'overlap', 'co-occur', 'comorbid', 'أكثر من واحد', 'التداخل'], topic: 'adhd', a: B('Yes — overlap is the rule, not the exception. Around a third of people with dyslexia also have ADHD, and dyscalculia, DLD and dyspraxia often come together. A good assessment looks at the whole profile.', 'نعم — التداخل هو القاعدة لا الاستثناء. نحو ثلث من لديهم عسر قراءة لديهم أيضاً اضطراب انتباه، وكثيراً ما يجتمع عسر الحساب واضطراب اللغة وعسر التناسق. والتقييم الجيد ينظر إلى الملف كاملاً.') },
    { keys: ['is adhd overdiagnosed', 'is adhd real', 'adhd is made up', 'everyone has adhd', 'هل اضطراب الانتباه حقيقي', 'الجميع لديه'], topic: 'adhd', a: B('ADHD is a real, well-studied neurodevelopmental condition. Everyone loses focus sometimes; ADHD is when it is persistent since childhood, across settings, and gets in the way of life. That is exactly what a careful assessment checks.', 'اضطراب الانتباه حالة نمائية عصبية حقيقية ومدروسة جيداً. كل شخص يفقد تركيزه أحياناً؛ أما الاضطراب فهو حين يستمر منذ الطفولة، وفي كل البيئات، ويعيق الحياة. وهذا تماماً ما يتحقق منه التقييم الدقيق.') },
    { keys: ['medication', 'adhd medicine', 'stimulants', 'ritalin', 'الأدوية', 'دواء', 'ريتالين'], topic: 'adhd', a: B('Medication is one option for ADHD and is prescribed and monitored only by a doctor, who will weigh benefits and side effects with you. Strategies, coaching and accommodations help with or without it. I can’t advise on specific medicines.', 'الدواء أحد خيارات علاج اضطراب الانتباه، ولا يصفه ويتابعه إلا طبيب يوازن معك الفوائد والآثار الجانبية. تساعد الاستراتيجيات والتدريب والتسهيلات معه أو من دونه. لا أستطيع النصح بأدوية محددة.') }
  ];

  return { TOPICS, FAQS };
});
