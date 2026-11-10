/* ERLY — Learning Games content. Plain data, reviewed for accuracy:
   word parts follow standard English morphology (Latin/Greek roots),
   paragraphs are short, self-contained academic texts. */
(function () {
  'use strict';
  window.ERLY_GAMES_DATA = {
    // [definition, parts in order, distractor parts, level 1-3]
    words: [
      ['Not able to be seen', ['in', 'vis', 'ible'], ['re', 'ion', 'port'], 1],
      ['To carry across or between places', ['trans', 'port'], ['vis', 'able', 'pre'], 1],
      ['Study of life', ['bio', 'logy'], ['geo', 'graph', 'tele'], 1],
      ['To say beforehand', ['pre', 'dict'], ['re', 'tract', 'ion'], 1],
      ['Writing about one’s own life', ['auto', 'bio', 'graphy'], ['tele', 'logy', 'micro'], 2],
      ['Able to be carried', ['port', 'able'], ['dict', 'ion', 'trans'], 1],
      ['The act of taking something away', ['sub', 'tract', 'ion'], ['pre', 'able', 'vis'], 2],
      ['An instrument for seeing small things', ['micro', 'scope'], ['tele', 'phone', 'graph'], 1],
      ['Not able to be read clearly', ['il', 'leg', 'ible'], ['in', 'dict', 'ment'], 2],
      ['Sound carried over a distance', ['tele', 'phone'], ['micro', 'scope', 'logy'], 1],
      ['The state of being independent', ['in', 'depend', 'ence'], ['un', 'able', 'tion'], 2],
      ['To build again', ['re', 'construct'], ['de', 'tion', 'pre'], 1],
      ['Something said against (a contradiction)', ['contra', 'dict', 'ion'], ['inter', 'tract', 'able'], 3],
      ['Between nations', ['inter', 'nation', 'al'], ['trans', 'ism', 'pre'], 2],
      ['The process of breaking a substance down by water', ['hydro', 'lysis'], ['photo', 'synth', 'thermo'], 3],
      ['Making something with the help of light', ['photo', 'synth', 'esis'], ['hydro', 'lysis', 'chrom'], 3],
      ['Without symmetry', ['a', 'symmetr', 'ical'], ['dis', 'ism', 'ology'], 3],
      ['Not reversible; cannot be turned back', ['ir', 'revers', 'ible'], ['un', 'tion', 'pre'], 3]
    ],
    // sentences in the correct order; the first word cues are the strategy
    paragraphs: [
      ['Enzymes are proteins that speed up chemical reactions.', 'Each enzyme has an active site with a specific shape.', 'Only a substrate with a matching shape can bind to it.', 'As a result, each enzyme catalyses only one kind of reaction.'],
      ['Supply and demand determine market prices.', 'When demand rises and supply stays the same, buyers compete for the goods.', 'This competition pushes the price up.', 'Eventually, higher prices encourage producers to supply more.'],
      ['First, write down the question you want to answer.', 'Next, search the library database using key terms.', 'Then, skim abstracts to decide which papers are relevant.', 'Finally, read the chosen papers closely and take notes.'],
      ['Plants need light to make glucose.', 'However, too much light can damage the leaf.', 'Therefore, many plants have pigments that protect them from excess light.'],
      ['A hypothesis is a testable prediction.', 'Researchers design an experiment to test it.', 'If the results contradict the hypothesis, it is rejected or revised.', 'If they support it, the hypothesis gains credibility, but it is never proven absolutely.'],
      ['Sleep plays a key role in memory.', 'During deep sleep, the brain replays what was learned during the day.', 'This strengthens the connections that store new information.', 'Consequently, students who sleep well before an exam often recall more.'],
      ['Water expands when it freezes.', 'Because of this, ice is less dense than liquid water.', 'Ice therefore floats on lakes in winter.', 'The layer of ice insulates the water below, allowing fish to survive.'],
      ['To solve a quadratic equation, first write it in the form ax² + bx + c = 0.', 'Then calculate the discriminant, b² − 4ac.', 'If it is positive, there are two real roots.', 'Finally, substitute into the quadratic formula to find them.']
    ],
    // planning: tasks [id, label, minutes, after (dependency ids)] and a deadline note
    plans: [
      { title: 'Lab report due Thursday', tasks: [['read', 'Re-read the lab handout', 15, []], ['data', 'Tidy the results table', 25, ['read']], ['graph', 'Plot the graph', 20, ['data']], ['disc', 'Write the discussion', 40, ['graph']], ['check', 'Proof-read and submit', 15, ['disc']]] },
      { title: 'Group presentation on Monday', tasks: [['split', 'Agree who presents which part', 10, []], ['research', 'Research your section', 45, ['split']], ['slides', 'Make your slides', 30, ['research']], ['merge', 'Merge everyone’s slides', 15, ['slides']], ['rehearse', 'Rehearse together', 30, ['merge']]] },
      { title: 'Essay due in a week', tasks: [['q', 'Unpack the essay question', 10, []], ['src', 'Find 4–5 good sources', 60, ['q']], ['plan', 'Write a paragraph plan', 20, ['q']], ['draft', 'Write the first draft', 90, ['src', 'plan']], ['ref', 'Format the references', 20, ['draft']], ['edit', 'Edit and submit', 30, ['draft']]] },
      { title: 'Revision for a maths exam', tasks: [['list', 'List the topics on the syllabus', 10, []], ['rate', 'Rate each topic: confident / unsure', 10, ['list']], ['weak', 'Practise the unsure topics first', 60, ['rate']], ['past', 'Do a timed past paper', 90, ['weak']], ['mark', 'Mark it and note mistakes', 20, ['past']]] }
    ],
    // reading comprehension: a short passage, then questions [question, options, correct index, why, level]
    passages: [
      { title: 'Why leaves change colour', text: 'Leaves are green because they contain chlorophyll, the pigment that captures light for photosynthesis. Leaves also contain yellow and orange pigments called carotenoids, but in summer the large amount of chlorophyll hides them. In autumn, as days shorten, many trees stop making chlorophyll and break down what is left. The green fades, and the yellow and orange carotenoids that were there all along become visible.',
        qs: [['Why are the yellow pigments hard to see in summer?', ['They are made only in autumn', 'Chlorophyll hides them', 'Sunlight destroys them', 'They are inside the roots'], 1, 'The passage says the large amount of chlorophyll hides them in summer.', 1],
             ['What does “all along” suggest about the carotenoids?', ['They are new in autumn', 'They were present the whole time', 'They move along the stem', 'They replace the roots'], 1, '“All along” means they were already there; they only become visible when chlorophyll breaks down.', 2],
             ['What is the main idea of the passage?', ['Trees die every autumn', 'Autumn colours appear when chlorophyll breaks down', 'Carotenoids capture all the light', 'Days get longer in autumn'], 1, 'Each sentence builds towards explaining why the green fades and other colours show.', 2]] },
      { title: 'The placebo effect', text: 'In medical trials, some patients receive a placebo: a treatment with no active ingredient, such as a sugar pill. Surprisingly, some of these patients report feeling better. This is called the placebo effect. Because of it, new medicines are compared with a placebo rather than with no treatment at all. A medicine is only considered effective if it helps patients more than the placebo does.',
        qs: [['What is a placebo?', ['A very strong medicine', 'A treatment with no active ingredient', 'A type of surgery', 'A side effect'], 1, 'The passage defines it as “a treatment with no active ingredient, such as a sugar pill”.', 1],
             ['Why are new medicines compared with a placebo?', ['Placebos are cheaper', 'To separate the medicine’s real effect from the placebo effect', 'Because patients prefer sugar pills', 'Placebos have no side effects'], 1, 'Some people improve with a placebo alone, so a medicine must do better than that to count as effective.', 2],
             ['Which result would show a new medicine is effective?', ['Patients on it feel better', 'Patients on it improve more than those on placebo', 'Patients on placebo improve', 'Nobody improves'], 1, 'The last sentence gives the test: it must help more than the placebo does.', 3]] },
      { title: 'Opportunity cost', text: 'Economists use the term opportunity cost for the value of the best alternative you give up when you make a choice. If you spend an evening working a paid shift instead of studying, the opportunity cost of the shift is the study time you lost — and if you study instead, the opportunity cost is the wages you did not earn. Every choice has an opportunity cost, even when no money changes hands.',
        qs: [['What is opportunity cost?', ['The price written on a product', 'The value of the best alternative given up', 'Money paid in tax', 'The cost of a mistake'], 1, 'It is defined in the first sentence.', 1],
             ['A student spends Saturday at a concert instead of revising. What is the opportunity cost?', ['The concert ticket only', 'The revision time given up', 'Nothing, because it was fun', 'The bus fare'], 1, 'The best alternative given up is the revision time (plus anything else that time could have been).', 2],
             ['According to the passage, which statement is true?', ['Only choices involving money have an opportunity cost', 'Every choice has an opportunity cost', 'Opportunity cost is always money', 'Working always costs more than studying'], 1, 'The last sentence says every choice has one, even without money.', 2]] },
      { title: 'How vaccines train immunity', text: 'A vaccine contains a harmless version or part of a germ, or instructions for making one of its proteins. The immune system reacts to it as if it were a real infection and produces antibodies and memory cells. If the person later meets the real germ, the memory cells recognise it quickly, so the body can respond faster and more strongly than the first time.',
        qs: [['What does the immune system produce after a vaccine?', ['Germs', 'Antibodies and memory cells', 'Red blood cells only', 'Vitamins'], 1, 'Stated in the second sentence.', 1],
             ['Why is the response faster when the real germ arrives?', ['The germ is weaker', 'Memory cells recognise it', 'The vaccine is still active', 'Antibodies multiply the germ'], 1, 'Memory cells “recognise it quickly”.', 2],
             ['Which word best describes the vaccine’s role?', ['Rehearsal', 'Punishment', 'Replacement', 'Accident'], 0, 'The vaccine lets the immune system practise on a harmless version — like a rehearsal.', 3]] },
      { title: 'Primary and secondary sources', text: 'Historians distinguish between primary and secondary sources. A primary source was created at the time being studied, such as a diary, a photograph or an official letter. A secondary source interprets events afterwards, such as a textbook or a documentary. Both are useful, but a careful researcher checks who made a source, when, and why, because every source has a point of view.',
        qs: [['Which is a primary source about a 1920s election?', ['A 2015 textbook chapter', 'A newspaper printed on election day in 1920', 'A modern documentary', 'A website summary'], 1, 'It was created at the time being studied.', 1],
             ['Why should a researcher ask “why was this made”?', ['To find its price', 'Because every source has a point of view', 'To decide its colour', 'Secondary sources are always wrong'], 1, 'The final sentence gives the reason.', 2],
             ['What does the passage suggest about secondary sources?', ['They are useless', 'They are useful but interpret events afterwards', 'They are more reliable than all primary sources', 'They are always diaries'], 1, '“Both are useful”; secondary sources interpret events later.', 2]] }
    ],
    // writing: picture prompts and spark words
    stories: [
      ['🏛️', 'An old library where one book is always warm to the touch', 'المكتبة القديمة التي فيها كتاب دافئ دائماً', ['whisper', 'map', 'midnight']],
      ['🚀', 'A student wakes up on the first research station on Mars', 'طالب يستيقظ في أول محطة أبحاث على المريخ', ['signal', 'dust', 'promise']],
      ['🌊', 'A message in a bottle washes up — addressed to you', 'رسالة في زجاجة تصل إلى الشاطئ — موجّهة إليك', ['tide', 'secret', 'compass']],
      ['🧪', 'An experiment in the lab goes surprisingly right', 'تجربة في المختبر تنجح بشكل مفاجئ', ['spark', 'notebook', 'glow']],
      ['🌆', 'The whole city goes silent for exactly one minute', 'المدينة كلها تصمت لدقيقة واحدة بالضبط', ['clock', 'bridge', 'stranger']],
      ['🐫', 'A desert journey with a guide who knows the stars', 'رحلة في الصحراء مع دليل يعرف النجوم', ['oasis', 'lantern', 'riddle']]
    ],
    // listening: colours and shapes on a grid
    colours: [['blue', '#3b82f6', 'الأزرق'], ['orange', '#f97316', 'البرتقالي'], ['green', '#22c55e', 'الأخضر'], ['purple', '#a855f7', 'البنفسجي']],
    shapes: [['circle', 'الدائرة'], ['square', 'المربع'], ['triangle', 'المثلث'], ['star', 'النجمة']]
  };
})();
