/* ERLY AI Reading Companion — the structured "talk it through" interview.

   When a student wants to understand a difficulty (or Noor gently offers,
   after the analyser sees converging signals), Noor asks the kind of
   questions a specialist asks in a first conversation:
     - how often the core experiences happen (Never … Very often),
     - whether they go back to childhood (onset / developmental history),
     - whether they happen across settings and languages,
     - how much they get in the way (impact),
     - what else could explain them (vision, hearing, second language, sleep,
       mood, gaps in schooling) — the "rule-outs".
   Questions are written in ERLY's own words and follow the structure of
   recognised screening frameworks (DSM-5 / ICD-11 criteria such as childhood
   onset and more than one setting for ADHD; reading-history questionnaires
   for dyslexia; hearing-first for listening). They are NOT a validated
   instrument and the outcome is NOT a diagnosis: it is an evidence level
   ("clear pattern" / "some signs" / "few signs") that says whether a formal
   assessment is worth pursuing, combined with what ERLY observed. No
   probabilities, ever. A safety question in the wellbeing module routes to
   crisis support immediately.

   Pure module: window.ERLY_INTERVIEW in the browser, CommonJS for tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_INTERVIEW = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const B = (en, ar) => [en, ar];
  const F = (id, role, en, ar, extra) => Object.assign({ id, kind: 'freq', role, q: B(en, ar) }, extra || {});
  const Y = (id, role, en, ar, extra) => Object.assign({ id, kind: 'yn', role, q: B(en, ar) }, extra || {});
  const Ch = (id, role, en, ar, options, extra) => Object.assign({ id, kind: 'choice', role, q: B(en, ar), options }, extra || {});
  const O = (id, en, ar, v) => ({ id, en, ar, v });

  const FREQ = [O('0', 'Never', 'أبداً', 0), O('1', 'Rarely', 'نادراً', 1), O('2', 'Sometimes', 'أحياناً', 2), O('3', 'Often', 'غالباً', 3), O('4', 'Very often', 'دائماً تقريباً', 4)];
  const YN = [O('yes', 'Yes', 'نعم', 1), O('no', 'No', 'لا', 0), O('unsure', 'Not sure', 'لست متأكداً', null)];
  // early-exit: if the first N core answers are all low, skip deeper questions
  const lowStart = (n) => a => { const core = Object.values(a).filter(x => x.role === 'core'); return core.length >= n && core.every(x => x.v != null && x.v <= 1); };
  const val = (a, id) => (a[id] ? a[id].v : undefined);

  const MODULES = {
    reading: {
      topic: 'dyslexia', name: B('dyslexia (a specific learning difference in reading)', 'عسر القراءة (اختلاف تعلّم محدد في القراءة)'),
      intro: B('Let’s talk about reading. I’ll ask about how reading feels now, a little about school, and what else might be going on. Answer however feels true — “not sure” and skipping are fine.', 'لنتحدث عن القراءة. سأسأل عن شعورك بالقراءة الآن، وقليلاً عن المدرسة، وما قد يكون له دور أيضاً. أجب بما تراه صحيحاً — «لست متأكداً» والتخطي مقبولان.'),
      items: [
        F('r1', 'core', 'When you read for your courses, how often do you need to re-read sentences to understand them?', 'عندما تقرأ لمقرراتك، كم مرة تحتاج إلى إعادة قراءة الجمل لفهمها؟'),
        F('r2', 'core', 'How often does reading feel slow and tiring, even when the material isn’t difficult?', 'كم مرة تشعر أن القراءة بطيئة ومتعبة حتى عندما لا تكون المادة صعبة؟'),
        F('r3', 'core', 'How often do you lose your place or skip a line while reading?', 'كم مرة تفقد مكانك أو تتخطى سطراً أثناء القراءة؟'),
        F('r4', 'core', 'How often is spelling hard for you — for example, spelling the same word different ways?', 'كم مرة يكون الإملاء صعباً عليك — مثل كتابة الكلمة نفسها بطرق مختلفة؟'),
        F('r5', 'core', 'How often do long or unfamiliar words and names trip you up when you read them aloud?', 'كم مرة تتعثر في الكلمات الطويلة أو غير المألوفة والأسماء عند قراءتها بصوت عالٍ؟', { skip: lowStart(4) }),
        F('r6', 'core', 'How often do you understand something much better when you hear it than when you read it?', 'كم مرة تفهم شيئاً بشكل أفضل بكثير عندما تسمعه مقارنة بقراءته؟', { skip: lowStart(4) }),
        Y('h1', 'history', 'Thinking back to primary school — was learning to read harder for you than for most classmates?', 'بالعودة إلى المرحلة الابتدائية — هل كان تعلّم القراءة أصعب عليك من معظم زملائك؟', { why: B('Dyslexia is present from childhood, so early history matters a lot.', 'عسر القراءة موجود منذ الطفولة، لذا فالتاريخ المبكر مهم جداً.'), skip: lowStart(4) }),
        Y('h2', 'history', 'Did you ever get extra help with reading or spelling at school?', 'هل حصلت يوماً على مساعدة إضافية في القراءة أو الإملاء في المدرسة؟', { skip: lowStart(4) }),
        Y('h3', 'history', 'Does anyone in your close family have difficulty with reading or spelling?', 'هل يعاني أحد من عائلتك المقربة من صعوبة في القراءة أو الإملاء؟', { why: B('Dyslexia often runs in families.', 'كثيراً ما يتوارث عسر القراءة في العائلات.'), skip: lowStart(4) }),
        Ch('c1', 'context', 'Does this happen when you read in your first language, in your second language, or both?', 'هل يحدث هذا عندما تقرأ بلغتك الأم، أم بلغتك الثانية، أم بكلتيهما؟',
          [O('both', 'Both languages', 'باللغتين', 2), O('first', 'Mainly my first language', 'بلغتي الأم غالباً', 2), O('second', 'Mainly my second language', 'بلغتي الثانية غالباً', 0), O('unsure', 'Not sure', 'لست متأكداً', null)],
          { why: B('If it’s only in a second language, language load is the more likely explanation.', 'إن كان باللغة الثانية فقط، فعبء اللغة هو التفسير الأرجح.') }),
        Y('c2', 'context', 'Does it happen with printed pages too, not only on screens?', 'هل يحدث مع الصفحات المطبوعة أيضاً، وليس على الشاشات فقط؟', { skip: lowStart(4) }),
        Y('i1', 'impact', 'Does reading affect your grades, or how long your coursework takes?', 'هل تؤثر القراءة في درجاتك، أو في الوقت الذي تستغرقه واجباتك؟'),
        Y('x1', 'exclude', 'Have you had a full eye test in the last two years?', 'هل أجريت فحص نظر كاملاً خلال العامين الماضيين؟', { why: B('Vision problems can make reading slow and tiring too.', 'مشكلات النظر قد تجعل القراءة بطيئة ومتعبة أيضاً.') })
      ],
      evaluate(a) {
        const r = base(a);
        r.history = val(a, 'h1') === 1 || val(a, 'h2') === 1;
        r.family = val(a, 'h3') === 1;
        const lang = a.c1 && a.c1.id;
        if (r.high >= 3 && r.history && lang !== 'second') r.level = 'strong';
        else if (r.high >= 2 || r.mean >= 2) r.level = 'some';
        else r.level = 'low';
        if (lang === 'second') { r.notes.push(B('It happens mainly in your second language, which points more to language load than to dyslexia.', 'يحدث غالباً بلغتك الثانية، مما يشير إلى عبء اللغة أكثر من عسر القراءة.')); r.level = down(r.level); }
        if (val(a, 'x1') === 0) r.checks.push(B('A full eye test (including near vision) — to rule out a vision cause first.', 'فحص نظر كامل (بما فيه الرؤية القريبة) — لاستبعاد سبب بصري أولاً.'));
        if (r.history) r.reasons.push(B('Reading was harder than for classmates from early on', 'كانت القراءة أصعب منها لدى زملائك منذ البداية'));
        if (r.family) r.reasons.push(B('Reading or spelling difficulties in the family', 'صعوبات قراءة أو إملاء في العائلة'));
        if (lang === 'both' || lang === 'first') r.reasons.push(B('It happens in your first language too', 'يحدث بلغتك الأم أيضاً'));
        return r;
      }
    },
    attention: {
      topic: 'adhd', name: B('ADHD (attention and executive-function differences)', 'اضطراب فرط الحركة وتشتت الانتباه'),
      intro: B('Let’s talk about focus and getting things done. I’ll ask how often some everyday things happen over the last six months, then a little about childhood — that part matters for ADHD.', 'لنتحدث عن التركيز وإنجاز المهام. سأسأل عن مدى تكرار بعض الأمور اليومية خلال الأشهر الستة الماضية، ثم قليلاً عن الطفولة — وهذا مهم في اضطراب الانتباه.'),
      items: [
        F('a1', 'core', 'How often do you have trouble wrapping up the final details of a project once the challenging parts are done?', 'كم مرة تواجه صعوبة في إنهاء التفاصيل الأخيرة لمشروع بعد انتهاء الأجزاء الصعبة؟'),
        F('a2', 'core', 'How often is it hard to get things in order when a task needs organisation?', 'كم مرة يصعب عليك ترتيب الأمور عندما تتطلب المهمة تنظيماً؟'),
        F('a3', 'core', 'How often do you forget appointments, deadlines or things you promised to do?', 'كم مرة تنسى المواعيد أو المواعيد النهائية أو أشياء وعدت بها؟'),
        F('a4', 'core', 'When a task needs a lot of thought, how often do you avoid or delay starting it?', 'عندما تتطلب مهمة تفكيراً كثيراً، كم مرة تتجنب البدء بها أو تؤجله؟', { skip: lowStart(4) }),
        F('a5', 'core', 'How often do you fidget or squirm when you have to sit still for a long time?', 'كم مرة تتململ أو تتحرك كثيراً عندما يجب أن تجلس ساكناً لوقت طويل؟', { skip: lowStart(4) }),
        F('a6', 'core', 'How often do you feel restless inside, or driven as if by a motor?', 'كم مرة تشعر بقلق داخلي، أو كأنك مدفوع بمحرك؟', { skip: lowStart(4) }),
        F('a7', 'core', 'How often does your mind drift during lectures or reading, even when the topic matters to you?', 'كم مرة يشرد ذهنك أثناء المحاضرات أو القراءة، حتى عندما يهمك الموضوع؟', { skip: lowStart(4) }),
        Y('h1', 'history', 'Before about age 12, did people often say you were easily distracted, restless or disorganised?', 'قبل سن ١٢ تقريباً، هل كان الناس يقولون غالباً إنك سريع التشتت أو كثير الحركة أو غير منظم؟', { why: B('For ADHD, signs need to have started in childhood.', 'في اضطراب الانتباه، يجب أن تكون العلامات قد بدأت في الطفولة.'), skip: lowStart(4) }),
        Y('h2', 'history', 'Did school reports or teachers often mention concentration, talking or not finishing work?', 'هل ذكرت التقارير المدرسية أو المعلمون كثيراً التركيز أو الكلام أو عدم إنهاء العمل؟', { skip: lowStart(4) }),
        Y('s1', 'context', 'Does this happen outside studying too — at home, with friends or at work?', 'هل يحدث هذا خارج الدراسة أيضاً — في البيت أو مع الأصدقاء أو في العمل؟', { why: B('ADHD shows up in more than one part of life.', 'يظهر اضطراب الانتباه في أكثر من جانب من الحياة.') }),
        Y('i1', 'impact', 'Has it caused real problems — missed deadlines, lower grades, or difficulties at work or in relationships?', 'هل سبّب مشكلات حقيقية — مواعيد فائتة، أو درجات أقل، أو صعوبات في العمل أو العلاقات؟'),
        Ch('x1', 'exclude', 'How many hours do you usually sleep on a school night?', 'كم ساعة تنام عادةً في ليلة الدراسة؟', [O('lt6', 'Less than 6', 'أقل من ٦', 0), O('6to7', '6–7', '٦–٧', 1), O('gt7', 'More than 7', 'أكثر من ٧', 2)], { why: B('Short sleep alone can cause most of these problems.', 'قلة النوم وحدها قد تسبب معظم هذه المشكلات.') }),
        Y('x2', 'exclude', 'Lately, have you been feeling very worried or low most days?', 'مؤخراً، هل تشعر بقلق شديد أو بالإحباط معظم الأيام؟', { why: B('Anxiety and low mood can look a lot like attention difficulties.', 'القلق وانخفاض المزاج قد يشبهان صعوبات الانتباه كثيراً.') })
      ],
      evaluate(a) {
        const r = base(a);
        const onset = val(a, 'h1') === 1 || val(a, 'h2') === 1;
        const settings = val(a, 's1') === 1, impact = val(a, 'i1') === 1;
        if (r.high >= 4 && onset && settings && impact) r.level = 'strong';
        else if (r.high >= 3 || r.mean >= 2.2) r.level = 'some';
        else r.level = 'low';
        if (r.level === 'strong' || r.level === 'some') {
          if (!onset) { r.level = 'some'; r.notes.push(B('For ADHD, signs need to have started in childhood. Since that isn’t clear, other explanations are worth checking too.', 'في اضطراب الانتباه يجب أن تكون العلامات قد بدأت في الطفولة. وبما أن ذلك غير واضح، فالتفسيرات الأخرى تستحق التحقق أيضاً.')); }
          if (!settings) r.notes.push(B('It seems to happen mainly while studying, which can also point to workload, interest or stress.', 'يبدو أنه يحدث أساساً أثناء الدراسة، مما قد يشير أيضاً إلى عبء العمل أو الاهتمام أو التوتر.'));
        }
        if (onset) r.reasons.push(B('Signs noticed in childhood', 'علامات لوحظت في الطفولة'));
        if (settings) r.reasons.push(B('It happens in more than one part of life', 'يحدث في أكثر من جانب من الحياة'));
        if (impact) r.reasons.push(B('It is causing real problems', 'يسبب مشكلات حقيقية'));
        if (a.x1 && a.x1.id === 'lt6') r.checks.push(B('Sleep — under 6 hours a night can cause many of these difficulties on its own.', 'النوم — أقل من ٦ ساعات ليلاً قد يسبب كثيراً من هذه الصعوبات وحده.'));
        if (val(a, 'x2') === 1) r.checks.push(B('Worry or low mood — a counsellor can help untangle this from attention difficulties.', 'القلق أو انخفاض المزاج — يمكن للمرشد المساعدة في فصل ذلك عن صعوبات الانتباه.'));
        return r;
      }
    },
    maths: {
      topic: 'dyscalculia', name: B('dyscalculia (a specific learning difference with numbers)', 'عسر الحساب (اختلاف تعلّم محدد في الأرقام)'),
      intro: B('Let’s talk about numbers. Some of these are everyday things, not exam maths.', 'لنتحدث عن الأرقام. بعضها أمور يومية وليست رياضيات الاختبارات.'),
      items: [
        F('m1', 'core', 'How often do simple number facts (like 7 × 8) fail to stick, so you count or work them out each time?', 'كم مرة لا تثبت حقائق الأعداد البسيطة (مثل ٧ × ٨) فتعدّها أو تحسبها كل مرة؟'),
        F('m2', 'core', 'How often is mental arithmetic — like working out change or splitting a bill — hard for you?', 'كم مرة يكون الحساب الذهني — مثل حساب الباقي أو تقسيم فاتورة — صعباً عليك؟'),
        F('m3', 'core', 'How often do you misjudge quantities, distances or how long things will take?', 'كم مرة تخطئ في تقدير الكميات أو المسافات أو الوقت الذي تستغرقه الأمور؟'),
        F('m4', 'core', 'How often do you mix up or reverse digits, like 41 and 14?', 'كم مرة تخلط بين الأرقام أو تعكسها، مثل ٤١ و١٤؟', { skip: lowStart(3) }),
        F('m5', 'core', 'How often do you feel strong anxiety when you have to do maths?', 'كم مرة تشعر بقلق شديد عندما يجب أن تحل مسائل رياضية؟', { skip: lowStart(3) }),
        Y('h1', 'history', 'In primary school, was maths much harder for you than for most classmates?', 'في المرحلة الابتدائية، هل كانت الرياضيات أصعب بكثير عليك من معظم زملائك؟', { skip: lowStart(3) }),
        Y('x1', 'exclude', 'Did you miss a lot of school, or switch between very different school systems?', 'هل فاتك الكثير من الدراسة، أو انتقلت بين أنظمة مدرسية مختلفة جداً؟', { why: B('Gaps in teaching can look like a learning difference.', 'الفجوات في التعليم قد تبدو كاختلاف تعلّم.') }),
        Y('i1', 'impact', 'Does it affect your courses or everyday life (money, time, directions)?', 'هل يؤثر في مقرراتك أو حياتك اليومية (المال، الوقت، الاتجاهات)؟')
      ],
      evaluate(a) {
        const r = base(a);
        const hist = val(a, 'h1') === 1;
        r.level = r.high >= 3 && hist ? 'strong' : (r.high >= 2 || r.mean >= 2) ? 'some' : 'low';
        if (hist) r.reasons.push(B('Maths was harder than for classmates from early on', 'كانت الرياضيات أصعب منها لدى زملائك منذ البداية'));
        if (val(a, 'x1') === 1) { r.checks.push(B('Gaps in schooling — a maths tutor can tell missed teaching apart from a learning difference.', 'الفجوات الدراسية — يمكن لمدرّس الرياضيات التمييز بين ما فاتك من تعليم واختلاف التعلّم.')); r.level = down(r.level); }
        if (val(a, 'm5') >= 3) r.notes.push(B('Maths anxiety came up too — it often goes together with number difficulties and is very treatable.', 'ظهر قلق الرياضيات أيضاً — وكثيراً ما يرافق صعوبات الأرقام ويمكن علاجه بشكل جيد.'));
        return r;
      }
    },
    writing: {
      topic: 'dysgraphia', name: B('dysgraphia / a written-expression difficulty', 'عسر الكتابة / صعوبة التعبير الكتابي'),
      intro: B('Let’s talk about writing — getting ideas from your head onto the page.', 'لنتحدث عن الكتابة — نقل الأفكار من ذهنك إلى الصفحة.'),
      items: [
        F('w1', 'core', 'How often does writing something take much longer than explaining the same idea out loud?', 'كم مرة تستغرق كتابة شيء وقتاً أطول بكثير من شرح الفكرة نفسها بصوت عالٍ؟'),
        F('w2', 'core', 'How often is it hard to organise your ideas into clear paragraphs?', 'كم مرة يصعب عليك تنظيم أفكارك في فقرات واضحة؟'),
        F('w3', 'core', 'How often does handwriting make your hand ache, or end up hard for others to read?', 'كم مرة تؤلمك يدك من الكتابة، أو يصبح خطك صعب القراءة على الآخرين؟'),
        F('w4', 'core', 'How often do you freeze in front of a blank page?', 'كم مرة تتجمّد أمام صفحة فارغة؟', { skip: lowStart(3) }),
        F('w5', 'core', 'How often do spelling or grammar mistakes slip through even after you check?', 'كم مرة تفوتك أخطاء إملائية أو نحوية حتى بعد المراجعة؟', { skip: lowStart(3) }),
        Y('h1', 'history', 'At school, was writing or handwriting noticeably harder for you than for others?', 'في المدرسة، هل كانت الكتابة أو الخط أصعب عليك بشكل ملحوظ من الآخرين؟', { skip: lowStart(3) }),
        Ch('c1', 'context', 'Is writing hard in your first language too, or mainly in your second?', 'هل الكتابة صعبة بلغتك الأم أيضاً، أم بلغتك الثانية غالباً؟', [O('both', 'Both', 'كلتاهما', 2), O('second', 'Mainly my second language', 'بلغتي الثانية غالباً', 0), O('unsure', 'Not sure', 'لست متأكداً', null)]),
        Y('i1', 'impact', 'Does it affect your marks or how long assignments take?', 'هل يؤثر في درجاتك أو في الوقت الذي تستغرقه الواجبات؟')
      ],
      evaluate(a) {
        const r = base(a);
        const hist = val(a, 'h1') === 1;
        r.level = r.high >= 3 && hist ? 'strong' : (r.high >= 2 || r.mean >= 2) ? 'some' : 'low';
        if (hist) r.reasons.push(B('Writing was harder than for others at school', 'كانت الكتابة أصعب منها لدى الآخرين في المدرسة'));
        if (a.c1 && a.c1.id === 'second') { r.level = down(r.level); r.notes.push(B('It’s mainly in your second language, so the writing centre may help most.', 'إنه بلغتك الثانية غالباً، لذا قد يفيدك مركز الكتابة أكثر.')); }
        if (val(a, 'w3') >= 3) r.checks.push(B('Hand pain or very slow handwriting — an occupational therapist can check motor skills.', 'ألم اليد أو بطء الكتابة الشديد — يمكن لأخصائي العلاج الوظيفي فحص المهارات الحركية.'));
        return r;
      }
    },
    listening: {
      topic: 'apd', name: B('a listening / auditory-processing difficulty', 'صعوبة في الاستماع / المعالجة السمعية'),
      intro: B('Let’s talk about listening — lectures, videos and conversations.', 'لنتحدث عن الاستماع — المحاضرات والفيديوهات والمحادثات.'),
      items: [
        F('l1', 'core', 'How often is it hard to follow what people say in noisy places, like a café or a busy class?', 'كم مرة يصعب عليك متابعة ما يقوله الناس في أماكن صاخبة، مثل مقهى أو صف مزدحم؟'),
        F('l2', 'core', 'How often do you ask people to repeat themselves?', 'كم مرة تطلب من الناس إعادة كلامهم؟'),
        F('l3', 'core', 'How often do you lose track of long spoken instructions?', 'كم مرة تفقد تسلسل التعليمات الشفهية الطويلة؟'),
        F('l4', 'core', 'How often do lectures or videos feel too fast to follow without rewinding?', 'كم مرة تبدو المحاضرات أو الفيديوهات أسرع من أن تتابعها دون إعادة؟', { skip: lowStart(3) }),
        F('l5', 'core', 'How often do you mishear words that sound similar?', 'كم مرة تخلط بين كلمات متشابهة في النطق؟', { skip: lowStart(3) }),
        Y('c1', 'context', 'In a quiet one-to-one conversation, is listening usually easy?', 'في محادثة هادئة بين شخصين، هل يكون الاستماع سهلاً عادةً؟'),
        Y('c2', 'context', 'Does it happen in your first language too?', 'هل يحدث بلغتك الأم أيضاً؟'),
        Y('x1', 'exclude', 'Have you had a proper hearing test (with an audiologist) in the last few years?', 'هل أجريت فحص سمع حقيقياً (لدى أخصائي سمعيات) في السنوات الأخيرة؟', { why: B('A hearing loss must be ruled out before anything else.', 'يجب استبعاد ضعف السمع قبل أي شيء آخر.') }),
        Y('i1', 'impact', 'Does it affect how much you get from lectures?', 'هل يؤثر في مقدار ما تستفيده من المحاضرات؟')
      ],
      evaluate(a) {
        const r = base(a);
        const quietOk = val(a, 'c1') === 1, firstLang = val(a, 'c2') === 1, tested = val(a, 'x1') === 1;
        r.level = r.high >= 3 && firstLang ? 'strong' : (r.high >= 2 || r.mean >= 2) ? 'some' : 'low';
        if (quietOk && r.level !== 'low') r.reasons.push(B('Fine in quiet, harder in noise — a typical listening-in-noise pattern', 'جيد في الهدوء وأصعب في الضوضاء — نمط نموذجي للاستماع وسط الضوضاء'));
        if (val(a, 'c2') === 0) { r.level = down(r.level); r.notes.push(B('It’s mainly in your second language, so language load and accents may be the bigger part.', 'إنه بلغتك الثانية غالباً، لذا قد يكون عبء اللغة واللهجات هو الجزء الأكبر.')); }
        if (!tested && r.level !== 'low') { r.checks.push(B('A full hearing test with an audiologist — always the first step.', 'فحص سمع كامل لدى أخصائي السمعيات — دائماً الخطوة الأولى.')); if (r.level === 'strong') r.notes.push(B('Because hearing hasn’t been tested, the next step is a hearing test before any processing assessment.', 'لأن السمع لم يُفحص، فالخطوة التالية فحص السمع قبل أي تقييم للمعالجة.')); }
        return r;
      }
    },
    vision: {
      topic: 'vision', name: B('a vision or visual-comfort problem', 'مشكلة في النظر أو الراحة البصرية'),
      intro: B('A few quick questions about your eyes while reading.', 'بضعة أسئلة سريعة عن عينيك أثناء القراءة.'),
      items: [
        F('v1', 'core', 'How often does text look blurry, double, or seem to move?', 'كم مرة يبدو النص ضبابياً أو مزدوجاً أو يبدو أنه يتحرك؟'),
        F('v2', 'core', 'How often do you get headaches or sore eyes after reading?', 'كم مرة تصاب بالصداع أو ألم العينين بعد القراءة؟'),
        F('v3', 'core', 'How often do bright screens or white paper feel uncomfortably glaring?', 'كم مرة تبدو الشاشات الساطعة أو الورق الأبيض مزعجة بوهجها؟'),
        F('v4', 'core', 'How often do you need to enlarge text or hold things very close?', 'كم مرة تحتاج إلى تكبير النص أو تقريب الأشياء كثيراً؟'),
        Y('x1', 'exclude', 'Have you had a full eye test in the last two years?', 'هل أجريت فحص نظر كاملاً خلال العامين الماضيين؟')
      ],
      evaluate(a) {
        const r = base(a);
        r.level = r.high >= 2 ? 'strong' : (r.high >= 1 || r.mean >= 1.8) ? 'some' : 'low';
        if (r.level !== 'low') r.checks.push(B('An eye examination with an optometrist, including near and binocular vision.', 'فحص عيون لدى أخصائي البصريات يشمل الرؤية القريبة والرؤية بالعينين.'));
        if (val(a, 'x1') === 0) r.reasons.push(B('No eye test in the last two years', 'لا فحص للنظر خلال العامين الماضيين'));
        return r;
      }
    },
    wellbeing: {
      topic: 'anxiety', name: B('stress, test anxiety or low mood', 'التوتر أو قلق الاختبار أو انخفاض المزاج'),
      intro: B('Let’s check in on how you’ve been feeling. These questions are about the last two weeks. You can skip anything.', 'لنطمئن على شعورك. هذه الأسئلة عن الأسبوعين الماضيين. يمكنك تخطي أي سؤال.'),
      items: [
        F('e1', 'core', 'How often has worrying felt hard to control?', 'كم مرة شعرت أن القلق يصعب التحكم فيه؟', { group: 'anx' }),
        F('e2', 'core', 'In exams, how often does your mind go blank even though you studied?', 'في الاختبارات، كم مرة يصبح ذهنك فارغاً رغم أنك ذاكرت؟', { group: 'test' }),
        F('e3', 'core', 'How often do you get physical signs of stress before tests — racing heart, nausea, shaking?', 'كم مرة تظهر عليك علامات جسدية للتوتر قبل الاختبارات — تسارع القلب أو الغثيان أو الارتجاف؟', { group: 'test' }),
        F('e4', 'core', 'How often have you felt down, empty or hopeless?', 'كم مرة شعرت بالإحباط أو الفراغ أو اليأس؟', { group: 'mood' }),
        F('e5', 'core', 'How often have you lost interest in things you usually enjoy?', 'كم مرة فقدت الاهتمام بأشياء تستمتع بها عادةً؟', { group: 'mood' }),
        F('e6', 'core', 'How often has your sleep been a problem — too little, too much, or restless?', 'كم مرة كان نومك مشكلة — قليلاً جداً أو كثيراً جداً أو مضطرباً؟', { group: 'mood' }),
        Y('s1', 'safety', 'Sometimes when people feel this low, they have thoughts of hurting themselves or that life isn’t worth living. Have you had thoughts like that?', 'أحياناً عندما يشعر الناس بهذا الإحباط، تراودهم أفكار عن إيذاء أنفسهم أو أن الحياة لا تستحق. هل راودتك أفكار كهذه؟',
          { skip: a => !((val(a, 'e4') || 0) >= 3 || (val(a, 'e5') || 0) >= 3), why: B('I ask everyone who feels this low — it’s important, and it’s okay to answer honestly.', 'أسأل كل من يشعر بهذا الإحباط — إنه مهم، ولا بأس أن تجيب بصدق.') }),
        Y('i1', 'impact', 'Is it getting in the way of studying or daily life?', 'هل يعيق دراستك أو حياتك اليومية؟')
      ],
      evaluate(a) {
        const r = base(a);
        const g = k => { const xs = this.items.filter(i => i.group === k).map(i => val(a, i.id)).filter(v => v != null); return xs.length ? xs.reduce((p, q) => p + q, 0) / xs.length : 0; };
        const test = g('test'), mood = g('mood'), anx = g('anx');
        r.level = Math.max(test, mood, anx) >= 3 ? 'strong' : Math.max(test, mood, anx) >= 2 ? 'some' : 'low';
        r.sub = mood >= Math.max(test, anx) && mood >= 2 ? 'mood' : test >= anx ? 'test' : 'anxiety';
        if (r.sub === 'mood') r.name = B('low mood', 'انخفاض المزاج');
        if (r.sub === 'test') r.name = B('test anxiety', 'قلق الاختبار');
        if (r.sub === 'anxiety') r.name = B('ongoing worry / anxiety', 'القلق المستمر');
        if (r.level !== 'low') r.checks.push(B('A conversation with the university counselling / wellbeing team — this is exactly what they help with.', 'حديث مع فريق الإرشاد والرفاه في الجامعة — هذا بالضبط ما يساعدون فيه.'));
        return r;
      }
    },
    social: {
      topic: 'autism', name: B('autism-related communication and sensory differences', 'اختلافات في التواصل والحواس مرتبطة بالتوحد'),
      intro: B('Let’s talk about communication, routines and how you experience your surroundings. There are no wrong answers — everyone is different.', 'لنتحدث عن التواصل والروتين وكيف تختبر محيطك. لا توجد إجابات خاطئة — كل شخص مختلف.'),
      items: [
        F('s1', 'core', 'How often do social situations feel confusing or exhausting, even with people you like?', 'كم مرة تبدو المواقف الاجتماعية مربكة أو مرهقة، حتى مع أشخاص تحبهم؟'),
        F('s2', 'core', 'How often is it hard to tell what someone is thinking or feeling from their face or tone?', 'كم مرة يصعب عليك معرفة ما يفكر فيه شخص أو يشعر به من وجهه أو نبرة صوته؟'),
        F('s3', 'core', 'How often do unexpected changes to plans or routines feel very stressful?', 'كم مرة تبدو التغييرات المفاجئة في الخطط أو الروتين مرهقة جداً؟'),
        F('s4', 'core', 'How often are noises, lights, smells or crowds overwhelming for you?', 'كم مرة تكون الأصوات أو الأضواء أو الروائح أو الزحام مزعجة جداً لك؟', { skip: lowStart(3) }),
        F('s5', 'core', 'How often do you find small talk hard or pointless?', 'كم مرة تجد الأحاديث الجانبية صعبة أو بلا فائدة؟', { skip: lowStart(3) }),
        F('s6', 'core', 'How often do people tell you that you took something too literally?', 'كم مرة يقول لك الناس إنك فهمت شيئاً بشكل حرفي جداً؟', { skip: lowStart(3) }),
        Y('h1', 'history', 'Have you felt this way since you were a child?', 'هل شعرت بهذا منذ طفولتك؟', { skip: lowStart(3) }),
        Y('x1', 'exclude', 'Is it mostly a fear of being judged or embarrassed in social situations?', 'هل هو في الغالب خوف من الحكم عليك أو الإحراج في المواقف الاجتماعية؟', { why: B('That can point more to social anxiety, which needs different support.', 'قد يشير ذلك أكثر إلى القلق الاجتماعي، الذي يحتاج إلى دعم مختلف.') })
      ],
      evaluate(a) {
        const r = base(a);
        const hist = val(a, 'h1') === 1;
        r.level = r.high >= 4 && hist ? 'strong' : (r.high >= 3 || r.mean >= 2.3) ? 'some' : 'low';
        if (hist) r.reasons.push(B('These experiences go back to childhood', 'هذه التجارب تعود إلى الطفولة'));
        if (val(a, 'x1') === 1) { r.level = down(r.level); r.notes.push(B('Fear of judgement came up — that often points to social anxiety, which counselling helps with a lot.', 'ظهر الخوف من الحكم — وهذا غالباً يشير إلى القلق الاجتماعي الذي يفيد فيه الإرشاد كثيراً.')); }
        return r;
      }
    }
  };
  const AREAS = Object.keys(MODULES);
  const ORDER = ['low', 'some', 'strong'];
  const down = l => (l === 'strong' ? 'some' : l === 'some' ? 'low' : l);
  const up = l => (l === 'low' ? 'some' : 'strong');
  function base(a) {
    const core = Object.values(a).filter(x => x.role === 'core' && x.v != null);
    const mean = core.length ? core.reduce((p, q) => p + q.v, 0) / core.length : 0;
    return { high: core.filter(x => x.v >= 3).length, mean: Math.round(mean * 100) / 100, answered: core.length, reasons: [], notes: [], checks: [], level: 'low' };
  }

  /* ---------------- free-text understanding (EN + AR) ---------------- */
  const SCALE = [
    [4, /\b(very often|always|all the time|constantly|every (time|day)|almost always)\b|دائما|دائماً|طوال الوقت|كل يوم|كل مرة/i],
    [3, /\b(often|usually|a lot|frequently|most of the time|mostly)\b|غالبا|غالباً|كثيرا|كثيراً|عادة/i],
    [2, /\b(sometimes|occasionally|now and then|it depends|kind of|sort of)\b|أحيانا|أحياناً|يعتمد/i],
    [1, /\b(rarely|hardly|seldom|not (really|much|often)|once or twice)\b|نادرا|نادراً|قليلا|قليلاً/i],
    [0, /\b(never|not at all|no)\b|أبدا|أبداً|إطلاقا|لا$/i]
  ];
  function parseFreq(text) { const t = String(text || ''); const hit = SCALE.find(([, re]) => re.test(t)); return hit ? hit[0] : null; }
  function parseYN(text) {
    const t = String(text || '').trim();
    if (/\b(not sure|don'?t know|unsure|maybe|i guess|can'?t remember|no idea)\b|لست متأكد|لا أعرف|ربما|لا أتذكر/i.test(t)) return 'unsure';
    if (/^\s*(yes|yeah|yep|yup|sure|definitely|of course|i (did|do|have|was)|it (did|does))\b|^\s*(نعم|أجل|أكيد|بالتأكيد|صحيح)/i.test(t)) return 'yes';
    if (/^\s*(no|nope|nah|never|not really|i (didn'?t|don'?t|haven'?t|wasn'?t))\b|^\s*(لا|كلا|أبدا)/i.test(t)) return 'no';
    return null;
  }
  const SKIP = /^\s*(skip|pass|next|rather not|prefer not)|تخط|تجاوز|لا أريد/i;
  const STOP = /\b(stop|end (the )?(chat|interview|questions)|that'?s enough|i'?m done|quit)\b|توقف|إنهاء|يكفي/i;

  /* ---------------- the engine ---------------- */
  function create(area, opts) {
    const mod = MODULES[area];
    if (!mod) throw new Error('unknown area ' + area);
    return { area, mod, idx: -1, answers: {}, asked: 0, skipped: 0, done: false, crisis: false, stopped: false, objective: (opts && opts.objective) || null, current: null };
  }
  function nextQuestion(iv) {
    const items = iv.mod.items;
    for (let i = iv.idx + 1; i < items.length; i++) {
      const it = items[i];
      if (it.skip && it.skip(iv.answers)) continue;
      iv.idx = i; iv.current = it; iv.asked++;
      return question(it, iv);
    }
    iv.current = null;
    return null;
  }
  function question(it, iv) {
    const opts = it.kind === 'freq' ? FREQ : it.kind === 'yn' ? YN : it.options;
    return { id: it.id, kind: it.kind, role: it.role, q: it.q, why: it.why || null, options: opts, n: iv.asked, total: iv.mod.items.length };
  }
  const ACKS = [B('Okay.', 'حسناً.'), B('Thanks — that helps.', 'شكراً — هذا يساعد.'), B('Got it.', 'فهمت.'), B('Thank you for being open about that.', 'شكراً لصراحتك.'), B('That’s useful to know.', 'هذا مفيد.')];
  function start(iv) { const q = nextQuestion(iv); return { intro: iv.mod.intro, question: q }; }
  // input: { option: id } or { text }
  function answer(iv, input) {
    if (iv.done || !iv.current) return { done: true };
    const it = iv.current;
    const text = input && input.text != null ? String(input.text) : '';
    if (text && STOP.test(text)) { iv.stopped = true; iv.done = true; return { done: true, stopped: true }; }
    let opt = null;
    if (input && input.option) opt = (it.kind === 'freq' ? FREQ : it.kind === 'yn' ? YN : it.options).find(o => o.id === input.option) || null;
    else if (text && !SKIP.test(text)) {
      if (it.kind === 'freq') { const v = parseFreq(text); if (v != null) opt = FREQ.find(o => o.v === v); else if (parseYN(text) === 'yes') opt = FREQ[3]; else if (parseYN(text) === 'no') opt = FREQ[0]; }
      else if (it.kind === 'yn') { const y = parseYN(text); if (y) opt = YN.find(o => o.id === y); }
      else { const t = text.toLowerCase(); opt = it.options.find(o => t.includes(o.en.toLowerCase().split(' ')[0]) || text.includes(o.ar)) || null; }
      if (!opt) return { clarify: true, question: question(it, iv), msg: B('Sorry, I didn’t quite catch that — could you pick one of the options, or say “skip”?', 'عذراً، لم أفهم تماماً — هل يمكنك اختيار أحد الخيارات، أو قول «تخطٍّ»؟') };
    }
    if (!opt) { iv.skipped++; iv.answers[it.id] = { id: 'skip', v: null, role: it.role }; }
    else iv.answers[it.id] = { id: opt.id, v: opt.v, role: it.role, text: text || null };
    // safety first
    if (it.role === 'safety' && opt && opt.id === 'yes') { iv.crisis = true; iv.done = true; return { done: true, crisis: true }; }
    const q = nextQuestion(iv);
    const ack = ACKS[(iv.asked + it.id.length) % ACKS.length];
    if (!q) { iv.done = true; return { done: true, ack }; }
    return { ack, question: q };
  }

  // Combine the interview with what ERLY observed (objective: 'none'|'early'|'some'|'strong'|null)
  function result(iv, objective) {
    const mod = iv.mod;
    const r = mod.evaluate.call(mod, iv.answers);
    const answered = Object.values(iv.answers).filter(x => x.v != null).length;
    const obj = objective !== undefined ? objective : iv.objective;
    let level = r.level;
    if (iv.stopped || answered < 3 || (iv.skipped > answered)) level = 'unclear';
    let agreement = 'not-available';
    if (obj && level !== 'unclear') {
      const objOn = obj === 'some' || obj === 'strong';
      if (objOn && level === 'some') { level = 'strong'; agreement = 'agrees'; }
      else if (objOn && level === 'strong') agreement = 'agrees';
      else if (objOn && level === 'low') agreement = 'differs';
      else if (!objOn && level === 'strong') agreement = 'not-seen';
      else agreement = obj === 'none' ? 'none' : 'partial';
    }
    const name = r.name || mod.name;
    const headline = {
      strong: B(`Your answers show a clear pattern that is often seen with ${name[0]}. That doesn’t mean you have it — but it is worth a formal assessment, which is the only way to know for sure.`, `تُظهر إجاباتك نمطاً واضحاً يُرى كثيراً مع ${name[1]}. هذا لا يعني أنه لديك — لكنه يستحق تقييماً رسمياً، وهو الطريقة الوحيدة للتأكد.`),
      some: B(`Some of what you describe is often seen with ${name[0]}, but it isn’t clear-cut. Talking it through with SAS would help work out what’s going on.`, `بعض ما تصفه يُرى كثيراً مع ${name[1]}، لكنه ليس قاطعاً. الحديث مع خدمات الطلبة سيساعد على فهم ما يحدث.`),
      low: B(`Your answers don’t point strongly to ${name[0]}. If something still feels hard, that matters — support is available either way.`, `إجاباتك لا تشير بقوة إلى ${name[1]}. إن بقي شيء صعباً فهذا مهم — والدعم متاح في كل الأحوال.`),
      unclear: B('There isn’t enough here to say anything — and that’s completely fine. We can pick this up again any time.', 'لا يوجد ما يكفي لقول أي شيء — ولا بأس في ذلك إطلاقاً. يمكننا العودة إلى هذا في أي وقت.')
    }[level];
    const agreeText = {
      agrees: B('This matches what ERLY noticed in your activity, which makes the picture more consistent.', 'هذا يتوافق مع ما لاحظه إيرلي في نشاطك، مما يجعل الصورة أكثر اتساقاً.'),
      'not-seen': B('ERLY hasn’t seen this clearly in your activity yet — your own experience still counts most.', 'لم يلاحظ إيرلي هذا بوضوح في نشاطك بعد — وتجربتك الشخصية تبقى الأهم.'),
      differs: B('ERLY did notice some friction in this area, even though your answers were mostly low — worth keeping an eye on.', 'لاحظ إيرلي بعض الاحتكاك في هذا المجال رغم أن إجاباتك كانت منخفضة غالباً — يستحق المتابعة.'),
      partial: null, none: null, 'not-available': null
    }[agreement];
    return { area: iv.area, topic: mod.topic, level, rawLevel: r.level, name, headline, agreement, agreeText, reasons: r.reasons, notes: r.notes, checks: r.checks, crisis: iv.crisis, answered, skipped: iv.skipped, high: r.high, mean: r.mean, sub: r.sub || null, at: new Date().toISOString() };
  }
  return { MODULES, AREAS, FREQ, YN, create, start, answer, result, parseFreq, parseYN, ORDER };
});
