# ERLY: test first. Watch only with permission. Then stop.

**E**arly **R**ecognition of **L**earning barriers, on **Y**our terms.

This is the website and interactive prototype for Team Rising Stars' entry in the UAE Hackathon (Student Accessibility Services early-identification challenge). ERLY is a browser companion that asks for consent first and does its work on the student's own device. It notices study-strain patterns in university students. It shows each insight to the student first, and it lets the student decide who else is told.

## SAS portal (start here)

`index.html` is the **SAS — Student Accessibility Services** sign-in page. You choose Student or Counselor, then sign in:

| Role | Username | Password | Goes to |
|---|---|---|---|
| Student | `Acubins` | `1234` | `student.html` (the ERLY site) |
| Counselor | `Counselor` | `4321` | `counselor.html` (SAS dashboard) |

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

## References

- Aboudan, R. et al. (2011). *International Journal of English Linguistics* 1(2):64. doi:10.5539/ijel.v1n2p64
- Song, P. et al. (2021). The prevalence of adult ADHD: a global systematic review and meta-analysis. *J Glob Health* 11:04009.
- Vos, M. & Hartman, C. (2022). The decreasing prevalence of ADHD across the adult lifespan confirmed. *J Glob Health* 12:03024.
- Bayanat open data: Grade 12 pass rates, higher-education enrolment.
- UAE Federal Decree-Law No. 45 of 2021 (PDPL).
