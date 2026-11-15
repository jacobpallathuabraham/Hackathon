# Noor visual benchmark — results

Run 2026-11-15 10:46 UTC in Chromium, from `tests/bench/run-bench.js`. Expected values are computed independently in `tests/bench/scenarios.js`.

| Subject | Target | Implemented & executable | Executed | Accurate (independent check) | Router picked the engine from the question | Control changes the model | Renders | All checks pass | Short of target |
|---|---|---|---|---|---|---|---|---|---|
| Mathematics | 200 | 330 | 330 | 328 | 330 | 209/214 | 330/330 | 323 | 0 |
| Physics | 200 | 293 | 293 | 283 | 265 | 215/216 | 293/293 | 282 | 0 |
| Chemistry | 150 | 137 | 137 | 132 | 137 | 60/64 | 137/137 | 128 | 13 |
| Engineering | 100 | 104 | 104 | 103 | 104 | 25/25 | 104/104 | 103 | 0 |
| Biology/Medicine | 100 | 57 | 57 | 57 | 57 | 14/14 | 57/57 | 57 | 43 |
| Statistics | 100 | 30 | 30 | 30 | 30 | 9/10 | 30/30 | 29 | 70 |
| Economics/Commerce | 50 | 49 | 49 | 49 | 49 | 38/38 | 49/49 | 49 | 1 |
| Interdisciplinary | 100 | 17 | 17 | 17 | 17 | 7/7 | 17/17 | 17 | 83 |
| **Total** | **1000** | **1017** | **1017** | **999** | **989** | **577/588** | **1017/1017** | **988** | **0** |

Failures are listed in the JSON with their reasons. “Router picked the engine” uses the scenario's own question text; question wordings are templated per family, so it measures routing on clear wordings, not on every way a student might phrase it.
