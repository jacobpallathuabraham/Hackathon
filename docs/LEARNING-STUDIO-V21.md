# ERLY v21: the Learning Studio replaces the Reading Studio

**Branch:** `claude/erly-hackathon-website-8txbtd`. Not deployed: the live site changes only when you say "Deploy". Screenshots are in [`v21-shots/`](v21-shots/).

## 1. The original website: recovered and protected

- **Baseline.** Commit `7bd45d8` (v19) is the version that was live before the v20 overhaul.
  - It had a Reading Studio and a first Learning Studio side by side.
  - Outside the Studio, v19 changed only version strings and one added "Learning Studio" link compared with v18.
- **v20 reverted.** The v20 overhaul is removed from this branch: the new dashboard, the Handwriting and Growth Plan rebuilds, the site-wide interaction layer, and the gateway and wording changes.
  - The first commit of this work (`4abbad3`) makes every file byte-identical to `7bd45d8`. `git diff 7bd45d8 4abbad3` is empty.
  - v20 is preserved on the branch **`backup/v20-overhaul`** on GitHub. This environment's git proxy refused to push tags; the branch and the commit hashes are the backup.
- **What changed outside the Learning Studio (checked by script).** 24 files outside the Studio changed. No CSS file outside the Studio changed, and no layout markup changed. Each change is one of:
  - **Label renames:** "Reading Studio" becomes "Learning Studio" (and the Arabic equivalent) as text only. 42 of the 43 changed lines in the site scripts and gateway pages are pure renames.
  - **One link fix:** the Growth Plan timetable's "Read" link pointed at the removed section (`student.html#reading`). It now goes to `learn.html#/read`.
  - **Student page:**
    - the duplicate "Reading Studio" nav entry is removed (the existing "Learning Studio" entry stays);
    - the two "Open the Reading Studio" buttons became links to the Learning Studio, with the same classes and look;
    - the Reading Studio section's copy now describes the Learning Studio; the layout and the `#reading-studio` anchor are unchanged, so old links still land there.
- **Pixel check.** The pages were captured again with the same settings and compared:
  - Growth Plan: identical (0 differing pixels).
  - Handwriting, games and the university homepage: differ only where animations ran (orbiting icons, the intro, ambient backgrounds). Two captures of the same build differ in the same way.
  - Student page: differs only in the changed labels.
- **v20 fixes that are not on this branch.** They touched protected pages, so they stay on the backup branch and can be re-applied individually if you want them:
  - the scroll-container fix on the Growth Plan, Handwriting and Games pages;
  - 24 px quote-dot targets and brand-line contrast on the university homepage;
  - the neutral wording for the indicators ("Forum Ghost", "11th-hour spike" and so on).

## 2. The new Learning Studio (`learn.html` only)

The design ("Atelier": ink on paper, one lapis accent, a colour per subject) lives in `assets/css/learn-atelier.css`. Every rule is scoped to `body.at`, so it cannot reach any other page. It works in light and dark mode.

- **Shell** (`ls-shell.js`):
  - a slim top bar naming the nine places (Home, Read, Learn, Explore, Watch, Practise, Revise, Notebook, Paths), with an ink line that slides to the current one;
  - a ⌘K / Ctrl+K / "/" palette that searches lessons, sections, readings, guides, worksheets, references, videos, the 174 models, paths and your notes;
  - the Noor margin;
  - on phones, a five-item dock and a "More" sheet.
- **Home** (`ls-home.js`):
  - a sentence of verbs instead of a grid ("I'd like to read · learn · watch · explore · practise · revise · write notes · ask Noor");
  - a shelf built only from real activity: lesson position, reading progress, video time, models, practice;
  - an atlas of eight subjects, each with a drawn emblem and real counts;
  - "Try this now": a live wave-interference interactive, computed only when a slider moves;
  - today's real figures.
- **Subject pages.** Paths, lessons with progress, readings, videos and the subject's models. Where no model exists, the page says so.

## 3. Reading & Resources: where the Reading Studio lives now (`ls-read.js`)

The existing reader (`studio.js`) was kept whole:
- PDFs read on the device with pdf.js, plus an original-page view;
- highlights in four colours with notes, bookmarks and search;
- zoom and pinch zoom, read-aloud with voices and speed;
- fonts, size, spacing, page tints, line focus, width;
- summaries, key terms, flashcards, quizzes, a focus timer, immersive and full-screen modes.

Around it, the library offers:
- **Course readings** (6).
- **Study guides** (8): built from each lesson and opened in the same reader, so read-aloud, highlights and Noor work on them.
- **Worksheets** (8): printable sheets made from each lesson's own questions.
- **References** (12): the open textbooks and sources the lessons cite. They are external and labelled.
- **Your files:** choose or drop a PDF or .txt. It is read on the device and never uploaded.
- **Also:** starred items, "Continue reading" and search.
- **Reading preferences:** font, size, line spacing, width, page tint and focus mode. They are applied to the reader and kept with the storage choice.

Changes to the reader:
- **Ask Noor menu.** Selecting text now offers seven ways to ask: Explain, Simplify, Give an example, Summarise, Difficult word, Revision questions, Step by step. The passage always travels with the question.
- **Storage choice.** Saving respects the Learning Studio choice: with "Just this visit" the reader writes nothing.
- **Delete everything.** This also deletes the reader's highlights, notes, bookmarks and positions.
- **New API.** `addDoc`, `openFile`, `progressOf` and `forget`.

## 4. The other environments

These are the v19 engines, kept because they worked, now in the new design:
- **Interactive lessons** (8): objectives, explanations, figures, live models, worked examples, 15 question types with feedback, summary and revision. New: **bookmark a section**, which then appears under Notebook → Bookmarks.
- **Visual Learning Lab:** 174 computed models. They are now **loaded on first use** instead of at startup.
- **Video:** ERLY videos with captions, chapters, a clickable transcript, speed, bookmarks and timed notes.
- **Practice:** guided, independent and test modes, a mistake notebook and "Explain my mistake".
- **Flashcards:** spaced repetition with the reason each card is due.
- **Notebook:** rich text, maths, tags, search and folders.
- **Learning paths**, **My progress**, and **Privacy & data** (export, partial and full delete).

## 5. Noor in context

- **The Noor margin** slides in from the edge (a bottom sheet on phones) and closes after you ask.
  - It shows its context: your selection, the lesson section, the video and time, or the model.
  - It offers eight ways to ask: explain, simplify, teach step by step, give an example, quiz me, revision notes, compare two ideas, help with a mistake.
  - It shows whether Noor is answering **on this device or online**, using the companion's own label.
  - Only the question and the selected passage are sent: never notes, answers or history.
- **No API keys** are in the front-end, and nothing claims to be online when it isn't.

## 6. The Reading Studio is no longer a separate destination

Every way of opening it elsewhere on ERLY now goes to `learn.html#/read`. This is done in one place, `studio.js`, and covers:
- the student-page buttons and the preview;
- Noor's "open a reading / my PDF / the library";
- the command palette;
- the Support Pact feed and Insight.

A specific reading opens straight in the reader there. The old `#reading-studio` link still lands on its (renamed) section.

## 7. The Support Pact keeps working

The tracker recorded reading inside the Reading Studio. In the Learning Studio:
- **With an active pact:** the same `tracker.js` loads, and reading counts exactly as before.
- **Without one:** a tiny stand-in records nothing, which is the same outcome as the tracker without a pact. This avoids building its 14-day data on every page load.

Both cases are covered by tests.

## 8. Performance (measured)

Cold load of `learn.html#/home`, median of 5, v19 against v21. The local server has no network latency, so the byte saving matters more on a real connection than these timings show.

| | Scripts before load | DOMContentLoaded | Load | Home visible | Main-thread long tasks |
|---|---|---|---|---|---|
| v19 | 73 files, 2,688 KB | 254 ms | 311 ms | 339 ms | 56 ms |
| v21 | 63 files, 1,762 KB (−34%) | 239 ms | 327 ms | 353 ms | 53 ms |

How the saving was made:
- The Lab loads a few seconds after the page settles, or at once when you open Noor or the Lab.
- The page avoids backdrop blur.
- Nothing animates continuously on the page.
- Reduced motion is honoured, from the device and from the accessibility panel.

## 9. Tests (all run)

- **Unit:** `npm test` — 272 passing, 0 failing.
- **`tests/e2e/learning-studio-v21.e2e.js` (new) — 21/21.** It covers:
  - the lazy Lab;
  - the shell and home;
  - the storage choice, including that the reader writes nothing in "Just this visit";
  - reading persistence and resume;
  - the Ask-Noor menu with the passage attached;
  - study guides, worksheets and own files;
  - section bookmarks and the Noor margin;
  - the palette;
  - delete-all clearing reader data;
  - the Support Pact both without and with an active pact;
  - redirects from the rest of ERLY and a single nav entry;
  - the phone layout;
  - no network requests and no page errors.
- **`tests/e2e/learning-studio.e2e.js` (updated to the new shell) — 34/34.**
- **Accessibility:** axe-core 4.10 (WCAG 2.0/2.1/2.2 A and AA) on 18 Studio views × light/dark, including the reader, the palette and the Noor margin. **0 violations.**
- **Full end-to-end regression:** see the table below.

REGRESSION

## 10. Remaining and not done

- **Lesson and exercise content** stays the v19 demonstration set: 8 lessons, 79 practice questions, 3 ERLY videos, 6 course readings. No new lessons were invented.
- **Presentations and articles:** there is no slide or article content to show, so these appear only when a student opens their own PDF. No fake items were added.
- **Arabic:** the new interface text has Arabic for its labels. Some longer explanatory sentences fall back to English.
- **Screen readers:** a manual pass with VoiceOver or NVDA was not possible in this environment. Only automated checks (axe) were run.
- **v20 fixes** to protected pages are not re-applied (see section 1).
