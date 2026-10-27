# ERLY: test first. Watch only with permission. Then stop.

**E**arly **R**ecognition of **L**earning barriers, on **Y**our terms.

This is the website and interactive prototype for Team Rising Stars' entry in the UAE Hackathon (Student Accessibility Services early-identification challenge). ERLY is a browser companion that asks for consent first and does its work on the student's own device. It notices study-strain patterns in university students. It shows each insight to the student first, and it lets the student decide who else is told.

## SAS portal (start here)

`index.html` is the **SAS — Student Accessibility Services** sign-in page. You choose Student or Counselor, then sign in:

| Role | Username | Password | Goes to |
|---|---|---|---|
| Student | `Acubins` | `1234` | `student.html` (the ERLY site) |
| Counselor | `Counselor` | `4321` | `counselor.html` (SAS dashboard) |
| Faculty | `Faculty` | `5678` | `faculty.html` (Faculty portal) |
| University | `University` | `2468` | `university.html` (Command Center → SAS / Faculty) |

A wrong password shakes the card and shows an error. Using student credentials on the counselor form (or the other way round) is refused with a hint. The student and counselor pages send you back to the login if you open them without signing in.

The counselor dashboard has four views:
- **Overview:** KPIs, new requests, an areas-flagged donut chart, this week's appointments, and grades before vs. after support.
- **Requests:** a board with columns New → Scheduled → Assessed → Support plan.
- **Students:** performance cards for each student.
- **Cohort:** the funnel, the Arabic/English comparison, and the Curriculum Mirror.

Clicking any student opens a profile with animated illustrations of the flagged areas, an **indicator panel** (every game, questionnaire and 2-week signal in one compact table with flags), the assessment outcome, a grade and on-time-submission chart, the game profile, Arabic vs. English reading, the 14-day weather strip, and their notes. If the student games were played in the same browser, an **"Acubins (you) · live"** request appears at the top.

> This is a front-end demo. The credentials are checked in the browser and the "session" is a `sessionStorage` flag, so it is not real security. A real deployment would use the university's SSO. All counselor caseload data is synthetic.

## Run it

You don't need a build step or any dependencies. It is plain HTML, CSS and JS.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

You can also open `index.html` directly. To host it, enable GitHub Pages on the branch. The site works as is.

## The flow (v2): test first, watch only with permission, then stop

1. **The 5-day challenge.** One game of about five minutes a day, Monday to Friday. All five games are playable:
   - **Day 1: Real or Fake?** Decide whether each word is real or made up, in English and Arabic. Measures decoding speed and accuracy.
   - **Day 2: Sound Swap.** Swap the first sounds of two spoken words (spoonerisms, read aloud with Web Speech). Measures phonological awareness.
   - **Day 3: Speed Naming.** Name colours and then digits as fast as possible (rapid automatised naming).
   - **Day 4: Catch the Target.** A go/no-go task: tap for the target, hold back on everything else. Records omissions, commissions and reaction-time variability. Counts as supporting evidence only.
   - **Day 5: Memory & Numbers.** Backward digit span, number-line placement and dot comparison. This is a first dyscalculia check.
   - **Questionnaires:** a short form adapted from the ARHQ (after day 1) and the 6-question ASRS v1.1 Part A (after day 4).
2. **Private result.** The student sees either "doing fine, here are tools that suit you" or "worth a closer look". The result page also shows a learning profile, the Arabic vs. English reading gap, and how each area compared with the demo range.
3. **Opt-in 2-week watch.** This is only offered after a "closer look" result or a self-referral. The student agrees to a visible contract with a start date and an end date, then sees a countdown. There is a stop-and-delete button. The watch switches off by itself on day 14, deletes the raw events, and keeps only a summary.
4. **Hand-off.** The student downloads an Evidence Pack, can invite an ally (who gets a Support Playbook), and books SAS in one tap. SAS confirms any outcome; ERLY never does.

There is also a reading tools section that everyone keeps, the science table, privacy, the SAS orientation-week dashboard, an impact calculator, the 90-day plan and the Q&A.

**For the pitch:** keep *Judge mode* on to unlock all 5 days at once. Use the *sample* buttons to load a "closer look" or "doing fine" result instantly. Shortcuts: `⌘K` jump, `T` theme, `L` Arabic/English, `P` 5-minute pitch timer.

**Honesty:** game scoring runs for real in the browser. The thresholds are **demo placeholders**; the pilot will set real cut-offs against professional assessments using same-language, same-year peer norms. The watch data and the SAS figures are synthetic.

## Structure

```
index.html
assets/css/style.css     design tokens, light/dark, RTL-aware layout
assets/js/i18n.js        Arabic translations (English lives in the HTML)
assets/js/main.js        theme, language, nav, palette, pitch timer, calculator, live reader
assets/js/challenge.js   5 games, 2 questionnaires, scoring and the private result
assets/js/watch.js       2-week watch contract, hand-off, SAS view
assets/img/mark.svg      favicon
```

## ERLY AI Reading Companion (in the Reading Studio)

Open the Reading Studio on the student site and tap **Noor** (bottom corner, or `Alt+N`). Noor is an AI reading companion, not a doctor. **ERLY identifies friction and supports students. It never diagnoses disability.**

What it does:
- **Chat** by typing, quick-reply chips or voice. Spoken replies use the browser's own voices and can be paused, repeated, skipped or muted. Voice input only starts when you tap the mic, after a consent card. It stops after one answer and no audio is kept.
- **Reading signals** shows exactly what is counted: returns to the same section, reader zoom, sideways panning, text-setting changes, read-aloud use and session length. For each one you see the rule, the threshold and the comparison with your own baseline. It also lists what is never measured (eye movement, attention, comprehension, reading accuracy, keystrokes, camera, audio, document text). From there you can pause, turn invitations off, change thresholds, and delete the session or everything.
- **A gentle invitation** appears only with monitoring consent and only when friction repeats inside a time window, above your own baseline. One event never counts. Page buttons, read-aloud auto-scroll, diagram inspection and quick skims are excluded. There is a warm-up, a cooldown and at most 2 invitations per session. You can choose Talk about it, Later, Dismiss or Turn off invitations.
- **The adaptive conversation** asks open questions with follow-ups that branch on your answers. It keeps observations, your reports, uncertain interpretations, recommendations and possible referrals apart. It considers situational explanations first, and it can conclude that there is not enough information. Read-aloud use is never treated as evidence. It suggests SAS only when you report the pattern across documents and contexts, and that is always your choice.
- **Support tools** run inside the reader when you pick one: line focus, spacing, bigger text, zoom, softer colour, a reading font, read-aloud, key-word meanings, a plain-words summary, a diagram walk-through, a quick check or a 5-minute break. Each one asks "Did that help?".
- **Reading Lab** has an ERLY-written CC0 sample passage in English and Arabic. You compare settings (spacing, font, size, line highlight, colour, listen-along) and mark each Easier, Same or Harder. Results are shown as preferences, and you can apply them to the reader.
- **My summary** is a plain-language summary in seven sections that you can edit. You can copy it, download it as .txt or keep it on the device. Sharing with SAS opens an email draft in your own mail app, and nothing is ever sent automatically.

### Architecture

| Layer | File | Runs |
|---|---|---|
| 1 Local event monitoring | `assets/js/studio.js` publishes `ERLY.reader` events (metadata only) | browser |
| 2 Signal engine + personal baseline | `assets/js/companion/signals.js` | browser (pure, unit-tested) |
| 3 Conversation state machine | `assets/js/companion/dialogue.js` | browser (pure, unit-tested) |
| 4 Language-model adapter | `assets/js/companion/llm.js` (+ optional `server/llm-proxy.mjs`) | browser / your server |
| 5 Support tools | `dialogue.js` offers → `ERLY.reader.act()` in `studio.js` | browser |
| 6 Student summary | `assets/js/companion/summary.js` | browser (pure, unit-tested) |
| Consent, storage, deletion | `assets/js/companion/store.js` (`localStorage` key `erly-companion-v1`) | browser |
| Voice | `assets/js/companion/voice.js` (Web Speech API) | browser |
| UI | `assets/js/companion/ui.js`, `assets/css/companion.css` | browser |

The language model is kept separate from the signal engine. It can only pick intents from an allowed list and write one short acknowledgement. Its output is validated, and anything diagnostic, any percentage or any unknown intent is discarded. It cannot change measured values, skip consent or add a label. Without a configured endpoint, Noor runs on the rule-based engine and labels its replies as simulated.

### Optional external model

1. `npm install @anthropic-ai/sdk`
2. `ANTHROPIC_API_KEY=... ALLOWED_ORIGIN=https://<you>.github.io PORT=8787 node server/llm-proxy.mjs`. Optionally set `ERLY_MODEL`; the default is `claude-opus-5-5`.
3. Put the proxy's public URL in `assets/js/companion/config.js` (`endpoint: 'https://…/api/companion'`).
4. In Noor → Reading signals, the student turns on **Use the external AI model**. Only then is anything sent: the current question, the student's typed answer with emails and numbers removed, the allowed intents and the language. No name, reading history or measurements are sent.

Never put an API key in `assets/`, because everything there is public.

### Tests

```bash
npm test        # Node 18+, no dependencies: signals, baseline, branching, consent, deletion, voice, LLM validation
```

### Honest limits

- The thresholds are starting values for this prototype. They are not clinically validated, and they can be changed in the UI.
- Browser zoom and pinch-zoom can't be measured, so only the reader's own zoom control counts. Panning is only possible while the reader is zoomed in.
- Voice is turn-by-turn (listen, then reply). It is not a real-time conversational voice model. Speech recognition availability depends on the browser. In Chrome and Edge the browser may send audio to its vendor's speech service, and the consent card says so.

## Check-ins (beyond reading)

The student site has a **Check-ins** section with ten short, game-like activities, one for each domain of the 100-point matrix. Noor guides each one by voice.

| Domain | Activity (modelled on) | Measures |
|---|---|---|
| Visual & reading | Real word or made-up? (lexical decision) · letters in a crowd (visual crowding) | accuracy, decision time, crowding cost |
| Auditory & video | Listen and answer, first in quiet, then with background noise (speech-in-noise) | quiet accuracy, drop in noise, replays |
| Working memory | Digits forward and backward (digit span) · which side has more dots (number sense) | spans, quantity accuracy |
| Executive function | Connect the trail 1-2-3 / 1-A-2-B (Trail Making A/B) · tap except for X (go/no-go) | switching cost, errors, commission errors, response variability |
| Endurance & pacing | Spot the 3 for 2–3 minutes (continuous performance) plus tiredness before and after | accuracy drop, slowing, tiredness rise |
| Output & drafting | Copy a sentence · write in your own words for 2 minutes (the text is discarded) | copy speed, writing speed, start time, long pauses, deletions |
| Navigation | Find five things on a pretend course site | time per item, wrong turns |
| Assessment | The same kinds of questions without and then with a timer, plus self-rated worry | accuracy, drop under time pressure, answer changes |
| Help-seeking | Four questions about how you like to get help | support style only; this never flags |
| Collaboration | Comfort in eight everyday class situations | comfort, avoidance |

How results are reached (`assets/js/checkins-score.js`, unit-tested):
- Each metric is compared with a reference range and given a z-score. **The reference ranges are demo placeholders, not validated norms.**
- A run is marked unclear when there are too many very early taps, chance-level responding, time away from the screen, or an unfinished task. An unclear run says nothing.
- A domain is "Notable" only when two or more of its measures agree. "Worth a look" needs one clear measure.
- A possible explanation to explore with SAS (for example dyslexia, dyscalculia, ADHD, auditory processing plus a hearing check, dysgraphia, test anxiety, stamina, or communication confidence) needs converging domains. It is graded as an early sign, some evidence or stronger evidence. The grade rises when a result repeats on a second run and when it matches the student's own 28-day tracking. Everyday explanations are always listed. Results never include probabilities.
- No online activity can identify a condition with clinical accuracy. Results are screening indications to discuss with SAS, and only a qualified assessment can confirm anything.

Results stay in `localStorage` (`erly-checkins-v1`). The student can download them as .txt or delete them. A "Short demo versions" switch halves every activity for pitches.

## Noor everywhere: knowledge, interviews, voice calls, videos and the site analyser

Noor is now available on the whole student site, not only in the Reading Studio. Open her from the launcher or press `Alt+N`.

- **Knowledgeable chat** (`assets/js/companion/knowledge.js`): a bilingual guide to dyslexia, dyscalculia, dysgraphia, ADHD, auditory processing, vision, dyspraxia/DCD, autism, test anxiety, low mood, studying in a second language, assessment, accommodations and study skills.
  - Noor works out what the question is about (what it is, signs, assessment, what helps, myths, how it differs from similar things) and answers with follow-up chips.
  - "Do I have…?" questions and "I always… / I can't…" statements are reflected back with an offer to explore, never a verdict.
  - Crisis language always leads to UAE emergency (999) and 800 HOPE support.
  - With the optional proxy and the student's consent, an external model answers instead, using the same text as its reference. Replies are rejected if they tell the student they have a condition or give a probability.
- **"Talk it through" interviews** (`assets/js/companion/interview.js`): specialist-style questions, one at a time, for reading, attention, maths, writing, listening, vision, wellbeing and social communication.
  - Each covers how often things happen, childhood history, more than one setting, impact, and what else to check first (eye or hearing test, sleep, mood, second language, gaps in schooling).
  - Students can answer with chips, typing or voice, and can skip or stop at any time.
  - The wellbeing module includes a safety question that leads straight to crisis support.
  - Outcome: "a clear pattern often seen with X — worth a formal assessment", "some signs", "few signs" or "not enough to say". It is combined with what ERLY observed and never includes a percentage.
- **Site analyser** (`assets/js/analyser.js` + `assets/js/companion/evidence.js`): consented summaries from Check-ins, lecture videos, Reading Studio sessions and the 28-day tracker are turned into a per-area evidence level.
  - An area reaches "some" only when two independent sources agree.
  - At that point Noor gently offers help (Yes / Later / No thanks), at most once every 3 days per area, and never for 14 days after an interview. Saying yes leads to an explanation, tools and the interview.
  - The **Profile** tab shows everything that was noticed.
- **Lecture videos** (`assets/js/videos.js`): YouTube lessons play inside a video room using YouTube's privacy-enhanced player. With consent, ERLY reads playback info only: rewinds (including YouTube's own controls), speed, restarts and notes. Going back to the same 30-second part 3 times within 10 minutes triggers "Are you having any trouble understanding it?", followed by targeted help (slow down, key points, focus tips) and an offer to talk it through.
- **Two-way voice call** (`assets/js/companion/call.js`): Noor speaks, then listens, then answers, turn by turn, with live captions, an animated face that reacts to the microphone level, tap-to-interrupt and optional interrupt-by-talking. It starts only after microphone consent and stores no audio.
- **Daily Quest** (`checkins.html`): the ten check-ins are now two a day for five days.
  - Features: a quest map, XP and streaks, a time limit per activity, and confetti.
  - A judge-mode switch unlocks all days for demos.
  - On the student page the check-ins section is a single card that launches the quest page with a warp transition.

## University, Faculty, real tracking, handwriting and the Growth Plan

- **University Command Center** (`university.html`): campus KPIs, enrolment and attendance charts, the support pipeline, live faculty referrals and accessibility rings. "Open SAS Dashboard" and "Faculty portal" go through an animated warp. The University account can open both.
- **Faculty portal** (`faculty.html`, `assets/js/faculty.js`, `assets/js/campus-data.js`):
  - Course/stream selector, a per-session attendance register (present / late / absent), and attendance trends.
  - Student cards with the classroom-observed signs written under each name.
  - "Refer to SAS…", where the student is always told. SAS sees referrals in a new **Faculty referrals** view and can acknowledge and invite the student.
  - The roster is synthetic. Observations are things a teacher can see in class, never a diagnosis.
- **Demo vs Real tracking** (`assets/js/realtrack.js` + tracker): the Support Pact now has a mode switch.
  - *Demo* simulates 28 days in seconds.
  - *Real* follows the actual calendar, with no simulate, fast-forward or back-filling.
  - Real mode asks an 8-question, timed and time-stamped daily check-in (sleep, mood, stress, reading effort, starting effort, study time, hardest thing, unusual day).
  - It records Reading Studio counts per day. Missed, paused, short-sleep (< 6 h) and unusual days are excluded.
  - It needs 7+ clean baseline days and judges only after day 28. An area needs 2+ persistent indicators, at least one of them measured, so self-report alone never flags.
  - Raw days are deleted at the end.
- **Noor's knowledge** (`assets/js/companion/kb-extra.js`): more than 50 topics and 12 quick facts, including DLD, NVLD, executive function, working memory, processing speed, Arabic dyslexia, study craft, sleep, burnout, panic, OCD, trauma, UAE People of Determination rights, data protection, the SAS process and disclosure.
  - Typo-tolerant matching.
  - Follow-ups use the conversation ("tell me more", "simpler", "how is it assessed?").
  - Two conditions can be compared.
  - Answers render with a topic tag, bullets, a word-by-word reveal, and helpful / copy buttons.
- **Handwriting check** (`assets/js/handwriting.js`, `assets/js/hand-ui.js`): Noor dictates three sentences (EN or AR), then the student photographs their handwriting or tries a built-in sample.
  - Everything runs in the browser and the photo is never uploaded or kept.
  - Lighting is evened out and ruled lines are ignored. Letter size, baseline, spacing, slant, line direction, margins and crossings-out are measured against demo reference bands, with an annotated overlay. A spelling self-check follows.
  - The result is a level of features, never a percentage or a diagnosis. Saved summaries count at most as an early sign in the evidence profile.
- **Growth Plan** (`support.html`, `assets/js/growth-core.js`, `growth-games.js`, `growth.js`): a six-week programme run like a learning specialist would run it.
  - An intake consult with areas pre-selected from the student's own evidence, SMART goals, and short daily sessions built from 13 interactive exercises.
  - Difficulty adapts to scores, and one plan session counts per real day.
  - A weekly review adjusts the plan and suggests a counsellor when mood is low.
  - It builds skills and strategies alongside SAS or a specialist, never instead of them.
- **SAS picks**: four videos chosen by the team are in the lecture-video library. ERLY couldn't preview them, so their notes are general active-listening prompts.

Tests: `npm test` (unit). Optional browser checks: `tests/e2e/{companion,noor,realtrack,handwriting,growth}.e2e.js`.

Honest limits: no website can identify a condition with clinical accuracy. These features look for converging evidence and support a referral. Only a qualified assessment can confirm a learning difference. The reference ranges in the check-ins are demo values.

## References

- Aboudan, R. et al. (2011). *International Journal of English Linguistics* 1(2):64. doi:10.5539/ijel.v1n2p64
- Song, P. et al. (2021). The prevalence of adult ADHD: a global systematic review and meta-analysis. *J Glob Health* 11:04009.
- Vos, M. & Hartman, C. (2022). The decreasing prevalence of ADHD across the adult lifespan confirmed. *J Glob Health* 12:03024.
- Bayanat open data: Grade 12 pass rates, higher-education enrolment.
- UAE Federal Decree-Law No. 45 of 2021 (PDPL).
