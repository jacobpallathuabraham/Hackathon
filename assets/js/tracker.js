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
    events: 0, ledger: {}, selfRef: false, helped: []
  });
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { S = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const preview = {}; // live counts before consent — memory only, never saved
  const previewLedger = {};

  /* ---------- public API used by the Reading Studio ---------- */
  const LEDGER_OF = { V01: 'scroll', V04: 'line', V05: 'dwell', V02: 'zoom', V07: 'layout', V08: 'tts', U02: 'replay', U03: 'speed', M03: 'lookup', H01: 'tts', H07: 'tap', O07: 'summary', Q02: 'answer' };
  ERLY.track = (id, v = 1, mode = 'add') => {
    const on = S.status === 'active' && !S.pause;
    const bag = on ? S.live : preview;
    bag[id] = mode === 'set' ? v : (bag[id] || 0) + v;
    const k = LEDGER_OF[id];
    if (k && mode === 'add') { const L = on ? S.ledger : previewLedger; L[k] = (L[k] || 0) + 1; }
    if (on) { S.events++; save(); }
    renderLive();
  };
  ERLY.liveValue = id => (S.status === 'active' ? S.live : preview)[id] || 0;
  ERLY.isTracking = () => S.status === 'active' && !S.pause;
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
  function stop() { const self = S.selfRef; S = fresh(); S.selfRef = self; S.status = 'stopped'; save(); render(); ERLY.emit('track', ERLY.getTrack()); ERLY.toast(T('Stopped. Everything was deleted.', 'توقف. حُذف كل شيء.')); }
  function reset() { const self = S.selfRef; S = fresh(); S.selfRef = self; save(); render(); ERLY.emit('track', ERLY.getTrack()); }
  function pause7() { S.pause = 7; save(); render(); ERLY.emit('track', ERLY.getTrack()); ERLY.toast(T('Paused for 7 days. Nothing is recorded until then.', 'تم الإيقاف المؤقت ٧ أيام. لن يُسجَّل شيء حتى ذلك الحين.')); }
  ERLY.on('trackDemo', pattern => { const keep = { blueprint: S.blueprint, pact: S.pact, selfRef: S.selfRef }; S = Object.assign(fresh(), keep); S.pattern = pattern || 'reading'; S.status = 'active'; S.start = new Date().toISOString(); advance(DAYS); });
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
    renderActive();
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
            <li><b>${T('Days 1–14', 'الأيام ١–١٤')}</b><span>${T('Blind fortnight — ERLY only learns your normal. Your tools work from day one.', 'أسبوعان أعميان — يتعلّم إيرلي معدلك فقط. أدواتك تعمل من اليوم الأول.')}</span></li>
            <li><b>${T('Days 15–28', 'الأيام ١٥–٢٨')}</b><span>${T('Watching — a day counts only if it is clearly above your own normal.', 'المراقبة — يُحتسب اليوم فقط إن كان أعلى بوضوح من معدلك.')}</span></li>
            <li><b>${T('Insight', 'الرؤية')}</b><span>${T('Only if 3+ of 10 domains persist for the whole fortnight. You see it first.', 'فقط إن استمرت ٣ مجالات أو أكثر من ١٠ طوال الأسبوعين. أنت ترى ذلك أولاً.')}</span></li>
            <li><b>${fmtDate(end)}</b><span>${T('Ends automatically. Raw data deleted; you keep a one-page picture.', 'ينتهي تلقائياً. تُحذف البيانات الخام؛ وتحتفظ بصورة من صفحة واحدة.')}</span></li>
          </ol>
          <p class="pact__never">${ICON('lock')} ${T('Never collected: what you type, camera, eye-tracking, emotion AI, location, grades.', 'لا يُجمع أبداً: ما تكتبه، الكاميرا، تتبّع العين، تحليل المشاعر، الموقع، الدرجات.')}</p>
        </div>
        <div class="pact__steps">
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
          <label class="field demo-pattern"><span class="mono">${T('Demo · synthetic pattern for the LMS signals', 'عرض · نمط اصطناعي لإشارات نظام التعلّم')}</span>
            <select id="pattern">${Object.entries(PNAMES).map(([v, n]) => `<option value="${v}" ${S.pattern === v ? 'selected' : ''}>${T(...n)}</option>`).join('')}</select></label>
          <label class="check-row"><input type="checkbox" id="agree"><span>${T('I understand, and I can pause, stop or delete everything at any time.', 'أفهم ذلك، ويمكنني الإيقاف المؤقت أو الإيقاف أو حذف كل شيء في أي وقت.')}</span></label>
          <button class="btn btn--accent btn--block" id="startTrack" disabled>${T('Sign the pact & start', 'وقّع الميثاق وابدأ')}</button>
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

  box && box.addEventListener('change', e => {
    if (e.target.dataset.cat) { S.consent[e.target.dataset.cat] = e.target.checked; save(); }
    if (e.target.id === 'agree') $('#startTrack').disabled = !e.target.checked;
    if (e.target.id === 'pattern') { S.pattern = e.target.value; save(); }
    if (e.target.id === 'examMode') { S.exam = e.target.checked; save(); }
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
    const a = e.target.closest('[data-act]'); if (!a) return;
    ({ next: () => advance(1), ff: () => advance(DAYS), stop, reset, pause: pause7 })[a.dataset.act]();
  });
  const track = (id, v, m) => ERLY.track(id, v, m);

  I18N.onChange(render);
  render();
  setTimeout(() => ERLY.emit('track', ERLY.getTrack()), 0);
})();
