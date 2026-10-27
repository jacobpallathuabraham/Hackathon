/* ERLY — the site-wide analyser's reasoning (pure, unit-tested).

   Brings together independent sources of what ERLY observed, only from the
   student's consented activity:
     - Check-ins (ten activities, already scored with convergence rules)
     - the 28-day Support Pact tracker (100 indicators, own baseline)
     - lecture videos (rewinds to the same part, slowing playback, restarts,
       transcript use)
     - the Reading Studio (sessions with repeated reading friction)
   and turns them into a per-area evidence level:
     none · early · some · strong
   An area reaches "some" only when two independent sources agree (or one
   source is already strong), and "strong" needs more weight across two or
   more sources. One event, one video or one activity is never enough.
   This decides WHEN Noor gently offers help — it is not a diagnosis. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_EVIDENCE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const B = (en, ar) => [en, ar];

  /* ---------------- videos ---------------- */
  const VIDEO_CFG = { backSeekMinSec: 3, segmentSec: 30, repeatSameSegment: 3, windowMs: 10 * 60e3, ignoreFirstSec: 4 };
  // events: { t, type: 'seek'|'rate'|'restart'|'transcript'|'play'|'pause'|'end', from, to, rate }
  function videoFriction(events, cfg) {
    cfg = Object.assign({}, VIDEO_CFG, cfg || {});
    const backs = events.filter(e => e.type === 'seek' && e.from - e.to >= cfg.backSeekMinSec && e.from > cfg.ignoreFirstSec);
    const lastT = events.length ? events[events.length - 1].t : 0;
    const recent = backs.filter(e => lastT - e.t <= cfg.windowMs);
    const bySeg = {};
    recent.forEach(e => { const s = Math.floor(e.to / cfg.segmentSec); bySeg[s] = (bySeg[s] || 0) + 1; });
    const repeated = Object.keys(bySeg).filter(s => bySeg[s] >= cfg.repeatSameSegment).map(Number);
    const slowdowns = events.filter(e => e.type === 'rate' && e.rate < 1).length;
    const restarts = events.filter(e => e.type === 'restart').length;
    const transcript = events.filter(e => e.type === 'transcript').length;
    return {
      backSeeks: backs.length, recentBackSeeks: recent.length, bySegment: bySeg, repeatedSegments: repeated,
      segmentRange: repeated.length ? [repeated[0] * cfg.segmentSec, (repeated[0] + 1) * cfg.segmentSec] : null,
      slowdowns, restarts, transcript,
      friction: repeated.length > 0
    };
  }

  /* ---------------- the area profile ---------------- */
  const AREAS = {
    reading: B('Reading', 'القراءة'), listening: B('Listening & lectures', 'الاستماع والمحاضرات'), attention: B('Focus & organising', 'التركيز والتنظيم'),
    maths: B('Numbers & maths', 'الأرقام والرياضيات'), writing: B('Writing', 'الكتابة'), vision: B('Visual comfort', 'الراحة البصرية'),
    wellbeing: B('Stress & mood', 'التوتر والمزاج'), social: B('Communication & group work', 'التواصل والعمل الجماعي')
  };
  const CHECKIN_MAP = { reading: 'reading', auditory: 'listening', attention: 'attention', numbers: 'maths', writing: 'writing', visual: 'vision', testanxiety: 'wellbeing', stamina: 'wellbeing', social: 'social' };
  const W = { early: 1, moderate: 2, stronger: 3 };
  const TRACK_MAP = { reading: 'reading', executive: 'attention', strain: 'wellbeing' };

  // src = { checkins: [{id, level}], tracker: {available, areas}, video: {videosWithFriction, episodes, slowdowns, restarts, transcript}, reading: {frictionSessions} }
  function profile(src) {
    src = src || {};
    const out = {};
    Object.keys(AREAS).forEach(a => { out[a] = { area: a, name: AREAS[a], score: 0, sources: [], items: [], level: 'none' }; });
    const add = (area, source, w, en, ar) => { const o = out[area]; o.score += w; if (!o.sources.includes(source)) o.sources.push(source); o.items.push({ source, w, en, ar }); };
    (src.checkins || []).forEach(x => {
      const area = CHECKIN_MAP[x.id]; if (!area) return;
      add(area, 'checkins', W[x.level] || 1, `Check-ins: several measures pointed here (${x.level === 'stronger' ? 'stronger evidence' : x.level === 'moderate' ? 'some evidence' : 'early sign'})`, `الفحوصات: أشارت عدة مقاييس إلى هنا (${x.level === 'stronger' ? 'دلائل أقوى' : x.level === 'moderate' ? 'بعض الدلائل' : 'إشارة أولية'})`);
    });
    const tr = src.tracker || {};
    if (tr.available) (tr.areas || []).forEach(a => { const area = TRACK_MAP[a]; if (area) add(area, 'tracker', 2, '28-day tracking: stayed above your own normal across several domains', 'التتبّع لـ٢٨ يوماً: بقي فوق معدلك الطبيعي عبر عدة مجالات'); });
    const v = src.video || {};
    if (v.videosWithFriction >= 2) add('listening', 'video', 2, `Videos: you went back to the same part repeatedly in ${v.videosWithFriction} different videos`, `الفيديوهات: عدت إلى الجزء نفسه مراراً في ${v.videosWithFriction} فيديوهات مختلفة`);
    else if (v.episodes >= 1) add('listening', 'video', 1, 'Videos: you went back to the same part of a video several times', 'الفيديوهات: عدت إلى الجزء نفسه من فيديو عدة مرات');
    if (v.slowdowns >= 3) add('listening', 'video', 1, 'Videos: you often slowed the playback down', 'الفيديوهات: أبطأت التشغيل كثيراً');
    if (v.restarts >= 3) add('attention', 'video', 1, 'Videos: several videos were restarted from the beginning', 'الفيديوهات: أُعيد تشغيل عدة فيديوهات من البداية');
    const rd = src.reading || {};
    if (rd.frictionSessions >= 4) add('reading', 'studio', 2, `Reading Studio: repeated re-reading in ${rd.frictionSessions} sessions`, `استوديو القراءة: إعادة قراءة متكررة في ${rd.frictionSessions} جلسات`);
    else if (rd.frictionSessions >= 2) add('reading', 'studio', 1, `Reading Studio: repeated re-reading in ${rd.frictionSessions} sessions`, `استوديو القراءة: إعادة قراءة متكررة في ${rd.frictionSessions} جلسات`);
    Object.values(out).forEach(o => {
      const n = o.sources.length;
      o.level = (o.score >= 5 && n >= 2) ? 'strong' : ((o.score >= 3 && n >= 2) || o.score >= 3) ? 'some' : o.score >= 1 ? 'early' : 'none';
      if (o.level === 'some' && n < 2 && o.score < 3) o.level = 'early';
    });
    return out;
  }

  // Should Noor gently offer help now? One area at a time, never nagging.
  const DAY = 864e5;
  function shouldNotify(prof, state) {
    state = state || {};
    const now = state.now || Date.now();
    if (state.invitations === 'off') return null;
    if (now < (state.snoozeUntil || 0)) return null;
    const last = state.lastNotified || {}, done = state.interviewed || {};
    const rank = { strong: 2, some: 1 };
    const cands = Object.values(prof).filter(o => rank[o.level]).filter(o => now - (last[o.area] || 0) > 3 * DAY && now - (done[o.area] || 0) > 14 * DAY);
    cands.sort((a, b) => rank[b.level] - rank[a.level] || b.score - a.score);
    return cands[0] || null;
  }
  // map an evidence level onto the interview's objective input
  const toObjective = l => (l === 'strong' ? 'strong' : l === 'some' ? 'some' : l === 'early' ? 'early' : 'none');
  return { VIDEO_CFG, AREAS, videoFriction, profile, shouldNotify, toObjective };
});
