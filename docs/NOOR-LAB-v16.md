# Noor Lab (v16): interactive maths and physics in Noor

Date: 14 November 2026. Everything here was built and tested in this repository: Chromium via Playwright, plus Node unit tests.

## How to use it

Ask Noor in ordinary words. For example:
- "graph y = a(x−h)² + k"
- "show me why the angles of a triangle add up to 180°"
- "create a 3D model of a cone"
- "build a series circuit with two resistors"
- "projectile motion at 30°"

You can also tap **Maths & physics lab** on Noor's welcome screen.

The model opens beside the chat (full screen on phones and portrait tablets). Change it by:
- using its controls;
- typing in the lab's command bar;
- carrying on the conversation: "make it wider", "move the vertex to (2, 3)", "show the derivative", "remove air resistance", "double the resistance".

Each change updates the open model in place; it isn't rebuilt from scratch.

The lab works with Noor's AI switched off. Every number comes from the engines, never from a language model.

## Bug fixes in this release (sign-in page)

| Problem in your screenshot | Cause | Fix |
|---|---|---|
| A second orange box inside the password field | v15's site-wide focus ring for form fields was drawn inside a box that already shows its own focus border | Fields inside such boxes (sign-in and Noor's composer) no longer get the extra ring. Checked: outline `none` on the inner input; one ring on the box |
| An empty red "!" box before you'd done anything | The error box's `display: flex` overrode the `hidden` attribute | `.lerr[hidden], .lerr:empty { display: none }`. Checked: hidden before submitting; "Incorrect username or password." after a wrong attempt |

## Architecture: `assets/js/lab/`

The lab is split into separate engines (not one large component) behind one router and workspace:

- **`lab-core.js`**:
  - the workspace shell: header, controls, stage, explanation, command bar, export menu, full screen, reset;
  - **InteractiveStateManager**, the shared `Plot` canvas (pan, wheel and pinch zoom, equal axes, theme-aware), the UI kit and numerics;
  - **MathematicsRouter**: plain language → the best engine; follow-ups go to the open model first;
  - **ExportEngine**: PNG, JSON, CSV and copy.
- **`lab-math.js`**: MathExpr, GraphingEngine, CalculusEngine, AlgebraEngine and StatsEngine.
- **`lab-geo3d.js`**: GeometryEngine (JSXGraph) and ThreeDEngine (three.js).
- **`lab-physics.js`**: a simulation harness (SimulationStateManager) plus MechanicsEngine, CircuitEngine, electric and magnetic field engines, WaveEngine, OpticsEngine, ThermodynamicsEngine, AstronomyEngine and ModernPhysicsEngine (radioactive decay).
- **MathematicalExplanationEngine**: each engine writes its own explanation from its live state, so the explanation changes when the model does.

### Libraries

All are open source and hosted on the site, so there is no API key and no cost:

| Library | Version | Licence | Used for |
|---|---|---|---|
| math.js | 13.2.0 | Apache-2.0 | parsing and evaluation, matrices, eigenvalues, complex numbers, least squares |
| Nerdamer | 1.1.13 | MIT | symbolic solve, factor, expand, simplify, d/dx, ∫ and limits |
| JSXGraph | 1.10.1 | MIT or LGPL-3.0 | dependent, draggable geometry |
| three.js | (already on the site) | MIT | 3D |

The Desmos API and GeoGebra embedding were looked at but not used. Their terms involve API keys or approval, licensing conditions, or loading third-party code on every visit, which doesn't fit a zero-budget, no-keys static site. The engines above cover the same ground with open licences.

## Accuracy safeguards

- **Algebra:**
  - every real solution is substituted back (✓/✗ shown);
  - factorisations and expansions are checked numerically at several points;
  - derivatives are compared with the numerical slope;
  - antiderivatives are differentiated back;
  - matrix inverses are checked: A·A⁻¹ = I.
  - Step-by-step working is shown only where it is genuine (linear and quadratic equations, read from the expanded polynomial). Otherwise Noor shows the result and how it was checked.
- **Graphs:**
  - roots, extrema and intersections are found numerically in the current window and labelled as such;
  - undefined points and asymptotes leave gaps rather than false joins.
- **Calculus:**
  - an exact integral is reported only when F(b) − F(a) agrees with Simpson's rule; otherwise the answer is labelled "numerical";
  - the limit table is numerical, and the limit value comes from Nerdamer where it can find one.
- **Physics:**
  - every model has an "Assumptions and limits" section;
  - readouts show the live checks: energy ratio, momentum before and after, Kirchhoff, theory vs simulation;
  - values are labelled simulated;
  - planet sizes are labelled not to scale.
- **Statistics:** example data is labelled illustrative, simulations are labelled simulated, and the quartile method is stated.

## Test results (run in this session)

**Unit tests** (`tests/unit/lab.test.js`): 8/8 pass.

| Test | What it checks |
|---|---|
| numerics | roots, extrema, Simpson, RK4, t and normal distributions |
| expression reading | implicit multiplication, parameters, implicit/inequality/parametric/polar/piecewise |
| algebra | answers checked: quadratic with discriminant, a system, factor, expand, d/dx, ∫ from 0 to 3 = 9, det = −2, inverse, eigenvalues 2 and 3, √−4 = 2i, complex roots |
| statistics | mean 5, σ = 2, s = 2.13809, quartiles, correlation |
| circuits | series 0.4 A, parallel, internal resistance, a Wheatstone bridge (KCL at both nodes to 1e−12), an LED on and off, an open switch |
| mechanics | RK4 range = analytic, drag shortens the range, a heavier ball with drag goes further, 30°/60° equal ranges, momentum and kinetic energy, perfectly inelastic, static friction, exact pendulum period at 90° = 1.18034 × small-angle |
| optics | Snell, total internal reflection, thin lens v = 15 and m = −0.5, virtual image |
| routing | 28 plain-language requests reach the right engine; 8 ordinary chat messages ("a wave of anxiety", "digital transformation", "what do you mean?"…) don't open the lab |

**Browser acceptance** (`tests/e2e/lab.e2e.js`): 34/34 pass. These run through Noor's chat with **no AI provider**, using real sliders, mouse drags, 3D rotation, the mouse wheel, downloads, a phone, and theme changes.

| # | Maths test | Result | How it was checked |
|---|---|---|---|
| 1 | Graph a quadratic | Pass | y = x² − 2x − 3: roots exactly −1 and 3, vertex (1, −4) |
| 2 | Add multiple functions | Pass | 3 graphs; every intersection lies on two curves |
| 3 | A slider updates the graph | Pass | a = 2, h = 1: canvas redrawn, vertex moves to x = 1, explanation says "Vertex (1, 0)" |
| 4 | Plot an inequality | Pass | the pixel inside y > x² − 4 is shaded; the pixel outside is not |
| 5 | Construct a triangle | Pass | angle sum 180° |
| 6 | Drag a vertex | Pass | real mouse drag: ∠A changes, the sum stays 180°, the explanation shows the new value |
| 7 | Circle and tangent | Pass | the tangent–radius angle is 90° |
| 8 | 3D sphere | Pass | V = 4/3·π·8; "make the radius 3" gives r = 3 |
| 9 | Rotate and zoom 3D | Pass | drag changes the camera; the wheel increases the camera distance |
| 10 | Derivative | Pass | f′ = 3x² − 3 (symbolic); tangent slope = f′(x₀); slope 9 at x = 2 |
| 11 | Integral | Pass | ∫ from 0 to 3 of x² = 9 (exact); n = 100 left sum matches its closed form, error shrinks by more than 5× |
| 12 | Histogram | Pass | 9 values, labelled "your data" |
| 13 | Standard deviation | Pass | σ = 2, s = 2.13809 in Noor's reply |
| 14 | Solve a system | Pass | x = 3, y = 2 with ✓ checks; the graph's intersection is at (3, 2) |
| 15 | Modify through conversation | Pass | "wider" gives a = 1; "vertex to (2, 3)" gives h = 2, k = 3; "show the derivative" adds it; "explain the difference" |
| 16 | Export | Pass | a valid PNG file, JSON containing the expression, CSV table |
| 17 | Mobile | Pass | iPhone 13 profile: full screen, stage over 300 px, no overflow, 16 px input, touch drag pans |
| 18 | Dark and light | Pass | the canvas and panel follow the theme |
| 19 | AI unavailable | Pass | tier "local"; the lab still answers |

| # | Physics test | Result | How it was checked |
|---|---|---|---|
| 1 | Projectile, adjustable angle | Pass | at 40°, the simulated range = v₀² sin 2θ / g to 0.2% |
| 2 | Newton's 2nd law | Pass | a = (F − μmg)/m, simulated and expected |
| 3 | Elastic and inelastic collisions | Pass | momentum conserved; sticking gives v = 5/3 m/s |
| 4 | Spring–mass | Pass | energy ratio 1 ± 1e−6; measured period = 2π√(m/k) to 0.2% |
| 5 | Pendulum | Pass | measured period = exact elliptic-integral period to 0.2% at 60°, more than 6% longer than the small-angle formula |
| 6 | Series and parallel circuits | Pass | 0.4 A in series; 1.8 A in parallel; KCL |
| 7 | Ohm's law | Pass | "double the resistance" halves the current |
| 8 | Electric field | Pass | Coulomb force readout = kq₁q₂/r² |
| 9 | Magnetic field | Pass | B at 3 cm from 5 A = μ₀I/2πr |
| 10 | Wave interference | Pass | animates; simulated time advances |
| 11 | Refraction | Pass | θ₂ = Snell's law exactly; "glass" switches the medium |
| 12 | Ideal gas | Pass | measured pressure is 0.9–1.5 × NkT/A; "heat the gas" doubles T |
| 13 | Planetary orbit | Pass | energy ratio 1 ± 1e−6; measured period 1 year at 1 AU (±0.002) |
| 14 | Radioactive decay | Pass | N(5 s) within 5σ of N₀/2 |
| 15 | Modify through conversation | Pass | heavier (with and without drag), add/remove air resistance, compare 30/45/60°, show vectors |

**Regression:** after the fixes listed below, every existing suite passes on the current code.

## What is simplified, and what isn't supported yet

**Simplified (and labelled as such in the lab):**
- **Gas:** 2D hard discs in scaled units; heating rescales speeds (a thermostat) rather than modelling heat flow.
- **Circuits:** DC steady state; a bulb is a fixed resistance; an LED is a 2 V drop with 5 Ω on-resistance; a capacitor is open and an inductor shorted in DC, plus one RC charging curve.
- **Orbits:** each planet feels only the star.
- **Fields:** point charges and infinite wires in vacuum or air.
- **Interference:** circular waves with a 1/√r amplitude.

**Not yet supported** (requests for these fall back to Noor's normal answer and the existing visuals):

| Area | Not yet supported |
|---|---|
| Geometry | A free toolbar for building arbitrary constructions point by point. Constructions are chosen from a library: triangle, angle-sum proof, centres, circle and tangent, two circles, transformations, bisectors, Pythagoras, lines, polygon, similarity. Loci and congruence tests are also missing |
| 3D | Surface–surface intersections, general parametric surfaces (only the helix and torus) and 3D reflections |
| Grapher | Rendered LaTeX for expressions (plain notation is used) |
| Statistics | Hypothesis tests other than the one-sample t-test |
| Algebra | Steps beyond linear and quadratic equations |
| Simulations | Stepping backwards |
| Circuits | A free drag-and-wire canvas. Circuits are built as series blocks of parallel branches, which covers series, parallel and mixed networks. AC is also missing |
| Not simulated | Faraday/Lenz induction and transformers (diagrams exist in the visual library), EM waves, diffraction, dispersion, polarisation, conduction/convection, phase changes, entropy, the photoelectric effect, energy levels, relativity, tides, eclipses, black holes, fluids (pressure, buoyancy, Bernoulli), torque, rotational motion and centre of mass |
| Arabic | The lab's labels are mostly English; Noor's replies follow the page language |
