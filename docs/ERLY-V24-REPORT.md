# ERLY v24: Learning Studio and Handwriting Studio rebuild

**Scope.** This release changes two areas: the Learning Studio (`learn.html`) and the Handwriting Studio (`handwriting.html`, formerly Handwriting Check). Section 12 lists every changed file, checked with `git diff --stat` against the last deployment (6db47fa).

**Deployment.** v24 is committed and pushed to `claude/erly-hackathon-website-8txbtd`, and deployed to GitHub Pages on request.

---

## 1. What I found before rebuilding

- **Learning Studio (v23)**
  - It had 11 subjects, 34 topics, 10 authored lessons and **17 interactive experiences**.
  - Physics, maths and chemistry had one or two experiences each. Computer science, English, languages and social science had at most one.
  - Two "worlds" (CS, social/economics) reused other subjects' animated backgrounds.
  - The Studio home was a list of panels, with no single place to find an experience.
- **Handwriting (v22)**
  - It was a single-canvas practice and scan tool.
  - There were no pages, layers, shapes, selection, fill or paper types.
  - Saving used localStorage, which cannot hold drawings of any size.
  - There were no maths, graph or physics workspaces and no export beyond PNG.
- **The full audit** is in `docs/ERLY-V24-COVERAGE.md`. It maps every topic to the experiences that teach it.

## 2. What was redesigned

- **Learning Studio:** the dashboard (new), the entrance animation, the CS and economics worlds, the Explore view (now all 11 worlds) and 47 new experiences. Each experience has the full learning frame: predict → explore → explain → apply → summary → connect.
- **Handwriting Studio:** rebuilt from scratch. It has seven modes: Write, Draw, Practise, Graph, Science, Scan and My work.
- **Unchanged:** the Growth Plan, the student portal, the homepage and all other pages (see section 12).

## 3. Learning Studio dashboard

Implemented in `ls-dash.js` and `learn-dash.css`:

- **Orrery.** A canvas "orrery" of the 11 subjects. Each planet orbits, shows its experience count, and opens its world. Labels avoid each other.
  - It is a still frame under reduced motion.
  - It pauses when off-screen or when the tab is hidden.
- **Search.** Instant search across all 64 experiences and all topics, by title, concept and subject.
- **Mode chips:** Explore, Practise, Revise and Create.
- **Continue.** Resumes the last experience you opened.
- **Experience of the day.** Picked deterministically from the date, so it is the same for everyone on a given day and not random noise.
- **Discovery grid.** Filter by kind (simulation, construction, investigation, visualization…) and by subject. The default mix is round-robin, so no subject dominates. A "Show all" option is included.
- **Earlier home kept.** The previous home content (plan, momentum, lessons) still sits below. The v21–v23 suites depend on it, and it is useful.

## 4. Opening animation

Implemented in `ls-motion.js`:

- **Sequence:** star-warp streaks → a forming ring → an iris that opens onto the dashboard, in about 1.3 s.
- **Skipping:** any click, key press or the Skip button ends it immediately.
- **Frequency:** it plays once per session. Reduced motion and the "simplify" preference skip it.
- **Never blocks input:** the dashboard is live underneath and the iris is a CSS mask.

## 5. Animation and motion system

- **Kit:** `LS.kit` (`ls-kit.js`) is the shared engine for all new experiences:
  - `stage`: high-DPI logical-unit canvases that redraw on resize;
  - `spring`: eased values;
  - `motor`: a render loop that runs only while something is moving or the simulation is playing, so idle experiences use no CPU;
  - plus controls, axes, plotting with clipping, arrows, drag handling and a safe expression parser.
- **Worlds:** subject backgrounds (`ls-worlds.js`) are animated per subject. Two new ones were added: a CS network with travelling packets, and economics market lines.
  - All of them stop under reduced motion and the "simplify" option.

## 6. Experiences: 64 in total (17 before, 47 new)

| Subject | Before | New in v24 | New experiences |
|---|---|---|---|
| Physics | 5 | **9** | projectile launcher, inclined plane, gravity explorer, atmosphere (ISA), light bender (Snell, TIR, thin lens), sound, energy track, magnet field lines, black hole (photon paths integrated in the Schwarzschild metric) |
| Mathematics | 1 | **9** | function playground, quadratic lab, unit circle, transformations, probability, statistics, fractions, tangent/derivative, vectors |
| Chemistry | 1 | **6** | **3D molecule builder** (three.js; VSEPR geometry; valence checks; names 30+ molecules from the formula and structure; 2D fallback), atom builder, periodic table (1–36), equation balancer, titration curve, collision theory |
| Biology | 4 | **6** | DNA → protein (standard genetic code), Punnett square (1–2 genes), predator–prey (Lotka–Volterra), enzyme lab, osmosis, nerve impulse |
| Geography / Earth | 1 | **4** | water cycle, plate boundaries, greenhouse balance (one-layer energy-balance model), journey to the core |
| History | 2 | **3** | source investigator (Great Fire of London 1666: Pepys, Evelyn, the *London Gazette*, the Monument inscription, a modern textbook), chain of consequences (printing press), deep time |
| Computer science | 0 | **4** | sorting race (bubble, insertion, merge, quick), bit machine, logic gates, path finder (BFS / A*) |
| English | 1 | **2** | punctuation changes meaning, word builder (morphology) |
| Languages | 1 | **1** | verb conjugator (French, Spanish, regular verbs) |
| Social / economics / psychology | 1 | **3** | market maker (supply and demand, price ceiling), growing money (compound interest), forgetting and spacing |
| **Total** | **17** | **47** | **64** |

**Honest note on scale.** The brief asked for "hundreds" of experiences. I built 64 real ones, not hundreds of shallow ones:

- Each has its own model and controls.
- Each has a computed "observe & explain" readout and authored apply questions.
- None is a re-skinned duplicate of another.

## 7. Handwriting Studio tools

- **Tools:**
  - pen;
  - pixel eraser and stroke eraser (it sweeps the whole segment, so fast erasing doesn't skip strokes);
  - shapes: line, arrow, rectangle, ellipse, polygon, curve;
  - select with move, scale and rotate;
  - lasso;
  - text, which takes focus immediately;
  - flood fill and an eyedropper;
  - science stamps (24);
  - point, angle and ruler measurements;
  - pan, zoom (pinch on touch), fit and fullscreen.
- **Colour:** palettes, a custom picker, recent colours, favourites, and opacity.
- **Layers:** add, rename, hide, lock (a locked layer refuses new ink and says so), reorder and delete.
- **Pages:** add, duplicate, delete, rename and drag to reorder. Each page has its own paper and size: landscape, portrait, square or wide.
- **15 paper types:** blank, ruled, wide, narrow, dotted, grid, graph, coordinate, engineering, isometric, music, handwriting guide, slant, Cornell and chalkboard.
- **Saving:** autosave to **IndexedDB** (`erly-hws`), but only after the student chooses "Save on this device". "Just this visit" keeps everything in memory only. The save status is always shown, including errors.
- **My work:** notebooks, open, rename, delete and storage use.
- **Export:**
  - PNG and transparent PNG;
  - SVG;
  - PDF (all pages, via jsPDF);
  - print;
  - `.erlynote` (JSON).
- **Import:** images, PDF pages (rendered with pdf.js), `.erlynote`, and paste.
- **Phone layout (fixed this session):**
  - Tool settings open as a sheet from the top bar, so the canvas keeps most of the screen. The writing area went from 195 px to 515 px tall at 390 × 844.
  - The page strip is a single scrolling row.

## 8. Ink engine

Implemented in `hws-ink.js` and `hws-canvas.js`:

- **14 brushes**, each with its own renderer, not just a width change:
  - fountain pen, ballpoint, fineliner, technical pen, pencil (grain), mechanical pencil, marker, highlighter (multiply), calligraphy (angled nib), brush, airbrush, watercolour (wet edges), charcoal, and custom.
- **Smoothing:** Catmull-Rom resampling, plus an optional stabiliser.
- **Responsiveness:**
  - coalesced pointer events, so no samples are lost;
  - predicted events drawn on a separate low-latency (`desynchronized`) live canvas and discarded once the real points arrive.
- **Pressure is used only when the device really reports it.** Mouse and touch strokes are marked `pressure: false` and drawn with simulated speed taper, never fake pressure.
- **Palm rejection:** once a pen has been used, touch does not draw.

## 9. Practice

- **Sets:**
  - capital and small letters;
  - numbers;
  - maths symbols;
  - common letter pairs;
  - words;
  - pangram sentences;
  - your own text.
- **Guides:** dashed, dotted, outline or faint, with a choice of repetitions and font. Guides sit on handwriting-guide paper and can be hidden.
- **Check.** It compares the student's ink against each guide using raster masks:
  - how much of the guide was covered;
  - how much ink fell outside it.

  It shows both as an overlay on the page, with neutral wording. It does **not** judge legibility, neatness or ability. It is not a diagnosis, and it gives no score beyond those two measurements.
- **Not built:** there is **no stroke-order data**, so the Studio cannot check the direction or order of strokes.

## 10. Graph and science workspaces

- **Graph:**
  - plot typed functions (`y = …`, with implicit multiplication) onto the coordinate paper;
  - generate a value table;
  - place labelled points.
- **Science:**
  - a library of 24 stamps (block, cart, pulley, spring, bulb, cell, resistor, lens, beaker…);
  - force vectors with labels;
  - templates:
    - an inclined plane whose weight, normal and friction arrows are in equilibrium, with the normal perpendicular to the slope and an adjustable angle;
    - series and parallel circuits;
    - a lens ray diagram.
- **Learning Studio integration:**
  - every experience can "Save picture to my notebook", which places it in the IndexedDB inbox;
  - every experience and topic links to "Open a notebook page" in the matching mode (graph, science or write);
  - the Handwriting Studio imports inbox items on start.

## 11. OCR: what it can and cannot do

- **Input and image tools:** upload a photo, or use the current page. You can then rotate, crop, and adjust brightness and contrast, with an optional clean step.
- **Engines:**
  - **Tesseract:** printed-text OCR, runs locally.
  - **TrOCR-small-handwritten:** about 64 MB, downloaded once from Hugging Face, and only after the student confirms. The image itself is never uploaded.
- **Confidence comes from the engine, never from ERLY.** Words are marked sure, unsure or unreadable using the engine's own per-word confidence.
- **Results are editable text.**
- **Accuracy:** from the existing benchmark (`docs/bench/handwriting-bench.md`, 150 real IAM lines; **not re-run in v24**):

  | Engine | Line CER | Page CER |
  |---|---|---|
  | TrOCR | 15.2% | 6.5% |
  | Tesseract | 50.0% | 42.6% |

  Reading handwriting is therefore unreliable with Tesseract, and the UI says so.

## 12. Files changed (`git diff --stat 6db47fa..HEAD`)

- **Learning Studio:**
  - new: `assets/js/learn/ls-kit.js`, `ls-dash.js`, `ls-x-phys.js`, `ls-x-math.js`, `ls-x-chem.js`, `ls-x-bio.js`, `ls-x-earth.js`, `ls-x-mind.js`, `assets/css/learn-kit.css`, `learn-dash.css`;
  - edited: `ls-exp.js`, `ls-explore.js`, `ls-home.js` (1 line), `ls-motion.js`, `ls-topic.js` (1 line), `ls-worlds.js`, `learn.html`.
- **Handwriting Studio:**
  - new: `assets/js/hws/` (core, ink, paper, canvas, app, learn, scan, intro) and `assets/css/hws.css`;
  - edited: `handwriting.html`.
- **Docs:** `docs/ERLY-V24-COVERAGE.md`, `docs/ERLY-V24-REPORT.md`.
- **Tests:**
  - new: `tests/e2e/learning-studio-v24.e2e.js`, `handwriting-studio-v24.e2e.js`;
  - edited: `ink-studio.e2e.js`;
  - retired: `handwriting-v22.e2e.js` (moved to `tests/e2e/retired/` with a note).
- **Not touched in this range:**
  - no shared stylesheet (`style.css`, `v9.css`, `erly.css`…);
  - no other page;
  - nothing in the Growth Plan or the student portal.

  The ink transition from the student portal (`ink-transition.js`) is unchanged. Its arrival cover CSS moved into `hws.css`, because the old `hand.css` is no longer loaded on that page.

## 13. Tests run

| Suite | Result |
|---|---|
| `learning-studio-v24`: 42 checks, including numeric checks of the physics, maths and chemistry models (projectile range, incline threshold, ISA temperature, Snell/TIR, thin lens, r_s, quadratic roots, dot product, molecule naming and valence, Fe configuration, titration pH 7, Punnett 3:1, sorting, XOR, path length…) | **42/42** |
| `handwriting-studio-v24`: 20 checks — consent gating; mouse ink under the pointer; every brush draws differently (pixel comparison); undo/redo; both erasers; shapes, select-and-move, text, fill; pages and papers; layers and layer lock; real stylus pressure recorded and mouse never claims pressure; palm rejection after a pen; IndexedDB autosave survives reload; export PNG / SVG / PDF / notebook file and re-import; practice coverage check; graph plot and table; science incline template; scan/OCR returns editable text with engine confidence; My work; keyboard and accessible names; phone; the entrance never blocks. (The Learning Studio → notebook inbox is checked in `learning-studio-v24`.) | **20/20** |
| `ink-studio`: transition, Back/Forward, theme, reduced motion, phone layout and tool sheet | **passed** |
| axe-core (WCAG 2.1 A/AA): dashboard, Explore, 4 experiences, and 4 Handwriting modes, in light and dark (20 runs) | **0 violations** after two fixes (card label contrast; role for the 3D viewer) |
| Full regression (all 36 suites) | 32 passed on the first run; `human3d` and `lab` passed on re-run; flashcards check in `learning-studio` fails before v24 too; `audio-lessons` timed out on outside downloads (section 14) |

## 14. Actual results of the full regression

All 36 suites in `tests/e2e/` were run one after another on the v24 head. Every suite that failed was then re-run on its own. The two that still failed were also run against the pre-v24 commit (6db47fa) on a separate server.

- **32 suites passed** on the first run. These include all four Learning Studio suites from v21 to v24, Handwriting Studio v24 (20/20), the ink transition, both accessibility suites, Growth Plan, nav, chat, all Noor suites, the visuals suites and realtrack.
- **`human3d`** missed one check by 2 ms on the first run: lip-sync latency was 202 ms against a 200 ms limit, while other heavy suites shared the CPU. **Passed** when re-run on its own. v24 doesn't touch that page.
- **`lab`** failed check M1 once: the first chat reply was read before it arrived. **34/34** in two re-runs on v24, and 34/34 on 6db47fa. It is timing-dependent, not a v24 change.
- **`learning-studio`: 33/34.** The flashcards check fails ("Expected values to be strictly equal"). It **fails the same way on 6db47fa, before v24**, so v24 did not cause it, and it is still open. In earlier runs the one failing check in this suite was "Explain my mistake", which passes now.
- **`audio-lessons`** timed out at 10 minutes. It downloads a voice model and articles from outside services, and in this run it never got past that download. It is not a v24 page.

**Net result:** no failure traced to the v24 changes. One older failure (flashcards) is still open, and one suite could not run because its outside downloads never arrived.

## 15. Performance

- **Payload size:**

  | Files | Raw | gzip |
  |---|---|---|
  | Experience packs + kit | 319 KB | 106 KB |
  | Handwriting Studio JS | 173 KB | 54 KB |
  | CSS | 46 KB | 11 KB |

- **Loading:**
  - Experience packs load only when an experience or Explore is opened (`LS.needExp`).
  - three.js loads only for the 3D molecule builder.
  - OCR engines load only when Scan is used.
- **Render loops** run only while something moves. Idle experiences and the paused orrery do not run a frame loop.
- **Measured** in headless Chromium on this test container (software rendering, no GPU; a desktop-class CPU, not a phone):

  | Screen | Median frame | 95th percentile | Worst |
  |---|---|---|---|
  | Projectile, black hole, predator–prey, sorting (playing) | 16.7 ms | 16.8 ms | 16.8 ms |
  | 3D molecule builder | 16.7 ms | 16.8 ms | 33.4 ms |
  | Dashboard (orrery) | 16.7 ms | 16.7 ms | 16.8 ms |

  In the Handwriting Studio, the time from a pointer move to the next painted frame was 7.3 ms median and 15.2 ms at the 95th percentile, over 200 moves.
- **Not measured:**
  - real pen hardware latency (glass to ink);
  - frame rate on low-end phones and tablets.

  I had no such devices. The numbers above are not a substitute.

## 16. Accessibility

- **axe:** clean in both themes (section 13).
- **Keyboard:**
  - every control is a real button, input or select;
  - the Handwriting modes are a tablist;
  - tools have shortcuts;
  - the 3D viewer is focusable and has a text readout.
- **Reduced motion:** honoured everywhere — the entrance, worlds, orrery and ink intro are skipped or static.
- **Readouts:** every experience has a text readout of its state, not only a picture.

## 17. Incomplete features

- 64 experiences, not hundreds.
- No stroke-order or stroke-direction checking in Practice.
- Handwriting recognition is only as good as the engines (section 11). There is no maths-expression or diagram recognition.
- The periodic table covers elements 1–36 only.
- The verb conjugator covers regular verbs only.
- The 3D molecule builder names molecules from a built-in list of about 30, and builds any valid structure beyond that without a name.

## 18. Known limitations

- **SVG export** draws textured brushes (pencil grain, charcoal, watercolour edges) as plain smooth paths. PNG and PDF keep the textures.
- **Storage:** IndexedDB is per browser and per device. There is no sync, by design (privacy-first).
- **Simplified models,** which say so in the experience:
  - the greenhouse model is a one-layer energy balance;
  - the forgetting curve is a simplified model, not a measurement of the student.
- **Two older suites depend on external services:** `audio-lessons` and `visuals` use Wikipedia and can fail when it rate-limits. That is unrelated to v24.

## 19. Privacy

- Nothing is uploaded.
- Drawings are saved only after explicit consent, and only in this browser.
- The TrOCR model download asks first, and only model files are fetched.
- No camera or microphone is used without a click.
- Nothing infers ability, disability or emotion from writing.

## 20. Deployment

Deployed to GitHub Pages on request. The Pages build succeeded: https://jacobpallathuabraham.github.io/Hackathon/
