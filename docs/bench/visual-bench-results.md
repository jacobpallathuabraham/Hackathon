# Noor visual benchmark — results

Run 2026-11-15 11:19 UTC in Chromium, from `tests/bench/run-bench.js`. Expected values are computed independently in `tests/bench/scenarios.js`.

| Subject | Target | Implemented & executable | Executed | Accurate (independent check) | Router picked the engine from the question | Control changes the model | Renders | All checks pass | Short of target |
|---|---|---|---|---|---|---|---|---|---|
| Mathematics | 200 | 330 | 330 | 330 | 330 | 214/214 | 330/330 | 330 | 0 |
| Physics | 200 | 316 | 316 | 316 | 316 | 219/219 | 316/316 | 316 | 0 |
| Chemistry | 150 | 147 | 147 | 147 | 147 | 64/64 | 147/147 | 147 | 3 |
| Engineering | 100 | 104 | 104 | 104 | 104 | 25/25 | 104/104 | 104 | 0 |
| Biology/Medicine | 100 | 74 | 74 | 74 | 74 | 17/17 | 74/74 | 74 | 26 |
| Statistics | 100 | 30 | 30 | 30 | 30 | 10/10 | 30/30 | 30 | 70 |
| Economics/Commerce | 50 | 49 | 49 | 49 | 49 | 38/38 | 49/49 | 49 | 1 |
| Interdisciplinary | 100 | 17 | 17 | 17 | 17 | 7/7 | 17/17 | 17 | 83 |
| **Total** | **1000** | **1067** | **1067** | **1067** | **1067** | **594/594** | **1067/1067** | **1067** | **0** |

Failures are listed in the JSON with their reasons. “Router picked the engine” uses the scenario's own question text; question wordings are templated per family, so it measures routing on clear wordings, not on every way a student might phrase it.
