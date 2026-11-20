# ERLY v22 — Learning Studio master build, Cinematic Worlds, Handwriting Studio and the Signature Ink Engine

**Branch:** `claude/erly-hackathon-website-8txbtd`. **Deployed** on request to GitHub Pages at commit `ea28d74`. The fixes listed in D4 came after that deploy; they are on the branch and go live with the next "Deploy". Screenshots are in [`v22-shots/`](v22-shots/). Acubins University is fictional.

## Contents

- Part A: the Learning Studio (Master Design & Engineering directive)
- Part B: Cinematic Worlds (nine-item report)
- Part C: the Handwriting Studio and the Signature Ink Engine (sixteen-item report)
- Part D: tests, accessibility, performance, the protected site, and what is not done

---

# Part A — Learning Studio

## A1. Scope kept

Everything is inside `learn.html` and its own files (`assets/js/learn/*`, `assets/css/learn-atelier.css`), with one exception: the reader `studio.js`, which is the Studio's own reader. Its new buttons only appear when the Studio's code is present, so student.html and support.html, which also load `studio.js`, are unchanged.

| Check | Result |
|---|---|
| Files changed outside the Studio and Handwriting since v21 | `studio.js` only (the reader) |
| Pixel comparison, v21 vs v22 (full page, animations frozen) | **0 differing pixels** on student, games, support, login, faculty, check-ins, counselor and coverage. Index, university and knowledge show the same small differences when v21 is compared with *itself* (live content), so they are noise. |
| Site-wide CSS | not touched |

## A2. Design system

The Atelier design from v21 was kept and given stated rules:

- **Palette:**
  - an ink foundation;
  - **one accent** (lapis);
  - **one sparing secondary** (saffron), used only for milestones and "ready for review";
  - semantic green, amber and red.
- **Subject hues** tint only emblems, worlds and rules.
- **Hierarchy:** four levels:
  - L1: page title, display face;
  - L2: section;
  - L3: item title;
  - L4: meta and mono kicker.
- **Interaction states:** every button has hover, press (scale .97–.975), focus ring, disabled and `aria-busy` loading states.
- **Motion:**
  - progress bars animate only when their value changes;
  - Momentum figures animate only when the number really changed since you last saw it (compared per session);
  - all motion stops with reduced motion, whether set on the device or in the Accessibility panel.
- **Bug fixed:** the Studio's button style overrode the `hidden` attribute, so "Try again" showed before an answer. `[hidden]` now always wins inside the Studio.

## A3. The personal learning engine (`ls-engine.js`)

**Objectives.** Each of the 10 lessons states its objectives (35 in total). Every lesson and revision question is mapped to one objective:
- the 8 v19 lessons through an explicit map, authored from each question's prompt;
- the bank questions and the two new lessons carry their `objective` themselves.

**Evidence events** (learning actions only; never keystrokes, timing of hesitation, camera or microphone):
- an answer: right or not, attempt number, hints used;
- a hint opened;
- a section viewed or finished;
- a worked example opened;
- a model explored;
- an explanation chosen ("Show me why");
- an experience opened, a prediction, an observation;
- a flashcard graded;
- a reading opened, a reading link used;
- a video chapter watched to its end;
- teach-back;
- a turnaround after another explanation.

**Eight transparent states**, each shown with its reasons ("Why this state?"):

| State | Rule |
|---|---|
| Not started | no evidence |
| Exploring | section opened or something explored, no answers |
| Learning | the teaching section finished, no answers |
| Practising | answers given, not yet enough either way |
| Needs revisiting | the last two answers were not right |
| Developing understanding | right answers, but with hints, after a retry, or only one different question |
| Demonstrated understanding | **two different questions** right **without hints**, the latest also right (or the only question there is) |
| Ready for review | demonstrated, then no evidence for 10 days |

- States change in both directions as evidence arrives.
- They describe a piece of learning, never the student. The forbidden-wording check (diagnosis and condition terms) is re-run on the pages in the tests.

**Analytics** separate:
- lessons **opened** and lessons **completed**;
- objectives **attempted**, **demonstrated** and **retained** (right without hints on two or more different days).

## A4. Learning Home

- A compact welcome: "Let's make something *click*." A line underneath built from real figures, or an honest sentence when there are none.
- **Continue learning:** the top item with its real position and progress bar, plus up to three more.
- **Today's learning plan:** at most three items, chosen from evidence: revisit, cards due, continue, quick review, practise, something new.
  - Each item can be **started, moved up or down, moved to tomorrow, skipped today, swapped, or removed** (not suggested again for a week).
  - The student can **add their own** item and link it to a lesson or experience.
  - Items tick themselves off when the evidence says so.
  - Wording: "A suggestion, not a rule."
- **Momentum:** four figures, each saying how it is counted. No streak.
  - objectives demonstrated;
  - mistakes turned around in 30 days;
  - flashcards recalled this week;
  - discoveries recorded.
- **Insights:** see A5.
- **Curiosity portal:** one question a day, opening into an experience.
- **Discover:** five curated items.
- **The worlds:** nine subjects.

## A5. Insights you can question

Each insight shows:
- **what I noticed**;
- **why it may matter**;
- **the evidence** (dated rows);
- **an action**;
- **"Not useful — hide"** (hidden for 2 weeks);
- **"This isn't right"** (your note is kept with your data and the insight never returns).

Insights are generated only from real data:
- an objective needs revisiting → a different explanation;
- the same kind of slip on 2 or more questions, 3 or more times → the visual model for that step;
- strong flashcard recall but weak first-try answers on the same lesson → a worked example;
- **answers improved after a visual or model**: before/after accuracy on the same objective (at least 2 answers each side). Worded as a pattern, not a "learning style", with the alternative explanations stated;
- objectives ready for review.

The v19 insight panel (reliability, alternatives) is still shown on Progress.

## A6. Adaptive learning — Demo 5 (`ls-adapt.js`, `#/learn/obj/<objective>`)

The loop is real logic, tested end to end:

1. **Try:** an unanswered (or not-yet-right) question on the objective; hints available.
2. **Record:** stored with the objective, attempt number and hints used.
3. **Respond:**
   - right with no help → evidence, then **Challenge me**, **Teach it back** or a review card;
   - right with hints → "now one without";
   - not right → the question's own explanation, then **another way in**.
4. **Another way in:**
   - The suggested format follows a ladder: plain words → picture → worked example → step by step.
   - The student can choose any of ten formats: read it simply, see it, worked example, step by step, analogy, real world, explore a model, listen, ask Noor, teach it back.
5. **Again:** a **different** question on the same objective.
6. **Evidence:** the state is recomputed and shown as before → after (e.g. *Practising → Developing understanding*).
7. **Insight:** "after you chose 'See it', the next question went right. That is what happened this time — not a rule about you." It is stored as an `adapt-success` event and earns the "Another way in" milestone.

**Show Me Why really changes:** for five objectives every format is written separately, with its own text, SVG figure, worked example and steps:
- linear gradient;
- solving equations;
- acceleration;
- left-ventricle wall;
- pH calculation.

For the other objectives, the formats come from the lesson's own text, figure, model, worked example and step questions.

## A7. Practice, revision and mistakes

- **Flashcards** are graded **Not sure / Getting there / Know it** (keys 1–3). Underneath, this is the same tested SM-2 schedule; each button shows its next interval.
- Revision has new options:
  - **reset** one card or a whole collection (with undo);
  - **preferences**: new cards per session, and reverse practice (show the answer first).
- Grading a card records evidence.
- **Mistake notebook:** each entry shows its topic, question, your answer, explanation and solution, a **suggested next step** built from the record (repeated tries suggest another explanation, not another attempt), its review status, and **Learn it another way**.

## A8. Reading connected to everything (`ls-read.js`, `studio.js`)

Selecting a passage in the reader now offers, beside the seven ways to ask Noor:
- **Make a question:** a fill-in-the-blank question made by a plain rule (one key term blanked) and labelled "Not written by AI".
- **Make a flashcard:** opens an editable card.
- **Explore visually:** opens the best-matching experience or lab model, or says honestly that nothing matches.
- **Related lesson:** opens it, or says none covers the passage.

Every use records evidence.

## A9. Rewards: one metaphor, no pressure

- **Journey metaphor — "your sky":**
  - every objective is a star in its lesson's constellation;
  - a star brightens as you demonstrate the objective, and glows saffron when it is ready for review;
  - selecting a star opens that objective's adaptive page.
- **Collections:** progress per subject.
- **Eight milestones**, earned only by learning, never by time or days in a row:
  - first light;
  - a whole constellation;
  - turnaround;
  - steady recall;
  - experimenter;
  - wanderer;
  - second look;
  - another way in.
- **Cosmetic themes:** four themes (Dusk, Aurora, Nebula, Tide) that change only the accent, each unlocked by a milestone. Nothing educational is locked.
- **Celebration:** a 1-second sparkle, off with reduced motion, switchable, never a sound.

## A10. Workspace and information architecture

**Five places, with sub-places** (a second row of navigation):

| Place | Sub-places |
|---|---|
| Home | — |
| Explore | Subjects, Topics, Discover |
| Learn | Lessons, Reading, Video, Visual Lab |
| Practise | Practice, Flashcards, Mistakes |
| My Workspace | Notebook, My Library, Paths, Progress, Journey, Privacy & data |

Noor is always one tap away. On phones there is a dock and a sheet.

**My Library** reads the same store as everything else: nothing is copied into separate storage. It shows:
- lesson and reader bookmarks;
- starred readings and your own files;
- recent notes;
- flashcard collections;
- the **Discovery Archive** (your prediction, what the model showed, your explanation).

## A11. Noor

- **Contextual:** the v21 margin.
- **Resizable:** drag the edge, or use the arrow keys on the grip, between 320 px and 60% of the screen.
- **Never covers content:** on wide screens the page makes room for the margin.
- **ERLY's site-wide "Looking for something?" side check-in is suppressed inside the Studio only**, because it covered buttons there. It is unchanged on every other page.
- **Consent-aware:** only the question and the context shown are sent.
- **Hand-over from Handwriting:** results arrive as a question shown ready to send, never sent automatically.

## A12. Required demos

| Demo | Where | Covered by |
|---|---|---|
| 1 · Biology, circulatory system | Lesson `bio-heart` (lesson, figure, label diagram, questions, cards); experience **Journey of a red blood cell** (11 stops with oxygenation, the Visual Lab heart model inside, prediction, observation, apply questions); objectives in Progress and the sky; Noor from every step | v22 e2e (all experiences), learning-studio e2e (heart lesson) |
| 2 · Maths, linear functions | New lesson `math-linear` (4 objectives, 16 questions, worked examples); **Line builder** (m and c sliders, two draggable points with rise/run, keyboard movable, match-the-line challenge); mistakes record "rise and run swapped" etc. | v22 e2e (adaptive loop on `math-linear:0`, line builder) |
| 3 · Physics, motion | New lesson `phys-motion` (4 objectives, 16 questions); **Motion graphs lab**: cart with s–t and v–t graphs from s = ut + ½at², prediction compared with the computed shape | v22 e2e: u = 0, a = 2 gives **36.0 m and 12.0 m/s after 6 s** and "agrees" with the prediction |
| 4 · Reading a real PDF | Reading → course readings (real PDFs via pdf.js): pages, zoom and pinch, highlights, bookmarks, notes, resume from Home | learning-studio-v21 e2e (21/21) |
| 5 · Adaptation loop | `#/learn/obj/...` (A6) | v22 e2e: wrong (0.5 = run ÷ rise) → recorded → explanation → "See it" → "An analogy" (text changes) → a different question → right → state change logged → insight |

---

# Part B — Cinematic Worlds (nine-item report)

**1. Worlds.**
- Each of the nine subjects has an atmosphere drawn procedurally on canvas (`ls-worlds.js`):
  - **Physics:** stars and an orbit;
  - **Chemistry:** particles that bond when close;
  - **Maths:** a turning polygon lattice and a wave;
  - **Biology:** drifting cells;
  - **History:** strata of time;
  - **Geography:** a turning globe;
  - **English:** drifting letters;
  - **Languages:** greetings in eight languages;
  - **Social science:** a city whose windows light up.
- They appear on subject pages, world cards, experience headers and the curiosity portal.

**2. Cost and fallbacks.**
- The canvases run at about 30 fps and at most 1.5× pixel density, under a shared loop.
- They **pause off-screen and in hidden tabs**, and drop out when their page is left.
- **One still frame** is drawn with reduced motion, on small cards, and on devices reporting ≤2 cores or ≤2 GB of memory.
- They are loaded lazily: `ls-worlds.js` is fetched only when a world is shown. A test confirms reduced motion runs no animation loops.

**3. Experience engine** (`ls-exp.js`): one frame for every experience:
- **Hook → Predict → Explore → Observe & explain → Apply → Summary & connections.**
- Steps are free to revisit.
- The model stays on screen with **Pause, Reset and Ask Noor**.
- The **observation is computed from the model's state** and compared with the prediction.
- The student's own explanation can be saved to the **Discovery Archive**.
- Every experience states **what it simplifies**.

**4. Fifteen experiences, chosen by suitability:**

| Subject | Experience | Kind | Real computation |
|---|---|---|---|
| Physics | Motion graphs lab | Experiment | s = ut + ½at², v = u + at |
| Physics | What if the Sun were heavier? | What-if lab | velocity-Verlet orbit, escape test (energy ≥ 0), period |
| Physics | Build & break a circuit | Build & break | series/parallel currents and powers (12 V, 6 Ω bulbs) |
| Physics | When two waves meet | Experiment | superposition, peak amplitude |
| Chemistry | Inside a substance | Simulation | 64-particle 2-D Lennard-Jones; state read from measured neighbours and mobility |
| Maths | Line builder | Interactive model | y = mx + c, two-point gradient |
| Biology | Journey of a red blood cell | Cinematic journey | 11 stops; Visual Lab heart model |
| Biology | Inside a plant cell | Explore | 8 organelles; plant vs animal comparison |
| Biology | From the universe to a chloroplast | Zoom through knowledge | 14 sizes across 36 powers of ten |
| History | How we learned how blood moves | Explore (timeline) | 10 dated events with evidence and certainty labels |
| History | The case of the missing pores | Mystery case | evidence cards; verdict and support checked |
| Geography | Why seasons happen | Simulation | declination and the sunrise equation; day-length chart |
| English | Sentence workshop & story architect | Builder | word order → meaning; story outline to notebook |
| Languages | Ordering at a French café | Conversation | branching dialogue; on-device speech only when asked |
| Social science | Run a city budget | Simulation | stated toy rules, shown on the page |

**5. Signature experiences:**

| Signature | Where it is |
|---|---|
| Curiosity Portal | Home and Discover |
| Zoom Through Knowledge | universe → chloroplast |
| What-If Lab | the heavier Sun |
| Mystery Case | the missing pores |
| Knowledge Universe | your sky, with the 8 states |
| Show Me Why | Part A6 |
| Build & Break | the circuit |
| Discovery Archive | My Library |

**6. Topic flow.**
- The lessons provide explanation, model, questions, feedback, summary and connections.
- The experiences add hook, predict, guided experiment, observe and apply.
- The adaptive page adds the mastery check.
- Pause, Reset and Noor are always available in experiences.

**7. Verified values** (from the tests):

| Model | Value checked |
|---|---|
| Motion | 36.0 m and 12.0 m/s after 6 s at u = 0, a = 2 |
| Orbit, Sun ×2 at speed ×1 | closest approach is ⅓ of the starting distance (analytic value) |
| Circuit | series with one bulb broken → 0.00 A; parallel → 2.00 A and 24 W per bulb |
| Particles | ≥4.4 neighbours at T = 0.1 and <2.5 at T = 1.2 |
| Seasons | London 16.4 h and Sydney 9.7 h on 21 June; Tromsø 24 h in June and 0 h in December |

**8. Honesty about simplifications:**
- **Seasons:** ignore atmospheric refraction, so real days are a few minutes longer.
- **Particles:** model units, not °C.
- **City:** a toy with stated rules, not a forecast.
- **Timeline and mystery:**
  - the dates of Ibn al-Nafis' commentary are labelled approximate;
  - how ideas travelled is labelled "not proven".
- **Café:** one standard exchange.
- **Zoom:** sizes rounded to useful powers of ten.

**9. Limits.**
- Only Physics has more than one experience. Every other subject has one or two.
- History, Languages and Social science have **no lessons yet**, only experiences. Their world pages say so through their counts.
- The experiences' own questions (`x-…`) are recorded as practice, but they are not linked to lesson objectives.

---

# Part C — Handwriting Studio and Signature Ink Engine (sixteen-item report)

**1. What was rebuilt.**
- `handwriting.html` is now the **Handwriting Studio**, with four modes: **Practice · Scan & Analyze · Assess · History**.
- The page header and the page transition from the student page are unchanged.
- New files:
  - `hand-ink.js` (ink engine);
  - `hand-surface.js` (writing surface);
  - `hand-analysis.js` (measurements);
  - `hand-ocr.js` (recognition service);
  - `hand-app.js` (the studio);
  - `hand-app.css`.
- Kept and reused: `hand-rec.js` (TrOCR, image tools) and `handwriting.js` (quality checks, preparation, comparison).
- The v12–v19 UI files (`hand-ui.js`, `ink-pad.js`, `hand-practice.js`) are no longer loaded here. `student.html` is untouched.

**2. Signature Ink Engine.**
- Each stroke is filled as an **outline polygon**: a Catmull-Rom spline, resampled evenly, with a varying half-width and round caps. This gives variable width, tapered ends and clean joins.
- Four genuinely different width models, measured in the test as the width ratio along one stroke and the ink area:
  - **Classic fountain** (40° nib; width ratio **8.8** along one stroke);
  - **Precision** (uniform, **1.1**);
  - **Soft** (near-uniform plus a faint wider edge);
  - **Signature** (speed- or pressure-driven with long tapers, **3.6**).

**3. No fake pressure.**
- Pressure is used only when a pen reports varying values; a constant 0.5 or 0 from a mouse or finger is detected and ignored.
- Without pressure, Signature ink thins with **speed**: fast strokes are less than 60% of the width of slow ones.
- A test with real PointerEvents confirms stylus pressure is captured and used, and that a mouse stroke never claims pressure.

**4. Latency, measured.**

| Measure | Result |
|---|---|
| Drawing the live stroke | **0.05 ms per frame** on average (max 0.5 ms) |
| Repainting 600 strokes after undo or resize | **4 ms** |
| Delay added by the ink engine | none: it draws in the same frame as the input |
| Predicted points | used to reduce perceived latency |
| "Ink settles" effect | a sheen drawn *after* the stroke is committed; optional, off with reduced motion; never changes stroke data |

**5. The surface.**
- Pointer events with coalesced points.
- Real pressure.
- High-DPI rendering.
- Palm rejection once a pen is used.
- Two-finger pan and pinch zoom.
- Undo and redo (buttons and Ctrl/⌘+Z, Shift+Z).
- A stroke eraser that removes whole strokes, which keeps analysis clean.
- Clear with confirmation (and undo).
- Paper styles: clean white, warm, lined, grid, handwriting guides.
- Tracing text.
- Zoom and full screen.
- Save and resume the page.
- PNG export, either **as written** or **clean** (precision black ink on white). The clean version is what recognition reads; the test checks it has no coloured pixels.

**6. Practice centre.**
- A library of letters, combinations, words, sentences, paragraphs, a spacing drill, an alignment drill and a free page, in English and Arabic.
- Optional tracing.
- **Goals:** "3 sessions" counted from analysed drill sessions. No streaks.
- Growth Plan links (`?practice=letters|tracing|goals`) still open the right practice.

**7. Scan & Analyze.**
- JPEG, PNG and WebP files, several pages at once, drag-and-drop, and a "Use the camera" file input (`capture`).
- Preview with **original vs processed**.
- Editing tools:
  - rotate 90°;
  - straighten ±15°;
  - drag-to-crop;
  - brightness, contrast and an automatic light fix.
  - The original is never modified.
- The **image-quality assistant** has 10 checks: light, glare, contrast, sharpness, amount, size, rotation, tilt, cropping, background. Each check has advice.
- Processing state with progress.
- Editable result per page.
- Export of the text (.txt) and the processed image.
- Retry with the other reader.
- Save.

**8. Recognition.**
- `hand-ocr.js` is one interface with replaceable engines (`register()`):
  - **TrOCR-small-handwritten** (in-page via transformers.js). The ~64 MB download from Hugging Face happens only after the student agrees, and is cached. The writing is never sent.
  - **Tesseract 5** (vendored).
- Arabic uses Tesseract and is labelled experimental.
- Confidence shown per word is **the engine's own** (sure / uncertain / low), labelled "how sure the software is, not a judgement of your writing".
- A known TrOCR failure (repeating itself) is flagged and not trusted.

**9. Real-handwriting results (IAM, 150 real lines by many writers):** see the benchmark table in D3. Recognition of **on-screen strokes** was tested separately with text traced into pen strokes from a handwriting-style font. That is synthetic, not a person's writing:

| Engine | CER | Confidence |
|---|---|---|
| Tesseract | **1.1%** (one error: "gale" for "gate") | 88% |
| TrOCR | **0%** | 98% |

**10. OCR errors are never shown as writing errors.**
- The student sees what the software read, **corrects it** ("its mistakes are not your mistakes"), and only the **confirmed** text is compared with the original.
- The comparison reports:
  - the share of characters matching;
  - words found and not found;
  - extra or different words;
  - words per minute for timed tasks.

**11. Presentation analysis** (`hand-analysis.js`). Measured only where measurable, from strokes or from a photo:

| Measure | What is reported |
|---|---|
| Word spacing | average in letter-heights, and its variation |
| Baseline | slope in degrees, and how far words sit from their line |
| Size | variation of word heights |
| Slant | median lean and its spread (strokes only) |
| Line spacing | distance between lines, and its variation |

- Each measure states **how it is measured** and **what it does not tell you**.
- "Not enough writing to measure this" is shown when that is the case.
- Checked on a synthetic page with known geometry: 12 words found, gap 81 px, slope −0.9°, lean 11.3° left.
- **Suggestions** appear only above stated thresholds; each names its measured evidence and links to a drill and a goal.

**12. Assess** — six types, each with instructions first, a focused writing screen, then results:
- copy text;
- free writing;
- letter and word practice;
- sentence writing (uses a given word);
- **optional** timed writing (none, 1, 2 or 3 minutes);
- photograph submission.

The results screen has:
- **Completed**;
- **What the software read** (editable);
- matching the original, computed only on confirmed text;
- the layout measurements;
- suggestions;
- **comparison with your last attempt at the same task and prompt only**;
- **limitations**;
- **save**, **retry**, and **Ask Noor**, which sends a text summary only and says so: "Noor has not seen your image".

No scores or grades are produced.

**13. History.**
- Attempts grouped by task and prompt, with comparable trends only.
- Delete one attempt, delete everything, export JSON.
- Switch storage on or off ("Stop keeping" deletes everything).

**14. Privacy.**
- Nothing is stored until **"Keep on this device"** is chosen; the test confirms storage is empty before that.
- Photos are never stored; only a small preview of on-screen writing is kept with a saved attempt.
- No network writes; the only network traffic is the optional model download.

**15. English and Arabic.**
- The writing language switch changes the prompts, the library and the writing direction (RTL), and the reader (Tesseract for Arabic).
- Arabic recognition is labelled experimental.
- The interface language follows ERLY's own language toggle.

**16. Tests and limits.**
- `handwriting-v22.e2e.js` (**21/21**) covers the ink engine, surface, analysis, export, scan, all six assessment types, consent, history, Arabic, keyboard, phone and no uploads.
- `ink-studio.e2e.js` was ported to the new surface and passes.
- The old v12–v18 handwriting suites are retired with a README (`tests/e2e/retired/`).
- **Not validated:** students' own handwriting and phone photos. IAM is scanned forms. On-screen recognition was tested on font-traced strokes, not people.
- **No real-device pen test** was possible here: pressure was tested with synthetic PointerEvents.

---

# Part D — Tests, accessibility, performance, the protected site, and what is not done

## D1. Test results (all run in this environment)

| Suite | Result |
|---|---|
| Unit (`npm test`) | 272 / 272 |
| `learning-studio-v22.e2e.js` (new) | 22 / 22 |
| `learning-studio-v21.e2e.js` (updated: 5 places, 9 worlds) | 21 / 21 |
| `learning-studio.e2e.js` (updated to the new navigation) | 34 / 34 (one intermittent check, D4) |
| `handwriting-v22.e2e.js` (new) | 21 / 21 |
| `ink-studio.e2e.js` (ported) | passes |
| `studio-noor.e2e.js` (updated: v21's Ask menu needs a choice) | passes, after two fixes (D4) |
| Full regression | D4: all pass after fixes; one intermittent check noted |

## D2. Accessibility

axe-core 4.10 was run (WCAG 2.0, 2.1 and 2.2, A and AA) on 34 states × light and dark (68 runs):
- all new Studio pages;
- all 15 experiences;
- the adaptive page after a wrong answer;
- all four Handwriting modes and an assessment.

The result is **0 violations**, after fixing:
- links nested in `<summary>`;
- one unlabelled SVG;
- `aria-label` on plain spans;
- three contrast issues.

Other accessibility work:
- Keyboard use: tabs move with the arrow keys; the line-builder points move with the arrow keys; the circuit bulbs, cell organelles and timeline points are buttons.
- Every experience and the Studio were checked on a phone width for horizontal overflow.
- **Not done:** a manual screen-reader pass.

## D3. Recognition benchmark (IAM, 150 real handwritten lines)

Re-run on the rebuilt page, on 2026-11-20 at 02:02 UTC. It uses the same 150 lines as v18 (IAM test split, every 19th line, many writers), and the full table is in [`bench/handwriting-bench.md`](bench/handwriting-bench.md). The results reproduce v18's exactly.

| | Handwriting model (TrOCR) | Quick reader (Tesseract) |
|---|---|---|
| Line-level CER / WER | **15.2% / 25.4%** | 50.0% / 86.4% |
| 3-line pages (segmentation + reading, the app's path) | **6.5% / 12.4%** (30/30 pages split into exactly 3 lines) | 42.6% / 88.2% |
| Time per line | 2.3 s | 0.14 s |

**Is the confidence meaningful?** Yes. Lines the model was 80–100% sure of had a mean CER of 5.1%; at 60–79% it was 17.3%; at 0–59% it was 45.7%.

**Failures recorded, not hidden:**
- Line 125 came out at 48.6% CER: "before dominance with one. One this workshop".
- Speckle noise breaks the model (84.1% CER) until the editor's denoise is applied (8.5%).
- Tesseract is unusable on handwriting.

Through the app's Scan path, three real IAM lines were composed into a page and read by the handwriting model; the result is in the regression log (D4).

## D4. Full regression

A full run of every end-to-end suite was made against v22 (`tests/e2e/*.e2e.js`). It skips `audio-lessons` and `neural-voice`, which download large voice models. The run took about 40 minutes.

**First full run:** 29 suites passed, and 5 failed.

**Each failure was then re-run on its own and fixed:**

| Suite | First run | Cause | Fix | Now |
|---|---|---|---|---|
| `studio-noor` | timeout | **Two real bugs:** (1) v22 hid ERLY's side check-in in the whole Studio, including the reader's "zooming a lot?" tip; (2) **since v21 the Noor voice-call button in the Studio did nothing**: the call and avatar scripts were never part of `learn.html`. That was found here, because the v21 Ask-menu change had stopped this test before it reached that point. | The check-in shows inside the reader again; the voice-call stack now loads on the first press (`ls-lazy.js`), and was checked to open with its avatar. | passes |
| `learning-studio-v22` | 21/22 | The test's forbidden-word scan read the whole page, which now includes the v19 disclaimer "ERLY does not diagnose". | Scan limited to the insight cards. | 22/22 |
| `learning-studio` | 33/34 | "Explain my mistake" click intercepted. A visible toast caught every click on its box, and the new milestone toast appears unprompted. | Toasts now let clicks through except on their own buttons. | 34/34 in 3 of 4 runs after the fix. The one later failure had no identified cause: it is recorded as **intermittent**, not fixed. |
| `ink-studio` | eraser check failed | Did not reproduce. | — | passes |
| `noor-tools` | timeout | Did not reproduce. It only uses `student.html`, which v22 did not change. | — | passes |

**Passed in the full run:**
- a11y-centre, a11y, avatar-lab, chat;
- companion-quality, companion;
- growth-v18 (15/15);
- handwriting-v22 (22/22, including real IAM lines read through the app's Scan path);
- human3d;
- lab (34/34);
- learning-studio-v21 (21/21);
- nav, noor-platform, noor-v12, noor-v17 (9/9), noor;
- page-video (8/8), problems (14/14), realtrack, syllabus-chat;
- v10, v9;
- visual-acceptance (10/10), visual-chat (18/18), visual-library;
- visuals: it timed out once on clean v21 and passes here;
- vspec.

**Retired:** handwriting v12, v17 and v18 (they tested the removed UI; see `tests/e2e/retired/README.md`).

## D5. Performance

Cold load, Chromium, local server (no network latency), medians:

| Page | DOMContentLoaded | Load | Long tasks until load + 0.3 s (median of 7) | Long tasks until load + 1.5 s (median of 5) |
|---|---|---|---|---|
| Studio Home, v21 | 267 ms | 361 ms | 56 ms | 54 ms |
| Studio Home, v22 | 329 ms | 403 ms | 52 ms | **114 ms** |
| Handwriting, v21 | 181 ms | 514 ms | — | 0 ms |
| Handwriting, v22 | 180 ms | **296 ms** | — | 0 ms |

- **The Studio Home costs more in v22.** DOMContentLoaded is about 60 ms later: six more scripts, mostly the engine, the new lessons and the journey code.
- About 60 ms more main-thread time falls in the second after load. The likely cause is the subject worlds loading and the portal canvas starting, but this was not measured separately. It is the cost of the new Home and was not optimised away.
- **What is not slower:**
  - the engine itself: 0.4 ms to compute all 35 states;
  - the Home render: about 10 ms;
  - the ink: 0.05 ms per frame.
- The experiences (about 120 KB) and the worlds load only when used.
- The Handwriting page loads faster than v21, because it no longer runs the old studio at start-up.

## D6. Not done, or limited

- **Content:** 10 lessons (2 new) and 15 experiences. No lessons yet in history, languages or social science.
- **Arabic:** the new Studio and Handwriting interface text has Arabic labels, but some long explanations fall back to English.
- **Handwriting:**
  - Recognition quality on students' own photos is unvalidated.
  - Arabic recognition is weak (Tesseract).
  - No real stylus hardware was available.
- **Insights:** the "improved after a visual" insight needs at least 2 answers before and 2 after on the same objective, so it will be rare at first. That is deliberate.
- **The D4 fixes are not yet live.** They are on the branch; the live site is at commit `ea28d74`.
