# ERLY Learning Studio, Phase 2 (v27): navigation, new experiences, verification

I continued from the Phase 1 commit (83bfff1). No Phase 1 feature was removed or replaced, except the v24 Water Cycle, which you asked to be rebuilt. **Every claim here is backed by a test that was run (section 6). Section 8 lists what was not done.**

## 1. Implemented

### Universal Back navigation (`assets/js/learn/ls-nav.js`, styles in `learn-v26.css`)

**The Back bar:**
- One sticky bar below the Studio header on every page except Home. It covers experiences, Visual Lab models, lessons, topic pages, readings, videos, Discover, Practice and the Workspace pages.
- Contents: a pill-shaped **Back** button with an arrow, plus a breadcrumb trail (Studio › Explore › Physics › Newton's laws lab, Studio › Visual Lab › model, Studio › Lessons › topic › lesson, and so on).
- Every crumb except the current page is a link.
- Its accessible name says where it goes, for example "Back to Discover".
- On phones it shrinks to the arrow, with a touch target of at least 36 px.
- In focus (fullscreen) mode it stays at the top of the screen.

**History:**
- Every history entry the Studio creates is numbered in `history.state`. So whether the move came from the Back button, the browser's Back or Forward, a link or a refresh, the Studio knows if it went back, forward or somewhere new.
- **Back** uses `history.back()` when there is an earlier Studio page in the tab, so the browser's history and the Studio's stay identical.
- When a page was opened directly (a deep link, or a refresh with no history), Back goes to the page's **logical parent** and *replaces* the entry, so it can never loop:
  - an experience goes to its subject world;
  - a lab model goes to the Visual Lab;
  - a lesson goes to the lesson list.
- **Alt + ←** does the same.
- Clicks during a navigation are ignored, so there's no double navigation.

**What survives coming back:**
- the scroll position, re-applied as lazily loaded content grows;
- view filters and search boxes, such as the dashboard's kind and subject chips;
- **keyboard focus** returns to the link you used to leave.

**Motion:**
- Going forward slides the new page in from the right; going back, from the left. It's mirrored in Arabic.
- Only the page content moves, through the Studio's existing View Transition; the header stays still. There's a CSS fallback where View Transitions are unavailable.
- Reduced motion, or the Studio's "still" setting, means no movement.

### New experiences

All new experiences have the full learning frame (hook, predict, explore, observe, explain, apply, summary, connect). Each is in the registry, the Discover page, the search, the content directory and the plain-HTML guide.

- **Function forge (maths):**
  - Up to four typed functions, with parameters a–d on sliders.
  - The graph pans by drag, zooms by wheel, pinch or buttons, and can be moved with the keyboard. Moving across it traces values.
  - Live key features from numerical analysis on the visible window:
    - roots (bisection on sign changes, plus touching roots);
    - y-intercept;
    - maxima and minima (sign changes of the slope);
    - range on screen;
    - **gaps in the domain**;
    - **intersections of every pair**.
  - A synchronised table of values with your own start and step.
  - The expression parser is the kit's safe one, not `eval`.
- **Maths missions (maths):**
  - Six construction challenges: hidden line, hidden parabola, a parabola through three points, a parabola just touching the axis, a parallel line through a point, and a sequence n-th term.
  - Your function is drawn over the target. Checking evaluates it at several points, so **any equivalent form passes**.
  - Feedback is per condition. Hints come first; the solution appears only on the second request.
- **Probability lab (maths):**
  - Coin, die, two-dice sum (with the 36-outcome grid highlighted), a spinner you resize, and cards from a 52-card deck.
  - Real trials from `crypto.getRandomValues`, run 1, 10, 100 or 1000 at a time.
  - Experimental and theoretical bars, a convergence graph for any outcome, and the largest gap from theory compared with 1/√N.
- **Water cycle (geography; complete rebuild of v24):**
  - A conserved box model with ocean, vapour, cloud over sea and land, snow and ice, soil, groundwater and river.
  - Named flux rules:
    - evaporation ×2 per 10 °C, scaled by sunshine;
    - condensation of vapour above the air's capacity;
    - wind carrying cloud inland;
    - rain, or snow above a mountain 18 °C colder (about 2.8 km);
    - melt;
    - infiltration versus runoff, set by ground permeability;
    - transpiration by forest cover;
    - groundwater baseflow;
    - river to sea.
  - **The total water is conserved exactly** and shown.
  - A painted scene: the sun, an animated sea, clouds that grow and drift with the wind, rain and snow, evaporation and transpiration particles, a snowcap whose size follows the snow store, a river whose width follows its flow, and a soil and groundwater cross-section.
  - **Select any part** (or Tab and Enter) for an explanation.
  - **Follow a droplet**: each step is chosen in proportion to the real flows out of its current store, and the journey is written out.
- **Reaction lab (chemistry):**
  - Ten real reactions: synthesis, combustion, decomposition, single and double displacement, neutralisation, precipitation, and respiration.
  - Coefficient steppers and an atom-count table, with element-by-element guidance.
  - Checks for "balanced but not in lowest terms".
  - **Running a reaction moves every atom** from the reactant molecules into the product molecules. Unbalanced reactions are refused, with the reason.
- **Photosynthesis lab (biology):**
  - The pondweed practical: lamp distance (inverse-square light), CO₂ and temperature.
  - The rate is the scarcest of light, CO₂ and the plant's maximum (Blackman's limiting factors), multiplied by an enzyme temperature curve.
  - Bubbles rise at the model rate. "Count for 1 minute" gives a Poisson-random count, recorded in an **experiment journal** with a graph against distance, intensity, CO₂ or temperature.
  - The limiting factor is named live.

### Learning connections

These link into their lessons' topic pages through the registry:

| Experience | Lesson |
|---|---|
| Function forge | Quadratics |
| Photosynthesis lab | Photosynthesis |
| Reaction lab | Acids and bases |
| Circuit builder (Phase 1) | Circuits |

Every new experience also has "Connections" to related experiences and lessons.

## 2. Improved

- Navigation across the whole Studio (section 1). Before this, the only way out of an experience was the browser's own Back or the header tabs.
- The Water Cycle is rebuilt.
- The content validator now covers 249 questions and 74 experiences.

## 3. Bugs fixed (root cause → fix)

| Bug | Root cause | Fix |
|---|---|---|
| **Back could re-answer questions** (found by the regression suite) | My first version of state restore re-clicked every pressed control on the page being returned to, including answer buttons. A practice page could therefore be answered on the student's behalf. | Restore is limited to view filters (chip groups, tabs). Anything inside a form, question, activity or experience is never re-clicked. `learning-studio` is back to 34/34. |
| v27 canvases could appear blank | Experiences without an animation loop were cleared when their canvas was resized after mounting. | Each one redraws on resize. Tested: every v27 canvas paints. |
| Function forge reported 1/(x−2)'s gap at 1.99 | It used the midpoint of an interval rather than the sample where evaluation fails. | It reports the first non-finite sample: x = 2. |
| Water cycle had no snow at default settings | The mountain was only 12 °C colder than the coast. | 18 °C (≈ 2.8 km at 6.5 °C/km). Snow now builds at 15 °C and melts in a warmer world. |
| The river ran underground, and later over the summit | A Bézier curve ignored the terrain. | It follows the land surface down the seaward flank. |
| Question ids `x-pl1/2` collided with Plate Boundaries (caught by the validator) | Copied naming. | Renamed `x-prl1/2`. |
| Accessibility (axe): low-contrast coloured function names; an unlabelled mission input; a reaction canvas without a text alternative | — | Text in the ink colour with colour swatches; `for`/`id` label; a live `aria-label` describing the molecules. |

## 4. Animations

- **Direction-aware page transitions:** forward slides from the right, back from the left, through the Studio's existing View Transition. A CSS fallback is used where View Transitions are missing. Reduced motion turns them off.
- **Within the experiences:**
  - water flowing, clouds growing and drifting, falling precipitation, rising evaporation;
  - the snowcap and river responding to their stores;
  - atoms travelling to their product positions (eased);
  - bubbles rising at the modelled rate;
  - the Back button's arrow nudging on hover and the button scaling on press.
- **No new studio-wide subject backgrounds** were made in this phase (section 8).

## 5. Navigation contexts tested

All by automated browser tests:

- **All 74 experiences:** each shows the bar with its title and subject, and Back returns to where it was opened.
- **Dashboard:** filters, scroll and focus are restored.
- **Nested chain:** Visual Lab → lab model → topic → lesson → experience, then Back unwinds one step at a time.
- **Browser history:** Back and Forward work, and after a refresh the previous page is still Back.
- **Home:** no bar.
- **Deep link:** Back goes to the subject, then Explore, with no new history entry.
- **Rapid clicks:** a triple-click moves one step.
- **Keyboard:** Enter on Back works.
- **Phone width:** compact, touch-sized, no sideways scroll.

## 6. Tests run (actual results)

| Suite | Result |
|---|---|
| `learning-studio-v27` | **14/14**: navigation (6 tests) and the v27 experiences against independent calculations: roots ±2 and ±√3, turning points (±1, ∓2), the gap at x = 2, π and 2π, the intersections (3 ± √17)/2; missions accept equivalent answers and reject 5 wrong ones; P(7) ≈ 1/6 over 20 000 trials; water conserved exactly, warming melts snow and more than doubles evaporation, paving raises runoff and cuts infiltration over five-fold, no wind means little rain inland; 11 balance cases including lowest terms; running refuses unbalanced reactions; photosynthesis inverse square = 4×, limiting factors, optimum, 0 at 45 °C, ×2 per 10 °C, journal; all v27 canvases painted; no page errors |
| `learning-studio-v26` | **14/14**: Phase 1 work intact, including all experiences and 174 lab models drag-tested |
| `learning-studio-v24` | **42/42** |
| `learning-studio-v23` | **18/18** |
| `learning-studio-v22` | **22/22** |
| `learning-studio-v21` | **21/21** |
| `learning-studio` | **34/34**, after the restore fix; 33/34 before it |
| `learn-inspect` | **14/14** in the last run; 15/15 earlier with axe enabled |
| `nav`, `a11y`, `studio-noor` | **all checks passed** |
| Content validator | **0 errors**; 249 questions, 10 lessons, 74 experiences |
| axe (WCAG 2.1 A/AA), light and dark | **clean** on the 6 new experiences, a lesson and a lab model, after the fixes in section 3 |

**Failures during the session:**
- the `learning-studio` "Explain my mistake" check, which exposed the restore bug;
- v26's validator check (id collision);
- several of my own test mistakes (stale selectors, a wrong expected intersection, history length in a new tab).

All were fixed.

## 7. Performance

- **Loading:** the new experiences load with the other packs only when an experience is opened.
- **Rendering:**
  - Function forge and the Reaction lab redraw only on change.
  - The Water Cycle caps particles at 420 and runs only while its experience is open.
  - Reduced motion turns particles off.
- **Navigation:** stores a few hundred bytes per history entry in `sessionStorage`.
- **Not measured:** frame rates on real low-end phones.

## 8. Incomplete: not done in Phase 2

- **Mathematics:**
  - a separate Quadratic Explorer with challenges (Function forge and Missions cover parts of it; the existing Quadratic lab is unchanged);
  - Graph Studio (point and line construction on a grid);
  - a Trigonometry lab beyond the existing Unit circle;
  - a Vector lab with vector fields;
  - a Statistics studio with editable datasets;
  - 3D cross-sections and composite solids.
- **Physics:**
  - upgrades to the Projectile, Wave and Energy labs;
  - Black Hole visual upgrade;
  - Experiment designer (the Photosynthesis journal is the only journal so far).
- **Chemistry:**
  - pH lab;
  - particle and states-of-matter upgrade;
  - bonding explorer;
  - periodic-table search and builder link;
  - further molecule-builder work.
- **Geography:** Earth explorer and climate lab (Plates, Greenhouse and Earth layers are unchanged).
- **Biology:** cell explorer, DNA, ecosystem and the audit of existing experiences. Only the Photosynthesis lab is new.
- **History, English, Languages, Computer science, Social science, Economics:** no changes in this phase.
- **Studio-wide:**
  - subject-specific background redesign;
  - interaction micro-animations beyond the Back bar;
  - Noor integration upgrades;
  - knowledge map and revision links.
- **Visual Lab:** a per-model accuracy audit of the 174 models was **not** done. As in Phase 1, all 174 open without errors and 172 were drag-tested; their equations were not re-verified.
- **Not tested:** real touch and pen hardware, Edge and Safari, and low-end device performance.

## 9. Files changed

- **New:**
  - `assets/js/learn/ls-nav.js`
  - `assets/js/learn/ls-x-v27.js` (Function forge, Maths missions, Probability lab, Water cycle, Reaction lab)
  - `assets/js/learn/ls-x-v27-bio.js` (Photosynthesis lab)
  - `tests/e2e/learning-studio-v27.e2e.js`
  - this report
- **Edited:**
  - `assets/css/learn-v26.css` (Back bar and page motion)
  - `assets/js/learn/ls-explore.js` (registry, "challenge" kind, loading order)
  - `learn.html` (script and version)
  - `learn-guide/*.html` (regenerated)
  - `docs/ERLY-CONTENT-VALIDATION.md` (regenerated)

## 10. Git

- **Branch:** `claude/erly-hackathon-website-8txbtd`, committed and pushed.
- **Commits this phase:** d0979d5, 58f9ab5, 2365c76, 94430b6, plus this report's commit.
- **Not deployed:** that waits for an explicit "Deploy".
