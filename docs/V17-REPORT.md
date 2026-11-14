# ERLY v17 report: Noor, page awareness, Handwriting Check, and problem-to-scene visuals

Date: 14 November 2026. Everything listed was built and tested in this repository. Tests ran in Chromium via Playwright, plus Node unit tests. Where something is simplified or not done, this report says so.

## 1. Noor chatbot

### What changed

| Request | What was done | Where |
|---|---|---|
| Remove "Turn on ChatGPT" completely | The "Want ChatGPT-style answers…" card and its activation flow are gone. Noor is ready the moment a page loads (`ai.resume()` at start-up; Noor Online is the default). The "ChatGPT-style" wording is removed from the brain picker | `companion/ai.js`, `companion/ui.js` |
| Availability is not permission | Nothing is sent until **Send** is pressed. A line under the message box names the service ("Messages go to Pollinations only when you press Send…"), with **On this device only** one tap away. The choice is remembered and is also in Settings (Noor → Reading signals) and the Accessibility panel (Learning → Noor and privacy). With device-only on, Noor says so and offers to send that one question; it never sends silently | same |
| Input-bar screen jump (iOS) | Root cause: iOS doesn't shrink the layout viewport for the keyboard. Safari pans the *visual* viewport, so a panel pinned with top/bottom insets slid off screen and snapped back. On touch devices the panel is now sized from `visualViewport` (`offsetTop`, `height`): the composer sits on the keyboard, the header stays visible, and the page behind never scrolls. Also added: `interactive-widget=resizes-content` for Android Chrome, safe-area padding, and a 16 px input (no zoom) | `ui.js` `fitViewport`, `noor.css` |
| Scrolling | A reader at the latest message stays there when the box grows, the keyboard opens, or a large card arrives. A reader who scrolled up isn't moved, and **New messages ↓** appears. Two bugs were found and fixed: the "follow" check ran *after* new content was added, and measuring the textarea collapsed it, which clamped the log | `ui.js` `scrollLog`, `composer` |
| Composer | Enter sends; Shift+Enter adds a line; one press sends once; Stop; paste and drop images; the message returns to the box if sending fails | `ui.js` |
| Reliability | Hitting the per-minute AI cap now shows only the cap message, with the question kept in the box, and no confusing "support reference" | `noor-brain.js` |
| Delete everything | After "Delete everything Noor stored", nothing is written back to storage. Before this fix, a preference was re-saved | `ui.js` `deleteAll` |

### Automatic noticing friction

- Noticing is on by default and runs on the device only: counts of re-reading, zoom, panning, text-setting changes and read-aloud use.
- The yes/no question is gone. Noor shows a one-time notice explaining exactly what is counted, with **Got it** and **Pause noticing**.
- It can be paused at any time: in that notice, in Noor → Reading signals, or in Accessibility → Learning.
- Turning it off deletes the learned baseline and stops saving.
- The microphone and the external AI still need an explicit yes.
- Nothing infers emotion, disability or ability. The existing limits on gentle nudges (cooldown and per-session maximum) are unchanged.

## 2. Page awareness, video and shared context

### "Explain what I'm looking at"

A new module, `assets/js/page-context.js`, reads only what is on screen, and only when the student asks:
- the section in view;
- visible headings and text;
- the selection (kept for two minutes, so tapping Noor doesn't lose it);
- visible tables (caption, headers and first rows);
- figures (labels only);
- maths;
- whatever is open on top: the Reading Studio page, a video (title, position, ERLY's key points), the Noor Lab model, or an interactive visual.

It also lists what it can't see: the contents of unlabelled images, and what is said in a video when there is no transcript.

How Noor answers:
- With an AI model, the snapshot goes with the question the student just sent.
- Without one, Noor gives a structured on-device summary in the page's own words, timestamped, and invites the student to ask again after scrolling.

There are no screenshots and no background capture.

### Video

**Full screen:**
- Root cause: the video room kept its opening `clip-path`, and WebKit clips a full-screen iframe to a clipped ancestor. The clip is now removed once the circle has opened, and the iframe gets `allowfullscreen` and `allow="fullscreen"`.
- A new **Full screen** button puts the whole page into full screen with the video filling it. Noor can then open on top, and the video keeps playing (it isn't paused or reloaded).
- iPhones have no element full screen, so the room maximises there instead.

**Time ranges:**
- "Explain 2:30–3:30", "from 1:05 to 1:40" and "at 4:10" are understood.
- These YouTube videos have no transcript available to the site, so Noor says it won't guess what is said. It offers to loop that range at 0.75×, show the key points, or explain a term the student heard.
- When a lesson does have a transcript (`lesson.transcript = [{t, text}]`), the answer uses only the lines in that range.

## 3. Handwriting Check

| Area | v17 |
|---|---|
| Ink animation | Each theme has its own ink. Dark: navy page, blue ink, cyan glow, white highlights. Light (new): **white paper with near-black and cobalt ink**; before, light mode flooded the screen near-black. Reduced motion gives a short fade |
| Canvas | The existing pressure, stylus palm rejection, high-DPI rendering, vector strokes that survive resizing, and undo/redo (Ctrl+Z now works even after focus leaves the studio) are kept. New: **ruled, blank or grid paper**; **up to 5 pages**, each keeping its own writing; and **Clear asks first** |
| Preparation | New:<ul><li>**the quality gate evens out a shadow first** (a readable shadowed page used to be rejected as "faint/blurry");</li><li>**Sauvola adaptive threshold** for uneven light;</li><li>**upscaling** so letters are about 40 px tall;</li><li>**line segmentation**.</li></ul>Grayscale, Otsu, deskew and trimming are kept. All of this runs on the device |
| Results | **Word-by-word confidence from Tesseract itself** (≥80 % read, 50–79 % uncertain, <50 % unreadable), labelled as the software's certainty, not the writer's. **Editable text**, **Copy**, **Compare with the sentences** (missing and differently read words marked), and **Read again with the other preparation** |
| Privacy | Nothing is uploaded; a test checks that no request leaves the site during recognition. **Discard** clears the photo, every page, the result, the edits *and shuts down the recognition worker*, which held the last image. Leaving the page does the same. Nothing is sent to Noor |

## 4. Visual intelligence: problem-to-scene engines (acceptance tests A–J)

New module `assets/js/lab/lab-problems.js`, built on the existing simulation harness. The numbers in the student's question become the model's parameters, and every result is computed on the device.

| | Problem typed into Noor | Engine | Checked against (independent calculation in the test) |
|---|---|---|---|
| A | 2 kg block on a rough table (μ 0.2), pulley 1 kg / 10 cm, 3 kg hanging | rigid body | a = (m₂ − μm₁)g / (m₁ + m₂ + I/R²) = 4.637 m/s²; T₁ and T₂; (T₂ − T₁)R = Iα; energy balance after motion; "make the pulley massless" gives T₁ = T₂ |
| A2 | Solid sphere on a 40° incline, μₛ 0.1 | rolling vs slipping | slips when μₛ < tanθ·k/(1+k) = 0.2397, and v > ωr; at μₛ 0.3 it rolls with a = g sinθ/(1+k) and v = ωr |
| B | +2 µC (0,0), −3 µC (4,0), +1 µC (2,3) cm | point charges | every force vector against Coulomb's law; ΣF = 0 (Newton III); dragging a charge updates the forces |
| C | Area between y = x² and y = x + 2 | area | 4.5 = 9/2, with intersections −1 and 2; and ∫₀^π sin x = 2 |
| D | SN1 hydrolysis of tert-butyl bromide | mechanism | 4 stages with curved arrows (carbocation, oxonium, products); SN2 and E2 are also available. **Nitration of benzene does not open a wrong mechanism** |
| E | 5-resistor bridge with a 12 V source (netlist text) | topology + nodal analysis | 4 nodes, 6 branches, 3 loops, bridge detected; V_B and V_C from an independent 2×2 solve; parallel detection (6 ∥ 12) |
| F | Compound train 20→40, 15→45 at 120 rpm, 10 N·m | gears | ω = [120, −60, −60, 20]; ratio 6; torque 10·6·0.98² ; an idler doesn't change the ratio |
| G | Benzene–toluene, feed 50 %, distillate 95 %, bottoms 5 % | Antoine + Raoult | normal boiling points 80.1 and 110.6 °C; equimolar bubble point ≈ 92 °C; stages ≈ Fenske. Ethanol–water is identified as non-ideal (azeotrope) rather than wrongly modelled |
| H | FM: carrier 100 MHz, message 15 kHz, Δf 75 kHz | FM | β = 5; Carson 180 kHz; ΣJₙ² = 1; J₀(5); carrier vanishes at β = 2.4048 |
| I | Cardiac cycle with P–V loop | time-varying elastance + Windkessel | resting EF 45–65 %, CO 4–6.5 L/min, BP in the normal range; SV = EDV − ESV; higher contractility gives a larger SV |
| J | Fixed $50,000, price $25, variable $15, 8,000 units | break-even | BEP 5,000 units; profit 30,000; margin of safety 37.5 %; "change the price to 30" gives a BEP of 3,333.3 |

### Scene specs

`ERLY_LAB.sceneSpec.validate/open` takes JSON only (`{engine, params, title}`) and checks it against each engine's declared parameters: names, numeric ranges, allowed options, and plain maths expressions. A test confirms these are all refused:
- unknown engines;
- extra keys;
- out-of-range values;
- strings in numeric fields;
- expressions with code.

No code from a spec ever runs.

### Curriculum registry and coverage

- `assets/js/lab/curriculum.js` holds 135 concepts across 25 disciplines and school, JEE, undergraduate and professional levels. Each row has a real question as its probe, and **no hand-written status**.
- `coverage.html` loads the real student page in a hidden same-origin frame and sends every probe through Noor's routing (`ERLY_LAB.predict`, which mirrors `handle()`). It reports what would actually appear.

Measured on 14 November 2026:

| Interactive model | Interactive visual / scene | Diagram | Explanation only |
|---|---|---|---|
| **51** | **21** | **28** | **35** |

The measurement also found four routing bugs, now fixed. Each opened the wrong model:
- nitration opened SN1;
- "time dilation" opened the geometry engine;
- amplitude modulation opened the interference simulation;
- drug half-life opened radioactive decay.

The registry is a sample of concepts, not a whole curriculum. The page says this, and lists a staged plan for what isn't covered.

### Not done, and why

The directive asks for "every discipline, every level". That is not achievable in one session, so here is what was delivered:
- the architecture: harness, problem parsers, validated specs, registry and measured coverage;
- ten acceptance-grade engines;
- an honest inventory.

**Next:**
- more mechanisms, from a checked data set;
- AC phasors;
- Fourier series;
- Hodgkin–Huxley action potentials;
- enzyme kinetics;
- supply and demand with shifts.

**Later:**
- non-ideal distillation;
- multi-body rotation with collisions;
- respiratory and renal models.

**Simplified, and labelled as such in each model:**
- the mechanisms are 2D schematics;
- gear teeth aren't involute;
- the heart is a teaching model, not clinical;
- distillation assumes an ideal mixture at total reflux.

## 5. Tests

Results from this session, all on the final code:

**Unit tests:** `npm test` passes 237/237.

**Browser suites:** all 28 pass.

| New in v17 | Result |
|---|---|
| `noor-v17` | 9/9 |
| `page-video` | 8/8 |
| `handwriting-v17` | 7/7 |
| `problems` | 14/14 (A–J, scene specs, dark and phone, coverage page) |

The existing suites also pass: lab, chat, companion, noor, noor-tools, noor-v12, noor-platform, studio-noor, handwriting, ink-studio, a11y, a11y-centre, visuals, vspec, visual-library, visual-acceptance, v9, v10, nav, growth, realtrack, human3d, avatar-lab and companion-quality.

In the first full run, `studio-noor` failed for a real reason: a Reading Studio selection sent with "Ask Noor" was being replaced by the screen snapshot. That is fixed (an attached passage now takes precedence), and the suite passes when re-run.

**Accessibility:** axe-core finds 0 serious or critical issues on coverage, handwriting and student, in both themes. The contrast of the coverage badges was fixed to reach that.

**Older tests updated deliberately, because the requested behaviour changed:**
- the consent unit tests (noticing is now on by default);
- the "turn on the AI" card checks;
- the near-black light-theme ink check;
- Clear now asks for confirmation.
