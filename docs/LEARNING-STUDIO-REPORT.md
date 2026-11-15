# ERLY Interactive Learning Studio — engineering delivery report

**Date:** 15 November 2026 · **Version:** v19 · **Branch:** `claude/erly-hackathon-website-8txbtd` · **Page:** `learn.html` (student sign-in required, like the rest of the student portal).

Acubins University is a fictional institution used to demonstrate ERLY. ERLY is not an officially deployed university service. All lessons, questions and videos are ERLY demonstration content, not official examination material.

**Status words used below:**
- **Tested** — an automated browser test exercises the behaviour and passes.
- **Implemented** — it works and was checked by hand or in a smoke test, but has no dedicated automated test.
- **Not built** — absent, and listed as such in the product.

---

## A. Repository audit

### What existed

The audit read the code, not just the screens.

| Area | Files | State found |
|---|---|---|
| Reading Studio | `assets/js/studio.js` (1,436 lines), `studio-content.js`, `study-tools.js` | A real full-screen reader. 6 demonstration course readings plus your own PDF/text via pdf.js, read on the device. Highlights, notes, search, read-aloud, glossary, quizzes, flashcards and a focus timer. Opens as an overlay on `student.html`. |
| Noor companion | `assets/js/companion/*` | A real chat with a provider abstraction (`ai.js`, `llm.js`): built-in device brain, an optional "Noor Online" key-less AI after consent, and an optional server gateway. Usage limits; the destination is shown beside the message box. `ERLY.companion.ask(text, {context})` attaches context. |
| Noor Lab | `assets/js/lab/*` | 170 computed models (maths, physics, chemistry, biology, applied). One live model at a time; `inline(host)` mounts it anywhere. |
| Videos | `assets/js/videos.js` | Attributed YouTube embeds (privacy-enhanced). No transcripts. |
| Audio lessons, neural voice | `audio-lesson.js`, `neural-voice.js` | Real (v18). |
| Handwriting, Growth Plan, Learning Games | separate pages | Real (v18); not touched here. |
| Tracking, consent | `tracker.js`, Support Pact | Tracking is recorded only under a signed Support Pact. There was no learning record for lessons or practice, because neither existed. |
| Back end | `server/` | Optional AI proxy and gateway — **not deployed**. The site is static on GitHub Pages. |

### What was retained

Everything above. The Reading Studio is unchanged; the Learning Studio opens it from the Library for the 6 readings and for your own files. Noor, the Lab, audio lessons and the accessibility panel are reused, not duplicated.

### What was changed

- `main.js` now stops after the shared bus, language and theme setup on pages without the student-page navigation. Before this, it threw an error on any such page.
- `student.html` links to the Learning Studio from the navigation and from the Reading Studio section.
- Asset versions were bumped to v19.

### What was removed

Nothing.

---

## B. Architecture

The Studio is a single page, `learn.html`, with hash routes such as `#/lesson/bio-heart/path`. It uses no framework: like the rest of ERLY it is vanilla JS on static hosting. Its modules live in `assets/js/learn/`.

| Module | Responsibility |
|---|---|
| `ls-core.js` | Consent-first storage, the learning record, demo separation, router, safe text and maths formatting, accessible dialogs, toasts |
| `ls-grade.js` | Answer checking for all 15 activity types; a hand-written maths-expression parser (no `eval`); unit-aware number parsing |
| `ls-schema.js` | Content schema and validator for lessons, blocks and questions |
| `ls-registry.js` | Content registry (`LS.addLesson`, `LS.addQuestions`). Invalid items are rejected and listed, never shown half-broken. |
| `ls-lessons-*.js`, `ls-bank.js`, `ls-figures.js` | Content: 8 lessons, a practice bank, original SVG figures |
| `ls-activities.js` | Interactive components for every question type |
| `ls-lesson.js` | Lesson renderer: sections, resume, blocks, summary, revision, cards, provenance, content reports |
| `ls-practice.js` | Practice Centre and the mistake notebook |
| `ls-srs.js`, `ls-revise.js` | Spaced repetition (pure logic) and the Flashcards & Revision screens |
| `ls-notes.js` | Notebook: rich text, concept maps, folders, tags, search, autosave, draft recovery, export |
| `ls-video.js` | Video Studio |
| `ls-lab.js` | Visual Learning Lab catalogue and model pages |
| `ls-noor.js` | Contextual Noor requests and the selection toolbar |
| `ls-intel.js` | Learning-pattern insights and recommendations (pure logic) |
| `ls-app.js` | Shell, Home, Library, Lessons, Paths, Progress, Noor Tutor, Profile & privacy, demonstration dataset |
| `assets/js/lab/syl-studio.js` | 4 new models: algebra balance, fraction bars, cell explorer, reaction balancing |
| `tools/make-learn-videos.js`, `tools/learn-videos/*` | Build pipeline for the ERLY-made videos |

### Lesson content structure

A lesson object has these fields:
- `id`, `v`, `title`, `subject`, `level`, `course`, `chapter`, `topic`, `mins`
- `objectives`, `prereq`, `formats`, `tags`
- `provenance`: `{ kind, author, reviewed, licence, sources }`, where `kind` is one of `erly | official | teacher | student | ai | demo`
- `a11y`
- `sections`: `[{ id, title, blocks }]`, where each block is one of `text | figure | math | example | callout | lab | video | audio | activity | reading`
- `summary`, `further`, `revision`, `cards`

Questions carry:
- `id`, `type`, `prompt`, `explain`, `difficulty`, `objective`, `hints`;
- per-option `why` and error `tags`;
- for numeric answers, a list of known wrong answers, each with its own explanation;
- the fields specific to their type.

Every item is validated on load, and a unit test answers every question with its own key.

**Adding a lesson means adding one object; no new page or code is needed.**

### Data model

One object is stored under the `localStorage` key `erly-learn-v1`:
- `consent`, `profile`, `settings`;
- `lessons` (progress per lesson);
- `attempts` (the latest 3,000), `mistakes`, `cards`, `notes`, `folders`;
- `recent`, `bookmarks`, `video` (positions and marks), `paths`;
- `dismissed` (insights and corrections), `formatUse`.

### AI integration

The Studio does not talk to any AI provider itself. It builds one focused request and hands it to Noor's existing companion, which already has:
- provider abstraction, consent and usage limits;
- an offline fallback;
- a visible label for where the request goes.

**Context is minimal by design.** Noor receives:
- lesson title, subject and section;
- the selected text (up to 1,200 characters);
- for a mistake, the question and the student's own answer.

It does not receive the learning history, profile, notes, other answers or insights. The Noor Tutor page shows the exact last request and context.

### Storage strategy

- Nothing is written until the student chooses **Save on this device** or **Just this visit** (memory only).
- Demonstration data is held in memory, clearly labelled, and never saved or mixed with real data.

### Privacy architecture

See section E.

---

## C. Implemented functionality

Each feature below lives at a Studio route.

| Feature | Where | How it works | Status |
|---|---|---|---|
| Navigation (desktop side nav grouped Learn / Practise / My work; tablet and phone drawer plus bottom bar) | all | Hash router; current page marked `aria-current`; focus moves to each new page's heading | Tested |
| Home dashboard | `#/home` | Continue, suggestions with reasons, revision due, mistakes, progress, paths, recent items, notes, saved items, lessons. **All from the record; empty state = onboarding.** | Tested |
| Library | `#/library` | 8 lessons, 6 readings (PDF reader), 3 ERLY videos plus 3 external, 174 models, your own PDF, audio lesson on any topic; search and type filter; provenance badges | Tested |
| Lesson engine | `#/lesson/:id/:section` | 8 lessons, 29 sections. Objectives and prerequisites, worked examples revealed step by step, live models, video, figures with "Ask Noor" and "Save diagram", read-aloud and chunking (settings), summary, revision, cards, further reading, provenance, "report a problem" | Tested |
| 15 activity types | in lessons and practice | Multiple choice, choose-all, true/false, fill-in, matching, ordering, diagram labelling, sorting, concept comparison, numeric (units, fractions, scientific notation), typed expression (checked by evaluation), graph reading, slider, short written answer, step-by-step. Every type: instructions, keyboard access, validation, feedback (immediate or delayed), explanation, wrong-option explanation, retry, recording | Tested |
| Visual Learning Lab | `#/lab`, `#/lab/:id` | Catalogue of 174 models with a coverage map. Model page: goal, assumptions, reset, Ask Noor, snapshot to notebook, related questions | Tested |
| Video Studio | `#/video`, `#/video/:id/:t` | 3 ERLY-made narrated MP4s (61–80 s, under 1.2 MB each). Captions (WebVTT), clickable transcript, chapters, replay a section, speed, full screen, keyboard shortcuts, bookmarks, timestamped notes, Noor section summary, questions that unlock as you watch, video flashcards, resume | Tested |
| Practice Centre | `#/practice` | Topic, mode (guided / independent / test), difficulty, number of questions, type, timer, mistakes-only. Unseen questions are picked first, topics are interleaved, worked examples appear in guided mode, per-topic summary at the end | Tested |
| Mistake notebook | `#/mistakes` | First and latest answers, correct answer and explanation, error tag, times revisited, "put right" status, try again, Explain my mistake, practise all open ones | Tested |
| Flashcards & revision | `#/revise` | Lesson suggestions, cards from mistakes or any selected text, create / edit / delete with undo, collections, transparent SM-2 schedule with a reason per card, keyboard review | Tested |
| Notebook | `#/notebook/:id` | Rich text (headings, bold, italic, highlight, lists, tables, maths, quotes), folders, tags, search, diagrams, formula collection, bookmarks, concept maps (drag plus text view), autosave, draft recovery, pasted HTML cleaned, export (Markdown, HTML, print/PDF), source links | Tested |
| Noor in context | everywhere | Selection toolbar (Explain, Simplify, Step by step, Another example, Save, Flashcard); Explain my mistake; diagram, equation, model and video-section requests; Noor Tutor page (compare, practice questions, revision notes, learning activity, revision plan) | Tested (request content); the AI's answer quality depends on the configured provider |
| Learning Paths | `#/paths` | 4 paths (biology, calculus, mechanics and electricity, chemistry) with prerequisites and mixed practice | Implemented |
| Learning intelligence | `#/progress` | Progress by subject and topic, lessons, weekly answers, chosen formats, and explainable insights. Separate evidence thresholds; "not enough evidence yet" list; dismiss / correct / restore | Tested |
| Personalisation | `#/profile` and Home | Student-stated profile (explanation styles, formats, pace, goals, help wanted). Goals reorder recommendations, prerequisites gate them, insights can switch on reading support. Every suggestion gives its reason and can be ignored | Implemented (recommendation logic unit-tested) |
| Profile, privacy & data | `#/profile` | Storage choice, insights on/off, data-flow table, export, view, partial and full delete | Tested |
| New Lab models | `#/lab/balance`, `fractions`, `cell`, `balancer` | Built on the shared spec engine; also usable in Noor's chat | Tested: values for balance and balancer; all 4 open from a chat question and render (syllabus chat suite) |

---

## D. Testing report

| Suite | Result |
|---|---|
| `tests/e2e/learning-studio.e2e.js`: the brief's acceptance list, in Chromium | **34 / 34** |
| `tests/unit/learn-content.test.js` | **6 / 6** |
| `tests/unit/learn-logic.test.js` | **9 / 9** |
| All unit tests (`npm test`) | **272 / 272** |
| axe-core 4.10 (WCAG 2.0/2.1/2.2 A and AA rules), 18 Studio screens × light and dark, with demonstration data loaded | **0 violations** (after the fixes below) |
| Existing site regression: all 34 other suites in `tests/e2e/` (excluding the 2 suites that download models or call Wikipedia) | **All pass.** Two failed in the full run and are resolved. `companion-quality` checked AI-composed visuals with a plant cell, which now opens the new cell explorer; the test now uses a leaf cross-section, which still has no model, and passes. `lab` failed one reply-wording check under CPU load and passed 34/34 when rerun alone. The syllabus chat suite includes the 4 new models: 133/133 open the right model inline, and 15/15 factual questions get no forced visual. |

`learn-content.test.js` checks that every lesson validates and every question is correctly answerable from its own key. It also checks that every listed wrong answer really is marked wrong, that there is a mix of question types (no more than 35% multiple choice), and that malformed content is rejected.

`learn-logic.test.js` covers the maths parser, units, the spaced-repetition rules ("well remembered" needs 3 successful reviews on 2 or more days), the insight thresholds, and 300 randomised activity patterns. In none of those patterns does an insight name a condition, a probability or a risk.

### What the acceptance tests do

- **Consent:** nothing is stored before the student chooses, and the choice is remembered.
- **Navigation:** every area opens, with a heading and no errors.
- **Dashboard:** with no activity there are no invented numbers.
- **Library and Reading Studio:** the library shows real counts, search filters, and the PDF reader opens a course reading.
- **Lessons:**
  - the lesson structure and provenance badge;
  - a wrong answer gets its own explanation, then retry, then correct, with both attempts recorded;
  - section completion survives a reload, and the student resumes in the right place;
  - diagram labelling works with tap-to-place and with lists;
  - ordering works with the buttons only;
  - the live model's control changes its value and reset restores it.
- **Every question type:** each accepts a correct answer and explains a wrong one. Step-by-step problems are tested separately.
- **Mistakes:** a targeted wrong-answer explanation, and the tagged mistake persists across a reload.
- **Practice:** guided mode, and test mode with delayed feedback.
- **Flashcards:** add, create, edit, delete with undo, review via keyboard, and the schedule's reason.
- **Notebook:**
  - autosave and reload;
  - Markdown export;
  - draft recovery;
  - HTML cleaning;
  - source reference retained;
  - concept map.
- **Video:** duration, captions track, clicking the transcript seeks, bookmark, timestamped note, chapters.
- **Lab:** coverage map; the algebra balance's maths and reset; the reaction balancer.
- **Noor:**
  - the exact keys of the context object;
  - no history included;
  - Noor opens with the attachment;
  - "Explain my mistake" asks for the misconception, not the answer.
- **Insights:**
  - "not enough evidence" when data is thin;
  - insights with evidence, alternatives and reliability once there is enough;
  - no forbidden wording;
  - dismiss with a correction.
- **Demo data:** never saved or mixed with the student's own data.
- **Privacy:**
  - export;
  - partial and full delete;
  - visit-only mode writes nothing;
  - insights off stops the analysis.
- **Secrets:** no secrets in the Studio code.
- **Keyboard:** skip link first, Enter navigates, dialogs trap focus, Escape closes them.
- **Reduced motion:** transitions and animations are removed.
- **Phone:** bottom bar, drawer, no horizontal scroll on 8 screens.

### Failures found by these tests, and fixed

- The Markdown export dropped text typed directly into the editor. The editor now starts with a paragraph, and the export handles bare text.
- `main.js` threw an error on pages without the student navigation.
- The language and theme buttons toggled twice.
- On phones, Noor's launcher and the accessibility button covered the bottom navigation.
- The schema check for short answers returned the model answer text instead of `true`.
- The heart diagram was redrawn: the aorta crossed the left atrium.
- The revision page stacked click handlers on every visit.
- axe found two problems:
  - the accent text colour measured 4.47:1, below the 4.5:1 minimum (a darker text token was added);
  - the violet label in dark mode, and a button nested inside a `role="math"` element.
- 4 test-harness mistakes were also corrected (same-page hash navigation, reading input values, and so on). These were not product bugs.

### Not tested

- **Screen readers:** no NVDA, JAWS, VoiceOver or TalkBack session was possible in this environment. Coverage is axe rules, the accessible-name checks inside axe, and keyboard tests.
- **Browsers:** only Chromium; Safari and Firefox were not run.
- **AI answer quality:** not measured. The Studio's contract with Noor is tested (what is sent), not what an AI replies.

---

## E. Security and privacy report

| Data | Stored | Sent | Used for | Retention |
|---|---|---|---|---|
| Lesson progress, answers, mistakes, flashcards, notes, bookmarks, profile, settings | This browser (`localStorage`, `erly-learn-v1`) only if the student chose "Save on this device"; otherwise memory | Nowhere | Resuming, the dashboard, revision, mistakes, insights (if on) | Until deleted; answers capped at the latest 3,000 |
| An "Ask Noor" request (question, selected text up to 1,200 characters, lesson title and section; for mistakes, the question and the student's answer) | Noor's own chat history, per its settings | To Noor's current brain. The built-in brain stays on the device. "Noor Online" (key-less third-party AI) or a configured gateway is used only after the student agrees in Noor's panel | Answering that request | Noor's settings |
| ERLY videos | — | Loaded from this site | Playback | — |
| External videos | — | youtube-nocookie.com, only when the student opens one | Playback | Their policy |
| Audio lesson topic words | — | Wikipedia's public API (existing v18 feature) | Finding a source | — |
| Hesitation timing, keystrokes, mouse movement, camera, microphone, emotion | **Not collected** | — | — | — |

- **Consent:** nothing is stored before the choice. Switching to "This visit only" deletes the stored key immediately.
- **Insights:** turning insights off stops all analysis at once.
- **Deletion:** the Profile page deletes answers and mistakes, flashcards, notes, lesson progress, format counts, or everything. Export gives the exact stored JSON.
- **Credentials:** a scan of `assets/js/learn` (in the e2e suite) finds no keys, and the existing site-wide scan in `companion-quality.e2e.js` also passes. The Studio holds no secrets; the AI configuration (`companion/config.js`) has none either.
- **Notes:** pasted or saved HTML is reduced to an allowlist with no scripts, handlers or images, and links are limited to `http(s)` and in-app routes. Content text is always escaped. The maths input is parsed by hand-written code, never `eval` or `Function`.
- **Not a compliance statement:** this describes what the code does. It is not a claim of UAE PDPL, GDPR or any other legal compliance; that requires legal and technical review for a real deployment.

---

## F. Deployment

- **Files:**
  - new: `learn.html`, `assets/css/learn.css`, `assets/js/learn/*` (19 files), `assets/js/lab/syl-studio.js`, `assets/media/learn/*` (3 videos, captions, chapter files, posters), `tools/make-learn-videos.js`, `tools/learn-videos/*`, 3 test files;
  - changed: `student.html`, `assets/js/main.js`, `assets/css/erly.css`, `assets/js/a11y.js`, `version.json`, asset version strings.
- **Build:** there is no build step. To regenerate the videos: `node tools/make-learn-videos.js`, which needs ffmpeg and downloads the open voice model once.
- **Deployment:** **not deployed.** It goes live on GitHub Pages only when you say "Deploy". This environment cannot load github.io (the network proxy refuses it), so after deploying I can confirm GitHub's Pages build status, not fetch the live page.
- **External setup (optional):** for answers better than Noor's built-in brain, deploy `server/gateway` or `server/llm-proxy.mjs` and set its URL in `assets/js/companion/config.js`. No key ever goes in the front end.

---

## G. Remaining work

### Coverage gaps (shown as such in the product)

- **Lab topics not built:**
  - ratio and proportion explorer;
  - skeletal and muscular systems;
  - cellular respiration;
  - microscopy-style exploration.
- **Undergraduate subjects:** these have models (economics, statistics, engineering, computing), but no Studio lessons yet.

### Content scale

8 lessons and 79 questions demonstrate the engine. Hundreds of lessons need authoring and subject-expert review; the registry, validator and tests are ready for that.

### Infrastructure dependencies

- **No accounts and no sync across devices:** data lives in one browser. A real deployment needs a back end with authentication, encrypted storage, access controls and retention policies.
- **Teacher-provided resources:** the schema supports the `teacher` provenance kind, but there is no teacher upload yet.

### Known limitations

- **Short written answers** are self-assessed against a model answer. The key-idea ticks are a word match, labelled as such.
- **One live model at a time:** opening a second model returns the first one to a "Show the model here again" button.
- **Videos** are English only; captions are generated from the narration script.
- **Studio interface** is partly translated into Arabic; lesson content is English only.

### Recommended next phase

1. Lesson authoring at scale, with a teacher review workflow using the "report a problem" records.
2. Teacher-provided resources.
3. A back end with accounts and sync.
4. Screen-reader testing with real users.
5. Safari and Firefox runs.
6. Measuring AI answer quality against the lessons.
