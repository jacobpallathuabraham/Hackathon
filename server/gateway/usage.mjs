// Noor gateway — central usage and rate-limit manager.
// Tracks requests, failures, quota/rate-limit responses and token usage per provider, per day (UTC),
// enforces configurable caps, and pauses a provider after a quota response until it resets — so the
// gateway never loops on an exhausted free quota. Counts live in memory (per server instance); on
// Cloudflare's free plan KV allows only 1,000 writes/day, so persisting every request is not possible.
// Limits are configuration, not assumptions about any provider's quota:
//   NOOR_DAILY_CAP        all requests per day through this gateway (default 1000)
//   NOOR_IP_PER_MINUTE    requests per minute per client IP (default 6)
//   NOOR_IP_PER_DAY       requests per day per client IP (default 60)
//   NOOR_<PROVIDER>_RPM / _RPD   optional per-provider caps (e.g. NOOR_GEMINI_RPD=250, NOOR_OPENROUTER_RPD=50)
const day = () => new Date().toISOString().slice(0, 10);

export class Usage {
  constructor(env = {}, now = () => Date.now()) { this.env = env; this.now = now; this.reset(); }
  reset() { this.day = day(); this.total = 0; this.providers = {}; this.ips = new Map(); this.events = []; }
  roll() { if (day() !== this.day) { const keepPause = this.providers; this.reset(); for (const [k, p] of Object.entries(keepPause)) if (p.pausedUntil > this.now()) this.p(k).pausedUntil = p.pausedUntil; } }
  p(name) { return this.providers[name] || (this.providers[name] = { requests: 0, ok: 0, failures: 0, quota: 0, rateLimited: 0, timeouts: 0, input: 0, output: 0, pausedUntil: 0, minute: [] }); }
  num(k, d) { const v = parseInt(this.env[k], 10); return Number.isFinite(v) && v >= 0 ? v : d; }

  // admission for one client request; returns null if allowed, or a code
  admit(ip) {
    this.roll();
    if (this.total >= this.num('NOOR_DAILY_CAP', 1000)) return 'quota';
    const t = this.now(), h = (this.ips.get(ip) || { day: 0, minute: [] });
    h.minute = h.minute.filter(x => t - x < 60000);
    if (h.minute.length >= this.num('NOOR_IP_PER_MINUTE', 6)) return 'rate_limited';
    if (h.day >= this.num('NOOR_IP_PER_DAY', 60)) return 'quota';
    h.minute.push(t); h.day++; this.ips.set(ip, h); if (this.ips.size > 20000) this.ips.clear();
    this.total++;
    return null;
  }
  // may this provider be tried now?
  available(name) {
    this.roll();
    const p = this.p(name), t = this.now(), up = name.toUpperCase().replace(/[^A-Z]/g, '_');
    if (p.pausedUntil > t) return false;
    p.minute = p.minute.filter(x => t - x < 60000);
    if (p.minute.length >= this.num(`NOOR_${up}_RPM`, Infinity)) return false;
    if (p.requests >= this.num(`NOOR_${up}_RPD`, Infinity)) return false;
    return true;
  }
  start(name) { const p = this.p(name); p.requests++; p.minute.push(this.now()); }
  success(name, usage) { const p = this.p(name); p.ok++; if (usage) { p.input += usage.input || 0; p.output += usage.output || 0; } }
  failure(name, err) {
    const p = this.p(name), code = err && err.code;
    p.failures++;
    if (code === 'quota') { p.quota++; p.pausedUntil = this.now() + (err.retryAfter > 0 ? err.retryAfter * 1000 : msToMidnightPT(this.now())); }
    else if (code === 'rate_limited') { p.rateLimited++; p.pausedUntil = this.now() + Math.min(120, Math.max(5, err.retryAfter || 20)) * 1000; }
    else if (code === 'timeout') p.timeouts++;
    this.events.push({ at: new Date(this.now()).toISOString(), provider: name, code }); if (this.events.length > 50) this.events.shift();
  }
  snapshot() {
    this.roll();
    const prov = {};
    for (const [k, p] of Object.entries(this.providers)) prov[k] = { requests: p.requests, ok: p.ok, failures: p.failures, quota: p.quota, rateLimited: p.rateLimited, timeouts: p.timeouts, tokens: { input: p.input, output: p.output }, paused: p.pausedUntil > this.now() ? new Date(p.pausedUntil).toISOString() : null };
    return { day: this.day, requests: this.total, dailyCap: this.num('NOOR_DAILY_CAP', 1000), providers: prov, recentFailures: this.events.slice(-10) };
  }
}
// Gemini's free requests-per-day reset at midnight Pacific time (https://aistudio.google.com/docs/rate-limits)
export function msToMidnightPT(now) {
  const d = new Date(now), pt = new Date(d.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const next = new Date(pt); next.setHours(24, 0, 0, 0);
  return Math.max(60000, next - pt);
}
