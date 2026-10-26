# ERLY: notice sooner, on your terms

**E**arly **R**ecognition of **L**earning barriers, on **Y**our terms.

This is the website and interactive prototype for Team Rising Stars' entry in the UAE Hackathon (Student Accessibility Services early-identification challenge). ERLY is a browser companion that asks for consent first and does its work on the student's own device. It notices study-strain patterns in university students. It shows each insight to the student first, and it lets the student decide who else is told.

## Run it

You don't need a build step or any dependencies. It is plain HTML, CSS and JS.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

You can also open `index.html` directly. To host it, enable GitHub Pages on the branch. The site works as is.

## What's on the page

| Section | What it shows |
|---|---|
| 01 The gap | Bayanat's ≈94% Grade 12 literacy pass rate vs. the 17.6% dyslexic features found in the UAEU study, plus our own critique of that study |
| 02 Problem | Masking, the bilingual blind spot, acquired strain, and a composite persona |
| 03 Journey | The eight-step semester, from opt-in and Blueprint to the Pact, blind window, convergence, card, Ally Bridge and SAS loop |
| 04 Signals | The 4 core signals, 6 extra indicators that the pilot must validate first, the indicators we dropped, and Profiles A/B/C |
| 05 Prototype | 8 screens (below) |
| 06 Live reader | A real on-device scroll-regression counter, read-aloud, readable font, line focus, spacing, summary, and the L4 bandit |
| 07 Features | The flagship features, Curriculum Mirror, Exam Mode, Warm Handoff, SAS Bridge Letter and the Grammarly Defence |
| 08 AI | Layers L1–L4 and the local model stack, each labelled live / simulated / roadmap |
| 09 Privacy | Where data flows, what we never collect, the eye-tracking option we rejected, and the policies we align with |
| 10 Data | An impact calculator with editable assumptions, the datasets and what each is used for, and a statement on missing data |
| 11 Plan | The 90-day plan, ending in a scale / no-scale decision |
| 12 Q&A | The pre-mortem questions and our answers |

### Prototype screens

1. **Consent & Support Pact**: a separate switch for each signal, allowed sites, allies, and a seal that expires.
2. **Learning Blueprint**: four questions about strengths. The answers filter which tools ERLY offers and set the starting preferences for the L4 bandit.
3. **Signal timeline**: the real detection engine running on a synthetic semester. You get 5 scenarios, an Exam Mode toggle, and play/scrub controls. The chart shows z-scores against the student's own baseline, alongside a radar chart, the convergence grid and a log.
4. **Insight card**: in English and Arabic. It names its 3 contributing signals and gives the Friction Fingerprint and tool suggestions filtered by the Blueprint. It also has an optional Reading Rhythm Check. It never shows a % confidence.
5. **Ally Bridge**: re-confirm consent → Support Playbook (say / avoid) → a four-step conversation guide → joint SAS booking → warm handoff checklist.
6. **Start-Ramp**: deadline-aware nudges, a five-minute first step, micro-tasks, a focus timer and a body-doubling room.
7. **Evidence Pack & letter**: a pack the student exports (JSON download / print). The accommodation letter stays locked until a clinician confirms an outcome.
8. **SAS dashboard**: KPIs, the referral pipeline, and a Curriculum Mirror heatmap. Cells with fewer than 10 students are hidden. Clicking a hot cell drafts an anonymised nudge to the professor.

## How the engine works (`assets/js/prototype.js`)

- **Baseline:** for each signal, the median and MAD over weeks 1–6 (the blind window). Each later day becomes a robust z-score.
- **Weekly elevation:** a signal counts as elevated in a week when its mean z for that week is ≥ 1.25.
- **Convergence rule:** a card appears only when **3 or more signals** stay elevated for **2 or more consecutive weeks that are being judged**.
- **Exam Mode:** pauses judgement during the midterm week. That week neither counts towards a run of elevated weeks nor breaks one. Use the "Midterm crunch only" scenario to see it: with Exam Mode off it raises a false positive, and with Exam Mode on it stays quiet.
- Turning a signal's consent off removes that signal from the rule.

## Demo script (≈90 s of the 5-minute pitch)

1. In *Signal timeline*, pick **Visual Decoder** and press ▶. Narrate the blind window, then the convergence grid filling, then the card firing.
2. Switch to **Midterm crunch only** and toggle Exam Mode off and on: "We know the difference between a bad week and a pattern."
3. Open the *Insight card* and flip English ↔ العربية.
4. Open *Ally Bridge* and show Sara's playbook. This is the emotional beat.
5. Finish on the *SAS dashboard*: click MECH 210 week 4 and say "the problem might be the PDF".

Shortcuts: `⌘K` / `Ctrl K` jumps anywhere, `T` switches theme, `L` switches English / Arabic, `P` starts the 5-minute pitch timer.

## Honesty map

- **Live:** all the UI flows, the detection engine's logic, the live reader (scroll regressions, read-aloud via the Web Speech API, fonts, line focus), the L4 Thompson-sampling bandit, the letter templates and the Evidence Pack export.
- **Simulated:** all student and cohort data (synthetic and labelled that way), the 60-second summaries and the body-doubling room.
- **Roadmap:** LMS LTI integration, on-device LLM summaries (WebLLM), federated L3 calibration and cohort outreach.

## Structure

```
index.html
assets/css/style.css     design tokens, light/dark, RTL-aware layout
assets/js/i18n.js        Arabic translations (English lives in the HTML)
assets/js/main.js        theme, language, nav, palette, pitch timer, calculator, live reader
assets/js/prototype.js   detection engine + the eight prototype screens
assets/img/mark.svg      favicon
```

## References

- Aboudan, R. et al. (2011). *International Journal of English Linguistics* 1(2):64. doi:10.5539/ijel.v1n2p64
- Song, P. et al. (2021). The prevalence of adult ADHD: a global systematic review and meta-analysis. *J Glob Health* 11:04009.
- Vos, M. & Hartman, C. (2022). The decreasing prevalence of ADHD across the adult lifespan confirmed. *J Glob Health* 12:03024.
- Bayanat open data: Grade 12 pass rates, higher-education enrolment.
- UAE Federal Decree-Law No. 45 of 2021 (PDPL).
