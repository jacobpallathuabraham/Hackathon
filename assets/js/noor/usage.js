/* Noor — usage and rate-limit manager (this device).
   Counts AI requests, successes, failures, rate-limit and quota responses, and tokens (when the gateway
   reports them) per provider per day, and research calls per source. Caps come from configuration
   (ERLY_AI_CONFIG.limits = { aiPerDay, aiPerMinute }) so a single device can't burn a shared free quota.
   Only counts are stored (localStorage "noor-usage-v1") — never questions, answers or keys. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_USAGE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = 'noor-usage-v1';
  function create(store, limits = {}, now = () => Date.now()) {
    const day = () => new Date(now()).toISOString().slice(0, 10);
    const load = () => { try { const d = JSON.parse(store.getItem(KEY) || 'null'); if (d && d.day === day()) return d; } catch (e) { /* blocked */ } return { day: day(), ai: {}, research: {}, minute: [] }; };
    let d = load();
    const save = () => { try { store.setItem(KEY, JSON.stringify(d)); } catch (e) { /* not persisted */ } };
    const roll = () => { if (d.day !== day()) d = { day: day(), ai: {}, research: {}, minute: [] }; };
    const p = n => d.ai[n] || (d.ai[n] = { requests: 0, ok: 0, failures: 0, rateLimited: 0, quota: 0, input: 0, output: 0 });
    const total = () => Object.values(d.ai).reduce((s, x) => s + x.requests, 0);
    return {
      // may the device send another AI request now? returns null or 'day' / 'minute'
      check() { roll(); const t = now(); d.minute = d.minute.filter(x => t - x < 60000); if (total() >= (limits.aiPerDay || 150)) return 'day'; if (d.minute.length >= (limits.aiPerMinute || 8)) return 'minute'; return null; },
      start(name) { roll(); p(name).requests++; d.minute.push(now()); save(); },
      ok(name, usage) { const x = p(name); x.ok++; if (usage) { x.input += usage.input || 0; x.output += usage.output || 0; } save(); },
      fail(name, code) { const x = p(name); x.failures++; if (code === 'rate_limited') x.rateLimited++; if (code === 'quota') x.quota++; save(); },
      research(source, status) { roll(); const r = d.research[source] || (d.research[source] = { ok: 0, failed: 0, rateLimited: 0, last: null }); if (status === 'ok') { r.ok++; r.last = new Date(now()).toISOString(); } else if (status === 'rate-limited') r.rateLimited++; else r.failed++; save(); },
      snapshot() { roll(); return JSON.parse(JSON.stringify(Object.assign({ limits: { aiPerDay: limits.aiPerDay || 150, aiPerMinute: limits.aiPerMinute || 8 }, total: total() }, d))); },
      reset() { d = { day: day(), ai: {}, research: {}, minute: [] }; save(); }
    };
  }
  return { create, KEY };
});
