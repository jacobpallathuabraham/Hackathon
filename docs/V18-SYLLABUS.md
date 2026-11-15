# ERLY v18 — syllabus coverage inventory (Noor visual models)

What a student gets in **normal Noor chat** when they ask about each chapter. "Model" means a computed, adjustable
visual (Noor Lab engine) that opens *inside the chat reply*, explains itself from its live numbers and accepts
follow-ups. Every model listed was opened from its chat question in a real browser
(`tests/e2e/syllabus-chat.e2e.js`) and checked against independently computed values (`tests/bench/`).

**Source of the chapter lists.** Unit titles follow the NTA *JEE (Main)* syllabus (Mathematics 14 units, Physics 20,
Chemistry 20) and the NMC *NEET (UG)* biology syllabus as published for the 2024–25 cycle. They were transcribed by
the developer, not machine-checked against the official PDFs from this environment (those sites were not reachable);
check them against the current bulletin before relying on them. JEE Advanced uses the same chapters with harder,
multi-concept problems; the multi-concept cases are covered by the problem engines (`lab-problems.js`).

Status key: **Model** = computed interactive model · **Partial** = some topics of the unit have a model ·
**Text** = Noor explains in words (and with a curated diagram where one exists), no computed model yet.

## JEE Main — Mathematics

| # | Unit | Models (engine id) | Status |
|---|---|---|---|
| 1 | Sets, relations and functions | transform, inverse, composite, venn, graph | Model |
| 2 | Complex numbers and quadratic equations | complex, quadratic | Model |
| 3 | Matrices and determinants | matrix, linsys | Model |
| 4 | Permutations and combinations | pnc | Model |
| 5 | Binomial theorem | binomthm | Model |
| 6 | Sequence and series | apgp | Model |
| 7 | Limit, continuity and differentiability | calculus (limits, derivatives, extrema), secant, optimise, mvt | Model |
| 8 | Integral calculus | calculus (integrals), area, revolution | Model |
| 9 | Differential equations | calculus (slope fields) | Model |
| 10 | Coordinate geometry | lines, circletan, conics, graph | Model |
| 11 | Three-dimensional geometry | lines3d, sphereplane, 3d | Model |
| 12 | Vector algebra | vectors | Model |
| 13 | Statistics and probability | stats (data, distributions, inference), bayes | Model |
| 14 | Trigonometry | unitcircle, trigfn, invtrig | Model |
| — | Linear programming (CBSE 12) | lpp | Model |

## JEE Main — Physics

| # | Unit | Models | Status |
|---|---|---|---|
| 1 | Units and measurements | vernier | Partial (no model for dimensional analysis or error propagation) |
| 2 | Kinematics | kin1d, projectile, riverboat | Model |
| 3 | Laws of motion | newton, incline, banking, atwood, problems (massive pulley) | Model |
| 4 | Work, energy and power | coaster, vcircle, collision | Model |
| 5 | Rotational motion | rigid, com | Model |
| 6 | Gravitation | orbit, gravfield | Model |
| 7 | Properties of solids and liquids | stressstrain, torricelli, venturi, stokes, capillary, cooling | Model |
| 8 | Thermodynamics | pvcycle | Model |
| 9 | Kinetic theory of gases | gas, mbdist | Model |
| 10 | Oscillations and waves | spring, pendulum, shm, resonance, waves, superpose | Model |
| 11 | Electrostatics | efield, charges, radial, capnet, dielectric | Model |
| 12 | Current electricity | circuit, netlist, transient | Model |
| 13 | Magnetic effects of current and magnetism | bfield, lorentz | Partial (no model for magnetic materials / hysteresis) |
| 14 | Electromagnetic induction and AC | induction, lcr, transient | Model |
| 15 | Electromagnetic waves | emwave | Model |
| 16 | Optics | optics (rays, lenses, mirrors, prisms), waves (interference, diffraction), malus | Model |
| 17 | Dual nature of matter and radiation | photoelectric, debroglie | Model |
| 18 | Atoms and nuclei | bohr, binding, decay | Model |
| 19 | Electronic devices | diode, logic | Partial (no transistor model) |
| 20 | Experimental skills | vernier | Partial (screw gauge, metre bridge and potentiometer experiments not modelled) |

## JEE Main — Chemistry

| # | Unit | Models | Status |
|---|---|---|---|
| 1 | Some basic concepts in chemistry | limiting | Model |
| 2 | Atomic structure | orbitals, bohr | Model |
| 3 | Chemical bonding and molecular structure | molecule (VSEPR 3D), motheory | Model |
| 4 | Chemical thermodynamics | gibbs, bornhaber | Model |
| 5 | Solutions | raoult, colligative | Model |
| 6 | Equilibrium | equilibrium, titration, ksp | Model |
| 7 | Redox reactions and electrochemistry | nernst, faraday, kohlrausch | Model |
| 8 | Chemical kinetics | kinetics, arrhenius, eprofile | Model |
| 9 | Classification of elements and periodicity | periodic | Model |
| 10 | p-Block elements | — | Text |
| 11 | d- and f-Block elements | cfse (colour and magnetism) | Partial |
| 12 | Coordination compounds | cfse | Model |
| 13 | Purification and characterisation of organic compounds | distil | Partial (chromatography not modelled) |
| 14 | Basic principles of organic chemistry | conform, mechanism | Model |
| 15 | Hydrocarbons | conform, molecule (benzene) | Partial |
| 16 | Organic compounds containing halogens | mechanism (SN1 / SN2) | Partial |
| 17 | Organic compounds containing oxygen | mechanism | Partial |
| 18 | Organic compounds containing nitrogen | — | Text |
| 19 | Biomolecules | enzyme, dna | Partial |
| 20 | Principles related to practical chemistry | titration | Partial |
| — | States of matter / solid state (CBSE, NEET) | vdw, gas, unitcell | Model |

## NEET (UG) — Biology

| Unit | Models | Status |
|---|---|---|
| Diversity in the living world | — | Text |
| Structural organisation in animals and plants | — | Text |
| Cell structure and function | celldiv, enzyme | Partial |
| Plant physiology | photorate, waterpot, photosynthesis scene | Model |
| Human physiology | heart scene, o2curve, actionpot | Partial (digestion, excretion, locomotion not modelled) |
| Reproduction | — | Text |
| Genetics and evolution | punnett (incl. X-linked), hardyweinberg, dna | Model |
| Biology and human welfare | sir | Partial |
| Biotechnology | — | Text |
| Ecology | popgrowth, predprey, pyramid | Model |

## Undergraduate and other disciplines (selection)

Mathematics: taylor, fourier, polar, parametric, newtonr, gradient (3D surfaces) · Physics: relativity, qmbox,
blackbody · Statistics: chisq, bayesupdate, stats · Economics/Commerce: market, elasticity, costcurves, monopoly, ppf,
keynes, lorenz, finance, breakeven · Engineering: beam, step2, bode, aliasing, heatrod, netlist, gears, fm ·
Computing: sorting, graphalgo · Medicine: heart, pkdose, sir, actionpot, o2curve · Environment: greenhouse.
Humanities, law, languages and arts are answered in words (with curated diagrams where they exist); they have no
computed models, which is reported as such on the coverage page.

## Totals (measured, v18)

- Models available: 42 engines from v16–v17 plus 113 syllabus models = 155.
- Curriculum registry (`assets/js/lab/curriculum.js`): 248 concepts in 22 disciplines.
- Normal chat: 113/113 syllabus questions open the right model inline; 15/15 factual questions get no forced visual
  (`docs/bench/syllabus-chat.json`).
- Benchmark: see `docs/bench/visual-bench-results.md` for the per-subject executed and accurate counts.
