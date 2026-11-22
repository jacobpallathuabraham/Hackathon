/* ERLY Learning Studio — Explore: subject worlds, topics, Discover, experiences and the Discovery Archive.

   The experience REGISTRY lives here (small, loaded with the page). The experiences themselves (simulations,
   models, missions) and the ambient subject worlds are in ls-exp.js / ls-exp2.js / ls-worlds.js and are loaded
   only when a student opens one — nothing heavy runs on the Home page.

   Each experience is chosen for what suits the idea (an experiment for cause and effect, a model for structure,
   a mission for evidence), says plainly what it simplifies, and records evidence for the objectives it serves. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store;

  const KINDS = { challenge: 'Challenge',
    experiment: 'Experiment', simulation: 'Simulation', model: 'Interactive model', explore: 'Explore', mission: 'Mystery case',
    journey: 'Cinematic journey', visualization: 'Visualizer', construction: 'Construction studio', investigation: 'Investigation', playground: 'Playground', system: 'Living system', practice: 'Practice lab', build: 'Build & break', whatif: 'What-if lab', zoom: 'Zoom through knowledge', conversation: 'Conversation', builder: 'Builder'
  };
  const X = [
    { id: 'newton-lab', subject: 'physics', kind: 'experiment', title: 'Newton’s laws lab', hook: 'Push a crate, change its mass and the floor beneath it, crash two carts — and watch the forces.', mins: 12, objs: ['phys-newton:0', 'phys-newton:1', 'phys-newton:2'], lesson: 'phys-newton', simplified: 'One dimension; a rigid crate; constant friction coefficients (typical values, real surfaces vary); no air resistance; g = 9.8 m/s².' },
    { id: 'solar-system', subject: 'physics', kind: 'explore', title: 'Solar System explorer', hook: 'The eight planets where they really are today — run time, zoom to Neptune, and test Kepler’s third law on every one.', mins: 10, objs: [], simplified: 'Orbits drawn flat (inclinations ignored); positions from mean J2000 elements, good to about a degree.' },
    { id: 'circuit-builder', subject: 'physics', kind: 'construction', title: 'Circuit builder', hook: 'Wire any circuit you like — batteries, bulbs, resistors, switches — and see every current solved by Kirchhoff’s laws.', mins: 12, objs: ['phys-circuits:2'], lesson: 'phys-circuits', simplified: 'Ideal wires; bulbs as fixed resistors; batteries with 0.05 Ω internal resistance.' },
    { id: 'projectile', subject: 'physics', kind: 'experiment', title: 'Projectile launcher', hook: 'Fire a ball across Earth, the Moon or Jupiter. Which angle flies furthest — and why do 30° and 60° tie?', mins: 8, objs: [], simplified: 'Point-mass ball; air drag (if on) is a simple quadratic model.' },
    { id: 'incline', subject: 'physics', kind: 'experiment', title: 'Inclined plane lab', hook: 'Tilt a ramp until the block slips. Does a heavier block hold on longer?', mins: 8, objs: ['phys-newton:1'], lesson: 'phys-newton', simplified: 'Rigid block; kinetic friction taken as 0.8 μₛ.' },
    { id: 'gravity-explorer', subject: 'physics', kind: 'explore', title: 'Gravity explorer', hook: 'Pull the Moon away from the Earth and watch the force fall — then weigh yourself on nine worlds.', mins: 7, objs: [], simplified: 'Point masses on a line; surface gravities rounded.' },
    { id: 'atmosphere', subject: 'physics', kind: 'explore', title: 'Atmosphere explorer', hook: 'Ride a probe from the ground to 120 km through every layer of the sky.', mins: 6, objs: [], simplified: 'International Standard Atmosphere (an average) to 86 km.' },
    { id: 'optics', subject: 'physics', kind: 'experiment', title: 'Light bender', hook: 'Bend light into glass, trap it by total internal reflection, then make a lens form an image.', mins: 9, objs: [], simplified: 'Rays only; thin-lens formula.' },
    { id: 'sound', subject: 'physics', kind: 'explore', title: 'Sound explorer', hook: 'See air squash and stretch as a note travels — and hear it if you like.', mins: 6, objs: [], simplified: 'Animation slowed enormously; speed of sound 343 m/s.' },
    { id: 'energy-track', subject: 'physics', kind: 'simulation', title: 'Energy track', hook: 'Roll a ball in a valley and follow every joule between height, speed and heat.', mins: 6, objs: [], simplified: 'Sliding ball on a smooth curve; friction is a model constant.' },
    { id: 'magnet-field', subject: 'physics', kind: 'explore', title: 'Magnet field lab', hook: 'Drag two magnets and watch their field lines join, bend and cancel.', mins: 6, objs: [], simplified: 'Each pole is treated as a point.' },
    { id: 'black-hole', subject: 'physics', kind: 'visualization', title: 'Black hole explorer', hook: 'Grow a black hole from one Sun to four million and watch light bend around it.', mins: 6, objs: [], simplified: 'Non-rotating black hole; disc is illustrative.' },
    { id: 'motion-graphs', subject: 'physics', kind: 'experiment', title: 'Motion graphs lab', hook: 'A car speeds up steadily. What shape is its distance–time graph?', mins: 8, objs: ['phys-motion:1', 'phys-motion:2', 'phys-motion:3'], lesson: 'phys-motion', simplified: 'One dimension, constant acceleration, no friction or air resistance.' },
    { id: 'orbit-whatif', subject: 'physics', kind: 'whatif', title: 'What if the Sun were heavier?', hook: 'Double the Sun’s mass and keep the planet’s speed. What happens to its orbit?', mins: 6, objs: [], simplified: 'One planet, a Sun that does not move, Newtonian gravity, no other planets. Units are scaled so Earth-like values are 1.' },
    { id: 'circuit-break', subject: 'physics', kind: 'build', title: 'Build & break a circuit', hook: 'Three bulbs, one battery. If one bulb breaks, do the others go out?', mins: 6, objs: ['phys-circuits:2'], lesson: 'phys-circuits', simplified: 'Ideal 12 V battery and wires; identical 6 Ω bulbs whose resistance does not change as they heat up.' },
    { id: 'waves', subject: 'physics', kind: 'experiment', title: 'When two waves meet', hook: 'Two waves meet. When do they cancel out completely?', mins: 4, objs: [], simplified: 'Two ideal sine waves of equal amplitude on a line.' },
    { id: 'molecule-3d', subject: 'chemistry', kind: 'construction', title: '3D molecule builder', hook: 'Build water, methane, ethanol — any molecule — atom by atom in 3D, with valence checked and shapes from electron-pair repulsion.', mins: 12, objs: ['chem-vsepr:0', 'chem-vsepr:1'], lesson: 'chem-vsepr', simplified: 'Layout imitates VSEPR; angles are approximate.' },
    { id: 'atom-builder', subject: 'chemistry', kind: 'construction', title: 'Atom builder', hook: 'Add protons, neutrons and electrons: make an element, an isotope, then an ion.', mins: 6, objs: [], simplified: 'Shell model (2, 8, 8, 2) for the first 20 elements.' },
    { id: 'periodic', subject: 'chemistry', kind: 'explore', title: 'Periodic table explorer', hook: 'Colour the first 36 elements by electronegativity, mass or outer electrons and see the patterns appear.', mins: 7, objs: [], simplified: 'Elements 1–36.' },
    { id: 'balance', subject: 'chemistry', kind: 'practice', title: 'Equation balancer', hook: 'Atoms can’t vanish. Tune the coefficients until every element balances.', mins: 6, objs: [], simplified: 'Ten common reactions.' },
    { id: 'titration', subject: 'chemistry', kind: 'experiment', title: 'Titration curve', hook: 'Drip alkali into acid and catch the moment the indicator flips — strong acid versus weak.', mins: 8, objs: ['chem-ph:0'], lesson: 'chem-ph', simplified: '25 °C; ideal solutions.' },
    { id: 'collisions', subject: 'chemistry', kind: 'simulation', title: 'Collision theory', hook: 'Heat it, crowd it, catalyse it — and count the collisions that actually react.', mins: 7, objs: [], simplified: '2D particles in arbitrary units.' },
    { id: 'particles', subject: 'chemistry', kind: 'simulation', title: 'Inside a substance', hook: 'Why does heating a solid make it melt — what are the particles actually doing?', mins: 7, objs: [], simplified: 'A 2-D model of 64 identical particles with a simple attraction law (Lennard-Jones). Temperatures are in model units, not °C.' },
    { id: 'fn-play', subject: 'maths', kind: 'playground', title: 'Function playground', hook: 'Type any function, bend it with sliders, pan and zoom — and discover why f(x − 3) moves right.', mins: 10, objs: [], simplified: 'Real-valued functions; plotted at 700 points across the view.' },
    { id: 'quad-lab', subject: 'maths', kind: 'construction', title: 'Quadratic lab', hook: 'Drag a parabola by its vertex and watch three forms, the discriminant and its roots change together.', mins: 8, objs: ['math-quad:0', 'math-quad:1'], lesson: 'math-quad', simplified: 'Real roots only.' },
    { id: 'unit-circle', subject: 'maths', kind: 'visualization', title: 'Unit circle', hook: 'Spin a point round a circle and watch sine and cosine waves pour out of it.', mins: 6, objs: [], simplified: 'Angles in degrees; radians shown alongside.' },
    { id: 'transform', subject: 'maths', kind: 'explore', title: 'Transformation explorer', hook: 'Reflect, rotate, enlarge — and discover that two reflections can make a rotation.', mins: 7, objs: [], simplified: 'Transformations about the origin.' },
    { id: 'probability', subject: 'maths', kind: 'experiment', title: 'Probability lab', hook: 'Roll two dice a thousand times. Why does 7 win — and how fast does chance settle down?', mins: 6, objs: [], simplified: 'Uses your browser’s random numbers.' },
    { id: 'stats', subject: 'maths', kind: 'explore', title: 'Statistics visualizer', hook: 'Drag test scores and watch one outlier drag the mean but not the median.', mins: 6, objs: [], simplified: 'Population standard deviation; linear-interpolation quartiles.' },
    { id: 'fractions', subject: 'maths', kind: 'visualization', title: 'Fraction visualizer', hook: 'Which is bigger, 3/4 or 5/7? Cut both into 28ths and see.', mins: 5, objs: [], simplified: 'Fractions up to twelfths.' },
    { id: 'tangent', subject: 'maths', kind: 'visualization', title: 'Tangent explorer', hook: 'Shrink a secant into a tangent and trace the derivative of a curve with your finger.', mins: 8, objs: ['math-deriv:0'], lesson: 'math-deriv', simplified: 'Four example functions.' },
    { id: 'dihybrid', subject: 'biology', kind: 'experiment', title: 'Dihybrid cross', hook: 'Cross pea plants for two traits at once, grow a random crop and test it against 9 : 3 : 3 : 1 with χ².', mins: 10, objs: [], simplified: 'Two unlinked genes with complete dominance.' },
    { id: 'story-architect', subject: 'english', kind: 'construction', title: 'Story architect', hook: 'Shape a story on a tension curve — exposition to climax to resolution — and check its structure before you write.', mins: 12, objs: [], simplified: 'Checks structure only; your writing is never marked or stored.' },
    { id: 'number-words', subject: 'languages', kind: 'construction', title: 'Number words (Spanish & French)', hook: 'Watch any number up to 9 999 999 assemble itself in Spanish and French — from veintiún mil to quatre-vingt-dix-neuf.', mins: 8, objs: [], simplified: 'French in the 1990 recommended spelling (hyphens throughout).' },
    { id: 'time-teller', subject: 'languages', kind: 'experiment', title: 'Telling the time', hook: 'Drag the clock hands and hear where Spanish and French switch from “past” to “to” the hour.', mins: 6, objs: [], simplified: 'Spoken 12-hour conventions.' },
    { id: 'voting', subject: 'social', kind: 'system', title: 'Voting systems', hook: 'Same voters, same ballots — five counting rules. Watch the winner change with the rule.', mins: 10, objs: [], simplified: 'Four candidates; ties broken alphabetically.' },
    { id: 'derivative-lab', subject: 'maths', kind: 'visualization', title: 'Differentiation explorer', hook: 'Drag a secant until it becomes a tangent, let h shrink to zero, and watch f′ draw itself beneath the curve.', mins: 15, objs: ['math-deriv:0', 'math-deriv:2'], lesson: 'math-deriv', simplified: 'Exact derivatives for the built-in functions; a central difference for a typed one.' },
    { id: 'integral-lab', subject: 'maths', kind: 'visualization', title: 'Integration explorer', hook: 'Fill a curve with rectangles, drag the bounds, and see the area build up into the Fundamental Theorem of Calculus.', mins: 15, objs: [], simplified: 'Exact integrals from antiderivatives; Simpson’s rule for a typed function.' },
    { id: 'vectors', subject: 'maths', kind: 'construction', title: 'Vector playground', hook: 'Drag two arrows, add them tip to tail, and find when the dot product vanishes.', mins: 6, objs: [], simplified: '2D vectors on a half-unit grid.' },
    { id: 'function-forge', subject: 'maths', kind: 'playground', title: 'Function forge', hook: 'Type up to four functions, bend them with parameters, and watch roots, turning points and intersections appear.', mins: 12, objs: ['math-quad:1'], lesson: 'math-quad', simplified: 'Features are found numerically on the visible part of the graph.' },
    { id: 'math-missions', subject: 'maths', kind: 'challenge', title: 'Maths missions', hook: 'Reconstruct hidden functions, build graphs that meet conditions and crack a sequence — by building, not choosing.', mins: 15, objs: [], simplified: 'Answers are checked by evaluating your function at several points.' },
    { id: 'prob-lab', subject: 'maths', kind: 'experiment', title: 'Probability lab', hook: 'Coins, dice, a spinner you design and a deck of cards: watch chance settle towards theory.', mins: 10, objs: [], simplified: 'Uses your browser’s cryptographic random numbers; outcomes are independent.' },
    { id: 'reaction-lab', subject: 'chemistry', kind: 'construction', lesson: 'chem-ph', title: 'Reaction lab', hook: 'Balance ten real reactions, then watch every atom move from the reactants into the products.', mins: 10, objs: [], simplified: 'Molecules drawn as atom clusters; real reactions also involve energy changes and intermediate steps.' },
    { id: 'equation-balance', subject: 'maths', kind: 'construction', title: 'Equation Balance Studio', hook: 'Type any linear equation and solve it on a balance — every step done to both sides, in exact fractions.', mins: 10, objs: [], simplified: 'Linear equations in one unknown; operations are exact (fractions, no rounding).' },
    { id: 'geo-construct', subject: 'maths', kind: 'construction', title: 'Geometry Construction Studio', hook: 'Build with ruler and compass, then drag: which relationships survive every move?', mins: 12, objs: [], simplified: 'Euclidean plane; 1 unit = one grid square; angles to 0.1°.' },
    { id: 'solids-nets', subject: 'maths', kind: 'construction', title: '3D solids & nets', hook: 'Fold a flat net into a cube, a pyramid or a cylinder — and see why surface area is the area of the net.', mins: 9, objs: [], simplified: 'Right solids; the cone’s base circle slides into place rather than hinging.' },
    { id: 'line-builder', subject: 'maths', kind: 'model', title: 'Line builder', hook: 'What do m and c actually do to a line?', mins: 6, objs: ['math-linear:0', 'math-linear:1', 'math-linear:2'], lesson: 'math-linear', simplified: 'Exact: the graph is computed from y = mx + c.' },
    { id: 'photo-lab', subject: 'biology', kind: 'experiment', lesson: 'bio-photo', title: 'Photosynthesis lab', hook: 'Move the lamp, add carbon dioxide, warm the water — and count the bubbles your pondweed gives off.', mins: 10, objs: ['bio-photo:2'], simplified: 'A teaching model of limiting factors; counts vary randomly like a real practical.' },
    { id: 'dna', subject: 'biology', kind: 'construction', title: 'DNA to protein', hook: 'Mutate a gene one base at a time and watch transcription and translation rebuild the protein.', mins: 8, objs: [], simplified: 'Standard genetic code; one short gene.' },
    { id: 'punnett', subject: 'biology', kind: 'experiment', title: 'Punnett square', hook: 'Cross two purple plants and breed a hundred offspring: does the 3 : 1 ratio really appear?', mins: 7, objs: [], simplified: 'Complete dominance; independent genes.' },
    { id: 'ecosystem', subject: 'biology', kind: 'system', title: 'Predator & prey', hook: 'Rabbits, foxes and a meadow: watch two populations chase each other through time.', mins: 7, objs: [], simplified: 'Lotka–Volterra model, no food limit for prey.' },
    { id: 'enzyme', subject: 'biology', kind: 'experiment', title: 'Enzyme lab', hook: 'Heat an enzyme past its best and watch its active site melt away.', mins: 6, objs: [], simplified: 'Curve shapes are a teaching model; optima typical values.' },
    { id: 'osmosis', subject: 'biology', kind: 'simulation', title: 'Osmosis chamber', hook: 'Water crosses a membrane, sugar can’t. Which way does the water go — and why?', mins: 6, objs: [], simplified: 'Random crossings biased by the solute difference.' },
    { id: 'neuron', subject: 'biology', kind: 'simulation', title: 'Nerve impulse', hook: 'Find the threshold, fire an all-or-nothing spike, and race it along a myelinated axon.', mins: 6, objs: [], simplified: 'Idealised action potential; speeds are typical values.' },
    { id: 'leaf-dive', subject: 'biology', kind: 'zoom', title: 'Into the leaf', hook: 'Dive from a meadow into a single chloroplast — a million-times zoom — and find where sunlight becomes food.', mins: 7, objs: ['bio-photo:1'], lesson: 'bio-photo', simplified: 'Drawn diagrams, not to scale within a level; scale bars rounded to a useful power of ten.' },
    { id: 'heart-journey', subject: 'biology', kind: 'journey', title: 'Journey of a red blood cell', hook: 'Follow one red blood cell all the way round the body and back.', mins: 6, objs: ['bio-heart:1', 'bio-heart:0'], lesson: 'bio-heart', simplified: 'Schematic heart; valves and vessels simplified; not to scale.' },
    { id: 'cell-explorer', subject: 'biology', kind: 'explore', title: 'Inside a plant cell', hook: 'What is inside a leaf cell — and which parts would an animal cell not have?', mins: 6, objs: [], simplified: 'A labelled diagram of a typical leaf cell; real cells vary in shape and number of organelles.' },
    { id: 'zoom', subject: 'biology', kind: 'zoom', title: 'From the universe to a chloroplast', hook: 'How many times bigger is the observable universe than a chloroplast?', mins: 5, objs: [], simplified: 'Sizes are rounded to the nearest useful power of ten.' },
    { id: 'timeline', subject: 'history', kind: 'explore', title: 'How we learned how blood moves', hook: 'Who worked out that blood circulates — and how do we know?', mins: 7, objs: [], simplified: 'Ten turning points chosen from a long history; many other people contributed.' },
    { id: 'mystery-lungs', subject: 'history', kind: 'mission', title: 'The case of the missing pores', hook: 'Who first described blood travelling through the lungs? Weigh the evidence.', mins: 6, objs: [], simplified: 'Real sources, summarised. Historians still debate how ideas travelled.' },
    { id: 'water-cycle', subject: 'geography', kind: 'system', title: 'Water cycle', hook: 'A living planet in a box: warm it, pave it, cut its forest — and follow a single droplet from sea to cloud to mountain to river.', mins: 6, objs: [], simplified: 'Particles stand for amounts of water; one mountain, one sea.' },
    { id: 'plates', subject: 'geography', kind: 'explore', title: 'Plate boundaries', hook: 'Pull plates apart, crash them together, slide them past — and watch ridges, volcanoes and mountains form.', mins: 7, objs: [], simplified: 'Cross-sections not to scale; motion hugely sped up.' },
    { id: 'greenhouse', subject: 'geography', kind: 'whatif', title: 'Greenhouse balance', hook: 'Balance the Earth’s energy budget and see why a thin layer of gas keeps us 33 °C warmer.', mins: 7, objs: [], simplified: 'Single-layer energy-balance model.' },
    { id: 'earth-layers', subject: 'geography', kind: 'explore', title: 'Journey to the core', hook: 'Drill 6,371 km to the centre of the Earth. Why is the hottest layer solid?', mins: 5, objs: [], simplified: 'Average depths; temperatures are approximate ranges.' },
    { id: 'sources', subject: 'history', kind: 'investigation', title: 'Source investigator', hook: 'Pepys buried his cheese; a monument blamed the wrong people. Judge five real sources on the Great Fire of London.', mins: 8, objs: [], simplified: 'Five sources, summarised.' },
    { id: 'printing', subject: 'history', kind: 'construction', title: 'Chain of consequences', hook: 'How did a printing press in Mainz help start the Scientific Revolution? Build the chain.', mins: 6, objs: [], simplified: 'One simplified chain; other causes also mattered.' },
    { id: 'deep-time', subject: 'history', kind: 'visualization', title: 'Deep time', hook: 'Squeeze 13.8 billion years into one calendar year. When do humans arrive?', mins: 5, objs: [], simplified: 'Dates are standard estimates; several are approximate.' },
    { id: 'seasons', subject: 'geography', kind: 'simulation', title: 'Why seasons happen', hook: 'Why is it summer in Sydney when it is winter in London?', mins: 7, objs: [], simplified: 'Day length from the standard sunrise equation; ignores atmospheric refraction and the size of the Sun’s disc (real days are a few minutes longer).' },
    { id: 'sorting', subject: 'cs', kind: 'visualization', title: 'Sorting race', hook: 'Bubble, insertion, merge, quick: watch four algorithms race and count every comparison.', mins: 7, objs: [], simplified: '40 values; counts are exact for these implementations.' },
    { id: 'bits', subject: 'cs', kind: 'construction', title: 'Bit machine', hook: 'Flip eight switches to make a number, a letter, and an overflow.', mins: 5, objs: [], simplified: 'One unsigned byte; ASCII.' },
    { id: 'logic', subject: 'cs', kind: 'construction', title: 'Logic gates', hook: 'Wire two gates and three inputs, and let ERLY write your truth table.', mins: 6, objs: [], simplified: 'Two-gate circuits.' },
    { id: 'pathfind', subject: 'cs', kind: 'experiment', title: 'Path finder', hook: 'Draw a maze; race breadth-first search against A* to the goal.', mins: 6, objs: [], simplified: '4-way moves on a grid; Manhattan heuristic.' },
    { id: 'punctuation', subject: 'english', kind: 'explore', title: 'Punctuation changes meaning', hook: 'One comma separates inviting Grandma to dinner from eating her.', mins: 5, objs: [], simplified: 'Five classic examples.' },
    { id: 'morphology', subject: 'english', kind: 'construction', title: 'Word builder', hook: 'Snap prefixes, roots and suffixes together: un + believe + able.', mins: 5, objs: [], simplified: 'Small built-in word list.' },
    { id: 'conjugate', subject: 'languages', kind: 'construction', title: 'Verb conjugator', hook: 'See the stem-and-ending pattern of French and Spanish verbs, then test yourself.', mins: 7, objs: [], simplified: 'Regular verbs, present tense.' },
    { id: 'market', subject: 'more', kind: 'whatif', title: 'Market maker', hook: 'Coffee gets popular, costs rise, a price cap arrives — move the curves and watch the market react.', mins: 7, objs: [], simplified: 'Straight-line supply and demand.' },
    { id: 'compound', subject: 'more', kind: 'whatif', title: 'Growing money', hook: 'Interest on interest: how £1,000 becomes more than double the simple-interest total.', mins: 5, objs: [], simplified: 'Fixed rate; no fees or tax.' },
    { id: 'memory-curve', subject: 'more', kind: 'whatif', title: 'Forgetting & spacing', hook: 'Cram or space your reviews? Plot a model memory over 30 days.', mins: 5, objs: [], simplified: 'Illustrative exponential model.' },
    { id: 'sentence-lab', subject: 'english', kind: 'builder', title: 'Sentence workshop & story architect', hook: 'Move one word — can you change what a sentence means?', mins: 8, objs: [], simplified: 'A small set of example sentences; English allows more orders than are listed here.' },
    { id: 'cafe', subject: 'languages', kind: 'conversation', title: 'Ordering at a French café', hook: 'Order a drink in French without freezing.', mins: 6, objs: [], simplified: 'One polite, standard café exchange; real conversations vary.' },
    { id: 'city', subject: 'social', kind: 'simulation', title: 'Run a city budget', hook: 'You run a city. What happens when you cut public transport?', mins: 8, objs: [], simplified: 'A teaching toy with stated rules, not an economic forecast. The rules are shown on the page.' }
  ];
  LS.experiences = X;
  LS.expKinds = KINDS;
  LS.expMeta = id => { const x = X.find(e => e.id === id); return x ? Object.assign({ kindLabel: KINDS[x.kind] }, x, { kind: KINDS[x.kind] }) : null; };

  /* ---------- lazy loading of the heavy parts ---------- */
  const once = {};
  const script = src => once[src] || (once[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete once[src]; rej(new Error('Could not load ' + src)); }; document.head.appendChild(s); }));
  LS.needExp = () => script('assets/js/learn/ls-exp.js?v=28').then(() => script('assets/js/learn/ls-kit.js?v=26')).then(() => Promise.all([script('assets/js/learn/ls-x-phys.js?v=24'), script('assets/js/learn/ls-x-math.js?v=26'), script('assets/js/learn/ls-x-chem.js?v=28'), script('assets/js/learn/ls-x-bio.js?v=24'), script('assets/js/learn/ls-x-earth.js?v=26'), script('assets/js/learn/ls-x-mind.js?v=28'), script('assets/js/learn/ls-exp2.js?v=22b'), script('assets/js/learn/ls-exp-newton.js?v=26c'), script('assets/js/learn/ls-x-v26-math.js?v=26a'), script('assets/js/learn/ls-x-v26-solids.js?v=26b'), script('assets/js/learn/ls-x-v26-phys.js?v=26d'), script('assets/js/learn/ls-exp-bio.js?v=23d')]).then(() => script('assets/js/learn/ls-x-v27.js?v=28')).then(() => script('assets/js/learn/ls-x-v27-bio.js?v=27')).then(() => Promise.all([script('assets/js/learn/ls-x-v28-earth.js?v=28d'), script('assets/js/learn/ls-x-v28-calc.js?v=28d'), script('assets/js/learn/ls-x-v28-cs.js?v=28'), script('assets/js/learn/ls-x-v28-phys.js?v=28c'), script('assets/js/learn/ls-x-v28-words.js?v=28'), script('assets/js/learn/ls-x-v28-bio.js?v=28a')])));
  LS.needWorlds = () => script('assets/js/learn/ls-worlds.js?v=24');

  /* ---------- the subject worlds (Explore → Subjects) ---------- */
  const subj = () => LS.subjectsList || [];
  function worldCard(S) {
    const xs = X.filter(x => x.subject === S.id), c = LS.subjectContents ? LS.subjectContents(S.id) : { lessons: [] };
    return `<li class="at-subj-${S.id} at-wcard"><a href="#/subject/${S.id}"><canvas class="at-world at-world--card" data-world="${S.id}" aria-hidden="true"></canvas><span class="at-wcard__b">${LS.emblem(S.id)}<b>${T(S.name, S.ar)}</b><small>${esc(S.world || '')}</small><small class="at-muted">${[c.lessons.length ? c.lessons.length + ' ' + T(c.lessons.length === 1 ? 'lesson' : 'lessons', 'دروس') : '', xs.length ? xs.length + ' ' + T(xs.length === 1 ? 'experience' : 'experiences', 'تجارب') : ''].filter(Boolean).join(' · ') || T('Reading tools & Noor', 'أدوات القراءة ونور')}</small></span></a></li>`;
  }
  function explore(view, parts) {
    if (parts[0] === 'topics') return topics(view);
    view.innerHTML = `<div class="at-explore"><header class="ls-pagehead"><p class="ls-kicker">${T('Explore', 'استكشف')}</p><h1>${T('Eleven worlds to wander', 'أحد عشر عالماً للتجوال')}</h1><p class="ls-lead">${T('Each subject has its own atmosphere and its own kinds of experience — experiments in physics, evidence in history, conversation in languages. Pick one.', 'لكل مادة أجواؤها وتجاربها.')}</p></header>
      <ul class="at-worlds">${subj().map(worldCard).join('')}</ul></div>`;
    paintWorlds(view);
  }
  function paintWorlds(view) {
    const cs = view.querySelectorAll('canvas[data-world]'); if (!cs.length) return;
    LS.needWorlds().then(() => { if (view.isConnected && LS.worlds) cs.forEach(c => LS.worlds.mount(c, c.dataset.world, { still: c.classList.contains('at-world--card'), hero: c.classList.contains('at-world--hero') || c.classList.contains('at-world--portal') })); }).catch(() => { /* the cards still work without atmosphere */ });
  }
  LS.paintWorlds = paintWorlds;

  /* ---------- topics: every topic and its objectives, with their current state ---------- */
  function topics(view) {
    const E = LS.engine, by = {};
    LS.lessons.forEach(L => { (by[L.subject] = by[L.subject] || []).push(L); });
    view.innerHTML = `<div class="at-topics"><header class="ls-pagehead"><p class="ls-kicker">${T('Explore · Topics', 'استكشف · المواضيع')}</p><h1>${T('Every topic, and where you are with it', 'كل موضوع وأين أنت منه')}</h1><p class="ls-lead">${T('States come from your own answers and activity, and change as soon as you do something new. Open one to see the evidence.', 'الحالات من إجاباتك ونشاطك.')}</p></header>
      ${Object.entries(by).map(([sub, Ls]) => `<section class="at-sec"><h2 class="at-h2">${esc(sub)}</h2>${Ls.map(L => `<div class="at-topic"><h3><a href="#/lesson/${L.id}">${esc(L.topic)}</a> <small class="at-muted">· ${esc(L.title)}</small></h3><ul class="at-objs">${E.objectivesOf(L.id).map(s => objRow(s)).join('')}</ul></div>`).join('')}</section>`).join('')}</div>`;
  }
  function objRow(s) {
    const S = LS.engine.STATES[s.state];
    return `<li><details><summary><span class="at-state at-state--${s.state}"><i aria-hidden="true"></i>${T(S.label, S.label)}</span><span class="at-objs__t">${esc(s.obj.text)}</span></summary><div class="at-objs__why"><p class="at-muted">${esc(S.desc)}</p><ul>${s.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div></details><a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/learn/obj/${esc(s.key)}" aria-label="${s.state === 'not' ? T('Start', 'ابدأ') : s.state === 'demonstrated' ? T('Challenge me', 'تحدَّني') : T('Continue', 'تابع')}: ${esc(s.obj.text)}">${s.state === 'not' ? T('Start', 'ابدأ') : s.state === 'demonstrated' ? T('Challenge me', 'تحدَّني') : T('Continue', 'تابع')}</a></li>`;
  }
  LS.objRow = objRow;

  /* ---------- Discover: the curiosity portal, signature experiences, everything else by kind ---------- */
  const PORTAL = ['newton-lab', 'zoom', 'orbit-whatif', 'mystery-lungs', 'seasons', 'particles', 'cafe', 'city', 'heart-journey', 'circuit-break'];
  LS.portalPick = () => { const dayN = Math.floor(Date.now() / 864e5); return X.find(x => x.id === PORTAL[dayN % PORTAL.length]); };
  function discover(view) {
    const p = LS.portalPick(), seen = new Set((st.data().events || []).filter(e => e.t === 'experience').map(e => e.id));
    const group = {}; X.forEach(x => { (group[x.kind] = group[x.kind] || []).push(x); });
    view.innerHTML = `<div class="at-discover"><header class="ls-pagehead"><p class="ls-kicker">${T('Explore · Discover', 'استكشف · اكتشف')}</p><h1>${T('Follow a question', 'اتبع سؤالاً')}</h1></header>
      ${portal(p, true)}
      <section class="at-sec"><div class="at-sec__head"><h2 class="at-h2">${T('All experiences', 'كل التجارب')}</h2><a href="#/mylibrary/archive">${T('Discovery archive', 'أرشيف الاكتشافات')} →</a></div>
        <ul class="at-xlist">${X.map(x => xItem(x, seen.has(x.id))).join('')}</ul></section></div>`;
  }
  function xItem(x, seen) {
    const S = subj().find(s => s.id === x.subject) || {};
    return `<li class="at-subj-${x.subject}"><a href="#/exp/${x.id}"><span class="at-xlist__k">${T(KINDS[x.kind], KINDS[x.kind])} · ${T(S.name || '', S.ar || '')}</span><b>${esc(x.title)}</b><span class="at-xlist__h">${esc(x.hook)}</span><small class="at-muted">${x.mins} min${seen ? ' · ' + T('explored', 'استُكشف') : ''}</small></a></li>`;
  }
  LS.xItem = xItem;
  function portal(x, big) {
    return `<section class="at-portal at-subj-${x.subject} ${big ? 'at-portal--big' : ''}" aria-labelledby="atPortalH"><canvas class="at-world at-world--portal" data-world="${x.subject}" aria-hidden="true"></canvas><div class="at-portal__b"><p class="at-k">${T('Curiosity portal', 'بوابة الفضول')} · ${T(KINDS[x.kind], KINDS[x.kind])}</p><h2 id="atPortalH" class="at-portal__q">${esc(x.hook)}</h2><p><a class="ls-btn ls-btn--accent" href="#/exp/${x.id}">${T('Step through', 'ادخل')} →</a> <span class="at-muted">${esc(x.title)} · ${x.mins} min</span></p></div></section>`;
  }
  LS.portalHTML = portal;

  /* ---------- an experience page: frame here, the experience itself is lazy ---------- */
  function exp(view, parts) {
    const x = X.find(e => e.id === parts[0]);
    if (!x) { view.innerHTML = `<section class="ls-empty"><h1>${T('Experience not found', 'التجربة غير موجودة')}</h1><a class="ls-btn" href="#/discover">${T('All experiences', 'كل التجارب')}</a></section>`; return; }
    view.innerHTML = `<p class="ls-loading" role="status"><span class="ls-spin" aria-hidden="true"></span>${T('Opening the experience…', 'أفتح التجربة…')}</p>`;
    LS.needExp().then(() => { if (view.isConnected && LS.current()[0] === 'exp' && LS.current()[1] === x.id) LS.exp.mount(view, x); })
      .catch(e => { view.innerHTML = `<section class="ls-empty"><h1>${T('This experience could not load', 'تعذر تحميل التجربة')}</h1><p>${esc(e.message)}</p><button type="button" class="ls-btn" onclick="LS.render()">${T('Try again', 'حاول مجدداً')}</button></section>`; });
  }

  LS.route('explore', explore);
  LS.route('discover', discover);
  LS.route('exp', exp);
})();
