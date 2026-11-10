/* Noor — response validation (provider-independent).
   Before an answer is accepted it must (1) not be empty, (2) not contain provider/system error text, and
   (3) be about the LATEST question — not a previous topic and not a cached reply to something else.
   Lenient on purpose: short follow-ups ("why?", "and the second one?") and answers that legitimately use
   different words are accepted; only clear topic mismatches are rejected.
   UMD: window.ERLY_VALIDATE / CommonJS. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_VALIDATE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STOP = new Set('a an the of to in on for and or but is are was were be been do does did how what why when where who which that this these those it its with by from as at about into than then so if not no can could should would will may might i me my we our you your he she they them their there here please tell explain show give more some any all also very just like make made get got one two use used using work works way ways thing things about'.split(' '));
  const stem = w => (w.length > 4 ? w.replace(/ies$/, 'y').replace(/(ations?|ions?|ing|ed|es|ers?|ly|s)$/, '') : w);
  const words = s => String(s || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(stem);
  const PROVIDER_TEXT = /\b(rate limit|quota exceeded|too many requests|cooling down|free (ai )?service|api key|internal server error|upstream|RESOURCE_EXHAUSTED|status code \d{3}|error code|\bHTTP \d{3}\b)/i;
  const FOLLOW = /^(why|how|and|what about|so|then|ok|okay|more|again|continue|go on|explain (it|that|this)|example|simpler|harder|the (first|second|third|last) one|لماذا|كيف|ثم|المزيد)\b/i;
  // returns { ok, reason, score }
  function check(question, answer, previousQuestions = []) {
    const a = String(answer || '').trim();
    if (a.length < 2) return { ok: false, reason: 'empty', score: 0 };
    if (PROVIDER_TEXT.test(a) && !PROVIDER_TEXT.test(question)) return { ok: false, reason: 'provider-text', score: 0 };
    const q = words(question);
    const n = String(question).trim().split(/\s+/).length;
    if (q.length < 2 || n <= 3 || (FOLLOW.test(String(question).trim()) && n <= 5)) return { ok: true, reason: 'short-or-follow-up', score: 1 };
    const aw = new Set(words(a.slice(0, 4000)));
    const hit = q.filter(w => aw.has(w)).length / q.length;
    if (hit > 0) return { ok: true, reason: 'on-topic', score: hit };
    // nothing in common with the question: is it about an earlier question instead?
    const prev = previousQuestions.slice(-6).map(p => { const pw = words(p); return pw.length ? pw.filter(w => aw.has(w)).length / pw.length : 0; });
    if (Math.max(0, ...prev) >= 0.34) return { ok: false, reason: 'previous-topic', score: 0 };
    // long answers that share nothing with a specific question are treated as off-topic
    if (q.length >= 3 && a.length > 80) return { ok: false, reason: 'off-topic', score: 0 };
    return { ok: true, reason: 'uncertain', score: 0 };
  }
  return { check, words, PROVIDER_TEXT };
});
