# ERLY: test first. Watch only with permission. Then stop.

**E**arly **R**ecognition of **L**earning barriers, on **Y**our terms.

This is the website and interactive prototype for Team Rising Stars' entry in the UAE Hackathon (Student Accessibility Services early-identification challenge). ERLY is a browser companion that asks for consent first and does its work on the student's own device. It notices study-strain patterns in university students. It shows each insight to the student first, and it lets the student decide who else is told.

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

## References

- Aboudan, R. et al. (2011). *International Journal of English Linguistics* 1(2):64. doi:10.5539/ijel.v1n2p64
- Song, P. et al. (2021). The prevalence of adult ADHD: a global systematic review and meta-analysis. *J Glob Health* 11:04009.
- Vos, M. & Hartman, C. (2022). The decreasing prevalence of ADHD across the adult lifespan confirmed. *J Glob Health* 12:03024.
- Bayanat open data: Grade 12 pass rates, higher-education enrolment.
- UAE Federal Decree-Law No. 45 of 2021 (PDPL).
