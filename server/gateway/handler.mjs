// Noor gateway — platform-neutral HTTP handler (Fetch API Request → Response).
// Used by server/noor-gateway-worker.mjs (Cloudflare Workers) and server/noor-gateway-node.mjs (Node 18+).
//
//   POST /v1/chat/completions  common-format chat, streamed (see format.mjs)
//   POST /v1/search            live answer grounded in Google Search (opt-in: GEMINI_SEARCH=1; see README for its display rules)
//   POST /v1/research/openalex scholarly works via OpenAlex (needs a free OPENALEX_API_KEY)
//   POST /v1/research/arxiv    arXiv preprints (arXiv's API has no browser CORS, so it is proxied, max 1 request / 3 s)
//   GET  /v1/health            which providers are configured + today's usage (no secrets, no student data)
// Nothing is stored. Student text is never logged; logs carry only request IDs, provider names and error codes.
import { parseRequest, GatewayError, sse, textChunk } from './format.mjs';
import { route, providers } from './router.mjs';
import { searchGrounded } from './providers/gemini.mjs';
import { Usage } from './usage.mjs';

let usage = null;
const cache = new Map(); // small in-memory cache for research lookups (public metadata only)
const cached = async (key, ttl, fn) => { const c = cache.get(key); if (c && Date.now() - c.t < ttl) return c.v; const v = await fn(); cache.set(key, { t: Date.now(), v }); if (cache.size > 300) cache.delete(cache.keys().next().value); return v; };
let arxivAt = 0;

export function corsHeaders(env, origin) {
  const allowed = env.ALLOWED_ORIGIN || '*';
  return { 'access-control-allow-origin': allowed === '*' ? '*' : (origin === allowed ? allowed : 'null'), 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-expose-headers': 'x-request-id', 'cache-control': 'no-store', vary: 'origin' };
}
const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { ...headers, 'content-type': 'application/json' } });

export async function handle(request, env, opts = {}) {
  usage = opts.usage || usage || new Usage(env);
  const origin = request.headers.get('origin'), cors = corsHeaders(env, origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) return json({ error: 'blocked' }, 403, cors);
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const ip = request.headers.get('cf-connecting-ip') || opts.ip || 'local';
  const fetchFn = opts.fetchFn || fetch;

  if (request.method === 'GET' && path.endsWith('/v1/health')) {
    const list = providers(env, opts.extraProviders);
    return json({ ok: true, providers: list.map(p => ({ name: p.name, model: p.model, vision: p.vision })), search: env.GEMINI_SEARCH === '1' && !!env.GEMINI_API_KEY, research: { openalex: !!env.OPENALEX_API_KEY, arxiv: true }, usage: usage.snapshot() }, 200, cors);
  }
  if (request.method !== 'POST') return json({ error: 'bad_request' }, 404, cors);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400, cors); }

  // ---- research proxies (public metadata only; the question is the only thing sent) ----
  if (path.endsWith('/v1/research/openalex') || path.endsWith('/v1/research/arxiv')) {
    const q = String(body && body.q || '').trim().slice(0, 200);
    if (!q) return json({ error: 'bad_request' }, 400, cors);
    const deny = usage.admit(ip); if (deny) return json({ error: deny }, 429, cors);
    try {
      if (path.endsWith('openalex')) {
        if (!env.OPENALEX_API_KEY) return json({ error: 'unavailable' }, 503, cors);
        const out = await cached('oa:' + q, 6 * 3600e3, async () => {
          const r = await fetchFn(`https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=5&select=id,doi,display_name,publication_year,authorships,primary_location,cited_by_count,abstract_inverted_index&api_key=${encodeURIComponent(env.OPENALEX_API_KEY)}`);
          if (!r.ok) throw new GatewayError(r.status === 429 ? 'rate_limited' : 'unavailable');
          return (await r.json()).results.map(w => ({ title: w.display_name, year: w.publication_year, doi: w.doi, url: (w.primary_location && w.primary_location.landing_page_url) || w.doi || w.id, venue: w.primary_location && w.primary_location.source && w.primary_location.source.display_name, authors: (w.authorships || []).slice(0, 4).map(a => a.author && a.author.display_name).filter(Boolean), cited: w.cited_by_count, abstract: abstractFrom(w.abstract_inverted_index) }));
        });
        return json({ source: 'OpenAlex', licence: 'CC0', results: out }, 200, cors);
      }
      const out = await cached('ax:' + q, 6 * 3600e3, async () => {
        const wait = 3100 - (Date.now() - arxivAt); if (wait > 0) await new Promise(r => setTimeout(r, wait)); arxivAt = Date.now();
        const r = await fetchFn(`https://export.arxiv.org/api/query?search_query=${encodeURIComponent('all:' + q)}&max_results=5`, { headers: { 'user-agent': 'ERLY-Noor/1.0 (study companion)' } });
        if (!r.ok) throw new GatewayError('unavailable');
        return parseArxiv(await r.text());
      });
      return json({ source: 'arXiv', licence: 'metadata CC0; papers under their own licences', results: out }, 200, cors);
    } catch (e) { return json({ error: e instanceof GatewayError ? e.code : 'upstream' }, 502, cors); }
  }

  // ---- live grounded search (opt-in) ----
  if (path.endsWith('/v1/search')) {
    const q = String(body && body.q || '').trim();
    if (!q) return json({ error: 'bad_request' }, 400, cors);
    const deny = usage.admit(ip); if (deny) return json({ error: deny }, 429, cors);
    if (!usage.available('gemini-search')) return json({ error: 'quota' }, 429, cors);
    usage.start('gemini-search');
    try { const out = await searchGrounded(env, q, { fetchFn, lang: body.lang }); usage.success('gemini-search'); return json({ provider: 'gemini', grounded: true, ...out }, 200, cors); }
    catch (e) { usage.failure('gemini-search', e); return json({ error: e instanceof GatewayError ? e.code : 'upstream' }, e && e.code === 'quota' ? 429 : 502, cors); }
  }

  // ---- chat ----
  if (!path.endsWith('/chat/completions')) return json({ error: 'bad_request' }, 404, cors);
  let req;
  try { req = parseRequest(body); } catch (e) { return json({ error: 'bad_request' }, 400, cors); }
  const deny = usage.admit(ip);
  if (deny) return json({ error: deny, request_id: req.requestId }, 429, { ...cors, 'x-request-id': req.requestId });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const put = s => { try { ctrl.enqueue(enc.encode(s)); } catch (e) { /* client went away */ } };
      try {
        const out = await route(req, { env, usage, fetchFn, list: providers(env, opts.extraProviders), signal: opts.signal, onMeta: m => put(sse({ erly: { type: 'meta', request_id: req.requestId, ...m } })), onText: t => put(textChunk(t)) });
        put(sse({ erly: { type: 'done', request_id: req.requestId, provider: out.provider, model: out.model, usage: out.usage, finish: out.finish } }));
      } catch (e) {
        const code = e instanceof GatewayError ? e.code : 'upstream';
        console.error('noor gateway:', req.requestId, code, e && e.provider || ''); // never the student's text
        put(sse({ error: code, request_id: req.requestId }));
      }
      put('data: [DONE]\n\n'); try { ctrl.close(); } catch (e) { /* closed */ }
    }
  });
  return new Response(stream, { headers: { ...cors, 'content-type': 'text/event-stream; charset=utf-8', 'x-request-id': req.requestId } });
}
export function abstractFrom(inv) { if (!inv) return ''; const w = []; for (const [k, ps] of Object.entries(inv)) for (const p of ps) w[p] = k; return w.join(' ').slice(0, 1200); }
export function parseArxiv(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 5).map(m => {
    const g = t => ((m[1].match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`)) || [])[1] || '').replace(/\s+/g, ' ').trim();
    return { title: g('title'), url: g('id'), published: g('published').slice(0, 10), authors: [...m[1].matchAll(/<name>([\s\S]*?)<\/name>/g)].slice(0, 4).map(a => a[1].trim()), abstract: g('summary').slice(0, 1200) };
  });
}
export const _usage = () => usage;
export const _reset = () => { usage = null; cache.clear(); };
