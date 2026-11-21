# Retired end-to-end tests

These suites tested the v12–v19 Handwriting Check interface (`#hwPad`, `.hw2-*`), which v22 replaced with the
Handwriting Studio (`handwriting.html`: Practice · Scan & Analyze · Assess · History). They are kept for reference and
are not run by the regression script.

What they covered is now covered by:
- `tests/e2e/handwriting-v22.e2e.js` — the new studio, ink engine, analysis, scan, six assessment types, history, privacy;
- `tests/e2e/ink-studio.e2e.js` — the page transition, the writing surface (pen pressure, palm rejection, undo, eraser,
  resize) and recognition of on-screen writing (updated to the v22 surface);
- `tests/bench/hand-bench.js` — recognition accuracy on 150 real handwritten IAM lines (unchanged; re-run in v22).

## v24

- `handwriting-v22.e2e.js` is now retired too. It tested the v22 studio (`.hxs__*` markup, `ERLY.handStudio`), which v24
  rebuilt. Its replacement is `tests/e2e/handwriting-studio-v24.e2e.js`. `tests/e2e/ink-studio.e2e.js` keeps the
  student portal → Handwriting ink-transition checks and the phone layout. Its v22 writing-surface and on-screen-OCR sections
  were removed; the v24 suite covers both on the new studio.
