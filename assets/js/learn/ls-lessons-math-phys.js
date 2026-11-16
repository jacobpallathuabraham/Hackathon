/* ERLY Learning Studio — lessons: mathematics and physics.
   Written for ERLY (provenance.kind 'erly'). Not official exam material and not endorsed by any exam board. */
(function () {
  'use strict';
  const LS = window.LS, F = LS.fig;
  const P = { kind: 'erly', author: 'ERLY content team (demonstration)', reviewed: '2026-11-15', licence: 'ERLY demonstration content — free to use within ERLY', sources: [] };

  /* ================= 5 · Quadratic functions ================= */
  LS.addLesson({
    id: 'math-quad', v: '1.0', why: 'Parabolas describe projectiles, profits and optimisation; quadratics are the gateway to calculus.', title: 'Quadratic functions and their graphs', subject: 'Mathematics', level: 'Secondary / JEE foundation', course: 'Algebra', chapter: 'Quadratics', topic: 'Quadratic functions',
    mins: 25, tags: ['quadratic', 'parabola', 'roots', 'discriminant', 'vertex'],
    objectives: ['Recognise a quadratic function and the shape of its graph.', 'Find roots by factorising and read them from a graph.', 'Use the discriminant to count real roots.', 'Find the vertex from the completed-square form.'],
    prereq: [{ text: 'Expanding brackets and solving linear equations.' }],
    provenance: Object.assign({}, P, { sources: [{ title: 'OpenStax College Algebra 2e, §5.1 “Quadratic Functions”', publisher: 'OpenStax (CC BY 4.0)', url: 'https://openstax.org/books/college-algebra-2e/pages/5-1-quadratic-functions' }] }),
    formats: ['text', 'visual', 'video', 'practice'],
    sections: [
      { id: 'shape', title: 'The parabola', blocks: [
        { k: 'text', md: 'A **quadratic function** has the form y = ax² + bx + c, with a ≠ 0. Its graph is a **parabola**, symmetric about a vertical line through its turning point, the **vertex**.\n\n- If a > 0 the parabola opens **upwards** (a minimum).\n- If a < 0 it opens **downwards** (a maximum).\n- c is the **y-intercept**: where the graph crosses the y-axis.' },
        { k: 'lab', engine: 'quadratic', objective: 'Change a, b and c and watch the vertex, roots and discriminant respond.', try: ['Make a negative: what happens?', 'Find values where the graph just touches the x-axis.'], assume: 'Real coefficients; complex roots are shown when there are no real ones.' },
        { k: 'activity', q: { id: 'q-a', type: 'mcq', difficulty: 1, prompt: 'The graph of y = −2x² + 3x + 1 …', options: ['opens downwards and crosses the y-axis at 1', 'opens upwards and crosses the y-axis at 1', 'opens downwards and crosses the y-axis at −2', 'opens upwards and crosses the y-axis at 3'], answer: 0, why: { 1: 'The coefficient of x² is −2, which is negative, so the parabola opens downwards.', 2: 'The y-intercept is the constant term c = 1, not the coefficient of x².', 3: 'Neither the direction nor the intercept matches: a = −2 < 0, c = 1.' }, tags: { 1: 'sign of a', 2: 'mixing up coefficients' }, explain: 'a = −2 < 0 → opens downwards; c = 1 → y-intercept 1.' } }
      ] },
      { id: 'roots', title: 'Roots', blocks: [
        { k: 'text', md: 'The **roots** (zeros) are the x-values where y = 0 — where the graph meets the x-axis. If the quadratic factorises, set each factor to zero.' },
        { k: 'example', title: 'Worked example', problem: 'Solve x² − 2x − 3 = 0.', steps: ['Find two numbers that multiply to −3 and add to −2: −3 and +1.', 'Factorise: (x − 3)(x + 1) = 0.', 'So x − 3 = 0 or x + 1 = 0.'], answer: 'x = 3 or x = −1' },
        { k: 'activity', q: { id: 'q-expr', type: 'expr', difficulty: 2, prompt: 'Expand (x + 4)(x − 2).', lhs: '(x + 4)(x − 2)', answer: 'x^2+2x-8', vars: ['x'], hints: ['Multiply each term in the first bracket by each in the second.', 'x·x + x·(−2) + 4·x + 4·(−2).'], explain: '(x + 4)(x − 2) = x² − 2x + 4x − 8 = x² + 2x − 8. Any equivalent form is accepted.' } },
        { k: 'activity', q: { id: 'q-graph', type: 'graph', difficulty: 2, ask: 'numeric', prompt: 'The graph shows y = x² − x − 6. What is its positive root?', plot: { fn: 'x^2-x-6', xmin: -4, xmax: 5, ymin: -8, ymax: 8, ystep: 2, alt: 'Parabola crossing the x-axis at −2 and 3, with minimum about −6.25 at x = 0.5.' }, answer: 3, tol: 0.05, explain: 'It crosses the x-axis at x = −2 and x = 3. Check: x² − x − 6 = (x − 3)(x + 2).' } }
      ] },
      { id: 'disc', title: 'How many roots? The discriminant', blocks: [
        { k: 'text', md: 'The quadratic formula gives the roots of ax² + bx + c = 0:' },
        { k: 'math', tex: 'x = (−b ± sqrt(b^2 − 4ac)) / 2a', alt: 'x equals minus b plus or minus the square root of b squared minus four a c, all over two a' },
        { k: 'text', md: 'The part under the square root, **Δ = b² − 4ac**, is the **discriminant**:\n\n- Δ > 0: two distinct real roots (the graph crosses the x-axis twice);\n- Δ = 0: one repeated root (it touches the axis at the vertex);\n- Δ < 0: no real roots (it misses the axis).' },
        { k: 'activity', q: { id: 'q-disc', type: 'numeric', difficulty: 2, prompt: 'Find the discriminant of 2x² + 3x + 5.', answer: -31, tol: 0, wrong: [{ value: 49, why: 'Check the sign: it is b² **minus** 4ac = 9 − 40.', tag: 'sign error' }, { value: -11, why: 'Did you use 4ac = 4 × 5? Remember a = 2: 4 × 2 × 5 = 40.', tag: 'missed a coefficient' }], explain: 'Δ = 3² − 4 × 2 × 5 = 9 − 40 = −31 < 0, so there are no real roots.' } },
        { k: 'activity', q: { id: 'q-slider', type: 'slider', difficulty: 2, prompt: 'For y = x² + 4x + c, move the slider to the value of c that makes the graph just **touch** the x-axis.', param: { label: 'c', min: -2, max: 8, step: 0.5, start: 0 }, compute: '16 - 4*p', resultLabel: 'Delta = b^2 − 4ac', target: 0, tol: 0.001, explain: 'Touching means one repeated root: Δ = 16 − 4c = 0, so c = 4. Then y = (x + 2)².' } }
      ] },
      { id: 'vertex', title: 'The vertex', blocks: [
        { k: 'text', md: 'Completing the square writes the quadratic as y = a(x − h)² + k. The vertex is then **(h, k)**, and the axis of symmetry is x = h = −b / 2a.' },
        { k: 'activity', q: { id: 'q-steps', type: 'steps', difficulty: 3, prompt: 'Find the vertex of y = x² − 6x + 5.', steps: [{ type: 'numeric', prompt: 'x-coordinate of the vertex: h = −b / 2a = ?', answer: 3, tol: 0, explain: 'h = 6 / 2 = 3.' }, { type: 'numeric', prompt: 'y-coordinate: substitute x = 3. k = ?', answer: -4, tol: 0, explain: '9 − 18 + 5 = −4.' }, { type: 'mcq', prompt: 'So in completed-square form…', options: ['y = (x − 3)² − 4', 'y = (x + 3)² − 4', 'y = (x − 3)² + 4'], answer: 0, explain: 'Vertex (3, −4) ⇒ y = (x − 3)² − 4.' }], explain: 'h = −b/2a, then substitute to find k.' } }
      ] }
    ],
    summary: ['y = ax² + bx + c is a parabola; a > 0 opens up, a < 0 opens down.', 'Roots are where y = 0; factorise or use the formula.', 'Δ = b² − 4ac decides the number of real roots.', 'Vertex at x = −b/2a; completed square y = a(x − h)² + k.'],
    further: [{ title: 'OpenStax College Algebra 2e — Quadratic functions', publisher: 'OpenStax (CC BY 4.0)', url: 'https://openstax.org/books/college-algebra-2e/pages/5-1-quadratic-functions' }],
    revision: [{ id: 'q-r1', type: 'multi', difficulty: 2, prompt: 'Which equations have two distinct real roots?', options: ['x² − 5x + 6 = 0', 'x² + 2x + 1 = 0', 'x² + x + 1 = 0', '2x² − 3x − 2 = 0'], answer: [0, 3], explain: 'Δ: 25 − 24 = 1 > 0; 4 − 4 = 0 (repeated); 1 − 4 = −3 < 0; 9 + 16 = 25 > 0.' }],
    cards: [{ front: 'Quadratic formula', back: 'x = (−b ± √(b² − 4ac)) / 2a', kind: 'formula' }, { front: 'Discriminant tells you…', back: 'Δ > 0: two real roots · Δ = 0: one repeated root · Δ < 0: none', kind: 'definition' }, { front: 'Vertex x-coordinate', back: 'x = −b / 2a', kind: 'formula' }]
  });

  /* ================= 6 · The derivative ================= */
  LS.addLesson({
    id: 'math-deriv', v: '1.0', why: 'Derivatives turn “how fast is this changing?” into a calculation — the language of physics, economics and engineering.', title: 'The derivative as a rate of change', subject: 'Mathematics', level: 'Pre-university / JEE', course: 'Calculus', chapter: 'Differentiation', topic: 'Derivatives',
    mins: 30, tags: ['derivative', 'gradient', 'tangent', 'first principles', 'power rule'],
    objectives: ['Interpret the derivative as the gradient of a tangent and as a rate of change.', 'Differentiate x² from first principles.', 'Use the power rule for polynomials.'],
    prereq: [{ text: 'Gradient of a straight line; quadratic graphs.', lesson: 'math-quad' }],
    provenance: Object.assign({}, P, { sources: [{ title: 'OpenStax Calculus Volume 1, §3.1 “Defining the Derivative”', publisher: 'OpenStax (CC BY-NC-SA 4.0)', url: 'https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative' }] }),
    formats: ['text', 'visual', 'practice'],
    sections: [
      { id: 'secant', title: 'From secant to tangent', blocks: [
        { k: 'text', md: 'The gradient of a curve changes from point to point. To find it at a point P, take a nearby point Q on the curve and draw the straight line through both — a **secant**. Its gradient is rise over run. As Q slides towards P, the secant turns into the **tangent** at P, and its gradient approaches the gradient of the curve at P.' },
        { k: 'lab', engine: 'secant', objective: 'Shrink h and watch the secant become the tangent.', try: ['Make h smaller and smaller: what number does the gradient approach?', 'Try a negative h.'], assume: 'Exact arithmetic for the function shown; the limit is approached numerically.' },
        { k: 'math', tex: "f'(x) = lim_{h->0} (f(x + h) − f(x)) / h", alt: 'f prime of x equals the limit as h tends to zero of f of x plus h minus f of x, all over h' }
      ] },
      { id: 'first', title: 'First principles', blocks: [
        { k: 'example', title: 'Differentiate f(x) = x² from first principles', problem: 'Use the limit definition.', steps: ['f(x + h) − f(x) = (x + h)² − x² = 2xh + h².', 'Divide by h: 2x + h.', 'Let h → 0: the gradient is 2x.'], answer: "f'(x) = 2x" },
        { k: 'activity', q: { id: 'd-grad', type: 'numeric', difficulty: 1, prompt: 'Using f′(x) = 2x, what is the gradient of y = x² at x = 3?', answer: 6, tol: 0, wrong: [{ value: 9, why: '9 is the value of y = x² at x = 3, not its gradient.', tag: 'value vs gradient' }], explain: 'f′(3) = 2 × 3 = 6.' } },
        { k: 'activity', q: { id: 'd-tf', type: 'tf', difficulty: 2, prompt: '“At the vertex of a parabola, the derivative is zero.”', answer: true, explain: 'The tangent at a turning point is horizontal, so its gradient is 0.' } }
      ] },
      { id: 'power', title: 'The power rule', blocks: [
        { k: 'text', md: 'Doing the same for xⁿ gives the **power rule**: multiply by the power, then reduce the power by one. Constants differentiate to 0, and you can differentiate term by term.' },
        { k: 'math', tex: 'd/dx (x^n) = n x^{n−1}', alt: 'the derivative of x to the n is n times x to the n minus one' },
        { k: 'activity', q: { id: 'd-expr', type: 'expr', difficulty: 2, prompt: 'Differentiate y = 4x³ − 5x² + 7x − 2.', lhs: 'dy/dx', answer: '12x^2-10x+7', vars: ['x'], hints: ['Treat each term separately.', 'd/dx(4x³) = 12x².'], explain: 'dy/dx = 12x² − 10x + 7 (the constant −2 differentiates to 0).' } },
        { k: 'activity', q: { id: 'd-rate', type: 'steps', difficulty: 3, prompt: 'A ball’s height is h(t) = 20t − 5t² metres after t seconds.', steps: [{ type: 'expr', prompt: 'Find its velocity dh/dt.', answer: '20-10t', vars: ['t'], explain: 'dh/dt = 20 − 10t m/s.' }, { type: 'numeric', prompt: 'At what time is it at its highest point? (velocity = 0)', answer: 2, tol: 0.01, explain: '20 − 10t = 0 ⇒ t = 2 s.' }, { type: 'numeric', prompt: 'What is the maximum height?', answer: 20, tol: 0.01, explain: 'h(2) = 40 − 20 = 20 m.' }], explain: 'Velocity is the rate of change of height; the top is where it is zero.' } }
      ] }
    ],
    summary: ['The derivative is the gradient of the tangent, the limit of secant gradients.', 'f′(x) = lim (f(x+h) − f(x))/h as h → 0.', 'Power rule: d/dx xⁿ = n xⁿ⁻¹; constants → 0.', 'Turning points have f′(x) = 0.'],
    further: [{ title: 'OpenStax Calculus Volume 1 — Defining the derivative', publisher: 'OpenStax (CC BY-NC-SA 4.0)', url: 'https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative' }],
    revision: [{ id: 'd-r1', type: 'mcq', difficulty: 2, prompt: 'If y = x⁵, then dy/dx = …', options: ['5x⁴', 'x⁴', '5x⁵', '4x⁵'], answer: 0, why: { 1: 'Multiply by the power as well: 5x⁴.', 2: 'The power goes down by one.', 3: 'Multiply by the old power (5) and reduce it by one.' }, tags: { 1: 'power rule step missed', 2: 'power rule step missed', 3: 'power rule step missed' }, explain: 'n xⁿ⁻¹ = 5x⁴.' }],
    cards: [{ front: 'Derivative from first principles', back: "f'(x) = lim h→0 of (f(x+h) − f(x)) / h", kind: 'formula' }, { front: 'Power rule', back: 'd/dx (xⁿ) = n xⁿ⁻¹', kind: 'formula' }]
  });

  /* ================= 7 · Newton's second law ================= */
  LS.addLesson({
    id: 'phys-newton', v: '1.0', why: 'F = ma explains every push, crash and launch, and is the starting point of mechanics.', title: 'Newton’s second law: force and acceleration', subject: 'Physics', level: 'Secondary / JEE foundation', course: 'Mechanics', chapter: 'Forces and motion', topic: 'Newton’s second law',
    mins: 25, tags: ['force', 'acceleration', 'mass', 'friction', 'F = ma'],
    objectives: ['Find the resultant (net) force on an object.', 'Use F = ma to calculate force, mass or acceleration.', 'Explain why constant velocity needs no resultant force.'],
    prereq: [{ text: 'Speed, velocity and acceleration; forces as pushes and pulls.' }],
    provenance: Object.assign({}, P, { sources: [{ title: 'OpenStax University Physics Volume 1, §5.3 “Newton’s Second Law”', publisher: 'OpenStax (CC BY 4.0)', url: 'https://openstax.org/books/university-physics-volume-1/pages/5-3-newtons-second-law' }] }),
    formats: ['text', 'visual', 'video', 'practice'],
    sections: [
      { id: 'net', title: 'Resultant force', blocks: [
        { k: 'text', md: 'Several forces usually act on an object at once. Their combined effect is the **resultant force** (net force): add forces in the same direction and subtract opposing ones.\n\nIf the resultant force is **zero**, the object keeps doing what it was doing — staying still or moving at **constant velocity** (Newton’s first law). Motion does not need a force; **changing** motion does.' },
        { k: 'activity', q: { id: 'n-tf', type: 'tf', difficulty: 2, prompt: '“A car moving at a steady 30 m/s on a straight road has a resultant force on it in the direction of motion.”', answer: false, explain: 'Steady velocity means zero acceleration, so the resultant force is zero: the engine’s driving force exactly balances air resistance and friction.' } }
      ] },
      { id: 'fma', title: 'F = ma', blocks: [
        { k: 'text', md: 'Newton’s second law: the **acceleration** of an object is proportional to the **resultant force** and inversely proportional to its **mass**, in the direction of the force.' },
        { k: 'math', tex: 'F = m a', alt: 'F equals m times a' },
        { k: 'text', md: 'With F in **newtons (N)**, m in **kilograms (kg)** and a in **m/s²**, 1 N is the force that gives 1 kg an acceleration of 1 m/s².' },
        { k: 'lab', engine: 'newton', objective: 'Push a block with different forces and masses and measure its acceleration.', try: ['Double the force: what happens to the acceleration?', 'Double the mass with the same force.'], assume: 'A rigid block on a level surface with a constant friction coefficient; air resistance is ignored.' },
        { k: 'activity', q: { id: 'n-num', type: 'numeric', difficulty: 1, prompt: 'A resultant force of 30 N acts on a 6 kg trolley. What is its acceleration?', unit: 'm/s^2', answer: 5, tol: 0.01, wrong: [{ value: 180, why: 'Rearrange F = ma for a: a = F ÷ m, not F × m.', tag: 'rearranging formulas' }, { value: 0.2, why: 'That is m ÷ F. Acceleration is F ÷ m.', tag: 'rearranging formulas' }], explain: 'a = F / m = 30 / 6 = 5 m/s².' } },
        { k: 'activity', q: { id: 'n-slider', type: 'slider', difficulty: 1, prompt: 'A 4 kg box on a frictionless surface. Set the force so the box accelerates at **2 m/s²**.', param: { label: 'F', unit: 'N', min: 0, max: 20, step: 1, start: 0 }, compute: 'p/4', resultLabel: 'a', resultUnit: 'm/s^2', target: 2, tol: 0.001, explain: 'F = ma = 4 × 2 = 8 N.' } }
      ] },
      { id: 'friction', title: 'Real situations', blocks: [
        { k: 'example', title: 'Worked example', problem: 'A 10 kg box is pushed with 50 N against 20 N of friction. Find its acceleration.', steps: ['Resultant force = 50 − 20 = 30 N.', 'a = F / m = 30 / 10 = 3 m/s².'], answer: '3 m/s² in the direction of the push' },
        { k: 'activity', q: { id: 'n-steps', type: 'steps', difficulty: 3, prompt: 'A 1200 kg car accelerates from rest. The engine provides a driving force of 4000 N and the total resistance is 1600 N.', steps: [{ type: 'numeric', prompt: 'Resultant force (N)?', answer: 2400, tol: 0, explain: '4000 − 1600 = 2400 N.' }, { type: 'numeric', prompt: 'Acceleration (m/s²)?', answer: 2, tol: 0.01, explain: '2400 / 1200 = 2 m/s².' }, { type: 'numeric', prompt: 'Speed after 5 s (m/s)? Use v = u + at.', answer: 10, tol: 0.01, explain: 'v = 0 + 2 × 5 = 10 m/s.' }], explain: 'Find the resultant force first, then a = F/m, then use a kinematics equation.' } },
        { k: 'activity', q: { id: 'n-graph', type: 'graph', difficulty: 2, ask: 'numeric', prompt: 'This graph shows acceleration (y, m/s²) against resultant force (x, N) for one trolley. What is the trolley’s mass in kg?', plot: { fn: 'x/2', xmin: 0, xmax: 10, ymin: 0, ymax: 5, alt: 'A straight line through the origin; at 10 N the acceleration is 5 m/s².' }, answer: 2, tol: 0.05, explain: 'The gradient is a/F = 1/m = 0.5, so m = 2 kg. (At 10 N, a = 5 m/s² → m = 10/5 = 2 kg.)' } },
        { k: 'activity', q: { id: 'n-mcq', type: 'mcq', difficulty: 2, prompt: 'The same force acts on a 2 kg ball and a 6 kg ball. Compared with the 2 kg ball, the 6 kg ball’s acceleration is…', options: ['one third as large', 'three times as large', 'the same', 'nine times smaller'], answer: 0, why: { 1: 'More mass means LESS acceleration for the same force.', 2: 'Acceleration depends on mass when the force is fixed.', 3: 'a is inversely proportional to m — not to m².' }, tags: { 1: 'proportional reasoning', 3: 'proportional reasoning' }, explain: 'a = F/m, so tripling the mass divides the acceleration by three.' } }
      ] }
    ],
    summary: ['Resultant force = vector sum of all forces.', 'Zero resultant → constant velocity (or rest).', 'F = ma; 1 N = 1 kg·m/s².', 'Find the resultant force first in real problems.'],
    further: [{ title: 'OpenStax University Physics Vol. 1 — Newton’s second law', publisher: 'OpenStax (CC BY 4.0)', url: 'https://openstax.org/books/university-physics-volume-1/pages/5-3-newtons-second-law' }],
    revision: [{ id: 'n-r1', type: 'numeric', difficulty: 2, prompt: 'What resultant force is needed to accelerate a 0.5 kg ball at 12 m/s²?', unit: 'N', answer: 6, tol: 0.01, wrong: [{ value: 24, why: 'F = m × a = 0.5 × 12. Did you divide instead of multiply?', tag: 'rearranging formulas' }], explain: 'F = 0.5 × 12 = 6 N.' }],
    cards: [{ front: 'Newton’s second law', back: 'F = ma (resultant force = mass × acceleration)', kind: 'formula' }, { front: 'Zero resultant force means…', back: 'No acceleration: the object stays at rest or moves at constant velocity.', kind: 'definition' }]
  });

  /* ================= 8 · Current, voltage and resistance ================= */
  LS.addLesson({
    id: 'phys-circuits', v: '1.0', why: 'Every device you own is a circuit; V = IR lets you predict and design them safely.', title: 'Current, voltage and resistance', subject: 'Physics', level: 'Secondary / JEE foundation', course: 'Electricity', chapter: 'Circuits', topic: 'Electric circuits',
    mins: 25, tags: ['current', 'voltage', 'resistance', 'ohm', 'series', 'parallel'],
    objectives: ['Define current, potential difference and resistance.', 'Use V = IR.', 'Combine resistors in series and in parallel.'],
    prereq: [{ text: 'Charge is carried by electrons in metals.' }],
    provenance: Object.assign({}, P, { sources: [{ title: 'OpenStax University Physics Volume 2, ch. 9–10', publisher: 'OpenStax (CC BY 4.0)', url: 'https://openstax.org/books/university-physics-volume-2/pages/9-introduction' }] }),
    formats: ['text', 'visual', 'practice'],
    sections: [
      { id: 'terms', title: 'Three quantities', blocks: [
        { k: 'text', md: '- **Current** (I, amperes A): the rate of flow of charge, I = Q / t.\n- **Potential difference** or voltage (V, volts V): the energy transferred per unit charge between two points.\n- **Resistance** (R, ohms Ω): how much a component opposes the current, R = V / I.' },
        { k: 'figure', svg: F.circuit, alt: 'A series circuit with a cell, ammeter, two resistors and a voltmeter across R2.', cap: F.circuitCap },
        { k: 'activity', q: { id: 'e-match', type: 'match', difficulty: 1, prompt: 'Match each quantity with its unit.', pairs: [['Current', 'ampere (A)'], ['Potential difference', 'volt (V)'], ['Resistance', 'ohm (Ω)'], ['Charge', 'coulomb (C)']], explain: 'A, V, Ω, C.' } }
      ] },
      { id: 'ohm', title: 'V = IR', blocks: [
        { k: 'math', tex: 'V = I R', alt: 'V equals I times R' },
        { k: 'text', md: 'For an **ohmic** conductor at constant temperature (such as a metal wire), current is proportional to voltage, so R is constant. Filament lamps and diodes are not ohmic.' },
        { k: 'activity', q: { id: 'e-num', type: 'numeric', difficulty: 1, prompt: 'A 12 V battery drives a current through a 4 Ω resistor. What is the current?', unit: 'A', answer: 3, tol: 0.01, wrong: [{ value: 48, why: 'I = V ÷ R, not V × R.', tag: 'rearranging formulas' }, { value: 0.333, tol: 0.01, why: 'That is R ÷ V. Current is V ÷ R.', tag: 'rearranging formulas' }], explain: 'I = V / R = 12 / 4 = 3 A.' } },
        { k: 'lab', engine: 'circuit', objective: 'Build circuits and measure current and voltage.', try: ['Add a resistor in series: what happens to the current?', 'Add one in parallel instead.'], assume: 'Ideal wires, cells and meters (no internal resistance unless stated).' }
      ] },
      { id: 'combine', title: 'Series and parallel', blocks: [
        { k: 'text', md: '**In series**, the same current passes through each component and the resistances **add**: R = R₁ + R₂ + …\n\n**In parallel**, each branch has the same voltage, and the combined resistance is **less than the smallest** branch: 1/R = 1/R₁ + 1/R₂ + …' },
        { k: 'activity', q: { id: 'e-par', type: 'numeric', difficulty: 2, prompt: 'What is the combined resistance of 6 Ω and 3 Ω in parallel?', unit: 'Ω', answer: 2, tol: 0.01, wrong: [{ value: 9, why: '9 Ω is the series total. In parallel, 1/R = 1/6 + 1/3.', tag: 'series vs parallel' }, { value: 0.5, why: '1/R = 0.5 — now take the reciprocal: R = 2 Ω.', tag: 'forgot the reciprocal' }], hints: ['1/R = 1/6 + 1/3 = 1/6 + 2/6.', 'Then flip the fraction.'], explain: '1/R = 1/6 + 2/6 = 3/6 = 1/2, so R = 2 Ω — less than either branch.' } },
        { k: 'activity', q: { id: 'e-steps', type: 'steps', difficulty: 3, prompt: 'In the diagram above, the cell is 6 V, R1 = 4 Ω and R2 = 8 Ω (in series).', steps: [{ type: 'numeric', prompt: 'Total resistance (Ω)?', answer: 12, tol: 0, explain: '4 + 8 = 12 Ω.' }, { type: 'numeric', prompt: 'Current shown on the ammeter (A)?', answer: 0.5, tol: 0.001, explain: 'I = 6 / 12 = 0.5 A.' }, { type: 'numeric', prompt: 'Reading on the voltmeter across R2 (V)?', answer: 4, tol: 0.01, explain: 'V = IR = 0.5 × 8 = 4 V (and 2 V across R1: the voltages add to 6 V).' }], explain: 'Series: add resistances, find the current, then V = IR for each part.' } },
        { k: 'activity', q: { id: 'e-sort', type: 'sort', difficulty: 2, prompt: 'Is each statement true of series or of parallel circuits?', categories: ['Series', 'Parallel'], items: [{ text: 'The current is the same everywhere', cat: 'Series' }, { text: 'Each branch has the full supply voltage', cat: 'Parallel' }, { text: 'Adding a resistor reduces the total resistance', cat: 'Parallel' }, { text: 'If one lamp breaks, they all go out', cat: 'Series' }], explain: 'Series shares the voltage and carries one current; parallel gives every branch the full voltage, and extra branches lower the total resistance.' } }
      ] }
    ],
    summary: ['I = Q/t; V is energy per charge; R = V/I.', 'V = IR for ohmic conductors.', 'Series: R = R₁ + R₂; same current.', 'Parallel: 1/R = 1/R₁ + 1/R₂; same voltage; total less than the smallest branch.'],
    further: [{ title: 'OpenStax University Physics Vol. 2 — Resistors in series and parallel', publisher: 'OpenStax (CC BY 4.0)', url: 'https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel' }],
    revision: [{ id: 'e-r1', type: 'mcq', difficulty: 2, prompt: 'Two identical lamps are moved from series to parallel on the same battery. Each lamp…', options: ['gets brighter', 'gets dimmer', 'stays the same'], answer: 0, keepOrder: true, why: { 1: 'In parallel each lamp gets the full battery voltage, more than the half it had in series.', 2: 'The voltage across each lamp changes from half the supply to the full supply.' }, tags: { 1: 'series vs parallel', 2: 'series vs parallel' }, explain: 'In parallel each lamp has the full voltage (and so a larger current), so each is brighter.' }],
    cards: [{ front: 'Ohm’s law', back: 'V = IR', kind: 'formula' }, { front: 'Resistors in parallel', back: '1/R = 1/R₁ + 1/R₂ (total < smallest)', kind: 'formula' }, { front: 'Current', back: 'Rate of flow of charge: I = Q/t, in amperes.', kind: 'definition' }]
  });
})();
