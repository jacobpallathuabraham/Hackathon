# ERLY / Acubins: v15 audit and changes

Date: 11 November 2026.
Method: everything below was checked against the source and in a running browser (Playwright with Chromium). I've noted anything I couldn't test.

## 1. Route and feature inventory

| Page | Who can open it | What it is | Status |
|---|---|---|---|
| `index.html` | Everyone | The Acubins University homepage (a **fictional** university): programmes, admissions, scholarship estimator, research, campus, news, events | Working. The content is illustrative. |
| `login.html` | Everyone | Sign-in for students, faculty and counselors, with the `?next=` and `&back=` redirects | Working. This is a **prototype sign-in**: demo accounts are checked in the browser, so it isn't secure authentication. |
| `university.html` | University role | The leadership "Command Center": enrolment, attendance, the support pipeline | Working. All data is **synthetic**. |
| `student.html` | Student | The ERLY dashboard: the evidence section, the Support Pact and 14-day tracking, Reading Studio (PDF), lecture videos, Insight, the Evidence Pack and SAS hand-off, privacy, Noor | Working. The tracker has a "Demo" mode and a strict "Real" mode. |
| `support.html` | Student | Growth Plan: timetable, 6-week programme, planner, Noor review | Working |
| `games.html` | Student | Learning Games: 12 games, non-diagnostic | Working |
| `checkins.html` | (none) | Redirects to `games.html` (the old address) | Redirect only |
| `handwriting.html` | Student | Handwriting Check: liquid-ink entrance, on-screen pen or photo, text recognition (Tesseract) run on the device | Working. Non-diagnostic. |
| `faculty.html` | Faculty | Courses, attendance, observations and referrals | Working. Data is synthetic. |
| `counselor.html` | Counselor | SAS workspace: requests, cases, cohort insight (k ≥ 10) | Working. Data is synthetic. |
| `knowledge.html` | University role | Noor's knowledge quality: source registry, live connector check, usage | Working |
| `avatar-lab.html` | (not linked) | Developer diagnostics for the avatar and visual engine | Internal tool |

**Shared on every page:**
- theme switching (`theme-fx.js`);
- the Accessibility Control Centre (`a11y.js`, which `knowledge.html` now loads too);
- the Arabic/English language switch (`i18n.js`). The login page doesn't have it yet; see "Not done".

**Noor** (on the student pages) answers with its built-in knowledge when no online AI is set up. Online answers are optional: they go through a self-hosted gateway to the Gemini free tier, and only after the student agrees in a consent card. The open-source research uses Wikipedia, Wikidata, Crossref and similar sources.

## 2. Findings and fixes

### Critical: misleading claims, privacy wording and security wording

| # | Finding | Fix |
|---|---|---|
| C1 | The homepage marquee listed real organisations as if they were accreditations or partners: CAA, QS ★★★★★, AACSB, ABET, ADEK, Cleveland Clinic, Masdar, Mubadala, Etihad, ADNOC, a Microsoft AI Lab, a UNESCO Chair. A fictional university can't claim any of them. | The marquee now says what the site is: a fictional university, no accreditation, ranking or partnership claimed, illustrative content, and a working ERLY prototype. |
| C2 | The careers modal listed made-up jobs under real employers (Masdar, Mubadala, Careem, Cleveland Clinic AD). | They now show generic employer types, labelled "Example listings … no real employers". |
| C3 | The homepage figures (8,420 students, 94% employed, AED 62M funding…) were presented as fact. | Labelled "Illustrative figures for a fictional university — not real statistics". The search-engine metadata (meta description, `CollegeOrUniversity` JSON-LD) now says it is fictional. |
| C4 | The sign-in card said "Encrypted session". Sign-in is a check in the browser against published demo accounts. | It now reads "Prototype sign-in for the demo: checked in this browser, not secure authentication". |
| C5 | The evidence section called a 94.4% school pass rate and a 17.6% screening figure "two official numbers", set them side by side as a "gap", and claimed that "no one has measured since" and that the pilot gives "the first current, consented dataset". | Rewritten in English and Arabic (see section 3). The "vs" became "≠", and the claims I couldn't prove were removed. |
| C6 | The dashboard said Noor's optional online AI "sends only what you type". In the code, it also sends the text of the page being read (and any selected passage) and attached images. | The consent card (English and Arabic) now lists exactly what is sent. The dashboard figure now says tracking data never leaves the device, "not even to Noor's optional online AI" (true: Noor's memory and tracking data are not sent to an external model). |
| C7 | The university, faculty and counselor portals showed fictional students with no label. | Each portal now shows a persistent label: "Demo data: all students, staff and figures in this portal are fictional". |

### High: broken or wrong behaviour

| # | Finding | Fix |
|---|---|---|
| H1 | The admissions banner said "Fall 2026 applications close Nov 30", but Fall 2026 started on 24 August. The FAQ contradicted itself. | The next deadline is now worked out from today's date (Spring intake closes 15 Dec; Fall intake closes 30 Jun). The banner, quick link, admissions heading and FAQ all agree. |
| H2 | The university portal always said "Fall 2026, week 10". | The term and week are now worked out from the date. |
| H3 | **Pressing any centred floating button made it jump sideways**, so the click landed somewhere else. Cause: the press effect's `:not(:disabled):active` outranked components' own `transform`. | The press and hover effects now use the separate `scale`/`translate` properties inside `:where()`, so a press never moves a button. |
| H4 | In the Control Centre, "Read Noor's replies aloud" wrote an old setting that Noor no longer reads, so it did nothing. | It now writes `readAloud`, the setting Noor actually checks. |
| H5 | Read-aloud did nothing unless text was selected, and didn't show what it was reading. | It now reads the selection, or the page's main content when nothing is selected, sentence by sentence (see section 4). |

### Medium: accessibility (axe-core 4.10.2, WCAG 2.1 A/AA, serious and critical issues)

Before the fixes there were 13–61 violations per page. Examples:
- terracotta buttons at 4.45:1 contrast;
- gold text at 2.57:1;
- locked badges at 2.1:1;
- in dark mode, the faculty sidebar's active item was white text on a near-white background (1.22:1);
- tab lists containing plain buttons;
- a campus map marked as an image that contained focusable parts;
- form fields that hid their focus ring;
- no skip link on 9 of 10 pages.

The fixes:
- the light accent changed from #C1502B to #BA4A26;
- darker shades for small accent, gold and grey text on tinted backgrounds;
- locked badges dim the icon only, not the text;
- the faculty sidebar indicator is purple with white text;
- correct roles: a toggle group, a separate tab list, `aria-pressed` colour swatches, a campus map that is a group;
- focus rings on every form field;
- skip links added on all pages.

**Result:** 0 serious or critical violations on all 10 pages, in both light and dark themes, in the default state.

### Low: polish

- The Reset button in the Control Centre was 30 px tall; it is now at least 36 px.
- Control Centre buttons are at least 40 px tall on touch screens.

## 3. Research claims, checked against sources

| Claim on the site | What the source says | Now written as |
|---|---|---|
| "≈94% of UAE Grade 12 students pass" | Khaleej Times, 29 June 2022: the Ministry of Education curriculum's Grade 12 end-of-year exams, 2021–22, had a **94.4%** pass rate. 28,775 students sat them, in public schools and private schools that follow the MoE curriculum (results from the Emirates Schools Establishment). | The pass rate in MoE-curriculum Grade 12 exams, 2021–22 (28,775 students), with the source and date. Noted as a pass rate, not a measure of reading difficulty. |
| "17.6% of Emirati female students … showed dyslexic features" | Aboudan, Eapen & Bayshak (2011), *Int. J. English Linguistics* 1(2):64–72, doi:10.5539/ijel.v1n2p64. Female students at UAE University in 2007/08, screened with the Emirates Dyslexia Indicator Test, which was being piloted at the time. Press reports give about 459 of about 2,500. I couldn't read the full paper (paywalled), so the sample size is unverified. | Features found by a new screening test, not diagnoses. One university, female students only, 2007/08, and a pilot instrument. |
| Adult ADHD 2.58% persistent / 5.1% at 18–24 | Song et al. 2021, *J Glob Health* 11:04009 (persistent 2.58%, symptomatic 6.76%, adjusted to the 2020 population). Vos & Hartman 2022, *J Glob Health* 12:03024 (persistent ADHD falls with age, from 5.1% at 18–24). | Unchanged (correct). |
| "No one has measured since"; "the first current, consented dataset" | Not established. A search that finds nothing doesn't prove nothing exists. | "We found no newer published UAE university figure (that is a search result, not proof none exists)". The pilot "would give a current, local picture — of study strain, not of diagnoses." |
| Support Pact length | Two weeks (14 days) everywhere in English and Arabic. No four-week wording remains. | Consistent; no change needed. |

**The homepage's Acubins programme, fee, test-score (IELTS/TOEFL/EmSAT), scholarship and event content is fictional.** It is labelled as illustrative. The scholarship estimator's maths is correct: for example, 50% of AED 72,000 is AED 36,000, and AED 0 only at a 100% award. The Open Day on 4 November is already shown as a past event.

## 4. Accessibility Control Centre (`a11y.js`)

There is one central system on every page. Preferences are saved in this browser only, under `erly-a11y`.

**Groups:**
- **Reading:** text size; reading-friendly font; line, letter and word spacing; reading width; reading guide; WCAG spacing preset; read-aloud.
- **Visual:** theme (light, dark or system); high contrast; colour tint; **focus mode (new)**; fewer distractions; underline links.
- **Interaction:** stop animations (follows the device until you choose); bold focus ring; **large pointer (new)**; larger click targets.
- **Learning:** how Noor explains things; Noor's read-aloud setting (now wired correctly).

**New in v15:**
- **Read-aloud:**
  - It reads the selection, or the page's main content when nothing is selected.
  - Each sentence is its own utterance, so a speed or voice change applies from the next sentence and reading never restarts.
  - The sentence being read is **highlighted in place** (CSS Custom Highlight API) and scrolled into view.
  - A small player shows "Sentence n of N" with Pause/Resume and Stop.
  - Navigation, Noor and hidden text are skipped.
- **Focus mode:** the section in the middle of the screen stays bright and the rest dims. Navigation is never dimmed. An "Exit focus mode" button is always on screen.
- **Large pointer:** a high-contrast pointer, only for mouse and trackpad.
- **Confirmation:**
  - every change is announced to screen readers (a polite live region);
  - each change appears as a ✓ line in the panel;
  - the footer counts how many settings differ from the defaults.
- **Skip link on every page:** it is the first Tab stop and moves focus to the main content. An existing skip link on the student dashboard pointed at an element that couldn't take focus; that's fixed.
- **Reduced motion:** "stop animations" now also stops the View Transition layers (page changes, the theme circle, language). The ink transition already had a short, calm reduced-motion version.

## 5. Animation

- **Theme switch (the change you asked for):** the new theme now **opens out in a circle from the theme button** and reaches the farthest corner, so it always covers the whole screen.
  - Timing: 0.56–0.82 s depending on the distance, eased with `cubic-bezier(.65,.05,.25,1)`.
  - The old page stays still underneath: nothing fades, blends or falls.
  - Clicking again mid-switch finishes the running one immediately, so 7 rapid clicks end on the correct theme with no leftovers.
  - Browsers without View Transitions get the same circle drawn in the new background colour, then the theme switches underneath it.
  - Reduced motion switches instantly.
  - I checked frames in both directions (screenshots taken at 120, 300 and 520 ms) and with View Transitions disabled.
- **Button presses:** see H3. A press now scales the button slightly without moving it.
- **Handwriting Check ink transition:** this full-screen liquid-ink entrance was built and tested in v13 (`tests/e2e/ink-studio.e2e.js`). I didn't change it in v15.

## 6. Tests run

- `npm test`: 222/222 unit tests pass.
- `tests/e2e/a11y-centre.e2e.js` (new):
  - Alt+A opens the panel, Esc closes it and returns focus;
  - every reading, visual and interaction setting applies at once and is announced;
  - settings carry across 7 pages and survive refresh and Back/Forward;
  - Reset restores every default;
  - read-aloud handles both the page and a selection, with the highlight, pause, resume, stop, and a speed change mid-reading;
  - focus mode exits at once;
  - Noor's read-aloud preference is written correctly;
  - on a 390 px phone, the panel fits and its buttons are at least 32 px.
- `tests/e2e/v9.e2e.js` (updated): checks that the theme switch is a growing-circle animation on the new view, and that rapid clicks leave no leftovers.
- **Full end-to-end suite, 23 suites:**
  - 21 passed in the full run.
  - `noor-tools` timed out under the load of the full run and passes when run on its own.
  - `v10` failed because of the date, not because of v15. The previous version (v14) fails the same way today. The planner correctly counts every game session played on the planned day, but the test expected exactly "1×", which only holds on days other than the planned Wednesday. The assertion now accepts the real count, and `v10` passes.
- **Page sweep:** 11 pages × light and dark × 1366 and 390 px. No page errors, no console errors and no horizontal overflow. The only outside servers contacted were `fonts.googleapis.com` and `fonts.gstatic.com`.
- axe-core: 10 pages × 2 themes, with 0 serious or critical violations after the fixes.
- Keyboard: on every page, the first Tab reaches the skip link, Enter moves focus to the main content, and 25 further Tabs all show a visible focus ring.
- Arabic: student, games, Growth Plan and Handwriting are fully right-to-left at 1280 and 390 px, with no horizontal overflow, and the accessibility button moves to the right.

## 7. Not done, or couldn't be tested

- **Real Safari, Firefox and iPad hardware:** only Chromium is installed here. Playwright's device emulation isn't Safari's WebKit. Please check the theme circle and read-aloud on your iPad.
- **Screen readers** (VoiceOver, NVDA): I couldn't run them here. ARIA roles, names and live regions were checked automatically, not by listening.
- **Arabic on the login page:** the login page is English-only. Adding it needs a translation pass.
- **Full design-system overhaul** (one token set across the 21 CSS files): not attempted in this pass. The fixes above are targeted.
- **Google Fonts:** every page loads its fonts from Google, which receives the visitor's IP address. To make no outside requests at all, host the fonts on the site.
- **Legal:** the PDPL wording (Federal Decree-Law 45/2021) needs review by a qualified UAE privacy lawyer. Nothing here is legal certification.
- **Sign-in** is a prototype. Real authentication needs a server; GitHub Pages is static hosting.
