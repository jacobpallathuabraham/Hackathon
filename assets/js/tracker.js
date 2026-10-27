/* ERLY — the tracker.
   Nothing is recorded until the student signs a Support Pact. Then:
     days 1–14  the blind fortnight — ERLY only learns the student's own
                normal; every tool works, nothing is judged;
     days 15–28 watching — a day counts when an indicator is clearly above
                that normal.
   An insight appears only if 3+ of the 10 domains persist through the
   watched fortnight (the convergence rule). Raw values are deleted on day 28;
   only the summary stays. Indicators marked `live` come from the Reading
   Studio in real time; the rest are simulated (the LMS feed is roadmap). */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const AR = () => I18N.lang === 'ar';
  const { CATS, LIST, SIGNALS, AREAS } = window.ERLY_IND;
  const CK = Object.keys(CATS);
  const DAYS = 28, BLIND = 14, EXAM = [22, 23, 24];
  const KEY = 'erly-track-v2';
  const FLAG = LIST.filter(i => i.dir > 0);

  const fresh = () => ({
    status: 'none', start: null, day: 0, consent: Object.fromEntries(CK.map(k => [k, true])), pattern: 'reading',
    pact: { ally: 'Sara', note: '' }, blueprint: {}, exam: true, pause: 0, live: {}, days: [], summary: null,
    events: 0, ledger: {}, selfRef: false, helped: [], mode: 'demo', rdays: {}, pausedKeys: []
  });
  const RT = window.ERLY_REAL;
  const real = () => S.mode === 'real';
  const now = () => Date.now();
  const todayKey = () => RT.dateKey(now());
  const realPaused = () => real() && (S.pausedKeys || []).includes(todayKey());
  function bucket() { const k = todayKey(); return S.rdays[k] || (S.rdays[k] = { vals: {}, ck: null, events: 0 }); }
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { S = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const preview = {}; // live counts before consent — memory only, never saved
  const previewLedger = {};

  /* ---------- public API used by the Reading Studio ---------- */
  const LEDGER_OF = { V01: 'scroll', V04: 'line', V05: 'dwell', V02: 'zoom', V07: 'layout', V08: 'tts', U02: 'replay', U03: 'speed', M03: 'lookup', H01: 'tts', H07: 'tap', O07: 'summary', Q02: 'answer' };
  ERLY.track = (id, v = 1, mode = 'add') => {
    const on = ERLY.isTracking();
    const bag = on ? S.live : preview;
    bag[id] = mode === 'set' ? v : (bag[id] || 0) + v;
    if (on && real()) { const b = bucket(); b.vals[id] = mode === 'set' ? v : (b.vals[id] || 0) + v; b.events++; }
    const k = LEDGER_OF[id];
    if (k && mode === 'add') { const L = on ? S.ledger : previewLedger; L[k] = (L[k] || 0) + 1; }
    if (on) { S.events++; save(); }
    renderLive();
  };
  ERLY.liveValue = id => (S.status === 'active' ? (real() ? (S.rdays[todayKey()] || { vals: {} }).vals : S.live) : preview)[id] || 0;
  ERLY.isTracking = () => S.status === 'active' && !S.pause && !realPaused();
  ERLY.getTrack = () => ({ ...S, DAYS, BLIND, CATS, LIST });
  ERLY.helped = (tool, ok) => { S.helped.push({ tool, ok, day: S.day }); S.helped = S.helped.slice(-30); save(); };

  /* ---------- synthetic daily values (demo of the LMS feed) ---------- */
  function rnd(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const PATTERNS = {
    reading: { reading: .74, executive: .14, strain: .12, lang: [.72, .64], boost: ['M03', 'M07', 'M09', 'Q05', 'P01'] },
    language: { reading: .72, executive: .1, strain: .1, lang: [.74, .14], boost: ['M03', 'M07', 'M09'] },
    executive: { reading: .14, executive: .74, strain: .2, lang: [.2, .18] },
    strain: { reading: .64, executive: .7, strain: .82, lang: [.6, .58] },
    typical: { reading: .1, executive: .1, strain: .1, lang: [.12, .1] }
  };
  const PNAMES = { reading: ['Visual decoding (Profile A)', 'فك الرموز البصري (النمط أ)'], language: ['English-only reading load', 'عبء القراءة بالإنجليزية فقط'], executive: ['Executive friction (Profile B)', 'احتكاك تنفيذي (النمط ب)'], strain: ['Sudden strain everywhere (Profile C)', 'ضغط مفاجئ في كل شيء (النمط ج)'], typical: ['A typical month', 'شهر عادي'] };
  function genDay(n) {
    const r = rnd(4242 + n * 97 + Object.keys(PATTERNS).indexOf(S.pattern) * 13);
    const p = PATTERNS[S.pattern];
    const vals = {};
    const exam = S.exam && EXAM.includes(n);
    LIST.forEach(ind => {
      if (!S.consent[ind.cat] || ind.dir === 0) return;
      const base = 1 + r() * 0.4;
      let pHot = n > BLIND ? ((p.boost || []).includes(ind.id) ? .74 : (p[ind.area] || 0)) : 0;
      if (exam && ind.area !== 'reading') pHot = Math.min(1, pHot + .3); // exam weeks are heavier for everyone
      const hot = r() < pHot;
      vals[ind.id] = +(base * (hot ? 1.7 + r() * 1.3 : 0.85 + r() * 0.35)).toFixed(2);
    });
    return { n, vals, exam };
  }
  function baseline(id) {
    const b = S.days.slice(0, BLIND).map(d => d.vals[id]).filter(v => v != null);
    return b.length ? b.reduce((a, c) => a + c, 0) / b.length : null;
  }
  function flagged(ind, d) {
    if (d.n <= BLIND || d.paused || ind.dir === 0) return false;
    if (d.exam && S.exam && ind.area !== 'reading') return false; // Exam Mode: calendar-aligned spikes never count
    const v = d.vals[ind.id], b = baseline(ind.id);
    if (v == null || b == null) return false;
    return v > b * 1.45;
  }

  /* ---------- summary ---------- */
  function summarise() {
    const judged = S.days.filter(d => d.n > BLIND);
    const per = LIST.filter(i => S.consent[i.cat] && i.dir > 0).map(ind => {
      const up = judged.filter(d => flagged(ind, d)).length;
      return { id: ind.id, cat: ind.cat, area: ind.area, en: ind.en, ar: ind.ar, live: ind.live, up, frac: judged.length ? up / judged.length : 0 };
    });
    const cats = {};
    CK.forEach(c => { const inC = per.filter(p => p.cat === c); cats[c] = inC.length ? inC.reduce((x, p) => x + p.frac, 0) / inC.length : null; });
    const catsN = {};
    CK.forEach(c => { catsN[c] = cats[c] == null ? null : per.filter(p => p.cat === c && p.frac >= .5).length; });
    const dims = CK.filter(c => catsN[c] != null && catsN[c] >= 3); // a domain persists when 3+ of its indicators stayed above normal
    const areas = {};
    ['reading', 'executive', 'strain'].forEach(a => {
      const inA = per.filter(p => p.area === a);
      areas[a] = { n: inA.length, persistent: inA.filter(p => p.frac >= 0.5).length, score: inA.length ? inA.reduce((x, p) => x + p.frac, 0) / inA.length : 0 };
    });
    const pat = PATTERNS[S.pattern];
    const lang = { en: Math.min(1, areas.reading.score * (pat.lang[0] / Math.max(pat.lang[0], pat.lang[1]))), ar: Math.min(1, areas.reading.score * (pat.lang[1] / Math.max(pat.lang[0], pat.lang[1]))) };
    let flaggedAreas = ['reading', 'executive', 'strain'].filter(a => areas[a].persistent >= 3 && areas[a].score >= 0.35);
    const englishOnly = flaggedAreas.includes('reading') && lang.ar < lang.en / 1.6;
    if (englishOnly) flaggedAreas = flaggedAreas.map(a => a === 'reading' ? 'language' : a);
    const strong = dims.length >= 3 && flaggedAreas.length > 0;
    const crisis = strong && flaggedAreas.includes('strain') && dims.length >= 7;
    const signals = SIGNALS.map(s => { const ps = per.filter(p => s.ind.includes(p.id)); return { id: s.id, en: s.en, ar: s.ar, on: ps.filter(p => p.frac >= .5).length >= 2, score: ps.length ? ps.reduce((x, p) => x + p.frac, 0) / ps.length : 0 }; });
    const top3 = per.slice().sort((a, b) => b.frac - a.frac || a.id.localeCompare(b.id)).slice(0, 3);
    const daily = S.days.map(d => ({
      n: d.n, exam: !!d.exam, paused: !!d.paused,
      flags: FLAG.filter(i => S.consent[i.cat] && flagged(i, d)).length,
      byCat: Object.fromEntries(CK.map(c => [c, FLAG.filter(i => i.cat === c && S.consent[i.cat] && flagged(i, d)).length])),
      byArea: Object.fromEntries(['reading', 'executive', 'strain'].map(a => [a, FLAG.filter(i => i.area === a && S.consent[i.cat] && flagged(i, d)).length]))
    }));
    const fp = {
      lang: [['English pages', 'صفحات إنجليزية', lang.en], ['Arabic pages', 'صفحات عربية', lang.ar]],
      format: [['Dense PDFs', 'ملفات PDF كثيفة', Math.min(1, areas.reading.score * 1.15 + .05)], ['Slides', 'شرائح', areas.reading.score * .45 + .04]],
      time: [['Morning', 'صباحاً', .08 + areas.strain.score * .2], ['Afternoon', 'ظهراً', .1 + areas.reading.score * .25], ['Evening', 'مساءً', .12 + areas.reading.score * .45], ['After 11 pm', 'بعد ١١ مساءً', Math.min(1, .1 + Math.max(areas.reading.score, areas.strain.score) * .95)]],
      deadline: [['A week+ before', 'قبل أسبوع أو أكثر', .1 + areas.reading.score * .3], ['Last 24 hours', 'آخر ٢٤ ساعة', Math.min(1, .12 + areas.executive.score * 1.1)]]
    };
    return { per, cats, catsN, dims, areas, lang, flaggedAreas, englishOnly, strong, crisis, signals, top3, daily, fp, judged: judged.length };
  }

  /* ---------- actions ---------- */
  function start() {
    if (real()) {
      S.status = 'active'; S.start = new Date(now()).toISOString(); S.day = 1; S.days = []; S.summary = null; S.events = 0; S.pause = 0; S.rdays = {}; S.pausedKeys = []; S.live = {}; S.ledger = {};
      bucket(); save(); render(); ERLY.emit('track', ERLY.getTrack());
      ERLY.toast(T('Real tracking started. Day 1 is today — answer today’s check-in below.', 'بدأ التتبّع الحقيقي. اليوم هو اليوم الأول — أجب عن تسجيل اليوم أدناه.'));
      return;
    }
    S.status = 'active'; S.start = new Date().toISOString(); S.day = 0; S.days = []; S.summary = null; S.events = 0; S.pause = 0;
    Object.assign(S.live, preview); Object.assign(S.ledger, previewLedger);
    advance(1);
    ERLY.toast(T('Support Pact signed. The blind fortnight starts now — your tools work from today.', 'تم توقيع ميثاق الدعم. يبدأ الأسبوعان الأعميان الآن — أدواتك تعمل من اليوم.'));
  }
  function advance(k) {
    for (let i = 0; i < k && S.day < DAYS; i++) {
      S.day++;
      if (S.pause > 0) { S.pause--; S.days.push({ n: S.day, vals: {}, paused: true }); continue; }
      const d = genDay(S.day);
      LIST.filter(x => x.live && S.consent[x.cat] && S.live[x.id] && d.vals[x.id] != null).forEach(x => {
        if (S.day > BLIND) d.vals[x.id] = +(d.vals[x.id] + Math.min(2, S.live[x.id] * 0.15)).toFixed(2);
      });
      S.days.push(d);
      const add = (k2, n) => { S.ledger[k2] = (S.ledger[k2] || 0) + n; };
      const r = rnd(S.day * 31);
      add('scroll', 60 + Math.round(r() * 120)); add('session', 1 + Math.round(r() * 2)); add('submit', r() < .3 ? 1 : 0);
      add('draftDeleted', r() < (PATTERNS[S.pattern].executive) * .5 ? 1 : 0); add('late', r() < .35 ? 1 : 0);
      S.events += 70 + Math.round(r() * 90);
    }
    S.summary = summarise();
    if (S.day >= DAYS) {
      S.status = 'ended';
      S.days = S.days.map(d => ({ n: d.n, vals: {}, exam: d.exam, paused: d.paused }));
      S.live = {};
      ERLY.toast(T('Day 28 — tracking switched itself off. Raw data deleted.', 'اليوم ٢٨ — توقف التتبّع تلقائياً. حُذفت البيانات الخام.'));
    }
    save(); render(); ERLY.emit('track', ERLY.getTrack());
  }
  function stop() { const self = S.selfRef, md = S.mode; S = fresh(); S.selfRef = self; S.mode = md; S.status = 'stopped'; save(); render(); ERLY.emit('track', ERLY.getTrack()); ERLY.toast(T('Stopped. Everything was deleted.', 'توقف. حُذف كل شيء.')); }
  function reset() { const self = S.selfRef, md = S.mode; S = fresh(); S.selfRef = self; S.mode = md; save(); render(); ERLY.emit('track', ERLY.getTrack()); }
  function pause7() {
    if (real()) { const st = new Date(S.start).getTime(), d = RT.dayIndex(st, now()); for (let i = 0; i < 7; i++) { const k = RT.keyForDay(st, d + i); if (!S.pausedKeys.includes(k)) S.pausedKeys.push(k); } save(); render(); ERLY.emit('track', ERLY.getTrack()); ERLY.toast(T('Paused for 7 days. Nothing is recorded and these days never count.', 'تم الإيقاف ٧ أيام. لا يُسجَّل شيء ولا تُحتسب هذه الأيام.')); return; }
    S.pause = 7; save(); render(); ERLY.emit('track', ERLY.getTrack()); ERLY.toast(T('Paused for 7 days. Nothing is recorded until then.', 'تم الإيقاف المؤقت ٧ أيام. لن يُسجَّل شيء حتى ذلك الحين.')); }
  ERLY.on('trackDemo', pattern => { const keep = { blueprint: S.blueprint, pact: S.pact, selfRef: S.selfRef }; S = Object.assign(fresh(), keep); S.mode = 'demo'; S.pattern = pattern || 'reading'; S.status = 'active'; S.start = new Date().toISOString(); advance(DAYS); });
  ERLY.on('selfRef', () => { S.selfRef = true; save(); });
  ERLY.on('pactConfirm', ok => { S.pact.confirmed = ok; save(); });

  /* ---------- rendering ---------- */
  const box = $('#trackBox');
  const fmtDate = d => d.toLocaleDateString(AR() ? 'ar-AE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const catName = c => T(CATS[c].en, CATS[c].ar);
  const AREA_N = { reading: ['Visual decoding', 'فك الرموز البصري'], executive: ['Starting & finishing', 'البدء والإنجاز'], strain: ['Strain & endurance', 'الضغط والتحمّل'], language: ['Language load', 'عبء اللغة'] };
  const AREA_C = { reading: 'var(--c-R)', executive: 'var(--c-L)', strain: 'var(--c-W)', language: 'var(--c-T)' };
  ERLY.AREA_N = AREA_N; ERLY.AREA_C = AREA_C;
  const ALLIES = [['', 'Nobody yet', 'لا أحد بعد'], ['Sara', 'Sara · sister', 'سارة · أخت'], ['Mariam', 'Mariam · friend', 'مريم · صديقة'], ['Dr. Hessa', 'Dr. Hessa · advisor', 'د. حصة · مرشدة']];
  const BLUE = [
    ['learn', 'New material sinks in best when I…', 'تترسّخ المادة الجديدة أكثر عندما…', [['listen', 'hear it', 'أسمعها'], ['read', 'read it', 'أقرأها'], ['see', 'see it drawn', 'أراها مرسومة'], ['do', 'try it', 'أجرّبها']]],
    ['focus', 'I focus best in…', 'أركّز أفضل في…', [['sprint', 'short sprints', 'جولات قصيرة'], ['block', 'long blocks', 'فترات طويلة']]],
    ['stuck', 'When I’m stuck, I’d rather…', 'عندما أتعثّر، أفضّل…', [['example', 'see an example', 'رؤية مثال'], ['summary', 'get a summary', 'ملخصاً'], ['talk', 'talk it through', 'النقاش'], ['break', 'take a break', 'استراحة']]],
    ['time', 'My best study time is…', 'أفضل وقت للدراسة…', [['am', 'morning', 'الصباح'], ['pm', 'afternoon', 'الظهيرة'], ['eve', 'evening', 'المساء'], ['late', 'late night', 'آخر الليل']]]
  ];
  ERLY.BLUE = BLUE;

  function render() {
    if (!box) return;
    if (S.status === 'none' || S.status === 'stopped') return renderContract();
    if (real()) { realSync(); return renderReal(); }
    renderActive();
  }

  /* ---------- real tracking: one calendar day at a time ---------- */
  const startMs = () => new Date(S.start).getTime();
  function realDays(upto) {
    const out = [];
    for (let n = 1; n <= upto; n++) {
      const k = RT.keyForDay(startMs(), n), d = S.rdays[k];
      out.push({ n, key: k, vals: d ? d.vals : {}, ck: d ? d.ck : null, events: d ? d.events : 0, paused: (S.pausedKeys || []).includes(k) });
    }
    return out;
  }
  function realSummary(j) {
    const per = j.per.map(p => Object.assign({}, p, { live: !p.self }));
    const cats = {}, catsN = {};
    CK.forEach(c => { const inC = per.filter(p => p.cat === c && p.base != null); cats[c] = inC.length ? inC.reduce((x, p) => x + p.frac, 0) / inC.length : null; catsN[c] = inC.length && CATS[c].area !== 'support' ? inC.filter(p => p.persistent).length : null; });
    const dims = CK.filter(c => catsN[c]);
    const signals = SIGNALS.map(sg => { const ps = per.filter(p => sg.ind.includes(p.id)); return { id: sg.id, en: sg.en, ar: sg.ar, on: ps.filter(p => p.persistent).length >= 2, score: ps.length ? ps.reduce((x, p) => x + p.frac, 0) / ps.length : 0 }; });
    return {
      real: true, per, cats, catsN, dims, areas: j.areas, lang: { en: 0, ar: 0 }, englishOnly: false, flaggedAreas: j.flaggedAreas, strong: j.strong, crisis: j.crisis, signals,
      top3: per.slice().sort((a, b) => b.frac - a.frac).slice(0, 3), judged: j.watched, fp: { lang: [], format: [], time: [], deadline: [] },
      daily: j.daily.map(d => ({ n: d.n, exam: d.why === 'exam', paused: !!d.why, why: d.why, at: d.at, flags: d.flags, byCat: d.byCat, byArea: d.byArea })),
      baseline: j.baseline, watched: j.watched, excluded: j.excluded, insufficient: j.insufficient
    };
  }
  function realSync() {
    if (S.status !== 'active' || !real()) return;
    const d = RT.dayIndex(startMs(), now());
    if (d === S.day && S.summary) return;
    S.day = Math.min(DAYS, Math.max(1, d));
    S.summary = realSummary(RT.judge(realDays(S.day), LIST));
    if (d > DAYS) {
      S.status = 'ended'; S.day = DAYS;
      S.events = Object.values(S.rdays).reduce((a, b) => a + (b.events || 0), 0);
      S.rdays = {}; S.live = {}; // raw daily counts deleted — only the summary stays
      ERLY.toast(T('Day 28 is over — tracking switched itself off. Raw data deleted.', 'انتهى اليوم ٢٨ — توقف التتبّع تلقائياً. حُذفت البيانات الخام.'));
    }
    save(); ERLY.emit('track', ERLY.getTrack());
  }
  let ckDraft = null;
  const ckQ = RT.QUESTIONS;
  const hm = ms => { const m = Math.max(0, Math.round(ms / 6e4)); return (m >= 60 ? Math.floor(m / 60) + T('h ', ' س ') : '') + (m % 60) + T('m', ' د'); };
  const clock = iso => new Date(iso).toLocaleTimeString(AR() ? 'ar-AE' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  const ansLabel = (q, v) => q.type === 'range' ? v + ' h' : q.type === 'scale' ? v + '/5' : T(...q.opts.find(o => o[0] === v).slice(1));

  function checkinHTML() {
    const b = S.rdays[todayKey()];
    if (realPaused()) return `<div class="rck rck--done"><span class="rck__ic">${ICON('lock')}</span><div><b>${T('Paused today', 'متوقف مؤقتاً اليوم')}</b><p>${T('No check-in and no recording. Paused days never count.', 'لا تسجيل ولا قياس. الأيام المتوقفة لا تُحتسب أبداً.')}</p></div></div>`;
    if (b && b.ck) return `<div class="rck rck--done"><span class="rck__ic">${ICON('check')}</span><div><b>${T('Today’s check-in is locked in', 'تسجيل اليوم مُثبّت')}</b><p class="mono">${T('Answered at', 'أُجيب في')} ${clock(b.ck.at)} · ${T('took', 'استغرق')} ${b.ck.secs}s${RT.exclusion({ ck: b.ck }) ? ' · <em>' + T('today won’t be judged', 'لن يُحكم على اليوم') + ': ' + T(...RT.REASONS[RT.exclusion({ ck: b.ck })]) + '</em>' : ''}</p>
      <div class="rck__chips">${ckQ.map(q => `<span><small>${T(q.en, q.ar).replace(/\?$/, '')}</small><b>${ansLabel(q, b.ck[q.id])}</b></span>`).join('')}</div>
      <p class="small muted">${T('Strict mode: answers can’t be edited and missed days can’t be filled in later.', 'الوضع الصارم: لا يمكن تعديل الإجابات ولا تعبئة الأيام الفائتة لاحقاً.')}</p></div></div>`;
    if (!ckDraft) return `<div class="rck rck--open"><span class="rck__ic rck__ic--pulse">${ICON('calendar')}</span><div><b>${T('Today’s check-in · 8 quick questions', 'تسجيل اليوم · ٨ أسئلة سريعة')}</b><p>${T('About a minute. It is timed and stamped, and only today can be answered — that keeps the picture honest.', 'حوالي دقيقة. يُوقَّت ويُختم، ولا يمكن الإجابة إلا عن اليوم — هذا يُبقي الصورة صادقة.')}</p><button class="btn btn--accent btn--sm" data-ck="begin">${T('Start today’s check-in', 'ابدأ تسجيل اليوم')} →</button></div></div>`;
    const i = ckDraft.i;
    if (i >= ckQ.length) return `<div class="rck rck--step"><div class="rck__bar"><i style="width:100%"></i></div><b class="rck__q">${T('Lock in today’s answers?', 'تثبيت إجابات اليوم؟')}</b>
      <div class="rck__chips">${ckQ.map((q, k) => `<button data-ck="goto" data-i="${k}"><small>${T(q.en, q.ar).replace(/\?$/, '')}</small><b>${ansLabel(q, ckDraft.a[q.id])}</b></button>`).join('')}</div>
      <div class="row-btns"><button class="btn btn--accent btn--sm" data-ck="lock">${ICON('lock')} ${T('Lock in', 'ثبّت')}</button><span class="small muted mono" data-ck-timer></span></div></div>`;
    const q = ckQ[i], v = ckDraft.a[q.id];
    const body = q.type === 'range'
      ? `<div class="rck__range"><input type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${v != null ? v : q.def}" data-ck-range aria-label="${T(q.en, q.ar)}"><output class="mono">${v != null ? v : q.def} h</output></div><button class="btn btn--sm btn--accent" data-ck="next">${T('Next', 'التالي')} →</button>`
      : q.type === 'scale'
        ? `<div class="rck__scale">${[1, 2, 3, 4, 5].map(n => `<button data-ck="ans" data-v="${n}" class="${v === n ? 'is-on' : ''}" style="--k:${n}">${n}</button>`).join('')}</div><div class="rck__ends small muted"><span>${T(...q.lo)}</span><span>${T(...q.hi)}</span></div>`
        : `<div class="rck__opts">${q.opts.map(o => `<button data-ck="ans" data-v="${o[0]}" class="${v === o[0] ? 'is-on' : ''}">${T(o[1], o[2])}</button>`).join('')}</div>`;
    return `<div class="rck rck--step" style="--n:${i}"><div class="rck__bar"><i style="width:${i / ckQ.length * 100}%"></i></div>
      <div class="rck__head"><small class="mono">${i + 1} / ${ckQ.length}</small><span class="small muted mono" data-ck-timer></span>${i ? `<button class="link small" data-ck="back">← ${T('Back', 'رجوع')}</button>` : ''}</div>
      <b class="rck__q">${T(q.en, q.ar)}</b>${body}</div>`;
  }

  function calHTML(sum) {
    const st = startMs();
    return `<div class="rcal">${Array.from({ length: DAYS }, (_, i) => {
      const n = i + 1, k = RT.keyForDay(st, n), d = sum.daily.find(x => x.n === n), date = new Date(k + 'T12:00');
      const lbl = date.toLocaleDateString(AR() ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short' });
      let cls = 'is-future', tip = T('Not yet', 'لم يأتِ بعد');
      if (n === S.day && S.status === 'active') { cls = 'is-today'; tip = T('Today', 'اليوم'); }
      else if (d && n < S.day || d && S.status === 'ended') {
        if (d.why) { cls = 'is-out'; tip = T(...RT.REASONS[d.why]); }
        else if (n <= BLIND) { cls = 'is-base'; tip = T('Clean day · learning your normal', 'يوم نظيف · تعلّم معدلك'); }
        else { cls = 'is-watch'; tip = d.flags + ' ' + T('indicators above your normal', 'مؤشرات فوق معدلك'); }
      }
      return `<span class="rcal__d ${cls} ${n === BLIND + 1 ? 'is-split' : ''}" style="--i:${i};--f:${d && !d.why ? Math.min(1, d.flags / 4) : 0}" title="${T('Day', 'اليوم')} ${n} · ${lbl} · ${tip}"><b>${n}</b><small>${lbl}</small>${d && d.at ? `<em class="mono">${clock(d.at)}</em>` : ''}</span>`;
    }).join('')}</div>`;
  }

  function renderReal() {
    const sum = S.summary || realSummary(RT.judge(realDays(S.day), LIST));
    const ended = S.status === 'ended';
    const C = 2 * Math.PI * 52;
    const end = new Date(startMs() + DAYS * 864e5);
    const left = RT.msToMidnight(now());
    const phase = realPaused() ? T('Paused today', 'متوقف اليوم') : S.day <= BLIND ? T('Learning your normal', 'تعلّم معدلك') : T('Watching for persistence', 'مراقبة الاستمرار');
    const needB = Math.max(0, RT.MIN_BASE - sum.baseline);
    box.innerHTML = `
      <div class="live live--real">
        <div class="live__count">
          <svg viewBox="0 0 120 120" class="ring"><circle cx="60" cy="60" r="52" class="ring__bg"/><circle cx="60" cy="60" r="52" class="ring__fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - S.day / DAYS)}"/></svg>
          <div class="live__num"><b>${ended ? 0 : DAYS - S.day + 1}</b><span>${ended ? T('switched off', 'متوقف') : T('real days left', 'أيام حقيقية متبقية')}</span></div>
        </div>
        <div class="live__meta">
          <p class="contract__k mono"><span class="mode-badge mode-badge--real"><i></i>${T('Real tracking', 'تتبّع حقيقي')}</span> ${ended ? T('Ended automatically after day 28', 'انتهى تلقائياً بعد اليوم ٢٨') : T('Day', 'اليوم') + ' ' + S.day + ' / 28 · ' + phase}</p>
          <h3>${ended ? T('Done. It switched itself off.', 'انتهى. توقف من تلقاء نفسه.') : T('Ends on', 'ينتهي في') + ' ' + fmtDate(end)}</h3>
          ${ended ? `<p class="deleted">${ICON('trash')} ${S.events.toLocaleString('en-US')} ${T('raw events deleted from this device. Summary kept.', 'حدثاً خاماً حُذفت من هذا الجهاز. بقي الملخص.')}</p>` : `<p class="rnext mono">${ICON('timer')} ${T('Day', 'اليوم')} ${S.day + 1 > DAYS ? T('28 closes', '٢٨ يُغلق') : S.day + 1 + ' ' + T('opens', 'يبدأ')} ${T('at midnight · in', 'عند منتصف الليل · بعد')} <b data-rnext>${hm(left)}</b></p>`}
          <div class="rstat">
            <span><b>${sum.baseline}</b><small>${T('clean baseline days', 'أيام أساس نظيفة')}${needB ? ' · ' + T(`need ${needB} more`, `يلزم ${needB} أخرى`) : ' ✓'}</small></span>
            <span><b>${sum.watched}</b><small>${T('clean watched days', 'أيام مراقبة نظيفة')} · ${T('7+ needed', 'يلزم ٧+')}</small></span>
            <span><b>${sum.excluded.filter(e => e.n < S.day || ended).length}</b><small>${T('days excluded', 'أيام مستبعدة')}</small></span>
          </div>
          <div class="row-btns">${ended
            ? `<a href="#insight" class="btn btn--sm btn--accent">${T('See my insight', 'شاهد رؤيتي')}</a><button class="btn btn--sm btn--ghost" data-act="reset">${T('Start over', 'ابدأ من جديد')}</button>`
            : `<span class="strict-note">${ICON('lock')} ${T('Strict mode · no simulating, no fast-forward, no back-filling', 'وضع صارم · لا محاكاة ولا تقديم ولا تعبئة لاحقة')}</span><button class="btn btn--sm btn--ghost" data-act="pause" ${realPaused() ? 'disabled' : ''}>${T('Pause 7 days', 'إيقاف ٧ أيام')}</button><button class="btn btn--sm btn--stop" data-act="stop">${T('Stop & delete', 'أوقف واحذف')}</button>`}</div>
        </div>
        ${ended ? '' : `<div class="rck-wrap" id="rck">${checkinHTML()}</div>`}
        <div class="rcal-wrap"><div class="heat14__head"><p class="panel__h mono">${T('Your 28 real days', 'أيامك الثمانية والعشرون الحقيقية')}</p><span class="heat14__key small muted"><i class="rk rk--base"></i>${T('baseline', 'الأساس')}<i class="rk rk--watch"></i>${T('watched', 'مراقَب')}<i class="rk rk--out"></i>${T('excluded', 'مستبعد')}<i class="rk rk--today"></i>${T('today', 'اليوم')}</span></div>${calHTML(sum)}
          <p class="small muted">${T('A day is excluded when it was missed, paused, after under 6 hours of sleep, or unusual (ill, travel, a life event, an exam). Excluded days never count for or against you. Only things actually measured on this device and your own answers are used — nothing is simulated.', 'يُستبعد اليوم إذا فات أو كان متوقفاً أو بعد نوم أقل من ٦ ساعات أو كان غير عادي (مرض، سفر، حدث، امتحان). الأيام المستبعدة لا تُحتسب لك أو عليك. لا يُستخدم إلا ما قيس فعلاً على هذا الجهاز وإجاباتك — لا شيء محاكى.')}</p></div>
        ${ended ? realSumHTML(sum) : S.day > BLIND ? `<p class="rprov small">${ICON('eye')} ${T('Nothing is judged until day 28 is over — a pattern has to hold for the whole watched fortnight.', 'لا يُحكم على شيء قبل انتهاء اليوم ٢٨ — يجب أن يستمر النمط طوال أسبوعي المراقبة.')}</p>` : ''}
      </div>
      ${ledgerHTML()}
      ${liveHTML()}
      ${catalogueHTML(ended ? sum : null)}`;
    tickTimer();
  }

  function realSumHTML(sum) {
    const top = sum.per.filter(p => p.persistent).sort((a, b) => b.frac - a.frac);
    const msg = sum.insufficient === 'baseline' ? T('Not enough clean days to learn your normal, so nothing was judged. That is the strict rule working — you can start a new pact any time.', 'لا أيام نظيفة كافية لتعلّم معدلك، لذا لم يُحكم على شيء. هذه هي القاعدة الصارمة — يمكنك بدء ميثاق جديد في أي وقت.')
      : sum.insufficient === 'watch' ? T('Too few clean watched days to say anything either way.', 'أيام مراقبة نظيفة قليلة جداً للحكم بأي اتجاه.') : null;
    return `<div class="live__sum">
      <p class="panel__h mono">${T('Strict rule · an area needs 2+ indicators above your normal on half of 5+ clean days, at least one measured (not only self-report)', 'قاعدة صارمة · يحتاج المجال مؤشرين أو أكثر فوق معدلك في نصف ٥ أيام نظيفة أو أكثر، أحدها مقاس (لا تقرير ذاتي فقط)')}</p>
      ${['reading', 'executive', 'strain'].map(a => `<div class="sum-row" style="--c:${AREA_C[a]}"><span>${T(...AREA_N[a])}</span><span class="sum-row__bar"><i style="width:${Math.round(sum.areas[a].score * 100)}%"></i></span><b class="mono">${sum.areas[a].persistent}/${sum.areas[a].n} ${T('persistent', 'مستمر')}</b></div>`).join('')}
      ${top.length ? `<ul class="rtop">${top.map(p => `<li><span class="mono">${p.id}</span><b>${T(p.en, p.ar)}</b><em class="mono">${p.up}/${p.n} ${T('clean days', 'أيام نظيفة')}</em></li>`).join('')}</ul>` : ''}
      <div class="sum-verdict ${sum.strong ? 'is-strong' : ''} ${sum.crisis ? 'is-crisis' : ''}">
        <b>${msg || (sum.crisis ? T('Stress and low mood held on with everything else. Let’s get you a person, not a tool.', 'استمر التوتر وانخفاض المزاج مع كل شيء آخر. لنوصلك بإنسان، لا بأداة.') : sum.strong ? T('A pattern held through real, clean days — worth taking to SAS.', 'استمر نمط عبر أيام حقيقية نظيفة — يستحق أخذه إلى خدمات الطلبة.') : T('Nothing persisted strongly enough to flag.', 'لم يستمر شيء بما يكفي للتنبيه.'))}</b>
        <span>${T('Not a diagnosis. SAS confirms with a professional assessment.', 'ليس تشخيصاً. تؤكد خدمات الطلبة ذلك بتقييم مهني.')}</span>
        <a href="#handoff" class="btn btn--sm ${sum.strong ? 'btn--accent' : 'btn--ghost'}">${sum.crisis ? T('Talk to a counsellor', 'تحدّث مع مرشد') : sum.strong ? T('Take it to SAS', 'خذه إلى خدمات الطلبة') : T('Self-refer anyway', 'أحِل نفسك على أي حال')}</a>
      </div></div>`;
  }

  function tickTimer() {
    const el = $('[data-rnext]', box); if (el) el.textContent = hm(RT.msToMidnight(now()));
    $$('[data-ck-timer]', box).forEach(t => { if (ckDraft) { const s = Math.round((now() - ckDraft.t0) / 1000); t.textContent = '⏱ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); } });
  }
  setInterval(() => {
    if (!real() || S.status !== 'active') return;
    if (RT.dayIndex(startMs(), now()) !== S.day) { ckDraft = null; render(); } else tickTimer();
  }, 1000);
  function ckRender() { const w = $('#rck', box); if (w) { w.innerHTML = checkinHTML(); tickTimer(); } }
  function ckClick(btn) {
    const act = btn.dataset.ck;
    if (act === 'begin') ckDraft = { i: 0, a: {}, t0: now() };
    else if (act === 'ans') { const q = ckQ[ckDraft.i]; ckDraft.a[q.id] = q.type === 'scale' ? +btn.dataset.v : btn.dataset.v; btn.classList.add('is-on'); setTimeout(() => { ckDraft.i = ckDraft.back ? ckQ.length : ckDraft.i + 1; ckDraft.back = false; ckRender(); }, 220); return; }
    else if (act === 'next') { const q = ckQ[ckDraft.i]; const r = $('[data-ck-range]', box); ckDraft.a[q.id] = +r.value; ckDraft.i = ckDraft.back ? ckQ.length : ckDraft.i + 1; ckDraft.back = false; }
    else if (act === 'back') ckDraft.i = Math.max(0, ckDraft.i - 1);
    else if (act === 'goto') { ckDraft.i = +btn.dataset.i; ckDraft.back = true; }
    else if (act === 'lock') {
      if (S.rdays[todayKey()] && S.rdays[todayKey()].ck) { ckDraft = null; return render(); }
      const ck = Object.assign({}, ckDraft.a, { at: new Date(now()).toISOString(), secs: Math.max(1, Math.round((now() - ckDraft.t0) / 1000)) });
      if (!RT.validCheckin(ck)) return ERLY.toast(T('Please answer every question.', 'يُرجى الإجابة عن كل سؤال.'));
      bucket().ck = ck; ckDraft = null; S.summary = null; save(); render(); ERLY.emit('track', ERLY.getTrack());
      if (window.FUN && FUN.confetti) FUN.confetti($('#rck', box) || box, 40);
      return ERLY.toast(T('Locked in for today. See you tomorrow.', 'تم التثبيت لليوم. نراك غداً.'));
    }
    ckRender();
  }

  function renderContract() {
    const end = new Date(Date.now() + DAYS * 864e5);
    const bpDone = BLUE.filter(q => S.blueprint[q[0]]).length;
    box.innerHTML = `
      <div class="pact">
        <div class="pact__doc">
          <p class="contract__k mono">${S.status === 'stopped' ? T('Stopped · everything deleted', 'متوقف · حُذف كل شيء') : T('Support Pact · draft', 'ميثاق الدعم · مسودة')}</p>
          <h3>${T('Four weeks. Two to learn your normal, two to notice. Then it stops.', 'أربعة أسابيع. أسبوعان لتعلّم معدلك، وأسبوعان للملاحظة. ثم يتوقف.')}</h3>
          <ol class="pact__time">
            <li><b>${real() ? fmtDate(new Date()) : T('Days 1–14', 'الأيام ١–١٤')}</b><span>${T('Blind fortnight — ERLY only learns your normal. Your tools work from day one.', 'أسبوعان أعميان — يتعلّم إيرلي معدلك فقط. أدواتك تعمل من اليوم الأول.')}</span></li>
            <li><b>${T('Days 15–28', 'الأيام ١٥–٢٨')}</b><span>${T('Watching — a day counts only if it is clearly above your own normal.', 'المراقبة — يُحتسب اليوم فقط إن كان أعلى بوضوح من معدلك.')}</span></li>
            <li><b>${T('Insight', 'الرؤية')}</b><span>${T('Only if 3+ of 10 domains persist for the whole fortnight. You see it first.', 'فقط إن استمرت ٣ مجالات أو أكثر من ١٠ طوال الأسبوعين. أنت ترى ذلك أولاً.')}</span></li>
            <li><b>${fmtDate(end)}</b><span>${T('Ends automatically. Raw data deleted; you keep a one-page picture.', 'ينتهي تلقائياً. تُحذف البيانات الخام؛ وتحتفظ بصورة من صفحة واحدة.')}</span></li>
          </ol>
          <p class="pact__never">${ICON('lock')} ${T('Never collected: what you type, camera, eye-tracking, emotion AI, location, grades.', 'لا يُجمع أبداً: ما تكتبه، الكاميرا، تتبّع العين، تحليل المشاعر، الموقع، الدرجات.')}</p>
        </div>
        <div class="pact__steps">
          <div class="mode-switch" role="radiogroup" aria-label="${T('Tracking mode', 'وضع التتبّع')}">
            <button role="radio" aria-checked="${!real()}" class="mode-switch__o ${!real() ? 'is-on' : ''}" data-mode="demo"><span>${ICON('rocket')}</span><b>${T('Demo', 'عرض تجريبي')}</b><small>${T('Simulated LMS feed · watch 28 days in seconds', 'بيانات محاكاة · شاهد ٢٨ يوماً في ثوانٍ')}</small></button>
            <button role="radio" aria-checked="${real()}" class="mode-switch__o ${real() ? 'is-on' : ''}" data-mode="real"><span>${ICON('calendar')}</span><b>${T('Real tracking', 'تتبّع حقيقي')}</b><small>${T('One real day at a time · daily timed check-in · strict', 'يوم حقيقي في كل مرة · تسجيل يومي موقّت · صارم')}</small></button>
            <i class="mode-switch__pill" style="--pos:${real() ? 1 : 0}"></i>
          </div>
          ${real() ? `<div class="real-rules">${ICON('lock')}<div><b>${T('Strict mode — for an actual student', 'الوضع الصارم — لطالب حقيقي')}</b><ul>
            <li>${T('Day 1 is today. Days follow the real calendar — nothing can be simulated or skipped ahead.', 'اليوم الأول هو اليوم. تتبع الأيام التقويم الحقيقي — لا يمكن محاكاة شيء أو تخطّيه.')}</li>
            <li>${T('Each day: an 8-question check-in (sleep, mood, stress, study time, what was hard), timed and stamped. Only today can be answered.', 'كل يوم: تسجيل من ٨ أسئلة (النوم، المزاج، التوتر، وقت الدراسة، ما كان صعباً)، موقّت ومختوم. لا يُجاب إلا عن اليوم.')}</li>
            <li>${T('Only what this device actually measures in the Reading Studio, plus your answers, is used. LMS indicators are left out.', 'لا يُستخدم إلا ما يقيسه هذا الجهاز فعلاً في استوديو القراءة، مع إجاباتك. تُستبعد مؤشرات نظام التعلّم.')}</li>
            <li>${T('Missed, paused, short-sleep (< 6 h) and unusual days are excluded. A baseline needs 7+ clean days.', 'تُستبعد الأيام الفائتة والمتوقفة وقصيرة النوم (أقل من ٦ ساعات) وغير العادية. يحتاج الأساس ٧ أيام نظيفة أو أكثر.')}</li>
          </ul></div></div>` : ''}
          <section class="pstep">
            <header><span class="pstep__n">1</span><div><b>${T('What ERLY may notice', 'ما قد يلاحظه إيرلي')}</b><small>${T('10 domains · 100 indicators · metadata only', '١٠ مجالات · ١٠٠ مؤشر · بيانات وصفية فقط')}</small></div></header>
            <div class="dom-toggles">${CK.map(k => `<label class="dtog" style="--c:${CATS[k].color}"><input type="checkbox" data-cat="${k}" ${S.consent[k] ? 'checked' : ''}><span><i class="cat-ic cat-ic--sm">${ICON(CATS[k].icon)}</i>${catName(k)}</span></label>`).join('')}</div>
          </section>
          <section class="pstep">
            <header><span class="pstep__n">2</span><div><b>${T('Your Learning Blueprint', 'مخطط تعلّمك')}</b><small>${T('4 taps · used to choose support, never for detection', '٤ نقرات · لاختيار الدعم فقط، لا للكشف أبداً')} · ${bpDone}/4</small></div></header>
            ${BLUE.map(([k, en, ar, opts]) => `<div class="bp"><span>${T(en, ar)}</span><div class="bp__opts">${opts.map(([v, oe, oa]) => `<button class="bp__o ${S.blueprint[k] === v ? 'is-on' : ''}" data-bp="${k}" data-v="${v}">${T(oe, oa)}</button>`).join('')}</div></div>`).join('')}
          </section>
          <section class="pstep">
            <header><span class="pstep__n">3</span><div><b>${T('Who may be involved if a pattern persists', 'من قد يُشرك إن استمر نمط ما')}</b><small>${T('Revocable · expires end of semester · re-confirmed at the moment it matters', 'قابل للإلغاء · ينتهي بنهاية الفصل · يُعاد تأكيده عند الحاجة')}</small></div></header>
            <div class="bp__opts">${ALLIES.map(([v, en, ar]) => `<button class="bp__o ${(S.pact.ally || '') === v ? 'is-on' : ''}" data-ally="${v}">${T(en, ar)}</button>`).join('')}</div>
            <label class="switch-row"><span><b>${T('Exam Mode — sync my calendar', 'وضع الامتحانات — مزامنة تقويمي')}</b><small>${T('Exam-week spikes never count as a pattern', 'ارتفاعات أسابيع الامتحانات لا تُحتسب نمطاً أبداً')}</small></span><input type="checkbox" id="examMode" ${S.exam ? 'checked' : ''}><i></i></label>
          </section>
          ${real() ? '' : `<label class="field demo-pattern"><span class="mono">${T('Demo · synthetic pattern for the LMS signals', 'عرض · نمط اصطناعي لإشارات نظام التعلّم')}</span>
            <select id="pattern">${Object.entries(PNAMES).map(([v, n]) => `<option value="${v}" ${S.pattern === v ? 'selected' : ''}>${T(...n)}</option>`).join('')}</select></label>`}
          <label class="check-row"><input type="checkbox" id="agree"><span>${T('I understand, and I can pause, stop or delete everything at any time.', 'أفهم ذلك، ويمكنني الإيقاف المؤقت أو الإيقاف أو حذف كل شيء في أي وقت.')}</span></label>
          <button class="btn btn--accent btn--block" id="startTrack" disabled>${real() ? T('Sign the pact & start real tracking today', 'وقّع الميثاق وابدأ التتبّع الحقيقي اليوم') : T('Sign the pact & start', 'وقّع الميثاق وابدأ')}</button>
        </div>
      </div>
      ${ledgerHTML()}
      ${liveHTML()}
      ${catalogueHTML()}`;
  }

  function renderActive() {
    const sum = S.summary || summarise();
    const ended = S.status === 'ended';
    const C = 2 * Math.PI * 52;
    const end = new Date(new Date(S.start).getTime() + DAYS * 864e5);
    const maxFlags = Math.max(1, ...CK.map(c => Math.max(0, ...sum.daily.map(d => d.byCat[c] || 0))));
    const phase = S.pause ? T(`Paused · ${S.pause} days left`, `إيقاف مؤقت · ${S.pause} أيام متبقية`) : S.day <= BLIND ? T('Blind fortnight · learning your normal', 'الأسبوعان الأعميان · تعلّم معدلك') : T('Watching for persistence', 'مراقبة الاستمرار');
    box.innerHTML = `
      <div class="live">
        <div class="live__count">
          <svg viewBox="0 0 120 120" class="ring"><circle cx="60" cy="60" r="52" class="ring__bg"/><circle cx="60" cy="60" r="52" class="ring__fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - S.day / DAYS)}"/></svg>
          <div class="live__num"><b>${DAYS - S.day}</b><span>${ended ? T('switched off', 'متوقف') : T('days left', 'أيام متبقية')}</span></div>
        </div>
        <div class="live__meta">
          <p class="contract__k mono">${ended ? T('Ended automatically on day 28', 'انتهى تلقائياً في اليوم ٢٨') : T('Day', 'اليوم') + ' ' + S.day + ' / 28 · ' + phase}</p>
          <h3>${ended ? T('Done. It switched itself off.', 'انتهى. توقف من تلقاء نفسه.') : T('Ends on', 'ينتهي في') + ' ' + fmtDate(end)}</h3>
          <div class="phasebar"><i style="width:${S.day / DAYS * 100}%"></i><span style="left:50%"></span><em>${T('blind fortnight', 'الأسبوعان الأعميان')}</em><em>${T('watching', 'المراقبة')}</em></div>
          ${ended ? `<p class="deleted">${ICON('trash')} ${S.events.toLocaleString('en-US')} ${T('raw events deleted from this device. Summary kept.', 'حدثاً خاماً حُذفت من هذا الجهاز. بقي الملخص.')}</p>` : ''}
          <div class="row-btns">${ended
            ? `<a href="#insight" class="btn btn--sm btn--accent">${T('See my insight', 'شاهد رؤيتي')}</a><button class="btn btn--sm btn--ghost" data-act="reset">${T('Reset demo', 'أعد العرض')}</button>`
            : `<button class="btn btn--sm btn--ghost" data-act="next">${T('Simulate next day', 'حاكِ اليوم التالي')} ›</button><button class="btn btn--sm btn--ghost" data-act="ff">${T('Fast-forward to day 28', 'تقدّم إلى اليوم ٢٨')} »</button><button class="btn btn--sm btn--ghost" data-act="pause" ${S.pause ? 'disabled' : ''}>${T('Pause 7 days', 'إيقاف ٧ أيام')}</button><button class="btn btn--sm btn--stop" data-act="stop">${T('Stop & delete', 'أوقف واحذف')}</button>`}</div>
        </div>
        <div class="heat14">
          <div class="heat14__head"><p class="panel__h mono">${T('Indicators above your normal · by domain and day', 'مؤشرات فوق معدلك · حسب المجال واليوم')}</p><span class="heat14__key small muted"><i class="hc14 hc14--cal"></i>${T('blind fortnight', 'الأسبوعان الأعميان')}<i class="hc14 hc14--exam"></i>${T('exam week', 'أسبوع امتحانات')}<i class="hc14 hc14--paused"></i>${T('paused', 'متوقف مؤقتاً')}</span></div>
          <div class="heat14__grid" style="--days:${DAYS}">
            <span></span>${Array.from({ length: DAYS }, (_, i) => `<span class="heat14__d mono">${(i + 1) % 7 === 1 || i === DAYS - 1 ? i + 1 : ''}</span>`).join('')}
            ${CK.map(c => `<span class="heat14__l"><i class="cat-ic cat-ic--sm" style="--c:${CATS[c].color}">${ICON(CATS[c].icon)}</i>${catName(c)}</span>${Array.from({ length: DAYS }, (_, i) => {
              const d = sum.daily[i];
              if (!S.consent[c]) return '<span class="hc14 hc14--off"></span>';
              if (!d) return '<span class="hc14 hc14--future"></span>';
              if (d.paused) return '<span class="hc14 hc14--paused"></span>';
              if (d.n <= BLIND) return '<span class="hc14 hc14--cal"></span>';
              if (CATS[c].area === 'support') return '<span class="hc14 hc14--off" title="' + T('informs support, never flags', 'يوجّه الدعم ولا ينبّه أبداً') + '"></span>';
              const v = (d.byCat[c] || 0) / maxFlags;
              return `<span class="hc14 ${d.exam && S.exam ? 'is-exam' : ''}" style="--c:var(--accent);--v:${v.toFixed(2)}" title="${T('Day', 'اليوم')} ${d.n}: ${d.byCat[c] || 0} ${T('above normal', 'فوق المعدل')}${d.exam && S.exam ? ' · ' + T('Exam Mode', 'وضع الامتحانات') : ''}"></span>`;
            }).join('')}`).join('')}
          </div>
        </div>
        ${ended ? summaryHTML(sum) : ''}
      </div>
      ${ledgerHTML()}
      ${liveHTML()}
      ${catalogueHTML(sum)}`;
  }

  function summaryHTML(sum) {
    const ally = S.pact.ally;
    return `<div class="live__sum">
      <p class="panel__h mono">${T('Convergence rule · domains where 3+ indicators persisted through days 15–28', 'قاعدة التقارب · مجالات استمر فيها ٣ مؤشرات أو أكثر في الأيام ١٥–٢٨')}</p>
      <div class="conv"><div class="conv__dots">${CK.map(c => `<span class="${sum.dims.includes(c) ? 'is-on' : ''} ${CATS[c].area === 'support' ? 'is-na' : ''}" title="${catName(c)}">${ICON(CATS[c].icon)}</span>`).join('')}</div><b>${sum.dims.length}<small>/10</small></b><span>${T('need 3+ for an insight', 'يلزم ٣ أو أكثر للرؤية')}</span></div>
      <div class="sig4">${sum.signals.map(s => `<div class="sig4__c ${s.on ? 'is-on' : ''}"><small class="mono">${s.id}</small><b>${T(s.en, s.ar)}</b><span>${s.on ? T('persisted', 'استمر') : T('steady', 'مستقر')}</span></div>`).join('')}</div>
      ${['reading', 'executive', 'strain'].map(a => `<div class="sum-row" style="--c:${AREA_C[a]}"><span>${T(...AREA_N[a])}</span><span class="sum-row__bar"><i style="width:${Math.round(sum.areas[a].score * 100)}%"></i></span><b class="mono">${sum.areas[a].persistent}/${sum.areas[a].n} ${T('persistent', 'مستمر')}</b></div>`).join('')}
      <div class="sum-verdict ${sum.strong ? 'is-strong' : ''} ${sum.crisis ? 'is-crisis' : ''}">
        <b>${sum.crisis ? T('A sudden drop across almost everything. Let’s get you a person, not a tool.', 'تراجع مفاجئ في كل شيء تقريباً. لنوصلك بإنسان، لا بأداة.') : sum.strong ? T('Evidence strong enough to justify a referral.', 'أدلة كافية لتبرير الإحالة.') : T('Nothing persisted strongly enough to flag.', 'لم يستمر شيء بما يكفي للتنبيه.')}</b>
        <span>${sum.crisis ? T('ERLY never suggests tools here. A counsellor can talk today — confidentially.', 'لا يقترح إيرلي أدوات هنا. يمكن لمرشد التحدث اليوم — بسرية.') : sum.strong ? T('Not a diagnosis. SAS confirms with a professional assessment.', 'ليس تشخيصاً. تؤكد خدمات الطلبة ذلك بتقييم مهني.') : T('Your tools stay, and self-referral stays open.', 'تبقى أدواتك، ويبقى باب الإحالة الذاتية مفتوحاً.')}</span>
        <a href="#handoff" class="btn btn--sm ${sum.strong ? 'btn--accent' : 'btn--ghost'}">${sum.crisis ? T('Talk to a counsellor', 'تحدّث مع مرشد') : sum.strong ? T('Take it to SAS', 'خذه إلى خدمات الطلبة') : T('Self-refer anyway', 'أحِل نفسك على أي حال')}</a>
      </div>
      ${sum.strong && ally ? `<div class="pact-confirm" id="pactConfirm"><span>${ICON('users')}</span><p>${T(`Your Support Pact names <b>${ally}</b>. Is it still OK to involve them?`, `ميثاق الدعم يذكر <b>${ally}</b>. هل ما زال مناسباً إشراكه؟`)}</p><div class="row-btns"><button class="btn btn--xs btn--accent" data-pact="1">${T('Yes, invite', 'نعم، ادعُ')}</button><button class="btn btn--xs btn--ghost" data-pact="0">${T('Not now', 'ليس الآن')}</button></div></div>` : ''}
    </div>`;
  }

  function ledgerHTML() {
    const L = S.status === 'active' || S.status === 'ended' ? S.ledger : previewLedger;
    const rows = [['scroll', 'scroll events', 'أحداث تمرير'], ['session', 'study sessions', 'جلسات دراسة'], ['dwell', 'paragraph timings', 'توقيتات فقرات'], ['tts', 'read-aloud starts', 'تشغيل القراءة الصوتية'], ['replay', 'paragraph replays', 'إعادة تشغيل فقرات'], ['lookup', 'glossary look-ups', 'بحث في المسرد'], ['layout', 'font & spacing changes', 'تغييرات الخط والتباعد'], ['draftDeleted', 'deleted drafts (count only)', 'مسودات محذوفة (عدد فقط)'], ['submit', 'submissions (timestamps)', 'تسليمات (توقيت فقط)'], ['late', 'late-night sessions', 'جلسات ليلية']];
    return `<div class="ledger">
      <div class="ledger__head"><div><p class="panel__h mono">${T('Privacy Ledger · what ERLY saw', 'سجل الخصوصية · ما رآه إيرلي')}</p><small class="muted">${T('Counts only — no text, no content, ever.', 'أعداد فقط — لا نصوص ولا محتوى أبداً.')}</small></div>
        <div class="row-btns">${S.status === 'active' ? `<button class="btn btn--xs btn--ghost" data-act="pause" ${S.pause ? 'disabled' : ''}>${T('Pause 7 days', 'إيقاف ٧ أيام')}</button>` : ''}<button class="btn btn--xs btn--stop" data-act="stop">${T('Delete everything', 'احذف كل شيء')}</button></div></div>
      <div class="ledger__grid">${rows.map(([k, en, ar]) => `<div><b class="mono">${(L[k] || 0).toLocaleString('en-US')}</b><span>${T(en, ar)}</span></div>`).join('')}</div>
    </div>`;
  }

  function liveHTML() {
    const live = LIST.filter(i => i.live);
    const tracking = ERLY.isTracking();
    return `<div class="livefeed" id="liveFeed">
      <div class="livefeed__head"><p class="panel__h mono">${T('Live from your Reading Studio', 'مباشر من استوديو القراءة')}</p>
        <span class="livefeed__st ${tracking ? 'is-on' : ''}"><i></i>${tracking ? T('recording on this device', 'يُسجَّل على هذا الجهاز') : S.status === 'ended' ? T('tracking ended — preview only, nothing is saved', 'انتهى التتبّع — معاينة فقط، لا يُحفظ شيء') : S.pause ? T('paused — nothing is recorded', 'متوقف مؤقتاً — لا يُسجَّل شيء') : T('preview only — nothing saved until you sign', 'معاينة فقط — لا يُحفظ شيء حتى توقّع')}</span>
        <button class="btn btn--xs btn--ghost" data-studio>${T('Open the Reading Studio', 'افتح استوديو القراءة')}</button></div>
      <div class="livefeed__grid">${live.map(i => `<div class="lf" data-id="${i.id}"><b class="mono" data-lv="${i.id}">${fmtLive(i)}</b><span>${T(i.en, i.ar)}</span><small class="mono">${i.id} · ${i.tag}</small></div>`).join('')}</div>
    </div>`;
  }
  function fmtLive(i) { const v = ERLY.liveValue(i.id); if (!v) return '—'; return i.id === 'V05' ? v.toFixed(1) + '×' : ['V08', 'M09', 'H03', 'P07'].includes(i.id) ? Math.round(v) + 's' : i.id === 'H10' ? v : Math.round(v); }
  function renderLive() { $$('[data-lv]').forEach(el => { const i = LIST.find(x => x.id === el.dataset.lv); const t = String(fmtLive(i)); if (el.textContent !== t) { el.textContent = t; el.parentElement.classList.remove('bump'); void el.offsetWidth; el.parentElement.classList.add('bump'); } }); }

  const openCats = new Set(['V']);
  function catalogueHTML(sum) {
    const per = sum ? Object.fromEntries(sum.per.map(p => [p.id, p])) : {};
    const ART = window.ERLY_ART || { A: {}, RELATES: {} };
    return `<div class="catalogue">
      <div class="catalogue__head"><h3>${T('The 100-point telemetry matrix', 'مصفوفة القياس ذات المئة مؤشر')}</h3><span class="small muted">${T('10 domains × 10 indicators · metadata only · live = measured in this demo', '١٠ مجالات × ١٠ مؤشرات · بيانات وصفية فقط · مباشر = يُقاس في هذا العرض')}</span></div>
      <div class="catalogue__grid catalogue__grid--cols">${[0, 1].map(colI => `<div class="catalogue__col">${CK.map((k, ci) => ci % 2 !== colI ? '' : (() => { const c = CATS[k], open = openCats.has(k), rel = ART.RELATES[k] || ['', '', ''], n = sum && sum.catsN[k] != null ? sum.catsN[k] : null; return `<div class="catg ${open ? 'is-open' : ''} ${sum && sum.dims.includes(k) ? 'is-hot' : ''}" data-catg="${k}" style="--c:${c.color};--ci:${ci}">
        <button class="catg__head" aria-expanded="${open}" aria-controls="catg-${k}">
          <span class="catg__art">${ART.A[k] || ICON(c.icon)}</span>
          <span class="catg__title"><b>${catName(k)}</b><small>${rel[0] === 'Support' ? T('Support · never flags', 'دعم · لا ينبّه أبداً') : T(rel[0], rel[0].replace('Profile', 'النمط').replace('A', 'أ').replace('B', 'ب').replace('C', 'ج'))}</small></span>
          ${n != null ? `<span class="catg__score mono ${sum.dims.includes(k) ? 'is-on' : ''}" title="${T('indicators that persisted', 'مؤشرات استمرت')}">${n}/10</span>` : `<span class="catg__score mono">10</span>`}
          ${!S.consent[k] && S.status === 'active' ? `<span class="catg__off">${T('off', 'متوقف')}</span>` : ''}
          <span class="catg__chev"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <div class="catg__panel" id="catg-${k}" role="region"><div class="catg__inner">
          <div class="catg__banner"><span class="catg__big">${ART.A[k] || ''}</span><div><b>${T(rel[1], rel[2])}</b><small>${T('Friction, not a diagnosis — only SAS can confirm.', 'احتكاك لا تشخيص — خدمات الطلبة وحدها تؤكد.')}</small>${n != null ? `<span class="catg__meter">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'is-on' : ''}" style="--j:${i}"></i>`).join('')}<em class="mono">${n}/10 ${T('persisted', 'استمرت')}${n >= 3 ? ' · ' + T('domain persists', 'المجال مستمر') : ''}</em></span>` : ''}</div></div>
          <ul>${LIST.filter(x => x.cat === k).map((x, i) => { const p = per[x.id]; return `<li class="${p && p.frac >= .5 ? 'is-flag' : ''}" style="--i:${i}"><span class="mono catg__id">${x.id}</span><span class="catg__t"><b>${T(x.en, x.ar)}</b><small>${x.how}</small></span><span class="catg__m">${x.dir === 0 ? `<em class="honesty honesty--road">${x.area === 'control' ? T('control', 'ضابط') : T('support', 'دعم')}</em>` : x.live ? `<em class="honesty honesty--live">${T('live', 'مباشر')}</em>` : `<em class="honesty honesty--sim">${T('LMS · sim', 'نظام · محاكى')}</em>`}${p ? `<span class="catg__days" title="${p.up} / ${sum.judged}"><i style="--w:${Math.round(p.frac * 100)}%"></i></span><b class="mono">${p.up}/${sum.judged}</b>` : ''}</span></li>`; }).join('')}</ul>
        </div></div>
      </div>`; })()).join('')}</div>`).join('')}</div>
    </div>`;
  }

  box && box.addEventListener('input', e => { if (e.target.dataset.ckRange != null) e.target.nextElementSibling.textContent = e.target.value + ' h'; });
  box && box.addEventListener('change', e => {
    if (e.target.dataset.cat) { S.consent[e.target.dataset.cat] = e.target.checked; save(); }
    if (e.target.id === 'agree') $('#startTrack').disabled = !e.target.checked;
    if (e.target.id === 'pattern') { S.pattern = e.target.value; save(); }
    if (e.target.id === 'examMode') { S.exam = e.target.checked; save(); }
    if (e.target.dataset.ckRange != null) e.target.nextElementSibling.textContent = e.target.value + ' h';
  });
  box && box.addEventListener('click', e => {
    const head = e.target.closest('.catg__head');
    if (head) {
      const card = head.parentElement, k = card.dataset.catg, open = !card.classList.contains('is-open');
      card.classList.toggle('is-open', open); head.setAttribute('aria-expanded', open);
      open ? openCats.add(k) : openCats.delete(k);
      if (open) setTimeout(() => { const r = card.getBoundingClientRect(); if (r.bottom > innerHeight) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 380);
      return;
    }
    if (e.target.id === 'startTrack') return start();
    const bp = e.target.closest('[data-bp]');
    if (bp) { S.blueprint[bp.dataset.bp] = bp.dataset.v; save(); $$(`[data-bp="${bp.dataset.bp}"]`, box).forEach(b => b.classList.toggle('is-on', b === bp)); const n = BLUE.filter(q => S.blueprint[q[0]]).length; const sm = bp.closest('.pstep').querySelector('small'); sm.textContent = sm.textContent.replace(/\d\/4$/, n + '/4'); ERLY.emit('blueprint', S.blueprint); return; }
    const al = e.target.closest('[data-ally]');
    if (al) { S.pact.ally = al.dataset.ally; save(); $$('[data-ally]', box).forEach(b => b.classList.toggle('is-on', b === al)); ERLY.emit('pact', S.pact); return; }
    const pc = e.target.closest('[data-pact]');
    if (pc) { const ok = pc.dataset.pact === '1'; S.pact.confirmed = ok; save(); if (ok) track('H09'); $('#pactConfirm').innerHTML = `<span>${ICON('check')}</span><p>${ok ? T(`Done — ${S.pact.ally} gets the Support Playbook, never your data.`, `تم — يتلقى ${S.pact.ally} دليل الدعم، لا بياناتك أبداً.`) : T('No problem. Nobody was told anything.', 'لا مشكلة. لم يُخبر أحد بشيء.')}</p>`; ERLY.emit('pact', S.pact); return; }
    const ckb = e.target.closest('[data-ck]'); if (ckb) return ckClick(ckb);
    const md = e.target.closest('[data-mode]'); if (md) { S.mode = md.dataset.mode; save(); return render(); }
    const a = e.target.closest('[data-act]'); if (!a) return;
    ({ next: () => advance(1), ff: () => advance(DAYS), stop, reset, pause: pause7 })[a.dataset.act]();
  });
  const track = (id, v, m) => ERLY.track(id, v, m);

  I18N.onChange(render);
  render();
  setTimeout(() => ERLY.emit('track', ERLY.getTrack()), 0);
})();
