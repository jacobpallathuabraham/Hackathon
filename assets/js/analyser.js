/* ERLY — the site-wide learning analyser (browser side).

   Collects consented activity from across the student site and keeps only
   small summaries on this device (localStorage "erly-analyser-v1"):
     - lecture videos: per video, how often the same part was replayed,
       slow-downs, restarts and notes/transcript use (from videos.js)
     - the Reading Studio: how many sessions had repeated re-reading
     - Check-ins and the 28-day tracker are read from their own stores
   Recording only happens when the student has agreed to noticing (Noor's
   consent card) or has an active Support Pact. Raw events stay in memory.

   Every 30 s it asks evidence.js whether one area has converging evidence and,
   if so (and not too recently), asks Noor to gently offer help.
   ERLY.analyser exposes the profile to Noor's "My profile" tab. */
(function () {
  'use strict';
  const E = window.ERLY_EVIDENCE;
  if (!E || !window.ERLY) return;
  const KEY = 'erly-analyser-v1';
  const blank = () => ({ videos: {}, reading: { frictionSessions: 0 }, notify: { lastNotified: {}, interviewed: {}, snoozeUntil: 0 }, interviews: {} });
  let D = blank();
  try { D = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* memory only */ } };

  const companion = () => ERLY.companion;
  function consented() {
    const c = companion();
    return !!((c && c.store && c.store.consent('monitoring')) || (ERLY.isTracking && ERLY.isTracking()));
  }
  function checkinSources() {
    try {
      const C = window.ERLY_CHECKS; if (!C) return [];
      const db = JSON.parse(localStorage.getItem('erly-checkins-v1') || '{}');
      const st = {}; C.DOMAINS.forEach(k => { st[k] = C.domainStatus((db.history || {})[k]); });
      return C.synthesize(st, tracker()).explore.map(x => ({ id: x.id, level: x.level }));
    } catch (e) { return []; }
  }
  function tracker() {
    try { const tr = ERLY.getTrack && ERLY.getTrack(); if (tr && tr.summary && tr.status === 'ended') return { available: true, areas: tr.summary.flaggedAreas || [] }; } catch (e) { /* none */ }
    return { available: false, areas: [] };
  }
  function videoSummary() {
    const vs = Object.values(D.videos);
    return { videosWithFriction: vs.filter(v => v.episodes > 0).length, episodes: vs.reduce((a, v) => a + (v.episodes || 0), 0), slowdowns: vs.reduce((a, v) => a + (v.slowdowns || 0), 0), restarts: vs.reduce((a, v) => a + (v.restarts || 0), 0), transcript: vs.reduce((a, v) => a + (v.transcript || 0), 0) };
  }
  function handwriting() { try { return JSON.parse(localStorage.getItem('erly-hand-v1') || 'null'); } catch (e) { return null; } }
  const profile = () => E.profile({ checkins: checkinSources(), tracker: tracker(), video: videoSummary(), reading: D.reading, handwriting: handwriting() });

  function check() {
    const c = companion();
    if (!c || !consented() || document.hidden) return;
    if (c.isOpen() || c.inCall) return; // never interrupt an open conversation
    const hit = E.shouldNotify(profile(), { now: Date.now(), invitations: c.store.prefs().invitations, snoozeUntil: D.notify.snoozeUntil, lastNotified: D.notify.lastNotified, interviewed: D.notify.interviewed });
    if (!hit) return;
    D.notify.lastNotified[hit.area] = Date.now(); save();
    ERLY.emit('companion:notify', { area: hit.area, level: hit.level, items: hit.items, name: hit.name });
  }
  setInterval(check, 30000);
  setTimeout(check, 8000);

  ERLY.analyser = {
    consented, profile, check,
    data: () => D,
    // videos.js reports one video's running stats (already summarised)
    noteVideo(id, stats) {
      if (!consented()) return;
      D.videos[id] = Object.assign(D.videos[id] || {}, stats, { at: Date.now() }); save();
    },
    noteReadingFriction() { if (!consented()) return; D.reading.frictionSessions = (D.reading.frictionSessions || 0) + 1; save(); },
    setInterviewed(area, result) { D.notify.interviewed[area] = Date.now(); D.interviews[area] = result; save(); },
    interviews: () => D.interviews,
    snooze(ms) { D.notify.snoozeUntil = Date.now() + ms; save(); },
    deleteAll() { D = blank(); try { localStorage.removeItem(KEY); localStorage.removeItem('erly-hand-v1'); } catch (e) { /* ignore */ } }
  };
})();
