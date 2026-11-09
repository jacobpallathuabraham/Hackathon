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
    // listening: colours and shapes on a grid
    colours: [['blue', '#3b82f6', 'الأزرق'], ['orange', '#f97316', 'البرتقالي'], ['green', '#22c55e', 'الأخضر'], ['purple', '#a855f7', 'البنفسجي']],
    shapes: [['circle', 'الدائرة'], ['square', 'المربع'], ['triangle', 'المثلث'], ['star', 'النجمة']]
  };
})();
