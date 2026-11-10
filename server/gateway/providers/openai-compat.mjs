// Any OpenAI-compatible chat endpoint: Gemini's compatibility endpoint, OpenRouter, OpenAI.
// Translates the internal format → provider request, and the provider's stream → text deltas.
import { GatewayError, systemFor } from '../format.mjs';

export function toMessages(req, vision) {
  const out = [{ role: 'system', content: systemFor(req) }];
  for (const m of req.messages) {
    if (m.role === 'system') continue;
    if (m.images.length && vision) out.push({ role: m.role, content: [...m.images.map(url => ({ type: 'image_url', image_url: { url } })), { type: 'text', text: m.text || 'Describe this image.' }] });
    else if (m.images.length) throw new GatewayError('invalid'); // never answer an image question without the image
    else out.push({ role: m.role, content: m.text });
  }
  return out;
}

// map an HTTP failure to a gateway code (provider text is never passed on)
export async function failure(r, provider) {
  let retry = +(r.headers.get('retry-after') || 0), daily = false;
  try {
    const j = await r.json(), e = (Array.isArray(j) ? j[0] : j) || {}, err = e.error || {};
    const d = err.details; if (Array.isArray(d)) { const ri = d.find(x => x && x.retryDelay); if (ri) retry = parseFloat(ri.retryDelay) || retry; daily = d.some(x => x && Array.isArray(x.violations) && x.violations.some(v => /PerDay|per.?day|daily/i.test(JSON.stringify(v)))); }
    daily = daily || /per.?day|daily|PerDay/i.test(String(err.message || ''));
  } catch (e) { /* not JSON */ }
  // a per-day limit pauses the provider until its reset; a per-minute one only briefly
  if (r.status === 429) return new GatewayError(daily ? 'quota' : 'rate_limited', { status: 429, retryAfter: daily ? 0 : retry, provider });
  if (r.status === 402) return new GatewayError('quota', { status: 402, provider });
  if (r.status === 400 || r.status === 413 || r.status === 422) return new GatewayError('invalid', { status: r.status, provider });
  if (r.status === 401 || r.status === 403) return new GatewayError('unavailable', { status: r.status, provider }); // bad key, region or permission
  return new GatewayError(r.status >= 500 ? 'unavailable' : 'upstream', { status: r.status, provider });
}

// stream(req, { onText, signal }) → { usage, finish, model }
export function openaiCompatible({ name, url, key, model, vision = false, headers = {}, extra = {} }) {
  return {
    name, model, vision,
    async stream(req, { onText, signal, fetchFn = fetch }) {
      const body = JSON.stringify(Object.assign({ model, messages: toMessages(req, vision), stream: true, stream_options: { include_usage: true } }, extra));
      let r;
      try { r = await fetchFn(url, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', authorization: 'Bearer ' + key }, headers), body, signal }); }
      catch (e) { throw new GatewayError(e && e.name === 'AbortError' ? 'timeout' : 'unavailable', { provider: name }); }
      if (!r.ok) throw await failure(r, name);
      const rd = r.body.getReader(), dec = new TextDecoder();
      let buf = '', usage = null, finish = null, any = false;
      for (;;) {
        let chunk;
        try { chunk = await rd.read(); } catch (e) { throw new GatewayError(e && e.name === 'AbortError' ? 'timeout' : 'upstream', { provider: name }); }
        if (chunk.done) break;
        buf += dec.decode(chunk.value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') return { usage, finish, model, any };
          let j; try { j = JSON.parse(data); } catch (e) { continue; }
          if (j.error) throw new GatewayError(j.error.code === 429 ? 'rate_limited' : 'upstream', { provider: name });
          const c = j.choices && j.choices[0];
          const d = c && c.delta && c.delta.content;
          if (typeof d === 'string' && d) { any = true; onText(d); }
          if (c && c.finish_reason) finish = c.finish_reason;
          if (j.usage) usage = { input: j.usage.prompt_tokens || 0, output: j.usage.completion_tokens || 0 };
        }
      }
      return { usage, finish, model, any };
    }
  };
}
