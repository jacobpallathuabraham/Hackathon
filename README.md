# ERLY: test first. Watch only with permission. Then stop.

**E**arly **R**ecognition of **L**earning barriers, on **Y**our terms.

This is the website and interactive prototype for Team Rising Stars' entry in the UAE Hackathon (Student Accessibility Services early-identification challenge). ERLY is a browser companion that asks for consent first and does its work on the student's own device. It notices study-strain patterns in university students. It shows each insight to the student first, and it lets the student decide who else is told.

## Acubins University home (start here)

`index.html` is the **Acubins University** website. It has an animated crest intro, a sunset-skyline hero, a programme finder with search and filters, admissions steps with a live deadline countdown, a scholarship estimator, research, a scroll-driven campus-life gallery, testimonials, news, events (add to calendar), an academic calendar, working student-service demos (library search, timetable, live shuttle times, dining, GPA calculator, health, careers, IT tickets, accessibility), an interactive campus map, site search (`/`), FAQ, contact and dark mode. All content is demo data.

It offers two ways in:

1. **University login** (university details login): asks for the university username and password (`University` / `2468`) and opens the Command Center (`university.html`). From there, one click opens the SAS Dashboard or the Faculty portal. Signing out returns to the university home.
2. **Login for students, faculty and counselors**: opens `login.html`, the SAS sign-in page described below.

## SAS sign-in for students, faculty and counselors

`login.html` is the **SAS — Student Accessibility Services** sign-in page. You choose Student, Faculty or Counselor, then sign in:

| Role | Username | Password | Goes to |
|---|---|---|---|
| Student | `Acubins` | `1234` | `student.html` (the ERLY site) |
| Counselor | `Counselor` | `4321` | `counselor.html` (SAS dashboard) |
| Faculty | `Faculty` | `5678` | `faculty.html` (Faculty portal) |

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

You can also open `index.html` (the university home) directly. To host it, enable GitHub Pages on the branch. The site works as is.

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
- A possible explanation to explore with SAS (for example dyslexia, dyscalculia, ADHD, auditory processing plus a hearing check, dysgraphia, test anxiety, stamina, or communication confidence) needs converging domains. It is graded as an early sign, some evidence or stronger evidence. The grade rises when a result repeats on a second run and when it matches the student's own 14-day tracking. Everyday explanations are always listed. Results never include probabilities.
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
- **Site analyser** (`assets/js/analyser.js` + `assets/js/companion/evidence.js`): consented summaries from Check-ins, lecture videos, Reading Studio sessions and the 14-day tracker are turned into a per-area evidence level.
  - An area reaches "some" only when two independent sources agree.
  - At that point Noor gently offers help (Yes / Later / No thanks), at most once every 3 days per area, and never for 14 days after an interview. Saying yes leads to an explanation, tools and the interview.
  - The **Profile** tab shows everything that was noticed.
- **Lecture videos** (`assets/js/videos.js`): YouTube lessons play inside a video room using YouTube's privacy-enhanced player. With consent, ERLY reads playback info only: rewinds (including YouTube's own controls), speed, restarts and notes. Going back to the same 30-second part 3 times within 10 minutes triggers "Are you having any trouble understanding it?", followed by targeted help (slow down, key points, focus tips) and an offer to talk it through.
- **Two-way voice call** (`assets/js/companion/call.js`): Noor speaks, then listens, then answers, turn by turn, with live captions, an animated face that reacts to the microphone level, tap-to-interrupt and optional interrupt-by-talking. It starts only after microphone consent and stores no audio.
- **Daily Quest** (`checkins.html`): the ten check-ins are two a day for five days, themed for university students: speed-reading academic words and an exam-paper code check, campus announcements in a quiet room and a busy café, room codes and PINs plus "which lecture hall is fuller?", a campus route and inbox triage, live lecture captions, copying a slide and a two-minute reflection, finding things on a course LMS, an exam simulator (untimed vs timed), help-seeking style and everyday university situations.
  - Each game starts with an animated instruction card and a 3-2-1 countdown, and shows points, combo streaks and pop-up feedback (just for fun — never part of the result).
  - Noor's voice never blocks a game: some tablets never report that speech finished, which used to freeze the activities on iPad. `tests/e2e/quest.e2e.js` plays all ten games with exactly that kind of stuck voice.
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
  - *Demo* simulates 14 days in seconds.
  - *Real* follows the actual calendar, with no simulate, fast-forward or back-filling.
  - Real mode asks an 8-question, timed and time-stamped daily check-in (sleep, mood, stress, reading effort, starting effort, study time, hardest thing, unusual day).
  - It records Reading Studio counts per day. Missed, paused, short-sleep (< 6 h) and unusual days are excluded.
  - Monitoring lasts **14 days**: days 1–7 learn the student's own normal (a baseline needs 4+ clean days), days 8–14 are watched (4+ clean days needed), and nothing is judged until day 14 is over. An area needs 2+ persistent indicators, at least one of them measured, so self-report alone never flags.
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

- **Support Pact** now asks eight Learning Blueprint questions (how material sinks in, focus style, when stuck, best time, reading in English, deadlines, stress, reminders), lets the student choose one of four SAS counselors (or no preference), and asks separately who they rely on most (mother, father, brother, sister, spouse, friend, mentor) — with a name and whether that person may be suggested if a pattern persists. Nobody is contacted automatically.
- **Fresh demo every time**: opening the university home page (or the sign-in page directly) clears all demo data on the device, keeping only display preferences (theme, colour, language).

## Reading Studio v2 and Noor's AI brain

- **New logo**: `assets/img/erly-mark.svg`, a sunrise over an open book (early recognition, on your terms). It is also the favicon.
- **Library** (`assets/js/studio-content.js`): six course readings (Thermodynamics, Psychology, Programming, Cell Biology, Marketing in the UAE, Solar energy in the UAE), each with a glossary, prepared summaries, quick checks and most with a diagram walk-through. Students can search and filter by field.
- **Open your own PDF or .txt** (`assets/js/study-tools.js`, `assets/vendor/pdf.min.js` — pdf.js, Apache-2.0). The file is read in the browser and never uploaded. Text is rebuilt into headings and paragraphs, so read-aloud and every tool works. An "Original PDF pages" view shows the real pages, and scanned PDFs open there automatically.
- **Reader tools** (`assets/js/studio.js`, `assets/css/studio.css`):
  - Highlights in four colours with notes, a Notes panel and Markdown export.
  - Bookmarks, search (Ctrl F) and page thumbnails.
  - Contents, reading progress with time left, and resume where you left off.
  - A selection toolbar (highlight, note, read, define, Arabic, ask Noor, copy).
  - A Study drawer with summaries, key terms, flip flashcards, quizzes and one-tap prompts for Noor.
  - A focus timer, auto-scroll, immersive mode, full screen and keyboard shortcuts.
  - The summaries for your own files are extractive (key sentences picked from the file), and are labelled as such.
- **Noor's brain** (`assets/js/companion/ai.js`, picker in Noor's header): built-in by default, nothing is downloaded or sent until the student chooses.
  - **Built-in**: ERLY's guide plus study skills (calculator, study plans, email drafts, page summaries, quizzes, timer).
  - **On-device AI**: an open Qwen 3.5 model through WebLLM (`@mlc-ai/web-llm`, loaded from jsDelivr), downloaded once into the browser cache and run on the device's GPU via WebGPU. Messages never leave the device. Three sizes: Lite, Plus, Pro.
  - **Chrome built-in AI** (Gemini Nano via the Prompt API), where the browser offers it.
  - **Noor Online**: a free, key-less hosted model (Pollinations' classic text API by default, configurable in `config.js`). Nothing to download, so it works on iPads and phones. It is used only after a consent card that names the service and what is sent; emails and long numbers are removed first. The free tier allows about one message every 30 seconds, so Noor shows a short "busy" countdown and retries. If it can't be reached she falls back to a Wikipedia summary with a source link, then to her built-in brain. When the built-in brain can't answer, Noor offers Noor Online (or a Wikipedia search) in one tap.
  - On iPads, only Noor Lite (Llama 3.2 1B, about 0.9 GB of graphics memory, smaller context) can be picked on-device, because the larger models run out of memory in Safari.
  - **Cloud AI** through `server/llm-proxy.mjs` (the API key stays on the server), only after consent. The proxy's chat mode is now a general study assistant.
  - Every reply streams with Markdown (lists, tables, code with copy), copy / read-aloud / try-again / feedback buttons, and a stop button. Replies that tell the student they have a condition, or give odds, are blocked and replaced. Crisis messages are always answered by the built-in safety card first.
- **ChatGPT-style composer**: a **+** menu (ask about the open reading, open a PDF, voice, brain, new chat), a growing text box, dictation mic, and a blue **voice-mode** button that becomes Send while typing and Stop while Noor writes. The chat can expand to a large centred window.
- **Voice mode** (`call.js`): a full-screen animated orb with two styles. *Check-in* (default) is like a calm appointment with a caring specialist: Noor reflects back and asks one gentle question at a time, and never diagnoses. *Ask anything* is for general questions. With an AI brain, sentences are spoken as soon as they are written. It is turn-by-turn (speech recognition → brain → read aloud), not a real-time voice model, and no audio is recorded.
- **In-the-moment nudges** (in `ui.js`, with the "notice friction" consent only):
  - Zooming in and out a lot, pinch-zooming on a tablet, scrolling up and down a lot, or staying on one section for a long time brings a friendly, animated check-in with one-tap fixes (bigger calmer text, softer page colour, read aloud, summary, search, line focus, explain, a break).
  - The check-ins now slide in at the side after two or three zooms (3 in 45 s), two pinch-zooms, or scrolling up and down (4 direction changes in 30 s), in the Reading Studio and on the student site. Programmatic scrolls (search, page buttons, read-aloud) don't count.
  - Events are kept in memory for about a minute and never stored or sent. Check-ins stop if the student says no to noticing or taps "Turn these off".
  - There is at most one every 45 seconds, and each kind at most every 3 minutes. "I'm fine" silences that kind for the session.

Tests: `npm test` (unit). Optional browser checks: `tests/e2e/{studio-noor,companion,noor,noor-tools,human3d,realtrack,handwriting,growth,quest}.e2e.js`. The AI model is mocked in `studio-noor.e2e.js` (no GPU in CI); the real WebLLM download needs a WebGPU browser.

Honest limits: no website can identify a condition with clinical accuracy. These features look for converging evidence and support a referral. Only a qualified assessment can confirm a learning difference. The reference ranges in the check-ins are demo values.

## References

- Aboudan, R. et al. (2011). *International Journal of English Linguistics* 1(2):64. doi:10.5539/ijel.v1n2p64
- Song, P. et al. (2021). The prevalence of adult ADHD: a global systematic review and meta-analysis. *J Glob Health* 11:04009.
- Vos, M. & Hartman, C. (2022). The decreasing prevalence of ADHD across the adult lifespan confirmed. *J Glob Health* 12:03024.
- Bayanat open data: Grade 12 pass rates, higher-education enrolment.
- UAE Federal Decree-Law No. 45 of 2021 (PDPL).

## Find it on Google ("Acubins University")

The home page is set up to be found: a clear title and description, a canonical URL, share previews (Open Graph / X, `assets/img/og-acubins.png`), `CollegeOrUniversity` structured data with the name "Acubins University", a `sitemap.xml`, and the name in the page's main heading. The sign-in portals are marked `noindex` so only the university home shows up in results.

Google has to discover and index the page first, which takes from a day to a few weeks. To speed it up:
1. Open [Google Search Console](https://search.google.com/search-console), add a **URL prefix** property for `https://jacobpallathuabraham.github.io/Hackathon/`.
2. Choose **HTML tag** verification, copy the `google-site-verification` tag into the commented spot in `index.html`'s `<head>`, push, and click Verify.
3. Submit the sitemap `https://jacobpallathuabraham.github.io/Hackathon/sitemap.xml`, then use **URL inspection → Request indexing** on the home page.

## Connect Claude as Noor's brain (Claude-level answers, fast)

The free "Noor Online" service allows only about one message every 30 seconds, so Noor answers a second quick question from her built-in knowledge or Wikipedia and offers "Ask the AI again". For answers at the level of Claude, with no waiting, connect a real model through `server/cloudflare-worker.mjs`. The API key stays secret in the worker and is never put in the website.

1. `npm create cloudflare@latest erly-noor -- --type hello-world --lang js`, then `cd erly-noor && npm install @anthropic-ai/sdk`.
2. Copy `server/cloudflare-worker.mjs` to `src/index.js`, run `npx wrangler secret put ANTHROPIC_API_KEY`, then `npx wrangler deploy`.
3. In `assets/js/companion/config.js` set `online: { name: 'Claude', site: 'Acubins University', model: 'claude', url: 'https://erly-noor.<your-subdomain>.workers.dev/v1/chat/completions' }`.
4. In Noor's brain picker the student agrees to "Noor Online", which is now Claude: streamed answers, no 30-second limit.

Voice: recognition now keeps what Safari heard even when it never marks it final, ends the turn after about a second of silence, doesn't fight the microphone on iPad/Safari, and Noor's voice is chosen from the most natural voices on the device (Edge "Natural", Google, Apple Premium/Enhanced/Siri).

## Noor v3: tools, study coach, memory and iPad voice

- **Bigger panel and a new welcome screen** (`ui.js`, `noor.css`): the panel is wider, opens with a spring animation, and the chat starts with "Hi, I’m Noor" and six quick actions (live voice, ask your PDF, study coach, resume, explain anything, exam plan).
- **No more flicker**: streamed answers are repainted at most every 80 ms, list animations are paused while Noor writes, and the chat only follows the answer when you're already at the bottom.
- **Tools** (`assets/js/companion/noor-tools.js`). A small "Used: …" line shows which tool ran.
  - **Calculator**: exact maths, so the model never guesses a number.
  - **Ask your PDF**: when a reading is open, "explain this paragraph", "summarise this chapter", "define the difficult words" or "make it simpler" uses that paragraph or the whole reading, which only goes to the AI brain the student already agreed to.
  - **Study coach**: "break down my lab report into steps" makes an interactive checklist with minutes per step, a progress bar and a timer for the next step. With an AI brain the steps are written for that assignment; without one, they come from a template for the task type.
  - **Resume**: "resume where I stopped" brings back the last reading position and the unfinished coach plan.
  - **Navigation**: "take me to the daily quest", "open my profile", and so on.
- **Memory, with consent**: the first time Noor notices a preference ("simpler please", "more detail") she asks before keeping it. Only the explanation level and the tools that helped are kept, on this device (`erly-noor-memory-v1`). Students can see, change or delete them under Profile → Noor's memory.
- **No unnecessary disclaimers**: Noor no longer says she's "not a doctor" or suggests tests unless the student asks. She still never diagnoses, and the safety filter and crisis card are unchanged.
- **iPad / Safari voice**: iOS only starts the microphone from a tap, so voice mode there is tap-to-talk. Tap Noor to talk, then tap her again to send. The live transcript shows while you speak. If Siri and Dictation are switched off, Noor says how to turn them on. On other browsers it stays hands-free, and tapping while listening sends early.
- Tested in `tests/e2e/noor-tools.e2e.js` (with an iPad user agent and Safari-like speech recognition mocked). It has not yet been checked on a real iPad.

## Voice v4: avatars, lip-sync, voice studio, continuous conversation

- **Maths in answers** (`md.js`): LaTeX from the AI (`\( \)`, `\[ \]`, `$ $`, `$$ $$`, including `\frac`, `\sqrt`, powers, subscripts, arrows, Greek letters and `\ce{}` chemistry) now renders as readable, escaped HTML, and is read aloud in words ("x squared"). Numbered lists keep their numbers across blank lines and formulas. Before this, it showed as raw `\text{…}`, and every item was numbered "1."
- **Avatars** (`assets/js/companion/avatar.js`): six original companions, all illustrated as SVG: Noor, Omar, Layla, Adam, Sara, and Aura (an abstract light). They are labelled on screen as AI and virtual, not real people. Each one breathes, blinks (sometimes twice), makes small eye movements and head motions, tilts its head and nods while you talk, looks up while thinking, and changes expression. Reduced-motion settings turn off the head and eye movement.
- **Lip-sync** (`assets/js/companion/lipsync.js`): browser voices don't give their audio or phonemes to the page, so:
  - each word becomes a sequence of mouth shapes (13 shapes, using letter-to-sound rules for English and Arabic);
  - each word is re-anchored to the voice's own word-boundary events (Chrome, Edge, Safari), so the mouth doesn't drift, whatever the speed, voice or pauses;
  - word length is calibrated continuously from the real timing;
  - the mouth rests at commas and full stops, and when speech ends or is interrupted;
  - voices without boundary events are timed from the speech rate. This is less exact.
  It is close word-level sync, not phoneme-perfect. That would need a TTS service that returns visemes (for example Azure Speech), which needs a key and a backend.
- **Voice studio and first-time setup** (in `call.js`): setup has three steps: avatar (preview with a spoken hello), voice, and conversation. You can change everything later from the ⋯ button.
  - Voices are the real voices on the device, with female/male filters and a preview for each. ★ marks natural voices. Choosing a male avatar picks a male voice.
  - Speed, pitch and volume sliders, and English or Arabic.
  - Explanation style (concise, conversational, detailed, step by step) and personality (7 tones). These go into the AI prompt and change style only, never facts or safety rules.
  - End-of-turn pause, hands-free, interrupt by talking, captions, caption size, high contrast, and reset.
- **Conversation**:
  - Hands-free turn-taking: Noor listens again after she answers.
  - A red "Mic on" light while listening. Mute, pause, end, replay and type are always on screen.
  - Live partial transcript, then "Got it…" and "Thinking…". If an answer takes more than 40 s, Noor says so instead of waiting forever.
  - Interrupt by tapping, pressing Space, or talking. Talking is detected from the mic level against the echo of Noor's voice. The half-written answer is cancelled and old audio never overlaps new audio.
  - Voice commands: "slow down", "speed up", "louder", "repeat that", "stop", "pause", "bye".
  - A transcript with speakers and times: copy, download (.txt), clear, and edit-and-resend.
  - Typing works inside voice mode.
  - Offline, reconnecting, mic-blocked, no-mic and Siri-off states each have a clear message.
- **iPad**: the "Allow microphone" tap lets Safari start listening right after the greeting. If Safari then refuses to restart the microphone on its own, Noor switches to "Tap to talk" automatically.
- Tested by `tests/e2e/noor-tools.e2e.js` (mocked speech: setup, voice choice, speed, lip shapes and rest, interrupt, pause, transcript, iPad fallback) and `tests/unit/lipsync-md.test.js`. **Not yet checked on a real iPad or with real voices by ear.**

## Voice v5: photoreal digital humans, emotional speech, voice library, Companion Studio

### What was there before this round
Illustrated SVG avatars; text-driven lip-sync anchored to word boundaries; one voice picker listing raw device voices; a single flat delivery (the same pace and pitch for every sentence); three settings tabs.

### Photoreal companions (`assets/js/companion/photoreal.js`)
- **Yasmin** and **Karim** are built from the two portraits in the ERLY Human Character Reference Pack supplied for this project (`assets/img/companions/`, upscaled ×2 with Lanczos). They are labelled as AI companions, not real people. Replace the two JPGs and their landmark numbers to change them.
- **How they move**: a WebGL vertex shader moves a dense mesh (about 24,000 vertices, one draw call) like facial muscles:
  - jaw drop with a lens-shaped lip opening; mesh rows are snapped to the lip line, so the lips part exactly there;
  - lip width and rounding for each mouth shape;
  - smile and cheek lift;
  - eyelids that close by sliding the real upper-lid skin down;
  - small iris shifts for gaze;
  - brow raise, inner-brow (concern) and furrow;
  - head tilt, nod and breathing.
  A second shader paints the inside of the mouth (shading, upper and lower teeth, tongue) only where the lips have parted.
- **Driving**: the same rig drives the illustrated avatars: 13 mouth shapes from `lipsync.js`, blinks, saccades, and listening, thinking and speaking states, plus a new emotion layer (15 restrained expressions that ease in and out, and small emphasis nods on stressed words).
- **Performance**:
  - No 3D download. Textures are about 100 KB each and only load when that avatar is shown.
  - Adaptive quality lowers the render resolution if frames are slow.
  - Without WebGL, the illustrated twin is used (Yasmin → Sara, Karim → Omar).
  - Reduced-motion settings stop the head and eye movement but keep the lip-sync.
- **Measured here**, in headless Chromium on software WebGL with no GPU:
  - the mouth opens a median of **13 ms** after each real word-boundary event from the voice (worst case 81 ms, on words that start with closed lips);
  - a typed question takes about **0.3 s** to the first spoken word with the built-in brain;
  - frames take about 67 ms on the software renderer. This is not representative of a real GPU, and real-device frame rates have not been measured yet.
- **Limits**: this is a 2.5D talking head from a single photo. It moves the face convincingly, but the head can't turn far, the hair doesn't move independently, and the expressions are muscle-like deformations, not separate photographed expressions. A fully rigged 3D digital human (for example a licensed MetaHuman-class model rendered with Three.js, with ARKit blendshapes) would need a commissioned or licensed model, plus a TTS service that returns visemes.

### Emotional speech (`assets/js/companion/prosody.js`)
- Every sentence is classified into one of 15 tones (enthusiastic, empathetic, reassuring, curious, serious, thoughtful, playful and so on). The tone comes from what the sentence says and from the student's last words; for example, "I'm confused" leads to a calmer, slower explanation. It never comes from their voice, face or accent.
- Each tone adjusts pace, pitch, volume and the pause afterwards, scaled by an Expressiveness slider (0–150%). The changes are small and intentional, not random. Questions lift at the end.
- The avatar shows the same tone on its face at the same moment.
- **Speech formatting**: dates (2026-11-07 → "7 November 2026"; UAE day/month order), ranges, units (km/h, °C, kWh, dirhams…), maths symbols and powers, abbreviations (Dr., vs., Fig., approx.), and a "How to say names" list the student fills in.
- Limit: browser voices can't do SSML styles, word-level emphasis or emotional timbre. Real emotional voice styles would need a cloud TTS (compared below).

### Voice library (`assets/js/companion/voicelib.js`)
- 22 original voice profiles: female-sounding and male-sounding voices that are warm, calm, bright, professional, deep, conversational, educational or storytelling, plus Indian English, Australian, Gulf Arabic and Arabic (MSA/Egyptian). The names and descriptions are ERLY's own; nothing is copied from another product.
- Each profile is played by a real installed voice that fits its accent, with its own pace and pitch.
  - Two profiles never share a voice.
  - A profile only appears when the device has a suitable voice; the others are listed as "not on this device", with how to install more.
  - Each card says which device voice it uses.
- Categories, search, favourites, and a preview with that profile's real voice that doesn't change your choice.

### Companion Studio (in `call.js`)
- **Companion tab**: 8 personality presets (Friendly Companion, Professional Assistant, Patient Teacher, Curious Explorer, Calm Guide, Energetic Coach, Concise Expert, Creative Partner). They change style only. You can save multiple named companions (avatar + voice + personality + background) and switch between them.
- **Avatar tab**: photoreal and illustrated galleries, with a live talking preview.
- **Voice library tab**: speed, pitch, volume, expressiveness, language, recognition accent (US, UK, India, Australia, UAE, Saudi, Egypt), and name pronunciations.
- **Conversation tab**: 9 modes (Natural, Study, Focus, Deep explanation, Practice, Reading companion, Research, Creative, Planning), plus explanation style, answer length, tone, end-of-turn pause, hands-free and barge-in. Research mode says plainly that it can't browse the web.
- **Look tab**: 6 backgrounds (including a light one), captions, caption size, high contrast and keyboard help.
- **First-time setup**: Avatar → Voice → Companion.

### Conversation
- **Top bar**: a language toggle (EN/ع) that switches without restarting, and a mode pill.
- **New voice commands**: "repeat the last sentence", "switch to Arabic/English", "change your voice", "use a male/female voice", "study/focus/practice/… mode".
- **AI prompt**: follow-ups ("explain that again", "the second point", "shorter", "simpler") are understood from the conversation, and when speech recognition may have misheard, the AI asks one short clarifying question.
- **Bugs fixed (found by tests)**:
  - stopping the microphone when Noor began to speak could restart listening and cut her off after one sentence;
  - a late speech result could flip the state back to "hearing";
  - personality presets reset the speed slider.

### Provider comparison (for upgrading beyond browser voices)
| Option | Voices / accents | Emotion control | Visemes for lip-sync | Cost (approx.) | Notes |
|---|---|---|---|---|---|
| Browser Web Speech (current) | whatever the device has (Edge: hundreds of neural voices incl. en-IN, en-AU, ar-AE) | rate/pitch/volume per sentence | word boundaries only | free | no key, no backend; quality varies by device |
| Azure AI Speech | 400+ neural voices, en-IN, ar-AE/SA/EG, Gulf | SSML styles (cheerful, empathetic…) and emphasis | **yes — viseme events with timing** | ~$15 per 1M characters, free tier 0.5M/month | best fit for ERLY: needs a small backend for the key (same pattern as `server/cloudflare-worker.mjs`) |
| Google Cloud TTS | many WaveNet/Neural2 voices, en-IN, ar | SSML prosody | timepoints via SSML marks | ~$16 per 1M chars | no visemes; marks give word timing |
| ElevenLabs | very expressive voices, voice design | strong emotional delivery | character timestamps | subscription | no visemes; timestamps can drive our text visemes |
| OpenAI TTS | a few expressive voices | instruction-controlled style | none | per character | no timing data |
None of these are connected yet: each needs an API key held on a server. The voice layer is modular (`voice.js` + `voicelib.js`), so a cloud provider can be added as another engine.

## Voice v6: full-screen 3D digital humans

### Audit: why the previous Karim looked artificial
- **A single photo bent in 2D.** The eyes "closed" by stretching the upper-lid skin down, the teeth and tongue were painted in, and the head could only tilt a few degrees. With no eyeballs, no real eyelids and no jaw, close-ups looked uncanny.
- **Small portrait card, no body.** There were no hands, so no gestures.
- **Mouth shapes from 13 hand-tuned deformations,** not a facial rig.
- **The reference packs supplied for this round** (two PDFs and the mockup) are concept images. As the PDFs themselves say, they contain no 3D geometry, skeletons or rigs. They were used for direction (framing, gestures, expressions, environments, UI), not as assets.

### What ERLY uses now
- **14 rigged 3D adults** from the Microsoft Rocketbox Avatar Library (MIT licence; see `tools/humans/README.md` for the full table and citation):
  - **Educational:** Karim, Layla (university tutor), Mr. Hart and Ms. Grace (experienced teachers), Kwame (science), Kenji (maths), Noura (study coach), Sofia (writing).
  - **Professional:** Dr. Sami and Dr. Amira (white coats; general health information, never a diagnosis), Zara (counsellor), Omar (academic advisor), Mei (careers), Faisal (mentor).
  - Each has a complete body with a Biped skeleton and fingers, and a face rig with **15 viseme blendshapes + 41 ARKit/FACS expression shapes**.
- **`assets/js/companion/human3d.js`** (three.js r170, vendored in `assets/vendor/three/`, MIT):
  - **Framing**: waist-up, filling the screen with room for both hands. On phones the person sits higher, so the captions and controls don't cover the face.
  - **Body language**: a state machine over 15 motion-captured clips per gender:
    - greeting wave, breathing idle;
    - attentive listening, with nods while the student talks;
    - a thoughtful pose (gaze up and aside) while thinking;
    - talking gestures chosen from each sentence's tone: excited, neutral, relaxed, or "presenting" for steps and explanations;
    - a shrug for "it depends" and a soft laugh for humour.
    Clips cross-fade at sentence starts, with random start offsets so they don't repeat. Speaking cuts a thinking pose short.
  - **Face**:
    - lip-sync drives the viseme shapes and the jaw from real word-boundary timing (`lipsync.js`), and returns to rest at pauses and when interrupted;
    - blinks are irregular (sometimes double);
    - the head turns towards the camera for eye contact (limited to 28°), with eye saccades;
    - expressions (smile and cheeks, brows, inner-brow concern, furrow, squint, wide eyes) follow the emotion of what is being said and ease in and out. They never come from the student's face or voice.
  - **Lighting**: a warm key light, cool fill and a rim light, image-based lighting from a studio environment, ACES tone mapping and soft shadows.
  - **Environments**: 8 rooms built in 3D (classroom, lecture hall, study room, science lab, consultation room, library, ERLY studio, minimal). They're rendered behind the person and blurred like a camera's depth of field, and can be switched live in Companion Studio → Look.
  - **Performance**:
    - the model loads only when chosen (1.6–4.8 MB each, plus a 2.1 MB motion pack per gender);
    - render resolution adapts to the frame rate;
    - the room is rendered once (not every frame);
    - reduced-motion settings stop head movement.
    - Without WebGL 2, a 2D companion with the same voice is used automatically.
- **Screen**: full-screen environment and person, glass name tag, caption bubble, horizontal audio waveform and floating controls (mic, pause, end, replay, captions, keyboard). The top bar has mode, language, companion picker, full screen, transcript and settings. Companion Studio has an avatar gallery with large portraits, role, voice pairing and a live 3D preview.

### Measured (headless Chromium, software WebGL, no GPU, `tests/e2e/human3d.e2e.js`)
- All 14 people load with the full face rig. The state machine plays the expected clip in every state, tone changes the gestures, and the mouth returns to rest.
- Lip-sync: the lips visibly move a median of **118–140 ms** (worst 164 ms, two runs) after each word-boundary event. This software renderer runs at only about 8 fps, so the delay is mostly frame time. Real devices with a GPU should be much lower, but haven't been measured yet.

### Honest limits and what would take it further
- **Realism**: Rocketbox characters are realistic, game-quality humans (about 22–27k vertices, 2K face textures). They aren't film-quality digital humans like MetaHumans: no strand hair, no subsurface skin.
- **Karim's face**: the 3D Karim is the closest library match to the reference portraits, not the same face. To build *that* Karim in 3D, you'd need a commissioned head sculpt or scan with ARKit blendshapes fitted onto a compatible rig. Reallusion Character Creator (with Headshot) or MetaHuman are options, but both need licences, and MetaHuman's licence limits use to Unreal Engine.
- **Lip-sync**: it follows text timing from the browser voice, not the audio phonemes. Exact phoneme visemes need a cloud TTS with viseme events (for example Azure Speech, via a backend that holds the key).
- **Clothing**: each person's clothing is part of their model. Changing outfits would need separate garment meshes.
- **Diversity**: it reflects what the library contains. Some regions, including South Asia, are under-represented. More characters can be added with the pipeline in `tools/humans/`.

## v7: interactive visual learning, real-time voice and two-host audio lessons

### Audit and research: what "photoreal" actually needs
I checked each official option before choosing one. Here is what each needs and whether ERLY can use it:

| Option | What it gives | Can ERLY run it today? |
|---|---|---|
| **Unreal MetaHuman** | Film-quality heads (strand hair, subsurface skin) | No. It needs Unreal Engine plus Pixel Streaming GPU servers, the licence terms on non-Unreal use are disputed, and there's no browser export. |
| **NVIDIA ACE / Audio2Face** | Audio-driven facial animation (SDK open-sourced 2025) | Only with a GPU server. It could drive our blendshapes later. |
| **HeyGen LiveAvatar / Tavus / Simli / Anam** | Photoreal *video* avatars streamed over WebRTC | Yes, but they are paid per minute and need an account and key. The `realtime` hook is where one would plug in. |
| **OpenAI Realtime API (WebRTC)** | Speech-to-speech, server VAD, barge-in, live transcripts | **Implemented** (`realtime.js` and the worker). Needs a key on the server. |
| **Gemini Live API** | Similar, using ephemeral tokens over WebSocket | Not wired. It has the same shape as the OpenAI path. |
| **ElevenLabs** | Expressive TTS with character timestamps; v3 audio tags (`[laughs]`) | **Implemented** as an opt-in cloud voice (worker `/tts`). |
| **three.js** | The in-browser 3D renderer | **In use** (Rocketbox people, plus the new 3D visuals). |

**Decision:** keep the free, private, in-browser 3D person as the default. Add optional server-backed premium engines, where keys stay in the worker and are never in the page. The biggest learning gain in this round goes into the **Interactive Visual Learning Engine**.

### Interactive Visual Learning Engine (`assets/js/companion/visuals.js`)
- **8 real, interactive scenes**:

  | Scene | Rendered with | What you can change or explore |
  |---|---|---|
  | Photosynthesis | SVG | 5 stages, with particle flows of CO₂, water, O₂ and sugar |
  | The heart | SVG | 6 stages; blood flow through the chambers and valves |
  | Electric circuit | SVG | Ohm's law computed live (I = V/R); a switch; voltage; one or two bulbs |
  | Plate tectonics | SVG | 5 stages |
  | Newton's three laws | Canvas | Friction, force and mass sliders driving real physics |
  | Quadratic graphs | Canvas | a, b and c sliders, with vertex, roots and discriminant, plus a safe expression parser (no `eval`) |
  | Gravity and orbits | three.js | Kepler-correct speeds, a gravity-off demo |
  | Cylinder volume | three.js | r and h sliders, with V = π × r² × h worked out |

  Every scene has stages, captions, pause/replay/step, speed control (0.5×, 1×, 2×) and keyboard control.
- **Driven by the conversation:**
  - Asking "explain photosynthesis" (or a similar question) opens the matching scene.
  - The AI can also choose one with a `[[visual:…]]` tag, or draw a step-by-step flow (`[[visual:flow|Title|A > B > C]]`) for any topic.
  - While the companion speaks, each sentence moves the visual to the stage it describes. "Guide me" gives a narrated tour.
  - In a call, the visual docks beside the 3D person, the camera shifts, and the person gestures towards it.
- **Audio lessons** (`audio-lesson.js`): two-host lessons in the style of NotebookLM, with **Maya and Sami**. They are built from a scene's stages, from the student's current reading (its pages and key terms), or from the AI using only the source it is given. The player has chapters, a transcript you can click to jump, and speed control. The two hosts use different voices.

### Premium engines (off unless configured; keys live only in `server/cloudflare-worker.mjs`)
- **Real-time conversation** (`ERLY_AI_CONFIG.realtime = { url: '<worker>/realtime/session' }`):
  - The worker mints a client secret that lasts 2 minutes, and the browser connects to OpenAI over WebRTC.
  - Turn detection is semantic VAD, so there's no tapping, and talking over the companion interrupts it.
  - Live captions show both sides.
  - Latency from end of speech to first audio is measured and shown (⚡).
  - It starts only after a "Start conversation" press with microphone consent, and the UI says that audio goes to a remote service.
- **Expressive cloud voice** (`ERLY_AI_CONFIG.cloudVoice = { url: '<worker>/tts', voices: { f, m } }`):
  - Uses ElevenLabs with timestamps, so lip-sync follows real character timing.
  - The v3 audio tags give real laughter only where the text actually laughs; nothing random is added.
  - Each student must switch it on in Voice settings.
  - If it fails, it falls back to the browser voice.
- **Worker hardening**: an origin allow-list, rate limiting per IP, validated voice IDs, and safety rules added to the realtime instructions.

### Measured (headless Chromium, software WebGL)
- `tests/e2e/visuals.e2e.js` checks all of the following:
  - every scene mounts;
  - speech moves the stages;
  - Ohm's law and cylinder maths are correct, and the parser rejects code;
  - topic detection and AI tags;
  - the narrated chat tour and the two-voice audio lesson.
- The same file tests both premium engines **against simulated providers**:
  - the ElevenLabs mock checks the laugh tag, voice ID, word boundaries and playback;
  - the Realtime mock checks the hearing → thinking → speaking → listening states, `session.update`, and that a tap cancels the answer.
- Neither engine has been run against the real OpenAI or ElevenLabs services, because no keys were available.
- Lip latency on the 3D person: median 102–170 ms across runs on software GL (worst 197 ms); GPU devices haven't been measured.
- Unit tests: 167 pass. All e2e suites pass.

### Honest limits
- **Realism**: the 3D people are still Rocketbox game-quality humans. Truly photoreal faces need a paid streaming-avatar service (HeyGen, Tavus, Simli, Anam) or licensed Character Creator / MetaHuman assets rendered on a GPU server.
- **Avatar library**: there are no South Asian Rocketbox models yet.
- **Laughter**: only the ElevenLabs v3 voice can laugh.
- **Real-time voice**: needs the worker deployed with `OPENAI_API_KEY`. Without it, the existing browser speech loop is used.
- **Gemini Live**: not wired yet.

## v8: a new digital human, consent-first dynamic visuals, and a workstation pipeline

### Audit: root causes found in the code
- **"Old video-game character".** The Rocketbox people are 2010-era game models: photo-textured, low-poly heads (~22k vertices for the whole body), no separate eyes, teeth or tongue, and a Biped skeleton. `tools/avatar-pipeline/optimize.mjs --check-only` measured the old Karim at **0/54** required animation bones, 41/52 ARKit face shapes and 13/14 visemes. More CSS or lighting could not fix that, so the model and its animation engine were **replaced** as the default.
- **The mouth.**
  - Rocketbox lip-sync mixed 12 hand-mapped shapes.
  - The new engine schedules real visemes per word.
  - Two timing bugs were found and fixed while testing it:
    1. the animation clock was capped per frame, so lips could drift behind the audio on slow devices;
    2. interrupted visemes could stay frozen half-open.
- **Blur.** The room was blurred by 3.5 px to hide low-detail environments. It is now 1.5 px of depth of field, and the new default background is a clean portrait studio.
- **Visuals.** Before v8, visuals were limited to 8 hand-built scenes that opened automatically, without asking. Now any question that a visual would help with gets an offer first.

### The new digital human: Aisha (`assets/js/companion/digital-human.js`)
- **Model.**
  - Made with Blender + MPFB/MakeHuman. **CC0**, from the TalkingHead repository.
  - 53k vertices; separate high-poly eyes, eyelashes, eyebrows, teeth, tongue and hair cards.
  - 52 ARKit shapes + 14 visemes; a Mixamo-compatible skeleton with all finger bones.
  - ERLY re-dressed her in a plain teal top (the MakeHuman logo was removed), fixed the iris colour, added a skin-detail normal map and compressed her from 35.1 MB to 5.4 MB.
- **Animation: TalkingHead v1.8.2 (MIT), vendored.**
  - Breathing and posture shifts; irregular blinks; saccades and eye contact.
  - IK hand movement while talking.
  - Gestures chosen by meaning: greeting → raised hand, "first / the key idea" → index finger, comparison → open hand to the side, "it depends" → shrug, genuine praise → thumbs-up. Cooldowns stop the hands from moving constantly.
  - Subtle expressions from the assistant's **own** tone (curious, serious, reassuring, surprised, etc.). Never from the student's face or voice.
- **Lip-sync.**
  - English phoneme rules → Oculus visemes for each word, started by the voice's real word-boundary events (or the cloud voice's character timestamps).
  - Voices without word events fall back to estimated timing.
  - The mouth closes immediately at the end of speech or on interruption.
- **Avatar choice.** Aisha is now the default; existing users are switched over once. The 14 Rocketbox people stay available as "Classic 3D (older, lower-detail)".
- **No male model yet.** No freely licensed male character of this quality was available. The two photo-based samples (Avaturn, AvatarSDK) are **non-commercial** and derived from real people, so they were rejected. `tools/avatar-pipeline` builds original characters (Karim, Priya, a lecturer) with Blender + MPFB on a workstation. That step could not run in the build container, because the MakeHuman asset servers are blocked there.
- **New environments.** Portrait studio (the default) and Modern campus. The book colours in the older rooms are muted.

### Dynamic, consent-first visual learning (`assets/js/companion/visual-spec.js`)
- **Pipeline:** question → **visual spec** (JSON) → strict **validation** → rendered by tested **primitives**. The model's code is never run.
- **Expression compiler.** Expressions are compiled by a small compiler that accepts only numbers, declared variables and maths functions. The tests confirm it rejects 13 kinds of code injection.
- **Primitives** (each with steps, play/pause, speed, sliders, and readouts that are actually computed):

  | Primitive | What it shows | Real computation |
  |---|---|---|
  | `plot2d` | Functions | Roots and intersections (e.g. market equilibrium), tangent slope, definite integral |
  | `surface3d` | Rotatable 3D surface | Gradient-descent ball |
  | `field2d` | Electric fields of point charges, or any vector field | — |
  | `waves` | Two-source interference, superposition, standing waves | — |
  | `network` | A neural network | **Trained by back-propagation in the browser** |
  | `algorithm` | Bubble, insertion, selection, merge and quick sort; binary search; recursion call tree | — |
  | `diagram` | Labelled process / cycle / hub diagrams | — |
  | `truss3d` | A 3D bridge truss | Method of joints + Gaussian elimination; members coloured by tension or compression |
  | `beam` | A loaded beam | Reactions, shear, moment, deflection, bending stress |
  | `matrix2d` | A matrix acting on the plane | Determinant, eigenvectors |
  | (scene) | The 8 hand-built scenes | — |

- **Where specs come from.**
  - **The local planner** covers calculus, statistics, economics, finance, multivariable maths, machine learning, algorithms, structural engineering, linear algebra, electromagnetism, waves, and curated diagrams for:
    - cellular respiration, protein synthesis, DNA replication, the action potential;
    - SQL query evaluation, the TCP handshake, stack vs heap memory;
    - the research process.
  - It reuses details from the question: the function to plot, the array to sort, the matrix to apply.
  - **With an AI brain connected**, the model designs a spec for topics with no built-in visual, validated the same way.
- **Consent.**
  - "Would you like me to create an interactive visual to help explain this?" with three answers: **Yes, create a visual** / **No, explain in text** / **Explain first, then create a visual**.
  - Works by tap, keyboard, or voice ("yes", "no", "explain first"). Each question is only asked once.
  - In a voice call, the companion asks out loud after its answer.
- **Explanation level.** Quick overview / undergraduate / advanced undergraduate / postgraduate / research-oriented. Set it in Companion Studio → Talk, or by saying "explain at postgraduate level". It is added to the AI's instructions.

### Avatar Lab (`avatar-lab.html`): diagnostics
- Shows live viseme and face blendshape weights, the current viseme and word, playback time, word-event count, viseme changes per second, word→lip timing, queued visemes, FPS, render scale, model load time, JS heap and GPU name.
- Buttons for expressions, gestures, states and environments, plus an automated lip-sync test (4 phonetic cases × 3 speeds).
- A box to plan and render a visual for any question.

### Workstation (ASUS ProArt P16 H7607BA)
- `docs/workstation/README.md`:
  - a hardware compatibility report for the NVIDIA N1X (an **Arm64** chip with unified memory);
  - ARM64-checked tools: Blender ARM64 ✅, MPFB ✅, Node ✅, **Audio2Face ❌** (x86 only), CUDA/PyTorch-CUDA ❌;
  - install commands, storage budget, and what runs locally vs in the browser vs on a backend.
- `tools/workstation/check-hardware.ps1` reports *your* exact CPU architecture, GPU, driver/CUDA, RAM, disks and tool builds.
- `tools/avatar-pipeline/`: `build_character.py` (Blender + MPFB → GLB + GPU Cycles portrait) and `optimize.mjs` (validate + compress).

### Tests (headless Chromium, **software** WebGL ≈ 4 fps; not representative of real GPUs)
- `tests/e2e/vspec.e2e.js`:
  - compiler safety and validation;
  - truss reactions (96 / 96 kN), beam (R_A 12, R_B 8, M_max 48 kN·m), cantilever;
  - 20 planner questions across subjects, each rendered;
  - equilibrium (Q = 50, then 60 after a demand shift), tangent slope 3.75, normal-distribution area 0.683;
  - the network trains (the loss falls), bubble sort ends sorted;
  - an AI spec for an unseen topic (heat pump) is accepted, and a malicious one is rejected;
  - **the consent flow inside the real companion**.
- `tests/e2e/avatar-lab.e2e.js`:
  - rig (52 ARKit, 14 visemes);
  - visemes scheduled for every word, first viseme peaking 25 ms after the word event, animation clock in real time;
  - mouth closed after speech and within 400 ms of an interruption;
  - P/B/M close the lips; expressions; meaning-driven gestures; blinks and saccades; all environments; phone layout.

### Honest limits
- Aisha is a clean, modern real-time character, but **not photoreal**: no strand hair, no true subsurface scattering, MakeHuman skin textures. Photoreal faces need a paid streaming-avatar service or licensed scans.
- With browser voices, lip-sync is based on the text (English phoneme rules timed by word events), not on audio phonemes. The optional ElevenLabs voice (`cloudVoice`) gives character-level timing.
- Not built yet:
  - Silero VAD, Whisper (Transformers.js) and Kokoro TTS. Their hosts were blocked in the build container, so they couldn't be tested.
  - A male model: see the workstation pipeline.
- Real-time voice and the cloud voice still need the worker deployed with keys.

## v9: experience layer (theme switch, living backgrounds, holo companion, accessibility centre)

### Audit first (headless Chromium)
- Every page (`index`, `login`, `student`, `checkins`, `support`, `faculty`, `counselor`, `university`, `avatar-lab`) was checked on desktop 1440 px and phone 390 px, in light and dark, scrolled top to bottom: **33 combinations**.
- Result: no JavaScript errors, no failed requests, no horizontal overflow, no broken internal links. This was true both before and after v9.
- Two real layout bugs were found by measuring, and fixed:
  - **Student header.** The nine nav links needed ~675 px but had 633 px at every desktop width, so "Growth Plan" touched the language button.
    - The links now fit, with slightly tighter link padding and gaps.
    - `navfit.js` measures the header and collapses it to the menu button whenever links would touch the header tools, in any language, at any text size or width.
  - **"Stop animations" hid the hero headline.** The reveal waited for an animation-end event that never fires at 0 s. Near-zero durations are now used, so the events still fire.

### Eclipse theme switch (`theme-fx.js`, `theme-fx.css`)
- The new theme spreads from the toggle with a **feathered edge**: an animated radial mask on a registered `--tfx-r` property, not a hard circle.
- A **luminous ring** rides the edge: warm gold into light, cyan-violet into dark. It is its own view-transition layer.
- The old theme dims and recedes slightly, and the icon springs.
- **Rapid clicks** finish the running switch and start the next. Tested: 7 clicks in a row leave the right theme, nothing stuck, no leftover layers.
- Fallbacks: a colour wash without View Transitions; an instant switch with reduced motion or with "Stop animations" on.
- Debugging notes: the ring wasn't captured until `contain: strict` was removed and the gradient was set to `closest-side`.

### Living backgrounds (`ambient.js`)
- Three looks:
  - **aurora**: soft light fields in the page's own accent colours, rendered into a 1/3-resolution offscreen canvas and scaled up;
  - **constellation**: drifting linked points with slight pointer parallax;
  - **holo**: a perspective grid with a scanning light.
- Used on: the student hero (aurora + constellation), the three dark sections (constellation), the Daily Quest and Growth Plan pages, and the counsellor, faculty and university dashboards (aurora).
- Capped at 30 fps; pauses off-screen and in hidden tabs.
- Follows the theme and accent colour; shows a still frame with reduced motion; fewer particles on low-power devices.

### Noor holo interface (`companion-holo.css`, `companion/holo.js`)
- A JARVIS-inspired but original ERLY look for the companion. It works by overriding the design tokens the companion already uses, so every part follows.
- Deep navy glass, HUD corner brackets, an arc-reactor orb with counter-rotating rings, and a cyan/violet light system.
- A scanning-grid background that runs only while the panel is open.
- Luminous AI message edges, gradient student bubbles, animated message arrivals, and a rotating light ring on the input while typing.
- The full-screen voice call gets a matching HUD frame, glass-cyan controls and caption styling.
- Text contrast stays high. Reduced motion stops every animation.

### Accessibility Control Centre (`a11y.js`, every page)
- Opened by the floating button (bottom-left) or **Alt+A**; Esc closes it and focus returns.
- Settings:
  - text size 90–140%;
  - high contrast;
  - stop animations;
  - reading-friendly font;
  - extra text spacing (WCAG 1.4.12 values);
  - underline links;
  - bold focus ring;
  - read the selected text aloud, with a speed control.
- Saved only on this device (`localStorage`). ERLY never infers or labels anything.
- The panel lives outside `<body>`, so the zoom never clips it. The header re-measures itself at the new text size.

### Page-to-page transitions and controls (`v9.css`)
- Same-origin navigations cross-fade with a slight rise (CSS `@view-transition`). Browsers without support just navigate.
- Buttons get springy press feedback, there is a consistent focus ring, and scrollbars and text selection are styled.

### Tests
- New `tests/e2e/v9.e2e.js` covers:
  - the theme switch: the ring and reveal are both animated, rapid clicks end on the right theme, and nothing is stuck;
  - backgrounds: visible ones animate, off-screen ones pause, and aurora renders below screen resolution;
  - the holo grid: runs when the panel is open, stops when it closes;
  - every accessibility setting: applied, persisted and reset; content stays visible with animations stopped; the panel stays on screen at 125%; read-aloud works;
  - the header fits at 1250–1920 px in English and Arabic.
- All previous suites still pass, plus 167 unit tests (v9).

### Limits
- These are visual and interaction upgrades. They don't add backend, AI or voice capabilities. The earlier limits (no live AI provider configured, a demo-grade, browser-only role check) still apply.
- Cross-page and theme view transitions need a Chromium-based browser or Safari 18+. Firefox gets the fallbacks.

## v10 — Noor repair, Learning Games, and the Growth Plan timetable

### Noor: bug register (reproduced or found by reading the code)
| # | Problem | Root cause | Fix | Test |
|---|---|---|---|---|
| 1 | "Would you like an interactive visual?" after almost every answer | `offerable()` offered a visual for any "how/why/explain" question once an AI tier was on. AI `[[visual:…]]` tags were also turned into offers. | Visuals are created **only on explicit request** ("draw", "plot", "diagram", "graph", "3D", "animate", "simulate", "chart", "timeline"…). Offers only appear if the student turns on **Companion Studio → Talk → Suggest visuals** (off by default). AI tags are ignored unless that setting is on. | `vspec.e2e.js` §7, `visuals.e2e.js` |
| 2 | The system prompt contradicted the UI (it said visuals open "automatically" and asked the model for tags) | Stale v7 prompt text | Prompt rewritten: never offer visuals or emit tags; refer to a visual only when one is open | `noor-ai.test.js` |
| 3 | Fabrication risk / weak uncertainty handling | No explicit accuracy instructions | Prompt now requires correctness before fluency, saying when unsure, never inventing facts, figures, quotes, references or URLs, showing working, and answering follow-ups from context | review of `ai.js` |
| 4 | Matrices, `cases` and `aligned` rendered flat (`A = 1 2 <br> 3 4`) | `md.js` discarded `\begin…\end` and turned `&`/`\\` into spaces and `<br>` | Real environment parser: a CSS grid with ( ) [ ] { } \| \|\| brackets, aligned columns, and a spoken form ("matrix [1, 2]; [3, 4]") | manual + `vspec`/`noor` e2e |
| 5 | Follow-ups such as "make it 3D", "add labels" or "highlight X" did nothing to the open visual | No edit path existed | `vspec.edit()` re-validates and re-renders the same spec. Supported: 3D (surface of revolution or field magnitude), rotate, labels on/off, add a layer or the derivative, animate (narrated tour), highlight a part, set a parameter (clamped to its range), bar/line/pie, more advanced/simpler. Edits it can't do faithfully are refused in plain words (e.g. no fake 3D for a process diagram). | `vspec.e2e.js` §7 |
| 6 | "Highlight" was overridden by the running tour | The tour kept advancing | Editing stops the tour first | `vspec.e2e.js` |
| 7 | The conversation was lost on every page change or reload | `history` lived in memory only | Kept in **sessionStorage** (this tab only; cleared by "New chat" or closing the tab) and restored as "Earlier in this tab" | `vspec.e2e.js` |
| 8 | Long conversations silently forgot the beginning | Only the last 10 turns were sent and the history cap was 16 | Cap raised to 40; turns older than the last 10 are passed as a compact list of the student's earlier questions | `noor-ai.test.js` |
| 9 | Shallow answers | No AI is connected by default (built-in rules only); the keyless online tier allows about 1 request per 30 s, then falls back to Wikipedia; on-device models are small | Not fixable in frontend code alone. Noor says plainly when the built-in brain can't answer. **Recommended:** deploy `server/llm-proxy.mjs` with a server-side key and set `ERLY_AI_CONFIG.endpoint`. | — |
| 10 | Data visualisation and timelines weren't supported | No renderer | New `chart` (bar/line/pie from the student's own numbers, or sourced figures from the AI planner) and `timeline` kinds, both validated | `vspec.e2e.js` |

Checked and **not** a bug:
- duplicate submissions (a `busy` lock already exists);
- code blocks, tables, fractions, roots, sums, limits, vectors and `\ce{}`;
- streaming stops (a Stop button already exists).

AI-generated JavaScript is never executed. Specs are JSON; expressions go through a whitelist compiler.

### Learning Games (`games.html`, `games.js`, `games-data.js`)
Eight optional activities:

| Area | Activity | What you do |
|---|---|---|
| Reading & language | Word Builder | Morphemes |
| Reading & language | Sentence Flow | Signal words |
| Memory | Glow Sequence | Repeat a sequence of lights |
| Memory | Chunk It | Remember digits; compares chunked and un-chunked rounds |
| Planning | Plan It | Order tasks by dependencies; several valid orders are accepted |
| Attention | Switch! | Sort by shape or by colour as the rule changes |
| Spatial | Rotate 3D | Real three.js polycubes, all verified chiral; Gentle level has a turn slider; 2D fallback |
| Listening | Listen & Tap | Spoken instructions; text when sound is off |

Settings:
- difficulty: Gentle / Standard / Stretch;
- length: 5 / 8 / 12 rounds;
- graphics: High / Low-performance (no antialias, 1× pixels, render on demand);
- sound: **off by default**;
- category filter.

During and after a game:
- Pause (Esc), Skip and Stop cost nothing.
- Each game ends with strategy tips and an optional "what helped today?".
- My progress shows sessions and sparklines, with a "Clear my game data" button.

Boundaries, enforced by tests:
- no test or diagnosis wording;
- no camera or microphone (`getUserMedia` is never called);
- no network requests;
- results stay in `localStorage` (`erly-games-v1`).

The Growth Plan links straight into a game (`games.html?play=plan`).

### Growth Plan v10 (`growth-plan-core.js` pure logic + `growth-v10.js` UI)
Tabs: **Overview** (the existing plan), **Today**, **Timetable**, **Six weeks**, **Progress**, **Strategies** and **Future plan**.

- **Timetable.** A UK-style day, 08:30–14:15 by default, with 45-minute sessions, 15-minute breaks and lunch at 12:00.
  - Monday to Friday are structured. Saturday is an optional catch-up. Sunday is rest, with an optional reflection.
  - You can customise: start and finish, session and break length, lunch, Saturday and Sunday, workload (1/2/3 programme blocks a day), and classes and commitments (placed first; study fits around them).
  - On phones it shows one day at a time.
- **Six weeks:**
  1. Foundation
  2. Reading and understanding
  3. Memory and revision
  4. Planning and organisation (Start-Ramp)
  5. Focus and independent learning
  6. Review and future planning, with an optional SAS summary

  Each activity says why it's there and links to the real place in ERLY: Reading Studio, Videos, Start-Ramp, Daily Quest, Noor or a game. You can repeat a week, move on, pause or finish early. The journey map and weekly cards are animated.
- **Daily planner.** Each entry has a time, activity, objective, duration and status, plus a reflection and next step. You can complete, skip, move to tomorrow, resize, reorder and add your own work.
  - Activity that ERLY can actually see on this device (games played, Reading Studio opened, check-ins) is shown as a *suggestion*. Nothing is ticked automatically.
- **Progress.** Planned vs done by week, minutes, active days, games, reflections and past reviews, all from this device's data. There are no streaks and no ability scores.
- **Noor's weekly review.** Five questions. The summary uses the student's own numbers and words and changes the plan: workload, shorter sessions, repeat or pause. It is labelled as written without an AI model or server.
- **Strategies.** Twelve evidence-informed strategies, each rated "helps me", "want to try" or "not for me". **Future plan** lists the helpful ones, shows a light weekly routine, and can be printed or saved as PDF.
- The old "day streak" counter has been replaced by "days you practised this week".

### Tests
- New `tests/unit/growth-plan.test.js` (6 tests).
- New `tests/e2e/v10.e2e.js`. It plays all 8 games correctly; checks pause, skip, stop and Esc, sound-off-by-default, low-performance 3D, and that nothing touches the mic, camera or another server; then exercises every Growth Plan tab, including mobile 390 px with no horizontal scroll.
- `vspec.e2e.js` and `visuals.e2e.js` were updated to the v10 visual behaviour.

### Backend still needed for "university-level" answers
A configured LLM endpoint (`server/llm-proxy.mjs`, key held server-side). Without one, Noor uses its built-in knowledge, small on-device models, or a rate-limited keyless service, and says so.

## v11 — emergency repair, real AI architecture, open-ended visuals, accessibility and audit

### Bug register (reproduced in a browser or confirmed in the code)
| # | Area | Problem | Root cause | Fix | Test |
|---|---|---|---|---|---|
| 1 | Chat | Pressing Enter while Noor was replying didn't send — it only stopped the reply | The submit handler returned after `stopGenerating()`; the old reply also held the `busy` lock after it was stopped | A typed message stops the old reply and is sent; an empty box means "stop" | `chat.e2e.js` |
| 2 | Chat | Scrolling the chat scrolled the page behind it (iPad/iPhone) | `#cmpLog` had no `overscroll-behavior`, so scrolling chained to the page; older iOS ignores that property | `overscroll-behavior: contain`, `touch-action: pan-y`, plus a touch fallback that stops chaining at the top and bottom | `chat.e2e.js` (wheel over 30+ messages, page never moves) |
| 3 | Chat | New replies dragged you down while reading older messages | Every bubble called `scrollTo(bottom)` | Follows only when you're near the bottom; otherwise a "New messages ↓" button appears | `chat.e2e.js` |
| 4 | Chat | No way to upload screenshots or images | Never implemented | Attach, paste or drop PNG/JPEG/WebP: validated, previewed, removable, up to 4, scaled to ≤1600 px; sent as OpenAI-style `image_url` parts **only** to a service that declares vision; otherwise Noor says plainly the image was **not** analysed and keeps it in the composer | `chat.e2e.js` (a fake vision server receives the PNG) |
| 5 | Navigation | Back after opening the Growth Plan showed a frozen page | Safari/Chrome restore the page from the back-forward cache with the full-screen "seedling" overlay still on top (also the Daily Quest rocket and the login wipe) | A `pageshow` (persisted) handler removes leftover overlays and unlocks the login form | `nav.e2e.js` |
| 6 | Navigation | Back/refresh asked you to sign in again | `index.html` and `login.html` deleted the session (and **all** Growth Plan and Games data) on every direct visit, including Back/Forward | The reset never runs on reload or back/forward and never deletes progress or settings; an 8-hour device session (`acubins-session`) survives new tabs; sign-out clears it; sign-in returns to the page that asked | `nav.e2e.js` |
| 7 | AI | Shallow answers | No model connected by default; the Worker used `effort: low`, 4,096 tokens and dropped images; the proxy had 1,500 tokens and 8 turns | `server/noor-core.mjs` (shared by the Worker and the Node proxy): `claude-opus-5-5`, effort chosen per question, 16k output, streaming, vision, 60-turn context, optional web search with real citations, refusal fallbacks, validation and rate limits | `noor-core.test.js` |
| 8 | Visuals | Only a fixed set of visual templates | Renderers existed only for specific topics | New open kinds `scene2d` (SVG) and `scene3d` (three.js), composed by the model as validated JSON. Shapes, labels, details, layers, steps and animations (move/rotate/orbit/flow/pulse) with hover/tap detail, zoom/pan, an orbit camera and layer toggles. No generated code runs | `companion-quality.e2e.js` (a model-composed plant cell renders) |
| 9 | Visuals | "Create a visual explanation of…" wasn't treated as a request for a visual | The intent regex was too narrow | Widened ("visual explanation/representation", "create/make/build a …") | `companion-quality.e2e.js` |
| 10 | Content | Stats showed "0" / "0%" and the scholarship "AED 0" in the page source | Count-up animations started at 0; static placeholders | Real values in the markup; JS only animates them | — |
| 11 | Content | "Reading aloudyour choice…" and "Read-aloud onfollowing…" in text extraction and screen readers | No whitespace between adjacent elements | Whitespace added (`</b> <small>`) site-wide | — |
| 12 | Content | Duplicated ticker block | The loop copy was written into the markup | The copy is created at runtime with `aria-hidden` | — |
| 13 | Content | Open Day (Nov 4) still advertised as upcoming | Events had no date awareness | Past events are labelled and listed last; the menu card shows the next real event | — |
| 14 | Content | "Ranked top 5 · QS 2026", example phone and email shown as real | Fictional university not labelled | Labelled as a fictional demo university, with example contact details | — |
| 15 | Content | "Fully on-device edge AI" vs "simulates inference" | Contradictory claims | Rewritten: what is live (in-browser statistics), what is simulated (Demo mode feed), what is planned (local ML models) | — |
| 16 | Content | Arabic hero said 44 indicators / 7 categories; login said "Four weeks" | Stale translation and copy | 100 indicators / 10 domains; two weeks | — |
| 17 | Content | "≈94% pass literacy benchmarks (Bayanat)" | Source could not be verified | Relabelled as a reported Grade 12 pass rate (94.4%), marked not independently verified. The 17.6% figure was checked against Aboudan et al. 2011 (IJEL) | — |

### Accessibility Control Centre (rebuilt)
Four sections, all applied as classes or variables on `<html>` (no re-rendering), saved on this device, reversible, and usable by keyboard (arrow keys switch sections):
- **Reading:** text size, reading font, line/letter/word spacing, reading width, reading guide band, WCAG preset, and read-aloud (play/pause/resume/stop, voice, speed).
- **Visual:** theme Light/Dark/System (System follows the device live), high contrast, colour tint, fewer distractions, underline links.
- **Interaction:** stop animations (follows the device's reduced-motion setting until you choose), bold focus ring, 44 px targets.
- **Learning:** shorter, step by step, more examples, information density. These change Noor's instructions. Also the "suggest visuals" and "speak replies" preferences, which are Noor's own settings.

### What needs infrastructure
A strong model needs the Claude server. It is ready to deploy, but needs an Anthropic API key held on a server (never in this repo):
1. `npm create cloudflare@latest erly-noor -- --type hello-world --lang js`
2. Copy `server/cloudflare-worker.mjs` → `src/index.js` and `server/noor-core.mjs` → `src/noor-core.mjs`.
3. `npm install @anthropic-ai/sdk`
4. `npx wrangler secret put ANTHROPIC_API_KEY`
5. Optionally, `npx wrangler secret put ERLY_WEB_SEARCH` (value `1`).
6. `npx wrangler deploy`
7. In `assets/js/companion/config.js` set:
   `online: { name: 'Claude', site: 'ERLY server', model: 'claude', vision: true, url: 'https://erly-noor.<you>.workers.dev/v1/chat/completions' }`

Without it, Noor uses its built-in knowledge, a small on-device model, or the rate-limited free service, and says so. Image understanding works only with the server.

Not implemented (needs a backend or a product decision): retrieval over course documents (embeddings and a vector index), server-side accounts and authentication (the sign-in is a client-side demo), and cross-device sync.

## v12: Learning Games replace the Daily Quest, Handwriting Check v2, Noor answers that stay on topic

### Learning Games (replaces the Daily Quest)
- The Daily Quest is gone from the student dashboard, the navigation, Noor and the Growth Plan. Its place is **Learning Games** (`games.html`): the nav link, the dashboard section (`#games`, which keeps a `#checkins` anchor so old links still land), Noor ("take me to the games") and the Growth Plan's week-5 activity all point there. `checkins.html` now redirects to `games.html`. Earlier Daily Quest results are left untouched in the browser (`erly-checkins-v1`); nothing new is written there.
- 12 games in 10 categories: Read & Reason and Sentence Flow (reading comprehension), Word Builder (vocabulary), Glow Sequence and Chunk It (memory), Plan It (planning), Switch! (focus), Listen & Tap (listening), **Story Spark** (writing), Rotate 3D (spatial), **Pattern Seeker** (patterns), **Tower Shift** (problem-solving, Tower of Hanoi). The bold ones and Read & Reason are new.
- Every game has an intro screen with how-to-play steps, then pause / skip / restart / stop, a completion screen with strategies, an optional "what helped" reflection, and Play again / Try another game. There are no countdowns, rankings or leaderboards.
- The page has an animated hero (CSS only, paused under reduced motion), category filters with their own colour and icon, the duration and difficulty on every card, recent activity, and achievements that reward **taking part only**, never accuracy or speed. A "Return to dashboard" link is there too.
- The games don't test, detect or diagnose anything, and nothing feeds the analyser. Activity stays in `erly-games-v1` on the device and can be cleared. Story Spark text is never stored.

### Handwriting Check v2
What the old version did (audit): it used no text recognition. It measured "features" (size, spacing, slant…) from the photo, combined them with self-reported spelling, stored a "level" in `erly-hand-v1`, and fed that to the analyser and Growth Plan as evidence. That inferred something about the student from their handwriting, so v12 **removes all of it**: the stored levels are deleted on load, the analyser and Growth Plan no longer read them, and Noor no longer comments on handwriting results.

The new flow (`assets/js/handwriting.js` pure pipeline + `assets/js/hand-ui.js` interface):
1. **Intro.** A signature-style transition writes "Your handwriting, your pace." (SVG stroke + reveal). It is skippable, static under reduced motion, and decorative only (the text is in `aria-label`). The intro also explains what the check does and what it cannot do.
2. **Notebook.** Three sentences to copy (English or Arabic; different sets available; optional read-aloud).
3. **Photo.** "Take a photo" uses a file input with `capture`, so the camera opens only when the student taps it; `getUserMedia` is never called. Upload or drag-and-drop also work. The preview offers rotate, crop, retake and remove.
4. **Photo-quality checks.** Lighting, glare, contrast (ink vs paper, Otsu), sharpness (Laplacian variance relative to ink), amount of writing (connected components), writing size, sideways page (projection profiles), tilt (auto-straightened), writing cut off at the edges, and busy background. If an essential check fails, the student gets the reason and a retake request, and **no recognition is attempted**.
5. **Recognition.** [Tesseract.js](https://github.com/naptha/tesseract.js) 7.0.0 (Apache-2.0) with the `eng` / `ara` LSTM models, vendored in `assets/vendor/tesseract/` and running **in the page** (WebAssembly). The image is straightened, binarised and trimmed first.
6. **Result.** Clear / partial / **inconclusive**, the words that were and weren't recognised, the software's confidence, the raw text, the stated limits, and these actions: Try again, Try different sentences, Talk to SAS, Discard.

Privacy, verified by tests (`tests/e2e/handwriting.e2e.js`):
- During recognition every request goes to this site (scripts, model files). The only outside request is the Caveat display font from Google Fonts, fetched when the check opens.
- No request ever carries the image.
- Nothing is written to local or session storage.
- Discard and close clear the photo and the result from memory.

Options considered for recognition:
- **Cloud handwriting OCR** (Google, Azure, AWS) reads handwriting much better, but needs an API key behind a server and would upload the photo. Rejected for now.
- **Transformer models in the browser** (TrOCR via Transformers.js) read single lines and are hundreds of MB. Not tested here.
- **Tesseract** is built for print, but it is free, local, and supports English and Arabic. That is what ships, and its limits are stated in the interface.

**Measured evaluation** (`tests/eval/handwriting-eval.js` → `docs/handwriting-eval.json`). The images are **synthetic**: the prompt sentences rendered in 6 handwriting-style English fonts and 3 Arabic fonts (OFL, `tests/fixtures/fonts`), each under 8 conditions. These are **not** real student handwriting, and accuracy on real handwriting has **not** been measured.

| | Images | Rejected by the quality checks | Mean CER (accepted) | Mean WER (accepted) | Clear / partial / inconclusive |
|---|---|---|---|---|---|
| English | 48 | 28 | 0.128 | 0.254 | 15 / 1 / 4 |
| Arabic | 24 | 13 | 0.161 | 0.512 | 6 / 5 / 0 |

- **Rejection:** all 36 deliberately bad images (blurred, dim, cropped, sideways) were rejected, and none of the 27 clean, tilted or mixed-condition images were.
- **English by condition:** clean 0.094 CER, tilted 8° 0.102 CER. Tiny writing was mostly rejected (4/6), and the 2 that got through read badly (0.385 CER).
- **Hardest cases:** the joined cursive font (Homemade Apple) came out inconclusive at about 0.5 CER, and Arabic word error stays around 0.5.
- **Speed:** median recognition time was about 0.15 s per page after the model loads.
- **Mixed Arabic + English on one page** (`tests/eval/handwriting-mixed-eval.js` → `docs/handwriting-mixed-eval.json`; 4 synthetic pages, each with 2 English and 2 Arabic lines, each language scored against its own lines). Character error (CER) by model:

  | Model | English lines | Arabic lines |
  |---|---|---|
  | English model only | 0.47 | 0.99 |
  | Arabic model only | 0.92 | 0.98 |
  | Both together (`ara+eng`) | 0.098 | 0.397 |

  Arabic varied a lot from page to page (0.18–0.82). Mixed pages are therefore offered only as **"Mixed (experimental)"**, which uses `ara+eng` and tells the student the measured limitation before and after.
- The dialog moves focus to each step's main action, keeps Tab inside, closes on Escape, and returns focus to the button that opened it. Its photo buttons work from the keyboard.

### Noor
- **Root causes of the reported problems:**
  - When the free AI service was rate-limited, Noor fell back to a fuzzy knowledge-base match. That is how an engine question got a "presentation anxiety" answer.
  - Noor also showed the service's cooldown text.
  - "How mechanical engines work" matched no built-in composition, and no AI planner was available, so no visual was built.
  - Narrow table cells split words across lines.
- **Fixes:**
  - The free-tier wait is now silent, and 429 responses are retried.
  - Every fallback answer must pass a topic-relevance check, or it is not shown.
  - On failure Noor says "Noor is temporarily unable to complete this request. Your message is still here — please try again shortly.", puts the message back in the box, and offers Try again.
  - Provider error text is never shown.
  - The engine visual now matches many phrasings.
  - New built-in compositions: atom (conceptual Bohr model, labelled as such), speed–distance–time (live sliders), digestive system and water cycle.
  - "Show me X visually" now opens a new visual instead of being read as "highlight X" in the one on screen.
  - Tables keep whole words and become stacked cards on phones.
- **Verified** by `tests/e2e/noor-v12.e2e.js`, with a fake model server, so the browser pipeline is tested but not a real model:
  - engine (four strokes in order; piston, valves and crankshaft labelled; replay);
  - photosynthesis;
  - binary search (step forward and back);
  - speed–distance–time (changing a value redraws the graph);
  - atom;
  - the relevance sequence engines → photosynthesis → binary search → presentation anxiety → engines;
  - the failure path;
  - tables at 390 px.
- **Reliability plumbing:**
  - Every request to your own AI server carries a request ID (`nr-…`), which the server logs with any error. The Cloudflare worker and Node proxy both read it and return it in `x-request-id`.
  - A dropped connection or a 5xx before any text arrives is retried twice, with backoff of 0.8 s and then 1.6 s.
  - If the server fails mid-answer, it sends an error event. The browser no longer shows the cut-off text as if it were complete: Noor gives the standard message plus a "Support reference" matching the server log.
  - All of this is verified in `noor-v12.e2e.js`.
- **Noor explains ERLY's own features:**
  - Learning Games: what each game practises, and that they never test or diagnose.
  - The Handwriting Check: how it works, what "inconclusive" means, and that it cannot detect dysgraphia or dyslexia.
  - A question naming one of these features gets that feature's answer, even when it mentions a condition. "Can the Handwriting Check detect dysgraphia?" is answered by the Handwriting Check entry, which says it can't.
- **Rendering engines evaluated, not installed blindly:**
  - Visuals use ERLY's own validated SVG/canvas renderers plus three.js (already vendored) for 3D.
  - Maths is rendered by the built-in TeX subset in `md.js`.
  - Mermaid (about 1 MB), Plotly (about 3.5 MB) and D3 would add weight without adding a kind of visual the spec engine lacks. A diagram language would also need its own sanitising, so none were added.
- **Arabic layout:** game text in English (reading passages, sentences, plans) keeps its own direction on an Arabic page, so punctuation no longer jumps to the wrong end.
- **Still not done** (needs a backend or a product decision): multi-provider routing; retrieval over licensed sources (RAG); building visuals for topics outside the built-in set, which needs the AI planner (the Claude server).
