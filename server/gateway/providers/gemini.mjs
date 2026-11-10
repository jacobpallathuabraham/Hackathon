// Google Gemini (Gemini Developer API).
// Chat uses Google's documented OpenAI-compatible endpoint (https://aistudio.google.com/docs/openai):
//   POST https://generativelanguage.googleapis.com/v1beta/openai/chat/completions  (Authorization: Bearer <key>)
// Live search uses the Interactions API with the google_search tool (https://aistudio.google.com/docs/google-search),
// whose answers carry url_citation annotations. Grounded results have display rules (shown unmodified, with
// Google's search suggestions, not cached) — see searchGrounded() and the gateway README.
// Model IDs come from environment variables; nothing here assumes which model is free.
import { openaiCompatible, failure } from './openai-compat.mjs';
import { GatewayError } from '../format.mjs';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
export function geminiChat(env) {
  if (!env.GEMINI_API_KEY) return null;
  return openaiCompatible({
    name: 'gemini', url: BASE + '/openai/chat/completions', key: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL || 'gemini-3.8-flash', vision: env.GEMINI_VISION !== '0',
    extra: env.GEMINI_THINKING ? { extra_body: { google: { thinking_config: { thinking_level: env.GEMINI_THINKING } } } } : {}
  });
}

// One grounded answer (not streamed). Returns { text, citations:[{url,title,start,end}], queries, suggestionsHtml }.
export async function searchGrounded(env, question, { signal, fetchFn = fetch, lang = 'en' } = {}) {
  if (!env.GEMINI_API_KEY || env.GEMINI_SEARCH !== '1') throw new GatewayError('unavailable', { provider: 'gemini-search' });
  let r;
  try {
    r = await fetchFn(BASE + '/interactions', {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY, 'Api-Revision': env.GEMINI_API_REVISION || '2026-05-20' },
      body: JSON.stringify({ model: env.GEMINI_SEARCH_MODEL || env.GEMINI_MODEL || 'gemini-3.8-flash', input: String(question).slice(0, 2000), system_instruction: `Answer the student's question accurately and concisely${lang === 'ar' ? ' in Arabic' : ''}, using current search results. Give dates for time-sensitive facts.`, tools: [{ type: 'google_search' }] })
    });
  } catch (e) { throw new GatewayError(e && e.name === 'AbortError' ? 'timeout' : 'unavailable', { provider: 'gemini-search' }); }
  if (!r.ok) throw await failure(r, 'gemini-search');
  let j; try { j = await r.json(); } catch (e) { throw new GatewayError('invalid', { provider: 'gemini-search' }); }
  return parseInteraction(j);
}
export function parseInteraction(j) {
  const steps = Array.isArray(j && j.steps) ? j.steps : Array.isArray(j && j.outputs) ? j.outputs : [];
  let text = '', citations = [], queries = [], suggestionsHtml = '';
  for (const s of steps) {
    if (s.type === 'google_search_call' && s.arguments && Array.isArray(s.arguments.queries)) queries.push(...s.arguments.queries);
    if (s.type === 'google_search_result' && Array.isArray(s.result)) for (const x of s.result) if (x && typeof x.search_suggestions === 'string') suggestionsHtml += x.search_suggestions;
    if (s.type === 'model_output' && Array.isArray(s.content)) for (const c of s.content) if (c.type === 'text') {
      const off = text.length; text += c.text || '';
      for (const a of c.annotations || []) if (a.type === 'url_citation' && /^https?:\/\//.test(a.url || '')) citations.push({ url: a.url, title: a.title || a.url, start: off + (a.start_index || 0), end: off + (a.end_index || 0) });
    }
  }
  if (!text.trim()) throw new GatewayError('invalid', { provider: 'gemini-search' });
  return { text, citations, queries, suggestionsHtml };
}
