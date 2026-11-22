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
