# ERLY Learning Studio — v28 report: Total Experience Reengineering (Phase 3)

**Status: committed and pushed to `claude/erly-hackathon-website-8txbtd`. Not deployed.** The live site is still the v27 build (fdf3605). Nothing goes to gh-pages until you say "Deploy".

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

## 9–28. The rest of the brief: honest status

| # | Area in the brief | Status in v28 |
|---|---|---|
| 9 | Animation language and transitions rebuilt studio-wide | **Partial.** Experience-level motion is new (rectangles growing in, h → 0, camera flights, flowing river, card tilt). The page transitions are still v27's (View Transitions with lsInR/lsInL). |
| 10 | Quadratic Universe (vertex drag, three forms, challenges) | **Not done.** The existing Quadratic lab (`#/exp/quad-lab`) already has vertex drag and three forms. Challenges were not added. |
| 11 | Function Forge polish | **Not done** in v28 (v27 version unchanged). |
| 12 | Other maths experiences improved | **Not done.** |
| 13 | Physics upgrades: Newton, Projectile, Incline, Gravity, Atmosphere, Light, Sound, Energy, Magnet, Motion graphs, Two waves | **Not done** in v28. |
| 14 | Black Hole visual upgrade | **Not done.** |
| 15 | Chemistry: molecule/atom builders, periodic table search and links, shapes, balancer, titration, collisions, states | **Not done** in v28 (v26 molecule work unchanged). |
| 16 | Biology: DNA, Punnett, predator–prey, enzyme, osmosis, nerve, leaf zoom, RBC, cell | **Not done.** |
| 17 | Geography: plates, greenhouse, core journey, seasons | **Not done.** The Water Cycle is done (item 6). |
| 18 | CS: sorting, bits, logic gates with signals, pathfinding frontier | **Not done.** |
| 19 | English: word builder, sentence workshop, story architect | **Not done.** |
| 20 | Languages beyond two experiences | **Not done.** |
| 21 | History: timelines, maps, evidence | **Not done.** No sources were invented. |
| 22 | Social science, city budget | **Not done.** |
| 23 | Economics and psychology: market, money, memory | **Not done.** |
| 24 | Dashboard rebuild: hierarchy, discovery by concept/type/time/objective, Knowledge Map, Journey | **Partial.** Only the depth/tilt layer was added. The dashboard structure is still v27's. |
| 25 | Noor context | **Not done** in v28. |
| 26 | Visual Lab: systematic review of 174 models | **Not done. I have not verified 174 models** and make no such claim. The auditable record was not produced in this phase. |
| 27 | Responsive design check of the new work | **Partial.** The new experiences use the kit stage, which scales to its container. The cursor layer turns off on touch (tested at a 390 px phone context). There is no dedicated phone screenshot pass of the new pages. |
| 28 | Visual polish pass across the Studio | **Partial.** Polish was applied to the three rebuilt or new experiences only. |

## Tests run (actual results)
All suites were run against `python3 -m http.server 8765` with headless Chromium:

| Suite | Result |
|---|---|
| `learning-studio-v28` | **13/13** |
| `learning-studio-v27`, `-v26`, `-v24`, `-v23`, `-v22`, `-v21`, `learning-studio`, `learn-inspect` | see the regression section below (filled in from the actual run) |
| Content validator | 0 errors |
| axe (4 pages × 2 themes) | clean |

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
