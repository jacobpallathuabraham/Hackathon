// Noor gateway — model selection and routing.
// NOOR_PROVIDERS sets the order, e.g. "gemini,openrouter" (default) or "gemini,openrouter,anthropic".
// A request goes to the first provider that is configured and not paused. It moves to the next one only
// if the provider fails BEFORE any text was streamed, and only for quota / rate-limit / timeout / unavailable.
// Each provider is tried at most once per request: no retry loops that burn free quota.
import { GatewayError } from './format.mjs';
import { geminiChat } from './providers/gemini.mjs';
import { openrouterChat } from './providers/openrouter.mjs';
import { openaiChat } from './providers/openai.mjs';

const FACTORIES = { gemini: geminiChat, openrouter: openrouterChat, openai: openaiChat };
export function providers(env, extra = {}) {
  const order = String(env.NOOR_PROVIDERS || 'gemini,openrouter').split(',').map(s => s.trim()).filter(Boolean);
  return order.map(n => (extra[n] ? extra[n](env) : FACTORIES[n] ? FACTORIES[n](env) : null)).filter(Boolean);
}
const FALLBACK = new Set(['quota', 'rate_limited', 'timeout', 'unavailable']);

// run(req, { env, usage, onText, onMeta, signal, list }) → { provider, model, usage, finish }
export async function route(req, { env, usage, onText, onMeta, signal, list, fetchFn }) {
  const all = list || providers(env);
  if (!all.length) throw new GatewayError('unavailable');
  const timeoutMs = parseInt(env.NOOR_TIMEOUT_MS, 10) || 45000, firstTokenMs = parseInt(env.NOOR_FIRST_TOKEN_MS, 10) || 25000;
  let lastErr = new GatewayError('unavailable');
  for (const p of all) {
    if (req.images && !p.vision) { lastErr = new GatewayError('invalid'); continue; }
    if (!usage.available(p.name)) { lastErr = new GatewayError('quota', { provider: p.name }); continue; }
    usage.start(p.name);
    const ctrl = new AbortController(), stopAll = () => ctrl.abort();
    if (signal) signal.addEventListener('abort', stopAll, { once: true });
    let streamed = false;
    const first = setTimeout(() => { if (!streamed) ctrl.abort(); }, firstTokenMs), total = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      onMeta && onMeta({ provider: p.name, model: p.model });
      const out = await p.stream(req, { signal: ctrl.signal, fetchFn, onText: t => { streamed = true; onText(t); } });
      if (!out.any) throw new GatewayError('invalid', { provider: p.name }); // an empty answer is a failure, not a reply
      usage.success(p.name, out.usage);
      return { provider: p.name, model: p.model, usage: out.usage, finish: out.finish };
    } catch (e) {
      const err = e instanceof GatewayError ? e : new GatewayError(ctrl.signal.aborted ? 'timeout' : 'upstream', { provider: p.name });
      if (ctrl.signal.aborted && err.code !== 'timeout' && !(signal && signal.aborted)) err.code = 'timeout';
      usage.failure(p.name, err);
      if (signal && signal.aborted) throw new GatewayError('timeout');
      if (streamed || !FALLBACK.has(err.code)) throw err; // never splice two providers' answers together
      lastErr = err;
    } finally { clearTimeout(first); clearTimeout(total); if (signal) signal.removeEventListener('abort', stopAll); }
  }
  throw lastErr;
}
