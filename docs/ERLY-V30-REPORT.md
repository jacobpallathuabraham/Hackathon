# ERLY Learning Studio — the cinematic universe (v30)

The Studio now opens on a rendered universe. Scrolling is the journey:
- the void, then first light;
- the eleven subject worlds, one after another;
- the whole universe gathered, where a student chooses where to go.

Choosing a world flies there and opens that subject, with the same planet live in its header. Back returns to the same
point in the journey. **Not deployed:** the live site still serves the previous version until you say "Deploy".

Everything below was built and checked in this session. Numbers were measured; anything that was not possible here is
listed in "Limits".

---

## 1. Audit (what was there, and how the universe fits in)

- **Architecture:**
  - a static single-page app (`learn.html`) with a hash router (`LS.route`) and a `leave`/`route` event bus;
  - Three.js r170 vendored locally under an import map;
  - one shared 3D scene manager (`ls-3d.js`) with one render loop per scene.
- **Old home:** a hero, a compact 2D-style solar system, an 11-card world grid, then recommendations, curiosity, the
  storage-consent choice and the plan.
- **Subjects:** `#/world/<id>` (tabs and level filter), then chapters (blueprints), then experiences and labs. Back and
  breadcrumbs follow that hierarchy.
- **Risks found while integrating, all handled:**
  1. The site sets `scroll-behavior: smooth`, which turned every programmatic jump into a slow scroll. Jumps use
     `behavior: 'instant'` and the camera supplies the motion.
  2. The page-entrance animation (`ls-motion`) tagged the universe's dialog and track. Blocks can now opt out with
     `data-no-rise`.
  3. The router and Back's scroll restoration run after render. The universe re-measures its offset after layout and
     respects the restored position.
  4. The storage choice must stay first-class: nothing is stored before the student decides.

## 2. Resources: what was checked, and the decision

| Resource | Checked how | Licence | Decision |
|---|---|---|---|
| Three.js | Already vendored (r170) | MIT | **Used** — renderer, shaders, GLTFLoader |
| GSAP + ScrollTrigger | Known API; awwwards-3d uses it | Free standard licence | Not added: a spline camera and a damped scroll value do the choreography without a dependency or scroll-jacking |
| Lenis | Repository README, licence, package fetched | MIT | Not added: native scroll keeps Back, scroll restoration, keyboard and screen readers working; the camera is damped instead |
| awwwards-3d (tsogjavklann) | README and licence fetched and read | MIT | Approach adopted, no code copied: ACES tone mapping, a damped scroll camera, art-directed keyframes. Its bloom/grain post-processing became a zero-cost CSS vignette and grain |
| free-gsap-effects | README and licence fetched | MIT | Not needed once GSAP was not used |
| Google model-viewer shared assets | Repository fetched | Apache-2.0; the model is Poly by Google, CC-BY | **Used: the astronaut** (§4), credited in the Studio and in `assets/models/CREDITS.md` |
| Poly Haven, ambientCG, Spline, GSAP Vault, Somanath, Made for Award, threejs.org | **Blocked by this environment's network** | — | Not inspected. All planet surfaces are procedural shaders, so no textures were needed |

## 3. Art direction

- **Palette:** space is near-black navy, with a nebula of teal, violet and a little ember, kept low in saturation. Each
  world owns one hue family; nothing glows unless it is a light source.
- **Light:** one sun. In the void it sits behind the great planet's limb, so the worlds are rim-lit. In "First light" it
  sweeps to a three-quarter front angle, and the worlds get real terminators. A soft fill from the viewer's side keeps
  the astronaut from becoming a silhouette.
- **Type:**
  - Fraunces Light (soft optical axis) for headlines;
  - Instrument Sans for text;
  - JetBrains Mono for small tracked labels.

  All three are SIL Open Font License. Copy is short: a kicker, one line, one sentence.
- **Composition:** each world scene puts the planet on one third, the words on the other, and the astronaut between,
  facing the world. The opening uses foreground (the great planet), midground (the astronaut) and background (the line
  of distant worlds receding along the route). On phones the text sits low and the astronaut floats in the upper half.
- **Finish:** ACES tone mapping, a CSS vignette and film grain, and a soft scrim behind text. A distant world that
  drifts behind the text column recedes smoothly while it is there, found in the final visual pass. The scene's own
  world and the overview are never affected.

## 4. The astronaut

- **Source:** `Astronaut.glb` by Poly by Google (CC-BY), from google/model-viewer `shared-assets` (Apache-2.0).
- **Size:** the texture was re-encoded from a 2048² PNG to a 1024² JPEG, taking the file from 2.8 MB to **265 KB**.
  Geometry is untouched (4,812 vertices).
- **Motion:** the model has no animations, so motion is procedural:
  - a slow bob, roll and yaw drift;
  - it turns (slerped) to look at the scene's world, the world under the pointer, or back toward the student at the
    start;
  - it leans and fires a soft jet with camera speed, and trails slightly when travelling fast.
- **Placement:** it is a real object in the 3D scene, lit by the same lights and moving through world space. Its
  offset is smoothed in camera space, so it never falls behind the camera, even after a fast scroll or a slow frame
  (a test checks it is on screen in all 11 world scenes).

## 5. The journey (scroll is the story)

There are fifteen keyframes:

| # | Scene | What happens |
|---|---|---|
| 0 | The void | Great planet in the foreground, astronaut and receding worlds |
| 1 | First light | The sun sweeps across |
| 2 | The universe of knowledge | High view down the route of worlds |
| 3–13 | The eleven worlds | Each framed in turn |
| 14 | The whole universe | The worlds glide out of their path positions into a ring before the camera, staggered |

- **Camera:** two centripetal Catmull-Rom splines (position and look target). Each segment is eased with a dwell, so
  the camera rests on each scene.
- **Scroll:** page scroll sets a target, and the rendered progress follows with exponential damping in real elapsed
  time, so slow devices still catch up. Forward and backward are symmetric.
- **Structures:** each world's structures **assemble as the camera approaches** (`reveal`) and recede after.
- **Pointer:** the cursor adds restrained parallax to the camera, and the astronaut glances with it.

## 6. The eleven worlds

Each world has its own silhouette, surface shader, structures and motion:

| World | What makes it unique |
|---|---|
| Mathematics | Faceted crystalline polyhedron with edge lines; three graduated coordinate rings; orbiting Platonic solids and a torus knot; a saddle surface z = x² − y² |
| Physics | Banded giant with a storm; tilted rings with a Cassini-like gap; two moons in visible orbit; dipole field lines pulsing |
| Chemistry | Crystal-cell surface; ball-and-stick molecules with real geometry (water at 104.5°, tetrahedral methane, benzene, linear CO₂); electron shells |
| Biology | A living cell: breathing translucent membrane, marbled nucleus, mitochondria, ER ring; a DNA double helix with coloured base pairs arching around |
| Geography & Earth | Oceans with sun glint, continents, ice caps, a separate cloud layer, blue atmosphere, city lights on the night side |
| Computer Science | Matte world inside a geodesic network; data packets travel edge to edge; a ring of bits flips |
| English & Study | Ink-marbled surface; a ring of turning printed pages; drifting letterforms (¶, &, “, Q…) |
| History | Sedimentary strata (layers of time); an orbiting colonnade, some columns whole, some fallen; a dial ring with a moving hand |
| Languages | Warm dune world; two counter-rotating orbits of greetings in twelve scripts and languages |
| Social Science | Dusk world with night-side cities; arcs of travel and exchange, with travellers moving along them |
| Economics, Psychology & More | A ring of market bars rising and falling; a constellation of firing neurons with synapses |

## 7. Interaction

- **Pointer:**
  - Hovering a world raises its focus (rim light and structures respond, the astronaut turns to it) and shows a small
    label: name, one-line identity, "Select to enter".
  - Text blocks never block the pointer; only their links and buttons do.
- **Touch:** first tap focuses the world, second tap travels.
- **Keyboard:**
  - each scene has an "Enter <world>" button (focusing it focuses the world);
  - the **Destinations** dialog has search, a focus trap, Escape to close, and returns focus to its opener;
  - the journey rail (15 stops) and "All worlds ↓" are available;
  - a visible-on-focus **Skip the journey** link goes to an index of every world.
- **Travel:** a 1.25 s camera flight into the world, with the destination's colour filling the view. Any key, click or
  wheel skips it. The subject opens and the veil clears. Back pulls the camera back out of that world.

## 8. Subject integration

- **World headers:** every `#/world/<id>` page renders **the same world** live in its header (pointer tilt, paused
  off-screen).
- **Navigation:** World → course → chapter blueprint → experience → practice and checks are unchanged and remain the
  structure.
- **Rest of the home:** the earlier home's learning sections follow the journey, on the same dark ground. These are
  recommendations, curiosity, "your knowledge", today's plan, momentum and insights.
- **Experience finder:** the earlier filter dashboard is still at `#/finder`.

## 9. Solar System Explorer upgrades

- **Sun:** a shader with animated granulation and limb darkening, plus a faint corona.
- **Asteroid belt:** an instanced belt of 420 rocks (compact view) or 1,100 (full view), between Mars and Jupiter.
- **Rings and moon:** Uranus's faint rings, and the Moon orbiting Earth at its real 27.3-day period, scaled to the
  explorer's time.
- **Scale notice:** it now also states that the belt is drawn far denser than the real, mostly empty belt. Sizes and
  distances were already labelled as compressed.

## 10. Performance (measured, `tools/perf-studio.js` → `docs/bench/studio-perf.json`)

**How it was measured:** headless Chromium with **software WebGL (SwiftShader), with no GPU**. In this environment fps
is limited to single digits for any WebGL page, so it says nothing about real devices. CPU time per frame and draw calls
are the comparable numbers.

| Universe point | CPU per frame, median / 95th pct | Draw calls | Triangles | JS heap |
|---|---|---|---|---|
| Opening (scene 0) | 1.4 / 2.7 ms | 154 | 81k | 18 MB |
| Geography world (scene 7) | 1.0 / 4.9 ms | 57 | 55k | 22 MB |
| Overview, all worlds (scene 14) | 2.9 / 8.5 ms | 268 | 107k | 19 MB |

What keeps it fast:
- **One loop:** one render loop for the universe, which stops when off-screen, when the tab is hidden, or on leaving
  the route. `destroy()` disposes every geometry, material, texture and render target and releases the WebGL context.
  A test leaves and returns three times and checks that one renderer exists.
- **Sky:** the nebula and stars are rendered once into a texture, not every frame.
- **Distance detail:** far worlds draw only their body and atmosphere, and their animation is skipped. This took the
  opening from 262 to 154 draw calls.
- **Progressive loading:** two worlds are built at start, the rest in idle time; the astronaut (265 KB) loads
  asynchronously and fades in.
- **Quality tiers:** phone, modest and capable devices get different pixel-ratio caps, star and dust counts, noise
  octaves and sphere detail. The pixel ratio then adapts to measured frame intervals.
- **Reduced motion:** the loop renders only when something changes.
- **Idle throttle:** when nothing is changing (no scroll settling, no flight, no pointer movement for 1.5 s), the slow
  ambient motion renders at 24 fps. If frames are measured as very slow it renders at about 6 fps, so clicks and
  navigation are never queued behind frames.
- **Software renderers:** when WebGL reports a software renderer (SwiftShader, llvmpipe, Microsoft Basic Render), the
  page uses the **painted universe** by default. The 3D universe would run at a few frames a second and keep the page
  busy. `?cosmos=gl` (or `localStorage erly-cosmos = gl`) forces 3D and `?cosmos=flat` forces paint. Found by testing:
  under software GL, the older suites' navigation timings failed while the 3D universe was running.

## 11. Accessibility

- **Reduced motion:** the journey moves scene by scene with no camera glide, no idle animation and no flight. Entering
  is immediate.
- **No WebGL, or a software renderer:** a painted universe tells the same story:
  - the great planet's limb in the opening;
  - a painted planet per world scene;
  - the eleven worlds as selectable planets on an ellipse in the overview;
  - the same text, rail, Destinations and index.

  This is tested by disabling WebGL and on the software renderer.
- **Keyboard and screen readers:**
  - every world is reachable without 3D, through the scene buttons, Destinations and the index;
  - the canvas is `aria-hidden`, and all meaning is in real text;
  - focus styles are visible.
- **High contrast:** with `prefers-contrast: more`, the grain is removed and text scrims become solid.
- **axe (WCAG 2.1 A/AA):** home, two world pages and the Solar System have no violations in either theme, once
  settled. Header colours leaving home settle through a 0.14 s transition. Under software GL that took about 3 s, so
  the scan must wait.

## 12. Testing

See "Test results" below. The new `tests/e2e/learning-studio-v30.e2e.js` (16 tests) covers:
- the render and the index;
- scroll forward and backward, with the right text per scene;
- every world framed with the astronaut on screen;
- the overview, hover and click travel;
- travel into a world, the world header planet, and Back;
- skipping the flight;
- the Destinations dialog;
- skip, the rail and "All worlds";
- lifecycle and leaks;
- reduced motion, no WebGL and phone;
- device-aware painted mode on a software renderer;
- all 11 world headers;
- the Solar System upgrades;
- page errors.

**Bugs found and fixed while testing:**
- the astronaut fell behind the camera after fast scrolls;
- Escape in the Destinations search left the list filtered;
- the universe sat 96 px too high after navigating from a scrolled page;
- reduced motion kept rendering at rest;
- text blocks blocked planets behind them from pointer selection;
- the page-entrance animation interfered with the dialog.

## Limits (honest)

- **Machines without GPU acceleration see the painted universe, not the 3D one** (by design, §10).
- **Real-device frame rates are not measured.** Only CPU time and draw calls are known; the 60 fps target needs a check
  on a real laptop and a mid-range phone.
- **External resources:** Poly Haven, ambientCG, Spline, GSAP Vault, Somanath and Made for Award could not be reached
  from this environment, so they were not evaluated.
- **The astronaut has no skeletal animation** (the model has none). Its life comes from procedural motion.
- **The world headers are the subject's 3D identity,** but chapters and experiences keep their existing designs; the
  cinematic treatment does not continue into every page.
- **Copy:** the world copy is English with Arabic for the main interface strings; per-world journey lines are English
  only.

## Test results

All of these were run in this session on the final code; the full set ran together in one pass, plus single reruns
noted below.

| Suite | Result |
|---|---|
| `learning-studio-v30` (new: the universe) | 16/16 |
| `learning-studio-v29` | 18/18 |
| `learning-studio-v28` | 21/21 |
| `learning-studio-v27` | 14/14 |
| `learning-studio-v26` | 14/14 on rerun (see note) |
| `learning-studio-v24` | 42/42 |
| `learning-studio-v23` | 18/18 |
| `learning-studio-v22` | 22/22 |
| `learning-studio-v21` | 21/21 |
| `learning-studio` (base) | 34/34 |
| `learn-inspect` (317 routes) | 14/14 |
| `lab` (Visual Lab) | 34/34, no page errors |
| `problems` | 14/14 |
| `visual-chat` | 18/18 |
| `nav`, `a11y`, `studio-noor` | all checks passed |
| axe, light and dark | home, two world pages and the Solar System: 0 violations |

**Notes:**
- **v26:** "SF₆ octahedral" failed in two full-suite passes and passed on rerun. The check builds SF₆ from random
  atom positions with one 400-step relaxation. Measured on the unchanged molecule code, it settles exactly octahedral
  in 39 of 40 trials (about 2.5% fail). This is pre-existing and was not caused by this work. In the experience, each
  added atom triggers its own relaxation, so students get many more steps. Two attempted code fixes did not improve it
  and were reverted.
- **v30 runs with `erly-cosmos = gl`:** this machine renders WebGL in software, so the 3D universe is forced for
  testing.
- **Older tests changed for the new design:** the v29 home check now targets the journey and index instead of the old
  hero; v22 counts the index's 11 worlds.

---

## v31 — performance and polish pass (after the first deployment)

Feedback: the site felt laggy; the Learning Studio must open straight into the universe; some areas were too dark or too
bright.

| Change | Why |
|---|---|
| **Planet surfaces are baked.** The procedural colour is rendered once into a texture when a world is built, and the frame shader is one texture lookup plus lighting | Before, every planet pixel ran 5–20 3D-noise evaluations every frame. The great opening planet covered much of the screen. This was the largest GPU cost |
| **Shaders compile in the background.** `compileAsync` with `KHR_parallel_shader_compile`, otherwise `compile` in idle time; textures pre-upload | First-use shader compilation froze frames (50–200 ms on Windows/ANGLE) the moment a new world came into view mid-scroll |
| **Camera follows the scroll about 2× more tightly** (damping 4.2/s → 9/s) | The camera trailed the scroll by about 0.7 s, which reads as lag |
| **Lower pixel-ratio caps:** 1 on phones, 1.25 modest, 1.5 capable (was 1.5/1.6/2); MSAA off at 1.5; still adaptive | Roughly half the pixels on high-density screens, no visible loss in a soft, atmospheric scene |
| **No `backdrop-filter` over the canvas** | Blurring a constantly changing 3D image costs a full re-blur every frame |
| **Fewer full-screen additive cloud sprites** (5 → 2 on capable, 1 elsewhere) | Pure overdraw; the baked nebula already carries the atmosphere |
| **Bright and dark areas:** the jet glow is now a small, dim puff only while travelling (it read as a white blotch); the sun glow is softer; planets' night sides keep 8% light instead of 3.5% | The "too bright" and "too dark" spots |
| **The rest of the home is dark** (whatever the site theme), continuing the universe's ground | Removes the hard dark→cream edge below the journey |
| **The universe is the entrance:** the old 2D warp intro no longer plays before it | "Learning Studio" opens straight into the universe |

**Measured** with `tools/perf-studio.js` on software WebGL. Software rendering is bound by per-pixel cost, so its frame
rate is a fair proxy for the shader savings:
- Geography world: 2.7 → 6.1–6.6 fps.
- Overview: 4.8 → 5.1–6.0 fps.
- Opening: 3.7 → 3.5–4.3 fps, within noise. A layer-by-layer profile showed no single dominant cost on the software
  renderer.

Real GPU frame rates still need checking on real devices.

**For reviewers without WebGL** (for example AI assistants): `learn-guide/universe.html` is a static walkthrough
with screenshots of all fifteen scenes, the astronaut close-up, a world page, the painted fallback and the Solar System.

---

## v32 — art direction, cinematic quality, interaction and performance

### Audit (before changing anything)

- **Astronaut GLB, inspected directly:**
  - one mesh, 4,812 vertices, with position, normal and UV attributes;
  - one material (`Astronaut_mat`) with an opaque JPEG base colour;
  - **no skeleton and no animations**;
  - origin at the feet, 2.01 units tall, front facing +z;
  - 265 KB.

  It was kept: the silhouette reads well at the sizes used, and it has no animation rig that a replacement would
  improve on.
- **Kept as is:** native-scroll spline camera, baked surfaces, progressive build with background shader warm-up, single
  loop, quality tiers, painted fallback, travel into subject pages.
- **Defects found in the code:**
  - the astronaut's gaze target switched halfway through every segment (`a.f < 0.5`);
  - its idle motion was three pure sines, so it repeated visibly;
  - its lean followed speed, not acceleration;
  - every camera segment used the same easing (smoothstep, which has non-zero acceleration at the ends), with no arcs
    and no damping of the look target;
  - overview worlds gathered along straight lines;
  - nothing receded when a world was focused or entered;
  - dust was as visible at rest as in motion;
  - atmospheres had no forward scattering, so the backlit hero limb was dull;
  - scripts a device lacks fonts for would render as boxes;
  - an adaptive pixel-ratio change cleared the canvas, showing **one black frame** (seen in a phone screenshot);
  - the new look-target damping, measured, converged too slowly on slow frames (it used a capped timestep).

### What changed

**Camera choreography (`ls-cosmos.js`):**
- **Easing and dwell:** each segment now uses smootherstep, with zero velocity *and* acceleration at both ends, so
  there is no jerk and no overshoot, plus a dwell tuned by scene type:
  - a long rest on the hero approach;
  - a short pull-back that decelerates into the universe reveal.
- **Arcs:** approaches arc, and the arc is exactly zero on each keyframe:
  - world-focus approaches swing out sideways, alternating sides;
  - the first-light reveal rises;
  - the overview pull-back lifts.
- **Look target:** critically damped in real elapsed time, so hand-overs between path, flight and return never snap.
  Direct jumps snap it.
- **Scroll follow:** velocity-aware — tight for normal scrolling, calmer for long jumps (rail, "All worlds").
- **Flight time:** distance-aware, 0.75–1.3 s, still skippable by any key, click or wheel.

**Astronaut:**
- **Following:** a critically damped spring in camera space, so it has inertia and settles in about a second without
  overshooting. It can no longer come closer than 2.9 units to the camera, so it never clips or covers the headline.
- **Lean and jet:** it leans with *acceleration*, forward when the camera speeds up and back when it slows. The jet
  only shows while accelerating, and is small and dim.
- **Drift:** idle drift is a sum of incommensurate slow waves with slowly breathing amplitude, so it doesn't visibly
  repeat.
- **Gaze:** it blends continuously between scene subjects instead of switching.
- **Phones:** it floats in the upper half, except in the overview, where it drops below the worlds.

**Light and hero:**
- **Atmospheres:**
  - a day-side limb that follows the sun;
  - a warm terminator band;
  - a faint night rim, so dark hemispheres keep their silhouette;
  - **forward scattering** when backlit.
- **Sunrise opening:** the opening sun now waits just behind the great planet's upper limb, so the opening is a
  sunrise rather than an evenly lit ring.
- **First light:** recomposed, with the planet's limb low in frame and the astronaut on the right, clear of the
  headline. Before, the planet sat behind the text and the astronaut overlapped it.

**Worlds:**
- **Chemistry:** bonds are thinner and darker, so atoms read first. Molecules are evenly phased on three separated,
  inclined orbits, so they never clump.
- **Languages:** a greeting is shown only if every letter has a real glyph on this device (each character is compared
  with the "missing glyph" box). On the test machine, Chinese, Japanese and Korean were correctly dropped; Hindi,
  Arabic, Greek and Cyrillic remain.

**Overview and selection:**
- **Gathering:** each world arrives on its own curved path (a quadratic Bézier with a per-world bow), staggered in six
  waves.
- **Focus:** a focused world comes about 1.8 units forward and grows slightly, while the others recede and shrink about
  7%.
- **Entering:** on entering, the other worlds clear away during the flight.
- **Portrait screens:** a narrower, taller constellation, so all eleven fit instead of a ring cut off at both sides.

**Particles:** stars are sparser (3,400 / 2,200 / 1,100 by tier) and twinkle less. Near dust sits at 20% at rest and
rises to full only while the camera moves.

**Rendering glitch fixed:** any resolution change, whether adaptive or a resize, re-renders immediately, so no black
frame appears.

### Tests (all run on this code)

`learning-studio-v30` is now 18 tests, with two new ones. One checks that Languages shows only drawable scripts, that
the camera moves continuously across 21 fine scroll steps, and that the astronaut stays more than 2.6 units from the
lens in six scenes. The other checks that in the overview a focused world comes closer while the others shrink, and
that during travel the others shrink further. The rest of the regression results are listed below once the full run
completes.

### Performance: what could and could not be measured

**No real-device GPU measurement was possible from this environment.** It has no graphics card, and the browser renders
WebGL in software (SwiftShader). Per-pixel cost dominates there, so the software frame rate is only a relative indicator.
The figures below must not be read as real-device FPS. Measuring the opening, a world and the overview on a GPU laptop
and a mid-range phone is still needed: open `learn.html?cosmos=gl`, then `LS.__cosmos.stats()` in the console returns
fps, CPU ms (median and 95th percentile), draw calls, triangles and textures.

**Software-renderer measurements.** `tools/perf-studio.js` on 2026-11-23, headless Chromium with SwiftShader (no GPU),
1360×900, pixel ratio 1, quality tier 1. These are a relative indicator only, not device FPS:

| Scene | fps (software) | CPU per frame, median / 95th pct | Draw calls | Triangles | JS heap |
|---|---|---|---|---|---|
| Opening | 5.1 | 1.4 / 4.2 ms | 150 | 81k | 22 MB |
| Geography world | 6.3 | 0.9 / 2.4 ms | 54 | 55k | 18 MB |
| Overview | 4.9 | 3.2 / 7.6 ms | 265 | 107k | 18 MB |

The phone tier on the same renderer (390×844, tier 0, pixel ratio 0.75–0.8): about 17 fps in world scenes, 133–156
draw calls in the journey, 259 in the overview, and 25k–73k triangles.

**Real-device tests performed: none.** None were possible here, because no GPU laptop or phone is attached to this
environment. This is the main open item.

### v32 test results (this code)

| Suite | Result |
|---|---|
| `learning-studio-v30` (universe, incl. 2 new v32 tests) | 18/18 |
| `learning-studio-v29` | 18/18 |
| `learning-studio-v28` | 21/21 |
| `learning-studio-v27` | 14/14 |
| `learning-studio-v26` | 14/14 |
| `learning-studio-v24` | 42/42 |
| `learning-studio-v23` | 18/18 (entrance test updated: the intro no longer plays before the universe, by request; it still plays on other entry pages) |
| `learning-studio-v22` | 22/22 |
| `learning-studio-v21` | 21/21 |
| `learning-studio` (base) | 34/34 |
| `learn-inspect` | 14/14 |
| `lab` | 34/34, no page errors |
| `problems` | 14/14 |
| `visual-chat` | 18/18 |
| `nav`, `a11y`, `studio-noor` | all checks passed |

### Remaining limitations

- **Real GPU and phone frame rates are unmeasured.**
- **World-specific geometry:** this pass improved the shared systems (camera, light, atmospheres, astronaut, overview,
  particles), plus Chemistry and Languages. The other nine worlds keep their v30 geometry and surfaces. Deeper
  per-world remodelling (Maths internal depth, Physics ring shadows, History instruments and so on) is still open.
- **The astronaut has no skeletal animation** (the model has none); all motion is procedural.
- **The walkthrough page** (`learn-guide/universe.html`) has refreshed screenshots, but it's live only after
  deployment.

**Deployment: not deployed.** The work is committed to the branch only.

## v33 — the astronaut in world space, flight continuity, overview names, loading status

### What changed

- **A new module, `assets/js/learn/ls-cosmos-astro.js`, flies the astronaut through world space.** Before v33 it was
  a camera-space offset, carried with the lens. Now:
  - **Its own path.** It follows a centripetal Catmull–Rom path through one anchor per keyframe. Each anchor is the
    keyframe's resting composition turned into a world position, so every still frame is unchanged. Anchors are
    rebuilt on resize and on phone rotation.
  - **Same journey parameter as the camera, plus a lead.** It reads the camera's damped journey parameter, plus a
    *lead* that grows with journey speed (at most 0.022 of the journey). It leaves first, arrives first, and waits
    while the camera catches up. The lead returns to 0 at rest.
  - **Orientation, banking and pitch.** It faces along its direction of flight and turns toward the world it is
    visiting at rest (quaternion slerp, rate-limited). It banks with lateral acceleration and pitches with
    acceleration.
  - **Effects only while moving.** Non-repeating zero-g drift is damped while travelling. A restrained jet glow and a
    48-point fading additive trail appear only in flight. The trail restarts on a direct jump (Destinations, deep
    link), so it never streaks across the sky.
  - **Guards.** It never comes within 2.6 units of the lens or behind it, and is kept inside an inner frame
    (NDC ±0.8 × ±0.72), so it can reach the edges but never leaves the shot.
- **The camera banks gently into the astronaut's turns** (`camera.rotateZ(-bank × 0.16)`), except during a selection
  flight.
- **Journey speed limit.** The scroll-driven journey now has a cap of 3.2 scenes per second on top of the
  exponential follow. A fast wheel flick or a far scroll is *flown*, never skipped, whatever the frame rate.
  - Before the cap: one software-rendered frame moved the astronaut 78 units.
  - After the cap: at most about 20 units per sample on the same machine (about 1 unit per frame at 60 fps).
- **Selection.** Choosing a world flies the astronaut along a curved Bézier path to a point beside that world while
  the camera flies in.
  - **One journey at a time:** a second click or a double-click during a flight is ignored, never a second
    overlapping flight.
  - Touch keeps the existing behaviour: first tap focuses, second tap travels.
- **Overview names.** In the final scene each of the eleven worlds carries its name, projected under the planet each
  frame. The focused (hovered or keyboard-focused) one is emphasised.
- **Loading status.** A `role="status"` line reports progress ("Preparing the universe · n/11 worlds…") and ends with
  "The universe is ready." If the astronaut model fails, it says so and the universe still works.
- **Palette.** The sky moves toward deep midnight navy, with restrained cyan, softened violet and a little amber.
  Nebula sprites are now blue and amber.
- **Fixed a v33 regression found during testing.** A temporal-dead-zone `ReferenceError` (`astroReady` was used
  before its declaration) made the universe fall back to the painted mode.

### Verified in a real browser (Chromium, software WebGL)

These are new tests in `tests/e2e/learning-studio-v30.e2e.js`; the suite passes **21/21**.

- **Continuity.** Fine scroll steps from 2 to 5 (in 0.25 increments) and a fast scroll from 5 to 12 were sampled
  across 66 points.
  - The largest astronaut move between samples stays under 24 units (measured 16–20 at about 3–5 fps).
  - It leads while travelling, with a measured lead of up to 0.021.
  - It is in frame in all but at most 2 samples (measured 0 in the latest probe run).
  - It settles with lead < 0.004 at rest.
- **Overview names:** all eleven are visible on screen in the overview.
- **Loading status:** ends at "ready" with `role="status"`.
- **No overlapping journeys:** a second selection during a flight is ignored, and the first world opens.
- **Every world opens its own page:** all eleven worlds open `#/world/<id>` through the selection journey. After 11
  round trips with Back there is still exactly one renderer.
- Screenshots of mid-flight frames, the overview with names, and phone framing were reviewed by eye.

### Not done or not verifiable here (honest)

- **GPU frame rates on the target device (ASUS ProArt P16) are unmeasured.** This container has no GPU. Every frame
  rate in this report is SwiftShader (CPU) rendering: about 3–12 fps, depending on scene and load. It is not an
  indication of GPU performance.
- **Per-world selection responses.** Each world has one shared selection response (flight + focus + the others
  receding), not a distinct per-world effect.
- **Planet surfaces.** Planet realism beyond the v32 work (terminator, night side, forward-scattering atmospheres,
  clouds, LOD) was not extended in this pass.
- **The astronaut model** still has no skeleton; all motion is whole-body and procedural.
