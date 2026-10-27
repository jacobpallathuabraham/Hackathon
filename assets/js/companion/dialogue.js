/* ERLY AI Reading Companion — Layer 3: the conversation state machine.

   A transparent, rule-based engine that decides WHAT to ask next. It starts
   open-ended, adapts follow-ups to the student's answers and to what the
   signal engine observed, never asks every question, and can conclude that
   there is not enough information.

   Every conversation produces typed entries that are kept apart on purpose:
     observation    — something the application measured (from Layer 2)
     report         — what the student said
     interpretation — an uncertain reading of the two ("may", never "is")
     recommendation — a practical accessibility tool
     referral       — a situation where a professional may be useful
   No path maps an observation to a disability label.

   Pure functions, no DOM: window.ERLY_DIALOGUE in the browser, CommonJS in
   Node for the unit tests. An optional language model (Layer 4) may rephrase
   a question or help classify an answer, but it cannot change the flow. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_DIALOGUE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_QUESTIONS = 8;
  const BANNED = /dyslexi|adhd|attention[- ]deficit|disorder|diagnos|disabilit|dyscalcul|dysgraph|autis|probabilit|\b\d{1,3}\s?%|عسر القراءة|اضطراب|تشخيص|إعاقة/i;

  /* ---------------- answer understanding (rule-based, EN + AR) ---------------- */
  const PATTERNS = [
    ['stop', /\b(stop|end (the |this )?(chat|conversation)|that'?s all|good ?bye|bye|i'?m done|enough for now)\b|إنهاء|انهاء|أنهِ|توقف|يكفي|وداعا/i],
    ['skip', /^\s*(skip|pass)\b|next question|rather not|prefer not to|don'?t want to (say|answer)|تخطي|تخطّ|تجاوز|لا أريد الإجابة/i],
    ['unsure', /not sure|don'?t know|no idea|unsure|hard to say|can'?t tell|لا أعرف|لست متأكد|ما أدري|لا أدري/i],
    ['lost_place', /lost (my )?(place|track)|los(e|ing) (my )?(place|track)|keep(ing)? (my )?place|which line|skip(ped|ping)? (a )?line|lines? (blur|merge|jump|move)|track(ing)? (the )?lines?|re-?read the same line|أضعت مكاني|أفقد مكاني|أضيع مكاني|السطر|الأسطر/i],
    ['vocab', /\bwords?\b|vocab|\bterms?\b|jargon|definition|what .* means|technical|كلمة|كلمات|مصطلح|معنى/i],
    ['understanding', /understand|confus|dense|complicated|complex|hard to follow|make sense|didn'?t get|the idea|concept|لم أفهم|صعب الفهم|مربك|معقد|كثيف|الفكرة/i],
    ['searching', /look(ing)? for|search|find(ing)? (a |the )?(detail|number|fact|formula|value|part)|check(ing)? (a |the )?(detail|number|fact|formula|value)|أبحث|البحث عن|أدور على/i],
    ['intentional', /on purpose|intentional|just (checking|scrolling|navigating|browsing|skimming|looking around)|skim|navigat|revis(e|ing)|went back to (check|compare)|عن قصد|أتصفح|كنت أراجع|مراجعة/i],
    ['diagram', /diagram|figure|picture|graph|chart|drawing|الرسم|الشكل|المخطط/i],
    ['blurry', /blur|fuzzy|double|swim|shimmer|strain(ing)? my eyes|eyes? (hurt|ache|tired|strain)|ضبابي|مشوش|عيوني|عيني تؤلمني/i],
    ['crowded', /crowd|clutter|busy|packed|too close|cramped|wall of text|squash|مزدحم|متلاصق|مكتظ|متزاحم/i],
    ['too_small', /too small|\bsmall\b|tiny|hard to see|can'?t see|bigger|صغير|لا أرى/i],
    ['tired', /tired|exhausted|sleepy|fatigue|worn out|متعب|تعبان|نعسان|مرهق/i],
    ['distracted', /distract|noise|noisy|my phone|can'?t focus|mind wander|concentrat|مشتت|تركيز|إزعاج|ضوضاء/i],
    ['time_pressure', /deadline|rush|hurry|time pressure|no time|exam|test tomorrow|stress|ضيق الوقت|موعد التسليم|امتحان|مستعجل|ضغط/i],
    ['screen', /phone|small screen|laptop|tablet|\bscreen\b|شاشة|جوال|هاتف/i],
    ['lighting', /light|glare|bright|\bdim\b|\bdark\b|إضاءة|ضوء|مظلم|سطوع/i],
    ['audio_understand', /understand (it )?better|helps? me understand|easier to understand|makes? (more )?sense when|أفهم أفضل|أفهم أكثر/i],
    ['audio_effort', /less effort|less tiring|rest my eyes|less work|takes? the load|أقل تعب|أقل جهد|أريح عيني/i],
    ['audio_preference', /prefer (listening|audio|to listen)|like (listening|audio|hearing)|habit|podcast|how i (like to )?learn|أفضّل الاستماع|أفضل الاستماع|أحب الاستماع/i],
    ['preference', /just (my )?preference|i (just )?like (it|bigger|this)|more comfortable|personal|my preference|تفضيل|أرتاح/i],
    ['this_doc', /just this|only this|this (one|document|pdf|reading|text)|mainly (this|here)|هذا فقط|هذه فقط|هذا المستند|هذه القراءة/i],
    ['other_docs', /other (docs|documents|readings|pdfs|books|texts|classes)|always|every (time|reading)|everything|usually|often|all the time|a lot|in general|most (readings|texts)|دائما|دائماً|غالبا|غالباً|مستندات أخرى|كل القراءات|عادة/i],
    ['lang_both', /\bboth\b|either|كلتا|الاثنين|كلاهما|الاثنتين/i],
    ['lang_en', /english|إنجليزي|الإنجليزية|انجليزي/i],
    ['lang_ar', /arabic|عربي|العربية/i],
    ['a_bit', /a (little )?bit|somewhat|kind of|sort of|slightly|partly|قليلا|قليلاً|نوعا ما|نوعاً ما/i],
    ['not_helped', /not really|didn'?t help|doesn'?t help|not (any )?better|no difference|worse|same as before|لم يساعد|ليس فعلا|لا يساعد|نفسه|أسوأ/i],
    ['helped', /help(ed|s|ful)?|better|easier|works|good|great|clearer|ساعد|أفضل|أسهل|أوضح|ممتاز/i],
    ['yes', /^\s*(yes|yeah|yep|yup|sure|ok(ay)?|please|definitely|of course|i have|i do|it does)\b|^\s*(نعم|أجل|طيب|أكيد|اكيد|حسنا|حسناً|بالتأكيد)/i],
    ['no', /^\s*(no|nope|nah|not really|never|i haven'?t|i don'?t|it doesn'?t)\b|^\s*(لا|كلا|أبدا|أبداً)(\s|$)/i]
  ];
  function classify(text) {
    const t = String(text || '').replace(/[’‘`]/g, "'").trim();
    if (!t) return [];
    const hits = [];
    PATTERNS.forEach(([id, re]) => { if (re.test(t)) hits.push(id); });
    if (hits.includes('not_helped')) { const i = hits.indexOf('helped'); if (i >= 0) hits.splice(i, 1); }
    if (hits.includes('lang_both')) ['lang_en', 'lang_ar'].forEach(x => { const i = hits.indexOf(x); if (i >= 0) hits.splice(i, 1); });
    else if (hits.includes('lang_en') && hits.includes('lang_ar')) { hits.push('lang_both'); }
    return hits;
  }

  /* ---------------- questions & chips ---------------- */
  const C = (id, en, ar) => ({ id, en, ar });
  const Q = {
    why_return: { en: 'What made you go back to that part? There’s no wrong answer.', ar: 'ما الذي جعلك تعود إلى ذلك الجزء؟ لا توجد إجابة خاطئة.',
      chips: [C('lost_place', 'I lost my place', 'أضعت مكاني'), C('understanding', 'It was hard to understand', 'كان صعب الفهم'), C('vocab', 'Unfamiliar words', 'كلمات غير مألوفة'), C('searching', 'I was looking for a detail', 'كنت أبحث عن تفصيل'), C('intentional', 'Just checking — on purpose', 'كنت أراجع — عن قصد')] },
    open_general: { en: 'What’s going on with this reading right now? You can type, speak, or tap an option.', ar: 'ما الذي يحدث مع هذه القراءة الآن؟ يمكنك الكتابة أو التحدث أو اختيار خيار.',
      chips: [C('lost_place', 'Keeping my place', 'الحفاظ على مكاني'), C('understanding', 'Understanding it', 'فهمها'), C('too_small', 'Seeing the text', 'رؤية النص'), C('tired', 'I’m tired or distracted', 'أنا متعب أو مشتت'), C('intentional', 'Nothing — just exploring', 'لا شيء — أستكشف فقط')] },
    clarify: { en: 'Would you say it was more about keeping your place on the page, or about understanding the words?', ar: 'هل كان الأمر أقرب إلى الحفاظ على مكانك في الصفحة، أم إلى فهم الكلمات؟',
      chips: [C('lost_place', 'Keeping my place', 'الحفاظ على مكاني'), C('understanding', 'Understanding the words', 'فهم الكلمات'), C('unsure', 'Not sure', 'لست متأكداً')] },
    zoom_why: { en: 'I noticed the zoom and text settings changing a few times. Was the text too small, visually crowded, blurry, or hard to track?', ar: 'لاحظت أن إعدادات التكبير والنص تغيّرت عدة مرات. هل كان النص صغيراً جداً، أو مزدحماً بصرياً، أو ضبابياً، أو صعب التتبّع؟',
      chips: [C('too_small', 'Too small', 'صغير جداً'), C('crowded', 'Crowded', 'مزدحم'), C('blurry', 'Blurry', 'ضبابي'), C('lost_place', 'Hard to track', 'صعب التتبّع'), C('preference', 'Just my preference', 'مجرد تفضيل')] },
    tts_why: { en: 'You’ve been using read-aloud. When you listen, does it help you understand, make reading less effortful, or is it simply how you like to learn?', ar: 'كنت تستخدم القراءة الصوتية. عندما تستمع، هل يساعدك ذلك على الفهم، أم يجعل القراءة أقل جهداً، أم هو ببساطة طريقتك المفضلة في التعلّم؟',
      chips: [C('audio_understand', 'Helps me understand', 'يساعدني على الفهم'), C('audio_effort', 'Less effort', 'جهد أقل'), C('audio_preference', 'I just prefer it', 'أفضّله فقط')] },
    env: { en: 'Is anything about your setup making it harder — a small screen, the lighting, or feeling tired?', ar: 'هل هناك شيء في محيطك يجعل الأمر أصعب — شاشة صغيرة، أو الإضاءة، أو الشعور بالتعب؟',
      chips: [C('screen', 'Small screen', 'شاشة صغيرة'), C('lighting', 'Lighting', 'الإضاءة'), C('tired', 'I’m tired', 'أنا متعب'), C('no', 'None of these', 'لا شيء من هذا')] },
    check_helped: { en: 'Did that help?', ar: 'هل ساعد ذلك؟',
      chips: [C('helped', 'Yes, it helped', 'نعم، ساعد'), C('a_bit', 'A bit', 'قليلاً'), C('not_helped', 'Not really', 'ليس فعلاً')] },
    scope: { en: 'Does this happen with other documents too, or mainly with this one?', ar: 'هل يحدث هذا مع مستندات أخرى أيضاً، أم مع هذا المستند غالباً؟',
      chips: [C('this_doc', 'Mainly this one', 'هذا غالباً'), C('other_docs', 'Other documents too', 'مستندات أخرى أيضاً'), C('unsure', 'Not sure', 'لست متأكداً')] },
    lang: { en: 'Does it happen when you read in Arabic, in English, or both?', ar: 'هل يحدث ذلك عندما تقرأ بالعربية، أم بالإنجليزية، أم بكلتيهما؟',
      chips: [C('lang_en', 'English', 'الإنجليزية'), C('lang_ar', 'Arabic', 'العربية'), C('lang_both', 'Both', 'كلتاهما'), C('unsure', 'Not sure', 'لست متأكداً')] },
    crowded_q: { en: 'Does the page ever feel visually crowded, even when you understand the words?', ar: 'هل تبدو الصفحة أحياناً مزدحمة بصرياً، حتى عندما تفهم الكلمات؟',
      chips: [C('yes', 'Yes, often', 'نعم، غالباً'), C('no', 'Not really', 'ليس فعلاً'), C('unsure', 'Not sure', 'لست متأكداً')] },
    outside: { en: 'Have you noticed something similar outside this website — printed books, signs, or other screens?', ar: 'هل لاحظت شيئاً مشابهاً خارج هذا الموقع — في الكتب المطبوعة أو اللافتات أو الشاشات الأخرى؟',
      chips: [C('yes', 'Yes', 'نعم'), C('no', 'No', 'لا'), C('unsure', 'Not sure', 'لست متأكداً')] },
    situational: { en: 'One more, then we’re done: were you tired, distracted, or under time pressure when this happened?', ar: 'سؤال أخير: هل كنت متعباً أو مشتتاً أو تحت ضغط الوقت عندما حدث هذا؟',
      chips: [C('tired', 'Tired', 'متعب'), C('distracted', 'Distracted', 'مشتت'), C('time_pressure', 'Short on time', 'ضيق الوقت'), C('no', 'None of these', 'لا شيء من هذا')] },
    broader: { en: 'You’ve had a few different kinds of friction today. Would you be open to two or three broader questions about reading in other places? It’s fine to say no.', ar: 'واجهت اليوم أنواعاً مختلفة من الاحتكاك. هل تمانع سؤالين أو ثلاثة أوسع عن القراءة في أماكن أخرى؟ لا بأس أن ترفض.',
      chips: [C('yes', 'Okay', 'حسناً'), C('no', 'Not now', 'ليس الآن')] },
    anything_else: { en: 'That makes sense — going back on purpose isn’t friction. Is anything else about this reading bothering you?', ar: 'هذا منطقي — العودة عن قصد ليست احتكاكاً. هل هناك شيء آخر في هذه القراءة يزعجك؟',
      chips: [C('no', 'No, all good', 'لا، كل شيء جيد'), C('yes', 'Actually, yes', 'في الحقيقة، نعم')] },
    tts_helps: { en: 'Is listening helping with this particular passage?', ar: 'هل يساعدك الاستماع في هذا المقطع تحديداً؟',
      chips: [C('helped', 'Yes', 'نعم'), C('a_bit', 'A bit', 'قليلاً'), C('not_helped', 'Not really', 'ليس فعلاً')] }
  };

  /* ---------------- supports (Layer 5 is in support.js; groups here) ---------------- */
  const OFFERS = {
    place: { en: 'Here are a few things that help with keeping your place. Want to try one?', ar: 'إليك بعض ما يساعد على الحفاظ على مكانك. هل تجرّب أحدها؟', tools: ['focus', 'spacing', 'tts'] },
    vocab: { en: 'Technical words slow everyone down. I can show the key words with meanings, or put the paragraph into plain words.', ar: 'المصطلحات التقنية تبطئ الجميع. يمكنني عرض الكلمات المهمة مع معانيها، أو صياغة الفقرة بكلمات بسيطة.', tools: ['terms', 'summary'] },
    understanding: { en: 'Dense paragraphs are hard work. Would a short summary or hearing it read aloud help?', ar: 'الفقرات الكثيفة متعبة. هل يساعدك ملخص قصير أو الاستماع إليها؟', tools: ['summary', 'tts', 'terms'] },
    display_small: { en: 'Let’s make it easier to see. Pick one to try:', ar: 'لنجعل الرؤية أسهل. اختر واحداً لتجربته:', tools: ['bigger', 'zoom', 'tint'] },
    display_crowded: { en: 'More space between lines and letters often makes a page feel calmer. Try one?', ar: 'المسافة الأكبر بين الأسطر والحروف تجعل الصفحة أهدأ غالباً. هل تجرّب أحدها؟', tools: ['spacing', 'narrow', 'font'] },
    display_blurry: { en: 'A larger, softer page can help when text looks fuzzy. Try one?', ar: 'صفحة أكبر وألطف قد تساعد عندما يبدو النص ضبابياً. هل تجرّب أحدها؟', tools: ['bigger', 'tint', 'font'] },
    situational: { en: 'That’s a very normal reason. Would a short break or having it read to you help right now?', ar: 'هذا سبب طبيعي جداً. هل تساعدك استراحة قصيرة أو الاستماع إليها الآن؟', tools: ['break', 'tts'] },
    diagram: { en: 'Diagrams can be busy. I can walk through it step by step, or zoom in for you.', ar: 'الرسوم قد تكون مزدحمة. يمكنني شرحه خطوة بخطوة، أو تكبيره لك.', tools: ['diagram', 'zoom'] }
  };
  const TOOL_LABEL = {
    focus: ['Line focus', 'تركيز السطر'], spacing: ['More spacing', 'تباعد أكبر'], tts: ['Read it to me', 'اقرأها لي'],
    terms: ['Key word meanings', 'معاني الكلمات المهمة'], summary: ['Plain-words summary', 'ملخص بكلمات بسيطة'],
    bigger: ['Bigger text', 'نص أكبر'], zoom: ['Zoom in', 'تكبير'], tint: ['Softer page colour', 'لون صفحة ألطف'],
    narrow: ['Shorter lines', 'أسطر أقصر'], font: ['Reading-friendly font', 'خط مريح للقراءة'],
    break: ['5-minute break', 'استراحة ٥ دقائق'], diagram: ['Walk me through the diagram', 'اشرح لي الرسم']
  };
  const ACK = {
    lost_place: ['That happens a lot with long, dense pages.', 'يحدث هذا كثيراً مع الصفحات الطويلة والكثيفة.'],
    understanding: ['Thanks — dense writing is genuinely hard work.', 'شكراً — الكتابة الكثيفة متعبة فعلاً.'],
    vocab: ['Got it — unfamiliar terms are part of every new subject.', 'فهمت — المصطلحات غير المألوفة جزء من كل مادة جديدة.'],
    too_small: ['Okay — let’s make it easier on your eyes.', 'حسناً — لنجعلها أريح لعينيك.'],
    crowded: ['That’s useful to know.', 'هذا مفيد لي.'],
    blurry: ['Thanks for telling me.', 'شكراً لإخبارك.'],
    tired: ['That’s completely understandable.', 'هذا مفهوم تماماً.'],
    distracted: ['That’s completely understandable.', 'هذا مفهوم تماماً.'],
    time_pressure: ['Deadlines make everything harder to read.', 'المواعيد النهائية تجعل كل شيء أصعب في القراءة.'],
    diagram: ['Diagrams can be a lot to take in.', 'الرسوم قد تحتوي على الكثير.']
  };
  const FRICTION_CAUSES = ['lost_place', 'understanding', 'vocab', 'too_small', 'crowded', 'blurry', 'diagram'];
  const SITUATIONAL = ['tired', 'distracted', 'time_pressure'];
  const AUDIO = ['audio_understand', 'audio_effort', 'audio_preference'];

  /* ---------------- observation text (what ERLY measured, verbatim) ---------------- */
  function observationText(o) {
    if (o.id === 'regression') return [`ERLY noticed you returned to ${o.label || 'one section'} ${o.count} times in the last few minutes.`, `لاحظ إيرلي أنك عدت إلى ${o.labelAr || o.label || 'قسم واحد'} ${o.count} مرات في الدقائق الأخيرة.`];
    if (o.id === 'zoom') return [`ERLY noticed ${o.count} zoom changes in the last few minutes.`, `لاحظ إيرلي ${o.count} تغييرات في التكبير خلال الدقائق الأخيرة.`];
    if (o.id === 'pan') return [`ERLY noticed ${o.count} sideways pans in the last few minutes.`, `لاحظ إيرلي ${o.count} تحريكات جانبية خلال الدقائق الأخيرة.`];
    if (o.id === 'format') return [`ERLY noticed ${o.count} text-setting changes in the last few minutes.`, `لاحظ إيرلي ${o.count} تغييرات في إعدادات النص خلال الدقائق الأخيرة.`];
    if (o.id === 'tts') return [`ERLY noticed you started read-aloud ${o.count} time${o.count === 1 ? '' : 's'} this session.`, `لاحظ إيرلي أنك شغّلت القراءة الصوتية ${o.count} مرات في هذه الجلسة.`];
    return [String(o.text || ''), String(o.textAr || o.text || '')];
  }

  /* ---------------- conversation ---------------- */
  function create(opts) {
    opts = opts || {};
    return {
      trigger: opts.trigger || { type: 'student' },  // { type: 'invite'|'student', signal, section }
      observations: opts.observations || [],
      multiple: !!opts.multiple,
      asked: [], current: null, questionsAsked: 0,
      facts: { causes: [], situational: [], env: [], scope: null, lang: null, outside: null, crowded: null, broader: null, audio: null, ttsHelps: null },
      offered: [], tried: [], pendingTool: null, altOffered: false, unclear: 0,
      entries: [], turns: [], done: false, conclusion: null
    };
  }
  function entry(c, type, en, ar, data) { const e = { type, en, ar, data: data || null }; c.entries.push(e); return e; }
  function ask(c, qid, preface) {
    c.asked.push(qid); c.current = qid; c.questionsAsked++;
    const q = Q[qid];
    const turn = { kind: 'question', qid, en: (preface ? preface[0] + ' ' : '') + q.en, ar: (preface ? preface[1] + ' ' : '') + q.ar, chips: q.chips.slice(), actions: [], done: false };
    c.turns.push(turn); return turn;
  }
  function offer(c, group, preface) {
    c.offered.push(group); c.current = 'offer:' + group;
    const o = OFFERS[group];
    const tools = o.tools.filter(t => !c.tried.some(x => x.tool === t));
    const turn = { kind: 'offer', group, en: (preface ? preface[0] + ' ' : '') + o.en, ar: (preface ? preface[1] + ' ' : '') + o.ar,
      chips: tools.map(t => ({ id: 'tool:' + t, en: TOOL_LABEL[t][0], ar: TOOL_LABEL[t][1] })).concat([{ id: 'decline', en: 'No thanks', ar: 'لا، شكراً' }]), actions: [], done: false };
    c.turns.push(turn); return turn;
  }

  function start(c) {
    c.observations.forEach(o => { const [en, ar] = observationText(o); entry(c, 'observation', en, ar, o); });
    const intro = c.trigger.type === 'invite'
      ? ['Thanks for talking with me. Quick reminder: I’m an AI reading companion, not a doctor — I can’t diagnose anything, and you can skip any question or stop at any time.', 'شكراً للتحدث معي. تذكير سريع: أنا رفيقة قراءة بالذكاء الاصطناعي، ولست طبيبة — لا أستطيع تشخيص أي شيء، ويمكنك تخطي أي سؤال أو التوقف في أي وقت.']
      : ['Hi! I’m an AI reading companion, not a doctor — I can’t diagnose anything. You can skip any question or stop whenever you like.', 'أهلاً! أنا رفيقة قراءة بالذكاء الاصطناعي، ولست طبيبة — لا أستطيع تشخيص أي شيء. يمكنك تخطي أي سؤال أو التوقف متى شئت.'];
    const sig = c.trigger.signal;
    const first = sig === 'regression' ? 'why_return' : (sig === 'zoom' || sig === 'pan' || sig === 'format') ? 'zoom_why' : sig === 'tts' ? 'tts_why' : 'open_general';
    const t = ask(c, first);
    const obs = c.observations[0] ? observationText(c.observations[0]) : null;
    t.en = intro[0] + (obs ? ' ' + obs[0] : '') + ' ' + t.en;
    t.ar = intro[1] + (obs ? ' ' + obs[1] : '') + ' ' + t.ar;
    return t;
  }

  // The main step: take the student's answer (free text or a chip id) and return the next turn.
  function answer(c, input, extraIntents) {
    if (c.done) return null;
    const text = typeof input === 'string' ? input : (input && input.text) || '';
    const chip = input && typeof input === 'object' ? input.chip : null;
    let intents = chip ? [chip] : classify(text);
    if (extraIntents && extraIntents.length) intents = Array.from(new Set(intents.concat(extraIntents)));
    const cur = c.current;
    if (text || chip) entry(c, 'report', text || (input.label || chip), text || (input.labelAr || input.label || chip), { question: cur, intents });

    if (intents.includes('stop')) return wrap(c, 'stopped');

    // a tool was just offered
    if (cur && cur.startsWith('offer:')) {
      const tool = (chip && chip.startsWith('tool:')) ? chip.slice(5) : matchTool(text, OFFERS[cur.slice(6)].tools);
      if (tool) {
        c.pendingTool = tool;
        const turn = { kind: 'action', en: actionLine(tool)[0], ar: actionLine(tool)[1], chips: [], actions: [{ type: 'support', tool }], done: false };
        c.turns.push(turn);
        const q = ask(c, 'check_helped');
        turn.follow = q;
        return turn;
      }
      if (intents.includes('no') || chip === 'decline' || intents.includes('skip')) return next(c, ['No problem.', 'لا مشكلة.']);
      return next(c);
    }
    // checking a tool
    if (cur === 'check_helped' || cur === 'tts_helps') {
      const v = intents.includes('not_helped') || intents.includes('no') ? 0 : intents.includes('a_bit') ? 0.5 : (intents.includes('helped') || intents.includes('yes')) ? 1 : null;
      const tool = cur === 'tts_helps' ? 'tts' : c.pendingTool;
      if (tool) {
        c.tried.push({ tool, helped: v });
        entry(c, 'tried', `Tried: ${TOOL_LABEL[tool][0]} — ${v === 1 ? 'you said it helped' : v === 0.5 ? 'you said it helped a bit' : v === 0 ? 'you said it didn’t help' : 'no answer'}`, `جرّبت: ${TOOL_LABEL[tool][1]} — ${v === 1 ? 'قلت إنه ساعد' : v === 0.5 ? 'قلت إنه ساعد قليلاً' : v === 0 ? 'قلت إنه لم يساعد' : 'لا إجابة'}`, { tool, helped: v });
        if (cur === 'tts_helps') c.facts.ttsHelps = v;
      }
      c.pendingTool = null;
      if (v === 0 && !c.altOffered) {
        const group = c.offered[c.offered.length - 1];
        const left = group && OFFERS[group].tools.filter(t => !c.tried.some(x => x.tool === t));
        if (left && left.length) { c.altOffered = true; return offer(c, group, ['Thanks for telling me — let’s try something different.', 'شكراً لإخبارك — لنجرّب شيئاً مختلفاً.']); }
      }
      return next(c, v === 1 ? ['Great — I’ll remember that.', 'رائع — سأتذكر ذلك.'] : v === 0 ? ['Okay, thanks for telling me.', 'حسناً، شكراً لإخبارك.'] : null);
    }

    // context questions
    const f = c.facts;
    const recordCauses = () => {
      intents.filter(i => FRICTION_CAUSES.concat(['searching', 'intentional', 'preference']).includes(i)).forEach(i => { if (!f.causes.includes(i)) f.causes.push(i); });
      intents.filter(i => SITUATIONAL.includes(i)).forEach(i => { if (!f.situational.includes(i)) f.situational.push(i); });
      intents.filter(i => i === 'screen' || i === 'lighting').forEach(i => { if (!f.env.includes(i)) f.env.push(i); });
      const a = intents.find(i => AUDIO.includes(i)); if (a) f.audio = a;
    };
    if (cur === 'scope') { f.scope = intents.includes('other_docs') || intents.includes('yes') ? 'other_docs' : intents.includes('this_doc') || intents.includes('no') ? 'this_doc' : 'unsure'; recordCauses(); return next(c); }
    if (cur === 'lang') { f.lang = intents.includes('lang_both') ? 'both' : intents.includes('lang_en') ? 'en' : intents.includes('lang_ar') ? 'ar' : 'unsure'; return next(c); }
    if (cur === 'outside') { f.outside = intents.includes('yes') ? 'yes' : intents.includes('no') ? 'no' : 'unsure'; recordCauses(); return next(c); }
    if (cur === 'crowded_q') { f.crowded = intents.includes('yes') || intents.includes('crowded') ? 'yes' : intents.includes('no') ? 'no' : 'unsure'; return next(c); }
    if (cur === 'situational') { recordCauses(); if (!f.situational.length && (intents.includes('no'))) f.situational = []; return next(c, f.situational.length ? ackFor(f.situational[0]) : null); }
    if (cur === 'env') { recordCauses(); return next(c); }
    if (cur === 'broader') { f.broader = intents.includes('yes') ? 'accepted' : 'declined'; if (f.broader === 'declined') return wrap(c, 'declined'); return next(c); }
    if (cur === 'anything_else') {
      if (intents.includes('yes')) { return ask(c, 'open_general', ['Sure.', 'بالتأكيد.']); }
      if (intents.some(i => FRICTION_CAUSES.includes(i) || SITUATIONAL.includes(i))) { recordCauses(); return next(c); }
      return wrap(c, 'intentional');
    }

    // opening / clarifying questions
    recordCauses();
    if (intents.includes('skip') && !f.causes.length && !f.situational.length && !f.audio) {
      if (!c.asked.includes('open_general')) return ask(c, 'open_general', ['That’s fine.', 'لا بأس.']);
      return wrap(c, 'insufficient');
    }
    if (!f.causes.length && !f.situational.length && !f.audio) {
      c.unclear++;
      if (c.unclear >= 2 || c.asked.includes('clarify')) return wrap(c, 'insufficient');
      return ask(c, 'clarify', ['Thanks.', 'شكراً.']);
    }
    return next(c, ackFor(f.causes[f.causes.length - 1] || f.situational[0]));
  }
  function ackFor(i) { return ACK[i] || null; }
  function matchTool(text, tools) {
    const t = String(text || '').toLowerCase();
    const map = { focus: /focus|ruler|line|سطر/, spacing: /spac|تباعد|مسافة/, tts: /read|listen|aloud|اقرأ|استمع/, terms: /word|meaning|term|كلم|معنى/, summary: /summar|plain|simple|ملخص|بسيط/, bigger: /bigger|larger|size|أكبر/, zoom: /zoom|تكبير/, tint: /colou?r|tint|لون/, narrow: /short|narrow|أقصر/, font: /font|خط/, break: /break|rest|استراحة/, diagram: /diagram|figure|رسم/ };
    return tools.find(k => map[k] && map[k].test(t)) || null;
  }
  function actionLine(tool) {
    const m = {
      focus: ['Line focus is on — move with your mouse or the ↓ key.', 'تركيز السطر مفعّل — تحرّك بالفأرة أو بمفتاح ↓.'],
      spacing: ['I’ve added more space between lines and letters.', 'أضفت مسافة أكبر بين الأسطر والحروف.'],
      tts: ['Reading it to you now — follow the highlighted words.', 'أقرؤها لك الآن — تابع الكلمات المميزة.'],
      terms: ['Here are the key words with their meanings.', 'إليك الكلمات المهمة ومعانيها.'],
      summary: ['Here it is in plain words.', 'إليك الفكرة بكلمات بسيطة.'],
      bigger: ['I’ve made the text bigger.', 'كبّرت النص.'],
      zoom: ['Zoomed in.', 'تم التكبير.'],
      tint: ['Switched to a softer page colour.', 'غيّرت لون الصفحة إلى لون ألطف.'],
      narrow: ['Lines are shorter now.', 'الأسطر أقصر الآن.'],
      font: ['Switched to a reading-friendly font.', 'غيّرت الخط إلى خط مريح للقراءة.'],
      break: ['Take five — the timer is running. Your place is saved.', 'خذ خمس دقائق — المؤقت يعمل. مكانك محفوظ.'],
      diagram: ['Let’s go through the diagram step by step.', 'لنمرّ على الرسم خطوة بخطوة.']
    };
    return m[tool] || ['Done.', 'تم.'];
  }

  // Decide what to do after the latest answer. Ordered, transparent rules.
  function next(c, preface) {
    const f = c.facts;
    if (c.questionsAsked >= MAX_QUESTIONS) return wrap(c, 'complete');
    const cause = f.causes[0];

    // 1. intentional navigation / searching is not friction
    if (f.causes.length && f.causes.every(x => x === 'intentional' || x === 'searching') && !f.situational.length) {
      entry(c, 'interpretation', 'This looks like intentional navigation or looking something up — not reading friction.', 'يبدو هذا تنقلاً مقصوداً أو بحثاً عن شيء — وليس احتكاكاً في القراءة.');
      if (!c.asked.includes('anything_else')) return ask(c, 'anything_else', preface);
      return wrap(c, 'intentional');
    }
    // 2. audio preference — never interpreted as a sign of anything
    if (f.audio && !c.asked.includes('tts_helps') && !f.causes.some(x => FRICTION_CAUSES.includes(x))) {
      entry(c, 'interpretation', 'Choosing to listen is a learning preference — it isn’t a sign of any difficulty.', 'اختيار الاستماع تفضيل في التعلّم — وليس علامة على أي صعوبة.');
      return ask(c, 'tts_helps', preface || ['Thanks — that’s good to know.', 'شكراً — هذا مفيد.']);
    }
    if (cause === 'preference' && f.causes.length === 1) {
      entry(c, 'interpretation', 'These look like comfort preferences rather than friction.', 'تبدو هذه تفضيلات راحة لا احتكاكاً.');
      return wrap(c, 'preference');
    }
    // 3. offer the matching support once
    const group = cause === 'lost_place' ? 'place' : cause === 'vocab' ? 'vocab' : cause === 'understanding' ? 'understanding' : cause === 'diagram' ? 'diagram'
      : cause === 'too_small' ? 'display_small' : cause === 'crowded' ? 'display_crowded' : cause === 'blurry' ? 'display_blurry'
        : (!cause && f.situational.length) ? 'situational' : null;
    if ((cause === 'too_small' || cause === 'blurry') && !c.asked.includes('env')) return ask(c, 'env', preface);
    if (group && !c.offered.includes(group)) {
      if (cause === 'vocab') entry(c, 'interpretation', 'Unfamiliar vocabulary is common with technical readings; on its own it doesn’t suggest a reading difficulty.', 'المفردات غير المألوفة شائعة في القراءات التقنية؛ وحدها لا تشير إلى صعوبة في القراءة.');
      return offer(c, group, preface);
    }
    // 4. broader conversation only with permission, when several signals persist
    const frictionReported = f.causes.some(x => ['lost_place', 'understanding', 'crowded', 'too_small', 'blurry'].includes(x)) || (cause === 'vocab' && c.tried.some(t => t.helped === 0));
    if (c.multiple && frictionReported && !c.asked.includes('broader')) return ask(c, 'broader', preface);
    if (f.broader === 'declined') return wrap(c, 'declined');
    // 5. context: other documents, languages, outside the website, situation
    if (frictionReported && !c.asked.includes('scope')) return ask(c, 'scope', preface);
    if (f.scope === 'other_docs' && !c.asked.includes('lang')) return ask(c, 'lang', preface);
    if (f.scope === 'other_docs' && cause === 'lost_place' && !c.asked.includes('crowded_q')) return ask(c, 'crowded_q', preface);
    if (f.scope === 'other_docs' && !c.asked.includes('outside')) return ask(c, 'outside', preface);
    if (frictionReported && !f.situational.length && !c.asked.includes('situational') && !c.asked.includes('env')) return ask(c, 'situational', preface);
    return wrap(c, 'complete', preface);
  }

  // Close the conversation: uncertain interpretations, practical recommendations, optional referral.
  function wrap(c, reason, preface) {
    const f = c.facts;
    c.done = true; c.current = null; c.conclusion = reason;
    const helped = c.tried.filter(t => t.helped >= 0.5).map(t => t.tool);
    const reading = f.causes.some(x => ['lost_place', 'understanding', 'crowded'].includes(x)) || f.crowded === 'yes';
    const acrossContexts = f.scope === 'other_docs' && (f.outside === 'yes' || f.lang === 'both' || f.lang === 'ar');
    if (reason === 'insufficient') entry(c, 'interpretation', 'There isn’t enough information to say anything more — and that’s completely fine.', 'لا توجد معلومات كافية لقول المزيد — ولا بأس في ذلك إطلاقاً.');
    if (reason === 'stopped') entry(c, 'interpretation', 'You ended the conversation early, so there isn’t enough information to draw anything from it.', 'أنهيت المحادثة مبكراً، لذا لا توجد معلومات كافية لاستنتاج شيء منها.');
    if (f.situational.length && !acrossContexts) entry(c, 'interpretation', `Today’s pattern may be situational (${f.situational.map(s => ({ tired: 'tiredness', distracted: 'distraction', time_pressure: 'time pressure' })[s]).join(', ')}).`, `قد يكون نمط اليوم مرتبطاً بالظروف (${f.situational.map(s => ({ tired: 'التعب', distracted: 'التشتت', time_pressure: 'ضيق الوقت' })[s]).join('، ')}).`);
    if (f.scope === 'other_docs' && f.lang === 'en' && f.outside !== 'yes') entry(c, 'interpretation', 'Friction that appears mainly in English may be about second-language load — English reading support could help.', 'الاحتكاك الذي يظهر غالباً بالإنجليزية قد يتعلق بعبء اللغة الثانية — وقد يفيد دعم القراءة بالإنجليزية.');
    if (reading && acrossContexts) {
      entry(c, 'interpretation', 'We noticed a recurring reading pattern that may be worth exploring — you’ve seen it across documents' + (f.outside === 'yes' ? ' and outside this website' : '') + (f.lang === 'both' ? ', in both Arabic and English' : '') + '.', 'لاحظنا نمط قراءة متكرراً قد يستحق الاستكشاف — فقد لاحظته عبر مستندات مختلفة' + (f.outside === 'yes' ? ' وخارج هذا الموقع' : '') + (f.lang === 'both' ? '، بالعربية والإنجليزية' : '') + '.');
      entry(c, 'referral', 'If you’d like, Student Accessibility Services can look at this with you properly. It’s your choice — nothing is shared unless you share it.', 'إن رغبت، يمكن لخدمات الطلبة أن تنظر في هذا معك بشكل صحيح. القرار لك — لا يُشارك شيء إلا إذا شاركته أنت.');
    }
    if (f.causes.includes('blurry') && (f.scope === 'other_docs' || f.outside === 'yes')) entry(c, 'referral', 'Because text looks blurry in other places too, an optometrist or eye-care professional could check your vision. ERLY can’t assess eyesight.', 'لأن النص يبدو ضبابياً في أماكن أخرى أيضاً، يمكن لأخصائي البصريات فحص نظرك. لا يستطيع إيرلي تقييم النظر.');
    helped.forEach(t => entry(c, 'recommendation', `Keep using: ${TOOL_LABEL[t][0]} — you said it helped.`, `استمر في استخدام: ${TOOL_LABEL[t][1]} — قلت إنه ساعد.`, { tool: t }));
    if (!helped.length && c.tried.length) entry(c, 'recommendation', 'Nothing we tried helped much today. The Reading Lab can help you compare other settings.', 'لم يساعد ما جرّبناه كثيراً اليوم. يمكن لمختبر القراءة مساعدتك على مقارنة إعدادات أخرى.');
    const close = reason === 'stopped' ? ['Of course — we can stop here. Your summary is in the “My summary” tab; you can edit or delete it.', 'بالتأكيد — يمكننا التوقف هنا. ملخصك في تبويب «ملخصي»؛ يمكنك تعديله أو حذفه.']
      : reason === 'declined' ? ['No problem at all. I’ve put what we talked about in your summary — you can edit or delete it.', 'لا مشكلة إطلاقاً. وضعت ما تحدثنا عنه في ملخصك — يمكنك تعديله أو حذفه.']
        : reason === 'insufficient' ? ['Thanks for chatting. There isn’t enough to say more, and that’s okay. Your tools are always here.', 'شكراً للحديث. لا يوجد ما يكفي لقول المزيد، ولا بأس. أدواتك هنا دائماً.']
          : ['Thanks for talking this through with me. I’ve written a short summary you can review, edit or delete in “My summary”. Nothing is shared unless you choose to.', 'شكراً لأنك تحدثت معي. كتبت ملخصاً قصيراً يمكنك مراجعته أو تعديله أو حذفه في «ملخصي». لا يُشارك شيء إلا إذا اخترت ذلك.'];
    const turn = { kind: 'wrap', en: (preface ? preface[0] + ' ' : '') + close[0], ar: (preface ? preface[1] + ' ' : '') + close[1], chips: [], actions: [], done: true, reason };
    c.turns.push(turn); return turn;
  }

  function allowedIntents(c) {
    const q = Q[c.current];
    const base = ['stop', 'skip', 'unsure', 'yes', 'no'];
    return Array.from(new Set(base.concat(q ? q.chips.map(x => x.id) : []).concat(FRICTION_CAUSES, SITUATIONAL, AUDIO)));
  }
  // the companion's own disclaimers ("I can’t diagnose anything") are allowed
  const DISCLAIMER = /(can[’']t|cannot|never|not a) diagnos\w*( anything)?|لا أستطيع تشخيص أي شيء|لا أشخّص أي شيء/gi;
  const isSafe = s => !BANNED.test(String(s || '').replace(DISCLAIMER, ''));

  return { create, start, answer, classify, allowedIntents, isSafe, BANNED, Q, OFFERS, TOOL_LABEL, MAX_QUESTIONS, observationText };
});
