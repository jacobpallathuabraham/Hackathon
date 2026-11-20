# ERLY v23 — Audit, experience redesign and immersive Learning Studio

Branch: `claude/erly-hackathon-website-8txbtd`. **Not deployed.** The live site is still `ea28d74`, and v23 goes live only when you say "Deploy".

## A. Audit findings (before changes)

**Method.** Every page was loaded in Chromium (desktop 1280–1360 px and phone 390 px). I recorded console errors, page height, control counts and screenshots, then read the source for the Studio, the portal, the Growth Plan, Handwriting and the games.

| Area | Finding |
|---|---|
| Student portal | It read like a marketing landing page: 21,363 px tall with 271 controls (34,614 px on a phone). Nothing on it reflected the student's own work, and the first screen was an explainer hero. |
| Learning Studio: subject pages | Each subject was a pale banner over a grid of cards. The subjects looked alike, and nothing said "you are in physics". |
| Learning Studio: structure | There was no Subject → Topic → Learn/Explore/Practise/Revise layer. Lessons, experiences, practice and revision lived in separate areas. |
| Learning Studio: motion | Only the header strip moved. Routes swapped instantly, with no entrance, no shared elements and no motion tokens. |
| Physics | Newton's laws were a text lesson. There was nowhere to push, change mass or friction, or watch the evidence for F = ma build up. |
| Biology | There was no sense of scale between organism, organ, tissue, cell and organelle. |
| SVG interaction (site-wide bug) | A global press effect (`scale: .97` on every `[role=button]`) also applied inside SVG. There the scale pivots on the canvas origin, so a small target moved out from under the pointer between mousedown and mouseup, and the click landed on the background. |
| View transitions | When a transition was skipped (for example during another navigation), it raised an unhandled promise rejection that showed in the console. |
| Experience frame | When a simulation stopped by itself, the Play/Pause label still said "Pause". |
| Games | I played all 12 games through every round (screenshots in the session). Each one started, accepted input and finished with an end summary, with no errors. Rotate 3D's "same or mirror" answers are only fair if every shape is chiral; all five shapes checked chiral (a mirror shape is never just a rotation). **No defects found.** `checkins.js` contains streak/XP wording, but no page loads it. |
| Growth Plan | A wording scan found no streaks, guilt or penalty language ("streak" appears only in a comment saying there are none). 15/15 tests pass. |
| Handwriting Studio | Rebuilt in v22; 22/22 tests pass. Recognition is labelled as on-device and unvalidated. No defects found in this pass. |
| Console errors | None on any page before the changes. |

## B. Major changes

1. **A motion system for the Learning Studio** (`ls-motion.js`, CSS tokens).
2. **Subject worlds rewritten** (`ls-worlds.js`): a distinct scene per subject, a shared loop that pauses when off-screen, and Living / Still / Plain modes.
3. **Immersive world pages and a topic hub** (`ls-topic.js`): Subject → Topic → Learn / Explore / Practise / Revise.
4. **Newton's laws lab** (`ls-exp-newton.js`): a real interactive physics experiment.
5. **"Into the leaf"** (`ls-exp-bio.js`): a zoom from meadow to chloroplast across about a million times in scale.
6. **"Your desk"** on the student portal (`desk.js`, `desk.css`): the next step first, read from the student's own saved data.
7. **Noor from a topic hub**: two focused actions that send only the topic and its objectives.
8. **Bug fixes**: SVG press drift (site-wide), skipped-transition rejections, stale Play/Pause, a clipped Focus button and stale cache versions.

## C. Learning Studio

**Motion system.**
- Tokens: `--m-micro` 120 ms, `--m-ui` 220 ms, `--m-learn` 480 ms, with standard, emphasised and exit easings.
- The five levels map as follows:
  - micro: presses and hovers;
  - UI: tabs and the mode ink indicator;
  - learning transitions: route view transitions and the staggered rise of a page's main blocks;
  - environment: the worlds;
  - simulation: the experiences.
- Route changes use the View Transitions API. A subject or topic card morphs into the page hero through the shared `world-hero` name.
- With reduced motion, everything falls back to instant changes.

**Entrance.**
- Once per session: a quiet star field with the "ERLY · Learning Studio" mark.
- It ends by itself at 950 ms, or at once on any key or pointer press. It never blocks input.
- It is skipped entirely with reduced motion or when environments are Plain.

**Environment modes.**
- **Living** animates the worlds.
- **Still** draws one frame.
- **Plain** draws no world at all.
- The choice is saved in Studio settings.
- **Focus mode** (button, or Escape to exit) hides the sub-navigation, the world art, the Noor launcher and the accessibility button, and dims the spine. The Focus toggle stays visible so there is always a way out.

**Worlds.**
- Each subject has a pre-rendered background and a light foreground:
  - physics: deep space with a planet horizon and moon;
  - biology: drifting cells in light shafts;
  - maths: grid plane and curves;
  - chemistry: molecules;
  - geography: Earth;
  - history: dust in light;
  - English: drifting letters;
  - languages: greetings;
  - social science: a night city.
- One shared requestAnimationFrame loop, capped at 30 fps, with device pixel ratio ≤ 1.5.
- Worlds pause when off-screen or when the tab is hidden. Parallax applies only to heroes, in Living mode.

**Information architecture.**
- A subject page has a full-bleed hero with "Begin / Continue: topic" and "Enter the lab", then a numbered topic trail with objective dots, then experiences, read & watch, and models.
- A topic hub (`#/topic/<lesson>/<mode>`) has four modes:
  - **Learn**: objectives, the lesson steps with where you are, continue, and prerequisites.
  - **Explore**: experiences and lab sections. This tab appears only when there is something to explore.
  - **Practise**: objective cards.
  - **Revise**: summary, cards and revision questions.

**Newton's laws lab.**
- Four missions:
  - **inertia**: push for 1 s on a frictionless floor, then watch;
  - **F = ma**: runs are logged, and a is measured at t = 2 s;
  - **friction**: static friction up to μs·N, then kinetic −sign(v)·μk·N;
  - **collisions**: restitution formulas, with momentum and kinetic energy before and after.
- Surfaces are frictionless, ice, wood and rubber.
- The view shows force arrows (applied, friction, weight and normal, net), ticker-tape dots, a scrolling distance-marked floor and a live v–t graph.
- Keyboard: ← → push, Space run/pause, R reset.
- Predict-before-run and Apply questions come from the shared experience frame.
- Results were checked against hand calculations and are now asserted in the test suite:
  - 20 N on 4 kg for 1 s gives 5.00 m/s, and it stays 5.00 m/s.
  - a = F/m for 20/2, 20/8 and 40/8.
  - 5 kg on wood holds at 20 N and slides at 25 N (limit 24.5 N; kinetic 14.7 N).
  - Masses 2 and 4 kg at 3 and −1 m/s with e = 1 end at −2.33 and 1.67 m/s; momentum stays 2.00 and kinetic energy 11.00 J.

**Into the leaf.**
- Meadow → plant → leaf cross-section → palisade cell → chloroplast.
- Selecting the pulsing part twice zooms into it. The current scene scales up around that part while the next level grows out of it.
- With reduced motion, levels cross-fade instead.
- Every part has an explanation and is keyboard-operable.
- Scale bars are approximate, rounded to a useful power of ten. The registry labels the drawings honestly: "not to scale within a level".

**Not done from the directive's feature list.** Curiosity Portal, What-If Lab, Show Me Why, Mystery Case, Knowledge Universe, Build & Break, Discovery Archive and the cross-subject learning trails were **not** added as new features in v23. Several exist in earlier versions (Show me why, Knowledge Universe, Archive), but I did not extend them. The chemistry, history, geography, English, language and social worlds received new ambient scenes, but **no new interactive experiences**.

## D. Growth Plan

- Audited (language scan and the 15-check suite). No guilt, streak or penalty wording was found, and no ability scores.
- **Changed:** its next planned session now appears on the student desk ("Next: tomorrow, 16:00"), so the plan is visible where the student starts.
- **Not changed:** the planner itself. I found no defect that justified touching it.

## E. Handwriting Studio

- Audited against the v22 suite (22/22). OCR is labelled as on-device, unvalidated and editable before use, and nothing was faked.
- **Not changed** in v23, apart from the desk tile ("a draft is waiting / N saved sessions", read only with the studio's own device-storage consent).

## F. Student portal and other areas

- **Your desk**:
  - It is the first section of `student.html`, holds the page's only `h1`, and gives a date and greeting.
  - It shows one next step, chosen in this order:
    1. a Growth Plan session later today;
    2. three or more flashcards due;
    3. the last Learning Studio activity;
    4. answers worth another look;
    5. otherwise, "Step into a subject world".
  - Four status tiles cover the Learning Studio, Growth Plan, Support Pact and Handwriting, plus "Also here" links to the long sections below.
  - It reads only what this browser already holds, sends nothing and scores nothing. When nothing is saved, it says so in plain words.
- The explainer hero is no longer forced to full screen once the desk sits above it.
- **Games**: audited, no defects found (see A). Not changed.
- **Noor**: the experience frame already sends the model's current state. The topic hub now has "Ask Noor: the big idea" and "Ask Noor: quiz me first" (questions without answers). Both go through the existing consent and online/offline handling, with only the topic title and objectives as context. No API keys or new endpoints were added.

## G. New features

- The Newton's laws lab.
- Into the leaf.
- The topic hub with four modes.
- The immersive world pages.
- The entrance.
- Living / Still / Plain environments.
- Focus mode.
- Route transitions with a shared hero.
- The student desk.
- Noor actions on topics.

## H. Files

**New**
- `assets/js/learn/ls-motion.js`
- `assets/js/learn/ls-topic.js`
- `assets/js/learn/ls-exp-newton.js`
- `assets/js/learn/ls-exp-bio.js`
- `assets/js/desk.js`
- `assets/css/desk.css`
- `tests/e2e/learning-studio-v23.e2e.js`
- this report

**Rewritten**
- `assets/js/learn/ls-worlds.js`

**Edited**
- `assets/js/learn/ls-explore.js`
- `assets/js/learn/ls-exp.js`
- `assets/js/learn/ls-shell.js`
- `assets/css/learn-atelier.css`
- `assets/css/v9.css` (the SVG press fix)
- `learn.html`
- `student.html`
- the `v9.css` cache version in 12 HTML pages
- `tests/e2e/learning-studio-v22.e2e.js` and `tests/e2e/v9.e2e.js` (updated for the new subject page and the portal heading)

## I. Tests (actually run)

Full regression on 2026-11-20: every one of the 35 e2e suites was run against the v23 code. Each suspicious failure was then re-run against the pre-v23 commit (`cbe97db`) from a separate worktree on another port, to separate regressions from existing problems.

| Result | Suites |
|---|---|
| **Passed (29)** | a11y-centre, a11y, avatar-lab, chat, companion-quality, companion, growth-v18 (15/15), handwriting-v22 (22/22), human3d, learning-studio-v21 (21/21), learning-studio-v22 (22/22), **learning-studio-v23 (18/18, new)**, nav, neural-voice (6/6), noor-platform, noor-tools, noor-v12, noor-v17 (9/9), noor, page-video (8/8), problems (14/14), realtrack, studio-noor, syllabus-chat, v10, v9, visual-acceptance, visual-chat (18/18), visual-library, vspec (exit code 0) |
| **lab: 33/34 in the full run** | P10 "wave interference animated" failed once under load. Re-run alone, it passed 34/34 twice on v23 code. This is a timing flake, not a regression. |
| **learning-studio: 33/34** | "Explain my mistake": the known intermittent failure, present since v22 (see K). |
| **ink-studio: intermittent** | "the eraser removes the stroke it touches". It also fails on the pre-v23 commit (2 of 3 runs), so this is a pre-existing, load-sensitive flake. |
| **visuals: failed** | The step "audio lesson about the heart" timed out. Network logging showed Wikipedia answering **HTTP 429 (rate limited)** to this container, and the pre-v23 commit fails identically when rate-limited. This is not a v23 regression, but it is **not verified passing** either. |
| **audio-lessons: not verified** | The 50-topic sweep calls Wikipedia and exceeded the 10-minute cap. The player-only mode (`AL_PLAYER_ONLY=1`) got 1/5, and all four failures wait on the same rate-limited Wikipedia call. |

Also run:
- the axe-core WCAG 2 A/AA scan of `student.html`, the physics and biology world pages, the Newton topic hub, the Newton lab and Into the leaf. After raising the contrast of one small label in the Newton lab, **0 violations**;
- a scripted play-through of all 12 Learning Games;
- a chirality check of the Rotate 3D shapes;
- the Newton lab physics against hand calculations.

**Regressions found by the suites and fixed before the final run:**
- `studio-noor`: a skipped view transition raised a console error.
- the v22 subject-page test: it expected the old card grid; updated to the new trail.
- the v9 test: it expected the hero `h1`, which is now an `h2` under the desk.
- the v23 suite itself: it caught the stale Play/Pause label.

## J. Performance and accessibility

- **Worlds:**
  - one shared loop at no more than 30 fps;
  - backgrounds pre-rendered once per size;
  - device pixel ratio ≤ 1.5;
  - IntersectionObserver and ResizeObserver;
  - no drawing when hidden;
  - zero loops in Still and Plain modes (asserted in tests).
- **Entrance:** at most 950 ms, skippable by any input, and absent with reduced motion (asserted).
- **Lazy loading:** the new experience scripts load only when an experience opens. No new libraries were added (vanilla JS, canvas, SVG).
- **Reduced motion:** no entrance, no view transitions, still worlds, cross-faded zoom, and no pulsing target.
- **Keyboard:**
  - every leaf part is focusable and works with Enter or Space;
  - the Newton lab has arrow, Space and R keys;
  - focus mode exits with Escape.
- **Screen readers:** zoom levels are an ordered trail with `aria-current`, the scale bar is a live region, and parts have names.
- **Phone:** no horizontal overflow on the world page, the topic hub and both new experiences at 390 px (asserted).
- **Not measured:** I did not run Lighthouse or a frame-time profile in v23, so I make no numeric frame-rate claim beyond the cap.

## K. Remaining problems (honest)

- **Network-dependent suites:** while this container is rate-limited by Wikipedia, `visuals` and `audio-lessons` cannot be verified. Re-run them from a different network before deploying.
- **Pre-existing flaky test:** the eraser check in `ink-studio` (it also fails on the pre-v23 commit).
- **Flaky test:** "Explain my mistake" in `learning-studio.e2e.js` still fails intermittently (about 1 run in 4, as in v22). It passed when re-run with diagnostics. The button is present and unobstructed when it fails, and the root cause is not identified.
- **Feature gaps:** the original directive features listed in C (Curiosity Portal, What-If Lab, Mystery Case, Build & Break, cross-subject trails) were not built. Chemistry, history, geography, English, language and social worlds have new scenes but no new interactive experiences.
- **Lab breadth:** the Newton lab has no "predict your number before the run" input inside each mission. Prediction happens once, in the frame's Predict step.
- **Leaf zoom:** it uses two-step selection (select, then select again to zoom) and the "Zoom in" button. Some students may expect a single click to zoom.
- **Portal length:** the long explainer sections below the desk were kept (now reachable through "Also here"). The page is still long.
- **Support Pact on the desk:** the desk shows what the tracker has stored. Because the tracker resets or finishes pacts on open by design, the tile can say "Finished" right after a pact ends.
