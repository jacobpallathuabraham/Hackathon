# ERLY Learning Studio v26: bug hunt, interaction engine, new construction tools

This report covers one work session on the Learning Studio's code. Every claim below is backed by a test that was run, and section 14 lists the results.

The brief was far larger than one session can deliver. Section 15 lists, item by item, what was **not** done.

## 1. Audit findings

These came from running the real Studio in a browser, not from reading code alone.

- **Every experience (64 at the start) was opened in a real browser.** For each one I recorded console errors, whether the canvas painted, text selection on a drag, Reset, and animation loops left running after leaving.
  - No console errors.
  - No loops left running.
  - **20 of 64 experiences turned a drag across the model into a text selection.**
  - **Newton's laws lab was blank:** a large dark rectangle with nothing drawn in it.
- **All 174 Visual Lab models were opened.**
  - No page errors.
  - **8 selected text when dragged.**
  - `algebra` and `geometry` showed no canvas at first. On inspection, `geometry` loads its JSXGraph library for several seconds, and `algebra` renders only text and controls. Neither is broken.
- **Content:** the inspection guide printed answers that contradicted their explanations (section 12). Three pairs of question ids were reused by unrelated experiences.
- **Molecule builder:** genuinely free-form (add, bond, bond order, delete), but limited to 7 elements and one view. Lone pairs were a fixed number per element, so shapes were wrong for unusual bonding. Valid expanded-octet molecules such as PCl₅ and SF₆ were rejected.

## 2–3. Bugs found and fixed (root cause → fix)

| Bug | Root cause | Fix |
|---|---|---|
| **Newton lab blank** | Its template contained a `<canvas class="nl__cv">` that was never sized or drawn on (300×150 default, stretched by CSS into a dark box). The real canvas was appended next to it. Keyboard focus went to the dead canvas. | Lab rebuilt (section 5). A test asserts a sized canvas and no stray one. |
| **Drag selects text** (20 experiences, 8 lab models) | No component declared itself an interactive region. Several drag sources didn't call `preventDefault` on pointerdown: the kit's `K.drag`, the line builder's SVG, the 2D molecule fallback, the function playground's pan, and the path-finder's wall drawing. No `touch-action` on drag surfaces. Lost pointer capture not handled. | Each drag source fixed at its source: `preventDefault` + `touch-action:none` + `lostpointercapture`, and focus restored for keyboard-operable canvases. CSS boundaries (`learn-v26.css`) cover **model regions only** (`.at-x__stage`, `.lab__stage`, `.lab__canvas`, `.kx-stage`, controls). Lesson text, readings, explanations, notes and readouts stay selectable. Nothing is disabled globally. |
| **Guide showed wrong answers** | Its answer renderer guessed per type: slider questions printed the target *result* ("0") instead of the slider *setting* ("c = 4"). Compare, sort, label and fill questions showed nothing or raw objects. | Answers are now built from the grader's own rules (`LS.inspect.correct`). A test feeds every displayed answer back into `LS.grade.check` and requires "correct" for all of them. |
| **Question ids shared by unrelated experiences** (`x-pu*` Punnett/Punctuation, `x-so*` Sorting/Sources, `x-fr*` Café/Fractions) | Copy-paste ids. The learning record is keyed by question id, so attempts and mistakes from two experiences were merged. | Renamed to `x-pn*`, `x-src*` and `x-frac*`. The validator now rejects duplicate ids. |
| **Frame Play/Pause label could go stale** (found in my rebuild) | The lab's own Run button didn't notify the frame. | `syncRun` calls `c.onChange`. Tested. |
| **Collision energy drift of 0.9%** (found in my rebuild) | A stiff contact spring integrated at 1 ms steps. | 20 µs sub-steps only while the bumpers touch. The elastic case now conserves energy to two decimals. |
| **Molecule chemistry** | Lone pairs were fixed per element. There was no geometry for 5 or 6 electron domains. Expanded octets were rejected. | Lone pairs = (valence electrons − bonds) / 2. Allowed valences are P 3/5 and S 2/4/6, with an explanation when an expanded octet is used. 5- and 6-domain centres use mutual repulsion. Results: SF₆ 90°/180°, PCl₅ about 90°/120°/180°. |
| **My own new content** (caught by the validator) | x-cb2's explanation didn't end in its answer; x-sn ids collided. | Fixed before publishing. |
| **Equation balance tiles** (my own) | The "+n" overflow count was wrong: it showed 17 tiles for 20. | Tiles wrap onto two rows, and "+n" counts what wasn't drawn. |
| **Circuit board performance** (my own) | The whole SVG was rebuilt every frame. | Only the current-dot layer animates, and only while current flows. |

## 4. Mathematics

- **Equation Balance Studio (new):**
  - Type any linear equation; brackets, fractions and x/2 are supported.
  - Exact fraction arithmetic throughout.
  - A balance drawn with x-blocks and ±1 tiles.
  - Suggested next steps computed from the equation, plus your own operation with any number or x term.
  - A "left side only" mode shows the scale tipping and the solution changing.
  - A test-value slider checks both sides at any x.
  - A step log with reasons.
  - Dividing by 0 or by x, multiplying by 0, and non-linear input are refused with an explanation.
  - It detects no-solution and every-x equations.
- **Geometry Construction Studio (new):**
  - Tools: point, segment, line, circle, midpoint, perpendicular, parallel, intersection (line–line, line–circle, circle–circle), angle, polygon, delete (with dependants), undo and clear.
  - **Constructions keep their definitions while free points are dragged.** A dependency graph is recomputed on every move.
  - Live lengths, angles, circle measures, polygon area and perimeter, plus a distance table.
  - Four guided challenges: midpoint theorem, perpendicular bisector, angle in a semicircle, triangle angle sum.
  - Keyboard: N/P select a point, arrow keys move it.
- **3D Solids & Nets (new, three.js):**
  - Solids: cube, cuboid, triangular prism, square pyramid, cylinder and cone.
  - The fold slider folds the net about real hinges into the solid.
  - Live volume and surface area with their formulas.
  - For the polyhedra, the net's area is summed from the face polygons and shown equal to the surface area.
  - Euler's formula is checked for every polyhedron.
- **Not done:** see section 15.

## 5. Physics

- **Newton's laws lab (rebuilt):** one engine for four investigations:
  1. **Inertia:** a ticker-tape strobe shows constant velocity as evenly spaced dots.
  2. **F = ma:** saved runs logged with measured a beside F_net/m, and dashed ghost graphs for comparison.
  3. **Friction:** static friction matches the push up to μₛN, then kinetic friction μₖN takes over.
  4. **Interaction:** two carts with contact forces; paired forces drawn on *each* cart with "on A by B" labels; a momentum bar chart; adjustable restitution; a push-apart scene.

  Common to all four:
  - A free-body diagram inset and synchronised v/a graphs.
  - Run, Step 0.05 s, Push 1 s, Let go and Reset.
  - You can set the force by dragging the orange arrow, by slider, or with the ← → keys.
  - Verified against hand calculations: a = 5.00 at 20 N on 4 kg; holds at 19 N and slips at 20 N; kinetic friction 11.8 N; collision velocities 1.80/4.80 and −2.67/2.33; momentum and energy conserved.
- **Solar System explorer (new):**
  - NASA Planetary Fact Sheet data.
  - Positions for any date from J2000 mean elements, solving Kepler's equation.
  - Time control, including backwards.
  - Zoom: wheel, pinch or +/−. Pan. Select a planet by click or ←/→.
  - Comparison panel: distance now, radius, mass, surface gravity g = GM/R², rotation (retrograde marked), temperature and major moons.
  - A Kepler's-third-law table: P²/a³ is 0.998–1.000 for all eight planets.
  - **Three views, each stating exactly what is and isn't to scale:** distances to scale, compressed overview, sizes to scale.
  - It is 2D. Orbits are drawn flat, ignoring inclinations of 0–7°, and the screen says so.
- **Circuit builder (new):**
  - Place batteries, wires, resistors, bulbs, switches and ammeters on a grid.
  - Solved by modified nodal analysis on every change.
  - Bulbs glow with the real power they receive. Current dots move with the conventional current.
  - Open circuits and short circuits are detected.
  - Values are editable, switches toggle, and batteries can be turned round.
  - Verified: series 0.249 A, parallel 0.992 A total (0.496 A per branch), a switch-plus-resistor circuit 0.272 A, an open switch 0 A, and a built-from-scratch 6 V / 10 Ω loop 0.597 A.
- **Not done:** see section 15.

## 6. Chemistry

- **Molecule builder:**
  - 12 elements: H C N O F Cl S **B Si P Br I**.
  - Lone pairs computed from valence electrons.
  - Expanded octets for P and S, with an explanation.
  - 5- and 6-domain shapes, plus new shape names (seesaw, T-shaped, square planar…).
  - 22 more recognised names, for example PCl₅, SF₆, SO₂ and H₂SO₄.
  - **Ball-and-stick, space-filling and stick views.**
- **Not done:** see section 15.

## 7–9. Biology, Geography, other subjects

- **No experience in these subjects was rebuilt in this session.**
- **What they did get:**
  - the drag-selection fix (every experience was tested);
  - the content validation (their questions, references and ids);
  - two question-id fixes (Sources, Punctuation).
- **The Water Cycle rebuild you asked for was not done** (section 15).

## 10. Animation and visual effects

- **No studio-wide motion system or background work was done.**
- **Motion added within the new experiences:**
  - springs for the balance tilt and folding;
  - eased camera following in the Newton lab;
  - moving current dots;
  - orbital motion.

  All of them respect reduced motion.
- **No loops are left running:**
  - Newton's loop stops when you leave (tested after six open/close cycles).
  - The circuit animation runs only while current flows.

## 11. Interaction

Section 2 covers the drag fix, which is component-specific and leaves text selection in reading areas intact.

All new tools:
- use pointer events with capture;
- set `touch-action` on their drag surfaces;
- handle pinch zoom where they zoom (Solar System);
- support keyboard control (Newton canvas, geometry board, Solar System);
- provide text readouts for everything drawn.

## 12. Content accuracy

- **`tools/validate-content.js`** loads the real Studio read-only and checks **233 questions** (bank, lesson activities, revision, experience questions, with step-by-step sub-steps), **10 lessons** and **69 experiences**.
- **It computes rather than just checking fields exist:**
  - every arithmetic chain written in an explanation, worked example, hint, flashcard or summary;
  - algebraic equivalence of expansion answers;
  - graph questions: the plotted function against every option;
  - slider targets reachable within the slider's range;
  - numeric-option questions: the explanation's result must point at the marked option.
- **It also checks structure and references:** answer indices, duplicate options, duplicate ids, and references to lessons, experiences, lab models, videos, paths and objectives.
- **Result:** 0 errors. Two findings were reviewed by hand and are correct; both are recorded in `docs/ERLY-CONTENT-VALIDATION.md`.
- **Guide answers:** the inspection guide's displayed answers are now generated from the grader's rules and proven correct by the grader itself.

## 13. Files changed

- **New:**
  - `assets/js/learn/ls-x-v26-math.js` (Equation Balance, Geometry Construction)
  - `assets/js/learn/ls-x-v26-solids.js` (Solids & Nets)
  - `assets/js/learn/ls-x-v26-phys.js` (Solar System, Circuit builder)
  - `assets/css/learn-v26.css`
  - `tools/validate-content.js`
  - `docs/ERLY-CONTENT-VALIDATION.md`
  - `tests/e2e/learning-studio-v26.e2e.js`
  - this report
- **Rewritten:** `assets/js/learn/ls-exp-newton.js`
- **Edited:**
  - `assets/js/learn/ls-kit.js`: drag source and lost capture.
  - `ls-exp.js`: SVG drag; build context exposed earlier.
  - `ls-x-math.js`: pan drag; fraction ids.
  - `ls-x-chem.js`: elements, chemistry, views, drag.
  - `ls-x-mind.js`: path drag; punctuation ids.
  - `ls-x-earth.js`: source ids.
  - `ls-explore.js`: registry and loading.
  - `ls-inspect.js`: grader-based answers.
  - `learn.html`: stylesheet.
  - `learn-guide/*.html`: regenerated.
  - `tests/e2e/learning-studio-v23.e2e.js`: Newton checks ported to the rebuilt lab, with the same physics.

## 14. Tests

**Passed:**

| Suite | Result |
|---|---|
| `learning-studio-v26` | **14/14**. Newton (physics, drag, keys, 6× open/close with no loops left); **all 69 experiences: no text selection on drag**; **174 lab models opened with no errors, 172 drag-tested with no selection** (algebra and geometry are text/controls at the point tested); Equation Balance; Geometry theorems under dragging and building from scratch; Solids formulas, net areas and folding; Solar Kepler/g/Earth distance; circuits from presets and built with the mouse; molecule chemistry; validator with 0 errors; every guide answer correct by the grader |
| `learning-studio-v23` | **18/18**, Newton checks ported |
| `learning-studio-v24` | **42/42** |
| `learning-studio-v22` | **22/22** |
| `learning-studio-v21` | **21/21** |
| `learning-studio` | **34/34** |
| `learn-inspect` | **15/15** |
| `nav`, `a11y`, `studio-noor` | **all checks passed** |
| axe (WCAG 2.1 A/AA) | **clean** on the 7 new or rebuilt experiences, light and dark |

**Failed:** none at the end of the session. During the session, tests caught the bugs listed in section 2, and all were fixed.

**Not tested:**
- real touch and pen hardware (touch was exercised only with synthetic events);
- Edge (only Chromium was available);
- the full 36-suite regression was not re-run after these changes. Only the Learning Studio suites plus nav, a11y and studio-noor were run.

## 15. Remaining work (not done in this session)

- **Mathematics:**
  - function playground upgrades: intersections, value table, domain and range;
  - quadratic challenges;
  - a deeper trigonometry playground;
  - vector fields;
  - a probability lab with cards and spinners;
  - statistics with editable datasets;
  - algebra tiles;
  - sequences and fractals;
  - transformation matrices;
  - challenge missions;
  - a subject-specific "mathematical universe" environment and topic-reactive backgrounds.
- **Physics:**
  - upgrades to projectile, incline, gravity, waves, sound, optics, energy and magnetism;
  - black-hole accretion disk and lensing visuals;
  - a mechanics sandbox;
  - an N-body orbit sandbox;
  - an experiment designer with a lab notebook;
  - a 3D Solar System (the current one is 2D).
- **Chemistry:**
  - a link between the periodic table and the builder;
  - reaction lab, conservation explorer, reaction types;
  - a pH universe;
  - a bonding explorer (ionic and covalent);
  - charges and ions in the builder;
  - saving structures.
- **Biology, Geography, History, English, Languages, CS, Social science, Economics:** no rebuilds. **This includes the requested Water Cycle rebuild and Earth explorer.**
- **Studio-wide:**
  - motion system;
  - subject backgrounds;
  - knowledge map and discovery improvements;
  - deeper Noor integration;
  - lesson visual upgrades;
  - practice, flashcard and mistakes improvements.
- **Visual Lab:** a per-model accuracy audit of the 174 models. This session checked errors, rendering, slider response and drag behaviour only. The physics and maths of those models rely on their existing v16 tests.

**Deployment:** committed and pushed to `claude/erly-hackathon-website-8txbtd`. **Not deployed** to GitHub Pages, because that waits for an explicit "Deploy".
