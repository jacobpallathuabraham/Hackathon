# ERLY v18 — final report

**Date:** 15 November 2026 · branch `claude/erly-hackathon-website-8txbtd` · not deployed (deploy only on request).

The v18 brief covered four systems:
1. Noor universal visuals in normal chat, across the JEE Main/Advanced, NEET and undergraduate syllabus.
2. Natural voice and audio lessons on any topic.
3. A rebuild of Handwriting.
4. A rebuild of the Growth Plan.

The audit and defect register is in [`V18-AUDIT.md`](V18-AUDIT.md), and the chapter-by-chapter syllabus inventory is in [`V18-SYLLABUS.md`](V18-SYLLABUS.md).

All numbers below were **measured in this session** in headless Chromium against the local site:
- software WebGL;
- WebAssembly on the CPU;
- no AI provider configured.

Noor therefore ran on its device-only brain, so the visuals, voice, handwriting and plan results do not depend on an AI. Nothing below is estimated.

Status words used:
- **Validated**: checked against independent values or real data.
- **Tested**: automated test passes in a browser.
- **Implemented**: in the product, exercised by hand or by smoke tests only.
- **Partial**: some of the scope.
- **Planned**: not built.

---

## 1. Noor visuals across the syllabus (normal chat)

### What changed
- **The visual opens inside the reply in normal chat.** It is the same live model as the full Lab (Expand), and Noor's words are written from that model's computed state. Earlier visuals become snapshots that reopen in their saved state. *Tested.*
- **A response planner decides on every message whether a visual helps.** It decides from the concept asked about, not from trigger words. Factual questions ("Who discovered the electron?") get no visual. *Tested.*
- **The syllabus spec framework** (`assets/js/lab/syl-core.js`) lets one declarative spec define a model's:
  - parameters, selectors and toggles;
  - drawing, readouts and ODE integration (RK4);
  - 3D scene;
  - explanation and assumptions;
  - follow-up commands ("set k to 3", "double the mass").

  Every spec runs on the same harness as the Lab.
- **129 syllabus models**, in six files:

  | File | Subject | Models |
  |---|---|---|
  | `syl-math` | Maths | 27 |
  | `syl-physics` | Physics | 34 |
  | `syl-chem` | Chemistry | 21 |
  | `syl-life` | Biology and medicine | 14 |
  | `syl-applied` | Economics, statistics, engineering, computing, environment | 17 |
  | `syl-extra` | Remaining chapters: units, magnetism, transistor, experimental skills, p-block, organic, biotech, physiology, taxonomy | 16 |

  With the 42 earlier engines, Noor now has **171 computed visual models**. The registry has 264 concepts in 22 disciplines.
- **Chapter coverage** (from [`V18-SYLLABUS.md`](V18-SYLLABUS.md)):

  | Syllabus | Units | Model | Partial | Text |
  |---|---|---|---|---|
  | JEE Main Mathematics | 14 | 14 | — | — |
  | JEE Main Physics | 20 | 20 | — | — |
  | JEE Main Chemistry | 20 | 15 | 5 (p-block, d/f-block, haloalkanes, amines, biomolecules) | — |
  | NEET Biology | 10 | 5 | 4 | 1 (structural organisation in animals and plants) |

  Undergraduate subjects have selected models. Humanities, law, languages and arts are answered in words.

### Measured
| Check | Result | Evidence |
|---|---|---|
| Every syllabus model's chat question, typed in normal chat, opens **that** model inline, rendered, with an explanation | **129 / 129** | `tests/e2e/syllabus-chat.e2e.js` → `docs/bench/syllabus-chat.json` |
| Factual / non-visual questions with **no** forced visual | **15 / 15** | same |
| Benchmark scenarios executed in the browser (target 1,000) | **1,067** | `tests/bench/run-bench.js` → `docs/bench/visual-bench-results.md` |
| Accurate against independently computed values | **1,067 / 1,067** | same |
| Router picked the intended engine from the scenario's own question | **1,067 / 1,067** (28 misroutes found and fixed this round) | same |
| Changing a control changes the model's result | **594 / 594** scenarios with a control check | same |
| Renders (non-blank canvas / 3D) | **1,067 / 1,067** | same |

- **Validated.** The benchmark's expected values are computed in `tests/bench/scenarios*.js`, separately from the model code. Examples:
  - equilibrium conversions from the quadratic;
  - Nernst potentials;
  - Hardy–Weinberg frequencies;
  - LCR resonance;
  - beam bending moments;
  - present values.
- **Bugs the independent checks found and fixed this round:**
  - The equilibrium solver omitted a term when products are present at the start.
  - Orbital radial nodes were missed when they fell on exact zeros.
  - The 3s mean-radius range was wrong.
  - The beam's maximum moment ignored the load point.
  - The transistor transconductance had the wrong units.
  - Physics used a rounded gas constant.
  - "A ball is projected at 20 m/s … find its range" routed to *statistics*: "range" also means data range, and "projected" was not recognised. It now routes to projectile motion. Data questions still route to statistics.
  - Potential questions with a decimal distance ("0.5 m away") missed the point-charge model.
- **Benchmark subject counts are uneven**, and this is reported, not hidden. Mathematics, Physics and Engineering are over target. Statistics (30), Biology/Medicine (74) and Interdisciplinary (17) are under target. The total exceeds 1,000.
- **Limits:**
  - Benchmark question wordings are templated per model family, so routing is measured on clear wordings, not on every phrasing a student might use.
  - The syllabus unit titles were transcribed by hand; the NTA/NMC sites were not reachable from this environment.
  - JEE Advanced multi-concept problems rely on the problem engines (`lab-problems.js`), not on one model per question.

## 2. Natural voice and audio lessons

- **Neural voice:** Kokoro-82M (Apache-2.0) runs **in the browser** after one opt-in download of about 92 MB. Speech is generated on the device, so nothing said is sent anywhere to be spoken. The device voices remain the fallback and are one tap away. *Tested, 6 / 6* (`tests/e2e/neural-voice.e2e.js`):
  - nothing is downloaded until the student asks;
  - download progress, then the voice list grouped by accent and gender from the model card, then a preview;
  - **voices are genuinely different**: measured median pitch is **197 Hz** for female `af_heart` and **119 Hz** for male `am_michael`, and the audio is not silent;
  - maths and units are spoken ("metres per second squared", "x squared"), and markdown is dropped;
  - long replies stream phrase by phrase, prefetching the next phrase, with pause and resume;
  - switching back to the device voices is remembered.

  The fix found this round: the voice panel showed a stale state when the engine preference changed elsewhere. It now re-renders whenever it opens.
- **Audio lessons on any topic** (`assets/js/companion/audio-lesson.js`):
  - With an AI configured, the script is AI-written.
  - Without one, it is composed from the most relevant encyclopedia article. Up to 3 ranked hits are tried; lists, disambiguation pages and stubs are skipped. The teaching sentences are **quoted from the named source**, not invented.
  - Lab lines come from the computed model and are marked as such.
  - When no reliable source answers, the lesson says so instead of improvising.
  - The player has chapters, seek, speed, revision / detailed / continue versions, "ask Noor", and requests from normal chat.

  Result: **8 / 8 checks** (`tests/e2e/audio-lessons.e2e.js`; 50 topics drawn evenly from the registry, none special-cased).
  - **47 / 50** topic-specific lessons. In the other 3, the encyclopedia was rate-limiting this machine, and the student is told the source did not answer. Nothing was improvised.
  - **457 / 457** teaching sentences quoted verbatim from the cited article.
  - Player, revision / detailed / continue, "ask Noor", the request from normal chat and an honest refusal for an unknown topic all pass.
  - The test's word check flags "Reading a screw gauge → Micrometer (device)", which is in fact the right article.

  Fixes from the earlier run (6/8):
  - A topic with a colon ("Relative velocity: crossing a river") had matched a bridge-collapse article. The main phrase before the colon must now appear, and the search retries with that phrase alone.
  - Specialist pages such as "(quantum mechanics)" rank lower unless the topic asks for them. Generic qualifiers such as "(device)" are not penalised.
  - The revision, detailed and continue buttons closed the lesson before the new version existed. The lesson now stays until its replacement is ready.
- **Limits:**
  - The neural voices are English only; Arabic uses the device voices.
  - The download needs a capable device.
  - Without an AI, lesson quality is bounded by the source article.

## 3. Handwriting

- **A handwriting model replaces printed-text OCR for handwriting.** TrOCR-small-handwritten runs in the browser via transformers.js. Pages are split into lines with an ink-mass filter, and a repetition guard stops hallucinated text on blank strips. Word confidences come from the model's own token probabilities. Tesseract is kept for print.
- **Image tools:** flatten light, auto levels, denoise, rotate and crop.
- **Practice modes:** letters, words, tracing and goals, with a coverage measure.

**Validated on 150 real handwritten lines** (IAM test split, many writers), from [`docs/bench/handwriting-bench.md`](bench/handwriting-bench.md):

| | Handwriting model (v18) | Tesseract (v12–v17) |
|---|---|---|
| Line CER / WER | **15.2% / 25.4%** | 50.0% / 86.4% |
| Page CER / WER (3-line pages, segmented) | **6.5% / 12.4%** (30/30 pages split correctly) | 42.6% / 88.2% |
| Speckled photo, before → after the automatic fix | 84.1% → **8.5%** | — |
| Mean CER at confidence 80–100% / 0–59% | 5.1% / 45.7% (confidence is meaningful) | — |

- *Tested:* `handwriting-v18.e2e.js` (10/10) and `hand-rec` unit tests (9).
- **Limits:**
  - IAM is scanned forms, not students' phone photos, and results on students' own writing have **not** been validated.
  - About 2 s per line on a CPU.
  - Handwriting Check stays non-diagnostic: it reports legibility and recognition, never a condition.

## 4. Growth Plan

The two separate programmes on one page were replaced with one journey (`growth-sched.js`, `growth-studio.js`):
- **Onboarding**, with free-text constraints understood by clause ("no study after 9 pm on weekdays", "football Tuesday 5–7"). The parser is rule-based.
- **A constraint scheduler** built from the student's own availability, with spaced reviews.
- **An interactive timetable:** drag to move. A move that breaks a constraint is refused with the reason. Regenerating keeps the student's own moves, and a diff shows what changed.
- **Goal-linked exercises** that launch the right Lab model or practice.
- **Progress tracking and a weekly review,** with ICS and CSV export.

*Tested:* `growth-sched` unit tests (11) and `growth-v18.e2e.js` (15/15).

Limits: the free-text parser is rule-based (no AI needed); unusual phrasings fall back to asking.

## 5. Whole-site checks

| Suite | Result |
|---|---|
| Unit tests (`npm test`) | **257 / 257** |
| End-to-end regression, all 33 suites in `tests/e2e/` | **All pass.** Three failed only under CPU load (two digital-human lip-sync timing checks on software WebGL, run while the benchmark was going) and passed when rerun alone. `nav` and `v10` still pointed at the removed v10 Growth Plan; they now check the v18 plan (full coverage in `growth-v18`). |
| axe-core 4.10 (WCAG 2 A/AA), light and dark: home, student (with an inline model open), handwriting, Growth Plan, coverage, games, login | **No violations** after two contrast fixes (Growth Plan nav link, onboarding step labels). On the home page, axe flags text that is still fading in during the first ~2 s of the intro; it is clean once the intro ends. |

Accessibility:
- the voice download has a progress bar with ARIA values;
- every timetable session can be moved without dragging, using the Reschedule form (date and time fields, with a suggested free slot);
- an impossible move is refused with the reason.

Security and privacy:
- No API keys are in the frontend or the commits. The optional AI key lives only in the Cloudflare worker.
- No camera or mic is used without an explicit action.
- The neural voice and the handwriting model download only when asked, and then run on the device.
- Encyclopedia requests send only the topic words.
- There is no tracking.

## 6. Status summary

| Item | Status |
|---|---|
| Inline visuals in normal chat, planner, follow-ups | Tested |
| 129 syllabus models + 42 engines (171) | Tested in chat; values validated by the benchmark |
| 1,067-scenario benchmark | Validated (independent expected values) |
| JEE Main Maths / Physics chapters | Model for every unit |
| JEE Main Chemistry chapters | 15 Model, 5 Partial |
| NEET Biology units | 5 Model, 4 Partial, 1 Text |
| Undergraduate disciplines | Partial (selected models; humanities in words) |
| Neural voice (Kokoro) | Tested (pitch measured) |
| Audio lessons on any topic | Tested: 8/8; 47/50 lessons, 457/457 sentences quoted |
| Handwriting model, image tools, practice | Validated on IAM; not validated on students' photos |
| Growth Plan rebuild | Tested |
| Benchmark subject balance (Statistics, Biology, Interdisciplinary under target) | Partial |
| Models for the remaining Partial/Text chapters (descriptive inorganic, structural organisation, excretion, locomotion, plant reproduction) | Planned |
| Deployment of v18 | Not done; waiting for "Deploy" |
