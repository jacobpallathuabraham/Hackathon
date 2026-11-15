# ERLY v18: audit and defect register

**Date:** 15 November 2026.

**Method:**
- Chromium (Playwright) against the local copy of the deployed site (v17, commit `1ae6855`), signed in with the demo student account.
- Questions were typed into the ordinary Noor chat box. The Lab was not opened first.
- Code was read to find each cause.

The browser had no AI provider. Automated browsers start on the device-only brain, so this shows what Noor itself does, not what a hosted model adds. On the live site Noor Online answers in words, but **the visuals below behave the same**: they never depend on the AI.

The demo passwords are not in this document.

## Reproduction: 22 questions typed into normal chat

| Question | What appeared | Expected |
|---|---|---|
| Explain projectile motion | Lab projectile model, caption only | Model + explanation |
| What is differentiation? | Lab derivative model, caption only | Secant→tangent demonstration + explanation |
| Show me how a quadratic equation works | Lab graph with sliders | ✓ (explanation thin) |
| Explain Newton’s second law | Lab block model, caption only | Model + explanation |
| What happens to a wave when its frequency increases? | **No visual**; "can't answer on this device" | Wave demonstration |
| Structure of a benzene molecule | **No visual** | 3D molecule |
| How electric fields work | **No visual** | Field demonstration |
| Gradient of a function | **No visual** | Surface + contours + gradient vectors |
| Double-slit experiment | Lab two-source interference | ✓ |
| How does a pulley system work? | **No visual** | Pulley system |
| Pressure, volume and temperature | **No visual** | Gas-law model |
| Structure of the human heart | **No visual** (a curated heart scene exists) | Heart visual |
| Supply and demand | **No visual** | Interactive market curves |
| Eigenvectors | **No visual** (a matrix primitive exists) | Transformation demonstration |
| Electromagnetic induction | **No visual** | Induction model |
| Max rectangle under y = 12 − x² | **Wrong model**: derivative graph of 12 − x² | Rectangle + area function + optimum |
| Plane intersecting a sphere | **Wrong model**: a plain sphere | Sphere, plane, intersection circle |
| Molecular geometry of ammonia | **No visual** | 3D trigonal pyramid with lone pair |
| Differentiation from first principles | Derivative model (no secant, no limit) | Secant → tangent as h → 0 |
| Why sin²θ + cos²θ = 1 | **No visual** | Unit circle |
| Capital of France | No visual ✓ | No visual |
| Audio lesson about rotational mechanics | **Refused**: "only from the open reading or a checked visual" | A lesson on that topic |

**Result:** 13 of 21 visual-worthy questions got no visual, and 3 got the wrong model.

## Defect register

| # | System | Reproduced problem | Root cause (from the code) | Severity | Fix in v18 | Verification |
|---|---|---|---|---|---|---|
| 1 | Noor visuals | Concept questions get no visual in normal chat | The AI system prompt says visuals appear **"ONLY when the student asks"** (`ai.js`). Curated visuals need explicit words (`vspec.explicit`: draw, diagram…). The lab only opens on narrow keyword matches. **No step decides whether a visual would help** | High | A response planner runs on every message (`lab/planner.js`). It decides from the question's concept, not trigger words, and the prompt now tells the AI a visual is shown when one helps | `tests/e2e/visual-chat.e2e.js` |
| 2 | Maths/physics | Lab answers are a caption with no explanation; the conversation stops | `noor-brain.freeText` **returns early** after `ERLY_LAB.handle()`. The AI is never asked, and the model's own derivation (`explain()`) stays in the side panel | High | The visual and the words come from one model: Noor's answer is written *from the model's computed state* (AI when available; otherwise the engine's derivation in chat) | same |
| 3 | Maths/physics | The lab is a separate workspace beside the chat | `lab-core` mounts one global workspace on the page | High | **Inline live visuals inside the chat message**. The same workspace is embedded in the reply; Expand turns it into the full Lab. Earlier visuals become snapshots that reopen in their saved state | same |
| 4 | Visual engine | Wrong model for optimisation, plane ∩ sphere, first principles | No engine existed for these, so the nearest keyword engine won | High | New engines: secant/first principles, optimisation, sphere ∩ plane, VSEPR molecules, unit circle, wave superposition, Lorentz-force particle, EM induction (rotating coil), market curves, gradient field, Atwood pulley | `problems`/`visual-chat` suites |
| 5 | Visual engine | Small fixed library | Engines are registered one by one and matched by keywords; nothing generalises | High | Planner + concept registry + parametric engines; **1,000-scenario benchmark executed in the browser** (Stage 4) | `tests/bench/` |
| 6 | Voice | Speech sounds artificial | `voice.js` uses only `speechSynthesis` (the OS voices); the cloud path needs a server key that isn't configured. Quality depends entirely on the device's installed voices, and headless browsers have none | High | **Kokoro-82M neural TTS running in the browser** (Apache-2.0, distinct labelled voices), with the system voices as a fallback; provider-independent voice manager | Stage 5 tests |
| 7 | Audio lessons | Only a few topics | `audio-lesson.js` builds scripts only from a curated scene, the open reading, or the AI. Without AI it refuses every other topic | High | Lesson pipeline for **any topic**: AI-written when available; otherwise composed from retrieved encyclopedia text with sources, plus the lab's models | Stage 5 tests |
| 8 | Handwriting | Recognition is unreliable on real handwriting | Tesseract is a **printed-text** OCR engine (LSTM trained on print). It recognises print-like writing and fails on cursive | Critical | A **handwriting model (TrOCR, handwritten)** runs per segmented line in the browser, with Tesseract kept for print; image tools; practice modes; benchmark | Stage 6 tests |
| 9 | Growth Plan | Disconnected journey | **Two separate programmes are on one page**: `growth.js` (v2 intake → six weeks) and `growth-v10.js` (a fixed school-day timetable template). The timetable is a fixed template, not built from the student's own availability; the weeks are fixed themes | High | One adaptive onboarding → constraint scheduler → interactive timetable → goal-linked exercises → weekly review | Stage 7 tests |

The rebuild proceeds in this order. Each stage is committed when its tests pass.
