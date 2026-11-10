// ERLY — Noor's zero-budget AI gateway as a Cloudflare Worker (Workers Free plan).
// Holds the provider keys (never the website), speaks one common format to the browser, routes to
// Gemini's free tier first and an optional free OpenRouter model second. See server/gateway/README.md.
//
// Deploy:
//   npm create cloudflare@latest noor-gateway -- --type hello-world --lang js
//   copy this file to src/index.js and the server/gateway/ folder to src/gateway/
//   npx wrangler secret put GEMINI_API_KEY          (free key from https://aistudio.google.com/api-keys)
//   optional: npx wrangler secret put OPENROUTER_API_KEY, OPENALEX_API_KEY
//   wrangler.toml [vars]: ALLOWED_ORIGIN = "https://<user>.github.io", GEMINI_MODEL = "<a model your project's free tier lists>"
//   npx wrangler deploy
// Then in assets/js/companion/config.js:  gateway: { url: 'https://noor-gateway.<you>.workers.dev' }
import { handle } from './gateway/handler.mjs';
export default { fetch: (request, env) => handle(request, env) };
