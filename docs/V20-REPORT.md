# ERLY v20: delivery report

**Branch:** `claude/erly-hackathon-website-8txbtd`. **Not deployed**: the live site stays on v19 until you say "Deploy".

Acubins University is fictional. Every feature below is labelled by status:

| Label | Meaning |
|---|---|
| **live** | Works in the browser now |
| **demo** | Uses made-up demonstration data |
| **experimental** | Works, with stated limits |

The audit this answers is in [`V20-AUDIT.md`](V20-AUDIT.md). Screenshots are in [`v20-shots/`](v20-shots/):

- `before/`: the 56-load v19 sweep;
- `after/`: the same sweep on v20, plus flow screenshots;
- `compare/`: side-by-side images.

---

## Part A: Complete website overhaul (17 items)

### 1. Audit
- Source reading plus a scripted Chromium sweep: 14 pages × light/dark × desktop/phone = 56 loads.
- The prioritised inventory is C1–C4, H1–H7, M1–M5 and low items, in `V20-AUDIT.md`.
- **The after-sweep on the same 56 loads found:**
  - 0 page errors;
  - 0 horizontal overflow;
  - 0 failed same-site requests.
- The one console error came from YouTube thumbnail images on the student page, blocked by this build machine's network policy. That is a third-party host, not a site defect.

### 2. Defects fixed

| Audit item | Status | What changed |
|---|---|---|
| C1 Reading Studio as a second destination | **fixed** | Its reader is now "Reading & Resources" inside the Learning Studio. `#reading-studio` and `learn.html#/library` redirect to `learn.html#/read`. Every "Open the Reading Studio" button became a link. User-facing text in 25 files now says "the Learning Studio reader" (with the Arabic too). |
| C2 Handwriting lag | **fixed and measured** | See item 7 |
| C3 Dashboard too long | **fixed** | See item 9 |
| C4 Judgemental indicator names | **fixed** | See item 10 |
| H1 Box inside a box in "Ask Noor" | **fixed** | See item 5. The same defect was also found and fixed in Noor's main composer, login fields, gateway search and lab inputs. |
| H2 Notebook focus box | **fixed** | The writing area shows the caret only |
| H3 / H4 Handwriting layout and tools | **fixed** | See item 7 |
| H5 Growth Plan | **rebuilt** | See item 8 |
| H6 Inconsistent buttons and transitions | **fixed** | See item 4 |
| H7 Learning Studio look | **fixed** | See Part B |
| M1 No subject or topic level | **fixed** | Subjects and topic graph (Part B) |
| M2 Library sort, favourites, folders | **fixed** | Sort, star, collections, upload in the toolbar |
| M3 Reading modes | **fixed** | Standard, focused, comfortable, audio-supported and guided |
| M4 Fake "Pages" input in handwriting | **fixed** | Removed with the rebuild |
| M5 Three header styles | **remaining** | Pages still use their own headers. This is listed in item 17. |

**Found during v20 testing and fixed:**
- The `.quest-page` body (Growth Plan, Handwriting, Games) was its own scroll container, so the window never scrolled. Scroll restoration, `scrollTo` and anchors were affected. The cause was `overflow-x: hidden`, now `clip`.
- On desktop, the floating accessibility button covered the Learning Studio rail's "Profile" link, which could not be clicked.
- My new press style applied a CSS transform to SVG parts with `role="button"`. That overrode their own position, so nodes in Noor's interactive visuals jumped and could not be clicked. Caught by `companion-quality.e2e.js`.
- My "Stop animations" rule used 1 ms transitions instead of v9's 0.001 ms, which briefly delayed reading-setting changes. Caught by `a11y.e2e.js`.
- Growth Plan maths questions sometimes showed "undefined": a signed bit-shift produced a negative index. Caught by a new unit test.
- The weekly review left out a session done exactly seven days earlier. It now covers everything since the previous review.
- The handwriting verdict judged how much of the prompt was copied rather than how well the software read the page. A clean 96 % read was labelled "Inconclusive". The two are now reported separately.
- "1 readings" / "1 models" pluralisation; the Library now states real per-type counts; "Today Today" in the Growth Plan heading.
- Gateway (WCAG 2.2): quote dots were 10×10 px targets (now 24×24), and the gold brand line was 2.5:1 on the light header (now above 4.5:1).

### 3. Design system
- **Learning Studio:** dark academic tokens (ink-navy surface, warm gold accent, serif display type) with a matching light set (`learn-v20.css`).
- **Other pages:** keep the ERLY warm-paper palette, now with shared interaction tokens (`ui.css`: `--ui-ease`, `--ui-fast/mid/slow`, `--ui-ring`).
- Both themes are checked by axe on every page (item 12).

### 4. Interaction system (`assets/css/ui.css`, `assets/js/ui.js`, loaded on every page)
- One set of rules for:
  - press (a small translate and scale);
  - hover;
  - keyboard focus (one ring);
  - disabled;
  - loading (`aria-busy`: the label keeps its width and a spinner overlays it);
  - success and error flashes.
- Details, dialog and tab-panel open animations, and view transitions between pages.
- Reduced motion is honoured, both from the device setting and from the accessibility panel's "Stop animations".
- `ERLY.ui.busy`, `flash`, `swap` and `still` helpers.

### 5. Typing fields, fixed at the source
- **Single fields:** one focus treatment (border plus a soft ring), no stacked outline.
- **Composite fields** (a pill holding an input and buttons): the container shows focus and the inner field is bare. This applies through `.ui-field`, and through an explicit list of existing composites:
  - Noor composer;
  - gateway search;
  - login fields;
  - Learning Studio "Ask";
  - lab inputs;
  - header search.
- **Writing surfaces** (`.ui-write`) show no frame when you start typing.
- There is no destructive global reset: each rule is scoped by selector.
- Comparison: `compare/noor-composer-focus.png`.

### 6. Learning Studio
See Part B.

### 7. Handwriting Check, rebuilt (**live**; recognition **experimental**)

**Engine** (`hand-canvas.js`):
- A committed layer drawn once per finished stroke, and a live layer for the stroke in progress.
- The committed layer is never fully repainted while writing; only undo, redo, clear, resize and zoom repaint it.
- Coalesced and predicted pointer events, pen pressure, speed-based thinning for mouse and finger, quadratic smoothing, and DPI-aware backing stores.
- Palm rejection when a pen is in use; two-finger pan and pinch zoom.

**Measured** with `tests/bench/ink-bench.js`, drawing cost per pointer move (Chromium, 2× DPR):

| Strokes already on the page | v19 InkPad | v20 engine |
|---|---|---|
| 0 | 0.07 ms | 0.09 ms |
| 100 | 1.8 ms | 0.04 ms |
| 300 | 4.9 ms | 0.05 ms |
| 600 | **52.6 ms** (over 3 frames) | **0.03 ms** |

**Tools:**
- pen, eraser, move;
- undo and redo (Ctrl+Z / Ctrl+Shift+Z), and clear (which can be undone);
- three sizes and four ink colours;
- plain, ruled, grid and dotted paper;
- a letter-height guide;
- zoom from 100 to 300 %;
- keyboard shortcuts (P / E / H / + / − / 0).
- On phones the page switches to portrait, with comfortable line spacing.

**Flow:**
1. Get ready.
2. Write, or use a photo of paper.
3. Review exactly the black-on-white image the reader will see; the paper lines are left out.
4. Recognise: Tesseract runs in the page; the optional TrOCR model is downloaded only on request.
5. See the result: software confidence, per-word clear/unsure/unclear chips, a list of unclear words, a correction box, and a comparison with the copied sentences (a "found" count).
6. Try again, or read with the other reader.
7. Discard.

**Discard** removes strokes, undo history, photo and image copies (canvases zeroed) and recognised and corrected text. It then lists what was removed. Leaving the page also wipes the pad.

**Privacy text now matches the code:**
- Writing is held in memory only: never uploaded, never stored.
- The model download source is named.
- Only display preferences (`erly-hand-prefs`: paper, size, colour, guide) are remembered.
- The e2e test asserts that no non-GET request is made and that camera and microphone are never requested.

The verdict describes the **software's** reading and never the writer. The page says it cannot detect dyslexia, dysgraphia or any condition.

### 8. Growth Plan, rebuilt (**live**)

**Programmes:** six optional study-support programmes: reading, writing, maths, memory and revision, planning and organisation, and study confidence.
- Each has "what it is" text.
- The confidence programme says plainly that it is not therapy or counselling.
- A unit test fails the build if programme text mentions diagnosis, treatment, cure, disorder, IQ or deficit.

**Goals:** suggested goals plus your own, ticked off on the dashboard.

**Configuration:**
- days;
- session length (5–30 min) and number of weeks (1–12);
- difficulty (gentle, steady, stretch);
- format (mixed, mostly exercises, mostly writing and reflection);
- breaks between activities;
- review weekly or fortnightly;
- reminders:
  - a card on the ERLY dashboard;
  - a downloadable `.ics` calendar file.

  ERLY sends no notifications, and says so.

**Daily session workspace:** 23 activity types, each with feedback:
- multiple choice with passages;
- paragraph and step ordering;
- estimation with tolerance;
- percentages and fractions;
- look-cover-recall;
- number chunking;
- one-sentence summaries;
- timed free-writing;
- real-task breakdown;
- time-estimate checks;
- kinder-reframe choices;
- an "ask for help" template;
- a one-minute breathing pause;
- links to Learning Studio practice, flashcards, guided reading and the Handwriting Studio.

After the activities come optional breaks and a short reflection.

**Weekly review:** what helped, what got in the way and one thing to try. It can adjust the plan: keep, lighter, a bit longer, or more challenging.

**Programme management:**
- Pause and resume; the end date moves back while paused.
- Change, restart (clears activity), remove.
- A history timeline, and data controls (stop saving, delete all).

**Visual journey:** one dot per planned session. A session not done is shown as **open**, never "missed". There are no streaks, ranks or ability scores.

**Storage:** nothing is kept until you choose "Save on this device" (`erly-growth-v20`) or "Just this visit".

**The v18 timetable** (free-text week, scheduler, drag-to-move, export) is kept as the **Timetable** tab. Its 15-check e2e still passes there.

### 9. Student dashboard
- The page opens on **"What would you like to do?"**: eight action tiles.
  - Learning Studio
  - Ask Noor
  - Growth Plan
  - Handwriting Check
  - Learning Games
  - My Progress
  - Support Pact
  - Get support
- **Continue learning** comes from your real lesson progress; **Growth Plan today** appears only if you chose dashboard reminders.
- Support Pact, Insight, Get support, videos, games and Start-Ramp come next.
- Research, method, privacy, data and FAQ moved into a secondary **"How ERLY works"** area.
- Section numbers that no longer made sense were removed.
- The navigation was cut to six entries.
- Comparison: `compare/student-dashboard.png`, `compare/student-phone.png`.

### 10. Wording
These names were replaced in student, counsellor, report, insight and Arabic text:

| Old | New |
|---|---|
| "Forum Ghost" | removed |
| "Audio bailout" | removed |
| "Deadline proximity paralysis" | "Starting close to deadlines" |
| "11th-hour spike" | "Work close to deadlines" |
| "Friction fingerprint" | "Where study felt hardest" |

### 11. Other features reviewed
- **Noor:**
  - composer focus fixed (item 5);
  - a regression in interactive-visual dragging found and fixed (item 2);
  - `noor-*`, `chat`, `companion`, `visual-*` and `syllabus-chat` e2e suites re-run (item 15).
- **Learning Games, videos, Support Pact, Insight, Get support:** not redesigned.
  - Covered by the shared interaction layer, the 56-load sweep, axe and their existing e2e suites.
  - "Open the Reading Studio" buttons in the Support Pact live feed and Insight now open the Learning Studio reader.

### 12. Accessibility (WCAG 2.2 AA)
- **axe-core 4.10**, rule sets wcag2a/2aa/21a/21aa/22aa, run on 25 page states × light and dark = 50 runs.
  - The states include the Learning Studio environments, the handwriting surface and the Growth Plan setup form.
  - **0 violations** after fixing the gateway target-size and contrast issues.
  - An earlier run also flagged the gateway's opening animation. A rerun after the intro finished was clean, so those were mid-fade values.
- Other checks:
  - keyboard paths through rail, tabs, toolbars and order-exercise move buttons;
  - live regions for feedback;
  - step indicators with `aria-current`;
  - focus moves to the new heading after each view change;
  - 24 px targets.
- Limitations are listed in item 17.

### 13. Performance
- The handwriting measurements are in item 7.
- Learning Studio views render client-side from local data. View transitions are CSS-only and switched off under reduced motion.

### 14. Privacy and honesty
- No API keys in front-end code.
- No camera or microphone without an explicit action. The handwriting e2e asserts `getUserMedia` is never called.
- No silent uploads: the handwriting and Growth Plan e2e tests assert there are no non-GET requests.
- Storage is opt-in for the Learning Studio and the Growth Plan.
- No ability scores, no diagnosis and no inferred conditions.

### 15. Testing (actually run)

**Unit tests:** `npm test` gives **283 passing, 0 failing**, including the new Growth Plan unit suite (11 tests).

**New or updated end-to-end suites:**
- `handwriting-v20` 16/16 (new);
- `growth-v20` 16/16 (new);
- `learning-studio` 34/34 (updated to the new shell);
- `growth-v18` 15/15 (now opens the Timetable tab);
- `a11y` and `nav` (updated for the removed ticker and the new Growth Plan landing view).

**Full regression** of every e2e suite: see the table below.

**Retired, kept for reference:** four suites in `tests/e2e/retired/` that drove the removed v12–v19 handwriting interface, with a README explaining their replacement.

**Full regression run** (`tests/e2e/*.e2e.js`; `audio-lessons` and `neural-voice` need large model downloads and were not run):

REGRESSION_TABLE

### 16. Before and after screenshots
- `docs/v20-shots/compare/`:
  - `student-dashboard.png`
  - `student-phone.png`
  - `learning-studio-home.png`
  - `lesson.png`
  - `handwriting.png`
  - `growth-plan.png`
  - `noor-composer-focus.png`
- Flow screenshots in `after/`:
  - `handwriting-{intro,write,review,result,done}`
  - `growth-{empty,setup,programme,activity,break,reflection,dashboard,review,history}`
  - `student-hub`

### 17. Remaining and known limitations
- **Headers (M5):** pages still use three header styles. They work and are accessible, but are not yet unified.
- **Growth Plan language:** the interface is in English and Arabic. Exercise content (passages, questions) is English only.
- **Handwriting:** the TrOCR reader is English only. Arabic and mixed pages use Tesseract. Recognition quality on real handwriting is limited; the v18 IAM benchmark numbers still apply.
- **`human3d.e2e.js`:**
  - It passes when run alone on v20.
  - In the full batch run, its lip-sync latency check (median under 200 ms on software WebGL) is load-sensitive. The v19 build failed the same check in this session (231 ms), so this is not a v20 change.
- **axe** tests automated rules only. A manual screen-reader pass (VoiceOver or NVDA) was not done in this build environment.

---

## Part B: Learning Studio reimagination (12 items)

1. **Reading Studio retired as a destination.**
   - Its PDF/text reader (`studio.js`) is the engine of **Reading & Resources**.
   - In "just this visit" mode it now stores nothing.
   - Old links (`#reading-studio`, `#/library`, `data-studio` buttons) lead to `learn.html#/read`.
2. **Visual direction:** dark academic. Ink-navy surfaces, warm gold accent, Fraunces display type, quiet hairline sections instead of boxed cards. A matching light theme.
3. **Shell:**
   - An 84 px icon rail with labels;
   - breadcrumbs;
   - universal search (⌘K or "/"; an ARIA combobox over subjects, topics, lessons, readings, videos and models);
   - environment tabs;
   - demo banner;
   - on phones: a bottom bar plus a "More" sheet.
4. **Home:**
   - hero "A new way to understand everything.";
   - quick access: Read, Watch, Explore, Practise, Revise, Ask Noor;
   - Continue learning (lessons and reading progress);
   - Explore subjects (8, each with its own drawn art and hue);
   - Suggested next, Your progress (real counts only) and Discover.
5. **Subjects and topic graph:**
   - Subject pages group every resource by subject.
   - Topic pages (for example `#/topic/the-heart`) link the lesson, models, video, readings, practice questions, notes and flashcards for one idea.
6. **Six environments:**
   - **Reading & Resources:** library, readings and saved items, with reading modes.
   - **Interactive Lessons:** each lesson section now says what you are learning, why it matters, what to do and what comes next.
   - **Visual Lab:** 174 computed models.
   - **Video & Audio:** "Watch & Listen", with audio lessons.
   - **Practice & Revision:** practice, flashcards and mistakes.
   - **Study Workspace:** notebook, paths and progress.
7. **Library:**
   - search;
   - subject filter;
   - type chips (lessons, readings, textbooks, videos, interactive and 3D models, diagrams);
   - sort;
   - stars;
   - collections;
   - "open your own PDF or text" in the toolbar;
   - real per-type counts.
8. **Noor in context:** "Ask" from lessons and readings carries the current section. The "Explain my mistake" e2e check passes.
9. **First-time privacy choice:** a compact panel under the hero, not a full-screen card. Options: Save on this device, Just this visit, or Explore with demo data, with "What exactly is stored and sent?" one click away.
10. **Mobile:**
    - no sideways scroll on home, topic, read or lesson (390 px);
    - the bottom bar;
    - a "More" sheet that hides the floating buttons while open.
11. **Acceptance tests:**
    - `learning-studio.e2e.js` 34/34 on the new shell;
    - a smoke test of 21 routes with 0 errors;
    - axe clean on 10 Learning Studio states in both themes.
12. **Screenshots and remaining:**
    - `compare/learning-studio-home.png`, `compare/lesson.png`, and `after/desktop-*-learn_html*.png`.
    - Lesson cards now carry their subject's art too.
