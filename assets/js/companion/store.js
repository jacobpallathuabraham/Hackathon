/* ERLY AI Reading Companion — local storage, consent and deletion.

   Everything stays on this device. What is kept (localStorage key
   "erly-companion-v1"):
     consent    — monitoring / microphone / external AI, each separate and revocable
     prefs      — invitations on/off, speaker muted, language of replies
     baseline   — per-session SUMMARY numbers only (rates, minutes); never raw
                  events, document text, keystrokes, audio or images
     lab        — Reading Lab ratings the student chose to save
     thresholds — optional overrides of the signal engine's starting values
     summaries  — student-edited summaries the student chose to keep
   Raw interaction events live in memory for the current session only.

   The storage backend is injectable so the unit tests can use a fake one. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_STORE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = 'erly-companion-v1';
  const blank = () => ({
    v: 1,
    consent: { monitoring: null, mic: null, llm: null },   // null = never asked, true/false = the student's answer
    prefs: { invitations: 'on', muted: false, voiceReplies: true },
    baseline: { sessions: [] },
    lab: null,
    thresholds: {},
    summaries: []
  });

  function memoryStorage() {
    const m = {};
    return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
  }
  function safeStorage() {
    try { const s = window.localStorage; const t = '__erly_t'; s.setItem(t, '1'); s.removeItem(t); return s; }
    catch (e) { return memoryStorage(); }
  }

  function create(storage) {
    storage = storage || (typeof window !== 'undefined' ? safeStorage() : memoryStorage());
    let data = load();
    function load() {
      try {
        const raw = storage.getItem(KEY);
        if (!raw) return blank();
        const d = JSON.parse(raw), b = blank();
        return {
          v: 1,
          consent: Object.assign(b.consent, d.consent),
          prefs: Object.assign(b.prefs, d.prefs),
          baseline: d.baseline && Array.isArray(d.baseline.sessions) ? d.baseline : b.baseline,
          lab: d.lab || null,
          thresholds: d.thresholds && typeof d.thresholds === 'object' ? d.thresholds : {},
          summaries: Array.isArray(d.summaries) ? d.summaries : []
        };
      } catch (e) { return blank(); }
    }
    function save() { try { storage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked: keep working in memory */ } }

    return {
      KEY,
      get: () => data,
      consent: k => data.consent[k] === true,
      asked: k => data.consent[k] !== null,
      setConsent(k, v) { data.consent[k] = !!v; if (k === 'monitoring' && !v) data.baseline = { sessions: [] }; save(); },
      prefs: () => data.prefs,
      setPref(k, v) { data.prefs[k] = v; save(); },
      baseline: () => data.baseline,
      setBaseline(b) { if (data.consent.monitoring) { data.baseline = b; save(); } },
      lab: () => data.lab,
      setLab(l) { data.lab = l; save(); },
      thresholds: () => data.thresholds,
      setThresholds(t) { data.thresholds = t || {}; save(); },
      summaries: () => data.summaries,
      keepSummary(s) { data.summaries.unshift(s); data.summaries = data.summaries.slice(0, 10); save(); },
      deleteSummary(id) { data.summaries = data.summaries.filter(s => s.id !== id); save(); },
      // delete the learned baseline + kept summaries, keep consent answers
      deleteHistory() { data.baseline = { sessions: [] }; data.summaries = []; data.lab = null; save(); },
      // forget everything, including consent answers
      deleteAll() { data = blank(); try { storage.removeItem(KEY); } catch (e) { /* ignore */ } },
      reload() { data = load(); return data; }
    };
  }
  return { create, KEY, memoryStorage };
});
