# ERLY v20 — audit and defect inventory

**Date:** 15 November 2026. **Method:** source reading plus a scripted Chromium sweep (`audit.js` in the build scratchpad), with screenshots in [`docs/v20-shots/before/`](v20-shots/before/).

**What the sweep covered:** 14 pages × light/dark × desktop (1440×900)/phone (iPhone 13) = 56 page loads, recording:
- console and page errors;
- failed requests;
- horizontal overflow;
- the appearance of every visible text field when focused.

The typing surfaces that only appear after interaction (Noor composer, library search, notebook editor, practice inputs) were opened and captured separately.

## Automated sweep result

**0 console or page errors, 0 failed same-site requests, 0 pages with horizontal overflow** across the 56 loads. The site has no hard breakage at load. The defects below are design, interaction, architecture and content problems, found by reading the code and looking at the screenshots.

## Critical

| # | Area | Defect | Cause | Fix |
|---|---|---|---|---|
| C1 | Information architecture | The Reading Studio and the Learning Studio are two competing destinations. The student page links to both, and the Reading Studio section is still a top-level "04" feature. | v19 added the Learning Studio beside the old overlay instead of replacing it | Retire the Reading Studio as a destination. Its reader becomes the Learning Studio's Reading & Resources environment, and old links redirect to `learn.html#/read`. |
| C2 | Handwriting | Drawing slows down as the page fills up | `InkPad.render()` clears and repaints **every stroke on every pointer event** (O(strokes × points) per move), with no frame batching | New engine: a cached layer for committed ink, an incremental live layer per animation frame, and predicted points for lower latency |
| C3 | Student dashboard | The page mixes the action hub, a product pitch, methodology, research and data explanations (14 long sections) | The page grew version by version | An action-first dashboard; explanations move to a secondary "How ERLY works" area |
| C4 | Wording | Judgemental or unclear indicator names are shown to students: "Forum Ghost", "audio bailout", "Deadline proximity paralysis", "11th-hour spike", "Friction fingerprint" | `indicators.js`, `student.html`, `insight.js`, `report.js`, `counselor.js` | Neutral, plain-language names everywhere |

## High

| # | Area | Defect | Cause | Fix |
|---|---|---|---|---|
| H1 | Typing fields (Learning Studio) | "Ask Noor" draws a box inside a box: the pill container's border, the input's own border, an outline and a glow | The generic `.ls-page input` rule gives every input a border, even inside composite controls; `:focus-visible` adds a 3 px outline on top of the border and box-shadow | Field styles move to components; composite controls (search pill, composer) style only the container; one focus treatment per field (border plus soft ring), no stacked outline |
| H2 | Typing fields (notebook) | Starting to type draws a thick accent box around the whole writing area | `.ls-ed__body:focus` box-shadow ring plus the `:focus-visible` outline | A writing area shows the caret and a hairline accent rule only |
| H3 | Handwriting layout | The canvas is a small panel inside a card inside a page, surrounded by 4 side cards, boxed tabs, a boxed toolbar and a boxed page counter | Layered components | A full-width writing studio: a slim top toolbar and a large canvas. Information moves to an expandable "About" and a privacy line. |
| H4 | Handwriting tools | No paper styles beyond ruled, blank and grid; no dotted; no zoom; no writing-guide toggle | Missing | Plain, ruled, grid and dotted paper, a guide toggle and zoom (with two-finger pan) |
| H5 | Growth Plan | A timetable generator only; no programme choices, no activity workspace with exercises, no pause, resume, restart or history | The v18 scope was scheduling | A rebuild around optional support programmes, goals, configuration, interactive daily activities, weekly reviews and programme management |
| H6 | Interaction feedback | Buttons differ by page: some have no press state, some no visible keyboard focus; transitions between views are abrupt | Five separate stylesheets each define buttons | A shared interaction layer (`ui.css`, `ui.js`) for press, hover, focus, loading and disabled states, view transitions and reduced motion |
| H7 | Learning Studio look | Generic sidebar plus cards; the first-time storage panel dominates the home screen | v19 layout | A new shell, home, subjects and topic graph (see the Learning Studio reimagination) |

## Medium

| # | Area | Defect | Fix |
|---|---|---|---|
| M1 | Learning Studio | No subject or topic level: resources for one topic (heart lesson, video, model, questions) are not shown together | Topic graph: one id links reading, lesson, video, models, questions, notes and cards |
| M2 | Library | No sorting, favourites or folders; the upload path is hidden at the bottom | Sort, favourites, collections, and upload in the toolbar |
| M3 | Reading | Reading presets (focused, comfortable, audio-supported, guided) are not exposed as modes | Reading modes applied through the reader's settings API |
| M4 | Handwriting | The "Pages" counter is a focusable bordered box that looks like an input but is not one | Replaced by a page indicator in the toolbar |
| M5 | Several pages | Three different header and back-link styles (`q-top`, `ls-top`, `site nav`) | Shared header treatment |

## Low

- Duplicated icon glyphs (emoji in some toolbars, SVG in others) → one icon set.
- Inconsistent capitalisation of labels ("Write on screen" vs "write here").
- Mono kicker labels on some pages and sans on others.

Each item is resolved or explicitly listed as remaining in [`V20-REPORT.md`](V20-REPORT.md).
