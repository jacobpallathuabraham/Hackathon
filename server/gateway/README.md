# Noor gateway — zero-budget, provider-independent AI backend

The website is static (GitHub Pages) and can never hold an API key, so Noor's AI runs through this small
gateway. It speaks one common format to the browser (see `format.mjs`) and translates to whichever provider
is configured. The same code runs as a Cloudflare Worker (`../noor-gateway-worker.mjs`) or on Node 18+
(`../noor-gateway-node.mjs`).

```
browser (Noor) ──common format──▶ gateway ──▶ Gemini (free tier) ─┐
                                     │      └▶ OpenRouter :free  ──┤  first that works, before any text
                                     │                             │  is streamed; each tried once
                                     ├─▶ /v1/search  (Google Search grounding, opt-in)
                                     ├─▶ /v1/research/openalex  (free key)   /v1/research/arxiv
                                     └─▶ /v1/health  (providers + usage, no secrets)
```

## What was checked (2026-11-10, from Google's and OpenRouter's own pages)

| Fact | Source |
|---|---|
| `gemini-3.8-flash`: free input and output on the free tier; Google Search grounding **not** free on this model | aistudio.google.com/docs/pricing |
| `gemini-2.5-flash` / `-flash-lite`: free grounding up to 500 requests/day (shared) | same page |
| Free-tier per-model RPM/RPD are **no longer published as a table**; each project sees its own limits in AI Studio. Daily limits reset at midnight Pacific. Grounding on Gemini 3+: default 1,500 requests/day per project | aistudio.google.com/docs/rate-limits |
| **Free-tier content is used to improve Google's products and human reviewers may read it** — "Do not submit sensitive, confidential, or personal information" | Gemini API terms, "Unpaid Services" |
| **Users must be 18+, and the API must not be used in a service "directed towards or likely to be accessed by individuals under the age of 18"** | Gemini API terms, "Age Requirements" |
| The terms call API grounding a Paid Service, while pricing lists a free allowance — **confirm before enabling** `GEMINI_SEARCH` | terms vs pricing |
| Grounded results must be shown **unmodified**, with Google's search suggestions, and not cached | terms, "Grounding with Google Search" |
| UAE is an available region | aistudio.google.com/docs/available-regions |
| OpenRouter `:free` models: 20 requests/minute, **50/day** (1,000/day after ever buying ≥ 10 credits); 16 free models listed | openrouter.ai/docs/api/reference/limits, /api/v1/models |
| Hugging Face Inference Providers: **no monthly credits for free accounts** — not a zero-budget option | huggingface.co/docs/inference-providers/pricing |
| Cloudflare Workers Free: 100,000 requests/day, 10 ms CPU per request (waiting on network doesn't count), 50 subrequests/request; KV free: 1,000 writes/day | developers.cloudflare.com |

Because quotas change, **every limit here is configuration**, and the model is an environment variable.
Nothing assumes a model is free: set the one your AI Studio project lists as free.

## Deploy on Cloudflare Workers (free plan)

```bash
npm create cloudflare@latest noor-gateway -- --type hello-world --lang js
cp server/noor-gateway-worker.mjs noor-gateway/src/index.js
cp -r server/gateway noor-gateway/src/gateway
cd noor-gateway
npx wrangler secret put GEMINI_API_KEY        # free key from https://aistudio.google.com/api-keys
# optional: npx wrangler secret put OPENROUTER_API_KEY ; npx wrangler secret put OPENALEX_API_KEY
npx wrangler deploy
```

`wrangler.toml` `[vars]`:

| Variable | Meaning | Default |
|---|---|---|
| `ALLOWED_ORIGIN` | your site, e.g. `https://<user>.github.io` | `*` |
| `GEMINI_MODEL` | a model your project's free tier lists | `gemini-3.8-flash` |
| `NOOR_PROVIDERS` | order, e.g. `gemini,openrouter` | `gemini,openrouter` |
| `OPENROUTER_MODEL` | must end in `:free` (e.g. `google/gemma-4-31b-it:free`) | — |
| `NOOR_DAILY_CAP` / `NOOR_IP_PER_MINUTE` / `NOOR_IP_PER_DAY` | gateway-wide and per-client caps | 1000 / 6 / 60 |
| `NOOR_GEMINI_RPM`, `NOOR_GEMINI_RPD` … | per-provider caps (set to your AI Studio limits) | none |
| `NOOR_TIMEOUT_MS` / `NOOR_FIRST_TOKEN_MS` | total / first-token timeouts | 45000 / 25000 |
| `GEMINI_SEARCH` | `1` enables `/v1/search` (read the grounding terms first) | off |

Then in `assets/js/companion/config.js`: `gateway: { url: 'https://noor-gateway.<you>.workers.dev', name: 'Noor AI (Gemini)' }`
and, optionally, `limits: { aiPerDay: 100, aiPerMinute: 8 }` for the per-device caps.

## Failure handling

* A provider is tried **once**. It is skipped for the rest of the day after a per-day 429 (until the reset), or for 5–120 s after a per-minute 429.
* Fallback to the next provider happens **only before any text is streamed** — two providers' answers are never spliced.
* The browser receives only codes: `quota`, `rate_limited`, `timeout`, `unavailable`, `invalid`, `upstream`, `bad_request`. Provider messages are never forwarded.
* Every request carries a request ID (`nr-…` from the browser), logged with errors and shown to the student as a support reference.

## Privacy

Only the conversation the student chose to send (emails and phone numbers already removed in the browser) and
any retrieved public source passages are sent. Noor never sends the student's name, profile, tracking data,
learning records, handwriting or personal memory to the gateway. The gateway stores nothing and logs no
student text. Usage counters are in memory (per instance); persisting them would need KV, whose free plan
allows 1,000 writes/day.
