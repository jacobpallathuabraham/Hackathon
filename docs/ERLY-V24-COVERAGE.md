# ERLY v24 — Learning Studio coverage matrix

The Studio ships 11 subjects with 34 listed topics and 10 authored lessons. In v23 it had 17 interactive experiences. Below, every listed topic is mapped to the experiences that teach it.

- **Status:** ✓ existed before v24 · ★ new in v24.
- **Type** is one of: simulation · experiment · exploration · construction · visualization · investigation · practice.
- **Interacts:** what the student does. **Changes:** what that changes on screen.
- **Done when:** the completion signal. Unless it says otherwise, "observe" means the frame's **Observe & explain** step, which is computed from the model's state.
- **Test:** what the v24 end-to-end suite asserts about the experience.

## Physics (topics: Motion & forces · Energy · Waves & optics · Circuits & fields)

| Experience | Type | Student interacts with | What it changes | Concept | Done when | Test |
|---|---|---|---|---|---|---|
| ✓ Newton's laws lab | experiment | force, mass, surface, collisions | motion, force arrows, v–t graph, momentum log | F = ma, friction, momentum | mission log | physics vs hand calculation |
| ✓ Motion graphs lab | experiment | acceleration, start speed | car motion + s–t / v–t graphs | kinematics graphs | observe | opens, no errors |
| ✓ Orbit what-if | what-if | launch speed | orbit / escape | gravity & orbits | observe | opens |
| ✓ Circuit build & break | construction | series/parallel, break bulbs | currents, brightness | circuits | observe | opens |
| ✓ Two waves | experiment | frequency, phase | superposition | interference | observe | opens |
| ★ Projectile launcher | experiment | angle, speed, gravity world, air drag | trajectory, range, peak, flight time, ghost trails | projectile motion | compare ≥ 2 launches | range = v²sin2θ/g (no drag) |
| ★ Inclined plane lab | experiment | angle, friction μ, mass | force components, slide/stick, acceleration | resolving forces, friction | observe | slides iff tan θ > μs; a = g(sin θ − μk cos θ) |
| ★ Gravity explorer | exploration | two masses, distance (drag), planet | force arrows, F–r curve, weight on planets | Newton's law of gravitation | observe | doubling r quarters F |
| ★ Atmosphere explorer | exploration | altitude (drag/scroll) | layer, temperature, pressure, phenomena | layers of the atmosphere (ISA) | visit all layers | T at 11 km = −56.5 °C |
| ★ Light bender (optics) | experiment | ray angle, media; lens object position | refraction, total internal reflection, lens image | Snell's law, thin lens | observe | TIR beyond critical angle; 1/f = 1/u + 1/v |
| ★ Sound explorer | exploration | frequency, amplitude, optional tone | waveform + particle compressions | longitudinal waves, pitch, loudness | observe | wavelength = v/f |
| ★ Energy track | simulation | release height, friction | KE / PE / thermal bars, ball motion | conservation of energy | observe | total constant when friction 0 |
| ★ Magnet field lab | exploration | drag/flip two magnets | traced field lines, compass needles | magnetic fields | observe | opens, lines traced |
| ★ Black hole explorer | visualization | mass, distance | event horizon size, escape speed, light paths integrated exactly in the Schwarzschild metric (photon sphere, capture) | gravity, escape velocity | observe | r_s = 2.95 km × M/M☉ |

## Mathematics (topics: Functions & graphs · Calculus · Geometry & trigonometry · Probability & statistics)

| Experience | Type | Interacts | Changes | Concept | Test |
|---|---|---|---|---|---|
| ✓ Line builder | model | gradient, intercept | line | y = mx + c | opens |
| ★ Function playground | exploration | typed f(x), a/b/c sliders, pan/zoom, trace | live graph, trace values | functions & transformations | parser evaluates; graph redraws |
| ★ Quadratic lab | construction | drag vertex / roots, stretch | three forms, discriminant, roots | quadratics | roots from drag match the formula |
| ★ Unit circle | visualization | drag angle | sin/cos projections unwrapped into graphs | trigonometry | sin/cos values |
| ★ Transformation explorer | exploration | translate/reflect/rotate/enlarge | animated shape, matrix | geometric transformations | vertices after rotation |
| ★ Probability lab | experiment | roll N dice/coins | relative frequency, histogram vs theory | law of large numbers | totals are counted |
| ★ Statistics visualizer | exploration | drag data points | mean, median, range, SD, box plot | averages & spread | statistics computed correctly |
| ★ Fraction visualizer | visualization | numerators/denominators | bars, comparison, common-denominator sum | fractions | the sum is simplified |
| ★ Tangent explorer | visualization | point, h → 0 | secant → tangent, derivative graph | the derivative | slope of x² at 1 → 2 |
| ★ Vector playground | construction | drag two vectors | sum, difference, dot product, angle | vectors | dot product correct |

## Chemistry (topics: Atoms & periodic table · Bonding & shape · Acids & bases · Reactions)

| Experience | Type | Interacts | Changes | Concept | Test |
|---|---|---|---|---|---|
| ✓ Inside a substance | simulation | temperature | particle motion, state | states of matter | opens |
| ★ 3D molecule builder | construction | add/connect/remove atoms, bond order, rotate, zoom | 3D structure, formula, name match, valence check | bonding, molecular shape | build H₂O → named; valence enforced |
| ★ Atom builder | construction | protons, neutrons, electrons | element, mass number, charge, shells | atomic structure, ions, isotopes | 6p 6n 6e → carbon-12 |
| ★ Periodic table explorer | exploration | select element, colour by property | electron configuration, group/period, block | the periodic table | Fe configuration |
| ★ Equation balancer | practice | coefficient steppers | atom-count bars per side | conservation of atoms | detects balanced |
| ★ Titration curve | experiment | volume of base added | pH, indicator colour, curve | strong acid–base neutralisation | pH 7 at equivalence |
| ★ Collision theory | simulation | temperature, concentration, catalyst | collisions, successful reactions/s, energy distribution | reaction rate | rate rises with T |

## Biology (topics: Cells · Heart & circulation · Genetics & DNA · Photosynthesis)

| Experience | Type | Interacts | Changes | Concept | Test |
|---|---|---|---|---|---|
| ✓ Inside a plant cell · ✓ Heart journey · ✓ Universe zoom · ✓ Into the leaf (v23) | various | — | — | cells, circulation, scale, photosynthesis | existing |
| ★ DNA to protein | construction | edit DNA bases, mutate | mRNA, codons, amino-acid chain | transcription & translation | ATG… → Met… |
| ★ Punnett square | experiment | parent genotypes, 1–2 genes | grid, ratios, sampled offspring | inheritance | Aa × Aa → 3:1 |
| ★ Predator & prey | simulation | birth/death/predation rates | populations over time, phase plot, creatures | ecosystems, feedback | populations oscillate |
| ★ Enzyme lab | experiment | temperature, pH, enzyme | rate curve, collisions, denaturation | enzymes | optimum ≈ 37 °C |
| ★ Osmosis chamber | simulation | solute concentrations | net water movement, level change | diffusion & osmosis | water moves toward higher solute |
| ★ Nerve impulse | simulation | stimulus strength, myelin | action potential, speed of conduction | neurons, threshold | below threshold no spike |

## Geography & environment (topics: Energy & sustainability · Climate) — plus Earth science the brief asks for

| Experience | Type | Interacts | Changes | Concept | Test |
|---|---|---|---|---|---|
| ✓ Why seasons happen | simulation | — | — | axial tilt | existing |
| ★ Water cycle | system | sunshine, temperature, wind | evaporation, clouds, rain, river, store sizes | the water cycle | flows respond |
| ★ Plate boundaries | exploration | boundary type, play | animated cross-section and landforms | plate tectonics | three boundary types |
| ★ Greenhouse balance | what-if | CO₂ (model emissivity), albedo | energy arrows, model surface temperature | greenhouse effect (simplified) | warmer with more absorption |
| ★ Journey to the core | exploration | depth | layer, state, temperature range | Earth's structure | layer boundaries |

## History (topics: History of science · Evidence & sources · Timelines)

| Experience | Type | Interacts | Changes | Concept | Test |
|---|---|---|---|---|---|
| ✓ Timeline of blood · ✓ Mystery of the lungs | — | — | — | history of science | existing |
| ★ Source investigator | investigation | judge real sources on the Great Fire of London (1666) | provenance notes, reliability reasoning | evidence & sources | all sources judged |
| ★ Chain of consequences | construction | order the effects of the printing press | causal chain with explanations | cause & effect | correct order detected |
| ★ Deep time | visualization | zoom a log/linear timeline | where events fall; human history as a sliver | timelines & scale | event positions |

## Computer science (topics: Algorithms · Data · Programming ideas)

| Experience | Type | Interacts | Changes | Concept | Test |
|---|---|---|---|---|---|
| ★ Sorting race | visualization | algorithm, data shape, step/play | bars, comparisons, swaps | sorting algorithms | output sorted, counts |
| ★ Bit machine | construction | toggle bits | decimal, hex, character, overflow | binary & data | 01000001 → 65 → "A" |
| ★ Logic gates | construction | inputs, gate types | outputs, generated truth table | Boolean logic | XOR table |
| ★ Path finder | experiment | draw walls, choose BFS / A* | explored cells, shortest path | search algorithms | path length equal |

## English & study (topics: Reading with focus · Note-making · Writing clearly)

| Experience | Type | Interacts | Changes | Concept | Test |
|---|---|---|---|---|---|
| ✓ Sentence workshop | builder | — | — | sentence structure | existing |
| ★ Punctuation changes meaning | exploration | move/toggle punctuation | meaning panel | punctuation | variants switch |
| ★ Word builder | construction | prefix + root + suffix | word, meaning from parts | morphology | builds "unbelievable" |

## Languages (topics: Everyday conversation · Useful phrases)

| Experience | Type | Interacts | Changes | Concept | Test |
|---|---|---|---|---|---|
| ✓ Ordering at a French café | conversation | — | — | conversation | existing |
| ★ Verb conjugator | construction | language, verb, person | ending highlighted, sentence | regular verb conjugation (French/Spanish) | parler → nous parlons |

## Social science + Economics, psychology & more (topics: Cities & resources · Trade-offs · Markets · Memory & learning)

| Experience | Type | Interacts | Changes | Concept | Test |
|---|---|---|---|---|---|
| ✓ Run a city budget | simulation | — | — | trade-offs | existing |
| ★ Market maker | what-if | demand/supply shifters, price ceiling | curves, equilibrium, shortage | supply & demand | equilibrium solves |
| ★ Growing money | what-if | rate, years, compounding | simple vs compound | interest | A = P(1 + r)ⁿ |
| ★ Forgetting & spacing | what-if | review schedule | modelled recall curve (simplified) | spaced practice | reviews raise retention |

**Total:** 17 experiences before v24 plus 47 new ones in v24 = 64 interactive experiences across all 11 subjects. Every listed topic now has at least one interactive experience.
