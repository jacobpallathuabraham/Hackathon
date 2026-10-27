/* ERLY AI Reading Companion — Layer 4: the language-model adapter.

   The conversation flow, the signals and every safety rule live in Layers
   1–3 and are deterministic. A language model may only do two narrow jobs:
     1. understand a free-text answer   -> pick intents from an ALLOWED list
     2. acknowledge the answer          -> one short, warm sentence shown before
                                           the next (rule-chosen) question
   It never sees telemetry, never sees identifiers, cannot change a measured
   value, cannot skip consent and cannot add a diagnosis. Its output is
   validated; anything outside the contract is thrown away and the rule-based
   text is used instead.

   Providers
   - "demo" (default): rule-based, runs in the browser, no network. Its replies
     are labelled as simulated in the UI.
   - "endpoint": POSTs to a server you run (see server/llm-proxy.mjs), which
     holds the API key. Used ONLY after the student turns on the separate
     "external AI" consent. Nothing is sent before that.

   Configure with window.ERLY_AI_CONFIG = { endpoint: 'https://…/api/companion' }
   (assets/js/companion/config.js). API keys never belong in this file. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_LLM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const BANNED = /dyslexi|adhd|attention[- ]deficit|disorder|diagnos|disabilit|dyscalcul|dysgraph|autis|probabilit|likelihood|\b\d{1,3}\s?%|عسر القراءة|اضطراب|تشخيص|إعاقة/i;
  const MAX_ANSWER = 600;

  // strip things that could identify the student before anything leaves the device
  function redact(text) {
    return String(text || '')
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
      .replace(/\+?\d[\d\s-]{7,}\d/g, '[number]')
      .replace(/\b\d{6,}\b/g, '[number]')
      .slice(0, MAX_ANSWER);
  }

  function validate(out, allowed) {
    if (!out || typeof out !== 'object') return null;
    const intents = Array.isArray(out.intents) ? out.intents.filter(i => typeof i === 'string' && allowed.includes(i)).slice(0, 4) : [];
    let ack = typeof out.ack === 'string' ? out.ack.trim() : '';
    if (!ack || ack.length > 200 || BANNED.test(ack) || /<[^>]+>|https?:|[?؟]/.test(ack)) ack = ''; // no links, no markup, no extra questions
    return { intents, ack };
  }

  function demoProvider() {
    return { id: 'demo', simulated: true, external: false, async interpret() { return { intents: [], ack: '' }; } };
  }

  function endpointProvider(url, opts) {
    opts = opts || {};
    const timeoutMs = opts.timeoutMs || 8000;
    const fetchFn = opts.fetch || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    return {
      id: 'endpoint', simulated: false, external: true, url,
      // payload = exactly what is listed in the consent card: the question text,
      // the student's (redacted) answer, the allowed intents and the UI language.
      payloadFor(req) { return { question: String(req.question || '').slice(0, 400), answer: redact(req.answer), allowed: req.allowed, lang: req.lang === 'ar' ? 'ar' : 'en' }; },
      async interpret(req) {
        if (!fetchFn) throw new Error('no-fetch');
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const t = setTimeout(() => ctrl && ctrl.abort(), timeoutMs);
        try {
          const r = await fetchFn(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(this.payloadFor(req)), signal: ctrl ? ctrl.signal : undefined, credentials: 'omit' });
          if (!r.ok) throw new Error('http-' + r.status);
          return await r.json();
        } finally { clearTimeout(t); }
      }
    };
  }

  // The adapter the UI talks to. getConsent() is checked on EVERY call.
  function create(cfg) {
    cfg = cfg || {};
    const demo = demoProvider();
    const ext = cfg.endpoint ? endpointProvider(cfg.endpoint, cfg) : null;
    let lastError = null;
    return {
      configured: !!ext,
      endpoint: cfg.endpoint || null,
      active() { return ext && cfg.getConsent && cfg.getConsent() ? ext : demo; },
      lastError: () => lastError,
      async interpret(req) {
        const p = this.active();
        if (!p.external) return { intents: [], ack: '', source: 'rules', simulated: true };
        try {
          const v = validate(await p.interpret(req), req.allowed || []);
          lastError = null;
          if (!v) return { intents: [], ack: '', source: 'rules', fallback: 'invalid-output' };
          return Object.assign(v, { source: 'model' });
        } catch (e) {
          lastError = e && e.name === 'AbortError' ? 'timeout' : (e && e.message) || 'network';
          return { intents: [], ack: '', source: 'rules', fallback: lastError };
        }
      }
    };
  }
  return { create, validate, redact, BANNED };
});
