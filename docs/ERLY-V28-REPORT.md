# ERLY Learning Studio — v28 report: Total Experience Reengineering (Phase 3)

**Status: committed and pushed to `claude/erly-hackathon-website-8txbtd`. Not deployed** — the live site updates when you say “Deploy”. The live site is still the v27 build (fdf3605). Nothing goes to gh-pages until you say "Deploy".

This report covers what Phase 3 actually delivered. It does not cover what the brief asked for. The brief (Parts 1–29) is far larger than one working session. I worked in the priority order the brief set out:

1. Foundation.
2. The flagship maths experiences.
3. The Water Cycle rebuild.
4. Everything else.

Items 1–8 below are built and tested. Items 9–28 are listed with an honest status. Most of them are **not done** in this phase, and they are named as such.

Screenshots: `docs/v28-shots/` (`water-cycle-before-v27.png`, `water-cycle.png`, `derivative-lab.png`, `integral-lab.png`).

---

## 1. Audit and inventory
- **Internal inventory:** the experience registry (`LS.experiences`) is the inventory. The v27 Back-navigation test walks every entry, including the two new ones.
- **Validator:** `tools/validate-content.js` was re-run over all content: **0 errors**, 2 items checked by hand (unchanged since v27). Report: `docs/ERLY-CONTENT-VALIDATION.md`.
- **Static guide:** `learn-guide/` was rebuilt, so the two new explorers and the rebuilt Water Cycle controls appear in the read-only guide.
- **Not done:** a fresh full page-by-page audit of every route. This phase relied on the v26/v27 audits plus the regression suites below.

## 2. Accuracy audit: the two slider cases you named
Both cases were traced in the source:

| Activity | Prompt | The slider sets | The grader computes | Target | Correct answer |
|---|---|---|---|---|---|
| `q-slider` (`ls-lessons-math-phys.js:33`) | y = x² + 4x + c just touches the x-axis | c | Δ = 16 − 4c | 0 | **c = 4** |
| `lf-c2` (`ls-lessons-v22.js:31`) | y = 2x + c passes through (1, 5) | c | y(1) = 2 + c | 5 | **c = 3** |

- **What caused it:** the earlier guide printed the *target of the computed quantity* (0 or 5) as if it were the answer. Since v26 the answer shown is derived from the grader rule, and the guide now shows "c = 4" and "c = 3".
- **New v28 test:** it loads both activities from the real lesson data and calls the real grader:
  - c = 4 is right and c = 0 is wrong;
  - c = 3 is right and c = 5 is wrong;
  - the answer text the inspection directory shows contains "c = 4" and "c = 3".

  It passes.

## 3. Cursor response system (`assets/js/learn/ls-depth.js`, CSS in `learn-v26.css`)
- **One passive listener:** a single `pointermove` listener for the whole Studio, coalesced to one write per animation frame. It never calls `preventDefault`, never captures the pointer, and never touches canvases, sliders or text fields.
- **Ambient and depth layers:**
  - `--cx`/`--cy` on `<html>` let the dashboard orrery and the subject-world canvases drift up to 12 px against the cursor, eased over 0.9 s;
  - only `transform` changes, with no layout or paint of the content.
- **Object layer:** only the card under the pointer (dashboard cards, tiles, Studio cards, portals) gets `.ls-tilt`. It tilts up to 3.5° towards the cursor and resets when the pointer leaves.
- **Touch and accessibility:**
  - active only for `(hover: hover) and (pointer: fine)` with a mouse pointer;
  - off for touch, for `prefers-reduced-motion`, and for the Studio's Still setting (watched live).
- **Direct manipulation:** this lives inside the experiences (drag P/Q, drag bounds, drag to pan the camera). It was already in the kit and is extended here.
- **Tested:**
  - a mouse sets `--cx`;
  - exactly one card tilts, and its `--tx` follows the pointer (0.6 expected, ±0.15);
  - leaving resets it;
  - a touch phone context and a reduced-motion context both leave it off.

## 4. Differentiation Explorer (`#/exp/derivative-lab`, `ls-x-v28-calc.js`)
- **What it shows:**
  - the curve is coloured **green where increasing and red where decreasing**, using the sign of f′;
  - stationary points (gold) come from bisection on sign changes of f′;
  - **P** (x = a) and **Q** (x = a + h) are draggable on the curve;
  - the secant (blue) and tangent (violet, dashed) are drawn together;
  - a Δx/Δy triangle carries live values.
- **Let h → 0:** animates h exponentially down to 0.001. The secant visibly rotates into the tangent, and the **h → 0 table** fills row by row with (f(a+h) − f(a))/h and its difference from f′(a) for h = 1, 0.5, 0.1, 0.01, 0.001.
- **First principles card:**
  - shows the limit definition;
  - for x² and x³ − 3x it shows the simplified quotient (**2a + h**, **3a² − 3 + 3ah + h²**) with live values and its h → 0 value;
  - for sin, eˣ and 1/x it says honestly that the algebra needs known limits and points to the numeric table.
- **Linked f′ panel:**
  - f′ is plotted with positive and negative regions shaded;
  - P is draggable there too;
  - **Sweep P** with **Build f′ as P moves** draws f′ progressively as the tangent rides the curve.
- **Functions:**
  - built-in: x², x³ − 3x, sin x, eˣ and 1/x, each with an exact derivative;
  - you can also type any function through the kit's safe expression parser (no `eval`), and its derivative comes from a central difference.
- **Challenges, checked from live numbers:**
  - a horizontal tangent on x³ − 3x;
  - the point where the gradient of x² is 3;
  - secant = tangent within 0.01;
  - the steepest fall of sin x.
- **Keyboard:** ←/→ move P and ↑/↓ shrink or grow h. Both canvases have live aria-labels with the numbers.
- **Tests, all independent recalculations:**
  - secant slopes, positive and negative h;
  - exact derivatives;
  - the typed-function derivative (x³/3 − x)′(2) = 3 to within 10⁻⁶;
  - stationary points of x³ − 3x = ±1;
  - **real mouse drags** of P (to x ≈ 1.5) and Q (to h ≈ 0.6) with no text selected;
  - the h → 0 animation in the real page reaching 0.001 with all five table rows, and a secant slope of 2.001;
  - all four challenges, plus a negative case (a = 1.2 does not pass "gradient 3").

## 5. Integration Explorer (`#/exp/integral-lab`, `ls-x-v28-calc.js`)
- **Area and Riemann sums:**
  - the bounds **a** and **b** are draggable handles;
  - **signed area** shading is blue above the axis and red below;
  - Riemann **Left / Right / Midpoint / Trapezium** with n = 1–200;
  - rectangles **grow in one after another** whenever n or the method changes.
- **Refine n → ∞:** doubles n from 1 to 128 and logs the sum, the error and the **error ratio**. This makes it visible that left/right errors halve and midpoint/trapezium errors quarter.
- **Accumulation function:** A(x) = ∫ₐˣ f is plotted below, with the point (b, A(b)) and a dashed **tangent whose slope is f(b)**. The FTC card shows the *measured* slope of A at b next to f(b).
- **Exact values:**
  - from antiderivatives for x², sin x, 2 − x and x³ − 4x;
  - composite Simpson (4000 strips) for a typed function;
  - total (unsigned) area ∫|f| is shown alongside.
- **Challenges, checked from live numbers:**
  - area 9 under x²;
  - zero signed area under sin x;
  - error < 0.1 with the fewest left rectangles;
  - the peak of A(x) for 2 − x.
- **Tests:**
  - ∫₀³x² = 9; left n = 6 gives 6.875;
  - midpoint, trapezium and right sums against an independent implementation;
  - ∫₀^π sin = 2, ∫₀^{2π} sin = 0 with total area 4;
  - x³ − 4x on [−2, 2]: signed area 0, total area 8;
  - typed x(4 − x)/2 on [0, 2] = 8/3;
  - refine log reaches n = 128 with ratio ≈ 2;
  - midpoint ratio 4;
  - FTC: measured slope of A = f(3) = 9;
  - a **real mouse drag** of b from 3 to 2 gives 2.66667;
  - all four challenges;
  - the "fewest rectangles" count matches an independent search.

## 6. Water Cycle: complete visual reconstruction (`ls-x-v28-earth.js`)
The conserved model is unchanged: the same nine stocks and fluxes, with a total of exactly 1134. The v27 tests still pass against it. Everything visible is new.

- **Landscape with depth:**
  - a sky graded by temperature and sunshine;
  - a sun with a glow and rays;
  - **two distant ranges** in atmospheric perspective, each on its own parallax layer;
  - a ridged mountain lit by **Lambert shading from the sun's direction**, fading toward the base;
  - rocky texture at altitude;
  - a beach;
  - a translucent sea over a visible seabed, with moving glints and shore foam;
  - a forest of **varied conifers and broadleaf trees**, with leaf highlights, shadows and roots in the cut-away.
- **Underground:** a cut-away of topsoil, subsoil and a gravel **aquifer**. The **water table** rises and falls with the groundwater store, and the topsoil darkens with soil moisture.
- **Snow:** the snow cap is measured down from the summit, has a soft lit/shadowed surface and gullies, and grows and melts with the snow store.
- **Clouds:** soft pre-rendered cloud sprites that **darken from the base** as they hold more water, with **rain shafts** beneath wet clouds slanted by the wind.
- **River:** it **widens with its store** and visibly **flows**, with highlights moving at a speed set by the river flux. Meltwater and runoff streams feed it.
- **Continuous water travel:**
  - particles for evaporation, transpiration, rain, snow, infiltration (sinking to the water table), runoff (sliding to the river) and groundwater flow (toward the river);
  - **Follow a droplet** moves along flux-weighted routes, and the camera follows it when zoomed in.
- **Process highlighting:**
  - choose evaporation, condensation, precipitation, transpiration, infiltration, runoff or groundwater;
  - everything else dims, the camera **flies to where it happens**, the flow arrow animates, and the explanation card shows the live flux.
- **Labels:** flow arrows whose **thickness follows the model flux** (relative to the settled defaults), each with a label pill naming the process and its value. They can be turned off.
- **Camera:**
  - **views:** whole scene, ocean, sky, mountain, forest and river, underground;
  - + / − zoom (1–3×);
  - **drag to pan** when zoomed;
  - keyboard: + / − / arrows / 0;
  - a click still selects a part of the scene;
  - a gentle **cursor parallax** on the distant layers (mouse only, off for reduced motion).
- **Performance:** the static layers (land, forest, sky and sun, distant ranges, cloud sprites) are drawn once to off-screen canvases at a resolution matched to the real canvas. A frame is a few image draws plus particles.
  - **Measured:** 0.60–0.62 ms to draw a frame at ~50 particles. Headless Chromium ran at 51–55 frames/s, limited by headless timing, not by drawing.
  - Before the optimisation the same measurement was 16.3 ms, which the test caught and failed.
- **Tests:**
  - conservation at 15 °C and 30 °C;
  - warming raises evaporation;
  - paving makes runoff larger than infiltration;
  - process highlighting changes the view;
  - zoom plus **real drag pans**;
  - a real click on the ocean shows the ocean explanation;
  - particles of five kinds are present;
  - paving widens the river;
  - draw cost under 8 ms;
  - the canvas is painted.

## 7. Back navigation
- **Kept:** v27 universal Back is unchanged.
- **Covered automatically:** the v27 test walks **every** experience, now including the two new ones. It checks the breadcrumb, the accessible name, and that Back returns to the page the experience was opened from.
- **New v28 test:** the new explorers show their titles in the Back bar.

## 8. Engineering
- **Hooks:** `LS.exp.live` exposes the mounted model's API for tests and the inspection directory. Test-only `_set`, `_view` and `_perfReset` hooks follow the existing `_sim` pattern.
- **Accessibility:**
  - every new canvas has a live `aria-label` with its numbers;
  - the text inputs are labelled, and parse errors appear in a `role="status"` line;
  - axe (WCAG 2.1 A/AA) is **clean** on the Differentiation Explorer, the Integration Explorer, the Water Cycle and the dashboard, in both light and dark themes.
- **Version bumps:**
  - `ls-explore.js?v=28`
  - `ls-exp.js?v=28`
  - `ls-x-v27.js?v=28`
  - `ls-x-v28-*.js`
  - `learn-v26.css?v=28`
  - `ls-depth.js?v=28`

---

## 9–28. The rest of the brief — status after the second round (v28b)

After your follow-up ("do the rest properly as well"), a second round added the items below. Each one is tested in `tests/e2e/learning-studio-v28.e2e.js` against independent calculations, or against known-correct forms where there is nothing to calculate.

| # | Area | Status |
|---|---|---|
| 9 | Animation language | **Done for the rebuilt and new experiences:** rectangles grow in; h → 0; camera flights; a flowing river; signal pulses travelling through logic gates with propagation delay; frontier expansion in path finding; card tilt and depth. Page transitions are still v27's View Transitions. |
| 10 | Quadratic Universe | **Done as an upgrade** of `quad-lab`, which already had vertex drag and three forms. Four live-checked **challenges** were added: roots −1 and 3; touch at −2; maximum 5; vertex (2, 1) through (0, 5). |
| 11 | Function Forge polish | Unchanged since v27, which built it. |
| 12 | Other maths | The Differentiation and Integration explorers (above) are new. |
| 13 | Physics upgrades | **Partial.** Black hole: see item 14. Newton, Projectile, Incline, Gravity, Atmosphere, Light, Sound, Energy, Magnet, Motion graphs and Two waves are not changed in v28. |
| 14 | Black Hole visual upgrade | **Done.** A new **observer's camera**: exact shadow radius 3√3⁄2 r_s; photon ring; accretion disk from the ISCO (3 r_s) at an adjustable inclination; **Doppler beaming** δ⁴ with Keplerian speeds and gravitational redshift; the lensed over-the-top image (labelled approximate). There is also **gravitational time dilation** for the probe. Tested: no beaming face-on, the exact δ⁴ ratio edge-on, and √(1 − r_s/r). |
| 15 | Chemistry | **Partial.** The periodic table gains **search** (name, symbol or number; Enter selects) and **links to the atom and molecule builders** and the reaction lab. Titration, collision theory and particle states are unchanged. |
| 16 | Biology | **Partial.** New: **Dihybrid cross**, with a 4 × 4 gamete grid, 9:3:3:1 and the 1:1:1:1 test cross, random crops from a cryptographic RNG, and a **χ² test** (Mendel's 1866 counts give χ² = 0.47). DNA, predator–prey, enzyme, osmosis, nerve, leaf, RBC and cell are unchanged. |
| 17 | Geography | The Water Cycle is rebuilt (item 6). Plates, greenhouse, core and seasons are unchanged. |
| 18 | Computer science | **Path finder rebuilt:** BFS, **Dijkstra**, A* and **Greedy** on terrain with **step costs** (mud = 5); the **frontier** is shown separately from explored cells; **g-cost labels**; **step mode**. Tested against an independent Dijkstra. **Logic gates:** animated **signal propagation** with gate delays. Sorting and bits are unchanged. |
| 19 | English | New: **Story architect**. It offers three story shapes, a draggable tension curve and five structure checks, and never marks writing or stores it. |
| 20 | Languages | **Two new experiences, so four in total:** **Number words**, Spanish and French up to 9 999 999, rule-coloured, with a self-test; and **Telling the time**, with a draggable clock in Spanish and French. 29 spellings and 16 times are tested. |
| 21 | History | Unchanged. No sources were invented. |
| 22 | Social science | New: **Voting systems**, which counts one ballot profile by plurality, two-round runoff, instant runoff, Borda and Condorcet, with a head-to-head table. The example claims ("four different winners", "a cycle") were verified by computation. The city budget is unchanged. |
| 23 | Economics / psychology | Unchanged. |
| 24 | Dashboard discovery | **Added:** discovery **by time** (quick ≤ 6 min, 7–10, deep dive 11+), with Back restoring it; and **full-text concept search** across every experience's introduction and explanation (for example "evaporation" finds the Water Cycle). The depth layer is from round one. The Knowledge Map and Journey pages are unchanged. |
| 25 | Noor context | **Bug fixed.** Asking Noor from *any* experience sent a prompt about a model called "undefined" and dropped the live state. It now sends the experience's title and its live readings. Tested. |
| 26 | Visual Lab: 174 models | **An automated audit was run over every model** (`tools/audit-visual-lab.js`, results in `docs/ERLY-VISUAL-LAB-AUDIT.md`). See the section below for what it proves and what it does not. |
| 27 | Responsive | New pages use the kit stage, which scales to its container, and responsive grids. The story beats stack below 640 px. Cursor depth is off on touch (tested). No full phone screenshot pass was done. |
| 28 | Polish | Applied across everything built or rebuilt in v28. |

## Visual Lab audit (174 models): what was done

- **The tool:** `tools/audit-visual-lab.js` opens **every** Visual Lab model through the Studio (`#/lab/<id>`) in headless Chromium and records, per model:
  - whether it **built** (no error message, no page error);
  - whether it **painted** (canvas pixels, SVG or JSXGraph drawn);
  - whether it **explains itself with numbers**;
  - whether each **visible** control (up to six) changes what the student sees.

  Change is judged from a screenshot of the model area (so canvas, SVG, WebGL and HTML all count) plus the readouts. A model that animates by itself is **paused first**, so a control's effect can be seen. **Speed** controls are tested for what they do: simulated time per real second is measured at 1× and 4×. The output is `docs/ERLY-VISUAL-LAB-AUDIT.md` (a table per model) and `docs/bench/visual-lab-audit.json`.
- **Real defects found and fixed:**
  - Overlapping key-point labels where several features coincide (for example a root that is also a minimum and the y-intercept). These rendered as "(0(0(0(0)0)". They are now drawn once, labelled by the most informative feature, in `lab-math.js`, which the student portal also loads. The typed data the tests read is unchanged.
  - (In experiences) Noor received "undefined" instead of an experience's title and state, and the dihybrid chart was blank after a resize.
- **Harness false positives, corrected rather than hidden:**
  - Hidden controls: the Speed selector inside the Run group is hidden on static models, so students never see it.
  - WebGL canvases.
  - Self-animating models.
  - A slow first JSXGraph load: geometry now gets one fresh-page retry.
- **What it does not prove:** the audit is mechanical. It shows each model works and responds; it does **not** prove that its physics or maths is right. Numeric correctness is proven only where an independent test exists (the "Independent test" column, **42 of 174** models). The others have not had their numbers independently re-derived in this phase, and the report says so per model.
- **Remaining flags:** these are listed in the audit file for a human look. Examples are a toggle with nothing to show in the default state (the graphing calculator opens with no functions, so "show roots" marks nothing), and a playback control on a simulation that finishes quickly.

## Tests run (actual results, final run)
All suites ran against `python3 -m http.server 8765` in headless Chromium.

| Suite | Result |
|---|---|
| `learning-studio-v28` (new) | **21/21** |
| `learning-studio-v27` | 14/14 (81 experiences walked by Back navigation)¹ |
| `learning-studio-v26` | 14/14 (174 lab models opened, 172 drag-tested) |
| `learning-studio-v24` | 42/42, including the existing pathfinding and logic tests against the rebuilt versions |
| `learning-studio-v23` | 18/18 |
| `learning-studio-v22` | 22/22 |
| `learning-studio-v21` | 21/21 |
| `learning-studio` | 34/34 |
| `learn-inspect` | 14/14 (314 live routes; the guide matches) |
| `lab` | 34/34, no page errors |
| `problems` | 14/14 |
| `visual-chat` | 18/18 |
| `nav`, `a11y`, `studio-noor` | all checks passed |
| Content validator | 0 errors, 2 reviewed by hand |
| axe (WCAG 2.1 A/AA), every new or changed page × light/dark | clean, after fixing the periodic table's pre-existing grid roles and 47 contrast failures |
| Visual Lab audit | **164 / 174** models pass every automated check; 31 Speed controls verified to speed up the simulation; remaining flags reviewed (below) |

¹ The v27 filter assertion was narrowed to the kind and subject buttons, because the new time filter adds a third pressed button by design. Back still restores all three.

**The 10 remaining Visual Lab flags, each looked at:**
- **graph** "show roots": the model opens with no functions, so there is nothing to mark.
- **calculus** "normal line": works; confirmed by screenshot.
- **algebra**: a text model with no controls.
- **rigid** and **atwood** "Speed": the simulation finishes inside the measurement window.
- **unitcircle** "Rotate" and **chromatography** "Run the solvent": these act only while playing.
- **superpose** and **induction** "Graph": the graph changes when the model is used normally.
- **gears** "Compound": a **real issue**. With the default two gears it could change nothing. Now fixed: it switches to the classic 20-40 | 15-45 compound train (6:1, 20 rpm, 57.62 N·m, all checked).

## Files
- **New:**
  - `assets/js/learn/ls-x-v28-calc.js`
  - `assets/js/learn/ls-x-v28-earth.js`
  - `assets/js/learn/ls-depth.js`
  - `tests/e2e/learning-studio-v28.e2e.js`
  - `docs/ERLY-V28-REPORT.md`
  - `docs/v28-shots/*`
- **Changed:**
  - `ls-x-v27.js`: old water-cycle drawing removed; the text and model description are kept.
  - `ls-explore.js`: registry entries and loader.
  - `ls-exp.js`: `LS.exp.live`.
  - `learn-v26.css`
  - `learn.html`: versions and the depth script.
  - `learn-guide/*`: rebuilt.
  - `docs/ERLY-CONTENT-VALIDATION.md`: regenerated.
- **Out of scope and untouched:** the homepage, student portal, Growth Plan, Games and Handwriting.
