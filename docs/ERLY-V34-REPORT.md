# ERLY Learning Studio v34: Knowledge Map rebuild, subject interface, 3D flashcards, assessments, motion system

Branch: `claude/erly-hackathon-website-8txbtd`. **Not deployed.**

Each part below is marked as one of:

- **Implemented + tested**: covered by an automated browser test that was run and passed.
- **Implemented, checked by eye**: verified in screenshots or a manual browser session only.
- **Not done**.

## 1. Files inspected

**Pages and modules**

- `learn.html`: the page shell, script order and stylesheets.
- `ls-core.js`: the router (`LS.route`, the `leave` event, the error boundary) and the store.
- `ls-curriculum.js`: levels, subjects, courses, chapters, prerequisites, cross-subject `LINKS`, progress (`LS.prog`) and the validator.
- `ls-universe.js`:
  - the old `#/constellation` canvas;
  - subject world pages (`#/world/<s>`);
  - chapter pages, the learning path, curiosity and explore.
- `ls-decks.js`: flashcard study modes and chapter assessments.
- `ls-decks-data.js`: decks and assessment items.
- `ls-nav.js`: breadcrumbs and Back.
- `ls-shell.js`: the top bar, search palette and Noor dock.
- `ls-motion.js`: the existing entrance and stagger motion.
- `ls-revise.js`, `ls-practice.js`, `ls-srs.js`.
- The experience modules `ls-exp*.js` and `ls-x-*.js`. All 84 experiences were opened in the browser; see §11.

**Stylesheets**

- `learn.css`, `learn-atelier.css` (design tokens), `learn-v29.css` (the old map, tabs, flashcards), `learn-v26.css`, `learn-kit.css`.

**Tests**

- `tests/e2e/*`, especially `learning-studio-v29.e2e.js`, which covers the constellation, flashcards and assessments.

## 2. Files changed

| File | Change |
|---|---|
| `assets/js/learn/ls-kmap.js` | **New.** The Knowledge Map (`#/constellation`, also `#/map`). |
| `assets/css/learn-v34.css` | **New.** Motion tokens, map, subject interface, 3D flashcards, assessments. |
| `assets/js/learn/ls-universe.js` | Subject world page rewritten (tabs, overview, chapter journey, level filter); `LS.WORLD` exposed; "Constellation" renamed "Knowledge Map" in user-facing text. |
| `assets/js/learn/ls-decks.js` | Flashcard study screen rewritten (persistent 3D card, turn lock, slide transitions, Difficult mode, one keyboard listener); assessment rewritten (navigator, drafts, Previous, finish confirmation, review). |
| `assets/js/learn/ls-nav.js` | Breadcrumb label "Knowledge Map". |
| `learn.html` | Loads `learn-v34.css` and `ls-kmap.js`; cache versions bumped. |
| `tests/e2e/learning-studio-v34.e2e.js` | **New** suite (15 tests). |
| `tests/e2e/learning-studio-v30.e2e.js` | The first test waits for a full frame before reading draw calls (timing only). |
| `tests/e2e/learning-studio-v29.e2e.js` | Map selector updated to the new map; flashcard waits lengthened for the new 240 ms card slide. |
| `tools/perf-v34.js`, `docs/bench/v34-perf.json` | Interaction measurements. |
| `docs/img/v34/*.jpg` | 16 screenshots. |

## 3. Knowledge Map redesign

### What was wrong

The old map was a single canvas.

- Fifty chapter dots sat in eleven loose clusters around a ring, inside a mostly empty frame.
- All 21 cross-subject links (dashed gold) and every prerequisite line were drawn at once, so long lines crossed the whole map.
- Subjects with one chapter (History, Languages, Social Science) looked like stray dots.
- Information appeared only as a tooltip pinned to the bottom-left corner.
- Keyboard use meant stepping through all 50 chapters with the arrow keys.

### The new structure: an atlas of subject regions, each laid out as a path

- **Eleven subject regions**, each with:
  - a name, glyph and colour;
  - a chapter count, plus how many chapters are explored and mastered;
  - a progress bar.
- **Region size reflects real content.** Mathematics has 15 chapters and Physics 11, so they are large; History, Languages and Social Science have one chapter each and get compact, complete-looking tiles. Nothing is invented to fill space.
- **Regions are packed into shelves.** The shelf width is chosen per screen so the map fills the stage: wide on a laptop, tall on a phone. It is recomputed on resize.
- **Inside a region, chapters form a left-to-right path.**
  - Column = prerequisite depth within the subject, so "start here" chapters are on the left.
  - Row = curriculum order.
  - In-subject prerequisites are short curves between neighbouring columns, so they do not cross the map.
  - A test checks that no two chapters overlap and that each chapter stays inside its region.
- **Cross-subject relationships are hidden by default.** There are two kinds: prerequisites in another subject (4, solid, pale) and the curriculum's named related ideas (21, dashed gold, each with its reason).
  - They appear for the selected subject or chapter.
  - "Show all connections" reveals all of them at once.
  - No relationship is invented: every line comes from `ch.prereq` or `LS.curriculum.LINKS`, and the test checks the counts against the data.

### Interactions

- **Subject:**
  - the camera eases (≈ 520 ms, cubic in-out, with zoom interpolated geometrically) to fit the region;
  - other regions dim;
  - the panel shows the description, real progress, the chapters in order (each selectable), the subjects it connects to, and "Open subject".
- **Chapter:**
  - the chapter, its prerequisite chain (across subjects), its direct dependents and its linked chapters stay lit; everything else dims;
  - the relevant lines are emphasised;
  - the panel shows status, level and time, the reason it matters, its concepts, "Needs first", "Leads to", connected ideas in other subjects (with the reason), and buttons to open the chapter, its flashcards or its chapter check;
  - a second activation (click, Enter or double-click) opens the chapter.
- **Concept:** concepts are the chapter's real concept list.
  - Selecting one shows its parent chapter.
  - If a definition, concept or formula flashcard in that chapter mentions it, that card is shown as the explanation.
  - It lists the other chapters that teach the same concept, found by exact match across the curriculum.
  - No explanation is written for concepts without such a card. The panel says the chapter's flashcards and lesson explain it.
- **Navigation:**
  - wheel and trackpad zoom around the pointer;
  - pinch zoom; drag to pan;
  - zoom in, zoom out, Overview and "Show all connections" buttons;
  - keyboard: Tab moves through subject headers and chapters, Enter selects then opens, arrows pan, + and − zoom, 0 returns to the overview, Escape steps from chapter to subject to overview.
  - Navigation never depends on dragging alone.
- **Search:** finds subjects, chapters and concepts; arrow keys and Enter choose a result, and the camera flies to it.
- **Far zoom:** when the map is too small to read chapter titles (the overview on most screens), regions show a large name and their chapter count instead of unreadable text.
- **Panel:**
  - on screens 760 px or wider, a right-hand panel that slides in; the camera keeps the selection clear of it;
  - narrower than that, a bottom sheet (up to half the stage), with the selected chapter kept visible above it.
- **Legend:** a collapsible key (status markers, the three line types, what a region means).
- **First-visit tip:** a one-line tip that disappears on dismiss or on the first selection or drag, and never comes back on that device.
- **List view:** the accessible list of all chapters and links below the map is kept.

## 4. Navigation and layout (subject interface)

- **Tabs swap only the panel.** The old code rebuilt the entire page on every tab click, restarting the header's animated canvas.
- **A sliding indicator** marks the active tab. It is positioned with transform and width, and re-measured on resize.
- **Each tab shows a count** that is real for the current level.
- **ARIA tabs pattern:** roving tabindex, Arrow/Home/End keys, `aria-controls` and `aria-labelledby`.
- **On a phone the tab row scrolls horizontally inside the bar.** A v34 bug, where the tab bar was 811 px wide on a 390 px phone, was found by the phone test and fixed.
- **The level selector** is restyled and integrated.
  - It now filters every tab. Before, Experiences and Practice ignored the level.
  - A note shows "Showing Grade 11 · 3 of 6 chapters", with a "Show all levels" button.
- **Tab and level are remembered per subject** when you leave and come back.

## 5. Each section

- **Overview:**
  - the subject's description;
  - a prominent next step: "Continue where you were" (an exploring chapter) or "A good place to start" (the first not-started chapter whose prerequisites are done);
  - a progress ring with explored and mastered counts from real data;
  - items opened recently in this subject;
  - what the subject contains (counts) and a link to the Knowledge Map;
  - the course paths.
  - Staggered entrance.
- **Chapters:** a numbered journey grouped by course. Each chapter shows:
  - title, status, level, time and difficulty;
  - the reason it matters and its first three objectives;
  - prerequisites;
  - counts of experiences, cards and check questions, and your best score.
  - The connecting line and node style show progress.
- **Experiences:** tiles with time, title, hook, linked chapters, and "✓ opened" where true.
- **Practice:** lessons, chapter checks and spaced review.
- **Flashcards:** a deck tile per chapter with known and due counts and a bar.
- **Assessments:** a tile per chapter with question count, best score, attempts and mastery.

## 6. Flashcard flip

### The bug

The old flip called `draw()`, which replaced the card's HTML. The new element arrived already flipped, so the CSS transition could never play: the switch was instant.

### The new card

- **One persistent element.**
  - `.fc3` provides the perspective (1600 px).
  - `.fc3__card` is the `<button>` that rotates: `transform-style: preserve-3d`, `rotateY(180deg)` when flipped, 620 ms with `cubic-bezier(.45,.05,.2,1)`.
  - The front and back faces share one grid cell, so the card is always as tall as its longer side and nothing clips.
  - The faces use `backface-visibility: hidden`; the back is pre-rotated 180°, so it reads the right way round. The test multiplies the two transforms and checks the result is the identity.
  - A tiny `translateZ` prevents z-fighting flicker.
- **One flip at a time.** Clicks, taps or keys during a turn are ignored, so a double-click cannot flip it back.
- **Light sweep:** a soft sweep of light crosses the card during the turn. The card lifts slightly on hover (on devices that can hover). There are no particles or glow.
- **Card-to-card:** the old card slides out and the new one slides in (280 ms); navigation is locked during the slide.
- **Input:**
  - click, tap, Space or Enter flip;
  - ← → move between cards; swipe works on touch;
  - 1, 2 and 3 mark the card after flipping.
  - Hover never flips.
- **Accessibility:**
  - the button's label alternates "Question: …" and "Answer: …", and a live region announces the revealed side;
  - reduced motion (the system setting or the Studio's still mode) replaces the rotation with a quick cross-fade.
- **Progress:**
  - a strip of squares shows each card's mark;
  - a new **Difficult** mode collects cards marked uncertain or needs-practice;
  - the summary tallies all four states and offers "Revisit difficult cards";
  - position per mode is still remembered.
- **Keyboard bug fixed:** every mode switch used to add another document `keydown` listener, so Space flipped twice and cancelled itself. Now there is exactly one listener per screen, removed on leave.
  - A second bug was found by the test and fixed: the key handler thought the hidden search palette was an open dialog, so marking keys were ignored.

## 7. Motion system

Motion is defined as tokens on `body.at` in `learn-v34.css`:

- **Durations:** `--m-fast` 160 ms, `--m-base` 280 ms, `--m-slow` 520 ms, `--m-flip` 620 ms.
- **Easing curves:** `--e-out`, `--e-in-out`, `--e-flip`.
- **Stagger:** 40 ms, capped at 8 items.
- **Shared entrances:** `s34-in` and `s34-stagger`.
- **Properties:** everything animates transform and opacity only, plus colour and border on hover. Nothing animates layout properties per frame.
- **Reduced motion:** under reduced motion or still mode, every token collapses to 1 ms.
- **Map camera:** a single requestAnimationFrame loop that runs only while a move is in progress (no idle loop), and is cancelled on leave.

## 8. Performance

Performance comes from the design, not from removing features:

- **Map:** SVG with about 50 chapter groups and 70 lines. There is no canvas redraw loop; the old one redrew on every pointer move. Camera changes update one transform attribute.
- **Subject page:** a tab switch renders only the panel HTML, not the header canvas.
- **Flashcards:** a flip is a class toggle (no re-render).

Measured numbers are in §12.

## 9. Accessibility

- **Map:**
  - `role="application"`, with a description and keyboard instructions;
  - every chapter and subject header is a focusable `role="button"` with a full label (status and prerequisites);
  - focus follows selection;
  - the search is a combobox with `aria-activedescendant`;
  - the panel updates through `aria-live`;
  - the list view is kept;
  - progress states use shape (○ ◐ ✓) as well as colour.
- **Subject tabs:** the full ARIA tabs pattern.
- **Assessment:**
  - correct and incorrect answers are marked with ✓ or ✗ and a text label ("correct answer" or "your answer"), not by colour alone;
  - the finish confirmation is an `alertdialog`.
- **Flashcards:** as described in §6.
- **Not run: axe.** `axe-core` is not installed in this environment, so no automated axe audit was run this round. The existing `a11y` suite (the accessibility control centre) passes.

## 10. Bugs found and fixed

1. **Flashcard flip never animated:** every flip re-rendered the card.
2. **Stacked keyboard listeners on flashcards:** each mode switch added one, so Space toggled twice.
3. **Flashcard keys ignored:** the hidden search dialog was treated as open.
4. **Subject tabs rebuilt the whole page:** the header canvas restarted on every click.
5. **Level filter ignored on Experiences and Practice.**
6. **Knowledge Map unreadable:** crossing lines, stray-looking single-chapter subjects, a corner tooltip.
7. **(v34 regression, fixed before commit) Phone tab bar too wide:** 811 px on a 390 px screen.
8. **(Found by test) Map tip covered the top row of chapters on a phone:** it now dismisses itself on first use.
9. **(Found by test) Chapter selection on a phone stayed too zoomed out to read:** now at least 0.85× scale.

## 11. Tests run

All runs used Chromium through Playwright, headless.

### New suite: `learning-studio-v34.e2e.js` (15 tests)

**Map**

- 11 regions; each chapter exactly once; region chapter counts match the data; no overlaps; chapters inside their regions.
- In-subject and cross-subject line counts match the data; cross lines hidden by default; "Show all connections" reveals every one.
- Subject focus is eased (the camera is mid-animation 120 ms after the click), dims the other regions, and the panel shows real progress.
- Chapter selection: exactly the expected set of related chapters stays lit (computed independently from the data); the panel shows prerequisites, dependents and cross-subject links; a second click opens the chapter; Back returns to the map.
- Concepts: the panel shows the concept; a concept taught in two chapters lists the other one.
- Search finds chapters (keyboard) and subjects (Enter).
- Zoom buttons, wheel, drag, arrow keys, 0 (overview), Tab + Enter selection, Escape stepping out; no horizontal overflow.
- Phone (iPhone 13 emulation): a touch tap selects; the zoom is readable (≥ 0.84); the panel is a bottom sheet inside the stage with the chapter visible above it; no overflow.

**Subject page**

- Header element unchanged across all six tabs; indicator under each tab (< 2 px); arrow keys move between tabs.
- Chapter list equals the data for "all levels" and for Grade 11; tab count matches; Experiences filtered by level.
- Tab and level remembered after leaving; overview progress (0 / 6) and next step correct.
- Phone: the bar fits the screen; the Assessments tab is reachable and scrolled into view; the indicator follows it.

**Flashcards**

- Same element after a click; mid-turn rotation measured (cos θ strictly between −1 and 1); two more clicks during the turn ignored; ends at 180°; back-face net transform is identity, so it is not mirrored; Space turns it back.
- After switching modes, Space flips exactly once; marking moves on; ← and → work; the summary tallies marks; the Difficult mode holds the 1 card marked "needs practice".
- Touch tap flips; reduced motion means no rotation (computed transform `none`) and the back is shown; every card of a long deck (Bayesian reasoning) fits on a phone with no clipping and no overflow.

**Assessment**

- A draft answer is kept when jumping away and back; nothing is revealed before checking; Previous works.
- Finishing with unchecked questions asks first; the score equals correct ÷ total (1 correct of 4 → 25 %); the review lists every question; all correct → 100 % and "mastered" status recorded.

**Data integrity**

- `LS.curriculum.validate()` is empty.
- Every assessment item is well formed:
  - the multiple-choice answer index is in range, the key is accepted, no second option is accepted, and there are no duplicate options;
  - numeric items accept their key and reject a clearly wrong value;
  - every item has an explanation;
  - there are no duplicate prompts within a chapter.
- Every flashcard has both sides.

**Page errors:** none.

### Every experience, individually (`scratchpad` probe, not a committed test)

All 84 experiences were opened at 1366 px and again at 390 px. Each was checked for:

- page or console errors;
- an error screen;
- rendered content;
- at least one control;
- canvases with drawn pixels;
- horizontal overflow.

**Result: 0 problems at both widths.**

This checks that each experience loads and renders; it does not click through each one's full interaction. Interaction depth for most experiences is covered by the older suites (v24–v30).

### Regression

The results table follows in §14.

## 12. Browser and device details, and measurements

- **Environment:**
  - Playwright Chromium, headless, in a Linux container with no GPU;
  - viewports 1440 × 900 (desktop), iPhone 13 emulation (390 × 664, touch) and 1366 / 390 for the experience sweep.
- **Not tested:** no real phone, tablet or the ASUS ProArt P16 was available, and Safari and Firefox were not run.

Numbers are from `docs/bench/v34-perf.json`, produced by `tools/perf-v34.js`. They come from software rendering on a shared CPU, so treat them as a floor, not a claim about any particular device.

| Measurement | Result |
|---|---|
| Route render: Knowledge Map (hash change → next frame, 5 runs) | median 29.8 · p95 59.1 · max 59.1 ms |
| Route render: subject page (Physics) | median 23.8 · p95 73.2 · max 73.2 ms |
| Route render: flashcards | median 40.2 · p95 64.1 · max 64.1 ms |
| Route render: assessment | median 36.6 · p95 50 · max 50 ms |
| Map camera, focus a subject (frame intervals) | median 16.7 · p95 33.3 · max 33.3 ms (39 frames) |
| Map camera, focus a chapter | median 16.7 · p95 16.7 · max 16.8 ms |
| Map camera, back to overview | median 16.7 · p95 33.3 · max 33.4 ms |
| SVG elements in the map | 539 |
| Subject tab switch (click → next frame, 8 switches) | median 16.3 · p95 17.2 · max 17.2 ms |
| Flashcard flip (frame intervals over 800 ms) | median 16.7 · p95 16.7 · max 16.8 ms |
| Next card slide | median 16.7 · p95 16.8 · max 16.8 ms |
| JS heap after the run | 10.7 MB |

A 16.7 ms interval is 60 fps. The occasional 33 ms intervals (one dropped frame) occur at the start of a map camera move, when the panel content is rendered.

## 13. Screenshots

All are in `docs/img/v34/`:

- **Knowledge Map:**
  - `map-overview-desktop.jpg`
  - `map-subject-physics.jpg`
  - `map-chapter-waves.jpg`
  - `map-concept-frequency.jpg`
  - `map-chapter-light.jpg`
  - `map-overview-phone.jpg`
  - `map-chapter-phone-sheet.jpg`
- **Subject page:**
  - `subject-overview.jpg`
  - `subject-chapters.jpg`
  - `subject-experiences.jpg`
  - `subject-assessments.jpg`
- **Flashcards and assessment:**
  - `flashcard-front.jpg`
  - `flashcard-mid-turn.jpg`
  - `flashcard-back.jpg`
  - `assessment-feedback.jpg`
- **Phone and light-theme QA:** `phone-and-light-qa.jpg`

## 14. Regression results

| Suite | Result |
|---|---|
| `learning-studio-v34` (new) | 15/15 |
| `learning-studio-v30` | 21/21 (one test made to wait for a full frame — see note) |
| `learning-studio-v29` | 18/18 (constellation selector → new map; flashcard waits 100 → 450 ms for the card slide) |
| `learning-studio-v28` | 21/21 |
| `learning-studio-v27` | 14/14 |
| `learning-studio-v26` | 14/14 |
| `learning-studio-v24` | 42/42 |
| `learning-studio-v23` | 18/18 |
| `learning-studio-v22` | 22/22 |
| `learning-studio-v21` | 21/21 |
| `learning-studio` (base) | 34/34 |
| `learn-inspect` | 14/14 |
| `lab` | 34/34, no page errors |
| `problems` | 14/14 |
| `visual-chat` | 18/18 |
| `nav`, `a11y`, `studio-noor` | all checks passed |

**How these were run.**

- The full set ran once, with v34 included. Two tests failed in that run, and both were fixed in the tests, not the product:
  - **v29 flashcards:** a fixed 100 ms wait no longer covers the new 240 ms card slide.
  - **v30 universe stats:** the first frame after `buildAll()` can be the one-draw-call sky bake. The test now waits for a full frame. The universe code is unchanged since v33.
- Re-run on their own after those fixes: v34 15/15, v29 18/18, v30 21/21.
- The rest of the full run passed at the counts shown above.

## 15. Remaining limitations

- **Concepts have no individual explanations** in the curriculum data. The map shows a matching flashcard where one exists and says so where none does; no explanations were written.
- **Not every experience was redesigned.** This round verified that all 84 load and render cleanly at two widths and kept their scientific content as is. The broader experience-by-experience visual and interaction redesign the brief asks for is not done.
- **Practice:** lesson practice questions (`ls-lesson.js`) and the Practice centre (`#/practice`) were not redesigned in this pass. The assessment redesign covers chapter checks.
- **No real-device testing, and no Safari or Firefox runs:** see §12.
- **No automated axe audit:** see §9.
- **The map's region packing changes with screen shape.** This is deliberate, so a region's position differs between laptop and phone; the in-region path order never changes.
- **Not deployed.**
