/* ERLY Check-ins — ten short, game-like activities, one per matrix domain,
   guided by Noor's voice. They go beyond reading: listening in quiet and in
   noise, memory and number sense, planning and switching, holding back a
   response, steady focus over time, copying and composing, finding things on
   a course site, quizzes with and without a timer, and two short self-report
   scales for help-seeking and group work.

   Everything runs and stays on this device (localStorage "erly-checkins-v1").
   Typed text in the writing activity is used only to count words and is
   discarded straight away. Scoring lives in checkins-score.js. */
(function () {
  'use strict';
  const C = window.ERLY_CHECKS;
  const app = document.getElementById('checkins-app');
  if (!C || !app) return;
  const T = (en, ar) => I18N.t(en, ar);
  const L = () => (I18N.lang === 'ar' ? 'ar' : 'en');
  const P = (en, ar) => (L() === 'ar' ? ar : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const now = () => performance.now();

  /* ---------------- storage ---------------- */
  const KEY = 'erly-checkins-v1';
  let DB = { history: {}, short: false };
  try { DB = Object.assign(DB, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* in-memory only */ } };
  const statuses = () => { const o = {}; C.DOMAINS.forEach(k => { o[k] = C.domainStatus(DB.history[k]); }); return o; };
  function tracking() {
    try {
      const tr = ERLY.getTrack && ERLY.getTrack();
      if (tr && tr.summary && tr.status === 'ended') return { available: true, areas: tr.summary.flaggedAreas || [] };
    } catch (e) { /* no tracker */ }
    return { available: false, areas: [] };
  }

  /* ---------------- Noor's voice ---------------- */
  const voiceName = l => { try { const prefs = ERLY.companion ? ERLY.companion.store.prefs() : (JSON.parse(localStorage.getItem('erly-companion-v1') || '{}').prefs || {}); return (prefs.voices || {})[l] || ''; } catch (e) { return ''; } };
  const voice = window.ERLY_VOICE ? ERLY_VOICE.create({ getVoiceName: voiceName }) : null;
  let muted = false;

  /* ---------------- the activities ---------------- */
  const CATS = window.ERLY_IND.CATS;
  const ACT = {
    V: { min: 3, task: ['Speed-read the syllabus · Exam-paper code check', 'اقرأ خطة المقرر بسرعة · رمز ورقة الامتحان'], why: ['How quickly and accurately you recognise academic words, and whether characters packed close together are harder to see.', 'مدى سرعة ودقة تعرّفك على الكلمات المكتوبة، وهل الحروف المتلاصقة أصعب في الرؤية.'] },
    U: { min: 3, task: ['Campus announcements · quiet room and busy café', 'إعلانات الحرم · غرفة هادئة ومقهى مزدحم'], why: ['How well you catch spoken information, and how much background noise gets in the way.', 'مدى التقاطك للمعلومات المسموعة، ومدى تأثير الضوضاء الخلفية.'], needs: 'tts' },
    M: { min: 3, task: ['Room codes & PINs · Which lecture hall is fuller?', 'رموز القاعات · أي قاعة أكثر امتلاءً؟'], why: ['How many things you can hold in mind at once (forwards and backwards), and your quick sense of quantity.', 'كم شيئاً يمكنك الاحتفاظ به في ذهنك في آن واحد (للأمام وللخلف)، وإحساسك السريع بالكميات.'] },
    E: { min: 3, task: ['Campus route · Inbox triage', 'مسار الحرم · فرز البريد'], why: ['Planning and switching between rules, and holding back a response when you need to.', 'التخطيط والتبديل بين القواعد، وكبح الاستجابة عند الحاجة.'] },
    P: { min: 3, task: ['Live lecture captions · catch the keyword', 'ترجمة المحاضرة المباشرة · التقط الكلمة'], why: ['Whether your focus and speed hold steady through a few minutes of lecture, or fade.', 'هل يبقى تركيزك وسرعتك ثابتين لبضع دقائق، أم يتراجعان.'] },
    O: { min: 4, task: ['Copy the lecture slide · Two-minute reflection', 'انسخ الشريحة · تأمل لدقيقتين'], why: ['How easily words flow from your head to the page — speed, pauses and rewrites. Your text is never stored.', 'مدى سهولة انتقال الكلمات من ذهنك إلى الصفحة — السرعة والتوقفات وإعادة الكتابة. لا يُحفظ نصك أبداً.'] },
    N: { min: 2, task: ['Find it on the course LMS', 'جِده في نظام المقرر'], why: ['How easily you find your way around a course site to the thing you need.', 'مدى سهولة تنقّلك في موقع المقرر للوصول إلى ما تحتاجه.'] },
    Q: { min: 3, task: ['Exam simulator · untimed vs timed', 'محاكي الامتحان · بلا مؤقت ومع مؤقت'], why: ['Whether a ticking clock changes how well you do, and how much quizzes worry you.', 'هل يغيّر المؤقت أداءك، ومدى قلقك من الاختبارات.'] },
    H: { min: 1, task: ['How you like to get help', 'كيف تحب أن تحصل على المساعدة'], why: ['Shapes the support ERLY offers you. It never flags anything.', 'يشكّل الدعم الذي يقدمه لك إيرلي. لا يُشير إلى أي شيء أبداً.'] },
    C: { min: 2, task: ['Everyday university situations', 'مواقف جامعية يومية'], why: ['How comfortable everyday communication and group work feel for you.', 'مدى ارتياحك للتواصل اليومي والعمل الجماعي.'] }
  };
  const BAND = {
    'not-done': ['Not done yet', 'لم يُنجز بعد'], typical: ['Typical range', 'النطاق المعتاد'], watch: ['Worth a look', 'يستحق نظرة'], notable: ['Notable', 'لافت'],
    invalid: ['Unclear — try again', 'غير واضح — حاول مجدداً'], unavailable: ['Not available here', 'غير متاح هنا'], support: ['Support style saved', 'حُفظ أسلوب الدعم']
  };
  const LEVEL = { stronger: ['Stronger evidence', 'دلائل أقوى'], moderate: ['Some evidence', 'بعض الدلائل'], early: ['Early sign', 'إشارة أولية'] };

  /* ---------------- the daily quest: 2 activities a day for 5 days ---------------- */
  const SCHEDULE = [['V', 'U'], ['M', 'E'], ['P', 'O'], ['N', 'Q'], ['C', 'H']];
  const LIMIT = { V: 5, U: 6, M: 6, E: 5, P: 5, O: 6, N: 4, Q: 6, H: 2, C: 3 }; // minutes; generous, so most finish well within
  const limitMin = k => (DB.short ? Math.ceil(LIMIT[k] / 2) : LIMIT[k]);
  const dayKey = d => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  function quest() {
    DB.quest = DB.quest || {};
    if (!DB.quest.start && MODE === 'quest') { DB.quest.start = startOfDay(Date.now()); save(); }
    const start = DB.quest.start || startOfDay(Date.now());
    const day = Math.min(5, Math.floor((startOfDay(Date.now()) - start) / 864e5) + 1);
    const done = k => (DB.history[k] || []).length > 0;
    const days = SCHEDULE.map((ks, i) => ({ n: i + 1, ks, unlocked: DB.quest.judge || i + 1 <= day, done: ks.every(done), started: ks.some(done) }));
    const runs = C.DOMAINS.flatMap(k => (DB.history[k] || []).map(r => r.at)).filter(Boolean);
    const active = new Set(runs.map(dayKey));
    let streak = 0; for (let d = Date.now(); active.has(dayKey(d)) || (streak === 0 && d === Date.now()); d -= 864e5) { if (active.has(dayKey(d))) streak++; else if (streak === 0) continue; if (streak > 30) break; }
    const completed = C.DOMAINS.filter(done).length;
    return { day, days, streak, completed, xp: completed * 100 + days.filter(d => d.done).length * 50, today: days[Math.min(day, 5) - 1], done };
  }
  const MODE = app.dataset.mode || 'full';
  function render() { if (MODE === 'cta') return renderCTA(); if (MODE === 'quest') return renderQuest(); return renderFull(); }

  function renderCTA() {
    const q = quest(), st = statuses();
    const ring = q.completed / 10;
    app.innerHTML = `<div class="q-cta">
      <div class="q-cta__ring" style="--p:${ring}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="52" class="q-cta__arc"/></svg><span><b>${q.completed}</b><small>/ 10</small></span></div>
      <div class="q-cta__copy">
        <p class="mono q-cta__k">${ICON('rocket')} ${T('Daily Quest', 'المهمة اليومية')} · ${T(`Day ${q.day} of 5`, `اليوم ${q.day} من ٥`)}${q.streak ? ` · 🔥 ${q.streak}` : ''}</p>
        <h3>${T('Two short challenges a day, five days, every part of studying.', 'تحدّيان قصيران يومياً، لخمسة أيام، لكل جوانب الدراسة.')}</h3>
        <div class="q-cta__today">${q.today.ks.map(k => `<span class="q-chip ${q.done(k) ? 'is-done' : ''}">${ICON(CATS[k].icon)} ${esc(P(CATS[k].en, CATS[k].ar))}${q.done(k) ? ' ✓' : ''}</span>`).join('')}</div>
      </div>
      <a class="btn btn--accent btn--big q-cta__go" href="checkins.html" data-warp>${q.completed ? T('Continue the quest', 'تابع المهمة') : T('Start today’s quest', 'ابدأ مهمة اليوم')} <span aria-hidden="true">→</span></a>
    </div>`;
  }

  function renderQuest() {
    const q = quest(), st = statuses();
    const pos = [[8, 70], [28, 30], [50, 64], [72, 26], [92, 58]];
    app.innerHTML = `
      <section class="q-hero">
        <div class="q-stats">
          <div><small>${T('Today', 'اليوم')}</small><b>${T(`Day ${q.day}`, `اليوم ${q.day}`)}<span>/5</span></b></div>
          <div><small>XP</small><b class="q-xp" data-to="${q.xp}">${q.xp}</b></div>
          <div><small>${T('Streak', 'سلسلة الأيام')}</small><b>🔥 ${q.streak}</b></div>
          <div><small>${T('Done', 'منجز')}</small><b>${q.completed}<span>/10</span></b></div>
        </div>
        <div class="q-map" aria-label="${T('Quest map', 'خريطة المهمة')}">
<svg aria-hidden="true"><path class="q-map__path"/><path class="q-map__done" data-p="${q.days.filter(d => d.done).length / 4}"/></svg>
          ${q.days.map((d, i) => `<button type="button" class="q-node ${d.done ? 'is-done' : ''} ${d.n === q.day ? 'is-today' : ''} ${d.unlocked ? '' : 'is-locked'}" style="left:${pos[i][0]}%;top:${pos[i][1]}%;--i:${i}" data-day="${d.n}" ${d.unlocked ? '' : 'disabled'} aria-label="${T(`Day ${d.n}`, `اليوم ${d.n}`)}${d.done ? ' ✓' : d.unlocked ? '' : ' 🔒'}"><span>${d.done ? '✓' : d.unlocked ? d.n : '🔒'}</span><small>${d.ks.map(k => esc(P(CATS[k].en, CATS[k].ar).split(' & ')[0])).join(' · ')}</small>${d.n === q.day && !d.done ? `<em class="q-flag">${T('You are here', 'أنت هنا')}</em>` : ''}</button>`).join('')}
        </div>
      </section>
      <section class="q-today" id="qToday">
        <h2>${q.today.done ? T('Today’s quest is complete! 🎉', 'أنجزت مهمة اليوم! 🎉') : T('Today’s challenges', 'تحدّيات اليوم')}</h2>
        <div class="q-cards">${dayCards(selDay || q.day, q, st)}</div>
        ${q.today.done && q.day < 5 && !DB.quest.judge ? `<p class="muted">${T('Come back tomorrow for the next two — spreading them out gives a more reliable picture.', 'عد غداً للتحدّيين التاليين — توزيعها على أيام يعطي صورة أكثر موثوقية.')}</p>` : ''}
      </section>
      ${profileHTML(st)}`;
    drawMap(pos);
    // count the XP up
    const xpEl = app.querySelector('.q-xp');
    if (xpEl && !reduce) { const to = +xpEl.dataset.to, from = +(sessionStorage.getItem('erly-qxp') || 0), t0 = performance.now(); if (to !== from) (function f(t) { const k = Math.min(1, (t - t0) / 900); xpEl.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0); try { sessionStorage.setItem('erly-qxp', to); } catch (e) { /* ignore */ } }
    if (q.today.done && !renderQuest.cheered) { renderQuest.cheered = true; const h = app.querySelector('.q-today h2'); if (h && window.FUN && FUN.confetti) setTimeout(() => FUN.confetti(h, 50), 300); }
  }
  // the winding path between the day nodes, drawn in real pixels so it never stretches
  let mapPos = null;
  function drawMap(pos) {
    mapPos = pos || mapPos;
    const map = app.querySelector('.q-map'); if (!map || !mapPos) return;
    const W = map.clientWidth, Hh = map.clientHeight;
    const pts = mapPos.map(([x, y]) => [x / 100 * W, y / 100 * Hh]);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` C${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`; }
    const svg = map.querySelector('svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
    svg.querySelectorAll('path').forEach(pa => pa.setAttribute('d', d));
    if (!reduce && !svg.querySelector('.q-map__spark')) svg.insertAdjacentHTML('beforeend', `<circle class="q-map__spark" r="5"><animateMotion dur="7s" repeatCount="indefinite" rotate="auto" path="${d}"/></circle><circle class="q-map__spark q-map__spark--2" r="3"><animateMotion dur="7s" begin="-3.5s" repeatCount="indefinite" path="${d}"/></circle>`);
    else svg.querySelectorAll('animateMotion').forEach(m => m.setAttribute('path', d));
    const done = svg.querySelector('.q-map__done'), len = done.getTotalLength(), frac = +done.dataset.p || 0;
    done.style.strokeDasharray = `${len}`; done.style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() => requestAnimationFrame(() => { done.style.strokeDashoffset = `${len * (1 - frac)}`; }));
  }
  addEventListener('resize', () => { clearTimeout(drawMap.t); drawMap.t = setTimeout(() => drawMap(), 150); });
  let selDay = null;
  function dayCards(n, q, st) {
    const d = q.days[n - 1];
    return d.ks.map((k, i) => {
      const s = st[k], a = ACT[k], cat = CATS[k];
      return `<article class="q-card ${q.done(k) ? 'is-done' : ''} ${d.unlocked ? '' : 'is-locked'}" style="--i:${i}">${q.done(k) ? `<span class="q-stamp">${T('Done', 'تم')} ✓</span>` : ''}
        <div class="q-card__ic">${ICON(cat.icon)}</div>
        <div class="q-card__b">
          <small class="mono">${T(`Day ${n} · challenge ${i + 1}`, `اليوم ${n} · التحدي ${i + 1}`)}</small>
          <h3>${esc(P(...a.task))}</h3>
          <p>${esc(P(...a.why))}</p>
          <div class="q-card__meta"><span>${ICON('timer')} ${T(`${limitMin(k)} min limit`, `حد ${limitMin(k)} دقائق`)}</span><span>+100 XP</span>${s.latest ? `<span class="ck-chip ck-chip--${s.band}">${P(...BAND[s.band])}</span>` : ''}</div>
        </div>
        <div class="q-card__go">${d.unlocked ? `${s.latest ? `<button class="btn btn--xs btn--quiet" data-ck-view="${k}">${T('Result', 'النتيجة')}</button>` : ''}<button class="btn ${s.latest ? 'btn--ghost' : 'btn--accent'}" data-ck-start="${k}">${s.latest ? T('Play again', 'العب مجدداً') : T('Play', 'ابدأ')}</button>` : `<span class="muted">🔒 ${T(`Unlocks on day ${n}`, `يُفتح في اليوم ${n}`)}</span>`}</div>
      </article>`;
    }).join('');
  }

  function renderFull() {
    const st = statuses();
    app.innerHTML = `
      <div class="ck-grid">${C.DOMAINS.map((k, i) => {
        const s = st[k], a = ACT[k], cat = CATS[k];
        return `<article class="ck-card ck-card--${s.band}" style="--i:${i}">
          <div class="ck-card__top"><span class="ck-card__ic">${ICON(cat.icon)}</span><span class="ck-chip ck-chip--${s.band}">${P(...BAND[s.band])}${s.repeated ? ` · ${T('repeated', 'تكرر')}` : ''}</span></div>
          <h3>${esc(P(cat.en, cat.ar))}</h3>
          <p class="ck-card__task">${esc(P(...a.task))}</p>
          <p class="ck-card__why">${esc(P(...a.why))}</p>
          <div class="ck-card__foot"><span class="mono">~${DB.short ? Math.max(1, Math.round(a.min / 2)) : a.min} ${T('min', 'د')}</span>
            <div>${s.latest ? `<button class="btn btn--xs btn--quiet" data-ck-view="${k}">${T('Result', 'النتيجة')}</button>` : ''}<button class="btn btn--xs ${s.latest ? 'btn--ghost' : 'btn--accent'}" data-ck-start="${k}">${s.latest ? T('Redo', 'أعد') : T('Start', 'ابدأ')}</button></div></div>
        </article>`;
      }).join('')}</div>
      ${profileHTML(st)}`;
  }
  function profileHTML(st) {
    const syn = C.synthesize(st, tracking());
    return `
      <div class="ck-profile reveal is-in">
        <div class="ck-profile__head">
          <div><p class="panel__h mono">${T('Your check-in profile', 'ملفك من الفحوصات')}</p>
            <h3>${syn.completed ? T(`${syn.completed} of ${syn.total} check-ins done`, `أنجزت ${syn.completed} من ${syn.total} فحوصات`) : T('Start with any check-in', 'ابدأ بأي فحص')}</h3></div>
          <div class="ck-meter" style="--done:${syn.completed / syn.total}"><i></i></div>
        </div>
        ${!syn.enough ? `<p class="muted">${T('Do at least four check-ins to see a combined picture. One activity on its own never points to anything.', 'أنجز أربعة فحوصات على الأقل لترى صورة مجمّعة. لا يشير نشاط واحد بمفرده إلى أي شيء.')}</p>`
          : syn.explore.length ? `<p class="ck-lead">${T('Where several of your results agree, these are worth exploring with Student Accessibility Services. They are possibilities to ask about — not a diagnosis.', 'حيث تتفق عدة نتائج، تستحق هذه الاستكشاف مع خدمات الطلبة. إنها احتمالات للسؤال عنها — وليست تشخيصاً.')}</p>
            <div class="ck-explore">${syn.explore.map(x => `<div class="ck-ex ck-ex--${x.level}">
              <div class="ck-ex__h"><b>${esc(P(x.en, x.ar))}</b><span class="ck-lvl">${P(...LEVEL[x.level])}</span></div>
              <p class="ck-ex__ev">${T('Based on', 'بناءً على')}: ${x.domains.map(d => esc(P(CATS[d].en, CATS[d].ar))).join(' · ')}${x.repeated ? ` · ${T('seen on two runs', 'ظهر في محاولتين')}` : ''}${x.trackingAvailable ? (x.agreesWithTracking ? ` · ${T('matches your 14-day tracking', 'يتوافق مع تتبّعك لـ١٤ يوماً')}` : ` · ${T('not seen in your 14-day tracking', 'لم يظهر في تتبّعك لـ١٤ يوماً')}`) : ''}</p>
              <ul>${(L() === 'ar' ? x.assessAr : x.assess).map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`).join('')}</div>
            <details class="ck-ordinary"><summary>${T('Everyday things that can cause the same results', 'أمور يومية قد تسبب النتائج نفسها')}</summary><ul>${syn.ordinary.map(o => `<li>${esc(P(o[0], o[1]))}</li>`).join('')}</ul></details>
            <div class="ck-actions"><a class="btn btn--sm btn--accent" href="${MODE === 'quest' ? 'student.html#handoff' : '#handoff'}">${T('Talk to SAS', 'تحدّث مع خدمات الطلبة')}</a><button class="btn btn--sm btn--ghost" data-ck-download>${T('Download my results (.txt)', 'نزّل نتائجي (.txt)')}</button></div>`
            : `<p class="ck-lead">${T('Nothing stood out across your check-ins — your results sit in the typical range. If something still feels hard, you can always talk to SAS.', 'لم يبرز شيء عبر فحوصاتك — نتائجك ضمن النطاق المعتاد. إن بقي شيء صعباً، يمكنك دائماً التحدث مع خدمات الطلبة.')}</p><div class="ck-actions"><button class="btn btn--sm btn--ghost" data-ck-download>${T('Download my results (.txt)', 'نزّل نتائجي (.txt)')}</button></div>`}
        <details class="ck-acc"><summary>${T('How accurate is this?', 'ما مدى دقة هذا؟')}</summary>
          <p>${T('Each activity is modelled on a well-known screening task — lexical decision, visual crowding, speech-in-noise, digit span, dot comparison, Trail Making A/B, go/no-go, a continuous-performance task, copy vs free writing, timed vs untimed items. ERLY looks for several measures agreeing, re-runs that repeat, and agreement with your own 14-day tracking before it suggests anything, which makes it far more careful than any single test.', 'كل نشاط مستوحى من مهمة فحص معروفة — قرار الكلمات، والازدحام البصري، والكلام وسط الضوضاء، وسعة الأرقام، ومقارنة النقاط، واختبار المسارات أ/ب، والاستجابة/الكبح، ومهمة الأداء المستمر، والنسخ مقابل الكتابة الحرة، والأسئلة مع المؤقت وبدونه. يبحث إيرلي عن اتفاق عدة مقاييس، وتكرار النتيجة عند الإعادة، وتوافقها مع تتبّعك لـ١٤ يوماً قبل أن يقترح أي شيء.')}</p>
          <p>${T('But no online activity can identify a condition with doctor-level accuracy. The reference ranges here are demo values, not validated norms; device, sleep, mood and language all move the results. Only a qualified assessment can confirm a learning difference or any other condition — that’s why the result is always “worth exploring with SAS”, never a label.', 'لكن لا يمكن لأي نشاط عبر الإنترنت تحديد حالة بدقة الطبيب. نطاقات المقارنة هنا قيم تجريبية وليست معايير معتمدة؛ والجهاز والنوم والمزاج واللغة تؤثر جميعها في النتائج. وحده التقييم المتخصص يمكنه تأكيد اختلاف تعلّم أو أي حالة أخرى — لذلك تكون النتيجة دائماً «تستحق الاستكشاف مع خدمات الطلبة»، وليست تصنيفاً.')}</p></details>
        <div class="ck-foot">
          <label class="switch-row switch-row--inline"><span><b>${T('Short demo versions', 'نسخ تجريبية قصيرة')}</b><small>${T('Half-length activities for a quick demo — less reliable.', 'أنشطة بنصف الطول لعرض سريع — أقل موثوقية.')}</small></span><input type="checkbox" id="ckShort" ${DB.short ? 'checked' : ''}><i></i></label>
          ${MODE === 'quest' ? `<label class="switch-row switch-row--inline"><span><b>${T('Judge mode', 'وضع الحكام')}</b><small>${T('Unlock all five days now (for demos).', 'افتح الأيام الخمسة الآن (للعروض).')}</small></span><input type="checkbox" id="ckJudge" ${DB.quest && DB.quest.judge ? 'checked' : ''}><i></i></label>` : ''}
          <button class="btn btn--xs btn--quiet" data-ck-clear>${ICON('trash')} ${T('Delete my check-in results', 'احذف نتائج فحوصاتي')}</button>
        </div>
      </div>`;
  }
  app.addEventListener('click', e => {
    const s = e.target.closest('[data-ck-start]'), v = e.target.closest('[data-ck-view]');
    if (s) open(s.dataset.ckStart, s);
    if (v) open(v.dataset.ckView, v, true);
    if (e.target.closest('[data-ck-clear]') && confirm(T('Delete all your check-in results from this device?', 'حذف جميع نتائج فحوصاتك من هذا الجهاز؟'))) { DB.history = {}; save(); render(); ERLY.toast && ERLY.toast(T('Check-in results deleted', 'حُذفت نتائج الفحوصات')); }
    if (e.target.closest('[data-ck-download]')) download();
  });
  app.addEventListener('change', e => {
    if (e.target.id === 'ckShort') { DB.short = e.target.checked; save(); render(); }
    if (e.target.id === 'ckJudge') { DB.quest = DB.quest || {}; DB.quest.judge = e.target.checked; save(); render(); }
  });
  app.addEventListener('click', e => {
    const d = e.target.closest('[data-day]');
    if (d && !d.disabled) { selDay = +d.dataset.day; render(); const t = document.getElementById('qToday'); t && t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    const w = e.target.closest('[data-warp]');
    if (w && !reduce) { e.preventDefault(); warp(w); }
  });
  // a playful transition into the quest page
  function warp(from) {
    const r = from.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'q-warp';
    el.style.setProperty('--x', (r.left + r.width / 2) + 'px'); el.style.setProperty('--y', (r.top + r.height / 2) + 'px');
    el.innerHTML = `<div class="q-warp__stars">${Array.from({ length: 24 }, (_, i) => `<i style="--a:${i * 15}deg;--d:${(i % 5) * 60}ms"></i>`).join('')}</div><span class="q-warp__rocket">${ICON('rocket')}</span><b>${T('Launching your quest…', 'جارٍ إطلاق مهمتك…')}</b>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-on'));
    try { sessionStorage.setItem('erly-warp', '1'); } catch (err) { /* ignore */ }
    setTimeout(() => { location.href = from.getAttribute('href'); }, 900);
  }

  function download() {
    const st = statuses(), syn = C.synthesize(st, tracking());
    const lines = [P('ERLY check-in results — for the student', 'نتائج فحوصات إيرلي — للطالب'), new Date().toLocaleString(), ''];
    C.DOMAINS.forEach(k => {
      const s = st[k];
      lines.push(`${P(CATS[k].en, CATS[k].ar)}: ${P(...BAND[s.band])}`);
      if (s.latest && s.latest.rows) s.latest.rows.forEach(r => { if (!r.unavailable) lines.push(`   • ${P(r.en, r.ar)}: ${fmt(r.value, r.unit)} (${P('reference', 'المرجع')} ${fmt(r.mean, r.unit)})`); });
    });
    lines.push('', P('Worth exploring with SAS', 'يستحق الاستكشاف مع خدمات الطلبة') + ':');
    if (!syn.explore.length) lines.push('   ' + P('Nothing stood out.', 'لم يبرز شيء.'));
    syn.explore.forEach(x => lines.push(`   • ${P(x.en, x.ar)} — ${P(...LEVEL[x.level])}`));
    lines.push('', P('This is a screening summary, not a diagnosis. Reference ranges are demo values. Only a qualified assessment can confirm a learning difference.', 'هذا ملخص فحص وليس تشخيصاً. نطاقات المقارنة قيم تجريبية. وحده التقييم المتخصص يمكنه تأكيد اختلاف التعلّم.'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    a.download = 'ERLY_check-ins.txt'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const fmt = (v, unit) => v == null ? '—' : unit === '%' ? Math.round(v * 100) + '%' : unit === 'ms' ? Math.round(v) + ' ms' : unit === 's' ? (Math.round(v * 10) / 10) + ' s' : unit === 'wpm' ? Math.round(v) + ' wpm' : unit === '×' ? (Math.round(v * 100) / 100) + '×' : unit === '/5' ? (Math.round(v * 10) / 10) + '/5' : String(Math.round(v * 10) / 10);

  /* ---------------- overlay ---------------- */
  const ov = document.createElement('div');
  ov.className = 'ck-ov'; ov.id = 'checkin'; ov.hidden = true;
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  document.body.appendChild(ov);
  let run = null; // { k, aborted, away, awayAt, t0 }

  function shell(k) {
    const cat = CATS[k];
    ov.setAttribute('aria-label', P(cat.en, cat.ar));
    ov.innerHTML = `
      <header class="ck-ov__top">
        <button class="icon-btn" data-ck-close aria-label="${T('Close', 'إغلاق')}">${ICON('x')}</button>
        <div class="ck-ov__t"><span class="ck-card__ic">${ICON(cat.icon)}</span><b>${esc(P(cat.en, cat.ar))}</b></div>
        <div class="ck-ov__prog" aria-hidden="true"><i id="ckProg"></i></div>
        <span class="ck-time mono" id="ckTime" hidden title="${T('Time left', 'الوقت المتبقي')}">${ICON('timer')}<b></b></span>
        <button class="icon-btn" id="ckMute" aria-pressed="${muted}" aria-label="${T('Noor’s voice on/off', 'صوت نور تشغيل/إيقاف')}">${ICON(muted ? 'mute' : 'volume')}</button>
      </header>
      <main class="ck-stage" id="ckStage" tabindex="-1"></main>
      <footer class="ck-noor" aria-live="polite"><span class="cmp-orb" id="ckOrb" aria-hidden="true"><i></i><i></i><i></i></span><p id="ckSay"></p></footer>`;
    $('[data-ck-close]', ov).onclick = close;
    $('#ckMute', ov).onclick = () => { muted = !muted; if (muted && voice) voice.stop(); $('#ckMute', ov).innerHTML = ICON(muted ? 'mute' : 'volume'); $('#ckMute', ov).setAttribute('aria-pressed', muted); };
  }
  function open(k, from, viewOnly) {
    if (run) return;
    shell(k);
    const r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    ov.style.setProperty('--ox', (r.left + r.width / 2) + 'px'); ov.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
    ov.hidden = false;
    document.documentElement.classList.add('studio-open');
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('is-open')));
    const hist = DB.history[k] || [];
    if (viewOnly && hist.length) return showResult(k, hist[hist.length - 1], true);
    intro(k);
  }
  function close() {
    if (run) run.aborted = true;
    run = null;
    if (voice) voice.stop();
    stopNoise();
    ov.classList.remove('is-open');
    document.documentElement.classList.remove('studio-open');
    setTimeout(() => { if (!ov.classList.contains('is-open')) { ov.hidden = true; ov.innerHTML = ''; } }, reduce ? 0 : 520);
    render();
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && !ov.hidden) close(); });
  document.addEventListener('visibilitychange', () => { if (!run) return; if (document.hidden) run.awayAt = now(); else if (run.awayAt) { run.away += now() - run.awayAt; run.awayAt = 0; } });

  /* ---------------- helpers for activities ---------------- */
  class Aborted extends Error {}
  const stage = () => $('#ckStage', ov);
  const guard = () => { if (!run || run.aborted) throw new Aborted(); };
  const wait = ms => new Promise((res, rej) => setTimeout(() => (run && !run.aborted ? res() : rej(new Aborted())), ms));
  const prog = f => { const p = $('#ckProg', ov); if (p) p.style.width = Math.round(f * 100) + '%'; };
  const sfx = n => { try { if (window.FUN && FUN.sfx && !muted) FUN.sfx[n](); } catch (e) { /* no audio */ } };
  // Noor speaks in the background — the activity never waits for her (some
  // tablets never report that speech ended, which used to freeze the games)
  function say(en, ar, o = {}) {
    const text = P(en, ar);
    const el = $('#ckSay', ov); if (el) { el.textContent = text; el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in'); }
    const orb = $('#ckOrb', ov);
    if (!voice || !voice.supported.tts || (muted && !o.force)) return Promise.resolve();
    try {
      if (orb) orb.parentElement.dataset.s = 'speaking';
      const done = () => { clearTimeout(safety); if (orb) orb.parentElement.dataset.s = 'idle'; };
      const safety = setTimeout(done, Math.max(3000, text.length * 75));
      voice.speak(text, { lang: L(), onend: done, onerror: done });
    } catch (e) { /* speech is optional */ }
    return Promise.resolve();
  }
  // an animated instruction card; the student starts when ready
  function brief(o) {
    guard();
    say(o.say[0], o.say[1]);
    H(`<div class="ck-brief">
      <div class="ck-brief__art ck-brief__art--${o.art || 'default'}" aria-hidden="true">${o.artHTML || ICON(o.icon || 'sparkle')}</div>
      <p class="ck-brief__k mono">${esc(o.part || '')}</p>
      <h2>${esc(P(...o.title))}</h2>
      <ol class="ck-brief__steps">${o.steps.map((s, i) => `<li style="--i:${i}"><i>${i + 1}</i><span>${P(...s)}</span></li>`).join('')}</ol>
      <button class="btn btn--accent btn--big ck-brief__go" data-go>${esc(P(...(o.go || ['Start', 'ابدأ'])))} <span aria-hidden="true">→</span></button>
    </div>`);
    const b = $('[data-go]', stage()); b.focus({ preventScroll: true });
    return new Promise((res, rej) => { b.onclick = () => { if (!run || run.aborted) return rej(new Aborted()); sfx('pop'); res(); }; }).then(() => countdown());
  }
  async function countdown() {
    if (reduce) return;
    for (const n of ['3', '2', '1', P('Go!', 'انطلق!')]) {
      H(`<div class="ck-count"><b>${n}</b></div>`);
      sfx('tick');
      await wait(n.length > 1 ? 380 : 420);
    }
  }
  // a small score/combo strip — just for fun, never part of the result
  const hud = { pts: 0, combo: 0, best: 0 };
  function hudReset() { hud.pts = 0; hud.combo = 0; hud.best = 0; }
  function hudHTML() { return `<div class="ck-hud" aria-hidden="true"><span><b data-hud-pts>${hud.pts}</b> pts</span><span class="ck-hud__combo ${hud.combo >= 3 ? 'is-hot' : ''}">${hud.combo >= 2 ? `🔥 ×${hud.combo}` : ''}</span></div>`; }
  function hudHit(ok, where) {
    if (ok) { hud.combo++; hud.best = Math.max(hud.best, hud.combo); const g = 10 + Math.min(hud.combo, 10) * 2; hud.pts += g; sfx(hud.combo % 5 === 0 ? 'win' : 'good'); pop(where, '+' + g, 'ok'); }
    else { hud.combo = 0; sfx('soft'); pop(where, T('miss', 'فاتتك'), 'no'); }
    const p = $('[data-hud-pts]', stage()); if (p) p.textContent = hud.pts;
    const c = $('.ck-hud__combo', stage()); if (c) { c.textContent = hud.combo >= 2 ? `🔥 ×${hud.combo}` : ''; c.classList.toggle('is-hot', hud.combo >= 3); }
  }
  function pop(where, text, cls) {
    const host = where || stage(); if (!host || reduce) return;
    const r = host.getBoundingClientRect(), sr = ov.getBoundingClientRect();
    const e = document.createElement('span'); e.className = 'ck-pop ck-pop--' + cls; e.textContent = text;
    e.style.left = (r.left - sr.left + r.width / 2) + 'px'; e.style.top = (r.top - sr.top + 10) + 'px';
    ov.appendChild(e); setTimeout(() => e.remove(), 900);
  }
  // wait for a button / key; resolves { id, rt } or { id: null } on timeout
  function choose(btns, o = {}) {
    return new Promise((res, rej) => {
      const t0 = now();
      let done = false, to = null;
      const finish = (id, el) => { if (done) return; done = true; clearTimeout(to); removeEventListener('keydown', onKey); if (el) el.classList.add('is-picked'); setTimeout(() => box.remove(), o.keep ? 160 : 0); if (!run || run.aborted) return rej(new Aborted()); res({ id, rt: now() - t0 }); };
      const box = document.createElement('div');
      box.className = 'ck-choices ' + (o.cls || '');
      box.innerHTML = btns.map((b, i) => `<button type="button" data-id="${esc(b.id)}" style="--i:${i}">${b.key ? `<kbd>${esc(b.key.replace('Arrow', '').toUpperCase())}</kbd>` : ''}<span>${b.html || esc(b.label)}</span></button>`).join('');
      // click works everywhere (iPad Safari included); pointerdown makes timed tasks feel instant
      box.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b && o.fast) { e.preventDefault(); finish(b.dataset.id, b); } });
      box.addEventListener('click', e => { const b = e.target.closest('button'); if (b) finish(b.dataset.id, b); });
      const onKey = e => { const b = btns.find(x => x.key && x.key.toLowerCase() === e.key.toLowerCase()); if (b) { e.preventDefault(); finish(b.id, box.querySelector(`[data-id="${CSS.escape(b.id)}"]`)); } };
      addEventListener('keydown', onKey);
      (o.into || stage()).appendChild(box);
      if (o.timeout) to = setTimeout(() => finish(null), o.timeout);
      if (o.focus !== false) { const f = box.querySelector('button'); f && f.focus({ preventScroll: true }); }
    });
  }
  const H = html => { const s = stage(); if (s) s.innerHTML = html; };
  async function rate(qEn, qAr, lowEn, lowAr, highEn, highAr) {
    H(`<div class="ck-q ck-q--rate"><p class="ck-q__t">${esc(P(qEn, qAr))}</p><div class="ck-scale-lbl"><span>${esc(P(lowEn || 'Not at all', lowAr || 'أبداً'))}</span><span>${esc(P(highEn || 'Very', highAr || 'جداً'))}</span></div></div>`);
    const r = await choose([1, 2, 3, 4, 5].map(n => ({ id: String(n), label: String(n) })), { cls: 'ck-choices--scale', into: $('.ck-q', stage()), keep: true });
    return +r.id;
  }
  function partDone(text) { H(`<div class="ck-part"><span>${ICON('check')}</span><b>${esc(text)}</b></div>`); sfx('win'); return wait(reduce ? 200 : 900); }

  /* ---------------- intro & results ---------------- */
  function intro(k) {
    const a = ACT[k], cat = CATS[k];
    const unavailable = a.needs === 'tts' && !(voice && voice.supported.tts);
    H(`<div class="ck-intro">
        <span class="ck-intro__ic">${ICON(cat.icon)}</span>
        <p class="ck-brief__k mono">${esc(P(cat.en, cat.ar))}</p>
        <h2>${esc(P(...a.task))}</h2>
        <p>${esc(P(...a.why))}</p>
        <ul class="ck-intro__list">
          <li style="--i:0">${ICON('clock')} ${T(`About ${DB.short ? Math.max(1, Math.round(a.min / 2)) : a.min} minutes${DB.short ? ' (short demo version)' : ''}`, `نحو ${DB.short ? Math.max(1, Math.round(a.min / 2)) : a.min} دقائق${DB.short ? ' (نسخة قصيرة)' : ''}`)}</li>
          <li style="--i:1">${ICON('timer')} ${T(`Time limit: ${limitMin(k)} minutes — plenty of time`, `الحد الزمني: ${limitMin(k)} دقائق — وقت كافٍ`)}</li>
          <li style="--i:2">${ICON('lock')} ${T('Private — results stay on this device unless you choose to share them.', 'خاص — تبقى النتائج على هذا الجهاز ما لم تختر مشاركتها.')}</li>
          <li style="--i:3">${ICON('sprout')} ${T('Not a test you pass or fail. Best done rested, somewhere quiet.', 'ليس اختباراً تنجح فيه أو ترسب. الأفضل وأنت مرتاح في مكان هادئ.')}</li>
        </ul>
        ${unavailable ? `<p class="ck-warn">${T('This one needs your browser’s read-aloud voice, which isn’t available here. Try Chrome, Edge or Safari.', 'يحتاج هذا إلى صوت القراءة في متصفحك، وهو غير متاح هنا. جرّب كروم أو إيدج أو سفاري.')}</p>` : `<button class="btn btn--accent btn--big" data-go>${T('I’m ready', 'أنا مستعد')} <span aria-hidden="true">→</span></button>`}
      </div>`);
    const go = $('[data-go]', stage());
    if (go) { go.focus({ preventScroll: true }); go.onclick = () => { sfx('pop'); start(k); }; }
    prog(0);
    const mins = DB.short ? Math.max(1, Math.round(a.min / 2)) : a.min;
    say(`This one takes about ${mins} minute${mins > 1 ? 's' : ''}. Tap I’m ready when you are.`, `يستغرق هذا نحو ${mins} دقائق. اضغط «أنا مستعد» عندما تكون جاهزاً.`);
  }
  class TimeUp extends Error {}
  async function start(k) {
    if (run) return;
    hudReset();
    run = { k, aborted: false, away: 0, awayAt: 0, t0: now() };
    const me = run, limitMs = limitMin(k) * 60e3;
    const timeEl = $('#ckTime', ov);
    const tick = () => { const left = Math.max(0, limitMs - (now() - me.t0)); if (timeEl) { timeEl.hidden = false; timeEl.querySelector('b').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`; timeEl.classList.toggle('is-low', left < 30000); } };
    tick(); me.clock = setInterval(tick, 500);
    const timeUp = new Promise((_, rej) => { me.tu = setTimeout(() => rej(new TimeUp()), limitMs); });
    timeUp.catch(() => {});
    try {
      const out = await Promise.race([RUN[k](), timeUp]);
      clearTimeout(me.tu); clearInterval(me.clock); if (timeEl) timeEl.hidden = true;
      guard();
      const dur = now() - run.t0;
      const res = C.scoreRun(k, out.metrics, Object.assign({ durationMs: dur, awayMs: run.away }, out.validity || {}));
      res.metrics = out.metrics; res.extra = out.extra || null; res.short = DB.short; res.lang = L(); res.fun = { pts: hud.pts, best: hud.best };
      DB.history[k] = (DB.history[k] || []).concat([res]).slice(-3); save();
      run = null;
      showResult(k, res);
    } catch (e) {
      clearTimeout(me.tu); clearInterval(me.clock); if (timeEl) timeEl.hidden = true;
      if (e instanceof TimeUp) {
        me.aborted = true; run = null; stopNoise();
        const res = C.scoreRun(k, {}, { complete: false }); res.notes.push('time-up'); res.short = DB.short;
        DB.history[k] = (DB.history[k] || []).concat([res]).slice(-3); save();
        H(`<div class="ck-res"><span class="ck-intro__ic">${ICON('timer')}</span><h2>${T('Time’s up!', 'انتهى الوقت!')}</h2><p class="ck-res__lead">${T('No worries — that happens. This run won’t count; you can play it again whenever you like.', 'لا بأس — يحدث هذا. لن تُحتسب هذه المحاولة؛ يمكنك اللعب مجدداً متى شئت.')}</p><div class="ck-res__btns"><button class="btn btn--accent" data-redo>${T('Try again', 'حاول مجدداً')}</button><button class="btn btn--ghost" data-done>${T('Back', 'رجوع')}</button></div></div>`);
        $('[data-done]', stage()).onclick = close; $('[data-redo]', stage()).onclick = () => intro(k);
        say('Time’s up! No worries, that one won’t count.', 'انتهى الوقت! لا بأس، لن تُحتسب.');
        return;
      }
      if (!(e instanceof Aborted)) { console.error(e); H(`<div class="ck-res"><p class="ck-warn">${T('Something went wrong — please try again.', 'حدث خطأ — حاول مجدداً.')}</p><div class="ck-res__btns"><button class="btn btn--accent" data-redo>${T('Try again', 'حاول مجدداً')}</button></div></div>`); const r = $('[data-redo]', stage()); if (r) r.onclick = () => intro(k); }
      run = null;
      stopNoise();
    }
  }
  function showResult(k, res, viewOnly) {
    prog(1);
    if (!viewOnly && MODE === 'quest') setTimeout(() => celebrate(k), 400);
    const cat = CATS[k];
    const band = res.band;
    if (k === 'H') return showSupportStyle(res);
    const fun = res.fun && !viewOnly ? `<div class="ck-res__fun"><span><b>${res.fun.pts}</b> ${T('points', 'نقطة')}</span><span><b>${res.fun.best}</b> ${T('best streak', 'أفضل سلسلة')}</span></div>` : '';
    H(`<div class="ck-res">
      <div class="ck-res__badge ck-res__badge--${band}">${ICON(band === 'typical' ? 'check' : band === 'invalid' ? 'timer' : 'eye')}</div>
      <span class="ck-chip ck-chip--${band} ck-chip--lg">${P(...BAND[band])}</span>
      <h2>${esc(P(cat.en, cat.ar))}</h2>
      ${fun}
      <p class="ck-res__lead">${esc(P(...{
        typical: ['Your results sit in the typical range today. Nice work.', 'نتائجك ضمن النطاق المعتاد اليوم. عمل جميل.'],
        watch: ['One measure stood out a little. On its own that isn’t meaningful — it only counts if other check-ins point the same way.', 'برز مقياس واحد قليلاً. وحده ليس ذا معنى — ولا يُحتسب إلا إذا أشارت فحوصات أخرى في الاتجاه نفسه.'],
        notable: ['Several measures agree here. That’s worth keeping in mind — the combined profile will show whether other areas point the same way.', 'تتفق عدة مقاييس هنا. هذا يستحق الانتباه — وسيُظهر الملف المجمّع إن كانت مجالات أخرى تشير إلى الاتجاه نفسه.'],
        invalid: ['We couldn’t get a clear reading this time (for example, lots of very early taps or time away from the screen). Try again when you’re settled.', 'لم نحصل على قراءة واضحة هذه المرة (مثل نقرات مبكرة كثيرة أو الابتعاد عن الشاشة). حاول مجدداً حين تكون مستقراً.'],
        unavailable: ['This activity isn’t available in this browser.', 'هذا النشاط غير متاح في هذا المتصفح.']
      }[band] || ['', '']))}</p>
      <div class="ck-rows">${res.rows.filter(r => !r.unavailable).map((r, i) => {
        const pos = Math.max(0, Math.min(1, 0.5 + (r.z || 0) / 6));
        return `<div class="ck-row ${r.flag ? 'is-flag' : r.watch ? 'is-watch' : ''}" style="--i:${i}">
          <div class="ck-row__h"><span>${esc(P(r.en, r.ar))}</span><b class="mono">${fmt(r.value, r.unit)}</b></div>
          <div class="ck-row__bar"><i class="ck-row__typ"></i><em style="--pos:${pos}"></em></div>
          <small>${T('Typical', 'المعتاد')}: ~${fmt(r.mean, r.unit)} · ${r.flag ? T('stood out', 'بارز') : r.watch ? T('a little outside typical', 'خارج المعتاد قليلاً') : T('in range', 'ضمن النطاق')}</small></div>`;
      }).join('')}</div>
      ${res.short ? `<p class="muted ck-small">${T('Short demo version — less reliable than the full one.', 'نسخة قصيرة — أقل موثوقية من الكاملة.')}</p>` : ''}
      <p class="muted ck-small">${T('The marker shows where you landed; the shaded middle is the typical range. Reference values are demo placeholders, not validated norms. This is not a diagnosis.', 'يوضح المؤشر موقعك؛ والجزء المظلل في الوسط هو النطاق المعتاد. القيم المرجعية تجريبية وليست معايير معتمدة. هذا ليس تشخيصاً.')}</p>
      <div class="ck-res__btns"><button class="btn btn--accent" data-done>${MODE === 'quest' ? T('Back to the quest', 'العودة إلى المهمة') : T('Back to check-ins', 'العودة إلى الفحوصات')}</button><button class="btn btn--ghost" data-redo>${T('Play again', 'العب مجدداً')}</button></div>
    </div>`);
    $('[data-done]', stage()).onclick = close;
    $('[data-redo]', stage()).onclick = () => intro(k);
    $('[data-done]', stage()).focus({ preventScroll: true });
    if (!viewOnly) { sfx('win'); say(...{
      typical: ['All done! Your results are in the typical range.', 'انتهينا! نتائجك ضمن النطاق المعتاد.'],
      watch: ['All done! One thing stood out a little, but on its own it doesn’t mean anything.', 'انتهينا! برز شيء واحد قليلاً، لكنه وحده لا يعني شيئاً.'],
      notable: ['All done. A few of these stood out together — your combined profile will tell you more.', 'انتهينا. برزت بعض هذه معاً — سيخبرك ملفك المجمّع بالمزيد.'],
      invalid: ['Thanks! I couldn’t get a clear reading this time, so let’s try again later.', 'شكراً! لم أحصل على قراءة واضحة هذه المرة، فلنحاول لاحقاً.'],
      unavailable: ['This one isn’t available here, sorry.', 'هذا غير متاح هنا، عذراً.']
    }[band] || ['Done.', 'تم.']); }
  }

  /* ================= V · speed-reading academic words & a crowded exam code ================= */
  const WORDS = {
    en: { real: ['analysis', 'hypothesis', 'curriculum', 'semester', 'variable', 'framework', 'citation', 'equation', 'molecule', 'literature', 'evaluate', 'theorem'], fake: ['analytine', 'hypothemic', 'curricolate', 'framulate', 'citavion', 'equaphor', 'molectual', 'literance', 'evalinate', 'theorent', 'varibolic', 'acadetric'], practice: [['research', 'real'], ['tutorance', 'fake']] },
    ar: { real: ['محاضرة', 'جامعة', 'بحث', 'مختبر', 'امتحان', 'مقرر', 'دراسة', 'نظرية', 'معادلة', 'تحليل', 'مكتبة', 'مشروع'], fake: ['محاضيرة', 'جاموعة', 'بحلث', 'مختبول', 'امتحوش', 'مقرنص', 'دراسوم', 'نظريلة', 'معادتة', 'تحليوق', 'مكتبوص', 'مشرلوع'], practice: [['فصل', 'real'], ['كتلوم', 'fake']] }
  };
  const LETTERS = 'EFHKLNPRTZ'.split('');
  async function runV() {
    const W = WORDS[L()], n = DB.short ? 6 : 12;
    await brief({ part: T('Part 1 of 2', 'الجزء ١ من ٢'), icon: 'book', art: 'words', artHTML: `<span class="ck-art-word">${esc(W.real[0])}</span><span class="ck-art-word is-fake">${esc(W.fake[0])}</span>`,
      title: ['Speed-read the syllabus', 'اقرأ خطة المقرر بسرعة'],
      steps: [['Words from course readings flash up — some are real, some are invented.', 'تظهر كلمات من قراءات المقررات — بعضها حقيقي وبعضها مختلق.'], ['Real word → tap <b>Real</b> (or press F). Invented → tap <b>Invented</b> (or J).', 'كلمة حقيقية ← اضغط <b>حقيقية</b> (أو F). مختلقة ← اضغط <b>مختلقة</b> (أو J).'], ['Be quick but accurate. Two practice words first.', 'أسرع مع الدقة. كلمتان للتدريب أولاً.']],
      say: ['Real word or invented? Be quick but accurate. Two practice words first.', 'كلمة حقيقية أم مختلقة؟ أسرع مع الدقة. كلمتان للتدريب أولاً.'] });
    const btns = [{ id: 'real', key: 'f', label: P('Real', 'حقيقية') }, { id: 'fake', key: 'j', label: P('Invented', 'مختلقة') }];
    const trial = async (w, i, total) => {
      H(`${hudHTML()}<div class="ck-slide"><span class="ck-slide__n mono">${i != null ? `${i + 1}/${total}` : T('practice', 'تدريب')}</span><div class="ck-fix">+</div></div>`); await wait(380);
      H(`${hudHTML()}<div class="ck-slide is-on"><span class="ck-slide__n mono">${i != null ? `${i + 1}/${total}` : T('practice', 'تدريب')}</span><div class="ck-word" lang="${L()}">${esc(w)}</div></div>`);
      return choose(btns, { timeout: 4000, focus: false, fast: true, cls: 'ck-choices--two' });
    };
    for (const [w, ans] of W.practice) { const r = await trial(w); H(`<div class="ck-fb ${r.id === ans ? 'ok' : ''}">${r.id === ans ? T('Right!', 'صحيح!') : ans === 'real' ? T('That one was a real word.', 'تلك كانت كلمة حقيقية.') : T('That one was invented.', 'تلك كانت مختلقة.')}</div>`); await wait(800); }
    H(`<div class="ck-fb ok">${T('Now for real…', 'والآن بشكل فعلي…')}</div>`); await wait(700);
    const items = shuffle(W.real.slice(0, n).map(w => [w, 'real']).concat(W.fake.slice(0, n).map(w => [w, 'fake'])));
    const res = []; let antic = 0;
    for (let i = 0; i < items.length; i++) {
      prog(i / items.length * 0.6);
      const r = await trial(items[i][0], i, items.length);
      if (r.id && r.rt < 200) antic++;
      const ok = r.id === items[i][1];
      res.push({ ok, rt: r.rt, timeout: !r.id });
      hudHit(ok, $('.ck-slide', stage()));
    }
    await partDone(T('Part 1 done!', 'انتهى الجزء ١!'));
    await brief({ part: T('Part 2 of 2', 'الجزء ٢ من ٢'), icon: 'eye', art: 'crowd', artHTML: `<span class="ck-art-crowd">K<b>R</b>T</span>`,
      title: ['Exam-paper code check', 'التحقق من رمز ورقة الامتحان'],
      steps: [['A seat code flashes for a split second.', 'يومض رمز المقعد لجزء من الثانية.'], ['Pick the letter that was <b>in the middle</b>.', 'اختر الحرف الذي كان <b>في الوسط</b>.'], ['Sometimes other letters are squeezed in close — that’s the point.', 'أحياناً تكون حروف أخرى متلاصقة — هذا هو المقصود.']],
      say: ['Pick the letter that was in the middle.', 'اختر الحرف الذي كان في الوسط.'] });
    const m = DB.short ? 4 : 8;
    const conds = shuffle(Array(m).fill('spaced').concat(Array(m).fill('crowded')));
    const cr = { spaced: [0, 0], crowded: [0, 0] };
    for (let i = 0; i < conds.length; i++) {
      prog(0.6 + i / conds.length * 0.4);
      const tgt = LETTERS[rnd(0, LETTERS.length - 1)];
      const others = shuffle(LETTERS.filter(x => x !== tgt));
      const fl = [others[0], others[1], others[2], others[3]];
      H(`${hudHTML()}<div class="ck-ticket"><small class="mono">SEAT</small><div class="ck-fix">+</div></div>`); await wait(450);
      H(`${hudHTML()}<div class="ck-ticket"><small class="mono">SEAT</small><div class="ck-crowd ck-crowd--${conds[i]}" aria-hidden="true"><span>${fl[0]}</span><span>${fl[1]}</span><b>${tgt}</b><span>${fl[2]}</span><span>${fl[3]}</span></div></div>`);
      await wait(220);
      H(`${hudHTML()}<div class="ck-ticket"><small class="mono">SEAT</small><div class="ck-crowd ck-crowd--mask" aria-hidden="true">▒▒▒▒▒</div></div><p class="ck-hint">${T('Which letter was in the middle?', 'أي حرف كان في الوسط؟')}</p>`);
      const opts = shuffle([tgt, others[4], others[5], others[6]]);
      const r = await choose(opts.map(x => ({ id: x, label: x })), { timeout: 6000, cls: 'ck-choices--letters' });
      const ok = r.id === tgt;
      cr[conds[i]][0] += ok ? 1 : 0; cr[conds[i]][1]++;
      hudHit(ok, $('.ck-ticket', stage()));
      await wait(150);
    }
    const correct = res.filter(r => r.ok);
    return {
      metrics: { ldAcc: correct.length / res.length, ldRT: C.median(correct.map(r => r.rt)), crowdCost: cr.spaced[0] / cr.spaced[1] - cr.crowded[0] / cr.crowded[1] },
      validity: { trials: res.length, anticipations: antic, complete: res.filter(r => r.timeout).length < res.length / 2, random: correct.length / res.length <= 0.62 && C.median(res.map(r => r.rt)) < 450 }
    };
  }

  /* ================= U · campus announcements, in quiet and in a busy café ================= */
  const LISTEN = {
    en: [
      ['The library closes at six on Fridays, but at nine on every other weekday.', 'When does the library close on Friday?', ['At six', 'At nine', 'At eight']],
      ['Bring your calculator and two pencils to the chemistry lab on Tuesday morning.', 'What should you bring?', ['A calculator and two pencils', 'A laptop and a notebook', 'A calculator and a pen']],
      ['Maya finished the lab report before dinner, then emailed it to her group.', 'What did Maya do after finishing?', ['Emailed it to her group', 'Printed it', 'Submitted it online']],
      ['The thermodynamics lecture has moved from room two-oh-four to the main hall in building C.', 'Where is the lecture now?', ['The main hall in building C', 'Room 204', 'Building B']],
      ['Your midterm has fifteen questions, and you have twenty minutes to finish it.', 'How many questions are there?', ['Fifteen', 'Twenty', 'Fifty']],
      ['Submit the first draft on Sunday, and the final version two weeks later.', 'When is the final version due?', ['Two weeks after Sunday', 'On Sunday', 'One week later']]
    ],
    ar: [
      ['تُغلق المكتبة في السادسة يوم الجمعة، وفي التاسعة في باقي أيام الأسبوع.', 'متى تُغلق المكتبة يوم الجمعة؟', ['في السادسة', 'في التاسعة', 'في الثامنة']],
      ['أحضر الآلة الحاسبة وقلمي رصاص إلى مختبر الكيمياء صباح الثلاثاء.', 'ماذا يجب أن تُحضر؟', ['آلة حاسبة وقلمي رصاص', 'حاسوباً ودفتراً', 'آلة حاسبة وقلماً']],
      ['أنهت مايا تقرير المختبر قبل العشاء، ثم أرسلته إلى مجموعتها.', 'ماذا فعلت مايا بعد أن أنهت التقرير؟', ['أرسلته إلى مجموعتها', 'طبعته', 'سلّمته إلكترونياً']],
      ['انتقلت محاضرة الديناميكا الحرارية من القاعة مئتين وأربعة إلى القاعة الرئيسية في المبنى ج.', 'أين المحاضرة الآن؟', ['القاعة الرئيسية في المبنى ج', 'القاعة ٢٠٤', 'المبنى ب']],
      ['في اختبار منتصف الفصل خمسة عشر سؤالاً، ولديك عشرون دقيقة لإنهائه.', 'كم عدد الأسئلة؟', ['خمسة عشر', 'عشرون', 'خمسون']],
      ['سلّم المسودة الأولى يوم الأحد، والنسخة النهائية بعد أسبوعين.', 'متى موعد النسخة النهائية؟', ['بعد أسبوعين من الأحد', 'يوم الأحد', 'بعد أسبوع']]
    ]
  };
  let noise = null;
  function startNoise(level) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      const ctx = new AC(), len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // brown noise, like a busy room
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const g = ctx.createGain(); g.gain.value = level;
      src.connect(g); g.connect(ctx.destination); src.start();
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      noise = { ctx, src };
      return true;
    } catch (e) { return false; }
  }
  function stopNoise() { if (noise) { try { noise.src.stop(); noise.ctx.close(); } catch (e) { /* ignore */ } noise = null; } }
  // play one announcement; a "Done listening" button appears in case the speech engine never says it finished
  function listenTo(text, label) {
    H(`<div class="ck-listen ${noise ? 'is-noisy' : ''}"><div class="ck-wave" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="--k:${i}"></i>`).join('')}</div><span class="ck-ear">${ICON('ear')}</span><p>${esc(label)}</p><button class="btn btn--sm btn--ghost ck-listen__done" hidden>${T('I’ve heard it', 'سمعتها')}</button></div>`);
    return new Promise((res, rej) => {
      let ended = false;
      const done = () => { if (ended) return; ended = true; clearTimeout(t); clearTimeout(t2); if (!run || run.aborted) return rej(new Aborted()); res(); };
      const t = setTimeout(done, Math.max(4000, text.length * 95));
      const t2 = setTimeout(() => { const b = $('.ck-listen__done', stage()); if (b) { b.hidden = false; b.onclick = done; } }, 2500);
      try { voice.speak(text, { lang: L(), onend: done, onerror: done, rate: 0.98 }); } catch (e) { done(); }
    });
  }
  async function runU() {
    if (!voice || !voice.supported.tts) return { metrics: {}, validity: { complete: false } };
    const items = LISTEN[L()].slice(0, DB.short ? 4 : 6);
    const half = items.length / 2;
    await brief({ part: T('Part 1 of 2 · quiet', 'الجزء ١ من ٢ · هدوء'), icon: 'ear', art: 'wave', artHTML: `<div class="ck-wave ck-wave--demo">${Array.from({ length: 14 }, (_, i) => `<i style="--k:${i}"></i>`).join('')}</div>`,
      title: ['Campus announcements', 'إعلانات الحرم الجامعي'],
      steps: [['Turn your volume up to a comfortable level.', 'ارفع الصوت إلى مستوى مريح.'], ['Listen to a short announcement — there’s no text.', 'استمع إلى إعلان قصير — لا يوجد نص.'], ['Answer one question about it. You can replay each one once.', 'أجب عن سؤال واحد عنه. يمكنك إعادة كل إعلان مرة واحدة.']],
      say: ['Listen to each announcement, then answer one question.', 'استمع إلى كل إعلان، ثم أجب عن سؤال واحد.'], go: ['Play the first one', 'شغّل الأول'] });
    let quiet = 0, noisy = 0, replays = 0, noiseOk = true;
    for (let i = 0; i < items.length; i++) {
      prog(i / items.length);
      const [s, q, opts] = items[i];
      if (i === half) {
        await partDone(T('Quiet part done!', 'انتهى جزء الهدوء!'));
        await brief({ part: T('Part 2 of 2 · busy café', 'الجزء ٢ من ٢ · مقهى مزدحم'), icon: 'cup', title: ['Now in a busy café', 'والآن في مقهى مزدحم'],
          steps: [['Same kind of announcements…', 'إعلانات من النوع نفسه…'], ['…but with background chatter, like the campus café at lunchtime.', '…لكن مع ضجيج خلفي، كمقهى الحرم وقت الغداء.']], say: ['Now with background noise, like a busy café.', 'والآن مع ضوضاء خلفية، كمقهى مزدحم.'], go: ['Start the café round', 'ابدأ جولة المقهى'] });
        noiseOk = startNoise(0.16);
      }
      await listenTo(s, T(`Announcement ${i + 1} of ${items.length}…`, `الإعلان ${i + 1} من ${items.length}…`)); guard();
      let picked = null, used = false;
      while (!picked) {
        H(`${hudHTML()}<div class="ck-q"><p class="ck-q__t">${esc(q)}</p></div>`);
        const btns = shuffle(opts.map((o, k) => ({ id: String(k), label: o })));
        if (!used) btns.push({ id: 'replay', html: `${ICON('volume')} ${T('Play again', 'أعد التشغيل')}` });
        const r = await choose(btns, { into: $('.ck-q', stage()), cls: 'ck-choices--list', keep: true });
        if (r.id === 'replay') { used = true; replays++; await listenTo(s, T('Once more…', 'مرة أخرى…')); guard(); }
        else picked = r.id;
      }
      hudHit(picked === '0', $('.ck-q', stage()));
      if (picked === '0') { if (i < half) quiet++; else noisy++; }
      await wait(300);
    }
    stopNoise();
    return { metrics: { quietAcc: quiet / half, noiseCost: noiseOk ? quiet / half - noisy / half : null, replays }, validity: { complete: true } };
  }

  /* ================= M · room codes (working memory) & which hall is fuller (number sense) ================= */
  function keypad(label) {
    H(`<div class="ck-type"><p class="ck-type__l">${esc(label)}</p><div class="ck-type__out mono" dir="ltr" aria-live="polite"><span class="ck-caret"></span></div><div class="ck-pad" dir="ltr">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok'].map(k => `<button type="button" data-k="${k}" class="${k === 'ok' ? 'is-ok' : k === 'del' ? 'is-del' : ''}">${k === 'del' ? '⌫' : k === 'ok' ? T('OK', 'تم') : k}</button>`).join('')}</div></div>`);
    let val = '';
    const out = $('.ck-type__out', stage());
    const draw = () => { out.innerHTML = val.split('').map(c => `<b>${c}</b>`).join('') + '<span class="ck-caret"></span>'; };
    return new Promise((res, rej) => {
      const fin = () => { removeEventListener('keydown', onKey); if (!run || run.aborted) return rej(new Aborted()); res(val); };
      const press = k => { if (k === 'ok') return fin(); if (k === 'del') val = val.slice(0, -1); else if (val.length < 12) val += k; draw(); sfx('tick'); };
      $('.ck-pad', stage()).addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
      const onKey = e => { if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); else if (e.key === 'Enter') press('ok'); };
      addEventListener('keydown', onKey);
    });
  }
  async function spanTask(backward) {
    const trials = []; let len = backward ? 2 : 3;
    const maxLen = DB.short ? (backward ? 6 : 7) : (backward ? 8 : 9);
    while (len <= maxLen) {
      let ok = 0;
      for (let t = 0; t < 2; t++) {
        const digits = []; while (digits.length < len) { const d = rnd(1, 9); if (d !== digits[digits.length - 1]) digits.push(d); }
        H(`${hudHTML()}<div class="ck-door"><small class="mono">${backward ? 'PIN' : T('ROOM', 'القاعة')}</small><div class="ck-digit"></div><div class="ck-door__len">${Array.from({ length: len }, () => '<i></i>').join('')}</div></div>`); await wait(500);
        for (let j = 0; j < digits.length; j++) {
          const box = $('.ck-digit', stage()); if (box) { box.textContent = digits[j]; box.classList.remove('is-pop'); void box.offsetWidth; box.classList.add('is-pop'); }
          $$('.ck-door__len i', stage()).forEach((x, n) => x.classList.toggle('is-on', n <= j));
          await wait(800); if ($('.ck-digit', stage())) $('.ck-digit', stage()).textContent = ''; await wait(200);
        }
        const val = await keypad(backward ? T('Type the PIN backwards', 'اكتب الرمز بالعكس') : T('Type the room code', 'اكتب رمز القاعة'));
        guard();
        const want = (backward ? digits.slice().reverse() : digits).join('');
        const correct = val === want; if (correct) ok++;
        trials.push({ len, correct });
        hudHit(correct, $('.ck-type__out', stage()));
        await wait(250);
      }
      if (!ok) break;
      len++;
    }
    return C.span(trials);
  }
  function seats(n, total) {
    const filled = new Set(shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, n));
    return `<div class="ck-hall"><div class="ck-hall__stage"></div><div class="ck-hall__seats">${Array.from({ length: total }, (_, i) => `<i class="${filled.has(i) ? 'is-on' : ''}"></i>`).join('')}</div></div>`;
  }
  async function runM() {
    await brief({ part: T('Part 1 of 3', 'الجزء ١ من ٣'), icon: 'hash', art: 'digits', artHTML: '<span class="ck-art-digits">4 7 2</span>',
      title: ['Remember the room code', 'تذكّر رمز القاعة'],
      steps: [['A room code appears one digit at a time.', 'يظهر رمز القاعة رقماً تلو الآخر.'], ['Type it back on the keypad, in the same order.', 'اكتبه على لوحة الأرقام بالترتيب نفسه.'], ['Codes get longer each time you get one right.', 'تطول الرموز كلما أصبت.']],
      say: ['Remember the room code, then type it back in the same order.', 'تذكّر رمز القاعة، ثم اكتبه بالترتيب نفسه.'] });
    prog(0.05);
    const fwd = await spanTask(false);
    prog(0.4);
    await partDone(T('Nice memory!', 'ذاكرة رائعة!'));
    await brief({ part: T('Part 2 of 3', 'الجزء ٢ من ٣'), icon: 'lock', art: 'digits', artHTML: '<span class="ck-art-digits">2 7 4</span>',
      title: ['Read the PIN backwards', 'اقرأ الرمز بالعكس'],
      steps: [['Same idea — but type the digits in <b>reverse</b> order.', 'الفكرة نفسها — لكن اكتب الأرقام بترتيب <b>معكوس</b>.'], ['See 4 · 7 · 2 → type 2 · 7 · 4.', 'ترى ٤ · ٧ · ٢ ← اكتب ٢ · ٧ · ٤.']],
      say: ['Now type the digits backwards.', 'والآن اكتب الأرقام بالعكس.'] });
    const bwd = await spanTask(true);
    prog(0.7);
    await partDone(T('Part 2 done!', 'انتهى الجزء ٢!'));
    await brief({ part: T('Part 3 of 3', 'الجزء ٣ من ٣'), icon: 'users', art: 'hall', artHTML: `<span class="ck-art-seats">${Array.from({ length: 12 }, (_, i) => `<i class="${[0, 2, 3, 5, 6, 9, 10].includes(i) ? 'is-on' : ''}" style="--k:${i}"></i>`).join('')}</span><span class="ck-art-seats">${Array.from({ length: 12 }, (_, i) => `<i class="${[1, 4, 8, 11].includes(i) ? 'is-on' : ''}" style="--k:${i}"></i>`).join('')}</span>`,
      title: ['Which lecture hall is fuller?', 'أي قاعة أكثر امتلاءً؟'],
      steps: [['Two lecture halls flash for under a second.', 'تومض قاعتان لأقل من ثانية.'], ['Don’t count — go with your gut: which one has <b>more students</b>?', 'لا تعدّ — اتبع حدسك: أيهما فيها <b>طلبة أكثر</b>؟']],
      say: ['Don’t count. Which hall has more students?', 'لا تعدّ. أي قاعة فيها طلبة أكثر؟'] });
    const n = DB.short ? 8 : 16; let ok = 0, antic = 0;
    const ratios = [0.5, 0.67, 0.75, 0.8, 0.86, 0.9];
    for (let i = 0; i < n; i++) {
      prog(0.7 + i / n * 0.3);
      const big = rnd(12, 22), small = Math.max(5, Math.round(big * ratios[i % ratios.length]));
      const leftMore = Math.random() < 0.5;
      H(`${hudHTML()}<div class="ck-fix">+</div>`); await wait(400);
      H(`${hudHTML()}<div class="ck-halls">${seats(leftMore ? big : small, 30)}${seats(leftMore ? small : big, 30)}</div>`);
      await wait(750);
      $$('.ck-hall__seats', stage()).forEach(c => c.classList.add('is-hid'));
      const r = await choose([{ id: 'left', key: 'ArrowLeft', label: P('← Left hall', 'القاعة اليسرى ←') }, { id: 'right', key: 'ArrowRight', label: P('Right hall →', '→ القاعة اليمنى') }], { timeout: 5000, focus: false, fast: true, cls: 'ck-choices--two' });
      if (r.id && r.rt < 150) antic++;
      const good = !!r.id && (r.id === 'left') === leftMore;
      if (good) ok++;
      $$('.ck-hall__seats', stage()).forEach(c => c.classList.remove('is-hid'));
      hudHit(good, $('.ck-halls', stage()));
      await wait(350);
    }
    return { metrics: { fwdSpan: fwd, bwdSpan: bwd, dotAcc: ok / n }, validity: { trials: n, anticipations: antic } };
  }

  /* ================= E · campus route (switching) & inbox triage (holding back) ================= */
  function trailPositions(n, W, Hh) {
    const pts = []; let tries = 0;
    while (pts.length < n && tries++ < 5000) {
      const x = 34 + Math.random() * (W - 68), y = 34 + Math.random() * (Hh - 68);
      if (pts.every(p => Math.hypot(p.x - x, p.y - y) > 70)) pts.push({ x, y });
    }
    return pts;
  }
  async function trail(labels) {
    H(`${hudHTML()}<div class="ck-trail ck-trail--map"><svg aria-hidden="true"></svg><span class="ck-trail__walker" aria-hidden="true"></span></div>`);
    const box = $('.ck-trail', stage()), svg = $('svg', box), walker = $('.ck-trail__walker', box);
    const W = box.clientWidth, Hh = box.clientHeight;
    const pts = trailPositions(labels.length, W, Hh);
    labels.forEach((l, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ck-node'; b.textContent = l; b.style.left = pts[i].x + 'px'; b.style.top = pts[i].y + 'px'; b.style.setProperty('--i', i); b.dataset.i = i; box.appendChild(b); });
    let next = 0, errors = 0; const t0 = now();
    await new Promise((res, rej) => {
      const on = e => {
        const b = e.target.closest('.ck-node'); if (!b) return;
        e.preventDefault();
        if (!run || run.aborted) { box.removeEventListener('pointerdown', on); return rej(new Aborted()); }
        if (+b.dataset.i === next) {
          b.classList.add('is-done'); sfx('pop');
          walker.style.transform = `translate(${pts[next].x}px, ${pts[next].y}px)`; walker.classList.add('is-on');
          if (next > 0) { const p = pts[next - 1], q = pts[next]; svg.insertAdjacentHTML('beforeend', `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`); }
          next++;
          if (next === labels.length) { box.removeEventListener('pointerdown', on); res(); }
        } else if (!b.classList.contains('is-done')) { errors++; sfx('soft'); b.classList.remove('is-no'); void b.offsetWidth; b.classList.add('is-no'); }
      };
      box.addEventListener('pointerdown', on);
    });
    return { time: (now() - t0) / 1000, errors };
  }
  const SENDERS = { en: ['Registrar', 'Library', 'Study group', 'IT Help Desk', 'Career Centre', 'Sports Club', 'Course TA', 'Housing', 'Student Union', 'Bookshop'], ar: ['شؤون الطلبة', 'المكتبة', 'مجموعة الدراسة', 'الدعم التقني', 'مركز المهن', 'النادي الرياضي', 'مساعد المقرر', 'السكن', 'اتحاد الطلبة', 'المكتبة التجارية'] };
  async function runE() {
    const n = DB.short ? 5 : 6;
    const nums = Array.from({ length: n * 2 }, (_, i) => String(i + 1));
    await brief({ part: T('Part 1 of 3', 'الجزء ١ من ٣'), icon: 'compass', art: 'route', artHTML: '<span class="ck-art-route"><i>1</i><i>2</i><i>3</i></span>',
      title: ['Campus route', 'مسار الحرم الجامعي'],
      steps: [['Stops are scattered on a campus map.', 'المحطات موزعة على خريطة الحرم.'], ['Tap them in order — 1, 2, 3… — as fast as you can.', 'انقرها بالترتيب — ١، ٢، ٣… — بأسرع ما يمكنك.']],
      say: ['Tap the stops in order, as fast as you can.', 'انقر المحطات بالترتيب، بأسرع ما يمكنك.'] });
    prog(0.05);
    const A = await trail(nums);
    const letters = L() === 'ar' ? ['أ', 'ب', 'ت', 'ث', 'ج', 'ح'] : ['A', 'B', 'C', 'D', 'E', 'F'];
    const mix = []; for (let i = 0; i < n; i++) { mix.push(String(i + 1), letters[i]); }
    prog(0.3);
    await partDone(T('Route 1 done!', 'انتهى المسار ١!'));
    await brief({ part: T('Part 2 of 3', 'الجزء ٢ من ٣'), icon: 'compass', art: 'route', artHTML: `<span class="ck-art-route"><i>1</i><i>${letters[0]}</i><i>2</i><i>${letters[1]}</i></span>`,
      title: ['Building and floor', 'المبنى والطابق'],
      steps: [['Now switch between numbers and letters.', 'والآن بدّل بين الأرقام والحروف.'], [`1 → ${letters[0]} → 2 → ${letters[1]} → 3 → ${letters[2]}…`, `١ ← ${letters[0]} ← ٢ ← ${letters[1]} ← ٣ ← ${letters[2]}…`]],
      say: ['Switch between numbers and letters.', 'بدّل بين الأرقام والحروف.'] });
    const B = await trail(mix);
    prog(0.55);
    await partDone(T('Route 2 done!', 'انتهى المسار ٢!'));
    await brief({ part: T('Part 3 of 3', 'الجزء ٣ من ٣'), icon: 'inbox', art: 'inbox', artHTML: `<span class="ck-art-mail">✉</span><span class="ck-art-mail is-dean">⚠</span>`,
      title: ['Inbox triage', 'فرز البريد'],
      steps: [['Emails slide into your inbox, fast.', 'تصل الرسائل إلى بريدك بسرعة.'], ['Tap <b>Archive</b> (or space) for every email…', 'اضغط <b>أرشفة</b> (أو المسافة) لكل رسالة…'], ['…<b>except</b> ones from the <b>Dean’s Office ⚠</b> — leave those!', '…<b>إلا</b> رسائل <b>مكتب العميد ⚠</b> — اتركها!']],
      say: ['Archive every email, except the ones from the Dean’s office.', 'أرشف كل رسالة، إلا رسائل مكتب العميد.'] });
    const N = DB.short ? 24 : 40, snd = SENDERS[L()];
    const seq = shuffle(Array.from({ length: N }, (_, i) => (i < N / 4 ? 'X' : snd[rnd(0, snd.length - 1)])));
    let com = 0, nogo = 0, om = 0, antic = 0; const rts = [];
    H(`${hudHTML()}<div class="ck-gng ck-inbox"><div class="ck-gng__l ck-mail" aria-live="off"></div><button type="button" class="ck-gng__b">${ICON('inbox')} ${T('Archive', 'أرشفة')}</button></div>`);
    const lEl = $('.ck-gng__l', stage()), bEl = $('.ck-gng__b', stage());
    for (let i = 0; i < seq.length; i++) {
      guard(); prog(0.55 + i / seq.length * 0.45);
      const ch = seq[i], dean = ch === 'X';
      lEl.className = 'ck-gng__l ck-mail'; lEl.innerHTML = ''; await wait(380 + Math.random() * 280);
      lEl.innerHTML = `<span class="ck-mail__from">${dean ? '⚠ ' + esc(P('Dean’s Office', 'مكتب العميد')) : esc(ch)}</span><span class="ck-mail__sub">${dean ? esc(P('Important notice', 'إشعار مهم')) : esc(P('Update for students', 'تحديث للطلبة'))}</span>`;
      lEl.classList.add('is-in'); if (dean) lEl.classList.add('is-dean');
      const t0 = now(); let rt = null;
      const press = () => { if (rt == null) { rt = now() - t0; lEl.classList.add(dean ? 'is-wrong' : 'is-gone'); } bEl.classList.add('is-hit'); setTimeout(() => bEl.classList.remove('is-hit'), 120); };
      const onKey = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } };
      addEventListener('keydown', onKey); bEl.onpointerdown = e => { e.preventDefault(); press(); };
      await wait(500); lEl.classList.remove('is-in'); await wait(500);
      removeEventListener('keydown', onKey); bEl.onpointerdown = null;
      if (rt != null && rt < 150) antic++;
      if (dean) { nogo++; if (rt != null) { com++; hudHit(false, lEl); } else hudHit(true, lEl); } else if (rt == null) { om++; hud.combo = 0; } else { rts.push(rt); hudHit(true, lEl); }
    }
    return { metrics: { trailRatio: A.time ? B.time / A.time : null, trailErr: B.errors, commission: com / nogo, rtCV: C.cv(rts) }, validity: { trials: N, anticipations: antic, complete: om < (N - nogo) * 0.6, random: nogo > 0 && com / nogo >= 0.9 } };
  }

  /* ================= P · live lecture captions (sustained attention) ================= */
  const CAPTION_WORDS = { en: ['energy', 'system', 'pressure', 'volume', 'process', 'heat', 'work', 'state', 'cycle', 'entropy', 'model', 'graph', 'result', 'theory', 'data', 'method'], ar: ['طاقة', 'نظام', 'ضغط', 'حجم', 'عملية', 'حرارة', 'شغل', 'حالة', 'دورة', 'نموذج', 'رسم', 'نتيجة', 'نظرية', 'بيانات', 'طريقة', 'قانون'] };
  async function runP() {
    const before = await rate('Before we start: how tired do you feel right now?', 'قبل أن نبدأ: ما مدى شعورك بالتعب الآن؟', 'Fresh', 'نشيط', 'Exhausted', 'منهك');
    await brief({ icon: 'chat', art: 'captions', artHTML: `<span class="ck-art-cap">…heat <b>EXAM</b> energy…</span>`,
      title: ['Live lecture captions', 'ترجمة المحاضرة المباشرة'],
      steps: [['Words from a lecture stream past for a few minutes.', 'تمر كلمات من محاضرة لبضع دقائق.'], [`Tap <b>${P('EXAM', 'امتحان')}!</b> (or space) every time the word <b>${P('EXAM', 'امتحان')}</b> appears.`, `اضغط <b>${P('EXAM', 'امتحان')}!</b> (أو المسافة) كلما ظهرت كلمة <b>${P('EXAM', 'امتحان')}</b>.`], ['Ignore every other word — and stay with it to the end.', 'تجاهل باقي الكلمات — وابقَ مركّزاً حتى النهاية.']],
      say: ['Tap every time you see the word exam. Stay with it to the end.', 'اضغط كلما رأيت كلمة امتحان. ابقَ مركّزاً حتى النهاية.'] });
    const N = DB.short ? 50 : 100, words = CAPTION_WORDS[L()], TARGET = P('EXAM', 'امتحان');
    const trials = []; let fa = 0, antic = 0;
    H(`${hudHTML()}<div class="ck-gng ck-cap"><div class="ck-cap__screen"><span class="ck-cap__live mono">● LIVE · MECH 210</span><div class="ck-gng__l ck-gng__l--num" aria-live="off"></div></div><button type="button" class="ck-gng__b">${esc(TARGET)}!</button></div>`);
    const lEl = $('.ck-gng__l', stage()), bEl = $('.ck-gng__b', stage());
    for (let i = 0; i < N; i++) {
      guard(); prog(i / N);
      const target = Math.random() < 0.2;
      const w = target ? TARGET : words[rnd(0, words.length - 1)];
      lEl.textContent = w; lEl.classList.toggle('is-target', false); lEl.classList.remove('is-pop'); void lEl.offsetWidth; lEl.classList.add('is-pop');
      const t0 = now(); let rt = null;
      const press = () => { if (rt == null) { rt = now() - t0; if (target) lEl.classList.add('is-target'); } bEl.classList.add('is-hit'); setTimeout(() => bEl.classList.remove('is-hit'), 120); };
      const onKey = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } };
      addEventListener('keydown', onKey); bEl.onpointerdown = e => { e.preventDefault(); press(); };
      await wait(400); lEl.textContent = ''; await wait(1100);
      removeEventListener('keydown', onKey); bEl.onpointerdown = null;
      if (rt != null && rt < 120) antic++;
      if (target) { trials.push({ target: true, hit: rt != null, rt }); hudHit(rt != null, bEl); } else { if (rt != null) { fa++; hudHit(false, bEl); } trials.push({ target: false }); }
    }
    const after = await rate('And now — how tired do you feel?', 'والآن — ما مدى شعورك بالتعب؟', 'Fresh', 'نشيط', 'Exhausted', 'منهك');
    const vig = C.vigilance(trials);
    const hits = trials.filter(t => t.target && t.hit).length, tg = trials.filter(t => t.target).length;
    return { metrics: { hitDrop: vig.hitDrop, rtSlow: vig.rtSlow, fatigueRise: after - before }, validity: { trials: N, anticipations: antic, complete: tg ? hits / tg > 0.3 : false }, extra: { falseAlarms: fa } };
  }

  /* ================= O · copy the lecture note & write a short reflection ================= */
  const COPY = { en: 'Clear notes help you remember what the lecturer said and make revising for exams much easier.', ar: 'تساعدك الملاحظات الواضحة على تذكّر ما قاله المحاضر وتجعل المراجعة للاختبارات أسهل بكثير.' };
  const PROMPT = { en: 'Describe your ideal place to study. What does it look and sound like, and why does it help you?', ar: 'صف مكانك المثالي للدراسة. كيف يبدو وكيف تبدو أصواته، ولماذا يساعدك؟' };
  async function runO() {
    await brief({ part: T('Part 1 of 2', 'الجزء ١ من ٢'), icon: 'pen', art: 'write', artHTML: '<span class="ck-art-type">Clear notes help<i></i></span>',
      title: ['Copy the lecture note', 'انسخ ملاحظة المحاضرة'],
      steps: [['Copy one sentence from the slide into the box.', 'انسخ جملة واحدة من الشريحة إلى المربع.'], ['Go at a comfortable speed, then tap Done.', 'اكتب بسرعة مريحة، ثم اضغط «تم».']],
      say: ['Copy the sentence at a comfortable speed.', 'انسخ الجملة بسرعة مريحة.'] });
    const target = COPY[L()];
    H(`<div class="ck-write"><div class="ck-write__slide"><small class="mono">MECH 210 · ${T('Slide 12', 'الشريحة ١٢')}</small><p class="ck-write__src" lang="${L()}">${esc(target)}</p></div><textarea rows="3" spellcheck="false" lang="${L()}" aria-label="${T('Copy the sentence here', 'انسخ الجملة هنا')}"></textarea><button class="btn btn--accent" data-ok>${T('Done', 'تم')}</button></div>`);
    let ta = $('textarea', stage()); ta.focus();
    let first = null, last = null;
    // 'input' fires on iPad soft keyboards, where keydown can be unreliable
    const mark = () => { const t = now(); if (first == null) first = t; last = t; };
    ta.addEventListener('keydown', mark); ta.addEventListener('input', mark);
    await new Promise(res => { $('[data-ok]', stage()).onclick = res; });
    guard();
    const typed = ta.value;
    const mins = first && last > first ? (last - first) / 60000 : null;
    const copyWpm = mins ? (typed.length / 5) / mins : null;
    const copyErr = C.levenshtein(typed.trim(), target) / target.length;
    ta.value = '';
    prog(0.35);
    await partDone(T('Part 1 done!', 'انتهى الجزء ١!'));
    const limit = DB.short ? 60 : 120;
    await brief({ part: T('Part 2 of 2', 'الجزء ٢ من ٢'), icon: 'pen', art: 'write', artHTML: '<span class="ck-art-type">My ideal study spot…<i></i></span>',
      title: ['A two-minute reflection', 'تأمل لدقيقتين'],
      steps: [[`Write in your own words for up to ${limit / 60} minute${limit > 60 ? 's' : ''}.`, `اكتب بكلماتك لمدة ${limit / 60 === 1 ? 'دقيقة' : 'دقيقتين'} كحد أقصى.`], ['Spelling doesn’t matter.', 'الإملاء لا يهم.'], ['Your text is <b>never saved</b> — only word counts and pauses.', '<b>لا يُحفظ نصك أبداً</b> — فقط عدد الكلمات والتوقفات.']],
      say: ['Write in your own words. Spelling doesn’t matter, and your text is never saved.', 'اكتب بكلماتك. الإملاء لا يهم، ولا يُحفظ نصك أبداً.'] });
    H(`<div class="ck-write"><p class="ck-write__src">${esc(PROMPT[L()])}</p><textarea rows="7" lang="${L()}" aria-label="${T('Write here', 'اكتب هنا')}"></textarea><div class="ck-write__foot"><span class="ck-write__ring" style="--f:1"><b data-left>${limit}s</b></span><span class="mono" data-words>0 ${T('words', 'كلمة')}</span><button class="btn btn--accent" data-ok>${T('I’m done', 'انتهيت')}</button></div><p class="muted ck-small">${ICON('lock')} ${T('Not stored — only counts are kept.', 'لا يُحفظ — تُحفظ الأعداد فقط.')}</p></div>`);
    ta = $('textarea', stage()); ta.focus();
    const shown = now(); let start = null, prev = null, keys = 0, dels = 0, pauses = 0, lastLen = 0;
    const step = (isDel) => {
      const t = now();
      if (start == null) start = t;
      if (prev != null && t - prev > 2000) pauses++;
      prev = t; keys++;
      if (isDel) dels++;
    };
    // count from input events so on-screen keyboards work too
    ta.addEventListener('input', () => { const d = ta.value.length - lastLen; lastLen = ta.value.length; step(d < 0); const w = $('[data-words]', stage()); if (w) w.textContent = (ta.value.trim().match(/\S+/g) || []).length + ' ' + T('words', 'كلمة'); });
    await new Promise(res => {
      $('[data-ok]', stage()).onclick = res;
      const iv = setInterval(() => {
        const left = Math.max(0, limit - Math.round((now() - shown) / 1000));
        const el = $('[data-left]', stage()); if (el) el.textContent = left + 's';
        const ring = $('.ck-write__ring', stage()); if (ring) ring.style.setProperty('--f', left / limit);
        prog(0.35 + (1 - left / limit) * 0.65);
        if (!left || !run || run.aborted) { clearInterval(iv); res(); }
      }, 250);
    });
    guard();
    const words = (ta.value.trim().match(/\S+/g) || []).length;
    ta.value = ''; // discard the student's text immediately
    const activeMin = start != null && prev > start ? (prev - start) / 60000 : null;
    return {
      metrics: { copyWpm, composeWpm: activeMin && words ? words / activeMin : null, startLatency: start != null ? (start - shown) / 1000 : limit, longPauses: words ? pauses / words * 100 : null, deleteRatio: keys ? dels / keys : null },
      validity: { complete: words >= 5 && typed.length > target.length * 0.5 }, extra: { copyErr: Math.round(copyErr * 100) / 100, words }
    };
  }

  /* ================= N · find it on the course site ================= */
  const SITE = {
    menu: [['home', 'Home', 'الرئيسية'], ['ann', 'Announcements', 'الإعلانات'], ['mod', 'Modules', 'الوحدات'], ['asg', 'Assignments', 'الواجبات'], ['grd', 'Grades', 'الدرجات'], ['syl', 'Syllabus', 'خطة المقرر'], ['ppl', 'People', 'الأشخاص'], ['hlp', 'Help', 'المساعدة']],
    views: {
      home: [['x-welcome', 'Welcome to MECH 210', 'مرحباً بك في MECH 210'], ['x-week', 'This week: Week 4', 'هذا الأسبوع: الأسبوع ٤']],
      ann: [['x-a1', 'Room change for Thursday', 'تغيير القاعة يوم الخميس'], ['x-a2', 'Quiz 2 results released', 'نشر نتائج الاختبار ٢']],
      mod: [['m-w1', 'Week 1 slides (PDF)', 'شرائح الأسبوع ١'], ['m-w2', 'Week 2 slides (PDF)', 'شرائح الأسبوع ٢'], ['m-w3', 'Week 3 slides (PDF)', 'شرائح الأسبوع ٣'], ['m-w4', 'Week 4 reading', 'قراءة الأسبوع ٤']],
      asg: [['a-l1', 'Lab report 1', 'تقرير المختبر ١'], ['a-l2', 'Lab report 2', 'تقرير المختبر ٢'], ['a-l3', 'Lab report 3 — due 14 Nov', 'تقرير المختبر ٣ — موعده ١٤ نوفمبر'], ['a-p', 'Group project', 'المشروع الجماعي']],
      grd: [['g-q1', 'Quiz 1 · 8/10', 'الاختبار ١ · ٨/١٠'], ['g-q2', 'Quiz 2 · 7/10', 'الاختبار ٢ · ٧/١٠'], ['g-l1', 'Lab report 1 · 17/20', 'تقرير المختبر ١ · ١٧/٢٠']],
      syl: [['s-out', 'Course outcomes', 'مخرجات المقرر'], ['s-oh', 'Office hours: Mon & Wed 2–4 pm', 'الساعات المكتبية: الإثنين والأربعاء ٢–٤ م'], ['s-late', 'Late work policy', 'سياسة التأخير'], ['s-grd', 'Grading breakdown', 'توزيع الدرجات']],
      ppl: [['p-ins', 'Dr. Haddad — instructor', 'د. حداد — المحاضر'], ['p-ta', 'Omar — teaching assistant', 'عمر — مساعد التدريس']],
      hlp: [['h-it', 'IT support', 'الدعم التقني'], ['h-sas', 'Student Accessibility Services', 'خدمات الطلبة']]
    },
    tasks: [
      ['When is Lab report 3 due?', 'متى موعد تسليم تقرير المختبر ٣؟', ['a-l3']],
      ['Open the Week 3 slides.', 'افتح شرائح الأسبوع ٣.', ['m-w3']],
      ['Find your Quiz 2 grade.', 'جِد درجتك في الاختبار ٢.', ['g-q2', 'x-a2']],
      ['Find the instructor’s office hours.', 'جِد الساعات المكتبية للمحاضر.', ['s-oh', 'p-ins']],
      ['Find the late-work policy.', 'جِد سياسة التأخير في التسليم.', ['s-late']]
    ]
  };
  async function runN() {
    await brief({ icon: 'search', art: 'site', artHTML: '<span class="ck-art-site"><i></i><i></i><i></i></span>',
      title: ['Find it on the course site', 'جِده في موقع المقرر'],
      steps: [['Here’s a course page like the one on your LMS.', 'هذه صفحة مقرر مثل نظام التعلّم لديك.'], ['I’ll ask you to find a few things — click around however you normally would.', 'سأطلب منك إيجاد بعض الأشياء — تنقّل كما تفعل عادة.']],
      say: ['Find each thing on the course site, however you normally would.', 'جِد كل شيء في موقع المقرر كما تفعل عادة.'] });
    const tasks = shuffle(SITE.tasks).slice(0, DB.short ? 3 : 5);
    const times = [], wrong = [];
    for (let i = 0; i < tasks.length; i++) {
      prog(i / tasks.length);
      const [en, ar, targets] = tasks[i];
      H(`${hudHTML()}<div class="ck-site"><p class="ck-site__task">${ICON('search')} <span class="mono">${i + 1}/${tasks.length}</span> <b>${esc(P(en, ar))}</b></p>
        <div class="ck-site__win"><div class="ck-site__bar"><i></i><i></i><i></i><span>lms.acubins.example/mech210</span></div><div class="ck-site__body"><nav>${SITE.menu.map(m => `<button type="button" data-v="${m[0]}">${esc(P(m[1], m[2]))}</button>`).join('')}</nav><div class="ck-site__main"><p class="muted">MECH 210 · Thermodynamics I</p></div></div></div></div>`);
      const site = $('.ck-site', stage());
      const t0 = now(); let clicks = 0;
      await new Promise((res, rej) => {
        site.addEventListener('click', function on(e) {
          if (!run || run.aborted) { site.removeEventListener('click', on); return rej(new Aborted()); }
          const v = e.target.closest('[data-v]'), it = e.target.closest('[data-it]');
          if (v) {
            clicks++;
            $$('nav button', site).forEach(b => b.classList.toggle('is-on', b === v));
            $('.ck-site__main', site).innerHTML = `<h4>${esc(P(...SITE.menu.find(m => m[0] === v.dataset.v).slice(1)))}</h4>` + SITE.views[v.dataset.v].map((x, n) => `<button type="button" class="ck-site__it" data-it="${x[0]}" style="--i:${n}">${esc(P(x[1], x[2]))}</button>`).join('');
          }
          if (it) {
            clicks++;
            if (targets.includes(it.dataset.it)) { it.classList.add('is-found'); hudHit(true, it); site.removeEventListener('click', on); setTimeout(res, 550); }
            else { it.classList.remove('is-no'); void it.offsetWidth; it.classList.add('is-no'); sfx('soft'); }
          }
        });
      });
      times.push((now() - t0) / 1000); wrong.push(Math.max(0, clicks - 2));
    }
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    return { metrics: { findTime: mean(times), wrongClicks: mean(wrong) }, validity: { complete: true } };
  }

  /* ================= Q · exam simulator: untimed vs timed ================= */
  function makeItem(type) {
    let q, a, opts;
    if (type === 0) { const s = rnd(2, 9), d = rnd(2, 8); q = P(`What comes next? ${s}, ${s + d}, ${s + 2 * d}, ${s + 3 * d}, …`, `ما التالي؟ ${s}، ${s + d}، ${s + 2 * d}، ${s + 3 * d}، …`); a = s + 4 * d; opts = [a, a + 1, a - d, a + d]; }
    if (type === 1) { const x = rnd(3, 9), y = rnd(3, 9), z0 = rnd(2, 9); q = `${x} × ${y} + ${z0} = ?`; a = x * y + z0; opts = [a, a + x, a - z0, a + 1]; }
    if (type === 2) { const p = [10, 20, 25, 50][rnd(0, 3)], n = rnd(2, 12) * 20; q = P(`A course has ${n} students. ${p}% got an A. How many is that?`, `في مقرر ${n} طالباً. حصل ${p}٪ على امتياز. كم عددهم؟`); a = n * p / 100; opts = [a, a * 2, a / 2, a + 10]; }
    if (type === 3) { const h = rnd(8, 11), m = [10, 20, 40, 50][rnd(0, 3)], d = [35, 45, 50, 55][rnd(0, 3)]; const tot = h * 60 + m + d; const f = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; q = P(`A lecture starts at ${h}:${String(m).padStart(2, '0')} and lasts ${d} minutes. When does it end?`, `تبدأ محاضرة الساعة ${h}:${String(m).padStart(2, '0')} وتستمر ${d} دقيقة. متى تنتهي؟`); a = f(tot); opts = [a, f(tot + 10), f(tot - 10), f(tot + 60)]; }
    if (type === 4) { const b = rnd(4, 9), c = rnd(2, b - 1), e = rnd(4, 9), f2 = rnd(2, e - 1); if (c / b === f2 / e) return makeItem(4); q = P(`Which is the bigger share of the marks: ${c}/${b} or ${f2}/${e}?`, `أيهما حصة أكبر من الدرجات: ${c}/${b} أم ${f2}/${e}؟`); a = c / b > f2 / e ? `${c}/${b}` : `${f2}/${e}`; opts = [`${c}/${b}`, `${f2}/${e}`, P('They’re equal', 'متساويان')]; }
    opts = Array.from(new Set(opts.map(String)));
    return { q, a: String(a), opts: shuffle(opts) };
  }
  async function quizBlock(timed, n, from) {
    let ok = 0, changes = 0, timeouts = 0;
    const types = shuffle([0, 1, 2, 3, 4]).slice(0, n);
    for (let i = 0; i < types.length; i++) {
      prog(from + i / types.length * 0.45);
      const it = makeItem(types[i]);
      H(`${hudHTML()}<div class="ck-q ck-exam"><div class="ck-exam__h"><span class="mono">${T('Question', 'سؤال')} ${i + 1}/${types.length}</span>${timed ? `<span class="ck-exam__clock mono" data-clock>15</span>` : `<span class="mono muted">${T('no timer', 'بلا مؤقت')}</span>`}</div>${timed ? '<div class="ck-timer"><i></i></div>' : ''}<p class="ck-q__t" dir="auto">${esc(it.q)}</p><div class="ck-opts">${it.opts.map((o, k) => `<button type="button" data-o="${esc(o)}" dir="ltr" style="--i:${k}"><i>${'ABCD'[k]}</i>${esc(o)}</button>`).join('')}</div><button type="button" class="btn btn--accent" data-next disabled>${T('Next', 'التالي')}</button></div>`);
      const box = $('.ck-q', stage());
      let clockIv = null;
      if (timed) {
        requestAnimationFrame(() => { const b = $('.ck-timer i', box); if (b) { b.style.transitionDuration = '15s'; b.style.width = '0%'; } });
        const t0 = now(); clockIv = setInterval(() => { const c = $('[data-clock]', box); if (c) { const left = Math.max(0, 15 - Math.floor((now() - t0) / 1000)); c.textContent = left; c.classList.toggle('is-low', left <= 5); } }, 250);
      }
      let sel = null;
      const ans = await new Promise((res, rej) => {
        const to = timed ? setTimeout(() => { timeouts++; res(sel); }, 15000) : null;
        box.addEventListener('click', e => {
          if (!run || run.aborted) { clearTimeout(to); return rej(new Aborted()); }
          const o = e.target.closest('[data-o]');
          if (o) { if (sel != null && sel !== o.dataset.o) changes++; sel = o.dataset.o; $$('[data-o]', box).forEach(b => b.classList.toggle('is-on', b === o)); $('[data-next]', box).disabled = false; sfx('tick'); }
          if (e.target.closest('[data-next]') && sel != null) { clearTimeout(to); res(sel); }
        });
      });
      clearInterval(clockIv);
      const good = ans === it.a;
      if (good) ok++;
      hudHit(good, box);
      await wait(250);
    }
    return { acc: ok / types.length, changes, timeouts };
  }
  async function runQ() {
    const anxiety = await rate('Before we start: how worried do exams usually make you feel?', 'قبل أن نبدأ: إلى أي حد تقلقك الامتحانات عادة؟', 'Not at all', 'أبداً', 'Very worried', 'قلق جداً');
    const n = DB.short ? 3 : 5;
    await brief({ part: T('Round 1 of 2', 'الجولة ١ من ٢'), icon: 'target', art: 'exam', artHTML: '<span class="ck-art-exam">A B C D</span>',
      title: ['Exam simulator — practice round', 'محاكي الامتحان — جولة تدريب'],
      steps: [['Short questions like a quick quiz.', 'أسئلة قصيرة كاختبار سريع.'], ['Take your time — <b>no timer</b> in this round.', 'خذ وقتك — <b>لا مؤقت</b> في هذه الجولة.']],
      say: ['Take your time — no timer in this round.', 'خذ وقتك — لا مؤقت في هذه الجولة.'] });
    const U = await quizBlock(false, n, 0.05);
    await partDone(T('Round 1 done!', 'انتهت الجولة ١!'));
    await brief({ part: T('Round 2 of 2', 'الجولة ٢ من ٢'), icon: 'timer', art: 'exam', artHTML: '<span class="ck-art-exam is-timed">00:15</span>',
      title: ['Exam simulator — timed round', 'محاكي الامتحان — جولة موقوتة'],
      steps: [['Same kind of questions…', 'أسئلة من النوع نفسه…'], ['…but each one has a <b>15-second</b> clock. Do your best.', '…لكن لكل سؤال ساعة <b>١٥ ثانية</b>. ابذل ما بوسعك.']],
      say: ['Same kind of questions, but each one has a clock.', 'أسئلة من النوع نفسه، لكن لكل سؤال ساعة.'] });
    const Tm = await quizBlock(true, n, 0.5);
    return { metrics: { untimedAcc: U.acc, timedDrop: U.acc - Tm.acc, changes: U.changes + Tm.changes, anxiety }, validity: { complete: true }, extra: { timeouts: Tm.timeouts } };
  }

  /* ================= H · help-seeking style (never flags) ================= */
  const HELPQ = [
    ['When you get stuck on coursework, what do you usually do first?', 'عندما تتعثر في واجب دراسي، ماذا تفعل أولاً عادةً؟', [['peer', 'Ask a classmate', 'أسأل زميلاً'], ['online', 'Search online or use an AI tool', 'أبحث في الإنترنت أو أستخدم أداة ذكاء اصطناعي'], ['staff', 'Email or ask the instructor', 'أراسل المحاضر أو أسأله'], ['wait', 'Leave it and come back later', 'أتركه وأعود لاحقاً'], ['alone', 'Keep going on my own', 'أستمر وحدي']]],
    ['How long do you usually wait before asking for help?', 'كم تنتظر عادةً قبل أن تطلب المساعدة؟', [['now', 'Straight away', 'فوراً'], ['days', 'A day or two', 'يوماً أو يومين'], ['deadline', 'Only when the deadline is close', 'فقط عند اقتراب الموعد'], ['rarely', 'I rarely ask', 'نادراً ما أسأل']]],
    ['Which kind of help feels easiest?', 'أي نوع من المساعدة يبدو الأسهل؟', [['person', 'Talking in person', 'الحديث وجهاً لوجه'], ['message', 'Messaging', 'الرسائل'], ['guide', 'Written guides', 'الأدلة المكتوبة'], ['video', 'Short videos', 'مقاطع فيديو قصيرة']]],
    ['What most often stops you asking?', 'ما الذي يمنعك غالباً من السؤال؟', [['bother', 'Not wanting to bother people', 'عدم الرغبة في إزعاج الآخرين'], ['who', 'Not knowing who to ask', 'عدم معرفة من أسأل'], ['judged', 'Worry about being judged', 'القلق من الحكم عليّ'], ['time', 'Time', 'الوقت'], ['nothing', 'Nothing really', 'لا شيء تقريباً']]]
  ];
  async function runH() {
    say('Four quick questions about how you like to get help. There are no right answers.', 'أربعة أسئلة سريعة عن طريقتك في طلب المساعدة. لا توجد إجابات صحيحة.');
    const ans = {};
    for (let i = 0; i < HELPQ.length; i++) {
      prog(i / HELPQ.length);
      const [en, ar, opts] = HELPQ[i];
      H(`<div class="ck-q"><p class="ck-brief__k mono">${i + 1} / ${HELPQ.length}</p><p class="ck-q__t">${esc(P(en, ar))}</p></div>`);
      const r = await choose(opts.map(o => ({ id: o[0], label: P(o[1], o[2]) })), { into: $('.ck-q', stage()), cls: 'ck-choices--list', keep: true });
      ans[i] = r.id;
      await wait(120);
    }
    return { metrics: {}, validity: { complete: true }, extra: ans };
  }
  function showSupportStyle(res) {
    const a = res.extra || {};
    const tips = [];
    if (a[1] === 'deadline' || a[1] === 'rarely') tips.push(['Noor can nudge you to ask early — small questions are welcome long before a deadline.', 'يمكن لنور تذكيرك بالسؤال مبكراً — الأسئلة الصغيرة مرحّب بها قبل الموعد بكثير.']);
    if (a[3] === 'who') tips.push(['The “Get support” section lists exactly who to contact for what.', 'قسم «احصل على الدعم» يوضح بالضبط بمن تتواصل ولأي أمر.']);
    if (a[3] === 'judged' || a[3] === 'bother') tips.push(['Asking for help is part of studying, not a sign of weakness. SAS conversations are confidential.', 'طلب المساعدة جزء من الدراسة، وليس علامة ضعف. محادثات خدمات الطلبة سرية.']);
    if (a[2] === 'message') tips.push(['You can contact SAS by message — no phone call needed.', 'يمكنك التواصل مع خدمات الطلبة برسالة — لا حاجة لمكالمة.']);
    if (a[2] === 'guide' || a[2] === 'video') tips.push(['ERLY will favour written guides and short videos when it suggests tools.', 'سيفضّل إيرلي الأدلة المكتوبة والمقاطع القصيرة عند اقتراح الأدوات.']);
    if (!tips.length) tips.push(['You already reach out in ways that work. Keep it up!', 'أنت تطلب المساعدة بطرق ناجحة بالفعل. استمر!']);
    H(`<div class="ck-res"><div class="ck-res__badge ck-res__badge--typical">${ICON('users')}</div><span class="ck-chip ck-chip--support ck-chip--lg">${P(...BAND.support)}</span><h2>${T('Your support style', 'أسلوبك في طلب الدعم')}</h2>
      <p class="ck-res__lead">${T('This shapes how ERLY and Noor offer help. It never flags anything.', 'يشكّل هذا طريقة تقديم إيرلي ونور للمساعدة. ولا يُشير إلى أي شيء أبداً.')}</p>
      <ul class="ck-tips">${tips.map((t, i) => `<li style="--i:${i}">${esc(P(...t))}</li>`).join('')}</ul>
      <div class="ck-res__btns"><button class="btn btn--accent" data-done>${MODE === 'quest' ? T('Back to the quest', 'العودة إلى المهمة') : T('Back to check-ins', 'العودة إلى الفحوصات')}</button></div></div>`);
    $('[data-done]', stage()).onclick = close;
    sfx('win');
  }

  /* ================= C · everyday university situations ================= */
  const SCEN = [
    ['Asking a question in a 200-seat lecture', 'طرح سؤال في محاضرة من ٢٠٠ مقعد'], ['Emailing a professor you haven’t met', 'مراسلة أستاذ لم تقابله'],
    ['Disagreeing with someone in a group project', 'الاختلاف مع شخص في مشروع جماعي'], ['Presenting your work to the class', 'عرض عملك أمام الصف'],
    ['Joining a study group of strangers', 'الانضمام إلى مجموعة دراسة لا تعرفها'], ['Calling the Registrar’s office', 'الاتصال بمكتب شؤون الطلبة'],
    ['Posting in the course discussion forum', 'النشر في منتدى نقاش المقرر'], ['Asking a classmate for their lecture notes', 'طلب ملاحظات المحاضرة من زميل']
  ];
  async function runC() {
    say('For each situation, tap how comfortable it feels: one is very uncomfortable, five is completely fine.', 'لكل موقف، اختر مدى ارتياحك: واحد غير مريح أبداً، وخمسة مريح تماماً.');
    const list = DB.short ? SCEN.slice(0, 5) : SCEN;
    const vals = [];
    for (let i = 0; i < list.length; i++) {
      prog(i / list.length);
      H(`<div class="ck-q ck-scen" style="--i:${i}"><p class="ck-brief__k mono">${T('Situation', 'موقف')} ${i + 1} / ${list.length}</p><p class="ck-q__t">${esc(P(...list[i]))}</p><div class="ck-scale-lbl"><span>😟 ${T('Very uncomfortable', 'غير مريح أبداً')}</span><span>${T('Completely fine', 'مريح تماماً')} 😊</span></div></div>`);
      const r = await choose([1, 2, 3, 4, 5].map(n => ({ id: String(n), label: String(n) })), { into: $('.ck-q', stage()), cls: 'ck-choices--scale', keep: true });
      vals.push(+r.id);
      await wait(150);
    }
    return { metrics: { comfort: vals.reduce((a, b) => a + b, 0) / vals.length, avoid: vals.filter(v => v <= 2).length * (SCEN.length / list.length) }, validity: { complete: true } };
  }

  function celebrate(k) {
    const q = quest();
    const day = q.days.find(d => d.ks.includes(k));
    const chip = $('.ck-res .ck-res__badge', ov) || $('.ck-res', ov);
    if (window.FUN && FUN.confetti && chip) FUN.confetti(chip, day && day.done ? 70 : 30);
    const xp = document.createElement('div'); xp.className = 'q-xpfly'; xp.textContent = day && day.done ? '+150 XP · ' + T('Day complete!', 'أنجزت اليوم!') : '+100 XP';
    ov.appendChild(xp); setTimeout(() => xp.remove(), 2200);
  }
  const RUN = { V: runV, U: runU, M: runM, E: runE, P: runP, O: runO, N: runN, Q: runQ, H: runH, C: runC };
  render();
  I18N.onChange(render);
  ERLY.checkins = { open, statuses, synthesize: () => C.synthesize(statuses(), tracking()) };
})();
