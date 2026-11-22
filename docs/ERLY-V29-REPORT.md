# ERLY Learning Studio 2.0 — report

Scope: the Learning Studio (`learn.html` and `assets/js/learn/*`). The homepage, student portal, Growth Plan, Games and
Handwriting Studio were not changed. **Nothing has been deployed**: the work is on branch
`claude/erly-hackathon-website-8txbtd` and the live site still serves the earlier version (deployed at `fdf3605`)
until you say "Deploy".

This report covers both briefs: "Learning Studio 2.0 — complete immersive learning universe" and "Immersive 3D
learning lab — rotational motion, permutations & combinations, probability". Every number below was measured or counted
from the code in this commit. Section 10 lists what is still limited.

---

## 1. What I inspected

- **Every Studio route, in a real browser.** `learn-inspect.e2e.js` opens 317 distinct live routes. The earlier Visual
  Lab audit opened all 174 lab models and drag-tested 172; the other two are text and controls only.
- **All 84 experiences.** The content validator recomputes 282 questions across 10 lessons and 84 experiences.
- **Structure.** The home page with its category-pill filter rows, the subject/topic structure, the existing
  flashcards (student-made spaced-repetition cards only), and practice and mistakes.
- **The existing visuals and 3D.** The 2D Solar System experience, the ambient world backgrounds (`ls-worlds.js`) and
  the experience frame (`ls-exp.js`).
- **Reference platforms**, for patterns rather than content:
  - PhET: one idea per simulation, sliders with live readouts, predict-then-test;
  - GeoGebra and Desmos: direct manipulation, everything draggable;
  - spaced-repetition tools: card typing and teaching order.

## 2. What was wrong

- **No learning structure.** Subjects led straight to a flat list of experiences: no levels, courses or chapters, no
  prerequisites, no stated objectives and no mastery evidence.
- **The home page was a filter dashboard.** Kind and subject pill rows dominated it, so it worked as a search page,
  not a place to start learning.
- **Flashcards only covered cards students wrote themselves.** There were no authored, structured decks, no teaching
  order and no card types.
- **No chapter assessments.** Nothing explained misconceptions or reported results by objective.
- **No 3D.** Rotation, counting and probability were missing as hands-on labs.
- **Bugs found during this work, all fixed (see §4):**
  - the shared 3D loop could start duplicate animation loops;
  - flashcards whose text contained "|" were cut in half;
  - two new experiences reused existing question IDs;
  - colour-contrast failures;
  - an invalid CSS `font` shorthand;
  - the guided bar pushed the simulation below the fold.

## 3. What I redesigned

- **Hierarchy: Universe → World → Level → Course → Chapter → Concept → Experience → Practice → Mastery.**
  - `#/home` is the Learning Universe:
    - an animated hero with cursor parallax;
    - a live 3D solar system;
    - five primary actions;
    - the 11 subject worlds;
    - recommendations, discoveries and your recent knowledge.
  - `#/world/<subject>` has tabs (overview, chapters, experiences, practice, cards, checks) and a level filter.
  - `#/chapter/<id>` is a chapter blueprint:
    - why it matters, objectives, prerequisites, a concept map;
    - 11 steps from Orientation to Continue;
    - mastery evidence and the next chapter.
- **The home page has no pill rows.** The earlier filter dashboard (type, subject and time filters, concept search)
  is kept as the **Experience finder** (`#/finder`), linked from Subjects. The earlier home's storage choice,
  today's plan and momentum stay on the new home. The storage choice moves to the top until the student decides, so
  nothing is stored before consent.
- **Navigation:**
  - Primary places: Discover, Subjects, Learn, Practice, My Learning.
  - Subjects has Worlds, Learning path, Knowledge map, All experiences and Experience finder.
  - Practice has Practice, Flashcards, My cards and Mistakes.
  - Breadcrumbs and Back follow the hierarchy: assessment → chapter → world → Subjects.
- **Guided layer on every experience** (`ls-guide.js`):
  - **Discover** shows nothing until you change something, then a one-line insight.
  - **Guided** shows step cards that watch the live model, highlight the control to use, and advance only when the
    step is done.
  - **Independent** shows no prompts.
  - Also: What-if (save the original state and compare with now), full screen with an Escape fallback, and Noor
    context that includes the live experience.

## 4. What I implemented

| Area | Where | Notes |
|---|---|---|
| Shared 3D scene manager | `ls-3d.js` | Adaptive pixel ratio (cap 1.75); pauses when hidden or off-screen; idle scenes stop drawing; picking, drag-on-plane, camera flights, `bench()` |
| Rotation Lab | `ls-x-v29-rotation.js` | See §5 |
| Counting Studio | `ls-x-v29-counting.js` | See §5 |
| Probability Lab | `ls-x-v29-prob.js` | See §5 |
| Solar System Explorer | `ls-space.js`, `#/space` | Procedural planet textures, atmosphere shader, Saturn's rings with the Cassini division. Hover, select and fly; compare two planets; layers (orbits, labels, true size); NASA fact-sheet values; scale disclaimer; data table |
| Universe, worlds, chapters, path, constellation, curiosity | `ls-universe.js` | Ambient canvases animate on hover, at 30 fps, and stop under reduced motion |
| Curriculum | `ls-curriculum.js` | 50 chapters; self-validating (§6) |
| Flashcards and chapter checks | `ls-decks.js`, `ls-decks-data.js` | §7 |
| Guided layer | `ls-guide.js` | Attaches to every experience through `LS.exp.onMount` |
| Styles | `learn-v29.css` | Light and dark, phone layout, reduced motion |

Fixes made in this phase:

- **3D render loop.** A redraw requested during a frame (camera damping, a scene's own tick) started a second loop.
  Loops piled up and the home page could stall the browser. Now only one loop runs. Measured frame rates doubled to
  tripled (§8).
- **Flashcard parser.** It split on every "|", so cards such as "P(A | B)" lost half their text. Cards now use
  "∣" (U+2223) inside text, the parser only splits on the first two separators, and the curriculum validator rejects
  malformed cards.
- **Question IDs.** The Rotation and Probability labs reused `x-rl*` and `x-pb*` question IDs from the Reaction lab
  and the older probability experience, which would have mixed up stored answers. They are now `x-rot*` and `x-plb*`.
- **Layout.** The guided mode bar and Discover card pushed simulations about 140 px down. Discover now has no card
  until there is an insight, and the bar is compact.
- **CSS.** Three invalid `font: … inherit` shorthands were dropped by browsers; they are now written out as separate
  properties.
- **Contrast.** Accent fills, step numbers, card-type labels, `kbd` keys in buttons and the solar-system panel hint
  now pass in both themes.
- **Practice.** The Practice hub links to structured flashcards and chapter checks.

## 5. Simulation upgrades (3D labs brief)

**Rotation Lab** (`#/exp/rotation-lab`). Five modules:

- **Angular motion explorer:** θ, ω and α with live graphs.
- **Torque lab:** force, lever arm and angle; door-handle examples.
- **Moment of inertia, mass distribution (the flagship):**
  - drag four masses on a spinning platform (I₀ = 3.44 kg·m², L = 6.88 kg·m²/s);
  - L stays constant while I and ω change;
  - KE = L²/2I is shown;
  - target-ω challenge: ω = 4 rad/s is reachable at r ≈ 0.374 m.
- **Shape comparison:** ring, disc, sphere and others side by side.
- **Rolling race:** shapes race down a ramp with predict-first; the result is shown after the race and follows
  k = I/MR² (sphere 0.4, cylinder 0.5, shell 2/3, ring 1).
- Keyboard: keys 1–4 select a mass; ←/→ move it.
- Without WebGL, a 2D canvas fallback runs.

**Counting Studio** (`#/exp/counting-studio`):

- Podium (arrangements, nPr), team (selections, nCr), row, and a circular table you can rotate to see why
  (n−1)! seatings are distinct.
- Arrange vs Choose: swapping places is a new arrangement but the same team.
- An SVG counting tree with nPr leaves.
- Six restriction puzzles (answers 12, 12, 24, 72, 36, 60). Each answer is checked by listing every outcome, and an
  invalid seating names the broken rule.
- Formulas are built from what you did.

**Probability Lab** (`#/exp/probability-lab`):

- 3D coin, dice, spinner and urn. The 3D object always comes to rest showing the drawn outcome.
- Convergence graph with a 95% band.
- Probability tree with exact fractions.
- Conditional probability and Bayes.
- Venn diagram.
- Expected-value decision lab with three real scenarios (a festival stall, quality control, a game).

All three labs:

- **Predict first, then test.** Each has Discover, Guided and Independent modes, What-if prompts and real-world
  challenges.
- **Pure engines checked in tests:**
  - `LS.rot`, `LS.count` and `LS.prob` are verified in tests against independent formulas.
  - Counting formulas are verified by listing outcomes for n ≤ 6.
  - The binomial distribution sums to 1.
  - Bayes and expected value are checked numerically.

## 6. Curriculum

- **Size:** 50 chapters in 21 courses across 11 subjects.
  - By subject: maths 15, physics 11, biology 6, chemistry 5, computer science 3, geography 3, English 2,
    economics & psychology 2, history 1, languages 1, social science 1.
  - By level: Grade 11 26, Grade 12 13, undergraduate year 1 6, undergraduate year 2 3, master's 2.
- **This phase added six university and master's chapters,** each building on a school chapter and using existing
  experiences:
  - rigid-body dynamics;
  - black holes and gravitational time dilation;
  - discrete mathematics;
  - random processes and Monte Carlo;
  - graphs and shortest paths;
  - population genetics.
- **Each chapter has:** why it matters, objectives (IDs such as `m-pc:2`), key concepts, prerequisites, linked
  experiences and lab models, an optional lesson, estimated minutes, difficulty, and frameworks where it is "commonly
  taught" (CBSE, Cambridge A Level, IB, UAE MoE). The page says this is not official alignment.
- **`LS.curriculum.validate()` checks** every experience, lab model, lesson, prerequisite, framework, deck and
  assessment reference; prerequisite cycles; cross-subject links; and flashcard format. It reports **0 errors**
  (v29 test).

## 7. Flashcards and testing

- **Decks:** 235 authored cards for all 50 chapters. Card types: concept, definition, recall, formula, application,
  misconception, comparison, visual and reasoning (multi-step).
- **Study modes:** Learn (teaching order), Recall, Review (only cards that are due), Chapter mastery (80% or more),
  Application, and an optional Shuffle.
- **Interaction:** resume where you stopped; Space flips the card, 1–3 mark it, arrow keys move; swipe on touch.
- **Chapter checks:** 120 questions for all 50 chapters.
  - No answer is shown before you try.
  - A wrong option explains the misconception behind it.
  - Results are reported per learning objective, and mastery is recorded.
  - Every numeric answer (24 so far) is recomputed independently in the v29 test.

## 8. Performance (measured)

`tools/perf-studio.js` → `docs/bench/studio-perf.json`.

How it was measured: headless Chromium with software WebGL (SwiftShader), at 1360×900 and DPR 1. Each 3D page was
rendered continuously for 4 s.

**Caveat:** software rendering makes fps here far lower than on any device with a GPU. CPU time per frame is the
comparable number.

| Page | fps (software GL) | CPU per frame, mean / median / 95th pct | JS heap | Frame requests when idle (ambient background off) |
|---|---|---|---|---|
| Home (universe and solar system) | 18.7 | 0.62 / 0.40 / 3.0 ms | 17.5 MB | — |
| Solar System Explorer | 23.0 | 0.63 / 0.40 / 1.8 ms | 16.5 MB | — |
| Rotation Lab (spinning) | 11.2 | 0.91 / 0.60 / 3.2 ms | 14.4 MB | — (animating) |
| Counting Studio | 17.3 | 0.94 / 0.60 / 2.5 ms | 12.6 MB | 0 |
| Probability Lab | 23.3 | 0.73 / 0.50 / 2.1 ms | 12.5 MB | 0 |

- **The render-loop fix had a large effect.** Before it, the same probe gave the Rotation Lab 2.8 fps and the
  Counting Studio a 95th percentile of 29 ms per frame. On the home page, frames piled up until the browser stalled.
- **Idle 3D scenes request no frames.** The only idle animation is the subject's ambient background: about 50–90
  frame requests per 1.5 s, drawing at 30 fps. It stops when hidden, under reduced motion, or when switched off in
  Accessibility → Motion.

## 9. Testing

All tests below were run in this session against the final code.

| Suite | Result |
|---|---|
| `learning-studio-v29` (new: engines, labs, curriculum, decks, checks, guided layer, navigation, space) | 18/18 |
| `learning-studio` (base: consent, storage, notebook, keyboard) | 34/34 |
| `learning-studio-v21` | 21/21 |
| `learning-studio-v22` | see final run below |
| `learning-studio-v23` | 18/18 |
| `learning-studio-v24` | 42/42 |
| `learning-studio-v26` | see final run below |
| `learning-studio-v27` | 14/14 |
| `learning-studio-v28` | see final run below |
| `learn-inspect` (317 routes) | 14/14 |
| `lab` (Visual Lab) | 34/34, no page errors |
| `problems` | 14/14 |
| `visual-chat` | 18/18 |
| `nav`, `a11y` (control centre), `studio-noor` | all checks passed |
| Content validator | 282 questions, 0 errors, 2 reviewed by hand |
| axe (WCAG 2.1 A/AA), light and dark | 16 new pages × 2 themes: 0 violations after the fixes in §4 |

**Older tests changed** because the design changed on purpose. No test was skipped or loosened beyond that change:

- v24, v27 and v28 dashboard tests now open `#/finder`, where that dashboard lives.
- v24's world-cards test now checks `.uv-world`.
- v27's deep-link Back now expects `#/world/geography` (breadcrumbs now go to the world, not the old subject page).
- v22's navigation test now expects "My cards", the new name for the student's own spaced-repetition page.
- v24's phone-overflow test now also covers the ten new pages.

## 10. Remaining work and honest limits

- **Curriculum depth.** 50 chapters is a real structure, not complete syllabus coverage. History, languages and
  social science have one chapter each, and university/master's coverage is 11 chapters. Adding chapters needs new
  decks and checks, which the validator enforces.
- **Existing experiences.** Older experiences were not individually rebuilt. They gained the guided layer, What-if,
  full screen, chapter placement and Noor context automatically, but their own visuals are as they were. The Visual
  Lab audit shows 164/174 models clean, and the earlier report lists the rest.
- **Performance on real devices was not measured** — only headless software GL (§8). A pass on a mid-range phone is
  still needed.
- **Visual QA** was done by screenshot in light, dark and reduced motion, and by checking phone width for overflow.
  It was not tested with a screen reader or on a physical touch device.
- **Content review.** Cards and questions were checked by recomputation, but no subject-matter teacher has reviewed
  them.

## 11. Files changed (this phase)

- **New:**
  - JavaScript: `assets/js/learn/ls-3d.js`, `ls-x-v29-rotation.js`, `ls-x-v29-counting.js`, `ls-x-v29-prob.js`,
    `ls-space.js`, `ls-curriculum.js`, `ls-decks.js`, `ls-decks-data.js`, `ls-universe.js`, `ls-guide.js`
  - Styles: `assets/css/learn-v29.css`
  - Tests and tools: `tests/e2e/learning-studio-v29.e2e.js`, `tools/perf-studio.js`
  - Docs: `docs/bench/studio-perf.json`, `docs/ERLY-V29-REPORT.md`
- **Modified:**
  - Studio JavaScript: `ls-core.js` (`LS.routeFn`), `ls-exp.js` (`onMount` hook, Noor context), `ls-explore.js`
    (three new experiences, loader), `ls-nav.js` (breadcrumbs), `ls-shell.js` (navigation labels and finder),
    `ls-practice.js` (links)
  - Page: `learn.html` (scripts and cache versions)
  - Generated: `learn-guide/*` (regenerated), `docs/ERLY-CONTENT-VALIDATION.md`
  - Tests (§9): `tests/e2e/learning-studio-v22/v24/v27/v28.e2e.js`

## 12. Deployment

**Not deployed.** The branch is pushed and the live site is unchanged. To publish, say "Deploy" and I will run the
same gh-pages process used for `fdf3605`.

No API keys or secrets are in the front-end or the commits. Progress is stored only after the student chooses "Save
on this device". There is no tracking and nothing is inferred about emotions.
