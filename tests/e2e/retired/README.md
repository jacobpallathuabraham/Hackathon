# Retired end-to-end tests

These tests drove the v12–v19 Handwriting Check interface (`hand-ui.js` with the `ink-pad.js` notebook, `#hwPad`,
the side panel and practice modes). In v20 that page was rebuilt as the Handwriting Studio (`hand-canvas.js`,
`hand-studio.js`), so the selectors and flows these files expect no longer exist on `handwriting.html`.

They are kept for reference, not run. Their replacement is `tests/e2e/handwriting-v20.e2e.js`, which covers the new
surface (layers, DPI, undo/redo/clear, eraser, paper styles, guide, zoom), the review → recognise → correct → discard
flow, the photo alternative, phone layout, and the privacy guarantees (no uploads, no camera/microphone, only display
preferences remembered). The recognition engines themselves (`handwriting.js`, `hand-rec.js`) are unchanged and still
covered by the unit tests.
