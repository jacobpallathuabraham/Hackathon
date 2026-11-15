/* Narration scripts for the ERLY-made Learning Studio videos.
   Each line is spoken by the Kokoro voice model, captioned with exactly the same words, and drives the animation
   cue named in `cue`. Chapters start at their first line. Questions open in the Video Studio once the student
   has watched past the end of their chapter. Content is ERLY demonstration content (see the lesson sources). */
module.exports = {
  'erly-heart': {
    voice: 'af_heart', speed: 0.97,
    chapters: [
      { title: 'Four chambers', lines: [
        ['Your heart is two pumps, working side by side.', 'intro'],
        ['Each side has an upper chamber, the atrium, which receives blood.', 'atria'],
        ['And a lower chamber, the ventricle, which pumps blood out.', 'ventricles'],
        ['In diagrams, the heart’s right side is drawn on the left — as if you were facing the person.', 'sides']] },
      { title: 'The right side: to the lungs', lines: [
        ['Blood that is low in oxygen comes back from the body through the venae cavae, into the right atrium.', 'deo1'],
        ['It passes the tricuspid valve into the right ventricle.', 'deo2'],
        ['The right ventricle pumps it up the pulmonary artery, to the lungs.', 'deo3'],
        ['In the lungs it picks up oxygen and gets rid of carbon dioxide.', 'lungs']] },
      { title: 'The left side: to the body', lines: [
        ['Oxygen-rich blood returns through the pulmonary veins into the left atrium.', 'oxy1'],
        ['It passes the mitral valve into the left ventricle.', 'oxy2'],
        ['The left ventricle has the thickest wall, because it must push blood through the aorta to the whole body.', 'oxy3']] },
      { title: 'Two loops, one heartbeat', lines: [
        ['So blood passes through the heart twice on every trip around the body: once to the lungs, and once to the body.', 'loops'],
        ['Both sides contract together, and the valves keep blood moving in one direction.', 'loops2'],
        ['Remember: arteries carry blood away from the heart, and veins carry it back.', 'recap']] }
    ],
    questions: [
      { chapter: 1, q: { id: 'v-h1', type: 'mcq', difficulty: 1, prompt: 'Where does the right ventricle pump blood?', options: ['To the lungs, through the pulmonary artery', 'To the body, through the aorta', 'Into the left atrium', 'Into the vena cava'], answer: 0, explain: 'The right side of the heart pumps oxygen-poor blood to the lungs.' } },
      { chapter: 2, q: { id: 'v-h2', type: 'tf', difficulty: 1, prompt: '“The wall of the left ventricle is thicker than the wall of the right ventricle.”', answer: true, explain: 'It pumps blood all round the body, which needs a higher pressure.' } },
      { chapter: 3, q: { id: 'v-h3', type: 'mcq', difficulty: 2, prompt: 'Which vessel carries oxygen-poor blood AWAY from the heart?', options: ['Pulmonary artery', 'Aorta', 'Pulmonary vein', 'Vena cava'], answer: 0, explain: 'It is an artery (away from the heart) but carries oxygen-poor blood to the lungs.' } }
    ],
    cards: [{ front: 'Path of oxygen-poor blood through the heart', back: 'Vena cava → right atrium → tricuspid valve → right ventricle → pulmonary artery → lungs', kind: 'qa' }, { front: 'Why is the left ventricle wall thickest?', back: 'It pumps blood through the aorta to the whole body, which needs the highest pressure.', kind: 'qa' }]
  },
  'erly-quad': {
    voice: 'am_michael', speed: 1.0,
    chapters: [
      { title: 'The parabola', lines: [
        ['This is the simplest quadratic: y equals x squared.', 'base'],
        ['Its graph is a parabola: a symmetric curve with one turning point, called the vertex.', 'vertex']] },
      { title: 'a: stretch and flip', lines: [
        ['The number in front of x squared is a.', 'a0'],
        ['Make a bigger, and the parabola gets narrower.', 'a1'],
        ['Make a smaller, and it opens out wider.', 'a2'],
        ['And if a is negative, the parabola flips upside down: it now has a maximum instead of a minimum.', 'a3']] },
      { title: 'c: up and down', lines: [
        ['The constant term, c, slides the whole curve up and down.', 'c1'],
        ['It is also where the graph crosses the y-axis.', 'c2']] },
      { title: 'Roots and the discriminant', lines: [
        ['The roots are where the curve meets the x-axis. For x squared minus two x minus three, they are minus one and three.', 'roots'],
        ['The discriminant, b squared minus four a c, tells you how many roots there are before you draw anything.', 'disc'],
        ['Positive: two roots. Zero: the curve just touches the axis. Negative: it misses the axis completely.', 'disc2']] }
    ],
    questions: [
      { chapter: 1, q: { id: 'v-q1', type: 'mcq', difficulty: 1, prompt: 'If a is negative, the parabola…', options: ['opens downwards', 'opens upwards', 'becomes a straight line', 'moves to the right'], answer: 0, explain: 'A negative a flips the parabola, giving a maximum point.' } },
      { chapter: 2, q: { id: 'v-q2', type: 'numeric', difficulty: 1, prompt: 'Where does y = x² + 2x + 5 cross the y-axis? (Give the y-value.)', answer: 5, tol: 0, explain: 'At x = 0, y = c = 5.' } },
      { chapter: 3, q: { id: 'v-q3', type: 'mcq', difficulty: 2, prompt: 'A quadratic has a negative discriminant. Its graph…', options: ['does not meet the x-axis', 'touches the x-axis once', 'crosses the x-axis twice', 'crosses the y-axis twice'], answer: 0, explain: 'Δ < 0 means no real roots.' } }
    ],
    cards: [{ front: 'Effect of a in y = ax² + bx + c', back: 'Larger |a| → narrower; a < 0 → opens downwards.', kind: 'qa' }, { front: 'What does c tell you?', back: 'The y-intercept; changing c moves the curve up or down.', kind: 'qa' }]
  },
  'erly-newton': {
    voice: 'bm_george', speed: 1.0,
    chapters: [
      { title: 'Balanced forces', lines: [
        ['Here is a box sliding at a steady speed. The push forward exactly balances friction backward.', 'bal'],
        ['The resultant force is zero, so the velocity does not change. Motion does not need a force; changing motion does.', 'bal2']] },
      { title: 'An unbalanced force', lines: [
        ['Now push harder. Forty newtons forward against twenty newtons of friction leaves a resultant of twenty newtons.', 'push'],
        ['The box accelerates: its velocity rises steadily, as the graph shows.', 'acc']] },
      { title: 'Mass matters', lines: [
        ['Double the mass, with the same resultant force, and the acceleration halves.', 'mass'],
        ['A heavier object is harder to speed up.', 'mass2']] },
      { title: 'F equals m a', lines: [
        ['Newton’s second law puts it together: resultant force equals mass times acceleration.', 'law'],
        ['A resultant force of thirty newtons on a six kilogram trolley gives an acceleration of five metres per second squared.', 'example']] }
    ],
    questions: [
      { chapter: 0, q: { id: 'v-n1', type: 'tf', difficulty: 1, prompt: '“An object moving at constant velocity has zero resultant force on it.”', answer: true, explain: 'No acceleration means no resultant force.' } },
      { chapter: 2, q: { id: 'v-n2', type: 'mcq', difficulty: 2, prompt: 'The same resultant force acts on a box, then on a box with twice the mass. The second acceleration is…', options: ['half as large', 'twice as large', 'the same', 'four times as large'], answer: 0, explain: 'a = F/m: doubling m halves a.' } },
      { chapter: 3, q: { id: 'v-n3', type: 'numeric', difficulty: 1, prompt: 'A 12 N resultant force acts on a 3 kg mass. Acceleration in m/s²?', answer: 4, tol: 0.01, explain: 'a = 12 / 3 = 4 m/s².' } }
    ],
    cards: [{ front: 'Resultant force zero means…', back: 'No acceleration: at rest or constant velocity.', kind: 'qa' }, { front: 'Effect of doubling mass (same force)', back: 'The acceleration halves (a = F/m).', kind: 'qa' }]
  }
};
