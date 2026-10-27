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
  const voice = window.ERLY_VOICE ? ERLY_VOICE.create({ getVoiceName: l => { try { return ((ERLY.companion && ERLY.companion.store.prefs().voices) || {})[l] || ''; } catch (e) { return ''; } } }) : null;
  let muted = false;

  /* ---------------- the activities ---------------- */
  const CATS = window.ERLY_IND.CATS;
  const ACT = {
    V: { min: 3, task: ['Real word or made-up? · Letters in a crowd', 'كلمة حقيقية أم مختلقة؟ · حروف وسط الزحام'], why: ['How quickly and accurately you recognise written words, and whether letters packed close together are harder to see.', 'مدى سرعة ودقة تعرّفك على الكلمات المكتوبة، وهل الحروف المتلاصقة أصعب في الرؤية.'] },
    U: { min: 3, task: ['Listen and answer · in quiet and with background noise', 'استمع وأجب · في الهدوء ومع ضوضاء خلفية'], why: ['How well you catch spoken information, and how much background noise gets in the way.', 'مدى التقاطك للمعلومات المسموعة، ومدى تأثير الضوضاء الخلفية.'], needs: 'tts' },
    M: { min: 3, task: ['Remember the digits · Which has more dots?', 'تذكّر الأرقام · أيهما فيه نقاط أكثر؟'], why: ['How many things you can hold in mind at once (forwards and backwards), and your quick sense of quantity.', 'كم شيئاً يمكنك الاحتفاظ به في ذهنك في آن واحد (للأمام وللخلف)، وإحساسك السريع بالكميات.'] },
    E: { min: 3, task: ['Connect the trail · Tap — but not for X', 'صِل المسار · انقر — إلا عند X'], why: ['Planning and switching between rules, and holding back a response when you need to.', 'التخطيط والتبديل بين القواعد، وكبح الاستجابة عند الحاجة.'] },
    P: { min: 3, task: ['Steady focus · spot the 3', 'تركيز ثابت · التقط الرقم ٣'], why: ['Whether your focus and speed hold steady over a few minutes, or fade.', 'هل يبقى تركيزك وسرعتك ثابتين لبضع دقائق، أم يتراجعان.'] },
    O: { min: 4, task: ['Copy a sentence · Write in your own words', 'انسخ جملة · اكتب بكلماتك'], why: ['How easily words flow from your head to the page — speed, pauses and rewrites. Your text is never stored.', 'مدى سهولة انتقال الكلمات من ذهنك إلى الصفحة — السرعة والتوقفات وإعادة الكتابة. لا يُحفظ نصك أبداً.'] },
    N: { min: 2, task: ['Find it on the course site', 'جِده في موقع المقرر'], why: ['How easily you find your way around a course site to the thing you need.', 'مدى سهولة تنقّلك في موقع المقرر للوصول إلى ما تحتاجه.'] },
    Q: { min: 3, task: ['Quick questions · with and without a timer', 'أسئلة سريعة · مع مؤقت وبدونه'], why: ['Whether a ticking clock changes how well you do, and how much quizzes worry you.', 'هل يغيّر المؤقت أداءك، ومدى قلقك من الاختبارات.'] },
    H: { min: 1, task: ['How you like to get help', 'كيف تحب أن تحصل على المساعدة'], why: ['Shapes the support ERLY offers you. It never flags anything.', 'يشكّل الدعم الذي يقدمه لك إيرلي. لا يُشير إلى أي شيء أبداً.'] },
    C: { min: 2, task: ['Everyday class situations', 'مواقف الصف اليومية'], why: ['How comfortable everyday communication and group work feel for you.', 'مدى ارتياحك للتواصل اليومي والعمل الجماعي.'] }
  };
  const BAND = {
    'not-done': ['Not done yet', 'لم يُنجز بعد'], typical: ['Typical range', 'النطاق المعتاد'], watch: ['Worth a look', 'يستحق نظرة'], notable: ['Notable', 'لافت'],
    invalid: ['Unclear — try again', 'غير واضح — حاول مجدداً'], unavailable: ['Not available here', 'غير متاح هنا'], support: ['Support style saved', 'حُفظ أسلوب الدعم']
  };
  const LEVEL = { stronger: ['Stronger evidence', 'دلائل أقوى'], moderate: ['Some evidence', 'بعض الدلائل'], early: ['Early sign', 'إشارة أولية'] };

  /* ---------------- section ---------------- */
  function render() {
    const st = statuses();
    const syn = C.synthesize(st, tracking());
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
              <p class="ck-ex__ev">${T('Based on', 'بناءً على')}: ${x.domains.map(d => esc(P(CATS[d].en, CATS[d].ar))).join(' · ')}${x.repeated ? ` · ${T('seen on two runs', 'ظهر في محاولتين')}` : ''}${x.trackingAvailable ? (x.agreesWithTracking ? ` · ${T('matches your 28-day tracking', 'يتوافق مع تتبّعك لـ٢٨ يوماً')}` : ` · ${T('not seen in your 28-day tracking', 'لم يظهر في تتبّعك لـ٢٨ يوماً')}`) : ''}</p>
              <ul>${(L() === 'ar' ? x.assessAr : x.assess).map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`).join('')}</div>
            <details class="ck-ordinary"><summary>${T('Everyday things that can cause the same results', 'أمور يومية قد تسبب النتائج نفسها')}</summary><ul>${syn.ordinary.map(o => `<li>${esc(P(o[0], o[1]))}</li>`).join('')}</ul></details>
            <div class="ck-actions"><a class="btn btn--sm btn--accent" href="#handoff">${T('Talk to SAS', 'تحدّث مع خدمات الطلبة')}</a><button class="btn btn--sm btn--ghost" data-ck-download>${T('Download my results (.txt)', 'نزّل نتائجي (.txt)')}</button></div>`
            : `<p class="ck-lead">${T('Nothing stood out across your check-ins — your results sit in the typical range. If something still feels hard, you can always talk to SAS.', 'لم يبرز شيء عبر فحوصاتك — نتائجك ضمن النطاق المعتاد. إن بقي شيء صعباً، يمكنك دائماً التحدث مع خدمات الطلبة.')}</p><div class="ck-actions"><button class="btn btn--sm btn--ghost" data-ck-download>${T('Download my results (.txt)', 'نزّل نتائجي (.txt)')}</button></div>`}
        <details class="ck-acc"><summary>${T('How accurate is this?', 'ما مدى دقة هذا؟')}</summary>
          <p>${T('Each activity is modelled on a well-known screening task — lexical decision, visual crowding, speech-in-noise, digit span, dot comparison, Trail Making A/B, go/no-go, a continuous-performance task, copy vs free writing, timed vs untimed items. ERLY looks for several measures agreeing, re-runs that repeat, and agreement with your own 28-day tracking before it suggests anything, which makes it far more careful than any single test.', 'كل نشاط مستوحى من مهمة فحص معروفة — قرار الكلمات، والازدحام البصري، والكلام وسط الضوضاء، وسعة الأرقام، ومقارنة النقاط، واختبار المسارات أ/ب، والاستجابة/الكبح، ومهمة الأداء المستمر، والنسخ مقابل الكتابة الحرة، والأسئلة مع المؤقت وبدونه. يبحث إيرلي عن اتفاق عدة مقاييس، وتكرار النتيجة عند الإعادة، وتوافقها مع تتبّعك لـ٢٨ يوماً قبل أن يقترح أي شيء.')}</p>
          <p>${T('But no online activity can identify a condition with doctor-level accuracy. The reference ranges here are demo values, not validated norms; device, sleep, mood and language all move the results. Only a qualified assessment can confirm a learning difference or any other condition — that’s why the result is always “worth exploring with SAS”, never a label.', 'لكن لا يمكن لأي نشاط عبر الإنترنت تحديد حالة بدقة الطبيب. نطاقات المقارنة هنا قيم تجريبية وليست معايير معتمدة؛ والجهاز والنوم والمزاج واللغة تؤثر جميعها في النتائج. وحده التقييم المتخصص يمكنه تأكيد اختلاف تعلّم أو أي حالة أخرى — لذلك تكون النتيجة دائماً «تستحق الاستكشاف مع خدمات الطلبة»، وليست تصنيفاً.')}</p></details>
        <div class="ck-foot">
          <label class="switch-row switch-row--inline"><span><b>${T('Short demo versions', 'نسخ تجريبية قصيرة')}</b><small>${T('Half-length activities for a quick demo — less reliable.', 'أنشطة بنصف الطول لعرض سريع — أقل موثوقية.')}</small></span><input type="checkbox" id="ckShort" ${DB.short ? 'checked' : ''}><i></i></label>
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
  app.addEventListener('change', e => { if (e.target.id === 'ckShort') { DB.short = e.target.checked; save(); render(); } });

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
  function say(en, ar, o = {}) {
    const text = P(en, ar);
    const el = $('#ckSay', ov); if (el) { el.textContent = text; el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in'); }
    const orb = $('#ckOrb', ov);
    if (!voice || !voice.supported.tts || (muted && !o.force)) return o.wait ? wait(Math.min(2400, 400 + text.length * 25)) : Promise.resolve();
    const p = new Promise(res => {
      if (orb) orb.parentElement.dataset.s = 'speaking';
      const done = () => { clearTimeout(safety); if (orb) orb.parentElement.dataset.s = 'idle'; res(); };
      const safety = setTimeout(done, Math.max(5000, text.length * 110)); // never hang on a stuck speech engine
      voice.speak(text, { lang: L(), onend: done, onerror: done });
    });
    return o.wait ? p.then(() => guard()) : (p.catch(() => {}), Promise.resolve());
  }
  // wait for a button / key; resolves { id, rt } or { id: null } on timeout
  function choose(btns, o = {}) {
    return new Promise((res, rej) => {
      const t0 = now();
      let done = false, to = null;
      const finish = id => { if (done) return; done = true; clearTimeout(to); removeEventListener('keydown', onKey); box.remove(); if (!run || run.aborted) return rej(new Aborted()); res({ id, rt: now() - t0 }); };
      const box = document.createElement('div');
      box.className = 'ck-choices ' + (o.cls || '');
      box.innerHTML = btns.map(b => `<button type="button" data-id="${esc(b.id)}">${b.key ? `<kbd>${esc(b.key.toUpperCase())}</kbd>` : ''}<span>${b.html || esc(b.label)}</span></button>`).join('');
      box.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); finish(b.dataset.id); } });
      box.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button')) { e.preventDefault(); finish(e.target.closest('button').dataset.id); } });
      const onKey = e => { const b = btns.find(x => x.key && x.key.toLowerCase() === e.key.toLowerCase()); if (b) { e.preventDefault(); finish(b.id); } };
      addEventListener('keydown', onKey);
      (o.into || stage()).appendChild(box);
      if (o.timeout) to = setTimeout(() => finish(null), o.timeout);
      if (o.focus !== false) { const f = box.querySelector('button'); f && f.focus({ preventScroll: true }); }
    });
  }
  const H = html => { stage().innerHTML = html; };
  async function rate(qEn, qAr, lowEn, lowAr, highEn, highAr) {
    H(`<div class="ck-q"><p class="ck-q__t">${esc(P(qEn, qAr))}</p></div>`);
    const r = await choose([1, 2, 3, 4, 5].map(n => ({ id: String(n), label: String(n) })), { cls: 'ck-choices--scale', into: $('.ck-q', stage()) });
    return +r.id;
  }

  /* ---------------- intro & results ---------------- */
  function intro(k) {
    const a = ACT[k], cat = CATS[k];
    const unavailable = a.needs === 'tts' && !(voice && voice.supported.tts);
    H(`<div class="ck-intro">
        <span class="ck-intro__ic">${ICON(cat.icon)}</span>
        <h2>${esc(P(...a.task))}</h2>
        <p>${esc(P(...a.why))}</p>
        <ul class="ck-intro__list">
          <li>${ICON('clock')} ${T(`About ${DB.short ? Math.max(1, Math.round(a.min / 2)) : a.min} minutes${DB.short ? ' (short demo version)' : ''}`, `نحو ${DB.short ? Math.max(1, Math.round(a.min / 2)) : a.min} دقائق${DB.short ? ' (نسخة قصيرة)' : ''}`)}</li>
          <li>${ICON('lock')} ${T('Private — results stay on this device and are only shared if you choose.', 'خاص — تبقى النتائج على هذا الجهاز ولا تُشارك إلا إن اخترت.')}</li>
          <li>${ICON('sprout')} ${T('Not a test you pass or fail. Do it when you’re rested, somewhere quiet.', 'ليس اختباراً تنجح فيه أو ترسب. أنجزه وأنت مرتاح، في مكان هادئ.')}</li>
        </ul>
        ${unavailable ? `<p class="ck-warn">${T('This one needs your browser’s read-aloud voice, which isn’t available here. Try Chrome, Edge or Safari.', 'يحتاج هذا إلى صوت القراءة في متصفحك، وهو غير متاح هنا. جرّب كروم أو إيدج أو سفاري.')}</p>` : `<button class="btn btn--accent btn--big" data-go>${T('I’m ready', 'أنا مستعد')}</button>`}
      </div>`);
    const go = $('[data-go]', stage());
    if (go) { go.focus({ preventScroll: true }); go.onclick = () => start(k); }
    prog(0);
    const mins = DB.short ? Math.max(1, Math.round(a.min / 2)) : a.min;
    say(`Hi! This one takes about ${mins} minute${mins > 1 ? 's' : ''}. ${P(...a.why)} Whenever you’re ready, tap I’m ready.`, `أهلاً! يستغرق هذا نحو ${mins} دقائق. ${P(...a.why)} عندما تكون مستعداً، اضغط «أنا مستعد».`);
  }
  async function start(k) {
    run = { k, aborted: false, away: 0, awayAt: 0, t0: now() };
    try {
      const out = await RUN[k]();
      guard();
      const dur = now() - run.t0;
      const res = C.scoreRun(k, out.metrics, Object.assign({ durationMs: dur, awayMs: run.away }, out.validity || {}));
      res.metrics = out.metrics; res.extra = out.extra || null; res.short = DB.short; res.lang = L();
      DB.history[k] = (DB.history[k] || []).concat([res]).slice(-3); save();
      run = null;
      showResult(k, res);
    } catch (e) {
      if (!(e instanceof Aborted)) { console.error(e); H(`<p class="ck-warn">${T('Something went wrong — please try again.', 'حدث خطأ — حاول مجدداً.')}</p>`); }
      run = null;
      stopNoise();
    }
  }
  function showResult(k, res, viewOnly) {
    prog(1);
    const cat = CATS[k];
    const band = res.band;
    if (k === 'H') return showSupportStyle(res);
    H(`<div class="ck-res">
      <span class="ck-chip ck-chip--${band} ck-chip--lg">${P(...BAND[band])}</span>
      <h2>${esc(P(cat.en, cat.ar))}</h2>
      <p class="ck-res__lead">${esc(P(...{
        typical: ['Your results sit in the typical range today. Nice.', 'نتائجك ضمن النطاق المعتاد اليوم. جميل.'],
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
      <div class="ck-res__btns"><button class="btn btn--accent" data-done>${T('Back to check-ins', 'العودة إلى الفحوصات')}</button><button class="btn btn--ghost" data-redo>${T('Do it again', 'أعد المحاولة')}</button></div>
    </div>`);
    $('[data-done]', stage()).onclick = close;
    $('[data-redo]', stage()).onclick = () => intro(k);
    $('[data-done]', stage()).focus({ preventScroll: true });
    if (!viewOnly) say(...{
      typical: ['All done! Your results are in the typical range. Thanks for doing that.', 'انتهينا! نتائجك ضمن النطاق المعتاد. شكراً لك.'],
      watch: ['All done, thank you! One thing stood out a little, but on its own it doesn’t mean anything.', 'انتهينا، شكراً لك! برز شيء واحد قليلاً، لكنه وحده لا يعني شيئاً.'],
      notable: ['All done, thank you. A few of these stood out together. Have a look at your combined profile after a few more check-ins.', 'انتهينا، شكراً لك. برزت بعض هذه معاً. ألقِ نظرة على ملفك المجمّع بعد بضعة فحوصات أخرى.'],
      invalid: ['Thanks! I couldn’t get a clear reading this time, so let’s try again later.', 'شكراً! لم أحصل على قراءة واضحة هذه المرة، فلنحاول لاحقاً.'],
      unavailable: ['This one isn’t available here, sorry.', 'هذا غير متاح هنا، عذراً.']
    }[band] || ['Done.', 'تم.']);
  }

  /* ================= V · word recognition & crowding ================= */
  const WORDS = {
    en: { real: ['planet', 'garden', 'window', 'simple', 'number', 'market', 'silver', 'doctor', 'island', 'pencil', 'rabbit', 'travel'], fake: ['frandle', 'molpet', 'tranic', 'glimber', 'strope', 'drimble', 'splont', 'wintle', 'harbet', 'plosten', 'merdle', 'quinet'], practice: [['table', 'real'], ['brintel', 'fake']] },
    ar: { real: ['كتاب', 'مدرسة', 'شمس', 'قلم', 'بيت', 'سيارة', 'حديقة', 'نافذة', 'طريق', 'سماء', 'باب', 'مكتبة'], fake: ['مرتسة', 'شبلم', 'قنمور', 'بيلت', 'سمتار', 'حدنقة', 'نفاذل', 'طرسيق', 'سموخ', 'بلاض', 'مكبلة', 'دفتوس'], practice: [['قمر', 'real'], ['كتلوم', 'fake']] }
  };
  const LETTERS = 'EFHKLNPRTZ'.split('');
  async function runV() {
    const W = WORDS[L()], n = DB.short ? 6 : 12;
    await say('First, words. If it’s a real word, press F or tap Real. If it’s made up, press J or tap Made-up. Go fast, but try to be right. Two practice ones first.', 'أولاً، الكلمات. إن كانت كلمة حقيقية اضغط F أو «حقيقية». وإن كانت مختلقة اضغط J أو «مختلقة». أسرع، لكن حاول أن تصيب. أولاً محاولتان للتدريب.', { wait: true });
    const btns = [{ id: 'real', key: 'f', label: P('Real', 'حقيقية') }, { id: 'fake', key: 'j', label: P('Made-up', 'مختلقة') }];
    const trial = async (w) => {
      H(`<div class="ck-fix">+</div>`); await wait(450);
      H(`<div class="ck-word" lang="${L()}">${esc(w)}</div>`);
      return choose(btns, { timeout: 4000, focus: false });
    };
    for (const [w, ans] of W.practice) { const r = await trial(w); H(`<div class="ck-fb ${r.id === ans ? 'ok' : ''}">${r.id === ans ? T('Right!', 'صحيح!') : ans === 'real' ? T('That one was a real word.', 'تلك كانت كلمة حقيقية.') : T('That one was made up.', 'تلك كانت مختلقة.')}</div>`); await wait(900); }
    await say('Great. Now for real.', 'رائع. والآن بشكل فعلي.', { wait: true });
    const items = shuffle(W.real.slice(0, n).map(w => [w, 'real']).concat(W.fake.slice(0, n).map(w => [w, 'fake'])));
    const res = []; let antic = 0;
    for (let i = 0; i < items.length; i++) {
      prog(i / items.length * 0.6);
      const r = await trial(items[i][0]);
      if (r.id && r.rt < 200) antic++;
      res.push({ ok: r.id === items[i][1], rt: r.rt, timeout: !r.id });
    }
    // crowding
    await say('Now letters. A letter will flash in the middle for a moment. Pick which one it was. Sometimes it has neighbours squeezed in close.', 'والآن الحروف. سيظهر حرف في الوسط للحظة. اختر أي حرف كان. أحياناً تكون بجانبه حروف متلاصقة.', { wait: true });
    const m = DB.short ? 4 : 8;
    const conds = shuffle(Array(m).fill('spaced').concat(Array(m).fill('crowded')));
    const cr = { spaced: [0, 0], crowded: [0, 0] };
    for (let i = 0; i < conds.length; i++) {
      prog(0.6 + i / conds.length * 0.4);
      const tgt = LETTERS[rnd(0, LETTERS.length - 1)];
      const others = shuffle(LETTERS.filter(x => x !== tgt));
      const fl = [others[0], others[1], others[2], others[3]];
      H(`<div class="ck-fix">+</div>`); await wait(500);
      H(`<div class="ck-crowd ck-crowd--${conds[i]}" aria-hidden="true"><span>${fl[0]}</span><span>${fl[1]}</span><b>${tgt}</b><span>${fl[2]}</span><span>${fl[3]}</span></div>`);
      await wait(220);
      H(`<div class="ck-crowd ck-crowd--mask" aria-hidden="true">▒▒▒▒▒</div><p class="ck-hint">${T('Which letter was in the middle?', 'أي حرف كان في الوسط؟')}</p>`);
      const opts = shuffle([tgt, others[4], others[5], others[6]]);
      const r = await choose(opts.map(x => ({ id: x, label: x })), { timeout: 6000, cls: 'ck-choices--letters' });
      cr[conds[i]][0] += r.id === tgt ? 1 : 0; cr[conds[i]][1]++;
    }
    const correct = res.filter(r => r.ok);
    return {
      metrics: { ldAcc: correct.length / res.length, ldRT: C.median(correct.map(r => r.rt)), crowdCost: cr.spaced[0] / cr.spaced[1] - cr.crowded[0] / cr.crowded[1] },
      validity: { trials: res.length, anticipations: antic, complete: res.filter(r => r.timeout).length < res.length / 2, random: correct.length / res.length <= 0.62 && C.median(res.map(r => r.rt)) < 450 }
    };
  }

  /* ================= U · listening in quiet and noise ================= */
  const LISTEN = {
    en: [
      ['The library closes at six on Fridays, but at nine on every other weekday.', 'When does the library close on Friday?', ['At six', 'At nine', 'At eight']],
      ['Bring your calculator and two pencils to the lab on Tuesday morning.', 'What should you bring?', ['A calculator and two pencils', 'A laptop and a notebook', 'A calculator and a pen']],
      ['Maya finished the report before dinner, then emailed it to her group.', 'What did Maya do after finishing?', ['Emailed it to her group', 'Printed it', 'Had lunch']],
      ['The lecture has moved from room two-oh-four to the main hall in building C.', 'Where is the lecture now?', ['The main hall in building C', 'Room 204', 'Building B']],
      ['Your quiz has fifteen questions, and you have twenty minutes to finish it.', 'How many questions are there?', ['Fifteen', 'Twenty', 'Fifty']],
      ['Submit the first draft on Sunday, and the final version two weeks later.', 'When is the final version due?', ['Two weeks after Sunday', 'On Sunday', 'One week later']]
    ],
    ar: [
      ['تُغلق المكتبة في السادسة يوم الجمعة، وفي التاسعة في باقي أيام الأسبوع.', 'متى تُغلق المكتبة يوم الجمعة؟', ['في السادسة', 'في التاسعة', 'في الثامنة']],
      ['أحضر الآلة الحاسبة وقلمي رصاص إلى المختبر صباح الثلاثاء.', 'ماذا يجب أن تُحضر؟', ['آلة حاسبة وقلمي رصاص', 'حاسوباً ودفتراً', 'آلة حاسبة وقلماً']],
      ['أنهت مايا التقرير قبل العشاء، ثم أرسلته إلى مجموعتها.', 'ماذا فعلت مايا بعد أن أنهت التقرير؟', ['أرسلته إلى مجموعتها', 'طبعته', 'تناولت الغداء']],
      ['انتقلت المحاضرة من القاعة مئتين وأربعة إلى القاعة الرئيسية في المبنى ج.', 'أين المحاضرة الآن؟', ['القاعة الرئيسية في المبنى ج', 'القاعة ٢٠٤', 'المبنى ب']],
      ['في اختبارك خمسة عشر سؤالاً، ولديك عشرون دقيقة لإنهائه.', 'كم عدد الأسئلة؟', ['خمسة عشر', 'عشرون', 'خمسون']],
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
      noise = { ctx, src };
      return true;
    } catch (e) { return false; }
  }
  function stopNoise() { if (noise) { try { noise.src.stop(); noise.ctx.close(); } catch (e) { /* ignore */ } noise = null; } }
  const speakNow = text => new Promise(res => { const t = setTimeout(res, Math.max(6000, text.length * 120)); const done = () => { clearTimeout(t); res(); }; voice.speak(text, { lang: L(), onend: done, onerror: done, rate: 0.98 }); });
  async function runU() {
    if (!voice || !voice.supported.tts) return { metrics: {}, validity: { complete: false } };
    const items = LISTEN[L()].slice(0, DB.short ? 4 : 6);
    const half = items.length / 2;
    await say('I’ll say a short sentence, then ask you about it. There’s no text, so just listen. Turn your volume to a comfortable level. You can replay each one once.', 'سأقول جملة قصيرة، ثم أسألك عنها. لا يوجد نص، فقط استمع. اضبط الصوت على مستوى مريح. يمكنك إعادة كل جملة مرة واحدة.', { wait: true, force: true });
    let quiet = 0, noisy = 0, replays = 0, noiseOk = true;
    for (let i = 0; i < items.length; i++) {
      prog(i / items.length);
      const [s, q, opts] = items[i];
      if (i === half) {
        await say('Now the same kind of thing, but with background noise, like a busy café.', 'والآن الشيء نفسه، لكن مع ضوضاء خلفية، كمقهى مزدحم.', { wait: true, force: true });
        noiseOk = startNoise(0.16);
      }
      H(`<div class="ck-listen"><span class="ck-ear">${ICON('ear')}</span><p>${T('Listen…', 'استمع…')}</p></div>`);
      await wait(500);
      await speakNow(s); guard();
      let picked = null, used = false;
      while (!picked) {
        H(`<div class="ck-q"><p class="ck-q__t">${esc(q)}</p></div>`);
        const btns = shuffle(opts.map((o, k) => ({ id: String(k), label: o })));
        if (!used) btns.push({ id: 'replay', html: `${ICON('volume')} ${T('Play again', 'أعد التشغيل')}` });
        const r = await choose(btns, { into: $('.ck-q', stage()) });
        if (r.id === 'replay') { used = true; replays++; H(`<div class="ck-listen"><span class="ck-ear">${ICON('ear')}</span></div>`); await speakNow(s); guard(); }
        else picked = r.id;
      }
      if (picked === '0') { if (i < half) quiet++; else noisy++; }
    }
    stopNoise();
    return { metrics: { quietAcc: quiet / half, noiseCost: noiseOk ? quiet / half - noisy / half : null, replays }, validity: { complete: true } };
  }

  /* ================= M · digit span & dot comparison ================= */
  async function spanTask(backward) {
    const trials = []; let len = backward ? 2 : 3;
    const maxLen = DB.short ? (backward ? 6 : 7) : (backward ? 8 : 9);
    while (len <= maxLen) {
      let ok = 0;
      for (let t = 0; t < 2; t++) {
        const digits = []; while (digits.length < len) { const d = rnd(1, 9); if (d !== digits[digits.length - 1]) digits.push(d); }
        H(`<div class="ck-fix">+</div>`); await wait(600);
        for (const d of digits) { H(`<div class="ck-digit">${d}</div>`); await wait(800); H(`<div class="ck-digit"></div>`); await wait(200); }
        H(`<form class="ck-type"><label>${backward ? T('Type them in reverse order', 'اكتبها بترتيب معكوس') : T('Type the digits in order', 'اكتب الأرقام بالترتيب')}<input inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="12" dir="ltr"></label><button class="btn btn--accent">${T('OK', 'تم')}</button></form>`);
        const inp = $('input', stage()); inp.focus();
        const val = await new Promise(res => { $('form', stage()).onsubmit = e => { e.preventDefault(); res(inp.value.replace(/\D/g, '')); }; });
        guard();
        const want = (backward ? digits.slice().reverse() : digits).join('');
        const correct = val === want; if (correct) ok++;
        trials.push({ len, correct });
      }
      if (!ok) break;
      len++;
    }
    return C.span(trials);
  }
  function drawDots(cv, n) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, Hh = cv.offsetHeight;
    cv.width = W * dpr; cv.height = Hh * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#222';
    const pts = [];
    let guardN = 0;
    while (pts.length < n && guardN++ < 4000) {
      const r = 3 + Math.random() * 6, x = r + Math.random() * (W - 2 * r), y = r + Math.random() * (Hh - 2 * r);
      if (pts.every(p => Math.hypot(p.x - x, p.y - y) > p.r + r + 3)) pts.push({ x, y, r });
    }
    pts.forEach(p => { g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); });
  }
  async function runM() {
    await say('Digits will appear one at a time. When they’ve gone, type them back in the same order. It starts short and gets longer.', 'ستظهر الأرقام واحداً تلو الآخر. عندما تختفي، اكتبها بالترتيب نفسه. تبدأ قصيرة ثم تطول.', { wait: true });
    prog(0.05);
    const fwd = await spanTask(false);
    prog(0.4);
    await say('Nice. Now the tricky one: type them backwards. So if you see 1, 2, 3, you type 3, 2, 1.', 'أحسنت. والآن الأصعب: اكتبها بالعكس. فإن رأيت ١، ٢، ٣ تكتب ٣، ٢، ١.', { wait: true });
    const bwd = await spanTask(true);
    prog(0.7);
    await say('Last bit. Two groups of dots will flash. Don’t count — just pick the side with more. Use the arrow keys or tap.', 'الجزء الأخير. ستظهر مجموعتان من النقاط بسرعة. لا تعدّ — فقط اختر الجهة الأكثر. استخدم الأسهم أو انقر.', { wait: true });
    const n = DB.short ? 8 : 16; let ok = 0, antic = 0;
    const ratios = [0.5, 0.67, 0.75, 0.8, 0.86, 0.9];
    for (let i = 0; i < n; i++) {
      prog(0.7 + i / n * 0.3);
      const big = rnd(10, 22), small = Math.max(4, Math.round(big * ratios[i % ratios.length]));
      const leftMore = Math.random() < 0.5;
      H(`<div class="ck-fix">+</div>`); await wait(450);
      H(`<div class="ck-dots"><canvas></canvas><canvas></canvas></div>`);
      const [a, b] = $$('canvas', stage());
      drawDots(a, leftMore ? big : small); drawDots(b, leftMore ? small : big);
      await wait(750);
      $$('canvas', stage()).forEach(c => { c.style.visibility = 'hidden'; });
      const r = await choose([{ id: 'left', key: 'ArrowLeft', label: P('← Left', 'اليسار ←') }, { id: 'right', key: 'ArrowRight', label: P('Right →', '→ اليمين') }], { timeout: 5000, focus: false });
      if (r.id && r.rt < 150) antic++;
      if ((r.id === 'left') === leftMore && r.id) ok++;
    }
    return { metrics: { fwdSpan: fwd, bwdSpan: bwd, dotAcc: ok / n }, validity: { trials: n, anticipations: antic } };
  }

  /* ================= E · trail making & go/no-go ================= */
  function trailPositions(n, W, Hh) {
    const pts = []; let tries = 0;
    while (pts.length < n && tries++ < 5000) {
      const x = 30 + Math.random() * (W - 60), y = 30 + Math.random() * (Hh - 60);
      if (pts.every(p => Math.hypot(p.x - x, p.y - y) > 64)) pts.push({ x, y });
    }
    return pts;
  }
  async function trail(labels) {
    H(`<div class="ck-trail"><svg aria-hidden="true"></svg></div>`);
    const box = $('.ck-trail', stage()), svg = $('svg', box);
    const W = box.clientWidth, Hh = box.clientHeight;
    const pts = trailPositions(labels.length, W, Hh);
    labels.forEach((l, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ck-node'; b.textContent = l; b.style.left = pts[i].x + 'px'; b.style.top = pts[i].y + 'px'; b.dataset.i = i; box.appendChild(b); });
    let next = 0, errors = 0; const t0 = now();
    await new Promise((res, rej) => {
      box.addEventListener('pointerdown', function on(e) {
        const b = e.target.closest('.ck-node'); if (!b) return;
        if (!run || run.aborted) { box.removeEventListener('pointerdown', on); return rej(new Aborted()); }
        if (+b.dataset.i === next) {
          b.classList.add('is-done');
          if (next > 0) { const p = pts[next - 1], q = pts[next]; svg.insertAdjacentHTML('beforeend', `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`); }
          next++;
          if (next === labels.length) { box.removeEventListener('pointerdown', on); res(); }
        } else if (!b.classList.contains('is-done')) { errors++; b.classList.remove('is-no'); void b.offsetWidth; b.classList.add('is-no'); }
      });
    });
    return { time: (now() - t0) / 1000, errors };
  }
  async function runE() {
    const n = DB.short ? 5 : 6;
    const nums = Array.from({ length: n * 2 }, (_, i) => String(i + 1));
    await say('Tap the circles in order, one, two, three and so on, as quickly as you can.', 'انقر على الدوائر بالترتيب، واحد، اثنان، ثلاثة وهكذا، بأسرع ما يمكنك.', { wait: true });
    prog(0.05);
    const A = await trail(nums);
    const letters = L() === 'ar' ? ['أ', 'ب', 'ت', 'ث', 'ج', 'ح'] : ['A', 'B', 'C', 'D', 'E', 'F'];
    const mix = []; for (let i = 0; i < n; i++) { mix.push(String(i + 1), letters[i]); }
    prog(0.3);
    await say('Now switch between numbers and letters: one, A, two, B, three, C, and so on.', 'والآن بدّل بين الأرقام والحروف: ١، أ، ٢، ب، ٣، ت، وهكذا.', { wait: true });
    const B = await trail(mix);
    prog(0.55);
    await say('Last part. Letters will flash. Press space or tap the button for every letter, except X. When you see X, hold back.', 'الجزء الأخير. ستظهر حروف بسرعة. اضغط المسافة أو الزر لكل حرف، إلا X. عندما ترى X، توقف.', { wait: true });
    const N = DB.short ? 24 : 40, go = 'ABCDEFGHKLMNPRSTV';
    const seq = shuffle(Array.from({ length: N }, (_, i) => (i < N / 4 ? 'X' : go[rnd(0, go.length - 1)])));
    let com = 0, nogo = 0, om = 0, antic = 0; const rts = [];
    H(`<div class="ck-gng"><div class="ck-gng__l" aria-live="off"></div><button type="button" class="ck-gng__b">${T('Tap', 'انقر')}</button></div>`);
    const lEl = $('.ck-gng__l', stage()), bEl = $('.ck-gng__b', stage());
    for (let i = 0; i < seq.length; i++) {
      guard(); prog(0.55 + i / seq.length * 0.45);
      const ch = seq[i];
      lEl.textContent = ''; await wait(400 + Math.random() * 300);
      lEl.textContent = ch; const t0 = now(); let rt = null;
      const press = () => { if (rt == null) rt = now() - t0; bEl.classList.add('is-hit'); setTimeout(() => bEl.classList.remove('is-hit'), 120); };
      const onKey = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } };
      addEventListener('keydown', onKey); bEl.onpointerdown = e => { e.preventDefault(); press(); };
      await wait(450); lEl.textContent = ''; await wait(550);
      removeEventListener('keydown', onKey); bEl.onpointerdown = null;
      if (rt != null && rt < 150) antic++;
      if (ch === 'X') { nogo++; if (rt != null) com++; } else if (rt == null) om++; else rts.push(rt);
    }
    return { metrics: { trailRatio: A.time ? B.time / A.time : null, trailErr: B.errors, commission: com / nogo, rtCV: C.cv(rts) }, validity: { trials: N, anticipations: antic, complete: om < (N - nogo) * 0.6, random: nogo > 0 && com / nogo >= 0.9 } };
  }

  /* ================= P · continuous performance ================= */
  async function runP() {
    const before = await rate('Before we start: how tired do you feel right now?', 'قبل أن نبدأ: ما مدى شعورك بالتعب الآن؟');
    await say('Numbers will flash one after another for a few minutes. Press space or tap whenever you see a 3. Ignore every other number. Try to stay with it until the end.', 'ستظهر أرقام تباعاً لبضع دقائق. اضغط المسافة أو انقر كلما رأيت الرقم ٣. تجاهل باقي الأرقام. حاول أن تبقى مركّزاً حتى النهاية.', { wait: true });
    const N = DB.short ? 50 : 100;
    const trials = []; let fa = 0, antic = 0;
    H(`<div class="ck-gng"><div class="ck-gng__l ck-gng__l--num" aria-live="off"></div><button type="button" class="ck-gng__b">${T('3!', '٣!')}</button></div>`);
    const lEl = $('.ck-gng__l', stage()), bEl = $('.ck-gng__b', stage());
    for (let i = 0; i < N; i++) {
      guard(); prog(i / N);
      const target = Math.random() < 0.2;
      let d = target ? 3 : rnd(0, 9); if (!target && d === 3) d = 8;
      lEl.textContent = String(d); const t0 = now(); let rt = null;
      const press = () => { if (rt == null) rt = now() - t0; bEl.classList.add('is-hit'); setTimeout(() => bEl.classList.remove('is-hit'), 120); };
      const onKey = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } };
      addEventListener('keydown', onKey); bEl.onpointerdown = e => { e.preventDefault(); press(); };
      await wait(350); lEl.textContent = ''; await wait(1150);
      removeEventListener('keydown', onKey); bEl.onpointerdown = null;
      if (rt != null && rt < 120) antic++;
      if (target) trials.push({ target: true, hit: rt != null, rt }); else { if (rt != null) fa++; trials.push({ target: false }); }
    }
    const after = await rate('And now — how tired do you feel?', 'والآن — ما مدى شعورك بالتعب؟');
    const vig = C.vigilance(trials);
    const hits = trials.filter(t => t.target && t.hit).length, tg = trials.filter(t => t.target).length;
    return { metrics: { hitDrop: vig.hitDrop, rtSlow: vig.rtSlow, fatigueRise: after - before }, validity: { trials: N, anticipations: antic, complete: tg ? hits / tg > 0.3 : false }, extra: { falseAlarms: fa } };
  }

  /* ================= O · copy & compose ================= */
  const COPY = { en: 'Clear notes help you remember what the lecturer said and make revising for exams much easier.', ar: 'تساعدك الملاحظات الواضحة على تذكّر ما قاله المحاضر وتجعل المراجعة للاختبارات أسهل بكثير.' };
  const PROMPT = { en: 'Describe your ideal place to study. What does it look and sound like, and why does it help you?', ar: 'صف مكانك المثالي للدراسة. كيف يبدو وكيف تبدو أصواته، ولماذا يساعدك؟' };
  async function runO() {
    await say('First, copy this sentence into the box at a comfortable speed. Press Done when you finish.', 'أولاً، انسخ هذه الجملة في المربع بسرعة مريحة. اضغط «تم» عند الانتهاء.', { wait: true });
    const target = COPY[L()];
    H(`<div class="ck-write"><p class="ck-write__src" lang="${L()}">${esc(target)}</p><textarea rows="3" spellcheck="false" lang="${L()}" aria-label="${T('Copy the sentence here', 'انسخ الجملة هنا')}"></textarea><button class="btn btn--accent" data-ok>${T('Done', 'تم')}</button></div>`);
    let ta = $('textarea', stage()); ta.focus();
    let first = null, last = null;
    ta.addEventListener('keydown', () => { const t = now(); if (first == null) first = t; last = t; });
    await new Promise(res => { $('[data-ok]', stage()).onclick = res; });
    guard();
    const typed = ta.value;
    const mins = first && last > first ? (last - first) / 60000 : null;
    const copyWpm = mins ? (typed.length / 5) / mins : null;
    const copyErr = C.levenshtein(typed.trim(), target) / target.length;
    ta.value = '';
    prog(0.35);
    await say('Now write in your own words for up to two minutes. Spelling doesn’t matter. Your text is never saved; I only count words and pauses.', 'والآن اكتب بكلماتك لمدة دقيقتين كحد أقصى. الإملاء لا يهم. لا يُحفظ نصك أبداً؛ أنا أعدّ الكلمات والتوقفات فقط.', { wait: true });
    const limit = DB.short ? 60 : 120;
    H(`<div class="ck-write"><p class="ck-write__src">${esc(PROMPT[L()])}</p><textarea rows="7" lang="${L()}" aria-label="${T('Write here', 'اكتب هنا')}"></textarea><div class="ck-write__foot"><span class="mono" data-left>${limit}s</span><button class="btn btn--accent" data-ok>${T('I’m done', 'انتهيت')}</button></div><p class="muted ck-small">${ICON('lock')} ${T('Not stored — only counts are kept.', 'لا يُحفظ — تُحفظ الأعداد فقط.')}</p></div>`);
    ta = $('textarea', stage()); ta.focus();
    const shown = now(); let start = null, prev = null, keys = 0, dels = 0, pauses = 0;
    ta.addEventListener('keydown', e => {
      const t = now();
      if (e.key.length > 1 && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Enter') return;
      if (start == null) start = t;
      if (prev != null && t - prev > 2000) pauses++;
      prev = t; keys++;
      if (e.key === 'Backspace' || e.key === 'Delete') dels++;
    });
    await new Promise(res => {
      $('[data-ok]', stage()).onclick = res;
      const iv = setInterval(() => {
        const left = Math.max(0, limit - Math.round((now() - shown) / 1000));
        const el = $('[data-left]', stage()); if (el) el.textContent = left + 's';
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

  /* ================= N · find it on a course site ================= */
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
    await say('Here’s a pretend course site. I’ll ask you to find a few things. Click around however you normally would.', 'هذا موقع مقرر افتراضي. سأطلب منك إيجاد بعض الأشياء. تنقّل كما تفعل عادة.', { wait: true });
    const tasks = shuffle(SITE.tasks).slice(0, DB.short ? 3 : 5);
    const times = [], wrong = [];
    for (let i = 0; i < tasks.length; i++) {
      prog(i / tasks.length);
      const [en, ar, targets] = tasks[i];
      H(`<div class="ck-site"><p class="ck-site__task">${ICON('search')} <b>${esc(P(en, ar))}</b></p>
        <div class="ck-site__win"><nav>${SITE.menu.map(m => `<button type="button" data-v="${m[0]}">${esc(P(m[1], m[2]))}</button>`).join('')}</nav><div class="ck-site__main"><p class="muted">MECH 210 · Thermodynamics I</p></div></div></div>`);
      const site = $('.ck-site', stage());
      const t0 = now(); let clicks = 0;
      await new Promise((res, rej) => {
        site.addEventListener('click', function on(e) {
          if (!run || run.aborted) { site.removeEventListener('click', on); return rej(new Aborted()); }
          const v = e.target.closest('[data-v]'), it = e.target.closest('[data-it]');
          if (v) {
            clicks++;
            $$('nav button', site).forEach(b => b.classList.toggle('is-on', b === v));
            $('.ck-site__main', site).innerHTML = `<h4>${esc(P(...SITE.menu.find(m => m[0] === v.dataset.v).slice(1)))}</h4>` + SITE.views[v.dataset.v].map(x => `<button type="button" class="ck-site__it" data-it="${x[0]}">${esc(P(x[1], x[2]))}</button>`).join('');
          }
          if (it) {
            clicks++;
            if (targets.includes(it.dataset.it)) { it.classList.add('is-found'); site.removeEventListener('click', on); setTimeout(res, 500); }
            else { it.classList.remove('is-no'); void it.offsetWidth; it.classList.add('is-no'); }
          }
        });
      });
      times.push((now() - t0) / 1000); wrong.push(Math.max(0, clicks - 2));
    }
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    return { metrics: { findTime: mean(times), wrongClicks: mean(wrong) }, validity: { complete: true } };
  }

  /* ================= Q · untimed vs timed questions ================= */
  function makeItem(type) {
    let q, a, opts;
    if (type === 0) { const s = rnd(2, 9), d = rnd(2, 8); q = P(`What comes next? ${s}, ${s + d}, ${s + 2 * d}, ${s + 3 * d}, …`, `ما التالي؟ ${s}، ${s + d}، ${s + 2 * d}، ${s + 3 * d}، …`); a = s + 4 * d; opts = [a, a + 1, a - d, a + d]; }
    if (type === 1) { const x = rnd(3, 9), y = rnd(3, 9), z0 = rnd(2, 9); q = `${x} × ${y} + ${z0} = ?`; a = x * y + z0; opts = [a, a + x, a - z0, a + 1]; }
    if (type === 2) { const p = [10, 20, 25, 50][rnd(0, 3)], n = rnd(2, 12) * 20; q = P(`What is ${p}% of ${n}?`, `كم يساوي ${p}٪ من ${n}؟`); a = n * p / 100; opts = [a, a * 2, a / 2, a + 10]; }
    if (type === 3) { const h = rnd(8, 11), m = [10, 20, 40, 50][rnd(0, 3)], d = [35, 45, 50, 55][rnd(0, 3)]; const tot = h * 60 + m + d; const f = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; q = P(`A class starts at ${h}:${String(m).padStart(2, '0')} and lasts ${d} minutes. When does it end?`, `تبدأ محاضرة الساعة ${h}:${String(m).padStart(2, '0')} وتستمر ${d} دقيقة. متى تنتهي؟`); a = f(tot); opts = [a, f(tot + 10), f(tot - 10), f(tot + 60)]; }
    if (type === 4) { const b = rnd(4, 9), c = rnd(2, b - 1), e = rnd(4, 9), f2 = rnd(2, e - 1); if (c / b === f2 / e) return makeItem(4); q = P(`Which is bigger: ${c}/${b} or ${f2}/${e}?`, `أيهما أكبر: ${c}/${b} أم ${f2}/${e}؟`); a = c / b > f2 / e ? `${c}/${b}` : `${f2}/${e}`; opts = [`${c}/${b}`, `${f2}/${e}`, P('They’re equal', 'متساويان')]; }
    opts = Array.from(new Set(opts.map(String)));
    return { q, a: String(a), opts: shuffle(opts) };
  }
  async function quizBlock(timed, n, from) {
    let ok = 0, changes = 0, timeouts = 0;
    const types = shuffle([0, 1, 2, 3, 4]).slice(0, n);
    for (let i = 0; i < types.length; i++) {
      prog(from + i / types.length * 0.45);
      const it = makeItem(types[i]);
      H(`<div class="ck-q">${timed ? '<div class="ck-timer"><i></i></div>' : ''}<p class="ck-q__t" dir="auto">${esc(it.q)}</p><div class="ck-opts">${it.opts.map(o => `<button type="button" data-o="${esc(o)}" dir="ltr">${esc(o)}</button>`).join('')}</div><button type="button" class="btn btn--accent" data-next disabled>${T('Next', 'التالي')}</button></div>`);
      const box = $('.ck-q', stage());
      if (timed) requestAnimationFrame(() => { const b = $('.ck-timer i', box); b.style.transitionDuration = '15s'; b.style.width = '0%'; });
      let sel = null;
      const ans = await new Promise((res, rej) => {
        const to = timed ? setTimeout(() => { timeouts++; res(sel); }, 15000) : null;
        box.addEventListener('click', e => {
          if (!run || run.aborted) { clearTimeout(to); return rej(new Aborted()); }
          const o = e.target.closest('[data-o]');
          if (o) { if (sel != null && sel !== o.dataset.o) changes++; sel = o.dataset.o; $$('[data-o]', box).forEach(b => b.classList.toggle('is-on', b === o)); $('[data-next]', box).disabled = false; }
          if (e.target.closest('[data-next]') && sel != null) { clearTimeout(to); res(sel); }
        });
      });
      if (ans === it.a) ok++;
    }
    return { acc: ok / types.length, changes, timeouts };
  }
  async function runQ() {
    const anxiety = await rate('Before we start: how worried do quizzes usually make you feel?', 'قبل أن نبدأ: إلى أي حد تقلقك الاختبارات عادة؟');
    const n = DB.short ? 3 : 5;
    await say('A few quick questions. Take your time with these — there’s no timer yet.', 'بضعة أسئلة سريعة. خذ وقتك — لا يوجد مؤقت بعد.', { wait: true });
    const U = await quizBlock(false, n, 0.05);
    await say('Now a few more of the same kind, but each one has a timer. Do your best.', 'والآن أسئلة أخرى من النوع نفسه، لكن لكل سؤال مؤقت. ابذل ما بوسعك.', { wait: true });
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
    await say('Just four quick questions about how you like to get help. There are no right answers.', 'أربعة أسئلة سريعة فقط عن طريقتك المفضلة في طلب المساعدة. لا توجد إجابات صحيحة.', { wait: false });
    const ans = {};
    for (let i = 0; i < HELPQ.length; i++) {
      prog(i / HELPQ.length);
      const [en, ar, opts] = HELPQ[i];
      H(`<div class="ck-q"><p class="ck-q__t">${esc(P(en, ar))}</p></div>`);
      const r = await choose(opts.map(o => ({ id: o[0], label: P(o[1], o[2]) })), { into: $('.ck-q', stage()), cls: 'ck-choices--list' });
      ans[i] = r.id;
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
    H(`<div class="ck-res"><span class="ck-chip ck-chip--support ck-chip--lg">${P(...BAND.support)}</span><h2>${T('Your support style', 'أسلوبك في طلب الدعم')}</h2>
      <p class="ck-res__lead">${T('This shapes how ERLY and Noor offer help. It never flags anything.', 'يشكّل هذا طريقة تقديم إيرلي ونور للمساعدة. ولا يُشير إلى أي شيء أبداً.')}</p>
      <ul class="ck-tips">${tips.map(t => `<li>${esc(P(...t))}</li>`).join('')}</ul>
      <div class="ck-res__btns"><button class="btn btn--accent" data-done>${T('Back to check-ins', 'العودة إلى الفحوصات')}</button></div></div>`);
    $('[data-done]', stage()).onclick = close;
  }

  /* ================= C · everyday communication ================= */
  const SCEN = [
    ['Asking a question in a big lecture', 'طرح سؤال في محاضرة كبيرة'], ['Emailing a professor you don’t know', 'مراسلة أستاذ لا تعرفه'],
    ['Disagreeing with someone in a group project', 'الاختلاف مع شخص في مشروع جماعي'], ['Giving a short presentation', 'تقديم عرض قصير'],
    ['Joining a study group of strangers', 'الانضمام إلى مجموعة دراسة لا تعرفها'], ['Calling an office on the phone', 'الاتصال بمكتب هاتفياً'],
    ['Posting in the class forum', 'النشر في منتدى المقرر'], ['Asking a classmate for their notes', 'طلب الملاحظات من زميل']
  ];
  async function runC() {
    await say('For each situation, tap how comfortable it feels: one is very uncomfortable, five is completely fine.', 'لكل موقف، اختر مدى ارتياحك: واحد غير مريح أبداً، وخمسة مريح تماماً.', { wait: false });
    const list = DB.short ? SCEN.slice(0, 5) : SCEN;
    const vals = [];
    for (let i = 0; i < list.length; i++) {
      prog(i / list.length);
      H(`<div class="ck-q"><p class="ck-q__t">${esc(P(...list[i]))}</p><div class="ck-scale-lbl"><span>${T('Very uncomfortable', 'غير مريح أبداً')}</span><span>${T('Completely fine', 'مريح تماماً')}</span></div></div>`);
      const r = await choose([1, 2, 3, 4, 5].map(n => ({ id: String(n), label: String(n) })), { into: $('.ck-q', stage()), cls: 'ck-choices--scale' });
      vals.push(+r.id);
    }
    return { metrics: { comfort: vals.reduce((a, b) => a + b, 0) / vals.length, avoid: vals.filter(v => v <= 2).length * (SCEN.length / list.length) }, validity: { complete: true } };
  }

  const RUN = { V: runV, U: runU, M: runM, E: runE, P: runP, O: runO, N: runN, Q: runQ, H: runH, C: runC };
  render();
  I18N.onChange(render);
  ERLY.checkins = { open, statuses, synthesize: () => C.synthesize(statuses(), tracking()) };
})();
