/* ERLY AI Reading Companion — Layers 1 & 2: local event monitoring and the
   transparent signal engine.

   The reader reports small interaction events (which section is in view, zoom,
   horizontal pan, format changes, read-aloud). This module keeps them in
   memory for the current session only, turns them into reading-friction
   signals, and compares each one with the student's OWN baseline from earlier
   sessions — never with classmates.

   Rules built in here:
   - one event is never evidence: friction needs repetition inside a window;
   - intentional navigation (page buttons, read-aloud auto-scroll, the
     companion's own scrolling) and diagram inspection are excluded;
   - every threshold is a configurable starting value, NOT clinically
     validated, and is shown to the student;
   - read-aloud use is recorded but can never trigger an invitation;
   - a signal the reader cannot measure is reported as unavailable.

   Pure functions, no DOM: runs in the browser (window.ERLY_SIGNALS) and in
   Node for the unit tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_SIGNALS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Starting values, chosen to be cautious. Tune during testing.
  const DEFAULTS = {
    regression: {
      repeatsSameSection: 3,      // returns to the SAME section before it counts as repeated
      windowMs: 6 * 60e3,         // ...within this window
      minDwellAfterReturnMs: 1500, // a return only counts if the student stays to read
      intentionalWindowMs: 1800   // section changes this soon after an intentional jump are ignored
    },
    zoom: { adjustMin: 4, windowMs: 3 * 60e3, sustainedLevel: 1.4, sustainedMs: 2 * 60e3 },
    pan: { min: 6, windowMs: 3 * 60e3 },
    format: { min: 5, windowMs: 3 * 60e3 },
    baseline: { minSessions: 3, minSessionMs: 2 * 60e3, k: 1.5, sdFloor: 0.25, maxSessions: 12 },
    invite: { warmupMs: 60e3, cooldownMs: 8 * 60e3, maxPerSession: 2 }
  };

  function merge(base, over) {
    const out = {};
    Object.keys(base).forEach(k => {
      out[k] = (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]))
        ? merge(base[k], (over && over[k]) || {})
        : (over && typeof over[k] === 'number' && isFinite(over[k]) && over[k] >= 0 ? over[k] : base[k]);
    });
    return out;
  }
  const config = over => merge(DEFAULTS, over || {});

  /* ---------------- Layer 1: the in-memory session ---------------- */
  function createSession(now) {
    return {
      start: now, last: now,
      sectionsSeen: {},          // key -> { firstAt, index }
      current: null,             // { key, index, at, figure }
      leftSince: {},             // key -> true once the student moved on from it
      pendingReturn: null,       // { key, at } waiting for the dwell check
      returns: [],               // confirmed returns: { key, t }
      excluded: { intentional: 0, figure: 0, skim: 0 },
      intentUntil: 0,
      zoom: { level: 1, since: now, changes: [], excluded: 0, maxSustained: 0 },
      pans: [],
      formats: [],
      tts: { starts: 0, scopes: {} },
      invites: { count: 0, lastAt: -Infinity },
      ended: false
    };
  }

  // Record one interaction event. Returns the session (mutated) for chaining.
  function record(s, ev, cfg) {
    cfg = cfg || DEFAULTS;
    const t = ev.t;
    if (typeof t !== 'number' || s.ended) return s;
    s.last = Math.max(s.last, t);
    confirmPending(s, t, cfg);
    switch (ev.type) {
      case 'intent': // page button, read-aloud auto-scroll, companion scroll, search
        s.intentUntil = Math.max(s.intentUntil, t + cfg.regression.intentionalWindowMs);
        break;
      case 'section': {
        const prev = s.current;
        if (prev && prev.key === ev.key) break;
        if (prev) s.leftSince[prev.key] = true;
        const seen = s.sectionsSeen[ev.key];
        const isReturn = seen && s.leftSince[ev.key] && prev && ev.index < prev.index;
        if (isReturn) {
          if (ev.figure) s.excluded.figure++;
          else if (t < s.intentUntil || ev.cause === 'auto') s.excluded.intentional++;
          else s.pendingReturn = { key: ev.key, at: t };
        }
        if (!seen) s.sectionsSeen[ev.key] = { firstAt: t, index: ev.index };
        s.current = { key: ev.key, index: ev.index, at: t, figure: !!ev.figure };
        break;
      }
      case 'zoom': {
        trackSustained(s, t);
        if (ev.figure) { s.zoom.excluded++; }
        else if (ev.level !== s.zoom.level) s.zoom.changes.push({ t, level: ev.level });
        s.zoom.level = ev.level; s.zoom.since = t;
        break;
      }
      case 'pan': if (Math.abs(ev.dx || 0) >= 8) s.pans.push({ t }); break;
      case 'format': s.formats.push({ t, key: ev.key }); break;
      case 'tts': if (ev.action === 'start') { s.tts.starts++; s.tts.scopes[ev.scope || 'page'] = (s.tts.scopes[ev.scope || 'page'] || 0) + 1; } break;
      case 'tick': trackSustained(s, t); break;
      case 'end': trackSustained(s, t); s.ended = true; break;
      default: break;
    }
    return s;
  }
  function confirmPending(s, t, cfg) {
    const p = s.pendingReturn;
    if (!p) return;
    const stillThere = s.current && s.current.key === p.key;
    if (t - p.at >= cfg.regression.minDwellAfterReturnMs) {
      if (stillThere) s.returns.push({ key: p.key, t: p.at }); else s.excluded.skim++;
      s.pendingReturn = null;
    } else if (!stillThere) { s.excluded.skim++; s.pendingReturn = null; }
  }
  function trackSustained(s, t) {
    if (s.zoom.level > 1) s.zoom.maxSustained = Math.max(s.zoom.maxSustained, t - s.zoom.since);
  }

  /* ---------------- baseline: the student's own past sessions ---------------- */
  function minutes(s, now) { return Math.max(0, ((now != null ? now : s.last) - s.start) / 60e3); }
  function sessionSummary(s, now) {
    const m = Math.max(1, minutes(s, now));
    return {
      minutes: +minutes(s, now).toFixed(2),
      returnsPerMin: +(s.returns.length / m).toFixed(3),
      zoomPerMin: +(s.zoom.changes.length / m).toFixed(3),
      panPerMin: +(s.pans.length / m).toFixed(3),
      formatPerMin: +(s.formats.length / m).toFixed(3),
      ttsStarts: s.tts.starts
    };
  }
  function addToBaseline(baseline, summary, cfg) {
    cfg = cfg || DEFAULTS;
    const list = (baseline && baseline.sessions ? baseline.sessions.slice() : []);
    if (summary.minutes * 60e3 < cfg.baseline.minSessionMs) return { sessions: list }; // too short to learn from
    list.push(summary);
    return { sessions: list.slice(-cfg.baseline.maxSessions) };
  }
  function stats(baseline, key, cfg) {
    cfg = cfg || DEFAULTS;
    const xs = ((baseline && baseline.sessions) || []).map(x => x[key]).filter(v => typeof v === 'number' && isFinite(v));
    const n = xs.length;
    if (!n) return { n: 0, mean: null, sd: null, ready: false };
    const mean = xs.reduce((a, b) => a + b, 0) / n;
    const sd = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
    return { n, mean: +mean.toFixed(3), sd: +sd.toFixed(3), ready: n >= cfg.baseline.minSessions };
  }
  // 'above' | 'within' | 'no-baseline'
  function compare(value, st, cfg) {
    cfg = cfg || DEFAULTS;
    if (!st.ready) return 'no-baseline';
    const limit = st.mean + cfg.baseline.k * Math.max(st.sd, cfg.baseline.sdFloor);
    return value > limit ? 'above' : 'within';
  }

  /* ---------------- Layer 2: signals ---------------- */
  const inWindow = (arr, now, w) => arr.filter(x => now - x.t <= w);
  function evaluate(s, baseline, cfg, now, avail) {
    cfg = cfg || DEFAULTS; avail = avail || {};
    const sum = sessionSummary(s, now);
    const out = [];

    // A. scroll regressions — repeated returns to the same section
    const recent = inWindow(s.returns, now, cfg.regression.windowMs);
    const bySection = {};
    recent.forEach(r => { bySection[r.key] = (bySection[r.key] || 0) + 1; });
    const repeated = Object.keys(bySection).filter(k => bySection[k] >= cfg.regression.repeatsSameSection);
    const regSt = stats(baseline, 'returnsPerMin', cfg);
    const regCmp = compare(sum.returnsPerMin, regSt, cfg);
    out.push({
      id: 'regression', available: avail.regression !== false,
      value: s.returns.length, recent: recent.length, repeatedSections: repeated, bySection,
      threshold: `${cfg.regression.repeatsSameSection} returns to one section within ${Math.round(cfg.regression.windowMs / 60e3)} min`,
      baseline: regSt, compared: regCmp, rate: sum.returnsPerMin,
      excluded: Object.assign({}, s.excluded),
      friction: avail.regression !== false && repeated.length > 0 && regCmp !== 'within',
      provisional: regCmp === 'no-baseline'
    });

    // B. zoom and pan
    const zRecent = inWindow(s.zoom.changes, now, cfg.zoom.windowMs);
    const zSt = stats(baseline, 'zoomPerMin', cfg), zCmp = compare(sum.zoomPerMin, zSt, cfg);
    const sustainedNow = s.zoom.level >= cfg.zoom.sustainedLevel ? Math.max(s.zoom.maxSustained, now - s.zoom.since) : s.zoom.maxSustained;
    out.push({
      id: 'zoom', available: avail.zoom !== false,
      value: s.zoom.changes.length, recent: zRecent.length, level: s.zoom.level, excludedFigure: s.zoom.excluded,
      sustained: s.zoom.level >= cfg.zoom.sustainedLevel && sustainedNow >= cfg.zoom.sustainedMs,
      threshold: `${cfg.zoom.adjustMin} zoom changes within ${Math.round(cfg.zoom.windowMs / 60e3)} min (diagram zooming excluded)`,
      baseline: zSt, compared: zCmp, rate: sum.zoomPerMin,
      friction: avail.zoom !== false && zRecent.length >= cfg.zoom.adjustMin && zCmp !== 'within',
      provisional: zCmp === 'no-baseline'
    });
    const pRecent = inWindow(s.pans, now, cfg.pan.windowMs);
    const pSt = stats(baseline, 'panPerMin', cfg), pCmp = compare(sum.panPerMin, pSt, cfg);
    out.push({
      id: 'pan', available: avail.pan !== false, note: avail.panNote || null,
      value: s.pans.length, recent: pRecent.length,
      threshold: `${cfg.pan.min} horizontal pans within ${Math.round(cfg.pan.windowMs / 60e3)} min`,
      baseline: pSt, compared: pCmp, rate: sum.panPerMin,
      friction: avail.pan !== false && pRecent.length >= cfg.pan.min && pCmp !== 'within',
      provisional: pCmp === 'no-baseline'
    });

    // C. reading-format adjustments (exploring settings is normal — only repeated bursts count)
    const fRecent = inWindow(s.formats, now, cfg.format.windowMs);
    const fSt = stats(baseline, 'formatPerMin', cfg), fCmp = compare(sum.formatPerMin, fSt, cfg);
    out.push({
      id: 'format', available: avail.format !== false,
      value: s.formats.length, recent: fRecent.length,
      kinds: s.formats.reduce((o, f) => { o[f.key] = (o[f.key] || 0) + 1; return o; }, {}),
      threshold: `${cfg.format.min} format changes within ${Math.round(cfg.format.windowMs / 60e3)} min`,
      baseline: fSt, compared: fCmp, rate: sum.formatPerMin,
      friction: avail.format !== false && fRecent.length >= cfg.format.min && fCmp !== 'within',
      provisional: fCmp === 'no-baseline'
    });

    // D. read-aloud — an observation only, never friction
    out.push({ id: 'tts', available: avail.tts !== false, value: s.tts.starts, scopes: Object.assign({}, s.tts.scopes), friction: false, observationOnly: true });

    // E. session pattern
    out.push({ id: 'session', available: true, minutes: sum.minutes, sectionsVisited: Object.keys(s.sectionsSeen).length, sectionsRevisited: Object.keys(s.returns.reduce((o, r) => { o[r.key] = 1; return o; }, {})).length, friction: false, observationOnly: true });
    return out;
  }
  const FRICTION_IDS = ['regression', 'zoom', 'pan', 'format'];
  function persistentCount(signals) { return signals.filter(x => FRICTION_IDS.includes(x.id) && x.friction).length; }

  // Should the companion offer a gentle invitation now?
  function shouldInvite(s, signals, ctx, cfg) {
    cfg = cfg || DEFAULTS;
    const now = ctx.now;
    const no = reason => ({ invite: false, reason });
    if (!ctx.consent) return no('no-consent');
    if (ctx.paused) return no('paused');
    if (ctx.invitations === 'off') return no('invitations-off');
    if (ctx.conversationActive) return no('conversation-active');
    if (now < (ctx.snoozeUntil || 0)) return no('snoozed');
    if (now - s.start < cfg.invite.warmupMs) return no('warming-up');
    if (s.invites.count >= cfg.invite.maxPerSession) return no('max-per-session');
    if (now - s.invites.lastAt < cfg.invite.cooldownMs) return no('cooldown');
    const hit = signals.find(x => FRICTION_IDS.includes(x.id) && x.friction);
    if (!hit) return no('no-persistent-friction');
    return { invite: true, signal: hit.id, section: hit.id === 'regression' ? hit.repeatedSections[0] : null, multiple: persistentCount(signals) > 1 };
  }
  function noteInvite(s, now) { s.invites.count++; s.invites.lastAt = now; return s; }

  return { DEFAULTS, config, createSession, record, evaluate, sessionSummary, addToBaseline, stats, compare, shouldInvite, noteInvite, persistentCount, FRICTION_IDS };
});
