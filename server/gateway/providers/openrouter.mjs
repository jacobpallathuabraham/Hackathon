// OpenRouter — optional fallback. Only models whose ID ends in ":free" are allowed here (zero budget).
// Free-model limits documented at https://openrouter.ai/docs/api/reference/limits (checked 2026-11-10):
// 20 requests/minute; 50/day for accounts that never bought credits (1000/day after buying ≥ 10 credits).
// Some free providers may log or train on prompts unless training is disabled in the OpenRouter account settings.
import { openaiCompatible } from './openai-compat.mjs';
export function openrouterChat(env) {
  if (!env.OPENROUTER_API_KEY || !env.OPENROUTER_MODEL) return null;
  if (!/:free$/.test(env.OPENROUTER_MODEL) && env.OPENROUTER_ALLOW_PAID !== '1') return null; // zero-budget guard
  return openaiCompatible({ name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL, vision: env.OPENROUTER_VISION === '1', headers: { 'X-Title': 'ERLY Noor' } });
}
