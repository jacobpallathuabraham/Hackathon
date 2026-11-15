# Noor visual benchmark — results

Run 2026-11-15 06:25 UTC in Chromium, from `tests/bench/run-bench.js`. Expected values are computed independently in `tests/bench/scenarios.js`.

| Subject | Target | Implemented & executable | Executed | Accurate (independent check) | Router picked the engine from the question | Control changes the model | Renders | All checks pass | Short of target |
|---|---|---|---|---|---|---|---|---|---|
| Mathematics | 200 | 167 | 167 | 167 | 167 | 98/101 | 167/167 | 164 | 33 |
| Physics | 200 | 132 | 132 | 132 | 104 | 124/124 | 132/132 | 132 | 68 |
| Chemistry | 150 | 38 | 38 | 38 | 38 | 20/20 | 38/38 | 38 | 112 |
| Engineering | 100 | 68 | 68 | 68 | 68 | 12/12 | 68/68 | 68 | 32 |
| Biology/Medicine | 100 | 15 | 15 | 15 | 15 | 0/0 | 15/15 | 15 | 85 |
| Statistics | 100 | 20 | 20 | 20 | 20 | 0/0 | 20/20 | 20 | 80 |
| Economics/Commerce | 50 | 24 | 24 | 24 | 24 | 24/24 | 24/24 | 24 | 26 |
| Interdisciplinary | 100 | 0 | 0 | 0 | 0 | 0/0 | 0/0 | 0 | 100 |
| **Total** | **1000** | **464** | **464** | **464** | **436** | **278/281** | **464/464** | **461** | **536** |

Failures are listed in the JSON with their reasons. “Router picked the engine” uses the scenario's own question text; question wordings are templated per family, so it measures routing on clear wordings, not on every way a student might phrase it.
